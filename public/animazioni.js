/* Animazioni della Mappa della Rivolta (GSAP + ScrollTrigger + Lenis, ospitati sul sito).
   Regola: chiaro prima di tutto, movimento solo dove aiuta a capire. Con "riduci movimento"
   attivo nel telefono restano solo brevi dissolvenze. Se qualcosa manca, il sito funziona uguale. */
(function () {
  'use strict';
  const html = document.documentElement;
  const pronto = () => html.classList.add('anim-pronta');
  if (!window.gsap) { pronto(); return; }
  const gsap = window.gsap;
  const ST = window.ScrollTrigger;
  if (ST) gsap.registerPlugin(ST);
  const RIDOTTA = html.classList.contains('anim-ridotta');
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  // ---------- Numeri che salgono (rispettano il formato: 4,2% · 701 · 2) ----------
  function conta(el, durata = 1.1) {
    const testo = el.textContent.trim();
    const m = testo.match(/^(\D*)([\d.]+(?:,\d+)?)(.*)$/);
    if (!m || RIDOTTA) return;
    const decimali = (m[2].split(',')[1] || '').length;
    const fine = parseFloat(m[2].replace(/\./g, '').replace(',', '.'));
    if (!isFinite(fine) || fine === 0) return;
    const o = { v: 0 };
    gsap.to(o, {
      v: fine, duration: durata, ease: 'power2.out',
      onUpdate: () => { el.textContent = m[1] + o.v.toFixed(decimali).replace('.', ',') + m[3]; },
      onComplete: () => { el.textContent = testo; },
    });
  }

  // ---------- 1. Apertura: titolo lettera per lettera, totale che sale, tipi che entrano ----------
  function apertura() {
    const h1 = $('#titolo');
    if (h1 && !RIDOTTA) {
      const parole = h1.textContent.trim().split(/\s+/);
      h1.setAttribute('aria-label', h1.textContent.trim());
      h1.innerHTML = parole.map((p) => `<span class="parola" aria-hidden="true">${[...p].map((c) => `<span class="lettera">${c}</span>`).join('')}</span>`).join(' ');
      gsap.from($$('.lettera', h1), { yPercent: 70, opacity: 0, rotate: 4, duration: 0.55, ease: 'power3.out', stagger: 0.022 });
    }
    pronto();
    gsap.from('.intro__sotto, .intro .bottone, .cerca', { opacity: 0, y: RIDOTTA ? 0 : 10, duration: RIDOTTA ? 0.25 : 0.5, ease: 'power2.out', stagger: 0.06, delay: RIDOTTA ? 0 : 0.25, clearProps: 'all' });
  }

  // ---------- 2. Mappa viva: i segnaposti scendono in sequenza ----------
  let primaVolta = true;
  function animaSegnaposti() {
    const pin = $$('#mappa .leaflet-marker-icon .mk, #mappa .marker-cluster > div').slice(0, 80);
    if (!pin.length) return;
    gsap.killTweensOf(pin);
    if (RIDOTTA) { gsap.fromTo(pin, { opacity: 0 }, { opacity: 1, duration: 0.25 }); return; }
    gsap.fromTo(pin, { opacity: 0, y: -16, scale: 0.5 }, {
      opacity: (i, el) => (el.classList.contains('mk--da_verificare') ? 0.72 : el.classList.contains('mk--annullato') ? 0.6 : 1),
      y: 0, scale: 1, duration: 0.55, ease: 'back.out(1.8)', stagger: { amount: primaVolta ? 0.7 : 0.35, from: 'random' }, clearProps: 'transform,opacity',
    });
  }

  // ---------- 3. Elenco: i giorni e gli eventi entrano morbidi ----------
  function animaVoci(contenitore, max = 18) {
    const voci = $$(':scope > .voce, :scope > details > .voce, .voce', contenitore).slice(0, max);
    if (!voci.length) return;
    gsap.fromTo(voci, { opacity: 0, y: RIDOTTA ? 0 : 8 }, { opacity: 1, y: 0, duration: RIDOTTA ? 0.2 : 0.4, ease: 'power2.out', stagger: RIDOTTA ? 0 : 0.035, clearProps: 'all' });
  }
  function animaElenco() {
    const giorni = $$('#elenco .giorno-box').slice(0, 8);
    if (!giorni.length) return;
    gsap.fromTo(giorni, { opacity: 0, y: RIDOTTA ? 0 : 12 }, { opacity: 1, y: 0, duration: RIDOTTA ? 0.2 : 0.45, ease: 'power2.out', stagger: RIDOTTA ? 0 : 0.05, clearProps: 'all' });
    $$('#elenco .giorno-box[open]').slice(0, 2).forEach((g) => animaVoci(g, 10));
  }
  document.addEventListener('toggle', (ev) => {
    const g = ev.target;
    if (g.classList && g.classList.contains('giorno-box') && g.open) animaVoci(g);
  }, true);

  // ---------- Contatori e pulsanti dei tipi ----------
  function animaContatori() {
    const tot = $('#totale');
    if (tot && primaVolta) conta(tot, 1.2);
    const chip = $$('#contatori .chip--tipo');
    gsap.fromTo(chip, { opacity: 0, y: RIDOTTA ? 0 : 6 }, { opacity: 1, y: 0, duration: RIDOTTA ? 0.2 : 0.35, ease: 'power2.out', stagger: RIDOTTA ? 0 : 0.04, delay: primaVolta && !RIDOTTA ? 0.35 : 0, clearProps: 'all' });
  }

  // Ogni volta che la mappa e l'elenco vengono ridisegnati (apertura, filtri, ricerca)
  let attesa = null;
  document.addEventListener('mappa:disegnata', () => {
    clearTimeout(attesa);
    attesa = setTimeout(() => {
      animaContatori();
      animaSegnaposti();
      animaElenco();
      primaVolta = false;
    }, 30);
  });
  // Dopo uno zoom i gruppi di segnaposti cambiano: piccola entrata per i nuovi
  document.addEventListener('mappa:zoom', () => {
    if (RIDOTTA) return;
    const nuovi = $$('#mappa .marker-cluster > div').slice(0, 40);
    gsap.fromTo(nuovi, { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.35, ease: 'back.out(2)', stagger: 0.015, clearProps: 'transform,opacity' });
  });

  // ---------- 4. Perché ci si mobilita: entra scorrendo, i numeri salgono ----------
  function perche() {
    const voci = $$('.perche__voce');
    if (!voci.length) return;
    if (!ST) return;
    gsap.set(voci, { opacity: 0, y: RIDOTTA ? 0 : 24 });
    ST.create({
      trigger: '.perche', start: 'top 80%', once: true,
      onEnter: () => {
        gsap.to(voci, { opacity: 1, y: 0, duration: RIDOTTA ? 0.25 : 0.6, ease: 'power3.out', stagger: RIDOTTA ? 0 : 0.12, clearProps: 'all' });
        $$('.perche__dato b').forEach((b, i) => setTimeout(() => conta(b, 1.3), i * 120));
      },
    });
  }

  // ---------- Scorrimento morbido: solo da computer, mai sulla mappa e nelle finestre ----------
  function scorrimento() {
    if (RIDOTTA || !window.Lenis) return;
    if (!window.matchMedia('(min-width: 1000px) and (pointer: fine)').matches) return;
    const lenis = new window.Lenis({
      lerp: 0.12, anchors: true,
      prevent: (n) => !!(n.closest && n.closest('#mappa, dialog, .leaflet-container, .lato, [data-lenis-prevent]')),
    });
    if (ST) lenis.on('scroll', ST.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    // Quando si apre una finestra (aggiungi, correggi…) la pagina sotto si ferma
    new MutationObserver(() => (document.querySelector('dialog[open]') ? lenis.stop() : lenis.start()))
      .observe(document.body, { subtree: true, attributes: true, attributeFilter: ['open'] });
  }

  apertura();
  perche();
  scorrimento();
})();
