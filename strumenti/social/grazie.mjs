import fs from 'node:fs'; import { createRequire } from 'node:module';
import { feature } from 'topojson-client'; import { geoMercator, geoPath } from 'd3-geo'; import { chromium } from 'playwright-core';
const require = createRequire(import.meta.url);
const P = JSON.parse(fs.readFileSync('punti.json'));
const COL = { pdio: '#d96c00', sria: '#2a5db0', alea: '#6b4fbb', cteo: '#c8322a', sale: '#8e1b5e', altr: '#55525c' };
const topo = require('world-atlas/countries-50m.json'); const it = { type: 'FeatureCollection', features: feature(topo, topo.objects.countries).features.filter((f) => f.id === '380') };
const W = 900, H = 1000, proj = geoMercator().fitSize([W, H], it);
const g = []; for (const [t, la, ln] of P) { let p = g.find((x) => Math.hypot(x.la - la, x.ln - ln) < 0.35); if (!p) { p = { la, ln, n: 0, t: {} }; g.push(p); } p.n++; p.t[t] = (p.t[t] || 0) + 1; }
const dots = g.sort((a, b) => a.n - b.n).map((p) => { const [x, y] = proj([p.ln, p.la]); const t = Object.entries(p.t).sort((a, b) => b[1] - a[1])[0][0]; const r = 12 + Math.sqrt(p.n) * 9;
  return `<circle cx="${x}" cy="${y}" r="${r + 14}" fill="${COL[t]}" opacity=".16"/><circle cx="${x}" cy="${y}" r="${r}" fill="${COL[t]}" stroke="#f6f3ee" stroke-width="5"/>${p.n > 1 ? `<text x="${x}" y="${y + 10}" text-anchor="middle" style="font:800 32px T;fill:#fff">${p.n}</text>` : ''}`; }).join('');
const svg = `<svg viewBox="-30 -20 ${W + 60} ${H + 40}" style="width:100%;height:100%"><path d="${geoPath(proj)(it)}" fill="#fff" stroke="#1c1b1f" stroke-width="3.5" stroke-linejoin="round"/>${dots}</svg>`;
const font = (pkg, file) => `url(data:font/woff2;base64,${fs.readFileSync(require.resolve(`${pkg}/files/${file}`)).toString('base64')})`;
const css = `@font-face{font-family:T;font-weight:800;src:${font('@fontsource/barlow-condensed','barlow-condensed-latin-800-normal.woff2')}}@font-face{font-family:T;font-weight:700;src:${font('@fontsource/barlow-condensed','barlow-condensed-latin-700-normal.woff2')}}
@font-face{font-family:C;font-weight:400;src:${font('@fontsource/source-sans-3','source-sans-3-latin-400-normal.woff2')}}@font-face{font-family:C;font-weight:600;src:${font('@fontsource/source-sans-3','source-sans-3-latin-600-normal.woff2')}}@font-face{font-family:C;font-weight:700;src:${font('@fontsource/source-sans-3','source-sans-3-latin-700-normal.woff2')}}
*{box-sizing:border-box;margin:0}body{width:1080px;height:1350px;overflow:hidden;font-family:C;color:#1c1b1f;background:#f6f3ee}
.p{position:relative;height:1350px;padding:70px;display:flex;flex-direction:column}
.m{font:700 32px T;letter-spacing:.14em;text-transform:uppercase;display:flex;align-items:center;gap:14px}.m i{width:20px;height:20px;border-radius:50%;background:#c8322a}
h1{font:800 150px/.88 T;text-transform:uppercase;margin-top:30px}h1 em{font-style:normal;color:#c8322a}
.f{display:flex;justify-content:space-between;align-items:center;border-top:3px solid currentColor;padding-top:22px;font:800 50px T}.f span{font:600 30px C;opacity:.7}
.scuro{background:#1c1b1f;color:#fff}`;
const s1 = `<div class="p"><div class="m"><i></i>Mappa della Rivolta</div>
 <h1>Nessuno<br><em>da solo.</em></h1>
 <div style="display:grid;grid-template-columns:540px 1fr;gap:30px;flex:1;min-height:0;margin-top:20px">
  <div style="min-height:0;min-width:0;display:flex;justify-content:center">${svg}</div>
  <div style="display:flex;flex-direction:column;justify-content:center;gap:34px">
   <p style="font:800 190px/.8 T;color:#c8322a">91</p><p style="font:700 44px/1.15 C;margin-top:-10px">segnalazioni arrivate da voi in tre giorni, verificate e sulla mappa.</p>
   <p style="font:400 36px/1.3 C;color:#5f5d66">Grazie. Oggi sono 97 le mobilitazioni in programma, in 46 città e 15 regioni.</p></div></div>
 <div class="f">mappadellarivolta.org<span>scorri ›</span></div></div>`;
const step = (n, b, t) => `<li style="display:flex;gap:30px;align-items:flex-start"><b style="flex:none;width:90px;height:90px;border-radius:50%;background:#c8322a;font:800 58px/90px T;text-align:center">${n}</b><p style="font:400 40px/1.25 C;color:#e8e4dd"><b style="display:block;font:700 48px C;color:#fff">${b}</b>${t}</p></li>`;
const s2 = `<div class="p scuro"><div class="m"><i></i>Mappa della Rivolta</div>
 <h1 style="font-size:128px;line-height:.98">Più siamo,<br>più è <em>completa.</em></h1>
 <ul style="list-style:none;padding:0;margin-top:70px;display:flex;flex-direction:column;gap:46px">
  ${step(1, 'Condividi questo post', 'Mandalo a chi sciopera, organizza o scende in piazza.')}
  ${step(2, 'Aggiungi la tua città', 'Manca un presidio o un corteo? Bastano 30 secondi, senza account.')}
  ${step(3, 'Conferma o correggi', 'Ogni conferma rende la mappa più affidabile.')}</ul>
 <div class="f" style="margin-top:auto">mappadellarivolta.org<span>link in bio</span></div></div>`;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const pg = await b.newPage({ viewport: { width: 1080, height: 1350 } });
for (const [n, h] of [['post-grazie-1', s1], ['post-grazie-2', s2]]) { await pg.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${h}</body></html>`); await pg.evaluate(() => document.fonts.ready); await pg.screenshot({ path: `out/${n}.png` }); }
await b.close();
