ALTER TABLE projects
  ADD COLUMN status TEXT NOT NULL DEFAULT 'ongoing'
  CHECK (status IN ('ongoing', 'completed', 'archived'));

CREATE INDEX IF NOT EXISTS idx_projects_workspace_status_updated
  ON projects(workspace_id, status, updated_at DESC);
