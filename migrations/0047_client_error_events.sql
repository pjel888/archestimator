-- 0047_client_error_events.sql
-- Redacted client error event ledger for admin observability.

CREATE TABLE IF NOT EXISTS client_error_events (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  route TEXT,
  error_class TEXT NOT NULL,
  message_redacted TEXT NOT NULL,
  stack_hash TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_client_error_created
  ON client_error_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_client_error_class
  ON client_error_events(error_class, created_at DESC);
