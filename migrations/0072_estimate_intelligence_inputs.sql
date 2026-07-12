ALTER TABLE projects ADD COLUMN project_type TEXT;
ALTER TABLE projects ADD COLUMN gross_floor_area REAL CHECK (
  gross_floor_area IS NULL OR gross_floor_area >= 0
);
ALTER TABLE projects ADD COLUMN floor_area_unit TEXT CHECK (
  floor_area_unit IS NULL OR floor_area_unit IN ('sqm', 'sqft')
);
ALTER TABLE projects ADD COLUMN project_phase TEXT;
ALTER TABLE projects ADD COLUMN market_region TEXT;
ALTER TABLE projects ADD COLUMN target_budget REAL CHECK (
  target_budget IS NULL OR target_budget >= 0
);
ALTER TABLE projects ADD COLUMN budget_basis_date TEXT;
ALTER TABLE projects ADD COLUMN procurement_status TEXT;

CREATE TABLE IF NOT EXISTS workspace_price_freshness_policies (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  category_node_id TEXT REFERENCES component_category_nodes(id) ON DELETE RESTRICT,
  stale_days INTEGER NOT NULL CHECK (stale_days > 0),
  very_stale_days INTEGER NOT NULL CHECK (very_stale_days > stale_days),
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
  updated_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_workspace_price_freshness_policies_default
  ON workspace_price_freshness_policies(workspace_id)
  WHERE category_node_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_workspace_price_freshness_policies_category
  ON workspace_price_freshness_policies(workspace_id, category_node_id)
  WHERE category_node_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_workspace_price_freshness_policies_workspace
  ON workspace_price_freshness_policies(workspace_id, updated_at DESC);

ALTER TABLE estimate_row_items ADD COLUMN pricing_provenance_origin TEXT CHECK (
  pricing_provenance_origin IS NULL
  OR pricing_provenance_origin IN (
    'recorded',
    'inherited_snapshot',
    'synthesized_fallback',
    'missing'
  )
);

ALTER TABLE estimate_template_row_items ADD COLUMN pricing_provenance_origin TEXT CHECK (
  pricing_provenance_origin IS NULL
  OR pricing_provenance_origin IN (
    'recorded',
    'inherited_snapshot',
    'synthesized_fallback',
    'missing'
  )
);

CREATE TABLE IF NOT EXISTS estimate_revision_facts (
  event_id TEXT NOT NULL REFERENCES estimate_sheet_events(id) ON DELETE CASCADE,
  ordinal INTEGER NOT NULL CHECK (ordinal >= 0),
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL,
  estimate_id TEXT NOT NULL,
  fact_kind TEXT NOT NULL CHECK (length(trim(fact_kind)) > 0),
  target_row_id TEXT,
  occurred_at TEXT NOT NULL,
  before_money_inputs TEXT CHECK (
    before_money_inputs IS NULL OR json_valid(before_money_inputs)
  ),
  after_money_inputs TEXT CHECK (
    after_money_inputs IS NULL OR json_valid(after_money_inputs)
  ),
  scope_reference TEXT CHECK (
    scope_reference IS NULL OR json_valid(scope_reference)
  ),
  estimate_node_id TEXT,
  estimate_tab_id TEXT,
  tombstone_reference TEXT CHECK (
    tombstone_reference IS NULL OR json_valid(tombstone_reference)
  ),
  completeness TEXT NOT NULL DEFAULT 'complete' CHECK (
    completeness IN ('complete', 'partial')
  ),
  schema_version INTEGER NOT NULL DEFAULT 1 CHECK (schema_version > 0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (event_id, ordinal),
  FOREIGN KEY (project_id, workspace_id)
    REFERENCES projects(id, workspace_id) ON DELETE CASCADE,
  FOREIGN KEY (estimate_id, project_id)
    REFERENCES estimates(id, project_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_estimate_revision_facts_estimate_occurred
  ON estimate_revision_facts(estimate_id, occurred_at DESC, event_id DESC, ordinal DESC);

CREATE INDEX IF NOT EXISTS idx_estimate_revision_facts_project_occurred
  ON estimate_revision_facts(project_id, occurred_at DESC, event_id DESC, ordinal DESC);

CREATE TRIGGER IF NOT EXISTS prevent_estimate_revision_fact_update
BEFORE UPDATE ON estimate_revision_facts
BEGIN
  SELECT RAISE(ABORT, 'estimate_revision_facts are append-only');
END;

CREATE TRIGGER IF NOT EXISTS prevent_estimate_revision_fact_delete
BEFORE DELETE ON estimate_revision_facts
BEGIN
  SELECT RAISE(ABORT, 'estimate_revision_facts are append-only');
END;
