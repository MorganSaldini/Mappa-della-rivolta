# Rete di riserva — la mappa resta leggibile anche se il sito cade

Il codice è già caricato. Questa guida spiega cosa fa e cosa devi attivare tu (15–30 minuti in tutto, un pezzo alla volta).

## Come funziona, in breve
- **Sito principale** (mappadellarivolta.org, su Cloudflare): l'unico punto dove si **scrive** (nuovi eventi, conferme, correzioni) e si **modera**. Lì ci sono anti-spam e moderatori: una rete senza nessun controllo si riempirebbe di spam e falsi.
- **Lettura distribuita**: la mappa e gli eventi verificati vengono copiati da soli su servizi indipendenti tra loro:
  1. **GitHub Pages** — una copia identica della mappa (azienda diversa da Cloudflare);
  2. **Codeberg Pages** — un'altra copia, su un servizio europeo senza scopo di lucro;
  3. **IPFS** — rete peer-to-peer: la copia ha un indirizzo che dipende dal contenuto e chiunque può tenerne una;
  4. **Nostr** — rete di server (relay) indipendenti: ogni evento verificato è firmato con la chiave del progetto, quindi nessun relay può falsificarlo;
  5. **Mappa offline** — pulsante "⬇ Scarica la mappa offline" in fondo alla pagina: un solo file da tenere sul telefono o passare ad altri.
- **La pagina si arrangia da sola**: prova il sito principale → la copia statica → i dati nel file offline → Nostr → l'ultima lista salvata sul dispositivo. Mostra sempre un avviso quando usa una copia.
- **Sulle copie non si scrive**: i pulsanti "Aggiungi", "Confermo", "Correggi", "Segnala" spiegano di andare sul sito principale.

Nessuno di questi servizi riceve dati personali: si copiano solo le informazioni già pubbliche sulla mappa.

---

## 1. GitHub Pages (5 minuti) — consigliato subito
1. Apri il repository su GitHub → **Settings** → a sinistra **Pages**.
2. In **Build and deployment → Source** scegli **GitHub Actions**. (Non serve altro.)
3. Vai su **Actions** → a sinistra **Specchi della mappa** → **Run workflow** → **Run workflow**.
4. Dopo 1–2 minuti la copia è su `https://morgansaldini.github.io/Mappa-della-rivolta/`.

Cosa aspettarti: la stessa mappa, con un avviso giallo solo se il sito principale non risponde. Il pulsante "+ Aggiungi" apre il messaggio "Questa è una copia di riserva".

## 2. Nostr (10 minuti) — la parte davvero distribuita
Serve un profilo Nostr del progetto. Lo crei con un'app, come un account social.
1. Apri **https://primal.net** (oppure l'app Primal o Amethyst sul telefono) → **Create account**.
   Nome: *Mappa della Rivolta*; descrizione e sito: `https://mappadellarivolta.org`. Usa l'email del progetto se te la chiede.
2. Nelle impostazioni dell'account cerca **Keys / Chiavi**. Trovi due chiavi:
   - **chiave pubblica** (inizia con `npub1…`): si può mostrare a tutti;
   - **chiave privata** (inizia con `nsec1…`): è la "password" del profilo. **Non incollarla in chat, non metterla nel codice.** Salvala nel tuo gestore di password.
3. GitHub → repository → **Settings → Secrets and variables → Actions → New repository secret**:
   - Name: `NOSTR_CHIAVE_PRIVATA` — Secret: la chiave `nsec1…` → **Add secret**.
4. GitHub → apri `public/config.js` → matita ✏️ → nella riga `nostrChiavePubblica: '',` metti la chiave pubblica tra gli apici, così:
   `nostrChiavePubblica: 'npub1……',` → **Commit changes**.
   (Oppure mandami solo la chiave **pubblica** `npub1…` e la inserisco io.)
5. Dopo 2 minuti: **Actions → Specchi della mappa → Run workflow**. Nel riquadro "Eventi verificati su Nostr" devi leggere righe come
   `wss://nos.lol: 72 accettati, 0 rifiutati`.

Cosa aspettarti: su Primal, cercando il profilo, gli eventi compaiono come eventi di calendario. Da ora ogni volta che gli eventi cambiano (ogni mezz'ora al massimo) vengono ripubblicati da soli; quelli tolti dalla mappa ricevono una richiesta di cancellazione; tutti scadono 30 giorni dopo la data, come dice la nota privacy.

## 3. Codeberg (10 minuti) — facoltativo
1. Crea un account su **https://codeberg.org** (gratuito; usa l'email del progetto).
2. Crea un repository vuoto chiamato esattamente **pages** (pubblico).
3. Codeberg → icona profilo → **Settings → Applications → Generate New Token**: nome `specchi`, permesso **repository: Read and write** → copia il token.
4. GitHub → **Settings → Secrets and variables → Actions**: aggiungi
   - `CODEBERG_UTENTE` = il tuo nome utente Codeberg
   - `CODEBERG_TOKEN` = il token appena creato
5. **Actions → Specchi della mappa → Run workflow**. La copia sarà su `https://NOMEUTENTE.codeberg.page/`.
6. Mandami l'indirizzo e lo aggiungo all'elenco "Se il sito non si apre" in fondo alla pagina.

## 4. IPFS (15 minuti) — facoltativo, una volta al giorno
1. Crea un account gratuito su **https://filebase.com**.
2. **Buckets → Create Bucket** → nome (es. `mappa-della-rivolta`) → rete **IPFS**.
3. **Access Keys**: copia *Key* e *Secret*.
4. GitHub → **Settings → Secrets and variables → Actions**: aggiungi
   - `FILEBASE_CHIAVE` = Key
   - `FILEBASE_SEGRETO` = Secret
   - `FILEBASE_BUCKET` = nome del bucket
5. **Actions → Specchi della mappa → Run workflow**. Nel riepilogo trovi l'indirizzo IPFS, tipo `https://bafy….ipfs.dweb.link/`.
   Se Nostr è attivo, il nuovo indirizzo viene anche annunciato sul profilo del progetto.

L'indirizzo IPFS cambia quando cambiano gli eventi (ogni giorno alle 6:20 circa): l'ultimo è sempre sul profilo Nostr.

---

## Cosa fare il giorno in cui il sito principale non si apre
1. Scrivi sul canale Telegram (e fissa il messaggio):
   *"Il sito è momentaneamente irraggiungibile. La mappa resta consultabile qui: [GitHub Pages] · [Codeberg] · profilo Nostr del progetto."*
2. Chi ha scaricato la **mappa offline** la apre e, se ha internet, vede anche gli aggiornamenti da Nostr.
3. Le segnalazioni nuove aspettano che il sito torni; intanto si possono raccogliere sul canale Telegram e inserirle dopo.
4. Se il problema è il dominio, il sito resta su `https://mappadellarivolta.morgansaldini.workers.dev`.

## Cosa NON cambia
- Moderazione, anti-spam, cronologia: tutto come prima, sul sito principale.
- Le scritture da altri siti restano bloccate; le copie possono solo **leggere** l'elenco pubblico.

## Prova veloce
- Apri la copia su GitHub Pages: devi vedere la mappa e, premendo "+ Aggiungi", il messaggio "Questa è una copia di riserva".
- In fondo alla pagina principale premi **⬇ Scarica la mappa offline**, apri il file scaricato: devi vedere le mobilitazioni e l'avviso "Stai usando la mappa offline".
