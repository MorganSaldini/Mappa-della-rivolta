import { W, H, pathItalia, xy, cssBase } from './motore.mjs'; import { chromium } from 'playwright-core';
const E = [
 { c: 'Lucca', ora: '8:30', luogo: 'Piazza San Michele', tit: 'Sciopero studentesco', org: 'Collettivi studenteschi', la: 43.843, ln: 10.503 },
 { c: 'Castel Volturno', ora: '13:00', luogo: 'Luogo di ritrovo: vedi la fonte sulla mappa', tit: 'No CPR, né qui né altrove', org: 'Comitato regionale No CPR', la: 41.034, ln: 13.941 },
 { c: 'Roma', ora: '14:00', luogo: 'Piazza della Repubblica', tit: 'Corteo nazionale per la pace "Fuori l\'Italia dalla guerra"', org: 'Campagna Fuori l\'Italia dalla guerra', la: 41.903, ln: 12.496 },
 { c: 'Torino', ora: '15:00 – 18:00', luogo: 'Piazza Castello', tit: 'Torino contro il riarmo', org: 'Torino contro il riarmo · Oltre Torino · KSA Torino', la: 45.07, ln: 7.686 },
].map((e) => ({ ...e, xy: xy(e.la, e.ln) }));
const mappa = (hi) => `<svg viewBox="-20 -20 ${W + 40} ${H + 40}" style="width:100%;height:100%"><path d="${pathItalia}" fill="#fff" stroke="#1c1b1f" stroke-width="3.5" stroke-linejoin="round"/>${E.map((e, i) => `<circle cx="${e.xy[0]}" cy="${e.xy[1]}" r="${i === hi ? 50 : 34}" fill="#c8322a" opacity="${hi === -1 || i === hi ? .2 : .08}"/><circle cx="${e.xy[0]}" cy="${e.xy[1]}" r="${i === hi ? 26 : 18}" fill="${hi === -1 || i === hi ? '#c8322a' : '#d8cfc4'}" stroke="#f6f3ee" stroke-width="5"/>`).join('')}</svg>`;
const css = cssBase.replace('body{width:1080px;height:1920px', 'body{width:1080px;height:1350px') + `
.p{position:relative;height:1350px;padding:70px;display:flex;flex-direction:column}
.m{position:static}.n{position:absolute;top:70px;right:70px;font:700 30px T;letter-spacing:.1em;color:#8d8a93}
h1{font:800 132px/.88 T;text-transform:uppercase;margin-top:30px}h1 em{font-style:normal;color:#c8322a}
.f{margin-top:auto;display:flex;justify-content:space-between;align-items:center;border-top:3px solid currentColor;padding-top:20px;font:800 46px T}.f span{font:600 30px C;opacity:.7}
.dk{background:#1c1b1f;color:#fff}`;
const tot = E.length + 2;
const P = {};
P['1'] = `<div class="p"><div class="m"><i></i>Mappa della Rivolta</div><div class="n">1/${tot}</div>
 <h1>Sabato 24<br><em>${E.length} piazze</em><br>in un giorno</h1>
 <div style="display:grid;grid-template-columns:1fr 420px;gap:30px;flex:1;min-height:0;margin-top:20px">
  <div style="min-height:0">${mappa(-1)}</div>
  <ul style="list-style:none;padding:0;align-self:center;display:flex;flex-direction:column;gap:20px">${E.map((e) => `<li style="border-left:10px solid #c8322a;padding-left:18px"><b style="display:block;font:800 52px/1 T;text-transform:uppercase">${e.c}</b><span style="font:600 32px C;color:#5f5d66">ore ${e.ora.split(' ')[0]}</span></li>`).join('')}</ul></div>
 <div class="f">Salva il post per sabato<span>scorri ›</span></div></div>`;
E.forEach((e, i) => {
  P[String(i + 2)] = `<div class="p"><div class="m"><i></i>Mappa della Rivolta</div><div class="n">${i + 2}/${tot}</div>
   <p style="margin-top:34px;font:700 36px T;letter-spacing:.12em;text-transform:uppercase;color:#c8322a">Sabato 24 · ore ${e.ora}</p>
   <h1 style="font-size:${e.c.length > 10 ? 120 : 150}px;margin-top:6px">${e.c}</h1>
   <p style="font:700 54px/1.15 C;margin-top:26px">${e.tit}</p>
   <div style="display:grid;grid-template-columns:1fr 500px;gap:20px;flex:1;min-height:0;margin-top:30px">
    <div style="display:flex;flex-direction:column;gap:26px;font:400 36px/1.3 C;color:#2b2a30">
     <p><b style="display:block;font:700 28px T;letter-spacing:.12em;text-transform:uppercase;color:#8d8a93">Dove</b>${e.luogo}</p>
     <p><b style="display:block;font:700 28px T;letter-spacing:.12em;text-transform:uppercase;color:#8d8a93">Chi organizza</b>${e.org}</p></div>
    <div style="min-height:0">${mappa(i)}</div></div>
   <div class="f">mappadellarivolta.org<span>${i + 2 < tot - 0 ? 'scorri ›' : ''}</span></div></div>`;
});
P[String(tot)] = `<div class="p dk"><div class="m" style="color:#fff"><i></i>Mappa della Rivolta</div><div class="n">${tot}/${tot}</div>
 <h1 style="font-size:120px">La tua città<br><em>non c'è?</em></h1>
 <p style="font:600 46px/1.3 C;color:#e8e4dd;margin-top:40px">Se sabato c'è un corteo, un presidio o un'assemblea vicino a te, aggiungilo sulla mappa in 30 secondi. Senza account.</p>
 <p style="font:600 40px/1.3 C;color:#c9c5bf;margin-top:30px">Ogni evento ha una fonte e viene controllato da volontari. Orari e luoghi possono cambiare: verifica prima di partire.</p>
 <div class="f" style="border-color:#fff">mappadellarivolta.org<span>link in bio</span></div></div>`;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const pg = await b.newPage({ viewport: { width: 1080, height: 1350 } });
for (const [n, h] of Object.entries(P)) { await pg.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${h}</body></html>`); await pg.evaluate(() => document.fonts.ready); await pg.screenshot({ path: `out24/sabato-${n}.png` }); }
await b.close();
