// Pubblica gli eventi verificati della mappa sulla rete Nostr, firmati con la chiave del progetto.
//
// Uso (lo lancia la GitHub Action "Specchi della mappa"):
//   NOSTR_CHIAVE_PRIVATA=nsec1…  node strumenti/specchi/nostr.mjs public/dati/eventi.json [eventi-precedenti.json]
//
// - Ogni evento con stato "verificato" o "annullato" diventa un evento di calendario Nostr (NIP-52):
//   kind 31923 se ha l'orario, kind 31922 se ha solo la data. È "sostituibile": ripubblicarlo aggiorna quello vecchio.
// - Gli eventi spariti dalla mappa prima della loro data (rifiutati, nascosti) ricevono una richiesta di cancellazione (kind 5).
// - Ogni evento ha una scadenza (NIP-40) a 30 giorni dalla sua data, come dichiarato nella nota privacy.
// - Nessun dato personale: si pubblicano solo i campi già pubblici sulla mappa.
import fs from 'node:fs';
import WebSocket from 'ws';
import { finalizeEvent, getPublicKey, nip19, verifyEvent } from 'nostr-tools';

const PRINCIPALE = 'https://mappadellarivolta.org';
const ETICHETTA = 'mappadellarivolta';
const GIORNI_CONSERVAZIONE = 30;
const PROVA = process.env.PROVA === '1'; // non invia nulla, stampa soltanto

const NOMI_TIPI = {
  corteo: 'Corteo', presidio: 'Presidio', sciopero_generale: 'Sciopero generale',
  sciopero_categoria: 'Sciopero di categoria', picchetto: 'Picchetto', assemblea: 'Assemblea', altro: 'Altra iniziativa',
};

function chiavePrivata() {
  const k = String(process.env.NOSTR_CHIAVE_PRIVATA || '').trim();
  if (!k) return null;
  if (k.startsWith('nsec1')) { const d = nip19.decode(k); if (d.type === 'nsec') return d.data; }
  if (/^[0-9a-f]{64}$/i.test(k)) return Uint8Array.from(Buffer.from(k, 'hex'));
  throw new Error('NOSTR_CHIAVE_PRIVATA non valida (serve nsec1… o 64 caratteri esadecimali)');
}

function relayDaConfig() {
  if (process.env.NOSTR_RELAY) return process.env.NOSTR_RELAY.split(/[\s,]+/).filter(Boolean);
  const cfg = fs.readFileSync(new URL('../../public/config.js', import.meta.url), 'utf8');
  const m = cfg.match(/nostrRelay:\s*\[([^\]]*)\]/);
  return m ? [...m[1].matchAll(/'(wss:\/\/[^']+)'/g)].map((x) => x[1]) : [];
}

// Ora locale di Roma → secondi Unix
function secondiRoma(data, ora) {
  const [a, mo, g] = data.split('-').map(Number);
  const [h, mi] = (ora || '00:00').split(':').map(Number);
  const comeUtc = Date.UTC(a, mo - 1, g, h, mi);
  const parti = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Rome', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    .formatToParts(new Date(comeUtc)).reduce((o, p) => ((o[p.type] = p.value), o), {});
  const visto = Date.UTC(+parti.year, +parti.month - 1, +parti.day, +parti.hour, +parti.minute);
  return Math.round((comeUtc - (visto - comeUtc)) / 1000);
}
function secondiDaIsoRoma(iso) {
  if (!iso) return Math.floor(Date.now() / 1000);
  if (/[zZ]|[+-]\d\d:\d\d$/.test(iso)) return Math.floor(Date.parse(iso) / 1000);
  const [d, t] = iso.split('T');
  return secondiRoma(d, (t || '00:00').slice(0, 5)) + Number((t || '').slice(6, 8) || 0);
}

const B32 = '0123456789bcdefghjkmnpqrstuvwxyz';
function geohash(lat, lng, prec = 7) {
  let la = [-90, 90], lo = [-180, 180], bit = 0, ch = 0, pari = true, out = '';
  while (out.length < prec) {
    const r = pari ? lo : la, v = pari ? lng : lat, mid = (r[0] + r[1]) / 2;
    if (v >= mid) { ch = (ch << 1) | 1; r[0] = mid; } else { ch <<= 1; r[1] = mid; }
    pari = !pari;
    if (++bit === 5) { out += B32[ch]; bit = 0; ch = 0; }
  }
  return out;
}

const pubblicabile = (e) => e && (e.stato === 'verificato' || e.stato === 'annullato');
const kindDi = (e) => (e.ora_inizio ? 31923 : 31922);
const luogoTesto = (e) => [e.luogo, `${e.comune} (${e.provincia})`].filter(Boolean).join(', ');

