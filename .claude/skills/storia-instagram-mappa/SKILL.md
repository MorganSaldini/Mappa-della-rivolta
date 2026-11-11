---
name: "storia-instagram-mappa"
description: "Crea le storie Instagram (1080x1920) per promuovere la Mappa della Rivolta con i dati veri della mappa, e i testi da pubblicare. Usala quando l'utente chiede una storia, un post o grafiche social per il sito."
---

# Storia Instagram — Mappa della Rivolta

Obiettivo: schermate PNG 1080x1920 (o reel e caroselli quando richiesti) pronte da caricare, con dati reali e aggiornati della mappa, più le istruzioni per pubblicarle. Rispondi in italiano semplice, con passaggi numerati.

## Cosa chiedere (solo se manca, una domanda sola)
- Giorno di pubblicazione (default: domani). Serve per contare solo gli eventi da quel giorno in poi.
- Obiettivo della storia (default: far conoscere la mappa + invitare ad aggiungere eventi). Altre varianti: un evento importante in arrivo, il racconto di una giornata di piazza, raccolta donazioni, cercare moderatori volontari.
- Account Instagram del progetto, se esiste (per menzionarlo).
Se l'utente non risponde, usa i default e dillo in una riga.

## Passi
1. **Dati veri.** La shell non raggiunge il sito: apri https://mappadellarivolta.org nel browser e con JavaScript leggi `await fetch('/api/mobilitazioni').then(r=>r.json())`. Se il browser non c'è, usa la copia `public/dati/eventi.json` del repository (dopo `git pull`) e dillo. Salva gli eventi come array JSON di oggetti con almeno tipo, data, comune, lat, lng, stato, titolo in `eventi.json` nella cartella di lavoro.
2. **Numeri delle piazze** (solo se il contenuto parla di partecipanti): segui la sezione "Numeri delle piazze" qui sotto.
3. **Generatore.** Lo script è nel repository MorganSaldini/Mappa-della-rivolta in `strumenti/storia-ig/` (genera.mjs + package.json); altri generatori (caroselli, reel, copertine, foto con volti sfocati `foto30.py`) in `strumenti/social/`. Copia la cartella nella scratchpad, `npm install`, poi:
   `node genera.mjs eventi.json AAAA-MM-GG out`
   Chromium: `/opt/pw-browsers/chromium-1194/chrome-linux/chrome` (se cambia versione, cerca in /opt/pw-browsers). Non eseguire `playwright install`.
4. **Schermate prodotte (versione base):**
   - 1 Mappa: domanda breve + sagoma dell'Italia con i punti per tipo (raggruppati per città) + contatore + legenda.
   - 2 Le prossime date: 4 date in evidenza (scioperi generali, cortei, scioperi nazionali), "…e altre N".
   - 3 Partecipa (fondo scuro): aggiungi / conferma o correggi / Telegram, spazio per lo sticker Link, mappadellarivolta.org, riga Sostieni con paypal.me/MappaDellaRivolta.
   Per altre varianti modifica i testi in `genera.mjs` (oggetto `pagine`). Non usare sempre la stessa impaginazione: vedi "Voce".
5. **Controllo visivo obbligatorio.** Apri ogni PNG (e alcuni fotogrammi dei video) con Read e verifica: niente testo tagliato o fuori bordo; testi importanti fuori dalle zone coperte da Instagram (primi ~250 px in alto, ultimi ~300 px in basso); numeri e luoghi corretti ("In tutta Italia" solo per scioperi nazionali; i cortei mostrano la città); date ancora future nel giorno di pubblicazione; nessun volto leggibile; nessuna frase "da IA" (lista sotto). Ricontrolla i paletti legali. Correggi e rigenera finché è pulito.
6. **Consegna** con SendUserFile (display render) i file e scrivi:
   - come pubblicare: Instagram → + → Storia → carica le immagini in ordine; sull'ultima aggiungi lo sticker **Link** con https://mappadellarivolta.org nel riquadro tratteggiato; opzionale sticker Menzione;
   - programmazione: Instagram non permette di programmare le storie dall'app normale; si fa da Meta Business Suite (account professionale) → Pianifica storia, oppure si pubblica a mano. Orari consigliati: 12:30–13:30 o 19:00–21:00;
   - una riga su cosa provare e il prossimo passo.
   Non pubblicare tu su Instagram senza un sì esplicito dell'utente per quel contenuto.

## Numeri delle piazze
I grandi giornali spesso danno numeri più bassi di quelli dei promotori. La pagina racconta le piazze dal punto di vista di chi c'era, ma ogni numero dice sempre chi lo dà.
1. **Cerca prima gli organizzatori**: comunicati e social dei sindacati promotori (USB, CGIL, Cobas, CUB…), dei collettivi studenteschi, testate di movimento (es. il manifesto). Poi agenzie (ANSA), Questura, Ministeri. Usa la ricerca estesa la sera stessa della giornata, quando i comunicati finali escono tardi.
2. **La stima dei promotori va in grande**, con attribuzione: "2 milioni in piazza secondo i promotori". Le altre stime si possono mettere accanto in piccolo, ognuna con chi la dà: "Milano: oltre 100mila per USB, 30mila per l'ANSA". La distanza tra le stime si può far notare; non si scrive che una fonte mente.
3. **Mai un numero senza chi lo dà**, nemmeno se l'utente è sicuro: chiedigli dove l'ha letto e usa quella fonte. Mai un numero preso dalla scritta sovrapposta a un video o a un post senza averne trovato l'origine.
4. **Controlla la data della fonte**: lo stesso titolo ("più di 2 milioni in piazza") può riferirsi a uno sciopero di un anno prima (es. comunicato CGIL del 3/10/2025). Se la data non coincide, non usarlo.
5. Dati di adesione (Ministeri, aziende) sono dati parziali: scrivi "dato provvisorio" e l'ora.

