// Pubblicazione automatica sul canale Telegram.
// Serve il segreto TELEGRAM_BOT_TOKEN e la variabile TELEGRAM_CHAT_ID (es. @MappaDellaRivolta).
// Se mancano, le funzioni non fanno nulla e il sito funziona lo stesso.
import { apriEvento } from './dati.js';
import { sha256hex, adessoRoma, oggiRoma, aggiungiGiorni } from './lib.js';
import { gestisciAssistente, rigaCercaPostCanale, configuraAssistente } from './assistente.js';
import { eAvvisoDisagi } from './regole.js';
import { moderaCommento, idGruppoDiscussione } from './commenti.js';

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

// ---------- Pubblicazione a orari fissi ----------
// I nuovi eventi verificati non escono subito: restano in coda (telegram_msg_id vuoto) e vengono pubblicati
// tutti insieme agli orari scelti nel pannello (predefiniti 8, 16 e 21).
// Escono subito solo gli eventi che non possono aspettare: quelli di oggi, e quelli di domani
// se l'ultima uscita di oggi è già passata.
export const ORE_PREDEFINITE = [8, 16, 21];

export function leggiOre(testo) {
  const ore = String(testo || '').split(/[,\s;]+/).filter(Boolean).map((x) => parseInt(x, 10));
  if (!ore.length || ore.some((n) => !Number.isInteger(n) || n < 0 || n > 23)) return null;
  return [...new Set(ore)].sort((a, b) => a - b).slice(0, 6);
}

export async function orePubblicazione(env) {
  const r = await env.DB.prepare("SELECT valore FROM impostazioni WHERE chiave = 'telegram_ore'").first();
  return (r && leggiOre(r.valore)) || ORE_PREDEFINITE;
}

export function oraRoma() {
  return parseInt(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hourCycle: 'h23', timeZone: 'Europe/Rome' }).format(new Date()), 10);
}

async function eUrgente(env, dataEvento) {
  const oggi = oggiRoma();
  if (dataEvento <= oggi) return true;
  const ore = await orePubblicazione(env);
  return dataEvento === aggiungiGiorni(oggi, 1) && oraRoma() >= ore[ore.length - 1];
}

// Pubblica un evento verificato e salva l'id del messaggio.
// Se fa parte di un evento in più città già pubblicato, non ripubblica: collega lo stesso messaggio.
export async function pubblicaEvento(env, evento, sitoUrl, { forza = false } = {}) {
  if (evento.telegram_msg_id || !evento.fonte) return; // sui canali esterni solo eventi con fonte
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
  // Non urgente: resta in coda per l'uscita giornaliera
  if (!forza && !(await eUrgente(env, evento.data))) return;
  const res = await chiama(env, 'sendMessage', {
    // Il link all'assistente va nel testo: con i pulsanti sotto il post Telegram nasconde i commenti
    text: [testoEvento(evento, sitoUrl), await rigaCercaPostCanale(env)].filter(Boolean).join('\n'),
    parse_mode: 'HTML', disable_web_page_preview: true,
  });
  if (res && res.message_id) {
    await env.DB.prepare('UPDATE eventi SET telegram_msg_id = ? WHERE id = ?').bind(res.message_id, evento.id).run();
  }
}

// Un solo messaggio per un evento in più città: elenca tutte le città approvate
export async function pubblicaGruppo(env, eventi, sitoUrl, { forza = false } = {}) {
  const daPubblicare = eventi.filter((e) => !e.telegram_msg_id && e.fonte);
  if (!daPubblicare.length) return;
  const auto = await env.DB.prepare("SELECT valore FROM impostazioni WHERE chiave = 'telegram_auto'").first();
  if (auto && auto.valore === 'no') return;
  const primaData = eventi.map((e) => e.data).sort()[0];
  if (!forza && !(await eUrgente(env, primaData))) return;
  const res = await chiama(env, 'sendMessage', {
    text: await testoGruppo(env, eventi, sitoUrl), parse_mode: 'HTML', disable_web_page_preview: true,
  });
  if (res && res.message_id) {
    for (const e of eventi) {
      await env.DB.prepare('UPDATE eventi SET telegram_msg_id = ? WHERE id = ?').bind(res.message_id, e.id).run();
    }
  }
}

