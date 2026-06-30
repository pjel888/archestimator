CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  slug TEXT UNIQUE,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  project_code TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (id, workspace_id)
);

CREATE TABLE IF NOT EXISTS estimates (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (id, project_id)
);

CREATE TABLE IF NOT EXISTS project_members (
  project_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  user_id TEXT NOT NULL CHECK (length(trim(user_id)) > 0),
  role TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
  added_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (project_id, user_id),
  FOREIGN KEY (project_id, workspace_id) REFERENCES projects(id, workspace_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS estimate_sheet_members (
  estimate_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  user_id TEXT NOT NULL CHECK (length(trim(user_id)) > 0),
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
  added_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (estimate_id, user_id),
  FOREIGN KEY (estimate_id, project_id) REFERENCES estimates(id, project_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS collaboration_invitations (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL,
  estimate_id TEXT,
  scope TEXT NOT NULL DEFAULT 'project' CHECK (scope IN ('project', 'estimate')),
  email TEXT NOT NULL CHECK (email = lower(trim(email))),
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
  invited_by TEXT,
  invited_user_id TEXT,
  lifecycle_state TEXT NOT NULL DEFAULT 'pending' CHECK (
    lifecycle_state IN (
      'pending',
      'direct_granted_existing_user',
      'accepted_by_recipient',
      'revoked',
      'expired'
    )
  ),
  accepted_at TEXT,
  accepted_via TEXT CHECK (
    accepted_via IS NULL
    OR accepted_via IN ('invite_route', 'pending_invite', 'auth_trigger', 'manager_direct_grant')
  ),
  direct_granted_at TEXT,
  direct_granted_user_id TEXT,
  revoked_at TEXT,
  last_opened_at TEXT,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id, workspace_id) REFERENCES projects(id, workspace_id) ON DELETE CASCADE,
  FOREIGN KEY (estimate_id, project_id) REFERENCES estimates(id, project_id) ON DELETE CASCADE,
  CHECK (
    (scope = 'project' AND estimate_id IS NULL)
    OR (scope = 'estimate' AND estimate_id IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS collaboration_invitation_tokens (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  invitation_id TEXT NOT NULL REFERENCES collaboration_invitations(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE CHECK (length(trim(token_hash)) > 0),
  token_hint TEXT,
  delivery_method TEXT NOT NULL CHECK (delivery_method IN ('email', 'copy_url')),
  created_by TEXT NOT NULL CHECK (length(trim(created_by)) > 0),
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  last_opened_at TEXT,
  used_at TEXT,
  revoked_at TEXT,
  revoked_by TEXT
);

CREATE TABLE IF NOT EXISTS collaboration_audit_events (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  invitation_id TEXT REFERENCES collaboration_invitations(id) ON DELETE SET NULL,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  estimate_id TEXT REFERENCES estimates(id) ON DELETE SET NULL,
  actor_user_id TEXT,
  event_type TEXT NOT NULL CHECK (length(trim(event_type)) > 0),
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (
    json_valid(metadata_json)
    AND json_type(metadata_json) = 'object'
  ),
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_project_members_workspace_user
  ON project_members(workspace_id, user_id);

CREATE INDEX IF NOT EXISTS idx_project_members_user
  ON project_members(user_id);

CREATE INDEX IF NOT EXISTS idx_estimate_sheet_members_project_user
  ON estimate_sheet_members(project_id, user_id);

CREATE INDEX IF NOT EXISTS idx_estimate_sheet_members_user
  ON estimate_sheet_members(user_id);

CREATE INDEX IF NOT EXISTS idx_collaboration_invitation_tokens_invitation
  ON collaboration_invitation_tokens(invitation_id);

CREATE INDEX IF NOT EXISTS idx_collaboration_invitation_tokens_expires
  ON collaboration_invitation_tokens(expires_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_collaboration_invitation_tokens_active_by_invitation
  ON collaboration_invitation_tokens(invitation_id)
  WHERE used_at IS NULL AND revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_collaboration_invitations_email_lifecycle
  ON collaboration_invitations(email, lifecycle_state, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_collaboration_invitations_project_lifecycle
  ON collaboration_invitations(project_id, lifecycle_state, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_collaboration_invitations_estimate_lifecycle
  ON collaboration_invitations(estimate_id, lifecycle_state, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_collaboration_audit_events_invitation_created_at
  ON collaboration_audit_events(invitation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_collaboration_audit_events_project_created_at
  ON collaboration_audit_events(project_id, created_at DESC);
