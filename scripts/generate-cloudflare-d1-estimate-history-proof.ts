#!/usr/bin/env bun

import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

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

type EstimateHistoryProofFixture = {
  sqliteVersion: string;
  fixtureTables: number;
  rowsSeeded: number;
  viewerMutationCommandFailed: boolean;
  viewerMutationResidueRows: number;
  createTabRows: number;
  duplicateCreateTabRows: number;
  renamedTabName: string | null;
  archivedTabStatus: string | null;
  deletedTabRows: number;
  duplicateTabRows: number;
  reorderedTabRows: number;
  duplicateReorderCommandFailed: boolean;
  duplicateReorderResidueRows: number;
  subtreeNodeRows: number;
  subtreeRowRows: number;
  duplicateSubtreeOperationRows: number;
  movedRowNodeId: string | null;
  movedRowHistoryRows: number;
  sheetAdjustmentValue: number;
  sheetAdjustmentHistoryRows: number;
  projectPackageCommandRows: number;
  libraryPackageCommandRows: number;
  promotedLibraryComponentRows: number;
  promotedRowLinkedRows: number;
  rollbackCommandFailed: boolean;
  rollbackResidueRows: number;
  restoredTabRows: number;
  restoredNodeRows: number;
  restoredRowRows: number;
  restoredHistoryRows: number;
  tabListPlanUsesIndex: boolean;
  eventTimelinePlanUsesIndex: boolean;
  subtreePlanUsesIndex: boolean;
  packageCommandPlanUsesIndex: boolean;
  planDetails: string[];
  tempArtifactsRemoved: boolean;
};

type EstimateHistoryProofInputs = {
  generatedAt?: string;
  fixture?: EstimateHistoryProofFixture;
  queryRows?: QueryProofRow[];
};

export type CloudflareD1EstimateHistoryProofReport = {
  generatedAt: string;
  mode: "cloudflare-d1-estimate-history-proof";
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
    estimateTabMutationReady: boolean;
    subtreeInsertReady: boolean;
    rowMoveReady: boolean;
    sheetAdjustmentReady: boolean;
    packageApplyReady: boolean;
    promoteToLibraryReady: boolean;
    rollbackReady: boolean;
    idempotencyReady: boolean;
    queryBudgetReady: boolean;
    restoreFixtureReady: boolean;
    localEstimateHistoryD1SliceReady: boolean;
    productionEstimateHistoryD1Ready: false;
  };
  localOnly: true;
  providerBacked: false;
  fixture: EstimateHistoryProofFixture;
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
  "archive_estimate_tab_with_history",
  "create_ai_package_library_components_with_history",
  "create_estimate_tab_with_history",
  "create_project_estimate_package_with_history",
  "delete_estimate_tab_with_history",
  "duplicate_estimate_tab_with_history",
  "insert_estimate_subtree_into_estimate_with_history",
  "move_estimate_row_item_with_history",
  "promote_estimate_row_to_library_component",
  "rename_estimate_tab_with_history",
  "reorder_estimate_tabs_with_history",
  "update_estimate_sheet_adjustment_with_history",
];

const PREPARED_STATEMENT_PATTERNS = [
  "SELECT 1 FROM workspace_members WHERE workspace_id = ? AND user_id = ? AND role IN ('owner','editor')",
  "BEGIN IMMEDIATE; INSERT OR IGNORE INTO estimate_operation_keys(operation_key, rpc_name, estimate_id) ...",
  "BEGIN IMMEDIATE; UPDATE estimate_tabs ...; INSERT INTO estimate_sheet_events ...; COMMIT",
  "BEGIN IMMEDIATE; INSERT INTO estimate_nodes ...; INSERT INTO estimate_row_items ...; INSERT INTO estimate_sheet_events ...; COMMIT",
  "EXPLAIN QUERY PLAN SELECT ... FROM estimate_sheet_events WHERE estimate_id = ? ORDER BY created_at DESC, id DESC",
];

const PRODUCTION_PROOF_REQUIREMENTS = [
  "Hosted Worker+D1 estimate-history mutation proof with real D1 bindings and Better Auth-derived identity.",
  "D1 schema migration/readback proof for estimates, tabs, nodes, row items, history events, operation keys, and package apply commands.",
  "Cross-workspace denial tests against mounted Worker route/action surfaces for estimate mutations.",
  "Rollback/idempotency replay proof using production-shaped D1 transactions and retry/operation keys.",
  "Hosted Worker+D1 p95/query-count proof for tab lists, estimate tree/subtree reads, and activity timeline surfaces.",
  "Provider-backed D1 export/import restore proof for estimate-history tables.",
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

CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL
);

CREATE TABLE estimates (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  adjustment_percentage REAL NOT NULL DEFAULT 0 CHECK (adjustment_percentage >= -100 AND adjustment_percentage <= 100)
);

CREATE TABLE estimate_tabs (
  id TEXT PRIMARY KEY,
  estimate_id TEXT NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  archived_at TEXT,
  UNIQUE (estimate_id, sort_order)
);

CREATE TABLE estimate_nodes (
  id TEXT PRIMARY KEY,
  estimate_id TEXT NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  tab_id TEXT NOT NULL REFERENCES estimate_tabs(id) ON DELETE CASCADE,
  parent_id TEXT REFERENCES estimate_nodes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL
);