// Testo del messaggio unico per un evento in più città o più giorni
async function testoGruppo(env, eventi, sitoUrl) {
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
  const cerca = await rigaCercaPostCanale(env);
  if (cerca) righe.push(cerca);
  return righe.join('\n');
}

// Avvisa che un evento già pubblicato è stato annullato
export async function avvisaAnnullato(env, evento) {
  if (!evento.telegram_msg_id) return;
  await chiama(env, 'sendMessage', {
    text: `❌ <b>ANNULLATO</b>: ${h(evento.titolo)} (${h(evento.comune)}, ${h(dataLunga(evento.data))})`,
    parse_mode: 'HTML', reply_to_message_id: evento.telegram_msg_id, allow_sending_without_reply: true,
  });
}

// Come chiama(), ma restituisce anche il motivo dell'errore (serve a capire se il messaggio non c'è più)
async function chiamaDettagli(env, metodo, corpo) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return { ok: false, rete: true };
  try {
    const r = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${metodo}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, ...corpo }),
    });
    const d = await r.json();
    if (!d.ok) console.error('Telegram', metodo, d.description);
    return { ok: !!d.ok, descrizione: String(d.description || '') };
  } catch (e) {
    console.error('Telegram non raggiungibile', e);
    return { ok: false, rete: true };
  }
}

// ---------- Messaggi nel gruppo di discussione collegati a un post del canale ----------
// Chiavi nella tabella "importati": "tg-copia|<post>|<gruppo>|<messaggio>" (copia automatica del post)
// e "tg-regole|<post>|<gruppo>|<messaggio>" (risposta del bot con le regole). Nessuna tabella nuova.
async function ricordaNelGruppo(env, tipo, idPost, idGruppo, idMessaggio) {
  await env.DB.prepare('INSERT OR IGNORE INTO importati (chiave, creato_il) VALUES (?, ?)')
    .bind(`${tipo}|${idPost}|${idGruppo}|${idMessaggio}`, adessoRoma()).run();
}

// Cancella dal gruppo la copia del post e la risposta del bot con le regole.
// Restituisce quanti messaggi ha tolto. Se Telegram non risponde, li lascia segnati per il giro dopo.
async function togliDalGruppo(env, idPost) {
  const id = String(parseInt(idPost, 10));
  if (id === 'NaN') return 0;
  const { results } = await env.DB.prepare(
    'SELECT chiave FROM importati WHERE chiave LIKE ? OR chiave LIKE ?'
  ).bind(`tg-regole|${id}|%`, `tg-copia|${id}|%`).all();
  let tolti = 0;
  for (const { chiave } of results) {
    const [, , gruppo, messaggio] = chiave.split('|');
    const r = await chiamaDettagli(env, 'deleteMessage', { chat_id: gruppo, message_id: parseInt(messaggio, 10) });
    if (r.rete) continue; // riprova al prossimo giro
    if (r.ok) tolti++;
    // Riuscito, già cancellato o troppo vecchio: non riprovare più
    await env.DB.prepare('DELETE FROM importati WHERE chiave = ?').bind(chiave).run();
  }
  return tolti;
}

const TESTO_TOLTO = '🚫 <b>Evento tolto dalla mappa</b>\nNon rispetta le regole di pubblicazione o non è stato confermato da una fonte.';

