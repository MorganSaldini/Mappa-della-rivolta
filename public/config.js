// ===== IMPOSTAZIONI DEL SITO =====
// Questo è l'unico file da modificare per personalizzare la pagina.
// Ogni riga deve avere la forma:  nome: 'valore',   (apice, valore, apice, virgola)
window.CONFIG = {
  // Nome e sottotitolo mostrati in alto
  nomeProgetto: 'Mappa della Rivolta',
  sottotitolo: 'Cortei, presidi, scioperi e assemblee in tutta Italia, segnalati da chi li organizza e da chi partecipa.',

  // Pulsante "Partecipa": link a un canale Telegram, a un sito o a un gruppo. Lascia '' per nasconderlo.
  linkPartecipa: 'https://t.me/MappaDellaRivolta',
  testoPartecipa: 'Unisciti al canale',

  // Pulsante "Sostieni": link alla pagina per le donazioni (Ko-fi, Liberapay, PayPal…). Lascia '' per nasconderlo.
  linkSostieni: 'https://paypal.me/MappaDellaRivolta',

  // Chiave pubblica di Cloudflare Turnstile (anti-bot).
  turnstileSiteKey: '0x4AAAAAAFYop4uNqrh9rvL6',

  // Contatto pubblico per richieste di rimozione o correzione (email del progetto o link a un modulo).
  contattoRimozioni: 'paginadellarivolta@gmail.com',

  // ===== RETE DI RISERVA (se il sito principale cade o viene oscurato) =====
  // Indirizzo del sito principale: le copie (specchi) leggono da qui e mandano qui chi vuole scrivere.
  sitoPrincipale: 'https://mappadellarivolta.org',

  // Copie della mappa su altri servizi, mostrate in fondo alla pagina. Aggiungi o togli righe.
  specchi: [
    { nome: 'GitHub Pages', url: 'https://morgansaldini.github.io/Mappa-della-rivolta/' },
  ],

  // Nostr: chiave PUBBLICA del profilo Nostr del progetto (inizia con npub1…). Lascia '' finché non c'è.
  // Mai mettere qui la chiave privata (nsec…): quella va solo nei segreti di GitHub.
  nostrChiavePubblica: 'npub12rtkp2gxxqdevpfg2ut9ssje4gvs5gxzz8jh28y0v3m6hrlu0qlsrhdgnl',
  // Relay Nostr da cui leggere gli eventi (gli stessi usati per pubblicarli).
  nostrRelay: ['wss://relay.damus.io', 'wss://nos.lol', 'wss://relay.primal.net', 'wss://relay.nostr.band', 'wss://nostr.mom'],
};
