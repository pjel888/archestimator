CREATE TABLE project_component_attachment_retention_holds (
  source_delete_event_id TEXT NOT NULL CHECK (length(trim(source_delete_event_id)) > 0),
  attachment_id TEXT NOT NULL REFERENCES component_variant_attachments(id) ON DELETE CASCADE,
  upload_asset_id TEXT NOT NULL REFERENCES upload_assets(id) ON DELETE RESTRICT,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL,
  project_component_id TEXT NOT NULL CHECK (length(trim(project_component_id)) > 0),
  restore_expires_at TEXT NOT NULL,
  released_at TEXT,
  release_reason TEXT CHECK (
    release_reason IS NULL
    OR release_reason IN ('restored', 'expired', 'live_instance')
  ),
  created_at TEXT NOT NULL,
  PRIMARY KEY (source_delete_event_id, attachment_id),
  FOREIGN KEY (project_id, workspace_id)
    REFERENCES projects(id, workspace_id)
    ON DELETE CASCADE,
  CHECK (
    (released_at IS NULL AND release_reason IS NULL)
    OR (released_at IS NOT NULL AND release_reason IS NOT NULL)
  )
);

CREATE INDEX idx_project_component_attachment_retention_expiry
  ON project_component_attachment_retention_holds(restore_expires_at, attachment_id)
  WHERE released_at IS NULL;

CREATE INDEX idx_project_component_attachment_retention_component
  ON project_component_attachment_retention_holds(project_id, project_component_id, released_at);
