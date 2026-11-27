// 머리·척추 표시: 어드레스 기준 머리 이동 거리
globalThis.SL = { clamp: (v, a, b) => Math.max(a, Math.min(b, v)) };
require('../web/js/posture.js');
const P = SL.posture; let fail = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) fail++; };
const frames = [];
for (let i = 0; i < 60; i++) {
  const lm = Array.from({ length: 33 }, () => [0.5, 0.5, 0.9]);
  const dx = i < 30 ? 0 : (i - 30) * 0.002;           // 30프레임 이후 머리가 오른쪽으로 이동
  lm[0] = [0.52 + dx, 0.22, 0.9]; lm[7] = [0.49 + dx, 0.2, 0.9]; lm[8] = [0.51 + dx, 0.2, 0.9];
  lm[11] = [0.46, 0.3, 0.9]; lm[12] = [0.54, 0.3, 0.9]; lm[23] = [0.47, 0.55, 0.9]; lm[24] = [0.53, 0.55, 0.9];
  if (i === 40) lm[0] = null;                          // 한 프레임 인식 실패
  frames.push({ lm: lm.map(p => p || [0, 0, 0]) });
}
const st = P.build(frames, 5);
ok(P.moveCm(st, 10) < 0.5, `어드레스 근처는 이동 ≈ 0 (${P.moveCm(st, 10).toFixed(2)}cm)`);
const m = P.moveCm(st, 59); const expect = 0.058 / 0.25 * 48;
ok(Math.abs(m - expect) < 1.2, `끝 프레임 이동 ≈ ${expect.toFixed(1)}cm (계산 ${m.toFixed(1)}cm)`);
ok(P.pose(st, 40) !== null, '인식 실패 프레임도 앞뒤로 보간');
ok(Math.abs(P.moveCm(st, 45.5) - (P.moveCm(st, 45) + P.moveCm(st, 46)) / 2) < 0.05, '프레임 사이도 부드럽게 보간');
console.log(fail ? `\n${fail}개 실패` : '\n모두 통과'); process.exit(fail ? 1 : 0);
