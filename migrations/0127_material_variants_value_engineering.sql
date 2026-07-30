-- Canonical explicit variant identity and value-engineering contribution scopes.

ALTER TABLE cost_library_item_price_options ADD COLUMN brand_id TEXT;
ALTER TABLE cost_library_item_price_options ADD COLUMN brand TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_cost_library_price_options_workspace_brand
  ON cost_library_item_price_options(workspace_id, brand_id)
  WHERE brand_id IS NOT NULL;

CREATE TRIGGER IF NOT EXISTS trg_cost_library_price_option_brand_scope_insert
BEFORE INSERT ON cost_library_item_price_options
WHEN NEW.brand_id IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM component_brands
  WHERE id = NEW.brand_id AND workspace_id = NEW.workspace_id
)
BEGIN
  SELECT RAISE(ABORT, 'price option brand must belong to the same workspace');
END;

CREATE TRIGGER IF NOT EXISTS trg_cost_library_price_option_brand_scope_update
BEFORE UPDATE OF workspace_id, brand_id ON cost_library_item_price_options
WHEN NEW.brand_id IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM component_brands
  WHERE id = NEW.brand_id AND workspace_id = NEW.workspace_id
)
BEGIN
  SELECT RAISE(ABORT, 'price option brand must belong to the same workspace');
END;

CREATE TABLE IF NOT EXISTS estimate_row_variant_selections (
  estimate_row_item_id TEXT PRIMARY KEY REFERENCES estimate_row_items(id) ON DELETE CASCADE,
  estimate_id TEXT NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  selected_price_option_id TEXT NOT NULL,
  selected_option_snapshot_json TEXT NOT NULL CHECK (
    json_valid(selected_option_snapshot_json)
    AND json_type(selected_option_snapshot_json) = 'object'
  ),
  selection_revision INTEGER NOT NULL DEFAULT 1 CHECK (selection_revision >= 1),
  selected_at TEXT NOT NULL,
  selected_by TEXT,
  UNIQUE (workspace_id, estimate_id, estimate_row_item_id)
);

CREATE INDEX IF NOT EXISTS idx_estimate_row_variant_selections_option
  ON estimate_row_variant_selections(workspace_id, selected_price_option_id);

CREATE TRIGGER IF NOT EXISTS trg_estimate_row_variant_selection_scope_insert
BEFORE INSERT ON estimate_row_variant_selections
WHEN NOT EXISTS (
  SELECT 1
  FROM estimate_row_items AS row_item
  JOIN estimates AS estimate ON estimate.id = row_item.estimate_id
  JOIN projects AS project ON project.id = estimate.project_id
  JOIN cost_library_item_price_options AS price_option
    ON price_option.id = NEW.selected_price_option_id
   AND price_option.workspace_id = project.workspace_id
   AND price_option.item_id = row_item.source_library_item_id
   AND price_option.is_active = 1
  WHERE row_item.id = NEW.estimate_row_item_id
    AND row_item.estimate_id = NEW.estimate_id
    AND project.workspace_id = NEW.workspace_id
)
AND NOT EXISTS (
  SELECT 1
  FROM estimate_row_items AS row_item, json_each(row_item.source_snapshot_json, '$.priceOptions') AS option
  JOIN estimates AS estimate ON estimate.id = row_item.estimate_id
  JOIN projects AS project ON project.id = estimate.project_id
  WHERE row_item.id = NEW.estimate_row_item_id
    AND row_item.estimate_id = NEW.estimate_id
    AND project.workspace_id = NEW.workspace_id
    AND row_item.source_library_item_id IS NULL
    AND json_extract(option.value, '$.id') = NEW.selected_price_option_id
    AND COALESCE(json_extract(option.value, '$.isActive'), 1) <> 0
)
BEGIN
  SELECT RAISE(ABORT, 'selected option must be active and belong to the linked row source');
END;

CREATE TRIGGER IF NOT EXISTS trg_estimate_row_variant_selection_scope_update
BEFORE UPDATE ON estimate_row_variant_selections
WHEN NOT EXISTS (
  SELECT 1
  FROM estimate_row_items AS row_item
  JOIN estimates AS estimate ON estimate.id = row_item.estimate_id
  JOIN projects AS project ON project.id = estimate.project_id
  JOIN cost_library_item_price_options AS price_option
    ON price_option.id = NEW.selected_price_option_id
   AND price_option.workspace_id = project.workspace_id
   AND price_option.item_id = row_item.source_library_item_id
   AND price_option.is_active = 1
  WHERE row_item.id = NEW.estimate_row_item_id
    AND row_item.estimate_id = NEW.estimate_id
    AND project.workspace_id = NEW.workspace_id
)
AND NOT EXISTS (
  SELECT 1
  FROM estimate_row_items AS row_item, json_each(row_item.source_snapshot_json, '$.priceOptions') AS option
  JOIN estimates AS estimate ON estimate.id = row_item.estimate_id
  JOIN projects AS project ON project.id = estimate.project_id
  WHERE row_item.id = NEW.estimate_row_item_id
    AND row_item.estimate_id = NEW.estimate_id
    AND project.workspace_id = NEW.workspace_id
    AND row_item.source_library_item_id IS NULL
    AND json_extract(option.value, '$.id') = NEW.selected_price_option_id
    AND COALESCE(json_extract(option.value, '$.isActive'), 1) <> 0
)
BEGIN
  SELECT RAISE(ABORT, 'selected option must be active and belong to the linked row source');
