CREATE TABLE IF NOT EXISTS mass_deletion_events (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  actor_user_id TEXT NOT NULL CHECK (length(trim(actor_user_id)) > 0),
  target_type TEXT NOT NULL CHECK (target_type IN ('project', 'estimate_sheet', 'library_component')),
  action TEXT NOT NULL CHECK (action IN ('delete', 'archive')),
  target_ids_json TEXT NOT NULL CHECK (
    json_valid(target_ids_json)
    AND json_type(target_ids_json) = 'array'
  ),
  preview_hash TEXT NOT NULL CHECK (length(trim(preview_hash)) > 0),
  correlation_id TEXT NOT NULL CHECK (length(trim(correlation_id)) > 0),
  status TEXT NOT NULL CHECK (
    status IN (
      'storage_cleanup_pending',
      'storage_cleanup_completed',
      'storage_cleanup_failed',
      'completed',
      'failed'
    )
  ),
  summary_json TEXT NOT NULL CHECK (
    json_valid(summary_json)
    AND json_type(summary_json) = 'object'
  ),
  blocked_json TEXT NOT NULL DEFAULT '[]' CHECK (
    json_valid(blocked_json)
    AND json_type(blocked_json) = 'array'
  ),
  storage_targets_json TEXT NOT NULL DEFAULT '[]' CHECK (
    json_valid(storage_targets_json)
    AND json_type(storage_targets_json) = 'array'
  ),
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (
    json_valid(metadata_json)
    AND json_type(metadata_json) = 'object'
  ),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (workspace_id, target_type, action, correlation_id)
);

CREATE INDEX IF NOT EXISTS idx_mass_deletion_events_workspace_created
  ON mass_deletion_events(workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_mass_deletion_events_actor_correlation
  ON mass_deletion_events(actor_user_id, correlation_id);
