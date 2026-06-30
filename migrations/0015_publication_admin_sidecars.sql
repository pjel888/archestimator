ALTER TABLE projects ADD COLUMN client_name TEXT;
ALTER TABLE projects ADD COLUMN location TEXT;
ALTER TABLE projects ADD COLUMN currency_code TEXT NOT NULL DEFAULT 'USD';
ALTER TABLE projects ADD COLUMN metadata TEXT NOT NULL DEFAULT '{}' CHECK (
  json_valid(metadata)
  AND json_type(metadata) = 'object'
);

ALTER TABLE estimates ADD COLUMN sheet_code TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS estimate_row_items (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  estimate_id TEXT NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  node_id TEXT,
  description TEXT NOT NULL DEFAULT '',
  designation TEXT NOT NULL DEFAULT '',
  discipline TEXT NOT NULL DEFAULT '',
  material TEXT NOT NULL DEFAULT '',
  quantity REAL NOT NULL DEFAULT 0,
  quantity_base REAL,
  quantity_contingency_amount REAL,
  unit TEXT NOT NULL DEFAULT '',
  unit_cost REAL NOT NULL DEFAULT 0,
  misc_cost REAL NOT NULL DEFAULT 0,
  contingency_percentage REAL NOT NULL DEFAULT 0,
  adjustment_percentage REAL NOT NULL DEFAULT 0,
  source_snapshot_json TEXT NOT NULL DEFAULT '{}' CHECK (
    json_valid(source_snapshot_json)
    AND json_type(source_snapshot_json) = 'object'
  ),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_estimate_row_items_estimate_sort
  ON estimate_row_items(estimate_id, sort_order, id);

CREATE TABLE IF NOT EXISTS estimate_nodes (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  estimate_id TEXT NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  estimate_tab_id TEXT,
  name TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL DEFAULT 'group' CHECK (kind IN ('group', 'area')),
  parent_id TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_estimate_nodes_estimate_sort
  ON estimate_nodes(estimate_id, sort_order, id);

CREATE TABLE IF NOT EXISTS estimate_tabs (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  estimate_id TEXT NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1)),
  archived_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_estimate_tabs_estimate_sort
  ON estimate_tabs(estimate_id, sort_order, id)
  WHERE archived_at IS NULL;
