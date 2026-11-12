import fs from 'node:fs'; import { chromium } from 'playwright-core'; import { cssBase } from './motore.mjs';
const N = +process.argv[2];
const bg = 'data:image/jpeg;base64,' + fs.readFileSync('foto30/milano.jpg').toString('base64');
const css = cssBase.replace('height:1920px', 'height:1350px') + `.m{top:70px}.k{font:700 34px T;letter-spacing:.12em;text-transform:uppercase;color:#c8322a}
.r{display:grid;grid-template-columns:330px 130px 1fr;align-items:baseline;border-top:2px solid #3a383e;padding:19px 0}.r b{font:800 50px T;text-transform:uppercase}.r i{font:800 44px T;color:#ffd23f;font-style:normal}.r span{font:600 31px/1.2 C;color:#e8e4dd}.r small{display:block;font:600 24px C;color:#ff8f86;margin-top:2px}`;
const tab = (tit, rows) => `<div style="position:absolute;inset:0;background:#1c1b1f;color:#fff;padding:160px 70px 0"><p class="k" style="color:#ff8f86">Venerdì 20 · dove ci troviamo</p><p style="font:800 96px/.9 T;text-transform:uppercase;margin:12px 0 26px">${tit}</p>
${rows.map(([c, o, l, n]) => `<div class="r"><b>${c}</b><i>${o}</i><span>${l}${n ? `<small>${n}</small>` : ''}</span></div>`).join('')}</div>`;
const S = [
`<div style="position:absolute;inset:0;background:url(${bg}) center/cover"></div><div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(20,18,22,.35),rgba(20,18,22,.15) 35%,rgba(20,18,22,.93) 72%)"></div>
<div style="position:absolute;left:80px;right:80px;bottom:110px;color:#fff"><p style="font:700 40px T;letter-spacing:.12em;text-transform:uppercase;color:#ff8f86">Sciopero generale · venerdì 20</p><p style="font:800 150px/.86 T;text-transform:uppercase;margin-top:14px">Dove ci<br>troviamo?</p><p style="font:600 44px/1.3 C;margin-top:26px">Orari e punti di ritrovo delle piazze più grandi. Scorri e salva.</p></div>`,
tab('Nord', [['Milano', '9:00', 'Piazzale Cadorna'], ['Torino', '—', 'Piazza XVIII Dicembre', 'orario da confermare'], ['Venezia', '9:00', 'Mestre, stazione FS'], ['Bologna', '9:30', 'Piazza dei Martiri'], ['Brescia', '9:00', 'Via San Faustino'], ['Modena', '8:30', 'Piazza 1° Maggio'], ['Parma', '9:30', 'Piazzale Santa Croce'], ['Bolzano', '10:30', 'Piazza della Vittoria']]),
tab('Centro e Sud', [['Pesaro', '9:00', 'Piazzale della Libertà'], ['Ascoli P.', '10:00', 'Piazza Matteotti'], ['Pescara', '9:30', 'Stazione Porta Nuova', 'corteo studentesco'], ['Salerno', '9:00', 'Piazza Vittorio Veneto'], ['Avellino', '9:30', 'Via De Conciliis'], ['Bari', '9:30', 'Piazza Massari', 'corteo studentesco'], ['Agrigento', '9:30', 'Piazza Cavour'], ['Ragusa', '9:00', 'Viale Europa', 'corteo studentesco']]),
`<div style="position:absolute;inset:0;background:#f6f3ee;padding:170px 80px 0"><p class="k">Ci mancano dei pezzi</p><p style="font:800 108px/.9 T;text-transform:uppercase;margin-top:16px">Roma, Napoli,<br>Firenze, Palermo.</p>
<p style="font:600 44px/1.35 C;margin-top:34px">Lo sciopero lì c'è, ma sulla mappa manca ancora il punto di ritrovo.</p>
<p style="font:600 44px/1.35 C;margin-top:26px">E Genova, Cagliari e Catania per ora non ci sono proprio.</p>
<div style="margin-top:56px;background:#c8322a;color:#fff;border-radius:24px;padding:34px 40px"><p style="font:800 64px/1 T;text-transform:uppercase">Sai dove ci si vede?</p><p style="font:600 38px/1.35 C;margin-top:12px">Aggiungilo su mappadellarivolta.org con il link alla locandina. Ci vuole un minuto.</p></div></div>`,
`<div style="position:absolute;inset:0;background:#c8322a;color:#fff;padding:190px 80px 0"><p class="k" style="color:#ffd5d1">${N} città · mancano 8 giorni</p><p style="font:800 140px/.88 T;text-transform:uppercase;margin-top:16px">Condividi<br>con chi vuole<br>scioperare.</p>
<div style="display:inline-flex;align-items:center;gap:22px;margin-top:44px;background:#fff;color:#1c1b1f;padding:20px 34px;border-radius:60px;font:800 50px T"><span style="background:#c8322a;color:#fff;border-radius:40px;padding:4px 22px;font-size:38px">+ Segui</span>@mappadellarivolta</div>
<p style="font:600 32px/1.35 C;margin-top:40px;color:#ffe9e6">Il 20 scioperano anche treni e trasporto locale: possibili disagi, controlla le fasce di garanzia.</p>
<p style="font:600 30px C;margin-top:26px">♥ Gratis e senza pubblicità: se puoi, sostienila con un caffè.</p>
<p style="position:absolute;left:80px;right:80px;bottom:52px;font:600 23px/1.4 C;color:#ffe1de">Fonti: schede della mappa (CGIL nazionale e territoriali, collettivi studenteschi, MIT). La mappa riporta informazioni pubbliche con la loro fonte.</p></div>`];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--lang=it-IT'] });
const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
for (let i = 0; i < S.length; i++) { const dk = i !== 3; await p.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${S[i]}<div class="m" style="color:${dk ? '#fff' : '#1c1b1f'}"><i style="${i === 4 ? 'background:#fff' : ''}"></i>Mappa della Rivolta</div></body></html>`); await p.evaluate(() => document.fonts.ready);
  const f = await p.evaluate(() => Math.max(...[...document.querySelectorAll('p,div.r')].map((e) => e.getBoundingClientRect().bottom))); if (f > 1330) console.log('FUORI', i + 1, f);
  await p.screenshot({ path: `out/p20-0${i + 1}.png` }); }
await b.close();
