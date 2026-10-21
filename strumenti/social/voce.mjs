// Carosello 1080x1350 "Perché far sentire la propria voce" (6 slide). Uso: node voce.mjs <cartella_uscita>
// Dati verificati il 21/10/2026 (vedi bozze/2026-10-22-1915.md). Conteggi dei titoli dalla mappa letta il 21/10 sera.
import fs from 'node:fs'; import { cssBase } from './motore.mjs'; import { chromium } from 'playwright-core';
const [OUT = 'out/voce'] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
const TOT = 129, TEMI = [['Caro vita', 44], ['Guerra e riarmo', 38], ['Scuola e studenti', 34]];
const css = cssBase.replace('body{width:1080px;height:1920px', 'body{width:1080px;height:1350px') + `
.p{position:relative;height:1350px;padding:70px;display:flex;flex-direction:column}
.m{position:static}.n{position:absolute;top:70px;right:70px;font:700 30px T;letter-spacing:.1em;color:#8d8a93}
.k{font:700 34px T;letter-spacing:.14em;text-transform:uppercase;color:#c8322a;margin-top:50px}
h1{font:800 128px/.9 T;text-transform:uppercase;margin-top:10px}h1 em{font-style:normal;color:#c8322a}
.b{font:400 40px/1.32 C;color:#2b2a30;margin-top:30px}.b b{font-weight:700;color:#1c1b1f}
.f{margin-top:auto;display:flex;justify-content:space-between;align-items:center;border-top:3px solid currentColor;padding-top:20px;font:800 46px T}.f span{font:600 30px C;opacity:.7}
.dk{background:#1c1b1f;color:#fff}.dk .b{color:#e8e4dd}.dk .b b{color:#fff}
.bar{margin-top:22px}.bar p{display:flex;justify-content:space-between;font:700 38px C}.bar p b{font:800 48px T;color:#c8322a}
.bar div{height:26px;background:#e6dfd5;border-radius:13px;margin-top:6px;overflow:hidden}.bar i{display:block;height:100%;background:#c8322a;border-radius:13px}
.card{border-top:4px solid #1c1b1f;padding:22px 0 26px}.card h3{font:700 32px T;letter-spacing:.12em;text-transform:uppercase;color:#c8322a}
.card .v{font:800 104px/.9 T;margin-top:8px}.card .t{font:400 34px/1.3 C;color:#2b2a30;margin-top:8px}.card .s{font:600 25px C;color:#8d8a93;margin-top:10px}
.art{display:grid;grid-template-columns:180px 1fr;gap:24px;padding:26px 0;border-top:3px solid #1c1b1f}.art>b{font:800 64px/.9 T;color:#c8322a;white-space:nowrap}.art p{font:400 36px/1.3 C;color:#2b2a30}`;
const tot = 6;
const testa = (n, dk) => `<div class="m"${dk ? ' style="color:#fff"' : ''}><i></i>Mappa della Rivolta</div><div class="n">${n}/${tot}</div>`;
const piede = (s = 'scorri ›', dk) => `<div class="f"${dk ? ' style="border-color:#fff"' : ''}>mappadellarivolta.org<span>${s}</span></div>`;
const card = (h, v, t, s) => `<div class="card"><h3>${h}</h3><p class="v">${v}</p><p class="t">${t}</p><p class="s">Fonte: ${s}</p></div>`;
const P = [
 `<div class="p">${testa(1)}<p class="k">Perché far sentire la propria voce</p><h1>Perché tante<br>persone scendono<br><em>in piazza?</em></h1>
  <p class="b">Abbiamo letto i titoli delle <b>${TOT} iniziative in programma</b> sulla mappa, verificate e con fonte. Questi i temi che tornano di più:</p>
  ${TEMI.map(([t, n]) => `<div class="bar"><p>${t}<b>${n}</b></p><div><i style="width:${(n / TOT) * 100}%"></i></div></div>`).join('')}
  <p style="font:400 26px/1.3 C;color:#8d8a93;margin-top:22px">Un titolo può contenere più temi. Molti scioperi di categoria non indicano il motivo nel titolo.</p>
  ${piede()}</div>`,
 `<div class="p">${testa(2)}<p class="k" style="margin-top:34px">Cosa chiedono le piazze · 1</p>
  <div style="margin-top:18px">
  ${card('Spesa militare e riarmo', '2,1% del PIL', 'Spesa per la difesa nel 2026. L\'obiettivo concordato nella NATO è il 5% entro il 2035, comprese le spese collegate alla sicurezza.', 'NATO, elaborazione Osservatorio Milex, luglio 2026')}
  ${card('Sanità pubblica', '6,2% del PIL', 'Spesa sanitaria pubblica nel 2025, contro il 7,1% della media dei Paesi OCSE.', '9° Rapporto Fondazione GIMBE, ottobre 2026')}
  ${card('Stato sociale', '5,4 milioni', 'Persone in povertà assoluta nel 2025 (9,3%). Nelle piazze: sussidi, assegni, pensioni.', 'Istat, 15 ottobre 2026')}
  </div>${piede()}</div>`,
 `<div class="p">${testa(3)}<p class="k" style="margin-top:34px">Cosa chiedono le piazze · 2</p>
  <div style="margin-top:18px">
  ${card('Caro vita, carburante, salari', '+4,2%', 'Inflazione a settembre 2026 rispetto a un anno prima. I beni energetici sono saliti del 22,6%.', 'Istat, ottobre 2026')}
  ${card('Scuola e università', '3,9% del PIL', 'Spesa per l\'istruzione nel 2023, contro il 4,7% della media dell\'Unione europea.', 'Commissione europea, Investing in Education 2025')}
  </div>
  <p class="b" style="font-size:32px;color:#5f5d66">I dati li abbiamo scelti noi per spiegare i temi: non sono di chi organizza le piazze. Ognuno ha la sua fonte, controllala.</p>
  ${piede()}</div>`,
 `<div class="p dk">${testa(4, 1)}<p class="k" style="color:#ff6b5e">Prima di giudicare</p><h1>Guarda<br>il motivo,<br><em>non il rumore.</em></h1>
  <p class="b">Dietro ogni sciopero, corteo o presidio c'è un motivo scritto nero su bianco: nel comunicato, sul sito del sindacato, nella pagina di chi organizza.</p>
  <p class="b">Pochi momenti di tensione fanno più rumore di migliaia di persone che manifestano in modo pacifico. <b>Leggi il motivo, poi fatti un'idea.</b></p>
  ${piede('scorri ›', 1)}</div>`,
 `<div class="p">${testa(5)}<p class="k">Lo dice la Costituzione</p><h1 style="font-size:112px">Far sentire la voce<br>è <em>un diritto</em></h1>
  <div style="margin-top:36px">
   <div class="art"><b>Art. 17</b><p>Ci si può <b>riunire pacificamente e senza armi</b>. Per le riunioni in luogo pubblico si dà preavviso alle autorità.</p></div>
   <div class="art"><b>Art. 21</b><p>Ognuno può <b>manifestare liberamente il proprio pensiero</b> con la parola, lo scritto e ogni altro mezzo.</p></div>
   <div class="art" style="border-bottom:3px solid #1c1b1f"><b>Art. 40</b><p>Il <b>diritto di sciopero</b> si esercita nell'ambito delle leggi che lo regolano.</p></div>
  </div>${piede()}</div>`,
 `<div class="p dk">${testa(6, 1)}<h1 style="font-size:150px;margin-top:80px">Informati.<br><em>Scegli tu.</em></h1>
  <p class="b" style="margin-top:50px">Non ti diciamo per chi stare né cosa pensare. Sulla mappa trovi ogni piazza con la sua fonte: leggi il motivo con le parole di chi la organizza, poi decidi tu se e come partecipare.</p>
  <p class="b" style="font-size:32px;color:#c9c5bf">Nessun partito, nessun finanziatore decide cosa mostrare.</p>
  <p style="font:400 28px/1.3 C;color:#a9a5ae;margin-top:40px">La mappa riporta informazioni pubbliche con la loro fonte.</p>
  ${piede('link in bio', 1)}</div>`,
];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const pg = await b.newPage({ viewport: { width: 1080, height: 1350 } });
for (const [i, h] of P.entries()) { await pg.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${h}</body></html>`); await pg.evaluate(() => document.fonts.ready);
  const over = await pg.evaluate(() => document.querySelector('.f').getBoundingClientRect().bottom); if (over > 1290) console.log(`slide ${i + 1}: piede a ${over}px`);
  await pg.screenshot({ path: `${OUT}/voce-${i + 1}.png` }); }
await b.close();
