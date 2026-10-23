import { verificabile, siglaEsclusa, haEccezione, chiaveEccezione, RE_SIGLE_ESCLUSE } from './regole.js';
// API del pannello moderatori e amministratore. Tutto passa da controlli lato server:
// sessione firmata, ruolo, regioni assegnate, origine della richiesta.
import {
  json, errore, adessoRoma, impostazioni, hashAnonimo, controllaLimite, pulisci, sha256hex,
  hashCodice, nuovoCodice, segretiPronti, creaCookieSessione, COOKIE_USCITA, leggiSessione,
  attoreDi, REGIONI, normalizzaRegione, scriviCronologia, oggiRoma,
} from './lib.js';
import { validaEvento, leggiEvento, apriEvento, differenze, salvaVersione, STATI, CAMPI_CONTENUTO } from './dati.js';
import { pubblicaEvento, pubblicaGruppo, avvisaAnnullato, rimuoviEvento, cancellaMessaggio, attivaWebhook, leggiOre } from './telegram.js';
import { pubblicaPostTrova } from './assistente.js';
import { importaProposte } from './agente.js';
import { importaDecisioni } from './amministratore.js';
import { creaEvento } from './eventi.js';

async function corpo(request) {
  try { return await request.json(); } catch { return {}; }
}

function puoGestire(sessione, evento) {
  return !sessione.regioni.length || sessione.regioni.includes(evento.regione);
}

// Effetti su Telegram quando cambia lo stato
function effettiTelegram(ctx, env, prima, dopo, sito) {
  if (prima.stato !== 'verificato' && dopo.stato === 'verificato') ctx.waitUntil(pubblicaEvento(env, dopo, sito));
  else if (prima.stato !== 'annullato' && dopo.stato === 'annullato') ctx.waitUntil(avvisaAnnullato(env, dopo));
  else if (['nascosto', 'rifiutato'].includes(dopo.stato) && prima.stato !== dopo.stato) ctx.waitUntil(rimuoviEvento(env, dopo));
}

// ---------- Accesso ----------
export async function accesso({ request, env }) {
  if (!segretiPronti(env)) return errore('Il sito non è ancora configurato: manca il segreto SALE_SEGRETO.', 503);
  const b = await corpo(request);
  const codice = String(b.codice || '').trim().toUpperCase();
  const hashDisp = await hashAnonimo(request, env);
  if (!(await controllaLimite(env.DB, hashDisp, 'accesso', 8))) {
    return errore('Troppi tentativi. Riprova tra un’ora.', 429);
  }
  if (codice.length < 12) return errore('Codice non valido.', 401);

  // Amministratore: codice nel segreto ADMIN_CODICE
  if (env.ADMIN_CODICE && env.ADMIN_CODICE.length >= 16) {
    const a = await sha256hex('cmp|' + env.ADMIN_CODICE.trim().toUpperCase());
    const c = await sha256hex('cmp|' + codice);
    if (a === c) {
      const cookie = await creaCookieSessione(env, { id: 0, ruolo: 'admin' });
      return json({ ok: true, nome: 'Amministratore', ruolo: 'admin' }, 200, { 'set-cookie': cookie });
    }
  }
  const st = await env.DB.prepare('SELECT id, nome, ruolo, attivo FROM staff WHERE codice_hash = ?')
    .bind(await hashCodice(codice, env)).first();
  if (!st || !st.attivo) return errore('Codice non valido.', 401);
  await env.DB.prepare('UPDATE staff SET ultimo_accesso = ? WHERE id = ?').bind(adessoRoma(), st.id).run();
  const cookie = await creaCookieSessione(env, { id: st.id, ruolo: st.ruolo });
  return json({ ok: true, nome: st.nome, ruolo: st.ruolo }, 200, { 'set-cookie': cookie });
}

export function esci() {
  return json({ ok: true }, 200, { 'set-cookie': COOKIE_USCITA });
}

export async function io({ request, env }) {
  const s = await leggiSessione(request, env);
  if (!s) return errore('Non hai effettuato l’accesso.', 401);
  return json({ ok: true, ...s });
}

