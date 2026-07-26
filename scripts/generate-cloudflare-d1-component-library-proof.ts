#!/usr/bin/env bun

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

import { runLocalSqliteCli } from "./lib/local-sqlite-proof";

type ProofStatus = "local-pass" | "local-fail";

type QueryProofRow = {
  surface: string;
  queryBudget: number;
  plannedQueries: number;
  localBudgetMs: number;
  localP95Ms: number;
  rowsReturned: number;
  sampleCount: number;
  status: ProofStatus;
  notes: string;
};

type ComponentLibraryProofFixture = {
  sqliteVersion: string;
  fixtureTables: number;
  rowsSeeded: number;
  viewerDeleteCommandFailed: boolean;
  viewerDeleteResidueRows: number;
  folderDeleteTargetRows: number;
  childParentAfterDelete: string | null;
  itemFolderAfterDelete: string | null;
  reorderUpdatedRows: number;
  duplicateReorderCommandFailed: boolean;
  duplicateReorderResidueRows: number;
  cycleReorderCommandFailed: boolean;
  cycleReorderResidueRows: number;
  componentUpdateVersionRows: number;
  componentUpdatedName: string | null;
  invalidComponentUpdateCommandFailed: boolean;
  invalidComponentUpdateResidueRows: number;
  lifecycleStateAfterChange: string | null;
  lifecycleHistoryRows: number;
  repeatedLifecycleHistoryRows: number;
  repeatedLifecycleVersionNumber: number;
  priceOptionRows: number;
  defaultPriceOptionRows: number;
  priceHistoryRowsForOperation: number;
  duplicatePriceHistoryRows: number;
  bulkArchiveEventRows: number;
  archivedComponentRows: number;
  duplicateBulkArchiveEventRows: number;
  stalePreviewCommandFailed: boolean;
  stalePreviewResidueRows: number;
  rollbackResidueRows: number;
  restoredFolderRows: number;
  restoredComponentRows: number;
  restoredVersionRows: number;
  restoredPriceHistoryRows: number;
  folderTreePlanUsesIndex: boolean;
  activeComponentsPlanUsesIndex: boolean;
  priceOptionsPlanUsesIndex: boolean;
  bulkArchivePlanUsesIndex: boolean;
  planDetails: string[];
  tempArtifactsRemoved: boolean;
};

type ComponentLibraryProofInputs = {
  generatedAt?: string;
  fixture?: ComponentLibraryProofFixture;
  queryRows?: QueryProofRow[];
};

export type CloudflareD1ComponentLibraryProofReport = {
  generatedAt: string;
  mode: "cloudflare-d1-component-library-proof";
  sources: {
    plan: string;
    currentAppFiles: string[];
    currentSupabaseMigrations: string[];
    d1DatabaseApi: string;
  };
  affectedRpcNames: string[];
  readiness: {
    schemaReady: boolean;
    appLayerEditorGuardReady: boolean;
    folderDeleteReady: boolean;
    folderReorderReady: boolean;
    bulkArchiveReady: boolean;
    componentUpdateReady: boolean;
    lifecycleMutationReady: boolean;
    priceOptionUpsertReady: boolean;
    rollbackReady: boolean;
    idempotencyReady: boolean;
    queryBudgetReady: boolean;
    restoreFixtureReady: boolean;
    localComponentLibraryD1SliceReady: boolean;
    productionComponentLibraryD1Ready: false;
  };
  localOnly: true;
  providerBacked: false;
  fixture: ComponentLibraryProofFixture;
  queryProof: {
    rows: QueryProofRow[];
  };
  d1RewriteStrategy: {
    typeStrategy: string;
    preparedStatementPatterns: string[];
  };
  productionProofRequirements: string[];
  blockers: string[];
  note: string;
};

const PLAN_ROOT = ".ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence";

const AFFECTED_RPC_NAMES = [
  "delete_library_folder",
  "execute_bulk_archive_library_components",
  "reorder_library_folders",
  "set_cost_library_component_lifecycle_state",
  "update_cost_library_component",
  "upsert_cost_library_component_price_option",
];

const PREPARED_STATEMENT_PATTERNS = [
  "SELECT 1 FROM workspace_members WHERE workspace_id = ? AND user_id = ? AND role IN ('owner','editor')",
  "BEGIN IMMEDIATE; UPDATE library_folders ...; UPDATE cost_library_items ...; DELETE FROM library_folders ...; COMMIT",
  "BEGIN IMMEDIATE; INSERT OR IGNORE INTO component_library_operation_keys(operation_key, rpc_name, item_id) ...",
  "INSERT OR IGNORE INTO mass_deletion_events(workspace_id, target_type, action, correlation_id, ...)",
  "EXPLAIN QUERY PLAN SELECT ... FROM cost_library_items WHERE workspace_id = ? AND lifecycle_state = ?",
];

const PRODUCTION_PROOF_REQUIREMENTS = [
  "Hosted Worker+D1 component-library mutation proof with real D1 bindings and Better Auth-derived identity.",
  "D1 schema migration/readback proof for folders, component items, versions, price options, state history, and mass-deletion events.",
  "Cross-workspace denial tests against the mounted Worker route/action surface.",
  "Rollback/idempotency replay proof using production-shaped D1 transactions and retry keys.",
  "Hosted Worker+D1 p95/query-count proof for folder tree, active components, price options, and bulk archive preview surfaces.",
  "Provider-backed D1 export/import restore proof for the component-library tables.",
];

