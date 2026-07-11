import { existsSync, lstatSync } from "node:fs";
import { resolve } from "node:path";
import {
  ESTIMATE_OUTPUT_ROLES,
  ESTIMATE_UNITS,
  TEST_RECEIPT_SCHEMA,
  assertNoSensitiveValue,
  assertSymlinkFreeContainedPath,
  assertTestReceipt,
  canonicalJson,
  ensureDirectoryDurably,
  ensureContainedRunPath,
  fingerprintContentEqual,
  isPlainObject,
  isSafeRelativePath,
  isSha256,
  normalizeArgv,
  readAuthoritativeRunManifest,
  readJsonFile,
  resolveManifestLogicalOutput,
  resolveRunManifestPath,
  redactedFailureIds,
  sha256File,
  sha256Json,
  writeJsonNoOverwrite,
  type EstimateUnit,
  type EstimateOutputRole,
  type FingerprintContent,
  type RunManifestV1,
  type TestReceiptV1,
} from "./estimate-sheet-performance-contract";

type FocusedRefreezeBinding = {
  admission: Record<string, unknown>;
  run: RunManifestV1;
  runRoot: string;
  runId: string;
  unitId: "UNIT-002";
  receiptRole: string;
  runManifestPath: string;
  receiptPath: string;
};

function assertPrivateRegularFile(repoRoot: string, path: string, label: string): void {
  assertSymlinkFreeContainedPath(repoRoot, path, label, {
    requireRegularFile: true,
    requireSingleLink: true,
  });
  const stat = lstatSync(path);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`${label} must be a regular file`);
  if ((stat.mode & 0o077) !== 0) throw new Error(`${label} must be private`);
}

