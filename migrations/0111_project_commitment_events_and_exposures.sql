CREATE TABLE project_commitment_events (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  workspace_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  origin_portal_id TEXT REFERENCES client_portals(id) ON DELETE RESTRICT,
  event_type TEXT NOT NULL CHECK (length(trim(event_type)) > 0),
  source_type TEXT NOT NULL CHECK (source_type IN ('issue', 'decision', 'baseline', 'change_request', 'artifact', 'legacy_publication')),
  source_id TEXT NOT NULL CHECK (length(trim(source_id)) > 0),
  source_version_id TEXT,
  issue_id TEXT REFERENCES client_portal_issues(id) ON DELETE RESTRICT,
  decision_id TEXT REFERENCES client_portal_decisions(id) ON DELETE RESTRICT,
  baseline_id TEXT REFERENCES client_portal_baselines(id) ON DELETE RESTRICT,
  request_id TEXT REFERENCES project_change_requests(id) ON DELETE RESTRICT,
  request_version_id TEXT REFERENCES project_change_request_versions(id) ON DELETE RESTRICT,
  artifact_id TEXT REFERENCES project_artifacts(id) ON DELETE RESTRICT,
  artifact_version_id TEXT REFERENCES project_artifact_versions(id) ON DELETE RESTRICT,
  legacy_publication_id TEXT REFERENCES project_publications(id) ON DELETE RESTRICT,
  root_request_id TEXT REFERENCES project_change_requests(id) ON DELETE RESTRICT,
  correlation_id TEXT NOT NULL CHECK (length(trim(correlation_id)) > 0),
  causation_event_id TEXT REFERENCES project_commitment_events(id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('internal_user', 'recipient', 'system')),
  actor_id TEXT NOT NULL CHECK (length(trim(actor_id)) > 0),
  actor_name_snapshot TEXT,
  actor_domain_role_snapshot TEXT,
  actor_permission_role_snapshot TEXT,
  title TEXT NOT NULL CHECK (length(trim(title)) > 0),
  summary TEXT,
  client_safe_snapshot_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(client_safe_snapshot_json) AND json_type(client_safe_snapshot_json) = 'object'),
  internal_metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(internal_metadata_json) AND json_type(internal_metadata_json) = 'object'),
  occurred_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (project_id, workspace_id) REFERENCES projects(id, workspace_id) ON DELETE RESTRICT,
  UNIQUE (source_type, source_id, event_type, correlation_id),
  CHECK (
    (source_type = 'issue'
      AND source_id = issue_id AND source_version_id IS NULL
      AND issue_id IS NOT NULL AND decision_id IS NULL AND baseline_id IS NULL
      AND request_id IS NULL AND request_version_id IS NULL AND artifact_id IS NULL AND artifact_version_id IS NULL AND legacy_publication_id IS NULL)
    OR (source_type = 'decision'
      AND source_id = decision_id AND source_version_id IS NULL
      AND issue_id IS NULL AND decision_id IS NOT NULL AND baseline_id IS NULL
      AND request_id IS NULL AND request_version_id IS NULL AND artifact_id IS NULL AND artifact_version_id IS NULL AND legacy_publication_id IS NULL)
    OR (source_type = 'baseline'
      AND source_id = baseline_id AND source_version_id IS NULL
      AND issue_id IS NULL AND decision_id IS NULL AND baseline_id IS NOT NULL
      AND request_id IS NULL AND request_version_id IS NULL AND artifact_id IS NULL AND artifact_version_id IS NULL AND legacy_publication_id IS NULL)
    OR (source_type = 'change_request'
      AND source_id = request_id AND source_version_id = request_version_id
      AND issue_id IS NULL AND decision_id IS NULL AND baseline_id IS NULL
      AND request_id IS NOT NULL AND request_version_id IS NOT NULL AND artifact_id IS NULL AND artifact_version_id IS NULL AND legacy_publication_id IS NULL)
    OR (source_type = 'artifact'
      AND source_id = artifact_id AND source_version_id = artifact_version_id
      AND issue_id IS NULL AND decision_id IS NULL AND baseline_id IS NULL
      AND request_id IS NULL AND request_version_id IS NULL AND artifact_id IS NOT NULL AND artifact_version_id IS NOT NULL AND legacy_publication_id IS NULL)
    OR (source_type = 'legacy_publication'
      AND source_id = legacy_publication_id AND source_version_id IS NULL
      AND issue_id IS NULL AND decision_id IS NULL AND baseline_id IS NULL
      AND request_id IS NULL AND request_version_id IS NULL AND artifact_id IS NULL AND artifact_version_id IS NULL AND legacy_publication_id IS NOT NULL)
  )
);

