import { verificabile } from './regole.js';
// Contributi della community su un evento esistente:
// POST /api/mobilitazioni/:id/conferma   → "Confermo" (una volta per dispositivo)
// POST /api/mobilitazioni/:id/modifiche  → proposta di correzione, va in coda ai moderatori
import {
  json, errore, adessoRoma, impostazioni, hashAnonimo, controllaLimite, verificaTurnstile, pulisci,
  contieneDatiPersonali,
} from './lib.js';
import { validaEvento, leggiEvento, apriEvento, differenze, salvaVersione } from './dati.js';
import { pubblicaEvento } from './telegram.js';

const VISIBILI = ['verificato', 'da_verificare', 'annullato'];

async function corpo(request) {
  try { return await request.json(); } catch { return null; }
}

export async function conferma({ request, env, ctx, params }) {
  const b = await corpo(request);
  if (!b) return errore('Richiesta non valida.');
  if (b.sito_web) return json({ ok: true });
  if (!(await verificaTurnstile(b.turnstile, request, env))) {
    return errore('Verifica anti-bot non riuscita. Ricarica la pagina e riprova.', 403);
  }
  const evento = await leggiEvento(env.DB, params.id);
  if (!evento || !VISIBILI.includes(evento.stato)) return errore('Evento non trovato.', 404);

  const imp = await impostazioni(env.DB);
  const hash = await hashAnonimo(request, env);
  const gia = await env.DB.prepare('SELECT 1 FROM conferme WHERE evento_id = ? AND autore_anonimo = ?')
    .bind(evento.id, hash).first();
  if (gia) return json({ ok: true, gia_confermato: true, conferme: evento.conferme });
  if (!(await controllaLimite(env.DB, hash, 'conferma', imp.maxInviiOra * 4))) {
    return errore('Troppe conferme in poco tempo. Riprova tra un’ora.', 429);
  }

  await env.DB.prepare('INSERT INTO conferme (evento_id, autore_anonimo, creato_il) VALUES (?, ?, ?)')
    .bind(evento.id, hash, adessoRoma()).run();
  const conferme = (evento.conferme || 0) + 1;

  // Verifica automatica: abbastanza conferme + una fonte
  if (evento.stato === 'da_verificare' && !verificabile(evento) && conferme >= imp.confermePerVerifica) {
    const nuovo = await salvaVersione(env.DB, evento, { conferme, stato: 'verificato' }, 'verificato_da_conferme', 'sistema');
    ctx.waitUntil(pubblicaEvento(env, nuovo, new URL(request.url).origin));
    return json({ ok: true, conferme, verificato: true });
  }
  await env.DB.prepare('UPDATE eventi SET conferme = ? WHERE id = ?').bind(conferme, evento.id).run();
  return json({ ok: true, conferme });
}

export async function proponiModifica({ request, env, params }) {
  const b = await corpo(request);
  if (!b) return errore('Richiesta non valida.');
  if (b.sito_web) return json({ ok: true });
  if (!(await verificaTurnstile(b.turnstile, request, env))) {
    return errore('Verifica anti-bot non riuscita. Ricarica la pagina e riprova.', 403);
  }
  const evento = await leggiEvento(env.DB, params.id);
  if (!evento || !VISIBILI.includes(evento.stato)) return errore('Evento non trovato.', 404);

  const motivo = pulisci(b.motivo, 300);
  if (motivo.length < 5) return errore('Spiega in poche parole cosa correggi e perché.');
  if (contieneDatiPersonali(motivo)) return errore('Togli email e numeri di telefono dal motivo.');
  const annulla = b.annullato === true;

  // Unisce la proposta ai dati attuali e controlla che il risultato sia valido
  const proposta = b.campi && typeof b.campi === 'object' ? b.campi : {};
  const unione = { ...apriEvento(evento), ...proposta };
  const v = validaEvento(unione, { consentiPassato: true });
  if (v.errore) return errore(v.errore);
  const diff = differenze(evento, v.dati);
  if (!Object.keys(diff).length && !annulla) return errore('Non hai cambiato nulla rispetto ai dati attuali.');

  const imp = await impostazioni(env.DB);
  const hash = await hashAnonimo(request, env);
  const aperte = await env.DB
    .prepare("SELECT COUNT(*) AS n FROM modifiche WHERE evento_id = ? AND autore_anonimo = ? AND stato = 'in_attesa'")
    .bind(evento.id, hash).first();
  if (aperte && aperte.n >= 2) return errore('Hai già proposte in attesa per questo evento: aspetta che un moderatore le controlli.');
  if (!(await controllaLimite(env.DB, hash, 'modifica', imp.maxInviiOra))) {
    return errore('Troppe proposte in poco tempo. Riprova tra un’ora.', 429);
  }

  const campi = {};
  for (const [k, [, dopo]] of Object.entries(diff)) campi[k] = dopo;
  if (annulla) campi.stato = 'annullato';
  await env.DB
    .prepare("INSERT INTO modifiche (evento_id, campi, motivo, fonte, stato, autore_anonimo, creato_il) VALUES (?, ?, ?, ?, 'in_attesa', ?, ?)")
    .bind(evento.id, JSON.stringify(campi), motivo, v.dati.fonte, hash, adessoRoma())
    .run();
  return json({ ok: true }, 201);
}

