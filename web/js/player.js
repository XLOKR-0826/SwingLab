// 스윙 플레이어: 배속(0.25~1x) · 프레임 이동 · 스윙 궤적(백/다운 색 구분) · 스켈레톤 · 구간 점프 · 그리기
(function (SL) {
  const COL_BACK = '#40C8E0', COL_DOWN = '#FF453A', COL_SKEL = '#C6F432';

  class SwingPlayer {
    constructor(root, rec, url) {
      this.rec = rec; this.url = url; this.speed = 0.5;
      this.showTracer = true; this.showSkel = false; this.showGuide = false;
      this.source = rec.frames && rec.frames.some(f => f.club) ? 'club' : 'hands';
      const ph = rec.phases;
      this.el = SL.h(`<div class="sp">
        <div class="sp-stagewrap"><div class="sp-stage">
          <video loop muted playsinline webkit-playsinline preload="auto"></video>
          <canvas class="ov"></canvas><canvas class="draw"></canvas>
          <div class="sp-hud"><span class="spd">0.5x</span><span class="phn" style="display:none"></span></div>
        </div></div>
        <div class="sp-ctrl">
          <div class="sp-time"><input type="range" min="0" max="1000" value="0" step="1"><span class="t">0:00.00</span></div>
          <div class="sp-main">
            <div class="transport">
              <button class="tbtn" data-a="prev" title="이전 프레임">${SL.icon('prev')}</button>
              <button class="tbtn play" data-a="play">${SL.icon('play')}</button>
              <button class="tbtn" data-a="next" title="다음 프레임">${SL.icon('next')}</button>
            </div>
            <div class="speeds">${[0.25, 0.5, 0.75, 1].map(s => `<button data-s="${s}" class="${s === 0.5 ? 'on' : ''}">${s}x</button>`).join('')}</div>
          </div>
          <div class="phases">${SL.JUMP_PHASES.map(k => `<button data-p="${k}" ${ph ? '' : 'disabled'}>${SL.phaseName(k)}<small>${ph ? ph.t[k].toFixed(2) + 's' : '-'}</small></button>`).join('')}</div>
          <div class="toolrow">
            <button class="tool acc on" data-a="tracer" ${rec.frames ? '' : 'disabled'}>${SL.icon('tracer')}궤적</button>
            <button class="tool" data-a="src" ${rec.frames ? '' : 'disabled'}>${this.source === 'club' ? '클럽헤드 β' : '손 경로'}</button>
            <button class="tool" data-a="skel" ${rec.frames ? '' : 'disabled'}>${SL.icon('skeleton')}관절</button>
            <button class="tool guide" data-a="guide" ${rec.frames ? '' : 'disabled'}>${SL.icon('guide')}보조선</button>
            <span class="legend" style="margin-left:auto"><span><i style="background:${COL_BACK}"></i>백스윙</span><span><i style="background:${COL_DOWN}"></i>다운스윙</span></span>
          </div>
          <div class="draw-tools"></div>
        </div>
      </div>`);
      root.appendChild(this.el);
      this.v = SL.$('video', this.el); this.stage = SL.$('.sp-stage', this.el);
      this.ov = SL.$('canvas.ov', this.el); this.octx = this.ov.getContext('2d');
      this.layer = new SL.DrawLayer(SL.$('canvas.draw', this.el));
      SL.drawToolbar(this.layer, SL.$('.draw-tools', this.el));
      this.range = SL.$('input[type=range]', this.el); this.tEl = SL.$('.t', this.el);
      this.bind();
      this.ready = SL.loadVideo(this.v, url).then(() => { this.v.playbackRate = this.speed; this.fit(); });
      this.ro = new ResizeObserver(() => this.fit()); this.ro.observe(SL.$('.sp-stagewrap', this.el));
      const loop = () => { this.paint(); this.raf = requestAnimationFrame(loop); }; loop();
    }

    bind() {
      this.el.addEventListener('click', (e) => {
        const b = e.target.closest('button'); if (!b || b.disabled) return;
        if (b.dataset.s) this.setSpeed(+b.dataset.s);
        if (b.dataset.p) this.jump(b.dataset.p);
        const a = b.dataset.a;
        if (a === 'play') this.toggle();
        if (a === 'prev') this.step(-1);
        if (a === 'next') this.step(1);
        if (a === 'tracer') { this.showTracer = !this.showTracer; b.classList.toggle('on', this.showTracer); }
        if (a === 'skel') { this.showSkel = !this.showSkel; b.classList.toggle('on', this.showSkel); }
        if (a === 'guide') this.toggleGuides(b);
        if (a === 'src') {
          if (!this.rec.frames.some(f => f.club)) { SL.toast('클럽헤드를 찾지 못한 영상이에요 — 손 경로로 표시해요'); return; }
          this.source = this.source === 'club' ? 'hands' : 'club'; b.textContent = this.source === 'club' ? '클럽헤드 β' : '손 경로';
        }
      });
      this.stage.addEventListener('click', (e) => {
        if (this._dragged) { this._dragged = false; return; }
        if (!this.layer.tool && e.target.tagName !== 'BUTTON') this.toggle();
      });
      this.bindGuideDrag();
      this.range.addEventListener('input', () => { this.v.pause(); this.v.currentTime = this.range.value / 1000 * (this.v.duration || 0); });
      this.v.addEventListener('play', () => SL.$('[data-a=play]', this.el).innerHTML = SL.icon('pause'));
      this.v.addEventListener('pause', () => SL.$('[data-a=play]', this.el).innerHTML = SL.icon('play'));
    }

    fit() {
      const wrap = SL.$('.sp-stagewrap', this.el), vw = this.v.videoWidth || 9, vh = this.v.videoHeight || 16, ar = vw / vh;
      const W = wrap.clientWidth, maxH = Math.max(260, window.innerHeight * 0.56);
      let w = Math.min(W, maxH * ar), h = w / ar;
      this.stage.style.width = w + 'px'; this.stage.style.height = h + 'px';
      const dpr = window.devicePixelRatio || 1;
      this.ov.width = Math.round(w * dpr); this.ov.height = Math.round(h * dpr);
    }

    toggle() { if (this.v.paused) this.v.play().catch(() => {}); else this.v.pause(); }
    setSpeed(s) {
      this.speed = s; this.v.playbackRate = s;
      SL.$$('[data-s]', this.el).forEach(b => b.classList.toggle('on', +b.dataset.s === s));
      SL.$('.spd', this.el).textContent = s + 'x';
    }
    step(d) {
      this.v.pause();
      const fps = this.rec.fps || SL.settings.frameStep || 30;
      this.v.currentTime = SL.clamp(this.v.currentTime + d / fps, 0, Math.max(0, (this.v.duration || 0) - 0.001));
    }
    jump(k) {
      const ph = this.rec.phases; if (!ph) return;
      this.v.pause(); this.v.currentTime = ph.t[k] + 0.001;
      SL.$$('[data-p]', this.el).forEach(b => b.classList.toggle('on', b.dataset.p === k));
    }
    get idx() { const f = this.rec.frames; if (!f) return 0; return SL.clamp(Math.round(this.v.currentTime * (this.rec.fps || 30)), 0, f.length - 1); }

    paint() {
      const v = this.v, d = v.duration || 0;
      if (d) { if (document.activeElement !== this.range) this.range.value = Math.round(v.currentTime / d * 1000); this.tEl.textContent = `${SL.fmtTime(v.currentTime)} / ${SL.fmtTime(d)}`; }
      const ctx = this.octx, W = this.ov.width, H = this.ov.height, dpr = window.devicePixelRatio || 1;
      ctx.clearRect(0, 0, W, H);
      const fr = this.rec.frames; if (!fr || !fr.length) return;
      const i = this.idx, ph = this.rec.phases;
      // 현재 구간 표시
      const hud = SL.$('.phn', this.el);
      if (ph) {
        let cur = null; SL.PHASES.forEach(p => { if (i >= ph.idx[p.key]) cur = p.key; });
        if (i < ph.idx.address) cur = null;
        hud.style.display = cur ? '' : 'none'; if (cur) hud.textContent = SL.phaseName(cur);
      }
      if (this.showGuide && this.rec.guides) SL.guides.draw(ctx, this.rec.guides, W, H, dpr, !this.layer.tool);
      const path = this.path(this.source), fi = SL.clamp(v.currentTime * (this.rec.fps || 30), 0, fr.length - 1);
      const at = (x) => { // 프레임 사이 위치까지 보간 → 슬로모에서도 끊기지 않게
        const i0 = Math.floor(x), i1 = Math.min(fr.length - 1, i0 + 1), f = x - i0, p0 = path[i0], p1 = path[i1];
        if (p0 && p1) return [p0[0] + (p1[0] - p0[0]) * f, p0[1] + (p1[1] - p0[1]) * f];
        return p0 || null;
      };
      if (this.showTracer) {
        const seg = (a, b, col) => {
          if (b <= a) return;
          const pts = [];
          for (let k = a; k < b; k++) pts.push(path[k]);
          pts.push(at(b));
          ctx.strokeStyle = col; ctx.lineWidth = 4 * dpr; ctx.lineJoin = ctx.lineCap = 'round';
          ctx.shadowColor = col; ctx.shadowBlur = 10 * dpr;
          // 끊긴 구간마다 중점-2차곡선으로 부드럽게 연결
          let run = [];
          const flush = () => {
            if (run.length > 1) {
              const P = run.map(p => [p[0] * W, p[1] * H]);
              ctx.beginPath(); ctx.moveTo(P[0][0], P[0][1]);
              for (let k = 1; k < P.length - 1; k++) { const m = [(P[k][0] + P[k + 1][0]) / 2, (P[k][1] + P[k + 1][1]) / 2]; ctx.quadraticCurveTo(P[k][0], P[k][1], m[0], m[1]); }
              const L = P[P.length - 1]; ctx.lineTo(L[0], L[1]); ctx.stroke();
            }
            run = [];
          };
          pts.forEach(p => { if (p) run.push(p); else flush(); }); flush();
          ctx.shadowBlur = 0;
        };
        if (ph) {
          seg(ph.idx.address, Math.min(fi, ph.idx.top), COL_BACK);
          if (fi > ph.idx.top) seg(ph.idx.top, Math.min(fi, ph.idx.finish), COL_DOWN);
        } else seg(0, fi, COL_DOWN);
        const p = at(fi);
        if (p) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(p[0] * W, p[1] * H, 5 * dpr, 0, 7); ctx.fill(); }
      }
      if (this.showSkel && fr[i] && fr[i].lm) SwingPlayer.skeleton(ctx, fr[i].lm, W, H, dpr);
    }

    // 손/클럽헤드 좌표를 가우시안으로 다듬은 경로 (정규화 좌표, 없는 프레임은 null)
    path(src) {
      this._paths = this._paths || {};
      if (this._paths[src]) return this._paths[src];
      const fr = this.rec.frames;
      const raw = fr.map(f => {
        if (src === 'club') return f.club ? [f.club[0], f.club[1]] : null;
        if (!f.lm) return null; const a = f.lm[15], b = f.lm[16];
        return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      });
      // 짧은 공백(4프레임 이하) 선형 보간
      for (let i = 0; i < raw.length; i++) {
        if (raw[i]) continue;
        let j = i; while (j < raw.length && !raw[j]) j++;
        if (i > 0 && j < raw.length && j - i <= 4) for (let k = i; k < j; k++) { const r = (k - i + 1) / (j - i + 1); raw[k] = [raw[i - 1][0] + (raw[j][0] - raw[i - 1][0]) * r, raw[i - 1][1] + (raw[j][1] - raw[i - 1][1]) * r]; }
        i = j;
      }
      const sigma = src === 'club' ? 1.8 : 1.2, R = Math.ceil(sigma * 2.5);
      const out = raw.map((p, i) => {
        if (!p) return null;
        let sx = 0, sy = 0, sw = 0;
        for (let k = -R; k <= R; k++) { const q = raw[i + k]; if (!q) continue; const w = Math.exp(-(k * k) / (2 * sigma * sigma)); sx += q[0] * w; sy += q[1] * w; sw += w; }
        return [sx / sw, sy / sw];
      });
      return (this._paths[src] = out);
    }

    static skeleton(ctx, lm, W, H, dpr = 1, col = COL_SKEL) {
      ctx.strokeStyle = col; ctx.lineWidth = 2.5 * dpr; ctx.lineCap = 'round';
      SL.pose.EDGES.forEach(([a, b]) => {
        if (!lm[a] || !lm[b] || lm[a][2] < 0.3 || lm[b][2] < 0.3) return;
        ctx.beginPath(); ctx.moveTo(lm[a][0] * W, lm[a][1] * H); ctx.lineTo(lm[b][0] * W, lm[b][1] * H); ctx.stroke();
      });
      ctx.fillStyle = '#fff';
      [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28].forEach(k => {
        if (!lm[k] || lm[k][2] < 0.3) return; ctx.beginPath(); ctx.arc(lm[k][0] * W, lm[k][1] * H, 3.2 * dpr, 0, 7); ctx.fill();
      });
    }

    // ---------- 보조선 ----------
    async toggleGuides(btn) {
      if (this.showGuide) { this.showGuide = false; btn.classList.remove('on'); return; }
      if (this.rec.guides && this.rec.guides.v !== 2) delete this.rec.guides;   // 예전 형식이면 다시 계산
      if (!this.rec.guides) {
        btn.disabled = true; btn.lastChild.textContent = '계산 중…';
        try { await this.computeGuides(); } catch (e) { console.warn(e); }
        btn.disabled = false; btn.lastChild.textContent = '보조선';
        if (!this.rec.guides) { SL.toast('어드레스 자세에서 관절을 찾지 못했어요'); return; }
        const g = this.rec.guides;
        if (g.mode === 'front') SL.toast('어드레스 때 골반 양끝 선이에요 · 백스윙 때 선 밖으로 나가면 스웨이', 3500);
        else SL.toast(g.detected ? '샤프트를 찾아 보조선을 그렸어요 · 흰 점을 끌어 조정할 수 있어요' : '샤프트를 못 찾아 평균 각도로 그렸어요 · 흰 점(공)을 끌어 맞춰 주세요', 3500);
      }
      this.showGuide = true; btn.classList.add('on');
    }

    async computeGuides() {
      const fr = this.rec.frames, ph = this.rec.phases;
      let idx = ph ? ph.idx.address : fr.findIndex(f => f.lm);
      if (idx < 0 || !fr[idx] || !fr[idx].lm) idx = fr.findIndex(f => f.lm);
      if (idx < 0) return;
      const lm = fr[idx].lm, v = this.v, t0 = v.currentTime, wasPlaying = !v.paused;
      v.pause();
      await this.ready;
      await SL.seek(v, fr[idx].t + 0.001);
      const vw = v.videoWidth, vh = v.videoHeight;
      const gw = 540, gh = Math.round(540 * vh / vw), c = document.createElement('canvas');
      c.width = gw; c.height = gh; const cx = c.getContext('2d', { willReadFrequently: true });
      cx.drawImage(v, 0, 0, gw, gh);
      const d = cx.getImageData(0, 0, gw, gh).data, gray = new Uint8Array(gw * gh);
      for (let p = 0, q = 0; p < gray.length; p++, q += 4) gray[p] = (d[q] * 77 + d[q + 1] * 150 + d[q + 2] * 29) >> 8;
      let mask = null;
      try {       // 사람 마스크로 엉덩이 끝 찾기 (8초 넘으면 건너뜀)
        const big = document.createElement('canvas'); big.width = Math.min(720, vw); big.height = Math.round(big.width * vh / vw);
        big.getContext('2d').drawImage(v, 0, 0, big.width, big.height);
        mask = await Promise.race([SL.photoFx.personMask(big), SL.sleep(8000).then(() => null)]);
      } catch (e) { console.warn('mask', e); }
      this.rec.guides = this.rec.view === 'front' ? SL.guides.computeFront(lm, vw / vh, mask)
        : SL.guides.compute(lm, vw / vh, { gray, w: gw, h: gh }, mask);
      await SL.db.put(this.rec);
      v.currentTime = t0; if (wasPlaying) v.play().catch(() => {});
    }

    bindGuideDrag() {
      let drag = null;
      const pos = (e) => { const r = this.stage.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height, r]; };
      this.stage.addEventListener('pointerdown', (e) => {
        const g = this.rec.guides; if (!this.showGuide || !g || g.mode === 'front' || this.layer.tool) return;
        const [x, y, r] = pos(e);
        const near = (p) => Math.hypot((p[0] - x) * r.width, (p[1] - y) * r.height) < 26;
        drag = near(g.ball) ? 'ball' : null;
        if (!drag) return;
        e.preventDefault(); this.stage.setPointerCapture(e.pointerId); this.v.pause();
      });
      this.stage.addEventListener('pointermove', (e) => {
        if (!drag) return; e.preventDefault();
        const g = this.rec.guides, [x, y] = pos(e);
        g.ball = [SL.clamp(x, 0, 1), SL.clamp(y, 0, 1)];
      });
      const end = () => { if (!drag) return; drag = null; this._dragged = true; this.rec.guides.edited = true; SL.db.put(this.rec); };
      this.stage.addEventListener('pointerup', end); this.stage.addEventListener('pointercancel', end);
    }

    destroy() { cancelAnimationFrame(this.raf); this.ro.disconnect(); this.layer.destroy(); this.v.pause(); this.v.removeAttribute('src'); this.v.load(); }
  }
  SL.SwingPlayer = SwingPlayer;
})(window.SL);