CREATE INDEX idx_project_commitment_events_project_occurred
  ON project_commitment_events(project_id, occurred_at DESC, id DESC);
CREATE INDEX idx_project_commitment_events_root_request
  ON project_commitment_events(project_id, root_request_id, occurred_at, id);
CREATE INDEX idx_project_commitment_events_origin_portal
  ON project_commitment_events(origin_portal_id, occurred_at DESC, id DESC);
CREATE INDEX idx_project_commitment_events_source
  ON project_commitment_events(source_type, source_id, occurred_at, id);

CREATE TRIGGER project_commitment_events_scope_insert
BEFORE INSERT ON project_commitment_events
BEGIN
  SELECT CASE WHEN NEW.origin_portal_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM client_portals AS portal
    WHERE portal.id = NEW.origin_portal_id AND portal.workspace_id = NEW.workspace_id AND portal.project_id = NEW.project_id
  ) THEN RAISE(ABORT, 'commitment event portal ownership mismatch') END;

  SELECT CASE
    WHEN NEW.source_type = 'issue' AND NOT EXISTS (
      SELECT 1 FROM client_portal_issues AS issue JOIN client_portals AS portal ON portal.id = issue.portal_id
      WHERE issue.id = NEW.issue_id AND portal.workspace_id = NEW.workspace_id AND portal.project_id = NEW.project_id
    ) THEN RAISE(ABORT, 'commitment event issue ownership mismatch')
    WHEN NEW.source_type = 'decision' AND NOT EXISTS (
      SELECT 1 FROM client_portal_decisions AS decision JOIN client_portals AS portal ON portal.id = decision.portal_id
      WHERE decision.id = NEW.decision_id AND portal.workspace_id = NEW.workspace_id AND portal.project_id = NEW.project_id
    ) THEN RAISE(ABORT, 'commitment event decision ownership mismatch')
    WHEN NEW.source_type = 'baseline' AND NOT EXISTS (
      SELECT 1 FROM client_portal_baselines AS baseline
      WHERE baseline.id = NEW.baseline_id AND baseline.workspace_id = NEW.workspace_id AND baseline.project_id = NEW.project_id
    ) THEN RAISE(ABORT, 'commitment event baseline ownership mismatch')
    WHEN NEW.source_type = 'change_request' AND NOT EXISTS (
      SELECT 1 FROM project_change_requests AS request
      JOIN project_change_request_versions AS version ON version.id = NEW.request_version_id AND version.request_id = request.id
      WHERE request.id = NEW.request_id AND request.workspace_id = NEW.workspace_id AND request.project_id = NEW.project_id
    ) THEN RAISE(ABORT, 'commitment event request ownership mismatch')
    WHEN NEW.source_type = 'artifact' AND NOT EXISTS (
      SELECT 1 FROM project_artifacts AS artifact
      JOIN project_artifact_versions AS version ON version.id = NEW.artifact_version_id AND version.artifact_id = artifact.id
      WHERE artifact.id = NEW.artifact_id AND artifact.workspace_id = NEW.workspace_id AND artifact.project_id = NEW.project_id
    ) THEN RAISE(ABORT, 'commitment event artifact ownership mismatch')
    WHEN NEW.source_type = 'legacy_publication' AND NOT EXISTS (
      SELECT 1 FROM project_publications AS publication
      WHERE publication.id = NEW.legacy_publication_id AND publication.workspace_id = NEW.workspace_id AND publication.project_id = NEW.project_id
    ) THEN RAISE(ABORT, 'commitment event legacy publication ownership mismatch')
  END;

  SELECT CASE WHEN NEW.root_request_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM project_change_requests AS request
    WHERE request.id = NEW.root_request_id AND request.workspace_id = NEW.workspace_id AND request.project_id = NEW.project_id
  ) THEN RAISE(ABORT, 'commitment event root request ownership mismatch') END;
END;

CREATE TRIGGER project_commitment_events_prevent_update
BEFORE UPDATE ON project_commitment_events
BEGIN
  SELECT RAISE(ABORT, 'commitment events are append-only');
