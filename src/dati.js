// Validazione e salvataggio degli eventi, condivisi da pubblico e moderazione.
import { applicaRegole } from './regole.js';
import {
  TIPI, normalizzaRegione, oggiRoma, aggiungiGiorni, contieneDatiPersonali, pulisci, adessoRoma, scriviCronologia,
} from './lib.js';

// Campi di contenuto che si possono proporre, modificare e ripristinare
export const CAMPI_CONTENUTO = [
  'tipo', 'titolo', 'data', 'ora_inizio', 'ora_fine', 'comune', 'provincia', 'regione', 'luogo',
  'lat', 'lng', 'posizione_approssimativa', 'organizzatori', 'fonte',
];

export const STATI = ['da_verificare', 'verificato', 'annullato', 'nascosto', 'rifiutato'];

// Controlla un evento completo. opzioni.consentiPassato: per i moderatori che correggono eventi già svolti.
// Restituisce { errore } oppure { dati } con i campi puliti (organizzatori come array).
export function validaEvento(b, opzioni = {}) {
  const tipo = String(b.tipo || '');
  if (!TIPI.includes(tipo)) return { errore: 'Scegli il tipo di mobilitazione.' };

  const titolo = pulisci(b.titolo, 120);
  if (titolo.length < 5) return { errore: 'Il titolo deve avere almeno 5 caratteri.' };

  const data = String(b.data || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || isNaN(Date.parse(data + 'T12:00:00Z'))) return { errore: 'Data non valida.' };
  const oggi = oggiRoma();
  if (!opzioni.consentiPassato && data < oggi) return { errore: 'La data è già passata.' };
  if (data > aggiungiGiorni(oggi, 365)) return { errore: 'La data è troppo lontana (massimo un anno).' };

  const reOra = /^([01]\d|2[0-3]):[0-5]\d$/;
  const oraInizio = b.ora_inizio ? String(b.ora_inizio).slice(0, 5) : null;
  const oraFine = b.ora_fine ? String(b.ora_fine).slice(0, 5) : null;
  if (oraInizio && !reOra.test(oraInizio)) return { errore: 'Ora di inizio non valida.' };
  if (oraFine && !reOra.test(oraFine)) return { errore: 'Ora di fine non valida.' };

  const comune = pulisci(b.comune, 80);
  if (comune.length < 2) return { errore: 'Indica il comune.' };
  const provincia = pulisci(b.provincia, 2).toUpperCase();
  if (!/^[A-Z]{2}$/.test(provincia)) return { errore: 'Provincia non riconosciuta (servono 2 lettere).' };
  const regione = normalizzaRegione(b.regione);
  if (!regione) return { errore: 'Regione non riconosciuta.' };

  const luogo = pulisci(b.luogo, 120);
  const lat = Number(b.lat);
  const lng = Number(b.lng);
  if (!(lat >= 35.4 && lat <= 47.2 && lng >= 6.5 && lng <= 18.7)) {
    return { errore: 'Il punto sulla mappa deve trovarsi in Italia.' };
  }

  let organizzatori = b.organizzatori;
  if (typeof organizzatori === 'string') {
    try { organizzatori = organizzatori.trim().startsWith('[') ? JSON.parse(organizzatori) : organizzatori.split(','); }
    catch { organizzatori = organizzatori.split(','); }
  }
  if (!Array.isArray(organizzatori)) organizzatori = [];
  organizzatori = organizzatori.map((o) => pulisci(o, 60)).filter(Boolean).slice(0, 5);

  const fonte = pulisci(b.fonte, 300);
  if (fonte) {
    try {
      const u = new URL(fonte);
      if (!['http:', 'https:'].includes(u.protocol)) throw new Error();
    } catch {
      return { errore: 'Il link della fonte non è valido (deve iniziare con https://).' };
    }
  }

  if ([titolo, luogo, ...organizzatori].some(contieneDatiPersonali)) {
    return { errore: 'Togli email e numeri di telefono: la mappa non pubblica dati personali.' };
  }

  // Regole sui contenuti: niente inviti ad azioni non pubblicabili; blocchi e occupazioni solo come avviso
  return applicaRegole({
    tipo, titolo, data, ora_inizio: oraInizio, ora_fine: oraFine, comune, provincia, regione, luogo,
    lat: Math.round(lat * 1e5) / 1e5, lng: Math.round(lng * 1e5) / 1e5,
    posizione_approssimativa: b.posizione_approssimativa ? 1 : 0,
    organizzatori, fonte: fonte || null,
  });
}

