// Punto di ingresso del Worker Cloudflare.
// Le richieste a /api/... vanno alle funzioni qui sotto; tutto il resto (pagina, stile, script)
// viene servito direttamente dalla cartella "public".
import * as eventi from './eventi.js';
import * as problema from './problema.js';
import { errore } from './lib.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const percorso = url.pathname.replace(/\/+$/, '');

    try {
      if (percorso === '/api/eventi') {
        if (request.method === 'GET') return await eventi.onRequestGet({ request, env, ctx });
        if (request.method === 'POST') return await eventi.onRequestPost({ request, env, ctx });
        return errore('Metodo non consentito.', 405);
      }

      const m = percorso.match(/^\/api\/eventi\/([^/]+)\/problema$/);
      if (m) {
        if (request.method !== 'POST') return errore('Metodo non consentito.', 405);
        return await problema.onRequestPost({ request, env, ctx, params: { id: decodeURIComponent(m[1]) } });
      }

      if (percorso.startsWith('/api')) return errore('Indirizzo non trovato.', 404);
    } catch (e) {
      console.error(e);
      return errore('Errore interno. Riprova tra poco.', 500);
    }

    return env.ASSETS.fetch(request);
  },
};
