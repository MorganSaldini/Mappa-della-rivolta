// Genera le 3 schermate della storia Instagram (1080x1920) da dati/eventi.json
// Uso: node genera.mjs <file-eventi.json> <data-pubblicazione AAAA-MM-GG> <cartella-uscita>
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { feature } from 'topojson-client';
import { geoMercator, geoPath } from 'd3-geo';
import { chromium } from 'playwright-core';

const require = createRequire(import.meta.url);
const [fileEventi, dataPub, uscita] = process.argv.slice(2);
fs.mkdirSync(uscita, { recursive: true });

const TIPI = {
  corteo: ['#c8322a', 'Corteo'], presidio: ['#d96c00', 'Presidio'],
  sciopero_generale: ['#8e1b5e', 'Sciopero generale'], sciopero_categoria: ['#2a5db0', 'Sciopero di categoria'],
  picchetto: ['#0f7a6b', 'Picchetto'], assemblea: ['#6b4fbb', 'Assemblea'], altro: ['#55525c', 'Altra iniziativa'],
};
const MESI = ['GEN', 'FEB', 'MAR', 'APR', 'MAG', 'GIU', 'LUG', 'AGO', 'SET', 'OTT', 'NOV', 'DIC'];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Solo eventi verificati dal giorno di pubblicazione in poi
const eventi = JSON.parse(fs.readFileSync(fileEventi, 'utf8'))
  .filter((e) => e.stato === 'verificato' && e.fonte && e.data >= dataPub)
  .sort((a, b) => a.data.localeCompare(b.data));

// ---- Mappa dell'Italia con i punti ----
const topo = require('world-atlas/countries-50m.json');
const paesi = feature(topo, topo.objects.countries);
const italia = { type: 'FeatureCollection', features: paesi.features.filter((f) => f.id === '380') };
const W = 900, H = 1000;
const proj = geoMercator().fitSize([W, H], italia);
const disegna = geoPath(proj);

