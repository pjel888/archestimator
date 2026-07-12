CREATE TABLE estimate_row_items__0073 (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  estimate_id TEXT NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  node_id TEXT,
  description TEXT NOT NULL DEFAULT '',
  designation TEXT NOT NULL DEFAULT '',
  discipline TEXT NOT NULL DEFAULT '',
  material TEXT NOT NULL DEFAULT '',
  quantity REAL NOT NULL DEFAULT 0 CHECK (quantity >= 0 AND quantity = round(quantity, 6)),
  quantity_base REAL CHECK (quantity_base IS NULL OR (quantity_base >= 0 AND quantity_base = round(quantity_base, 6))),
  quantity_contingency_amount REAL CHECK (quantity_contingency_amount IS NULL OR quantity_contingency_amount >= 0),
  unit TEXT NOT NULL DEFAULT '',
  unit_cost REAL NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
  misc_cost REAL NOT NULL DEFAULT 0 CHECK (misc_cost >= 0),
  contingency_percentage REAL NOT NULL DEFAULT 0 CHECK (contingency_percentage >= 0 AND contingency_percentage <= 100),
  adjustment_percentage REAL NOT NULL DEFAULT 0 CHECK (adjustment_percentage >= -100 AND adjustment_percentage <= 100),
  source_snapshot_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(source_snapshot_json) AND json_type(source_snapshot_json) = 'object'),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  supplier_id TEXT,
  row_revision INTEGER NOT NULL DEFAULT 0 CHECK (row_revision >= 0),
  category_node_id TEXT,
  source_library_item_id TEXT,
  link_state TEXT NOT NULL DEFAULT 'unlinked' CHECK (link_state IN ('unlinked', 'linked-clean', 'linked-overridden', 'source-changed', 'detached')),
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json) AND json_type(metadata_json) = 'object'),
  supplier TEXT NOT NULL DEFAULT '',
  pricing_provenance_origin TEXT CHECK (pricing_provenance_origin IS NULL OR pricing_provenance_origin IN ('recorded', 'inherited_snapshot', 'synthesized_fallback', 'missing'))
);

INSERT INTO estimate_row_items__0073 (
  id, estimate_id, node_id, description, designation, discipline, material,
  quantity, quantity_base, quantity_contingency_amount, unit, unit_cost, misc_cost,
  contingency_percentage, adjustment_percentage, source_snapshot_json, sort_order,
  created_at, updated_at, supplier_id, row_revision, category_node_id,
  source_library_item_id, link_state, metadata_json, supplier, pricing_provenance_origin
)
SELECT
  id, estimate_id, node_id, description, designation, discipline, material,
  quantity, quantity_base, quantity_contingency_amount, unit, unit_cost, misc_cost,
  contingency_percentage, adjustment_percentage, source_snapshot_json, sort_order,
  created_at, updated_at, supplier_id, row_revision, category_node_id,
  source_library_item_id, link_state, metadata_json, supplier, pricing_provenance_origin
FROM estimate_row_items;

DROP TABLE estimate_row_items;
ALTER TABLE estimate_row_items__0073 RENAME TO estimate_row_items;

CREATE INDEX idx_estimate_row_items_estimate_sort ON estimate_row_items(estimate_id, sort_order, id);
CREATE INDEX idx_estimate_row_items_node ON estimate_row_items(node_id, id);
CREATE INDEX idx_estimate_row_items_source_library_item ON estimate_row_items(source_library_item_id) WHERE source_library_item_id IS NOT NULL;
