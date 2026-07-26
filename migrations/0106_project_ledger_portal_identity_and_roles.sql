PRAGMA defer_foreign_keys = ON;

CREATE TABLE __0106_assertion (
  value INTEGER NOT NULL
);

CREATE TRIGGER __0106_assertion_fail
BEFORE INSERT ON __0106_assertion
WHEN NEW.value <> 0
BEGIN
  SELECT RAISE(ROLLBACK, 'project_ledger_portal_identity_preflight_failed');
END;

ALTER TABLE client_portals ADD COLUMN audience_kind TEXT NOT NULL DEFAULT 'client'
  CHECK (audience_kind IN ('client', 'owner', 'consultant', 'contractor', 'subcontractor', 'supplier', 'procurement', 'custom'));
ALTER TABLE client_portals ADD COLUMN is_primary INTEGER NOT NULL DEFAULT 0
  CHECK (is_primary IN (0, 1));

CREATE UNIQUE INDEX idx_client_portals_identity_scope
  ON client_portals(id, workspace_id, project_id);

CREATE UNIQUE INDEX idx_client_portals_project_primary
  ON client_portals(project_id)
  WHERE is_primary = 1 AND status <> 'archived';

UPDATE client_portals
SET is_primary = 1
WHERE id IN (
  SELECT candidate.id
  FROM client_portals AS candidate
  WHERE candidate.status <> 'archived'
    AND candidate.id = (
      SELECT selected.id
      FROM client_portals AS selected
      WHERE selected.project_id = candidate.project_id
        AND selected.status <> 'archived'
      ORDER BY
        CASE selected.status
          WHEN 'live' THEN 0
          WHEN 'ready' THEN 1
          WHEN 'draft' THEN 2
          WHEN 'access_off' THEN 3
          ELSE 4
        END,
        selected.created_at,
        selected.id
      LIMIT 1
    )
);

ALTER TABLE project_members ADD COLUMN domain_role TEXT CHECK (
  domain_role IS NULL OR domain_role IN (
    'client', 'owner_representative', 'contractor', 'architect', 'engineer',
    'quantity_surveyor', 'project_manager', 'supplier', 'subcontractor',
    'consultant', 'procurement', 'other'
  )
);
ALTER TABLE project_members ADD COLUMN domain_role_label TEXT;

CREATE TABLE client_portal_recipients__0106 (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  portal_id TEXT NOT NULL CHECK (length(trim(portal_id)) > 0),
  email_normalized TEXT NOT NULL CHECK (email_normalized = lower(trim(email_normalized)) AND length(trim(email_normalized)) > 3),
  display_name TEXT,
  client_organization TEXT,
  role_template TEXT NOT NULL CHECK (role_template IN ('viewer', 'commenter', 'reviewer', 'approver', 'requester')),
  domain_role TEXT CHECK (
    domain_role IS NULL OR domain_role IN (
      'client', 'owner_representative', 'contractor', 'architect', 'engineer',
      'quantity_surveyor', 'project_manager', 'supplier', 'subcontractor',
      'consultant', 'procurement', 'other'
    )
  ),
  domain_role_label TEXT,
  status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'active', 'revoked', 'expired')),
  is_required_approver INTEGER NOT NULL DEFAULT 0 CHECK (is_required_approver IN (0, 1)),
  verification_state TEXT NOT NULL DEFAULT 'unverified' CHECK (verification_state IN ('unverified', 'verified', 'failed')),
  recipient_credential_version INTEGER NOT NULL DEFAULT 1 CHECK (recipient_credential_version > 0),
  last_verified_at TEXT,
  last_seen_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  revoked_at TEXT,
  FOREIGN KEY (portal_id) REFERENCES client_portals(id) ON DELETE RESTRICT,
  UNIQUE (portal_id, email_normalized),
  CHECK (status != 'revoked' OR revoked_at IS NOT NULL)
);

CREATE TABLE client_portal_recipient_credentials__0106 (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  recipient_id TEXT NOT NULL CHECK (length(trim(recipient_id)) > 0),
  token_hash TEXT NOT NULL UNIQUE CHECK (length(trim(token_hash)) > 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'used', 'expired')),
  expires_at TEXT,
  created_at TEXT NOT NULL,
  revoked_at TEXT,
  FOREIGN KEY (recipient_id) REFERENCES client_portal_recipients__0106(id) ON DELETE RESTRICT,
  CHECK (status != 'revoked' OR revoked_at IS NOT NULL)
);

CREATE TABLE client_portal_recipient_grants__0106 (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  recipient_id TEXT NOT NULL CHECK (length(trim(recipient_id)) > 0),
  section_id TEXT,
  capability TEXT NOT NULL CHECK (length(trim(capability)) > 0),
  effect TEXT NOT NULL CHECK (effect IN ('allow', 'deny')),
  created_by TEXT NOT NULL CHECK (length(trim(created_by)) > 0),
  created_at TEXT NOT NULL,
  FOREIGN KEY (recipient_id) REFERENCES client_portal_recipients__0106(id) ON DELETE RESTRICT,
  FOREIGN KEY (section_id) REFERENCES client_portal_sections(id) ON DELETE RESTRICT,
  UNIQUE (recipient_id, section_id, capability)
);

