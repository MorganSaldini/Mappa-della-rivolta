# Aggiornamento alla Fase 2 — moderatori e bot Telegram

Tempo: circa 20 minuti. Segui i passi in ordine.

## Cosa arriva
- **Pannello moderatori** su `/modera.html` (link "Area moderatori" in fondo alla mappa).
  Contiene: coda "Da controllare", correzioni proposte con confronto prima/dopo, segnalazioni, ricerca su tutti gli eventi,
  modifica diretta, cronologia con ripristino. Per te (amministratore) anche "Moderatori" e "Impostazioni".
- **Accesso con codice personale**: ogni moderatore ha un codice tipo `K7QM-2XRP-9VTD-HC4N`. Nessuna email, nessun nome vero.
  Puoi limitare un moderatore a una o più regioni e revocarlo quando vuoi (effetto immediato).
- **Sul sito pubblico**, in ogni evento: 👍 **Confermo**, ✏️ **Correggi** (va in coda ai moderatori), ⚠️ **Segnala**.
  Con abbastanza conferme e una fonte, un evento diventa "Verificato" da solo.
- **Bot Telegram**: quando un evento diventa "Verificato" viene pubblicato sul canale; se viene annullato arriva un avviso;
  se viene nascosto o rifiutato il post viene tolto (Telegram lo permette entro 48 ore).
- **Pulizia automatica** ogni notte degli eventi finiti da più di 30 giorni (come dichiarato nella nota privacy).
- Link diretto a un evento: `…/?e=CODICE-EVENTO` apre la mappa su quell'evento.

---

## 1. Aggiorna il database (Console D1)
Cloudflare → **Storage & Databases → D1 → mobilitazioni → Console**. Incolla ed esegui (Execute):

```sql
CREATE TABLE IF NOT EXISTS staff (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL, ruolo TEXT NOT NULL CHECK (ruolo IN ('moderatore','admin')), regioni TEXT, codice_hash TEXT NOT NULL UNIQUE, attivo INTEGER DEFAULT 1, creato_il TEXT, ultimo_accesso TEXT);
ALTER TABLE eventi ADD COLUMN telegram_msg_id INTEGER;
INSERT OR IGNORE INTO impostazioni (chiave, valore) VALUES ('telegram_auto', 'si');
```
Deve rispondere con 3 comandi eseguiti. (Se dice *duplicate column*, l'avevi già fatto: va bene.)

## 2. Carica i file su GitHub
Apri lo zip e carica **tutto il contenuto** nel repository (Add file → Upload files), sostituendo i file esistenti:
- cartella `src` (8 file: worker.js, eventi.js, problema.js, lib.js, dati.js, pubblico.js, moderazione.js, telegram.js)
- cartella `public` (compresi i nuovi modera.html, modera.js, modera.css; il config.js è già quello corretto con il tuo canale)
- `wrangler.toml` (ha già il tuo database, il nome `mappadellarivolta` e la pulizia notturna)
- `schema.sql`, `fase2.sql`, `README.md`, questo file

Commit changes, poi aspetta che Cloudflare finisca il deploy (1–2 minuti).

## 3. Crea il tuo codice da amministratore
Cloudflare → **Workers & Pages → mappadellarivolta → Settings → Variables and Secrets → Add**:
- Type **Secret**, Name `ADMIN_CODICE`, Value: un codice che inventi tu, **almeno 16 caratteri**,
  per esempio 4 gruppi di 4 lettere/numeri a caso separati da trattini. Non usare password che usi altrove.
- Controlla che ci sia anche `SALE_SEGRETO` (almeno 16 caratteri). Se lo cambi in futuro, i codici dei moderatori
  smettono di funzionare e vanno rigenerati.

Premi **Deploy**. Poi apri `https://mappadellarivolta.morgansaldini.workers.dev/modera.html` e inserisci il codice.

## 4. Collega il bot Telegram
1. In Telegram apri **@BotFather** (quello ufficiale, con la spunta blu) → scrivi `/newbot` → scegli un nome
   (es. *Mappa della Rivolta*) e un nome utente che finisce con `bot` (es. `MappaDellaRivoltaBot`).
2. BotFather ti dà un **token** (una lunga stringa con i due punti). **Non incollarlo in chat e non metterlo su GitHub.**
3. Apri il canale → Amministratori → **Aggiungi amministratore** → cerca il tuo bot → lascia attivi
   **Pubblica messaggi** ed **Elimina messaggi** → salva.
4. Cloudflare → Worker `mappadellarivolta` → Settings → Variables and Secrets → Add:
   - Type **Secret**, Name `TELEGRAM_BOT_TOKEN`, Value: il token di BotFather
   - Type **Text**, Name `TELEGRAM_CHAT_ID`, Value: `@MappaDellaRivolta`
   Premi **Deploy**.
5. Nel pannello → **Impostazioni** → **Invia un messaggio di prova**. Sul canale deve comparire
   "✅ Collegamento tra la mappa e il canale riuscito." Puoi poi cancellare quel messaggio dal canale.

Se il canale fosse privato, `@MappaDellaRivolta` non funziona: rendilo pubblico, oppure chiedimi come trovare l'ID numerico.

## 5. Aggiorna Turnstile (se non l'hai già fatto)
Turnstile → il tuo widget → Hostnames: deve esserci `mappadellarivolta.morgansaldini.workers.dev` (con la **s** di workers).

---

## Come si modera (in breve)
- **Da controllare**: apri la fonte, poi ✓ **Approva** (va sulla mappa come verificato e sul canale) oppure ✕ **Rifiuta**.
  Eventi senza fonte: approva solo se sei sicuro che si terranno.
- **Correzioni**: guarda il confronto (rosso = ora, verde = proposto) e il motivo → Accetta o Rifiuta.
- **Segnalazioni**: se sono infondate "chiudi"; se l'evento è annullato "Segna annullato"; se è falso o illecito "Rifiuta".
- **Cronologia**: ogni cambiamento resta registrato; "Ripristina" torna a una versione precedente (utile contro i vandali).
- Regole uguali per tutti: niente dati personali, solo iniziative pacifiche e lecite, una fonte quando possibile.

## Aggiungere un moderatore
Pannello → **Moderatori** → nome o soprannome → regioni (nessuna = tutta Italia) → **Crea e mostra il codice**.
Il codice si vede **una sola volta**: copialo e mandalo alla persona con un messaggio privato.
Se lo perde: "Nuovo codice". Se non deve più moderare: "Revoca accesso".
