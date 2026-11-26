// Carosello "Venerdì 4 dicembre: cosa si ferma" (1080x1350, 5 slide). Uso: node dic4.mjs
// Dati: /api/mobilitazioni letto il 26/11/2026 (eventi del 4/12 in PUNTI) + verifica web (vedi bozze/2026-11-26-1215.md).
import { chromium } from 'playwright-core'; import { cssBase, CHROME, COL, W, H, pathItalia, xy } from './motore.mjs';
const PUNTI = [[41.9028, 12.4964, 'sciopero_generale'], [44.4072, 8.934, 'sciopero_categoria'], [44.6983, 10.6312, 'sciopero_categoria'], [41.9093, 12.5014, 'presidio']];
const mappa = (w, h, fondo, bordo) => `<svg viewBox="0 0 ${W} ${H}" style="width:${w}px;height:${h}px"><path d="${pathItalia}" fill="${fondo}" stroke="${bordo}" stroke-width="2"/>${PUNTI.map(([la, ln, t]) => { const [x, y] = xy(la, ln); return `<circle cx="${x}" cy="${y}" r="20" fill="${COL[t]}" stroke="#fff" stroke-width="5"/>`; }).join('')}</svg>`;
const css = cssBase.replace('height:1920px', 'height:1350px') + `.m{top:70px}.k{font:700 34px T;letter-spacing:.12em;text-transform:uppercase;color:#c8322a}
.h{font:800 112px/.9 T;text-transform:uppercase}.tx{font:600 42px/1.32 C}
.r{display:grid;grid-template-columns:300px 1fr;gap:30px;align-items:baseline;border-top:2px solid #3a383e;padding:26px 0}.r b{font:800 54px T;text-transform:uppercase}.r span{font:600 38px/1.25 C;color:#e8e4dd}.r small{display:block;font:600 28px C;color:#ff8f86;margin-top:4px}
.e{display:grid;grid-template-columns:34px 1fr;gap:18px;border-top:2px solid #d8d2c8;padding:26px 0}.e i{width:30px;height:30px;border-radius:50%;margin-top:6px}.e b{display:block;font:800 50px/1 T;text-transform:uppercase}.e span{font:600 38px/1.25 C;color:#4a474f}`;
const S = [
// 1. copertina: foglio di calendario
`<div style="position:absolute;inset:0;background:#c8322a;color:#fff">
<div style="position:absolute;left:80px;top:190px;width:470px;background:#fff;color:#1c1b1f;border-radius:30px;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,.25);transform:rotate(-4deg)">
<p style="background:#1c1b1f;color:#fff;font:800 60px T;text-transform:uppercase;text-align:center;padding:20px 0;letter-spacing:.08em">Dicembre</p>
<p style="font:800 330px/1 T;text-align:center;margin-top:10px">4</p><p style="font:700 54px T;text-transform:uppercase;text-align:center;padding-bottom:34px;color:#c8322a">Venerdì</p></div>
<div style="position:absolute;right:40px;top:150px;opacity:.95">${mappa(430, 500, '#a82820', '#a82820')}</div>
<div style="position:absolute;left:80px;right:80px;bottom:110px"><p style="font:800 132px/.88 T;text-transform:uppercase">Un venerdì,<br>tanti scioperi.</p>
<p class="tx" style="margin-top:26px;color:#ffe9e6">Chi si ferma, cosa rischia di fermarsi e dove. Salva il post.</p></div></div>`,
// 2. lo sciopero generale
`<div style="position:absolute;inset:0;background:#f6f3ee;padding:170px 80px 0"><p class="k">Venerdì 4 dicembre</p><p class="h" style="margin-top:14px;font-size:170px;color:${COL.sciopero_generale}">Sciopero<br>generale</p>
<p class="tx" style="margin-top:40px;font-size:48px">Proclamato da <b>CUB, SGB, ADL Varese, SI Cobas</b> e altri sindacati di base.</p>
<p class="tx" style="margin-top:26px;font-size:48px">Riguarda <b>tutte le categorie, pubbliche e private</b>. Il trasporto pubblico si ferma anche con USB.</p>
<div style="margin-top:44px;border-left:10px solid ${COL.sciopero_generale};padding:6px 0 6px 30px"><p style="font:700 30px T;letter-spacing:.1em;text-transform:uppercase;color:#8a8590">Cosa chiedono i promotori</p>
<p style="font:800 66px/1.05 T;text-transform:uppercase;margin-top:10px">Salari, sanità, scuola, pensioni, diritto di sciopero.</p></div></div>`,
// 3. possibili disagi
`<div style="position:absolute;inset:0;background:#1c1b1f;color:#fff;padding:160px 70px 0"><p class="k" style="color:#ff8f86">Se devi spostarti</p><p class="h" style="margin:12px 0 30px">Possibili disagi</p>
${[['Treni', 'dalle 21 di gio 3 alle 21 di ven 4', 'treni garantiti sul sito di Trenitalia'], ['Autostrade', 'dalle 22 di gio 3 alle 22 di ven 4'], ['Bus e metro', 'orari diversi in ogni città', "controlla il sito dell'azienda"], ['Aerei', 'orari ancora da confermare'], ['Vigili del fuoco', 'dalle 9 alle 13']].map(([a, b, c]) => `<div class="r"><b>${a}</b><span>${b}${c ? `<small>${c}</small>` : ''}</span></div>`).join('')}
<p style="position:absolute;left:70px;right:70px;bottom:60px;font:600 28px/1.35 C;color:#b9b4bd">I servizi minimi e le fasce di garanzia restano. Ricontrolla il giorno prima: uno sciopero può essere revocato o spostato.</p></div>`,
// 4. sulla mappa quel giorno
`<div style="position:absolute;inset:0;background:#f6f3ee;padding:170px 80px 0"><p class="k">Sulla mappa, quel giorno</p><p class="h" style="font-size:96px;margin-top:14px">Non solo<br>lo sciopero generale</p>
<div style="margin-top:40px">${[[COL.presidio, 'Roma · ore 11', 'Presidio USB davanti al Ministero dei Trasporti, piazzale di Porta Pia'], [COL.sciopero_categoria, 'Liguria · 24 ore', 'Sciopero regionale della sanità (Fp CGIL, Uil Fp)'], [COL.sciopero_categoria, 'Reggio Emilia', 'Sciopero dei lavoratori del gruppo Iren (Filctem, Femca, Flaei, Uiltec, Fp CGIL)'], [COL.sciopero_categoria, 'Tutta Italia', 'Vigili del fuoco, dalle 9 alle 13']].map(([c, a, b]) => `<div class="e"><i style="background:${c}"></i><div><b>${a}</b><span>${b}</span></div></div>`).join('')}</div></div>`,
// 5. chiusura
`<div style="position:absolute;inset:0;background:#c8322a;color:#fff;padding:190px 80px 0"><p class="k" style="color:#ffd5d1">Mancano 8 giorni</p><p style="font:800 124px/.88 T;text-transform:uppercase;margin-top:16px">C'è un presidio<br>nella tua città?</p>
<p class="tx" style="margin-top:30px;color:#ffe9e6">Aggiungilo su mappadellarivolta.org con il link al comunicato. Senza registrarti.</p><p class="tx" style="margin-top:18px;color:#ffe9e6">Gli eventi del 4 li trovi tutti con il filtro «Un giorno preciso».</p>
<div style="display:inline-flex;align-items:center;gap:22px;margin-top:44px;background:#fff;color:#1c1b1f;padding:20px 34px;border-radius:60px;font:800 50px T"><span style="background:#c8322a;color:#fff;border-radius:40px;padding:4px 22px;font-size:38px">+ Segui</span>@mappadellarivolta</div>
<p style="font:600 30px C;margin-top:34px">♥ Gratis e senza pubblicità: se puoi, sostienila con un caffè.</p>
<p style="position:absolute;left:80px;right:80px;bottom:52px;font:600 23px/1.4 C;color:#ffe1de">Fonti: schede della mappa, CUB, CISL, USB, MIT, Teleborsa, Virgilio Notizie. La mappa riporta informazioni pubbliche con la loro fonte.</p></div>`];
const b = await chromium.launch({ executablePath: CHROME, args: ['--lang=it-IT'] });
const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
for (let i = 0; i < S.length; i++) { const dk = i !== 1 && i !== 3; await p.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${S[i]}<div class="m" style="color:${dk ? '#fff' : '#1c1b1f'}"><i style="${i === 0 || i === 4 ? 'background:#fff' : ''}"></i>Mappa della Rivolta</div></body></html>`); await p.evaluate(() => document.fonts.ready);
  const f = await p.evaluate(() => Math.max(...[...document.querySelectorAll('p,div.r,div.e')].map((e) => e.getBoundingClientRect().bottom))); if (f > 1330) console.log('FUORI', i + 1, f);
  await p.screenshot({ path: `out/d4-0${i + 1}.png` }); }
await b.close(); console.log('ok');
