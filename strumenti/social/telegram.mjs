import fs from 'node:fs';
import { createRequire } from 'node:module';
import { chromium } from 'playwright-core';
const require = createRequire(import.meta.url);
const f = (p, x) => `url(data:font/woff2;base64,${fs.readFileSync(require.resolve(`${p}/files/${x}`)).toString('base64')})`;
const qr = 'data:image/png;base64,' + fs.readFileSync('qr.png').toString('base64');
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:T;font-weight:800;src:${f('@fontsource/barlow-condensed','barlow-condensed-latin-800-normal.woff2')}}
@font-face{font-family:T;font-weight:700;src:${f('@fontsource/barlow-condensed','barlow-condensed-latin-700-normal.woff2')}}
@font-face{font-family:C;font-weight:400;src:${f('@fontsource/source-sans-3','source-sans-3-latin-400-normal.woff2')}}
@font-face{font-family:C;font-weight:600;src:${f('@fontsource/source-sans-3','source-sans-3-latin-600-normal.woff2')}}
*{box-sizing:border-box;margin:0}
body{width:1080px;height:1920px;overflow:hidden;background:#1c1b1f;color:#fff;font-family:C}
.pag{position:relative;height:1920px;padding:250px 80px 300px;display:flex;flex-direction:column}
.marchio{position:absolute;top:150px;left:80px;font:700 34px T;letter-spacing:.14em;text-transform:uppercase;display:flex;align-items:center;gap:16px}
.marchio i{width:22px;height:22px;border-radius:50%;background:#c8322a}
h1{font:800 124px/.92 T;text-transform:uppercase}h1 em{font-style:normal;color:#c8322a}
.sotto{font:400 42px/1.3 C;color:#e8e4dd;margin-top:26px}
.card{flex:none;margin:44px auto 0;background:#fff;border-radius:40px;padding:36px 36px 28px;width:540px;box-shadow:14px 14px 0 #c8322a}
.card img{width:100%;display:block}
.inq{text-align:center;font:600 34px C;color:#c9c5bf;margin-top:36px}
.sticker{flex:none;margin-top:auto;border:4px dashed #6d6a73;border-radius:28px;height:170px;display:flex;align-items:center;justify-content:center;font:600 32px C;color:#8d8a93}
.url{margin-top:26px;text-align:center;font:800 76px T}
</style></head><body><div class="pag">
<div class="marchio"><i></i>Mappa della Rivolta</div>
<h1>Seguici su<br><em>Telegram</em></h1>
<p class="sotto">Scioperi e mobilitazioni verificate, ogni giorno, direttamente sul telefono.</p>
<div class="card"><img src="${qr}"></div>
<p class="inq">Inquadra il codice o tocca il link qui sotto</p>
<div class="sticker">metti qui lo sticker “Link”</div>
<div class="url">t.me/MappaDellaRivolta</div>
</div></body></html>`;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
await p.setContent(html); await p.evaluate(() => document.fonts.ready);
await p.screenshot({ path: 'out/storia-4-telegram.png' }); await b.close();
