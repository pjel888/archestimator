CREATE TABLE IF NOT EXISTS estimate_favorites (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  workspace_id TEXT NOT NULL,
  user_id TEXT NOT NULL CHECK (length(trim(user_id)) > 0),
  project_id TEXT NOT NULL,
  estimate_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (user_id, estimate_id),
  FOREIGN KEY (project_id, workspace_id) REFERENCES projects(id, workspace_id) ON DELETE CASCADE,
  FOREIGN KEY (estimate_id, project_id) REFERENCES estimates(id, project_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_estimate_favorites_workspace_user_created
  ON estimate_favorites(workspace_id, user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_estimate_favorites_estimate
  ON estimate_favorites(estimate_id);
