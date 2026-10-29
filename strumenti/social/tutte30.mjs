import fs from 'node:fs'; import { chromium } from 'playwright-core'; import { cssBase, pathItalia, xy, W, H } from './motore.mjs'; import { panorama } from './pano2.mjs';
const R = JSON.parse(fs.readFileSync('tutte.json')); const NEV = +process.argv[2], NC = R.length;
const M2 = JSON.parse(fs.readFileSync('m2.json')); const CO = Object.fromEntries(M2.map((x) => [x[2], [x[3], x[4]]])); CO['Napoli'] = [40.8522, 14.2677]; CO['Bari'] = [41.125, 16.86];
const BIG = new Set(['Milano', 'Torino', 'Genova', 'Bologna', 'Firenze', 'Roma', 'Napoli', 'Bari', 'Palermo', 'Cagliari', 'Venezia-Mestre']);
const LAB = [['Torino', 'r', 0], ['Milano', 'r'], ['Genova', 'r'], ['Trieste', 'r'], ['Bologna', 'l'], ['Firenze', 'l'], ['Roma', 'l'], ['Pescara', 'r'], ['Napoli', 'r', 30], ['Bari', 'r'], ['Cosenza', 'r'], ['Palermo', 'l'], ['Cagliari', 'r']];
const SHORT = { 'Trentino-Alto Adige': 'Trentino-A. Adige', 'Friuli-Venezia Giulia': 'Friuli-V. Giulia' };
// blocchi: regioni intere, max 13 righe (titolo regione conta mezza riga)
const reg = []; for (const r of R) { let g = reg.find((x) => x.n === r[0]); if (!g) { g = { n: r[0], c: [] }; reg.push(g); } g.c.push(r); }
const slides = []; let cur = [], peso = 0;
for (const g of reg) { const w = g.c.length + 0.6; if (peso + w > 14.6 && cur.length) { slides.push(cur); cur = []; peso = 0; } cur.push(g); peso += w; }
if (cur.length) slides.push(cur);
const tot = slides.length + 6;
const css = cssBase + `*{box-sizing:border-box;margin:0}body{width:1080px;height:auto;font-family:C;color:#1c1b1f;background:#f6f3ee;overflow:hidden}
.p{position:relative;width:1080px;height:1350px;padding:70px;display:flex;flex-direction:column}
.m{position:static;top:auto;left:auto;font:700 32px T;letter-spacing:.14em;text-transform:uppercase;display:flex;align-items:center;gap:14px}.m i{width:20px;height:20px;border-radius:50%;background:#c8322a}
.n{position:absolute;top:72px;right:70px;font:700 30px T;letter-spacing:.1em;opacity:.55}
h1{font:800 118px/.92 T;text-transform:uppercase;margin-top:10px}h1 em{font-style:normal;color:#8e1b5e}
.k{font:700 30px T;letter-spacing:.12em;text-transform:uppercase;color:#8e1b5e;margin-top:30px}
.f{position:relative;display:flex;justify-content:space-between;align-items:center;border-top:3px solid currentColor;padding-top:22px;font:800 46px T;margin-top:auto;border-top-color:transparent}.f:before{content:"";position:absolute;left:-70px;right:-70px;top:-3px;border-top:6px solid #8e1b5e}.f span{font:600 28px C;opacity:.7}
.rg{font:700 26px T;letter-spacing:.14em;text-transform:uppercase;color:#8e1b5e;margin:20px 0 4px;border-bottom:3px solid #8e1b5e;padding-bottom:4px}
.r{display:flex;align-items:baseline;gap:18px;padding:7px 0;border-bottom:1px solid #ddd6ca}.r.big b{color:#8e1b5e;font-size:44px}.r .o{flex:none;width:92px;font:800 36px T;color:#8e1b5e}.r b{font:800 38px/1 T;text-transform:uppercase;flex:none}.r span{font:400 26px/1.2 C;color:#5f5d66;margin-left:auto;text-align:right}
.scuro{background:#1c1b1f;color:#fff}.t{font:400 36px/1.32 C;margin-top:24px}.fonte{font:600 25px/1.35 C;opacity:.7;margin-top:18px}`;
const testa = (i) => `<div class="m"><i></i>Mappa della Rivolta</div><div class="n">${i}/${tot}</div>`;
const S = [];
const idx = slides.map((gs, i) => [gs[0].n, gs[gs.length - 1].n, i + 4]);
S.push(`<div class="p" style="background:#8e1b5e;color:#fff">${testa(1)}<p class="k" style="color:#ffd0e2">Venerdì 30 ottobre · sciopero generale</p><h1 style="font-size:150px;margin-top:20px">Domani:<br><span style="color:#ffd0e2">tutte le piazze</span></h1>
<div style="display:grid;grid-template-columns:470px 1fr;gap:30px;flex:1;min-height:0;margin-top:20px"><svg viewBox="-10 -10 ${W + 20} ${H + 20}" style="width:100%;height:100%"><path d="${pathItalia}" fill="#a3376f" stroke="#fff" stroke-width="4"/>${R.map(([, c]) => { const q = CO[c]; if (!q) return ''; const [x, y] = xy(q[0], q[1]); return `<circle cx="${x}" cy="${y}" r="13" fill="#ffd0e2" stroke="#8e1b5e" stroke-width="4"/>`; }).join('')}</svg>
<div style="display:flex;flex-direction:column;justify-content:center;gap:10px"><p style="font:800 110px/.9 T">${NEV}</p><p style="font:700 34px/1.2 C">iniziative in ${NC} comuni e 19 regioni, tutte con fonte</p>
<div style="margin-top:20px;font:600 27px/1.5 C;color:#ffd0e2">${['Mappa · slide 2–3', ...idx.map(([a, b, n]) => (a === b ? a : a + ' → ' + b) + ' · ' + n)].join('<br>')}</div></div></div>
<div class="f">Salva il post<span>scorri ›</span></div></div>`);
slides.forEach((gs, i) => S.push(`<div class="p">${testa(i + 4)}<p class="k" style="margin-top:28px">Venerdì 30 ottobre</p>
${gs.map((g) => `<p class="rg">${SHORT[g.n] || g.n}</p>${g.c.map(([, c, o, l]) => `<div class="r${BIG.has(c) ? ' big' : ''}"><div class="o">${o}</div><b>${c}</b><span>${l}</span></div>`).join('')}`).join('')}
<div class="f">mappadellarivolta.org<span>scorri ›</span></div></div>`));
S.push(`<div class="p" style="background:#8e1b5e;color:#fff">${testa(tot - 2)}<h1 style="font-size:150px;margin-top:60px">Domani,<br><span style="color:#ffd0e2">in piazza.<br>Insieme.</span></h1>
<p class="t" style="font-size:44px;font-weight:700;margin-top:40px">Siamo tutti nella stessa barca: lavoratori, studenti, pensionati, chi cerca casa e chi non arriva a fine mese.</p>
<p class="t">Scendi in piazza nella tua città, porta chi ti sta vicino e restate uniti. In pace: la forza di una piazza sono le persone, non lo scontro.</p>
<div class="f">mappadellarivolta.org<span>scorri ›</span></div></div>`);
S.push(`<div class="p">${testa(tot - 1)}<p class="k">Venerdì 30 ottobre</p><h1 style="font-size:104px">Per una piazza<br><em>sicura</em></h1><div style="margin-top:18px">
${[['💧', 'Porta acqua, un documento e il telefono carico'], ['👥', 'Decidi un punto d\'incontro con chi è con te'], ['🧭', 'Segui il percorso e le indicazioni degli organizzatori'], ['🚑', 'Emergenze: chiama il <b>112</b>'], ['⚖️', 'Fermato o testimone di un abuso? <b>HubForDefenders</b>, assistenza legale: <b>+39 353 495 3606</b> (telefono e WhatsApp)']].map(([i, t]) => `<div style="display:flex;gap:22px;align-items:flex-start;padding:18px 0;border-bottom:2px solid #d9d3c8"><span style="font-size:50px;width:66px;flex:none">${i}</span><p style="font:400 34px/1.3 C">${t}</p></div>`).join('')}</div>
<p class="fonte">HubForDefenders: rete di ARCI, A Sud, Un Ponte Per, Amnesty International Italia, Giuristi Democratici, Legal Team Italia (fonte: amnesty.it)</p>
<div class="f">mappadellarivolta.org<span>scorri ›</span></div></div>`);
S.push(`<div class="p scuro">${testa(tot)}<h1 style="font-size:112px;margin-top:40px">Prima<br><em style="color:#ff8fb8">di partire</em></h1>
<p class="t" style="color:#e8e4dd">Orari e luoghi possono cambiare: apri l'evento sulla mappa e controlla la fonte.</p>
<p class="t" style="color:#e8e4dd"><b style="color:#fff">Trasporti:</b> il Ministero ha disposto il rinvio dello sciopero. FS, Trenord, ATAC e ATM annunciano servizio regolare; l'USB conferma lo sciopero. Possibili disagi: controlla gli avvisi della tua azienda.</p>
<p class="t" style="color:#e8e4dd">Scuola, sanità e uffici: emergenze garantite, guarda le comunicazioni ufficiali.</p>
<p class="t" style="color:#ff8fb8;font-weight:700">Condividilo nelle storie e tagga chi viene con te.</p><p class="fonte">Fonti: Tgcom24, ANSA (27/10). La mappa riporta informazioni pubbliche con la loro fonte.</p>
<div class="f">mappadellarivolta.org<span>link in bio</span></div></div>`);
const { P, it, altri } = panorama(R.map(([, c]) => CO[c]).filter(Boolean), 2160, 1350, [200, 330, 1960, 1120]);
const pts = R.map(([, c, o]) => { const q = CO[c]; if (!q) return ''; const [x, y] = P(q[0], q[1]); return `<circle cx="${x}" cy="${y}" r="${BIG.has(c) ? 17 : 11}" fill="#8e1b5e" stroke="#f6f3ee" stroke-width="4"/>`; }).join('');
const labs = LAB.map(([c, d, dy = 0]) => { const q = CO[c]; const [x, y] = P(q[0], q[1]); const row = R.find((r) => r[1] === c); return `<div style="position:absolute;top:${y - 22 + dy}px;${d === 'r' ? 'left:' + (x + 24) : 'right:' + (2160 - x + 24)}px;font:800 34px/1 T;text-transform:uppercase;white-space:nowrap;background:#f6f3eedd;padding:3px 8px">${c} <span style="color:#8e1b5e">${row[2]}</span></div>`; }).join('');
const PANO = `<div style="position:relative;width:2160px;height:1350px;background:#f6f3ee;overflow:hidden"><svg width="2160" height="1350" style="position:absolute;inset:0"><path d="${altri}" fill="#ece7df" stroke="#d6cfc3" stroke-width="2"/><path d="${it}" fill="#fff" stroke="#1c1b1f" stroke-width="3"/>${pts}</svg>${labs}
<div style="position:absolute;left:70px;top:70px"><div class="m"><i></i>Mappa della Rivolta</div><p class="k" style="margin-top:24px">Venerdì 30 ottobre · ${NEV} iniziative</p><h1 style="font-size:104px">Le piazze<br><em>sulla mappa</em></h1></div>
<div class="n" style="right:1150px">2/${tot}</div><div class="n">3/${tot}</div>
<p style="position:absolute;right:70px;top:140px;font:800 44px/1.2 T;text-transform:uppercase;color:#8e1b5e;text-align:right">← Nord · · · Sud →</p><p style="position:absolute;right:70px;top:200px;font:600 28px/1.3 C;color:#5f5d66;text-align:right">L'Italia distesa: scorri da nord a sud.<br>Nei nomi l'orario del ritrovo.</p>
<div style="position:absolute;left:0;right:0;top:1201px;border-top:6px solid #8e1b5e"></div>
<div style="position:absolute;left:70px;top:1228px;font:800 46px T">scorri: città per città ›</div><div style="position:absolute;right:70px;top:1228px;font:800 46px T">mappadellarivolta.org</div><div style="position:absolute;left:1300px;top:1100px;font:700 26px C;color:#5f5d66"></div></div>`;
fs.mkdirSync('out/tutte30', { recursive: true });
{ const b0 = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }); const pg = await b0.newPage({ viewport: { width: 2160, height: 1350 } });
  await pg.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${css}body{width:2160px}</style></head><body>${PANO}</body></html>`); await pg.evaluate(() => document.fonts.ready);
  await pg.screenshot({ path: 'out/tutte30/tutte-02.png', clip: { x: 0, y: 0, width: 1080, height: 1350 } }); await pg.screenshot({ path: 'out/tutte30/tutte-03.png', clip: { x: 1080, y: 0, width: 1080, height: 1350 } }); await b0.close(); }
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const [j, h] of S.entries()) { const i = j === 0 ? 0 : j + 2; const pg = await b.newPage({ viewport: { width: 1080, height: 1350 } });
  await pg.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${h}</body></html>`); await pg.evaluate(() => document.fonts.ready);
  const over = await pg.evaluate(() => { const f = document.querySelector('.f').getBoundingClientRect().top; return [...document.querySelectorAll('.p > *:not(.f):not(.n)')].some((e) => e.getBoundingClientRect().bottom > f - 4) || [...document.querySelectorAll('.r')].some((e) => e.scrollWidth > e.clientWidth + 1); });
  console.log(i + 1, over ? 'FUORI' : 'ok'); await pg.screenshot({ path: `out/tutte30/tutte-${String(i + 1).padStart(2, '0')}.png` }); await pg.close(); }
await b.close();
