CREATE TABLE __0101_assertion (
  value INTEGER NOT NULL
);

CREATE TRIGGER __0101_assertion_fail
BEFORE INSERT ON __0101_assertion
WHEN NEW.value <> 0
BEGIN
  SELECT RAISE(ROLLBACK, 'beta_onboarding_flow_state_preflight_failed');
END;

CREATE TABLE beta_activation_events__0101 (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  user_id TEXT NOT NULL CHECK (length(trim(user_id)) > 0),
  workspace_id TEXT NOT NULL CHECK (length(trim(workspace_id)) > 0),
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  estimate_id TEXT REFERENCES estimates(id) ON DELETE SET NULL,
  milestone TEXT NOT NULL CHECK (milestone IN (
    'invite_accepted', 'workspace_ready', 'project_created', 'first_area_created',
    'first_row_priced', 'first_valid_total', 'health_reviewed', 'export_completed',
    'publication_created', 'recipient_opened', 'recipient_engaged', 'recipient_decided'
  )),
  source TEXT NOT NULL CHECK (source IN (
    'invitation', 'project', 'estimate', 'health', 'export', 'publication', 'recipient'
  )),
  origin_class TEXT NOT NULL CHECK (
    origin_class IN ('user_domain', 'starter_seed', 'tutorial_seed')
  ),
  occurred_at TEXT NOT NULL,
  dedupe_key TEXT NOT NULL CHECK (length(trim(dedupe_key)) > 0),
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (
    json_valid(metadata_json) AND json_type(metadata_json) = 'object'
  ),
  created_at TEXT NOT NULL,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  UNIQUE (workspace_id, dedupe_key),
  CHECK (estimate_id IS NULL OR project_id IS NOT NULL)
);

INSERT INTO beta_activation_events__0101 (
  id, user_id, workspace_id, project_id, estimate_id, milestone, source,
  origin_class, occurred_at, dedupe_key, metadata_json, created_at
)
SELECT
  event.id,
  event.user_id,
  event.workspace_id,
  event.project_id,
  event.estimate_id,
  event.milestone,
  event.source,
  CASE
    WHEN event.project_id IS NOT NULL AND EXISTS (
      SELECT 1
      FROM projects project
      WHERE project.id = event.project_id
        AND (
          json_extract(project.metadata, '$.activation_sample') = 1
          OR json_extract(project.metadata, '$.activation_sample') = '1'
          OR json_extract(project.metadata, '$.activation_sample_version') IS NOT NULL
        )
    )
      THEN 'tutorial_seed'
    ELSE 'user_domain'
  END,
  event.occurred_at,
  event.dedupe_key,
  event.metadata_json,
  event.created_at
FROM beta_activation_events event;

CREATE TABLE beta_activation_outbox__0101 (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  domain_mutation_id TEXT NOT NULL CHECK (length(trim(domain_mutation_id)) > 0),
  user_id TEXT NOT NULL CHECK (length(trim(user_id)) > 0),
  workspace_id TEXT NOT NULL CHECK (length(trim(workspace_id)) > 0),
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  estimate_id TEXT REFERENCES estimates(id) ON DELETE SET NULL,
  milestone TEXT NOT NULL CHECK (milestone IN (
    'invite_accepted', 'workspace_ready', 'project_created', 'first_area_created',
    'first_row_priced', 'first_valid_total', 'health_reviewed', 'export_completed',
    'publication_created', 'recipient_opened', 'recipient_engaged', 'recipient_decided'
  )),
  source TEXT NOT NULL CHECK (source IN (
    'invitation', 'project', 'estimate', 'health', 'export', 'publication', 'recipient'
  )),
  origin_class TEXT NOT NULL CHECK (
    origin_class IN ('user_domain', 'starter_seed', 'tutorial_seed')
  ),
  occurred_at TEXT NOT NULL,
  dedupe_key TEXT NOT NULL CHECK (length(trim(dedupe_key)) > 0),
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (
    json_valid(metadata_json) AND json_type(metadata_json) = 'object'
  ),
  state TEXT NOT NULL DEFAULT 'pending' CHECK (
    state IN ('pending', 'processing', 'delivered', 'dead')
  ),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (
    attempt_count >= 0 AND attempt_count <= 10
  ),
  next_attempt_at TEXT NOT NULL,
  lease_token TEXT,
  lease_expires_at TEXT,
  delivered_at TEXT,
  last_error_code TEXT CHECK (
    last_error_code IS NULL OR length(trim(last_error_code)) > 0
  ),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  UNIQUE (workspace_id, dedupe_key),
  CHECK (estimate_id IS NULL OR project_id IS NOT NULL),
  CHECK (
    (
      state = 'processing'
      AND lease_token IS NOT NULL
      AND lease_expires_at IS NOT NULL
    )
    OR state != 'processing'
  )
);

