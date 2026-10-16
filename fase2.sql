CREATE TABLE IF NOT EXISTS staff (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL, ruolo TEXT NOT NULL CHECK (ruolo IN ('moderatore','admin')), regioni TEXT, codice_hash TEXT NOT NULL UNIQUE, attivo INTEGER DEFAULT 1, creato_il TEXT, ultimo_accesso TEXT);
ALTER TABLE eventi ADD COLUMN telegram_msg_id INTEGER;
INSERT OR IGNORE INTO impostazioni (chiave, valore) VALUES ('telegram_auto', 'si');
