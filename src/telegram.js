// Pubblicazione automatica sul canale Telegram.
// Serve il segreto TELEGRAM_BOT_TOKEN e la variabile TELEGRAM_CHAT_ID (es. @MappaDellaRivolta).
// Se mancano, le funzioni non fanno nulla e il sito funziona lo stesso.
import { apriEvento } from './dati.js';
import { sha256hex, adessoRoma } from './lib.js';

const NOMI_TIPI = {
  corteo: '🚩 Corteo', presidio: '✋ Presidio', sciopero_generale: '✊ Sciopero generale',
  sciopero_categoria: '🛠️ Sciopero di categoria', picchetto: '🏭 Picchetto', assemblea: '🗣️ Assemblea',
  altro: '📣 Iniziativa',
};

function h(t) {
  return String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function dataLunga(iso) {
  return new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
    .format(new Date(iso + 'T12:00:00Z'));
}

export function testoEvento(evento, sitoUrl) {
  const e = apriEvento(evento);
  const righe = [
    `<b>${h(NOMI_TIPI[e.tipo] || NOMI_TIPI.altro)}</b>`,
    `<b>${h(e.titolo)}</b>`,
    '',
    `🗓 ${h(dataLunga(e.data))}${e.ora_inizio ? `, ore ${h(e.ora_inizio)}` : ''}${e.ora_fine ? `–${h(e.ora_fine)}` : ''}`,
    `📍 ${e.luogo ? h(e.luogo) + ', ' : ''}${h(e.comune)} (${h(e.provincia)})`,
  ];
  if (e.organizzatori.length) righe.push(`👥 ${h(e.organizzatori.join(', '))}`);
  if (e.fonte) righe.push(`🔗 <a href="${h(e.fonte)}">Fonte</a>`);
  if (sitoUrl) righe.push('', `🗺 <a href="${h(sitoUrl)}/?e=${encodeURIComponent(e.id)}">Vedi sulla mappa</a>`);
  return righe.join('\n');
}

async function chiama(env, metodo, corpo) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return null;
  try {
    const r = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${metodo}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, ...corpo }),
    });
    const d = await r.json();
    if (!d.ok) console.error('Telegram', metodo, d.description);
    return d.ok ? d.result : null;
  } catch (e) {
    console.error('Telegram non raggiungibile', e);
    return null;
  }
}

// Pubblica un evento verificato e salva l'id del messaggio.
// Se fa parte di un evento in più città già pubblicato, non ripubblica: collega lo stesso messaggio.
export async function pubblicaEvento(env, evento, sitoUrl) {
  if (evento.telegram_msg_id) return;
  if (evento.gruppo) {
    const gia = await env.DB.prepare('SELECT telegram_msg_id FROM eventi WHERE gruppo = ? AND telegram_msg_id IS NOT NULL LIMIT 1')
      .bind(evento.gruppo).first();
    if (gia) {
      await env.DB.prepare('UPDATE eventi SET telegram_msg_id = ? WHERE id = ?').bind(gia.telegram_msg_id, evento.id).run();
      return;
    }
  }
  const auto = await env.DB.prepare("SELECT valore FROM impostazioni WHERE chiave = 'telegram_auto'").first();
  if (auto && auto.valore === 'no') return;
  const res = await chiama(env, 'sendMessage', {
    text: testoEvento(evento, sitoUrl), parse_mode: 'HTML', disable_web_page_preview: true,
  });
  if (res && res.message_id) {
    await env.DB.prepare('UPDATE eventi SET telegram_msg_id = ? WHERE id = ?').bind(res.message_id, evento.id).run();
  }
}