INSERT INTO beta_activation_outbox__0101 (
  id, domain_mutation_id, user_id, workspace_id, project_id, estimate_id,
  milestone, source, origin_class, occurred_at, dedupe_key, metadata_json,
  state, attempt_count, next_attempt_at, lease_token, lease_expires_at,
  delivered_at, last_error_code, created_at, updated_at
)
SELECT
  outbox.id,
  outbox.domain_mutation_id,
  outbox.user_id,
  outbox.workspace_id,
  outbox.project_id,
  outbox.estimate_id,
  outbox.milestone,
  outbox.source,
  CASE
    WHEN outbox.project_id IS NOT NULL AND EXISTS (
      SELECT 1
      FROM projects project
      WHERE project.id = outbox.project_id
        AND (
          json_extract(project.metadata, '$.activation_sample') = 1
          OR json_extract(project.metadata, '$.activation_sample') = '1'
          OR json_extract(project.metadata, '$.activation_sample_version') IS NOT NULL
        )
    )
      THEN 'tutorial_seed'
    ELSE 'user_domain'
  END,
  outbox.occurred_at,
  outbox.dedupe_key,
  outbox.metadata_json,
  outbox.state,
  outbox.attempt_count,
  outbox.next_attempt_at,
  outbox.lease_token,
  outbox.lease_expires_at,
  outbox.delivered_at,
  outbox.last_error_code,
  outbox.created_at,
  outbox.updated_at
FROM beta_activation_outbox outbox;

CREATE TABLE beta_activation_progress__0101 (
  user_id TEXT NOT NULL CHECK (length(trim(user_id)) > 0),
  workspace_id TEXT NOT NULL CHECK (length(trim(workspace_id)) > 0),
  selected_path TEXT CHECK (
    selected_path IS NULL
    OR selected_path IN (
      'guided_sample', 'workspace_template', 'blank',
      'starter_reference', 'starter_sandbox'
    )
  ),
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  estimate_id TEXT REFERENCES estimates(id) ON DELETE SET NULL,
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
  automatic_guidance_disabled_at TEXT,
  support_state TEXT NOT NULL DEFAULT 'none' CHECK (
    support_state IN ('none', 'requested', 'open', 'resolved')
  ),
  last_event_at TEXT,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, workspace_id),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  CHECK (estimate_id IS NULL OR project_id IS NOT NULL)
);