// Toglie dal canale un evento nascosto o rifiutato.
// - Toglie anche, dal gruppo dei commenti, la copia del post e la risposta del bot con le regole
//   (solo per i post usciti dopo questo aggiornamento: per i precedenti il collegamento non è salvato).
// - Se il messaggio riguarda anche altre città ancora valide: lo riscrive senza questa.
// - Altrimenti lo cancella. Telegram permette di cancellare solo entro 48 ore: dopo, il post viene
//   riscritto con "Evento tolto dalla mappa" (i messaggi del bot si possono modificare sempre).
// - Se Telegram non risponde, il collegamento resta e si riprova al giro successivo (ogni 5 minuti).
// Restituisce: 'riscritto', 'cancellato', 'segnato', 'gia_tolto' o 'riprova'.
export async function rimuoviEvento(env, evento, sitoUrl = 'https://mappadellarivolta.org') {
  if (!evento.telegram_msg_id) return 'gia_tolto';
  const msg = evento.telegram_msg_id;
  const scollega = () => env.DB.prepare('UPDATE eventi SET telegram_msg_id = NULL WHERE id = ?').bind(evento.id).run();
  const { results: altre } = await env.DB.prepare(
    "SELECT * FROM eventi WHERE telegram_msg_id = ? AND id <> ? AND stato IN ('verificato','annullato')"
  ).bind(msg, evento.id).all();
  if (altre.length) {
    const valide = altre.filter((e) => e.stato === 'verificato');
    if (valide.length) {
      const r = await chiamaDettagli(env, 'editMessageText', {
        message_id: msg, text: await testoGruppo(env, valide, sitoUrl), parse_mode: 'HTML', disable_web_page_preview: true,
      });
      if (!r.ok && r.rete) return 'riprova';
    }
    await scollega();
    return 'riscritto';
  }
  // Prima i messaggi nel gruppo dei commenti (copia del post e regole del bot), poi il post del canale
  await togliDalGruppo(env, msg).catch((e) => console.error('Telegram gruppo', e));
  const del = await chiamaDettagli(env, 'deleteMessage', { message_id: msg });
  if (del.ok) { await scollega(); return 'cancellato'; }
  if (del.rete) return 'riprova';
  // Troppo vecchio per essere cancellato (o già cancellato a mano): prova a riscriverlo
  const ed = await chiamaDettagli(env, 'editMessageText', { message_id: msg, text: TESTO_TOLTO, parse_mode: 'HTML' });
  if (!ed.ok && ed.rete) return 'riprova';
  await scollega();
  return ed.ok || /not modified/i.test(ed.descrizione) ? 'segnato' : 'gia_tolto';
}

// Ogni 5 minuti: toglie dal canale tutti gli eventi nascosti o rifiutati che hanno ancora un post,
// qualunque sia il motivo (regole automatiche, sigle escluse, moderatori, amministratore AI).
export async function togliNascostiDalCanale(env, sitoUrl = 'https://mappadellarivolta.org') {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return null;
  const { results } = await env.DB.prepare(
    "SELECT * FROM eventi WHERE stato IN ('nascosto','rifiutato') AND telegram_msg_id IS NOT NULL ORDER BY data LIMIT 40"
  ).all();
  if (!results.length) return null;
  const esito = { riscritto: 0, cancellato: 0, segnato: 0, gia_tolto: 0, riprova: 0 };
  for (const e of results) esito[await rimuoviEvento(env, e, sitoUrl)]++;
  return esito;
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
  '📌 <b>Regole dei commenti</b>',
  'Qui si può parlare dell\'evento e mettersi d\'accordo per andarci (ritrovo, passaggi, orari). Per i dettagli ufficiali fa fede la fonte collegata.',
  '',
  '❌ Niente violenza, danneggiamenti o istruzioni per commettere reati',
  '❌ Niente organizzazione di blocchi o occupazioni',
  '❌ Niente nomi, numeri, email, indirizzi o foto con volti di altre persone (per i passaggi usate i messaggi privati)',
  '❌ Niente insulti, odio, spam o propaganda contro altre sigle',
  '',
  '👀 La chat è pubblica: gli altri vedono il tuo nome Telegram.',
  '🛡 I messaggi che violano le regole vengono rimossi dal bot o dagli amministratori. Per segnalare un messaggio: tienilo premuto → Segnala.',
  '',
  `<a href="${SITO_REGOLE}">Regole complete</a>`,
].join('\n');

