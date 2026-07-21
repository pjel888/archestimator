-- Soft-retain account deletion registry.
-- Product data stays in place; closed workspaces and tombstoned profiles make
-- prior data unreachable to a fresh signup while preserving rows for ops.

ALTER TABLE workspaces ADD COLUMN closed_at TEXT;
ALTER TABLE workspaces ADD COLUMN closed_reason TEXT
  CHECK (
    closed_reason IS NULL
    OR closed_reason IN ('account_deleted', 'admin_closed')
  );
ALTER TABLE workspaces ADD COLUMN closed_by_user_id TEXT;
ALTER TABLE workspaces ADD COLUMN deletion_id TEXT;

CREATE INDEX IF NOT EXISTS idx_workspaces_closed_at
  ON workspaces(closed_at)
  WHERE closed_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_workspaces_deletion_id
  ON workspaces(deletion_id)
  WHERE deletion_id IS NOT NULL;

ALTER TABLE profiles ADD COLUMN deleted_at TEXT;
ALTER TABLE profiles ADD COLUMN deletion_id TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at
  ON profiles(deleted_at)
  WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_deletion_id
  ON profiles(deletion_id)
  WHERE deletion_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS deleted_accounts (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  original_user_id TEXT NOT NULL CHECK (length(trim(original_user_id)) > 0),
  original_email TEXT NOT NULL CHECK (
    length(trim(original_email)) > 0
    AND original_email = lower(trim(original_email))
  ),
  original_display_name TEXT,
  closed_workspace_ids_json TEXT NOT NULL DEFAULT '[]' CHECK (
    json_valid(closed_workspace_ids_json)
    AND json_type(closed_workspace_ids_json) = 'array'
  ),
  left_workspace_ids_json TEXT NOT NULL DEFAULT '[]' CHECK (
    json_valid(left_workspace_ids_json)
    AND json_type(left_workspace_ids_json) = 'array'
  ),
  membership_snapshot_json TEXT NOT NULL DEFAULT '{}' CHECK (
    json_valid(membership_snapshot_json)
    AND json_type(membership_snapshot_json) = 'object'
  ),
  status TEXT NOT NULL DEFAULT 'completed' CHECK (
    status IN ('completed', 'failed')
  ),
  failure_reason TEXT,
  deleted_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_deleted_accounts_original_user
  ON deleted_accounts(original_user_id, deleted_at DESC);

CREATE INDEX IF NOT EXISTS idx_deleted_accounts_original_email
  ON deleted_accounts(original_email, deleted_at DESC);

CREATE INDEX IF NOT EXISTS idx_deleted_accounts_deleted_at
  ON deleted_accounts(deleted_at DESC);
