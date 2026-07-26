PRAGMA defer_foreign_keys = ON;

CREATE TABLE client_portal_threads__0112_guard (
  assertion INTEGER NOT NULL CHECK (assertion = 1)
);

INSERT INTO client_portal_threads__0112_guard(assertion)
SELECT CASE WHEN NOT EXISTS (
  SELECT 1 FROM client_portal_threads
  WHERE target_kind NOT IN ('portal', 'issue', 'section', 'estimate', 'estimate_tab', 'area_group', 'row', 'component', 'chart', 'chart_bucket', 'comparison_row', 'assumption_exclusion', 'activity_event')
) THEN 1 ELSE 0 END;

CREATE TABLE client_portal_threads__0112 (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  portal_id TEXT NOT NULL CHECK (length(trim(portal_id)) > 0),
  issue_id TEXT,
  section_key TEXT,
  target_kind TEXT NOT NULL CHECK (target_kind IN ('portal', 'issue', 'section', 'estimate', 'estimate_tab', 'area_group', 'row', 'component', 'chart', 'chart_bucket', 'comparison_row', 'assumption_exclusion', 'activity_event', 'change_request', 'artifact', 'artifact_page', 'timeline_event', 'baseline')),
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
  FOREIGN KEY (carried_forward_from_thread_id) REFERENCES client_portal_threads__0112(id) ON DELETE RESTRICT,
  CHECK (target_kind = 'portal' OR target_public_id IS NOT NULL),
  CHECK (status != 'resolved' OR resolved_at IS NOT NULL)
);

CREATE TABLE client_portal_messages__0112 (
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
  idempotency_key TEXT NOT NULL DEFAULT '',
  visibility TEXT NOT NULL DEFAULT 'client' CHECK (visibility IN ('client', 'internal')),
  FOREIGN KEY (thread_id) REFERENCES client_portal_threads__0112(id) ON DELETE RESTRICT,
  FOREIGN KEY (reply_to_message_id) REFERENCES client_portal_messages__0112(id) ON DELETE RESTRICT
);

CREATE TABLE client_portal_thread_reads__0112 (
  thread_id TEXT NOT NULL CHECK (length(trim(thread_id)) > 0),
  actor_type TEXT NOT NULL CHECK (actor_type IN ('internal_user', 'recipient')),
  actor_id TEXT NOT NULL CHECK (length(trim(actor_id)) > 0),
  last_read_message_id TEXT,
  read_at TEXT NOT NULL,
  PRIMARY KEY (thread_id, actor_type, actor_id),
  FOREIGN KEY (thread_id) REFERENCES client_portal_threads__0112(id) ON DELETE RESTRICT,
  FOREIGN KEY (last_read_message_id) REFERENCES client_portal_messages__0112(id) ON DELETE RESTRICT
);

CREATE TABLE client_portal_thread_subscriptions__0112 (
  thread_id TEXT NOT NULL CHECK (length(trim(thread_id)) > 0),
  actor_type TEXT NOT NULL CHECK (actor_type IN ('internal_user', 'recipient')),
  actor_id TEXT NOT NULL CHECK (length(trim(actor_id)) > 0),
  subscribed_at TEXT NOT NULL,
  unsubscribed_at TEXT,
  PRIMARY KEY (thread_id, actor_type, actor_id),
  FOREIGN KEY (thread_id) REFERENCES client_portal_threads__0112(id) ON DELETE RESTRICT
);

CREATE TABLE client_portal_message_mentions__0112 (
  message_id TEXT NOT NULL CHECK (length(trim(message_id)) > 0),
  mentioned_actor_type TEXT NOT NULL CHECK (mentioned_actor_type IN ('internal_user', 'recipient')),
  mentioned_actor_id TEXT NOT NULL CHECK (length(trim(mentioned_actor_id)) > 0),
  created_at TEXT NOT NULL,
  PRIMARY KEY (message_id, mentioned_actor_type, mentioned_actor_id),
  FOREIGN KEY (message_id) REFERENCES client_portal_messages__0112(id) ON DELETE RESTRICT
);

