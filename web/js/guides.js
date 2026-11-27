// 보조선(측면 영상): 어드레스 기준 샤프트 플레인(굵은 선) · 어깨 플레인(얇은 선) · 엉덩이 수직 점선
(function (SL) {
  const G = {};

  // 발끝이 화면의 어느 쪽을 향하는지: +1 = 오른쪽(공이 오른쪽), -1 = 왼쪽
  G.facing = (lm) => {
    const dx = (lm[31][0] - lm[29][0]) + (lm[32][0] - lm[30][0]);
    return dx >= 0 ? 1 : -1;
  };

  // 손에서 바닥까지 여러 각도로 선을 그어 보고, 주변보다 가장 뚜렷하게 다른 직선 = 샤프트
  // gray: Uint8Array(w*h), hands/groundY: 픽셀 좌표, f: 방향
  G.detectShaft = (gray, w, h, hands, groundY, f) => {
    const px = (x, y) => { x = Math.round(x); y = Math.round(y); return x < 0 || y < 0 || x >= w || y >= h ? -1 : gray[y * w + x]; };
    const drop = groundY - hands[1];
    if (drop < 8) return null;
    let best = null;
    for (let deg = 26; deg <= 66; deg += 1) {           // 어드레스 샤프트로 나올 수 있는 각도만
      const a = deg * Math.PI / 180, dx = f * Math.sin(a), dy = Math.cos(a);
      const L = drop / dy, nx = -dy, ny = dx;          // 법선
      let sum = 0, n = 0;
      for (let t = 0.18; t <= 0.92; t += 0.02) {
        const x = hands[0] + dx * L * t, y = hands[1] + dy * L * t;
        const c = px(x, y); if (c < 0) continue;
        const s1 = px(x + nx * 4, y + ny * 4), s2 = px(x - nx * 4, y - ny * 4);
        if (s1 < 0 || s2 < 0) continue;
        // 가는 선은 양쪽 모두와 달라야 함 (한쪽만 다르면 배경 경계선)
        sum += Math.min(Math.abs(s1 - c), Math.abs(s2 - c)); n++;
      }
      if (n < 15) continue;
      const score = sum / n;
      if (!best || score > best.score) best = { deg, score };
    }
    return best;
  };

  // 어드레스 프레임에서 보조선 기준점 계산 (정규화 좌표)
  // img: { gray, w, h } (선택), mask: { data, w, h } (선택)
  G.compute = (lm, ar, img, mask) => {
    const f = G.facing(lm);
    const hands = [(lm[15][0] + lm[16][0]) / 2, (lm[15][1] + lm[16][1]) / 2];
    const sh = [(lm[11][0] + lm[12][0]) / 2, (lm[11][1] + lm[12][1]) / 2];
    const hip = [(lm[23][0] + lm[24][0]) / 2, (lm[23][1] + lm[24][1]) / 2];
    const toeY = Math.max(lm[31][1], lm[32][1], lm[29][1], lm[30][1]);
    const groundY = Math.min(0.995, toeY - 0.005);
    const T = Math.hypot((sh[0] - hip[0]) * ar, sh[1] - hip[1]) || 0.2;

    // 샤프트 각도 (영상에서 찾고, 못 찾으면 드라이버 평균 약 44°)
    let deg = 44, detected = false;
    if (img) {
      const r = G.detectShaft(img.gray, img.w, img.h, [hands[0] * img.w, hands[1] * img.h], groundY * img.h, f);
      if (r && r.score >= 9) { deg = r.deg; detected = true; }
    }
    // 정규화 좌표는 가로세로 비율이 달라서 픽셀 기준 각도를 다시 변환
    const a = deg * Math.PI / 180;
    const dyN = groundY - hands[1], dxN = (f * Math.tan(a) * dyN) / ar;
    let ball = [hands[0] + dxN, groundY];
    const lim = f > 0 ? 0.97 : 0.03;              // 공이 화면 밖이면 샤프트 선을 따라 안쪽으로
    if ((f > 0 && ball[0] > lim) || (f < 0 && ball[0] < lim)) { const k = (lim - hands[0]) / dxN; ball = [lim, hands[1] + dyN * k]; }

    // 엉덩이 뒤쪽 끝: 사람 마스크에서 골반 높이 줄을 공 반대쪽으로 훑기
    let buttX = hip[0] - f * (0.3 * T) / ar, fromMask = false;
    if (mask) {
      const row = Math.round(hip[1] * mask.h), cx = Math.round(hip[0] * mask.w);
      let edge = null;
      for (let x = cx; x >= 0 && x < mask.w; x -= f) { if (mask.data[row * mask.w + x] > 0.5) edge = x; else if (edge != null) break; }
      if (edge != null && Math.abs(edge - cx) > 2) { buttX = edge / mask.w; fromMask = true; }
    }
    return { ball, hands, shoulder: sh, butt: [buttX, hip[1]], groundY, f, deg, detected, fromMask, v: 1 };
  };

  // 공에서 점 p 방향으로 그은 직선을 화면 끝까지 연장 (픽셀 좌표)
  G.ray = (ball, p, W, H) => {
    const x0 = ball[0] * W, y0 = ball[1] * H, dx = p[0] * W - x0, dy = p[1] * H - y0;
    if (Math.abs(dx) + Math.abs(dy) < 1e-6) return null;
    let t = Infinity;
    if (dx > 0) t = Math.min(t, (W - x0) / dx); if (dx < 0) t = Math.min(t, -x0 / dx);
    if (dy > 0) t = Math.min(t, (H - y0) / dy); if (dy < 0) t = Math.min(t, -y0 / dy);
    return [x0, y0, x0 + dx * t, y0 + dy * t];
  };

  G.COLOR = '#BF5AF2';
  G.draw = (ctx, g, W, H, dpr, editing) => {
    ctx.save();
    ctx.strokeStyle = G.COLOR; ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 3 * dpr;
    const line = (p, w) => { const r = G.ray(g.ball, p, W, H); if (!r) return; ctx.lineWidth = w * dpr; ctx.beginPath(); ctx.moveTo(r[0], r[1]); ctx.lineTo(r[2], r[3]); ctx.stroke(); };
    line(g.hands, 5);        // 굵은 선: 샤프트 플레인
    line(g.shoulder, 1.8);   // 얇은 선: 어깨 플레인
    ctx.lineWidth = 3 * dpr; ctx.setLineDash([3 * dpr, 6 * dpr]);
    ctx.beginPath(); ctx.moveTo(g.butt[0] * W, g.butt[1] * H - 0.06 * H); ctx.lineTo(g.butt[0] * W, g.groundY * H); ctx.stroke();
    ctx.setLineDash([]);
    if (editing) {           // 드래그 손잡이 (공 위치, 엉덩이 선)
      ctx.shadowBlur = 0; ctx.fillStyle = '#fff'; ctx.strokeStyle = G.COLOR; ctx.lineWidth = 2.5 * dpr;
      [[g.ball[0], g.ball[1]], [g.butt[0], g.butt[1]]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x * W, y * H, 7 * dpr, 0, 7); ctx.fill(); ctx.stroke(); });
    }
    ctx.restore();
  };

  SL.guides = G;
})(typeof window !== 'undefined' ? window.SL : (globalThis.SL = globalThis.SL || {}));
