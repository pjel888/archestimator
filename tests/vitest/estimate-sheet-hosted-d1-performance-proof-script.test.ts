import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  ESTIMATE_LOGICAL_OUTPUTS,
  assertPerformanceReport,
  canonicalJson,
  sha256Json,
  type FingerprintContent,
  type RunManifestV1,
  type SourceFingerprint,
} from "../../scripts/lib/estimate-sheet-performance-contract";
import {
  recoverEstimateSheetHostedD1Cleanup,
  verifyEstimateSheetHostedD1PerformanceProof,
  type HostedCommandRunner,
} from "../../scripts/verify-estimate-sheet-hosted-d1-performance-proof";

const RUN_ID = "123e4567-e89b-42d3-a456-426614174000";
const TABLE_COUNTS = {
  profiles: 2,
  workspaces: 1,
  workspace_members: 1,
  projects: 1,
  project_members: 1,
  estimates: 1,
  estimate_sheet_access_settings: 1,
  estimate_sheet_members: 1,
  estimate_tabs: 5,
  estimate_nodes: 1_500,
  estimate_row_items: 5_000,
} as const;
const CLEANUP_ORDER = Object.entries(TABLE_COUNTS).reverse();
const roots: string[] = [];

afterEach(() => {
  while (roots.length) rmSync(roots.pop()!, { recursive: true, force: true });
});

function fingerprintContent(seed: string): FingerprintContent {
  return {
    contract_version: "estimate-sheet-fingerprint.v1",
    path_count: 1,
    path_list_sha256: seed.repeat(64).slice(0, 64),
    content_sha256: seed.repeat(64).slice(0, 64),
  };
}

function sourceFingerprint(): SourceFingerprint {
  return {
    contract_version: "estimate-sheet-source-fingerprint.v2",
    head: "1234567",
    path_count: 2,
    path_list_sha256: "c".repeat(64),
    application: fingerprintContent("a"),
    producer: fingerprintContent("b"),
  };
}

function writeJson(path: string, value: unknown): void {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, `${canonicalJson(value)}\n`, { mode: 0o600 });
}

function setupRun(options: { databaseId?: string } = {}) {
  const repoRoot = mkdtempSync(join(tmpdir(), "estimate-hosted-d1-"));
  roots.push(repoRoot);
  const fingerprint = sourceFingerprint();
  const runKey = `${RUN_ID}-${fingerprint.application.content_sha256.slice(0, 12)}-0123456789ab`;
  const runRoot = join(repoRoot, ".ai/99_scratch/estimate-sheet-performance/runs/UNIT-011", runKey);
  const immutableRunRoot = join(
    repoRoot,
    ".ai/03_plans/2026-07-08/Project-Estimate-Sheet-Performance-Optimization/evidence/runtime/runs/UNIT-011",
    runKey,
  );
  const manifestRoot = join(repoRoot, ".ai/99_scratch/estimate-sheet-d1-proof/runs");
  mkdirSync(runRoot, { recursive: true });
  mkdirSync(immutableRunRoot, { recursive: true });
  mkdirSync(manifestRoot, { recursive: true });
  mkdirSync(join(repoRoot, "node_modules/wrangler"), { recursive: true });
  const manifest: RunManifestV1 = {
    schema_version: "estimate-sheet-performance-run.v1",
    package_id: "PLAN-2026-07-08-project-estimate-sheet-performance",
    unit_id: "UNIT-011",
    run_id: RUN_ID,
    profile: "artifact-only",
    evidence_class: "hosted-d1",
    cleanupRequirement: "REQUIRED",
    run_root: runRoot,
    immutable_run_root: immutableRunRoot,
    pointer_path: join(runRoot, "run-pointer.json"),
    logical_outputs: { ...ESTIMATE_LOGICAL_OUTPUTS },
    created_at: "2026-07-11T00:00:00.000Z",
    status: "PREPARED",
    sourceFingerprint: fingerprint,
    applicationFingerprint: fingerprint.application,
    producerFingerprint: fingerprint.producer,
    admissionKind: "predecessor",
    admissionPath: "dependencies/admission.json",
    admissionSha256: "d".repeat(64),
    inputApplicationFingerprint: fingerprint.application,
    inputProducerFingerprint: fingerprint.producer,
    namespaces: {},
    mutationJournal: [],
    previewProcesses: [],
  };
  const runManifest = join(runRoot, "run-manifest.json");
  writeJson(runManifest, manifest);
  writeJson(join(repoRoot, "node_modules/wrangler/package.json"), { version: "4.105.0" });
  writeJson(join(repoRoot, "wrangler.jsonc"), {
    compatibility_date: "2026-06-29",
    d1_databases: [{
      binding: "ARCH_DB",
      database_name: "archestimator-proof-db",
      database_id: options.databaseId ?? "9bdb29bb-687e-4f51-ae81-7659c426ea5f",
    }],
  });
  writeJson(join(immutableRunRoot, ESTIMATE_LOGICAL_OUTPUTS["dom-tests"]), {
    schema_version: "estimate-sheet-test-receipt.v1",
    test_class: "vitest",
    argv: ["bun", "run", "test:dom"],
    files: ["tests/vitest/estimate-sheet-hosted-d1-performance-proof-script.test.ts"],
    unit_id: "UNIT-011",
    run_id: RUN_ID,
    application_fingerprint: fingerprint.application,
    producer_fingerprint: fingerprint.producer,
    pre_application_fingerprint: fingerprint.application,
    pre_producer_fingerprint: fingerprint.producer,
    workers: 1,
    retries: 0,
    passed: 1,
    failed: 0,
    skipped: 0,
    duration_ms: 1,
    overall: "PASS",
    failure_ids: [],
  });
  for (const role of ["wrangler-auth", "provider-resources"]) {
    writeJson(join(immutableRunRoot, ESTIMATE_LOGICAL_OUTPUTS[role as "wrangler-auth" | "provider-resources"]), {
      schema_version: "estimate-sheet-command-receipt.v1",
      role,
      unit_id: "UNIT-011",
      run_id: RUN_ID,
      overall: "PASS",
      application_fingerprint: fingerprint.application,
      producer_fingerprint: fingerprint.producer,
    });
  }
  return { repoRoot, runRoot, immutableRunRoot, manifestRoot, runManifest, manifest, fingerprint };
}

