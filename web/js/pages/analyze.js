// 스윙 분석: 업로드 → 자동 분석 → 플레이어 + 템포
(function (SL) {
  const progressOverlay = (title) => {
    const o = SL.h(`<div class="overlay"><div class="box"><div class="spinner"></div>
      <div style="margin-top:18px;font-weight:700;font-size:17px" class="ot">${title}</div>
      <div class="bar"><i></i></div><div class="small muted op">준비 중…</div></div></div>`);
    document.body.appendChild(o);
    return {
      set(p, msg) { SL.$('.bar i', o).style.width = Math.round(p * 100) + '%'; if (msg) SL.$('.op', o).textContent = msg; },
      close() { o.remove(); },
    };
  };

  // 레코드 분석 실행 (업로드 직후 / 연습모드 클립 재분석 공용)
  SL.runAnalysis = async (rec) => {
    const ov = progressOverlay('스윙을 분석하고 있어요');
    const v = document.createElement('video');
    v.style.cssText = 'position:fixed;left:-9999px;width:2px;height:2px'; document.body.appendChild(v);
    const url = URL.createObjectURL(rec.blob);
    try {
      await SL.loadVideo(v, url);
      if (v.duration > 15) SL.toast('앞 15초까지만 분석해요. 스윙 구간만 잘라서 올리면 더 정확해요', 3500);
      ov.set(0.02, 'AI 자세 인식 모델 불러오는 중…');
      await SL.pose.get('full');
      await SL.analyzer.analyzeRecord(rec, v, p => ov.set(0.05 + p * 0.9, `프레임 분석 ${Math.round(p * 100)}%`));
      ov.set(0.97, '진단 정리 중…');
      const tt = rec.phases ? rec.phases.t.top : v.duration / 2;
      await SL.seek(v, tt); rec.thumb = SL.thumbOf(v) || rec.thumb;
      if (!rec.phases) SL.toast('스윙 구간을 찾지 못했어요 — 전신이 보이게 다시 촬영해 보세요', 3500);
    } catch (e) {
      console.error(e);
      if (!rec.thumb) { try { await SL.seek(v, Math.min(1, v.duration / 2)); rec.thumb = SL.thumbOf(v); } catch (_) {} }
      SL.toast('AI 모델을 불러오지 못했어요(인터넷 확인). 영상은 저장됐어요', 3500);
    } finally {
      await SL.db.put(rec);
      ov.close(); URL.revokeObjectURL(url); v.remove();
    }
    return rec;
  };

  function uploadView(view) {
    const st = { view: 'side', club: '드라이버', slow: 1 };
    view.innerHTML = `${SL.pageHead('스윙 업로드')}
      <label class="drop" for="file">${SL.icon('upload')}<b>스윙 영상 선택</b>
        <div class="small muted" style="margin-top:6px">어드레스~피니시가 담긴 3~10초 영상이 가장 좋아요</div></label>
      <input id="file" type="file" accept="video/*" hidden>
      <div class="field"><label class="lb">촬영 방향</label>
        <div class="seg" id="view"><button data-v="side" class="on">측면 (후방, DTL)</button><button data-v="front">정면 (Face-on)</button></div></div>
      <div class="field"><label class="lb">클럽</label><div class="chips" id="club">${SL.CLUBS.map((c, i) => `<button class="chip ${i ? '' : 'on'}" data-c="${c}">${c}</button>`).join('')}</div></div>
      <div class="field"><label class="lb">영상 종류 (템포 계산 보정)</label>
        <div class="seg" id="slow"><button data-s="1" class="on">일반 속도</button><button data-s="4">슬로모 120fps</button><button data-s="8">슬로모 240fps</button></div></div>
      <div class="card" style="margin-top:20px">
        <div style="font-weight:700;margin-bottom:6px">촬영 팁</div>
        <div class="tip"><i>1</i>삼각대로 고정 — 카메라가 움직이면 궤적이 틀어져요</div>
        <div class="tip"><i>2</i>머리부터 발끝, 클럽 끝까지 화면 안에</div>
        <div class="tip"><i>3</i>측면은 손 높이, 타겟 라인 뒤에서 촬영</div>
      </div>
      <a class="btn ghost block" style="margin-top:12px" href="#/compare">${SL.icon('compare')}내 스윙 vs 프로 스윙 비교하기</a>`;
    const segBind = (id, key, attr, num) => SL.$('#' + id, view).addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      st[key] = num ? +b.dataset[attr] : b.dataset[attr];
      SL.$$('button', b.parentElement).forEach(x => x.classList.toggle('on', x === b));
    });
    segBind('view', 'view', 'v'); segBind('club', 'club', 'c'); segBind('slow', 'slow', 's', true);
    SL.$('#file', view).addEventListener('change', async (e) => {
      const f = e.target.files[0]; if (!f) return;
      const rec = { id: SL.uid(), createdAt: Date.now(), source: 'upload', title: f.name, blob: f, view: st.view, club: st.club, slow: st.slow, hand: SL.settings.hand };
      await SL.runAnalysis(rec);
      SL.go('analyze', { id: rec.id });
    });
  }

  SL.route('analyze', async (view, params) => {
    if (!params.id) { uploadView(view); return; }
    const rec = await SL.db.get(params.id);
    if (!rec) { view.innerHTML = SL.pageHead('스윙분석') + '<div class="empty">기록을 찾을 수 없어요</div>'; return; }
    const url = SL.blobUrl(rec);
    view.innerHTML = SL.pageHead('스윙분석', { right: `<button class="icon-btn" id="del">${SL.icon('trash')}</button>` });
    const player = new SL.SwingPlayer(view, rec, url);
    if (params.p && rec.phases) player.ready.then(() => player.jump(params.p));
    const t = rec.tempo, d = rec.diagnosis;
    const info = SL.h(`<div>
      <div class="row small muted" style="margin-top:16px;gap:6px;flex-wrap:wrap">
        <span class="badge">${SL.esc(rec.club || '-')}</span><span class="badge">${rec.view === 'front' ? '정면' : '측면'}</span>
        ${rec.source === 'practice' ? '<span class="badge">연습모드</span>' : ''}<span>${SL.fmtDate(rec.createdAt)}</span></div>
      ${t ? `<div class="metrics">
          <div class="metric hl"><span>스윙 템포</span><b>${t.ratio}<small>: 1</small></b></div>
          <div class="metric"><span>백스윙</span><b>${t.back}<small>s</small></b></div>
          <div class="metric"><span>다운스윙</span><b>${t.down}<small>s</small></b></div></div>
        <div class="tempo-bar"><i style="width:${t.back / (t.back + t.down) * 100}%;background:#40C8E0"></i><i style="width:${t.down / (t.back + t.down) * 100}%;background:#FF453A"></i></div>
        <div class="tiny muted" style="margin-top:6px">투어 프로 평균 약 3:1 (백스윙 0.7~0.9초 / 다운스윙 0.25~0.3초)${rec.slow > 1 ? ` · 슬로모 ×${rec.slow} 보정됨` : ''}</div>` : ''}
      ${d ? `<a class="ai-result" href="#/report?id=${rec.id}" style="margin-top:16px">
          <span class="ai-badge">AI</span><div style="flex:1"><b>${SL.esc(d.headline)}</b><p>${SL.esc(d.sub)} · 진단과 드릴 보기 ›</p></div></a>`
        : `<div class="card" style="margin-top:16px"><b>아직 분석하지 않은 영상이에요</b><p class="small muted" style="margin-top:4px">AI가 관절을 인식해 구간·템포·궤적을 계산해요</p>
           <button class="btn primary block" id="run" style="margin-top:12px">${SL.icon('ai')}정밀 분석 실행</button></div>`}
      <div class="grid2" style="margin-top:12px">
        <a class="btn" href="#/compare?a=${rec.id}">${SL.icon('compare')}비교하기</a>
        <a class="btn primary" href="#/report?id=${rec.id}" ${d ? '' : 'style="pointer-events:none;opacity:.4"'}>${SL.icon('drill')}AI 진단 & 드릴</a>
      </div></div>`);
    view.appendChild(info);
    const run = SL.$('#run', info);
    if (run) run.onclick = async () => { player.destroy(); await SL.runAnalysis(rec); SL.render(); };
    SL.$('#del', view).onclick = async () => {
      if (!confirm('이 스윙 기록을 삭제할까요?')) return;
      await SL.db.del(rec.id); SL.toast('삭제했어요'); SL.go('records');
    };
    return () => { player.destroy(); URL.revokeObjectURL(url); };
  });
})(window.SL);
