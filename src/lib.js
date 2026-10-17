// Funzioni condivise dalle API. Nessun dato personale viene salvato.

export const TIPI = ['corteo', 'presidio', 'sciopero_generale', 'sciopero_categoria', 'picchetto', 'assemblea', 'altro'];

export const REGIONI = [
  'Abruzzo', 'Basilicata', 'Calabria', 'Campania', 'Emilia-Romagna', 'Friuli-Venezia Giulia',
  'Lazio', 'Liguria', 'Lombardia', 'Marche', 'Molise', 'Piemonte', 'Puglia', 'Sardegna',
  'Sicilia', 'Toscana', 'Trentino-Alto Adige', 'Umbria', "Valle d'Aosta", 'Veneto',
];

// Varianti con cui OpenStreetMap a volte restituisce i nomi delle regioni
const ALIAS_REGIONI = {
  'trentino-alto adige/südtirol': 'Trentino-Alto Adige',
  'trentino-alto adige': 'Trentino-Alto Adige',
  "valle d'aosta/vallée d'aoste": "Valle d'Aosta",
  "valle d'aosta / vallée d'aoste": "Valle d'Aosta",
  'friuli venezia giulia': 'Friuli-Venezia Giulia',
  'emilia romagna': 'Emilia-Romagna',
};

export function normalizzaRegione(r) {
  if (typeof r !== 'string') return null;
  const t = r.trim();
  const trovata = REGIONI.find((x) => x.toLowerCase() === t.toLowerCase());
  return trovata || ALIAS_REGIONI[t.toLowerCase()] || null;
}

export function json(dati, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(dati), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...extraHeaders },
  });
}

export function errore(messaggio, status = 400) {
  return json({ ok: false, errore: messaggio }, status);
}

// Data e ora attuali nel fuso italiano
export function oggiRoma() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(new Date());
}
export function adessoRoma() {
  const p = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).format(new Date());
  return p.replace(' ', 'T');
}
export function aggiungiGiorni(dataIso, giorni) {
  const d = new Date(dataIso + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + giorni);
  return d.toISOString().slice(0, 10);
}

export async function impostazioni(db) {
  const { results } = await db.prepare('SELECT chiave, valore FROM impostazioni').all();
  const o = {};
  for (const r of results) o[r.chiave] = r.valore;
  return {
    pubblicazioneImmediata: (o.pubblicazione_immediata || 'si') === 'si',
    confermePerVerifica: parseInt(o.conferme_per_verifica || '3', 10),
    segnalazioniPerNascondere: parseInt(o.segnalazioni_per_nascondere || '3', 10),
    maxInviiOra: parseInt(o.max_invii_ora || '5', 10),
    giorniConservazione: parseInt(o.giorni_conservazione || '30', 10),
    // Tetto per tutto il sito: oltre questo numero di nuovi invii in un'ora si passa da soli alla "coda"
    maxInviiOraTotali: parseInt(o.max_invii_ora_totali || '60', 10),
  };
}

// Hash anonimo del dispositivo: IP + segreto + data. Cambia ogni giorno, l'IP non viene salvato.
export async function hashAnonimo(request, env) {
  const ip = request.headers.get('CF-Connecting-IP') || 'locale';
  const sale = env.SALE_SEGRETO || 'sviluppo-locale';
  const testo = `${ip}|${sale}|${oggiRoma()}`;
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(testo));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

// Limite di invii per ora. Restituisce true se l'invio è consentito.
export async function controllaLimite(db, hash, azione, maxOra) {
  const dueGiorniFa = new Date(Date.now() - 2 * 86400000).toISOString();
  const unOraFa = new Date(Date.now() - 3600000).toISOString();
  await db.prepare('DELETE FROM invii WHERE creato_il < ?').bind(dueGiorniFa).run();
  const r = await db
    .prepare('SELECT COUNT(*) AS n FROM invii WHERE hash = ? AND creato_il > ?')
    .bind(hash, unOraFa)
    .first();
  if (r && r.n >= maxOra) return false;
  await db
    .prepare('INSERT INTO invii (hash, azione, creato_il) VALUES (?, ?, ?)')
    .bind(hash, azione, new Date().toISOString())
    .run();
  return true;
}

// Verifica Cloudflare Turnstile (anti-bot).
// Se il segreto manca, gli invii vengono RIFIUTATI: meglio un modulo fermo che un sito aperto ai bot.
// Solo per le prove sul proprio computer si può saltare mettendo SVILUPPO=1 nel file .dev.vars.
export async function verificaTurnstile(token, request, env) {
  if (!env.TURNSTILE_SECRET) {
    if (env.SVILUPPO === '1') return true;
    console.error('TURNSTILE_SECRET mancante: invio rifiutato');
    return false;
  }
  if (!token || typeof token !== 'string' || token.length > 4096) return false;
  try {
    const form = new FormData();
    form.append('secret', env.TURNSTILE_SECRET);
    form.append('response', token);
    const ip = request.headers.get('CF-Connecting-IP');
    if (ip) form.append('remoteip', ip);
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form });
    const d = await r.json();
    return d.success === true;
  } catch (e) {
    console.error('Turnstile', e);
    return false;
  }
}

// ================= Protezione e tenuta sotto carico =================

