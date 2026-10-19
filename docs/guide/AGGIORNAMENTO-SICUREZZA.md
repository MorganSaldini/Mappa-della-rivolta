# Aggiornamento sicurezza — il sito regge le giornate di picco

Tempo: circa 30 minuti. Segui i passi **in ordine**: il passo 1 va fatto prima di caricare i file.

## Cosa arriva
- **Copia condivisa dell'elenco eventi (60 secondi)**: mille visite nello stesso minuto fanno una sola lettura sul database.
  Quando qualcuno aggiunge, corregge o modera un evento, la copia si rifà subito.
- **Copia di riserva**: ogni mezz'ora GitHub salva l'elenco degli eventi in un file statico (`public/dati/eventi.json`).
  Se in un giorno di sciopero il sito supera il limite gratuito di Cloudflare, la mappa mostra questa copia
  con l'avviso "stai vedendo la copia di riserva". I file statici su Cloudflare non hanno limiti di visite.
- **Terza riserva**: se manca anche la copia, la mappa mostra l'ultima lista vista su quel telefono.
- **Anti-bot sempre acceso**: prima, se mancava il segreto di Turnstile, la verifica veniva saltata.
  Ora in quel caso gli invii vengono **rifiutati** (per questo serve il passo 1).
- **Tetto per tutto il sito**: se in un'ora arrivano più di 60 nuovi invii in totale (spam, attacco), i nuovi eventi
  smettono di comparire subito e restano in coda ai moderatori. Lo vedi in Pannello → Impostazioni → "Pubblicazione immediata: no".
- **Intestazioni di sicurezza** su tutte le pagine (impediscono a script estranei di girare nel sito e ad altri siti
  di inglobare la mappa).
- **Leaflet dentro il sito** (cartella `public/vendor`): la mappa non dipende più da un sito esterno.
- **Interruttore di emergenza** `SOLO_LETTURA`: la mappa resta visibile ma i visitatori non possono inviare nulla.
- Richieste troppo grandi rifiutate; corretto l'indirizzo per Google (puntava ancora a paginadellarivolta.it).

---

## 1. Controlla i segreti e Turnstile (prima di tutto)
**a. Segreti del Worker.** Cloudflare → **Workers & Pages → mappadellarivolta → Settings → Variables and Secrets**.
Devono esserci tutti e tre:
- `TURNSTILE_SECRET` (tipo Secret) — la Secret Key di Turnstile
- `SALE_SEGRETO` (tipo Secret)
- `ADMIN_CODICE` (tipo Secret)

Se manca `TURNSTILE_SECRET`: Cloudflare → **Turnstile** → il tuo widget → copia la **Secret Key** →
torna su Variables and Secrets → **Add** → Type **Secret**, Name `TURNSTILE_SECRET`, Value la chiave → **Deploy**.
**Non incollare la chiave in chat.**

**b. Domini di Turnstile.** Cloudflare → **Turnstile** → il tuo widget → **Hostnames**. Devono esserci tutti e tre:
- `mappadellarivolta.org`
- `www.mappadellarivolta.org`
- `mappadellarivolta.morgansaldini.workers.dev`

Se ne manca uno aggiungilo e salva. Senza, il modulo "Aggiungi" non funziona su quell'indirizzo.

## 2. Carica i file su GitHub
Apri lo zip. Nel repository premi **Add file → Upload files** e trascina dentro, sostituendo i file esistenti:
- dalla cartella `src`: `worker.js`, `eventi.js`, `lib.js` (vanno **dentro** la cartella `src`)
- dalla cartella `public`: `app.js`, `index.html`, `_headers` (vanno **dentro** la cartella `public`)
- la cartella `public/vendor` intera (contiene `leaflet` con dentro la cartella `images`)
- la cartella `public/dati` (contiene `eventi.json`, per ora vuoto: lo riempie il passo 3)
- `AGGIORNAMENTO-SICUREZZA.md` (questa guida) e `README.md` (nella cartella principale)

Il modo più sicuro: entra nella cartella `src` su GitHub e trascina lì i 3 file; poi entra in `public` e trascina
`app.js`, `index.html`, `_headers` e le cartelle `vendor` e `dati`.

Premi **Commit changes** e aspetta 1–2 minuti che Cloudflare finisca il deploy
(Workers & Pages → mappadellarivolta → **Deployments**: deve comparire una riga nuova con la spunta verde).

## 3. Attiva la copia di riserva (GitHub Actions)
La cartella `.github` inizia con un punto e spesso il trascinamento la ignora: per questo la crei a mano.
1. Nel repository premi **Add file → Create new file**.
2. Come nome scrivi esattamente: `.github/workflows/copia-eventi.yml`
   (quando scrivi `/` GitHub crea le cartelle da solo).
3. Apri il file `copia-eventi.yml` dello zip (cartella `.github/workflows`) con un editor di testo, copia **tutto**
   e incollalo nel riquadro grande. Premi **Commit changes**.
4. Apri la scheda **Actions** del repository. Se compare un pulsante verde tipo *"I understand my workflows, go ahead and enable them"*, premilo.
5. A sinistra clicca **Copia di riserva degli eventi** → a destra **Run workflow** → **Run workflow**.
6. Dopo circa un minuto deve comparire un pallino **verde**. Nella pagina principale del repository vedrai
   un nuovo salvataggio "Copia di riserva degli eventi", e Cloudflare rifà il sito da solo.

