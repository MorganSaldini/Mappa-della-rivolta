// Punto di ingresso del Worker Cloudflare.
// Le richieste a /api/... vanno alle funzioni qui sotto; tutto il resto (pagina, stile, script)
// viene servito direttamente dalla cartella "public".
import * as eventi from './eventi.js';
import * as problema from './problema.js';
import * as pubblico from './pubblico.js';
import * as mod from './moderazione.js';
import * as calendario from './calendario.js';
import { errore, leggiSessione, stessaOrigine } from './lib.js';
import { importaProposte } from './agente.js';

// Rotte pubbliche. "/api/mobilitazioni" evita i filtri anti-tracciamento che bloccano "/api/event...";
// "/api/eventi" resta valido per compatibilità.
const PUBBLICHE = [
  ['GET', /^\/api\/(?:mobilitazioni|eventi)$/, eventi.onRequestGet],
  ['POST', /^\/api\/(?:mobilitazioni|eventi)$/, eventi.onRequestPost],
  ['POST', /^\/api\/(?:mobilitazioni|eventi)\/([^/]+)\/problema$/, problema.onRequestPost],
  ['POST', /^\/api\/mobilitazioni\/([^/]+)\/conferma$/, pubblico.conferma],
  ['POST', /^\/api\/mobilitazioni\/([^/]+)\/modifiche$/, pubblico.proponiModifica],
  ['GET', /^\/api\/calendario\.ics$/, calendario.feed],
  ['POST', /^\/api\/moderazione\/accesso$/, mod.accesso],
  ['POST', /^\/api\/moderazione\/esci$/, mod.esci],
  ['GET', /^\/api\/moderazione\/io$/, mod.io],
];

// Rotte riservate: [metodo, percorso, funzione, ruolo minimo]
const RISERVATE = [
  ['GET', /^\/api\/moderazione\/coda$/, mod.coda, 'moderatore'],
  ['GET', /^\/api\/moderazione\/eventi$/, mod.elencoEventi, 'moderatore'],
  ['GET', /^\/api\/moderazione\/eventi\/([^/]+)\/cronologia$/, mod.cronologia, 'moderatore'],
  ['POST', /^\/api\/moderazione\/eventi\/([^/]+)$/, mod.azioneEvento, 'moderatore'],
  ['POST', /^\/api\/moderazione\/modifiche\/(\d+)$/, mod.azioneModifica, 'moderatore'],
  ['GET', /^\/api\/admin\/staff$/, mod.elencoStaff, 'admin'],
  ['POST', /^\/api\/admin\/staff$/, mod.azioneStaff, 'admin'],
  ['GET', /^\/api\/admin\/impostazioni$/, mod.leggiImpostazioni, 'admin'],
  ['POST', /^\/api\/admin\/impostazioni$/, mod.salvaImpostazioni, 'admin'],
  ['POST', /^\/api\/admin\/telegram-prova$/, mod.provaTelegram, 'admin'],
  ['POST', /^\/api\/admin\/pulizia$/, mod.pulizia, 'admin'],
  ['POST', /^\/api\/moderazione\/importa-agente$/, mod.importaAgente, 'moderatore'],
];

function trova(elenco, metodo, percorso) {
  let percorsoTrovato = false;
  for (const r of elenco) {
    const m = percorso.match(r[1]);
    if (!m) continue;
    percorsoTrovato = true;
    if (r[0] === metodo) return { rotta: r, id: m[1] ? decodeURIComponent(m[1]) : undefined };
  }
  return percorsoTrovato ? { metodoSbagliato: true } : null;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const percorso = url.pathname.replace(/\/+$/, '');
    if (!percorso.startsWith('/api')) return env.ASSETS.fetch(request);

    try {
      if (!env.DB) return errore('Database non collegato: controlla database_id e binding "DB" in wrangler.toml.', 500);

      // Nessuna richiesta di scrittura da altri siti
      if (request.method !== 'GET' && !stessaOrigine(request)) return errore('Richiesta non consentita.', 403);

      const params = {};
      let t = trova(PUBBLICHE, request.method, percorso);
      if (t && t.rotta) {
        params.id = t.id;
        return await t.rotta[2]({ request, env, ctx, params });
      }
      const pubblicaMetodoSbagliato = t && t.metodoSbagliato;

      t = trova(RISERVATE, request.method, percorso);
      if (t && t.rotta) {
        const sessione = await leggiSessione(request, env);
        if (!sessione) return errore('Accesso riservato ai moderatori.', 401);
        if (t.rotta[3] === 'admin' && sessione.ruolo !== 'admin') return errore('Riservato all’amministratore.', 403);
        params.id = t.id;
        const r = await t.rotta[2]({ request, env, ctx, params, sessione });
        r.headers.set('cache-control', 'no-store');
        return r;
      }
      if (pubblicaMetodoSbagliato || (t && t.metodoSbagliato)) return errore('Metodo non consentito.', 405);
      return errore('Indirizzo non trovato.', 404);
    } catch (e) {
      console.error(e);
      const msg = String((e && e.message) || e);
      if (/no such table/i.test(msg)) {
        return errore('Tabelle mancanti nel database: esegui lo script SQL di aggiornamento nella Console D1.', 500);
      }
      if (/no such column/i.test(msg)) {
        return errore('Il database va aggiornato: esegui gli script SQL di aggiornamento nella Console D1.', 500);
      }
      return errore('Errore interno. Riprova tra poco.', 500);
    }
  },

  // Pulizia automatica ogni notte (eventi finiti da più giorni del limite dichiarato)
  async scheduled(event, env, ctx) {
    ctx.waitUntil(mod.eseguiPulizia(env).catch((e) => console.error('Pulizia', e)));
    ctx.waitUntil(importaProposte(env).then((r) => console.log('Agente', JSON.stringify(r))).catch((e) => console.error('Agente', e)));
  },
};
