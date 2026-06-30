CREATE TABLE IF NOT EXISTS notification_definitions (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  kind TEXT NOT NULL CHECK (
    kind IN (
      'release_announcement',
      'system_notice',
      'collaboration',
      'publication_activity',
      'beta_feedback',
      'security_notice'
    )
  ),
  title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 120),
  body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 2000),
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'success', 'warning', 'critical')),
  surface TEXT NOT NULL DEFAULT 'center' CHECK (surface IN ('center', 'modal', 'toast_and_center')),
  release_version TEXT,
  priority INTEGER NOT NULL DEFAULT 0,
  dedupe_key TEXT UNIQUE,
  action_label TEXT CHECK (action_label IS NULL OR length(action_label) BETWEEN 1 AND 40),
  action_href TEXT CHECK (
    action_href IS NULL
    OR (
      action_href GLOB '/workshop*'
      AND action_href NOT GLOB '//*'
      AND action_href NOT GLOB '* *'
      AND lower(action_href) NOT GLOB '*javascript:*'
      AND lower(action_href) NOT GLOB '*http:*'
      AND lower(action_href) NOT GLOB '*https:*'
      AND lower(action_href) NOT GLOB '*%2f*'
      AND lower(action_href) NOT GLOB '*%5c*'
      AND action_href NOT GLOB '*\\*'
      AND lower(action_href) NOT GLOB '*../*'
      AND lower(action_href) NOT GLOB '*%2e%2e*'
    )
  ),
  payload_json TEXT NOT NULL DEFAULT '{}' CHECK (
    json_valid(payload_json)
    AND json_type(payload_json) = 'object'
  ),
  starts_at TEXT NOT NULL,
  expires_at TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notification_deliveries (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  notification_id TEXT NOT NULL REFERENCES notification_definitions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL CHECK (length(trim(user_id)) > 0),
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  estimate_id TEXT REFERENCES estimates(id) ON DELETE CASCADE,
  delivery_reason TEXT NOT NULL DEFAULT 'manual',
  delivered_at TEXT NOT NULL,
  seen_at TEXT,
  read_at TEXT,
  dismissed_at TEXT,
  archived_at TEXT,
  modal_acknowledged_at TEXT,
  payload_json TEXT NOT NULL DEFAULT '{}' CHECK (
    json_valid(payload_json)
    AND json_type(payload_json) = 'object'
  ),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(notification_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_notification_definitions_release_version
  ON notification_definitions(release_version)
  WHERE release_version IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notification_definitions_active
  ON notification_definitions(starts_at DESC, expires_at, priority DESC);

CREATE INDEX IF NOT EXISTS idx_notification_deliveries_user_feed
  ON notification_deliveries(user_id, delivered_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_deliveries_user_unread
  ON notification_deliveries(user_id, delivered_at DESC)
  WHERE read_at IS NULL AND dismissed_at IS NULL AND archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notification_deliveries_user_modal
  ON notification_deliveries(user_id, delivered_at DESC)
  WHERE modal_acknowledged_at IS NULL AND dismissed_at IS NULL AND archived_at IS NULL;
