// GET  /api/mobilitazioni  → elenco degli eventi visibili sulla mappa
// POST /api/mobilitazioni  → nuovo evento proposto da un visitatore
import {
  json, errore, oggiRoma, adessoRoma, impostazioni, hashAnonimo, controllaLimite, verificaTurnstile, slug,
  scriviCronologia,
} from './lib.js';
import { validaEvento } from './dati.js';

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
    { 'cache-control': 'no-store' }
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
  const v = validaEvento(b);
  if (v.errore) return errore(v.errore);
  const { tipo, titolo, data, ora_inizio: oraInizio, ora_fine: oraFine, comune, provincia, regione, luogo,
    lat, lng, organizzatori, fonte } = v.dati;

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
    luogo, lat, lng,
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
