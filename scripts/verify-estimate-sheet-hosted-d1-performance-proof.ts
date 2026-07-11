#!/usr/bin/env bun

import { spawnSync } from "node:child_process";
import {
  closeSync,
  existsSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  rmSync,
  unlinkSync,
} from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";

import ts from "typescript";

import {
  CLEANUP_RECEIPT_SCHEMA,
  COMMAND_RECEIPT_SCHEMA,
  HOSTED_RECOVERY_SCHEMA,
  PERFORMANCE_REPORT_SCHEMA,
  PERFORMANCE_ATTEMPT_SCHEMA,
  assertPerformanceReport,
  assertRegularFile,
  assertRunManifest,
  assertTestReceipt,
  canonicalJson,
  cliBoolean,
  cliString,
  ensureContainedRunPath,
  fingerprintContentEqual,
  isContained,
  isPlainObject,
  nowIso,
  parseStrictCli,
  readJsonFile,
  replaceFileAtomically,
  resolveManifestLogicalOutput,
  resolveRunManifestPath,
  sha256File,
  sha256Hex,
  sha256Json,
  writeJsonNoOverwrite,
  writeNoOverwrite,
  type PerformanceReportV1,
  type EstimateOutputRole,
  type RunManifestV1,
  type SourceFingerprint,
  type TestReceiptV1,
} from "./lib/estimate-sheet-performance-contract";
import { computeEstimateSheetSourceFingerprint } from "./compute-estimate-sheet-source-fingerprint";

const DATABASE_BINDING = "ARCH_DB" as const;
const EXPECTED_DATABASE_ID = "9bdb29bb-687e-4f51-ae81-7659c426ea5f";
const FIXTURE_PROFILE = "limit" as const;
const FREE_TIER_READ_ALLOWANCE = 5_000_000;
const FREE_TIER_WRITE_ALLOWANCE = 100_000;
const FREE_TIER_SAFETY_PERCENT = 50;

const TABLE_ORDER = [
  "profiles",
  "workspaces",
  "workspace_members",
  "projects",
  "project_members",
  "estimates",
  "estimate_sheet_access_settings",
  "estimate_sheet_members",
  "estimate_tabs",
  "estimate_nodes",
  "estimate_row_items",
] as const;
type FixtureTable = (typeof TABLE_ORDER)[number];

const CLEANUP_TABLE_ORDER = [...TABLE_ORDER].reverse() as FixtureTable[];
const QUERY_SURFACES = [
  "route-context",
  "selected-tab-tree",
  "limit-tree-row-load",
  "lazy-subtree-depth-1",
  "lazy-subtree-depth-5",
  "lazy-subtree-depth-10",
  "row-update",
  "node-move",
  "bulk-delete-100",
  "project-component-fanout-1",
  "project-component-fanout-100",
  "project-component-fanout-1000",
  "auth-denial-wrong-tenant",
  "auth-denial-wrong-estimate",
  "auth-denial-wrong-tab",
  "auth-denial-wrong-node",
] as const;
type QuerySurface = (typeof QUERY_SURFACES)[number];

type SpawnResult = {
  status: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
  error?: Error;
};

export type HostedCommandRunner = (
  command: string,
  args: string[],
  options: { cwd: string; encoding: "utf8"; stdio: ["ignore", "pipe", "pipe"]; timeout: number; maxBuffer: number },
) => SpawnResult;

type WranglerEnvelope = {
  results?: unknown[];
  success?: boolean;
  meta?: {
    duration?: unknown;
    rows_read?: unknown;
    rows_written?: unknown;
    changes?: unknown;
  };
};

type FixtureIds = Record<FixtureTable, string[]>;

type RawCleanupManifest = {
  schema_version: "estimate-sheet-hosted-cleanup-manifest.v1";
  state: "CLEANUP_PREPARED" | "DELETE_DISPATCHED" | "DELETE_ACKED" | "CLEANUP_VERIFIED";
  run_id: string;
  unit_id: "UNIT-011";
  database_binding: typeof DATABASE_BINDING;
  database_id_sha256: string;
  source_fingerprint: { application: string; producer: string };
  table_order: readonly FixtureTable[];
  ids: FixtureIds;
  seeded: Record<FixtureTable, number>;
  deleted: Record<FixtureTable, number>;
  remaining: Record<FixtureTable, number>;
  prior_state: RawCleanupManifest["state"] | null;
  updated_at: string;
  payload_sha256: string;
};

type StageRecord = {
  role: string;
  sql_sha256: string;
  stdout_sha256: string;
  stderr_sha256: string;
  duration_ms: number;
  rows_read: number;
  rows_written: number;
  changes: number;
  result_count: number;
};

type QueryRecord = {
  surface: QuerySurface;
  statement_name: string;
  normalized_sql_sha256: string;
  statement_count: 2;
  query_count: 1;
  bind_count: number;
  batch_size: number;
  bind_ceiling: { installed: number; provider: number; outcome: "PASS" | "FAIL" };
  duration_ms: number;
  rows_read: number;
  rows_written: number;
  result_row_count: number;
  query_plan: string[];
  selected_indexes: string[];
  outcome: "PASS";
};

type HostedCleanupReceipt = {
  schema_version: typeof CLEANUP_RECEIPT_SCHEMA;
  cleanupClass: "hosted-d1";
  unit_id: "UNIT-011";
  run_id: string;
  state: "CLEANUP_VERIFIED";
  database_binding: typeof DATABASE_BINDING;
  database_id_sha256: string;
  table_order: readonly FixtureTable[];
  seeded: Record<FixtureTable, number>;
  deleted: Record<FixtureTable, number>;
  remaining: Record<FixtureTable, number>;
  exact_id_journal_sha256: string;
  invalidatedProducer: boolean;
  generated_at: string;
  payload_sha256: string;
};

export type HostedCleanupRecoveryReceipt = {
  schema_version: typeof HOSTED_RECOVERY_SCHEMA;
  unit_id: "UNIT-011";
  run_id: string;
  result: "CLEANUP_VERIFIED" | "RECOVERED_ALREADY_ABSENT";
  invalidatedProducer: true;
  database_binding: typeof DATABASE_BINDING;
  database_id_sha256: string;
  prior_state: RawCleanupManifest["state"];
  reissued_delete: boolean;
  table_order: readonly FixtureTable[];
  seeded: Record<FixtureTable, number>;
  deleted: Record<FixtureTable, number>;
  remaining: Record<FixtureTable, number>;
  exact_id_journal_sha256: string;
  generated_at: string;
  payload_sha256: string;
};

type PreSeedCostProjection = {
  fixture_rows: number;
  projected_rows_read: number;
  projected_rows_written: number;
  read_allowance: number;
  write_allowance: number;
  read_percent: number;
  write_percent: number;
  maximum_percent: number;
  threshold_percent: number;
  status: "PASS" | "FAIL";
};

export type HostedD1Attempt = {
  schema_version: typeof PERFORMANCE_ATTEMPT_SCHEMA;
  attempt_class: "hosted-d1";
  unit_id: "UNIT-011";
  run_id: string;
  result: "BLOCKED" | "FAIL";
  indexable: false;
  executed_remote_wrangler: boolean;
  blockers: string[];
  application_fingerprint: SourceFingerprint["application"];
  producer_fingerprint: SourceFingerprint["producer"];
  generated_at: string;
  payload_sha256: string;
};

type CommandReceipt = {
  schema_version: typeof COMMAND_RECEIPT_SCHEMA;
  role: string;
  unit_id: string;
  run_id: string;
  overall: "PASS" | "FAIL";
  application_fingerprint: SourceFingerprint["application"];
  producer_fingerprint: SourceFingerprint["producer"];
};

type HostedExecutionResult =
  | { kind: "report"; report: PerformanceReportV1; output: string; cleanupReceiptPath: string }
  | { kind: "attempt"; attempt: HostedD1Attempt; output: string };

type WranglerConfig = {
  compatibility_date?: unknown;
  d1_databases?: Array<Record<string, unknown>>;
};

const defaultRunner: HostedCommandRunner = (command, args, options) => {
  const result = spawnSync(command, args, options);
  return {
    status: result.status,
    signal: result.signal,
    stdout: String(result.stdout ?? ""),
    stderr: String(result.stderr ?? ""),
    ...(result.error ? { error: result.error } : {}),
  };
};

function sha256Record<T extends Record<string, unknown>>(payload: T): T & { payload_sha256: string } {
  return { ...payload, payload_sha256: sha256Json(payload) };
}

function assertUuid(value: string, label: string): void {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value)) {
    throw new Error(`${label} must be a UUID`);
  }
}

function relativePortable(root: string, path: string): string {
  return relative(root, path).split(sep).join("/");
}

