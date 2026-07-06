CREATE TABLE IF NOT EXISTS account_security_events (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  event_type TEXT NOT NULL CHECK (length(trim(event_type)) > 0),
  user_id TEXT,
  workspace_id TEXT,
  request_id TEXT,
  ip_hash TEXT CHECK (
    ip_hash IS NULL
    OR (
      length(ip_hash) = 71
      AND ip_hash GLOB 'sha256:[0-9a-f]*'
    )
    OR (
      length(ip_hash) = 76
      AND ip_hash GLOB 'hmac-sha256:[0-9a-f]*'
    )
  ),
  user_agent_hash TEXT CHECK (
    user_agent_hash IS NULL
    OR (
      length(user_agent_hash) = 71
      AND user_agent_hash GLOB 'sha256:[0-9a-f]*'
    )
    OR (
      length(user_agent_hash) = 76
      AND user_agent_hash GLOB 'hmac-sha256:[0-9a-f]*'
    )
  ),
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (
    json_valid(metadata_json)
    AND json_type(metadata_json) = 'object'
  ),
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_account_security_events_user_created
  ON account_security_events(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_account_security_events_workspace_created
  ON account_security_events(workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_account_security_events_type_created
  ON account_security_events(event_type, created_at DESC);