INSERT INTO beta_activation_progress__0101 (
  user_id, workspace_id, selected_path, project_id, estimate_id, last_milestone,
  first_value_completed_at, checklist_dismissed_at, checklist_reopened_at,
  automatic_guidance_disabled_at, support_state, last_event_at, version, created_at, updated_at
)
SELECT
  progress.user_id,
  progress.workspace_id,
  progress.selected_path,
  (
    SELECT event.project_id
    FROM beta_activation_events__0101 event
    WHERE event.user_id = progress.user_id
      AND event.workspace_id = progress.workspace_id
      AND event.origin_class = 'user_domain'
      AND event.project_id IS NOT NULL
    ORDER BY event.occurred_at DESC, event.id DESC
    LIMIT 1
  ),
  (
    SELECT event.estimate_id
    FROM beta_activation_events__0101 event
    WHERE event.user_id = progress.user_id
      AND event.workspace_id = progress.workspace_id
      AND event.origin_class = 'user_domain'
      AND event.estimate_id IS NOT NULL
    ORDER BY event.occurred_at DESC, event.id DESC
    LIMIT 1
  ),
  (
    SELECT event.milestone
    FROM beta_activation_events__0101 event
    WHERE event.user_id = progress.user_id
      AND event.workspace_id = progress.workspace_id
      AND event.origin_class = 'user_domain'
    ORDER BY
      CASE event.milestone
        WHEN 'invite_accepted' THEN 0
        WHEN 'workspace_ready' THEN 1
        WHEN 'project_created' THEN 2
        WHEN 'first_area_created' THEN 3
        WHEN 'first_row_priced' THEN 4
        WHEN 'first_valid_total' THEN 5
        WHEN 'health_reviewed' THEN 6
        WHEN 'export_completed' THEN 7
        WHEN 'publication_created' THEN 8
        WHEN 'recipient_opened' THEN 9
        WHEN 'recipient_engaged' THEN 10
        WHEN 'recipient_decided' THEN 11
        ELSE -1
      END DESC,
      event.occurred_at DESC,
      event.id DESC
    LIMIT 1
  ),
  (
    SELECT MIN(event.occurred_at)
    FROM beta_activation_events__0101 event
    WHERE event.user_id = progress.user_id
      AND event.workspace_id = progress.workspace_id
      AND event.origin_class = 'user_domain'
      AND event.milestone = 'first_valid_total'
  ),
  progress.checklist_dismissed_at,
  progress.checklist_reopened_at,
  NULL,
  progress.support_state,
  (
    SELECT MAX(event.occurred_at)
    FROM beta_activation_events__0101 event
    WHERE event.user_id = progress.user_id
      AND event.workspace_id = progress.workspace_id
      AND event.origin_class = 'user_domain'
  ),
  progress.version,
  progress.created_at,
  progress.updated_at
FROM beta_activation_progress progress;

CREATE TABLE beta_activation_retention_holds__0101 (
  user_id TEXT NOT NULL CHECK (length(trim(user_id)) > 0),
  workspace_id TEXT NOT NULL CHECK (length(trim(workspace_id)) > 0),
  reason_code TEXT NOT NULL CHECK (
    reason_code IN ('legal_hold', 'regulatory_review', 'security_investigation')
  ),
  starts_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_by TEXT NOT NULL CHECK (length(trim(created_by)) > 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, workspace_id),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE RESTRICT,
  CHECK (expires_at > starts_at)
);

INSERT INTO beta_activation_retention_holds__0101 (
  user_id, workspace_id, reason_code, starts_at, expires_at,
  created_by, created_at, updated_at
)
SELECT
  user_id, workspace_id, reason_code, starts_at, expires_at,
  created_by, created_at, updated_at
FROM beta_activation_retention_holds;

INSERT INTO __0101_assertion (value)
SELECT 1
WHERE (SELECT COUNT(*) FROM beta_activation_progress)
  <> (SELECT COUNT(*) FROM beta_activation_progress__0101);
INSERT INTO __0101_assertion (value)
SELECT 1
WHERE (SELECT COUNT(*) FROM beta_activation_events)
  <> (SELECT COUNT(*) FROM beta_activation_events__0101);
INSERT INTO __0101_assertion (value)
SELECT 1
WHERE (SELECT COUNT(*) FROM beta_activation_outbox)
  <> (SELECT COUNT(*) FROM beta_activation_outbox__0101);
INSERT INTO __0101_assertion (value)
SELECT 1
WHERE (SELECT COUNT(*) FROM beta_activation_retention_holds)
  <> (SELECT COUNT(*) FROM beta_activation_retention_holds__0101);
