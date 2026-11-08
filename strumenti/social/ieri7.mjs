import fs from 'node:fs'; import { chromium } from 'playwright-core'; import { cssBase, pathItalia, xy, W, H } from './motore.mjs';
const im = (f) => 'data:image/jpeg;base64,' + fs.readFileSync(f).toString('base64');
const css = cssBase.replace('height:1920px', 'height:1350px') + `.m{top:70px}.k{font:700 34px T;letter-spacing:.12em;text-transform:uppercase;color:#c8322a}`;
const CITTA = ['Torino', 'Genova', 'Lecco', 'Cremona', 'Reggio Emilia', 'Bologna', 'Pistoia', 'Montale', 'Firenze', 'Udine', 'Gorizia', 'Tivoli', 'Lecce'];

const CT = [['Torino', 45.071, 7.686, 'Studenti, lavoratori e agricoltori nello stesso corteo.', ['Alcune migliaia in corteo da piazza Castello verso via Po e piazza Vittorio.', 'In testa un trattore degli agricoltori, dietro lo striscione «No al carovita, vogliamo dignità».'], 'Il Fatto Quotidiano, 7/11'],
 ['Milano', 45.464, 9.190, 'Una festa per chiedere di tassare i più ricchi.', ['All\'Arco della Pace il «Tax the Rich party»: musica, dibattiti e interventi.', 'Promosso dal comitato 1% equo.'], 'Alanews, Tgcom24, 7/11'],
 ['Genova', 44.407, 8.934, 'Contro carovita, riarmo e tagli ai servizi pubblici.', ['Ritrovo in piazza De Ferrari, corteo verso Principe.', 'Promosso dal comitato Italia in piazza.'], 'Genova Quotidiana, Primocanale'],
 ['Bologna', 44.494, 11.343, 'Fuori dal centro, in piazza lo stesso.', ['La Questura non ha autorizzato il corteo in centro: il ritrovo si è spostato in piazza della Pace, zona stadio.', 'Promosso da Bologna in piazza.'], 'il Resto del Carlino']];
