import fs from 'node:fs'; import { createRequire } from 'node:module'; import { chromium } from 'playwright-core';
import { feature } from 'topojson-client'; import { geoMercator, geoPath } from 'd3-geo';
const require = createRequire(import.meta.url);
const topo = require('world-atlas/countries-50m.json'); const land = feature(topo, topo.objects.countries);
export function tileSvg(z, x, y) {
  const n = 2 ** z, k = 256 * n / (2 * Math.PI);
  const proj = geoMercator().scale(k).translate([256 * n / 2 - x * 256, 256 * n / 2 - y * 256]);
  const path = geoPath(proj);
  const d = land.features.map((f) => path(f) || '').join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#dfe7ea"/><path d="${d}" fill="#f4f1ea" stroke="#c9c2b4" stroke-width="0.8"/></svg>`;
}
export async function apri(b, { w = 390, h = 844 } = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1080 / w, isMobile: true, hasTouch: true, locale: 'it-IT' });
  await ctx.route('**/*', (r) => { const u = new URL(r.request().url());
    if (u.hostname.endsWith('tile.openstreetmap.org')) { const [z, x, y] = u.pathname.replace('.png', '').split('/').filter(Boolean).map(Number); return r.fulfill({ status: 200, contentType: 'image/svg+xml', body: tileSvg(z, x, y) }); }
    if (u.pathname.endsWith('/api/mobilitazioni') && r.request().method() === 'GET') { const d = JSON.parse(fs.readFileSync('/home/claude/mappa-della-rivolta/public/dati/eventi.json')); delete d.copia_del; return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(d) }); }
    if (u.hostname.startsWith('nominatim')) return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ lat: '44.4938', lon: '11.3387', display_name: 'Bologna, Emilia-Romagna, Italia', boundingbox: ['44.42', '44.56', '11.23', '11.43'], address: { city: 'Bologna', county: 'Bologna', state: 'Emilia-Romagna' } }]) });
    if (u.hostname === 'localhost') return r.continue();
    return r.abort(); });
  const p = await ctx.newPage(); await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(2500); return p;
}
if (process.argv[2] === 'prova') { const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }); const p = await apri(b); await p.screenshot({ path: 'out/sito-1.png' }); await p.screenshot({ path: 'out/sito-full.png', fullPage: true }); console.log(await p.evaluate(() => document.body.scrollHeight)); await b.close(); }
