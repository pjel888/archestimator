-- 0046_cron_run_events.sql
-- Cron execution event ledger for admin observability.

CREATE TABLE IF NOT EXISTS cron_run_events (
  id TEXT PRIMARY KEY,
  cron_name TEXT NOT NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  status TEXT NOT NULL CHECK (status IN ('running','ok','error','skipped')),
  summary_json TEXT,
  error_class TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cron_run_name
  ON cron_run_events(cron_name, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_cron_run_status
  ON cron_run_events(status, started_at DESC);
