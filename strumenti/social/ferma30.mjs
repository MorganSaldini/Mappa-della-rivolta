import fs from 'node:fs'; import { chromium } from 'playwright-core'; import { cssBase } from './motore.mjs';
const [N, NC] = [105, 65], tot = 6;
const css = cssBase + `*{box-sizing:border-box;margin:0}body{width:1080px;height:auto;font-family:C;color:#1c1b1f;background:#f6f3ee;overflow:hidden}
.p{position:relative;width:1080px;height:1350px;padding:70px;display:flex;flex-direction:column}
.m{position:static;top:auto;left:auto;font:700 32px T;letter-spacing:.14em;text-transform:uppercase;display:flex;align-items:center;gap:14px}.m i{width:20px;height:20px;border-radius:50%;background:#c8322a}
.n{position:absolute;top:72px;right:70px;font:700 30px T;letter-spacing:.1em;opacity:.55}
h1{font:800 118px/.92 T;text-transform:uppercase;margin-top:10px}h1 em{font-style:normal;color:#8e1b5e}
.k{font:700 32px T;letter-spacing:.12em;text-transform:uppercase;color:#8e1b5e;margin-top:34px}
.f{display:flex;justify-content:space-between;align-items:center;border-top:3px solid currentColor;padding-top:22px;font:800 46px T;margin-top:auto}.f span{font:600 28px C;opacity:.7}
.b{display:flex;gap:24px;align-items:flex-start;padding:20px 0;border-bottom:2px solid #d9d3c8}.b .i{flex:none;font-size:52px;width:70px}.b h3{font:800 44px/1 T;text-transform:uppercase}.b p{font:400 31px/1.3 C;margin-top:8px}.b p b{font-weight:700}
.scuro{background:#1c1b1f;color:#fff}.vino{background:#8e1b5e;color:#fff}.t{font:400 38px/1.32 C;margin-top:26px}.fonte{font:600 25px/1.35 C;opacity:.7;margin-top:18px}`;
const testa = (i) => `<div class="m"><i></i>Mappa della Rivolta</div><div class="n">${i}/${tot}</div>`;
const bl = (i, h, p) => `<div class="b"><div class="i">${i}</div><div><h3>${h}</h3><p>${p}</p></div></div>`;
const S = [
`<div class="p vino">${testa(1)}<p class="k" style="color:#ffd0e2">Venerdì 30 ottobre · aggiornato al 28/10</p><h1 style="font-size:150px;margin-top:40px">Cosa<br>si ferma<br><span style="color:#ffd0e2">il 30</span></h1>
<p class="t">Sciopero generale nazionale di 24 ore, settori pubblici e privati.</p><p class="t">Proclamato da <b>USB</b>, <b>USI-CIT</b> e altre sigle di base.</p>
<div class="f">Treni, bus, scuola, sanità<span>scorri ›</span></div></div>`,
`<div class="p">${testa(2)}<p class="k">Treni</p><h1>Dalle 21 di giovedì<br><em>alle 20:59 di venerdì</em></h1><div style="margin-top:20px">
${bl('🚆', 'Regionali garantiti', 'Nelle fasce <b>6–9</b> e <b>18–21</b> di venerdì.')}
${bl('🚄', 'Lunga percorrenza', 'Circolano i treni della tabella dei servizi minimi.')}
${bl('🌙', 'Giovedì sera', 'Viaggiano i treni in partenza entro le 21 con arrivo entro le 22.')}
${bl('📋', 'Lombardia', 'Trenord ha pubblicato l\'elenco dei treni garantiti.')}</div>
<p class="fonte">Orari proclamati dall'USB: sull'ordinanza dei trasporti vedi la slide 4. Fonti: Agenzia Dire, Sbircialanotizia, Mobilita.news</p><div class="f">mappadellarivolta.org<span>scorri ›</span></div></div>`,
`<div class="p">${testa(3)}<p class="k">Bus, metro, aerei, autostrade</p><h1>Dipende<br><em>dalla città</em></h1><div style="margin-top:16px">
${bl('🚌', 'Bus e metro', '<b>Roma</b>: servizio fino alle 8:29 e dalle 17 alle 19:59. <b>Napoli</b>: 5:30–8:30 e 17–20. <b>Milano</b>: ATM non sciopera. Altre città: guarda la tua azienda.')}
${bl('✈️', 'Aerei', 'Dal 30 ottobre al 5 novembre c\'è la franchigia ENAC, in cui il trasporto aereo non dovrebbe scioperare. L\'USB ha comunque proclamato lo stop e a Pisa e Firenze è annunciato lo sciopero dei servizi di terra: controlla la tua compagnia.')}
${bl('🛣️', 'Autostrade', 'Il personale si ferma dalle 22 di giovedì.')}</div>
<p class="fonte">Fonti: Agenzia Dire, Trasporti-Italia, Lentepubblica</p><div class="f">mappadellarivolta.org<span>scorri ›</span></div></div>`,
`<div class="p">${testa(4)}<p class="k">Trasporti · 28 ottobre</p><h1 style="font-size:108px">L'ordinanza<br><em>sui trasporti</em></h1>
<p class="t">Il <b>Ministero dei Trasporti</b> ha chiesto di rinviare lo sciopero in treni, bus, metro, aerei, navi, taxi e autostrade, per la franchigia dei giorni dei defunti.</p>
<p class="t">L'<b>USB</b> ha dichiarato che conferma comunque lo sciopero per tutta la giornata.</p>
<p class="t" style="font-weight:700">Per chi viaggia: possibili disagi. Controlla gli avvisi della tua azienda di trasporto prima di partire.</p>
<p class="fonte">Fonti: SoldiOnline, Mobilita.news (28 ottobre)</p><div class="f">mappadellarivolta.org<span>scorri ›</span></div></div>`,
`<div class="p">${testa(5)}<p class="k">Scuola, sanità, uffici</p><h1>Il resto<br><em>della giornata</em></h1><div style="margin-top:16px">
${bl('🏫', 'Scuola', 'Docenti e personale ATA possono aderire. Nessuna chiusura automatica: guarda le comunicazioni della tua scuola.')}
${bl('🏥', 'Sanità', 'Dal primo all\'ultimo turno. Emergenze e urgenze sono garantite; possibili rinvii di visite ed esami non urgenti.')}
${bl('🏛️', 'Uffici pubblici', 'Possibili rallentamenti o chiusure negli uffici comunali e ministeriali.')}
${bl('⚓', 'Porti', 'Annunciata la mobilitazione dei portuali in molti scali.')}</div>
<p class="fonte">Fonti: Lentepubblica, Agenzia Dire, Mobilita.news</p><div class="f">mappadellarivolta.org<span>scorri ›</span></div></div>`,
`<div class="p scuro">${testa(6)}<h1 style="font-size:116px;margin-top:40px">Prima<br><em style="color:#ff8fb8">di uscire</em></h1>
<p class="t" style="color:#e8e4dd">Controlla gli avvisi della tua azienda di trasporto, della scuola e dell'ospedale: le regole possono cambiare fino all'ultimo.</p>
<p class="t" style="color:#fff"><b>Sulla mappa ci sono ${N} iniziative in ${NC} comuni</b> per il 30, ognuna con la sua fonte.</p>
<p class="fonte" style="margin-top:40px">La mappa riporta informazioni pubbliche con la loro fonte.</p>
<div class="f">mappadellarivolta.org<span>link in bio</span></div></div>`];
fs.mkdirSync('out/ferma30', { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const [i, h] of S.entries()) { const pg = await b.newPage({ viewport: { width: 1080, height: 1350 } });
  await pg.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${h}</body></html>`); await pg.evaluate(() => document.fonts.ready);
  const over = await pg.evaluate(() => { const f = document.querySelector('.f').getBoundingClientRect().top; return [...document.querySelectorAll('.p > *:not(.f):not(.n)')].some((e) => e.getBoundingClientRect().bottom > f - 4); });
  console.log(i + 1, over ? 'FUORI' : 'ok'); await pg.screenshot({ path: `out/ferma30/ferma-${i + 1}.png` }); await pg.close(); }
await b.close();
