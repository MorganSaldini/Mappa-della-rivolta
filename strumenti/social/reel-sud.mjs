import fs from 'node:fs'; import { W, H, pathItalia, xy, cssBase, rendi } from './motore.mjs';
const L = [['Foggia',41.44,15.63],['Candela',41.15,15.527],['San Nicola di Melfi',41.072,15.686],['Bitonto',41.141,16.689],['Scanzano Jonico',40.264,16.707],['Tarsia',39.641,16.264],['Francica',38.624,16.157],['Locri',38.234,16.246]]
 .map(([c,la,ln])=>{const [x,y]=xy(la,ln);return {c,x,y};});
const [ax, ay] = xy(42.0, 14.6), [bx, by] = xy(37.9, 18.6);
const h = (by - ay) * 1.12, w = h * W / H, cx = (ax + bx) / 2, cy = (ay + by) / 2;
const Z = [cx - w / 2, cy - h / 2, w, h];
const TD = [7.4, 0.36]; const tempi = L.map((_, i) => +(TD[0] + i * TD[1] + 0.05).toFixed(3));
fs.writeFileSync('./out/tempi-sud.txt', tempi.join(','));
const OFF={1:[-12,4,'end'],2:[4,22,'start']};
const dots = L.map((e,i)=>{const [dx,dy,an]=OFF[i]||[12,4,'start'];return `<g id="p${i}" opacity="0"><circle cx="${e.x}" cy="${e.y}" r="16" fill="#d96c00" opacity=".25"/><circle cx="${e.x}" cy="${e.y}" r="8" fill="#d96c00" stroke="#f6f3ee" stroke-width="2.4"/><text x="${e.x+dx}" y="${e.y+dy}" text-anchor="${an}" style="font:700 11px C;fill:#1c1b1f;paint-order:stroke;stroke:#f6f3ee;stroke-width:3px">${e.c}</text></g>`;}).join('');
const html = `<!doctype html><html><head><meta charset="utf-8"><style>${cssBase}
.sc{position:absolute;inset:0;opacity:0}.dk{background:#1c1b1f;color:#fff}.rd{background:#c8322a;color:#fff}
h1{font:800 140px/.92 T;text-transform:uppercase}h1 em{font-style:normal;color:#c8322a}
.big{font:800 108px/.95 T;text-transform:uppercase}
.p{font:600 48px/1.3 C}.f{font:400 30px C;opacity:.75}
#map{position:absolute;left:110px;top:640px;width:${W}px;height:${H*0.95}px;overflow:hidden}
</style></head><body>
<div id="A" class="sc dk" style="padding:430px 80px"><h1>Al Sud,<br>chi lavora<br><em>non ce la fa più.</em></h1></div>
<div id="B" class="sc" style="padding:420px 80px"><p id="b1" class="big">Il gasolio costa<br>sempre di più.</p><p id="b2" class="big" style="color:#c8322a;margin-top:60px">L'olio si paga<br>sempre meno.</p><p class="f" style="margin-top:60px;color:#5f5d66">Fonte: Il Post, 15 ottobre</p></div>
<div id="C" class="sc"><div style="position:absolute;left:80px;right:120px;top:250px"><p class="big" style="font-size:92px">Agricoltori e<br>autotrasportatori<br><span style="color:#d96c00">in protesta</span></p><p class="p" style="margin-top:14px;color:#5f5d66">Puglia · Basilicata · Calabria</p></div>
<svg id="map" viewBox="0 0 ${W} ${H}"><path d="${pathItalia}" fill="#fff" stroke="#1c1b1f" stroke-width="2.5" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>${dots}</svg></div>
<div id="D" class="sc rd" style="padding:400px 80px"><p class="big" style="font-size:118px">Siamo vicini<br>a chi chiede<br>di vivere del<br>proprio lavoro.</p><p class="p" style="margin-top:60px">Il 27 ottobre il Ministero dei Trasporti incontra le categorie.</p></div>
<div id="E" class="sc dk" style="padding:330px 80px"><p style="font:700 36px T;letter-spacing:.12em;text-transform:uppercase;color:#ffb15c">Se devi spostarti</p><p class="big" style="margin-top:20px">Possibili disagi sulle strade del Sud.</p><p class="p" style="margin-top:40px;color:#e8e4dd">Code, rallentamenti, distributori senza carburante. Informati prima di partire.</p><p style="font:800 88px T;margin-top:70px">mappadellarivolta.org</p><p class="f" style="margin-top:20px">Fonti: Il Post, InformaCalabria</p></div>
<div class="m"><i></i>Mappa della Rivolta</div>
<script>
const Z=${JSON.stringify(Z)}, W=${W}, H=${H}, N=${L.length}, TD=${JSON.stringify(TD)};
const S=[['A',0,2.6],['B',2.6,6.4],['C',6.4,11.6],['D',11.6,15.2],['E',15.2,19.4]];
const $=(s)=>document.querySelector(s), cl=(v)=>Math.max(0,Math.min(1,v)), ease=(v)=>1-Math.pow(1-cl(v),3);
window.render=(t)=>{
  for(const [id,a,b] of S){ const o=cl((t-a)/0.25)*cl((b-t)/0.2+ (id==='E'?9:0)); $('#'+id).style.opacity=o; }
  $('#b1').style.opacity=cl((t-2.8)/0.3); $('#b2').style.opacity=cl((t-4.0)/0.3);
  const z=ease((t-6.5)/0.9); const vb=[Z[0]*z,Z[1]*z,W+(Z[2]-W)*z,H+(Z[3]-H)*z]; $('#map').setAttribute('viewBox',vb.join(' '));
  for(let i=0;i<N;i++){ const v=ease((t-TD[0]-i*TD[1])/0.25); const g=document.getElementById('p'+i); g.setAttribute('opacity',v); }
  const dark=(t<2.6)||(t>=11.6); $('.m').style.color=dark?'#fff':'#1c1b1f'; $('.m i').style.background=(t>=11.6&&t<15.2)?'#fff':'#c8322a';
};
</script></body></html>`;
await rendi({ html, durata: 19.4, uscita: './out/reel-sud-muto.mp4', cartella: './out/fs' });