// ---------- Coda di lavoro ----------
export async function coda({ env, sessione }) {
  const filtro = sessione.regioni.length ? ` AND e.regione IN (${sessione.regioni.map(() => '?').join(',')})` : '';
  const par = sessione.regioni;

  const nuovi = (await env.DB.prepare(
    `SELECT e.*, (SELECT COUNT(*) FROM eventi g WHERE g.gruppo = e.gruppo) AS gruppo_n, (SELECT GROUP_CONCAT(DISTINCT g.comune) FROM eventi g WHERE g.gruppo = e.gruppo) AS gruppo_citta, (SELECT GROUP_CONCAT(DISTINCT g.data) FROM eventi g WHERE g.gruppo = e.gruppo) AS gruppo_date FROM eventi e WHERE e.stato IN ('da_verificare','nascosto') AND e.sospetto IS NULL AND e.data >= ?${filtro} ORDER BY e.data, e.gruppo, e.ora_inizio LIMIT 300`
  ).bind(oggiRoma(), ...par).all()).results.map(apriEvento);

  const modifiche = (await env.DB.prepare(
    `SELECT m.id, m.evento_id, m.campi, m.motivo, m.fonte, m.creato_il, e.titolo, e.comune, e.data, e.stato,
            e.tipo, e.ora_inizio, e.ora_fine, e.provincia, e.regione, e.luogo, e.lat, e.lng, e.organizzatori AS org_attuali,
            e.fonte AS fonte_attuale
     FROM modifiche m JOIN eventi e ON e.id = m.evento_id
     WHERE m.stato = 'in_attesa'${filtro} ORDER BY e.data LIMIT 200`
  ).bind(...par).all()).results.map((m) => ({ ...m, campi: JSON.parse(m.campi || '{}') }));

  const problemi = (await env.DB.prepare(
    `SELECT p.evento_id, e.titolo, e.comune, e.data, e.stato, e.tipo, e.regione, e.fonte, e.lat, e.lng, COUNT(*) AS n,
            GROUP_CONCAT(p.motivo || CASE WHEN p.nota <> '' THEN ': ' || p.nota ELSE '' END, ' | ') AS dettagli
     FROM problemi p JOIN eventi e ON e.id = p.evento_id
     WHERE p.stato = 'aperta'${filtro} GROUP BY p.evento_id ORDER BY n DESC, e.data LIMIT 200`
  ).bind(...par).all()).results;

  // Lista dei sospetti preparata dall'amministratore AI: decide un moderatore umano
  const sospetti = (await env.DB.prepare(
    `SELECT e.*, (SELECT COUNT(*) FROM eventi g WHERE g.gruppo = e.gruppo) AS gruppo_n, (SELECT GROUP_CONCAT(DISTINCT g.comune) FROM eventi g WHERE g.gruppo = e.gruppo) AS gruppo_citta, (SELECT GROUP_CONCAT(DISTINCT g.data) FROM eventi g WHERE g.gruppo = e.gruppo) AS gruppo_date FROM eventi e WHERE e.sospetto IS NOT NULL AND e.stato NOT IN ('rifiutato')${filtro} ORDER BY e.data LIMIT 200`
  ).bind(...par).all()).results.map(apriEvento);

  const imp = await impostazioni(env.DB);
  return json({ ok: true, nuovi, modifiche, problemi, sospetti, pubblicazione_immediata: !!imp.pubblicazioneImmediata });
}

