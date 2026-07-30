-- Canonical workspace brand/supplier governance and typed estimate-row brand identity.
-- Historical version/publication snapshots are intentionally not rewritten.

ALTER TABLE component_brands
  ADD COLUMN lifecycle_state TEXT NOT NULL DEFAULT 'active'
  CHECK (lifecycle_state IN ('active', 'archived', 'merged'));
ALTER TABLE component_brands
  ADD COLUMN revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0);
ALTER TABLE component_brands ADD COLUMN archived_at TEXT;
ALTER TABLE component_brands ADD COLUMN archived_by TEXT;
ALTER TABLE component_brands ADD COLUMN merged_into_id TEXT;
ALTER TABLE component_brands ADD COLUMN created_by TEXT;
ALTER TABLE component_brands ADD COLUMN updated_by TEXT;

ALTER TABLE component_suppliers
  ADD COLUMN lifecycle_state TEXT NOT NULL DEFAULT 'active'
  CHECK (lifecycle_state IN ('active', 'archived', 'merged'));
ALTER TABLE component_suppliers
  ADD COLUMN revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0);
ALTER TABLE component_suppliers ADD COLUMN archived_at TEXT;
ALTER TABLE component_suppliers ADD COLUMN archived_by TEXT;
ALTER TABLE component_suppliers ADD COLUMN merged_into_id TEXT;
ALTER TABLE component_suppliers ADD COLUMN created_by TEXT;
ALTER TABLE component_suppliers ADD COLUMN updated_by TEXT;

ALTER TABLE estimate_row_items ADD COLUMN brand_id TEXT;

-- MATERIAL_CATALOGUE_BACKFILL:START
DROP TABLE IF EXISTS _material_catalogue_candidates;
DROP TABLE IF EXISTS _material_catalogue_normalized_candidates;
DROP TABLE IF EXISTS _material_catalogue_groups;
DROP TABLE IF EXISTS _material_catalogue_redirects;
DROP TABLE IF EXISTS _material_catalogue_preflight;

CREATE TABLE _material_catalogue_candidates (
  candidate_key INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_kind TEXT NOT NULL CHECK (entity_kind IN ('brand', 'supplier')),
  workspace_id TEXT NOT NULL,
  source_table TEXT NOT NULL,
  source_id TEXT NOT NULL,
  source_field TEXT NOT NULL,
  existing_master_id TEXT,
  referenced_id TEXT,
  display_name TEXT NOT NULL,
  source_rank INTEGER NOT NULL
);

INSERT INTO _material_catalogue_candidates (
  entity_kind, workspace_id, source_table, source_id, source_field,
  existing_master_id, referenced_id, display_name, source_rank
)
SELECT 'brand', workspace_id, 'component_brands', id, 'brand', id, id, name, 10
FROM component_brands
WHERE lifecycle_state <> 'merged'
  AND length(trim(name, char(9) || char(10) || char(11) || char(12) || char(13) || ' ')) > 0
;

INSERT INTO _material_catalogue_candidates (
  entity_kind, workspace_id, source_table, source_id, source_field,
  existing_master_id, referenced_id, display_name, source_rank
)
SELECT 'supplier', workspace_id, 'component_suppliers', id, 'supplier', id, id, name, 10
FROM component_suppliers
WHERE lifecycle_state <> 'merged'
  AND length(trim(name, char(9) || char(10) || char(11) || char(12) || char(13) || ' ')) > 0
;

INSERT INTO _material_catalogue_candidates (
  entity_kind, workspace_id, source_table, source_id, source_field,
  existing_master_id, referenced_id, display_name, source_rank
)
SELECT 'brand', workspace_id, 'cost_library_items', id, 'brand', NULL, brand_id, brand, 20
FROM cost_library_items
WHERE brand IS NOT NULL
  AND length(trim(brand, char(9) || char(10) || char(11) || char(12) || char(13) || ' ')) > 0
;

INSERT INTO _material_catalogue_candidates (
  entity_kind, workspace_id, source_table, source_id, source_field,
  existing_master_id, referenced_id, display_name, source_rank
)
SELECT 'supplier', workspace_id, 'cost_library_items', id, 'supplier', NULL, supplier_id, supplier, 20
FROM cost_library_items
WHERE supplier IS NOT NULL
  AND length(trim(supplier, char(9) || char(10) || char(11) || char(12) || char(13) || ' ')) > 0
;

INSERT INTO _material_catalogue_candidates (
  entity_kind, workspace_id, source_table, source_id, source_field,
  existing_master_id, referenced_id, display_name, source_rank
)
SELECT
  'brand', project.workspace_id, 'estimate_row_items', row_item.id, 'brand', NULL,
  json_extract(row_item.source_snapshot_json, '$.brandId'),
  json_extract(row_item.source_snapshot_json, '$.brand'), 30
FROM estimate_row_items AS row_item
JOIN estimates AS estimate ON estimate.id = row_item.estimate_id
JOIN projects AS project ON project.id = estimate.project_id
WHERE json_valid(row_item.source_snapshot_json)
  AND json_type(row_item.source_snapshot_json) = 'object'
  AND typeof(json_extract(row_item.source_snapshot_json, '$.brand')) = 'text'
  AND length(trim(json_extract(row_item.source_snapshot_json, '$.brand'), char(9) || char(10) || char(11) || char(12) || char(13) || ' ')) > 0
;

INSERT INTO _material_catalogue_candidates (
  entity_kind, workspace_id, source_table, source_id, source_field,
  existing_master_id, referenced_id, display_name, source_rank
)
SELECT
  'supplier', project.workspace_id, 'estimate_row_items', row_item.id, 'supplier', NULL,
  row_item.supplier_id, row_item.supplier, 30
FROM estimate_row_items AS row_item
JOIN estimates AS estimate ON estimate.id = row_item.estimate_id
JOIN projects AS project ON project.id = estimate.project_id
WHERE length(trim(row_item.supplier, char(9) || char(10) || char(11) || char(12) || char(13) || ' ')) > 0
;

