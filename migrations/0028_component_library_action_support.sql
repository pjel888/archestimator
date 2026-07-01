ALTER TABLE library_folders ADD COLUMN created_by TEXT;

ALTER TABLE cost_library_items ADD COLUMN pricing_source TEXT;
ALTER TABLE cost_library_items ADD COLUMN pricing_date TEXT;
ALTER TABLE cost_library_items ADD COLUMN thumbnail_path TEXT;
ALTER TABLE cost_library_items ADD COLUMN lifecycle_state_changed_at TEXT;
ALTER TABLE cost_library_items ADD COLUMN lifecycle_state_changed_by TEXT;

CREATE TABLE IF NOT EXISTS component_suppliers (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  normalized_name TEXT NOT NULL CHECK (length(trim(normalized_name)) > 0),
  sort_order INTEGER NOT NULL DEFAULT 0,
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (
    json_valid(metadata_json)
    AND json_type(metadata_json) = 'object'
  ),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (workspace_id, normalized_name)
);

CREATE INDEX IF NOT EXISTS idx_component_suppliers_workspace_sort
  ON component_suppliers(workspace_id, sort_order, name);

CREATE TABLE IF NOT EXISTS component_brands (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  normalized_name TEXT NOT NULL CHECK (length(trim(normalized_name)) > 0),
  sort_order INTEGER NOT NULL DEFAULT 0,
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (
    json_valid(metadata_json)
    AND json_type(metadata_json) = 'object'
  ),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (workspace_id, normalized_name)
);

CREATE INDEX IF NOT EXISTS idx_component_brands_workspace_sort
  ON component_brands(workspace_id, sort_order, name);

CREATE TABLE IF NOT EXISTS cost_library_item_versions (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  item_id TEXT NOT NULL REFERENCES cost_library_items(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL CHECK (version_number > 0),
  snapshot_json TEXT NOT NULL DEFAULT '{}' CHECK (
    json_valid(snapshot_json)
    AND json_type(snapshot_json) = 'object'
  ),
  change_summary TEXT NOT NULL DEFAULT '',
  change_reason TEXT NOT NULL DEFAULT '',
  effective_at TEXT NOT NULL,
  created_by TEXT,
  created_at TEXT NOT NULL,
  UNIQUE (item_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_cost_library_item_versions_item_version
  ON cost_library_item_versions(item_id, version_number DESC);

CREATE TABLE IF NOT EXISTS cost_library_item_variant_cost_entries (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL REFERENCES cost_library_items(id) ON DELETE CASCADE,
  price_option_id TEXT NOT NULL REFERENCES cost_library_item_price_options(id) ON DELETE CASCADE,
  unit_cost REAL NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
  misc_cost REAL NOT NULL DEFAULT 0 CHECK (misc_cost >= 0),
  currency TEXT NOT NULL DEFAULT 'PHP',
  pricing_source TEXT,
  pricing_date TEXT,
  confidence TEXT,
  source_url TEXT,
  notes TEXT NOT NULL DEFAULT '',
  is_current INTEGER NOT NULL DEFAULT 0 CHECK (is_current IN (0, 1)),
  deleted_at TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (
    json_valid(metadata_json)
    AND json_type(metadata_json) = 'object'
  ),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (workspace_id, item_id, price_option_id, id)
);

CREATE INDEX IF NOT EXISTS idx_cost_library_variant_cost_entries_option_current
  ON cost_library_item_variant_cost_entries(price_option_id, is_current, deleted_at);

CREATE TABLE IF NOT EXISTS cost_library_item_price_history (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  price_option_id TEXT NOT NULL REFERENCES cost_library_item_price_options(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL REFERENCES cost_library_items(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  operation_key TEXT NOT NULL,
  old_snapshot TEXT CHECK (old_snapshot IS NULL OR json_valid(old_snapshot)),
  new_snapshot TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(new_snapshot)),
  change_reason TEXT NOT NULL DEFAULT '',
  effective_at TEXT NOT NULL,
  created_by TEXT,
  created_at TEXT NOT NULL,
  UNIQUE (item_id, operation_key)
);

CREATE INDEX IF NOT EXISTS idx_cost_library_price_history_item_created
  ON cost_library_item_price_history(item_id, created_at DESC);

CREATE TABLE IF NOT EXISTS cost_library_item_state_history (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  item_id TEXT NOT NULL REFERENCES cost_library_items(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  from_state TEXT NOT NULL,
  to_state TEXT NOT NULL,
  operation_key TEXT NOT NULL,
  effective_at TEXT NOT NULL,
  change_reason TEXT NOT NULL DEFAULT '',
  created_by TEXT,
  created_at TEXT NOT NULL,
  UNIQUE (item_id, operation_key)
);

CREATE INDEX IF NOT EXISTS idx_cost_library_state_history_item_created
  ON cost_library_item_state_history(item_id, created_at DESC);
