---
name: moderazione-chat-eventi
description: Regole e procedura per moderare le chat Telegram collegate agli eventi della Mappa della Rivolta (commenti sotto i messaggi del canale) e per configurare il bot di moderazione. Usala per scrivere o rivedere le regole delle chat, il messaggio fissato o il codice del bot.
---

# Moderazione delle chat degli eventi

Le chat sotto gli eventi sono **spazi dei partecipanti, non del progetto**: la mappa informa e non organizza. Sono anche il punto più delicato dal lato legale, perché chi gestisce uno spazio risponde di ciò che lascia online dopo averlo visto.

## Cosa è permesso
- Accordarsi per partecipare a iniziative lecite: punto di ritrovo pubblico già annunciato, passaggi in auto, treni, cosa portare (acqua, ombrello).
- Domande sull'evento, correzioni di orari e luoghi, segnalare che è stato annullato.

## Cosa si toglie subito (entro 24 ore da quando lo si vede, prima possibile)
1. Inviti a violenza, scontri, danneggiamenti, "rompere", "bruciare", armi.
2. Organizzazione di blocchi stradali, occupazioni, forzare cordoni o zone rosse.
3. Istruzioni per commettere reati o per evitare l'identificazione durante reati.
4. Dati personali: nomi, numeri, indirizzi, foto con volti riconoscibili, targhe.
5. Insulti, minacce, accuse a persone riconoscibili.
6. Notizie false allarmanti ("stanno arrestando tutti", "stuprano") senza fonte.
7. Posizioni o spostamenti delle forze dell'ordine.

## Procedura
1. Il bot cancella in automatico i messaggi con parole della lista nera e i link non consentiti; registra l'azione (senza salvare il nome dell'autore nel database del sito).
2. I casi dubbi vanno a un moderatore umano, che decide entro poche ore.
3. Recidiva o gravità: silenzia o banna l'utente nella chat.
4. Se arriva una richiesta delle autorità: **non cancellare nulla di quanto richiesto**, conserva le comunicazioni, avvisa l'amministratore e sentite un legale prima di rispondere nel merito.
5. Dopo l'evento la chat si chiude; viene cancellata dopo alcune settimane, come dichiarato nelle regole.

## Messaggio fissato (testo base, tono neutro)
> Questa chat serve a chi vuole partecipare all'iniziativa in modo pacifico: orari, ritrovo, passaggi. Non si organizzano blocchi o scontri, non si pubblicano dati o foto di persone, non si segnalano le forze dell'ordine. I messaggi contrari alle regole vengono rimossi. La chat è pubblica: quello che scrivi è visibile con il tuo nome Telegram. Regole: https://mappadellarivolta.org/regole.html

## Codice del bot
- Token del bot solo nelle variabili segrete (`wrangler secret put TELEGRAM_BOT_TOKEN`), mai nel codice.
- La lista nera sta in un file separato e versionato, così si può correggere senza toccare il resto.
- Ogni cancellazione automatica deve essere annullabile da un moderatore (il bot salva il testo rimosso per qualche giorno in un'area visibile solo ai moderatori, poi lo elimina).
