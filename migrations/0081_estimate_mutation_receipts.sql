-- Durable replay receipts for Estimate Sheet mutation intents.
-- Development rollback: DROP TABLE estimate_mutation_receipts;

CREATE TABLE estimate_mutation_receipts (
  id TEXT PRIMARY KEY NOT NULL,
  workspace_id TEXT NOT NULL,
  command_kind TEXT NOT NULL,
  intent_id TEXT NOT NULL,
  actor_user_id TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  request_fingerprint TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'committed',
  result_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  CHECK (length(id) > 0),
  CHECK (length(command_kind) BETWEEN 1 AND 96),
  CHECK (length(intent_id) BETWEEN 1 AND 128),
  CHECK (length(actor_user_id) > 0),
  CHECK (length(resource_type) BETWEEN 1 AND 64),
  CHECK (resource_id IS NULL OR length(resource_id) > 0),
  CHECK (length(request_fingerprint) = 64),
  CHECK (status = 'committed'),
  CHECK (json_valid(result_json)),
  CHECK (json_type(result_json) = 'object'),
  CHECK (length(result_json) <= 65536),
  UNIQUE (workspace_id, command_kind, intent_id)
);
