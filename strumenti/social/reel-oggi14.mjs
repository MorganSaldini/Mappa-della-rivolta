import fs from 'node:fs'; import { execSync } from 'node:child_process'; import { chromium } from 'playwright-core';
import { cssBase, rendi, pathItalia, xy, W, H, CHROME } from './motore.mjs'; import { ill } from './citta-svg.mjs';
const ev = JSON.parse(fs.readFileSync('/home/claude/mappa-della-rivolta/public/dati/eventi.json')).eventi;
const pos = (c) => { const e = ev.find((x) => x.data === '2026-11-14' && x.comune.toLowerCase() === c.toLowerCase() && x.stato === 'verificato'); return xy(e.lat, e.lng); };
const N20 = +process.argv[2];
const CITTA = [['perugia', '10:00', 'Perugia', 'Piazza Grimana'], ['piacenza', '10:30', 'Piacenza', 'Stazione FS'], ['bologna', '13:00', 'Bologna', 'Piazza del Nettuno'],
  ['milano', '14:00', 'Milano', 'Piazza Leonardo da Vinci'], ['brescia', '14:00', 'Brescia', 'Largo Formentone'], ['verona', '14:00', 'Verona', 'Piazza Bra'],
  ['colosseo', '14:00', 'Roma', 'Piazza Vittorio'], ['bolzano', '15:00', 'Bolzano', 'Parco della Stazione'], ['torino', '16:00', 'Torino', 'Piazza Castello']];
