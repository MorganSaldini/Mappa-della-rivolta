import fs from 'node:fs'; import { execSync } from 'node:child_process'; import { chromium } from 'playwright-core';
import { W, H, pathItalia, xy, cssBase, rendi } from './motore.mjs';
const raw = JSON.parse(fs.readFileSync('m2.json'));
const TOTN = 120, NC = 76;
const E = raw.map(([d, t, c, la, ln, n]) => { const [x, y] = xy(la, ln); return { x, y, n, o: Math.random() }; }).sort((a, b) => a.y - b.y);
const img = (n) => 'data:image/jpeg;base64,' + fs.readFileSync(`foto30/${n}.jpg`).toString('base64');
const P = [['milano', 'Milano', 'il corteo visto dall\'alto', 'Foto: cantiere_milano'], ['milano2', 'Milano', 'gli studenti delle periferie nord', 'Dalle vostre storie'], ['brescia', 'Brescia', 'Piazza della Loggia', 'Dalle vostre storie'], ['bologna', 'Bologna', 'sotto le Due Torri', 'Dalle vostre storie'], ['pescara', 'Pescara', 'il corteo regionale', 'Dalle vostre storie'], ['catania', 'Catania', 'in strada', 'Dalle vostre storie']];
const NUM = [['Partecipanti', 'Oltre<br>1 milione', 'in piazza in tutta Italia secondo gli <b>organizzatori</b>.', 'Stima USB (Tecnica della Scuola, la Repubblica). Nessun dato ufficiale.'],
 ['Scuola', '7,57%', 'di docenti e personale ATA in sciopero.', 'Ministero dell\'Istruzione, dato provvisorio e parziale delle ore 17.'],
 ['Sulla mappa', `${TOTN}`, `iniziative in <b>${NC} comuni</b>, tutte con la loro fonte.`, 'Mappa della Rivolta']];
