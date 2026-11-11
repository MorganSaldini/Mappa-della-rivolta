---
name: "sicurezza-mappa"
description: "Sicurezza e tenuta sotto carico della Mappa della Rivolta (Cloudflare Workers + D1): anti-abuso, protezione da attacchi e picchi di traffico, controlli prima del deploy, cosa fare se il sito va giù."
---

# Sicurezza e tenuta della Mappa della Rivolta

Scopo: il sito (mappadellarivolta.org) deve restare in piedi quando il traffico sale o quando qualcuno prova a bloccarlo, sporcarlo o rubare dati. Solo difesa del proprio sito: niente tecniche offensive verso altri.

L'utente non è uno sviluppatore: spiega in italiano semplice, passaggi numerati, dove cliccare o cosa scrivere e cosa aspettarsi. Consegna file completi + una guida `AGGIORNAMENTO-*.md` passo passo (stile di AGGIORNAMENTO-FASE2.md, AGGIORNAMENTO-SICUREZZA.md, AGGIORNAMENTO-P2P.md) + uno zip con solo i file cambiati quando l'utente carica a mano. Chiavi e codici solo come variabili segrete del Worker o segreti di GitHub Actions, mai nel codice né in chat.

## Dove sta il codice
- Repository **pubblico** GitHub `MorganSaldini/Mappa-della-rivolta`. Le modifiche si caricano da GitHub web (Add file → Upload files; la cartella `.github` va creata con Add file → Create new file perché il trascinamento ignora le cartelle col punto) oppure con push diretto se la GitHub App di Claude è installata. Ogni commit su main fa ripartire il sito (Workers Builds).
- Worker `mappadellarivolta` con static assets in `public/` e `run_worker_first = ["/api/*"]`; database D1 `mobilitazioni`; cron ogni 3 ore (pulizia + import proposte agente + decisioni amministratore AI).
- Indirizzo di riserva: `https://mappadellarivolta.morgansaldini.workers.dev` (serve `workers_dev = true` in wrangler.toml accanto alle `routes` del dominio).

## Stato attuale (aggiornato al 18/10/2026)
Già fatto e verificato online (securityheaders.com: A+):
- `GET /api/mobilitazioni`: copia condivisa nella Cache API per 60 s (`chiaveCacheEventi`, `SECONDI_CACHE_EVENTI` in src/lib.js); il Worker la svuota dopo ogni POST riuscito (`svuotaCacheEventi` in src/worker.js). La Cache API funziona sul dominio, non su workers.dev, e la richiesta conta comunque nelle 100.000/giorno: protegge D1, non la quota del Worker.
- Copia di riserva statica `public/dati/eventi.json`, aggiornata dalla GitHub Action `.github/workflows/copia-eventi.yml` (minuti 7 e 37 di ogni ora, legge da workers.dev, salva solo se gli eventi cambiano, aggiunge `copia_del`); quando salva, lancia `specchi.yml` con `gh workflow run` (permesso `actions: write`, perché i push fatti con GITHUB_TOKEN non fanno partire altri workflow).
- Turnstile **chiuso** se manca `TURNSTILE_SECRET` (si salta solo con `SVILUPPO=1` in .dev.vars locale).
- Tetto globale: oltre `max_invii_ora_totali` (default 60, tabella impostazioni) nuovi invii/ora il Worker mette `pubblicazione_immediata = no`.
- Corpo max 32 KB (413). Interruttore di emergenza `SOLO_LETTURA=1` (variabile Text del Worker): blocca i POST pubblici, lascia lettura e moderazione.
- Intestazioni: pagine statiche da `public/_headers` (CSP); risposte API da `INTESTAZIONI_SICUREZZA` in src/lib.js, perché `_headers` NON si applica alle risposte del Worker.
- Leaflet 1.9.4 e markercluster 1.5.3 in `public/vendor/leaflet`, nostr-tools 2.10.4 in `public/vendor/nostr` (niente CDN).
- Già presenti: query preparate, `esc()` su tutti i dati in innerHTML (app.js, modera.js) e `h()` nei messaggi Telegram, link fonte solo http/https, controllo Origin sulle scritture, codici moderatore 16 caratteri salvati come hash, cookie HttpOnly/Secure/SameSite=Strict 12 h firmato HMAC, revoca immediata, blocco dopo 8 tentativi d'accesso/ora, ruolo e regione controllati sul server, IP solo come hash giornaliero.
- Cloudflare: Always Use HTTPS, una regola WAF di rate limiting su `/api/` (50 richieste/10 s per IP → Block), verifica in due passaggi su Cloudflare, GitHub e Gmail del progetto.