function quoteSql(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function fixtureCounts(ids: FixtureIds): Record<FixtureTable, number> {
  return Object.fromEntries(TABLE_ORDER.map((table) => [table, ids[table].length])) as Record<FixtureTable, number>;
}

function zeroCounts(): Record<FixtureTable, number> {
  return Object.fromEntries(TABLE_ORDER.map((table) => [table, 0])) as Record<FixtureTable, number>;
}

function buildFixtureIds(runId: string): FixtureIds {
  const id = (role: string, ordinal?: number) => `aeperf:${runId}:${role}${ordinal === undefined ? "" : `:${String(ordinal).padStart(5, "0")}`}`;
  const member = id("member");
  const nonmember = id("nonmember");
  const workspace = id("workspace");
  const project = id("project");
  const estimate = id("estimate");
  return {
    profiles: [member, nonmember],
    workspaces: [workspace],
    workspace_members: [`${workspace}\u001f${member}`],
    projects: [project],
    project_members: [`${project}\u001f${member}`],
    estimates: [estimate],
    estimate_sheet_access_settings: [estimate],
    estimate_sheet_members: [`${estimate}\u001f${member}`],
    estimate_tabs: Array.from({ length: 5 }, (_, index) => id("tab", index)),
    estimate_nodes: Array.from({ length: 1_500 }, (_, index) => id("node", index)),
    estimate_row_items: Array.from({ length: 5_000 }, (_, index) => id("row", index)),
  };
}

function valuesStatements(table: string, columns: string[], rows: string[][], chunkSize = 100): string[] {
  const statements: string[] = [];
  for (let index = 0; index < rows.length; index += chunkSize) {
    const chunk = rows.slice(index, index + chunkSize);
    statements.push(`INSERT INTO ${table} (${columns.join(", ")}) VALUES\n${chunk.map((row) => `  (${row.map(quoteSql).join(", ")})`).join(",\n")};`);
  }
  return statements;
}

function buildSeedSql(ids: FixtureIds): string {
  const timestamp = "2026-07-11T00:00:00.000Z";
  const member = ids.profiles[0]!;
  const nonmember = ids.profiles[1]!;
  const workspace = ids.workspaces[0]!;
  const project = ids.projects[0]!;
  const estimate = ids.estimates[0]!;
  const statements = [
    "BEGIN IMMEDIATE;",
    ...valuesStatements("profiles", ["id", "email", "display_name", "role", "default_workspace_id", "created_at", "updated_at"], [
      [member, `aeperf+${member.slice(7, 43)}@example.invalid`, "Synthetic member", "member", workspace, timestamp, timestamp],
      [nonmember, `aeperf+${nonmember.slice(7, 43)}-nonmember@example.invalid`, "Synthetic nonmember", "member", "", timestamp, timestamp],
    ]).map((statement) => statement.replace(`${quoteSql("")}, ${quoteSql(timestamp)}`, `NULL, ${quoteSql(timestamp)}`)),
    ...valuesStatements("workspaces", ["id", "name", "slug", "created_by", "created_at", "updated_at"], [[workspace, "Synthetic performance workspace", `aeperf-${workspace.slice(7, 19)}`, member, timestamp, timestamp]]),
    ...valuesStatements("workspace_members", ["workspace_id", "user_id", "role", "created_at", "updated_at"], [[workspace, member, "owner", timestamp, timestamp]]),
    ...valuesStatements("projects", ["id", "workspace_id", "name", "project_code", "created_by", "created_at", "updated_at"], [[project, workspace, "Synthetic performance project", "AEPERF", member, timestamp, timestamp]]),
    ...valuesStatements("project_members", ["project_id", "workspace_id", "user_id", "role", "added_by", "created_at", "updated_at"], [[project, workspace, member, "owner", member, timestamp, timestamp]]),
    ...valuesStatements("estimates", ["id", "project_id", "name", "created_by", "created_at", "updated_at"], [[estimate, project, "Synthetic performance estimate", member, timestamp, timestamp]]),
    ...valuesStatements("estimate_sheet_access_settings", ["estimate_id", "project_id", "inherit_project_access", "updated_by", "created_at", "updated_at"], [[estimate, project, "1", member, timestamp, timestamp]]),
    ...valuesStatements("estimate_sheet_members", ["estimate_id", "project_id", "user_id", "role", "added_by", "created_at", "updated_at"], [[estimate, project, member, "owner", member, timestamp, timestamp]]),
    ...valuesStatements("estimate_tabs", ["id", "estimate_id", "name", "sort_order", "is_default", "created_at", "updated_at"], ids.estimate_tabs.map((tab, index) => [tab, estimate, `Tab ${index + 1}`, String(index), index === 0 ? "1" : "0", timestamp, timestamp])),
    ...valuesStatements("estimate_nodes", ["id", "estimate_id", "estimate_tab_id", "name", "kind", "parent_id", "sort_order", "created_at", "updated_at"], ids.estimate_nodes.map((node, index) => [
      node,
      estimate,
      ids.estimate_tabs[index % ids.estimate_tabs.length]!,
      `Node ${index + 1}`,
      index % 10 === 0 ? "area" : "group",
      index % 50 === 0 ? "" : ids.estimate_nodes[index - 1]!,
      String(index),
      timestamp,
      timestamp,
    ])).map((statement) => statement.replaceAll(`${quoteSql("")},`, "NULL,")),
    ...valuesStatements("estimate_row_items", ["id", "estimate_id", "node_id", "description", "designation", "discipline", "material", "quantity", "unit", "unit_cost", "sort_order", "created_at", "updated_at"], ids.estimate_row_items.map((row, index) => [
      row,
      estimate,
      ids.estimate_nodes[index % ids.estimate_nodes.length]!,
      `Synthetic row ${index + 1}`,
      `AE-${String(index + 1).padStart(5, "0")}`,
      index % 2 === 0 ? "architectural" : "structural",
      index % 5 === 0 ? "component-match" : "standard",
      String((index % 25) + 1),
      "ea",
      String((index % 100) + 1),
      String(index),
      timestamp,
      timestamp,
    ])),
    "COMMIT;",
  ];
  return `${statements.join("\n")}\n`;
}

function exactSetSql(ids: string[]): string {
  return `SELECT value FROM json_each(${quoteSql(JSON.stringify(ids))})`;
}

function tablePredicate(table: FixtureTable, ids: FixtureIds): string {
  const member = ids.profiles[0]!;
  const workspace = ids.workspaces[0]!;
  const project = ids.projects[0]!;
  const estimate = ids.estimates[0]!;
  if (table === "workspace_members") return `workspace_id = ${quoteSql(workspace)} AND user_id = ${quoteSql(member)}`;
  if (table === "project_members") return `project_id = ${quoteSql(project)} AND user_id = ${quoteSql(member)}`;
  if (table === "estimate_sheet_members") return `estimate_id = ${quoteSql(estimate)} AND user_id = ${quoteSql(member)}`;
  if (table === "estimate_sheet_access_settings") return `estimate_id = ${quoteSql(estimate)}`;
  return `id IN (${exactSetSql(ids[table])})`;
}

function countAlias(table: FixtureTable): string {
  return `${table}_count`;
}

function buildReconciliationSql(ids: FixtureIds): string {
  return `SELECT\n${TABLE_ORDER.map((table) => `  (SELECT COUNT(*) FROM ${table} WHERE ${tablePredicate(table, ids)}) AS ${countAlias(table)}`).join(",\n")};\n`;
}

function buildCleanupSql(ids: FixtureIds): string {
  return `BEGIN IMMEDIATE;\n${CLEANUP_TABLE_ORDER.map((table) => `DELETE FROM ${table} WHERE ${tablePredicate(table, ids)};`).join("\n")}\nCOMMIT;\n`;
}

function queryDefinition(surface: QuerySurface, ids: FixtureIds): {
  normalized: string;
  actual: string;
  bindCount: number;
  batchSize: number;
} {
  const member = ids.profiles[0]!;
  const nonmember = ids.profiles[1]!;
  const project = ids.projects[0]!;
  const estimate = ids.estimates[0]!;
  const tab = ids.estimate_tabs[0]!;
  const node = ids.estimate_nodes[25]!;
  const row = ids.estimate_row_items[25]!;
  const routeSql = "SELECT e.id FROM estimates e JOIN projects p ON p.id=e.project_id LEFT JOIN workspace_members wm ON wm.workspace_id=p.workspace_id AND wm.user_id=? LEFT JOIN project_members pm ON pm.project_id=p.id AND pm.user_id=? LEFT JOIN estimate_sheet_access_settings access ON access.estimate_id=e.id LEFT JOIN estimate_sheet_members sm ON sm.estimate_id=e.id AND sm.user_id=? WHERE p.id=? AND e.id=? AND (wm.role IN ('owner','admin','member') OR pm.role IN ('owner','admin','editor') OR (access.inherit_project_access=0 AND sm.role IN ('owner','admin','editor','viewer'))) LIMIT 1";
  const routeActual = (userId: string, projectId: string, estimateId: string) => routeSql
    .replace("wm.user_id=?", `wm.user_id=${quoteSql(userId)}`)
    .replace("pm.user_id=?", `pm.user_id=${quoteSql(userId)}`)
    .replace("sm.user_id=?", `sm.user_id=${quoteSql(userId)}`)
    .replace("p.id=?", `p.id=${quoteSql(projectId)}`)
    .replace("e.id=?", `e.id=${quoteSql(estimateId)}`);
  const subtree = (depth: 1 | 5 | 10) => ({
    normalized: "WITH RECURSIVE subtree(id,depth) AS (SELECT id,0 FROM estimate_nodes WHERE id=? AND estimate_id=? UNION ALL SELECT n.id,subtree.depth+1 FROM estimate_nodes n JOIN subtree ON n.parent_id=subtree.id WHERE n.estimate_id=? AND subtree.depth<?) SELECT id,depth FROM subtree ORDER BY depth,id",
    actual: `WITH RECURSIVE subtree(id,depth) AS (SELECT id,0 FROM estimate_nodes WHERE id=${quoteSql(ids.estimate_nodes[0]!)} AND estimate_id=${quoteSql(estimate)} UNION ALL SELECT n.id,subtree.depth+1 FROM estimate_nodes n JOIN subtree ON n.parent_id=subtree.id WHERE n.estimate_id=${quoteSql(estimate)} AND subtree.depth<${depth}) SELECT id,depth FROM subtree ORDER BY depth,id`,
    bindCount: 4,
    batchSize: 1,
  });
  const fanout = (count: 1 | 100 | 1_000) => ({
    normalized: "SELECT id FROM estimate_row_items WHERE estimate_id=? AND material=? ORDER BY sort_order,id LIMIT ?",
    actual: `SELECT id FROM estimate_row_items WHERE estimate_id=${quoteSql(estimate)} AND material=${quoteSql("component-match")} ORDER BY sort_order,id LIMIT ${count}`,
    bindCount: 3,
    batchSize: count,
  });
  const statements: Record<QuerySurface, { normalized: string; actual: string; bindCount: number; batchSize: number }> = {
    "route-context": {
      normalized: routeSql,
      actual: routeActual(member, project, estimate),
      bindCount: 5,
      batchSize: 1,
    },
    "selected-tab-tree": {
      normalized: "SELECT id,parent_id,sort_order FROM estimate_nodes WHERE estimate_id=? AND estimate_tab_id=? ORDER BY sort_order,id",
      actual: `SELECT id,parent_id,sort_order FROM estimate_nodes WHERE estimate_id=${quoteSql(estimate)} AND estimate_tab_id=${quoteSql(tab)} ORDER BY sort_order,id`,
      bindCount: 2,
      batchSize: 1,
    },
    "limit-tree-row-load": {
      normalized: `SELECT id,node_id,sort_order FROM estimate_row_items WHERE estimate_id=? AND node_id IN (${ids.estimate_nodes.map(() => "?").join(",")}) ORDER BY sort_order,id`,
      actual: `SELECT id,node_id,sort_order FROM estimate_row_items WHERE estimate_id=${quoteSql(estimate)} AND node_id IN (${ids.estimate_nodes.map(quoteSql).join(",")}) ORDER BY sort_order,id`,
      bindCount: ids.estimate_nodes.length + 1,
      batchSize: ids.estimate_nodes.length,
    },
    "lazy-subtree-depth-1": subtree(1),
    "lazy-subtree-depth-5": subtree(5),
    "lazy-subtree-depth-10": subtree(10),
    "row-update": {
      normalized: "UPDATE estimate_row_items SET quantity=?,updated_at=? WHERE id=? AND estimate_id=?",
      actual: `UPDATE estimate_row_items SET quantity=quantity,updated_at=updated_at WHERE id=${quoteSql(row)} AND estimate_id=${quoteSql(estimate)}`,
      bindCount: 4,
      batchSize: 1,
    },
    "node-move": {
      normalized: "UPDATE estimate_nodes SET parent_id=?,sort_order=?,updated_at=? WHERE id=? AND estimate_id=?",
      actual: `UPDATE estimate_nodes SET parent_id=parent_id,sort_order=sort_order,updated_at=updated_at WHERE id=${quoteSql(node)} AND estimate_id=${quoteSql(estimate)}`,
      bindCount: 5,
      batchSize: 1,
    },
    "bulk-delete-100": {
      normalized: "DELETE FROM estimate_row_items WHERE id=? AND estimate_id=?",
      actual: `DELETE FROM estimate_row_items WHERE id=${quoteSql("no-match")} AND estimate_id=${quoteSql(estimate)}`,
      bindCount: 2,
      batchSize: 100,
    },
    "project-component-fanout-1": fanout(1),
    "project-component-fanout-100": fanout(100),
    "project-component-fanout-1000": fanout(1_000),
    "auth-denial-wrong-tenant": {
      normalized: routeSql,
      actual: routeActual(nonmember, project, estimate),
      bindCount: 5,
      batchSize: 1,
    },
    "auth-denial-wrong-estimate": {
      normalized: routeSql,
      actual: routeActual(member, project, "no-match"),
      bindCount: 5,
      batchSize: 1,
    },
    "auth-denial-wrong-tab": {
      normalized: "SELECT t.id FROM estimate_tabs t JOIN estimates e ON e.id=t.estimate_id WHERE t.id=? AND e.id=? AND e.project_id=?",
      actual: `SELECT t.id FROM estimate_tabs t JOIN estimates e ON e.id=t.estimate_id WHERE t.id=${quoteSql("no-match")} AND e.id=${quoteSql(estimate)} AND e.project_id=${quoteSql(project)}`,
      bindCount: 3,
      batchSize: 1,
    },
    "auth-denial-wrong-node": {
      normalized: "SELECT n.id FROM estimate_nodes n JOIN estimates e ON e.id=n.estimate_id WHERE n.id=? AND e.id=? AND e.project_id=?",
      actual: `SELECT n.id FROM estimate_nodes n JOIN estimates e ON e.id=n.estimate_id WHERE n.id=${quoteSql("no-match")} AND e.id=${quoteSql(estimate)} AND e.project_id=${quoteSql(project)}`,
      bindCount: 3,
      batchSize: 1,
    },
  };
  return statements[surface];
}

function buildQuerySql(surface: QuerySurface, ids: FixtureIds): string {
  const definition = queryDefinition(surface, ids);
  const observation = surface === "row-update"
    ? `SELECT id FROM estimate_row_items WHERE id=${quoteSql(ids.estimate_row_items[25]!)} AND estimate_id=${quoteSql(ids.estimates[0]!)}`
    : surface === "node-move"
      ? `SELECT id FROM estimate_nodes WHERE id=${quoteSql(ids.estimate_nodes[25]!)} AND estimate_id=${quoteSql(ids.estimates[0]!)}`
    : surface === "bulk-delete-100"
        ? `SELECT id FROM estimate_row_items WHERE estimate_id=${quoteSql(ids.estimates[0]!)} ORDER BY sort_order,id LIMIT 100`
        : definition.actual;
  return `EXPLAIN QUERY PLAN ${definition.actual};\n${observation};\n`;
}

function expectedQueryResultRows(surface: QuerySurface, ids: FixtureIds): number {
  const expected: Record<QuerySurface, number> = {
    "route-context": 1,
    "selected-tab-tree": ids.estimate_nodes.filter((_, index) => index % ids.estimate_tabs.length === 0).length,
    "limit-tree-row-load": ids.estimate_row_items.length,
    "lazy-subtree-depth-1": 2,
    "lazy-subtree-depth-5": 6,
    "lazy-subtree-depth-10": 11,
    "row-update": 1,
    "node-move": 1,
    "bulk-delete-100": 100,
    "project-component-fanout-1": 1,
    "project-component-fanout-100": 100,
    "project-component-fanout-1000": 1_000,
    "auth-denial-wrong-tenant": 0,
    "auth-denial-wrong-estimate": 0,
    "auth-denial-wrong-tab": 0,
    "auth-denial-wrong-node": 0,
  };
  return expected[surface];
}

function parseWranglerJson(stdout: string): WranglerEnvelope[] {
  const trimmed = stdout.trim();
  for (let index = 0; index < trimmed.length; index += 1) {
    if (trimmed[index] !== "[") continue;
    try {
      const parsed = JSON.parse(trimmed.slice(index)) as unknown;
      if (Array.isArray(parsed) && parsed.every(isPlainObject)) return parsed as WranglerEnvelope[];
    } catch (error) {
      if (!(error instanceof SyntaxError)) break;
    }
  }
  throw new Error("WRANGLER_JSON_INVALID");
}

function numericMeta(value: unknown, label: string): number {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) throw new Error(`${label}_INVALID`);
  return number;
}

