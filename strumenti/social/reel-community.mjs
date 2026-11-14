// Reel base per ricondividere foto e video della community.
// 1) metti i file in una cartella con manifest.json  2) python3 prepara-community.py cartella  3) node reel-community.mjs cartella
// manifest.json: {"giorno":"Sabato 14","titolo":"Oggi in piazza","n20":58,"durata_clip":2.6,
//   "contenuti":[{"file":"brescia1.jpg","citta":"Brescia","credito":"@pagina (solo se d'accordo)","da":0,"centro":[0.5,0.4],"sfoca":[[x,y,w,h]]}]}
import fs from 'node:fs'; import path from 'node:path'; import { execSync } from 'node:child_process'; import { chromium } from 'playwright-core';
import { cssBase, CHROME } from './motore.mjs';
const D = path.resolve(process.argv[2]); const M = JSON.parse(fs.readFileSync(`${D}/pronti/manifest.json`)); const C = M.contenuti;
const DC = M.durata_clip || 2.6, TI = 2.2, TG = 2.6, TF = 4.2, TOT = TI + C.length * DC + TG + TF, FPS = 30;
const T = { g: TI + C.length * DC, f: TI + C.length * DC + TG };
const NC = new Set(C.map((c) => c.citta)).size, src = (i, j) => (C[i].tipo === 'video' ? `pronti/${i}/f${String(Math.min(j, C[i].frames - 1)).padStart(4, '0')}.jpg` : `pronti/${i}.jpg`);
const css = cssBase + `.k{font:700 40px T;letter-spacing:.12em;text-transform:uppercase}
#ph{position:absolute;inset:0;width:1080px;height:1920px;object-fit:cover}#ov{position:absolute;inset:0;background:linear-gradient(180deg,rgba(20,18,22,.45),rgba(20,18,22,0) 22%,rgba(20,18,22,0) 55%,rgba(20,18,22,.85) 88%)}
#bars{position:absolute;left:60px;right:60px;top:268px;display:flex;gap:10px}#bars i{flex:1;height:8px;border-radius:4px;background:rgba(255,255,255,.35);overflow:hidden}#bars b{display:block;height:100%;background:#fff;width:0}
#lb{position:absolute;left:70px;right:70px;top:1330px;color:#fff}#ch{display:inline-flex;align-items:center;gap:20px;background:#c8322a;padding:14px 36px 14px 26px;border-radius:70px;font:800 92px/1 T;text-transform:uppercase}
#ch:before{content:'';width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#fff}#cr{font:600 38px C;margin-top:22px;text-shadow:0 2px 12px rgba(0,0,0,.6)}
#in{position:absolute;inset:0;color:#fff}#in .bx{position:absolute;left:80px;right:80px;top:560px}
#gr{background:#1c1b1f;color:#fff}#fi{background:#c8322a;color:#fff}`;
const html = `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>
<div class="lay" id="sc"><img id="ph"><div id="ov"></div><div id="bars">${C.map(() => '<i><b></b></i>').join('')}</div><div id="lb"><div id="ch"></div><p id="cr"></p></div>
<div id="in"><div class="bx"><p class="k" style="color:#ffd5d1">${M.giorno}</p><p style="font:800 200px/.86 T;text-transform:uppercase;margin-top:18px">${M.titolo}</p>
<p style="font:600 58px/1.3 C;margin-top:36px">Le vostre foto da ${NC} ${NC === 1 ? 'città' : 'città'}.</p></div></div></div>
<div class="lay" id="gr"><div style="position:absolute;left:80px;right:80px;top:520px"><p style="font:800 130px/.9 T;text-transform:uppercase">Grazie a chi<br>ha manifestato<br>pacificamente.</p>
<p id="g2" style="font:600 50px/1.35 C;margin-top:60px;color:#e8e4dd">Eri in piazza? Mandaci foto e video in DM o tagga @mappadellarivolta: li ricondividiamo qui.</p></div></div>
<div class="lay" id="fi"><div style="position:absolute;left:80px;right:80px;top:380px"><p class="k" style="color:#ffd5d1">Prossima tappa</p>
<p style="font:800 190px/.86 T;text-transform:uppercase;margin-top:16px">Venerdì 20</p><p style="font:600 56px/1.3 C;margin-top:30px">Sciopero generale. Sulla mappa ci sono già ${M.n20} città.</p>
<p id="cd" style="font:800 116px/.9 T;text-transform:uppercase;margin-top:70px">Condividi<br>con chi vuole<br>scioperare.</p>
<div id="sg" style="display:inline-flex;align-items:center;gap:22px;margin-top:50px;background:#fff;color:#1c1b1f;padding:22px 36px;border-radius:60px;font:800 54px T"><span style="background:#c8322a;color:#fff;border-radius:40px;padding:4px 24px;font-size:40px">+ Segui</span>@mappadellarivolta</div>
<p style="font:600 34px C;margin-top:40px">♥ Gratis e senza pubblicità: se puoi, sostienila con un caffè.</p>
<p style="font:600 26px/1.4 C;margin-top:30px;color:#ffe1de">La mappa riporta informazioni pubbliche con la loro fonte.</p></div></div>
<div class="m" id="mk" style="color:#fff"><i></i>Mappa della Rivolta</div>
<script>
const C=${JSON.stringify(C.map((c, i) => ({ citta: c.citta, cr: c.credito ? (c.tipo === 'video' ? 'Video di ' : 'Foto di ') + c.credito : (c.tipo === 'video' ? 'Video' : 'Foto') + ' dalla community', v: c.tipo === 'video' })))};
const TI=${TI},DC=${DC},T=${JSON.stringify(T)},FPS=${FPS};const cl=(x)=>Math.max(0,Math.min(1,x)),ez=(x)=>1-Math.pow(1-cl(x),3),$=(i)=>document.getElementById(i);
const SRC=${JSON.stringify(C.map((_, i) => Array.from({ length: Math.round(DC * FPS) }, (_, j) => src(i, j))))};
window.render=async(t)=>{const s=t<T.g?'sc':t<T.f?'gr':'fi';['sc','gr','fi'].forEach(x=>$(x).style.display=x===s?'block':'none');$('mk').querySelector('i').style.background=s==='fi'?'#fff':'#c8322a';
 if(s==='sc'){const intro=t<TI,i=intro?0:Math.min(C.length-1,Math.floor((t-TI)/DC)),u=intro?0:t-TI-i*DC,j=Math.min(SRC[i].length-1,Math.floor(u*FPS));
  const im=$('ph'),nu=SRC[i][j];if(!im.src.endsWith(nu)){im.src=nu;await im.decode().catch(()=>{});}
  const kb=C[i].v?1:1.04+0.06*(u/DC);im.style.transform='scale('+(intro?1.12:kb)+')';im.style.filter=intro?'blur('+(28*(1-ez((t-TI+0.5)/0.5)))+'px) brightness(.55)':'none';
  if(t>TI-0.5&&intro){const a=ez((t-TI+0.5)/0.5);im.style.filter='blur('+(28*(1-a))+'px) brightness('+(0.55+0.45*a)+')';}
  $('in').style.display=intro?'block':'none';$('in').style.opacity=intro?1-ez((t-TI+0.4)/0.4):0;$('in').firstChild.style.transform='translateY('+(40*(1-ez(t/0.6)))+'px)';
  ['bars','lb','ov'].forEach(x=>$(x).style.display=intro?'none':'');
  if(!intro){[...$('bars').children].forEach((b,k)=>b.firstChild.style.width=(k<i?100:k>i?0:100*u/DC)+'%');$('ch').textContent=C[i].citta;$('cr').textContent=C[i].cr;
   const a=ez(u/0.35);$('ch').style.transform='translateX('+(-80*(1-a))+'px)';$('ch').style.opacity=a;$('cr').style.opacity=ez((u-0.2)/0.35);}}
 if(s==='gr'){const u=t-T.g;$('gr').firstChild.style.transform='translateY('+(40*(1-ez(u/0.5)))+'px)';$('gr').firstChild.style.opacity=ez(u/0.4);$('g2').style.opacity=ez((u-0.8)/0.4);}
 if(s==='fi'){const u=t-T.f;$('fi').firstChild.style.transform='translateY('+(40*(1-ez(u/0.5)))+'px)';$('cd').style.opacity=ez((u-0.8)/0.4);$('sg').style.transform='scale('+(0.8+0.2*ez((u-1.3)/0.35))+')';$('sg').style.opacity=ez((u-1.3)/0.3);}};
</script></body></html>`;
fs.writeFileSync(`${D}/reel.html`, html);
const b = await chromium.launch({ executablePath: CHROME, args: ['--allow-file-access-from-files'] }); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
await p.goto('file://' + D + '/reel.html'); await p.evaluate(() => document.fonts.ready);
await p.evaluate((x) => window.render(x), 1.2); await p.screenshot({ path: `${D}/copertina.png` });
for (const [t, n] of [[TI + 1.2, 'k1'], [T.g + 2, 'k2'], [TOT - 0.3, 'k3']]) { await p.evaluate((x) => window.render(x), t); await p.screenshot({ path: `${D}/${n}.png` }); }
if (process.argv[3] !== 'prova') {
  const F = `${D}/fotogrammi`; fs.rmSync(F, { recursive: true, force: true }); fs.mkdirSync(F);
  for (let i = 0; i < Math.round(TOT * FPS); i++) { await p.evaluate((x) => window.render(x), i / FPS); await p.screenshot({ path: `${F}/f${String(i).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 90 }); }
  const Cv = 0.6, tb = [0.4, ...C.map((_, i) => TI + i * DC), T.g].map((x) => (Cv + x).toFixed(2)).join(',');
  execSync(`python3 ${path.dirname(new URL(import.meta.url).pathname)}/suoni.py ${D}/bling.wav ${(Cv + TOT).toFixed(2)} "${tb}" ${(Cv + T.f + 1.3).toFixed(2)}`);
  execSync(`ffmpeg -v error -y -loop 1 -framerate 30 -t ${Cv} -i ${D}/copertina.png -framerate ${FPS} -i ${F}/f%04d.jpg -i ${D}/bling.wav -filter_complex "[0:v]format=yuv420p,setsar=1[c];[1:v]format=yuv420p,setsar=1[r];[c][r]concat=n=2:v=1:a=0[v]" -map "[v]" -map 2:a -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac -b:a 160k -shortest -movflags +faststart ${D}/reel-community.mp4`);
  console.log('video', TOT.toFixed(1) + 's');
}
await b.close(); console.log('ok', TOT.toFixed(1));
