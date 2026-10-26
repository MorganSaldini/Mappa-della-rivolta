// Reel 1080x1920 "Gli studenti in sciopero il 30" (pubblicazione 27/10/2026 19:15).
// Dati letti da https://mappadellarivolta.org/api/mobilitazioni il 26/10/2026 19:52 UTC: eventi del 30/10 "verificato" con fonte,
// organizzati da collettivi studenteschi o rivolti a scuole e università. Esclusi: tipo "altro" (Nove, possibili disagi),
// sciopero del personale della scuola (Cobas Scuola), assemblea CNR, l'evento annullato di Torino.
// Motivi: studenti.it, 20/10/2026. Uscita: out/reel-studenti.mp4 (copertina 0,6 s come primo fotogramma + bling).
import fs from 'node:fs'; import { execSync } from 'node:child_process'; import { chromium } from 'playwright-core';
import { W, H, pathItalia, xy, cssBase, rendi, CHROME } from './motore.mjs';
const RAW = [
 [0,'Sesto San Giovanni',45.54168,9.23833],
 [1,'Trieste',45.65442,13.77712],
 [2,'Padova',45.4169,11.88038],[2,'Cesena',44.14498,12.24862],
 [3,'Trento',46.06514,11.12395],[3,'Piacenza',45.0482,9.70099],
 [4,'Torino',45.06843,7.69438],[4,'Reggio Emilia',44.70489,10.63655],
 [5,'Milano',45.47429,9.20524],[5,'Milano',45.47815,9.22685],[5,'Bologna',44.49366,11.34305],[5,'Bari',41.12505,16.85987],[5,'Siracusa',37.07671,15.28046],
 [6,'Torino',45.06835,7.69497],[6,'Torino',45.06964,7.68908],[6,'Torino',45.03947,7.67441],[6,'Torino',45.0637,7.65753],[6,'Torino',45.06291,7.68473],[6,'Torino',45.0739,7.66811],
 [6,'Orbassano',45.02969,7.55734],[6,'Grugliasco',45.06718,7.5919],[6,'Vercelli',45.32761,8.42441],[6,'Novara',45.44419,8.62542],[6,'Novara',45.44401,8.61979],
 [6,'Alessandria',44.92297,8.61782],[6,'Genova',44.4158,8.92041],
];
const COLS = '#c8322a';
const E = RAW.map(([d,c,la,ln],i)=>{ const [x,y]=xy(la,ln); return {d,c,x:x+((i*37)%7-3),y:y+((i*53)%7-3)}; });
const NC = new Set(E.map(e=>e.c)).size;
const STEP = [['ORE','7:30'],['ORE','7:45'],['ORE','8:00'],['ORE','8:30'],['ORE','9:00'],['ORE','9:30'],['E POI','']];
const NOTE = {6:'Piemonte e Genova: davanti a scuole e università'};
const DUR = [1.0,0.9,1.1,1.0,1.0,1.4,2.2], T0 = 2.4;
const FINE = T0 + DUR.reduce((a,b)=>a+b,0), MOT = 3.0, TOT = FINE + MOT + 4.0;
const dots = E.map((e,i)=>`<g id="e${i}" transform="translate(${e.x},${e.y})" opacity="0"><circle r="38" fill="${COLS}" opacity=".2"/><circle r="19" fill="${COLS}" stroke="#f6f3ee" stroke-width="5"/></g>`).join('');
const html = `<!doctype html><html><head><meta charset="utf-8"><style>${cssBase}
#map{position:absolute;left:110px;top:430px;width:${W}px;height:${H}px}
#hook{position:absolute;inset:0;background:#1c1b1f;color:#fff;padding:420px 80px}#hook h1{font:800 150px/.9 T;text-transform:uppercase}#hook h1 em{font-style:normal;color:#ff6b5e}
#hook p{font:600 46px/1.3 C;color:#e8e4dd;margin-top:50px}
#head{position:absolute;left:80px;right:120px;top:250px;display:flex;justify-content:space-between;align-items:flex-end}
#giorno{font:800 150px/.85 T;text-transform:uppercase}#giorno span{color:#c8322a}
#conta{text-align:right;font:600 34px/1.1 C;color:#5f5d66}#conta b{display:block;font:800 104px/.9 T;color:#1c1b1f}
#chips{position:absolute;left:80px;right:140px;top:1450px;font:700 40px/1.25 C}
#nota{margin-top:10px;font:700 38px C;color:#c8322a}
#mot{position:absolute;inset:0;background:#f6f3ee;padding:330px 80px;opacity:0}
#mot h2{font:800 120px/.92 T;text-transform:uppercase}#mot h2 em{font-style:normal;color:#c8322a}
#mot li{list-style:none;font:700 56px/1.2 C;margin-top:44px;padding-left:46px;position:relative}#mot li:before{content:'';position:absolute;left:0;top:22px;width:22px;height:22px;border-radius:50%;background:#c8322a}
#mot .f{font:400 32px C;color:#5f5d66;margin-top:60px}
#fine{position:absolute;inset:0;background:#1c1b1f;color:#fff;padding:300px 80px;opacity:0}
#fine h1{font:800 140px/.9 T;text-transform:uppercase}#fine h1 em{font-style:normal;color:#ff6b5e}
#fine p{font:600 48px/1.3 C;color:#e8e4dd;margin-top:40px}#fine .url{font:800 92px T;color:#fff;margin-top:70px}
#fine .leg{font:400 32px/1.3 C;color:#bdb8b0;margin-top:50px}
</style></head><body><svg id="map" viewBox="0 0 ${W} ${H}"><path d="${pathItalia}" fill="#fff" stroke="#1c1b1f" stroke-width="3.5" stroke-linejoin="round"/>${dots}</svg>
<div id="head" style="opacity:0"><p id="giorno"></p><p id="conta"><b>0</b>appuntamenti</p></div>
<div id="chips"></div>
<div id="hook"><h1>Venerdì 30<br>scioperano<br><em>anche gli<br>studenti</em></h1><p>Dove sono gli appuntamenti,<br>ora per ora.</p></div>
<div id="mot"><h2>Cosa<br><em>chiedono</em></h2><ul><li>Più fondi<br>alla scuola</li><li>Stop al caro vita</li><li>Insieme a chi lavora,<br>nello sciopero generale</li></ul><p class="f">Fonte: studenti.it, 20 ottobre 2026</p></div>
<div id="fine"><h1>${E.length} appuntamenti<br><em>in ${NC} comuni.</em></h1><p>Tutti con fonte, tutti sulla mappa.<br>Prima di andare controlla luogo e ora.</p><p class="url">mappadellarivolta.org</p><p style="font-size:40px">Mandalo a chi va a scuola</p><p class="leg">La mappa riporta informazioni pubbliche con la loro fonte.</p></div>
<div class="m"><i></i>Mappa della Rivolta</div><script>
const E=${JSON.stringify(E)},G=${JSON.stringify(STEP)},DUR=${JSON.stringify(DUR)},T0=${T0},FINE=${FINE},MOT=${MOT},NOTE=${JSON.stringify(NOTE)};
const $=(s)=>document.querySelector(s); const cl=(v)=>Math.max(0,Math.min(1,v)); const ease=(v)=>1-Math.pow(1-cl(v),3);
window.render=(t)=>{
  $('#hook').style.opacity = t<T0-0.3?1:cl((T0-t)/0.3);
  let k=-1, s=T0, st=0; for(let i=0;i<G.length;i++){ if(t>=s){k=i; st=s;} s+=DUR[i]; }
  $('#head').style.opacity = k>=0?1:0;
  let n=0;
  E.forEach((e,i)=>{ const g=document.getElementById('e'+i); if(k<0||e.d>k){g.setAttribute('opacity',0);return;}
    n++; if(e.d<k){ g.setAttribute('opacity',.55); g.setAttribute('transform','translate('+e.x+','+e.y+') scale(.75)'); }
    else { const oggi=E.filter(x=>x.d===k); const idx=oggi.indexOf(e); const pass=Math.min(0.1,1.4/oggi.length); const v=ease((t-st-idx*pass)/0.3); const sc=v<1? v*1.25 : 1; g.setAttribute('opacity',v>0?1:0); g.setAttribute('transform','translate('+e.x+','+e.y+') scale('+Math.max(0.001,sc)+')'); }
  });
  if(k>=0){ $('#giorno').innerHTML=G[k][0]+' <span>'+G[k][1]+'</span>'; $('#conta').innerHTML='<b>'+n+'</b>appuntamenti';
    const citta=[...new Set(E.filter(x=>x.d===k).map(x=>x.c))];
    $('#chips').innerHTML=citta.join(' · ')+(NOTE[k]?'<p id="nota">'+NOTE[k]+'</p>':''); } else $('#chips').innerHTML='';
  $('#mot').style.opacity = cl((t-FINE)/0.3); $('#fine').style.opacity = cl((t-FINE-MOT)/0.3);
  document.querySelector('.m').style.color = (t<T0-0.15 || t>FINE+MOT+0.15)?'#fff':'#1c1b1f';
};
</script></body></html>`;
const cover = `<!doctype html><html><head><meta charset="utf-8"><style>${cssBase}</style></head><body><div style="position:absolute;inset:0;background:#f6f3ee"></div>
<svg viewBox="0 0 ${W} ${H}" style="position:absolute;left:190px;top:840px;width:700px;height:${700 * H / W}px"><path d="${pathItalia}" fill="#fff" stroke="#1c1b1f" stroke-width="4" stroke-linejoin="round"/>${E.map((e) => `<circle cx="${e.x}" cy="${e.y}" r="32" fill="${COLS}" opacity=".22"/><circle cx="${e.x}" cy="${e.y}" r="16" fill="${COLS}" stroke="#fff" stroke-width="4"/>`).join('')}</svg>
<div style="position:absolute;left:80px;right:80px;top:300px"><p style="font:700 40px T;letter-spacing:.14em;text-transform:uppercase;color:#c8322a">Venerdì 30 ottobre</p><h1 style="font:800 160px/.88 T;text-transform:uppercase;margin-top:10px">Gli studenti<br><span style="color:#c8322a">in sciopero</span></h1></div>
<div class="m"><i></i>Mappa della Rivolta</div></body></html>`;
fs.mkdirSync('./out', { recursive: true });
const b = await chromium.launch({ executablePath: CHROME });
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
await p.setContent(cover); await p.evaluate(() => document.fonts.ready); await p.screenshot({ path: './out/cover-studenti.png' }); await b.close();
await rendi({ html, durata: TOT, uscita: './out/reel-studenti-muto.mp4', cartella: './out/f-studenti' });
const C = 0.6, inizio = (i) => C + T0 + DUR.slice(0, i).reduce((a, b) => a + b, 0);
const tempi = [0.15, ...DUR.map((_, i) => inizio(i)), C + FINE];
const durTot = C + TOT;
execSync(`python3 suoni.py out/bling-studenti.wav ${durTot.toFixed(2)} "${tempi.map((x) => x.toFixed(2)).join(',')}" ${(C + FINE + MOT).toFixed(2)}`);
execSync(`ffmpeg -v error -y -loop 1 -framerate 30 -t ${C} -i out/cover-studenti.png -i out/reel-studenti-muto.mp4 -i out/bling-studenti.wav -filter_complex "[0:v]format=yuv420p,setsar=1[c];[1:v]format=yuv420p,setsar=1[r];[c][r]concat=n=2:v=1:a=0[v]" -map "[v]" -map 2:a -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac -b:a 160k -shortest -movflags +faststart out/reel-studenti.mp4`);
console.log('durata', durTot.toFixed(2), 'appuntamenti', E.length, 'comuni', NC);
