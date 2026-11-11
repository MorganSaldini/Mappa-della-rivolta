/* Sfondo: un corteo visto dall'alto, come da un drone. Illustrazione originale disegnata in codice:
   figure stilizzate senza volti, nessuna persona reale, striscioni senza scritte leggibili.
   Si ferma quando la scheda non è visibile; con "riduci movimento" resta un'immagine ferma. */
(function () {
  'use strict';
  const tela = document.getElementById('sfondo-drone');
  if (!tela || !tela.getContext) return;
  const ctx = tela.getContext('2d');
  const RIDOTTO = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fondo = document.createElement('canvas');
  const fctx = fondo.getContext('2d');
  let W = 0, H = 0, DPR = 1, yOrizzonte = 0, mezzaStrada = 0;
  let persone = [], bandiere = [], striscioni = [], cartelli = [];
  let caso = 7;
  const rnd = () => ((caso = (caso * 16807) % 2147483647) / 2147483647);

  // Prospettiva: z = 0 vicino (in basso), z = 1 lontano (orizzonte)
  const scala = (z) => 1 / (1 + z * 9);
  const yDi = (z) => yOrizzonte + (H * 1.08 - yOrizzonte) * scala(z);
  const xDi = (x, z) => W * 0.47 + x * mezzaStrada * scala(z);

  const VESTITI = ['#2b2a30', '#3b3f4a', '#5a4a42', '#7a2a24', '#c8322a', '#d8d2c6', '#25324a', '#4a5a3a', '#8a8f98', '#1c1b1f', '#3d5a7a', '#b88a2e'];

  function prepara() {
    DPR = Math.min(window.devicePixelRatio || 1, 1.5);
    W = window.innerWidth; H = window.innerHeight;
    for (const c of [tela, fondo]) { c.width = Math.round(W * DPR); c.height = Math.round(H * DPR); }
    tela.style.width = W + 'px'; tela.style.height = H + 'px';
    yOrizzonte = H * 0.1;
    mezzaStrada = Math.max(W * 0.42, 260);
    disegnaFondo();
    if (!persone.length) creaCorteo();
  }

  function trapezio(g, x1, x2, z1, z2, colore) {
    g.fillStyle = colore; g.beginPath();
    g.moveTo(xDi(x1, z1), yDi(z1)); g.lineTo(xDi(x2, z1), yDi(z1));
    g.lineTo(xDi(x2, z2), yDi(z2)); g.lineTo(xDi(x1, z2), yDi(z2)); g.closePath(); g.fill();
  }

  function disegnaFondo() {
    const g = fctx;
    g.setTransform(DPR, 0, 0, DPR, 0, 0);
    // cielo velato e città in lontananza
    const cielo = g.createLinearGradient(0, 0, 0, yOrizzonte + 20);
    cielo.addColorStop(0, '#dfe3e6'); cielo.addColorStop(1, '#eceae4');
    g.fillStyle = cielo; g.fillRect(0, 0, W, yOrizzonte + 30);
    caso = 11;
    for (let x = 0; x < W; x += 18 + rnd() * 30) {
      const h = 20 + rnd() * 70, w = 16 + rnd() * 34;
      g.fillStyle = ['#b9b4ab', '#a9a39a', '#c7c0b4', '#9a948c'][Math.floor(rnd() * 4)];
      g.fillRect(x, yOrizzonte + 6 - h, w, h);
    }
    // terreno ai lati
    g.fillStyle = '#9fa58e'; g.fillRect(0, yOrizzonte, W, H);
    // a sinistra: binari
    trapezio(g, -4.2, -1.55, 0, 1.2, '#8c877f');
    g.strokeStyle = '#5c5852'; g.lineWidth = 1.2;
    for (const r of [-3.6, -3.3, -2.5, -2.2]) {
      g.beginPath(); g.moveTo(xDi(r, 0), yDi(0)); g.lineTo(xDi(r, 1.2), yDi(1.2)); g.stroke();
    }
    for (let z = 0; z < 1.2; z += 0.012) {
      g.strokeStyle = 'rgba(70,60,50,.35)'; g.lineWidth = Math.max(0.5, 3 * scala(z));
      g.beginPath(); g.moveTo(xDi(-3.75, z), yDi(z)); g.lineTo(xDi(-2.05, z), yDi(z)); g.stroke();
    }
    // muretto e scarpata
    trapezio(g, -1.55, -1.25, 0, 1.2, '#c9c3b8');
    // la strada del corteo
    trapezio(g, -1.25, 1.25, 0, 1.2, '#7d7f84');
    // a destra: aiuola con alberi e viale
    trapezio(g, 1.25, 1.6, 0, 1.2, '#c9c3b8');
    trapezio(g, 1.6, 2.4, 0, 1.2, '#6f8a52');
    trapezio(g, 2.4, 4.6, 0, 1.2, '#8a8c90');
    g.strokeStyle = '#eeeeea';
    for (let z = 0; z < 1.2; z += 0.06) {
      g.lineWidth = Math.max(0.6, 4 * scala(z));
      g.beginPath(); g.moveTo(xDi(3.5, z), yDi(z)); g.lineTo(xDi(3.5, z + 0.025), yDi(z + 0.025)); g.stroke();
    }
    caso = 23;
    for (let z = 0.02; z < 1.15; z += 0.035 + rnd() * 0.03) {
      const r = 26 * scala(z) + 1.5;
      g.fillStyle = ['#4f6b3a', '#5e7a45', '#46603a'][Math.floor(rnd() * 3)];
      g.beginPath(); g.arc(xDi(2.0 + (rnd() - 0.5) * 0.4, z), yDi(z) - r * 0.6, r, 0, 7); g.fill();
    }
    // lampioni
    g.strokeStyle = '#3c3c40';
    for (let z = 0.05; z < 1.1; z += 0.12) {
      const s = scala(z); g.lineWidth = Math.max(0.6, 3 * s);
      g.beginPath(); g.moveTo(xDi(1.42, z), yDi(z)); g.lineTo(xDi(1.42, z), yDi(z) - 140 * s); g.stroke();
    }
  }

  function creaCorteo() {
    caso = 99;
    const n = Math.round(Math.min(1700, Math.max(700, (W * H) / 750)));
    persone = [];
    for (let i = 0; i < n; i++) {
      persone.push({ x: (rnd() * 2 - 1) * 1.12, z: rnd() * 1.15, c: VESTITI[Math.floor(rnd() * VESTITI.length)], p: rnd() * 6.3, v: 0.9 + rnd() * 0.25 });
    }
    bandiere = [];
    for (let i = 0; i < Math.round(n / 14); i++) bandiere.push({ chi: persone[Math.floor(rnd() * n)], c: rnd() < 0.82 ? '#c8322a' : ['#1f7a4a', '#f2efe8', '#2b2a30'][Math.floor(rnd() * 3)], p: rnd() * 6.3 });
    cartelli = [];
    for (let i = 0; i < Math.round(n / 22); i++) cartelli.push({ chi: persone[Math.floor(rnd() * n)], c: ['#f2efe8', '#f6c915', '#e9a3b8', '#ffffff'][Math.floor(rnd() * 4)] });
    striscioni = [{ z: 0.62, x: -0.1, w: 1.7 }, { z: 0.24, x: 0.15, w: 1.5 }, { z: 0.95, x: -0.05, w: 1.9 }];
  }

  const VEL = 0.012; // quanto avanza il corteo al secondo (in profondità)
  function avanza(dt) {
    for (const q of persone) { q.z -= VEL * q.v * dt; if (q.z < -0.06) q.z += 1.2; }
    for (const s of striscioni) { s.z -= VEL * dt; if (s.z < -0.08) s.z += 1.2; }
  }

  function disegna(t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(fondo, 0, 0);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const lista = persone.slice().sort((a, b) => b.z - a.z);
    const bandiereDi = new Map(bandiere.map((b) => [b.chi, b]));
    const cartelliDi = new Map(cartelli.map((c) => [c.chi, c]));
    let si = striscioni.slice().sort((a, b) => b.z - a.z), k = 0;
    for (const q of lista) {
      while (k < si.length && si[k].z > q.z) disegnaStriscione(si[k++], t);
      if (q.z > 1.15) continue;
      const s = scala(q.z), x = xDi(q.x, q.z), y = yDi(q.z);
      const passo = Math.sin(t * 4 + q.p) * 0.9 * s;
      const r = 15 * s + 0.8;
      // spalle (vestiti) e testa, visti dall'alto e un po' di lato
      ctx.fillStyle = q.c;
      ctx.beginPath(); ctx.ellipse(x, y + passo, r * 1.35, r * 1.05, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#3a2f2a';
      ctx.beginPath(); ctx.arc(x, y - r * 0.75 + passo, r * 0.62, 0, 7); ctx.fill();
      const b = bandiereDi.get(q);
      if (b) disegnaBandiera(b, x, y - r, s, t);
      const c = cartelliDi.get(q);
      if (c) { ctx.fillStyle = '#6b5a45'; ctx.fillRect(x - 0.8 * s, y - 50 * s, 2 * s + 0.4, 44 * s); ctx.fillStyle = c.c; ctx.fillRect(x - 15 * s, y - 66 * s, 30 * s, 21 * s); }
    }
    while (k < si.length) disegnaStriscione(si[k++], t);
  }

  function disegnaBandiera(b, x, y, s, t) {
    const h = 100 * s, w = 52 * s;
    ctx.strokeStyle = '#4a4440'; ctx.lineWidth = Math.max(0.5, 1.6 * s);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - h); ctx.stroke();
    ctx.fillStyle = b.c; ctx.beginPath(); ctx.moveTo(x, y - h);
    for (let i = 0; i <= 6; i++) { const u = i / 6; ctx.lineTo(x + u * w, y - h + Math.sin(t * 3.2 + b.p + u * 3) * 4 * s * u); }
    for (let i = 6; i >= 0; i--) { const u = i / 6; ctx.lineTo(x + u * w, y - h + w * 0.62 + Math.sin(t * 3.2 + b.p + u * 3) * 4 * s * u); }
    ctx.closePath(); ctx.fill();
  }

  function disegnaStriscione(st, t) {
    if (st.z > 1.15 || st.z < -0.08) return;
    const s = scala(st.z), y = yDi(st.z), x1 = xDi(st.x - st.w / 2, st.z), x2 = xDi(st.x + st.w / 2, st.z);
    const h = 64 * s, alto = y - 74 * s, onda = Math.sin(t * 1.6 + st.z * 9) * 2 * s;
    ctx.strokeStyle = '#4a4440'; ctx.lineWidth = Math.max(0.5, 1.6 * s);
    ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x1, alto); ctx.moveTo(x2, y); ctx.lineTo(x2, alto); ctx.stroke();
    ctx.fillStyle = '#f4f1ea';
    ctx.beginPath(); ctx.moveTo(x1, alto); ctx.quadraticCurveTo((x1 + x2) / 2, alto + onda, x2, alto);
    ctx.lineTo(x2, alto + h); ctx.quadraticCurveTo((x1 + x2) / 2, alto + h + onda, x1, alto + h); ctx.closePath(); ctx.fill();
    // tratti di pittura, volutamente illeggibili
    ctx.strokeStyle = '#2b2a30'; ctx.lineWidth = Math.max(0.6, 3 * s); ctx.lineCap = 'round';
    for (let riga = 0; riga < 2; riga++) {
      const yy = alto + h * (0.32 + riga * 0.36) + onda * 0.5;
      ctx.beginPath();
      for (let xx = x1 + 6 * s; xx < x2 - 6 * s; xx += 9 * s) { ctx.moveTo(xx, yy); ctx.lineTo(xx + 5 * s, yy - 1.5 * s * ((xx * 7) % 3 - 1)); }
      ctx.stroke();
    }
    ctx.fillStyle = '#c8322a'; ctx.fillRect(x2 - (x2 - x1) * 0.22, alto + h * 0.18, (x2 - x1) * 0.16, h * 0.64);
  }

  let ultimo = 0, attivo = true;
  function ciclo(ora) {
    if (!attivo) return;
    const dt = Math.min(0.1, (ora - (ultimo || ora)) / 1000);
    if (ora - ultimo >= 33) { avanza(dt); disegna(ora / 1000); ultimo = ora; }
    requestAnimationFrame(ciclo);
  }

  prepara();
  disegna(0);
  window.addEventListener('resize', () => { clearTimeout(prepara.t); prepara.t = setTimeout(() => { prepara(); disegna(performance.now() / 1000); }, 150); });
  if (!RIDOTTO) {
    requestAnimationFrame(ciclo);
    document.addEventListener('visibilitychange', () => {
      attivo = !document.hidden;
      if (attivo) { ultimo = 0; requestAnimationFrame(ciclo); }
    });
  }
})();
