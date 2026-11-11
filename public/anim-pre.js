/* Caricato nell'<head>: nasconde per un istante il titolo, così l'animazione d'apertura non "salta".
   Se le animazioni non partono entro 2,5 secondi, tutto torna visibile da solo. */
(function () {
  var d = document.documentElement;
  d.classList.add('anim');
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) d.classList.add('anim-ridotta');
  setTimeout(function () { d.classList.add('anim-pronta'); }, 2500);
})();