// Un solo messaggio per un evento in più città: elenca tutte le città approvate
export async function pubblicaGruppo(env, eventi, sitoUrl) {
  const daPubblicare = eventi.filter((e) => !e.telegram_msg_id);
  if (!daPubblicare.length) return;
  const auto = await env.DB.prepare("SELECT valore FROM impostazioni WHERE chiave = 'telegram_auto'").first();
  if (auto && auto.valore === 'no') return;
  const primo = apriEvento(eventi[0]);
  // Un gruppo può coprire più città e/o più giorni
  const comuni = [...new Set(eventi.map((e) => e.comune))];
  const date = [...new Set(eventi.map((e) => e.data))].sort();
  const ordinati = [...eventi].sort((a, b) => a.data.localeCompare(b.data) || a.comune.localeCompare(b.comune, 'it'));
  const quanto = [comuni.length > 1 ? `in ${comuni.length} città` : '', date.length > 1 ? `per ${date.length} giorni` : ''].filter(Boolean).join(' · ');
  const consecutive = date.every((d, i) => i === 0 || Date.parse(d) - Date.parse(date[i - 1]) === 86400000);
  const quando = date.length === 1 ? dataLunga(date[0])
    : consecutive ? `dal ${dataLunga(date[0])} al ${dataLunga(date[date.length - 1])}`
    : date.map((d) => dataLunga(d)).join(', ');
  const righe = [
    `<b>${h(NOMI_TIPI[primo.tipo] || NOMI_TIPI.altro)}${quanto ? ' · ' + h(quanto) : ''}</b>`,
    `<b>${h(primo.titolo)}</b>`,
    '',
    `🗓 ${h(quando)}`,
  ];
  if (primo.organizzatori.length) righe.push(`👥 ${h(primo.organizzatori.join(', '))}`);
  righe.push('');
  const breve = (d) => d.split('-').reverse().slice(0, 2).join('/');
  for (const e of ordinati.slice(0, 30)) {
    const dove = [e.luogo, e.comune].filter(Boolean).join(', ');
    const ora = e.ora_inizio ? ` – ore ${h(e.ora_inizio)}` : '';
    const giorno = date.length > 1 ? `${breve(e.data)} · ` : '';
    righe.push(sitoUrl ? `📍 ${giorno}<a href="${h(sitoUrl)}/?e=${encodeURIComponent(e.id)}">${h(dove)}</a>${ora}` : `📍 ${giorno}${h(dove)}${ora}`);
  }
  if (ordinati.length > 30) righe.push(`… e altri ${ordinati.length - 30} appuntamenti`);
  if (primo.fonte) righe.push('', `🔗 <a href="${h(primo.fonte)}">Fonte</a>`);
  const res = await chiama(env, 'sendMessage', { text: righe.join('\n'), parse_mode: 'HTML', disable_web_page_preview: true });
  if (res && res.message_id) {
    for (const e of eventi) {
      await env.DB.prepare('UPDATE eventi SET telegram_msg_id = ? WHERE id = ?').bind(res.message_id, e.id).run();
    }
  }
}

// Avvisa che un evento già pubblicato è stato annullato
export async function avvisaAnnullato(env, evento) {
  if (!evento.telegram_msg_id) return;
  await chiama(env, 'sendMessage', {
    text: `❌ <b>ANNULLATO</b>: ${h(evento.titolo)} (${h(evento.comune)}, ${h(dataLunga(evento.data))})`,
    parse_mode: 'HTML', reply_to_message_id: evento.telegram_msg_id, allow_sending_without_reply: true,
  });
}

// Toglie dal canale un evento nascosto o rifiutato (Telegram lo consente entro 48 ore)
export async function rimuoviEvento(env, evento) {
  if (!evento.telegram_msg_id) return;
  // Se lo stesso messaggio riguarda anche altre città ancora valide, non cancellarlo: scollega solo questa
  const altre = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM eventi WHERE telegram_msg_id = ? AND id <> ? AND stato IN ('verificato','annullato')"
  ).bind(evento.telegram_msg_id, evento.id).first();
  if (!altre || !altre.n) await chiama(env, 'deleteMessage', { message_id: evento.telegram_msg_id });
  await env.DB.prepare('UPDATE eventi SET telegram_msg_id = NULL WHERE id = ?').bind(evento.id).run();
}

// Cancella dal canale un messaggio qualsiasi (usato dalla ripubblicazione). Restituisce true se riuscito.
export async function cancellaMessaggio(env, messageId) {
  if (!messageId) return false;
  return !!(await chiama(env, 'deleteMessage', { message_id: messageId }));
}

// ---------- Regole come primo commento sotto ogni post del canale ----------
// Quando il canale ha un gruppo di discussione collegato, Telegram copia ogni post nel gruppo
// ("inoltro automatico"). Il bot riceve quella copia tramite webhook e ci risponde con le regole:
// la risposta diventa il primo commento del post.
// Requisiti: il bot è AMMINISTRATORE anche del gruppo di discussione e il webhook è attivato dal pannello.

const SITO_REGOLE = 'https://mappadellarivolta.org/regole.html';

