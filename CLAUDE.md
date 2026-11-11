# Mappa della Rivolta — istruzioni per Claude Code

Mappa pubblica e collaborativa delle mobilitazioni in Italia (scioperi, cortei, presidi, picchetti, assemblee).
Sito: https://mappadellarivolta.org · Canale: https://t.me/MappaDellaRivolta · Regole: /regole.html

**Principio:** la mappa riporta informazioni pubbliche con la loro fonte. Non organizza, non promuove e non invita a partecipare ad alcuna iniziativa.

## Chi è l'amministratore
Non è uno sviluppatore professionista. Spiega in italiano semplice, frasi brevi, passaggi numerati. Quando serve un comando, di' dove scriverlo e cosa aspettarsi. Alla fine di ogni lavoro: una riga su cosa provare e una sul prossimo passo.

## Architettura
- Cloudflare Worker `mappadellarivolta` (`src/worker.js`, config in `wrangler.toml`) con database D1 `mobilitazioni`, deploy automatico da GitHub.
- I file pubblici stanno in `public/` (gli unici serviti dal sito); `/api/*` passa dal codice del Worker.
- Pagina HTML/CSS/JS con Leaflet e fondo OpenStreetMap (attribuzione obbligatoria).
- Regole sui contenuti lato server in `src/regole.js`.
- Proposte automatiche di eventi in `dati/proposte.json` (passano dai moderatori).
- Copie in sola lettura: GitHub Pages, Nostr (solo eventi verificati), file offline.

## Squadra (sub-agenti in `.claude/agents/`)
| Agente | Fa | Non fa |
|---|---|---|
| `programmatore` | scrive e corregge il codice | deploy, push, migrazioni remote |
| `amministratore` | verifica e approva eventi con fonte, lista sospetti, resoconto | toccare il codice, rifiutare |
| `verificatore` | controlla sicurezza, privacy, regole, rischi legali; esito OK / DA CORREGGERE / BLOCCA | modificare file |
| `web-designer` | grafica, leggibilità, accessibilità, grafiche social | toccare logica e API |

Flusso normale: **programmatore o web-designer → verificatore → (se OK) deploy con la skill `deploy-mappa` solo su richiesta dell'amministratore.**

## Regole non derogabili
1. Solo iniziative pacifiche. Niente inviti a violenza, blocchi o danneggiamenti, niente istruzioni per reati. Blocchi già annunciati solo come avviso "Possibili disagi:", mai approvati dall'AI.
2. Privacy: nessun dato personale di privati; organizzatori solo come sigle; nessuna foto con volti riconoscibili; nessun IP conservato.
3. Ogni evento ha una fonte verificabile; senza fonte resta `da_verificare`.
4. Notizie attuali (scioperi, date, norme) si verificano con una ricerca, mai a memoria.
5. Ogni scrittura pubblica: validazione server, Turnstile, honeypot, limite di invii, cronologia, annullamento.
6. Segreti solo in `wrangler secret`: mai nel codice, nei commit, nei log o in chat.
7. Nessun deploy, push o modifica al database di produzione senza conferma esplicita dell'amministratore.
8. Codice, testi e grafica originali: il sito francese è solo un modello funzionale.

## Skill disponibili (`.claude/skills/`)
mappa-mobilitazioni · segnalazioni-mobilitazioni · amministratore-mappa · verifica-fonti-mobilitazioni · sicurezza-mappa · consulente-legale-mappa · portavoce-mappa · web-designer-mappa · storia-instagram-mappa · moderazione-chat-eventi · deploy-mappa · frontend-design · skill-creator (per crearne di nuove)
