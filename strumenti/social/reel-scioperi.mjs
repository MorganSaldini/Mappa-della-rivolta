import { COL, W, H, pathItalia, xy, cssBase, rendi } from './motore.mjs';
const S = [
 { g: 30, m: 'OTT', tipo: 'Sciopero generale', sig: 'USB · USI-CIT', extra: 'Con gli studenti: Cambiare Rotta, OSA e collettivi', citta: '27 città, da Bolzano a Pozzallo: Roma · Torino · Napoli · Bologna · Palermo · Cagliari…', n: 39,
   p: [['sciopero_generale',41.9028,12.4964],['sciopero_categoria',41.9028,12.4964],['sciopero_generale',45.07159,7.68468],['sciopero_generale',41.12505,16.85987],['sciopero_generale',45.06835,7.69497],['sciopero_generale',45.07162,7.6993],['sciopero_generale',45.06964,7.68908],['sciopero_generale',45.03947,7.67441],['sciopero_generale',45.02969,7.55734],['sciopero_generale',45.06718,7.5919],['sciopero_generale',45.0637,7.65753],['sciopero_generale',45.06291,7.68473],['sciopero_generale',45.32761,8.42441],['sciopero_generale',45.44419,8.62542],['sciopero_generale',45.44401,8.61979],['sciopero_generale',44.92297,8.61782],['sciopero_generale',44.4158,8.92041],['sciopero_generale',40.72525,8.56426],['presidio',42.79024,10.34022],['sciopero_generale',44.79601,10.31803],['corteo',45.4169,11.88038],['sciopero_generale',45.4169,11.88038],['corteo',44.49651,11.35255],['sciopero_generale',38.12466,13.35571],['sciopero_generale',43.6839,10.3927],['corteo',43.54732,10.31137],['corteo',40.85218,14.26769],['sciopero_generale',43.54258,10.31362],['corteo',44.4178,12.19955],['sciopero_generale',37.50118,15.08769],['sciopero_generale',39.21915,9.12159],['sciopero_generale',44.49366,11.34305],['sciopero_generale',44.23837,9.69123],['sciopero_generale',43.7698,11.25564],['sciopero_generale',45.64944,13.76779],['sciopero_generale',43.60296,13.50702],['corteo',46.49814,11.35477],['sciopero_generale',45.69525,9.67037],['sciopero_generale',36.72302,14.83792]] },
 { g: 20, m: 'NOV', tipo: 'Sciopero generale', sig: 'CGIL', extra: 'Lo stesso giorno: sciopero di treni e trasporto locale (CUB Trasporti, SGB Ferrovie)', citta: 'Roma · Milano · Torino · Firenze · Bologna · Pisa', n: 7,
   p: [['sciopero_generale',41.9028,12.4964],['sciopero_generale',45.07111,7.68518],['sciopero_generale',45.46391,9.19064],['sciopero_generale',43.76967,11.25472],['sciopero_generale',44.49382,11.34263],['sciopero_generale',43.47147,10.67979],['sciopero_categoria',41.9028,12.4964]] },
 { g: 4, m: 'DIC', tipo: 'Sciopero generale', sig: 'CUB · SGB · ADL Varese · CIB-Unicobas · SBM e altre sigle di base', extra: '', citta: 'Nazionale, tutte le categorie pubbliche e private', n: 1,
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
  if(k>=0){ const q=S[k]; $('#data b').textContent=q.g; $('#data span').textContent=q.m; $('#sig').textContent=q.sig; $('#tipo').textContent=q.tipo;
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
