// 스윙 비교: 나란히 / 겹쳐보기, 각각 재생·정지·배속, 구간 맞추기, 한 화면에 그리기
(function (SL) {
  SL.route('compare', async (view, params) => {
    const slots = { a: null, b: null }; // {rec, url}
    view.innerHTML = `${SL.pageHead('스윙 비교')}
      <div class="seg" id="mode" style="margin-bottom:12px"><button data-m="side" class="on">나란히 보기</button><button data-m="overlay">겹쳐 보기</button></div>
      <div class="cmp-area"><div class="cmp-grid">
        <div class="cmp-slot" data-k="a"></div><div class="cmp-slot" data-k="b"></div>
      </div><canvas class="draw"></canvas></div>
      <div id="opRow" class="row" style="margin-top:10px;display:none"><span class="small muted" style="width:70px">B 투명도</span><input type="range" id="op" min="10" max="90" value="50" style="flex:1"></div>
      <div class="cmp-ctrls"><div class="cmp-ctrl" data-k="a"></div><div class="cmp-ctrl" data-k="b"></div></div>
      <div class="row" style="margin-top:10px">
        <button class="btn sm" id="both" style="flex:1">${SL.icon('play')}동시 재생</button>
        <button class="btn sm" id="sync" style="flex:1">처음으로</button>
      </div>
      <div class="small muted" style="margin:14px 0 6px">구간 맞추기 (두 영상 모두 분석된 경우)</div>
      <div class="chips" id="align">${SL.JUMP_PHASES.map(k => `<button class="chip" data-p="${k}">${SL.phaseName(k)}</button>`).join('')}</div>
      <div id="tools"></div>`;
    const area = SL.$('.cmp-area', view), grid = SL.$('.cmp-grid', view);
    const layer = new SL.DrawLayer(SL.$('canvas.draw', area));
    SL.drawToolbar(layer, SL.$('#tools', view));
    const urls = [];

    const label = (k, rec) => `${k.toUpperCase()} · ${rec.source === 'pro' ? '프로' : '나'}${rec.club ? ' ' + rec.club : ''}`;
    const renderSlot = (k) => {
      const box = SL.$(`.cmp-slot[data-k=${k}]`, view), ctrl = SL.$(`.cmp-ctrl[data-k=${k}]`, view), s = slots[k];
      if (!s) {
        box.innerHTML = `<div class="pick"><span class="small muted">${k === 'a' ? '내 스윙' : '비교할 스윙 (프로 영상 등)'}</span>
          <button class="btn sm primary" data-pick="${k}">${SL.icon('plus')}영상 선택</button></div>`;
        ctrl.innerHTML = `<div class="small dim" style="text-align:center;padding:14px 0">${k.toUpperCase()} 영상 없음</div>`;
        return;
      }
      box.innerHTML = `<span class="lab">${SL.esc(label(k, s.rec))}</span><video class="${k}" loop muted playsinline webkit-playsinline preload="auto"></video>`;
      const v = SL.$('video', box); s.v = v;
      SL.loadVideo(v, s.url).then(() => { v.playbackRate = s.speed || 0.5; }).catch(e => SL.toast(e.message));
      ctrl.innerHTML = `<div class="r"><button class="tbtn" data-act="play">${SL.icon('play')}</button>
          <button class="tbtn" data-act="prev">${SL.icon('prev')}</button><button class="tbtn" data-act="next">${SL.icon('next')}</button>
          <button class="tbtn" data-pick="${k}" style="margin-left:auto">${SL.icon('flip')}</button></div>
        <input type="range" min="0" max="1000" value="0">
        <div class="mini-speeds">${[0.25, 0.5, 0.75, 1].map(x => `<button data-sp="${x}" class="${x === (s.speed || 0.5) ? 'on' : ''}">${x}x</button>`).join('')}</div>`;
      const rg = SL.$('input', ctrl);
      rg.addEventListener('input', () => { v.pause(); v.currentTime = rg.value / 1000 * (v.duration || 0); });
      v.addEventListener('timeupdate', () => { if (v.duration) rg.value = v.currentTime / v.duration * 1000; });
      v.addEventListener('play', () => SL.$('[data-act=play]', ctrl).innerHTML = SL.icon('pause'));
      v.addEventListener('pause', () => SL.$('[data-act=play]', ctrl).innerHTML = SL.icon('play'));
      ctrl.onclick = (e) => {
        const b = e.target.closest('button'); if (!b) return;
        if (b.dataset.act === 'play') v.paused ? v.play().catch(() => {}) : v.pause();
        if (b.dataset.act === 'prev' || b.dataset.act === 'next') { v.pause(); v.currentTime = SL.clamp(v.currentTime + (b.dataset.act === 'next' ? 1 : -1) / 30, 0, v.duration || 0); }
        if (b.dataset.sp) { s.speed = +b.dataset.sp; v.playbackRate = s.speed; SL.$$('[data-sp]', ctrl).forEach(x => x.classList.toggle('on', x === b)); }
      };
    };

    const setSlot = async (k, rec) => {
      const old = slots[k]; if (old) { old.v && old.v.pause(); }
      const url = URL.createObjectURL(rec.blob); urls.push(url);
      slots[k] = { rec, url, speed: 0.5 }; renderSlot(k);
    };

    const pick = async (k) => {
      const list = (await SL.db.all()).filter(r => r.blob);
      SL.sheet(`<h3>${k.toUpperCase()} 영상 선택</h3>
        <label class="btn primary block" for="pf">${SL.icon('upload')}새 영상 업로드 (프로 스윙 등)</label>
        <input type="file" id="pf" accept="video/*" hidden>
        <div class="small muted" style="margin:16px 0 4px">저장된 스윙</div>
        ${list.length ? list.map(r => `<div class="rec" data-id="${r.id}" style="cursor:pointer">
          <div class="th ${r.thumb ? '' : 'ph'}" style="${r.thumb ? `background-image:url(${r.thumb})` : ''}">${r.thumb ? '' : SL.icon('club')}</div>
          <div class="meta"><b>${r.source === 'pro' ? '프로 · ' : ''}${SL.esc(r.club || r.title || '스윙')}</b><span>${SL.fmtDate(r.createdAt)}</span></div></div>`).join('') : '<div class="empty">저장된 영상이 없어요</div>'}`,
        (sh, close) => {
          sh.addEventListener('click', async e => {
            const r = e.target.closest('[data-id]'); if (!r) return;
            close(); setSlot(k, await SL.db.get(r.dataset.id));
          });
          SL.$('#pf', sh).addEventListener('change', async e => {
            const f = e.target.files[0]; if (!f) return; close();
            const rec = { id: SL.uid(), createdAt: Date.now(), source: k === 'b' ? 'pro' : 'upload', title: f.name, blob: f, club: '', view: 'side', hand: SL.settings.hand, slow: 1 };
            await SL.db.put(rec); setSlot(k, rec);
            SL.toast(k === 'b' ? '프로 영상으로 저장했어요 (기록 > 프로)' : '영상을 저장했어요');
          });
        });
    };

    view.addEventListener('click', e => { const b = e.target.closest('[data-pick]'); if (b) pick(b.dataset.pick); });
    SL.$('#mode', view).addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      SL.$$('#mode button', view).forEach(x => x.classList.toggle('on', x === b));
      const ov = b.dataset.m === 'overlay';
      grid.classList.toggle('overlay', ov); SL.$('#opRow', view).style.display = ov ? '' : 'none';
      const sb = SL.$('.cmp-slot[data-k=b]', view);
      sb.style.cssText = ov ? 'position:absolute;inset:0;background:transparent;height:auto' : '';
      if (ov) SL.toast('B 영상이 A 위에 겹쳐져요. 시작 프레임을 맞춘 뒤 재생하세요');
    });
    SL.$('#op', view).addEventListener('input', e => grid.style.setProperty('--op', e.target.value / 100));
    SL.$('#both', view).onclick = () => {
      const vs = ['a', 'b'].map(k => slots[k] && slots[k].v).filter(Boolean);
      const anyPlaying = vs.some(v => !v.paused);
      vs.forEach(v => anyPlaying ? v.pause() : v.play().catch(() => {}));
      SL.$('#both', view).innerHTML = (anyPlaying ? SL.icon('play') + '동시 재생' : SL.icon('pause') + '동시 정지');
    };
    SL.$('#sync', view).onclick = () => ['a', 'b'].forEach(k => { const s = slots[k]; if (s && s.v) { s.v.pause(); s.v.currentTime = 0; } });
    SL.$('#align', view).addEventListener('click', e => {
      const b = e.target.closest('[data-p]'); if (!b) return;
      let n = 0;
      ['a', 'b'].forEach(k => { const s = slots[k]; if (s && s.v && s.rec.phases) { s.v.pause(); s.v.currentTime = s.rec.phases.t[b.dataset.p] + 0.001; n++; } });
      if (n < 2) SL.toast('분석된 영상만 구간을 맞출 수 있어요 (영상 열기 → 정밀 분석)');
      SL.$$('#align .chip', view).forEach(x => x.classList.toggle('on', x === b));
    });

    renderSlot('a'); renderSlot('b');
    if (params.a) { const r = await SL.db.get(params.a); if (r) setSlot('a', r); }
    if (params.b) { const r = await SL.db.get(params.b); if (r) setSlot('b', r); }
    if (params.overlay) SL.$('#mode [data-m=overlay]', view).click();
    return () => { layer.destroy(); ['a', 'b'].forEach(k => slots[k] && slots[k].v && slots[k].v.pause()); urls.forEach(u => URL.revokeObjectURL(u)); };
  });
})(window.SL);
