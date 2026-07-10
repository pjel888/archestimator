-- 0042_support_conversations.sql
-- Admin support conversation and message ledger.

CREATE TABLE IF NOT EXISTS support_conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject TEXT,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','pending','resolved','archived')),
  channel TEXT NOT NULL DEFAULT 'in_app'
    CHECK (channel IN ('in_app','email')),
  last_message_at TEXT NOT NULL,
  unread_for_admin INTEGER NOT NULL DEFAULT 1,
  unread_for_user INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_support_conv_user
  ON support_conversations(user_id, last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_support_conv_status
  ON support_conversations(status, last_message_at DESC);

CREATE TABLE IF NOT EXISTS support_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES support_conversations(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('user','admin','system')),
  author_user_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  body_text TEXT NOT NULL,
  body_html TEXT,
  email_message_id TEXT,
  client_message_id TEXT,
  send_status TEXT NOT NULL DEFAULT 'sent'
    CHECK (send_status IN ('sent','send_failed','pending')),
  created_at TEXT NOT NULL,
  UNIQUE(conversation_id, client_message_id)
);

CREATE INDEX IF NOT EXISTS idx_support_msg_conv
  ON support_messages(conversation_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_support_msg_email
  ON support_messages(email_message_id) WHERE email_message_id IS NOT NULL;