CREATE TABLE client_portal_decisions__0106 (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  portal_id TEXT NOT NULL CHECK (length(trim(portal_id)) > 0),
  issue_id TEXT NOT NULL CHECK (length(trim(issue_id)) > 0),
  recipient_id TEXT NOT NULL CHECK (length(trim(recipient_id)) > 0),
  scope_kind TEXT NOT NULL DEFAULT 'issue' CHECK (scope_kind = 'issue'),
  scope_key TEXT NOT NULL DEFAULT 'issue' CHECK (scope_key = 'issue'),
  decision TEXT NOT NULL CHECK (decision IN ('approved', 'changes_requested', 'declined')),
  note TEXT CHECK (note IS NULL OR length(note) <= 2000),
  signer_name TEXT CHECK (signer_name IS NULL OR length(signer_name) <= 120),
  signer_email_snapshot TEXT NOT NULL CHECK (length(trim(signer_email_snapshot)) > 3),
  signer_role_snapshot TEXT NOT NULL CHECK (signer_role_snapshot IN ('viewer', 'commenter', 'reviewer', 'approver', 'requester')),
  signer_domain_role_snapshot TEXT,
  signer_organization_snapshot TEXT,
  issue_content_hash TEXT NOT NULL CHECK (length(trim(issue_content_hash)) = 64),
  intent_hash TEXT NOT NULL CHECK (length(trim(intent_hash)) = 64),
  idempotency_key TEXT NOT NULL CHECK (length(trim(idempotency_key)) > 0),
  submitted_at TEXT NOT NULL,
  voided_at TEXT,
  voided_by TEXT,
  void_reason TEXT,
  supersedes_decision_id TEXT,
  FOREIGN KEY (portal_id) REFERENCES client_portals(id) ON DELETE RESTRICT,
  FOREIGN KEY (issue_id) REFERENCES client_portal_issues(id) ON DELETE RESTRICT,
  FOREIGN KEY (recipient_id) REFERENCES client_portal_recipients__0106(id) ON DELETE RESTRICT,
  FOREIGN KEY (supersedes_decision_id) REFERENCES client_portal_decisions__0106(id) ON DELETE RESTRICT,
  UNIQUE (recipient_id, idempotency_key),
  CHECK (voided_at IS NULL OR (voided_by IS NOT NULL AND void_reason IS NOT NULL))
);

CREATE TABLE client_portal_analytics_events__0106 (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  portal_id TEXT NOT NULL CHECK (length(trim(portal_id)) > 0),
  issue_id TEXT,
  recipient_id TEXT,
  event_type TEXT NOT NULL CHECK (event_type IN ('viewed', 'section_viewed', 'thread_opened', 'thread_created', 'decision_started', 'decision_submitted')),
  verified_human INTEGER NOT NULL DEFAULT 0 CHECK (verified_human IN (0, 1)),
  occurred_at TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json) AND json_type(metadata_json) = 'object'),
  created_at TEXT NOT NULL,
  FOREIGN KEY (portal_id) REFERENCES client_portals(id) ON DELETE RESTRICT,
  FOREIGN KEY (issue_id) REFERENCES client_portal_issues(id) ON DELETE RESTRICT,
  FOREIGN KEY (recipient_id) REFERENCES client_portal_recipients__0106(id) ON DELETE RESTRICT
);

CREATE TABLE client_portal_notification_outbox__0106 (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  portal_id TEXT NOT NULL CHECK (length(trim(portal_id)) > 0),
  issue_id TEXT,
  recipient_id TEXT,
  event_type TEXT NOT NULL CHECK (length(trim(event_type)) > 0),
  idempotency_key TEXT NOT NULL CHECK (length(trim(idempotency_key)) > 0),
  payload_json TEXT NOT NULL CHECK (json_valid(payload_json) AND json_type(payload_json) = 'object'),
  state TEXT NOT NULL DEFAULT 'pending' CHECK (state IN ('pending', 'processing', 'delivered', 'dead')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0 AND attempt_count <= 10),
  next_attempt_at TEXT NOT NULL,
  lease_token TEXT,
  lease_expires_at TEXT,
  delivered_at TEXT,
  last_error_code TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (portal_id) REFERENCES client_portals(id) ON DELETE RESTRICT,
  FOREIGN KEY (issue_id) REFERENCES client_portal_issues(id) ON DELETE RESTRICT,
  FOREIGN KEY (recipient_id) REFERENCES client_portal_recipients__0106(id) ON DELETE RESTRICT,
  UNIQUE (portal_id, idempotency_key),
  CHECK ((state = 'processing' AND lease_token IS NOT NULL AND lease_expires_at IS NOT NULL) OR state != 'processing')
);

