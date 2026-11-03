import { chromium } from 'playwright-core'; import { cssBase } from './motore.mjs';
const cap = (k, t) => `<p style="position:absolute;left:80px;right:80px;top:250px;font:700 34px T;letter-spacing:.12em;text-transform:uppercase;color:#c8322a">${k}</p><p style="position:absolute;left:80px;right:60px;top:300px;font:800 92px/.95 T;text-transform:uppercase">${t}</p>
<div style="position:absolute;left:206px;top:426px;width:668px;height:1413px;border-radius:60px;background:#1c1b1f;box-shadow:0 30px 60px #0003"></div>`;
const P = {
 a: cap('1', 'Scrivi la tua città'), b: cap('2', 'Tocca la piazza'), c: cap('3', 'Dici che ci sarai'), d: cap('Non c\'è?', 'Aggiungila tu'),
 intro: `<p style="position:absolute;left:80px;right:80px;top:560px;font:800 170px/.86 T;text-transform:uppercase">Trova<br>la tua<br>piazza.<br><span style="color:#c8322a">Bastano<br>3 tocchi.</span></p>`,
 fine: `<div style="position:absolute;inset:0;background:#c8322a;color:#fff;padding:330px 80px"><p style="font:700 38px T;letter-spacing:.12em;text-transform:uppercase;color:#ffd5d1">Il 20 novembre</p><p style="font:800 150px/.88 T;text-transform:uppercase;margin-top:16px">Dove sarai<br>tu?</p><p style="font:600 46px/1.3 C;margin-top:30px">Cercala su mappadellarivolta.org. Se non c'è, aggiungila: serve solo il link alla fonte.</p>
<div style="display:inline-flex;align-items:center;gap:22px;margin-top:60px;background:#fff;color:#1c1b1f;padding:22px 36px;border-radius:60px;font:800 56px T"><span style="background:#c8322a;color:#fff;border-radius:40px;padding:4px 22px;font-size:42px">+ Segui</span>@mappadellarivolta</div>
<p style="font:600 30px C;color:#ffe1de;margin-top:80px">La mappa riporta informazioni pubbliche con la loro fonte.</p></div>` };
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
for (const [k, h] of Object.entries(P)) { await p.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${cssBase}</style></head><body>${h}<div class="m" style="color:${k === 'fine' ? '#fff' : '#1c1b1f'}"><i style="${k === 'fine' ? 'background:#fff' : ''}"></i>Mappa della Rivolta</div></body></html>`); await p.evaluate(() => document.fonts.ready); await p.screenshot({ path: `tpl/${k}.png` }); }
await b.close();