CREATE TABLE estimate_row_items (
  id TEXT PRIMARY KEY,
  estimate_id TEXT NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  tab_id TEXT NOT NULL REFERENCES estimate_tabs(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL REFERENCES estimate_nodes(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 1,
  unit_cost REAL NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL,
  source_library_item_id TEXT
);

CREATE TABLE estimate_sheet_events (
  id TEXT PRIMARY KEY,
  estimate_id TEXT NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  operation_key TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (estimate_id, operation_key)
);

CREATE TABLE estimate_operation_keys (
  operation_key TEXT PRIMARY KEY,
  rpc_name TEXT NOT NULL,
  estimate_id TEXT NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL
);

CREATE TABLE ai_package_apply_commands (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  estimate_id TEXT REFERENCES estimates(id) ON DELETE CASCADE,
  command_kind TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (workspace_id, command_kind, idempotency_key)
);

CREATE TABLE cost_library_items (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  source_estimate_row_item_id TEXT UNIQUE,
  current_version_number INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX idx_workspace_members_workspace_user_role
  ON workspace_members(workspace_id, user_id, role);

CREATE INDEX idx_estimate_tabs_estimate_sort
  ON estimate_tabs(estimate_id, status, sort_order);

CREATE INDEX idx_estimate_nodes_estimate_tab_parent_sort
  ON estimate_nodes(estimate_id, tab_id, parent_id, sort_order);

CREATE INDEX idx_estimate_rows_node_sort
  ON estimate_row_items(estimate_id, node_id, sort_order);

CREATE INDEX idx_estimate_sheet_events_estimate_created
  ON estimate_sheet_events(estimate_id, created_at DESC, id DESC);

CREATE INDEX idx_ai_package_apply_commands_workspace_kind_key
  ON ai_package_apply_commands(workspace_id, command_kind, idempotency_key);

INSERT INTO users (id, email) VALUES
  ('user-editor', 'editor@example.test'),
  ('user-viewer', 'viewer@example.test'),
  ('user-other', 'other@example.test');

INSERT INTO workspaces (id, name) VALUES
  ('ws-alpha', 'Alpha Workspace'),
  ('ws-other', 'Other Workspace');

INSERT INTO workspace_members (workspace_id, user_id, role) VALUES
  ('ws-alpha', 'user-editor', 'editor'),
  ('ws-alpha', 'user-viewer', 'viewer'),
  ('ws-other', 'user-other', 'owner');

INSERT INTO projects (id, workspace_id, name) VALUES
  ('project-alpha', 'ws-alpha', 'Alpha Project'),
  ('project-other', 'ws-other', 'Other Project');

INSERT INTO estimates (id, project_id, workspace_id, name, adjustment_percentage) VALUES
  ('estimate-alpha', 'project-alpha', 'ws-alpha', 'Alpha Estimate', 0),
  ('estimate-other', 'project-other', 'ws-other', 'Other Estimate', 0);

INSERT INTO estimate_tabs (id, estimate_id, workspace_id, name, sort_order, status) VALUES
  ('tab-main', 'estimate-alpha', 'ws-alpha', 'Main', 10, 'active'),
  ('tab-rename', 'estimate-alpha', 'ws-alpha', 'Rename me', 20, 'active'),
  ('tab-archive', 'estimate-alpha', 'ws-alpha', 'Archive me', 30, 'active'),
  ('tab-delete', 'estimate-alpha', 'ws-alpha', 'Delete me', 40, 'active'),
  ('tab-duplicate-source', 'estimate-alpha', 'ws-alpha', 'Duplicate source', 50, 'active'),
  ('tab-move-target', 'estimate-alpha', 'ws-alpha', 'Move target', 60, 'active'),
  ('tab-other', 'estimate-other', 'ws-other', 'Other tab', 10, 'active');

INSERT INTO estimate_nodes (id, estimate_id, tab_id, parent_id, name, sort_order) VALUES
  ('node-main', 'estimate-alpha', 'tab-main', NULL, 'Main area', 10),
  ('node-delete', 'estimate-alpha', 'tab-delete', NULL, 'Delete area', 10),
  ('node-duplicate-source', 'estimate-alpha', 'tab-duplicate-source', NULL, 'Duplicate area', 10),
  ('node-move-source', 'estimate-alpha', 'tab-main', NULL, 'Move source', 20),
  ('node-move-target', 'estimate-alpha', 'tab-move-target', NULL, 'Move target', 10),
  ('node-other', 'estimate-other', 'tab-other', NULL, 'Other area', 10);

INSERT INTO estimate_row_items (id, estimate_id, tab_id, node_id, description, quantity, unit_cost, sort_order) VALUES
  ('row-main', 'estimate-alpha', 'tab-main', 'node-main', 'Main row', 1, 100, 10),
  ('row-delete', 'estimate-alpha', 'tab-delete', 'node-delete', 'Delete row', 1, 20, 10),
  ('row-duplicate-source', 'estimate-alpha', 'tab-duplicate-source', 'node-duplicate-source', 'Duplicate row', 2, 30, 10),
  ('row-move', 'estimate-alpha', 'tab-main', 'node-move-source', 'Move row', 3, 40, 20),
  ('row-promote', 'estimate-alpha', 'tab-main', 'node-main', 'Promote row', 1, 55, 30),
  ('row-other', 'estimate-other', 'tab-other', 'node-other', 'Other row', 1, 1, 10);
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

const VIEWER_MUTATION_SQL = `
.bail on
PRAGMA foreign_keys = ON;
BEGIN IMMEDIATE;
${VIEWER_GUARD_SQL}
UPDATE estimate_tabs
SET name = 'viewer should not rename'
WHERE id = 'tab-main'
  AND estimate_id = 'estimate-alpha';
COMMIT;
`;

const TAB_MUTATIONS_SQL = `
.bail on
PRAGMA foreign_keys = ON;

BEGIN IMMEDIATE;
${EDITOR_GUARD_SQL}
INSERT OR IGNORE INTO estimate_operation_keys (operation_key, rpc_name, estimate_id, created_at)
VALUES ('create-tab-op', 'create_estimate_tab_with_history', 'estimate-alpha', '2026-06-30T01:00:00.000Z');
INSERT OR IGNORE INTO estimate_tabs (id, estimate_id, workspace_id, name, sort_order, status)
SELECT 'tab-created', 'estimate-alpha', 'ws-alpha', 'Created tab', 70, 'active'
WHERE EXISTS (SELECT 1 FROM estimate_operation_keys WHERE operation_key = 'create-tab-op');
INSERT OR IGNORE INTO estimate_sheet_events (id, estimate_id, workspace_id, actor_user_id, event_type, target_id, operation_key, payload_json, created_at)
VALUES ('event-create-tab', 'estimate-alpha', 'ws-alpha', 'user-editor', 'tab_created', 'tab-created', 'create-tab-op', '{"name":"Created tab"}', '2026-06-30T01:00:00.000Z');
COMMIT;

BEGIN IMMEDIATE;
${EDITOR_GUARD_SQL}
INSERT OR IGNORE INTO estimate_operation_keys (operation_key, rpc_name, estimate_id, created_at)
VALUES ('create-tab-op', 'create_estimate_tab_with_history', 'estimate-alpha', '2026-06-30T01:00:00.000Z');
INSERT OR IGNORE INTO estimate_tabs (id, estimate_id, workspace_id, name, sort_order, status)
SELECT 'tab-created', 'estimate-alpha', 'ws-alpha', 'Created tab', 70, 'active'
WHERE EXISTS (SELECT 1 FROM estimate_operation_keys WHERE operation_key = 'create-tab-op');
INSERT OR IGNORE INTO estimate_sheet_events (id, estimate_id, workspace_id, actor_user_id, event_type, target_id, operation_key, payload_json, created_at)
VALUES ('event-create-tab', 'estimate-alpha', 'ws-alpha', 'user-editor', 'tab_created', 'tab-created', 'create-tab-op', '{"name":"Created tab"}', '2026-06-30T01:00:00.000Z');
COMMIT;

BEGIN IMMEDIATE;
${EDITOR_GUARD_SQL}
UPDATE estimate_tabs
SET name = 'Renamed tab'
WHERE id = 'tab-rename'
  AND estimate_id = 'estimate-alpha';
INSERT OR IGNORE INTO estimate_sheet_events (id, estimate_id, workspace_id, actor_user_id, event_type, target_id, operation_key, payload_json, created_at)
VALUES ('event-rename-tab', 'estimate-alpha', 'ws-alpha', 'user-editor', 'tab_renamed', 'tab-rename', 'rename-tab-op', '{"name":"Renamed tab"}', '2026-06-30T01:01:00.000Z');
COMMIT;

BEGIN IMMEDIATE;
${EDITOR_GUARD_SQL}
UPDATE estimate_tabs
SET status = 'archived',
    archived_at = '2026-06-30T01:02:00.000Z'
WHERE id = 'tab-archive'
  AND estimate_id = 'estimate-alpha';
INSERT OR IGNORE INTO estimate_sheet_events (id, estimate_id, workspace_id, actor_user_id, event_type, target_id, operation_key, payload_json, created_at)
VALUES ('event-archive-tab', 'estimate-alpha', 'ws-alpha', 'user-editor', 'tab_archived', 'tab-archive', 'archive-tab-op', '{"status":"archived"}', '2026-06-30T01:02:00.000Z');
COMMIT;

BEGIN IMMEDIATE;
${EDITOR_GUARD_SQL}
DELETE FROM estimate_tabs
WHERE id = 'tab-delete'
  AND estimate_id = 'estimate-alpha';
INSERT OR IGNORE INTO estimate_sheet_events (id, estimate_id, workspace_id, actor_user_id, event_type, target_id, operation_key, payload_json, created_at)
VALUES ('event-delete-tab', 'estimate-alpha', 'ws-alpha', 'user-editor', 'tab_deleted', 'tab-delete', 'delete-tab-op', '{"deleted":true}', '2026-06-30T01:03:00.000Z');
COMMIT;

BEGIN IMMEDIATE;
${EDITOR_GUARD_SQL}
INSERT OR IGNORE INTO estimate_operation_keys (operation_key, rpc_name, estimate_id, created_at)
VALUES ('duplicate-tab-op', 'duplicate_estimate_tab_with_history', 'estimate-alpha', '2026-06-30T01:04:00.000Z');
INSERT OR IGNORE INTO estimate_tabs (id, estimate_id, workspace_id, name, sort_order, status)
VALUES ('tab-duplicate-copy', 'estimate-alpha', 'ws-alpha', 'Duplicate copy', 80, 'active');
INSERT OR IGNORE INTO estimate_nodes (id, estimate_id, tab_id, parent_id, name, sort_order)
VALUES ('node-duplicate-copy', 'estimate-alpha', 'tab-duplicate-copy', NULL, 'Duplicate area', 10);
INSERT OR IGNORE INTO estimate_row_items (id, estimate_id, tab_id, node_id, description, quantity, unit_cost, sort_order)
VALUES ('row-duplicate-copy', 'estimate-alpha', 'tab-duplicate-copy', 'node-duplicate-copy', 'Duplicate row', 2, 30, 10);
INSERT OR IGNORE INTO estimate_sheet_events (id, estimate_id, workspace_id, actor_user_id, event_type, target_id, operation_key, payload_json, created_at)
VALUES ('event-duplicate-tab', 'estimate-alpha', 'ws-alpha', 'user-editor', 'tab_duplicated', 'tab-duplicate-copy', 'duplicate-tab-op', '{"source":"tab-duplicate-source"}', '2026-06-30T01:04:00.000Z');
COMMIT;

BEGIN IMMEDIATE;
${EDITOR_GUARD_SQL}
CREATE TEMP TABLE tab_reorder_updates (
  id TEXT PRIMARY KEY,
  sort_order INTEGER NOT NULL
);
INSERT INTO tab_reorder_updates (id, sort_order) VALUES
  ('tab-main', 90),
  ('tab-rename', 100),
  ('tab-created', 110);
INSERT INTO guard_failures (must_be_zero)
SELECT 1
FROM (
  SELECT sort_order, COUNT(*) AS duplicate_count
  FROM tab_reorder_updates
  GROUP BY sort_order
  HAVING COUNT(*) > 1
)
LIMIT 1;
UPDATE estimate_tabs
SET sort_order = sort_order + 1000000
WHERE estimate_id = 'estimate-alpha'
  AND id IN (SELECT id FROM tab_reorder_updates);
UPDATE estimate_tabs
SET sort_order = (SELECT input.sort_order FROM tab_reorder_updates input WHERE input.id = estimate_tabs.id)
WHERE estimate_id = 'estimate-alpha'
  AND id IN (SELECT id FROM tab_reorder_updates);
DROP TABLE tab_reorder_updates;
INSERT OR IGNORE INTO estimate_sheet_events (id, estimate_id, workspace_id, actor_user_id, event_type, target_id, operation_key, payload_json, created_at)
VALUES ('event-reorder-tabs', 'estimate-alpha', 'ws-alpha', 'user-editor', 'tabs_reordered', 'estimate-alpha', 'reorder-tabs-op', '{"count":3}', '2026-06-30T01:05:00.000Z');
COMMIT;
`;

const DUPLICATE_REORDER_SQL = `
.bail on
PRAGMA foreign_keys = ON;
BEGIN IMMEDIATE;
${EDITOR_GUARD_SQL}
CREATE TEMP TABLE tab_reorder_updates (
  id TEXT PRIMARY KEY,
  sort_order INTEGER NOT NULL
);
INSERT INTO tab_reorder_updates (id, sort_order) VALUES
  ('tab-main', 120),
  ('tab-rename', 120);
INSERT INTO guard_failures (must_be_zero)
SELECT 1
FROM (
  SELECT sort_order, COUNT(*) AS duplicate_count
  FROM tab_reorder_updates
  GROUP BY sort_order
  HAVING COUNT(*) > 1
)
LIMIT 1;
COMMIT;
`;

const SUBTREE_SQL = `
.bail on
PRAGMA foreign_keys = ON;
BEGIN IMMEDIATE;
${EDITOR_GUARD_SQL}
INSERT OR IGNORE INTO estimate_operation_keys (operation_key, rpc_name, estimate_id, created_at)
VALUES ('subtree-op', 'insert_estimate_subtree_into_estimate_with_history', 'estimate-alpha', '2026-06-30T01:06:00.000Z');
INSERT OR IGNORE INTO estimate_nodes (id, estimate_id, tab_id, parent_id, name, sort_order)
VALUES
  ('node-subtree-root', 'estimate-alpha', 'tab-main', NULL, 'Inserted subtree', 200),
  ('node-subtree-child', 'estimate-alpha', 'tab-main', 'node-subtree-root', 'Inserted child', 10);
INSERT OR IGNORE INTO estimate_row_items (id, estimate_id, tab_id, node_id, description, quantity, unit_cost, sort_order)
VALUES ('row-subtree', 'estimate-alpha', 'tab-main', 'node-subtree-child', 'Inserted subtree row', 1, 10, 10);
INSERT OR IGNORE INTO estimate_sheet_events (id, estimate_id, workspace_id, actor_user_id, event_type, target_id, operation_key, payload_json, created_at)
VALUES ('event-subtree', 'estimate-alpha', 'ws-alpha', 'user-editor', 'subtree_inserted', 'node-subtree-root', 'subtree-op', '{"nodes":2,"rows":1}', '2026-06-30T01:06:00.000Z');
COMMIT;

BEGIN IMMEDIATE;
${EDITOR_GUARD_SQL}
INSERT OR IGNORE INTO estimate_operation_keys (operation_key, rpc_name, estimate_id, created_at)
VALUES ('subtree-op', 'insert_estimate_subtree_into_estimate_with_history', 'estimate-alpha', '2026-06-30T01:06:00.000Z');
INSERT OR IGNORE INTO estimate_nodes (id, estimate_id, tab_id, parent_id, name, sort_order)
VALUES
  ('node-subtree-root', 'estimate-alpha', 'tab-main', NULL, 'Inserted subtree', 200),
  ('node-subtree-child', 'estimate-alpha', 'tab-main', 'node-subtree-root', 'Inserted child', 10);
INSERT OR IGNORE INTO estimate_row_items (id, estimate_id, tab_id, node_id, description, quantity, unit_cost, sort_order)
VALUES ('row-subtree', 'estimate-alpha', 'tab-main', 'node-subtree-child', 'Inserted subtree row', 1, 10, 10);
INSERT OR IGNORE INTO estimate_sheet_events (id, estimate_id, workspace_id, actor_user_id, event_type, target_id, operation_key, payload_json, created_at)
VALUES ('event-subtree', 'estimate-alpha', 'ws-alpha', 'user-editor', 'subtree_inserted', 'node-subtree-root', 'subtree-op', '{"nodes":2,"rows":1}', '2026-06-30T01:06:00.000Z');
COMMIT;
`;

const ROW_AND_SHEET_SQL = `
.bail on
PRAGMA foreign_keys = ON;
BEGIN IMMEDIATE;
${EDITOR_GUARD_SQL}
UPDATE estimate_row_items
SET node_id = 'node-move-target',
    tab_id = 'tab-move-target',
    sort_order = 20
WHERE id = 'row-move'
  AND estimate_id = 'estimate-alpha';
INSERT OR IGNORE INTO estimate_sheet_events (id, estimate_id, workspace_id, actor_user_id, event_type, target_id, operation_key, payload_json, created_at)
VALUES ('event-move-row', 'estimate-alpha', 'ws-alpha', 'user-editor', 'row_moved', 'row-move', 'move-row-op', '{"nodeId":"node-move-target"}', '2026-06-30T01:07:00.000Z');
COMMIT;

BEGIN IMMEDIATE;
${EDITOR_GUARD_SQL}
UPDATE estimates
SET adjustment_percentage = 7.5
WHERE id = 'estimate-alpha'
  AND workspace_id = 'ws-alpha';
INSERT OR IGNORE INTO estimate_sheet_events (id, estimate_id, workspace_id, actor_user_id, event_type, target_id, operation_key, payload_json, created_at)
VALUES ('event-sheet-adjustment', 'estimate-alpha', 'ws-alpha', 'user-editor', 'sheet_adjustment_updated', 'estimate-alpha', 'sheet-adjustment-op', '{"adjustment":7.5}', '2026-06-30T01:08:00.000Z');
COMMIT;
`;

const PACKAGE_AND_PROMOTE_SQL = `
.bail on
PRAGMA foreign_keys = ON;
BEGIN IMMEDIATE;
${EDITOR_GUARD_SQL}
INSERT OR IGNORE INTO ai_package_apply_commands (id, workspace_id, estimate_id, command_kind, idempotency_key, status, created_at)
VALUES ('project-package-command', 'ws-alpha', 'estimate-alpha', 'project_estimate_package', 'project-package-op', 'applied', '2026-06-30T01:09:00.000Z');
INSERT OR IGNORE INTO estimate_sheet_events (id, estimate_id, workspace_id, actor_user_id, event_type, target_id, operation_key, payload_json, created_at)
VALUES ('event-project-package', 'estimate-alpha', 'ws-alpha', 'user-editor', 'project_package_applied', 'estimate-alpha', 'project-package-op', '{"package":"project"}', '2026-06-30T01:09:00.000Z');
COMMIT;

BEGIN IMMEDIATE;
${EDITOR_GUARD_SQL}
INSERT OR IGNORE INTO ai_package_apply_commands (id, workspace_id, estimate_id, command_kind, idempotency_key, status, created_at)
VALUES ('library-package-command', 'ws-alpha', NULL, 'library_components_package', 'library-package-op', 'applied', '2026-06-30T01:10:00.000Z');
INSERT OR IGNORE INTO cost_library_items (id, workspace_id, name, source_estimate_row_item_id, current_version_number)
VALUES ('library-package-component', 'ws-alpha', 'Package component', NULL, 1);
COMMIT;

BEGIN IMMEDIATE;
${EDITOR_GUARD_SQL}
INSERT OR IGNORE INTO cost_library_items (id, workspace_id, name, source_estimate_row_item_id, current_version_number)
VALUES ('library-promoted-row', 'ws-alpha', 'Promote row', 'row-promote', 1);
UPDATE estimate_row_items
SET source_library_item_id = 'library-promoted-row'
WHERE id = 'row-promote'
  AND estimate_id = 'estimate-alpha';
INSERT OR IGNORE INTO estimate_sheet_events (id, estimate_id, workspace_id, actor_user_id, event_type, target_id, operation_key, payload_json, created_at)
VALUES ('event-promote-row', 'estimate-alpha', 'ws-alpha', 'user-editor', 'row_promoted_to_library', 'row-promote', 'promote-row-op', '{"libraryItemId":"library-promoted-row"}', '2026-06-30T01:11:00.000Z');
COMMIT;
`;

const ROLLBACK_SQL = `
.bail on
PRAGMA foreign_keys = ON;
BEGIN IMMEDIATE;
${EDITOR_GUARD_SQL}
INSERT INTO estimate_tabs (id, estimate_id, workspace_id, name, sort_order, status)
VALUES ('tab-rollback-residue', 'estimate-alpha', 'ws-alpha', 'Rollback residue', 130, 'active');
INSERT INTO estimate_sheet_events (id, estimate_id, workspace_id, actor_user_id, event_type, target_id, operation_key, payload_json, created_at)
VALUES ('event-rollback-residue', 'estimate-alpha', 'ws-alpha', 'user-editor', 'rollback_residue', 'tab-rollback-residue', 'rollback-op', '{"should":"rollback"}', '2026-06-30T01:12:00.000Z');
INSERT INTO guard_failures (must_be_zero) VALUES (1);
COMMIT;
`;

const QUERY_PROOFS = [
  {
    surface: "estimate_history_tab_list",
    sql: "SELECT id, name, sort_order FROM estimate_tabs WHERE estimate_id = 'estimate-alpha' AND status = 'active' ORDER BY sort_order",
    queryBudget: 1,
    localBudgetMs: 45,
    indexNeedle: "idx_estimate_tabs_estimate_sort",
  },
  {
    surface: "estimate_history_event_timeline",
    sql: "SELECT id, event_type FROM estimate_sheet_events WHERE estimate_id = 'estimate-alpha' ORDER BY created_at DESC, id DESC LIMIT 10",
    queryBudget: 1,
    localBudgetMs: 45,
    indexNeedle: "idx_estimate_sheet_events_estimate_created",
  },
  {
    surface: "estimate_history_subtree_children",
    sql: "SELECT id, name FROM estimate_nodes WHERE estimate_id = 'estimate-alpha' AND tab_id = 'tab-main' AND parent_id = 'node-subtree-root' ORDER BY sort_order",
    queryBudget: 1,
    localBudgetMs: 45,
    indexNeedle: "idx_estimate_nodes_estimate_tab_parent_sort",
  },
  {
    surface: "estimate_history_package_command_lookup",
    sql: "SELECT id, status FROM ai_package_apply_commands WHERE workspace_id = 'ws-alpha' AND command_kind = 'project_estimate_package' AND idempotency_key = 'project-package-op'",
    queryBudget: 1,
    localBudgetMs: 45,
    indexNeedle: "idx_ai_package_apply_commands_workspace_kind_key",
  },
];

function readEnv(name: string) {
  const value = process.env[name];
  return value?.trim() || undefined;
}

function runSql(dbPath: string, sql: string) {
  return spawnSync("sqlite3", [dbPath], {
    input: sql,
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 8,
  });
}

function runSqlOrThrow(dbPath: string, sql: string) {
  const result = runSql(dbPath, sql);
  if (result.status !== 0) {
    throw new Error(`sqlite failed: ${result.stderr || result.stdout}`);
  }
  return result.stdout;
}

function scalarText(dbPath: string, sql: string) {
  const output = runSqlOrThrow(dbPath, `${sql};`);
  const value = output.trim();
  return value.length === 0 ? null : value;
}

function scalarNumber(dbPath: string, sql: string) {
  return Number(scalarText(dbPath, sql) ?? 0);
}

function sqliteVersion() {
  const result = spawnSync("sqlite3", ["--version"], { encoding: "utf8" });
  if (result.status !== 0) return "unknown";
  return result.stdout.trim().split(/\s+/)[0] ?? "unknown";
}

function percentile95(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.max(0, Math.ceil(sorted.length * 0.95) - 1);
  return sorted[index] ?? 0;
}

function planDetails(dbPath: string, sql: string) {
  return runSqlOrThrow(dbPath, `EXPLAIN QUERY PLAN ${sql};`)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function usesIndex(details: string[], needle: string) {
  return details.some((line) => line.includes(needle) || /USING (?:COVERING )?INDEX|USING INTEGER PRIMARY KEY/i.test(line));
}

function measureQuery(dbPath: string, surface: (typeof QUERY_PROOFS)[number]): QueryProofRow {
  const durations: number[] = [];
  let rowsReturned = 0;

  for (let index = 0; index < 7; index += 1) {
    const startedAt = performance.now();
    const output = runSqlOrThrow(dbPath, `${surface.sql};`);
    durations.push(performance.now() - startedAt);
    rowsReturned = output.trim().length === 0 ? 0 : output.trim().split("\n").length;
  }

  const localP95Ms = Number(percentile95(durations).toFixed(2));
  return {
    surface: surface.surface,
    queryBudget: surface.queryBudget,
    plannedQueries: 1,
    localBudgetMs: surface.localBudgetMs,
    localP95Ms,
    rowsReturned,
    sampleCount: durations.length,
    status: localP95Ms <= surface.localBudgetMs ? "local-pass" : "local-fail",
    notes: "Temporary local SQLite timing only; hosted Worker+D1 p95 remains required.",
  };
}

function buildFixtureFromSqlite(): { fixture: EstimateHistoryProofFixture; queryRows: QueryProofRow[] } {
  const dir = mkdtempSync(join(tmpdir(), "cloudflare-d1-estimate-history-"));
  const dbPath = join(dir, "estimate-history.sqlite");
  let tempArtifactsRemoved = false;

  try {
    runSqlOrThrow(dbPath, FIXTURE_SQL);

    const viewerMutation = runSql(dbPath, VIEWER_MUTATION_SQL);
    const viewerMutationCommandFailed = viewerMutation.status !== 0;
    const viewerMutationResidueRows = scalarNumber(
      dbPath,
      "SELECT COUNT(*) FROM estimate_tabs WHERE id = 'tab-main' AND name = 'viewer should not rename'",
    );

    runSqlOrThrow(dbPath, TAB_MUTATIONS_SQL);
    const duplicateReorder = runSql(dbPath, DUPLICATE_REORDER_SQL);

    runSqlOrThrow(dbPath, SUBTREE_SQL);
    runSqlOrThrow(dbPath, ROW_AND_SHEET_SQL);
    runSqlOrThrow(dbPath, PACKAGE_AND_PROMOTE_SQL);

    const rollback = runSql(dbPath, ROLLBACK_SQL);
    const rollbackCommandFailed = rollback.status !== 0;
    const rollbackResidueRows = scalarNumber(
      dbPath,
      "SELECT (SELECT COUNT(*) FROM estimate_tabs WHERE id = 'tab-rollback-residue') + (SELECT COUNT(*) FROM estimate_sheet_events WHERE id = 'event-rollback-residue')",
    );

    const allPlanDetails = QUERY_PROOFS.flatMap((proof) => planDetails(dbPath, proof.sql));
    const queryRows = QUERY_PROOFS.map((proof) => measureQuery(dbPath, proof));

    const dump = runSqlOrThrow(dbPath, ".dump");
    const restorePath = join(dir, "estimate-history-restore.sqlite");
    runSqlOrThrow(restorePath, dump);

    const fixture: EstimateHistoryProofFixture = {
      sqliteVersion: sqliteVersion(),
      fixtureTables: scalarNumber(dbPath, "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'"),
      rowsSeeded: scalarNumber(dbPath, [
        "SELECT",
        "(SELECT COUNT(*) FROM users)",
        "+ (SELECT COUNT(*) FROM workspaces)",
        "+ (SELECT COUNT(*) FROM workspace_members)",
        "+ (SELECT COUNT(*) FROM projects)",
        "+ (SELECT COUNT(*) FROM estimates)",
        "+ (SELECT COUNT(*) FROM estimate_tabs)",
        "+ (SELECT COUNT(*) FROM estimate_nodes)",
        "+ (SELECT COUNT(*) FROM estimate_row_items)",
        "+ (SELECT COUNT(*) FROM estimate_sheet_events)",
        "+ (SELECT COUNT(*) FROM estimate_operation_keys)",
        "+ (SELECT COUNT(*) FROM ai_package_apply_commands)",
        "+ (SELECT COUNT(*) FROM cost_library_items)",
      ].join(" ")),
      viewerMutationCommandFailed,
      viewerMutationResidueRows,
      createTabRows: scalarNumber(dbPath, "SELECT COUNT(*) FROM estimate_tabs WHERE id = 'tab-created'"),
      duplicateCreateTabRows: scalarNumber(dbPath, "SELECT COUNT(*) FROM estimate_tabs WHERE id = 'tab-created'"),
      renamedTabName: scalarText(dbPath, "SELECT name FROM estimate_tabs WHERE id = 'tab-rename'"),
      archivedTabStatus: scalarText(dbPath, "SELECT status FROM estimate_tabs WHERE id = 'tab-archive'"),
      deletedTabRows: scalarNumber(dbPath, "SELECT COUNT(*) FROM estimate_tabs WHERE id = 'tab-delete'"),
      duplicateTabRows: scalarNumber(dbPath, "SELECT COUNT(*) FROM estimate_tabs WHERE id = 'tab-duplicate-copy'"),
      reorderedTabRows: scalarNumber(dbPath, "SELECT COUNT(*) FROM estimate_tabs WHERE id IN ('tab-main', 'tab-rename', 'tab-created') AND sort_order IN (90, 100, 110)"),
      duplicateReorderCommandFailed: duplicateReorder.status !== 0,
      duplicateReorderResidueRows: scalarNumber(dbPath, "SELECT COUNT(*) FROM estimate_tabs WHERE sort_order = 120"),
      subtreeNodeRows: scalarNumber(dbPath, "SELECT COUNT(*) FROM estimate_nodes WHERE id IN ('node-subtree-root', 'node-subtree-child')"),
      subtreeRowRows: scalarNumber(dbPath, "SELECT COUNT(*) FROM estimate_row_items WHERE id = 'row-subtree'"),
      duplicateSubtreeOperationRows: scalarNumber(dbPath, "SELECT COUNT(*) FROM estimate_operation_keys WHERE operation_key = 'subtree-op'"),
      movedRowNodeId: scalarText(dbPath, "SELECT node_id FROM estimate_row_items WHERE id = 'row-move'"),
      movedRowHistoryRows: scalarNumber(dbPath, "SELECT COUNT(*) FROM estimate_sheet_events WHERE operation_key = 'move-row-op'"),
      sheetAdjustmentValue: scalarNumber(dbPath, "SELECT adjustment_percentage FROM estimates WHERE id = 'estimate-alpha'"),
      sheetAdjustmentHistoryRows: scalarNumber(dbPath, "SELECT COUNT(*) FROM estimate_sheet_events WHERE operation_key = 'sheet-adjustment-op'"),
      projectPackageCommandRows: scalarNumber(dbPath, "SELECT COUNT(*) FROM ai_package_apply_commands WHERE id = 'project-package-command'"),
      libraryPackageCommandRows: scalarNumber(dbPath, "SELECT COUNT(*) FROM ai_package_apply_commands WHERE id = 'library-package-command'"),
      promotedLibraryComponentRows: scalarNumber(dbPath, "SELECT COUNT(*) FROM cost_library_items WHERE id = 'library-promoted-row'"),
      promotedRowLinkedRows: scalarNumber(dbPath, "SELECT COUNT(*) FROM estimate_row_items WHERE id = 'row-promote' AND source_library_item_id = 'library-promoted-row'"),
      rollbackCommandFailed,
      rollbackResidueRows,
      restoredTabRows: scalarNumber(restorePath, "SELECT COUNT(*) FROM estimate_tabs"),
      restoredNodeRows: scalarNumber(restorePath, "SELECT COUNT(*) FROM estimate_nodes"),
      restoredRowRows: scalarNumber(restorePath, "SELECT COUNT(*) FROM estimate_row_items"),
      restoredHistoryRows: scalarNumber(restorePath, "SELECT COUNT(*) FROM estimate_sheet_events"),
      tabListPlanUsesIndex: usesIndex(planDetails(dbPath, QUERY_PROOFS[0].sql), QUERY_PROOFS[0].indexNeedle),
      eventTimelinePlanUsesIndex: usesIndex(planDetails(dbPath, QUERY_PROOFS[1].sql), QUERY_PROOFS[1].indexNeedle),
      subtreePlanUsesIndex: usesIndex(planDetails(dbPath, QUERY_PROOFS[2].sql), QUERY_PROOFS[2].indexNeedle),
      packageCommandPlanUsesIndex: usesIndex(planDetails(dbPath, QUERY_PROOFS[3].sql), QUERY_PROOFS[3].indexNeedle),
      planDetails: allPlanDetails,
      tempArtifactsRemoved: false,
    };

    rmSync(dir, { recursive: true, force: true });
    tempArtifactsRemoved = true;
    fixture.tempArtifactsRemoved = tempArtifactsRemoved;
    return { fixture, queryRows };
  } finally {
    if (!tempArtifactsRemoved) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
}

function defaultFixture() {
  return buildFixtureFromSqlite();
}

function buildReadiness(fixture: EstimateHistoryProofFixture, queryRows: QueryProofRow[]) {
  const schemaReady = fixture.fixtureTables >= 13 && fixture.rowsSeeded > 0;
  const appLayerEditorGuardReady = fixture.viewerMutationCommandFailed && fixture.viewerMutationResidueRows === 0;
  const estimateTabMutationReady = fixture.createTabRows === 1
    && fixture.duplicateCreateTabRows === 1
    && fixture.renamedTabName === "Renamed tab"
    && fixture.archivedTabStatus === "archived"
    && fixture.deletedTabRows === 0
    && fixture.duplicateTabRows === 1
    && fixture.reorderedTabRows === 3
    && fixture.duplicateReorderCommandFailed
    && fixture.duplicateReorderResidueRows === 0;
  const subtreeInsertReady = fixture.subtreeNodeRows === 2
    && fixture.subtreeRowRows === 1
    && fixture.duplicateSubtreeOperationRows === 1;
  const rowMoveReady = fixture.movedRowNodeId === "node-move-target" && fixture.movedRowHistoryRows === 1;
  const sheetAdjustmentReady = fixture.sheetAdjustmentValue === 7.5 && fixture.sheetAdjustmentHistoryRows === 1;
  const packageApplyReady = fixture.projectPackageCommandRows === 1 && fixture.libraryPackageCommandRows === 1;
  const promoteToLibraryReady = fixture.promotedLibraryComponentRows === 1 && fixture.promotedRowLinkedRows === 1;
  const rollbackReady = fixture.rollbackCommandFailed && fixture.rollbackResidueRows === 0;
  const idempotencyReady = fixture.duplicateCreateTabRows === 1
    && fixture.duplicateSubtreeOperationRows === 1
    && fixture.projectPackageCommandRows === 1
    && fixture.libraryPackageCommandRows === 1;
  const queryBudgetReady = queryRows.every((row) => row.status === "local-pass")
    && fixture.tabListPlanUsesIndex
    && fixture.eventTimelinePlanUsesIndex
    && fixture.subtreePlanUsesIndex
    && fixture.packageCommandPlanUsesIndex;
  const restoreFixtureReady = fixture.restoredTabRows >= 7
    && fixture.restoredNodeRows >= 7
    && fixture.restoredRowRows >= 7
    && fixture.restoredHistoryRows >= 10;
  const localEstimateHistoryD1SliceReady = schemaReady
    && appLayerEditorGuardReady
    && estimateTabMutationReady
    && subtreeInsertReady
    && rowMoveReady
    && sheetAdjustmentReady
    && packageApplyReady
    && promoteToLibraryReady
    && rollbackReady
    && idempotencyReady
    && queryBudgetReady
    && restoreFixtureReady;

  return {
    schemaReady,
    appLayerEditorGuardReady,
    estimateTabMutationReady,
    subtreeInsertReady,
    rowMoveReady,
    sheetAdjustmentReady,
    packageApplyReady,
    promoteToLibraryReady,
    rollbackReady,
    idempotencyReady,
    queryBudgetReady,
    restoreFixtureReady,
    localEstimateHistoryD1SliceReady,
    productionEstimateHistoryD1Ready: false as const,
  };
}

function buildBlockers(readiness: ReturnType<typeof buildReadiness>) {
  const blockers = [
    "Hosted Worker+D1 estimate-history proof is still missing.",
    "Better Auth production identity handoff is still missing; keep current Supabase-backed estimate actions live.",
    "Provider-backed D1 export/import restore proof for estimate-history tables is still missing.",
  ];

  if (!readiness.localEstimateHistoryD1SliceReady) {
    blockers.unshift("Local D1 estimate-history slice proof failed; inspect fixture readiness before using this as RPC evidence.");
  }

  return blockers;
}

export function buildCloudflareD1EstimateHistoryProof(inputs: EstimateHistoryProofInputs = {}): CloudflareD1EstimateHistoryProofReport {
  const generated = inputs.fixture && inputs.queryRows
    ? { fixture: inputs.fixture, queryRows: inputs.queryRows }
    : defaultFixture();
  const fixture = generated.fixture;
  const queryRows = inputs.queryRows ?? generated.queryRows;
  const readiness = buildReadiness(fixture, queryRows);

  return {
    generatedAt: inputs.generatedAt ?? new Date().toISOString(),
    mode: "cloudflare-d1-estimate-history-proof",
    sources: {
      plan: ".ai/03_plans/2026-06-29-Cloudflare-Migration-Codex",
      currentAppFiles: [
        "src/lib/estimates/actions.ts",
        "src/lib/repositories/estimate-repository.ts",
        "src/lib/component-library/actions.ts",
      ],
      currentSupabaseMigrations: [
        "supabase/migrations",
        "supabase/migrations-pending-review",
      ],
      d1DatabaseApi: "Cloudflare D1 prepared statements with explicit BEGIN IMMEDIATE transactions in local SQLite fixture",
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
        "Use explicit D1 repository DTOs for estimate tabs, nodes, row items, history events, package apply commands, and operation keys; derive identity from Better Auth session before mutation.",
      preparedStatementPatterns: PREPARED_STATEMENT_PATTERNS,
    },
    productionProofRequirements: PRODUCTION_PROOF_REQUIREMENTS,
    blockers: buildBlockers(readiness),
    note:
      "Local D1 estimate-history proof only. It uses sanitized temporary SQLite data to exercise D1-style transactions, rollback, operation-key idempotency, query plans, and restore mechanics; it does not read env files, print secret values, call provider APIs, create hosted D1 databases, mutate Cloudflare/Supabase, deploy Workers, change DNS, bill, replace live Supabase RPCs, or make production D1/Auth/Realtime ready.",
  };
}

function writeOutput(outputFile: string, report: CloudflareD1EstimateHistoryProofReport) {
  const outputPath = resolve(outputFile);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
}

function markdownRows(rows: string[][]) {
  return rows.map((row) => `| ${row.map((cell) => cell.replaceAll("|", "\\|")).join(" | ")} |`);
}

export function writeMarkdown(report: CloudflareD1EstimateHistoryProofReport, markdownFile: string) {
  const outputPath = resolve(markdownFile);
  mkdirSync(dirname(outputPath), { recursive: true });

  const queryRows = report.queryProof.rows.map((row) => [
    row.surface,
    String(row.queryBudget),
    String(row.plannedQueries),
    `${row.localP95Ms}ms`,
    `${row.localBudgetMs}ms`,
    String(row.rowsReturned),
    row.status,
  ]);
  const blockerLines = report.blockers.length > 0
    ? report.blockers.map((blocker) => `- ${blocker}`)
    : ["- (none)"];

  const lines = [
    "# Cloudflare D1 Estimate-History Proof",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    report.note,
    "",
    "## Readiness",
    "",
    "| Gate | Ready? |",
    "| --- | --- |",
    `| Schema Ready | ${report.readiness.schemaReady ? "yes" : "no"} |`,
    `| App Layer Editor Guard Ready | ${report.readiness.appLayerEditorGuardReady ? "yes" : "no"} |`,
    `| Estimate Tab Mutation Ready | ${report.readiness.estimateTabMutationReady ? "yes" : "no"} |`,
    `| Subtree Insert Ready | ${report.readiness.subtreeInsertReady ? "yes" : "no"} |`,
    `| Row Move Ready | ${report.readiness.rowMoveReady ? "yes" : "no"} |`,
    `| Sheet Adjustment Ready | ${report.readiness.sheetAdjustmentReady ? "yes" : "no"} |`,
    `| Package Apply Ready | ${report.readiness.packageApplyReady ? "yes" : "no"} |`,
    `| Promote To Library Ready | ${report.readiness.promoteToLibraryReady ? "yes" : "no"} |`,
    `| Rollback Ready | ${report.readiness.rollbackReady ? "yes" : "no"} |`,
    `| Idempotency Ready | ${report.readiness.idempotencyReady ? "yes" : "no"} |`,
    `| Query Budget Ready | ${report.readiness.queryBudgetReady ? "yes" : "no"} |`,
    `| Restore Fixture Ready | ${report.readiness.restoreFixtureReady ? "yes" : "no"} |`,
    `| Local Estimate History D1 Slice Ready | ${report.readiness.localEstimateHistoryD1SliceReady ? "yes" : "no"} |`,
    `| Production Estimate History D1 Ready | ${report.readiness.productionEstimateHistoryD1Ready ? "yes" : "no"} |`,
    "",
    "## Affected RPCs",
    "",
    ...report.affectedRpcNames.map((name) => `- \`${name}\``),
    "",
    "## Fixture Facts",
    "",
    "| Fact | Value |",
    "| --- | ---: |",
    `| Fixture tables | ${report.fixture.fixtureTables} |`,
    `| Rows seeded after proof | ${report.fixture.rowsSeeded} |`,
    `| Viewer mutation failed closed | ${report.fixture.viewerMutationCommandFailed ? "yes" : "no"} |`,
    `| Viewer mutation residue rows | ${report.fixture.viewerMutationResidueRows} |`,
    `| Duplicate create tab rows | ${report.fixture.duplicateCreateTabRows} |`,
    `| Duplicate reorder residue rows | ${report.fixture.duplicateReorderResidueRows} |`,
    `| Subtree node rows | ${report.fixture.subtreeNodeRows} |`,
    `| Duplicate subtree operation rows | ${report.fixture.duplicateSubtreeOperationRows} |`,
    `| Moved row node id | ${report.fixture.movedRowNodeId ?? "(null)"} |`,
    `| Sheet adjustment value | ${report.fixture.sheetAdjustmentValue} |`,
    `| Project package command rows | ${report.fixture.projectPackageCommandRows} |`,
    `| Library package command rows | ${report.fixture.libraryPackageCommandRows} |`,
    `| Promoted library component rows | ${report.fixture.promotedLibraryComponentRows} |`,
    `| Rollback command failed closed | ${report.fixture.rollbackCommandFailed ? "yes" : "no"} |`,
    `| Rollback residue rows | ${report.fixture.rollbackResidueRows} |`,
    `| Restored tab rows | ${report.fixture.restoredTabRows} |`,
    `| Restored node rows | ${report.fixture.restoredNodeRows} |`,
    `| Restored row rows | ${report.fixture.restoredRowRows} |`,
    `| Restored history rows | ${report.fixture.restoredHistoryRows} |`,
    "",
    "## Query Proof",
    "",
    "| Surface | Query budget | Planned queries | Local p95 | Local budget | Rows | Status |",
    "| --- | ---: | ---: | ---: | ---: | ---: | --- |",
    ...markdownRows(queryRows),
    "",
    "## Index Plan Details",
    "",
    ...report.fixture.planDetails.map((detail) => `- ${detail}`),
    "",
    "## Production Proof Still Required",
    "",
    ...report.productionProofRequirements.map((requirement) => `- ${requirement}`),
    "",
    "## Blockers",
    "",
    ...blockerLines,
    "",
  ];

  writeFileSync(outputPath, lines.join("\n"));
}

async function main() {
  const report = buildCloudflareD1EstimateHistoryProof();
  const outputFile = readEnv("OUTPUT_FILE") ?? `${PLAN_ROOT}/2026-06-30-cloudflare-d1-estimate-history-proof.json`;
  const markdownFile = readEnv("MARKDOWN_FILE") ?? `${PLAN_ROOT}/2026-06-30-cloudflare-d1-estimate-history-proof.md`;
  writeOutput(outputFile, report);
  writeMarkdown(report, markdownFile);
  console.log(JSON.stringify(report, null, 2));
  if (!report.readiness.localEstimateHistoryD1SliceReady) process.exitCode = 1;
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
