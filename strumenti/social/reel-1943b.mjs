import fs from 'node:fs'; import { execSync } from 'node:child_process'; import { chromium } from 'playwright-core'; import { cssBase, rendi, pathItalia, xy, W, H } from './motore.mjs';
const d = JSON.parse(fs.readFileSync('/home/claude/mappa-della-rivolta/public/dati/eventi.json')).eventi;
const FIX = { pisa: [43.716, 10.401], ferrara: [44.836, 11.62], lucca: [43.843, 10.505], pescara: [42.464, 14.214], salerno: [40.682, 14.768], siena: [43.318, 11.331] };
const ESCL = ['2026-11-20-torino-altro-01', '2026-11-20-roma-sciopero_categoria-01'];
const C = {}; for (const e of d) if (e.stato === 'verificato' && e.fonte && e.data?.startsWith('2026-11-20') && !ESCL.includes(e.id)) { const n = e.comune.trim().toLowerCase(); C[n] = FIX[n] || C[n] || [e.lat, e.lng]; }
const N = Object.keys(C).length; console.log('città', N);
const pts = Object.values(C).sort((a, b) => b[0] - a[0]).map(([la, ln]) => xy(la, ln));
const img = (f) => 'data:image/jpeg;base64,' + fs.readFileSync(f).toString('base64');
const grain = 'data:image/png;base64,' + fs.readFileSync('storiche/grana.png').toString('base64');
const T = [0, 3.8, 7.6, 11.2, 14.6, 17.6, 20.4], TOT = 24;
const k = (c) => `font:700 40px T;letter-spacing:.12em;text-transform:uppercase;color:${c}`;
const dotsGrid = Array.from({ length: 400 }, (_, i) => `<i style="left:${(i % 20) * 46}px;top:${Math.floor(i / 20) * 30}px"></i>`).join('');
const html = `<!doctype html><html><head><meta charset="utf-8"><style>${cssBase}.l{position:absolute;inset:0;opacity:0;overflow:hidden}
.sep{background:#e9dfc9;color:#2a241c}.gr{position:absolute;inset:0;background:url(${grain});mix-blend-mode:multiply;opacity:.35}
#grid{position:absolute;left:80px;top:1060px;width:920px;height:600px}#grid i{position:absolute;width:30px;height:22px;border-radius:11px 11px 4px 4px;background:#fff;opacity:0}
.ph{position:absolute;inset:0;background-size:cover;background-position:center;opacity:0}
#stamp{position:absolute;left:110px;top:1160px;border:14px solid #ff4b3e;color:#ff4b3e;font:800 170px/1 T;text-transform:uppercase;padding:10px 40px;transform:rotate(-8deg);opacity:0;border-radius:18px}
</style></head><body style="background:#1c1b1f">
<div class="l sep" id="s0" style="opacity:1"><p id="anno" style="position:absolute;right:-40px;top:300px;font:800 520px/1 T;color:#2a241c;opacity:.08">1943</p><div style="padding:620px 80px;position:relative"><p style="${k('#8a2a20')}">Lo sapevi?</p><p id="tw" style="font:800 170px/.86 T;text-transform:uppercase;margin-top:20px;min-height:440px"></p><p id="s0b" style="font:600 50px/1.3 C;margin-top:30px;opacity:0">C'era il fascismo. E c'era la guerra.</p></div><div class="gr"></div></div>
<div class="l sep" id="s1"><div style="padding:330px 80px"><p style="${k('#8a2a20')}">Torino · 5 marzo 1943</p>
<svg viewBox="-110 -110 220 220" style="width:440px;height:440px;margin-top:40px"><circle r="100" fill="#f6efe0" stroke="#2a241c" stroke-width="8"/>${Array.from({ length: 12 }, (_, i) => `<line x1="0" y1="-84" x2="0" y2="-72" stroke="#2a241c" stroke-width="5" transform="rotate(${i * 30})"/>`).join('')}<line id="hh" x1="0" y1="8" x2="0" y2="-50" stroke="#2a241c" stroke-width="9" stroke-linecap="round"/><line id="mh" x1="0" y1="10" x2="0" y2="-78" stroke="#8a2a20" stroke-width="6" stroke-linecap="round"/><circle r="8" fill="#2a241c"/></svg>
<p style="font:800 120px/.9 T;margin-top:30px">ore 10</p><p style="font:600 54px/1.3 C;margin-top:20px">Officina 19 della Fiat Mirafiori.</p><p id="ferm" style="font:800 96px/1 T;text-transform:uppercase;margin-top:24px;color:#8a2a20;opacity:0">Gli operai<br>si fermano.</p></div><div class="gr"></div></div>
<div class="l" id="s2" style="background:#c8322a;color:#fff"><div style="padding:330px 80px"><p style="${k('#ffd5d1')}">In pochi giorni</p><p id="cnt" style="font:800 250px/.9 T;margin-top:16px">0</p><p style="font:800 84px/.95 T;text-transform:uppercase;margin-top:20px">lavoratori incrociano<br>le braccia.</p></div><div id="grid">${dotsGrid}</div><p id="mil" style="position:absolute;left:80px;top:1440px;font:800 76px T;text-transform:uppercase;opacity:0;background:#1c1b1f;padding:8px 24px">Poi tocca a Milano.</p></div>
<div class="l" id="s3" style="background:#1c1b1f;color:#fff"><div style="padding:560px 80px"><p style="${k('#ff8f86')}">Cosa chiedevano?</p><p style="font:800 130px/.9 T;text-transform:uppercase;margin-top:20px">Soldi per<br>il carovita.</p></div><div id="stamp">Ottenuti</div></div>
<div class="l" id="s4"><div class="ph" id="f0" style="background-image:url(${img('foto30/milano.jpg')})"></div><div class="ph" id="f1" style="background-image:url(${img('foto30/brescia.jpg')})"></div><div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(20,18,22,.1) 30%,rgba(20,18,22,.9) 78%)"></div>
<div style="position:absolute;left:80px;right:80px;top:1080px;color:#fff"><p style="${k('#ff8f86')}">83 anni dopo</p><p style="font:800 140px/.88 T;text-transform:uppercase;margin-top:16px">Venerdì 20<br>novembre.</p><p style="font:600 54px/1.3 C;margin-top:24px">Sciopero generale, contro il carovita.</p></div></div>
<div class="l" id="s5" style="background:#f6f3ee"><svg viewBox="0 0 ${W} ${H}" style="position:absolute;left:110px;top:330px;width:860px;height:1000px"><path d="${pathItalia}" fill="#fff" stroke="#1c1b1f" stroke-width="3"/>${pts.map(([x, y], i) => `<g class="pt" opacity="0"><circle class="h" cx="${x}" cy="${y}" r="16" fill="#c8322a" opacity=".25"/><circle cx="${x}" cy="${y}" r="8" fill="#c8322a" stroke="#fff" stroke-width="2.5"/></g>`).join('')}</svg>
<p style="position:absolute;left:80px;top:1360px;font:800 170px/.9 T;color:#c8322a"><span id="nc">0</span> città</p><p style="position:absolute;left:80px;top:1530px;font:600 50px C">sono già sulla mappa. La tua c'è?</p></div>
<div class="l" id="s6" style="background:#1c1b1f;color:#fff"><div style="padding:480px 80px"><p style="font:800 140px/.88 T;text-transform:uppercase">Condividi<br>con chi vuole<br><span style="color:#ff8f86">scioperare.</span></p><p style="font:800 70px T;margin-top:50px">mappadellarivolta.org</p>
<div id="seg" style="display:inline-flex;align-items:center;gap:22px;margin-top:40px;background:#fff;color:#1c1b1f;padding:22px 36px;border-radius:60px;font:800 56px T"><span style="background:#c8322a;color:#fff;border-radius:40px;padding:4px 22px;font-size:42px">+ Segui</span>@mappadellarivolta</div>
<p style="font:600 28px/1.4 C;color:#c9c5bf;margin-top:60px">Fonti: Wikipedia, voci "Storia del Regno d'Italia (1922-1943)" e "5 marzo"; schede della mappa. Foto della community. La mappa riporta informazioni pubbliche con la loro fonte.</p></div></div>
<div class="m" style="z-index:9"><i></i>Mappa della Rivolta</div><script>
const T=${JSON.stringify(T)},N=${N};const $=(q)=>document.querySelector(q),cl=(v)=>Math.max(0,Math.min(1,v)),ez=(v)=>1-Math.pow(1-cl(v),3);
const TW='Nel 1943<br>scioperare<br>era reato.',raw=TW.replace(/<br>/g,'|');
window.render=(t)=>{for(let i=0;i<7;i++){const a=T[i],b=T[i+1]??99;const el=$('#s'+i);el.style.opacity=i===0?1-cl((t-b+0.2)/0.25):cl((t-a)/0.25)*(1-cl((t-b)/0.25));}
 const n=Math.floor(cl((t-0.3)/1.8)*raw.length);$('#tw').innerHTML=raw.slice(0,n).replace(/\\|/g,'<br>')+(t<2.4&&Math.floor(t*3)%2?'▌':'');
 $('#s0b').style.opacity=cl((t-2.3)/0.4);$('#anno').style.transform='translateX('+(-60*t)+'px)';
 document.querySelectorAll('.gr').forEach(g=>{g.style.backgroundPosition=(Math.floor(t*12)*37%300)+'px '+(Math.floor(t*12)*53%300)+'px';});
 const u=cl((t-T[1]-0.2)/1.4);const tot=-720+ez(u)*720;$('#mh').setAttribute('transform','rotate('+(tot%360*1)+')');$('#hh').setAttribute('transform','rotate('+(270+ez(u)*30)+')');
 $('#ferm').style.opacity=cl((t-T[1]-1.9)/0.3);$('#ferm').style.transform='translateX('+(-80*(1-ez((t-T[1]-1.9)/0.5)))+'px)';
 const c=ez((t-T[2]-0.2)/2.2);const v=Math.round(100000*c/1000)*1000;$('#cnt').textContent=v.toLocaleString('it-IT');
 document.querySelectorAll('#grid i').forEach((e,i)=>{e.style.opacity=(i/400<c)?0.9:0;});
 $('#mil').style.opacity=cl((t-T[2]-2.5)/0.25);$('#mil').style.transform='translateY('+(30*(1-ez((t-T[2]-2.5)/0.4)))+'px)';
 const st=t-T[3]-1.4;$('#stamp').style.opacity=cl(st/0.08);$('#stamp').style.transform='rotate(-8deg) scale('+(st<0?3:1+2*(1-ez(st/0.25)))+')';
 $('#s3').style.transform=st>0.2&&st<0.45?'translate('+(Math.sin(st*90)*12)+'px,'+(Math.cos(st*70)*8)+'px)':'none';
 const p=t-T[4];[['#f0',0,1.6],['#f1',1.5,9]].forEach(([q,a,b])=>{const e=$(q);e.style.opacity=cl((p-a)/0.3)*(1-cl((p-b)/0.3));e.style.transform='scale('+(1.05+0.12*cl((p-a)/2))+')';});
 const q=t-T[5];document.querySelectorAll('.pt').forEach((g,i)=>{const s=q-0.2-i*0.03;g.setAttribute('opacity',cl(s/0.1));g.querySelector('.h').setAttribute('r',16+18*(1-ez(s/0.4)));});
 $('#nc').textContent=Math.min(N,Math.max(0,Math.floor((q-0.2)/0.03)+1));
 $('#seg').style.transform='scale('+(1+0.06*Math.max(0,Math.sin((t-T[6])*5))*(t>T[6]+1))+')';
 const s=T.filter(x=>x<=t).length-1;$('.m').style.color=(s<=1||s===5)?'#1c1b1f':'#fff';$('.m i').style.background=s===2?'#fff':'#c8322a';};
</script></body></html>`;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--lang=it-IT'] }); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
await p.setContent(html); await p.evaluate(() => document.fonts.ready);
for (const t of [3, 6.8, 10.4, 13.6, 16.4, 19.8, 23]) { await p.evaluate((t) => window.render(t), t); await p.screenshot({ path: `out/rb-${t}.png` }); }
await p.evaluate(() => window.render(3)); await p.screenshot({ path: 'out/cover-1943b.png' }); await b.close();
if (process.argv[2] === 'video') {
 await rendi({ html, durata: TOT, uscita: 'out/rb-muto.mp4', cartella: 'out/f-rb' }); const Cv = 0.6;
 execSync(`python3 suoni.py out/bling-rb.wav ${(Cv + TOT).toFixed(2)} "${[0.15, ...T.slice(1), T[3] + 1.4].map((x) => (Cv + x).toFixed(2)).join(',')}" ${(Cv + T[6]).toFixed(2)}`);
 execSync(`ffmpeg -v error -y -loop 1 -framerate 30 -t ${Cv} -i out/cover-1943b.png -i out/rb-muto.mp4 -i out/bling-rb.wav -filter_complex "[0:v]format=yuv420p,setsar=1[c];[1:v]format=yuv420p,setsar=1[r];[c][r]concat=n=2:v=1:a=0[v]" -map "[v]" -map 2:a -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac -b:a 160k -shortest -movflags +faststart out/reel-1943b.mp4`);
}
