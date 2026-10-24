import fs from 'node:fs'; import { createRequire } from 'node:module'; import { chromium } from 'playwright-core';
const require = createRequire(import.meta.url);
const font = (pkg, file) => `url(data:font/woff2;base64,${fs.readFileSync(require.resolve(`${pkg}/files/${file}`)).toString('base64')})`;
const R = [['Puglia', 'Foggia · Candela · Bitonto', 'lun 19 e mar 20'], ['Basilicata', 'San Nicola di Melfi · Scanzano Jonico', 'lun 19'], ['Calabria', 'Tarsia scalo · Francica · Locri', 'lun 19 e mar 20']];
const righe = R.map(([r, c, d]) => `<li><p class="r">${r}<span>${d}</span></p><p class="c">${c}</p></li>`).join('');
const css = `@font-face{font-family:T;font-weight:800;src:${font('@fontsource/barlow-condensed','barlow-condensed-latin-800-normal.woff2')}}@font-face{font-family:T;font-weight:700;src:${font('@fontsource/barlow-condensed','barlow-condensed-latin-700-normal.woff2')}}
@font-face{font-family:C;font-weight:400;src:${font('@fontsource/source-sans-3','source-sans-3-latin-400-normal.woff2')}}@font-face{font-family:C;font-weight:600;src:${font('@fontsource/source-sans-3','source-sans-3-latin-600-normal.woff2')}}@font-face{font-family:C;font-weight:700;src:${font('@fontsource/source-sans-3','source-sans-3-latin-700-normal.woff2')}}
*{box-sizing:border-box;margin:0}body{width:1080px;height:1920px;overflow:hidden;background:#f6f3ee;color:#1c1b1f;font-family:C}
.pag{position:relative;height:1920px;padding:250px 80px 300px;display:flex;flex-direction:column}
.m{position:absolute;top:150px;left:80px;font:700 34px T;letter-spacing:.14em;text-transform:uppercase;display:flex;align-items:center;gap:16px}.m i{width:22px;height:22px;border-radius:50%;background:#c8322a}
.tag{align-self:flex-start;background:#d96c00;color:#fff;font:700 32px T;letter-spacing:.12em;text-transform:uppercase;padding:8px 22px;border-radius:10px}
h1{font:800 120px/.92 T;text-transform:uppercase;margin-top:22px}h1 em{font-style:normal;color:#d96c00}
.sub{font:400 38px/1.3 C;color:#2b2a30;margin-top:22px}
ul{list-style:none;padding:0;margin-top:40px;display:flex;flex-direction:column;gap:20px}
li{background:#fff;border:3px solid #1c1b1f;border-left:16px solid #d96c00;border-radius:18px;padding:20px 28px}
.r{display:flex;justify-content:space-between;align-items:baseline;font:800 52px T;text-transform:uppercase}.r span{font:600 30px C;text-transform:none;color:#5f5d66}
.c{font:600 36px/1.2 C;margin-top:4px}
.box{margin-top:34px;background:#1c1b1f;color:#fff;border-radius:18px;padding:26px 30px;font:400 34px/1.3 C}.box b{color:#ffb15c}
.fonti{margin-top:auto;font:400 26px/1.35 C;color:#5f5d66}`;
const html = `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body><div class="pag"><div class="m"><i></i>Mappa della Rivolta</div>
<p class="tag">Avviso viabilità</p><h1>Possibili disagi:<br><em>strade del Sud</em></h1>
<p class="sub">Proteste di autotrasportatori e agricoltori contro il caro carburante. Presidi stradali segnalati:</p>
<ul>${righe}</ul>
<p class="box"><b>Se devi spostarti:</b> possibili code, rallentamenti e distributori senza carburante. Controlla la viabilità prima di partire.</p>
<p class="fonti">Fonti: Il Post (15/10), InformaCalabria (16/10) e segnalazioni sulla mappa. Gli orari possono cambiare.</p></div></body></html>`;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
await p.setContent(html); await p.evaluate(() => document.fonts.ready);
console.log(await p.evaluate(() => [document.querySelector('.box').getBoundingClientRect().bottom, document.querySelector('.fonti').getBoundingClientRect().bottom]));
await p.screenshot({ path: 'out/storia-disagi-sud.png' }); await b.close();
