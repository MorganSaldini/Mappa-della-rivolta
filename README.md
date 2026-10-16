# Mappa delle mobilitazioni in Italia — Fase 1

Pagina web con mappa interattiva di cortei, presidi, scioperi e assemblee, aperta ai contributi della community.

**Cosa c'è in questa fase**
- Mappa con segnaposto colorati per tipo; i gruppi si uniscono quando la mappa è lontana.
- Contatori, ricerca per comune, pulsante "Vicino a me", elenco completo sotto la mappa.
- Chiunque, senza account, può:
  - **aggiungere un evento**: compare come "Da verificare";
  - **segnalare un problema**: dopo 3 segnalazioni da dispositivi diversi l'evento si nasconde da solo.
- Database condiviso su Cloudflare D1, con cronologia di ogni cambiamento.
- Protezioni:
  - limite di 5 invii all'ora per dispositivo;
  - trappola anti-bot e verifica Cloudflare Turnstile;
  - blocco di email e numeri di telefono nei testi;
  - nessun IP salvato.
- 5 eventi di esempio, inventati, da cancellare prima del lancio.

Il pannello per i moderatori arriva nella Fase 2. Fino ad allora la moderazione si fa dalla console del database (vedi in fondo).

## I file

| File | A cosa serve |
|---|---|
| `public/config.js` | **L'unico file da personalizzare**: nome, link "Partecipa", chiave anti-bot, contatto |
| `public/index.html` | La pagina. Qui scrivi anche il testo "Perché ci mobilitiamo" |
| `public/regole.html` | Regole della community |
| `public/style.css`, `public/app.js` | Grafica e funzionamento della pagina |
| `src/...` | Il "motore" (API) che legge e scrive nel database |
| `schema.sql` | Crea le tabelle del database (si usa una volta sola) |
| `esempi.sql` | I 5 eventi di esempio |
| `wrangler.toml` | Configurazione per Cloudflare |

---

## Mettere il sito online (tutto dal browser, senza terminale)

Servono circa 30–40 minuti. Tutto è gratuito. Le voci dei menu di Cloudflare a volte cambiano nome: se non trovi qualcosa, cerca la parola chiave nella barra di ricerca della dashboard.

### 1. Crea gli account
1. Su **github.com** crea un account gratuito.
2. Su **dash.cloudflare.com** crea un account gratuito.

### 2. Carica i file su GitHub
1. Su GitHub premi **New repository**. Come nome usa `mappa-mobilitazioni`, scegli **Public** o **Private** e premi **Create repository**.
2. Nella pagina del repository vuoto clicca **uploading an existing file**.
3. Trascina dentro **tutto il contenuto** della cartella `mappa-mobilitazioni`, comprese le cartelle `public` e `src`.
   - Non serve caricare `node_modules` né `.wrangler`, se ci sono.
4. Premi **Commit changes**.
5. Controlla che su GitHub ci siano le cartelle `public` e `src` e il file `wrangler.toml`.

### 3. Crea il database
1. Su Cloudflare apri **Storage & Databases → D1 SQL Database → Create**.
2. Chiama il database `mobilitazioni` e crealo.
3. Nella pagina del database copia il **Database ID**: è un codice lungo, tipo `a1b2c3d4-...`.
4. Apri la scheda **Console**. Incolla tutto il contenuto di `schema.sql` e premi **Execute**.
5. Fai lo stesso con il contenuto di `esempi.sql`, così vedrai subito i 5 eventi di prova.

### 4. Collega il database al codice
1. Su GitHub apri il file `wrangler.toml` e clicca la matita ✏️ per modificarlo.
2. Sostituisci `INCOLLA-QUI-ID-DATABASE` con il Database ID copiato al passo 3.
3. Premi **Commit changes**.

### 5. Pubblica il sito come Worker Cloudflare
1. Su Cloudflare apri **Workers & Pages → Create → Import a repository** (Importa da Git).
2. Collega GitHub e seleziona il repository `mappa-mobilitazioni`.
3. Impostazioni:
   - Project name: `mappa-mobilitazioni`
   - Build command: lascialo **vuoto**
   - Deploy command: `npx wrangler deploy` (di solito è già scritto così)
4. Premi **Deploy**.
5. Dopo un minuto il sito è online a un indirizzo del tipo `https://mappa-mobilitazioni.<tuo-nome>.workers.dev`.

Se nel registro compare *"Missing entry-point"*, su GitHub manca il file `wrangler.toml` aggiornato o la cartella `src`.
Se compare un errore sul database (*"D1"*, *"database_id"*), controlla l'ID inserito al passo 4.

**Prova:** apri l'indirizzo e controlla che si vedano la mappa e i 5 eventi di esempio. Se la mappa è vuota con il messaggio "Impossibile caricare le mobilitazioni", controlla l'ID del database nel passo 4.

### 6. Aggiungi il "sale segreto" (privacy)
Serve a rendere anonimo il codice usato per il limite di invii.
1. Nel Worker `mappa-mobilitazioni` apri **Settings → Variables and Secrets** e premi **Add**.
2. Aggiungi una variabile:
   - nome: `SALE_SEGRETO`
   - tipo: **Secret**
   - valore: una frase lunga e casuale, ad esempio 30 lettere e numeri a caso.
