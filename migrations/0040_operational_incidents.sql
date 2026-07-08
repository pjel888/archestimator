-- 0040_operational_incidents.sql
-- Durable, low-volume operational incident ledger for alert/incident proof.
-- Raw application error logs stay in Cloudflare Workers Logs; D1 stores only
-- redacted incident lifecycle facts and references.

CREATE TABLE IF NOT EXISTS operational_incidents (
  id TEXT PRIMARY KEY,
  declared_at TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('sev1', 'sev2', 'sev3')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'contained', 'resolved', 'closed')),
  owner TEXT NOT NULL,
  summary TEXT NOT NULL,
  root_cause TEXT,
  related_request_ids TEXT NOT NULL DEFAULT '[]' CHECK (
    json_valid(related_request_ids)
    AND json_type(related_request_ids) = 'array'
  ),
  closed_at TEXT,
  CHECK (
    (status = 'closed' AND closed_at IS NOT NULL)
    OR (status <> 'closed' AND closed_at IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_op_incidents_status_declared
  ON operational_incidents(status, declared_at);

CREATE TABLE IF NOT EXISTS operational_incident_events (
  id TEXT PRIMARY KEY,
  incident_id TEXT NOT NULL REFERENCES operational_incidents(id) ON DELETE CASCADE,
  occurred_at TEXT NOT NULL,
  event_kind TEXT NOT NULL CHECK (
    event_kind IN ('declared', 'status_changed', 'escalated', 'note', 'closed')
  ),
  actor TEXT NOT NULL,
  detail TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_op_incident_events_incident_occurred
  ON operational_incident_events(incident_id, occurred_at);

CREATE TABLE data_retention_events__0040 (
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
      'sessions_expired',
      'operational_incidents',
      'operational_incident_events'
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

INSERT INTO data_retention_events__0040 (
  id,
  class_name,
  action,
  rows_affected,
  cutoff_timestamp,
  ran_at,
  cron_run_id,
  notes,
  metadata_json
)
SELECT
  id,
  class_name,
  action,
  rows_affected,
  cutoff_timestamp,
  ran_at,
  cron_run_id,
  notes,
  metadata_json
FROM data_retention_events;

DROP TABLE data_retention_events;

ALTER TABLE data_retention_events__0040 RENAME TO data_retention_events;

CREATE INDEX IF NOT EXISTS idx_data_retention_events_class_ran_at
  ON data_retention_events(class_name, ran_at DESC);

CREATE INDEX IF NOT EXISTS idx_data_retention_events_action_ran_at
  ON data_retention_events(action, ran_at DESC);

