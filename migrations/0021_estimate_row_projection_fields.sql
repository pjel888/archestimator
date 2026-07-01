ALTER TABLE estimate_row_items ADD COLUMN supplier_id TEXT;
ALTER TABLE estimate_row_items ADD COLUMN row_revision INTEGER NOT NULL DEFAULT 0;
ALTER TABLE estimate_row_items ADD COLUMN category_node_id TEXT;
ALTER TABLE estimate_row_items ADD COLUMN source_library_item_id TEXT;
ALTER TABLE estimate_row_items ADD COLUMN link_state TEXT NOT NULL DEFAULT 'unlinked' CHECK (
  link_state IN ('unlinked', 'linked-clean', 'linked-overridden', 'source-changed', 'detached')
);
ALTER TABLE estimate_row_items ADD COLUMN metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (
  json_valid(metadata_json)
  AND json_type(metadata_json) = 'object'
);

CREATE INDEX IF NOT EXISTS idx_estimate_row_items_node
  ON estimate_row_items(node_id, id);

CREATE INDEX IF NOT EXISTS idx_estimate_row_items_source_library_item
  ON estimate_row_items(source_library_item_id)
  WHERE source_library_item_id IS NOT NULL;
