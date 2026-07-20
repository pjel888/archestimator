-- 0095_support_email_inbox.sql
-- Evolve support conversations for external email senders and inbound email metadata.
-- Existing in-app rows are preserved; requester email/name are backfilled from profiles.
-- Development rollback requires recreating the prior 0042/0050 support table shape.

-- Conversations: nullable user_id, persisted requester identity, mailbox + routing token.
CREATE TABLE support_conversations__0095 (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  requester_email TEXT,
  requester_name TEXT,
  subject TEXT,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','pending','resolved','archived')),
  channel TEXT NOT NULL DEFAULT 'in_app'
    CHECK (channel IN ('in_app','email')),
  mailbox_address TEXT,
  routing_token TEXT,
  last_message_at TEXT NOT NULL,
  unread_for_admin INTEGER NOT NULL DEFAULT 1,
  unread_for_user INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT INTO support_conversations__0095 (
  id, user_id, requester_email, requester_name, subject, status, channel,
  mailbox_address, routing_token, last_message_at, unread_for_admin, unread_for_user,
  created_at, updated_at
)
SELECT
  c.id,
  c.user_id,
  lower(trim(p.email)),
  NULLIF(trim(p.display_name), ''),
  c.subject,
  c.status,
  c.channel,
  NULL,
  lower(hex(randomblob(12))),
  c.last_message_at,
  c.unread_for_admin,
  c.unread_for_user,
  c.created_at,
  c.updated_at
FROM support_conversations c
LEFT JOIN profiles p ON p.id = c.user_id;

-- Messages: direction/transport/email correlation fields for inbound + outbound.
CREATE TABLE support_messages__0095 (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES support_conversations__0095(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('user','admin','system')),
  author_user_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  body_text TEXT NOT NULL,
  body_html TEXT,
  email_message_id TEXT,
  client_message_id TEXT,
  send_status TEXT NOT NULL DEFAULT 'sent'
    CHECK (send_status IN ('sent','send_failed','pending')),
  direction TEXT NOT NULL DEFAULT 'internal'
    CHECK (direction IN ('inbound','outbound','internal')),
  transport TEXT NOT NULL DEFAULT 'in_app'
    CHECK (transport IN ('in_app','email')),
  mailbox_address TEXT,
  from_address TEXT,
  from_name TEXT,
  to_json TEXT,
  cc_json TEXT,
  internet_message_id TEXT,
  in_reply_to TEXT,
  references_json TEXT,
  ingest_key TEXT,
  attachment_count INTEGER NOT NULL DEFAULT 0,
  provider_name TEXT,
  received_at TEXT,
  warning_flags_json TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(conversation_id, client_message_id)
);

INSERT INTO support_messages__0095 (
  id, conversation_id, sender_role, author_user_id, body_text, body_html,
  email_message_id, client_message_id, send_status, direction, transport,
  mailbox_address, from_address, from_name, to_json, cc_json,
  internet_message_id, in_reply_to, references_json, ingest_key,
  attachment_count, provider_name, received_at, warning_flags_json, created_at
)
SELECT
  m.id,
  m.conversation_id,
  m.sender_role,
  m.author_user_id,
  m.body_text,
  m.body_html,
  m.email_message_id,
  m.client_message_id,
  m.send_status,
  CASE
    WHEN m.sender_role = 'admin' AND m.email_message_id IS NOT NULL THEN 'outbound'
    WHEN m.sender_role = 'admin' THEN 'outbound'
    WHEN m.sender_role = 'user' THEN 'inbound'
    ELSE 'internal'
  END,
  CASE
    WHEN m.email_message_id IS NOT NULL OR m.send_status IN ('pending','send_failed') THEN 'email'
    ELSE 'in_app'
  END,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  m.email_message_id,
  NULL,
  NULL,
  NULL,
  0,
  CASE WHEN m.email_message_id IS NOT NULL THEN 'cloudflare-email' ELSE NULL END,
  NULL,
  NULL,
  m.created_at
FROM support_messages m;

DROP TABLE support_messages;
DROP TABLE support_conversations;
ALTER TABLE support_conversations__0095 RENAME TO support_conversations;
ALTER TABLE support_messages__0095 RENAME TO support_messages;

CREATE TABLE IF NOT EXISTS support_message_attachments (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL REFERENCES support_messages(id) ON DELETE CASCADE,
  r2_key TEXT NOT NULL,
  filename TEXT NOT NULL,
  content_type TEXT,
  size_bytes INTEGER NOT NULL DEFAULT 0,
  content_id TEXT,
  disposition TEXT,
  sha256 TEXT,
  storage_status TEXT NOT NULL DEFAULT 'stored'
    CHECK (storage_status IN ('stored','failed','blocked','quarantined')),
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_support_conv_user
  ON support_conversations(user_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_conv_status
  ON support_conversations(status, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_conv_last_message
  ON support_conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_conv_channel
  ON support_conversations(channel, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_conv_requester_email
  ON support_conversations(requester_email, last_message_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_support_conv_routing_token
  ON support_conversations(routing_token) WHERE routing_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_support_msg_conv
  ON support_messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_support_msg_email
  ON support_messages(email_message_id) WHERE email_message_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_support_msg_ingest_key
  ON support_messages(ingest_key) WHERE ingest_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_support_msg_internet_message_id
  ON support_messages(internet_message_id) WHERE internet_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_support_msg_attachments_message
  ON support_message_attachments(message_id);
