// Riconoscimento dei doppioni: due eventi sono probabilmente lo stesso se cadono nello stesso giorno,
// nello stesso posto (stesso comune o a meno di 1 km) e si somigliano per tipo, titolo, sigle o fonte.
// Usato da: modulo "Aggiungi" (avviso prima di inserire) e scheda "Doppioni" del pannello moderatori.
import { json, errore, adessoRoma } from './lib.js';
import { leggiEvento, apriEvento, salvaVersione } from './dati.js';
import { rimuoviEvento } from './telegram.js';

export const SOGLIA_PROBABILE = 0.55;
export const SOGLIA_QUASI_CERTO = 0.8;

// Parole che non aiutano a distinguere due eventi
const VUOTE = new Set(('il lo la i gli le un uno una di a da in con su per tra fra e ed o del dello della dei degli delle ' +
  'al allo alla ai agli alle dal dallo dalla dai dagli dalle nel nello nella nei negli nelle sul sullo sulla sui sugli sulle ' +
  'contro per non no si se che chi come piu più tutti tutte ore giornata intera nazionale locale ' +
  // parole troppo comuni negli eventi della mappa per dire che due titoli parlano della stessa cosa
  'sciopero scioperi corteo cortei presidio presidi manifestazione manifestazioni mobilitazione assemblea ' +
  'iniziativa protesta lavoratori lavoratrici personale settore ' +
  // inizio fisso degli avvisi e parole generiche delle scuole
  'possibili disagi occupazione occupazioni autogestione liceo licei istituto scuola scuole studenti universita').split(' '));

// Fonti "di elenco" usate da tanti eventi diversi (calendari ufficiali, pagine generali): non provano che due eventi siano lo stesso
const FONTI_GENERICHE = /(^|\.)(mit\.gov\.it|cgsse\.it|scioperi\.mit\.gov\.it|funzionepubblica\.gov\.it)$/;

export function normale(t) {
  return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}
function parole(t) {
  return new Set(normale(t).split(' ').filter((w) => w.length > 2 && !VUOTE.has(w)));
}
function somiglianza(a, b) {
  const A = parole(a), B = parole(b);
  if (!A.size || !B.size) return 0;
  let comuni = 0;
  for (const w of A) if (B.has(w)) comuni++;
  return (2 * comuni) / (A.size + B.size);
}
export function distanzaKm(a, b) {
  const r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(x));
}
function sigle(e) {
  let o = e.organizzatori;
  if (typeof o === 'string') { try { o = JSON.parse(o); } catch { o = []; } }
  return new Set((Array.isArray(o) ? o : []).map(normale).filter(Boolean));
}
function fonteBase(u) {
  try {
    const x = new URL(u);
    const host = x.hostname.replace(/^www\./, '').toLowerCase();
    if (FONTI_GENERICHE.test(host)) return '';
    return (host + x.pathname.replace(/\/+$/, '')).toLowerCase();
  } catch { return ''; }
}

