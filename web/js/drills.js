// 드릴 데이터베이스: 진단 이슈/미스샷 → 추천 드릴 + 유튜브 검색 키워드
(function (SL) {
  const D = (title, desc, mins, q, hue) => ({ title, desc, mins, q, hue });
  const BY_ISSUE = {
    head_move: [D('벽에 머리 대고 회전하기', '머리를 벽(또는 우산)에 가볍게 대고 하프스윙 — 축 고정 감각 익히기', 5, '골프 머리 고정 드릴', 150),
      D('공 뒤쪽 바라보기 드릴', '임팩트 후에도 공이 있던 자리를 0.5초 보고 고개 들기', 5, '골프 헤드업 교정 드릴', 160)],
    tempo_fast: [D('3:1 메트로놈 템포 드릴', '메트로놈 앱으로 "하나-둘-셋(백) / 넷(다운)" 리듬 연습', 10, '골프 템포 3대1 메트로놈 드릴', 80),
      D('탑에서 1초 멈췄다 치기', '탑에서 잠깐 멈춘 뒤 하체부터 출발', 5, '골프 탑에서 멈췄다 치기 드릴', 90)],
    tempo_slow: [D('연속 스윙(펌프) 드릴', '멈추지 않고 백-다운을 이어서 3번 반복해 리듬 만들기', 5, '골프 펌프 드릴 전환', 70)],
    lead_arm_bent: [D('왼팔 쭉 뻗은 하프스윙', '왼팔 각도를 유지한 채 9시-3시 스윙', 10, '골프 왼팔 펴기 드릴 백스윙', 200),
      D('타월 겨드랑이 드릴', '양 겨드랑이에 타월을 끼고 팔-몸 일체감 만들기', 5, '골프 타월 드릴 겨드랑이', 210)],
    hands_high: [D('의자(벽) 엉덩이 터치 드릴', '엉덩이를 뒤 벽에 댄 채로 임팩트까지 유지', 10, '골프 얼리 익스텐션 교정 벽 드릴', 20),
      D('손 낮게 임팩트 드릴', '임팩트 때 손이 왼쪽 허벅지 앞을 지나가게', 5, '골프 핸드퍼스트 임팩트 드릴', 30)],
    early_ext: [D('엉덩이 벽 터치 드릴', '어드레스 때 엉덩이가 닿은 벽에 임팩트까지 계속 닿기', 10, '골프 배치기 교정 드릴', 10),
      D('의자 드릴', '엉덩이 뒤에 의자를 두고 스윙 중 의자에서 떨어지지 않기', 10, '골프 얼리 익스텐션 의자 드릴', 0)],
    posture_loss: [D('척추각 유지 스틱 드릴', '등에 스틱을 대고 척추 기울기를 유지하며 회전', 10, '골프 척추각 유지 드릴', 260),
      D('왼쪽 무릎 굽힘 유지', '다운스윙에서 왼무릎이 펴지지 않게 하프스윙', 5, '골프 상체 들림 교정', 270)],
    over_top: [D('헤드 커버(게이트) 드릴', '공 바깥쪽 앞에 헤드커버를 두고 맞히지 않게 인-아웃 스윙', 10, '골프 오버더탑 교정 헤드커버 드릴', 0),
      D('오른 팔꿈치 옆구리 붙이기', '다운스윙 시작에 오른팔꿈치가 옆구리로 떨어지게', 10, '골프 슬라이스 교정 오른팔꿈치 드릴', 350),
      D('클럽페이스 컨트롤 드릴', '하프스윙에서 페이스를 스퀘어로 맞추는 감각', 10, '클럽 페이스 컨트롤 드릴', 120)],
    inside_out: [D('정렬봉 스윙 경로 드릴', '정렬봉 2개로 스윙 길을 만들고 스퀘어 경로 익히기', 10, '골프 정렬봉 스윙궤도 드릴', 190)],
    sway: [D('오른발 바깥 막대 드릴', '오른발 바깥에 막대를 세우고 골반이 닿지 않게 회전', 10, '골프 스웨이 교정 드릴', 40),
      D('오른 무릎 고정 드릴', '오른 무릎 각도를 탑까지 유지', 5, '골프 백스윙 스웨이 오른무릎', 50)],
    short_turn: [D('클럽 어깨에 걸고 회전', '클럽을 어깨에 걸고 왼어깨가 턱 밑까지 오게 회전', 5, '골프 어깨회전 늘리기 드릴', 220),
      D('등이 타겟 보기 드릴', '탑에서 등이 목표 방향을 보게 몸통 회전', 5, '골프 백스윙 꼬임 드릴', 230)],
    hang_back: [D('스텝 스루 드릴', '피니시에서 오른발을 앞으로 한 발 내딛기', 10, '골프 체중이동 스텝 드릴', 100),
      D('왼발 피니시 3초 유지', '피니시를 왼발 위에서 3초 동안 유지', 5, '골프 피니시 밸런스 드릴', 110)],
    casting: [D('펌프 드릴 (래깅)', '탑→허리 높이까지 내려오며 손목 각 유지, 3번 반복 후 스윙', 10, '골프 래깅 펌프 드릴 캐스팅 교정', 300),
      D('오른손 손등 각 유지', '다운스윙 중간까지 오른손목 각을 유지', 5, '골프 캐스팅 교정 손목 드릴', 310)],
  };
  const BY_MISS = {
    slice: [D('스트롱 그립 점검', '왼손 너클 2~3개 보이게 그립 점검', 3, '골프 슬라이스 그립 교정', 0), BY_ISSUE.over_top[0]],
    hook: [D('그립 압력·페이스 점검', '그립을 중립으로 하고 페이스 로테이션 줄이기', 5, '골프 훅 교정 드릴', 30)],
    push: [D('몸통 회전으로 릴리스', '임팩트 후 가슴이 타겟을 보게 끝까지 회전', 5, '골프 푸시 교정 드릴', 60)],
    pull: [D('타겟 오른쪽 출발 드릴', '공 앞 정렬봉 오른쪽으로 공을 출발시키기', 5, '골프 풀샷 교정', 180)],
    fat: [D('수건 뒤땅 방지 드릴', '공 10cm 뒤에 수건을 두고 건드리지 않고 치기', 10, '골프 뒷땅 교정 수건 드릴', 40)],
    thin: [D('디봇 앞쪽 만들기', '공 앞쪽 잔디가 파이게 다운블로 연습', 10, '골프 탑볼 교정 드릴', 280)],
    shank: [D('토(앞쪽) 타격 드릴', '공 바깥에 티를 꽂고 티를 안 건드리게 치기', 10, '골프 생크 교정 드릴', 330)],
  };
  const GENERAL = [D('9-3 하프스윙 컨트롤', '9시-3시 크기로 정타 컨택 감각 만들기', 10, '골프 9시 3시 스윙 드릴', 90),
    D('한 발 피니시 밸런스', '피니시를 3초 유지하며 균형 체크', 5, '골프 밸런스 드릴', 140)];

  SL.drills = {
    BY_ISSUE, BY_MISS, GENERAL,
    yt: (q) => 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q),
    // 진단 + 사용자가 고른 미스샷 → 중복 없이 추천
    recommend(diag, userMiss = []) {
      const out = [], seen = new Set();
      const push = (d, why) => { if (d && !seen.has(d.title)) { seen.add(d.title); out.push({ ...d, why }); } };
      (diag?.issues || []).forEach(i => (BY_ISSUE[i.id] || []).forEach(d => push(d, i.short)));
      userMiss.forEach(m => (BY_MISS[m] || []).forEach(d => push(d, SL.analyzer.MISS[m])));
      if (out.length < 3) GENERAL.forEach(d => push(d, '기본기'));
      return out;
    },
    all() {
      const list = []; const seen = new Set();
      Object.entries(BY_ISSUE).forEach(([k, arr]) => arr.forEach(d => { if (!seen.has(d.title)) { seen.add(d.title); list.push({ ...d, cat: k }); } }));
      Object.entries(BY_MISS).forEach(([k, arr]) => arr.forEach(d => { if (!seen.has(d.title)) { seen.add(d.title); list.push({ ...d, cat: k }); } }));
      GENERAL.forEach(d => { if (!seen.has(d.title)) list.push({ ...d, cat: 'general' }); });
      return list;
    },
    card(d) {
      return `<a class="drill" href="${SL.drills.yt(d.q)}" target="_blank" rel="noopener">
        <div class="dt" style="background:linear-gradient(135deg,hsl(${d.hue},55%,32%),hsl(${(d.hue + 40) % 360},50%,16%))">${SL.icon('youtube')}<span class="len">${d.mins}분</span></div>
        <div class="dm"><b>${SL.esc(d.title)}</b><span>${SL.esc(d.desc)}</span>${d.why ? `<span class="badge acc" style="margin-top:4px">${SL.esc(d.why)}</span>` : ''}</div>
        <span class="chev">${SL.icon('chev')}</span></a>`;
    },
  };
})(window.SL);
