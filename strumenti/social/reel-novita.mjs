import fs from 'node:fs'; import { execSync } from 'node:child_process'; import { chromium } from 'playwright-core';
import { cssBase, rendi } from './motore.mjs';
const img = (n) => 'data:image/jpeg;base64,' + fs.readFileSync(`out/sc-${n}.jpg`).toString('base64');
// [screenshot, y inizio, y fine (px immagine), titolo, sotto]
const S = [
 ['a-home', 0, 916, 'Prima la mappa', 'E sul telefono la barra in basso: Mappa, Elenco, Aggiungi.'],
 ['b-filtro', 420, 620, 'Tocca un tipo', 'La mappa mostra solo quello: cortei, presidi, scioperi…'],
 ['c-cerca', 0, 0, 'Cerca il tuo comune', 'Oppure tocca 📍 per vedere cosa c\'è vicino a te.'],
 ['d-filtri', 0, 0, 'Filtra come vuoi', 'Per data, per regione, solo le verificate.'],
 ['e-elenco', 0, 0, 'Giorno per giorno', 'E nel calendario del telefono, con un tocco.'],
 ['f-perche', 0, 420, 'Perché ci si mobilita', 'I dati dietro le piazze, ognuno con la sua fonte.'],
 ['h-aggiungi', 0, 520, 'Aggiungi in 30 secondi', 'Senza account. Anche più città e più date insieme.'],
 ['g-archivio', 300, 300, 'L\'archivio', 'Le mobilitazioni passate, scaricabili gratis.'],
];
const T0 = 1.6, D = 2.05, FINE = T0 + D * S.length, TOT = FINE + 3.2;
const scale = 760 / 1080;
const html = `<!doctype html><html><head><meta charset="utf-8"><style>${cssBase}
#intro{position:absolute;left:80px;right:80px;top:560px}#intro p{font:700 40px T;letter-spacing:.14em;text-transform:uppercase;color:#c8322a}#intro h1{font:800 170px/.88 T;text-transform:uppercase;margin-top:14px}#intro h1 em{font-style:normal;color:#c8322a}
#cap{position:absolute;left:80px;right:80px;top:250px;opacity:0}#cap .n{font:700 34px T;letter-spacing:.14em;color:#c8322a}#cap h2{font:800 104px/.95 T;text-transform:uppercase;margin-top:6px}#cap p{font:600 36px/1.25 C;color:#4a4850;margin-top:12px;min-height:90px}
#tel{position:absolute;left:160px;top:560px;width:760px;height:1040px;border:14px solid #1c1b1f;border-radius:56px;overflow:hidden;background:#f6f3ee;opacity:0;box-shadow:0 30px 60px #0002}
#tel img{position:absolute;left:0;top:0;width:760px;opacity:0}
#fine{position:absolute;inset:0;background:#1c1b1f;color:#fff;padding:300px 80px;opacity:0}#fine h1{font:800 140px/.9 T;text-transform:uppercase}#fine h1 em{font-style:normal;color:#c8322a}
#fine p{font:600 46px/1.3 C;color:#e8e4dd;margin-top:40px}#fine .url{font:800 92px T;color:#fff;margin-top:70px}#fine .nota{font:600 32px/1.3 C;color:#c9c5bf;margin-top:60px}
</style></head><body>
<div id="intro"><p>Mappa della Rivolta</p><h1>La mappa<br>è <em>cambiata.</em></h1><p style="color:#1c1b1f;font:600 44px C;letter-spacing:0;text-transform:none;margin-top:30px">Ecco cosa c'è di nuovo.</p></div>
<div id="cap"><p class="n" id="n"></p><h2 id="h"></h2><p id="s"></p></div>
<div id="tel">${S.map((s, i) => `<img id="i${i}" src="${img(s[0])}">`).join('')}</div>
<div id="fine"><h1>Provala<br><em>adesso.</em></h1><p>Più semplice da usare, sempre con la fonte di ogni piazza.</p><p class="url">mappadellarivolta.org</p><p class="nota">La mappa riporta informazioni pubbliche con la loro fonte.</p></div>
<div class="m"><i></i>Mappa della Rivolta</div>
<script>
const S=${JSON.stringify(S.map((s) => s.slice(1)))},T0=${T0},D=${D},FINE=${FINE},K=${scale};
const $=(q)=>document.querySelector(q),cl=(v)=>Math.max(0,Math.min(1,v)),ease=(v)=>{v=cl(v);return v<.5?2*v*v:1-Math.pow(-2*v+2,2)/2};
window.render=(t)=>{
 $('#intro').style.opacity=1-cl((t-(T0-0.35))/0.3); $('#intro').style.transform='translateY('+(-40*cl((t-(T0-0.35))/0.3))+'px)';
 const on=t>=T0-0.2&&t<FINE+0.2; $('#tel').style.opacity=cl((t-(T0-0.25))/0.3)*(1-cl((t-FINE)/0.25)); $('#cap').style.opacity=$('#tel').style.opacity;
 $('#tel').style.transform='translateY('+(60*(1-ease((t-(T0-0.25))/0.4)))+'px)';
 const i=Math.max(0,Math.min(S.length-1,Math.floor((t-T0)/D))), u=(t-T0-i*D)/D;
 S.forEach((s,j)=>{const el=$('#i'+j); el.style.opacity=j===i?cl(u/0.12+ (i===0?1:0)):(j===i-1?1-cl(u/0.12):0);});
 const [y0,y1,h,s]=S[i]; $('#i'+i).style.transform='translateY('+(-(y0+(y1-y0)*ease((u-0.15)/0.75))*K)+'px)';
 $('#n').textContent=(i+1)+' / '+S.length; $('#h').textContent=h; $('#s').textContent=s;
 const a=cl(u/0.15); $('#cap').style.transform='translateY('+(20*(1-a))+'px)';
 $('#fine').style.opacity=cl((t-FINE)/0.3); document.querySelector('.m').style.color=t>FINE+0.15?'#fff':'#1c1b1f';
};
</script></body></html>`;
// copertina
const cover = `<!doctype html><html><head><meta charset="utf-8"><style>${cssBase}</style></head><body style="background:#1c1b1f;color:#fff">
<div class="m" style="color:#fff"><i></i>Mappa della Rivolta</div>
<div style="position:absolute;left:80px;right:80px;top:330px"><p style="font:700 40px T;letter-spacing:.14em;text-transform:uppercase;color:#c8322a">Aggiornamento</p><h1 style="font:800 190px/.86 T;text-transform:uppercase;margin-top:12px">Novità<br>sulla<br><span style="color:#c8322a">mappa</span></h1>
<p style="font:600 48px/1.3 C;color:#e8e4dd;margin-top:50px">Il nuovo aspetto, in 20 secondi</p></div>
<img src="${img('a-home')}" style="position:absolute;right:-60px;bottom:-200px;width:520px;border:12px solid #fff;border-radius:44px;transform:rotate(-8deg)"></body></html>`;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } }); await p.setContent(cover); await p.evaluate(() => document.fonts.ready); await p.screenshot({ path: './out/cover-novita.png' }); await b.close();
await rendi({ html, durata: TOT, uscita: './out/reel-novita-muto.mp4', cartella: './out/f-novita' });
const C = 0.6, tempi = S.map((_, i) => C + T0 + i * D + 0.05);
execSync(`python3 suoni.py out/bling-novita.wav ${(C + TOT).toFixed(2)} "${[0.15, ...tempi].map((x) => x.toFixed(2)).join(',')}" ${(C + FINE).toFixed(2)}`);
execSync(`ffmpeg -v error -y -loop 1 -framerate 30 -t ${C} -i out/cover-novita.png -i out/reel-novita-muto.mp4 -i out/bling-novita.wav -filter_complex "[0:v]format=yuv420p,setsar=1[c];[1:v]format=yuv420p,setsar=1[r];[c][r]concat=n=2:v=1:a=0[v]" -map "[v]" -map 2:a -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac -b:a 160k -shortest -movflags +faststart out/reel-novita.mp4`);
console.log('durata', (C + TOT).toFixed(1));
