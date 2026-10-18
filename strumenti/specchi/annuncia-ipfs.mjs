// Annuncia sul profilo Nostr del progetto il nuovo indirizzo IPFS della mappa (una nota pubblica, kind 1).
// Uso: NOSTR_CHIAVE_PRIVATA=nsec1… IPFS_CID=bafy… node strumenti/specchi/annuncia-ipfs.mjs
import WebSocket from 'ws';
import fs from 'node:fs';
import { finalizeEvent, nip19 } from 'nostr-tools';

const k = String(process.env.NOSTR_CHIAVE_PRIVATA || '').trim();
const cid = String(process.env.IPFS_CID || '').trim();
if (!k || !/^[a-z0-9]{40,100}$/.test(cid)) { console.log('Manca la chiave Nostr o il CID: nessun annuncio.'); process.exit(0); }
const sk = k.startsWith('nsec1') ? nip19.decode(k).data : Uint8Array.from(Buffer.from(k, 'hex'));

const cfg = fs.readFileSync(new URL('../../public/config.js', import.meta.url), 'utf8');
const m = cfg.match(/nostrRelay:\s*\[([^\]]*)\]/);
const relay = process.env.NOSTR_RELAY ? process.env.NOSTR_RELAY.split(/[\s,]+/) : (m ? [...m[1].matchAll(/'(wss:\/\/[^']+)'/g)].map((x) => x[1]) : []);

const testo = [
  'Copia aggiornata della Mappa della Rivolta sulla rete IPFS (funziona anche se il sito principale non si apre):',
  `https://${cid}.ipfs.dweb.link/`,
  `https://ipfs.io/ipfs/${cid}/`,
  `ipfs://${cid}`,
  'Sito principale: https://mappadellarivolta.org',
].join('\n');
const ev = finalizeEvent({ kind: 1, created_at: Math.floor(Date.now() / 1000), tags: [['t', 'mappadellarivolta'], ['r', `ipfs://${cid}`]], content: testo }, sk);

await Promise.all(relay.map((url) => new Promise((fine) => {
  const ws = new WebSocket(url);
  const t = setTimeout(() => { try { ws.close(); } catch (_) {} console.log(url, 'tempo scaduto'); fine(); }, 15000);
  ws.on('open', () => ws.send(JSON.stringify(['EVENT', ev])));
  ws.on('message', (d) => { const x = JSON.parse(String(d)); if (x[0] === 'OK') { console.log(url, x[2] ? 'ok' : 'rifiutato ' + x[3]); clearTimeout(t); ws.close(); fine(); } });
  ws.on('error', (e) => { console.log(url, 'errore', e.message); clearTimeout(t); fine(); });
})));
