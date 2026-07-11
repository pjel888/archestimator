import {
  chmodSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

import type { FullConfig, FullResult, Suite, TestCase, TestResult } from "@playwright/test/reporter";
import { afterEach, describe, expect, it, vi } from "vitest";

import { EstimateSheetPerformanceReporter } from "../../e2e/helpers/estimate-sheet-performance-reporter";
import { readTestReceipt } from "../../scripts/lib/estimate-sheet-performance-test-receipt";
import {
  ESTIMATE_LOGICAL_OUTPUTS,
  PREPARE_INPUT_SCHEMA,
  assertPerformanceReport,
  canonicalJson,
  defaultImmutableRunRoot,
  defaultRunRoot,
  readJsonFile,
  sha256File,
  sha256Hex,
  sha256Json,
  type PerformanceReportV1,
} from "../../scripts/lib/estimate-sheet-performance-contract";

const repoRoot = process.cwd();
const originalCwd = process.cwd();
const originalArgv = [...process.argv];
const roots: string[] = [];
const buildHash = sha256Hex("playwright-reporter-build");
const fixtureHash = sha256Hex("playwright-reporter-fixture");
const fingerprint = {
  contract_version: "estimate-sheet-application-fingerprint.v1",
  path_count: 1,
  path_list_sha256: sha256Hex("playwright-reporter-paths"),
  content_sha256: sha256Hex("playwright-reporter-content"),
};
const baselineTitles = [
  "captures a cold route and sheet-ready baseline",
  "captures a warm route baseline without arbitrary sleeps",
  "records mounted-row and mounted-branch census for the active window",
] as const;
const interopScenarios = [
  ["CI-QA-01", "01-duplicate-name-create"],
  ["CI-QA-02", "02-insert-library-row"],
  ["CI-QA-03", "03-edit-library-row-linkstate"],
  ["CI-QA-04", "04-inline-variant-pill-library"],
  ["CI-QA-05", "05-edit-thumbnail-library-row"],
  ["CI-QA-05b", "05b-edit-component-drawer-library-master"],
  ["CI-QA-05c", "05c-detach-library-row"],
  ["CI-QA-06", "06-edit-project-component-fanout"],
  ["CI-QA-07", "07-identical-name-project"],
  ["CI-QA-08", "08-thumbnail-fanout-project"],
  ["CI-QA-09", "09-variant-persistence-project"],
  ["CI-QA-10", "10-inline-variant-pill-project"],
  ["CI-QA-11", "11-image-url-normalization"],
  ["CI-QA-12", "12-blank-row-express-init"],
  ["CI-QA-13", "13-promote-to-library"],
  ["CI-QA-14", "14-stress-fanout-5000-rows"],
  ["CI-QA-15", "15-stress-modal-open"],
  ["CI-QA-16", "16-stress-inline-edit"],
  ["CI-QA-17", "17-delete-row-restore"],
] as const;

type PreparedRun = ReturnType<typeof createRun>;

function writePrivateJson(path: string, value: unknown): void {
  mkdirSync(join(path, ".."), { recursive: true, mode: 0o700 });
  writeFileSync(path, `${canonicalJson(value)}\n`, { mode: 0o600 });
  chmodSync(path, 0o600);
}

function createRun(input: {
  unitId?: "UNIT-002" | "UNIT-010";
  runId?: string;
  manifestOverrides?: Record<string, unknown>;
  activeOverrides?: Record<string, unknown>;
} = {}) {
  const testRepoRoot = join(originalCwd, ".ai/99_scratch/estimate-sheet-performance/reporter-test-repos");
  mkdirSync(testRepoRoot, { recursive: true, mode: 0o700 });
  const root = mkdtempSync(join(testRepoRoot, "repo-"));
  roots.push(root);
  const unitId = input.unitId ?? "UNIT-010";
  const runId = input.runId ?? "run-playwright-reporter-001";
  const namespaceRoleNames = unitId === "UNIT-002" ? ["browser"] : ["mode", "browser", "d1"];
  const prepareInput = {
    schema_version: PREPARE_INPUT_SCHEMA,
    unit_id: unitId,
    profile: "limit" as const,
    application_fingerprint: fingerprint,
    producer_fingerprint: fingerprint,
    fixture: { profile: "limit" as const, payload_sha256: fixtureHash, namespace_roles: namespaceRoleNames },
    decision: null,
    predecessor: unitId === "UNIT-002" ? {
      unit_id: "UNIT-001" as const,
      run_id: "00000000-0000-4000-8000-000000000001",
      index_immutable_path: "evidence/runtime/runs/UNIT-001/predecessor-run-aaaaaaaaaaaa-bbbbbbbbbbbb/evidence-index.json",
      index_sha256: fixtureHash,
      evidence_immutable_path: "evidence/runtime/runs/UNIT-001/predecessor-run-aaaaaaaaaaaa-bbbbbbbbbbbb/reports/jsdom-baseline.json",
      evidence_sha256: fixtureHash,
      application_fingerprint: fingerprint,
      producer_fingerprint: fingerprint,
    } : null,
    admission: null,
  };
  const prepareInputSha256 = sha256Json(prepareInput);
  const runKey = `${runId}-${fingerprint.content_sha256.slice(0, 12)}-${prepareInputSha256.slice(0, 12)}`;
  const runRoot = join(defaultRunRoot(root), unitId, runKey);
  const immutableRunRoot = join(defaultImmutableRunRoot(root), unitId, runKey);
  mkdirSync(runRoot, { recursive: true, mode: 0o700 });
  mkdirSync(immutableRunRoot, { recursive: true, mode: 0o700 });
  const routePath = "/workshop/projects/project-redacted/estimates/node-redacted";
  const baseUrl = "http://127.0.0.1:3190";
  const storageStatePath = join(runRoot, "storage-state.json");
  writePrivateJson(storageStatePath, { cookies: [{ name: "session", value: "redacted", domain: "127.0.0.1", path: "/" }], origins: [] });
  const storageStateSha256 = sha256File(storageStatePath);
  const runtimeEnv = join(runRoot, "runtime.env");
  writeFileSync(runtimeEnv, "ESTIMATE_GRAPH_MODE=on\n", { mode: 0o600 });
  const processJournal = join(runRoot, "preview/process-journal.json");
  writePrivateJson(processJournal, { schema_version: "estimate-sheet-preview-process-journal.v1", unit_id: unitId, run_id: runId, processes: [] });
  const descriptorPath = join(runRoot, "preview/descriptors/01-final.json");
  const descriptor = {
    schema_version: "estimate-sheet-benchmark-server.v1",
    unit_id: unitId,
    run_id: runId,
    role: unitId === "UNIT-002" ? "browser" : "mode",
    phase: unitId === "UNIT-002" ? "baseline-all-off" : "final",
    final_state: unitId === "UNIT-002" ? "all-off" : "all-activated",
    ordinal: 1,
    port: 3190,
    base_url: baseUrl,
    route_path: routePath,
    command: ["bun", "run", "preview"],
    launched: true,
    pid: 1234,
    build_receipt: "receipts/command-opennext-build.json",
    build_receipt_sha256: sha256Hex("build-receipt"),
    build_hash: buildHash,
    runtime_env_sha256: sha256Hex("runtime-env"),
    storage_state_sha256: storageStateSha256,
    requested_snapshot: { modes: { route: unitId === "UNIT-002" ? "off" : "on" } },
    server_snapshot: { modes: { route: unitId === "UNIT-002" ? "off" : "on" } },
    readiness: "READY",
    active: true,
    process_journal: "preview/process-journal.json",
    generated_at: "2026-07-11T00:00:00.000Z",
    ...input.activeOverrides,
  };
  writePrivateJson(descriptorPath, descriptor);
  const activePath = join(runRoot, "preview/active-preview.json");
  writePrivateJson(activePath, {
    ...descriptor,
    descriptor_path: "preview/descriptors/01-final.json",
    descriptor_sha256: sha256File(descriptorPath),
  });
  const primaryRole = unitId === "UNIT-002" ? "browser" : "mode";
  const namespaces = unitId === "UNIT-002"
    ? { browser: { idSha256: sha256Hex("browser-namespace"), preStateSha256: fixtureHash } }
    : {
        mode: { idSha256: sha256Hex("mode-namespace"), preStateSha256: fixtureHash },
        browser: { idSha256: sha256Hex("browser-namespace"), preStateSha256: fixtureHash },
        d1: { idSha256: sha256Hex("d1-namespace"), preStateSha256: fixtureHash },
      };
  const wranglerState = join(runRoot, "wrangler-state");
  mkdirSync(wranglerState, { recursive: true, mode: 0o700 });
  const run = {
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
    sourceFingerprint: {
      contract_version: "estimate-sheet-source-fingerprint.v2",
      head: "1234567",
      path_count: 1,
      path_list_sha256: sha256Hex("source-paths"),
      application: fingerprint,
      producer: fingerprint,
    },
    applicationFingerprint: fingerprint,
    producerFingerprint: fingerprint,
    fixture: { profile: "limit", namespaceIdSha256: namespaces[primaryRole].idSha256, preStateSha256: fixtureHash },
    fixture_hash: fixtureHash,
    auth_fixture_hash: storageStateSha256,
    namespaces,
    mutationJournal: [],
    previewProcesses: [],
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
      cleanupStateSha256ByRole: Object.fromEntries(Object.keys(namespaces).map((role) => [role, sha256Hex(`cleanup-${role}`)])),
      unitLease: join(runRoot, "../../..", "leases/units", unitId),
      portLease: join(runRoot, "../../..", "leases/ports/3190"),
    },
    leasedPort: 3190,
    port: 3190,
    runtimeEnv,
    runtimeEnvSha256: sha256File(runtimeEnv),
    runtimeEnvStableSha256: sha256Hex("playwright-reporter-stable-runtime-env"),
    storageState: storageStatePath,
    storageStateSha256,
    storageStateExpiresAt: "2099-01-01T00:00:00.000Z",
    processJournal,
    routePath,
    route: { path: routePath, projectId: "project-redacted", nodeId: "node-redacted", fixtureRole: unitId === "UNIT-002" ? "browser" : "browser" },
    activePreview: { path: activePath, sha256: sha256File(activePath), pid: 1234, port: 3190, snapshot: descriptor.server_snapshot },
    ...input.manifestOverrides,
  };
  const manifestPath = join(runRoot, "run-manifest.json");
  writePrivateJson(manifestPath, run);
  writePrivateJson(join(immutableRunRoot, "run-manifest.json"), run);
  return { root, runRoot, immutableRunRoot, runId, unitId, baseUrl, routePath, storageStatePath, storageStateSha256, activePath, descriptorPath, run };
}

