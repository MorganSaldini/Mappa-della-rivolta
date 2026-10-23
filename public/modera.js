/* Pannello moderatori — tutte le decisioni vengono ricontrollate dal server */
(function () {
  'use strict';
  const $ = (s) => document.querySelector(s);

  const TIPI = {
    corteo: ['🚩', 'Corteo', '#c8322a'], presidio: ['✋', 'Presidio', '#d96c00'],
    sciopero_generale: ['✊', 'Sciopero generale', '#8e1b5e'], sciopero_categoria: ['🛠️', 'Sciopero di categoria', '#2a5db0'],
    picchetto: ['🏭', 'Picchetto', '#0f7a6b'], assemblea: ['🗣️', 'Assemblea', '#6b4fbb'], altro: ['📣', 'Altra iniziativa', '#55525c'],
  };
  const STATI = { da_verificare: 'Da verificare', verificato: '✓ Verificato', annullato: 'Annullato', nascosto: 'Nascosto', rifiutato: 'Rifiutato' };
  const NOMI_CAMPI = {
    tipo: 'Tipo', titolo: 'Titolo', data: 'Data', ora_inizio: 'Inizio', ora_fine: 'Fine', comune: 'Comune', provincia: 'Provincia',
    regione: 'Regione', luogo: 'Luogo', lat: 'Latitudine', lng: 'Longitudine', posizione_approssimativa: 'Posizione indicativa',
    organizzatori: 'Organizzatori', fonte: 'Fonte', stato: 'Stato',
  };
  const MOTIVI = { sbagliato: 'Informazioni sbagliate', annullato: 'Annullato/rinviato', doppione: 'Doppione', inappropriato: 'Inappropriato', altro: 'Altro' };
  let REGIONI = [];
  let sessione = null;
  let ultimi = {};

  function esc(t) {
    return String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  }

  // Evento collegato ad altri (più città e/o più giorni): testo breve per l'etichetta e testo completo
  function partiGruppo(e) {
    const citta = String(e.gruppo_citta || '').split(',').map((x) => x.trim()).filter(Boolean);
    const date = String(e.gruppo_date || '').split(',').map((x) => x.trim()).filter(Boolean).sort();
    return { citta, date };
  }
  function riassuntoGruppo(e) {
    const { citta, date } = partiGruppo(e);
    return [citta.length > 1 ? `${citta.length} città` : '', date.length > 1 ? `${date.length} giorni` : ''].filter(Boolean).join(' · ') || `${e.gruppo_n} appuntamenti`;
  }
  function dettaglioGruppo(e) {
    const { citta, date } = partiGruppo(e);
    const giorno = (d) => d.split('-').reverse().slice(0, 2).join('/');
    return [citta.length > 1 ? `Città: ${citta.join(', ')}.` : '', date.length > 1 ? `Giorni: ${date.map(giorno).join(', ')}.` : '']
      .filter(Boolean).join(' ') + ` In tutto ${e.gruppo_n} appuntamenti collegati.`;
  }
  function dataIt(iso) {
    if (!iso) return '';
    return new Intl.DateTimeFormat('it-IT', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
      .format(new Date(iso.slice(0, 10) + 'T12:00:00Z'));
  }
  function urlSicuro(u) {
    try { const x = new URL(u); return ['http:', 'https:'].includes(x.protocol) ? x.href : null; } catch { return null; }
  }
  function avvisoOk(t) {
    const el = $('#avviso-ok');
    el.textContent = t; el.hidden = false;
    clearTimeout(avvisoOk.t); avvisoOk.t = setTimeout(() => (el.hidden = true), 5000);
  }
  function valore(campo, v) {
    if (v === null || v === undefined || v === '') return '<span class="tenue">—</span>';
    if (campo === 'organizzatori') return esc((Array.isArray(v) ? v : []).join(', ')) || '<span class="tenue">—</span>';
    if (campo === 'tipo') return esc((TIPI[v] || TIPI.altro).slice(0, 2).join(' '));
    if (campo === 'stato') return esc(STATI[v] || v);
    if (campo === 'data') return esc(dataIt(v));
    if (campo === 'fonte') { const u = urlSicuro(v); return u ? `<a href="${esc(u)}" target="_blank" rel="noopener nofollow">${esc(v)}</a>` : esc(v); }
    if (campo === 'posizione_approssimativa') return v ? 'sì' : 'no';
    return esc(v);
  }

  async function api(percorso, opzioni = {}) {
    const r = await fetch(percorso, {
      method: opzioni.corpo ? 'POST' : 'GET',
      headers: opzioni.corpo ? { 'content-type': 'application/json' } : {},
      body: opzioni.corpo ? JSON.stringify(opzioni.corpo) : undefined,
      credentials: 'same-origin', cache: 'no-store',
    });
    const d = await r.json().catch(() => ({ ok: false, errore: 'Risposta non valida dal server.' }));
    if (r.status === 401 && !opzioni.silenzioso) mostraAccesso();
    if (!r.ok || !d.ok) { const x = new Error(d.errore || 'Operazione non riuscita.'); x.dati = d; throw x; }
    return d;
  }

  // ---------- Richieste e avvisi dentro la pagina (al posto delle finestre del browser) ----------
  function finestraDomanda() {
    let d = document.getElementById('dlg-chiedi');
    if (d) return d;
    d = document.createElement('dialog');
    d.id = 'dlg-chiedi';
    d.className = 'dlg-chiedi';
    d.setAttribute('aria-labelledby', 'chiedi-testo');
    d.innerHTML = '<form method="dialog"><p id="chiedi-testo" class="chiedi-testo"></p>' +
      '<div class="dlg__azioni"><button value="no" class="bottone bottone--chiaro" id="chiedi-no">Annulla</button>' +
      '<button value="si" class="bottone bottone--pieno" id="chiedi-si">Conferma</button></div></form>';
    document.body.append(d);
    return d;
  }
  // Domanda sì/no: restituisce true se si conferma
  function chiedi(testo, { si = 'Conferma', no = 'Annulla' } = {}) {
    const d = finestraDomanda();
    d.querySelector('#chiedi-testo').textContent = testo;
    d.querySelector('#chiedi-si').textContent = si;
    const bNo = d.querySelector('#chiedi-no');
    bNo.textContent = no; bNo.hidden = false;
    d.returnValue = '';
    d.showModal();
    d.querySelector('#chiedi-si').focus();
    return new Promise((ok) => d.addEventListener('close', () => ok(d.returnValue === 'si'), { once: true }));
  }
  // Avviso con un solo pulsante
  function avvisa(testo) {
    const d = finestraDomanda();
    d.querySelector('#chiedi-testo').textContent = testo;
    d.querySelector('#chiedi-si').textContent = 'OK';
    d.querySelector('#chiedi-no').hidden = true;
    d.returnValue = '';
    if (!d.open) d.showModal();
    return new Promise((ok) => d.addEventListener('close', () => ok(), { once: true }));
  }

  // ---------- Accesso ----------
  function mostraAccesso() {
    sessione = null;
    $('#vista-pannello').hidden = true;
    $('#vista-accesso').hidden = false;
    $('#chi').innerHTML = '';
    $('#codice').focus();
  }
  async function entra() {
    try { sessione = await api('/api/moderazione/io', { silenzioso: true }); } catch { return mostraAccesso(); }
    $('#vista-accesso').hidden = true;
    $('#vista-pannello').hidden = false;
    $('#chi').innerHTML = `${esc(sessione.nome)}${sessione.id === 0 ? '' : ' · ' + (sessione.ruolo === 'admin' ? 'amministratore' : 'moderatore')}${sessione.regioni.length ? ' (' + esc(sessione.regioni.join(', ')) + ')' : ''} <button type="button" id="esci">Esci</button>`;
    document.querySelectorAll('.solo-admin').forEach((b) => (b.hidden = sessione.ruolo !== 'admin'));
    caricaCoda();
  }
  $('#form-accesso').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    $('#errore-accesso').textContent = '';
    try {
      await api('/api/moderazione/accesso', { corpo: { codice: $('#codice').value }, silenzioso: true });
      $('#codice').value = '';
      entra();
    } catch (e) { $('#errore-accesso').textContent = e.message; }
  });
  document.addEventListener('click', async (ev) => {
    if (ev.target.id === 'esci') { await api('/api/moderazione/esci', { corpo: {} }).catch(() => {}); mostraAccesso(); }
  });

  // ---------- Schede ----------
  document.querySelectorAll('[data-scheda]').forEach((b) => b.addEventListener('click', () => apriScheda(b.dataset.scheda)));
  const SCHEDE_EVENTI = ['nuovi', 'modifiche', 'problemi', 'sospetti', 'doppioni', 'tutti'];
  function schedaAttiva() {
    const b = document.querySelector('[data-scheda][aria-selected="true"]');
    return b ? b.dataset.scheda : 'nuovi';
  }
  function apriScheda(nome) {
    document.querySelectorAll('[data-scheda]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.scheda === nome)));
    document.querySelectorAll('.scheda').forEach((s) => (s.hidden = s.id !== 'scheda-' + nome));
    $('#barra-agente').hidden = nome !== 'nuovi';
    // Filtri e mappa valgono per tutte le sezioni con eventi
    const conEventi = SCHEDE_EVENTI.includes(nome);
    $('#strumenti-mod').hidden = !conEventi;
    if (nome === 'tutti') cercaTutti();
    if (nome === 'doppioni') caricaDoppioni();
    if (nome === 'staff') caricaStaff();
    if (nome === 'impostazioni') caricaImpostazioni();
    if (['nuovi', 'modifiche', 'problemi', 'sospetti'].includes(nome)) caricaCoda();
  }

  // ---------- Filtri (uguali per tutte le sezioni) ----------
  const ff = $('#filtri-mod');
  ff.tipo.insertAdjacentHTML('beforeend', Object.entries(TIPI).map(([k, t]) => `<option value="${k}">${t[0]} ${esc(t[1])}</option>`).join(''));
  ff.regione.insertAdjacentHTML('beforeend', ['Abruzzo', 'Basilicata', 'Calabria', 'Campania', 'Emilia-Romagna', 'Friuli-Venezia Giulia', 'Lazio', 'Liguria', 'Lombardia', 'Marche', 'Molise', 'Piemonte', 'Puglia', 'Sardegna', 'Sicilia', 'Toscana', 'Trentino-Alto Adige', 'Umbria', "Valle d'Aosta", 'Veneto'].map((r) => `<option>${esc(r)}</option>`).join(''));
  const oggiIso = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(new Date());
  const piuGiorni = (iso, n) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const normale = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  function filtriAttivi() {
    return ff.testo.value.trim() || ff.tipo.value || ff.regione.value || ff.periodo.value || ff.stato.value || ff.fonte.value || ff.dal.value || ff.al.value;
  }
  let pubblicazioneImmediata = true; // aggiornato a ogni caricamento della coda
  // Un elemento (evento, correzione o segnalazione) passa i filtri?
  function passa(e) {
    if (!e) return false;
    const t = normale(ff.testo.value.trim());
    if (t && !normale([e.titolo, e.comune, e.luogo, e.id || e.evento_id, (e.organizzatori || []).join(' ')].join(' ')).includes(t)) return false;
    if (ff.tipo.value && e.tipo !== ff.tipo.value) return false;
    if (ff.regione.value && e.regione !== ff.regione.value) return false;
    if (ff.stato.value === 'pubblici') {
      // Come sulla mappa pubblica: da oggi in poi, verificati, annullati e (se attiva la pubblicazione immediata) da verificare
      const vis = ['verificato', 'annullato'].concat(pubblicazioneImmediata ? ['da_verificare'] : []);
      if (!vis.includes(e.stato) || e.data < oggiIso()) return false;
    } else if (ff.stato.value && e.stato !== ff.stato.value) return false;
    if (ff.fonte.value) {
      // Fonte dell'evento (per le correzioni proposte conta la fonte attuale dell'evento)
      const f = 'fonte_attuale' in e ? e.fonte_attuale : e.fonte;
      if (f !== undefined) {
        const ha = !!String(f || '').trim();
        if (ff.fonte.value === 'con' ? !ha : ha) return false;
      }
    }
    if (ff.dal.value && e.data && e.data < ff.dal.value) return false;
    if (ff.al.value && e.data && e.data > ff.al.value) return false;
    const oggi = oggiIso(), p = ff.periodo.value;
    if (p === 'passati' && !(e.data < oggi)) return false;
    if (p && p !== 'passati') {
      if (e.data < oggi) return false;
      if (p === 'oggi' && e.data !== oggi) return false;
      if (p === 'settimana' && e.data > piuGiorni(oggi, 7)) return false;
      if (p === 'mese' && e.data > piuGiorni(oggi, 31)) return false;
    }
    return true;
  }
  const filtrati = (lista) => (lista || []).filter(passa);
  const nienteConFiltri = (testo) => `<p class="vuoto">${filtriAttivi() ? 'Nessun risultato con questi filtri.' : testo}</p>`;
  let rinvio;
  ff.addEventListener('input', () => { clearTimeout(rinvio); rinvio = setTimeout(ridisegna, 150); });
  ff.addEventListener('submit', (ev) => ev.preventDefault());
  $('#azzera-filtri').addEventListener('click', () => { ff.reset(); ridisegna(); });
  function ridisegna() {
    const n = schedaAttiva();
    if (n === 'tutti') disegnaTutti();
    else if (n === 'doppioni') disegnaDoppioni();
    else disegnaCoda();
  }

  // ---------- Mappa del pannello ----------
  let mappaMod = null, livelloMod = null, mappaVisibile = true;
  try { mappaVisibile = localStorage.getItem('mod-mappa') !== 'no'; } catch (_) { /* memoria del browser non disponibile */ }
  function aggiornaInterruttore() {
    $('#box-mappa-mod').hidden = !mappaVisibile;
    $('#mostra-mappa').textContent = mappaVisibile ? '🗺 Nascondi mappa' : '🗺 Mostra mappa';
  }
  $('#mostra-mappa').addEventListener('click', () => {
    mappaVisibile = !mappaVisibile;
    try { localStorage.setItem('mod-mappa', mappaVisibile ? 'si' : 'no'); } catch (_) { /* niente */ }
    aggiornaInterruttore();
    if (mappaVisibile) { setTimeout(() => mappaMod && mappaMod.invalidateSize(), 50); ridisegna(); }
  });
  aggiornaInterruttore();
  window.addEventListener('resize', () => { clearTimeout(rinvio); rinvio = setTimeout(ridisegna, 250); });
  // punti: [{ id, lat, lng, tipo, titolo, data, comune, ancora }]; linee: coppie di punti da collegare (doppioni)
  function disegnaMappa(punti, linee = []) {
    if (!window.L || !mappaVisibile) return;
    if (!mappaMod) {
      mappaMod = L.map('mappa-mod', { scrollWheelZoom: false }).setView([42.3, 12.6], 5);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '© contributori OpenStreetMap' }).addTo(mappaMod);
      livelloMod = L.layerGroup().addTo(mappaMod);
    }
    mappaMod.invalidateSize();
    livelloMod.clearLayers();
    const validi = punti.filter((p) => Number.isFinite(+p.lat) && Number.isFinite(+p.lng));
    for (const [a, b] of linee) {
      if (Number.isFinite(+a.lat) && Number.isFinite(+b.lat)) L.polyline([[a.lat, a.lng], [b.lat, b.lng]], { color: '#9f241d', weight: 3, dashArray: '6 6' }).addTo(livelloMod);
    }
    for (const p of validi) {
      const t = TIPI[p.tipo] || TIPI.altro;
      const m = L.circleMarker([p.lat, p.lng], { radius: 8, color: '#fff', weight: 2, fillColor: t[2], fillOpacity: 0.95 }).addTo(livelloMod);
      m.bindPopup(`<strong>${esc(p.titolo)}</strong><br>${esc(dataIt(p.data))} · ${esc(p.comune)}<br><a href="#" data-vai-scheda="${esc(p.ancora)}">Vai alla scheda ↓</a>`);
    }
    $('#conta-mappa').textContent = validi.length === 1 ? '1 punto sulla mappa' : `${validi.length} punti sulla mappa`;
    if (validi.length) mappaMod.fitBounds(validi.map((p) => [p.lat, p.lng]), { padding: [24, 24], maxZoom: 12 });
    else mappaMod.setView([42.3, 12.6], 5);
  }
  document.addEventListener('click', (ev) => {
    const l = ev.target.closest('[data-vai-scheda]');
    if (!l) return;
    ev.preventDefault();
    const el = document.getElementById(l.dataset.vaiScheda);
    if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.add('lampeggia'); setTimeout(() => el.classList.remove('lampeggia'), 1600); }
  });
  const punto = (e, ancora) => ({ id: e.id || e.evento_id, lat: e.lat, lng: e.lng, tipo: e.tipo, titolo: e.titolo, data: e.data, comune: e.comune, ancora });
  const ancoraDi = (pref, id) => pref + '-' + String(id).replace(/[^a-zA-Z0-9_-]/g, '_');

  // ---------- Schede evento ----------
  function schedaEvento(e, azioni, extra = '') {
    const t = TIPI[e.tipo] || TIPI.altro;
    ultimi[e.id] = e;
    const fonte = e.fonte && urlSicuro(e.fonte);
    return `<article class="scheda-ev" id="${esc(ancoraDi('ev', e.id))}" style="--c:${t[2]}">
      <div class="etichette"><span class="etichetta" style="--c:${t[2]}">${t[0]} ${esc(t[1])}</span>
        <span class="etichetta etichetta--stato etichetta--${esc(e.stato)}">${esc(STATI[e.stato] || e.stato)}</span>
        ${e.segnalazioni_aperte ? `<span class="etichetta" style="--c:#9f241d">⚠️ ${e.segnalazioni_aperte} segnalazioni</span>` : ''}
        ${e.telegram_msg_id ? '<span class="etichetta" style="--c:#2a8fd6">Telegram ✓</span>' : ''}
        ${e.gruppo_n > 1 ? `<span class="etichetta" style="--c:#5f5d66">🗺 ${esc(riassuntoGruppo(e))}</span>` : ''}
        ${e.sospetto ? '<span class="etichetta" style="--c:#b35c00">🤖 Sospetto</span>' : ''}</div>
      <h3>${esc(e.titolo)}</h3>
      <p><strong>${esc(dataIt(e.data))}</strong>${e.ora_inizio ? ', ore ' + esc(e.ora_inizio) : ''}${e.ora_fine ? '–' + esc(e.ora_fine) : ''}</p>
      <p>${e.luogo ? esc(e.luogo) + ', ' : ''}${esc(e.comune)} (${esc(e.provincia)}) · ${esc(e.regione)}${e.posizione_approssimativa ? ' · <em>posizione indicativa</em>' : ''}</p>
      ${(e.organizzatori || []).length ? `<p>Promosso da: ${esc(e.organizzatori.join(', '))}</p>` : ''}
      <p>${fonte ? `🔗 <a href="${esc(fonte)}" target="_blank" rel="noopener nofollow">Apri la fonte</a>` : '<strong style="color:#9f241d">Nessuna fonte</strong>'}
        · ${e.conferme || 0} conferme · <a href="./?e=${encodeURIComponent(e.id)}" target="_blank">vedi sulla mappa</a></p>
      ${e.gruppo_n > 1 ? `<p class="nota-agente">${esc(dettaglioGruppo(e))}</p>` : ''}
      ${e.note && e.note !== 'esempio' ? `<p class="nota-agente">${esc(e.note)}</p>` : ''}
      ${extra}
      <p class="tenue">${esc(e.id)} · versione ${e.versione || 1} · aggiornato ${esc(dataIt(e.aggiornato_il))}</p>
      <div class="azioni">${azioni}</div>
    </article>`;
  }
  // Link di ricerca già compilato per trovare una fonte (si apre in una nuova scheda)
  const MESI_IT = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
  function linkCercaFonte(e) {
    const titolo = String(e.titolo || '').replace(/^possibili disagi:\s*/i, '').replace(/[«»"!]/g, ' ').trim();
    const [, m, g] = String(e.data || '').split('-');
    const giorno = g ? `${Number(g)} ${MESI_IT[Number(m) - 1]}` : '';
    const q = [titolo, e.comune && `"${e.comune}"`, giorno].filter(Boolean).join(' ');
    return `<a class="bottone bottone--chiaro" href="https://www.google.com/search?q=${encodeURIComponent(q)}" target="_blank" rel="noopener noreferrer" title="Cerca in rete: ${esc(q)}">🔎 Cerca fonte</a>` +
      `<a class="bottone bottone--chiaro" href="https://www.google.com/search?tbm=nws&q=${encodeURIComponent(q)}" target="_blank" rel="noopener noreferrer" title="Cerca nelle notizie: ${esc(q)}">📰 Notizie</a>`;
  }

  function bottoniEvento(e) {
    const b = (az, testo, cls = 'bottone--chiaro') => `<button type="button" class="bottone ${cls}" data-az="${az}" data-id="${esc(e.id)}">${testo}</button>`;
    const out = [];
    // "Approva tutti" solo se nel gruppo c'è ancora qualcosa da approvare
    const daApprovare = e.gruppo_da_approvare === undefined ? (e.gruppo_n > 1 ? e.gruppo_n : 0) : Number(e.gruppo_da_approvare);
    if (e.gruppo_n > 1 && daApprovare > 0 && !(daApprovare === 1 && e.stato !== 'verificato')) {
      out.push(b('approva_gruppo', `✓ Approva tutti gli appuntamenti da verificare (${daApprovare})`, 'bottone--ok'));
    }
    if (e.stato !== 'verificato') out.push(b('approva', e.gruppo_n > 1 && daApprovare > 1 ? '✓ Approva solo questo' : '✓ Approva', 'bottone--ok'));
    if (e.stato !== 'annullato' && e.stato !== 'rifiutato') out.push(b('annulla', 'Segna annullato'));
    if (e.stato !== 'nascosto' && e.stato !== 'rifiutato') out.push(b('nascondi', 'Nascondi'));
    if (e.stato !== 'rifiutato') out.push(b('rifiuta', '✕ Rifiuta', 'bottone--no'));
    if (e.stato === 'rifiutato' || e.stato === 'nascosto') out.push(b('rimetti', 'Rimetti da verificare'));
    out.push(b('modifica', '✏️ Modifica'));
    out.push(b('cronologia', '🕘 Cronologia'));
    out.push(linkCercaFonte(e));
    return out.join('');
  }

  function bottoniSospetto(e) {
    const b = (az, testo, cls = 'bottone--chiaro') => `<button type="button" class="bottone ${cls}" data-az="${az}" data-id="${esc(e.id)}">${testo}</button>`;
    return [
      b('conferma_sospetto', '✕ Confermo: rifiuta', 'bottone--no'),
      b('declina_sospetto', '✓ Non è sospetto'),
      e.stato !== 'verificato' ? b('approva', '✓ Approva', 'bottone--ok') : '',
      b('modifica', '✏️ Modifica'),
      b('cronologia', '🕘 Cronologia'),
      linkCercaFonte(e),
    ].join('');
  }

  // ---------- Coda ----------
  let datiCoda = null, datiTutti = [], datiDoppioni = null;
  async function caricaCoda() {
    let d;
    try { d = await api('/api/moderazione/coda'); } catch (e) { return; }
    if (typeof d.pubblicazione_immediata === 'boolean') pubblicazioneImmediata = d.pubblicazione_immediata;
    datiCoda = d;
    const conta = (id, n) => { $(id).textContent = n; $(id).classList.toggle('zero', !n); };
    conta('#n-nuovi', d.nuovi.length); conta('#n-modifiche', d.modifiche.length); conta('#n-problemi', d.problemi.length); conta('#n-sospetti', (d.sospetti || []).length);
    disegnaCoda();
    contaDoppioni();
  }

  function disegnaCoda() {
    const d = datiCoda;
    if (!d) return;
    const nuovi = filtrati(d.nuovi), sospetti = filtrati(d.sospetti || []);
    const modifiche = d.modifiche.filter((m) => passa({ ...m, organizzatori: [] }));
    const problemi = filtrati(d.problemi.map((p) => ({ ...p, id: p.evento_id })));

    $('#scheda-nuovi').innerHTML = nuovi.length
      ? '<p class="tenue">Controlla la fonte prima di approvare. Gli eventi nascosti sono stati segnalati più volte dalla community.</p>' +
        nuovi.map((e) => schedaEvento(e, bottoniEvento(e))).join('')
      : nienteConFiltri('Nessun evento da controllare. 🎉');

    $('#scheda-modifiche').innerHTML = modifiche.length ? modifiche.map((m) => {
      const attuale = { ...m, organizzatori: (() => { try { return JSON.parse(m.org_attuali || '[]'); } catch { return []; } })(), fonte: m.fonte_attuale };
      const righe = Object.entries(m.campi).map(([k, v]) =>
        `<tr><th>${esc(NOMI_CAMPI[k] || k)}</th><td class="prima">${valore(k, attuale[k])}</td><td class="dopo">${valore(k, v)}</td></tr>`).join('');
      return `<article class="scheda-ev" id="${esc(ancoraDi('mod', m.id))}">
        <h3>${esc(m.titolo)}</h3>
        <p>${esc(dataIt(m.data))} · ${esc(m.comune)} · stato attuale: ${esc(STATI[m.stato] || m.stato)}</p>
        <div class="motivo"><strong>Motivo:</strong> ${esc(m.motivo)}</div>
        <div class="tabella-scorri"><table class="diff"><tr><th>Campo</th><th>Ora</th><th>Proposto</th></tr>${righe}</table></div>
        <p class="tenue">Proposta del ${esc(dataIt(m.creato_il))} · <a href="./?e=${encodeURIComponent(m.evento_id)}" target="_blank">vedi sulla mappa</a></p>
        <div class="azioni">
          <button type="button" class="bottone bottone--ok" data-mod="accetta" data-id="${m.id}">✓ Accetta</button>
          <button type="button" class="bottone bottone--no" data-mod="rifiuta" data-id="${m.id}">✕ Rifiuta</button>
          <button type="button" class="bottone bottone--chiaro" data-az="cronologia" data-id="${esc(m.evento_id)}">🕘 Cronologia</button>
        </div></article>`;
    }).join('') : nienteConFiltri('Nessuna correzione in attesa.');

    $('#scheda-sospetti').innerHTML = sospetti.length
      ? '<p class="tenue">L’amministratore AI ha trovato qualcosa che non torna. Leggi il motivo e apri le fonti, poi decidi tu: <strong>Confermo</strong> rifiuta l’evento, <strong>Non è sospetto</strong> lo rimette nella coda normale.</p>' +
        sospetti.map((e) => schedaEvento(e, bottoniSospetto(e), `<div class="motivo motivo--ai"><strong>🤖 Perché è sospetto:</strong> ${esc(String(e.sospetto).replace(/^Amministratore AI: /, ''))}</div>`)).join('')
      : nienteConFiltri('Nessun sospetto da controllare. 🎉');

    $('#scheda-problemi').innerHTML = problemi.length ? problemi.map((p) => `<article class="scheda-ev" id="${esc(ancoraDi('pb', p.evento_id))}" style="--c:#9f241d">
        <h3>${esc(p.titolo)}</h3>
        <p>${esc(dataIt(p.data))} · ${esc(p.comune)} · stato: ${esc(STATI[p.stato] || p.stato)} · <strong>${p.n} segnalazioni</strong></p>
        <div class="motivo">${esc(String(p.dettagli || '').split(' | ').map((x) => { const [k, ...r] = x.split(': '); return (MOTIVI[k] || k) + (r.length ? ': ' + r.join(': ') : ''); }).join(' · '))}</div>
        <div class="azioni">
          <button type="button" class="bottone bottone--chiaro" data-az="chiudi_segnalazioni" data-id="${esc(p.evento_id)}">Segnalazioni infondate: chiudi</button>
          <button type="button" class="bottone bottone--chiaro" data-az="annulla" data-id="${esc(p.evento_id)}">Segna annullato</button>
          <button type="button" class="bottone bottone--chiaro" data-az="nascondi" data-id="${esc(p.evento_id)}">Nascondi</button>
          <button type="button" class="bottone bottone--no" data-az="rifiuta" data-id="${esc(p.evento_id)}">✕ Rifiuta</button>
          <button type="button" class="bottone bottone--chiaro" data-az="cronologia" data-id="${esc(p.evento_id)}">🕘 Cronologia</button>
        </div></article>`).join('') : nienteConFiltri('Nessuna segnalazione aperta.');

    const n = schedaAttiva();
    if (n === 'nuovi') disegnaMappa(nuovi.map((e) => punto(e, ancoraDi('ev', e.id))));
    if (n === 'sospetti') disegnaMappa(sospetti.map((e) => punto(e, ancoraDi('ev', e.id))));
    if (n === 'modifiche') disegnaMappa(modifiche.map((m) => punto({ ...m, id: m.evento_id }, ancoraDi('mod', m.id))));
    if (n === 'problemi') disegnaMappa(problemi.map((p) => punto(p, ancoraDi('pb', p.evento_id))));
  }

  async function cercaTutti() {
    const f = $('#form-cerca-mod');
    const q = new URLSearchParams({ q: f.q.value, stato: f.stato.value, dal: ff.dal.value, al: ff.al.value });
    try {
      const d = await api('/api/moderazione/eventi?' + q);
      datiTutti = d.eventi;
      disegnaTutti();
    } catch (e) { $('#elenco-tutti').innerHTML = `<p class="vuoto">${esc(e.message)}</p>`; }
  }
  function disegnaTutti() {
    const lista = filtrati(datiTutti);
    $('#elenco-tutti').innerHTML = lista.length ? lista.map((e) => schedaEvento(e, bottoniEvento(e))).join('') : nienteConFiltri('Nessun evento trovato.');
    if (schedaAttiva() === 'tutti') disegnaMappa(lista.map((e) => punto(e, ancoraDi('ev', e.id))));
  }
  $('#form-cerca-mod').addEventListener('submit', (ev) => { ev.preventDefault(); cercaTutti(); });
  // Nella scheda "Tutti gli eventi" le date si chiedono al server (l'elenco può essere lungo)
  for (const n of ['dal', 'al']) ff[n].addEventListener('change', () => { if (schedaAttiva() === 'tutti') cercaTutti(); });

  // ---------- Doppioni ----------
  async function contaDoppioni() {
    try {
      datiDoppioni = await api('/api/moderazione/doppioni');
      $('#n-doppioni').textContent = datiDoppioni.totale;
      $('#n-doppioni').classList.toggle('zero', !datiDoppioni.totale);
      if (schedaAttiva() === 'doppioni') disegnaDoppioni();
    } catch (_) { /* il resto del pannello funziona comunque */ }
  }
  async function caricaDoppioni() {
    $('#scheda-doppioni').innerHTML = '<p class="tenue">Cerco eventi doppi…</p>';
    await contaDoppioni();
    if (!datiDoppioni) $('#scheda-doppioni').innerHTML = '<p class="vuoto">Impossibile cercare i doppioni in questo momento.</p>';
  }
  function disegnaDoppioni() {
    if (!datiDoppioni) return;
    const coppie = datiDoppioni.coppie.filter((c) => passa(c.a) || passa(c.b));
    const piccola = (e, altro, chiave) => schedaEvento(e,
      `<button type="button" class="bottone bottone--ok" data-unisci="${esc(e.id)}" data-togli="${esc(altro.id)}" data-coppia="${esc(chiave)}">✓ Tieni questo, togli l’altro</button>` +
      `<button type="button" class="bottone bottone--chiaro" data-az="modifica" data-id="${esc(e.id)}">✏️ Modifica</button>`);
    $('#scheda-doppioni').innerHTML = coppie.length
      ? '<p class="tenue">Eventi dello stesso giorno, nello stesso posto e molto simili. Scegli quale <strong>tenere</strong>: prende dall’altro fonte, luogo, orari e sigle che gli mancano, e l’altro viene tolto dalla mappa (si può ripristinare dalla cronologia). Se sono davvero due eventi diversi, premi <strong>Non sono doppioni</strong> e la coppia non comparirà più.</p>' +
        coppie.map((c, i) => {
          const chiave = 'cp-' + i;
          return `<section class="coppia" id="${chiave}">
            <div class="coppia__testa"><strong>${c.punteggio >= 0.8 ? 'Quasi certamente lo stesso evento' : 'Probabile doppione'}</strong> · ${esc(c.motivi.join(', '))}
              <button type="button" class="bottone bottone--chiaro" data-diversi="${esc(c.a.id)}" data-altro="${esc(c.b.id)}">Non sono doppioni</button></div>
            <div class="coppia__eventi">${piccola(c.a, c.b, chiave)}${piccola(c.b, c.a, chiave)}</div>
          </section>`;
        }).join('') +
        (datiDoppioni.totale > datiDoppioni.coppie.length ? `<p class="tenue">Mostrate le prime ${datiDoppioni.coppie.length} coppie su ${datiDoppioni.totale}.</p>` : '')
      : nienteConFiltri('Nessun doppione trovato. 🎉');
    const punti = [], linee = [];
    coppie.forEach((c, i) => { const a = punto(c.a, 'cp-' + i), b = punto(c.b, 'cp-' + i); punti.push(a, b); linee.push([a, b]); });
    disegnaMappa(punti, linee);
  }
  document.addEventListener('click', async (ev) => {
    const u = ev.target.closest('[data-unisci]');
    const d = ev.target.closest('[data-diversi]');
    if (!u && !d) return;
    const b = u || d;
    if (u && !await chiedi('Tenere questo evento e togliere l’altro dalla mappa? Le informazioni mancanti vengono copiate in quello che resta.')) return;
    b.disabled = true;
    try {
      await api('/api/moderazione/doppioni', { corpo: u ? { azione: 'unisci', tieni: u.dataset.unisci, togli: u.dataset.togli } : { azione: 'diversi', a: d.dataset.diversi, b: d.dataset.altro } });
      avvisoOk(u ? 'Doppione tolto: resta un solo evento.' : 'Segnati come eventi diversi.');
      caricaDoppioni();
      caricaCoda();
    } catch (e) { avvisa(e.message); b.disabled = false; }
  });

  // ---------- Azioni ----------
  const CONFERME = {
    rifiuta: 'Rifiutare questo evento? Sparirà dalla mappa (e dal canale Telegram, se pubblicato da meno di 48 ore).',
    nascondi: 'Nascondere questo evento dalla mappa?',
    annulla: 'Segnare l’evento come annullato? Resterà visibile barrato e, se era sul canale, verrà pubblicato un avviso.',
    conferma_sospetto: 'Confermi il sospetto? L’evento viene rifiutato e sparisce dalla mappa (puoi sempre ripristinarlo dalla cronologia).',
  };
  function aggiorna() {
    const attiva = schedaAttiva();
    if (attiva === 'tutti') cercaTutti();
    else if (attiva === 'doppioni') { caricaDoppioni(); caricaCoda(); }
    else caricaCoda();
  }
  document.addEventListener('click', async (ev) => {
    const b = ev.target.closest('[data-az]');
    if (b) {
      const az = b.dataset.az, id = b.dataset.id;
      if (az === 'modifica') return apriModifica(id);
      if (az === 'cronologia') return apriCronologia(id);
      if (CONFERME[az] && !await chiedi(CONFERME[az])) return;
      b.disabled = true;
      try {
        try {
          await api(`/api/moderazione/eventi/${encodeURIComponent(id)}`, { corpo: { azione: az } });
        } catch (x) {
          // Sigla esclusa: l'amministratore può fare un'eccezione per questo solo evento
          if (!(az === 'approva' && x.dati && x.dati.puo_eccezione)) throw x;
          if (!await chiedi(x.message + '\n\nSei l\'amministratore: vuoi approvare comunque SOLO questo evento come eccezione? Resterà scritto nella cronologia e nelle note.')) { b.disabled = false; return; }
          await api(`/api/moderazione/eventi/${encodeURIComponent(id)}`, { corpo: { azione: az, eccezione_sigla: true } });
        }
        avvisoOk(az === 'approva' ? 'Approvato. Se il bot è attivo, è stato pubblicato sul canale.'
          : az === 'approva_gruppo' ? 'Approvati tutti gli appuntamenti: sul canale esce un solo messaggio con l’elenco.'
          : az === 'conferma_sospetto' ? 'Sospetto confermato: evento rifiutato.'
          : az === 'declina_sospetto' ? 'Sospetto declinato: l’evento torna nella coda normale.' : 'Fatto.');
        aggiorna();
      } catch (e) { avvisa(e.message); b.disabled = false; }
      return;
    }
    const m = ev.target.closest('[data-mod]');
    if (m) {
      m.disabled = true;
      try {
        await api(`/api/moderazione/modifiche/${m.dataset.id}`, { corpo: { azione: m.dataset.mod } });
        avvisoOk(m.dataset.mod === 'accetta' ? 'Correzione applicata.' : 'Correzione rifiutata.');
        caricaCoda();
      } catch (e) { avvisa(e.message); m.disabled = false; }
    }
  });

  // ---------- Proposte dell'agente ----------
  $('#importa-agente').addEventListener('click', async (ev) => {
    const b = ev.currentTarget;
    b.disabled = true;
    try {
      const r = await api('/api/moderazione/importa-agente', { corpo: {} });
      const dz = r.decisioni || {};
      $('#esito-agente').textContent = `Proposte: nuove ${r.nuove} · già importate ${r.gia_importate} · doppioni ${r.doppioni}` +
        (r.scartate.length ? ` · scartate ${r.scartate.length} (${r.scartate.slice(0, 3).join('; ')})` : '') +
        ` — Decisioni AI: approvati ${dz.approvati || 0} · sospetti ${dz.sospetti || 0}` +
        (dz.saltate && dz.saltate.length ? ` · saltate ${dz.saltate.length} (${dz.saltate.slice(0, 3).join('; ')})` : '');
      caricaCoda();
    } catch (e) { avvisa(e.message); }
    b.disabled = false;
  });

  // ---------- Modifica diretta ----------
  const fm = $('#form-modifica');
  fm.tipo.innerHTML = Object.entries(TIPI).map(([k, t]) => `<option value="${k}">${t[0]} ${esc(t[1])}</option>`).join('');
  let idModifica = null, eventoAperto = null;
  async function apriModifica(id) {
    let e = ultimi[id];
    if (!e) { try { e = (await api(`/api/moderazione/eventi/${encodeURIComponent(id)}/cronologia`)).evento; } catch (x) { return avvisa(x.message); } }
    idModifica = id;
    if (!fm.regione.options.length) {
      const reg = REGIONI.length ? REGIONI : ['Abruzzo', 'Basilicata', 'Calabria', 'Campania', 'Emilia-Romagna', 'Friuli-Venezia Giulia', 'Lazio', 'Liguria', 'Lombardia', 'Marche', 'Molise', 'Piemonte', 'Puglia', 'Sardegna', 'Sicilia', 'Toscana', 'Trentino-Alto Adige', 'Umbria', "Valle d'Aosta", 'Veneto'];
      fm.regione.innerHTML = reg.map((r) => `<option>${esc(r)}</option>`).join('');
    }
    for (const k of ['tipo', 'titolo', 'data', 'ora_inizio', 'ora_fine', 'comune', 'provincia', 'regione', 'luogo', 'lat', 'lng', 'fonte']) fm[k].value = e[k] ?? '';
    fm.organizzatori.value = (e.organizzatori || []).join(', ');
    fm.posizione_approssimativa.checked = !!e.posizione_approssimativa;
    // Eventi collegati (altre città o altre date): le modifiche ai campi comuni possono valere per tutti
    eventoAperto = e;
    const nColl = Number(e.gruppo_n || 0) - 1;
    $('#box-tutti-collegati').hidden = !(e.gruppo && nColl > 0);
    fm.tutti_collegati.checked = true;
    $('#testo-tutti-collegati').textContent = nColl > 0
      ? `Applica tipo, titolo, orari, organizzatori e fonte anche ${nColl === 1 ? "all'altro evento collegato" : `agli altri ${nColl} eventi collegati`}` : '';
    $('#errore-modifica').textContent = '';
    dateExtra = [];
    fm.querySelector('#nuova-data-mod').value = '';
    fm.querySelector('#nuova-data-mod').min = oggiIso();
    disegnaDateMod();
    const gia = String(e.gruppo_date || '').split(',').filter(Boolean).sort();
    const pg = $('#date-gruppo-mod');
    pg.hidden = gia.length < 2;
    pg.textContent = gia.length > 1 ? 'Già in calendario: ' + gia.map(dataIt).join(', ') : '';
    $('#dlg-modifica').showModal();
  }
  // Altre date: elenco da aggiungere al salvataggio
  let dateExtra = [];
  function disegnaDateMod() {
    $('#lista-date-mod').innerHTML = dateExtra.map((d) =>
      `<li>${esc(dataIt(d))}<button type="button" data-togli-data="${d}" aria-label="Togli ${esc(dataIt(d))}">✕</button></li>`).join('');
  }
  $('#aggiungi-data-mod').addEventListener('click', () => {
    const c = $('#nuova-data-mod'), d = c.value;
    if (!d) return c.focus();
    if (d === fm.data.value || dateExtra.includes(d)) { c.value = ''; return; }
    if (dateExtra.length >= 14) return avvisa('Puoi aggiungere al massimo 14 date per volta.');
    dateExtra.push(d); dateExtra.sort(); c.value = ''; disegnaDateMod();
  });
  $('#lista-date-mod').addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-togli-data]');
    if (!b) return;
    dateExtra = dateExtra.filter((d) => d !== b.dataset.togliData); disegnaDateMod();
  });
  fm.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const v = Object.fromEntries(new FormData(fm).entries());
    const campi = {
      ...v, lat: Number(String(v.lat).replace(',', '.')), lng: Number(String(v.lng).replace(',', '.')),
      ora_inizio: v.ora_inizio || null, ora_fine: v.ora_fine || null, posizione_approssimativa: fm.posizione_approssimativa.checked,
      organizzatori: v.organizzatori.split(',').map((x) => x.trim()).filter(Boolean),
    };
    // Una data scritta nel campo ma non ancora aggiunta con "+ Aggiungi" la si aggiunge comunque
    const inSospeso = $('#nuova-data-mod').value;
    if (inSospeso && inSospeso !== v.data && !dateExtra.includes(inSospeso)) dateExtra.push(inSospeso);
    delete campi[''];
    const messaggi = [];
    try {
      try {
        await api(`/api/moderazione/eventi/${encodeURIComponent(idModifica)}`, { corpo: { azione: 'modifica', campi } });
        messaggi.push('Modifica salvata.');
      } catch (e) {
        // Se si aggiungono solo date, "nessuna modifica" non è un errore
        if (!(dateExtra.length && /Nessuna modifica/.test(e.message))) throw e;
      }
      if (fm.tutti_collegati.checked && !$('#box-tutti-collegati').hidden && eventoAperto) {
        // Solo i campi comuni che sono stati davvero cambiati
        const o = eventoAperto, comuni = {};
        const uguale = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
        if (!uguale(campi.tipo, o.tipo)) comuni.tipo = campi.tipo;
        if (!uguale(campi.titolo, o.titolo)) comuni.titolo = campi.titolo;
        if (!uguale(campi.ora_inizio, o.ora_inizio || null)) comuni.ora_inizio = campi.ora_inizio;
        if (!uguale(campi.ora_fine, o.ora_fine || null)) comuni.ora_fine = campi.ora_fine;
        if (!uguale(campi.organizzatori, o.organizzatori || [])) comuni.organizzatori = campi.organizzatori;
        if (!uguale(campi.fonte || null, o.fonte || null)) comuni.fonte = campi.fonte;
        if (Object.keys(comuni).length) {
          const r = await api(`/api/moderazione/eventi/${encodeURIComponent(idModifica)}`, { corpo: { azione: 'modifica_gruppo', campi: comuni } });
          messaggi.push(`Aggiornati anche ${r.aggiornati} eventi collegati.`);
          if (r.saltati && r.saltati.length) messaggi.push('Non aggiornati: ' + r.saltati.join('; '));
        }
      }
      if (dateExtra.length) {
        const r = await api(`/api/moderazione/eventi/${encodeURIComponent(idModifica)}`, { corpo: { azione: 'aggiungi_date', date: dateExtra } });
        messaggi.push(`${r.creati.length} ${r.creati.length === 1 ? 'data aggiunta' : 'date aggiunte'}.`);
        if (r.saltate && r.saltate.length) messaggi.push('Saltate: ' + r.saltate.join('; '));
      }
      $('#dlg-modifica').close();
      avvisoOk(messaggi.join(' '));
      aggiorna();
    } catch (e) { $('#errore-modifica').textContent = e.message; }
  });

  // ---------- Cronologia ----------
  async function apriCronologia(id) {
    let d;
    try { d = await api(`/api/moderazione/eventi/${encodeURIComponent(id)}/cronologia`); } catch (e) { return avvisa(e.message); }
    $('#titolo-cronologia').textContent = 'Cronologia: ' + d.evento.titolo;
    $('#voci-cronologia').innerHTML = d.voci.map((v) => `<div class="voce-cron">
        <p><strong>v${v.versione}</strong> · ${esc(v.azione)} · ${esc(v.attore)} · ${esc(v.creato_il ? v.creato_il.replace('T', ' ').slice(0, 16) : '')}</p>
        ${v.dati ? `<p class="tenue">${esc(v.dati.titolo)} · ${esc(dataIt(v.dati.data))}${v.dati.ora_inizio ? ' ' + esc(v.dati.ora_inizio) : ''} · ${esc(v.dati.luogo || '')} ${esc(v.dati.comune)} · ${esc(STATI[v.dati.stato] || v.dati.stato)}</p>
          ${v.versione !== d.evento.versione ? `<button type="button" class="bottone bottone--chiaro" data-ripristina="${v.versione}" data-id="${esc(id)}">↩ Ripristina questa versione</button>` : '<p class="tenue">← versione attuale</p>'}` : ''}
      </div>`).join('') || '<p class="vuoto">Nessuna voce.</p>';
    $('#dlg-cronologia').showModal();
  }
  document.addEventListener('click', async (ev) => {
    const r = ev.target.closest('[data-ripristina]');
    if (!r) return;
    if (!await chiedi(`Ripristinare la versione ${r.dataset.ripristina}? Verrà creata una nuova versione con quei dati.`)) return;
    try {
      await api(`/api/moderazione/eventi/${encodeURIComponent(r.dataset.id)}`, { corpo: { azione: 'ripristina', versione: Number(r.dataset.ripristina) } });
      $('#dlg-cronologia').close();
      avvisoOk('Versione ripristinata.');
      aggiorna();
    } catch (e) { avvisa(e.message); }
  });

  // ---------- Moderatori (admin) ----------
  function sceltaRegioni(nome, scelte = []) {
    return `<div class="regioni-scelta">${REGIONI.map((r) => `<label><input type="checkbox" name="${nome}" value="${esc(r)}" ${scelte.includes(r) ? 'checked' : ''}> ${esc(r)}</label>`).join('')}</div>`;
  }
  async function caricaStaff(codiceMostrato) {
    let d;
    try { d = await api('/api/admin/staff'); } catch (e) { return ($('#scheda-staff').innerHTML = `<p class="vuoto">${esc(e.message)}</p>`); }
    REGIONI = d.regioni;
    $('#scheda-staff').innerHTML = `
      ${codiceMostrato ? `<div class="codice-nuovo"><p><strong>Codice per ${esc(codiceMostrato.nome)}:</strong></p><p><code>${esc(codiceMostrato.codice)}</code></p>
        <p>Copialo adesso e consegnalo di persona o con un messaggio privato: <strong>non verrà più mostrato</strong>. Se si perde, generane uno nuovo.</p></div>` : ''}
      <form id="form-staff" class="form-griglia">
        <h2>Aggiungi un moderatore</h2>
        <label>Nome o soprannome (non serve il nome vero)<input name="nome" maxlength="40" required></label>
        <label>Ruolo<select name="ruolo"><option value="moderatore">Moderatore</option><option value="admin">Amministratore</option></select></label>
        <fieldset><legend>Regioni che può moderare (nessuna spunta = tutta Italia)</legend>${sceltaRegioni('regioni')}</fieldset>
        <button class="bottone bottone--pieno" type="submit">Crea e mostra il codice</button>
      </form>
      <h2>Moderatori</h2>
      ${d.staff.length ? d.staff.map((s) => `<article class="scheda-ev" style="--c:${s.attivo ? '#1f7a4a' : '#999'}">
        <h3>${esc(s.nome)} ${s.attivo ? '' : '<span class="tenue">(revocato)</span>'}</h3>
        <p>${s.ruolo === 'admin' ? 'Amministratore' : 'Moderatore'} · ${s.regioni.length ? esc(s.regioni.join(', ')) : 'tutta Italia'}</p>
        <p class="tenue">Creato ${esc(dataIt(s.creato_il))} · ultimo accesso ${s.ultimo_accesso ? esc(dataIt(s.ultimo_accesso)) : 'mai'}</p>
        <div class="azioni">
          ${s.attivo ? `<button type="button" class="bottone bottone--no" data-staff="revoca" data-id="${s.id}">Revoca accesso</button>`
            : `<button type="button" class="bottone bottone--chiaro" data-staff="riattiva" data-id="${s.id}">Riattiva</button>`}
          <button type="button" class="bottone bottone--chiaro" data-staff="nuovo_codice" data-id="${s.id}" data-nome="${esc(s.nome)}">Nuovo codice</button>
        </div></article>`).join('') : '<p class="vuoto">Nessun moderatore ancora. Aggiungine uno qui sopra.</p>'}`;
    $('#form-staff').addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const f = ev.target;
      const regioni = [...f.querySelectorAll('input[name="regioni"]:checked')].map((x) => x.value);
      try {
        const r = await api('/api/admin/staff', { corpo: { azione: 'crea', nome: f.nome.value, ruolo: f.ruolo.value, regioni } });
        caricaStaff({ nome: f.nome.value, codice: r.codice });
      } catch (e) { avvisa(e.message); }
    });
  }
  document.addEventListener('click', async (ev) => {
    const b = ev.target.closest('[data-staff]');
    if (!b) return;
    const az = b.dataset.staff;
    if (az === 'revoca' && !await chiedi('Revocare l’accesso? Avrà effetto subito.')) return;
    if (az === 'nuovo_codice' && !await chiedi('Generare un nuovo codice? Quello vecchio smetterà di funzionare.')) return;
    try {
      const r = await api('/api/admin/staff', { corpo: { azione: az, id: Number(b.dataset.id) } });
      caricaStaff(r.codice ? { nome: b.dataset.nome, codice: r.codice } : null);
    } catch (e) { avvisa(e.message); }
  });

  // ---------- Impostazioni (admin) ----------
  async function caricaImpostazioni() {
    let d;
    try { d = await api('/api/admin/impostazioni'); } catch (e) { return ($('#scheda-impostazioni').innerHTML = `<p class="vuoto">${esc(e.message)}</p>`); }
    const i = d.impostazioni;
    const sn = (k, testo) => `<label>${testo}<select name="${k}"><option value="si" ${i[k] === 'si' ? 'selected' : ''}>Sì</option><option value="no" ${i[k] === 'no' ? 'selected' : ''}>No</option></select></label>`;
    const num = (k, testo) => `<label>${testo}<input name="${k}" type="number" min="1" value="${esc(i[k] || '')}"></label>`;
    $('#scheda-impostazioni').innerHTML = `
      <form id="form-imp" class="form-griglia">
        <h2>Regole della mappa</h2>
        ${sn('pubblicazione_immediata', 'Le nuove segnalazioni compaiono subito come "Da verificare"?')}
        ${num('conferme_per_verifica', 'Conferme necessarie (con fonte) per la verifica automatica')}
        ${num('segnalazioni_per_nascondere', 'Segnalazioni di problemi che nascondono un evento in automatico')}
        ${num('max_invii_ora', 'Massimo invii all’ora per dispositivo')}
        ${num('giorni_conservazione', 'Giorni dopo l’evento prima di cancellare i dati collegati e gli eventi non verificati')}
        ${num('giorni_archivio', 'Giorni in cui gli eventi verificati restano nell’archivio')}
        ${sn('telegram_auto', 'Pubblicare in automatico sul canale Telegram gli eventi verificati?')}
        <label>Orari di uscita su Telegram (ore separate da virgola, es. 8,16,21). Gli eventi verificati escono tutti insieme a questi orari, in ordine di data; quelli di oggi (e di domani, dopo l'ultima uscita) escono subito.<input name="telegram_ore" type="text" inputmode="numeric" value="${esc(i.telegram_ore ?? '8,16,21')}"></label>
        <button class="bottone bottone--pieno" type="submit">Salva impostazioni</button>
      </form>
      <div class="form-griglia">
        <h2>Canale Telegram</h2>
        <p>${d.telegram_configurato ? '✅ Bot configurato.' : '⚠️ Bot non configurato: mancano i segreti <code>TELEGRAM_BOT_TOKEN</code> e <code>TELEGRAM_CHAT_ID</code> nel Worker.'}</p>
        <button class="bottone" type="button" id="prova-tg" ${d.telegram_configurato ? '' : 'disabled'}>Invia un messaggio di prova</button>
        <p>Dopo aver collegato il gruppo dei commenti, ripubblica gli eventi futuri: i nuovi post avranno il pulsante «Commenta». Il bot prova a cancellare i vecchi post; quelli più vecchi di 48 ore cancellali tu dal canale.</p>
        <button class="bottone" type="button" id="ripubblica-tg" ${d.telegram_configurato ? '' : 'disabled'}>Ripubblica su Telegram</button>
        <p>Attiva il bot: regole come primo commento sotto ogni post e assistente personale (cerca per città, data, tipo). Sistema anche i post già pubblicati togliendo i vecchi pulsanti che nascondevano i commenti. Prima rendi il bot amministratore anche del gruppo di discussione, poi premi il pulsante. Va ripremuto dopo ogni aggiornamento del bot.</p>
        <button class="bottone" type="button" id="webhook-tg" ${d.telegram_configurato ? '' : 'disabled'}>Attiva bot (regole e assistente)</button>
        <p>Pubblica nel canale il post «🔎 Trova una mobilitazione» con i pulsanti che aprono l'assistente, e lo fissa in alto.</p>
        <button class="bottone" type="button" id="trova-tg" ${d.telegram_configurato ? '' : 'disabled'}>Pubblica post «Trova»</button>
      </div>
      <div class="form-griglia">
        <h2>Pulizia</h2>
        <p>Ogni ora il sito cancella da solo i dati collegati agli eventi finiti da più di ${esc(i.giorni_conservazione)} giorni e gli eventi mai verificati; quelli verificati restano nell’archivio per ${esc(i.giorni_archivio || '365')} giorni. Puoi farlo anche adesso.</p>
        <button class="bottone bottone--chiaro" type="button" id="pulisci">Pulisci ora</button>
      </div>`;
    $('#form-imp').addEventListener('submit', async (ev) => {
      ev.preventDefault();
      try { await api('/api/admin/impostazioni', { corpo: Object.fromEntries(new FormData(ev.target).entries()) }); avvisoOk('Impostazioni salvate.'); }
      catch (e) { avvisa(e.message); }
    });
    $('#prova-tg').addEventListener('click', async () => {
      try { await api('/api/admin/telegram-prova', { corpo: {} }); avvisoOk('Messaggio inviato: controlla il canale.'); } catch (e) { avvisa(e.message); }
    });
    $('#ripubblica-tg').addEventListener('click', async (ev) => {
      if (!await chiedi('Ripubblicare sul canale tutti gli eventi futuri verificati? I vecchi post verranno sostituiti da quelli nuovi.')) return;
      const b = ev.currentTarget; b.disabled = true; b.textContent = 'Ripubblicazione in corso…';
      try {
        const r = await api('/api/admin/telegram-ripubblica', { corpo: {} });
        let msg = `Messaggi ripubblicati: ${r.ripubblicati}.`;
        if (r.vecchi_non_cancellati) msg += ` ${r.vecchi_non_cancellati} vecchi post non si sono potuti cancellare: toglili tu dal canale.`;
        if (r.restanti) msg += ` Ne restano ${r.restanti}: premi di nuovo il pulsante.`;
        avvisoOk(msg);
      } catch (e) { avvisa(e.message); }
      b.disabled = false; b.textContent = 'Ripubblica su Telegram';
    });
    $('#webhook-tg').addEventListener('click', async () => {
      try {
        const r = await api('/api/admin/telegram-webhook', { corpo: {} });
        avvisoOk('Bot attivato: regole nei commenti e assistente.' + (r.username ? ` Il bot si apre da t.me/${r.username}` : ''));
      } catch (e) { avvisa(e.message); }
    });
    $('#trova-tg').addEventListener('click', async () => {
      if (!await chiedi('Pubblicare nel canale il post «Trova una mobilitazione»?')) return;
      try {
        const r = await api('/api/admin/telegram-trova', { corpo: {} });
        avvisoOk(r.fissato ? 'Post pubblicato e fissato in alto nel canale.' : 'Post pubblicato. Non sono riuscito a fissarlo: fissalo tu dal canale (tieni premuto il post → Fissa).');
      } catch (e) { avvisa(e.message); }
    });
    $('#pulisci').addEventListener('click', async () => {
      if (!await chiedi('Cancellare definitivamente gli eventi passati da più dei giorni indicati?')) return;
      try { const r = await api('/api/admin/pulizia', { corpo: {} }); avvisoOk(`Eventi cancellati: ${r.cancellati}.`); } catch (e) { avvisa(e.message); }
    });
  }

  document.querySelectorAll('dialog').forEach((d) => d.addEventListener('click', (ev) => {
    if (ev.target.closest('[data-chiudi]') || ev.target === d) d.close();
  }));

  entra();
})();