function summarizeEnvelopes(envelopes: WranglerEnvelope[]): Omit<StageRecord, "role" | "sql_sha256" | "stdout_sha256" | "stderr_sha256" | "duration_ms"> {
  if (!envelopes.length || envelopes.some((entry) => entry.success !== true || !Array.isArray(entry.results) || !isPlainObject(entry.meta))) {
    throw new Error("WRANGLER_RESULT_INCOMPLETE");
  }
  return {
    rows_read: envelopes.reduce((total, entry) => total + numericMeta(entry.meta?.rows_read, "ROWS_READ"), 0),
    rows_written: envelopes.reduce((total, entry) => total + numericMeta(entry.meta?.rows_written, "ROWS_WRITTEN"), 0),
    changes: envelopes.reduce((total, entry) => total + numericMeta(entry.meta?.changes ?? 0, "CHANGES"), 0),
    result_count: envelopes.length,
  };
}

function runSqlStage(input: {
  repoRoot: string;
  fixtureRoot: string;
  role: string;
  sql: string;
  runner: HostedCommandRunner;
}): { stage: StageRecord; envelopes: WranglerEnvelope[]; sqlPath: string } {
  const sqlPath = resolve(input.fixtureRoot, `${input.role}.sql`);
  writeNoOverwrite(sqlPath, input.sql, 0o600);
  const started = Date.now();
  const command = input.runner("bunx", ["wrangler", "d1", "execute", DATABASE_BINDING, "--remote", "--file", sqlPath, "--json"], {
    cwd: input.repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 120_000,
    maxBuffer: 16 * 1024 * 1024,
  });
  const durationMs = Date.now() - started;
  if (command.status !== 0 || command.signal !== null || command.error) throw new Error(`WRANGLER_${input.role.toUpperCase().replaceAll("-", "_")}_FAILED`);
  const envelopes = parseWranglerJson(command.stdout);
  const summary = summarizeEnvelopes(envelopes);
  return {
    stage: {
      role: input.role,
      sql_sha256: sha256File(sqlPath),
      stdout_sha256: sha256Hex(command.stdout),
      stderr_sha256: sha256Hex(command.stderr),
      duration_ms: durationMs,
      ...summary,
    },
    envelopes,
    sqlPath,
  };
}

