CREATE TABLE IF NOT EXISTS project_publications (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  workspace_id TEXT NOT NULL CHECK (length(trim(workspace_id)) > 0),
  project_id TEXT NOT NULL CHECK (length(trim(project_id)) > 0),
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_project_publications_one_published_per_project
  ON project_publications(project_id)
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_project_publications_project_status
  ON project_publications(project_id, status, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_project_publications_token_hash
  ON project_publications(token_hash);

CREATE TABLE IF NOT EXISTS project_publication_events (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  publication_id TEXT NOT NULL CHECK (length(trim(publication_id)) > 0),
  event_type TEXT NOT NULL CHECK (
    event_type IN ('open', 'password_success', 'password_failure', 'download_attempt_blocked', 'password_attempt')
  ),
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (
    json_valid(metadata_json)
    AND json_type(metadata_json) = 'object'
  ),
  ip_hash TEXT,
  user_agent_hash TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_project_publication_events_publication_created
  ON project_publication_events(publication_id, created_at DESC);

CREATE TABLE IF NOT EXISTS shared_link_recipients (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  publication_id TEXT NOT NULL CHECK (length(trim(publication_id)) > 0),
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_shared_link_recipients_publication_email
  ON shared_link_recipients(publication_id, lower(email));

CREATE INDEX IF NOT EXISTS idx_shared_link_recipients_token_hash
  ON shared_link_recipients(recipient_token_hash);

CREATE INDEX IF NOT EXISTS idx_shared_link_recipients_publication_created
  ON shared_link_recipients(publication_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_shared_link_recipients_lower_email
  ON shared_link_recipients(lower(email));

CREATE UNIQUE INDEX IF NOT EXISTS idx_shared_link_recipients_resend_email_id
  ON shared_link_recipients(resend_email_id)
  WHERE resend_email_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS shared_link_comments (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  publication_id TEXT NOT NULL CHECK (length(trim(publication_id)) > 0),
  recipient_id TEXT,
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

CREATE INDEX IF NOT EXISTS idx_shared_link_comments_publication_created
  ON shared_link_comments(publication_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_shared_link_comments_recipient_created
  ON shared_link_comments(recipient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_shared_link_comments_public_feed
  ON shared_link_comments(publication_id, created_at, id)
  WHERE is_internal = 0;

CREATE TABLE IF NOT EXISTS shared_link_responses (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  publication_id TEXT NOT NULL CHECK (length(trim(publication_id)) > 0),
  recipient_id TEXT,
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_shared_link_responses_recipient_publication
  ON shared_link_responses(recipient_id, publication_id)
  WHERE recipient_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_shared_link_responses_publication_created
  ON shared_link_responses(publication_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_shared_link_responses_estimate
  ON shared_link_responses(publication_id, estimate_id)
  WHERE estimate_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_shared_link_responses_row
  ON shared_link_responses(publication_id, row_id)
  WHERE row_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS shared_link_events (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  publication_id TEXT NOT NULL CHECK (length(trim(publication_id)) > 0),
  recipient_id TEXT,
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

CREATE INDEX IF NOT EXISTS idx_shared_link_events_publication_created
  ON shared_link_events(publication_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_shared_link_events_recipient_created
  ON shared_link_events(recipient_id, created_at DESC);

CREATE TABLE IF NOT EXISTS publication_digest_log (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  publication_id TEXT NOT NULL CHECK (length(trim(publication_id)) > 0),
  activity_kind TEXT NOT NULL CHECK (activity_kind IN ('comment', 'decision')),
  delivery_status TEXT NOT NULL CHECK (delivery_status IN ('sent', 'mocked', 'failed', 'skipped', 'rate_limited')),
  owner_email_hash TEXT,
  resend_message_id TEXT,
  error_code TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_publication_digest_log_publication_created
  ON publication_digest_log(publication_id, created_at DESC);