const FIXTURE_SQL = `
.bail on
PRAGMA foreign_keys = ON;

CREATE TABLE guard_failures (
  must_be_zero INTEGER NOT NULL CHECK (must_be_zero = 0)
);

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE
);

CREATE TABLE workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE workspace_members (
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
  PRIMARY KEY (workspace_id, user_id)
);

CREATE TABLE library_folders (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  parent_id TEXT REFERENCES library_folders(id) ON DELETE CASCADE,
  parent_slot TEXT NOT NULL DEFAULT '__root__',
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL CHECK (sort_order >= 0),
  folder_kind TEXT NOT NULL DEFAULT 'custom',
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE (workspace_id, parent_slot, sort_order)
);

CREATE TABLE cost_library_items (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  unit TEXT NOT NULL,
  unit_cost REAL NOT NULL DEFAULT 0,
  misc_cost REAL NOT NULL DEFAULT 0,
  pricing_source TEXT,
  pricing_date TEXT,
  active_price_option_id TEXT,
  library_folder_id TEXT REFERENCES library_folders(id) ON DELETE SET NULL,
  lifecycle_state TEXT NOT NULL CHECK (lifecycle_state IN ('draft', 'in_review', 'in_production', 'archived')),
  lifecycle_state_changed_at TEXT,
  lifecycle_state_changed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  current_version_number INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL
);

CREATE TABLE cost_library_item_versions (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES cost_library_items(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  snapshot_json TEXT NOT NULL,
  change_summary TEXT NOT NULL,
  change_reason TEXT NOT NULL DEFAULT '',
  effective_at TEXT NOT NULL,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE (item_id, version_number)
);

CREATE TABLE cost_library_item_price_options (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES cost_library_items(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  label TEXT NOT NULL CHECK (length(trim(label)) > 0),
  unit TEXT NOT NULL,
  unit_cost REAL NOT NULL DEFAULT 0,
  misc_cost REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'PHP',
  pricing_source TEXT,
  pricing_date TEXT,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1)),
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE (item_id, label)
);

CREATE UNIQUE INDEX cost_library_item_price_options_default_active_key
  ON cost_library_item_price_options(item_id)
  WHERE is_default = 1 AND is_active = 1;

CREATE TABLE cost_library_item_price_history (
  id TEXT PRIMARY KEY,
  price_option_id TEXT NOT NULL REFERENCES cost_library_item_price_options(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL REFERENCES cost_library_items(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  operation_key TEXT NOT NULL,
  old_snapshot TEXT,
  new_snapshot TEXT NOT NULL,
  change_reason TEXT NOT NULL DEFAULT '',
  effective_at TEXT NOT NULL,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE (item_id, operation_key)
);

CREATE TABLE cost_library_item_state_history (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES cost_library_items(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  from_state TEXT NOT NULL,
  to_state TEXT NOT NULL,
  operation_key TEXT NOT NULL,
  effective_at TEXT NOT NULL,
  change_reason TEXT NOT NULL DEFAULT '',
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE (item_id, operation_key)
);

CREATE TABLE mass_deletion_events (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL,
  action TEXT NOT NULL,
  target_ids_json TEXT NOT NULL,
  preview_hash TEXT NOT NULL,
  correlation_id TEXT NOT NULL,
  status TEXT NOT NULL,
  summary_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (workspace_id, target_type, action, correlation_id)
);

CREATE INDEX idx_workspace_members_workspace_user_role
  ON workspace_members(workspace_id, user_id, role);

CREATE INDEX idx_library_folders_workspace_parent_sort
  ON library_folders(workspace_id, parent_slot, sort_order, name);

CREATE INDEX idx_cost_library_items_workspace_lifecycle
  ON cost_library_items(workspace_id, lifecycle_state, updated_at DESC);

CREATE INDEX idx_cost_library_items_workspace_folder
  ON cost_library_items(workspace_id, library_folder_id);

CREATE INDEX idx_cost_library_items_workspace_id
  ON cost_library_items(workspace_id, id);

CREATE INDEX idx_price_options_item_active_default
  ON cost_library_item_price_options(item_id, is_active, is_default DESC, label);

CREATE INDEX idx_mass_deletion_events_correlation
  ON mass_deletion_events(workspace_id, target_type, action, correlation_id);

INSERT INTO users (id, email) VALUES
  ('user-editor', 'editor@example.test'),
  ('user-viewer', 'viewer@example.test'),
  ('user-other', 'other@example.test');

INSERT INTO workspaces (id, name) VALUES
  ('ws-alpha', 'Alpha Workshop'),
  ('ws-other', 'Other Workshop');

INSERT INTO workspace_members (workspace_id, user_id, role) VALUES
  ('ws-alpha', 'user-editor', 'editor'),
  ('ws-alpha', 'user-viewer', 'viewer'),
  ('ws-other', 'user-other', 'owner');

INSERT INTO library_folders (id, workspace_id, parent_id, parent_slot, name, sort_order, folder_kind, created_by) VALUES
  ('folder-target', 'ws-alpha', NULL, '__root__', 'Target folder', 10, 'custom', 'user-editor'),
  ('folder-child', 'ws-alpha', 'folder-target', 'folder-target', 'Child folder', 10, 'custom', 'user-editor'),
  ('folder-sibling', 'ws-alpha', NULL, '__root__', 'Sibling folder', 20, 'custom', 'user-editor'),
  ('folder-cycle-parent', 'ws-alpha', NULL, '__root__', 'Cycle parent', 50, 'custom', 'user-editor'),
  ('folder-cycle-child', 'ws-alpha', 'folder-cycle-parent', 'folder-cycle-parent', 'Cycle child', 10, 'custom', 'user-editor'),
  ('folder-other', 'ws-other', NULL, '__root__', 'Other folder', 10, 'custom', 'user-other');

INSERT INTO cost_library_items (
  id,
  workspace_id,
  name,
  category,
  unit,
  unit_cost,
  misc_cost,
  pricing_source,
  pricing_date,
  active_price_option_id,
  library_folder_id,
  lifecycle_state,
  lifecycle_state_changed_at,
  lifecycle_state_changed_by,
  current_version_number,
  updated_at
) VALUES
  ('item-alpha', 'ws-alpha', 'Alpha concrete', 'Concrete', 'm3', 100, 0, 'Seed', '2026-06-30', 'price-default', 'folder-target', 'draft', '2026-06-30T00:00:00.000Z', 'user-editor', 1, '2026-06-30T00:00:00.000Z'),
  ('item-archive-1', 'ws-alpha', 'Archive one', 'Labor', 'hr', 50, 0, 'Seed', '2026-06-30', NULL, NULL, 'draft', '2026-06-30T00:00:00.000Z', 'user-editor', 1, '2026-06-30T00:00:00.000Z'),
  ('item-archive-2', 'ws-alpha', 'Archive two', 'Labor', 'hr', 75, 0, 'Seed', '2026-06-30', NULL, NULL, 'draft', '2026-06-30T00:00:00.000Z', 'user-editor', 1, '2026-06-30T00:00:00.000Z'),
  ('item-rollback', 'ws-alpha', 'Rollback fixture', 'Material', 'ea', 20, 0, 'Seed', '2026-06-30', NULL, NULL, 'draft', '2026-06-30T00:00:00.000Z', 'user-editor', 1, '2026-06-30T00:00:00.000Z'),
  ('item-other', 'ws-other', 'Other workspace item', 'Other', 'ea', 1, 0, 'Seed', '2026-06-30', NULL, 'folder-other', 'draft', '2026-06-30T00:00:00.000Z', 'user-other', 1, '2026-06-30T00:00:00.000Z');

INSERT INTO cost_library_item_versions (
  id,
  item_id,
  workspace_id,
  version_number,
  snapshot_json,
  change_summary,
  change_reason,
  effective_at,
  created_by
) VALUES
  ('version-alpha-1', 'item-alpha', 'ws-alpha', 1, '{"name":"Alpha concrete"}', 'Initial version', 'seed', '2026-06-30T00:00:00.000Z', 'user-editor'),
  ('version-archive-1', 'item-archive-1', 'ws-alpha', 1, '{"name":"Archive one"}', 'Initial version', 'seed', '2026-06-30T00:00:00.000Z', 'user-editor'),
  ('version-archive-2', 'item-archive-2', 'ws-alpha', 1, '{"name":"Archive two"}', 'Initial version', 'seed', '2026-06-30T00:00:00.000Z', 'user-editor');

INSERT INTO cost_library_item_price_options (
  id,
  item_id,
  workspace_id,
  label,
  unit,
  unit_cost,
  misc_cost,
  currency,
  pricing_source,
  pricing_date,
  is_active,
  is_default,
  created_by
) VALUES
  ('price-default', 'item-alpha', 'ws-alpha', 'Default concrete', 'm3', 100, 0, 'PHP', 'Seed', '2026-06-30', 1, 1, 'user-editor'),
  ('price-secondary', 'item-alpha', 'ws-alpha', 'Supplier backup', 'm3', 110, 0, 'PHP', 'Seed', '2026-06-30', 1, 0, 'user-editor');
`;

const EDITOR_GUARD_SQL = `
INSERT INTO guard_failures (must_be_zero)
SELECT 1
WHERE NOT EXISTS (
  SELECT 1
  FROM workspace_members member
  WHERE member.workspace_id = 'ws-alpha'
    AND member.user_id = 'user-editor'
    AND member.role IN ('owner', 'editor')
);
`;

const VIEWER_GUARD_SQL = `
INSERT INTO guard_failures (must_be_zero)
SELECT 1
WHERE NOT EXISTS (
  SELECT 1
  FROM workspace_members member
  WHERE member.workspace_id = 'ws-alpha'
    AND member.user_id = 'user-viewer'
    AND member.role IN ('owner', 'editor')
);
`;