**Regola**: se si aggiunge una risorsa esterna (script, font, immagini, API, relay wss://), va aggiunta anche nella CSP di `public/_headers`, altrimenti il browser la blocca.

## Rete di riserva distribuita (lettura P2P, scrittura protetta)
Scelta dell'utente: la lettura è distribuita, invii e moderazione restano solo sul sito principale (anti-spam e moderatori). Guida per l'utente: `AGGIORNAMENTO-P2P.md`.
- `public/rete.js` (caricato prima di app.js) espone `window.RETE`: `SPECCHIO` (vero se la pagina non è su mappadellarivolta.org, www, *.workers.dev, localhost), `API` ("" sul principale, `CONFIG.sitoPrincipale` sugli specchi), `leggiNostr()`, `scrittura(dialogo)` (sugli specchi apre `#dlg-specchio` invece dei moduli), `scaricaOffline(eventi)`.
- Ordine di lettura in `carica()` di app.js: API → `dati/eventi.json` (percorso relativo) → `window.DATI_INCORPORATI` (file offline) → Nostr → localStorage. Ogni copia mostra un avviso.
- Worker: le GET di `/api/mobilitazioni`, `/api/eventi`, `/api/calendario.ics` hanno `access-control-allow-origin: *` (`LETTURE_APERTE` in src/worker.js); scritture da altri siti sempre 403 (Origin), rotte riservate 401 senza CORS. Non aprire CORS ad altre rotte.
- Nostr: `strumenti/specchi/nostr.mjs` firma ogni evento `verificato`/`annullato` futuro come NIP-52 (kind 31923 con orario, 31922 solo data), `d` = id evento, tag `L`=mappadellarivolta, tag `mappa` con il JSON compatto (solo campi pubblici), `expiration` a data + 30 giorni (nota privacy), `created_at` = `aggiornato_il` (ripubblicare è idempotente). Gli eventi spariti prima della data ricevono kind 5. La pagina accetta solo eventi con firma valida dell'autore `CONFIG.nostrChiavePubblica` (npub). Relay in `CONFIG.nostrRelay` e nella CSP. Segreto GitHub: `NOSTR_CHIAVE_PRIVATA` (nsec, mai nel codice o in chat).
- `.github/workflows/specchi.yml`: GitHub Pages (Source: GitHub Actions; senza attivazione il job fallisce, gli altri vanno), Codeberg Pages (`CODEBERG_UTENTE`, `CODEBERG_TOKEN`, repo `pages`), Nostr, IPFS una volta al giorno via Filebase (`FILEBASE_CHIAVE`, `FILEBASE_SEGRETO`, `FILEBASE_BUCKET`; CAR con `ipfs-car pack --no-wrap`, upload `--metadata import=car`, CID da `ipfs-car roots`), annuncio del CID sul profilo Nostr (`annuncia-ipfs.mjs`). Ogni parte si salta se mancano i suoi segreti. `prepara-sito.sh` toglie da _site modera.*, *.md e _headers.
- Gli specchi non consumano Workers Builds (non fanno commit). GitHub Actions su repo pubblico è gratuito.
- Per provare in locale: relay finto con `ws` su ws://127.0.0.1:7777 (rete.js accetta ws:// solo per localhost), Chromium con `--host-resolver-rules=MAP specchio.test 127.0.0.1` per simulare uno specchio.

## 0. Limiti da verificare prima di dare numeri
Cercare sempre le pagine ufficiali ("Workers limits", "Workers pricing", "D1 pricing", "Workers Builds limits"). Riferimento a ottobre 2026, piano Free:
- Worker: 100.000 richieste/giorno per account (reset 00:00 UTC = 01:00 o 02:00 in Italia), 10 ms CPU per richiesta.
- Static assets: gratuiti e illimitati.
- D1: 5 milioni righe lette e 100.000 scritte al giorno; oltre, le query falliscono fino al reset.
- Workers Builds: 3.000 minuti di build al mese, 1 build alla volta: non aumentare la frequenza dei commit automatici (copia di riserva, agente) senza fare il conto.
- Workers Paid (5 $/mese) toglie i tetti giornalieri: consigliarlo se le richieste superano ~60.000/giorno per più giorni o prima di un grande sciopero nazionale.

Il rischio n.1 resta finire la quota in un giorno di mobilitazione, non un hacker.

## 1. Regole per ogni nuova funzione
1. Pagine e file restano statici; il Worker solo su `/api/*`. Percorsi relativi nelle pagine (devono funzionare anche sugli specchi e in sottocartelle come /ipfs/CID/).
2. Nuove letture pubbliche: una sola chiamata per visita, campi compatti, cache se possibile, indici D1 sulle colonne nei WHERE; mai `SELECT *` senza filtro su tabelle che crescono.
3. Ogni POST pubblico, nell'ordine: Origin (già nel Worker), honeypot `sito_web`, Turnstile lato server, `controllaLimite` con `hashAnonimo`, validazione completa lato server (`validaEvento` e regole della skill segnalazioni-mobilitazioni), query preparate, voce in cronologia; la risposta ok fa svuotare la cache da sola. Sugli specchi ogni nuovo modulo di scrittura passa da `RETE.scrittura()`.
4. Mai `innerHTML` con dati degli utenti senza `esc()`; link solo dopo `urlSicuro()` con `rel="noopener nofollow"`.
5. Rotte di moderazione solo nell'elenco RISERVATE con ruolo minimo; controllo regione con `puoGestire`; ogni azione in cronologia ("moderatore#N").
6. Nessuna email, telefono o IP in chiaro salvati, né pubblicati su Nostr o IPFS.

## 2. Impostazioni Cloudflare
- **Bot Fight Mode: tenerlo SPENTO.** Blocca i server di Google/Apple Calendar che leggono il feed `/api/calendario.ics` e sul piano Free non ammette eccezioni.
- Una sola regola di rate limiting disponibile sul Free: è già usata per `/api/`.
- Under Attack Mode solo durante un attacco in corso.
- Hostnames di Turnstile: mappadellarivolta.org, www.mappadellarivolta.org, mappadellarivolta.morgansaldini.workers.dev (non gli specchi: lì non si scrive).

## 3. Backup
- Il repository è **pubblico**: non salvare mai esportazioni del database nel repository né come artifact delle GitHub Actions (conterrebbero nomi dei moderatori e hash).
- Ripristino: cronologia dell'evento dal pannello (singoli vandalismi); D1 Time Travel per riportare tutto il database a un momento precedente (verificare la retention del piano; serve `wrangler d1 time-travel restore`: guidare l'utente passo passo).