// Sotto gli avvisi "Possibili disagi" (blocchi, occupazioni) non si coordina nulla
export const REGOLE_COMMENTO_AVVISO = [
  '📌 <b>Questo è un avviso di possibili disagi</b>',
  'Serve a chi deve spostarsi. Non è un invito a partecipare.',
  '',
  '❌ Qui non si organizzano ritrovi, blocchi o occupazioni: questi messaggi vengono rimossi',
  '❌ Niente nomi, numeri, email o foto con volti di altre persone',
  '',
  'Puoi commentare solo per aggiornare sui disagi (strada riaperta, deviazioni, orari dei mezzi).',
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
  const d = await chiamaBot(env, 'setWebhook', {
    url: `${origine}/api/telegram/webhook`,
    secret_token: await chiaveWebhook(env),
    allowed_updates: ['message', 'edited_message', 'callback_query'],
    drop_pending_updates: true,
  });
  if (!d.ok) return d;
  // Comandi, descrizione e nome del bot per l'assistente personale
  const username = await configuraAssistente(env).catch(() => null);
  await togliPulsantiPost(env).catch((e) => console.error('Togli pulsanti', e));
  return { ok: true, username };
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
  const cerca = () => env.DB.prepare('SELECT titolo, tipo FROM eventi WHERE telegram_msg_id = ? LIMIT 1').bind(idPost).first();
  let evento = await cerca();
  if (!evento) { await new Promise((r) => setTimeout(r, 4000)); evento = await cerca(); }
  if (!evento) return;

  // Ricorda la copia del post nel gruppo: se l'evento viene nascosto, il bot la toglie anche da lì
  await ricordaNelGruppo(env, 'tg-copia', idPost, m.chat.id, m.message_id);

  // Telegram può rimandare la stessa notifica: una sola risposta per post
  const chiave = `regole-commento|${m.chat.id}|${m.message_id}`;
  const nuovo = await env.DB.prepare('INSERT OR IGNORE INTO importati (chiave, creato_il) VALUES (?, ?)')
    .bind(chiave, adessoRoma()).run();
  if (!nuovo.meta || !nuovo.meta.changes) return;

  const d = await chiamaBot(env, 'sendMessage', {
    chat_id: m.chat.id, text: eAvvisoDisagi(evento) ? REGOLE_COMMENTO_AVVISO : REGOLE_COMMENTO, parse_mode: 'HTML',
    reply_to_message_id: m.message_id, disable_web_page_preview: true,
  });
  if (!d.ok) console.error('Telegram regole commento', d.description);
  else if (d.result && d.result.message_id) await ricordaNelGruppo(env, 'tg-regole', idPost, m.chat.id, d.result.message_id);
}

