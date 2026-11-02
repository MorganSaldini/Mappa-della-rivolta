import { chromium } from 'playwright-core'; import { cssBase, pathItalia, xy, W, H } from './motore.mjs';
const css = cssBase.replace('height:1920px', 'height:1350px') + `.m{top:70px}.k{font:700 34px T;letter-spacing:.12em;text-transform:uppercase;color:#c8322a}
.row{display:flex;gap:28px;padding:22px 0;border-top:2px solid #1c1b1f}.row .g{width:150px;flex:none;font:800 46px/.95 T;text-transform:uppercase}.row .g small{display:block;font:800 80px/.9 T;color:#c8322a}
.row ul{list-style:none;padding:0}.row li{font:600 33px/1.25 C;margin-bottom:10px}.row li b{font-weight:700}.row li span{color:#5f5d66;font-size:27px}`;
const giorni = [['Lun', 2, 2], ['Mar', 3, 0], ['Mer', 4, 1], ['Gio', 5, 1], ['Ven', 6, 1], ['Sab', 7, 3], ['Dom', 8, 0]];
const ag = [['Lun', 2, ['<b>Pescara</b>, corteo contro il caro vita <span>· 10:00, stazione Porta Nuova</span>', '<b>Torre del Greco</b>, assemblea per la Palestina <span>· corso Garibaldi</span>']],
 ['Mer', 4, ['<b>Napoli</b>, presidio dei lavoratori Mibex <span>· sotto la Regione, con FIOM, UILM, UGLM</span>']],
 ['Gio', 5, ['<b>Torino</b>, film e discussione sul clima <span>· Cascina Roccafranca</span>']],
 ['Ven', 6, ['<b>Voli</b>, sciopero dei controllori ENAV <span>· dalle 13. Se parti, controlla</span>']],
 ['Sab', 7, ['<b>Tivoli</b>, marcia per la pace <span>· 15:00, piazza della Queva</span>', '<b>Montale</b>, marcia contro l\'inceneritore <span>· 14:00, piazza Matteotti</span>', '<b>Gorizia</b>, corteo antifascista <span>· 15:30, parco della Rimembranza</span>']]];
const C20 = { Roma: [41.9028, 12.4964], Torino: [45.0711, 7.6852], Milano: [45.4639, 9.1906], Catanzaro: [38.9098, 16.5877], Cosenza: [39.2983, 16.2537], Crotone: [39.0808, 17.127], 'Reggio Calabria': [38.1113, 15.6473], 'Vibo Valentia': [38.6762, 16.1007], Firenze: [43.7697, 11.2547], Bologna: [44.4938, 11.3426], Pisa: [43.7147, 10.4018], Rimini: [44.0577, 12.5703] };
const S = [
`<div style="position:absolute;inset:0;padding:200px 80px 0"><p class="k">2 · 8 novembre</p><p style="font:800 170px/.86 T;text-transform:uppercase;margin-top:20px">Il 30 è<br>passato.<br><span style="color:#c8322a">Le piazze<br>no.</span></p>
<div style="display:flex;gap:14px;margin-top:70px">${giorni.map(([g, n, c]) => `<div style="flex:1;border:3px solid #1c1b1f;padding:14px 0 18px;text-align:center;background:${c ? '#1c1b1f' : 'none'};color:${c ? '#fff' : '#1c1b1f'}"><b style="font:800 30px T;text-transform:uppercase">${g}</b><p style="font:800 58px/1 T">${n}</p><p style="height:20px;margin-top:6px">${'<i style="display:inline-block;width:14px;height:14px;border-radius:50%;background:#c8322a;margin:0 3px"></i>'.repeat(c)}</p></div>`).join('')}</div>
<p style="font:600 38px/1.3 C;margin-top:40px">Questa settimana, giorno per giorno →</p></div>`,
`<div style="position:absolute;inset:0;padding:160px 80px 0"><p class="k" style="margin-bottom:22px">L'agenda della settimana</p>${ag.map(([g, n, l]) => `<div class="row"><p class="g">${g}<small>${n}</small></p><ul>${l.map((x) => `<li>${x}</li>`).join('')}</ul></div>`).join('')}</div>`,
`<div style="position:absolute;inset:0;background:#1c1b1f;color:#fff;padding:180px 80px 0"><p class="k" style="color:#ff8f86">Poi</p><p style="font:800 180px/.85 T;text-transform:uppercase;margin-top:16px">20<br>novembre</p>
<p style="font:800 56px/1 T;text-transform:uppercase;margin-top:20px">Sciopero generale CGIL</p><p style="font:600 38px/1.3 C;margin-top:24px;width:520px">Già 13 iniziative in 12 città. La tua manca? Aggiungila su <b>mappadellarivolta.org</b></p>
<svg viewBox="0 0 ${W} ${H}" style="position:absolute;right:60px;top:720px;width:400px;height:465px"><path d="${pathItalia}" fill="#2c2b30" stroke="#8a8790" stroke-width="2"/>${Object.values(C20).map(([la, ln]) => { const [x, y] = xy(la, ln); return `<circle cx="${x}" cy="${y}" r="13" fill="#8e1b5e" stroke="#fff" stroke-width="3"/>`; }).join('')}</svg>
</div>`,
`<div style="position:absolute;inset:0;background:#c8322a;color:#fff;padding:180px 80px 0"><p class="k" style="color:#ffd5d1">Non perderti la prossima</p>
<p style="font:800 128px/.88 T;text-transform:uppercase;margin-top:20px">Seguici.<br>Le piazze<br>te le portiamo<br>noi.</p>
<p style="font:600 40px/1.35 C;margin-top:40px">Ogni giorno a pranzo e la sera: dove si scende in piazza, chi la organizza e da dove viene la notizia.</p>
<div style="display:inline-flex;align-items:center;gap:22px;margin-top:50px;background:#fff;color:#1c1b1f;padding:22px 36px;border-radius:60px;font:800 52px T"><span style="background:#c8322a;color:#fff;border-radius:40px;padding:4px 22px;font-size:40px">+ Segui</span>@mappadellarivolta</div>
<p style="font:600 34px/1.3 C;margin-top:34px">E se la tua piazza manca, aggiungila tu su <b>mappadellarivolta.org</b></p>
<p style="position:absolute;left:80px;right:80px;bottom:60px;font:600 24px/1.35 C;color:#ffe1de">Fonti degli eventi su ogni scheda della mappa. La mappa riporta informazioni pubbliche con la loro fonte.</p></div>`];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
for (let i = 0; i < S.length; i++) { await p.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${S[i]}<div class="m" style="color:${i >= 2 ? '#fff' : '#1c1b1f'}"><i style="${i === 3 ? 'background:#fff' : ''}"></i>Mappa della Rivolta</div></body></html>`); await p.evaluate(() => document.fonts.ready);
  const f = await p.evaluate(() => [...document.querySelectorAll('p,li,div')].some((e) => e.getBoundingClientRect().bottom > 1350)); if (f) console.log('FUORI', i + 1);
  await p.screenshot({ path: `out/ag-0${i + 1}.png` }); }
await b.close();