export async function leggiEvento(db, id) {
  return db.prepare('SELECT * FROM eventi WHERE id = ?').bind(id).first();
}

// Evento come arriva dal database → oggetto con organizzatori in array
export function apriEvento(e) {
  if (!e) return e;
  let org = [];
  try { org = e.organizzatori ? JSON.parse(e.organizzatori) : []; } catch { org = []; }
  return { ...e, organizzatori: org };
}

// Confronta due eventi sui campi di contenuto: { campo: [prima, dopo] }
export function differenze(prima, dopo) {
  const d = {};
  for (const c of CAMPI_CONTENUTO) {
    if (!(c in dopo)) continue;
    const a = c === 'organizzatori' ? JSON.stringify(apriEvento(prima).organizzatori) : prima[c] ?? null;
    const b = c === 'organizzatori' ? JSON.stringify(dopo[c] || []) : dopo[c] ?? null;
    if (String(a ?? '') !== String(b ?? '')) d[c] = [c === 'organizzatori' ? JSON.parse(a) : a, dopo[c] ?? null];
  }
  return d;
}

// Salva una nuova versione dell'evento: aggiorna la riga, incrementa la versione, scrive la cronologia.
// cambi: campi di contenuto e/o stato, conferme, segnalazioni_aperte, telegram_msg_id
export async function salvaVersione(db, evento, cambi, azione, attore) {
  // Se la versione attuale non ha ancora una "fotografia" in cronologia, la salva prima di cambiarla,
  // così si potrà sempre tornare indietro.
  const foto = await db
    .prepare('SELECT 1 FROM cronologia WHERE evento_id = ? AND versione = ? AND dati IS NOT NULL')
    .bind(evento.id, evento.versione || 1).first();
  if (!foto) await scriviCronologia(db, { ...evento, versione: evento.versione || 1 }, 'istantanea', 'sistema');

  const nuovo = { ...evento, ...cambi };
  if (Array.isArray(nuovo.organizzatori)) nuovo.organizzatori = JSON.stringify(nuovo.organizzatori);
  nuovo.versione = (evento.versione || 1) + 1;
  nuovo.aggiornato_il = adessoRoma();
  await db
    .prepare(
      `UPDATE eventi SET tipo=?, titolo=?, data=?, ora_inizio=?, ora_fine=?, comune=?, provincia=?, regione=?, luogo=?,
        lat=?, lng=?, posizione_approssimativa=?, organizzatori=?, fonte=?, stato=?, conferme=?, segnalazioni_aperte=?,
        versione=?, aggiornato_il=? WHERE id=?`
    )
    .bind(
      nuovo.tipo, nuovo.titolo, nuovo.data, nuovo.ora_inizio, nuovo.ora_fine, nuovo.comune, nuovo.provincia,
      nuovo.regione, nuovo.luogo, nuovo.lat, nuovo.lng, nuovo.posizione_approssimativa || 0, nuovo.organizzatori,
      nuovo.fonte, nuovo.stato, nuovo.conferme || 0, nuovo.segnalazioni_aperte || 0, nuovo.versione,
      nuovo.aggiornato_il, nuovo.id
    )
    .run();
  await scriviCronologia(db, nuovo, azione, attore);
  return nuovo;
}
