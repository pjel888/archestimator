-- F4 (UNIT-005) Saved replies — admin canned responses for support/customer comms.
CREATE TABLE IF NOT EXISTS admin_saved_replies (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  label TEXT NOT NULL CHECK (length(trim(label)) BETWEEN 1 AND 120),
  body TEXT NOT NULL CHECK (length(trim(body)) BETWEEN 1 AND 2000),
  created_by TEXT NOT NULL,
  created_by_email TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_saved_replies_label
  ON admin_saved_replies (label);
