import { eseguiRegole } from './regole.js';
import { salvaVersione } from './dati.js';
// Punto di ingresso del Worker Cloudflare.
// Le richieste a /api/... vanno alle funzioni qui sotto; tutto il resto (pagina, stile, script)
// viene servito direttamente dalla cartella "public".
import * as eventi from './eventi.js';
import * as problema from './problema.js';
import * as pubblico from './pubblico.js';
import * as mod from './moderazione.js';
import * as calendario from './calendario.js';
import * as archivio from './archivio.js';
import {
  errore, leggiSessione, stessaOrigine, INTESTAZIONI_SICUREZZA, MAX_CORPO, svuotaCacheEventi,
} from './lib.js';
import { importaProposte } from './agente.js';
import { importaDecisioni } from './amministratore.js';
import { gestisciWebhook, pubblicaCoda, orePubblicazione, oraRoma } from './telegram.js';

// Rotte pubbliche. "/api/mobilitazioni" evita i filtri anti-tracciamento che bloccano "/api/event...";
// "/api/eventi" resta valido per compatibilità.
const PUBBLICHE = [
  ['GET', /^\/api\/(?:mobilitazioni|eventi)$/, eventi.onRequestGet],
  ['POST', /^\/api\/(?:mobilitazioni|eventi)$/, eventi.onRequestPost],
  ['POST', /^\/api\/(?:mobilitazioni|eventi)\/([^/]+)\/problema$/, problema.onRequestPost],
  ['POST', /^\/api\/mobilitazioni\/([^/]+)\/conferma$/, pubblico.conferma],
  ['POST', /^\/api\/mobilitazioni\/([^/]+)\/modifiche$/, pubblico.proponiModifica],
  ['GET', /^\/api\/calendario\.ics$/, calendario.feed],
  ['GET', /^\/api\/archivio$/, archivio.elenco],
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
  ['POST', /^\/api\/admin\/telegram-ripubblica$/, mod.ripubblicaTelegram, 'admin'],
  ['POST', /^\/api\/admin\/telegram-webhook$/, mod.attivaRegoleCommenti, 'admin'],
  ['POST', /^\/api\/admin\/telegram-trova$/, mod.pubblicaTrova, 'admin'],
  ['POST', /^\/api\/admin\/pulizia$/, mod.pulizia, 'admin'],
  ['POST', /^\/api\/moderazione\/importa-agente$/, mod.importaAgente, 'moderatore'],
];

const LETTURE_APERTE = /^\/api\/(mobilitazioni|eventi|calendario\.ics)\/?$/;

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

// Aggiunge le intestazioni di sicurezza a ogni risposta delle API
function conSicurezza(risposta) {
  const r = new Response(risposta.body, risposta);
  for (const [k, v] of Object.entries(INTESTAZIONI_SICUREZZA)) if (!r.headers.has(k)) r.headers.set(k, v);
  return r;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api')) return env.ASSETS.fetch(request);
    // Notifiche del bot Telegram: non arrivano da un browser, hanno un controllo proprio (chiave segreta)
    if (url.pathname === '/api/telegram/webhook') {
      try { return await gestisciWebhook(request, env, ctx); } catch (e) { console.error('Webhook', e); return new Response('ok'); }
    }
    const r = await gestisci(request, env, ctx, url);
    // Dopo una modifica andata a buon fine la copia dell'elenco eventi va rifatta
    if (request.method !== 'GET' && r.ok) ctx.waitUntil(svuotaCacheEventi(request));
    const sicura = conSicurezza(r);
    // Letture pubbliche leggibili anche dalle copie della mappa su altri siti (specchi, file offline).
    // Solo GET e senza cookie: le scritture restano bloccate dal controllo Origin.
    if (request.method === 'GET' && LETTURE_APERTE.test(url.pathname)) {
      sicura.headers.set('access-control-allow-origin', '*');
      sicura.headers.set('vary', 'Origin');
    }
    return sicura;
  },

  // Ogni ora: pulizia degli eventi vecchi, proposte dell'agente e decisioni dell'amministratore AI
  async scheduled(event, env, ctx) {
    ctx.waitUntil(mod.eseguiPulizia(env).catch((e) => console.error('Pulizia', e)));
    // Regole sui contenuti: mette in regola le voci di oggi e future (ogni modifica va in cronologia)
    // Prima le regole, poi le proposte dell'agente di ricerca, poi le decisioni dell'amministratore AI (in fila,
    // così una decisione non trova l'evento appena cambiato dalle regole)
    ctx.waitUntil(
      eseguiRegole(env, salvaVersione).then((r) => console.log('Regole', JSON.stringify(r))).catch((e) => console.error('Regole', e))
        .then(() => importaProposte(env)).then((r) => console.log('Agente', JSON.stringify(r))).catch((e) => console.error('Agente', e))
        .then(() => importaDecisioni(env)).then((r) => console.log('Amministratore AI', JSON.stringify(r)))
        .catch((e) => console.error('Amministratore AI', e))
        // Uscite su Telegram: agli orari scelti (predefiniti 8, 16, 21) pubblica gli eventi verificati in coda
        .then(async () => {
          if (!(await orePubblicazione(env)).includes(oraRoma())) return;
          const r = await pubblicaCoda(env);
          console.log('Telegram uscita', JSON.stringify(r));
        })
        .catch((e) => console.error('Telegram uscita', e))
    );
  },
};

async function gestisci(request, env, ctx, url) {
    const percorso = url.pathname.replace(/\/+$/, '');

    try {
      if (!env.DB) return errore('Database non collegato: controlla database_id e binding "DB" in wrangler.toml.', 500);

      // Nessuna richiesta di scrittura da altri siti
      if (request.method !== 'GET' && !stessaOrigine(request)) return errore('Richiesta non consentita.', 403);

      // Corpo troppo grande: rifiutato prima di leggerlo
      const lunghezza = parseInt(request.headers.get('content-length') || '0', 10);
      if (lunghezza > MAX_CORPO) return errore('Richiesta troppo grande.', 413);

      const params = {};
      let t = trova(PUBBLICHE, request.method, percorso);
      if (t && t.rotta) {
        // Interruttore di emergenza: con SOLO_LETTURA=1 la mappa resta visibile ma i visitatori non possono inviare.
        // L'accesso dei moderatori resta attivo.
        if (env.SOLO_LETTURA === '1' && request.method === 'POST' && !percorso.startsWith('/api/moderazione')) {
          return errore('Gli invii sono sospesi per qualche ora per manutenzione. La mappa resta consultabile.', 503);
        }
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
}
