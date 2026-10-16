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

// Verifica Cloudflare Turnstile (anti-bot). Se il segreto non è configurato (prove in locale) si salta.
export async function verificaTurnstile(token, request, env) {
  if (!env.TURNSTILE_SECRET) return true;
  if (!token) return false;
  const form = new FormData();
  form.append('secret', env.TURNSTILE_SECRET);
  form.append('response', token);
  const ip = request.headers.get('CF-Connecting-IP');
  if (ip) form.append('remoteip', ip);
  const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form });
  const d = await r.json();
  return d.success === true;
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
