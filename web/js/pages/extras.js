// 추후 기능 페이지(샷데이터·대회·스토어) + 더보기(설정)
(function (SL) {
  SL.route('shotdata', (view) => {
    const items = [['클럽 헤드스피드', '임팩트 직전 클럽헤드 이동 속도 추정 (고속 촬영 필요)'], ['스윙 템포', '백스윙:다운스윙 비율 — 현재 구현됨'], ['스윙 궤도', '인-아웃 / 아웃-인 경로 각도'], ['어택 앵글', '임팩트 직전 헤드의 상하 진입각'], ['구질 추정', '궤도 + 페이스 방향으로 페이드/드로우 예측'], ['볼 출발 방향', '임팩트 직후 공 이동 방향 (정면 촬영)']];
    view.innerHTML = `${SL.pageHead('샷 데이터')}
      <div class="soon-hero"><span class="tag">준비중</span><h2>휴대폰 카메라로 샷 데이터 측정</h2>
        <p>트랙맨·GC 같은 장비 없이, 슬로모션 영상에서 측정 가능한 항목부터 단계적으로 추가할 예정이에요.</p></div>
      <h2 class="sec">측정 예정 항목</h2>
      <div class="card" style="padding:4px 16px">${items.map(([a, b], i) => `<div class="cause"><span class="ci ${i === 1 ? '' : 'warn'}">${SL.icon(i === 1 ? 'check' : 'shot')}</span><div><b>${a}</b><p>${b}</p></div></div>`).join('')}</div>`;
  });

  SL.route('tour', (view) => {
    const tours = ['PGA', 'LPGA', 'KPGA', 'KLPGA'];
    view.innerHTML = `${SL.pageHead('대회')}
      <div class="seg" id="tours">${tours.map((t, i) => `<button class="${i ? '' : 'on'}" data-t="${t}">${t}</button>`).join('')}</div>
      <div class="soon-hero" style="margin-top:14px"><span class="tag">준비중</span><h2 id="tt">PGA 투어</h2><p>대회 일정 · 실시간 리더보드 · 선수 정보를 한곳에서 볼 수 있게 연동할 예정이에요.</p></div>
      <h2 class="sec">이번 주 대회</h2>
      <div class="card"><div class="skel" style="height:18px;width:60%"></div><div class="skel" style="height:12px;width:40%;margin-top:10px"></div></div>
      <h2 class="sec">리더보드</h2>
      <div class="card" style="padding:4px 16px">${[1, 2, 3, 4, 5].map(i => `<div class="lb-row"><b style="width:22px">${i}</b><div class="skel" style="height:14px;flex:1"></div><div class="skel" style="height:14px;width:40px"></div></div>`).join('')}</div>
      <h2 class="sec">선수 정보</h2>
      <div class="grid3">${[1, 2, 3].map(() => `<div class="card"><div class="skel" style="width:48px;height:48px;border-radius:50%;margin:0 auto"></div><div class="skel" style="height:12px;margin-top:10px"></div></div>`).join('')}</div>
      <p class="tiny dim" style="margin-top:14px;text-align:center">데이터 연동 전 화면 구성입니다.</p>`;
    SL.$('#tours', view).addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; SL.$$('#tours button', view).forEach(x => x.classList.toggle('on', x === b)); SL.$('#tt', view).textContent = b.dataset.t + ' 투어'; });
  });

  SL.route('store', (view) => {
    const cats = [['shirt', '골프웨어'], ['club', '클럽'], ['ball', '볼'], ['bag', '골프백']];
    view.innerHTML = `${SL.pageHead('스토어')}
      <div class="quick" style="margin-top:0">${cats.map(([i, t]) => `<a href="javascript:void 0" data-c="${t}"><span class="qi">${SL.icon(i)}</span>${t}</a>`).join('')}</div>
      <div class="soon-hero" style="margin-top:18px"><span class="tag">준비중</span><h2>브랜드별 골프용품 모아보기</h2><p>내 스윙 진단 결과에 맞는 용품(예: 슬라이스 방지 드라이버)을 추천하는 기능으로 확장할 예정이에요.</p></div>
      <h2 class="sec" id="ct">추천 상품</h2>
      <div class="grid2">${[1, 2, 3, 4].map(() => `<div class="prod"><div class="pi skel" style="border-radius:0"></div><div class="pt"><div class="skel" style="height:12px;width:70%"></div><div class="skel" style="height:12px;width:40%;margin-top:8px"></div></div></div>`).join('')}</div>`;
    view.addEventListener('click', e => { const a = e.target.closest('[data-c]'); if (a) { SL.$('#ct', view).textContent = a.dataset.c; SL.toast(`${a.dataset.c} 상품은 준비 중이에요`); } });
  });

  SL.route('more', async (view) => {
    const s = SL.settings;
    view.innerHTML = `<header class="pagehead left" style="margin:0 0 8px"><h1 style="font-size:22px">MY</h1></header>
      <div class="card">
        <div class="list-row"><span>이름</span><input id="nm" value="${SL.esc(s.name)}" style="background:none;border:0;text-align:right;color:var(--sub);outline:0;width:50%"></div>
        <div class="list-row"><span>스윙 방향</span><div class="seg" id="hand" style="width:170px"><button data-h="right" class="${s.hand === 'right' ? 'on' : ''}">오른손</button><button data-h="left" class="${s.hand === 'left' ? 'on' : ''}">왼손</button></div></div>
        <div class="list-row"><span>분석 프레임</span><div class="seg" id="fps" style="width:170px"><button data-f="30" class="${s.analysisFps == 30 ? 'on' : ''}">30fps</button><button data-f="60" class="${s.analysisFps == 60 ? 'on' : ''}">60fps</button></div></div>
      </div>
      <p class="tiny dim" style="margin:8px 4px 0">60fps는 더 정밀하지만 분석 시간이 2배 걸려요.</p>
      <h2 class="sec">유튜브 연결</h2>
      <div class="card">
        <div class="small muted" style="margin-bottom:8px">YouTube Data API 키를 넣으면 추천 드릴에 실제 영상 썸네일·제목이 표시돼요. 키는 이 기기에만 저장돼요.</div>
        <input class="input" id="ytk" autocomplete="off" spellcheck="false" placeholder="AIza로 시작하는 키" value="${SL.esc(s.ytKey || '')}">
        <div class="grid2" style="margin-top:10px"><button class="btn sm" id="ytSave">저장</button><button class="btn sm primary" id="ytTest">연결 테스트</button></div>
        <div class="tiny muted" id="ytMsg" style="margin-top:8px"></div>
      </div>
      <div class="card" style="margin-top:14px">
        <a class="list-row" href="#/shotdata"><span>샷 데이터 (준비중)</span><span class="r">${SL.icon('chev').replace('<svg', '<svg width="16" height="16"')}</span></a>
        <button class="list-row" id="homePhoto" style="width:100%">
          <span>홈 사진 바꾸기</span><span class="r">${SL.icon('chev').replace('<svg', '<svg width="16" height="16"')}</span></button>
        <a class="list-row" href="#/tour"><span>대회 정보 (준비중)</span><span class="r">${SL.icon('chev').replace('<svg', '<svg width="16" height="16"')}</span></a>
        <a class="list-row" href="#/store"><span>스토어 (준비중)</span><span class="r">${SL.icon('chev').replace('<svg', '<svg width="16" height="16"')}</span></a>
        <a class="list-row" href="#/drills"><span>드릴 라이브러리</span><span class="r">${SL.icon('chev').replace('<svg', '<svg width="16" height="16"')}</span></a>
        <div class="list-row"><span>저장 공간</span><span class="r" id="usage">-</span></div>
        <button class="list-row" id="wipe" style="width:100%;color:var(--red)">모든 기록 삭제</button>
      </div>
      <p class="tiny dim" style="margin-top:16px;text-align:center">SwingLab v0.1 · 영상은 이 기기 브라우저에만 저장돼요</p>`;
    SL.$('#nm', view).addEventListener('change', e => { s.name = e.target.value.trim() || '사용자'; SL.saveSettings(); SL.toast('저장했어요'); });
    SL.$('#hand', view).addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; s.hand = b.dataset.h; SL.saveSettings(); SL.$$('#hand button', view).forEach(x => x.classList.toggle('on', x === b)); });
    SL.$('#fps', view).addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; s.analysisFps = +b.dataset.f; SL.saveSettings(); SL.$$('#fps button', view).forEach(x => x.classList.toggle('on', x === b)); });
    const ytSave = () => { s.ytKey = SL.$('#ytk', view).value.trim(); SL.saveSettings(); SL.yt.clearCache(); };
    SL.$('#ytSave', view).onclick = () => { ytSave(); SL.toast(s.ytKey ? '키를 저장했어요' : '키를 지웠어요'); };
    SL.$('#ytTest', view).onclick = async () => {
      ytSave(); const m = SL.$('#ytMsg', view);
      if (!s.ytKey) { m.textContent = '키를 먼저 입력해 주세요'; return; }
      m.textContent = '확인 중…';
      try { const v = await SL.yt.search('골프 스윙 드릴', { force: true }); m.textContent = v ? `연결 성공 — "${v.title}"` : '연결됐지만 결과가 없어요'; }
      catch (e) { m.textContent = '실패: ' + e.message; }
    };
    SL.$('#homePhoto', view).onclick = () => SL.editHomePhoto();
    SL.$('#wipe', view).onclick = async () => { if (confirm('저장된 모든 스윙 영상과 분석을 삭제할까요? 되돌릴 수 없어요.')) { await SL.db.clear(); SL.toast('모두 삭제했어요'); } };
    if (navigator.storage && navigator.storage.estimate) navigator.storage.estimate().then(e => SL.$('#usage', view).textContent = `${(e.usage / 1e6).toFixed(1)}MB 사용`).catch(() => {});
  });
})(window.SL);
