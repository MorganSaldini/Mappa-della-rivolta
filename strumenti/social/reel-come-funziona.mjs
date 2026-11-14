// Reel informativo "Come funziona la mappa" (4 passi). Uso: node reel-come-funziona.mjs [video]
import fs from 'node:fs'; import { execSync } from 'node:child_process'; import { chromium } from 'playwright-core';
import { cssBase, rendi, pathItalia, xy, W, H, CHROME, COL } from './motore.mjs';
const ev = JSON.parse(fs.readFileSync('/home/claude/mappa-della-rivolta/public/dati/eventi.json')).eventi.filter((e) => e.data >= '2026-11-14' && e.lat && e.stato !== 'nascosto');
const PT = ev.map((e) => { const [x, y] = xy(e.lat, e.lng); return { x, y, c: COL[e.tipo] || COL.altro, v: e.stato === 'verificato' }; });
const T = [0, 2.6, 7.0, 11.6, 16.0, 19.6], TOT = 24;
const css = cssBase + `.lay{display:none}.k{font:700 40px T;letter-spacing:.12em;text-transform:uppercase;color:#c8322a}
.st{position:absolute;left:80px;right:80px;top:300px}.nu{display:inline-flex;align-items:center;justify-content:center;width:96px;height:96px;border-radius:50%;background:#c8322a;color:#fff;font:800 64px T}
.h{font:800 128px/.9 T;text-transform:uppercase;margin-top:22px}.tx{font:600 50px/1.32 C;margin-top:26px}
.ph{position:absolute;left:110px;right:110px;top:930px;height:640px;background:#fff;border-radius:44px;box-shadow:0 20px 60px rgba(0,0,0,.12);overflow:hidden}
.in{margin:34px 40px 0;border:3px solid #d8d2c8;border-radius:22px;padding:22px 26px;font:600 38px C;color:#8a8590}.in b{color:#1c1b1f;font-weight:600}
.btn{display:inline-block;background:#c8322a;color:#fff;font:800 48px T;padding:18px 34px;border-radius:20px}.lg{display:flex;flex-wrap:wrap;gap:12px 26px;margin:24px 40px 0;font:600 30px C}.lg i{display:inline-block;width:24px;height:24px;border-radius:50%;margin-right:10px;vertical-align:-3px}`;
const html = `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>
<div class="lay" id="s0" style="background:#c8322a;color:#fff"><div class="st" style="top:420px"><p class="k" style="color:#ffd5d1">Mappa della Rivolta</p><p style="font:800 200px/.86 T;text-transform:uppercase;margin-top:18px">Come<br>funziona<br>la mappa?</p><p class="tx" style="font-size:58px">In 4 passi. Ti bastano 20 secondi.</p></div>
<svg viewBox="0 0 ${W} ${H}" style="position:absolute;right:-120px;top:1080px;width:600px;height:700px;opacity:.9"><path d="${pathItalia}" fill="#a82820"/>${PT.map((p) => `<circle class="p0" cx="${p.x}" cy="${p.y}" r="9" fill="#fff"/>`).join('')}</svg></div>
<div class="lay" id="s1"><div class="st"><span class="nu">1</span><p class="h">Cerca</p><p class="tx">Scrivi la tua città o tocca «Vicino a me». Ogni colore è un tipo di mobilitazione.</p></div>
<div class="ph"><div class="in" id="q"><b id="qt"></b><span id="qc">|</span></div><div style="margin:18px 40px 0;font:600 34px C;color:#c8322a">📍 Vicino a me</div>
<div class="lg">${[['sciopero_generale', 'Sciopero generale'], ['corteo', 'Corteo'], ['presidio', 'Presidio'], ['sciopero_categoria', 'Sciopero di categoria'], ['assemblea', 'Assemblea']].map(([k, n]) => `<span><i style="background:${COL[k]}"></i>${n}</span>`).join('')}</div>
<svg viewBox="0 0 ${W} ${H}" style="position:absolute;left:300px;top:345px;width:260px;height:290px"><path d="${pathItalia}" fill="#ece6dc"/>${PT.map((p) => `<circle class="p1" cx="${p.x}" cy="${p.y}" r="10" fill="${p.c}"/>`).join('')}</svg></div></div>
<div class="lay" id="s2"><div class="st"><span class="nu">2</span><p class="h">Aggiungi</p><p class="tx">Senza registrarti. Serve solo il link alla fonte: comunicato, locandina, sito del sindacato.</p></div>
<div class="ph" style="padding-top:30px"><div style="margin:0 40px"><span class="btn" id="ad">+ Aggiungi un luogo</span></div>
${[['Che cosa', 'Corteo contro il carovita'], ['Quando', 'Venerdì 20, ore 9:30'], ['Dove', 'Piazza della tua città'], ['Fonte', 'https://… (obbligatoria)']].map(([l, v], i) => `<div class="in f2" style="margin-top:${i ? 16 : 30}px;${i === 3 ? 'border-color:#c8322a' : ''}">${l}: <b>${v}</b></div>`).join('')}</div></div>
<div class="lay" id="s3"><div class="st"><span class="nu">3</span><p class="h">Si verifica</p><p class="tx">Un moderatore volontario controlla la fonte. Finché non lo fa, il punto resta tratteggiato.</p></div>
<div class="ph" style="display:flex;align-items:center;justify-content:center;gap:70px"><div style="text-align:center"><svg width="200" height="200"><circle cx="100" cy="100" r="70" fill="none" stroke="#c8322a" stroke-width="12" stroke-dasharray="22 16"/></svg><p style="font:700 40px T;text-transform:uppercase;color:#8a8590;margin-top:16px">Da verificare</p></div>
<svg width="90" height="60" id="ar"><path d="M0 30H70M50 8 76 30 50 52" fill="none" stroke="#1c1b1f" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/></svg>
<div style="text-align:center" id="ve"><svg width="200" height="200"><circle cx="100" cy="100" r="76" fill="#c8322a"/><path id="ck" d="M62 102 90 128 142 74" fill="none" stroke="#fff" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="120" stroke-dashoffset="120"/></svg><p style="font:700 40px T;text-transform:uppercase;color:#c8322a;margin-top:16px">Verificato</p></div></div></div>
<div class="lay" id="s4" style="background:#1c1b1f;color:#fff"><div class="st"><span class="nu">4</span><p class="h">Niente dati<br>personali</p></div>
<div style="position:absolute;left:80px;right:80px;top:870px">${['Non chiediamo nome né email.', 'Non salviamo il tuo indirizzo IP.', 'Chi organizza si indica solo con la sigla.', 'Niente pubblicità, niente tracciamento.'].map((x) => `<p class="r4" style="font:600 54px/1.3 C;border-top:3px solid #3a383e;padding:28px 0">${x}</p>`).join('')}</div></div>
<div class="lay" id="s5" style="background:#c8322a;color:#fff"><div class="st" style="top:380px"><p class="k" style="color:#ffd5d1">Provala adesso</p><p style="font:800 104px/.95 T;margin-top:18px">mappadellarivolta.org</p><p class="tx" style="font-size:46px;color:#ffe9e6">Il link è in bio.</p>
<p id="cd" style="font:800 116px/.9 T;text-transform:uppercase;margin-top:70px">Condividi<br>con chi vuole<br>scioperare.</p>
<div id="sg" style="display:inline-flex;align-items:center;gap:22px;margin-top:50px;background:#fff;color:#1c1b1f;padding:22px 36px;border-radius:60px;font:800 54px T"><span style="background:#c8322a;color:#fff;border-radius:40px;padding:4px 24px;font-size:40px">+ Segui</span>@mappadellarivolta</div>
<p style="font:600 34px C;margin-top:40px">♥ Gratis e senza pubblicità: se puoi, sostienila con un caffè.</p><p style="font:600 26px/1.4 C;margin-top:30px;color:#ffe1de">La mappa riporta informazioni pubbliche con la loro fonte.</p></div></div>
<div class="m" id="mk"><i></i>Mappa della Rivolta</div>
<script>
const T=${JSON.stringify(T)};const cl=(x)=>Math.max(0,Math.min(1,x)),ez=(x)=>1-Math.pow(1-cl(x),3),$=(i)=>document.getElementById(i),A=(q)=>[...document.querySelectorAll(q)];
const up=(e,u,d=0)=>{const a=ez((u-d)/0.45);e.style.opacity=a;e.style.transform='translateY('+(50*(1-a))+'px)';};
window.render=(t)=>{let s=0;for(let i=0;i<T.length;i++)if(t>=T[i])s=i;for(let i=0;i<6;i++)$('s'+i).style.display=i===s?'block':'none';const u=t-T[s];
 const dk=s===0||s===4||s===5;$('mk').style.color=dk?'#fff':'#1c1b1f';$('mk').querySelector('i').style.background=s===0||s===5?'#fff':'#c8322a';$('mk').style.display=s===0?'none':'flex';
 const st=$('s'+s).querySelector('.st');if(st)up(st,u);
 if(s===0)A('.p0').forEach((c,i)=>c.style.opacity=ez((u-0.3-i*0.012)/0.2));
 if(s===1){const w='Bologna',n=Math.round(cl((u-0.9)/1.0)*w.length);$('qt').textContent=w.slice(0,n);$('qc').style.opacity=Math.floor(u*3)%2;if(n===0){$('qt').textContent='';}
  A('.p1').forEach((c,i)=>{const a=ez((u-1.9-i*0.01)/0.25);c.setAttribute('r',10*a);});up($('s1').querySelector('.ph'),u,0.4);}
 if(s===2){up($('s2').querySelector('.ph'),u,0.4);const p=1+0.08*Math.max(0,Math.sin(Math.PI*cl((u-1.0)/0.4)));$('ad').style.transform='scale('+p+')';A('.f2').forEach((e,i)=>up(e,u,1.5+i*0.45));}
 if(s===3){up($('s3').querySelector('.ph'),u,0.4);$('ar').style.opacity=ez((u-1.4)/0.3);const a=ez((u-1.9)/0.4);$('ve').style.opacity=a;$('ve').style.transform='scale('+(0.7+0.3*a)+')';$('ck').setAttribute('stroke-dashoffset',120*(1-ez((u-2.3)/0.4)));}
 if(s===4)A('.r4').forEach((e,i)=>up(e,u,0.6+i*0.5));
 if(s===5){$('cd').style.opacity=ez((u-0.9)/0.4);$('sg').style.opacity=ez((u-1.4)/0.3);$('sg').style.transform='scale('+(0.8+0.2*ez((u-1.4)/0.35))+')';}};
</script></body></html>`;
const b = await chromium.launch({ executablePath: CHROME }); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
await p.setContent(html); await p.evaluate(() => document.fonts.ready);
for (const [t, n] of [[2.3, 'cover'], [6.6, 'k1'], [11.2, 'k2'], [15.6, 'k3'], [19.4, 'k4'], [23.8, 'k5']]) { await p.evaluate((x) => window.render(x), t); await p.screenshot({ path: `out/cf-${n}.png` }); }
await b.close();
if (process.argv[2] === 'video') {
  await rendi({ html, durata: TOT, uscita: 'out/cf-muto.mp4', cartella: 'out/f-cf' }); const Cv = 0.6;
  execSync(`python3 suoni.py out/bling-cf.wav ${(Cv + TOT).toFixed(2)} "${[0.4, ...T.slice(1, 5)].map((x) => (Cv + x).toFixed(2)).join(',')}" ${(Cv + T[5] + 0.3).toFixed(2)}`);
  execSync(`ffmpeg -v error -y -loop 1 -framerate 30 -t ${Cv} -i out/cf-cover.png -i out/cf-muto.mp4 -i out/bling-cf.wav -filter_complex "[0:v]format=yuv420p,setsar=1[c];[1:v]format=yuv420p,setsar=1[r];[c][r]concat=n=2:v=1:a=0[v]" -map "[v]" -map 2:a -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac -b:a 160k -shortest -movflags +faststart out/reel-come-funziona.mp4`);
}
console.log('ok');
