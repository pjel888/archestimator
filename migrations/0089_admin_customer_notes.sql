-- F3 (UNIT-004) Founder notes on customers (users / accounts).
-- Bounded v1: append-only notes recorded by the founder. Also seeds the F2
-- action-inbox `followup` source in a later increment.
CREATE TABLE IF NOT EXISTS admin_customer_notes (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  target_kind TEXT NOT NULL CHECK (target_kind IN ('user', 'account')),
  target_id TEXT NOT NULL CHECK (length(trim(target_id)) > 0),
  body TEXT NOT NULL CHECK (length(trim(body)) BETWEEN 1 AND 2000),
  created_by TEXT NOT NULL,
  created_by_email TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_customer_notes_target
  ON admin_customer_notes (target_kind, target_id, created_at DESC);
