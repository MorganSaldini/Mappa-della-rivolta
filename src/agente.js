// Importa le proposte scritte dall'agente Claude nel file dati/proposte.json (nel repository).
// Ogni proposta entra come "da_verificare": la decisione resta ai moderatori.
import proposte from '../dati/proposte.json';
import { adessoRoma, sha256hex, slug, scriviCronologia } from './lib.js';
import { validaEvento } from './dati.js';

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

    // Doppione di un evento già presente (stesso giorno, comune e tipo)
    const simile = await env.DB.prepare(
      'SELECT id FROM eventi WHERE data = ? AND lower(comune) = ? AND tipo = ? LIMIT 1'
    ).bind(d.data, d.comune.toLowerCase(), d.tipo).first();
    await env.DB.prepare('INSERT INTO importati (chiave, creato_il) VALUES (?, ?)').bind(chiave, adessoRoma()).run();
    if (simile) { esito.doppioni++; continue; }

    const base = `${d.data}-${slug(d.comune)}-${d.tipo}`;
    const n = await env.DB.prepare('SELECT COUNT(*) AS n FROM eventi WHERE id LIKE ?').bind(base + '-%').first();
    const id = `${base}-${String((n?.n || 0) + 1).padStart(2, '0')}`;
    const adesso = adessoRoma();
    const note = 'Proposto dall’agente' + (p.note ? ': ' + String(p.note).slice(0, 200) : '');
    const evento = {
      id, ...d, organizzatori: JSON.stringify(d.organizzatori), stato: 'da_verificare', conferme: 0,
      segnalazioni_aperte: 0, versione: 1, creato_il: adesso, aggiornato_il: adesso, note,
    };
    await env.DB.prepare(
      `INSERT INTO eventi (id, tipo, titolo, data, ora_inizio, ora_fine, comune, provincia, regione, luogo, lat, lng,
        posizione_approssimativa, organizzatori, fonte, stato, conferme, segnalazioni_aperte, versione, creato_il, aggiornato_il, note)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'da_verificare',0,0,1,?,?,?)`
    ).bind(id, d.tipo, d.titolo, d.data, d.ora_inizio, d.ora_fine, d.comune, d.provincia, d.regione, d.luogo, d.lat, d.lng,
      d.posizione_approssimativa, evento.organizzatori, d.fonte, adesso, adesso, note).run();
    await scriviCronologia(env.DB, evento, 'proposto_da_agente', 'agente');
    esito.nuove++;
  }
  return esito;
}
