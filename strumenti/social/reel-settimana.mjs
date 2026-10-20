import { COL, W, H, pathItalia, xy, cssBase, rendi } from './motore.mjs';
const E = [
 [0,'sciopero_categoria','Bari',41.117,16.872],[0,'sciopero_categoria','Roma',41.903,12.496],[0,'assemblea','Torino',45.073,7.699],[0,'sciopero_categoria','Udine',46.071,13.235],
 [1,'sciopero_categoria','Taverna',39.023,16.581],[1,'presidio','Torre del Greco',40.786,14.366],[1,'assemblea','Lecce',40.359,18.166],
 [2,'assemblea','Milano',45.474,9.204],
 [3,'corteo','Verona',45.437,10.993],[3,'sciopero_categoria','Bari',41.117,16.872],
 [4,'corteo','Lucca',43.843,10.503],[4,'corteo','Castel Volturno',41.034,13.941],[4,'corteo','Roma',41.903,12.496],[4,'corteo','Torino',45.07,7.686],[4,'sciopero_generale','Milano',45.464,9.191],
 [5,'assemblea','Milano',45.491,9.219],
].map(([d,t,c,la,ln],i)=>{ const [x,y]=xy(la,ln); return {d,c,col:COL[t],x:x+((i*37)%11-5),y:y+((i*53)%11-5)}; });
const GIORNI = [['MAR',20],['MER',21],['GIO',22],['VEN',23],['SAB',24],['DOM',25]];
const DUR = [1.4,1.3,1.1,1.3,2.8,1.3], T0 = 1.9;
const FINE = T0 + DUR.reduce((a,b)=>a+b,0), TOT = FINE + 3.6;
const dots = E.map((e,i)=>`<g id="e${i}" transform="translate(${e.x},${e.y})" opacity="0"><circle r="48" fill="${e.col}" opacity=".2"/><circle r="25" fill="${e.col}" stroke="#f6f3ee" stroke-width="6"/></g>`).join('');
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
<div id="fine"><h1>${E.length} appuntamenti<br><em>in 6 giorni.</em></h1><p>Tutti con fonte, tutti sulla mappa.<br>Trova quelli della tua città.</p><p class="url">mappadellarivolta.org</p><p style="font-size:40px">Salva il video · Mandalo a chi ci va</p></div>
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
    n++; if(e.d<k){ g.setAttribute('opacity',.55); g.setAttribute('transform','translate('+e.x+','+e.y+') scale(.75)'); }
    else { const idx=E.filter(x=>x.d===k).indexOf(e); const v=ease((t-st-idx*0.08)/0.3); const sc=v<1? v*1.25 : 1; g.setAttribute('opacity',v>0?1:0); g.setAttribute('transform','translate('+e.x+','+e.y+') scale('+Math.max(0.001,sc)+')'); }
  });
  if(k>=0){ $('#giorno').innerHTML=G[k][0]+' <span>'+G[k][1]+'</span>'; $('#conta').innerHTML='<b>'+n+'</b>mobilitazioni';
    const citta=[...new Set(E.filter(x=>x.d===k).map(x=>x.c))].join(' · ');
    $('#chips').innerHTML=citta+(k===4?'<p id="nota">Sabato: 5 piazze in 5 città</p>':''); } else $('#chips').innerHTML='';
  $('#fine').style.opacity = cl((t-FINE)/0.3); document.querySelector('.m').style.color = t>FINE+0.15?'#fff':'#1c1b1f';
};
</script></body></html>`;
await rendi({ html, durata: TOT, uscita: './out/reel-settimana.mp4', cartella: './out/f1' });
console.log('durata', TOT, 'eventi', E.length);