// Punteggio da 0 a 1 e motivi leggibili
export function confronta(a, b) {
  if (!a || !b || a.id === b.id || a.data !== b.data) return { punteggio: 0, motivi: [] };
  if (a.gruppo && a.gruppo === b.gruppo) return { punteggio: 0, motivi: [] }; // appuntamenti dello stesso evento
  const motivi = [];
  const km = distanzaKm(a, b);
  const stessoComune = normale(a.comune) === normale(b.comune);
  let p = 0;
  // Con posizione solo indicativa (es. centro città per uno sciopero nazionale) il punto non dice nulla
  const indicativa = a.posizione_approssimativa || b.posizione_approssimativa;
  if (indicativa && stessoComune) { p += 0.2; motivi.push('stesso comune'); }
  else if (km < 0.3) { p += 0.4; motivi.push('stesso punto'); }
  else if (km < 1) { p += 0.3; motivi.push(`a ${Math.round(km * 1000)} m`); }
  else if (stessoComune) { p += 0.2; motivi.push('stesso comune'); }
  else return { punteggio: 0, motivi: [] };

  if (a.tipo === b.tipo) { p += 0.15; motivi.push('stesso tipo'); }
  const s = somiglianza(a.titolo, b.titolo);
  const titoliSimili = s >= 0.5;
  if (titoliSimili) { p += 0.35 * s; motivi.push(`titoli simili (${Math.round(s * 100)}%)`); }
  if (a.ora_inizio && b.ora_inizio && a.ora_inizio === b.ora_inizio) { p += 0.1; motivi.push('stessa ora'); }
  // Orari lontani (più di 2 ore) nello stesso giorno: quasi sempre due iniziative diverse
  const minuti = (o) => { const m = /^(\d{1,2}):(\d{2})/.exec(o || ''); return m ? +m[1] * 60 + +m[2] : null; };
  const ma = minuti(a.ora_inizio), mb = minuti(b.ora_inizio);
  if (ma !== null && mb !== null && Math.abs(ma - mb) > 120) { p *= 0.5; motivi.push('orari diversi'); }
  const fa = fonteBase(a.fonte), fb = fonteBase(b.fonte);
  const stessaFonte = !!fa && fa === fb;
  if (stessaFonte) { p += 0.25; motivi.push('stessa fonte'); }

  const sa = sigle(a), sb = sigle(b);
  if (sa.size && sb.size) {
    const comuni = [...sa].some((x) => sb.has(x));
    if (comuni) { p += 0.1; motivi.push('stesse sigle'); }
    else if (!stessaFonte) { p *= 0.6; motivi.push('sigle diverse'); } // es. due scioperi di sindacati diversi lo stesso giorno
  }
  // Senza un indizio sul contenuto (titolo simile o stessa fonte specifica) stesso giorno e posto non bastano:
  // nello stesso giorno, nella stessa piazza, possono esserci iniziative diverse
  if (!titoliSimili && !stessaFonte) p = Math.min(p, 0.45);
  return { punteggio: Math.min(1, Math.round(p * 100) / 100), motivi };
}

// Eventi già presenti che somigliano a un evento nuovo (stesso giorno, stesso posto)
export async function cercaSimili(db, d, { escludiId = null } = {}) {
  const dLat = 0.02, dLng = 0.03; // circa 2 km
  const { results } = await db.prepare(
    `SELECT id, tipo, titolo, data, ora_inizio, comune, provincia, luogo, lat, lng, organizzatori, fonte, stato, gruppo
     FROM eventi WHERE data = ? AND stato <> 'rifiutato'
       AND (lower(comune) = lower(?) OR (lat BETWEEN ? AND ? AND lng BETWEEN ? AND ?))
     LIMIT 60`
  ).bind(d.data, d.comune, d.lat - dLat, d.lat + dLat, d.lng - dLng, d.lng + dLng).all();
  return results
    .filter((e) => e.id !== escludiId)
    .map((e) => ({ e, ...confronta({ ...d, id: '__nuovo__' }, e) }))
    .filter((x) => x.punteggio >= SOGLIA_PROBABILE)
    .sort((x, y) => y.punteggio - x.punteggio);
}

// ---------- Scheda "Doppioni" del pannello ----------
async function preparaTabella(db) {
  await db.prepare('CREATE TABLE IF NOT EXISTS non_doppioni (chiave TEXT PRIMARY KEY, deciso_da TEXT, creato_il TEXT)').run();
}
const chiaveCoppia = (a, b) => [a, b].sort().join('|');

