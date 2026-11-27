// Carosello CURIOSITÀ "Da «onore» a reato" (1080x1350, 6 slide). Uso: node onore.mjs
// Sabato 28/11/2026, giorno del corteo nazionale di Non Una Di Meno a Roma (evento verificato sulla mappa, letto il 27/11).
// Fatti verificati il 27/11 (vedi bozze/2026-11-28-1215.md): L. 442/1981, L. 66/1996, L. 77/2013, L. 69/2019, legge sul femminicidio (Camera 25/11/2025, in vigore 17/12/2025), ONU ris. 54/134 (1999).
import { chromium } from 'playwright-core'; import { cssBase, CHROME, pathItalia, W, H, xy } from './motore.mjs';
const css = cssBase.replace('height:1920px', 'height:1350px') + `.m{top:70px}.k{font:700 34px T;letter-spacing:.12em;text-transform:uppercase;color:#c8322a}
.h{font:800 112px/.9 T;text-transform:uppercase}.tx{font:600 42px/1.32 C}
.y{display:grid;grid-template-columns:180px 1fr;gap:30px;align-items:baseline;padding:22px 0;border-top:2px solid #d8d2c8}.y>b{font:800 72px/1 T}.y span{font:600 38px/1.28 C}.y small{display:block;font:600 27px C;color:#8a8590;margin-top:6px}
.dk .y{border-color:#3a383e}.dk .y>b{color:#ff8f86}.dk .y small{color:#b9b4bd}`;
const [rx, ry] = xy(41.9028, 12.4964);
const S = [
// 1. copertina
`<div style="position:absolute;inset:0;background:#1c1b1f;color:#fff;padding:230px 80px 0;overflow:hidden">
<svg viewBox="0 0 ${W} ${H}" style="position:absolute;right:-150px;top:330px;width:640px;height:744px;opacity:.9"><path d="${pathItalia}" fill="#2c2a31"/><circle cx="${rx}" cy="${ry}" r="22" fill="#c8322a" stroke="#fff" stroke-width="6"/></svg>
<div style="position:relative"><p class="k" style="color:#ff8f86">Lo sapevi?</p>
<p style="font:800 150px/.86 T;text-transform:uppercase;margin-top:22px">Fino al 1981<br>uccidere<br>«per onore»<br><span style="color:#ff8f86">costava<br>meno.</span></p>
<p class="tx" style="margin-top:40px;max-width:640px;color:#e8e4dd">Oggi a Roma c'è il corteo nazionale contro la violenza di genere. Ecco da dove arriviamo.</p></div>
<p style="position:absolute;left:80px;bottom:70px;font:700 30px T;letter-spacing:.1em;text-transform:uppercase;color:#ff8f86">Scorri →</p></div>`,
// 2. perché il 25 novembre
`<div style="position:absolute;inset:0;background:#f6f3ee;padding:180px 80px 0"><p class="k">Perché il 25 novembre</p>
<p class="h" style="margin-top:16px;font-size:120px">Tre sorelle,<br>una data.</p>
<p class="tx" style="margin-top:50px;font-size:50px">Il <b>25 novembre 1960</b> Patria, Minerva e María Teresa <b>Mirabal</b>, attiviste contro la dittatura di Trujillo, vengono uccise nella Repubblica Dominicana.</p>
<p class="tx" style="margin-top:36px;font-size:50px">Nel <b>1999</b> l'Assemblea generale dell'ONU sceglie quel giorno per la <b>Giornata internazionale per l'eliminazione della violenza contro le donne</b>.</p>
<p style="position:absolute;left:80px;bottom:70px;font:600 27px C;color:#8a8590">Risoluzione ONU 54/134 del 17 dicembre 1999.</p></div>`,
// 3. 1981 e 1996
`<div class="dk" style="position:absolute;inset:0;background:#1c1b1f;color:#fff;padding:170px 70px 0"><p class="k" style="color:#ff8f86">In Italia</p><p class="h" style="margin:12px 0 30px">Da «onore» a reato</p>
<div class="y"><b>1981</b><span>Spariscono il <b>delitto d'onore</b>, punito con 3-7 anni invece che come un omicidio, e il <b>matrimonio riparatore</b>: chi violentava una donna e poi la sposava cancellava il reato.<small>Legge 442 del 5 agosto 1981</small></span></div>
<div class="y"><b>1996</b><span>La violenza sessuale smette di essere un reato «contro la morale pubblica». Diventa un reato <b>contro la persona</b>.<small>Legge 66 del 15 febbraio 1996</small></span></div></div>`,
// 4. 2013-2025
`<div style="position:absolute;inset:0;background:#f6f3ee;padding:170px 70px 0"><p class="k">E poi</p><p class="h" style="margin:12px 0 24px;font-size:96px">Le leggi più recenti</p>
<div class="y"><b>2013</b><span>L'Italia ratifica la <b>Convenzione di Istanbul</b> del Consiglio d'Europa sulla violenza contro le donne.<small>Legge 77 del 27 giugno 2013</small></span></div>
<div class="y"><b>2019</b><span><b>Codice rosso</b>: chi denuncia maltrattamenti, violenza sessuale o stalking va ascoltata dal pubblico ministero entro 3 giorni.<small>Legge 69 del 19 luglio 2019</small></span></div>
<div class="y"><b>2025</b><span>Il <b>femminicidio</b> diventa un reato a sé. La Camera lo approva all'unanimità il 25 novembre.<small>In vigore dal 17 dicembre 2025</small></span></div></div>`,
// 5. numeri utili
`<div style="position:absolute;inset:0;background:#c8322a;color:#fff;padding:220px 80px 0"><p class="k" style="color:#ffd5d1">Da salvare</p>
<p style="font:800 330px/.85 T;margin-top:20px">1522</p>
<p style="font:800 64px/1 T;text-transform:uppercase;margin-top:10px">Numero antiviolenza e stalking</p>
<p class="tx" style="margin-top:30px;color:#ffe9e6">Gratuito, 24 ore su 24, anche in chat. Risponde in più lingue e indirizza ai centri antiviolenza vicini.</p>
<p class="tx" style="margin-top:30px;color:#fff"><b>In pericolo adesso: 112.</b></p>
<p style="position:absolute;left:80px;bottom:70px;font:600 27px C;color:#ffd5d1">Servizio del Dipartimento per le Pari Opportunità.</p></div>`,
// 6. chiusura
`<div style="position:absolute;inset:0;background:#f6f3ee;padding:180px 80px 0"><p class="k">Oggi, sabato 28 novembre</p><p class="h" style="margin-top:14px;font-size:104px">Roma, corteo<br>nazionale</p>
<p class="tx" style="margin-top:30px">Promosso da <b>Non Una Di Meno</b>. Partenza alle <b>14:30 da piazza della Repubblica</b>, arrivo a piazzale Ostiense.</p>
<p class="tx" style="margin-top:20px;color:#4a474f">Bus deviati in centro fino a sera: aggiornamenti su Roma Mobilità.</p>
<div style="display:inline-flex;align-items:center;gap:22px;margin-top:44px;background:#1c1b1f;color:#fff;padding:20px 34px;border-radius:60px;font:800 50px T"><span style="background:#c8322a;color:#fff;border-radius:40px;padding:4px 22px;font-size:38px">+ Segui</span>@mappadellarivolta</div>
<p style="font:600 30px C;margin-top:30px;color:#4a474f">Manda il post a chi non conosceva questa storia.</p>
<p style="position:absolute;left:80px;right:80px;bottom:52px;font:600 23px/1.4 C;color:#6a6670">Fonti: Gazzetta Ufficiale, Camera dei deputati, ONU, Dipartimento Pari Opportunità, scheda della mappa (Non Una Di Meno), Roma Mobilità via La Capitale. La mappa riporta informazioni pubbliche con la loro fonte.</p></div>`];
const DARK = [true, false, true, false, true, false];
const b = await chromium.launch({ executablePath: CHROME, args: ['--lang=it-IT'] });
const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
for (let i = 0; i < S.length; i++) { const dk = DARK[i];
  await p.setContent(`<!doctype html><html lang="it"><head><meta charset="utf-8"><style>${css}</style></head><body>${S[i]}<div class="m" style="color:${dk ? '#fff' : '#1c1b1f'}"><i style="${i === 4 ? 'background:#fff' : ''}"></i>Mappa della Rivolta</div></body></html>`); await p.evaluate(() => document.fonts.ready);
  const f = await p.evaluate(() => Math.max(...[...document.querySelectorAll('p,div.y')].filter((e) => getComputedStyle(e).position !== 'absolute').map((e) => e.getBoundingClientRect().bottom))); if (f > 1240) console.log('FUORI', i + 1, f);
  await p.screenshot({ path: `out/on-0${i + 1}.png` }); }
await b.close(); console.log('ok');