## 4. Se il sito va giù o è sotto attacco
1. Worker → Metrics (richieste, errori) e D1 → Metrics. Errori 1027/429 o "limit exceeded" = quota giornaliera finita: la pagina mostra da sola la copia di riserva.
2. Traffico vero: valutare Workers Paid (attivo in pochi minuti).
3. Spam: pubblicazione immediata "no" dal pannello (scatta anche da sola); se non basta `SOLO_LETTURA=1`.
4. Attacco di traffico: Under Attack Mode, regola WAF più severa.
5. Contenuti vandalizzati: cronologia → Ripristina; se massiccio, Time Travel.
6. Codice moderatore rubato: revoca e controllo delle sue azioni in cronologia.
7. Sito o dominio irraggiungibili: messaggio fissato sul canale Telegram con gli specchi (GitHub Pages, Codeberg, ultimo indirizzo IPFS dal profilo Nostr) e invito a usare la mappa offline; lanciare a mano "Specchi della mappa" da Actions.
8. Chiave Nostr compromessa: crearne una nuova, aggiornare segreto e `nostrChiavePubblica`, annunciarlo sul canale.
9. Dopo: annotare cosa è successo e cosa cambiare.

## 5. Checklist prima di ogni deploy
- [ ] Nessuna chiave o password nel repository (è pubblico).
- [ ] Ogni POST rispetta il punto 1.3.
- [ ] Le API riservate senza cookie rispondono 401/403 e non hanno intestazioni CORS.
- [ ] Nessun innerHTML con dati utente non passati da `esc()`; nuove risorse esterne aggiunte alla CSP di `public/_headers`.
- [ ] Prova locale con `npx wrangler dev` (`.dev.vars` con SALE_SEGRETO, ADMIN_CODICE, SVILUPPO=1; mai su GitHub).
- [ ] Dopo il deploy: mappa e tile visibili, Turnstile compare in "+ Aggiungi", `/dati/eventi.json` con `copia_del` recente, securityheaders.com ancora A/A+, specchio GitHub Pages aggiornato, job Nostr verde.
- [ ] Coordinate in Italia, attribuzione OpenStreetMap presente, pagina usabile da telefono.

## Come rispondere
- Indica sempre quale file cambiare e consegnalo completo.
- Per ogni misura, una riga sul perché ("serve a non consumare le letture D1").
- Chiudi con: cosa provare per vedere se funziona + prossimo passo.