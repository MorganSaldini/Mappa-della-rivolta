import { execSync } from 'node:child_process'; import { chromium } from 'playwright-core'; import { cssBase, rendi } from './motore.mjs';
const N = 52; const T = [0, 3.4, 6.9, 10.4, 13.9, 17.2], TOT = 21;
const k = (c) => `font:700 40px T;letter-spacing:.12em;text-transform:uppercase;color:${c}`;
const html = `<!doctype html><html><head><meta charset="utf-8"><style>${cssBase}.l{position:absolute;inset:0;opacity:0}</style></head><body style="background:#1c1b1f">
<div class="l" id="s0" style="opacity:1;background:#1c1b1f;color:#fff;padding:560px 80px"><p style="${k('#ff8f86')}">Lo sapevi?</p><p style="font:800 170px/.86 T;text-transform:uppercase;margin-top:20px">Nel 1943<br>scioperare<br>era reato.</p><p style="font:600 50px/1.3 C;margin-top:34px;color:#e8e4dd">C'era il fascismo. E c'era la guerra.</p></div>
<div class="l" id="s1" style="background:#f6f3ee;padding:470px 80px"><p style="${k('#c8322a')}">Torino · 5 marzo 1943</p><p id="ora" style="font:800 300px/.85 T;margin-top:20px">ore 10</p><p style="font:600 56px/1.3 C;margin-top:40px">Officina 19 della Fiat Mirafiori.</p><p style="font:800 80px/1 T;text-transform:uppercase;margin-top:20px;color:#c8322a">Gli operai si fermano.</p></div>
<div class="l" id="s2" style="background:#c8322a;color:#fff;padding:520px 80px"><p style="${k('#ffd5d1')}">In pochi giorni</p><p id="cnt" style="font:800 250px/.9 T;margin-top:16px">0</p><p style="font:800 84px/.95 T;text-transform:uppercase;margin-top:20px">lavoratori incrociano<br>le braccia.</p><p style="font:600 52px/1.3 C;margin-top:34px">Poi tocca a Milano.</p></div>
<div class="l" id="s3" style="background:#1c1b1f;color:#fff;padding:580px 80px"><p style="${k('#ff8f86')}">Cosa chiedevano?</p><p style="font:800 120px/.9 T;text-transform:uppercase;margin-top:20px">Soldi per<br>il carovita.</p><p id="vinto" style="font:800 150px/.88 T;text-transform:uppercase;margin-top:50px;color:#ff4b3e;opacity:0">E li hanno<br>ottenuti.</p></div>
<div class="l" id="s4" style="background:#f6f3ee;padding:540px 80px"><p style="${k('#c8322a')}">83 anni dopo</p><p style="font:800 130px/.88 T;text-transform:uppercase;margin-top:20px">Venerdì 20<br>novembre.</p><p style="font:600 56px/1.3 C;margin-top:30px">Sciopero generale, contro il carovita.</p><p style="font:800 90px T;color:#c8322a;margin-top:40px">${N} città sulla mappa.</p></div>
<div class="l" id="s5" style="background:#1c1b1f;color:#fff;padding:480px 80px"><p style="font:800 140px/.88 T;text-transform:uppercase">Condividi<br>con chi vuole<br><span style="color:#ff8f86">scioperare.</span></p><p style="font:800 70px T;margin-top:50px">mappadellarivolta.org</p>
<div style="display:inline-flex;align-items:center;gap:22px;margin-top:40px;background:#fff;color:#1c1b1f;padding:22px 36px;border-radius:60px;font:800 56px T"><span style="background:#c8322a;color:#fff;border-radius:40px;padding:4px 22px;font-size:42px">+ Segui</span>@mappadellarivolta</div>
<p style="font:600 28px/1.4 C;color:#c9c5bf;margin-top:60px">Fonti: Wikipedia, voci "Storia del Regno d'Italia (1922-1943)" e "5 marzo"; schede della mappa. La mappa riporta informazioni pubbliche con la loro fonte.</p></div>
<div class="m" style="z-index:9"><i></i>Mappa della Rivolta</div><script>
const T=${JSON.stringify(T)};const $=(q)=>document.querySelector(q),cl=(v)=>Math.max(0,Math.min(1,v)),ez=(v)=>1-Math.pow(1-cl(v),3);
window.render=(t)=>{for(let i=0;i<6;i++){const a=T[i],b=T[i+1]??99;const el=$('#s'+i);el.style.opacity=i===0?1-cl((t-b+0.2)/0.25):cl((t-a)/0.25)*(1-cl((t-b)/0.25));el.style.transform='translateY('+(i?36*(1-ez((t-a)/0.5)):0)+'px)';}
 $('#ora').style.transform='scale('+(1.25-0.25*ez((t-T[1])/0.6))+')';$('#ora').style.transformOrigin='left center';
 $('#cnt').textContent=Math.round(100000*ez((t-T[2]-0.2)/1.8)/1000)*1000===100000?'100.000':(Math.round(100000*ez((t-T[2]-0.2)/1.8)/1000)*1000).toLocaleString('it-IT');
 $('#vinto').style.opacity=cl((t-T[3]-1.5)/0.25);
 const s=T.filter(x=>x<=t).length-1;$('.m').style.color=(s===1||s===4)?'#1c1b1f':'#fff';$('.m i').style.background=s===2?'#fff':'#c8322a';};
</script></body></html>`;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--lang=it-IT'] }); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
await p.setContent(html); await p.evaluate(() => document.fonts.ready);
for (const t of [2, 5.5, 9.5, 13, 16.5, 20]) { await p.evaluate((t) => window.render(t), t); await p.screenshot({ path: `out/r43-${t}.png` }); }
await p.evaluate(() => window.render(2)); await p.screenshot({ path: 'out/cover-1943.png' }); await b.close();
if (process.argv[2] === 'video') {
 await rendi({ html, durata: TOT, uscita: 'out/r43-muto.mp4', cartella: 'out/f-r43' }); const Cv = 0.6;
 execSync(`python3 suoni.py out/bling-r43.wav ${(Cv + TOT).toFixed(2)} "${[0.15, ...T.slice(1), T[3] + 1.5].map((x) => (Cv + x).toFixed(2)).join(',')}" ${(Cv + T[5]).toFixed(2)}`);
 execSync(`ffmpeg -v error -y -loop 1 -framerate 30 -t ${Cv} -i out/cover-1943.png -i out/r43-muto.mp4 -i out/bling-r43.wav -filter_complex "[0:v]format=yuv420p,setsar=1[c];[1:v]format=yuv420p,setsar=1[r];[c][r]concat=n=2:v=1:a=0[v]" -map "[v]" -map 2:a -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac -b:a 160k -shortest -movflags +faststart out/reel-1943.mp4`);
}
