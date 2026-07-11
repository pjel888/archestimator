import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  LOCAL_D1_CLEANUP_TABLE_ORDER,
  REQUIRED_LOCAL_D1_SURFACES,
  createLocalD1PerformanceReport,
  normalizeD1Sql,
  publishLocalD1Report,
  validateBetterAuthD1SchemaProof,
  validateCompleteLocalD1Measurement,
  validateLimitD1Fixture,
  validateLocalD1RunManifest,
  type LocalD1Measurement,
  type LocalD1StatementRecord,
} from "../../scripts/measure-estimate-sheet-d1";
import {
  ESTIMATE_LOGICAL_OUTPUTS,
  PREPARE_INPUT_SCHEMA,
  RUN_MANIFEST_SCHEMA,
  sha256Hex,
  sha256Json,
  type FingerprintContent,
  type RunManifestV1,
} from "../../scripts/lib/estimate-sheet-performance-contract";
import { buildEstimatePerformanceFixture } from "../fixtures/estimate-sheet-performance";

const digest = sha256Hex("estimate-sheet-local-d1-contract");
const fingerprint: FingerprintContent = {
  contract_version: "estimate-sheet-application-fingerprint.v1",
  path_count: 1,
  path_list_sha256: digest,
  content_sha256: digest,
};

function makeManifest(runRoot: string): RunManifestV1 {
  const runId = "00000000-0000-4000-8000-000000000003";
  const prepareInput = {
    schema_version: PREPARE_INPUT_SCHEMA,
    unit_id: "UNIT-003" as const,
    profile: "limit" as const,
    application_fingerprint: fingerprint,
    producer_fingerprint: fingerprint,
    fixture: { profile: "limit" as const, payload_sha256: digest, namespace_roles: ["d1"] },
    decision: null,
    predecessor: {
      unit_id: "UNIT-002" as const,
      run_id: "00000000-0000-4000-8000-000000000002",
      index_immutable_path: "evidence/runtime/runs/UNIT-002/predecessor-run-aaaaaaaaaaaa-bbbbbbbbbbbb/evidence-index.json",
      index_sha256: digest,
      evidence_immutable_path: "evidence/runtime/runs/UNIT-002/predecessor-run-aaaaaaaaaaaa-bbbbbbbbbbbb/reports/browser-baseline.json",
      evidence_sha256: digest,
      application_fingerprint: fingerprint,
      producer_fingerprint: fingerprint,
    },
    admission: null,
  };
  const prepareInputSha256 = sha256Json(prepareInput);
  const runKey = `${runId}-${digest.slice(0, 12)}-${prepareInputSha256.slice(0, 12)}`;
  const mutableRunRoot = join(runRoot, ".ai/99_scratch/estimate-sheet-performance/runs/UNIT-003", runKey);
  const immutableRunRoot = join(runRoot, ".ai/03_plans/2026-07-08/Project-Estimate-Sheet-Performance-Optimization/evidence/runtime/runs/UNIT-003", runKey);
  const namespace = {
    idSha256: sha256Hex("isolated-d1-namespace"),
    preStateSha256: digest,
  };
  return {
    schema_version: RUN_MANIFEST_SCHEMA,
    package_id: "PLAN-2026-07-08-project-estimate-sheet-performance",
    unit_id: "UNIT-003",
    run_id: runId,
    profile: "limit",
    evidence_class: "local-d1",
    cleanupRequirement: "REQUIRED",
    run_root: mutableRunRoot,
    immutable_run_root: immutableRunRoot,
    pointer_path: join(mutableRunRoot, "run-pointer.json"),
    logical_outputs: { ...ESTIMATE_LOGICAL_OUTPUTS },
    prepareInput,
    prepareInputSha256,
    created_at: "2026-07-11T00:00:00.000Z",
    status: "PREPARED",
    sourceFingerprint: {
      contract_version: "estimate-sheet-source-fingerprint.v2",
      head: "abcdef1234567",
      path_count: 1,
      path_list_sha256: digest,
      application: fingerprint,
      producer: fingerprint,
    },
    applicationFingerprint: fingerprint,
    producerFingerprint: fingerprint,
    namespaces: {
      d1: namespace,
    },
    fixture: { profile: "limit", namespaceIdSha256: namespace.idSha256, preStateSha256: namespace.preStateSha256 },
    fixture_hash: digest,
    auth_fixture_hash: digest,
    wranglerState: join(mutableRunRoot, "wrangler-state"),
    resources: {
      d1Binding: "ARCH_DB",
      wranglerState: join(mutableRunRoot, "wrangler-state"),
      localConfig: join(mutableRunRoot, "resources/d1/wrangler-local.json"),
      localConfigSha256: digest,
      generatedSchema: join(mutableRunRoot, "better-auth-schema.sql"),
      generatedSchemaSha256: digest,
      migrations: join(mutableRunRoot, "resources/d1/migrations.json"),
      migrationsSha256: digest,
      migrationHead: "0040_operational_incidents.sql",
      migrationCount: 40,
      seedSql: join(mutableRunRoot, "seed.sql"),
      seedSqlSha256: digest,
      cleanupSql: join(mutableRunRoot, "resources/d1/cleanup.sql"),
      cleanupSqlSha256: digest,
      cleanupStateSha256ByRole: { d1: digest },
      unitLease: join(runRoot, ".ai/99_scratch/estimate-sheet-performance/leases/units/UNIT-003"),
    },
    mutationJournal: [],
    previewProcesses: [],
  };
}

