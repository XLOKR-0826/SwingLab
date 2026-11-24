# 헤드리스 크롬으로 주요 화면 렌더링 확인 (합성 분석 데이터 주입)
import asyncio, json, subprocess, sys, os
from playwright.async_api import async_playwright
OUT = '/tmp/sl/shots'; os.makedirs(OUT, exist_ok=True)
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8765', '-d', '/home/claude/swinglab/web'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
async def main():
    rec = json.load(open('/tmp/sl/rec.json'))
    vid = open('/tmp/sl/test.mp4', 'rb').read()
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--autoplay-policy=no-user-gesture-required'])
        pg = await b.new_page(viewport={'width': 390, 'height': 844}, device_scale_factor=2)
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: m.type == 'error' and errs.append(m.text))
        await pg.goto('http://localhost:8765/index.html#/home'); await pg.wait_for_timeout(800)
        await pg.screenshot(path=f'{OUT}/0_home_empty.png')
        await pg.evaluate('''async ([rec, bytes]) => {
            const blob = new Blob([new Uint8Array(bytes)], {type:'video/mp4'});
            const base = {...rec, blob, club:'드라이버', source:'upload', createdAt: Date.now()};
            await SL.db.put({...base, id:'t1'});
            for (let i=0;i<4;i++) await SL.db.put({id:'p'+i, createdAt:Date.now()-1000*(i+1), source:'practice', sessionId:'S', blob, club:'연습', view:'side',
               tempo:{ratio:[3.0,2.8,3.3,2.4][i], back:[.9,.84,.99,.72][i], down:.3}, topHeight:[.5,.48,.55,.4][i]});
        }''', [rec, list(vid)])
        for name, h, wait in [('1_home', '#/home', 600), ('2_analyze', '#/analyze?id=t1', 1500), ('3_report', '#/report?id=t1', 600),
                              ('4_upload', '#/analyze', 400), ('5_compare', '#/compare?a=t1&b=p0', 1200), ('6_session', '#/session?id=S', 500),
                              ('7_records', '#/records', 500), ('8_tour', '#/tour', 400), ('9_store', '#/store', 400), ('10_more', '#/more', 400), ('11_drills', '#/drills', 400)]:
            await pg.evaluate(f'location.hash="{h}"'); await pg.wait_for_timeout(wait)
            if name == '2_analyze':
                await pg.evaluate('''document.querySelector('[data-p=impact]').click()'''); await pg.wait_for_timeout(500)
                await pg.evaluate('''document.querySelector('[data-a=skel]').click()''')
                # 그리기: 직선 + 원
                await pg.evaluate('''document.querySelector('[data-t=line]').click()'''); await pg.evaluate('window.scrollTo(0,0)'); box = await pg.locator('canvas.draw').bounding_box()
                await pg.mouse.move(box['x']+40, box['y']+100); await pg.mouse.down(); await pg.mouse.move(box['x']+200, box['y']+300, steps=5); await pg.mouse.up()
                await pg.evaluate('''document.querySelector('[data-c="#FFD60A"]').click()'''); await pg.evaluate('''document.querySelector('[data-t=circle]').click()'''); await pg.evaluate('window.scrollTo(0,0)'); box = await pg.locator('canvas.draw').bounding_box()
                await pg.mouse.move(box['x']+150, box['y']+120); await pg.mouse.down(); await pg.mouse.move(box['x']+190, box['y']+150, steps=5); await pg.mouse.up()
                await pg.wait_for_timeout(300)
                n = await pg.evaluate('document.querySelector("canvas.draw") && 1')
            await pg.screenshot(path=f'{OUT}/{name}.png', full_page=True)
        await pg.evaluate('location.hash="#/practice"'); await pg.wait_for_timeout(1500)
        await pg.screenshot(path=f'{OUT}/12_practice.png')
        print('errors:', [e for e in errs if 'pretendard' not in e.lower() and 'ERR_' not in e][:10])
        await b.close()
try: asyncio.run(main())
finally: srv.terminate()
