---
name: "segnalazioni-mobilitazioni"
description: "Aggiungere, verificare, importare o moderare eventi e contributi della community (nuovi eventi, modifiche, segnalazioni) nella mappa delle mobilitazioni in Italia."
---

# Segnalazioni – dati e moderazione community

## Principio
La mappa riporta informazioni pubbliche con la loro fonte. **Non organizza, non promuove e non invita** a partecipare ad alcuna iniziativa. Le regole sono uguali per tutti e i controlli principali li fa il server (`src/regole.js`), non solo il browser.

## Schema dati (D1 / SQLite)
```sql
CREATE TABLE eventi (
  id TEXT PRIMARY KEY,               -- es. 2026-10-17-milano-corteo-01
  tipo TEXT NOT NULL CHECK (tipo IN ('corteo','presidio','sciopero_generale','sciopero_categoria','picchetto','assemblea','altro')),
  titolo TEXT NOT NULL,              -- max 120 caratteri
  data TEXT NOT NULL,                -- AAAA-MM-GG
  ora_inizio TEXT,                   -- HH:MM, fuso Europe/Rome
  ora_fine TEXT,
  comune TEXT NOT NULL,
  provincia TEXT NOT NULL,           -- sigla, es. MI
  regione TEXT NOT NULL,
  luogo TEXT,                        -- piazza/via pubblica
  lat REAL NOT NULL, lng REAL NOT NULL,
  posizione_approssimativa INTEGER DEFAULT 0,
  organizzatori TEXT,                -- JSON array di sigle
  fonte TEXT,                        -- URL
  stato TEXT NOT NULL DEFAULT 'da_verificare' CHECK (stato IN ('da_verificare','verificato','annullato','nascosto','rifiutato')),
  conferme INTEGER DEFAULT 0,
  segnalazioni_aperte INTEGER DEFAULT 0,
  versione INTEGER DEFAULT 1,
  creato_il TEXT, aggiornato_il TEXT,
  note TEXT,
  telegram_msg_id INTEGER,           -- post sul canale, se pubblicato
  gruppo TEXT,                       -- stesso evento in più città o più giorni (g-… dal sito, ag-… dall'agente)
  sospetto TEXT                      -- motivo scritto dall'amministratore AI
);

CREATE TABLE modifiche (              -- proposte della community
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  evento_id TEXT NOT NULL REFERENCES eventi(id),
  campi TEXT NOT NULL,               -- JSON solo dei campi cambiati
  motivo TEXT, fonte TEXT,
  stato TEXT DEFAULT 'in_attesa' CHECK (stato IN ('in_attesa','accettata','rifiutata')),
  autore_anonimo TEXT,               -- hash temporaneo, mai IP in chiaro
  creato_il TEXT, deciso_da TEXT, deciso_il TEXT
);

CREATE TABLE problemi (               -- segnalazioni di problema
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  evento_id TEXT NOT NULL REFERENCES eventi(id),
  motivo TEXT CHECK (motivo IN ('sbagliato','annullato','doppione','inappropriato','altro')),
  nota TEXT,                         -- max 300 caratteri
  stato TEXT DEFAULT 'aperta',
  autore_anonimo TEXT, creato_il TEXT
);

CREATE TABLE conferme (
  evento_id TEXT, autore_anonimo TEXT, creato_il TEXT,
  PRIMARY KEY (evento_id, autore_anonimo)
);

CREATE TABLE cronologia (             -- ogni scrittura, per ripristino
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  evento_id TEXT, versione INTEGER,
  azione TEXT,                       -- creato, istantanea, modificato, approvato, rifiutato, nascosto, ripristinato, annullato, regole_invito, regole_avviso_disagi, regole_senza_fonte
  attore TEXT,                       -- 'visitatore', 'moderatore#ID', 'admin', 'agente', 'amministratore-ai', 'regole', 'sistema'
  dati TEXT,                         -- JSON completo dell'evento a quella versione
  creato_il TEXT
);

CREATE TABLE staff (                  -- moderatori: accesso con codice personale, nessuna email
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,                -- nome o soprannome, oppure sigla del sindacato referente
  ruolo TEXT NOT NULL CHECK (ruolo IN ('moderatore','admin')),
  regioni TEXT,                      -- JSON, vuoto = tutta Italia
  codice_hash TEXT NOT NULL UNIQUE,  -- hash del codice con SALE_SEGRETO, mai il codice in chiaro
  attivo INTEGER DEFAULT 1, creato_il TEXT, ultimo_accesso TEXT
);

CREATE TABLE importati (chiave TEXT PRIMARY KEY, creato_il TEXT);  -- proposte dell'agente già importate
CREATE TABLE impostazioni (chiave TEXT PRIMARY KEY, valore TEXT);
```
- Per gli scioperi senza luogo fisico (es. sciopero nazionale dei trasporti) usa il capoluogo di regione o il punto del presidio annunciato, e scrivilo nelle note.
- `id`: data-comune-tipo-progressivo, minuscolo, senza spazi né accenti.
- Evento in più città o più giorni: una riga per combinazione città × giorno con lo stesso `gruppo`; i campi comuni (tipo, titolo, organizzatori, fonte) sono uguali, luogo, coordinate e orario possono cambiare. Massimo 40 righe e 15 giorni.

