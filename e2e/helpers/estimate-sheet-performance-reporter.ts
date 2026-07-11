import { existsSync } from "node:fs";
import { relative, resolve } from "node:path";

import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
} from "@playwright/test/reporter";

import {
  createTestReceipt,
  loadRunFingerprints,
  readReceiptEnvironment,
  writeTestReceipt,
  type ReceiptEnvironment,
  type TestReceiptInput,
} from "../../scripts/lib/estimate-sheet-performance-test-receipt";
import {
  BROWSER_SCOPE_BY_UNIT,
  PERFORMANCE_REPORT_SCHEMA,
  assertPerformanceReport,
  assertRunManifest,
  canonicalJson,
  ensureContainedRunPath,
  fingerprintContentEqual,
  isPlainObject,
  isSha256,
  nowIso,
  readJsonFile,
  resolveManifestLogicalOutput,
  sha256File,
  sha256Hex,
  writeRunJsonNoOverwrite,
  type BrowserScope,
  type PerformanceReportV1,
  type RunManifestV1,
  type TestReceiptV1,
} from "../../scripts/lib/estimate-sheet-performance-contract";

const PERFORMANCE_FILE = "e2e/estimate-sheet-performance.spec.ts";
const INTEROP_FILE = "e2e/estimate-sheet-component-interop.spec.ts";
const BASELINE_TITLES = [
  "captures a cold route and sheet-ready baseline",
  "captures a warm route baseline without arbitrary sleeps",
  "records mounted-row and mounted-branch census for the active window",
] as const;
const INTEROP_SCENARIOS = [
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
const INTEROP_TITLE_BY_ID = new Map(INTEROP_SCENARIOS.map(([id, slug]) => [`${id} ${slug}`, { id, slug }]));

type SanitizedInteropEvidence = {
  scenarioId: string;
  slug: string;
  setup: string[];
  actions: string[];
  assertions: string[];
  measurements: Record<string, number | string | boolean>;
  snapshot: {
    navigationMs: number | null;
    resourceCount: number;
    scriptBytes: number;
    rscBytes: number;
    mountedRows: number;
    mountedBranches: number;
    sheetVisible: boolean;
    treeReady: boolean;
  };
};

type BrowserBinding = {
  scope: BrowserScope;
  outputRole: "browser" | "browser-child";
  reportPath: string;
  buildHash: string;
  authFixtureHash: string;
  fixtureHash: string;
  browser: Record<string, unknown>;
  device: Record<string, unknown>;
  environment: Record<string, unknown>;
  modeSnapshot: Record<string, unknown>;
  route: Record<string, unknown>;
  finalPreview: Record<string, unknown>;
  activePreviewSha256: string;
  descriptorSha256: string;
};

type RecordedResult = {
  title: string;
  status: TestResult["status"];
  durationMs: number;
  failureId?: string;
  interop?: SanitizedInteropEvidence;
  snapshot?: SanitizedInteropEvidence["snapshot"];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return isPlainObject(value);
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value) throw new Error(`${label} is missing`);
  return value;
}

function requireHash(value: unknown, label: string): string {
  const hash = requireString(value, label);
  if (!isSha256(hash)) throw new Error(`${label} must be a sha256`);
  return hash;
}

function requireInteger(value: unknown, label: string): number {
  if (!Number.isInteger(value) || Number(value) < 0) throw new Error(`${label} must be a non-negative integer`);
  return Number(value);
}

function normalizedRepoPath(path: string): string {
  return relative(process.cwd(), resolve(path)).split("\\").join("/");
}

