// Carosello 1080x1350 "Domani in piazza" (sabato 24 ottobre 2026).
// Dati letti da mappadellarivolta.org/api/mobilitazioni il 22/10/2026 ~22:15 UTC:
// solo eventi `verificato` con fonte; esclusi possibili disagi, occupazioni, presidi degli autotrasportatori ai caselli
// (blocchi sospesi il 21-22/10), eventi organizzati da partiti e il presidio di Verona su un caso giudiziario (vedi bozza).
// Uso: node domani.mjs [cartella]   → domani-1.png … domani-N.png
import fs from 'node:fs';
import { COL, W, H, pathItalia, xy, cssBase } from './motore.mjs'; import { chromium } from 'playwright-core';
const OUT = process.argv[2] || 'out/domani'; fs.mkdirSync(OUT, { recursive: true });
const GIORNO = 'Sabato 24 ottobre';
// [gruppo, tipo, città, ora, luogo, titolo, organizzatori, lat, lng]
const E = [
 [0, 'corteo', 'Torino', '15:00', 'Piazza Castello', 'Corteo contro il riarmo', 'Torino contro il riarmo · Oltre Torino · KSA Torino', 45.0703, 7.686],
 [0, 'corteo', 'Alba', '14:00', 'Via Pola', 'Corteo per dignità e diritti, contro lo sfruttamento lavorativo', 'Caritas · sindacati · Libera · Arci · Cinema Vekkio', 44.6944, 8.037],
 [1, 'altro', 'Milano', '15:00', 'Parco del Ticinello, via Dudovich', 'Passeggiata contro il taglio degli alberi del Parco del Ticinello', 'Comitato Difesa Ambiente zona 5', 45.4281, 9.1825],
 [1, 'presidio', 'Bergamo', '15:00', 'Piazza della Libertà', 'Presidio studentesco', 'UDS', 45.6942, 9.6707],
 [1, 'corteo', 'Brescia', '14:30', 'Largo Formentone', "Marcia per l'accoglienza", 'vedi la fonte sulla mappa', 45.5403, 10.2193],
 [1, 'corteo', 'Casalmaggiore', '16:30', 'Piazza Garibaldi', 'Corteo per la Palestina', 'Onda Queer · Rive Gauche · Tavola della Pace Cremona e altri', 44.9864, 10.4152],
 [0, 'presidio', 'Verona', '16:30', 'Piazza San Nicolò', 'Presidio per la Palestina', 'Verona per la Palestina', 45.44, 10.9957],
 [0, 'altro', 'Este', '16:30', 'Piazza Maggiore', 'Sit-in contro il DDL caccia', 'Comitato Lasciateci respirare e altre associazioni', 45.2281, 11.6561],
 [2, 'corteo', 'Lucca', '8:30', 'Piazza San Michele', 'Sciopero studentesco', 'FAUST · Giovane Grido Lucca', 43.843, 10.503],
 [2, 'corteo', 'Empoli', '15:30', 'Piazza Farinata degli Uberti', 'Corteo contro guerra, carovita e repressione', 'CSA Intifada', 43.7196, 10.946],
 [2, 'presidio', 'Pistoia', '17:00', 'Piazza Gavinana', 'Presidio contro riarmo e guerra', 'Rete pistoiese per la Palestina', 43.932, 10.9153],
 [3, 'corteo', 'Roma', '14:00', 'Piazza della Repubblica → Fori Imperiali', 'Corteo nazionale per la pace "Fuori l\'Italia dalla guerra"', "Campagna Fuori l'Italia dalla guerra", 41.9025, 12.4965],
 [3, 'corteo', 'Castel Volturno', '13:00', 'luogo di ritrovo: vedi la fonte', 'Corteo contro i CPR ("Né qui né altrove")', 'Comitato regionale No CPR', 41.0344, 13.9411],
 [3, 'assemblea', 'Palermo', '15:30', 'Cattedrale', 'Assemblea pubblica verso lo sciopero del 30 ottobre nelle scuole', 'OSA Palermo', 38.1141, 13.3566],
 [3, 'assemblea', 'Cagliari', '16:30', 'Giardino Sotto le Mura', 'Assemblea studentesca verso il 30 ottobre', 'Studenti Cagliari', 39.2175, 9.1172],
].map(([g, t, c, ora, luogo, tit, org, la, ln]) => ({ g, t, c, ora, luogo, tit, org, xy: xy(la, ln) }));
const GRUPPI = ['Piemonte e Veneto', 'Lombardia', 'Toscana', 'Lazio, Campania e isole'];
const NOTE = { Torino: 'Prima: colazione in piazzetta Borgo Dora e ritrovo degli studenti in piazza Arbarello.' };
const NOMI = { corteo: 'Corteo', presidio: 'Presidio', assemblea: 'Assemblea', altro: 'Altro' };
const citta = new Set(E.map((e) => e.c)).size;
const minuti = (o) => { const [h, m] = o.split(':').map(Number); return h * 60 + m; };

