import fs from 'node:fs'; import { execSync } from 'node:child_process'; import { chromium } from 'playwright-core'; import { cssBase, rendi, pathItalia, xy, W, H } from './motore.mjs';
const A = JSON.parse(fs.readFileSync('v20.json')).c, B = JSON.parse(fs.readFileSync('v20b.json'));
const OLD = Object.keys(A), NEW = Object.keys(B).filter((k) => !A[k]).sort((a, b) => B[b][0] - B[a][0]);
const pt = (n) => xy(...B[n]);
const T1 = 2.4, T2 = T1 + 5.2, T3 = T2 + 2.4, T4 = T3 + 2.6, TOT = T4 + 3.8, DN = 3.8 / NEW.length;
const html = `<!doctype html><html><head><meta charset="utf-8"><style>${cssBase}.l{position:absolute;inset:0;opacity:0}
#map{position:absolute;left:110px;top:520px;width:860px;height:1000px}#cnt{font-variant-numeric:tabular-nums}
#nome{position:absolute;left:80px;right:80px;top:1540px;font:800 70px T;text-transform:uppercase;color:#c8322a;height:80px}
</style></head><body style="background:#f6f3ee">
<div class="l" id="a" style="opacity:1;background:#1c1b1f;color:#fff;padding:620px 80px"><p style="font:700 40px T;letter-spacing:.12em;text-transform:uppercase;color:#ff8f86">Mercoledì 4 novembre</p><p style="font:800 190px/.86 T;text-transform:uppercase;margin-top:20px">17 città<br>per il 20.</p><p style="font:600 50px/1.3 C;margin-top:30px;color:#e8e4dd">Poi è successo questo →</p></div>
<div class="l" id="b"><p style="position:absolute;left:80px;top:260px;font:700 38px T;letter-spacing:.12em;text-transform:uppercase;color:#c8322a">Sciopero generale · 20 novembre</p><p style="position:absolute;left:80px;top:310px;font:800 170px/.9 T;text-transform:uppercase"><span id="cnt">17</span> città</p>
<svg id="map" viewBox="0 0 ${W} ${H}"><path d="${pathItalia}" fill="#fff" stroke="#1c1b1f" stroke-width="3"/>
${OLD.map((n) => { const [x, y] = pt(n); return `<circle cx="${x}" cy="${y}" r="9" fill="#8a8790" stroke="#fff" stroke-width="2.5"/>`; }).join('')}
${NEW.map((n, i) => { const [x, y] = pt(n); return `<g id="n${i}" opacity="0"><circle class="h" cx="${x}" cy="${y}" r="24" fill="#c8322a" opacity=".25"/><circle cx="${x}" cy="${y}" r="10" fill="#c8322a" stroke="#fff" stroke-width="3"/></g>`; }).join('')}</svg><p id="nome"></p></div>
<div class="l" id="c" style="background:#c8322a;color:#fff;padding:620px 80px"><p style="font:800 170px/.86 T;text-transform:uppercase">In 5 giorni<br>sono<br>raddoppiate.</p><p style="font:600 50px/1.3 C;margin-top:30px">Grazie a chi le ha aggiunte.</p></div>
<div class="l" id="d" style="background:#1c1b1f;color:#fff;padding:620px 80px"><p style="font:700 40px T;letter-spacing:.12em;text-transform:uppercase;color:#ff8f86">Venerdì 20 novembre</p><p style="font:800 180px/.86 T;text-transform:uppercase;margin-top:20px">La tua<br>città c'è?</p><p style="font:600 50px/1.3 C;margin-top:30px;color:#e8e4dd">Se manca, aggiungila: basta il link a una locandina.</p></div>
<div class="l" id="e" style="background:#c8322a;color:#fff;padding:460px 80px"><p style="font:800 140px/.88 T;text-transform:uppercase">Condividi<br>con chi vuole<br>scioperare.</p><p style="font:800 76px T;margin-top:50px">mappadellarivolta.org</p>
<div style="display:inline-flex;align-items:center;gap:22px;margin-top:40px;background:#fff;color:#1c1b1f;padding:22px 36px;border-radius:60px;font:800 56px T"><span style="background:#c8322a;color:#fff;border-radius:40px;padding:4px 22px;font-size:42px">+ Segui</span>@mappadellarivolta</div><p style="font:600 30px C;color:#ffe1de;margin-top:60px">Fonti: schede della mappa. La mappa riporta informazioni pubbliche con la loro fonte.</p></div>
<div class="m" style="z-index:9"><i></i>Mappa della Rivolta</div><script>
const NEW=${JSON.stringify(NEW)},T1=${T1},T2=${T2},T3=${T3},T4=${T4},DN=${DN};const $=(q)=>document.querySelector(q),cl=(v)=>Math.max(0,Math.min(1,v)),ez=(v)=>1-Math.pow(1-cl(v),3);
window.render=(t)=>{ $('#a').style.opacity=1-cl((t-T1+0.2)/0.25);
 const L=[['#b',T1,T2],['#c',T2,T3],['#d',T3,T4],['#e',T4,99]]; L.forEach(([q,a,b])=>{$(q).style.opacity=cl((t-a)/0.25)*(1-cl((t-b)/0.25));});
 const s=T1+0.8; let k=0,last='';
 NEW.forEach((n,i)=>{const u=t-s-i*DN; const g=document.getElementById('n'+i); const v=ez(u/0.25); g.setAttribute('opacity',cl(u/0.15)); g.querySelector('.h').setAttribute('r',24+30*(1-v)); if(u>0){k++;last=n;}});
 $('#cnt').textContent=17+k; $('#nome').textContent=k&&k<NEW.length+1&&t<s+NEW.length*DN+0.4?'+ '+last:(k===NEW.length?'36 città':'');
 const dark=t<T1||(t>=T3&&t<T4)||t>=T4||(t>=T2&&t<T3); $('.m').style.color=dark?'#fff':'#1c1b1f'; $('.m i').style.background=(t>=T2&&t<T3)||t>=T4?'#fff':'#c8322a';};
</script></body></html>`;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
await p.setContent(html); await p.evaluate(() => document.fonts.ready);
for (const t of [1.2, T1 + 2.5, T2 - 0.4, T2 + 1.2, T3 + 1.2, T4 + 2]) { await p.evaluate((t) => window.render(t), t); await p.screenshot({ path: `out/cr-${t.toFixed(1)}.png` }); }
await p.evaluate(() => window.render(1.2)); await p.screenshot({ path: 'out/cover-cresce.png' }); await b.close();
if (process.argv[2] === 'video') {
 await rendi({ html, durata: TOT, uscita: 'out/cresce-muto.mp4', cartella: 'out/f-cr' }); const Cv = 0.6;
 execSync(`python3 suoni.py out/bling-cr.wav ${(Cv + TOT).toFixed(2)} "${[0.15, Cv + T1, ...NEW.map((_, i) => Cv + T1 + 0.8 + i * DN).filter((_, i) => i % 3 === 0), Cv + T2, Cv + T3].map((x) => x.toFixed(2)).join(',')}" ${(Cv + T4).toFixed(2)}`);
 execSync(`ffmpeg -v error -y -loop 1 -framerate 30 -t ${Cv} -i out/cover-cresce.png -i out/cresce-muto.mp4 -i out/bling-cr.wav -filter_complex "[0:v]format=yuv420p,setsar=1[c];[1:v]format=yuv420p,setsar=1[r];[c][r]concat=n=2:v=1:a=0[v]" -map "[v]" -map 2:a -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac -b:a 160k -shortest -movflags +faststart out/reel-cresce.mp4`);
}
