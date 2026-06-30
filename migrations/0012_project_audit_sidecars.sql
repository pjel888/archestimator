CREATE TABLE IF NOT EXISTS mass_deletion_storage_cleanup_results (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  target_event_id TEXT NOT NULL UNIQUE CHECK (length(trim(target_event_id)) > 0),
  cleanup_result_json TEXT NOT NULL CHECK (
    json_valid(cleanup_result_json)
    AND json_type(cleanup_result_json) = 'object'
  ),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_mass_deletion_storage_cleanup_results_updated
  ON mass_deletion_storage_cleanup_results(updated_at DESC);