function envelope(results: unknown[], meta: { rowsRead?: number; rowsWritten?: number; changes?: number } = {}) {
  return {
    success: true,
    results,
    meta: {
      duration: 1,
      rows_read: meta.rowsRead ?? 0,
      rows_written: meta.rowsWritten ?? 0,
      changes: meta.changes ?? 0,
    },
  };
}

function countRow(remaining = false): Record<string, number> {
  return Object.fromEntries(Object.entries(TABLE_COUNTS).map(([table, count]) => [`${table}_count`, remaining ? count : 0]));
}

function queryResultCount(file: string): number {
  if (file.includes("auth-denial-")) return 0;
  if (file === "query-selected-tab-tree.sql") return 300;
  if (file === "query-limit-tree-row-load.sql") return 5_000;
  if (file === "query-lazy-subtree-depth-1.sql") return 2;
  if (file === "query-lazy-subtree-depth-5.sql") return 6;
  if (file === "query-lazy-subtree-depth-10.sql") return 11;
  if (file === "query-bulk-delete-100.sql") return 100;
  if (file === "query-project-component-fanout-1.sql") return 1;
  if (file === "query-project-component-fanout-100.sql") return 100;
  if (file === "query-project-component-fanout-1000.sql") return 1_000;
  return 1;
}

function successfulRunner(
  calls: Array<{ command: string; args: string[]; sql: string }>,
  options: { cleanupRemaining?: boolean; cleanupResponseLost?: boolean } = {},
): HostedCommandRunner {
  return (command, args) => {
    const sqlPath = args[args.indexOf("--file") + 1]!;
    calls.push({ command, args, sql: readFileSync(sqlPath, "utf8") });
    const file = basename(sqlPath);
    let payload: unknown[];
    if (file === "preflight.sql") {
      payload = [envelope([{ sqlite_version: "3.49.1" }], { rowsRead: 1 })];
    } else if (file === "seed.sql") {
      payload = [envelope([], { rowsWritten: 6_515, changes: 6_515 })];
    } else if (file === "seed-reconciliation.sql") {
      payload = [envelope([countRow(true)], { rowsRead: 6_515 })];
    } else if (file.startsWith("query-")) {
      const resultCount = queryResultCount(file);
      payload = [
        envelope([{ detail: "SEARCH estimate_row_items USING INDEX idx_estimate_row_items_estimate_sort" }], { rowsRead: 1 }),
        envelope(Array.from({ length: resultCount }, () => ({ id: "redacted" })), { rowsRead: resultCount }),
      ];
    } else if (file === "cleanup.sql") {
      if (options.cleanupResponseLost) return { status: 1, signal: null, stdout: "", stderr: "response lost after commit" };
      payload = [
        envelope([]),
        ...CLEANUP_ORDER.map(([, count]) => envelope([], { rowsWritten: count, changes: count })),
        envelope([]),
      ];
    } else if (file === "cleanup-reconciliation.sql") {
      payload = [envelope([countRow(options.cleanupRemaining === true)], { rowsRead: 11 })];
    } else {
      throw new Error(`unexpected hosted stage ${file}`);
    }
    return { status: 0, signal: null, stdout: `wrangler prelude\n${JSON.stringify(payload)}`, stderr: "" };
  };
}

