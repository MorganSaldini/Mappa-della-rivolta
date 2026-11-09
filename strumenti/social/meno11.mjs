import fs from 'node:fs'; import { chromium } from 'playwright-core'; import { cssBase, pathItalia, xy, W, H } from './motore.mjs';
const C = JSON.parse(fs.readFileSync('v20b.json')); const N = Object.keys(C).length;
const css = cssBase.replace('height:1920px', 'height:1350px') + `.m{top:70px}.k{font:700 34px T;letter-spacing:.12em;text-transform:uppercase;color:#c8322a}`;
const dots = Object.values(C).map(([la, ln]) => { const [x, y] = xy(la, ln); return `<circle cx="${x}" cy="${y}" r="22" fill="#c8322a" opacity=".22"/><circle cx="${x}" cy="${y}" r="8.5" fill="#c8322a" stroke="#fff" stroke-width="2.5"/>`; }).join('');
const CEN = ['Firenze', 'Lucca', 'Pisa', 'Siena', 'Pesaro', 'Perugia', 'Roma', 'Arezzo', 'Livorno', 'Ancona', 'Terni', 'Viterbo', 'Latina']; const SUD = ['L\'Aquila', 'Pescara', 'Teramo', 'Vasto', 'Chieti'];
const zona = (la, c) => CEN.includes(c) ? 'Centro' : SUD.includes(c) || la < 41.4 ? 'Sud e isole' : 'Nord';
const G = { Nord: [], Centro: [], 'Sud e isole': [] }; for (const [c, [la]] of Object.entries(C).sort()) G[zona(la, c)].push(c);
const S = [
`<div style="position:absolute;inset:0;background:#f6f3ee;padding:170px 80px 0"><p class="k">Sciopero generale · 20 novembre</p><p style="font:800 210px/.82 T;color:#c8322a;margin-top:10px">−11</p><p style="font:800 84px/.92 T;text-transform:uppercase;margin-top:16px;width:440px">E ${N} città<br>sono già<br>sulla mappa.</p><p style="font:600 38px/1.3 C;margin-top:24px;width:400px">La tua c'è? Scorri →</p>
<svg viewBox="0 0 ${W} ${H}" style="position:absolute;right:-30px;top:420px;width:780px;height:907px;overflow:visible"><path d="${pathItalia}" fill="#fff" stroke="#1c1b1f" stroke-width="3"/>${dots}</svg></div>`,
`<div style="position:absolute;inset:0;background:#1c1b1f;color:#fff;padding:160px 80px 0"><p class="k" style="color:#ff8f86">Venerdì 20 · le ${N} città</p>
${Object.entries(G).map(([z, cs]) => `<p style="font:700 32px T;letter-spacing:.1em;text-transform:uppercase;color:#ff8f86;margin-top:40px">${z} · ${cs.length}</p><p style="font:800 52px/1.22 T;text-transform:uppercase;margin-top:8px">${cs.map((x) => x.replace(/ /g, '&nbsp;')).join(' <span style="color:#c8322a">·</span> ')}</p>`).join('')}
<p style="position:absolute;left:80px;right:80px;bottom:64px;font:600 34px/1.3 C">Manca la tua? Aggiungila su <b>mappadellarivolta.org</b>, basta il link a una locandina.</p></div>`,
`<div style="position:absolute;inset:0;background:#f6f3ee;padding:170px 80px 0"><p class="k">Prima del 20</p><p style="font:800 110px/.9 T;text-transform:uppercase;margin-top:14px">Sabato 14<br>si torna in piazza.</p>
${[['Milano', '14:00', 'corteo contro il carovita'], ['Brescia', '14:00', 'corteo contro il carovita'], ['Verona', '14:00', 'corteo silenzioso per Gaza']].map(([c, o, d]) => `<div style="display:flex;gap:26px;align-items:baseline;border-top:3px solid #1c1b1f;padding:20px 0;margin-top:${c === 'Milano' ? 40 : 0}px"><b style="font:800 58px T;text-transform:uppercase;width:300px">${c}</b><span style="font:800 40px T;color:#c8322a;width:120px">${o}</span><span style="font:600 36px/1.2 C">${d}</span></div>`).join('')}
<div style="margin-top:40px;background:#fff;border-radius:22px;padding:26px 30px;border-left:10px solid #e0a020"><p style="font:800 40px T;text-transform:uppercase">Possibili disagi nei trasporti</p><p style="font:600 32px/1.35 C;margin-top:8px">Scioperi locali in settimana, tra cui ATM Milano venerdì 13 e AMTAB Bari sabato 14. Controlla prima di partire.</p></div></div>`,
`<div style="position:absolute;inset:0;background:#c8322a;color:#fff;padding:210px 80px 0"><p class="k" style="color:#ffd5d1">Mancano 11 giorni</p><p style="font:800 140px/.88 T;text-transform:uppercase;margin-top:16px">Condividi<br>con chi vuole<br>scioperare.</p>
<p style="font:600 42px/1.35 C;margin-top:30px">Ogni condivisione porta la mappa a qualcuno in più.</p>
<div style="display:inline-flex;align-items:center;gap:22px;margin-top:40px;background:#fff;color:#1c1b1f;padding:20px 34px;border-radius:60px;font:800 50px T"><span style="background:#c8322a;color:#fff;border-radius:40px;padding:4px 22px;font-size:38px">+ Segui</span>@mappadellarivolta</div>
<p style="font:600 30px C;margin-top:30px">♥ Gratis e senza pubblicità: se puoi, sostienila con un caffè.</p>
<p style="position:absolute;left:80px;right:80px;bottom:52px;font:600 23px/1.4 C;color:#ffe1de">Fonti: schede della mappa (sindacati, collettivi, Commissione di garanzia scioperi). La mappa riporta informazioni pubbliche con la loro fonte.</p></div>`];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
for (let i = 0; i < S.length; i++) { const d = i === 1 || i === 3; await p.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${S[i]}<div class="m" style="color:${d ? '#fff' : '#1c1b1f'}"><i style="${i === 3 ? 'background:#fff' : ''}"></i>Mappa della Rivolta</div></body></html>`); await p.evaluate(() => document.fonts.ready);
  const f = await p.evaluate(() => Math.max(...[...document.querySelectorAll('p,div')].map((e) => e.getBoundingClientRect().bottom))); if (f > 1352) console.log('FUORI', i + 1, f);
  await p.screenshot({ path: `out/m11-0${i + 1}.png` }); }
await b.close();
