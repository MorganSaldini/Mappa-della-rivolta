// Motore comune: pagina 1080x1920 con mappa Italia; window.render(t) disegna il fotogramma.
import fs from 'node:fs'; import { createRequire } from 'node:module'; import { execSync } from 'node:child_process';
import { feature } from 'topojson-client'; import { geoMercator, geoPath } from 'd3-geo'; import { chromium } from 'playwright-core';
const require = createRequire(import.meta.url);
export const COL = { corteo: '#c8322a', presidio: '#d96c00', sciopero_generale: '#8e1b5e', sciopero_categoria: '#2a5db0', assemblea: '#6b4fbb', picchetto: '#0f7a6b', altro: '#55525c' };
const topo = require('world-atlas/countries-50m.json');
const it = { type: 'FeatureCollection', features: feature(topo, topo.objects.countries).features.filter((f) => f.id === '380') };
export const W = 860, H = 1000;
const proj = geoMercator().fitSize([W, H], it);
export const pathItalia = geoPath(proj)(it);
export const xy = (lat, lng) => proj([lng, lat]).map((v) => +v.toFixed(1));
const font = (pkg, file) => `url(data:font/woff2;base64,${fs.readFileSync(require.resolve(`${pkg}/files/${file}`)).toString('base64')})`;
export const cssBase = `@font-face{font-family:T;font-weight:800;src:${font('@fontsource/barlow-condensed','barlow-condensed-latin-800-normal.woff2')}}@font-face{font-family:T;font-weight:700;src:${font('@fontsource/barlow-condensed','barlow-condensed-latin-700-normal.woff2')}}
@font-face{font-family:C;font-weight:400;src:${font('@fontsource/source-sans-3','source-sans-3-latin-400-normal.woff2')}}@font-face{font-family:C;font-weight:600;src:${font('@fontsource/source-sans-3','source-sans-3-latin-600-normal.woff2')}}@font-face{font-family:C;font-weight:700;src:${font('@fontsource/source-sans-3','source-sans-3-latin-700-normal.woff2')}}
*{box-sizing:border-box;margin:0}body{width:1080px;height:1920px;overflow:hidden;font-family:C;color:#1c1b1f;background:#f6f3ee}
.m{position:absolute;top:150px;left:80px;font:700 32px T;letter-spacing:.14em;text-transform:uppercase;display:flex;align-items:center;gap:14px;z-index:5}.m i{width:20px;height:20px;border-radius:50%;background:#c8322a}
.lay{position:absolute;inset:0;transition:none}`;
export async function rendi({ html, durata, fps = 30, uscita, cartella }) {
  fs.rmSync(cartella, { recursive: true, force: true }); fs.mkdirSync(cartella, { recursive: true });
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await p.setContent(html); await p.evaluate(() => document.fonts.ready);
  const n = Math.round(durata * fps);
  for (let i = 0; i < n; i++) {
    await p.evaluate((t) => window.render(t), i / fps);
    await p.screenshot({ path: `${cartella}/f${String(i).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 92 });
  }
  await b.close();
  execSync(`ffmpeg -v error -y -framerate ${fps} -i ${cartella}/f%04d.jpg -f lavfi -i anullsrc=r=44100:cl=stereo -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac -shortest -movflags +faststart ${uscita}`);
}