function recoveryRunner(
  calls: Array<{ command: string; args: string[]; sql: string }>,
  beforeRemaining: boolean,
): HostedCommandRunner {
  return (command, args) => {
    const sqlPath = args[args.indexOf("--file") + 1]!;
    calls.push({ command, args, sql: readFileSync(sqlPath, "utf8") });
    const file = basename(sqlPath);
    const payload = file === "recovery-reconciliation-before.sql"
      ? [envelope([countRow(beforeRemaining)], { rowsRead: beforeRemaining ? 6_515 : 11 })]
      : file === "recovery-cleanup.sql"
        ? [envelope([]), ...CLEANUP_ORDER.map(([, count]) => envelope([], { rowsWritten: count, changes: count })), envelope([])]
        : file === "recovery-reconciliation-after.sql"
          ? [envelope([countRow(false)], { rowsRead: 11 })]
          : null;
    if (!payload) throw new Error(`unexpected recovery stage ${file}`);
    return { status: 0, signal: null, stdout: JSON.stringify(payload), stderr: "" };
  };
}

describe("estimate-sheet hosted D1 proof producer", () => {
  it("writes a non-indexable BLOCKED attempt and never spawns when prerequisites are missing", () => {
    const setup = setupRun();
    let spawned = false;
    const result = verifyEstimateSheetHostedD1PerformanceProof({
      repoRoot: setup.repoRoot,
      runManifest: setup.runManifest,
      profile: "limit",
      manifestRoot: setup.manifestRoot,
      currentFingerprint: setup.fingerprint,
      commandRunner: () => {
        spawned = true;
        throw new Error("must not spawn");
      },
    });
    expect(result.kind).toBe("attempt");
    if (result.kind !== "attempt") throw new Error("expected blocked attempt");
    expect(result.attempt).toMatchObject({ result: "BLOCKED", indexable: false, executed_remote_wrangler: false });
    expect(result.attempt.blockers).toContain("HOSTED_TEST_RECEIPT_REQUIRED");
    expect(result.output).toContain("/attempts/");
    expect(spawned).toBe(false);
    expect(existsSync(join(setup.immutableRunRoot, ESTIMATE_LOGICAL_OUTPUTS.hosted))).toBe(false);
  });

  it("produces strict hosted evidence only after bound remote queries and exact eleven-table cleanup", () => {
    const setup = setupRun();
    const calls: Array<{ command: string; args: string[]; sql: string }> = [];
    const result = verifyEstimateSheetHostedD1PerformanceProof({
      repoRoot: setup.repoRoot,
      runManifest: setup.runManifest,
      profile: "limit",
      tests: "auto:dom-tests",
      gates: ["auto:wrangler-auth", "auto:provider-resources"],
      output: "auto:hosted",
      manifestRoot: setup.manifestRoot,
      currentFingerprint: setup.fingerprint,
      commandRunner: successfulRunner(calls),
    });
    if (result.kind !== "report") throw new Error(`expected hosted report: ${result.attempt.blockers.join(",")}`);
    expect(result.kind).toBe("report");
    expect(() => assertPerformanceReport(result.report, { strict: true })).not.toThrow();
    expect(result.report).toMatchObject({
      schema_version: "estimate-sheet-performance-report.v1",
      evidenceClass: "hosted-d1",
      overall: "PASS",
      buildHash: null,
      buildMode: "not-applicable",
      runId: RUN_ID,
    });
    expect(result.report.applicationFingerprint).toEqual(setup.manifest.applicationFingerprint);
    expect(result.report.producerFingerprint).toEqual(setup.manifest.producerFingerprint);
    expect(result.report.d1).toMatchObject({ binding: "ARCH_DB", query_count: 16, statement_count: 32 });
    expect((result.report.deployment as { pre_seed_projection: unknown }).pre_seed_projection).toMatchObject({
      projected_rows_read: 19_552,
      projected_rows_written: 13_028,
      status: "PASS",
    });
    expect((result.report.cleanup as { embedded_receipt: { seeded: unknown; deleted: unknown; remaining: unknown } }).embedded_receipt).toMatchObject({
      seeded: TABLE_COUNTS,
      deleted: TABLE_COUNTS,
      remaining: Object.fromEntries(Object.keys(TABLE_COUNTS).map((table) => [table, 0])),
    });
    expect(readFileSync(result.output, "utf8")).not.toContain("aeperf:");
    expect(existsSync(join(setup.manifestRoot, RUN_ID, "cleanup.json"))).toBe(false);
    expect(calls.length).toBe(21);
    for (const call of calls) {
      expect(call.command).toBe("bunx");
      expect(call.args.slice(0, 5)).toEqual(["wrangler", "d1", "execute", "ARCH_DB", "--remote"]);
      expect(call.args).toContain("--file");
      expect(call.args).toContain("--json");
      expect(call.args).not.toContain("--command");
    }
    const queryCalls = calls.filter((call) => basename(call.args[call.args.indexOf("--file") + 1]!).startsWith("query-"));
    expect(queryCalls).toHaveLength(16);
    expect(queryCalls.every((call) => call.sql.startsWith("EXPLAIN QUERY PLAN "))).toBe(true);
    const cleanupSql = calls.find((call) => basename(call.args[call.args.indexOf("--file") + 1]!) === "cleanup.sql")!.sql;
    expect(cleanupSql).toContain("json_each");
    expect(cleanupSql).not.toMatch(/LIKE\s+['"]%|prefix/iu);
    const cleanupTables = CLEANUP_ORDER.map(([table]) => table);
    expect(cleanupTables.every((table, index) => cleanupSql.indexOf(`DELETE FROM ${table}`) > (index === 0 ? -1 : cleanupSql.indexOf(`DELETE FROM ${cleanupTables[index - 1]}`)))).toBe(true);
  });

  it("retains the exact-ID cleanup manifest and emits only FAIL attempt evidence when zero reconciliation fails", () => {
    const setup = setupRun();
    const result = verifyEstimateSheetHostedD1PerformanceProof({
      repoRoot: setup.repoRoot,
      runManifest: setup.runManifest,
      profile: "limit",
      tests: "auto:dom-tests",
      gates: ["auto:wrangler-auth", "auto:provider-resources"],
      manifestRoot: setup.manifestRoot,
      currentFingerprint: setup.fingerprint,
      commandRunner: successfulRunner([], { cleanupRemaining: true }),
    });
    expect(result.kind).toBe("attempt");
    if (result.kind !== "attempt") throw new Error("expected failed attempt");
    expect(result.attempt.result).toBe("FAIL");
    expect(result.attempt.indexable).toBe(false);
    expect(result.attempt.blockers).toContain("CLEANUP_RECONCILIATION_MISMATCH");
    expect(existsSync(join(setup.manifestRoot, RUN_ID, "cleanup.json"))).toBe(true);
    expect(existsSync(join(setup.immutableRunRoot, ESTIMATE_LOGICAL_OUTPUTS.hosted))).toBe(false);
  });

  it("recovers a committed cleanup after response loss without publishing hosted proof", () => {
    const setup = setupRun();
    const interrupted = verifyEstimateSheetHostedD1PerformanceProof({
      repoRoot: setup.repoRoot,
      runManifest: setup.runManifest,
      profile: "limit",
      tests: "auto:dom-tests",
      gates: ["auto:wrangler-auth", "auto:provider-resources"],
      manifestRoot: setup.manifestRoot,
      currentFingerprint: setup.fingerprint,
      commandRunner: successfulRunner([], { cleanupResponseLost: true }),
    });
    expect(interrupted.kind).toBe("attempt");
    expect(existsSync(join(setup.manifestRoot, RUN_ID, "cleanup.json"))).toBe(true);

    const calls: Array<{ command: string; args: string[]; sql: string }> = [];
    const output = join(setup.manifestRoot, RUN_ID, "hosted-cleanup-recovery.json");
    const recovered = recoverEstimateSheetHostedD1Cleanup({
      repoRoot: setup.repoRoot,
      runId: RUN_ID,
      manifestRoot: setup.manifestRoot,
      receiptOutput: output,
      commandRunner: recoveryRunner(calls, false),
    });
    expect(recovered.receipt).toMatchObject({
      schema_version: "estimate-sheet-hosted-cleanup-recovery.v1",
      result: "RECOVERED_ALREADY_ABSENT",
      invalidatedProducer: true,
      reissued_delete: false,
      remaining: Object.fromEntries(Object.keys(TABLE_COUNTS).map((table) => [table, 0])),
    });
    const { payload_sha256: digest, ...payload } = recovered.receipt;
    expect(digest).toBe(sha256Json(payload));
    expect(calls).toHaveLength(2);
    expect(existsSync(join(setup.manifestRoot, RUN_ID, "cleanup.json"))).toBe(false);
    expect(existsSync(output)).toBe(true);
    expect(existsSync(join(setup.immutableRunRoot, ESTIMATE_LOGICAL_OUTPUTS.hosted))).toBe(false);
  });

  it("reissues only the named run exact-ID transaction when recovery still finds rows", () => {
    const setup = setupRun();
    const interrupted = verifyEstimateSheetHostedD1PerformanceProof({
      repoRoot: setup.repoRoot,
      runManifest: setup.runManifest,
      profile: "limit",
      tests: "auto:dom-tests",
      gates: ["auto:wrangler-auth", "auto:provider-resources"],
      manifestRoot: setup.manifestRoot,
      currentFingerprint: setup.fingerprint,
      commandRunner: successfulRunner([], { cleanupRemaining: true }),
    });
    expect(interrupted.kind).toBe("attempt");
    const calls: Array<{ command: string; args: string[]; sql: string }> = [];
    const output = join(setup.manifestRoot, RUN_ID, "hosted-cleanup-recovery.json");
    const recovered = recoverEstimateSheetHostedD1Cleanup({
      repoRoot: setup.repoRoot,
      runId: RUN_ID,
      manifestRoot: setup.manifestRoot,
      receiptOutput: output,
      commandRunner: recoveryRunner(calls, true),
    });
    expect(recovered.receipt).toMatchObject({
      result: "CLEANUP_VERIFIED",
      reissued_delete: true,
      seeded: TABLE_COUNTS,
      deleted: TABLE_COUNTS,
    });
    expect(calls).toHaveLength(3);
    expect(calls[1]!.sql).toContain("json_each");
    expect(calls[1]!.sql).not.toMatch(/LIKE\s+['"]%|prefix/iu);
  });

  it("fails before remote execution when ARCH_DB does not resolve to the exact bound database", () => {
    const setup = setupRun({ databaseId: "00000000-0000-0000-0000-000000000000" });
    let spawned = false;
    const result = verifyEstimateSheetHostedD1PerformanceProof({
      repoRoot: setup.repoRoot,
      runManifest: setup.runManifest,
      profile: "limit",
      tests: "auto:dom-tests",
      gates: ["auto:wrangler-auth", "auto:provider-resources"],
      manifestRoot: setup.manifestRoot,
      currentFingerprint: setup.fingerprint,
      commandRunner: () => {
        spawned = true;
        throw new Error("must not spawn");
      },
    });
    expect(result.kind).toBe("attempt");
    if (result.kind !== "attempt") throw new Error("expected blocked attempt");
    expect(result.attempt).toMatchObject({ result: "BLOCKED", indexable: false, blockers: ["ARCH_DB_BINDING_MISMATCH"] });
    expect(spawned).toBe(false);
  });

  it("binds attempt payload hashes without raw fixture identifiers", () => {
    const setup = setupRun();
    const result = verifyEstimateSheetHostedD1PerformanceProof({
      repoRoot: setup.repoRoot,
      runManifest: setup.runManifest,
      currentFingerprint: setup.fingerprint,
    });
    if (result.kind !== "attempt") throw new Error("expected attempt");
    const { payload_sha256: digest, ...payload } = result.attempt;
    expect(digest).toBe(sha256Json(payload));
    expect(canonicalJson(result.attempt)).not.toContain("aeperf:");
  });
});