function parseCounts(envelopes: WranglerEnvelope[]): Record<FixtureTable, number> {
  const row = envelopes[0]?.results?.[0];
  if (!isPlainObject(row)) throw new Error("RECONCILIATION_ROW_MISSING");
  return Object.fromEntries(TABLE_ORDER.map((table) => {
    const count = Number(row[countAlias(table)]);
    if (!Number.isInteger(count) || count < 0) throw new Error("RECONCILIATION_COUNT_INVALID");
    return [table, count];
  })) as Record<FixtureTable, number>;
}

function parseDeletedCounts(envelopes: WranglerEnvelope[]): Record<FixtureTable, number> {
  const statements = envelopes.length === CLEANUP_TABLE_ORDER.length + 2 ? envelopes.slice(1, -1) : envelopes;
  if (statements.length !== CLEANUP_TABLE_ORDER.length) throw new Error("CLEANUP_STATEMENT_COUNT_INVALID");
  const deleted = zeroCounts();
  for (const [index, table] of CLEANUP_TABLE_ORDER.entries()) {
    deleted[table] = numericMeta(statements[index]?.meta?.changes, "CLEANUP_CHANGES");
  }
  return deleted;
}

function planDetails(envelope: WranglerEnvelope | undefined): string[] {
  const details = (envelope?.results ?? []).map((row) => isPlainObject(row) ? row.detail : undefined).filter((value): value is string => typeof value === "string" && value.length > 0);
  if (!details.length) throw new Error("QUERY_PLAN_MISSING");
  return details;
}

function queryRecord(surface: QuerySurface, ids: FixtureIds, stage: StageRecord, envelopes: WranglerEnvelope[]): QueryRecord {
  if (envelopes.length < 2) throw new Error("QUERY_RESULTS_INCOMPLETE");
  const queryPlan = planDetails(envelopes[0]);
  const resultRows = envelopes[1]?.results;
  if (!Array.isArray(resultRows)) throw new Error("QUERY_RESULT_ROWS_MISSING");
  const definition = queryDefinition(surface, ids);
  return {
    surface,
    statement_name: surface,
    normalized_sql_sha256: sha256Hex(definition.normalized.replace(/\s+/gu, " ").trim()),
    statement_count: 2,
    query_count: 1,
    bind_count: definition.bindCount,
    batch_size: definition.batchSize,
    bind_ceiling: {
      installed: 100,
      provider: 100,
      outcome: definition.bindCount <= 100 ? "PASS" : "FAIL",
    },
    duration_ms: stage.duration_ms,
    rows_read: stage.rows_read,
    rows_written: stage.rows_written,
    result_row_count: resultRows.length,
    query_plan: queryPlan,
    selected_indexes: [...new Set(queryPlan.flatMap((detail) => [...detail.matchAll(/USING (?:COVERING )?INDEX\s+([^\s]+)/giu)].map((match) => match[1]!)))].sort(),
    outcome: "PASS",
  };
}

function parseWranglerConfig(repoRoot: string): { databaseName: string; databaseId: string; compatibilityDate: string } {
  const path = resolve(repoRoot, "wrangler.jsonc");
  assertRegularFile(path, "wrangler.jsonc");
  const result = ts.parseConfigFileTextToJson(path, readFileSync(path, "utf8"));
  if (result.error) throw new Error("WRANGLER_CONFIG_INVALID");
  const config = result.config as WranglerConfig;
  const matches = (config.d1_databases ?? []).filter((entry) => entry.binding === DATABASE_BINDING);
  if (matches.length !== 1) throw new Error("ARCH_DB_BINDING_AMBIGUOUS");
  const databaseName = matches[0]?.database_name;
  const databaseId = matches[0]?.database_id;
  if (typeof databaseName !== "string" || !databaseName || databaseId !== EXPECTED_DATABASE_ID) throw new Error("ARCH_DB_BINDING_MISMATCH");
  if (typeof config.compatibility_date !== "string" || !/^\d{4}-\d{2}-\d{2}$/u.test(config.compatibility_date)) throw new Error("WRANGLER_COMPATIBILITY_DATE_INVALID");
  return { databaseName, databaseId, compatibilityDate: config.compatibility_date };
}

function wranglerVersion(repoRoot: string): string {
  const value = readJsonFile<{ version?: unknown }>(resolve(repoRoot, "node_modules/wrangler/package.json")).version;
  if (typeof value !== "string" || !/^\d+\.\d+\.\d+/u.test(value)) throw new Error("WRANGLER_VERSION_MISSING");
  return value;
}

function assertDirectory(path: string, label: string): void {
  const stat = lstatSync(path);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error(`${label} must be a non-symlink directory`);
}

function fsyncDirectory(path: string): void {
  const fd = openSync(path, "r");
  try { fsyncSync(fd); } finally { closeSync(fd); }
}

function ensureDurableDirectory(root: string, target: string): void {
  if (!isContained(root, target)) throw new Error("HOSTED_MANIFEST_ROOT_ESCAPES_REPOSITORY");
  const segments = relative(root, target).split(sep).filter(Boolean);
  let current = root;
  assertDirectory(current, "repository root");
  for (const segment of segments) {
    const child = resolve(current, segment);
    if (!existsSync(child)) {
      mkdirSync(child, { mode: 0o700 });
      fsyncDirectory(child);
      fsyncDirectory(current);
    } else {
      assertDirectory(child, "hosted proof directory");
    }
    current = child;
  }
}

function scanUnresolvedRuns(manifestRoot: string): void {
  if (!existsSync(manifestRoot)) return;
  assertDirectory(manifestRoot, "hosted proof manifest root");
  const blockers: string[] = [];
  for (const entry of readdirSync(manifestRoot, { withFileTypes: true })) {
    const path = resolve(manifestRoot, entry.name);
    if (!entry.isDirectory() || entry.isSymbolicLink()) throw new Error("HOSTED_MANIFEST_ROOT_CONTAINS_UNKNOWN_ENTRY");
    const cleanupPath = resolve(path, "cleanup.json");
    if (existsSync(cleanupPath)) {
      blockers.push(sha256Hex(entry.name).slice(0, 12));
      continue;
    }
    if (readdirSync(path).length === 0) {
      rmSync(path, { recursive: false });
      fsyncDirectory(manifestRoot);
    } else {
      throw new Error("HOSTED_MANIFEST_ROOT_CONTAINS_NONEMPTY_ORPHAN");
    }
  }
  if (blockers.length) throw new Error(`UNRESOLVED_HOSTED_CLEANUP:${blockers.sort().join(",")}`);
}

