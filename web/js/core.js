// SwingLab core: 라우터, 공용 유틸, 아이콘, 설정
window.SL = window.SL || {};
(function (SL) {
  SL.$ = (s, r = document) => r.querySelector(s);
  SL.$$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  SL.h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  SL.esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  SL.uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  SL.sleep = (ms) => new Promise(r => setTimeout(r, ms));
  SL.clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  SL.fmtDate = (ts) => {
    const d = new Date(ts), p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  };
  SL.fmtTime = (s) => {
    if (!isFinite(s)) s = 0;
    const m = Math.floor(s / 60), r = s - m * 60;
    return `${m}:${r.toFixed(2).padStart(5, '0')}`;
  };

  // ---------- 설정 (localStorage, 실패해도 동작) ----------
  const DEF = { hand: 'right', name: '사용자', analysisFps: 30, frameStep: 30 };
  SL.settings = Object.assign({}, DEF);
  try { Object.assign(SL.settings, JSON.parse(localStorage.getItem('sl.settings') || '{}')); } catch (e) {}
  SL.saveSettings = () => { try { localStorage.setItem('sl.settings', JSON.stringify(SL.settings)); } catch (e) {} };

  SL.toast = (msg, ms = 2200) => {
    const t = SL.$('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(SL._tt); SL._tt = setTimeout(() => t.classList.remove('show'), ms);
  };

  // ---------- 아이콘 (stroke 기반 SVG) ----------
  const I = (p, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ${extra}>${p}</svg>`;
  SL.icons = {
    home: I('<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h5v-6h4v6h5V9.5"/>'),
    chart: I('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
    trophy: I('<path d="M8 4h8v5a4 4 0 0 1-8 0V4Z"/><path d="M8 6H4v1a4 4 0 0 0 4 4M16 6h4v1a4 4 0 0 1-4 4M12 13v4M8 21h8M9 17h6"/>'),
    cart: I('<path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6"/><circle cx="10" cy="20" r="1.3"/><circle cx="17" cy="20" r="1.3"/>'),
    menu: I('<path d="M4 7h16M4 12h16M4 17h16"/>'),
    search: I('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
    bell: I('<path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16Z"/><path d="M10 21h4"/>'),
    back: I('<path d="m15 5-7 7 7 7"/>'),
    chev: I('<path d="m9 5 7 7-7 7"/>'),
    upload: I('<rect x="3" y="6" width="18" height="14" rx="3"/><path d="M12 16v-6M9 12.5 12 9.5l3 3"/><path d="M8 6l1.5-2h5L16 6"/>'),
    camera: I('<path d="M3 8.5A2.5 2.5 0 0 1 5.5 6H7l1.5-2h7L17 6h1.5A2.5 2.5 0 0 1 21 8.5v9A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5v-9Z"/><circle cx="12" cy="13" r="3.5"/>'),
    target: I('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r=".8" fill="currentColor"/>'),
    analysis: I('<path d="M4 19V5M4 19h16"/><path d="m7 15 4-5 3 3 5-6"/>'),
    compare: I('<rect x="3" y="5" width="8" height="14" rx="2"/><rect x="13" y="5" width="8" height="14" rx="2"/><path d="m6 11 2 2 0 0M16.5 10v4"/>'),
    drill: I('<path d="M12 3v14"/><path d="M12 17a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Z"/><path d="M12 5l7 3-7 3"/>'),
    ai: I('<path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8Z"/><path d="M18.5 15l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8Z"/>'),
    shot: I('<circle cx="6" cy="18" r="2"/><path d="M8 16C11 9 15 6 21 5"/><path d="M17 4.5 21 5l-1 3.8"/>'),
    play: I('<path d="M7 4.5v15l12.5-7.5Z" fill="currentColor"/>'),
    pause: I('<rect x="6" y="4.5" width="4" height="15" rx="1" fill="currentColor"/><rect x="14" y="4.5" width="4" height="15" rx="1" fill="currentColor"/>'),
    prev: I('<path d="M6 5v14"/><path d="m18 5-9 7 9 7Z" fill="currentColor"/>'),
    next: I('<path d="M18 5v14"/><path d="m6 5 9 7-9 7Z" fill="currentColor"/>'),
    line: I('<path d="M5 19 19 5"/><circle cx="5" cy="19" r="1.6" fill="currentColor"/><circle cx="19" cy="5" r="1.6" fill="currentColor"/>'),
    circle: I('<circle cx="12" cy="12" r="8"/>'),
    eye: I('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>'),
    eyeoff: I('<path d="M3 3l18 18"/><path d="M10.6 5.1A9.7 9.7 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.1 4M6.2 6.3C3.6 8 2 12 2 12s3.5 7 10 7a9.6 9.6 0 0 0 4.3-1"/>'),
    undo: I('<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>'),
    trash: I('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>'),
    tracer: I('<path d="M4 20C6 10 12 4 20 4"/><path d="M4 20c4-2 8-8 9-14" stroke-dasharray="2 3"/>'),
    posture: I('<circle cx="12" cy="5.5" r="3.5"/><circle cx="15" cy="6.5" r="3.5" stroke-dasharray="1.5 2"/><path d="M12 10.5 11 21"/>'),
    skeleton: I('<circle cx="12" cy="4.5" r="2"/><path d="M12 7v7M8 9h8M12 14l-3 7M12 14l3 7M8 9l-2 5M16 9l2 5"/>'),
    flip: I('<path d="M4 12a8 8 0 0 1 14-5.3L20 9"/><path d="M20 4v5h-5"/><path d="M20 12a8 8 0 0 1-14 5.3L4 15"/><path d="M4 20v-5h5"/>'),
    gallery: I('<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5L5 20"/>'),
    check: I('<path d="m5 12.5 4.5 4.5L19 7.5"/>', 'stroke-width="2.6"'),
    warn: I('<path d="M12 3 2 20h20L12 3Z"/><path d="M12 10v4M12 17.5v.01"/>'),
    x: I('<path d="M6 6l12 12M18 6 6 18"/>'),
    plus: I('<path d="M12 5v14M5 12h14"/>'),
    youtube: I('<rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="m10 9 5 3-5 3Z" fill="currentColor"/>'),
    shirt: I('<path d="M8 3 3 6l2 4 2-1v12h10V9l2 1 2-4-5-3a4 4 0 0 1-8 0Z"/>'),
    club: I('<path d="M17 3 9 17"/><path d="M9 17c-1 2-3 3.5-5 3.5L5 18c1.5 0 3-.5 4-1"/>'),
    ball: I('<circle cx="12" cy="12" r="8"/><circle cx="10" cy="9" r=".7" fill="currentColor"/><circle cx="14" cy="10" r=".7" fill="currentColor"/><circle cx="11" cy="13" r=".7" fill="currentColor"/><circle cx="15" cy="14" r=".7" fill="currentColor"/>'),
    bag: I('<path d="M8 7V5a4 4 0 0 1 8 0v2"/><rect x="6" y="7" width="12" height="14" rx="3"/><path d="M6 12h12"/>'),
    settings: I('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-2.7-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3.6 15 1.6 1.6 0 0 0 2 14H2a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.1-2.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 9 4.6V4a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7H22a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z"/>'),
    homefill: I('<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1Z" fill="currentColor" stroke="none"/>'),
    trend: I('<path d="M3 20 9 13l4 4 8-10"/><path d="M15 7h6v6"/>'),
    folder: I('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>'),
    user: I('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
    guide: I('<circle cx="18" cy="19" r="2" fill="currentColor"/><path d="M17 17 5 3" stroke-width="2.4"/><path d="M16.5 17.5 3 11"/><path d="M8 9v12" stroke-dasharray="1.5 2.5"/>'),
    stack: I('<rect x="4" y="4" width="12" height="12" rx="2"/><rect x="8" y="8" width="12" height="12" rx="2"/>'),
  };
  SL.icon = (n) => SL.icons[n] || '';

  SL.logo = () => `<div class="logo"><img class="lm" src="img/logo-mark.png" alt=""><img class="lw" src="img/logo-word.png" alt="SWING LAB"></div>`;

  SL.pageHead = (title, { back = true, right = '' } = {}) => `
    <header class="pagehead">
      ${back ? `<button class="icon-btn" onclick="SL.back()">${SL.icon('back')}</button>` : '<span style="width:40px"></span>'}
      <h1>${SL.esc(title)}</h1>${right}
    </header>`;

  SL.back = () => { if (history.length > 1) history.back(); else SL.go('home'); };

  // ---------- 라우터 ----------
  SL.routes = {};
  SL.route = (name, fn) => { SL.routes[name] = fn; };
  SL.go = (name, params) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    location.hash = '#/' + name + q;
  };
  SL.parseHash = () => {
    const h = location.hash.replace(/^#\/?/, '');
    const [name, q] = h.split('?');
    return { name: name || 'home', params: Object.fromEntries(new URLSearchParams(q || '')) };
  };
  const TAB_OF = { home: 'home', analyze: 'analyze', report: 'analyze', compare: 'analyze', practice: 'practice', session: 'records', records: 'records', more: 'more', shotdata: 'more' };

  SL.render = async () => {
    if (typeof SL._cleanup === 'function') { try { SL._cleanup(); } catch (e) { console.warn(e); } }
    SL._cleanup = null;
    document.body.classList.remove('fullscreen');
    const { name, params } = SL.parseHash();
    const view = SL.$('#view');
    view.innerHTML = '';
    window.scrollTo(0, 0);
    SL.$$('#tabbar a').forEach(a => a.classList.toggle('on', a.dataset.tab === TAB_OF[name]));
    const fn = SL.routes[name] || SL.routes.home;
    try { SL._cleanup = await fn(view, params); }
    catch (e) { console.error(e); view.innerHTML = `<div class="empty">문제가 발생했어요<br><span class="small dim">${SL.esc(e.message)}</span></div>`; }
  };

  // 새 버전 감지: 서버의 version.json이 지금 실행 중인 버전과 다르면 한 번 새로고침
  SL.VERSION = '0.6.1';
  SL.checkUpdate = async () => {
    try {
      const r = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' });
      if (!r.ok) return;
      const { v } = await r.json();
      if (v && v !== SL.VERSION) {
        let tried = null; try { tried = sessionStorage.getItem('sl.upd'); } catch (e) {}
        if (tried === v) return;                        // 같은 버전으로 무한 새로고침 방지
        try { sessionStorage.setItem('sl.upd', v); } catch (e) {}
        SL.toast('새 버전(v' + v + ')으로 업데이트할게요'); setTimeout(() => location.reload(), 900);
      }
    } catch (e) {}
  };

  SL.start = () => {
    SL.checkUpdate();
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') SL.checkUpdate(); });
    SL.$$('#tabbar .ti').forEach(s => s.innerHTML = SL.icon(s.dataset.icon));
    window.addEventListener('hashchange', SL.render);
    SL.render();
  };

  // ---------- 비디오 로딩 (MediaRecorder webm 길이=Infinity 버그 보정) ----------
  SL.loadVideo = (video, src) => new Promise((resolve, reject) => {
    video.playsInline = true; video.muted = true; video.preload = 'auto';
    video.setAttribute('playsinline', ''); video.setAttribute('webkit-playsinline', '');
    const fail = () => reject(new Error('영상을 불러올 수 없어요 (지원하지 않는 형식일 수 있어요)'));
    video.addEventListener('error', fail, { once: true });
    video.addEventListener('loadedmetadata', async () => {
      if (!isFinite(video.duration)) {
        await new Promise(r => {
          const done = () => { video.removeEventListener('durationchange', chk); r(); };
          const chk = () => { if (isFinite(video.duration)) done(); };
          video.addEventListener('durationchange', chk);
          video.currentTime = 1e7;
          setTimeout(done, 3000);
        });
        video.currentTime = 0;
      }
      resolve(video);
    }, { once: true });
    video.src = src;
    video.load();
  });

  SL.seek = (video, t) => new Promise(r => {
    let done = false;
    const fin = () => { if (done) return; done = true; video.removeEventListener('seeked', fin); r(); };
    video.addEventListener('seeked', fin);
    video.currentTime = t;
    setTimeout(fin, 2000);
  });

  // 비디오 프레임 → 썸네일 dataURL
  SL.thumbOf = (video, w = 240) => {
    try {
      const vw = video.videoWidth, vh = video.videoHeight; if (!vw) return null;
      const c = document.createElement('canvas'); c.width = w; c.height = Math.round(w * vh / vw);
      c.getContext('2d').drawImage(video, 0, 0, c.width, c.height);
      return c.toDataURL('image/jpeg', 0.72);
    } catch (e) { return null; }
  };

  SL.sheet = (html, onMount) => {
    const bg = SL.h(`<div class="sheet-bg"><div class="sheet"><div class="grab"></div>${html}</div></div>`);
    const close = () => bg.remove();
    bg.addEventListener('click', e => { if (e.target === bg) close(); });
    document.body.appendChild(bg);
    onMount && onMount(bg.querySelector('.sheet'), close);
    return close;
  };

  SL.CLUBS = ['드라이버', '우드', '유틸', '아이언', '웨지'];
  SL.PHASES = [
    { key: 'address', name: '어드레스' },
    { key: 'takeaway', name: '테이크백' },
    { key: 'backswing', name: '백스윙' },
    { key: 'top', name: '탑스윙' },
    { key: 'downswing', name: '다운스윙' },
    { key: 'impact', name: '임팩트' },
    { key: 'follow', name: '팔로우스루' },
    { key: 'finish', name: '피니시' },
  ];
  SL.JUMP_PHASES = ['address', 'top', 'impact', 'follow', 'finish'];
  SL.phaseName = (k) => (SL.PHASES.find(p => p.key === k) || {}).name || k;
})(window.SL);
