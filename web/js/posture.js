// 머리·척추 표시: 어드레스 위치(점선) vs 현재 위치(실선) + 머리 이동 거리
(function (SL) {
  const P = {};
  const KEYS = [0, 7, 8, 11, 12, 23, 24];
  P.COLOR = '#5EF0C8';
  P.TORSO_CM = 48;            // 어깨 중심~골반 중심 평균 길이(성인) — 화면 거리를 cm로 바꿀 때 기준

  // 관절별 좌표를 프레임 축으로 다듬기 (짧은 공백 보간 + 가우시안)
  P.build = (frames, addrIdx) => {
    const S = {};
    KEYS.forEach(k => {
      const raw = frames.map(f => f.lm && f.lm[k] && f.lm[k][2] > 0.2 ? [f.lm[k][0], f.lm[k][1]] : null);
      for (let i = 0; i < raw.length; i++) {
        if (raw[i]) continue;
        let j = i; while (j < raw.length && !raw[j]) j++;
        if (i > 0 && j < raw.length && j - i <= 4) for (let q = i; q < j; q++) { const r = (q - i + 1) / (j - i + 1); raw[q] = [raw[i - 1][0] + (raw[j][0] - raw[i - 1][0]) * r, raw[i - 1][1] + (raw[j][1] - raw[i - 1][1]) * r]; }
        i = j;
      }
      const sg = 1.2, R = 3;
      S[k] = raw.map((p, i) => {
        if (!p) return null;
        let sx = 0, sy = 0, sw = 0;
        for (let d = -R; d <= R; d++) { const q = raw[i + d]; if (!q) continue; const w = Math.exp(-d * d / (2 * sg * sg)); sx += q[0] * w; sy += q[1] * w; sw += w; }
        return [sx / sw, sy / sw];
      });
    });
    if (addrIdx == null || addrIdx < 0) addrIdx = frames.findIndex(f => f.lm);
    return { S, addrIdx, n: frames.length };
  };

  // 프레임 사이(소수 위치)까지 보간한 자세
  P.pose = (st, fi) => {
    const i0 = Math.max(0, Math.min(st.n - 1, Math.floor(fi))), i1 = Math.min(st.n - 1, i0 + 1), f = fi - i0;
    const g = (k) => { const a = st.S[k][i0], b = st.S[k][i1]; return a && b ? [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f] : (a || b); };
    const m = (a, b) => (a && b ? [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] : null);
    const nose = g(0), ears = m(g(7), g(8));
    const head = ears && nose ? [ears[0] * 0.7 + nose[0] * 0.3, ears[1] * 0.7 + nose[1] * 0.3] : (ears || nose);
    const sh = m(g(11), g(12)), hip = m(g(23), g(24));
    return head && sh && hip ? { head, sh, hip } : null;
  };

  P.draw = (ctx, st, fi, W, H, dpr) => {
    const a = P.pose(st, st.addrIdx), c = P.pose(st, fi);
    if (!a || !c) return;
    const px = (p) => [p[0] * W, p[1] * H];
    const T = Math.hypot((a.sh[0] - a.hip[0]) * W, (a.sh[1] - a.hip[1]) * H) || H * 0.25;
    const R = T * 0.22;                                  // 머리 반지름 ≈ 몸통 길이의 22%
    ctx.save();
    ctx.strokeStyle = P.COLOR; ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(0,0,0,.4)'; ctx.shadowBlur = 2 * dpr;
    const circle = (p, dash) => { const q = px(p); ctx.setLineDash(dash ? [3 * dpr, 4 * dpr] : []); ctx.lineWidth = (dash ? 2 : 2.6) * dpr; ctx.beginPath(); ctx.arc(q[0], q[1], R, 0, Math.PI * 2); ctx.stroke(); };
    // 척추: 목 아래(어깨 중심 살짝 위)에서 골반 중심까지
    const spine = (s, dash) => {
      const top = px(s.sh), bot = px(s.hip);
      ctx.setLineDash(dash ? [3 * dpr, 4 * dpr] : []); ctx.lineWidth = (dash ? 2 : 2.6) * dpr;
      ctx.beginPath(); ctx.moveTo(top[0], top[1]); ctx.lineTo(bot[0] + (top[0] - bot[0]) * 0.08, bot[1] + (top[1] - bot[1]) * 0.08); ctx.stroke();
    };
    const moved = Math.hypot((c.head[0] - a.head[0]) * W, (c.head[1] - a.head[1]) * H);
    const atAddr = Math.abs(fi - st.addrIdx) < 0.5;
    if (!atAddr) { circle(a.head, true); spine(a, true); }   // 어드레스 위치 = 점선
    circle(c.head, false); spine(c, false);                    // 현재 위치 = 실선
    if (!atAddr && moved > R * 0.35) {
      const A = px(a.head), C = px(c.head);
      ctx.setLineDash([2 * dpr, 3 * dpr]); ctx.lineWidth = 1.4 * dpr;
      ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(C[0], C[1]); ctx.stroke(); ctx.setLineDash([]);
      ctx.shadowBlur = 0; ctx.fillStyle = P.COLOR; ctx.beginPath(); ctx.arc(C[0], C[1], 2.6 * dpr, 0, 7); ctx.fill();
      const cm = Math.round(moved / T * P.TORSO_CM);
      const txt = `머리 이동 약 ${cm}cm`;
      ctx.font = `700 ${11 * dpr}px Pretendard, system-ui, sans-serif`;
      const tw = ctx.measureText(txt).width, bx = SL.clamp(C[0] + R + 6 * dpr, 4 * dpr, W - tw - 16 * dpr), by = SL.clamp(C[1] - R, 4 * dpr, H - 24 * dpr);
      ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(bx, by, tw + 12 * dpr, 20 * dpr, 6 * dpr) : ctx.rect(bx, by, tw + 12 * dpr, 20 * dpr); ctx.fill();
      ctx.fillStyle = P.COLOR; ctx.fillText(txt, bx + 6 * dpr, by + 14 * dpr);
    }
    ctx.restore();
  };

  P.moveCm = (st, fi) => {
    const a = P.pose(st, st.addrIdx), c = P.pose(st, fi); if (!a || !c) return null;
    const T = Math.hypot(a.sh[0] - a.hip[0], a.sh[1] - a.hip[1]);
    return Math.hypot(c.head[0] - a.head[0], c.head[1] - a.head[1]) / T * P.TORSO_CM;
  };

  SL.posture = P;
})(typeof window !== 'undefined' ? window.SL : (globalThis.SL = globalThis.SL || {}));
