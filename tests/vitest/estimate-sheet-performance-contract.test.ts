import { linkSync, mkdtempSync, mkdirSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  ESTIMATE_LOGICAL_OUTPUTS,
  PERFORMANCE_REPORT_SCHEMA,
  PREPARE_INPUT_SCHEMA,
  FIXTURE_PROFILES,
  RUN_MANIFEST_SCHEMA,
  canonicalJson,
  readAuthoritativeRunManifest,
  resolveManifestLogicalOutput,
  resolveRunManifestPath,
  sha256Hex,
  sha256Json,
  validatePerformanceReport,
  validateRunManifest,
  type PrepareInputV1,
  type RunManifestV1,
} from "../../scripts/lib/estimate-sheet-performance-contract";
import { createTestReceipt } from "../../scripts/lib/estimate-sheet-performance-test-receipt";

const digest = sha256Hex("estimate-sheet-contract-fixture");
const fingerprint = {
  contract_version: "estimate-sheet-application-fingerprint.v1",
  path_count: 1,
  path_list_sha256: digest,
  content_sha256: digest,
};

function validReport(overrides: Record<string, unknown> = {}) {
  return {
    schema_version: PERFORMANCE_REPORT_SCHEMA,
    evidenceClass: "jsdom",
    trace: { packageId: "PLAN-2026-07-08-project-estimate-sheet-performance", unitId: "UNIT-001" },
    head: "abcdef1234567",
    applicationFingerprint: fingerprint,
    producerFingerprint: fingerprint,
    fixtureHash: digest,
    buildHash: null,
    authFixtureHash: digest,
    toolHashes: { evaluator: digest },
    runId: "run-contract-001",
    generatedAt: "2026-07-11T00:00:00.000Z",
    method: { warmups: 3, samples: 30, workerCount: 1, retries: 0, profile: "limit" },
    metrics: {
      editP95Ms: { status: "PASS", value: 1 },
      mountedRows: { status: "PASS", value: 20 },
    },
    overall: "PASS",
    buildMode: "not-applicable",
    ...overrides,
  };
}

function manifestFingerprint() {
  return {
    contract_version: "estimate-sheet-source-fingerprint.v2",
    head: "abcdef1234567",
    path_count: 1,
    path_list_sha256: digest,
    application: fingerprint,
    producer: fingerprint,
  };
}

function runPaths(unitId: string, runId: string, prepareInputSha256 = "0123456789abcdef".repeat(4)) {
  const runKey = `${runId}-${digest.slice(0, 12)}-${prepareInputSha256.slice(0, 12)}`;
  const repoRoot = "/tmp/estimate-sheet-contract-repo";
  return {
    runRoot: `${repoRoot}/.ai/99_scratch/estimate-sheet-performance/runs/${unitId}/${runKey}`,
    immutableRunRoot: `${repoRoot}/.ai/03_plans/2026-07-08/Project-Estimate-Sheet-Performance-Optimization/evidence/runtime/runs/${unitId}/${runKey}`,
    leaseRoot: `${repoRoot}/.ai/99_scratch/estimate-sheet-performance/leases`,
  };
}

function replaceRoot(value: unknown, from: string, to: string): unknown {
  if (typeof value === "string") return value.startsWith(from) ? `${to}${value.slice(from.length)}` : value;
  if (Array.isArray(value)) return value.map((entry) => replaceRoot(entry, from, to));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, replaceRoot(entry, from, to)]));
  }
  return value;
}

function prepareInputFor(manifest: Record<string, unknown>) {
  const admissionKind = typeof manifest.admissionKind === "string" ? manifest.admissionKind : null;
  const inputApplicationFingerprint = manifest.inputApplicationFingerprint ?? manifest.applicationFingerprint;
  const inputProducerFingerprint = manifest.inputProducerFingerprint ?? manifest.producerFingerprint;
  const predecessor = admissionKind === "refreeze"
    || admissionKind === "predecessor"
    || ["UNIT-002", "UNIT-003", "UNIT-004"].includes(String(manifest.unit_id))
    ? {
        unit_id: "UNIT-004",
        run_id: "predecessor-run",
        index_immutable_path: "evidence/runtime/runs/UNIT-004/predecessor/evidence-index.json",
        index_sha256: digest,
        evidence_immutable_path: "evidence/runtime/runs/UNIT-004/predecessor/reports/primary.json",
        evidence_sha256: digest,
        application_fingerprint: inputApplicationFingerprint,
        producer_fingerprint: inputProducerFingerprint,
      }
    : null;
  return {
    schema_version: PREPARE_INPUT_SCHEMA,
    unit_id: manifest.unit_id,
    profile: manifest.profile,
    application_fingerprint: manifest.applicationFingerprint,
    producer_fingerprint: manifest.producerFingerprint,
    fixture: typeof manifest.fixture_hash === "string"
      ? {
          profile: "limit",
          payload_sha256: manifest.fixture_hash,
          namespace_roles: Object.keys((manifest.namespaces ?? {}) as Record<string, unknown>),
        }
      : null,
    decision: admissionKind === "predecessor"
      ? { immutable_path: "evidence/runtime/runs/UNIT-004/predecessor/decision.json", sha256: digest }
      : null,
    predecessor,
    admission: admissionKind === null
      ? null
      : {
          kind: admissionKind,
          sha256: manifest.admissionSha256,
          input_application_fingerprint: inputApplicationFingerprint,
          input_producer_fingerprint: inputProducerFingerprint,
        },
  };
}