const TA = 2.6, DP = 1.8, TB = TA + DP * P.length, DN = 1.9, TC = TB + DN * NUM.length, TG = TC + 2.4, TOT = TG + 3.4;
const html = `<!doctype html><html><head><meta charset="utf-8"><style>${cssBase}
#map{position:absolute;left:190px;top:650px;width:760px;height:884px}
#t1{position:absolute;left:80px;right:80px;top:250px;font:800 150px/.88 T;text-transform:uppercase}#t1 span{color:#c8322a}
#c1{position:absolute;left:80px;right:80px;top:1540px;font:600 44px/1.25 C}#c1 b{font:800 64px T}#c1 i{display:block;font:600 28px C;color:#5f5d66;font-style:normal;margin-top:8px}
.ph{position:absolute;inset:0;opacity:0;background:#f6f3ee}.ph .fr{position:absolute;left:80px;right:80px;top:300px;height:1150px;overflow:hidden;background:#1c1b1f;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 40px #0003}
.ph img{width:100%;height:100%;object-fit:cover}.ph img.wide{height:auto;object-fit:contain}
.ph .ci{position:absolute;left:80px;right:80px;top:1480px;font:800 120px/.9 T;text-transform:uppercase}.ph .su{position:absolute;left:80px;right:80px;top:1595px;font:600 44px C;color:#c8322a}.ph .cr{position:absolute;right:96px;top:1405px;font:600 24px C;color:#fff;background:#1c1b1fb0;padding:4px 12px}
.nu{position:absolute;inset:0;background:#f6f3ee;opacity:0;padding:330px 80px}.nu .k{font:700 40px T;letter-spacing:.14em;text-transform:uppercase;color:#c8322a}.nu .a{font:800 250px/.85 T;color:#1c1b1f;margin-top:24px;text-transform:uppercase}.nu p{font:600 54px/1.3 C;margin-top:40px}.nu .f{font:600 32px/1.3 C;color:#5f5d66;margin-top:50px}
#gr{position:absolute;inset:0;background:#c8322a;color:#fff;padding:340px 80px;opacity:0}#gr h1{font:800 150px/.9 T;text-transform:uppercase}#gr p{font:600 50px/1.3 C;margin-top:50px}
#fine{position:absolute;inset:0;background:#1c1b1f;color:#fff;padding:300px 80px;opacity:0}#fine h1{font:800 130px/.9 T;text-transform:uppercase}#fine h1 em{font-style:normal;color:#ff8f86}
#fine .seg{font:800 70px/1.1 T;margin-top:60px}#fine .seg span{color:#ff8f86}#fine p{font:600 42px/1.3 C;color:#e8e4dd;margin-top:30px}#fine .url{font:800 80px T;color:#fff;margin-top:50px}#fine .nota{font:600 30px C;color:#c9c5bf;margin-top:40px}
</style></head><body>
<div id="t1">30 ottobre.<br><span>L'Italia<br>in piazza.</span></div>
<svg id="map" viewBox="0 0 ${W} ${H}"><path d="${pathItalia}" fill="#fff" stroke="#1c1b1f" stroke-width="3" stroke-linejoin="round"/>${E.map((e, i) => `<circle id="e${i}" cx="${e.x}" cy="${e.y}" r="0" fill="#c8322a" fill-opacity=".85" stroke="#f6f3ee" stroke-width="2"/>`).join('')}</svg>
<div id="c1"><b id="n">0</b> iniziative in <b>${NC}</b> comuni<i>Fonte: Mappa della Rivolta</i></div>
${P.map(([f, c, s, cr], i) => `<div class="ph" id="p${i}"><div class="fr">${f === 'milano2' ? `<img src="${img(f)}" style="position:absolute;inset:0;filter:blur(30px) brightness(.6);transform:scale(1.3)!important" class="bg"><img class="wide" style="position:relative;width:118%" src="${img(f)}">` : `<img src="${img(f)}">`}</div><div class="cr">${cr} · volti sfocati</div><p class="ci">${c}</p><p class="su">${s}</p></div>`).join('')}
${NUM.map(([k, a, t, f], i) => `<div class="nu" id="q${i}"><p class="k">${k}</p><p class="a">${a}</p><p>${t}</p><p class="f">Fonte: ${f}</p></div>`).join('')}
<div id="gr"><h1>Grazie a chi ha manifestato pacificamente.</h1><p>E a chi ha segnalato, fotografato e verificato le piazze di oggi.</p></div>
<div id="fine"><h1>Le prossime date<br><em>sono già sulla mappa.</em></h1><p class="seg">Segui <span>@mappadellarivolta</span></p><p>Mandaci le foto della tua piazza: taggaci nelle storie.</p><p class="url">mappadellarivolta.org</p><p class="nota">La mappa riporta informazioni pubbliche con la loro fonte.</p></div>
<div class="m"><i></i>Mappa della Rivolta</div><script>
const E=${JSON.stringify(E)},TA=${TA},DP=${DP},TB=${TB},DN=${DN},TC=${TC},TG=${TG},TOTN=${TOTN};
const $=(q)=>document.querySelector(q),cl=(v)=>Math.max(0,Math.min(1,v)),ease=(v)=>{v=cl(v);return 1-Math.pow(1-v,3)};
window.render=(t)=>{
 const u=cl((t-0.3)/1.6); let tot=0;
 E.forEach((e,i)=>{const v=ease((u-i/E.length*0.8)/0.2); if(v>0.5)tot+=e.n; $('#e'+i).setAttribute('r',(6+Math.sqrt(e.n)*4)*v);});
 $('#n').textContent=u>=1?TOTN:Math.min(TOTN,tot);
 const a=1-cl((t-TA+0.25)/0.25); ['#t1','#map','#c1'].forEach(q=>$(q).style.opacity=a);
 for(let i=0;i<${P.length};i++){const s=TA+i*DP,el=$('#p'+i); el.style.opacity=t<s?0:(i===${P.length - 1}?1-cl((t-TB)/0.2):1)*cl((t-s)/0.2); el.style.zIndex=i+1;
   el.querySelector('img:not(.bg)').style.transform='scale('+(1.02+0.07*cl((t-s)/(DP+0.3)))+')'; el.querySelector('.ci').style.transform='translateY('+(30*(1-ease((t-s)/0.4)))+'px)';}
 for(let i=0;i<${NUM.length};i++){const s=TB+i*DN,el=$('#q'+i); el.style.zIndex=10+i; el.style.opacity=t<s?0:cl((t-s)/0.2)*(i===${NUM.length - 1}?1-cl((t-TC)/0.2):1); el.style.transform='translateX('+(40*(1-ease((t-s)/0.35)))+'px)';}
 $('#gr').style.zIndex=20;$('#gr').style.opacity=cl((t-TC)/0.25); $('#fine').style.zIndex=21;$('#fine').style.opacity=cl((t-TG)/0.3);
 $('.m').style.zIndex=30; $('.m').style.color=t>TC+0.1?'#fff':'#1c1b1f';
};</script></body></html>`;
const cover = `<!doctype html><html><head><meta charset="utf-8"><style>${cssBase}.g{position:absolute;overflow:hidden;box-shadow:0 10px 30px #0004;border:10px solid #fff}.g img{width:100%;height:100%;object-fit:cover}</style></head><body style="background:#f6f3ee"><div class="m"><i></i>Mappa della Rivolta</div>
<div class="g" style="left:70px;top:300px;width:470px;height:600px;transform:rotate(-3deg)"><img src="${img('milano')}"></div><div class="g" style="left:540px;top:330px;width:470px;height:600px;transform:rotate(3deg)"><img src="${img('brescia')}"></div>
<div class="g" style="left:300px;top:820px;width:480px;height:420px;transform:rotate(-1deg)"><img src="${img('bologna')}"></div>
<div style="position:absolute;left:80px;right:80px;top:1290px;font:800 150px/.88 T;text-transform:uppercase">30 ottobre.<br><span style="color:#c8322a">Le vostre piazze.</span></div></body></html>`;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const pg = await b.newPage({ viewport: { width: 1080, height: 1920 } }); await pg.setContent(cover); await pg.evaluate(() => document.fonts.ready); await pg.screenshot({ path: './out/cover-sera30.png' });
await pg.setContent(html); await pg.evaluate(() => document.fonts.ready);
for (const t of [2.0, TA + 1, TA + DP + 1, TA + 2 * DP + 1, TA + 3 * DP + 1, TA + 4 * DP + 1, TA + 5 * DP + 1, TB + 1, TB + DN + 1, TB + 2 * DN + 1, TC + 1, TG + 1.5]) { await pg.evaluate((t) => window.render(t), t); await pg.screenshot({ path: `./out/s30-${t.toFixed(1)}.png` }); }
await b.close();
if (process.argv[2] === 'video') {
await rendi({ html, durata: TOT, uscita: './out/sera30-muto.mp4', cartella: './out/f-sera30' });
const Cv = 0.6, tempi = [0.15, Cv + 0.4, ...P.map((_, i) => Cv + TA + i * DP), ...NUM.map((_, i) => Cv + TB + i * DN), Cv + TC];
execSync(`python3 suoni.py out/bling-sera30.wav ${(Cv + TOT).toFixed(2)} "${tempi.map((x) => x.toFixed(2)).join(',')}" ${(Cv + TG).toFixed(2)}`);
execSync(`ffmpeg -v error -y -loop 1 -framerate 30 -t ${Cv} -i out/cover-sera30.png -i out/sera30-muto.mp4 -i out/bling-sera30.wav -filter_complex "[0:v]format=yuv420p,setsar=1[c];[1:v]format=yuv420p,setsar=1[r];[c][r]concat=n=2:v=1:a=0[v]" -map "[v]" -map 2:a -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac -b:a 160k -shortest -movflags +faststart out/reel-sera30.mp4`);
}
console.log('durata', (0.6 + TOT).toFixed(1));