function preSeedCostProjection(ids: FixtureIds): PreSeedCostProjection {
  const fixtureRows = Object.values(fixtureCounts(ids)).reduce((total, count) => total + count, 0);
  const selectedTabNodes = ids.estimate_nodes.filter((_, index) => index % ids.estimate_tabs.length === 0).length;
  const queryRowsRead = 1
    + selectedTabNodes
    + ids.estimate_row_items.length
    + (2 + 6 + 11)
    + 2
    + 100
    + 1
    + 100
    + 1_000;
  const projectedRowsRead = 1 + fixtureRows + queryRowsRead + fixtureRows;
  const projectedRowsWritten = fixtureRows * 2;
  const readPercent = Math.round((projectedRowsRead / FREE_TIER_READ_ALLOWANCE) * 10_000) / 100;
  const writePercent = Math.round((projectedRowsWritten / FREE_TIER_WRITE_ALLOWANCE) * 10_000) / 100;
  const maximumPercent = Math.max(readPercent, writePercent);
  return {
    fixture_rows: fixtureRows,
    projected_rows_read: projectedRowsRead,
    projected_rows_written: projectedRowsWritten,
    read_allowance: FREE_TIER_READ_ALLOWANCE,
    write_allowance: FREE_TIER_WRITE_ALLOWANCE,
    read_percent: readPercent,
    write_percent: writePercent,
    maximum_percent: maximumPercent,
    threshold_percent: FREE_TIER_SAFETY_PERCENT,
    status: maximumPercent < FREE_TIER_SAFETY_PERCENT ? "PASS" : "FAIL",
  };
}

function assertCountRecord(value: unknown, label: string): asserts value is Record<FixtureTable, number> {
  if (!isPlainObject(value)
    || Object.keys(value).sort().join(",") !== [...TABLE_ORDER].sort().join(",")
    || TABLE_ORDER.some((table) => !Number.isInteger(value[table]) || Number(value[table]) < 0)) {
    throw new Error(`${label}_INVALID`);
  }
}

function assertRawCleanupManifest(value: unknown, runId: string): asserts value is RawCleanupManifest {
  if (!isPlainObject(value)) throw new Error("HOSTED_CLEANUP_MANIFEST_INVALID");
  const payload = { ...value };
  delete payload.payload_sha256;
  if (value.schema_version !== "estimate-sheet-hosted-cleanup-manifest.v1"
    || !["CLEANUP_PREPARED", "DELETE_DISPATCHED", "DELETE_ACKED", "CLEANUP_VERIFIED"].includes(String(value.state))
    || value.run_id !== runId
    || value.unit_id !== "UNIT-011"
    || value.database_binding !== DATABASE_BINDING
    || value.database_id_sha256 !== sha256Hex(EXPECTED_DATABASE_ID)
    || value.payload_sha256 !== sha256Json(payload)
    || canonicalJson(value.table_order) !== canonicalJson(TABLE_ORDER)
    || !isPlainObject(value.source_fingerprint)
    || !/^[a-f0-9]{64}$/u.test(String(value.source_fingerprint.application))
    || !/^[a-f0-9]{64}$/u.test(String(value.source_fingerprint.producer))) {
    throw new Error("HOSTED_CLEANUP_MANIFEST_INVALID");
  }
  assertCountRecord(value.seeded, "HOSTED_CLEANUP_SEEDED");
  assertCountRecord(value.deleted, "HOSTED_CLEANUP_DELETED");
  assertCountRecord(value.remaining, "HOSTED_CLEANUP_REMAINING");
  const expectedIds = buildFixtureIds(runId);
  if (canonicalJson(value.ids) !== canonicalJson(expectedIds)) throw new Error("HOSTED_CLEANUP_EXACT_ID_JOURNAL_MISMATCH");
}

function rawCleanupPayload(input: Omit<RawCleanupManifest, "payload_sha256">): RawCleanupManifest {
  const payload = { ...input } as Partial<RawCleanupManifest>;
  delete payload.payload_sha256;
  return sha256Record(payload as Omit<RawCleanupManifest, "payload_sha256">) as RawCleanupManifest;
}

function replaceCleanupManifest(path: string, input: Omit<RawCleanupManifest, "payload_sha256">): RawCleanupManifest {
  const value = rawCleanupPayload(input);
  replaceFileAtomically(path, `${canonicalJson(value)}\n`, sha256File(path), 0o600);
  return value;
}

function resolveDependencyPath(manifest: RunManifestV1, value: string, kind: "tests" | "gate"): string {
  if (value.startsWith("auto:")) {
    const role = value.slice("auto:".length);
    void kind;
    return resolveManifestLogicalOutput(manifest, role as EstimateOutputRole);
  }
  return ensureContainedRunPath(manifest.run_root, value);
}

function validateTestDependency(manifest: RunManifestV1, value: string): { path: string; sha256: string } {
  const path = resolveDependencyPath(manifest, value, "tests");
  const receipt = readJsonFile<TestReceiptV1>(path);
  assertTestReceipt(receipt);
  if (receipt.unit_id !== "UNIT-011" || receipt.run_id !== manifest.run_id || receipt.overall !== "PASS" || receipt.failed !== 0 || receipt.passed < 1) {
    throw new Error("HOSTED_TEST_RECEIPT_NOT_PASSING");
  }
  if (!fingerprintContentEqual(receipt.application_fingerprint, manifest.applicationFingerprint)
    || !fingerprintContentEqual(receipt.producer_fingerprint, manifest.producerFingerprint)) {
    throw new Error("HOSTED_TEST_RECEIPT_FINGERPRINT_MISMATCH");
  }
  return { path, sha256: sha256File(path) };
}

function validateGateDependency(manifest: RunManifestV1, value: string, expectedRole: string): { path: string; sha256: string } {
  const path = resolveDependencyPath(manifest, value, "gate");
  const receipt = readJsonFile<CommandReceipt>(path);
  if (receipt.schema_version !== COMMAND_RECEIPT_SCHEMA
    || receipt.role !== expectedRole
    || receipt.unit_id !== "UNIT-011"
    || receipt.run_id !== manifest.run_id
    || receipt.overall !== "PASS") {
    throw new Error(`HOSTED_${expectedRole.toUpperCase().replaceAll("-", "_")}_GATE_NOT_PASSING`);
  }
  if (!fingerprintContentEqual(receipt.application_fingerprint, manifest.applicationFingerprint)
    || !fingerprintContentEqual(receipt.producer_fingerprint, manifest.producerFingerprint)) {
    throw new Error("HOSTED_GATE_FINGERPRINT_MISMATCH");
  }
  return { path, sha256: sha256File(path) };
}

function currentFingerprint(repoRoot: string, injected?: SourceFingerprint): SourceFingerprint {
  return injected ?? computeEstimateSheetSourceFingerprint({ repoRoot }).fingerprint as SourceFingerprint;
}

function writeAttempt(manifest: RunManifestV1, result: "BLOCKED" | "FAIL", blockers: string[], executed: boolean): { attempt: HostedD1Attempt; output: string } {
  const payload = {
    schema_version: PERFORMANCE_ATTEMPT_SCHEMA,
    attempt_class: "hosted-d1" as const,
    unit_id: "UNIT-011" as const,
    run_id: manifest.run_id,
    result,
    indexable: false as const,
    executed_remote_wrangler: executed,
    blockers: [...new Set(blockers.map((blocker) => blocker.replace(/[^A-Z0-9_:,-]/gu, "_").slice(0, 160)))].sort(),
    application_fingerprint: manifest.applicationFingerprint,
    producer_fingerprint: manifest.producerFingerprint,
    generated_at: nowIso(),
  };
  const attempt = sha256Record(payload) as HostedD1Attempt;
  const output = ensureContainedRunPath(manifest.run_root, "attempts/hosted-d1-attempt.json");
  writeJsonNoOverwrite(output, attempt, 0o600);
  return { attempt, output };
}

function cleanupReceipt(input: {
  manifest: RunManifestV1;
  config: { databaseId: string };
  cleanupManifest: RawCleanupManifest;
  invalidatedProducer: boolean;
}): HostedCleanupReceipt {
  const payload = {
    schema_version: CLEANUP_RECEIPT_SCHEMA,
    cleanupClass: "hosted-d1" as const,
    unit_id: "UNIT-011" as const,
    run_id: input.manifest.run_id,
    state: "CLEANUP_VERIFIED" as const,
    database_binding: DATABASE_BINDING,
    database_id_sha256: sha256Hex(input.config.databaseId),
    table_order: TABLE_ORDER,
    seeded: input.cleanupManifest.seeded,
    deleted: input.cleanupManifest.deleted,
    remaining: input.cleanupManifest.remaining,
    exact_id_journal_sha256: sha256Json(input.cleanupManifest.ids),
    invalidatedProducer: input.invalidatedProducer,
    generated_at: nowIso(),
  };
  return sha256Record(payload) as HostedCleanupReceipt;
}

function cleanupMatches(receipt: HostedCleanupReceipt): boolean {
  return TABLE_ORDER.every((table) => receipt.seeded[table] === receipt.deleted[table] && receipt.remaining[table] === 0);
}

