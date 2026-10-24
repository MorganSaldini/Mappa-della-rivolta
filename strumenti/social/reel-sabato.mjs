// Reel 1080x1920 "Sabato 24 in 15 secondi": la mappa si accende ora per ora sulle piazze di sabato.
// Stessi eventi del carosello domani.mjs (verificati con fonte, letti il 22/10/2026, + Grosseto il 23/10).
// Uscita: out/reel-sabato.mp4 (copertina 0,6 s come primo fotogramma + bling di sottofondo).
import fs from 'node:fs'; import { execSync } from 'node:child_process'; import { chromium } from 'playwright-core';
import { COL, W, H, pathItalia, xy, cssBase, rendi } from './motore.mjs';
const E = [
 ['corteo', 'Grosseto', '8:00', 42.7635, 11.1124], ['corteo', 'Lucca', '8:30', 43.843, 10.503], ['corteo', 'Castel Volturno', '13:00', 41.0344, 13.9411],
 ['corteo', 'Roma', '14:00', 41.9025, 12.4965], ['corteo', 'Alba', '14:00', 44.6944, 8.037],
 ['corteo', 'Brescia', '14:30', 45.5403, 10.2193], ['corteo', 'Torino', '15:00', 45.0703, 7.686],
 ['altro', 'Milano', '15:00', 45.4281, 9.1825], ['presidio', 'Bergamo', '15:00', 45.6942, 9.6707],
 ['corteo', 'Empoli', '15:30', 43.7196, 10.946], ['assemblea', 'Palermo', '15:30', 38.1141, 13.3566],
 ['corteo', 'Casalmaggiore', '16:30', 44.9864, 10.4152], ['presidio', 'Verona', '16:30', 45.44, 10.9957],
 ['altro', 'Este', '16:30', 45.2281, 11.6561], ['assemblea', 'Cagliari', '16:30', 39.2175, 9.1172],
 ['presidio', 'Pistoia', '17:00', 43.932, 10.9153],
].map(([t, c, ora, la, ln], i) => { const [x, y] = xy(la, ln); return { c, ora, col: COL[t], x, y }; });
const ORE = [...new Set(E.map((e) => e.ora))];               // 8:00 8:30 13:00 14:00 14:30 15:00 15:30 16:30 17:00
const DUR = [0.8, 0.9, 0.9, 1.1, 0.8, 1.4, 1.0, 1.4, 1.0], T0 = 1.9;
const FINE = T0 + DUR.reduce((a, b) => a + b, 0), TOT = FINE + 3.4;
const citta = new Set(E.map((e) => e.c)).size;
const dots = E.map((e, i) => `<g id="e${i}" transform="translate(${e.x},${e.y})" opacity="0"><circle r="46" fill="${e.col}" opacity=".2"/><circle r="24" fill="${e.col}" stroke="#f6f3ee" stroke-width="6"/></g>`).join('');
const html = `<!doctype html><html><head><meta charset="utf-8"><style>${cssBase}
#map{position:absolute;left:110px;top:430px;width:${W}px;height:${H}px}
#hook{position:absolute;left:80px;right:120px;top:300px}#hook p{font:700 40px T;letter-spacing:.14em;text-transform:uppercase;color:#c8322a}
#hook h1{font:800 140px/.9 T;text-transform:uppercase;margin-top:10px}#hook h1 em{font-style:normal;color:#c8322a}
#head{position:absolute;left:80px;right:120px;top:250px;display:flex;justify-content:space-between;align-items:flex-end}
#ora{font:800 150px/.85 T}#ora small{display:block;font:700 36px T;letter-spacing:.14em;text-transform:uppercase;color:#c8322a;margin-bottom:10px}
#conta{text-align:right;font:600 34px/1.1 C;color:#5f5d66}#conta b{display:block;font:800 104px/.9 T;color:#1c1b1f}
#chips{position:absolute;left:80px;right:140px;top:1460px;font:800 62px/1.1 T;text-transform:uppercase}
#fine{position:absolute;inset:0;background:#1c1b1f;color:#fff;padding:300px 80px;opacity:0}
#fine h1{font:800 140px/.9 T;text-transform:uppercase}#fine h1 em{font-style:normal;color:#c8322a}
#fine p{font:600 46px/1.3 C;color:#e8e4dd;margin-top:40px}#fine .url{font:800 92px T;color:#fff;margin-top:70px}
#fine .nota{font:600 32px/1.3 C;color:#c9c5bf;margin-top:60px}
</style></head><body><svg id="map" viewBox="0 0 ${W} ${H}"><path d="${pathItalia}" fill="#fff" stroke="#1c1b1f" stroke-width="3.5" stroke-linejoin="round"/>${dots}</svg>
<div id="hook"><p>Sabato 24 ottobre</p><h1>Dove si scende<br>in piazza<br><em>sabato?</em></h1></div>
<div id="head" style="opacity:0"><p id="ora"></p><p id="conta"><b>0</b>iniziative</p></div>
<div id="chips"></div>
<div id="fine"><h1>${E.length} iniziative<br><em>in ${citta} città.</em></h1><p>Cortei, presidi e assemblee di sabato,<br>tutti con fonte e verificati.<br>Orari e luoghi sulla mappa.</p><p class="url">mappadellarivolta.org</p><p style="font:600 40px C;margin-top:10px">Salva il video · Mandalo a chi ci va</p><p class="nota">La mappa riporta informazioni pubbliche con la loro fonte.</p></div>
<div class="m"><i></i>Mappa della Rivolta</div><script>
const E=${JSON.stringify(E)},O=${JSON.stringify(ORE)},DUR=${JSON.stringify(DUR)},T0=${T0},FINE=${FINE};
const $=(s)=>document.querySelector(s); const cl=(v)=>Math.max(0,Math.min(1,v)); const ease=(v)=>1-Math.pow(1-cl(v),3);
window.render=(t)=>{
  $('#hook').style.opacity = t<T0-0.25?1:cl((T0-t)/0.25);
  $('#map').style.opacity = t<T0? 0.35+0.65*cl((t-(T0-0.4))/0.4) : 1;
  let k=-1, st=T0, s=T0; for(let i=0;i<O.length;i++){ if(t>=s){k=i;st=s;} s+=DUR[i]; }
  $('#head').style.opacity = k>=0?1:0; let n=0;
  E.forEach((e,i)=>{ const g=document.getElementById('e'+i); const ki=O.indexOf(e.ora); if(k<0||ki>k){g.setAttribute('opacity',0);return;}
    n++; if(ki<k){ g.setAttribute('opacity',.55); g.setAttribute('transform','translate('+e.x+','+e.y+') scale(.75)'); }
    else { const idx=E.filter(x=>x.ora===e.ora).indexOf(e); const v=ease((t-st-idx*0.1)/0.3); const sc=v<1? v*1.25 : 1; g.setAttribute('opacity',v>0?1:0); g.setAttribute('transform','translate('+e.x+','+e.y+') scale('+Math.max(0.001,sc)+')'); }
  });
  if(k>=0){ $('#ora').innerHTML='<small>Sabato 24 · ore</small>'+O[k]; $('#conta').innerHTML='<b>'+n+'</b>iniziative';
    $('#chips').innerHTML=E.filter(x=>x.ora===O[k]).map(x=>x.c).join(' · '); } else $('#chips').innerHTML='';
  $('#fine').style.opacity = cl((t-FINE)/0.3); document.querySelector('.m').style.color = t>FINE+0.15?'#fff':'#1c1b1f';
};
</script></body></html>`;
// copertina (primo fotogramma)
const pin = E.map((e) => [e.x, e.y]);
const cover = `<!doctype html><html><head><meta charset="utf-8"><style>${cssBase}</style></head><body><div style="position:absolute;inset:0;background:#f6f3ee"></div>
<svg viewBox="0 0 ${W} ${H}" style="position:absolute;left:190px;top:820px;width:700px;height:${700 * H / W}px"><path d="${pathItalia}" fill="#fff" stroke="#1c1b1f" stroke-width="4" stroke-linejoin="round"/>${E.map((e) => `<circle cx="${e.x}" cy="${e.y}" r="40" fill="${e.col}" opacity=".25"/><circle cx="${e.x}" cy="${e.y}" r="20" fill="${e.col}" stroke="#fff" stroke-width="5"/>`).join('')}</svg>
<div style="position:absolute;left:80px;right:80px;top:300px"><p style="font:700 40px T;letter-spacing:.14em;text-transform:uppercase;color:#c8322a">Sabato 24 ottobre</p><h1 style="font:800 168px/.88 T;text-transform:uppercase;margin-top:10px">${E.length} piazze<br><span style="color:#c8322a">in 15 secondi</span></h1></div>
<div class="m"><i></i>Mappa della Rivolta</div></body></html>`;
fs.mkdirSync('./out', { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
await p.setContent(cover); await p.evaluate(() => document.fonts.ready); await p.screenshot({ path: './out/cover-sabato.png' }); await b.close();
await rendi({ html, durata: TOT, uscita: './out/reel-sabato-muto.mp4', cartella: './out/f-sabato' });
// copertina 0,6 s + reel, poi bling: aggancio, ogni fascia oraria piena, accordo finale
const C = 0.6, tempi = [0.15, C + T0, C + T0 + DUR[0] + DUR[1], C + T0 + DUR.slice(0, 4).reduce((a, b) => a + b, 0), C + T0 + DUR.slice(0, 6).reduce((a, b) => a + b, 0)];
const durTot = C + TOT;
execSync(`python3 suoni.py out/bling-sabato.wav ${durTot.toFixed(2)} "${tempi.map((x) => x.toFixed(2)).join(',')}" ${(C + FINE).toFixed(2)}`);
execSync(`ffmpeg -v error -y -loop 1 -framerate 30 -t ${C} -i out/cover-sabato.png -i out/reel-sabato-muto.mp4 -i out/bling-sabato.wav -filter_complex "[0:v]format=yuv420p,setsar=1[c];[1:v]format=yuv420p,setsar=1[r];[c][r]concat=n=2:v=1:a=0[v]" -map "[v]" -map 2:a -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac -b:a 160k -shortest -movflags +faststart out/reel-sabato.mp4`);
console.log('durata', durTot.toFixed(2), 'eventi', E.length, 'città', citta, 'bling', tempi.map((x) => x.toFixed(2)).join(','));
