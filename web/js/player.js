// 스윙 플레이어: 배속(0.25~1x) · 프레임 이동 · 스윙 궤적(백/다운 색 구분) · 스켈레톤 · 구간 점프 · 그리기
(function (SL) {
  const COL_BACK = '#40C8E0', COL_DOWN = '#FF453A', COL_SKEL = '#C6F432';

  class SwingPlayer {
    constructor(root, rec, url) {
      this.rec = rec; this.url = url; this.speed = 0.5;
      this.showTracer = true; this.showSkel = false;
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
        if (a === 'src') {
          if (!this.rec.frames.some(f => f.club)) { SL.toast('클럽헤드를 찾지 못한 영상이에요 — 손 경로로 표시해요'); return; }
          this.source = this.source === 'club' ? 'hands' : 'club'; b.textContent = this.source === 'club' ? '클럽헤드 β' : '손 경로';
        }
      });
      this.stage.addEventListener('click', (e) => { if (!this.layer.tool && e.target.tagName !== 'BUTTON') this.toggle(); });
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
      const pt = (f) => {
        if (!f) return null;
        if (this.source === 'club' && f.club) return [f.club[0] * W, f.club[1] * H];
        if (this.source === 'hands' && f.lm) { const a = f.lm[15], b = f.lm[16]; return [(a[0] + b[0]) / 2 * W, (a[1] + b[1]) / 2 * H]; }
        return null;
      };
      if (this.showTracer) {
        const seg = (a, b, col) => {
          if (b < a) return;
          ctx.strokeStyle = col; ctx.lineWidth = 4 * dpr; ctx.lineJoin = ctx.lineCap = 'round';
          ctx.shadowColor = col; ctx.shadowBlur = 10 * dpr;
          ctx.beginPath(); let pen = false;
          for (let k = a; k <= b; k++) { const p = pt(fr[k]); if (!p) { pen = false; continue; } if (!pen) { ctx.moveTo(p[0], p[1]); pen = true; } else ctx.lineTo(p[0], p[1]); }
          ctx.stroke(); ctx.shadowBlur = 0;
        };
        if (ph) {
          seg(ph.idx.address, Math.min(i, ph.idx.top), COL_BACK);
          if (i > ph.idx.top) seg(ph.idx.top, Math.min(i, ph.idx.finish), COL_DOWN);
        } else seg(0, i, COL_DOWN);
        const p = pt(fr[i]);
        if (p) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(p[0], p[1], 5 * dpr, 0, 7); ctx.fill(); }
      }
      if (this.showSkel && fr[i] && fr[i].lm) SwingPlayer.skeleton(ctx, fr[i].lm, W, H, dpr);
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

    destroy() { cancelAnimationFrame(this.raf); this.ro.disconnect(); this.layer.destroy(); this.v.pause(); this.v.removeAttribute('src'); this.v.load(); }
  }
  SL.SwingPlayer = SwingPlayer;
})(window.SL);
