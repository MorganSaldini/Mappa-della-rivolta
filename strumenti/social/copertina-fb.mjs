// Copertina pagina Facebook 1640x624 (zona sicura per telefono: centro ~1110 px)
import fs from 'node:fs'; import { chromium } from 'playwright-core'; import { cssBase, pathItalia, xy, W, H, CHROME, COL } from './motore.mjs';
const ev = JSON.parse(fs.readFileSync('/home/claude/mappa-della-rivolta/public/dati/eventi.json')).eventi.filter((e) => e.lat && e.stato === 'verificato' && e.fonte && !e.titolo.startsWith('Possibili disagi'));
const seen = new Set(); const pts = ev.filter((e) => { const k = e.comune.toLowerCase() + e.tipo; if (seen.has(k)) return false; seen.add(k); return true; });
const dots = pts.map((e) => { const [x, y] = xy(e.lat, e.lng); return `<circle cx="${x}" cy="${y}" r="13" fill="${COL[e.tipo] || COL.altro}" stroke="#fff" stroke-width="4"/>`; }).join('');
const css = cssBase.replace('width:1080px;height:1920px', 'width:1640px;height:624px') + `
.leg{display:flex;gap:20px;margin-top:26px;white-space:nowrap;font:600 22px C;color:#3a383e}.leg i{display:inline-block;width:18px;height:18px;border-radius:50%;margin-right:9px;vertical-align:-2px}`;
const html = `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>
<div style="position:absolute;inset:0;background:#f6f3ee"></div>
<div style="position:absolute;left:0;top:0;bottom:0;width:14px;background:#c8322a"></div>
<svg viewBox="0 0 ${W} ${H}" style="position:absolute;left:905px;top:26px;width:490px;height:570px;overflow:visible"><path d="${pathItalia}" fill="#e6dfd3" stroke="#d3cabb" stroke-width="3"/>${dots}</svg>
<div style="position:absolute;left:290px;top:70px;width:640px">
<p style="font:700 26px T;letter-spacing:.16em;text-transform:uppercase;color:#c8322a;display:flex;align-items:center;gap:12px"><i style="width:18px;height:18px;border-radius:50%;background:#c8322a;display:inline-block"></i>mappadellarivolta.org</p>
<p style="font:800 116px/.86 T;text-transform:uppercase;margin-top:16px">Mappa della<br>Rivolta</p>
<p style="font:600 33px/1.3 C;margin-top:20px">Scioperi, cortei e presidi in tutta Italia,<br>ognuno con la sua fonte.</p>
<div class="leg">${[['sciopero_generale', 'Sciopero'], ['corteo', 'Corteo'], ['presidio', 'Presidio'], ['sciopero_categoria', 'Categoria'], ['assemblea', 'Assemblea']].map(([k, n]) => `<span><i style="background:${COL[k]}"></i>${n}</span>`).join('')}</div>
<p style="font:700 26px C;margin-top:26px;color:#c8322a">Manca la tua piazza? Aggiungila, senza account.</p></div>
</body></html>`;
const b = await chromium.launch({ executablePath: CHROME }); const p = await b.newPage({ viewport: { width: 1640, height: 624 } });
await p.setContent(html); await p.evaluate(() => document.fonts.ready); await p.screenshot({ path: 'copertina-facebook.png' });
// anteprima del taglio da telefono (centro 1110x624)
await p.screenshot({ path: '_mobile.png', clip: { x: 265, y: 0, width: 1110, height: 624 } }); await b.close(); console.log(pts.length);
