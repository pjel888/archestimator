-- 0049_ops_run_events.sql
-- Operations script run event ledger for admin observability.

CREATE TABLE IF NOT EXISTS ops_run_events (
  id TEXT PRIMARY KEY,
  ops_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ok','error','skipped')),
  summary_json TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ops_run_name
  ON ops_run_events(ops_name, created_at DESC);