INSERT INTO _material_catalogue_candidates (
  entity_kind, workspace_id, source_table, source_id, source_field,
  existing_master_id, referenced_id, display_name, source_rank
)
SELECT
  'brand', template.workspace_id, 'estimate_template_row_items', row_item.id, 'brand', NULL,
  json_extract(row_item.source_snapshot, '$.brandId'),
  json_extract(row_item.source_snapshot, '$.brand'), 40
FROM estimate_template_row_items AS row_item
JOIN estimate_templates AS template ON template.id = row_item.template_id
WHERE row_item.source_snapshot IS NOT NULL
  AND json_valid(row_item.source_snapshot)
  AND json_type(row_item.source_snapshot) = 'object'
  AND typeof(json_extract(row_item.source_snapshot, '$.brand')) = 'text'
  AND length(trim(json_extract(row_item.source_snapshot, '$.brand'), char(9) || char(10) || char(11) || char(12) || char(13) || ' ')) > 0
;

INSERT INTO _material_catalogue_candidates (
  entity_kind, workspace_id, source_table, source_id, source_field,
  existing_master_id, referenced_id, display_name, source_rank
)
SELECT
  'supplier', template.workspace_id, 'estimate_template_row_items', row_item.id, 'supplier', NULL,
  row_item.supplier_id, row_item.supplier, 40
FROM estimate_template_row_items AS row_item
JOIN estimate_templates AS template ON template.id = row_item.template_id
WHERE length(trim(row_item.supplier, char(9) || char(10) || char(11) || char(12) || char(13) || ' ')) > 0
;

INSERT INTO _material_catalogue_candidates (
  entity_kind, workspace_id, source_table, source_id, source_field,
  existing_master_id, referenced_id, display_name, source_rank
)
SELECT
  'brand', workspace_id, 'cost_library_component_drafts', id, 'brand', NULL,
  json_extract(draft_json, '$.brandId'), json_extract(draft_json, '$.brand'), 50
FROM cost_library_component_drafts
WHERE status = 'active'
  AND json_valid(draft_json)
  AND json_type(draft_json) = 'object'
  AND typeof(json_extract(draft_json, '$.brand')) = 'text'
  AND length(trim(json_extract(draft_json, '$.brand'), char(9) || char(10) || char(11) || char(12) || char(13) || ' ')) > 0
;

INSERT INTO _material_catalogue_candidates (
  entity_kind, workspace_id, source_table, source_id, source_field,
  existing_master_id, referenced_id, display_name, source_rank
)
SELECT
  'supplier', workspace_id, 'cost_library_component_drafts', id, 'supplier', NULL,
  json_extract(draft_json, '$.supplierId'), json_extract(draft_json, '$.supplier'), 50
FROM cost_library_component_drafts
WHERE status = 'active'
  AND json_valid(draft_json)
  AND json_type(draft_json) = 'object'
  AND typeof(json_extract(draft_json, '$.supplier')) = 'text'
  AND length(trim(json_extract(draft_json, '$.supplier'), char(9) || char(10) || char(11) || char(12) || char(13) || ' ')) > 0;

CREATE TABLE _material_catalogue_normalized_candidates (
  candidate_key INTEGER PRIMARY KEY,
  entity_kind TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  source_table TEXT NOT NULL,
  source_id TEXT NOT NULL,
  source_field TEXT NOT NULL,
  existing_master_id TEXT,
  referenced_id TEXT,
  display_name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  source_rank INTEGER NOT NULL
);

WITH RECURSIVE normalized (
  candidate_key, entity_kind, workspace_id, source_table, source_id, source_field,
  existing_master_id, referenced_id, input_name, source_rank, position,
  display_output, normalized_output, pending_space
) AS (
  SELECT
    candidate_key, entity_kind, workspace_id, source_table, source_id, source_field,
    existing_master_id, referenced_id, display_name, source_rank, 1, '', '', 0
  FROM _material_catalogue_candidates
  UNION ALL
  SELECT
    candidate_key, entity_kind, workspace_id, source_table, source_id, source_field,
    existing_master_id, referenced_id, input_name, source_rank, position + 1,
    CASE
      WHEN unicode(substr(input_name, position, 1)) IN (9, 10, 11, 12, 13, 32)
        THEN display_output
      ELSE display_output
        || CASE WHEN pending_space = 1 AND length(display_output) > 0 THEN ' ' ELSE '' END
        || substr(input_name, position, 1)
    END,
    CASE
      WHEN unicode(substr(input_name, position, 1)) IN (9, 10, 11, 12, 13, 32)
        THEN normalized_output
      ELSE normalized_output
        || CASE WHEN pending_space = 1 AND length(normalized_output) > 0 THEN ' ' ELSE '' END
        || CASE
          WHEN unicode(substr(input_name, position, 1)) BETWEEN 65 AND 90
            THEN char(unicode(substr(input_name, position, 1)) + 32)
          ELSE substr(input_name, position, 1)
        END
    END,
    CASE
      WHEN unicode(substr(input_name, position, 1)) IN (9, 10, 11, 12, 13, 32)
        THEN CASE WHEN length(display_output) > 0 THEN 1 ELSE 0 END
      ELSE 0
    END
  FROM normalized
  WHERE position <= length(input_name)
)
INSERT INTO _material_catalogue_normalized_candidates (
  candidate_key, entity_kind, workspace_id, source_table, source_id, source_field,
  existing_master_id, referenced_id, display_name, normalized_name, source_rank
)
SELECT
  candidate_key, entity_kind, workspace_id, source_table, source_id, source_field,
  existing_master_id, referenced_id, display_output, normalized_output, source_rank
FROM normalized
WHERE position = length(input_name) + 1
  AND length(normalized_output) > 0;

