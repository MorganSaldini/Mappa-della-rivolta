import fs from 'node:fs'; import { chromium } from 'playwright-core'; import { cssBase } from './motore.mjs';
const im = (f) => 'data:image/jpeg;base64,' + fs.readFileSync(f).toString('base64');
const css = cssBase.replace('height:1920px', 'height:1350px') + `.m{top:70px}.k{font:700 34px T;letter-spacing:.12em;text-transform:uppercase;color:#c8322a}`;
const M = [['9:00', 'Pistoia', 'assemblea'], ['9:30', 'Reggio Emilia', 'presidio']];
const P = [['14:00', 'Bologna', 'corteo'], ['14:00', 'Cremona', 'corteo'], ['14:00', 'Lecco', 'corteo'], ['14:00', 'Montale', 'marcia'], ['14:30', 'Lecce', 'corteo'], ['15:00', 'Firenze', 'corteo'], ['15:00', 'Genova', 'corteo'], ['15:00', 'Tivoli', 'marcia'], ['15:00', 'Udine', 'corteo'], ['15:30', 'Gorizia', 'corteo'], ['—', 'Torino', 'corteo e presidio']];
const card = ([o, c, t]) => `<div style="background:#fff;border-radius:16px;padding:16px 20px;box-shadow:0 2px 0 #1c1b1f22"><p style="font:800 30px T;color:#c8322a">${o}</p><p style="font:800 44px/1 T;text-transform:uppercase;margin-top:4px">${c}</p><p style="font:600 26px C;color:#5f5d66">${t}</p></div>`;
const S = [
`<div style="position:absolute;inset:0;background:#1c1b1f;color:#fff;overflow:hidden"><img src="${im('foto30/bologna.jpg')}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 70%"><div style="position:absolute;inset:0;background:linear-gradient(#0006,#0000 30%,#000c 72%)"></div>
<div style="position:absolute;left:80px;right:80px;bottom:110px"><p class="k" style="color:#ffb3ad">Sabato 7 novembre</p><p style="font:800 170px/.86 T;text-transform:uppercase;margin-top:16px">Oggi<br>13 città<br>in piazza.</p><p style="font:600 44px/1.3 C;margin-top:26px">Dove e a che ora →</p></div>
<p style="position:absolute;right:30px;top:1300px;font:600 20px C;color:#fffa">Bologna, 30 ottobre · dalle vostre storie</p></div>`,
`<div style="position:absolute;inset:0;padding:160px 70px 0"><p class="k">Mattina</p><div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-top:14px">${M.map(card).join('')}</div>
<p class="k" style="margin-top:30px">Pomeriggio</p><div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-top:14px">${P.map(card).join('')}</div>
<p style="font:600 26px/1.35 C;color:#5f5d66;margin-top:22px">Luoghi e dettagli su ogni scheda della mappa: mappadellarivolta.org</p></div>`,
`<div style="position:absolute;inset:0;background:#c8322a;color:#fff;padding:180px 80px 0"><p class="k" style="color:#ffd5d1">Prima di uscire</p><p style="font:800 120px/.88 T;text-transform:uppercase;margin-top:14px">Ci vediamo<br>in piazza.</p>
<div style="margin-top:30px">${[['Controlla la scheda', 'orari e luoghi possono cambiare all\'ultimo.'], ['Resta con il tuo gruppo', 'e decidete prima dove ritrovarvi.'], ['Emergenze: 112', 'assistenza legale HubForDefenders +39 353 495 3606.'], ['Mandaci le foto', 'taggaci @mappadellarivolta, senza volti riconoscibili.']].map(([a, b]) => `<p style="border-top:2px solid #fff5;padding:16px 0;font:600 34px/1.3 C"><b style="font:800 44px T;text-transform:uppercase">${a}</b><br>${b}</p>`).join('')}</div>
<p style="font:600 30px C;margin-top:14px">Segui la pagina · ♥ sostienila con un caffè</p>
<p style="position:absolute;left:80px;right:80px;bottom:52px;font:600 23px/1.4 C;color:#ffe1de">Fonti: schede della mappa. La mappa riporta informazioni pubbliche con la loro fonte.</p></div>`];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
for (let i = 0; i < S.length; i++) { await p.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${S[i]}<div class="m" style="color:${i === 1 ? '#1c1b1f' : '#fff'}"><i style="${i === 2 ? 'background:#fff' : ''}"></i>Mappa della Rivolta</div></body></html>`); await p.evaluate(() => document.fonts.ready);
  const f = await p.evaluate(() => Math.max(...[...document.querySelectorAll('p')].map((e) => e.getBoundingClientRect().bottom))); if (f > 1345) console.log('FUORI', i + 1, f);
  await p.screenshot({ path: `out/o7-0${i + 1}.png` }); }
await b.close();
