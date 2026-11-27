// 보조선(측면 영상): 어드레스 기준 샤프트 플레인(굵은 선) · 어깨 플레인(얇은 선) · 엉덩이 수직 점선
(function (SL) {
  const G = {};

  // 발끝이 화면의 어느 쪽을 향하는지: +1 = 오른쪽(공이 오른쪽), -1 = 왼쪽
  G.facing = (lm) => {
    const dx = (lm[31][0] - lm[29][0]) + (lm[32][0] - lm[30][0]);
    return dx >= 0 ? 1 : -1;
  };

  // 손 주변에서 시작하는 직선을 각도·위치를 바꿔 가며 그어 보고, 양옆보다 뚜렷하게 어둡거나 밝은
  // 가는 선(= 샤프트)을 찾는다. 손 좌표가 그립에서 조금 벗어나도 되도록 시작점을 좌우로 흔들어 본다.
  // gray: Uint8Array(w*h), hands/groundY: 픽셀 좌표, f: 공 방향(+1 오른쪽)
  G.detectShaft = (gray, w, h, hands, groundY, f) => {
    const px = (x, y) => { x = Math.round(x); y = Math.round(y); return x < 0 || y < 0 || x >= w || y >= h ? -1 : gray[y * w + x]; };
    const drop = groundY - hands[1];
    if (drop < 8) return null;
    const side = Math.max(3, Math.round(w / 110));            // 샤프트 양옆을 볼 거리
    const span = Math.max(4, Math.round(w / 40));             // 시작점 흔드는 범위
    const contrast = (x, y, nx, ny) => {
      let c = 255, cB = 0;                                     // 선 위 가장 어두운/밝은 값 (1px 어긋남 허용)
      for (const k of [-1, 0, 1]) { const v = px(x + nx * k, y + ny * k); if (v < 0) return null; c = Math.min(c, v); cB = Math.max(cB, v); }
      const s1 = px(x + nx * side, y + ny * side), s2 = px(x - nx * side, y - ny * side);
      if (s1 < 0 || s2 < 0) return null;
      // 양쪽 모두와 달라야 함 (한쪽만 다르면 배경 경계선)
      return Math.max(Math.min(s1 - c, s2 - c), Math.min(cB - s1, cB - s2), 0);
    };
    let best = null;
    for (let deg = 20; deg <= 66; deg += 1) {
      const a = deg * Math.PI / 180, dx = f * Math.sin(a), dy = Math.cos(a), L = drop / dy, nx = -dy, ny = dx;
      for (let off = -span; off <= span; off += 2) {
        const ox = hands[0] + nx * off, oy = hands[1] + ny * off, vals = [];
        for (let t = 0.15; t <= 0.9; t += 0.025) { const v = contrast(ox + dx * L * t, oy + dy * L * t, nx, ny); if (v != null) vals.push(v); }
        if (vals.length < 20) continue;
        vals.sort((p, q) => p - q);
        const score = vals[Math.floor(vals.length * 0.4)];    // 중앙값보다 약간 아래: 일부만 강한 선(배경)은 탈락
        if (!best || score > best.score) best = { deg, off, score, o: [ox, oy], d: [dx, dy], L };
      }
    }
    if (!best) return null;
    // 샤프트가 끝나는 곳(클럽헤드) 찾기: 선을 따라 내려가며 대비가 사라지는 지점
    const { o, d, L } = best, nx = -d[1], ny = d[0], thr = Math.max(6, best.score * 0.4);
    let end = 0.9, miss = 0;
    for (let t = 0.9; t <= 1.25; t += 0.01) {
      const v = contrast(o[0] + d[0] * L * t, o[1] + d[1] * L * t, nx, ny);
      if (v != null && v >= thr) { end = t; miss = 0; } else if (++miss > 4) break;
    }
    best.end = [o[0] + d[0] * L * end, o[1] + d[1] * L * end];
    return best;
  };

  // 어드레스 프레임에서 보조선 기준점 계산 (정규화 좌표)
  // img: { gray, w, h } (선택), mask: { data, w, h } (선택)
  G.compute = (lm, ar, img, mask) => {
    const f = G.facing(lm);
    let hands = [(lm[15][0] + lm[16][0]) / 2, (lm[15][1] + lm[16][1]) / 2];
    const sh = [(lm[11][0] + lm[12][0]) / 2, (lm[11][1] + lm[12][1]) / 2];
    const hip = [(lm[23][0] + lm[24][0]) / 2, (lm[23][1] + lm[24][1]) / 2];
    const toeY = Math.max(lm[31][1], lm[32][1], lm[29][1], lm[30][1]);
    const groundY = Math.min(0.995, toeY - 0.005);
    const T = Math.hypot((sh[0] - hip[0]) * ar, sh[1] - hip[1]) || 0.2;

    // 샤프트: 영상에서 찾으면 그 선의 끝(클럽헤드)을 공 위치로, 못 찾으면 드라이버 평균 각도(약 44°)
    let deg = 44, detected = false, ball = null;
    if (img) {
      const r = G.detectShaft(img.gray, img.w, img.h, [hands[0] * img.w, hands[1] * img.h], groundY * img.h, f);
      if (r && r.score >= 12) {
        deg = r.deg; detected = true; ball = [r.end[0] / img.w, Math.min(r.end[1] / img.h, groundY + 0.02)];
        hands[0] = r.o[0] / img.w; hands[1] = r.o[1] / img.h;   // 굵은 선이 실제 샤프트 위를 지나도록
      }
    }
    if (!ball) {
      const a = deg * Math.PI / 180, dyN = groundY - hands[1], dxN = (f * Math.tan(a) * dyN) / ar;
      ball = [hands[0] + dxN, groundY];
      const lim = f > 0 ? 0.97 : 0.03;              // 공이 화면 밖이면 샤프트 선을 따라 안쪽으로
      if ((f > 0 && ball[0] > lim) || (f < 0 && ball[0] < lim)) { const k = (lim - hands[0]) / dxN; ball = [lim, hands[1] + dyN * k]; }
    }

    // 엉덩이 뒤쪽 끝: 사람 마스크에서 골반 높이 줄을 공 반대쪽으로 훑기
    let buttX = hip[0] - f * (0.3 * T) / ar, fromMask = false;
    if (mask) {
      const row = Math.round(hip[1] * mask.h), cx = Math.round(hip[0] * mask.w);
      let edge = null;
      for (let x = cx; x >= 0 && x < mask.w; x -= f) { if (mask.data[row * mask.w + x] > 0.5) edge = x; else if (edge != null) break; }
      if (edge != null && Math.abs(edge - cx) > 2) { buttX = edge / mask.w; fromMask = true; }
    }
    return { mode: 'side', ball, hands, shoulder: sh, butt: [buttX, hip[1]], groundY, f, deg, detected, fromMask, v: 2 };
  };

  // 정면: 어드레스 때 골반 바깥 양쪽 끝에서 세운 수직선 (백스윙 때 골반이 선 밖으로 나가면 스웨이)
  G.computeFront = (lm, ar, mask) => {
    const hipY = (lm[23][1] + lm[24][1]) / 2, hipX = (lm[23][0] + lm[24][0]) / 2;
    const jw = Math.abs(lm[23][0] - lm[24][0]) || 0.05;
    let xs = [hipX - jw * 0.85, hipX + jw * 0.85], fromMask = false;
    if (mask) {
      const row = Math.round(hipY * mask.h), cx = Math.round(hipX * mask.w), at = (x) => mask.data[row * mask.w + x] > 0.5;
      if (row >= 0 && row < mask.h && at(cx)) {
        let l = cx, r = cx;
        while (l > 0 && at(l - 1)) l--;
        while (r < mask.w - 1 && at(r + 1)) r++;
        const wN = (r - l) / mask.w;
        if (wN > jw * 1.1 && wN < jw * 4) { xs = [l / mask.w, (r + 1) / mask.w]; fromMask = true; }
      }
    }
    const top = Math.max(0.01, lm[0][1] - 0.05), foot = Math.min(0.995, Math.max(lm[29][1], lm[30][1], lm[31][1], lm[32][1]) + 0.01);
    return { mode: 'front', xs, y0: top, y1: foot, fromMask, v: 2 };
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
    ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 2 * dpr;
    if (g.mode === 'front') {
      ctx.lineWidth = 2.4 * dpr;
      g.xs.forEach(x => { ctx.beginPath(); ctx.moveTo(x * W, g.y0 * H); ctx.lineTo(x * W, g.y1 * H); ctx.stroke(); });
      ctx.restore(); return;
    }
    const B = [g.ball[0] * W, g.ball[1] * H];
    const dirTo = (p) => { const dx = p[0] * W - B[0], dy = p[1] * H - B[1], L = Math.hypot(dx, dy) || 1; return [dx / L, dy / L]; };
    const ray = (d, w) => {
      let t = Infinity;
      if (d[0] > 0) t = Math.min(t, (W - B[0]) / d[0]); if (d[0] < 0) t = Math.min(t, -B[0] / d[0]);
      if (d[1] > 0) t = Math.min(t, (H - B[1]) / d[1]); if (d[1] < 0) t = Math.min(t, -B[1] / d[1]);
      ctx.lineWidth = w * dpr; ctx.beginPath(); ctx.moveTo(B[0], B[1]); ctx.lineTo(B[0] + d[0] * t, B[1] + d[1] * t); ctx.stroke();
    };
    const d1 = dirTo(g.hands), d2 = dirTo(g.shoulder);
    const mid = [d1[0] + d2[0], d1[1] + d2[1]], mL = Math.hypot(mid[0], mid[1]) || 1;
    ray(d1, 2.6);                        // 샤프트 라인 (공 → 손)
    ray(d2, 2.6);                        // 어깨 라인 (공 → 어깨)
    ray([mid[0] / mL, mid[1] / mL], 1.1); // 두 선 사이 가는 선
    ctx.lineWidth = 2.2 * dpr; ctx.setLineDash([2.5 * dpr, 5.5 * dpr]);
    ctx.beginPath(); ctx.moveTo(g.butt[0] * W, g.butt[1] * H - 0.06 * H); ctx.lineTo(g.butt[0] * W, g.groundY * H); ctx.stroke();
    ctx.setLineDash([]);
    if (editing) {                        // 공 위치만 끌어서 조정
      ctx.shadowBlur = 0; ctx.fillStyle = '#fff'; ctx.strokeStyle = G.COLOR; ctx.lineWidth = 2 * dpr;
      ctx.beginPath(); ctx.arc(B[0], B[1], 6 * dpr, 0, 7); ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  };

  SL.guides = G;
})(typeof window !== 'undefined' ? window.SL : (globalThis.SL = globalThis.SL || {}));
