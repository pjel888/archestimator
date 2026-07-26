CREATE TABLE project_change_request_counters (
  workspace_id TEXT NOT NULL,
  project_id TEXT PRIMARY KEY,
  next_request_number INTEGER NOT NULL DEFAULT 1 CHECK (next_request_number > 0),
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id, workspace_id) REFERENCES projects(id, workspace_id) ON DELETE RESTRICT
);

CREATE TABLE project_change_requests (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  workspace_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  origin_portal_id TEXT REFERENCES client_portals(id) ON DELETE RESTRICT,
  request_number INTEGER NOT NULL CHECK (request_number > 0),
  request_code TEXT NOT NULL CHECK (length(trim(request_code)) > 0),
  current_version_id TEXT,
  status TEXT NOT NULL DEFAULT 'initializing' CHECK (status IN ('initializing', 'submitted', 'acknowledged', 'under_assessment', 'proposal_issued', 'resolved', 'rejected', 'withdrawn')),
  requested_by_actor_type TEXT NOT NULL CHECK (requested_by_actor_type IN ('internal_user', 'recipient', 'system')),
  requested_by_actor_id TEXT NOT NULL CHECK (length(trim(requested_by_actor_id)) > 0),
  requested_by_name_snapshot TEXT,
  requested_by_email_snapshot TEXT,
  requested_by_domain_role_snapshot TEXT,
  requested_by_permission_role_snapshot TEXT,
  requested_by_organization_snapshot TEXT,
  requested_at TEXT NOT NULL,
  acknowledged_by_user_id TEXT,
  acknowledged_at TEXT,
  assessment_owner_user_id TEXT,
  resolved_by_issue_id TEXT REFERENCES client_portal_issues(id) ON DELETE RESTRICT,
  resolved_at TEXT,
  withdrawn_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (id, workspace_id, project_id),
  UNIQUE (project_id, request_number),
  UNIQUE (project_id, request_code),
  FOREIGN KEY (project_id, workspace_id) REFERENCES projects(id, workspace_id) ON DELETE RESTRICT,
  FOREIGN KEY (current_version_id) REFERENCES project_change_request_versions(id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED,
  CHECK ((status = 'initializing' AND current_version_id IS NULL) OR (status <> 'initializing' AND current_version_id IS NOT NULL)),
  CHECK (status <> 'resolved' OR (resolved_by_issue_id IS NOT NULL AND resolved_at IS NOT NULL)),
  CHECK (status <> 'withdrawn' OR withdrawn_at IS NOT NULL)
);

CREATE TABLE project_change_request_versions (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  request_id TEXT NOT NULL REFERENCES project_change_requests(id) ON DELETE RESTRICT,
  version_number INTEGER NOT NULL CHECK (version_number > 0),
  title TEXT NOT NULL CHECK (length(trim(title)) > 0),
  description TEXT NOT NULL CHECK (length(trim(description)) > 0),
  reason TEXT,
  requested_effective_date TEXT,
  content_hash TEXT NOT NULL CHECK (length(content_hash) = 64 AND lower(content_hash) = content_hash),
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json) AND json_type(metadata_json) = 'object'),
  created_by_actor_type TEXT NOT NULL CHECK (created_by_actor_type IN ('internal_user', 'recipient', 'system')),
  created_by_actor_id TEXT NOT NULL CHECK (length(trim(created_by_actor_id)) > 0),
  created_at TEXT NOT NULL,
  supersedes_version_id TEXT REFERENCES project_change_request_versions(id) ON DELETE RESTRICT,
  UNIQUE (request_id, version_number),
  UNIQUE (request_id, content_hash)
);

CREATE TABLE project_change_request_state_events (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  request_id TEXT NOT NULL REFERENCES project_change_requests(id) ON DELETE RESTRICT,
  from_status TEXT CHECK (from_status IS NULL OR from_status IN ('initializing', 'submitted', 'acknowledged', 'under_assessment', 'proposal_issued', 'resolved', 'rejected', 'withdrawn')),
  to_status TEXT NOT NULL CHECK (to_status IN ('submitted', 'acknowledged', 'under_assessment', 'proposal_issued', 'resolved', 'rejected', 'withdrawn')),
  actor_type TEXT NOT NULL CHECK (actor_type IN ('internal_user', 'recipient', 'system')),
  actor_id TEXT NOT NULL CHECK (length(trim(actor_id)) > 0),
  note TEXT,
  idempotency_key TEXT NOT NULL CHECK (length(trim(idempotency_key)) > 0),
  occurred_at TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json) AND json_type(metadata_json) = 'object'),
  UNIQUE (request_id, actor_type, actor_id, idempotency_key)
);

