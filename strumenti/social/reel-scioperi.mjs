import { COL, W, H, pathItalia, xy, cssBase, rendi } from './motore.mjs';
const S = [
 { g: 30, m: 'OTT', sig: 'USB · USI-CIT', extra: 'Con gli studenti: Cambiare Rotta, OSA e collettivi in Piemonte', citta: '18 città, da Torino a Pozzallo: Roma · Milano · Firenze · Napoli · Bergamo · Cagliari…', n: 27,
   p: [['sciopero_generale',41.903,12.496],['sciopero_categoria',41.903,12.496],['sciopero_generale',45.072,7.685],['sciopero_generale',45.068,7.695],['sciopero_generale',45.072,7.699],['sciopero_generale',45.07,7.689],['sciopero_generale',45.039,7.674],['sciopero_generale',45.03,7.557],['sciopero_generale',45.067,7.592],['sciopero_generale',45.064,7.658],['sciopero_generale',45.063,7.685],['sciopero_generale',45.328,8.424],['sciopero_generale',45.444,8.625],['sciopero_generale',45.444,8.62],['sciopero_generale',44.923,8.618],['sciopero_generale',45.464,9.191],['sciopero_generale',43.77,11.256],['sciopero_generale',44.796,10.318],['corteo',45.417,11.88],['sciopero_generale',43.684,10.393],['corteo',43.547,10.311],['corteo',40.852,14.268],['sciopero_generale',43.543,10.314],['sciopero_generale',39.219,9.122],['sciopero_generale',43.603,13.507],['sciopero_generale',45.695,9.67],['sciopero_generale',36.723,14.838]] },
 { g: 20, m: 'NOV', sig: 'CGIL', extra: 'Lo stesso giorno: sciopero di treni e trasporto locale (CUB Trasporti, SGB Ferrovie)', citta: 'Roma · Milano · Torino', n: 4,
   p: [['sciopero_generale',41.903,12.496],['sciopero_generale',45.071,7.685],['sciopero_generale',45.464,9.191],['sciopero_categoria',41.92,12.53]] },
 { g: 4, m: 'DIC', sig: 'CUB · SGB · ADL Varese · CIB-Unicobas · SBM', extra: '', citta: 'Nazionale, tutte le categorie pubbliche e private', n: 1,
   p: [['sciopero_generale',41.903,12.496]] },
].map((s) => ({ ...s, p: s.p.map(([t, la, ln], i) => { const [x, y] = xy(la, ln); return { x: x + ((i * 37) % 13 - 6), y: y + ((i * 53) % 13 - 6), c: COL[t] }; }) }));
const T0 = 2.2, D = [5.0, 4.6, 3.6], FINE = T0 + D[0] + D[1] + D[2], TOT = FINE + 3.6;
const dots = S.map((s, k) => s.p.map((e, i) => `<g class="s${k}" id="d${k}_${i}" transform="translate(${e.x},${e.y})" opacity="0"><circle r="50" fill="${e.c}" opacity=".2"/><circle r="26" fill="${e.c}" stroke="#f6f3ee" stroke-width="6"/></g>`).join('')).join('');
const html = `<!doctype html><html><head><meta charset="utf-8"><style>${cssBase}
#hook{position:absolute;inset:0;background:#8e1b5e;color:#fff;padding:420px 80px 0}#hook h1{font:800 150px/.9 T;text-transform:uppercase}#hook p{font:600 52px/1.25 C;margin-top:40px}
#map{position:absolute;left:400px;top:690px;width:${W * 0.68}px;height:${H * 0.68}px}
#head{position:absolute;left:80px;top:250px;right:120px}
#data{display:flex;align-items:baseline;gap:22px}#data b{font:800 230px/.8 T}#data span{font:800 96px T;color:#c8322a}
#tipo{font:700 40px T;letter-spacing:.12em;text-transform:uppercase;color:#8e1b5e;margin-top:14px}
#sig{font:700 50px/1.15 C;margin-top:8px;max-width:820px}
#lato{position:absolute;left:80px;top:720px;width:290px;font:600 34px/1.3 C;color:#5f5d66}
#lato b{display:block;font:800 120px/.9 T;color:#1c1b1f}
#extra{position:absolute;left:80px;right:140px;top:1510px;font:600 34px/1.3 C;color:#2a5db0}
#citta{position:absolute;left:80px;right:140px;top:1410px;font:700 36px/1.3 C}
#fine{position:absolute;inset:0;background:#1c1b1f;color:#fff;padding:300px 80px;opacity:0}
#fine h1{font:800 128px/.9 T;text-transform:uppercase}#fine h1 em{font-style:normal;color:#c8322a}
#fine .r{display:flex;gap:30px;margin-top:50px;font:800 76px T}#fine .r span{background:#c8322a;padding:6px 22px;border-radius:12px}
#fine p{font:600 44px/1.3 C;color:#e8e4dd;margin-top:50px}#fine .url{font:800 88px T;color:#fff;margin-top:60px}
.m{color:#fff}
</style></head><body>
<div id="scena"><div id="head"><p id="data"><b></b><span></span></p><p id="tipo">Sciopero generale</p><p id="sig"></p></div>
<p id="lato"></p>
<svg id="map" viewBox="0 0 ${W} ${H}"><path d="${pathItalia}" fill="#fff" stroke="#1c1b1f" stroke-width="4" stroke-linejoin="round"/>${dots}</svg>
<p id="citta"></p><p id="extra"></p></div>
<div id="hook"><h1>3 scioperi<br>generali in<br>5 settimane.</h1><p>Sigle diverse, date diverse.<br>Segnatele tutte.</p></div>
<div id="fine"><h1>Le date<br><em>da segnare</em></h1><div class="r"><span>30 OTT</span><span>20 NOV</span><span>4 DIC</span></div>
<p>Cortei, presidi e iniziative della tua città<br>li trovi sulla mappa. Manca il tuo? Aggiungilo.</p><p class="url">mappadellarivolta.org</p><p style="font-size:38px;margin-top:20px">Salva il video · Mandalo ai colleghi</p></div>
<div class="m"><i></i>Mappa della Rivolta</div>
<script>
const S=${JSON.stringify(S)},T0=${T0},D=${JSON.stringify(D)},FINE=${FINE};
const $=(s)=>document.querySelector(s), cl=(v)=>Math.max(0,Math.min(1,v)), ease=(v)=>1-Math.pow(1-cl(v),3);
window.render=(t)=>{
  $('#hook').style.opacity = t<T0-0.2?1:cl((T0-t)/0.2);
  let k=-1, st=T0, s=T0; for(let i=0;i<3;i++){ if(t>=s){k=i;st=s;} s+=D[i]; }
  if(k>=0){ const q=S[k]; $('#data b').textContent=q.g; $('#data span').textContent=q.m; $('#sig').textContent=q.sig;
    $('#lato').innerHTML=(q.n>1?'<b>'+q.n+'</b>iniziative con fonte già sulla mappa':'<b>1</b>sciopero nazionale, in tutta Italia');
    $('#citta').textContent=q.citta; $('#extra').textContent=q.extra;
    const v=ease((t-st)/0.35); $('#scena').style.opacity=v; $('#scena').style.transform='translateY('+(30*(1-v))+'px)'; }
  document.querySelectorAll('[id^=d]').forEach(g=>{ if(g.tagName!=='g')return; const [kk,ii]=g.id.slice(1).split('_').map(Number);
    if(kk!==k){g.setAttribute('opacity',0);return;} const v=ease((t-st-0.25-ii*(kk===0?0.05:0.09))/0.3); const sc=v<1?v*1.2:1;
    const tr=g.getAttribute('transform').replace(/ scale\\(.*\\)/,''); g.setAttribute('transform',tr+' scale('+Math.max(.001,sc)+')'); g.setAttribute('opacity',v>0?1:0); });
  $('#fine').style.opacity=cl((t-FINE)/0.3);
  $('.m').style.color = (t<T0||t>FINE+0.15)?'#fff':'#1c1b1f';
};
</script></body></html>`;
await rendi({ html, durata: TOT, uscita: './out/reel-scioperi.mp4', cartella: './out/f3' });
console.log('durata', TOT);
