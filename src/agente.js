// Importa le proposte scritte dall'agente Claude nel file dati/proposte.json (nel repository).
// Ogni proposta entra come "da_verificare": la decisione resta ai moderatori.
import proposte from '../dati/proposte.json';
import { adessoRoma, sha256hex, slug } from './lib.js';
import { creaEvento } from './eventi.js';
import { validaEvento } from './dati.js';
import { cercaSimili } from './doppioni.js';

export async function importaProposte(env) {
  const elenco = Array.isArray(proposte) ? proposte : [];
  const esito = { lette: elenco.length, nuove: 0, gia_importate: 0, doppioni: 0, scartate: [] };

  for (const p of elenco) {
    const v = validaEvento(p || {});
    if (v.errore) {
      if (!/già passata/.test(v.errore)) esito.scartate.push(`${p && p.titolo ? p.titolo : '?'}: ${v.errore}`);
      continue;
    }
    const d = v.dati;
    if (!d.fonte) { esito.scartate.push(`${d.titolo}: manca la fonte`); continue; }

    // Ogni proposta si importa una volta sola, anche se resta nel file
    const chiave = await sha256hex(['agente', d.fonte, d.data, d.comune.toLowerCase(), d.tipo].join('|'));
    if (await env.DB.prepare('SELECT 1 FROM importati WHERE chiave = ?').bind(chiave).first()) { esito.gia_importate++; continue; }

    // Doppione di un evento già presente: stesso giorno e stesso posto, e simile per titolo, fonte o sigle
    // (stesso controllo del modulo "Aggiungi" e della scheda Doppioni del pannello)
    const simili = await cercaSimili(env.DB, d);
    const simile = simili.length ? simili[0].e : null;
    await env.DB.prepare('INSERT INTO importati (chiave, creato_il) VALUES (?, ?)').bind(chiave, adessoRoma()).run();
    if (simile) { esito.doppioni++; continue; }

    const note = 'Proposto dall’agente' + (p.note ? ': ' + String(p.note).slice(0, 200) : '');
    const gruppo = p.gruppo ? 'ag-' + slug(String(p.gruppo)).slice(0, 40) : null;
    await creaEvento(env.DB, d, { gruppo, attore: 'agente', note });
    esito.nuove++;
  }
  return esito;
}
