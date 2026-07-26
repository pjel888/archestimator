ALTER TABLE beta_onboarding_flow_events
  ADD COLUMN resource_id TEXT;

CREATE INDEX idx_beta_onboarding_events_resource
  ON beta_onboarding_flow_events(
    workspace_id,
    flow_key,
    flow_version,
    resource_id,
    occurred_at
  )
  WHERE resource_id IS NOT NULL;

CREATE TABLE beta_starter_mutation_leases (
  workspace_id TEXT NOT NULL,
  pack_version INTEGER NOT NULL CHECK (pack_version > 0),
  lease_token TEXT NOT NULL CHECK (length(trim(lease_token)) > 0),
  actor_user_id TEXT NOT NULL CHECK (length(trim(actor_user_id)) > 0),
  operation TEXT NOT NULL CHECK (
    operation IN ('install', 'resume', 'restore')
  ),
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (workspace_id, pack_version),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE INDEX idx_beta_starter_mutation_leases_expiry
  ON beta_starter_mutation_leases(expires_at);