function assertRunBinding(environment: ReceiptEnvironment, run: RunManifestV1): void {
  assertRunManifest(run);
  if (!environment.runRoot || !environment.runId || !environment.unitId || !environment.receiptPath || !environment.receiptRoot) {
    throw new Error("receipt environment has no committed run binding");
  }
  if (run.status !== "PREPARED") throw new Error(`test receipt requires a PREPARED run, received ${run.status}`);
  if (resolve(run.run_root) !== resolve(environment.runRoot)) throw new Error("run root does not match receipt environment");
  if (resolve(run.immutable_run_root) !== resolve(environment.receiptRoot)) throw new Error("receipt root does not match the immutable run root");
  if (run.run_id !== environment.runId) throw new Error("run id does not match receipt environment");
  if (run.unit_id !== environment.unitId) throw new Error("unit id does not match receipt environment");
}

function fixtureMutationForRun(
  run: RunManifestV1,
  fixtureRole: string | undefined,
): TestReceiptV1["fixtureMutation"] | undefined {
  if (!fixtureRole) return undefined;
  const namespace = run.namespaces[fixtureRole];
  if (!namespace) throw new Error(`fixture namespace is missing for ${fixtureRole}`);
  const matches = run.mutationJournal.filter(
    (entry): entry is Record<string, unknown> => isRecord(entry) && entry.fixtureRole === fixtureRole,
  );
  if (matches.length === 0 && namespace.postStateSha256 === undefined && namespace.commandId === undefined) return undefined;
  if (matches.length !== 1) throw new Error(`fixture mutation journal must contain exactly one ${fixtureRole} entry`);
  const mutation = matches[0]!;
  const namespaceIdSha256 = requireHash(mutation.namespaceIdSha256, "fixture mutation namespaceIdSha256");
  const preStateSha256 = requireHash(mutation.preStateSha256, "fixture mutation preStateSha256");
  const postStateSha256 = requireHash(mutation.postStateSha256, "fixture mutation postStateSha256");
  const commandId = requireString(mutation.commandId, "fixture mutation commandId");
  if (namespace.idSha256 !== namespaceIdSha256) throw new Error("fixture mutation namespace identity mismatch");
  if (namespace.preStateSha256 !== preStateSha256) throw new Error("fixture mutation pre-state mismatch");
  if (namespace.postStateSha256 !== postStateSha256) throw new Error("fixture mutation post-state mismatch");
  if (namespace.commandId !== commandId) throw new Error("fixture mutation command identity mismatch");
  return {
    fixtureRole,
    namespaceIdSha256,
    preStateSha256,
    postStateSha256,
    declaredMutationSha256: requireHash(mutation.declaredMutationSha256, "fixture mutation declaredMutationSha256"),
    commandId,
  };
}

function parseJsonAttachment(result: TestResult, expectedName: string): unknown {
  const attachment = result.attachments.find((candidate) => candidate.name === expectedName);
  if (!attachment?.body) throw new Error(`required Playwright attachment is missing: ${expectedName}`);
  return JSON.parse(attachment.body.toString("utf8")) as unknown;
}

function parseSnapshot(value: unknown, label: string): SanitizedInteropEvidence["snapshot"] {
  if (!isRecord(value)) throw new Error(`${label} must be an object`);
  const navigationMs = value.navigationMs;
  if (navigationMs !== null && (typeof navigationMs !== "number" || !Number.isFinite(navigationMs) || navigationMs < 0)) {
    throw new Error(`${label}.navigationMs is invalid`);
  }
  const snapshot = {
    navigationMs: navigationMs as number | null,
    resourceCount: requireInteger(value.resourceCount, `${label}.resourceCount`),
    scriptBytes: requireInteger(value.scriptBytes, `${label}.scriptBytes`),
    rscBytes: requireInteger(value.rscBytes, `${label}.rscBytes`),
    mountedRows: requireInteger(value.mountedRows, `${label}.mountedRows`),
    mountedBranches: requireInteger(value.mountedBranches, `${label}.mountedBranches`),
    sheetVisible: value.sheetVisible === true,
    treeReady: value.treeReady === true,
  };
  if (!snapshot.sheetVisible || !snapshot.treeReady) throw new Error(`${label} did not prove sheet/tree readiness`);
  return snapshot;
}

function requireStringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.length === 0 || value.some((entry) => typeof entry !== "string" || !entry)) {
    throw new Error(`${label} must be a non-empty string array`);
  }
  return [...value] as string[];
}

