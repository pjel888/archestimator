CREATE TABLE IF NOT EXISTS estimate_templates (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'General' CHECK (length(trim(category)) > 0),
  sort_order INTEGER NOT NULL DEFAULT 0,
  metadata TEXT NOT NULL DEFAULT '{}' CHECK (
    json_valid(metadata)
    AND json_type(metadata) = 'object'
  ),
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (id, workspace_id)
);

CREATE TABLE IF NOT EXISTS estimate_template_nodes (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  template_id TEXT NOT NULL REFERENCES estimate_templates(id) ON DELETE CASCADE,
  parent_id TEXT REFERENCES estimate_template_nodes(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('group', 'area')),
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  sort_order INTEGER NOT NULL DEFAULT 0,
  metadata TEXT NOT NULL DEFAULT '{}' CHECK (
    json_valid(metadata)
    AND json_type(metadata) = 'object'
  ),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (template_id, id),
  CHECK (parent_id IS NULL OR parent_id <> id),
  FOREIGN KEY (template_id, parent_id)
    REFERENCES estimate_template_nodes(template_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS estimate_template_row_items (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  template_id TEXT NOT NULL REFERENCES estimate_templates(id) ON DELETE CASCADE,
  template_node_id TEXT NOT NULL REFERENCES estimate_template_nodes(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  source_library_item_id TEXT,
  source_snapshot TEXT CHECK (
    source_snapshot IS NULL
    OR json_valid(source_snapshot)
  ),
  category_node_id TEXT,
  supplier_id TEXT,
  material TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  supplier TEXT NOT NULL DEFAULT '',
  unit TEXT NOT NULL DEFAULT 'unit',
  quantity REAL NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  unit_cost REAL NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
  misc_cost REAL NOT NULL DEFAULT 0 CHECK (misc_cost >= 0),
  contingency_percentage REAL NOT NULL DEFAULT 0 CHECK (
    contingency_percentage >= 0
    AND contingency_percentage <= 100
  ),
  adjustment_percentage REAL NOT NULL DEFAULT 0 CHECK (
    adjustment_percentage >= -100
    AND adjustment_percentage <= 100
  ),
  discipline TEXT NOT NULL DEFAULT '',
  designation TEXT NOT NULL DEFAULT '',
  link_state TEXT NOT NULL DEFAULT 'unlinked' CHECK (
    link_state IN ('unlinked', 'linked-clean', 'linked-overridden', 'detached', 'source-changed')
  ),
  metadata TEXT NOT NULL DEFAULT '{}' CHECK (
    json_valid(metadata)
    AND json_type(metadata) = 'object'
  ),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (template_id, template_node_id)
    REFERENCES estimate_template_nodes(template_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_estimate_templates_workspace_sort
  ON estimate_templates(workspace_id, sort_order, name);

CREATE INDEX IF NOT EXISTS idx_estimate_template_nodes_template_parent_sort
  ON estimate_template_nodes(template_id, parent_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_estimate_template_row_items_template_node_sort
  ON estimate_template_row_items(template_id, template_node_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_estimate_template_row_items_source_library_item
  ON estimate_template_row_items(source_library_item_id)
  WHERE source_library_item_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_estimate_template_row_items_category_node
  ON estimate_template_row_items(category_node_id)
  WHERE category_node_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_estimate_template_row_items_supplier
  ON estimate_template_row_items(supplier_id)
  WHERE supplier_id IS NOT NULL;
