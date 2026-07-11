#!/usr/bin/env bun

import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
} from "node:fs";
import { resolve } from "node:path";

import { makeSignature } from "better-auth/crypto";
import {
  buildEstimatePerformanceFixture,
  fixturePayloadWithoutLinkage,
  flattenEstimatePerformanceNodes,
  stableStringify,
  type EstimatePerformanceRowFixture,
  type EstimateSheetPerformanceFixture,
} from "../tests/fixtures/estimate-sheet-performance";
import {
  assertPerformanceReport,
  assertRunManifest,
  assertTestReceipt,
  canonicalJson,
  cliBoolean,
  cliString,
  ensureContainedRunPath,
  fingerprintContentEqual,
  isPlainObject,
  isSha256,
  nowIso,
  parseStrictCli,
  readJsonFile,
  resolveManifestLogicalOutput,
  resolveRunManifestPath,
  sha256File,
  sha256Hex,
  writeJsonNoOverwrite,
  writeNoOverwrite,
  type PerformanceReportV1,
  type EstimateOutputRole,
  type RunManifestV1,
  type TestReceiptV1,
} from "./lib/estimate-sheet-performance-contract";
import { computeEstimateSheetSourceFingerprint } from "./compute-estimate-sheet-source-fingerprint";
import { generateLocalBetterAuthD1SchemaSqlProof } from "./generate-cloudflare-better-auth-proof";

const LOCAL_D1_MEASUREMENT_SCHEMA = "estimate-sheet-local-d1-measurement.v1" as const;
const LOCAL_D1_CLEANUP_STATE_SCHEMA = "estimate-sheet-local-d1-cleanup-state.v1" as const;
const D1_BINDING = "ARCH_DB" as const;
const EXPECTED_BETTER_AUTH_TABLES = ["account", "rateLimit", "session", "user", "verification"] as const;
const EXPECTED_BETTER_AUTH_STATEMENTS = 8;
const EXPECTED_INSTALLED_BIND_CEILING = 100;

