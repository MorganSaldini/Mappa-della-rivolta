// Regole sui contenuti (ottobre 2026): la mappa fa informazione, non organizza e non invita.
//
// Tre categorie:
//  1. Mobilitazioni pacifiche (sciopero, corteo, presidio, assemblea, picchetto): pubblicabili.
//  2. Avvisi di possibili disagi (blocchi e occupazioni): solo come avviso, tipo "altro",
//     titolo "Possibili disagi: …", nessun organizzatore, nessun orario di ritrovo, fonte obbligatoria
//     (giornalistica o istituzionale: lo controlla un moderatore umano prima di verificarlo).
//  3. Non pubblicabili: inviti a bloccare, occupare, forzare o scontrarsi.
// Inoltre: nessun evento diventa "verificato" senza una fonte.

import { oggiRoma } from './lib.js';

// Inviti ad azioni non pubblicabili (prima persona plurale o esortazioni). Gli inviti a cortei,
// presìdi e scioperi pacifici ("tutti in piazza") restano permessi.
export const RE_INVITO = new RegExp([
  'blocchiamo\\b', 'bloccheremo\\b', 'blocchiamol[aoie]\\b', 'blocco totale',
  'occupiamo\\b', 'occuperemo\\b', 'occupiamol[aoie]\\b', 'okkupiamo\\b', 'riprendiamoci\\b', 'prendiamoci\\b',
  'assaltiamo\\b', 'scontriamoci\\b', 'guerriglia', 'bruciamo\\b', 'sfondiamo\\b', 'spacchiamo\\b', 'devastiamo\\b',
  'attacchiamo\\b', 'sabotiamo\\b', 'forziamo\\b', 'contro la polizia',
].map((p) => `\\b${p}`).join('|'), 'i');

// Sigle giudicate non affidabili dall'amministratore (elenco in agente/ISTRUZIONI-AMMINISTRATORE.md).
// I loro eventi non si pubblicano: i nuovi invii vengono rifiutati, quelli già presenti nascosti.
// Solo l'amministratore umano aggiunge o toglie sigle.
export const RE_SIGLE_ESCLUSE = /movimento\s*(?:del\s*)?17\s*(?:ottobre|\/\s*10)|\bmovimento17|\bm17\b/i;

export function siglaEsclusa(e) {
  let org = e.organizzatori;
  if (typeof org === 'string') { try { org = JSON.parse(org); } catch { org = [org]; } }
  return RE_SIGLE_ESCLUSE.test([e.titolo, e.luogo, ...(org || [])].join(' | '));
}

// Blocchi e occupazioni (escluse forme di sciopero come il "blocco degli straordinari")
const RE_OCCUPAZIONE = /\b(occupazion\w*|occupat[oaie]\b|occupa\b|okkupa\w*|autogestion\w*)/i;
const RE_BLOCCO = /\bblocc(o|hi|aggio|ato|ata|ati|ate)?\b/i;
const RE_FORMA_SCIOPERO = /\b(straordinar\w*|prestazion\w*|reperibilit\w*|mansioni)\b/i;
const PREFISSO = 'Possibili disagi: ';
const SIGLE = new Set(['CGIL', 'CISL', 'ENAV', 'AMTAB', 'ATVO', 'USB', 'CUB', 'ATM', 'ANM', 'ASP', 'TPL', 'COBAS', 'FIOM', 'FILT', 'UILT', 'RSU', 'INPS', 'INAIL']);

export function eAvvisoDisagi(e) {
  const t = String(e.titolo || '');
  // Chi ha scritto "possibili disagi" lo ha già classificato come avviso
  if (/possibili disagi/i.test(t)) return true;
  if (RE_OCCUPAZIONE.test(t)) return true;
  if (RE_BLOCCO.test(t) && !(String(e.tipo || '').startsWith('sciopero') && RE_FORMA_SCIOPERO.test(t))) return true;
  return false;
}

// Titolo nel formato degli avvisi: "Possibili disagi: occupazione Palazzo Giusso"
export function titoloAvviso(titolo) {
  let t = String(titolo || '').replace(/possibili disagi\s*[:,.-]?/gi, ' ').replace(/[\s,;:.-]+$/g, '').replace(/^\s*[,;:.-]+/, '');
  t = t.replace(/\s{2,}/g, ' ').trim();
  // Togli il TUTTO MAIUSCOLO (è un modo di gridare, non di informare)
  t = t.replace(/\b([A-ZÀ-Ý]{4,})\b/g, (w) => (SIGLE.has(w) ? w : w.toLowerCase()));
  if (t) t = t.charAt(0).toLowerCase() + t.slice(1);
  return (PREFISSO + t).slice(0, 120);
}

export function eConformeAvviso(e) {
  let org = e.organizzatori;
  if (typeof org === 'string') { try { org = JSON.parse(org); } catch { org = []; } }
  return String(e.titolo || '').startsWith(PREFISSO) && e.tipo === 'altro' && !(org || []).length && !e.ora_inizio && !e.ora_fine;
}