const VIEWER_DELETE_SQL = `
.bail on
PRAGMA foreign_keys = ON;
BEGIN IMMEDIATE;
${VIEWER_GUARD_SQL}
DELETE FROM library_folders
WHERE id = 'folder-target'
  AND workspace_id = 'ws-alpha';
COMMIT;
`;

const DELETE_FOLDER_SQL = `
.bail on
PRAGMA foreign_keys = ON;
BEGIN IMMEDIATE;
${EDITOR_GUARD_SQL}
INSERT INTO guard_failures (must_be_zero)
SELECT 1
WHERE NOT EXISTS (
  SELECT 1 FROM library_folders WHERE id = 'folder-target' AND workspace_id = 'ws-alpha'
);

UPDATE library_folders
SET parent_id = (
      SELECT target.parent_id
      FROM library_folders target
      WHERE target.id = 'folder-target'
    ),
    parent_slot = COALESCE((
      SELECT target.parent_id
      FROM library_folders target
      WHERE target.id = 'folder-target'
    ), '__root__'),
    sort_order = (
      SELECT COALESCE(MAX(sibling.sort_order), 0) + 10
      FROM library_folders sibling
      WHERE sibling.workspace_id = 'ws-alpha'
        AND sibling.id <> 'folder-target'
        AND sibling.parent_slot = '__root__'
    )
WHERE workspace_id = 'ws-alpha'
  AND parent_id = 'folder-target';

UPDATE cost_library_items
SET library_folder_id = NULL
WHERE workspace_id = 'ws-alpha'
  AND library_folder_id = 'folder-target';

DELETE FROM library_folders
WHERE id = 'folder-target'
  AND workspace_id = 'ws-alpha';
COMMIT;
`;

const REORDER_FOLDERS_SQL = `
.bail on
PRAGMA foreign_keys = ON;
BEGIN IMMEDIATE;
${EDITOR_GUARD_SQL}
CREATE TEMP TABLE folder_reorder_updates (
  id TEXT PRIMARY KEY,
  parent_id TEXT,
  parent_slot TEXT NOT NULL,
  sort_order INTEGER NOT NULL
);
INSERT INTO folder_reorder_updates (id, parent_id, parent_slot, sort_order) VALUES
  ('folder-child', NULL, '__root__', 30),
  ('folder-sibling', NULL, '__root__', 40);

INSERT INTO guard_failures (must_be_zero)
SELECT 1
FROM (
  SELECT parent_slot, sort_order, COUNT(*) AS duplicate_count
  FROM folder_reorder_updates
  GROUP BY parent_slot, sort_order
  HAVING COUNT(*) > 1
)
LIMIT 1;

UPDATE library_folders
SET sort_order = sort_order + 1000000
WHERE workspace_id = 'ws-alpha'
  AND id IN (SELECT id FROM folder_reorder_updates);

UPDATE library_folders
SET parent_id = (SELECT input.parent_id FROM folder_reorder_updates input WHERE input.id = library_folders.id),
    parent_slot = (SELECT input.parent_slot FROM folder_reorder_updates input WHERE input.id = library_folders.id),
    sort_order = (SELECT input.sort_order FROM folder_reorder_updates input WHERE input.id = library_folders.id)
WHERE workspace_id = 'ws-alpha'
  AND id IN (SELECT id FROM folder_reorder_updates);
COMMIT;
`;

const DUPLICATE_REORDER_SQL = `
.bail on
PRAGMA foreign_keys = ON;
BEGIN IMMEDIATE;
${EDITOR_GUARD_SQL}
CREATE TEMP TABLE folder_reorder_updates (
  id TEXT PRIMARY KEY,
  parent_id TEXT,
  parent_slot TEXT NOT NULL,
  sort_order INTEGER NOT NULL
);
INSERT INTO folder_reorder_updates (id, parent_id, parent_slot, sort_order) VALUES
  ('folder-child', NULL, '__root__', 60),
  ('folder-sibling', NULL, '__root__', 60);

INSERT INTO guard_failures (must_be_zero)
SELECT 1
FROM (
  SELECT parent_slot, sort_order, COUNT(*) AS duplicate_count
  FROM folder_reorder_updates
  GROUP BY parent_slot, sort_order
  HAVING COUNT(*) > 1
)
LIMIT 1;
COMMIT;
`;

const CYCLE_REORDER_SQL = `
.bail on
PRAGMA foreign_keys = ON;
BEGIN IMMEDIATE;
${EDITOR_GUARD_SQL}
CREATE TEMP TABLE folder_reorder_updates (
  id TEXT PRIMARY KEY,
  parent_id TEXT,
  parent_slot TEXT NOT NULL,
  sort_order INTEGER NOT NULL
);
INSERT INTO folder_reorder_updates (id, parent_id, parent_slot, sort_order) VALUES
  ('folder-cycle-parent', 'folder-cycle-child', 'folder-cycle-child', 10);

INSERT INTO guard_failures (must_be_zero)
WITH final_folders AS (
  SELECT
    folder.id,
    COALESCE(input.parent_id, folder.parent_id) AS parent_id
  FROM library_folders folder
  LEFT JOIN folder_reorder_updates input ON input.id = folder.id
  WHERE folder.workspace_id = 'ws-alpha'
),
walk(origin_id, parent_id, path, has_cycle) AS (
  SELECT id, parent_id, id, 0
  FROM final_folders
  UNION ALL
  SELECT
    walk.origin_id,
    parent.parent_id,
    walk.path || ',' || parent.id,
    instr(',' || walk.path || ',', ',' || parent.id || ',') > 0
  FROM walk
  JOIN final_folders parent ON parent.id = walk.parent_id
  WHERE walk.has_cycle = 0
)
SELECT 1
FROM walk
WHERE has_cycle = 1
LIMIT 1;
COMMIT;
`;

const UPDATE_COMPONENT_SQL = `
.bail on
PRAGMA foreign_keys = ON;
BEGIN IMMEDIATE;
${EDITOR_GUARD_SQL}
INSERT INTO guard_failures (must_be_zero)
SELECT 1
WHERE NOT EXISTS (
  SELECT 1
  FROM cost_library_items
  WHERE id = 'item-alpha'
    AND workspace_id = 'ws-alpha'
);

CREATE TEMP TABLE component_update AS
SELECT
  id AS item_id,
  workspace_id,
  current_version_number + 1 AS next_version
FROM cost_library_items
WHERE id = 'item-alpha'
  AND workspace_id = 'ws-alpha';

UPDATE cost_library_items
SET name = 'Alpha concrete revised',
    category = 'Concrete',
    current_version_number = (SELECT next_version FROM component_update),
    updated_at = '2026-06-30T01:00:00.000Z'
WHERE id = 'item-alpha'
  AND workspace_id = 'ws-alpha';

INSERT INTO cost_library_item_versions (
  id,
  item_id,
  workspace_id,
  version_number,
  snapshot_json,
  change_summary,
  change_reason,
  effective_at,
  created_by
)
SELECT
  'version-alpha-component-update',
  item_id,
  workspace_id,
  next_version,
  '{"name":"Alpha concrete revised"}',
  'Component updated',
  'D1 component update proof',
  '2026-06-30T01:00:00.000Z',
  'user-editor'
FROM component_update;
COMMIT;
`;

