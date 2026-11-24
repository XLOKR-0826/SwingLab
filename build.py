"""web/ 폴더를 단일 HTML(dist/swinglab.html)로 합칩니다 — Streamlit 삽입·단독 배포용."""
import re, pathlib
ROOT = pathlib.Path(__file__).parent
web = ROOT / "web"
html = (web / "index.html").read_text(encoding="utf-8")
css = (web / "css/style.css").read_text(encoding="utf-8")
html = html.replace('<link rel="stylesheet" href="css/style.css">', f"<style>\n{css}\n</style>")
def inline(m):
    src = m.group(1)
    return f"<script>\n{(web / src).read_text(encoding='utf-8')}\n</script>"
html = re.sub(r'<script src="(js/[^"]+)"></script>', inline, html)
out = ROOT / "dist" / "swinglab.html"
out.parent.mkdir(exist_ok=True)
out.write_text(html, encoding="utf-8")
print(f"built {out} ({len(html)//1024} KB)")
