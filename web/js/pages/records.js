// 기록 목록 + 연습 세션 일관성 분석
(function (SL) {
  SL.route('records', async (view) => {
    const all = await SL.db.all();
    let filter = 'all', selecting = false; const sel = [];
    view.innerHTML = `<header class="pagehead left" style="margin:0 0 8px"><h1 style="font-size:22px">기록</h1>
        <button class="btn sm" id="selBtn">${SL.icon('compare')}비교 선택</button></header>
      <div class="chips" id="flt">${[['all', '전체'], ['upload', '업로드'], ['practice', '연습모드'], ['pro', '프로']].map(([k, v], i) => `<button class="chip ${i ? '' : 'on'}" data-f="${k}">${v}</button>`).join('')}</div>
      <div id="list" style="margin-top:6px"></div>
      <div id="selBar" style="display:none;position:fixed;left:50%;transform:translateX(-50%);bottom:calc(var(--tab-h) + var(--safe-b) + 12px);width:calc(100% - 36px);max-width:724px;z-index:40" class="row">
        <button class="btn primary" style="flex:1" id="goSide">나란히 비교</button><button class="btn light" style="flex:1" id="goOv">겹쳐 보기</button></div>`;
    const draw = () => {
      const list = all.filter(r => filter === 'all' || r.source === filter);
      if (!list.length) { SL.$('#list', view).innerHTML = `<div class="empty">${SL.icon('chart')}기록이 없어요<br><a class="btn primary sm" style="margin-top:12px" href="#/analyze">스윙 업로드</a></div>`; return; }
      // 날짜별 그룹
      let html = '', last = '';
      list.forEach(r => {
        const day = SL.fmtDate(r.createdAt).slice(0, 10);
        if (day !== last) { html += `<div class="small muted" style="margin:18px 0 2px;font-weight:600">${day}</div>`; last = day; }
        if (selecting) html += `<div class="row" data-sel="${r.id}" style="cursor:pointer"><span class="chk ${sel.includes(r.id) ? 'on' : ''}">${sel.includes(r.id) ? SL.icon('check') : ''}</span><div style="flex:1;pointer-events:none">${SL.recCard(r)}</div></div>`;
        else html += SL.recCard(r);
      });
      SL.$('#list', view).innerHTML = html;
      SL.$('#selBar', view).style.display = selecting && sel.length === 2 ? 'flex' : 'none';
    };
    SL.$('#flt', view).addEventListener('click', e => { const b = e.target.closest('[data-f]'); if (!b) return; filter = b.dataset.f; SL.$$('#flt .chip', view).forEach(x => x.classList.toggle('on', x === b)); draw(); });
    SL.$('#selBtn', view).onclick = () => { selecting = !selecting; sel.length = 0; SL.$('#selBtn', view).innerHTML = selecting ? '취소' : SL.icon('compare') + '비교 선택'; if (selecting) SL.toast('비교할 영상 2개를 고르세요'); draw(); };
    SL.$('#list', view).addEventListener('click', e => {
      const r = e.target.closest('[data-sel]'); if (!r) return; e.preventDefault();
      const id = r.dataset.sel, i = sel.indexOf(id);
      if (i >= 0) sel.splice(i, 1); else { if (sel.length === 2) sel.shift(); sel.push(id); }
      draw();
    });
    SL.$('#goSide', view).onclick = () => SL.go('compare', { a: sel[0], b: sel[1] });
    SL.$('#goOv', view).onclick = () => SL.go('compare', { a: sel[0], b: sel[1], overlay: 1 });
    draw();
  });

  // 연습 세션 일관성
  SL.route('session', async (view, params) => {
    const swings = (await SL.db.all()).filter(r => r.sessionId === params.id).reverse();
    const c = SL.analyzer.consistency(swings);
    view.innerHTML = `${SL.pageHead('스윙 일관성 분석')}`;
    if (!c) { view.innerHTML += `<div class="empty">템포가 측정된 스윙이 2개 이상 필요해요<br><a class="btn primary sm" style="margin-top:12px" href="#/practice">연습모드 계속하기</a></div>`; return; }
    const col = c.score >= 80 ? '#C6F432' : c.score >= 60 ? '#FFD60A' : '#FF453A';
    const R = 48, L = 2 * Math.PI * R;
    const maxR = Math.max(...swings.filter(s => s.tempo).map(s => s.tempo.ratio), 4);
    view.innerHTML += `
      <div class="card row" style="gap:18px">
        <div class="score-ring"><svg viewBox="0 0 110 110" width="110" height="110"><circle cx="55" cy="55" r="${R}" stroke="#22272E" stroke-width="10" fill="none"/>
          <circle cx="55" cy="55" r="${R}" stroke="${col}" stroke-width="10" fill="none" stroke-linecap="round" stroke-dasharray="${L * c.score / 100} ${L}" transform="rotate(-90 55 55)"/></svg><b>${c.score}</b></div>
        <div><div style="font-weight:700;font-size:16px">${c.score >= 80 ? '리듬이 아주 일정해요' : c.score >= 60 ? '대체로 일정하지만 편차가 있어요' : '스윙마다 리듬이 달라요'}</div>
          <div class="small muted" style="margin-top:4px">${c.n}개 스윙 · 평균 템포 ${c.ratio.mean.toFixed(1)}:1 (±${c.ratio.sd.toFixed(2)})</div></div>
      </div>
      <h2 class="sec">스윙별 템포</h2>
      <div class="card"><div class="bars">${swings.filter(s => s.tempo).map((s, i) => `<div style="height:${s.tempo.ratio / maxR * 100}%;${Math.abs(s.tempo.ratio - c.ratio.mean) > c.ratio.sd * 1.5 ? 'background:#FF9F0A' : ''}"><span>${s.tempo.ratio}</span><em>${i + 1}</em></div>`).join('')}</div><div style="height:16px"></div></div>
      <h2 class="sec">상세</h2>
      <div class="card"><table class="t"><tr><th></th><th>평균</th><th>편차(±)</th></tr>
        <tr><td>템포 비율</td><td>${c.ratio.mean.toFixed(2)} : 1</td><td>${c.ratio.sd.toFixed(2)}</td></tr>
        <tr><td>백스윙 시간</td><td>${c.back.mean.toFixed(2)}s</td><td>${c.back.sd.toFixed(2)}s</td></tr>
        <tr><td>다운스윙 시간</td><td>${c.down.mean.toFixed(2)}s</td><td>${c.down.sd.toFixed(2)}s</td></tr>
        ${c.top ? `<tr><td>탑 손 높이</td><td>${c.top.mean.toFixed(2)}</td><td>${c.top.sd.toFixed(2)}</td></tr>` : ''}
      </table><p class="tiny dim" style="margin-top:8px">탑 손 높이 = 어깨선 위로 올라간 손 높이 (몸통 길이 기준)</p></div>
      <h2 class="sec">스윙 겹쳐 보기 <span class="tiny muted">템포가 가장 다른 두 스윙</span></h2>
      <div id="pair"></div>
      <h2 class="sec">저장된 스윙</h2>${swings.map(SL.recCard).join('')}`;
    const t = swings.filter(s => s.tempo);
    const lo = t.reduce((a, b) => (a.tempo.ratio < b.tempo.ratio ? a : b)), hi = t.reduce((a, b) => (a.tempo.ratio > b.tempo.ratio ? a : b));
    SL.$('#pair', view).innerHTML = `<a class="btn light block" href="#/compare?a=${lo.id}&b=${hi.id}&overlay=1">${SL.icon('stack')}${lo.tempo.ratio}:1 vs ${hi.tempo.ratio}:1 겹쳐 보기</a>`;
  });
})(window.SL);
