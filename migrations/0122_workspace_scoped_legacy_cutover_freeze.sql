CREATE TABLE IF NOT EXISTS client_portal_legacy_workspace_cutovers (
  workspace_id TEXT PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  frozen_at TEXT NOT NULL,
  frozen_by TEXT NOT NULL CHECK (length(trim(frozen_by)) > 0)
);

INSERT INTO client_portal_legacy_workspace_cutovers(workspace_id, frozen_at, frozen_by)
SELECT portal.workspace_id,
       MIN(COALESCE(
         CASE
           WHEN json_valid(mapping.notes)
           THEN NULLIF(json_extract(mapping.notes, '$.cutover_at'), '')
         END,
         mapping.verified_at,
         mapping.imported_at,
         datetime('now')
       )),
       'migration_0122_backfill'
FROM client_portal_legacy_mappings mapping
JOIN client_portals portal ON portal.id = mapping.portal_id
WHERE mapping.migration_status = 'cutover_complete'
GROUP BY portal.workspace_id
ON CONFLICT(workspace_id) DO NOTHING;

UPDATE feature_flags
SET enabled = 0,
    description = 'Deprecated global legacy write freeze; workspace cutovers are enforced by client_portal_legacy_workspace_cutovers.',
    updated_at = datetime('now'),
    updated_by = NULL
WHERE key = 'client_portal_legacy_write_freeze';

DROP TRIGGER project_publications_cutover_freeze_insert;
DROP TRIGGER project_publications_cutover_freeze_update;
DROP TRIGGER project_publications_cutover_freeze_delete;
DROP TRIGGER shared_link_recipients_cutover_freeze_insert;
DROP TRIGGER shared_link_recipients_cutover_freeze_update;
DROP TRIGGER shared_link_recipients_cutover_freeze_delete;
DROP TRIGGER shared_link_comments_cutover_freeze_insert;
DROP TRIGGER shared_link_comments_cutover_freeze_update;
DROP TRIGGER shared_link_comments_cutover_freeze_delete;
DROP TRIGGER shared_link_responses_cutover_freeze_insert;
DROP TRIGGER shared_link_responses_cutover_freeze_update;
DROP TRIGGER shared_link_responses_cutover_freeze_delete;

CREATE TRIGGER project_publications_cutover_freeze_insert
BEFORE INSERT ON project_publications
WHEN EXISTS (
  SELECT 1
  FROM projects project
  JOIN workspaces workspace ON workspace.id = project.workspace_id
  JOIN client_portal_legacy_workspace_cutovers cutover ON cutover.workspace_id = workspace.id
  WHERE project.id = NEW.project_id
)
BEGIN
  SELECT RAISE(ABORT, 'legacy publication writes are frozen after Client Portal cutover');
END;

CREATE TRIGGER project_publications_cutover_freeze_update
BEFORE UPDATE ON project_publications
WHEN EXISTS (
  SELECT 1
  FROM projects project
  JOIN workspaces workspace ON workspace.id = project.workspace_id
  JOIN client_portal_legacy_workspace_cutovers cutover ON cutover.workspace_id = workspace.id
  WHERE project.id IN (OLD.project_id, NEW.project_id)
)
BEGIN
  SELECT RAISE(ABORT, 'legacy publication writes are frozen after Client Portal cutover');
END;

CREATE TRIGGER project_publications_cutover_freeze_delete
BEFORE DELETE ON project_publications
WHEN EXISTS (
  SELECT 1
  FROM projects project
  JOIN workspaces workspace ON workspace.id = project.workspace_id
  JOIN client_portal_legacy_workspace_cutovers cutover ON cutover.workspace_id = workspace.id
  WHERE project.id = OLD.project_id
)
BEGIN
  SELECT RAISE(ABORT, 'legacy publication writes are frozen after Client Portal cutover');
END;

CREATE TRIGGER shared_link_recipients_cutover_freeze_insert
BEFORE INSERT ON shared_link_recipients
WHEN EXISTS (
  SELECT 1
  FROM project_publications publication
  JOIN projects project ON project.id = publication.project_id
  JOIN workspaces workspace ON workspace.id = project.workspace_id
  JOIN client_portal_legacy_workspace_cutovers cutover ON cutover.workspace_id = workspace.id
  WHERE publication.id = NEW.publication_id
)
BEGIN
  SELECT RAISE(ABORT, 'legacy recipient writes are frozen after Client Portal cutover');
END;

