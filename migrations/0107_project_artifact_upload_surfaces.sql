PRAGMA defer_foreign_keys = ON;

CREATE TABLE __0107_assertion (
  value INTEGER NOT NULL
);

CREATE TRIGGER __0107_assertion_fail
BEFORE INSERT ON __0107_assertion
WHEN NEW.value <> 0
BEGIN
  SELECT RAISE(ROLLBACK, 'project_artifact_upload_surface_preflight_failed');
END;

INSERT INTO __0107_assertion (value)
SELECT 1
WHERE EXISTS (SELECT 1 FROM pragma_foreign_key_check)
   OR EXISTS (
     SELECT 1 FROM upload_sessions
     WHERE surface NOT IN ('project-image', 'component-image', 'component-attachment')
   )
   OR EXISTS (
     SELECT 1 FROM upload_assets
     WHERE surface NOT IN ('project-image', 'component-image', 'component-attachment')
   );

CREATE TABLE upload_sessions__0107 (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  actor_user_id TEXT,
  surface TEXT NOT NULL CHECK (surface IN ('project-image', 'component-image', 'component-attachment', 'project-artifact', 'portal-request-evidence')),
  target_entity_type TEXT,
  target_entity_id TEXT,
  storage_bucket TEXT NOT NULL CHECK (length(trim(storage_bucket)) > 0),
  storage_path TEXT NOT NULL CHECK (length(trim(storage_path)) > 0),
  file_name TEXT NOT NULL CHECK (length(trim(file_name)) > 0),
  content_type TEXT NOT NULL CHECK (length(trim(content_type)) > 0),
  size_bytes INTEGER NOT NULL DEFAULT 0 CHECK (size_bytes >= 0),
  checksum_sha256 TEXT CHECK (
    checksum_sha256 IS NULL OR (length(checksum_sha256) = 64 AND lower(checksum_sha256) = checksum_sha256)
  ),
  status TEXT NOT NULL CHECK (status IN ('reserved', 'pending', 'finalized', 'failed', 'expired', 'deleted', 'aborted')),
  expires_at TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json) AND json_type(metadata_json) = 'object'),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE upload_assets__0107 (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  actor_user_id TEXT,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  estimate_id TEXT REFERENCES estimates(id) ON DELETE SET NULL,
  upload_session_id TEXT,
  surface TEXT NOT NULL CHECK (surface IN ('project-image', 'component-image', 'component-attachment', 'project-artifact', 'portal-request-evidence')),
  target_entity_type TEXT,
  target_entity_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('reserved', 'pending', 'finalized', 'deleted', 'removed', 'failed', 'aborted')),
  file_name TEXT NOT NULL CHECK (length(trim(file_name)) > 0),
  content_type TEXT NOT NULL CHECK (length(trim(content_type)) > 0),
  size_bytes INTEGER NOT NULL DEFAULT 0 CHECK (size_bytes >= 0),
  checksum_sha256 TEXT CHECK (
    checksum_sha256 IS NULL OR (length(checksum_sha256) = 64 AND lower(checksum_sha256) = checksum_sha256)
  ),
  scan_status TEXT CHECK (
    scan_status IS NULL OR scan_status IN ('pending', 'not_required', 'clean', 'infected', 'unsupported', 'failed_transient', 'failed_permanent', 'override_approved')
  ),
  scan_provider TEXT,
  scan_result_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(scan_result_json) AND json_type(scan_result_json) = 'object'),
  scanned_at TEXT,
  scan_override_actor_user_id TEXT,
  scan_override_reason TEXT,
  scan_override_expires_at TEXT,
  scan_override_checksum_sha256 TEXT,
  storage_bucket TEXT,
  storage_path TEXT,
  thumbnail_path TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json) AND json_type(metadata_json) = 'object'),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  removal_claim_id TEXT,
  removal_claimed_at TEXT,
  cleanup_not_before TEXT,
  purge_state TEXT NOT NULL DEFAULT 'active' CHECK (purge_state IN ('active', 'pending', 'purged')),
  purged_at TEXT,
  CHECK (
    scan_status <> 'override_approved' OR (
      scan_override_actor_user_id IS NOT NULL
      AND length(trim(coalesce(scan_override_reason, ''))) >= 8
      AND scan_override_expires_at IS NOT NULL
      AND scan_override_checksum_sha256 IS NOT NULL
    )
  )
);

