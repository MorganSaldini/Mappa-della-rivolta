// Carosello 1080x1350 "−9 al 20 novembre" (12:15 dell'11/11/2026).
// Dati: v20-11nov.json (città con eventi `verificato` con fonte il 20/11, lette da /api/mobilitazioni il 10/11/2026 ~19:10).
// Uso: node meno9.mjs  → out/m9-01..04.png
import fs from 'node:fs'; import { chromium } from 'playwright-core'; import { cssBase, pathItalia, xy, W, H, CHROME } from './motore.mjs';
const C = JSON.parse(fs.readFileSync('v20-11nov.json')).citta; const N = Object.keys(C).length;
const NREG = new Set(Object.values(C).map((v) => v[2])).size;
const YOUTH = 20; // città con corteo Youth Strike verificato il 20/11
const css = cssBase.replace('height:1920px', 'height:1350px') + `.m{top:70px}.k{font:700 34px T;letter-spacing:.12em;text-transform:uppercase;color:#c8322a}`;
const NORD = ['Piemonte', 'Lombardia', 'Trentino-Alto Adige', 'Veneto', 'Friuli-Venezia Giulia', 'Liguria', 'Emilia-Romagna'];
const CENTRO = ['Toscana', 'Umbria', 'Marche', 'Lazio'];
const zona = (r) => NORD.includes(r) ? 'Nord' : CENTRO.includes(r) ? 'Centro' : 'Sud e isole';
const G = { Nord: [], Centro: [], 'Sud e isole': [] }; for (const [c, [, , r]] of Object.entries(C)) G[zona(r)].push(c);
for (const z in G) G[z].sort((a, b) => a.localeCompare(b, 'it'));
const dots = (r1, r2, fill, st) => Object.values(C).map(([la, ln]) => { const [x, y] = xy(la, ln); return `<circle cx="${x}" cy="${y}" r="${r1}" fill="${fill}" opacity=".25"/><circle cx="${x}" cy="${y}" r="${r2}" fill="${fill}" stroke="${st}" stroke-width="2.5"/>`; }).join('');
const S = [
// 1 · copertina scura, mappa grande a destra, numero a sinistra in basso
`<div style="position:absolute;inset:0;background:#1c1b1f;color:#fff;overflow:hidden">
<svg viewBox="0 0 ${W} ${H}" style="position:absolute;right:-50px;top:250px;width:800px;height:930px;overflow:visible"><path d="${pathItalia}" fill="#2c2a30" stroke="#57545c" stroke-width="2.5"/>${dots(20, 8.5, '#ff5a4e', '#1c1b1f')}</svg>
<div style="position:absolute;left:80px;top:180px"><p class="k" style="color:#ff8f86">Venerdì 20 novembre</p><p style="font:800 64px/.95 T;text-transform:uppercase;margin-top:12px;width:380px">Sciopero<br>generale</p></div>
<div style="position:absolute;left:80px;bottom:110px"><p style="font:800 260px/.8 T;color:#ff5a4e">${N}</p><p style="font:800 70px/.95 T;text-transform:uppercase;margin-top:14px">città sulla mappa.<br><span style="color:#ff8f86">Mancano 9 giorni.</span></p><p style="font:600 36px C;margin-top:20px;color:#d8d4ce">La tua c'è? Scorri →</p></div></div>`,
// 2 · elenco per zona su carta, a colonne
`<div style="position:absolute;inset:0;background:#f6f3ee;padding:160px 80px 0"><p class="k">Le ${N} città del 20 · ${NREG} regioni</p>
<div style="display:flex;flex-direction:column;gap:40px;margin-top:44px">
${Object.entries(G).map(([z, cs]) => `<div style="border-top:4px solid #1c1b1f;padding-top:14px"><p style="display:flex;justify-content:space-between;font:800 44px T;text-transform:uppercase"><span>${z}</span><span style="color:#c8322a">${cs.length}</span></p><p style="font:600 39px/1.38 C;margin-top:8px;color:#3b3940">${cs.map((x) => x.replace(/ /g, '&nbsp;')).join('&nbsp;· ')}</p></div>`).join('')}
</div>
<p style="position:absolute;left:80px;right:80px;bottom:60px;font:600 30px/1.3 C;color:#55525c">Solo piazze verificate, ognuna con la sua fonte.</p></div>`,
// 3 · cosa succede il 20, tre righe
`<div style="position:absolute;inset:0;background:#f6f3ee;padding:160px 80px 0"><p class="k">Cosa succede il 20</p><p style="font:800 100px/.9 T;text-transform:uppercase;margin-top:12px">Tre cose<br>da sapere.</p>
${[['Sciopero generale CGIL', 'Tutti i settori, pubblici e privati, per l\'intera giornata. Cortei e presidi nelle città.', '#8e1b5e'],
  ['Youth Strike', `Studenti e studentesse in corteo dalle 9, in ${YOUTH} città sulla mappa.`, '#c8322a'],
  ['Possibili disagi: treni', 'Sciopero ferroviario CUB Trasporti e SGB dalle 21 di venerdì 20 alle 20 di sabato 21.', '#e0a020']].map(([t, d, c], i) => `<div style="display:flex;gap:28px;margin-top:${i ? 44 : 64}px;align-items:flex-start"><b style="flex:none;width:76px;height:76px;border-radius:50%;background:${c};color:#fff;font:800 48px/76px T;text-align:center">${i + 1}</b><div><p style="font:800 56px T;text-transform:uppercase">${t}</p><p style="font:600 38px/1.3 C;margin-top:8px;color:#3b3940">${d}</p></div></div>`).join('')}
<p style="position:absolute;left:80px;right:80px;bottom:60px;font:600 26px/1.35 C;color:#55525c">Fasce garantite dei treni: controlla il sito della tua compagnia il giorno prima.</p></div>`,
// 4 · chiusura rossa
`<div style="position:absolute;inset:0;background:#c8322a;color:#fff;padding:260px 80px 0"><p class="k" style="color:#ffd5d1">La tua città manca?</p><p style="font:800 124px/.88 T;text-transform:uppercase;margin-top:16px">Aggiungila<br>in un minuto.</p>
<p style="font:600 40px/1.35 C;margin-top:34px">Su <b>mappadellarivolta.org</b> tocca "+ Aggiungi" e incolla il link alla locandina o al comunicato. Non serve un account.</p>
<div style="display:inline-flex;align-items:center;gap:22px;margin-top:44px;background:#fff;color:#1c1b1f;padding:20px 34px;border-radius:60px;font:800 50px T"><span style="background:#c8322a;color:#fff;border-radius:40px;padding:4px 22px;font-size:38px">+ Segui</span>@mappadellarivolta</div>
<p style="position:absolute;left:80px;right:80px;bottom:52px;font:600 23px/1.4 C;color:#ffe1de">Fonti: schede della mappa (CGIL, Rete della Conoscenza, UDS, LINK), CGIL nazionale, Ministero dei Trasporti. La mappa riporta informazioni pubbliche con la loro fonte.</p></div>`];
fs.mkdirSync('out', { recursive: true });
const b = await chromium.launch({ executablePath: CHROME });
const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
for (let i = 0; i < S.length; i++) { const d = i === 0 || i === 3; await p.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${S[i]}<div class="m" style="color:${d ? '#fff' : '#1c1b1f'}"><i style="${i === 3 ? 'background:#fff' : ''}"></i>Mappa della Rivolta</div></body></html>`); await p.evaluate(() => document.fonts.ready);
  const f = await p.evaluate(() => Math.max(...[...document.querySelectorAll('p,div')].map((e) => e.getBoundingClientRect().bottom))); if (f > 1352) console.log('FUORI', i + 1, f);
  await p.screenshot({ path: `out/m9-0${i + 1}.png` }); }
await b.close(); console.log(N, 'città,', NREG, 'regioni', Object.fromEntries(Object.entries(G).map(([z, c]) => [z, c.length])));
