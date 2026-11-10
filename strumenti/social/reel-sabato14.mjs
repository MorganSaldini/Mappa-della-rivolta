// Reel 1080x1920 "Sabato 14 in piazza" (19:15 del 10/11/2026).
// Dati letti da https://mappadellarivolta.org/api/mobilitazioni il 10/11/2026 ~18:50: solo eventi `verificato` con fonte.
// Cortei sabato 14: Milano, Brescia, Verona. Avviso disagi: scioperi dei trasporti verificati 13-14/11.
// Uscita: out/reel-sabato14.mp4 (copertina 0,6 s come primo fotogramma + bling di sottofondo).
import fs from 'node:fs'; import { execSync } from 'node:child_process'; import { chromium } from 'playwright-core';
import { COL, W, H, pathItalia, xy, cssBase, rendi, CHROME } from './motore.mjs';
const E = [
  ['Milano', '14:00', 'Piazza Leonardo da Vinci', 'Corteo contro il carovita', 45.46996, 9.18594],
  ['Brescia', '14:00', 'Largo Formentone', 'Corteo contro il caro vita', 45.54029, 10.21932],
  ['Verona', '14:00', 'Piazza Bra', 'Corteo silenzioso per Gaza', 45.43816, 10.99331],
].map(([c, ora, luogo, tit, la, ln]) => { const [x, y] = xy(la, ln); return { c, ora, luogo, tit, x, y }; });
const DIS = [
  ['Gio 13', 'Milano', 'sciopero ATM (metro, bus, tram)'],
  ['Gio 13', 'Monza e Brianza', 'sciopero Net'],
  ['Gio 13', 'Venezia', 'sciopero ATVO'],
  ['Sab 14', 'Bari', 'sciopero AMTAB, 24 ore'],
];
// riquadro sul Nord
const [x0, y0] = xy(46.4, 8.3), [x1, y1] = xy(44.9, 11.9);
const vb = `${x0} ${y0} ${x1 - x0} ${y1 - y0}`, sc = (x1 - x0) / 920;
const T0 = 1.9, STEP = 1.7, TD = T0 + 3 * STEP + 0.6, TF = TD + 4.2, TOT = TF + 3.4;
const dots = E.map((e, i) => `<g id="e${i}" opacity="0" transform="translate(${e.x},${e.y})"><circle r="${46 * sc}" fill="${COL.corteo}" opacity=".22"/><circle r="${22 * sc}" fill="${COL.corteo}" stroke="#f6f3ee" stroke-width="${6 * sc}"/><text x="${32 * sc}" y="${-26 * sc}" font-size="${48 * sc}" style="font-family:T;font-weight:800;text-transform:uppercase" fill="#1c1b1f">${e.c}</text></g>`).join('');
const html = `<!doctype html><html><head><meta charset="utf-8"><style>${cssBase}
#map{position:absolute;left:80px;top:560px;width:920px;height:${920 * (y1 - y0) / (x1 - x0)}px;border-radius:28px;background:#e9e4dc}
#hook{position:absolute;left:80px;right:100px;top:300px}#hook p{font:700 40px T;letter-spacing:.14em;text-transform:uppercase;color:#c8322a}
#hook h1{font:800 140px/.9 T;text-transform:uppercase;margin-top:10px}#hook h1 em{font-style:normal;color:#c8322a}
#top{position:absolute;left:80px;right:80px;top:280px;opacity:0}#top p{font:700 38px T;letter-spacing:.14em;text-transform:uppercase;color:#c8322a}
#top h2{font:800 110px/.9 T;text-transform:uppercase;margin-top:8px}
#card{position:absolute;left:80px;right:80px;top:1240px;background:#fff;border-left:14px solid #c8322a;border-radius:18px;padding:34px 40px;opacity:0}
#card .c{font:800 92px/.95 T;text-transform:uppercase}#card .o{font:700 44px T;color:#c8322a;margin-top:10px}
#card .t{font:600 42px/1.25 C;color:#3b3940;margin-top:12px}
#dis{position:absolute;inset:0;background:#1c1b1f;color:#fff;padding:300px 80px;opacity:0}
#dis p.k{font:700 38px T;letter-spacing:.14em;text-transform:uppercase;color:#ff8a7e}
#dis h2{font:800 112px/.92 T;text-transform:uppercase;margin:10px 0 50px}
#dis li{list-style:none;display:flex;gap:28px;align-items:baseline;border-top:2px solid #3a383f;padding:26px 0;opacity:0}
#dis li b{font:800 52px T;color:#ff8a7e;min-width:180px;text-transform:uppercase}#dis li span{font:600 44px/1.2 C}#dis li span i{font-style:normal;font-weight:700}
#dis .n{font:600 32px/1.3 C;color:#c9c5bf;margin-top:30px}
#fine{position:absolute;inset:0;background:#c8322a;color:#fff;padding:320px 80px;opacity:0}
#fine h1{font:800 132px/.9 T;text-transform:uppercase}
#fine p{font:600 46px/1.3 C;margin-top:40px}#fine .url{font:800 88px T;margin-top:70px}
#fine .nota{font:600 32px/1.3 C;color:#fde3df;margin-top:60px}
</style></head><body><svg id="map" viewBox="${vb}" style="opacity:0"><path d="${pathItalia}" fill="#fff" stroke="#1c1b1f" stroke-width="${3.5 * sc}" stroke-linejoin="round"/>${dots}</svg>
<div id="hook"><p>Sabato 14 novembre</p><h1>Dove si scende<br>in piazza<br><em>sabato?</em></h1></div>
<div id="top"><p>Sabato 14 · cortei verificati</p><h2>Tre città,<br>stessa ora</h2></div>
<div id="card"></div>
<div id="dis"><p class="k">Possibili disagi</p><h2>Scioperi dei<br>trasporti</h2><ul>${DIS.map((d) => `<li><b>${d[0]}</b><span><i>${d[1]}</i> · ${d[2]}</span></li>`).join('')}</ul><p class="n">Fasce garantite e orari: controlla il sito dell'azienda prima di partire.</p></div>
<div id="fine"><h1>Sabato 14<br>Milano, Brescia,<br>Verona.</h1><p>Luoghi e orari aggiornati sulla mappa,<br>con la fonte di ogni corteo.</p><p class="url">mappadellarivolta.org</p><p style="font:600 40px C;margin-top:10px">Manca la tua città? Aggiungila.</p><p class="nota">La mappa riporta informazioni pubbliche con la loro fonte.</p></div>
<div class="m"><i></i>Mappa della Rivolta</div><script>
const E=${JSON.stringify(E)},T0=${T0},STEP=${STEP},TD=${TD},TF=${TF};
const $=(s)=>document.querySelector(s); const cl=(v)=>Math.max(0,Math.min(1,v)); const ease=(v)=>1-Math.pow(1-cl(v),3);
window.render=(t)=>{
  $('#hook').style.opacity = t<T0-0.25?1:cl((T0-t)/0.25);
  $('#map').style.opacity = cl((t-(T0-0.3))/0.4); $('#top').style.opacity = cl((t-T0)/0.3);
  const k = Math.floor((t-T0)/STEP);
  E.forEach((e,i)=>{ const g=document.getElementById('e'+i); const v=ease((t-T0-i*STEP)/0.35); const s=v<1?v*1.2:1;
    g.setAttribute('opacity', v>0?(i<k?0.75:1):0); g.setAttribute('transform','translate('+e.x+','+e.y+') scale('+Math.max(0.001,s)+')'); });
  if(t>=T0 && k<3){ const e=E[Math.min(k,2)]; $('#card').innerHTML='<div class="c">'+e.c+'</div><div class="o">ore '+e.ora+' · '+e.luogo+'</div><div class="t">'+e.tit+'</div>';
    $('#card').style.opacity = cl((t-T0-k*STEP)/0.25); }
  else if(t>=T0) $('#card').style.opacity=1;
  $('#dis').style.opacity = cl((t-TD)/0.3);
  document.querySelectorAll('#dis li').forEach((li,i)=>{ li.style.opacity = cl((t-TD-0.4-i*0.45)/0.3); });
  $('#fine').style.opacity = cl((t-TF)/0.3);
  document.querySelector('.m').style.color = t>TD+0.15?'#fff':'#1c1b1f';
};
</script></body></html>`;
const cover = `<!doctype html><html><head><meta charset="utf-8"><style>${cssBase}</style></head><body><div style="position:absolute;inset:0;background:#f6f3ee"></div>
<svg viewBox="${vb}" style="position:absolute;left:80px;top:860px;width:920px;height:${920 * (y1 - y0) / (x1 - x0)}px;border-radius:28px;background:#e9e4dc"><path d="${pathItalia}" fill="#fff" stroke="#1c1b1f" stroke-width="${4 * sc}" stroke-linejoin="round"/>${E.map((e) => `<circle cx="${e.x}" cy="${e.y}" r="${44 * sc}" fill="${COL.corteo}" opacity=".25"/><circle cx="${e.x}" cy="${e.y}" r="${22 * sc}" fill="${COL.corteo}" stroke="#fff" stroke-width="${5 * sc}"/><text x="${e.x + 32 * sc}" y="${e.y - 26 * sc}" font-size="${48 * sc}" style="font-family:T;font-weight:800;text-transform:uppercase">${e.c}</text>`).join('')}</svg>
<div style="position:absolute;left:80px;right:80px;top:300px"><p style="font:700 40px T;letter-spacing:.14em;text-transform:uppercase;color:#c8322a">Sabato 14 novembre</p><h1 style="font:800 160px/.88 T;text-transform:uppercase;margin-top:10px">In piazza<br><span style="color:#c8322a">sabato 14</span></h1></div>
<div class="m"><i></i>Mappa della Rivolta</div></body></html>`;
fs.mkdirSync('./out', { recursive: true });
const b = await chromium.launch({ executablePath: CHROME });
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
await p.setContent(cover); await p.evaluate(() => document.fonts.ready); await p.screenshot({ path: './out/cover-sabato14.png' }); await b.close();
await rendi({ html, durata: TOT, uscita: './out/reel-sabato14-muto.mp4', cartella: './out/f-sabato14' });
const C = 0.6, tempi = [0.15, C + T0, C + T0 + STEP, C + T0 + 2 * STEP, C + TD];
const durTot = C + TOT;
execSync(`python3 suoni.py out/bling-sabato14.wav ${durTot.toFixed(2)} "${tempi.map((x) => x.toFixed(2)).join(',')}" ${(C + TF).toFixed(2)}`);
execSync(`ffmpeg -v error -y -loop 1 -framerate 30 -t ${C} -i out/cover-sabato14.png -i out/reel-sabato14-muto.mp4 -i out/bling-sabato14.wav -filter_complex "[0:v]format=yuv420p,setsar=1[c];[1:v]format=yuv420p,setsar=1[r];[c][r]concat=n=2:v=1:a=0[v]" -map "[v]" -map 2:a -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac -b:a 160k -shortest -movflags +faststart out/reel-sabato14.mp4`);
console.log('durata', durTot.toFixed(2));
