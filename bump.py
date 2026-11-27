"""버전 올리기: python bump.py 0.5.2  → index.html의 ?v=, version.json, core.js의 SL.VERSION을 한 번에 변경"""
import re, sys, pathlib
v = sys.argv[1]; web = pathlib.Path(__file__).parent / "web"
p = web / "index.html"; p.write_text(re.sub(r'\?v=[\w.]+', f'?v={v}', p.read_text(encoding="utf-8")), encoding="utf-8")
(web / "version.json").write_text('{"v": "%s"}\n' % v, encoding="utf-8")
p = web / "js/core.js"; p.write_text(re.sub(r"SL\.VERSION = '[^']+'", f"SL.VERSION = '{v}'", p.read_text(encoding="utf-8")), encoding="utf-8")
print("version ->", v)
