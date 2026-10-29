import fs from 'node:fs'; import { execSync } from 'node:child_process'; import { chromium } from 'playwright-core';
import { W, H, pathItalia, xy, cssBase, rendi } from './motore.mjs';
const raw = JSON.parse(fs.readFileSync('m2.json'));
const TOTN = raw.reduce((a, e) => a + e[5], 0), NC = raw.length;
const E = raw.map(([d, t, c, la, ln, n]) => { const [x, y] = xy(la, ln); return { d, c, n, x, y }; });
const box = (la1, ln1, la2, ln2) => { const [x1, y1] = xy(la1, ln1), [x2, y2] = xy(la2, ln2); return [x1, y1, x2 - x1, y2 - y1]; };
const Z = [
 ['Nord-Ovest', box(46.6, 6.5, 43.6, 10.9), [['Aosta', '9:00', 'Piazza Manzetti'], ['Milano', '10:00', "Piazza Duca d'Aosta"], ['Torino', '9:30', 'P.za Palazzo di Città'], ['Genova', '9:30', 'Varco Albertazzi']]],
 ['Nord-Est', box(47.1, 9.9, 43.8, 14.0), [['Trento', '8:30', 'Piazza Fiera'], ['Venezia-Mestre', '9:00', 'Piazzale Cialdini'], ['Trieste', '9:00', 'Varco 4, Porto'], ['Bologna', '9:30', 'Piazza Maggiore']]],
 ['Centro', box(44.2, 9.8, 41.2, 14.9), [['Firenze', '10:00', 'P.za Bambini di Beslan'], ['Ancona', '10:30', 'Piazza Ugo Bassi'], ['Perugia', '9:00', 'Piazza Partigiani'], ['Pescara', '10:00', 'manifestazione regionale'], ['Roma', '10:30', 'Piazza dei Cinquecento']]],
 ['Sud', box(41.9, 13.6, 37.8, 18.7), [['Napoli', '9:00', 'Piazza Garibaldi'], ['Bari', '9:30', 'Piazza Libertà', -40], ['Potenza', '9:30', 'Piazza Don Bosco', 70], ['Cosenza', '9:00', 'Piazza Loreto']]],
 ['Isole', box(41.4, 7.9, 36.5, 15.8), [['Cagliari', '9:30', 'Piazza Garibaldi'], ['Palermo', '8:30', 'Politeama']]],
];
const LUOGHI = { Aosta: [45.7346, 7.3224], Milano: [45.4847, 9.2035], Torino: [45.0733, 7.6813], Genova: [44.412, 8.919], Trento: [46.0651, 11.124], 'Venezia-Mestre': [45.4936, 12.2461], Trieste: [45.6494, 13.7678], Bologna: [44.4937, 11.343], Firenze: [43.779, 11.247], Ancona: [43.603, 13.507], Perugia: [43.1055, 12.3877], Pescara: [42.4646, 14.2145], Roma: [41.9013, 12.5005], Napoli: [40.8522, 14.2677], Bari: [41.125, 16.8599], Potenza: [40.9664, 15.8251], Cosenza: [39.3051, 16.2504], Palermo: [38.1247, 13.3557], Cagliari: [39.2192, 9.1216] };
const CITTA = Z.map((z, i) => E.filter((e) => e.d === i).sort((a, b) => b.n - a.n).slice(0, 5).map((e) => e.c));
const FULL = [0, 0, W, H];
const ED = []; { const inT = new Set([0]); while (inT.size < E.length) { let best = null; for (const a of inT) for (let b = 0; b < E.length; b++) { if (inT.has(b)) continue; const d = Math.hypot(E[a].x - E[b].x, E[a].y - E[b].y); if (!best || d < best[2]) best = [a, b, d]; } inT.add(best[1]); ED.push([best[0], best[1], Math.max(E[best[0]].d, E[best[1]].d)]); } }
// qualche collegamento in più per l'effetto rete
for (let a = 0; a < E.length; a++) { const v = E.map((e, b) => [b, Math.hypot(E[a].x - e.x, E[a].y - e.y)]).filter(([b]) => b !== a).sort((p, q) => p[1] - q[1]).slice(0, 2); for (const [b, d] of v) if (d < 60 && !ED.some(([p, q]) => (p === a && q === b) || (p === b && q === a))) ED.push([a, b, Math.max(E[a].d, E[b].d)]); }
const TQ = 1.3, T1 = 2.9, DZ = 1.6, T2 = T1 + DZ * Z.length, TR = 2.2, T2R = T2 + TR, TP = 1.9, T3 = T2R + TP * 3, T4 = T3 + 2.3, TOT = T4 + 3.2;
const html = `<!doctype html><html><head><meta charset="utf-8"><style>${cssBase}
body{background:#f6f3ee}#map{position:absolute;left:60px;top:400px;width:960px;height:1110px}
#meno{position:absolute;left:0;right:0;top:420px;letter-spacing:-.01em;text-align:center;font:800 640px/.8 T;color:#8e1b5e}
#sotto{position:absolute;left:80px;right:80px;top:1010px;text-align:center;font:800 96px/.95 T;text-transform:uppercase}
#head{position:absolute;left:80px;right:80px;top:250px;display:flex;justify-content:space-between;align-items:flex-end}
#zona{font:800 120px/.85 T;text-transform:uppercase;color:#8e1b5e}#conta{text-align:right;font:600 32px/1.1 C;color:#5f5d66}#conta b{display:block;font:800 100px/.9 T;color:#1c1b1f}
#citta{position:absolute;left:80px;right:80px;top:1520px;font:800 50px/1.2 T;text-transform:uppercase;text-align:center}
.lb{position:absolute;white-space:nowrap}.lb b{display:block;font:800 40px/1 T;text-transform:uppercase;color:#1c1b1f;background:#f6f3eecc;padding:2px 8px}.lb span{display:block;font:600 25px/1.2 C;color:#5f5d66;background:#f6f3eecc;padding:0 8px}.lb i{position:absolute;width:20px;height:20px;border-radius:50%;background:#1c1b1f;border:4px solid #fff}
#storia{position:absolute;inset:0;background:#f6f3ee;opacity:0}#storia .pc{position:absolute;inset:0;padding:330px 80px;opacity:0}#storia .kk{font:700 40px T;letter-spacing:.14em;text-transform:uppercase;color:#8e1b5e}#storia .a{font:800 300px/.85 T;color:#8e1b5e;margin-top:20px}#storia p{font:600 50px/1.3 C;margin-top:40px}#storia .f{font:600 30px C;color:#5f5d66;margin-top:50px}
#fine{position:absolute;inset:0;background:#1c1b1f;color:#fff;padding:280px 80px;opacity:0}#fine h1{font:800 150px/.88 T;text-transform:uppercase}#fine h1 em{font-style:normal;color:#ff8fb8}
#fine .seg{font:800 64px/1.1 T;margin-top:60px}#fine .seg span{color:#ff8fb8}#fine p{font:600 40px/1.3 C;color:#e8e4dd;margin-top:30px}#fine .url{font:800 80px T;color:#fff;margin-top:50px}#fine .nota{font:600 30px C;color:#c9c5bf;margin-top:40px}
</style></head><body>
<svg id="map" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet"><path d="${pathItalia}" fill="#fff" stroke="#1c1b1f" stroke-width="3" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
<g id="rete">${ED.map(([a, b, z], i) => `<line id="l${i}" x1="${E[a].x.toFixed(1)}" y1="${E[a].y.toFixed(1)}" x2="${E[b].x.toFixed(1)}" y2="${E[b].y.toFixed(1)}" stroke="#8e1b5e" stroke-width="3" stroke-linecap="round" vector-effect="non-scaling-stroke" opacity="0"/>`).join('')}</g><path id="scia" style="display:none" d="${Z.map((z,i)=>(i?"L":"M")+(z[1][0]+z[1][2]/2).toFixed(1)+" "+(z[1][1]+z[1][3]/2).toFixed(1)).join(" ")}" fill="none" stroke="#8e1b5e" stroke-width="6" stroke-linecap="round" opacity="0"/>
${E.map((e, i) => `<g id="e${i}" opacity="0"><circle cx="${e.x}" cy="${e.y}" r="${(9 + Math.sqrt(e.n) * 5)}" fill="#8e1b5e" opacity=".22" class="h"/><circle cx="${e.x}" cy="${e.y}" r="${(5 + Math.sqrt(e.n) * 3)}" fill="#8e1b5e" stroke="#f6f3ee" stroke-width="2" class="d"/></g>`).join('')}
</svg><div id="sfuma" style="position:absolute;left:60px;top:400px;width:960px;height:1110px;pointer-events:none;box-shadow:inset 0 0 60px 50px #f6f3ee"></div><div id="labs" style="position:absolute;inset:0;pointer-events:none"></div>
<div id="dom" style="position:absolute;left:80px;right:80px;top:560px;text-align:center;font:800 140px/.95 T;text-transform:uppercase">Domani<br>si sciopera in<br><span style="color:#8e1b5e">${NC} città.</span><br><span style="font-size:110px">La tua c'è?</span></div><div id="meno" style="font-size:330px;top:560px">DOMANI</div><div id="sotto">sciopero generale<br><span style="color:#8e1b5e" id="n106"></span></div>
<div id="head" style="opacity:0"><p id="zona"></p><p id="conta"><b>0</b>piazze</p></div><div id="citta"></div>
<div id="retet" style="position:absolute;left:80px;right:80px;top:1530px;text-align:center;opacity:0"><p style="font:800 104px/.95 T;text-transform:uppercase">Una sola <span style="color:#8e1b5e">rete.</span></p><p style="font:600 44px/1.3 C;margin-top:14px">${TOTN} piazze, ${NC} città, un solo giorno.</p></div><div id="storia">${[
 ['Perché esserci · 1', '4,2%', "l'inflazione a settembre. L'energia costa il <b>22,6%</b> in più di un anno fa.", 'Fonte: Istat (Money.it)'],
 ['Perché esserci · 2', '−8%', "gli stipendi reali rispetto a gennaio 2021. <b>Stipendi fermi, potere d'acquisto giù:</b> nel 2026 i contratti crescono del 2,5%, i prezzi del 3%.", 'Fonte: Istat (Il Fatto Quotidiano, 29/1 e 12/10/2026)'],
 ['Perché esserci · 3', '1969', "Gli scioperi dell'autunno caldo portarono allo <b>Statuto dei lavoratori</b>. Diritti che usiamo ancora oggi. <b>Esserci conta.</b>", 'Fonte: Il Post'],
].map(([k, n, t, f], i) => `<div class="pc" id="pc${i}"><p class="kk">${k}</p><p class="a">${n}</p><p>${t}</p><p class="f">${f}</p></div>`).join('')}</div>
<div id="sicuri" style="position:absolute;inset:0;background:#8e1b5e;color:#fff;padding:300px 80px;opacity:0"><p style="font:800 130px/.9 T;text-transform:uppercase">Domani in piazza.<br><span style="color:#ffd0e2">Insieme.</span></p>
<p style="font:600 44px/1.3 C;margin-top:40px">In pace, con chi ti sta vicino. Segui il percorso e gli organizzatori.</p>
<p style="font:800 64px/1.15 T;margin-top:50px">🚑 Emergenze: 112</p><p style="font:800 52px/1.15 T;margin-top:20px">⚖️ Assistenza legale<br>HubForDefenders<br>+39 353 495 3606</p></div>
<div id="fine"><h1 style="font-size:132px">Manda questo<br>video a chi<br><em>viene con te.</em></h1><p class="seg" style="font-size:64px;margin-top:40px">Segui <span>@mappadellarivolta</span></p><p style="font:600 40px C;color:#e8e4dd;margin-top:16px">per le piazze di domani, in diretta. <span style="font-size:60px;color:#ff8fb8">↙</span></p>
<p>${TOTN} iniziative in ${NC} comuni. Trasporti: dopo l'ordinanza, FS, Trenord, ATAC e ATM annunciano servizio regolare. Controlla gli avvisi prima di partire.</p><p class="url">mappadellarivolta.org</p><p class="nota">La mappa riporta informazioni pubbliche con la loro fonte.</p></div>
<div class="m"><i></i>Mappa della Rivolta</div><script>
const E=${JSON.stringify(E)},Z=${JSON.stringify(Z)},C=${JSON.stringify(CITTA)},L=${JSON.stringify(Object.fromEntries(Object.entries(LUOGHI).map(([k, [la, ln]]) => [k, xy(la, ln)])))},FULL=${JSON.stringify(FULL)};
const ED=${JSON.stringify(ED.map((e) => e[2]))},TR=${TR},T2R=${T2R},TQ=${TQ},T1=${T1},DZ=${DZ},T2=${T2},TP=${TP},T3=${T3},T4=${T4},TOTN=${TOTN};
const $=(q)=>document.querySelector(q),cl=(v)=>Math.max(0,Math.min(1,v)),ease=(v)=>{v=cl(v);return v<.5?4*v*v*v:1-Math.pow(-2*v+2,3)/2};
const mix=(a,b,u)=>a.map((v,i)=>v+(b[i]-v)*u);
window.render=(t)=>{
 $('#dom').style.opacity=t<TQ?1-cl((t-(TQ-0.15))/0.15):0; const a=cl((T1-0.25-t)/0.25); $('#meno').style.opacity=t<TQ?0:(t<T1?(t<T1-0.25?1:a):0); $('#sotto').style.opacity=$('#meno').style.opacity;
 $('#meno').style.transform='scale('+(1+0.06*Math.sin(cl((t-TQ)/0.8)*Math.PI))+')';
 $('#n106').textContent=t>TQ+0.45?TOTN+' piazze':'';
 const k=Math.floor((t-T1)/DZ), u=(t-T1-k*DZ)/DZ, inZ=t>=T1&&t<T2;
 $('#head').style.opacity=inZ?1:0; $('#map').style.opacity=t<T1-0.2?0.0:(t<T2R+0.3?1:0); $('#retet').style.opacity=t>=T2?cl((t-T2-0.4)/0.3)*(1-cl((t-T2R)/0.3)):0;
 let vb=FULL; if(inZ){ const prev=k===0?FULL:Z[k-1][1]; vb=mix(prev,Z[k][1],ease(u/0.35)); } else if(t>=T2) vb=FULL;
 $('#map').setAttribute('viewBox',vb.join(' '));
 const sc=$('#scia'); ED.forEach((z,i)=>{const l=document.getElementById('l'+i); let o=0,w=3; if(inZ){o=z<k?.85:(z===k?ease((u-.3)/.45)*.85:0);} else if(t>=T2){o=.9; w=3+2.5*(.5+.5*Math.sin((t-T2)*7+i*.6));} l.setAttribute('opacity',o); l.setAttribute('stroke-width',w);});
 const SW=960,SH=1110,SL=60,ST=400; const scl=Math.min(SW/vb[2],SH/vb[3]); const ox=SL+(SW-vb[2]*scl)/2, oy=ST+(SH-vb[3]*scl)/2;
 { const PL=sc.getTotalLength(); const f=inZ?Math.max(0,(k-1+ease(u/0.35)))/(Z.length-1):0; sc.setAttribute('stroke-dasharray',(PL*f)+' '+(PL*2)); sc.setAttribute('stroke-width',7/scl); sc.setAttribute('opacity',inZ&&k>0?.5:0); }
 const scr=(x,y)=>[ox+(x-vb[0])*scl, oy+(y-vb[1])*scl];
 let n=0; E.forEach((e,i)=>{const g=$('#e'+i); if(!inZ||e.d>k){g.setAttribute('opacity',inZ||t<T1?0:1);return;} n+=e.n;
   const v=e.d<k?1:ease((u-0.25-(E.filter(x=>x.d===k).indexOf(e))*0.02)/0.25); g.setAttribute('opacity',v>0?1:0);
   const [h,d]=g.querySelectorAll('circle'); const rp=(10+Math.sqrt(e.n)*7)*Math.max(0.01,v); h.setAttribute('r',rp*1.9/scl); d.setAttribute('r',rp/scl); d.setAttribute('stroke-width',4/scl); });
 if(inZ){ $('#zona').textContent=Z[k][0]; $('#conta').innerHTML='<b>'+n+'</b>piazze su '+TOTN;
   const lv=(j)=>cl((u-0.38-j*0.06)/0.12); $('#labs').innerHTML=Z[k][2].map(([c,o,p,dy=0],j)=>{const [px,py]=scr(...L[c]); const right=px>560; const lx=right?px-24:px+24;
     return '<div class="lb" style="opacity:'+lv(j)+';top:'+(py-40+dy)+'px;'+(right?'right:'+(1080-lx)+'px;text-align:right':'left:'+lx+'px')+'"><b>'+c+' '+o+'</b><span>'+p+'</span></div><div class="lb" style="opacity:'+lv(j)+';left:'+(px-14)+'px;top:'+(py-14)+'px"><i></i></div>';}).join('');
   $('#citta').textContent=C[k].join(' · '); $('#citta').style.opacity=cl((u-0.3)/0.15); } else { $('#labs').innerHTML=''; $('#citta').textContent=''; }
 $('#storia').style.opacity=cl((t-T2R)/0.3)*(1-cl((t-T3)/0.3)); for(let q=0;q<3;q++){const a=T2R+q*TP; document.getElementById('pc'+q).style.opacity=cl((t-a)/0.2)*(q<2?1-cl((t-a-TP+0.1)/0.2):1); document.getElementById('pc'+q).style.transform='translateX('+(40*(1-ease((t-a)/0.35)))+'px)';} $('#sicuri').style.opacity=cl((t-T3)/0.3)*(1-cl((t-T4)/0.3)); $('#fine').style.opacity=cl((t-T4)/0.3);
 document.querySelector('.m').style.color=t>T3+0.15?'#fff':'#1c1b1f';
};
</script></body></html>`;
const cover = `<!doctype html><html><head><meta charset="utf-8"><style>${cssBase}</style></head><body style="background:#f6f3ee"><div class="m"><i></i>Mappa della Rivolta</div>
<div style="position:absolute;left:80px;right:80px;top:560px;text-align:center;font:800 140px/.95 T;text-transform:uppercase">Domani<br>si sciopera in<br><span style="color:#8e1b5e">${NC} città.</span><br><span style="font-size:110px">La tua c'è?</span></div></body></html>`;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const pg = await b.newPage({ viewport: { width: 1080, height: 1920 } }); await pg.setContent(cover); await pg.evaluate(() => document.fonts.ready); await pg.screenshot({ path: './out/cover-dom.png' }); await b.close();
await rendi({ html, durata: TOT, uscita: './out/reel-dom-muto.mp4', cartella: './out/f-dom' });
const Cv = 0.6, tempi = [0.15, Cv + TQ + 0.05, Cv + TQ + 0.5, ...Z.map((_, i) => Cv + T1 + i * DZ + 0.3), Cv + T2 + 0.4, Cv + T2R + 0.05, Cv + T2R + TP + 0.05, Cv + T2R + 2 * TP + 0.05, Cv + T3 + 0.05];
execSync(`python3 suoni.py out/bling-dom.wav ${(Cv + TOT).toFixed(2)} "${tempi.map((x) => x.toFixed(2)).join(',')}" ${(Cv + T4).toFixed(2)}`);
execSync(`ffmpeg -v error -y -loop 1 -framerate 30 -t ${Cv} -i out/cover-dom.png -i out/reel-dom-muto.mp4 -i out/bling-dom.wav -filter_complex "[0:v]format=yuv420p,setsar=1[c];[1:v]format=yuv420p,setsar=1[r];[c][r]concat=n=2:v=1:a=0[v]" -map "[v]" -map 2:a -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac -b:a 160k -shortest -movflags +faststart out/reel-domani.mp4`);
console.log('durata', (Cv + TOT).toFixed(1), TOTN, NC);