INSERT INTO client_portal_threads__0112 (
  id, portal_id, issue_id, section_key, target_kind, target_public_id,
  target_label, target_secondary_label, subject, audience, status, waiting_state,
  assignee_user_id, created_by_actor_type, created_by_actor_id, resolved_at,
  resolved_by_actor_id, carried_forward_from_thread_id, created_at, updated_at
)
SELECT
  id, portal_id, issue_id, section_key, target_kind, target_public_id,
  target_label, target_secondary_label, subject, audience, status, waiting_state,
  assignee_user_id, created_by_actor_type, created_by_actor_id, resolved_at,
  resolved_by_actor_id, carried_forward_from_thread_id, created_at, updated_at
FROM client_portal_threads;

INSERT INTO client_portal_messages__0112 (
  id, thread_id, actor_type, actor_id, author_snapshot_json, body,
  reply_to_message_id, created_at, edited_at, tombstoned_at,
  tombstoned_by_actor_id, idempotency_key, visibility
)
SELECT
  id, thread_id, actor_type, actor_id, author_snapshot_json, body,
  reply_to_message_id, created_at, edited_at, tombstoned_at,
  tombstoned_by_actor_id, idempotency_key, visibility
FROM client_portal_messages;

INSERT INTO client_portal_thread_reads__0112 (
  thread_id, actor_type, actor_id, last_read_message_id, read_at
)
SELECT thread_id, actor_type, actor_id, last_read_message_id, read_at
FROM client_portal_thread_reads;

INSERT INTO client_portal_thread_subscriptions__0112 (
  thread_id, actor_type, actor_id, subscribed_at, unsubscribed_at
)
SELECT thread_id, actor_type, actor_id, subscribed_at, unsubscribed_at
FROM client_portal_thread_subscriptions;

INSERT INTO client_portal_message_mentions__0112 (
  message_id, mentioned_actor_type, mentioned_actor_id, created_at
)
SELECT message_id, mentioned_actor_type, mentioned_actor_id, created_at
FROM client_portal_message_mentions;

INSERT INTO client_portal_threads__0112_guard(assertion)
SELECT CASE WHEN
  (SELECT COUNT(*) FROM client_portal_threads__0112) = (SELECT COUNT(*) FROM client_portal_threads)
  AND (SELECT COUNT(*) FROM client_portal_messages__0112) = (SELECT COUNT(*) FROM client_portal_messages)
  AND (SELECT COUNT(*) FROM client_portal_thread_reads__0112) = (SELECT COUNT(*) FROM client_portal_thread_reads)
  AND (SELECT COUNT(*) FROM client_portal_thread_subscriptions__0112) = (SELECT COUNT(*) FROM client_portal_thread_subscriptions)
  AND (SELECT COUNT(*) FROM client_portal_message_mentions__0112) = (SELECT COUNT(*) FROM client_portal_message_mentions)
THEN 1 ELSE 0 END;

DROP TABLE client_portal_message_mentions;
DROP TABLE client_portal_thread_reads;
DROP TABLE client_portal_thread_subscriptions;
DROP TABLE client_portal_messages;
DROP TABLE client_portal_threads;

ALTER TABLE client_portal_threads__0112 RENAME TO client_portal_threads;
ALTER TABLE client_portal_messages__0112 RENAME TO client_portal_messages;
ALTER TABLE client_portal_thread_reads__0112 RENAME TO client_portal_thread_reads;
ALTER TABLE client_portal_thread_subscriptions__0112 RENAME TO client_portal_thread_subscriptions;
ALTER TABLE client_portal_message_mentions__0112 RENAME TO client_portal_message_mentions;

CREATE INDEX idx_client_portal_threads_portal_queue
  ON client_portal_threads(portal_id, audience, status, waiting_state, updated_at DESC);
CREATE INDEX idx_client_portal_threads_issue_target
  ON client_portal_threads(issue_id, target_kind, target_public_id, updated_at DESC)
  WHERE issue_id IS NOT NULL;
CREATE INDEX idx_client_portal_messages_thread_created
  ON client_portal_messages(thread_id, created_at, id);
CREATE UNIQUE INDEX idx_client_portal_messages_idempotency
  ON client_portal_messages(thread_id, actor_type, actor_id, idempotency_key);
CREATE INDEX idx_client_portal_messages_client_visible
  ON client_portal_messages(thread_id, created_at, id)
  WHERE visibility = 'client';

DROP TABLE client_portal_threads__0112_guard;
