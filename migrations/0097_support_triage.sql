-- Normalized admin triage state for support conversations.

CREATE TABLE IF NOT EXISTS support_conversation_triage (
  conversation_id TEXT PRIMARY KEY REFERENCES support_conversations(id) ON DELETE CASCADE,
  assignee_user_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  snoozed_until TEXT,
  starred_for_admin INTEGER NOT NULL DEFAULT 0 CHECK (starred_for_admin IN (0, 1)),
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS support_conversation_labels (
  conversation_id TEXT NOT NULL REFERENCES support_conversations(id) ON DELETE CASCADE,
  label TEXT NOT NULL CHECK (length(label) BETWEEN 1 AND 48 AND label = lower(trim(label))),
  created_at TEXT NOT NULL,
  PRIMARY KEY (conversation_id, label)
);

CREATE INDEX IF NOT EXISTS idx_support_triage_assignee
  ON support_conversation_triage(assignee_user_id, updated_at DESC)
  WHERE assignee_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_support_triage_snooze
  ON support_conversation_triage(snoozed_until)
  WHERE snoozed_until IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_support_triage_starred
  ON support_conversation_triage(starred_for_admin, updated_at DESC)
  WHERE starred_for_admin = 1;
CREATE INDEX IF NOT EXISTS idx_support_labels_label
  ON support_conversation_labels(label, conversation_id);
