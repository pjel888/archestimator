import { existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  ESTIMATE_UNITS,
  TEST_RECEIPT_SCHEMA,
  assertNoSensitiveValue,
  assertTestReceipt,
  canonicalJson,
  ensureContainedRunPath,
  fingerprintContentEqual,
  isContained,
  isPlainObject,
  isSha256,
  normalizeArgv,
  readJsonFile,
  resolveRunManifestPath,
  redactedFailureIds,
  sha256File,
  sha256Json,
  writeJsonNoOverwrite,
  type EstimateUnit,
  type FingerprintContent,
  type RunManifestV1,
  type TestReceiptV1,
} from "./estimate-sheet-performance-contract";

export type TestReceiptInput = {
  testClass: "vitest" | "playwright";
  argv: string[];
  files: string[];
  unitId: EstimateUnit;
  runId: string;
  applicationFingerprint: FingerprintContent;
  producerFingerprint: FingerprintContent;
  preApplicationFingerprint?: FingerprintContent;
  preProducerFingerprint?: FingerprintContent;
  fixtureHash?: string;
  buildHash?: string | null;
  workers?: number;
  retries?: number;
  passed?: number;
  failed?: number;
  skipped?: number;
  durationMs?: number;
  failureIds?: unknown[];
  fixtureMutation?: TestReceiptV1["fixtureMutation"];
};

export const TEST_RECEIPT_VERSION = TEST_RECEIPT_SCHEMA;

function ensureUnit(unit: string): EstimateUnit {
  if (!(ESTIMATE_UNITS as readonly string[]).includes(unit)) throw new Error(`invalid test receipt unit: ${unit}`);
  return unit as EstimateUnit;
}

function ensureCount(value: number | undefined, label: string): number {
  const result = value ?? 0;
  if (!Number.isInteger(result) || result < 0) throw new Error(`${label} must be a non-negative integer`);
  return result;
}

function normalizeFiles(files: string[]): string[] {
  const normalized = normalizeArgv(files);
  const seen = new Set<string>();
  for (const file of normalized) {
    if (file.startsWith("-")) throw new Error(`test file cannot be an option: ${file}`);
    if (seen.has(file)) throw new Error(`duplicate test file: ${file}`);
    seen.add(file);
  }
  return normalized;
}

export function createTestReceipt(input: TestReceiptInput): TestReceiptV1 {
  const unitId = ensureUnit(input.unitId);
  const workers = input.workers ?? 1;
  const retries = input.retries ?? 0;
  const passed = ensureCount(input.passed, "passed");
  const failed = ensureCount(input.failed, "failed");
  const skipped = ensureCount(input.skipped, "skipped");
  const durationMs = input.durationMs ?? 0;
  if (workers !== 1) throw new Error("performance test receipts require one worker");
  if (retries !== 0) throw new Error("performance test receipts require zero retries");
  if (!Number.isFinite(durationMs) || durationMs < 0) throw new Error("durationMs must be finite and non-negative");
  if (!fingerprintContentEqual(input.applicationFingerprint, input.preApplicationFingerprint ?? input.applicationFingerprint)) throw new Error("application fingerprint changed during test");
  if (!fingerprintContentEqual(input.producerFingerprint, input.preProducerFingerprint ?? input.producerFingerprint)) throw new Error("producer fingerprint changed during test");
  for (const value of input.argv) assertNoSensitiveValue(value, "argv");
  for (const value of input.files) assertNoSensitiveValue(value, "file");
  const overall: "PASS" | "FAIL" = failed === 0 ? "PASS" : "FAIL";
  const receipt: TestReceiptV1 = {
    schema_version: TEST_RECEIPT_SCHEMA,
    test_class: input.testClass,
    argv: normalizeArgv(input.argv),
    files: normalizeFiles(input.files),
    unit_id: unitId,
    run_id: input.runId,
    application_fingerprint: input.applicationFingerprint,
    producer_fingerprint: input.producerFingerprint,
    pre_application_fingerprint: input.preApplicationFingerprint ?? input.applicationFingerprint,
    pre_producer_fingerprint: input.preProducerFingerprint ?? input.producerFingerprint,
    ...(input.fixtureHash ? { fixture_hash: input.fixtureHash } : {}),
    ...(input.buildHash !== undefined ? { build_hash: input.buildHash } : {}),
    workers,
    retries,
    passed,
    failed,
    skipped,
    duration_ms: Math.round(durationMs * 1000) / 1000,
    overall,
    failure_ids: redactedFailureIds(input.failureIds ?? []),
    ...(input.fixtureMutation ? { fixtureMutation: input.fixtureMutation } : {}),
  };
  assertTestReceipt(receipt);
  return receipt;
}

export function writeTestReceipt(path: string, receipt: TestReceiptV1): void {
  assertTestReceipt(receipt);
  writeJsonNoOverwrite(path, receipt, 0o600);
}

export function readTestReceipt(path: string): TestReceiptV1 {
  const receipt = readJsonFile<TestReceiptV1>(path);
  assertTestReceipt(receipt);
  return receipt;
}

