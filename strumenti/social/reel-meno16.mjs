import fs from 'node:fs'; import { execSync } from 'node:child_process'; import { chromium } from 'playwright-core'; import { cssBase, rendi, pathItalia, xy, W, H } from './motore.mjs';
const D = JSON.parse(fs.readFileSync('v20.json')); const C = Object.entries(D.c).map(([n, [la, ln]]) => [n, ...xy(la, ln)]).sort((a, b) => a[2] - b[2]);
const T1 = 2.2, T2 = T1 + 3.6, T3 = T2 + 2.8, T4 = T3 + 2.8, TOT = T4 + 3.4;
const html = `<!doctype html><html><head><meta charset="utf-8"><style>${cssBase}
.l{position:absolute;inset:0;opacity:0}#map{position:absolute;left:150px;top:560px;width:780px;height:907px}
</style></head><body>
<div class="l" id="a" style="opacity:1;background:#c8322a;color:#fff;padding:420px 80px"><p style="font:700 40px T;letter-spacing:.12em;text-transform:uppercase;color:#ffd5d1">Sciopero generale</p><p id="num" style="font:800 520px/.8 T;margin-top:30px">−16</p><p style="font:800 110px/.9 T;text-transform:uppercase;margin-top:30px">giorni<br>al 20 novembre</p></div>
<div class="l" id="b" style="background:#f6f3ee;padding:280px 80px"><p style="font:700 38px T;letter-spacing:.12em;text-transform:uppercase;color:#c8322a">Venerdì 20 sulla mappa</p><p style="font:800 120px/.9 T;text-transform:uppercase;margin-top:14px"><span id="cnt">0</span> città,<br>per ora.</p>
<svg id="map" viewBox="0 0 ${W} ${H}"><path d="${pathItalia}" fill="#fff" stroke="#1c1b1f" stroke-width="3"/>${C.map(([n, x, y], i) => `<g id="p${i}" opacity="0"><circle cx="${x}" cy="${y}" r="26" fill="#8e1b5e" opacity=".2"/><circle cx="${x}" cy="${y}" r="11" fill="#8e1b5e" stroke="#fff" stroke-width="3"/></g>`).join('')}</svg></div>
<div class="l" id="c" style="background:#1c1b1f;color:#fff;padding:420px 80px"><p style="font:800 150px/.88 T;text-transform:uppercase">E la tua<br>città?</p><p style="font:600 50px/1.3 C;margin-top:40px;color:#e8e4dd">Sulla mappa mancano ancora tante piazze. Le conosci tu, non noi.</p></div>
<div class="l" id="d" style="background:#f6f3ee;padding:420px 80px"><p style="font:700 38px T;letter-spacing:.12em;text-transform:uppercase;color:#c8322a">Aggiungila tu</p><p style="font:800 150px/.88 T;text-transform:uppercase;margin-top:14px">Basta un<br>link.</p><p style="font:600 50px/1.3 C;margin-top:40px">Un comunicato, una locandina, il sito del sindacato. Senza account, in 30 secondi.</p></div>
<div class="l" id="e" style="background:#c8322a;color:#fff;padding:380px 80px"><p style="font:800 140px/.88 T;text-transform:uppercase">Non molliamo<br>adesso.</p><p style="font:600 48px/1.3 C;margin-top:30px">Sabato 7 si torna in piazza. Il 20 sciopero generale.</p><p style="font:800 80px T;margin-top:50px">mappadellarivolta.org</p>
<div style="display:inline-flex;align-items:center;gap:22px;margin-top:40px;background:#fff;color:#1c1b1f;padding:22px 36px;border-radius:60px;font:800 56px T"><span style="background:#c8322a;color:#fff;border-radius:40px;padding:4px 22px;font-size:42px">+ Segui</span>@mappadellarivolta</div><p style="font:600 30px C;color:#ffe1de;margin-top:60px">La mappa riporta informazioni pubbliche con la loro fonte.</p></div>
<div class="m" style="z-index:9"><i></i>Mappa della Rivolta</div><script>
const N=${C.length},T1=${T1},T2=${T2},T3=${T3},T4=${T4};const $=(q)=>document.querySelector(q),cl=(v)=>Math.max(0,Math.min(1,v)),ez=(v)=>1-Math.pow(1-cl(v),3);
window.render=(t)=>{ $('#num').style.transform='scale('+(1+0.08*(1-ez(t/0.6)))+')';
 const L=[['#b',T1,T2],['#c',T2,T3],['#d',T3,T4],['#e',T4,99]]; L.forEach(([q,a,b])=>{$(q).style.opacity=cl((t-a)/0.25)*(1-cl((t-b)/0.25));$(q).style.transform='translateY('+(30*(1-ez((t-a)/0.4)))+'px)';});
 let k=0; for(let i=0;i<N;i++){const v=ez((t-T1-0.4-i*0.12)/0.25); document.getElementById('p'+i).setAttribute('opacity',v); if(v>0.5)k++;} $('#cnt').textContent=k;
 const dark=(t<T1)||(t>=T2&&t<T3)||t>=T4; $('.m').style.color=dark?'#fff':'#1c1b1f'; $('.m i').style.background=dark&&t<T2||t>=T4?'#fff':'#c8322a';};
</script></body></html>`;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
await p.setContent(html); await p.evaluate(() => document.fonts.ready);
for (const t of [1, T1 + 3, T2 + 1.5, T3 + 1.5, T4 + 2]) { await p.evaluate((t) => window.render(t), t); await p.screenshot({ path: `out/m16-${t.toFixed(1)}.png` }); }
await p.evaluate(() => window.render(1.5)); await p.screenshot({ path: 'out/cover-m16.png' }); await b.close();
if (process.argv[2] === 'video') {
 await rendi({ html, durata: TOT, uscita: 'out/m16-muto.mp4', cartella: 'out/f-m16' }); const Cv = 0.6;
 execSync(`python3 suoni.py out/bling-m16.wav ${(Cv + TOT).toFixed(2)} "${[0.15, Cv + T1, Cv + T2, Cv + T3].map((x) => x.toFixed(2)).join(',')}" ${(Cv + T4).toFixed(2)}`);
 execSync(`ffmpeg -v error -y -loop 1 -framerate 30 -t ${Cv} -i out/cover-m16.png -i out/m16-muto.mp4 -i out/bling-m16.wav -filter_complex "[0:v]format=yuv420p,setsar=1[c];[1:v]format=yuv420p,setsar=1[r];[c][r]concat=n=2:v=1:a=0[v]" -map "[v]" -map 2:a -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac -b:a 160k -shortest -movflags +faststart out/reel-meno16.mp4`);
}