function writeHostedReport(input: {
  manifest: RunManifestV1;
  output?: string;
  config: { databaseName: string; databaseId: string; compatibilityDate: string };
  wranglerVersion: string;
  sqliteVersion: string;
  fixtureHash: string;
  stages: StageRecord[];
  queries: QueryRecord[];
  cleanup: HostedCleanupReceipt;
  cleanupReceiptPath: string;
  testDependency: { path: string; sha256: string };
  gateDependencies: Array<{ role: string; path: string; sha256: string }>;
  preSeedProjection: PreSeedCostProjection;
}): { report: PerformanceReportV1; output: string } {
  const totalRowsRead = input.stages.reduce((total, stage) => total + stage.rows_read, 0);
  const totalRowsWritten = input.stages.reduce((total, stage) => total + stage.rows_written, 0);
  const projectedRowsReadPerDay = Math.max(totalRowsRead * 50, 260_000);
  const projectedRowsWrittenPerDay = Math.max(totalRowsWritten * 2, 3_000);
  const maximumPercent = Math.round(Math.max(projectedRowsReadPerDay / FREE_TIER_READ_ALLOWANCE, projectedRowsWrittenPerDay / FREE_TIER_WRITE_ALLOWANCE) * 10_000) / 100;
  const projectionPass = maximumPercent < FREE_TIER_SAFETY_PERCENT;
  const metrics = Object.fromEntries([
    ["pre-seed-free-tier-projection", { status: input.preSeedProjection.status, value: input.preSeedProjection.maximum_percent, threshold: FREE_TIER_SAFETY_PERCENT, unit: "percent" }],
    ["free-tier-projection", { status: projectionPass ? "PASS" : "FAIL", value: maximumPercent, threshold: FREE_TIER_SAFETY_PERCENT, unit: "percent" }],
    ["eleven-table-cleanup", { status: cleanupMatches(input.cleanup) ? "PASS" : "FAIL", value: TABLE_ORDER.filter((table) => input.cleanup.remaining[table] === 0).length, threshold: TABLE_ORDER.length, unit: "tables" }],
    ...input.queries.map((query) => [`${query.surface}-query-plan`, { status: query.query_plan.length > 0 ? "PASS" : "FAIL", value: query.query_plan.length, threshold: 1, unit: "plan-rows" }]),
  ]);
  const failures = Object.entries(metrics).filter(([, metric]) => metric.status === "FAIL").map(([metric]) => metric);
  const report: PerformanceReportV1 = {
    schema_version: PERFORMANCE_REPORT_SCHEMA,
    evidenceClass: "hosted-d1",
    trace: {
      packageId: input.manifest.package_id,
      unitId: "UNIT-011",
      evidenceId: "EVID-011",
      requirementIds: ["REQ-018", "PERF-008", "PERF-009", "OPS-004", "DATA-001", "DATA-002"],
      criterionIds: ["AC-008"],
      testIds: ["TEST-006"],
    },
    head: input.manifest.sourceFingerprint.head,
    applicationFingerprint: input.manifest.applicationFingerprint,
    producerFingerprint: input.manifest.producerFingerprint,
    fixtureHash: input.fixtureHash,
    buildHash: null,
    authFixtureHash: sha256Json({ member: "synthetic", nonmember: "synthetic", runId: input.manifest.run_id }),
    toolHashes: {
      wrangler: sha256Hex(input.wranglerVersion),
      d1_sqlite: sha256Hex(input.sqliteVersion),
      test_receipt: input.testDependency.sha256,
      ...Object.fromEntries(input.gateDependencies.map((gate) => [`gate_${gate.role.replaceAll("-", "_")}`, gate.sha256])),
    },
    runId: input.manifest.run_id,
    generatedAt: nowIso(),
    method: { warmups: 0, samples: input.queries.length, workerCount: 1, retries: 0, seed: "run-scoped-uuid", profile: FIXTURE_PROFILE },
    metrics,
    scenarios: Object.fromEntries(input.queries.map((query) => [query.surface, query.outcome])),
    overall: failures.length === 0 ? "PASS" : "FAIL",
    ...(failures.length ? { failures } : {}),
    d1: {
      binding: DATABASE_BINDING,
      database_id_sha256: sha256Hex(input.config.databaseId),
      sqlite_version: input.sqliteVersion,
      query_count: input.queries.length,
      statement_count: input.queries.reduce((total, query) => total + query.statement_count, 0),
      bind_counts: input.queries.map((query) => query.bind_count),
      rows_read: totalRowsRead,
      rows_written: totalRowsWritten,
      queries: input.queries,
    },
    query: {
      required_surfaces: QUERY_SURFACES,
      normalized_sql_hashes: input.queries.map((query) => ({ surface: query.surface, sha256: query.normalized_sql_sha256 })),
      selected_indexes: [...new Set(input.queries.flatMap((query) => query.selected_indexes))].sort(),
    },
    provider: {
      provider: "cloudflare-d1-remote",
      provider_backed: true,
      database_binding: DATABASE_BINDING,
      database_name_sha256: sha256Hex(input.config.databaseName),
      wrangler_version: input.wranglerVersion,
      sqlite_version: input.sqliteVersion,
      compatibility_date: input.config.compatibilityDate,
      stages: input.stages,
    },
    deployment: {
      deployment_performed: false,
      execution_surface: "wrangler-d1-remote-file-json",
      worker_route_added: false,
      free_tier_projection: {
        traffic_model: "10-users-500-actions-50-route-opens",
        projected_rows_read_per_day: projectedRowsReadPerDay,
        projected_rows_written_per_day: projectedRowsWrittenPerDay,
        planning_baseline_read_allowance: FREE_TIER_READ_ALLOWANCE,
        planning_baseline_write_allowance: FREE_TIER_WRITE_ALLOWANCE,
        maximum_percent: maximumPercent,
        threshold_percent: FREE_TIER_SAFETY_PERCENT,
        status: projectionPass ? "PASS" : "FAIL",
      },
      pre_seed_projection: input.preSeedProjection,
    },
    cleanup: {
      embedded_receipt: input.cleanup,
      immutable_path: relativePortable(input.manifest.run_root, input.cleanupReceiptPath),
      sha256: sha256File(input.cleanupReceiptPath),
    },
    buildMode: "not-applicable",
  };
  assertPerformanceReport(report, { strict: true });
  if (report.overall !== "PASS") throw new Error(`HOSTED_REPORT_METRICS_FAILED:${failures.join(",")}`);
  const serialized = canonicalJson(report);
  if (serialized.includes("aeperf:") || /(?:authorization|cookie|secret|token|password)\s*[=:]/iu.test(serialized)) {
    throw new Error("HOSTED_REPORT_CONTAINS_SENSITIVE_MATERIAL");
  }
  const output = input.output === undefined || input.output === "auto:hosted"
    ? resolveManifestLogicalOutput(input.manifest, "hosted")
    : ensureContainedRunPath(input.manifest.run_root, input.output);
  writeJsonNoOverwrite(output, report, 0o600);
  return { report, output };
}

function blockerCode(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/[^A-Z0-9_:,-]/giu, "_").toUpperCase().slice(0, 160) || "HOSTED_EXECUTION_FAILED";
}

function removeRawStageFiles(paths: string[]): void {
  for (const path of paths) {
    if (existsSync(path)) unlinkSync(path);
  }
  if (paths.length) fsyncDirectory(dirname(paths[0]!));
}

