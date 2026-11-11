// Carosello 12/11/2026 12:15 — "20 novembre: le piazze principali" (1080x1350, 7 slide).
// Dati: public/dati/eventi.json (uguale a /api/mobilitazioni dell'11/11 sera). Solo eventi verificati con fonte.
import fs from 'node:fs'; import { chromium } from 'playwright-core'; import { cssBase, pathItalia, xy, W, H, CHROME } from './motore.mjs';
const d = JSON.parse(fs.readFileSync('/home/claude/mappa-della-rivolta/public/dati/eventi.json')).eventi;
const ok = (e) => e && e.stato === 'verificato' && e.fonte && e.data === '2026-11-20';
const byId = Object.fromEntries(d.map((e) => [e.id, e]));
const nome = (s) => s.trim().toLowerCase().replace(/(^|[\s'])\S/g, (m) => m.toUpperCase()).replace("L'aquila", "L'Aquila").replace('Milao', 'Milano');
const SIGLE = (o) => [...new Set((o || []).map((x) => x.replace(/^Cgil/i, 'CGIL').replace(/^Unione degli Studenti( .*)?$/i, 'UDS').replace(/^Unione degli Universitari.*/i, 'UDU').replace(/^Rete degli Studenti Medi.*/i, 'Rete degli Studenti Medi').replace(/^Link Coordinamento Universitario$/i, 'LINK').replace(/^CGIL .*/, 'CGIL')))].join(', ');
// Testo del luogo: solo maiuscole/abbreviazioni sistemate, il luogo è quello della scheda
const LUOGO = { 'viale allegri': 'Viale Allegri', 'Mestre FS': 'Stazione di Mestre', 'Piazzale della libertà': 'Piazzale della Libertà', 'Piazza Cavour agrigento': 'Piazza Cavour', 'Stazione Porta nuova': 'Stazione Porta Nuova', 'Camera del Lavoro, Via XXIV Maggio': 'Camera del Lavoro, Via XXIV Maggio', 'Arco di Augusto': "Arco d'Augusto" };
const riga = (id) => { const e = byId[id]; if (!ok(e)) throw new Error('non verificato: ' + id); return { ora: e.ora_inizio ? e.ora_inizio.replace(':', '.') : null, citta: nome(e.comune), luogo: LUOGO[e.luogo] || e.luogo, sigle: SIGLE(e.organizzatori) }; };
const NORD = ['milao-sciopero_generale-01', 'torino-sciopero_generale-01', 'venezia-sciopero_generale-01', 'brescia-sciopero_generale-01', 'monza-corteo-01', 'pavia-corteo-01', 'trento-corteo-01', 'bolzano-sciopero_generale-01'].map((x) => riga('2026-11-20-' + x));
const EMR = ['bologna-corteo-01', 'modena-corteo-01', 'reggio-emilia-sciopero_generale-01', 'parma-corteo-01', 'ferrara-corteo-02', 'piacenza-corteo-01', 'ravenna-corteo-01', 'rimini-corteo-01'].map((x) => riga('2026-11-20-' + x));
const SUD = ['bari-corteo-01', 'pescara-corteo-02', 'salerno-corteo-02', 'agrigento-corteo-01', 'ragusa-corteo-01', 'ascoli-piceno-corteo-01', 'pesaro-corteo-01'].map((x) => riga('2026-11-20-' + x));
// Youth Strike: schede con "Youth Strike" nel titolo o tra i promotori
const YS = [...new Set(d.filter((e) => ok(e) && (/youth strike/i.test(e.titolo) || (e.organizzatori || []).some((o) => /youth strike/i.test(o)))).map((e) => nome(e.comune)))].sort((a, b) => a.localeCompare(b, 'it'));
// Città sulla mappa senza luogo o senza orario (per la slide "in arrivo")
const ATTESA = ['Roma', 'Napoli', 'Firenze', 'Palermo'];
for (const c of ATTESA) if (d.some((e) => ok(e) && nome(e.comune) === c && e.luogo && e.ora_inizio && !e.posizione_approssimativa)) console.log('ATTENZIONE: ora c\'è il luogo per', c);
const ESCL = ['2026-11-20-torino-altro-01', '2026-11-20-roma-sciopero_categoria-01'];
const FIX = { pisa: [43.716, 10.401], ferrara: [44.836, 11.62], lucca: [43.843, 10.505], pescara: [42.464, 14.214], salerno: [40.682, 14.768], siena: [43.318, 11.331] };
const C = {}; for (const e of d) if (ok(e) && !ESCL.includes(e.id)) { const n = nome(e.comune); C[n] = FIX[n.toLowerCase()] || C[n] || [e.lat, e.lng]; }
const N = Object.keys(C).length; console.log('città', N, '| youth strike', YS.length, YS.join(', '));
const dots = (col) => Object.values(C).map(([la, ln]) => { const [x, y] = xy(la, ln); return `<circle cx="${x}" cy="${y}" r="17" fill="${col}" opacity=".25"/><circle cx="${x}" cy="${y}" r="8" fill="${col}" stroke="#fff" stroke-width="2.5"/>`; }).join('');
const css = cssBase.replace('height:1920px', 'height:1350px') + `.m{top:70px}.k{font:700 34px T;letter-spacing:.12em;text-transform:uppercase;color:#c8322a}
.r{display:grid;grid-template-columns:150px 1fr;column-gap:22px;padding:11px 0;border-top:2px solid rgba(28,27,31,.13)}.r:first-child{border-top:0}
.r .o{font:800 54px/1 T;color:#c8322a}.r .c{font:800 43px/1 T;text-transform:uppercase}.r .l{font:600 29px/1.15 C;margin-top:4px}.r .s{font:600 22px/1.15 C;color:#6a6670;margin-top:2px}
.dk .r{border-color:rgba(255,255,255,.16)}.dk .r .o{color:#ff6b5f}.dk .r .s{color:#b9b4bf}`;
const lista = (R) => `<div style="margin-top:28px">${R.map((r) => `<div class="r"><p class="o">${r.ora ?? '<span style="font-size:30px">ora da<br>confermare</span>'}</p><div><p class="c">${r.citta}</p><p class="l">${r.luogo}</p>${r.sigle ? `<p class="s">${r.sigle}</p>` : ''}</div></div>`).join('')}</div>`;
const S = [
`<div style="position:absolute;inset:0;background:#1c1b1f;color:#fff">
<svg viewBox="0 0 ${W} ${H}" style="position:absolute;right:10px;top:110px;width:590px;height:686px;overflow:visible"><path d="${pathItalia}" fill="#2c2a30" stroke="#6d6a72" stroke-width="3"/>${dots('#ff4b3e')}</svg>
<div style="position:absolute;left:80px;right:80px;bottom:100px"><p class="k" style="color:#ff8f86">Venerdì 20 novembre · sciopero generale</p><p style="font:800 150px/.86 T;text-transform:uppercase;margin-top:18px">Dove<br>e a che ora.</p><p style="font:600 42px/1.3 C;margin-top:26px">Le piazze delle città principali, con luogo e orario di ritrovo. Scorri.</p></div></div>`,
`<div style="position:absolute;inset:0;background:#f6f3ee;padding:150px 80px 0"><p class="k">Nord</p>${lista(NORD)}</div>`,
`<div class="dk" style="position:absolute;inset:0;background:#1c1b1f;color:#fff;padding:150px 80px 0"><p class="k" style="color:#ff8f86">Emilia-Romagna · cortei CGIL</p>${lista(EMR)}</div>`,
`<div style="position:absolute;inset:0;background:#f6f3ee;padding:150px 80px 0"><p class="k">Centro, Sud e isole</p>${lista(SUD)}</div>`,
`<div style="position:absolute;inset:0;background:#2a5db0;color:#fff;padding:170px 80px 0"><p class="k" style="color:#cfe0ff">Lo stesso giorno</p><p style="font:800 118px/.88 T;text-transform:uppercase;margin-top:16px">Youth Strike</p>
<p style="font:600 40px/1.35 C;margin-top:24px">Sciopero studentesco con cortei dalle 9 di mattina in <b>${YS.length} città</b>. Promuovono Rete della Conoscenza, LINK e Unione degli Studenti.</p>
<p style="font:700 42px/1.45 C;margin-top:34px">${YS.map((x, j) => '<span style="white-space:nowrap">' + x + (j < YS.length - 1 ? '<span style="color:#9fc0ff"> ·</span>' : '') + '</span>').join(' ')}</p>
<p style="font:600 30px/1.35 C;margin-top:30px;color:#dbe7ff">In molte città il punto di ritrovo non è ancora uscito: lo trovi sulla scheda appena c'è.</p></div>`,
`<div style="position:absolute;inset:0;background:#f6f3ee;padding:170px 80px 0"><p class="k">Ancora senza piazza</p><p style="font:800 100px/.9 T;text-transform:uppercase;margin-top:16px">Roma, Napoli,<br>Firenze, Palermo.</p>
<p style="font:600 40px/1.38 C;margin-top:28px">Lo sciopero c'è, ma sulla mappa manca ancora il luogo di ritrovo. Se hai il comunicato o la locandina, mandacelo dal sito: lo controlliamo e lo aggiungiamo.</p>
<div style="margin-top:56px;background:#fff;border-radius:22px;padding:30px 34px;border-left:10px solid #e0a020"><p style="font:800 44px T;text-transform:uppercase">Possibili disagi nei trasporti</p><p style="font:600 34px/1.38 C;margin-top:10px">Il 20 scioperano anche treni e trasporto locale, con orari diversi da azienda ad azienda. Prima di partire controlla le fasce di garanzia.</p></div></div>`,
`<div style="position:absolute;inset:0;background:#c8322a;color:#fff;padding:200px 80px 0"><p class="k" style="color:#ffd5d1">Tutte le ${N} città</p><p style="font:800 136px/.88 T;text-transform:uppercase;margin-top:16px">Cerca<br>la tua<br>sulla mappa.</p>
<p style="font:600 42px/1.35 C;margin-top:30px">Filtri, "un giorno preciso", 20 novembre. Link in bio.</p>
<div style="display:inline-flex;align-items:center;gap:22px;margin-top:40px;background:#fff;color:#1c1b1f;padding:20px 34px;border-radius:60px;font:800 50px T"><span style="background:#c8322a;color:#fff;border-radius:40px;padding:4px 22px;font-size:38px">+ Segui</span>@mappadellarivolta</div>
<p style="position:absolute;left:80px;right:80px;bottom:52px;font:600 23px/1.4 C;color:#ffe1de">Fonti: schede della mappa (comunicati CGIL e sindacati territoriali, collettivi studenteschi, Ministero dei Trasporti). La mappa riporta informazioni pubbliche con la loro fonte.</p></div>`];
const b = await chromium.launch({ executablePath: CHROME, args: ['--lang=it-IT'] });
const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
for (let i = 0; i < S.length; i++) { const dk = [0, 2, 4, 6].includes(i); await p.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${S[i]}<div class="m" style="color:${dk ? '#fff' : '#1c1b1f'}"><i style="${dk && i !== 0 && i !== 2 ? 'background:#fff' : ''}"></i>Mappa della Rivolta</div></body></html>`); await p.evaluate(() => document.fonts.ready);
  const f = await p.evaluate(() => Math.max(...[...document.querySelectorAll('p')].map((e) => e.getBoundingClientRect().bottom))); if (f > 1340) console.log('FUORI', i + 1, f);
  await p.screenshot({ path: `out/p20-0${i + 1}.png` }); }
await b.close();
