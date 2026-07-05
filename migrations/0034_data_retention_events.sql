-- 0034_data_retention_events.sql
-- P1.8 (Security & Compliance Program 2026-07-04): per-class TTL enforcement
-- audit trail. Cron jobs write here when they tombstone/anonymize/purge rows.
--
-- The actual retention schedule lives in:
--   .ai/10_state/compliance/retention-schedule.md
-- and is treated as a counsel-reviewed draft until OPEN-DEC-004 is signed off.
-- The cron reads class_name + ttl_days from a runtime config (not stored in D1
-- to avoid migration churn during the schedule-review period).

CREATE TABLE IF NOT EXISTS data_retention_events (
  id TEXT PRIMARY KEY,
  class_name TEXT NOT NULL CHECK (
    class_name IN (
      'account_security_events',
      'account_audit_legacy_sha256',
      'collaboration_audit_events',
      'ai_action_runs',
      'ai_tool_calls',
      'ai_data_access_events',
      'shared_link_events',
      'estimate_sheet_events',
      'privacy_requests_completed',
      'privacy_requests_rejected',
      'logs_worker_observability',
      'logs_email_delivery',
      'uploads_orphaned',
      'sessions_expired'
    )
  ),
  action TEXT NOT NULL CHECK (
    action IN ('tombstoned', 'anonymized', 'purged', 'soft_deleted', 'skipped_legal_hold')
  ),
  rows_affected INTEGER NOT NULL DEFAULT 0 CHECK (rows_affected >= 0),
  cutoff_timestamp TEXT NOT NULL,
  ran_at TEXT NOT NULL,
  cron_run_id TEXT,
  notes TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (
    json_valid(metadata_json)
    AND json_type(metadata_json) = 'object'
  )
);

CREATE INDEX IF NOT EXISTS idx_data_retention_events_class_ran_at
  ON data_retention_events(class_name, ran_at DESC);

CREATE INDEX IF NOT EXISTS idx_data_retention_events_action_ran_at
  ON data_retention_events(action, ran_at DESC);
