// Reel MAPPA "Cosa puoi fare dalla scheda di un evento" (5 tasti). Uso: node reel-scheda.mjs [video]
// Scheda d'esempio: evento verificato del 5/12 a Roma (dati /api/mobilitazioni del 26/11/2026). Etichette come in public/app.js.
import { execSync } from 'node:child_process'; import { chromium } from 'playwright-core';
import { cssBase, rendi, pathItalia, W, H, CHROME, COL } from './motore.mjs';
const T = [0, 2.6, 6.2, 9.8, 13.4, 17.0, 20.4], TOT = 25;
const PASSI = [
  ['Apri la scheda', 'Tocca un punto sulla mappa: cosa, quando, dove, chi la promuove e il link alla fonte.', 'fo'],
  ['👍 Confermo', "Hai visto anche tu il comunicato? Conferma: aiuta i moderatori a verificare prima.", 'b1'],
  ['🙋 Ci sarò', 'Fai sapere che ci sarai. Conta solo il totale: nessun dato su di te.', 'b0'],
  ['✏️ Correggi · ⚠️ Segnala', "Orario sbagliato? Proponi la correzione. Qualcosa non va? Segnalalo ai moderatori.", 'b2'],
  ['Nel calendario', 'Un tocco e la data finisce nel tuo calendario, Google o Apple.', 'ca']];
