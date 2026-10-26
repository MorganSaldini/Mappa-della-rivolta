import fs from 'node:fs'; import { chromium } from 'playwright-core';
import { cssBase, pathItalia, W, H, xy, COL } from './motore.mjs';
const P = JSON.parse(fs.readFileSync('pnord.json'));
const [N, NC] = [47, 28];
const G = [
 ['Piemonte', [['9:30', 'Torino', 'Corteo regionale per lo sciopero generale', 'Piazza Palazzo di Città · USB Piemonte'], ['9:00', 'Torino', 'Ritrovo degli studenti, poi nel corteo', 'Palazzo Nuovo · OSA, Cambiare Rotta'], ['9:30', 'Novara', 'Corteo, poi presidio alle 11:45 in piazza Puccini', 'Piazza Cavour · USB'], ['—', 'Studenti', 'Davanti a scuole e università', 'Torino, Grugliasco, Orbassano, Novara, Vercelli, Alessandria']]],
 ['Lombardia', [['10:00', 'Milano', 'Corteo per lo sciopero generale', "Piazza Duca d'Aosta · USB"], ['9:30', 'Milano', 'Concentramento degli studenti', 'Porta Venezia · collettivi studenteschi'], ['7:30', 'Sesto San Giovanni', 'Ritrovo degli studenti', 'Stazione FS'], ['9:00', 'Brescia', 'Manifestazione per lo sciopero generale', 'P.le Cesare Battisti · USB, USI-CIT, Cobas, CUB'], ['17:00', 'Bergamo', 'Manifestazione per lo sciopero generale', 'Piazza Gaza · USB']]],
 ['Veneto', [['9:00', 'Venezia-Mestre', 'Manifestazione per lo sciopero generale', 'Piazzale Cialdini · USB'], ['15:30', 'Venezia-Mestre', 'Corteo contro il caro vita', 'Stazione di Mestre · CSO Morion'], ['8:00', 'Padova', 'Corteo degli studenti e della scuola', 'Piazzale Stazione · collettivi studenteschi, Cobas Scuola'], ['8:30', 'Treviso', 'Corteo per lo sciopero generale', 'Via Roma, davanti alla stazione'], ['7:30', 'Verona', 'Presidio per lo sciopero generale', 'Piazzale 25 Aprile · USB'], ['8:00', 'Bassano del Grappa', 'Sciopero studentesco', "Via S. Tommaso d'Aquino"]]],
 ['Trentino, Friuli e Liguria', [['8:30', 'Trento', 'Corteo studentesco', 'Piazza Fiera'], ['16:00', 'Bolzano', 'Corteo contro il caro vita', 'Piazza Walther'], ['9:00', 'Trieste', 'Presidio al Varco 4 del porto · USB', 'Dalle 7:45 studenti davanti alle scuole · Rete degli Studenti Medi'], ['9:30', 'La Spezia', 'Presidio davanti alla Prefettura', 'USB e associazioni cittadine'], ['9:30', 'Imperia', 'Presidio per lo sciopero generale', 'Piazza Calvi'], ['—', 'Genova', 'Sciopero generale', 'Luogo e ora sulla mappa · USB, OSA, Cambiare Rotta']]],
 ['Emilia-Romagna', [['9:30', 'Bologna', 'Manifestazione per lo sciopero generale', 'Piazza Maggiore · USB, Cambiare Rotta (universitari dalle 8:00 in via Zamboni)'], ['7:30', 'Parma', 'Manifestazione per lo sciopero generale', 'Piazzale Barbieri · ICL-CIT'], ['8:30', 'Piacenza', 'Corteo contro il carovita', 'Via Scalabrini'], ['9:00', 'Reggio Emilia', 'Corteo dal polo scolastico (alle 18:00 un corteo in piazza del Monte)', 'Via Makallè'], ['9:00', 'Ravenna', 'Corteo dalla città al porto', 'Piazza del Popolo'], ['9:00', 'Rimini', 'Corteo per lo sciopero generale', "Arco d'Augusto · USB"], ['8:00', 'Cesena', 'Corteo studentesco', 'Giardini ex Arrigoni']]],
];
const tot = G.length + 2;
const css = cssBase + `*{box-sizing:border-box;margin:0}body{width:1080px;height:auto;font-family:C;color:#1c1b1f;background:#f6f3ee;overflow:hidden}
.p{position:relative;width:1080px;height:1350px;padding:70px;display:flex;flex-direction:column}
.m{position:static;top:auto;left:auto;font:700 32px T;letter-spacing:.14em;text-transform:uppercase;display:flex;align-items:center;gap:14px}.m i{width:20px;height:20px;border-radius:50%;background:#c8322a}
.n{position:absolute;top:72px;right:70px;font:700 30px T;letter-spacing:.1em;opacity:.55}
h1{font:800 124px/.92 T;text-transform:uppercase;margin-top:10px}h1 em{font-style:normal;color:#8e1b5e}
.k{font:700 32px T;letter-spacing:.12em;text-transform:uppercase;color:#8e1b5e;margin-top:34px}
.f{display:flex;justify-content:space-between;align-items:center;border-top:3px solid currentColor;padding-top:22px;font:800 46px T;margin-top:auto}.f span{font:600 28px C;opacity:.7}
.r{display:flex;gap:24px;align-items:baseline;padding:16px 0;border-bottom:2px solid #d9d3c8}.r .o{flex:none;width:110px;font:800 44px T;color:#8e1b5e}.r b{display:block;font:800 44px/1 T;text-transform:uppercase}.r .d{font:700 31px/1.2 C;margin-top:6px}.r .l{font:400 27px/1.25 C;color:#5f5d66;margin-top:4px}
.c .r{padding:9px 0}.c .r .o{font-size:36px;width:96px}.c .r b{font-size:36px}.c .r .d{font-size:27px;margin-top:3px}.c .r .l{font-size:23px;margin-top:2px}
.scuro{background:#1c1b1f;color:#fff}.t{font:400 38px/1.32 C;margin-top:28px}.nota{font:600 27px/1.35 C;opacity:.72;margin-top:24px}`;
const testa = (i) => `<div class="m"><i></i>Mappa della Rivolta</div><div class="n">${i}/${tot}</div>`;
const g = []; for (const [t, la, ln] of P) { let q = g.find((x) => Math.hypot(x.la - la, x.ln - ln) < 0.15); if (!q) { q = { la, ln, n: 0 }; g.push(q); } q.n++; }
const nord = (w) => { const [x0, y0] = xy(47.1, 6.6), [x1, y1] = xy(43.6, 13.9); const dots = g.sort((a, b) => a.n - b.n).map((q) => { const [x, y] = xy(q.la, q.ln); const r = 7 + Math.sqrt(q.n) * 5; return `<circle cx="${x}" cy="${y}" r="${r + 7}" fill="#8e1b5e" opacity=".16"/><circle cx="${x}" cy="${y}" r="${r}" fill="#8e1b5e" stroke="#f6f3ee" stroke-width="3"/>`; }).join('');
  return `<svg viewBox="${x0} ${y0} ${x1 - x0} ${y1 - y0}" style="width:${w}px"><path d="${pathItalia}" fill="#fff" stroke="#1c1b1f" stroke-width="2.5" stroke-linejoin="round"/>${dots}</svg>`; };
