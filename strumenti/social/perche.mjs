import fs from 'node:fs'; import { chromium } from 'playwright-core';
import { cssBase, pathItalia, W, H, xy, COL } from './motore.mjs';
const [N, NC, NR] = process.argv.slice(2).map(Number);
const P = JSON.parse(fs.readFileSync('pall.json'));
const css = cssBase + `*{box-sizing:border-box;margin:0}body{width:1080px;height:auto;font-family:C;color:#1c1b1f;background:#f6f3ee;overflow:hidden}
.p{position:relative;width:1080px;height:1350px;padding:70px;display:flex;flex-direction:column}
.m{position:static;top:auto;left:auto;font:700 32px T;letter-spacing:.14em;text-transform:uppercase;display:flex;align-items:center;gap:14px}.m i{width:20px;height:20px;border-radius:50%;background:#c8322a}
.n{position:absolute;top:72px;right:70px;font:700 30px T;letter-spacing:.1em;opacity:.55}
h1{font:800 120px/.94 T;text-transform:uppercase;margin-top:40px}h1 em{font-style:normal;color:#c8322a}
.k{font:700 32px T;letter-spacing:.12em;text-transform:uppercase;color:#c8322a;margin-top:34px}
.f{display:flex;justify-content:space-between;align-items:center;border-top:3px solid currentColor;padding-top:22px;font:800 46px T;margin-top:auto}.f span{font:600 28px C;opacity:.7}
.scuro{background:#1c1b1f;color:#fff}.t{font:400 40px/1.35 C;margin-top:30px}.q{font:800 92px/1 T;text-transform:uppercase;margin-top:50px}.q em{font-style:normal;color:#c8322a}
.chip{display:inline-block;font:700 34px C;padding:14px 26px;border:3px solid #1c1b1f;border-radius:60px;margin:0 14px 16px 0}
.nota{font:600 27px/1.35 C;opacity:.72;margin-top:24px}`;
const testa = (i) => `<div class="m"><i></i>Mappa della Rivolta</div><div class="n">${i}/5</div>`;
const g = []; for (const [t, la, ln] of P) { let q = g.find((x) => Math.hypot(x.la - la, x.ln - ln) < 0.3); if (!q) { q = { la, ln, n: 0, t: {} }; g.push(q); } q.n++; q.t[t] = (q.t[t] || 0) + 1; }
const dots = g.sort((a, b) => a.n - b.n).map((q) => { const [x, y] = xy(q.la, q.ln); const t = Object.entries(q.t).sort((a, b) => b[1] - a[1])[0][0]; const r = 10 + Math.sqrt(q.n) * 6; return `<circle cx="${x}" cy="${y}" r="${r}" fill="${COL[t]}" stroke="#f6f3ee" stroke-width="4"/>`; }).join('');
const svg = `<svg viewBox="-20 -20 ${W + 40} ${H + 40}" style="width:100%;height:100%"><path d="${pathItalia}" fill="#fff" stroke="#1c1b1f" stroke-width="3.5" stroke-linejoin="round"/>${dots}</svg>`;
const s1 = `<div class="p scuro">${testa(1)}<p class="k">Perché è nata questa mappa</p>
<p class="q" style="font-size:130px;margin-top:auto">Siamo tutti nella <em>stessa barca.</em></p>
<p class="q" style="font-size:100px;color:#c9c5bf;margin-top:40px">Ma con la testa girata dall'altra parte.</p>
<div class="f">Scorri<span>›</span></div></div>`;
const s2 = `<div class="p">${testa(2)}<h1>Per anni,<br><em>divisi</em></h1>
<p class="t">Si protestava in pochi e ognuno per conto suo, come se i problemi fossero solo di qualcuno.</p>
<div style="margin-top:44px">${['Metalmeccanici', 'Commercianti', 'Scuola', 'Sanità', 'Trasporti', 'Agricoltori', 'Studenti'].map((c) => `<span class="chip">${c}</span>`).join('')}</div>
<p class="t" style="font-weight:700">E così non ci vedevamo.</p>
<div class="f">mappadellarivolta.org<span>scorri ›</span></div></div>`;
const s3 = `<div class="p">${testa(3)}<h1 style="font-size:100px;margin-top:30px">La soluzione:<br><em>una mappa che ci fa vedere</em></h1>
<div style="display:grid;grid-template-columns:520px 1fr;gap:24px;flex:1;min-height:0;margin-top:14px"><div style="min-height:0;display:flex;justify-content:center">${svg}</div>
<div style="display:flex;flex-direction:column;justify-content:center;gap:14px"><p style="font:700 32px/1.25 C">Tutte le piazze nello stesso posto. E a chi pensa "tanto saremo quattro gatti":</p><p style="font:800 170px/.8 T;color:#c8322a">${N}</p><p style="font:700 36px/1.2 C">iniziative in arrivo, ognuna con la sua fonte</p><p style="font:400 32px/1.3 C;color:#5f5d66">in ${NC} comuni e ${NR} regioni</p></div></div>
<div class="f">mappadellarivolta.org<span>scorri ›</span></div></div>`;
const s4 = `<div class="p">${testa(4)}<h1 style="font-size:112px">Rivolta,<br>come lo stomaco<br><em>che si rivolta</em></h1>
<p class="t">È quello che sentono tanti davanti a una situazione che non regge più.</p>
<p class="t" style="font-weight:700">È un sentimento, non un invito allo scontro.</p>
<p class="t">Sulla mappa ci sono solo iniziative pacifiche. Chi incita alla violenza o ad azioni illegali viene rimosso.</p>
<div class="f">mappadellarivolta.org<span>scorri ›</span></div></div>`;
const s5 = `<div class="p scuro">${testa(5)}<h1 style="font-size:112px">Chi c'è<br><em>dietro</em></h1>
<p class="t" style="color:#e8e4dd">Un lavoratore, non un politico né un attivista. E una community di volontari che controlla ogni voce.</p>
<p class="t" style="color:#e8e4dd">Nessun partito, sindacato o collettivo: la mappa è aperta a tutti, purché rispettino la legge e la sicurezza delle persone.</p>
<p class="t" style="color:#fff;font-weight:700">Informa, non organizza.</p>
<p class="nota">La mappa riporta informazioni pubbliche con la loro fonte.</p>
<div class="f">mappadellarivolta.org<span>link in bio</span></div></div>`;
fs.mkdirSync('out/perche', { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
for (const [i, h] of [s1, s2, s3, s4, s5].entries()) {
  const pg = await b.newPage({ viewport: { width: 1080, height: 1350 } });
  await pg.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${h}</body></html>`); await pg.evaluate(() => document.fonts.ready);
  const over = await pg.evaluate(() => [...document.querySelectorAll('.p *')].some((e) => { if (e.closest('svg')) return false; const r = e.getBoundingClientRect(); return r.bottom > innerHeight + 1 || r.right > innerWidth + 1; }));
  console.log(i + 1, over ? 'FUORI' : 'ok'); await pg.screenshot({ path: `out/perche/perche-${i + 1}.png` }); await pg.close(); }
await b.close();
