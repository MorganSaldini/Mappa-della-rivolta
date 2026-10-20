// GET /api/archivio → eventi già svolti, consultabili nella pagina archivio.html (non compaiono più sulla mappa).
// Solo eventi verificati o annullati; restano per "giorni_archivio" (impostazione, predefinito 365) e poi vengono cancellati.
// I dati collegati agli eventi (codici anonimi, conferme, segnalazioni, cronologia) si cancellano già dopo "giorni_conservazione".
import { json, oggiRoma, aggiungiGiorni, impostazioni } from './lib.js';

const CAMPI =
  'id, tipo, titolo, data, ora_inizio, ora_fine, comune, provincia, regione, luogo, organizzatori, fonte, stato, gruppo';
const SECONDI_CACHE = 600; // la lista cambia una volta al giorno: copia condivisa di 10 minuti

export async function elenco({ request, env, ctx }) {
  const chiave = new Request(new URL('/api/archivio', request.url).toString(), { method: 'GET' });
  const cache = typeof caches !== 'undefined' ? caches.default : null;
  if (cache) {
    try { const copia = await cache.match(chiave); if (copia) return copia; } catch (e) { console.error('Cache', e); }
  }

  const imp = await impostazioni(env.DB);
  const oggi = oggiRoma();
  const dal = aggiungiGiorni(oggi, -imp.giorniArchivio);
  const { results } = await env.DB
    .prepare(
      `SELECT ${CAMPI} FROM eventi
       WHERE data < ? AND data >= ? AND stato IN ('verificato', 'annullato')
       ORDER BY data DESC, ora_inizio LIMIT 5000`
    )
    .bind(oggi, dal)
    .all();
  const eventi = results.map((e) => {
    let org = [];
    try { org = e.organizzatori ? JSON.parse(e.organizzatori) : []; } catch { org = []; }
    return { ...e, organizzatori: org };
  });

  const risposta = json(
    { ok: true, eventi, giorni_archivio: imp.giorniArchivio, generato_il: new Date().toISOString() },
    200,
    { 'cache-control': `public, max-age=300, s-maxage=${SECONDI_CACHE}` }
  );
  if (cache && ctx) ctx.waitUntil(cache.put(chiave, risposta.clone()).catch((e) => console.error('Cache', e)));
  return risposta;
}
