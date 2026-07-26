CREATE UNIQUE INDEX idx_beta_starter_mutation_leases_token
  ON beta_starter_mutation_leases(workspace_id, pack_version, lease_token);

CREATE TABLE beta_starter_mutation_fence_guards (
  guard_nonce TEXT PRIMARY KEY CHECK (length(trim(guard_nonce)) > 0),
  workspace_id TEXT NOT NULL,
  pack_version INTEGER NOT NULL CHECK (pack_version > 0),
  lease_token TEXT NOT NULL CHECK (length(trim(lease_token)) > 0),
  created_at TEXT NOT NULL,
  FOREIGN KEY (workspace_id, pack_version, lease_token)
    REFERENCES beta_starter_mutation_leases(workspace_id, pack_version, lease_token)
    ON DELETE CASCADE
);

CREATE TABLE beta_starter_restore_cas_guards (
  guard_nonce TEXT PRIMARY KEY CHECK (length(trim(guard_nonce)) > 0),
  workspace_id TEXT NOT NULL,
  pack_version INTEGER NOT NULL CHECK (pack_version > 0),
  scope_owner_id TEXT NOT NULL,
  expected_revision INTEGER NOT NULL CHECK (expected_revision >= 0),
  created_at TEXT NOT NULL,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE TRIGGER trg_beta_starter_restore_cas_guard
BEFORE INSERT ON beta_starter_restore_cas_guards
FOR EACH ROW
WHEN NOT EXISTS (
  SELECT 1
  FROM beta_starter_pack_states
  WHERE workspace_id = NEW.workspace_id
    AND pack_version = NEW.pack_version
    AND scope_kind = 'workspace'
    AND scope_owner_id = NEW.scope_owner_id
    AND revision = NEW.expected_revision
)
BEGIN
  SELECT RAISE(ABORT, 'starter_restore_stale');
END;
