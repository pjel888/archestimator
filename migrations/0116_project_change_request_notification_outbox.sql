CREATE TABLE project_change_request_notification_outbox (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  workspace_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  portal_id TEXT REFERENCES client_portals(id) ON DELETE RESTRICT,
  request_id TEXT NOT NULL REFERENCES project_change_requests(id) ON DELETE RESTRICT,
  event_type TEXT NOT NULL CHECK (length(trim(event_type)) > 0),
  idempotency_key TEXT NOT NULL CHECK (length(trim(idempotency_key)) > 0),
  payload_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(payload_json) AND json_type(payload_json) = 'object'),
  state TEXT NOT NULL DEFAULT 'pending' CHECK (state IN ('pending', 'sending', 'sent', 'dead')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  next_attempt_at TEXT NOT NULL,
  last_error TEXT,
  sent_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id, workspace_id) REFERENCES projects(id, workspace_id) ON DELETE RESTRICT,
  UNIQUE (request_id, idempotency_key)
);

CREATE INDEX idx_project_change_request_notification_outbox_pending
  ON project_change_request_notification_outbox(state, next_attempt_at, created_at);

CREATE TRIGGER project_change_request_notification_outbox_scope_insert
BEFORE INSERT ON project_change_request_notification_outbox
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1
    FROM project_change_requests AS request
    WHERE request.id = NEW.request_id
      AND request.workspace_id = NEW.workspace_id
      AND request.project_id = NEW.project_id
  ) THEN RAISE(ABORT, 'change request notification ownership mismatch') END;

  SELECT CASE WHEN NEW.portal_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM client_portals AS portal
    WHERE portal.id = NEW.portal_id
      AND portal.workspace_id = NEW.workspace_id
      AND portal.project_id = NEW.project_id
  ) THEN RAISE(ABORT, 'change request notification portal ownership mismatch') END;
END;

CREATE TRIGGER project_change_request_notification_outbox_scope_update
BEFORE UPDATE OF workspace_id, project_id, portal_id, request_id, event_type, idempotency_key, payload_json, created_at
ON project_change_request_notification_outbox
BEGIN
  SELECT RAISE(ABORT, 'change request notification scope is immutable');
END;

CREATE TRIGGER project_change_request_notification_outbox_prevent_delete
BEFORE DELETE ON project_change_request_notification_outbox
BEGIN
  SELECT RAISE(ABORT, 'change request notifications are retained');
END;