export function receiptOutputPath(input: {
  runRoot: string;
  role: string;
  outputPath?: string;
}): string {
  const name = input.outputPath ?? `receipts/${input.role}.json`;
  return ensureContainedRunPath(input.runRoot, name);
}

export type ReceiptEnvironment = {
  enabled: boolean;
  role?: string;
  fixtureRole?: string;
  runRoot?: string;
  runId?: string;
  unitId?: EstimateUnit;
  receiptPath?: string;
  fixtureHash?: string;
  buildHash?: string | null;
};

export function readReceiptEnvironment(env = process.env): ReceiptEnvironment {
  const role = env.ESTIMATE_PERF_TEST_OUTPUT_ROLE?.trim() || undefined;
  let runRoot = env.ESTIMATE_PERF_RUN_ROOT?.trim() || undefined;
  let runId = env.ESTIMATE_PERF_RUN_ID?.trim() || undefined;
  const unitRaw = env.ESTIMATE_PERF_UNIT?.trim() || undefined;
  const fixtureRole = env.ESTIMATE_PERF_FIXTURE_ROLE?.trim() || undefined;
  const enabled = Boolean(role);
  if (!enabled) return { enabled: false };
  if (!unitRaw) throw new Error("test receipt requires ESTIMATE_PERF_UNIT");
  const unitId = ensureUnit(unitRaw);
  const refreezeAdmission = env.ESTIMATE_PERF_REFREEZE_ADMISSION?.trim() || undefined;
  if (refreezeAdmission) {
    const repoRoot = process.cwd();
    const admissionPath = resolve(repoRoot, refreezeAdmission);
    if (!isContained(repoRoot, admissionPath)) throw new Error("refreeze admission escapes the repository");
    const admission = readJsonFile<Record<string, unknown>>(admissionPath);
    const payload = structuredClone(admission);
    const payloadSha256 = payload.payload_sha256;
    delete payload.payload_sha256;
    const focusedRun = admission.focused_run;
    if (admission.schema_version !== "estimate-sheet-refreeze-admission.v1"
      || admission.status !== "RECORDED"
      || admission.unit_id !== "UNIT-002"
      || payloadSha256 !== sha256Json(payload)
      || !isPlainObject(focusedRun)
      || focusedRun.receipt_role !== role
      || typeof focusedRun.run_root !== "string"
      || typeof focusedRun.run_id !== "string") {
      throw new Error("refreeze admission receipt binding is invalid");
    }
    if (unitId !== "UNIT-002") throw new Error("refreeze test receipts require UNIT-002");
    const admittedRunRoot = resolve(repoRoot, focusedRun.run_root);
    if (!isContained(repoRoot, admittedRunRoot)) throw new Error("refreeze focused run escapes the repository");
    if (runRoot && resolve(runRoot) !== admittedRunRoot) throw new Error("explicit run root conflicts with refreeze admission");
    if (runId && runId !== focusedRun.run_id) throw new Error("explicit run id conflicts with refreeze admission");
    runRoot = admittedRunRoot;
    runId = focusedRun.run_id;
  }
  if (!runRoot || !runId) {
    const manifest = readJsonFile<RunManifestV1>(resolveRunManifestPath(process.cwd(), unitId, env.ESTIMATE_PERF_RUN_MANIFEST));
    runRoot = manifest.run_root;
    runId = manifest.run_id;
  }
  if (!ESTIMATE_UNITS.includes(unitId)) throw new Error(`unsupported receipt unit ${unitId}`);
  const receiptPath = receiptOutputPath({ runRoot, role: role as string, outputPath: env.ESTIMATE_PERF_TEST_RECEIPT_PATH });
  return {
    enabled,
    role,
    fixtureRole,
    runRoot,
    runId,
    unitId,
    receiptPath,
    fixtureHash: env.ESTIMATE_PERF_FIXTURE_HASH?.trim() || undefined,
    buildHash: env.ESTIMATE_PERF_BUILD_HASH === "null" ? null : (env.ESTIMATE_PERF_BUILD_HASH?.trim() || undefined),
  };
}

export function loadRunFingerprints(runRoot: string): {
  application: FingerprintContent;
  producer: FingerprintContent;
  run: RunManifestV1;
} {
  const manifestPath = resolve(runRoot, "run-manifest.json");
  if (!existsSync(manifestPath)) throw new Error(`run manifest is missing: ${manifestPath}`);
  const run = readJsonFile<RunManifestV1>(manifestPath);
  return { application: run.applicationFingerprint, producer: run.producerFingerprint, run };
}

export function loadFixtureHash(path: string): string {
  if (!existsSync(path)) throw new Error(`fixture file is missing: ${path}`);
  const hash = sha256File(path);
  if (!isSha256(hash)) throw new Error("fixture hash calculation failed");
  return hash;
}

export function summarizeReceipt(receipt: TestReceiptV1): string {
  return canonicalJson({
    schema_version: receipt.schema_version,
    unit_id: receipt.unit_id,
    run_id: receipt.run_id,
    files: receipt.files,
    workers: receipt.workers,
    retries: receipt.retries,
    counts: { passed: receipt.passed, failed: receipt.failed, skipped: receipt.skipped },
    overall: receipt.overall,
  });
}
