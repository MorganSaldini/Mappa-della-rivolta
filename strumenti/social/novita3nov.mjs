import fs from 'node:fs'; import { chromium } from 'playwright-core'; import { cssBase } from './motore.mjs';
const im = (n) => 'data:image/png;base64,' + fs.readFileSync(`out/c-${n}.png`).toString('base64');
const css = cssBase.replace('height:1920px', 'height:1350px') + `.m{top:70px}.k{font:700 34px T;letter-spacing:.12em;text-transform:uppercase;color:#c8322a}
h1{font:800 104px/.9 T;text-transform:uppercase}p.t{font:600 38px/1.32 C;margin-top:18px}
.ph{border:10px solid #1c1b1f;border-radius:34px;overflow:hidden;background:#fff;box-shadow:0 18px 40px #0002}.ph img{display:block;width:100%}`;
const slide = (k, h, t, n, extra = '') => `<div style="position:absolute;inset:0;padding:170px 80px 0"><p class="k">${k}</p><h1 style="margin-top:14px">${h}</h1><p class="t">${t}</p>${extra}
<div class="ph" style="position:absolute;left:150px;right:150px;top:${n.top}px"><img src="${im(n.img)}" style="${n.st || ''}"></div></div>`;
const S = [
`<div style="position:absolute;inset:0;padding:190px 80px 0"><p class="k">Novità sul sito</p><h1 style="font-size:150px;margin-top:16px">La mappa<br>è cambiata.</h1><p class="t" style="font-size:44px;width:480px">Quattro cose nuove da provare. Scorri →</p>
<div class="ph" style="position:absolute;right:70px;top:560px;width:420px;height:720px;transform:rotate(3deg)"><img src="${im('pop')}" style="width:100%;height:100%;object-fit:cover;object-position:top"></div></div>`,
slide('1 · Filtro', 'Scegli<br>un giorno', 'Da «Data, regione e altri filtri» scegli «Un giorno preciso» e vedi solo le piazze di quella data. Prova col 20 novembre.', { img: 'giorno', top: 640, h: 640 }),
slide('2 · Ci sarò', 'Dici che<br>ci sarai', 'Un tocco su «Ci sarò» e tutti vedono quante persone pensano di andarci. Al server arriva solo il totale, niente su di te.', { img: 'cisaro', top: 660 }),
slide('3 · Fonti', 'Niente fonte,<br>niente evento', 'Per aggiungere una mobilitazione ora serve sempre un link: comunicato, locandina, sito del sindacato. E la fonte non si può più togliere con una correzione.', { img: 'fonte', top: 700, h: 590 }),
slide('4 · Categorie', 'Più tipi<br>di iniziative', 'Rassegne stampa, volantinaggi, raccolte firme, lezioni, proiezioni. E «Possibili disagi» a parte: un avviso per chi si sposta, mai un invito.', { img: 'disagi', top: 700, h: 560 }),
`<div style="position:absolute;inset:0;background:#c8322a;color:#fff;padding:220px 80px 0"><p class="k" style="color:#ffd5d1">Provala tu</p><h1 style="font-size:150px;margin-top:16px">mappa<br>della<br>rivolta.org</h1>
<p class="t" style="font-size:42px;margin-top:40px">Gratis, senza account, la tengono viva dei volontari. Se qualcosa non va, tocca «Segnala»: ci aiuti a sistemarla.</p>
<div style="display:inline-flex;align-items:center;gap:22px;margin-top:50px;background:#fff;color:#1c1b1f;padding:20px 34px;border-radius:60px;font:800 50px T"><span style="background:#c8322a;color:#fff;border-radius:40px;padding:4px 22px;font-size:38px">+ Segui</span>@mappadellarivolta</div>
<p style="position:absolute;left:80px;right:80px;bottom:60px;font:600 24px/1.35 C;color:#ffe1de">La mappa riporta informazioni pubbliche con la loro fonte.</p></div>`];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
for (let i = 0; i < S.length; i++) { await p.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${S[i]}<div class="m" style="color:${i === 5 ? '#fff' : '#1c1b1f'}"><i style="${i === 5 ? 'background:#fff' : ''}"></i>Mappa della Rivolta</div></body></html>`); await p.evaluate(() => document.fonts.ready);
  const f = await p.evaluate(() => { const ph = document.querySelector('.ph'); const t = [...document.querySelectorAll('p.t')].pop(); return t && ph ? [t.getBoundingClientRect().bottom, ph.getBoundingClientRect().top] : null; }); if (f && f[0] > f[1] - 20 && i > 0 && i < 5) console.log('SOVRAPPOSTO', i + 1, f);
  await p.screenshot({ path: `out/nov-0${i + 1}.png` }); }
await b.close();
