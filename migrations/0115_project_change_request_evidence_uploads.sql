CREATE TABLE project_change_request_evidence_uploads (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  request_version_id TEXT NOT NULL REFERENCES project_change_request_versions(id) ON DELETE RESTRICT,
  upload_asset_id TEXT NOT NULL UNIQUE REFERENCES upload_assets(id) ON DELETE RESTRICT,
  recipient_id TEXT REFERENCES client_portal_recipients(id) ON DELETE RESTRICT,
  relationship TEXT NOT NULL CHECK (relationship IN ('evidence', 'reference', 'markup', 'supporting_document')),
  status TEXT NOT NULL DEFAULT 'pending_scan' CHECK (status IN ('pending_scan', 'rejected', 'linked')),
  artifact_version_id TEXT REFERENCES project_artifact_versions(id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  rejection_reason TEXT,
  CHECK (
    (status = 'pending_scan' AND artifact_version_id IS NULL AND rejection_reason IS NULL)
    OR (status = 'rejected' AND artifact_version_id IS NULL AND rejection_reason IS NOT NULL)
    OR (status = 'linked' AND artifact_version_id IS NOT NULL AND rejection_reason IS NULL)
  )
);

CREATE INDEX idx_project_change_request_evidence_uploads_request_status
  ON project_change_request_evidence_uploads(request_version_id, status, created_at, id);

CREATE TRIGGER project_change_request_evidence_uploads_scope_insert
BEFORE INSERT ON project_change_request_evidence_uploads
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM project_change_request_versions AS version
    JOIN project_change_requests AS request ON request.id = version.request_id
    JOIN upload_assets AS asset ON asset.id = NEW.upload_asset_id
      AND asset.workspace_id = request.workspace_id
      AND asset.project_id = request.project_id
      AND asset.surface = 'portal-request-evidence'
      AND asset.status = 'finalized'
      AND asset.purge_state = 'active'
    WHERE version.id = NEW.request_version_id
  ) THEN RAISE(ABORT, 'change request evidence upload ownership mismatch') END;

  SELECT CASE WHEN NEW.recipient_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM project_change_request_versions AS version
    JOIN project_change_requests AS request ON request.id = version.request_id
    JOIN client_portal_recipients AS recipient ON recipient.id = NEW.recipient_id
      AND recipient.portal_id = request.origin_portal_id
    WHERE version.id = NEW.request_version_id
      AND request.requested_by_actor_type = 'recipient'
      AND request.requested_by_actor_id = recipient.id
  ) THEN RAISE(ABORT, 'change request evidence recipient ownership mismatch') END;
END;

CREATE TRIGGER project_change_request_evidence_uploads_transition_update
BEFORE UPDATE ON project_change_request_evidence_uploads
BEGIN
  SELECT CASE
    WHEN NEW.id <> OLD.id
      OR NEW.request_version_id <> OLD.request_version_id
      OR NEW.upload_asset_id <> OLD.upload_asset_id
      OR NEW.recipient_id IS NOT OLD.recipient_id
      OR NEW.relationship <> OLD.relationship
      OR NEW.created_at <> OLD.created_at
    THEN RAISE(ABORT, 'change request evidence identity is immutable')
    WHEN OLD.status <> 'pending_scan' OR NEW.status NOT IN ('rejected', 'linked')
    THEN RAISE(ABORT, 'invalid change request evidence transition')
  END;

  SELECT CASE WHEN NEW.status = 'linked' AND NOT EXISTS (
    SELECT 1 FROM project_change_request_versions AS request_version
    JOIN project_change_requests AS request ON request.id = request_version.request_id
    JOIN project_artifact_versions AS artifact_version ON artifact_version.id = NEW.artifact_version_id
      AND artifact_version.workspace_id = request.workspace_id
      AND artifact_version.project_id = request.project_id
    WHERE request_version.id = NEW.request_version_id
  ) THEN RAISE(ABORT, 'change request evidence artifact ownership mismatch') END;
END;

CREATE TRIGGER project_change_request_evidence_uploads_prevent_delete
BEFORE DELETE ON project_change_request_evidence_uploads
BEGIN
  SELECT RAISE(ABORT, 'change request evidence uploads are retained');
END;