const mappa = (g) => `<svg viewBox="-20 -20 ${W + 40} ${H + 40}" style="width:100%;height:100%"><path d="${pathItalia}" fill="#fff" stroke="#1c1b1f" stroke-width="3.5" stroke-linejoin="round"/>${E.map((e) => { const on = g === -1 || e.g === g; return `<circle cx="${e.xy[0]}" cy="${e.xy[1]}" r="${on ? 36 : 22}" fill="${COL[e.t]}" opacity="${on ? .2 : .06}"/><circle cx="${e.xy[0]}" cy="${e.xy[1]}" r="${on ? 19 : 12}" fill="${on ? COL[e.t] : '#d8cfc4'}" stroke="#f6f3ee" stroke-width="5"/>`; }).join('')}</svg>`;
const css = cssBase.replace('body{width:1080px;height:1920px', 'body{width:1080px;height:1350px') + `
.p{position:relative;height:1350px;padding:70px;display:flex;flex-direction:column}
.m{position:static}.n{position:absolute;top:70px;right:70px;font:700 30px T;letter-spacing:.1em;color:#8d8a93}
h1{font:800 132px/.88 T;text-transform:uppercase;margin-top:30px}h1 em{font-style:normal;color:#c8322a}
.k{font:700 34px T;letter-spacing:.12em;text-transform:uppercase;color:#c8322a}
.f{margin-top:auto;display:flex;justify-content:space-between;align-items:center;border-top:3px solid currentColor;padding-top:20px;font:800 46px T}.f span{font:600 30px C;opacity:.7}
.dk{background:#1c1b1f;color:#fff}
.r{display:grid;grid-template-columns:118px 1fr;gap:18px;padding:13px 0;border-bottom:2px solid #e2dbd1}
.r .o{font:800 46px/1 T}.r .c{font:800 44px/1 T;text-transform:uppercase}.r .c i{display:inline-block;width:22px;height:22px;border-radius:50%;margin-right:12px;vertical-align:3px}
.r .t{font:700 29px/1.22 C;margin-top:6px}.r .d{font:400 25px/1.3 C;color:#5f5d66;margin-top:4px}.r .d b{font-weight:600;color:#2b2a30}
.r .nt{font:600 24px/1.3 C;color:#c8322a;margin-top:4px}
.leg{display:flex;flex-wrap:wrap;gap:10px 26px;font:600 28px C;color:#5f5d66}.leg i{display:inline-block;width:20px;height:20px;border-radius:50%;margin-right:8px;vertical-align:-1px}`;
const tot = GRUPPI.length + 2;
const P = [];
const tipi = [...new Set(E.map((e) => e.t))];
P.push(`<div class="p"><div class="m"><i></i>Mappa della Rivolta</div><div class="n">1/${tot}</div>
 <p class="k" style="margin-top:34px">Domani · ${GIORNO}</p>
 <h1 style="margin-top:8px">Domani<br><em>in piazza</em></h1>
 <p style="font:700 48px/1.15 C;margin-top:22px">${E.length} iniziative in ${citta} città,<br>tutte con fonte e verificate.</p>
 <div style="display:grid;grid-template-columns:1fr 330px;gap:24px;flex:1;min-height:0;margin-top:16px">
  <div style="min-height:0">${mappa(-1)}</div>
  <div style="align-self:center;display:flex;flex-direction:column;gap:20px">
   ${GRUPPI.map((g, i) => `<div style="border-left:10px solid #c8322a;padding-left:16px"><b style="display:block;font:800 40px/1 T;text-transform:uppercase">${g}</b><span style="font:600 28px C;color:#5f5d66">${E.filter((e) => e.g === i).length} iniziative · slide ${i + 2}</span></div>`).join('')}
   <div class="leg">${tipi.map((t) => `<span><i style="background:${COL[t]}"></i>${NOMI[t]}</span>`).join('')}</div></div></div>
 <div class="f">Salva il post per domani<span>scorri ›</span></div></div>`);
