import fs from 'node:fs'; import { chromium } from 'playwright-core'; import { cssBase } from './motore.mjs';
const R = JSON.parse(fs.readFileSync('tutte.json')); const NEV = +process.argv[2], NC = R.length;
const SHORT = { 'Trentino-Alto Adige': 'Trentino-A. Adige', 'Friuli-Venezia Giulia': 'Friuli-V. Giulia' };
// blocchi: regioni intere, max 13 righe (titolo regione conta mezza riga)
const reg = []; for (const r of R) { let g = reg.find((x) => x.n === r[0]); if (!g) { g = { n: r[0], c: [] }; reg.push(g); } g.c.push(r); }
const slides = []; let cur = [], peso = 0;
for (const g of reg) { const w = g.c.length + 0.6; if (peso + w > 14.6 && cur.length) { slides.push(cur); cur = []; peso = 0; } cur.push(g); peso += w; }
if (cur.length) slides.push(cur);
const tot = slides.length + 3;
const css = cssBase + `*{box-sizing:border-box;margin:0}body{width:1080px;height:auto;font-family:C;color:#1c1b1f;background:#f6f3ee;overflow:hidden}
.p{position:relative;width:1080px;height:1350px;padding:70px;display:flex;flex-direction:column}
.m{position:static;top:auto;left:auto;font:700 32px T;letter-spacing:.14em;text-transform:uppercase;display:flex;align-items:center;gap:14px}.m i{width:20px;height:20px;border-radius:50%;background:#c8322a}
.n{position:absolute;top:72px;right:70px;font:700 30px T;letter-spacing:.1em;opacity:.55}
h1{font:800 118px/.92 T;text-transform:uppercase;margin-top:10px}h1 em{font-style:normal;color:#8e1b5e}
.k{font:700 30px T;letter-spacing:.12em;text-transform:uppercase;color:#8e1b5e;margin-top:30px}
.f{display:flex;justify-content:space-between;align-items:center;border-top:3px solid currentColor;padding-top:22px;font:800 46px T;margin-top:auto}.f span{font:600 28px C;opacity:.7}
.rg{font:700 26px T;letter-spacing:.14em;text-transform:uppercase;color:#8e1b5e;margin:20px 0 4px;border-bottom:3px solid #8e1b5e;padding-bottom:4px}
.r{display:flex;align-items:baseline;gap:18px;padding:7px 0;border-bottom:1px solid #ddd6ca}.r .o{flex:none;width:92px;font:800 36px T;color:#8e1b5e}.r b{font:800 38px/1 T;text-transform:uppercase;flex:none}.r span{font:400 26px/1.2 C;color:#5f5d66;margin-left:auto;text-align:right}
.scuro{background:#1c1b1f;color:#fff}.t{font:400 36px/1.32 C;margin-top:24px}.fonte{font:600 25px/1.35 C;opacity:.7;margin-top:18px}`;
const testa = (i) => `<div class="m"><i></i>Mappa della Rivolta</div><div class="n">${i}/${tot}</div>`;
const S = [];
S.push(`<div class="p vino" style="background:#8e1b5e;color:#fff">${testa(1)}<p class="k" style="color:#ffd0e2">Venerdì 30 ottobre · sciopero generale</p><h1 style="font-size:170px;margin-top:40px">Domani:<br><span style="color:#ffd0e2">tutte le<br>piazze</span></h1>
<p class="t" style="font-size:44px;font-weight:700">${NEV} iniziative in ${NC} comuni e 19 regioni, tutte con fonte.</p><p class="t">Scorri: città per città, con orario e luogo del ritrovo.</p>
<div class="f">Salva il post<span>scorri ›</span></div></div>`);
slides.forEach((gs, i) => S.push(`<div class="p">${testa(i + 2)}<p class="k" style="margin-top:28px">Venerdì 30 ottobre</p>
${gs.map((g) => `<p class="rg">${SHORT[g.n] || g.n}</p>${g.c.map(([, c, o, l]) => `<div class="r"><div class="o">${o}</div><b>${c}</b><span>${l}</span></div>`).join('')}`).join('')}
<div class="f">mappadellarivolta.org<span>scorri ›</span></div></div>`));
S.push(`<div class="p" style="background:#8e1b5e;color:#fff">${testa(tot - 1)}<h1 style="font-size:150px;margin-top:60px">Domani,<br><span style="color:#ffd0e2">in piazza.<br>Insieme.</span></h1>
<p class="t" style="font-size:44px;font-weight:700;margin-top:40px">Siamo tutti nella stessa barca: lavoratori, studenti, pensionati, chi cerca casa e chi non arriva a fine mese.</p>
<p class="t">Scendi in piazza nella tua città, porta chi ti sta vicino e restate uniti. In pace: la forza di una piazza sono le persone, non lo scontro.</p>
<div class="f">mappadellarivolta.org<span>scorri ›</span></div></div>`);
S.push(`<div class="p scuro">${testa(tot)}<h1 style="font-size:112px;margin-top:40px">Prima<br><em style="color:#ff8fb8">di partire</em></h1>
<p class="t" style="color:#e8e4dd">Orari e luoghi possono cambiare: apri l'evento sulla mappa e controlla la fonte.</p>
<p class="t" style="color:#e8e4dd"><b style="color:#fff">Trasporti:</b> il Ministero ha disposto il rinvio dello sciopero. FS, Trenord, ATAC e ATM annunciano servizio regolare; l'USB conferma lo sciopero. Possibili disagi: controlla gli avvisi della tua azienda.</p>
<p class="t" style="color:#e8e4dd">Scuola, sanità e uffici: emergenze garantite, guarda le comunicazioni ufficiali.</p>
<p class="fonte">Fonti: Tgcom24, ANSA (27/10). La mappa riporta informazioni pubbliche con la loro fonte.</p>
<div class="f">mappadellarivolta.org<span>link in bio</span></div></div>`);
fs.mkdirSync('out/tutte30', { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const [i, h] of S.entries()) { const pg = await b.newPage({ viewport: { width: 1080, height: 1350 } });
  await pg.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${h}</body></html>`); await pg.evaluate(() => document.fonts.ready);
  const over = await pg.evaluate(() => { const f = document.querySelector('.f').getBoundingClientRect().top; return [...document.querySelectorAll('.p > *:not(.f):not(.n)')].some((e) => e.getBoundingClientRect().bottom > f - 4) || [...document.querySelectorAll('.r')].some((e) => e.scrollWidth > e.clientWidth + 1); });
  console.log(i + 1, over ? 'FUORI' : 'ok'); await pg.screenshot({ path: `out/tutte30/tutte-${String(i + 1).padStart(2, '0')}.png` }); await pg.close(); }
await b.close();
