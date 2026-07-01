CREATE TABLE IF NOT EXISTS ai_package_builder_memory_preferences (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  actor_user_id TEXT NOT NULL CHECK (length(trim(actor_user_id)) > 0),
  signal TEXT NOT NULL CHECK (signal IN ('accepted', 'rejected')),
  source_type TEXT NOT NULL CHECK (source_type IN ('library_item', 'template')),
  source_id TEXT NOT NULL CHECK (length(trim(source_id)) > 0),
  source_label TEXT NOT NULL CHECK (length(trim(source_label)) BETWEEN 1 AND 160),
  room_name TEXT,
  operation_type TEXT,
  draft_id TEXT NOT NULL CHECK (length(trim(draft_id)) > 0),
  draft_hash TEXT NOT NULL CHECK (length(trim(draft_hash)) > 0),
  weight REAL NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (
    json_valid(metadata_json)
    AND json_type(metadata_json) = 'object'
  ),
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_package_builder_memory_workspace_actor_created
  ON ai_package_builder_memory_preferences(workspace_id, actor_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_package_builder_memory_source
  ON ai_package_builder_memory_preferences(workspace_id, actor_user_id, source_type, source_id);
