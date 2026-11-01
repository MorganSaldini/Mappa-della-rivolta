import fs from 'node:fs'; import { chromium } from 'playwright-core'; import { cssBase } from './motore.mjs';
const img = (n) => 'data:image/jpeg;base64,' + fs.readFileSync(`foto30/${n}.jpg`).toString('base64');
const css = cssBase.replace('height:1920px', 'height:1350px') + `.m{top:70px}
.s{position:absolute;inset:0;padding:0 80px}.k{font:700 34px T;letter-spacing:.12em;text-transform:uppercase;color:#c8322a}
.fr{position:absolute;bottom:60px;left:80px;right:80px;font:600 24px/1.35 C;color:#5f5d66}`;
const S = [
`<div class="s" style="padding:0;background:#1c1b1f"><img src="${img('milano')}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 40%">
<div style="position:absolute;inset:0;background:linear-gradient(#0000 35%,#000d 80%)"></div>
<div style="position:absolute;left:80px;right:80px;bottom:120px;color:#fff"><p class="k" style="color:#ffb3ad">26 ottobre · 1 novembre</p>
<p style="font:800 150px/.88 T;text-transform:uppercase;margin-top:18px">Venerdì<br>eravamo<br>tantissimi.</p><p style="font:600 40px C;margin-top:26px">Com'è andata, piazza per piazza →</p></div>
<p style="position:absolute;right:30px;top:1300px;font:600 20px C;color:#fffa">Milano, foto cantiere_milano</p></div>`,
`<div class="s" style="padding-top:190px"><p class="k">I numeri del 30</p>
<p style="font:800 150px/.86 T;text-transform:uppercase;margin-top:24px">«Due milioni<br>in piazza»</p><p style="font:600 34px C;color:#5f5d66;margin-top:14px">il titolo del manifesto, il giorno dopo</p>
<div style="margin-top:56px;border-top:3px solid #1c1b1f">
${[['Milano', 'oltre 100mila secondo USB, circa 30mila secondo l\'ANSA'], ['Scuola', '7,57% di docenti e ATA in sciopero. Dato del Ministero, provvisorio'], ['Sulla mappa', '120 iniziative in 76 comuni']].map(([a, b]) => `<div style="display:flex;gap:30px;padding:26px 0;border-bottom:2px solid #1c1b1f33"><b style="font:800 52px/1 T;text-transform:uppercase;width:270px;flex:none">${a}</b><span style="font:600 38px/1.25 C">${b}</span></div>`).join('')}</div>
<p style="font:600 34px/1.35 C;margin-top:40px">Due conti diversi della stessa giornata. Noi li mettiamo uno accanto all'altro, ognuno con il suo nome.</p></div>`,
`<div class="s" style="padding:150px 60px 0"><div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;height:900px">${['brescia', 'bologna', 'pescara', 'catania'].map((n) => `<div style="position:relative;overflow:hidden"><img src="${img(n)}" style="width:100%;height:100%;object-fit:cover"><span style="position:absolute;left:14px;bottom:12px;font:800 40px T;text-transform:uppercase;color:#fff;text-shadow:0 2px 8px #000a">${n}</span></div>`).join('')}</div>
<p style="font:800 76px/.95 T;text-transform:uppercase;margin-top:40px">Le foto che ci avete mandato.</p><p style="font:600 38px/1.3 C;margin-top:14px">Grazie a chi è sceso in piazza in pace. Continuate a taggarci.</p></div>`,
`<div class="s" style="background:#c8322a;color:#fff;padding-top:190px"><p class="k" style="color:#ffd5d1">E adesso</p>
<p style="font:800 190px/.85 T;text-transform:uppercase;margin-top:20px">20<br>novembre</p><p style="font:800 64px/1 T;text-transform:uppercase;margin-top:20px">Sciopero generale CGIL</p>
<p style="font:600 40px/1.3 C;margin-top:30px">Sulla mappa ci sono già 13 piazze. Prima ancora, sabato 7: marcia per la pace a Tivoli e marcia contro l'inceneritore a Montale.</p>
<p style="font:600 40px/1.3 C;margin-top:30px">Manca la tua città? Aggiungila tu su <b>mappadellarivolta.org</b></p>
<p class="fr" style="color:#ffe1de">Fonti: il manifesto, USB, ANSA, Ministero dell'Istruzione, CGIL. La mappa riporta informazioni pubbliche con la loro fonte.</p></div>`];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
for (let i = 0; i < S.length; i++) { await p.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${S[i]}<div class="m" style="color:${i === 0 || i === 3 ? '#fff' : '#1c1b1f'}"><i style="${i === 3 ? 'background:#fff' : ''}"></i>Mappa della Rivolta</div></body></html>`); await p.evaluate(() => document.fonts.ready);
  const fuori = await p.evaluate(() => [...document.querySelectorAll('p,div,span')].some((e) => e.getBoundingClientRect().bottom > 1350 || e.getBoundingClientRect().right > 1081)); if (fuori) console.log('FUORI', i + 1);
  await p.screenshot({ path: `out/sett-0${i + 1}.png` }); }
await b.close();
