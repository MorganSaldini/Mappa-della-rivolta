/* Prima di aprire PayPal: una finestra dentro la pagina spiega come inviare l'offerta. */
(function () {
  'use strict';
  const C = window.CONFIG || {};
  if (!C.linkSostieni) return;
  let base;
  try { base = new URL(C.linkSostieni); } catch { return; }

  function finestra() {
    let d = document.getElementById('dlg-sostieni');
    if (d) return d;
    d = document.createElement('dialog');
    d.id = 'dlg-sostieni';
    d.setAttribute('aria-labelledby', 'titolo-dlg-sostieni');
    d.innerHTML =
      '<form method="dialog" class="dlg-sostieni">' +
      '<h2 id="titolo-dlg-sostieni">Grazie per il sostegno ♥</h2>' +
      '<p>Su PayPal, quando ti chiede il tipo di pagamento, scegli <strong>«Amici e familiari»</strong> e non «Beni e servizi»: ' +
      'così arriva tutta la tua offerta, senza commissioni.</p>' +
      '<p class="tenue">Non stai comprando nulla: è una donazione volontaria per tenere attivo il sito.</p>' +
      '<div class="dlg__azioni"><button value="no" class="bottone bottone--chiaro">Annulla</button>' +
      '<button value="si" class="bottone bottone--pieno">Vai a PayPal</button></div></form>';
    document.body.append(d);
    return d;
  }

  document.addEventListener('click', (ev) => {
    const a = ev.target.closest('a[href]');
    if (!a) return;
    let u;
    try { u = new URL(a.href); } catch { return; }
    if (u.host !== base.host || !u.pathname.startsWith(base.pathname)) return;
    ev.preventDefault();
    const d = finestra();
    d.returnValue = '';
    d.showModal();
    d.addEventListener('close', () => {
      if (d.returnValue === 'si') window.open(a.href, '_blank', 'noopener');
    }, { once: true });
  });
})();
