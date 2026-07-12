CREATE TABLE IF NOT EXISTS client_portal_assets (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  workspace_id TEXT NOT NULL CHECK (length(trim(workspace_id)) > 0),
  project_id TEXT,
  asset_kind TEXT NOT NULL CHECK (asset_kind IN ('owner_logo', 'client_logo', 'cover_image', 'document')),
  storage_key TEXT NOT NULL UNIQUE CHECK (length(trim(storage_key)) > 0),
  content_type TEXT NOT NULL CHECK (length(trim(content_type)) > 0),
  byte_size INTEGER NOT NULL CHECK (byte_size >= 0),
  content_sha256 TEXT NOT NULL CHECK (length(trim(content_sha256)) = 64),
  width INTEGER CHECK (width IS NULL OR width > 0),
  height INTEGER CHECK (height IS NULL OR height > 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'quarantined', 'deleted')),
  created_by TEXT NOT NULL CHECK (length(trim(created_by)) > 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE RESTRICT,
  FOREIGN KEY (project_id, workspace_id) REFERENCES projects(id, workspace_id) ON DELETE RESTRICT,
  CHECK (project_id IS NOT NULL OR asset_kind IN ('owner_logo', 'client_logo'))
);

CREATE INDEX IF NOT EXISTS idx_client_portal_assets_workspace_status
  ON client_portal_assets(workspace_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_client_portal_assets_project_kind
  ON client_portal_assets(project_id, asset_kind, created_at DESC)
  WHERE project_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS client_portal_brand_profiles (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  workspace_id TEXT NOT NULL CHECK (length(trim(workspace_id)) > 0),
  profile_kind TEXT NOT NULL CHECK (profile_kind IN ('workspace', 'client', 'portal')),
  client_key TEXT,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  owner_logo_asset_id TEXT,
  client_logo_asset_id TEXT,
  co_branding_mode TEXT NOT NULL DEFAULT 'prepared_by_for' CHECK (co_branding_mode IN ('owner_only', 'client_only', 'prepared_by_for', 'co_branded')),
  theme_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(theme_json) AND json_type(theme_json) = 'object'),
  contact_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(contact_json) AND json_type(contact_json) = 'object'),
  attribution_mode TEXT NOT NULL DEFAULT 'optional' CHECK (attribution_mode IN ('required', 'optional', 'hidden')),
  created_by TEXT NOT NULL CHECK (length(trim(created_by)) > 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE RESTRICT,
  FOREIGN KEY (owner_logo_asset_id) REFERENCES client_portal_assets(id) ON DELETE RESTRICT,
  FOREIGN KEY (client_logo_asset_id) REFERENCES client_portal_assets(id) ON DELETE RESTRICT,
  CHECK (profile_kind != 'client' OR client_key IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_client_portal_brand_profiles_workspace_client
  ON client_portal_brand_profiles(workspace_id, client_key)
  WHERE profile_kind = 'client' AND archived_at IS NULL;

CREATE TABLE IF NOT EXISTS client_portals (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  workspace_id TEXT NOT NULL CHECK (length(trim(workspace_id)) > 0),
  project_id TEXT NOT NULL CHECK (length(trim(project_id)) > 0),
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  purpose TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'live', 'access_off', 'archived')),
  stable_token_hash TEXT NOT NULL UNIQUE CHECK (length(trim(stable_token_hash)) > 0),
  encrypted_stable_token TEXT NOT NULL CHECK (length(trim(encrypted_stable_token)) > 0),
  password_hash TEXT,
  access_credential_version INTEGER NOT NULL DEFAULT 1 CHECK (access_credential_version > 0),
  access_policy_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(access_policy_json) AND json_type(access_policy_json) = 'object'),
  default_brand_profile_id TEXT,
  client_brand_profile_id TEXT,
  current_issue_id TEXT,
  created_by TEXT NOT NULL CHECK (length(trim(created_by)) > 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE RESTRICT,
  FOREIGN KEY (project_id, workspace_id) REFERENCES projects(id, workspace_id) ON DELETE RESTRICT,
  FOREIGN KEY (default_brand_profile_id) REFERENCES client_portal_brand_profiles(id) ON DELETE RESTRICT,
  FOREIGN KEY (client_brand_profile_id) REFERENCES client_portal_brand_profiles(id) ON DELETE RESTRICT,
  FOREIGN KEY (current_issue_id) REFERENCES client_portal_issues(id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX IF NOT EXISTS idx_client_portals_project_status
  ON client_portals(project_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_client_portals_workspace_status
  ON client_portals(workspace_id, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS client_portal_sections (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  portal_id TEXT NOT NULL CHECK (length(trim(portal_id)) > 0),
  section_key TEXT NOT NULL CHECK (length(trim(section_key)) > 0),
  kind TEXT NOT NULL CHECK (kind IN ('overview', 'estimate_browser', 'financial_summary', 'cost_breakdown', 'estimate_comparison', 'assumptions_exclusions', 'discussion', 'activity', 'decision')),
  title TEXT NOT NULL CHECK (length(trim(title)) > 0),
  description TEXT,
  sort_order INTEGER NOT NULL CHECK (sort_order >= 0),
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  layout_mode TEXT NOT NULL DEFAULT 'standard' CHECK (layout_mode IN ('standard', 'wide', 'split', 'rail')),
  visibility_policy_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(visibility_policy_json) AND json_type(visibility_policy_json) = 'object'),
  data_scope_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(data_scope_json) AND json_type(data_scope_json) = 'object'),
  field_policy_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(field_policy_json) AND json_type(field_policy_json) = 'object'),
  interaction_policy_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(interaction_policy_json) AND json_type(interaction_policy_json) = 'object'),
  print_policy_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(print_policy_json) AND json_type(print_policy_json) = 'object'),
  config_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(config_json) AND json_type(config_json) = 'object'),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (portal_id) REFERENCES client_portals(id) ON DELETE RESTRICT,
  UNIQUE (portal_id, section_key),
  UNIQUE (portal_id, sort_order)
);

