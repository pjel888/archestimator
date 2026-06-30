CREATE TABLE IF NOT EXISTS workspace_members (
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL CHECK (length(trim(user_id)) > 0),
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_members_user
  ON workspace_members(user_id);

CREATE TABLE IF NOT EXISTS project_favorites (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  workspace_id TEXT NOT NULL,
  user_id TEXT NOT NULL CHECK (length(trim(user_id)) > 0),
  project_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (user_id, project_id),
  FOREIGN KEY (project_id, workspace_id) REFERENCES projects(id, workspace_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_project_favorites_workspace_user_created
  ON project_favorites(workspace_id, user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_project_favorites_project
  ON project_favorites(project_id);
