// Carosello "Una settimana di mappa" (domenica 15/11/2026). Uso: node settimana15.mjs [dati.json]
// Confronta i dati letti da /api/mobilitazioni con la copia di riserva dell'8/11 (git 1a476fa).
import fs from 'node:fs'; import { execSync } from 'node:child_process'; import { chromium } from 'playwright-core'; import { cssBase, pathItalia, xy, W, H, CHROME } from './motore.mjs';
const now = JSON.parse(fs.readFileSync(process.argv[2] || 'dati-2026-11-14.json')).eventi;
const old = JSON.parse(execSync('git show 1a476fa:public/dati/eventi.json', { maxBuffer: 1e8 })).eventi;
const ESCL = ['2026-11-20-torino-altro-01', '2026-11-20-roma-sciopero_categoria-01'];
const nome = (s) => s.trim().toLowerCase().replace(/(^|[\s'])\S/g, (m) => m.toUpperCase()).replace("L'aquila", "L'Aquila");
// distacco politico: Avellino 20/11 ha tra i promotori un'organizzazione giovanile di partito
const ok = (e) => e.stato === 'verificato' && e.fonte && e.tipo !== 'altro' && !ESCL.includes(e.id) && nome(e.comune) !== 'Avellino';
const OGGI = '2026-11-15';
const ver = now.filter(ok), fut = ver.filter((e) => e.data >= OGGI);
const oldId = new Set(old.map((e) => e.id)), oldCom = new Set(old.map((e) => nome(e.comune)));
const nuove = ver.filter((e) => !oldId.has(e.id));
const NUOVE_CITTA = [...new Set(nuove.map((e) => nome(e.comune)).filter((c) => !oldCom.has(c)))].sort();
const c20 = new Set(ver.filter((e) => e.data === '2026-11-20').map((e) => nome(e.comune))).size;
const conf = now.reduce((a, e) => a + (e.conferme || 0), 0), cisaro = now.reduce((a, e) => a + (e.ci_saro || 0), 0);
const daVer = now.filter((e) => e.stato === 'da_verificare').length;
const pos = {}; for (const e of fut) pos[nome(e.comune)] ||= [e.lat, e.lng];
for (const e of nuove) pos[nome(e.comune)] ||= [e.lat, e.lng];
const NC = new Set(fut.map((e) => nome(e.comune))).size;
console.log({ nuove: nuove.length, NUOVE_CITTA, c20, fut: fut.length, NC, conf, cisaro, daVer });
const dots = (cities, r1, r2, col, op = .25) => cities.map((c) => { const [x, y] = xy(...pos[c]); return `<circle cx="${x}" cy="${y}" r="${r1}" fill="${col}" opacity="${op}"/><circle cx="${x}" cy="${y}" r="${r2}" fill="${col}" stroke="#fff" stroke-width="2.5"/>`; }).join('');
const altre = Object.keys(pos).filter((c) => !NUOVE_CITTA.includes(c));
const css = cssBase.replace('height:1920px', 'height:1350px') + `.m{top:70px}.k{font:700 34px T;letter-spacing:.12em;text-transform:uppercase;color:#c8322a}`;
const crescita = [['Mer 4', 17], ['Lun 9', 36], ['Mer 11', 50], ['Oggi', c20]];
const NORD = ['Lombardia', 'Piemonte', 'Veneto', 'Emilia-Romagna', 'Liguria', 'Trentino-Alto Adige', 'Friuli-Venezia Giulia', "Valle d'Aosta"];
const regOf = (c) => (ver.find((e) => nome(e.comune) === c) || {}).regione;
const G = { Nord: [], Centro: [], 'Sud e isole': [] };
for (const c of NUOVE_CITTA) { const r = regOf(c); G[NORD.includes(r) ? 'Nord' : ['Toscana', 'Umbria', 'Marche', 'Lazio'].includes(r) ? 'Centro' : 'Sud e isole'].push(c); }
const S = [
`<div style="position:absolute;inset:0;background:#1c1b1f;color:#fff"></div>
<svg viewBox="0 0 ${W} ${H}" style="position:absolute;right:-60px;top:120px;width:640px;height:744px;overflow:visible"><path d="${pathItalia}" fill="#2c2a30" stroke="#6d6a72" stroke-width="3"/>${dots(altre, 12, 6, '#8d8992', .2)}${dots(NUOVE_CITTA, 26, 10, '#ff4b3e')}</svg>
<div style="position:absolute;left:80px;right:80px;bottom:110px;color:#fff"><p class="k" style="color:#ff8f86">Una settimana di mappa · 8–15 novembre</p><p style="font:800 300px/.8 T;color:#ff4b3e;margin:20px 0 0 -10px">+${NUOVE_CITTA.length}</p><p style="font:800 96px/.92 T;text-transform:uppercase;margin-top:22px">città nuove<br>sulla mappa.</p><p style="font:600 42px/1.3 C;margin-top:24px;color:#e8e4dd">In rosso quelle arrivate questa settimana. Grazie a chi le ha segnalate.</p></div>`,
`<div style="position:absolute;inset:0;background:#f6f3ee;padding:170px 80px 0"><p class="k">In sette giorni</p><p style="font:800 104px/.9 T;text-transform:uppercase;margin-top:16px">${nuove.length} iniziative<br>in più, tutte<br>con la fonte.</p>
<div style="display:flex;gap:28px;margin-top:70px">${[[NUOVE_CITTA.length, 'città nuove'], [fut.length, 'iniziative in programma'], [NC, 'città in tutto']].map(([n, t]) => `<div style="flex:1;background:#fff;border-radius:24px;padding:34px 30px"><p style="font:800 110px/.9 T;color:#c8322a">${n}</p><p style="font:700 36px/1.15 T;text-transform:uppercase;margin-top:12px">${t}</p></div>`).join('')}</div>
<p style="font:600 38px/1.35 C;margin-top:56px">Cortei, presidi, scioperi e assemblee: ognuno ha il link al comunicato o alla locandina da cui arriva.</p>
<p style="position:absolute;left:80px;right:80px;bottom:70px;font:600 28px C;color:#555">Solo iniziative verificate. Conteggi sui dati della mappa, da domenica 8 a oggi.</p></div>`,
`<div style="position:absolute;inset:0;background:#f6f3ee;padding:170px 80px 0"><p class="k">Venerdì 20 · sciopero generale</p><p style="font:800 100px/.9 T;text-transform:uppercase;margin-top:16px">Da 17 a ${c20}<br>città.</p>
<div style="position:absolute;left:80px;right:80px;bottom:150px;height:640px;display:flex;align-items:flex-end;gap:36px">${crescita.map(([g, n], i) => `<div style="flex:1;text-align:center"><p style="font:800 ${i === 3 ? 96 : 66}px T;color:${i === 3 ? '#c8322a' : '#1c1b1f'}">${n}</p><div style="height:${Math.round(n / c20 * 440)}px;background:${i === 3 ? '#c8322a' : '#1c1b1f'};border-radius:14px 14px 0 0;opacity:${i === 3 ? 1 : .25 + i * .2}"></div><p style="font:700 36px T;text-transform:uppercase;margin-top:14px">${g}</p></div>`).join('')}</div>
<p style="position:absolute;left:80px;right:80px;bottom:70px;font:600 30px C;color:#555">Città con almeno una piazza verificata per il 20 novembre.</p></div>`,
`<div style="position:absolute;inset:0;background:#1c1b1f;color:#fff;padding:160px 70px 0"><p class="k" style="color:#ff8f86">Le ${NUOVE_CITTA.length} città nuove</p><p style="font:800 92px/.9 T;text-transform:uppercase;margin-top:14px">Benvenute.</p>
<div style="position:relative;width:900px">${Object.entries(G).filter(([, cs]) => cs.length).map(([z, cs]) => `<p style="font:700 30px T;letter-spacing:.1em;text-transform:uppercase;color:#ff8f86;margin-top:56px">${z} · ${cs.length}</p><p style="font:700 58px/1.25 C;margin-top:8px">${cs.map((x, j) => '<span style="white-space:nowrap">' + x + (j < cs.length - 1 ? '<span style="color:#c8322a"> ·</span>' : '') + '</span>').join(' ')}</p>`).join('')}</div>
<p style="position:absolute;left:70px;right:70px;bottom:80px;font:600 34px/1.35 C;color:#c9c5bf">La tua città non c'è ancora? La prossima può essere lei.</p></div>`,
`<div style="position:absolute;inset:0;background:#f6f3ee;padding:170px 80px 0"><p class="k">Chi fa la mappa</p><p style="font:800 104px/.9 T;text-transform:uppercase;margin-top:16px">Grazie a voi.</p>
${[['Chi segnala', 'manda la piazza con il link alla fonte. Senza account.'], ['Chi conferma', `con «👍 Confermo» sulle schede: ${conf} conferme sugli eventi di adesso.`], ['Chi controlla', `i moderatori volontari. Ci sono ancora ${daVer} segnalazioni che aspettano una fonte.`]].map(([a, b]) => `<div style="margin-top:44px;border-top:3px solid #1c1b1f;padding-top:22px"><p style="font:800 58px T;text-transform:uppercase;color:#c8322a">${a}</p><p style="font:600 40px/1.32 C;margin-top:6px">${b}</p></div>`).join('')}</div>`,
`<div style="position:absolute;inset:0;background:#c8322a;color:#fff;padding:200px 80px 0"><p class="k" style="color:#ffd5d1">Mancano 5 giorni al 20</p><p style="font:800 140px/.88 T;text-transform:uppercase;margin-top:16px">Manca la<br>tua piazza?<br>Aggiungila.</p>
<p style="font:600 42px/1.35 C;margin-top:30px">Basta il link al comunicato o alla locandina. mappadellarivolta.org</p>
<div style="display:inline-flex;align-items:center;gap:22px;margin-top:40px;background:#fff;color:#1c1b1f;padding:20px 34px;border-radius:60px;font:800 50px T"><span style="background:#c8322a;color:#fff;border-radius:40px;padding:4px 22px;font-size:38px">+ Segui</span>@mappadellarivolta</div>
<p style="position:absolute;left:80px;right:80px;bottom:52px;font:600 23px/1.4 C;color:#ffe1de">Fonti: schede della mappa e copia di riserva dell'8 novembre. La mappa riporta informazioni pubbliche con la loro fonte.</p></div>`];
fs.mkdirSync('out', { recursive: true });
const b = await chromium.launch({ executablePath: CHROME, args: ['--lang=it-IT'] });
const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
for (let i = 0; i < S.length; i++) { const dk = i === 0 || i === 3 || i === 5; await p.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${S[i]}<div class="m" style="color:${dk ? '#fff' : '#1c1b1f'}"><i style="${i === 5 ? 'background:#fff' : ''}"></i>Mappa della Rivolta</div></body></html>`); await p.evaluate(() => document.fonts.ready);
  const f = await p.evaluate(() => Math.max(...[...document.querySelectorAll('p')].map((e) => e.getBoundingClientRect().bottom))); if (f > 1340) console.log('FUORI', i + 1, f);
  await p.screenshot({ path: `out/s15-0${i + 1}.png` }); }
await b.close();
