-- 0052_corporate_accounts.sql
-- Corporate accounts (organizations) — a new top-level entity above workspaces.
-- Enables grouping users and workspaces under a single corporate entity with
-- org-level roles (owner, team_leader, member, viewer).

CREATE TABLE IF NOT EXISTS corporate_accounts (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  name TEXT NOT NULL CHECK (length(trim(name)) > 0 AND length(trim(name)) <= 200),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'archived')),
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_corporate_accounts_status
  ON corporate_accounts(status);

CREATE INDEX IF NOT EXISTS idx_corporate_accounts_created
  ON corporate_accounts(created_at DESC);

CREATE TABLE IF NOT EXISTS corporate_account_members (
  corporate_account_id TEXT NOT NULL
    REFERENCES corporate_accounts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL CHECK (length(trim(user_id)) > 0),
  role TEXT NOT NULL DEFAULT 'member'
    CHECK (role IN ('owner', 'team_leader', 'member', 'viewer')),
  job_title TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (corporate_account_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_corp_members_user
  ON corporate_account_members(user_id);

CREATE INDEX IF NOT EXISTS idx_corp_members_account_role
  ON corporate_account_members(corporate_account_id, role);

-- Link workspaces to corporate accounts (optional — nullable).
-- Existing solo workspaces remain unlinked (NULL).
-- ON DELETE SET NULL so workspaces survive account deletion.
ALTER TABLE workspaces ADD COLUMN corporate_account_id TEXT
  REFERENCES corporate_accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_workspaces_corporate_account
  ON workspaces(corporate_account_id);