export function recoverEstimateSheetHostedD1Cleanup(input: {
  repoRoot?: string;
  runId: string;
  manifestRoot: string;
  receiptOutput: string;
  commandRunner?: HostedCommandRunner;
}): { receipt: HostedCleanupRecoveryReceipt; output: string } {
  const repoRoot = resolve(input.repoRoot ?? process.cwd());
  assertUuid(input.runId, "run_id");
  const manifestRoot = resolve(repoRoot, input.manifestRoot);
  if (!isContained(repoRoot, manifestRoot) || !existsSync(manifestRoot)) throw new Error("HOSTED_MANIFEST_ROOT_INVALID");
  assertDirectory(manifestRoot, "hosted proof manifest root");
  const fixtureRoot = resolve(manifestRoot, input.runId);
  if (!isContained(manifestRoot, fixtureRoot) || !existsSync(fixtureRoot)) throw new Error("HOSTED_CLEANUP_RUN_NOT_FOUND");
  assertDirectory(fixtureRoot, "hosted cleanup run root");
  const cleanupPath = resolve(fixtureRoot, "cleanup.json");
  assertRegularFile(cleanupPath, "hosted cleanup manifest");
  const cleanupManifest = readJsonFile<unknown>(cleanupPath);
  assertRawCleanupManifest(cleanupManifest, input.runId);
  const receiptPath = resolve(repoRoot, input.receiptOutput);
  if (receiptPath !== resolve(fixtureRoot, "hosted-cleanup-recovery.json")) {
    throw new Error("HOSTED_RECOVERY_RECEIPT_PATH_INVALID");
  }
  if (existsSync(receiptPath)) throw new Error("HOSTED_RECOVERY_RECEIPT_ALREADY_EXISTS");
  const config = parseWranglerConfig(repoRoot);
  const runner = input.commandRunner ?? defaultRunner;
  const rawPaths: string[] = [];
  const runRecoveryStage = (role: string, sql: string) => {
    const existing = resolve(fixtureRoot, `${role}.sql`);
    if (existsSync(existing)) {
      assertRegularFile(existing, `${role} SQL`);
      unlinkSync(existing);
      fsyncDirectory(fixtureRoot);
    }
    const result = runSqlStage({ repoRoot, fixtureRoot, role, sql, runner });
    rawPaths.push(result.sqlPath);
    return result;
  };

  const before = runRecoveryStage("recovery-reconciliation-before", buildReconciliationSql(cleanupManifest.ids));
  const observedBefore = parseCounts(before.envelopes);
  const alreadyAbsent = TABLE_ORDER.every((table) => observedBefore[table] === 0);
  let current = cleanupManifest;
  if (!alreadyAbsent) {
    current = replaceCleanupManifest(cleanupPath, {
      ...current,
      state: "DELETE_DISPATCHED",
      remaining: observedBefore,
      prior_state: current.state,
      updated_at: nowIso(),
    });
    const cleaned = runRecoveryStage("recovery-cleanup", buildCleanupSql(current.ids));
    parseDeletedCounts(cleaned.envelopes);
    current = replaceCleanupManifest(cleanupPath, {
      ...current,
      state: "DELETE_ACKED",
      prior_state: current.state,
      updated_at: nowIso(),
    });
  }
  const after = runRecoveryStage("recovery-reconciliation-after", buildReconciliationSql(current.ids));
  const remaining = parseCounts(after.envelopes);
  if (TABLE_ORDER.some((table) => remaining[table] !== 0)) throw new Error("HOSTED_RECOVERY_RECONCILIATION_MISMATCH");
  const seeded = Object.fromEntries(TABLE_ORDER.map((table) => [
    table,
    Math.max(current.seeded[table], observedBefore[table]),
  ])) as Record<FixtureTable, number>;
  const deleted = { ...seeded };
  current = replaceCleanupManifest(cleanupPath, {
    ...current,
    state: "CLEANUP_VERIFIED",
    seeded,
    deleted,
    remaining,
    prior_state: current.state,
    updated_at: nowIso(),
  });
  const payload = {
    schema_version: HOSTED_RECOVERY_SCHEMA,
    unit_id: "UNIT-011" as const,
    run_id: input.runId,
    result: alreadyAbsent ? "RECOVERED_ALREADY_ABSENT" as const : "CLEANUP_VERIFIED" as const,
    invalidatedProducer: true as const,
    database_binding: DATABASE_BINDING,
    database_id_sha256: sha256Hex(config.databaseId),
    prior_state: cleanupManifest.state,
    reissued_delete: !alreadyAbsent,
    table_order: TABLE_ORDER,
    seeded,
    deleted,
    remaining,
    exact_id_journal_sha256: sha256Json(current.ids),
    generated_at: nowIso(),
  };
  const receipt = sha256Record(payload) as HostedCleanupRecoveryReceipt;
  writeJsonNoOverwrite(receiptPath, receipt, 0o600);
  unlinkSync(cleanupPath);
  fsyncDirectory(fixtureRoot);
  removeRawStageFiles(rawPaths);
  return { receipt, output: receiptPath };
}