export const REQUIRED_LOCAL_D1_SURFACES = [
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

export const LOCAL_D1_CLEANUP_TABLE_ORDER = [
  "estimate_row_items",
  "estimate_nodes",
  "estimate_tabs",
  "estimate_sheet_access_settings",
  "estimate_sheet_members",
  "estimates",
  "project_members",
  "projects",
  "workspace_members",
  "workspaces",
  "profiles",
] as const;

const LOCAL_D1_AUTH_CLEANUP_TABLE_ORDER = [
  "session",
  "user",
  "legal_terms_acceptances",
  "closed_beta_allowed_emails",
] as const;

type D1Metric = {
  value: number;
  threshold?: number;
  comparison?: "maximum" | "exact";
  unit: "count" | "percent";
  status: "PASS" | "FAIL";
  source: string;
  [key: string]: unknown;
};

export type LocalD1StatementRecord = {
  surface: (typeof REQUIRED_LOCAL_D1_SURFACES)[number];
  statementName: string;
  normalizedSqlHash: string;
  bindCount: number;
  bindCeilingOutcome: "WITHIN_LIMIT" | "EXCEEDS_LIMIT";
  statementCount: number;
  queryCount: number;
  batchSize: number;
  durationMs: number | null;
  rowsRead: number | null;
  rowsWritten: number | null;
  resultRowCount: number;
  queryPlan: string[];
  queryPlanBasisBindCount: number;
  selectedIndex: string | null;
  seededCount: number;
  cleanedCount: number;
  evidenceClass: "local-d1";
  outcome: "PASS" | "FAIL";
  failureId?: "D1_TOO_MANY_SQL_VARIABLES";
};

export type LocalD1Measurement = {
  schemaVersion: typeof LOCAL_D1_MEASUREMENT_SCHEMA;
  provider: "cloudflare-d1-local";
  providerBacked: true;
  binding: typeof D1_BINDING;
  databaseIdSha256: string;
  persistenceRoot: "wrangler-state";
  persistenceRootIdSha256: string;
  wranglerVersion: string;
  betterAuthVersion: string;
  schemaHash: string;
  generatedSchemaHash: string;
  generatedSchemaStatementCount: number;
  generatedSchemaTables: string[];
  migrationSetHash: string;
  migrationHead: string;
  migrationCount: number;
  migrationStatementCount: number;
  migrationIdempotency: {
    firstPassApplied: number;
    secondPassApplied: number;
    ledgerCount: number;
  };
  fixture: {
    profile: "limit";
    nodeCount: 1_500;
    rowCount: 5_000;
    componentMatchCount: 1_000;
    fixtureHash: string;
  };
  bindCeiling: {
    installed: 100;
    provider: 100;
    effective: 100;
    successAtCeiling: true;
    failureAboveCeiling: true;
    rowLoadBindCount: 1_501;
    rowLoadOutcome: "FAIL";
  };
  statements: LocalD1StatementRecord[];
  queryCount: number;
  bindCounts: number[];
  rowsRead: number | null;
  rowsWritten: number | null;
  queryPlans: Array<{
    statementName: string;
    details: string[];
    selectedIndex: string | null;
  }>;
  cleanup: {
    statePath: "cleanup/d1-state.json";
    stateSha256: string;
    exactTableOrder: string[];
    auxiliaryAuthTableOrder: string[];
    seeded: Record<string, number>;
    deleted: Record<string, number>;
    remaining: Record<string, number>;
  };
  costProjection: {
    trafficModel: "10-users-500-actions-50-route-opens";
    projectedRowsReadPerDay: number;
    projectedRowsWrittenPerDay: number;
    planningBaselineReadAllowance: 5_000_000;
    planningBaselineWriteAllowance: 100_000;
    maximumPercent: number;
    thresholdPercent: 50;
    status: "PASS" | "FAIL";
  };
  metrics: Record<string, D1Metric>;
  functionalScenarios: Record<string, "PASS">;
};

export type D1MeasurementResult = {
  report: PerformanceReportV1;
  reportPath: string;
  providerBacked: true;
  complete: true;
  blockers: [];
};

type D1MetaRecord = {
  duration?: unknown;
  rows_read?: unknown;
  rows_written?: unknown;
  changes?: unknown;
};

type MigrationDescriptor = {
  name: string;
  path: string;
  sha256: string;
  sql: string;
  statements: string[];
};

type FixtureIds = {
  user: string;
  session: string;
  allowlist: string;
  legal: string;
  profile: string;
  workspace: string;
  project: string;
  estimate: string;
  tab: string;
  nodes: string[];
  rows: string[];
};

type QueryRecordInput = {
  surface: LocalD1StatementRecord["surface"];
  statementName: string;
  sql: string;
  binds: unknown[];
  operation?: "all" | "run";
  expectedResultRows?: number;
  expectBindCeilingFailure?: boolean;
  planSql?: string;
  planBinds?: unknown[];
};

function finiteMeta(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

function sumNullable(values: Array<number | null>): number | null {
  const numeric = values.filter((value): value is number => value !== null);
  return numeric.length === values.length ? numeric.reduce((sum, value) => sum + value, 0) : null;
}

function deterministicUuid(seed: string, label: string): string {
  const hex = createHash("sha256").update(`${seed}\0${label}`).digest("hex").slice(0, 32).split("");
  hex[12] = "4";
  hex[16] = "8";
  const value = hex.join("");
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
}

export function normalizeD1Sql(sql: string): string {
  return sql
    .replace(/--[^\n\r]*/gu, " ")
    .replace(/\s+/gu, " ")
    .replace(/\s*([(),=<>])\s*/gu, "$1")
    .trim();
}

function sqlHash(sql: string): string {
  return sha256Hex(normalizeD1Sql(sql));
}

function selectedIndex(details: string[]): string | null {
  for (const detail of details) {
    const match = /\bUSING(?:\s+COVERING)?\s+INDEX\s+([^\s(]+)/iu.exec(detail);
    if (match?.[1]) return match[1];
    if (/\bUSING\s+INTEGER\s+PRIMARY\s+KEY\b/iu.test(detail)) return "INTEGER_PRIMARY_KEY";
  }
  return null;
}

function d1FailureId(error: unknown): "D1_TOO_MANY_SQL_VARIABLES" | null {
  const message = error instanceof Error ? error.message : String(error);
  return /too many SQL variables/iu.test(message) ? "D1_TOO_MANY_SQL_VARIABLES" : null;
}

function readPackageVersion(packageName: "wrangler" | "better-auth"): string {
  const path = resolve(process.cwd(), "node_modules", packageName, "package.json");
  const value = readJsonFile<{ version?: unknown }>(path);
  if (typeof value.version !== "string" || !/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/u.test(value.version)) {
    throw new Error(`${packageName} package version is unavailable`);
  }
  return value.version;
}

export function validateBetterAuthD1SchemaProof(proof: unknown): string[] {
  const errors: string[] = [];
  if (!isPlainObject(proof)) return ["Better Auth schema proof must be an object"];
  if (proof.generated !== true) errors.push("Better Auth schema was not generated");
  if (proof.staticReviewReady !== true) errors.push("Better Auth schema static review is not ready");
  if (proof.statementCount !== EXPECTED_BETTER_AUTH_STATEMENTS) errors.push(`Better Auth schema must contain exactly ${EXPECTED_BETTER_AUTH_STATEMENTS} statements`);
  if (!isSha256(proof.sha256)) errors.push("Better Auth schema hash is invalid");
  if (typeof proof.sql !== "string" || !proof.sql.trim()) errors.push("Better Auth schema SQL is missing");
  const tables = Array.isArray(proof.tableNames) ? proof.tableNames : [];
  if (canonicalJson([...tables].sort()) !== canonicalJson([...EXPECTED_BETTER_AUTH_TABLES].sort())) {
    errors.push(`Better Auth schema tables must be exactly ${EXPECTED_BETTER_AUTH_TABLES.join(",")}`);
  }
  return errors;
}

export function validateLimitD1Fixture(fixture: unknown): string[] {
  const errors: string[] = [];
  if (!isPlainObject(fixture)) return ["D1 fixture must be an object"];
  if (fixture.profile !== "limit") errors.push("D1 fixture profile must be limit");
  if (!isPlainObject(fixture.expectedTotals)) return [...errors, "D1 fixture expectedTotals is missing"];
  if (fixture.expectedTotals.nodeCount !== 1_500) errors.push("D1 fixture must contain exactly 1,500 nodes");
  if (fixture.expectedTotals.rowCount !== 5_000) errors.push("D1 fixture must contain exactly 5,000 rows");
  if (fixture.expectedTotals.componentMatchCount !== 1_000) errors.push("D1 fixture must contain exactly 1,000 project-component matches");
  if (!Array.isArray(fixture.rows) || fixture.rows.length !== 5_000) errors.push("D1 fixture row array is incomplete");
  return errors;
}

export function validateLocalD1RunManifest(manifest: unknown): string[] {
  const errors: string[] = [];
  try {
    assertRunManifest(manifest);
  } catch (error) {
    return [error instanceof Error ? error.message : String(error)];
  }
  const run = manifest as RunManifestV1;
  if (run.unit_id !== "UNIT-003" && run.unit_id !== "UNIT-005" && run.unit_id !== "UNIT-010") {
    errors.push("local D1 measurement is declared only for UNIT-003, UNIT-005, and UNIT-010");
  }
  if (run.profile !== "limit") errors.push("local D1 measurement requires the limit profile");
  if (run.evidence_class !== "local-d1") errors.push("run manifest evidence_class must be local-d1");
  if (run.cleanupRequirement !== "REQUIRED") errors.push("local D1 measurement requires cleanup");
  if (run.status !== "PREPARED") errors.push("local D1 measurement requires a PREPARED run");
  if (!isPlainObject(run.namespaces.d1)) errors.push("local D1 run requires an isolated d1 namespace");
  if (run.runtimeEnv !== undefined || run.storageState !== undefined || run.activePreview !== undefined) {
    errors.push("pure local D1 runs cannot contain browser or preview resources");
  }
  if (run.previewProcesses.length !== 0) errors.push("pure local D1 runs cannot launch preview processes");
  return errors;
}

function validateTableCountMap(value: unknown, label: string): string[] {
  if (!isPlainObject(value)) return [`${label} must be an object`];
  const errors: string[] = [];
  for (const table of LOCAL_D1_CLEANUP_TABLE_ORDER) {
    if (!Number.isInteger(value[table]) || Number(value[table]) < 0) errors.push(`${label}.${table} must be a non-negative integer`);
  }
  return errors;
}

export function validateCompleteLocalD1Measurement(value: unknown): string[] {
  const errors: string[] = [];
  if (!isPlainObject(value)) return ["local D1 measurement must be an object"];
  if (value.schemaVersion !== LOCAL_D1_MEASUREMENT_SCHEMA) errors.push("local D1 measurement schema is invalid");
  if (value.provider !== "cloudflare-d1-local" || value.providerBacked !== true || value.binding !== D1_BINDING) errors.push("local D1 provider identity is invalid");
  for (const key of ["databaseIdSha256", "persistenceRootIdSha256", "schemaHash", "generatedSchemaHash", "migrationSetHash"]) {
    if (!isSha256(value[key])) errors.push(`${key} is invalid`);
  }
  if (value.persistenceRoot !== "wrangler-state") errors.push("persistenceRoot must be wrangler-state");
  if (!Array.isArray(value.generatedSchemaTables) || canonicalJson([...value.generatedSchemaTables].sort()) !== canonicalJson([...EXPECTED_BETTER_AUTH_TABLES].sort())) errors.push("generated schema table set is invalid");
  if (value.generatedSchemaStatementCount !== EXPECTED_BETTER_AUTH_STATEMENTS) errors.push("generated schema statement count is invalid");
  if (typeof value.migrationHead !== "string" || !/^\d{4}_.+\.sql$/u.test(value.migrationHead)) errors.push("migration head is invalid");
  if (!Number.isInteger(value.migrationCount) || Number(value.migrationCount) < 1) errors.push("migrationCount is invalid");
  if (!Number.isInteger(value.migrationStatementCount) || Number(value.migrationStatementCount) < Number(value.migrationCount)) errors.push("migrationStatementCount is invalid");
  if (!isPlainObject(value.migrationIdempotency) || value.migrationIdempotency.firstPassApplied !== value.migrationCount || value.migrationIdempotency.secondPassApplied !== 0 || value.migrationIdempotency.ledgerCount !== value.migrationCount) errors.push("migration idempotency proof is incomplete");
  if (!isPlainObject(value.fixture) || value.fixture.profile !== "limit" || value.fixture.nodeCount !== 1_500 || value.fixture.rowCount !== 5_000 || value.fixture.componentMatchCount !== 1_000 || !isSha256(value.fixture.fixtureHash)) errors.push("limit fixture summary is invalid");
  if (!isPlainObject(value.bindCeiling) || value.bindCeiling.installed !== 100 || value.bindCeiling.provider !== 100 || value.bindCeiling.effective !== 100 || value.bindCeiling.successAtCeiling !== true || value.bindCeiling.failureAboveCeiling !== true || value.bindCeiling.rowLoadBindCount !== 1_501 || value.bindCeiling.rowLoadOutcome !== "FAIL") errors.push("bind-ceiling proof is incomplete");
  if (!Array.isArray(value.statements) || value.statements.length === 0) {
    errors.push("statement measurements are missing");
  } else {
    const seenNames = new Set<string>();
    const seenSurfaces = new Set<string>();
    for (const [index, candidate] of value.statements.entries()) {
      if (!isPlainObject(candidate)) { errors.push(`statements[${index}] must be an object`); continue; }
      if (typeof candidate.statementName !== "string" || !candidate.statementName) errors.push(`statements[${index}].statementName is invalid`);
      else if (seenNames.has(candidate.statementName)) errors.push(`duplicate statement name: ${candidate.statementName}`);
      else seenNames.add(candidate.statementName);
      if (typeof candidate.surface !== "string") errors.push(`statements[${index}].surface is invalid`);
      else seenSurfaces.add(candidate.surface);
      if (!isSha256(candidate.normalizedSqlHash)) errors.push(`statements[${index}].normalizedSqlHash is invalid`);
      for (const key of ["bindCount", "statementCount", "queryCount", "batchSize", "resultRowCount", "queryPlanBasisBindCount", "seededCount", "cleanedCount"]) {
        if (!Number.isInteger(candidate[key]) || Number(candidate[key]) < 0) errors.push(`statements[${index}].${key} is invalid`);
      }
      for (const key of ["durationMs", "rowsRead", "rowsWritten"]) {
        if (candidate[key] !== null && (typeof candidate[key] !== "number" || !Number.isFinite(candidate[key]) || Number(candidate[key]) < 0)) errors.push(`statements[${index}].${key} is invalid`);
      }
      if (!Array.isArray(candidate.queryPlan) || candidate.queryPlan.length === 0 || candidate.queryPlan.some((item) => typeof item !== "string" || !item)) errors.push(`statements[${index}].queryPlan is incomplete`);
      if (candidate.selectedIndex !== null && (typeof candidate.selectedIndex !== "string" || !candidate.selectedIndex)) errors.push(`statements[${index}].selectedIndex is invalid`);
      if (candidate.evidenceClass !== "local-d1") errors.push(`statements[${index}].evidenceClass is invalid`);
      const isExpectedBindFailure = candidate.surface === "limit-tree-row-load" && candidate.outcome === "FAIL" && candidate.failureId === "D1_TOO_MANY_SQL_VARIABLES";
      if (candidate.outcome !== "PASS" && !isExpectedBindFailure) errors.push(`statements[${index}] has an unexpected failure`);
    }
    for (const surface of REQUIRED_LOCAL_D1_SURFACES) if (!seenSurfaces.has(surface)) errors.push(`missing D1 surface: ${surface}`);
    const queryCount = value.statements.reduce((sum: number, candidate: unknown) => sum + (isPlainObject(candidate) && Number.isInteger(candidate.queryCount) ? Number(candidate.queryCount) : 0), 0);
    if (value.queryCount !== queryCount) errors.push("aggregate queryCount does not match statement records");
  }
  if (!Array.isArray(value.bindCounts) || value.bindCounts.length !== (Array.isArray(value.statements) ? value.statements.length : 0)) errors.push("bindCounts are incomplete");
  if (!Array.isArray(value.queryPlans) || value.queryPlans.length !== (Array.isArray(value.statements) ? value.statements.length : 0)) errors.push("queryPlans are incomplete");
  if (!isPlainObject(value.cleanup)) errors.push("cleanup contract is missing");
  else {
    if (value.cleanup.statePath !== "cleanup/d1-state.json" || !isSha256(value.cleanup.stateSha256)) errors.push("cleanup state binding is invalid");
    if (canonicalJson(value.cleanup.exactTableOrder) !== canonicalJson(LOCAL_D1_CLEANUP_TABLE_ORDER)) errors.push("cleanup table order is invalid");
    if (canonicalJson(value.cleanup.auxiliaryAuthTableOrder) !== canonicalJson(LOCAL_D1_AUTH_CLEANUP_TABLE_ORDER)) errors.push("auth cleanup table order is invalid");
    errors.push(...validateTableCountMap(value.cleanup.seeded, "cleanup.seeded"));
    errors.push(...validateTableCountMap(value.cleanup.deleted, "cleanup.deleted"));
    errors.push(...validateTableCountMap(value.cleanup.remaining, "cleanup.remaining"));
    if (isPlainObject(value.cleanup.seeded) && (value.cleanup.seeded.estimate_nodes !== 1_500 || value.cleanup.seeded.estimate_row_items !== 5_000)) errors.push("cleanup seed counts do not bind the limit fixture");
    if (isPlainObject(value.cleanup.seeded) && isPlainObject(value.cleanup.remaining) && canonicalJson(value.cleanup.seeded) !== canonicalJson(value.cleanup.remaining)) errors.push("pre-cleanup remaining counts must equal seeded counts");
    if (isPlainObject(value.cleanup.deleted) && Object.values(value.cleanup.deleted).some((count) => count !== 0)) errors.push("measurement cannot claim cleanup before the cleanup command");
  }
  if (!isPlainObject(value.metrics)) errors.push("D1 metrics are missing");
  else for (const metricId of ["M-D1-ROUTE-CONTEXT-STATEMENTS", "M-D1-TAB-TREE-STATEMENTS", "M-D1-ROW-UPDATE-STATEMENTS", "M-D1-SUBTREE-DEPTH-SHAPE", "M-D1-BIND-CEILING", "M-D1-COST-PROJECTION-PCT", "M-MUTATE-SERVER-FANOUT-BUDGET"]) {
    if (!isPlainObject(value.metrics[metricId]) || !["PASS", "FAIL"].includes(String((value.metrics[metricId] as Record<string, unknown>).status))) errors.push(`missing hard D1 metric: ${metricId}`);
  }
  if (!isPlainObject(value.functionalScenarios)) errors.push("functional scenario results are missing");
  else for (const surface of REQUIRED_LOCAL_D1_SURFACES.filter((item) => item.startsWith("auth-denial-"))) if (value.functionalScenarios[surface] !== "PASS") errors.push(`functional denial scenario failed: ${surface}`);
  return errors;
}

export function assertCompleteLocalD1Measurement(value: unknown): asserts value is LocalD1Measurement {
  const errors = validateCompleteLocalD1Measurement(value);
  if (errors.length) throw new Error(`invalid local D1 measurement:\n- ${errors.join("\n- ")}`);
}

function assertReportForRun(report: PerformanceReportV1, manifest: RunManifestV1): void {
  assertPerformanceReport(report, { strict: true });
  if (report.evidenceClass !== "local-d1" || report.trace.unitId !== manifest.unit_id || report.runId !== manifest.run_id) throw new Error("local D1 report run identity mismatch");
  if (!fingerprintContentEqual(report.applicationFingerprint, manifest.applicationFingerprint) || !fingerprintContentEqual(report.producerFingerprint, manifest.producerFingerprint)) throw new Error("local D1 report fingerprint mismatch");
  assertCompleteLocalD1Measurement(report.d1);
}

export function publishLocalD1Report(path: string, report: PerformanceReportV1, manifest: RunManifestV1): void {
  assertReportForRun(report, manifest);
  writeJsonNoOverwrite(path, report, 0o600);
}

function assertRegularDirectory(path: string, label: string): void {
  const stat = lstatSync(path);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error(`${label} must be a regular directory`);
}

function resolveOutputPath(manifest: RunManifestV1, value: string): string {
  if (!value.startsWith("auto:")) return ensureContainedRunPath(manifest.run_root, value);
  const role = value.slice("auto:".length);
  if (!/^[a-z0-9][a-z0-9-]*$/u.test(role)) throw new Error("D1 output role is invalid");
  return resolveManifestLogicalOutput(manifest, role as EstimateOutputRole);
}

function resolveTestReceipt(manifest: RunManifestV1, value: string): { path: string; receipt: TestReceiptV1 } {
  const path = value.startsWith("auto:")
    ? resolveManifestLogicalOutput(manifest, value.slice("auto:".length) as EstimateOutputRole)
    : ensureContainedRunPath(manifest.run_root, value);
  const receipt = readJsonFile<TestReceiptV1>(path);
  assertTestReceipt(receipt);
  if (receipt.unit_id !== manifest.unit_id || receipt.run_id !== manifest.run_id) throw new Error("D1 test receipt run identity mismatch");
  if (!fingerprintContentEqual(receipt.application_fingerprint, manifest.applicationFingerprint) || !fingerprintContentEqual(receipt.producer_fingerprint, manifest.producerFingerprint)) throw new Error("D1 test receipt fingerprint mismatch");
  if (receipt.overall !== "PASS" || receipt.failed !== 0 || receipt.passed < 1) throw new Error("D1 test receipt must be a passing cohort");
  if (receipt.fixtureMutation && receipt.fixtureMutation.fixtureRole !== "d1") throw new Error("D1 test receipt fixture role mismatch");
  return { path, receipt };
}

function loadMigrations(
  repoRoot: string,
  splitSqlQuery: typeof import("wrangler")["unstable_splitSqlQuery"],
): MigrationDescriptor[] {
  const migrationRoot = resolve(repoRoot, "migrations");
  if (!existsSync(migrationRoot)) throw new Error("active migrations directory is missing");
  assertRegularDirectory(migrationRoot, "active migrations directory");
  const names = readdirSync(migrationRoot).filter((name) => name.endsWith(".sql")).sort();
  if (!names.length || names.some((name) => !/^\d{4}_[a-z0-9_]+\.sql$/u.test(name))) throw new Error("active migration inventory is empty or malformed");
  if (new Set(names.map((name) => name.slice(0, 4))).size !== names.length) throw new Error("active migration ordinals are duplicated");
  return names.map((name) => {
    const path = resolve(migrationRoot, name);
    const stat = lstatSync(path);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`migration must be a regular file: ${name}`);
    const sql = readFileSync(path, "utf8");
    const statements = splitSqlQuery(sql).filter((statement) => !/^\s*(?:BEGIN|COMMIT)\s*;?\s*$/iu.test(statement));
    if (!statements.length) throw new Error(`migration has no executable statements: ${name}`);
    return { name, path, sha256: sha256File(path), sql, statements };
  });
}

function localWranglerConfig(
  repoRoot: string,
  readConfig: typeof import("wrangler")["unstable_readConfig"],
): { databaseName: string; databaseId: string; compatibilityDate: string } {
  const configPath = resolve(repoRoot, "wrangler.jsonc");
  if (!existsSync(configPath)) throw new Error("wrangler.jsonc is missing");
  const config = readConfig({ config: configPath }) as unknown as {
    compatibility_date?: unknown;
    d1_databases?: Array<Record<string, unknown>>;
  };
  const matches = (config.d1_databases ?? []).filter((binding) => binding.binding === D1_BINDING);
  if (matches.length !== 1) throw new Error("wrangler.jsonc must define exactly one ARCH_DB binding");
  const match = matches[0]!;
  if (typeof match.database_name !== "string" || !match.database_name || typeof match.database_id !== "string" || !match.database_id) throw new Error("ARCH_DB binding is incomplete");
  if (typeof config.compatibility_date !== "string" || !/^\d{4}-\d{2}-\d{2}$/u.test(config.compatibility_date)) throw new Error("Wrangler compatibility date is invalid");
  return { databaseName: match.database_name, databaseId: match.database_id, compatibilityDate: config.compatibility_date };
}

async function applyMigrations(db: D1Database, migrations: MigrationDescriptor[]): Promise<{ firstPassApplied: number; secondPassApplied: number; ledgerCount: number; statementCount: number }> {
  await db.prepare("CREATE TABLE IF NOT EXISTS d1_migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, applied_at TEXT NOT NULL)").run();
  const applyPass = async () => {
    let applied = 0;
    for (const migration of migrations) {
      const found = await db.prepare("SELECT name FROM d1_migrations WHERE name = ?").bind(migration.name).first<{ name: string }>();
      if (found) continue;
      const statements = migration.statements.map((statement) => db.prepare(statement));
      statements.push(db.prepare("INSERT INTO d1_migrations (name, applied_at) VALUES (?, ?)").bind(migration.name, "2026-07-11T00:00:00.000Z"));
      await db.batch(statements);
      applied += 1;
    }
    return applied;
  };
  const firstPassApplied = await applyPass();
  const secondPassApplied = await applyPass();
  const ledger = await db.prepare("SELECT COUNT(*) AS count FROM d1_migrations").first<{ count: number }>();
  return {
    firstPassApplied,
    secondPassApplied,
    ledgerCount: Number(ledger?.count ?? -1),
    statementCount: migrations.reduce((sum, migration) => sum + migration.statements.length, 0),
  };
}

async function batchInChunks(db: D1Database, statements: D1PreparedStatement[], size = 50): Promise<D1Result[]> {
  const results: D1Result[] = [];
  for (let index = 0; index < statements.length; index += size) results.push(...await db.batch(statements.slice(index, index + size)));
  return results;
}

function makeFixtureIds(runId: string, fixture: EstimateSheetPerformanceFixture): FixtureIds {
  return {
    user: deterministicUuid(runId, "auth-user"),
    session: deterministicUuid(runId, "auth-session"),
    allowlist: deterministicUuid(runId, "allowlist"),
    legal: deterministicUuid(runId, "legal"),
    profile: deterministicUuid(runId, "profile"),
    workspace: deterministicUuid(runId, "workspace"),
    project: deterministicUuid(runId, "project"),
    estimate: deterministicUuid(runId, "estimate"),
    tab: deterministicUuid(runId, "tab"),
    nodes: flattenEstimatePerformanceNodes(fixture).map((node) => deterministicUuid(runId, node.id)),
    rows: fixture.rows.map((row) => deterministicUuid(runId, row.id)),
  };
}

function cleanupState(runId: string, namespaceIdSha256: string, ids: FixtureIds): Record<string, unknown> {
  return {
    schema_version: LOCAL_D1_CLEANUP_STATE_SCHEMA,
    state: "CLEANUP_PREPARED",
    run_id: runId,
    fixture_role: "d1",
    namespace_id_sha256: namespaceIdSha256,
    exact_table_order: LOCAL_D1_CLEANUP_TABLE_ORDER,
    auxiliary_auth_table_order: LOCAL_D1_AUTH_CLEANUP_TABLE_ORDER,
    exact_ids: {
      estimate_row_items: ids.rows,
      estimate_nodes: ids.nodes,
      estimate_tabs: [ids.tab],
      estimate_sheet_access_settings: [ids.estimate],
      estimate_sheet_members: [`${ids.estimate}:${ids.profile}`],
      estimates: [ids.estimate],
      project_members: [`${ids.project}:${ids.profile}`],
      projects: [ids.project],
      workspace_members: [`${ids.workspace}:${ids.profile}`],
      workspaces: [ids.workspace],
      profiles: [ids.profile],
      session: [ids.session],
      user: [ids.user],
      legal_terms_acceptances: [ids.legal],
      closed_beta_allowed_emails: [ids.allowlist],
    },
  };
}

function hierarchyCounts(ids: FixtureIds): Record<string, number> {
  return {
    estimate_row_items: ids.rows.length,
    estimate_nodes: ids.nodes.length,
    estimate_tabs: 1,
    estimate_sheet_access_settings: 1,
    estimate_sheet_members: 1,
    estimates: 1,
    project_members: 1,
    projects: 1,
    workspace_members: 1,
    workspaces: 1,
    profiles: 1,
  };
}

async function seedFixture(db: D1Database, fixture: EstimateSheetPerformanceFixture, ids: FixtureIds, sessionToken: string): Promise<void> {
  const timestamp = "2026-07-11T00:00:00.000Z";
  const email = `estimate-perf-${ids.profile.slice(0, 8)}@example.invalid`;
  await db.batch([
    db.prepare('INSERT INTO "user" (id, name, email, emailVerified, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)').bind(ids.user, "Estimate performance user", email, 1, timestamp, timestamp),
    db.prepare('INSERT INTO "session" (id, expiresAt, token, createdAt, updatedAt, userId) VALUES (?, ?, ?, ?, ?, ?)').bind(ids.session, "2027-07-11T00:00:00.000Z", sessionToken, timestamp, timestamp, ids.user),
    db.prepare("INSERT INTO closed_beta_allowed_emails (id, normalized_email, status, invited_at, accepted_at, created_at, updated_at) VALUES (?, ?, 'active', ?, ?, ?, ?)").bind(ids.allowlist, email, timestamp, timestamp, timestamp, timestamp),
    db.prepare("INSERT INTO legal_terms_acceptances (id, user_id, terms_key, terms_version, terms_effective_date, terms_content_hash, privacy_policy_version, acceptance_method, acceptance_context, accepted_at, created_at) VALUES (?, ?, 'terms', 'v1', '2026-07-11', ?, 'v1', 'authenticated_clickwrap', 'workshop_terms_gate', ?, ?)").bind(ids.legal, ids.profile, `sha256:${"a".repeat(64)}`, timestamp, timestamp),
    db.prepare("INSERT INTO profiles (id, email, display_name, role, default_workspace_id, created_at, updated_at) VALUES (?, ?, ?, 'member', ?, ?, ?)").bind(ids.profile, email, "Estimate performance profile", ids.workspace, timestamp, timestamp),
    db.prepare("INSERT INTO workspaces (id, name, slug, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)").bind(ids.workspace, "Estimate performance workspace", `perf-${ids.workspace.slice(0, 8)}`, ids.profile, timestamp, timestamp),
    db.prepare("INSERT INTO workspace_members (workspace_id, user_id, role, created_at, updated_at) VALUES (?, ?, 'admin', ?, ?)").bind(ids.workspace, ids.profile, timestamp, timestamp),
    db.prepare("INSERT INTO projects (id, workspace_id, name, project_code, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(ids.project, ids.workspace, "Estimate performance project", "PERF", ids.profile, timestamp, timestamp),
    db.prepare("INSERT INTO project_members (project_id, workspace_id, user_id, role, added_by, created_at, updated_at) VALUES (?, ?, ?, 'admin', ?, ?, ?)").bind(ids.project, ids.workspace, ids.profile, ids.profile, timestamp, timestamp),
    db.prepare("INSERT INTO estimates (id, project_id, name, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)").bind(ids.estimate, ids.project, "Estimate performance sheet", ids.profile, timestamp, timestamp),
    db.prepare("INSERT INTO estimate_sheet_members (estimate_id, project_id, user_id, role, added_by, created_at, updated_at) VALUES (?, ?, ?, 'admin', ?, ?, ?)").bind(ids.estimate, ids.project, ids.profile, ids.profile, timestamp, timestamp),
    db.prepare("INSERT INTO estimate_sheet_access_settings (estimate_id, project_id, inherit_project_access, updated_by, created_at, updated_at) VALUES (?, ?, 1, ?, ?, ?)").bind(ids.estimate, ids.project, ids.profile, timestamp, timestamp),
    db.prepare("INSERT INTO estimate_tabs (id, estimate_id, name, sort_order, is_default, created_by, created_at, updated_at) VALUES (?, ?, 'Main', 0, 1, ?, ?, ?)").bind(ids.tab, ids.estimate, ids.profile, timestamp, timestamp),
  ]);

  const nodes = flattenEstimatePerformanceNodes(fixture);
  const nodeIdByFixtureId = new Map(nodes.map((node, index) => [node.id, ids.nodes[index]!]));
  const nodeStatements = nodes.map((node, index) => db.prepare("INSERT INTO estimate_nodes (id, estimate_id, estimate_tab_id, name, kind, parent_id, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, 'area', ?, ?, ?, ?)").bind(
    ids.nodes[index]!,
    ids.estimate,
    ids.tab,
    `Fixture node ${index + 1}`,
    node.parentId ? nodeIdByFixtureId.get(node.parentId) ?? null : null,
    index,
    timestamp,
    timestamp,
  ));
  await batchInChunks(db, nodeStatements);

  const fixtureNodeIndexes = new Map(nodes.map((node, index) => [node.id, index]));
  const rowStatements = fixture.rows.map((row, index) => db.prepare("INSERT INTO estimate_row_items (id, estimate_id, node_id, description, material, quantity, unit, unit_cost, misc_cost, contingency_percentage, source_snapshot_json, sort_order, row_revision, source_library_item_id, metadata_json, supplier, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'pc', ?, ?, ?, ?, ?, ?, ?, '{}', 'Fixture supplier', ?, ?)").bind(
    ids.rows[index]!,
    ids.estimate,
    ids.nodes[fixtureNodeIndexes.get(row.nodeId) ?? 0]!,
    row.description,
    row.material,
    row.quantity,
    row.unitCost,
    row.miscCost,
    row.contingencyPercentage,
    JSON.stringify(row.sourceSnapshot),
    index,
    row.rowRevision,
    row.sourceLibraryItemId,
    timestamp,
    timestamp,
  ));
  await batchInChunks(db, rowStatements);
}

async function verifySeedCounts(db: D1Database, ids: FixtureIds): Promise<Record<string, number>> {
  const queries: Array<[string, string, unknown[]]> = [
    ["estimate_row_items", "SELECT COUNT(*) AS count FROM estimate_row_items WHERE estimate_id = ?", [ids.estimate]],
    ["estimate_nodes", "SELECT COUNT(*) AS count FROM estimate_nodes WHERE estimate_id = ?", [ids.estimate]],
    ["estimate_tabs", "SELECT COUNT(*) AS count FROM estimate_tabs WHERE id = ?", [ids.tab]],
    ["estimate_sheet_access_settings", "SELECT COUNT(*) AS count FROM estimate_sheet_access_settings WHERE estimate_id = ?", [ids.estimate]],
    ["estimate_sheet_members", "SELECT COUNT(*) AS count FROM estimate_sheet_members WHERE estimate_id = ? AND user_id = ?", [ids.estimate, ids.profile]],
    ["estimates", "SELECT COUNT(*) AS count FROM estimates WHERE id = ?", [ids.estimate]],
    ["project_members", "SELECT COUNT(*) AS count FROM project_members WHERE project_id = ? AND user_id = ?", [ids.project, ids.profile]],
    ["projects", "SELECT COUNT(*) AS count FROM projects WHERE id = ?", [ids.project]],
    ["workspace_members", "SELECT COUNT(*) AS count FROM workspace_members WHERE workspace_id = ? AND user_id = ?", [ids.workspace, ids.profile]],
    ["workspaces", "SELECT COUNT(*) AS count FROM workspaces WHERE id = ?", [ids.workspace]],
    ["profiles", "SELECT COUNT(*) AS count FROM profiles WHERE id = ?", [ids.profile]],
  ];
  const counts: Record<string, number> = {};
  for (const [table, sql, binds] of queries) {
    const row = await db.prepare(sql).bind(...binds).first<{ count: number }>();
    counts[table] = Number(row?.count ?? -1);
  }
  const expected = hierarchyCounts(ids);
  if (canonicalJson(counts) !== canonicalJson(expected)) throw new Error("D1 seed reconciliation failed");
  return counts;
}

async function explain(db: D1Database, sql: string, binds: unknown[]): Promise<{ details: string[]; meta: D1MetaRecord }> {
  const result = await db.prepare(`EXPLAIN QUERY PLAN ${sql}`).bind(...binds).all<Record<string, unknown>>();
  const details = result.results.map((row) => String(row.detail ?? "")).filter(Boolean);
  if (!details.length) throw new Error("D1 query plan is empty");
  return { details, meta: result.meta };
}

async function measureQuery(db: D1Database, input: QueryRecordInput, seededCount: number): Promise<LocalD1StatementRecord> {
  const planSql = input.planSql ?? input.sql;
  const planBinds = input.planBinds ?? input.binds;
  const plan = await explain(db, planSql, planBinds);
  try {
    const statement = db.prepare(input.sql).bind(...input.binds);
    const result = input.operation === "run" ? await statement.run() : await statement.all();
    if (input.expectBindCeilingFailure) throw new Error("1,501-bind row load unexpectedly succeeded");
    const resultRows = Array.isArray(result.results) ? result.results.length : 0;
    if (input.expectedResultRows !== undefined && resultRows !== input.expectedResultRows) throw new Error(`${input.statementName} returned ${resultRows}, expected ${input.expectedResultRows}`);
    const meta = result.meta as D1MetaRecord;
    return {
      surface: input.surface,
      statementName: input.statementName,
      normalizedSqlHash: sqlHash(input.sql),
      bindCount: input.binds.length,
      bindCeilingOutcome: input.binds.length <= EXPECTED_INSTALLED_BIND_CEILING ? "WITHIN_LIMIT" : "EXCEEDS_LIMIT",
      statementCount: 1,
      queryCount: 1,
      batchSize: 1,
      durationMs: finiteMeta(meta.duration),
      rowsRead: finiteMeta(meta.rows_read),
      rowsWritten: finiteMeta(meta.rows_written),
      resultRowCount: resultRows,
      queryPlan: plan.details,
      queryPlanBasisBindCount: planBinds.length,
      selectedIndex: selectedIndex(plan.details),
      seededCount,
      cleanedCount: 0,
      evidenceClass: "local-d1",
      outcome: "PASS",
    };
  } catch (error) {
    const failureId = d1FailureId(error);
    if (!input.expectBindCeilingFailure || failureId !== "D1_TOO_MANY_SQL_VARIABLES") throw error;
    return {
      surface: input.surface,
      statementName: input.statementName,
      normalizedSqlHash: sqlHash(input.sql),
      bindCount: input.binds.length,
      bindCeilingOutcome: "EXCEEDS_LIMIT",
      statementCount: 1,
      queryCount: 1,
      batchSize: 1,
      durationMs: null,
      rowsRead: null,
      rowsWritten: null,
      resultRowCount: 0,
      queryPlan: plan.details,
      queryPlanBasisBindCount: planBinds.length,
      selectedIndex: selectedIndex(plan.details),
      seededCount,
      cleanedCount: 0,
      evidenceClass: "local-d1",
      outcome: "FAIL",
      failureId,
    };
  }
}

async function measureBatch(db: D1Database, input: QueryRecordInput & { statements: D1PreparedStatement[] }, seededCount: number): Promise<LocalD1StatementRecord> {
  const plan = await explain(db, input.sql, input.binds);
  const results = await batchInChunks(db, input.statements);
  const metas = results.map((result) => result.meta as D1MetaRecord);
  return {
    surface: input.surface,
    statementName: input.statementName,
    normalizedSqlHash: sqlHash(input.sql),
    bindCount: input.binds.length,
    bindCeilingOutcome: input.binds.length <= EXPECTED_INSTALLED_BIND_CEILING ? "WITHIN_LIMIT" : "EXCEEDS_LIMIT",
    statementCount: input.statements.length,
    queryCount: input.statements.length,
    batchSize: input.statements.length,
    durationMs: sumNullable(metas.map((meta) => finiteMeta(meta.duration))),
    rowsRead: sumNullable(metas.map((meta) => finiteMeta(meta.rows_read))),
    rowsWritten: sumNullable(metas.map((meta) => finiteMeta(meta.rows_written))),
    resultRowCount: 0,
    queryPlan: plan.details,
    queryPlanBasisBindCount: input.binds.length,
    selectedIndex: selectedIndex(plan.details),
    seededCount,
    cleanedCount: 0,
    evidenceClass: "local-d1",
    outcome: "PASS",
  };
}

async function proveBindCeiling(db: D1Database): Promise<LocalD1Measurement["bindCeiling"]> {
  const atCeilingSql = `SELECT 1 AS ok WHERE 1 IN (${Array.from({ length: 100 }, () => "?").join(",")})`;
  const aboveCeilingSql = `SELECT 1 AS ok WHERE 1 IN (${Array.from({ length: 101 }, () => "?").join(",")})`;
  const atCeiling = await db.prepare(atCeilingSql).bind(...Array.from({ length: 100 }, () => 1)).all();
  if (atCeiling.results.length !== 1) throw new Error("D1 bind-ceiling success probe failed");
  let failureAboveCeiling = false;
  try {
    await db.prepare(aboveCeilingSql).bind(...Array.from({ length: 101 }, () => 1)).all();
  } catch (error) {
    failureAboveCeiling = d1FailureId(error) === "D1_TOO_MANY_SQL_VARIABLES";
  }
  if (!failureAboveCeiling) throw new Error("D1 bind-ceiling failure probe did not fail at 101 variables");
  return {
    installed: 100,
    provider: 100,
    effective: 100,
    successAtCeiling: true,
    failureAboveCeiling: true,
    rowLoadBindCount: 1_501,
    rowLoadOutcome: "FAIL",
  };
}

function routeAccessSql(): string {
  return `
    SELECT estimate.id
    FROM estimates AS estimate
    JOIN projects AS project ON project.id = estimate.project_id
    LEFT JOIN workspace_members AS workspace_member
      ON workspace_member.workspace_id = project.workspace_id AND workspace_member.user_id = ?
    LEFT JOIN project_members AS project_member
      ON project_member.project_id = project.id AND project_member.user_id = ?
    LEFT JOIN estimate_sheet_access_settings AS access ON access.estimate_id = estimate.id
    LEFT JOIN estimate_sheet_members AS sheet_member
      ON sheet_member.estimate_id = estimate.id AND sheet_member.user_id = ?
    WHERE project.id = ? AND estimate.id = ?
      AND (
        workspace_member.role IN ('owner', 'admin', 'member')
        OR project_member.role IN ('owner', 'admin', 'editor')
        OR (access.inherit_project_access = 0 AND sheet_member.role IN ('owner', 'admin', 'editor', 'viewer'))
      )
    LIMIT 1
  `;
}

async function collectStatements(db: D1Database, ids: FixtureIds, seededCount: number, fixture: EstimateSheetPerformanceFixture): Promise<LocalD1StatementRecord[]> {
  const statements: LocalD1StatementRecord[] = [];
  const add = async (input: QueryRecordInput) => statements.push(await measureQuery(db, input, seededCount));
  const accessSql = routeAccessSql();
  const accessBinds = [ids.profile, ids.profile, ids.profile, ids.project, ids.estimate];
  await add({ surface: "route-context", statementName: "route-context-access", sql: accessSql, binds: accessBinds, expectedResultRows: 1 });
  await add({ surface: "route-context", statementName: "route-context-estimate", sql: "SELECT id, project_id, name FROM estimates WHERE id = ? AND project_id = ?", binds: [ids.estimate, ids.project], expectedResultRows: 1 });
  await add({ surface: "route-context", statementName: "route-context-default-tab", sql: "SELECT id, estimate_id, name FROM estimate_tabs WHERE estimate_id = ? AND is_default = 1 AND archived_at IS NULL ORDER BY sort_order ASC, id ASC LIMIT 1", binds: [ids.estimate], expectedResultRows: 1 });
  await add({ surface: "route-context", statementName: "route-context-selected-node", sql: "SELECT id, estimate_id, estimate_tab_id FROM estimate_nodes WHERE id = ? AND estimate_id = ?", binds: [ids.nodes[0], ids.estimate], expectedResultRows: 1 });

  await add({ surface: "selected-tab-tree", statementName: "tab-tree-nodes", sql: "SELECT id, parent_id, sort_order FROM estimate_nodes WHERE estimate_id = ? AND estimate_tab_id = ? ORDER BY sort_order ASC, id ASC", binds: [ids.estimate, ids.tab], expectedResultRows: 1_500 });
  await add({ surface: "selected-tab-tree", statementName: "tab-tree-rows", sql: "SELECT id, node_id, sort_order FROM estimate_row_items WHERE estimate_id = ? AND node_id IS NOT NULL ORDER BY sort_order ASC, id ASC LIMIT ?", binds: [ids.estimate, 5_000], expectedResultRows: 5_000 });
  await add({ surface: "selected-tab-tree", statementName: "tab-tree-adjustments", sql: "SELECT estimate_id, mode, percentage FROM estimate_sheet_adjustments WHERE estimate_id = ? ORDER BY mode ASC", binds: [ids.estimate], expectedResultRows: 0 });

  const allNodePlaceholders = ids.nodes.map(() => "?").join(",");
  const boundedNodeIds = ids.nodes.slice(0, 99);
  const boundedPlaceholders = boundedNodeIds.map(() => "?").join(",");
  await add({
    surface: "limit-tree-row-load",
    statementName: "limit-tree-row-load-1500-nodes",
    sql: `SELECT id, node_id, sort_order FROM estimate_row_items WHERE estimate_id = ? AND node_id IN (${allNodePlaceholders}) ORDER BY sort_order ASC, id ASC`,
    binds: [ids.estimate, ...ids.nodes],
    expectBindCeilingFailure: true,
    planSql: `SELECT id, node_id, sort_order FROM estimate_row_items WHERE estimate_id = ? AND node_id IN (${boundedPlaceholders}) ORDER BY sort_order ASC, id ASC`,
    planBinds: [ids.estimate, ...boundedNodeIds],
  });

  for (const depth of [1, 5, 10] as const) {
    const surface = `lazy-subtree-depth-${depth}` as LocalD1StatementRecord["surface"];
    const sql = "WITH RECURSIVE subtree(id, depth) AS (SELECT id, 0 FROM estimate_nodes WHERE id = ? AND estimate_id = ? UNION ALL SELECT child.id, subtree.depth + 1 FROM estimate_nodes AS child JOIN subtree ON child.parent_id = subtree.id WHERE child.estimate_id = ? AND subtree.depth < ?) SELECT id, depth FROM subtree ORDER BY depth ASC, id ASC";
    await add({ surface, statementName: surface, sql, binds: [ids.nodes[0], ids.estimate, ids.estimate, depth] });
  }

  await add({ surface: "row-update", statementName: "row-update-access", sql: accessSql, binds: accessBinds, expectedResultRows: 1 });
  await add({ surface: "row-update", statementName: "row-update-current", sql: "SELECT id, row_revision FROM estimate_row_items WHERE id = ? AND estimate_id = ?", binds: [ids.rows[0], ids.estimate], expectedResultRows: 1 });
  await add({ surface: "row-update", statementName: "row-update-write", sql: "UPDATE estimate_row_items SET material = ?, row_revision = row_revision + 1, updated_at = ? WHERE id = ? AND estimate_id = ?", binds: ["Measured row", "2026-07-11T00:01:00.000Z", ids.rows[0], ids.estimate], operation: "run" });

  await add({ surface: "node-move", statementName: "node-move-current", sql: "SELECT id, parent_id, sort_order FROM estimate_nodes WHERE id = ? AND estimate_id = ?", binds: [ids.nodes[1], ids.estimate], expectedResultRows: 1 });
  await add({ surface: "node-move", statementName: "node-move-parent", sql: "SELECT id FROM estimate_nodes WHERE id = ? AND estimate_id = ?", binds: [ids.nodes[0], ids.estimate], expectedResultRows: 1 });
  await add({ surface: "node-move", statementName: "node-move-write", sql: "UPDATE estimate_nodes SET parent_id = ?, sort_order = ?, updated_at = ? WHERE id = ? AND estimate_id = ?", binds: [ids.nodes[0], 1, "2026-07-11T00:02:00.000Z", ids.nodes[1], ids.estimate], operation: "run" });

  const bulkRows = fixture.rows.slice(-100);
  const bulkIds = ids.rows.slice(-100);
  const deleteSql = "DELETE FROM estimate_row_items WHERE id = ? AND estimate_id = ?";
  statements.push(await measureBatch(db, {
    surface: "bulk-delete-100",
    statementName: "bulk-delete-100-batch",
    sql: deleteSql,
    binds: [bulkIds[0], ids.estimate],
    statements: bulkIds.map((id) => db.prepare(deleteSql).bind(id, ids.estimate)),
  }, seededCount));
  await restoreRows(db, ids, fixture, bulkRows, fixture.rows.length - 100);

  for (const matchCount of [1, 100, 1_000] as const) {
    const surface = `project-component-fanout-${matchCount}` as LocalD1StatementRecord["surface"];
    const selectSql = "SELECT id FROM estimate_row_items WHERE estimate_id = ? AND json_extract(source_snapshot_json, '$.sourceComponentId') = ? ORDER BY id ASC LIMIT ?";
    const selection = await db.prepare(selectSql).bind(ids.estimate, "project-component-limit-shared", matchCount).all<{ id: string }>();
    if (selection.results.length !== matchCount) throw new Error(`${surface} selected ${selection.results.length} rows`);
    statements.push(await measureQuery(db, { surface, statementName: `${surface}-select`, sql: selectSql, binds: [ids.estimate, "project-component-limit-shared", matchCount], expectedResultRows: matchCount }, seededCount));
    const updateSql = "UPDATE estimate_row_items SET row_revision = row_revision + 1, updated_at = ? WHERE id = ? AND estimate_id = ?";
    statements.push(await measureBatch(db, {
      surface,
      statementName: `${surface}-update-batch`,
      sql: updateSql,
      binds: ["2026-07-11T00:03:00.000Z", selection.results[0]!.id, ids.estimate],
      statements: selection.results.map((row) => db.prepare(updateSql).bind("2026-07-11T00:03:00.000Z", row.id, ids.estimate)),
    }, seededCount));
  }

  const denialInputs: QueryRecordInput[] = [
    { surface: "auth-denial-wrong-tenant", statementName: "auth-denial-wrong-tenant", sql: accessSql, binds: [ids.profile, ids.profile, ids.profile, deterministicUuid(ids.project, "wrong"), ids.estimate], expectedResultRows: 0 },
    { surface: "auth-denial-wrong-estimate", statementName: "auth-denial-wrong-estimate", sql: accessSql, binds: [ids.profile, ids.profile, ids.profile, ids.project, deterministicUuid(ids.estimate, "wrong")], expectedResultRows: 0 },
    { surface: "auth-denial-wrong-tab", statementName: "auth-denial-wrong-tab", sql: "SELECT tab.id FROM estimate_tabs AS tab JOIN estimates AS estimate ON estimate.id = tab.estimate_id WHERE tab.id = ? AND estimate.id = ? AND estimate.project_id = ?", binds: [deterministicUuid(ids.tab, "wrong"), ids.estimate, ids.project], expectedResultRows: 0 },
    { surface: "auth-denial-wrong-node", statementName: "auth-denial-wrong-node", sql: "SELECT node.id FROM estimate_nodes AS node JOIN estimates AS estimate ON estimate.id = node.estimate_id WHERE node.id = ? AND estimate.id = ? AND estimate.project_id = ?", binds: [deterministicUuid(ids.nodes[0]!, "wrong"), ids.estimate, ids.project], expectedResultRows: 0 },
  ];
  for (const input of denialInputs) await add(input);
  return statements;
}

async function restoreRows(db: D1Database, ids: FixtureIds, fixture: EstimateSheetPerformanceFixture, rows: readonly EstimatePerformanceRowFixture[], startIndex: number): Promise<void> {
  const nodes = flattenEstimatePerformanceNodes(fixture);
  const fixtureNodeIndexes = new Map(nodes.map((node, index) => [node.id, index]));
  const timestamp = "2026-07-11T00:00:00.000Z";
  const inserts = rows.map((row, offset) => {
    const index = startIndex + offset;
    return db.prepare("INSERT INTO estimate_row_items (id, estimate_id, node_id, description, material, quantity, unit, unit_cost, misc_cost, contingency_percentage, source_snapshot_json, sort_order, row_revision, source_library_item_id, metadata_json, supplier, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'pc', ?, ?, ?, ?, ?, ?, ?, '{}', 'Fixture supplier', ?, ?)").bind(
      ids.rows[index]!,
      ids.estimate,
      ids.nodes[fixtureNodeIndexes.get(row.nodeId) ?? 0]!,
      row.description,
      row.material,
      row.quantity,
      row.unitCost,
      row.miscCost,
      row.contingencyPercentage,
      JSON.stringify(row.sourceSnapshot),
      index,
      row.rowRevision,
      row.sourceLibraryItemId,
      timestamp,
      timestamp,
    );
  });
  await batchInChunks(db, inserts);
}

function countStatements(records: LocalD1StatementRecord[], surface: LocalD1StatementRecord["surface"]): number {
  return records.filter((record) => record.surface === surface).reduce((sum, record) => sum + record.statementCount, 0);
}

function makeMetrics(records: LocalD1StatementRecord[], costProjection: LocalD1Measurement["costProjection"]): Record<string, D1Metric> {
  const routeCount = countStatements(records, "route-context");
  const tabTreeCount = countStatements(records, "selected-tab-tree");
  const updateCount = countStatements(records, "row-update");
  const subtreeCounts = [1, 5, 10].map((depth) => countStatements(records, `lazy-subtree-depth-${depth}` as LocalD1StatementRecord["surface"]));
  const fanout1000 = countStatements(records, "project-component-fanout-1000");
  return {
    "M-D1-ROUTE-CONTEXT-STATEMENTS": { value: routeCount, threshold: 4, comparison: "maximum", unit: "count", status: routeCount <= 4 ? "PASS" : "FAIL", source: "local-d1-statement-census" },
    "M-D1-TAB-TREE-STATEMENTS": { value: tabTreeCount, threshold: 3, comparison: "maximum", unit: "count", status: tabTreeCount <= 3 ? "PASS" : "FAIL", source: "local-d1-statement-census" },
    "M-D1-ROW-UPDATE-STATEMENTS": { value: updateCount, threshold: 3, comparison: "maximum", unit: "count", status: updateCount <= 3 ? "PASS" : "FAIL", source: "local-d1-statement-census" },
    "M-D1-SUBTREE-DEPTH-SHAPE": { value: new Set(subtreeCounts).size, threshold: 1, comparison: "exact", unit: "count", status: new Set(subtreeCounts).size === 1 ? "PASS" : "FAIL", source: "local-d1-depth-1-5-10-query-count" },
    "M-D1-BIND-CEILING": { value: 1_501, threshold: 100, comparison: "maximum", unit: "count", status: "FAIL", source: "local-d1-100-success-101-failure-probe" },
    "M-D1-COST-PROJECTION-PCT": { value: costProjection.maximumPercent, threshold: 50, comparison: "maximum", unit: "percent", status: costProjection.status, source: "plan-traffic-model-plus-local-row-read-census" },
    "M-MUTATE-SERVER-FANOUT-BUDGET": { value: fanout1000, threshold: 1_001, comparison: "maximum", unit: "count", status: fanout1000 <= 1_001 ? "PASS" : "FAIL", source: "local-d1-one-select-plus-per-match-batch" },
  };
}

function makeCostProjection(records: LocalD1StatementRecord[]): LocalD1Measurement["costProjection"] {
  const routeRows = records.filter((record) => record.surface === "route-context" || record.surface === "selected-tab-tree").reduce((sum, record) => sum + (record.rowsRead ?? 0), 0);
  const projectedRowsReadPerDay = Math.max(5_000, routeRows) * 50 + 7_500;
  const projectedRowsWrittenPerDay = 3_000;
  const maximumPercent = Math.round(Math.max(projectedRowsReadPerDay / 5_000_000, projectedRowsWrittenPerDay / 100_000) * 10_000) / 100;
  return {
    trafficModel: "10-users-500-actions-50-route-opens",
    projectedRowsReadPerDay,
    projectedRowsWrittenPerDay,
    planningBaselineReadAllowance: 5_000_000,
    planningBaselineWriteAllowance: 100_000,
    maximumPercent,
    thresholdPercent: 50,
    status: maximumPercent <= 50 ? "PASS" : "FAIL",
  };
}

export function createLocalD1PerformanceReport(input: {
  manifest: RunManifestV1;
  measurement: LocalD1Measurement;
  head: string;
  generatedAt: string;
  fixtureHash: string;
  authFixtureHash: string;
  toolHashes: Record<string, string>;
}): PerformanceReportV1 {
  assertCompleteLocalD1Measurement(input.measurement);
  const failures = Object.entries(input.measurement.metrics).filter(([, metric]) => metric.status === "FAIL").map(([metricId]) => `hard-metric-failed:${metricId}`);
  const report: PerformanceReportV1 = {
    schema_version: "estimate-sheet-performance-report.v1",
    evidenceClass: "local-d1",
    trace: {
      packageId: input.manifest.package_id,
      unitId: input.manifest.unit_id,
      evidenceId: "d1-local",
      requirementIds: ["REQ-006", "REQ-012", "REQ-018", "REQ-026", "PERF-008", "PERF-009", "DATA-001", "DATA-002", "DATA-008"],
      criterionIds: ["AC-001", "AC-004", "AC-006", "AC-008", "AC-012"],
      testIds: ["TEST-004"],
      scenarioIds: [...REQUIRED_LOCAL_D1_SURFACES],
    },
    head: input.head,
    applicationFingerprint: input.manifest.applicationFingerprint,
    producerFingerprint: input.manifest.producerFingerprint,
    fixtureHash: input.fixtureHash,
    buildHash: null,
    authFixtureHash: input.authFixtureHash,
    toolHashes: input.toolHashes,
    runId: input.manifest.run_id,
    generatedAt: input.generatedAt,
    method: { warmups: 0, samples: input.measurement.statements.length, workerCount: 1, retries: 0, profile: "limit" },
    metrics: input.measurement.metrics,
    scenarios: input.measurement.functionalScenarios,
    overall: failures.length ? "FAIL" : "PASS",
    ...(failures.length ? { failures } : {}),
    buildMode: "not-applicable",
    d1: input.measurement,
  };
  assertReportForRun(report, input.manifest);
  return report;
}

export async function measureEstimateSheetD1(input: {
  runManifest: string;
  output?: string;
  tests?: string;
  fixtureRole?: string;
  profile?: string;
  local?: boolean;
  unit?: string;
  repoRoot?: string;
}): Promise<D1MeasurementResult> {
  const repoRoot = resolve(input.repoRoot ?? process.cwd());
  if (input.local !== true) throw new Error("local D1 measurement requires --local");
  if (input.fixtureRole !== "d1") throw new Error("local D1 measurement requires --fixture-role=d1");
  if (input.profile !== "limit") throw new Error("local D1 measurement requires --profile=limit");
  const runManifestPath = resolve(repoRoot, input.runManifest);
  const manifest = readJsonFile<RunManifestV1>(runManifestPath);
  const manifestErrors = validateLocalD1RunManifest(manifest);
  if (manifestErrors.length) throw new Error(`invalid local D1 run:\n- ${manifestErrors.join("\n- ")}`);
  if (input.unit && manifest.unit_id !== input.unit) throw new Error("local D1 CLI unit does not match the run manifest");
  if (resolve(manifest.run_root, "run-manifest.json") !== runManifestPath) throw new Error("local D1 run manifest must be the prepared manifest inside run_root");
  assertRegularDirectory(manifest.run_root, "prepared run root");
  const current = computeEstimateSheetSourceFingerprint({ repoRoot }).fingerprint;
  if (!fingerprintContentEqual(current.application, manifest.applicationFingerprint) || !fingerprintContentEqual(current.producer, manifest.producerFingerprint)) throw new Error("run manifest fingerprint is stale for local D1 measurement");
  const outputPath = resolveOutputPath(manifest, input.output ?? "auto:d1");
  if (existsSync(outputPath)) throw new Error(`refusing to overwrite existing file: ${outputPath}`);
  const test = resolveTestReceipt(manifest, input.tests ?? "auto:dom-tests");
  const namespace = manifest.namespaces.d1 as { idSha256?: unknown; preStateSha256?: unknown };
  if (!isSha256(namespace.idSha256) || !isSha256(namespace.preStateSha256)) throw new Error("local D1 namespace hashes are invalid");

  const fixture = buildEstimatePerformanceFixture("limit", {
    seed: "estimate-sheet-limit-v1",
    traceId: `trace-${manifest.unit_id}-${manifest.run_id}`,
    runId: manifest.run_id,
    generatedAt: manifest.created_at,
    applicationFingerprint: manifest.applicationFingerprint.content_sha256,
    producerFingerprint: manifest.producerFingerprint.content_sha256,
  });
  const fixtureErrors = validateLimitD1Fixture(fixture);
  if (fixtureErrors.length) throw new Error(`invalid local D1 fixture:\n- ${fixtureErrors.join("\n- ")}`);
  const fixtureHash = sha256Hex(stableStringify(fixturePayloadWithoutLinkage(fixture)));
  const ids = makeFixtureIds(manifest.run_id, fixture);
  const cleanupPath = ensureContainedRunPath(manifest.run_root, "cleanup/d1-state.json");
  const cleanupPayload = cleanupState(manifest.run_id, namespace.idSha256, ids);
  writeJsonNoOverwrite(cleanupPath, cleanupPayload, 0o600);

  const schemaProof = await generateLocalBetterAuthD1SchemaSqlProof();
  const schemaErrors = validateBetterAuthD1SchemaProof(schemaProof);
  if (schemaErrors.length) throw new Error(`invalid Better Auth D1 schema:\n- ${schemaErrors.join("\n- ")}`);
  const wrangler = await import("wrangler");
  const migrations = loadMigrations(repoRoot, wrangler.unstable_splitSqlQuery);
  const binding = localWranglerConfig(repoRoot, wrangler.unstable_readConfig);
  const resourceRoot = ensureContainedRunPath(manifest.run_root, "resources/d1");
  mkdirSync(resourceRoot, { recursive: true, mode: 0o700 });
  const generatedSchemaPath = resolve(resourceRoot, "better-auth-schema.sql");
  const migrationManifestPath = resolve(resourceRoot, "migrations.json");
  const localConfigPath = resolve(resourceRoot, "wrangler-local.json");
  writeNoOverwrite(generatedSchemaPath, `${schemaProof.sql.trim()}\n`, 0o600);
  writeJsonNoOverwrite(migrationManifestPath, migrations.map((migration) => ({ name: migration.name, sha256: migration.sha256, statementCount: migration.statements.length })), 0o600);
  writeJsonNoOverwrite(localConfigPath, {
    name: `estimate-performance-${manifest.run_id}`,
    compatibility_date: binding.compatibilityDate,
    d1_databases: [{ binding: D1_BINDING, database_name: binding.databaseName, database_id: binding.databaseId }],
  }, 0o600);

  const persistRoot = ensureContainedRunPath(manifest.run_root, "wrangler-state");
  if (existsSync(persistRoot)) {
    assertRegularDirectory(persistRoot, "Wrangler persistence root");
    if (readdirSync(persistRoot).length !== 0) throw new Error("Wrangler persistence root is not fresh");
  } else mkdirSync(persistRoot, { recursive: true, mode: 0o700 });

  const proxy = await wrangler.getPlatformProxy<{ ARCH_DB: D1Database }>({ configPath: localConfigPath, persist: { path: persistRoot }, remoteBindings: false, envFiles: [] });
  try {
    const db = proxy.env.ARCH_DB;
    const generatedStatements = wrangler.unstable_splitSqlQuery(schemaProof.sql);
    await db.batch(generatedStatements.map((statement) => db.prepare(statement)));
    const migrationProof = await applyMigrations(db, migrations);
    const schemaTables = await db.prepare("SELECT name FROM sqlite_schema WHERE type = 'table' AND name IN ('account', 'rateLimit', 'session', 'user', 'verification') ORDER BY name ASC").all<{ name: string }>();
    if (canonicalJson(schemaTables.results.map((row) => row.name).sort()) !== canonicalJson([...EXPECTED_BETTER_AUTH_TABLES].sort())) throw new Error("applied Better Auth D1 table set is incomplete");
    const unsignedToken = `estimate-perf-session-${manifest.run_id}`;
    const sessionSecret = sha256Hex(`estimate-sheet-local-d1-secret\0${manifest.run_id}`);
    const signature = await makeSignature(unsignedToken, sessionSecret);
    await seedFixture(db, fixture, ids, `${unsignedToken}.${signature}`);
    const seeded = await verifySeedCounts(db, ids);
    const bindCeiling = await proveBindCeiling(db);
    const totalSeededCount = Object.values(seeded).reduce((sum, count) => sum + count, 0);
    const statements = await collectStatements(db, ids, totalSeededCount, fixture);
    const remaining = await verifySeedCounts(db, ids);
    const deleted = Object.fromEntries(LOCAL_D1_CLEANUP_TABLE_ORDER.map((table) => [table, 0]));
    const costProjection = makeCostProjection(statements);
    const metrics = makeMetrics(statements, costProjection);
    const migrationSetHash = sha256Hex(canonicalJson(migrations.map((migration) => ({ name: migration.name, sha256: migration.sha256 }))));
    const measurement: LocalD1Measurement = {
      schemaVersion: LOCAL_D1_MEASUREMENT_SCHEMA,
      provider: "cloudflare-d1-local",
      providerBacked: true,
      binding: D1_BINDING,
      databaseIdSha256: sha256Hex(binding.databaseId),
      persistenceRoot: "wrangler-state",
      persistenceRootIdSha256: sha256Hex(`wrangler-state\0${manifest.run_id}\0${namespace.idSha256}`),
      wranglerVersion: readPackageVersion("wrangler"),
      betterAuthVersion: readPackageVersion("better-auth"),
      schemaHash: sha256Hex(canonicalJson({ generatedSchemaHash: schemaProof.sha256, migrationSetHash })),
      generatedSchemaHash: schemaProof.sha256,
      generatedSchemaStatementCount: schemaProof.statementCount,
      generatedSchemaTables: [...schemaProof.tableNames].sort(),
      migrationSetHash,
      migrationHead: migrations.at(-1)!.name,
      migrationCount: migrations.length,
      migrationStatementCount: migrationProof.statementCount,
      migrationIdempotency: {
        firstPassApplied: migrationProof.firstPassApplied,
        secondPassApplied: migrationProof.secondPassApplied,
        ledgerCount: migrationProof.ledgerCount,
      },
      fixture: { profile: "limit", nodeCount: 1_500, rowCount: 5_000, componentMatchCount: 1_000, fixtureHash },
      bindCeiling,
      statements,
      queryCount: statements.reduce((sum, statement) => sum + statement.queryCount, 0),
      bindCounts: statements.map((statement) => statement.bindCount),
      rowsRead: sumNullable(statements.map((statement) => statement.rowsRead)),
      rowsWritten: sumNullable(statements.map((statement) => statement.rowsWritten)),
      queryPlans: statements.map((statement) => ({ statementName: statement.statementName, details: statement.queryPlan, selectedIndex: statement.selectedIndex })),
      cleanup: {
        statePath: "cleanup/d1-state.json",
        stateSha256: sha256File(cleanupPath),
        exactTableOrder: [...LOCAL_D1_CLEANUP_TABLE_ORDER],
        auxiliaryAuthTableOrder: [...LOCAL_D1_AUTH_CLEANUP_TABLE_ORDER],
        seeded,
        deleted,
        remaining,
      },
      costProjection,
      metrics,
      functionalScenarios: Object.fromEntries(REQUIRED_LOCAL_D1_SURFACES.filter((surface) => surface.startsWith("auth-denial-")).map((surface) => [surface, "PASS"])) as Record<string, "PASS">,
    };
    assertCompleteLocalD1Measurement(measurement);
    const report = createLocalD1PerformanceReport({
      manifest,
      measurement,
      head: current.head,
      generatedAt: nowIso(),
      fixtureHash,
      authFixtureHash: sha256Hex(canonicalJson({ userId: ids.user, sessionId: ids.session, allowlistId: ids.allowlist, legalId: ids.legal, profileId: ids.profile })),
      toolHashes: {
        producer: sha256File(resolve(repoRoot, "scripts/measure-estimate-sheet-d1.ts")),
        testReceipt: sha256File(test.path),
        generatedSchema: sha256File(generatedSchemaPath),
        migrations: sha256File(migrationManifestPath),
        wranglerConfig: sha256File(localConfigPath),
      },
    });
    publishLocalD1Report(outputPath, report, manifest);
    return { report, reportPath: outputPath, providerBacked: true, complete: true, blockers: [] };
  } finally {
    await proxy.dispose();
  }
}

export async function main(argv = process.argv.slice(2)): Promise<number> {
  const values = parseStrictCli(argv);
  if (cliBoolean(values, "help")) {
    console.log("Usage: bun run scripts/measure-estimate-sheet-d1.ts --unit=UNIT-003 --local --profile=limit --fixture-role=d1 --tests=auto:dom-tests --output=auto:d1 [--run-manifest=PATH]");
    return 0;
  }
  const unit = cliString(values, "unit", true)!;
  const runManifest = resolveRunManifestPath(process.cwd(), unit, cliString(values, "run-manifest") ?? process.env.ESTIMATE_PERF_RUN_MANIFEST);
  const result = await measureEstimateSheetD1({
    runManifest,
    unit,
    local: cliBoolean(values, "local"),
    profile: cliString(values, "profile", true),
    fixtureRole: cliString(values, "fixture-role", true),
    tests: cliString(values, "tests") ?? "auto:dom-tests",
    output: cliString(values, "output") ?? "auto:d1",
  });
  process.stdout.write(`${JSON.stringify({ ...result.report, report_path: result.reportPath, provider_backed: result.providerBacked, complete: result.complete, blockers: result.blockers }, null, 2)}\n`);
  return result.complete ? 0 : 1;
}

if (import.meta.main) {
  try { process.exitCode = await main(); }
  catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
}
