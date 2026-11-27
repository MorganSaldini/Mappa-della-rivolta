// Reel EVENTI "Oggi in piazza" — sabato 28/11/2026, Roma, corteo nazionale Non Una Di Meno. Uso: node reel-oggi28.mjs [video]
// Dati: /api/mobilitazioni letto il 27/11/2026 20:31 UTC (eventi verificati del 28/11 e della settimana dopo).
// Percorso e orari: La Capitale e 7colli del 27/11/2026 (fonte Roma Servizi per la Mobilità). Il tracciato è schematico (punti noti, non GPS).
import { execSync } from 'node:child_process'; import { chromium } from 'playwright-core';
import { cssBase, rendi, pathItalia, W, H, CHROME, COL, xy } from './motore.mjs';
const T = [0, 3.0, 6.6, 11.6, 16.4], TOT = 21;
// percorso schematico: [lat, lng, etichetta]
const P = [[41.9029, 12.4964, 'Piazza della Repubblica'], [41.9010, 12.5010, 'Termini'], [41.8975, 12.4990, ''], [41.8978, 12.4977, 'Santa Maria Maggiore'], [41.8950, 12.4920, ''], [41.8930, 12.4880, ''], [41.8902, 12.4922, 'Colosseo'], [41.8865, 12.4900, ''], [41.8846, 12.4862, 'Circo Massimo'], [41.8800, 12.4840, ''], [41.8766, 12.4808, ''], [41.8753, 12.4812, 'Piazzale Ostiense']];
const box = { la0: 41.8735, la1: 41.9045, ln0: 12.4790, ln1: 12.5030 }, MW = 920, MH = 980;
const k = Math.cos(41.89 * Math.PI / 180), sx = MW / ((box.ln1 - box.ln0) * k), sy = MH / (box.la1 - box.la0), s = Math.min(sx, sy);
const pr = (la, ln) => [((ln - box.ln0) * k * s + (MW - (box.ln1 - box.ln0) * k * s) / 2).toFixed(1), ((box.la1 - la) * s).toFixed(1)];
const pts = P.map(([la, ln]) => pr(la, ln)), d = 'M' + pts.map((p) => p.join(',')).join(' L');
const [rx, ry] = xy(41.9028, 12.4964);
const PROSSIMI = [[COL.sciopero_generale, 'Ven 4 dic', 'Sciopero generale', 'Tutte le categorie. Treni dalle 21 di giovedì 3.'], [COL.corteo, 'Sab 5 dic', 'Roma, due cortei', 'Ore 12:30 piazza del Popolo, per il clima. Ore 15 piazza Vittorio, per la sanità pubblica.'], [COL.corteo, 'Sab 12 dic', 'Roma, manifestazione USB', 'Nazionale, contro carovita e riarmo.']];
const css = cssBase + `.lay{display:none}.k{font:700 40px T;letter-spacing:.12em;text-transform:uppercase;color:#c8322a}
.st{position:absolute;left:80px;right:80px;top:290px}.h{font:800 120px/.9 T;text-transform:uppercase;margin-top:18px}.tx{font:600 54px/1.3 C;margin-top:30px}
.lb{font:700 30px C;fill:#1c1b1f;paint-order:stroke;stroke:#f6f3ee;stroke-width:10px}
.r{display:grid;grid-template-columns:34px 1fr;gap:22px;border-top:2px solid #3a383e;padding:30px 0}.r i{width:30px;height:30px;border-radius:50%;margin-top:10px}.r small{display:block;font:700 34px T;letter-spacing:.1em;text-transform:uppercase;color:#ff8f86}.r b{display:block;font:800 66px/1 T;text-transform:uppercase;margin-top:4px}.r span{display:block;font:600 38px/1.28 C;color:#e8e4dd;margin-top:8px}`;
const html = `<!doctype html><html lang="it"><head><meta charset="utf-8"><style>${css}</style></head><body>
<div class="lay" id="s0" style="background:#1c1b1f;color:#fff"><div class="st" style="top:360px"><p class="k" style="color:#ff8f86">Sabato 28 novembre</p><p style="font:800 230px/.84 T;text-transform:uppercase;margin-top:18px">Oggi<br>in piazza</p><p class="tx" style="font-size:56px;color:#e8e4dd">Roma, corteo nazionale.</p></div>
<svg viewBox="0 0 ${W} ${H}" style="position:absolute;right:-60px;top:1060px;width:560px;height:651px"><path d="${pathItalia}" fill="#34313a"/><circle id="pu" cx="${rx}" cy="${ry}" r="22" fill="${COL.corteo}" stroke="#fff" stroke-width="6"/></svg></div>
<div class="lay" id="s1"><div class="st"><p class="k">Roma · corteo nazionale</p><p class="h">Contro la violenza di genere</p><p class="tx">Lo promuove <b>Non Una Di Meno</b>. È il decimo anno di fila.</p><p class="tx"><b>Partenza alle 14:30</b> da piazza della Repubblica.</p></div></div>
<div class="lay" id="s2"><div class="st" style="top:250px"><p class="k">Il percorso</p><p class="h" style="font-size:96px">Da Repubblica<br>a Ostiense</p></div>
<svg viewBox="0 0 ${MW} ${MH}" style="position:absolute;left:80px;top:600px;width:${MW}px;height:${MH}px"><path id="rt" d="${d}" fill="none" stroke="${COL.corteo}" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>
${P.map(([, , l], i) => l ? `<g class="pl" data-i="${i}"><circle cx="${pts[i][0]}" cy="${pts[i][1]}" r="16" fill="#fff" stroke="#1c1b1f" stroke-width="6"/><text class="lb" x="${+pts[i][0] + ([0, 1, 3].includes(i) ? -30 : 30)}" y="${+pts[i][1] + 10}" text-anchor="${[0, 1, 3].includes(i) ? 'end' : 'start'}">${l}</text></g>` : '').join('')}</svg>
<p id="bus" style="position:absolute;left:80px;right:80px;top:1610px;font:600 36px/1.3 C;color:#4a474f">Fino alle 20 circa bus deviati in centro: aggiornamenti su Roma Mobilità.</p></div>
<div class="lay" id="s3" style="background:#1c1b1f;color:#fff"><div class="st" style="top:280px"><p class="k" style="color:#ff8f86">E dopo?</p><p class="h" style="margin-bottom:30px">Sulla mappa</p>
${PROSSIMI.map(([c, a, b, x]) => `<div class="r"><i style="background:${c}"></i><div><small>${a}</small><b>${b}</b><span>${x}</span></div></div>`).join('')}</div></div>
<div class="lay" id="s4" style="background:#c8322a;color:#fff"><div class="st" style="top:400px"><p class="k" style="color:#ffd5d1">Eri in piazza oggi?</p><p id="cd" style="font:800 124px/.9 T;text-transform:uppercase;margin-top:18px">Mandaci<br>una foto<br>della piazza.</p><p class="tx" style="color:#ffe9e6">In privato. Pubblichiamo solo immagini senza volti riconoscibili.</p>
<div id="sg" style="display:inline-flex;align-items:center;gap:22px;margin-top:50px;background:#fff;color:#1c1b1f;padding:22px 36px;border-radius:60px;font:800 54px T"><span style="background:#c8322a;color:#fff;border-radius:40px;padding:4px 24px;font-size:40px">+ Segui</span>@mappadellarivolta</div>
<p style="font:600 26px/1.4 C;margin-top:40px;color:#ffe1de">La mappa riporta informazioni pubbliche con la loro fonte.</p></div></div>
<div class="m" id="mk"><i></i>Mappa della Rivolta</div>
<script>
const T=${JSON.stringify(T)};const cl=(x)=>Math.max(0,Math.min(1,x)),ez=(x)=>1-Math.pow(1-cl(x),3),$=(i)=>document.getElementById(i);
const up=(e,u,d=0)=>{const a=ez((u-d)/0.45);e.style.opacity=a;e.style.transform='translateY('+(50*(1-a))+'px)';};
const rt=$('rt'),L=rt.getTotalLength();rt.style.strokeDasharray=L;const pl=[...document.querySelectorAll('.pl')];
window.render=(t)=>{let s=0;for(let i=0;i<T.length;i++)if(t>=T[i])s=i;for(let i=0;i<5;i++)$('s'+i).style.display=i===s?'block':'none';const u=t-T[s];
 const dk=s===0||s===3||s===4;$('mk').style.color=dk?'#fff':'#1c1b1f';$('mk').querySelector('i').style.background=s===4?'#fff':'#c8322a';$('mk').style.display=s===0?'none':'flex';
 up($('s'+s).querySelector('.st'),u);
 if(s===0){$('pu').setAttribute('r',22+10*(0.5+0.5*Math.sin(u*5)));}
 if(s===1)[...$('s1').querySelectorAll('.tx')].forEach((e,i)=>up(e,u,0.5+0.5*i));
 if(s===2){const f=ez((u-0.4)/3.2);rt.style.strokeDashoffset=L*(1-f);pl.forEach((g,i)=>{const n=pl.length-1;g.style.opacity=f>=i/n-0.02?1:0;});$('bus').style.opacity=ez((u-3.6)/0.4);}
 if(s===3)[...$('s3').querySelectorAll('.r')].forEach((e,i)=>up(e,u,0.5+0.7*i));
 if(s===4){$('cd').style.opacity=ez((u-0.3)/0.4);$('sg').style.opacity=ez((u-1.2)/0.3);$('sg').style.transform='scale('+(0.8+0.2*ez((u-1.2)/0.35))+')';}};
</script></body></html>`;
const b = await chromium.launch({ executablePath: CHROME }); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
await p.setContent(html); await p.evaluate(() => document.fonts.ready);
for (const [t, n] of [[2.6, 'cover'], [6.2, 'k1'], [11.2, 'k2'], [16.0, 'k3'], [20.8, 'k4']]) { await p.evaluate((x) => window.render(x), t); await p.screenshot({ path: `out/o28-${n}.png` }); }
await b.close();
if (process.argv[2] === 'video') {
  await rendi({ html, durata: TOT, uscita: 'out/o28-muto.mp4', cartella: 'out/f-o28' }); const Cv = 0.6;
  execSync(`python3 suoni.py out/bling-o28.wav ${(Cv + TOT).toFixed(2)} "${[0.4, ...T.slice(1, 4)].map((x) => (Cv + x).toFixed(2)).join(',')}" ${(Cv + T[4] + 0.3).toFixed(2)}`);
  execSync(`ffmpeg -v error -y -loop 1 -framerate 30 -t ${Cv} -i out/o28-cover.png -i out/o28-muto.mp4 -i out/bling-o28.wav -filter_complex "[0:v]format=yuv420p,setsar=1[c];[1:v]format=yuv420p,setsar=1[r];[c][r]concat=n=2:v=1:a=0[v]" -map "[v]" -map 2:a -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac -b:a 160k -shortest -movflags +faststart out/reel-oggi28.mp4`);
}
console.log('ok');
