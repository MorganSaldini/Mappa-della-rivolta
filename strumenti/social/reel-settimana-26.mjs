// Reel 1080x1920 "La settimana che arriva" (26 ottobre – 1 novembre 2026): la mappa si accende giorno per giorno.
// Dati letti da https://mappadellarivolta.org/api/mobilitazioni il 24/10/2026 (giro finale 19:15):
// solo eventi "verificato" con fonte; esclusi tipo "altro" (possibili disagi, occupazioni, incontri),
// presidi/blocchi di autotrasportatori e agricoltori, e Pescara 1/11 (fonte da chiarire). Un punto per città al giorno.
// Uscita: out/reel-settimana-26.mp4 (copertina 0,6 s come primo fotogramma + bling di sottofondo).
import fs from 'node:fs'; import { execSync } from 'node:child_process'; import { chromium } from 'playwright-core';
import { COL, W, H, pathItalia, xy, cssBase, rendi, CHROME } from './motore.mjs';
const RAW = [
 [0,'corteo','Somma Vesuviana',40.872,14.438],[0,'presidio','Imperia',43.891,8.043],[0,'corteo','Cassino',41.491,13.831],[0,'corteo','Giugliano',40.928,14.217],
 [0,'presidio','Varese',45.818,8.826],[0,'assemblea','Taranto',40.473,17.24],[0,'assemblea','Brescia',45.548,10.218],[0,'assemblea','Torino',45.068,7.694],
 [0,'assemblea','Genova',44.415,8.927],[0,'assemblea','Cuneo',44.389,7.554],[0,'assemblea','Firenze',43.778,11.257],
 [1,'sciopero_categoria','Firenze',43.77,11.256],[1,'assemblea','Pisa',43.723,10.408],[1,'assemblea','Roma',41.894,12.463],
 [2,'sciopero_categoria','Napoli',40.852,14.268],[2,'sciopero_categoria','Bologna',44.495,11.343],[2,'assemblea','Torino',45.065,7.658],
 [3,'assemblea','Roma',41.891,12.505],
 [4,'sciopero_categoria','Livorno',42.79,10.34],[4,'sciopero_generale','Parma',44.796,10.318],[4,'sciopero_categoria','Piombino',42.929,10.544],[4,'presidio','Verona',45.43,10.982],
 [4,'corteo','Sesto San Giovanni',45.542,9.238],[4,'corteo','Padova',45.417,11.88],[4,'sciopero_categoria','Bassano del Grappa',45.754,11.733],[4,'corteo','Bologna',44.497,11.353],
 [4,'sciopero_generale','Palermo',38.125,13.356],[4,'corteo','Trento',46.065,11.124],[4,'corteo','Treviso',45.662,12.245],[4,'sciopero_generale','Reggio Calabria',38.114,15.651],
 [4,'sciopero_generale','Pisa',43.684,10.393],[4,'corteo','Napoli',40.852,14.268],[4,'sciopero_generale','Trieste',45.649,13.768],[4,'corteo','Ravenna',44.418,12.2],
 [4,'sciopero_generale','Brescia',45.545,10.221],[4,'corteo','Torino',45.068,7.694],[4,'corteo','Rimini',44.057,12.571],[4,'corteo','Reggio Emilia',44.705,10.637],
 [4,'sciopero_generale','Bari',41.125,16.86],[4,'corteo','Catania',37.501,15.088],[4,'corteo','Cagliari',39.219,9.122],[4,'sciopero_generale','La Spezia',44.238,9.691],
 [4,'presidio','Imperia',43.889,8.046],[4,'corteo','Novara',45.449,8.622],[4,'corteo','Milano',45.474,9.205],[4,'sciopero_generale','Firenze',43.77,11.256],
 [4,'corteo','Pescara',42.473,14.21],[4,'sciopero_generale','Ancona',43.603,13.507],[4,'sciopero_generale','Roma',41.903,12.496],[4,'corteo','Mestre',45.483,12.233],
 [4,'corteo','Bolzano',46.498,11.355],[4,'sciopero_generale','Bergamo',45.695,9.67],[4,'sciopero_generale','Pozzallo',36.723,14.838],[4,'sciopero_generale','Orbassano',45.03,7.557],
 [4,'sciopero_generale','Grugliasco',45.067,7.592],[4,'sciopero_generale','Vercelli',45.328,8.424],[4,'sciopero_generale','Alessandria',44.923,8.618],[4,'sciopero_generale','Genova',44.416,8.92],
 [4,'corteo','Sassari',40.725,8.564],
 [6,'sciopero_categoria','Roma',41.903,12.496],
];
const E = RAW.map(([d,t,c,la,ln],i)=>{ const [x,y]=xy(la,ln); return {d,c,col:COL[t],x:x+((i*37)%9-4),y:y+((i*53)%9-4)}; });
const GIORNI = [['LUN',26],['MAR',27],['MER',28],['GIO',29],['VEN',30],['SAB',31],['DOM',1]];
const NOTE = {4:'Sciopero generale e cortei in '+E.filter(e=>e.d===4).length+' città', 5:'Per ora nessuna iniziativa verificata', 6:'1 novembre: sciopero del commercio nel Lazio'};
const DUR = [1.6,1.1,1.1,0.9,3.2,0.8,1.2], T0 = 1.9;
const FINE = T0 + DUR.reduce((a,b)=>a+b,0), TOT = FINE + 3.8;
const n30 = E.filter(e=>e.d===4).length;
const dots = E.map((e,i)=>`<g id="e${i}" transform="translate(${e.x},${e.y})" opacity="0"><circle r="42" fill="${e.col}" opacity=".2"/><circle r="22" fill="${e.col}" stroke="#f6f3ee" stroke-width="5"/></g>`).join('');
const html = `<!doctype html><html><head><meta charset="utf-8"><style>${cssBase}
#map{position:absolute;left:110px;top:430px;width:${W}px;height:${H}px}
#hook{position:absolute;left:80px;right:120px;top:300px}#hook h1{font:800 132px/.9 T;text-transform:uppercase}#hook h1 em{font-style:normal;color:#c8322a}
#head{position:absolute;left:80px;right:120px;top:250px;display:flex;justify-content:space-between;align-items:flex-end}
#giorno{font:800 150px/.85 T;text-transform:uppercase}#giorno span{color:#c8322a}
#conta{text-align:right;font:600 34px/1.1 C;color:#5f5d66}#conta b{display:block;font:800 104px/.9 T;color:#1c1b1f}
#chips{position:absolute;left:80px;right:140px;top:1450px;font:700 38px/1.25 C}
#nota{margin-top:10px;font:700 40px C;color:#c8322a}
#fine{position:absolute;inset:0;background:#1c1b1f;color:#fff;padding:300px 80px;opacity:0}
#fine h1{font:800 140px/.9 T;text-transform:uppercase}#fine h1 em{font-style:normal;color:#c8322a}
#fine p{font:600 48px/1.3 C;color:#e8e4dd;margin-top:40px}#fine .url{font:800 92px T;color:#fff;margin-top:70px}
#fine .leg{font:400 32px/1.3 C;color:#bdb8b0;margin-top:50px}
</style></head><body><svg id="map" viewBox="0 0 ${W} ${H}"><path d="${pathItalia}" fill="#fff" stroke="#1c1b1f" stroke-width="3.5" stroke-linejoin="round"/>${dots}</svg>
<div id="hook"><h1>Dove si scende<br>in piazza<br><em>la settimana<br>prossima?</em></h1></div>
<div id="head" style="opacity:0"><p id="giorno"></p><p id="conta"><b>0</b>appuntamenti</p></div>
<div id="chips"></div>
<div id="fine"><h1>${E.length} appuntamenti<br><em>in 7 giorni.</em></h1><p>Venerdì 30, sciopero generale:<br>${n30} città. Tutti con fonte,<br>tutti sulla mappa.</p><p class="url">mappadellarivolta.org</p><p style="font-size:40px">Salva il video · Mandalo a chi ci va</p><p class="leg">La mappa riporta informazioni pubbliche con la loro fonte.</p></div>
<div class="m"><i></i>Mappa della Rivolta</div><script>
const E=${JSON.stringify(E)},G=${JSON.stringify(GIORNI)},DUR=${JSON.stringify(DUR)},T0=${T0},FINE=${FINE},NOTE=${JSON.stringify(NOTE)};
const $=(s)=>document.querySelector(s); const cl=(v)=>Math.max(0,Math.min(1,v)); const ease=(v)=>1-Math.pow(1-cl(v),3);
window.render=(t)=>{
  $('#hook').style.opacity = t<T0-0.25?1:cl((T0-t)/0.25);
  $('#map').style.opacity = t<T0? 0.35+0.65*cl((t-(T0-0.4))/0.4) : 1;
  let k=-1, s=T0, st=0; for(let i=0;i<G.length;i++){ if(t>=s){k=i; st=s;} s+=DUR[i]; }
  $('#head').style.opacity = k>=0?1:0;
  let n=0;
  E.forEach((e,i)=>{ const g=document.getElementById('e'+i); if(k<0||e.d>k){g.setAttribute('opacity',0);return;}
    n++; if(e.d<k){ g.setAttribute('opacity',.5); g.setAttribute('transform','translate('+e.x+','+e.y+') scale(.7)'); }
    else { const oggi=E.filter(x=>x.d===k); const idx=oggi.indexOf(e); const pass=Math.min(0.08,1.8/oggi.length); const v=ease((t-st-idx*pass)/0.3); const sc=v<1? v*1.25 : 1; g.setAttribute('opacity',v>0?1:0); g.setAttribute('transform','translate('+e.x+','+e.y+') scale('+Math.max(0.001,sc)+')'); }
  });
  if(k>=0){ $('#giorno').innerHTML=G[k][0]+' <span>'+G[k][1]+'</span>'; $('#conta').innerHTML='<b>'+n+'</b>appuntamenti';
    const citta=[...new Set(E.filter(x=>x.d===k).map(x=>x.c))];
    const testo = k===4 ? 'Torino · Milano · Genova · Bologna · Firenze · Roma · Napoli · Bari · Palermo · Cagliari e molte altre' : (k===6?'':citta.join(' · '));
    $('#chips').innerHTML=testo+(NOTE[k]?'<p id="nota">'+NOTE[k]+'</p>':''); } else $('#chips').innerHTML='';
  $('#fine').style.opacity = cl((t-FINE)/0.3); document.querySelector('.m').style.color = t>FINE+0.15?'#fff':'#1c1b1f';
};
</script></body></html>`;
// copertina (primo fotogramma)
const cover = `<!doctype html><html><head><meta charset="utf-8"><style>${cssBase}</style></head><body><div style="position:absolute;inset:0;background:#f6f3ee"></div>
<svg viewBox="0 0 ${W} ${H}" style="position:absolute;left:190px;top:840px;width:700px;height:${700 * H / W}px"><path d="${pathItalia}" fill="#fff" stroke="#1c1b1f" stroke-width="4" stroke-linejoin="round"/>${E.map((e) => `<circle cx="${e.x}" cy="${e.y}" r="34" fill="${e.col}" opacity=".22"/><circle cx="${e.x}" cy="${e.y}" r="17" fill="${e.col}" stroke="#fff" stroke-width="4"/>`).join('')}</svg>
<div style="position:absolute;left:80px;right:80px;top:300px"><p style="font:700 40px T;letter-spacing:.14em;text-transform:uppercase;color:#c8322a">26 ottobre – 1 novembre</p><h1 style="font:800 160px/.88 T;text-transform:uppercase;margin-top:10px">La settimana<br><span style="color:#c8322a">che arriva</span></h1></div>
<div class="m"><i></i>Mappa della Rivolta</div></body></html>`;
fs.mkdirSync('./out', { recursive: true });
const b = await chromium.launch({ executablePath: CHROME });
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
await p.setContent(cover); await p.evaluate(() => document.fonts.ready); await p.screenshot({ path: './out/cover-settimana-26.png' }); await b.close();
await rendi({ html, durata: TOT, uscita: './out/reel-settimana-26-muto.mp4', cartella: './out/f-sett26' });
const C = 0.6, inizio = (i) => C + T0 + DUR.slice(0, i).reduce((a, b) => a + b, 0);
const tempi = [0.15, inizio(0), inizio(1), inizio(2), inizio(4), inizio(6)];
const durTot = C + TOT;
execSync(`python3 suoni.py out/bling-sett26.wav ${durTot.toFixed(2)} "${tempi.map((x) => x.toFixed(2)).join(',')}" ${(C + FINE).toFixed(2)}`);
execSync(`ffmpeg -v error -y -loop 1 -framerate 30 -t ${C} -i out/cover-settimana-26.png -i out/reel-settimana-26-muto.mp4 -i out/bling-sett26.wav -filter_complex "[0:v]format=yuv420p,setsar=1[c];[1:v]format=yuv420p,setsar=1[r];[c][r]concat=n=2:v=1:a=0[v]" -map "[v]" -map 2:a -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac -b:a 160k -shortest -movflags +faststart out/reel-settimana-26.mp4`);
console.log('durata', durTot.toFixed(2), 'appuntamenti', E.length, 'venerdì 30', n30);