CREATE TABLE _material_catalogue_groups (
  entity_kind TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  survivor_id TEXT NOT NULL,
  PRIMARY KEY (entity_kind, workspace_id, normalized_name),
  UNIQUE (entity_kind, survivor_id)
);

INSERT INTO _material_catalogue_groups (
  entity_kind, workspace_id, normalized_name, display_name, survivor_id
)
SELECT
  candidate.entity_kind,
  candidate.workspace_id,
  candidate.normalized_name,
  (
    SELECT preferred.display_name
    FROM _material_catalogue_normalized_candidates AS preferred
    WHERE preferred.entity_kind = candidate.entity_kind
      AND preferred.workspace_id = candidate.workspace_id
      AND preferred.normalized_name = candidate.normalized_name
    ORDER BY
      CASE WHEN preferred.existing_master_id IS NOT NULL THEN 0 ELSE 1 END,
      preferred.source_rank,
      preferred.existing_master_id,
      preferred.candidate_key
    LIMIT 1
  ),
  COALESCE(
    MIN(candidate.existing_master_id),
    (
      SELECT MIN(preferred.referenced_id)
      FROM _material_catalogue_normalized_candidates AS preferred
      WHERE preferred.entity_kind = candidate.entity_kind
        AND preferred.workspace_id = candidate.workspace_id
        AND preferred.normalized_name = candidate.normalized_name
        AND length(preferred.referenced_id) = 36
        AND substr(preferred.referenced_id, 9, 1) = '-'
        AND substr(preferred.referenced_id, 14, 1) = '-'
        AND substr(preferred.referenced_id, 19, 1) = '-'
        AND substr(preferred.referenced_id, 24, 1) = '-'
        AND NOT EXISTS (SELECT 1 FROM component_brands WHERE id = preferred.referenced_id)
        AND NOT EXISTS (SELECT 1 FROM component_suppliers WHERE id = preferred.referenced_id)
        AND 1 = (
          SELECT COUNT(DISTINCT other.workspace_id || char(31) || other.normalized_name)
          FROM _material_catalogue_normalized_candidates AS other
          WHERE other.entity_kind = preferred.entity_kind
            AND other.referenced_id = preferred.referenced_id
        )
    ),
    lower(
      hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-'
      || substr('89ab', (random() & 3) + 1, 1) || substr(hex(randomblob(2)), 2) || '-'
      || hex(randomblob(6))
    )
  )
FROM _material_catalogue_normalized_candidates AS candidate
GROUP BY candidate.entity_kind, candidate.workspace_id, candidate.normalized_name;

CREATE TABLE _material_catalogue_redirects (
  entity_kind TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  old_id TEXT NOT NULL,
  survivor_id TEXT NOT NULL,
  PRIMARY KEY (entity_kind, workspace_id, old_id)
);

INSERT INTO _material_catalogue_redirects (entity_kind, workspace_id, old_id, survivor_id)
SELECT DISTINCT
  candidate.entity_kind,
  candidate.workspace_id,
  candidate.existing_master_id,
  entity_group.survivor_id
FROM _material_catalogue_normalized_candidates AS candidate
JOIN _material_catalogue_groups AS entity_group
  ON entity_group.entity_kind = candidate.entity_kind
 AND entity_group.workspace_id = candidate.workspace_id
 AND entity_group.normalized_name = candidate.normalized_name
WHERE candidate.existing_master_id IS NOT NULL;

INSERT OR IGNORE INTO _material_catalogue_redirects (
  entity_kind, workspace_id, old_id, survivor_id
)
SELECT 'brand', workspace_id, id, merged_into_id
FROM component_brands
WHERE lifecycle_state = 'merged' AND merged_into_id IS NOT NULL
UNION ALL
SELECT 'supplier', workspace_id, id, merged_into_id
FROM component_suppliers
WHERE lifecycle_state = 'merged' AND merged_into_id IS NOT NULL;

UPDATE component_brands
SET
  normalized_name = 'merged:' || id,
  lifecycle_state = 'merged',
  revision = CASE
    WHEN lifecycle_state = 'merged'
      AND merged_into_id = (
        SELECT redirect.survivor_id
        FROM _material_catalogue_redirects AS redirect
        WHERE redirect.entity_kind = 'brand'
          AND redirect.workspace_id = component_brands.workspace_id
          AND redirect.old_id = component_brands.id
      ) THEN revision
    ELSE revision + 1
  END,
  archived_at = NULL,
  archived_by = NULL,
  merged_into_id = (
    SELECT redirect.survivor_id
    FROM _material_catalogue_redirects AS redirect
    WHERE redirect.entity_kind = 'brand'
      AND redirect.workspace_id = component_brands.workspace_id
      AND redirect.old_id = component_brands.id
  )
WHERE EXISTS (
  SELECT 1
  FROM _material_catalogue_redirects AS redirect
  WHERE redirect.entity_kind = 'brand'
    AND redirect.workspace_id = component_brands.workspace_id
    AND redirect.old_id = component_brands.id
    AND redirect.survivor_id <> component_brands.id
);

UPDATE component_suppliers
SET
  normalized_name = 'merged:' || id,
  lifecycle_state = 'merged',
  revision = CASE
    WHEN lifecycle_state = 'merged'
      AND merged_into_id = (
        SELECT redirect.survivor_id
        FROM _material_catalogue_redirects AS redirect
        WHERE redirect.entity_kind = 'supplier'
          AND redirect.workspace_id = component_suppliers.workspace_id
          AND redirect.old_id = component_suppliers.id
      ) THEN revision
    ELSE revision + 1
  END,
  archived_at = NULL,
  archived_by = NULL,
  merged_into_id = (
    SELECT redirect.survivor_id
    FROM _material_catalogue_redirects AS redirect
    WHERE redirect.entity_kind = 'supplier'
      AND redirect.workspace_id = component_suppliers.workspace_id
      AND redirect.old_id = component_suppliers.id
  )
