CREATE TABLE IF NOT EXISTS ai_action_runs (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  run_id TEXT NOT NULL UNIQUE CHECK (length(trim(run_id)) > 0),
  workspace_id TEXT NOT NULL CHECK (length(trim(workspace_id)) > 0),
  actor_user_id TEXT NOT NULL CHECK (length(trim(actor_user_id)) > 0),
  mode TEXT NOT NULL CHECK (mode IN ('ask', 'draft', 'apply', 'eval')),
  status TEXT NOT NULL DEFAULT 'started' CHECK (status IN ('started', 'completed', 'failed', 'blocked')),
  provider TEXT NOT NULL DEFAULT '',
  model TEXT NOT NULL DEFAULT '',
  provider_response_id TEXT,
  request_message_hash TEXT CHECK (
    request_message_hash IS NULL
    OR (
      length(request_message_hash) = 71
      AND request_message_hash GLOB 'sha256:[0-9a-f]*'
    )
  ),
  route_context_hash TEXT CHECK (
    route_context_hash IS NULL
    OR (
      length(route_context_hash) = 71
      AND route_context_hash GLOB 'sha256:[0-9a-f]*'
    )
  ),
  provider_send_categories_json TEXT NOT NULL DEFAULT '[]' CHECK (
    json_valid(provider_send_categories_json)
    AND json_type(provider_send_categories_json) = 'array'
  ),
  redaction_status TEXT NOT NULL DEFAULT 'metadata_only' CHECK (
    redaction_status IN ('metadata_only', 'redacted', 'synthetic', 'blocked')
  ),
  usage_json TEXT NOT NULL DEFAULT '{}' CHECK (
    json_valid(usage_json)
    AND json_type(usage_json) = 'object'
  ),
  error_class TEXT,
  blocked_reason TEXT,
  request_host TEXT,
  user_agent_hash TEXT CHECK (
    user_agent_hash IS NULL
    OR (
      length(user_agent_hash) = 71
      AND user_agent_hash GLOB 'sha256:[0-9a-f]*'
    )
  ),
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (
    json_valid(metadata_json)
    AND json_type(metadata_json) = 'object'
  ),
  started_at TEXT NOT NULL,
  completed_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ai_tool_calls (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  run_id TEXT NOT NULL REFERENCES ai_action_runs(run_id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL CHECK (length(trim(workspace_id)) > 0),
  actor_user_id TEXT NOT NULL CHECK (length(trim(actor_user_id)) > 0),
  tool_name TEXT NOT NULL CHECK (length(trim(tool_name)) > 0),
  mode TEXT NOT NULL CHECK (mode IN ('ask', 'draft', 'apply', 'eval')),
  status TEXT NOT NULL DEFAULT 'started' CHECK (status IN ('started', 'completed', 'failed', 'blocked')),
  target_project_id TEXT,
  target_estimate_id TEXT,
  target_node_id TEXT,
  target_row_id TEXT,
  args_hash TEXT CHECK (
    args_hash IS NULL
    OR (
      length(args_hash) = 71
      AND args_hash GLOB 'sha256:[0-9a-f]*'
    )
  ),
  result_hash TEXT CHECK (
    result_hash IS NULL
    OR (
      length(result_hash) = 71
      AND result_hash GLOB 'sha256:[0-9a-f]*'
    )
  ),
  validation_errors_json TEXT NOT NULL DEFAULT '[]' CHECK (
    json_valid(validation_errors_json)
    AND json_type(validation_errors_json) = 'array'
  ),
  safe_summary TEXT NOT NULL DEFAULT '',
  started_at TEXT NOT NULL,
  completed_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ai_data_access_events (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  run_id TEXT NOT NULL REFERENCES ai_action_runs(run_id) ON DELETE CASCADE,
  tool_call_id TEXT REFERENCES ai_tool_calls(id) ON DELETE SET NULL,
  workspace_id TEXT NOT NULL CHECK (length(trim(workspace_id)) > 0),
  actor_user_id TEXT NOT NULL CHECK (length(trim(actor_user_id)) > 0),
  event_name TEXT NOT NULL CHECK (length(trim(event_name)) > 0),
  source_tables_json TEXT NOT NULL DEFAULT '[]' CHECK (
    json_valid(source_tables_json)
    AND json_type(source_tables_json) = 'array'
  ),
  target_project_id TEXT,
  target_estimate_id TEXT,
  target_node_id TEXT,
  target_row_id TEXT,
  filter_hash TEXT CHECK (
    filter_hash IS NULL
    OR (
      length(filter_hash) = 71
      AND filter_hash GLOB 'sha256:[0-9a-f]*'
    )
  ),
  row_count INTEGER NOT NULL DEFAULT 0 CHECK (row_count >= 0),
  blocked_attempt INTEGER NOT NULL DEFAULT 0 CHECK (blocked_attempt IN (0, 1)),
  blocked_reason TEXT,
  redaction_status TEXT NOT NULL DEFAULT 'metadata_only' CHECK (
    redaction_status IN ('metadata_only', 'redacted', 'synthetic', 'blocked')
  ),
  safe_summary TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS security_rate_limit_events (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  scope TEXT NOT NULL CHECK (length(trim(scope)) > 0),
  key_hash TEXT NOT NULL CHECK (length(trim(key_hash)) > 0),
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (
    json_valid(metadata_json)
    AND json_type(metadata_json) = 'object'
  ),
  occurred_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_action_runs_workspace_actor_created
  ON ai_action_runs(workspace_id, actor_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_action_runs_status_created
  ON ai_action_runs(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_tool_calls_run_created
  ON ai_tool_calls(run_id, created_at);

CREATE INDEX IF NOT EXISTS idx_ai_tool_calls_workspace_tool_created
  ON ai_tool_calls(workspace_id, tool_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_data_access_events_run_created
  ON ai_data_access_events(run_id, created_at);

CREATE INDEX IF NOT EXISTS idx_ai_data_access_events_workspace_event_created
  ON ai_data_access_events(workspace_id, event_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_rate_limit_events_lookup
  ON security_rate_limit_events(scope, key_hash, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_rate_limit_events_expiry
  ON security_rate_limit_events(expires_at);
