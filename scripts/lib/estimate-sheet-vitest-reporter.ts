import { createTestReceipt, loadRunFingerprints, readFocusedRefreezeBinding, readReceiptEnvironment, writeTestReceipt, type TestReceiptInput } from "./estimate-sheet-performance-test-receipt";
import { fingerprintContentEqual, type FingerprintContent } from "./estimate-sheet-performance-contract";
import { type TestReceiptV1 } from "./estimate-sheet-performance-contract";

type UnknownRecord = Record<string, unknown>;

export type VitestReporterOptions = {
  testClass?: "vitest" | "playwright";
  argv?: string[];
  files?: string[];
  runRoot?: string;
  unitId?: TestReceiptInput["unitId"];
  runId?: string;
  applicationFingerprint?: TestReceiptInput["applicationFingerprint"];
  producerFingerprint?: TestReceiptInput["producerFingerprint"];
  preApplicationFingerprint?: TestReceiptInput["preApplicationFingerprint"];
  preProducerFingerprint?: TestReceiptInput["preProducerFingerprint"];
  fixtureHash?: string;
  buildHash?: string | null;
};

function getNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function callIfFunction(receiver: UnknownRecord, value: unknown): unknown {
  return typeof value === "function" ? value.call(receiver) : value;
}

function normalizeVitestTask(task: unknown): UnknownRecord | null {
  if (!task || typeof task !== "object") return null;
  const record = task as UnknownRecord;
  const children = record.children && typeof record.children === "object"
    ? Array.from(record.children as Iterable<unknown>).map(normalizeVitestTask).filter((child): child is UnknownRecord => child !== null)
    : [];
  return {
    state: callIfFunction(record, record.state),
    ...(children.length ? { children } : {}),
  };
}

function normalizeVitestModules(testModules: unknown[]): UnknownRecord[] {
  return testModules.map((module) => {
    const record = module as UnknownRecord;
    const diagnostic = callIfFunction(record, record.diagnostic);
    const normalized = normalizeVitestTask(module);
    return {
      filepath: typeof record.relativeModuleId === "string" ? record.relativeModuleId : record.moduleId,
      duration: diagnostic && typeof diagnostic === "object" ? (diagnostic as UnknownRecord).duration : 0,
      ...(normalized ? { children: normalized.children ?? [] } : {}),
    };
  });
}

function visitResult(node: unknown, counters: { passed: number; failed: number; skipped: number; failures: unknown[] }): void {
  if (!node || typeof node !== "object") return;
  const record = node as UnknownRecord;
  const state = String(record.state ?? record.result ?? "").toLowerCase();
  if (state === "pass" || state === "passed" || state === "success") counters.passed += 1;
  else if (state === "fail" || state === "failed" || state === "error") {
    counters.failed += 1;
    if (record.id !== undefined) counters.failures.push(record.id);
    else if (record.name !== undefined) counters.failures.push(record.name);
  } else if (state === "skip" || state === "skipped" || state === "todo") counters.skipped += 1;
  for (const key of ["children", "tests", "tasks", "suites", "files"]) {
    const children = record[key];
    if (Array.isArray(children)) for (const child of children) visitResult(child, counters);
  }
}

export function summarizeVitestResults(files: unknown): { passed: number; failed: number; skipped: number; failures: unknown[]; files: string[]; durationMs: number } {
  const counters = { passed: 0, failed: 0, skipped: 0, failures: [] as unknown[] };
  const paths: string[] = [];
  let durationMs = 0;
  if (Array.isArray(files)) {
    for (const file of files) {
      if (file && typeof file === "object") {
        const record = file as UnknownRecord;
        const path = record.filepath ?? record.file ?? record.path;
        if (typeof path === "string") paths.push(path);
        durationMs += getNumber(record.duration ?? record.durationMs);
      }
      visitResult(file, counters);
    }
  }
  return { ...counters, files: [...new Set(paths)], durationMs };
}

export function buildVitestReceipt(input: {
  results?: unknown;
  options: VitestReporterOptions;
}): TestReceiptV1 {
  const summary = summarizeVitestResults(input.results ?? []);
  const options = input.options;
  if (!options.unitId || !options.runId || !options.applicationFingerprint || !options.producerFingerprint) throw new Error("reporter requires unit/run/fingerprint inputs");
  return createTestReceipt({
    testClass: options.testClass ?? "vitest",
    argv: options.argv ?? process.argv.slice(1),
    files: options.files ?? summary.files,
    unitId: options.unitId,
    runId: options.runId,
    applicationFingerprint: options.applicationFingerprint,
    producerFingerprint: options.producerFingerprint,
    preApplicationFingerprint: options.preApplicationFingerprint,
    preProducerFingerprint: options.preProducerFingerprint,
    fixtureHash: options.fixtureHash,
    buildHash: options.buildHash,
    passed: summary.passed,
    failed: summary.failed,
    skipped: summary.skipped,
    durationMs: summary.durationMs,
    failureIds: summary.failures,
  });
}

