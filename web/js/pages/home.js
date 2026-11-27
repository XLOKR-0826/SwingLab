// 홈 화면
(function (SL) {
  // 홈 카드 오른쪽 그림: 피니시 자세 골퍼 일러스트 (내 사진으로 바꿀 수 있음)
  const golferSVG = `<svg viewBox="0 0 180 200" fill="none">
    <defs>
      <radialGradient id="gGlow" cx="60%" cy="45%" r="60%"><stop offset="0" stop-color="#C6F432" stop-opacity=".22"/><stop offset="1" stop-color="#C6F432" stop-opacity="0"/></radialGradient>
      <linearGradient id="gShirt" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F7F9FB"/><stop offset="1" stop-color="#BFC7D1"/></linearGradient>
      <linearGradient id="gPants" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2D4F8A"/><stop offset="1" stop-color="#172B4F"/></linearGradient>
      <linearGradient id="gSkin" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F2CDA8"/><stop offset="1" stop-color="#C98F66"/></linearGradient>
      <linearGradient id="gSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C6F432" stop-opacity="0"/><stop offset="1" stop-color="#C6F432" stop-opacity=".08"/></linearGradient>
    </defs>
    <circle cx="112" cy="92" r="92" fill="url(#gGlow)"/>
    <path d="M8 170C40 80 110 26 178 14" stroke="#C6F432" stroke-opacity=".35" stroke-width="1.6" stroke-dasharray="3 6"/>
    <!-- 하체 -->
    <path d="M86 146 78 200h32l4-38 6 38h34l-14-54Z" fill="url(#gPants)"/>
    <path d="M114 160l2 40" stroke="#0E1B33" stroke-opacity=".5" stroke-width="1.2"/>
    <rect x="85" y="139" width="56" height="10" rx="3" fill="#1B1F26"/>
    <rect x="108" y="140" width="9" height="8" rx="1.5" fill="#9AA3AE"/>
    <!-- 뒤쪽 팔 (리드 암) -->
    <path d="M90 76C78 62 70 44 74 28" stroke="url(#gSkin)" stroke-width="10" stroke-linecap="round"/>
    <path d="M91 78C86 72 83 67 81 62" stroke="#DDE3EA" stroke-width="15" stroke-linecap="round"/>
    <!-- 몸통 -->
    <path d="M84 72C96 64 124 62 140 70L146 100 138 102 141 142H86L90 102 80 98Z" fill="url(#gShirt)"/>
    <path d="M108 92C116 104 118 122 116 140" stroke="#AEB7C2" stroke-width="1.2" stroke-opacity=".7"/>
    <path d="M100 68 112 82 124 67" fill="#E6EBF0" stroke="#AEB7C2" stroke-width="1"/>
    <!-- 목·머리 -->
    <path d="M105 56h14v14h-14Z" fill="url(#gSkin)"/>
    <ellipse cx="114" cy="44" rx="13" ry="14" fill="url(#gSkin)"/>
    <ellipse cx="102.5" cy="46" rx="2.6" ry="4.2" fill="#D9A47C"/>
    <path d="M101 38C101 24 112 22 116 22 126 22 129 30 129 37Z" fill="#F4F6F8"/>
    <path d="M124 34C134 32 141 35 143 39 135 40 128 39 123 38Z" fill="#DCE1E7"/>
    <path d="M128 50q4 1 6-1" stroke="#9C6B4C" stroke-width="1.2" stroke-linecap="round"/>
    <!-- 앞쪽 팔 (트레일 암) -->
    <path d="M136 76C118 66 92 50 78 30" stroke="url(#gSkin)" stroke-width="10" stroke-linecap="round"/>
    <path d="M138 78C133 74 128 71 123 68" stroke="#E9EDF1" stroke-width="15" stroke-linecap="round"/>
    <!-- 손·클럽 -->
    <circle cx="76" cy="28" r="7" fill="#F7F9FB"/>
    <path d="M73 27 54 19" stroke="#1B1F26" stroke-width="5" stroke-linecap="round"/>
    <path d="M56 20 20 6" stroke="#C9CED6" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M22 3 7 1C3 4 3 9 7 11L21 10Z" fill="#B8BEC7" stroke="#8A929C" stroke-width=".8"/>
  </svg>`;

  // 피니시 자세 관절 좌표 (viewBox 180x200) — 실루엣·관절선 스타일 공용
  const J = { head: [116, 34], neck: [113, 50], lSh: [100, 60], rSh: [126, 62], lEl: [84, 46], rEl: [104, 46], hands: [84, 24],
    hip: [108, 114], lHip: [100, 114], rHip: [116, 116], lKn: [96, 154], rKn: [124, 150], lAn: [94, 194], rAn: [134, 182], rToe: [140, 198], club: [30, 6] };
  const ln = (a, b, w, c, extra = '') => `<path d="M${a[0]} ${a[1]}L${b[0]} ${b[1]}" stroke="${c}" stroke-width="${w}" stroke-linecap="round" ${extra}/>`;
  const pl = (pts, w, c, extra = '') => `<path d="M${pts.map(p => p.join(' ')).join('L')}" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;

  const silhouetteSVG = `<svg viewBox="0 0 180 200" fill="none">
    <defs><filter id="sGlow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="6"/></filter>
      <linearGradient id="sFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E4FF7A"/><stop offset="1" stop-color="#9BD11A"/></linearGradient></defs>
    <path d="M6 176C36 86 104 26 178 12" stroke="#C6F432" stroke-opacity=".25" stroke-width="1.4" stroke-dasharray="2 6"/>
    <g opacity=".45" filter="url(#sGlow)">${pl([J.lAn, J.lKn, J.lHip], 16, '#C6F432')}${pl([J.rToe, J.rAn, J.rKn, J.rHip], 15, '#C6F432')}${ln(J.neck, J.hip, 28, '#C6F432')}</g>
    <g>
      ${ln(J.hands, J.club, 2.6, '#E4FF7A')}<path d="M33 3 20 1C16 4 17 9 20 10L33 9Z" fill="#E4FF7A"/>
      ${pl([J.lAn, J.lKn, J.lHip], 15, 'url(#sFill)')}<path d="M86 192h16l2 7H82Z" fill="#9BD11A"/>
      ${pl([J.rToe, J.rAn, J.rKn, J.rHip], 14, 'url(#sFill)')}
      <path d="M93 61C102 51 125 50 135 61 133 80 129 99 127 119 117 122 106 122 97 119 99 98 98 79 93 61Z" fill="url(#sFill)"/>
      ${pl([J.lSh, J.lEl, J.hands], 10, 'url(#sFill)')}${pl([J.rSh, J.rEl, J.hands], 10, 'url(#sFill)')}
      ${ln([112, 44], J.neck, 10, '#C6F432')}
      <circle cx="${J.head[0]}" cy="${J.head[1]}" r="12" fill="#C6F432"/>
      <path d="M104 30C104 19 114 18 118 18 127 18 130 25 130 30Z" fill="#E4FF7A"/><path d="M126 28C134 27 140 30 141 33 134 34 129 33 125 32Z" fill="#E4FF7A"/>
    </g>
  </svg>`;

  const skeletonSVG = `<svg viewBox="0 0 180 200" fill="none">
    <defs><filter id="kGlow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.4"/></filter></defs>
    <rect x="74" y="14" width="86" height="184" rx="10" stroke="#C6F432" stroke-opacity=".28" stroke-dasharray="4 5"/>
    <text x="128" y="26" fill="#C6F432" fill-opacity=".7" font-size="7" font-weight="700" font-family="sans-serif">AI POSE 0.98</text>
    <path d="M30 6C60 40 70 120 50 196" stroke="#40C8E0" stroke-opacity=".55" stroke-width="2.4" stroke-dasharray="1 0"/>
    <path d="M30 6C10 60 30 130 70 170 100 196 150 186 176 160" stroke="#FF453A" stroke-opacity=".65" stroke-width="2.4"/>
    <g filter="url(#kGlow)" opacity=".8">${[[J.lSh, J.rSh], [J.lSh, J.lEl], [J.lEl, J.hands], [J.rSh, J.rEl], [J.rEl, J.hands], [J.lSh, J.lHip], [J.rSh, J.rHip], [J.lHip, J.rHip], [J.lHip, J.lKn], [J.lKn, J.lAn], [J.rHip, J.rKn], [J.rKn, J.rAn], [J.rAn, J.rToe]].map(([a, b]) => ln(a, b, 3, '#C6F432')).join('')}</g>
    ${[[J.lSh, J.rSh], [J.lSh, J.lEl], [J.lEl, J.hands], [J.rSh, J.rEl], [J.rEl, J.hands], [J.lSh, J.lHip], [J.rSh, J.rHip], [J.lHip, J.rHip], [J.lHip, J.lKn], [J.lKn, J.lAn], [J.rHip, J.rKn], [J.rKn, J.rAn], [J.rAn, J.rToe]].map(([a, b]) => ln(a, b, 2.4, '#C6F432')).join('')}
    ${ln(J.hands, J.club, 1.6, '#FFFFFF', 'stroke-opacity=".8"')}
    <circle cx="${J.head[0]}" cy="${J.head[1]}" r="11" stroke="#C6F432" stroke-width="2.2"/>
    ${[J.lSh, J.rSh, J.lEl, J.rEl, J.hands, J.lHip, J.rHip, J.lKn, J.rKn, J.lAn, J.rAn, J.rToe].map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="3.4" fill="#fff"/>`).join('')}
    <circle cx="${J.club[0]}" cy="${J.club[1]}" r="4" fill="#FF453A"/>
    <g font-size="6.5" font-family="sans-serif" font-weight="600" fill="#fff" fill-opacity=".75">
      <text x="128" y="72">어깨 회전</text><text x="135" y="150">무릎</text><text x="44" y="30" fill="#FF453A">클럽헤드</text></g>
  </svg>`;

  const logoSVG = `<svg viewBox="0 0 180 200" fill="none">
    <defs><radialGradient id="lGlow" cx="55%" cy="48%" r="55%"><stop offset="0" stop-color="#C6F432" stop-opacity=".28"/><stop offset="1" stop-color="#C6F432" stop-opacity="0"/></radialGradient></defs>
    <circle cx="104" cy="96" r="90" fill="url(#lGlow)"/>
    ${[0, 1, 2, 3].map(i => `<path d="M${-10 + i * 6} ${190 - i * 14}C${50 + i * 4} ${120 - i * 12} ${110 + i * 6} ${70 - i * 10} ${190} ${44 - i * 12}" stroke="#C6F432" stroke-opacity="${0.12 + i * 0.05}" stroke-width="${0.8 + i * 0.3}"/>`).join('')}
    <image href="img/logo-mark.png" x="22" y="48" width="170" height="80" preserveAspectRatio="xMidYMid meet"/>
    <circle cx="170" cy="154" r="3" fill="#fff" fill-opacity=".6"/><circle cx="150" cy="172" r="1.6" fill="#fff" fill-opacity=".4"/>
  </svg>`;

  SL.HERO_STYLES = [
    { key: 'silhouette', name: '라임 실루엣', svg: () => silhouetteSVG },
    { key: 'skeleton', name: 'AI 관절선', svg: () => skeletonSVG },
    { key: 'logo', name: '로고 그래픽', svg: () => logoSVG },
    { key: 'illust', name: '일러스트', svg: () => golferSVG },
  ];
  const heroSVG = () => (SL.HERO_STYLES.find(h => h.key === SL.settings.heroArt) || SL.HERO_STYLES[0]).svg();

  const PHOTO_KEY = 'sl.photo';
  const getPhoto = () => { try { return localStorage.getItem(PHOTO_KEY); } catch (e) { return SL._photo || null; } };
  const setPhoto = (v) => { SL._photo = v; try { v ? localStorage.setItem(PHOTO_KEY, v) : localStorage.removeItem(PHOTO_KEY); } catch (e) {} };

  // 사진을 700px로 줄여 JPEG로 저장
  const shrink = (file) => new Promise((res, rej) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, 700 / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
      res(c.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('이미지를 열 수 없어요')); };
    img.src = url;
  });

  const editName = () => SL.sheet(`<h3>이름 바꾸기</h3>
      <input class="input" id="nmIn" maxlength="12" value="${SL.esc(SL.settings.name)}" placeholder="이름">
      <button class="btn primary block" id="nmOk" style="margin-top:12px">저장</button>`, (sh, close) => {
      const inp = SL.$('#nmIn', sh); setTimeout(() => { inp.focus(); inp.select(); }, 50);
      const save = () => { SL.settings.name = inp.value.trim() || '사용자'; SL.saveSettings(); close(); SL.render(); };
      SL.$('#nmOk', sh).onclick = save;
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') save(); });
    });

  // 사진 자동 보정 → 미리보기에서 고르기
  const processPhoto = async (file) => {
    const ov = SL.h(`<div class="overlay"><div class="box"><div class="spinner"></div>
      <div style="margin-top:18px;font-weight:700;font-size:17px">사진을 다듬고 있어요</div>
      <div class="bar"><i></i></div><div class="small muted op">준비 중…</div></div></div>`);
    document.body.appendChild(ov);
    let res;
    try { res = await SL.photoFx.process(file, (msg, p) => { SL.$('.op', ov).textContent = msg; SL.$('.bar i', ov).style.width = Math.round(p * 100) + '%'; }); }
    catch (e) { ov.remove(); SL.toast(e.message); return; }
    ov.remove();
    const opts = [res.auto && { k: 'auto', name: '자동 보정', src: res.auto }, { k: 'orig', name: res.upscaled ? '원본 (화질만 보정)' : '원본', src: res.original }].filter(Boolean);
    let pick = opts[0].k;
    SL.sheet(`<h3>이렇게 바꿀까요?</h3>
      <div class="grid2" id="pv">${opts.map((o, i) => `<button class="pv-opt ${i ? '' : 'on'}" data-k="${o.k}"><span class="pi" style="background-image:url('${o.src}')"></span><b>${o.name}</b></button>`).join('')}</div>
      <div class="card" style="margin-top:12px;padding:12px 14px">${res.info.map(t => `<div class="tip"><i>•</i>${SL.esc(t)}</div>`).join('')}</div>
      <button class="btn primary block" id="pvOk" style="margin-top:12px">적용</button>`, (sh, close) => {
      SL.$('#pv', sh).addEventListener('click', e => {
        const b = e.target.closest('[data-k]'); if (!b) return; pick = b.dataset.k;
        SL.$$('.pv-opt', sh).forEach(x => x.classList.toggle('on', x === b));
      });
      SL.$('#pvOk', sh).onclick = () => { setPhoto(opts.find(o => o.k === pick).src); close(); SL.render(); };
    });
  };

  const editPhoto = () => SL.sheet(`<h3>홈 카드 그림</h3>
      <div class="grid2" id="styles">${SL.HERO_STYLES.map(h => `<button class="style-opt ${!getPhoto() && (SL.settings.heroArt || 'silhouette') === h.key ? 'on' : ''}" data-k="${h.key}"><span class="sv">${h.svg()}</span><b>${h.name}</b></button>`).join('')}</div>
      <label class="btn primary block" for="phIn" style="margin-top:14px">${SL.icon('gallery')}내 사진으로 바꾸기</label>
      <input type="file" id="phIn" accept="image/*" hidden>
      <p class="tiny dim" style="margin-top:8px">사진은 이 기기에만 저장돼요.</p>`, (sh, close) => {
      SL.$('#styles', sh).addEventListener('click', e => {
        const b = e.target.closest('[data-k]'); if (!b) return;
        SL.settings.heroArt = b.dataset.k; SL.saveSettings(); setPhoto(null); close(); SL.render();
      });
      SL.$('#phIn', sh).addEventListener('change', async e => {
        const f = e.target.files[0]; if (!f) return;
        close(); processPhoto(f);
      });
    });

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

  // 홈에 올 때마다 바뀌는 문구 (\n = 줄바꿈)
  const PHRASES = [
    '오늘도,\n더 나은 스윙을 위해.', '오늘도 한 스윙씩\n좋아지는 중.', '열심히 실력을\n키워보세요!', '어제보다\n한 타 더 가볍게.',
    '템포가 좋으면\n거리는 따라와요.', '연습은 거짓말을\n하지 않아요.', '오늘의 스윙,\n기록해 볼까요?', '좋은 피니시가\n좋은 샷을 만들어요.',
    '힘 빼고,\n리듬 타고.', '천천히 올리고\n자신 있게 휘두르기.', '한 번의 분석,\n열 번의 연습보다 낫다.', '오늘은 몇 개나\n정타가 나올까요?',
  ];
  let lastPhrase = -1;
  const pickPhrase = () => {
    let i; do { i = Math.floor(Math.random() * PHRASES.length); } while (i === lastPhrase && PHRASES.length > 1);
    lastPhrase = i; return PHRASES[i];
  };

  const HOME_MENU = [
    { i: 'upload', t: '업로드', href: '#/analyze', hl: true }, { i: 'camera', t: '연습모드', href: '#/practice' },
    { i: 'chart', t: '스윙분석', href: '#/records' }, { i: 'compare', t: '비교', href: '#/compare' },
    { i: 'ai', t: 'AI 진단', href: '#/report' }, { i: 'drill', t: '드릴', href: '#/drills' },
    { i: 'trophy', t: '대회', href: '#/tour' }, { i: 'cart', t: '스토어', href: '#/store' },
  ];

  const homeRow = (r) => `<a class="hrow" href="#/analyze?id=${r.id}">
      <div class="th ${r.thumb ? '' : 'ph'}" style="${r.thumb ? `background-image:url(${r.thumb})` : ''}">${r.thumb ? '' : SL.icon('club')}</div>
      <div class="meta"><b>${SL.esc(r.club || '스윙')}${r.source === 'practice' ? ' <span class="badge">연습</span>' : ''}</b>
        <span>${SL.fmtDate(r.createdAt)}${r.tempo && r.tempo.ratio ? ` · 템포 ${r.tempo.ratio}:1` : ''}</span>
        <span class="${r.diagnosis && r.diagnosis.issues.length ? '' : 'dim'}">${r.diagnosis ? SL.esc(r.diagnosis.headline) : '분석 전'}</span></div>
      <span class="go">${SL.icon('play')}</span></a>`;

  SL.route('home', async (view) => {
    const list = await SL.db.all();
    const tempos = list.filter(r => r.tempo && r.tempo.ratio).map(r => r.tempo.ratio);
    const avg = tempos.length ? (tempos.reduce((a, b) => a + b, 0) / tempos.length).toFixed(1) : '-';
    const ph = getPhoto();
    // 가장 긴 줄이 한 줄에 들어가도록 글자 크기 자동 조절 (줄바꿈 깨짐 방지)
    const raw = pickPhrase(), lines = raw.split('\n');
    const longest = Math.max(...lines.map(l => [...l].reduce((n, ch) => n + (/[ .,!?]/.test(ch) ? 0.45 : 1), 0)));
    const hfs = Math.max(24, Math.min(40, Math.floor((Math.min(window.innerWidth, 760) - 48) / (longest * 1.04))));
    const phrase = lines.map(l => `<span>${SL.esc(l)}</span>`).join('<br>');
    view.innerHTML = `<div class="home">
      <div class="home-bg ${ph ? 'photo' : 'art'}" id="art" ${ph ? `style="background-image:url('${ph.replace(/'/g, '')}')"` : ''}>${ph ? '' : heroSVG()}</div>
      <div class="topbar">${SL.logo()}
        <div class="row"><a class="icon-btn" href="#/drills">${SL.icon('search')}</a><button class="icon-btn" id="bell">${SL.icon('bell')}</button></div></div>
      <div class="home-hero">
        <button class="who" id="who">${SL.esc(SL.settings.name)}님 ›</button>
        <h1 class="headline" style="font-size:${hfs}px">${phrase}</h1>
        <svg class="swoosh" viewBox="0 0 200 16" preserveAspectRatio="none"><path d="M2 14C50 3 120 0 198 5C130 4 70 7 6 15Z" fill="#C6F432"/></svg>
        <div class="hstats">
          <div><b>${list.length}</b><span>스윙 기록</span></div><i></i>
          <div><b>${avg}${avg !== '-' ? '<small>:1</small>' : ''}</b><span>평균 템포</span></div>
        </div>
        <button class="camtag" id="cam" title="홈 사진 바꾸기">${SL.icon('camera')}</button>
      </div>
      <div class="hmenu">${HOME_MENU.map(q => `<a href="${q.href}" class="${q.hl ? 'hl' : ''}">${SL.icon(q.i)}<span>${q.t}</span></a>`).join('')}</div>
      <h2 class="sec">최근 분석 <a href="#/records">더보기 ›</a></h2>
      <div class="hlist">${list.length ? list.slice(0, 3).map(homeRow).join('') : `
        <div class="empty">${SL.icon('upload')}첫 스윙 영상을 올려 보세요<br><a class="btn primary sm" style="margin-top:14px" href="#/analyze">영상 업로드</a></div>`}</div>
      <h2 class="sec">곧 추가될 기능</h2>
      <div class="grid3">
        <a class="card" href="#/shotdata"><span class="badge acc">준비중</span><div style="margin-top:8px;font-weight:700;font-size:14px">샷데이터</div><div class="tiny muted">카메라로 측정</div></a>
        <a class="card" href="#/tour"><span class="badge acc">준비중</span><div style="margin-top:8px;font-weight:700;font-size:14px">대회정보</div><div class="tiny muted">PGA·KPGA 등</div></a>
        <a class="card" href="#/store"><span class="badge acc">준비중</span><div style="margin-top:8px;font-weight:700;font-size:14px">스토어</div><div class="tiny muted">용품 모아보기</div></a>
      </div></div>`;
    SL.$('#bell', view).onclick = () => SL.toast('새 알림이 없어요');
    SL.$('#who', view).onclick = editName;
    SL.$('#cam', view).onclick = editPhoto;
  });
  SL.editHomePhoto = () => editPhoto();
})(window.SL);