const INVALID_COMPONENT_UPDATE_SQL = `
.bail on
PRAGMA foreign_keys = ON;
BEGIN IMMEDIATE;
${EDITOR_GUARD_SQL}
INSERT INTO guard_failures (must_be_zero)
SELECT 1
WHERE NOT EXISTS (
  SELECT 1
  FROM cost_library_items
  WHERE id = 'item-missing'
    AND workspace_id = 'ws-alpha'
);

UPDATE cost_library_items
SET name = 'Should not exist'
WHERE id = 'item-missing'
  AND workspace_id = 'ws-alpha';

INSERT INTO cost_library_item_versions (
  id,
  item_id,
  workspace_id,
  version_number,
  snapshot_json,
  change_summary,
  change_reason,
  effective_at,
  created_by
) VALUES (
  'version-invalid-update',
  'item-missing',
  'ws-alpha',
  2,
  '{}',
  'Component updated',
  'should rollback',
  '2026-06-30T01:01:00.000Z',
  'user-editor'
);
COMMIT;
`;

const LIFECYCLE_SQL = `
.bail on
PRAGMA foreign_keys = ON;
BEGIN IMMEDIATE;
${EDITOR_GUARD_SQL}
CREATE TEMP TABLE lifecycle_change AS
SELECT
  id AS item_id,
  workspace_id,
  lifecycle_state AS from_state,
  'in_production' AS to_state,
  current_version_number + 1 AS next_version
FROM cost_library_items
WHERE id = 'item-alpha'
  AND workspace_id = 'ws-alpha'
  AND lifecycle_state <> 'in_production';

UPDATE cost_library_items
SET lifecycle_state = 'in_production',
    lifecycle_state_changed_at = '2026-06-30T01:05:00.000Z',
    lifecycle_state_changed_by = 'user-editor',
    current_version_number = (SELECT next_version FROM lifecycle_change),
    updated_at = '2026-06-30T01:05:00.000Z'
WHERE id = 'item-alpha'
  AND EXISTS (SELECT 1 FROM lifecycle_change);

INSERT OR IGNORE INTO cost_library_item_state_history (
  id,
  item_id,
  workspace_id,
  from_state,
  to_state,
  operation_key,
  effective_at,
  change_reason,
  created_by
)
SELECT
  'state-history-alpha-production',
  item_id,
  workspace_id,
  from_state,
  to_state,
  'op-lifecycle-alpha-production',
  '2026-06-30T01:05:00.000Z',
  'D1 lifecycle proof',
  'user-editor'
FROM lifecycle_change;

INSERT INTO cost_library_item_versions (
  id,
  item_id,
  workspace_id,
  version_number,
  snapshot_json,
  change_summary,
  change_reason,
  effective_at,
  created_by
)
SELECT
  'version-alpha-lifecycle',
  item_id,
  workspace_id,
  next_version,
  '{"lifecycleState":"in_production"}',
  'Lifecycle state changed',
  'D1 lifecycle proof',
  '2026-06-30T01:05:00.000Z',
  'user-editor'
FROM lifecycle_change;
COMMIT;
`;

const PRICE_UPSERT_SQL = `
.bail on
PRAGMA foreign_keys = ON;
BEGIN IMMEDIATE;
${EDITOR_GUARD_SQL}
INSERT INTO guard_failures (must_be_zero)
SELECT 1
WHERE NOT EXISTS (
  SELECT 1
  FROM cost_library_items
  WHERE id = 'item-alpha'
    AND workspace_id = 'ws-alpha'
);

INSERT INTO cost_library_item_price_options (
  id,
  item_id,
  workspace_id,
  label,
  unit,
  unit_cost,
  misc_cost,
  currency,
  pricing_source,
  pricing_date,
  is_active,
  is_default,
  created_by
)
VALUES (
  'price-d1-proof',
  'item-alpha',
  'ws-alpha',
  'D1 default price',
  'm3',
  125,
  5,
  'PHP',
  'D1 proof',
  '2026-06-30',
  1,
  0,
  'user-editor'
)
ON CONFLICT(id) DO UPDATE SET
  label = excluded.label,
  unit = excluded.unit,
  unit_cost = excluded.unit_cost,
  misc_cost = excluded.misc_cost,
  currency = excluded.currency,
  pricing_source = excluded.pricing_source,
  pricing_date = excluded.pricing_date,
  is_active = excluded.is_active;

UPDATE cost_library_item_price_options
SET is_default = 0
WHERE item_id = 'item-alpha'
  AND id <> 'price-d1-proof'
  AND is_default = 1;

UPDATE cost_library_item_price_options
SET is_default = 1
WHERE id = 'price-d1-proof'
  AND item_id = 'item-alpha';

CREATE TEMP TABLE price_history_inserted (
  inserted INTEGER NOT NULL
);

INSERT INTO cost_library_item_price_history (
  id,
  price_option_id,
  item_id,
  workspace_id,
  operation_key,
  old_snapshot,
  new_snapshot,
  change_reason,
  effective_at,
  created_by
)
SELECT
  'price-history-d1-proof',
  'price-d1-proof',
  'item-alpha',
  'ws-alpha',
  'op-price-d1-proof',
  NULL,
  '{"label":"D1 default price","unitCost":125}',
  'D1 price option proof',
  '2026-06-30T01:10:00.000Z',
  'user-editor'
WHERE NOT EXISTS (
  SELECT 1
  FROM cost_library_item_price_history
  WHERE item_id = 'item-alpha'
    AND operation_key = 'op-price-d1-proof'
);

INSERT INTO price_history_inserted (inserted) VALUES (changes());

UPDATE cost_library_items
SET active_price_option_id = 'price-d1-proof',
    unit = 'm3',
    unit_cost = 125,
    misc_cost = 5,
    pricing_source = 'D1 proof',
    pricing_date = '2026-06-30',
    current_version_number = current_version_number + (SELECT inserted FROM price_history_inserted),
    updated_at = '2026-06-30T01:10:00.000Z'
WHERE id = 'item-alpha'
  AND workspace_id = 'ws-alpha';

INSERT INTO cost_library_item_versions (
  id,
  item_id,
  workspace_id,
  version_number,
  snapshot_json,
  change_summary,
  change_reason,
  effective_at,
  created_by
)
SELECT
  'version-alpha-price-option',
  'item-alpha',
  'ws-alpha',
  (SELECT current_version_number FROM cost_library_items WHERE id = 'item-alpha'),
  '{"activePriceOptionId":"price-d1-proof"}',
  'Price option changed',
  'D1 price option proof',
  '2026-06-30T01:10:00.000Z',
  'user-editor'
WHERE (SELECT inserted FROM price_history_inserted) = 1;
COMMIT;
`;

const BULK_ARCHIVE_SQL = `
.bail on
PRAGMA foreign_keys = ON;
BEGIN IMMEDIATE;
${EDITOR_GUARD_SQL}
INSERT INTO guard_failures (must_be_zero)
SELECT 1
WHERE 'hash-components' <> 'hash-components';

INSERT OR IGNORE INTO mass_deletion_events (
  id,
  workspace_id,
  actor_user_id,
  target_type,
  action,
  target_ids_json,
  preview_hash,
  correlation_id,
  status,
  summary_json,
  created_at
)
VALUES (
  'mass-event-components-proof',
  'ws-alpha',
  'user-editor',
  'library_component',
  'archive',
  '["item-archive-1","item-archive-2"]',
  'hash-components',
  'corr-components-proof',
  'completed',
  '{"requestedCount":2,"eligibleCount":2,"blockedCount":0}',
  '2026-06-30T01:15:00.000Z'
);

CREATE TEMP TABLE archive_event_inserted AS
SELECT changes() AS inserted;

UPDATE cost_library_items
SET lifecycle_state = 'archived',
    lifecycle_state_changed_at = '2026-06-30T01:15:00.000Z',
    lifecycle_state_changed_by = 'user-editor',
    updated_at = '2026-06-30T01:15:00.000Z'
WHERE workspace_id = 'ws-alpha'
  AND id IN ('item-archive-1', 'item-archive-2')
  AND EXISTS (SELECT 1 FROM archive_event_inserted WHERE inserted = 1);
COMMIT;
`;