export async function elencoEventi({ request, env, sessione }) {
  const u = new URL(request.url);
  const q = pulisci(u.searchParams.get('q'), 60);
  const stato = u.searchParams.get('stato');
  const where = [];
  const par = [];
  if (q) { where.push('(e.titolo LIKE ? OR e.comune LIKE ? OR e.id LIKE ?)'); par.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  if (STATI.includes(stato)) { where.push('e.stato = ?'); par.push(stato); }
  if (stato === 'pubblici') {
    // Stessa regola della mappa pubblica: eventi da oggi in poi, verificati o annullati,
    // più i "da verificare" se la pubblicazione immediata è attiva
    const imp = await impostazioni(env.DB);
    const st = imp.pubblicazioneImmediata ? ['verificato', 'da_verificare', 'annullato'] : ['verificato', 'annullato'];
    where.push(`e.stato IN (${st.map(() => '?').join(',')}) AND e.data >= ?`); par.push(...st, oggiRoma());
  }
  if (sessione.regioni.length) { where.push(`e.regione IN (${sessione.regioni.map(() => '?').join(',')})`); par.push(...sessione.regioni); }
  const { results } = await env.DB.prepare(
    `SELECT e.*, (SELECT COUNT(*) FROM eventi g WHERE g.gruppo = e.gruppo) AS gruppo_n, (SELECT GROUP_CONCAT(DISTINCT g.comune) FROM eventi g WHERE g.gruppo = e.gruppo) AS gruppo_citta, (SELECT GROUP_CONCAT(DISTINCT g.data) FROM eventi g WHERE g.gruppo = e.gruppo) AS gruppo_date FROM eventi e ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY ${stato === 'pubblici' ? 'e.data, e.ora_inizio LIMIT 600' : 'e.data DESC LIMIT 150'}`
  ).bind(...par).all();
  return json({ ok: true, eventi: results.map(apriEvento) });
}

export async function cronologia({ env, sessione, params }) {
  const e = await leggiEvento(env.DB, params.id);
  if (!e || !puoGestire(sessione, e)) return errore('Evento non trovato.', 404);
  const { results } = await env.DB.prepare(
    'SELECT id, versione, azione, attore, dati, creato_il FROM cronologia WHERE evento_id = ? ORDER BY id DESC LIMIT 100'
  ).bind(e.id).all();
  return json({ ok: true, evento: apriEvento(e), voci: results.map((r) => ({ ...r, dati: r.dati ? apriEvento(JSON.parse(r.dati)) : null })) });
}

// ---------- Azioni su un evento ----------
export async function azioneEvento({ request, env, ctx, sessione, params }) {
  const b = await corpo(request);
  const e = await leggiEvento(env.DB, params.id);
  if (!e || !puoGestire(sessione, e)) return errore('Evento non trovato.', 404);
  const attore = attoreDi(sessione);
  const sito = new URL(request.url).origin;
  const az = String(b.azione || '');
  const cambiStato = { approva: 'verificato', rifiuta: 'rifiutato', nascondi: 'nascosto', annulla: 'annullato', rimetti: 'da_verificare' };

  let nuovo;
  if (az === 'approva') {
    // Eccezione per una sigla esclusa: solo l'amministratore, solo per questo evento, con conferma esplicita
    const eccezione = b.eccezione_sigla === true && sessione.ruolo === 'admin' && siglaEsclusa(e);
    const no = verificabile(e, { umano: true, eccezioneSigla: eccezione || (await haEccezione(env.DB, e.id)) });
    if (no) {
      if (siglaEsclusa(e) && sessione.ruolo === 'admin') return json({ ok: false, errore: no, puo_eccezione: true }, 400);
      return errore(no);
    }
    if (eccezione) {
      await env.DB.prepare('INSERT OR IGNORE INTO importati (chiave, creato_il) VALUES (?, ?)').bind(chiaveEccezione(e.id), adessoRoma()).run();
      // Lo si stacca dal gruppo della sigla, così non viene pubblicato insieme agli altri eventi esclusi
      if (e.gruppo && RE_SIGLE_ESCLUSE.test(e.gruppo)) {
        await env.DB.prepare('UPDATE eventi SET gruppo = NULL WHERE id = ?').bind(e.id).run();
        e.gruppo = null;
      }
      await env.DB.prepare('UPDATE eventi SET note = ? WHERE id = ?')
        .bind('Eccezione dell\'amministratore alla regola sulle sigle escluse: fonte controllata.', e.id).run();
    }
  }
  if (az in cambiStato) {
    const stato = cambiStato[az];
    const extra = { stato };
    if (az === 'approva' || az === 'rimetti') extra.segnalazioni_aperte = 0;
    nuovo = await salvaVersione(env.DB, e, extra, az, attore);
    // Una decisione umana chiude anche l'eventuale sospetto dell'amministratore AI
    if (e.sospetto) await env.DB.prepare('UPDATE eventi SET sospetto = NULL WHERE id = ?').bind(e.id).run();
    if (az === 'approva' || az === 'rimetti' || az === 'rifiuta') {
      await env.DB.prepare("UPDATE problemi SET stato = 'chiusa' WHERE evento_id = ? AND stato = 'aperta'").bind(e.id).run();
    }
  } else if (az === 'modifica') {
    const v = validaEvento({ ...apriEvento(e), ...(b.campi || {}) }, { consentiPassato: true });
    if (v.errore) return errore(v.errore);
    if (!Object.keys(differenze(e, v.dati)).length) return errore('Nessuna modifica rispetto ai dati attuali.');
    nuovo = await salvaVersione(env.DB, e, v.dati, 'modificato', attore);
  } else if (az === 'ripristina') {
    const versione = Number(b.versione);
    const voce = await env.DB.prepare(
      'SELECT dati FROM cronologia WHERE evento_id = ? AND versione = ? AND dati IS NOT NULL ORDER BY id DESC LIMIT 1'
    ).bind(e.id, versione).first();
    if (!voce) return errore('Versione non trovata.');
    const vecchio = JSON.parse(voce.dati);
    const cambi = { stato: STATI.includes(vecchio.stato) ? vecchio.stato : e.stato };
    for (const c of CAMPI_CONTENUTO) if (c in vecchio) cambi[c] = vecchio[c];
    nuovo = await salvaVersione(env.DB, e, cambi, `ripristinato_v${versione}`, attore);
  } else if (az === 'aggiungi_date') {
    // Stesso evento in altre date: una copia per data, collegata allo stesso gruppo
    const date = [...new Set((Array.isArray(b.date) ? b.date : []).map(String))]
      .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d) && d !== e.data);
    if (!date.length) return errore("Indica almeno una data diversa da quella dell'evento.");
    if (date.length > 14) return errore('Puoi aggiungere al massimo 14 date per volta.');
    let gruppo = e.gruppo;
    if (!gruppo) {
      gruppo = 'g-' + [...crypto.getRandomValues(new Uint8Array(6))].map((x) => x.toString(16).padStart(2, '0')).join('');
      await env.DB.prepare('UPDATE eventi SET gruppo = ? WHERE id = ?').bind(gruppo, e.id).run();
    }
    const base = apriEvento(e);
    const creati = [], saltate = [];
    for (const d of date.sort()) {
      const v = validaEvento({ ...base, data: d });
      if (v.errore) { saltate.push(`${d}: ${v.errore}`); continue; }
      const gia = await env.DB.prepare(
        "SELECT id FROM eventi WHERE data = ? AND comune = ? AND (gruppo = ? OR lower(titolo) = lower(?)) AND stato <> 'rifiutato' LIMIT 1"
      ).bind(d, v.dati.comune, gruppo, v.dati.titolo).first();
      if (gia) { saltate.push(`${d}: c'è già (${gia.id})`); continue; }
      const id = await creaEvento(env.DB, v.dati, { gruppo, attore, note: `Data aggiunta da un moderatore a partire da ${e.id}` });
      // Se l'evento di partenza è verificato (e la copia rispetta le regole), anche la copia nasce verificata
      if (e.stato === 'verificato' && !verificabile({ ...v.dati, id }, { umano: true })) {
        const x = await leggiEvento(env.DB, id);
        await salvaVersione(env.DB, x, { stato: 'verificato' }, 'approva', attore);
      }
      creati.push(id);
    }
    return json({ ok: true, creati, saltate });
  } else if (az === 'approva_gruppo') {
    if (!e.gruppo) return errore('Questo evento non fa parte di un gruppo di città.');
    const { results } = await env.DB.prepare(
      "SELECT * FROM eventi WHERE gruppo = ? AND stato IN ('da_verificare','nascosto','verificato')"
    ).bind(e.gruppo).all();
    const approvati = [];
    let saltati = 0;
    for (const x of results) {
      if (!puoGestire(sessione, x)) continue;
      if (x.stato === 'verificato') { approvati.push(x); continue; }
      if (verificabile(x, { umano: true })) { saltati++; continue; }
      const n = await salvaVersione(env.DB, x, { stato: 'verificato', segnalazioni_aperte: 0 }, 'approva_gruppo', attore);
      await env.DB.prepare("UPDATE problemi SET stato = 'chiusa' WHERE evento_id = ? AND stato = 'aperta'").bind(x.id).run();
      n.telegram_msg_id = x.telegram_msg_id;
      approvati.push(n);
    }
    ctx.waitUntil(pubblicaGruppo(env, approvati, sito));
    return json({ ok: true, approvati: approvati.length, saltati });
  } else if (az === 'conferma_sospetto') {
    // Il moderatore conferma il sospetto dell'amministratore AI: l'evento viene rifiutato
    nuovo = await salvaVersione(env.DB, e, { stato: 'rifiutato' }, 'sospetto_confermato', attore);
    await env.DB.prepare('UPDATE eventi SET sospetto = NULL WHERE id = ?').bind(e.id).run();
    await env.DB.prepare("UPDATE problemi SET stato = 'chiusa' WHERE evento_id = ? AND stato = 'aperta'").bind(e.id).run();
  } else if (az === 'declina_sospetto') {
    // Il moderatore non condivide il sospetto: l'evento resta com'è e torna nella coda normale
    await env.DB.prepare('UPDATE eventi SET sospetto = NULL WHERE id = ?').bind(e.id).run();
    await scriviCronologia(env.DB, e, 'sospetto_declinato', attore);
    return json({ ok: true });
  } else if (az === 'chiudi_segnalazioni') {
    await env.DB.prepare("UPDATE problemi SET stato = 'chiusa' WHERE evento_id = ? AND stato = 'aperta'").bind(e.id).run();
    await env.DB.prepare('UPDATE eventi SET segnalazioni_aperte = 0 WHERE id = ?').bind(e.id).run();
    return json({ ok: true });
  } else {
    return errore('Azione sconosciuta.');
  }
  nuovo.telegram_msg_id = e.telegram_msg_id;
  effettiTelegram(ctx, env, e, nuovo, sito);
  return json({ ok: true, evento: apriEvento(nuovo) });
}

