CREATE TABLE IF NOT EXISTS estimate_sheet_access_settings (
  estimate_id TEXT PRIMARY KEY REFERENCES estimates(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL,
  inherit_project_access INTEGER NOT NULL DEFAULT 1 CHECK (inherit_project_access IN (0, 1)),
  updated_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (estimate_id, project_id) REFERENCES estimates(id, project_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS estimate_sheet_user_preferences (
  user_id TEXT NOT NULL CHECK (length(trim(user_id)) > 0),
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  estimate_id TEXT NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  column_widths_json TEXT NOT NULL DEFAULT '{}' CHECK (
    json_valid(column_widths_json)
    AND json_type(column_widths_json) = 'object'
    AND column_widths_json NOT GLOB '*http:*'
    AND column_widths_json NOT GLOB '*https:*'
    AND column_widths_json NOT GLOB '*token*'
    AND column_widths_json NOT GLOB '*signature*'
    AND column_widths_json NOT GLOB '*apikey*'
    AND column_widths_json NOT GLOB '*storage_path*'
    AND column_widths_json NOT GLOB '*signed_url*'
    AND column_widths_json NOT GLOB '*source_url*'
    AND column_widths_json NOT GLOB '*file_name*'
  ),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, workspace_id, estimate_id)
);

CREATE INDEX IF NOT EXISTS idx_estimate_sheet_access_settings_project
  ON estimate_sheet_access_settings(project_id);

CREATE INDEX IF NOT EXISTS idx_estimate_sheet_user_preferences_workspace_updated
  ON estimate_sheet_user_preferences(workspace_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_estimate_sheet_user_preferences_estimate_updated
  ON estimate_sheet_user_preferences(estimate_id, updated_at DESC);
