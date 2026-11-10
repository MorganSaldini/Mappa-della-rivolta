// Reel 1080x1920 "Lo sapevi? Uno sciopero che ha vinto" — le gabbie salariali (19:15 dell'11/11/2026).
// Fatti verificati il 10/11/2026: Wikipedia IT "Gabbie salariali"; Il Sole 24 Ore (scheda 9/8/2009); ADAPT (G. Cazzola); Fanpage (12/11/2023).
//  - 1954: 14 zone salariali, decrescenti da Nord a Sud, scarto fino al 29%; 1961: zone dimezzate (7), scarto max 20%.
//  - 12/2/1969: sciopero generale nazionale CGIL, CISL e UIL contro le gabbie (Wikipedia).
//  - 18/3/1969: accordo Confindustria–CGIL, CISL, UIL per l'abolizione graduale; soppressione completa dal 1/7/1972.
// La mappa a fasce è uno SCHEMA (le zone reali erano per provincia). Uscita: out/reel-gabbie.mp4.
import fs from 'node:fs'; import { execSync } from 'node:child_process'; import { chromium } from 'playwright-core';
import { W, H, pathItalia, xy, cssBase, rendi, CHROME } from './motore.mjs';
// 7 fasce da Nord a Sud (schema), colori dal più scuro (paga più alta) al più chiaro
const LAT = [47.2, 45.6, 44.4, 43.2, 42.0, 40.6, 39.2, 35.4];
const SH = ['#8e1b5e', '#a3305f', '#b84a5f', '#c96a62', '#d78c6c', '#e3ae80', '#eccd9d'];
const fasce = SH.map((c, i) => { const y0 = xy(LAT[i], 12)[1], y1 = xy(LAT[i + 1], 12)[1]; return `<rect class="fa" data-c="${c}" x="-50" y="${y0}" width="${W + 100}" height="${y1 - y0 + 0.5}" fill="${c}"/>`; }).join('');
const mappa = (id) => `<svg id="${id}" viewBox="0 0 ${W} ${H}" style="position:absolute;left:190px;top:790px;width:700px;height:814px;overflow:visible"><defs><clipPath id="cp${id}"><path d="${pathItalia}"/></clipPath></defs><g clip-path="url(#cp${id})">${fasce}</g><path d="${pathItalia}" fill="none" stroke="#1c1b1f" stroke-width="3" stroke-linejoin="round"/></svg>`;
const A = 0, B = 3.0, D = 6.6, E = 9.6, F = 12.6, G = 16.0, TOT = 20.0;
const html = `<!doctype html><html><head><meta charset="utf-8"><style>${cssBase}
.l{position:absolute;inset:0;opacity:0}.k{font:700 40px T;letter-spacing:.14em;text-transform:uppercase;color:#c8322a}
h1,h2{font:800 104px/.9 T;text-transform:uppercase}p.t{font:600 46px/1.3 C;margin-top:30px}
#mapw{position:absolute;inset:0;opacity:0}
#cap{position:absolute;left:80px;right:80px;top:300px}
#leg{position:absolute;left:80px;right:80px;top:1615px;display:flex;justify-content:space-between;font:700 34px T;letter-spacing:.08em;text-transform:uppercase;color:#55525c}
.big{font:800 210px/.86 T;color:#c8322a;text-transform:uppercase}
</style></head><body>
<div class="l" id="a" style="opacity:1;background:#1c1b1f;color:#fff;padding:560px 80px"><p class="k" style="color:#ff8f86">Lo sapevi?</p><h1 style="font-size:150px;margin-top:16px">Stesso lavoro.<br><span style="color:#ff8f86">Paga diversa.</span></h1><p class="t" style="color:#e8e4dd">Fino al 1969 la paga minima di un operaio cambiava a seconda di dove viveva.</p></div>
<div id="mapw">${mappa('mp')}<div id="cap"><p class="k">Le gabbie salariali</p><h2 id="capt" style="margin-top:12px">7 zone.<br>Più scendi,<br>meno prendi.</h2></div><div id="leg"><span>Nord: paga più alta</span><span>Sud: fino al 20% in meno</span></div><p style="position:absolute;left:80px;top:1665px;font:600 28px C;color:#55525c" id="sch">Schema: le zone erano decise per provincia.</p></div>
<div class="l" id="d" style="background:#c8322a;color:#fff;padding:480px 80px"><p class="k" style="color:#ffd5d1">Poi arriva il</p><p class="big" style="color:#fff;margin-top:10px">12 febbraio<br>1969</p><p class="t" style="font-size:56px">Sciopero generale di CGIL, CISL e UIL, insieme, contro le gabbie.</p></div>
<div class="l" id="e" style="background:#f6f3ee;padding:480px 80px"><p class="k">Un mese dopo</p><p class="big" style="margin-top:10px">18 marzo<br>1969</p><p class="t" style="font-size:56px">Accordo con Confindustria: le gabbie si aboliscono, un passo alla volta.</p></div>
<div class="l" id="g" style="background:#1c1b1f;color:#fff;padding:420px 80px"><p class="k" style="color:#ff8f86">Uno sciopero che ha vinto</p><h1 style="font-size:130px;margin-top:14px">Il 20 novembre<br>si sciopera<br>di nuovo.</h1><p class="t" style="color:#e8e4dd">Le piazze, città per città, con la loro fonte.</p><p style="font:800 84px T;margin-top:50px">mappadellarivolta.org</p>
<div style="display:inline-flex;align-items:center;gap:22px;margin-top:40px;background:#fff;color:#1c1b1f;padding:20px 34px;border-radius:60px;font:800 52px T"><span style="background:#c8322a;color:#fff;border-radius:40px;padding:4px 22px;font-size:40px">+ Segui</span>@mappadellarivolta</div>
<p style="font:600 28px/1.4 C;color:#c9c5bf;margin-top:50px">Fonti: Wikipedia, Il Sole 24 Ore, ADAPT. La mappa riporta informazioni pubbliche con la loro fonte.</p></div>
<div class="m"><i></i>Mappa della Rivolta</div><script>
const B=${B},D=${D},E=${E},F=${F},G=${G};const $=(q)=>document.querySelector(q),cl=(v)=>Math.max(0,Math.min(1,v)),ez=(v)=>1-Math.pow(1-cl(v),3);
const hx=(h)=>[1,3,5].map((i)=>parseInt(h.slice(i,i+2),16)),mix=(a,b,k)=>'rgb('+hx(a).map((v,i)=>Math.round(v+(hx(b)[i]-v)*k)).join(',')+')';
const fa=[...document.querySelectorAll('.fa')];
window.render=(t)=>{
 $('#a').style.opacity=1-cl((t-B+0.25)/0.25);
 const inMap=(t>=B-0.3&&t<D)||(t>=F-0.3&&t<G);
 $('#mapw').style.opacity=t<D?cl((t-B+0.3)/0.3)*(1-cl((t-D+0.25)/0.25)):cl((t-F+0.3)/0.3)*(1-cl((t-G+0.25)/0.25));
 const merge=ez((t-F-0.6)/1.6);
 fa.forEach((r,i)=>{ const u=t<D?ez((t-B-0.1-i*0.22)/0.35):1; r.setAttribute('opacity',u); r.setAttribute('fill',t>=F?mix(r.dataset.c,'#c8322a',merge):r.dataset.c); });
 if(t>=F){ $('#capt').innerHTML='1° luglio 1972.<br>Stessa paga minima<br>in tutta Italia.'; $('#cap .k').textContent='Le gabbie spariscono'; $('#leg').style.opacity=1-merge; $('#sch').style.opacity=0; }
 else { $('#capt').innerHTML='7 zone.<br>Più scendi,<br>meno prendi.'; $('#cap .k').textContent='Le gabbie salariali'; $('#leg').style.opacity=cl((t-B-1.8)/0.4); $('#sch').style.opacity=cl((t-B-1.8)/0.4); }
 $('#d').style.opacity=cl((t-D)/0.25)*(1-cl((t-E+0.25)/0.25)); $('#e').style.opacity=cl((t-E)/0.25)*(1-cl((t-F+0.25)/0.25)); $('#g').style.opacity=cl((t-G)/0.3);
 const dark=t<B-0.1||(t>=D&&t<E)||t>=G; $('.m').style.color=dark?'#fff':'#1c1b1f'; $('.m i').style.background=(t>=D&&t<E)?'#fff':'#c8322a';
};
</script></body></html>`;
const cover = `<!doctype html><html><head><meta charset="utf-8"><style>${cssBase}.k{font:700 40px T;letter-spacing:.14em;text-transform:uppercase;color:#c8322a}</style></head><body><div style="position:absolute;inset:0;background:#f6f3ee"></div>
${mappa('cv').replace('top:790px', 'top:760px')}
<div style="position:absolute;left:80px;right:80px;top:300px"><p class="k">Lo sapevi?</p><h1 style="font:800 150px/.88 T;text-transform:uppercase;margin-top:12px">Lo sciopero<br><span style="color:#c8322a">che ha vinto</span></h1></div>
<div class="m"><i></i>Mappa della Rivolta</div></body></html>`;
fs.mkdirSync('./out', { recursive: true });
const b = await chromium.launch({ executablePath: CHROME }); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
await p.setContent(cover); await p.evaluate(() => document.fonts.ready); await p.screenshot({ path: './out/cover-gabbie.png' });
await p.setContent(html); await p.evaluate(() => document.fonts.ready);
for (const t of [1.5, B + 2.5, D + 1.5, E + 1.5, F + 0.3, F + 3, G + 2]) { await p.evaluate((t) => window.render(t), t); await p.screenshot({ path: `./out/gb-${t.toFixed(1)}.png` }); }
await b.close();
if (process.argv[2] === 'solo-foto') process.exit(0);
await rendi({ html, durata: TOT, uscita: './out/reel-gabbie-muto.mp4', cartella: './out/f-gabbie' });
const C = 0.6, tempi = [0.15, C + B, C + D, C + E, C + F];
execSync(`python3 suoni.py out/bling-gabbie.wav ${(C + TOT).toFixed(2)} "${tempi.map((x) => x.toFixed(2)).join(',')}" ${(C + G).toFixed(2)}`);
execSync(`ffmpeg -v error -y -loop 1 -framerate 30 -t ${C} -i out/cover-gabbie.png -i out/reel-gabbie-muto.mp4 -i out/bling-gabbie.wav -filter_complex "[0:v]format=yuv420p,setsar=1[c];[1:v]format=yuv420p,setsar=1[r];[c][r]concat=n=2:v=1:a=0[v]" -map "[v]" -map 2:a -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac -b:a 160k -shortest -movflags +faststart out/reel-gabbie.mp4`);
console.log('durata', (C + TOT).toFixed(2));
