-- Canonical in-app user support intake, context, privacy fencing, and legacy mapping.
-- This migration is additive. Legacy beta feedback remains read-only source data.

CREATE TABLE IF NOT EXISTS support_message_context (
  message_id TEXT PRIMARY KEY REFERENCES support_messages(id) ON DELETE CASCADE,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE SET NULL,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  estimate_id TEXT REFERENCES estimates(id) ON DELETE SET NULL,
  route_template TEXT NOT NULL CHECK (
    length(trim(route_template)) BETWEEN 1 AND 200
  ),
  app_release TEXT CHECK (
    app_release IS NULL OR length(trim(app_release)) BETWEEN 1 AND 120
  ),
  viewport_width INTEGER CHECK (
    viewport_width IS NULL OR viewport_width BETWEEN 1 AND 32768
  ),
  viewport_height INTEGER CHECK (
    viewport_height IS NULL OR viewport_height BETWEEN 1 AND 32768
  ),
  timezone TEXT CHECK (
    timezone IS NULL OR length(trim(timezone)) BETWEEN 1 AND 100
  ),
  browser_family TEXT CHECK (
    browser_family IS NULL OR length(trim(browser_family)) BETWEEN 1 AND 64
  ),
  os_family TEXT CHECK (
    os_family IS NULL OR length(trim(os_family)) BETWEEN 1 AND 64
  ),
  diagnostics_shared INTEGER NOT NULL DEFAULT 0 CHECK (
    diagnostics_shared IN (0, 1)
  ),
  created_at TEXT NOT NULL,
  CHECK (project_id IS NULL OR workspace_id IS NOT NULL),
  CHECK (estimate_id IS NULL OR project_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_support_message_context_workspace
  ON support_message_context(workspace_id)
  WHERE workspace_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_support_message_context_project
  ON support_message_context(project_id)
  WHERE project_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_support_message_context_estimate
  ON support_message_context(estimate_id)
  WHERE estimate_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS support_user_intake_claims (
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_message_id TEXT NOT NULL CHECK (length(trim(client_message_id)) = 36),
  kind TEXT NOT NULL CHECK (kind IN ('new', 'reply')),
  conversation_id TEXT NOT NULL CHECK (length(trim(conversation_id)) > 0),
  message_id TEXT NOT NULL UNIQUE CHECK (length(trim(message_id)) > 0),
  attachment_id TEXT UNIQUE,
  fingerprint_version INTEGER NOT NULL DEFAULT 1 CHECK (fingerprint_version = 1),
  payload_sha256 TEXT NOT NULL CHECK (length(payload_sha256) = 64),
  attachment_sha256 TEXT CHECK (
    attachment_sha256 IS NULL OR length(attachment_sha256) = 64
  ),
  attachment_r2_key TEXT,
  privacy_generation INTEGER NOT NULL CHECK (privacy_generation >= 0),
  state TEXT NOT NULL CHECK (
    state IN ('reserved', 'committed', 'cleanup_fenced', 'abandoned')
  ),
  lease_token TEXT,
  lease_expires_at TEXT,
  cleanup_not_before TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, client_message_id),
  CHECK (
    (attachment_id IS NULL AND attachment_r2_key IS NULL AND attachment_sha256 IS NULL)
    OR (attachment_id IS NOT NULL AND attachment_r2_key IS NOT NULL)
  ),
  CHECK (
    state <> 'committed'
    OR attachment_id IS NULL
    OR attachment_sha256 IS NOT NULL
  ),
  CHECK (
    (state = 'reserved'
      AND lease_token IS NOT NULL
      AND lease_expires_at IS NOT NULL
      AND cleanup_not_before IS NULL)
    OR (state = 'cleanup_fenced'
      AND lease_token IS NULL
      AND lease_expires_at IS NULL
      AND cleanup_not_before IS NOT NULL)
    OR (state IN ('committed', 'abandoned')
      AND lease_token IS NULL
      AND lease_expires_at IS NULL
      AND cleanup_not_before IS NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_support_user_intake_claim_r2_key
  ON support_user_intake_claims(attachment_r2_key)
  WHERE attachment_r2_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_support_user_intake_claim_cleanup
  ON support_user_intake_claims(state, cleanup_not_before)
  WHERE state IN ('reserved', 'cleanup_fenced');

-- Fail visibly before installing uniqueness constraints if historical rows
-- already contain a duplicate user/client identity or R2 object key.
CREATE TABLE support_user_intake_duplicate_preflight_0100 (
  duplicate_count INTEGER NOT NULL CHECK (duplicate_count = 0)
);

INSERT INTO support_user_intake_duplicate_preflight_0100 (duplicate_count)
SELECT COUNT(*)
FROM (
  SELECT author_user_id, client_message_id
  FROM support_messages
  WHERE sender_role = 'user'
    AND transport = 'in_app'
    AND author_user_id IS NOT NULL
    AND client_message_id IS NOT NULL
  GROUP BY author_user_id, client_message_id
  HAVING COUNT(*) > 1

  UNION ALL

  SELECT r2_key, r2_key
  FROM support_message_attachments
  GROUP BY r2_key
  HAVING COUNT(*) > 1
);

DROP TABLE support_user_intake_duplicate_preflight_0100;

CREATE UNIQUE INDEX IF NOT EXISTS idx_support_messages_user_client_intake
  ON support_messages(author_user_id, client_message_id)
  WHERE sender_role = 'user'
    AND transport = 'in_app'
    AND author_user_id IS NOT NULL
    AND client_message_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_support_message_attachments_r2_key
  ON support_message_attachments(r2_key);

ALTER TABLE support_message_attachments
  ADD COLUMN normalization_schema TEXT CHECK (
    normalization_schema IS NULL
    OR normalization_schema = 'support_screenshot_webp_v1'
  );

ALTER TABLE security_rate_limit_events
  ADD COLUMN dedupe_hash TEXT CHECK (
    dedupe_hash IS NULL OR length(dedupe_hash) = 64
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_security_rate_limit_events_dedupe
  ON security_rate_limit_events(scope, key_hash, dedupe_hash)
  WHERE dedupe_hash IS NOT NULL;

CREATE TABLE IF NOT EXISTS support_subject_privacy_fences (
  user_id TEXT PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  generation INTEGER NOT NULL DEFAULT 0 CHECK (generation >= 0),
  state TEXT NOT NULL DEFAULT 'open' CHECK (
    state IN ('open', 'exporting', 'erasing')
  ),
  privacy_request_id TEXT REFERENCES privacy_requests(id) ON DELETE SET NULL,
  updated_at TEXT NOT NULL,
  CHECK (
    (state = 'open' AND privacy_request_id IS NULL)
    OR (state IN ('exporting', 'erasing') AND privacy_request_id IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS support_privacy_exports (
  privacy_request_id TEXT PRIMARY KEY REFERENCES privacy_requests(id) ON DELETE RESTRICT,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('ready', 'deleted')),
  r2_key TEXT UNIQUE,
  sha256 TEXT CHECK (sha256 IS NULL OR length(sha256) = 64),
  size_bytes INTEGER CHECK (size_bytes IS NULL OR size_bytes >= 0),
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  downloaded_at TEXT,
  deleted_at TEXT,
  CHECK (
    (status = 'ready'
      AND r2_key IS NOT NULL
      AND sha256 IS NOT NULL
      AND size_bytes IS NOT NULL
      AND deleted_at IS NULL)
    OR (status = 'deleted'
      AND r2_key IS NULL
      AND sha256 IS NULL
      AND size_bytes IS NULL
      AND deleted_at IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_support_privacy_exports_user_status
  ON support_privacy_exports(user_id, status, expires_at);

-- Every subject-owned support object is reserved here before its R2 write.
-- Reserved rows survive failed writes/commits so erasure can still enumerate
-- and confirm deletion of the stable object key.
CREATE TABLE IF NOT EXISTS support_subject_r2_objects (
  r2_key TEXT PRIMARY KEY CHECK (length(trim(r2_key)) BETWEEN 1 AND 1024),
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  source_kind TEXT NOT NULL CHECK (
    source_kind IN (
      'user_screenshot',
      'message_attachment',
      'admin_draft_attachment',
      'privacy_export',
      'inbound_attachment',
      'outbound_attachment'
    )
  ),
  source_id TEXT NOT NULL CHECK (length(trim(source_id)) BETWEEN 1 AND 200),
  status TEXT NOT NULL CHECK (status IN ('reserved', 'stored')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(source_kind, source_id)
);

CREATE INDEX IF NOT EXISTS idx_support_subject_r2_objects_user
  ON support_subject_r2_objects(user_id, r2_key);

CREATE TABLE IF NOT EXISTS support_legacy_feedback_imports (
  feedback_id TEXT PRIMARY KEY REFERENCES beta_feedback_submissions(id) ON DELETE RESTRICT,
  conversation_id TEXT NOT NULL UNIQUE REFERENCES support_conversations(id) ON DELETE RESTRICT,
  message_id TEXT NOT NULL UNIQUE REFERENCES support_messages(id) ON DELETE RESTRICT,
  user_visible_at TEXT,
  activated_by_message_id TEXT REFERENCES support_messages(id) ON DELETE SET NULL,
  imported_at TEXT NOT NULL,
  CHECK (
    (user_visible_at IS NULL AND activated_by_message_id IS NULL)
    OR (user_visible_at IS NOT NULL AND activated_by_message_id IS NOT NULL)
  )
);

ALTER TABLE privacy_requests
  ADD COLUMN execution_revision INTEGER NOT NULL DEFAULT 0 CHECK (
    execution_revision >= 0
  );

ALTER TABLE privacy_requests
  ADD COLUMN subject_verified_at TEXT;

ALTER TABLE privacy_requests
  ADD COLUMN subject_verified_by TEXT REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE privacy_requests
  ADD COLUMN subject_verification_method TEXT CHECK (
    subject_verification_method IS NULL
    OR subject_verification_method IN ('authenticated_session', 'admin_verified')
  );

ALTER TABLE privacy_requests
  ADD COLUMN execution_started_at TEXT;

ALTER TABLE privacy_requests
  ADD COLUMN execution_error_code TEXT CHECK (
    execution_error_code IS NULL
    OR length(trim(execution_error_code)) BETWEEN 1 AND 100
  );

-- A row exists only while one fulfillment attempt owns the request. Initial
-- starts and every resume acquire this row with CAS; recorded failure and
-- completion remove it. An expired row may be taken over by a later revision.
CREATE TABLE IF NOT EXISTS support_privacy_execution_attempts (
  privacy_request_id TEXT PRIMARY KEY REFERENCES privacy_requests(id) ON DELETE CASCADE,
  attempt_token TEXT NOT NULL UNIQUE CHECK (length(attempt_token) = 36),
  execution_revision INTEGER NOT NULL CHECK (execution_revision >= 0),
  lease_expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_support_privacy_execution_attempts_expiry
  ON support_privacy_execution_attempts(lease_expires_at);

CREATE TRIGGER IF NOT EXISTS privacy_requests_subject_verification_insert_0100
BEFORE INSERT ON privacy_requests
WHEN NOT (
  (NEW.subject_verified_at IS NULL
    AND NEW.subject_verified_by IS NULL
    AND NEW.subject_verification_method IS NULL)
  OR (NEW.subject_verified_at IS NOT NULL
    AND NEW.subject_verified_by IS NOT NULL
    AND NEW.subject_verification_method IS NOT NULL)
)
BEGIN
  SELECT RAISE(ABORT, 'privacy_request_subject_verification_incomplete');
END;

-- Existing rows are indexed conservatively without asserting normalization.
-- Only canonical ingestion after this migration writes the schema marker.
INSERT OR IGNORE INTO support_subject_r2_objects (
  r2_key, user_id, source_kind, source_id, status, created_at, updated_at
)
SELECT attachment.r2_key, conversation.user_id, 'message_attachment',
       attachment.id, 'stored', attachment.created_at, attachment.created_at
FROM support_message_attachments attachment
INNER JOIN support_messages message ON message.id = attachment.message_id
INNER JOIN support_conversations conversation ON conversation.id = message.conversation_id
WHERE conversation.user_id IS NOT NULL
  AND attachment.storage_status = 'stored';

INSERT OR IGNORE INTO support_subject_r2_objects (
  r2_key, user_id, source_kind, source_id, status, created_at, updated_at
)
SELECT attachment.r2_key, conversation.user_id, 'admin_draft_attachment',
       attachment.id, 'stored', attachment.created_at, attachment.created_at
FROM support_draft_attachments attachment
INNER JOIN support_drafts draft ON draft.id = attachment.draft_id
INNER JOIN support_conversations conversation ON conversation.id = draft.conversation_id
WHERE conversation.user_id IS NOT NULL;

INSERT OR IGNORE INTO support_subject_r2_objects (
  r2_key, user_id, source_kind, source_id, status, created_at, updated_at
)
SELECT claim.attachment_r2_key, claim.user_id, 'user_screenshot',
       claim.attachment_id,
       CASE WHEN claim.state = 'committed' THEN 'stored' ELSE 'reserved' END,
       claim.created_at, claim.updated_at
FROM support_user_intake_claims claim
WHERE claim.attachment_r2_key IS NOT NULL
  AND claim.attachment_id IS NOT NULL;

INSERT OR IGNORE INTO support_subject_r2_objects (
  r2_key, user_id, source_kind, source_id, status, created_at, updated_at
)
SELECT privacy_export.r2_key, privacy_export.user_id, 'privacy_export',
       privacy_export.privacy_request_id, 'stored',
       privacy_export.created_at, privacy_export.created_at
FROM support_privacy_exports privacy_export
WHERE privacy_export.status = 'ready'
  AND privacy_export.r2_key IS NOT NULL;

CREATE TRIGGER IF NOT EXISTS privacy_requests_subject_verification_update_0100
BEFORE UPDATE OF subject_verified_at, subject_verified_by, subject_verification_method
ON privacy_requests
WHEN NOT (
  (NEW.subject_verified_at IS NULL
    AND NEW.subject_verified_by IS NULL
    AND NEW.subject_verification_method IS NULL)
  OR (NEW.subject_verified_at IS NOT NULL
    AND NEW.subject_verified_by IS NOT NULL
    AND NEW.subject_verification_method IS NOT NULL)
)
BEGIN
  SELECT RAISE(ABORT, 'privacy_request_subject_verification_incomplete');
END;
