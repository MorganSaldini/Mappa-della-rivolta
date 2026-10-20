// Assistente personale del bot Telegram.
// - In chat privata: menu con "Oggi", "Prossimi 7 giorni", "Cerca per città", "Scegli una data", "Per tipo";
//   si può anche scrivere direttamente una città, una provincia, una regione o una data.
// - Nel canale: ogni post evento ha il pulsante "🔎 Cerca mobilitazioni" che apre la chat privata con il bot.
// - Nei commenti (gruppo collegato): chi scrive /cerca o menziona il bot riceve il pulsante per aprire l'assistente.
// Privacy: il bot NON salva chi scrive né cosa cerca. Legge solo gli eventi già pubblici della mappa.
import { oggiRoma, aggiungiGiorni, impostazioni } from './lib.js';

const PER_PAGINA = 8;
const SITO_PREDEFINITO = 'https://mappadellarivolta.org';

const TIPI = {
  corteo: '🚩 Corteo', presidio: '✋ Presidio', sciopero_generale: '✊ Sciopero generale',
  sciopero_categoria: '🛠️ Sciopero di categoria', picchetto: '🏭 Picchetto', assemblea: '🗣️ Assemblea',
  altro: '📣 Altra iniziativa',
};
const EMOJI = { corteo: '🚩', presidio: '✋', sciopero_generale: '✊', sciopero_categoria: '🛠️', picchetto: '🏭', assemblea: '🗣️', altro: '📣' };
const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];

