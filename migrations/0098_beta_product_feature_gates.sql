-- 0098_beta_product_feature_gates.sql
-- Additive closed-beta product feature gates. INSERT OR IGNORE only — never
-- delete existing feature_flags rows or any beta-user data.
-- Defaults: proposals off (incomplete inbox), publisher/templates/support on.

INSERT OR IGNORE INTO feature_flags(key, enabled, description, updated_at, updated_by) VALUES
  ('beta_proposals_enabled', 0, 'Workshop proposals inbox and navigation', datetime('now'), NULL),
  ('beta_publisher_enabled', 1, 'Workshop Share/Publisher surface and navigation', datetime('now'), NULL),
  ('beta_templates_enabled', 1, 'Standalone estimate templates surface', datetime('now'), NULL);

-- Refresh operator-facing descriptions for existing admin ops flags without
-- changing enabled state. No DELETE / DROP.
UPDATE feature_flags
SET description = CASE key
  WHEN 'admin_dashboard_enabled' THEN 'Master switch for the /admin founder surface'
  WHEN 'admin_support_realtime' THEN 'Workshop in-app support chat intake for /admin/support'
  WHEN 'admin_analytics_server_pulls' THEN 'Reserved: deferred GA4/Clarity/Cloudflare server pulls (not enforced)'
  WHEN 'admin_maintenance_mode' THEN 'Blocks workshop write mutations for non-platform-admins'
  ELSE description
END,
updated_at = datetime('now')
WHERE key IN (
  'admin_dashboard_enabled',
  'admin_support_realtime',
  'admin_analytics_server_pulls',
  'admin_maintenance_mode'
);

-- Enable support chat for closed beta by default when still off from the 0043 seed.
UPDATE feature_flags
SET enabled = 1,
    updated_at = datetime('now')
WHERE key = 'admin_support_realtime'
  AND enabled = 0;