Da qui in poi gira da sola ogni mezz'ora e salva solo quando gli eventi cambiano.

## 4. Prova che tutto funzioni
1. Apri `https://mappadellarivolta.org/dati/eventi.json`: deve iniziare con `{"ok":true,"eventi":[{...` e
   contenere `"copia_del"` con la data di oggi.
2. Apri `https://mappadellarivolta.org`: la mappa, i segnaposto e lo sfondo OpenStreetMap devono vedersi come prima.
   Prova anche dal telefono.
3. Premi **+ Aggiungi**: deve comparire il riquadro di verifica di Cloudflare (Turnstile). Non serve inviare nulla.
4. Prova "Trova una mobilitazione" con il nome di un comune: la mappa deve spostarsi lì.
5. Facoltativo, da computer: apri `https://securityheaders.com`, scrivi `mappadellarivolta.org` e premi Scan.
   Dovresti vedere **A** o A+.

Se un punto non funziona (es. la mappa resta grigia o Turnstile non compare), dimmelo: di solito è una riga di `_headers` da allargare.
Per tornare indietro subito: su GitHub apri `public/_headers` → icona cestino → Commit. Il resto può restare.

## 5. Impostazioni gratuite dal pannello Cloudflare
Le voci dei menu a volte cambiano nome: se non trovi qualcosa, cerca la parola nella barra di ricerca della dashboard.
1. **Sempre HTTPS**: dominio `mappadellarivolta.org` → **SSL/TLS → Edge Certificates** → **Always Use HTTPS** acceso.
2. **Limite di richieste alle API**: dominio → **Security → WAF → Rate limiting rules → Create rule**:
   - Nome: `limite API`
   - Se: **URI Path** → **starts with** → `/api/`
   - Stesso indirizzo IP, **più di 50 richieste in 10 secondi** (un visitatore normale ne fa 2 o 3)
   - Azione: **Block** → Deploy.
   Sul piano gratuito c'è posto per una regola: questa è quella giusta.
3. **Bot Fight Mode: lascialo spento.** Blocca anche i calendari di Google e Apple che leggono il feed `.ics`,
   e sul piano gratuito non si può fare eccezione. La protezione dai bot la fanno già Turnstile e i limiti.
4. **Notifiche**: in alto a destra (account) → **Notifications → Add** → scegli l'avviso per gli attacchi DDoS
   (HTTP DDoS Attack Alert), se è disponibile per il tuo piano, con la tua email del progetto.
5. **Account protetti**: attiva la **verifica in due passaggi** su Cloudflare (My Profile → Authentication) e su
   GitHub (Settings → Password and authentication). È la protezione più importante di tutte: chi entra nei tuoi
   account può cambiare il sito.

---

## Se il sito va giù o è sotto attacco
1. **Guarda cosa succede**: Workers & Pages → mappadellarivolta → **Metrics** (richieste, errori).
   Errori 1027 o "limit exceeded" = è finito il limite gratuito della giornata (si azzera all'1 di notte, ora italiana: alle 2 con l'ora legale).
   In quel caso la mappa mostra da sola la copia di riserva: non devi fare nulla.
2. **Giornata di grande sciopero in arrivo** e le richieste del giorno prima superavano 60.000? Passa a
   **Workers Paid** (5 $/mese: Workers & Pages → Plans). Toglie i limiti giornalieri in pochi minuti; puoi tornare indietro dopo.
3. **Ondata di eventi falsi (spam)**: Pannello → Impostazioni → Pubblicazione immediata **no** (il sito lo fa da solo oltre
   60 invii/ora). Se non basta: Worker → Settings → Variables and Secrets → **Add** → Type **Text**, Name `SOLO_LETTURA`,
   Value `1` → Deploy. La mappa resta visibile, gli invii si fermano. Per riaprire, cancella la variabile.
4. **Attacco di traffico**: dominio → **Overview** → **Under Attack Mode** acceso (i visitatori vedono 5 secondi di controllo).
   Spegnilo appena finisce.
5. **Contenuti vandalizzati**: Pannello → evento → **Cronologia → Ripristina**. Se sono tanti, scrivimi: si può riportare
   tutto il database a un'ora precedente (Time Travel di D1).
6. **Codice di un moderatore rubato**: Pannello → Moderatori → **Revoca accesso**, poi controlla in cronologia le sue azioni.
7. Avvisa sul canale Telegram con un messaggio sobrio: *"Il sito è lento per il traffico, la mappa resta consultabile."*

## Per cambiare il tetto di invii
Il tetto di 60 invii l'ora per tutto il sito si cambia dalla Console D1
(Storage & Databases → D1 → mobilitazioni → Console). Per esempio, per portarlo a 100:
```sql
INSERT INTO impostazioni (chiave, valore) VALUES ('max_invii_ora_totali', '100') ON CONFLICT(chiave) DO UPDATE SET valore = excluded.valore;
```

## Per chi prova il sito sul proprio computer
Con `npx wrangler dev`, senza Turnstile, aggiungi `SVILUPPO=1` nel file `.dev.vars` (che non va mai su GitHub).
