import fs from 'node:fs'; import { chromium } from 'playwright-core'; import { cssBase } from './motore.mjs';
const bg = 'data:image/jpeg;base64,' + fs.readFileSync('foto30/brescia.jpg').toString('base64');
const css = cssBase.replace('height:1920px', 'height:1350px') + `.m{top:70px}.k{font:700 34px T;letter-spacing:.12em;text-transform:uppercase;color:#c8322a}
.tl{position:relative;margin-top:30px;padding-left:200px}.tl:before{content:'';position:absolute;left:150px;top:10px;bottom:10px;width:6px;background:#c8322a;border-radius:3px}
.h{position:relative;margin-bottom:58px}.h u{position:absolute;left:-215px;top:4px;width:140px;text-align:right;font:800 62px T;text-decoration:none;color:#c8322a}
.h:before{content:'';position:absolute;left:-63px;top:16px;width:26px;height:26px;border-radius:50%;background:#f6f3ee;border:6px solid #c8322a}
.h b{display:block;font:800 80px/.95 T;text-transform:uppercase}.h span{display:block;font:600 42px/1.25 C;margin-top:6px}.h small{display:block;font:600 33px/1.3 C;color:#6b6770;margin-top:4px}
.g{display:grid;grid-template-columns:1fr 1fr;gap:22px;margin-top:34px}.c{background:#fff;border-radius:22px;padding:40px 34px;min-height:270px;border-left:10px solid #c8322a}.c b{display:block;font:800 74px/.95 T;text-transform:uppercase}.c span{display:block;font:600 37px/1.25 C;margin-top:10px}.c small{display:block;font:600 31px/1.3 C;color:#6b6770;margin-top:6px}`;
const paper = (k, tit, body) => `<div style="position:absolute;inset:0;background:#f6f3ee;color:#1c1b1f;padding:165px 80px 0"><p class="k">${k}</p><p style="font:800 104px/.9 T;text-transform:uppercase;margin-top:12px">${tit}</p>${body}</div>`;
const h = (o, c, l, n) => `<div class="h"><u>${o}</u><b>${c}</b><span>${l}</span>${n ? `<small>${n}</small>` : ''}</div>`;
const S = [
`<div style="position:absolute;inset:0;background:url(${bg}) center/cover"></div><div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(20,18,22,.3),rgba(20,18,22,.1) 30%,rgba(20,18,22,.94) 70%)"></div>
<div style="position:absolute;left:80px;right:80px;bottom:110px;color:#fff"><p style="font:700 40px T;letter-spacing:.12em;text-transform:uppercase;color:#ff8f86">Domani, sabato 14</p><p style="font:800 156px/.86 T;text-transform:uppercase;margin-top:14px">Ora per<br>ora.</p><p style="font:600 44px/1.3 C;margin-top:26px">Dalle 10 del mattino a sera, 9 città in piazza. Scorri e scegli la tua.</p></div>`,
paper('Mattina', 'Si parte presto', `<div class="tl" style="margin-top:56px">
${h('10:00', 'Perugia', 'Piazza Grimana, fino alle 20', 'Costruiamo la città che vogliamo: associazioni, studenti, produttori locali')}
${h('10:30', 'Piacenza', 'Stazione FS', 'Staffetta antifascista con il Coro Infrangibile')}
${h('13:00', 'Bologna', 'Piazza del Nettuno, fino alle 15', 'Presidio di chi lavora nelle farmacie private (FILCAMS-CGIL)')}</div>`),
paper('Le 14:00', 'Quattro cortei<br>alla stessa ora', `<div class="g">
<div class="c"><b>Milano</b><span>Piazza Leonardo da Vinci</span><small>Contro il carovita</small></div>
<div class="c"><b>Brescia</b><span>Largo Formentone</span><small>Contro il carovita</small></div>
<div class="c"><b>Verona</b><span>Piazza Bra, fino alle 19</span><small>Corteo silenzioso per Gaza</small></div>
<div class="c"><b>Roma</b><span>Piazza Vittorio, poi Circo Massimo</span><small>Climate Pride</small></div></div>
<p style="font:600 42px/1.35 C;margin-top:48px">Il carovita è lo stesso motivo dello sciopero di venerdì 20. Sabato è un primo assaggio.</p>`),
paper('Pomeriggio', 'Fino a sera', `<div class="tl" style="margin-top:56px">
${h('15:00', 'Bolzano', 'Parco della Stazione', 'Corteo "Rivolta degli alberi"')}
${h('16:00', 'Torino', 'Piazza Castello, fino alle 19:30', 'Casa del popolo in piazza')}</div>
<div style="margin-top:40px;background:#1c1b1f;color:#fff;border-radius:22px;padding:40px 42px"><p style="font:700 30px T;letter-spacing:.1em;text-transform:uppercase;color:#ffd23f">Possibili disagi</p><p style="font:600 40px/1.3 C;margin-top:10px">Bari: sciopero del trasporto urbano AMTAB per tutta la giornata.</p></div>`),
`<div style="position:absolute;inset:0;background:#c8322a;color:#fff;padding:190px 80px 0"><p class="k" style="color:#ffd5d1">Sabato 14 · poi venerdì 20</p><p style="font:800 140px/.88 T;text-transform:uppercase;margin-top:16px">Condividi<br>con chi vuole<br>scioperare.</p>
<div style="display:inline-flex;align-items:center;gap:22px;margin-top:44px;background:#fff;color:#1c1b1f;padding:20px 34px;border-radius:60px;font:800 50px T"><span style="background:#c8322a;color:#fff;border-radius:40px;padding:4px 22px;font-size:38px">+ Segui</span>@mappadellarivolta</div>
<p style="font:600 34px/1.35 C;margin-top:40px;color:#ffe9e6">Manca la piazza della tua città? Aggiungila su mappadellarivolta.org con il link alla locandina.</p>
<p style="font:600 30px C;margin-top:26px">♥ Gratis e senza pubblicità: se puoi, sostienila con un caffè.</p>
<p style="position:absolute;left:80px;right:80px;bottom:52px;font:600 23px/1.4 C;color:#ffe1de">Fonti: schede della mappa (locandine degli organizzatori, CGIL, MIT). La mappa riporta informazioni pubbliche con la loro fonte.</p></div>`];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--lang=it-IT'] });
const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
for (let i = 0; i < S.length; i++) { const dk = i === 0 || i === 4; await p.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${S[i]}<div class="m" style="color:${dk ? '#fff' : '#1c1b1f'}"><i style="${i === 4 ? 'background:#fff' : ''}"></i>Mappa della Rivolta</div></body></html>`); await p.evaluate(() => document.fonts.ready);
  const f = await p.evaluate(() => Math.max(...[...document.querySelectorAll('p,div.h,div.c,small')].map((e) => e.getBoundingClientRect().bottom))); if (f > 1330) console.log('FUORI', i + 1, f);
  await p.screenshot({ path: `out/s14-0${i + 1}.png` }); }
await b.close(); console.log('ok');