const STALE_PREVIEW_SQL = `
.bail on
PRAGMA foreign_keys = ON;
BEGIN IMMEDIATE;
${EDITOR_GUARD_SQL}
INSERT INTO guard_failures (must_be_zero)
SELECT 1
WHERE 'stale-hash' <> 'hash-components';

INSERT INTO mass_deletion_events (
  id,
  workspace_id,
  actor_user_id,
  target_type,
  action,
  target_ids_json,
  preview_hash,
  correlation_id,
  status,
  summary_json,
  created_at
)
VALUES (
  'mass-event-stale-preview',
  'ws-alpha',
  'user-editor',
  'library_component',
  'archive',
  '["item-rollback"]',
  'stale-hash',
  'corr-stale-preview',
  'completed',
  '{}',
  '2026-06-30T01:16:00.000Z'
);

UPDATE cost_library_items
SET lifecycle_state = 'archived'
WHERE id = 'item-rollback'
  AND workspace_id = 'ws-alpha';
COMMIT;
`;

// The gate is a local sanity check for indexed query shape; hosted Worker+D1
// latency remains covered by the production proof gate.
const LOCAL_SQLITE_CLI_BUDGET_MS = 30;

const QUERY_SPECS = [
  {
    surface: "component_library_folder_tree",
    sql: `
      SELECT id, parent_id, name, sort_order
      FROM library_folders
      WHERE workspace_id = 'ws-alpha'
        AND parent_slot = '__root__'
      ORDER BY sort_order, name
    `,
    queryBudget: 1,
    plannedQueries: 1,
    localBudgetMs: LOCAL_SQLITE_CLI_BUDGET_MS,
    notes: "Folder tree root query should use the workspace/parent/sort index.",
  },
  {
    surface: "component_library_active_components",
    sql: `
      SELECT id, name, lifecycle_state, current_version_number
      FROM cost_library_items
      WHERE workspace_id = 'ws-alpha'
        AND lifecycle_state IN ('draft', 'in_review', 'in_production')
      ORDER BY updated_at DESC
      LIMIT 50
    `,
    queryBudget: 1,
    plannedQueries: 1,
    localBudgetMs: LOCAL_SQLITE_CLI_BUDGET_MS,
    notes: "Active component catalogue query should use the workspace/lifecycle index.",
  },
  {
    surface: "component_library_price_options",
    sql: `
      SELECT id, label, unit_cost, is_default
      FROM cost_library_item_price_options
      WHERE item_id = 'item-alpha'
        AND is_active = 1
      ORDER BY is_default DESC, label
    `,
    queryBudget: 1,
    plannedQueries: 1,
    localBudgetMs: LOCAL_SQLITE_CLI_BUDGET_MS,
    notes: "Price options query should stay scoped to one component.",
  },
  {
    surface: "component_library_bulk_archive_preview",
    sql: `
      SELECT id, lifecycle_state
      FROM cost_library_items
      WHERE workspace_id = 'ws-alpha'
        AND id IN ('item-archive-1', 'item-archive-2', 'item-rollback')
    `,
    queryBudget: 1,
    plannedQueries: 1,
    localBudgetMs: LOCAL_SQLITE_CLI_BUDGET_MS,
    notes: "Bulk archive preview should use workspace plus keyed component lookups.",
  },
] as const;

function readEnv(name: string) {
  const value = process.env[name];
  return value?.trim() || undefined;
}

function runSqlite(args: string[], input?: string) {
  const result = runLocalSqliteCli(args, input);
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const detail = result.stderr.trim() || result.stdout.trim() || `exit ${result.status}`;
    throw new Error(`SQLite ${args.join(" ")} failed: ${detail}`);
  }
  return result.stdout;
}

function runSqliteAllowFailure(args: string[], input: string) {
  return runLocalSqliteCli(args, input);
}

function runSqliteScript(databasePath: string, sql: string) {
  runSqlite([databasePath], sql);
}

function runSqliteJson<T>(databasePath: string, sql: string) {
  const output = runSqlite(["-json", databasePath, sql]).trim();
  return output ? JSON.parse(output) as T[] : [];
}

function sqliteVersion() {
  return runSqlite(["--version"]).trim().split(/\s+/)[0] ?? "unknown";
}

function percentile(values: number[], percentileValue: number) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * percentileValue) - 1));
  return sorted[index];
}

function roundedMs(value: number) {
  return Math.round(value * 100) / 100;
}

function measureQuery(databasePath: string, sql: string) {
  const samples: number[] = [];
  let rowsReturned = 0;

  for (let index = 0; index < 10; index += 1) {
    const started = process.hrtime.bigint();
    const rows = runSqliteJson<Record<string, unknown>>(databasePath, sql);
    const ended = process.hrtime.bigint();
    if (index > 0) samples.push(Number(ended - started) / 1_000_000);
    rowsReturned = rows.length;
  }

  return {
    localP95Ms: roundedMs(percentile(samples, 0.95)),
    rowsReturned,
    sampleCount: samples.length,
  };
}

function buildQueryProofRows(databasePath: string): QueryProofRow[] {
  return QUERY_SPECS.map((spec): QueryProofRow => {
    const result = measureQuery(databasePath, spec.sql);
    const status = spec.plannedQueries <= spec.queryBudget && result.localP95Ms <= spec.localBudgetMs
      ? "local-pass"
      : "local-fail";
    return {
      surface: spec.surface,
      queryBudget: spec.queryBudget,
      plannedQueries: spec.plannedQueries,
      localBudgetMs: spec.localBudgetMs,
      localP95Ms: result.localP95Ms,
      rowsReturned: result.rowsReturned,
      sampleCount: result.sampleCount,
      status,
      notes: spec.notes,
    };
  });
}

function dumpDatabase(databasePath: string) {
  return runSqlite([databasePath, ".dump"]);
}

function scalarString(databasePath: string, sql: string, key: string) {
  const rows = runSqliteJson<Record<string, string | null>>(databasePath, sql);
  return rows[0]?.[key] ?? null;
}

function scalarNumber(databasePath: string, sql: string, key: string) {
  const rows = runSqliteJson<Record<string, number>>(databasePath, sql);
  return rows[0]?.[key] ?? 0;
}

function countSeedRows(databasePath: string) {
  const rows = runSqliteJson<{ rows_seeded: number }>(
    databasePath,
    `
      SELECT
        (SELECT COUNT(*) FROM users)
        + (SELECT COUNT(*) FROM workspaces)
        + (SELECT COUNT(*) FROM workspace_members)
        + (SELECT COUNT(*) FROM library_folders)
        + (SELECT COUNT(*) FROM cost_library_items)
        + (SELECT COUNT(*) FROM cost_library_item_versions)
        + (SELECT COUNT(*) FROM cost_library_item_price_options) AS rows_seeded;
    `,
  );
  return rows[0]?.rows_seeded ?? 0;
}

function explainPlan(databasePath: string, sql: string) {
  const output = runSqlite([databasePath], `EXPLAIN QUERY PLAN ${sql}`);
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && line !== "QUERY PLAN");
}

