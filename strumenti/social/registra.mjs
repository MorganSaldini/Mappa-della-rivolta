import fs from 'node:fs'; import { chromium } from 'playwright-core'; import { apri } from './cattura.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--lang=it-IT'] });
const p = await apri(b); const K = 1080 / 390;
await p.context().route('**/ci-saro', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, ci_saro: 7 }) }));
const log = []; let n = 0;
const shot = async (nome, tap = null) => { const f = `cap/${String(n++).padStart(2, '0')}-${nome}.jpg`; await p.screenshot({ path: f, type: 'jpeg', quality: 90 }); log.push({ f, nome, tap }); };
const pos = async (el) => { const r = await el.boundingBox(); return [(r.x + r.width / 2) * K, (r.y + r.height / 2) * K]; };
await shot('home');
const campo = await p.$('#campo-cerca'); await shot('tap-campo', await pos(campo)); await campo.tap(); await p.waitForTimeout(300);
for (const s of 'Bologna') { await p.type('#campo-cerca', s); await shot('scrivi'); }
const cerca = await p.$('#campo-cerca + button'); await shot('tap-cerca', await pos(cerca)); await cerca.tap(); await p.waitForTimeout(2500);
await shot('bologna');
let m = null; for (const el of await p.$$('.leaflet-marker-icon')) { const r = await el.boundingBox(); if (r && r.y > 150 && r.y < 760 && r.x > 20 && r.x < 370) { m = el; break; } }
if (m) { await shot('tap-marker', await pos(m)); await m.tap(); await p.waitForTimeout(1500); }
if (!(await p.$('.leaflet-popup'))) { await p.evaluate(() => { const x = document.createElement('button'); x.dataset.vai = '2026-11-20-bologna-sciopero_generale-01'; document.body.appendChild(x); x.click(); }); await p.waitForTimeout(2500); }
await shot('popup');
await p.evaluate(() => document.querySelector('[data-ci-saro]').scrollIntoView({ block: 'center' })); await p.waitForTimeout(500);
const cs = await p.$('[data-ci-saro]'); console.log('prima', await cs.textContent()); await shot('tap-cisaro', await pos(cs)); console.log('dopo shot', await cs.textContent()); await cs.tap(); await p.waitForTimeout(800);
await shot('cisaro-fatto');
await p.keyboard.press('Escape'); await p.waitForTimeout(400);
const ag = await p.$('button[data-apri-aggiungi]'); await shot('tap-aggiungi', await pos(ag)); await ag.tap(); await p.waitForTimeout(800);
await shot('aggiungi');
fs.writeFileSync('cap/log.json', JSON.stringify(log)); console.log(log.map((x) => x.nome).join(' '));
await b.close();