WHERE EXISTS (
  SELECT 1
  FROM _material_catalogue_redirects AS redirect
  WHERE redirect.entity_kind = 'supplier'
    AND redirect.workspace_id = component_suppliers.workspace_id
    AND redirect.old_id = component_suppliers.id
    AND redirect.survivor_id <> component_suppliers.id
);

UPDATE component_brands
SET
  name = (
    SELECT entity_group.display_name FROM _material_catalogue_groups AS entity_group
    WHERE entity_group.entity_kind = 'brand'
      AND entity_group.workspace_id = component_brands.workspace_id
      AND entity_group.survivor_id = component_brands.id
  ),
  normalized_name = (
    SELECT entity_group.normalized_name FROM _material_catalogue_groups AS entity_group
    WHERE entity_group.entity_kind = 'brand'
      AND entity_group.workspace_id = component_brands.workspace_id
      AND entity_group.survivor_id = component_brands.id
  ),
  lifecycle_state = CASE WHEN lifecycle_state = 'merged' THEN 'active' ELSE lifecycle_state END,
  archived_at = CASE WHEN lifecycle_state = 'merged' THEN NULL ELSE archived_at END,
  archived_by = CASE WHEN lifecycle_state = 'merged' THEN NULL ELSE archived_by END,
  merged_into_id = CASE WHEN lifecycle_state = 'merged' THEN NULL ELSE merged_into_id END
WHERE EXISTS (
  SELECT 1 FROM _material_catalogue_groups AS entity_group
  WHERE entity_group.entity_kind = 'brand'
    AND entity_group.workspace_id = component_brands.workspace_id
    AND entity_group.survivor_id = component_brands.id
);

UPDATE component_suppliers
SET
  name = (
    SELECT entity_group.display_name FROM _material_catalogue_groups AS entity_group
    WHERE entity_group.entity_kind = 'supplier'
      AND entity_group.workspace_id = component_suppliers.workspace_id
      AND entity_group.survivor_id = component_suppliers.id
  ),
  normalized_name = (
    SELECT entity_group.normalized_name FROM _material_catalogue_groups AS entity_group
    WHERE entity_group.entity_kind = 'supplier'
      AND entity_group.workspace_id = component_suppliers.workspace_id
      AND entity_group.survivor_id = component_suppliers.id
  ),
  lifecycle_state = CASE WHEN lifecycle_state = 'merged' THEN 'active' ELSE lifecycle_state END,
  archived_at = CASE WHEN lifecycle_state = 'merged' THEN NULL ELSE archived_at END,
  archived_by = CASE WHEN lifecycle_state = 'merged' THEN NULL ELSE archived_by END,
  merged_into_id = CASE WHEN lifecycle_state = 'merged' THEN NULL ELSE merged_into_id END
WHERE EXISTS (
  SELECT 1 FROM _material_catalogue_groups AS entity_group
  WHERE entity_group.entity_kind = 'supplier'
    AND entity_group.workspace_id = component_suppliers.workspace_id
    AND entity_group.survivor_id = component_suppliers.id
);

INSERT OR IGNORE INTO component_brands (
  id, workspace_id, name, normalized_name, sort_order, metadata_json,
  created_at, updated_at, lifecycle_state, revision
)
SELECT
  survivor_id, workspace_id, display_name, normalized_name, 0, '{}',
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'active', 1
FROM _material_catalogue_groups
WHERE entity_kind = 'brand';

INSERT OR IGNORE INTO component_suppliers (
  id, workspace_id, name, normalized_name, sort_order, metadata_json,
  created_at, updated_at, lifecycle_state, revision
)
SELECT
  survivor_id, workspace_id, display_name, normalized_name, 0, '{}',
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'active', 1
FROM _material_catalogue_groups
WHERE entity_kind = 'supplier';

UPDATE cost_library_items
SET
  brand_id = COALESCE(
    (
      SELECT redirect.survivor_id FROM _material_catalogue_redirects AS redirect
      WHERE redirect.entity_kind = 'brand'
        AND redirect.workspace_id = cost_library_items.workspace_id
        AND redirect.old_id = cost_library_items.brand_id
    ),
    (
      SELECT entity_group.survivor_id
      FROM _material_catalogue_normalized_candidates AS candidate
      JOIN _material_catalogue_groups AS entity_group
        ON entity_group.entity_kind = candidate.entity_kind
       AND entity_group.workspace_id = candidate.workspace_id
       AND entity_group.normalized_name = candidate.normalized_name
      WHERE candidate.source_table = 'cost_library_items'
        AND candidate.source_id = cost_library_items.id
        AND candidate.source_field = 'brand'
      LIMIT 1
    )
  ),
  brand = COALESCE(
    (
      SELECT entity_group.display_name
      FROM _material_catalogue_normalized_candidates AS candidate
      JOIN _material_catalogue_groups AS entity_group
        ON entity_group.entity_kind = candidate.entity_kind
       AND entity_group.workspace_id = candidate.workspace_id
       AND entity_group.normalized_name = candidate.normalized_name
      WHERE candidate.source_table = 'cost_library_items'
        AND candidate.source_id = cost_library_items.id
        AND candidate.source_field = 'brand'
      LIMIT 1
    ),
    brand
  ),
  supplier_id = COALESCE(
    (
      SELECT redirect.survivor_id FROM _material_catalogue_redirects AS redirect
      WHERE redirect.entity_kind = 'supplier'
        AND redirect.workspace_id = cost_library_items.workspace_id
        AND redirect.old_id = cost_library_items.supplier_id
    ),
    (
      SELECT entity_group.survivor_id
      FROM _material_catalogue_normalized_candidates AS candidate
      JOIN _material_catalogue_groups AS entity_group
        ON entity_group.entity_kind = candidate.entity_kind
       AND entity_group.workspace_id = candidate.workspace_id
       AND entity_group.normalized_name = candidate.normalized_name
      WHERE candidate.source_table = 'cost_library_items'
        AND candidate.source_id = cost_library_items.id
        AND candidate.source_field = 'supplier'
      LIMIT 1
    )
  ),
  supplier = COALESCE(
    (
      SELECT entity_group.display_name
      FROM _material_catalogue_normalized_candidates AS candidate
      JOIN _material_catalogue_groups AS entity_group
        ON entity_group.entity_kind = candidate.entity_kind
       AND entity_group.workspace_id = candidate.workspace_id
       AND entity_group.normalized_name = candidate.normalized_name
      WHERE candidate.source_table = 'cost_library_items'
        AND candidate.source_id = cost_library_items.id
        AND candidate.source_field = 'supplier'
      LIMIT 1
    ),
    supplier
  );