const citta = ([c, la, ln, t, f, src]) => { const [x, y] = xy(la, ln); return `<div style="position:absolute;inset:0;background:#1c1b1f;color:#fff;padding:200px 80px 0;overflow:hidden">
<svg viewBox="0 0 ${W} ${H}" style="position:absolute;right:-150px;top:300px;width:860px;height:1000px;opacity:.95"><path d="${pathItalia}" fill="#2c2b30" stroke="#5f5d66" stroke-width="2"/><circle cx="${x}" cy="${y}" r="40" fill="#c8322a" opacity=".25"/><circle cx="${x}" cy="${y}" r="14" fill="#c8322a" stroke="#fff" stroke-width="4"/></svg>
<div style="position:relative"><p class="k" style="color:#ff8f86">Sabato 7 novembre</p><p style="font:800 220px/.85 T;text-transform:uppercase;margin-top:12px">${c}</p>
<p style="font:800 72px/1 T;text-transform:uppercase;margin-top:40px;width:760px">${t}</p>
${f.map((x) => `<p style="font:600 42px/1.35 C;margin-top:30px;width:660px;padding:6px 0 6px 26px;border-left:6px solid #c8322a;background:linear-gradient(90deg,#1c1b1fee 70%,#1c1b1f00)">${x}</p>`).join('')}</div>
<p style="position:absolute;left:80px;right:80px;bottom:52px;font:600 24px/1.4 C;color:#c9c5bf">Fonte: ${src}</p></div>`; };
const S = [
`<div style="position:absolute;inset:0;background:#1c1b1f;color:#fff;overflow:hidden"><img src="${im('cr7/amnesty.jpg')}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 100%"><div style="position:absolute;inset:0;background:linear-gradient(#000d,#0009 38%,#0000 58%)"></div>
<div style="position:absolute;left:80px;right:80px;top:150px"><p style="display:inline-block;font:800 38px T;text-transform:uppercase;background:#c8322a;padding:6px 18px;transform:rotate(-2deg)">Sabato 7 novembre</p><p style="font:800 140px/.86 T;text-transform:uppercase;margin-top:24px">Ieri 13 città.<br><span style="color:#ff8f86">Il 20 tutta Italia.</span></p></div>
<p style="position:absolute;right:30px;top:1300px;font:600 20px C;color:#fffa">Cremona, 7 novembre</p></div>`,
`<div style="position:absolute;inset:0;background:#1c1b1f;color:#fff;overflow:hidden"><img src="${im('cr7/via.jpg')}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 70%"><div style="position:absolute;inset:0;background:linear-gradient(#0000 35%,#000e 72%)"></div>
<div style="position:absolute;left:70px;right:70px;bottom:90px"><p class="k" style="color:#ff8f86">Ieri in piazza</p><p style="font:800 70px/1 T;text-transform:uppercase;margin-top:12px">Da Torino a Lecce</p>
<div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:22px">${CITTA.map((c) => `<span style="font:800 32px T;text-transform:uppercase;border:2px solid #fff9;border-radius:30px;padding:6px 18px">${c}</span>`).join('')}</div></div>
<p style="position:absolute;right:30px;top:1300px;font:600 20px C;color:#fffa">Cremona, corteo di studenti e lavoratori</p></div>`,
...CT.map(citta),
`<div style="position:absolute;inset:0;background:#c8322a;color:#fff;padding:200px 80px 0"><p class="k" style="color:#ffd5d1">Grazie</p><p style="font:800 120px/.88 T;text-transform:uppercase;margin-top:16px">A chi ha<br>manifestato<br>pacificamente.</p>
<p style="font:600 42px/1.35 C;margin-top:34px">E a chi ha aggiunto le piazze sulla mappa: mercoledì erano 9, sabato 13.</p>
<div style="margin-top:50px;background:#fff;color:#1c1b1f;border-radius:24px;padding:30px 36px"><p class="k">Tra 12 giorni</p><p style="font:800 76px/1 T;text-transform:uppercase;margin-top:8px">20 novembre</p><p style="font:600 36px/1.3 C;margin-top:8px">Sciopero generale: già <b>36 città</b> sulla mappa.</p></div></div>`,
`<div style="position:absolute;inset:0;background:#1c1b1f;color:#fff;padding:200px 80px 0"><p class="k" style="color:#ff8f86">Eri in piazza anche tu?</p><p style="font:800 124px/.88 T;text-transform:uppercase;margin-top:16px">Mandaci<br>le tue foto.</p>
<p style="font:600 42px/1.35 C;margin-top:30px">Taggaci nelle storie o scrivici in privato. Le pubblichiamo con i volti sfocati.</p>
<div style="display:inline-flex;align-items:center;gap:22px;margin-top:44px;background:#fff;color:#1c1b1f;padding:20px 34px;border-radius:60px;font:800 50px T"><span style="background:#c8322a;color:#fff;border-radius:40px;padding:4px 22px;font-size:38px">+ Segui</span>@mappadellarivolta</div>
<p style="font:600 32px/1.3 C;margin-top:30px;color:#e8e4dd">♥ La mappa è gratis: se puoi, sostienila con un caffè.</p>
<p style="position:absolute;left:80px;right:80px;bottom:52px;font:600 23px/1.4 C;color:#c9c5bf">Fonti: schede della mappa. Foto dalla community, volti sfocati. La mappa riporta informazioni pubbliche con la loro fonte.</p></div>`];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
for (let i = 0; i < S.length; i++) { await p.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${S[i]}<div class="m" style="color:#fff"><i style="${i === 6 ? 'background:#fff' : ''}"></i>Mappa della Rivolta</div></body></html>`); await p.evaluate(() => document.fonts.ready);
  const f = await p.evaluate(() => Math.max(...[...document.querySelectorAll('p,div')].map((e) => e.getBoundingClientRect().bottom))); if (f > 1352) console.log('FUORI', i + 1, f);
  await p.screenshot({ path: `out/i7-0${i + 1}.png` }); }
await b.close();