function parseInteropEvidence(result: TestResult, scenario: { id: string; slug: string }): SanitizedInteropEvidence {
  const value = parseJsonAttachment(result, `estimate-sheet-interop-${scenario.slug}.json`);
  if (!isRecord(value)
    || value.schemaVersion !== "estimate-sheet-interop-scenario.v1"
    || value.scenarioId !== scenario.id
    || value.slug !== scenario.slug) {
    throw new Error(`interop attachment identity mismatch for ${scenario.id}`);
  }
  if (!isRecord(value.measurements)) throw new Error(`interop measurements missing for ${scenario.id}`);
  const measurements: Record<string, number | string | boolean> = {};
  for (const [key, measurement] of Object.entries(value.measurements)) {
    if (!key || !["number", "string", "boolean"].includes(typeof measurement)) {
      throw new Error(`interop measurement invalid for ${scenario.id}`);
    }
    if (typeof measurement === "number" && !Number.isFinite(measurement)) throw new Error(`interop measurement non-finite for ${scenario.id}`);
    measurements[key] = measurement as number | string | boolean;
  }
  return {
    scenarioId: scenario.id,
    slug: scenario.slug,
    setup: requireStringArray(value.setup, `${scenario.id}.setup`),
    actions: requireStringArray(value.actions, `${scenario.id}.actions`),
    assertions: requireStringArray(value.assertions, `${scenario.id}.assertions`),
    measurements,
    snapshot: parseSnapshot(value.snapshot, `${scenario.id}.snapshot`),
  };
}

function parseBaselineSnapshot(result: TestResult): SanitizedInteropEvidence["snapshot"] {
  const attachment = result.attachments.find((candidate) => candidate.name.endsWith(".json"));
  if (!attachment?.body) throw new Error("baseline snapshot attachment is missing");
  return parseSnapshot(JSON.parse(attachment.body.toString("utf8")) as unknown, "baseline snapshot");
}