function finalizeManifest<T extends Record<string, unknown>>(draft: T): T {
  const prepareInput = draft.prepareInput ?? prepareInputFor(draft);
  const prepareInputSha256 = typeof draft.prepareInputSha256 === "string"
    ? draft.prepareInputSha256
    : sha256Json(prepareInput);
  const oldRunRoot = String(draft.run_root);
  const oldImmutableRunRoot = String(draft.immutable_run_root);
  const paths = runPaths(String(draft.unit_id), String(draft.run_id), prepareInputSha256);
  const withMutableRoot = replaceRoot(draft, oldRunRoot, paths.runRoot);
  const withBothRoots = replaceRoot(withMutableRoot, oldImmutableRunRoot, paths.immutableRunRoot) as T;
  return {
    ...withBothRoots,
    prepareInput,
    prepareInputSha256,
  };
}

function materializeAuthoritativeManifestPair(source = validArtifactManifest()) {
  const repoRoot = mkdtempSync(join(tmpdir(), "estimate-manifest-authority-"));
  const manifest = replaceRoot(source, "/tmp/estimate-sheet-contract-repo", repoRoot) as RunManifestV1;
  const mutablePath = join(manifest.run_root, "run-manifest.json");
  const immutablePath = join(manifest.immutable_run_root, "run-manifest.json");
  mkdirSync(manifest.run_root, { recursive: true });
  mkdirSync(manifest.immutable_run_root, { recursive: true });
  const bytes = `${JSON.stringify(manifest, null, 2)}\n`;
  writeFileSync(mutablePath, bytes);
  writeFileSync(immutablePath, bytes);
  const planRoot = join(
    repoRoot,
    ".ai/03_plans/2026-07-08/Project-Estimate-Sheet-Performance-Optimization",
  );
  mkdirSync(planRoot, { recursive: true });
  writeFileSync(join(planRoot, "plan-pack.json"), `${JSON.stringify({
    runtime_evidence: {
      latest_unit_id: manifest.unit_id,
      latest_run_id: manifest.run_id,
      latest_run_manifest_sha256: sha256Hex(bytes),
    },
  }, null, 2)}\n`);
  return {
    repoRoot,
    manifest,
    mutablePath,
    immutablePath,
    cleanup: () => rmSync(repoRoot, { recursive: true, force: true }),
  };
}

function localResources(
  runRoot: string,
  unitId: string,
  roles: readonly string[],
  port?: number,
) {
  return {
    d1Binding: "ARCH_DB",
    wranglerState: `${runRoot}/wrangler-state`,
    localConfig: `${runRoot}/resources/d1/wrangler-local.json`,
    localConfigSha256: digest,
    generatedSchema: `${runRoot}/better-auth-schema.sql`,
    generatedSchemaSha256: digest,
    migrations: `${runRoot}/resources/d1/migrations.json`,
    migrationsSha256: digest,
    migrationHead: "0040_operational_incidents.sql",
    migrationCount: 40,
    seedSql: `${runRoot}/seed.sql`,
    seedSqlSha256: digest,
    cleanupSql: `${runRoot}/resources/d1/cleanup.sql`,
    cleanupSqlSha256: digest,
    cleanupStateSha256ByRole: Object.fromEntries(roles.map((role) => [role, digest])),
    unitLease: `${runPaths(unitId, "unused").leaseRoot}/units/${unitId}`,
    ...(port === undefined ? {} : {
      portLease: `${runPaths(unitId, "unused").leaseRoot}/ports/${port}`,
    }),
  };
}

function validArtifactManifest(overrides: Record<string, unknown> = {}) {
  const runId = "00000000-0000-4000-8000-000000000001";
  const { runRoot, immutableRunRoot } = runPaths("UNIT-001", runId);
  return finalizeManifest({
    schema_version: RUN_MANIFEST_SCHEMA,
    package_id: "PLAN-2026-07-08-project-estimate-sheet-performance",
    unit_id: "UNIT-001",
    run_id: runId,
    profile: "artifact-only",
    evidence_class: "jsdom",
    cleanupRequirement: "NOT_APPLICABLE",
    run_root: runRoot,
    immutable_run_root: immutableRunRoot,
    pointer_path: `${runRoot}/run-pointer.json`,
    logical_outputs: { ...ESTIMATE_LOGICAL_OUTPUTS },
    created_at: "2026-07-11T00:00:00.000Z",
    status: "PREPARED",
    sourceFingerprint: manifestFingerprint(),
    applicationFingerprint: fingerprint,
    producerFingerprint: fingerprint,
    admissionKind: "planning",
    admissionPath: "dependencies/admission.json",
    admissionSha256: digest,
    inputApplicationFingerprint: fingerprint,
    inputProducerFingerprint: fingerprint,
    namespaces: {},
    mutationJournal: [],
    previewProcesses: [],
    ...overrides,
  });
}

function namespace(role: string) {
  return {
    idSha256: sha256Hex(`namespace-${role}`),
    preStateSha256: digest,
  };
}

