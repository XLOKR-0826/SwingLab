// 스윙 분석: 프레임 추출 → 관절/클럽헤드 추정 → 구간 검출 → 템포 → 진단
(function (SL) {
  const A = {};
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, Math.min(a[2] ?? 1, b[2] ?? 1)];
  const deg = (r) => r * 180 / Math.PI;
  const angleAt = (a, b, c) => { // b에서의 각도
    const v1 = [a[0] - b[0], a[1] - b[1]], v2 = [c[0] - b[0], c[1] - b[1]];
    const d = Math.hypot(...v1) * Math.hypot(...v2); if (!d) return null;
    return deg(Math.acos(SL.clamp((v1[0] * v2[0] + v1[1] * v2[1]) / d, -1, 1)));
  };
  const median = (arr) => { const s = arr.filter(v => v != null && isFinite(v)).sort((a, b) => a - b); return s.length ? s[s.length >> 1] : null; };
  A.util = { dist, mid, angleAt, median };

  // 정규화 좌표를 (x*가로세로비, y)로 바꿔 거리 계산을 등방성으로
  const P = (lm, k, ar) => lm && lm[k] ? [lm[k][0] * ar, lm[k][1], lm[k][2]] : null;
  const handsOf = (lm, ar) => lm ? mid(P(lm, 15, ar), P(lm, 16, ar)) : null;
  const torsoOf = (lm, ar) => lm ? dist(mid(P(lm, 11, ar), P(lm, 12, ar)), mid(P(lm, 23, ar), P(lm, 24, ar))) : null;
  A.handsOf = handsOf; A.torsoOf = torsoOf; A.P = P;

  // ---------------- 1. 프레임 추출 ----------------
  A.extract = async (video, { fps = 30, maxSec = 15, onProgress = () => {} } = {}) => {
    const lm = await SL.pose.get('full');
    const vw = video.videoWidth, vh = video.videoHeight, ar = vw / vh;
    const dur = Math.min(video.duration, maxSec);
    const n = Math.max(2, Math.floor(dur * fps));
    const W = 160, H = Math.round(160 / ar);
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    let prev = null; const frames = [];
    for (let i = 0; i < n; i++) {
      const t = i / fps;
      await SL.seek(video, Math.min(t + 0.001, video.duration - 0.01));
      ctx.drawImage(video, 0, 0, W, H);
      const d = ctx.getImageData(0, 0, W, H).data;
      const g = new Uint8Array(W * H);
      for (let p = 0, q = 0; p < g.length; p++, q += 4) g[p] = (d[q] * 77 + d[q + 1] * 150 + d[q + 2] * 29) >> 8;
      let pose = null;
      try { pose = SL.pose.detect(lm, video); } catch (e) { console.warn(e); }
      let club = null;
      if (prev && pose) {
        const mask = new Uint8Array(W * H);
        for (let p = 0; p < g.length; p++) mask[p] = Math.abs(g[p] - prev[p]) > 28 ? 1 : 0;
        club = A.estimateClub(pose, mask, W, H, ar);
      }
      prev = g;
      frames.push({ t: +t.toFixed(3), lm: pose, club });
      onProgress((i + 1) / n);
    }
    A.cleanClub(frames, ar);
    return { frames, fps, ar, width: vw, height: vh };
  };

  // 움직임(프레임 차분) 중 손에서 '클럽 길이' 범위 안의 가장 먼 점 = 클럽헤드 추정 (베타)
  A.estimateClub = (pose, mask, W, H, ar) => {
    const hands = handsOf(pose, ar), T = torsoOf(pose, ar);
    if (!hands || !T || T < 0.02) return null;
    const rMin = 0.9 * T, rMax = 2.8 * T;
    let best = null, bestD = 0;
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const p = y * W + x; if (!mask[p]) continue;
        const px = ((x + 0.5) / W) * ar, py = (y + 0.5) / H;
        const d = Math.hypot(px - hands[0], py - hands[1]);
        if (d < rMin || d > rMax || d <= bestD) continue;
        const sup = mask[p - 1] + mask[p + 1] + mask[p - W] + mask[p + W] + mask[p - W - 1] + mask[p - W + 1] + mask[p + W - 1] + mask[p + W + 1];
        if (sup < 3) continue;
        bestD = d; best = [(x + 0.5) / W, (y + 0.5) / H];
      }
    }
    return best ? [+best[0].toFixed(4), +best[1].toFixed(4)] : null;
  };

  // 튀는 점 제거 + 짧은 공백 보간
  A.cleanClub = (frames, ar) => {
    const T = median(frames.map(f => torsoOf(f.lm, ar))) || 0.2;
    const pts = frames.map(f => f.club ? [f.club[0] * ar, f.club[1]] : null);
    const out = pts.map((p, i) => {
      if (!p) return null;
      const win = []; for (let k = -3; k <= 3; k++) if (pts[i + k]) win.push(pts[i + k]);
      if (win.length < 3) return null;
      const m = [median(win.map(q => q[0])), median(win.map(q => q[1]))];
      return dist(p, m) > 0.7 * T ? null : p;
    });
    for (let i = 0; i < out.length; i++) { // 3프레임 이하 공백 선형 보간
      if (out[i]) continue;
      let a = i - 1, b = i; while (b < out.length && !out[b]) b++;
      if (a >= 0 && out[a] && b < out.length && b - a - 1 <= 3) {
        for (let k = a + 1; k < b; k++) { const r = (k - a) / (b - a); out[k] = [out[a][0] + (out[b][0] - out[a][0]) * r, out[a][1] + (out[b][1] - out[a][1]) * r]; }
      }
      i = b - 1;
    }
    frames.forEach((f, i) => { f.club = out[i] ? [+(out[i][0] / ar).toFixed(4), +out[i][1].toFixed(4)] : null; });
  };

  // ---------------- 2. 구간(포지션) 검출 ----------------
  A.series = (frames, ar) => {
    let H = frames.map(f => handsOf(f.lm, ar));
    const valid = H.filter(Boolean).length;
    if (valid < Math.max(8, frames.length * 0.4)) return null;
    // 결측 보간
    for (let i = 0; i < H.length; i++) if (!H[i]) {
      let a = i - 1; while (a >= 0 && !H[a]) a--;
      let b = i + 1; while (b < H.length && !H[b]) b++;
      if (a < 0) H[i] = H[b]; else if (b >= H.length) H[i] = H[a];
      else { const r = (i - a) / (b - a); H[i] = [H[a][0] + (H[b][0] - H[a][0]) * r, H[a][1] + (H[b][1] - H[a][1]) * r, 0]; }
    }
    const S = H.map((_, i) => { // 3프레임 이동평균
      const w = [H[i - 1], H[i], H[i + 1]].filter(Boolean);
      return [w.reduce((s, p) => s + p[0], 0) / w.length, w.reduce((s, p) => s + p[1], 0) / w.length];
    });
    const T = median(frames.map(f => torsoOf(f.lm, ar))) || 0.2;
    const sp = S.map((p, i) => i ? dist(p, S[i - 1]) / T : 0);
    return { H: S, sp, T };
  };

  A.detectPhases = (frames, fps, ar) => {
    const s = A.series(frames, ar); if (!s) return null;
    const { H, sp } = s, n = H.length, y = H.map(p => p[1]);
    const thr = 0.02 * (30 / fps);
    const spS = sp.map((_, i) => (sp[Math.max(0, i - 1)] + sp[i] + sp[Math.min(n - 1, i + 1)]) / 3);
    let peak = 0; for (let i = 1; i < n; i++) if (spS[i] > spS[peak]) peak = i;
    const w = Math.max(2, Math.round(0.1 * fps));
    let impact = Math.max(1, peak - w);
    for (let i = Math.max(1, peak - w); i <= Math.min(n - 1, peak + w); i++) if (y[i] > y[impact]) impact = i;
    let top = 0; for (let i = 1; i < impact; i++) if (y[i] < y[top]) top = i;
    if (top >= impact - 1) return null;
    let start = top;
    const still = (i) => i >= 2 && spS[i] < thr && spS[i - 1] < thr && spS[i - 2] < thr;
    while (start > 0 && !still(start)) start--;
    const address = start;
    const travel = y[address] - y[top];
    if (travel < 0.4 * s.T) return null; // 백스윙으로 보기 어려움
    const first = (a, b, cond, def) => { for (let i = a; i <= b; i++) if (cond(i)) return i; return def; };
    const takeaway = first(address + 1, top, i => y[i] <= y[address] - 0.2 * travel, Math.round((address + top) / 2));
    const backswing = first(takeaway, top, i => y[i] <= y[address] - 0.65 * travel, Math.round((takeaway + top) / 2));
    const downswing = first(top + 1, impact, i => y[i] >= y[top] + 0.5 * (y[impact] - y[top]), Math.round((top + impact) / 2));
    const follow = first(impact + 1, n - 1, i => y[i] <= y[impact] - 0.6 * (y[impact] - y[top]), Math.min(n - 1, impact + Math.round(0.25 * fps)));
    let finish = first(follow + 2, n - 1, i => i + 2 < n && spS[i] < thr * 1.5 && spS[i + 1] < thr * 1.5 && spS[i + 2] < thr * 1.5, n - 1);
    const idx = { address, takeaway, backswing, top, downswing, impact, follow, finish };
    const t = {}; for (const k in idx) t[k] = +(idx[k] / fps).toFixed(3);
    return { idx, t, finishStable: finish < n - 1 };
  };

  A.tempo = (ph, fps, slow = 1) => {
    if (!ph) return null;
    const back = (ph.idx.top - ph.idx.address) / fps / slow;
    const down = (ph.idx.impact - ph.idx.top) / fps / slow;
    return { back: +back.toFixed(2), down: +down.toFixed(2), ratio: down > 0 ? +(back / down).toFixed(1) : null };
  };

  // ---------------- 3. 진단 (규칙 기반) ----------------
  const MISS_MSG = {
    slice: '우측으로 밀리는 슬라이스가 발생할 수 있어요',
    hook: '왼쪽으로 감기는 훅이 발생할 수 있어요',
    push: '공이 오른쪽으로 곧게 밀리는 푸시가 나올 수 있어요',
    pull: '왼쪽으로 당겨지는 풀 샷이 나올 수 있어요',
    fat: '뒷땅(두꺼운 샷)이 나올 수 있어요',
    thin: '탑볼(얇은 샷)이 나올 수 있어요',
    shank: '생크가 나올 수 있어요',
  };
  A.MISS = { slice: '슬라이스', hook: '훅', push: '푸시', pull: '풀', fat: '뒷땅', thin: '탑볼', shank: '생크' };
  A.missMessage = (k, hand = 'right') => {
    let m = MISS_MSG[k] || '';
    if (hand === 'left') m = m.replace('우측', '#L#').replace('오른쪽', '#R#').replace('왼쪽', '오른쪽').replace('#L#', '좌측').replace('#R#', '왼쪽');
    return m;
  };

  A.diagnose = (rec) => {
    const { frames, phases: ph, ar = 9 / 16, view = 'side', hand = 'right', tempo } = rec;
    const issues = [], notes = {};
    SL.PHASES.forEach(p => notes[p.key] = { status: 'good', text: '' });
    if (!ph) return { issues, notes, headline: '스윙 구간을 찾지 못했어요', sub: '전신이 다 보이도록 촬영하고, 어드레스부터 피니시까지 담아 주세요.', miss: null, measured: {} };
    const lead = hand === 'right' ? { sh: 11, el: 13, wr: 15, hip: 23, an: 27 } : { sh: 12, el: 14, wr: 16, hip: 24, an: 28 };
    const at = (key, k) => { // 해당 구간 ±1프레임 평균 좌표
      const i = ph.idx[key], pts = [];
      for (let d = -1; d <= 1; d++) { const f = frames[i + d]; if (f && f.lm && f.lm[k]) pts.push(P(f.lm, k, ar)); }
      if (!pts.length) return null;
      return [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length, Math.min(...pts.map(p => p[2]))];
    };
    const hipMid = (key) => { const a = at(key, 23), b = at(key, 24); return a && b ? mid(a, b) : null; };
    const shMid = (key) => { const a = at(key, 11), b = at(key, 12); return a && b ? mid(a, b) : null; };
    const hands = (key) => { const a = at(key, 15), b = at(key, 16); return a && b ? mid(a, b) : null; };
    const T = torsoOf(frames[ph.idx.address].lm, ar) || median(frames.map(f => torsoOf(f.lm, ar))) || 0.2;
    const shW = (key) => { const a = at(key, 11), b = at(key, 12); return a && b ? dist(a, b) : null; };
    const measured = {};
    const add = (o) => {
      issues.push(o);
      const n = notes[o.phase]; const st = o.severity >= 2 ? 'bad' : 'warn';
      if (n.status === 'good' || (n.status === 'warn' && st === 'bad')) n.status = st;
      n.text = n.text ? n.text + ' · ' + o.short : o.short;
    };

    // 1) 머리(축) 움직임
    const n0 = at('address', 0), n1 = at('impact', 0);
    if (n0 && n1) {
      const d = dist(n0, n1) / T; measured.headMove = +d.toFixed(2);
      if (d > 0.3) add({ id: 'head_move', phase: 'impact', severity: d > 0.45 ? 2 : 1, short: '머리 이동 큼',
        title: '임팩트까지 머리(축)가 많이 움직여요', detail: `어드레스 대비 머리 이동량이 몸통 길이의 ${Math.round(d * 100)}%예요. 축이 흔들리면 컨택이 불안정해져요.`, miss: ['fat', 'thin'] });
    }
    // 2) 템포
    if (tempo && tempo.ratio) {
      measured.tempo = tempo.ratio;
      if (tempo.ratio < 2.2) add({ id: 'tempo_fast', phase: 'backswing', severity: 1, short: '백스윙 빠름',
        title: '백스윙 템포가 빨라요', detail: `백스윙:다운스윙 = ${tempo.ratio}:1 이에요. 투어 평균은 약 3:1이에요. 서두르면 전환이 급해져요.`, miss: ['slice', 'pull'] });
      else if (tempo.ratio > 4.2) add({ id: 'tempo_slow', phase: 'top', severity: 1, short: '전환 늘어짐',
        title: '백스윙이 느리거나 탑에서 멈춰요', detail: `템포 ${tempo.ratio}:1 — 탑에서 리듬이 끊기면 다운스윙에서 손으로 치기 쉬워요.`, miss: ['push', 'slice'] });
    }
    // 3) 탑에서 리드 팔
    const sh = at('top', lead.sh), el = at('top', lead.el), wr = at('top', lead.wr);
    if (sh && el && wr && Math.min(sh[2], el[2], wr[2]) > 0.4) {
      const a = angleAt(sh, el, wr); measured.leadArmTop = Math.round(a);
      if (a < 160) add({ id: 'lead_arm_bent', phase: 'top', severity: a < 145 ? 2 : 1, short: `왼팔 ${Math.round(a)}°`,
        title: '탑에서 리드 팔(왼팔)이 많이 굽어요', detail: `탑에서 왼팔 각도가 ${Math.round(a)}°예요. 스윙 아크가 작아지고 타점이 흔들릴 수 있어요.`, miss: ['slice', 'thin'] });
      else notes.top.text = `왼팔 ${Math.round(a)}° 유지`;
    }
    // 4) 임팩트 손 높이
    const h0 = hands('address'), h1 = hands('impact');
    if (h0 && h1) {
      const up = (h0[1] - h1[1]) / T; measured.handsUp = +up.toFixed(2);
      if (up > 0.2) add({ id: 'hands_high', phase: 'impact', severity: up > 0.32 ? 2 : 1, short: '손 들림',
        title: '임팩트 때 손이 어드레스보다 높아요', detail: '몸이 일어나면서 손이 들리면 페이스가 열리고 얇게 맞기 쉬워요.', miss: ['thin', 'slice'] });
    }

    if (view === 'side') {
      const f0 = frames[ph.idx.address].lm;
      let facing = 1;
      if (f0) { const dx = ((f0[31][0] - f0[29][0]) + (f0[32][0] - f0[30][0])); facing = dx >= 0 ? 1 : -1; }
      // 5) 얼리 익스텐션
      const p0 = hipMid('address'), p1 = hipMid('impact');
      if (p0 && p1) {
        const dx = (p1[0] - p0[0]) * facing / T; measured.hipToBall = +dx.toFixed(2);
        if (dx > 0.1) add({ id: 'early_ext', phase: 'impact', severity: dx > 0.18 ? 2 : 1, short: '배치기',
          title: '골반이 공 쪽으로 밀려요 (얼리 익스텐션)', detail: '다운스윙에서 골반이 앞으로 나오면 공간이 없어져 블록·훅·생크가 나올 수 있어요.', miss: ['push', 'shank', 'hook'] });
      }
      // 6) 척추각 유지
      const sp = (key) => { const s = shMid(key), h = hipMid(key); return s && h ? deg(Math.atan2(Math.abs(s[0] - h[0]), h[1] - s[1])) : null; };
      const a0 = sp('address'), a1 = sp('impact');
      if (a0 != null && a1 != null) {
        const ch = a0 - a1; measured.spineChange = Math.round(ch);
        if (ch > 8) add({ id: 'posture_loss', phase: 'downswing', severity: ch > 14 ? 2 : 1, short: `척추각 -${Math.round(ch)}°`,
          title: '다운스윙에서 상체가 일어나요', detail: `척추 기울기가 어드레스 ${Math.round(a0)}° → 임팩트 ${Math.round(a1)}°로 줄었어요.`, miss: ['thin', 'push'] });
        else notes.address.text = `척추 기울기 ${Math.round(a0)}°`;
      }
      // 7) 다운스윙 경로 (오버더탑 / 과한 인-아웃)
      const hd = hands('downswing');
      if (hd) {
        let best = null, bd = 9;
        for (let i = ph.idx.address; i <= ph.idx.top; i++) {
          const f = frames[i]; if (!f.lm) continue; const h = handsOf(f.lm, ar);
          const d = Math.abs(h[1] - hd[1]); if (d < bd) { bd = d; best = h; }
        }
        if (best) {
          const dx = (hd[0] - best[0]) * facing / T; measured.pathShift = +dx.toFixed(2);
          if (dx > 0.15) add({ id: 'over_top', phase: 'downswing', severity: dx > 0.28 ? 2 : 1, short: '아웃-인 궤도',
            title: '다운스윙이 바깥에서 들어와요 (오버 더 탑)', detail: '손이 백스윙 때보다 공 쪽(바깥)으로 내려와 아웃-인 궤도가 만들어져요.', miss: ['slice', 'pull'] });
          else if (dx < -0.3) add({ id: 'inside_out', phase: 'downswing', severity: 1, short: '과한 인-아웃',
            title: '다운스윙이 너무 안쪽에서 들어와요', detail: '인-아웃이 과하면 푸시나 훅이 나올 수 있어요.', miss: ['hook', 'push'] });
        }
      }
    } else {
      // 정면(Face-on)
      const sw0 = shW('address');
      // 8) 스웨이
      const p0 = hipMid('address'), pt = hipMid('top');
      if (p0 && pt && sw0) {
        const d = Math.abs(pt[0] - p0[0]) / sw0; measured.sway = +d.toFixed(2);
        if (d > 0.25) add({ id: 'sway', phase: 'backswing', severity: d > 0.4 ? 2 : 1, short: '스웨이',
          title: '백스윙 때 골반이 옆으로 밀려요 (스웨이)', detail: '회전 대신 옆으로 이동하면 다운스윙에서 되돌아오기 어려워 뒷땅·슬라이스가 생겨요.', miss: ['fat', 'slice'] });
      }
      // 9) 어깨 회전
      const swT = shW('top');
      if (sw0 && swT) {
        const r = swT / sw0; measured.shoulderTurn = +r.toFixed(2);
        if (r > 0.8) add({ id: 'short_turn', phase: 'top', severity: r > 0.9 ? 2 : 1, short: '회전 부족',
          title: '탑에서 어깨 회전이 부족해요', detail: '정면에서 어깨 폭이 거의 줄지 않았어요. 팔로만 들어 올리면 아웃-인 궤도가 되기 쉬워요.', miss: ['slice', 'pull'] });
      }
      // 10) 피니시 체중이동
      const pf = hipMid('finish'), la = at('finish', lead.an);
      if (pf && la && sw0) {
        const d = Math.abs(pf[0] - la[0]) / sw0; measured.finishWeight = +d.toFixed(2);
        if (d > 0.45) add({ id: 'hang_back', phase: 'finish', severity: 1, short: '체중 뒤에 남음',
          title: '피니시에서 체중이 뒤에 남아요', detail: '피니시에서 골반이 왼발 위로 오지 않았어요. 체중 이동이 부족하면 뒷땅·탑볼·훅이 생겨요.', miss: ['fat', 'thin', 'hook'] });
      }
    }
    // 11) 캐스팅 (클럽헤드 추정값이 있을 때만, 베타)
    const fd = frames[ph.idx.downswing];
    if (fd && fd.club && fd.lm) {
      const e = P(fd.lm, lead.el, ar), w = P(fd.lm, lead.wr, ar), c = [fd.club[0] * ar, fd.club[1]];
      const a = angleAt(e, w, c);
      if (a != null) {
        measured.lagAngle = Math.round(a);
        if (a > 155) add({ id: 'casting', phase: 'downswing', severity: 1, short: '손목 일찍 풀림',
          title: '다운스윙 초반에 손목 각이 빨리 풀려요 (캐스팅)', detail: `다운스윙 중간 손목-샤프트 각이 ${Math.round(a)}°예요(추정). 래깅이 빨리 풀리면 힘이 새고 뒷땅·슬라이스가 생겨요.`, miss: ['fat', 'slice'] });
      }
    }
    // 12) 피니시 유지
    if (!ph.finishStable) { notes.finish.status = notes.finish.status === 'good' ? 'na' : notes.finish.status; notes.finish.text = notes.finish.text || '피니시 자세가 끝까지 촬영되지 않았어요'; }

    const DEF = { address: '셋업 자세 확인됨', takeaway: '테이크백 확인됨', backswing: '백스윙 확인됨', top: '탑 포지션 확인됨', downswing: '전환 확인됨', impact: '임팩트 확인됨', follow: '팔로우스루 확인됨', finish: '피니시 확인됨' };
    for (const k in notes) if (!notes[k].text) notes[k].text = DEF[k];

    issues.sort((a, b) => b.severity - a.severity);
    const score = {};
    issues.forEach(i => (i.miss || []).forEach((m, j) => score[m] = (score[m] || 0) + i.severity * (j === 0 ? 1.5 : 1)));
    const miss = Object.keys(score).sort((a, b) => score[b] - score[a])[0] || null;
    const headline = miss ? A.missMessage(miss, hand) : '큰 문제 없이 안정적인 스윙이에요';
    const sub = issues.length ? `${issues.length}가지 체크 포인트를 찾았어요` : '지금 리듬을 유지하는 드릴을 추천해 드릴게요';
    const good = 100 - issues.reduce((s, i) => s + (i.severity === 2 ? 12 : 6), 0);
    return { issues, notes, headline, sub, miss, measured, score: SL.clamp(good, 40, 100) };
  };

  // ---------------- 4. 한 번에 분석 ----------------
  A.analyzeRecord = async (rec, video, onProgress) => {
    const fps = SL.settings.analysisFps || 30;
    const r = await A.extract(video, { fps, onProgress });
    Object.assign(rec, { frames: r.frames, fps: r.fps, ar: r.ar, width: r.width, height: r.height });
    rec.phases = A.detectPhases(rec.frames, rec.fps, rec.ar);
    rec.tempo = A.tempo(rec.phases, rec.fps, rec.slow || 1);
    rec.diagnosis = A.diagnose(rec);
    delete rec.guides;   // 다시 분석하면 보조선도 새로 계산
    rec.analyzed = true;
    return rec;
  };

  // ---------------- 5. 연습모드 일관성 ----------------
  A.consistency = (swings) => {
    const xs = swings.filter(s => s.tempo && s.tempo.ratio);
    if (xs.length < 2) return null;
    const stat = (arr) => { const m = arr.reduce((a, b) => a + b, 0) / arr.length; const sd = Math.sqrt(arr.reduce((a, b) => a + (b - m) ** 2, 0) / arr.length); return { mean: m, sd, cv: m ? sd / Math.abs(m) : 0 }; };
    const ratio = stat(xs.map(s => s.tempo.ratio)), back = stat(xs.map(s => s.tempo.back)), down = stat(xs.map(s => s.tempo.down));
    const tops = xs.map(s => s.topHeight).filter(v => v != null);
    const top = tops.length >= 2 ? stat(tops) : null;
    let score = 100 - ratio.cv * 250 - back.cv * 120 - down.cv * 120 - (top ? top.sd * 60 : 0);
    score = Math.round(SL.clamp(score, 0, 100));
    return { n: xs.length, ratio, back, down, top, score };
  };

  SL.analyzer = A;
})(typeof window !== 'undefined' ? window.SL : (globalThis.SL = globalThis.SL || {}));
