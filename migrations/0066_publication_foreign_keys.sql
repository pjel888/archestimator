CREATE TABLE __0066_assertion (
  value INTEGER NOT NULL
);

CREATE TRIGGER __0066_assertion_fail
BEFORE INSERT ON __0066_assertion
WHEN NEW.value <> 0
BEGIN
  SELECT RAISE(ROLLBACK, 'publication_foreign_key_preflight_failed');
END;

INSERT INTO __0066_assertion (value)
SELECT 1
WHERE EXISTS (
  SELECT 1
  FROM project_publications
  WHERE workspace_id NOT IN (SELECT id FROM workspaces)
     OR project_id NOT IN (SELECT id FROM projects)
);
INSERT INTO __0066_assertion (value)
SELECT 1
WHERE EXISTS (
  SELECT 1
  FROM project_publication_events
  WHERE publication_id NOT IN (SELECT id FROM project_publications)
     OR event_type = 'download_attempt_blocked'
);
INSERT INTO __0066_assertion (value)
SELECT 1
WHERE EXISTS (
  SELECT 1
  FROM shared_link_recipients
  WHERE publication_id NOT IN (SELECT id FROM project_publications)
);
INSERT INTO __0066_assertion (value)
SELECT 1
WHERE EXISTS (
  SELECT 1
  FROM shared_link_comments
  WHERE publication_id NOT IN (SELECT id FROM project_publications)
     OR (recipient_id IS NOT NULL AND recipient_id NOT IN (SELECT id FROM shared_link_recipients))
);
INSERT INTO __0066_assertion (value)
SELECT 1
WHERE EXISTS (
  SELECT 1
  FROM shared_link_responses
  WHERE publication_id NOT IN (SELECT id FROM project_publications)
     OR (recipient_id IS NOT NULL AND recipient_id NOT IN (SELECT id FROM shared_link_recipients))
);
INSERT INTO __0066_assertion (value)
SELECT 1
WHERE EXISTS (
  SELECT 1
  FROM shared_link_events
  WHERE publication_id NOT IN (SELECT id FROM project_publications)
     OR (recipient_id IS NOT NULL AND recipient_id NOT IN (SELECT id FROM shared_link_recipients))
);
INSERT INTO __0066_assertion (value)
SELECT 1
WHERE EXISTS (
  SELECT 1
  FROM publication_digest_log
  WHERE publication_id NOT IN (SELECT id FROM project_publications)
);

CREATE TABLE project_publications__0066 (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  workspace_id TEXT NOT NULL CHECK (length(trim(workspace_id)) > 0) REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL CHECK (length(trim(project_id)) > 0) REFERENCES projects(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE CHECK (length(trim(token_hash)) > 0),
  encrypted_token TEXT NOT NULL CHECK (length(trim(encrypted_token)) > 0),
  password_hash TEXT,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'expired', 'revoked')),
  snapshot_version INTEGER NOT NULL DEFAULT 1 CHECK (snapshot_version >= 1),
  selected_estimate_ids TEXT NOT NULL DEFAULT '[]' CHECK (
    json_valid(selected_estimate_ids)
    AND json_type(selected_estimate_ids) = 'array'
  ),
  snapshot_json TEXT NOT NULL CHECK (json_valid(snapshot_json)),
  activity_target_labels_json TEXT NOT NULL DEFAULT '{"estimateLabels":{},"rowLabels":{},"rowEstimateIds":{}}' CHECK (
    json_valid(activity_target_labels_json)
    AND json_type(activity_target_labels_json) = 'object'
  ),
  location_visibility TEXT NOT NULL DEFAULT 'locality' CHECK (location_visibility IN ('exact', 'locality', 'hidden')),
  published_by TEXT,
  published_at TEXT NOT NULL,
  expires_at TEXT,
  revoked_at TEXT,
  open_count INTEGER NOT NULL DEFAULT 0 CHECK (open_count >= 0),
  latest_opened_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT INTO project_publications__0066 (
  id, workspace_id, project_id, token_hash, encrypted_token, password_hash, status,
  snapshot_version, selected_estimate_ids, snapshot_json, activity_target_labels_json,
  location_visibility, published_by, published_at, expires_at, revoked_at, open_count,
  latest_opened_at, created_at, updated_at
)
SELECT
  id, workspace_id, project_id, token_hash, encrypted_token, password_hash, status,
  snapshot_version, selected_estimate_ids, snapshot_json, activity_target_labels_json,
  location_visibility, published_by, published_at, expires_at, revoked_at, open_count,
  latest_opened_at, created_at, updated_at
