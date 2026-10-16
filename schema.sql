CREATE TABLE IF NOT EXISTS eventi (
  id TEXT PRIMARY KEY,
  tipo TEXT NOT NULL CHECK (tipo IN ('corteo','presidio','sciopero_generale','sciopero_categoria','picchetto','assemblea','altro')),
  titolo TEXT NOT NULL,
  data TEXT NOT NULL,
  ora_inizio TEXT,
  ora_fine TEXT,
  comune TEXT NOT NULL,
  provincia TEXT NOT NULL,
  regione TEXT NOT NULL,
  luogo TEXT,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  posizione_approssimativa INTEGER DEFAULT 0,
  organizzatori TEXT,
  fonte TEXT,
  stato TEXT NOT NULL DEFAULT 'da_verificare'
    CHECK (stato IN ('da_verificare','verificato','annullato','nascosto','rifiutato')),
  conferme INTEGER DEFAULT 0,
  segnalazioni_aperte INTEGER DEFAULT 0,
  versione INTEGER DEFAULT 1,
  creato_il TEXT,
  aggiornato_il TEXT,
  note TEXT,
  telegram_msg_id INTEGER
);
CREATE INDEX IF NOT EXISTS idx_eventi_data_stato ON eventi (data, stato);
CREATE TABLE IF NOT EXISTS modifiche (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  evento_id TEXT NOT NULL REFERENCES eventi(id),
  campi TEXT NOT NULL,
  motivo TEXT,
  fonte TEXT,
  stato TEXT DEFAULT 'in_attesa' CHECK (stato IN ('in_attesa','accettata','rifiutata')),
  autore_anonimo TEXT,
  creato_il TEXT,
  deciso_da TEXT,
  deciso_il TEXT
);
CREATE TABLE IF NOT EXISTS problemi (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  evento_id TEXT NOT NULL REFERENCES eventi(id),
  motivo TEXT CHECK (motivo IN ('sbagliato','annullato','doppione','inappropriato','altro')),
  nota TEXT,
  stato TEXT DEFAULT 'aperta',
  autore_anonimo TEXT,
  creato_il TEXT
);
CREATE TABLE IF NOT EXISTS conferme (
  evento_id TEXT,
  autore_anonimo TEXT,
  creato_il TEXT,
  PRIMARY KEY (evento_id, autore_anonimo)
);
CREATE TABLE IF NOT EXISTS cronologia (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  evento_id TEXT,
  versione INTEGER,
  azione TEXT,
  attore TEXT,
  dati TEXT,
  creato_il TEXT
);
CREATE TABLE IF NOT EXISTS moderatori (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  ruolo TEXT CHECK (ruolo IN ('moderatore','admin')),
  regioni TEXT,
  attivo INTEGER DEFAULT 1,
  creato_il TEXT
);
CREATE TABLE IF NOT EXISTS staff (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  ruolo TEXT NOT NULL CHECK (ruolo IN ('moderatore','admin')),
  regioni TEXT,
  codice_hash TEXT NOT NULL UNIQUE,
  attivo INTEGER DEFAULT 1,
  creato_il TEXT,
  ultimo_accesso TEXT
);
CREATE TABLE IF NOT EXISTS invii (
  hash TEXT NOT NULL,
  azione TEXT NOT NULL,
  creato_il TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_invii ON invii (hash, creato_il);
CREATE TABLE IF NOT EXISTS impostazioni (
  chiave TEXT PRIMARY KEY,
  valore TEXT
);
INSERT OR IGNORE INTO impostazioni (chiave, valore) VALUES
  ('pubblicazione_immediata', 'si'),
  ('conferme_per_verifica', '3'),
  ('segnalazioni_per_nascondere', '3'),
  ('max_invii_ora', '5'),
  ('giorni_conservazione', '30'),
  ('telegram_auto', 'si');