export function readFocusedRefreezeBinding(
  repoRoot: string,
  admissionPath: string,
  expectedRole: string,
): FocusedRefreezeBinding {
  if (expectedRole !== "refreeze-tests") throw new Error("refreeze receipt role must be refreeze-tests");
  const trustedRoot = resolve(repoRoot);
  const absoluteAdmissionPath = resolve(admissionPath);
  assertPrivateRegularFile(trustedRoot, absoluteAdmissionPath, "refreeze admission");
  const admission = readJsonFile<Record<string, unknown>>(absoluteAdmissionPath);
  const payload = structuredClone(admission);
  const payloadSha256 = payload.payload_sha256;
  delete payload.payload_sha256;
  const focusedRun = admission.focused_run;
  if (admission.schema_version !== "estimate-sheet-refreeze-admission.v1"
    || admission.status !== "RECORDED"
    || admission.unit_id !== "UNIT-002"
    || payloadSha256 !== sha256Json(payload)
    || !isPlainObject(focusedRun)
    || canonicalJson(Object.keys(focusedRun).sort()) !== canonicalJson([
      "receipt_role", "run_id", "run_manifest_sha256", "run_root", "unit_id",
    ])) {
    throw new Error("refreeze admission receipt binding is invalid");
  }
  if (focusedRun.unit_id !== "UNIT-002"
    || focusedRun.receipt_role !== "refreeze-tests"
    || typeof focusedRun.run_id !== "string"
    || !focusedRun.run_id
    || typeof focusedRun.run_root !== "string"
    || !isSafeRelativePath(focusedRun.run_root)
    || !isSha256(focusedRun.run_manifest_sha256)) {
    throw new Error("refreeze focused run binding is invalid");
  }
  const runRoot = resolve(trustedRoot, focusedRun.run_root);
  assertSymlinkFreeContainedPath(trustedRoot, runRoot, "refreeze focused run");
  const runRootStat = lstatSync(runRoot);
  if (!runRootStat.isDirectory() || runRootStat.isSymbolicLink() || (runRootStat.mode & 0o077) !== 0) {
    throw new Error("refreeze focused run root must be a private directory");
  }
  const runManifestPath = resolve(runRoot, "run-manifest.json");
  assertPrivateRegularFile(trustedRoot, runManifestPath, "refreeze focused run manifest");
  if (sha256File(runManifestPath) !== focusedRun.run_manifest_sha256) {
    throw new Error("refreeze focused run manifest hash mismatch");
  }
  const run = readJsonFile<RunManifestV1>(runManifestPath);
  const expectedManifestFields = [
    "applicationFingerprint", "cleanupRequirement", "created_at", "mutationJournal", "namespaces",
    "package_id", "pointer_path", "previewProcesses", "producerFingerprint", "profile", "run_id",
    "run_root", "schema_version", "sourceFingerprint", "status", "unit_id",
  ].sort();
  if (!isPlainObject(run)
    || canonicalJson(Object.keys(run).sort()) !== canonicalJson(expectedManifestFields)
    || run.schema_version !== "estimate-sheet-performance-run.v1"
    || run.package_id !== "PLAN-2026-07-08-project-estimate-sheet-performance"
    || run.unit_id !== "UNIT-002"
    || run.run_id !== focusedRun.run_id
    || run.profile !== "artifact-only"
    || run.cleanupRequirement !== "NOT_APPLICABLE"
    || resolve(run.run_root) !== runRoot
    || resolve(run.pointer_path) !== resolve(runRoot, "run-pointer.json")
    || run.status !== "PREPARED"
    || Object.keys(run.namespaces).length !== 0
    || run.mutationJournal.length !== 0
    || run.previewProcesses.length !== 0
    || !fingerprintContentEqual(run.applicationFingerprint, admission.input_application_fingerprint)
    || !fingerprintContentEqual(run.producerFingerprint, admission.input_producer_fingerprint)
    || !isPlainObject(run.sourceFingerprint)
    || !fingerprintContentEqual(run.sourceFingerprint.application, run.applicationFingerprint)
    || !fingerprintContentEqual(run.sourceFingerprint.producer, run.producerFingerprint)) {
    throw new Error("refreeze focused run manifest binding is invalid");
  }
  const pointerPath = resolve(run.pointer_path);
  assertPrivateRegularFile(trustedRoot, pointerPath, "refreeze focused run pointer");
  const pointer = readJsonFile<Record<string, unknown>>(pointerPath);
  if (pointer.schema_version !== "estimate-sheet-performance-run-pointer.v1"
    || pointer.unit_id !== "UNIT-002"
    || pointer.run_id !== run.run_id
    || resolve(String(pointer.run_root)) !== runRoot
    || pointer.run_manifest !== "run-manifest.json"
    || pointer.application_fingerprint !== run.applicationFingerprint.content_sha256
    || pointer.producer_fingerprint !== run.producerFingerprint.content_sha256) {
    throw new Error("refreeze focused run pointer binding is invalid");
  }
  const receiptPath = resolve(runRoot, "receipts", `${expectedRole}.json`);
  ensureDirectoryDurably(resolve(runRoot, "receipts"), 0o700, trustedRoot);
  assertSymlinkFreeContainedPath(trustedRoot, receiptPath, "refreeze focused test receipt", {
    allowMissingLeaf: true,
  });
  if (existsSync(receiptPath)) assertPrivateRegularFile(trustedRoot, receiptPath, "refreeze focused test receipt");
  return {
    admission,
    run,
    runRoot,
    runId: run.run_id,
    unitId: "UNIT-002",
    receiptRole: expectedRole,
    runManifestPath,
    receiptPath,
  };
}

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

export function writeTestReceipt(path: string, receipt: TestReceiptV1, trustedRoot: string): void {
  assertTestReceipt(receipt);
  writeJsonNoOverwrite(path, receipt, 0o600, trustedRoot);
  assertSymlinkFreeContainedPath(trustedRoot, path, "test receipt", {
    requireRegularFile: true,
    requireSingleLink: true,
  });
}

