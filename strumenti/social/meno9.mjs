import fs from 'node:fs'; import { chromium } from 'playwright-core'; import { cssBase, pathItalia, xy, W, H } from './motore.mjs';
const d = JSON.parse(fs.readFileSync('/home/claude/mappa-della-rivolta/public/dati/eventi.json')).eventi;
const FIX = { pisa: [43.716, 10.401], ferrara: [44.836, 11.62], lucca: [43.843, 10.505], pescara: [42.464, 14.214], salerno: [40.682, 14.768], siena: [43.318, 11.331] };
const ESCL = ['2026-11-20-torino-altro-01', '2026-11-20-roma-sciopero_categoria-01'];
const nome = (s) => s.trim().toLowerCase().replace(/(^|[\s'])\S/g, (m) => m.toUpperCase()).replace("L'aquila", "L'Aquila");
const C = {}; for (const e of d) if (e.stato === 'verificato' && e.fonte && e.data?.startsWith('2026-11-20') && !ESCL.includes(e.id)) { const n = nome(e.comune); C[n] = FIX[n.toLowerCase()] || C[n] || [e.lat, e.lng]; }
const N = Object.keys(C).length; console.log('città', N);
const CEN = ['Roma', 'Firenze', 'Pisa', 'Pesaro', 'Perugia', 'Siena', 'Lucca', 'Ascoli Piceno'];
const SUD = ['Catanzaro', 'Cosenza', 'Crotone', 'Reggio Calabria', 'Vibo Valentia', 'Napoli', 'Salerno', 'Siracusa', 'Palermo', "L'Aquila", 'Teramo', 'Pescara', 'Ragusa', 'Vasto', 'Bari', 'Avellino', 'Agrigento'];
const G = { Nord: [], Centro: [], 'Sud e isole': [] }; for (const c of Object.keys(C).sort()) G[CEN.includes(c) ? 'Centro' : SUD.includes(c) ? 'Sud e isole' : 'Nord'].push(c);
console.log(Object.fromEntries(Object.entries(G).map(([k, v]) => [k, v.length])));
const dots = (r1, r2, col) => Object.values(C).map(([la, ln]) => { const [x, y] = xy(la, ln); return `<circle cx="${x}" cy="${y}" r="${r1}" fill="${col}" opacity=".25"/><circle cx="${x}" cy="${y}" r="${r2}" fill="${col}" stroke="#fff" stroke-width="2.5"/>`; }).join('');
const bg = 'data:image/jpeg;base64,' + fs.readFileSync('out/_bo-torri.jpg').toString('base64');
const css = cssBase.replace('height:1920px', 'height:1350px') + `.m{top:70px}.k{font:700 34px T;letter-spacing:.12em;text-transform:uppercase;color:#c8322a}`;
const crescita = [['Mer 4', 17], ['Lun 9', 36], ['Mar 10', 43], ['Oggi', N]];
const S = [
`<div style="position:absolute;inset:0;background:url(${bg}) center 0%/cover"></div><div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(20,18,22,.05) 0%,rgba(20,18,22,.25) 40%,rgba(20,18,22,.92) 100%)"></div>
<div style="position:absolute;left:80px;right:80px;bottom:110px;color:#fff"><p style="font:800 330px/.8 T;color:#ff4b3e;margin-left:-12px">−9</p><p style="font:800 92px/.92 T;text-transform:uppercase;margin-top:26px">Venerdì 20<br>sciopero generale.</p><p style="font:600 44px/1.3 C;margin-top:26px">${N} città hanno già la loro piazza sulla mappa. Manca la tua?</p></div>`,
`<div style="position:absolute;inset:0;background:#f6f3ee;padding:170px 80px 0"><p class="k">Come cresce la mappa del 20</p><p style="font:800 100px/.9 T;text-transform:uppercase;margin-top:16px">Una settimana fa<br>erano 17.</p>
<div style="position:absolute;left:80px;right:80px;bottom:150px;height:640px;display:flex;align-items:flex-end;gap:36px">${crescita.map(([g, n], i) => `<div style="flex:1;text-align:center"><p style="font:800 ${i === 3 ? 96 : 66}px T;color:${i === 3 ? '#c8322a' : '#1c1b1f'}">${n}</p><div style="height:${Math.round(n / N * 470)}px;background:${i === 3 ? '#c8322a' : '#1c1b1f'};border-radius:14px 14px 0 0;opacity:${i === 3 ? 1 : .25 + i * .2}"></div><p style="font:700 36px T;text-transform:uppercase;margin-top:14px">${g}</p></div>`).join('')}</div>
<p style="position:absolute;left:80px;right:80px;bottom:70px;font:600 30px C;color:#555">Città con almeno una piazza verificata per il 20 novembre.</p></div>`,
`<div style="position:absolute;inset:0;background:#1c1b1f;color:#fff;padding:160px 70px 0"><p class="k" style="color:#ff8f86">Le ${N} città</p>
<svg viewBox="0 0 ${W} ${H}" style="position:absolute;right:-40px;top:300px;width:470px;height:546px;overflow:visible;opacity:.95"><path d="${pathItalia}" fill="#2c2a30" stroke="#6d6a72" stroke-width="3"/>${dots(18, 8, '#ff4b3e')}</svg>
<div style="position:relative;width:600px">${Object.entries(G).map(([z, cs]) => `<p style="font:700 30px T;letter-spacing:.1em;text-transform:uppercase;color:#ff8f86;margin-top:30px">${z} · ${cs.length}</p><p style="font:700 33px/1.32 C;margin-top:6px">${cs.map((x, j) => '<span style="white-space:nowrap">' + x + (j < cs.length - 1 ? '<span style="color:#c8322a"> ·</span>' : '') + '</span>').join(' ')}</p>`).join('')}</div></div>`,
`<div style="position:absolute;inset:0;background:#f6f3ee;padding:170px 80px 0"><p class="k">Lo stesso giorno</p><p style="font:800 104px/.9 T;text-transform:uppercase;margin-top:16px">In piazza anche<br>studenti e studentesse.</p>
<p style="font:600 42px/1.35 C;margin-top:34px">Il 20 c'è anche lo sciopero studentesco "Youth Strike". Sulla mappa ha già cortei in <b>21 città</b>, da Udine a Siracusa.</p>
<div style="margin-top:60px;background:#fff;border-radius:22px;padding:30px 34px;border-left:10px solid #e0a020"><p style="font:800 44px T;text-transform:uppercase">Possibili disagi nei trasporti</p><p style="font:600 34px/1.38 C;margin-top:10px">Venerdì 20 sciopero nazionale anche di treni e trasporto locale. Se ti muovi, controlla le fasce di garanzia della tua azienda.</p></div></div>`,
`<div style="position:absolute;inset:0;background:#c8322a;color:#fff;padding:200px 80px 0"><p class="k" style="color:#ffd5d1">Mancano 9 giorni</p><p style="font:800 140px/.88 T;text-transform:uppercase;margin-top:16px">Condividi<br>con chi vuole<br>scioperare.</p>
<p style="font:600 42px/1.35 C;margin-top:30px">E se la tua città non c'è, aggiungila: basta il link alla locandina.</p>
<div style="display:inline-flex;align-items:center;gap:22px;margin-top:40px;background:#fff;color:#1c1b1f;padding:20px 34px;border-radius:60px;font:800 50px T"><span style="background:#c8322a;color:#fff;border-radius:40px;padding:4px 22px;font-size:38px">+ Segui</span>@mappadellarivolta</div>
<p style="font:600 30px C;margin-top:30px">♥ Gratis e senza pubblicità: se puoi, sostienila con un caffè.</p>
<p style="position:absolute;left:80px;right:80px;bottom:52px;font:600 23px/1.4 C;color:#ffe1de">Fonti: schede della mappa (CGIL, collettivi studenteschi, Commissione di garanzia scioperi). La mappa riporta informazioni pubbliche con la loro fonte.</p></div>`];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--lang=it-IT'] });
const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
for (let i = 0; i < S.length; i++) { const dk = i === 0 || i === 2 || i === 4; await p.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${S[i]}<div class="m" style="color:${dk ? '#fff' : '#1c1b1f'}"><i style="${i === 4 ? 'background:#fff' : ''}"></i>Mappa della Rivolta</div></body></html>`); await p.evaluate(() => document.fonts.ready);
  const f = await p.evaluate(() => Math.max(...[...document.querySelectorAll('p')].map((e) => e.getBoundingClientRect().bottom))); if (f > 1340) console.log('FUORI', i + 1, f);
  await p.screenshot({ path: `out/m9-0${i + 1}.png` }); }
await b.close();