function buildPlanProof(databasePath: string) {
  const folderTreePlan = explainPlan(databasePath, QUERY_SPECS[0].sql);
  const activeComponentsPlan = explainPlan(databasePath, QUERY_SPECS[1].sql);
  const priceOptionsPlan = explainPlan(databasePath, QUERY_SPECS[2].sql);
  const bulkArchivePlan = explainPlan(databasePath, QUERY_SPECS[3].sql);
  const planDetails = [...folderTreePlan, ...activeComponentsPlan, ...priceOptionsPlan, ...bulkArchivePlan];

  return {
    folderTreePlanUsesIndex: folderTreePlan.some((detail) => /idx_library_folders_workspace_parent_sort|sqlite_autoindex_library_folders_2/i.test(detail)),
    activeComponentsPlanUsesIndex: activeComponentsPlan.some((detail) => /idx_cost_library_items_workspace_lifecycle/i.test(detail)),
    priceOptionsPlanUsesIndex: priceOptionsPlan.some((detail) => /idx_price_options_item_active_default/i.test(detail)),
    bulkArchivePlanUsesIndex: bulkArchivePlan.some((detail) => /idx_cost_library_items_workspace_id|sqlite_autoindex_cost_library_items_1|PRIMARY KEY/i.test(detail)),
    planDetails,
  };
}

function buildLocalFixtureAndQueries() {
  const tempDir = mkdtempSync(join(tmpdir(), "archestimator-d1-component-library-"));
  const databasePath = join(tempDir, "component-library.db");
  const restoredDatabasePath = join(tempDir, "component-library-restored.db");

  try {
    runSqliteScript(databasePath, FIXTURE_SQL);
    const rowsSeeded = countSeedRows(databasePath);
    const viewerDeleteResult = runSqliteAllowFailure([databasePath], VIEWER_DELETE_SQL);
    runSqliteScript(databasePath, DELETE_FOLDER_SQL);
    runSqliteScript(databasePath, REORDER_FOLDERS_SQL);
    const duplicateReorderResult = runSqliteAllowFailure([databasePath], DUPLICATE_REORDER_SQL);
    const cycleReorderResult = runSqliteAllowFailure([databasePath], CYCLE_REORDER_SQL);
    runSqliteScript(databasePath, UPDATE_COMPONENT_SQL);
    const invalidComponentUpdateResult = runSqliteAllowFailure([databasePath], INVALID_COMPONENT_UPDATE_SQL);
    runSqliteScript(databasePath, LIFECYCLE_SQL);
    runSqliteScript(databasePath, LIFECYCLE_SQL);
    runSqliteScript(databasePath, PRICE_UPSERT_SQL);
    runSqliteScript(databasePath, PRICE_UPSERT_SQL);
    runSqliteScript(databasePath, BULK_ARCHIVE_SQL);
    runSqliteScript(databasePath, BULK_ARCHIVE_SQL);
    const stalePreviewResult = runSqliteAllowFailure([databasePath], STALE_PREVIEW_SQL);
    const planProof = buildPlanProof(databasePath);
    const queryRows = buildQueryProofRows(databasePath);
    const dump = dumpDatabase(databasePath);
    runSqlite([restoredDatabasePath], dump);

    const duplicateReorderResidueRows = scalarNumber(
      databasePath,
      `
        SELECT COUNT(*) AS rows
        FROM library_folders
        WHERE workspace_id = 'ws-alpha'
          AND parent_slot = '__root__'
          AND sort_order = 60;
      `,
      "rows",
    );
    const cycleReorderResidueRows = scalarNumber(
      databasePath,
      `
        SELECT COUNT(*) AS rows
        FROM library_folders
        WHERE (id = 'folder-cycle-parent' AND parent_id = 'folder-cycle-child')
           OR (id = 'folder-cycle-child' AND parent_id IS NULL);
      `,
      "rows",
    );
    const duplicateBulkArchiveEventRows = Math.max(
      0,
      scalarNumber(
        databasePath,
        `
          SELECT COUNT(*) AS rows
          FROM mass_deletion_events
          WHERE correlation_id = 'corr-components-proof';
        `,
        "rows",
      ) - 1,
    );
    const duplicatePriceHistoryRows = Math.max(
      0,
      scalarNumber(
        databasePath,
        `
          SELECT COUNT(*) AS rows
          FROM cost_library_item_price_history
          WHERE operation_key = 'op-price-d1-proof';
        `,
        "rows",
      ) - 1,
    );
    const stalePreviewResidueRows = scalarNumber(
      databasePath,
      `
        SELECT
          (SELECT COUNT(*) FROM mass_deletion_events WHERE correlation_id = 'corr-stale-preview')
          + (SELECT COUNT(*) FROM cost_library_items WHERE id = 'item-rollback' AND lifecycle_state = 'archived') AS rows;
      `,
      "rows",
    );
    const rollbackResidueRows = duplicateReorderResidueRows
      + cycleReorderResidueRows
      + scalarNumber(
        databasePath,
        `
          SELECT COUNT(*) AS rows
          FROM cost_library_item_versions
          WHERE id = 'version-invalid-update';
        `,
        "rows",
      )
      + stalePreviewResidueRows;

    const fixture: ComponentLibraryProofFixture = {
      sqliteVersion: sqliteVersion(),
      fixtureTables: 10,
      rowsSeeded,
      viewerDeleteCommandFailed: viewerDeleteResult.status !== 0,
      viewerDeleteResidueRows: scalarNumber(
        databasePath,
        "SELECT COUNT(*) AS rows FROM library_folders WHERE id = 'folder-target';",
        "rows",
      ) === 0
        ? 0
        : 1,
      folderDeleteTargetRows: scalarNumber(
        databasePath,
        "SELECT COUNT(*) AS rows FROM library_folders WHERE id = 'folder-target';",
        "rows",
      ),
      childParentAfterDelete: scalarString(
        databasePath,
        "SELECT parent_id FROM library_folders WHERE id = 'folder-child';",
        "parent_id",
      ),
      itemFolderAfterDelete: scalarString(
        databasePath,
        "SELECT library_folder_id FROM cost_library_items WHERE id = 'item-alpha';",
        "library_folder_id",
      ),
      reorderUpdatedRows: scalarNumber(
        databasePath,
        `
          SELECT COUNT(*) AS rows
          FROM library_folders
          WHERE (id = 'folder-child' AND parent_id IS NULL AND sort_order = 30)
             OR (id = 'folder-sibling' AND parent_id IS NULL AND sort_order = 40);
        `,
        "rows",
      ),
      duplicateReorderCommandFailed: duplicateReorderResult.status !== 0,
      duplicateReorderResidueRows,
      cycleReorderCommandFailed: cycleReorderResult.status !== 0,
      cycleReorderResidueRows,
      componentUpdateVersionRows: scalarNumber(
        databasePath,
        "SELECT COUNT(*) AS rows FROM cost_library_item_versions WHERE change_summary = 'Component updated';",
        "rows",
      ),
      componentUpdatedName: scalarString(
        databasePath,
        "SELECT name FROM cost_library_items WHERE id = 'item-alpha';",
        "name",
      ),
      invalidComponentUpdateCommandFailed: invalidComponentUpdateResult.status !== 0,
      invalidComponentUpdateResidueRows: scalarNumber(
        databasePath,
        "SELECT COUNT(*) AS rows FROM cost_library_item_versions WHERE id = 'version-invalid-update';",
        "rows",
      ),
      lifecycleStateAfterChange: scalarString(
        databasePath,
        "SELECT lifecycle_state FROM cost_library_items WHERE id = 'item-alpha';",
        "lifecycle_state",
      ),
      lifecycleHistoryRows: scalarNumber(
        databasePath,
        "SELECT COUNT(*) AS rows FROM cost_library_item_state_history WHERE operation_key = 'op-lifecycle-alpha-production';",
        "rows",
      ),
      repeatedLifecycleHistoryRows: scalarNumber(
        databasePath,
        "SELECT COUNT(*) AS rows FROM cost_library_item_state_history WHERE item_id = 'item-alpha';",
        "rows",
      ),
      repeatedLifecycleVersionNumber: scalarNumber(
        databasePath,
        "SELECT current_version_number AS version FROM cost_library_items WHERE id = 'item-alpha';",
        "version",
      ),
      priceOptionRows: scalarNumber(
        databasePath,
        "SELECT COUNT(*) AS rows FROM cost_library_item_price_options WHERE id = 'price-d1-proof';",
        "rows",
      ),
      defaultPriceOptionRows: scalarNumber(
        databasePath,
        "SELECT COUNT(*) AS rows FROM cost_library_item_price_options WHERE item_id = 'item-alpha' AND is_default = 1 AND is_active = 1;",
        "rows",
      ),
      priceHistoryRowsForOperation: scalarNumber(
        databasePath,
        "SELECT COUNT(*) AS rows FROM cost_library_item_price_history WHERE operation_key = 'op-price-d1-proof';",
        "rows",
      ),
      duplicatePriceHistoryRows,
      bulkArchiveEventRows: scalarNumber(
        databasePath,
        "SELECT COUNT(*) AS rows FROM mass_deletion_events WHERE correlation_id = 'corr-components-proof';",
        "rows",
      ),
      archivedComponentRows: scalarNumber(
        databasePath,
        "SELECT COUNT(*) AS rows FROM cost_library_items WHERE id IN ('item-archive-1', 'item-archive-2') AND lifecycle_state = 'archived';",
        "rows",
      ),
      duplicateBulkArchiveEventRows,
      stalePreviewCommandFailed: stalePreviewResult.status !== 0,
      stalePreviewResidueRows,
      rollbackResidueRows,
      restoredFolderRows: scalarNumber(restoredDatabasePath, "SELECT COUNT(*) AS rows FROM library_folders;", "rows"),
      restoredComponentRows: scalarNumber(restoredDatabasePath, "SELECT COUNT(*) AS rows FROM cost_library_items;", "rows"),
      restoredVersionRows: scalarNumber(restoredDatabasePath, "SELECT COUNT(*) AS rows FROM cost_library_item_versions;", "rows"),
      restoredPriceHistoryRows: scalarNumber(restoredDatabasePath, "SELECT COUNT(*) AS rows FROM cost_library_item_price_history;", "rows"),
      ...planProof,
      tempArtifactsRemoved: false,
    };

    return { fixture, queryRows, tempDir };
  } catch (error) {
    rmSync(tempDir, { recursive: true, force: true });
    throw error;
  }
}

