-- F5 (UNIT-006) Release Center — durable release records + go/no-go state.
-- Answers "is the next release safe to ship / what shipped / what's blocked".
CREATE TABLE IF NOT EXISTS admin_release_records (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  version_label TEXT NOT NULL CHECK (length(trim(version_label)) BETWEEN 1 AND 120),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'shipped', 'blocked', 'rolled_back')),
  commit_ref TEXT,
  go_no_go_notes TEXT,
  created_by TEXT NOT NULL,
  created_by_email TEXT,
  created_at TEXT NOT NULL,
  shipped_at TEXT,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_release_records_status_created
  ON admin_release_records (status, created_at DESC);
