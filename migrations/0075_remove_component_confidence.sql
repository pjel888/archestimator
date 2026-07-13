WITH RECURSIVE
confidence_paths AS (
  SELECT rows.id AS row_id, tree.fullkey AS path,
    row_number() OVER (PARTITION BY rows.id ORDER BY length(tree.fullkey) DESC, tree.fullkey DESC) AS ordinal
  FROM estimate_row_items AS rows, json_tree(rows.source_snapshot_json) AS tree
  WHERE tree.key = 'confidence'
),
cleaned(row_id, ordinal, snapshot) AS (
  SELECT rows.id, 0, rows.source_snapshot_json
  FROM estimate_row_items AS rows
  WHERE EXISTS (SELECT 1 FROM confidence_paths WHERE row_id = rows.id)
  UNION ALL
  SELECT cleaned.row_id, confidence_paths.ordinal,
    json_remove(cleaned.snapshot, confidence_paths.path)
  FROM cleaned
  JOIN confidence_paths
    ON confidence_paths.row_id = cleaned.row_id
   AND confidence_paths.ordinal = cleaned.ordinal + 1
)
UPDATE estimate_row_items
SET source_snapshot_json = (
  SELECT snapshot
  FROM cleaned
  WHERE cleaned.row_id = estimate_row_items.id
  ORDER BY ordinal DESC
  LIMIT 1
)
WHERE id IN (SELECT row_id FROM confidence_paths);

WITH RECURSIVE
confidence_paths AS (
  SELECT rows.id AS row_id, tree.fullkey AS path,
    row_number() OVER (PARTITION BY rows.id ORDER BY length(tree.fullkey) DESC, tree.fullkey DESC) AS ordinal
  FROM estimate_template_row_items AS rows, json_tree(rows.source_snapshot) AS tree
  WHERE rows.source_snapshot IS NOT NULL
    AND json_valid(rows.source_snapshot)
    AND tree.key = 'confidence'
),
cleaned(row_id, ordinal, snapshot) AS (
  SELECT rows.id, 0, rows.source_snapshot
  FROM estimate_template_row_items AS rows
  WHERE EXISTS (SELECT 1 FROM confidence_paths WHERE row_id = rows.id)
  UNION ALL
  SELECT cleaned.row_id, confidence_paths.ordinal,
    json_remove(cleaned.snapshot, confidence_paths.path)
  FROM cleaned
  JOIN confidence_paths
    ON confidence_paths.row_id = cleaned.row_id
   AND confidence_paths.ordinal = cleaned.ordinal + 1
)
UPDATE estimate_template_row_items
SET source_snapshot = (
  SELECT snapshot
  FROM cleaned
  WHERE cleaned.row_id = estimate_template_row_items.id
  ORDER BY ordinal DESC
  LIMIT 1
)
WHERE id IN (SELECT row_id FROM confidence_paths);

WITH RECURSIVE
confidence_paths AS (
  SELECT versions.id AS row_id, tree.fullkey AS path,
    row_number() OVER (PARTITION BY versions.id ORDER BY length(tree.fullkey) DESC, tree.fullkey DESC) AS ordinal
  FROM cost_library_item_versions AS versions, json_tree(versions.snapshot_json) AS tree
  WHERE tree.key = 'confidence'
),
cleaned(row_id, ordinal, snapshot) AS (
  SELECT versions.id, 0, versions.snapshot_json
  FROM cost_library_item_versions AS versions
  WHERE EXISTS (SELECT 1 FROM confidence_paths WHERE row_id = versions.id)
  UNION ALL
  SELECT cleaned.row_id, confidence_paths.ordinal,
    json_remove(cleaned.snapshot, confidence_paths.path)
  FROM cleaned
  JOIN confidence_paths
    ON confidence_paths.row_id = cleaned.row_id
   AND confidence_paths.ordinal = cleaned.ordinal + 1
)
UPDATE cost_library_item_versions
SET snapshot_json = (
  SELECT snapshot
  FROM cleaned
  WHERE cleaned.row_id = cost_library_item_versions.id
  ORDER BY ordinal DESC
  LIMIT 1
)
WHERE id IN (SELECT row_id FROM confidence_paths);

WITH RECURSIVE
confidence_paths AS (
  SELECT history.id AS row_id, tree.fullkey AS path,
    row_number() OVER (PARTITION BY history.id ORDER BY length(tree.fullkey) DESC, tree.fullkey DESC) AS ordinal
  FROM cost_library_item_price_history AS history, json_tree(history.old_snapshot) AS tree
  WHERE history.old_snapshot IS NOT NULL
    AND json_valid(history.old_snapshot)
    AND tree.key = 'confidence'
),
cleaned(row_id, ordinal, snapshot) AS (
  SELECT history.id, 0, history.old_snapshot
  FROM cost_library_item_price_history AS history
  WHERE EXISTS (SELECT 1 FROM confidence_paths WHERE row_id = history.id)
  UNION ALL
  SELECT cleaned.row_id, confidence_paths.ordinal,
    json_remove(cleaned.snapshot, confidence_paths.path)
  FROM cleaned
  JOIN confidence_paths
    ON confidence_paths.row_id = cleaned.row_id
   AND confidence_paths.ordinal = cleaned.ordinal + 1
)
UPDATE cost_library_item_price_history
SET old_snapshot = (
  SELECT snapshot
  FROM cleaned
  WHERE cleaned.row_id = cost_library_item_price_history.id
  ORDER BY ordinal DESC
  LIMIT 1
)
WHERE id IN (SELECT row_id FROM confidence_paths);

WITH RECURSIVE
confidence_paths AS (
  SELECT history.id AS row_id, tree.fullkey AS path,
    row_number() OVER (PARTITION BY history.id ORDER BY length(tree.fullkey) DESC, tree.fullkey DESC) AS ordinal
  FROM cost_library_item_price_history AS history, json_tree(history.new_snapshot) AS tree
  WHERE tree.key = 'confidence'
),
cleaned(row_id, ordinal, snapshot) AS (
  SELECT history.id, 0, history.new_snapshot
  FROM cost_library_item_price_history AS history
  WHERE EXISTS (SELECT 1 FROM confidence_paths WHERE row_id = history.id)
  UNION ALL
  SELECT cleaned.row_id, confidence_paths.ordinal,
    json_remove(cleaned.snapshot, confidence_paths.path)
  FROM cleaned
  JOIN confidence_paths
    ON confidence_paths.row_id = cleaned.row_id
   AND confidence_paths.ordinal = cleaned.ordinal + 1
)
UPDATE cost_library_item_price_history
SET new_snapshot = (
  SELECT snapshot
  FROM cleaned
  WHERE cleaned.row_id = cost_library_item_price_history.id
  ORDER BY ordinal DESC
  LIMIT 1
)
WHERE id IN (SELECT row_id FROM confidence_paths);

ALTER TABLE cost_library_items DROP COLUMN confidence;
ALTER TABLE cost_library_item_price_options DROP COLUMN confidence;
ALTER TABLE cost_library_item_variant_cost_entries DROP COLUMN confidence;
