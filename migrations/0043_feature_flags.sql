-- 0043_feature_flags.sql
-- Admin dashboard feature flag registry.

CREATE TABLE IF NOT EXISTS feature_flags (
  key TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  updated_at TEXT NOT NULL,
  updated_by TEXT REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_feature_flags_enabled
  ON feature_flags(enabled);

INSERT OR IGNORE INTO feature_flags(key, enabled, description, updated_at, updated_by) VALUES
  ('admin_dashboard_enabled', 0, 'Master switch for /admin surface', datetime('now'), NULL),
  ('admin_support_realtime', 0, 'Realtime support inbox (SupportInbox DO)', datetime('now'), NULL),
  ('admin_analytics_server_pulls', 0, 'Server-side GA4/Clarity/CF pulls', datetime('now'), NULL),
  ('admin_maintenance_mode', 0, 'Maintenance mode for /workshop mutations', datetime('now'), NULL);
