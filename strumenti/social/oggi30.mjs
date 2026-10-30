import fs from 'node:fs'; import { chromium } from 'playwright-core'; import { cssBase, pathItalia, xy, W, H } from './motore.mjs'; import { panorama } from './pano2.mjs';
const R = JSON.parse(fs.readFileSync('tutte.json')); const NEV = +process.argv[2], NC = R.length;
const M2 = JSON.parse(fs.readFileSync('m2.json')); const CO = Object.fromEntries(M2.map((x) => [x[2], [x[3], x[4]]])); CO['Napoli'] = [40.8522, 14.2677]; CO['Bari'] = [41.125, 16.86];
const BIG = new Set(['Milano', 'Torino', 'Genova', 'Bologna', 'Firenze', 'Roma', 'Napoli', 'Bari', 'Palermo', 'Cagliari', 'Venezia-Mestre']);
const LAB = [['Torino', 'r', 0], ['Milano', 'r'], ['Genova', 'r'], ['Trieste', 'r'], ['Bologna', 'l'], ['Firenze', 'l'], ['Roma', 'r'], ['Pescara', 'r'], ['Napoli', 'r', 30], ['Bari', 'r'], ['Cosenza', 'r'], ['Palermo', 'l'], ['Cagliari', 'r']];
const SHORT = { 'Trentino-Alto Adige': 'Trentino-A. Adige', 'Friuli-Venezia Giulia': 'Friuli-V. Giulia' };
// blocchi: regioni intere, max 13 righe (titolo regione conta mezza riga)
const reg = []; for (const r of R) { let g = reg.find((x) => x.n === r[0]); if (!g) { g = { n: r[0], c: [] }; reg.push(g); } g.c.push(r); }
const slides = []; let cur = [], peso = 0;
for (const g of reg) { const w = g.c.length + 0.8; if (peso + w > 28.5 && cur.length) { slides.push(cur); cur = []; peso = 0; } cur.push(g); peso += w; }
if (cur.length) slides.push(cur);
const tot = slides.length + 5;
const css = cssBase + `*{box-sizing:border-box;margin:0}body{width:1080px;height:auto;font-family:C;color:#1c1b1f;background:#f6f3ee;overflow:hidden}
.p{position:relative;width:1080px;height:1350px;padding:70px;display:flex;flex-direction:column}
.m{position:static;top:auto;left:auto;font:700 32px T;letter-spacing:.14em;text-transform:uppercase;display:flex;align-items:center;gap:14px}.m i{width:20px;height:20px;border-radius:50%;background:#c8322a}
.n{position:absolute;top:72px;right:70px;font:700 30px T;letter-spacing:.1em;opacity:.55}
h1{font:800 118px/.92 T;text-transform:uppercase;margin-top:10px}h1 em{font-style:normal;color:#8e1b5e}
.k{font:700 30px T;letter-spacing:.12em;text-transform:uppercase;color:#8e1b5e;margin-top:30px}
.f{position:relative;display:flex;justify-content:space-between;align-items:center;border-top:3px solid currentColor;padding-top:22px;font:800 46px T;margin-top:auto;border-top-color:transparent}.f:before{content:"";position:absolute;left:-70px;right:-70px;top:-3px;border-top:6px solid #8e1b5e}.f span{font:600 28px C;opacity:.7}
.rg{break-after:avoid;font:700 22px T;letter-spacing:.14em;text-transform:uppercase;color:#8e1b5e;margin:12px 0 2px;border-bottom:3px solid #8e1b5e;padding-bottom:3px}
.r{break-inside:avoid;display:grid;grid-template-columns:72px 1fr;column-gap:10px;padding:5px 0;border-bottom:1px solid #ddd6ca}.r.big b{color:#8e1b5e;font-size:34px}.r .o{font:800 30px/1.1 T;color:#8e1b5e;grid-row:span 2}.r b{font:800 31px/1.05 T;text-transform:uppercase}.r span{grid-column:2;font:400 20px/1.2 C;color:#5f5d66;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.scuro{background:#1c1b1f;color:#fff}.t{font:400 36px/1.32 C;margin-top:24px}.fonte{font:600 25px/1.35 C;opacity:.7;margin-top:18px}`;
const testa = (i) => `<div class="m"><i></i>Mappa della Rivolta</div><div class="n">${i}/${tot}</div>`;
const S = [];