function h(t) {
  return String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
function norm(t) {
  return String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}
function giornoBreve(iso) {
  return new Intl.DateTimeFormat('it-IT', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
    .format(new Date(iso + 'T12:00:00Z'));
}
function giornoLungo(iso) {
  return new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
    .format(new Date(iso + 'T12:00:00Z'));
}
// Taglia una stringa a un numero massimo di byte (i dati dei pulsanti Telegram sono al massimo 64 byte)
function tagliaByte(t, max) {
  let s = String(t);
  while (new TextEncoder().encode(s).length > max) s = s.slice(0, -1);
  return s;
}

async function chiamaBot(env, metodo, corpo) {
  try {
    const r = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${metodo}`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(corpo),
    });
    const d = await r.json();
    if (!d.ok) console.error('Telegram', metodo, d.description);
    return d;
  } catch (e) {
    console.error('Telegram non raggiungibile', metodo);
    return { ok: false, description: 'Telegram non raggiungibile' };
  }
}

// ---------- Nome del bot (serve per i link t.me/NomeBot?start=...) ----------
export async function nomeBot(env) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.DB) return null;
  const r = await env.DB.prepare("SELECT valore FROM impostazioni WHERE chiave = 'telegram_bot_username'").first();
  if (r && r.valore) return r.valore;
  const d = await chiamaBot(env, 'getMe', {});
  if (!d.ok || !d.result || !d.result.username) return null;
  await env.DB.prepare("INSERT INTO impostazioni (chiave, valore) VALUES ('telegram_bot_username', ?) ON CONFLICT(chiave) DO UPDATE SET valore = excluded.valore")
    .bind(d.result.username).run();
  return d.result.username;
}

export function linkAssistente(username, comando = 'menu') {
  return `https://t.me/${username}?start=${comando}`;
}

// Link all'assistente da mettere nel TESTO dei post evento del canale.
// Niente pulsanti sotto i post: Telegram, se un post del canale ha pulsanti, nasconde la barra dei commenti.
export async function rigaCercaPostCanale(env) {
  const u = await nomeBot(env).catch(() => null);
  return u ? `🔎 <a href="${linkAssistente(u)}">Cerca altre mobilitazioni</a>` : '';
}

function nomeCanale(env) {
  const c = String(env.TELEGRAM_CHAT_ID || '').trim();
  return c.startsWith('@') ? c.slice(1) : null;
}

// ---------- Lettura eventi (gli stessi che mostra la mappa) ----------
async function eventiFuturi(env) {
  const imp = await impostazioni(env.DB);
  const stati = imp.pubblicazioneImmediata ? ['verificato', 'da_verificare', 'annullato'] : ['verificato', 'annullato'];
  const { results } = await env.DB.prepare(
    `SELECT id, tipo, titolo, data, ora_inizio, comune, provincia, regione, luogo, stato, telegram_msg_id
     FROM eventi WHERE data >= ? AND stato IN (${stati.map(() => '?').join(',')})
     ORDER BY data, ora_inizio, comune LIMIT 3000`
  ).bind(oggiRoma(), ...stati).all();
  return results;
}

function cercaTesto(eventi, testo) {
  const q = norm(testo);
  if (q.length < 2) return [];
  return eventi.filter((e) => {
    const comune = norm(e.comune);
    if (comune === q || comune.startsWith(q + ' ') || comune.startsWith(q)) return true;
    if (norm(e.provincia) === q) return true;
    if (norm(e.regione).includes(q)) return true;
    return q.length >= 4 && (comune.includes(q) || norm(e.titolo).includes(q) || norm(e.luogo).includes(q));
  });
}

// Capisce una data scritta a mano: "oggi", "domani", "25/10", "25-10-2026", "25 ottobre"
export function leggiData(testo, oggi = oggiRoma()) {
  const t = norm(testo);
  if (t === 'oggi') return oggi;
  if (t === 'domani') return aggiungiGiorni(oggi, 1);
  if (t === 'dopodomani') return aggiungiGiorni(oggi, 2);
  let g, m, a;
  let x = t.match(/^(\d{1,2})[/.\-](\d{1,2})(?:[/.\-](\d{2,4}))?$/);
  if (x) { g = +x[1]; m = +x[2]; a = x[3] ? +x[3] : null; }
  else {
    x = t.match(/^(\d{1,2}) ([a-z]+)(?: (\d{4}))?$/);
    if (!x) return null;
    const i = MESI.findIndex((n) => n.startsWith(x[2].slice(0, 3)) && x[2].length >= 3);
    if (i < 0) return null;
    g = +x[1]; m = i + 1; a = x[3] ? +x[3] : null;
  }
  if (a !== null && a < 100) a += 2000;
  const annoOggi = +oggi.slice(0, 4);
  const crea = (anno) => `${anno}-${String(m).padStart(2, '0')}-${String(g).padStart(2, '0')}`;
  let iso = crea(a ?? annoOggi);
  const d = new Date(iso + 'T12:00:00Z');
  if (Number.isNaN(d.getTime()) || d.getUTCDate() !== g || d.getUTCMonth() + 1 !== m) return null;
  if (a === null && iso < oggi) iso = crea(annoOggi + 1);
  return iso;
}

// ---------- Messaggi ----------
function rigaEvento(e, sito, canale) {
  const ora = e.ora_inizio ? ` · ore ${h(e.ora_inizio)}` : '';
  const stato = e.stato === 'annullato' ? '❌ <b>ANNULLATO</b> · ' : '';
  const verifica = e.stato === 'da_verificare' ? ' · <i>da verificare</i>' : '';
  const post = canale && e.telegram_msg_id ? ` · <a href="https://t.me/${canale}/${e.telegram_msg_id}">💬 post e chat</a>` : '';
  return `${stato}${EMOJI[e.tipo] || '📣'} <b>${h(giornoBreve(e.data))}</b>${ora} · ${h(e.comune)} (${h(e.provincia)})\n` +
    `<a href="${h(sito)}/?e=${encodeURIComponent(e.id)}">${h(e.titolo)}</a>${post}${verifica}`;
}

function tastieraMenu(sito) {
  return {
    inline_keyboard: [
      [{ text: '📍 Oggi', callback_data: 'o|0' }, { text: '📅 Prossimi 7 giorni', callback_data: 's|0' }],
      [{ text: '🏙 Cerca per città', callback_data: 'q' }, { text: '🗓 Scegli una data', callback_data: 'g' }],
      [{ text: '🗂 Per tipo', callback_data: 'k' }],
      [{ text: '🗺 Apri la mappa', url: sito }, { text: '➕ Segnala un evento', url: sito }],
      [{ text: '📜 Regole', url: `${sito}/regole.html` }],
    ],
  };
}

const TESTO_MENU = '🔎 <b>Trova una mobilitazione</b>\n\nScegli qui sotto, oppure scrivimi direttamente:\n' +
  '• una <b>città</b>, una provincia o una regione (es. <i>Bologna</i>, <i>BO</i>, <i>Toscana</i>)\n' +
  '• una <b>data</b> (es. <i>25/10</i>, <i>domani</i>, <i>8 novembre</i>)';

async function invia(env, chatId, testo, tastiera) {
  return chiamaBot(env, 'sendMessage', {
    chat_id: chatId, text: testo, parse_mode: 'HTML', disable_web_page_preview: true,
    ...(tastiera ? { reply_markup: tastiera } : {}),
  });
}

async function inviaMenu(env, chatId, sito) {
  return invia(env, chatId, TESTO_MENU, tastieraMenu(sito));
}

// Mostra una pagina di risultati. "chiave" serve a costruire il pulsante "Altri risultati".
async function inviaRisultati(env, chatId, sito, titolo, elenco, offset, chiave, vuoto) {
  const menu = [{ text: '🏠 Menu', callback_data: 'm' }];
  if (!elenco.length) return invia(env, chatId, `${titolo}\n\n${vuoto}`, { inline_keyboard: [menu] });
  const canale = nomeCanale(env);
  const pagina = elenco.slice(offset, offset + PER_PAGINA);
  const fine = Math.min(offset + PER_PAGINA, elenco.length);
  const testo = `${titolo}\n<i>${offset + 1}–${fine} di ${elenco.length}</i>\n\n` +
    pagina.map((e) => rigaEvento(e, sito, canale)).join('\n\n');
  const riga = [];
  if (fine < elenco.length) riga.push({ text: '▶️ Altri risultati', callback_data: tagliaByte(chiave(fine), 64) });
  riga.push(...menu);
  return invia(env, chatId, testo, { inline_keyboard: [riga] });
}

async function mostraOggi(env, chatId, sito, offset = 0) {
  const oggi = oggiRoma();
  const elenco = (await eventiFuturi(env)).filter((e) => e.data === oggi);
  return inviaRisultati(env, chatId, sito, `📍 <b>Oggi, ${h(giornoLungo(oggi))}</b>`, elenco, offset,
    (o) => `o|${o}`, 'Nessuna mobilitazione in programma oggi sulla mappa.');
}

async function mostraSettimana(env, chatId, sito, offset = 0) {
  const oggi = oggiRoma();
  const limite = aggiungiGiorni(oggi, 6);
  const elenco = (await eventiFuturi(env)).filter((e) => e.data <= limite);
  return inviaRisultati(env, chatId, sito, '📅 <b>Prossimi 7 giorni</b>', elenco, offset,
    (o) => `s|${o}`, 'Nessuna mobilitazione nei prossimi 7 giorni sulla mappa.');
}

async function mostraData(env, chatId, sito, iso, offset = 0) {
  const elenco = (await eventiFuturi(env)).filter((e) => e.data === iso);
  const vuoto = iso < oggiRoma() ? 'Questa data è già passata: la mappa mostra solo le mobilitazioni future.'
    : 'Nessuna mobilitazione in programma in questo giorno sulla mappa.';
  return inviaRisultati(env, chatId, sito, `🗓 <b>${h(giornoLungo(iso))}</b>`, elenco, offset, (o) => `d|${iso}|${o}`, vuoto);
}

async function mostraCitta(env, chatId, sito, testo, offset = 0) {
  const q = tagliaByte(String(testo).trim(), 40);
  const elenco = cercaTesto(await eventiFuturi(env), q);
  return inviaRisultati(env, chatId, sito, `🏙 <b>${h(q)}</b>`, elenco, offset, (o) => `c|${o}|${q}`,
    'Nessuna mobilitazione trovata. Prova con la provincia (es. <i>MI</i>) o la regione (es. <i>Lombardia</i>), oppure guarda la mappa.');
}

async function mostraTipo(env, chatId, sito, tipo, offset = 0) {
  if (!TIPI[tipo]) return inviaMenu(env, chatId, sito);
  const elenco = (await eventiFuturi(env)).filter((e) => e.tipo === tipo);
  return inviaRisultati(env, chatId, sito, `<b>${h(TIPI[tipo])}</b>`, elenco, offset, (o) => `t|${tipo}|${o}`,
    'Nessuna mobilitazione di questo tipo in programma sulla mappa.');
}

async function scegliData(env, chatId) {
  const oggi = oggiRoma();
  const giorni = Array.from({ length: 8 }, (_, i) => aggiungiGiorni(oggi, i));
  const nome = (iso, i) => (i === 0 ? 'Oggi' : i === 1 ? 'Domani' : giornoBreve(iso));
  const righe = [];
  for (let i = 0; i < giorni.length; i += 2) {
    righe.push(giorni.slice(i, i + 2).map((iso, j) => ({ text: nome(iso, i + j), callback_data: `d|${iso}|0` })));
  }
  righe.push([{ text: '🏠 Menu', callback_data: 'm' }]);
  return invia(env, chatId, '🗓 <b>Scegli un giorno</b>\noppure scrivimi una data, ad esempio <i>25/10</i> o <i>8 novembre</i>.', { inline_keyboard: righe });
}

async function scegliTipo(env, chatId) {
  const voci = Object.entries(TIPI).map(([k, v]) => ({ text: v, callback_data: `t|${k}|0` }));
  const righe = [];
  for (let i = 0; i < voci.length; i += 2) righe.push(voci.slice(i, i + 2));
  righe.push([{ text: '🏠 Menu', callback_data: 'm' }]);
  return invia(env, chatId, '🗂 <b>Che tipo di mobilitazione cerchi?</b>', { inline_keyboard: righe });
}

async function chiediCitta(env, chatId) {
  return invia(env, chatId, '🏙 Scrivimi il nome di una <b>città</b>, una <b>provincia</b> o una <b>regione</b>.\nEsempi: <i>Torino</i>, <i>NA</i>, <i>Sicilia</i>.');
}

// ---------- Smistamento ----------
async function comandoPrivato(env, chatId, sito, comando) {
  switch (comando) {
    case 'oggi': return mostraOggi(env, chatId, sito);
    case 'settimana': return mostraSettimana(env, chatId, sito);
    case 'citta': return chiediCitta(env, chatId);
    case 'data': return scegliData(env, chatId);
    case 'tipo': return scegliTipo(env, chatId);
    case 'regole': return invia(env, chatId, `📜 Le regole della mappa e delle chat: ${sito}/regole.html`);
    default: return inviaMenu(env, chatId, sito);
  }
}

async function messaggioPrivato(env, m, sito) {
  const testo = String(m.text || '').trim();
  if (!testo) return inviaMenu(env, m.chat.id, sito);
  const cmd = testo.match(/^\/([a-z_]+)(?:@\w+)?(?:\s+(\S+))?/i);
  if (cmd) {
    const nome = cmd[1].toLowerCase();
    // /start arriva dai pulsanti del canale con un parametro: /start oggi, /start citta…
    return comandoPrivato(env, m.chat.id, sito, nome === 'start' ? (cmd[2] || 'menu').toLowerCase() : nome);
  }
  const iso = leggiData(testo);
  if (iso) return mostraData(env, m.chat.id, sito, iso);
  return mostraCitta(env, m.chat.id, sito, testo.slice(0, 60));
}

// Nei gruppi (commenti) il bot risponde solo se chiamato: /cerca, /menu, /start o menzionandolo
async function messaggioGruppo(env, m) {
  const testo = String(m.text || '');
  const u = await nomeBot(env);
  if (!u) return;
  const cmd = testo.match(/^\/(cerca|menu|start|aiuto)(?:@(\w+))?(?:\s|$)/i);
  const chiamato = !!cmd && (!cmd[2] || cmd[2].toLowerCase() === u.toLowerCase());
  const menzionato = testo.toLowerCase().includes('@' + u.toLowerCase());
  if (!chiamato && !menzionato) return;
  return chiamaBot(env, 'sendMessage', {
    chat_id: m.chat.id, reply_to_message_id: m.message_id, allow_sending_without_reply: true,
    text: '🔎 Per cercare mobilitazioni per città, data o tipo apri l’assistente in privato: risponde solo a te.',
    reply_markup: { inline_keyboard: [[{ text: '🔎 Apri l’assistente', url: linkAssistente(u) }]] },
  });
}

async function pulsantePremuto(env, q, sito) {
  // Risposta immediata a Telegram (toglie l'orologio dal pulsante)
  await chiamaBot(env, 'answerCallbackQuery', { callback_query_id: q.id });
  const chat = q.message && q.message.chat;
  if (!chat || chat.type !== 'private') return;
  const p = String(q.data || '').split('|');
  const n = (v) => Math.max(0, parseInt(v, 10) || 0);
  switch (p[0]) {
    case 'm': return inviaMenu(env, chat.id, sito);
    case 'o': return mostraOggi(env, chat.id, sito, n(p[1]));
    case 's': return mostraSettimana(env, chat.id, sito, n(p[1]));
    case 'd': return /^\d{4}-\d{2}-\d{2}$/.test(p[1] || '') ? mostraData(env, chat.id, sito, p[1], n(p[2])) : inviaMenu(env, chat.id, sito);
    case 'c': return mostraCitta(env, chat.id, sito, p.slice(2).join('|'), n(p[1]));
    case 't': return mostraTipo(env, chat.id, sito, p[1], n(p[2]));
    case 'q': return chiediCitta(env, chat.id);
    case 'g': return scegliData(env, chat.id);
    case 'k': return scegliTipo(env, chat.id);
    default: return inviaMenu(env, chat.id, sito);
  }
}

// Punto d'ingresso dal webhook (gli inoltri automatici del canale sono gestiti in telegram.js)
export async function gestisciAssistente(env, u, sito = SITO_PREDEFINITO) {
  if (u.callback_query) return pulsantePremuto(env, u.callback_query, sito);
  const m = u.message;
  if (!m || !m.chat || m.is_automatic_forward) return;
  if (m.chat.type === 'private') return messaggioPrivato(env, m, sito);
  if (m.chat.type === 'group' || m.chat.type === 'supergroup') return messaggioGruppo(env, m);
}

// ---------- Configurazione dal pannello ----------
// Comandi e descrizioni che Telegram mostra quando si apre la chat con il bot
export async function configuraAssistente(env) {
  const u = await nomeBot(env);
  await chiamaBot(env, 'setMyCommands', {
    scope: { type: 'all_private_chats' },
    commands: [
      { command: 'menu', description: 'Menu di ricerca' },
      { command: 'oggi', description: 'Mobilitazioni di oggi' },
      { command: 'settimana', description: 'Prossimi 7 giorni' },
      { command: 'citta', description: 'Cerca per città, provincia o regione' },
      { command: 'data', description: 'Cerca per data' },
      { command: 'tipo', description: 'Cerca per tipo (corteo, sciopero…)' },
      { command: 'regole', description: 'Regole della mappa e delle chat' },
    ],
  });
  await chiamaBot(env, 'setMyCommands', {
    scope: { type: 'all_group_chats' },
    commands: [{ command: 'cerca', description: 'Apri la ricerca delle mobilitazioni in privato' }],
  });
  await chiamaBot(env, 'setMyDescription', {
    description: 'Trova manifestazioni, presidi, cortei e scioperi in Italia: cerca per città, per data o per tipo. ' +
      'Dati della Mappa della Rivolta. Il bot non salva chi scrive né cosa cerca. Premi AVVIA per aprire il menu.',
  });
  await chiamaBot(env, 'setMyShortDescription', {
    short_description: 'Cerca mobilitazioni in Italia per città, data o tipo. Dati della Mappa della Rivolta.',
  });
  return u;
}

// Post fissato nel canale con i pulsanti che aprono l'assistente
export async function pubblicaPostTrova(env, sito = SITO_PREDEFINITO) {
  const u = await nomeBot(env);
  if (!u) return { ok: false, description: 'Non riesco a leggere il nome del bot.' };
  const testo = '🔎 <b>Trova una mobilitazione</b>\n\nI post del canale sono in ordine di pubblicazione, non di data. ' +
    'Per trovare subito quello che cerchi usa i pulsanti qui sotto: si apre la chat con il bot e i risultati arrivano solo a te.\n\n' +
    `🗺 Tutto sulla mappa: ${sito}`;
  const d = await chiamaBot(env, 'sendMessage', {
    chat_id: env.TELEGRAM_CHAT_ID, text: testo, parse_mode: 'HTML', disable_web_page_preview: true,
    reply_markup: {
      inline_keyboard: [
        [{ text: '📍 Oggi', url: linkAssistente(u, 'oggi') }, { text: '📅 Prossimi 7 giorni', url: linkAssistente(u, 'settimana') }],
        [{ text: '🏙 Cerca per città', url: linkAssistente(u, 'citta') }, { text: '🗓 Per data', url: linkAssistente(u, 'data') }],
        [{ text: '🗂 Per tipo', url: linkAssistente(u, 'tipo') }],
      ],
    },
  });
  if (!d.ok) return d;
  const pin = await chiamaBot(env, 'pinChatMessage', {
    chat_id: env.TELEGRAM_CHAT_ID, message_id: d.result.message_id, disable_notification: true,
  });
  return { ok: true, fissato: !!pin.ok };
}
