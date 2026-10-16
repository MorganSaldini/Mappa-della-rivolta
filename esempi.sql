-- 5 EVENTI DI ESEMPIO, inventati, solo per vedere come funziona la mappa.
-- Prima di rendere pubblico il sito cancellali con:
--   DELETE FROM cronologia WHERE evento_id IN (SELECT id FROM eventi WHERE note = 'esempio');
--   DELETE FROM eventi WHERE note = 'esempio';

INSERT OR IGNORE INTO eventi
  (id, tipo, titolo, data, ora_inizio, ora_fine, comune, provincia, regione, luogo, lat, lng,
   organizzatori, fonte, stato, conferme, creato_il, aggiornato_il, note)
VALUES
  ('2026-11-14-milano-corteo-01', 'corteo', '[ESEMPIO] Corteo per salari e caro vita',
   '2026-11-14', '14:30', NULL, 'Milano', 'MI', 'Lombardia', 'Piazza XXIV Maggio',
   45.4526, 9.1797, '["Coordinamento di esempio"]', NULL, 'verificato', 4,
   '2026-10-16T17:30:00', '2026-10-16T17:30:00', 'esempio'),

  ('2026-11-20-roma-sciopero_generale-01', 'sciopero_generale', '[ESEMPIO] Sciopero generale con presidio',
   '2026-11-20', '10:00', '13:00', 'Roma', 'RM', 'Lazio', 'Piazza della Repubblica',
   41.9028, 12.4964, '["Sindacato di esempio"]', NULL, 'verificato', 6,
   '2026-10-16T17:30:00', '2026-10-16T17:30:00', 'esempio'),

  ('2026-11-18-napoli-presidio-01', 'presidio', '[ESEMPIO] Presidio sotto la Regione per la sanità pubblica',
   '2026-11-18', '17:00', '19:00', 'Napoli', 'NA', 'Campania', 'Via Santa Lucia',
   40.8340, 14.2480, '["Comitato di esempio"]', NULL, 'da_verificare', 1,
   '2026-10-16T17:30:00', '2026-10-16T17:30:00', 'esempio'),

  ('2026-11-25-torino-sciopero_categoria-01', 'sciopero_categoria', '[ESEMPIO] Sciopero della logistica, presidio ai cancelli',
   '2026-11-25', '05:30', '09:00', 'Torino', 'TO', 'Piemonte', 'Area industriale (posizione indicativa)',
   45.0703, 7.6869, '["Sindacato di base di esempio"]', NULL, 'verificato', 3,
   '2026-10-16T17:30:00', '2026-10-16T17:30:00', 'esempio'),

  ('2026-11-12-bologna-assemblea-01', 'assemblea', '[ESEMPIO] Assemblea cittadina aperta',
   '2026-11-12', '20:45', '22:30', 'Bologna', 'BO', 'Emilia-Romagna', 'Piazza Maggiore',
   44.4938, 11.3426, '["Collettivo di esempio"]', NULL, 'annullato', 0,
   '2026-10-16T17:30:00', '2026-10-16T17:30:00', 'esempio');

INSERT INTO cronologia (evento_id, versione, azione, attore, dati, creato_il)
  SELECT id, 1, 'creato', 'admin', NULL, creato_il FROM eventi
  WHERE note = 'esempio'
    AND id NOT IN (SELECT evento_id FROM cronologia WHERE evento_id IS NOT NULL);