const s1 = `<div class="p">${testa(1)}<p class="k">Venerdì 30 ottobre · sciopero generale</p><h1>Le piazze<br><em>del Nord</em></h1>
<div style="margin-top:20px;display:flex;justify-content:center">${nord(700)}</div>
<p style="font:700 44px/1.2 C;margin-top:20px"><span style="font:800 80px T;color:#8e1b5e">${N}</span> iniziative in ${NC} comuni, tutte con fonte e verificate.</p>
<div class="f">Regione per regione<span>scorri ›</span></div></div>`;
const reg = G.map(([nome, R], i) => `<div class="p">${testa(i + 2)}<p class="k">Venerdì 30 ottobre</p><h1 style="font-size:${nome.length > 16 ? 96 : 118}px">${nome}</h1>
<div style="margin-top:14px" class="${R.length > 5 ? 'c' : ''}">${R.map(([o, c, d, l]) => `<div class="r"><div class="o">${o}</div><div><b>${c}</b><p class="d">${d}</p><p class="l">${l}</p></div></div>`).join('')}</div>
<div class="f">mappadellarivolta.org<span>scorri ›</span></div></div>`);
const fine = `<div class="p scuro">${testa(tot)}<h1 style="font-size:116px;margin-top:40px">Prima di<br><em style="color:#ff8fb8">partire</em></h1>
<p class="t" style="color:#e8e4dd">Orari e luoghi possono cambiare: apri l'evento sulla mappa e controlla la fonte.</p>
<p class="t" style="color:#e8e4dd">Treni, bus e scuole: guarda gli avvisi ufficiali. Nei servizi essenziali valgono le fasce di garanzia.</p>
<p class="t" style="color:#fff;font-weight:700">Domani: le piazze del Centro, del Sud e delle isole.</p>
<p class="nota">La mappa riporta informazioni pubbliche con la loro fonte.</p>
<div class="f">mappadellarivolta.org<span>link in bio</span></div></div>`;
fs.mkdirSync('out/nord30', { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const [i, h] of [s1, ...reg, fine].entries()) {
  const pg = await b.newPage({ viewport: { width: 1080, height: 1350 } });
  await pg.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${h}</body></html>`); await pg.evaluate(() => document.fonts.ready);
  const over = await pg.evaluate(() => { const f = document.querySelector('.f').getBoundingClientRect().top; return [...document.querySelectorAll('.p > *:not(.f):not(.n)')].some((e) => e.getBoundingClientRect().bottom > f - 4) || [...document.querySelectorAll('.p *')].some((e) => !e.closest('svg') && e.getBoundingClientRect().right > innerWidth + 1); });
  console.log(i + 1, over ? 'FUORI' : 'ok'); await pg.screenshot({ path: `out/nord30/nord-${i + 1}.png` }); await pg.close(); }
await b.close();
