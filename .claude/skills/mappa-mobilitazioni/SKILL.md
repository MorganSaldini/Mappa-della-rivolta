---
name: "mappa-mobilitazioni"
description: "Costruire o modificare la pagina web con mappa interattiva delle manifestazioni e degli scioperi in Italia, aperta ai contributi della community (Leaflet, Cloudflare D1, moderazione)."
---

# Mappa mobilitazioni – come costruire la pagina

La mappa è **gestita dalla community**: visitatori anonimi aggiungono eventi, propongono modifiche e segnalano problemi; moderatori volontari verificano; l'amministratore gestisce ruoli e regole. Serve quindi un backend fin dalla Fase 1.

## Stack consigliato (gratuito)
- **Frontend**: HTML + CSS + JS senza framework, Leaflet 1.9 da cdnjs, Leaflet.markercluster. Alternativa: MapLibre GL solo se serve stile vettoriale.
- **Backend**: Cloudflare Pages (sito) + Pages Functions/Workers (API) + **D1** (database SQLite). Alternativa: Supabase con Row Level Security.
- **Anti-bot**: Cloudflare Turnstile + campo honeypot.
- **Accesso moderatori**: link magico via email (servizio email transazionale con piano gratuito) oppure Cloudflare Access. Nessun account per i visitatori.
- Fondo mappa: tile OpenStreetMap con attribuzione "© contributori OpenStreetMap"; per traffico alto, tile ospitate in proprio (Protomaps .pmtiles), come fa il modello.
- Ricerca comune: Nominatim (`countrycodes=it`, debounce ≥ 1 s, rispetto della policy d'uso) o elenco locale comuni ISTAT con coordinate.

## Struttura dei file
```
/public/index.html        mappa pubblica
/public/regole.html       regole della community + contatto per rimozioni
/public/modera.html       pannello moderatori (dati solo dopo login)
/public/style.css         mobile-first
/public/app.js            mappa, contatori, ricerca, moduli
/public/modera.js
/functions/api/...        endpoint (vedi sotto)
/schema.sql               tabelle D1 (schema nella skill segnalazioni-mobilitazioni)
/wrangler.toml            configurazione Cloudflare
/README.md                passi per mettere online, spiegati per un non sviluppatore
```

## API
Pubbliche (con Turnstile + limite di frequenza):
- `GET  /api/eventi` – eventi visibili (stato `verificato`, `da_verificare`, `annullato`; non passati salvo filtro).
- `GET  /api/eventi/:id` – dettaglio + cronologia sintetica.
- `POST /api/eventi` – nuovo evento.
- `POST /api/eventi/:id/modifiche` – proposta di modifica (solo i campi cambiati + motivo + fonte facoltativa).
- `POST /api/eventi/:id/conferma` – una conferma per dispositivo.
- `POST /api/eventi/:id/problema` – segnalazione (motivo a scelta + nota breve).

Moderatori (sessione verificata lato server):
- `GET  /api/moderazione/coda` – nuovi eventi, modifiche, segnalazioni aperte.
- `POST /api/moderazione/eventi/:id` – approva / rifiuta / nascondi / modifica diretta.
- `POST /api/moderazione/modifiche/:id` – accetta / rifiuta.
- `POST /api/moderazione/eventi/:id/ripristina/:versione`.
Amministratore: `POST /api/admin/moderatori` (aggiungi, revoca, assegna regioni), `POST /api/admin/impostazioni`, `GET /api/admin/export`.

Ogni scrittura: validazione lato server dello schema, riga nella tabella `cronologia`, nessuna fiducia nei dati del browser. Ruolo controllato a ogni richiesta.

## Layout pagina pubblica (ispirato al modello, testi originali)
1. Barra in alto: nome progetto, tema/data della mobilitazione.
2. Titolo "Mappa delle mobilitazioni" + sottotitolo di una riga; pulsante "Partecipa" (canale Telegram/sito).
3. Contatori: totale + uno per tipo (corteo, presidio, sciopero generale, sciopero di categoria, picchetto, assemblea, altro); seguono i filtri.
4. "Trova una mobilitazione" (comune/indirizzo) + "Vicino a me" (geolocalizzazione del browser, mai salvata).
5. Mappa a tutta larghezza, ~70vh su mobile, centro Italia (42.5, 12.5, zoom 6).
6. Pulsante "+ Aggiungi un luogo" sempre visibile.
7. Sezione "Perché ci mobilitiamo" con dati e fonti.
8. Footer: fonti, privacy ("Non chiediamo nome né email"), data di cancellazione degli eventi, link alle regole della community, ultimo aggiornamento.

## Marker e popup
- Colore + icona per tipo, con legenda (mai solo colore).
- `da_verificare`: marker semitrasparente/tratteggiato + etichetta "Da verificare". `verificato`: pieno con spunta. `annullato`: barrato, visibile fino alla data.
- Popup: titolo, tipo, data e ora in italiano ("sab 17 ottobre, ore 14:00"), luogo e comune, organizzatori, fonte, n. conferme, "aggiornato il", e tre pulsanti: **Correggi**, **Confermo**, **Segnala problema**.
- Eventi passati nascosti di default.

## Moduli community
- **Aggiungi**: tipo, titolo, data, ora, comune (autocompletamento), luogo pubblico, organizzatori (sigle), link fonte; clic sulla mappa o trascinamento del punto. Prima di inviare mostra eventi simili vicini ("È uno di questi?") per evitare doppioni.
- **Correggi**: precompilato con i dati attuali; si inviano solo i campi cambiati + motivo.
- **Segnala problema**: motivo (informazione sbagliata, annullato, doppione, contenuto inappropriato, altro) + nota max 300 caratteri.
- Nessun campo nome, email o telefono. Messaggio di conferma chiaro ("Grazie, un moderatore controllerà").

## Pannello moderatori
Coda unica ordinata per urgenza (evento più vicino nel tempo prima), confronto prima/dopo per le modifiche, azioni con un clic, filtro per regione, cronologia con ripristino. Mostra solo identificativi anonimi dei contributori.

## Impostazioni (tabella `impostazioni`, modificabili dall'admin)
`pubblicazione_immediata` (sì/no), `conferme_per_verifica` (default 3), `segnalazioni_per_nascondere` (default 3), `max_invii_ora` (default 5), `giorni_conservazione` (es. 30 dopo la data).

## Filtri (Fase 3)
Checkbox per tipo, selettore data (oggi / questa settimana / tutte), selettore regione, "mostra solo verificati". I contatori seguono i filtri. Extra: link condivisibile per evento, export .ics, moderatori per regione.

## Requisiti di qualità prima di consegnare
- Un visitatore non può approvare, cancellare, cambiare stato o vedere dati di moderazione (provalo).
- Segreti solo in variabili d'ambiente Cloudflare, mai nel codice.
- IP mai salvati in chiaro: solo hash con sale ruotato, cancellato dopo 24-48 h.
- Funziona a 360px senza scroll orizzontale.
- Se l'API non risponde o non ci sono eventi, la pagina mostra un messaggio, non si rompe.
- Testi in italiano, date in fuso Europe/Rome.
- Accessibilità: contrasto sufficiente, pulsanti con etichetta, lista eventi sotto la mappa per chi non usa la mappa.
- Codice e testi originali: non copiare codice, testi o logo del sito modello.
- Nessun contenuto che istighi a blocchi, occupazioni o azioni illegali.
- README con passi numerati per mettere online e per aggiungere un moderatore.