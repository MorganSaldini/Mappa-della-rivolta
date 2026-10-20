// Carosello 1080x1350 "Come verifichiamo un evento". Uso: node verifica.mjs <verificate> <da_verificare> <cartella_uscita>
import fs from 'node:fs'; import { cssBase } from './motore.mjs'; import { chromium } from 'playwright-core';
const [VER = '155', DAV = '57', OUT = 'out-verifica'] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
const css = cssBase.replace('body{width:1080px;height:1920px', 'body{width:1080px;height:1350px') + `
.p{position:relative;height:1350px;padding:70px;display:flex;flex-direction:column}
.m{position:static}.n{position:absolute;top:70px;right:70px;font:700 30px T;letter-spacing:.1em;color:#8d8a93}
h1{font:800 132px/.88 T;text-transform:uppercase;margin-top:30px}h1 em{font-style:normal;color:#c8322a}
.k{font:700 34px T;letter-spacing:.14em;text-transform:uppercase;color:#c8322a;margin-top:60px}
.num{font:800 220px/.8 T;color:#c8322a}
.t{font:800 104px/.9 T;text-transform:uppercase;margin-top:16px}
.b{font:400 42px/1.32 C;color:#2b2a30;margin-top:34px;max-width:900px}.b b{font-weight:700;color:#1c1b1f}
.chip{display:inline-block;font:700 34px C;padding:8px 22px;border-radius:40px;margin-right:12px}
.cv{background:#0f7a6b;color:#fff}.cd{background:#e6dfd5;color:#55525c;border:3px dashed #8d8a93}
.f{margin-top:auto;display:flex;justify-content:space-between;align-items:center;border-top:3px solid currentColor;padding-top:20px;font:800 46px T}.f span{font:600 30px C;opacity:.7}
.dk{background:#1c1b1f;color:#fff}.dk .b{color:#e8e4dd}.dk .b b{color:#fff}
.flow{display:flex;align-items:center;gap:14px;margin-top:60px;font:800 44px/1 T;text-transform:uppercase}
.flow div{flex:1;background:#fff;border:4px solid #1c1b1f;border-radius:18px;padding:26px 10px;text-align:center}.flow i{font-style:normal;color:#c8322a;font-size:52px}`;
const tot = 7;
const testa = (n, dk) => `<div class="m"${dk ? ' style="color:#fff"' : ''}><i></i>Mappa della Rivolta</div><div class="n">${n}/${tot}</div>`;
const passo = (n, num, tit, corpo, extra = '') => `<div class="p">${testa(n)}<p class="k">Passo ${num} di 4</p><p class="num">${num}</p><p class="t">${tit}</p>${corpo}${extra}<div class="f">mappadellarivolta.org<span>scorri ›</span></div></div>`;
const P = [
 `<div class="p">${testa(1)}<h1 style="margin-top:80px">Come<br>verifichiamo<br><em>un evento</em></h1>
  <div class="flow"><div>Segnali</div><i>›</i><div>Fonte</div><i>›</i><div>Controllo</div><i>›</i><div>Mappa</div></div>
  <p class="b" style="margin-top:50px">Ogni corteo, presidio o sciopero sulla mappa passa da questi 4 passaggi. In 1 minuto ti spieghiamo come.</p>
  <div class="f">Salva il post<span>scorri ›</span></div></div>`,
 passo(2, 1, 'Qualcuno<br>lo segnala', `<p class="b">Chiunque può aggiungere un evento, <b>senza account</b>: cosa, dove, quando, chi organizza e <b>il link a una fonte</b>.</p><p class="b">Non chiediamo nome, email né telefono. Filtri anti-spam bloccano gli invii automatici.</p>`),
 passo(3, 2, 'Controlliamo<br>la fonte', `<p class="b">La fonte deve essere pubblica: un comunicato, il sito di un sindacato, la pagina di chi organizza, il calendario ufficiale degli scioperi.</p><p class="b">Data, luogo e organizzatori devono <b>corrispondere</b>. Finché non è controllato, l'evento resta</p>`, `<p style="margin-top:20px"><span class="chip cd">Da verificare</span></p>`),
 passo(4, 3, 'Decide<br>un moderatore', `<p class="b">Volontari controllano le segnalazioni. Se la fonte regge, l'evento diventa</p><p style="margin-top:20px"><span class="chip cv">✓ Verificato</span></p><p class="b">Anche chi conosce l'evento può confermarlo: con <b>abbastanza conferme e una fonte</b> diventa verificato anche senza moderatore.</p>`),
 passo(5, 4, 'Arriva<br>sulla mappa', `<p class="b">Solo iniziative pacifiche. "Verificato" vuol dire che <b>la fonte è stata riscontrata</b>: non è un'approvazione né una garanzia che si svolga.</p>
  <div style="display:flex;gap:40px;margin-top:50px"><p><b style="display:block;font:800 150px/.85 T;color:#0f7a6b">${VER}</b><span style="font:600 32px C;color:#5f5d66">in programma, verificate<br>e con fonte</span></p><p><b style="display:block;font:800 150px/.85 T;color:#8d8a93">${DAV}</b><span style="font:600 32px C;color:#5f5d66">in attesa<br>di controllo</span></p></div>`),
 `<div class="p">${testa(6)}<p class="k">Hai visto un errore?</p><p class="t" style="font-size:118px">Segnalalo<br>in un tocco</p>
  <p class="b">Su ogni evento c'è il tasto <b>⚠️ Segnala</b>: data sbagliata, evento annullato, contenuto che non va.</p>
  <p class="b">Con più segnalazioni l'evento viene <b>nascosto</b> finché un moderatore non lo ricontrolla. Ogni modifica resta in cronologia e si può annullare.</p>
  <div class="f">mappadellarivolta.org<span>scorri ›</span></div></div>`,
 `<div class="p dk">${testa(7, 1)}<p class="k" style="color:#ff6b5e">"Ma voi per cosa manifestate?"</p><h1 style="font-size:116px">Noi non<br>organizziamo.<br><em>Mettiamo<br>in mappa.</em></h1>
  <p class="b">Il motivo di ogni piazza lo trovi nella sua fonte, con le parole di chi la organizza. Nessun partito, nessun finanziatore decide cosa mostrare.</p>
  <p class="b" style="font-size:36px;color:#c9c5bf">Informati, poi scegli tu.</p>
  <div class="f" style="border-color:#fff">mappadellarivolta.org<span>link in bio</span></div></div>`,
];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const pg = await b.newPage({ viewport: { width: 1080, height: 1350 } });
for (const [i, h] of P.entries()) { await pg.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${h}</body></html>`); await pg.evaluate(() => document.fonts.ready); await pg.screenshot({ path: `${OUT}/verifica-${i + 1}.png` }); }
await b.close();