FROM project_publications;

INSERT INTO __0066_assertion (value)
SELECT 1
WHERE (SELECT COUNT(*) FROM project_publications) <> (SELECT COUNT(*) FROM project_publications__0066);

DROP TABLE project_publications;
ALTER TABLE project_publications__0066 RENAME TO project_publications;

CREATE UNIQUE INDEX idx_project_publications_one_published_per_project
  ON project_publications(project_id)
  WHERE status = 'published';
CREATE INDEX idx_project_publications_project_status
  ON project_publications(project_id, status, published_at DESC);
CREATE INDEX idx_project_publications_token_hash
  ON project_publications(token_hash);

CREATE TABLE project_publication_events__0066 (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  publication_id TEXT NOT NULL CHECK (length(trim(publication_id)) > 0) REFERENCES project_publications(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (
    event_type IN ('open', 'password_success', 'password_failure', 'password_attempt')
  ),
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (
    json_valid(metadata_json)
    AND json_type(metadata_json) = 'object'
  ),
  ip_hash TEXT,
  user_agent_hash TEXT,
  created_at TEXT NOT NULL
);

INSERT INTO project_publication_events__0066 (
  id, publication_id, event_type, metadata_json, ip_hash, user_agent_hash, created_at
)
SELECT
  id, publication_id, event_type, metadata_json, ip_hash, user_agent_hash, created_at
FROM project_publication_events;

INSERT INTO __0066_assertion (value)
SELECT 1
WHERE (SELECT COUNT(*) FROM project_publication_events) <> (SELECT COUNT(*) FROM project_publication_events__0066);

DROP TABLE project_publication_events;
ALTER TABLE project_publication_events__0066 RENAME TO project_publication_events;

CREATE INDEX idx_project_publication_events_publication_created
  ON project_publication_events(publication_id, created_at DESC);

CREATE TABLE shared_link_recipients__0066 (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  publication_id TEXT NOT NULL CHECK (length(trim(publication_id)) > 0) REFERENCES project_publications(id) ON DELETE CASCADE,
  email TEXT NOT NULL CHECK (length(trim(email)) > 0),
  display_name TEXT,
  invited_by TEXT,
  invited_at TEXT NOT NULL,
  recipient_token_hash TEXT NOT NULL UNIQUE CHECK (length(trim(recipient_token_hash)) > 0),
  delivery_status TEXT NOT NULL DEFAULT 'pending' CHECK (
    delivery_status IN ('pending', 'sent', 'bounced', 'opened', 'responded')
  ),
  last_opened_at TEXT,
  email_unsubscribed_at TEXT,
  resend_email_id TEXT,
  resend_last_event_id TEXT,
  resend_last_event_type TEXT,
  resend_last_event_at TEXT,
  resend_delivery_metadata TEXT NOT NULL DEFAULT '{}' CHECK (
    json_valid(resend_delivery_metadata)
    AND json_type(resend_delivery_metadata) = 'object'
  ),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT INTO shared_link_recipients__0066 (
  id, publication_id, email, display_name, invited_by, invited_at, recipient_token_hash,
  delivery_status, last_opened_at, email_unsubscribed_at, resend_email_id,
  resend_last_event_id, resend_last_event_type, resend_last_event_at,
  resend_delivery_metadata, created_at, updated_at
)
SELECT
  id, publication_id, email, display_name, invited_by, invited_at, recipient_token_hash,
  delivery_status, last_opened_at, email_unsubscribed_at, resend_email_id,
  resend_last_event_id, resend_last_event_type, resend_last_event_at,
  resend_delivery_metadata, created_at, updated_at
FROM shared_link_recipients;

INSERT INTO __0066_assertion (value)
SELECT 1
WHERE (SELECT COUNT(*) FROM shared_link_recipients) <> (SELECT COUNT(*) FROM shared_link_recipients__0066);

DROP TABLE shared_link_recipients;
ALTER TABLE shared_link_recipients__0066 RENAME TO shared_link_recipients;

CREATE UNIQUE INDEX idx_shared_link_recipients_publication_email
  ON shared_link_recipients(publication_id, lower(email));
CREATE INDEX idx_shared_link_recipients_token_hash
  ON shared_link_recipients(recipient_token_hash);
CREATE INDEX idx_shared_link_recipients_publication_created
  ON shared_link_recipients(publication_id, created_at DESC);
CREATE INDEX idx_shared_link_recipients_lower_email
  ON shared_link_recipients(lower(email));
CREATE UNIQUE INDEX idx_shared_link_recipients_resend_email_id
  ON shared_link_recipients(resend_email_id)
  WHERE resend_email_id IS NOT NULL;

CREATE TABLE shared_link_comments__0066 (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  publication_id TEXT NOT NULL CHECK (length(trim(publication_id)) > 0) REFERENCES project_publications(id) ON DELETE CASCADE,
  recipient_id TEXT REFERENCES shared_link_recipients(id) ON DELETE SET NULL,
  author_email TEXT NOT NULL CHECK (length(trim(author_email)) > 0),
  author_name TEXT,
  estimate_id TEXT,
  row_id TEXT,
  body TEXT NOT NULL CHECK (length(body) <= 1000),
  is_internal INTEGER NOT NULL DEFAULT 0 CHECK (is_internal IN (0, 1)),
  target_kind TEXT NOT NULL DEFAULT 'proposal' CHECK (target_kind IN ('proposal', 'estimate', 'row')),
  target_label TEXT,
  target_secondary_label TEXT,
  snapshot_version_at_comment INTEGER,
  created_at TEXT NOT NULL
);

INSERT INTO shared_link_comments__0066 (
  id, publication_id, recipient_id, author_email, author_name, estimate_id, row_id,
  body, is_internal, target_kind, target_label, target_secondary_label,
  snapshot_version_at_comment, created_at
)
SELECT
  id, publication_id, recipient_id, author_email, author_name, estimate_id, row_id,
  body, is_internal, target_kind, target_label, target_secondary_label,
  snapshot_version_at_comment, created_at
FROM shared_link_comments;

INSERT INTO __0066_assertion (value)
SELECT 1
WHERE (SELECT COUNT(*) FROM shared_link_comments) <> (SELECT COUNT(*) FROM shared_link_comments__0066);

DROP TABLE shared_link_comments;
ALTER TABLE shared_link_comments__0066 RENAME TO shared_link_comments;

CREATE INDEX idx_shared_link_comments_publication_created
  ON shared_link_comments(publication_id, created_at DESC);
CREATE INDEX idx_shared_link_comments_recipient_created
  ON shared_link_comments(recipient_id, created_at DESC);
CREATE INDEX idx_shared_link_comments_public_feed
  ON shared_link_comments(publication_id, created_at, id)
  WHERE is_internal = 0;

CREATE TABLE shared_link_responses__0066 (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  publication_id TEXT NOT NULL CHECK (length(trim(publication_id)) > 0) REFERENCES project_publications(id) ON DELETE CASCADE,
  recipient_id TEXT REFERENCES shared_link_recipients(id) ON DELETE SET NULL,
  decision TEXT NOT NULL CHECK (decision IN ('accepted', 'declined', 'revision_requested')),
  note TEXT CHECK (note IS NULL OR length(note) <= 2000),
  snapshot_version_at_decision INTEGER NOT NULL,
  estimate_id TEXT,
  row_id TEXT,
  target_kind TEXT NOT NULL DEFAULT 'proposal' CHECK (target_kind IN ('proposal', 'estimate', 'row')),
  target_label TEXT,
  target_secondary_label TEXT,
  signer_name TEXT CHECK (signer_name IS NULL OR length(signer_name) <= 120),
  signature_intent_hash TEXT CHECK (
    signature_intent_hash IS NULL
    OR (
      length(signature_intent_hash) = 64
      AND signature_intent_hash GLOB '[0-9a-f]*'
    )
  ),
  created_at TEXT NOT NULL
);

INSERT INTO shared_link_responses__0066 (
  id, publication_id, recipient_id, decision, note, snapshot_version_at_decision,
  estimate_id, row_id, target_kind, target_label, target_secondary_label,
  signer_name, signature_intent_hash, created_at
)
SELECT
  id, publication_id, recipient_id, decision, note, snapshot_version_at_decision,
  estimate_id, row_id, target_kind, target_label, target_secondary_label,
  signer_name, signature_intent_hash, created_at
FROM shared_link_responses;

INSERT INTO __0066_assertion (value)
SELECT 1
WHERE (SELECT COUNT(*) FROM shared_link_responses) <> (SELECT COUNT(*) FROM shared_link_responses__0066);

DROP TABLE shared_link_responses;
ALTER TABLE shared_link_responses__0066 RENAME TO shared_link_responses;

CREATE UNIQUE INDEX idx_shared_link_responses_recipient_publication
  ON shared_link_responses(recipient_id, publication_id)
  WHERE recipient_id IS NOT NULL;
CREATE INDEX idx_shared_link_responses_publication_created
  ON shared_link_responses(publication_id, created_at DESC);
CREATE INDEX idx_shared_link_responses_estimate
  ON shared_link_responses(publication_id, estimate_id)
  WHERE estimate_id IS NOT NULL;
CREATE INDEX idx_shared_link_responses_row
  ON shared_link_responses(publication_id, row_id)
  WHERE row_id IS NOT NULL;

CREATE TABLE shared_link_events__0066 (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  publication_id TEXT NOT NULL CHECK (length(trim(publication_id)) > 0) REFERENCES project_publications(id) ON DELETE CASCADE,
  recipient_id TEXT REFERENCES shared_link_recipients(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (
    event_type IN ('open', 'comment_add', 'accept_decision', 'decline_decision', 'password_attempt')
  ),
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (
    json_valid(metadata_json)
    AND json_type(metadata_json) = 'object'
  ),
  ip_hash TEXT,
  user_agent_hash TEXT,
  created_at TEXT NOT NULL
);

INSERT INTO shared_link_events__0066 (
  id, publication_id, recipient_id, event_type, metadata_json, ip_hash, user_agent_hash,
  created_at
)
SELECT
  id, publication_id, recipient_id, event_type, metadata_json, ip_hash, user_agent_hash,
  created_at
FROM shared_link_events;

INSERT INTO __0066_assertion (value)
SELECT 1
WHERE (SELECT COUNT(*) FROM shared_link_events) <> (SELECT COUNT(*) FROM shared_link_events__0066);

DROP TABLE shared_link_events;
ALTER TABLE shared_link_events__0066 RENAME TO shared_link_events;

CREATE INDEX idx_shared_link_events_publication_created
  ON shared_link_events(publication_id, created_at DESC);
CREATE INDEX idx_shared_link_events_recipient_created
  ON shared_link_events(recipient_id, created_at DESC);

CREATE TABLE publication_digest_log__0066 (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  publication_id TEXT NOT NULL CHECK (length(trim(publication_id)) > 0) REFERENCES project_publications(id) ON DELETE CASCADE,
  activity_kind TEXT NOT NULL CHECK (activity_kind IN ('comment', 'decision')),
  delivery_status TEXT NOT NULL CHECK (delivery_status IN ('sent', 'mocked', 'failed', 'skipped', 'rate_limited')),
  owner_email_hash TEXT,
  resend_message_id TEXT,
  error_code TEXT,
  created_at TEXT NOT NULL
);

INSERT INTO publication_digest_log__0066 (
  id, publication_id, activity_kind, delivery_status, owner_email_hash,
  resend_message_id, error_code, created_at
)
SELECT
  id, publication_id, activity_kind, delivery_status, owner_email_hash,
  resend_message_id, error_code, created_at
FROM publication_digest_log;

INSERT INTO __0066_assertion (value)
SELECT 1
WHERE (SELECT COUNT(*) FROM publication_digest_log) <> (SELECT COUNT(*) FROM publication_digest_log__0066);

DROP TABLE publication_digest_log;
ALTER TABLE publication_digest_log__0066 RENAME TO publication_digest_log;

CREATE INDEX idx_publication_digest_log_publication_created
  ON publication_digest_log(publication_id, created_at DESC);

INSERT INTO __0066_assertion (value)
SELECT 1
WHERE EXISTS (SELECT 1 FROM pragma_foreign_key_check);

DROP TRIGGER __0066_assertion_fail;
DROP TABLE __0066_assertion;