// Applica le regole ai dati di un nuovo evento o di una modifica.
// Restituisce { errore } oppure { dati, avviso: true|false } con i dati già adattati.
export function applicaRegole(dati) {
  if (siglaEsclusa(dati)) {
    return { errore: 'La mappa non pubblica gli eventi di questa sigla. Per informazioni: paginadellarivolta@gmail.com.' };
  }
  if (RE_INVITO.test(dati.titolo) || RE_INVITO.test(dati.luogo || '')) {
    return { errore: 'La mappa non pubblica inviti a bloccare, occupare o a scontri. Puoi segnalare solo i possibili disagi, con un articolo di giornale o una fonte ufficiale.' };
  }
  if (!eAvvisoDisagi(dati)) return { dati, avviso: false };
  if (!dati.fonte) {
    return { errore: 'Per blocchi e occupazioni serve il link a una fonte giornalistica o istituzionale (non il volantino che invita a partecipare).' };
  }
  return {
    avviso: true,
    dati: { ...dati, tipo: 'altro', titolo: titoloAvviso(dati.titolo), organizzatori: [], ora_inizio: null, ora_fine: null },
  };
}

// Può diventare "verificato"? Serve una fonte; gli avvisi di disagi li verifica solo un moderatore umano.
export function verificabile(e, { umano = false } = {}) {
  if (!e.fonte) return 'Senza fonte un evento non può essere verificato: aggiungi prima il link alla fonte.';
  if (siglaEsclusa(e)) return 'Questa sigla è tra quelle che la mappa non pubblica (regole dell\'amministratore).';
  if (RE_INVITO.test(e.titolo || '')) return 'Il titolo contiene un invito non pubblicabile: correggilo o rifiuta l\'evento.';
  if (eAvvisoDisagi(e) && !eConformeAvviso(e)) return 'Blocchi e occupazioni vanno pubblicati come "Possibili disagi:", senza organizzatori né orario.';
  if (eAvvisoDisagi(e) && !umano) return 'Gli avvisi di possibili disagi li verifica solo un moderatore.';
  return null;
}

// Mette in regola le voci già presenti (eventi di oggi e futuri). Ogni modifica va in cronologia
// con attore "regole" e si può annullare dal pannello (Cronologia → Ripristina).
export async function eseguiRegole(env, salvaVersione) {
  const oggi = oggiRoma();
  const { results } = await env.DB.prepare(
    "SELECT * FROM eventi WHERE data >= ? AND stato IN ('verificato','da_verificare','annullato')"
  ).bind(oggi).all();
  const esito = { nascosti: 0, avvisi: 0, avvisi_senza_fonte: 0, senza_fonte: 0 };
  for (const e of results) {
    if (siglaEsclusa(e)) {
      await salvaVersione(env.DB, e, { stato: 'nascosto' }, 'regole_sigla_esclusa', 'regole');
      await env.DB.prepare('UPDATE eventi SET note = ? WHERE id = ?')
        .bind('Nascosto in automatico: sigla che la mappa non pubblica (decisione dell\'amministratore).', e.id).run();
      esito.sigle_escluse = (esito.sigle_escluse || 0) + 1;
      continue;
    }
    if (RE_INVITO.test(e.titolo || '')) {
      await salvaVersione(env.DB, e, { stato: 'nascosto' }, 'regole_invito', 'regole');
      await env.DB.prepare('UPDATE eventi SET note = ? WHERE id = ?')
        .bind('Nascosto in automatico: il titolo invita ad azioni non pubblicabili (regole ottobre 2026).', e.id).run();
      esito.nascosti++;
      continue;
    }
    if (eAvvisoDisagi(e) && !e.fonte) {
      // Un avviso di disagi senza fonte giornalistica o istituzionale non si pubblica: torna visibile
      // appena un moderatore aggiunge la fonte e lo ripristina.
      const cambi = eConformeAvviso(e) ? { stato: 'nascosto' } : { stato: 'nascosto', tipo: 'altro', titolo: titoloAvviso(e.titolo), organizzatori: [], ora_inizio: null, ora_fine: null };
      await salvaVersione(env.DB, e, cambi, 'regole_avviso_senza_fonte', 'regole');
      await env.DB.prepare('UPDATE eventi SET note = ? WHERE id = ?')
        .bind('Nascosto in automatico: avviso di possibili disagi senza fonte giornalistica o istituzionale (regole ottobre 2026). Aggiungi la fonte e ripristina.', e.id).run();
      esito.avvisi_senza_fonte++;
      continue;
    }
    if (eAvvisoDisagi(e) && !eConformeAvviso(e)) {
      const cambi = { tipo: 'altro', titolo: titoloAvviso(e.titolo), organizzatori: [], ora_inizio: null, ora_fine: null };
      if (e.stato === 'verificato') cambi.stato = 'da_verificare';
      await salvaVersione(env.DB, e, cambi, 'regole_avviso_disagi', 'regole');
      esito.avvisi++;
      continue;
    }
    if (e.stato === 'verificato' && !e.fonte) {
      await salvaVersione(env.DB, e, { stato: 'da_verificare' }, 'regole_senza_fonte', 'regole');
      esito.senza_fonte++;
    }
  }
  return esito;
}
