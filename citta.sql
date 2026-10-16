ALTER TABLE eventi ADD COLUMN gruppo TEXT;
CREATE INDEX IF NOT EXISTS idx_eventi_gruppo ON eventi (gruppo);
