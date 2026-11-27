// AI 분석 & 드릴 (진단 결과 → 원인 → 구간별 진단 → 추천 드릴 → 유튜브)
(function (SL) {
  const spark = `<svg class="spark" viewBox="0 0 120 80" fill="none"><path d="M5 70C30 60 50 30 115 8" stroke="#C6F432" stroke-width="2" stroke-dasharray="3 5"/><circle cx="115" cy="8" r="3" fill="#C6F432"/></svg>`;

  SL.route('report', async (view, params) => {
    let rec = params.id ? await SL.db.get(params.id) : null;
    if (!rec) rec = (await SL.db.all()).find(r => r.diagnosis);
    if (!rec || !rec.diagnosis) {
      view.innerHTML = `${SL.pageHead('AI 분석 & 드릴')}<div class="card empty">${SL.icon('ai')}분석된 스윙이 없어요<br>
        <a class="btn primary sm" style="margin-top:14px" href="#/analyze">스윙 영상 올리기</a></div>
        <h2 class="sec">미스샷으로 드릴 찾기</h2><div id="missOnly"></div>`;
      missPicker(SL.$('#missOnly', view), null, SL.settings.hand);
      return;
    }
    const d = rec.diagnosis;
    const userMiss = new Set(rec.userMiss || []);
    view.innerHTML = `${SL.pageHead('AI 분석 & 드릴')}
      <h2 class="sec" style="margin-top:6px"><span class="row">${SL.icon('ai').replace('<svg', '<svg width="18" height="18" style="color:#C6F432"')} AI 분석 결과</span>
        <span class="badge ${d.score >= 85 ? 'acc' : d.score >= 70 ? 'yel' : 'red'}">스윙 점수 ${d.score ?? '-'}</span></h2>
      <div class="ai-result"><span class="ai-badge">AI</span><div><b>${SL.esc(d.headline)}</b><p>${SL.esc(rec.club || '')} · ${rec.view === 'front' ? '정면' : '측면'} · ${SL.fmtDate(rec.createdAt)}</p></div>${spark}</div>

      <h2 class="sec">원인 분석</h2>
      <div class="card" style="padding:4px 16px">${d.issues.length ? d.issues.map(i => `
        <div class="cause"><span class="ci ${i.severity >= 2 ? 'bad' : 'warn'}">${SL.icon(i.severity >= 2 ? 'warn' : 'target')}</span>
          <div style="flex:1"><b>${SL.esc(i.title)}</b><p>${SL.esc(i.detail)}</p>
          <button class="badge" data-jump="${i.phase}" style="margin-top:6px">${SL.phaseName(i.phase)} 장면 보기 ›</button></div></div>`).join('')
        : `<div class="cause"><span class="ci">${SL.icon('check')}</span><div><b>뚜렷한 문제가 보이지 않아요</b><p>측정한 항목이 모두 기준 범위 안이에요.</p></div></div>`}</div>

      <h2 class="sec">구간별 진단</h2>
      <div class="card phase-list" style="padding:4px 16px">${SL.PHASES.map(p => {
        const n = d.notes[p.key] || { status: 'na', text: '-' };
        return `<div class="ph"><span class="dot ${n.status === 'good' ? '' : n.status}"></span><span class="n">${p.name}</span><span class="d">${SL.esc(n.text)}</span></div>`;
      }).join('')}</div>

      <h2 class="sec">평소 미스샷 <span class="tiny muted">선택하면 드릴에 반영돼요</span></h2>
      <div class="chips" id="miss">${Object.entries(SL.analyzer.MISS).map(([k, v]) => `<button class="chip outline ${userMiss.has(k) ? 'on' : ''}" data-m="${k}">${v}</button>`).join('')}</div>

      <h2 class="sec">추천 드릴</h2>
      <div id="drills"></div>
      <a class="btn light block" id="more" target="_blank" rel="noopener" style="margin-top:14px">${SL.icon('youtube')}관련 영상 더보기</a>
      <p class="tiny dim" style="margin-top:10px;text-align:center">관절 인식 기반 자동 진단으로, 촬영 각도·화질에 따라 결과가 달라질 수 있어요.</p>`;

    const renderDrills = () => {
      const list = SL.drills.recommend(d, [...userMiss]);
      SL.$('#drills', view).innerHTML = list.slice(0, 6).map(SL.drills.card).join('');
      SL.yt.enhance(SL.$('#drills', view));
      const kw = [...new Set([...(d.issues.slice(0, 2).map(i => (SL.drills.BY_ISSUE[i.id] || [])[0]?.q).filter(Boolean)), ...[...userMiss].map(m => `골프 ${SL.analyzer.MISS[m]} 교정`)])];
      SL.$('#more', view).href = SL.drills.yt(kw[0] || '골프 스윙 드릴');
    };
    renderDrills();
    SL.$('#miss', view).addEventListener('click', async e => {
      const b = e.target.closest('[data-m]'); if (!b) return;
      const m = b.dataset.m; userMiss.has(m) ? userMiss.delete(m) : userMiss.add(m);
      b.classList.toggle('on', userMiss.has(m));
      rec.userMiss = [...userMiss]; await SL.db.put(rec); renderDrills();
    });
    view.addEventListener('click', e => {
      const b = e.target.closest('[data-jump]'); if (!b) return;
      SL.go('analyze', { id: rec.id, p: b.dataset.jump });
    });
  });

  function missPicker(root, _d, hand) {
    const sel = new Set();
    root.innerHTML = `<div class="chips">${Object.entries(SL.analyzer.MISS).map(([k, v]) => `<button class="chip outline" data-m="${k}">${v}</button>`).join('')}</div><div class="list" style="margin-top:8px"></div>`;
    root.addEventListener('click', e => {
      const b = e.target.closest('[data-m]'); if (!b) return;
      sel.has(b.dataset.m) ? sel.delete(b.dataset.m) : sel.add(b.dataset.m); b.classList.toggle('on');
      SL.$('.list', root).innerHTML = sel.size ? SL.drills.recommend(null, [...sel]).map(SL.drills.card).join('') : '';
      SL.yt.enhance(root);
    });
  }

  // 드릴 라이브러리 (검색)
  SL.route('drills', (view) => {
    const all = SL.drills.all();
    view.innerHTML = `${SL.pageHead('드릴')}
      <div class="card row" style="padding:0 14px;height:48px">${SL.icon('search').replace('<svg', '<svg width="18" height="18" style="color:#9AA3AE"')}
        <input id="q" placeholder="슬라이스, 템포, 체중이동…" style="flex:1;background:none;border:0;outline:0;height:100%;font-size:15px"></div>
      <div id="list" style="margin-top:6px"></div>`;
    const draw = (q = '') => {
      const s = q.trim();
      const res = all.filter(d => !s || (d.title + d.desc + d.q + (SL.analyzer.MISS[d.cat] || '')).includes(s));
      SL.$('#list', view).innerHTML = res.length ? res.slice(0, 12).map(SL.drills.card).join('') : `<div class="empty">검색 결과가 없어요<br><a class="btn sm" style="margin-top:10px" target="_blank" href="${SL.drills.yt('골프 ' + s + ' 드릴')}">유튜브에서 "${SL.esc(s)}" 찾기</a></div>`;
    };
    let tm; SL.$('#q', view).addEventListener('input', e => { draw(e.target.value); clearTimeout(tm); tm = setTimeout(() => SL.yt.enhance(SL.$('#list', view)), 600); });
    draw(); SL.yt.enhance(SL.$('#list', view));
  });
})(window.SL);
