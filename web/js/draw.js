// 영상 위 그리기 레이어: 직선 / 원(크기 조절) / 색상 / 보이기 토글 / 되돌리기
(function (SL) {
  SL.COLORS = [
    { name: '빨강', v: '#FF453A' }, { name: '파랑', v: '#0A84FF' }, { name: '노랑', v: '#FFD60A' },
    { name: '흰색', v: '#FFFFFF' }, { name: '검정', v: '#000000' },
  ];

  class DrawLayer {
    constructor(canvas, onChange) {
      this.cv = canvas; this.ctx = canvas.getContext('2d');
      this.shapes = []; this.tool = null; this.color = SL.COLORS[0].v; this.visible = true;
      this.cur = null; this.edit = null; this.onChange = onChange || (() => {});
      const opt = { passive: false };
      canvas.addEventListener('pointerdown', e => this.down(e), opt);
      canvas.addEventListener('pointermove', e => this.move(e), opt);
      canvas.addEventListener('pointerup', e => this.up(e));
      canvas.addEventListener('pointercancel', e => this.up(e));
      this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(canvas);
    }
    destroy() { this.ro.disconnect(); }
    setTool(t) { this.tool = t; this.cv.classList.toggle('active', !!t); if (t && !this.visible) this.setVisible(true); }
    setVisible(v) { this.visible = v; this.draw(); this.onChange(); }
    resize() {
      const r = this.cv.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
      this.cv.width = Math.max(1, Math.round(r.width * dpr)); this.cv.height = Math.max(1, Math.round(r.height * dpr));
      this.draw();
    }
    W() { return this.cv.width; } H() { return this.cv.height; }
    pos(e) { const r = this.cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; }
    px(p) { return [p[0] * this.W(), p[1] * this.H()]; }
    hit(p) {
      const tol = 16 * (window.devicePixelRatio || 1), P = this.px(p);
      for (let i = this.shapes.length - 1; i >= 0; i--) {
        const s = this.shapes[i];
        if (s.type === 'circle') {
          const c = this.px([s.x, s.y]), r = s.r * this.W(), d = Math.hypot(P[0] - c[0], P[1] - c[1]);
          if (Math.abs(d - r) < tol) return { s, mode: 'radius' };
          if (d < tol) return { s, mode: 'move', off: [p[0] - s.x, p[1] - s.y] };
        } else {
          const a = this.px([s.x1, s.y1]), b = this.px([s.x2, s.y2]);
          if (Math.hypot(P[0] - a[0], P[1] - a[1]) < tol) return { s, mode: 'p1' };
          if (Math.hypot(P[0] - b[0], P[1] - b[1]) < tol) return { s, mode: 'p2' };
        }
      }
      return null;
    }
    down(e) {
      if (!this.tool) return;
      e.preventDefault(); this.cv.setPointerCapture(e.pointerId);
      const p = this.pos(e);
      this.edit = this.hit(p);
      if (this.edit) return;
      this.cur = this.tool === 'circle' ? { type: 'circle', x: p[0], y: p[1], r: 0, color: this.color }
        : { type: 'line', x1: p[0], y1: p[1], x2: p[0], y2: p[1], color: this.color };
    }
    move(e) {
      if (!this.cur && !this.edit) return;
      e.preventDefault();
      const p = this.pos(e), ar = this.H() / this.W();
      if (this.edit) {
        const { s, mode } = this.edit;
        if (mode === 'radius') s.r = Math.hypot(p[0] - s.x, (p[1] - s.y) * ar);
        else if (mode === 'move') { s.x = p[0] - this.edit.off[0]; s.y = p[1] - this.edit.off[1]; }
        else if (mode === 'p1') { s.x1 = p[0]; s.y1 = p[1]; } else { s.x2 = p[0]; s.y2 = p[1]; }
      } else if (this.cur.type === 'circle') this.cur.r = Math.hypot(p[0] - this.cur.x, (p[1] - this.cur.y) * ar);
      else { this.cur.x2 = p[0]; this.cur.y2 = p[1]; }
      this.draw();
    }
    up() {
      if (this.cur) {
        const c = this.cur, big = c.type === 'circle' ? c.r > 0.01 : Math.hypot(c.x2 - c.x1, c.y2 - c.y1) > 0.01;
        if (big) this.shapes.push(c);
      }
      this.cur = null; this.edit = null; this.draw(); this.onChange();
    }
    undo() { this.shapes.pop(); this.draw(); this.onChange(); }
    clear() { this.shapes = []; this.draw(); this.onChange(); }
    draw() {
      const ctx = this.ctx, W = this.W(), H = this.H(), dpr = window.devicePixelRatio || 1;
      ctx.clearRect(0, 0, W, H);
      if (!this.visible) return;
      const all = this.cur ? [...this.shapes, this.cur] : this.shapes;
      ctx.lineCap = 'round'; ctx.lineWidth = 3 * dpr;
      for (const s of all) {
        ctx.strokeStyle = s.color;
        ctx.shadowColor = s.color === '#000000' ? 'rgba(255,255,255,.5)' : 'rgba(0,0,0,.5)'; ctx.shadowBlur = 3 * dpr;
        ctx.beginPath();
        if (s.type === 'circle') ctx.arc(s.x * W, s.y * H, s.r * W, 0, Math.PI * 2);
        else { ctx.moveTo(s.x1 * W, s.y1 * H); ctx.lineTo(s.x2 * W, s.y2 * H); }
        ctx.stroke();
        // 편집 핸들
        if (this.tool) {
          ctx.shadowBlur = 0; ctx.fillStyle = '#fff';
          const hs = s.type === 'circle' ? [[s.x * W + s.r * W, s.y * H]] : [[s.x1 * W, s.y1 * H], [s.x2 * W, s.y2 * H]];
          hs.forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 4.5 * dpr, 0, 7); ctx.fill(); });
        }
      }
      ctx.shadowBlur = 0;
    }
  }

  // 툴바 HTML + 바인딩 (재생 화면/비교 화면 공용)
  SL.drawToolbar = (layer, root) => {
    const el = SL.h(`<div class="toolrow">
      <button class="tool" data-t="line">${SL.icon('line')}직선</button>
      <button class="tool" data-t="circle">${SL.icon('circle')}원</button>
      <div class="palette">${SL.COLORS.map((c, i) => `<button data-c="${c.v}" title="${c.name}" style="background:${c.v}" class="${i ? '' : 'on'}"></button>`).join('')}</div>
      <button class="tool" data-a="vis" title="그림 보이기/숨기기">${SL.icon('eye')}</button>
      <button class="tool" data-a="undo" title="되돌리기">${SL.icon('undo')}</button>
      <button class="tool" data-a="clear" title="모두 지우기">${SL.icon('trash')}</button>
    </div>`);
    const sync = () => {
      SL.$$('[data-t]', el).forEach(b => b.classList.toggle('on', layer.tool === b.dataset.t));
      SL.$$('[data-c]', el).forEach(b => b.classList.toggle('on', layer.color === b.dataset.c));
      SL.$('[data-a=vis]', el).innerHTML = SL.icon(layer.visible ? 'eye' : 'eyeoff');
    };
    el.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.t) layer.setTool(layer.tool === b.dataset.t ? null : b.dataset.t);
      if (b.dataset.c) { layer.color = b.dataset.c; if (!layer.tool) layer.setTool('line'); }
      if (b.dataset.a === 'vis') layer.setVisible(!layer.visible);
      if (b.dataset.a === 'undo') layer.undo();
      if (b.dataset.a === 'clear') layer.clear();
      sync();
    });
    sync(); root && root.appendChild(el);
    return el;
  };

  SL.DrawLayer = DrawLayer;
})(window.SL);
