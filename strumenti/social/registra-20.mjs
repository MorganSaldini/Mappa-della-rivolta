// Reel "Trova la tua piazza del 20" (12/11/2026): catture del sito da telefono.
// Filtri → "Un giorno preciso" 20/11 → cerca Bari → scheda → "Ci sarò".
// Dati: public/dati/eventi.json (copia della mappa, uguale a /api/mobilitazioni dell'11/11 sera).
import fs from 'node:fs'; import { chromium } from 'playwright-core'; import { apri } from './cattura2.mjs'; import { CHROME } from './motore.mjs';
const CITTA = { nome: 'Bari', lat: 41.1176, lon: 16.8718, id: '2026-11-20-bari-corteo-01' };
fs.rmSync('cap', { recursive: true, force: true }); fs.mkdirSync('cap');
const dati = JSON.parse(fs.readFileSync('/home/claude/mappa-della-rivolta/public/dati/eventi.json')).eventi;
const ciSaroVero = Number(dati.find((e) => e.id === CITTA.id)?.ci_saro || 0);
const b = await chromium.launch({ executablePath: CHROME, args: ['--lang=it-IT', '--accept-lang=it-IT'], env: { ...process.env, LANG: 'it_IT.UTF-8', LANGUAGE: 'it' } });
const p = await apri(b); const K = 1080 / 390; const ctx = p.context();
// "Ci sarò": il server non è raggiungibile da qui, quindi rispondiamo come farebbe lui (+1 sul numero vero).
await ctx.route('**/ci-saro', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, ci_saro: ciSaroVero + 1 }) }));
await ctx.route('**nominatim**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ lat: String(CITTA.lat), lon: String(CITTA.lon), display_name: 'Bari, Puglia, Italia', boundingbox: ['41.05', '41.17', '16.75', '16.98'], address: { city: 'Bari', county: 'Bari', state: 'Puglia' } }]) }));
// chiude la barra "Sostieni" per avere più spazio
await p.evaluate(() => { const x = [...document.querySelectorAll('button')].find((e) => /chiudi/i.test(e.getAttribute('aria-label') || '') || e.textContent.trim() === '×'); x?.click(); }); await p.waitForTimeout(300);
const log = []; let n = 0;
const shot = async (nome, tap = null) => { const f = `cap/${String(n++).padStart(2, '0')}-${nome}.jpg`; await p.screenshot({ path: f, type: 'jpeg', quality: 90 }); log.push({ f, nome, tap }); };
const pos = async (el) => { const r = await el.boundingBox(); return [(r.x + r.width / 2) * K, (r.y + r.height / 2) * K]; };
const vedi = async (sel, top = 90) => { await p.evaluate(([s, t]) => { const r = document.querySelector(s).getBoundingClientRect(); window.scrollBy(0, r.top - t); }, [sel, top]); await p.waitForTimeout(400); };
await shot('home');
// 1. filtri: un giorno preciso, 20 novembre
await vedi('#box-filtri', 120);
const sum = await p.$('#box-filtri summary'); await shot('tap-filtri', await pos(sum)); await sum.tap(); await p.waitForTimeout(500); await shot('filtri-aperti');
const per = await p.$('#filtro-periodo'); await shot('tap-quando', await pos(per));
await p.selectOption('#filtro-periodo', 'giorno'); await p.waitForTimeout(400); await shot('giorno-oggi');
const gi = await p.$('#filtro-giorno'); await shot('tap-giorno', await pos(gi));
await p.evaluate(() => { const g = document.querySelector('#filtro-giorno'); g.value = '2026-11-20'; g.dispatchEvent(new Event('change', { bubbles: true })); }); await p.waitForTimeout(1200);
await shot('giorno-20');
console.log('conta', await p.evaluate(() => document.querySelector('#filtro-conta')?.textContent), '| totale', await p.evaluate(() => document.querySelector('#totale')?.textContent));
await p.evaluate(() => window.__mappa.setView([41.9, 12.6], 5, { animate: false })); await vedi('#mappa', 40); await p.waitForTimeout(1500);
await shot('mappa-20');
// 2. cerca la città
await vedi('#form-cerca', 120);
const campo = await p.$('#campo-cerca'); await shot('tap-campo', await pos(campo)); await campo.tap(); await p.waitForTimeout(300);
for (const s of CITTA.nome) { await p.type('#campo-cerca', s); await shot('scrivi'); }
const cerca = await p.$('#campo-cerca + button'); await shot('tap-cerca', await pos(cerca)); await cerca.tap(); await p.waitForTimeout(2200);
await p.evaluate(([la, lo]) => window.__mappa.setView([la, lo], 12, { animate: false }), [CITTA.lat, CITTA.lon]); await vedi('#mappa', 40); await p.waitForTimeout(1800);
await shot('citta');
// 3. tocca la piazza
const mk = await p.evaluate(([la, lo]) => { const c = window.__mappa.latLngToContainerPoint([la, lo]); const r = document.querySelector('#mappa').getBoundingClientRect(); return [c.x + r.left, c.y + r.top]; }, [41.12759, 16.86456]);
let best = null, bd = 1e9; for (const el of await p.$$('.leaflet-marker-icon')) { const r = await el.boundingBox(); if (!r) continue; const d = Math.hypot(r.x + r.width / 2 - mk[0], r.y + r.height / 2 - mk[1]); if (d < bd) { bd = d; best = el; } }
await shot('tap-marker', await pos(best)); await best.tap().catch(() => {}); await p.waitForTimeout(1500);
if (!(await p.$('.leaflet-popup'))) { console.log('fallback popup'); await p.evaluate((id) => { const x = document.createElement('button'); x.dataset.vai = id; document.body.appendChild(x); x.click(); }, CITTA.id); await p.waitForTimeout(2500); }
await shot('popup');
await p.evaluate(() => document.querySelector('[data-ci-saro]').scrollIntoView({ block: 'center' })); await p.waitForTimeout(500);
const cs = await p.$('[data-ci-saro]'); console.log('ci-saro prima', (await cs.textContent()).trim(), ciSaroVero); await shot('tap-cisaro', await pos(cs)); await cs.tap(); await p.waitForTimeout(900);
await shot('cisaro-fatto');
fs.writeFileSync('cap/log.json', JSON.stringify(log)); console.log(log.map((x) => x.nome).join(' '));
await b.close();
