// Moderazione automatica dei commenti nel gruppo di discussione del canale Telegram.
//
// Nei commenti si può parlare delle iniziative lecite e mettersi d'accordo per andarci
// (ritrovo, passaggi, orari). Il bot cancella da solo solo i casi chiari:
//  - inviti a bloccare, occupare, danneggiare o scontrarsi (stesse regole della mappa);
//  - numeri di telefono ed email (per i passaggi si usano i messaggi privati di Telegram).
// Tutto il resto (insulti, casi dubbi) lo decidono gli amministratori umani del gruppo.
// Non si salva nulla di chi scrive: né nome, né testo. Agli amministratori arriva solo il motivo.
//
// Facoltativo: TELEGRAM_ADMIN_CHAT_ID = id del gruppo privato degli amministratori, dove il bot
// avvisa delle rimozioni e dei casi dubbi.

import { RE_INVITO } from './regole.js';

const RE_TELEFONO = /(?:\+|00)39[\s.\-]?\d{2,4}[\s.\-]?\d{3,4}[\s.\-]?\d{3,4}|\b3\d{2}[\s.\-]?\d{3}[\s.\-]?\d{3,4}\b|\b0\d{1,3}[\s.\-]?\d{6,8}\b/;
const RE_EMAIL = /[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}/i;
// Casi dubbi: si parla di blocchi/occupazioni e insieme di ritrovo. Non si cancella: si avvisano gli umani.
const RE_BLOCCO_OCC = /\b(blocc\w*|occup\w*|okkup\w*)/i;
const RE_RITROVO = /\b(ritrovo|ci\s+(?:vediamo|troviamo|ritroviamo)|appuntamento|raduno)\b/i;

let gruppoCollegato = null; // id del gruppo di discussione, letto una volta da Telegram

async function chiamaBot(env, metodo, corpo) {
  const r = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${metodo}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(corpo),
  });
  return r.json().catch(() => ({ ok: false, description: 'risposta non valida' }));
}

export async function idGruppoDiscussione(env) {
  if (gruppoCollegato) return gruppoCollegato;
  const d = await chiamaBot(env, 'getChat', { chat_id: env.TELEGRAM_CHAT_ID });
  if (d.ok && d.result && d.result.linked_chat_id) gruppoCollegato = d.result.linked_chat_id;
  return gruppoCollegato;
}

// Restituisce { cancella: motivo } oppure { dubbio: motivo } oppure null
export function valutaCommento(testo) {
  const t = String(testo || '');
  if (!t.trim()) return null;
  if (RE_INVITO.test(t)) return { cancella: 'invito a bloccare, occupare, danneggiare o scontrarsi' };
  if (RE_TELEFONO.test(t) || RE_EMAIL.test(t)) return { cancella: 'numero di telefono o email (per i passaggi usate i messaggi privati di Telegram)' };
  if (RE_BLOCCO_OCC.test(t) && RE_RITROVO.test(t)) return { dubbio: 'possibile coordinamento di un blocco o di un\'occupazione' };
  return null;
}

async function avvisaAdmin(env, testo) {
  if (!env.TELEGRAM_ADMIN_CHAT_ID) return;
  await chiamaBot(env, 'sendMessage', { chat_id: env.TELEGRAM_ADMIN_CHAT_ID, text: testo, disable_web_page_preview: true });
}

// m = messaggio (nuovo o modificato). Restituisce true se il messaggio era del gruppo di discussione.
export async function moderaCommento(env, m) {
  if (!m || !m.chat || m.is_automatic_forward) return false;
  if (m.chat.type !== 'supergroup' && m.chat.type !== 'group') return false;
  const gruppo = await idGruppoDiscussione(env);
  if (!gruppo || String(m.chat.id) !== String(gruppo)) return false;
  // I messaggi del canale stesso o di un amministratore anonimo non si toccano
  if (m.sender_chat && (m.sender_chat.type === 'channel' || String(m.sender_chat.id) === String(gruppo))) return true;
  if (m.from && m.from.is_bot) return true;

  const esito = valutaCommento([m.text, m.caption].filter(Boolean).join('\n'));
  if (!esito) return true;
  const link = m.chat.username ? `https://t.me/${m.chat.username}/${m.message_id}` : '';

  if (esito.dubbio) {
    await avvisaAdmin(env, `👀 Da controllare: ${esito.dubbio}.${link ? '\n' + link : ''}`);
    console.log('Commento dubbio', esito.dubbio);
    return true;
  }

  const d = await chiamaBot(env, 'deleteMessage', { chat_id: m.chat.id, message_id: m.message_id });
  if (!d.ok) {
    console.error('Commento non cancellato', d.description);
    await avvisaAdmin(env, `⚠️ Non riesco a cancellare un commento (${esito.cancella}). Il bot ha il permesso "Elimina messaggi"?${link ? '\n' + link : ''}`);
    return true;
  }
  // Avviso breve nella discussione, senza nominare nessuno
  const radice = m.reply_to_message && m.reply_to_message.message_id;
  await chiamaBot(env, 'sendMessage', {
    chat_id: m.chat.id,
    text: `🛡 Un commento è stato rimosso: ${esito.cancella}. Regole: https://mappadellarivolta.org/regole.html#regole-chat`,
    disable_web_page_preview: true,
    ...(radice ? { reply_parameters: { message_id: radice, allow_sending_without_reply: true } } : {}),
  });
  await avvisaAdmin(env, `🛡 Commento rimosso in automatico: ${esito.cancella}.`);
  console.log('Commento rimosso', esito.cancella);
  return true;
}