UPDATE cost_library_item_price_options
SET supplier_id = (
  SELECT redirect.survivor_id
  FROM _material_catalogue_redirects AS redirect
  WHERE redirect.entity_kind = 'supplier'
    AND redirect.workspace_id = cost_library_item_price_options.workspace_id
    AND redirect.old_id = cost_library_item_price_options.supplier_id
)
WHERE supplier_id IS NOT NULL;

UPDATE estimate_row_items
SET
  brand_id = COALESCE(
    (
      SELECT redirect.survivor_id
      FROM _material_catalogue_redirects AS redirect
      JOIN estimates AS estimate ON estimate.id = estimate_row_items.estimate_id
      JOIN projects AS project ON project.id = estimate.project_id
      WHERE redirect.entity_kind = 'brand'
        AND redirect.workspace_id = project.workspace_id
        AND redirect.old_id = COALESCE(
          estimate_row_items.brand_id,
          json_extract(estimate_row_items.source_snapshot_json, '$.brandId')
        )
    ),
    (
      SELECT entity_group.survivor_id
      FROM _material_catalogue_normalized_candidates AS candidate
      JOIN _material_catalogue_groups AS entity_group
        ON entity_group.entity_kind = candidate.entity_kind
       AND entity_group.workspace_id = candidate.workspace_id
       AND entity_group.normalized_name = candidate.normalized_name
      WHERE candidate.source_table = 'estimate_row_items'
        AND candidate.source_id = estimate_row_items.id
        AND candidate.source_field = 'brand'
      LIMIT 1
    )
  ),
  supplier_id = COALESCE(
    (
      SELECT redirect.survivor_id
      FROM _material_catalogue_redirects AS redirect
      JOIN estimates AS estimate ON estimate.id = estimate_row_items.estimate_id
      JOIN projects AS project ON project.id = estimate.project_id
      WHERE redirect.entity_kind = 'supplier'
        AND redirect.workspace_id = project.workspace_id
        AND redirect.old_id = estimate_row_items.supplier_id
    ),
    (
      SELECT entity_group.survivor_id
      FROM _material_catalogue_normalized_candidates AS candidate
      JOIN _material_catalogue_groups AS entity_group
        ON entity_group.entity_kind = candidate.entity_kind
       AND entity_group.workspace_id = candidate.workspace_id
       AND entity_group.normalized_name = candidate.normalized_name
      WHERE candidate.source_table = 'estimate_row_items'
        AND candidate.source_id = estimate_row_items.id
        AND candidate.source_field = 'supplier'
      LIMIT 1
    )
  ),
  supplier = COALESCE(
    (
      SELECT entity_group.display_name
      FROM _material_catalogue_normalized_candidates AS candidate
      JOIN _material_catalogue_groups AS entity_group
        ON entity_group.entity_kind = candidate.entity_kind
       AND entity_group.workspace_id = candidate.workspace_id
       AND entity_group.normalized_name = candidate.normalized_name
      WHERE candidate.source_table = 'estimate_row_items'
        AND candidate.source_id = estimate_row_items.id
        AND candidate.source_field = 'supplier'
      LIMIT 1
    ),
    supplier
  );

UPDATE estimate_row_items
SET source_snapshot_json = CASE
  WHEN json_valid(source_snapshot_json) AND json_type(source_snapshot_json) = 'object' THEN
    json_set(
      source_snapshot_json,
      '$.brandId', brand_id,
      '$.brand', COALESCE((SELECT name FROM component_brands WHERE id = brand_id), json_extract(source_snapshot_json, '$.brand')),
      '$.supplierId', supplier_id,
      '$.supplier', COALESCE((SELECT name FROM component_suppliers WHERE id = supplier_id), supplier)
    )
  ELSE source_snapshot_json
END;

UPDATE estimate_template_row_items
SET
  supplier_id = COALESCE(
    (
      SELECT redirect.survivor_id
      FROM _material_catalogue_redirects AS redirect
      JOIN estimate_templates AS template ON template.id = estimate_template_row_items.template_id
      WHERE redirect.entity_kind = 'supplier'
        AND redirect.workspace_id = template.workspace_id
        AND redirect.old_id = estimate_template_row_items.supplier_id
    ),
    (
      SELECT entity_group.survivor_id
      FROM _material_catalogue_normalized_candidates AS candidate
      JOIN _material_catalogue_groups AS entity_group
        ON entity_group.entity_kind = candidate.entity_kind
       AND entity_group.workspace_id = candidate.workspace_id
       AND entity_group.normalized_name = candidate.normalized_name
      WHERE candidate.source_table = 'estimate_template_row_items'
        AND candidate.source_id = estimate_template_row_items.id
        AND candidate.source_field = 'supplier'
      LIMIT 1
    )
  ),
  supplier = COALESCE(
    (
      SELECT entity_group.display_name
      FROM _material_catalogue_normalized_candidates AS candidate
      JOIN _material_catalogue_groups AS entity_group
        ON entity_group.entity_kind = candidate.entity_kind
       AND entity_group.workspace_id = candidate.workspace_id
       AND entity_group.normalized_name = candidate.normalized_name
      WHERE candidate.source_table = 'estimate_template_row_items'
        AND candidate.source_id = estimate_template_row_items.id
        AND candidate.source_field = 'supplier'
      LIMIT 1
    ),
    supplier
  );