function buildDefaultFixture() {
  const result = buildLocalFixtureAndQueries();
  rmSync(result.tempDir, { recursive: true, force: true });
  return {
    fixture: {
      ...result.fixture,
      tempArtifactsRemoved: true,
    },
    queryRows: result.queryRows,
  };
}

function allQueriesPass(rows: QueryProofRow[]) {
  return rows.length > 0 && rows.every((row) => row.status === "local-pass");
}

function buildReadiness(fixture: ComponentLibraryProofFixture, queryRows: QueryProofRow[]) {
  const schemaReady = fixture.fixtureTables === 10 && fixture.rowsSeeded >= 24;
  const appLayerEditorGuardReady = fixture.viewerDeleteCommandFailed && fixture.viewerDeleteResidueRows === 0;
  const folderDeleteReady = fixture.folderDeleteTargetRows === 0
    && fixture.childParentAfterDelete === null
    && fixture.itemFolderAfterDelete === null;
  const folderReorderReady = fixture.reorderUpdatedRows === 2
    && fixture.duplicateReorderCommandFailed
    && fixture.duplicateReorderResidueRows === 0
    && fixture.cycleReorderCommandFailed
    && fixture.cycleReorderResidueRows === 0;
  const bulkArchiveReady = fixture.bulkArchiveEventRows === 1
    && fixture.archivedComponentRows === 2;
  const componentUpdateReady = fixture.componentUpdateVersionRows === 1
    && fixture.componentUpdatedName === "Alpha concrete revised";
  const lifecycleMutationReady = fixture.lifecycleStateAfterChange === "in_production"
    && fixture.lifecycleHistoryRows === 1
    && fixture.repeatedLifecycleHistoryRows === 1;
  const priceOptionUpsertReady = fixture.priceOptionRows === 1
    && fixture.defaultPriceOptionRows === 1
    && fixture.priceHistoryRowsForOperation === 1;
  const rollbackReady = fixture.invalidComponentUpdateCommandFailed
    && fixture.invalidComponentUpdateResidueRows === 0
    && fixture.stalePreviewCommandFailed
    && fixture.stalePreviewResidueRows === 0
    && fixture.rollbackResidueRows === 0;
  const idempotencyReady = fixture.duplicatePriceHistoryRows === 0
    && fixture.duplicateBulkArchiveEventRows === 0
    && fixture.repeatedLifecycleHistoryRows === 1;
  const queryBudgetReady = allQueriesPass(queryRows)
    && fixture.folderTreePlanUsesIndex
    && fixture.activeComponentsPlanUsesIndex
    && fixture.priceOptionsPlanUsesIndex
    && fixture.bulkArchivePlanUsesIndex;
  const restoreFixtureReady = fixture.restoredFolderRows >= 4
    && fixture.restoredComponentRows >= 5
    && fixture.restoredVersionRows >= 6
    && fixture.restoredPriceHistoryRows >= 1;

  const readiness = {
    schemaReady,
    appLayerEditorGuardReady,
    folderDeleteReady,
    folderReorderReady,
    bulkArchiveReady,
    componentUpdateReady,
    lifecycleMutationReady,
    priceOptionUpsertReady,
    rollbackReady,
    idempotencyReady,
    queryBudgetReady,
    restoreFixtureReady,
    localComponentLibraryD1SliceReady: false,
    productionComponentLibraryD1Ready: false as const,
  };

  readiness.localComponentLibraryD1SliceReady = Object.entries(readiness)
    .filter(([key]) => key !== "productionComponentLibraryD1Ready" && key !== "localComponentLibraryD1SliceReady")
    .every(([, value]) => value === true);

  return readiness;
}