## Voce: non deve sembrare gestita da un'IA
- Scrivi come una persona che era in piazza o che cura la mappa da volontario: frasi corte, "noi", parole di tutti i giorni, un tono caldo ma sobrio.
- **Evita**: "Ecco…", "in diretta", "una sola rete", "insieme" ripetuto, "non solo… ma anche", trattini lunghi, elenchi puntati con emoji, frasi in tre parti, aggettivi in coppia, chiusure da comunicato ("Restate sintonizzati"), ringraziamenti in elenco ("chi ha segnalato, fotografato e verificato").
- Le **foto della community** vengono prima della grafica; la mappa è un aiuto, non la protagonista di ogni contenuto. Sfoca i volti (strumento `foto30.py`) senza scriverlo sull'immagine.
- **Fonti leggere**: in una riga piccola sull'ultima schermata o in didascalia, non sotto ogni slide. La riga obbligatoria resta: "La mappa riporta informazioni pubbliche con la loro fonte."
- **Varia l'impaginazione** da un giorno all'altro (non sempre numero gigante + frase + fonte, non sempre copertina con tre polaroid). Al massimo 3 hashtag. Didascalie brevi, al massimo 5 righe più la riga sulle fonti.
- Prima di consegnare rileggi i testi ad alta voce: se una frase suona da brochure, riscrivila come la diresti a un amico.

## Paletti legali (dal consulente legale, 20/10/2026 — non derogabili)
Regole complete in `agente/ISTRUZIONI-SOCIAL.md` del repository.
1. **Tre categorie sole.** Mobilitazioni pacifiche legali e preavvisate (sciopero proclamato, corteo, presidio, assemblea, picchetto) → si mostrano se `verificato` con fonte; si possono annunciare, raccontare e ringraziare chi partecipa (Cost. art. 17, 21, 40). Avvisi di possibili disagi (blocchi, occupazioni) → solo come "Possibili disagi: …", senza organizzatori né orario di ritrovo, con fonte giornalistica o istituzionale, mai come modello, mai lodati, mai inviti. Non pubblicabili → inviti a bloccare, occupare, forzare o scontrarsi, istruzioni pratiche, insulti, accuse a persone riconoscibili.
2. **Ringraziamenti**: "a chi ha manifestato pacificamente", mai un "grazie a tutti" generico se ci sono stati scontri; non mostrare né commentare episodi violenti. Numeri dei partecipanti solo con fonte, dicendo chi li dà. Niente foto con volti riconoscibili (art. 9 GDPR).
3. **Titoli descrittivi e neutri**; uno slogan solo tra virgolette come nome dell'iniziativa. Nelle foto taglia via scritte sovrapposte che invitano a bloccare o insultano.
4. Su decreti e disordini: solo fatti con fonte, nessun giudizio, nessuna violenza attribuita a gruppi o categorie. Nessun contenuto sulle "tensioni in corso".
5. **Ogni contenuto finisce con la riga** (ultima schermata o didascalia): "La mappa riporta informazioni pubbliche con la loro fonte."
6. Nel dubbio non pubblicare e chiedi all'utente o a `/consulente-legale-mappa`.

## Regole sui contenuti (non derogabili)
- Solo iniziative pacifiche; niente inviti a blocchi, occupazioni, danneggiamenti, scontri.
- Tono non offensivo verso persone, partiti, gruppi o forze dell'ordine; distacco politico: niente nomi di politici, sigle o simboli di partito (anche nelle foto). Non mettere in evidenza titoli di eventi che attaccano persone politiche per nome: preferisci scioperi generali, cortei nazionali, scioperi di categoria nazionali.
- Niente nomi di persone private, telefoni, email, volti riconoscibili. I profili privati che hanno scattato le foto non vanno scritti sull'immagine: l'utente può taggarli se sono d'accordo. Pagine di collettivi e testate si possono citare.
- Mostra solo eventi con stato "verificato" con fonte e con data dal giorno di pubblicazione in poi; escludi occupazioni ed eventi senza fonte. I numeri della mappa vengono dai dati letti, mai inventati o a memoria.
- Grafica originale nello stile del sito: carta #f6f3ee, inchiostro #1c1b1f, rosso #c8322a, colori dei tipi come in app.js, titoli Barlow Condensed, testo Source Sans 3. Non copiare grafica o testi di altri siti.
- La donazione è un invito, mai un obbligo o una promessa di ricompensa.