function validLocalBrowserManifest(overrides: Record<string, unknown> = {}) {
  const runId = "00000000-0000-4000-8000-000000000005";
  const { runRoot, immutableRunRoot } = runPaths("UNIT-005", runId);
  const namespaces = { mode: namespace("mode"), browser: namespace("browser"), d1: namespace("d1") };
  return validArtifactManifest({
    unit_id: "UNIT-005",
    run_id: runId,
    profile: "limit",
    evidence_class: "local-browser",
    cleanupRequirement: "REQUIRED",
    run_root: runRoot,
    immutable_run_root: immutableRunRoot,
    pointer_path: `${runRoot}/run-pointer.json`,
    fixture: { profile: "limit", namespaceIdSha256: namespaces.mode.idSha256, preStateSha256: digest },
    namespaces,
    fixture_hash: digest,
    auth_fixture_hash: digest,
    wranglerState: `${runRoot}/wrangler-state`,
    resources: localResources(runRoot, "UNIT-005", Object.keys(namespaces), 3_105),
    leasedPort: 3_105,
    port: 3_105,
    runtimeEnv: `${runRoot}/runtime.env`,
    runtimeEnvSha256: digest,
    runtimeEnvStableSha256: digest,
    storageState: `${runRoot}/storage-state.json`,
    storageStateSha256: digest,
    storageStateExpiresAt: "2026-07-12T00:00:00.000Z",
    processJournal: `${runRoot}/preview/process-journal.json`,
    routePath: "/workshop/projects/project/estimates/estimate",
    route: {
      path: "/workshop/projects/project/estimates/estimate",
      projectId: "project",
      nodeId: "estimate",
      fixtureRole: "browser",
    },
    activatedModes: ["ESTIMATE_ROUTE_FAST_PATH_MODE"],
    buildReceipt: `${immutableRunRoot}/${ESTIMATE_LOGICAL_OUTPUTS["opennext-build"]}`,
    build_hash: digest,
    cleanupReceipt: `${immutableRunRoot}/${ESTIMATE_LOGICAL_OUTPUTS.cleanup}`,
    cleanupReceiptSha256: digest,
    admissionKind: "predecessor",
    ...overrides,
  });
}

function validLocalD1Manifest(overrides: Record<string, unknown> = {}) {
  const runId = "00000000-0000-4000-8000-000000000003";
  const { runRoot, immutableRunRoot } = runPaths("UNIT-003", runId);
  const d1 = namespace("d1");
  return validArtifactManifest({
    unit_id: "UNIT-003",
    run_id: runId,
    profile: "limit",
    evidence_class: "local-d1",
    cleanupRequirement: "REQUIRED",
    run_root: runRoot,
    immutable_run_root: immutableRunRoot,
    pointer_path: `${runRoot}/run-pointer.json`,
    fixture: { profile: "limit", namespaceIdSha256: d1.idSha256, preStateSha256: digest },
    namespaces: { d1 },
    fixture_hash: digest,
    auth_fixture_hash: digest,
    wranglerState: `${runRoot}/wrangler-state`,
    resources: localResources(runRoot, "UNIT-003", ["d1"]),
    cleanupReceipt: `${immutableRunRoot}/${ESTIMATE_LOGICAL_OUTPUTS.cleanup}`,
    cleanupReceiptSha256: digest,
    admissionKind: undefined,
    admissionPath: undefined,
    admissionSha256: undefined,
    inputApplicationFingerprint: undefined,
    inputProducerFingerprint: undefined,
    ...overrides,
  });
}

function validHostedManifest(overrides: Record<string, unknown> = {}) {
  const runId = "00000000-0000-4000-8000-000000000011";
  const { runRoot, immutableRunRoot } = runPaths("UNIT-011", runId);
  return validArtifactManifest({
    unit_id: "UNIT-011",
    run_id: runId,
    profile: "artifact-only",
    evidence_class: "hosted-d1",
    cleanupRequirement: "REQUIRED",
    run_root: runRoot,
    immutable_run_root: immutableRunRoot,
    pointer_path: `${runRoot}/run-pointer.json`,
    cleanupReceipt: `${immutableRunRoot}/${ESTIMATE_LOGICAL_OUTPUTS.cleanup}`,
    cleanupReceiptSha256: digest,
    admissionKind: "predecessor",
    ...overrides,
  });
}

function validUnit004Manifest(overrides: Record<string, unknown> = {}) {
  const runId = "00000000-0000-4000-8000-000000000004";
  const { runRoot, immutableRunRoot } = runPaths("UNIT-004", runId);
  return validArtifactManifest({
    unit_id: "UNIT-004",
    run_id: runId,
    run_root: runRoot,
    immutable_run_root: immutableRunRoot,
    pointer_path: `${runRoot}/run-pointer.json`,
    admissionKind: undefined,
    admissionPath: undefined,
    admissionSha256: undefined,
    inputApplicationFingerprint: undefined,
    inputProducerFingerprint: undefined,
    ...overrides,
  });
}

function validSupersessionManifest(overrides: Record<string, unknown> = {}) {
  const runId = "00000000-0000-4000-8000-000000000006";
  const { runRoot, immutableRunRoot } = runPaths("UNIT-006", runId);
  return validArtifactManifest({
    unit_id: "UNIT-006",
    run_id: runId,
    run_root: runRoot,
    immutable_run_root: immutableRunRoot,
    pointer_path: `${runRoot}/run-pointer.json`,
    admissionKind: "predecessor",
    ...overrides,
  });
}