// ---------- Proposte di modifica ----------
export async function azioneModifica({ request, env, ctx, sessione, params }) {
  const b = await corpo(request);
  const m = await env.DB.prepare("SELECT * FROM modifiche WHERE id = ? AND stato = 'in_attesa'").bind(Number(params.id)).first();
  if (!m) return errore('Proposta non trovata o già decisa.', 404);
  const e = await leggiEvento(env.DB, m.evento_id);
  if (!e || !puoGestire(sessione, e)) return errore('Evento non trovato.', 404);
  const attore = attoreDi(sessione);

  if (b.azione === 'rifiuta') {
    await env.DB.prepare("UPDATE modifiche SET stato = 'rifiutata', deciso_da = ?, deciso_il = ? WHERE id = ?")
      .bind(attore, adessoRoma(), m.id).run();
    return json({ ok: true });
  }
  if (b.azione !== 'accetta') return errore('Azione sconosciuta.');

  const campi = JSON.parse(m.campi || '{}');
  const { stato, ...contenuto } = campi;
  const v = validaEvento({ ...apriEvento(e), ...contenuto }, { consentiPassato: true });
  if (v.errore) return errore('La proposta non è più valida: ' + v.errore);
  const cambi = { ...v.dati };
  if (stato === 'annullato') cambi.stato = 'annullato';
  const nuovo = await salvaVersione(env.DB, e, cambi, `modifica_accettata#${m.id}`, attore);
  await env.DB.prepare("UPDATE modifiche SET stato = 'accettata', deciso_da = ?, deciso_il = ? WHERE id = ?")
    .bind(attore, adessoRoma(), m.id).run();
  nuovo.telegram_msg_id = e.telegram_msg_id;
  effettiTelegram(ctx, env, e, nuovo, new URL(request.url).origin);
  return json({ ok: true, evento: apriEvento(nuovo) });
}