function enableReporter(run: PreparedRun): { receiptPath: string; reportPath: string } {
  process.chdir(run.root);
  process.argv = ["bun", join(run.root, "node_modules/playwright/cli.js"), "test"];
  const outputRole = run.unitId === "UNIT-002" ? "browser" : "browser-child";
  vi.stubEnv("ESTIMATE_PERF_TEST_OUTPUT_ROLE", "e2e-tests");
  vi.stubEnv("ESTIMATE_PERF_OUTPUT_ROLE", outputRole);
  vi.stubEnv("ESTIMATE_PERF_FIXTURE_ROLE", "browser");
  vi.stubEnv("ESTIMATE_PERF_RUN_ROOT", run.runRoot);
  vi.stubEnv("ESTIMATE_PERF_RUN_ID", run.runId);
  vi.stubEnv("ESTIMATE_PERF_UNIT", run.unitId);
  vi.stubEnv("ESTIMATE_PERF_TEST_RECEIPT_PATH", "receipts/e2e-tests.json");
  vi.stubEnv("ESTIMATE_PERF_FIXTURE_HASH", fixtureHash);
  vi.stubEnv("ESTIMATE_PERF_BUILD_HASH", buildHash);
  return {
    receiptPath: join(run.immutableRunRoot, ESTIMATE_LOGICAL_OUTPUTS["e2e-tests"]),
    reportPath: join(run.immutableRunRoot, ESTIMATE_LOGICAL_OUTPUTS[outputRole]),
  };
}

