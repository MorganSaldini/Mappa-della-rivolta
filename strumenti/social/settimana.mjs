import fs from 'node:fs'; import { createRequire } from 'node:module'; import { chromium } from 'playwright-core';
const require = createRequire(import.meta.url);
const font = (pkg, file) => `url(data:font/woff2;base64,${fs.readFileSync(require.resolve(`${pkg}/files/${file}`)).toString('base64')})`;
const C = { corteo: ['#c8322a', 'Corteo'], presidio: ['#d96c00', 'Presidio'] };
const E = [
 ['LUN', 19, '18:00', 'presidio', 'Salviamo i pini di Grignano', 'Trieste'],
 ['MER', 21, '10:30', 'presidio', 'Contro il caro-parcheggi', 'Torre del Greco'],
 ['VEN', 23, '15:00', 'corteo', 'Corteo studentesco', 'Verona'],
 ['SAB', 24, '8:30', 'corteo', 'Sciopero studentesco, piazza San Michele', 'Lucca'],
 ['SAB', 24, '13:00', 'corteo', 'No CPR, né qui né altrove', 'Castel Volturno'],
 ['SAB', 24, '14:00', 'corteo', 'Corteo nazionale per la pace', 'Roma'],
 ['SAB', 24, '15:00', 'corteo', 'Torino contro il riarmo', 'Torino'],
];
const righe = E.map(([g, n, h, t, ti, c]) => `<li><div class="d"><span>${g}</span><b>${n}</b></div><div class="x"><p class="t" style="--c:${C[t][0]}">${C[t][1]} · ${h}</p><p class="ti">${ti}</p><p class="c">${c}</p></div></li>`).join('');
const css = `@font-face{font-family:T;font-weight:800;src:${font('@fontsource/barlow-condensed','barlow-condensed-latin-800-normal.woff2')}}@font-face{font-family:T;font-weight:700;src:${font('@fontsource/barlow-condensed','barlow-condensed-latin-700-normal.woff2')}}
@font-face{font-family:C;font-weight:400;src:${font('@fontsource/source-sans-3','source-sans-3-latin-400-normal.woff2')}}@font-face{font-family:C;font-weight:600;src:${font('@fontsource/source-sans-3','source-sans-3-latin-600-normal.woff2')}}@font-face{font-family:C;font-weight:700;src:${font('@fontsource/source-sans-3','source-sans-3-latin-700-normal.woff2')}}
*{box-sizing:border-box;margin:0}body{width:1080px;height:1920px;overflow:hidden;background:#f6f3ee;color:#1c1b1f;font-family:C}
.pag{position:relative;height:1920px;padding:250px 80px 300px;display:flex;flex-direction:column}
.m{position:absolute;top:150px;left:80px;font:700 34px T;letter-spacing:.14em;text-transform:uppercase;display:flex;align-items:center;gap:16px}.m i{width:22px;height:22px;border-radius:50%;background:#c8322a}
h1{font:800 100px/.9 T;text-transform:uppercase}h1 em{font-style:normal;color:#c8322a}
.sub{font:600 32px C;color:#5f5d66;margin-top:10px}
ul{list-style:none;padding:0;margin-top:26px;display:flex;flex-direction:column;gap:12px}
li{display:flex;gap:26px;align-items:center;background:#fff;border:3px solid #1c1b1f;border-radius:20px;padding:9px 22px;box-shadow:8px 8px 0 #1c1b1f}
.d{min-width:84px;text-align:center;border-right:3px solid #ddd7cd;padding-right:22px}.d span{display:block;font:700 26px T;letter-spacing:.1em;color:#c8322a}.d b{display:block;font:800 58px/.9 T}
.t{display:flex;align-items:center;gap:10px;font:700 24px C;text-transform:uppercase;letter-spacing:.05em;color:#5f5d66}.t::before{content:"";width:18px;height:18px;border-radius:50%;background:var(--c)}
.ti{font:700 31px/1.1 C;margin-top:0}.c{font:400 26px C;color:#5f5d66}
.piu{margin-top:20px;font:600 31px/1.3 C}.piu b{color:#c8322a}`;
const html = `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body><div class="pag"><div class="m"><i></i>Mappa della Rivolta</div>
<h1>Questa settimana<br><em>in piazza</em></h1><p class="sub">19 – 25 ottobre · cortei e presidi con fonte</p><ul>${righe}</ul>
<p class="piu">…più <b>3</b> assemblee e <b>10</b> scioperi di categoria. Trova il tuo su <b>mappadellarivolta.org</b></p></div></body></html>`;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
await p.setContent(html); await p.evaluate(() => document.fonts.ready);
const h = await p.evaluate(() => document.querySelector('.piu').getBoundingClientRect().bottom);
await p.screenshot({ path: 'out/storia-settimana.png' }); await b.close(); console.log('fondo testo', h);
