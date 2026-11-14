// Reel "Com'è andato sabato 14" (domenica 15/11/2026, 19:15). Uso: node reel-com14.mjs [dati.json] [fatti.json]
// fatti.json = array di {t:"testo breve", f:"fonte"}: si compila nel giro finale con notizie verificate. Senza file: riquadro "DA COMPLETARE".
import fs from 'node:fs'; import { execSync } from 'node:child_process'; import { chromium } from 'playwright-core'; import { cssBase, rendi, pathItalia, xy, W, H, CHROME, COL } from './motore.mjs';
const d = JSON.parse(fs.readFileSync(process.argv[2] || 'dati-2026-11-14.json')).eventi;
const FA = process.argv.slice(3).find((a) => a.endsWith('.json')); const FATTI = FA ? JSON.parse(fs.readFileSync(FA)) : null;
const nome = (s) => s.trim().toLowerCase().replace(/(^|[\s'])\S/g, (m) => m.toUpperCase());
// Esclusi: Parma (contromanifestazione, rischio tensioni), Perugia (tipo altro), Torino 16:03 (orario da controllare), Bari (sciopero AMTAB: solo trasporti)
const ESCL = ['Parma', 'Perugia', 'Torino', 'Bari'];
const DESCR = { corteo: 'corteo', presidio: 'presidio', sciopero_categoria: 'sciopero', assemblea: 'assemblea' };
const E = d.filter((e) => e.data === '2026-11-14' && e.stato === 'verificato' && e.fonte && e.tipo !== 'altro' && !ESCL.includes(nome(e.comune)))
  .sort((a, b) => b.lat - a.lat).map((e) => { const [x, y] = xy(e.lat, e.lng); return { c: nome(e.comune), x, y, tipo: e.tipo, ora: e.ora_inizio }; });
const N20 = new Set(d.filter((e) => e.data === '2026-11-20' && e.stato === 'verificato' && e.fonte && e.tipo !== 'altro' && !['2026-11-20-roma-sciopero_categoria-01'].includes(e.id) && nome(e.comune) !== 'Avellino').map((e) => nome(e.comune))).size;
console.log(E.map((e) => e.c).join(', '), '| città 20/11:', N20);
const xs = E.map((e) => e.x), ys = E.map((e) => e.y), pad = 45; const vx = Math.min(...xs) - pad * 2, vy = Math.min(...ys) - pad, vw = Math.max(...xs) - vx + pad * 2, vh = Math.max(vw * 1.15, Math.max(...ys) - vy + pad); const SC = vw / 960 * 2.2;
const T0 = 2.4, STEP = 0.55, TC = T0 + E.length * STEP + 1.6, TV = TC + 4.2, TF = TV + 2.8, TOT = TF + 3.6;
const LAB = { Milano: ['end', -1, -1], Brescia: ['middle', 0, 3.4], Piacenza: ['end', -1, 1.6] };
const dots = (sc) => E.map((e, i) => { const [an, dx, dy] = LAB[e.c] || ['start', 1, -1]; return `<g id="e${i}" opacity="0" transform="translate(${e.x},${e.y})"><circle r="${22 * sc}" fill="${COL[e.tipo]}" opacity=".25"/><circle r="${10 * sc}" fill="${COL[e.tipo]}" stroke="#fff" stroke-width="${3 * sc}"/><text text-anchor="${an}" x="${dx * 16 * sc}" y="${dy * 12 * sc}" font-size="${26 * sc}" style="font-family:T;font-weight:800;text-transform:uppercase" fill="#1c1b1f" stroke="#f6f3ee" stroke-width="${5 * sc}" paint-order="stroke">${e.c}</text></g>`; }).join('');
const fatti = FATTI ? FATTI.map((f) => `<li><span>${f.t}</span><small>${f.f}</small></li>`).join('') : `<li style="border:6px dashed #e0a020;padding:30px"><span style="color:#e0a020">DA COMPLETARE nel giro finale: 2–3 fatti con fonte (comunicati dei promotori prima, poi agenzie). Numeri solo con chi li dà.</span></li>`;
const html = `<!doctype html><html><head><meta charset="utf-8"><style>${cssBase}
.l{position:absolute;inset:0;opacity:0}#map{position:absolute;left:60px;top:330px;width:960px;height:${Math.round(960 * vh / vw)}px}
#fa ul{padding:0;margin-top:40px}#fa li{list-style:none;border-top:3px solid #3a383f;padding:30px 0}#fa li span{display:block;font:600 52px/1.25 C}#fa li small{display:block;font:600 30px C;color:#ff8f86;margin-top:10px}
</style></head><body>
<div class="l" id="a" style="opacity:1;background:#1c1b1f;color:#fff;padding:620px 80px"><p style="font:700 40px T;letter-spacing:.12em;text-transform:uppercase;color:#ff8f86">Sabato 14 novembre</p><p style="font:800 200px/.86 T;text-transform:uppercase;margin-top:20px">Com'è<br>andata.</p><p style="font:600 52px/1.3 C;margin-top:30px;color:#e8e4dd">${E.length} città in piazza, una settimana prima del 20.</p></div>
<div class="l" id="b"><p style="position:absolute;left:80px;top:250px;font:700 38px T;letter-spacing:.12em;text-transform:uppercase;color:#c8322a">Sabato 14 · sulla mappa</p>
<svg id="map" viewBox="${vx} ${vy} ${vw} ${vh}"><path d="${pathItalia}" fill="#fff" stroke="#1c1b1f" stroke-width="${2.5 * SC}" stroke-linejoin="round"/>${dots(SC)}</svg>
<p id="cnt" style="position:absolute;left:80px;bottom:320px;font:800 120px/.9 T;text-transform:uppercase"></p></div>
<div class="l" id="fa" style="background:#1c1b1f;color:#fff;padding:300px 80px"><p style="font:700 38px T;letter-spacing:.12em;text-transform:uppercase;color:#ff8f86">Cosa è successo</p><p style="font:800 120px/.9 T;text-transform:uppercase;margin-top:10px">I fatti,<br>con la fonte.</p><ul>${fatti}</ul></div>
<div class="l" id="v" style="background:#f6f3ee;padding:560px 80px"><p style="font:700 40px T;letter-spacing:.12em;text-transform:uppercase;color:#c8322a">Venerdì 20 · sciopero generale</p><p style="font:800 330px/.8 T;color:#c8322a;margin:20px 0 0 -14px">−5</p><p style="font:800 110px/.9 T;text-transform:uppercase;margin-top:30px">${N20} città<br>già in mappa.</p></div>
<div class="l" id="f" style="background:#c8322a;color:#fff;padding:480px 80px"><p style="font:800 140px/.88 T;text-transform:uppercase">Eri in piazza<br>sabato?</p><p style="font:600 48px/1.3 C;margin-top:40px">Manda le foto dei cartelli e dei cortei, senza volti. E se manca la tua piazza del 20, aggiungila.</p><p style="font:800 76px T;margin-top:50px">mappadellarivolta.org</p>
<div style="display:inline-flex;align-items:center;gap:22px;margin-top:30px;background:#fff;color:#1c1b1f;padding:22px 36px;border-radius:60px;font:800 56px T"><span style="background:#c8322a;color:#fff;border-radius:40px;padding:4px 22px;font-size:42px">+ Segui</span>@mappadellarivolta</div><p style="font:600 30px C;color:#ffe1de;margin-top:50px">La mappa riporta informazioni pubbliche con la loro fonte.</p></div>
<div class="m" style="z-index:9"><i></i>Mappa della Rivolta</div><script>
const N=${E.length},T0=${T0},STEP=${STEP},TC=${TC},TV=${TV},TF=${TF};const $=(q)=>document.querySelector(q),cl=(v)=>Math.max(0,Math.min(1,v)),ez=(v)=>1-Math.pow(1-cl(v),3);
window.render=(t)=>{ $('#a').style.opacity=1-cl((t-T0+0.2)/0.25);
 [['#b',T0-0.2,TC],['#fa',TC,TV],['#v',TV,TF],['#f',TF,99]].forEach(([q,a,b])=>{$(q).style.opacity=cl((t-a)/0.25)*(1-cl((t-b)/0.25));});
 let k=0; for(let i=0;i<N;i++){const u=t-T0-i*STEP; const g=document.getElementById('e'+i); const v=ez(u/0.35); if(u>0)k=i+1; g.setAttribute('opacity',cl(u/0.15)); const tr=g.getAttribute('transform').split(' scale')[0]; g.setAttribute('transform',tr+' scale('+Math.max(0.001,v<1?v*1.2:1)+')');}
 $('#cnt').textContent=k+(k===1?' città':' città');
 document.querySelectorAll('#fa li').forEach((li,i)=>{li.style.opacity=cl((t-TC-0.5-i*0.6)/0.3);});
 const dark=t<T0-0.1||(t>=TC&&t<TV)||t>=TF; $('.m').style.color=dark?'#fff':'#1c1b1f'; $('.m i').style.background=t>=TF?'#fff':'#c8322a';};
</script></body></html>`;
const cover = `<!doctype html><html><head><meta charset="utf-8"><style>${cssBase}</style></head><body style="background:#1c1b1f;color:#fff">
<svg viewBox="0 0 ${W} ${H}" style="position:absolute;left:330px;top:640px;width:700px;height:${Math.round(700 * H / W)}px;overflow:visible"><path d="${pathItalia}" fill="#2c2a30" stroke="#6d6a72" stroke-width="3"/>${E.map((e) => `<circle cx="${e.x}" cy="${e.y}" r="26" fill="#ff4b3e" opacity=".3"/><circle cx="${e.x}" cy="${e.y}" r="12" fill="#ff4b3e" stroke="#fff" stroke-width="3"/>`).join('')}</svg>
<div style="position:absolute;left:80px;right:80px;top:300px"><p style="font:700 40px T;letter-spacing:.14em;text-transform:uppercase;color:#ff8f86">Sabato 14 novembre</p><h1 style="font:800 170px/.86 T;text-transform:uppercase;margin-top:14px">Com'è<br><span style="color:#ff4b3e">andata</span></h1></div>
<div class="m" style="color:#fff"><i></i>Mappa della Rivolta</div></body></html>`;
fs.mkdirSync('out', { recursive: true });
const b = await chromium.launch({ executablePath: CHROME }); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
await p.setContent(cover); await p.evaluate(() => document.fonts.ready); await p.screenshot({ path: 'out/cover-com14.png' });
await p.setContent(html); await p.evaluate(() => document.fonts.ready);
for (const t of [1.2, T0 + E.length * STEP + 0.8, TC + 2.5, TV + 1.5, TF + 2]) { await p.evaluate((t) => window.render(t), t); await p.screenshot({ path: `out/com14-${t.toFixed(1)}.png` }); }
await b.close();
if (process.argv.includes('video')) {
  await rendi({ html, durata: TOT, uscita: 'out/reel-com14-muto.mp4', cartella: 'out/f-com14' });
  const C = 0.6, tempi = [0.15, C + T0, C + T0 + 3 * STEP, C + TC, C + TV], durTot = C + TOT;
  execSync(`python3 suoni.py out/bling-com14.wav ${durTot.toFixed(2)} "${tempi.map((x) => x.toFixed(2)).join(',')}" ${(C + TF).toFixed(2)}`);
  execSync(`ffmpeg -v error -y -loop 1 -framerate 30 -t ${C} -i out/cover-com14.png -i out/reel-com14-muto.mp4 -i out/bling-com14.wav -filter_complex "[0:v]format=yuv420p,setsar=1[c];[1:v]format=yuv420p,setsar=1[r];[c][r]concat=n=2:v=1:a=0[v]" -map "[v]" -map 2:a -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac -b:a 160k -shortest -movflags +faststart out/reel-com14.mp4`);
  console.log('durata', durTot.toFixed(2));
}
