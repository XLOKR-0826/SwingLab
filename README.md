# SwingLab — AI 골프 스윙 분석 & 드릴 추천

휴대폰으로 찍은 스윙 영상을 올리면 관절(MediaPipe Pose)을 인식해서
**구간(어드레스~피니시) 자동 검출 → 템포 계산 → 스윙 궤적 → 진단 → 드릴/유튜브 추천**까지 해 주는 웹앱입니다.

## 실행 방법

### 1) 단독 웹앱 (가장 빠름, 카메라 포함 모든 기능)
```bash
cd web
python -m http.server 8000
# 브라우저에서 http://localhost:8000
```
- 휴대폰/아이패드에서 쓰려면 **HTTPS 주소**가 필요해요(카메라 권한). `web/` 폴더를 GitHub Pages·Netlify·Vercel 에 그대로 올리면 됩니다.

### 2) Streamlit (계획서 방식)
```bash
pip install -r requirements.txt
streamlit run streamlit_app.py
```
- `web/`을 수정하면 `build.py`가 자동으로 `dist/swinglab.html`(한 파일)로 다시 합칩니다.
- Streamlit 안(iframe)에서는 브라우저에 따라 **카메라·저장소가 제한**될 수 있어요. 연습모드 시연은 1) 방식을 권장합니다.

### 테스트
```bash
node tests/test_analyzer.js    # 구간 검출 / 템포 / 진단 / 일관성
node tests/test_detector.js    # 연습모드 실시간 스윙 감지
python tests/ui_check.py       # 헤드리스 크롬 화면 확인 (playwright 필요)
```

## 기능 현황 (v0.1)

| 손그림 번호 | 기능 | 상태 |
|---|---|---|
| 1 | 0.25 / 0.5 / 0.75 / 1배속(클릭), 한 프레임씩 이동 | ✅ |
| 2 | 궤적 표시 — 백스윙(하늘색)/다운스윙(빨강) 색 구분, 켜고 끄기 | ✅ 손 경로 · 클럽헤드는 β(추정) |
| 3 | 스윙 템포 자동 계산 | ✅ |
| 4 | 영상 위 직선·원(크기 조절) 그리기, 5색, 그림 켜고 끄기 | ✅ |
| 5 | 측면/정면 업로드, 내 스윙 vs 프로 스윙 비교(나란히/겹쳐보기, 각각 재생) | ✅ |
| 6 | 어드레스·탑·임팩트·팔로우스루·피니시 클릭 → 해당 프레임 | ✅ |
| AI 진단 | 8구간 진단 + 원인 분석 + 미스샷 반영 드릴 + 유튜브 검색 | ✅ 규칙 기반 |
| 기능2 연습모드 | 카메라 켜두면 스윙마다 자동 분할 저장 + 일관성 분석 + 겹쳐보기 | ✅ |
| After ①②③ | 샷데이터 · 대회정보 · 스토어 | 페이지만 (준비중) |

## 폴더 구조
```
web/index.html          앱 진입점
web/css/style.css       디자인 (다크 + 라임 포인트)
web/js/core.js          라우터·유틸·아이콘
web/js/db.js            IndexedDB 저장
web/js/pose.js          MediaPipe Pose 로더
web/js/analyzer.js      구간 검출·템포·클럽헤드 추정·진단·일관성
web/js/drills.js        드릴 DB + 유튜브 검색 링크
web/js/draw.js          그리기 레이어
web/js/player.js        스윙 플레이어(배속·프레임·궤적·관절)
web/js/pages/*.js       화면별 코드
```

## 진단 기준 (analyzer.js)
- 템포: 백스윙÷다운스윙, 2.2 미만 "빠름", 4.2 초과 "느림" (투어 평균 ≈ 3:1)
- 측면: 얼리 익스텐션(골반 전진), 척추각 변화, 오버 더 탑(다운스윙 손 경로)
- 정면: 스웨이, 어깨 회전량, 피니시 체중 이동
- 공통: 머리 이동, 탑 왼팔 각도, 임팩트 손 높이, 캐스팅(클럽헤드 β)
- 임계값은 `diagnose()` 안의 숫자로 조절할 수 있어요.
