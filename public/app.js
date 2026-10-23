/* Mappa delle mobilitazioni in Italia — logica della pagina */
(function () {
  'use strict';

  const CONFIG = window.CONFIG || {};
  const TIPI = {
    corteo: { nome: 'Corteo', plurale: 'cortei', colore: '#c8322a', icona: '🚩' },
    presidio: { nome: 'Presidio', plurale: 'presidi', colore: '#d96c00', icona: '✋' },
    sciopero_generale: { nome: 'Sciopero generale', plurale: 'scioperi generali', colore: '#8e1b5e', icona: '✊' },
    sciopero_categoria: { nome: 'Sciopero di categoria', plurale: 'scioperi di categoria', colore: '#2a5db0', icona: '🛠️' },
    picchetto: { nome: 'Picchetto', plurale: 'picchetti', colore: '#0f7a6b', icona: '🏭' },
    assemblea: { nome: 'Assemblea', plurale: 'assemblee', colore: '#6b4fbb', icona: '🗣️' },
    altro: { nome: 'Altra iniziativa', plurale: 'altre iniziative', colore: '#55525c', icona: '📣' },
  };
  const REGIONI = [
    'Abruzzo', 'Basilicata', 'Calabria', 'Campania', 'Emilia-Romagna', 'Friuli-Venezia Giulia', 'Lazio',
    'Liguria', 'Lombardia', 'Marche', 'Molise', 'Piemonte', 'Puglia', 'Sardegna', 'Sicilia', 'Toscana',
    'Trentino-Alto Adige', 'Umbria', "Valle d'Aosta", 'Veneto',
  ];
  const NOMINATIM = 'https://nominatim.openstreetmap.org';

  const $ = (s) => document.querySelector(s);
  let eventi = [];
  const markerPerId = {};

  // ---------- Utilità ----------
  function esc(t) {
    return String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function dataLunga(iso) {
    return new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
      .format(new Date(iso + 'T12:00:00Z'));
  }
  function dataBreve(iso) {
    return new Intl.DateTimeFormat('it-IT', { weekday: 'short', day: 'numeric', month: 'long', timeZone: 'UTC' })
      .format(new Date(iso + 'T12:00:00Z'));
  }
  function orario(e) {
    if (!e.ora_inizio) return '';
    return e.ora_fine ? `dalle ${e.ora_inizio} alle ${e.ora_fine}` : `ore ${e.ora_inizio}`;
  }
  function oggiRoma() {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(new Date());
  }
  function distanzaMetri(a, b) {
    const R = 6371000, r = Math.PI / 180;
    const dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  function urlSicuro(u) {
    try { const x = new URL(u); return ['http:', 'https:'].includes(x.protocol) ? x.href : null; } catch { return null; }
  }
  function avvisoOk(testo) {
    const el = $('#avviso-ok');
    el.textContent = testo;
    if (CONFIG.linkSostieni && urlSicuro(CONFIG.linkSostieni)) {
      const a = document.createElement('a');
      a.href = CONFIG.linkSostieni; a.target = '_blank'; a.rel = 'noopener';
      a.textContent = ' ♥ Sostieni la mappa';
      a.style.color = '#fff';
      el.append(' ', a);
    }
    el.hidden = false;
    clearTimeout(avvisoOk.t);
    avvisoOk.t = setTimeout(() => (el.hidden = true), 8000);
  }

  // ---------- Testi da config ----------
  if (CONFIG.nomeProgetto) { $('#nome-progetto').textContent = CONFIG.nomeProgetto; $('#titolo').textContent = CONFIG.nomeProgetto; }
  $('#sottotitolo').textContent = CONFIG.sottotitolo || '';
  if (CONFIG.linkPartecipa && urlSicuro(CONFIG.linkPartecipa)) {
    const a = $('#partecipa');
    a.href = CONFIG.linkPartecipa;
    a.textContent = CONFIG.testoPartecipa || 'Partecipa';
    a.hidden = false;
  }
  if (CONFIG.linkSostieni && urlSicuro(CONFIG.linkSostieni)) {
    $('#link-sostieni').href = CONFIG.linkSostieni;
    $('#sostieni').hidden = false;
    $('#barra-sostieni').hidden = false;
  }
  if (CONFIG.contattoRimozioni) {
    const c = $('#contatto');
    const href = CONFIG.contattoRimozioni.includes('@') ? 'mailto:' + CONFIG.contattoRimozioni : urlSicuro(CONFIG.contattoRimozioni);
    if (href) {
      c.innerHTML = `<strong>Contatti.</strong> Per chiedere la rimozione o la correzione di un contenuto: <a href="${esc(href)}">${esc(CONFIG.contattoRimozioni)}</a>`;
      c.hidden = false;
      // Lo stesso contatto nelle note legali
      document.querySelectorAll('.email-legale').forEach((l) => { l.href = href; l.textContent = CONFIG.contattoRimozioni; });
    }
  }

  // ---------- Mappa ----------
  if (!window.L) {
    $('#avviso-mappa').textContent = 'Non è stato possibile caricare la mappa. Controlla la connessione e ricarica la pagina; l’elenco qui sotto resta disponibile.';
    $('#avviso-mappa').hidden = false;
  }
  const tile = () => L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© <a href="https://www.openstreetmap.org/copyright">contributori OpenStreetMap</a>',
  });

  let mappa, gruppo;
  let vistaScelta = false;
  if (window.L) {
    mappa = L.map('mappa', { zoomControl: true, scrollWheelZoom: false, minZoom: 4 });
    // Centra sull'Italia; se la mappa non ha ancora una misura valida usa uno zoom fisso
    const centraItalia = () => {
      mappa.invalidateSize();
      if (vistaScelta) return; // è già aperto un evento dal link: non tornare alla vista dell'Italia
      const box = document.getElementById('mappa');
      if (box.offsetWidth > 100 && box.offsetHeight > 100) mappa.fitBounds([[36.6, 6.6], [47.1, 18.5]]);
      else mappa.setView([42.3, 12.6], 5);
      if (mappa.getZoom() < 5) mappa.setZoom(5);
    };
    mappa.setView([42.3, 12.6], 5);
    window.addEventListener('load', centraItalia);
    tile().addTo(mappa);
    mappa.on('click focus', () => mappa.scrollWheelZoom.enable());
    gruppo = L.markerClusterGroup ? L.markerClusterGroup({ showCoverageOnHover: false, maxClusterRadius: 45 }) : L.layerGroup();
    mappa.addLayer(gruppo);
  }

  function icona(e) {
    const t = TIPI[e.tipo] || TIPI.altro;
    return L.divIcon({
      className: '',
      html: `<div class="mk mk--${esc(e.stato)}" style="--c:${t.colore}"><span>${t.icona}</span></div>`,
      iconSize: [34, 34], iconAnchor: [5, 34], popupAnchor: [12, -32],
    });
  }

  function htmlPopup(e) {
    const t = TIPI[e.tipo] || TIPI.altro;
    const statoTesto = { verificato: '✓ Verificato', da_verificare: 'Da verificare', annullato: 'Annullato' }[e.stato] || '';
    const fonte = e.fonte && urlSicuro(e.fonte);
    const org = (e.organizzatori || []).map(esc).join(', ');
    return `<div class="pop">
      <div class="etichette">
        <span class="etichetta" style="--c:${t.colore}">${t.icona} ${esc(t.nome)}</span>
        <span class="etichetta etichetta--stato etichetta--${esc(e.stato)}">${statoTesto}</span>
      </div>
      <h3 class="${e.stato === 'annullato' ? 'barrato' : ''}">${esc(e.titolo)}</h3>
      <p><strong>${esc(dataLunga(e.data))}</strong>${e.ora_inizio ? ', ' + esc(orario(e)) : ''}</p>
      <p>${e.luogo ? esc(e.luogo) + ', ' : ''}${esc(e.comune)} (${esc(e.provincia)})${e.posizione_approssimativa ? ' <span class="tenue">· posizione indicativa</span>' : ''}</p>
      ${org ? `<p>Promosso da: ${org}</p>` : ''}
      ${fonte ? `<p><a href="${esc(fonte)}" target="_blank" rel="noopener nofollow ugc">Fonte ↗</a></p>` : '<p class="tenue">Nessuna fonte indicata</p>'}
      <p class="tenue">${e.conferme ? e.conferme + ' conferme · ' : ''}aggiornato il ${esc(dataBreve((e.aggiornato_il || '').slice(0, 10) || e.data))}</p>
      ${htmlGruppo(e)}
      <div class="pop__azioni">
        ${e.stato !== 'annullato' ? `<button type="button" class="bottone bottone--chiaro" data-conferma="${esc(e.id)}">👍 Confermo</button>` : ''}
        <button type="button" class="bottone bottone--chiaro" data-correggi="${esc(e.id)}">✏️ Correggi</button>
        <button type="button" class="bottone bottone--chiaro" data-problema="${esc(e.id)}">⚠️ Segnala</button>
      </div>
      ${e.stato !== 'annullato' ? `<p class="pop__cal">📅 Aggiungi al calendario:
        <a href="${esc(linkGoogle(e))}" target="_blank" rel="noopener">Google</a> ·
        <a href="#" data-ics="${esc(e.id)}">Apple / Outlook (.ics)</a></p>` : ''}
    </div>`;
  }

  // ---------- Eventi in più città ----------
  function cittaDelGruppo(e) {
    return e.gruppo ? eventi.filter((x) => x.gruppo === e.gruppo) : [];
  }
  function htmlGruppo(e) {
    const tutte = cittaDelGruppo(e);
    if (tutte.length < 2) return '';
    let html = '';
    // Altre città nello stesso giorno
    const stessoGiorno = tutte.filter((x) => x.data === e.data);
    const comuni = [...new Set(stessoGiorno.map((x) => x.comune))];
    if (comuni.length > 1) {
      const altre = comuni.filter((c) => c !== e.comune);
      const elenco = altre.slice(0, 8).map(esc).join(', ') + (altre.length > 8 ? ` e altre ${altre.length - 8}` : '');
      html += `<p class="pop__gruppo">🗺 Si svolge in ${comuni.length} città. Anche a: ${elenco}.
        <button type="button" data-gruppo="${esc(e.gruppo)}">Vedi tutte sulla mappa</button></p>`;
    }
    // Altre date dello stesso evento
    const date = [...new Set(tutte.map((x) => x.data))].sort();
    if (date.length > 1) {
      const altre = date.filter((d) => d !== e.data);
      html += `<p class="pop__gruppo">📅 Si svolge in ${date.length} giorni. Anche: ${altre.slice(0, 10).map((d) => esc(dataBreve(d))).join(', ')}${altre.length > 10 ? '…' : ''}.</p>`;
    }
    return html;
  }
  // "Vedi tutte sulla mappa" dall'elenco: inquadra tutte le città della riga
  document.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-punti]');
    if (!b || !mappa) return;
    const ids = b.dataset.punti.split(',');
    const punti = eventi.filter((x) => ids.includes(x.id)).map((x) => [x.lat, x.lng]);
    if (punti.length) { mappa.closePopup(); mappa.fitBounds(punti, { padding: [40, 40], maxZoom: 9 }); $('#mappa').scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  });
  document.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-gruppo]');
    if (!b || !mappa) return;
    const punti = eventi.filter((x) => x.gruppo === b.dataset.gruppo).map((x) => [x.lat, x.lng]);
    if (punti.length) { mappa.closePopup(); mappa.fitBounds(punti, { padding: [40, 40], maxZoom: 9 }); }
  });

  // ---------- Regole in breve: sempre aperte sugli schermi larghi ----------
  (function () {
    const box = $('#lato-regole');
    if (!box || !window.matchMedia) return;
    const largo = window.matchMedia('(min-width: 1200px)');
    const aggiorna = () => { if (largo.matches) box.open = true; };
    aggiorna();
    if (largo.addEventListener) largo.addEventListener('change', aggiorna);
  })();

  // ---------- Rete di riserva: specchi e copia offline ----------
  (function () {
    const ul = $('#elenco-specchi');
    if (!ul) return;
    const voci = [];
    if (RETE.SPECCHIO) {
      voci.push({ nome: 'Sito principale', url: RETE.PRINCIPALE + '/' });
      // l'area moderatori esiste solo sul sito principale
      document.querySelectorAll('a[href="modera.html"]').forEach((a) => { a.href = RETE.PRINCIPALE + '/modera.html'; });
    }
    for (const s of CONFIG.specchi || []) {
      const u = urlSicuro(s && s.url);
      if (u && !u.startsWith(location.origin + location.pathname.replace(/[^/]*$/, ''))) voci.push({ nome: s.nome || u, url: u });
    }
    if (CONFIG.nostrChiavePubblica) voci.push({ nome: 'Profilo Nostr del progetto (eventi verificati)', url: 'https://njump.me/' + encodeURIComponent(CONFIG.nostrChiavePubblica) });
    if (CONFIG.linkPartecipa && urlSicuro(CONFIG.linkPartecipa)) voci.push({ nome: 'Canale Telegram: lì trovi sempre gli indirizzi aggiornati', url: CONFIG.linkPartecipa });
    ul.innerHTML = voci.map((v) => `<li><a href="${esc(v.url)}" target="_blank" rel="noopener nofollow">${esc(v.nome)}</a></li>`).join('');
    const b = $('#scarica-offline');
    if (b) b.addEventListener('click', async () => {
      b.disabled = true;
      const prima = b.textContent;
      b.textContent = 'Preparo il file…';
      try { await RETE.scaricaOffline(eventi); } catch (err) { alert('Non sono riuscito a preparare il file: ' + err.message); }
      b.textContent = prima; b.disabled = false;
    });
  })();

  // ---------- Caricamento eventi ----------
  // Ordine dei tentativi:
  //  1. il server (/api/mobilitazioni), con una copia condivisa di 60 secondi;
  //  2. se il server non risponde (troppo traffico o guasto): la copia di riserva /dati/eventi.json,
  //     un file statico aggiornato ogni mezz'ora che regge qualsiasi numero di visite;
  //  3. se manca anche quella: l'ultima lista vista su questo dispositivo.
  // "fresco" = true dopo un invio del visitatore, per vedere subito il risultato.
  const MEMORIA = 'mappa-eventi-v1';
  function ricorda(d) {
    try { localStorage.setItem(MEMORIA, JSON.stringify({ ...d, salvato_il: new Date().toISOString() })); } catch (_) {}
  }
  function ricordati() {
    try { const d = JSON.parse(localStorage.getItem(MEMORIA) || 'null'); return d && Array.isArray(d.eventi) ? d : null; } catch (_) { return null; }
  }
  async function scarica(url, opzioni) {
    const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), 8000) : null;
    try {
      const r = await fetch(url, { ...opzioni, headers: { accept: 'application/json' }, signal: ctrl ? ctrl.signal : undefined });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const d = await r.json();
      if (!d || d.ok !== true || !Array.isArray(d.eventi)) throw new Error('Risposta non valida');
      return d;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
  function oraBreve(iso) {
    try {
      return new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' }).format(new Date(iso));
    } catch (_) { return ''; }
  }
  async function carica(fresco) {
    let d = null;
    let riserva = '';
    try {
      d = await scarica(RETE.API + '/api/mobilitazioni', { cache: fresco ? 'reload' : 'default' });
      ricorda(d);
    } catch (err) {
      try {
        const c = await scarica('dati/eventi.json', { cache: 'no-cache' });
        if (c.copia_del) { d = c; riserva = (RETE.SPECCHIO ? 'Il sito principale non risponde: stai vedendo la copia del ' : 'Il sito è molto visitato: stai vedendo la copia di riserva del ') + oraBreve(c.copia_del) + '.'; }
      } catch (_) { /* nessuna copia di riserva */ }
      // Copia offline: i dati sono dentro il file
      const inc = window.DATI_INCORPORATI;
      if (inc && Array.isArray(inc.eventi) && (!d || (inc.copia_del || '') > (d.copia_del || ''))) {
        d = inc; riserva = 'Stai usando la mappa offline scaricata il ' + oraBreve(inc.copia_del) + '.';
      }
      // Rete Nostr: eventi verificati firmati dal progetto, sparsi su relay indipendenti
      if (!d || inc) {
        try {
          const n = await RETE.leggiNostr();
          if (n && (!d || (n.ultimo_aggiornamento || '') > (d.copia_del || ''))) {
            d = n; riserva = 'Il sito principale non risponde: stai vedendo gli eventi verificati dalla rete Nostr.';
          }
        } catch (_) { /* Nostr non raggiungibile o non configurato */ }
      }
      if (!d) {
        const m = ricordati();
        if (m) { d = m; riserva = 'Connessione al sito non riuscita: stai vedendo i dati salvati su questo dispositivo il ' + oraBreve(m.salvato_il) + '.'; }
      }
    }

    if (d) {
      eventi = (d.eventi || []).filter((e) => e.data >= oggiRoma());
      if (d.giorni_conservazione) $('#giorni-cons').textContent = d.giorni_conservazione;
      if (d.giorni_archivio && $('#giorni-arch')) $('#giorni-arch').textContent = d.giorni_archivio;
      $('#ultimo-agg').textContent = d.ultimo_aggiornamento
        ? new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(d.ultimo_aggiornamento.slice(0, 10) + 'T12:00:00Z'))
        : '—';
      if (riserva) {
        $('#avviso-mappa').textContent = riserva + ' Le novità più recenti potrebbero mancare.';
        $('#avviso-mappa').hidden = false;
      } else if (window.L) {
        $('#avviso-mappa').hidden = true;
      }
    } else {
      eventi = [];
      $('#avviso-mappa').textContent = 'Impossibile caricare le mobilitazioni in questo momento. Riprova tra poco.';
      $('#avviso-mappa').hidden = false;
    }
    preparaFiltri();
    disegna();
  }

  // ---------- Filtri ----------
  const filtri = { tipi: new Set(), periodo: 'tutte', regione: '', soloVerificati: false };
  function visibili() {
    const oggi = oggiRoma();
    const limite = { oggi: oggi, settimana: piuGiorni(oggi, 7), mese: piuGiorni(oggi, 31) }[filtri.periodo];
    return eventi.filter((e) =>
      (!filtri.tipi.size || filtri.tipi.has(e.tipo)) &&
      (!limite || e.data <= limite) &&
      (!filtri.regione || e.regione === filtri.regione) &&
      (!filtri.soloVerificati || e.stato === 'verificato'));
  }
  function piuGiorni(iso, n) {
    const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10);
  }
  function filtriAttivi() {
    return filtri.tipi.size || filtri.periodo !== 'tutte' || filtri.regione || filtri.soloVerificati;
  }
  function preparaFiltri() {
    $('#filtro-tipi').innerHTML = Object.entries(TIPI).map(([k, t]) =>
      `<button type="button" class="chip" data-filtro-tipo="${k}" aria-pressed="false"><span class="pallino" style="--c:${t.colore}"></span>${t.icona} ${esc(t.nome)}</button>`).join('');
    const regioni = [...new Set(eventi.map((e) => e.regione))].sort((a, b) => a.localeCompare(b, 'it'));
    const sel = $('#filtro-regione');
    const attuale = sel.value;
    sel.innerHTML = '<option value="">Tutte le regioni</option>' + regioni.map((r) => `<option>${esc(r)}</option>`).join('');
    sel.value = regioni.includes(attuale) ? attuale : '';
    if (!sel.value) filtri.regione = '';
    document.querySelectorAll('[data-filtro-tipo]').forEach((b) => b.setAttribute('aria-pressed', String(filtri.tipi.has(b.dataset.filtroTipo))));
  }
  document.addEventListener('click', (ev) => {
    const c = ev.target.closest('[data-filtro-tipo]');
    if (!c) return;
    const k = c.dataset.filtroTipo;
    filtri.tipi.has(k) ? filtri.tipi.delete(k) : filtri.tipi.add(k);
    c.setAttribute('aria-pressed', String(filtri.tipi.has(k)));
    disegna();
  });
  $('#filtro-periodo').addEventListener('change', (ev) => { filtri.periodo = ev.target.value; disegna(); });
  $('#filtro-regione').addEventListener('change', (ev) => { filtri.regione = ev.target.value; disegna(); });
  $('#filtro-verificati').addEventListener('change', (ev) => { filtri.soloVerificati = ev.target.checked; disegna(); });
  $('#filtro-azzera').addEventListener('click', () => {
    filtri.tipi.clear(); filtri.periodo = 'tutte'; filtri.regione = ''; filtri.soloVerificati = false;
    $('#filtro-periodo').value = 'tutte'; $('#filtro-regione').value = ''; $('#filtro-verificati').checked = false;
    document.querySelectorAll('[data-filtro-tipo]').forEach((b) => b.setAttribute('aria-pressed', 'false'));
    disegna();
  });

  if (window.matchMedia && window.matchMedia('(min-width: 760px)').matches) $('#box-filtri').open = true;

  function disegna() {
    const lista = visibili();
    $('#filtro-azzera').hidden = !filtriAttivi();
    $('#filtro-conta').textContent = filtriAttivi() ? `${lista.length} di ${eventi.length} mostrate` : '';
    $('#filtro-riassunto').textContent = filtriAttivi() ? `· ${lista.length} di ${eventi.length} mostrate` : '';
    // Contatori
    const attivi = lista.filter((e) => e.stato !== 'annullato');
    $('#totale').textContent = attivi.length;
    const conta = {};
    attivi.forEach((e) => (conta[e.tipo] = (conta[e.tipo] || 0) + 1));
    $('#contatori').innerHTML = Object.entries(TIPI)
      .filter(([k]) => conta[k])
      .map(([k, t]) => `<li><span class="pallino" style="--c:${t.colore}"></span><b>${conta[k]}</b> ${esc(conta[k] === 1 ? t.nome.toLowerCase() : t.plurale)}</li>`)
      .join('');

    // Marker
    if (gruppo) {
      gruppo.clearLayers();
      for (const k of Object.keys(markerPerId)) delete markerPerId[k];
      lista.forEach((e) => {
        const m = L.marker([e.lat, e.lng], { icon: icona(e), title: e.titolo, alt: e.titolo });
        m.bindPopup(() => htmlPopup(e), { maxWidth: 300 });
        markerPerId[e.id] = m;
        gruppo.addLayer(m);
      });
    }

    // Elenco
    if (!lista.length) {
      $('#elenco').innerHTML = eventi.length
        ? '<p>Nessuna mobilitazione corrisponde ai filtri scelti.</p>'
        : '<p>Nessuna mobilitazione in programma per ora. Aggiungine una!</p>';
      return;
    }
    // Raggruppa per giorno; nello stesso giorno, gli eventi in più città diventano una riga sola
    const oggi = oggiRoma();
    const domani = new Date(Date.parse(oggi + 'T12:00:00Z') + 86400000).toISOString().slice(0, 10);
    const giorni = [];
    for (const e of lista) {
      let g = giorni[giorni.length - 1];
      if (!g || g.data !== e.data) { g = { data: e.data, righe: [], perGruppo: {}, n: 0 }; giorni.push(g); }
      g.n++;
      // stesso gruppo (evento inserito in più città) oppure stesso tipo e stesso titolo nello stesso giorno
      const chiave = e.gruppo || e.tipo + '|' + String(e.titolo || '').trim().toLowerCase();
      if (!g.perGruppo[chiave]) { g.perGruppo[chiave] = { gruppo: e.gruppo || null, eventi: [] }; g.righe.push(g.perGruppo[chiave]); }
      g.perGruppo[chiave].eventi.push(e);
    }
    // Aperti: oggi e domani (o il primo giorno con eventi); tutti se i filtri lasciano pochi eventi
    const tuttiAperti = lista.length <= 12;
    const apri = (d, i) => tuttiAperti || d === oggi || d === domani || (i === 0 && giorni[0].data > domani);
    const stato = (e) => (e.stato === 'da_verificare' ? ' · <em>da verificare</em>' : '') + (e.stato === 'annullato' ? ' · <strong>annullato</strong>' : '');
    const ora = (e) => (e.ora_inizio && e.ora_inizio !== '00:00' ? e.ora_inizio : '');
    const giorniGruppo = (e) => { if (!e.gruppo) return ''; const n = new Set(eventi.filter((x) => x.gruppo === e.gruppo).map((x) => x.data)).size; return n > 1 ? ` · <em>${n} giorni</em>` : ''; };

    let html = '';
    giorni.forEach((g, i) => {
      html += `<details class="giorno-box"${apri(g.data, i) ? ' open' : ''}>
        <summary class="giorno"><span>${esc(dataBreve(g.data))}</span><span class="giorno__conta">${g.n} ${g.n === 1 ? 'mobilitazione' : 'mobilitazioni'}</span></summary>`;
      for (const r of g.righe) {
        const e = r.eventi[0];
        const t = TIPI[e.tipo] || TIPI.altro;
        const titolo = `<strong class="${e.stato === 'annullato' ? 'barrato' : ''}">${esc(e.titolo)}</strong>`;
        if (r.eventi.length === 1) {
          html += `<button type="button" class="voce" data-vai="${esc(e.id)}">
            <span class="pallino" style="--c:${t.colore}"></span>
            <span class="voce__testo">${ora(e) ? `<span class="voce__ora">${esc(ora(e))}</span>` : ''}${titolo}
            <span class="voce__info">${esc(t.nome)} · ${esc(e.comune)} (${esc(e.provincia)})${giorniGruppo(e)}${stato(e)}</span></span>
          </button>`;
        } else {
          const citta = r.eventi.map((x) => `<button type="button" class="voce__citta" data-vai="${esc(x.id)}">${esc(x.comune)} (${esc(x.provincia)})${ora(x) ? ' · ' + esc(ora(x)) : ''}${x.stato !== e.stato ? stato(x) : ''}</button>`).join('');
          html += `<details class="voce voce--gruppo">
            <summary><span class="pallino" style="--c:${t.colore}"></span>
            <span class="voce__testo">${titolo}
            <span class="voce__info">${esc(t.nome)} · <em>in ${r.eventi.length} città</em>${giorniGruppo(e)}${stato(e)}</span></span></summary>
            <div class="voce__elenco-citta">${citta}
              <button type="button" class="voce__citta voce__tutte" data-punti="${esc(r.eventi.map((x) => x.id).join(','))}">Vedi tutte sulla mappa</button></div>
          </details>`;
        }
      }
      html += '</details>';
    });
    $('#elenco').innerHTML = html;
  }

  // Legenda
  $('#legenda').innerHTML = Object.values(TIPI)
    .map((t) => `<div><span class="pallino" style="--c:${t.colore}"></span>${t.icona} ${esc(t.nome)}</div>`)
    .join('') + '<div class="tenue">tratteggiato = da verificare</div>';

  document.addEventListener('click', (ev) => {
    const vai = ev.target.closest('[data-vai]');
    if (vai && mappa) {
      const m = markerPerId[vai.dataset.vai];
      if (m) {
        $('#mappa').scrollIntoView({ behavior: 'smooth', block: 'center' });
        gruppo.zoomToShowLayer ? gruppo.zoomToShowLayer(m, () => m.openPopup()) : (mappa.setView(m.getLatLng(), 14), m.openPopup());
      }
    }
    const pb = ev.target.closest('[data-problema]');
    if (pb) apriProblema(pb.dataset.problema);
    const cf = ev.target.closest('[data-conferma]');
    if (cf) apriConferma(cf.dataset.conferma);
    const cr = ev.target.closest('[data-correggi]');
    if (cr) apriCorreggi(cr.dataset.correggi);
  });

  // ---------- Ricerca ----------
  let ultimaRichiesta = 0;
  async function geocodifica(q) {
    const attesa = 1100 - (Date.now() - ultimaRichiesta); // max 1 richiesta al secondo (policy Nominatim)
    if (attesa > 0) await new Promise((r) => setTimeout(r, attesa));
    ultimaRichiesta = Date.now();
    const u = `${NOMINATIM}/search?format=jsonv2&addressdetails=1&limit=1&countrycodes=it&accept-language=it&q=${encodeURIComponent(q)}`;
    const r = await fetch(u);
    if (!r.ok) throw new Error('ricerca');
    const d = await r.json();
    return d[0] || null;
  }
  async function geocodificaInversa(lat, lng) {
    const attesa = 1100 - (Date.now() - ultimaRichiesta);
    if (attesa > 0) await new Promise((r) => setTimeout(r, attesa));
    ultimaRichiesta = Date.now();
    const u = `${NOMINATIM}/reverse?format=jsonv2&addressdetails=1&zoom=14&accept-language=it&lat=${lat}&lon=${lng}`;
    const r = await fetch(u);
    if (!r.ok) throw new Error('ricerca');
    return r.json();
  }

  $('#form-cerca').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const q = $('#campo-cerca').value.trim();
    if (!q || !mappa) return;
    $('#msg-cerca').textContent = 'Cerco…';
    try {
      const r = await geocodifica(q);
      if (!r) { $('#msg-cerca').textContent = 'Luogo non trovato. Prova con il nome del comune.'; return; }
      const centro = { lat: +r.lat, lng: +r.lon };
      mappa.setView([centro.lat, centro.lng], 12);
      const vicini = eventi.filter((e) => distanzaMetri(centro, e) < 25000).length;
      $('#msg-cerca').textContent = vicini
        ? `${vicini} ${vicini === 1 ? 'mobilitazione' : 'mobilitazioni'} entro 25 km.`
        : 'Nessuna mobilitazione entro 25 km. Puoi aggiungerne una.';
    } catch {
      $('#msg-cerca').textContent = 'La ricerca non risponde. Riprova tra poco.';
    }
  });

  $('#vicino').addEventListener('click', () => {
    if (!navigator.geolocation || !mappa) { $('#msg-cerca').textContent = 'Il tuo browser non permette di trovare la posizione.'; return; }
    $('#msg-cerca').textContent = 'Cerco la tua posizione (resta nel tuo browser)…';
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const c = { lat: p.coords.latitude, lng: p.coords.longitude };
        mappa.setView([c.lat, c.lng], 11);
        L.circleMarker([c.lat, c.lng], { radius: 8, color: '#1c1b1f', fillColor: '#f2a33a', fillOpacity: 1 }).addTo(mappa);
        const vicini = eventi.filter((e) => distanzaMetri(c, e) < 25000).length;
        $('#msg-cerca').textContent = `${vicini} ${vicini === 1 ? 'mobilitazione' : 'mobilitazioni'} entro 25 km da te.`;
      },
      () => ($('#msg-cerca').textContent = 'Posizione non disponibile. Scrivi il tuo comune nella ricerca.'),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 }
    );
  });

  // ---------- Turnstile (anti-bot) ----------
  const tsWidget = {};
  function caricaTurnstile() {
    if (!CONFIG.turnstileSiteKey || window.turnstile || caricaTurnstile.fatto) return;
    caricaTurnstile.fatto = true;
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async = true;
    document.head.appendChild(s);
  }
  function mostraTurnstile(idBox) {
    if (!CONFIG.turnstileSiteKey) return;
    caricaTurnstile();
    const prova = () => {
      if (!window.turnstile) return setTimeout(prova, 300);
      if (tsWidget[idBox] !== undefined) { window.turnstile.reset(tsWidget[idBox]); return; }
      tsWidget[idBox] = window.turnstile.render('#' + idBox, { sitekey: CONFIG.turnstileSiteKey, language: 'it' });
    };
    prova();
  }
  function tokenTurnstile(idBox) {
    return window.turnstile && tsWidget[idBox] !== undefined ? window.turnstile.getResponse(tsWidget[idBox]) : '';
  }

  // ---------- Finestre ----------
  document.querySelectorAll('dialog').forEach((d) => {
    d.addEventListener('click', (ev) => {
      if (ev.target.closest('[data-chiudi]') || ev.target === d) d.close();
    });
  });

  // ---------- Modulo: aggiungi ----------
  const fa = $('#form-aggiungi');
  fa.tipo.innerHTML = '<option value="">Scegli…</option>' +
    Object.entries(TIPI).map(([k, t]) => `<option value="${k}">${t.icona} ${esc(t.nome)}</option>`).join('');
  fa.regione.innerHTML = '<option value="">Scegli…</option>' + REGIONI.map((r) => `<option>${esc(r)}</option>`).join('');
  fa.data.min = oggiRoma();

  let miniMappa, puntoMarker, punto = null, approssimativa = false, doppioniVisti = false;

  function impostaPunto(lat, lng, centra) {
    punto = { lat, lng };
    if (!miniMappa) return;
    if (!puntoMarker) {
      puntoMarker = L.marker([lat, lng], {
        draggable: true, autoPan: true,
        icon: L.divIcon({ className: '', html: '<div class="mk" style="--c:#c8322a"><span>📍</span></div>', iconSize: [34, 34], iconAnchor: [5, 34] }),
      }).addTo(miniMappa);
      puntoMarker.on('dragend', () => {
        const p = puntoMarker.getLatLng();
        punto = { lat: p.lat, lng: p.lng };
        approssimativa = false;
        compilaDaPosizione(p.lat, p.lng);
      });
    } else puntoMarker.setLatLng([lat, lng]);
    if (centra) miniMappa.setView([lat, lng], 15);
    $('#aiuto-punto').textContent = 'Punto inserito. Trascinalo se non è nel posto giusto.';
  }

  function datiIndirizzo(a) {
    const comune = a.city || a.town || a.village || a.municipality || a.hamlet || '';
    const iso = a['ISO3166-2-lvl6'] || '';
    let prov = iso.startsWith('IT-') ? iso.slice(3, 5) : '';
    let reg = a.state || '';
    reg = REGIONI.find((r) => reg.toLowerCase().startsWith(r.toLowerCase().slice(0, 8))) || '';
    if (!prov && reg === "Valle d'Aosta") prov = 'AO';
    return { comune, prov, reg };
  }

  async function compilaDaPosizione(lat, lng) {
    try {
      const d = await geocodificaInversa(lat, lng);
      if (!d || !d.address) return;
      const { comune, prov, reg } = datiIndirizzo(d.address);
      if (d.address.country_code && d.address.country_code !== 'it') {
        $('#errore-aggiungi').textContent = 'Il punto deve trovarsi in Italia.';
        return;
      }
      if (comune) fa.comune.value = comune;
      if (prov) fa.provincia.value = prov;
      if (reg) fa.regione.value = reg;
    } catch { /* l'utente può compilare a mano */ }
  }

  function apriAggiungi() {
    $('#errore-aggiungi').textContent = '';
    $('#doppioni').hidden = true;
    doppioniVisti = false;
    $('#invia-aggiungi').textContent = 'Invia';
    RETE.scrittura($('#dlg-aggiungi'));
    if (window.L && !miniMappa) {
      miniMappa = L.map('mini-mappa').setView([42.3, 12.6], 5);
      tile().addTo(miniMappa);
      miniMappa.on('click', (ev) => {
        approssimativa = false;
        impostaPunto(ev.latlng.lat, ev.latlng.lng, false);
        compilaDaPosizione(ev.latlng.lat, ev.latlng.lng);
      });
    }
    setTimeout(() => miniMappa && miniMappa.invalidateSize(), 50);
    mostraTurnstile('ts-aggiungi');
  }
  $('#apri-aggiungi').addEventListener('click', apriAggiungi);

  $('#trova-luogo').addEventListener('click', async () => {
    const q = [fa.luogo.value, fa.comune.value].map((s) => s.trim()).filter(Boolean).join(', ');
    if (!q) { $('#errore-aggiungi').textContent = 'Scrivi almeno il comune.'; return; }
    $('#aiuto-punto').textContent = 'Cerco…';
    try {
      let r = await geocodifica(q);
      approssimativa = false;
      if (!r && fa.luogo.value.trim() && fa.comune.value.trim()) {
        r = await geocodifica(fa.comune.value.trim());
        approssimativa = true;
      }
      if (!r) { $('#aiuto-punto').textContent = 'Non trovato. Tocca la mappa per mettere il punto a mano.'; return; }
      const { comune, prov, reg } = datiIndirizzo(r.address || {});
      if (comune && !fa.comune.value.trim()) fa.comune.value = comune;
      if (prov) fa.provincia.value = prov;
      if (reg) fa.regione.value = reg;
      impostaPunto(+r.lat, +r.lon, true);
      if (approssimativa) $('#aiuto-punto').textContent = 'Ho trovato solo il comune: trascina il punto nel luogo esatto, se puoi.';
    } catch {
      $('#aiuto-punto').textContent = 'La ricerca non risponde. Tocca la mappa per mettere il punto a mano.';
    }
  });

  // Altre città
  const MAX_CITTA = 20;
  function nuovaRigaCitta() {
    const n = document.querySelectorAll('.citta-extra').length;
    if (n >= MAX_CITTA - 1) { $('#errore-aggiungi').textContent = `Al massimo ${MAX_CITTA} città per evento.`; return; }
    const div = document.createElement('div');
    div.className = 'citta-extra';
    div.innerHTML = `
      <div class="riga">
        <label class="cresci">Comune<input data-k="comune" maxlength="80" placeholder="Es. Torino"></label>
        <label class="corto">Prov.<input data-k="provincia" maxlength="2" placeholder="TO"></label>
      </div>
      <div class="riga">
        <label class="cresci">Luogo (piazza, via)<input data-k="luogo" maxlength="120" placeholder="Es. Piazza Castello"></label>
        <label class="corto">Ora<input data-k="ora_inizio" type="time"></label>
      </div>
      <div class="citta-extra__piede">
        <button type="button" class="bottone bottone--chiaro" data-trova-citta>Trova sulla mappa</button>
        <span class="citta-extra__stato" role="status">Non ancora cercata</span>
        <button type="button" class="dlg__chiudi" data-togli-citta aria-label="Togli questa città">✕</button>
      </div>`;
    $('#altre-citta').appendChild(div);
    div.querySelector('[data-k="comune"]').focus();
    div.querySelectorAll('input').forEach((i) => i.addEventListener('input', () => {
      if (i.dataset.k === 'comune' || i.dataset.k === 'luogo') { delete div.dataset.lat; segnaStato(div, 'Non ancora cercata'); }
    }));
  }
  function segnaStato(div, testo, classe = '') {
    const st = div.querySelector('.citta-extra__stato');
    st.textContent = testo;
    st.className = 'citta-extra__stato ' + classe;
  }
  async function trovaCitta(div) {
    const val = (k) => div.querySelector(`[data-k="${k}"]`).value.trim();
    const comune = val('comune'), luogo = val('luogo');
    if (!comune) { segnaStato(div, 'Scrivi il comune', 'errore'); return false; }
    segnaStato(div, 'Cerco…');
    try {
      let r = await geocodifica([luogo, comune].filter(Boolean).join(', '));
      let approx = false;
      if (!r && luogo) { r = await geocodifica(comune); approx = true; }
      if (!r) { segnaStato(div, 'Comune non trovato: controlla il nome', 'errore'); return false; }
      const { prov, reg } = datiIndirizzo(r.address || {});
      if (r.address && r.address.country_code && r.address.country_code !== 'it') { segnaStato(div, 'Deve essere in Italia', 'errore'); return false; }
      if (prov) div.querySelector('[data-k="provincia"]').value = prov;
      div.dataset.lat = r.lat; div.dataset.lng = r.lon; div.dataset.regione = reg || '';
      div.dataset.approx = approx || !luogo ? '1' : '';
      segnaStato(div, `✓ Trovato${approx || !luogo ? ' (posizione indicativa)' : ''}`, 'ok');
      return true;
    } catch {
      segnaStato(div, 'Ricerca non riuscita, riprova', 'errore');
      return false;
    }
  }
  $('#aggiungi-citta').addEventListener('click', nuovaRigaCitta);
  $('#altre-citta').addEventListener('click', (ev) => {
    const div = ev.target.closest('.citta-extra');
    if (!div) return;
    if (ev.target.closest('[data-togli-citta]')) div.remove();
    if (ev.target.closest('[data-trova-citta]')) trovaCitta(div);
  });
  async function raccogliAltreCitta() {
    const righe = [...document.querySelectorAll('.citta-extra')].filter((d) => d.querySelector('[data-k="comune"]').value.trim());
    for (const d of righe) {
      if (!d.dataset.lat && !(await trovaCitta(d))) {
        throw new Error(`Non trovo "${d.querySelector('[data-k="comune"]').value.trim()}": correggi il nome o toglila.`);
      }
      if (!d.dataset.regione) throw new Error(`Regione non riconosciuta per ${d.querySelector('[data-k="comune"]').value.trim()}.`);
    }
    return righe.map((d) => ({
      comune: d.querySelector('[data-k="comune"]').value.trim(),
      provincia: d.querySelector('[data-k="provincia"]').value.trim().toUpperCase(),
      regione: d.dataset.regione,
      luogo: d.querySelector('[data-k="luogo"]').value.trim(),
      ora_inizio: d.querySelector('[data-k="ora_inizio"]').value || null,
      lat: Number(d.dataset.lat), lng: Number(d.dataset.lng),
      posizione_approssimativa: d.dataset.approx === '1',
    }));
  }

  // Altre date
  const MAX_GIORNI = 15, MAX_RIGHE = 40;
  function nuovaRigaData() {
    if (document.querySelectorAll('.data-extra').length >= MAX_GIORNI - 1) { $('#errore-aggiungi').textContent = `Al massimo ${MAX_GIORNI} giorni per evento.`; return; }
    const div = document.createElement('div');
    div.className = 'riga data-extra';
    div.innerHTML = `<label class="cresci">Altra data<input type="date" data-data-extra></label>
      <button type="button" class="dlg__chiudi allinea-basso" data-togli-data aria-label="Togli questa data">✕</button>`;
    $('#altre-date').appendChild(div);
    div.querySelector('input').focus();
  }
  // Tutte le date dell'evento, prima esclusa, in ordine e senza doppioni
  function dateExtra() {
    const base = fa.data.value;
    const out = new Set();
    const fino = $('#data-fino').value;
    if (base && fino && fino > base) {
      let d = new Date(base + 'T12:00:00Z');
      for (let i = 0; i < 60; i++) {
        d = new Date(d.getTime() + 86400000);
        const iso = d.toISOString().slice(0, 10);
        if (iso > fino) break;
        out.add(iso);
      }
    }
    document.querySelectorAll('[data-data-extra]').forEach((i) => { if (i.value && i.value !== base) out.add(i.value); });
    return [...out].sort();
  }
  function aggiornaRiepilogoDate() {
    const giorni = 1 + dateExtra().length;
    const citta = 1 + [...document.querySelectorAll('.citta-extra')].filter((d) => d.querySelector('[data-k="comune"]').value.trim()).length;
    const el = $('#riepilogo-date');
    if (giorni < 2) { el.textContent = ''; el.className = 'dlg__aiuto'; return; }
    const tot = giorni * citta;
    el.textContent = `In tutto: ${giorni} giorni${citta > 1 ? ` × ${citta} città = ${tot} segnaposti` : ''}.` +
      (giorni > MAX_GIORNI ? ` Il massimo è ${MAX_GIORNI} giorni.` : tot > MAX_RIGHE ? ` Il massimo è ${MAX_RIGHE} in tutto.` : '');
    el.className = 'dlg__aiuto' + (giorni > MAX_GIORNI || tot > MAX_RIGHE ? ' dlg__errore' : '');
  }
  $('#aggiungi-data').addEventListener('click', () => { nuovaRigaData(); aggiornaRiepilogoDate(); });
  $('#altre-date').addEventListener('click', (ev) => {
    const r = ev.target.closest('[data-togli-data]');
    if (r) { r.closest('.data-extra').remove(); aggiornaRiepilogoDate(); }
  });
  fa.addEventListener('input', (ev) => {
    if (ev.target.matches('#data-fino, [data-data-extra], [name="data"], [data-k="comune"]')) aggiornaRiepilogoDate();
  });
  // Se cambia data, comune o tipo dopo l'avviso "sembra già presente", il controllo doppioni si rifà
  fa.addEventListener('input', (ev) => {
    if (doppioniVisti && ev.target.matches('[name="data"], [name="comune"], [name="tipo"], [name="titolo"]')) {
      doppioniVisti = false;
      $('#doppioni').hidden = true;
      $('#invia-aggiungi').textContent = 'Invia';
    }
  });

  fa.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const err = $('#errore-aggiungi');
    err.textContent = '';
    const v = Object.fromEntries(new FormData(fa).entries());
    if (!v.tipo) return (err.textContent = 'Scegli il tipo di mobilitazione.');
    if ((v.titolo || '').trim().length < 5) return (err.textContent = 'Scrivi un titolo di almeno 5 caratteri.');
    if (!v.data) return (err.textContent = 'Indica la data.');
    if (!v.comune.trim() || !/^[A-Za-z]{2}$/.test(v.provincia.trim()) || !v.regione) {
      return (err.textContent = 'Completa comune, provincia (2 lettere) e regione: usa "Trova sulla mappa".');
    }
    if (!punto) return (err.textContent = 'Metti il punto sulla mappa: usa "Trova sulla mappa" o tocca la mappa.');

    let luoghi = [];
    try {
      if (document.querySelector('.citta-extra')) err.textContent = '';
      luoghi = await raccogliAltreCitta();
    } catch (e) {
      return (err.textContent = e.message);
    }
    const date_extra = dateExtra();
    if (date_extra.length + 1 > MAX_GIORNI) return (err.textContent = `Al massimo ${MAX_GIORNI} giorni per evento.`);
    if ((date_extra.length + 1) * (luoghi.length + 1) > MAX_RIGHE) return (err.textContent = `Troppe combinazioni di giorni e città: il massimo è ${MAX_RIGHE} in tutto.`);
    const corpo = {
      luoghi, date_extra,
      tipo: v.tipo, titolo: v.titolo, data: v.data, ora_inizio: v.ora_inizio || null, ora_fine: v.ora_fine || null,
      comune: v.comune, provincia: v.provincia.toUpperCase(), regione: v.regione, luogo: v.luogo,
      lat: punto.lat, lng: punto.lng, posizione_approssimativa: approssimativa,
      organizzatori: v.organizzatori.split(',').map((s) => s.trim()).filter(Boolean),
      fonte: v.fonte, sito_web: v.sito_web, turnstile: tokenTurnstile('ts-aggiungi'),
      // Dopo l'avviso "sembra già presente", il secondo invio conferma che è un evento diverso
      confermo_diverso: doppioniVisti,
    };
    const btn = $('#invia-aggiungi');
    btn.disabled = true;
    try {
      const r = await fetch('/api/mobilitazioni', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(corpo) });
      const d = await r.json().catch(() => ({}));
      if (r.status === 409 && Array.isArray(d.doppioni)) {
        // Il server ha trovato eventi molto simili già inseriti (anche quelli non ancora sulla mappa)
        doppioniVisti = true;
        $('#doppioni').innerHTML = '<strong>Sembra già presente. È uno di questi?</strong><ul>' +
          d.doppioni.map((x) => `<li>${x.quasi_certo ? '<strong>Quasi certamente lo stesso:</strong> ' : ''}${esc(x.titolo)} · ${esc(x.comune)}${x.luogo ? ', ' + esc(x.luogo) : ''}${x.ora_inizio ? ', ore ' + esc(x.ora_inizio) : ''}` +
            (x.id ? ` · <a href="./?e=${encodeURIComponent(x.id)}" data-vai-doppione="${esc(x.id)}">apri</a>` : '') + '</li>').join('') +
          '</ul>Se è lo stesso, non serve inviarlo: puoi <em>confermarlo</em> o <em>correggerlo</em> dalla sua scheda. Se è un evento diverso, premi <strong>È un evento diverso: invia</strong>.';
        $('#doppioni').hidden = false;
        $('#doppioni').scrollIntoView({ block: 'nearest' });
        btn.textContent = 'È un evento diverso: invia';
        err.textContent = '';
        mostraTurnstile('ts-aggiungi');
        return;
      }
      if (!r.ok || !d.ok) {
        err.textContent = d.errore || 'Invio non riuscito. Riprova tra poco.';
        mostraTurnstile('ts-aggiungi');
        return;
      }
      $('#dlg-aggiungi').close();
      btn.textContent = 'Invia';
      fa.reset();
      $('#altre-citta').innerHTML = '';
      $('#altre-date').innerHTML = '';
      aggiornaRiepilogoDate();
      punto = null;
      if (puntoMarker) { miniMappa.removeLayer(puntoMarker); puntoMarker = null; }
      const giorniN = date_extra.length + 1, cittaN = luoghi.length + 1;
      const quante = (d.ids || []).length > 1
        ? ' ' + [cittaN > 1 ? `in ${cittaN} città` : '', giorniN > 1 ? `per ${giorniN} giorni` : ''].filter(Boolean).join(' e ')
        : '';
      avvisoOk(d.visibile_subito
        ? `Grazie! La mobilitazione è sulla mappa${quante} come "Da verificare": un moderatore la controllerà.`
        : 'Grazie! Un moderatore controllerà la segnalazione prima di pubblicarla.');
      await carica(true);
      const m = markerPerId[d.id];
      if (m && gruppo.zoomToShowLayer) gruppo.zoomToShowLayer(m, () => m.openPopup());
    } catch {
      err.textContent = 'Connessione non riuscita. Riprova tra poco.';
    } finally {
      btn.disabled = false;
    }
  });

  // ---------- Modulo: segnala problema ----------
  const fp = $('#form-problema');
  let idProblema = null;
  function apriProblema(id) {
    const e = eventi.find((x) => x.id === id);
    if (!e) return;
    idProblema = id;
    fp.reset();
    $('#errore-problema').textContent = '';
    $('#problema-evento').textContent = `${e.titolo} · ${dataBreve(e.data)} · ${e.comune}`;
    RETE.scrittura($('#dlg-problema'));
    mostraTurnstile('ts-problema');
  }
  fp.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const v = Object.fromEntries(new FormData(fp).entries());
    if (!v.motivo) return ($('#errore-problema').textContent = 'Scegli che cosa non va.');
    try {
      const r = await fetch(`/api/mobilitazioni/${encodeURIComponent(idProblema)}/problema`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ motivo: v.motivo, nota: v.nota, sito_web: v.sito_web, turnstile: tokenTurnstile('ts-problema') }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.ok) {
        $('#errore-problema').textContent = d.errore || 'Invio non riuscito.';
        mostraTurnstile('ts-problema');
        return;
      }
      $('#dlg-problema').close();
      avvisoOk(d.gia_segnalato ? 'Avevi già segnalato questo evento. Grazie!' : 'Grazie, la segnalazione è arrivata ai moderatori.');
      if (d.nascosto) carica(true);
    } catch {
      $('#errore-problema').textContent = 'Connessione non riuscita. Riprova tra poco.';
    }
  });

  // ---------- Calendario ----------
  function piuOre(data, ora, ore) {
    const [h, m] = ora.split(':').map(Number);
    const d = new Date(Date.UTC(+data.slice(0, 4), +data.slice(5, 7) - 1, +data.slice(8, 10), h + ore, m));
    return d.toISOString().slice(0, 16).replace(/[-:]/g, '').replace('T', 'T') + '00';
  }
  function compatto(data, ora) { return data.replace(/-/g, '') + 'T' + ora.replace(':', '') + '00'; }
  function intervallo(e) {
    if (!e.ora_inizio) {
      return { tuttoIlGiorno: true, inizio: e.data.replace(/-/g, ''), fine: piuGiorni(e.data, 1).replace(/-/g, '') };
    }
    const fine = e.ora_fine && e.ora_fine > e.ora_inizio ? compatto(e.data, e.ora_fine) : piuOre(e.data, e.ora_inizio, 2);
    return { tuttoIlGiorno: false, inizio: compatto(e.data, e.ora_inizio), fine };
  }
  function luogoTesto(e) { return [e.luogo, `${e.comune} (${e.provincia})`].filter(Boolean).join(', '); }
  function descrizione(e) {
    const t = TIPI[e.tipo] || TIPI.altro;
    return [t.nome, (e.organizzatori || []).length ? 'Promosso da: ' + e.organizzatori.join(', ') : '', e.fonte ? 'Fonte: ' + e.fonte : '',
      'Mappa: ' + RETE.PRINCIPALE + '/?e=' + encodeURIComponent(e.id)].filter(Boolean).join('\n');
  }
  function linkGoogle(e) {
    const i = intervallo(e);
    const p = new URLSearchParams({ action: 'TEMPLATE', text: e.titolo, dates: `${i.inizio}/${i.fine}`, details: descrizione(e), location: luogoTesto(e) });
    if (!i.tuttoIlGiorno) p.set('ctz', 'Europe/Rome');
    return 'https://calendar.google.com/calendar/render?' + p.toString();
  }
  function icsTesto(t) { return String(t).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1'); }
  function scaricaIcs(e) {
    const i = intervallo(e);
    const dt = (k, v) => (i.tuttoIlGiorno ? `${k};VALUE=DATE:${v}` : `${k};TZID=Europe/Rome:${v}`);
    const righe = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Mappa delle mobilitazioni//IT', 'CALSCALE:GREGORIAN',
      'BEGIN:VTIMEZONE', 'TZID:Europe/Rome',
      'BEGIN:STANDARD', 'DTSTART:19701025T030000', 'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU', 'TZOFFSETFROM:+0200', 'TZOFFSETTO:+0100', 'TZNAME:CET', 'END:STANDARD',
      'BEGIN:DAYLIGHT', 'DTSTART:19700329T020000', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU', 'TZOFFSETFROM:+0100', 'TZOFFSETTO:+0200', 'TZNAME:CEST', 'END:DAYLIGHT',
      'END:VTIMEZONE',
      'BEGIN:VEVENT', `UID:${e.id}@mappadellarivolta.org`, 'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z',
      dt('DTSTART', i.inizio), dt('DTEND', i.fine), 'SUMMARY:' + icsTesto(e.titolo), 'LOCATION:' + icsTesto(luogoTesto(e)),
      'DESCRIPTION:' + icsTesto(descrizione(e)), `GEO:${e.lat};${e.lng}`, 'URL:' + RETE.PRINCIPALE + '/?e=' + encodeURIComponent(e.id),
      'END:VEVENT', 'END:VCALENDAR'];
    const blob = new Blob([righe.join('\r\n') + '\r\n'], { type: 'text/calendar;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = e.id + '.ics';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  document.addEventListener('click', (ev) => {
    const c = ev.target.closest('[data-ics]');
    if (!c) return;
    ev.preventDefault();
    const e = eventi.find((x) => x.id === c.dataset.ics);
    if (e) scaricaIcs(e);
  });

  // Calendario da sottoscrivere (webcal) e Google
  (function () {
    const feed = RETE.PRINCIPALE + '/api/calendario.ics';
    $('#link-calendario').href = feed.replace(/^https?:/, 'webcal:');
    $('#google-calendario').href = 'https://calendar.google.com/calendar/r?cid=' + encodeURIComponent(feed.replace(/^https?:/, 'webcal:'));
    $('#google-calendario').target = '_blank';
    $('#google-calendario').rel = 'noopener';
  })();

  // ---------- Conferma ----------
  let idConferma = null;
  function apriConferma(id) {
    const e = eventi.find((x) => x.id === id);
    if (!e) return;
    idConferma = id;
    $('#errore-conferma').textContent = '';
    $('#conferma-evento').textContent = `${e.titolo} · ${dataBreve(e.data)} · ${e.comune}`;
    RETE.scrittura($('#dlg-conferma'));
    mostraTurnstile('ts-conferma');
  }
  $('#form-conferma').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    try {
      const r = await fetch(`/api/mobilitazioni/${encodeURIComponent(idConferma)}/conferma`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sito_web: $('#form-conferma').sito_web.value, turnstile: tokenTurnstile('ts-conferma') }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.ok) {
        $('#errore-conferma').textContent = d.errore || 'Invio non riuscito.';
        mostraTurnstile('ts-conferma');
        return;
      }
      $('#dlg-conferma').close();
      avvisoOk(d.gia_confermato ? 'Avevi già confermato questo evento. Grazie!'
        : d.verificato ? 'Grazie! Con la tua conferma l’evento è ora verificato.' : 'Grazie per la conferma!');
      carica(true);
    } catch {
      $('#errore-conferma').textContent = 'Connessione non riuscita. Riprova tra poco.';
    }
  });

  // ---------- Correggi ----------
  const fc = $('#form-correggi');
  fc.tipo.innerHTML = Object.entries(TIPI).map(([k, t]) => `<option value="${k}">${t.icona} ${esc(t.nome)}</option>`).join('');
  let idCorreggi = null;
  function apriCorreggi(id) {
    const e = eventi.find((x) => x.id === id);
    if (!e) return;
    idCorreggi = id;
    fc.reset();
    $('#errore-correggi').textContent = '';
    $('#correggi-evento').textContent = `${e.comune} (${e.provincia})${e.luogo ? ' · ' + e.luogo : ''}`;
    fc.tipo.value = e.tipo;
    fc.titolo.value = e.titolo;
    fc.data.value = e.data;
    fc.ora_inizio.value = e.ora_inizio || '';
    fc.ora_fine.value = e.ora_fine || '';
    fc.luogo.value = e.luogo || '';
    fc.organizzatori.value = (e.organizzatori || []).join(', ');
    fc.fonte.value = e.fonte || '';
    RETE.scrittura($('#dlg-correggi'));
    mostraTurnstile('ts-correggi');
  }
  fc.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const v = Object.fromEntries(new FormData(fc).entries());
    if ((v.motivo || '').trim().length < 5) return ($('#errore-correggi').textContent = 'Spiega in poche parole cosa correggi e perché.');
    const corpo = {
      campi: {
        tipo: v.tipo, titolo: v.titolo, data: v.data, ora_inizio: v.ora_inizio || null, ora_fine: v.ora_fine || null,
        luogo: v.luogo, organizzatori: v.organizzatori.split(',').map((x) => x.trim()).filter(Boolean), fonte: v.fonte,
      },
      annullato: !!fc.annullato.checked, motivo: v.motivo, sito_web: v.sito_web, turnstile: tokenTurnstile('ts-correggi'),
    };
    try {
      const r = await fetch(`/api/mobilitazioni/${encodeURIComponent(idCorreggi)}/modifiche`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(corpo),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.ok) {
        $('#errore-correggi').textContent = d.errore || 'Invio non riuscito.';
        mostraTurnstile('ts-correggi');
        return;
      }
      $('#dlg-correggi').close();
      avvisoOk('Grazie! La correzione è arrivata ai moderatori: sarà applicata dopo un controllo.');
    } catch {
      $('#errore-correggi').textContent = 'Connessione non riuscita. Riprova tra poco.';
    }
  });

  // Dall'avviso doppioni: chiude il modulo e apre l'evento già presente
  document.addEventListener('click', (ev) => {
    const l = ev.target.closest('[data-vai-doppione]');
    if (!l) return;
    const m = markerPerId[l.dataset.vaiDoppione];
    if (!m || !gruppo) return; // non è sulla mappa (es. filtri): segue il link
    ev.preventDefault();
    $('#dlg-aggiungi').close();
    $('#mappa').scrollIntoView({ block: 'center' });
    gruppo.zoomToShowLayer ? gruppo.zoomToShowLayer(m, () => m.openPopup()) : (mappa.setView(m.getLatLng(), 14), m.openPopup());
  });

  // ---------- Link diretto a un evento (?e=id) ----------
  async function avvio() {
    await carica();
    const id = new URLSearchParams(location.search).get('e');
    const m = id && markerPerId[id];
    // Link a un evento già passato (es. da un vecchio messaggio Telegram): si apre nell'archivio
    if (id && !m && /^\d{4}-\d{2}-\d{2}-/.test(id) && id.slice(0, 10) < oggiRoma()) {
      location.replace('archivio.html?e=' + encodeURIComponent(id));
      return;
    }
    if (id && !m) {
      $('#avviso-mappa').textContent = 'Questo evento non è visibile sulla mappa pubblica: può essere nascosto, rifiutato o ancora in coda di verifica.';
      $('#avviso-mappa').hidden = false;
    }
    if (m && gruppo) {
      // Aspetta che la pagina abbia finito di caricarsi: al termine la mappa si ricentra sull'Italia
      if (document.readyState !== 'complete') await new Promise((ok) => window.addEventListener('load', ok, { once: true }));
      vistaScelta = true;
      mappa.invalidateSize();
      $('#mappa').scrollIntoView({ block: 'center' });
      gruppo.zoomToShowLayer ? gruppo.zoomToShowLayer(m, () => m.openPopup()) : (mappa.setView(m.getLatLng(), 14), m.openPopup());
    }
  }
  avvio();
})();
