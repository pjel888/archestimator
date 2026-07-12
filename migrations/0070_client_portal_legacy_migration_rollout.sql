-- 0070_client_portal_legacy_migration_rollout.sql
-- Keep legacy migration behind an audited, fail-closed operator flag.

INSERT OR IGNORE INTO feature_flags(key, enabled, description, updated_at, updated_by) VALUES
  ('client_portal_legacy_migration', 0, 'Allow authenticated Publisher managers to migrate legacy client links into Client Portal.', datetime('now'), NULL);