END;

INSERT OR IGNORE INTO estimate_row_variant_selections (
  estimate_row_item_id,
  estimate_id,
  workspace_id,
  selected_price_option_id,
  selected_option_snapshot_json,
  selection_revision,
  selected_at,
  selected_by
)
SELECT
  row_item.id,
  row_item.estimate_id,
  project.workspace_id,
  trim(COALESCE(
    json_extract(row_item.source_snapshot_json, '$.priceOptionId'),
    json_extract(row_item.metadata_json, '$.priceOptionId')
  )),
  row_item.source_snapshot_json,
  1,
  row_item.updated_at,
  NULL
FROM estimate_row_items AS row_item
JOIN estimates AS estimate ON estimate.id = row_item.estimate_id
JOIN projects AS project ON project.id = estimate.project_id
JOIN cost_library_item_price_options AS price_option
  ON price_option.id = trim(COALESCE(
    json_extract(row_item.source_snapshot_json, '$.priceOptionId'),
    json_extract(row_item.metadata_json, '$.priceOptionId')
  ))
 AND price_option.workspace_id = project.workspace_id
 AND price_option.item_id = row_item.source_library_item_id
 AND price_option.is_active = 1
WHERE row_item.source_library_item_id IS NOT NULL
  AND trim(COALESCE(
    json_extract(row_item.source_snapshot_json, '$.priceOptionId'),
    json_extract(row_item.metadata_json, '$.priceOptionId'),
    ''
  )) <> '';

INSERT OR IGNORE INTO estimate_row_variant_selections (
  estimate_row_item_id, estimate_id, workspace_id, selected_price_option_id,
  selected_option_snapshot_json, selection_revision, selected_at, selected_by
)
SELECT
  row_item.id, row_item.estimate_id, project.workspace_id,
  trim(json_extract(row_item.source_snapshot_json, '$.priceOptionId')),
  row_item.source_snapshot_json, 1, row_item.updated_at, NULL
FROM estimate_row_items AS row_item
JOIN estimates AS estimate ON estimate.id = row_item.estimate_id
JOIN projects AS project ON project.id = estimate.project_id
WHERE row_item.source_library_item_id IS NULL
  AND trim(COALESCE(json_extract(row_item.source_snapshot_json, '$.priceOptionId'), '')) <> ''
  AND EXISTS (
    SELECT 1 FROM json_each(row_item.source_snapshot_json, '$.priceOptions') AS option
    WHERE json_extract(option.value, '$.id') = json_extract(row_item.source_snapshot_json, '$.priceOptionId')
      AND COALESCE(json_extract(option.value, '$.isActive'), 1) <> 0
  );

CREATE TABLE IF NOT EXISTS estimate_template_row_variant_selections (
  template_row_item_id TEXT PRIMARY KEY REFERENCES estimate_template_row_items(id) ON DELETE CASCADE,
  template_id TEXT NOT NULL REFERENCES estimate_templates(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  selected_price_option_id TEXT NOT NULL,
  selected_option_snapshot_json TEXT NOT NULL CHECK (
    json_valid(selected_option_snapshot_json)
    AND json_type(selected_option_snapshot_json) = 'object'
  ),
  selection_revision INTEGER NOT NULL DEFAULT 1 CHECK (selection_revision >= 1),
  updated_at TEXT NOT NULL,
  UNIQUE (workspace_id, template_id, template_row_item_id)
);

INSERT OR IGNORE INTO estimate_template_row_variant_selections (
  template_row_item_id,
  template_id,
  workspace_id,
  selected_price_option_id,
  selected_option_snapshot_json,
  selection_revision,
  updated_at
)
SELECT
  row_item.id,
  row_item.template_id,
  template.workspace_id,
  trim(json_extract(row_item.source_snapshot, '$.priceOptionId')),
  row_item.source_snapshot,
  1,
  row_item.updated_at
FROM estimate_template_row_items AS row_item
JOIN estimate_templates AS template ON template.id = row_item.template_id
JOIN cost_library_item_price_options AS price_option
  ON price_option.id = trim(json_extract(row_item.source_snapshot, '$.priceOptionId'))
 AND price_option.workspace_id = template.workspace_id
 AND price_option.item_id = row_item.source_library_item_id
 AND price_option.is_active = 1
WHERE row_item.source_library_item_id IS NOT NULL
  AND json_valid(row_item.source_snapshot)
  AND trim(COALESCE(json_extract(row_item.source_snapshot, '$.priceOptionId'), '')) <> '';

CREATE TABLE IF NOT EXISTS estimate_contribution_scopes (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  estimate_id TEXT NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  estimate_tab_id TEXT NOT NULL REFERENCES estimate_tabs(id) ON DELETE CASCADE,
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision >= 1),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (workspace_id, project_id, estimate_id, estimate_tab_id)
);

