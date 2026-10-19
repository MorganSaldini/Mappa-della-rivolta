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
    if (!r.ok || !d.ok) throw new Error(d.errore || 'Operazione non riuscita.');
    return d;
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
  function apriScheda(nome) {
    document.querySelectorAll('[data-scheda]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.scheda === nome)));
    document.querySelectorAll('.scheda').forEach((s) => (s.hidden = s.id !== 'scheda-' + nome));
    $('#barra-agente').hidden = nome !== 'nuovi';
    if (nome === 'tutti') cercaTutti();
    if (nome === 'staff') caricaStaff();
    if (nome === 'impostazioni') caricaImpostazioni();
    if (['nuovi', 'modifiche', 'problemi', 'sospetti'].includes(nome)) caricaCoda();
  }

  // ---------- Schede evento ----------
  function schedaEvento(e, azioni, extra = '') {
    const t = TIPI[e.tipo] || TIPI.altro;
    ultimi[e.id] = e;
    const fonte = e.fonte && urlSicuro(e.fonte);
    return `<article class="scheda-ev" style="--c:${t[2]}">
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
  function bottoniEvento(e) {
    const b = (az, testo, cls = 'bottone--chiaro') => `<button type="button" class="bottone ${cls}" data-az="${az}" data-id="${esc(e.id)}">${testo}</button>`;
    const out = [];
    if (e.gruppo_n > 1) out.push(b('approva_gruppo', `✓ Approva tutti gli appuntamenti (${e.gruppo_n})`, 'bottone--ok'));
    if (e.stato !== 'verificato') out.push(b('approva', e.gruppo_n > 1 ? '✓ Approva solo questa' : '✓ Approva', 'bottone--ok'));
    if (e.stato !== 'annullato' && e.stato !== 'rifiutato') out.push(b('annulla', 'Segna annullato'));
    if (e.stato !== 'nascosto' && e.stato !== 'rifiutato') out.push(b('nascondi', 'Nascondi'));
    if (e.stato !== 'rifiutato') out.push(b('rifiuta', '✕ Rifiuta', 'bottone--no'));
    if (e.stato === 'rifiutato' || e.stato === 'nascosto') out.push(b('rimetti', 'Rimetti da verificare'));
    out.push(b('modifica', '✏️ Modifica'));
    out.push(b('cronologia', '🕘 Cronologia'));
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
    ].join('');
  }

  // ---------- Coda ----------
  async function caricaCoda() {
    let d;
    try { d = await api('/api/moderazione/coda'); } catch (e) { return; }
    const conta = (id, n) => { $(id).textContent = n; $(id).classList.toggle('zero', !n); };
    const sospetti = d.sospetti || [];
    conta('#n-nuovi', d.nuovi.length); conta('#n-modifiche', d.modifiche.length); conta('#n-problemi', d.problemi.length); conta('#n-sospetti', sospetti.length);

    $('#scheda-nuovi').innerHTML = d.nuovi.length
      ? '<p class="tenue">Controlla la fonte prima di approvare. Gli eventi nascosti sono stati segnalati più volte dalla community.</p>' +
        d.nuovi.map((e) => schedaEvento(e, bottoniEvento(e))).join('')
      : '<p class="vuoto">Nessun evento da controllare. 🎉</p>';

    $('#scheda-modifiche').innerHTML = d.modifiche.length ? d.modifiche.map((m) => {
      const attuale = { ...m, organizzatori: (() => { try { return JSON.parse(m.org_attuali || '[]'); } catch { return []; } })(), fonte: m.fonte_attuale };
      const righe = Object.entries(m.campi).map(([k, v]) =>
        `<tr><th>${esc(NOMI_CAMPI[k] || k)}</th><td class="prima">${valore(k, attuale[k])}</td><td class="dopo">${valore(k, v)}</td></tr>`).join('');
      return `<article class="scheda-ev">
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
    }).join('') : '<p class="vuoto">Nessuna correzione in attesa.</p>';

    $('#scheda-sospetti').innerHTML = sospetti.length
      ? '<p class="tenue">L’amministratore AI ha trovato qualcosa che non torna. Leggi il motivo e apri le fonti, poi decidi tu: <strong>Confermo</strong> rifiuta l’evento, <strong>Non è sospetto</strong> lo rimette nella coda normale.</p>' +
        sospetti.map((e) => schedaEvento(e, bottoniSospetto(e), `<div class="motivo motivo--ai"><strong>🤖 Perché è sospetto:</strong> ${esc(String(e.sospetto).replace(/^Amministratore AI: /, ''))}</div>`)).join('')
      : '<p class="vuoto">Nessun sospetto da controllare. 🎉</p>';

    $('#scheda-problemi').innerHTML = d.problemi.length ? d.problemi.map((p) => `<article class="scheda-ev" style="--c:#9f241d">
        <h3>${esc(p.titolo)}</h3>
        <p>${esc(dataIt(p.data))} · ${esc(p.comune)} · stato: ${esc(STATI[p.stato] || p.stato)} · <strong>${p.n} segnalazioni</strong></p>
        <div class="motivo">${esc(String(p.dettagli || '').split(' | ').map((x) => { const [k, ...r] = x.split(': '); return (MOTIVI[k] || k) + (r.length ? ': ' + r.join(': ') : ''); }).join(' · '))}</div>
        <div class="azioni">
          <button type="button" class="bottone bottone--chiaro" data-az="chiudi_segnalazioni" data-id="${esc(p.evento_id)}">Segnalazioni infondate: chiudi</button>
          <button type="button" class="bottone bottone--chiaro" data-az="annulla" data-id="${esc(p.evento_id)}">Segna annullato</button>
          <button type="button" class="bottone bottone--chiaro" data-az="nascondi" data-id="${esc(p.evento_id)}">Nascondi</button>
          <button type="button" class="bottone bottone--no" data-az="rifiuta" data-id="${esc(p.evento_id)}">✕ Rifiuta</button>
          <button type="button" class="bottone bottone--chiaro" data-az="cronologia" data-id="${esc(p.evento_id)}">🕘 Cronologia</button>
        </div></article>`).join('') : '<p class="vuoto">Nessuna segnalazione aperta.</p>';
  }

  async function cercaTutti() {
    const f = $('#form-cerca-mod');
    const q = new URLSearchParams({ q: f.q.value, stato: f.stato.value });
    try {
      const d = await api('/api/moderazione/eventi?' + q);
      $('#elenco-tutti').innerHTML = d.eventi.length ? d.eventi.map((e) => schedaEvento(e, bottoniEvento(e))).join('') : '<p class="vuoto">Nessun evento trovato.</p>';
    } catch (e) { $('#elenco-tutti').innerHTML = `<p class="vuoto">${esc(e.message)}</p>`; }
  }
  $('#form-cerca-mod').addEventListener('submit', (ev) => { ev.preventDefault(); cercaTutti(); });

  // ---------- Azioni ----------
  const CONFERME = {
    rifiuta: 'Rifiutare questo evento? Sparirà dalla mappa (e dal canale Telegram, se pubblicato da meno di 48 ore).',
    nascondi: 'Nascondere questo evento dalla mappa?',
    annulla: 'Segnare l’evento come annullato? Resterà visibile barrato e, se era sul canale, verrà pubblicato un avviso.',
    conferma_sospetto: 'Confermi il sospetto? L’evento viene rifiutato e sparisce dalla mappa (puoi sempre ripristinarlo dalla cronologia).',
  };
  function aggiorna() {
    const attiva = document.querySelector('[data-scheda][aria-selected="true"]').dataset.scheda;
    if (attiva === 'tutti') cercaTutti(); else caricaCoda();
  }
  document.addEventListener('click', async (ev) => {
    const b = ev.target.closest('[data-az]');
    if (b) {
      const az = b.dataset.az, id = b.dataset.id;
      if (az === 'modifica') return apriModifica(id);
      if (az === 'cronologia') return apriCronologia(id);
      if (CONFERME[az] && !confirm(CONFERME[az])) return;
      b.disabled = true;
      try {
        await api(`/api/moderazione/eventi/${encodeURIComponent(id)}`, { corpo: { azione: az } });
        avvisoOk(az === 'approva' ? 'Approvato. Se il bot è attivo, è stato pubblicato sul canale.'
          : az === 'approva_gruppo' ? 'Approvati tutti gli appuntamenti: sul canale esce un solo messaggio con l’elenco.'
          : az === 'conferma_sospetto' ? 'Sospetto confermato: evento rifiutato.'
          : az === 'declina_sospetto' ? 'Sospetto declinato: l’evento torna nella coda normale.' : 'Fatto.');
        aggiorna();
      } catch (e) { alert(e.message); b.disabled = false; }
      return;
    }
    const m = ev.target.closest('[data-mod]');
    if (m) {
      m.disabled = true;
      try {
        await api(`/api/moderazione/modifiche/${m.dataset.id}`, { corpo: { azione: m.dataset.mod } });
        avvisoOk(m.dataset.mod === 'accetta' ? 'Correzione applicata.' : 'Correzione rifiutata.');
        caricaCoda();
      } catch (e) { alert(e.message); m.disabled = false; }
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
    } catch (e) { alert(e.message); }
    b.disabled = false;
  });

  // ---------- Modifica diretta ----------
  const fm = $('#form-modifica');
  fm.tipo.innerHTML = Object.entries(TIPI).map(([k, t]) => `<option value="${k}">${t[0]} ${esc(t[1])}</option>`).join('');
  let idModifica = null;
  async function apriModifica(id) {
    let e = ultimi[id];
    if (!e) { try { e = (await api(`/api/moderazione/eventi/${encodeURIComponent(id)}/cronologia`)).evento; } catch (x) { return alert(x.message); } }
    idModifica = id;
    if (!fm.regione.options.length) {
      const reg = REGIONI.length ? REGIONI : ['Abruzzo', 'Basilicata', 'Calabria', 'Campania', 'Emilia-Romagna', 'Friuli-Venezia Giulia', 'Lazio', 'Liguria', 'Lombardia', 'Marche', 'Molise', 'Piemonte', 'Puglia', 'Sardegna', 'Sicilia', 'Toscana', 'Trentino-Alto Adige', 'Umbria', "Valle d'Aosta", 'Veneto'];
      fm.regione.innerHTML = reg.map((r) => `<option>${esc(r)}</option>`).join('');
    }
    for (const k of ['tipo', 'titolo', 'data', 'ora_inizio', 'ora_fine', 'comune', 'provincia', 'regione', 'luogo', 'lat', 'lng', 'fonte']) fm[k].value = e[k] ?? '';
    fm.organizzatori.value = (e.organizzatori || []).join(', ');
    fm.posizione_approssimativa.checked = !!e.posizione_approssimativa;
    $('#errore-modifica').textContent = '';
    $('#dlg-modifica').showModal();
  }
  fm.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const v = Object.fromEntries(new FormData(fm).entries());
    const campi = {
      ...v, lat: Number(String(v.lat).replace(',', '.')), lng: Number(String(v.lng).replace(',', '.')),
      ora_inizio: v.ora_inizio || null, ora_fine: v.ora_fine || null, posizione_approssimativa: fm.posizione_approssimativa.checked,
      organizzatori: v.organizzatori.split(',').map((x) => x.trim()).filter(Boolean),
    };
    try {
      await api(`/api/moderazione/eventi/${encodeURIComponent(idModifica)}`, { corpo: { azione: 'modifica', campi } });
      $('#dlg-modifica').close();
      avvisoOk('Modifica salvata.');
      aggiorna();
    } catch (e) { $('#errore-modifica').textContent = e.message; }
  });

  // ---------- Cronologia ----------
  async function apriCronologia(id) {
    let d;
    try { d = await api(`/api/moderazione/eventi/${encodeURIComponent(id)}/cronologia`); } catch (e) { return alert(e.message); }
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
    if (!confirm(`Ripristinare la versione ${r.dataset.ripristina}? Verrà creata una nuova versione con quei dati.`)) return;
    try {
      await api(`/api/moderazione/eventi/${encodeURIComponent(r.dataset.id)}`, { corpo: { azione: 'ripristina', versione: Number(r.dataset.ripristina) } });
      $('#dlg-cronologia').close();
      avvisoOk('Versione ripristinata.');
      aggiorna();
    } catch (e) { alert(e.message); }
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
      } catch (e) { alert(e.message); }
    });
  }
  document.addEventListener('click', async (ev) => {
    const b = ev.target.closest('[data-staff]');
    if (!b) return;
    const az = b.dataset.staff;
    if (az === 'revoca' && !confirm('Revocare l’accesso? Avrà effetto subito.')) return;
    if (az === 'nuovo_codice' && !confirm('Generare un nuovo codice? Quello vecchio smetterà di funzionare.')) return;
    try {
      const r = await api('/api/admin/staff', { corpo: { azione: az, id: Number(b.dataset.id) } });
      caricaStaff(r.codice ? { nome: b.dataset.nome, codice: r.codice } : null);
    } catch (e) { alert(e.message); }
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
        ${num('giorni_conservazione', 'Giorni dopo l’evento prima della cancellazione automatica')}
        ${sn('telegram_auto', 'Pubblicare in automatico sul canale Telegram gli eventi verificati?')}
        <label>Ora dell'uscita giornaliera su Telegram (0–23). Gli eventi verificati escono tutti insieme a quest'ora; quelli di oggi (e di domani, se l'uscita è già passata) escono subito.<input name="telegram_ora" type="number" min="0" max="23" value="${esc(i.telegram_ora ?? '18')}"></label>
        <button class="bottone bottone--pieno" type="submit">Salva impostazioni</button>
      </form>
      <div class="form-griglia">
        <h2>Canale Telegram</h2>
        <p>${d.telegram_configurato ? '✅ Bot configurato.' : '⚠️ Bot non configurato: mancano i segreti <code>TELEGRAM_BOT_TOKEN</code> e <code>TELEGRAM_CHAT_ID</code> nel Worker.'}</p>
        <button class="bottone" type="button" id="prova-tg" ${d.telegram_configurato ? '' : 'disabled'}>Invia un messaggio di prova</button>
        <p>Dopo aver collegato il gruppo dei commenti, ripubblica gli eventi futuri: i nuovi post avranno il pulsante «Commenta». Il bot prova a cancellare i vecchi post; quelli più vecchi di 48 ore cancellali tu dal canale.</p>
        <button class="bottone" type="button" id="ripubblica-tg" ${d.telegram_configurato ? '' : 'disabled'}>Ripubblica su Telegram</button>
        <p>Attiva il bot: regole come primo commento sotto ogni post e assistente personale (cerca per città, data, tipo). Prima rendi il bot amministratore anche del gruppo di discussione, poi premi il pulsante. Va ripremuto dopo ogni aggiornamento del bot.</p>
        <button class="bottone" type="button" id="webhook-tg" ${d.telegram_configurato ? '' : 'disabled'}>Attiva bot (regole e assistente)</button>
        <p>Pubblica nel canale il post «🔎 Trova una mobilitazione» con i pulsanti che aprono l'assistente, e lo fissa in alto.</p>
        <button class="bottone" type="button" id="trova-tg" ${d.telegram_configurato ? '' : 'disabled'}>Pubblica post «Trova»</button>
      </div>
      <div class="form-griglia">
        <h2>Pulizia</h2>
        <p>Ogni notte il sito cancella da solo gli eventi finiti da più di ${esc(i.giorni_conservazione)} giorni. Puoi farlo anche adesso.</p>
        <button class="bottone bottone--chiaro" type="button" id="pulisci">Pulisci ora</button>
      </div>`;
    $('#form-imp').addEventListener('submit', async (ev) => {
      ev.preventDefault();
      try { await api('/api/admin/impostazioni', { corpo: Object.fromEntries(new FormData(ev.target).entries()) }); avvisoOk('Impostazioni salvate.'); }
      catch (e) { alert(e.message); }
    });
    $('#prova-tg').addEventListener('click', async () => {
      try { await api('/api/admin/telegram-prova', { corpo: {} }); avvisoOk('Messaggio inviato: controlla il canale.'); } catch (e) { alert(e.message); }
    });
    $('#ripubblica-tg').addEventListener('click', async (ev) => {
      if (!confirm('Ripubblicare sul canale tutti gli eventi futuri verificati? I vecchi post verranno sostituiti da quelli nuovi.')) return;
      const b = ev.currentTarget; b.disabled = true; b.textContent = 'Ripubblicazione in corso…';
      try {
        const r = await api('/api/admin/telegram-ripubblica', { corpo: {} });
        let msg = `Messaggi ripubblicati: ${r.ripubblicati}.`;
        if (r.vecchi_non_cancellati) msg += ` ${r.vecchi_non_cancellati} vecchi post non si sono potuti cancellare: toglili tu dal canale.`;
        if (r.restanti) msg += ` Ne restano ${r.restanti}: premi di nuovo il pulsante.`;
        avvisoOk(msg);
      } catch (e) { alert(e.message); }
      b.disabled = false; b.textContent = 'Ripubblica su Telegram';
    });
    $('#webhook-tg').addEventListener('click', async () => {
      try {
        const r = await api('/api/admin/telegram-webhook', { corpo: {} });
        avvisoOk('Bot attivato: regole nei commenti e assistente.' + (r.username ? ` Il bot si apre da t.me/${r.username}` : ''));
      } catch (e) { alert(e.message); }
    });
    $('#trova-tg').addEventListener('click', async () => {
      if (!confirm('Pubblicare nel canale il post «Trova una mobilitazione»?')) return;
      try {
        const r = await api('/api/admin/telegram-trova', { corpo: {} });
        avvisoOk(r.fissato ? 'Post pubblicato e fissato in alto nel canale.' : 'Post pubblicato. Non sono riuscito a fissarlo: fissalo tu dal canale (tieni premuto il post → Fissa).');
      } catch (e) { alert(e.message); }
    });
    $('#pulisci').addEventListener('click', async () => {
      if (!confirm('Cancellare definitivamente gli eventi passati da più dei giorni indicati?')) return;
      try { const r = await api('/api/admin/pulizia', { corpo: {} }); avvisoOk(`Eventi cancellati: ${r.cancellati}.`); } catch (e) { alert(e.message); }
    });
  }

  document.querySelectorAll('dialog').forEach((d) => d.addEventListener('click', (ev) => {
    if (ev.target.closest('[data-chiudi]') || ev.target === d) d.close();
  }));

  entra();
})();