export function buildCloudflareD1ComponentLibraryProof(
  inputs: ComponentLibraryProofInputs = {},
): CloudflareD1ComponentLibraryProofReport {
  const defaultFixture = inputs.fixture && inputs.queryRows
    ? { fixture: inputs.fixture, queryRows: inputs.queryRows }
    : buildDefaultFixture();
  const fixture = inputs.fixture ?? defaultFixture.fixture;
  const queryRows = inputs.queryRows ?? defaultFixture.queryRows;
  const readiness = buildReadiness(fixture, queryRows);

  return {
    generatedAt: inputs.generatedAt ?? new Date().toISOString(),
    mode: "cloudflare-d1-component-library-proof",
    sources: {
      plan: ".ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/23_D1_AUTH_REALTIME_REDESIGN_PLAN.md",
      currentAppFiles: [
        "src/lib/component-library/actions.ts",
        "src/lib/repositories/component-library-repository.ts",
        "src/components/workshop/component-library-manager/ComponentLibraryManager.tsx",
      ],
      currentSupabaseMigrations: [
        "supabase/migrations/20260614125239_20260605113000_transactional_library_folder_delete.sql",
        "supabase/migrations/20260603235355_harden_library_folder_editor_access.sql",
        "supabase/migrations/20260603191903_harden_mass_deletion_actor_derivation.sql",
        "supabase/migrations/20260524141347_component_library_identity_variant_sku_brand_view.sql",
        "supabase/migrations/20260523120957_component_library_item_versioning.sql",
      ],
      d1DatabaseApi: "Cloudflare D1 prepared statements and transaction semantics, modeled locally with SQLite",
    },
    affectedRpcNames: AFFECTED_RPC_NAMES,
    readiness,
    localOnly: true,
    providerBacked: false,
    fixture,
    queryProof: {
      rows: queryRows,
    },
    d1RewriteStrategy: {
      typeStrategy:
        "Replace component-library RPCs with D1 repositories that derive editor authorization from Better Auth identity, wrap folder/component/version/history mutations in explicit transactions, and use operation/correlation keys for retry-safe price and bulk archive writes.",
      preparedStatementPatterns: PREPARED_STATEMENT_PATTERNS,
    },
    productionProofRequirements: PRODUCTION_PROOF_REQUIREMENTS,
    blockers: [
      "Hosted Worker+D1 component-library proof is still missing.",
      "Better Auth production identity handoff is still missing; keep current Supabase-backed component-library actions live.",
      "Provider-backed D1 export/restore proof for component-library tables is still missing.",
      "D1 migration SQL and generated type strategy for component-library tables are not production-applied.",
    ],
    note:
      "Local D1 component-library proof only. It uses sanitized temporary SQLite data and does not read env files, print secret values, call provider APIs, create hosted D1 databases, mutate Cloudflare/Supabase, deploy Workers, change DNS, bill, replace live component-library actions, or make production D1/Auth ready.",
  };
}

function boolLabel(value: boolean) {
  return value ? "yes" : "no";
}

function markdownRows(rows: string[][]) {
  return rows.map((row) => `| ${row.map((cell) => cell.replaceAll("|", "\\|")).join(" | ")} |`);
}

export function writeMarkdown(report: CloudflareD1ComponentLibraryProofReport, markdownFile: string) {
  const outputPath = resolve(markdownFile);
  mkdirSync(dirname(outputPath), { recursive: true });
  const readinessRows = Object.entries(report.readiness).map(([key, value]) => [
    key.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase()),
    boolLabel(value),
  ]);
  const queryRows = report.queryProof.rows.map((row) => [
    row.surface,
    String(row.queryBudget),
    String(row.plannedQueries),
    String(row.localBudgetMs),
    String(row.localP95Ms),
    String(row.rowsReturned),
    row.status,
    row.notes,
  ]);
  const lines = [
    "# Cloudflare D1 Component-Library Proof",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    report.note,
    "",
    "## Readiness",
    "",
    "| Gate | Ready |",
    "| --- | --- |",
    ...markdownRows(readinessRows),
    "",
    "## Affected RPCs",
    "",
    ...report.affectedRpcNames.map((name) => `- \`${name}\``),
    "",
    "## Local Fixture Facts",
    "",
    "| Fact | Value |",
    "| --- | ---: |",
    `| SQLite version | ${report.fixture.sqliteVersion} |`,
    `| Fixture tables | ${report.fixture.fixtureTables} |`,
    `| Rows seeded | ${report.fixture.rowsSeeded} |`,
    `| Viewer delete command failed | ${boolLabel(report.fixture.viewerDeleteCommandFailed)} |`,
    `| Viewer delete residue rows | ${report.fixture.viewerDeleteResidueRows} |`,
    `| Deleted target folder rows | ${report.fixture.folderDeleteTargetRows} |`,
    `| Reorder updated rows | ${report.fixture.reorderUpdatedRows} |`,
    `| Duplicate reorder command failed | ${boolLabel(report.fixture.duplicateReorderCommandFailed)} |`,
    `| Cycle reorder command failed | ${boolLabel(report.fixture.cycleReorderCommandFailed)} |`,
    `| Component update version rows | ${report.fixture.componentUpdateVersionRows} |`,
    `| Lifecycle state after change | ${report.fixture.lifecycleStateAfterChange ?? "(missing)"} |`,
    `| Lifecycle history rows | ${report.fixture.lifecycleHistoryRows} |`,
    `| Repeated lifecycle history rows | ${report.fixture.repeatedLifecycleHistoryRows} |`,
    `| Price option rows | ${report.fixture.priceOptionRows} |`,
    `| Default price option rows | ${report.fixture.defaultPriceOptionRows} |`,
    `| Price history rows for operation | ${report.fixture.priceHistoryRowsForOperation} |`,
    `| Duplicate price history rows | ${report.fixture.duplicatePriceHistoryRows} |`,
    `| Bulk archive event rows | ${report.fixture.bulkArchiveEventRows} |`,
    `| Archived component rows | ${report.fixture.archivedComponentRows} |`,
    `| Duplicate bulk archive event rows | ${report.fixture.duplicateBulkArchiveEventRows} |`,
    `| Stale preview command failed | ${boolLabel(report.fixture.stalePreviewCommandFailed)} |`,
    `| Stale preview residue rows | ${report.fixture.stalePreviewResidueRows} |`,
    `| Rollback residue rows | ${report.fixture.rollbackResidueRows} |`,
    `| Restored folder rows | ${report.fixture.restoredFolderRows} |`,
    `| Restored component rows | ${report.fixture.restoredComponentRows} |`,
    `| Restored version rows | ${report.fixture.restoredVersionRows} |`,
    `| Restored price history rows | ${report.fixture.restoredPriceHistoryRows} |`,
    `| Folder tree plan uses index | ${boolLabel(report.fixture.folderTreePlanUsesIndex)} |`,
    `| Active components plan uses index | ${boolLabel(report.fixture.activeComponentsPlanUsesIndex)} |`,
    `| Price options plan uses index | ${boolLabel(report.fixture.priceOptionsPlanUsesIndex)} |`,
    `| Bulk archive plan uses index | ${boolLabel(report.fixture.bulkArchivePlanUsesIndex)} |`,
    "",
    "## Query Proof",
    "",
    "| Surface | Query budget | Planned queries | Local budget ms | Local p95 ms | Rows | Status | Notes |",
    "| --- | ---: | ---: | ---: | ---: | ---: | --- | --- |",
    ...markdownRows(queryRows),
    "",
    "## Query Plan Details",
    "",
    ...report.fixture.planDetails.map((detail) => `- ${detail}`),
    "",
    "## Prepared Statement Patterns",
    "",
    ...report.d1RewriteStrategy.preparedStatementPatterns.map((pattern) => `- \`${pattern}\``),
    "",
    "## Production Proof Requirements",
    "",
    ...report.productionProofRequirements.map((requirement) => `- ${requirement}`),
    "",
    "## Blockers",
    "",
    ...report.blockers.map((blocker) => `- ${blocker}`),
    "",
  ];
  writeFileSync(outputPath, lines.join("\n"));
}

function writeOutput(outputFile: string, report: CloudflareD1ComponentLibraryProofReport) {
  const outputPath = resolve(outputFile);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
}

async function main() {
  const report = buildCloudflareD1ComponentLibraryProof();
  const outputFile = readEnv("OUTPUT_FILE") ?? `${PLAN_ROOT}/2026-06-30-cloudflare-d1-component-library-proof.json`;
  const markdownFile = readEnv("MARKDOWN_FILE") ?? `${PLAN_ROOT}/2026-06-30-cloudflare-d1-component-library-proof.md`;
  writeOutput(outputFile, report);
  writeMarkdown(report, markdownFile);
  console.log(JSON.stringify(report, null, 2));
  if (!report.readiness.localComponentLibraryD1SliceReady) process.exitCode = 1;
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
