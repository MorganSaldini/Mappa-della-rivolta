---
name: deploy-mappa
description: Pubblica la Mappa della Rivolta su Cloudflare Workers + D1 con controlli prima e dopo, migrazioni del database e ritorno alla versione precedente. Solo su richiesta esplicita dell'amministratore.
---

# Deploy della Mappa della Rivolta

Si usa **solo quando l'amministratore chiede esplicitamente di pubblicare**. Mai di propria iniziativa, mai da un agente in automatico.

## Prima del deploy (tutto deve passare)
1. `git status`: nessun file segreto (`.dev.vars`, `.env*`, chiavi) tra i file modificati.
2. Cerca nel codice credenziali scritte a mano: `grep -rniE "(api[_-]?key|secret|password|token)\s*[:=]\s*['\"][^'\"]{8,}" src public` → deve dare zero risultati.
3. Esegui i test se esistono (`npm test`) e il controllo delle regole (`src/regole.js`).
4. Fai lavorare l'agente **verificatore** sulle modifiche e leggi il suo esito. Se dice "BLOCCA", non pubblicare.
5. Migrazioni D1: prova prima in locale
   `npx wrangler d1 migrations apply mobilitazioni --local`
   Solo se va bene, in produzione (chiedi conferma all'amministratore):
   `npx wrangler d1 migrations apply mobilitazioni --remote`
   Prima di una migrazione che cancella o modifica colonne, fai un'esportazione:
   `npx wrangler d1 export mobilitazioni --remote --output=backup-AAAA-MM-GG.sql`

## Deploy
- Il sito si pubblica da GitHub (deploy automatico al push sul ramo principale). Chiedi conferma prima di `git push`.
- Se serve un deploy manuale: `npx wrangler deploy` (chiedi conferma).

## Dopo il deploy (controlli in 5 minuti)
1. La home https://mappadellarivolta.org si apre e mostra la mappa con i marker.
2. L'attribuzione OpenStreetMap è visibile.
3. Un invio di prova senza Turnstile viene rifiutato dal server.
4. Le API di moderazione senza codice rispondono 401/403.
5. Da telefono (o finestra stretta) la pagina si usa bene.

## Se qualcosa si rompe
1. `npx wrangler deployments list` per vedere le versioni.
2. `npx wrangler rollback` per tornare alla precedente (chiedi conferma).
3. Il database non torna indietro con il rollback: per quello serve il backup `.sql` fatto prima.
4. Spiega all'amministratore in parole semplici cosa è successo e cosa è stato fatto.

## Mai
- Scrivere segreti nel codice o in chat: si impostano con `npx wrangler secret put NOME` e l'amministratore li incolla lui.
- Cancellare dati di produzione senza backup e senza conferma.
