-- Durable, tenant-scoped activation state. This is essential product state,
-- not optional analytics: all identities and dedupe keys are server-derived.
CREATE TABLE IF NOT EXISTS beta_activation_progress (
  user_id TEXT NOT NULL CHECK (length(trim(user_id)) > 0),
  workspace_id TEXT NOT NULL CHECK (length(trim(workspace_id)) > 0),
  selected_path TEXT CHECK (
    selected_path IS NULL
    OR selected_path IN ('guided_sample', 'workspace_template', 'blank')
  ),
  project_id TEXT,
  estimate_id TEXT,
  last_milestone TEXT CHECK (
    last_milestone IS NULL
    OR last_milestone IN (
      'invite_accepted', 'workspace_ready', 'project_created', 'first_area_created',
      'first_row_priced', 'first_valid_total', 'health_reviewed', 'export_completed',
      'publication_created', 'recipient_opened', 'recipient_engaged', 'recipient_decided'
    )
  ),
  first_value_completed_at TEXT,
  checklist_dismissed_at TEXT,
  checklist_reopened_at TEXT,
  support_state TEXT NOT NULL DEFAULT 'none' CHECK (
    support_state IN ('none', 'requested', 'open', 'resolved')
  ),
  last_event_at TEXT,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, workspace_id),
  FOREIGN KEY (workspace_id, user_id)
    REFERENCES workspace_members(workspace_id, user_id) ON DELETE RESTRICT,
  FOREIGN KEY (project_id, workspace_id)
    REFERENCES projects(id, workspace_id) ON DELETE RESTRICT,
  FOREIGN KEY (estimate_id, project_id)
    REFERENCES estimates(id, project_id) ON DELETE RESTRICT,
  CHECK (estimate_id IS NULL OR project_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_beta_activation_progress_milestone_event
  ON beta_activation_progress(last_milestone, last_event_at DESC);

CREATE TABLE IF NOT EXISTS beta_activation_events (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  user_id TEXT NOT NULL CHECK (length(trim(user_id)) > 0),
  workspace_id TEXT NOT NULL CHECK (length(trim(workspace_id)) > 0),
  project_id TEXT,
  estimate_id TEXT,
  milestone TEXT NOT NULL CHECK (milestone IN (
    'invite_accepted', 'workspace_ready', 'project_created', 'first_area_created',
    'first_row_priced', 'first_valid_total', 'health_reviewed', 'export_completed',
    'publication_created', 'recipient_opened', 'recipient_engaged', 'recipient_decided'
  )),
  source TEXT NOT NULL CHECK (source IN (
    'invitation', 'project', 'estimate', 'health', 'export', 'publication', 'recipient'
  )),
  occurred_at TEXT NOT NULL,
  dedupe_key TEXT NOT NULL CHECK (length(trim(dedupe_key)) > 0),
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (
    json_valid(metadata_json) AND json_type(metadata_json) = 'object'
  ),
  created_at TEXT NOT NULL,
  FOREIGN KEY (workspace_id, user_id)
    REFERENCES workspace_members(workspace_id, user_id) ON DELETE RESTRICT,
  FOREIGN KEY (project_id, workspace_id)
    REFERENCES projects(id, workspace_id) ON DELETE RESTRICT,
  FOREIGN KEY (estimate_id, project_id)
    REFERENCES estimates(id, project_id) ON DELETE RESTRICT,
  UNIQUE (workspace_id, dedupe_key),
  CHECK (estimate_id IS NULL OR project_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_beta_activation_events_user_workspace_occurred
  ON beta_activation_events(user_id, workspace_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_beta_activation_events_milestone_occurred
  ON beta_activation_events(milestone, occurred_at DESC);

CREATE TABLE IF NOT EXISTS beta_activation_outbox (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  domain_mutation_id TEXT NOT NULL CHECK (length(trim(domain_mutation_id)) > 0),
  user_id TEXT NOT NULL CHECK (length(trim(user_id)) > 0),
  workspace_id TEXT NOT NULL CHECK (length(trim(workspace_id)) > 0),
  project_id TEXT,
  estimate_id TEXT,
  milestone TEXT NOT NULL CHECK (milestone IN (
    'invite_accepted', 'workspace_ready', 'project_created', 'first_area_created',
    'first_row_priced', 'first_valid_total', 'health_reviewed', 'export_completed',
    'publication_created', 'recipient_opened', 'recipient_engaged', 'recipient_decided'
  )),
  source TEXT NOT NULL CHECK (source IN (
    'invitation', 'project', 'estimate', 'health', 'export', 'publication', 'recipient'
  )),
  occurred_at TEXT NOT NULL,
  dedupe_key TEXT NOT NULL CHECK (length(trim(dedupe_key)) > 0),
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (
    json_valid(metadata_json) AND json_type(metadata_json) = 'object'
  ),
  state TEXT NOT NULL DEFAULT 'pending' CHECK (state IN ('pending', 'processing', 'delivered', 'dead')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0 AND attempt_count <= 10),
  next_attempt_at TEXT NOT NULL,
  lease_token TEXT,
  lease_expires_at TEXT,
  delivered_at TEXT,
  last_error_code TEXT CHECK (
    last_error_code IS NULL OR length(trim(last_error_code)) > 0
  ),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (workspace_id, user_id)
    REFERENCES workspace_members(workspace_id, user_id) ON DELETE RESTRICT,
  FOREIGN KEY (project_id, workspace_id)
    REFERENCES projects(id, workspace_id) ON DELETE RESTRICT,
  FOREIGN KEY (estimate_id, project_id)
    REFERENCES estimates(id, project_id) ON DELETE RESTRICT,
  UNIQUE (workspace_id, dedupe_key),
  CHECK (estimate_id IS NULL OR project_id IS NOT NULL),
  CHECK (
    (state = 'processing' AND lease_token IS NOT NULL AND lease_expires_at IS NOT NULL)
    OR (state != 'processing')
  )
);

CREATE INDEX IF NOT EXISTS idx_beta_activation_outbox_state_next_attempt
  ON beta_activation_outbox(state, next_attempt_at, id);

CREATE INDEX IF NOT EXISTS idx_beta_activation_outbox_lease_expires
  ON beta_activation_outbox(lease_expires_at, id)
  WHERE lease_expires_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS beta_activation_retention_holds (
  user_id TEXT NOT NULL CHECK (length(trim(user_id)) > 0),
  workspace_id TEXT NOT NULL CHECK (length(trim(workspace_id)) > 0),
  reason_code TEXT NOT NULL CHECK (reason_code IN ('legal_hold', 'regulatory_review', 'security_investigation')),
  starts_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_by TEXT NOT NULL CHECK (length(trim(created_by)) > 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, workspace_id),
  FOREIGN KEY (workspace_id, user_id)
    REFERENCES workspace_members(workspace_id, user_id) ON DELETE RESTRICT,
  CHECK (expires_at > starts_at)
);

CREATE INDEX IF NOT EXISTS idx_beta_activation_retention_holds_active
  ON beta_activation_retention_holds(user_id, workspace_id, starts_at, expires_at);