CREATE TABLE upload_events__0107 (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  upload_session_id TEXT,
  upload_asset_id TEXT REFERENCES upload_assets__0107(id) ON DELETE CASCADE,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE SET NULL,
  actor_user_id TEXT,
  event_type TEXT NOT NULL CHECK (length(trim(event_type)) > 0),
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json) AND json_type(metadata_json) = 'object'),
  created_at TEXT NOT NULL
);

CREATE TABLE upload_asset_cleanup_objects__0107 (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  upload_asset_id TEXT NOT NULL REFERENCES upload_assets__0107(id) ON DELETE CASCADE,
  storage_bucket TEXT NOT NULL CHECK (length(trim(storage_bucket)) > 0),
  storage_path TEXT NOT NULL CHECK (length(trim(storage_path)) > 0),
  result TEXT NOT NULL DEFAULT 'pending' CHECK (result IN ('pending', 'removed', 'failed', 'retained')),
  cleanup_run_id TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  last_error_sha256 TEXT CHECK (last_error_sha256 IS NULL OR length(last_error_sha256) = 64),
  first_attempted_at TEXT,
  last_attempted_at TEXT,
  removed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (upload_asset_id, storage_bucket, storage_path)
);

CREATE TABLE component_variant_attachments__0107 (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  owner_scope TEXT NOT NULL CHECK (owner_scope IN ('library', 'project')),
  price_option_id TEXT NOT NULL CHECK (length(trim(price_option_id)) > 0),
  item_id TEXT,
  project_id TEXT,
  project_component_id TEXT,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  upload_asset_id TEXT NOT NULL UNIQUE REFERENCES upload_assets__0107(id) ON DELETE RESTRICT,
  storage_bucket TEXT NOT NULL DEFAULT 'component-attachments' CHECK (storage_bucket = 'component-attachments'),
  storage_path TEXT NOT NULL CHECK (length(trim(storage_path)) > 0 AND instr(storage_path, '..') = 0 AND instr(storage_path, '//') = 0),
  file_name TEXT NOT NULL CHECK (length(trim(file_name)) > 0),
  content_type TEXT NOT NULL CHECK (content_type IN ('application/pdf', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')),
  size_bytes INTEGER NOT NULL CHECK (size_bytes > 0),
  attachment_kind TEXT CHECK (attachment_kind IS NULL OR attachment_kind IN ('pdf', 'excel')),
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json) AND json_type(metadata_json) = 'object'),
  created_by TEXT,
  review_status TEXT NOT NULL DEFAULT 'uploaded' CHECK (review_status IN ('uploaded', 'approved', 'rejected', 'superseded')),
  applicable_cost_entry_id TEXT REFERENCES cost_library_item_variant_cost_entries(id) ON DELETE SET NULL,
  is_current_approved INTEGER NOT NULL DEFAULT 0 CHECK (is_current_approved IN (0, 1)),
  reviewed_by TEXT,
  reviewed_at TEXT,
  review_note TEXT,
  superseded_by TEXT REFERENCES component_variant_attachments__0107(id) ON DELETE SET NULL,
  review_revision INTEGER NOT NULL DEFAULT 1 CHECK (review_revision > 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (storage_bucket, storage_path),
  FOREIGN KEY (workspace_id, item_id, price_option_id)
    REFERENCES cost_library_item_price_options(workspace_id, item_id, id) ON DELETE CASCADE,
  FOREIGN KEY (project_id, workspace_id)
    REFERENCES projects(id, workspace_id) ON DELETE CASCADE,
  CHECK (
    (owner_scope = 'library' AND item_id IS NOT NULL AND project_id IS NULL AND project_component_id IS NULL)
    OR
    (owner_scope = 'project' AND item_id IS NULL AND project_id IS NOT NULL AND project_component_id IS NOT NULL)
  ),
  CHECK (owner_scope = 'library' OR applicable_cost_entry_id IS NULL),
  CHECK (is_current_approved = 0 OR review_status = 'approved'),
  CHECK (review_status NOT IN ('approved', 'rejected', 'superseded') OR (reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)),
  CHECK (superseded_by IS NULL OR review_status = 'superseded')
);

CREATE TABLE project_component_attachment_retention_holds__0107 (
  source_delete_event_id TEXT NOT NULL CHECK (length(trim(source_delete_event_id)) > 0),
  attachment_id TEXT NOT NULL REFERENCES component_variant_attachments__0107(id) ON DELETE CASCADE,
  upload_asset_id TEXT NOT NULL REFERENCES upload_assets__0107(id) ON DELETE RESTRICT,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL,
  project_component_id TEXT NOT NULL CHECK (length(trim(project_component_id)) > 0),
  restore_expires_at TEXT NOT NULL,
  released_at TEXT,
  release_reason TEXT CHECK (release_reason IS NULL OR release_reason IN ('restored', 'expired', 'live_instance')),
  created_at TEXT NOT NULL,
  PRIMARY KEY (source_delete_event_id, attachment_id),
  FOREIGN KEY (project_id, workspace_id) REFERENCES projects(id, workspace_id) ON DELETE CASCADE,
  CHECK ((released_at IS NULL AND release_reason IS NULL) OR (released_at IS NOT NULL AND release_reason IS NOT NULL))
);

INSERT INTO upload_sessions__0107 SELECT * FROM upload_sessions;
INSERT INTO upload_assets__0107 SELECT * FROM upload_assets;
INSERT INTO upload_events__0107 SELECT * FROM upload_events;
INSERT INTO upload_asset_cleanup_objects__0107 SELECT * FROM upload_asset_cleanup_objects;
INSERT INTO component_variant_attachments__0107 SELECT * FROM component_variant_attachments;
INSERT INTO project_component_attachment_retention_holds__0107 SELECT * FROM project_component_attachment_retention_holds;

INSERT INTO __0107_assertion (value)
SELECT 1
WHERE (SELECT count(*) FROM upload_sessions__0107) <> (SELECT count(*) FROM upload_sessions)
   OR (SELECT count(*) FROM upload_assets__0107) <> (SELECT count(*) FROM upload_assets)
   OR (SELECT count(*) FROM upload_events__0107) <> (SELECT count(*) FROM upload_events)
   OR (SELECT count(*) FROM upload_asset_cleanup_objects__0107) <> (SELECT count(*) FROM upload_asset_cleanup_objects)
   OR (SELECT count(*) FROM component_variant_attachments__0107) <> (SELECT count(*) FROM component_variant_attachments)
   OR (SELECT count(*) FROM project_component_attachment_retention_holds__0107) <> (SELECT count(*) FROM project_component_attachment_retention_holds);

DROP TABLE project_component_attachment_retention_holds;
DROP TABLE component_variant_attachments;
DROP TABLE upload_asset_cleanup_objects;
DROP TABLE upload_events;
DROP TABLE upload_assets;
DROP TABLE upload_sessions;

ALTER TABLE upload_sessions__0107 RENAME TO upload_sessions;
ALTER TABLE upload_assets__0107 RENAME TO upload_assets;
ALTER TABLE upload_events__0107 RENAME TO upload_events;
ALTER TABLE upload_asset_cleanup_objects__0107 RENAME TO upload_asset_cleanup_objects;
ALTER TABLE component_variant_attachments__0107 RENAME TO component_variant_attachments;
ALTER TABLE project_component_attachment_retention_holds__0107 RENAME TO project_component_attachment_retention_holds;

CREATE INDEX idx_upload_sessions_workspace_created ON upload_sessions(workspace_id, created_at DESC);
CREATE INDEX idx_upload_sessions_active_capacity ON upload_sessions(workspace_id, surface, actor_user_id, expires_at) WHERE status = 'reserved';

CREATE UNIQUE INDEX idx_upload_assets_upload_session_unique ON upload_assets(upload_session_id) WHERE upload_session_id IS NOT NULL;
CREATE INDEX idx_upload_assets_cleanup_queue ON upload_assets(purge_state, cleanup_not_before, updated_at, id)
  WHERE status IN ('removed', 'deleted', 'failed') AND purge_state <> 'purged';
CREATE INDEX idx_upload_assets_project_created ON upload_assets(project_id, created_at DESC) WHERE project_id IS NOT NULL;
CREATE INDEX idx_upload_assets_scan_override_queue ON upload_assets(surface, status, scan_status, created_at DESC)
  WHERE surface = 'component-attachment' AND status = 'finalized' AND scan_status IN ('failed_permanent', 'unsupported');
CREATE INDEX idx_upload_assets_project_document_scan_queue ON upload_assets(surface, status, scan_status, created_at DESC)
  WHERE surface IN ('project-artifact', 'portal-request-evidence') AND status = 'finalized' AND scan_status IN ('pending', 'failed_transient', 'failed_permanent', 'unsupported');
CREATE INDEX idx_upload_assets_workspace_created ON upload_assets(workspace_id, created_at DESC);

CREATE INDEX idx_upload_events_asset_created ON upload_events(upload_asset_id, created_at DESC);
CREATE UNIQUE INDEX idx_upload_events_initial_asset_unique ON upload_events(upload_asset_id, event_type)
  WHERE upload_asset_id IS NOT NULL AND event_type IN ('asset_finalized', 'scan_pending');
CREATE INDEX idx_upload_events_workspace_created ON upload_events(workspace_id, created_at DESC);
CREATE INDEX idx_upload_asset_cleanup_objects_result ON upload_asset_cleanup_objects(result, updated_at, upload_asset_id);

CREATE INDEX idx_component_variant_attachments_library_option_created
  ON component_variant_attachments(workspace_id, item_id, price_option_id, created_at DESC)
  WHERE owner_scope = 'library';
CREATE INDEX idx_component_variant_attachments_project_option_created
  ON component_variant_attachments(workspace_id, project_id, project_component_id, price_option_id, created_at DESC)
  WHERE owner_scope = 'project';
CREATE INDEX idx_component_variant_attachments_workspace_path
  ON component_variant_attachments(workspace_id, storage_path);
CREATE INDEX idx_component_variant_attachments_workspace_review
  ON component_variant_attachments(workspace_id, owner_scope, review_status, is_current_approved);

CREATE INDEX idx_project_component_attachment_retention_component
  ON project_component_attachment_retention_holds(project_id, project_component_id, released_at);
CREATE INDEX idx_project_component_attachment_retention_expiry
  ON project_component_attachment_retention_holds(restore_expires_at, attachment_id)
  WHERE released_at IS NULL;

CREATE TRIGGER upload_assets_session_integrity_insert
BEFORE INSERT ON upload_assets
BEGIN
  SELECT CASE
    WHEN NEW.upload_session_id IS NULL THEN RAISE(ABORT, 'upload asset requires a session')
    WHEN NOT EXISTS (
      SELECT 1 FROM upload_sessions AS session
      WHERE session.id = NEW.upload_session_id
        AND session.actor_user_id IS NEW.actor_user_id
        AND session.workspace_id IS NEW.workspace_id
        AND session.surface IS NEW.surface
        AND session.storage_bucket IS NEW.storage_bucket
        AND session.storage_path IS NEW.storage_path
    ) THEN RAISE(ABORT, 'upload asset session metadata mismatch')
  END;
END;

CREATE TRIGGER upload_assets_session_integrity_update
BEFORE UPDATE OF upload_session_id, actor_user_id, workspace_id, surface, storage_bucket, storage_path ON upload_assets
BEGIN
  SELECT CASE
    WHEN NEW.upload_session_id IS NULL THEN RAISE(ABORT, 'upload asset requires a session')
    WHEN NOT EXISTS (
      SELECT 1 FROM upload_sessions AS session
      WHERE session.id = NEW.upload_session_id
        AND session.actor_user_id IS NEW.actor_user_id
        AND session.workspace_id IS NEW.workspace_id
        AND session.surface IS NEW.surface
        AND session.storage_bucket IS NEW.storage_bucket
        AND session.storage_path IS NEW.storage_path
    ) THEN RAISE(ABORT, 'upload asset session metadata mismatch')
  END;
END;

CREATE TRIGGER upload_sessions_asset_integrity_update
BEFORE UPDATE OF actor_user_id, workspace_id, surface, storage_bucket, storage_path ON upload_sessions
WHEN EXISTS (
  SELECT 1 FROM upload_assets AS asset
  WHERE asset.upload_session_id = OLD.id
    AND (
      asset.actor_user_id IS NOT NEW.actor_user_id
      OR asset.workspace_id IS NOT NEW.workspace_id
      OR asset.surface IS NOT NEW.surface
      OR asset.storage_bucket IS NOT NEW.storage_bucket
      OR asset.storage_path IS NOT NEW.storage_path
    )
)
BEGIN
  SELECT RAISE(ABORT, 'upload session asset metadata mismatch');
END;

CREATE TRIGGER upload_assets_active_storage_insert
BEFORE INSERT ON upload_assets
WHEN NEW.status IN ('reserved', 'pending', 'finalized')
BEGIN
  SELECT CASE WHEN NEW.workspace_id IS NULL OR NEW.storage_bucket IS NULL OR length(trim(NEW.storage_bucket)) = 0 OR NEW.storage_path IS NULL OR length(trim(NEW.storage_path)) = 0
    THEN RAISE(ABORT, 'active upload asset requires storage metadata') END;
END;

CREATE TRIGGER upload_assets_active_storage_update
BEFORE UPDATE OF status, workspace_id, storage_bucket, storage_path ON upload_assets
WHEN NEW.status IN ('reserved', 'pending', 'finalized')
BEGIN
  SELECT CASE WHEN NEW.workspace_id IS NULL OR NEW.storage_bucket IS NULL OR length(trim(NEW.storage_bucket)) = 0 OR NEW.storage_path IS NULL OR length(trim(NEW.storage_path)) = 0
    THEN RAISE(ABORT, 'active upload asset requires storage metadata') END;
END;

CREATE TRIGGER upload_assets_removed_cleanup_state_insert
AFTER INSERT ON upload_assets
WHEN NEW.status IN ('removed', 'deleted') AND NEW.purge_state = 'active'
BEGIN
  UPDATE upload_assets
  SET removal_claim_id = COALESCE(removal_claim_id, 'status-transition:' || NEW.id || ':' || NEW.updated_at),
      removal_claimed_at = COALESCE(removal_claimed_at, NEW.updated_at),
      cleanup_not_before = COALESCE(cleanup_not_before, strftime('%Y-%m-%dT%H:%M:%fZ', NEW.updated_at, '+5 minutes'), NEW.updated_at),
      purge_state = 'pending',
      purged_at = NULL
  WHERE id = NEW.id;
END;

CREATE TRIGGER upload_assets_removed_cleanup_state_update
AFTER UPDATE OF status ON upload_assets
WHEN NEW.status IN ('removed', 'deleted') AND NEW.purge_state = 'active'
BEGIN
  UPDATE upload_assets
  SET removal_claim_id = COALESCE(removal_claim_id, 'status-transition:' || NEW.id || ':' || NEW.updated_at),
      removal_claimed_at = COALESCE(removal_claimed_at, NEW.updated_at),
      cleanup_not_before = COALESCE(cleanup_not_before, strftime('%Y-%m-%dT%H:%M:%fZ', NEW.updated_at, '+5 minutes'), NEW.updated_at),
      purge_state = 'pending',
      purged_at = NULL
  WHERE id = NEW.id;
END;

CREATE TRIGGER upload_assets_prevent_resurrection
BEFORE UPDATE OF status ON upload_assets
WHEN (OLD.status IN ('removed', 'deleted') OR OLD.purge_state IN ('pending', 'purged'))
  AND NEW.status IN ('reserved', 'pending', 'finalized')
BEGIN
  SELECT RAISE(ABORT, 'removed upload asset cannot be reactivated');
END;

CREATE TABLE project_artifacts (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  workspace_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  artifact_code TEXT,
  title TEXT NOT NULL CHECK (length(trim(title)) > 0),
  artifact_type TEXT NOT NULL CHECK (artifact_type IN ('drawing', 'design_proposal', 'contract', 'quotation', 'site_instruction', 'change_order', 'correspondence', 'photo', 'evidence', 'specification', 'report', 'other')),
  discipline TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'initializing' CHECK (status IN ('initializing', 'active', 'archived', 'tombstoned')),
  current_version_id TEXT,
  created_by TEXT NOT NULL CHECK (length(trim(created_by)) > 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT,
  UNIQUE (id, workspace_id, project_id),
  FOREIGN KEY (project_id, workspace_id) REFERENCES projects(id, workspace_id) ON DELETE RESTRICT,
  FOREIGN KEY (current_version_id) REFERENCES project_artifact_versions(id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED,
  CHECK ((status = 'initializing' AND current_version_id IS NULL) OR (status <> 'initializing' AND current_version_id IS NOT NULL)),
  CHECK (artifact_code IS NULL OR length(trim(artifact_code)) > 0),
  CHECK (status <> 'archived' OR archived_at IS NOT NULL)
);

CREATE TABLE project_artifact_versions (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  workspace_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  artifact_id TEXT NOT NULL,
  version_number INTEGER NOT NULL CHECK (version_number > 0),
  revision_label TEXT,
  upload_asset_id TEXT NOT NULL UNIQUE REFERENCES upload_assets(id) ON DELETE RESTRICT,
  file_name TEXT NOT NULL CHECK (length(trim(file_name)) > 0),
  content_type TEXT NOT NULL CHECK (length(trim(content_type)) > 0),
  size_bytes INTEGER NOT NULL CHECK (size_bytes > 0),
  content_sha256 TEXT NOT NULL CHECK (length(content_sha256) = 64 AND lower(content_sha256) = content_sha256),
  source_kind TEXT NOT NULL CHECK (source_kind IN ('internal_upload', 'recipient_upload', 'email_export', 'message_snapshot', 'imported_reference')),
  source_platform TEXT,
  source_reference_url TEXT,
  original_authored_at TEXT,
  description TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json) AND json_type(metadata_json) = 'object'),
  created_by_actor_type TEXT NOT NULL CHECK (created_by_actor_type IN ('internal_user', 'recipient', 'system')),
  created_by_actor_id TEXT NOT NULL CHECK (length(trim(created_by_actor_id)) > 0),
  created_by_domain_role_snapshot TEXT,
  created_at TEXT NOT NULL,
  supersedes_version_id TEXT REFERENCES project_artifact_versions(id) ON DELETE RESTRICT,
  FOREIGN KEY (artifact_id, workspace_id, project_id) REFERENCES project_artifacts(id, workspace_id, project_id) ON DELETE RESTRICT,
  UNIQUE (artifact_id, version_number)
);

CREATE UNIQUE INDEX idx_project_artifacts_project_code
  ON project_artifacts(project_id, artifact_code)
  WHERE artifact_code IS NOT NULL;
CREATE INDEX idx_project_artifacts_project_status_updated
  ON project_artifacts(project_id, status, updated_at DESC, id DESC);
CREATE INDEX idx_project_artifacts_project_type_updated
  ON project_artifacts(project_id, artifact_type, updated_at DESC, id DESC);
CREATE INDEX idx_project_artifact_versions_artifact_number
  ON project_artifact_versions(artifact_id, version_number DESC);
CREATE INDEX idx_project_artifact_versions_project_created
  ON project_artifact_versions(project_id, created_at DESC, id DESC);
CREATE INDEX idx_project_artifact_versions_content_hash
  ON project_artifact_versions(content_sha256);
CREATE UNIQUE INDEX idx_project_artifact_versions_artifact_content_hash
  ON project_artifact_versions(artifact_id, content_sha256);

CREATE TRIGGER project_artifacts_current_version_insert
BEFORE INSERT ON project_artifacts
WHEN NEW.current_version_id IS NOT NULL
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM project_artifact_versions AS version
    WHERE version.id = NEW.current_version_id
      AND version.artifact_id = NEW.id
      AND version.workspace_id = NEW.workspace_id
      AND version.project_id = NEW.project_id
  ) THEN RAISE(ABORT, 'artifact current version ownership mismatch') END;
