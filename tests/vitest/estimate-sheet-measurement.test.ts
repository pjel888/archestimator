import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  UNIT_001_HARD_METRICS,
  assertEstimateSheetProofEnvelopeArtifact,
  createEstimateSheetProofEnvelope,
  evaluateEstimateSheetPerformanceResult,
  measureEstimateSheetPerformance,
} from "../../scripts/measure-estimate-sheet-performance";
import {
  ESTIMATE_LOGICAL_OUTPUTS,
  INTEGRATION_SCHEMA,
  PERFORMANCE_REPORT_SCHEMA,
  PREPARE_INPUT_SCHEMA,
  UNIT_PROOF_SCHEMA,
  canonicalJson,
  sha256File,
  sha256Hex,
  sha256Json,
} from "../../scripts/lib/estimate-sheet-performance-contract";
import { createTestReceipt } from "../../scripts/lib/estimate-sheet-performance-test-receipt";
import {
  LOCAL_D1_CLEANUP_TABLE_ORDER,
  REQUIRED_LOCAL_D1_SURFACES,
  type LocalD1Measurement,
  type LocalD1StatementRecord,
} from "../../scripts/measure-estimate-sheet-d1";
import { fixturePayloadWithoutLinkage, stableStringify } from "../fixtures/estimate-sheet-performance";

function writeRun(root: string, options: {
  receiptFingerprint?: "current" | "different";
  unitId?: "UNIT-001" | "UNIT-002";
} = {}) {
  const source = readCurrentSourceFingerprint();
  const applicationFingerprint = source.application;
  const producerFingerprint = source.producer;
  const unitId = options.unitId ?? "UNIT-001";
  const runId = "measurement-test-run";
  const admission = { schema_version: "estimate-sheet-test-admission.v1", unit_id: unitId, run_id: runId };
  const admissionSha256 = sha256Hex(`${JSON.stringify(admission)}\n`);
  const prepareInput = {
    schema_version: PREPARE_INPUT_SCHEMA,
    unit_id: unitId,
    profile: "artifact-only" as const,
    application_fingerprint: applicationFingerprint,
    producer_fingerprint: producerFingerprint,
    fixture: null,
    decision: null,
    predecessor: null,
    admission: unitId === "UNIT-001" ? {
      kind: "planning" as const,
      sha256: admissionSha256,
      input_application_fingerprint: applicationFingerprint,
      input_producer_fingerprint: producerFingerprint,
    } : null,
  };
  const prepareInputSha256 = sha256Json(prepareInput);
  const runKey = `${runId}-${applicationFingerprint.content_sha256.slice(0, 12)}-${prepareInputSha256.slice(0, 12)}`;
  const runRoot = join(root, ".ai/99_scratch/estimate-sheet-performance/runs", unitId, runKey);
  const immutableRunRoot = join(root, ".ai/03_plans/2026-07-08/Project-Estimate-Sheet-Performance-Optimization/evidence/runtime/runs", unitId, runKey);
  mkdirSync(join(immutableRunRoot, "receipts"), { recursive: true });
  writeJson(join(runRoot, "dependencies/admission.json"), admission);
  const manifest = {
    schema_version: "estimate-sheet-performance-run.v1",
    package_id: "PLAN-2026-07-08-project-estimate-sheet-performance",
    unit_id: unitId,
    run_id: runId,
    profile: "artifact-only",
    evidence_class: "jsdom",
    cleanupRequirement: "NOT_APPLICABLE",
    run_root: runRoot,
    immutable_run_root: immutableRunRoot,
    pointer_path: join(runRoot, "run-pointer.json"),
    logical_outputs: ESTIMATE_LOGICAL_OUTPUTS,
    prepareInput,
    prepareInputSha256,
    created_at: "2026-07-11T00:00:00.000Z",
    status: "PREPARED",
    sourceFingerprint: source,
    applicationFingerprint,
    producerFingerprint,
    namespaces: {},
    mutationJournal: [],
    previewProcesses: [],
    ...(unitId === "UNIT-001" ? {
      admissionKind: "planning",
      admissionPath: "dependencies/admission.json",
      admissionSha256,
      inputApplicationFingerprint: applicationFingerprint,
      inputProducerFingerprint: producerFingerprint,
    } : {}),
  };
  const manifestBytes = `${JSON.stringify(manifest)}\n`;
  mkdirSync(runRoot, { recursive: true });
  mkdirSync(immutableRunRoot, { recursive: true });
  writeFileSync(join(runRoot, "run-manifest.json"), manifestBytes, { mode: 0o600 });
  writeFileSync(join(immutableRunRoot, "run-manifest.json"), manifestBytes, { mode: 0o600 });
  writeCommittedRunAnchor(root, manifest, manifestBytes);
  const receiptFingerprint = options.receiptFingerprint === "different"
    ? { ...applicationFingerprint, content_sha256: sha256Hex("different") }
    : applicationFingerprint;
  const receipt = createTestReceipt({
    testClass: "vitest",
    argv: ["bun", "run", "test:dom"],
    files: [
      "tests/vitest/estimate-sheet-performance-fixtures.test.ts",
      "tests/vitest/estimate-sheet-tree-dnd.test.tsx",
      "tests/vitest/estimate-sheet-sidebar-render-isolation.test.tsx",
      "tests/vitest/estimate-mutation-revision-concurrency.test.ts",
      "tests/vitest/perf/estimate-sheet-fan-out-budget.test.tsx",
    ],
    unitId: "UNIT-001",
    runId: manifest.run_id,
    applicationFingerprint: receiptFingerprint,
    producerFingerprint,
    preApplicationFingerprint: receiptFingerprint,
    preProducerFingerprint: producerFingerprint,
    passed: 1,
    failed: 0,
    skipped: 0,
    durationMs: 1,
  });
  writeFileSync(join(immutableRunRoot, ESTIMATE_LOGICAL_OUTPUTS["dom-tests"]), `${JSON.stringify(receipt)}\n`, { mode: 0o600 });
  for (const role of ["fingerprint-reference", "typecheck", "error-handling"]) {
    writeFileSync(join(immutableRunRoot, ESTIMATE_LOGICAL_OUTPUTS[role as "fingerprint-reference" | "typecheck" | "error-handling"]), `${JSON.stringify({
      schema_version: "estimate-sheet-command-receipt.v1",
      role,
      unit_id: manifest.unit_id,
      run_id: manifest.run_id,
      overall: "PASS",
      application_fingerprint: applicationFingerprint,
      producer_fingerprint: producerFingerprint,
    })}\n`, { mode: 0o600 });
  }
  return { manifestPath: join(runRoot, "run-manifest.json"), runRoot, immutableRunRoot };
}