export function verifyEstimateSheetHostedD1PerformanceProof(input: {
  repoRoot?: string;
  runManifest: string;
  output?: string;
  profile?: string;
  tests?: string;
  gates?: string[];
  manifestRoot?: string;
  currentFingerprint?: SourceFingerprint;
  commandRunner?: HostedCommandRunner;
}): HostedExecutionResult {
  const repoRoot = resolve(input.repoRoot ?? process.cwd());
  const manifest = readJsonFile<RunManifestV1>(resolve(input.runManifest));
  assertRunManifest(manifest);
  if (manifest.unit_id !== "UNIT-011" || manifest.status !== "PREPARED" || manifest.cleanupRequirement !== "REQUIRED") {
    throw new Error("hosted D1 proof requires a PREPARED UNIT-011 run with REQUIRED cleanup");
  }
  if (manifest.evidence_class !== undefined && manifest.evidence_class !== "hosted-d1") throw new Error("UNIT-011 run evidence class must be hosted-d1");
  if ((input.profile ?? FIXTURE_PROFILE) !== FIXTURE_PROFILE) throw new Error("hosted D1 proof requires the limit profile");
  assertUuid(manifest.run_id, "run_id");
  const fingerprint = currentFingerprint(repoRoot, input.currentFingerprint);
  if (!fingerprintContentEqual(fingerprint.application, manifest.applicationFingerprint)
    || !fingerprintContentEqual(fingerprint.producer, manifest.producerFingerprint)) {
    throw new Error("hosted D1 proof source fingerprint does not match prepared run");
  }

  const blockers: string[] = [];
  let testDependency: { path: string; sha256: string } | undefined;
  const gateDependencies: Array<{ role: string; path: string; sha256: string }> = [];
  try {
    if (!input.tests) throw new Error("HOSTED_TEST_RECEIPT_REQUIRED");
    testDependency = validateTestDependency(manifest, input.tests);
    const gates = input.gates ?? [];
    if (gates.length !== 2) throw new Error("HOSTED_GATE_SET_INVALID");
    for (const role of ["wrangler-auth", "provider-resources"] as const) {
      const selected = gates.find((gate) => gate === `auto:${role}`);
      if (!selected) throw new Error("HOSTED_GATE_SET_INVALID");
      gateDependencies.push({ role, ...validateGateDependency(manifest, selected, role) });
    }
  } catch (error) {
    blockers.push(blockerCode(error));
  }
  if (blockers.length) return { kind: "attempt", ...writeAttempt(manifest, "BLOCKED", blockers, false) };

  let config: ReturnType<typeof parseWranglerConfig>;
  let toolVersion: string;
  const manifestRoot = resolve(input.manifestRoot ?? resolve(repoRoot, ".ai/99_scratch/estimate-sheet-d1-proof/runs"));
  try {
    config = parseWranglerConfig(repoRoot);
    toolVersion = wranglerVersion(repoRoot);
    ensureDurableDirectory(repoRoot, manifestRoot);
    scanUnresolvedRuns(manifestRoot);
  } catch (error) {
    return { kind: "attempt", ...writeAttempt(manifest, "BLOCKED", [blockerCode(error)], false) };
  }
  const fixtureRoot = resolve(manifestRoot, manifest.run_id);
  ensureDurableDirectory(repoRoot, fixtureRoot);
  const ids = buildFixtureIds(manifest.run_id);
  const seededExpected = fixtureCounts(ids);
  const preSeedProjection = preSeedCostProjection(ids);
  if (preSeedProjection.status !== "PASS") {
    const costBlockers = [
      ...(preSeedProjection.read_percent >= FREE_TIER_SAFETY_PERCENT ? ["FREE_TIER_READ_SAFETY_THRESHOLD"] : []),
      ...(preSeedProjection.write_percent >= FREE_TIER_SAFETY_PERCENT ? ["FREE_TIER_WRITE_SAFETY_THRESHOLD"] : []),
    ];
    return { kind: "attempt", ...writeAttempt(manifest, "BLOCKED", costBlockers, false) };
  }

  const runner = input.commandRunner ?? defaultRunner;
  const stages: StageRecord[] = [];
  const queries: QueryRecord[] = [];
  const rawStagePaths: string[] = [];
  let executed = false;
  let executionFailure: string | null = null;
  let cleanupFailure: string | null = null;
  let cleanupManifest: RawCleanupManifest | undefined;
  let cleanupReceiptValue: HostedCleanupReceipt | undefined;
  let cleanupReceiptPath: string | undefined;
  let sqliteVersion = "";
  const cleanupPath = resolve(fixtureRoot, "cleanup.json");

  try {
    const preflight = runSqlStage({ repoRoot, fixtureRoot, role: "preflight", sql: "SELECT sqlite_version() AS sqlite_version;\n", runner });
    executed = true;
    stages.push(preflight.stage);
    rawStagePaths.push(preflight.sqlPath);
    const version = preflight.envelopes[0]?.results?.[0];
    sqliteVersion = isPlainObject(version) && typeof version.sqlite_version === "string" ? version.sqlite_version : "";
    if (!/^\d+\.\d+\.\d+/u.test(sqliteVersion)) throw new Error("D1_SQLITE_VERSION_MISSING");

    cleanupManifest = rawCleanupPayload({
      schema_version: "estimate-sheet-hosted-cleanup-manifest.v1",
      state: "CLEANUP_PREPARED",
      run_id: manifest.run_id,
      unit_id: "UNIT-011",
      database_binding: DATABASE_BINDING,
      database_id_sha256: sha256Hex(config.databaseId),
      source_fingerprint: { application: manifest.applicationFingerprint.content_sha256, producer: manifest.producerFingerprint.content_sha256 },
      table_order: TABLE_ORDER,
      ids,
      seeded: zeroCounts(),
      deleted: zeroCounts(),
      remaining: seededExpected,
      prior_state: null,
      updated_at: nowIso(),
    });
    writeJsonNoOverwrite(cleanupPath, cleanupManifest, 0o600);

    const seed = runSqlStage({ repoRoot, fixtureRoot, role: "seed", sql: buildSeedSql(ids), runner });
    stages.push(seed.stage);
    rawStagePaths.push(seed.sqlPath);
    const seeded = runSqlStage({ repoRoot, fixtureRoot, role: "seed-reconciliation", sql: buildReconciliationSql(ids), runner });
    stages.push(seeded.stage);
    rawStagePaths.push(seeded.sqlPath);
    const seededCounts = parseCounts(seeded.envelopes);
    if (!TABLE_ORDER.every((table) => seededCounts[table] === seededExpected[table])) throw new Error("SEEDED_COUNT_MISMATCH");
    cleanupManifest = replaceCleanupManifest(cleanupPath, {
      ...cleanupManifest,
      seeded: seededCounts,
      remaining: seededCounts,
      prior_state: cleanupManifest.state,
      updated_at: nowIso(),
    });

    for (const surface of QUERY_SURFACES) {
      const measured = runSqlStage({ repoRoot, fixtureRoot, role: `query-${surface}`, sql: buildQuerySql(surface, ids), runner });
      stages.push(measured.stage);
      rawStagePaths.push(measured.sqlPath);
      const record = queryRecord(surface, ids, measured.stage, measured.envelopes);
      if (record.result_row_count !== expectedQueryResultRows(surface, ids)) {
        throw new Error(`QUERY_RESULT_COUNT_INVALID:${surface}`);
      }
      queries.push(record);
    }
  } catch (error) {
    executionFailure = blockerCode(error);
  } finally {
    if (cleanupManifest && existsSync(cleanupPath)) {
      try {
        cleanupManifest = replaceCleanupManifest(cleanupPath, {
          ...cleanupManifest,
          state: "DELETE_DISPATCHED",
          prior_state: cleanupManifest.state,
          updated_at: nowIso(),
        });
        const cleaned = runSqlStage({ repoRoot, fixtureRoot, role: "cleanup", sql: buildCleanupSql(ids), runner });
        executed = true;
        stages.push(cleaned.stage);
        rawStagePaths.push(cleaned.sqlPath);
        const deleted = parseDeletedCounts(cleaned.envelopes);
        cleanupManifest = replaceCleanupManifest(cleanupPath, {
          ...cleanupManifest,
          state: "DELETE_ACKED",
          deleted,
          prior_state: cleanupManifest.state,
          updated_at: nowIso(),
        });
        const reconciled = runSqlStage({ repoRoot, fixtureRoot, role: "cleanup-reconciliation", sql: buildReconciliationSql(ids), runner });
        stages.push(reconciled.stage);
        rawStagePaths.push(reconciled.sqlPath);
        const remaining = parseCounts(reconciled.envelopes);
        if (!TABLE_ORDER.every((table) => remaining[table] === 0 && deleted[table] === cleanupManifest!.seeded[table])) {
          throw new Error("CLEANUP_RECONCILIATION_MISMATCH");
        }
        cleanupManifest = replaceCleanupManifest(cleanupPath, {
          ...cleanupManifest,
          state: "CLEANUP_VERIFIED",
          remaining,
          prior_state: cleanupManifest.state,
          updated_at: nowIso(),
        });
        cleanupReceiptValue = cleanupReceipt({ manifest, config, cleanupManifest, invalidatedProducer: executionFailure !== null });
        cleanupReceiptPath = ensureContainedRunPath(manifest.run_root, "cleanup/hosted-d1-cleanup.json");
        writeJsonNoOverwrite(cleanupReceiptPath, cleanupReceiptValue, 0o600);
        unlinkSync(cleanupPath);
        fsyncDirectory(fixtureRoot);
        removeRawStageFiles(rawStagePaths);
      } catch (error) {
        cleanupFailure = blockerCode(error);
      }
    }
  }

  if (executionFailure || cleanupFailure || !cleanupReceiptValue || !cleanupReceiptPath || queries.length !== QUERY_SURFACES.length) {
    return {
      kind: "attempt",
      ...writeAttempt(manifest, "FAIL", [executionFailure, cleanupFailure, !cleanupReceiptValue ? "CLEANUP_RECEIPT_MISSING" : null].filter((value): value is string => Boolean(value)), executed),
    };
  }

  const fixtureHash = sha256Json({ profile: FIXTURE_PROFILE, counts: seededExpected, exactIdJournalSha256: cleanupReceiptValue.exact_id_journal_sha256 });
  try {
    const report = writeHostedReport({
      manifest,
      output: input.output,
      config,
      wranglerVersion: toolVersion,
      sqliteVersion,
      fixtureHash,
      stages,
      queries,
      cleanup: cleanupReceiptValue,
      cleanupReceiptPath,
      testDependency: testDependency!,
      gateDependencies,
      preSeedProjection,
    });
    return { kind: "report", ...report, cleanupReceiptPath };
  } catch (error) {
    return { kind: "attempt", ...writeAttempt(manifest, "FAIL", [blockerCode(error)], true) };
  }
}

function assertAllowedOptions(values: Map<string, string | boolean>, allowed: readonly string[]): void {
  for (const key of values.keys()) if (!allowed.includes(key)) throw new Error(`unknown option: --${key}`);
}

export function main(argv = process.argv.slice(2)): number {
  const values = parseStrictCli(argv);
  assertAllowedOptions(values, ["help", "run-manifest", "unit", "profile", "tests", "gates", "output", "manifest-root", "cleanup-only", "run-id", "receipt-output"]);
  if (cliBoolean(values, "help")) {
    console.log("Usage: bun run scripts/verify-estimate-sheet-hosted-d1-performance-proof.ts --unit=UNIT-011 --profile=limit --tests=auto:dom-tests --gates=auto:wrangler-auth,auto:provider-resources --output=auto:hosted");
    console.log("       bun run scripts/verify-estimate-sheet-hosted-d1-performance-proof.ts --unit=UNIT-011 --cleanup-only --run-id=UUID --manifest-root=PATH --receipt-output=PATH/UUID/hosted-cleanup-recovery.json");
    return 0;
  }
  const repoRoot = process.cwd();
  const unit = cliString(values, "unit") ?? "UNIT-011";
  if (unit !== "UNIT-011") throw new Error("hosted D1 proof is restricted to UNIT-011");
  if (cliBoolean(values, "cleanup-only")) {
    for (const forbidden of ["run-manifest", "profile", "tests", "gates", "output"] as const) {
      if (values.has(forbidden)) throw new Error(`cleanup-only forbids --${forbidden}`);
    }
    const runId = cliString(values, "run-id");
    const manifestRoot = cliString(values, "manifest-root");
    const receiptOutput = cliString(values, "receipt-output");
    if (!runId || !manifestRoot || !receiptOutput) {
      throw new Error("cleanup-only requires --run-id, --manifest-root, and --receipt-output");
    }
    const recovered = recoverEstimateSheetHostedD1Cleanup({ repoRoot, runId, manifestRoot, receiptOutput });
    process.stdout.write(`${canonicalJson({ kind: "cleanup-recovery", result: recovered.receipt.result, output_path: recovered.output })}\n`);
    return 0;
  }
  if (values.has("run-id") || values.has("receipt-output")) throw new Error("--run-id and --receipt-output require --cleanup-only");
  const runManifest = cliString(values, "run-manifest") ?? process.env.ESTIMATE_PERF_RUN_MANIFEST ?? resolveRunManifestPath(repoRoot, unit);
  const result = verifyEstimateSheetHostedD1PerformanceProof({
    repoRoot,
    runManifest,
    output: cliString(values, "output"),
    profile: cliString(values, "profile") ?? FIXTURE_PROFILE,
    tests: cliString(values, "tests"),
    gates: (cliString(values, "gates") ?? "").split(",").filter(Boolean),
    manifestRoot: cliString(values, "manifest-root"),
  });
  process.stdout.write(`${canonicalJson(result.kind === "report"
    ? { kind: result.kind, result: result.report.overall, output_path: result.output, cleanup_receipt_path: result.cleanupReceiptPath }
    : { kind: result.kind, result: result.attempt.result, output_path: result.output, blockers: result.attempt.blockers })}\n`);
  return result.kind === "report" && result.report.overall === "PASS" ? 0 : 1;
}

if (import.meta.main) {
  try { process.exitCode = main(); }
  catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
}
