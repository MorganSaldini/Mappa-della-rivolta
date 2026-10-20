// GET  /api/mobilitazioni  → elenco degli eventi visibili sulla mappa
// POST /api/mobilitazioni  → nuovo evento proposto da un visitatore
import {
  json, errore, oggiRoma, adessoRoma, impostazioni, hashAnonimo, controllaLimite, verificaTurnstile, slug,
  scriviCronologia, chiaveCacheEventi, SECONDI_CACHE_EVENTI,
} from './lib.js';
import { validaEvento } from './dati.js';

const CAMPI_PUBBLICI =
  'id, tipo, titolo, data, ora_inizio, ora_fine, comune, provincia, regione, luogo, lat, lng, ' +
  'posizione_approssimativa, organizzatori, fonte, stato, conferme, aggiornato_il, gruppo';

export async function onRequestGet({ request, env, ctx }) {
  // 1) Se c'è una copia recente (meno di 60 secondi) la restituisce senza toccare il database
  const chiave = chiaveCacheEventi(request);
  const cache = typeof caches !== 'undefined' ? caches.default : null;
  if (cache) {
    try {
      const copia = await cache.match(chiave);
      if (copia) return copia;
    } catch (e) { console.error('Cache', e); }
  }

  // 2) Altrimenti legge dal database e salva la copia per le visite successive
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
  const risposta = json(
    {
      ok: true, eventi, ultimo_aggiornamento: ultimo || null, giorni_conservazione: imp.giorniConservazione, giorni_archivio: imp.giorniArchivio,
      generato_il: new Date().toISOString(),
    },
    200,
    // Il browser la tiene 30 secondi; la copia condivisa del Worker 60 secondi
    { 'cache-control': `public, max-age=30, s-maxage=${SECONDI_CACHE_EVENTI}` }
  );
  if (cache && ctx) ctx.waitUntil(cache.put(chiave, risposta.clone()).catch((e) => console.error('Cache', e)));
  return risposta;
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
  // Un evento può svolgersi in più città e in più giorni: i campi comuni (tipo, titolo, organizzatori, fonte)
  // valgono per tutti; ogni città ha il suo luogo, le sue coordinate e, se diverso, il suo orario.
  const extra = Array.isArray(b.luoghi) ? b.luoghi : [];
  if (extra.length > MAX_CITTA - 1) return errore(`Puoi indicare al massimo ${MAX_CITTA} città per evento.`);
  const LOCALI = ['comune', 'provincia', 'regione', 'luogo', 'lat', 'lng', 'posizione_approssimativa', 'ora_inizio', 'ora_fine'];
  const perCitta = [b, ...extra.map((l) => {
    const unito = { ...b };
    for (const k of LOCALI) if (k !== 'ora_inizio' && k !== 'ora_fine') unito[k] = l ? l[k] : undefined;
    if (l && l.ora_inizio) unito.ora_inizio = l.ora_inizio;
    if (l && l.ora_fine) unito.ora_fine = l.ora_fine;
    return unito;
  })];

  // Può svolgersi anche in più giorni: ogni giorno diventa un evento collegato agli altri (stesso gruppo)
  const altreDate = Array.isArray(b.date_extra) ? b.date_extra : [];
  if (altreDate.length > MAX_DATE) return errore(`Puoi indicare al massimo ${MAX_DATE + 1} giorni per evento.`);
  const date = [String(b.data || '')];
  for (const d of altreDate) {
    const x = String(d || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(x)) return errore('Una delle date aggiuntive non è valida.');
    if (!date.includes(x)) date.push(x);
  }
  if (date.length * perCitta.length > MAX_RIGHE) {
    return errore(`Troppe combinazioni: ${date.length} giorni × ${perCitta.length} città. Il massimo è ${MAX_RIGHE} in tutto.`);
  }
  const richieste = [];
  for (const d of date) for (const c of perCitta) richieste.push({ ...c, data: d });

  const validi = [];
  const visti = new Set();
  const piuCitta = perCitta.length > 1, piuDate = date.length > 1;
  for (let i = 0; i < richieste.length; i++) {
    const r = richieste[i];
    const v = validaEvento(r);
    if (v.errore) {
      const dataIt = /^\d{4}-\d{2}-\d{2}$/.test(r.data) ? r.data.split('-').reverse().slice(0, 2).join('/') : r.data;
      const chi = [piuCitta ? (r.comune || `Città n. ${(i % perCitta.length) + 1}`) : '', piuDate ? dataIt : ''].filter(Boolean).join(', ');
      return errore(chi ? chi + ': ' + v.errore : v.errore);
    }
    const chiave = (v.dati.data + '|' + v.dati.comune + '|' + (v.dati.luogo || '')).toLowerCase();
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

  // Tetto per tutto il sito: in caso di ondata di invii (spam o attacco) i nuovi eventi
  // smettono di comparire subito e restano in coda per i moderatori.
  let inCoda = !imp.pubblicazioneImmediata;
  if (!inCoda) {
    const unOraFa = new Date(Date.now() - 3600000).toISOString();
    const tot = await env.DB
      .prepare("SELECT COUNT(*) AS n FROM invii WHERE azione = 'nuovo_evento' AND creato_il > ?")
      .bind(unOraFa).first();
    if (tot && tot.n > imp.maxInviiOraTotali) {
      await env.DB
        .prepare("INSERT INTO impostazioni (chiave, valore) VALUES ('pubblicazione_immediata', 'no') ON CONFLICT(chiave) DO UPDATE SET valore = 'no'")
        .run();
      console.warn(`Troppi invii nell'ultima ora (${tot.n}): pubblicazione immediata disattivata, nuovi eventi in coda.`);
      inCoda = true;
    }
  }

  const gruppo = validi.length > 1
    ? 'g-' + [...crypto.getRandomValues(new Uint8Array(6))].map((x) => x.toString(16).padStart(2, '0')).join('')
    : null;
  const ids = [];
  for (const d of validi) ids.push(await creaEvento(env.DB, d, { gruppo, attore: 'visitatore' }));

  return json({ ok: true, id: ids[0], ids, gruppo, stato: 'da_verificare', visibile_subito: !inCoda }, 201);
}

const MAX_CITTA = 20;
const MAX_DATE = 14;   // date in più oltre alla prima (15 giorni in tutto)
const MAX_RIGHE = 40;  // giorni × città

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