CREATE TRIGGER IF NOT EXISTS trg_estimate_contribution_scope_insert
BEFORE INSERT ON estimate_contribution_scopes
WHEN NOT EXISTS (
  SELECT 1 FROM estimate_tabs AS tab
  JOIN estimates AS estimate ON estimate.id = tab.estimate_id
  JOIN projects AS project ON project.id = estimate.project_id
  WHERE tab.id = NEW.estimate_tab_id
    AND estimate.id = NEW.estimate_id
    AND project.id = NEW.project_id
    AND project.workspace_id = NEW.workspace_id
)
BEGIN
  SELECT RAISE(ABORT, 'contribution scope must belong to one workspace project estimate tab');
END;

CREATE TABLE IF NOT EXISTS estimate_alternative_groups (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  contribution_scope_id TEXT NOT NULL REFERENCES estimate_contribution_scopes(id) ON DELETE CASCADE,
  selected_row_item_id TEXT NOT NULL REFERENCES estimate_row_items(id) ON DELETE RESTRICT,
  name TEXT NOT NULL DEFAULT '' CHECK (length(name) <= 160),
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision >= 1),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (contribution_scope_id, id)
);

CREATE TABLE IF NOT EXISTS estimate_alternative_members (
  contribution_scope_id TEXT NOT NULL REFERENCES estimate_contribution_scopes(id) ON DELETE CASCADE,
  group_id TEXT NOT NULL REFERENCES estimate_alternative_groups(id) ON DELETE CASCADE,
  row_item_id TEXT NOT NULL REFERENCES estimate_row_items(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  PRIMARY KEY (group_id, row_item_id),
  UNIQUE (contribution_scope_id, row_item_id)
);

CREATE INDEX IF NOT EXISTS idx_estimate_alternative_members_scope_sort
  ON estimate_alternative_members(contribution_scope_id, group_id, sort_order, row_item_id);

CREATE TABLE IF NOT EXISTS estimate_optional_items (
  contribution_scope_id TEXT NOT NULL REFERENCES estimate_contribution_scopes(id) ON DELETE CASCADE,
  row_item_id TEXT NOT NULL REFERENCES estimate_row_items(id) ON DELETE CASCADE,
  is_included INTEGER NOT NULL DEFAULT 1 CHECK (is_included IN (0, 1)),
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision >= 1),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (contribution_scope_id, row_item_id)
);

CREATE TRIGGER IF NOT EXISTS trg_estimate_optional_not_alternative_insert
BEFORE INSERT ON estimate_optional_items
WHEN EXISTS (
  SELECT 1 FROM estimate_alternative_members
  WHERE contribution_scope_id = NEW.contribution_scope_id
    AND row_item_id = NEW.row_item_id
)
BEGIN
  SELECT RAISE(ABORT, 'a row cannot be both optional and an alternative member');
END;

CREATE TRIGGER IF NOT EXISTS trg_estimate_alternative_not_optional_insert
BEFORE INSERT ON estimate_alternative_members
WHEN EXISTS (
  SELECT 1 FROM estimate_optional_items
  WHERE contribution_scope_id = NEW.contribution_scope_id
    AND row_item_id = NEW.row_item_id
)
BEGIN
  SELECT RAISE(ABORT, 'a row cannot be both optional and an alternative member');
END;

CREATE TABLE IF NOT EXISTS estimate_template_alternative_groups (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  template_id TEXT NOT NULL REFERENCES estimate_templates(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  selected_template_row_item_id TEXT NOT NULL REFERENCES estimate_template_row_items(id) ON DELETE RESTRICT,
  name TEXT NOT NULL DEFAULT '' CHECK (length(name) <= 160),
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision >= 1),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (workspace_id, template_id, id)
);

CREATE TABLE IF NOT EXISTS estimate_template_alternative_members (
  group_id TEXT NOT NULL REFERENCES estimate_template_alternative_groups(id) ON DELETE CASCADE,
  template_row_item_id TEXT NOT NULL REFERENCES estimate_template_row_items(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  PRIMARY KEY (group_id, template_row_item_id),
  UNIQUE (template_row_item_id)
);

CREATE TABLE IF NOT EXISTS estimate_template_optional_items (
  template_id TEXT NOT NULL REFERENCES estimate_templates(id) ON DELETE CASCADE,
  template_row_item_id TEXT NOT NULL REFERENCES estimate_template_row_items(id) ON DELETE CASCADE,
  is_included INTEGER NOT NULL DEFAULT 1 CHECK (is_included IN (0, 1)),
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision >= 1),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (template_id, template_row_item_id),
  UNIQUE (template_row_item_id)
);