describe("estimate-sheet performance report contract", () => {
  it("accepts the canonical jsdom report shape", async () => {
    const contract = await import("../../scripts/lib/estimate-sheet-performance-contract");
    expect(contract.validatePerformanceReport(validReport())).toEqual([]);
  });

  it("keeps the closed fixture profile row counts in sync with the generator", () => {
    expect(FIXTURE_PROFILES).toEqual({
      small: 50,
      medium: 500,
      large: 1_000,
      stress: 2_500,
      limit: 5_000,
      "over-limit": 5_001,
      "realistic-skew": 5_000,
    });
  });

  it("rejects a browser report that omits its build identity", async () => {
    const contract = await import("../../scripts/lib/estimate-sheet-performance-contract");
    const errors = contract.validatePerformanceReport({ ...validReport(), evidenceClass: "local-browser" });
    expect(errors).toContain("local-browser requires buildHash");
    expect(errors).toContain("local-browser browserScope invalid");
  });

  it("rejects empty metrics, hybrid evidence fields, and a wrong unit-bound browser scope", () => {
    const empty = validatePerformanceReport({ ...validReport(), metrics: {} }, { strict: true });
    expect(empty).toContain("metrics must not be empty");

    const hybrid = validatePerformanceReport({ ...validReport(), d1: { statements: 1 } }, { strict: true });
    expect(hybrid).toContain("jsdom forbids d1");

    const browser = validatePerformanceReport({
      ...validReport({
        evidenceClass: "local-browser",
        trace: { packageId: "PKG", unitId: "UNIT-008" },
        buildHash: digest,
        buildMode: "opennext-preview",
        browserScope: "route",
        browser: { name: "chromium" },
        device: { viewport: "1440x900" },
        environment: { workers: 1 },
        modeSnapshot: { routeContext: "off" },
        finalSnapshot: { routeContext: "off" },
      }),
    }, { strict: true });
    expect(browser).toContain("local-browser browserScope for UNIT-008 must be render-a11y");
  });

  it("requires class-specific D1 provenance in strict reports", () => {
    const local = validatePerformanceReport({
      ...validReport({ evidenceClass: "local-d1", trace: { packageId: "PKG", unitId: "UNIT-003" } }),
    }, { strict: true });
    expect(local).toContain("local-d1 d1 must be a non-empty object");

    const hosted = validatePerformanceReport({
      ...validReport({ evidenceClass: "hosted-d1", trace: { packageId: "PKG", unitId: "UNIT-011" } }),
    }, { strict: true });
    expect(hosted).toEqual(expect.arrayContaining([
      "hosted-d1 d1 must be a non-empty object",
      "hosted-d1 provider must be a non-empty object",
      "hosted-d1 deployment must be a non-empty object",
      "hosted-d1 cleanup must be a non-empty object",
    ]));
  });

  it("rejects unsupported metric values and incomplete skipped metrics", async () => {
    const contract = await import("../../scripts/lib/estimate-sheet-performance-contract");
    const errors = contract.validatePerformanceReport({
      ...validReport(),
      metrics: {
        infinite: { status: "PASS", value: Number.POSITIVE_INFINITY },
        skipped: { status: "SKIPPED" },
      },
    });
    expect(errors).toContain("metrics.infinite.value non-finite");
    expect(errors).toContain("metrics.skipped skipped metric requires reason and residualRisk");
  });

  it("rejects unknown fields in strict mode while allowing declared extension fields", async () => {
    const contract = await import("../../scripts/lib/estimate-sheet-performance-contract");
    expect(contract.validatePerformanceReport({ ...validReport(), rawSamples: [] }, { strict: true })).toEqual([]);
    expect(contract.validatePerformanceReport({ ...validReport(), madeUp: true }, { strict: true })).toContain(
      "unknown report field: madeUp",
    );
  });

  it("canonicalizes object keys without changing array order", () => {
    expect(canonicalJson({ b: 2, a: { z: 3, y: 4 }, list: [{ d: 1, c: 2 }] })).toBe(
      '{"a":{"y":4,"z":3},"b":2,"list":[{"c":2,"d":1}]}',
    );
  });

  it("creates a receipt with equal pre/post fingerprints and redacted failure identifiers", async () => {
    const receipt = createTestReceipt({
      testClass: "vitest",
      argv: ["bun", "run", "test:dom"],
      files: ["tests/vitest/estimate-sheet-performance-contract.test.ts"],
      unitId: "UNIT-001",
      runId: "run-contract-001",
      applicationFingerprint: fingerprint,
      producerFingerprint: fingerprint,
      passed: 3,
      failed: 1,
      skipped: 0,
      durationMs: 4,
      failureIds: ["route failed token=super-secret", "route failed token=super-secret"],
    });
    expect(receipt.schema_version).toBe("estimate-sheet-test-receipt.v1");
    expect(receipt.workers).toBe(1);
    expect(receipt.retries).toBe(0);
    expect(receipt.overall).toBe("FAIL");
    expect(receipt.failure_ids).toHaveLength(1);
    expect(receipt.failure_ids[0]).not.toContain("super-secret");
    expect(receipt.failure_ids[0]).toContain("<redacted>");
    const contract = await import("../../scripts/lib/estimate-sheet-performance-contract");
    expect(contract.validateTestReceipt(receipt)).toEqual([]);
  });

  it("rejects receipt construction that changes fingerprints or uses retries", () => {
    expect(() => createTestReceipt({
      testClass: "vitest",
      argv: ["bun"],
      files: ["tests/vitest/example.test.ts"],
      unitId: "UNIT-001",
      runId: "run-contract-002",
      applicationFingerprint: fingerprint,
      producerFingerprint: fingerprint,
      preProducerFingerprint: { ...fingerprint, content_sha256: sha256Hex("different") },
      retries: 1,
    })).toThrow(/fingerprint changed|zero retries/);
  });
});

