// GET  /api/eventi  → elenco degli eventi visibili sulla mappa
// POST /api/eventi  → nuovo evento proposto da un visitatore
import {
  TIPI, normalizzaRegione, json, errore, oggiRoma, adessoRoma, aggiungiGiorni, impostazioni,
  hashAnonimo, controllaLimite, verificaTurnstile, contieneDatiPersonali, pulisci, slug, scriviCronologia,
} from './lib.js';

const CAMPI_PUBBLICI =
  'id, tipo, titolo, data, ora_inizio, ora_fine, comune, provincia, regione, luogo, lat, lng, ' +
  'posizione_approssimativa, organizzatori, fonte, stato, conferme, aggiornato_il';

export async function onRequestGet({ env }) {
  const imp = await impostazioni(env.DB);
  const oggi = oggiRoma();
  const stati = imp.pubblicazioneImmediata
    ? ['verificato', 'da_verificare', 'annullato']
    : ['verificato', 'annullato'];
  const { results } = await env.DB
    .prepare(
      `SELECT ${CAMPI_PUBBLICI} FROM eventi
       WHERE data >= ? AND stato IN (${stati.map(() => '?').join(',')})
       ORDER BY data, ora_inizio`
    )
    .bind(oggi, ...stati)
    .all();

  const eventi = results.map((e) => ({ ...e, organizzatori: e.organizzatori ? JSON.parse(e.organizzatori) : [] }));
  const ultimo = eventi.reduce((m, e) => (e.aggiornato_il && e.aggiornato_il > m ? e.aggiornato_il : m), '');
  return json(
    { ok: true, eventi, ultimo_aggiornamento: ultimo || null, giorni_conservazione: imp.giorniConservazione },
    200,
    { 'cache-control': 'public, max-age=30' }
  );
}

export async function onRequestPost({ request, env }) {
  let b;
  try {
    b = await request.json();
  } catch {
    return errore('Richiesta non valida.');
  }

  // Trappola per i bot: campo nascosto che una persona non compila
  if (b.sito_web) return json({ ok: true, stato: 'da_verificare' });

  if (!(await verificaTurnstile(b.turnstile, request, env))) {
    return errore('Verifica anti-bot non riuscita. Ricarica la pagina e riprova.', 403);
  }

  // ---- Validazione ----
  const tipo = String(b.tipo || '');
  if (!TIPI.includes(tipo)) return errore('Scegli il tipo di mobilitazione.');

  const titolo = pulisci(b.titolo, 120);
  if (titolo.length < 5) return errore('Il titolo deve avere almeno 5 caratteri.');

  const data = String(b.data || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || isNaN(Date.parse(data + 'T12:00:00Z'))) return errore('Data non valida.');
  const oggi = oggiRoma();
  if (data < oggi) return errore('La data è già passata.');
  if (data > aggiungiGiorni(oggi, 365)) return errore('La data è troppo lontana (massimo un anno).');

  const reOra = /^([01]\d|2[0-3]):[0-5]\d$/;
  const oraInizio = b.ora_inizio ? String(b.ora_inizio) : null;
  const oraFine = b.ora_fine ? String(b.ora_fine) : null;
  if (oraInizio && !reOra.test(oraInizio)) return errore('Ora di inizio non valida.');
  if (oraFine && !reOra.test(oraFine)) return errore('Ora di fine non valida.');

  const comune = pulisci(b.comune, 80);
  if (comune.length < 2) return errore('Indica il comune.');
  const provincia = pulisci(b.provincia, 2).toUpperCase();
  if (!/^[A-Z]{2}$/.test(provincia)) return errore('Provincia non riconosciuta: cerca il comune sulla mappa.');
  const regione = normalizzaRegione(b.regione);
  if (!regione) return errore('Regione non riconosciuta: cerca il comune sulla mappa.');

  const luogo = pulisci(b.luogo, 120);
  const lat = Number(b.lat);
  const lng = Number(b.lng);
  if (!(lat >= 35.4 && lat <= 47.2 && lng >= 6.5 && lng <= 18.7)) {
    return errore('Il punto sulla mappa deve trovarsi in Italia.');
  }

  let organizzatori = Array.isArray(b.organizzatori) ? b.organizzatori : String(b.organizzatori || '').split(',');
  organizzatori = organizzatori.map((o) => pulisci(o, 60)).filter(Boolean).slice(0, 5);

  let fonte = pulisci(b.fonte, 300);
  if (fonte) {
    try {
      const u = new URL(fonte);
      if (!['http:', 'https:'].includes(u.protocol)) throw new Error();
    } catch {
      return errore('Il link della fonte non è valido (deve iniziare con https://).');
    }
  }

  if ([titolo, luogo, ...organizzatori].some(contieneDatiPersonali)) {
    return errore('Togli email e numeri di telefono: la mappa non pubblica dati personali.');
  }

  // Limite di invii: conta solo le segnalazioni valide
  const imp = await impostazioni(env.DB);
  const hash = await hashAnonimo(request, env);
  if (!(await controllaLimite(env.DB, hash, 'nuovo_evento', imp.maxInviiOra))) {
    return errore('Hai inviato troppe segnalazioni in poco tempo. Riprova tra un’ora.', 429);
  }

  // ---- Identificativo ----
  const base = `${data}-${slug(comune)}-${tipo}`;
  const r = await env.DB.prepare('SELECT COUNT(*) AS n FROM eventi WHERE id LIKE ?').bind(base + '-%').first();
  const id = `${base}-${String((r?.n || 0) + 1).padStart(2, '0')}`;

  const adesso = adessoRoma();
  const evento = {
    id, tipo, titolo, data, ora_inizio: oraInizio, ora_fine: oraFine, comune, provincia, regione,
    luogo, lat: Math.round(lat * 1e5) / 1e5, lng: Math.round(lng * 1e5) / 1e5,
    posizione_approssimativa: b.posizione_approssimativa ? 1 : 0,
    organizzatori: JSON.stringify(organizzatori), fonte: fonte || null,
    stato: 'da_verificare', conferme: 0, segnalazioni_aperte: 0, versione: 1,
    creato_il: adesso, aggiornato_il: adesso, note: null,
  };

  await env.DB
    .prepare(
      `INSERT INTO eventi (id, tipo, titolo, data, ora_inizio, ora_fine, comune, provincia, regione, luogo,
        lat, lng, posizione_approssimativa, organizzatori, fonte, stato, conferme, segnalazioni_aperte,
        versione, creato_il, aggiornato_il, note)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    )
    .bind(
      evento.id, evento.tipo, evento.titolo, evento.data, evento.ora_inizio, evento.ora_fine, evento.comune,
      evento.provincia, evento.regione, evento.luogo, evento.lat, evento.lng, evento.posizione_approssimativa,
      evento.organizzatori, evento.fonte, evento.stato, 0, 0, 1, adesso, adesso, null
    )
    .run();
  await scriviCronologia(env.DB, evento, 'creato', 'visitatore');

  return json({ ok: true, id, stato: 'da_verificare', visibile_subito: imp.pubblicazioneImmediata }, 201);
}