function sanitizedEnvironment() {
  return { PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR };
}

function readCurrentSourceFingerprintUncached() {
  const result = spawnSync("bun", ["run", "scripts/compute-estimate-sheet-source-fingerprint.ts"], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: sanitizedEnvironment(),
  });
  if (result.status !== 0) throw new Error(result.stderr || "unable to compute source fingerprint");
  return JSON.parse(result.stdout);
}

function readCurrentSourceFingerprint() {
  return readCurrentSourceFingerprintUncached();
}

function captureCall(callback: () => unknown): { status: number; stderr: string } {
  try {
    callback();
    return { status: 0, stderr: "" };
  } catch (error) {
    return { status: 1, stderr: error instanceof Error ? error.message : String(error) };
  }
}

function runMeasure(repoRoot: string, manifestPath: string, unit: "UNIT-001" | "UNIT-002" = "UNIT-001") {
  return captureCall(() => measureEstimateSheetPerformance({
    repoRoot,
    runManifest: manifestPath,
    unit,
    profile: "limit",
    evidenceClass: unit === "UNIT-001" ? "jsdom" : "local-browser",
    budgetPolicy: "record-only",
    tests: unit === "UNIT-001" ? ["auto:dom-tests"] : undefined,
    gates: unit === "UNIT-001" ? ["auto:fingerprint-reference", "auto:typecheck", "auto:error-handling"] : undefined,
    fixtureOutput: unit === "UNIT-001" ? "auto:fixture" : undefined,
    output: unit === "UNIT-001" ? "auto:jsdom" : "auto:browser",
    sourceFingerprint: readCurrentSourceFingerprint(),
  }));
}

const PROOF_MODE_KEYS = ["routeFastPath", "graph", "incrementalDerivation", "renderBoundary", "entityPatch"] as const;
const PROOF_MODE_TARGETS = [
  "ESTIMATE_ROUTE_FAST_PATH_MODE",
  "ESTIMATE_GRAPH_MODE",
  "ESTIMATE_INCREMENTAL_DERIVATION_MODE",
  "ESTIMATE_RENDER_BOUNDARY_MODE",
  "ESTIMATE_ENTITY_PATCH_MODE",
] as const;