/**
 * Conditional reporter. Vitest loads reporters in a separate process, so it
 * must stay inert unless ESTIMATE_PERF_TEST_OUTPUT_ROLE is explicitly set.
 */
export class EstimateSheetVitestReporter {
  private startedAt = 0;
  private readonly options: VitestReporterOptions;
  private initialBinding?: {
    runRoot: string;
    runId: string;
    unitId: NonNullable<TestReceiptInput["unitId"]>;
    application: FingerprintContent;
    producer: FingerprintContent;
  };

  constructor(options: VitestReporterOptions = {}) {
    this.options = options;
  }

  onInit(): void {
    this.startedAt = Date.now();
    const env = readReceiptEnvironment();
    if (!env.enabled || !env.authoritativeManifestPath || !env.runRoot || !env.runId || !env.unitId) return;
    const loaded = loadRunFingerprints(env.runRoot, env.unitId);
    this.initialBinding = {
      runRoot: env.runRoot,
      runId: env.runId,
      unitId: env.unitId,
      application: loaded.application,
      producer: loaded.producer,
    };
  }

  async onFinished(files?: unknown): Promise<void> {
    const env = readReceiptEnvironment();
    if (!env.enabled) return;
    const runRoot = this.options.runRoot ?? env.runRoot;
    const unitId = this.options.unitId ?? env.unitId;
    const runId = this.options.runId ?? env.runId;
    if (!runRoot || !unitId || !runId) throw new Error("reporter environment has no run identity");
    const authoritative = env.authoritativeManifestPath ? loadRunFingerprints(runRoot, unitId) : undefined;
    const refreeze = env.focusedAdmissionPath && env.role
      ? readFocusedRefreezeBinding(process.cwd(), env.focusedAdmissionPath, env.role)
      : undefined;
    if (authoritative && (authoritative.run.run_id !== runId || authoritative.run.run_root !== runRoot)) {
      throw new Error("reporter run identity differs from its authoritative manifest");
    }
    if (this.initialBinding && (
      this.initialBinding.runRoot !== runRoot
      || this.initialBinding.runId !== runId
      || this.initialBinding.unitId !== unitId
      || !fingerprintContentEqual(this.initialBinding.application, authoritative?.application)
      || !fingerprintContentEqual(this.initialBinding.producer, authoritative?.producer)
    )) throw new Error("run manifest binding changed during Vitest execution");
    if (authoritative && this.options.applicationFingerprint && !fingerprintContentEqual(authoritative.application, this.options.applicationFingerprint)) {
      throw new Error("explicit application fingerprint conflicts with the authoritative run manifest");
    }
    if (authoritative && this.options.producerFingerprint && !fingerprintContentEqual(authoritative.producer, this.options.producerFingerprint)) {
      throw new Error("explicit producer fingerprint conflicts with the authoritative run manifest");
    }
    const fingerprints = {
      ...this.options,
      applicationFingerprint: authoritative?.application ?? refreeze?.run.applicationFingerprint ?? this.options.applicationFingerprint,
      producerFingerprint: authoritative?.producer ?? refreeze?.run.producerFingerprint ?? this.options.producerFingerprint,
    };
    const receipt = buildVitestReceipt({
      results: files,
      options: {
        ...fingerprints,
        ...this.options,
        runRoot,
        unitId,
        runId,
        fixtureHash: this.options.fixtureHash ?? env.fixtureHash,
        buildHash: this.options.buildHash ?? env.buildHash,
        argv: this.options.argv ?? process.argv.slice(1),
      },
    });
    if (!env.receiptPath || !env.receiptRoot) throw new Error("receipt environment has no rooted output path");
    if (env.authoritativeManifestPath) {
      const refreshed = loadRunFingerprints(runRoot, unitId);
      if (!fingerprintContentEqual(refreshed.application, fingerprints.applicationFingerprint)
        || !fingerprintContentEqual(refreshed.producer, fingerprints.producerFingerprint)) {
        throw new Error("run manifest fingerprints changed before Vitest receipt publication");
      }
    } else if (env.focusedAdmissionPath && env.role) {
      const refreshed = readReceiptEnvironment();
      if (refreshed.runRoot !== runRoot || refreshed.runId !== runId || refreshed.receiptPath !== env.receiptPath) {
        throw new Error("focused refreeze binding changed before Vitest receipt publication");
      }
    }
    writeTestReceipt(env.receiptPath, receipt, env.receiptRoot);
  }

  // Vitest 4 no longer calls the legacy onFinished reporter hook. Keep the
  // receipt normalization in one place while accepting its current lifecycle.
  async onTestRunEnd(testModules: unknown[]): Promise<void> {
    await this.onFinished(normalizeVitestModules(testModules));
  }
}

export function createEstimateSheetVitestReporter(options: VitestReporterOptions = {}): EstimateSheetVitestReporter {
  return new EstimateSheetVitestReporter(options);
}

export default EstimateSheetVitestReporter;