END;

CREATE TRIGGER project_artifacts_current_version_update
BEFORE UPDATE OF current_version_id, workspace_id, project_id ON project_artifacts
WHEN NEW.current_version_id IS NOT NULL
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM project_artifact_versions AS version
    WHERE version.id = NEW.current_version_id
      AND version.artifact_id = NEW.id
      AND version.workspace_id = NEW.workspace_id
      AND version.project_id = NEW.project_id
  ) THEN RAISE(ABORT, 'artifact current version ownership mismatch') END;
END;

CREATE TRIGGER project_artifact_versions_upload_owner_insert
BEFORE INSERT ON project_artifact_versions
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM upload_assets AS asset
    WHERE asset.id = NEW.upload_asset_id
      AND asset.workspace_id = NEW.workspace_id
      AND asset.project_id = NEW.project_id
      AND asset.surface IN ('project-artifact', 'portal-request-evidence')
      AND asset.status = 'finalized'
      AND asset.purge_state = 'active'
      AND asset.file_name = NEW.file_name
      AND asset.content_type = NEW.content_type
      AND asset.size_bytes = NEW.size_bytes
      AND asset.checksum_sha256 = NEW.content_sha256
      AND (
        asset.scan_status = 'clean'
        OR (
          asset.scan_status = 'override_approved'
          AND asset.scan_override_checksum_sha256 = NEW.content_sha256
          AND asset.scan_override_expires_at > NEW.created_at
        )
      )
      AND (
        (asset.surface = 'project-artifact' AND asset.content_type = 'application/pdf')
        OR (
          asset.surface = 'portal-request-evidence'
          AND asset.content_type IN ('application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/avif')
        )
      )
  ) THEN RAISE(ABORT, 'artifact upload asset is not publishable for project') END;
END;

CREATE TRIGGER project_artifact_versions_immutable_update
BEFORE UPDATE ON project_artifact_versions
BEGIN
  SELECT RAISE(ABORT, 'artifact versions are immutable');
END;

CREATE TRIGGER project_artifact_versions_immutable_delete
BEFORE DELETE ON project_artifact_versions
BEGIN
  SELECT RAISE(ABORT, 'artifact versions are immutable');
END;

INSERT INTO __0107_assertion (value)
SELECT 1
WHERE EXISTS (SELECT 1 FROM pragma_foreign_key_check);

DROP TRIGGER __0107_assertion_fail;
DROP TABLE __0107_assertion;