// ---------- Amministratore ----------
export async function elencoStaff({ env }) {
  const { results } = await env.DB.prepare(
    'SELECT id, nome, ruolo, regioni, attivo, creato_il, ultimo_accesso FROM staff ORDER BY attivo DESC, nome'
  ).all();
  return json({ ok: true, staff: results.map((s) => ({ ...s, regioni: s.regioni ? JSON.parse(s.regioni) : [] })), regioni: REGIONI });
}

export async function azioneStaff({ request, env }) {
  const b = await corpo(request);
  if (b.azione === 'crea') {
    const nome = pulisci(b.nome, 40);
    if (nome.length < 2) return errore('Dai un nome o un soprannome al moderatore.');
    const ruolo = b.ruolo === 'admin' ? 'admin' : 'moderatore';
    const regioni = (Array.isArray(b.regioni) ? b.regioni : []).map(normalizzaRegione).filter(Boolean);
    const codice = nuovoCodice();
    await env.DB.prepare('INSERT INTO staff (nome, ruolo, regioni, codice_hash, attivo, creato_il) VALUES (?, ?, ?, ?, 1, ?)')
      .bind(nome, ruolo, JSON.stringify(regioni), await hashCodice(codice, env), adessoRoma()).run();
    // Il codice si vede solo adesso: nel database resta solo la sua impronta
    return json({ ok: true, codice });
  }
  const id = Number(b.id);
  if (!id) return errore('Moderatore non indicato.');
  if (b.azione === 'revoca' || b.azione === 'riattiva') {
    await env.DB.prepare('UPDATE staff SET attivo = ? WHERE id = ?').bind(b.azione === 'riattiva' ? 1 : 0, id).run();
    return json({ ok: true });
  }
  if (b.azione === 'nuovo_codice') {
    const codice = nuovoCodice();
    await env.DB.prepare('UPDATE staff SET codice_hash = ? WHERE id = ?').bind(await hashCodice(codice, env), id).run();
    return json({ ok: true, codice });
  }
  if (b.azione === 'regioni') {
    const regioni = (Array.isArray(b.regioni) ? b.regioni : []).map(normalizzaRegione).filter(Boolean);
    await env.DB.prepare('UPDATE staff SET regioni = ? WHERE id = ?').bind(JSON.stringify(regioni), id).run();
    return json({ ok: true });
  }
  return errore('Azione sconosciuta.');
}

