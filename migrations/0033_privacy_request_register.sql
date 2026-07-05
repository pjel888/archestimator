-- 0033_privacy_request_register.sql
-- P0.5 (Security & Compliance Program 2026-07-04): DSAR / privacy request intake
-- register. Stores incoming data-subject requests (access, rectification, erasure,
-- restriction, portability, objection) so ops/counsel can triage and resolve with
-- an audit trail. Decoupled from auth — anonymous submissions are accepted
-- (REQ-005 ANON-1) because data-subject requests may come from non-logged-in
-- users. Identity verification happens during triage, not at intake.

CREATE TABLE IF NOT EXISTS privacy_requests (
  id TEXT PRIMARY KEY,
  request_kind TEXT NOT NULL CHECK (
    request_kind IN (
      'access',
      'rectification',
      'erasure',
      'restriction',
      'portability',
      'objection',
      'other'
    )
  ),
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (
    status IN ('submitted', 'in_triage', 'in_progress', 'completed', 'rejected')
  ),
  requester_email_hash TEXT,
  requester_name TEXT,
  requester_user_id TEXT,
  description TEXT NOT NULL,
  workspace_id TEXT,
  ip_hash TEXT,
  user_agent_hash TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (
    json_valid(metadata_json)
    AND json_type(metadata_json) = 'object'
  ),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  triaged_at TEXT,
  resolved_at TEXT,
  triaged_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_privacy_requests_status_created
  ON privacy_requests(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_privacy_requests_request_kind_created
  ON privacy_requests(request_kind, created_at DESC);