CREATE TABLE project_change_request_targets (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  request_version_id TEXT NOT NULL REFERENCES project_change_request_versions(id) ON DELETE RESTRICT,
  target_kind TEXT NOT NULL CHECK (target_kind IN ('project', 'estimate', 'estimate_tab', 'area_group', 'row', 'artifact', 'discipline', 'location', 'other')),
  estimate_id TEXT REFERENCES estimates(id) ON DELETE RESTRICT,
  estimate_tab_id TEXT REFERENCES estimate_tabs(id) ON DELETE RESTRICT,
  node_id TEXT REFERENCES estimate_nodes(id) ON DELETE RESTRICT,
  row_id TEXT REFERENCES estimate_row_items(id) ON DELETE RESTRICT,
  artifact_id TEXT REFERENCES project_artifacts(id) ON DELETE RESTRICT,
  discipline_key TEXT,
  location_key TEXT,
  other_key TEXT,
  target_label_snapshot TEXT NOT NULL CHECK (length(trim(target_label_snapshot)) > 0),
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json) AND json_type(metadata_json) = 'object'),
  CHECK (
    (target_kind = 'project' AND estimate_id IS NULL AND estimate_tab_id IS NULL AND node_id IS NULL AND row_id IS NULL AND artifact_id IS NULL AND discipline_key IS NULL AND location_key IS NULL AND other_key IS NULL)
    OR (target_kind = 'estimate' AND estimate_id IS NOT NULL AND estimate_tab_id IS NULL AND node_id IS NULL AND row_id IS NULL AND artifact_id IS NULL AND discipline_key IS NULL AND location_key IS NULL AND other_key IS NULL)
    OR (target_kind = 'estimate_tab' AND estimate_id IS NOT NULL AND estimate_tab_id IS NOT NULL AND node_id IS NULL AND row_id IS NULL AND artifact_id IS NULL AND discipline_key IS NULL AND location_key IS NULL AND other_key IS NULL)
    OR (target_kind = 'area_group' AND estimate_id IS NOT NULL AND estimate_tab_id IS NOT NULL AND node_id IS NOT NULL AND row_id IS NULL AND artifact_id IS NULL AND discipline_key IS NULL AND location_key IS NULL AND other_key IS NULL)
    OR (target_kind = 'row' AND estimate_id IS NOT NULL AND estimate_tab_id IS NOT NULL AND node_id IS NULL AND row_id IS NOT NULL AND artifact_id IS NULL AND discipline_key IS NULL AND location_key IS NULL AND other_key IS NULL)
    OR (target_kind = 'artifact' AND estimate_id IS NULL AND estimate_tab_id IS NULL AND node_id IS NULL AND row_id IS NULL AND artifact_id IS NOT NULL AND discipline_key IS NULL AND location_key IS NULL AND other_key IS NULL)
    OR (target_kind = 'discipline' AND estimate_id IS NULL AND estimate_tab_id IS NULL AND node_id IS NULL AND row_id IS NULL AND artifact_id IS NULL AND discipline_key IS NOT NULL AND location_key IS NULL AND other_key IS NULL)
    OR (target_kind = 'location' AND estimate_id IS NULL AND estimate_tab_id IS NULL AND node_id IS NULL AND row_id IS NULL AND artifact_id IS NULL AND discipline_key IS NULL AND location_key IS NOT NULL AND other_key IS NULL)
    OR (target_kind = 'other' AND estimate_id IS NULL AND estimate_tab_id IS NULL AND node_id IS NULL AND row_id IS NULL AND artifact_id IS NULL AND discipline_key IS NULL AND location_key IS NULL AND other_key IS NOT NULL)
  )
);

CREATE TABLE project_change_request_artifacts (
  request_version_id TEXT NOT NULL REFERENCES project_change_request_versions(id) ON DELETE RESTRICT,
  artifact_version_id TEXT NOT NULL REFERENCES project_artifact_versions(id) ON DELETE RESTRICT,
  relationship TEXT NOT NULL CHECK (relationship IN ('evidence', 'reference', 'markup', 'instruction', 'correspondence', 'supporting_document')),
  sort_order INTEGER NOT NULL CHECK (sort_order >= 0),
  created_at TEXT NOT NULL,
  PRIMARY KEY (request_version_id, artifact_version_id, relationship)
);

