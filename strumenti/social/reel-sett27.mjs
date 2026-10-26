import { COL, W, H, pathItalia, xy, cssBase, rendi } from './motore.mjs';
import fs from 'node:fs'; import { execSync } from 'node:child_process'; import { chromium } from 'playwright-core';
const E = JSON.parse(fs.readFileSync('sett27.json')).map(([d,t,c,la,ln,n],i)=>{ const [x,y]=xy(la,ln); return {d,c,n,col:COL[t],x,y}; });
const TOTN = E.reduce((a,e)=>a+e.n,0);
const GIORNI = [['MAR',27],['MER',28],['GIO',29],['VEN',30],['SAB',31],['DOM','1/11']];
const DUR = [1.4,1.3,1.0,4.2,1.0,1.1], T0 = 1.9;
const FINE = T0 + DUR.reduce((a,b)=>a+b,0), TOT = FINE + 3.6;
const dots = E.map((e,i)=>`<g id="e${i}" transform="translate(${e.x},${e.y})" opacity="0"><circle r="${30+Math.sqrt(e.n)*10}" fill="${e.col}" opacity=".2"/><circle r="${16+Math.sqrt(e.n)*6}" fill="${e.col}" stroke="#f6f3ee" stroke-width="6"/></g>`).join('');
const html = `<!doctype html><html><head><meta charset="utf-8"><style>${cssBase}
#map{position:absolute;left:110px;top:430px;width:${W}px;height:${H}px}
#hook{position:absolute;left:80px;right:120px;top:300px}#hook h1{font:800 132px/.9 T;text-transform:uppercase}#hook h1 em{font-style:normal;color:#c8322a}
#head{position:absolute;left:80px;right:120px;top:250px;display:flex;justify-content:space-between;align-items:flex-end}
#giorno{font:800 150px/.85 T;text-transform:uppercase}#giorno span{color:#c8322a}
#conta{text-align:right;font:600 34px/1.1 C;color:#5f5d66}#conta b{display:block;font:800 104px/.9 T;color:#1c1b1f}
#chips{position:absolute;left:80px;right:140px;top:1460px;font:700 40px/1.25 C}
#nota{margin-top:10px;font:600 34px C;color:#c8322a}
#fine{position:absolute;inset:0;background:#1c1b1f;color:#fff;padding:300px 80px;opacity:0}
#fine h1{font:800 140px/.9 T;text-transform:uppercase}#fine h1 em{font-style:normal;color:#c8322a}
#fine p{font:600 48px/1.3 C;color:#e8e4dd;margin-top:40px}#fine .url{font:800 92px T;color:#fff;margin-top:80px}
</style></head><body><svg id="map" viewBox="0 0 ${W} ${H}"><path d="${pathItalia}" fill="#fff" stroke="#1c1b1f" stroke-width="3.5" stroke-linejoin="round"/>${dots}</svg>
<div id="hook"><h1>Dove si scende<br>in piazza<br><em>questa settimana?</em></h1></div>
<div id="head" style="opacity:0"><p id="giorno"></p><p id="conta"><b>0</b>mobilitazioni</p></div>
<div id="chips"></div>
<div id="fine"><h1>${TOTN} appuntamenti<br><em>in 6 giorni.</em></h1><p>Tutti con fonte, tutti sulla mappa.<br>Trova quelli della tua città.</p><p class="url">mappadellarivolta.org</p><p style="font-size:40px">Salva il video · Mandalo a chi ci va</p><p style="font-size:32px;color:#c9c5bf;margin-top:50px">La mappa riporta informazioni pubbliche con la loro fonte.</p></div>
<div class="m"><i></i>Mappa della Rivolta</div><script>
const E=${JSON.stringify(E)},G=${JSON.stringify(GIORNI)},DUR=${JSON.stringify(DUR)},T0=${T0},FINE=${FINE};
const $=(s)=>document.querySelector(s); const cl=(v)=>Math.max(0,Math.min(1,v)); const ease=(v)=>1-Math.pow(1-cl(v),3);
window.render=(t)=>{
  $('#hook').style.opacity = t<T0-0.25?1:cl((T0-t)/0.25);
  $('#map').style.opacity = t<T0? 0.35+0.65*cl((t-(T0-0.4))/0.4) : 1;
  let k=-1, s=T0; for(let i=0;i<G.length;i++){ if(t>=s) {k=i; var st=s;} s+=DUR[i]; }
  $('#head').style.opacity = k>=0?1:0;
  let n=0;
  E.forEach((e,i)=>{ const g=document.getElementById('e'+i); if(k<0||e.d>k){g.setAttribute('opacity',0);return;}
    n+=e.n; if(e.d<k){ g.setAttribute('opacity',.55); g.setAttribute('transform','translate('+e.x+','+e.y+') scale(.75)'); }
    else { const L=E.filter(x=>x.d===k); const idx=L.indexOf(e); const v=ease((t-st-idx*Math.min(0.08,2.6/L.length))/0.3); const sc=v<1? v*1.25 : 1; g.setAttribute('opacity',v>0?1:0); g.setAttribute('transform','translate('+e.x+','+e.y+') scale('+Math.max(0.001,sc)+')'); }
  });
  if(k>=0){ $('#giorno').innerHTML=G[k][0]+' <span>'+G[k][1]+'</span>'; $('#conta').innerHTML='<b>'+n+'</b>mobilitazioni';
    const cc=[...new Set(E.filter(x=>x.d===k).map(x=>x.c))]; const citta=cc.length>12? cc.slice(0,12).join(' · ')+' e altre '+(cc.length-12): cc.join(' · ');
    $('#chips').innerHTML=citta+(k===3?'<p id="nota">Sciopero generale · '+cc.length+' città</p>':''); } else $('#chips').innerHTML='';
  $('#fine').style.opacity = cl((t-FINE)/0.3); document.querySelector('.m').style.color = t>FINE+0.15?'#fff':'#1c1b1f';
};
</script></body></html>`;
const cover = `<!doctype html><html><head><meta charset="utf-8"><style>${cssBase}</style></head><body style="background:#f6f3ee"><div class="m"><i></i>Mappa della Rivolta</div>
<div style="position:absolute;left:80px;right:80px;top:300px"><p style="font:700 40px T;letter-spacing:.14em;text-transform:uppercase;color:#c8322a">27 ottobre – 1 novembre</p><h1 style="font:800 176px/.86 T;text-transform:uppercase;margin-top:12px">La settimana<br><span style="color:#8e1b5e">in piazza</span></h1>
<p style="font:600 50px/1.3 C;margin-top:40px">${TOTN} appuntamenti con fonte.<br>Venerdì 30 sciopero generale.</p></div>
<svg viewBox="0 0 ${W} ${H}" style="position:absolute;left:300px;top:1060px;width:${W*0.72}px;opacity:.95"><path d="${pathItalia}" fill="#fff" stroke="#1c1b1f" stroke-width="4"/>${E.filter(e=>e.d===3).map(e=>`<circle cx="${e.x}" cy="${e.y}" r="${14+Math.sqrt(e.n)*6}" fill="#8e1b5e" stroke="#f6f3ee" stroke-width="5"/>`).join('')}</svg></body></html>`;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const pg = await b.newPage({ viewport: { width: 1080, height: 1920 } }); await pg.setContent(cover); await pg.evaluate(() => document.fonts.ready); await pg.screenshot({ path: './out/cover-sett27.png' }); await b.close();
await rendi({ html, durata: TOT, uscita: './out/reel-sett27-muto.mp4', cartella: './out/f-sett27' });
const C = 0.6; let acc = C + T0; const tempi = [0.15]; DUR.forEach((d) => { tempi.push(acc + 0.05); acc += d; });
execSync(`python3 suoni.py out/bling-sett27.wav ${(C + TOT).toFixed(2)} "${tempi.map((x) => x.toFixed(2)).join(',')}" ${(C + FINE).toFixed(2)}`);
execSync(`ffmpeg -v error -y -loop 1 -framerate 30 -t ${C} -i out/cover-sett27.png -i out/reel-sett27-muto.mp4 -i out/bling-sett27.wav -filter_complex "[0:v]format=yuv420p,setsar=1[c];[1:v]format=yuv420p,setsar=1[r];[c][r]concat=n=2:v=1:a=0[v]" -map "[v]" -map 2:a -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac -b:a 160k -shortest -movflags +faststart out/reel-sett27.mp4`);
console.log('durata', (TOT+0.6).toFixed(1), 'appuntamenti', TOTN, 'punti', E.length);