## Le tre categorie (non derogabili)
1. **Mobilitazioni pacifiche** — scioperi, cortei, presidi, assemblee, picchetti, annunciati pubblicamente, con o senza preavviso alla Questura, anche spontanei. Pubblicabili. Organizzatori solo come sigle (sindacati, associazioni, collettivi, comitati).
2. **Avvisi di possibili disagi** — blocchi (stradali, ferroviari, ai cancelli) e occupazioni (scuole, università, edifici) già in corso o annunciati. Formato obbligatorio, applicato anche dal server:
   - tipo `altro`; titolo "Possibili disagi: …" seguito da cosa è interessato (es. "Possibili disagi: occupazione Liceo X", "Possibili disagi: tangenziale est, uscita 12");
   - **nessun organizzatore e nessun orario di ritrovo**; nel titolo e nelle note niente inviti, slogan o indicazioni operative;
   - **fonte giornalistica o istituzionale** (testata, Comune, Prefettura, forze dell'ordine, azienda di trasporto), non il volantino o il post che chiama a partecipare; senza fonte il server rifiuta l'invio;
   - restano `da_verificare` finché **un moderatore umano** ha controllato la fonte: non bastano le conferme dei visitatori né l'amministratore AI;
   - le forme di sciopero come "blocco degli straordinari" restano scioperi, non avvisi.
   Ricorda all'utente in una riga che bloccare strade o ferrovie e occupare edifici può costituire reato e che chi partecipa ne risponde personalmente.
3. **Non pubblicabili** — inviti a bloccare, occupare, forzare, danneggiare o scontrarsi ("blocchiamo…", "occupiamo…", "riprendiamoci…": il server li rifiuta e nasconde quelli già presenti); istruzioni pratiche per commettere reati (aggirare controlli, resistere a uno sgombero, procurarsi materiali); insulti e odio; accuse a persone riconoscibili; dati personali; spam, falsi, eventi passati.

Gli inviti a manifestazioni lecite ("venite", "tutti in piazza") sono ammessi.

## Titoli
Descrittivi e neutri: si scrive che cosa succede ("Corteo studentesco", "Sciopero dei trasporti"), non lo slogan. Il nome dell'iniziativa si può citare tra virgolette. Niente MAIUSCOLO gridato.

## Ciclo di vita
- Nuovo evento → `da_verificare` (visibile se `pubblicazione_immediata`=sì, altrimenti solo in coda).
- → `verificato` **solo se ha una fonte**: approvato da un moderatore, oppure (solo mobilitazioni pacifiche, non avvisi) con fonte valida + `conferme_per_verifica` conferme da dispositivi diversi. Senza fonte resta `da_verificare` sempre; il server rifiuta l'approvazione.
- Sui canali esterni (Telegram, Nostr) escono solo eventi verificati con fonte.
- Modifiche a un evento `verificato` restano in coda finché accettate; su eventi `da_verificare` possono essere applicate subito (registrate in cronologia). Anche le modifiche passano dalle regole (inviti rifiutati, blocchi trasformati in avviso).
- `segnalazioni_per_nascondere` segnalazioni aperte → `nascosto` in automatico fino a decisione di un moderatore.
- Ogni cambio crea una riga in `cronologia` e incrementa `versione`. Ripristino = riapplicare `dati` di una versione precedente (anche questo registrato).
- A ogni cron il server rimette in regola le voci di oggi e future (attore `regole`).

## Procedura per aggiungere o controllare un evento
1. Leggi la fonte (link, comunicato, testo incollato). Senza fonte → resta `da_verificare` e dillo. Per blocchi e occupazioni senza fonte giornalistica o istituzionale → non inserire.
2. Decidi la categoria (1, 2 o 3) e scrivi il titolo in forma neutra.
3. Estrai i campi: data AAAA-MM-GG, ora HH:MM, fuso Europe/Rome (niente ora per gli avvisi).
4. Ricava provincia (sigla ufficiale) e regione dal comune.
5. Coordinate: geocodifica del luogo pubblico con OpenStreetMap; controlla lat 35.5–47.1 e lng 6.6–18.6 e che non cada in mare. Se trovi solo il comune, centro del comune + `posizione_approssimativa`=1.
6. Doppioni: stesso comune + stessa data + tipo uguale o luogo entro 300 m → probabile doppione; proponi di unirli invece di aggiungere.
7. Restituisci la riga SQL (INSERT/UPDATE) o il JSON valido, più la riga di cronologia.

## Fonti per gli scioperi
Calendario della Commissione di Garanzia per lo sciopero nei servizi pubblici essenziali (cgsse.it), calendario scioperi del Ministero delle Infrastrutture e dei Trasporti, comunicati dei sindacati proclamanti. Verifica sempre con una ricerca: gli scioperi possono essere revocati, differiti o ridotti. Se uno sciopero risulta revocato → stato `annullato` con fonte. Se un sito vieta la lettura automatica (robots), non aggirarlo: usa un'altra fonte o le righe/screenshot forniti da una persona.

## Regole di moderazione (uguali per tutti i moderatori)
Rifiuta, nascondi o metti in attesa, scrivendo il motivo in una riga, se il contributo:
- contiene nomi, telefoni, email o indirizzi di persone private (rimuovi la parte o rifiuta);
- rientra nella categoria 3 (inviti, istruzioni per reati, insulti, accuse);
- è un blocco od occupazione non in forma di avviso o senza fonte giornalistica/istituzionale (riformula o rifiuta);
- è spam, pubblicità o palesemente falso;
- ha data già passata (salvo archivio richiesto) o coordinate fuori dall'Italia o in mare;
- è una modifica che cancella informazioni corrette senza fonte (vandalismo) → rifiuta e, se ripetuto, ripristina la versione precedente.
Non approvare mai senza fonte. In caso di dubbio lecito/illecito, non pubblicare e lascia la decisione all'amministratore (e alla skill consulente-legale-mappa). Dopo il decreto del 20/10/2026 sulle manifestazioni, nel dubbio si aspetta.

## Segnalazioni di contenuti illegali (DSA)
Arrivano dal pulsante "⚠️ Segnala" o a paginadellarivolta@gmail.com. Tempi dichiarati in regole.html: contenuti manifestamente illeciti rimossi entro 24 ore da quando li si vede, altri casi decisi entro 72 ore; ogni rimozione con motivo in cronologia; chi ha inserito l'evento può chiedere revisione. Gli ordini delle autorità si eseguono nei tempi indicati: in quel caso indica all'utente di sentire un legale.

## Segnali di abuso da controllare
Molti invii dallo stesso `autore_anonimo` in poco tempo; modifiche a raffica sullo stesso evento; conferme che arrivano tutte insieme; link a domini sconosciuti o abbreviati. In questi casi suggerisci di abbassare `max_invii_ora` o disattivare temporaneamente la pubblicazione immediata.

## Pulizia periodica
- Eventi passati da oltre `giorni_conservazione` giorni: rimossi dalla pagina pubblica e cancellati (con modifiche, conferme e segnalazioni) alla data dichiarata nella nota privacy.
- Hash anonimi di conferme/invii: cancellati dopo 24-48 h.
- Aggiorna la data "ultimo aggiornamento" del footer.

## Import in blocco
Da elenco, CSV o testo: converti con codice nello schema, valida ogni riga (comprese le regole delle tre categorie), controlla i doppioni con gli eventi esistenti e restituisci le righe valide + l'elenco delle righe scartate o `da_verificare` con il motivo. Gli eventi importati da fonte ufficiale possono entrare come `verificato` solo se hanno la fonte e non sono avvisi. Le proposte dell'agente arrivano da `dati/proposte.json` e si importano come `da_verificare` dal pannello moderatori.