"""SwingLab — Streamlit 래퍼. 웹앱(dist/swinglab.html)을 그대로 삽입합니다.
실행: streamlit run streamlit_app.py
"""
import pathlib, subprocess, sys
import streamlit as st
import streamlit.components.v1 as components

ROOT = pathlib.Path(__file__).parent
DIST = ROOT / "dist" / "swinglab.html"

st.set_page_config(page_title="SwingLab", page_icon="⛳", layout="centered")
st.markdown("<style>.block-container{padding-top:1rem;padding-bottom:0;max-width:820px}</style>", unsafe_allow_html=True)

# web/ 이 dist 보다 새로우면 자동으로 다시 빌드
src_mtime = max(p.stat().st_mtime for p in (ROOT / "web").rglob("*") if p.is_file())
if not DIST.exists() or DIST.stat().st_mtime < src_mtime:
    subprocess.run([sys.executable, str(ROOT / "build.py")], check=True)

with st.sidebar:
    st.header("SwingLab")
    st.caption("AI 골프 스윙 분석 & 드릴 추천")
    height = st.slider("화면 높이", 700, 1400, 900, 50)
    st.markdown(
        "- 분석: MediaPipe Pose (브라우저에서 실행)\n"
        "- 영상은 이 기기 브라우저에만 저장\n"
        "- 연습모드 카메라가 안 켜지면 `web/` 폴더를 단독으로 열어 주세요 (README 참고)"
    )

components.html(DIST.read_text(encoding="utf-8"), height=height, scrolling=True)