function writeJson(path: string, value: unknown): void {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value)}\n`, { mode: 0o600 });
}

function writeCommittedRunAnchor(root: string, manifest: { unit_id: string; run_id: string }, manifestBytes: string): void {
  const planPath = join(root, ".ai/03_plans/2026-07-08/Project-Estimate-Sheet-Performance-Optimization/plan-pack.json");
  writeJson(planPath, {
    runtime_evidence: {
      latest_unit_id: manifest.unit_id,
      latest_run_id: manifest.run_id,
      latest_run_manifest_sha256: sha256Hex(manifestBytes),
    },
  });
}

function allActivatedSnapshot(value: "off" | "shadow" | "on") {
  return {
    schemaVersion: "estimate-performance-mode-snapshot.v1",
    version: 1,
    source: "cloudflare",
    modes: Object.fromEntries(PROOF_MODE_KEYS.map((key) => [key, value])),
  };
}

function d1Statement(surface: (typeof REQUIRED_LOCAL_D1_SURFACES)[number], index: number): LocalD1StatementRecord {
  const expectedBindFailure = surface === "limit-tree-row-load";
  return {
    surface,
    statementName: `${surface}-${index}`,
    normalizedSqlHash: sha256Hex(`SELECT ${index} FROM fixture WHERE id = ?`),
    bindCount: expectedBindFailure ? 1_501 : 1,
    bindCeilingOutcome: expectedBindFailure ? "EXCEEDS_LIMIT" : "WITHIN_LIMIT",
    statementCount: 1,
    queryCount: 1,
    batchSize: 1,
    durationMs: expectedBindFailure ? null : 1,
    rowsRead: expectedBindFailure ? null : 1,
    rowsWritten: surface === "row-update" ? 1 : 0,
    resultRowCount: expectedBindFailure ? 0 : 1,
    queryPlan: ["SEARCH fixture USING INDEX fixture_idx (id=?)"],
    queryPlanBasisBindCount: expectedBindFailure ? 100 : 1,
    selectedIndex: "fixture_idx",
    seededCount: 6_508,
    cleanedCount: 0,
    evidenceClass: "local-d1",
    outcome: expectedBindFailure ? "FAIL" : "PASS",
    ...(expectedBindFailure ? { failureId: "D1_TOO_MANY_SQL_VARIABLES" as const } : {}),
  };
}

function d1TableCounts(kind: "seeded" | "zero"): Record<string, number> {
  return Object.fromEntries(LOCAL_D1_CLEANUP_TABLE_ORDER.map((table) => {
    if (kind === "zero") return [table, 0];
    if (table === "estimate_nodes") return [table, 1_500];
    if (table === "estimate_row_items") return [table, 5_000];
    return [table, 1];
  }));
}

function completeD1Measurement(fixtureHash: string): LocalD1Measurement {
  const statements = REQUIRED_LOCAL_D1_SURFACES.map(d1Statement);
  const seeded = d1TableCounts("seeded");
  const metrics = {
    "M-D1-ROUTE-CONTEXT-STATEMENTS": { value: 4, threshold: 4, comparison: "maximum", unit: "count", status: "PASS", source: "route-context" },
    "M-D1-TAB-TREE-STATEMENTS": { value: 3, threshold: 3, comparison: "maximum", unit: "count", status: "PASS", source: "selected-tab-tree" },
    "M-D1-ROW-UPDATE-STATEMENTS": { value: 3, threshold: 3, comparison: "maximum", unit: "count", status: "PASS", source: "row-update" },
    "M-D1-SUBTREE-DEPTH-SHAPE": { value: 1, threshold: 1, comparison: "exact", unit: "count", status: "PASS", source: "lazy-subtree" },
    "M-D1-BIND-CEILING": { value: 100, threshold: 100, comparison: "maximum", unit: "count", status: "PASS", source: "bounded-chunks" },
    "M-D1-COST-PROJECTION-PCT": { value: 5, threshold: 50, comparison: "maximum", unit: "percent", status: "PASS", source: "cost-projection" },
    "M-MUTATE-SERVER-FANOUT-BUDGET": { value: 1_000, threshold: 1_001, comparison: "maximum", unit: "count", status: "PASS", source: "project-component-fanout" },
  } satisfies LocalD1Measurement["metrics"];
  return {
    schemaVersion: "estimate-sheet-local-d1-measurement.v1",
    provider: "cloudflare-d1-local",
    providerBacked: true,
    binding: "ARCH_DB",
    databaseIdSha256: sha256Hex("database-id"),
    persistenceRoot: "wrangler-state",
    persistenceRootIdSha256: sha256Hex("wrangler-state-id"),
    wranglerVersion: "4.105.0",
    betterAuthVersion: "1.6.23",
    schemaHash: sha256Hex("schema"),
    generatedSchemaHash: sha256Hex("generated-schema"),
    generatedSchemaStatementCount: 8,
    generatedSchemaTables: ["account", "rateLimit", "session", "user", "verification"],
    migrationSetHash: sha256Hex("migration-set"),
    migrationHead: "0067_beta_activation_events.sql",
    migrationCount: 2,
    migrationStatementCount: 4,
    migrationIdempotency: { firstPassApplied: 2, secondPassApplied: 0, ledgerCount: 2 },
    fixture: { profile: "limit", nodeCount: 1_500, rowCount: 5_000, componentMatchCount: 1_000, fixtureHash },
    bindCeiling: { installed: 100, provider: 100, effective: 100, successAtCeiling: true, failureAboveCeiling: true, rowLoadBindCount: 1_501, rowLoadOutcome: "FAIL" },
    statements,
    queryCount: statements.length,
    bindCounts: statements.map((statement) => statement.bindCount),
    rowsRead: 120,
    rowsWritten: 1,
    queryPlans: statements.map((statement) => ({ statementName: statement.statementName, details: statement.queryPlan, selectedIndex: statement.selectedIndex })),
    cleanup: {
      statePath: "cleanup/d1-state.json",
      stateSha256: sha256Hex("cleanup-state"),
      exactTableOrder: [...LOCAL_D1_CLEANUP_TABLE_ORDER],
      auxiliaryAuthTableOrder: ["session", "user", "legal_terms_acceptances", "closed_beta_allowed_emails"],
      seeded,
      deleted: d1TableCounts("zero"),
      remaining: { ...seeded },
    },
    costProjection: {
      trafficModel: "10-users-500-actions-50-route-opens",
      projectedRowsReadPerDay: 120_000,
      projectedRowsWrittenPerDay: 5_000,
      planningBaselineReadAllowance: 5_000_000,
      planningBaselineWriteAllowance: 100_000,
      maximumPercent: 5,
      thresholdPercent: 50,
      status: "PASS",
    },
    metrics,
    functionalScenarios: {
      "auth-denial-wrong-tenant": "PASS",
      "auth-denial-wrong-estimate": "PASS",
      "auth-denial-wrong-tab": "PASS",
      "auth-denial-wrong-node": "PASS",
    },
  };
}

function writeUnit010ProofRun(root: string, unitId: "UNIT-006" | "UNIT-010" = "UNIT-010") {
  const source = readCurrentSourceFingerprint();
  const runId = unitId === "UNIT-006"
    ? "00000000-0000-4000-8000-000000000006"
    : "00000000-0000-4000-8000-000000000010";
  const authFixtureHash = sha256Hex("unit-010-auth-fixture");
  const buildHash = sha256Hex("unit-010-opennext-build");
  const preStateSha256 = sha256Hex("unit-010-canonical-pre-state");
  const fixtureHash = preStateSha256;
  const namespaceRoleNames = unitId === "UNIT-006" ? ["mode"] : ["mode", "browser", "d1"];
  const prepareInput = {
    schema_version: PREPARE_INPUT_SCHEMA,
    unit_id: unitId,
    profile: "limit" as const,
    application_fingerprint: source.application,
    producer_fingerprint: source.producer,
    fixture: { profile: "limit" as const, payload_sha256: fixtureHash, namespace_roles: namespaceRoleNames },
    decision: null,
    predecessor: null,
    admission: null,
  };
  const prepareInputSha256 = sha256Json(prepareInput);
  const runKey = `${runId}-${source.application.content_sha256.slice(0, 12)}-${prepareInputSha256.slice(0, 12)}`;
  const runRoot = join(root, ".ai/99_scratch/estimate-sheet-performance/runs", unitId, runKey);
  const immutableRunRoot = join(root, ".ai/03_plans/2026-07-08/Project-Estimate-Sheet-Performance-Optimization/evidence/runtime/runs", unitId, runKey);
  const browserMutation = {
    fixtureRole: "browser",
    namespaceIdSha256: sha256Hex("unit-010-browser-namespace"),
    preStateSha256,
    postStateSha256: sha256Hex("unit-010-browser-post-state"),
    declaredMutationSha256: sha256Hex("unit-010-browser-declared-mutation"),
    commandId: "unit-010-browser-command",
  };
  const d1Mutation = {
    fixtureRole: "d1",
    namespaceIdSha256: sha256Hex("unit-010-d1-namespace"),
    preStateSha256,
    postStateSha256: sha256Hex("unit-010-d1-post-state"),
    declaredMutationSha256: sha256Hex("unit-010-d1-declared-mutation"),
    commandId: "unit-010-d1-command",
  };
  const phases = ["off", "shadow", "on", "rollback", "final"] as const;
  const snapshots = Object.fromEntries(phases.map((phase) => [phase, allActivatedSnapshot(phase === "shadow" ? "shadow" : phase === "on" || phase === "final" ? "on" : "off")])) as Record<(typeof phases)[number], ReturnType<typeof allActivatedSnapshot>>;
  const activeDescriptor = {
    schema_version: "estimate-sheet-benchmark-server.v1",
    unit_id: unitId,
    run_id: runId,
    role: "mode",
    phase: "final",
    final_state: "all-activated",
    ordinal: 5,
    port: 3110,
    base_url: "http://127.0.0.1:3110",
    route_path: "/workshop/projects/project-id/estimates/estimate-id",
    command: ["bunx", "opennextjs-cloudflare", "preview"],
    launched: true,
    pid: 45110,
    build_receipt: "receipts/command-opennext-build.json",
    build_receipt_sha256: sha256Hex("build-receipt"),
    build_hash: buildHash,
    runtime_env_sha256: sha256Hex("runtime-env"),
    storage_state_sha256: sha256Hex("storage-state"),
    requested_snapshot: snapshots.final,
    server_snapshot: snapshots.final,
    readiness: "READY",
    active: true,
    process_journal: "preview/process-journal.json",
    generated_at: "2026-07-11T00:00:05.000Z",
  };
  const descriptorPath = join(runRoot, "preview/descriptors/05-final.json");
  writeJson(descriptorPath, activeDescriptor);
  const activePath = join(runRoot, "preview/active-preview.json");
  writeJson(activePath, {
    ...activeDescriptor,
    descriptor_path: "preview/descriptors/05-final.json",
    descriptor_sha256: sha256File(descriptorPath),
  });
  const intermediatePreviews = phases.slice(0, 4).map((phase, index) => ({
    role: "mode",
    phase,
    ordinal: index + 1,
    pid: 45100 + index,
    port: 3110,
    requested_snapshot: snapshots[phase],
    server_snapshot: snapshots[phase],
    build_hash: buildHash,
    readiness: "READY",
    exit_code: 0,
    signal: null,
    closed_port: true,
    stopped_at: `2026-07-11T00:00:0${index + 1}.000Z`,
  }));
  const runtimeEnv = join(runRoot, "runtime.env");
  const storageState = join(runRoot, "storage-state.json");
  const processJournal = join(runRoot, "preview/process-journal.json");
  writeFileSync(runtimeEnv, "ESTIMATE_GRAPH_MODE=on\n", { mode: 0o600 });
  writeJson(storageState, { cookies: [{ name: "session", value: "redacted", domain: "127.0.0.1", path: "/" }], origins: [] });
  writeJson(processJournal, { schema_version: "estimate-sheet-preview-process-journal.v1", unit_id: unitId, run_id: runId, processes: [] });
  const namespaceRoles = unitId === "UNIT-006"
    ? { mode: { idSha256: sha256Hex("unit-010-mode-namespace"), preStateSha256 } }
    : {
        mode: { idSha256: sha256Hex("unit-010-mode-namespace"), preStateSha256 },
        browser: { idSha256: browserMutation.namespaceIdSha256, preStateSha256, postStateSha256: browserMutation.postStateSha256, commandId: browserMutation.commandId },
        d1: { idSha256: d1Mutation.namespaceIdSha256, preStateSha256, postStateSha256: d1Mutation.postStateSha256, commandId: d1Mutation.commandId },
      };
  const wranglerState = join(runRoot, "wrangler-state");
  mkdirSync(wranglerState, { recursive: true });
  const manifest = {
    schema_version: "estimate-sheet-performance-run.v1",
    package_id: "PLAN-2026-07-08-project-estimate-sheet-performance",
    unit_id: unitId,
    run_id: runId,
    profile: "limit",
    evidence_class: "local-browser",
    cleanupRequirement: "REQUIRED",
    run_root: runRoot,
    immutable_run_root: immutableRunRoot,
    pointer_path: join(runRoot, "run-pointer.json"),
    logical_outputs: ESTIMATE_LOGICAL_OUTPUTS,
    prepareInput,
    prepareInputSha256,
    created_at: "2026-07-11T00:00:00.000Z",
    status: "PREPARED",
    sourceFingerprint: source,
    applicationFingerprint: source.application,
    producerFingerprint: source.producer,
    fixture: { profile: "limit", namespaceIdSha256: sha256Hex("unit-010-mode-namespace"), preStateSha256 },
    namespaces: namespaceRoles,
    mutationJournal: unitId === "UNIT-006" ? [] : [browserMutation, d1Mutation],
    previewProcesses: [...intermediatePreviews, { ...intermediatePreviews[0], phase: "final", ordinal: 5, pid: activeDescriptor.pid, exit_code: null, signal: null, closed_port: false, stopped_at: null }],
    activePreview: { path: activePath, sha256: sha256File(activePath), pid: activeDescriptor.pid, port: activeDescriptor.port, snapshot: snapshots.final },
    activatedModes: unitId === "UNIT-006" ? ["ESTIMATE_GRAPH_MODE"] : [...PROOF_MODE_TARGETS],
    fixture_hash: fixtureHash,
    auth_fixture_hash: authFixtureHash,
    wranglerState,
    resources: {
      d1Binding: "ARCH_DB",
      wranglerState,
      localConfig: join(runRoot, "resources/d1/wrangler-local.json"),
      localConfigSha256: sha256Hex("local-config"),
      generatedSchema: join(runRoot, "better-auth-schema.sql"),
      generatedSchemaSha256: sha256Hex("generated-schema"),
      migrations: join(runRoot, "resources/d1/migrations.json"),
      migrationsSha256: sha256Hex("migrations"),
      migrationHead: "0040_operational_incidents.sql",
      migrationCount: 40,
      seedSql: join(runRoot, "seed.sql"),
      seedSqlSha256: sha256Hex("seed-sql"),
      cleanupSql: join(runRoot, "resources/d1/cleanup.sql"),
      cleanupSqlSha256: sha256Hex("cleanup-sql"),
      cleanupStateSha256ByRole: Object.fromEntries(Object.keys(namespaceRoles).map((role) => [role, sha256Hex(`cleanup-${role}`)])),
      unitLease: join(runRoot, "../../..", "leases/units", unitId),
      portLease: join(runRoot, "../../..", "leases/ports/3110"),
    },
    leasedPort: 3110,
    port: 3110,
    runtimeEnv,
    runtimeEnvSha256: sha256File(runtimeEnv),
    runtimeEnvStableSha256: sha256Hex("unit-proof-stable-runtime-environment"),
    storageState,
    storageStateSha256: sha256File(storageState),
    storageStateExpiresAt: "2099-01-01T00:00:00.000Z",
    processJournal,
    routePath: activeDescriptor.route_path,
    route: { path: activeDescriptor.route_path, projectId: "project-id", nodeId: "estimate-id", fixtureRole: unitId === "UNIT-006" ? "mode" : "browser" },
    buildReceipt: join(immutableRunRoot, ESTIMATE_LOGICAL_OUTPUTS["opennext-build"]),
    build_hash: buildHash,
  };
  const manifestBytes = `${JSON.stringify(manifest)}\n`;
  mkdirSync(runRoot, { recursive: true });
  mkdirSync(immutableRunRoot, { recursive: true });
  writeFileSync(join(runRoot, "run-manifest.json"), manifestBytes, { mode: 0o600 });
  writeFileSync(join(immutableRunRoot, "run-manifest.json"), manifestBytes, { mode: 0o600 });
  writeCommittedRunAnchor(root, manifest, manifestBytes);
  writeJson(join(immutableRunRoot, ESTIMATE_LOGICAL_OUTPUTS["mode-proof"]), {
    schema_version: "estimate-sheet-mode-proof.v1",
    unit_id: unitId,
    run_id: runId,
    application_fingerprint: source.application,
    producer_fingerprint: source.producer,
    fixture_hash: fixtureHash,
    build_hash: buildHash,
    auth_fixture_hash: authFixtureHash,
    fixture_role: "mode",
    target: [...PROOF_MODE_TARGETS],
    requested_snapshots: phases.map((phase) => ({ phase, snapshot: snapshots[phase] })),
    server_snapshots: phases.map((phase) => ({ phase, snapshot: snapshots[phase] })),
    parity: { snapshotKeys: [...PROOF_MODE_KEYS], allRequestedMatch: true },
    side_effects: { writes: 0, reads: 5, unexpected: 0 },
    scope_measurements: { previewStarts: 5, previewStops: 4, snapshotChecks: 5 },
    intermediate_previews: intermediatePreviews,
    active_preview: activeDescriptor,
    overall: "PASS",
    failures: [],
    created_at: "2026-07-11T00:00:05.000Z",
  });
  const browserMetrics = { "M-INTEGRATION-LOCAL": { value: 1, threshold: 1, comparison: "exact", unit: "count", status: "PASS" } };
  writeJson(join(immutableRunRoot, ESTIMATE_LOGICAL_OUTPUTS["browser-child"]), {
    schema_version: PERFORMANCE_REPORT_SCHEMA,
    evidenceClass: "local-browser",
    trace: { packageId: manifest.package_id, unitId, evidenceId: "browser-child" },
    head: source.head,
    applicationFingerprint: source.application,
    producerFingerprint: source.producer,
    fixtureHash,
    buildHash,
    authFixtureHash,
    toolHashes: { producer: sha256Hex("browser-producer") },
    runId,
    generatedAt: "2026-07-11T00:00:06.000Z",
    method: { warmups: 3, samples: 20, workerCount: 1, retries: 0, profile: "limit" },
    metrics: browserMetrics,
    overall: "PASS",
    browserScope: "full-local",
    browser: { name: "chromium", version: "pinned" },
    device: { viewport: "1440x900", deviceScaleFactor: 1 },
    environment: { cpuSlowdown: 4, latencyMs: 20 },
    modeSnapshot: snapshots.final,
    finalSnapshot: snapshots.final,
    rawSamples: [{ metric: "M-INTEGRATION-LOCAL", value: 1 }],
    buildMode: "opennext-preview",
  });
  const d1 = completeD1Measurement(fixtureHash);
  writeJson(join(immutableRunRoot, ESTIMATE_LOGICAL_OUTPUTS["d1-child"]), {
    schema_version: PERFORMANCE_REPORT_SCHEMA,
    evidenceClass: "local-d1",
    trace: { packageId: manifest.package_id, unitId, evidenceId: "d1-child" },
    head: source.head,
    applicationFingerprint: source.application,
    producerFingerprint: source.producer,
    fixtureHash,
    buildHash: null,
    authFixtureHash,
    toolHashes: { producer: sha256Hex("d1-producer") },
    runId,
    generatedAt: "2026-07-11T00:00:07.000Z",
    method: { warmups: 0, samples: d1.statements.length, workerCount: 1, retries: 0, profile: "limit" },
    metrics: d1.metrics,
    scenarios: d1.functionalScenarios,
    overall: "PASS",
    buildMode: "not-applicable",
    d1,
  });
  const domReceipt = createTestReceipt({
    testClass: "vitest",
    argv: ["bun", "run", "perf:estimate:activated-tests"],
    files: ["tests/vitest/estimate-sheet-performance-fixtures.test.ts"],
    unitId,
    runId,
    applicationFingerprint: source.application,
    producerFingerprint: source.producer,
    passed: 1,
  });
  const e2eReceipt = createTestReceipt({
    testClass: "playwright",
    argv: ["bun", "run", "test:e2e"],
    files: ["e2e/estimate-sheet-performance.spec.ts"],
    unitId,
    runId,
    applicationFingerprint: source.application,
    producerFingerprint: source.producer,
    fixtureHash,
    buildHash,
    passed: 1,
    fixtureMutation: browserMutation,
  });
  writeJson(join(immutableRunRoot, ESTIMATE_LOGICAL_OUTPUTS["dom-tests"]), domReceipt);
  writeJson(join(immutableRunRoot, ESTIMATE_LOGICAL_OUTPUTS["e2e-tests"]), e2eReceipt);
  const gateCommands: Record<string, string[]> = {
    "next-build": ["bun", "run", "build"],
    "opennext-build": ["bun", "run", "cf:build"],
    "error-handling": ["bun", "run", "validate:error-handling"],
    "react-doctor": ["bun", "run", "doctor"],
    typecheck: ["bun", "run", "type-check"],
  };
  for (const [role, argv] of Object.entries(gateCommands)) writeJson(join(immutableRunRoot, ESTIMATE_LOGICAL_OUTPUTS[role as keyof typeof ESTIMATE_LOGICAL_OUTPUTS]), {
    schema_version: "estimate-sheet-command-receipt.v1",
    role,
    argv,
    unit_id: unitId,
    run_id: runId,
    start_at: "2026-07-11T00:00:08.000Z",
    end_at: "2026-07-11T00:00:09.000Z",
    duration_ms: 1_000,
    exit_code: 0,
    signal: null,
    overall: "PASS",
    redacted_output_sha256: sha256Hex(`${role}-output`),
    diagnostic_counts: { stdoutLines: 1, stderrLines: 0, failures: 0 },
    application_fingerprint: source.application,
    producer_fingerprint: source.producer,
    pre_application_fingerprint: source.application,
    pre_producer_fingerprint: source.producer,
    post_application_fingerprint: source.application,
    post_producer_fingerprint: source.producer,
    child_outputs: [],
    build_hash: role === "opennext-build" ? buildHash : role === "next-build" ? sha256Hex("unit-010-next-build") : null,
  });
  return { manifestPath: join(runRoot, "run-manifest.json"), runRoot, immutableRunRoot };
}

function runUnit010Envelope(repoRoot: string, manifestPath: string) {
  return captureCall(() => createEstimateSheetProofEnvelope({
    repoRoot,
    runManifest: manifestPath,
    unit: "UNIT-010",
    allLocal: true,
    mode: "auto:mode-proof",
    browser: "auto:browser-child",
    d1: "auto:d1-child",
    tests: ["auto:dom-tests", "auto:e2e-tests"],
    gates: ["auto:next-build", "auto:opennext-build", "auto:error-handling", "auto:react-doctor", "auto:typecheck"],
    output: "auto:integration",
    requiredPhases: "off,shadow,on,rollback",
    sourceBuildMatch: "required",
    budgetPolicy: "enforce",
    sourceFingerprint: readCurrentSourceFingerprint(),
  }));
}

function writeUnit006ProofRun(root: string) {
  const created = writeUnit010ProofRun(root, "UNIT-006");
  const { manifestPath, runRoot, immutableRunRoot } = created;
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const runId = manifest.run_id;
  const phases = ["off", "shadow", "on", "rollback", "final"] as const;
  const snapshots = Object.fromEntries(phases.map((phase) => {
    const snapshot = allActivatedSnapshot("off");
    snapshot.modes.graph = phase === "shadow" ? "shadow" : phase === "on" || phase === "final" ? "on" : "off";
    return [phase, snapshot];
  })) as Record<(typeof phases)[number], ReturnType<typeof allActivatedSnapshot>>;
  const descriptorPath = join(runRoot, "preview/descriptors/05-final.json");
  const activeDescriptor = {
    ...JSON.parse(readFileSync(descriptorPath, "utf8")),
    unit_id: "UNIT-006",
    run_id: runId,
    final_state: "on",
    requested_snapshot: snapshots.final,
    server_snapshot: snapshots.final,
  };
  writeFileSync(descriptorPath, `${JSON.stringify(activeDescriptor)}\n`, { mode: 0o600 });
  const activePath = join(runRoot, "preview/active-preview.json");
  writeFileSync(activePath, `${JSON.stringify({
    ...activeDescriptor,
    descriptor_path: "preview/descriptors/05-final.json",
    descriptor_sha256: sha256File(descriptorPath),
  })}\n`, { mode: 0o600 });
  manifest.activePreview = { path: activePath, sha256: sha256File(activePath), pid: activeDescriptor.pid, port: activeDescriptor.port, snapshot: snapshots.final };
  manifest.previewProcesses = [];
  writeFileSync(manifestPath, `${JSON.stringify(manifest)}\n`, { mode: 0o600 });

  const intermediatePreviews = phases.slice(0, 4).map((phase, index) => ({
    role: "mode",
    phase,
    ordinal: index + 1,
    pid: 45600 + index,
    port: 3110,
    requested_snapshot: snapshots[phase],
    server_snapshot: snapshots[phase],
    build_hash: manifest.build_hash,
    readiness: "READY",
    exit_code: 0,
    signal: null,
    closed_port: true,
    stopped_at: `2026-07-11T00:00:1${index}.000Z`,
  }));
  writeFileSync(join(immutableRunRoot, ESTIMATE_LOGICAL_OUTPUTS["mode-proof"]), `${JSON.stringify({
    schema_version: "estimate-sheet-mode-proof.v1",
    unit_id: "UNIT-006",
    run_id: runId,
    application_fingerprint: manifest.applicationFingerprint,
    producer_fingerprint: manifest.producerFingerprint,
    fixture_hash: manifest.fixture_hash,
    build_hash: manifest.build_hash,
    auth_fixture_hash: manifest.auth_fixture_hash,
    fixture_role: "mode",
    target: "ESTIMATE_GRAPH_MODE",
    requested_snapshots: phases.map((phase) => ({ phase, snapshot: snapshots[phase] })),
    server_snapshots: phases.map((phase) => ({ phase, snapshot: snapshots[phase] })),
    parity: { snapshotKeys: [...PROOF_MODE_KEYS], allRequestedMatch: true },
    side_effects: { writes: 0, reads: 5, unexpected: 0 },
    scope_measurements: { previewStarts: 5, previewStops: 4, snapshotChecks: 5 },
    intermediate_previews: intermediatePreviews,
    active_preview: activeDescriptor,
    overall: "PASS",
    failures: [],
    created_at: "2026-07-11T00:00:15.000Z",
  })}\n`, { mode: 0o600 });
  for (const role of ["dom-graph", "dom-performance"] as const) writeJson(join(immutableRunRoot, ESTIMATE_LOGICAL_OUTPUTS[role]), createTestReceipt({
    testClass: "vitest",
    argv: ["bun", "run", "test:dom"],
    files: [`tests/vitest/${role}.test.ts`],
    unitId: "UNIT-006",
    runId,
    applicationFingerprint: manifest.applicationFingerprint,
    producerFingerprint: manifest.producerFingerprint,
    passed: 1,
  }));
  for (const role of ["opennext-build", "react-doctor", "typecheck"] as const) {
    const path = join(immutableRunRoot, ESTIMATE_LOGICAL_OUTPUTS[role]);
    const receipt = JSON.parse(readFileSync(path, "utf8"));
    receipt.unit_id = "UNIT-006";
    receipt.run_id = runId;
    writeFileSync(path, `${JSON.stringify(receipt)}\n`, { mode: 0o600 });
  }
  return created;
}

function runUnit006Envelope(repoRoot: string, manifestPath: string, includeBrowser = false) {
  return captureCall(() => createEstimateSheetProofEnvelope({
    repoRoot,
    runManifest: manifestPath,
    unit: "UNIT-006",
    proofScope: "graph",
    mode: "auto:mode-proof",
    ...(includeBrowser ? { browser: "auto:browser-child" } : {}),
    tests: ["auto:dom-graph", "auto:dom-performance"],
    gates: ["auto:opennext-build", "auto:react-doctor", "auto:typecheck"],
    output: "auto:unit-proof",
    requiredPhases: "off,shadow,on,rollback",
    sourceBuildMatch: "required",
    budgetPolicy: "enforce",
    sourceFingerprint: readCurrentSourceFingerprint(),
  }));
}

describe("estimate-sheet measurement producer", () => {
  it("writes a reciprocal fixture/report pair only after validating receipt and gate lineage", () => {
    const root = mkdtempSync(join(tmpdir(), "estimate-measurement-"));
    try {
      const { manifestPath, immutableRunRoot } = writeRun(root);
      const result = runMeasure(root, manifestPath);
      expect(result.status, result.stderr).toBe(0);
      const report = JSON.parse(readFileSync(join(immutableRunRoot, ESTIMATE_LOGICAL_OUTPUTS.jsdom), "utf8"));
      const fixture = JSON.parse(readFileSync(join(immutableRunRoot, ESTIMATE_LOGICAL_OUTPUTS.fixture), "utf8"));
      expect(report.overall).toBe("FAIL");
      expect(report.failures).toContain("hard-metric-failed:M-MUTATE-CLIENT-FANOUT-NONMATCH-INSPECTIONS");
      expect(report.fixtureHash).toBe(sha256Hex(stableStringify(fixturePayloadWithoutLinkage(fixture))));
      expect(fixture.linkage.counterpartPayloadSha256).toBe(sha256Hex(canonicalJson(report)));
      expect(fixture.linkage.bundleSha256).toBe(sha256Hex(canonicalJson({
        fixturePayloadSha256: report.fixtureHash,
        reportPayloadSha256: fixture.linkage.counterpartPayloadSha256,
      })));
      for (const metricId of Object.keys(UNIT_001_HARD_METRICS)) {
        expect(report.metrics[metricId]).toMatchObject({ status: expect.stringMatching(/^(PASS|FAIL)$/), value: expect.any(Number) });
      }
      expect(report.metrics["M-MUTATE-CLIENT-FANOUT-NONMATCH-INSPECTIONS"]).toMatchObject({
        status: "FAIL",
        value: 4_000,
        matchCount: 1_000,
        rowCount: 5_000,
      });
      expect(report.metrics["M-MUTATE-DUPLICATE-SAVE-PATCH-COUNT"]).toMatchObject({ status: "PASS", value: 1 });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("resumes the exact linked fixture/report pair after a crash between publications", () => {
    const root = mkdtempSync(join(tmpdir(), "estimate-measurement-resume-"));
    try {
      const { manifestPath, runRoot, immutableRunRoot } = writeRun(root);
      const input = {
        repoRoot: root,
        runManifest: manifestPath,
        unit: "UNIT-001" as const,
        profile: "limit" as const,
        evidenceClass: "jsdom" as const,
        budgetPolicy: "record-only" as const,
        tests: ["auto:dom-tests"],
        gates: ["auto:fingerprint-reference", "auto:typecheck", "auto:error-handling"],
        fixtureOutput: "auto:fixture",
        output: "auto:jsdom",
        sourceFingerprint: readCurrentSourceFingerprint(),
      };
      expect(() => measureEstimateSheetPerformance({
        ...input,
        faultInjector: (point) => {
          if (point === "UNIT001_FIXTURE_PUBLISHED") throw new Error("injected fixture/report interruption");
        },
      })).toThrow(/injected fixture\/report interruption/u);

      const journalPath = join(runRoot, "measurements/unit-001-publication.json");
      expect(existsSync(journalPath)).toBe(true);
      expect(existsSync(join(immutableRunRoot, ESTIMATE_LOGICAL_OUTPUTS.fixture))).toBe(true);
      expect(existsSync(join(immutableRunRoot, ESTIMATE_LOGICAL_OUTPUTS.jsdom))).toBe(false);

      const resumed = measureEstimateSheetPerformance(input);
      expect(resumed.reportPath).toBe(join(immutableRunRoot, ESTIMATE_LOGICAL_OUTPUTS.jsdom));
      expect(existsSync(journalPath)).toBe(false);
      const report = JSON.parse(readFileSync(resumed.reportPath, "utf8"));
      const fixture = JSON.parse(readFileSync(join(immutableRunRoot, ESTIMATE_LOGICAL_OUTPUTS.fixture), "utf8"));
      expect(fixture.linkage.counterpartPayloadSha256).toBe(sha256Hex(canonicalJson(report)));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("fails a missing required hard metric instead of treating it as skipped", () => {
    const metrics = passingHardMetrics();
    delete metrics["M-GRAPH-DUPLICATE-BYTES"];
    metrics["M-DERIVE-CLOSED-MOVE-OPTION-WORK"] = { value: 0, status: "SKIPPED" };
    const result = evaluateEstimateSheetPerformanceResult({
      unitId: "UNIT-001",
      evidenceClass: "jsdom",
      budgetPolicy: "record-only",
      overall: "PASS",
      metrics,
    });

    expect(result.overall).toBe("FAIL");
    expect(result.metrics["M-GRAPH-DUPLICATE-BYTES"]).toMatchObject({
      status: "FAIL",
      value: null,
      reason: "required hard metric is missing or non-finite",
    });
    expect(result.failures).toContain("hard-metric-failed:M-GRAPH-DUPLICATE-BYTES");
    expect(result.metrics["M-DERIVE-CLOSED-MOVE-OPTION-WORK"]).toMatchObject({ status: "FAIL", value: 0 });
  });

  it("keeps a computed hard-budget failure under record-only policy", () => {
    const metrics = passingHardMetrics();
    metrics["M-GRAPH-ANCESTOR-LOOKUP-P95"] = { value: 6, status: "PASS" };
    const result = evaluateEstimateSheetPerformanceResult({
      unitId: "UNIT-001",
      evidenceClass: "jsdom",
      budgetPolicy: "record-only",
      overall: "PASS",
      metrics,
    });

    expect(result.overall).toBe("FAIL");
    expect(result.metrics["M-GRAPH-ANCESTOR-LOOKUP-P95"]).toMatchObject({
      status: "FAIL",
      value: 6,
      threshold: 5,
    });
  });

  it("rejects a mismatched test receipt before publishing either artifact", () => {
    const root = mkdtempSync(join(tmpdir(), "estimate-measurement-invalid-"));
    try {
      const { manifestPath, immutableRunRoot } = writeRun(root, { receiptFingerprint: "different" });
      const result = runMeasure(root, manifestPath);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toMatch(/test receipt fingerprint mismatch/);
      expect(existsSync(join(immutableRunRoot, ESTIMATE_LOGICAL_OUTPUTS.fixture))).toBe(false);
      expect(existsSync(join(immutableRunRoot, ESTIMATE_LOGICAL_OUTPUTS.jsdom))).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("never synthesizes a future-unit PASS report under record-only policy", () => {
    const root = mkdtempSync(join(tmpdir(), "estimate-measurement-future-unit-"));
    try {
      const { manifestPath, immutableRunRoot } = writeRun(root, { unitId: "UNIT-002" });
      const result = runMeasure(root, manifestPath, "UNIT-002");
      expect(result.status).not.toBe(0);
      expect(result.stderr).toMatch(/NOT_APPLICABLE manifest unit is not allowed/);
      expect(existsSync(join(immutableRunRoot, ESTIMATE_LOGICAL_OUTPUTS.browser))).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("publishes graph unit proof from its exact children and rejects a browser substitution", () => {
    const root = mkdtempSync(join(tmpdir(), "estimate-measurement-unit-006-"));
    try {
      const { manifestPath, immutableRunRoot } = writeUnit006ProofRun(root);
      const result = runUnit006Envelope(root, manifestPath);
      expect(result.status, result.stderr).toBe(0);
      const proof = JSON.parse(readFileSync(join(immutableRunRoot, ESTIMATE_LOGICAL_OUTPUTS["unit-proof"]), "utf8"));
      expect(proof).toMatchObject({ schema_version: UNIT_PROOF_SCHEMA, unit_id: "UNIT-006", proofScope: "graph", overall: "PASS" });
      expect(proof.children.map((child: { role: string }) => child.role)).toEqual([
        "mode-proof",
        "dom-graph",
        "dom-performance",
        "opennext-build",
        "react-doctor",
        "typecheck",
      ]);
      unlinkSync(join(immutableRunRoot, ESTIMATE_LOGICAL_OUTPUTS["unit-proof"]));
      const substituted = runUnit006Envelope(root, manifestPath, true);
      expect(substituted.status).not.toBe(0);
      expect(substituted.stderr).toMatch(/forbids a browser child/i);
      expect(existsSync(join(immutableRunRoot, ESTIMATE_LOGICAL_OUTPUTS["unit-proof"]))).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("executes the exact UNIT-010 all-local command and publishes only recursively bound PASS children", () => {
    const root = mkdtempSync(join(tmpdir(), "estimate-measurement-unit-010-"));
    try {
      const { manifestPath, runRoot, immutableRunRoot } = writeUnit010ProofRun(root);
      const result = runUnit010Envelope(root, manifestPath);
      expect(result.status, result.stderr).toBe(0);
      const envelopePath = join(immutableRunRoot, ESTIMATE_LOGICAL_OUTPUTS.integration);
      const envelope = JSON.parse(readFileSync(envelopePath, "utf8"));
      expect(envelope).toMatchObject({
        schema_version: INTEGRATION_SCHEMA,
        unit_id: "UNIT-010",
        integrationScope: "full-local",
        requiredPhases: ["off", "shadow", "on", "rollback"],
        sourceBuildMatch: "required",
        overall: "PASS",
      });
      expect(envelope.children.map((child: { role: string }) => child.role)).toEqual([
        "mode-proof",
        "browser-child",
        "d1-child",
        "dom-tests",
        "e2e-tests",
        "next-build",
        "opennext-build",
        "error-handling",
        "react-doctor",
        "typecheck",
      ]);
      for (const child of envelope.children as Array<{ immutablePath: string; sha256: string }>) {
        expect(child.sha256).toBe(sha256File(join(immutableRunRoot, child.immutablePath)));
        expect(Object.keys(child).sort()).toEqual(["immutablePath", "role", "schemaId", "sha256"].sort());
      }
      const activeValidation = assertEstimateSheetProofEnvelopeArtifact({
        runManifest: manifestPath,
        envelopePath,
        requireActivePointer: true,
        repoRoot: root,
        unit: "UNIT-010",
      });
      expect(activeValidation.children.map((child) => child.role)).toEqual(envelope.children.map((child: { role: string }) => child.role));
      unlinkSync(join(runRoot, "preview/active-preview.json"));
      const cleanedManifest = JSON.parse(readFileSync(manifestPath, "utf8"));
      delete cleanedManifest.activePreview;
      writeFileSync(manifestPath, `${JSON.stringify(cleanedManifest)}\n`, { mode: 0o600 });
      const postCleanupValidation = assertEstimateSheetProofEnvelopeArtifact({
        runManifest: manifestPath,
        envelopePath,
        repoRoot: root,
        unit: "UNIT-010",
      });
      expect(postCleanupValidation.envelopeSha256).toBe(sha256File(envelopePath));
      expect(envelope).not.toHaveProperty("cleanup");
      expect(envelope).not.toHaveProperty("browserReport");
      expect(envelope).not.toHaveProperty("d1Report");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it.each([
    {
      name: "missing child",
      mutate(_runRoot: string, immutableRunRoot: string) { unlinkSync(join(immutableRunRoot, ESTIMATE_LOGICAL_OUTPUTS["d1-child"])); },
      error: /d1-child|no such file/i,
    },
    {
      name: "malformed child",
      mutate(_runRoot: string, immutableRunRoot: string) { writeFileSync(join(immutableRunRoot, ESTIMATE_LOGICAL_OUTPUTS.typecheck), "{not-json\n", { mode: 0o600 }); },
      error: /not valid JSON/i,
    },
    {
      name: "stale cross-run child",
      mutate(_runRoot: string, immutableRunRoot: string) {
        const path = join(immutableRunRoot, ESTIMATE_LOGICAL_OUTPUTS["browser-child"]);
        const report = JSON.parse(readFileSync(path, "utf8"));
        report.runId = "different-run";
        writeFileSync(path, `${JSON.stringify(report)}\n`, { mode: 0o600 });
      },
      error: /browser child identity/i,
    },
    {
      name: "wrong final snapshot",
      mutate(_runRoot: string, immutableRunRoot: string) {
        const path = join(immutableRunRoot, ESTIMATE_LOGICAL_OUTPUTS["browser-child"]);
        const report = JSON.parse(readFileSync(path, "utf8"));
        report.finalSnapshot.modes.graph = "off";
        writeFileSync(path, `${JSON.stringify(report)}\n`, { mode: 0o600 });
      },
      error: /browser finalSnapshot does not match/i,
    },
    {
      name: "missing test mutation binding",
      mutate(_runRoot: string, immutableRunRoot: string) {
        const path = join(immutableRunRoot, ESTIMATE_LOGICAL_OUTPUTS["e2e-tests"]);
        const receipt = JSON.parse(readFileSync(path, "utf8"));
        delete receipt.fixtureMutation;
        writeFileSync(path, `${JSON.stringify(receipt)}\n`, { mode: 0o600 });
      },
      error: /does not bind the browser fixture mutation/i,
    },
    {
      name: "failed command child",
      mutate(_runRoot: string, immutableRunRoot: string) {
        const path = join(immutableRunRoot, ESTIMATE_LOGICAL_OUTPUTS["react-doctor"]);
        const receipt = JSON.parse(readFileSync(path, "utf8"));
        receipt.overall = "FAIL";
        receipt.exit_code = 1;
        receipt.diagnostic_counts.failures = 1;
        writeFileSync(path, `${JSON.stringify(receipt)}\n`, { mode: 0o600 });
      },
      error: /gate receipt react-doctor identity, command, or process outcome mismatch/i,
    },
    {
      name: "reused fixture namespace",
      mutate(runRoot: string, immutableRunRoot: string) {
        void immutableRunRoot;
        const path = join(runRoot, "run-manifest.json");
        const manifest = JSON.parse(readFileSync(path, "utf8"));
        manifest.namespaces.d1.idSha256 = manifest.namespaces.browser.idSha256;
        manifest.mutationJournal.find((entry: { fixtureRole: string }) => entry.fixtureRole === "d1").namespaceIdSha256 = manifest.namespaces.browser.idSha256;
        writeFileSync(path, `${JSON.stringify(manifest)}\n`, { mode: 0o600 });
      },
      error: /(?:immutable authority|namespace identifiers must be distinct)/i,
    },
  ])("fails closed on $name without publishing an envelope", ({ mutate, error }) => {
    const root = mkdtempSync(join(tmpdir(), "estimate-measurement-unit-010-invalid-"));
    try {
      const { manifestPath, runRoot, immutableRunRoot } = writeUnit010ProofRun(root);
      mutate(runRoot, immutableRunRoot);
      const result = runUnit010Envelope(root, manifestPath);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toMatch(error);
      expect(existsSync(join(immutableRunRoot, ESTIMATE_LOGICAL_OUTPUTS.integration))).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

function passingHardMetrics(): Record<string, { value: number; status: "PASS" | "FAIL" | "SKIPPED" }> {
  return Object.fromEntries(Object.entries(UNIT_001_HARD_METRICS).map(([metricId, spec]) => [
    metricId,
    { value: spec.comparison === "exact" ? spec.threshold : 0, status: "PASS" as const },
  ]));
}
