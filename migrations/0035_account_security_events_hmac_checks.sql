-- 0035_account_security_events_hmac_checks.sql
-- Account audit hashing moved from legacy `sha256:` digests to keyed
-- `hmac-sha256:` digests. D1 cannot ALTER CHECK constraints in place, so rebuild
-- the table while preserving existing audit rows and indexes.

CREATE TABLE account_security_events__hmac_rebuild (
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

INSERT INTO account_security_events__hmac_rebuild (
  id,
  event_type,
  user_id,
  workspace_id,
  request_id,
  ip_hash,
  user_agent_hash,
  metadata_json,
  created_at
)
SELECT
  id,
  event_type,
  user_id,
  workspace_id,
  request_id,
  ip_hash,
  user_agent_hash,
  metadata_json,
  created_at
FROM account_security_events;

DROP TABLE account_security_events;

ALTER TABLE account_security_events__hmac_rebuild
  RENAME TO account_security_events;

CREATE INDEX IF NOT EXISTS idx_account_security_events_user_created
  ON account_security_events(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_account_security_events_workspace_created
  ON account_security_events(workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_account_security_events_type_created
  ON account_security_events(event_type, created_at DESC);
