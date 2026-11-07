import fs from 'node:fs'; import { chromium } from 'playwright-core'; import { geoPath } from 'd3-geo'; import { cssBase, pathItalia, xy, W, H } from './motore.mjs';
const im = (f) => 'data:image/jpeg;base64,' + fs.readFileSync(f).toString('base64');
const css = cssBase.replace('height:1920px', 'height:1350px') + `.m{top:70px}.k{font:700 34px T;letter-spacing:.12em;text-transform:uppercase;color:#c8322a}`;
const reg = JSON.parse(fs.readFileSync('geo/package/countries/it/it-all.geo.json'));
// regioni proiettate come la sagoma: ricavo la proiezione da xy campionando
const proj = (c) => xy(c[1], c[0]);
const ring = (r) => 'M' + r.map((c) => proj(c).map((v) => v.toFixed(1)).join(',')).join('L') + 'Z';
const regD = reg.features.map((f) => { const g = f.geometry; const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates; return polys.map((p) => p.map(ring).join('')).join(''); }).join('');
// [città, lat, lng, ora, tipo, dx, dy, ancora]
const C = [['Torino', 45.071, 7.686, '', 'corteo e presidio', 82, 234, 'middle'], ['Genova', 44.407, 8.934, '15:00', 'corteo', 162, 306, 'end'], ['Lecco', 45.856, 9.397, '14:00', 'corteo', 192, 120, 'end'], ['Cremona', 45.133, 10.022, '14:00', 'corteo', 262, 192, 'start'],
 ['Reggio Emilia', 44.698, 10.631, '9:30', 'presidio', 282, 234, 'end'], ['Bologna', 44.494, 11.343, '14:00', 'corteo', 356, 262, 'start'], ['Pistoia', 43.933, 10.917, '9:00', 'assemblea', 300, 340, 'end'], ['Montale', 43.935, 11.016, '14:00', 'marcia', 404, 314, 'start'],
 ['Firenze', 43.770, 11.255, '15:00', 'corteo', 352, 364, 'start'], ['Udine', 46.063, 13.235, '15:00', 'corteo', 466, 92, 'end'], ['Gorizia', 45.940, 13.620, '15:30', 'corteo', 518, 124, 'start'], ['Tivoli', 41.953, 12.724, '15:00', 'marcia', 456, 518, 'start'], ['Lecce', 40.352, 18.172, '14:30', 'corteo', 818, 650, 'end']];
const lab = C.map(([c, la, ln, o, t, lx, ly, a]) => { const [x, y] = xy(la, ln); const far = Math.hypot(lx - x, ly - y) > 30;
  return `${far ? `<line x1="${x}" y1="${y}" x2="${lx + (a === 'end' ? 4 : a === 'start' ? -4 : 0)}" y2="${ly - 6}" stroke="#1c1b1f" stroke-width="1.2"/>` : ''}<circle cx="${x}" cy="${y}" r="7" fill="#c8322a" stroke="#fff" stroke-width="2.5"/>
  <text x="${lx}" y="${ly}" text-anchor="${a}" font-family="T" stroke="#f6f3ee" stroke-width="5" paint-order="stroke"><tspan font-size="15" font-weight="800" fill="#c8322a">${o || 'orario in scheda'}</tspan><tspan x="${lx}" dy="19" font-size="21" font-weight="800" fill="#1c1b1f">${c.toUpperCase()}</tspan></text>`; }).join('');
