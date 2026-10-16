// GET  /api/mobilitazioni  → elenco degli eventi visibili sulla mappa
// POST /api/mobilitazioni  → nuovo evento proposto da un visitatore
import {
  json, errore, oggiRoma, adessoRoma, impostazioni, hashAnonimo, controllaLimite, verificaTurnstile, slug,
  scriviCronologia,
} from './lib.js';
import { validaEvento } from './dati.js';

const CAMPI_PUBBLICI =
  'id, tipo, titolo, data, ora_inizio, ora_fine, comune, provincia, regione, luogo, lat, lng, ' +
  'posizione_approssimativa, organizzatori, fonte, stato, conferme, aggiornato_il, gruppo';

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
  // Un evento può svolgersi in più città: i campi comuni (tipo, titolo, data, organizzatori, fonte)
  // valgono per tutte; ogni città ha il suo luogo, le sue coordinate e, se diverso, il suo orario.
  const extra = Array.isArray(b.luoghi) ? b.luoghi : [];
  if (extra.length > MAX_CITTA - 1) return errore(`Puoi indicare al massimo ${MAX_CITTA} città per evento.`);
  const LOCALI = ['comune', 'provincia', 'regione', 'luogo', 'lat', 'lng', 'posizione_approssimativa', 'ora_inizio', 'ora_fine'];
  const richieste = [b, ...extra.map((l) => {
    const unito = { ...b };
    for (const k of LOCALI) if (k !== 'ora_inizio' && k !== 'ora_fine') unito[k] = l ? l[k] : undefined;
    if (l && l.ora_inizio) unito.ora_inizio = l.ora_inizio;
    if (l && l.ora_fine) unito.ora_fine = l.ora_fine;
    return unito;
  })];
  const validi = [];
  const visti = new Set();
  for (let i = 0; i < richieste.length; i++) {
    const v = validaEvento(richieste[i]);
    if (v.errore) {
      const chi = richieste[i].comune ? `${richieste[i].comune}: ` : `Città n. ${i + 1}: `;
      return errore(richieste.length > 1 ? chi + v.errore : v.errore);
    }
    const chiave = (v.dati.comune + '|' + (v.dati.luogo || '')).toLowerCase();
    if (visti.has(chiave)) return errore(`${v.dati.comune} compare due volte con lo stesso luogo.`);
    visti.add(chiave);
    validi.push(v.dati);
  }

  // Limite di invii: conta solo le segnalazioni valide (una per invio, anche se le città sono tante)
  const imp = await impostazioni(env.DB);
  const hash = await hashAnonimo(request, env);
  if (!(await controllaLimite(env.DB, hash, 'nuovo_evento', imp.maxInviiOra))) {
    return errore('Hai inviato troppe segnalazioni in poco tempo. Riprova tra un’ora.', 429);
  }

  const gruppo = validi.length > 1
    ? 'g-' + [...crypto.getRandomValues(new Uint8Array(6))].map((x) => x.toString(16).padStart(2, '0')).join('')
    : null;
  const ids = [];
  for (const d of validi) ids.push(await creaEvento(env.DB, d, { gruppo, attore: 'visitatore' }));

  return json({ ok: true, id: ids[0], ids, gruppo, stato: 'da_verificare', visibile_subito: imp.pubblicazioneImmediata }, 201);
}

const MAX_CITTA = 20;

// Inserisce un evento già validato e ne scrive la cronologia. Restituisce l'id.
export async function creaEvento(db, d, { gruppo = null, attore = 'visitatore', note = null } = {}) {
  const base = `${d.data}-${slug(d.comune)}-${d.tipo}`;
  const r = await db.prepare('SELECT COUNT(*) AS n FROM eventi WHERE id LIKE ?').bind(base + '-%').first();
  const id = `${base}-${String((r?.n || 0) + 1).padStart(2, '0')}`;
  const adesso = adessoRoma();
  const evento = {
    id, ...d, organizzatori: JSON.stringify(d.organizzatori || []), fonte: d.fonte || null,
    stato: 'da_verificare', conferme: 0, segnalazioni_aperte: 0, versione: 1,
    creato_il: adesso, aggiornato_il: adesso, note, gruppo,
  };
  await db
    .prepare(
      `INSERT INTO eventi (id, tipo, titolo, data, ora_inizio, ora_fine, comune, provincia, regione, luogo,
        lat, lng, posizione_approssimativa, organizzatori, fonte, stato, conferme, segnalazioni_aperte,
        versione, creato_il, aggiornato_il, note, gruppo)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'da_verificare',0,0,1,?,?,?,?)`
    )
    .bind(
      id, d.tipo, d.titolo, d.data, d.ora_inizio, d.ora_fine, d.comune, d.provincia, d.regione, d.luogo,
      d.lat, d.lng, d.posizione_approssimativa || 0, evento.organizzatori, evento.fonte, adesso, adesso, note, gruppo
    )
    .run();
  await scriviCronologia(db, evento, 'creato', attore);
  return id;
}
