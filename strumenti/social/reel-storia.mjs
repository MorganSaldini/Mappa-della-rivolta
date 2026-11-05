import fs from 'node:fs'; import { execSync } from 'node:child_process'; import { chromium } from 'playwright-core'; import { cssBase, rendi } from './motore.mjs';
const im = (n) => 'data:image/jpeg;base64,' + fs.readFileSync(`storiche/${n}.jpg`).toString('base64');
const BG = [null, 'treno', null, 'genova', 'carovita', 'genova'];
const Y = [['Dopo l\'Unità', 'Scioperare è un reato.', '#1c1b1f'], ['1889', 'Tollerato. Ma ti possono licenziare.', '#1c1b1f'], ['1930', 'Col fascismo torna reato.', '#1c1b1f'], ['1948', 'La Costituzione: è un diritto.', '#c8322a'], ['1970', 'Dopo l\'autunno caldo, lo Statuto dei lavoratori.', '#c8322a'], ['1974', 'Non è reato nemmeno lo sciopero politico.', '#c8322a']];
const T0 = 2.4, DY = 1.7, T1 = T0 + DY * Y.length, T2 = T1 + 2.8, TOT = T2 + 3.8;
const html = `<!doctype html><html><head><meta charset="utf-8"><style>${cssBase}.l{position:absolute;inset:0;opacity:0}
.y{position:absolute;inset:0;background:#1c1b1f;color:#fff;overflow:hidden}.y .ph{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:grayscale(1) contrast(1.05)}.y .ov{position:absolute;inset:0;background:linear-gradient(#000a,#0006 40%,#000d 75%)}.y .tx{position:absolute;left:80px;right:80px;top:900px}.y small{position:absolute;right:60px;bottom:330px;font:600 26px C;color:#fffa}.y b{display:block;font:800 300px/.85 T;text-transform:uppercase}.y span{display:block;font:800 92px/.95 T;text-transform:uppercase;margin-top:40px}
#bar{position:absolute;left:80px;right:80px;top:1560px;height:10px;background:#ffffff33;z-index:5}#bar i{position:absolute;left:0;top:0;bottom:0;background:#c8322a}
</style></head><body style="background:#f6f3ee">
<div class="l" id="a" style="opacity:1;background:#1c1b1f;color:#fff;padding:600px 80px;overflow:hidden"><img src="${im('treno')}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:grayscale(1);opacity:.35"><div style="position:relative"><p style="font:800 170px/.86 T;text-transform:uppercase">Scioperare<br>era<br><span style="color:#ff8f86">un reato.</span></p><p style="font:600 50px C;margin-top:40px;color:#e8e4dd">Poi qualcuno ha scioperato lo stesso.</p></div></div>
${Y.map(([a, b, c], i) => `<div class="l y" id="y${i}">${BG[i] ? `<img class="ph" src="${im(BG[i])}" style="object-position:${i === 5 ? '50% 85%' : '50% 50%'}"><div class="ov"></div><small>Foto d'epoca</small>` : ''}<div class="tx"><b style="color:${c === '#c8322a' ? '#ff8f86' : '#fff'};${a.length > 6 ? 'font-size:190px' : ''}">${a}</b><span>${b}</span></div></div>`).join('')}
<div id="bar" style="opacity:0"><i></i></div>
<div class="l" id="b" style="background:#c8322a;color:#fff;padding:560px 80px"><p style="font:700 40px T;letter-spacing:.12em;text-transform:uppercase;color:#ffd5d1">Venerdì 20 novembre</p><p style="font:800 180px/.86 T;text-transform:uppercase;margin-top:20px">Adesso<br>tocca<br>a noi.</p><p style="font:600 50px/1.3 C;margin-top:40px">Sciopero generale. Già 18 città sulla mappa.</p></div>
<div class="l" id="c" style="background:#1c1b1f;color:#fff;padding:420px 80px"><p style="font:800 130px/.88 T;text-transform:uppercase">Mandalo<br>a chi ha<br>dubbi.</p><p style="font:600 46px/1.3 C;margin-top:30px;color:#e8e4dd">Le piazze del 20 su mappadellarivolta.org</p>
<div style="display:inline-flex;align-items:center;gap:22px;margin-top:44px;background:#fff;color:#1c1b1f;padding:22px 36px;border-radius:60px;font:800 56px T"><span style="background:#c8322a;color:#fff;border-radius:40px;padding:4px 22px;font-size:42px">+ Segui</span>@mappadellarivolta</div>
<p style="font:600 34px/1.3 C;margin-top:40px;color:#e8e4dd">♥ La mappa è gratis: se puoi, sostienila con un caffè.</p><p style="font:600 28px/1.4 C;color:#c9c5bf;margin-top:60px">Fonti: FP CGIL; Studio Cataldi; Il Post. La mappa riporta informazioni pubbliche con la loro fonte.</p></div>
<div class="m" style="z-index:9"><i></i>Mappa della Rivolta</div><script>
const N=${Y.length},T0=${T0},DY=${DY},T1=${T1},T2=${T2};const $=(q)=>document.querySelector(q),cl=(v)=>Math.max(0,Math.min(1,v)),ez=(v)=>1-Math.pow(1-cl(v),3);
window.render=(t)=>{ $('#a').style.opacity=1-cl((t-T0+0.2)/0.25);
 for(let i=0;i<N;i++){const s=T0+i*DY,e=document.getElementById('y'+i),u=t-s; e.style.opacity=t<s?0:cl(u/0.2)*(1-cl((u-DY+0.15)/0.2)); const [b,sp]=e.querySelector('.tx').children; const ph=e.querySelector('.ph'); if(ph) ph.style.transform='scale('+(1.05+0.08*cl(u/DY))+')'; b.style.transform='translateY('+(80*(1-ez(u/0.45)))+'px)'; sp.style.opacity=cl((u-0.35)/0.25);}
 $('#bar').style.opacity=t>T0-0.1&&t<T1?1:0; $('#bar i').style.width=(100*cl((t-T0)/(T1-T0)))+'%';
 $('#b').style.opacity=cl((t-T1)/0.25)*(1-cl((t-T2)/0.25)); $('#b').style.transform='scale('+(1.04-0.04*ez((t-T1)/0.6))+')'; $('#c').style.opacity=cl((t-T2)/0.25);
 const dark=true; $('.m').style.color=dark?'#fff':'#1c1b1f'; $('.m i').style.background=t>=T1&&t<T2?'#fff':'#c8322a';};
</script></body></html>`;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
await p.setContent(html); await p.evaluate(() => document.fonts.ready);
for (const t of [1.2, T0 + 1.2, T0 + 3 * DY + 1.2, T0 + 4 * DY + 1.2, T1 + 1.5, T2 + 2]) { await p.evaluate((t) => window.render(t), t); await p.screenshot({ path: `out/st-${t.toFixed(1)}.png` }); }
await p.evaluate(() => window.render(1.2)); await p.screenshot({ path: 'out/cover-storia.png' }); await b.close();
if (process.argv[2] === 'video') {
 await rendi({ html, durata: TOT, uscita: 'out/storia-muto.mp4', cartella: 'out/f-st' }); const Cv = 0.6;
 execSync(`python3 suoni.py out/bling-st.wav ${(Cv + TOT).toFixed(2)} "${[0.15, ...Y.map((_, i) => Cv + T0 + i * DY), Cv + T1].map((x) => x.toFixed(2)).join(',')}" ${(Cv + T2).toFixed(2)}`);
 execSync(`ffmpeg -v error -y -loop 1 -framerate 30 -t ${Cv} -i out/cover-storia.png -i out/storia-muto.mp4 -i out/bling-st.wav -filter_complex "[0:v]format=yuv420p,setsar=1[c];[1:v]format=yuv420p,setsar=1[r];[c][r]concat=n=2:v=1:a=0[v]" -map "[v]" -map 2:a -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac -b:a 160k -shortest -movflags +faststart out/reel-storia.mp4`);
}