CREATE TRIGGER shared_link_recipients_cutover_freeze_update
BEFORE UPDATE ON shared_link_recipients
WHEN EXISTS (
  SELECT 1
  FROM project_publications publication
  JOIN projects project ON project.id = publication.project_id
  JOIN workspaces workspace ON workspace.id = project.workspace_id
  JOIN client_portal_legacy_workspace_cutovers cutover ON cutover.workspace_id = workspace.id
  WHERE publication.id IN (OLD.publication_id, NEW.publication_id)
)
BEGIN
  SELECT RAISE(ABORT, 'legacy recipient writes are frozen after Client Portal cutover');
END;

CREATE TRIGGER shared_link_recipients_cutover_freeze_delete
BEFORE DELETE ON shared_link_recipients
WHEN EXISTS (
  SELECT 1
  FROM project_publications publication
  JOIN projects project ON project.id = publication.project_id
  JOIN workspaces workspace ON workspace.id = project.workspace_id
  JOIN client_portal_legacy_workspace_cutovers cutover ON cutover.workspace_id = workspace.id
  WHERE publication.id = OLD.publication_id
)
BEGIN
  SELECT RAISE(ABORT, 'legacy recipient writes are frozen after Client Portal cutover');
END;

CREATE TRIGGER shared_link_comments_cutover_freeze_insert
BEFORE INSERT ON shared_link_comments
WHEN EXISTS (
  SELECT 1
  FROM project_publications publication
  JOIN projects project ON project.id = publication.project_id
  JOIN workspaces workspace ON workspace.id = project.workspace_id
  JOIN client_portal_legacy_workspace_cutovers cutover ON cutover.workspace_id = workspace.id
  WHERE publication.id = NEW.publication_id
)
BEGIN
  SELECT RAISE(ABORT, 'legacy comment writes are frozen after Client Portal cutover');
END;

CREATE TRIGGER shared_link_comments_cutover_freeze_update
BEFORE UPDATE ON shared_link_comments
WHEN EXISTS (
  SELECT 1
  FROM project_publications publication
  JOIN projects project ON project.id = publication.project_id
  JOIN workspaces workspace ON workspace.id = project.workspace_id
  JOIN client_portal_legacy_workspace_cutovers cutover ON cutover.workspace_id = workspace.id
  WHERE publication.id IN (OLD.publication_id, NEW.publication_id)
)
BEGIN
  SELECT RAISE(ABORT, 'legacy comment writes are frozen after Client Portal cutover');
END;

CREATE TRIGGER shared_link_comments_cutover_freeze_delete
BEFORE DELETE ON shared_link_comments
WHEN EXISTS (
  SELECT 1
  FROM project_publications publication
  JOIN projects project ON project.id = publication.project_id
  JOIN workspaces workspace ON workspace.id = project.workspace_id
  JOIN client_portal_legacy_workspace_cutovers cutover ON cutover.workspace_id = workspace.id
  WHERE publication.id = OLD.publication_id
)
BEGIN
  SELECT RAISE(ABORT, 'legacy comment writes are frozen after Client Portal cutover');
END;

CREATE TRIGGER shared_link_responses_cutover_freeze_insert
BEFORE INSERT ON shared_link_responses
WHEN EXISTS (
  SELECT 1
  FROM project_publications publication
  JOIN projects project ON project.id = publication.project_id
  JOIN workspaces workspace ON workspace.id = project.workspace_id
  JOIN client_portal_legacy_workspace_cutovers cutover ON cutover.workspace_id = workspace.id
  WHERE publication.id = NEW.publication_id
)
BEGIN
  SELECT RAISE(ABORT, 'legacy decision writes are frozen after Client Portal cutover');
END;

CREATE TRIGGER shared_link_responses_cutover_freeze_update
BEFORE UPDATE ON shared_link_responses
WHEN EXISTS (
  SELECT 1
  FROM project_publications publication
  JOIN projects project ON project.id = publication.project_id
  JOIN workspaces workspace ON workspace.id = project.workspace_id
  JOIN client_portal_legacy_workspace_cutovers cutover ON cutover.workspace_id = workspace.id
  WHERE publication.id IN (OLD.publication_id, NEW.publication_id)
)
BEGIN
  SELECT RAISE(ABORT, 'legacy decision writes are frozen after Client Portal cutover');
END;

CREATE TRIGGER shared_link_responses_cutover_freeze_delete
BEFORE DELETE ON shared_link_responses
WHEN EXISTS (
  SELECT 1
  FROM project_publications publication
  JOIN projects project ON project.id = publication.project_id
  JOIN workspaces workspace ON workspace.id = project.workspace_id
  JOIN client_portal_legacy_workspace_cutovers cutover ON cutover.workspace_id = workspace.id
  WHERE publication.id = OLD.publication_id
)
BEGIN
  SELECT RAISE(ABORT, 'legacy decision writes are frozen after Client Portal cutover');
END;
