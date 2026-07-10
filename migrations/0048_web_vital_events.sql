-- 0048_web_vital_events.sql
-- Web vital event ledger for admin observability.

CREATE TABLE IF NOT EXISTS web_vital_events (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  route TEXT,
  metric_name TEXT NOT NULL,
  metric_value REAL NOT NULL,
  rating TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_web_vital_created
  ON web_vital_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_web_vital_name
  ON web_vital_events(metric_name, created_at DESC);