INSERT INTO __0101_assertion (value)
SELECT 1
WHERE EXISTS (
  SELECT 1
  FROM pragma_foreign_key_check
  WHERE "table" IN (
    'beta_activation_progress__0101',
    'beta_activation_events__0101',
    'beta_activation_outbox__0101',
    'beta_activation_retention_holds__0101'
  )
);

DROP TABLE beta_activation_outbox;
DROP TABLE beta_activation_events;
DROP TABLE beta_activation_progress;
DROP TABLE beta_activation_retention_holds;

ALTER TABLE beta_activation_progress__0101 RENAME TO beta_activation_progress;
ALTER TABLE beta_activation_events__0101 RENAME TO beta_activation_events;
ALTER TABLE beta_activation_outbox__0101 RENAME TO beta_activation_outbox;
ALTER TABLE beta_activation_retention_holds__0101 RENAME TO beta_activation_retention_holds;

CREATE INDEX idx_beta_activation_progress_milestone_event
  ON beta_activation_progress(last_milestone, last_event_at DESC);
CREATE INDEX idx_beta_activation_events_user_workspace_occurred
  ON beta_activation_events(user_id, workspace_id, occurred_at DESC);
CREATE INDEX idx_beta_activation_events_milestone_occurred
  ON beta_activation_events(milestone, occurred_at DESC);
CREATE INDEX idx_beta_activation_outbox_state_next_attempt
  ON beta_activation_outbox(state, next_attempt_at, id);
CREATE INDEX idx_beta_activation_outbox_lease_expires
  ON beta_activation_outbox(lease_expires_at, id)
  WHERE lease_expires_at IS NOT NULL;
CREATE INDEX idx_beta_activation_retention_holds_active
  ON beta_activation_retention_holds(user_id, workspace_id, starts_at, expires_at);

CREATE TABLE beta_starter_pack_states (
  workspace_id TEXT NOT NULL,
  pack_version INTEGER NOT NULL CHECK (pack_version > 0),
  scope_kind TEXT NOT NULL CHECK (scope_kind IN ('workspace', 'user')),
  scope_owner_id TEXT NOT NULL CHECK (length(trim(scope_owner_id)) > 0),
  status TEXT NOT NULL CHECK (status IN ('installing', 'complete', 'partial')),
  revision INTEGER NOT NULL DEFAULT 0 CHECK (revision >= 0),
  shared_membership_revision INTEGER NOT NULL DEFAULT 0 CHECK (
    shared_membership_revision >= 0
  ),
  installed_at TEXT,
  last_restored_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (workspace_id, pack_version, scope_kind, scope_owner_id),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  CHECK (scope_kind = 'user' OR scope_owner_id = workspace_id)
);

CREATE INDEX idx_beta_starter_pack_states_workspace_status
  ON beta_starter_pack_states(workspace_id, pack_version, status);
CREATE INDEX idx_beta_starter_pack_states_owner_status
  ON beta_starter_pack_states(
    workspace_id, scope_kind, scope_owner_id, status
  );

CREATE TABLE beta_starter_asset_claims (
  workspace_id TEXT NOT NULL,
  pack_version INTEGER NOT NULL CHECK (pack_version > 0),
  scope_kind TEXT NOT NULL CHECK (scope_kind IN ('workspace', 'user')),
  scope_owner_id TEXT NOT NULL CHECK (length(trim(scope_owner_id)) > 0),
  asset_key TEXT NOT NULL CHECK (length(trim(asset_key)) > 0),
  asset_kind TEXT NOT NULL CHECK (
    asset_kind IN (
      'project', 'project_group', 'project_group_membership',
      'component_folder', 'component', 'template'
    )
  ),
  starter_generation INTEGER NOT NULL CHECK (starter_generation > 0),
  resource_id TEXT NOT NULL CHECK (length(trim(resource_id)) > 0),
  lifecycle_state TEXT NOT NULL CHECK (
    lifecycle_state IN ('active', 'archived', 'missing')
  ),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (
    workspace_id, pack_version, scope_kind, scope_owner_id,
    asset_key, starter_generation
  ),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  CHECK (scope_kind = 'user' OR scope_owner_id = workspace_id)
);

