// Post 1080x1350 (2 slide) "La mappa oggi". Uso: node oggi.mjs <dati.json> <data_pubblicazione AAAA-MM-GG> <cartella_uscita>
// dati.json: { da_verificare, eventi: [[data,tipo,comune,regione,lat,lng,titolo], ...] } solo verificati con fonte, dalla data di pubblicazione in poi.
import fs from 'node:fs'; import { COL, W, H, pathItalia, xy, cssBase } from './motore.mjs'; import { chromium } from 'playwright-core';
const [FILE = 'dati-2026-10-22.json', OGGI = '2026-10-22', OUT = 'out/oggi'] = process.argv.slice(2);
const D = JSON.parse(fs.readFileSync(FILE)); const E = D.eventi.filter((e) => e[0] >= OGGI);
fs.mkdirSync(OUT, { recursive: true });
const n = (s) => s.trim().toLowerCase();
const citta = new Set(E.map((e) => n(e[2]))).size, regioni = new Set(E.map((e) => e[3])).size;
const GG = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'], MM = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
const giorno = (s) => { const d = new Date(s + 'T12:00:00'); return { gg: GG[d.getDay()], d: d.getDate(), m: MM[d.getMonth()] }; };
const g0 = giorno(OGGI);
const NOMI = { sciopero_generale: 'Sciopero generale', sciopero_categoria: 'Sciopero di categoria', corteo: 'Corteo', presidio: 'Presidio', assemblea: 'Assemblea', altro: 'Altro' };
const g = []; for (const [, t, , , la, ln] of E) { let p = g.find((x) => Math.hypot(x.la - la, x.ln - ln) < 0.35); if (!p) { p = { la, ln, n: 0, t: {} }; g.push(p); } p.n++; p.t[t] = (p.t[t] || 0) + 1; }
const dots = g.sort((a, b) => a.n - b.n).map((p) => { const [x, y] = xy(p.la, p.ln); const t = Object.entries(p.t).sort((a, b) => b[1] - a[1])[0][0]; const r = 12 + Math.sqrt(p.n) * 8;
  return `<circle cx="${x}" cy="${y}" r="${r + 12}" fill="${COL[t]}" opacity=".16"/><circle cx="${x}" cy="${y}" r="${r}" fill="${COL[t]}" stroke="#f6f3ee" stroke-width="5"/>${p.n > 1 ? `<text x="${x}" y="${y + 11}" text-anchor="middle" style="font:800 32px T;fill:#fff">${p.n}</text>` : ''}`; }).join('');