function fakeTest(id: string, title: string, file: string): TestCase {
  return { id, title, location: { file, line: 1, column: 1 }, retries: 0 } as unknown as TestCase;
}

function exactCohort(): TestCase[] {
  const activeRepoRoot = process.cwd();
  return [
    ...baselineTitles.map((title, index) => fakeTest(`baseline-${index + 1}`, title, join(activeRepoRoot, "e2e/estimate-sheet-performance.spec.ts"))),
    ...interopScenarios.map(([id, slug]) => fakeTest(`interop-${id}`, `${id} ${slug}`, join(activeRepoRoot, "e2e/estimate-sheet-component-interop.spec.ts"))),
  ];
}

function fakeSuite(tests: TestCase[]): Suite {
  return { allTests: () => tests } as unknown as Suite;
}

function fakeConfig(run: PreparedRun, overrides: { workers?: number; viewportWidth?: number } = {}): FullConfig {
  return {
    workers: overrides.workers ?? 1,
    projects: [{
      name: "chromium",
      retries: 0,
      use: {
        browserName: "chromium",
        baseURL: run.baseUrl,
        storageState: run.storageStatePath,
        viewport: { width: overrides.viewportWidth ?? 1_440, height: 900 },
        deviceScaleFactor: 1,
        trace: "retain-on-failure",
      },
    }],
  } as unknown as FullConfig;
}

