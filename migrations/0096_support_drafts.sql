-- Durable admin support drafts. Drafts are an additive aggregate and never rely
-- on nullable uniqueness for new-email compose state.

CREATE TABLE IF NOT EXISTS support_drafts (
  id TEXT PRIMARY KEY,
  admin_user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  scope_key TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('reply', 'new_email')),
  conversation_id TEXT REFERENCES support_conversations(id) ON DELETE CASCADE,
  outbound_message_id TEXT REFERENCES support_messages(id) ON DELETE SET NULL,
  client_message_id TEXT NOT NULL,
  lifecycle TEXT NOT NULL DEFAULT 'editing'
    CHECK (lifecycle IN ('editing', 'sending', 'consumed')),
  to_json TEXT,
  cc_json TEXT,
  subject TEXT,
  body_text TEXT,
  body_html TEXT,
  from_identity_id TEXT,
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (
    (kind = 'reply' AND conversation_id IS NOT NULL)
    OR kind = 'new_email'
  ),
  UNIQUE(admin_user_id, scope_key),
  UNIQUE(outbound_message_id)
);

CREATE TABLE IF NOT EXISTS support_draft_attachments (
  id TEXT PRIMARY KEY,
  draft_id TEXT NOT NULL REFERENCES support_drafts(id) ON DELETE CASCADE,
  r2_key TEXT NOT NULL,
  filename TEXT NOT NULL,
  content_type TEXT,
  size_bytes INTEGER NOT NULL CHECK (size_bytes >= 0),
  sha256 TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(draft_id, r2_key)
);

CREATE INDEX IF NOT EXISTS idx_support_drafts_admin_updated
  ON support_drafts(admin_user_id, lifecycle, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_drafts_conversation
  ON support_drafts(conversation_id, updated_at DESC)
  WHERE conversation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_support_draft_attachments_draft
  ON support_draft_attachments(draft_id);
