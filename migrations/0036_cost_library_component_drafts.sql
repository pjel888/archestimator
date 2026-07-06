CREATE TABLE IF NOT EXISTS cost_library_component_drafts (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by TEXT,
  title TEXT NOT NULL DEFAULT 'Untitled component' CHECK (length(trim(title)) > 0),
  draft_json TEXT NOT NULL DEFAULT '{}' CHECK (
    json_valid(draft_json)
    AND json_type(draft_json) = 'object'
  ),
  status TEXT NOT NULL DEFAULT 'active' CHECK (
    status IN ('active', 'converted', 'discarded')
  ),
  converted_item_id TEXT REFERENCES cost_library_items(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  converted_at TEXT,
  discarded_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_cost_library_component_drafts_workspace_status
  ON cost_library_component_drafts(workspace_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_cost_library_component_drafts_workspace_creator
  ON cost_library_component_drafts(workspace_id, created_by, updated_at DESC)
  WHERE created_by IS NOT NULL;