INSERT INTO client_portal_recipients__0106 (
  id, portal_id, email_normalized, display_name, client_organization,
  role_template, domain_role, domain_role_label, status, is_required_approver,
  verification_state, recipient_credential_version, last_verified_at,
  last_seen_at, created_at, updated_at, revoked_at
)
SELECT
  id, portal_id, email_normalized, display_name, client_organization,
  role_template, NULL, NULL, status, is_required_approver,
  verification_state, recipient_credential_version, last_verified_at,
  last_seen_at, created_at, updated_at, revoked_at
FROM client_portal_recipients;

INSERT INTO client_portal_recipient_credentials__0106
SELECT * FROM client_portal_recipient_credentials;

INSERT INTO client_portal_recipient_grants__0106
SELECT * FROM client_portal_recipient_grants;

INSERT INTO client_portal_decisions__0106 (
  id, portal_id, issue_id, recipient_id, scope_kind, scope_key, decision,
  note, signer_name, signer_email_snapshot, signer_role_snapshot,
  signer_domain_role_snapshot, signer_organization_snapshot,
  issue_content_hash, intent_hash, idempotency_key, submitted_at,
  voided_at, voided_by, void_reason, supersedes_decision_id
)
SELECT
  id, portal_id, issue_id, recipient_id, scope_kind, scope_key, decision,
  note, signer_name, signer_email_snapshot, signer_role_snapshot,
  NULL, NULL, issue_content_hash, intent_hash, idempotency_key, submitted_at,
  voided_at, voided_by, void_reason, supersedes_decision_id
FROM client_portal_decisions;

INSERT INTO client_portal_analytics_events__0106
SELECT * FROM client_portal_analytics_events;

INSERT INTO client_portal_notification_outbox__0106
SELECT * FROM client_portal_notification_outbox;

INSERT INTO __0106_assertion (value)
SELECT 1
WHERE (SELECT count(*) FROM client_portal_recipients__0106) <> (SELECT count(*) FROM client_portal_recipients)
   OR (SELECT count(*) FROM client_portal_recipient_credentials__0106) <> (SELECT count(*) FROM client_portal_recipient_credentials)
   OR (SELECT count(*) FROM client_portal_recipient_grants__0106) <> (SELECT count(*) FROM client_portal_recipient_grants)
   OR (SELECT count(*) FROM client_portal_decisions__0106) <> (SELECT count(*) FROM client_portal_decisions)
   OR (SELECT count(*) FROM client_portal_analytics_events__0106) <> (SELECT count(*) FROM client_portal_analytics_events)
   OR (SELECT count(*) FROM client_portal_notification_outbox__0106) <> (SELECT count(*) FROM client_portal_notification_outbox);

DROP TABLE client_portal_analytics_events;
DROP TABLE client_portal_notification_outbox;
DROP TABLE client_portal_recipient_credentials;
DROP TABLE client_portal_recipient_grants;
DROP TABLE client_portal_decisions;
DROP TABLE client_portal_recipients;

ALTER TABLE client_portal_recipients__0106 RENAME TO client_portal_recipients;
ALTER TABLE client_portal_recipient_credentials__0106 RENAME TO client_portal_recipient_credentials;
ALTER TABLE client_portal_recipient_grants__0106 RENAME TO client_portal_recipient_grants;
ALTER TABLE client_portal_decisions__0106 RENAME TO client_portal_decisions;
ALTER TABLE client_portal_analytics_events__0106 RENAME TO client_portal_analytics_events;
ALTER TABLE client_portal_notification_outbox__0106 RENAME TO client_portal_notification_outbox;

CREATE INDEX idx_client_portal_recipients_portal_status
  ON client_portal_recipients(portal_id, status, created_at DESC);

CREATE INDEX idx_client_portal_recipient_credentials_active
  ON client_portal_recipient_credentials(recipient_id, status, expires_at DESC);

CREATE UNIQUE INDEX idx_client_portal_recipient_grants_global_capability
  ON client_portal_recipient_grants(recipient_id, capability)
  WHERE section_id IS NULL;

CREATE INDEX idx_client_portal_recipient_grants_recipient
  ON client_portal_recipient_grants(recipient_id, effect, capability);

CREATE UNIQUE INDEX idx_client_portal_recipient_grants_section_capability
  ON client_portal_recipient_grants(recipient_id, section_id, capability)
  WHERE section_id IS NOT NULL;

CREATE UNIQUE INDEX idx_client_portal_decisions_active_issue_recipient
  ON client_portal_decisions(issue_id, recipient_id, scope_kind, scope_key)
  WHERE voided_at IS NULL;

CREATE INDEX idx_client_portal_decisions_portal_issue
  ON client_portal_decisions(portal_id, issue_id, submitted_at DESC);

CREATE INDEX idx_client_portal_analytics_events_portal_occurred
  ON client_portal_analytics_events(portal_id, occurred_at DESC);

CREATE INDEX idx_client_portal_notification_outbox_state_next
  ON client_portal_notification_outbox(state, next_attempt_at, id);

INSERT INTO __0106_assertion (value)
SELECT 1
WHERE EXISTS (SELECT 1 FROM pragma_foreign_key_check);

DROP TRIGGER __0106_assertion_fail;
DROP TABLE __0106_assertion;
