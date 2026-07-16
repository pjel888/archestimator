-- F2 (UNIT-003) Founder Action Inbox — durable action-item state.
-- Deduped by derived_key (source_kind:source_id); statuses open|snoozed|resolved|dismissed.
-- Reconciliation: open-source upserts refresh payload (preserving resolved/dismissed,
-- reopening expired snoozes); closed sources auto-resolve. See action-inbox-repository.ts.
CREATE TABLE IF NOT EXISTS admin_action_items (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  derived_key TEXT NOT NULL UNIQUE CHECK (length(trim(derived_key)) > 0),
  source_kind TEXT NOT NULL CHECK (
    source_kind IN ('incident', 'support', 'feedback', 'identity', 'job', 'upload_scan', 'followup')
  ),
  source_id TEXT NOT NULL CHECK (length(trim(source_id)) > 0),
  title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 240),
  detail TEXT,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  href TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'snoozed', 'resolved', 'dismissed')),
  priority INTEGER NOT NULL DEFAULT 50,
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  snooze_until TEXT,
  resolved_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_action_items_status_priority
  ON admin_action_items (status, priority, last_seen_at DESC);