UPDATE estimate_template_row_items
SET source_snapshot = CASE
  WHEN source_snapshot IS NOT NULL
    AND json_valid(source_snapshot)
    AND json_type(source_snapshot) = 'object' THEN
    json_set(
      source_snapshot,
      '$.brandId', COALESCE(
        (
          SELECT redirect.survivor_id
          FROM _material_catalogue_redirects AS redirect
          JOIN estimate_templates AS template ON template.id = estimate_template_row_items.template_id
          WHERE redirect.entity_kind = 'brand'
            AND redirect.workspace_id = template.workspace_id
            AND redirect.old_id = json_extract(estimate_template_row_items.source_snapshot, '$.brandId')
        ),
        (
          SELECT entity_group.survivor_id
          FROM _material_catalogue_normalized_candidates AS candidate
          JOIN _material_catalogue_groups AS entity_group
            ON entity_group.entity_kind = candidate.entity_kind
           AND entity_group.workspace_id = candidate.workspace_id
           AND entity_group.normalized_name = candidate.normalized_name
          WHERE candidate.source_table = 'estimate_template_row_items'
            AND candidate.source_id = estimate_template_row_items.id
            AND candidate.source_field = 'brand'
          LIMIT 1
        )
      ),
      '$.brand', COALESCE(
        (
          SELECT entity_group.display_name
          FROM _material_catalogue_normalized_candidates AS candidate
          JOIN _material_catalogue_groups AS entity_group
            ON entity_group.entity_kind = candidate.entity_kind
           AND entity_group.workspace_id = candidate.workspace_id
           AND entity_group.normalized_name = candidate.normalized_name
          WHERE candidate.source_table = 'estimate_template_row_items'
            AND candidate.source_id = estimate_template_row_items.id
            AND candidate.source_field = 'brand'
          LIMIT 1
        ),
        json_extract(source_snapshot, '$.brand')
      ),
      '$.supplierId', supplier_id,
      '$.supplier', COALESCE((SELECT name FROM component_suppliers WHERE id = supplier_id), supplier)
    )
  ELSE source_snapshot
END;

UPDATE cost_library_component_drafts
SET draft_json = CASE
  WHEN status = 'active' AND json_valid(draft_json) AND json_type(draft_json) = 'object' THEN
    json_set(
      draft_json,
      '$.brandId', COALESCE(
        (
          SELECT redirect.survivor_id FROM _material_catalogue_redirects AS redirect
          WHERE redirect.entity_kind = 'brand'
            AND redirect.workspace_id = cost_library_component_drafts.workspace_id
            AND redirect.old_id = json_extract(cost_library_component_drafts.draft_json, '$.brandId')
        ),
        (
          SELECT entity_group.survivor_id
          FROM _material_catalogue_normalized_candidates AS candidate
          JOIN _material_catalogue_groups AS entity_group
            ON entity_group.entity_kind = candidate.entity_kind
           AND entity_group.workspace_id = candidate.workspace_id
           AND entity_group.normalized_name = candidate.normalized_name
          WHERE candidate.source_table = 'cost_library_component_drafts'
            AND candidate.source_id = cost_library_component_drafts.id
            AND candidate.source_field = 'brand'
          LIMIT 1
        )
      ),
      '$.brand', COALESCE(
        (
          SELECT entity_group.display_name
          FROM _material_catalogue_normalized_candidates AS candidate
          JOIN _material_catalogue_groups AS entity_group
            ON entity_group.entity_kind = candidate.entity_kind
           AND entity_group.workspace_id = candidate.workspace_id
           AND entity_group.normalized_name = candidate.normalized_name
          WHERE candidate.source_table = 'cost_library_component_drafts'
            AND candidate.source_id = cost_library_component_drafts.id
            AND candidate.source_field = 'brand'
          LIMIT 1
        ),
        json_extract(draft_json, '$.brand')
      ),
      '$.supplierId', COALESCE(
        (
          SELECT redirect.survivor_id FROM _material_catalogue_redirects AS redirect
          WHERE redirect.entity_kind = 'supplier'
            AND redirect.workspace_id = cost_library_component_drafts.workspace_id
            AND redirect.old_id = json_extract(cost_library_component_drafts.draft_json, '$.supplierId')
        ),
        (
          SELECT entity_group.survivor_id
          FROM _material_catalogue_normalized_candidates AS candidate
          JOIN _material_catalogue_groups AS entity_group
            ON entity_group.entity_kind = candidate.entity_kind
           AND entity_group.workspace_id = candidate.workspace_id
           AND entity_group.normalized_name = candidate.normalized_name
          WHERE candidate.source_table = 'cost_library_component_drafts'
            AND candidate.source_id = cost_library_component_drafts.id
            AND candidate.source_field = 'supplier'
          LIMIT 1
        )
      ),
      '$.supplier', COALESCE(
        (
          SELECT entity_group.display_name
          FROM _material_catalogue_normalized_candidates AS candidate
          JOIN _material_catalogue_groups AS entity_group
            ON entity_group.entity_kind = candidate.entity_kind
           AND entity_group.workspace_id = candidate.workspace_id
           AND entity_group.normalized_name = candidate.normalized_name
          WHERE candidate.source_table = 'cost_library_component_drafts'
            AND candidate.source_id = cost_library_component_drafts.id
            AND candidate.source_field = 'supplier'
          LIMIT 1
        ),
        json_extract(draft_json, '$.supplier')
      )
    )
  ELSE draft_json
END;

CREATE TABLE _material_catalogue_preflight (
  ok INTEGER NOT NULL CHECK (ok = 1)
);

