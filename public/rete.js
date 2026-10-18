/* Mappa della Rivolta — funzionamento distribuito
 *
 * La stessa pagina gira in più posti:
 *  - sul sito principale (mappadellarivolta.org o l'indirizzo …workers.dev);
 *  - sugli "specchi": copie identiche su GitHub Pages, Codeberg, IPFS;
 *  - come file scaricato sul telefono o sul computer (mappa offline).
 *
 * Lettura: la pagina prova, in ordine, il sito principale, la copia statica, i dati dentro il file
 * offline e infine la rete Nostr (relay indipendenti), dove gli eventi verificati sono firmati
 * con la chiave del progetto. Così la mappa resta leggibile anche se il sito principale cade o viene oscurato.
 *
 * Scrittura: invii, conferme e segnalazioni passano solo dal sito principale, dove ci sono
 * anti-spam e moderazione. Sugli specchi i pulsanti spiegano dove andare.
 */
(function () {
  'use strict';

  const CONFIG = window.CONFIG || {};
  const PRINCIPALE = (CONFIG.sitoPrincipale || 'https://mappadellarivolta.org').replace(/\/+$/, '');
  const host = location.hostname || '';
  const SUL_PRINCIPALE =
    host === 'mappadellarivolta.org' || host === 'www.mappadellarivolta.org' ||
    host.endsWith('.workers.dev') || host === 'localhost' || host === '127.0.0.1';
  const SPECCHIO = !SUL_PRINCIPALE;

  // Sugli specchi le letture vanno al sito principale (le API pubbliche accettano richieste da altri siti)
  const API = SUL_PRINCIPALE ? '' : PRINCIPALE;

  // ---------- Lettura da Nostr ----------
  // Gli eventi sono pubblicati come "calendar event" (NIP-52, kind 31923) firmati dalla chiave del progetto.
  // Si accettano solo eventi con firma valida e con l'autore giusto: un relay non può inventarli.
  const KIND_CALENDARIO = [31922, 31923]; // 31922 = solo data, 31923 = con orario
  const ETICHETTA = 'mappadellarivolta';

  function caricaScript(src) {
    return new Promise((ok, ko) => {
      const s = document.createElement('script');
      s.src = src; s.async = true;
      s.onload = () => ok(); s.onerror = () => ko(new Error('script non caricato: ' + src));
      document.head.appendChild(s);
    });
  }

  function chiavePubblica() {
    const k = String(CONFIG.nostrChiavePubblica || '').trim();
    if (/^[0-9a-f]{64}$/i.test(k)) return k.toLowerCase();
    if (k.startsWith('npub1') && window.NostrTools) {
      try { const d = window.NostrTools.nip19.decode(k); if (d.type === 'npub') return d.data; } catch (_) {}
    }
    return null;
  }

  function daEventoNostr(ev) {
    const tag = (n) => (ev.tags.find((t) => t[0] === n) || [])[1];
    let dati = null;
    try { dati = JSON.parse(tag('mappa') || 'null'); } catch (_) { dati = null; }
    if (!dati || typeof dati !== 'object' || !dati.id || !dati.data || typeof dati.lat !== 'number' || typeof dati.lng !== 'number') return null;
    return dati;
  }

  async function leggiNostr(tempoMax) {
    const relays = (CONFIG.nostrRelay || []).filter((r) => /^wss:\/\/|^ws:\/\/(localhost|127\.0\.0\.1)[:/]/.test(r));
    if (!CONFIG.nostrChiavePubblica || !relays.length || typeof WebSocket !== 'function') throw new Error('Nostr non configurato');
    if (!window.NostrTools) await caricaScript((document.currentScript && document.currentScript.dataset.base) || 'vendor/nostr/nostr.bundle.js');
    const autore = chiavePubblica();
    if (!autore) throw new Error('chiave pubblica Nostr non valida');
    const verifica = window.NostrTools.verifyEvent;

    const migliori = new Map(); // d-tag → evento più recente
    const cancellati = new Set();
    let ultimo = 0;
    const filtro = { kinds: KIND_CALENDARIO, authors: [autore], '#L': [ETICHETTA], limit: 500 };
    const filtroCanc = { kinds: [5], authors: [autore], limit: 500 };

    await new Promise((fine) => {
      let aperti = relays.length;
      const chiudi = () => { if (--aperti <= 0) fine(); };
      const timer = setTimeout(fine, tempoMax || 7000);
      for (const url of relays) {
        let ws;
        try { ws = new WebSocket(url); } catch (_) { chiudi(); continue; }
        const sub = 'm' + Math.random().toString(36).slice(2, 8);
        let finito = false;
        const stop = () => { if (finito) return; finito = true; try { ws.close(); } catch (_) {} chiudi(); };
        setTimeout(stop, (tempoMax || 7000) - 200);
        ws.onopen = () => ws.send(JSON.stringify(['REQ', sub, filtro, filtroCanc]));
        ws.onerror = stop;
        ws.onclose = stop;
        ws.onmessage = (m) => {
          let msg; try { msg = JSON.parse(m.data); } catch (_) { return; }
          if (msg[0] === 'EOSE') return stop();
          if (msg[0] !== 'EVENT' || !msg[2]) return;
          const ev = msg[2];
          if (ev.pubkey !== autore || !verifica(ev)) return;
          if (ev.kind === 5) {
            for (const t of ev.tags) if (t[0] === 'a' && t[1]) cancellati.add(t[1] + '@' + ev.created_at);
            return;
          }
          const d = (ev.tags.find((t) => t[0] === 'd') || [])[1];
          if (!d || !KIND_CALENDARIO.includes(ev.kind)) return;
          const prima = migliori.get(d);
          if (!prima || ev.created_at > prima.created_at) migliori.set(d, ev);
          if (ev.created_at > ultimo) ultimo = ev.created_at;
        };
      }
      // se tutti i relay rispondono prima del tempo massimo
      const attesa = setInterval(() => { if (aperti <= 0) { clearInterval(attesa); clearTimeout(timer); fine(); } }, 200);
    });

    const eventi = [];
    for (const [d, ev] of migliori) {
      const coord = `${ev.kind}:${autore}:${d}`;
      // cancellato se esiste una cancellazione più recente dell'evento
      const tolto = [...cancellati].some((c) => { const [a, t] = c.split('@'); return a === coord && Number(t) >= ev.created_at; });
      if (tolto) continue;
      const e = daEventoNostr(ev);
      if (e) eventi.push(e);
    }
    if (!eventi.length) throw new Error('nessun evento su Nostr');
    eventi.sort((a, b) => (a.data + (a.ora_inizio || '')).localeCompare(b.data + (b.ora_inizio || '')));
    return { ok: true, eventi, ultimo_aggiornamento: ultimo ? new Date(ultimo * 1000).toISOString() : null, da_nostr: true };
  }

  // ---------- Scrittura solo sul sito principale ----------
  function scrittura(dialogo) {
    if (!SPECCHIO) { dialogo.showModal(); return; }
    const d = document.getElementById('dlg-specchio');
    if (d) {
      const a = d.querySelector('a[data-principale]');
      if (a) a.href = PRINCIPALE + '/' + location.search;
      d.showModal();
    } else {
      window.open(PRINCIPALE + '/', '_blank', 'noopener');
    }
  }

  // ---------- Copia offline da scaricare e passare ad altri ----------
  // Crea un unico file .html con dentro pagina, stili, programmi e l'elenco attuale degli eventi.
  // Si apre senza internet per l'elenco; per lo sfondo della mappa serve la connessione.
  async function scaricaOffline(eventiCorrenti) {
    const testo = async (u) => { const r = await fetch(u, { cache: 'no-cache' }); if (!r.ok) throw new Error(u); return r.text(); };
    const pagina = await testo('index.html');
    const doc = new DOMParser().parseFromString(pagina, 'text/html');
    for (const l of [...doc.querySelectorAll('link[rel="stylesheet"]')]) {
      const href = l.getAttribute('href');
      if (/^https?:/.test(href)) continue; // i font di Google restano esterni
      const st = doc.createElement('style');
      st.textContent = await testo(href);
      l.replaceWith(st);
    }
    for (const s of [...doc.querySelectorAll('script[src]')]) {
      const src = s.getAttribute('src');
      if (/^https?:/.test(src)) { s.remove(); continue; }
      const nuovo = doc.createElement('script');
      nuovo.textContent = (await testo(src)).replace(/<\/script/gi, '<\\/script');
      s.replaceWith(nuovo);
    }
    const dati = doc.createElement('script');
    const pacchetto = { ok: true, eventi: eventiCorrenti, copia_del: new Date().toISOString(), offline: true };
    dati.textContent = 'window.DATI_INCORPORATI=' + JSON.stringify(pacchetto).replace(/</g, '\\u003c') + ';';
    const primo = doc.querySelector('script');
    if (primo) primo.before(dati); else doc.body.appendChild(dati);
    // Anche il lettore Nostr dentro il file, così la copia offline può aggiornarsi dai relay
    try {
      const nostr = doc.createElement('script');
      nostr.textContent = (await testo('vendor/nostr/nostr.bundle.js')).replace(/<\/script/gi, '<\\/script');
      dati.after(nostr);
    } catch (_) { /* senza Nostr la copia offline funziona lo stesso */ }
    doc.querySelectorAll('link[rel="canonical"], link[rel="preconnect"]').forEach((x) => x.remove());
    const html = '<!doctype html>\n' + doc.documentElement.outerHTML;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'mappa-della-rivolta-offline-' + new Date().toISOString().slice(0, 10) + '.html';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
  }

  window.RETE = { PRINCIPALE, SPECCHIO, API, leggiNostr, scrittura, scaricaOffline };
})();
