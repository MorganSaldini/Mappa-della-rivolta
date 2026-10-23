/* Archivio delle mobilitazioni passate: solo lettura, dati da /api/archivio */
(function () {
  'use strict';
  const $ = (s) => document.querySelector(s);

  // Stessi tipi e colori della mappa (public/app.js)
  const TIPI = {
    corteo: ['#c8322a', 'Corteo'], presidio: ['#d96c00', 'Presidio'], sciopero_generale: ['#8e1b5e', 'Sciopero generale'],
    sciopero_categoria: ['#2a5db0', 'Sciopero di categoria'], picchetto: ['#0f7a6b', 'Picchetto'],
    assemblea: ['#6b4fbb', 'Assemblea'], altro: ['#55525c', 'Altra iniziativa'],
  };
  const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
  const PER_PAGINA = 150;

  let eventi = [];
  let quanti = PER_PAGINA;

  function esc(t) {
    return String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function urlSicuro(u) {
    try { const x = new URL(u); return ['http:', 'https:'].includes(x.protocol) ? x.href : null; } catch { return null; }
  }
  const nomeMese = (ym) => { const [a, m] = ym.split('-'); return `${MESI[Number(m) - 1]} ${a}`; };
  const normale = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  function voce(e) {
    const [col, nome] = TIPI[e.tipo] || TIPI.altro;
    const [, m, g] = e.data.split('-');
    const fonte = e.fonte && urlSicuro(e.fonte);
    const annullato = e.stato === 'annullato';
    const ora = e.ora_inizio ? ` · ore ${esc(e.ora_inizio)}${e.ora_fine ? '–' + esc(e.ora_fine) : ''}` : '';
    return `<article class="passato" id="ev-${esc(e.id)}" style="--c:${col}">
      <div class="passato__data"><b>${Number(g)}</b><span>${esc(MESI[Number(m) - 1].slice(0, 3))}</span></div>
      <div>
        <div class="etichette"><span class="etichetta" style="--c:${col}">${esc(nome)}</span>${annullato ? '<span class="etichetta etichetta--annullato">Annullato</span>' : ''}</div>
        <h3 class="${annullato ? 'barrato' : ''}">${esc(e.titolo)}</h3>
        <p>${e.luogo ? esc(e.luogo) + ', ' : ''}${esc(e.comune)} (${esc(e.provincia)}) · ${esc(e.regione)}${ora}</p>
        ${(e.organizzatori || []).length ? `<p class="tenue">Promosso da: ${esc(e.organizzatori.join(', '))}</p>` : ''}
        <p class="tenue">${fonte ? `<a href="${esc(fonte)}" target="_blank" rel="noopener nofollow ugc">Fonte ↗</a>` : 'Nessuna fonte indicata'}</p>
      </div>
    </article>`;
  }

  function filtrati() {
    const testo = normale($('#f-testo').value.trim());
    const mese = $('#f-mese').value, tipo = $('#f-tipo').value, regione = $('#f-regione').value;
    return eventi.filter((e) =>
      (!mese || e.data.startsWith(mese)) && (!tipo || e.tipo === tipo) && (!regione || e.regione === regione) &&
      (!testo || normale([e.titolo, e.comune, e.luogo, (e.organizzatori || []).join(' ')].join(' ')).includes(testo)));
  }

  function disegna() {
    const lista = filtrati();
    $('#conta-scarica').textContent = lista.length === 1 ? '1 evento' : `${lista.length} eventi`;
    $('#conta').textContent = lista.length === 1 ? '1 mobilitazione' : `${lista.length} mobilitazioni`;
    let html = '', mese = '';
    for (const e of lista.slice(0, quanti)) {
      const m = e.data.slice(0, 7);
      if (m !== mese) { mese = m; html += `<h2 class="mese">${esc(nomeMese(m))}</h2>`; }
      html += voce(e);
    }
    $('#lista').innerHTML = html || '<p>Nessuna mobilitazione trovata con questi filtri.</p>';
    $('#mostra-altri').hidden = lista.length <= quanti;
  }

  function preparaFiltri() {
    const mesi = [...new Set(eventi.map((e) => e.data.slice(0, 7)))];
    $('#f-mese').insertAdjacentHTML('beforeend', mesi.map((m) => `<option value="${esc(m)}">${esc(nomeMese(m))}</option>`).join(''));
    const tipi = Object.keys(TIPI).filter((t) => eventi.some((e) => e.tipo === t));
    $('#f-tipo').insertAdjacentHTML('beforeend', tipi.map((t) => `<option value="${t}">${esc(TIPI[t][1])}</option>`).join(''));
    const regioni = [...new Set(eventi.map((e) => e.regione))].sort((a, b) => a.localeCompare(b, 'it'));
    $('#f-regione').insertAdjacentHTML('beforeend', regioni.map((r) => `<option>${esc(r)}</option>`).join(''));
  }

  ['#f-testo', '#f-mese', '#f-tipo', '#f-regione'].forEach((s) =>
    $(s).addEventListener(s === '#f-testo' ? 'input' : 'change', () => { quanti = PER_PAGINA; disegna(); }));
  $('#filtri').addEventListener('submit', (ev) => ev.preventDefault());
  $('#mostra-altri').addEventListener('click', () => { quanti += PER_PAGINA; disegna(); });

  // ---------- Scarica (gratis, con offerta libera facoltativa) ----------
  const CONFIG = window.CONFIG || {};
  const offerta = CONFIG.linkSostieni && urlSicuro(CONFIG.linkSostieni);
  if (offerta) { $('#link-offerta').href = offerta; $('#box-offerta').hidden = false; }
  // Nei fogli di calcolo un testo che inizia con = + - @ verrebbe letto come formula: lo si neutralizza
  const cella = (v) => {
    let t = v === null || v === undefined ? '' : String(v);
    if (/^[=+\-@\t\r]/.test(t)) t = "'" + t;
    return /[";\n\r]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
  };
  function salva(nome, testo, tipo) {
    const url = URL.createObjectURL(new Blob([testo], { type: tipo }));
    const a = document.createElement('a');
    a.href = url; a.download = nome; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  document.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-formato]');
    if (!b) return;
    const lista = filtrati();
    const oggi = new Date().toISOString().slice(0, 10);
    if (b.dataset.formato === 'csv') {
      const intest = ['data', 'ora_inizio', 'ora_fine', 'tipo', 'titolo', 'comune', 'provincia', 'regione', 'luogo', 'organizzatori', 'stato', 'fonte', 'id'];
      const righe = lista.map((e) => [e.data, e.ora_inizio, e.ora_fine, (TIPI[e.tipo] || TIPI.altro)[1], e.titolo, e.comune, e.provincia,
        e.regione, e.luogo, (e.organizzatori || []).join(' / '), e.stato, e.fonte, e.id].map(cella).join(';'));
      // BOM + punto e virgola: Excel in italiano apre il file con le colonne giuste e gli accenti corretti
      salva(`archivio-mobilitazioni-${oggi}.csv`, '\ufeff' + [intest.join(';'), ...righe].join('\r\n'), 'text/csv;charset=utf-8');
    } else {
      salva(`archivio-mobilitazioni-${oggi}.json`, JSON.stringify({
        fonte: 'Mappa della Rivolta – https://mappadellarivolta.org/archivio.html', scaricato_il: new Date().toISOString(), eventi: lista,
      }, null, 2), 'application/json');
    }
    if (offerta) $('#box-offerta').classList.add('grazie');
  });

  async function avvio() {
    try {
      const r = await fetch('/api/archivio', { headers: { accept: 'application/json' } });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const d = await r.json();
      eventi = Array.isArray(d.eventi) ? d.eventi : [];
      if (d.giorni_archivio) $('#giorni-arch').textContent = d.giorni_archivio;
    } catch (e) {
      $('#conta').textContent = 'Impossibile caricare l’archivio in questo momento. Riprova tra poco.';
      return;
    }
    preparaFiltri();
    // Link diretto a un evento passato (es. dai messaggi Telegram): archivio.html?e=ID
    const id = new URLSearchParams(location.search).get('e');
    const i = id ? eventi.findIndex((e) => e.id === id) : -1;
    if (i >= quanti) quanti = i + 1;
    disegna();
    if (i >= 0) {
      const el = document.getElementById('ev-' + id);
      if (el) { el.classList.add('evidenziato'); el.scrollIntoView({ block: 'center' }); }
    } else if (id) {
      $('#conta').insertAdjacentHTML('beforebegin', '<p class="tenue">L’evento che cercavi non è più in archivio: potrebbe essere stato cancellato o non essere mai stato verificato.</p>');
    }
  }
  avvio();
})();
