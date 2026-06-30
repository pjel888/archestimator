CREATE TABLE IF NOT EXISTS component_library_telemetry_events (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  actor_user_id TEXT NOT NULL,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE SET NULL,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  estimate_id TEXT REFERENCES estimates(id) ON DELETE SET NULL,
  event_name TEXT NOT NULL CHECK (length(trim(event_name)) > 0),
  schema_version TEXT NOT NULL CHECK (schema_version = 'v1'),
  surface TEXT,
  kind TEXT,
  resource_kind TEXT,
  action TEXT,
  reason TEXT,
  payload_json TEXT NOT NULL DEFAULT '{}' CHECK (
    json_valid(payload_json)
    AND json_type(payload_json) = 'object'
    AND payload_json NOT LIKE '%token%'
    AND payload_json NOT LIKE '%signed%'
    AND payload_json NOT LIKE '%storage_path%'
  ),
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_component_library_telemetry_workspace_created
  ON component_library_telemetry_events(workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_component_library_telemetry_event_created
  ON component_library_telemetry_events(event_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_component_library_telemetry_actor_created
  ON component_library_telemetry_events(actor_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS component_library_user_preferences (
  user_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  active_tab TEXT NOT NULL DEFAULT 'components' CHECK (active_tab IN ('components', 'project', 'templates')),
  component_view_mode TEXT NOT NULL DEFAULT 'default' CHECK (component_view_mode IN ('default', 'suppliers', 'brand')),
  favorite_item_ids_json TEXT NOT NULL DEFAULT '[]' CHECK (
    json_valid(favorite_item_ids_json)
    AND json_type(favorite_item_ids_json) = 'array'
    AND json_array_length(favorite_item_ids_json) <= 500
  ),
  recent_item_ids_json TEXT NOT NULL DEFAULT '[]' CHECK (
    json_valid(recent_item_ids_json)
    AND json_type(recent_item_ids_json) = 'array'
    AND json_array_length(recent_item_ids_json) <= 100
  ),
  tree_order_json TEXT NOT NULL DEFAULT '{}' CHECK (
    json_valid(tree_order_json)
    AND json_type(tree_order_json) = 'object'
    AND tree_order_json NOT LIKE '%token%'
    AND tree_order_json NOT LIKE '%signed%'
    AND tree_order_json NOT LIKE '%storage_path%'
  ),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, workspace_id)
);

CREATE INDEX IF NOT EXISTS idx_component_library_user_preferences_workspace_updated
  ON component_library_user_preferences(workspace_id, updated_at DESC);