function browserBinding(config: FullConfig, environment: ReceiptEnvironment, run: RunManifestV1): BrowserBinding {
  const unitId = run.unit_id as keyof typeof BROWSER_SCOPE_BY_UNIT;
  const scope = BROWSER_SCOPE_BY_UNIT[unitId];
  if (!scope) throw new Error(`${run.unit_id} does not own a browser scope`);
  const outputRole = process.env.ESTIMATE_PERF_OUTPUT_ROLE?.trim();
  const expectedOutputRole = run.unit_id === "UNIT-002" ? "browser" : "browser-child";
  if (outputRole !== expectedOutputRole) throw new Error(`${run.unit_id} requires ESTIMATE_PERF_OUTPUT_ROLE=${expectedOutputRole}`);
  if (environment.fixtureRole !== "browser") throw new Error("performance browser reporter requires fixture role browser");

  const projects = config.projects;
  if (projects.length !== 1) throw new Error("performance browser reporter requires one Playwright project");
  const project = projects[0]!;
  if (project.retries !== 0) throw new Error("performance browser project requires zero retries");
  const use = project.use as Record<string, unknown>;
  const viewport = use.viewport;
  if (!isRecord(viewport) || viewport.width !== 1_440 || viewport.height !== 900) {
    throw new Error("performance browser reporter requires a fixed 1440x900 viewport");
  }
  if (use.deviceScaleFactor !== 1) throw new Error("performance browser reporter requires deviceScaleFactor=1");
  if (use.trace !== "retain-on-failure") throw new Error("performance browser reporter requires retain-on-failure traces");
  if (use.browserName !== undefined && use.browserName !== "chromium") throw new Error("performance browser reporter requires Chromium");

  const runRecord = run as unknown as Record<string, unknown>;
  const activeBinding = runRecord.activePreview;
  if (!isRecord(activeBinding)) throw new Error("run manifest has no active preview binding");
  const activePath = ensureContainedRunPath(run.run_root, requireString(activeBinding.path, "active preview path"));
  const activeSha256 = requireHash(activeBinding.sha256, "active preview sha256");
  if (!existsSync(activePath) || sha256File(activePath) !== activeSha256) throw new Error("active preview file hash mismatch");
  const active = readJsonFile<Record<string, unknown>>(activePath);
  if (active.schema_version !== "estimate-sheet-benchmark-server.v1"
    || active.unit_id !== run.unit_id
    || active.run_id !== run.run_id
    || active.readiness !== "READY"
    || active.active !== true) {
    throw new Error("active preview identity/readiness mismatch");
  }
  const descriptorPath = ensureContainedRunPath(run.run_root, requireString(active.descriptor_path, "descriptor path"));
  const descriptorSha256 = requireHash(active.descriptor_sha256, "descriptor sha256");
  if (!existsSync(descriptorPath) || sha256File(descriptorPath) !== descriptorSha256) throw new Error("active descriptor hash mismatch");
  const descriptor = readJsonFile<Record<string, unknown>>(descriptorPath);
  for (const key of ["schema_version", "unit_id", "run_id", "role", "phase", "final_state", "port", "base_url", "route_path", "build_hash", "storage_state_sha256", "runtime_env_sha256", "requested_snapshot", "server_snapshot", "readiness", "active"] as const) {
    if (canonicalJson(active[key]) !== canonicalJson(descriptor[key])) throw new Error(`active preview descriptor differs at ${key}`);
  }
  const buildHash = requireHash(active.build_hash, "browser build hash");
  if (environment.buildHash !== undefined && environment.buildHash !== buildHash) throw new Error("receipt build hash conflicts with active preview");
  const authFixtureHash = requireHash(active.storage_state_sha256, "browser storage state hash");
  const storageStateSha256 = requireHash(runRecord.storageStateSha256, "manifest storage state hash");
  if (authFixtureHash !== storageStateSha256) throw new Error("active preview storage state hash mismatch");
  const storageState = ensureContainedRunPath(run.run_root, requireString(run.storageState, "manifest storage state"));
  if (!existsSync(storageState) || sha256File(storageState) !== authFixtureHash) throw new Error("browser storage state file hash mismatch");
  if (typeof use.storageState === "string" && resolve(use.storageState) !== storageState) throw new Error("Playwright storage state differs from active preview");

  const baseUrl = requireString(active.base_url, "active preview base url");
  if (use.baseURL !== baseUrl) throw new Error("Playwright baseURL differs from active preview");
  const routePath = requireString(active.route_path, "active preview route path");
  const fixtureHash = environment.fixtureHash
    ?? run.namespaces.browser?.postStateSha256
    ?? run.namespaces.browser?.preStateSha256
    ?? run.fixture?.preStateSha256;
  if (!isSha256(fixtureHash)) throw new Error("browser fixture hash is missing");
  const modeSnapshot = active.server_snapshot;
  if (!isRecord(modeSnapshot) || Object.keys(modeSnapshot).length === 0) throw new Error("active preview mode snapshot is missing");

  return {
    scope,
    outputRole: expectedOutputRole,
    reportPath: resolveManifestLogicalOutput(run, expectedOutputRole),
    buildHash,
    authFixtureHash,
    fixtureHash,
    browser: { engine: "chromium", project: project.name || "default", workers: 1, retries: 0 },
    device: { viewport: { width: 1_440, height: 900 }, deviceScaleFactor: 1 },
    environment: {
      outputRole: expectedOutputRole,
      fixtureRole: "browser",
      previewRole: active.role,
      previewPhase: active.phase,
      finalState: active.final_state,
    },
    modeSnapshot,
    route: { pathSha256: sha256Hex(routePath), configuredPathMatches: true },
    finalPreview: {
      readiness: "READY",
      active: true,
      port: active.port,
      phase: active.phase,
      finalState: active.final_state,
    },
    activePreviewSha256: activeSha256,
    descriptorSha256,
  };
}