function snapshot() {
  return {
    route: "/workshop/projects/private/estimates/private",
    navigationMs: 100,
    resourceCount: 10,
    scriptBytes: 1_000,
    rscBytes: 500,
    mountedRows: 80,
    mountedBranches: 50,
    sheetVisible: true,
    treeReady: true,
  };
}

function fakeTestResult(test: TestCase, status: TestResult["status"] = "passed", duration = 5): TestResult {
  const scenario = interopScenarios.find(([id, slug]) => test.title === `${id} ${slug}`);
  const attachments = status !== "passed" ? [] : scenario
    ? [{
      name: `estimate-sheet-interop-${scenario[1]}.json`,
      contentType: "application/json",
      body: Buffer.from(JSON.stringify({
        schemaVersion: "estimate-sheet-interop-scenario.v1",
        scenarioId: scenario[0],
        slug: scenario[1],
        setup: ["prepared fixture"],
        actions: ["scenario-specific action"],
        assertions: ["scenario-specific assertion"],
        measurements: { durationMs: duration, passed: true },
        snapshot: snapshot(),
      })),
    }]
    : [{ name: "estimate-sheet-baseline.json", contentType: "application/json", body: Buffer.from(JSON.stringify(snapshot())) }];
  return { status, duration, retry: 0, attachments } as unknown as TestResult;
}

function fakeFullResult(status: FullResult["status"], duration = 100): FullResult {
  return { status, duration, startTime: new Date("2026-07-11T00:00:00.000Z") };
}

function completeCohort(reporter: EstimateSheetPerformanceReporter, tests: TestCase[], statuses: Map<string, TestResult["status"]> = new Map()): void {
  for (const test of tests) reporter.onTestEnd(test, fakeTestResult(test, statuses.get(test.title) ?? "passed"));
}

afterEach(() => {
  process.chdir(originalCwd);
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  process.argv = [...originalArgv];
  while (roots.length) rmSync(roots.pop()!, { recursive: true, force: true });
});

