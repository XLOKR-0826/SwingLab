// 연습 모드: 카메라를 켜두면 스윙마다 자동으로 잘라 저장 → 스윙 일관성 분석
(function (SL) {
  const pickMime = () => {
    const c = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
    return c.find(m => window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m)) || '';
  };

  // 스윙 감지 상태머신 (시간 기반). 입력: 정규화 랜드마크, 현재시각(초)
  class SwingDetector {
    constructor(cb) { this.cb = cb; this.reset(); }
    reset() { this.state = 'wait'; this.since = null; this.prev = null; this.stillT = null; }
    update(lm, now) {
      if (!lm) return;
      const hy = (lm[15][1] + lm[16][1]) / 2, hx = (lm[15][0] + lm[16][0]) / 2;
      const shY = (lm[11][1] + lm[12][1]) / 2, hipY = (lm[23][1] + lm[24][1]) / 2;
      const T = Math.max(0.05, hipY - shY);
      let speed = 0;
      if (this.prev) { const dt = Math.max(0.016, now - this.prev.t); speed = Math.hypot(hx - this.prev.x, hy - this.prev.y) / T / dt; }
      this.prev = { x: hx, y: hy, t: now };
      const low = hy > hipY - 0.35 * T, still = speed < 0.7;
      switch (this.state) {
        case 'wait':
          if (low && still) { if (this.since == null) this.since = now; if (now - this.since > 0.5) { this.state = 'address'; this.addrT = now; this.stillT = now; this.cb('address'); } }
          else this.since = null;
          break;
        case 'address':
          if (still && low) { this.stillT = now; this.addrY = hy; }
          if (hy < shY) { this.state = 'back'; this.topY = hy; this.topT = now; this.lowY = null; this.cb('back'); }
          else if (!low && now - this.stillT > 3) { this.reset(); this.cb('wait'); }
          break;
        case 'back':
          if (this.lowY == null && hy < this.topY) { this.topY = hy; this.topT = now; this.cb('top'); }
          // 손이 골반 높이까지 내려오면 가장 낮은 지점(=임팩트)을 추적
          if (hy > hipY - 0.15 * T && now - this.topT > 0.08) {
            if (this.lowY == null || hy > this.lowY) { this.lowY = hy; this.lowT = now; }
            const addr = this.addrY ?? hipY;
            if (hy >= addr - 0.05 * T || hy < this.lowY - 0.05 * T) { this.state = 'follow'; this.impT = this.lowT; this.cb('impact'); }
          }
          if (this.state === 'back' && now - this.topT > 3) { this.reset(); this.cb('wait'); }
          break;
        case 'follow':
          if (now - this.impT > 1.1) {
            const back = this.topT - this.stillT, down = this.impT - this.topT;
            this.cb('finish', { back, down, ratio: down > 0 ? back / down : null, topHeight: (shY - this.topY) / T, addrT: this.addrT, topT: this.topT, impT: this.impT });
            this.state = 'cool'; this.coolT = now;
          }
          break;
        case 'cool':
          if (now - this.coolT > 0.8) { this.reset(); this.cb('wait'); }
          break;
      }
    }
  }
  SL.SwingDetector = SwingDetector;

  SL.route('practice', async (view) => {
    document.body.classList.add('fullscreen');
    const sessionId = SL.uid(); let count = 0;
    view.innerHTML = `<div class="pm">
      <div class="pm-stage"><video autoplay muted playsinline webkit-playsinline></video><canvas></canvas><div class="pm-guide"></div>
        <div class="pm-top">
          <div class="row"><button class="pill" id="close">${SL.icon('x').replace('<svg', '<svg width="14" height="14"')}</button>
            <span class="pill" id="recpill"><i class="rd"></i>REC <span id="rt">00:00</span></span></div>
          <span class="pill">연습 모드</span></div>
        <div class="pm-status"><span class="pill busy" id="st">카메라 준비 중…</span></div>
      </div>
      <div class="pm-bottom">
        <div class="pm-count"><span>오늘 저장된 스윙 <b id="cnt">0</b>개</span><button class="badge acc" id="cons">일관성 분석 ›</button></div>
        <div class="pm-thumbs" id="thumbs"><div style="width:auto;border:0;background:none;color:#6B7480;font-size:12px;display:flex;align-items:center">스윙하면 여기에 자동 저장돼요</div></div>
        <div class="pm-ctrl">
          <a class="pm-side" href="#/records">${SL.icon('gallery')}</a>
          <button class="recbtn" id="recbtn"><i></i></button>
          <button class="pm-side" id="flip">${SL.icon('flip')}</button>
        </div>
      </div></div>`;
    const video = SL.$('video', view), cv = SL.$('canvas', view), ctx = cv.getContext('2d');
    const st = SL.$('#st', view);
    const setStatus = (txt, cls = '') => { st.className = 'pill ' + cls; st.innerHTML = txt; };
    let stream = null, facing = 'environment', lm = null, raf = 0, active = false, sessStart = 0, wake = null, alive = true;
    let recorder = null, recStart = 0, topThumb = null;
    const mime = pickMime();
    const thumbCv = document.createElement('canvas');

    const startCam = async () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } }, audio: false });
      } catch (e) {
        setStatus('카메라를 쓸 수 없어요', 'swing');
        SL.sheet(`<h3>카메라 권한이 필요해요</h3><p class="small muted">브라우저 설정에서 카메라를 허용해 주세요. HTTPS 주소(또는 localhost)에서만 카메라가 켜져요.<br><br>오류: ${SL.esc(e.message)}</p>`);
        return false;
      }
      video.srcObject = stream;
      const mir = facing === 'user' ? 'scaleX(-1)' : '';
      video.style.transform = cv.style.transform = mir;
      await video.play().catch(() => {});
      return true;
    };

    const startRec = () => {
      if (!window.MediaRecorder || !stream) return;
      const chunks = [];
      try { recorder = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 4e6 } : undefined); } catch (e) { recorder = new MediaRecorder(stream); }
      recorder._chunks = chunks;
      recorder.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
      recorder.start(200); recStart = performance.now() / 1000;
    };
    const stopRec = (onBlob) => {
      const r = recorder; recorder = null;
      if (!r || r.state === 'inactive') return;
      r.onstop = () => onBlob && onBlob(new Blob(r._chunks, { type: r.mimeType || mime || 'video/webm' }));
      try { r.stop(); } catch (e) {}
    };

    const saveSwing = (m) => {
      const thumb = topThumb, start = recStart;
      stopRec(async (blob) => {
        const rec = {
          id: SL.uid(), createdAt: Date.now(), source: 'practice', sessionId, blob, thumb, club: SL.settings.practiceClub || '',
          view: 'side', hand: SL.settings.hand, slow: 1,
          tempo: m.ratio ? { back: +m.back.toFixed(2), down: +m.down.toFixed(2), ratio: +m.ratio.toFixed(1) } : null,
          topHeight: +m.topHeight.toFixed(2), live: { top: +(m.topT - start).toFixed(2), impact: +(m.impT - start).toFixed(2) },
        };
        await SL.db.put(rec);
        count++; SL.$('#cnt', view).textContent = count;
        const th = SL.$('#thumbs', view);
        if (count === 1) th.innerHTML = '';
        const d = SL.h(`<div style="${thumb ? `background-image:url(${thumb})` : ''}" data-id="${rec.id}"><span>${rec.tempo ? rec.tempo.ratio + ':1' : '#' + count}</span></div>`);
        th.prepend(d);
      });
      startRec();
    };

    const det = new SwingDetector((ev, m) => {
      if (!active) return;
      if (ev === 'address') { setStatus(SL.icon('check').replace('<svg', '<svg width="14" height="14"') + '어드레스 감지 — 스윙하세요', ''); if (recorder) { stopRec(null); } startRec(); }
      if (ev === 'back') setStatus('스윙 중…', 'swing');
      if (ev === 'top') { try { thumbCv.width = 120; thumbCv.height = Math.round(120 * video.videoHeight / video.videoWidth); thumbCv.getContext('2d').drawImage(video, 0, 0, thumbCv.width, thumbCv.height); topThumb = thumbCv.toDataURL('image/jpeg', 0.7); } catch (e) {} }
      if (ev === 'finish') { saveSwing(m); setStatus(`저장됨 · 템포 ${m.ratio ? m.ratio.toFixed(1) : '-'}:1`, ''); }
      if (ev === 'wait') setStatus(SL.icon('check').replace('<svg', '<svg width="14" height="14"') + '스윙 감지 대기중', '');
    });

    const loop = () => {
      if (!alive) return;
      raf = requestAnimationFrame(loop);
      const W = cv.clientWidth, H = cv.clientHeight, dpr = window.devicePixelRatio || 1;
      if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
      ctx.clearRect(0, 0, cv.width, cv.height);
      if (active) SL.$('#rt', view).textContent = new Date((performance.now() / 1000 - sessStart) * 1000).toISOString().substr(14, 5);
      if (!lm || video.readyState < 2) return;
      let p = null;
      try { p = SL.pose.detect(lm, video); } catch (e) { return; }
      det.update(p, performance.now() / 1000);
      if (p) {
        const vw = video.videoWidth, vh = video.videoHeight, s = Math.max(cv.width / vw, cv.height / vh);
        const ox = (cv.width - vw * s) / 2, oy = (cv.height - vh * s) / 2;
        const mapped = p.map(q => [(q[0] * vw * s + ox) / cv.width, (q[1] * vh * s + oy) / cv.height, q[2]]);
        SL.SwingPlayer.skeleton(ctx, mapped, cv.width, cv.height, dpr);
      }
    };

    const setActive = (on) => {
      active = on; SL.$('#recbtn', view).classList.toggle('on', on); SL.$('#recpill', view).classList.toggle('rec', on);
      if (on) { sessStart = performance.now() / 1000; det.reset(); setStatus(SL.icon('check').replace('<svg', '<svg width="14" height="14"') + '스윙 감지 대기중', '');
        if (navigator.wakeLock) navigator.wakeLock.request('screen').then(w => wake = w).catch(() => {}); }
      else { stopRec(null); setStatus('일시정지됨 — 빨간 버튼으로 시작', 'busy'); wake && wake.release && wake.release(); }
    };

    SL.$('#recbtn', view).onclick = () => { if (!lm) return SL.toast('AI 모델을 불러오는 중이에요'); setActive(!active); };
    SL.$('#flip', view).onclick = async () => { facing = facing === 'user' ? 'environment' : 'user'; const was = active; if (was) setActive(false); await startCam(); };
    SL.$('#close', view).onclick = () => SL.go('home');
    SL.$('#cons', view).onclick = () => { if (!count) return SL.toast('스윙을 2개 이상 저장하면 분석할 수 있어요'); SL.go('session', { id: sessionId }); };
    SL.$('#thumbs', view).addEventListener('click', e => { const d = e.target.closest('[data-id]'); if (d) SL.go('analyze', { id: d.dataset.id }); });

    if (await startCam()) {
      setStatus('AI 자세 인식 모델 불러오는 중…', 'busy');
      try { lm = await SL.pose.get('lite'); if (alive) { setActive(true); loop(); } }
      catch (e) { setStatus('AI 모델을 불러오지 못했어요', 'swing'); }
    }

    return () => {
      alive = false; cancelAnimationFrame(raf); stopRec(null);
      if (stream) stream.getTracks().forEach(t => t.stop());
      wake && wake.release && wake.release();
      document.body.classList.remove('fullscreen');
    };
  });
})(window.SL);