export function costruisciEvento(e, sk) {
  const kind = kindDi(e);
  const tipo = NOMI_TIPI[e.tipo] || 'Iniziativa';
  const titolo = (e.stato === 'annullato' ? 'ANNULLATO – ' : '') + e.titolo;
  const scadenza = secondiRoma(e.data, '23:59') + GIORNI_CONSERVAZIONE * 86400;
  const compatto = {
    id: e.id, tipo: e.tipo, titolo: e.titolo, data: e.data, ora_inizio: e.ora_inizio || null, ora_fine: e.ora_fine || null,
    comune: e.comune, provincia: e.provincia, regione: e.regione, luogo: e.luogo || '', lat: e.lat, lng: e.lng,
    posizione_approssimativa: e.posizione_approssimativa ? 1 : 0, organizzatori: e.organizzatori || [], fonte: e.fonte || null,
    stato: e.stato, conferme: e.conferme || 0, aggiornato_il: e.aggiornato_il || null, gruppo: e.gruppo || null,
  };
  const righe = [
    `${tipo} · ${e.data}${e.ora_inizio ? ' ore ' + e.ora_inizio : ''}${e.ora_fine ? '–' + e.ora_fine : ''}`,
    luogoTesto(e),
    (e.organizzatori || []).length ? 'Promotori: ' + e.organizzatori.join(', ') : '',
    e.fonte ? 'Fonte: ' + e.fonte : '',
    'Sulla mappa: ' + PRINCIPALE + '/?e=' + encodeURIComponent(e.id),
  ].filter(Boolean);
  const tags = [
    ['d', e.id],
    ['title', titolo],
    kind === 31923 ? ['start', String(secondiRoma(e.data, e.ora_inizio))] : ['start', e.data],
    ['location', luogoTesto(e)],
    ['g', geohash(e.lat, e.lng)],
    ['t', e.tipo],
    ['t', 'mobilitazioni'],
    ['L', ETICHETTA],
    ['l', e.tipo, ETICHETTA],
    ['r', PRINCIPALE + '/?e=' + encodeURIComponent(e.id)],
    ['expiration', String(scadenza)],
    ['mappa', JSON.stringify(compatto)],
  ];
  if (kind === 31923) {
    tags.push(['start_tzid', 'Europe/Rome']);
    if (e.ora_fine) tags.push(['end', String(secondiRoma(e.data, e.ora_fine))]);
  }
  if (e.fonte && /^https?:\/\//.test(e.fonte)) tags.push(['r', e.fonte]);
  return finalizeEvent({ kind, created_at: secondiDaIsoRoma(e.aggiornato_il), tags, content: righe.join('\n') }, sk);
}

export function costruisciCancellazioni(prima, dopo, sk, oggi) {
  const pk = getPublicKey(sk);
  const restano = new Set(dopo.filter(pubblicabile).map((e) => e.id));
  const via = prima.filter((e) => pubblicabile(e) && e.data >= oggi && !restano.has(e.id));
  return via.map((e) => finalizeEvent({
    kind: 5,
    created_at: Math.floor(Date.now() / 1000),
    tags: [['a', `${kindDi(e)}:${pk}:${e.id}`], ['k', String(kindDi(e))]],
    content: 'Evento tolto dalla mappa',
  }, sk));
}

// Invia gli eventi a un relay e attende le conferme ("OK")
function inviaARelay(url, eventi, tempoMax = 20000) {
  return new Promise((fine) => {
    const esito = { url, accettati: 0, rifiutati: 0, errore: null };
    if (!eventi.length) return fine(esito);
    let attesi = eventi.length;
    let ws;
    const chiudi = () => { try { ws.close(); } catch (_) {} fine(esito); };
    const timer = setTimeout(() => { esito.errore = esito.errore || 'tempo scaduto'; chiudi(); }, tempoMax);
    try { ws = new WebSocket(url); } catch (e) { esito.errore = String(e.message || e); clearTimeout(timer); return fine(esito); }
    ws.on('open', () => { for (const ev of eventi) ws.send(JSON.stringify(['EVENT', ev])); });
    ws.on('message', (m) => {
      let msg; try { msg = JSON.parse(String(m)); } catch (_) { return; }
      if (msg[0] !== 'OK') return;
      if (msg[2]) esito.accettati++; else { esito.rifiutati++; if (!esito.errore) esito.errore = msg[3]; }
      if (--attesi <= 0) { clearTimeout(timer); chiudi(); }
    });
    ws.on('error', (e) => { esito.errore = String(e.message || e); clearTimeout(timer); chiudi(); });
  });
}

async function principale() {
  const [fileOra, filePrima] = process.argv.slice(2);
  const sk = chiavePrivata();
  if (!sk) { console.log('NOSTR_CHIAVE_PRIVATA non impostata: salto la pubblicazione su Nostr.'); return; }
  const pk = getPublicKey(sk);
  console.log('Profilo Nostr del progetto:', nip19.npubEncode(pk));

  const leggi = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')).eventi || []; } catch (_) { return []; } };
  const ora = leggi(fileOra);
  const prima = filePrima ? leggi(filePrima) : [];
  const oggi = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(new Date());

  const eventi = ora.filter(pubblicabile).filter((e) => e.data >= oggi).map((e) => costruisciEvento(e, sk));
  const cancellazioni = costruisciCancellazioni(prima, ora, sk, oggi);
  const tutti = [...eventi, ...cancellazioni];
  if (!tutti.every(verifyEvent)) throw new Error('Firma non valida: interrompo.');
  console.log(`Da pubblicare: ${eventi.length} eventi, ${cancellazioni.length} cancellazioni.`);
  if (PROVA) { console.log(JSON.stringify(tutti.slice(0, 2), null, 2)); return; }

  const relay = relayDaConfig();
  const esiti = await Promise.all(relay.map((r) => inviaARelay(r, tutti)));
  let buoni = 0;
  for (const e of esiti) {
    console.log(`${e.url}: ${e.accettati} accettati, ${e.rifiutati} rifiutati${e.errore ? ' (' + e.errore + ')' : ''}`);
    if (e.accettati > 0 || (!tutti.length)) buoni++;
  }
  if (tutti.length && buoni === 0) { console.error('Nessun relay ha accettato gli eventi.'); process.exitCode = 1; }
}

if (import.meta.url === `file://${process.argv[1]}`) principale().catch((e) => { console.error(e); process.exitCode = 1; });
