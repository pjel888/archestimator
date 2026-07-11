#!/usr/bin/env bun

import { existsSync, lstatSync, readdirSync } from "node:fs";
import { basename, relative, resolve } from "node:path";

import {
  CLEANUP_RECEIPT_SCHEMA,
  MODE_PROOF_SCHEMA,
  canonicalJson,
  cliBoolean,
  cliString,
  defaultRunRoot,
  fingerprintContentEqual,
  isPlainObject,
  parseStrictCli,
  readAuthoritativeRunManifest,
  readJsonFile,
  requireUnit,
  resolveManifestLogicalOutput,
  resolveRunManifestPath,
  sha256File,
  sha256Hex,
  type EstimateUnit,
  type RunManifestV1,
} from "./lib/estimate-sheet-performance-contract";
import { computeEstimateSheetSourceFingerprint } from "./compute-estimate-sheet-source-fingerprint";
import {
  isPortOpen,
  isProcessAlive,
  readPreviewProcessJournal,
  resolveBenchmarkPort,
  resolveBenchmarkRoutePath,
  resolveBenchmarkServerCommand,
  validateOpenNextBuildReceipt,
  validateRuntimeEnvironment,
  validateStorageState,
  type PreviewProcessEntry,
} from "./start-estimate-sheet-benchmark-server";

const PREVIEW_PHASES = new Set(["baseline-all-off", "off", "shadow", "on", "rollback", "final"]);
const CLEANUP_TABLES = new Set([
  "estimate_row_items",
  "estimate_nodes",
  "estimate_tabs",
  "estimate_sheet_access_settings",
  "estimate_sheet_members",
  "estimates",
  "project_members",
  "projects",
  "workspace_members",
  "workspaces",
  "profiles",
  "session",
  "user",
  "legal_terms_acceptances",
  "closed_beta_allowed_emails",
]);

type ValidationStage = "prepared" | "built" | "active" | "cleaned";
type RuntimeValidationManifest = RunManifestV1 & {
  port?: unknown;
  leasedPort?: unknown;
  runtimeEnvSha256?: unknown;
  storageStateSha256?: unknown;
  buildReceipt?: unknown;
  processJournal?: unknown;
  cleanupReceipt?: unknown;
  cleanupReceiptSha256?: unknown;
  fixture_hash?: unknown;
  auth_fixture_hash?: unknown;
};

export type RunValidation = {
  valid: boolean;
  stage: ValidationStage;
  runManifest: string;
  runId: string;
  unitId: string;
  applicationFingerprintMatch: boolean;
  producerFingerprintMatch: boolean;
  sourceFingerprintMatch: boolean;
  pointerValid: boolean;
  runtimeEnvironmentValid: boolean;
  storageStateValid: boolean;
  buildValid: boolean;
  processJournalValid: boolean;
  cleanupValid: boolean;
  artifacts: string[];
  errors: string[];
};

function isSha256(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/u.test(value);
}