function validateExpectedCohort(tests: TestCase[]): void {
  const titleSet = new Set(tests.map((test) => test.title));
  const expectedTitles = [
    ...BASELINE_TITLES,
    ...INTEROP_SCENARIOS.map(([id, slug]) => `${id} ${slug}`),
  ];
  if (tests.length !== expectedTitles.length || titleSet.size !== expectedTitles.length) {
    throw new Error(`performance Playwright cohort must contain exactly ${expectedTitles.length} unique tests`);
  }
  for (const title of expectedTitles) if (!titleSet.has(title)) throw new Error(`performance Playwright cohort is missing ${title}`);
  const files = new Set(tests.map((test) => normalizedRepoPath(test.location.file)));
  if (files.size !== 2 || !files.has(PERFORMANCE_FILE) || !files.has(INTEROP_FILE)) {
    throw new Error("performance Playwright cohort must use the exact baseline and interop files");
  }
  for (const test of tests) {
    const file = normalizedRepoPath(test.location.file);
    if (BASELINE_TITLES.includes(test.title as (typeof BASELINE_TITLES)[number]) && file !== PERFORMANCE_FILE) {
      throw new Error(`baseline test is declared in the wrong file: ${test.title}`);
    }
    if (INTEROP_TITLE_BY_ID.has(test.title) && file !== INTEROP_FILE) throw new Error(`interop test is declared in the wrong file: ${test.title}`);
  }
}

/**
 * Dedicated estimate-sheet browser evidence producer. Durable output contains
 * only validated run identity, fixed browser/device scope, aggregate counts,
 * scenario contracts, sanitized measurements, and hashes of failure IDs.
 */
export class EstimateSheetPerformanceReporter implements Reporter {
  private readonly enabled = process.env.ESTIMATE_PERF_TEST_OUTPUT_ROLE === "e2e-tests";
  private environment?: ReceiptEnvironment;
  private applicationFingerprint?: TestReceiptInput["applicationFingerprint"];
  private producerFingerprint?: TestReceiptInput["producerFingerprint"];
  private binding?: BrowserBinding;
  private argv: string[] = [];
  private files: string[] = [];
  private readonly discoveredIds = new Set<string>();
  private readonly titleById = new Map<string, string>();
  private readonly results = new Map<string, RecordedResult>();
  private invalid = false;
  private externalError = false;
  private ended = false;

  onBegin(config: FullConfig, suite: Suite): void {
    if (!this.enabled) return;
    try {
      if (config.workers !== 1) throw new Error("performance Playwright evidence requires one worker");
      const environment = readReceiptEnvironment();
      if (!environment.enabled || environment.role !== "e2e-tests") throw new Error("invalid Playwright receipt role");
      const loaded = loadRunFingerprints(requireString(environment.runRoot, "run root"), environment.unitId);
      assertRunBinding(environment, loaded.run);
      const tests = suite.allTests();
      validateExpectedCohort(tests);
      const fileSet = new Set<string>();
      for (const test of tests) {
        if (!test.id || this.discoveredIds.has(test.id)) throw new Error("Playwright test ids must be unique");
        if (test.retries !== 0) throw new Error("performance Playwright evidence requires zero retries");
        if (!test.location.file) throw new Error("Playwright test file is missing");
        this.discoveredIds.add(test.id);
        this.titleById.set(test.id, test.title);
        fileSet.add(test.location.file);
      }
      this.environment = environment;
      this.applicationFingerprint = loaded.application;
      this.producerFingerprint = loaded.producer;
      this.binding = browserBinding(config, environment, loaded.run);
      this.argv = process.argv.slice(1);
      this.files = [...fileSet];
      process.stdout.write(`estimate-sheet-e2e-reporter:start:${loaded.run.unit_id}:${this.binding.scope}\n`);
    } catch {
      this.invalid = true;
    }
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    if (!this.enabled) return;
    if (
      this.invalid
      || !this.discoveredIds.has(test.id)
      || this.results.has(test.id)
      || test.retries !== 0
      || result.retry !== 0
      || !Number.isFinite(result.duration)
      || result.duration < 0
    ) {
      this.invalid = true;
      return;
    }
    try {
      const title = this.titleById.get(test.id);
      if (!title || title !== test.title) throw new Error("Playwright test title changed after discovery");
      const failed = result.status !== "passed" && result.status !== "skipped";
      const scenario = INTEROP_TITLE_BY_ID.get(title);
      this.results.set(test.id, {
        title,
        status: result.status,
        durationMs: result.duration,
        ...(failed ? { failureId: `playwright-${result.status}-${sha256Hex(test.id).slice(0, 16)}` } : {}),
        ...(result.status === "passed" && scenario ? { interop: parseInteropEvidence(result, scenario) } : {}),
        ...(result.status === "passed" && BASELINE_TITLES.includes(title as (typeof BASELINE_TITLES)[number])
          ? { snapshot: parseBaselineSnapshot(result) }
          : {}),
      });
      const status = result.status === "passed" ? "PASS" : result.status === "skipped" ? "SKIPPED" : "FAIL";
      process.stdout.write(`estimate-sheet-e2e-reporter:${status}\n`);
    } catch {
      this.invalid = true;
    }
  }

