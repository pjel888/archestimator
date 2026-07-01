CREATE TABLE IF NOT EXISTS ai_package_apply_commands (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL CHECK (length(trim(idempotency_key)) > 0),
  command_kind TEXT NOT NULL CHECK (
    command_kind IN ('project_estimate_package', 'fill_current_estimate', 'library_components_package')
  ),
  draft_id TEXT NOT NULL CHECK (length(trim(draft_id)) > 0),
  draft_hash TEXT NOT NULL CHECK (length(trim(draft_hash)) > 0),
  status TEXT NOT NULL DEFAULT 'started' CHECK (status IN ('started', 'completed', 'failed')),
  actor_user_id TEXT NOT NULL CHECK (length(trim(actor_user_id)) > 0),
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  estimate_id TEXT REFERENCES estimates(id) ON DELETE SET NULL,
  selected_node_id TEXT REFERENCES estimate_nodes(id) ON DELETE SET NULL,
  created_node_ids_json TEXT NOT NULL DEFAULT '{}' CHECK (
    json_valid(created_node_ids_json)
    AND json_type(created_node_ids_json) = 'object'
  ),
  inserted_row_ids_json TEXT NOT NULL DEFAULT '[]' CHECK (
    json_valid(inserted_row_ids_json)
    AND json_type(inserted_row_ids_json) = 'array'
  ),
  result_json TEXT CHECK (
    result_json IS NULL
    OR (
      json_valid(result_json)
      AND json_type(result_json) = 'object'
    )
  ),
  failure_json TEXT CHECK (
    failure_json IS NULL
    OR (
      json_valid(failure_json)
      AND json_type(failure_json) = 'object'
    )
  ),
  created_at TEXT NOT NULL,
  completed_at TEXT,
  UNIQUE (workspace_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_ai_package_apply_commands_workspace_kind_key
  ON ai_package_apply_commands(workspace_id, command_kind, idempotency_key);

CREATE INDEX IF NOT EXISTS idx_ai_package_apply_commands_actor_created
  ON ai_package_apply_commands(actor_user_id, created_at DESC);
