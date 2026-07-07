-- Remove the preloaded component-library taxonomy from D1.
-- Existing components, estimate rows, and templates keep their plain text
-- category labels, but no longer point at seeded global taxonomy nodes.

UPDATE library_folders
SET source_category_node_id = NULL,
    updated_at = CURRENT_TIMESTAMP
WHERE source_category_node_id IS NOT NULL;

UPDATE cost_library_items
SET category_node_id = NULL,
    updated_at = CURRENT_TIMESTAMP
WHERE category_node_id IS NOT NULL;

UPDATE estimate_row_items
SET category_node_id = NULL
WHERE category_node_id IS NOT NULL;

UPDATE estimate_template_row_items
SET category_node_id = NULL
WHERE category_node_id IS NOT NULL;

DELETE FROM component_category_nodes;
