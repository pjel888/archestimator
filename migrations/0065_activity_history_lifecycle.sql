-- Durable lifecycle state for activity history. These tables are intentionally
-- workspace-scoped so an event can never be held or delivered across tenants.
CREATE TABLE IF NOT EXISTS activity_event_outbox (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL REFERENCES estimate_sheet_events(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'failed')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  available_at TEXT NOT NULL,
  delivered_at TEXT,
  last_error_code TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(event_id)
);

CREATE INDEX IF NOT EXISTS idx_activity_event_outbox_workspace_status_available
  ON activity_event_outbox(workspace_id, status, available_at, id);

CREATE TABLE IF NOT EXISTS activity_event_legal_holds (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL REFERENCES estimate_sheet_events(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (length(trim(reason)) > 0),
  created_by_user_id TEXT,
  created_at TEXT NOT NULL,
  released_at TEXT,
  released_by_user_id TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_activity_event_legal_holds_one_active_event
  ON activity_event_legal_holds(event_id)
  WHERE released_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_activity_event_legal_holds_active_event
  ON activity_event_legal_holds(event_id, released_at);

CREATE INDEX IF NOT EXISTS idx_activity_event_legal_holds_workspace_active
  ON activity_event_legal_holds(workspace_id, released_at, created_at DESC, id DESC);