function statementForSurface(
  surface: (typeof REQUIRED_LOCAL_D1_SURFACES)[number],
  index: number,
): LocalD1StatementRecord {
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
    durationMs: expectedBindFailure ? null : index + 0.5,
    rowsRead: expectedBindFailure ? null : index + 1,
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

function makeTableCounts(kind: "seeded" | "zero"): Record<string, number> {
  return Object.fromEntries(LOCAL_D1_CLEANUP_TABLE_ORDER.map((table) => {
    if (kind === "zero") return [table, 0];
    if (table === "estimate_nodes") return [table, 1_500];
    if (table === "estimate_row_items") return [table, 5_000];
    return [table, 1];
  }));
}

function makeCompleteMeasurement(): LocalD1Measurement {
  const statements = REQUIRED_LOCAL_D1_SURFACES.map(statementForSurface);
  const seeded = makeTableCounts("seeded");
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
    migrationIdempotency: {
      firstPassApplied: 2,
      secondPassApplied: 0,
      ledgerCount: 2,
    },
    fixture: {
      profile: "limit",
      nodeCount: 1_500,
      rowCount: 5_000,
      componentMatchCount: 1_000,
      fixtureHash: sha256Hex("fixture"),
    },
    bindCeiling: {
      installed: 100,
      provider: 100,
      effective: 100,
      successAtCeiling: true,
      failureAboveCeiling: true,
      rowLoadBindCount: 1_501,
      rowLoadOutcome: "FAIL",
    },
    statements,
    queryCount: statements.length,
    bindCounts: statements.map((statement) => statement.bindCount),
    rowsRead: 120,
    rowsWritten: 1,
    queryPlans: statements.map((statement) => ({
      statementName: statement.statementName,
      details: statement.queryPlan,
      selectedIndex: statement.selectedIndex,
    })),
    cleanup: {
      statePath: "cleanup/d1-state.json",
      stateSha256: sha256Hex("cleanup-state"),
      exactTableOrder: [...LOCAL_D1_CLEANUP_TABLE_ORDER],
      auxiliaryAuthTableOrder: ["session", "user", "legal_terms_acceptances", "closed_beta_allowed_emails"],
      seeded,
      deleted: makeTableCounts("zero"),
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
    metrics: {
      "M-D1-ROUTE-CONTEXT-STATEMENTS": { value: 4, threshold: 4, comparison: "maximum", unit: "count", status: "PASS", source: "route-context" },
      "M-D1-TAB-TREE-STATEMENTS": { value: 3, threshold: 3, comparison: "maximum", unit: "count", status: "PASS", source: "selected-tab-tree" },
      "M-D1-ROW-UPDATE-STATEMENTS": { value: 3, threshold: 3, comparison: "maximum", unit: "count", status: "PASS", source: "row-update" },
      "M-D1-SUBTREE-DEPTH-SHAPE": { value: 3, threshold: 3, comparison: "exact", unit: "count", status: "PASS", source: "lazy-subtree" },
      "M-D1-BIND-CEILING": { value: 1_501, threshold: 100, comparison: "maximum", unit: "count", status: "FAIL", source: "limit-tree-row-load" },
      "M-D1-COST-PROJECTION-PCT": { value: 5, threshold: 50, comparison: "maximum", unit: "percent", status: "PASS", source: "cost-projection" },
      "M-MUTATE-SERVER-FANOUT-BUDGET": { value: 1_000, threshold: 1_000, comparison: "maximum", unit: "count", status: "PASS", source: "project-component-fanout" },
    },
    functionalScenarios: {
      "auth-denial-wrong-tenant": "PASS",
      "auth-denial-wrong-estimate": "PASS",
      "auth-denial-wrong-tab": "PASS",
      "auth-denial-wrong-node": "PASS",
    },
  };
}

describe("estimate-sheet local D1 performance contract", () => {
  it("normalizes SQL deterministically and validates the exact limit fixture", () => {
    const normalized = normalizeD1Sql(" SELECT\n  *   FROM rows\tWHERE id = ? ");
    expect(normalized).toBe("SELECT * FROM rows WHERE id=?");
    expect(normalizeD1Sql("SELECT * FROM rows WHERE id=?")).toBe(normalized);
    const fixture = buildEstimatePerformanceFixture("limit");
    expect(validateLimitD1Fixture(fixture)).toEqual([]);
    expect(fixture.expectedTotals).toMatchObject({
      nodeCount: 1_500,
      rowCount: 5_000,
      componentMatchCount: 1_000,
    });
  });

  it("fails closed on invalid generated schema and fixture inputs", () => {
    expect(validateBetterAuthD1SchemaProof({
      generated: true,
      staticReviewReady: true,
      statementCount: 7,
      sha256: "not-a-hash",
      sql: "",
      tableNames: ["user"],
    })).toEqual(expect.arrayContaining([
      "Better Auth schema must contain exactly 8 statements",
      "Better Auth schema hash is invalid",
      "Better Auth schema SQL is missing",
    ]));

    const fixture = structuredClone(buildEstimatePerformanceFixture("limit"));
    fixture.expectedTotals.nodeCount = 1_499;
    fixture.rows.pop();
    expect(validateLimitD1Fixture(fixture)).toEqual(expect.arrayContaining([
      "D1 fixture must contain exactly 1,500 nodes",
      "D1 fixture row array is incomplete",
    ]));
  });

  it("requires a prepared isolated local-D1 run and rejects browser resources", () => {
    const manifest = makeManifest(join(tmpdir(), "estimate-sheet-d1-manifest"));
    expect(validateLocalD1RunManifest(manifest)).toEqual([]);

    const missingNamespace = structuredClone(manifest);
    delete missingNamespace.namespaces.d1;
    expect(validateLocalD1RunManifest(missingNamespace).join("\n")).toMatch(
      /namespace roles must be exactly d1/,
    );

    const browserContaminated = { ...manifest, runtimeEnv: "/tmp/runtime.env" };
    expect(validateLocalD1RunManifest(browserContaminated).join("\n")).toMatch(
      /local-d1 manifest cannot contain runtimeEnv|pure local D1 runs cannot contain browser or preview resources/u,
    );
  });

  it("accepts complete records and detects incomplete statement, plan, and cleanup evidence", () => {
    const complete = makeCompleteMeasurement();
    expect(validateCompleteLocalD1Measurement(complete)).toEqual([]);

    const incomplete = structuredClone(complete);
    incomplete.statements = incomplete.statements.filter((record) => record.surface !== "node-move");
    incomplete.bindCounts.pop();
    incomplete.queryPlans[0]!.details = [];
    incomplete.cleanup.remaining.estimate_nodes = 1_499;
    expect(validateCompleteLocalD1Measurement(incomplete)).toEqual(expect.arrayContaining([
      "missing D1 surface: node-move",
      "pre-cleanup remaining counts must equal seeded counts",
    ]));
    expect(validateCompleteLocalD1Measurement(incomplete)).toContain("aggregate queryCount does not match statement records");
  });

  it("binds reports to the run and fingerprints and refuses artifact overwrite", () => {
    const root = mkdtempSync(join(tmpdir(), "estimate-sheet-local-d1-"));
    const manifest = makeManifest(root);
    const output = join(manifest.immutable_run_root!, "reports", "d1.json");
    mkdirSync(manifest.immutable_run_root!, { recursive: true });
    try {
      const report = createLocalD1PerformanceReport({
        manifest,
        measurement: makeCompleteMeasurement(),
        head: "abcdef1234567",
        generatedAt: "2026-07-11T00:01:00.000Z",
        fixtureHash: sha256Hex("fixture"),
        authFixtureHash: sha256Hex("auth-fixture"),
        toolHashes: { producer: sha256Hex("producer") },
      });
      expect(report).toMatchObject({
        evidenceClass: "local-d1",
        runId: manifest.run_id,
        buildHash: null,
        overall: "FAIL",
        failures: ["hard-metric-failed:M-D1-BIND-CEILING"],
      });

      publishLocalD1Report(output, report, manifest);
      expect(JSON.parse(readFileSync(output, "utf8"))).toMatchObject({
        runId: manifest.run_id,
        evidenceClass: "local-d1",
      });
      expect(() => publishLocalD1Report(output, report, manifest)).toThrow(/refusing to overwrite/);
      expect(() => publishLocalD1Report(
        join(root, "reports", "wrong-run.json"),
        { ...report, runId: "wrong-run" },
        manifest,
      )).toThrow(/run identity mismatch/);
      expect(() => publishLocalD1Report(
        join(root, "reports", "wrong-fingerprint.json"),
        {
          ...report,
          applicationFingerprint: { ...report.applicationFingerprint, content_sha256: sha256Hex("stale") },
        },
        manifest,
      )).toThrow(/fingerprint mismatch/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
