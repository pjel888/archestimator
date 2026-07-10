-- 0044_admin_audit_events.sql
-- Admin dashboard audit event ledger.

CREATE TABLE IF NOT EXISTS admin_audit_events (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  actor_email TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  summary_json TEXT,
  request_id TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_actor
  ON admin_audit_events(actor_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_audit_action
  ON admin_audit_events(action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_audit_target
  ON admin_audit_events(target_type, target_id, created_at DESC);
