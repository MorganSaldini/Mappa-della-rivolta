// Grafiche del reel "Trova la tua piazza del 20" (12/11/2026): copertina, fasce dei passaggi, chiusura.
import fs from 'node:fs'; import { chromium } from 'playwright-core'; import { cssBase, pathItalia, xy, W, H, CHROME } from './motore.mjs';
fs.mkdirSync('tpl20', { recursive: true });
const d = JSON.parse(fs.readFileSync('/home/claude/mappa-della-rivolta/public/dati/eventi.json')).eventi;
const ESCL = ['2026-11-20-torino-altro-01', '2026-11-20-roma-sciopero_categoria-01'];
const FIX = { pisa: [43.716, 10.401], ferrara: [44.836, 11.62], lucca: [43.843, 10.505], pescara: [42.464, 14.214], salerno: [40.682, 14.768], siena: [43.318, 11.331] };
const nome = (s) => s.trim().toLowerCase().replace(/(^|[\s'])\S/g, (m) => m.toUpperCase()).replace('Milao', 'Milano');
const C = {}; for (const e of d) if (e.stato === 'verificato' && e.fonte && e.data === '2026-11-20' && !ESCL.includes(e.id)) { const n = nome(e.comune); C[n] = FIX[n.toLowerCase()] || C[n] || [e.lat, e.lng]; }
const N = Object.keys(C).length; console.log('città', N);
const dots = Object.values(C).map(([la, ln]) => { const [x, y] = xy(la, ln); return `<circle cx="${x}" cy="${y}" r="20" fill="#ff4b3e" opacity=".25"/><circle cx="${x}" cy="${y}" r="9" fill="#ff4b3e" stroke="#fff" stroke-width="3"/>`; }).join('');
const band = (k, t) => `<div style="position:absolute;left:0;right:0;top:0;height:470px;background:linear-gradient(#c8322a 82%,#c8322a00)"></div><p style="position:absolute;left:80px;right:80px;top:250px;font:700 34px T;letter-spacing:.12em;text-transform:uppercase;color:#ffd5d1">${k}</p><p style="position:absolute;left:80px;right:60px;top:300px;font:800 92px/.95 T;text-transform:uppercase;color:#fff">${t}</p><div class="m" style="color:#fff"><i style="background:#fff"></i>Mappa della Rivolta</div>`;
const O = { a: band('1 · Filtri', 'Scegli il 20 novembre'), b: band('2 · Cerca', 'Scrivi la tua città'), c: band('3 · Guarda', 'Tocca la piazza'), d: band('4 · Ci sei?', 'Dillo con un tocco') };
const intro = `<div style="position:absolute;inset:0;background:#1c1b1f;color:#fff"><svg viewBox="0 0 ${W} ${H}" style="position:absolute;left:150px;top:300px;width:860px;height:1000px;overflow:visible"><path d="${pathItalia}" fill="#2c2a30" stroke="#6d6a72" stroke-width="3"/>${dots}</svg>
<div style="position:absolute;left:0;right:0;top:1060px;height:600px;background:linear-gradient(#1c1b1f00,#1c1b1f 40%)"></div>
<div style="position:absolute;left:80px;right:80px;top:1180px"><p style="font:700 38px T;letter-spacing:.12em;text-transform:uppercase;color:#ff8f86">Venerdì 20 novembre</p><p style="font:800 150px/.86 T;text-transform:uppercase;margin-top:14px">Trova<br>la tua piazza</p><p style="font:600 44px/1.3 C;margin-top:22px">Sulla mappa, in quattro tocchi.</p></div><div class="m" style="color:#fff"><i></i>Mappa della Rivolta</div></div>`;
const fine = `<div style="position:absolute;inset:0;background:#c8322a;color:#fff;padding:330px 80px 0"><p style="font:700 36px T;letter-spacing:.12em;text-transform:uppercase;color:#ffd5d1">${N} città, per ora</p><p style="font:800 150px/.86 T;text-transform:uppercase;margin-top:16px">Il 20<br>la tua piazza<br>è qui.</p>
<p style="font:600 46px/1.32 C;margin-top:34px">mappadellarivolta.org<br>link in bio</p>
<p style="font:600 38px/1.35 C;margin-top:30px;color:#ffe1de">La tua città non c'è? Tocca "Aggiungi" e incolla il link al comunicato.</p>
<div style="display:inline-flex;align-items:center;gap:22px;margin-top:44px;background:#fff;color:#1c1b1f;padding:20px 34px;border-radius:60px;font:800 52px T"><span style="background:#c8322a;color:#fff;border-radius:40px;padding:4px 22px;font-size:40px">+ Segui</span>@mappadellarivolta</div>
<p style="position:absolute;left:80px;right:80px;top:1540px;font:600 27px/1.4 C;color:#ffe1de">La mappa riporta informazioni pubbliche con la loro fonte.</p><div class="m" style="color:#fff"><i style="background:#fff"></i>Mappa della Rivolta</div></div>`;
const b = await chromium.launch({ executablePath: CHROME }); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
const pg = async (h, tr) => { await p.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${cssBase}${tr ? 'body{background:transparent}' : ''}</style></head><body>${h}</body></html>`); await p.evaluate(() => document.fonts.ready); };
for (const [k, h] of Object.entries(O)) { await pg(h, true); await p.screenshot({ path: `tpl20/o-${k}.png`, omitBackground: true }); }
await pg(intro); await p.screenshot({ path: 'tpl20/intro.png' }); await pg(fine); await p.screenshot({ path: 'tpl20/fine.png' });
await b.close();