const T = [0, 2.6, 10.4, 13.8], TOT = 18, DC = (T[2] - T[1]) / CITTA.length;
const css = cssBase + `
.k{font:700 40px T;letter-spacing:.12em;text-transform:uppercase}.big{font:800 190px/.86 T;text-transform:uppercase}
#s0{background:#c8322a;color:#fff}#s1{background:#f6f3ee}#s2{background:#1c1b1f;color:#fff}#s3{background:#c8322a;color:#fff}
.cc{position:absolute;left:80px;right:80px;top:330px}.cc .im{border-radius:36px;overflow:hidden;height:620px}
.cc u{display:block;text-decoration:none;font:800 120px T;color:#c8322a;margin-top:40px}.cc b{display:block;font:800 170px/.88 T;text-transform:uppercase}.cc span{display:block;font:600 52px C;margin-top:16px}
#bar{position:absolute;left:80px;right:80px;top:1560px;display:flex;gap:12px}#bar i{flex:1;height:10px;border-radius:5px;background:#ddd6cc}`;
const html = `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>
<div class="lay" id="s0"><div style="position:absolute;left:80px;right:80px;top:400px"><p class="k" style="color:#ffd5d1">Oggi, sabato 14</p>
<p class="big" style="margin-top:20px">In piazza<br>in <span id="n">0</span> città</p><p style="font:600 54px/1.3 C;margin-top:40px">Dalle 10 del mattino fino a sera.</p></div><div id="st" style="position:absolute;left:80px;right:80px;top:1130px;display:grid;grid-template-columns:repeat(3,1fr);gap:20px">${["colosseo","milano","torino"].map((k)=>`<div style="border-radius:24px;overflow:hidden;border:4px solid #fff">${ill(k,260)}</div>`).join("")}</div></div>
<div class="lay" id="s1">${CITTA.map(([k, o, c, l], i) => `<div class="cc" id="c${i}"><div class="im">${ill(k, 620)}</div><u>${o}</u><b>${c}</b><span>${l}</span></div>`).join('')}
<div id="bar">${CITTA.map(() => '<i></i>').join('')}</div></div>
<div class="lay" id="s2"><svg viewBox="0 0 ${W} ${H}" style="position:absolute;left:110px;top:330px;width:860px;height:1000px"><path d="${pathItalia}" fill="#3a383e"/>
${CITTA.map(([k, o, c], i) => { const [x, y] = pos(c); return `<circle id="d${i}" cx="${x}" cy="${y}" r="16" fill="#ff5a4e" stroke="#fff" stroke-width="5"/>`; }).join('')}</svg>
<p id="gr" style="position:absolute;left:80px;right:80px;top:1350px;font:800 92px/.95 T;text-transform:uppercase">Grazie a chi<br>ha manifestato<br>pacificamente.</p></div>
<div class="lay" id="s3"><div style="position:absolute;left:80px;right:80px;top:330px"><p class="k" style="color:#ffd5d1">Prossima tappa</p>
<p class="big" style="margin-top:16px">Venerdì 20</p><p style="font:600 56px/1.3 C;margin-top:30px">Sciopero generale. Sulla mappa ci sono già ${N20} città.</p>
<p id="cd" style="font:800 116px/.9 T;text-transform:uppercase;margin-top:70px">Condividi<br>con chi vuole<br>scioperare.</p>
<div id="sg" style="display:inline-flex;align-items:center;gap:22px;margin-top:50px;background:#fff;color:#1c1b1f;padding:22px 36px;border-radius:60px;font:800 54px T"><span style="background:#c8322a;color:#fff;border-radius:40px;padding:4px 24px;font-size:40px">+ Segui</span>@mappadellarivolta</div>
<p style="font:600 34px C;margin-top:40px">♥ Gratis e senza pubblicità: se puoi, sostienila con un caffè.</p>
<p style="font:600 26px/1.4 C;margin-top:30px;color:#ffe1de">La mappa riporta informazioni pubbliche con la loro fonte.</p></div></div>
<div class="m" id="mk"><i></i>Mappa della Rivolta</div>
<script>
const T=${JSON.stringify(T)},TOT=${TOT},DC=${DC},NC=${CITTA.length};const cl=(x)=>Math.max(0,Math.min(1,x)),ez=(x)=>1-Math.pow(1-cl(x),3),$=(i)=>document.getElementById(i);
window.render=(t)=>{const sc=t<T[1]?0:t<T[2]?1:t<T[3]?2:3;for(let i=0;i<4;i++)$('s'+i).style.display=i===sc?'block':'none';
 $('mk').style.color=sc===1?'#1c1b1f':'#fff';$('mk').querySelector('i').style.background=sc===0||sc===3?'#fff':'#c8322a';
 if(sc===0){$('n').textContent=Math.round(ez((t-0.5)/1.4)*9);[...$('st').children].forEach((c,i)=>{const a=ez((t-0.3-i*0.15)/0.4);c.style.opacity=a;c.style.transform='translateY('+(60*(1-a))+'px)'});$('s0').firstChild.style.transform='translateY('+(40*(1-ez(t/0.6)))+'px)';}
 if(sc===1){const u=t-T[1],j=Math.min(NC-1,Math.floor(u/DC)),f=(u-j*DC)/DC;
  for(let i=0;i<NC;i++){const e=$('c'+i);e.style.display=i===j?'block':'none';}
  const e=$('c'+j),a=ez(f/0.28);e.style.transform='translateX('+(140*(1-a))+'px)';e.style.opacity=a;
  e.querySelector('svg').style.transform='scale('+(1.12-0.12*ez(f))+')';
  [...$('bar').children].forEach((b,i)=>b.style.background=i<=j?'#c8322a':'#ddd6cc');}
 if(sc===2){const u=t-T[2];for(let i=0;i<NC;i++){const a=ez((u-0.15-i*0.16)/0.3),d=$('d'+i);d.setAttribute('r',16*a+(a>0&&a<1?10*(1-a):0));d.style.opacity=a;}
  $('gr').style.opacity=ez((u-1.6)/0.5);$('gr').style.transform='translateY('+(40*(1-ez((u-1.6)/0.5)))+'px)';}
 if(sc===3){const u=t-T[3];$('s3').firstChild.style.transform='translateY('+(40*(1-ez(u/0.5)))+'px)';$('cd').style.opacity=ez((u-0.8)/0.4);$('sg').style.transform='scale('+(0.8+0.2*ez((u-1.3)/0.35))+')';$('sg').style.opacity=ez((u-1.3)/0.3);}};
</script></body></html>`;
const b = await chromium.launch({ executablePath: CHROME }); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
await p.setContent(html); await p.evaluate(() => document.fonts.ready);
for (const [t, n] of [[2.4, 'cover'], [4.0, 'k1'], [8.9, 'k2'], [13.2, 'k3'], [17.5, 'k4']]) { await p.evaluate((x) => window.render(x), t); await p.screenshot({ path: `out/o14-${n}.png` }); }
await b.close();
if (process.argv[3] === 'video') {
  await rendi({ html, durata: TOT, uscita: 'out/o14-muto.mp4', cartella: 'out/f-o14' }); const Cv = 0.6;
  const tb = [0.5, T[1], ...CITTA.map((_, i) => T[1] + i * DC).slice(1), T[2] + 1.6, T[3]].map((x) => (Cv + x).toFixed(2)).join(',');
  execSync(`python3 suoni.py out/bling-o14.wav ${(Cv + TOT).toFixed(2)} "${tb}" ${(Cv + T[3] + 1.3).toFixed(2)}`);
  execSync(`ffmpeg -v error -y -loop 1 -framerate 30 -t ${Cv} -i out/o14-cover.png -i out/o14-muto.mp4 -i out/bling-o14.wav -filter_complex "[0:v]format=yuv420p,setsar=1[c];[1:v]format=yuv420p,setsar=1[r];[c][r]concat=n=2:v=1:a=0[v]" -map "[v]" -map 2:a -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac -b:a 160k -shortest -movflags +faststart out/reel-oggi14.mp4`);
}
console.log('ok');
