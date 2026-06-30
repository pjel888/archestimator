CREATE TABLE IF NOT EXISTS closed_beta_allowed_emails (
  id TEXT PRIMARY KEY,
  normalized_email TEXT NOT NULL UNIQUE CHECK (
    length(trim(normalized_email)) > 0
    AND normalized_email = lower(trim(normalized_email))
  ),
  status TEXT NOT NULL CHECK (status IN ('invited', 'active', 'revoked')),
  invited_by TEXT,
  invited_at TEXT NOT NULL,
  accepted_at TEXT,
  notes TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS closed_beta_allowlist_audit_events (
  id TEXT PRIMARY KEY,
  allowlist_entry_id TEXT REFERENCES closed_beta_allowed_emails(id) ON DELETE CASCADE,
  actor_user_id TEXT,
  event_type TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  UNIQUE (allowlist_entry_id, event_type, actor_user_id, metadata_json)
);

CREATE INDEX IF NOT EXISTS idx_closed_beta_allowed_emails_status_created_at
  ON closed_beta_allowed_emails(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_closed_beta_allowlist_audit_entry_created_at
  ON closed_beta_allowlist_audit_events(allowlist_entry_id, created_at DESC);

CREATE TABLE IF NOT EXISTS beta_feedback_submissions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  workspace_id TEXT,
  project_id TEXT,
  user_email TEXT NOT NULL,
  feedback_type TEXT NOT NULL CHECK (
    feedback_type IN ('bug', 'confusing_ux', 'missing_feature', 'export_issue', 'estimate_accuracy', 'other')
  ),
  severity TEXT NOT NULL CHECK (severity IN ('blocker', 'high', 'medium', 'low')),
  page_path TEXT,
  message TEXT NOT NULL CHECK (length(trim(message)) BETWEEN 10 AND 4000),
  metadata_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'resolved', 'archived')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS beta_feedback_status_events (
  id TEXT PRIMARY KEY,
  feedback_id TEXT NOT NULL REFERENCES beta_feedback_submissions(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('new', 'reviewing', 'resolved', 'archived')),
  actor_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (feedback_id, status)
);

CREATE INDEX IF NOT EXISTS idx_beta_feedback_created_at
  ON beta_feedback_submissions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_beta_feedback_status_created_at
  ON beta_feedback_submissions(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_beta_feedback_user_created_at
  ON beta_feedback_submissions(user_id, created_at DESC);
