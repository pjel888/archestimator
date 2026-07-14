CREATE TABLE IF NOT EXISTS client_portal_issue_estimate_projections (
  section_id TEXT PRIMARY KEY CHECK (length(trim(section_id)) > 0),
  payload_hash TEXT NOT NULL CHECK (length(trim(payload_hash)) = 64),
  summary_json TEXT NOT NULL CHECK (json_valid(summary_json) AND json_type(summary_json) = 'object'),
  row_count INTEGER NOT NULL CHECK (row_count >= 0),
  created_at TEXT NOT NULL,
  FOREIGN KEY (section_id) REFERENCES client_portal_issue_sections(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS client_portal_issue_estimate_rows (
  section_id TEXT NOT NULL CHECK (length(trim(section_id)) > 0),
  payload_hash TEXT NOT NULL CHECK (length(trim(payload_hash)) = 64),
  estimate_id TEXT NOT NULL CHECK (length(trim(estimate_id)) > 0),
  tab_id TEXT NOT NULL CHECK (length(trim(tab_id)) > 0),
  sort_order INTEGER NOT NULL CHECK (sort_order >= 0),
  row_id TEXT NOT NULL CHECK (length(trim(row_id)) > 0),
  branch_ids_json TEXT NOT NULL CHECK (json_valid(branch_ids_json) AND json_type(branch_ids_json) = 'array'),
  search_text TEXT NOT NULL,
  row_json TEXT NOT NULL CHECK (json_valid(row_json) AND json_type(row_json) = 'object'),
  PRIMARY KEY (section_id, estimate_id, tab_id, sort_order),
  UNIQUE (section_id, estimate_id, tab_id, row_id),
  FOREIGN KEY (section_id) REFERENCES client_portal_issue_estimate_projections(section_id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_client_portal_issue_estimate_rows_page
  ON client_portal_issue_estimate_rows(section_id, payload_hash, estimate_id, tab_id, sort_order);
