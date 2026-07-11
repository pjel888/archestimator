import { describe, expect, it } from "vitest";

import {
  ESTIMATE_LOGICAL_OUTPUTS,
  PERFORMANCE_REPORT_SCHEMA,
  FIXTURE_PROFILES,
  RUN_MANIFEST_SCHEMA,
  canonicalJson,
  resolveManifestLogicalOutput,
  sha256Hex,
  validatePerformanceReport,
  validateRunManifest,
} from "../../scripts/lib/estimate-sheet-performance-contract";
import { createTestReceipt } from "../../scripts/lib/estimate-sheet-performance-test-receipt";

const digest = sha256Hex("estimate-sheet-contract-fixture");
const inputShort = "0123456789ab";
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

function runPaths(unitId: string, runId: string) {
  const runKey = `${runId}-${digest.slice(0, 12)}-${inputShort}`;
  const repoRoot = "/tmp/estimate-sheet-contract-repo";
  return {
    runRoot: `${repoRoot}/.ai/99_scratch/estimate-sheet-performance/runs/${unitId}/${runKey}`,
    immutableRunRoot: `${repoRoot}/.ai/03_plans/2026-07-08/Project-Estimate-Sheet-Performance-Optimization/evidence/runtime/runs/${unitId}/${runKey}`,
    leaseRoot: `${repoRoot}/.ai/99_scratch/estimate-sheet-performance/leases`,
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
  return {
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
  };
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
    buildReceipt: `${runRoot}/receipts/command-opennext-build.json`,
    build_hash: digest,
    cleanupReceipt: `${runRoot}/cleanup-receipt.json`,
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
    cleanupReceipt: `${runRoot}/cleanup-receipt.json`,
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
    cleanupReceipt: `${runRoot}/cleanup-receipt.json`,
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

    const unsafeErrors = validateRunManifest(validArtifactManifest({
      immutable_run_root: "relative/evidence",
      logical_outputs: { ...ESTIMATE_LOGICAL_OUTPUTS, fixture: "../fixture.json", extra: "reports/extra.json" },
    }));
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