3. Premi **Deploy** per salvare: il Worker riparte da solo con il nuovo segreto.

### 7. Attiva l'anti-bot Turnstile
1. Su Cloudflare apri **Turnstile → Add widget**.
2. Come dominio metti il tuo indirizzo `...workers.dev` (e il tuo dominio, se ne hai uno). Come modalità scegli **Managed**.
3. Ottieni due chiavi:
   - la **Site Key** (pubblica): su GitHub mettila in `public/config.js`, alla riga `turnstileSiteKey: '...'`;
   - la **Secret Key**: nel Worker aggiungila come Secret con nome `TURNSTILE_SECRET`, come al passo 6.
4. Salvare `config.js` su GitHub ripubblica il sito da solo.

Finché `TURNSTILE_SECRET` non è impostato il controllo anti-bot è spento. Va bene per le prove, non per il lancio.

### 8. Personalizza e prepara il lancio
1. In `public/config.js` compila:
   - `linkPartecipa`: il canale Telegram o il sito;
   - `contattoRimozioni`: l'email del progetto per richieste di rimozione. Usa un indirizzo dedicato, non quello personale.
2. In `public/index.html` sostituisci il testo della sezione "Perché ci mobilitiamo" con il tuo appello, i dati e le fonti.
3. **Cancella gli eventi di esempio** dalla Console D1:
   ```sql
   DELETE FROM cronologia WHERE evento_id IN (SELECT id FROM eventi WHERE note = 'esempio');
   DELETE FROM eventi WHERE note = 'esempio';
   ```
4. Facoltativo: un dominio tuo (es. `mappamobilitazioni.it`), da collegare in **Settings → Domains & Routes** del Worker.

Ogni modifica che salvi su GitHub viene pubblicata da sola in circa un minuto.

---

## Moderare nella Fase 1 (Console D1)

Apri **D1 → mobilitazioni → Console**, incolla una di queste istruzioni e premi Execute.

**Vedere le nuove segnalazioni da controllare**
```sql
SELECT id, tipo, titolo, data, comune, luogo, fonte FROM eventi
WHERE stato = 'da_verificare' ORDER BY data;
```

**Approvare un evento** (sostituisci l'id)
```sql
UPDATE eventi SET stato = 'verificato', versione = versione + 1, aggiornato_il = datetime('now','localtime')
WHERE id = 'ID-EVENTO';
INSERT INTO cronologia (evento_id, versione, azione, attore, creato_il)
SELECT id, versione, 'approvato', 'admin', datetime('now','localtime') FROM eventi WHERE id = 'ID-EVENTO';
```

**Rifiutare un evento**: come sopra, con `'rifiutato'` al posto di `'verificato'`.

**Segnare un evento come annullato**: come sopra, con `'annullato'`.

**Vedere le segnalazioni di problemi aperte**
```sql
SELECT p.evento_id, e.titolo, e.stato, p.motivo, p.nota, p.creato_il
FROM problemi p JOIN eventi e ON e.id = p.evento_id
WHERE p.stato = 'aperta' ORDER BY p.creato_il DESC;
```

**Rimettere visibile un evento nascosto per errore**
```sql
UPDATE eventi SET stato = 'verificato', segnalazioni_aperte = 0, versione = versione + 1 WHERE id = 'ID-EVENTO';
UPDATE problemi SET stato = 'chiusa' WHERE evento_id = 'ID-EVENTO';
```

**Cambiare le impostazioni**: ad esempio, per far apparire le segnalazioni solo dopo l'approvazione:
```sql
UPDATE impostazioni SET valore = 'no' WHERE chiave = 'pubblicazione_immediata';
```
Altre impostazioni: `max_invii_ora` (5), `segnalazioni_per_nascondere` (3), `giorni_conservazione` (30).

**Pulizia mensile** (cancella gli eventi finiti da più di 30 giorni, come promesso nella nota privacy)
```sql
DELETE FROM problemi   WHERE evento_id IN (SELECT id FROM eventi WHERE data < date('now','-30 days'));
DELETE FROM cronologia WHERE evento_id IN (SELECT id FROM eventi WHERE data < date('now','-30 days'));
DELETE FROM eventi     WHERE data < date('now','-30 days');
```

---

## Note
- **Ricerca dei comuni**: usa il servizio gratuito Nominatim di OpenStreetMap. Il servizio accetta al massimo 1 ricerca al secondo per utente. Se il sito avrà molto traffico, nella Fase 3 conviene passare a un elenco dei comuni ISTAT ospitato sul sito.
- **Fondo mappa**: usa i server di OpenStreetMap, che vanno bene per un traffico moderato. Se le visite crescono molto, si passa a mappe ospitate in proprio (Protomaps).
- **Responsabilità**: chi gestisce il sito deve rimuovere i contenuti illeciti quando gli vengono segnalati. Tieni d'occhio le segnalazioni di problemi e l'email di contatto.

## Prova in locale (facoltativo, per chi usa il terminale)
```bash
npm install
npx wrangler d1 execute mobilitazioni --local --file=schema.sql
npx wrangler d1 execute mobilitazioni --local --file=esempi.sql
npx wrangler dev
# apri http://localhost:8787
```