// Intestazioni di sicurezza per le risposte delle API (le pagine statiche le prendono da public/_headers)
export const INTESTAZIONI_SICUREZZA = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'strict-transport-security': 'max-age=31536000',
  'x-frame-options': 'DENY',
  'content-security-policy': "default-src 'none'; frame-ancestors 'none'",
};

// Dimensione massima del corpo di una richiesta (un evento con 20 città sta ampiamente sotto)
export const MAX_CORPO = 32 * 1024;

// Copia in memoria dell'elenco pubblico degli eventi, condivisa tra le visite (Cache API di Cloudflare).
// Così mille visite nello stesso minuto fanno UNA sola lettura sul database.
export const SECONDI_CACHE_EVENTI = 60;
export function chiaveCacheEventi(request) {
  return new Request(new URL('/api/mobilitazioni', request.url).toString(), { method: 'GET' });
}
export async function svuotaCacheEventi(request) {
  try {
    if (typeof caches !== 'undefined') await caches.default.delete(chiaveCacheEventi(request));
  } catch (e) {
    console.error('Cache', e);
  }
}

// Blocca dati personali evidenti (email e numeri di telefono) nei testi liberi
const RE_EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const RE_TELEFONO = /(\+?39[\s.-]?)?\b3\d{2}[\s.-]?\d{3}[\s.-]?\d{3,4}\b|\b0\d{1,3}[\s.-]?\d{5,8}\b/;
export function contieneDatiPersonali(testo) {
  if (!testo) return false;
  return RE_EMAIL.test(testo) || RE_TELEFONO.test(testo);
}

export function pulisci(testo, max) {
  if (testo === undefined || testo === null) return '';
  return String(testo).replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

export function slug(t) {
  return String(t)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'luogo';
}

export async function scriviCronologia(db, evento, azione, attore) {
  await db
    .prepare('INSERT INTO cronologia (evento_id, versione, azione, attore, dati, creato_il) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(evento.id, evento.versione, azione, attore, JSON.stringify(evento), adessoRoma())
    .run();
}

// ================= Accesso moderatori =================
const enc = new TextEncoder();

export async function sha256hex(testo) {
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(testo));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function b64url(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlDecode(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(s + '='.repeat((4 - (s.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function chiaveHmac(env) {
  return crypto.subtle.importKey('raw', enc.encode('sessioni|' + env.SALE_SEGRETO), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

// Hash del codice personale di un moderatore (il codice in chiaro non viene mai salvato)
export async function hashCodice(codice, env) {
  return sha256hex('codice|' + env.SALE_SEGRETO + '|' + String(codice).trim().toUpperCase());
}

// Codice leggibile tipo K7QM-2XRP-9VTD-HC4N (senza lettere ambigue)
export function nuovoCodice() {
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const r = crypto.getRandomValues(new Uint8Array(16));
  const c = [...r].map((x) => alfabeto[x % alfabeto.length]).join('');
  return c.match(/.{4}/g).join('-');
}

export function segretiPronti(env) {
  return typeof env.SALE_SEGRETO === 'string' && env.SALE_SEGRETO.length >= 16;
}

const DURATA_SESSIONE = 12 * 3600; // 12 ore

export async function creaCookieSessione(env, dati) {
  const payload = { ...dati, exp: Math.floor(Date.now() / 1000) + DURATA_SESSIONE };
  const p = b64url(enc.encode(JSON.stringify(payload)));
  const firma = new Uint8Array(await crypto.subtle.sign('HMAC', await chiaveHmac(env), enc.encode(p)));
  return `mod=${p}.${b64url(firma)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${DURATA_SESSIONE}`;
}

export const COOKIE_USCITA = 'mod=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0';

// Legge e verifica la sessione. Restituisce { id, nome, ruolo, regioni } oppure null.
export async function leggiSessione(request, env) {
  if (!segretiPronti(env)) return null;
  const cookie = request.headers.get('Cookie') || '';
  const m = cookie.match(/(?:^|;\s*)mod=([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)/);
  if (!m) return null;
  let valido = false;
  try {
    valido = await crypto.subtle.verify('HMAC', await chiaveHmac(env), b64urlDecode(m[2]), enc.encode(m[1]));
  } catch { return null; }
  if (!valido) return null;
  let s;
  try { s = JSON.parse(new TextDecoder().decode(b64urlDecode(m[1]))); } catch { return null; }
  if (!s.exp || s.exp < Date.now() / 1000) return null;
  if (s.id === 0 && s.ruolo === 'admin') return { id: 0, nome: 'Amministratore', ruolo: 'admin', regioni: [] };
  // Moderatore: controlla che sia ancora attivo (una revoca ha effetto subito)
  const st = await env.DB.prepare('SELECT id, nome, ruolo, regioni, attivo FROM staff WHERE id = ?').bind(s.id).first();
  if (!st || !st.attivo) return null;
  let regioni = [];
  try { regioni = st.regioni ? JSON.parse(st.regioni) : []; } catch { regioni = []; }
  return { id: st.id, nome: st.nome, ruolo: st.ruolo, regioni };
}

// Protezione contro richieste da altri siti: l'origine deve essere questo sito
export function stessaOrigine(request) {
  const o = request.headers.get('Origin');
  if (!o) return request.method === 'GET';
  try { return new URL(o).host === new URL(request.url).host; } catch { return false; }
}

export function attoreDi(sessione) {
  return sessione.id === 0 ? 'admin' : `moderatore#${sessione.id}`;
}
