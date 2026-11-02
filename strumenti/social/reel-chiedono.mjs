import fs from 'node:fs'; import { execSync } from 'node:child_process'; import { chromium } from 'playwright-core'; import { cssBase, rendi } from './motore.mjs';
const img = (n) => 'data:image/jpeg;base64,' + fs.readFileSync(`foto30/${n}.jpg`).toString('base64');
const R = [['milano', 'Stipendi che<br>reggano i prezzi', '−8%', 'quanto valgono oggi gli stipendi rispetto a gennaio 2021, tolta l\'inflazione.'],
 ['pescara', 'Bollette e affitti<br>più bassi', '+22,6%', 'quanto è salita l\'energia in un anno, a settembre.'],
 ['brescia', 'Più soldi a sanità<br>e scuola', '5,8 milioni', 'di persone nel 2024 hanno rinunciato a visite ed esami.'],
 ['catania', 'Meno soldi<br>alle armi', '13 miliardi', 'per nuove armi nel 2026. Il 60% in più rispetto al 2022.']];
const TI = 2.4, DR = 3.3, T2 = TI + DR * R.length, T3 = T2 + 2.6, TOT = T3 + 3.3;
const html = `<!doctype html><html><head><meta charset="utf-8"><style>${cssBase}
.l{position:absolute;inset:0;opacity:0;overflow:hidden;background:#1c1b1f}.l>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.sh{position:absolute;inset:0;background:linear-gradient(#0008,#0002 30%,#000c 62%)}
.tx{position:absolute;left:70px;right:70px;top:1000px;color:#fff}.ch{font:700 38px T;letter-spacing:.12em;text-transform:uppercase;color:#ffb3ad}
.ti{display:inline;font:800 104px/1.12 T;text-transform:uppercase;background:#c8322a;padding:0 16px;box-decoration-break:clone;-webkit-box-decoration-break:clone}
.nu{font:800 150px/.9 T;margin-top:46px}.de{font:600 44px/1.3 C;margin-top:12px;max-width:880px}
#fine{position:absolute;inset:0;background:#f6f3ee;padding:320px 80px;opacity:0}#venti{position:absolute;inset:0;background:#c8322a;color:#fff;padding:400px 80px;opacity:0}
</style></head><body>
<div class="l" id="i0" style="opacity:1"><img src="${img('bologna')}"><div class="sh"></div><div class="tx" style="top:900px"><p style="font:800 140px/.9 T;text-transform:uppercase">Venerdì in piazza.<br><span style="color:#ffb3ad">Ma per chiedere cosa?</span></p><p class="de" style="margin-top:30px">Abbiamo letto le piattaforme di chi ha organizzato.</p></div></div>
${R.map(([f, t, n, d], i) => `<div class="l" id="r${i}"><img src="${img(f)}"><div class="sh"></div><div class="tx"><p class="ch">Chiedono · ${i + 1}</p><p style="margin-top:18px"><span class="ti">${t}</span></p><p class="nu">${n}</p><p class="de">${d}</p></div></div>`).join('')}
<div id="venti"><p style="font:700 38px T;letter-spacing:.12em;text-transform:uppercase;color:#ffd5d1">Si torna in piazza</p><p style="font:800 230px/.85 T;text-transform:uppercase;margin-top:20px">20<br>novembre</p><p style="font:800 64px T;text-transform:uppercase;margin-top:20px">Sciopero generale CGIL</p><p style="font:600 44px/1.3 C;margin-top:20px">Le piazze sono già sulla mappa.</p></div>
<div id="fine"><p style="font:800 140px/.9 T;text-transform:uppercase">Guarda<br>il motivo,<br><span style="color:#c8322a">non il rumore.</span></p>
<p style="font:800 66px T;margin-top:60px">Seguici: <span style="color:#c8322a">@mappadellarivolta</span></p><p style="font:600 42px/1.3 C;margin-top:16px">mappadellarivolta.org</p>
<p style="font:600 27px/1.4 C;color:#5f5d66;margin-top:70px">Richieste: piattaforme USB e Cobas (Euronews, 29/10). Dati: Istat; Fondazione Gimbe; Osservatorio Milex 2026.<br>La mappa riporta informazioni pubbliche con la loro fonte.</p></div>
<div class="m" style="color:#fff"><i></i>Mappa della Rivolta</div><script>
const TI=${TI},DR=${DR},T2=${T2},T3=${T3},N=${R.length};const $=(q)=>document.querySelector(q),cl=(v)=>Math.max(0,Math.min(1,v)),ease=(v)=>{v=cl(v);return 1-Math.pow(1-v,3)};
window.render=(t)=>{ $('#i0 img').style.transform='scale('+(1.04+0.05*cl(t/TI))+')'; $('#i0').style.opacity=1-cl((t-TI)/0.3);
 for(let i=0;i<N;i++){const s=TI+i*DR,el=$('#r'+i),u=t-s; el.style.opacity=t<s?0:cl(u/0.3)*(i===N-1?1-cl((t-T2)/0.3):1); el.style.zIndex=2+i;
  el.querySelector('img').style.transform='scale('+(1.03+0.08*cl(u/(DR+0.3)))+') translateY('+(-15*cl(u/DR))+'px)';
  const [c,ti,nu,de]=el.querySelectorAll('.tx>p'); c.style.opacity=cl((u-0.15)/0.3); ti.style.transform='translateX('+(-60*(1-ease((u-0.2)/0.4)))+'px)'; ti.style.opacity=cl((u-0.2)/0.25);
  nu.style.opacity=cl((u-0.9)/0.3); nu.style.transform='translateY('+(40*(1-ease((u-0.9)/0.4)))+'px)'; de.style.opacity=cl((u-1.2)/0.3);}
 $('#venti').style.zIndex=10;$('#venti').style.opacity=cl((t-T2)/0.3)*(1-cl((t-T3)/0.3)); $('#fine').style.zIndex=11;$('#fine').style.opacity=cl((t-T3)/0.3);
 $('.m').style.zIndex=20; $('.m').style.color=t>T3+0.15?'#1c1b1f':'#fff'; $('.m i').style.background=t>T2&&t<T3+0.15?'#fff':'#c8322a';};
</script></body></html>`;
const cover = html.replace('<div class="m"', '<div class="m"').replace('window.render=', 'window.render0=') ;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } }); await p.setContent(html); await p.evaluate(() => document.fonts.ready);
await p.evaluate(() => window.render(1.2)); await p.screenshot({ path: 'out/cover-chiedono.png' });
for (const t of [TI + 2.5, TI + DR + 2.5, TI + 2 * DR + 2.5, TI + 3 * DR + 2.5, T2 + 1.5, T3 + 1.5]) { await p.evaluate((t) => window.render(t), t); await p.screenshot({ path: `out/ch-${t.toFixed(1)}.png` }); }
await b.close();
if (process.argv[2] === 'video') {
 await rendi({ html, durata: TOT, uscita: 'out/chiedono-muto.mp4', cartella: 'out/f-ch' });
 const Cv = 0.6, tempi = [0.15, ...R.map((_, i) => Cv + TI + i * DR + 0.9), Cv + T2 + 0.1];
 execSync(`python3 suoni.py out/bling-ch.wav ${(Cv + TOT).toFixed(2)} "${tempi.map((x) => x.toFixed(2)).join(',')}" ${(Cv + T3).toFixed(2)}`);
 execSync(`ffmpeg -v error -y -loop 1 -framerate 30 -t ${Cv} -i out/cover-chiedono.png -i out/chiedono-muto.mp4 -i out/bling-ch.wav -filter_complex "[0:v]format=yuv420p,setsar=1[c];[1:v]format=yuv420p,setsar=1[r];[c][r]concat=n=2:v=1:a=0[v]" -map "[v]" -map 2:a -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac -b:a 160k -shortest -movflags +faststart out/reel-chiedono.mp4`);
}
console.log((0.6 + TOT).toFixed(1));
