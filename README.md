# Mappa della Rivolta

Mappa pubblica e collaborativa delle mobilitazioni in Italia: scioperi, cortei, presidi, picchetti e assemblee.
Chiunque può segnalare un'iniziativa senza registrarsi; moderatori volontari controllano le segnalazioni prima che compaiano come verificate.

**Sito:** https://mappadellarivolta.org · **Canale:** https://t.me/MappaDellaRivolta · **Regole:** https://mappadellarivolta.org/regole.html

## Cosa fa
- Mappa con le mobilitazioni in programma, colorate per tipo, con ricerca per comune, "vicino a me", filtri per data, tipo e regione.
- Elenco per giorno; eventi in più città e su più giorni collegati tra loro.
- Ogni evento ha una fonte (comunicato, sito del sindacato, calendario ufficiale degli scioperi).
- Chi visita può aggiungere, confermare, proporre correzioni e segnalare problemi.
- I moderatori approvano, correggono e annullano dal pannello; ogni modifica resta in cronologia e si può ripristinare.
- Calendario `.ics` da sottoscrivere con qualsiasi app, canale Telegram, profilo Nostr.

## Principi
- **Solo iniziative pacifiche**, annunciate pubblicamente. La mappa informa, non organizza.
- **Niente dati personali**: nessun account per chi visita, nessun indirizzo IP salvato, organizzatori indicati solo come sigle. Gli eventi vengono cancellati 30 giorni dopo la loro data.
- **Neutralità**: aperta a tutte le organizzazioni sindacali e ai movimenti.

## Resistenza a guasti e oscuramenti
La lettura è distribuita, la scrittura resta protetta:
- copia statica di riserva degli eventi, aggiornata ogni mezz'ora;
- copie identiche della mappa su GitHub Pages (e, se configurati, Codeberg e IPFS);
- eventi verificati pubblicati su Nostr, firmati con la chiave del progetto;
- mappa scaricabile in un unico file, utilizzabile offline.

Invii e moderazione passano solo dal sito principale, dove ci sono anti-spam e controlli.

## Come è fatto
| Parte | Tecnologia |
|---|---|
| Pagina | HTML, CSS e JavaScript senza framework; Leaflet e OpenStreetMap |
| API | Cloudflare Workers (`src/`) |
| Database | Cloudflare D1 (SQLite) |
| Anti-spam | Cloudflare Turnstile, campo trappola, limiti di invio, validazione lato server |
| Automazioni | GitHub Actions (`.github/workflows/`): copia di riserva e specchi |
| Rete di riserva | Nostr (NIP-52), GitHub Pages, IPFS |

```
public/        pagina pubblica, pannello moderatori, regole, librerie
src/           API: eventi, moderazione, calendario, Telegram, importazioni
strumenti/     script per specchi, Nostr e grafiche
dati/          proposte di eventi da verificare
schema.sql     struttura del database
docs/guide/    guide di installazione e aggiornamento
```

## Provarlo in locale
Serve Node.js.
```
npm install
npx wrangler d1 execute mobilitazioni --local --file schema.sql
npx wrangler dev
```
Per lo sviluppo crea un file `.dev.vars` (mai da pubblicare) con `SALE_SEGRETO`, `ADMIN_CODICE` e `SVILUPPO=1`.

## Contribuire
- **Codice:** apri una issue o una pull request. Le modifiche vengono riviste prima di andare online.
- **Moderazione:** se vuoi verificare le segnalazioni della tua zona, scrivi a paginadellarivolta@gmail.com.
- **Segnalazioni:** usa "+ Aggiungi un luogo" sul sito, con un link alla fonte.

Per problemi di sicurezza scrivi in privato all'indirizzo qui sopra, non in una issue pubblica.