CREATE UNIQUE INDEX idx_beta_starter_claims_active_key
  ON beta_starter_asset_claims(
    workspace_id, pack_version, scope_kind, scope_owner_id, asset_key
  )
  WHERE lifecycle_state = 'active';
CREATE UNIQUE INDEX idx_beta_starter_claims_active_resource
  ON beta_starter_asset_claims(
    workspace_id, pack_version, asset_kind, resource_id
  )
  WHERE lifecycle_state = 'active';
CREATE INDEX idx_beta_starter_claims_kind_state
  ON beta_starter_asset_claims(
    workspace_id, pack_version, asset_kind, lifecycle_state
  );
CREATE INDEX idx_beta_starter_claims_owner_state
  ON beta_starter_asset_claims(
    workspace_id, scope_kind, scope_owner_id, lifecycle_state
  );

CREATE TABLE beta_onboarding_flow_states (
  user_id TEXT NOT NULL CHECK (length(trim(user_id)) > 0),
  workspace_id TEXT NOT NULL,
  flow_key TEXT NOT NULL CHECK (length(trim(flow_key)) > 0),
  flow_version INTEGER NOT NULL CHECK (flow_version > 0),
  generation INTEGER NOT NULL DEFAULT 1 CHECK (generation > 0),
  tutorial_version INTEGER CHECK (
    tutorial_version IS NULL OR tutorial_version > 0
  ),
  tutorial_generation INTEGER CHECK (
    tutorial_generation IS NULL OR tutorial_generation > 0
  ),
  status TEXT NOT NULL CHECK (
    status IN ('not_started', 'in_progress', 'completed', 'dismissed')
  ),
  current_step_key TEXT,
  revision INTEGER NOT NULL DEFAULT 0 CHECK (revision >= 0),
  reset_count INTEGER NOT NULL DEFAULT 0 CHECK (reset_count >= 0),
  started_at TEXT,
  last_resumed_at TEXT,
  last_paused_at TEXT,
  completed_at TEXT,
  dismissed_at TEXT,
  last_reset_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, workspace_id, flow_key, flow_version),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  CHECK (
    (
      flow_key = 'guided_estimate_practice'
      AND tutorial_version IS NOT NULL
      AND tutorial_generation IS NOT NULL
    )
    OR (
      flow_key <> 'guided_estimate_practice'
      AND tutorial_version IS NULL
      AND tutorial_generation IS NULL
    )
  )
);

CREATE INDEX idx_beta_onboarding_states_user_status
  ON beta_onboarding_flow_states(workspace_id, user_id, status);
CREATE INDEX idx_beta_onboarding_states_flow_status
  ON beta_onboarding_flow_states(workspace_id, flow_key, status);
CREATE INDEX idx_beta_onboarding_states_tutorial
  ON beta_onboarding_flow_states(
    workspace_id, tutorial_version, tutorial_generation
  );
CREATE INDEX idx_beta_onboarding_states_updated
  ON beta_onboarding_flow_states(updated_at);

