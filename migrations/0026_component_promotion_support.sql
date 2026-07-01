CREATE TABLE IF NOT EXISTS component_category_nodes (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  parent_id TEXT REFERENCES component_category_nodes(id) ON DELETE SET NULL,
  label TEXT NOT NULL CHECK (length(trim(label)) > 0),
  node_type TEXT NOT NULL DEFAULT 'category',
  sort_order INTEGER NOT NULL DEFAULT 0,
  code TEXT,
  metadata TEXT NOT NULL DEFAULT '{}' CHECK (
    json_valid(metadata)
    AND json_type(metadata) = 'object'
  ),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_component_category_nodes_parent_sort
  ON component_category_nodes(parent_id, sort_order, label);

CREATE TABLE IF NOT EXISTS library_folders (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  parent_id TEXT REFERENCES library_folders(id) ON DELETE SET NULL,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  sort_order INTEGER NOT NULL DEFAULT 0,
  source_category_node_id TEXT REFERENCES component_category_nodes(id) ON DELETE SET NULL,
  folder_kind TEXT NOT NULL DEFAULT 'custom' CHECK (folder_kind IN ('taxonomy', 'custom')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (workspace_id, parent_id, name)
);

CREATE INDEX IF NOT EXISTS idx_library_folders_workspace_parent_sort
  ON library_folders(workspace_id, parent_id, sort_order, name);

CREATE TABLE IF NOT EXISTS cost_library_items (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Uncategorized',
  category_node_id TEXT REFERENCES component_category_nodes(id) ON DELETE SET NULL,
  library_folder_id TEXT REFERENCES library_folders(id) ON DELETE SET NULL,
  supplier TEXT,
  supplier_id TEXT,
  brand TEXT,
  brand_id TEXT,
  unit TEXT NOT NULL DEFAULT '',
  unit_cost REAL NOT NULL DEFAULT 0,
  misc_cost REAL NOT NULL DEFAULT 0,
  lifecycle_state TEXT NOT NULL DEFAULT 'available' CHECK (
    lifecycle_state IN ('draft', 'in_production', 'available', 'discontinued', 'archived')
  ),
  current_version_number INTEGER NOT NULL DEFAULT 1 CHECK (current_version_number > 0),
  active_price_option_id TEXT,
  confidence TEXT,
  source_estimate_row_item_id TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (
    json_valid(metadata_json)
    AND json_type(metadata_json) = 'object'
  ),
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (workspace_id, source_estimate_row_item_id)
);

CREATE INDEX IF NOT EXISTS idx_cost_library_items_workspace_lifecycle
  ON cost_library_items(workspace_id, lifecycle_state, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_cost_library_items_workspace_folder
  ON cost_library_items(workspace_id, library_folder_id, name);

CREATE INDEX IF NOT EXISTS idx_cost_library_items_source_row
  ON cost_library_items(source_estimate_row_item_id)
  WHERE source_estimate_row_item_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS cost_library_item_price_options (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL REFERENCES cost_library_items(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT 'Default',
  unit TEXT NOT NULL DEFAULT '',
  unit_cost REAL NOT NULL DEFAULT 0,
  misc_cost REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'PHP',
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1)),
  updated_at TEXT NOT NULL,
  confidence TEXT,
  supplier_id TEXT,
  pricing_source TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (
    json_valid(metadata_json)
    AND json_type(metadata_json) = 'object'
  ),
  created_at TEXT NOT NULL,
  UNIQUE (workspace_id, item_id, id)
);

CREATE INDEX IF NOT EXISTS idx_cost_library_price_options_item_active
  ON cost_library_item_price_options(item_id, is_active, is_default);

CREATE INDEX IF NOT EXISTS idx_cost_library_price_options_workspace_updated
  ON cost_library_item_price_options(workspace_id, updated_at DESC);