slides.forEach((gs, i) => S.push(`<div class="p">${testa(i + 3)}<p class="k" style="margin-top:28px">Venerdì 30 ottobre</p>
<div style="columns:2;column-gap:44px;margin-top:6px">${gs.map((g) => `<div><p class="rg">${SHORT[g.n] || g.n}</p>${g.c.map(([, c, o, l]) => `<div class="r${BIG.has(c) ? ' big' : ''}"><div class="o">${o}</div><b>${c}</b><span>${l}</span></div>`).join('')}</div>`).join('')}</div>
<div class="f">mappadellarivolta.org<span>scorri ›</span></div></div>`));
S.push(`<div class="p" style="background:#8e1b5e;color:#fff">${testa(tot - 1)}<h1 style="font-size:118px;margin-top:30px">Oggi in piazza.<br><span style="color:#ffd0e2">Insieme.</span></h1>
<p class="t" style="font-size:36px;font-weight:700;margin-top:24px">Siamo tutti nella stessa barca. Scendi in piazza nella tua città, porta chi ti sta vicino e restate uniti. In pace: la forza di una piazza sono le persone, non lo scontro.</p>
<div style="margin-top:22px">${[['💧', 'Acqua, documento, telefono carico'], ['👥', 'Un punto d\'incontro con chi è con te'], ['🧭', 'Segui il percorso e gli organizzatori'], ['🚑', 'Emergenze: <b>112</b>'], ['⚖️', 'Assistenza legale: <b>HubForDefenders +39 353 495 3606</b> (tel. e WhatsApp)']].map(([i, t]) => `<div style="display:flex;gap:18px;align-items:center;padding:11px 0;border-bottom:2px solid #ffffff33"><span style="font-size:40px;width:52px;flex:none">${i}</span><p style="font:400 31px/1.25 C">${t}</p></div>`).join('')}</div>
<p class="fonte" style="font-size:22px">HubForDefenders: rete di ARCI, A Sud, Un Ponte Per, Amnesty International Italia, Giuristi Democratici, Legal Team Italia (amnesty.it)</p>
<div class="f">mappadellarivolta.org<span>scorri ›</span></div></div>`);
S.push(`<div class="p" style="background:#f6f3ee">${testa(tot - 1)}<h1 style="font-size:150px;margin-top:40px">Tu<br><em>dove sei?</em></h1>
<p class="t" style="font-size:44px;font-weight:700;margin-top:34px">Pubblica una storia dalla tua piazza e <span style="color:#8e1b5e">taggaci: @mappadellarivolta</span></p>
<p class="t">Scrivi la città e usa <b>#30ottobre</b>. Ricondividiamo le piazze da tutta Italia, per far vedere quanti siamo.</p>
<div style="margin-top:34px;border:4px dashed #8e1b5e;border-radius:26px;padding:26px 30px;font:600 30px/1.35 C;color:#4a4850">📸 Inquadra la piazza, gli striscioni, la folla da lontano. <b>Niente volti riconoscibili di altre persone</b> senza il loro consenso.</div>
<div class="f">mappadellarivolta.org<span>scorri ›</span></div></div>`);
S.push(`<div class="p scuro">${testa(tot)}<h1 style="font-size:112px;margin-top:40px">Prima<br><em style="color:#ff8fb8">di partire</em></h1>
<p class="t" style="color:#e8e4dd">Orari e luoghi possono cambiare: apri l'evento sulla mappa e controlla la fonte.</p>
<p class="t" style="color:#e8e4dd"><b style="color:#fff">Trasporti:</b> il Ministero ha disposto il rinvio dello sciopero. FS, Trenord, ATAC e ATM annunciano servizio regolare; l'USB conferma lo sciopero. Possibili disagi: controlla gli avvisi della tua azienda.</p>
<p class="t" style="color:#e8e4dd">Scuola, sanità e uffici: emergenze garantite, guarda le comunicazioni ufficiali.</p>
<p class="t" style="color:#ff8fb8;font-weight:700">Condividilo nelle storie e tagga chi è in piazza con te.</p><p class="fonte">Fonti: Tgcom24, ANSA (27/10). La mappa riporta informazioni pubbliche con la loro fonte.</p>
<div class="f">mappadellarivolta.org<span>link in bio</span></div></div>`);
const { P, it, altri } = panorama(R.map(([, c]) => CO[c]).filter(Boolean), 2160, 1350, [260, 420, 1960, 1130]);
const pts = R.map(([, c, o]) => { const q = CO[c]; if (!q) return ''; const [x, y] = P(q[0], q[1]); return `<circle cx="${x}" cy="${y}" r="${BIG.has(c) ? 17 : 11}" fill="#8e1b5e" stroke="#f6f3ee" stroke-width="4"/>`; }).join('');
const labs = LAB.map(([c, d, dy = 0]) => { const q = CO[c]; const [x, y] = P(q[0], q[1]); const row = R.find((r) => r[1] === c); return `<div style="position:absolute;top:${y - 22 + dy}px;${d === 'r' ? 'left:' + (x + 24) : 'right:' + (2160 - x + 24)}px;font:800 34px/1 T;text-transform:uppercase;white-space:nowrap;background:#f6f3eedd;padding:3px 8px">${c} <span style="color:#8e1b5e">${row[2]}</span></div>`; }).join('');
const PANO = `<div style="position:relative;width:2160px;height:1350px;background:#f6f3ee;overflow:hidden"><svg width="2160" height="1350" style="position:absolute;inset:0"><path d="${altri}" fill="#ece7df" stroke="#d6cfc3" stroke-width="2"/><path d="${it}" fill="#fff" stroke="#1c1b1f" stroke-width="3"/>${pts}</svg>${labs}
<div style="position:absolute;left:70px;top:70px"><div class="m"><i></i>Mappa della Rivolta</div><p class="k" style="margin-top:24px">Venerdì 30 ottobre · sciopero generale</p><h1 style="font-size:120px">Oggi:<br><em>tutte le piazze</em></h1><p style="font:700 36px/1.2 C;margin-top:14px"><span style="font:800 70px T;color:#8e1b5e">${NEV}</span> iniziative in ${NC} comuni,<br>tutte con fonte</p></div>
<div class="n" style="right:1150px">1/${tot}</div><div class="n">2/${tot}</div>
<p style="position:absolute;right:70px;top:140px;font:800 44px/1.2 T;text-transform:uppercase;color:#8e1b5e;text-align:right">← Nord · · · Sud →</p><p style="position:absolute;right:70px;top:200px;font:600 28px/1.3 C;color:#5f5d66;text-align:right">L'Italia distesa: scorri da nord a sud.<br>Nei nomi l'orario del ritrovo.</p>
<div style="position:absolute;left:0;right:0;top:1201px;border-top:6px solid #8e1b5e"></div>
<div style="position:absolute;left:70px;top:1228px;font:800 46px T">scorri: città per città ›</div><div style="position:absolute;right:70px;top:1228px;font:800 46px T">mappadellarivolta.org</div><div style="position:absolute;left:1300px;top:1100px;font:700 26px C;color:#5f5d66"></div></div>`;
fs.mkdirSync('out/oggi30', { recursive: true });
{ const b0 = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }); const pg = await b0.newPage({ viewport: { width: 2160, height: 1350 } });
  await pg.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${css}body{width:2160px}</style></head><body>${PANO}</body></html>`); await pg.evaluate(() => document.fonts.ready);
  await pg.screenshot({ path: 'out/oggi30/oggi-01.png', clip: { x: 0, y: 0, width: 1080, height: 1350 } }); await pg.screenshot({ path: 'out/oggi30/oggi-02.png', clip: { x: 1080, y: 0, width: 1080, height: 1350 } }); await b0.close(); }
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const [j, h] of S.entries()) { const i = j + 2; const pg = await b.newPage({ viewport: { width: 1080, height: 1350 } });
  await pg.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${h}</body></html>`); await pg.evaluate(() => document.fonts.ready);
  const over = await pg.evaluate(() => { const f = document.querySelector('.f').getBoundingClientRect().top; return [...document.querySelectorAll('.p > *:not(.f):not(.n)')].some((e) => e.getBoundingClientRect().bottom > f - 4) || false; });
  console.log(i + 1, over ? 'FUORI' : 'ok'); await pg.screenshot({ path: `out/oggi30/oggi-${String(i + 1).padStart(2, '0')}.png` }); await pg.close(); }
await b.close();