CREATE TABLE beta_onboarding_flow_events (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  user_id TEXT NOT NULL CHECK (length(trim(user_id)) > 0),
  workspace_id TEXT NOT NULL,
  flow_key TEXT NOT NULL CHECK (length(trim(flow_key)) > 0),
  flow_version INTEGER NOT NULL CHECK (flow_version > 0),
  generation INTEGER NOT NULL CHECK (generation > 0),
  tutorial_version INTEGER CHECK (
    tutorial_version IS NULL OR tutorial_version > 0
  ),
  tutorial_generation INTEGER CHECK (
    tutorial_generation IS NULL OR tutorial_generation > 0
  ),
  run_id TEXT NOT NULL CHECK (length(trim(run_id)) > 0),
  launch_mode TEXT NOT NULL CHECK (
    launch_mode IN (
      'auto', 'start', 'resume', 'replay', 'restart',
      'task', 'settings', 'migration', 'system'
    )
  ),
  step_key TEXT,
  event_type TEXT NOT NULL CHECK (length(trim(event_type)) > 0),
  source TEXT NOT NULL CHECK (
    source IN (
      'server_eligibility', 'joyride_runtime', 'user_command',
      'starter_seed', 'tutorial_seed', 'tutorial_practice',
      'non_starter_domain', 'publication_domain',
      'migration', 'system'
    )
  ),
  reason_code TEXT,
  route_key TEXT,
  viewport_class TEXT CHECK (
    viewport_class IS NULL OR viewport_class IN ('mobile', 'desktop')
  ),
  idempotency_key TEXT NOT NULL CHECK (
    length(trim(idempotency_key)) > 0
  ),
  request_fingerprint TEXT,
  state_revision INTEGER NOT NULL CHECK (state_revision >= 0),
  occurred_at TEXT NOT NULL,
  ingested_at TEXT NOT NULL,
  UNIQUE (user_id, workspace_id, idempotency_key),
  FOREIGN KEY (user_id, workspace_id, flow_key, flow_version)
    REFERENCES beta_onboarding_flow_states(
      user_id, workspace_id, flow_key, flow_version
    )
    ON DELETE CASCADE,
  CHECK (
    (
      tutorial_version IS NULL
      AND tutorial_generation IS NULL
    )
    OR (
      tutorial_version IS NOT NULL
      AND tutorial_generation IS NOT NULL
    )
  )
);

CREATE INDEX idx_beta_onboarding_events_user_occurred
  ON beta_onboarding_flow_events(workspace_id, user_id, occurred_at);
CREATE INDEX idx_beta_onboarding_events_flow_occurred
  ON beta_onboarding_flow_events(
    workspace_id, flow_key, flow_version, occurred_at
  );
CREATE INDEX idx_beta_onboarding_events_run_occurred
  ON beta_onboarding_flow_events(workspace_id, flow_key, run_id, occurred_at);
CREATE INDEX idx_beta_onboarding_events_tutorial_occurred
  ON beta_onboarding_flow_events(
    workspace_id, tutorial_version, tutorial_generation, occurred_at
  );
CREATE INDEX idx_beta_onboarding_events_ingested
  ON beta_onboarding_flow_events(ingested_at);

CREATE UNIQUE INDEX idx_projects_tutorial_identity_v2
  ON projects(
    workspace_id,
    created_by,
    json_extract(metadata, '$.tutorial_kind'),
    CAST(json_extract(metadata, '$.tutorial_version') AS INTEGER),
    CAST(json_extract(metadata, '$.tutorial_generation') AS INTEGER)
  )
  WHERE json_extract(metadata, '$.tutorial_kind') = 'estimate_sheet_foundations'
    AND CAST(json_extract(metadata, '$.tutorial_version') AS INTEGER) = 2;

CREATE UNIQUE INDEX idx_projects_active_tutorial_owner_v2
  ON projects(
    workspace_id,
    created_by,
    json_extract(metadata, '$.tutorial_kind')
  )
  WHERE status <> 'archived'
    AND json_extract(metadata, '$.tutorial_kind') = 'estimate_sheet_foundations'
    AND CAST(json_extract(metadata, '$.tutorial_version') AS INTEGER) = 2;

INSERT INTO __0101_assertion (value)
SELECT 1
WHERE EXISTS (SELECT 1 FROM pragma_foreign_key_check);

DROP TRIGGER __0101_assertion_fail;
DROP TABLE __0101_assertion;
