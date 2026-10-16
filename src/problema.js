// POST /api/eventi/:id/problema → un visitatore segnala un problema su un evento.
// Dopo N segnalazioni (impostazione) l'evento viene nascosto in attesa di un moderatore.
import {
  json, errore, adessoRoma, impostazioni, hashAnonimo, controllaLimite, verificaTurnstile,
  contieneDatiPersonali, pulisci, scriviCronologia,
} from './lib.js';
import { rimuoviEvento } from './telegram.js';

const MOTIVI = ['sbagliato', 'annullato', 'doppione', 'inappropriato', 'altro'];

export async function onRequestPost({ request, env, ctx, params }) {
  let b;
  try {
    b = await request.json();
  } catch {
    return errore('Richiesta non valida.');
  }
  if (b.sito_web) return json({ ok: true });

  if (!(await verificaTurnstile(b.turnstile, request, env))) {
    return errore('Verifica anti-bot non riuscita. Ricarica la pagina e riprova.', 403);
  }

  const evento = await env.DB.prepare('SELECT * FROM eventi WHERE id = ?').bind(params.id).first();
  if (!evento || ['nascosto', 'rifiutato'].includes(evento.stato)) return errore('Evento non trovato.', 404);

  const motivo = String(b.motivo || '');
  if (!MOTIVI.includes(motivo)) return errore('Scegli il motivo della segnalazione.');
  const nota = pulisci(b.nota, 300);
  if (contieneDatiPersonali(nota)) return errore('Togli email e numeri di telefono dalla nota.');

  const imp = await impostazioni(env.DB);
  const hash = await hashAnonimo(request, env);

  // Un dispositivo può segnalare lo stesso evento una sola volta al giorno
  const gia = await env.DB
    .prepare("SELECT 1 FROM problemi WHERE evento_id = ? AND autore_anonimo = ? AND stato = 'aperta'")
    .bind(evento.id, hash)
    .first();
  if (gia) return json({ ok: true, gia_segnalato: true });

  if (!(await controllaLimite(env.DB, hash, 'problema', imp.maxInviiOra * 2))) {
    return errore('Troppe segnalazioni in poco tempo. Riprova tra un’ora.', 429);
  }

  const adesso = adessoRoma();
  await env.DB
    .prepare('INSERT INTO problemi (evento_id, motivo, nota, stato, autore_anonimo, creato_il) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(evento.id, motivo, nota, 'aperta', hash, adesso)
    .run();

  const aperte = (evento.segnalazioni_aperte || 0) + 1;
  const nascondi = aperte >= imp.segnalazioniPerNascondere && evento.stato !== 'nascosto';
  const nuovaVersione = nascondi ? evento.versione + 1 : evento.versione;
  await env.DB
    .prepare('UPDATE eventi SET segnalazioni_aperte = ?, stato = ?, versione = ?, aggiornato_il = ? WHERE id = ?')
    .bind(aperte, nascondi ? 'nascosto' : evento.stato, nuovaVersione, nascondi ? adesso : evento.aggiornato_il, evento.id)
    .run();

  if (nascondi) {
    await scriviCronologia(
      env.DB,
      { ...evento, segnalazioni_aperte: aperte, stato: 'nascosto', versione: nuovaVersione, aggiornato_il: adesso },
      'nascosto_automatico',
      'sistema'
    );
    if (evento.telegram_msg_id && ctx) ctx.waitUntil(rimuoviEvento(env, evento));
  }
  return json({ ok: true, nascosto: nascondi });
}