describe("estimate-sheet Playwright performance reporter", () => {
  it("is completely inert when the e2e evidence role is disabled", () => {
    vi.stubEnv("ESTIMATE_PERF_TEST_OUTPUT_ROLE", "");
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation((() => true) as typeof process.stdout.write);
    const run = createRun();
    const test = fakeTest("disabled", "disabled", join(repoRoot, "e2e/estimate-sheet-performance.spec.ts"));
    const reporter = new EstimateSheetPerformanceReporter();

    reporter.onBegin(fakeConfig(run), fakeSuite([test]));
    reporter.onTestEnd(test, fakeTestResult(test));

    expect(reporter.onEnd(fakeFullResult("passed"))).toBeUndefined();
    expect(stdout).not.toHaveBeenCalled();
  });

  it("writes one strict browser-child report bound to the exact passing receipt and cohort", () => {
    const run = createRun();
    const { receiptPath, reportPath } = enableReporter(run);
    const tests = exactCohort();
    vi.spyOn(process.stdout, "write").mockImplementation((() => true) as typeof process.stdout.write);
    vi.spyOn(process.stderr, "write").mockImplementation((() => true) as typeof process.stderr.write);
    process.argv = [
      "bun",
      join(process.cwd(), "node_modules/playwright/cli.js"),
      "test",
      "--config=playwright.estimate-performance.config.ts",
      join(process.cwd(), "e2e/estimate-sheet-performance.spec.ts"),
      join(process.cwd(), "e2e/estimate-sheet-component-interop.spec.ts"),
      "--workers=1",
      "--retries=0",
    ];
    const reporter = new EstimateSheetPerformanceReporter();
    reporter.onBegin(fakeConfig(run), fakeSuite(tests));
    completeCohort(reporter, tests);

    expect(reporter.onEnd(fakeFullResult("passed", 125))).toBeUndefined();
    const receipt = readTestReceipt(receiptPath, run.immutableRunRoot);
    expect(receipt).toMatchObject({
      schema_version: "estimate-sheet-test-receipt.v1",
      unit_id: "UNIT-010",
      run_id: run.runId,
      workers: 1,
      retries: 0,
      passed: 22,
      failed: 0,
      skipped: 0,
      overall: "PASS",
      fixture_hash: fixtureHash,
      build_hash: buildHash,
      files: ["e2e/estimate-sheet-performance.spec.ts", "e2e/estimate-sheet-component-interop.spec.ts"],
    });
    const report = readJsonFile<PerformanceReportV1>(reportPath);
    assertPerformanceReport(report, { strict: true });
    expect(report).toMatchObject({
      schema_version: "estimate-sheet-performance-report.v1",
      evidenceClass: "local-browser",
      trace: { unitId: "UNIT-010", evidenceId: "browser-child", scenarioIds: interopScenarios.map(([id]) => id) },
      fixtureHash,
      buildHash,
      authFixtureHash: run.storageStateSha256,
      browserScope: "full-local",
      overall: "PASS",
      buildMode: "opennext-preview",
      finalSnapshot: { scenarioEvidenceCount: 19, passed: 22, failed: 0, skipped: 0 },
    });
    expect(report.toolHashes?.testReceipt).toBe(sha256File(receiptPath));
    expect(Object.keys(report.scenarios ?? {})).toEqual(interopScenarios.map(([id]) => id));
    expect(statSync(receiptPath).mode & 0o777).toBe(0o600);
    expect(statSync(reportPath).mode & 0o777).toBe(0o600);

    const receiptBytes = readFileSync(receiptPath, "utf8");
    const reportBytes = readFileSync(reportPath, "utf8");
    const duplicate = new EstimateSheetPerformanceReporter();
    duplicate.onBegin(fakeConfig(run), fakeSuite(tests));
    completeCohort(duplicate, tests);
    expect(duplicate.onEnd(fakeFullResult("passed", 125))).toEqual({ status: "failed" });
    expect(readFileSync(receiptPath, "utf8")).toBe(receiptBytes);
    expect(readFileSync(reportPath, "utf8")).toBe(reportBytes);
  });

  it("derives the UNIT-002 baseline scope and publishes failed evidence for skips", () => {
    const run = createRun({ unitId: "UNIT-002", runId: "run-playwright-reporter-baseline" });
    const { receiptPath, reportPath } = enableReporter(run);
    const tests = exactCohort();
    const skippedTitle = `${interopScenarios[0][0]} ${interopScenarios[0][1]}`;
    vi.spyOn(process.stdout, "write").mockImplementation((() => true) as typeof process.stdout.write);
    vi.spyOn(process.stderr, "write").mockImplementation((() => true) as typeof process.stderr.write);
    const reporter = new EstimateSheetPerformanceReporter();
    reporter.onBegin(fakeConfig(run), fakeSuite(tests));
    completeCohort(reporter, tests, new Map([[skippedTitle, "skipped"]]));

    expect(reporter.onEnd(fakeFullResult("passed"))).toEqual({ status: "failed" });
    expect(readTestReceipt(receiptPath, run.immutableRunRoot)).toMatchObject({ overall: "PASS", passed: 21, failed: 0, skipped: 1 });
    const report = readJsonFile<PerformanceReportV1>(reportPath);
    expect(report).toMatchObject({ browserScope: "baseline", overall: "FAIL", failures: ["playwright-test-skips", "interop-evidence-incomplete"] });
    expect(report.metrics.skippedTests).toMatchObject({ status: "FAIL", value: 1, budget: 0 });
  });

  it("fails closed before output on role, viewport, or active-preview binding drift", () => {
    const cases = [
      {
        name: "output role",
        arrange(run: PreparedRun) { vi.stubEnv("ESTIMATE_PERF_OUTPUT_ROLE", "browser"); return fakeConfig(run); },
      },
      {
        name: "viewport",
        arrange(run: PreparedRun) { return fakeConfig(run, { viewportWidth: 1_280 }); },
      },
      {
        name: "active preview hash",
        arrange(run: PreparedRun) { writeFileSync(run.activePath, `${readFileSync(run.activePath, "utf8")} `); return fakeConfig(run); },
      },
    ];
    vi.spyOn(process.stdout, "write").mockImplementation((() => true) as typeof process.stdout.write);
    vi.spyOn(process.stderr, "write").mockImplementation((() => true) as typeof process.stderr.write);
    for (const entry of cases) {
      const run = createRun({ runId: `run-invalid-${entry.name.replaceAll(" ", "-")}` });
      const { receiptPath, reportPath } = enableReporter(run);
      const tests = exactCohort();
      const reporter = new EstimateSheetPerformanceReporter();
      reporter.onBegin(entry.arrange(run), fakeSuite(tests));
      completeCohort(reporter, tests);
      expect(reporter.onEnd(fakeFullResult("passed")), entry.name).toEqual({ status: "failed" });
      expect(existsSync(receiptPath), entry.name).toBe(false);
      expect(existsSync(reportPath), entry.name).toBe(false);
    }
  });

  it("denies mutable manifest tampering across the Playwright execution window", () => {
    const run = createRun();
    const { receiptPath, reportPath } = enableReporter(run);
    const tests = exactCohort();
    vi.spyOn(process.stdout, "write").mockImplementation((() => true) as typeof process.stdout.write);
    vi.spyOn(process.stderr, "write").mockImplementation((() => true) as typeof process.stderr.write);
    const reporter = new EstimateSheetPerformanceReporter();
    reporter.onBegin(fakeConfig(run), fakeSuite(tests));
    completeCohort(reporter, tests);

    const manifestPath = join(run.runRoot, "run-manifest.json");
    const tampered = JSON.parse(readFileSync(manifestPath, "utf8"));
    tampered.created_at = "2026-07-12T00:00:00.000Z";
    writePrivateJson(manifestPath, tampered);

    expect(reporter.onEnd(fakeFullResult("passed"))).toEqual({ status: "failed" });
    expect(existsSync(receiptPath)).toBe(false);
    expect(existsSync(reportPath)).toBe(false);
  });
});