const IMPOSTAZIONI_AMMESSE = {
  pubblicazione_immediata: (v) => (['si', 'no'].includes(v) ? v : null),
  telegram_auto: (v) => (['si', 'no'].includes(v) ? v : null),
  telegram_ore: (v) => { const o = leggiOre(v); return o ? o.join(',') : null; },
  conferme_per_verifica: (v) => (/^\d+$/.test(v) && +v >= 1 && +v <= 50 ? v : null),
  segnalazioni_per_nascondere: (v) => (/^\d+$/.test(v) && +v >= 1 && +v <= 50 ? v : null),
  max_invii_ora: (v) => (/^\d+$/.test(v) && +v >= 1 && +v <= 100 ? v : null),
  giorni_conservazione: (v) => (/^\d+$/.test(v) && +v >= 1 && +v <= 365 ? v : null),
  giorni_archivio: (v) => (/^\d+$/.test(v) && +v >= 30 && +v <= 3650 ? v : null),
};

export async function leggiImpostazioni({ env }) {
  const { results } = await env.DB.prepare('SELECT chiave, valore FROM impostazioni').all();
  return json({
    ok: true,
    impostazioni: { giorni_archivio: '365', ...Object.fromEntries(results.map((r) => [r.chiave, r.valore])) },
    telegram_configurato: !!(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID),
  });
}

export async function salvaImpostazioni({ request, env }) {
  const b = await corpo(request);
  for (const [k, v] of Object.entries(b || {})) {
    const f = IMPOSTAZIONI_AMMESSE[k];
    if (!f) continue;
    const ok = f(String(v));
    if (ok === null) return errore(`Valore non valido per ${k}.`);
    await env.DB.prepare('INSERT INTO impostazioni (chiave, valore) VALUES (?, ?) ON CONFLICT(chiave) DO UPDATE SET valore = excluded.valore')
      .bind(k, ok).run();
  }
  return json({ ok: true });
}

// Prova del bot Telegram: invia un messaggio di test al canale
export async function provaTelegram({ env }) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return errore('Bot Telegram non configurato (mancano TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID).');
  const r = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text: '✅ Collegamento tra la mappa e il canale riuscito.' }),
  });
  const d = await r.json().catch(() => ({}));
  if (!d.ok) return errore('Telegram ha risposto: ' + (d.description || 'errore sconosciuto') + '. Controlla che il bot sia amministratore del canale.');
  return json({ ok: true });
}

