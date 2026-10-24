import { COL, cssBase } from './motore.mjs'; import { chromium } from 'playwright-core';
const N = { corteo: 'Corteo', sciopero_generale: 'Sciopero' };
const E = [['MAR 20','sciopero_generale','Grisolia (CS) · sciopero cittadino'],['VEN 23','corteo','Asti · corteo studentesco'],['VEN 23','corteo','Trento · contro il caro vita'],
 ['VEN 30','corteo','Roma · mobilitazione studentesca'],['VEN 30','corteo','Bassano del Grappa · sciopero studentesco'],['VEN 30','sciopero_generale','Padova'],
 ['VEN 30','sciopero_generale','Bari · contro riarmo e caro vita'],['VEN 30','sciopero_generale','Catania · contro il carovita'],['VEN 30','corteo','Pescara · no al carovita']];
const li = E.map(([g,t,x]) => `<li><b>${g}</b><i style="background:${COL[t]}"></i><span>${x}</span></li>`).join('');
const html = `<!doctype html><html><head><meta charset="utf-8"><style>${cssBase}
.pag{position:relative;height:1920px;padding:250px 80px 300px;display:flex;flex-direction:column}
.tag{align-self:flex-start;background:#1c1b1f;color:#fff;font:700 30px T;letter-spacing:.12em;text-transform:uppercase;padding:8px 20px;border-radius:10px}
h1{font:800 112px/.92 T;text-transform:uppercase;margin-top:20px}h1 em{font-style:normal;color:#c8322a}
.sub{font:400 36px/1.3 C;color:#2b2a30;margin-top:18px}
ul{list-style:none;padding:0;margin-top:30px;display:flex;flex-direction:column;gap:12px}
li{display:flex;align-items:center;gap:20px;background:#fff;border:3px dashed #8d8a93;border-radius:16px;padding:14px 22px;font:600 33px/1.15 C}
li b{flex:none;width:118px;font:800 34px T;color:#c8322a}li i{flex:none;width:20px;height:20px;border-radius:50%}
.how{margin-top:30px;background:#1c1b1f;color:#fff;border-radius:18px;padding:24px 30px;font:400 33px/1.35 C}.how b{color:#ffb15c}
</style></head><body><div class="pag"><div class="m"><i></i>Mappa della Rivolta</div>
<p class="tag">Segnalati · fonte mancante</p>
<h1>Ci aiuti a<br><em>confermarli?</em></h1>
<p class="sub">Sono sulla mappa, ma ci manca un comunicato o una locandina. Per questo non li abbiamo messi nei nostri video.</p>
<ul>${li}</ul>
<p class="how"><b>Hai la fonte?</b> Apri l'evento su mappadellarivolta.org → <b>Correggi</b> → incolla il link. Un volontario la controlla.</p>
</div></body></html>`;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
await p.setContent(html); await p.evaluate(() => document.fonts.ready);
console.log(await p.evaluate(() => document.querySelector('.how').getBoundingClientRect().bottom));
await p.screenshot({ path: 'out/storia-fonti-mancanti.png' }); await b.close();