const S = [
`<div style="position:absolute;inset:0;background:#1c1b1f;color:#fff;overflow:hidden"><img src="${im('foto30/bologna.jpg')}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 70%;filter:grayscale(.15)"><div style="position:absolute;inset:0;background:linear-gradient(#0007,#0000 28%,#000d 70%)"></div>
<div style="position:absolute;left:80px;right:80px;bottom:110px"><p style="display:inline-block;font:800 40px T;text-transform:uppercase;background:#c8322a;padding:6px 18px;transform:rotate(-2deg)">Oggi · 13 città in piazza</p><p style="font:800 150px/.86 T;text-transform:uppercase;margin-top:26px">Andiamo<br>a riprenderci<br><span style="color:#ff8f86">il nostro futuro.</span></p><p style="font:600 42px/1.3 C;margin-top:26px">Dove e a che ora →</p></div>
<p style="position:absolute;right:30px;top:1300px;font:600 20px C;color:#fffa">Bologna, 30 ottobre · dalle vostre storie</p></div>`,
`<div style="position:absolute;inset:0;padding:150px 70px 0;background:#f6f3ee"><p class="k">Sabato 7 · dove e a che ora</p>
<svg viewBox="40 0 820 1000" style="position:absolute;left:40px;top:205px;width:1000px;height:1100px"><defs><filter id="sh"><feDropShadow dx="0" dy="6" stdDeviation="8" flood-opacity=".12"/></filter></defs>
<path d="${pathItalia}" fill="#fff" stroke="#1c1b1f" stroke-width="2" filter="url(#sh)"/><path d="${regD}" fill="none" stroke="#1c1b1f" stroke-opacity=".18" stroke-width="1" stroke-dasharray="4 3"/>${lab}</svg>
<div style="position:absolute;left:70px;top:1130px;width:420px;font:600 26px/1.35 C;color:#3a383f">Luoghi e dettagli su ogni scheda della mappa.<br><b style="font:800 34px T;color:#1c1b1f">mappadellarivolta.org</b></div></div>`,
`<div style="position:absolute;inset:0;background:#c8322a;color:#fff;padding:180px 80px 0"><p class="k" style="color:#ffd5d1">Prima di uscire</p><p style="font:800 120px/.88 T;text-transform:uppercase;margin-top:14px">Ci vediamo<br>in piazza.</p>
<div style="margin-top:34px">${[['1', 'Controlla la scheda', 'orari e luoghi possono cambiare all\'ultimo.'], ['2', 'Resta con il tuo gruppo', 'decidete prima dove ritrovarvi.'], ['3', 'Emergenze: 112', 'assistenza legale HubForDefenders +39 353 495 3606.'], ['4', 'Mandaci le foto', 'taggaci @mappadellarivolta, senza volti riconoscibili.']].map(([n, a, b]) => `<div style="display:flex;gap:24px;align-items:flex-start;padding:14px 0;border-top:2px solid #fff4"><span style="flex:none;width:58px;height:58px;border-radius:50%;background:#fff;color:#c8322a;font:800 36px/58px T;text-align:center">${n}</span><p style="font:600 32px/1.3 C"><b style="font:800 42px T;text-transform:uppercase">${a}</b><br>${b}</p></div>`).join('')}</div>
<div style="display:flex;gap:16px;margin-top:22px;align-items:center"><span style="background:#fff;color:#1c1b1f;border-radius:40px;padding:10px 24px;font:800 34px T">+ Segui @mappadellarivolta</span><span style="font:600 28px C">♥ sostienila con un caffè</span></div>
<p style="position:absolute;left:80px;right:80px;bottom:46px;font:600 22px/1.4 C;color:#ffe1de">Fonti: schede della mappa. La mappa riporta informazioni pubbliche con la loro fonte.</p></div>`];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
for (let i = 0; i < S.length; i++) { await p.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${S[i]}<div class="m" style="color:${i === 1 ? '#1c1b1f' : '#fff'}"><i style="${i === 2 ? 'background:#fff' : ''}"></i>Mappa della Rivolta</div></body></html>`); await p.evaluate(() => document.fonts.ready);
  const f = await p.evaluate(() => Math.max(...[...document.querySelectorAll('p')].map((e) => e.getBoundingClientRect().bottom))); if (f > 1345) console.log('FUORI', i + 1, f);
  await p.screenshot({ path: `out/o7-0${i + 1}.png` }); }
await b.close();
