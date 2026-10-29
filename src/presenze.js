// "Ci sarò": contatore anonimo di chi pensa di partecipare a un evento.
// Si salva SOLO il totale per evento (tabella presenze: evento_id, n). Non si salva chi ha cliccato,
// né l'indirizzo IP, né un codice per evento. Contro i clic a raffica si usa il limite di invii già
// esistente (codice anonimo che cambia ogni giorno e si cancella dopo 48 ore). Il doppio clic dallo
// stesso telefono lo evita il browser (memoria locale). Il numero è indicativo, non un conteggio ufficiale.
import { json, errore, hashAnonimo, controllaLimite } from './lib.js';
import { leggiEvento } from './dati.js';

let pronta = false;
export async function preparaPresenze(db) {
  if (pronta) return;
  await db.prepare('CREATE TABLE IF NOT EXISTS presenze (evento_id TEXT PRIMARY KEY, n INTEGER NOT NULL DEFAULT 0)').run();
  pronta = true;
}

const VISIBILI = ['verificato', 'da_verificare'];

// POST /api/mobilitazioni/:id/ci-saro   { togli: true } per annullare il proprio "Ci sarò"
export async function ciSaro({ request, env, params }) {
  let b = {};
  try { b = await request.json(); } catch { b = {}; }
  const evento = await leggiEvento(env.DB, params.id);
  if (!evento || !VISIBILI.includes(evento.stato)) return errore('Evento non trovato.', 404);
  const hash = await hashAnonimo(request, env);
  if (!(await controllaLimite(env.DB, hash, 'ci_saro', 40))) return errore('Troppi clic in poco tempo. Riprova più tardi.', 429);
  await preparaPresenze(env.DB);
  if (b.togli === true) {
    await env.DB.prepare('UPDATE presenze SET n = MAX(n - 1, 0) WHERE evento_id = ?').bind(evento.id).run();
  } else {
    await env.DB.prepare('INSERT INTO presenze (evento_id, n) VALUES (?, 1) ON CONFLICT(evento_id) DO UPDATE SET n = n + 1').bind(evento.id).run();
  }
  const r = await env.DB.prepare('SELECT n FROM presenze WHERE evento_id = ?').bind(evento.id).first();
  return json({ ok: true, ci_saro: r ? r.n : 0 });
}