function privateRegular(path: string, label: string, errors: string[]): boolean {
  try {
    const stat = lstatSync(path);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || (stat.mode & 0o077) !== 0) {
      errors.push(`${label} must be a private one-link regular file`);
      return false;
    }
    return true;
  } catch (error) {
    errors.push(`${label} unavailable: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

function findManifest(runRoot: string, runId?: string): string {
  if (runRoot.endsWith("run-manifest.json")) return resolve(runRoot);
  if (!runId) throw new Error("run validation requires --unit, --run-manifest, or --run-id");
  const candidates: string[] = [];
  const visit = (root: string) => {
    if (!existsSync(root)) return;
    for (const entry of readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const path = resolve(root, entry.name, "run-manifest.json");
      if (entry.name.startsWith(`${runId}-`) && existsSync(path)) candidates.push(path);
    }
  };
  for (const unit of Array.from({ length: 11 }, (_, index) => `UNIT-${String(index + 1).padStart(3, "0")}`)) {
    visit(resolve(runRoot, unit));
  }
  if (candidates.length !== 1) throw new Error(`expected one run manifest for ${runId}, found ${candidates.length}`);
  return candidates[0]!;
}

function validatePointer(manifest: RuntimeValidationManifest, artifacts: string[], errors: string[]): boolean {
  const expectedPath = resolve(manifest.run_root, "run-pointer.json");
  if (resolve(manifest.pointer_path) !== expectedPath) {
    errors.push("pointer_path must name run-pointer.json inside run root");
    return false;
  }
  if (!privateRegular(expectedPath, "run pointer", errors)) return false;
  artifacts.push(expectedPath);
  try {
    const pointer = readJsonFile<unknown>(expectedPath);
    const expectedKeys = [
      "application_fingerprint",
      "producer_fingerprint",
      "run_id",
      "run_manifest",
      "run_root",
      "schema_version",
      "unit_id",
    ].sort();
    if (!isPlainObject(pointer)
      || canonicalJson(Object.keys(pointer).sort()) !== canonicalJson(expectedKeys)
      || pointer.schema_version !== "estimate-sheet-performance-run-pointer.v1"
      || pointer.unit_id !== manifest.unit_id
      || pointer.run_id !== manifest.run_id
      || resolve(String(pointer.run_root)) !== resolve(manifest.run_root)
      || pointer.run_manifest !== "run-manifest.json"
      || pointer.application_fingerprint !== manifest.applicationFingerprint.content_sha256
      || pointer.producer_fingerprint !== manifest.producerFingerprint.content_sha256) {
      errors.push("run pointer schema or manifest binding is invalid");
      return false;
    }
    return true;
  } catch (error) {
    errors.push(`run pointer invalid: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

function validateNamespaces(manifest: RuntimeValidationManifest, errors: string[]): void {
  const requiredByUnit: Partial<Record<EstimateUnit, string[]>> = {
    "UNIT-002": ["browser"],
    "UNIT-003": ["d1"],
    "UNIT-005": ["mode", "browser", "d1"],
    "UNIT-006": ["mode"],
    "UNIT-007": ["mode", "browser"],
    "UNIT-008": ["mode", "browser"],
    "UNIT-009": ["mode", "browser"],
    "UNIT-010": ["mode", "browser", "d1"],
  };
  const required = requiredByUnit[manifest.unit_id as EstimateUnit] ?? [];
  for (const role of required) if (!Object.prototype.hasOwnProperty.call(manifest.namespaces, role)) errors.push(`${manifest.unit_id} is missing the ${role} namespace`);
  const namespaceIds = new Set<string>();
  const preStates = new Set<string>();
  for (const [role, raw] of Object.entries(manifest.namespaces)) {
    if (!isPlainObject(raw) || !isSha256(raw.idSha256) || !isSha256(raw.preStateSha256)) {
      errors.push(`${role} namespace hashes are invalid`);
      continue;
    }
    if (namespaceIds.has(raw.idSha256)) errors.push("fixture namespace IDs are not isolated");
    namespaceIds.add(raw.idSha256);
    preStates.add(raw.preStateSha256);
  }
  if (Object.keys(manifest.namespaces).length > 1 && preStates.size !== 1) {
    errors.push("fixture namespaces do not share one canonical logical pre-state");
  }
}

function processEntryErrors(entry: PreviewProcessEntry, expectedOrdinal: number, port: number): string[] {
  const errors: string[] = [];
  if (entry.ordinal !== expectedOrdinal) errors.push(`preview ordinal ${expectedOrdinal} is out of order`);
  if (entry.role !== "browser" && entry.role !== "mode") errors.push(`preview ${expectedOrdinal} role is invalid`);
  if (!PREVIEW_PHASES.has(entry.phase)) errors.push(`preview ${expectedOrdinal} phase is invalid`);
  if (!Number.isInteger(entry.pid) || entry.pid <= 0) errors.push(`preview ${expectedOrdinal} PID is invalid`);
  if (entry.port !== port) errors.push(`preview ${expectedOrdinal} port differs from the leased port`);
  if (!isSha256(entry.command_sha256) || !isSha256(entry.requested_snapshot_sha256) || !isSha256(entry.build_hash)) errors.push(`preview ${expectedOrdinal} hashes are invalid`);
  if (sha256Hex(canonicalJson(entry.requested_snapshot)) !== entry.requested_snapshot_sha256) errors.push(`preview ${expectedOrdinal} requested snapshot hash differs`);
  if (entry.readiness !== "READY") errors.push(`preview ${expectedOrdinal} never reached verified readiness`);
  if (Number.isNaN(Date.parse(entry.started_at)) || entry.ready_at === null || Number.isNaN(Date.parse(entry.ready_at))) errors.push(`preview ${expectedOrdinal} readiness timestamps are invalid`);
  const hasExit = entry.exit_code !== null;
  const hasSignal = entry.signal !== null;
  if (hasExit && hasSignal) errors.push(`preview ${expectedOrdinal} has two exit outcomes`);
  if (hasExit && !Number.isInteger(entry.exit_code)) errors.push(`preview ${expectedOrdinal} exit code is invalid`);
  if (hasSignal && entry.signal !== "SIGTERM" && entry.signal !== "SIGKILL") errors.push(`preview ${expectedOrdinal} signal is invalid`);
  if ((hasExit || hasSignal) && (!entry.closed_port || entry.stopped_at === null)) errors.push(`preview ${expectedOrdinal} completed without closed-port proof`);
  if (entry.stopped_at !== null && Number.isNaN(Date.parse(entry.stopped_at))) errors.push(`preview ${expectedOrdinal} stop timestamp is invalid`);
  if (!hasExit && !hasSignal && entry.closed_port) errors.push(`preview ${expectedOrdinal} claims a closed port while active`);
  if (entry.readiness === "READY") {
    if (!entry.server_snapshot || !isSha256(entry.server_snapshot_sha256)) errors.push(`preview ${expectedOrdinal} is ready without a server snapshot`);
    else if (sha256Hex(canonicalJson(entry.server_snapshot)) !== entry.server_snapshot_sha256) errors.push(`preview ${expectedOrdinal} server snapshot hash differs`);
  }
  return errors;
}

function validatePreviewDescriptor(
  manifest: RuntimeValidationManifest,
  entry: PreviewProcessEntry,
  artifacts: string[],
  errors: string[],
): Record<string, unknown> | null {
  if (!PREVIEW_PHASES.has(entry.phase)) return null;
  const prefix = `preview ${entry.ordinal}`;
  const stdoutPath = resolve(manifest.run_root, `preview/logs/${entry.ordinal}-${entry.phase}.stdout.log`);
  const stderrPath = resolve(manifest.run_root, `preview/logs/${entry.ordinal}-${entry.phase}.stderr.log`);
  if (entry.stdout_log !== relative(manifest.run_root, stdoutPath)) errors.push(`${prefix} stdout log path is not exact`);
  if (entry.stderr_log !== relative(manifest.run_root, stderrPath)) errors.push(`${prefix} stderr log path is not exact`);
  if (privateRegular(stdoutPath, `${prefix} stdout log`, errors)) artifacts.push(stdoutPath);
  if (privateRegular(stderrPath, `${prefix} stderr log`, errors)) artifacts.push(stderrPath);

  const descriptorPath = resolve(manifest.run_root, `preview/descriptors/${String(entry.ordinal).padStart(2, "0")}-${entry.phase}.json`);
  if (!privateRegular(descriptorPath, `${prefix} descriptor`, errors)) return null;
  artifacts.push(descriptorPath);
  const descriptor = readJsonFile<unknown>(descriptorPath);
  if (!isPlainObject(descriptor)) {
    errors.push(`${prefix} descriptor is not an object`);
    return null;
  }
  let exactCommand: string[] = [];
  try {
    exactCommand = resolveBenchmarkServerCommand(manifest, entry.port, entry.phase, String(descriptor.final_state));
  } catch (error) {
    errors.push(`${prefix} command contract is invalid: ${error instanceof Error ? error.message : String(error)}`);
  }
  let routePath = "";
  try { routePath = resolveBenchmarkRoutePath(manifest); }
  catch (error) { errors.push(`${prefix} route contract is invalid: ${error instanceof Error ? error.message : String(error)}`); }
  const buildReceiptPath = resolveManifestLogicalOutput(manifest, "opennext-build");
  const descriptorErrors = [
    descriptor.schema_version !== "estimate-sheet-benchmark-server.v1" ? "schema" : null,
    descriptor.unit_id !== manifest.unit_id || descriptor.run_id !== manifest.run_id ? "run identity" : null,
    descriptor.role !== entry.role || descriptor.phase !== entry.phase || descriptor.ordinal !== entry.ordinal ? "process identity" : null,
    descriptor.pid !== entry.pid || descriptor.port !== entry.port ? "PID/port" : null,
    descriptor.base_url !== `http://127.0.0.1:${entry.port}` || descriptor.route_path !== routePath ? "route origin" : null,
    canonicalJson(descriptor.command) !== canonicalJson(exactCommand) || entry.command_sha256 !== sha256Hex(canonicalJson(exactCommand)) ? "exact command" : null,
    descriptor.launched !== true || descriptor.readiness !== "READY" || typeof descriptor.active !== "boolean" ? "launch/readiness" : null,
    descriptor.build_receipt !== manifest.logical_outputs["opennext-build"]
      || !existsSync(buildReceiptPath)
      || descriptor.build_receipt_sha256 !== sha256File(buildReceiptPath) ? "build receipt" : null,
    descriptor.build_hash !== entry.build_hash || !isSha256(descriptor.build_hash) ? "build hash" : null,
    !isSha256(descriptor.runtime_env_sha256) || !isSha256(descriptor.storage_state_sha256) ? "runtime/storage hash" : null,
    descriptor.storage_state_sha256 !== manifest.storageStateSha256 ? "storage-state binding" : null,
    canonicalJson(descriptor.requested_snapshot) !== canonicalJson(entry.requested_snapshot)
      || canonicalJson(descriptor.server_snapshot) !== canonicalJson(entry.server_snapshot) ? "mode snapshots" : null,
    descriptor.process_journal !== "preview/process-journal.json" ? "process journal" : null,
    typeof descriptor.generated_at !== "string" || Number.isNaN(Date.parse(descriptor.generated_at)) ? "generation timestamp" : null,
  ].filter((value): value is string => value !== null);
  if (descriptorErrors.length > 0) errors.push(`${prefix} descriptor differs in ${descriptorErrors.join(", ")}`);
  return descriptor;
}

async function validateProcessLifecycle(
  manifest: RuntimeValidationManifest,
  artifacts: string[],
  errors: string[],
  requireActive: boolean,
): Promise<boolean> {
  if (manifest.evidence_class !== "local-browser") {
    if (manifest.previewProcesses.length || manifest.activePreview !== undefined || manifest.processJournal !== undefined) {
      errors.push("non-browser run contains preview process resources");
      return false;
    }
    return true;
  }
  const port = resolveBenchmarkPort(manifest);
  let journal;
  try { journal = readPreviewProcessJournal(manifest); }
  catch (error) {
    errors.push(`preview process journal invalid: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
  if (journal.processes.length === 0) {
    if (manifest.previewProcesses.length) errors.push("manifest has preview processes without a journal");
    if (requireActive) errors.push("active preview is required but no process has been launched");
    return !requireActive && manifest.previewProcesses.length === 0;
  }
  const journalPath = resolve(manifest.run_root, "preview/process-journal.json");
  if (manifest.processJournal !== journalPath) errors.push("manifest processJournal does not use the fixed run path");
  if (privateRegular(journalPath, "preview process journal", errors)) artifacts.push(journalPath);
  if (canonicalJson(manifest.previewProcesses) !== canonicalJson(journal.processes)) errors.push("manifest previewProcesses differs from the fsynced process journal");
  const pids = new Set<number>();
  const descriptors = new Map<number, Record<string, unknown>>();
  journal.processes.forEach((entry, index) => {
    errors.push(...processEntryErrors(entry, index + 1, port));
    if (pids.has(entry.pid)) errors.push("preview process journal contains a duplicate PID");
    pids.add(entry.pid);
    const descriptor = validatePreviewDescriptor(manifest, entry, artifacts, errors);
    if (descriptor) descriptors.set(entry.pid, descriptor);
    if ((entry.exit_code !== null || entry.signal !== null) && isProcessAlive(entry.pid)) {
      errors.push(`preview ${entry.ordinal} has a durable stop outcome but its PID remains live`);
    }
  });
  const active = journal.processes.filter((entry) => entry.exit_code === null && entry.signal === null);
  if (active.length > 1) errors.push("more than one preview process is active");
  if (manifest.activePreview === undefined) {
    if (active.length !== 0) errors.push("a live journaled preview has no active descriptor");
    if (requireActive) errors.push("active preview descriptor is required");
    return errors.length === 0;
  }
  if (!isPlainObject(manifest.activePreview)
    || typeof manifest.activePreview.path !== "string"
    || !isSha256(manifest.activePreview.sha256)
    || !Number.isInteger(manifest.activePreview.pid)
    || manifest.activePreview.port !== port) {
    errors.push("manifest activePreview binding is invalid");
    return false;
  }
  const activePath = resolve(manifest.activePreview.path);
  if (activePath !== resolve(manifest.run_root, "preview/active-preview.json") || !privateRegular(activePath, "active preview descriptor", errors)) return false;
  artifacts.push(activePath);
  if (sha256File(activePath) !== manifest.activePreview.sha256) errors.push("active preview descriptor hash differs from the manifest");
  const descriptor = readJsonFile<unknown>(activePath);
  const activeEntry = active[0];
  const launchDescriptor = activeEntry ? descriptors.get(activeEntry.pid) : undefined;
  if (!isPlainObject(descriptor)
    || descriptor.schema_version !== "estimate-sheet-benchmark-server.v1"
    || descriptor.unit_id !== manifest.unit_id
    || descriptor.run_id !== manifest.run_id
    || descriptor.active !== true
    || descriptor.readiness !== "READY"
    || descriptor.pid !== manifest.activePreview.pid
    || descriptor.port !== port
    || descriptor.build_hash !== manifest.build_hash
    || descriptor.runtime_env_sha256 !== manifest.runtimeEnvSha256
    || descriptor.storage_state_sha256 !== manifest.storageStateSha256
    || active.length !== 1
    || activeEntry?.pid !== descriptor.pid
    || canonicalJson(descriptor.server_snapshot) !== canonicalJson(activeEntry.server_snapshot)
    || canonicalJson(manifest.activePreview.snapshot) !== canonicalJson(activeEntry.server_snapshot)
    || descriptor.descriptor_path !== `preview/descriptors/${String(activeEntry.ordinal).padStart(2, "0")}-${activeEntry.phase}.json`
    || !isSha256(descriptor.descriptor_sha256)
    || !launchDescriptor
    || descriptor.descriptor_sha256 !== sha256File(resolve(manifest.run_root, String(descriptor.descriptor_path)))
    || canonicalJson(Object.fromEntries(Object.entries(descriptor).filter(([key]) => key !== "descriptor_path" && key !== "descriptor_sha256"))) !== canonicalJson(launchDescriptor)
    || launchDescriptor.active !== true) {
    errors.push("active preview descriptor does not match the sole live journal entry");
  } else if (!isProcessAlive(Number(descriptor.pid)) || !await isPortOpen(port)) {
    errors.push("active preview descriptor points to a dead process or closed port");
  }
  return errors.length === 0;
}

function validateCleanupNamespaceStates(
  manifest: RuntimeValidationManifest,
  receipt: Record<string, unknown>,
  artifacts: string[],
  errors: string[],
): void {
  if (!isPlainObject(receipt.seeded) || !isPlainObject(receipt.deleted) || !isPlainObject(receipt.remaining)) return;
  for (const [role, namespace] of Object.entries(manifest.namespaces)) {
    const path = resolve(manifest.run_root, `cleanup/${role}-state.json`);
    if (!privateRegular(path, `${role} cleanup state`, errors)) continue;
    artifacts.push(path);
    const state = readJsonFile<unknown>(path);
    const expectedSchema = role === "d1"
      ? "estimate-sheet-local-d1-cleanup-state.v1"
      : "estimate-sheet-local-preview-cleanup-state.v1";
    if (!isPlainObject(namespace)
      || !isPlainObject(state)
      || state.schema_version !== expectedSchema
      || state.state !== "CLEANUP_VERIFIED"
      || state.run_id !== manifest.run_id
      || state.fixture_role !== role
      || state.namespace_id_sha256 !== namespace.idSha256
      || !isPlainObject(state.exact_ids)
      || !isPlainObject(state.seeded)
      || !isPlainObject(state.observed_before)
      || !isPlainObject(state.deleted)
      || !isPlainObject(state.remaining)) {
      errors.push(`${role} cleanup state schema or run/namespace binding is invalid`);
      continue;
    }
    const expectedSeeded: Record<string, number> = {};
    for (const [table, rawIds] of Object.entries(state.exact_ids)) {
      if (!CLEANUP_TABLES.has(table)
        || !Array.isArray(rawIds)
        || rawIds.length === 0
        || rawIds.some((id) => typeof id !== "string" || !id)
        || new Set(rawIds).size !== rawIds.length) {
        errors.push(`${role} cleanup state exact IDs are invalid for ${table}`);
        continue;
      }
      expectedSeeded[table] = rawIds.length;
    }
    const receiptSeeded = receipt.seeded[role];
    const receiptDeleted = receipt.deleted[role];
    const receiptRemaining = receipt.remaining[role];
    if (canonicalJson(state.seeded) !== canonicalJson(expectedSeeded)
      || canonicalJson(state.observed_before) !== canonicalJson(expectedSeeded)
      || canonicalJson(state.deleted) !== canonicalJson(expectedSeeded)
      || Object.values(state.remaining).some((count) => count !== 0)
      || canonicalJson(state.seeded) !== canonicalJson(receiptSeeded)
      || canonicalJson(state.deleted) !== canonicalJson(receiptDeleted)
      || canonicalJson(state.remaining) !== canonicalJson(receiptRemaining)) {
      errors.push(`${role} cleanup state does not prove uninterrupted exact-ID reconciliation`);
    }
  }
}

function validateCleanupReceipt(
  manifest: RuntimeValidationManifest,
  artifacts: string[],
  errors: string[],
  requireCleanup: boolean,
): boolean {
  const path = resolveManifestLogicalOutput(manifest, "cleanup");
  if (!existsSync(path)) {
    if (requireCleanup) errors.push("cleanup receipt is required but absent");
    if (manifest.cleanupReceipt !== undefined || manifest.cleanupReceiptSha256 !== undefined) errors.push("manifest binds an absent cleanup receipt");
    return !requireCleanup;
  }
  if (!privateRegular(path, "cleanup receipt", errors)) return false;
  artifacts.push(path);
  if (manifest.cleanupReceipt !== path || manifest.cleanupReceiptSha256 !== sha256File(path)) errors.push("cleanup receipt manifest binding is missing or stale");
  const receipt = readJsonFile<unknown>(path);
  const expectedClass = manifest.evidence_class === "local-browser" ? "local-preview" : manifest.evidence_class === "local-d1" ? "local-d1" : "hosted-d1";
  const expectedKeys = [
    "application_fingerprint",
    "cleanupClass",
    "deleted",
    "environment",
    "errors",
    "generated_at",
    "invalidatedProducer",
    ...(expectedClass === "local-preview" ? ["closedPort", "port", "previewProcesses"] : []),
    "producer_fingerprint",
    "remaining",
    "result",
    "run_id",
    "schema_version",
    "seeded",
    "unit_id",
  ].sort();
  if (!isPlainObject(receipt)
    || receipt.schema_version !== CLEANUP_RECEIPT_SCHEMA
    || receipt.unit_id !== manifest.unit_id
    || receipt.run_id !== manifest.run_id
    || receipt.cleanupClass !== expectedClass
    || receipt.environment !== (expectedClass === "hosted-d1" ? "hosted" : "local")
    || expectedClass !== "hosted-d1" && canonicalJson(Object.keys(receipt).sort()) !== canonicalJson(expectedKeys)
    || !fingerprintContentEqual(receipt.application_fingerprint, manifest.applicationFingerprint)
    || !fingerprintContentEqual(receipt.producer_fingerprint, manifest.producerFingerprint)
    || !isPlainObject(receipt.seeded)
    || !isPlainObject(receipt.deleted)
    || !isPlainObject(receipt.remaining)
    || !Array.isArray(receipt.errors)
    || receipt.errors.length !== 0
    || typeof receipt.generated_at !== "string"
    || Number.isNaN(Date.parse(receipt.generated_at))) {
    errors.push("cleanup receipt schema, run, fingerprints, or count maps are invalid");
    return false;
  }
  if (receipt.result !== "CLEANUP_VERIFIED" || receipt.invalidatedProducer !== false) {
    errors.push("cleanup receipt is recovered/invalidating rather than uninterrupted CLEANUP_VERIFIED");
  }
  if (canonicalJson(Object.keys(receipt.seeded).sort()) !== canonicalJson(Object.keys(manifest.namespaces).sort())
    || canonicalJson(Object.keys(receipt.deleted).sort()) !== canonicalJson(Object.keys(manifest.namespaces).sort())
    || canonicalJson(Object.keys(receipt.remaining).sort()) !== canonicalJson(Object.keys(manifest.namespaces).sort())) {
    errors.push("cleanup receipt does not reconcile every declared namespace role");
  }
  for (const role of Object.keys(manifest.namespaces)) {
    const seeded = receipt.seeded[role];
    const deleted = receipt.deleted[role];
    const remaining = receipt.remaining[role];
    if (!isPlainObject(seeded) || !isPlainObject(deleted) || !isPlainObject(remaining)
      || canonicalJson(seeded) !== canonicalJson(deleted)
      || Object.values(remaining).some((count) => count !== 0)) {
      errors.push(`cleanup counts do not reconcile ${role}`);
    }
  }
  if (expectedClass === "local-preview") {
    if (receipt.closedPort !== true || (receipt.port !== manifest.port && receipt.port !== manifest.leasedPort) || !Array.isArray(receipt.previewProcesses) || receipt.previewProcesses.length === 0) {
      errors.push("local-preview cleanup receipt is missing leased-port/process proof");
    } else if (canonicalJson(receipt.previewProcesses) !== canonicalJson(manifest.previewProcesses)) {
      errors.push("cleanup receipt process list differs from the run manifest");
    }
  } else if (Object.prototype.hasOwnProperty.call(receipt, "port") || Object.prototype.hasOwnProperty.call(receipt, "previewProcesses")) {
    errors.push("non-preview cleanup receipt contains preview fields");
  }
  if (expectedClass !== "hosted-d1") validateCleanupNamespaceStates(manifest, receipt, artifacts, errors);
  return errors.length === 0;
}

function validateModeProof(manifest: RuntimeValidationManifest, artifacts: string[], errors: string[]): void {
  const path = resolveManifestLogicalOutput(manifest, "mode-proof");
  if (!existsSync(path)) return;
  if (!privateRegular(path, "mode proof", errors)) return;
  artifacts.push(path);
  const proof = readJsonFile<unknown>(path);
  if (!isPlainObject(proof)
    || proof.schema_version !== MODE_PROOF_SCHEMA
    || proof.unit_id !== manifest.unit_id
    || proof.run_id !== manifest.run_id
    || !fingerprintContentEqual(proof.application_fingerprint, manifest.applicationFingerprint)
    || !fingerprintContentEqual(proof.producer_fingerprint, manifest.producerFingerprint)
    || proof.fixture_hash !== manifest.fixture_hash
    || proof.auth_fixture_hash !== manifest.auth_fixture_hash
    || proof.build_hash !== manifest.build_hash
    || !Array.isArray(proof.requested_snapshots)
    || !Array.isArray(proof.server_snapshots)
    || !isPlainObject(proof.parity)
    || proof.parity.allRequestedMatch !== true
    || proof.overall !== "PASS"
    || !isPlainObject(proof.active_preview)) {
    errors.push("mode proof is incomplete or does not match the run/build/fingerprint inputs");
  }
}

export async function validateEstimateSheetPerformanceRun(input: {
  repoRoot?: string;
  runRoot?: string;
  runId?: string;
  runManifest?: string;
  unit?: EstimateUnit;
  checkSource?: boolean;
  requireBuild?: boolean;
  requireActivePreview?: boolean;
  requireCleanup?: boolean;
}): Promise<RunValidation> {
  const repoRoot = resolve(input.repoRoot ?? process.cwd());
  let manifestPath: string;
  try {
    manifestPath = input.unit
      ? resolveRunManifestPath(repoRoot, input.unit, input.runManifest)
      : resolve(input.runManifest ?? findManifest(input.runRoot ?? defaultRunRoot(repoRoot), input.runId));
  } catch (error) {
    return {
      valid: false,
      stage: "prepared",
      runManifest: input.runManifest ?? "",
      runId: "",
      unitId: "",
      applicationFingerprintMatch: false,
      producerFingerprintMatch: false,
      sourceFingerprintMatch: false,
      pointerValid: false,
      runtimeEnvironmentValid: false,
      storageStateValid: false,
      buildValid: false,
      processJournalValid: false,
      cleanupValid: false,
      artifacts: [],
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
  const errors: string[] = [];
  const artifacts: string[] = [];
  let manifest: RuntimeValidationManifest;
  try {
    if (!privateRegular(manifestPath, "run manifest", errors)) throw new Error(errors.at(-1) ?? "run manifest unavailable");
    const expectedUnit = input.unit ?? requireUnit(relative(defaultRunRoot(repoRoot), manifestPath).replaceAll("\\", "/").split("/")[0]);
    manifest = readAuthoritativeRunManifest(repoRoot, manifestPath, expectedUnit) as RuntimeValidationManifest;
    artifacts.push(manifestPath);
  } catch (error) {
    return {
      valid: false,
      stage: "prepared",
      runManifest: manifestPath,
      runId: "",
      unitId: "",
      applicationFingerprintMatch: false,
      producerFingerprintMatch: false,
      sourceFingerprintMatch: false,
      pointerValid: false,
      runtimeEnvironmentValid: false,
      storageStateValid: false,
      buildValid: false,
      processJournalValid: false,
      cleanupValid: false,
      artifacts,
      errors: [...errors, error instanceof Error ? error.message : String(error)],
    };
  }
  if (resolve(manifest.run_root, "run-manifest.json") !== manifestPath) errors.push("run_root does not contain run-manifest.json");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u.test(manifest.run_id)) errors.push("run_id is not a v4 UUID");
  if (!basename(manifest.run_root).startsWith(`${manifest.run_id}-`)) errors.push("run root name does not begin with the run UUID");
  if (manifest.status !== "PREPARED") errors.push("run manifest status must remain PREPARED until indexing");
  const pointerValid = validatePointer(manifest, artifacts, errors);
  validateNamespaces(manifest, errors);

  let applicationFingerprintMatch = true;
  let producerFingerprintMatch = true;
  let sourceFingerprintMatch = true;
  if (input.checkSource !== false) {
    try {
      const current = computeEstimateSheetSourceFingerprint({ repoRoot }).fingerprint;
      applicationFingerprintMatch = fingerprintContentEqual(current.application, manifest.applicationFingerprint);
      producerFingerprintMatch = fingerprintContentEqual(current.producer, manifest.producerFingerprint);
      sourceFingerprintMatch = current.head === manifest.sourceFingerprint.head
        && current.path_list_sha256 === manifest.sourceFingerprint.path_list_sha256
        && current.scoped_status_sha256 === manifest.sourceFingerprint.scoped_status_sha256
        && current.scoped_diff_sha256 === manifest.sourceFingerprint.scoped_diff_sha256;
      if (!applicationFingerprintMatch) errors.push("application fingerprint changed");
      if (!producerFingerprintMatch) errors.push("producer fingerprint changed");
      if (!sourceFingerprintMatch) errors.push("source fingerprint changed");
    } catch (error) {
      errors.push(`source fingerprint unavailable: ${error instanceof Error ? error.message : String(error)}`);
      applicationFingerprintMatch = false;
      producerFingerprintMatch = false;
      sourceFingerprintMatch = false;
    }
  }

  let runtimeEnvironmentValid = manifest.evidence_class !== "local-browser";
  let storageStateValid = manifest.evidence_class !== "local-browser";
  let buildValid = false;
  if (manifest.evidence_class === "local-browser") {
    try {
      const port = resolveBenchmarkPort(manifest);
      resolveBenchmarkRoutePath(manifest);
      const runtime = validateRuntimeEnvironment(manifest, port);
      artifacts.push(runtime.path);
      runtimeEnvironmentValid = true;
      const storage = validateStorageState(manifest, port);
      artifacts.push(storage.path);
      storageStateValid = true;
      const wranglerState = resolve(manifest.run_root, "wrangler-state");
      if (!existsSync(wranglerState) || !lstatSync(wranglerState).isDirectory() || lstatSync(wranglerState).isSymbolicLink()) {
        errors.push("run-scoped Wrangler persistence directory is missing or invalid");
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
    const buildReceiptPath = resolveManifestLogicalOutput(manifest, "opennext-build");
    if (existsSync(buildReceiptPath) || input.requireBuild) {
      try {
        const build = validateOpenNextBuildReceipt(manifest, repoRoot);
        artifacts.push(build.path);
        if (manifest.build_hash !== undefined && manifest.build_hash !== build.buildHash) throw new Error("run manifest build hash differs from the build receipt");
        buildValid = true;
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
      }
    }
  } else {
    const forbidden = ["runtimeEnv", "runtimeEnvSha256", "storageState", "storageStateSha256", "activePreview", "processJournal", "port", "leasedPort", "buildReceipt", "build_hash"];
    for (const key of forbidden) if (Object.prototype.hasOwnProperty.call(manifest, key)) errors.push(`${manifest.evidence_class ?? manifest.profile} run cannot contain ${key}`);
    if (manifest.evidence_class === "local-d1") {
      const wranglerState = resolve(manifest.run_root, "wrangler-state");
      if (!existsSync(wranglerState) || !lstatSync(wranglerState).isDirectory()) errors.push("local-d1 run is missing its Wrangler persistence directory");
    }
    buildValid = !input.requireBuild;
  }

  const processErrorsBefore = errors.length;
  await validateProcessLifecycle(manifest, artifacts, errors, Boolean(input.requireActivePreview));
  const processJournalValid = errors.length === processErrorsBefore;
  const cleanupErrorsBefore = errors.length;
  const cleanupReceiptValid = validateCleanupReceipt(manifest, artifacts, errors, Boolean(input.requireCleanup));
  const cleanupValid = cleanupReceiptValid && errors.length === cleanupErrorsBefore;
  validateModeProof(manifest, artifacts, errors);
  const hasValidatedBuild = manifest.evidence_class === "local-browser"
    && buildValid
    && existsSync(resolveManifestLogicalOutput(manifest, "opennext-build"));
  const stage: ValidationStage = cleanupValid && existsSync(resolveManifestLogicalOutput(manifest, "cleanup"))
    ? "cleaned"
    : manifest.activePreview !== undefined
      ? "active"
      : hasValidatedBuild
        ? "built"
        : "prepared";
  return {
    valid: errors.length === 0,
    stage,
    runManifest: manifestPath,
    runId: manifest.run_id,
    unitId: manifest.unit_id,
    applicationFingerprintMatch,
    producerFingerprintMatch,
    sourceFingerprintMatch,
    pointerValid,
    runtimeEnvironmentValid,
    storageStateValid,
    buildValid,
    processJournalValid,
    cleanupValid,
    artifacts: [...new Set(artifacts)].map((path) => relative(repoRoot, path)),
    errors,
  };
}

export async function main(argv = process.argv.slice(2)): Promise<number> {
  const values = parseStrictCli(argv);
  if (cliBoolean(values, "help")) {
    console.log("Usage: bun run scripts/validate-estimate-sheet-performance-run.ts --unit=UNIT-002 [--run-manifest=PATH] [--require-build] [--require-active-preview] [--require-cleanup] [--no-source-check]");
    return 0;
  }
  const unit = cliString(values, "unit");
  const result = await validateEstimateSheetPerformanceRun({
    unit: unit === undefined ? undefined : requireUnit(unit),
    runId: cliString(values, "run-id"),
    runManifest: cliString(values, "run-manifest"),
    runRoot: cliString(values, "run-root"),
    checkSource: !cliBoolean(values, "no-source-check"),
    requireBuild: cliBoolean(values, "require-build"),
    requireActivePreview: cliBoolean(values, "require-active-preview"),
    requireCleanup: cliBoolean(values, "require-cleanup"),
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  return result.valid ? 0 : 1;
}

if (import.meta.main) {
  try { process.exitCode = await main(); }
  catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
}
