CREATE TABLE IF NOT EXISTS legal_terms_acceptances (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL CHECK (
    length(trim(user_id)) > 0
    AND user_id <> '00000000-0000-0000-0000-000000000000'
  ),
  terms_key TEXT NOT NULL CHECK (length(trim(terms_key)) > 0),
  terms_version TEXT NOT NULL CHECK (length(trim(terms_version)) > 0),
  terms_effective_date TEXT NOT NULL CHECK (length(trim(terms_effective_date)) > 0),
  terms_content_hash TEXT NOT NULL CHECK (
    length(terms_content_hash) = 71
    AND terms_content_hash GLOB 'sha256:[0-9a-f]*'
  ),
  privacy_policy_version TEXT NOT NULL CHECK (length(trim(privacy_policy_version)) > 0),
  acceptance_method TEXT NOT NULL CHECK (acceptance_method IN ('authenticated_clickwrap')),
  acceptance_context TEXT NOT NULL CHECK (
    acceptance_context IN ('workshop_terms_gate', 'settings_reacceptance', 'admin_support_record')
  ),
  metadata_json TEXT NOT NULL DEFAULT '{"source":"archestimator_web_app"}' CHECK (
    json_valid(metadata_json)
    AND json_type(metadata_json) = 'object'
  ),
  accepted_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (user_id, terms_key, terms_version)
);

CREATE INDEX IF NOT EXISTS idx_legal_terms_acceptances_user_terms_accepted
  ON legal_terms_acceptances(user_id, terms_key, accepted_at DESC);

CREATE INDEX IF NOT EXISTS idx_legal_terms_acceptances_terms_version_accepted
  ON legal_terms_acceptances(terms_key, terms_version, accepted_at DESC);
