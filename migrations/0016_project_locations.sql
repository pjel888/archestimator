CREATE TABLE IF NOT EXISTS project_locations (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  project_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  latitude REAL NOT NULL CHECK (latitude >= -90 AND latitude <= 90),
  longitude REAL NOT NULL CHECK (longitude >= -180 AND longitude <= 180),
  accuracy_meters REAL CHECK (accuracy_meters IS NULL OR accuracy_meters >= 0),
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'geocoded', 'imported')),
  display_label TEXT,
  address_text TEXT,
  geocoder_name TEXT,
  provider_place_id TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (
    json_valid(metadata_json)
    AND json_type(metadata_json) = 'object'
  ),
  created_by TEXT,
  updated_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (project_id),
  FOREIGN KEY (project_id, workspace_id) REFERENCES projects(id, workspace_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_project_locations_workspace_project
  ON project_locations(workspace_id, project_id);