END;

CREATE TRIGGER project_commitment_events_prevent_delete
BEFORE DELETE ON project_commitment_events
BEGIN
  SELECT RAISE(ABORT, 'commitment events are append-only');
END;

CREATE TABLE client_portal_event_exposures (
  event_id TEXT NOT NULL REFERENCES project_commitment_events(id) ON DELETE RESTRICT,
  portal_id TEXT NOT NULL REFERENCES client_portals(id) ON DELETE RESTRICT,
  public_event_id TEXT NOT NULL CHECK (length(trim(public_event_id)) > 0),
  status TEXT NOT NULL DEFAULT 'visible' CHECK (status IN ('visible', 'withdrawn', 'redacted')),
  exposure_kind TEXT NOT NULL CHECK (exposure_kind IN ('automatic', 'manual', 'backfill')),
  policy_snapshot_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(policy_snapshot_json) AND json_type(policy_snapshot_json) = 'object'),
  exposed_by_actor_type TEXT NOT NULL CHECK (exposed_by_actor_type IN ('internal_user', 'recipient', 'system')),
  exposed_by_actor_id TEXT NOT NULL CHECK (length(trim(exposed_by_actor_id)) > 0),
  exposed_at TEXT NOT NULL,
  withdrawn_at TEXT,
  withdrawal_reason TEXT,
  PRIMARY KEY (event_id, portal_id),
  UNIQUE (portal_id, public_event_id),
  CHECK (
    (status = 'visible' AND withdrawn_at IS NULL AND withdrawal_reason IS NULL)
    OR (status IN ('withdrawn', 'redacted') AND withdrawn_at IS NOT NULL AND withdrawal_reason IS NOT NULL)
  )
);

CREATE INDEX idx_client_portal_event_exposures_portal_status
  ON client_portal_event_exposures(portal_id, status, exposed_at DESC, event_id DESC);

CREATE TRIGGER client_portal_event_exposures_scope_insert
BEFORE INSERT ON client_portal_event_exposures
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM project_commitment_events AS event
    JOIN client_portals AS portal ON portal.id = NEW.portal_id
      AND portal.workspace_id = event.workspace_id
      AND portal.project_id = event.project_id
    WHERE event.id = NEW.event_id
      AND json_type(event.client_safe_snapshot_json) = 'object'
  ) THEN RAISE(ABORT, 'commitment event exposure ownership mismatch') END;
END;

CREATE TRIGGER client_portal_event_exposures_transition_update
BEFORE UPDATE ON client_portal_event_exposures
BEGIN
  SELECT CASE
    WHEN NEW.event_id <> OLD.event_id OR NEW.portal_id <> OLD.portal_id OR NEW.public_event_id <> OLD.public_event_id
      OR NEW.exposure_kind <> OLD.exposure_kind OR NEW.policy_snapshot_json <> OLD.policy_snapshot_json
      OR NEW.exposed_by_actor_type <> OLD.exposed_by_actor_type OR NEW.exposed_by_actor_id <> OLD.exposed_by_actor_id
      OR NEW.exposed_at <> OLD.exposed_at
    THEN RAISE(ABORT, 'event exposure evidence is immutable')
    WHEN OLD.status <> 'visible' OR NEW.status NOT IN ('withdrawn', 'redacted')
    THEN RAISE(ABORT, 'invalid event exposure transition')
  END;
END;

CREATE TRIGGER client_portal_event_exposures_prevent_delete
BEFORE DELETE ON client_portal_event_exposures
BEGIN
  SELECT RAISE(ABORT, 'event exposures are retained');
END;

CREATE TABLE project_commitment_backfill_markers (
  source_type TEXT NOT NULL CHECK (source_type IN ('issue', 'decision', 'baseline', 'change_request', 'artifact', 'legacy_publication')),
  source_id TEXT NOT NULL CHECK (length(trim(source_id)) > 0),
  status TEXT NOT NULL CHECK (status IN ('pending', 'backfilled', 'limited', 'failed')),
  capability TEXT NOT NULL CHECK (capability IN ('full', 'aggregate_only', 'unavailable')),
  reason TEXT,
  event_id TEXT REFERENCES project_commitment_events(id) ON DELETE RESTRICT,
  details_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(details_json) AND json_type(details_json) = 'object'),
  updated_at TEXT NOT NULL,
  PRIMARY KEY (source_type, source_id)
);