export const REGOLE_COMMENTO = [
  '📌 <b>Regole di questa chat</b>',
  'Qui si coordina chi partecipa a questo evento: passaggi, punto di ritrovo, cambi d\'orario.',
  '',
  '❌ Niente violenza, danneggiamenti o istruzioni per commettere reati',
  '❌ Niente organizzazione di blocchi: solo avvisi sui disagi già annunciati',
  '❌ Niente nomi, numeri, indirizzi o foto con volti di altre persone',
  '❌ Niente insulti, odio, spam o propaganda contro altre sigle',
  '',
  '👀 La chat è pubblica: gli altri vedono il tuo nome Telegram.',
  '🛡 Chi non rispetta le regole viene rimosso. Per segnalare un messaggio: tienilo premuto → Segnala.',
  '',
  `<a href="${SITO_REGOLE}">Regole complete</a>`,
].join('\n');

// Chiave segreta che Telegram rimanda a ogni chiamata: ricavata dai segreti già presenti, nessun segreto nuovo
async function chiaveWebhook(env) {
  return sha256hex(`webhook|${env.TELEGRAM_BOT_TOKEN}|${env.SALE_SEGRETO || ''}`);
}

async function chiamaBot(env, metodo, corpo) {
  const r = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${metodo}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(corpo),
  });
  return r.json().catch(() => ({ ok: false, description: 'risposta non valida' }));
}

// Attiva (o riattiva) il webhook verso questo sito. Chiamata dal pannello amministratore.
export async function attivaWebhook(env, origine) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return { ok: false, description: 'Bot Telegram non configurato.' };
  return chiamaBot(env, 'setWebhook', {
    url: `${origine}/api/telegram/webhook`,
    secret_token: await chiaveWebhook(env),
    allowed_updates: ['message'],
    drop_pending_updates: true,
  });
}

// Il post arriva dal nostro canale? (TELEGRAM_CHAT_ID può essere "@nome" oppure l'id numerico)
function eNostroCanale(env, chat) {
  if (!chat || chat.type !== 'channel') return false;
  const atteso = String(env.TELEGRAM_CHAT_ID).trim();
  if (atteso.startsWith('@')) return !!chat.username && chat.username.toLowerCase() === atteso.slice(1).toLowerCase();
  return String(chat.id) === atteso;
}

async function rispondiConRegole(env, m) {
  const origine = m.forward_origin || {};
  const canale = origine.chat || m.forward_from_chat || m.sender_chat;
  const idPost = origine.message_id || m.forward_from_message_id;
  if (!eNostroCanale(env, canale) || !idPost) return;

  // Solo i post degli eventi (non i messaggi di prova né gli avvisi di annullamento).
  // Il numero del post viene salvato subito dopo l'invio: se non c'è ancora, si riprova tra poco.
  const cerca = () => env.DB.prepare('SELECT 1 FROM eventi WHERE telegram_msg_id = ? LIMIT 1').bind(idPost).first();
  let evento = await cerca();
  if (!evento) { await new Promise((r) => setTimeout(r, 4000)); evento = await cerca(); }
  if (!evento) return;

  // Telegram può rimandare la stessa notifica: una sola risposta per post
  const chiave = `regole-commento|${m.chat.id}|${m.message_id}`;
  const nuovo = await env.DB.prepare('INSERT OR IGNORE INTO importati (chiave, creato_il) VALUES (?, ?)')
    .bind(chiave, adessoRoma()).run();
  if (!nuovo.meta || !nuovo.meta.changes) return;

  const d = await chiamaBot(env, 'sendMessage', {
    chat_id: m.chat.id, text: REGOLE_COMMENTO, parse_mode: 'HTML',
    reply_to_message_id: m.message_id, disable_web_page_preview: true,
  });
  if (!d.ok) console.error('Telegram regole commento', d.description);
}

// Punto di arrivo delle notifiche di Telegram. Risponde sempre subito 200 a Telegram.
export async function gestisciWebhook(request, env, ctx) {
  const ok = () => new Response('ok');
  if (request.method !== 'POST' || !env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return new Response('', { status: 404 });
  if (request.headers.get('X-Telegram-Bot-Api-Secret-Token') !== (await chiaveWebhook(env))) return new Response('', { status: 403 });
  let u;
  try { u = await request.json(); } catch { return ok(); }
  const m = u && u.message;
  if (m && m.is_automatic_forward && m.chat) ctx.waitUntil(rispondiConRegole(env, m).catch((e) => console.error('Webhook', e)));
  return ok();
}