// Raggruppa gli eventi che cadono nello stesso punto (stessa città)
const gruppi = [];
for (const e of eventi) {
  let p = gruppi.find((g) => Math.hypot(g.lat - e.lat, g.lng - e.lng) < 0.45);
  if (!p) { p = { lat: e.lat, lng: e.lng, n: 0, tipi: {} }; gruppi.push(p); }
  p.n++; p.tipi[e.tipo] = (p.tipi[e.tipo] || 0) + 1;
}
const cerchi = gruppi.sort((a, b) => a.n - b.n).map((p) => {
  const [x, y] = proj([p.lng, p.lat]);
  const tipo = Object.entries(p.tipi).sort((a, b) => b[1] - a[1])[0][0];
  const r = 13 + Math.sqrt(p.n) * 9;
  return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(r + 16).toFixed(1)}" fill="${TIPI[tipo][0]}" opacity=".16"/>
    <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${TIPI[tipo][0]}" stroke="#f6f3ee" stroke-width="5"/>
    ${p.n > 1 ? `<text x="${x.toFixed(1)}" y="${(y + 10).toFixed(1)}" text-anchor="middle" class="num">${p.n}</text>` : ''}`;
}).join('');
const tipiUsati = [...new Set(eventi.map((e) => e.tipo))];
const legenda = tipiUsati.map((t) => `<span style="--c:${(TIPI[t] || TIPI.altro)[0]}">${(TIPI[t] || TIPI.altro)[1]}</span>`).join('');
const svgMappa = `<svg viewBox="-40 -20 ${W + 80} ${H + 40}" class="mappa">
  <path d="${disegna(italia)}" fill="#ffffff" stroke="#1c1b1f" stroke-width="3.5" stroke-linejoin="round"/>
  ${cerchi}
</svg>`;

// ---- Prossime date (le più importanti: nazionali, generali, cortei) ----
const naz = (e) => /nazional/i.test(e.titolo);
const peso = (e) => (e.tipo === 'sciopero_generale' ? (naz(e) ? 5 : 3) : e.tipo === 'corteo' ? (naz(e) ? 5 : 2) : naz(e) ? 2 : 0);
const visti = new Set();
const scelti = eventi
  .filter((e) => peso(e) > 0)
  .sort((a, b) => peso(b) - peso(a) || a.data.localeCompare(b.data))
  .filter((e) => { if (visti.has(e.data)) return false; visti.add(e.data); return true; })
  .slice(0, 4)
  .sort((a, b) => a.data.localeCompare(b.data));
const corto = (t, n) => (t.length <= n ? t : t.slice(0, t.lastIndexOf(' ', n)) + '…');
const dove = (e) => (e.tipo.startsWith('sciopero') && /nazional/i.test(e.titolo) ? 'In tutta Italia' : e.comune.charAt(0).toUpperCase() + e.comune.slice(1).toLowerCase());
const righe = scelti.map((e) => {
  const [, m, g] = e.data.split('-');
  const [col, nome] = TIPI[e.tipo] || TIPI.altro;
  const titolo = corto(e.titolo, 64);
  return `<li><div class="data"><b>${Number(g)}</b><span>${MESI[Number(m) - 1]}</span></div>
    <div><span class="tipo" style="--c:${col}">${esc(nome)}</span><p>${esc(titolo)}</p><small>${esc(dove(e))}</small></div></li>`;
}).join('');
const altri = eventi.length - scelti.length;

// ---- Pagine ----
const font = (pkg, file) => `url(data:font/woff2;base64,${fs.readFileSync(require.resolve(`${pkg}/files/${file}`)).toString('base64')})`;
const css = `
@font-face{font-family:T;font-weight:700;src:${font('@fontsource/barlow-condensed', 'barlow-condensed-latin-700-normal.woff2')}}
@font-face{font-family:T;font-weight:800;src:${font('@fontsource/barlow-condensed', 'barlow-condensed-latin-800-normal.woff2')}}
@font-face{font-family:C;font-weight:400;src:${font('@fontsource/source-sans-3', 'source-sans-3-latin-400-normal.woff2')}}
@font-face{font-family:C;font-weight:600;src:${font('@fontsource/source-sans-3', 'source-sans-3-latin-600-normal.woff2')}}
@font-face{font-family:C;font-weight:700;src:${font('@fontsource/source-sans-3', 'source-sans-3-latin-700-normal.woff2')}}
*{box-sizing:border-box;margin:0}
body{width:1080px;height:1920px;overflow:hidden;background:#f6f3ee;color:#1c1b1f;font-family:C}
.pag{position:relative;width:1080px;height:1920px;padding:250px 80px 340px;display:flex;flex-direction:column}
.marchio{position:absolute;top:150px;left:80px;font:700 34px T;letter-spacing:.14em;text-transform:uppercase;display:flex;align-items:center;gap:16px}
.marchio i{width:22px;height:22px;border-radius:50%;background:#c8322a;display:block}
h1{font:800 124px/0.92 T;text-transform:uppercase;letter-spacing:-.01em}
h1 em{font-style:normal;color:#c8322a}
.sotto{font:400 46px/1.25 C;margin-top:28px;color:#2b2a30}
.mappa{width:100%;flex:1;min-height:0;margin-top:10px}
.num{font:800 34px T;fill:#fff}
.piede{margin-top:6px}
.conta{font:700 50px C}.conta b{font:800 76px T;color:#c8322a;margin-right:8px}
.legenda{display:flex;flex-wrap:wrap;gap:12px 30px;margin-top:10px;font:400 32px C;color:#5f5d66}
.legenda span{display:inline-flex;align-items:center;gap:10px}.legenda span::before{content:"";width:24px;height:24px;border-radius:50%;background:var(--c)}
.num{position:absolute;top:150px;right:80px;font:700 32px T;letter-spacing:.1em;color:#8d8a93}
.tap{position:static;text-align:right;margin-top:26px;font:600 34px C;color:#5f5d66}
.lista{list-style:none;padding:0;margin-top:26px;display:flex;flex-direction:column;gap:18px}
.lista li{display:flex;gap:34px;align-items:flex-start;background:#fff;border:3px solid #1c1b1f;border-radius:22px;padding:16px 28px;box-shadow:10px 10px 0 #1c1b1f}
.data{min-width:120px;text-align:center;border-right:3px solid #ddd7cd;padding-right:28px}
.data b{display:block;font:800 92px/0.9 T}
.data span{font:700 36px T;letter-spacing:.1em;color:#c8322a}
.tipo{display:inline-flex;align-items:center;gap:12px;font:700 28px C;text-transform:uppercase;letter-spacing:.06em;color:#5f5d66}
.tipo::before{content:"";width:22px;height:22px;border-radius:50%;background:var(--c)}
.lista p{font:600 38px/1.18 C;margin-top:6px}
.lista small{font:400 32px C;color:#5f5d66}
.piu{margin-top:24px;font:600 40px/1.3 C}
.piu b{color:#c8322a}
.nota{margin-top:auto;font:400 32px/1.35 C;color:#5f5d66}
.scuro{background:#1c1b1f;color:#fff}
.scuro .marchio{color:#fff}
.scuro h1{color:#fff}
.passi{list-style:none;padding:0;margin-top:56px;display:flex;flex-direction:column;gap:38px;counter-reset:p}
.passi li{counter-increment:p;display:flex;gap:30px;align-items:flex-start;font:400 42px/1.25 C;color:#e8e4dd}
.passi li::before{content:counter(p);flex:none;width:76px;height:76px;border-radius:50%;background:#c8322a;color:#fff;font:800 50px/76px T;text-align:center}
.passi b{display:block;color:#fff;font-weight:700;font-size:46px}
.sticker{margin-top:auto;border:4px dashed #6d6a73;border-radius:28px;height:170px;display:flex;align-items:center;justify-content:center;font:600 32px C;color:#8d8a93}
.url{margin-top:30px;text-align:center;font:800 84px T;letter-spacing:.01em}
.dona{margin-top:18px;text-align:center;font:400 34px C;color:#c9c5bf}
.dona b{color:#f0c8c4}
`;
const pagina = (classe, corpo) => `<!doctype html><html lang="it"><head><meta charset="utf-8"><style>${css}</style></head>
<body><div class="pag ${classe}"><div class="marchio"><i></i>Mappa della Rivolta</div><div class="num">${classe.split(' ')[1]||''}</div>${corpo}</div></body></html>`;

const pagine = {
  '1-mappa': pagina(' 1/3', `
    <h1>Dove si protesta<br>in Italia? <em>Guarda<br>la mappa.</em></h1>
    ${svgMappa}
    <div class="piede"><p class="conta"><b>${eventi.length}</b> mobilitazioni in programma</p><div class="legenda">${legenda}</div></div>
    <div class="tap">Tocca per continuare ›</div>`),
  '2-date': pagina(' 2/3', `
    <h1>Le prossime<br><em>date</em></h1>
    <ul class="lista">${righe}</ul>
    <p class="piu">…e altre <b>${altri}</b> mobilitazioni già sulla mappa.</p>
    <p class="nota" style="margin-top:20px">Ogni evento ha una fonte: sindacati, comunicati, calendari ufficiali degli scioperi.</p><div class="tap">Manca la tua città? ›</div>`),
  '3-partecipa': pagina('scuro 3/3', `
    <h1>La mappa<br>la fai <em>tu</em></h1>
    <ul class="passi">
      <li><span><b>Aggiungi la tua mobilitazione</b>Senza account, in un minuto.</span></li>
      <li><span><b>Conferma o correggi</b>Volontari controllano ogni segnalazione.</span></li>
      <li><span><b>Seguici su Telegram</b>Le novità verificate, ogni giorno.</span></li>
    </ul>
    <div class="sticker">metti qui lo sticker “Link”</div>
    <div class="url">mappadellarivolta.org</div>
    <div class="dona">♥ Ti è utile? <b>Sostienila</b> · paypal.me/MappaDellaRivolta</div>`),
};

// ---- Post di aggiornamento per il feed (1080x1350) ----
const [, mp, gp] = dataPub.split('-');
const MESI_L = ['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];
const perTipo = Object.entries(eventi.reduce((a, e) => ((a[e.tipo] = (a[e.tipo] || 0) + 1), a), {})).sort((a, b) => b[1] - a[1]);
const maxT = perTipo[0][1];
const barre = perTipo.map(([t, n]) => { const [c, nome] = TIPI[t] || TIPI.altro;
  return `<li><div class="bt"><span>${esc(nome)}</span><b>${n}</b></div><div class="bb"><i style="width:${(n / maxT * 100).toFixed(0)}%;background:${c}"></i></div></li>`; }).join('');
const nCitta = new Set(eventi.map((e) => e.comune.toLowerCase())).size;
const chip = scelti.map((e) => { const [, m, g] = e.data.split('-'); return `<span><b>${Number(g)} ${MESI[Number(m) - 1].toLowerCase()}</b> ${esc((TIPI[e.tipo] || TIPI.altro)[1].toLowerCase())}</span>`; }).join('');
const cssPost = css.replace('body{width:1080px;height:1920px', 'body{width:1080px;height:1350px') + `
.post{position:relative;width:1080px;height:1350px;padding:70px 70px 60px;display:flex;flex-direction:column}
.post .marchio{position:static}
.post h1{font-size:100px;margin-top:22px}
.agg{font:600 36px C;color:#5f5d66;margin-top:14px}
.corpo{display:grid;grid-template-columns:430px 1fr;gap:40px;margin-top:30px;flex:1;min-height:0}
.corpo .mappa{margin:0;height:100%;width:100%}
.big{font:800 130px/0.85 T;color:#c8322a}.big small{display:block;font:700 36px C;color:#1c1b1f;margin-top:10px}
.barre{list-style:none;padding:0;margin-top:22px;display:flex;flex-direction:column;gap:12px}
.bt{display:flex;justify-content:space-between;font:600 29px C}.bt b{font:800 34px T}
.bb{height:14px;background:#e6e0d6;border-radius:8px;margin-top:4px;overflow:hidden}.bb i{display:block;height:100%;border-radius:8px}
.date{display:flex;flex-wrap:wrap;gap:12px;margin-top:26px}
.date span{font:400 30px C;border:3px solid #1c1b1f;border-radius:40px;padding:8px 20px;background:#fff}
.date b{font-weight:700}
.fondo{display:flex;justify-content:space-between;align-items:center;margin-top:26px;border-top:3px solid #1c1b1f;padding-top:22px;font:800 52px T}
.fondo span{font:400 28px C;color:#5f5d66}`;
const htmlPost = `<!doctype html><html lang="it"><head><meta charset="utf-8"><style>${cssPost}</style></head><body><div class="post">
  <div class="marchio"><i></i>Mappa della Rivolta</div>
  <h1>Aggiornamento <em>mappa</em></h1>
  <p class="agg">Dati al ${Number(gp)} ${MESI_L[Number(mp) - 1]} · solo eventi con fonte verificata</p>
  <div class="corpo">${svgMappa}
    <div><p class="big">${eventi.length}<small>mobilitazioni in programma in ${nCitta} città</small></p><ul class="barre">${barre}</ul></div>
  </div>
  <p class="agg" style="margin-top:22px;color:#1c1b1f;font-weight:700">Le date nazionali in arrivo</p>
  <div class="date" style="margin-top:12px">${chip}</div>
  <div class="fondo">mappadellarivolta.org<span>link in bio</span></div>
</div></body></html>`;

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const pg = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
for (const [nome, html] of Object.entries(pagine)) {
  fs.writeFileSync(path.join(uscita, nome + '.html'), html);
  await pg.setContent(html);
  await pg.evaluate(() => document.fonts.ready);
  await pg.screenshot({ path: path.join(uscita, `storia-${nome}.png`) });
}
await pg.setViewportSize({ width: 1080, height: 1350 });
await pg.setContent(htmlPost);
await pg.evaluate(() => document.fonts.ready);
await pg.screenshot({ path: path.join(uscita, 'post-aggiornamento.png') });
await browser.close();
console.log(`eventi dal ${dataPub}: ${eventi.length}; date in evidenza: ${scelti.length}; altri: ${altri}`);
