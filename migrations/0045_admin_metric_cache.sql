-- 0045_admin_metric_cache.sql
-- Short-lived admin metric payload cache.

CREATE TABLE IF NOT EXISTS admin_metric_cache (
  key TEXT PRIMARY KEY,
  payload_json TEXT NOT NULL,
  fetched_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_metric_expires
  ON admin_metric_cache(expires_at);