CREATE INDEX IF NOT EXISTS idx_client_portal_sections_portal_enabled
  ON client_portal_sections(portal_id, enabled, sort_order);

CREATE TABLE IF NOT EXISTS client_portal_issues (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  portal_id TEXT NOT NULL CHECK (length(trim(portal_id)) > 0),
  issue_number INTEGER NOT NULL CHECK (issue_number > 0),
  version_label TEXT NOT NULL CHECK (length(trim(version_label)) > 0),
  status TEXT NOT NULL CHECK (status IN ('issued', 'under_review', 'changes_requested', 'accepted', 'declined', 'superseded', 'withdrawn', 'archived')),
  issued_at TEXT NOT NULL,
  issued_by TEXT NOT NULL CHECK (length(trim(issued_by)) > 0),
  idempotency_key TEXT NOT NULL CHECK (length(trim(idempotency_key)) > 0),
  valid_through TEXT,
  supersedes_issue_id TEXT,
  manifest_json TEXT NOT NULL CHECK (json_valid(manifest_json) AND json_type(manifest_json) = 'object'),
  content_hash TEXT NOT NULL CHECK (length(trim(content_hash)) = 64),
  total_cost REAL NOT NULL,
  currency_code TEXT NOT NULL CHECK (length(trim(currency_code)) = 3),
  selected_estimate_ids_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(selected_estimate_ids_json) AND json_type(selected_estimate_ids_json) = 'array'),
  brand_snapshot_json TEXT NOT NULL CHECK (json_valid(brand_snapshot_json) AND json_type(brand_snapshot_json) = 'object'),
  decision_policy_snapshot_json TEXT NOT NULL CHECK (json_valid(decision_policy_snapshot_json) AND json_type(decision_policy_snapshot_json) = 'object'),
  assumptions_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(assumptions_json) AND json_type(assumptions_json) = 'array'),
  exclusions_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(exclusions_json) AND json_type(exclusions_json) = 'array'),
  created_at TEXT NOT NULL,
  FOREIGN KEY (portal_id) REFERENCES client_portals(id) ON DELETE RESTRICT,
  FOREIGN KEY (supersedes_issue_id) REFERENCES client_portal_issues(id) ON DELETE RESTRICT,
  UNIQUE (portal_id, issue_number),
  UNIQUE (portal_id, content_hash),
  UNIQUE (portal_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_client_portal_issues_portal_status
  ON client_portal_issues(portal_id, status, issue_number DESC);

CREATE TABLE IF NOT EXISTS client_portal_issue_sections (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  issue_id TEXT NOT NULL CHECK (length(trim(issue_id)) > 0),
  section_key TEXT NOT NULL CHECK (length(trim(section_key)) > 0),
  kind TEXT NOT NULL CHECK (kind IN ('overview', 'estimate_browser', 'financial_summary', 'cost_breakdown', 'estimate_comparison', 'assumptions_exclusions', 'discussion', 'activity', 'decision')),
  title TEXT NOT NULL CHECK (length(trim(title)) > 0),
  sort_order INTEGER NOT NULL CHECK (sort_order >= 0),
  payload_storage TEXT NOT NULL CHECK (payload_storage IN ('d1_json', 'r2_object')),
  payload_json TEXT,
  r2_object_key TEXT,
  payload_hash TEXT NOT NULL CHECK (length(trim(payload_hash)) = 64),
  payload_bytes INTEGER NOT NULL CHECK (payload_bytes >= 0),
  schema_version INTEGER NOT NULL CHECK (schema_version > 0),
  policy_snapshot_json TEXT NOT NULL CHECK (json_valid(policy_snapshot_json) AND json_type(policy_snapshot_json) = 'object'),
  created_at TEXT NOT NULL,
  FOREIGN KEY (issue_id) REFERENCES client_portal_issues(id) ON DELETE RESTRICT,
  UNIQUE (issue_id, section_key),
  UNIQUE (issue_id, sort_order),
  CHECK (
    (payload_storage = 'd1_json' AND payload_json IS NOT NULL AND json_valid(payload_json) AND r2_object_key IS NULL)
    OR (payload_storage = 'r2_object' AND payload_json IS NULL AND r2_object_key IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_client_portal_issue_sections_issue_sort
  ON client_portal_issue_sections(issue_id, sort_order);

CREATE TABLE IF NOT EXISTS client_portal_recipients (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  portal_id TEXT NOT NULL CHECK (length(trim(portal_id)) > 0),
  email_normalized TEXT NOT NULL CHECK (email_normalized = lower(trim(email_normalized)) AND length(trim(email_normalized)) > 3),
  display_name TEXT,
  client_organization TEXT,
  role_template TEXT NOT NULL CHECK (role_template IN ('viewer', 'commenter', 'reviewer', 'approver')),
  status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'active', 'revoked', 'expired')),
  is_required_approver INTEGER NOT NULL DEFAULT 0 CHECK (is_required_approver IN (0, 1)),
  verification_state TEXT NOT NULL DEFAULT 'unverified' CHECK (verification_state IN ('unverified', 'verified', 'failed')),
  recipient_credential_version INTEGER NOT NULL DEFAULT 1 CHECK (recipient_credential_version > 0),
  last_verified_at TEXT,
  last_seen_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  revoked_at TEXT,
  FOREIGN KEY (portal_id) REFERENCES client_portals(id) ON DELETE RESTRICT,
  UNIQUE (portal_id, email_normalized),
  CHECK (status != 'revoked' OR revoked_at IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_client_portal_recipients_portal_status
  ON client_portal_recipients(portal_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS client_portal_recipient_credentials (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  recipient_id TEXT NOT NULL CHECK (length(trim(recipient_id)) > 0),
  token_hash TEXT NOT NULL UNIQUE CHECK (length(trim(token_hash)) > 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'used', 'expired')),
  expires_at TEXT,
  created_at TEXT NOT NULL,
  revoked_at TEXT,
  FOREIGN KEY (recipient_id) REFERENCES client_portal_recipients(id) ON DELETE RESTRICT,
  CHECK (status != 'revoked' OR revoked_at IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_client_portal_recipient_credentials_active
  ON client_portal_recipient_credentials(recipient_id, status, expires_at DESC);

CREATE TABLE IF NOT EXISTS client_portal_recipient_grants (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  recipient_id TEXT NOT NULL CHECK (length(trim(recipient_id)) > 0),
  section_id TEXT,
  capability TEXT NOT NULL CHECK (length(trim(capability)) > 0),
  effect TEXT NOT NULL CHECK (effect IN ('allow', 'deny')),
  created_by TEXT NOT NULL CHECK (length(trim(created_by)) > 0),
  created_at TEXT NOT NULL,
  FOREIGN KEY (recipient_id) REFERENCES client_portal_recipients(id) ON DELETE RESTRICT,
  FOREIGN KEY (section_id) REFERENCES client_portal_sections(id) ON DELETE RESTRICT,
  UNIQUE (recipient_id, section_id, capability)
);

CREATE INDEX IF NOT EXISTS idx_client_portal_recipient_grants_recipient
  ON client_portal_recipient_grants(recipient_id, effect, capability);

CREATE UNIQUE INDEX IF NOT EXISTS idx_client_portal_recipient_grants_global_capability
  ON client_portal_recipient_grants(recipient_id, capability)
  WHERE section_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_client_portal_recipient_grants_section_capability
  ON client_portal_recipient_grants(recipient_id, section_id, capability)
  WHERE section_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS client_portal_threads (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  portal_id TEXT NOT NULL CHECK (length(trim(portal_id)) > 0),
  issue_id TEXT,
  section_key TEXT,
  target_kind TEXT NOT NULL CHECK (target_kind IN ('portal', 'issue', 'section', 'estimate', 'estimate_tab', 'area_group', 'row', 'chart', 'chart_bucket', 'comparison_row', 'assumption_exclusion', 'activity_event')),
  target_public_id TEXT,
  target_label TEXT NOT NULL CHECK (length(trim(target_label)) > 0),
  target_secondary_label TEXT,
  subject TEXT NOT NULL CHECK (length(trim(subject)) > 0),
  audience TEXT NOT NULL CHECK (audience IN ('client', 'internal')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'archived', 'closed_by_supersession', 'requires_revalidation')),
  waiting_state TEXT NOT NULL DEFAULT 'no_response_required' CHECK (waiting_state IN ('waiting_on_owner', 'waiting_on_client', 'no_response_required')),
  assignee_user_id TEXT,
  created_by_actor_type TEXT NOT NULL CHECK (created_by_actor_type IN ('internal_user', 'recipient', 'system')),
  created_by_actor_id TEXT NOT NULL CHECK (length(trim(created_by_actor_id)) > 0),
  resolved_at TEXT,
  resolved_by_actor_id TEXT,
  carried_forward_from_thread_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (portal_id) REFERENCES client_portals(id) ON DELETE RESTRICT,
  FOREIGN KEY (issue_id) REFERENCES client_portal_issues(id) ON DELETE RESTRICT,
  FOREIGN KEY (carried_forward_from_thread_id) REFERENCES client_portal_threads(id) ON DELETE RESTRICT,
  CHECK (target_kind = 'portal' OR target_public_id IS NOT NULL),
  CHECK (status != 'resolved' OR resolved_at IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_client_portal_threads_portal_queue
  ON client_portal_threads(portal_id, audience, status, waiting_state, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_client_portal_threads_issue_target
  ON client_portal_threads(issue_id, target_kind, target_public_id, updated_at DESC)
  WHERE issue_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS client_portal_messages (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  thread_id TEXT NOT NULL CHECK (length(trim(thread_id)) > 0),
  actor_type TEXT NOT NULL CHECK (actor_type IN ('internal_user', 'recipient', 'system')),
  actor_id TEXT NOT NULL CHECK (length(trim(actor_id)) > 0),
  author_snapshot_json TEXT NOT NULL CHECK (json_valid(author_snapshot_json) AND json_type(author_snapshot_json) = 'object'),
  body TEXT NOT NULL CHECK (length(trim(body)) > 0),
  reply_to_message_id TEXT,
  created_at TEXT NOT NULL,
  edited_at TEXT,
  tombstoned_at TEXT,
  tombstoned_by_actor_id TEXT,
  FOREIGN KEY (thread_id) REFERENCES client_portal_threads(id) ON DELETE RESTRICT,
  FOREIGN KEY (reply_to_message_id) REFERENCES client_portal_messages(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_client_portal_messages_thread_created
  ON client_portal_messages(thread_id, created_at, id);

CREATE TABLE IF NOT EXISTS client_portal_thread_reads (
  thread_id TEXT NOT NULL CHECK (length(trim(thread_id)) > 0),
  actor_type TEXT NOT NULL CHECK (actor_type IN ('internal_user', 'recipient')),
  actor_id TEXT NOT NULL CHECK (length(trim(actor_id)) > 0),
  last_read_message_id TEXT,
  read_at TEXT NOT NULL,
  PRIMARY KEY (thread_id, actor_type, actor_id),
  FOREIGN KEY (thread_id) REFERENCES client_portal_threads(id) ON DELETE RESTRICT,
  FOREIGN KEY (last_read_message_id) REFERENCES client_portal_messages(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS client_portal_thread_subscriptions (
  thread_id TEXT NOT NULL CHECK (length(trim(thread_id)) > 0),
  actor_type TEXT NOT NULL CHECK (actor_type IN ('internal_user', 'recipient')),
  actor_id TEXT NOT NULL CHECK (length(trim(actor_id)) > 0),
  subscribed_at TEXT NOT NULL,
  unsubscribed_at TEXT,
  PRIMARY KEY (thread_id, actor_type, actor_id),
  FOREIGN KEY (thread_id) REFERENCES client_portal_threads(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS client_portal_message_mentions (
  message_id TEXT NOT NULL CHECK (length(trim(message_id)) > 0),
  mentioned_actor_type TEXT NOT NULL CHECK (mentioned_actor_type IN ('internal_user', 'recipient')),
  mentioned_actor_id TEXT NOT NULL CHECK (length(trim(mentioned_actor_id)) > 0),
  created_at TEXT NOT NULL,
  PRIMARY KEY (message_id, mentioned_actor_type, mentioned_actor_id),
  FOREIGN KEY (message_id) REFERENCES client_portal_messages(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS client_portal_decisions (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  portal_id TEXT NOT NULL CHECK (length(trim(portal_id)) > 0),
  issue_id TEXT NOT NULL CHECK (length(trim(issue_id)) > 0),
  recipient_id TEXT NOT NULL CHECK (length(trim(recipient_id)) > 0),
  scope_kind TEXT NOT NULL DEFAULT 'issue' CHECK (scope_kind = 'issue'),
  scope_key TEXT NOT NULL DEFAULT 'issue' CHECK (scope_key = 'issue'),
  decision TEXT NOT NULL CHECK (decision IN ('approved', 'changes_requested', 'declined')),
  note TEXT CHECK (note IS NULL OR length(note) <= 2000),
  signer_name TEXT CHECK (signer_name IS NULL OR length(signer_name) <= 120),
  signer_email_snapshot TEXT NOT NULL CHECK (length(trim(signer_email_snapshot)) > 3),
  signer_role_snapshot TEXT NOT NULL CHECK (signer_role_snapshot IN ('viewer', 'commenter', 'reviewer', 'approver')),
  issue_content_hash TEXT NOT NULL CHECK (length(trim(issue_content_hash)) = 64),
  intent_hash TEXT NOT NULL CHECK (length(trim(intent_hash)) = 64),
  idempotency_key TEXT NOT NULL CHECK (length(trim(idempotency_key)) > 0),
  submitted_at TEXT NOT NULL,
  voided_at TEXT,
  voided_by TEXT,
  void_reason TEXT,
  supersedes_decision_id TEXT,
  FOREIGN KEY (portal_id) REFERENCES client_portals(id) ON DELETE RESTRICT,
  FOREIGN KEY (issue_id) REFERENCES client_portal_issues(id) ON DELETE RESTRICT,
  FOREIGN KEY (recipient_id) REFERENCES client_portal_recipients(id) ON DELETE RESTRICT,
  FOREIGN KEY (supersedes_decision_id) REFERENCES client_portal_decisions(id) ON DELETE RESTRICT,
  UNIQUE (recipient_id, idempotency_key),
  CHECK (voided_at IS NULL OR (voided_by IS NOT NULL AND void_reason IS NOT NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_client_portal_decisions_active_issue_recipient
  ON client_portal_decisions(issue_id, recipient_id, scope_kind, scope_key)
  WHERE voided_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_client_portal_decisions_portal_issue
  ON client_portal_decisions(portal_id, issue_id, submitted_at DESC);

CREATE TABLE IF NOT EXISTS client_portal_audit_events (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  workspace_id TEXT NOT NULL CHECK (length(trim(workspace_id)) > 0),
  portal_id TEXT,
  issue_id TEXT,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('internal_user', 'recipient', 'system')),
  actor_id TEXT,
  event_type TEXT NOT NULL CHECK (length(trim(event_type)) > 0),
  visibility TEXT NOT NULL CHECK (visibility IN ('owner', 'client_safe', 'security')),
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json) AND json_type(metadata_json) = 'object'),
  occurred_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE RESTRICT,
  FOREIGN KEY (portal_id) REFERENCES client_portals(id) ON DELETE RESTRICT,
  FOREIGN KEY (issue_id) REFERENCES client_portal_issues(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_client_portal_audit_events_portal_occurred
  ON client_portal_audit_events(portal_id, occurred_at DESC)
  WHERE portal_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS client_portal_analytics_events (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  portal_id TEXT NOT NULL CHECK (length(trim(portal_id)) > 0),
  issue_id TEXT,
  recipient_id TEXT,
  event_type TEXT NOT NULL CHECK (event_type IN ('viewed', 'section_viewed', 'thread_opened', 'thread_created', 'decision_started', 'decision_submitted')),
  verified_human INTEGER NOT NULL DEFAULT 0 CHECK (verified_human IN (0, 1)),
  occurred_at TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json) AND json_type(metadata_json) = 'object'),
  created_at TEXT NOT NULL,
  FOREIGN KEY (portal_id) REFERENCES client_portals(id) ON DELETE RESTRICT,
  FOREIGN KEY (issue_id) REFERENCES client_portal_issues(id) ON DELETE RESTRICT,
  FOREIGN KEY (recipient_id) REFERENCES client_portal_recipients(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_client_portal_analytics_events_portal_occurred
  ON client_portal_analytics_events(portal_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS client_portal_notification_outbox (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  portal_id TEXT NOT NULL CHECK (length(trim(portal_id)) > 0),
  issue_id TEXT,
  recipient_id TEXT,
  event_type TEXT NOT NULL CHECK (length(trim(event_type)) > 0),
  idempotency_key TEXT NOT NULL CHECK (length(trim(idempotency_key)) > 0),
  payload_json TEXT NOT NULL CHECK (json_valid(payload_json) AND json_type(payload_json) = 'object'),
  state TEXT NOT NULL DEFAULT 'pending' CHECK (state IN ('pending', 'processing', 'delivered', 'dead')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0 AND attempt_count <= 10),
  next_attempt_at TEXT NOT NULL,
  lease_token TEXT,
  lease_expires_at TEXT,
  delivered_at TEXT,
  last_error_code TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (portal_id) REFERENCES client_portals(id) ON DELETE RESTRICT,
  FOREIGN KEY (issue_id) REFERENCES client_portal_issues(id) ON DELETE RESTRICT,
  FOREIGN KEY (recipient_id) REFERENCES client_portal_recipients(id) ON DELETE RESTRICT,
  UNIQUE (portal_id, idempotency_key),
  CHECK ((state = 'processing' AND lease_token IS NOT NULL AND lease_expires_at IS NOT NULL) OR state != 'processing')
);

CREATE INDEX IF NOT EXISTS idx_client_portal_notification_outbox_state_next
  ON client_portal_notification_outbox(state, next_attempt_at, id);

CREATE TABLE IF NOT EXISTS client_portal_legacy_mappings (
  legacy_publication_id TEXT PRIMARY KEY CHECK (length(trim(legacy_publication_id)) > 0),
  portal_id TEXT NOT NULL CHECK (length(trim(portal_id)) > 0),
  issue_id TEXT NOT NULL CHECK (length(trim(issue_id)) > 0),
  migration_status TEXT NOT NULL CHECK (migration_status IN ('planned', 'imported', 'verified', 'cutover_complete', 'rejected')),
  legacy_snapshot_version INTEGER,
  imported_at TEXT,
  verified_at TEXT,
  notes TEXT,
  FOREIGN KEY (legacy_publication_id) REFERENCES project_publications(id) ON DELETE RESTRICT,
  FOREIGN KEY (portal_id) REFERENCES client_portals(id) ON DELETE RESTRICT,
  FOREIGN KEY (issue_id) REFERENCES client_portal_issues(id) ON DELETE RESTRICT,
  UNIQUE (issue_id)
);

CREATE INDEX IF NOT EXISTS idx_client_portal_legacy_mappings_portal
  ON client_portal_legacy_mappings(portal_id, migration_status);

CREATE VIEW IF NOT EXISTS client_portal_legacy_preflight AS
SELECT
  publication.id AS legacy_publication_id,
  publication.project_id,
  publication.workspace_id,
  publication.status AS legacy_status,
  publication.snapshot_version,
  COUNT(DISTINCT recipient.id) AS recipient_count,
  COUNT(DISTINCT comment.id) AS comment_count,
  COUNT(DISTINCT response.id) AS response_count,
  mapping.migration_status,
  mapping.portal_id,
  mapping.issue_id
FROM project_publications AS publication
LEFT JOIN shared_link_recipients AS recipient ON recipient.publication_id = publication.id
LEFT JOIN shared_link_comments AS comment ON comment.publication_id = publication.id
LEFT JOIN shared_link_responses AS response ON response.publication_id = publication.id
LEFT JOIN client_portal_legacy_mappings AS mapping ON mapping.legacy_publication_id = publication.id
GROUP BY publication.id;