// Punto di arrivo delle notifiche di Telegram. Risponde sempre subito 200 a Telegram.
export async function gestisciWebhook(request, env, ctx) {
  const ok = () => new Response('ok');
  if (request.method !== 'POST' || !env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return new Response('', { status: 404 });
  if (request.headers.get('X-Telegram-Bot-Api-Secret-Token') !== (await chiaveWebhook(env))) return new Response('', { status: 403 });
  let u;
  try { u = await request.json(); } catch { return ok(); }
  if (!u || typeof u !== 'object') return ok();
  const m = u.message;
  if (m && m.is_automatic_forward && m.chat) ctx.waitUntil(rispondiConRegole(env, m).catch((e) => console.error('Webhook', e)));
  else if (u.edited_message) ctx.waitUntil(moderaCommento(env, u.edited_message).catch((e) => console.error('Moderazione', e)));
  else {
    // Prima la moderazione dei commenti; se il messaggio non era nel gruppo di discussione, risponde l'assistente
    const origine = new URL(request.url).origin;
    ctx.waitUntil(
      moderaCommento(env, m)
        .then((delGruppo) => (delGruppo ? null : gestisciAssistente(env, u, origine)))
        .catch((e) => console.error('Webhook', e))
    );
  }
  return ok();
}

// Uscita a orario fisso: pubblica tutti gli eventi verificati ancora in coda, in ordine di data.
// Un post per evento (gli eventi in più città restano un solo post). Chiamata dal cron agli orari scelti.
export async function pubblicaCoda(env, sitoUrl = 'https://mappadellarivolta.org') {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return { pubblicati: 0 };
  const auto = await env.DB.prepare("SELECT valore FROM impostazioni WHERE chiave = 'telegram_auto'").first();
  if (auto && auto.valore === 'no') return { pubblicati: 0 };
  const { results } = await env.DB.prepare(
    "SELECT * FROM eventi WHERE stato = 'verificato' AND fonte IS NOT NULL AND fonte <> '' AND data >= ? AND telegram_msg_id IS NULL ORDER BY data, ora_inizio, comune"
  ).bind(oggiRoma()).all();
  const gruppiVisti = new Set();
  let pubblicati = 0;
  for (const e of results.slice(0, 60)) {
    if (e.gruppo) {
      if (gruppiVisti.has(e.gruppo)) continue;
      gruppiVisti.add(e.gruppo);
      const { results: tutti } = await env.DB.prepare("SELECT * FROM eventi WHERE gruppo = ? AND stato = 'verificato'").bind(e.gruppo).all();
      await pubblicaGruppo(env, tutti, sitoUrl, { forza: true });
    } else {
      await pubblicaEvento(env, e, sitoUrl, { forza: true });
    }
    pubblicati++;
    await new Promise((r) => setTimeout(r, 1200)); // pausa tra un post e l'altro (limiti di Telegram)
  }
  return { pubblicati, in_coda: results.length };
}

// Toglie i pulsanti dai post evento già pubblicati, così torna visibile la barra dei commenti.
// Le chat restano quelle di prima: i post non vengono cancellati né ripubblicati.
export async function togliPulsantiPost(env) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return { sistemati: 0 };
  const { results } = await env.DB.prepare(
    'SELECT DISTINCT telegram_msg_id AS id FROM eventi WHERE telegram_msg_id IS NOT NULL LIMIT 200'
  ).all();
  let sistemati = 0;
  for (const r of results) {
    const d = await chiamaBot(env, 'editMessageReplyMarkup', {
      chat_id: env.TELEGRAM_CHAT_ID, message_id: r.id, reply_markup: { inline_keyboard: [] },
    });
    if (d.ok) sistemati++;
    await new Promise((x) => setTimeout(x, 300));
  }
  return { sistemati, post: results.length };
}

// Eseguita una sola volta in automatico (dal controllo orario), poi mai più
export async function togliPulsantiPostUnaVolta(env) {
  const chiave = 'telegram-togli-pulsanti-v1';
  if (await env.DB.prepare('SELECT 1 FROM importati WHERE chiave = ?').bind(chiave).first()) return null;
  // Segna PRIMA di iniziare: se il giro viene interrotto a metà (tempo scaduto) non riparte a ogni cron
  // (prima ripartiva ogni volta e faceva migliaia di chiamate inutili a Telegram)
  await env.DB.prepare('INSERT OR IGNORE INTO importati (chiave, creato_il) VALUES (?, ?)').bind(chiave, adessoRoma()).run();
  return togliPulsantiPost(env);
}

// Una sola volta: pubblica e fissa in alto nel gruppo di discussione le regole aggiornate dei commenti
export async function regoleGruppoUnaVolta(env) {
  const chiave = 'telegram-regole-gruppo-v2';
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return null;
  if (await env.DB.prepare('SELECT 1 FROM importati WHERE chiave = ?').bind(chiave).first()) return null;
  const gruppo = await idGruppoDiscussione(env);
  if (!gruppo) return { ok: false, description: 'gruppo di discussione non trovato' };
  const d = await chiamaBot(env, 'sendMessage', {
    chat_id: gruppo, text: REGOLE_COMMENTO, parse_mode: 'HTML', disable_web_page_preview: true,
  });
  if (!d.ok) return d;
  await chiamaBot(env, 'pinChatMessage', { chat_id: gruppo, message_id: d.result.message_id, disable_notification: true });
  await env.DB.prepare('INSERT OR IGNORE INTO importati (chiave, creato_il) VALUES (?, ?)').bind(chiave, adessoRoma()).run();
  return { ok: true };
}
