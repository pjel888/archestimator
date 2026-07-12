INSERT OR IGNORE INTO feature_flags(key, enabled, description, updated_at, updated_by) VALUES
  ('client_portal_legacy_write_freeze', 0, 'Freeze legacy shared-link comments and decisions before Client Portal backfill or cutover.', datetime('now'), NULL);
