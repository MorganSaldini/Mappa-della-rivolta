# Aggiornamento — amministratore AI e lista dei sospetti

Tempo: circa 15 minuti. Segui i passi **in ordine**: il passo 1 va fatto prima di caricare i file,
altrimenti il pannello moderatori dà errore finché non lo fai.

## Cosa arriva
- **Amministratore AI**: due volte al giorno (7:13 e 19:13) controlla gli eventi "Da verificare".
  - Approva **solo** quelli confermati da fonti attendibili (sindacato, avvisi ufficiali, stampa, oppure il sito di un
    collettivo serio più una conferma). Gli approvati diventano "Verificato" e vanno sul canale Telegram.
  - Per i collettivi fa una breve ricerca: da quanto esistono, se sono citati da altri, se le loro iniziative sono pacifiche.
  - **Non rifiuta mai niente.** Quello che non torna lo mette nella nuova scheda **🤖 Sospetti** del pannello.
  - Gli eventi con solo una fonte social li lascia a te, con quello che ha trovato.
  - A fine giro ti arriva una notifica sul telefono con il resoconto.
- **Scheda 🤖 Sospetti** nel pannello: per ogni evento vedi il motivo e le fonti controllate, e scegli
  **✕ Confermo: rifiuta** oppure **✓ Non è sospetto** (torna nella coda normale). Puoi anche approvarlo o modificarlo.
- Ogni decisione dell'AI è firmata **amministratore-ai** nella cronologia e si annulla con "Ripristina".
- Se un evento viene modificato dopo la verifica, la decisione dell'AI viene scartata e l'evento ricontrollato.
- Il sito applica proposte e decisioni **ogni ora** (prima ogni 3 ore). Il pulsante nel pannello ora si chiama
  "Importa ora proposte e decisioni AI".

---

## 1. Aggiorna il database (prima di tutto)
Cloudflare → **Storage & Databases → D1 → mobilitazioni → Console**. Incolla ed esegui (Execute):
```sql
ALTER TABLE eventi ADD COLUMN sospetto TEXT;
```
Deve rispondere con 1 comando eseguito. (Se dice *duplicate column*, l'avevi già fatto: va bene.)

## 2. Carica i file su GitHub
Apri lo zip. Nel repository premi **Add file → Upload files**, sostituendo i file esistenti:
- dentro la cartella `src`: `amministratore.js` (nuovo), `moderazione.js`, `worker.js`
- dentro la cartella `public`: `modera.html`, `modera.js`, `modera.css`
- dentro la cartella `dati`: `decisioni.json` (nuovo, contiene solo `[]`)
- dentro la cartella `agente`: `ISTRUZIONI-AMMINISTRATORE.md` (nuovo: è il regolamento dell'AI)
- nella cartella principale: `wrangler.toml`, `amministratore.sql`, `AGGIORNAMENTO-AMMINISTRATORE.md`

Il modo più sicuro: entra in ogni cartella su GitHub e trascina lì i suoi file.
Premi **Commit changes** e aspetta 1–2 minuti che Cloudflare finisca il deploy (Deployments: spunta verde).

## 3. Prova il pannello
1. Apri `mappadellarivolta.org/modera.html` ed entra con il tuo codice.
2. Deve comparire la scheda **🤖 Sospetti** con il numero **0**.
3. Premi **🤖 Importa ora proposte e decisioni AI**: in fondo deve comparire "Decisioni AI: approvati 0 · sospetti 0".

Se il pannello dice *"Il database va aggiornato"*, rifai il passo 1.

## 4. L'attività programmata
L'attività **"Amministratore Mappa della Rivolta"** è già creata e gira alle 7:13 e alle 19:13.
Il primo giro dopo il caricamento dei file è quello che conta: finché i file non sono su GitHub, si ferma da sola e te lo dice.

---

## Come usarlo ogni giorno
1. Arriva la notifica → apri il resoconto: approvati, sospetti, lasciati a te.
2. Pannello → **🤖 Sospetti**: leggi il motivo, apri la fonte, poi Confermo o Non è sospetto.
3. Pannello → **Da controllare**: qui restano gli eventi che l'AI ti ha lasciato (es. solo Instagram). Decidi tu.
4. Se l'AI ha approvato qualcosa per errore: evento → **Cronologia** → ripristina la versione precedente, oppure **Rifiuta**.

## Se vuoi fermarlo
Nell'app Claude apri le attività programmate e metti in pausa "Amministratore Mappa della Rivolta".
Il sito continua a funzionare normalmente: le decisioni restano tutte a voi moderatori.
