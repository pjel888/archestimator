CREATE TABLE client_portal_request_exposures (
  request_id TEXT NOT NULL REFERENCES project_change_requests(id) ON DELETE RESTRICT,
  portal_id TEXT NOT NULL REFERENCES client_portals(id) ON DELETE RESTRICT,
  public_request_id TEXT NOT NULL CHECK (length(trim(public_request_id)) > 0),
  status TEXT NOT NULL DEFAULT 'visible' CHECK (status IN ('visible', 'withdrawn', 'redacted')),
  exposure_kind TEXT NOT NULL CHECK (exposure_kind IN ('automatic', 'manual', 'backfill')),
  policy_snapshot_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(policy_snapshot_json) AND json_type(policy_snapshot_json) = 'object'),
  exposed_by_actor_type TEXT NOT NULL CHECK (exposed_by_actor_type IN ('internal_user', 'recipient', 'system')),
  exposed_by_actor_id TEXT NOT NULL CHECK (length(trim(exposed_by_actor_id)) > 0),
  exposed_at TEXT NOT NULL,
  withdrawn_at TEXT,
  withdrawal_reason TEXT,
  PRIMARY KEY (request_id, portal_id),
  UNIQUE (portal_id, public_request_id),
  CHECK (
    (status = 'visible' AND withdrawn_at IS NULL AND withdrawal_reason IS NULL)
    OR (status IN ('withdrawn', 'redacted') AND withdrawn_at IS NOT NULL AND withdrawal_reason IS NOT NULL)
  )
);

CREATE INDEX idx_client_portal_request_exposures_portal_status
  ON client_portal_request_exposures(portal_id, status, exposed_at DESC, request_id DESC);

CREATE TRIGGER client_portal_request_exposures_scope_insert
BEFORE INSERT ON client_portal_request_exposures
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM project_change_requests AS request
    JOIN client_portals AS portal ON portal.id = NEW.portal_id
      AND portal.workspace_id = request.workspace_id
      AND portal.project_id = request.project_id
    WHERE request.id = NEW.request_id
  ) THEN RAISE(ABORT, 'change request exposure ownership mismatch') END;

  SELECT CASE WHEN NEW.exposure_kind = 'automatic' AND NOT EXISTS (
    SELECT 1 FROM project_change_requests AS request
    WHERE request.id = NEW.request_id AND request.origin_portal_id = NEW.portal_id
  ) THEN RAISE(ABORT, 'automatic change request exposure origin mismatch') END;
END;

CREATE TRIGGER client_portal_request_exposures_transition_update
BEFORE UPDATE ON client_portal_request_exposures
BEGIN
  SELECT CASE
    WHEN NEW.request_id <> OLD.request_id
      OR NEW.portal_id <> OLD.portal_id
      OR NEW.public_request_id <> OLD.public_request_id
      OR NEW.exposure_kind <> OLD.exposure_kind
      OR NEW.policy_snapshot_json <> OLD.policy_snapshot_json
      OR NEW.exposed_by_actor_type <> OLD.exposed_by_actor_type
      OR NEW.exposed_by_actor_id <> OLD.exposed_by_actor_id
      OR NEW.exposed_at <> OLD.exposed_at
    THEN RAISE(ABORT, 'change request exposure evidence is immutable')
    WHEN OLD.status <> 'visible' OR NEW.status NOT IN ('withdrawn', 'redacted')
    THEN RAISE(ABORT, 'invalid change request exposure transition')
  END;
END;

CREATE TRIGGER client_portal_request_exposures_prevent_delete
BEFORE DELETE ON client_portal_request_exposures
BEGIN
  SELECT RAISE(ABORT, 'change request exposures are retained');
END;