describe("estimate-sheet run manifest contract", () => {
  it("denies a self-consistent mutable redirect even when a forged mirror exists", () => {
    const fixture = materializeAuthoritativeManifestPair();
    try {
      const runKey = fixture.manifest.run_root.split("/").at(-1)!;
      const forgedRoot = join(
        fixture.repoRoot,
        "forged/evidence/runtime/runs",
        fixture.manifest.unit_id,
        runKey,
      );
      const redirected = { ...fixture.manifest, immutable_run_root: forgedRoot };
      mkdirSync(forgedRoot, { recursive: true });
      const redirectedBytes = `${JSON.stringify(redirected, null, 2)}\n`;
      writeFileSync(fixture.mutablePath, redirectedBytes);
      writeFileSync(join(forgedRoot, "run-manifest.json"), redirectedBytes);

      expect(() => readAuthoritativeRunManifest(
        fixture.repoRoot,
        fixture.mutablePath,
        "UNIT-001",
      )).toThrow(/immutable root is not canonical/u);
      expect(() => resolveRunManifestPath(
        fixture.repoRoot,
        "UNIT-001",
        fixture.mutablePath,
      )).toThrow(/immutable root is not canonical/u);
    } finally {
      fixture.cleanup();
    }
  });

  it("denies mutable identity tamper against the immutable authority", () => {
    const fixture = materializeAuthoritativeManifestPair();
    try {
      writeFileSync(fixture.mutablePath, `${JSON.stringify({
        ...fixture.manifest,
        created_at: "2026-07-11T00:00:01.000Z",
      }, null, 2)}\n`);

      expect(() => readAuthoritativeRunManifest(
        fixture.repoRoot,
        fixture.mutablePath,
        "UNIT-001",
      )).toThrow(/identity differs from its immutable authority/u);
    } finally {
      fixture.cleanup();
    }
  });

  it("denies self-consistent mutable and immutable tamper against the committed plan anchor", () => {
    const fixture = materializeAuthoritativeManifestPair();
    try {
      const tampered = `${JSON.stringify({
        ...fixture.manifest,
        created_at: "2026-07-11T00:00:01.000Z",
      }, null, 2)}\n`;
      writeFileSync(fixture.mutablePath, tampered);
      writeFileSync(fixture.immutablePath, tampered);

      expect(() => readAuthoritativeRunManifest(
        fixture.repoRoot,
        fixture.mutablePath,
        "UNIT-001",
      )).toThrow(/committed run manifest anchor mismatch/u);
    } finally {
      fixture.cleanup();
    }
  });

  it("denies a current committed run whose plan state omits the manifest anchor", () => {
    const fixture = materializeAuthoritativeManifestPair();
    try {
      const planPath = join(
        fixture.repoRoot,
        ".ai/03_plans/2026-07-08/Project-Estimate-Sheet-Performance-Optimization/plan-pack.json",
      );
      writeFileSync(planPath, `${JSON.stringify({
        runtime_evidence: {
          latest_unit_id: fixture.manifest.unit_id,
          latest_run_id: fixture.manifest.run_id,
        },
      }, null, 2)}\n`);
      expect(() => readAuthoritativeRunManifest(
        fixture.repoRoot,
        fixture.mutablePath,
        "UNIT-001",
      )).toThrow(/committed run manifest anchor is missing/u);
    } finally {
      fixture.cleanup();
    }
  });

  it("denies stable runtime environment identity tamper against the immutable authority", () => {
    const fixture = materializeAuthoritativeManifestPair(validLocalBrowserManifest());
    try {
      writeFileSync(fixture.mutablePath, `${JSON.stringify({
        ...fixture.manifest,
        runtimeEnvStableSha256: sha256Hex("redirected-runtime-environment"),
      }, null, 2)}\n`);

      expect(() => readAuthoritativeRunManifest(
        fixture.repoRoot,
        fixture.mutablePath,
        "UNIT-005",
      )).toThrow(/identity differs from its immutable authority/u);
    } finally {
      fixture.cleanup();
    }
  });

  it("denies canonical-looking manifests reached through a controlled symlink alias", () => {
    const source = validArtifactManifest();
    const repoRoot = mkdtempSync(join(tmpdir(), "estimate-manifest-symlink-"));
    try {
      const manifest = replaceRoot(source, "/tmp/estimate-sheet-contract-repo", repoRoot) as RunManifestV1;
      const runKey = manifest.run_root.split("/").at(-1)!;
      const realRunRoot = join(repoRoot, "real-runs", runKey);
      const canonicalUnitRoot = join(
        repoRoot,
        ".ai/99_scratch/estimate-sheet-performance/runs",
        manifest.unit_id,
      );
      mkdirSync(realRunRoot, { recursive: true });
      mkdirSync(canonicalUnitRoot, { recursive: true });
      symlinkSync(realRunRoot, join(canonicalUnitRoot, runKey), "dir");
      mkdirSync(manifest.immutable_run_root, { recursive: true });
      const bytes = `${JSON.stringify(manifest, null, 2)}\n`;
      writeFileSync(join(realRunRoot, "run-manifest.json"), bytes);
      writeFileSync(join(manifest.immutable_run_root, "run-manifest.json"), bytes);

      expect(() => readAuthoritativeRunManifest(
        repoRoot,
        join(canonicalUnitRoot, runKey, "run-manifest.json"),
        "UNIT-001",
      )).toThrow(/symbolic-link alias/u);
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it("denies mutable and immutable manifests joined by a hard link", () => {
    const fixture = materializeAuthoritativeManifestPair();
    try {
      unlinkSync(fixture.immutablePath);
      linkSync(fixture.mutablePath, fixture.immutablePath);

      expect(() => readAuthoritativeRunManifest(
        fixture.repoRoot,
        fixture.mutablePath,
        "UNIT-001",
      )).toThrow(/exactly one filesystem link/u);
    } finally {
      fixture.cleanup();
    }
  });

  it("ignores unrelated legacy run directories during committed-run discovery", () => {
    const fixture = materializeAuthoritativeManifestPair();
    try {
      const planRoot = join(
        fixture.repoRoot,
        ".ai/03_plans/2026-07-08/Project-Estimate-Sheet-Performance-Optimization",
      );
      mkdirSync(planRoot, { recursive: true });
      writeFileSync(join(planRoot, "plan-pack.json"), `${JSON.stringify({
        runtime_evidence: {
          latest_unit_id: fixture.manifest.unit_id,
          latest_run_id: fixture.manifest.run_id,
          latest_run_manifest_sha256: sha256Hex(`${JSON.stringify(fixture.manifest, null, 2)}\n`),
        },
      }, null, 2)}\n`);
      const legacyRoot = join(
        fixture.repoRoot,
        ".ai/99_scratch/estimate-sheet-performance/runs/UNIT-001/legacy-uncommitted-run",
      );
      mkdirSync(legacyRoot, { recursive: true });
      writeFileSync(join(legacyRoot, "run-manifest.json"), "not-json\n");

      expect(resolveRunManifestPath(fixture.repoRoot, "UNIT-001")).toBe(fixture.mutablePath);
    } finally {
      fixture.cleanup();
    }
  });

  it("allows mutable producer fields that do not change immutable identity", () => {
    const fixture = materializeAuthoritativeManifestPair(validLocalBrowserManifest());
    try {
      const mutable = structuredClone(fixture.manifest);
      mutable.runtimeEnvSha256 = sha256Hex("rotated-mode-runtime-environment");
      mutable.namespaces.mode = {
        ...mutable.namespaces.mode!,
        postStateSha256: digest,
        commandId: "mode-command",
      };
      mutable.mutationJournal = [{ commandId: "mode-command" }];
      mutable.previewProcesses = [{ pid: 1234, readiness: "READY" }];
      writeFileSync(fixture.mutablePath, `${JSON.stringify(mutable, null, 2)}\n`);

      expect(readAuthoritativeRunManifest(
        fixture.repoRoot,
        fixture.mutablePath,
        "UNIT-005",
      )).toMatchObject({
        status: "PREPARED",
        namespaces: { mode: { commandId: "mode-command" } },
      });
    } finally {
      fixture.cleanup();
    }
  });

  it("denies run status mutation at the authoritative prepared-run boundary", () => {
    const fixture = materializeAuthoritativeManifestPair(validLocalBrowserManifest());
    try {
      writeFileSync(fixture.mutablePath, `${JSON.stringify({
        ...fixture.manifest,
        status: "MEASURING",
      }, null, 2)}\n`);
      expect(() => readAuthoritativeRunManifest(
        fixture.repoRoot,
        fixture.mutablePath,
        "UNIT-005",
      )).toThrow(/status|immutable authority/u);
    } finally {
      fixture.cleanup();
    }
  });

  it("accepts a closed artifact-only NOT_APPLICABLE manifest", () => {
    expect(validateRunManifest(validArtifactManifest())).toEqual([]);
    expect(validateRunManifest(validUnit004Manifest())).toEqual([]);
    expect(validateRunManifest(validSupersessionManifest())).toEqual([]);
  });

  it("requires unit-specific admission lineage for NOT_APPLICABLE runs", () => {
    const missingSupersession = validateRunManifest(validSupersessionManifest({
      admissionKind: undefined,
      admissionPath: undefined,
      admissionSha256: undefined,
      inputApplicationFingerprint: undefined,
      inputProducerFingerprint: undefined,
    }));
    expect(missingSupersession).toEqual(expect.arrayContaining([
      "supersession NOT_APPLICABLE manifest requires predecessor admission lineage",
      "supersession NOT_APPLICABLE manifest requires unchanged input/output fingerprints",
    ]));

    const changedSupersession = validateRunManifest(validSupersessionManifest({
      inputProducerFingerprint: { ...fingerprint, content_sha256: sha256Hex("changed-producer") },
    }));
    expect(changedSupersession).toContain(
      "supersession NOT_APPLICABLE manifest requires unchanged input/output fingerprints",
    );

    expect(validateRunManifest(validArtifactManifest({ admissionKind: "predecessor" }))).toContain(
      "UNIT-001 NOT_APPLICABLE manifest requires planning or refreeze admission lineage",
    );
    expect(validateRunManifest(validUnit004Manifest({
      admissionKind: "predecessor",
      admissionPath: "dependencies/admission.json",
      admissionSha256: digest,
      inputApplicationFingerprint: fingerprint,
      inputProducerFingerprint: fingerprint,
    }))).toContain("UNIT-004 NOT_APPLICABLE manifest cannot contain admission lineage");
  });

  it("rejects NOT_APPLICABLE profile, unit, side-effect, and unknown-field drift", () => {
    const errors = validateRunManifest(validArtifactManifest({
      unit_id: "UNIT-011",
      profile: "limit",
      evidence_class: "hosted-d1",
      namespaces: { mode: namespace("mode") },
      mutationJournal: [{}],
      previewProcesses: [{}],
      runtimeEnv: "/tmp/estimate-sheet-runs/runtime.env",
      cleanupReceipt: "/tmp/estimate-sheet-runs/cleanup-receipt.json",
      cleanupReceiptSha256: digest,
      madeUpResource: true,
    }));
    expect(errors).toEqual(expect.arrayContaining([
      "NOT_APPLICABLE manifest profile must be artifact-only",
      "NOT_APPLICABLE manifest unit is not allowed",
      "NOT_APPLICABLE manifest evidence_class must be jsdom",
      "namespace roles must be exactly empty",
      "NOT_APPLICABLE manifest cannot launch preview processes",
      "NOT_APPLICABLE manifest cannot contain mutations",
      "NOT_APPLICABLE manifest cannot contain runtimeEnv",
      "NOT_APPLICABLE manifest cannot contain cleanupReceipt",
      "unknown run manifest field: madeUpResource",
    ]));
  });

  it("requires the complete canonical logical-output map under an absolute immutable root", () => {
    const missingRole = { ...ESTIMATE_LOGICAL_OUTPUTS } as Record<string, string>;
    delete missingRole.hosted;
    const missingErrors = validateRunManifest(validArtifactManifest({ logical_outputs: missingRole }));
    expect(missingErrors).toContain("logical_outputs role set is not exact");

    const unsafeManifest = validArtifactManifest();
    const unsafeErrors = validateRunManifest({
      ...unsafeManifest,
      immutable_run_root: "relative/evidence",
      logical_outputs: { ...ESTIMATE_LOGICAL_OUTPUTS, fixture: "../fixture.json", extra: "reports/extra.json" },
    });
    expect(unsafeErrors).toEqual(expect.arrayContaining([
      "immutable_run_root must be absolute",
      "logical_outputs role set is not exact",
      "logical_outputs.fixture is not canonical",
      "logical_outputs.fixture must be a safe relative path",
    ]));
  });

  it("binds mutable and immutable roots to one unit/run/application/input key", () => {
    const manifest = validArtifactManifest() as Record<string, unknown>;
    const immutableRoot = String(manifest.immutable_run_root);
    const wrongUnit = validateRunManifest({
      ...manifest,
      immutable_run_root: immutableRoot.replace("/UNIT-001/", "/UNIT-004/"),
    });
    expect(wrongUnit).toContain("immutable_run_root unit segment must match unit_id");

    const wrongApplication = validateRunManifest({
      ...manifest,
      immutable_run_root: immutableRoot.replace(digest.slice(0, 12), "aaaaaaaaaaaa"),
    });
    expect(wrongApplication).toContain(
      "immutable_run_root run key must bind run_id, application fingerprint, and prepare input digest",
    );

    const scratchImmutable = validateRunManifest({
      ...manifest,
      immutable_run_root: String(manifest.run_root),
    });
    expect(scratchImmutable).toEqual(expect.arrayContaining([
      "immutable_run_root must be a chain-durable evidence/runtime/runs unit path",
      "immutable_run_root must be separate from mutable run_root",
    ]));
  });

  it("rejects mutation or schema drift in every allocation-bound prepare input", () => {
    const base = validLocalBrowserManifest();
    const mutations: Array<(input: PrepareInputV1) => void> = [
      (input) => { input.unit_id = "UNIT-004"; },
      (input) => { input.profile = "artifact-only"; },
      (input) => { input.application_fingerprint.content_sha256 = sha256Hex("mutated-application"); },
      (input) => { input.producer_fingerprint.content_sha256 = sha256Hex("mutated-producer"); },
      (input) => { if (input.fixture) input.fixture.payload_sha256 = sha256Hex("mutated-fixture"); },
      (input) => { if (input.decision) input.decision.sha256 = sha256Hex("mutated-decision"); },
      (input) => { if (input.predecessor) input.predecessor.index_sha256 = sha256Hex("mutated-predecessor"); },
      (input) => { if (input.admission) input.admission.sha256 = sha256Hex("mutated-admission"); },
    ];
    for (const mutate of mutations) {
      const candidate = structuredClone(base) as typeof base & { prepareInput: PrepareInputV1 };
      mutate(candidate.prepareInput);
      expect(validateRunManifest(candidate)).toContain("prepareInputSha256 does not match canonical prepareInput");
    }

    const unknownField = structuredClone(base) as typeof base & {
      prepareInput: PrepareInputV1 & { unknown_field?: boolean };
    };
    unknownField.prepareInput.unknown_field = true;
    expect(validateRunManifest(unknownField)).toContain("prepareInput field set is not exact");

    const missingField = structuredClone(base) as typeof base & { prepareInput: Partial<PrepareInputV1> };
    delete missingField.prepareInput.producer_fingerprint;
    expect(validateRunManifest(missingField)).toContain("prepareInput field set is not exact");
  });

  it("resolves canonical logical outputs from the immutable manifest root", () => {
    const manifest = validArtifactManifest();
    expect(resolveManifestLogicalOutput(manifest, "jsdom")).toBe(
      `${manifest.immutable_run_root}/${ESTIMATE_LOGICAL_OUTPUTS.jsdom}`,
    );
    expect(() => resolveManifestLogicalOutput(
      { ...manifest, logical_outputs: { ...manifest.logical_outputs, jsdom: "../mutable.json" } },
      "jsdom",
    )).toThrow(/logical_outputs\.jsdom/u);
    expect(() => resolveManifestLogicalOutput(manifest, "unknown" as never)).toThrow(/unknown.*role/iu);
  });

  it("accepts exact local-browser namespaces plus build and cleanup lifecycle bindings", () => {
    expect(validateRunManifest(validLocalBrowserManifest())).toEqual([]);
  });

  it("rejects missing, unknown, cross-role, or malformed local resource fields", () => {
    const browser = validLocalBrowserManifest();
    const browserResources = structuredClone(browser.resources) as Record<string, unknown>;
    delete browserResources.generatedSchemaSha256;
    browserResources.unknownNested = true;
    browserResources.cleanupStateSha256ByRole = {
      ...(browserResources.cleanupStateSha256ByRole as Record<string, string>),
      undeclared: digest,
    };
    browserResources.portLease = "/tmp/wrong-port-lease";
    const browserErrors = validateRunManifest({ ...browser, resources: browserResources });
    expect(browserErrors).toEqual(expect.arrayContaining([
      "local resources.generatedSchemaSha256 is required",
      "resources.generatedSchemaSha256 invalid",
      "unknown local resource field: unknownNested",
      "resources.cleanupStateSha256ByRole roles must be exactly mode,browser,d1",
      "unknown resources.cleanupStateSha256ByRole field: undeclared",
      "resources.portLease does not match the leased port",
    ]));

    const d1 = validLocalD1Manifest();
    const d1Errors = validateRunManifest({
      ...d1,
      resources: {
        ...d1.resources,
        d1Binding: "OTHER_DB",
        generatedSchema: `${d1.run_root}/resources/d1/better-auth-schema.sql`,
        seedSql: `${d1.run_root}/resources/d1/seed.sql`,
        migrationHead: "latest",
        migrationCount: 0,
        portLease: `${runPaths("UNIT-003", "unused").leaseRoot}/ports/3103`,
      },
    });
    expect(d1Errors).toEqual(expect.arrayContaining([
      "unknown local resource field: portLease",
      "local resources.d1Binding must be ARCH_DB",
      "resources.generatedSchema must be run_root/better-auth-schema.sql",
      "resources.seedSql must be run_root/seed.sql",
      "resources.migrationHead invalid",
      "resources.migrationCount invalid",
    ]));
  });

  it("rejects local-browser unit/profile namespace drift and incomplete lifecycle pairs", () => {
    const manifest = validLocalBrowserManifest({
      unit_id: "UNIT-003",
      profile: "artifact-only",
      namespaces: { browser: namespace("browser") },
    }) as Record<string, unknown>;
    delete manifest.build_hash;
    delete manifest.cleanupReceiptSha256;
    const errors = validateRunManifest(manifest);
    expect(errors).toEqual(expect.arrayContaining([
      "local-browser manifest unit is not allowed",
      "local-browser manifest profile must be limit",
      "namespace roles must be exactly empty",
      "buildReceipt/build_hash must be present together",
      "cleanupReceipt/cleanupReceiptSha256 must be present together",
    ]));
  });

  it("accepts UNIT-003 local D1 and rejects browser resource or namespace crossover", () => {
    expect(validateRunManifest(validLocalD1Manifest())).toEqual([]);
    const errors = validateRunManifest(validLocalD1Manifest({
      unit_id: "UNIT-005",
      namespaces: { browser: namespace("browser") },
      runtimeEnv: "/tmp/estimate-sheet-runs/UNIT-003/run-contract-003/runtime.env",
      runtimeEnvSha256: digest,
      port: 31_003,
      leasedPort: 31_003,
    }));
    expect(errors).toEqual(expect.arrayContaining([
      "local-d1 manifest unit must be UNIT-003",
      "namespace roles must be exactly d1",
      "local-d1 manifest cannot contain runtimeEnv",
      "local-d1 manifest cannot contain port",
    ]));
  });

  it("accepts UNIT-011 hosted cleanup bindings and rejects local profile resources", () => {
    expect(validateRunManifest(validHostedManifest())).toEqual([]);
    const errors = validateRunManifest(validHostedManifest({
      profile: "limit",
      namespaces: { d1: namespace("d1") },
      fixture: { profile: "limit", namespaceIdSha256: digest, preStateSha256: digest },
      fixture_hash: digest,
      auth_fixture_hash: digest,
      resources: { local: true },
      runtimeEnv: "/tmp/estimate-sheet-runs/UNIT-011/run-contract-011/runtime.env",
    }));
    expect(errors).toEqual(expect.arrayContaining([
      "hosted-d1 manifest profile must be artifact-only",
      "namespace roles must be exactly empty",
      "hosted-d1 manifest cannot contain fixture",
      "hosted-d1 manifest cannot contain resources",
      "hosted-d1 manifest cannot contain runtimeEnv",
    ]));
  });
});