CREATE INDEX idx_project_change_requests_project_status_updated
  ON project_change_requests(project_id, status, updated_at DESC, id DESC);
CREATE INDEX idx_project_change_requests_origin_portal_status
  ON project_change_requests(origin_portal_id, status, updated_at DESC, id DESC)
  WHERE origin_portal_id IS NOT NULL;
CREATE INDEX idx_project_change_requests_assessment_owner
  ON project_change_requests(assessment_owner_user_id, status, updated_at DESC, id DESC)
  WHERE assessment_owner_user_id IS NOT NULL;
CREATE INDEX idx_project_change_request_versions_request_number
  ON project_change_request_versions(request_id, version_number DESC);
CREATE INDEX idx_project_change_request_state_events_request_occurred
  ON project_change_request_state_events(request_id, occurred_at, id);
CREATE INDEX idx_project_change_request_targets_version_kind
  ON project_change_request_targets(request_version_id, target_kind, id);
CREATE INDEX idx_project_change_request_artifacts_artifact
  ON project_change_request_artifacts(artifact_version_id, request_version_id);

CREATE UNIQUE INDEX idx_project_change_request_targets_project
  ON project_change_request_targets(request_version_id)
  WHERE target_kind = 'project';
CREATE UNIQUE INDEX idx_project_change_request_targets_estimate
  ON project_change_request_targets(request_version_id, estimate_id)
  WHERE target_kind = 'estimate';
CREATE UNIQUE INDEX idx_project_change_request_targets_estimate_tab
  ON project_change_request_targets(request_version_id, estimate_id, estimate_tab_id)
  WHERE target_kind = 'estimate_tab';
CREATE UNIQUE INDEX idx_project_change_request_targets_area_group
  ON project_change_request_targets(request_version_id, estimate_id, estimate_tab_id, node_id)
  WHERE target_kind = 'area_group';
CREATE UNIQUE INDEX idx_project_change_request_targets_row
  ON project_change_request_targets(request_version_id, estimate_id, estimate_tab_id, row_id)
  WHERE target_kind = 'row';
CREATE UNIQUE INDEX idx_project_change_request_targets_artifact
  ON project_change_request_targets(request_version_id, artifact_id)
  WHERE target_kind = 'artifact';
CREATE UNIQUE INDEX idx_project_change_request_targets_discipline
  ON project_change_request_targets(request_version_id, discipline_key)
  WHERE target_kind = 'discipline';
CREATE UNIQUE INDEX idx_project_change_request_targets_location
  ON project_change_request_targets(request_version_id, location_key)
  WHERE target_kind = 'location';
CREATE UNIQUE INDEX idx_project_change_request_targets_other
  ON project_change_request_targets(request_version_id, other_key)
  WHERE target_kind = 'other';

CREATE TRIGGER project_change_requests_current_version_insert
BEFORE INSERT ON project_change_requests
WHEN NEW.current_version_id IS NOT NULL
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM project_change_request_versions AS version
    WHERE version.id = NEW.current_version_id AND version.request_id = NEW.id
  ) THEN RAISE(ABORT, 'request current version ownership mismatch') END;
END;

CREATE TRIGGER project_change_requests_current_version_update
BEFORE UPDATE OF current_version_id ON project_change_requests
WHEN NEW.current_version_id IS NOT NULL
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM project_change_request_versions AS version
    WHERE version.id = NEW.current_version_id AND version.request_id = NEW.id
  ) THEN RAISE(ABORT, 'request current version ownership mismatch') END;
END;

CREATE TRIGGER project_change_requests_status_transition
BEFORE UPDATE OF status ON project_change_requests
WHEN NEW.status IS NOT OLD.status
BEGIN
  SELECT CASE WHEN NOT (
    (OLD.status = 'initializing' AND NEW.status = 'submitted')
    OR (OLD.status = 'submitted' AND NEW.status IN ('acknowledged', 'under_assessment', 'rejected', 'withdrawn'))
    OR (OLD.status = 'acknowledged' AND NEW.status IN ('under_assessment', 'rejected', 'withdrawn'))
    OR (OLD.status = 'under_assessment' AND NEW.status IN ('proposal_issued', 'rejected', 'withdrawn'))
    OR (OLD.status = 'proposal_issued' AND NEW.status IN ('under_assessment', 'resolved', 'withdrawn'))
  ) THEN RAISE(ABORT, 'invalid change request status transition') END;
END;

