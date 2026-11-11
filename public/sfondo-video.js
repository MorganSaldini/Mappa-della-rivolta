/* Video di sfondo (corteo dal drone, Milano InMovimento, con permesso).
   Con "riduci movimento" o risparmio dati resta solo l'immagine ferma; si ferma quando la scheda non è visibile. */
(function () {
  'use strict';
  const v = document.getElementById('sfondo-drone');
  if (!v) return;
  const ridotto = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const risparmio = navigator.connection && navigator.connection.saveData;
  if (ridotto || risparmio) { v.removeAttribute('autoplay'); v.pause(); v.preload = 'none'; return; }
  const parti = () => { const p = v.play(); if (p && p.catch) p.catch(() => {}); };
  document.addEventListener('visibilitychange', () => { if (document.hidden) v.pause(); else parti(); });
  parti();
})();
