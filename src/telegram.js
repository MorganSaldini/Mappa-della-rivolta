// Pubblicazione automatica sul canale Telegram.
// Serve il segreto TELEGRAM_BOT_TOKEN e la variabile TELEGRAM_CHAT_ID (es. @MappaDellaRivolta).
// Se mancano, le funzioni non fanno nulla e il sito funziona lo stesso.
import { apriEvento } from './dati.js';

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
