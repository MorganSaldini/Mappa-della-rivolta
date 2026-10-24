import fs from 'node:fs'; import { chromium } from 'playwright-core';
import { cssBase, pathItalia, W, H, xy, COL } from './motore.mjs';
const [N, NC, NR] = process.argv.slice(2).map(Number);
const P = JSON.parse(fs.readFileSync('p30.json'));
const css = cssBase + `*{box-sizing:border-box;margin:0}body{width:1080px;height:auto;font-family:C;color:#1c1b1f;background:#f6f3ee;overflow:hidden}
.p{position:relative;width:1080px;height:1350px;padding:70px;display:flex;flex-direction:column}
.m{position:static;top:auto;left:auto;font:700 32px T;letter-spacing:.14em;text-transform:uppercase;display:flex;align-items:center;gap:14px}.m i{width:20px;height:20px;border-radius:50%;background:#c8322a}
.n{position:absolute;top:72px;right:70px;font:700 30px T;letter-spacing:.1em;opacity:.55}
h1{font:800 124px/.92 T;text-transform:uppercase;margin-top:10px}h1 em{font-style:normal;color:#c8322a}
.k{font:700 32px T;letter-spacing:.12em;text-transform:uppercase;color:#c8322a;margin-top:34px}
.f{display:flex;justify-content:space-between;align-items:center;border-top:3px solid currentColor;padding-top:22px;font:800 46px T;margin-top:auto}.f span{font:600 28px C;opacity:.7}
.scuro{background:#1c1b1f;color:#fff}.vino{background:#8e1b5e;color:#fff}.vino .k{color:#ffd0e2}
.t{font:400 38px/1.32 C;margin-top:28px}.fonte{font:600 27px/1.35 C;opacity:.75;margin-top:22px}
.r{display:flex;gap:24px;align-items:baseline;padding:8px 0;border-bottom:2px solid #d9d3c8}.r .o{flex:none;width:100px;font:800 40px T;color:#c8322a}.r b{font:800 42px T;text-transform:uppercase;width:230px;flex:none}.r span{font:400 30px C;color:#4a4850}
.li{display:flex;gap:26px;align-items:flex-start;margin-top:38px}.li b.n2{flex:none;width:76px;height:76px;border-radius:50%;background:#c8322a;color:#fff;font:800 48px/76px T;text-align:center}.li p{font:400 35px/1.3 C;color:#e8e4dd}.li p b{display:block;font:700 41px C;color:#fff}`;
const testa = (i) => `<div class="m"><i></i>Mappa della Rivolta</div><div class="n">${i}/5</div>`;
const g = []; for (const [t, la, ln] of P) { let q = g.find((x) => Math.hypot(x.la - la, x.ln - ln) < 0.3); if (!q) { q = { la, ln, n: 0 }; g.push(q); } q.n++; }
const dots = g.sort((a, b) => a.n - b.n).map((q) => { const [x, y] = xy(q.la, q.ln); const r = 12 + Math.sqrt(q.n) * 8; return `<circle cx="${x}" cy="${y}" r="${r + 12}" fill="#8e1b5e" opacity=".16"/><circle cx="${x}" cy="${y}" r="${r}" fill="#8e1b5e" stroke="#f6f3ee" stroke-width="4"/>`; }).join('');
const svg = `<svg viewBox="-20 -20 ${W + 40} ${H + 40}" style="width:100%;height:100%"><path d="${pathItalia}" fill="#fff" stroke="#1c1b1f" stroke-width="3.5" stroke-linejoin="round"/>${dots}</svg>`;
const s1 = `<div class="p">${testa(1)}<p class="k">Venerdì 30 ottobre · sciopero generale</p><h1>Mancano<br><em>5 giorni</em></h1>
<div style="display:grid;grid-template-columns:540px 1fr;gap:24px;flex:1;min-height:0;margin-top:14px"><div style="min-height:0;display:flex;justify-content:center">${svg}</div>
<div style="display:flex;flex-direction:column;justify-content:center;gap:14px"><p style="font:800 180px/.8 T;color:#8e1b5e">${N}</p><p style="font:700 40px/1.15 C">iniziative già sulla mappa, tutte con fonte</p><p style="font:400 34px/1.3 C;color:#5f5d66">in ${NC} comuni e ${NR} regioni</p></div></div>
<div class="f">Cosa sapere<span>scorri ›</span></div></div>`;
const s2 = `<div class="p vino">${testa(2)}<p class="k">Che cos'è</p><h1 style="font-size:116px">Sciopero<br>generale</h1>
<p class="t">Nazionale, per i settori <b>pubblici e privati</b>.</p>
<p class="t">Lo hanno proclamato <b>USB</b> e <b>USI-CIT</b>. Nella scuola riguarda docenti e personale ATA.</p>
<p class="t">Nei servizi pubblici essenziali, come sanità e trasporti, valgono le <b>fasce di garanzia</b>. Per bus, metro e treni la situazione cambia da città a città: controlla l'avviso della tua azienda.</p>
<p class="fonte">Fonti: calendario scioperi del Ministero dei Trasporti · USB Scuola · L. 146/1990</p>
<div class="f">mappadellarivolta.org<span>scorri ›</span></div></div>`;
const r = (o, c, l) => `<div class="r"><div class="o">${o}</div><b>${c}</b><span>${l}</span></div>`;
const s3 = `<div class="p">${testa(3)}<p class="k">I ritrovi nelle grandi città</p><h1 style="font-size:104px">Dove e<br><em>a che ora</em></h1>
<div style="margin-top:22px">${r('10:00', 'Milano', 'Piazza Duca d\'Aosta')}${r('10:30', 'Roma', 'Piazza dei Cinquecento')}${r('9:30', 'Torino', 'Piazza Palazzo di Città')}${r('9:30', 'Bologna', 'Piazza Maggiore')}${r('10:00', 'Firenze', 'Piazza Bambini di Beslan')}${r('10:00', 'Pescara', 'Piazza Italia')}${r('9:00', 'Napoli', 'Piazza Garibaldi')}${r('9:30', 'Bari', 'Piazza Libertà')}${r('8:30', 'Palermo', 'Politeama')}${r('9:30', 'Cagliari', 'Piazza Garibaldi')}</div>
<p class="fonte">Lunedì le piazze del Nord, martedì Centro, Sud e isole.</p>
<div class="f">mappadellarivolta.org<span>scorri ›</span></div></div>`;
const s4 = `<div class="p">${testa(4)}<p class="k">Scuole e università</p><h1 style="font-size:112px">Anche gli<br><em>studenti</em></h1>
<p class="t">Sulla mappa ci sono <b>22 iniziative studentesche</b> per il 30, da Torino a Bari, da Genova a Padova.</p>
<p class="t">Spezzoni nei cortei, ritrovi davanti alle università e alle scuole, cortei studenteschi a Trento e Padova.</p>
<p class="t" style="font-size:34px;color:#4a4850">Torino · Grugliasco · Orbassano · Novara · Vercelli · Alessandria · Genova · Imperia · Milano · Sesto San Giovanni · Trento · Padova · Bassano del Grappa · Bologna · Bari</p>
<div class="f">mappadellarivolta.org<span>scorri ›</span></div></div>`;
const li = (n, b, t) => `<div class="li"><b class="n2">${n}</b><p><b>${b}</b>${t}</p></div>`;
const s5 = `<div class="p scuro">${testa(5)}<h1 style="font-size:120px;margin-top:40px">Prima<br><em>del 30</em></h1>
${li(1, 'Controlla i servizi', 'Treni, bus e scuole: guarda gli avvisi ufficiali della tua azienda di trasporto e della scuola.')}
${li(2, 'Cerca la tua città', 'Sulla mappa trovi luogo, ora e fonte di ogni iniziativa.')}
${li(3, 'Manca la tua piazza?', 'Aggiungila in 30 secondi con il link alla fonte, senza account.')}
<p class="fonte" style="margin-top:44px">La mappa riporta informazioni pubbliche con la loro fonte.</p>
<div class="f">mappadellarivolta.org<span>link in bio</span></div></div>`;
fs.mkdirSync('out/car25', { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
for (const [i, h] of [s1, s2, s3, s4, s5].entries()) {
  const pg = await b.newPage({ viewport: { width: 1080, height: 1350 } });
  await pg.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${h}</body></html>`); await pg.evaluate(() => document.fonts.ready);
  const over = await pg.evaluate(() => [...document.querySelectorAll('.p *')].some((e) => { if (e.closest('svg')) return false; const r = e.getBoundingClientRect(); return r.bottom > innerHeight + 1 || r.right > innerWidth + 1; }));
  console.log(i + 1, over ? 'FUORI' : 'ok'); await pg.screenshot({ path: `out/car25/mancano5-${i + 1}.png` }); await pg.close(); }
await b.close();