// Ripubblica sul canale Telegram gli eventi futuri verificati (es. dopo aver collegato il gruppo dei commenti).
// Prova a cancellare il vecchio post, azzera il numero salvato e pubblica di nuovo.
// Al massimo 25 messaggi per volta, con una pausa tra l'uno e l'altro (limiti di Telegram): se ne restano, si ripreme.
export async function ripubblicaTelegram({ request, env }) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return errore('Bot Telegram non configurato.');
  const auto = await env.DB.prepare("SELECT valore FROM impostazioni WHERE chiave = 'telegram_auto'").first();
  if (auto && auto.valore === 'no') return errore('La pubblicazione automatica su Telegram è spenta nelle impostazioni: accendila prima.');
  const sito = new URL(request.url).origin;
  const { results } = await env.DB.prepare(
    "SELECT * FROM eventi WHERE stato = 'verificato' AND data >= ? ORDER BY data, ora_inizio"
  ).bind(oggiRoma()).all();

  // Un "pacchetto" = un messaggio: evento singolo, oppure tutte le città di un gruppo
  const pacchetti = [];
  const gruppiVisti = new Set();
  for (const e of results) {
    if (e.gruppo) {
      if (gruppiVisti.has(e.gruppo)) continue;
      gruppiVisti.add(e.gruppo);
      pacchetti.push(results.filter((x) => x.gruppo === e.gruppo));
    } else pacchetti.push([e]);
  }

  const MAX = 25;
  const pausa = () => new Promise((r) => setTimeout(r, 1500));
  const esito = { ripubblicati: 0, vecchi_non_cancellati: 0, restanti: Math.max(0, pacchetti.length - MAX) };
  for (const p of pacchetti.slice(0, MAX)) {
    const vecchi = [...new Set(p.map((x) => x.telegram_msg_id).filter(Boolean))];
    for (const m of vecchi) {
      if (!(await cancellaMessaggio(env, m))) esito.vecchi_non_cancellati++;
    }
    for (const x of p) {
      await env.DB.prepare('UPDATE eventi SET telegram_msg_id = NULL WHERE id = ?').bind(x.id).run();
      x.telegram_msg_id = null;
    }
    if (p.length > 1 || p[0].gruppo) await pubblicaGruppo(env, p, sito, { forza: true });
    else await pubblicaEvento(env, p[0], sito, { forza: true });
    esito.ripubblicati++;
    await pausa();
  }
  return json({ ok: true, ...esito });
}

// Attiva le regole automatiche come primo commento dei post del canale (imposta il webhook del bot)
export async function attivaRegoleCommenti({ request, env }) {
  const d = await attivaWebhook(env, new URL(request.url).origin);
  if (!d.ok) return errore('Telegram ha risposto: ' + (d.description || 'errore sconosciuto'));
  return json({ ok: true, username: d.username || null });
}

// Pubblica nel canale (e prova a fissare) il post "Trova una mobilitazione" con i pulsanti dell'assistente
export async function pubblicaTrova({ request, env }) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return errore('Bot Telegram non configurato.');
  const d = await pubblicaPostTrova(env, new URL(request.url).origin);
  if (!d.ok) return errore('Telegram ha risposto: ' + (d.description || 'errore sconosciuto'));
  return json({ ok: true, fissato: d.fissato });
}

// Pulizia (come promesso nella nota privacy):
//  - dopo "giorni_conservazione" (30): si cancellano i dati collegati agli eventi passati (codici anonimi, conferme,
//    segnalazioni, proposte di correzione, cronologia) e gli eventi mai verificati, rifiutati o nascosti;
//  - gli eventi verificati o annullati restano nell'archivio fino a "giorni_archivio" (365) e poi si cancellano.
export async function pulizia({ env }) {
  return json({ ok: true, cancellati: await eseguiPulizia(env) });
}

export async function eseguiPulizia(env) {
  const imp = await impostazioni(env.DB);
  const giorni = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
  const limite = giorni(imp.giorniConservazione);
  const limiteArchivio = giorni(imp.giorniArchivio);
  const vecchi = `SELECT id FROM eventi WHERE data < ?`;
  for (const t of ['problemi', 'conferme', 'modifiche', 'cronologia']) {
    await env.DB.prepare(`DELETE FROM ${t} WHERE evento_id IN (${vecchi})`).bind(limite).run();
  }
  const a = await env.DB.prepare("DELETE FROM eventi WHERE data < ? AND stato NOT IN ('verificato', 'annullato')").bind(limite).run();
  const b = await env.DB.prepare('DELETE FROM eventi WHERE data < ?').bind(limiteArchivio).run();
  // Nell'archivio non restano note interne (motivi dell'amministratore AI, sospetti)
  await env.DB.prepare('UPDATE eventi SET note = NULL, sospetto = NULL WHERE data < ? AND (note IS NOT NULL OR sospetto IS NOT NULL)').bind(limite).run();
  await env.DB.prepare('DELETE FROM invii WHERE creato_il < ?').bind(new Date(Date.now() - 2 * 86400000).toISOString()).run();
  return (a.meta?.changes ?? 0) + (b.meta?.changes ?? 0);
}


// Importa subito le proposte dell'agente (oltre all'importazione notturna)
export async function importaAgente({ request, env }) {
  const proposte = await importaProposte(env);
  const decisioni = await importaDecisioni(env, new URL(request.url).origin);
  return json({ ok: true, ...proposte, decisioni });
}
