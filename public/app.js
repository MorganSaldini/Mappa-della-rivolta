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
    el.hidden = false;
    clearTimeout(avvisoOk.t);
    avvisoOk.t = setTimeout(() => (el.hidden = true), 6000);
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
  if (CONFIG.contattoRimozioni) {
    const c = $('#contatto');
    const href = CONFIG.contattoRimozioni.includes('@') ? 'mailto:' + CONFIG.contattoRimozioni : urlSicuro(CONFIG.contattoRimozioni);
    if (href) {
      c.innerHTML = `<strong>Contatti.</strong> Per chiedere la rimozione o la correzione di un contenuto: <a href="${esc(href)}">${esc(CONFIG.contattoRimozioni)}</a>`;
      c.hidden = false;
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
  if (window.L) {
    mappa = L.map('mappa', { zoomControl: true, scrollWheelZoom: false }).setView([42.3, 12.6], 6);
    mappa.fitBounds([[36.6, 6.6], [47.1, 18.5]]);
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
      <button type="button" class="bottone bottone--chiaro" data-problema="${esc(e.id)}">Segnala un problema</button>
    </div>`;
  }

  // ---------- Caricamento eventi ----------
  async function carica() {
    try {
      const r = await fetch('/api/eventi', { headers: { accept: 'application/json' } });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const d = await r.json();
      eventi = (d.eventi || []).filter((e) => e.data >= oggiRoma());
      if (d.giorni_conservazione) $('#giorni-cons').textContent = d.giorni_conservazione;
      $('#ultimo-agg').textContent = d.ultimo_aggiornamento
        ? new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(d.ultimo_aggiornamento.slice(0, 10) + 'T12:00:00Z'))
        : '—';
      if (window.L) $('#avviso-mappa').hidden = true;
    } catch (err) {
      eventi = [];
      $('#avviso-mappa').textContent = 'Impossibile caricare le mobilitazioni in questo momento. Riprova tra poco.';
      $('#avviso-mappa').hidden = false;
    }
    disegna();
  }

  function disegna() {
    // Contatori
    const attivi = eventi.filter((e) => e.stato !== 'annullato');
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
      eventi.forEach((e) => {
        const m = L.marker([e.lat, e.lng], { icon: icona(e), title: e.titolo, alt: e.titolo });
        m.bindPopup(() => htmlPopup(e), { maxWidth: 300 });
        markerPerId[e.id] = m;
        gruppo.addLayer(m);
      });
    }

    // Elenco
    if (!eventi.length) {
      $('#elenco').innerHTML = '<p>Nessuna mobilitazione in programma per ora. Aggiungine una!</p>';
      return;
    }
    let html = '', giorno = '';
    eventi.forEach((e) => {
      const t = TIPI[e.tipo] || TIPI.altro;
      if (e.data !== giorno) { giorno = e.data; html += `<h3 class="giorno">${esc(dataLunga(e.data))}</h3>`; }
      html += `<button type="button" class="voce" data-vai="${esc(e.id)}">
        <span class="pallino" style="--c:${t.colore}"></span>
        <span><strong class="${e.stato === 'annullato' ? 'barrato' : ''}">${esc(e.titolo)}</strong>
        ${esc(t.nome)} · ${esc(e.comune)} (${esc(e.provincia)})${e.ora_inizio ? ' · ' + esc(orario(e)) : ''}
        ${e.stato === 'da_verificare' ? ' · <em>da verificare</em>' : ''}${e.stato === 'annullato' ? ' · <strong>annullato</strong>' : ''}</span>
      </button>`;
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
    $('#dlg-aggiungi').showModal();
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
  $('#apri-aggiungi-2').addEventListener('click', apriAggiungi);

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

    // Controllo doppioni: stessa data entro 300 m, oppure stesso comune, stessa data e stesso tipo
    if (!doppioniVisti) {
      const simili = eventi.filter((e) => e.data === v.data &&
        (distanzaMetri(punto, e) < 300 || (e.comune.toLowerCase() === v.comune.trim().toLowerCase() && e.tipo === v.tipo)));
      if (simili.length) {
        doppioniVisti = true;
        $('#doppioni').innerHTML = '<strong>È uno di questi?</strong><ul>' +
          simili.map((e) => `<li>${esc(e.titolo)} · ${esc(e.comune)}${e.ora_inizio ? ', ore ' + esc(e.ora_inizio) : ''}</li>`).join('') +
          '</ul>Se sì, chiudi il modulo: è già sulla mappa. Se è un evento diverso, premi di nuovo <em>Invia</em>.';
        $('#doppioni').hidden = false;
        return;
      }
    }

    const corpo = {
      tipo: v.tipo, titolo: v.titolo, data: v.data, ora_inizio: v.ora_inizio || null, ora_fine: v.ora_fine || null,
      comune: v.comune, provincia: v.provincia.toUpperCase(), regione: v.regione, luogo: v.luogo,
      lat: punto.lat, lng: punto.lng, posizione_approssimativa: approssimativa,
      organizzatori: v.organizzatori.split(',').map((s) => s.trim()).filter(Boolean),
      fonte: v.fonte, sito_web: v.sito_web, turnstile: tokenTurnstile('ts-aggiungi'),
    };
    const btn = $('#invia-aggiungi');
    btn.disabled = true;
    try {
      const r = await fetch('/api/eventi', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(corpo) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.ok) {
        err.textContent = d.errore || 'Invio non riuscito. Riprova tra poco.';
        mostraTurnstile('ts-aggiungi');
        return;
      }
      $('#dlg-aggiungi').close();
      fa.reset();
      punto = null;
      if (puntoMarker) { miniMappa.removeLayer(puntoMarker); puntoMarker = null; }
      avvisoOk(d.visibile_subito
        ? 'Grazie! La mobilitazione è sulla mappa come "Da verificare": un moderatore la controllerà.'
        : 'Grazie! Un moderatore controllerà la segnalazione prima di pubblicarla.');
      await carica();
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
    $('#dlg-problema').showModal();
    mostraTurnstile('ts-problema');
  }
  fp.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const v = Object.fromEntries(new FormData(fp).entries());
    if (!v.motivo) return ($('#errore-problema').textContent = 'Scegli che cosa non va.');
    try {
      const r = await fetch(`/api/eventi/${encodeURIComponent(idProblema)}/problema`, {
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
      if (d.nascosto) carica();
    } catch {
      $('#errore-problema').textContent = 'Connessione non riuscita. Riprova tra poco.';
    }
  });

  carica();
})();
