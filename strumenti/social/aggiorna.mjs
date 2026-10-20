import fs from 'node:fs'; import { COL, W, H, pathItalia, xy, cssBase } from './motore.mjs'; import { chromium } from 'playwright-core';
const P = JSON.parse(fs.readFileSync('punti2.json'));
const NOMI = { sciopero_categoria: 'Sciopero di categoria', sciopero_generale: 'Sciopero generale', corteo: 'Corteo', presidio: 'Presidio', assemblea: 'Assemblea' };
const g = []; for (const [t, la, ln] of P) { let p = g.find((x) => Math.hypot(x.la - la, x.ln - ln) < 0.35); if (!p) { p = { la, ln, n: 0, t: {} }; g.push(p); } p.n++; p.t[t] = (p.t[t] || 0) + 1; }
const dots = g.sort((a, b) => a.n - b.n).map((p) => { const [x, y] = xy(p.la, p.ln); const t = Object.entries(p.t).sort((a, b) => b[1] - a[1])[0][0]; const r = 13 + Math.sqrt(p.n) * 9;
  return `<circle cx="${x}" cy="${y}" r="${r + 14}" fill="${COL[t]}" opacity=".16"/><circle cx="${x}" cy="${y}" r="${r}" fill="${COL[t]}" stroke="#f6f3ee" stroke-width="5"/>${p.n > 1 ? `<text x="${x}" y="${y + 11}" text-anchor="middle" style="font:800 34px T;fill:#fff">${p.n}</text>` : ''}`; }).join('');
const leg = Object.entries(NOMI).map(([k, v]) => `<span style="display:inline-flex;align-items:center;gap:10px"><i style="width:22px;height:22px;border-radius:50%;background:${COL[k]}"></i>${v}</span>`).join('');
const html = `<!doctype html><html><head><meta charset="utf-8"><style>${cssBase}
.pag{position:relative;height:1920px;padding:250px 80px 300px;display:flex;flex-direction:column}
h1{font:800 120px/.9 T;text-transform:uppercase}h1 em{font-style:normal;color:#c8322a}
.row{display:flex;align-items:flex-end;gap:26px;margin-top:30px}.row b{font:800 170px/.8 T;color:#c8322a}.row p{font:700 44px/1.15 C;padding-bottom:6px}
.badge{display:inline-block;background:#1c1b1f;color:#fff;font:700 36px C;padding:10px 22px;border-radius:12px;margin-top:22px;align-self:flex-start}.badge b{color:#ffb15c}
svg{width:100%;flex:1;min-height:0;margin-top:20px}
.sub{font:700 38px C}.sub b{color:#c8322a;font:800 52px T}
.leg{display:flex;flex-wrap:wrap;gap:10px 26px;margin-top:12px;font:400 30px C;color:#5f5d66}
</style></head><body><div class="pag"><div class="m"><i></i>Mappa della Rivolta</div>
<h1>La mappa<br><em>cresce.</em></h1>
<div class="row"><b>116</b><p>segnalazioni<br>in 54 città e 17 regioni</p></div>
<p class="badge"><b>+42</b> da stanotte. Grazie a chi le aggiunge ❤️</p>
<svg viewBox="-30 -20 ${W + 60} ${H + 40}"><path d="${pathItalia}" fill="#fff" stroke="#1c1b1f" stroke-width="3.5" stroke-linejoin="round"/>${dots}</svg>
<p class="sub"><b>${P.length}</b> in programma con fonte, da domani in poi</p><div class="leg">${leg}</div>
</div></body></html>`;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
await p.setContent(html); await p.evaluate(() => document.fonts.ready);
console.log(await p.evaluate(() => document.querySelector('.leg').getBoundingClientRect().bottom));
await p.screenshot({ path: 'out/storia-aggiornamento.png' }); await b.close();
