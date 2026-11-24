// 합성 스윙 데이터로 구간검출·템포·진단·일관성 로직 검증 (node tests/test_analyzer.js)
globalThis.SL = { clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
  PHASES: ['address', 'takeaway', 'backswing', 'top', 'downswing', 'impact', 'follow', 'finish'].map(k => ({ key: k, name: k })) };
require('../web/js/analyzer.js');
const A = SL.analyzer;
let fail = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) fail++; };

// 오른손 골퍼 측면 영상 흉내: 30fps, 1s 정지 → 0.9s 백스윙 → 0.3s 다운 → 0.4s 팔로우 → 1s 정지
function makeSwing({ back = 0.9, down = 0.3, earlyExt = 0, fps = 30 } = {}) {
  const ar = 9 / 16, frames = [];
  const seq = [];
  const still1 = Math.round(1 * fps), nb = Math.round(back * fps), nd = Math.round(down * fps), nf = Math.round(0.4 * fps), still2 = Math.round(1 * fps);
  const addrH = [0.5, 0.62], topH = [0.42, 0.22], finH = [0.6, 0.25];
  for (let i = 0; i < still1; i++) seq.push({ h: addrH, e: 0 });
  for (let i = 1; i <= nb; i++) { const r = i / nb, s = (1 - Math.cos(Math.PI * r)) / 2; seq.push({ h: [addrH[0] + (topH[0] - addrH[0]) * s, addrH[1] + (topH[1] - addrH[1]) * s], e: 0 }); }
  for (let i = 1; i <= nd; i++) { const r = i / nd, s = r * r; seq.push({ h: [topH[0] + (addrH[0] - topH[0]) * s, topH[1] + (addrH[1] + 0.01 - topH[1]) * s], e: earlyExt * r }); }
  for (let i = 1; i <= nf; i++) { const r = Math.sin(i / nf * Math.PI / 2); seq.push({ h: [addrH[0] + (finH[0] - addrH[0]) * r, addrH[1] + 0.01 + (finH[1] - addrH[1] - 0.01) * r], e: earlyExt }); }
  for (let i = 0; i < still2; i++) seq.push({ h: finH, e: earlyExt });
  seq.forEach((s, i) => {
    const lm = Array.from({ length: 33 }, () => [0.5, 0.5, 0.9]);
    lm[0] = [0.52, 0.2, 0.9];
    lm[11] = [0.5, 0.3, 0.9]; lm[12] = [0.48, 0.3, 0.9];
    lm[23] = [0.46 + s.e, 0.52, 0.9]; lm[24] = [0.44 + s.e, 0.52, 0.9];
    lm[13] = [(lm[11][0] + s.h[0]) / 2, (lm[11][1] + s.h[1]) / 2, 0.9];
    lm[15] = [s.h[0], s.h[1], 0.9]; lm[16] = [s.h[0] + 0.01, s.h[1], 0.9];
    lm[27] = [0.46, 0.9, 0.9]; lm[28] = [0.44, 0.9, 0.9];
    lm[29] = [0.44, 0.92, 0.9]; lm[30] = [0.42, 0.92, 0.9]; lm[31] = [0.5, 0.93, 0.9]; lm[32] = [0.48, 0.93, 0.9]; // 발끝이 +x (공 쪽)
    frames.push({ t: i / fps, lm, club: null });
  });
  return { frames, fps, ar, still1, nb, nd };
}

const s = makeSwing();
const ph = A.detectPhases(s.frames, s.fps, s.ar);
ok(ph, '구간 검출됨');
console.log('  idx', ph && ph.idx);
ok(ph && Math.abs(ph.idx.address - (s.still1 - 1)) <= 3, '어드레스 ≈ 움직임 시작');
ok(ph && Math.abs(ph.idx.top - (s.still1 + s.nb)) <= 2, '탑 ≈ 백스윙 끝');
ok(ph && Math.abs(ph.idx.impact - (s.still1 + s.nb + s.nd)) <= 2, '임팩트 ≈ 다운스윙 끝');
const order = ph && ['address', 'takeaway', 'backswing', 'top', 'downswing', 'impact', 'follow', 'finish'].every((k, i, a) => !i || ph.idx[a[i - 1]] <= ph.idx[k]);
ok(order, '8개 구간 순서 정상');
const t = A.tempo(ph, s.fps);
console.log('  tempo', t);
ok(t && t.ratio >= 2.6 && t.ratio <= 3.4, '템포 ≈ 3:1');
const d = A.diagnose({ frames: s.frames, phases: ph, ar: s.ar, view: 'side', hand: 'right', tempo: t });
console.log('  issues', d.issues.map(i => i.id), d.headline);
ok(!d.issues.some(i => i.id === 'tempo_fast'), '정상 템포는 경고 없음');

const fast = makeSwing({ back: 0.5, down: 0.3 });
const pf = A.detectPhases(fast.frames, fast.fps, fast.ar), tf = A.tempo(pf, fast.fps);
const df = A.diagnose({ frames: fast.frames, phases: pf, ar: fast.ar, view: 'side', hand: 'right', tempo: tf });
console.log('  fast tempo', tf, df.issues.map(i => i.id));
ok(df.issues.some(i => i.id === 'tempo_fast'), '빠른 백스윙 감지');

const ee = makeSwing({ earlyExt: 0.06 });
const pe = A.detectPhases(ee.frames, ee.fps, ee.ar);
const de = A.diagnose({ frames: ee.frames, phases: pe, ar: ee.ar, view: 'side', hand: 'right', tempo: A.tempo(pe, ee.fps) });
console.log('  early-ext', de.issues.map(i => i.id), de.headline);
ok(de.issues.some(i => i.id === 'early_ext'), '얼리 익스텐션 감지');

const slow = A.tempo(ph, s.fps, 4);
ok(slow.back < t.back && slow.ratio === t.ratio, '슬로모 보정 시 시간만 줄고 비율 유지');

const c = A.consistency([{ tempo: { ratio: 3, back: .9, down: .3 }, topHeight: .5 }, { tempo: { ratio: 3.1, back: .93, down: .3 }, topHeight: .52 }, { tempo: { ratio: 2.9, back: .87, down: .3 }, topHeight: .49 }]);
const c2 = A.consistency([{ tempo: { ratio: 2, back: .6, down: .3 }, topHeight: .3 }, { tempo: { ratio: 4, back: 1.2, down: .3 }, topHeight: .7 }]);
console.log('  consistency', c.score, c2.score);
ok(c.score > c2.score && c.score >= 80, '일관된 세션 점수가 더 높음');

ok(A.detectPhases(s.frames.map(f => ({ ...f, lm: null })), 30, s.ar) === null, '관절 없으면 null');
ok(A.missMessage('slice', 'left').includes('좌측'), '왼손잡이 방향 반전');
console.log(fail ? `\n${fail}개 실패` : '\n모두 통과');
process.exit(fail ? 1 : 0);
