-- Track whether a closed-beta allowlist invite email has been delivered.
ALTER TABLE closed_beta_allowed_emails
  ADD COLUMN invite_email_sent_at TEXT;

CREATE INDEX IF NOT EXISTS idx_closed_beta_allowed_emails_invite_pending
  ON closed_beta_allowed_emails(status, invite_email_sent_at)
  WHERE invite_email_sent_at IS NULL AND status IN ('invited', 'active');
