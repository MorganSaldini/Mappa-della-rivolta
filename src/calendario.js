// GET /api/calendario.ics → calendario a cui iscriversi con le mobilitazioni verificate (e quelle annullate, come CANCELLED)
import { oggiRoma, aggiungiGiorni } from './lib.js';
import { apriEvento } from './dati.js';

const NOMI = {
  corteo: 'Corteo', presidio: 'Presidio', sciopero_generale: 'Sciopero generale', sciopero_categoria: 'Sciopero di categoria',
  picchetto: 'Picchetto', assemblea: 'Assemblea', altro: 'Iniziativa',
};

function testo(t) {
  return String(t ?? '').replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/([,;])/g, '\\$1');
}
// Le righe dei file .ics non devono superare 75 caratteri
function piega(riga) {
  const out = [];
  let r = riga;
  while (new TextEncoder().encode(r).length > 74) {
    let n = 74;
    while (new TextEncoder().encode(r.slice(0, n)).length > 74) n--;
    out.push(r.slice(0, n));
    r = ' ' + r.slice(n);
  }
  out.push(r);
  return out.join('\r\n');
}
function compatto(data, ora) { return data.replace(/-/g, '') + 'T' + ora.replace(':', '') + '00'; }
function piuOre(data, ora, ore) {
  const [h, m] = ora.split(':').map(Number);
  const d = new Date(Date.UTC(+data.slice(0, 4), +data.slice(5, 7) - 1, +data.slice(8, 10), h + ore, m));
  return d.toISOString().slice(0, 16).replace(/[-:]/g, '') + '00';
}

export async function feed({ request, env }) {
  const sito = new URL(request.url).origin;
  const dal = aggiungiGiorni(oggiRoma(), -7);
  const { results } = await env.DB.prepare(
    "SELECT * FROM eventi WHERE data >= ? AND stato IN ('verificato','annullato') ORDER BY data LIMIT 1000"
  ).bind(dal).all();

  const r = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Mappa delle mobilitazioni//IT', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'X-WR-CALNAME:Mappa delle mobilitazioni', 'X-WR-TIMEZONE:Europe/Rome', 'REFRESH-INTERVAL;VALUE=DURATION:PT6H', 'X-PUBLISHED-TTL:PT6H',
    'BEGIN:VTIMEZONE', 'TZID:Europe/Rome',
    'BEGIN:STANDARD', 'DTSTART:19701025T030000', 'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU', 'TZOFFSETFROM:+0200', 'TZOFFSETTO:+0100', 'TZNAME:CET', 'END:STANDARD',
    'BEGIN:DAYLIGHT', 'DTSTART:19700329T020000', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU', 'TZOFFSETFROM:+0100', 'TZOFFSETTO:+0200', 'TZNAME:CEST', 'END:DAYLIGHT',
    'END:VTIMEZONE'];
  const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  for (const raw of results) {
    const e = apriEvento(raw);
    const luogo = [e.luogo, `${e.comune} (${e.provincia})`].filter(Boolean).join(', ');
    const desc = [NOMI[e.tipo] || 'Iniziativa', e.organizzatori.length ? 'Promosso da: ' + e.organizzatori.join(', ') : '',
      e.fonte ? 'Fonte: ' + e.fonte : '', 'Mappa: ' + sito + '/?e=' + encodeURIComponent(e.id)].filter(Boolean).join('\n');
    r.push('BEGIN:VEVENT', `UID:${e.id}@${new URL(sito).host}`, `DTSTAMP:${stamp}`, `SEQUENCE:${e.versione || 1}`);
    if (e.ora_inizio) {
      const fine = e.ora_fine && e.ora_fine > e.ora_inizio ? compatto(e.data, e.ora_fine) : piuOre(e.data, e.ora_inizio, 2);
      r.push(`DTSTART;TZID=Europe/Rome:${compatto(e.data, e.ora_inizio)}`, `DTEND;TZID=Europe/Rome:${fine}`);
    } else {
      r.push(`DTSTART;VALUE=DATE:${e.data.replace(/-/g, '')}`, `DTEND;VALUE=DATE:${aggiungiGiorni(e.data, 1).replace(/-/g, '')}`);
    }
    r.push(`SUMMARY:${testo((e.stato === 'annullato' ? 'ANNULLATO: ' : '') + e.titolo)}`, `LOCATION:${testo(luogo)}`,
      `DESCRIPTION:${testo(desc)}`, `GEO:${e.lat};${e.lng}`, `URL:${sito}/?e=${encodeURIComponent(e.id)}`,
      `STATUS:${e.stato === 'annullato' ? 'CANCELLED' : 'CONFIRMED'}`, 'END:VEVENT');
  }
  r.push('END:VCALENDAR');
  return new Response(r.map(piega).join('\r\n') + '\r\n', {
    headers: {
      'content-type': 'text/calendar; charset=utf-8',
      'content-disposition': 'inline; filename="mobilitazioni.ics"',
      'cache-control': 'public, max-age=900',
    },
  });
}