INSERT INTO _material_catalogue_preflight (ok)
SELECT CASE WHEN
  NOT EXISTS (
    SELECT 1 FROM component_brands AS master
    WHERE master.lifecycle_state = 'merged'
      AND NOT EXISTS (
        SELECT 1 FROM component_brands AS survivor
        WHERE survivor.id = master.merged_into_id
          AND survivor.workspace_id = master.workspace_id
          AND survivor.lifecycle_state = 'active'
      )
  )
  AND NOT EXISTS (
    SELECT 1 FROM component_suppliers AS master
    WHERE master.lifecycle_state = 'merged'
      AND NOT EXISTS (
        SELECT 1 FROM component_suppliers AS survivor
        WHERE survivor.id = master.merged_into_id
          AND survivor.workspace_id = master.workspace_id
          AND survivor.lifecycle_state = 'active'
      )
  )
  AND NOT EXISTS (
    SELECT 1 FROM cost_library_items AS item
    LEFT JOIN component_brands AS brand
      ON brand.id = item.brand_id AND brand.workspace_id = item.workspace_id
    WHERE item.brand_id IS NOT NULL AND brand.id IS NULL
  )
  AND NOT EXISTS (
    SELECT 1 FROM cost_library_items AS item
    LEFT JOIN component_suppliers AS supplier
      ON supplier.id = item.supplier_id AND supplier.workspace_id = item.workspace_id
    WHERE item.supplier_id IS NOT NULL AND supplier.id IS NULL
  )
THEN 1 ELSE 0 END;

DROP TABLE _material_catalogue_preflight;
DROP TABLE _material_catalogue_redirects;
DROP TABLE _material_catalogue_groups;
DROP TABLE _material_catalogue_normalized_candidates;
DROP TABLE _material_catalogue_candidates;
-- MATERIAL_CATALOGUE_BACKFILL:END

CREATE INDEX IF NOT EXISTS idx_component_brands_workspace_lifecycle
  ON component_brands(workspace_id, lifecycle_state, sort_order, name, id);
CREATE INDEX IF NOT EXISTS idx_component_brands_merge_target
  ON component_brands(workspace_id, merged_into_id)
  WHERE merged_into_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_component_suppliers_workspace_lifecycle
  ON component_suppliers(workspace_id, lifecycle_state, sort_order, name, id);
CREATE INDEX IF NOT EXISTS idx_component_suppliers_merge_target
  ON component_suppliers(workspace_id, merged_into_id)
  WHERE merged_into_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_estimate_row_items_brand
  ON estimate_row_items(brand_id)
  WHERE brand_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cost_library_items_brand
  ON cost_library_items(brand_id)
  WHERE brand_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cost_library_items_supplier
  ON cost_library_items(supplier_id)
  WHERE supplier_id IS NOT NULL;

CREATE TRIGGER IF NOT EXISTS validate_component_brand_governance_insert
BEFORE INSERT ON component_brands
WHEN
  (NEW.lifecycle_state = 'active' AND (
    NEW.archived_at IS NOT NULL OR NEW.archived_by IS NOT NULL OR NEW.merged_into_id IS NOT NULL
  ))
  OR (NEW.lifecycle_state = 'archived' AND (
    NEW.archived_at IS NULL OR NEW.merged_into_id IS NOT NULL
  ))
  OR (NEW.lifecycle_state = 'merged' AND (
    NEW.archived_at IS NOT NULL OR NEW.archived_by IS NOT NULL
    OR NEW.merged_into_id IS NULL OR NEW.merged_into_id = NEW.id
    OR NEW.normalized_name <> 'merged:' || NEW.id
    OR NOT EXISTS (
      SELECT 1 FROM component_brands AS survivor
      WHERE survivor.id = NEW.merged_into_id
        AND survivor.workspace_id = NEW.workspace_id
        AND survivor.lifecycle_state = 'active'
    )
  ))
BEGIN
  SELECT RAISE(ABORT, 'catalogue merge target must be an active entity in the same workspace');
END;

CREATE TRIGGER IF NOT EXISTS validate_component_brand_governance_update
BEFORE UPDATE OF workspace_id, lifecycle_state, archived_at, archived_by, merged_into_id, normalized_name
ON component_brands
WHEN
  (NEW.lifecycle_state = 'active' AND (
    NEW.archived_at IS NOT NULL OR NEW.archived_by IS NOT NULL OR NEW.merged_into_id IS NOT NULL
  ))
  OR (NEW.lifecycle_state = 'archived' AND (
    NEW.archived_at IS NULL OR NEW.merged_into_id IS NOT NULL
  ))
  OR (NEW.lifecycle_state = 'merged' AND (
    NEW.archived_at IS NOT NULL OR NEW.archived_by IS NOT NULL
    OR NEW.merged_into_id IS NULL OR NEW.merged_into_id = NEW.id
    OR NEW.normalized_name <> 'merged:' || NEW.id
    OR NOT EXISTS (
      SELECT 1 FROM component_brands AS survivor
      WHERE survivor.id = NEW.merged_into_id
        AND survivor.workspace_id = NEW.workspace_id
        AND survivor.lifecycle_state = 'active'
    )
  ))
BEGIN
  SELECT RAISE(ABORT, 'catalogue merge target must be an active entity in the same workspace');
END;

CREATE TRIGGER IF NOT EXISTS validate_component_supplier_governance_insert
BEFORE INSERT ON component_suppliers
WHEN
  (NEW.lifecycle_state = 'active' AND (
    NEW.archived_at IS NOT NULL OR NEW.archived_by IS NOT NULL OR NEW.merged_into_id IS NOT NULL
  ))
  OR (NEW.lifecycle_state = 'archived' AND (
    NEW.archived_at IS NULL OR NEW.merged_into_id IS NOT NULL
  ))
  OR (NEW.lifecycle_state = 'merged' AND (
    NEW.archived_at IS NOT NULL OR NEW.archived_by IS NOT NULL
    OR NEW.merged_into_id IS NULL OR NEW.merged_into_id = NEW.id
    OR NEW.normalized_name <> 'merged:' || NEW.id
    OR NOT EXISTS (
      SELECT 1 FROM component_suppliers AS survivor
      WHERE survivor.id = NEW.merged_into_id
        AND survivor.workspace_id = NEW.workspace_id
        AND survivor.lifecycle_state = 'active'
    )
  ))
