CREATE TABLE IF NOT EXISTS project_groups (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL CHECK (length(trim(user_id)) > 0),
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  accent_id TEXT CHECK (
    accent_id IS NULL
    OR accent_id IN ('slate', 'stone', 'sage', 'teal', 'indigo', 'plum', 'rose', 'clay')
  ),
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS project_group_memberships (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  group_id TEXT NOT NULL REFERENCES project_groups(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL CHECK (length(trim(user_id)) > 0),
  project_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id, workspace_id) REFERENCES projects(id, workspace_id) ON DELETE CASCADE,
  UNIQUE (user_id, project_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS project_groups_user_workspace_lower_name_idx
  ON project_groups(user_id, workspace_id, lower(name));

CREATE INDEX IF NOT EXISTS project_groups_workspace_user_position_idx
  ON project_groups(workspace_id, user_id, position, created_at);

CREATE INDEX IF NOT EXISTS project_group_memberships_workspace_user_idx
  ON project_group_memberships(workspace_id, user_id);

CREATE INDEX IF NOT EXISTS project_group_memberships_group_id_idx
  ON project_group_memberships(group_id);

CREATE INDEX IF NOT EXISTS project_group_memberships_project_id_idx
  ON project_group_memberships(project_id);
