// 보조선: 샤프트 각도 검출 · 기준점 계산 테스트
globalThis.SL = { clamp: (v, a, b) => Math.max(a, Math.min(b, v)) };
require('../web/js/guides.js');
const G = SL.guides; let fail = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) fail++; };
const w = 360, h = 640;
function scene(deg, f, noise = 0) {           // 밝은 바닥 + 어두운 샤프트 한 줄
  const g = new Uint8Array(w * h).fill(190);
  for (let i = 0; i < g.length; i++) g[i] = 190 + Math.round((Math.random() - 0.5) * noise);
  const H = [160, 330], a = deg * Math.PI / 180, L = (560 - 330) / Math.cos(a);
  for (let t = 0; t < L; t += 0.5) {
    const x = Math.round(H[0] + f * Math.sin(a) * t), y = Math.round(H[1] + Math.cos(a) * t);
    for (let k = -1; k <= 1; k++) if (x + k >= 0 && x + k < w) g[y * w + x + k] = 40;
  }
  return { g, H };
}
for (const [deg, f] of [[40, 1], [52, 1], [35, -1]]) {
  const { g, H } = scene(deg, f, 30);
  const r = G.detectShaft(g, w, h, H, 560, f);
  ok(r && Math.abs(r.deg - deg) <= 2, `샤프트 ${deg}° (방향 ${f}) → 검출 ${r && r.deg}° (점수 ${r && r.score.toFixed(1)})`);
}
// 배경 경계(한쪽만 어두움)는 샤프트로 착각하지 않기
const edge = new Uint8Array(w * h);
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) edge[y * w + x] = (x - 160) * Math.cos(0.35) - (y - 330) * Math.sin(0.35) > 0 ? 60 : 200;
const re = G.detectShaft(edge, w, h, [160, 330], 560, 1);
ok(!re || re.score < 9, `배경 경계선은 무시 (점수 ${re && re.score.toFixed(1)})`);
const flat = new Uint8Array(w * h).fill(190);
const rf = G.detectShaft(flat, w, h, [160, 330], 560, 1);
ok(!rf || rf.score < 9, '샤프트 없으면 낮은 점수 → 평균 각도 사용');

// 랜드마크로 기준점 계산
const lm = Array.from({ length: 33 }, () => [0.5, 0.5, 1]);
lm[11] = [0.45, 0.35, 1]; lm[12] = [0.43, 0.35, 1]; lm[23] = [0.38, 0.55, 1]; lm[24] = [0.36, 0.55, 1];
lm[15] = [0.44, 0.52, 1]; lm[16] = [0.45, 0.52, 1];
lm[29] = [0.38, 0.9, 1]; lm[30] = [0.36, 0.9, 1]; lm[31] = [0.44, 0.91, 1]; lm[32] = [0.42, 0.91, 1];
const g1 = G.compute(lm, 9 / 16, null, null);
ok(g1.f === 1 && g1.ball[0] > g1.hands[0] && g1.ball[0] <= 0.97 && g1.ball[1] > g1.hands[1], `공은 손보다 공 쪽·화면 안 (ball ${g1.ball.map(v => v.toFixed(3))})`);
ok(g1.butt[0] < 0.37, `엉덩이 선은 골반보다 뒤쪽 (x ${g1.butt[0].toFixed(3)})`);
const mw = 100, mh = 100, md = new Float32Array(mw * mh);
for (let y = 30; y < 95; y++) for (let x = 30; x < 50; x++) md[y * mw + x] = 1;
const g2 = G.compute(lm, 9 / 16, null, { data: md, w: mw, h: mh });
ok(g2.fromMask && Math.abs(g2.butt[0] - 0.30) < 0.02, `마스크로 엉덩이 끝 찾기 (x ${g2.butt[0].toFixed(3)})`);
// 정면: 마스크로 골반 양끝
const fm = new Float32Array(mw * mh); for (let y = 20; y < 95; y++) for (let x = 30; x < 52; x++) fm[y * mw + x] = 1;
const lmF = lm.map(p => p.slice()); lmF[23] = [0.44, 0.55, 1]; lmF[24] = [0.38, 0.55, 1]; lmF[0] = [0.41, 0.2, 1];
const gf = G.computeFront(lmF, 9 / 16, { data: fm, w: mw, h: mh });
ok(gf.mode === 'front' && gf.fromMask && Math.abs(gf.xs[0] - 0.30) < 0.02 && Math.abs(gf.xs[1] - 0.52) < 0.02, `정면 스웨이 선 = 골반 바깥 양끝 (${gf.xs.map(v => v.toFixed(2))})`);
const gf2 = G.computeFront(lmF, 9 / 16, null);
ok(gf2.xs[0] < 0.38 && gf2.xs[1] > 0.44, '마스크 없을 때도 골반 바깥에 선');
// 손 좌표가 어긋나도 실제 샤프트 위로 굵은 선
const sc = scene(38, 1, 20);
const g3 = G.compute(lm, w / h, { gray: sc.g, w, h }, null);
ok(g3.detected && Math.abs(g3.deg - 38) <= 2, `영상 검출 각도 사용 (${g3.deg}°)`);
const r = G.ray([0.6, 0.9], [0.45, 0.52], 360, 640);
ok(r && (r[2] <= 0.5 || r[3] <= 0.5), '선이 화면 끝까지 연장됨');
console.log(fail ? `\n${fail}개 실패` : '\n모두 통과'); process.exit(fail ? 1 : 0);
