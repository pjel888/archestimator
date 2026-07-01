ALTER TABLE estimate_nodes ADD COLUMN metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (
  json_valid(metadata_json)
  AND json_type(metadata_json) = 'object'
);

ALTER TABLE estimate_row_items ADD COLUMN supplier TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS estimate_sheet_events (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  estimate_id TEXT NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL,
  estimate_node_id TEXT,
  estimate_tab_id TEXT,
  target_row_id TEXT,
  event_type TEXT NOT NULL CHECK (length(trim(event_type)) > 0),
  event_source TEXT NOT NULL DEFAULT 'server_action',
  correlation_id TEXT NOT NULL CHECK (length(trim(correlation_id)) > 0),
  actor_user_id TEXT,
  changed_fields TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(changed_fields)),
  row_context TEXT NOT NULL DEFAULT '{}' CHECK (
    json_valid(row_context)
    AND json_type(row_context) = 'object'
  ),
  old_snapshot TEXT CHECK (old_snapshot IS NULL OR json_valid(old_snapshot)),
  new_snapshot TEXT CHECK (new_snapshot IS NULL OR json_valid(new_snapshot)),
  payload TEXT NOT NULL DEFAULT '{}' CHECK (
    json_valid(payload)
    AND json_type(payload) = 'object'
  ),
  metadata TEXT NOT NULL DEFAULT '{}' CHECK (
    json_valid(metadata)
    AND json_type(metadata) = 'object'
  ),
  total_delta REAL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (project_id, workspace_id) REFERENCES projects(id, workspace_id) ON DELETE CASCADE,
  FOREIGN KEY (estimate_id, project_id) REFERENCES estimates(id, project_id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_estimate_sheet_events_correlation
  ON estimate_sheet_events(estimate_id, correlation_id);

CREATE INDEX IF NOT EXISTS idx_estimate_sheet_events_project_created
  ON estimate_sheet_events(project_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_estimate_sheet_events_workspace_project_created
  ON estimate_sheet_events(workspace_id, project_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_estimate_sheet_events_estimate_created
  ON estimate_sheet_events(estimate_id, created_at DESC, id DESC);