export function readTestReceipt(path: string, trustedRoot: string): TestReceiptV1 {
  const safePath = assertSymlinkFreeContainedPath(trustedRoot, path, "test receipt", {
    requireRegularFile: true,
    requireSingleLink: true,
  });
  const receipt = readJsonFile<TestReceiptV1>(safePath);
  assertSymlinkFreeContainedPath(trustedRoot, safePath, "test receipt", {
    requireRegularFile: true,
    requireSingleLink: true,
  });
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
  receiptRoot?: string;
  authoritativeManifestPath?: string;
  focusedAdmissionPath?: string;
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
  let focusedReceiptPath: string | undefined;
  let focusedAdmissionPath: string | undefined;
  if (refreezeAdmission) {
    const repoRoot = process.cwd();
    const admissionPath = resolve(repoRoot, refreezeAdmission);
    if (unitId !== "UNIT-002") throw new Error("refreeze test receipts require UNIT-002");
    const binding = readFocusedRefreezeBinding(repoRoot, admissionPath, role);
    if (runRoot && resolve(runRoot) !== binding.runRoot) throw new Error("explicit run root conflicts with refreeze admission");
    if (runId && runId !== binding.runId) throw new Error("explicit run id conflicts with refreeze admission");
    runRoot = binding.runRoot;
    runId = binding.runId;
    focusedReceiptPath = binding.receiptPath;
    focusedAdmissionPath = admissionPath;
  }
  let receiptPath: string;
  let receiptRoot: string;
  let authoritativeManifestPath: string | undefined;
  if (refreezeAdmission) {
    if (!runRoot || !runId) throw new Error("refreeze admission did not bind a focused run");
    receiptPath = focusedReceiptPath!;
    receiptRoot = runRoot;
    if (env.ESTIMATE_PERF_TEST_RECEIPT_PATH
      && receiptOutputPath({ runRoot, role: role as string, outputPath: env.ESTIMATE_PERF_TEST_RECEIPT_PATH }) !== receiptPath) {
      throw new Error("explicit refreeze test receipt path conflicts with the admission");
    }
  } else {
    const repoRoot = process.cwd();
    const manifestPath = env.ESTIMATE_PERF_RUN_MANIFEST
      ? resolveRunManifestPath(repoRoot, unitId, env.ESTIMATE_PERF_RUN_MANIFEST)
      : runRoot
        ? resolve(runRoot, "run-manifest.json")
        : resolveRunManifestPath(repoRoot, unitId);
    const manifest = readAuthoritativeRunManifest(repoRoot, manifestPath, unitId);
    if (manifest.unit_id !== unitId) throw new Error("test receipt unit conflicts with the run manifest");
    if (runRoot && resolve(runRoot) !== resolve(manifest.run_root)) throw new Error("explicit run root conflicts with the run manifest");
    if (runId && runId !== manifest.run_id) throw new Error("explicit run id conflicts with the run manifest");
    if (!(ESTIMATE_OUTPUT_ROLES as readonly string[]).includes(role as string)) {
      throw new Error(`unsupported test receipt role ${role}`);
    }
    const canonicalReceiptPath = resolveManifestLogicalOutput(manifest, role as EstimateOutputRole);
    if (env.ESTIMATE_PERF_TEST_RECEIPT_PATH) {
      const explicitReceiptPath = resolve(manifest.immutable_run_root, env.ESTIMATE_PERF_TEST_RECEIPT_PATH);
      if (explicitReceiptPath !== canonicalReceiptPath) {
        throw new Error(`explicit test receipt path conflicts with logical output role ${role}`);
      }
    }
    runRoot = manifest.run_root;
    runId = manifest.run_id;
    receiptPath = canonicalReceiptPath;
    receiptRoot = manifest.immutable_run_root;
    authoritativeManifestPath = manifestPath;
  }
  if (!ESTIMATE_UNITS.includes(unitId)) throw new Error(`unsupported receipt unit ${unitId}`);
  return {
    enabled,
    role,
    fixtureRole,
    runRoot,
    runId,
    unitId,
    receiptPath,
    receiptRoot,
    authoritativeManifestPath,
    focusedAdmissionPath,
    fixtureHash: env.ESTIMATE_PERF_FIXTURE_HASH?.trim() || undefined,
    buildHash: env.ESTIMATE_PERF_BUILD_HASH === "null" ? null : (env.ESTIMATE_PERF_BUILD_HASH?.trim() || undefined),
  };
}

export function loadRunFingerprints(runRoot: string, expectedUnit?: EstimateUnit, repoRoot = process.cwd()): {
  application: FingerprintContent;
  producer: FingerprintContent;
  run: RunManifestV1;
} {
  const manifestPath = resolve(runRoot, "run-manifest.json");
  if (!existsSync(manifestPath)) throw new Error(`run manifest is missing: ${manifestPath}`);
  const run = readAuthoritativeRunManifest(repoRoot, manifestPath, expectedUnit);
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
