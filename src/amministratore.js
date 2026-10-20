import { verificabile } from './regole.js';
// Applica le decisioni dell'amministratore AI scritte nel file dati/decisioni.json del repository.
// L'amministratore AI non ha codici d'accesso: scrive le decisioni nel repository e il sito le applica qui.
//
// Azioni possibili (tutte in cronologia, tutte annullabili dal pannello con "Ripristina"):
//  - "approva":   un evento "da_verificare" diventa "verificato" (e va sul canale Telegram)
//  - "sospetto":  l'evento entra nella scheda "Sospetti" del pannello; decide un moderatore umano
//  - "correggi":  corregge tipo, titolo, orari, luogo, organizzatori o fonte (passa dalle regole del sito)
//  - "deverifica": un evento "verificato" torna "da_verificare" (es. fonte assente o non conforme)
//  - "nascondi":  toglie dalla mappa un contenuto non pubblicabile (inviti, istruzioni per reati, insulti,
//                 dati personali, falsi evidenti). Un moderatore può ripristinarlo.
// L'amministratore AI non può rifiutare definitivamente né cancellare nulla.
//
// Una decisione si applica solo se l'evento è ancora identico a quando è stato verificato
// (stesso "aggiornato_il"). Ogni decisione si applica una volta sola e finisce in cronologia.
import decisioni from '../dati/decisioni.json';
import { adessoRoma, sha256hex, pulisci, scriviCronologia } from './lib.js';
import { leggiEvento, salvaVersione, validaEvento } from './dati.js';

// Campi che l'AI può correggere (data, comune e coordinate no: per quelli segnala un sospetto)
const CORREGGIBILI = ['tipo', 'titolo', 'ora_inizio', 'ora_fine', 'luogo', 'organizzatori', 'fonte'];
import { pubblicaEvento, pubblicaGruppo } from './telegram.js';

export const ATTORE_AI = 'amministratore-ai';
const SITO = 'https://mappadellarivolta.org';

function fontiValide(f) {
  if (!Array.isArray(f)) return [];
  return f.map((u) => {
    try { const x = new URL(String(u)); return ['http:', 'https:'].includes(x.protocol) ? x.href.slice(0, 300) : null; } catch { return null; }
  }).filter(Boolean).slice(0, 6);
}