CREATE TRIGGER project_change_request_versions_immutable_update
BEFORE UPDATE ON project_change_request_versions
BEGIN
  SELECT RAISE(ABORT, 'change request versions are immutable');
END;

CREATE TRIGGER project_change_request_versions_immutable_delete
BEFORE DELETE ON project_change_request_versions
BEGIN
  SELECT RAISE(ABORT, 'change request versions are immutable');
END;

CREATE TRIGGER project_change_request_state_events_immutable_update
BEFORE UPDATE ON project_change_request_state_events
BEGIN
  SELECT RAISE(ABORT, 'change request state events are immutable');
END;

CREATE TRIGGER project_change_request_state_events_immutable_delete
BEFORE DELETE ON project_change_request_state_events
BEGIN
  SELECT RAISE(ABORT, 'change request state events are immutable');
END;

CREATE TRIGGER project_change_request_targets_scope_insert
BEFORE INSERT ON project_change_request_targets
BEGIN
  SELECT CASE
    WHEN NEW.target_kind = 'estimate' AND NOT EXISTS (
      SELECT 1 FROM project_change_request_versions AS version
      JOIN project_change_requests AS request ON request.id = version.request_id
      JOIN estimates AS estimate ON estimate.id = NEW.estimate_id AND estimate.project_id = request.project_id
      WHERE version.id = NEW.request_version_id
    ) THEN RAISE(ABORT, 'request estimate target ownership mismatch')
    WHEN NEW.target_kind = 'estimate_tab' AND NOT EXISTS (
      SELECT 1 FROM project_change_request_versions AS version
      JOIN project_change_requests AS request ON request.id = version.request_id
      JOIN estimate_tabs AS tab ON tab.id = NEW.estimate_tab_id AND tab.estimate_id = NEW.estimate_id
      JOIN estimates AS estimate ON estimate.id = tab.estimate_id AND estimate.project_id = request.project_id
      WHERE version.id = NEW.request_version_id
    ) THEN RAISE(ABORT, 'request estimate tab target ownership mismatch')
    WHEN NEW.target_kind = 'area_group' AND NOT EXISTS (
      SELECT 1 FROM project_change_request_versions AS version
      JOIN project_change_requests AS request ON request.id = version.request_id
      JOIN estimate_nodes AS node ON node.id = NEW.node_id AND node.estimate_id = NEW.estimate_id AND node.estimate_tab_id = NEW.estimate_tab_id
      JOIN estimates AS estimate ON estimate.id = node.estimate_id AND estimate.project_id = request.project_id
      WHERE version.id = NEW.request_version_id
    ) THEN RAISE(ABORT, 'request area target ownership mismatch')
    WHEN NEW.target_kind = 'row' AND NOT EXISTS (
      SELECT 1 FROM project_change_request_versions AS version
      JOIN project_change_requests AS request ON request.id = version.request_id
      JOIN estimate_row_items AS row_item ON row_item.id = NEW.row_id AND row_item.estimate_id = NEW.estimate_id
      JOIN estimates AS estimate ON estimate.id = row_item.estimate_id AND estimate.project_id = request.project_id
      JOIN estimate_tabs AS tab ON tab.id = NEW.estimate_tab_id AND tab.estimate_id = estimate.id
      WHERE version.id = NEW.request_version_id
    ) THEN RAISE(ABORT, 'request row target ownership mismatch')
    WHEN NEW.target_kind = 'artifact' AND NOT EXISTS (
      SELECT 1 FROM project_change_request_versions AS version
      JOIN project_change_requests AS request ON request.id = version.request_id
      JOIN project_artifacts AS artifact ON artifact.id = NEW.artifact_id AND artifact.project_id = request.project_id AND artifact.workspace_id = request.workspace_id
      WHERE version.id = NEW.request_version_id
    ) THEN RAISE(ABORT, 'request artifact target ownership mismatch')
  END;
END;

CREATE TRIGGER project_change_request_artifacts_scope_insert
BEFORE INSERT ON project_change_request_artifacts
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM project_change_request_versions AS request_version
    JOIN project_change_requests AS request ON request.id = request_version.request_id
    JOIN project_artifact_versions AS artifact_version ON artifact_version.id = NEW.artifact_version_id
      AND artifact_version.workspace_id = request.workspace_id
      AND artifact_version.project_id = request.project_id
    WHERE request_version.id = NEW.request_version_id
  ) THEN RAISE(ABORT, 'request artifact version ownership mismatch') END;
END;
