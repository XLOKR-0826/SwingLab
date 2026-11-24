// 연습모드 실시간 스윙 감지 상태머신 테스트
globalThis.window = globalThis; globalThis.SL = { route() {} };
require('../web/js/pages/practice.js');
const ev = []; const d = new SL.SwingDetector((e, m) => ev.push([e, m]));
const fps = 30; let t = 0;
const frame = (hy) => { const lm = Array.from({ length: 33 }, () => [0.5, 0.5, 1]);
  lm[11] = [0.5, 0.3, 1]; lm[12] = [0.48, 0.3, 1]; lm[23] = [0.47, 0.52, 1]; lm[24] = [0.45, 0.52, 1];
  lm[15] = [0.5, hy, 1]; lm[16] = [0.51, hy, 1]; d.update(lm, t); t += 1 / fps; };
const swing = (back, down) => {
  for (let i = 0; i < 30; i++) frame(0.6);                                   // 어드레스 1초
  for (let i = 1; i <= back * fps; i++) frame(0.6 - 0.4 * (i / (back * fps)));  // 백스윙
  for (let i = 1; i <= down * fps; i++) frame(0.2 + 0.42 * (i / (down * fps))); // 다운스윙
  for (let i = 0; i < 20; i++) frame(0.62 - 0.4 * Math.min(1, i / 8));       // 팔로우
  for (let i = 0; i < 45; i++) frame(0.22);                                  // 피니시 유지
  for (let i = 0; i < 20; i++) frame(0.6);                                   // 다시 내려옴
};
swing(0.9, 0.3); swing(0.6, 0.3);
for (let i = 0; i < 60; i++) frame(0.6); // 와글/정지만 — 저장되면 안 됨
const fin = ev.filter(e => e[0] === 'finish');
console.log(ev.map(e => e[0]).filter((e, i, a) => e !== a[i - 1]).join(' → '));
fin.forEach(f => console.log('  tempo', f[1].ratio.toFixed(2), 'back', f[1].back.toFixed(2), 'down', f[1].down.toFixed(2)));
const ok = fin.length === 2 && Math.abs(fin[0][1].ratio - 3) < 0.6 && Math.abs(fin[1][1].ratio - 2) < 0.5;
console.log(ok ? '✓ 스윙 2개 감지·템포 정상' : '✗ 실패'); process.exit(ok ? 0 : 1);