BEGIN
  SELECT RAISE(ABORT, 'catalogue merge target must be an active entity in the same workspace');
END;

CREATE TRIGGER IF NOT EXISTS validate_component_supplier_governance_update
BEFORE UPDATE OF workspace_id, lifecycle_state, archived_at, archived_by, merged_into_id, normalized_name
ON component_suppliers
WHEN
  (NEW.lifecycle_state = 'active' AND (
    NEW.archived_at IS NOT NULL OR NEW.archived_by IS NOT NULL OR NEW.merged_into_id IS NOT NULL
  ))
  OR (NEW.lifecycle_state = 'archived' AND (
    NEW.archived_at IS NULL OR NEW.merged_into_id IS NOT NULL
  ))
  OR (NEW.lifecycle_state = 'merged' AND (
    NEW.archived_at IS NOT NULL OR NEW.archived_by IS NOT NULL
    OR NEW.merged_into_id IS NULL OR NEW.merged_into_id = NEW.id
    OR NEW.normalized_name <> 'merged:' || NEW.id
    OR NOT EXISTS (
      SELECT 1 FROM component_suppliers AS survivor
      WHERE survivor.id = NEW.merged_into_id
        AND survivor.workspace_id = NEW.workspace_id
        AND survivor.lifecycle_state = 'active'
    )
  ))
BEGIN
  SELECT RAISE(ABORT, 'catalogue merge target must be an active entity in the same workspace');
END;

CREATE TRIGGER IF NOT EXISTS validate_cost_library_catalogue_identity_insert
BEFORE INSERT ON cost_library_items
WHEN
  (NEW.brand_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM component_brands
    WHERE id = NEW.brand_id AND workspace_id = NEW.workspace_id AND lifecycle_state <> 'merged'
  ))
  OR (NEW.supplier_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM component_suppliers
    WHERE id = NEW.supplier_id AND workspace_id = NEW.workspace_id AND lifecycle_state <> 'merged'
  ))
BEGIN
  SELECT RAISE(ABORT, 'component brand must belong to the component workspace');
END;

CREATE TRIGGER IF NOT EXISTS validate_cost_library_catalogue_identity_update
BEFORE UPDATE OF workspace_id, brand_id, supplier_id ON cost_library_items
WHEN
  (NEW.brand_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM component_brands
    WHERE id = NEW.brand_id AND workspace_id = NEW.workspace_id AND lifecycle_state <> 'merged'
  ))
  OR (NEW.supplier_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM component_suppliers
    WHERE id = NEW.supplier_id AND workspace_id = NEW.workspace_id AND lifecycle_state <> 'merged'
  ))
BEGIN
  SELECT RAISE(ABORT, 'component brand must belong to the component workspace');
END;

CREATE TRIGGER IF NOT EXISTS validate_estimate_row_brand_insert
BEFORE INSERT ON estimate_row_items
WHEN NEW.brand_id IS NOT NULL AND NOT EXISTS (
  SELECT 1
  FROM estimates AS estimate
  JOIN projects AS project ON project.id = estimate.project_id
  JOIN component_brands AS brand
    ON brand.id = NEW.brand_id
   AND brand.workspace_id = project.workspace_id
   AND brand.lifecycle_state <> 'merged'
  WHERE estimate.id = NEW.estimate_id
)
BEGIN
  SELECT RAISE(ABORT, 'estimate row brand must belong to the estimate workspace');
END;

CREATE TRIGGER IF NOT EXISTS validate_estimate_row_brand_update
BEFORE UPDATE OF estimate_id, brand_id ON estimate_row_items
WHEN NEW.brand_id IS NOT NULL AND NOT EXISTS (
  SELECT 1
  FROM estimates AS estimate
  JOIN projects AS project ON project.id = estimate.project_id
  JOIN component_brands AS brand
    ON brand.id = NEW.brand_id
   AND brand.workspace_id = project.workspace_id
   AND brand.lifecycle_state <> 'merged'
  WHERE estimate.id = NEW.estimate_id
)
BEGIN
  SELECT RAISE(ABORT, 'estimate row brand must belong to the estimate workspace');
END;

CREATE TRIGGER IF NOT EXISTS validate_estimate_row_supplier_insert
BEFORE INSERT ON estimate_row_items
WHEN NEW.supplier_id IS NOT NULL AND NOT EXISTS (
  SELECT 1
  FROM estimates AS estimate
  JOIN projects AS project ON project.id = estimate.project_id
  JOIN component_suppliers AS supplier
    ON supplier.id = NEW.supplier_id
   AND supplier.workspace_id = project.workspace_id
   AND supplier.lifecycle_state <> 'merged'
  WHERE estimate.id = NEW.estimate_id
)
BEGIN
  SELECT RAISE(ABORT, 'estimate row supplier must belong to the estimate workspace');
END;

CREATE TRIGGER IF NOT EXISTS validate_estimate_row_supplier_update
BEFORE UPDATE OF estimate_id, supplier_id ON estimate_row_items
WHEN NEW.supplier_id IS NOT NULL AND NOT EXISTS (
  SELECT 1
  FROM estimates AS estimate
  JOIN projects AS project ON project.id = estimate.project_id
  JOIN component_suppliers AS supplier
    ON supplier.id = NEW.supplier_id
   AND supplier.workspace_id = project.workspace_id
   AND supplier.lifecycle_state <> 'merged'
  WHERE estimate.id = NEW.estimate_id
)
BEGIN
  SELECT RAISE(ABORT, 'estimate row supplier must belong to the estimate workspace');
END;
