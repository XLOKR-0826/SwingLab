// 홈 화면
(function (SL) {
  const golferSVG = `<svg class="golfer" viewBox="0 0 150 160" fill="none" stroke="#C6F432" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="70" cy="30" r="11" fill="#C6F432" fill-opacity=".12"/>
    <path d="M70 42 74 82"/><path d="M72 52 96 40 118 14"/><path d="M72 54 92 46"/>
    <path d="M74 82 60 118 52 152"/><path d="M74 82 90 116 100 152"/>
    <path d="M118 14 131 6" stroke="#fff" stroke-width="2"/>
    <path d="M18 120C30 70 80 20 128 8" stroke="#fff" stroke-opacity=".25" stroke-width="2" stroke-dasharray="3 6"/>
    <circle cx="36" cy="153" r="3.5" fill="#fff" stroke="none"/>
  </svg>`;

  const QUICK = [
    { i: 'upload', t: '업로드', href: '#/analyze', hl: true },
    { i: 'camera', t: '연습모드', href: '#/practice' },
    { i: 'chart', t: '스윙분석', href: '#/records' },
    { i: 'compare', t: '비교', href: '#/compare' },
    { i: 'ai', t: 'AI 진단', href: '#/report' },
    { i: 'drill', t: '드릴', href: '#/drills' },
    { i: 'trophy', t: '대회', href: '#/tour' },
    { i: 'cart', t: '스토어', href: '#/store' },
  ];

  SL.recCard = (r) => `<a class="rec" href="#/analyze?id=${r.id}">
      <div class="th ${r.thumb ? '' : 'ph'}" style="${r.thumb ? `background-image:url(${r.thumb})` : ''}">${r.thumb ? '' : SL.icon('club')}</div>
      <div class="meta"><b>${SL.esc(r.club || '스윙')} ${r.source === 'practice' ? '<span class="badge">연습</span>' : ''}</b>
        <span>${SL.fmtDate(r.createdAt)}${r.tempo && r.tempo.ratio ? ` · 템포 ${r.tempo.ratio}:1` : ''}</span><br>
        <span class="${r.diagnosis && r.diagnosis.issues.length ? '' : 'dim'}">${r.diagnosis ? SL.esc(r.diagnosis.headline) : '분석 전'}</span></div>
      <span class="go">${SL.icon('play')}</span></a>`;

  SL.route('home', async (view) => {
    const list = await SL.db.all();
    const tempos = list.filter(r => r.tempo && r.tempo.ratio).map(r => r.tempo.ratio);
    const avg = tempos.length ? (tempos.reduce((a, b) => a + b, 0) / tempos.length).toFixed(1) : '-';
    view.innerHTML = `
      <div class="topbar">${SL.logo()}
        <div class="row"><a class="icon-btn" href="#/drills">${SL.icon('search')}</a><button class="icon-btn" id="bell">${SL.icon('bell')}</button></div>
      </div>
      <a class="hero" href="#/more" style="display:block">
        <div class="who">${SL.esc(SL.settings.name)}님 ${SL.icon('chev')}</div>
        <div class="small muted" style="margin-top:4px">오늘도 한 스윙씩 좋아지는 중</div>
        <div class="hero-stats">
          <div><b>${list.length}</b><span>스윙 기록</span></div>
          <div><b>${avg}${avg !== '-' ? '<small style="font-size:13px">:1</small>' : ''}</b><span>평균 템포</span></div>
        </div>
        ${golferSVG}
      </a>
      <div class="quick">${QUICK.map(q => `<a href="${q.href}"><span class="qi ${q.hl ? 'hl' : ''}">${SL.icon(q.i)}</span>${q.t}</a>`).join('')}</div>
      <h2 class="sec">최근 분석 <a href="#/records">더보기 ›</a></h2>
      <div id="recent">${list.length ? list.slice(0, 3).map(SL.recCard).join('') : `
        <div class="card empty">${SL.icon('upload')}첫 스윙 영상을 올려 보세요<br><a class="btn primary sm" style="margin-top:14px" href="#/analyze">영상 업로드</a></div>`}</div>
      <h2 class="sec">곧 추가될 기능</h2>
      <div class="grid3">
        <a class="card" href="#/shotdata"><span class="badge acc">준비중</span><div style="margin-top:8px;font-weight:700;font-size:14px">샷데이터</div><div class="tiny muted">카메라로 측정</div></a>
        <a class="card" href="#/tour"><span class="badge acc">준비중</span><div style="margin-top:8px;font-weight:700;font-size:14px">대회정보</div><div class="tiny muted">PGA·KPGA 등</div></a>
        <a class="card" href="#/store"><span class="badge acc">준비중</span><div style="margin-top:8px;font-weight:700;font-size:14px">스토어</div><div class="tiny muted">용품 모아보기</div></a>
      </div>`;
    SL.$('#bell', view).onclick = () => SL.toast('새 알림이 없어요');
  });
})(window.SL);
