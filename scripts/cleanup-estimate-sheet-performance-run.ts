#!/usr/bin/env bun

import { existsSync, lstatSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { basename, relative, resolve } from "node:path";

import {
  CLEANUP_RECEIPT_SCHEMA,
  HOSTED_RECOVERY_SCHEMA,
  assertRunManifest,
  canonicalJson,
  cliBoolean,
  cliString,
  fingerprintContentEqual,
  isPlainObject,
  nowIso,
  parseStrictCli,
  readJsonFile,
  resolveRunManifestPath,
  sha256File,
  writeJsonNoOverwrite,
  type RunManifestV1,
} from "./lib/estimate-sheet-performance-contract";
import { computeEstimateSheetSourceFingerprint } from "./compute-estimate-sheet-source-fingerprint";
import {
  isPortOpen,
  isProcessAlive,
  readPreviewProcessJournal,
  stopPreviewProcess,
  updateRunManifest,
  writeMutableJsonAtomically,
  type PreviewProcessEntry,
} from "./start-estimate-sheet-benchmark-server";

const SAFE_CLEANUP_TABLES = {
  estimate_row_items: { columns: ["id"] },
  estimate_nodes: { columns: ["id"] },
  estimate_tabs: { columns: ["id"] },
  estimate_sheet_access_settings: { columns: ["estimate_id"] },
  estimate_sheet_members: { columns: ["estimate_id", "user_id"], separator: ":" },
  estimates: { columns: ["id"] },
  project_members: { columns: ["project_id", "user_id"], separator: ":" },
  projects: { columns: ["id"] },
  workspace_members: { columns: ["workspace_id", "user_id"], separator: ":" },
  workspaces: { columns: ["id"] },
  profiles: { columns: ["id"] },
  session: { columns: ["id"] },
  user: { columns: ["id"] },
  legal_terms_acceptances: { columns: ["id"] },
  closed_beta_allowed_emails: { columns: ["id"] },
} as const;

type CleanupClass = "local-preview" | "local-d1" | "hosted-d1";
type RuntimeCleanupManifest = RunManifestV1 & {
  port?: unknown;
  leasedPort?: unknown;
  processJournal?: unknown;
};

type NamespaceCleanupState = {
  schema_version: "estimate-sheet-local-d1-cleanup-state.v1" | "estimate-sheet-local-preview-cleanup-state.v1";
  state: "CLEANUP_PREPARED" | "CLEANUP_VERIFIED";
  run_id: string;
  fixture_role: string;
  namespace_id_sha256: string;
  exact_table_order?: string[];
  auxiliary_auth_table_order?: string[];
  exact_ids: Record<string, string[]>;
  seeded?: Record<string, number>;
  observed_before?: Record<string, number>;
  deleted?: Record<string, number>;
  remaining?: Record<string, number>;
  cleaned_at?: string;
};

export type CleanupResult = {
  schema_version: typeof CLEANUP_RECEIPT_SCHEMA | typeof HOSTED_RECOVERY_SCHEMA | "estimate-sheet-cleanup-attempt.v1";
  unit_id: string;
  run_id: string;
  application_fingerprint: unknown;
  producer_fingerprint: unknown;
  environment: "local" | "hosted";
  cleanupClass: CleanupClass;
  result: "CLEANUP_VERIFIED" | "RECOVERED_ALREADY_ABSENT" | "CLEANUP_FAILED";
  invalidatedProducer: boolean;
  port?: number;
  closedPort?: boolean;
  previewProcesses?: PreviewProcessEntry[];
  seeded: Record<string, Record<string, number>>;
  deleted: Record<string, Record<string, number>>;
  remaining: Record<string, Record<string, number>>;
  generated_at: string;
  errors: string[];
};

type NamespaceCleanupResult = {
  role: string;
  preexistingMismatch: boolean;
  seeded: Record<string, number>;
  deleted: Record<string, number>;
  remaining: Record<string, number>;
};

type CleanupSqliteStatement = {
  get: (...bindings: string[]) => unknown;
  run: (...bindings: string[]) => { changes?: number | bigint };
};

type CleanupSqliteDatabase = {
  exec: (sql: string) => unknown;
  prepare: (sql: string) => CleanupSqliteStatement;
  close: () => void;
};

type CleanupSqliteConstructor = new (path: string) => CleanupSqliteDatabase;

const runtimeRequire = createRequire(import.meta.url);

function openCleanupDatabase(path: string): CleanupSqliteDatabase {
  const runtime = runtimeRequire(typeof Bun === "undefined" ? "node:sqlite" : "bun:sqlite") as {
    Database?: CleanupSqliteConstructor;
    DatabaseSync?: CleanupSqliteConstructor;
  };
  const Database = runtime.Database ?? runtime.DatabaseSync;
  if (!Database) throw new Error("the current runtime has no synchronous SQLite database constructor");
  return new Database(path);
}

function isSha256(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/u.test(value);
}

function resolveCleanupClass(manifest: RuntimeCleanupManifest, requested?: CleanupClass): CleanupClass {
  if (manifest.cleanupRequirement !== "REQUIRED") throw new Error("cleanup cannot run for a NOT_APPLICABLE manifest");
  const expected = manifest.evidence_class === "local-browser"
    ? "local-preview"
    : manifest.evidence_class === "local-d1"
      ? "local-d1"
      : manifest.evidence_class === "hosted-d1"
        ? "hosted-d1"
        : null;
  if (!expected) throw new Error("prepared run has no declared cleanup class");
  if (requested && requested !== expected) throw new Error(`cleanup class ${requested} does not match ${expected}`);
  return expected;
}

function findSqliteFiles(root: string): string[] {
  if (!existsSync(root)) return [];
  const files: string[] = [];
  const visit = (path: string) => {
    const stat = lstatSync(path);
    if (stat.isSymbolicLink()) throw new Error("Wrangler persistence root contains a symlink");
    if (stat.isDirectory()) {
      for (const entry of readdirSync(path).sort()) visit(resolve(path, entry));
      return;
    }
    if (stat.isFile() && path.endsWith(".sqlite") && basename(path) !== "metadata.sqlite") files.push(path);
  };
  visit(root);
  return files;
}

function resolveLocalDatabase(manifest: RuntimeCleanupManifest): string {
  const files = findSqliteFiles(resolve(manifest.run_root, "wrangler-state"));
  if (files.length !== 1) throw new Error(`expected exactly one run-scoped D1 sqlite file, found ${files.length}`);
  return files[0]!;
}

function validateNamespaceCleanupState(
  manifest: RuntimeCleanupManifest,
  role: string,
): { path: string; state: NamespaceCleanupState } {
  const path = resolve(manifest.run_root, `cleanup/${role}-state.json`);
  if (!existsSync(path)) throw new Error(`missing exact-ID cleanup state for ${role}`);
  const stat = lstatSync(path);
  if (!stat.isFile() || stat.isSymbolicLink() || (stat.mode & 0o077) !== 0 || stat.nlink !== 1) {
    throw new Error(`${role} cleanup state must be a private one-link regular file`);
  }
  const state = readJsonFile<NamespaceCleanupState>(path);
  const namespace = manifest.namespaces[role];
  if (!isPlainObject(namespace) || !isSha256(namespace.idSha256)) throw new Error(`${role} namespace declaration is invalid`);
  if (!isPlainObject(state)
    || !["estimate-sheet-local-d1-cleanup-state.v1", "estimate-sheet-local-preview-cleanup-state.v1"].includes(state.schema_version)
    || !["CLEANUP_PREPARED", "CLEANUP_VERIFIED"].includes(state.state)
    || state.run_id !== manifest.run_id
    || state.fixture_role !== role
    || state.namespace_id_sha256 !== namespace.idSha256
    || !isPlainObject(state.exact_ids)
    || Object.keys(state.exact_ids).length === 0) {
    throw new Error(`${role} cleanup state has the wrong schema, run, or namespace identity`);
  }
  const expectedSchema = role === "d1"
    ? "estimate-sheet-local-d1-cleanup-state.v1"
    : "estimate-sheet-local-preview-cleanup-state.v1";
  if (state.schema_version !== expectedSchema) throw new Error(`${role} cleanup state uses the wrong role schema`);
  const tableNames = Object.keys(state.exact_ids);
  const declaredOrder = [...(state.exact_table_order ?? []), ...(state.auxiliary_auth_table_order ?? [])];
  if (declaredOrder.length > 0 && canonicalJson(declaredOrder) !== canonicalJson(tableNames)) {
    throw new Error(`${role} cleanup table orders do not exactly match exact_ids`);
  }
  for (const [table, ids] of Object.entries(state.exact_ids)) {
    if (!(table in SAFE_CLEANUP_TABLES)) throw new Error(`${role} cleanup state names an unapproved table: ${table}`);
    if (!Array.isArray(ids) || ids.length === 0 || ids.some((id) => typeof id !== "string" || !id || /[\0\r\n]/u.test(id))) {
      throw new Error(`${role} cleanup IDs are invalid for ${table}`);
    }
    if (new Set(ids).size !== ids.length) throw new Error(`${role} cleanup IDs contain duplicates for ${table}`);
  }
  return { path, state };
}

function bindingsForId(table: keyof typeof SAFE_CLEANUP_TABLES, encodedId: string): string[] {
  const contract = SAFE_CLEANUP_TABLES[table];
  if (!("separator" in contract)) return [encodedId];
  const values = encodedId.split(contract.separator);
  if (values.length !== contract.columns.length || values.some((value) => !value)) throw new Error(`invalid composite cleanup ID for ${table}`);
  return values;
}

function tablePredicate(table: keyof typeof SAFE_CLEANUP_TABLES): string {
  return SAFE_CLEANUP_TABLES[table].columns.map((column) => `"${column}" = ?`).join(" AND ");
}

function cleanupNamespace(
  databasePath: string,
  path: string,
  state: NamespaceCleanupState,
): NamespaceCleanupResult {
  const database = openCleanupDatabase(databasePath);
  const seeded: Record<string, number> = {};
  const observedBefore: Record<string, number> = {};
  const deleted: Record<string, number> = {};
  const remaining: Record<string, number> = {};
  try {
    database.exec("BEGIN IMMEDIATE");
    for (const [rawTable, ids] of Object.entries(state.exact_ids)) {
      const table = rawTable as keyof typeof SAFE_CLEANUP_TABLES;
      const predicate = tablePredicate(table);
      const count = database.prepare(`SELECT COUNT(*) AS count FROM "${table}" WHERE ${predicate}`);
      const remove = database.prepare(`DELETE FROM "${table}" WHERE ${predicate}`);
      let before = 0;
      let removed = 0;
      let after = 0;
      for (const encodedId of ids) {
        const bindings = bindingsForId(table, encodedId);
        before += Number((count.get(...bindings) as { count: number } | undefined)?.count ?? 0);
        removed += Number(remove.run(...bindings).changes ?? 0);
        after += Number((count.get(...bindings) as { count: number } | undefined)?.count ?? 0);
      }
      seeded[table] = ids.length;
      observedBefore[table] = before;
      deleted[table] = removed;
      remaining[table] = after;
    }
    if (Object.values(remaining).some((count) => count !== 0)) throw new Error(`${state.fixture_role} cleanup left exact IDs behind`);
    database.exec("COMMIT");
  } catch (error) {
    try { database.exec("ROLLBACK"); } catch { /* preserve the cleanup error */ }
    throw error;
  } finally {
    database.close();
  }
  const preexistingMismatch = Object.keys(seeded).some((table) => (
    observedBefore[table] !== seeded[table] || deleted[table] !== observedBefore[table]
  ));
  const completed: NamespaceCleanupState = {
    ...state,
    state: "CLEANUP_VERIFIED",
    seeded,
    observed_before: observedBefore,
    deleted,
    remaining,
    cleaned_at: nowIso(),
  };
  writeMutableJsonAtomically(path, completed, 0o600);
  return { role: state.fixture_role, preexistingMismatch, seeded, deleted, remaining };
}

function assertNamespaceIsolation(states: Array<{ state: NamespaceCleanupState }>): void {
  const identities = new Set<string>();
  for (const { state } of states) {
    for (const [table, ids] of Object.entries(state.exact_ids)) {
      for (const id of ids) {
        const identity = `${table}\0${id}`;
        if (identities.has(identity)) throw new Error("cleanup namespaces reuse an exact table/ID identity");
        identities.add(identity);
      }
    }
  }
}

function validateSource(manifest: RuntimeCleanupManifest, repoRoot: string): void {
  const current = computeEstimateSheetSourceFingerprint({ repoRoot }).fingerprint;
  if (!fingerprintContentEqual(current.application, manifest.applicationFingerprint)
    || !fingerprintContentEqual(current.producer, manifest.producerFingerprint)) {
    throw new Error("cleanup run fingerprint differs from the prepared source");
  }
}

function receiptPath(manifest: RuntimeCleanupManifest, cleanupClass: CleanupClass, recovery: boolean): string {
  return cleanupClass === "hosted-d1" && recovery
    ? resolve(manifest.run_root, "hosted-cleanup-recovery.json")
    : resolve(manifest.run_root, "cleanup-receipt.json");
}

export async function cleanupEstimateSheetPerformanceRun(input: {
  runManifest: string;
  repoRoot?: string;
  cleanupClass?: CleanupClass;
  recovery?: boolean;
  checkSource?: boolean;
}): Promise<CleanupResult> {
  const repoRoot = resolve(input.repoRoot ?? process.cwd());
  const manifestPath = resolve(input.runManifest);
  let manifest = readJsonFile<RuntimeCleanupManifest>(manifestPath);
  assertRunManifest(manifest);
  if (resolve(manifest.run_root, "run-manifest.json") !== manifestPath) throw new Error("cleanup must consume the prepared run-root manifest");
  const cleanupClass = resolveCleanupClass(manifest, input.cleanupClass);
  if (cleanupClass === "hosted-d1") {
    throw new Error("hosted D1 cleanup is owned by the hosted proof producer; this local cleanup command refuses it");
  }
  if (input.checkSource === false && process.env.NODE_ENV !== "test") throw new Error("source checks can be disabled only in focused tests");
  if (input.checkSource !== false) validateSource(manifest, repoRoot);
  const targetReceipt = receiptPath(manifest, cleanupClass, Boolean(input.recovery));
  if (existsSync(targetReceipt)) throw new Error(`cleanup receipt already exists: ${targetReceipt}`);
  const checkpointPath = resolve(manifest.run_root, "cleanup/cleanup-state.json");
  writeMutableJsonAtomically(checkpointPath, {
    schema_version: "estimate-sheet-cleanup-state.v1",
    unit_id: manifest.unit_id,
    run_id: manifest.run_id,
    cleanup_class: cleanupClass,
    state: "CLEANUP_PREPARED",
    started_at: nowIso(),
  }, 0o600);

  const errors: string[] = [];
  let previewProcesses: PreviewProcessEntry[] | undefined;
  let closedPort: boolean | undefined;
  let port: number | undefined;
  try {
    if (cleanupClass === "local-preview") {
      const journal = readPreviewProcessJournal(manifest);
      if (journal.processes.length === 0) throw new Error("local-preview cleanup requires a nonempty process journal");
      for (const entry of journal.processes) {
        if (entry.exit_code === null && entry.signal === null) await stopPreviewProcess({ runManifest: manifestPath, pid: entry.pid });
      }
      manifest = readJsonFile<RuntimeCleanupManifest>(manifestPath);
      const completed = readPreviewProcessJournal(manifest).processes;
      for (const entry of completed) {
        const exclusiveOutcome = (entry.exit_code === null) !== (entry.signal === null);
        if (!exclusiveOutcome || !entry.closed_port || isProcessAlive(entry.pid) || await isPortOpen(entry.port)) {
          throw new Error(`preview process ${entry.ordinal} has an incomplete stop/drain/closed-port outcome`);
        }
      }
      if (manifest.activePreview !== undefined) throw new Error("active preview binding remained after process cleanup");
      previewProcesses = completed;
      const declaredPort = manifest.port ?? manifest.leasedPort;
      if (!Number.isInteger(declaredPort)) throw new Error("local-preview cleanup is missing its leased port");
      port = Number(declaredPort);
      closedPort = !await isPortOpen(port);
      if (!closedPort) throw new Error("leased preview port remains open after cleanup");
      writeMutableJsonAtomically(checkpointPath, {
        schema_version: "estimate-sheet-cleanup-state.v1",
        unit_id: manifest.unit_id,
        run_id: manifest.run_id,
        cleanup_class: cleanupClass,
        state: "PREVIEWS_STOPPED",
        process_count: completed.length,
        updated_at: nowIso(),
      }, 0o600);
    } else if (manifest.previewProcesses.length > 0 || manifest.activePreview !== undefined || manifest.runtimeEnv !== undefined || manifest.storageState !== undefined) {
      throw new Error("local-d1 cleanup manifest contains forbidden preview resources");
    }

    const roles = Object.keys(manifest.namespaces).sort();
    if (roles.length === 0) throw new Error("required cleanup run declares no fixture namespaces");
    const states = roles.map((role) => validateNamespaceCleanupState(manifest, role));
    assertNamespaceIsolation(states);
    const databasePath = resolveLocalDatabase(manifest);
    const namespaceResults = states.map(({ path, state }) => cleanupNamespace(databasePath, path, state));
    const preexistingMismatch = namespaceResults.some((result) => result.preexistingMismatch);
    const recovery = Boolean(input.recovery) || preexistingMismatch;
    const result: CleanupResult = {
      schema_version: CLEANUP_RECEIPT_SCHEMA,
      unit_id: manifest.unit_id,
      run_id: manifest.run_id,
      application_fingerprint: manifest.applicationFingerprint,
      producer_fingerprint: manifest.producerFingerprint,
      environment: "local",
      cleanupClass,
      result: recovery ? "RECOVERED_ALREADY_ABSENT" : "CLEANUP_VERIFIED",
      invalidatedProducer: recovery,
      ...(port !== undefined ? { port, closedPort, previewProcesses } : {}),
      seeded: Object.fromEntries(namespaceResults.map((result) => [result.role, result.seeded])),
      deleted: Object.fromEntries(namespaceResults.map((result) => [result.role, result.deleted])),
      remaining: Object.fromEntries(namespaceResults.map((result) => [result.role, result.remaining])),
      generated_at: nowIso(),
      errors: [],
    };
    if (Object.values(result.remaining).some((counts) => Object.values(counts).some((count) => count !== 0))) {
      throw new Error("cleanup receipt cannot be published with remaining fixture rows");
    }
    writeJsonNoOverwrite(targetReceipt, result, 0o600);
    writeMutableJsonAtomically(checkpointPath, {
      schema_version: "estimate-sheet-cleanup-state.v1",
      unit_id: manifest.unit_id,
      run_id: manifest.run_id,
      cleanup_class: cleanupClass,
      state: result.invalidatedProducer ? "CLEANUP_RECOVERED" : "CLEANUP_VERIFIED",
      receipt: relative(manifest.run_root, targetReceipt),
      receipt_sha256: sha256File(targetReceipt),
      invalidated_producer: result.invalidatedProducer,
      completed_at: result.generated_at,
    }, 0o600);
    updateRunManifest(manifestPath, (value) => ({ ...value, cleanupReceipt: targetReceipt, cleanupReceiptSha256: sha256File(targetReceipt) }));
    return result;
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
    const attempt: CleanupResult = {
      schema_version: "estimate-sheet-cleanup-attempt.v1",
      unit_id: manifest.unit_id,
      run_id: manifest.run_id,
      application_fingerprint: manifest.applicationFingerprint,
      producer_fingerprint: manifest.producerFingerprint,
      environment: "local",
      cleanupClass,
      result: "CLEANUP_FAILED",
      invalidatedProducer: true,
      ...(port !== undefined ? { port, closedPort: closedPort ?? false, previewProcesses } : {}),
      seeded: {},
      deleted: {},
      remaining: {},
      generated_at: nowIso(),
      errors,
    };
    writeMutableJsonAtomically(resolve(manifest.run_root, "cleanup/cleanup-attempt.json"), attempt, 0o600);
    return attempt;
  }
}

export async function main(argv = process.argv.slice(2)): Promise<number> {
  const values = parseStrictCli(argv);
  if (cliBoolean(values, "help")) {
    console.log("Usage: bun run scripts/cleanup-estimate-sheet-performance-run.ts --unit=UNIT-002 [--run-manifest=PATH] [--class=local-preview|local-d1] [--recovery]");
    return 0;
  }
  const unit = cliString(values, "unit", true)!;
  const runManifest = resolveRunManifestPath(process.cwd(), unit, cliString(values, "run-manifest") ?? process.env.ESTIMATE_PERF_RUN_MANIFEST);
  const cleanupClass = cliString(values, "class") as CleanupClass | undefined;
  const result = await cleanupEstimateSheetPerformanceRun({
    runManifest,
    cleanupClass,
    recovery: cliBoolean(values, "recovery"),
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  return result.result === "CLEANUP_VERIFIED" && !result.invalidatedProducer ? 0 : 1;
}

if (import.meta.main) {
  try { process.exitCode = await main(); }
  catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
}