export async function importaDecisioni(env, sitoUrl = SITO) {
  const elenco = Array.isArray(decisioni) ? decisioni : [];
  const esito = { lette: elenco.length, approvati: 0, sospetti: 0, corretti: 0, deverificati: 0, nascosti: 0, gia_applicate: 0, saltate: [] };
  const gruppiDaPubblicare = new Set();

  for (const d of elenco) {
    if (!d || typeof d !== 'object') continue;
    const id = String(d.id || '').slice(0, 120);
    const azione = String(d.azione || '');
    const versioneVista = String(d.aggiornato_il || '');
    const motivo = pulisci(d.motivo, 300);
    const fonti = fontiValide(d.fonti_controllate);
    if (!id || !['approva', 'sospetto', 'correggi', 'deverifica', 'nascondi'].includes(azione) || !versioneVista || motivo.length < 5) {
      esito.saltate.push(`${id || '?'}: decisione incompleta`);
      continue;
    }

    const chiave = await sha256hex(['decisione', id, versioneVista, azione].join('|'));
    if (await env.DB.prepare('SELECT 1 FROM importati WHERE chiave = ?').bind(chiave).first()) { esito.gia_applicate++; continue; }
    const segna = () => env.DB.prepare('INSERT OR IGNORE INTO importati (chiave, creato_il) VALUES (?, ?)').bind(chiave, adessoRoma()).run();

    const e = await leggiEvento(env.DB, id);
    if (!e) { esito.saltate.push(`${id}: evento non trovato`); await segna(); continue; }
    if (e.aggiornato_il !== versioneVista) {
      // L'evento è cambiato dopo la verifica: la decisione non vale più (verrà ricontrollato al prossimo giro)
      esito.saltate.push(`${id}: cambiato dopo la verifica`);
      await segna();
      continue;
    }

    const nota = `Amministratore AI: ${motivo}` + (fonti.length ? ` · Fonti: ${fonti.join(' ')}` : '');

    if (azione === 'approva') {
      // Si approva solo ciò che è ancora da verificare, ha una fonte, non è sospetto e non ha segnalazioni aperte
      if (e.stato !== 'da_verificare') { esito.saltate.push(`${id}: non è più da verificare (${e.stato})`); await segna(); continue; }
      if (!e.fonte) { esito.saltate.push(`${id}: senza fonte, non approvabile`); await segna(); continue; }
      if (e.sospetto) { esito.saltate.push(`${id}: è nella lista sospetti, decide un moderatore`); await segna(); continue; }
      if (e.segnalazioni_aperte > 0) { esito.saltate.push(`${id}: ha segnalazioni aperte, decide un moderatore`); await segna(); continue; }
      if (!fonti.length) { esito.saltate.push(`${id}: approvazione senza fonti controllate`); await segna(); continue; }
      const no = verificabile(e);
      if (no) { esito.saltate.push(`${id}: ${no}`); await segna(); continue; }

      const nuovo = await salvaVersione(env.DB, e, { stato: 'verificato', segnalazioni_aperte: 0 }, 'approvato_da_ai', ATTORE_AI);
      await env.DB.prepare('UPDATE eventi SET note = ? WHERE id = ?').bind(nota.slice(0, 1000), id).run();
      nuovo.telegram_msg_id = e.telegram_msg_id;
      if (e.gruppo) gruppiDaPubblicare.add(e.gruppo);
      else await pubblicaEvento(env, nuovo, sitoUrl).catch((x) => console.error('Telegram', x));
      esito.approvati++;
    } else if (azione === 'correggi') {
      if (['rifiutato', 'nascosto'].includes(e.stato)) { esito.saltate.push(`${id}: già fuori dalla mappa`); await segna(); continue; }
      const campi = d.campi && typeof d.campi === 'object' ? d.campi : {};
      const scelti = Object.keys(campi).filter((k) => CORREGGIBILI.includes(k));
      if (!scelti.length) { esito.saltate.push(`${id}: nessun campo correggibile`); await segna(); continue; }
      const unito = { ...e };
      for (const k of scelti) unito[k] = campi[k] === '' ? null : campi[k];
      const v = validaEvento(unito, { consentiPassato: true });
      if (v.errore) { esito.saltate.push(`${id}: correzione non valida (${v.errore})`); await segna(); continue; }
      const cambi = {};
      for (const k of ['tipo', 'titolo', 'ora_inizio', 'ora_fine', 'luogo', 'organizzatori', 'fonte']) cambi[k] = v.dati[k];
      // Se dopo la correzione non è più verificabile (es. è diventato un avviso o non ha fonte), torna da verificare
      if (e.stato === 'verificato' && verificabile({ ...e, ...cambi, organizzatori: v.dati.organizzatori }, { umano: true })) cambi.stato = 'da_verificare';
      if (e.stato === 'verificato' && v.avviso) cambi.stato = 'da_verificare';
      if (e.stato === 'verificato' && d.deverifica === true) cambi.stato = 'da_verificare';
      await salvaVersione(env.DB, e, cambi, 'corretto_da_ai', ATTORE_AI);
      await env.DB.prepare('UPDATE eventi SET note = ? WHERE id = ?').bind(nota.slice(0, 1000), id).run();
      esito.corretti++;
    } else if (azione === 'deverifica') {
      if (e.stato !== 'verificato') { esito.saltate.push(`${id}: non è verificato (${e.stato})`); await segna(); continue; }
      await salvaVersione(env.DB, e, { stato: 'da_verificare' }, 'deverificato_da_ai', ATTORE_AI);
      await env.DB.prepare('UPDATE eventi SET note = ? WHERE id = ?').bind(nota.slice(0, 1000), id).run();
      esito.deverificati++;
    } else if (azione === 'nascondi') {
      if (['rifiutato', 'nascosto'].includes(e.stato)) { esito.saltate.push(`${id}: già fuori dalla mappa`); await segna(); continue; }
      await salvaVersione(env.DB, e, { stato: 'nascosto' }, 'nascosto_da_ai', ATTORE_AI);
      await env.DB.prepare('UPDATE eventi SET note = ?, sospetto = ? WHERE id = ?').bind(nota.slice(0, 1000), nota.slice(0, 1000), id).run();
      esito.nascosti++;
    } else {
      if (['rifiutato', 'nascosto'].includes(e.stato)) { esito.saltate.push(`${id}: già fuori dalla mappa`); await segna(); continue; }
      await env.DB.prepare('UPDATE eventi SET sospetto = ? WHERE id = ?').bind(nota.slice(0, 1000), id).run();
      await scriviCronologia(env.DB, { ...e, sospetto: nota }, 'segnalato_sospetto', ATTORE_AI);
      esito.sospetti++;
    }
    await segna();
  }

  // Eventi in più città: un solo messaggio Telegram con l'elenco delle città verificate
  for (const g of gruppiDaPubblicare) {
    const { results } = await env.DB.prepare("SELECT * FROM eventi WHERE gruppo = ? AND stato = 'verificato'").bind(g).all();
    if (results.length) await pubblicaGruppo(env, results, sitoUrl).catch((x) => console.error('Telegram', x));
  }
  return esito;
}