const tipi = Object.keys(NOMI).filter((k) => E.some((e) => e[1] === k));
const leg = tipi.map((k) => `<span><i style="background:${COL[k]}"></i>${NOMI[k]}</span>`).join('');
const css = cssBase.replace('body{width:1080px;height:1920px', 'body{width:1080px;height:1350px') + `
.p{position:relative;height:1350px;padding:70px;display:flex;flex-direction:column}
.m{position:static}.n{position:absolute;top:70px;right:70px;font:700 30px T;letter-spacing:.1em;color:#8d8a93}
.k{font:700 34px T;letter-spacing:.14em;text-transform:uppercase;color:#c8322a;margin-top:44px}
h1{font:800 140px/.88 T;text-transform:uppercase;margin-top:8px}h1 em{font-style:normal;color:#c8322a}
.num b{display:block;font:800 150px/.8 T;color:#c8322a}.num span{display:block;font:700 36px/1.15 C;margin-top:8px}
.num.s b{font-size:96px;color:#1c1b1f}
.leg{display:flex;flex-wrap:wrap;gap:8px 24px;font:400 27px C;color:#5f5d66;margin-top:14px}.leg span{display:inline-flex;align-items:center;gap:9px}.leg i{width:20px;height:20px;border-radius:50%}
.badge{background:#1c1b1f;color:#fff;font:600 30px/1.25 C;padding:16px 22px;border-radius:14px}.badge b{color:#ffb15c;font:800 44px T}
.f{margin-top:auto;display:flex;justify-content:space-between;align-items:center;border-top:3px solid currentColor;padding-top:20px;font:800 46px T}.f span{font:600 30px C;opacity:.7}
.dk{background:#1c1b1f;color:#fff}
.row{display:grid;grid-template-columns:300px 1fr;gap:20px;align-items:center;padding:18px 0;border-bottom:2px solid #3a383f}
.row .d{font:800 54px/.9 T;text-transform:uppercase}.row .d small{display:block;font:700 26px T;letter-spacing:.12em;color:#ff8a7e}
.row p{font:400 34px/1.25 C;color:#e8e4dd}.row p b{font:800 50px T;color:#fff;margin-right:8px}`;
const s1 = `<div class="p"><div class="m"><i></i>Mappa della Rivolta</div><div class="n">1/2</div>
 <p class="k">${g0.gg} ${g0.d} ${g0.m}</p><h1>La mappa<br><em>oggi</em></h1>
 <div style="display:grid;grid-template-columns:560px 1fr;gap:26px;flex:1;min-height:0;margin-top:16px">
  <svg viewBox="-30 -20 ${W + 60} ${H + 40}" style="width:100%;height:100%"><path d="${pathItalia}" fill="#fff" stroke="#1c1b1f" stroke-width="3.5" stroke-linejoin="round"/>${dots}</svg>
  <div style="display:flex;flex-direction:column;justify-content:center;gap:30px">
   <p class="num"><b>${E.length}</b><span>mobilitazioni in programma, verificate e con fonte</span></p>
   <div style="display:flex;gap:34px"><p class="num s"><b>${citta}</b><span>città</span></p><p class="num s"><b>${regioni}</b><span>regioni</span></p></div>
   <p class="badge"><b>${D.da_verificare}</b> segnalazioni della community in attesa di controllo</p></div></div>
 <div class="leg">${leg}</div>
 <div class="f" style="margin-top:22px">mappadellarivolta.org<span>scorri ›</span></div></div>`;
const date = [[OGGI, 'Oggi'], ['2026-10-24', ''], ['2026-10-30', 'Sciopero generale'], ['2026-11-20', 'Sciopero generale'], ['2026-12-04', 'Sciopero generale']].filter(([d]) => d >= OGGI);
const NOTE = { '2026-10-30': 'USB, USI-CIT e studenti', '2026-11-20': 'CGIL', '2026-12-04': 'CUB, SGB e altre sigle' };
const righe = date.map(([d, et]) => { const x = E.filter((e) => e[0] === d), c = new Set(x.map((e) => n(e[2]))).size, gi = giorno(d);
  const cosa = x.length === 1 ? 'Sciopero nazionale' : `iniziative in ${c} ${c === 1 ? 'città' : 'città'}`;
  return `<div class="row"><div class="d"><small>${et || gi.gg}</small>${gi.d} ${gi.m.slice(0, 3)}</div><p>${x.length === 1 ? '' : `<b>${x.length}</b>`}${cosa}${NOTE[d] ? ` · ${NOTE[d]}` : ''}</p></div>`; }).join('');
const s2 = `<div class="p dk"><div class="m" style="color:#fff"><i></i>Mappa della Rivolta</div><div class="n">2/2</div>
 <p class="k" style="color:#ff6b5e">Segnatele</p><h1 style="font-size:110px">Le prossime <em>date</em></h1>
 <div style="margin-top:30px">${righe}</div>
 <p style="font:600 34px/1.3 C;color:#e8e4dd;margin-top:34px">Manca un evento della tua città? Aggiungilo in 30 secondi, senza account.</p>
 <p style="font:400 28px/1.3 C;color:#a9a5ae;margin-top:16px">La mappa riporta informazioni pubbliche con la loro fonte.</p>
 <div class="f" style="border-color:#fff">mappadellarivolta.org<span>link in bio</span></div></div>`;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const pg = await b.newPage({ viewport: { width: 1080, height: 1350 } });
for (const [i, h] of [s1, s2].entries()) { await pg.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${h}</body></html>`); await pg.evaluate(() => document.fonts.ready); await pg.screenshot({ path: `${OUT}/oggi-${i + 1}.png` }); }
await b.close();
console.log({ tot: E.length, citta, regioni, da_verificare: D.da_verificare });