const css = cssBase + `.lay{display:none}.k{font:700 40px T;letter-spacing:.12em;text-transform:uppercase;color:#c8322a}
.st{position:absolute;left:80px;right:80px;top:290px}.h{font:800 112px/.92 T;text-transform:uppercase;margin-top:18px}.tx{font:600 48px/1.3 C;margin-top:24px}
.ph{position:absolute;left:100px;right:100px;top:880px;height:760px;background:#fff;border-radius:44px;box-shadow:0 20px 60px rgba(0,0,0,.14);overflow:hidden;padding:40px 44px;font:400 34px/1.35 C}
.ph h3{font:700 46px/1.1 C;margin:18px 0 12px}.ph p{margin:6px 0}.ph a{color:#2a5db0;font-weight:600}.tag{display:inline-block;font:700 28px C;color:#fff;border-radius:30px;padding:4px 18px;margin-right:10px}
.bt{display:inline-block;border:3px solid #d8d2c8;border-radius:18px;padding:10px 18px;font:600 30px C;margin:14px 10px 0 0;position:relative}.cs{display:flex;align-items:center;gap:18px;margin-top:20px;font:600 28px C;color:#6a6670}
.on{border-color:#c8322a!important;background:#fdeceb;transform:scale(1.08)}.ri{position:absolute;width:120px;height:120px;border-radius:50%;border:8px solid #c8322a;pointer-events:none}`;
const scheda = (n) => `<div class="ph" id="ph${n}"><span class="tag" style="background:${COL.corteo}">Corteo</span><span class="tag" style="background:#2e7d4f">Verificato</span>
<h3>Manifestazione nazionale della sanità pubblica</h3><p><b>Sabato 5 dicembre</b>, ore 15:00</p><p>Piazza Vittorio Emanuele II, Roma (RM)</p>
<p>Promosso da: Anaao Assomed, FP CGIL e altre sigle</p><p><a class="fo">Fonte ↗</a></p>
<div class="cs"><span class="bt b0">🙋 Ci sarò</span>Fai sapere che ci sarai</div>
<div><span class="bt b1">👍 Confermo</span><span class="bt b2">✏️ Correggi</span><span class="bt b2">⚠️ Segnala</span></div>
<p style="margin-top:18px;font-size:30px">📅 Aggiungi al calendario: <a class="ca">Google</a> · <a class="ca">Apple / Outlook</a></p><div class="ri"></div></div>`;
const html = `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>
<div class="lay" id="s0" style="background:#1c1b1f;color:#fff"><div class="st" style="top:400px"><p class="k" style="color:#ff8f86">La mappa, istruzioni per l'uso</p><p style="font:800 190px/.86 T;text-transform:uppercase;margin-top:18px">Tocca<br>un punto.</p><p class="tx" style="font-size:58px;color:#e8e4dd">Ogni scheda ha 5 tasti. Ecco a cosa servono.</p></div>
<svg viewBox="0 0 ${W} ${H}" style="position:absolute;right:-80px;top:1120px;width:520px;height:600px"><path d="${pathItalia}" fill="#34313a"/><circle id="pu" cx="430" cy="560" r="22" fill="#c8322a" stroke="#fff" stroke-width="6"/></svg></div>
${PASSI.map(([t, x], i) => `<div class="lay" id="s${i + 1}"><div class="st"><p class="k">${i + 1} di 5</p><p class="h">${t}</p><p class="tx">${x}</p></div>${scheda(i + 1)}</div>`).join('')}
<div class="lay" id="s6" style="background:#c8322a;color:#fff"><div class="st" style="top:380px"><p class="k" style="color:#ffd5d1">Provala adesso</p><p style="font:800 104px/.95 T;margin-top:18px">mappadellarivolta.org</p><p class="tx" style="font-size:46px;color:#ffe9e6">Il link è in bio. Niente account, niente pubblicità.</p>
<p id="cd" style="font:800 116px/.9 T;text-transform:uppercase;margin-top:70px">Mandala a chi<br>chiede sempre<br>«ma quando?»</p>
<div id="sg" style="display:inline-flex;align-items:center;gap:22px;margin-top:50px;background:#fff;color:#1c1b1f;padding:22px 36px;border-radius:60px;font:800 54px T"><span style="background:#c8322a;color:#fff;border-radius:40px;padding:4px 24px;font-size:40px">+ Segui</span>@mappadellarivolta</div>
<p style="font:600 26px/1.4 C;margin-top:40px;color:#ffe1de">La mappa riporta informazioni pubbliche con la loro fonte.</p></div></div>
<div class="m" id="mk"><i></i>Mappa della Rivolta</div>
<script>
const T=${JSON.stringify(T)},SEL=${JSON.stringify(PASSI.map((p) => p[2]))};const cl=(x)=>Math.max(0,Math.min(1,x)),ez=(x)=>1-Math.pow(1-cl(x),3),$=(i)=>document.getElementById(i);
const up=(e,u,d=0)=>{const a=ez((u-d)/0.45);e.style.opacity=a;e.style.transform='translateY('+(50*(1-a))+'px)';};
window.render=(t)=>{let s=0;for(let i=0;i<T.length;i++)if(t>=T[i])s=i;for(let i=0;i<7;i++)$('s'+i).style.display=i===s?'block':'none';const u=t-T[s];
 $('mk').style.color=s===0||s===6?'#fff':'#1c1b1f';$('mk').querySelector('i').style.background=s===6?'#fff':'#c8322a';$('mk').style.display=s===0?'none':'flex';
 const st=$('s'+s).querySelector('.st');up(st,u);
 if(s===0){const a=0.5+0.5*Math.sin(u*5);$('pu').setAttribute('r',22+10*a);}
 if(s>=1&&s<=5){const ph=$('ph'+s);up(ph,u,0.3);const els=[...ph.querySelectorAll('.'+SEL[s-1])],on=u>1.3;
  ph.querySelectorAll('.bt').forEach(b=>b.classList.remove('on'));if(on)els.forEach(b=>b.classList.contains('bt')&&b.classList.add('on'));
  if(SEL[s-1]==='b0'&&u>1.6){const b=els[0];b.textContent='🙋 Ci sarò ✓';b.style.background='#c8322a';b.style.color='#fff';}
  const r=ph.querySelector('.ri'),e=els[0],pr=ph.getBoundingClientRect(),q=e.getBoundingClientRect(),k=cl((u-1.0)/0.5);
  r.style.left=(q.left-pr.left+q.width/2-60)+'px';r.style.top=(q.top-pr.top+q.height/2-60)+'px';r.style.opacity=k>0&&k<1?1-k:0;r.style.transform='scale('+(0.4+0.9*k)+')';
  if(SEL[s-1]==='fo'||SEL[s-1]==='ca')els.forEach(a=>{a.style.background=on?'#fdeceb':'none';a.style.outline=on?'3px solid #c8322a':'none';});}
 if(s===6){$('cd').style.opacity=ez((u-0.9)/0.4);$('sg').style.opacity=ez((u-1.4)/0.3);$('sg').style.transform='scale('+(0.8+0.2*ez((u-1.4)/0.35))+')';}};
</script></body></html>`;
const b = await chromium.launch({ executablePath: CHROME }); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
await p.setContent(html); await p.evaluate(() => document.fonts.ready);
for (const [t, n] of [[2.3, 'cover'], [5.9, 'k1'], [9.5, 'k2'], [13.1, 'k3'], [16.7, 'k4'], [20.1, 'k5'], [24.8, 'k6']]) { await p.evaluate((x) => window.render(x), t); await p.screenshot({ path: `out/sc-${n}.png` }); }
await b.close();
if (process.argv[2] === 'video') {
  await rendi({ html, durata: TOT, uscita: 'out/sc-muto.mp4', cartella: 'out/f-sc' }); const Cv = 0.6;
  execSync(`python3 suoni.py out/bling-sc.wav ${(Cv + TOT).toFixed(2)} "${[0.4, ...T.slice(1, 6)].map((x) => (Cv + x).toFixed(2)).join(',')}" ${(Cv + T[6] + 0.3).toFixed(2)}`);
  execSync(`ffmpeg -v error -y -loop 1 -framerate 30 -t ${Cv} -i out/sc-cover.png -i out/sc-muto.mp4 -i out/bling-sc.wav -filter_complex "[0:v]format=yuv420p,setsar=1[c];[1:v]format=yuv420p,setsar=1[r];[c][r]concat=n=2:v=1:a=0[v]" -map "[v]" -map 2:a -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac -b:a 160k -shortest -movflags +faststart out/reel-scheda.mp4`);
}
console.log('ok');