  onError(): void {
    if (this.enabled) this.externalError = true;
  }

  onEnd(result: FullResult): { status: "failed" } | undefined {
    if (!this.enabled) return undefined;
    if (this.ended) {
      process.stderr.write("estimate-sheet-e2e-reporter:evidence-error\n");
      return { status: "failed" };
    }
    this.ended = true;
    try {
      if (this.invalid || this.externalError) throw new Error("Playwright reporter did not complete cleanly");
      if (this.results.size !== this.discoveredIds.size) throw new Error("Playwright result set is incomplete");
      if (!Number.isFinite(result.duration) || result.duration < 0) throw new Error("Playwright run duration is invalid");
      const summary = { passed: 0, failed: 0, skipped: 0, durationMs: 0, failureIds: [] as string[] };
      for (const recorded of this.results.values()) {
        summary.durationMs += recorded.durationMs;
        if (recorded.status === "passed") summary.passed += 1;
        else if (recorded.status === "skipped") summary.skipped += 1;
        else {
          summary.failed += 1;
          if (recorded.failureId) summary.failureIds.push(recorded.failureId);
        }
      }
      if ((result.status === "passed") !== (summary.failed === 0)) throw new Error("Playwright aggregate status does not match test results");
      const environment = this.environment;
      const binding = this.binding;
      if (!environment || !binding || !this.applicationFingerprint || !this.producerFingerprint) {
        throw new Error("Playwright reporter has no initial run binding");
      }
      const loaded = loadRunFingerprints(requireString(environment.runRoot, "run root"), environment.unitId);
      assertRunBinding(environment, loaded.run);
      if (!fingerprintContentEqual(loaded.application, this.applicationFingerprint)
        || !fingerprintContentEqual(loaded.producer, this.producerFingerprint)) {
        throw new Error("run fingerprints changed during Playwright execution");
      }
      const refreshedBinding = browserBinding({
        workers: 1,
        projects: [{
          name: String(binding.browser.project),
          retries: 0,
          use: {
            viewport: binding.device.viewport,
            deviceScaleFactor: 1,
            trace: "retain-on-failure",
            browserName: "chromium",
            baseURL: readJsonFile<Record<string, unknown>>(ensureContainedRunPath(loaded.run.run_root, requireString((loaded.run.activePreview as Record<string, unknown>).path, "active preview path"))).base_url,
            storageState: ensureContainedRunPath(loaded.run.run_root, requireString(loaded.run.storageState, "manifest storage state")),
          },
        }],
      } as unknown as FullConfig, environment, loaded.run);
      if (canonicalJson(refreshedBinding) !== canonicalJson(binding)) throw new Error("browser binding changed during Playwright execution");

      const fixtureMutation = fixtureMutationForRun(loaded.run, environment.fixtureRole);
      const receipt = createTestReceipt({
        testClass: "playwright",
        argv: this.argv,
        files: this.files,
        unitId: environment.unitId!,
        runId: environment.runId!,
        applicationFingerprint: loaded.application,
        producerFingerprint: loaded.producer,
        preApplicationFingerprint: this.applicationFingerprint,
        preProducerFingerprint: this.producerFingerprint,
        fixtureHash: binding.fixtureHash,
        buildHash: binding.buildHash,
        workers: 1,
        retries: 0,
        passed: summary.passed,
        failed: summary.failed,
        skipped: summary.skipped,
        durationMs: summary.durationMs,
        failureIds: summary.failureIds,
        fixtureMutation,
      });
      writeTestReceipt(environment.receiptPath!, receipt, environment.receiptRoot!);

      const scenarioRecords = Object.fromEntries(INTEROP_SCENARIOS.map(([scenarioId, slug]) => {
        const recorded = [...this.results.values()].find((entry) => entry.title === `${scenarioId} ${slug}`);
        return [scenarioId, {
          slug,
          status: recorded?.status === "passed" && recorded.interop ? "PASS" : recorded?.status === "skipped" ? "SKIPPED" : "FAIL",
          durationMs: recorded?.durationMs ?? 0,
          ...(recorded?.interop ? {
            setup: recorded.interop.setup,
            actions: recorded.interop.actions,
            assertions: recorded.interop.assertions,
            measurements: recorded.interop.measurements,
          } : {}),
        }];
      }));
      const snapshots = [...this.results.values()].flatMap((recorded) => [recorded.snapshot, recorded.interop?.snapshot].filter(Boolean)) as SanitizedInteropEvidence["snapshot"][];
      const interopEvidenceCount = [...this.results.values()].filter((recorded) => recorded.interop).length;
      const overall = summary.failed === 0 && summary.skipped === 0 && interopEvidenceCount === INTEROP_SCENARIOS.length ? "PASS" : "FAIL";
      const failures = [
        ...(summary.failed ? ["playwright-test-failures"] : []),
        ...(summary.skipped ? ["playwright-test-skips"] : []),
        ...(interopEvidenceCount !== INTEROP_SCENARIOS.length ? ["interop-evidence-incomplete"] : []),
      ];
      const receiptSha256 = sha256Hex(`${canonicalJson(receipt)}\n`);
      const metrics = {
        exactTestCohort: { status: this.results.size === 22 ? "PASS" : "FAIL", value: this.results.size, budget: 22 },
        interopScenarioCohort: { status: interopEvidenceCount === 19 ? "PASS" : "FAIL", value: interopEvidenceCount, budget: 19 },
        failedTests: { status: summary.failed === 0 ? "PASS" : "FAIL", value: summary.failed, budget: 0 },
        skippedTests: { status: summary.skipped === 0 ? "PASS" : "FAIL", value: summary.skipped, budget: 0 },
        retries: { status: "PASS", value: 0, budget: 0 },
      };
      const report: PerformanceReportV1 = {
        schema_version: PERFORMANCE_REPORT_SCHEMA,
        evidenceClass: "local-browser",
        trace: {
          packageId: loaded.run.package_id,
          unitId: loaded.run.unit_id,
          evidenceId: binding.outputRole,
          requirementIds: ["REQ-CI-01", "REQ-CI-02", "REQ-CI-03", "REQ-CI-04", "REQ-CI-05", "REQ-CI-06", "REQ-CI-07", "REQ-CI-09", "REQ-CI-10", "REQ-CI-11", "REQ-CI-12", "REQ-CI-13", "REQ-CI-14", "REQ-CI-15", "REQ-CI-16"],
          scenarioIds: INTEROP_SCENARIOS.map(([scenarioId]) => scenarioId),
        },
        head: loaded.run.sourceFingerprint.head,
        applicationFingerprint: loaded.application,
        producerFingerprint: loaded.producer,
        ...(loaded.run.inputApplicationFingerprint && loaded.run.inputProducerFingerprint && loaded.run.admissionKind && loaded.run.admissionPath && loaded.run.admissionSha256 ? {
          inputApplicationFingerprint: loaded.run.inputApplicationFingerprint,
          inputProducerFingerprint: loaded.run.inputProducerFingerprint,
          admissionKind: loaded.run.admissionKind,
          admissionPath: loaded.run.admissionPath,
          admissionSha256: loaded.run.admissionSha256,
        } : {}),
        fixtureHash: binding.fixtureHash,
        buildHash: binding.buildHash,
        authFixtureHash: binding.authFixtureHash,
        toolHashes: {
          testReceipt: receiptSha256,
          activePreview: binding.activePreviewSha256,
          previewDescriptor: binding.descriptorSha256,
          reporter: sha256Hex(canonicalJson({ schema: PERFORMANCE_REPORT_SCHEMA, role: binding.outputRole, scenarios: INTEROP_SCENARIOS })),
        },
        runId: loaded.run.run_id,
        generatedAt: nowIso(),
        method: { warmups: 0, samples: this.results.size, workerCount: 1, retries: 0, ...(loaded.run.profile === "artifact-only" ? {} : { profile: loaded.run.profile }) },
        metrics,
        scenarios: scenarioRecords,
        overall,
        ...(failures.length ? { failures } : {}),
        browserScope: binding.scope,
        browser: binding.browser,
        device: binding.device,
        environment: binding.environment,
        modeSnapshot: binding.modeSnapshot,
        route: binding.route,
        interactions: { scenarioCount: INTEROP_SCENARIOS.length, durationsMs: Object.fromEntries([...this.results.values()].map((recorded) => [sha256Hex(recorded.title).slice(0, 16), recorded.durationMs])) },
        finalSnapshot: {
          ...binding.finalPreview,
          sheetVisibleAll: snapshots.length > 0 && snapshots.every((snapshot) => snapshot.sheetVisible),
          treeReadyAll: snapshots.length > 0 && snapshots.every((snapshot) => snapshot.treeReady),
          maxMountedRows: snapshots.reduce((maximum, snapshot) => Math.max(maximum, snapshot.mountedRows), 0),
          maxMountedBranches: snapshots.reduce((maximum, snapshot) => Math.max(maximum, snapshot.mountedBranches), 0),
          scenarioEvidenceCount: interopEvidenceCount,
          passed: summary.passed,
          failed: summary.failed,
          skipped: summary.skipped,
        },
        buildMode: "opennext-preview",
      };
      assertPerformanceReport(report, { strict: true });
      if (report.runId !== receipt.run_id
        || report.trace.unitId !== receipt.unit_id
        || report.fixtureHash !== receipt.fixture_hash
        || report.buildHash !== receipt.build_hash
        || !fingerprintContentEqual(report.applicationFingerprint, receipt.application_fingerprint)
        || !fingerprintContentEqual(report.producerFingerprint, receipt.producer_fingerprint)
        || report.toolHashes?.testReceipt !== receiptSha256) {
        throw new Error("browser report/test receipt binding mismatch");
      }
      writeRunJsonNoOverwrite(loaded.run, binding.reportPath, report, 0o600);
      const persisted = readJsonFile<PerformanceReportV1>(binding.reportPath);
      assertPerformanceReport(persisted, { strict: true });
      if (canonicalJson(persisted) !== canonicalJson(report)) throw new Error("persisted browser report changed after publication");
      process.stdout.write(`estimate-sheet-e2e-reporter:end:${report.overall}:${receipt.passed}:${receipt.failed}:${receipt.skipped}\n`);
      return report.overall === "PASS" ? undefined : { status: "failed" };
    } catch {
      process.stderr.write("estimate-sheet-e2e-reporter:evidence-error\n");
      return { status: "failed" };
    }
  }
}

export default EstimateSheetPerformanceReporter;