export async function elenco({ env, sessione }) {
  await preparaTabella(env.DB);
  const ieri = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const filtro = sessione.regioni.length ? ` AND regione IN (${sessione.regioni.map(() => '?').join(',')})` : '';
  const { results } = await env.DB.prepare(
    `SELECT * FROM eventi WHERE data >= ? AND stato IN ('da_verificare','verificato','nascosto','annullato')${filtro} ORDER BY data LIMIT 3000`
  ).bind(ieri, ...sessione.regioni).all();
  const scartate = new Set((await env.DB.prepare('SELECT chiave FROM non_doppioni').all()).results.map((r) => r.chiave));

  const perGiorno = {};
  for (const e of results) (perGiorno[e.data] ||= []).push(e);
  const coppie = [];
  for (const lista of Object.values(perGiorno)) {
    for (let i = 0; i < lista.length; i++) {
      for (let j = i + 1; j < lista.length; j++) {
        const c = confronta(lista[i], lista[j]);
        if (c.punteggio < SOGLIA_PROBABILE || scartate.has(chiaveCoppia(lista[i].id, lista[j].id))) continue;
        // Prima quello più "solido": verificato, con fonte, più conferme, inserito prima
        const voto = (e) => (e.stato === 'verificato' ? 4 : 0) + (e.fonte ? 2 : 0) + (e.conferme || 0) / 100;
        const [a, b] = voto(lista[i]) >= voto(lista[j]) ? [lista[i], lista[j]] : [lista[j], lista[i]];
        coppie.push({ a: apriEvento(a), b: apriEvento(b), ...c });
      }
    }
  }
  coppie.sort((x, y) => y.punteggio - x.punteggio || x.a.data.localeCompare(y.a.data));
  return json({ ok: true, coppie: coppie.slice(0, 200), totale: coppie.length });
}

export async function azione({ request, env, ctx, sessione }) {
  let b = {};
  try { b = await request.json(); } catch { /* corpo vuoto */ }
  await preparaTabella(env.DB);
  const attore = sessione.id === 0 ? 'admin' : `moderatore#${sessione.id}`;
  const puo = (e) => !sessione.regioni.length || sessione.regioni.includes(e.regione);

  if (b.azione === 'diversi') {
    const a = await leggiEvento(env.DB, String(b.a || '')), c = await leggiEvento(env.DB, String(b.b || ''));
    if (!a || !c || !puo(a) || !puo(c)) return errore('Evento non trovato.', 404);
    await env.DB.prepare('INSERT OR IGNORE INTO non_doppioni (chiave, deciso_da, creato_il) VALUES (?, ?, ?)')
      .bind(chiaveCoppia(a.id, c.id), attore, adessoRoma()).run();
    return json({ ok: true });
  }

  if (b.azione === 'unisci') {
    const tieni = await leggiEvento(env.DB, String(b.tieni || ''));
    const togli = await leggiEvento(env.DB, String(b.togli || ''));
    if (!tieni || !togli || tieni.id === togli.id || !puo(tieni) || !puo(togli)) return errore('Evento non trovato.', 404);
    if (togli.stato === 'rifiutato') return errore('Questo doppione è già stato tolto.');

    // L'evento che resta prende le informazioni che gli mancano dall'altro (fonte, luogo, orari, sigle)
    const cambi = {};
    for (const k of ['fonte', 'luogo', 'ora_inizio', 'ora_fine']) if (!tieni[k] && togli[k]) cambi[k] = togli[k];
    const unite = [...new Set([...apriEvento(tieni).organizzatori, ...apriEvento(togli).organizzatori])].slice(0, 5);
    if (unite.length !== apriEvento(tieni).organizzatori.length) cambi.organizzatori = unite;
    cambi.conferme = (tieni.conferme || 0) + (togli.conferme || 0);
    if (Object.keys(cambi).length) await salvaVersione(env.DB, tieni, cambi, `unito_con_${togli.id}`.slice(0, 120), attore);

    const tolto = await salvaVersione(env.DB, togli, { stato: 'rifiutato' }, `doppione_di_${tieni.id}`.slice(0, 120), attore);
    await env.DB.prepare("UPDATE problemi SET stato = 'chiusa' WHERE evento_id = ? AND stato = 'aperta'").bind(togli.id).run();
    await env.DB.prepare("UPDATE modifiche SET stato = 'rifiutata', deciso_da = ?, deciso_il = ? WHERE evento_id = ? AND stato = 'in_attesa'")
      .bind(attore, adessoRoma(), togli.id).run();
    if (togli.telegram_msg_id && togli.telegram_msg_id !== tieni.telegram_msg_id && ctx) {
      ctx.waitUntil(rimuoviEvento(env, { ...tolto, telegram_msg_id: togli.telegram_msg_id }).catch(() => {}));
    }
    return json({ ok: true });
  }
  return errore('Azione sconosciuta.');
}