GRUPPI.forEach((g, i) => {
  const L = E.filter((e) => e.g === i).sort((a, b) => minuti(a.ora) - minuti(b.ora));
  P.push(`<div class="p"><div class="m"><i></i>Mappa della Rivolta</div><div class="n">${i + 2}/${tot}</div>
   <p class="k" style="margin-top:30px">${GIORNO}</p>
   <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:20px">
    <h1 style="font-size:84px;margin-top:6px">${g.replace(', ', ',<br>').replace(' e V', '<br>e V')}</h1>
    <div style="width:170px;height:198px;flex:none">${mappa(i)}</div></div>
   <div style="margin-top:8px">${L.map((e) => `<div class="r"><div class="o">${e.ora}</div><div><div class="c"><i style="background:${COL[e.t]}"></i>${e.c}</div><div class="t">${e.tit}</div><div class="d"><b>${e.luogo}</b> · ${e.org}</div>${NOTE[e.c] ? `<div class="nt">${NOTE[e.c]}</div>` : ''}</div></div>`).join('')}</div>
   <div class="f">mappadellarivolta.org<span>scorri ›</span></div></div>`);
});
P.push(`<div class="p dk"><div class="m" style="color:#fff"><i></i>Mappa della Rivolta</div><div class="n">${tot}/${tot}</div>
 <h1 style="font-size:124px">Prima di<br><em>partire</em></h1>
 <p style="font:600 44px/1.3 C;color:#e8e4dd;margin-top:40px">Orari e luoghi possono cambiare: apri l'evento sulla mappa e controlla la fonte.</p>
 <p style="font:600 40px/1.3 C;color:#c9c5bf;margin-top:30px">Nella tua città c'è un corteo, un presidio o un'assemblea che non vedi? Aggiungilo in 30 secondi, senza account: un volontario controlla la fonte.</p>
 <p style="font:600 34px/1.3 C;color:#c9c5bf;margin-top:auto">La mappa riporta informazioni pubbliche con la loro fonte.</p>
 <div class="f" style="border-color:#fff;margin-top:24px">mappadellarivolta.org<span>link in bio</span></div></div>`);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const pg = await b.newPage({ viewport: { width: 1080, height: 1350 } });
for (const [n, h] of P.entries()) {
  await pg.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${h}</body></html>`);
  await pg.evaluate(() => document.fonts.ready);
  const over = await pg.evaluate(() => document.querySelector('.p').scrollHeight > 1350);
  if (over) console.warn(`ATTENZIONE: slide ${n + 1} trabocca`);
  await pg.screenshot({ path: `${OUT}/domani-${n + 1}.png` });
}
await b.close();
console.log('slide', P.length, 'eventi', E.length, 'città', citta);
