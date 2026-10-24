import { cssBase } from './motore.mjs'; import { chromium } from 'playwright-core';
const box = (col, tag, tit, txt) => `<div class="b" style="--c:${col}"><p class="t">${tag}</p><p class="h">${tit}</p><p class="x">${txt}</p></div>`;
const html = `<!doctype html><html><head><meta charset="utf-8"><style>${cssBase}
.pag{position:relative;height:1920px;padding:250px 80px 300px;display:flex;flex-direction:column}
h1{font:800 104px/.92 T;text-transform:uppercase}h1 em{font-style:normal;color:#c8322a}
.wrap{display:flex;flex-direction:column;gap:16px;margin-top:28px}
.b{background:#fff;border:3px solid #1c1b1f;border-left:16px solid var(--c);border-radius:16px;padding:16px 24px}
.t{font:700 25px T;letter-spacing:.12em;text-transform:uppercase;color:var(--c)}
.h{font:800 44px/1 T;text-transform:uppercase;margin-top:4px}
.x{font:400 29px/1.28 C;color:#2b2a30;margin-top:6px}
.f{margin-top:auto;font:400 23px/1.35 C;color:#5f5d66}
</style></head><body><div class="pag"><div class="m"><i></i>Mappa della Rivolta</div>
<h1>Cosa sta<br><em>succedendo</em></h1>
<div class="wrap">
${box('#2a5db0','Genova · lunedì 19','Lavoratori ex Ilva occupano l\'aeroporto','Protestano contro l\'aumento della cassa integrazione: a Genova riguarda 870 dipendenti su 917. I passeggeri riescono a imbarcarsi.')}
${box('#6b4fbb','Napoli · università','Studenti occupano l\'Orientale','Secondo il collettivo: contro caro affitti, tagli all\'istruzione e accordi con aziende belliche. Assemblee e incontri aperti.')}
${box('#d96c00','Puglia · Basilicata · Calabria','Siamo vicini al Sud che lavora','Agricoltori e autotrasportatori contro il caro gasolio. Il 27 ottobre il Ministero dei Trasporti incontra le categorie.')}
${box('#c8322a','Possibili disagi · Cremona, martedì 20','Corteo studentesco non confermato','Prefettura e Questura monitorano dopo messaggi sui social che invitano a disordini; alcune scuole hanno preso misure. Informati prima di uscire. Noi sosteniamo solo iniziative pacifiche.')}
</div>
<p class="f">Fonti: Il Fatto Quotidiano (19/10), collettivo Orientale Occupata, Il Post, InformaCalabria, Cremona Sera e La Quinta T (19/10).</p>
</div></body></html>`;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
await p.setContent(html); await p.evaluate(() => document.fonts.ready);
console.log(await p.evaluate(() => [document.querySelector('.wrap').getBoundingClientRect().bottom, document.querySelector('.f').getBoundingClientRect().bottom]));
await p.screenshot({ path: 'out/storia-cosa-succede.png' }); await b.close();
