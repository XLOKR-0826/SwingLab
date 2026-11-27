// 홈 사진 자동 보정: 저화질 업스케일 → 사람만 남기고 배경 제거 → 다크 배경 오른쪽 배치
(function (SL) {
  const OUT_W = 900, OUT_H = 1200, MIN_LONG = 1400, MAX_LONG = 2000;

  const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

  const loadImage = (file) => new Promise((res, rej) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); res(img); };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('사진을 열 수 없어요 (HEIC는 JPG로 바꿔서 올려 주세요)')); };
    img.src = url;
  });

  // 3x3 박스 블러로 만든 언샤프 마스크 (업스케일 후 선명도 보정)
  function sharpen(c, amount) {
    const ctx = c.getContext('2d'), { width: w, height: h } = c;
    const im = ctx.getImageData(0, 0, w, h), d = im.data, src = new Uint8ClampedArray(d);
    const tmp = new Float32Array(w * h * 3);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {          // 가로 블러
      const i = (y * w + x), l = Math.max(0, x - 1), r = Math.min(w - 1, x + 1);
      for (let k = 0; k < 3; k++) tmp[i * 3 + k] = (src[(y * w + l) * 4 + k] + src[i * 4 + k] + src[(y * w + r) * 4 + k]) / 3;
    }
    for (let y = 0; y < h; y++) {                                       // 세로 블러 + 합성
      const u = Math.max(0, y - 1), dn = Math.min(h - 1, y + 1);
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        for (let k = 0; k < 3; k++) {
          const blur = (tmp[(u * w + x) * 3 + k] + tmp[i * 3 + k] + tmp[(dn * w + x) * 3 + k]) / 3;
          d[i * 4 + k] = src[i * 4 + k] + amount * (src[i * 4 + k] - blur);
        }
      }
    }
    ctx.putImageData(im, 0, 0);
  }

  // 1) 크기 정리: 작으면 2배씩 단계적으로 키우고 선명하게, 너무 크면 줄이기
  function normalize(img) {
    const w0 = img.naturalWidth, h0 = img.naturalHeight, long = Math.max(w0, h0);
    let scale = 1, upscaled = false;
    if (long < MIN_LONG) { scale = MIN_LONG / long; upscaled = true; }
    else if (long > MAX_LONG) scale = MAX_LONG / long;
    const W = Math.round(w0 * scale), H = Math.round(h0 * scale);
    let cur = canvas(w0, h0); cur.getContext('2d').drawImage(img, 0, 0);
    if (upscaled) {
      while (cur.width * 2 < W) {
        const nx = canvas(cur.width * 2, cur.height * 2), x = nx.getContext('2d');
        x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high'; x.drawImage(cur, 0, 0, nx.width, nx.height); cur = nx;
      }
    }
    const out = canvas(W, H), ctx = out.getContext('2d');
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(cur, 0, 0, W, H);
    if (upscaled) sharpen(out, SL.clamp(0.35 * scale, 0.4, 1.1));
    return { c: out, upscaled, from: [w0, h0], to: [W, H], factor: +scale.toFixed(1) };
  }

  // 2) 사람 마스크 (MediaPipe Pose의 segmentation mask)
  async function personMask(c) {
    const lm = await SL.pose.segmenter();
    const r = lm.detect(c);
    try {
      const m = r && r.segmentationMasks && r.segmentationMasks[0];
      if (!m) return null;
      return { data: Float32Array.from(m.getAsFloat32Array()), w: m.width, h: m.height, landmarks: r.landmarks && r.landmarks[0] };
    } finally { if (r && r.close) r.close(); }
  }
  SL.photoFx = { personMask, normalize, sharpen };   // 테스트에서 바꿔 끼울 수 있게 노출

  // 3) 마스크 → 알파 캔버스 (부드러운 경계) + 사람 영역 박스
  function maskCanvas(mk) {
    const mc = canvas(mk.w, mk.h), ctx = mc.getContext('2d'), im = ctx.createImageData(mk.w, mk.h);
    let x0 = mk.w, y0 = mk.h, x1 = -1, y1 = -1, area = 0;
    for (let i = 0; i < mk.data.length; i++) {
      const p = mk.data[i], t = SL.clamp((p - 0.3) / 0.4, 0, 1), a = t * t * (3 - 2 * t);
      im.data[i * 4 + 3] = Math.round(a * 255);
      if (p > 0.5) { area++; const x = i % mk.w, y = (i / mk.w) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    ctx.putImageData(im, 0, 0);
    return { mc, box: x1 < 0 ? null : { x0: x0 / mk.w, y0: y0 / mk.h, x1: (x1 + 1) / mk.w, y1: (y1 + 1) / mk.h }, area: area / mk.data.length };
  }

  // 4) 시안 스타일 합성: 어두운 배경 + 사람을 오른쪽 위에 크게
  function compose(src, mc, box) {
    const W = src.width, H = src.height;
    const cut = canvas(W, H), cx = cut.getContext('2d');
    cx.drawImage(src, 0, 0);
    cx.globalCompositeOperation = 'destination-in';
    cx.imageSmoothingEnabled = true; cx.imageSmoothingQuality = 'high';
    cx.drawImage(mc, 0, 0, W, H);

    const out = canvas(OUT_W, OUT_H), o = out.getContext('2d');
    const bg = o.createRadialGradient(OUT_W * 0.7, OUT_H * 0.3, 40, OUT_W * 0.7, OUT_H * 0.35, OUT_H * 0.8);
    bg.addColorStop(0, '#2A2F37'); bg.addColorStop(0.55, '#14171C'); bg.addColorStop(1, '#0B0D10');
    o.fillStyle = bg; o.fillRect(0, 0, OUT_W, OUT_H);

    const bx = box.x0 * W, by = box.y0 * H, bw = (box.x1 - box.x0) * W, bh = (box.y1 - box.y0) * H;
    const tall = bh / bw > 1.7;                       // 전신 사진이면 상반신 위주로 크게
    const frameH = tall ? bh * 0.8 : bh;
    const s = (OUT_H * (tall ? 0.98 : 0.9)) / frameH;
    const dx = OUT_W * 0.72 - (bx + bw / 2) * s;      // 사람 중심을 오른쪽 72% 지점에
    const dy = OUT_H * 0.07 - by * s;                 // 머리 위 여백 7%
    // 사람 뒤 은은한 빛
    const glow = o.createRadialGradient(OUT_W * 0.72, OUT_H * 0.35, 10, OUT_W * 0.72, OUT_H * 0.35, OUT_W * 0.55);
    glow.addColorStop(0, 'rgba(255,255,255,0.07)'); glow.addColorStop(1, 'rgba(255,255,255,0)');
    o.fillStyle = glow; o.fillRect(0, 0, OUT_W, OUT_H);
    o.imageSmoothingEnabled = true; o.imageSmoothingQuality = 'high';
    o.filter = 'contrast(1.06) saturate(1.04)';       // 지원 안 하는 브라우저는 무시됨
    o.drawImage(cut, dx, dy, W * s, H * s);
    o.filter = 'none';
    return out;
  }

  const toJpeg = (c, w = OUT_W) => {
    if (c.width <= w) return c.toDataURL('image/jpeg', 0.88);
    const t = canvas(w, Math.round(c.height * w / c.width)), x = t.getContext('2d');
    x.imageSmoothingQuality = 'high'; x.drawImage(c, 0, 0, t.width, t.height);
    return t.toDataURL('image/jpeg', 0.88);
  };

  // 전체 처리. onStep(문구, 진행률)
  SL.photoFx.process = async (file, onStep = () => {}) => {
    onStep('사진 불러오는 중…', 0.05);
    const img = await loadImage(file);
    onStep('화질 확인 중…', 0.15);
    await SL.sleep(30);
    const n = normalize(img);
    const res = { info: [], original: toJpeg(n.c), auto: null, upscaled: n.upscaled };
    if (n.upscaled) res.info.push(`저화질 사진이라 ${n.from[0]}×${n.from[1]} → ${n.to[0]}×${n.to[1]}로 키우고 선명하게 보정했어요`);
    else res.info.push(`해상도 ${n.from[0]}×${n.from[1]} — 화질 보정은 필요 없어요`);
    try {
      onStep('AI가 사람을 찾는 중… (처음엔 모델을 내려받아 조금 걸려요)', 0.35);
      const mk = await SL.photoFx.personMask(n.c);
      onStep('배경 지우는 중…', 0.75);
      const m = mk && maskCanvas(mk);
      if (!m || !m.box || m.area < 0.02) { res.info.push('사진에서 사람을 찾지 못해 배경을 그대로 뒀어요'); return res; }
      onStep('어울리게 배치하는 중…', 0.9);
      res.auto = compose(n.c, m.mc, m.box).toDataURL('image/jpeg', 0.88);
      res.info.push('배경을 지우고 어두운 배경 오른쪽에 크게 배치했어요 (클럽은 사람이 아니라 일부 지워질 수 있어요)');
    } catch (e) {
      console.warn(e);
      res.info.push('AI 모델을 불러오지 못해 배경 제거는 건너뛰었어요 (인터넷 연결 확인)');
    }
    return res;
  };
})(window.SL);
