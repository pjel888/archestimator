#!/usr/bin/env bun

import { randomBytes } from "node:crypto";
import {
  closeSync,
  existsSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmdirSync,
  rmSync,
} from "node:fs";
import { basename, dirname, extname, isAbsolute, relative, resolve } from "node:path";

import {
  fixturePayloadWithoutLinkage,
  stableStringify,
  type EstimateSheetPerformanceFixture,
} from "../tests/fixtures/estimate-sheet-performance";
import {
  ESTIMATE_UNITS,
  INDEX_SCHEMA,
  assertPerformanceReport,
  assertRegularFile,
  assertSymlinkFreeContainedPath,
  canonicalJson,
  cliBoolean,
  cliString,
  defaultImmutableRunRoot,
  defaultPlanRoot,
  defaultRunRoot,
  ensureDirectoryDurably,
  ensureContainedRunPath,
  fingerprintContentEqual,
  isContained,
  isPlainObject,
  isSha256,
  nowIso,
  parseStrictCli,
  readAuthoritativeRunManifest,
  readLifecycleRunManifest,
  readRefreezeRebindRunManifestPair,
  readJsonFile,
  replaceFileAtomically,
  resolveManifestLogicalOutput,
  resolveRunManifestPath,
  sha256File,
  sha256Hex,
  sha256Json,
  writeJsonNoOverwrite,
  writeNoOverwrite,
  type PerformanceReportV1,
  type EstimateUnit,
  type EstimateOutputRole,
  type RunManifestV1,
  type SourceFingerprint,
} from "./lib/estimate-sheet-performance-contract";
import {
  ESTIMATE_SHEET_RUNTIME_PROJECTIONS,
  ESTIMATE_SHEET_RUNTIME_REGISTRY,
  deriveEstimateSheetFinalCloseoutTransition,
  deriveEstimateSheetRefreezeReopenTransition,
  deriveEstimateSheetReleaseReopenTransition,
  deriveEstimateSheetTechnicalBlockTransition,
  deriveEstimateSheetVerifiedTransition,
  type RiskDisposition,
  type EstimateSheetPlanManifest,
  type RuntimeMaterialization,
} from "./lib/estimate-sheet-performance-plan-state";
import {
  computeEstimateSheetSourceFingerprint,
  finalizedRefreezeReceiptPath,
} from "./compute-estimate-sheet-source-fingerprint";
import {
  assertBottleneckDecision,
  type BottleneckDecisionV1,
  type BottleneckUnit,
} from "./write-estimate-sheet-bottleneck-decision";
import {
  assertSupersessionReceipt,
  type SupersessionReceiptV1,
} from "./write-estimate-sheet-supersession";
import { parseReleaseEvaluationMarkdown } from "./write-estimate-sheet-release-evaluation";
import {
  assertEstimateSheetProofEnvelopeArtifact,
  type ValidatedEstimateSheetProofEnvelopeArtifact,
} from "./measure-estimate-sheet-performance";

const EVIDENCE_INDEX_SCHEMA: typeof INDEX_SCHEMA = "estimate-sheet-evidence-index.v1";

export type EvidenceIndexV1 = {
  schema_version: typeof INDEX_SCHEMA;
  unit_id: RunManifestV1["unit_id"];
  run_id: string;
  status: "VERIFIED" | "BLOCKED" | "INCOMPLETE" | "SUPERSEDED";
  evidence: Array<{ id: string; immutable_path: string; sha256: string }>;
  dependencySources: Array<{ immutable_path: string; sha256: string }>;
  cleanup?: { immutable_path: string; sha256: string };
  projection: { path: string; source: "immutable-run" };
  secondaryEvidence?: Array<{
    role: string;
    immutable_path: string;
    sha256: string;
    projection_path: string;
  }>;
  created_at: string;
  payload_sha256: string;
};

type DurableSource = {
  absolutePath: string;
  relativePath: string;
  bytes: Buffer;
  sha256: string;
};

type PlannedDurableSource = Omit<DurableSource, "absolutePath"> & {
  absolutePath: string;
  trustedRoot: string;
};

type IndexTransitionJournal = {
  schema_version: "estimate-sheet-index-transition-journal.v1";
  state: "PREPARED" | "PROJECTION_WRITTEN" | "COMMITTED";
  unit_id: RunManifestV1["unit_id"];
  run_id: string;
  plan_path: string;
  old_plan_sha256: string;
  old_plan_bytes_base64: string;
  new_plan_sha256: string;
  new_plan_bytes_base64: string;
  immutable_files: Array<{ path: string; sha256: string }>;
  projections: Array<{
    path: string;
    immutable_path: string;
    new_sha256: string;
    old_projection: {
      exists: boolean;
      sha256: string | null;
      bytes_base64: string | null;
    };
  }>;
  created_directories: string[];
  created_at: string;
};

const INDEX_TRANSITION_JOURNAL_SCHEMA = "estimate-sheet-index-transition-journal.v1" as const;
type TransitionFaultPhase = "JOURNAL_PREPARED" | "IMMUTABLE_WRITTEN" | "PROJECTION_WRITTEN" | "MANIFEST_COMMITTED";

function transitionJournalPath(repoRoot: string): string {
  return resolve(defaultRunRoot(repoRoot), "..", "plan-transition-journal.json");
}

function relativeToRepo(repoRoot: string, path: string): string {
  if (!isContained(repoRoot, path)) throw new Error(`transition path escapes repository: ${path}`);
  const value = relative(repoRoot, path).split("\\").join("/");
  if (!value || value.startsWith("../")) throw new Error(`transition path is not repository-relative: ${path}`);
  return value;
}

function resolveJournalPath(repoRoot: string, value: string, label: string): string {
  const path = resolve(repoRoot, value);
  if (!isContained(repoRoot, path)) throw new Error(`${label} escapes repository`);
  return path;
}

function fsyncDirectory(path: string): void {
  const descriptor = openSync(path, "r");
  try { fsyncSync(descriptor); } finally { closeSync(descriptor); }
}

function plannedMissingDirectories(repoRoot: string, paths: readonly string[]): string[] {
  const missing = new Set<string>();
  for (const destination of paths) {
    let cursor = dirname(destination);
    while (cursor !== repoRoot && isContained(repoRoot, cursor) && !existsSync(cursor)) {
      missing.add(cursor);
      cursor = dirname(cursor);
    }
    if (!isContained(repoRoot, cursor)) throw new Error(`destination parent escapes repository: ${destination}`);
  }
  return [...missing]
    .sort((left, right) => left.split("/").length - right.split("/").length || left.localeCompare(right))
    .map((path) => relativeToRepo(repoRoot, path));
}

function createDurableDirectories(repoRoot: string, directories: readonly string[]): void {
  for (const value of directories) {
    const path = resolveJournalPath(repoRoot, value, "created directory");
    if (existsSync(path)) {
      const stats = lstatSync(path);
      if (!stats.isDirectory() || stats.isSymbolicLink()) throw new Error(`transition directory is not a real directory: ${value}`);
      continue;
    }
    const parent = dirname(path);
    const parentStats = lstatSync(parent);
    if (!parentStats.isDirectory() || parentStats.isSymbolicLink()) throw new Error(`transition parent is not a real directory: ${relativeToRepo(repoRoot, parent)}`);
    mkdirSync(path, { mode: 0o700 });
    fsyncDirectory(path);
    fsyncDirectory(parent);
  }
}

function removeFileDurably(path: string, trustedRoot: string): void {
  assertSymlinkFreeContainedPath(trustedRoot, path, "durable file", { requireRegularFile: true, requireSingleLink: true });
  rmSync(path, { force: true });
  fsyncDirectory(dirname(path));
}

function replaceProjection(input: {
  path: string;
  bytes: Buffer;
  expectedExists: boolean;
  expectedSha256: string | null;
  trustedRoot: string;
}): void {
  if (input.expectedExists) {
    if (!input.expectedSha256) throw new Error(`existing projection has no expected hash: ${input.path}`);
    replaceFileAtomically(input.path, input.bytes, input.expectedSha256, 0o644, input.trustedRoot);
    return;
  }
  if (existsSync(input.path)) throw new Error(`projection appeared after validation: ${input.path}`);
  writeNoOverwrite(input.path, input.bytes, 0o644, input.trustedRoot);
}

function updateTransitionJournal(
  path: string,
  journal: IndexTransitionJournal,
  state: IndexTransitionJournal["state"],
  trustedRoot: string,
): IndexTransitionJournal {
  const currentSha256 = sha256File(path);
  const next = { ...journal, state };
  replaceFileAtomically(path, `${canonicalJson(next)}\n`, currentSha256, 0o600, trustedRoot);
  return next;
}

function readTransitionJournal(repoRoot: string): { path: string; journal: IndexTransitionJournal } {
  const path = transitionJournalPath(repoRoot);
  const journal = readJsonFile<IndexTransitionJournal>(path);
  if (journal.schema_version !== INDEX_TRANSITION_JOURNAL_SCHEMA
    || !["PREPARED", "PROJECTION_WRITTEN", "COMMITTED"].includes(journal.state)
    || !(ESTIMATE_UNITS as readonly unknown[]).includes(journal.unit_id)
    || typeof journal.run_id !== "string"
    || !journal.run_id
    || typeof journal.plan_path !== "string"
    || !journal.plan_path
    || typeof journal.old_plan_bytes_base64 !== "string"
    || typeof journal.new_plan_bytes_base64 !== "string"
    || !Array.isArray(journal.immutable_files)
    || !Array.isArray(journal.projections)
    || !Array.isArray(journal.created_directories)
    || !isSha256(journal.old_plan_sha256)
    || !isSha256(journal.new_plan_sha256)
    || typeof journal.created_at !== "string"
    || Number.isNaN(Date.parse(journal.created_at))) {
    throw new Error("index transition journal is invalid");
  }
  return { path, journal };
}

function asInsideRun(manifest: RunManifestV1, path: string, label: string): string {
  const resolved = isAbsolute(path) ? resolve(path) : ensureContainedRunPath(manifest.run_root, path);
  const mutable = isContained(manifest.run_root, resolved);
  const immutable = isContained(manifest.immutable_run_root, resolved);
  if (mutable === immutable) {
    throw new Error(`${label} escapes the prepared mutable and immutable run roots`);
  }
  return assertSymlinkFreeContainedPath(
    mutable ? manifest.run_root : manifest.immutable_run_root,
    resolved,
    label,
    { requireRegularFile: true, requireSingleLink: true },
  );
}

function resolveRunArtifact(manifest: RunManifestV1, value: string): string {
  if (!value.startsWith("auto:")) return value;
  const requestedRole = value.slice("auto:".length);
  const role = requestedRole === "d1-local" ? "d1" : requestedRole === "hosted-d1" ? "hosted" : requestedRole;
  if (!role) throw new Error("auto evidence role is empty");
  return resolveManifestLogicalOutput(manifest, role as EstimateOutputRole);
}

function resolveGateArtifact(manifest: RunManifestV1, value: string): string {
  if (!value.startsWith("auto:")) return ensureContainedRunPath(manifest.run_root, value);
  const role = value.slice("auto:".length);
  if (!/^[a-z0-9][a-z0-9-]*$/u.test(role)) throw new Error("auto gate role is invalid");
  return resolveManifestLogicalOutput(manifest, role as EstimateOutputRole);
}

function assertProjectionIsNotSource(projectionPath: string, sources: string[]): void {
  const normalizedProjection = resolve(projectionPath);
  if (sources.some((source) => resolve(source) === normalizedProjection)) {
    throw new Error("evidence index projection cannot become its own immutable source (cyclic dependency)");
  }
}

function relativeToPlan(planRoot: string, path: string): string {
  if (!isContained(planRoot, path)) throw new Error(`immutable evidence escapes plan root: ${path}`);
  return relative(planRoot, path).split("\\").join("/");
}

function planDurableCopy(
  planRoot: string,
  manifest: RunManifestV1,
  source: string,
  destination: string,
): PlannedDurableSource {
  const trustedSource = asInsideRun(manifest, source, "immutable evidence source");
  const bytes = readFileSync(trustedSource);
  if (existsSync(destination)) throw new Error(`immutable evidence destination already exists: ${destination}`);
  return {
    absolutePath: destination,
    relativePath: relativeToPlan(planRoot, destination),
    bytes,
    sha256: sha256Hex(bytes),
    trustedRoot: manifest.immutable_run_root,
  };
}

function bindExistingDurableSource(planRoot: string, manifest: RunManifestV1, source: string): PlannedDurableSource {
  const trustedSource = asInsideRun(manifest, source, "existing immutable evidence source");
  if (!isContained(planRoot, trustedSource)) throw new Error(`existing immutable evidence escapes plan root: ${source}`);
  const bytes = readFileSync(trustedSource);
  return {
    absolutePath: trustedSource,
    relativePath: relativeToPlan(planRoot, trustedSource),
    bytes,
    sha256: sha256Hex(bytes),
    trustedRoot: manifest.immutable_run_root,
  };
}

function materializeDurableSource(source: PlannedDurableSource): DurableSource {
  writeNoOverwrite(source.absolutePath, source.bytes, 0o600, source.trustedRoot);
  if (sha256File(source.absolutePath) !== source.sha256) throw new Error(`immutable evidence readback mismatch: ${source.absolutePath}`);
  return source;
}

type TransitionLockHandle = {
  path: string;
  ownerId: string;
};

type IndexLockOperation = "INDEX" | "INDEX_RECOVERY";

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return isPlainObject(error) && error.code === "EPERM";
  }
}

function planTransitionLockPath(repoRoot: string): string {
  return resolve(defaultRunRoot(repoRoot), "..", ".plan-transition.lock");
}

function readTransitionLockOwner(lockPath: string): Record<string, unknown> {
  const stat = lstatSync(lockPath);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error("plan transition lock is not a regular directory");
  const ownerPath = resolve(lockPath, "owner.json");
  assertRegularFile(ownerPath, "plan transition lock owner");
  const owner = readJsonFile<Record<string, unknown>>(ownerPath);
  const expected = ["acquired_at", "operation", "owner_id", "pid", "schema_version"].sort();
  if (canonicalJson(Object.keys(owner).sort()) !== canonicalJson(expected)
    || owner.schema_version !== "estimate-sheet-plan-transition-lock.v1"
    || !Number.isInteger(owner.pid)
    || Number(owner.pid) < 1
    || typeof owner.owner_id !== "string"
    || !/^[0-9a-f]{32}$/u.test(owner.owner_id)
    || !["PREPARE", "PREPARE_RECOVERY", "INDEX", "INDEX_RECOVERY"].includes(String(owner.operation))
    || typeof owner.acquired_at !== "string"
    || Number.isNaN(Date.parse(owner.acquired_at))) {
    throw new Error("plan transition lock owner is invalid");
  }
  return owner;
}

function abandonedTransitionLockId(lockPath: string): string {
  const stat = lstatSync(lockPath);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error("plan transition lock is not a regular directory");
  if (Date.now() - stat.mtimeMs < 1_000) {
    throw new Error("incomplete plan transition lock is too recent for safe recovery takeover");
  }
  const entries = readdirSync(lockPath, { withFileTypes: true });
  if (entries.some((entry) => !entry.isFile()
    || (entry.name !== "owner.json" && !entry.name.startsWith("owner.json.tmp-")))) {
    throw new Error("incomplete plan transition lock contains an unowned entry");
  }
  return sha256Hex(canonicalJson({
    mtime_ms: Math.trunc(stat.mtimeMs),
    entries: entries.map((entry) => entry.name).sort(),
  })).slice(0, 32);
}

function removeOwnedTransitionLock(handle: TransitionLockHandle): void {
  if (!existsSync(handle.path)) return;
  const owner = readTransitionLockOwner(handle.path);
  if (owner.owner_id !== handle.ownerId || owner.pid !== process.pid) {
    throw new Error("plan transition lock ownership changed before release");
  }
  rmSync(handle.path, { recursive: true, force: false });
  fsyncDirectory(dirname(handle.path));
}

function acquireTransitionLock(
  repoRoot: string,
  operation: IndexLockOperation,
  allowDeadOwnerTakeover: boolean,
): TransitionLockHandle {
  const lockPath = planTransitionLockPath(repoRoot);
  const lockParent = dirname(lockPath);
  mkdirSync(lockParent, { recursive: true, mode: 0o700 });
  let stalePath: string | undefined;
  try {
    mkdirSync(lockPath, { mode: 0o700 });
    fsyncDirectory(lockParent);
  } catch (error) {
    if (!isPlainObject(error) || error.code !== "EEXIST" || !allowDeadOwnerTakeover) throw error;
    let staleId: string;
    try {
      const owner = readTransitionLockOwner(lockPath);
      if (isProcessAlive(Number(owner.pid))) throw new Error(`plan transition lock is active: ${lockPath}`);
      staleId = String(owner.owner_id);
    } catch (ownerError) {
      if (ownerError instanceof Error && ownerError.message.startsWith("plan transition lock is active:")) throw ownerError;
      staleId = abandonedTransitionLockId(lockPath);
    }
    stalePath = resolve(lockParent, `.plan-transition.lock.stale-${staleId}`);
    if (existsSync(stalePath)) throw new Error("stale plan transition lock quarantine already exists");
    renameSync(lockPath, stalePath);
    fsyncDirectory(lockParent);
    mkdirSync(lockPath, { mode: 0o700 });
    fsyncDirectory(lockParent);
  }
  const ownerId = randomBytes(16).toString("hex");
  try {
    writeJsonNoOverwrite(resolve(lockPath, "owner.json"), {
      schema_version: "estimate-sheet-plan-transition-lock.v1",
      pid: process.pid,
      owner_id: ownerId,
      operation,
      acquired_at: nowIso(),
    }, 0o600, lockPath);
    if (stalePath) {
      const expectedPrefix = resolve(lockParent, ".plan-transition.lock.stale-");
      if (!stalePath.startsWith(expectedPrefix)) throw new Error("stale transition lock quarantine path is not canonical");
      rmSync(stalePath, { recursive: true, force: false });
      fsyncDirectory(lockParent);
    }
    return { path: lockPath, ownerId };
  } catch (error) {
    if (existsSync(lockPath) && !existsSync(resolve(lockPath, "owner.json"))) {
      rmSync(lockPath, { recursive: true, force: false });
      fsyncDirectory(lockParent);
    }
    throw error;
  }
}

function withPlanTransitionLock<T>(
  repoRoot: string,
  operationName: IndexLockOperation,
  operation: () => T,
  options: { allowJournal?: boolean } = {},
): T {
  const lock = acquireTransitionLock(repoRoot, operationName, operationName === "INDEX_RECOVERY");
  try {
    if (!options.allowJournal && existsSync(transitionJournalPath(repoRoot))) {
      throw new Error("an unfinished index transition journal blocks this transition; run perf:estimate:index -- --recover");
    }
    return operation();
  } finally {
    removeOwnedTransitionLock(lock);
  }
}

function withTransitionLock<T>(repoRoot: string, _manifest: RunManifestV1, operation: () => T): T {
  return withPlanTransitionLock(repoRoot, "INDEX", operation);
}

function decodeJournalBytes(value: string, expectedSha256: string, label: string): Buffer {
  const bytes = Buffer.from(value, "base64");
  if (sha256Hex(bytes) !== expectedSha256) throw new Error(`${label} bytes do not match their journal hash`);
  return bytes;
}

function restoreProjectionBeforeCommit(repoRoot: string, projection: ValidatedRecoveryProjection): void {
  const { entry, path } = projection;
  const old = entry.old_projection;
  if (old.exists) {
    if (!old.sha256 || !old.bytes_base64) throw new Error(`projection ${entry.path} has an incomplete old snapshot`);
    const bytes = decodeJournalBytes(old.bytes_base64, old.sha256, `projection ${entry.path} old`);
    if (!existsSync(path)) {
      writeNoOverwrite(path, bytes, 0o644, repoRoot);
      return;
    }
    assertRegularFile(path, `projection ${entry.path}`);
    const currentSha256 = sha256File(path);
    if (currentSha256 === old.sha256) return;
    if (currentSha256 !== entry.new_sha256) throw new Error(`projection ${entry.path} has unrecognized bytes during rollback`);
    replaceFileAtomically(path, bytes, currentSha256, 0o644, repoRoot);
    return;
  }
  if (old.sha256 !== null || old.bytes_base64 !== null) throw new Error(`absent projection ${entry.path} has old bytes`);
  if (!existsSync(path)) return;
  assertRegularFile(path, `projection ${entry.path}`);
  if (sha256File(path) !== entry.new_sha256) throw new Error(`new projection ${entry.path} has unrecognized bytes during rollback`);
  removeFileDurably(path, repoRoot);
}

function removeCreatedDirectories(directories: readonly string[]): void {
  for (const path of [...directories].sort((left, right) => right.split("/").length - left.split("/").length || right.localeCompare(left))) {
    if (!existsSync(path)) continue;
    const stats = lstatSync(path);
    if (!stats.isDirectory() || stats.isSymbolicLink()) throw new Error(`journal-created path is not a real directory: ${path}`);
    if (readdirSync(path).length !== 0) continue;
    const parent = dirname(path);
    rmdirSync(path);
    fsyncDirectory(parent);
  }
}

type RecoveryRuntimeRow = {
  artifactId: string;
  projectionPath: string;
  immutablePath: string | null;
  sha256: string;
  unitId?: RunManifestV1["unit_id"];
};

type ValidatedRecoveryProjection = {
  entry: IndexTransitionJournal["projections"][number];
  path: string;
  immutablePath: string;
};

type ValidatedIndexRecovery = {
  planPath: string;
  immutableFiles: Array<{ entry: IndexTransitionJournal["immutable_files"][number]; path: string }>;
  projections: ValidatedRecoveryProjection[];
  createdDirectories: string[];
};

function parseJournalPlan(value: string, expectedSha256: string, label: string): Record<string, unknown> {
  const bytes = decodeJournalBytes(value, expectedSha256, label);
  let parsed: unknown;
  try {
    parsed = JSON.parse(bytes.toString("utf8"));
  } catch {
    throw new Error(`${label} bytes are not valid JSON`);
  }
  if (!isPlainObject(parsed)) throw new Error(`${label} must be an object`);
  return parsed;
}

function recoveryRuntimeRows(plan: Record<string, unknown>, label: string): RecoveryRuntimeRow[] {
  const runtime = plan.runtime_evidence;
  if (!isPlainObject(runtime) || !Array.isArray(runtime.projections) || !isPlainObject(runtime.registry)) {
    throw new Error(`${label} runtime evidence is invalid`);
  }
  const rows = ESTIMATE_SHEET_RUNTIME_PROJECTIONS.map((spec, index): RecoveryRuntimeRow => {
    const row = runtime.projections[index];
    if (!isPlainObject(row)
      || row.artifact_id !== spec.artifact_id
      || row.projection_path !== spec.projection_path
      || (row.immutable_path !== null && typeof row.immutable_path !== "string")
      || !isSha256(row.sha256)) {
      throw new Error(`${label} runtime row ${spec.artifact_id} is invalid`);
    }
    return {
      artifactId: spec.artifact_id,
      projectionPath: spec.projection_path,
      immutablePath: row.immutable_path as string | null,
      sha256: String(row.sha256),
      unitId: spec.unit_id,
    };
  });
  const registry = runtime.registry;
  if (registry.artifact_id !== ESTIMATE_SHEET_RUNTIME_REGISTRY.artifact_id
    || registry.projection_path !== ESTIMATE_SHEET_RUNTIME_REGISTRY.projection_path
    || (registry.immutable_path !== null && typeof registry.immutable_path !== "string")
    || !isSha256(registry.sha256)) {
    throw new Error(`${label} runtime registry row is invalid`);
  }
  rows.push({
    artifactId: ESTIMATE_SHEET_RUNTIME_REGISTRY.artifact_id,
    projectionPath: ESTIMATE_SHEET_RUNTIME_REGISTRY.projection_path,
    immutablePath: registry.immutable_path as string | null,
    sha256: String(registry.sha256),
  });
  return rows;
}

function escapedRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function validateIndexRecoveryOwnership(
  repoRoot: string,
  journal: IndexTransitionJournal,
): ValidatedIndexRecovery {
  if (!(ESTIMATE_UNITS as readonly unknown[]).includes(journal.unit_id)) throw new Error("index transition journal unit is invalid");
  const planRoot = defaultPlanRoot(repoRoot);
  const planPath = resolveJournalPath(repoRoot, journal.plan_path, "plan path");
  if (planPath !== resolve(planRoot, "plan-pack.json")) {
    throw new Error("index transition journal plan path is not canonical");
  }

  const oldPlan = parseJournalPlan(journal.old_plan_bytes_base64, journal.old_plan_sha256, "old plan");
  const newPlan = parseJournalPlan(journal.new_plan_bytes_base64, journal.new_plan_sha256, "new plan");
  const oldRows = recoveryRuntimeRows(oldPlan, "old plan");
  const newRows = recoveryRuntimeRows(newPlan, "new plan");
  const expectedProjections = new Map<string, {
    immutablePath: string;
    newSha256: string;
    oldSha256: string;
    unitId?: RunManifestV1["unit_id"];
  }>();
  for (const [index, newRow] of newRows.entries()) {
    const oldRow = oldRows[index]!;
    if (newRow.immutablePath === oldRow.immutablePath && newRow.sha256 === oldRow.sha256) continue;
    if (!newRow.immutablePath) throw new Error(`changed runtime row ${newRow.artifactId} has no immutable path`);
    if (newRow.unitId !== undefined && newRow.unitId !== journal.unit_id) {
      throw new Error(`changed runtime row ${newRow.artifactId} is not owned by ${journal.unit_id}`);
    }
    const projectionPath = relativeToRepo(repoRoot, resolve(planRoot, newRow.projectionPath));
    expectedProjections.set(projectionPath, {
      immutablePath: relativeToRepo(repoRoot, resolve(planRoot, newRow.immutablePath)),
      newSha256: newRow.sha256,
      oldSha256: oldRow.sha256,
      ...(newRow.unitId ? { unitId: newRow.unitId } : {}),
    });
  }
  if (journal.projections.length !== expectedProjections.size) {
    throw new Error("index transition journal projection set does not match the plan transition");
  }

  const projectionPaths = new Set<string>();
  const projections = journal.projections.map((entry): ValidatedRecoveryProjection => {
    if (!isPlainObject(entry)
      || typeof entry.path !== "string"
      || typeof entry.immutable_path !== "string"
      || !isSha256(entry.new_sha256)
      || !isPlainObject(entry.old_projection)
      || typeof entry.old_projection.exists !== "boolean") {
      throw new Error("index transition journal projection entry is invalid");
    }
    if (projectionPaths.has(entry.path)) throw new Error("index transition journal projection paths are duplicated");
    projectionPaths.add(entry.path);
    const expected = expectedProjections.get(entry.path);
    if (!expected
      || entry.immutable_path !== expected.immutablePath
      || entry.new_sha256 !== expected.newSha256) {
      throw new Error(`index transition journal projection is not plan-owned: ${entry.path}`);
    }
    const old = entry.old_projection;
    if (old.exists) {
      if (old.sha256 !== expected.oldSha256 || typeof old.bytes_base64 !== "string") {
        throw new Error(`projection ${entry.path} old snapshot is not plan-owned`);
      }
      decodeJournalBytes(old.bytes_base64, old.sha256, `projection ${entry.path} old`);
    } else if (old.sha256 !== null || old.bytes_base64 !== null) {
      throw new Error(`absent projection ${entry.path} has old bytes`);
    }
    return {
      entry,
      path: resolveJournalPath(repoRoot, entry.path, "projection"),
      immutablePath: resolveJournalPath(repoRoot, entry.immutable_path, "projection immutable source"),
    };
  });

  const immutablePaths = new Set<string>();
  const immutableFiles = journal.immutable_files.map((entry) => {
    if (!isPlainObject(entry) || typeof entry.path !== "string" || !isSha256(entry.sha256)) {
      throw new Error("index transition journal immutable entry is invalid");
    }
    if (immutablePaths.has(entry.path)) throw new Error("index transition journal immutable paths are duplicated");
    immutablePaths.add(entry.path);
    return { entry, path: resolveJournalPath(repoRoot, entry.path, "immutable evidence") };
  });

  const ownedArtifactPaths = [
    ...projections.map((entry) => entry.immutablePath),
    ...immutableFiles.map((entry) => entry.path),
  ];
  if (ownedArtifactPaths.length === 0) throw new Error("index transition journal has no owned immutable artifacts");
  const immutableUnitRoot = resolve(defaultImmutableRunRoot(repoRoot), journal.unit_id);
  let runKey: string | undefined;
  for (const path of ownedArtifactPaths) {
    const pathFromUnit = relative(immutableUnitRoot, path).split("\\").join("/");
    const segments = pathFromUnit.split("/");
    if (pathFromUnit.startsWith("../") || segments.length < 2 || !segments[0]) {
      throw new Error(`index transition immutable path is outside ${journal.unit_id}: ${path}`);
    }
    if (runKey === undefined) runKey = segments[0];
    else if (runKey !== segments[0]) throw new Error("index transition immutable paths span multiple runs");
  }
  const runKeyPattern = new RegExp(`^${escapedRegExp(journal.run_id)}-[0-9a-f]{12}-[0-9a-f]{12}$`, "u");
  if (!runKey || !runKeyPattern.test(runKey)) throw new Error("index transition immutable run key does not match journal identity");
  const immutableRunRoot = resolve(immutableUnitRoot, runKey);
  for (const path of ownedArtifactPaths) {
    if (!isContained(immutableRunRoot, path) || path === immutableRunRoot) {
      throw new Error(`index transition immutable path escapes its owned run: ${path}`);
    }
  }

  const relativeImmutableFiles = immutableFiles.map(({ path }) => relative(immutableRunRoot, path).split("\\").join("/"));
  if (projections.length > 0) {
    if (!relativeImmutableFiles.includes("evidence-index.json")) {
      throw new Error("index transition journal does not own its evidence index");
    }
    for (const value of relativeImmutableFiles) {
      if (value === "evidence-index.json"
        || /^dependencies\/\d{2}-[A-Za-z0-9._-]+$/u.test(value)
        || /^dependencies\/proof-children\/\d{2}-[A-Za-z0-9._-]+$/u.test(value)
        || /^cleanup\/[A-Za-z0-9._-]+$/u.test(value)) continue;
      throw new Error(`index transition journal immutable path is not an allowed index artifact: ${value}`);
    }
  } else {
    const transitionFiles = relativeImmutableFiles.filter((value) => value.startsWith("transitions/"));
    if (transitionFiles.length !== 1) throw new Error("plan-only transition must own exactly one transition record");
    const match = /^transitions\/\d{4}-(refreeze_reopen|technical_block|release_reopen|final_closeout)\.json$/u.exec(transitionFiles[0]!);
    if (!match) throw new Error("plan-only transition record path is invalid");
    const outputByTransition: Record<string, string | null> = {
      refreeze_reopen: null,
      technical_block: "technical-block.json",
      release_reopen: "release-reopen.json",
      final_closeout: "final-closeout.json",
    };
    const expectedOutput = outputByTransition[match[1]!];
    const expectedFiles = expectedOutput ? [transitionFiles[0]!, expectedOutput].sort() : [transitionFiles[0]!];
    if (canonicalJson([...relativeImmutableFiles].sort()) !== canonicalJson(expectedFiles)) {
      throw new Error("plan-only transition immutable artifact set is invalid");
    }
  }

  const directoryPaths = new Set<string>();
  const allowedDestinations = [
    ...immutableFiles.map((entry) => entry.path),
    ...projections.map((entry) => entry.path),
  ];
  const createdDirectories = journal.created_directories.map((value) => {
    if (typeof value !== "string") throw new Error("index transition journal created directory is invalid");
    if (directoryPaths.has(value)) throw new Error("index transition journal created directories are duplicated");
    directoryPaths.add(value);
    const path = resolveJournalPath(repoRoot, value, "created directory");
    if (path === planRoot || !isContained(planRoot, path)
      || !allowedDestinations.some((destination) => destination !== path && isContained(path, destination))) {
      throw new Error(`index transition journal created directory is not owned: ${value}`);
    }
    return path;
  });

  return { planPath, immutableFiles, projections, createdDirectories };
}

export function recoverEstimateSheetIndexTransition(input: {
  repoRoot?: string;
} = {}): { result: "NO_JOURNAL" | "ROLLED_BACK" | "COMMITTED"; unit_id?: string; run_id?: string } {
  const repoRoot = resolve(input.repoRoot ?? process.cwd());
  const journalPath = transitionJournalPath(repoRoot);
  return withPlanTransitionLock(repoRoot, "INDEX_RECOVERY", () => {
    if (!existsSync(journalPath)) return { result: "NO_JOURNAL" };
    const { journal } = readTransitionJournal(repoRoot);
    const ownership = validateIndexRecoveryOwnership(repoRoot, journal);
    const { planPath } = ownership;
    assertRegularFile(planPath, "plan manifest");
    const currentPlanSha256 = sha256File(planPath);
    const committed = currentPlanSha256 === journal.new_plan_sha256;
    const preCommit = currentPlanSha256 === journal.old_plan_sha256;
    if (!committed && !preCommit) throw new Error("plan manifest matches neither side of the unfinished index transition");

    if (committed) {
      for (const immutable of ownership.immutableFiles) {
        assertRegularFile(immutable.path, `immutable evidence ${immutable.entry.path}`);
        if (sha256File(immutable.path) !== immutable.entry.sha256) {
          throw new Error(`immutable evidence hash mismatch during recovery: ${immutable.entry.path}`);
        }
      }
      for (const projection of ownership.projections) {
        assertRegularFile(projection.immutablePath, `projection immutable source ${projection.entry.immutable_path}`);
        if (sha256File(projection.immutablePath) !== projection.entry.new_sha256) {
          throw new Error(`projection immutable source hash mismatch: ${projection.entry.immutable_path}`);
        }
        if (existsSync(projection.path)) assertRegularFile(projection.path, `projection ${projection.entry.path}`);
      }
      for (const projection of ownership.projections) {
        const bytes = readFileSync(projection.immutablePath);
        if (!existsSync(projection.path)) writeNoOverwrite(projection.path, bytes, 0o644, repoRoot);
        else {
          const currentSha256 = sha256File(projection.path);
          if (currentSha256 !== projection.entry.new_sha256) {
            replaceFileAtomically(projection.path, bytes, currentSha256, 0o644, repoRoot);
          }
        }
        if (sha256File(projection.path) !== projection.entry.new_sha256) {
          throw new Error(`projection readback mismatch during recovery: ${projection.entry.path}`);
        }
      }
      removeFileDurably(journalPath, repoRoot);
      return { result: "COMMITTED", unit_id: journal.unit_id, run_id: journal.run_id };
    }

    if (journal.state === "COMMITTED") throw new Error("committed journal cannot be rolled back against the old manifest");
    for (const immutable of ownership.immutableFiles) {
      if (!existsSync(immutable.path)) continue;
      assertRegularFile(immutable.path, `immutable evidence ${immutable.entry.path}`);
      if (sha256File(immutable.path) !== immutable.entry.sha256) {
        throw new Error(`immutable evidence changed before rollback: ${immutable.entry.path}`);
      }
    }
    for (const projection of [...ownership.projections].reverse()) restoreProjectionBeforeCommit(repoRoot, projection);
    for (const immutable of [...ownership.immutableFiles].reverse()) {
      if (!existsSync(immutable.path)) continue;
      removeFileDurably(immutable.path, repoRoot);
    }
    removeCreatedDirectories(ownership.createdDirectories);
    removeFileDurably(journalPath, repoRoot);
    return { result: "ROLLED_BACK", unit_id: journal.unit_id, run_id: journal.run_id };
  }, { allowJournal: true });
}

function assertPayloadHash(value: Record<string, unknown>, label: string): void {
  if (!isSha256(value.payload_sha256)) throw new Error(`${label} payload hash is missing`);
  const payload = structuredClone(value);
  delete payload.payload_sha256;
  if (sha256Json(payload) !== value.payload_sha256) throw new Error(`${label} payload hash mismatch`);
}

export function commitEstimateSheetPlanOnlyTransition(input: {
  repoRoot: string;
  planPath: string;
  expectedPlanSha256: string;
  previousPlanBytes: Buffer;
  next: EstimateSheetPlanManifest;
  journalRoot: string;
  transition: string;
  unitId: RunManifestV1["unit_id"];
  runId: string;
  durableFiles?: Array<{ path: string; bytes: Buffer }>;
  faultInjector?: (phase: TransitionFaultPhase) => void;
}): void {
  if (!input.runId) throw new Error("plan-only transition run ID is required");
  if (!isContained(input.repoRoot, input.planPath) || !isContained(input.repoRoot, input.journalRoot)) {
    throw new Error("plan-only transition paths must stay inside the repository");
  }
  ensureDirectoryDurably(input.journalRoot, 0o700, input.repoRoot);
  assertSymlinkFreeContainedPath(input.repoRoot, input.journalRoot, "plan-only transition journal root");
  if (sha256Hex(input.previousPlanBytes) !== input.expectedPlanSha256) {
    throw new Error("plan-only transition previous bytes do not match the expected plan hash");
  }
  const nextBytes = Buffer.from(`${JSON.stringify(input.next, null, 2)}\n`, "utf8");
  const sequence = input.next.runtime_evidence.transition_sequence;
  const transitionRecord = {
    schema_version: "estimate-sheet-plan-transition-journal.v1",
    transition: input.transition,
    unit_id: input.unitId,
    run_id: input.runId,
    sequence,
    old_manifest_sha256: sha256Hex(input.previousPlanBytes),
    new_manifest_sha256: sha256Hex(nextBytes),
    old_manifest_bytes_base64: input.previousPlanBytes.toString("base64"),
    new_manifest_bytes_base64: nextBytes.toString("base64"),
    created_at: input.next.updated_at,
  };
  const transitionPath = resolve(input.journalRoot, "transitions", `${String(sequence).padStart(4, "0")}-${input.transition.toLowerCase()}.json`);
  const plannedSources: PlannedDurableSource[] = [
    ...(input.durableFiles ?? []).map((entry) => ({
      absolutePath: entry.path,
      relativePath: relativeToRepo(input.repoRoot, entry.path),
      bytes: entry.bytes,
      sha256: sha256Hex(entry.bytes),
      trustedRoot: input.journalRoot,
    })),
    {
      absolutePath: transitionPath,
      relativePath: relativeToRepo(input.repoRoot, transitionPath),
      bytes: Buffer.from(`${canonicalJson(transitionRecord)}\n`, "utf8"),
      sha256: sha256Hex(`${canonicalJson(transitionRecord)}\n`),
      trustedRoot: input.journalRoot,
    },
  ];
  const uniquePaths = new Set(plannedSources.map((source) => source.absolutePath));
  if (uniquePaths.size !== plannedSources.length) throw new Error("plan-only transition durable paths must be unique");
  for (const source of plannedSources) {
    if (!isContained(input.journalRoot, source.absolutePath)) throw new Error("plan-only transition durable path escapes its immutable journal root");
    if (existsSync(source.absolutePath)) throw new Error(`immutable transition output already exists: ${source.absolutePath}`);
  }

  const journalPath = transitionJournalPath(input.repoRoot);
  const createdDirectories = plannedMissingDirectories(input.repoRoot, plannedSources.map((source) => source.absolutePath));
  const journal: IndexTransitionJournal = {
    schema_version: INDEX_TRANSITION_JOURNAL_SCHEMA,
    state: "PREPARED",
    unit_id: input.unitId,
    run_id: input.runId,
    plan_path: relativeToRepo(input.repoRoot, input.planPath),
    old_plan_sha256: input.expectedPlanSha256,
    old_plan_bytes_base64: input.previousPlanBytes.toString("base64"),
    new_plan_sha256: sha256Hex(nextBytes),
    new_plan_bytes_base64: nextBytes.toString("base64"),
    immutable_files: plannedSources.map((source) => ({ path: source.relativePath, sha256: source.sha256 })),
    projections: [],
    created_directories: createdDirectories,
    created_at: input.next.updated_at,
  };
  writeJsonNoOverwrite(journalPath, journal, 0o600, input.repoRoot);
  input.faultInjector?.("JOURNAL_PREPARED");

  createDurableDirectories(input.repoRoot, createdDirectories);
  for (const source of plannedSources) materializeDurableSource(source);
  input.faultInjector?.("IMMUTABLE_WRITTEN");

  let currentJournal = updateTransitionJournal(journalPath, journal, "PROJECTION_WRITTEN", input.repoRoot);
  input.faultInjector?.("PROJECTION_WRITTEN");
  replaceFileAtomically(input.planPath, nextBytes, input.expectedPlanSha256, 0o644, dirname(input.planPath));
  currentJournal = updateTransitionJournal(journalPath, currentJournal, "COMMITTED", input.repoRoot);
  input.faultInjector?.("MANIFEST_COMMITTED");

  if (sha256File(input.planPath) !== currentJournal.new_plan_sha256) throw new Error("plan-only transition plan readback mismatch");
  for (const source of plannedSources) {
    if (sha256File(source.absolutePath) !== source.sha256) throw new Error(`plan-only transition output readback mismatch: ${source.relativePath}`);
  }
  removeFileDurably(journalPath, input.repoRoot);
}

function currentRunManifest(repoRoot: string, unitId: EstimateUnit, runId: string): RunManifestV1 {
  const unitRoot = resolve(defaultRunRoot(repoRoot), unitId);
  if (!existsSync(unitRoot)) throw new Error(`run root is missing for ${unitId}/${runId}`);
  const matches = readdirSync(unitRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory()
      && entry.name.startsWith(`${runId}-`)
      && /^[0-9a-f]{12}-[0-9a-f]{12}$/u.test(entry.name.slice(runId.length + 1)))
    .map((entry) => resolve(unitRoot, entry.name, "run-manifest.json"))
    .filter((path) => existsSync(path))
    .map((path) => readLifecycleRunManifest(repoRoot, path, unitId))
    .filter((manifest) => manifest.unit_id === unitId && manifest.run_id === runId);
  if (matches.length !== 1) throw new Error(`run manifest identity is ambiguous for ${unitId}/${runId}`);
  return matches[0]!;
}

export function reopenEstimateSheetUnitOne(input: {
  repoRoot?: string;
  planRoot?: string;
  refreezeAdmission: string;
}): { unit_id: "UNIT-001"; receipt_path: string; transition_sequence: number } {
  const repoRoot = resolve(input.repoRoot ?? process.cwd());
  const planRoot = resolve(input.planRoot ?? defaultPlanRoot(repoRoot));
  const admissionPath = resolve(repoRoot, input.refreezeAdmission);
  if (!isContained(repoRoot, admissionPath)) throw new Error("refreeze admission escapes the repository");
  assertRegularFile(admissionPath, "refreeze admission");
  const receiptPath = finalizedRefreezeReceiptPath(admissionPath);
  assertRegularFile(receiptPath, "finalized refreeze receipt");
  const admission = readJsonFile<Record<string, unknown>>(admissionPath);
  const receipt = readJsonFile<Record<string, unknown>>(receiptPath);
  assertPayloadHash(admission, "refreeze admission");
  assertPayloadHash(receipt, "finalized refreeze receipt");
  if (admission.schema_version !== "estimate-sheet-refreeze-admission.v1"
    || admission.status !== "RECORDED"
    || receipt.schema_version !== "estimate-sheet-refreeze-receipt.v1"
    || receipt.unit_id !== "UNIT-002"
    || receipt.replacement_unit_id !== "UNIT-001"
    || canonicalJson(receipt.predecessor) !== canonicalJson(admission.predecessor)
    || canonicalJson(receipt.input_application_fingerprint) !== canonicalJson(admission.input_application_fingerprint)
    || canonicalJson(receipt.input_producer_fingerprint) !== canonicalJson(admission.input_producer_fingerprint)
    || canonicalJson(receipt.invalidated_ids) !== canonicalJson(["UNIT-001", "EVID-002", "UNIT-002", "UNIT-003", "UNIT-004"])) {
    throw new Error("finalized refreeze receipt does not match its admission");
  }
  const currentFingerprint = computeEstimateSheetSourceFingerprint({ repoRoot }).fingerprint;
  if (!fingerprintContentEqual(receipt.output_application_fingerprint, currentFingerprint.application)
    || !fingerprintContentEqual(receipt.output_producer_fingerprint, currentFingerprint.producer)) {
    throw new Error("source changed after refreeze finalization");
  }
  const focusedRun = admission.focused_run;
  if (!isPlainObject(focusedRun) || typeof focusedRun.run_root !== "string" || typeof focusedRun.run_id !== "string") {
    throw new Error("refreeze focused run binding is invalid");
  }

  return withPlanTransitionLock(repoRoot, "INDEX", () => {
    const planPath = resolve(planRoot, "plan-pack.json");
    const planFileSha256 = sha256File(planPath);
    const previousPlanBytes = readFileSync(planPath);
    const plan = readJsonFile<EstimateSheetPlanManifest>(planPath);
    const predecessor = receipt.predecessor;
    if (!isPlainObject(predecessor)
      || predecessor.unit_id !== "UNIT-001"
      || typeof predecessor.run_id !== "string"
      || !predecessor.run_id
      || predecessor.index_immutable_path !== plan.runtime_evidence.registry.immutable_path
      || predecessor.index_sha256 !== plan.runtime_evidence.registry.sha256) {
      throw new Error("refreeze predecessor no longer matches the current immutable UNIT-001 index");
    }
    const predecessorIndexPath = resolve(planRoot, predecessor.index_immutable_path);
    const journalRoot = dirname(predecessorIndexPath);
    const immutableUnitRoot = resolve(defaultImmutableRunRoot(repoRoot), "UNIT-001");
    const runKey = relative(immutableUnitRoot, journalRoot).split("\\").join("/");
    if (basename(predecessorIndexPath) !== "evidence-index.json"
      || !isContained(immutableUnitRoot, predecessorIndexPath)
      || runKey.includes("/")
      || !new RegExp(`^${escapedRegExp(predecessor.run_id)}-[0-9a-f]{12}-[0-9a-f]{12}$`, "u").test(runKey)) {
      throw new Error("refreeze predecessor immutable index path is not canonical");
    }
    const unitTwo = plan.units.find((unit) => unit.id === "UNIT-002");
    if (unitTwo?.status === "IN_PROGRESS") {
      if (plan.runtime_evidence.latest_unit_id !== "UNIT-002" || !plan.runtime_evidence.latest_run_id) {
        throw new Error("in-progress UNIT-002 has no current run identity");
      }
      const attempt = currentRunManifest(repoRoot, "UNIT-002", plan.runtime_evidence.latest_run_id);
      if (!['CLEANUP_VERIFIED', 'INVALIDATED'].includes(attempt.status)) {
        throw new Error("in-progress UNIT-002 must be cleanup-verified or invalidated before refreeze reopen");
      }
    }
    const updatedAt = nowIso();
    const next = deriveEstimateSheetRefreezeReopenTransition(plan, {
      updatedAt,
      runManifestSha256: sha256File(resolve(journalRoot, "run-manifest.json")),
    });
    commitEstimateSheetPlanOnlyTransition({
      repoRoot,
      planPath,
      expectedPlanSha256: planFileSha256,
      previousPlanBytes,
      next,
      journalRoot,
      transition: "REFREEZE_REOPEN",
      unitId: "UNIT-001",
      runId: predecessor.run_id,
    });
    return { unit_id: "UNIT-001", receipt_path: receiptPath, transition_sequence: next.runtime_evidence.transition_sequence };
  });
}

type SpecialTransitionResult = {
  transition: "TECHNICAL_BLOCK" | "RELEASE_REOPEN" | "FINAL_CLOSEOUT";
  output_path: string;
  transition_sequence: number;
};

function resolveCurrentUnitRun(repoRoot: string, plan: EstimateSheetPlanManifest, unitId: "UNIT-011"): RunManifestV1 {
  if (plan.runtime_evidence.latest_unit_id !== unitId || !plan.runtime_evidence.latest_run_id) {
    throw new Error(`${unitId} is not the current plan run`);
  }
  const manifest = currentRunManifest(repoRoot, unitId, plan.runtime_evidence.latest_run_id);
  if (!fingerprintContentEqual(manifest.applicationFingerprint, manifest.sourceFingerprint.application)
    || !fingerprintContentEqual(manifest.producerFingerprint, manifest.sourceFingerprint.producer)) {
    throw new Error(`${unitId} run manifest fingerprint pair is internally inconsistent`);
  }
  const current = computeEstimateSheetSourceFingerprint({ repoRoot }).fingerprint;
  if (!fingerprintContentEqual(current.application, manifest.applicationFingerprint)
    || !fingerprintContentEqual(current.producer, manifest.producerFingerprint)) {
    throw new Error(`${unitId} run fingerprints are stale`);
  }
  return manifest;
}

function exactImmutableRunOutput(
  repoRoot: string,
  planRoot: string,
  manifest: RunManifestV1,
  requested: string,
  basenameValue: string,
): string {
  const expected = resolve(manifest.immutable_run_root, basenameValue);
  const resolved = isAbsolute(requested)
    ? resolve(requested)
    : requested.startsWith("evidence/")
      ? resolve(planRoot, requested)
      : resolve(repoRoot, requested);
  if (!isContained(manifest.immutable_run_root, resolved) || resolved !== expected) {
    throw new Error(`transition output must be the current immutable run path ${relativeToPlan(planRoot, expected)}`);
  }
  return resolved;
}

function commandRecoveryAttempts(manifest: RunManifestV1): Array<Record<string, unknown>> {
  const receiptsRoot = resolve(manifest.immutable_run_root, "receipts");
  if (!existsSync(receiptsRoot)) return [];
  return readdirSync(receiptsRoot, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /^command-[a-z0-9-]+\.json$/u.test(entry.name))
    .map((entry) => resolve(receiptsRoot, entry.name))
    .sort()
    .map((path) => {
      const receipt = readJsonFile<Record<string, unknown>>(path);
      if (receipt.schema_version !== "estimate-sheet-command-receipt.v1"
        || receipt.unit_id !== "UNIT-011"
        || receipt.run_id !== manifest.run_id
        || typeof receipt.role !== "string"
        || !["PASS", "FAIL"].includes(String(receipt.overall))
        || !isSha256(receipt.redacted_output_sha256)
        || !fingerprintContentEqual(receipt.application_fingerprint, manifest.applicationFingerprint)
        || !fingerprintContentEqual(receipt.producer_fingerprint, manifest.producerFingerprint)) {
        throw new Error(`invalid recovery command receipt: ${basename(path)}`);
      }
      return {
        role: receipt.role,
        overall: receipt.overall,
        exit_code: receipt.exit_code ?? null,
        signal: receipt.signal ?? null,
        redacted_output_sha256: receipt.redacted_output_sha256,
        receipt_sha256: sha256File(path),
      };
    });
}

export function writeEstimateSheetTechnicalBlock(input: {
  repoRoot?: string;
  planRoot?: string;
  unit: string;
  output: string;
  reasonCode: string;
}): SpecialTransitionResult {
  if (input.unit !== "UNIT-011") throw new Error("technical block is restricted to UNIT-011");
  if (!["HOSTED_PROOF_UNAVAILABLE", "PROVIDER_FAILURE", "RECOVERY_EXHAUSTED"].includes(input.reasonCode)) {
    throw new Error("technical block reason code is invalid");
  }
  const repoRoot = resolve(input.repoRoot ?? process.cwd());
  const planRoot = resolve(input.planRoot ?? defaultPlanRoot(repoRoot));
  return withPlanTransitionLock(repoRoot, "INDEX", () => {
    const planPath = resolve(planRoot, "plan-pack.json");
    const expectedPlanSha256 = sha256File(planPath);
    const previousPlanBytes = readFileSync(planPath);
    const plan = readJsonFile<EstimateSheetPlanManifest>(planPath);
    const manifest = resolveCurrentUnitRun(repoRoot, plan, "UNIT-011");
    const outputPath = exactImmutableRunOutput(repoRoot, planRoot, manifest, input.output, "technical-block.json");
    const recoveryAttempts = commandRecoveryAttempts(manifest);
    if (!recoveryAttempts.length || recoveryAttempts.every((attempt) => attempt.overall === "PASS")) {
      throw new Error("technical block requires a failed exhausted recovery attempt");
    }
    const createdAt = nowIso();
    const payload = {
      schema_version: "estimate-sheet-technical-block.v1",
      unit_id: "UNIT-011",
      run_id: manifest.run_id,
      reason_code: input.reasonCode,
      recovery_attempts: recoveryAttempts,
      evidence_ids: ["EVID-011"],
      source_fingerprint: manifest.sourceFingerprint,
      application_fingerprint: manifest.applicationFingerprint,
      producer_fingerprint: manifest.producerFingerprint,
      created_at: createdAt,
    };
    const next = deriveEstimateSheetTechnicalBlockTransition(plan, {
      runId: manifest.run_id,
      updatedAt: createdAt,
      releaseStatus: plan.release_status === "NOT_READY" ? "NOT_READY" : "NOT_EVALUATED",
    });
    commitEstimateSheetPlanOnlyTransition({
      repoRoot,
      planPath,
      expectedPlanSha256,
      previousPlanBytes,
      next,
      journalRoot: dirname(outputPath),
      transition: "TECHNICAL_BLOCK",
      unitId: "UNIT-011",
      runId: manifest.run_id,
      durableFiles: [{ path: outputPath, bytes: Buffer.from(`${canonicalJson(payload)}\n`, "utf8") }],
    });
    return { transition: "TECHNICAL_BLOCK", output_path: outputPath, transition_sequence: next.runtime_evidence.transition_sequence };
  });
}

function parseReleaseEvaluationPayload(path: string): Record<string, unknown> {
  assertRegularFile(path, "release evaluation");
  return parseReleaseEvaluationMarkdown(readFileSync(path, "utf8"));
}

function currentReleaseEvaluation(input: {
  planRoot: string;
  plan: EstimateSheetPlanManifest;
  manifest: RunManifestV1;
}): { evaluation: Record<string, unknown>; path: string; immutablePath: string; sha256: string } {
  const rows = input.plan.runtime_evidence.projections.filter((row) => row.artifact_id === "ART-051");
  if (rows.length !== 1 || !rows[0]!.immutable_path || !isSha256(rows[0]!.sha256)) {
    throw new Error("ART-051 release evaluation is not indexed");
  }
  const row = rows[0]!;
  const immutablePath = resolve(input.planRoot, row.immutable_path!);
  if (!isContained(input.planRoot, immutablePath)) throw new Error("ART-051 immutable path escapes the plan root");
  assertRegularFile(immutablePath, "ART-051 release evaluation");
  if (sha256File(immutablePath) !== row.sha256) throw new Error("ART-051 immutable hash mismatch");
  const evaluation = parseReleaseEvaluationPayload(immutablePath);
  if (evaluation.schema_version !== "estimate-sheet-release-evaluation.v1"
    || evaluation.unit_id !== "UNIT-011"
    || evaluation.run_id !== input.manifest.run_id
    || !fingerprintContentEqual(evaluation.application_fingerprint, input.manifest.applicationFingerprint)
    || !fingerprintContentEqual(evaluation.producer_fingerprint, input.manifest.producerFingerprint)) {
    throw new Error("ART-051 release evaluation identity mismatch");
  }
  return { evaluation, path: immutablePath, immutablePath: row.immutable_path!, sha256: row.sha256 };
}

export function writeEstimateSheetReleaseReopen(input: {
  repoRoot?: string;
  planRoot?: string;
  output: string;
  reasonCode: string;
  supersedingReleaseEvidence: string;
}): SpecialTransitionResult {
  if (!/^[a-z0-9][a-z0-9-]*$/u.test(input.reasonCode)) throw new Error("release reopen reason code is invalid");
  if (input.supersedingReleaseEvidence !== "auto:release") throw new Error("release reopen requires auto:release evidence");
  const repoRoot = resolve(input.repoRoot ?? process.cwd());
  const planRoot = resolve(input.planRoot ?? defaultPlanRoot(repoRoot));
  return withPlanTransitionLock(repoRoot, "INDEX", () => {
    const planPath = resolve(planRoot, "plan-pack.json");
    const expectedPlanSha256 = sha256File(planPath);
    const previousPlanBytes = readFileSync(planPath);
    const plan = readJsonFile<EstimateSheetPlanManifest>(planPath);
    const manifest = resolveCurrentUnitRun(repoRoot, plan, "UNIT-011");
    const release = currentReleaseEvaluation({ planRoot, plan, manifest });
    if (release.evaluation.status !== "NOT_READY" || plan.release_status !== "NOT_READY") {
      throw new Error("release reopen requires the current NOT_READY release evaluation");
    }
    const outputPath = exactImmutableRunOutput(repoRoot, planRoot, manifest, input.output, "release-reopen.json");
    const createdAt = nowIso();
    const payload = {
      schema_version: "estimate-sheet-release-reopen.v1",
      unit_id: "UNIT-011",
      prior_release_status: "NOT_READY",
      reason_code: input.reasonCode,
      superseding_release_evidence: { immutable_path: release.immutablePath, sha256: release.sha256 },
      source_fingerprint: manifest.sourceFingerprint,
      application_fingerprint: manifest.applicationFingerprint,
      producer_fingerprint: manifest.producerFingerprint,
      created_at: createdAt,
    };
    const next = deriveEstimateSheetReleaseReopenTransition(plan, { updatedAt: createdAt });
    commitEstimateSheetPlanOnlyTransition({
      repoRoot,
      planPath,
      expectedPlanSha256,
      previousPlanBytes,
      next,
      journalRoot: dirname(outputPath),
      transition: "RELEASE_REOPEN",
      unitId: "UNIT-011",
      runId: manifest.run_id,
      durableFiles: [{ path: outputPath, bytes: Buffer.from(`${canonicalJson(payload)}\n`, "utf8") }],
    });
    return { transition: "RELEASE_REOPEN", output_path: outputPath, transition_sequence: next.runtime_evidence.transition_sequence };
  });
}

function finalRiskDispositions(plan: EstimateSheetPlanManifest): RiskDisposition[] {
  const evidenceByUnit: Readonly<Record<string, string>> = {
    "UNIT-001": "EVID-002",
    "UNIT-002": "EVID-003",
    "UNIT-003": "EVID-004",
    "UNIT-004": "EVID-013",
    "UNIT-005": "EVID-005",
    "UNIT-006": "EVID-006",
    "UNIT-007": "EVID-007",
    "UNIT-008": "EVID-008",
    "UNIT-009": "EVID-009",
    "UNIT-010": "EVID-010",
    "UNIT-011": "EVID-011",
  };
  return (plan.risks ?? [])
    .filter((risk) => ["OPEN", "REALIZED"].includes(risk.status))
    .map((risk) => {
      const unitIds = Array.isArray(risk.unit_ids) ? risk.unit_ids : [];
      const evidenceIds = [...new Set(unitIds.map((unitId) => evidenceByUnit[String(unitId)]).filter((value): value is string => Boolean(value)))].sort();
      if (evidenceIds.length === 0 || evidenceIds.some((evidenceId) => plan.evidence_index.find((row) => row.id === evidenceId)?.status !== "PASS")) {
        throw new Error(`risk ${risk.id} has no complete passing evidence chain`);
      }
      return {
        riskId: risk.id,
        disposition: "MITIGATED" as const,
        evidenceIds,
        rationale: `${risk.id} is mitigated by its completed unit evidence chain: ${evidenceIds.join(", ")}.`,
      };
    });
}

export function writeEstimateSheetFinalCloseout(input: {
  repoRoot?: string;
  planRoot?: string;
  output: string;
  releaseEvidence: string;
}): SpecialTransitionResult {
  if (input.releaseEvidence !== "auto:release") throw new Error("final closeout requires auto:release evidence");
  const repoRoot = resolve(input.repoRoot ?? process.cwd());
  const planRoot = resolve(input.planRoot ?? defaultPlanRoot(repoRoot));
  return withPlanTransitionLock(repoRoot, "INDEX", () => {
    const planPath = resolve(planRoot, "plan-pack.json");
    const expectedPlanSha256 = sha256File(planPath);
    const previousPlanBytes = readFileSync(planPath);
    const plan = readJsonFile<EstimateSheetPlanManifest>(planPath);
    const manifest = resolveCurrentUnitRun(repoRoot, plan, "UNIT-011");
    const release = currentReleaseEvaluation({ planRoot, plan, manifest });
    if (release.evaluation.status !== "READY" || plan.release_status !== "READY") {
      throw new Error("final closeout requires the current READY release evaluation");
    }
    const outputPath = exactImmutableRunOutput(repoRoot, planRoot, manifest, input.output, "final-closeout.json");
    const riskDispositions = finalRiskDispositions(plan);
    const createdAt = nowIso();
    const payload = {
      schema_version: "estimate-sheet-final-closeout.v1",
      unit_id: "UNIT-011",
      run_id: manifest.run_id,
      release_status: "READY",
      risk_dispositions: riskDispositions.map((entry) => ({
        risk_id: entry.riskId,
        disposition: entry.disposition,
        evidence_ids: entry.evidenceIds,
        rationale: entry.rationale,
      })),
      release_evidence: { immutable_path: release.immutablePath, sha256: release.sha256 },
      source_fingerprint: manifest.sourceFingerprint,
      application_fingerprint: manifest.applicationFingerprint,
      producer_fingerprint: manifest.producerFingerprint,
      created_at: createdAt,
    };
    const next = deriveEstimateSheetFinalCloseoutTransition(plan, { updatedAt: createdAt, riskDispositions });
    commitEstimateSheetPlanOnlyTransition({
      repoRoot,
      planPath,
      expectedPlanSha256,
      previousPlanBytes,
      next,
      journalRoot: dirname(outputPath),
      transition: "FINAL_CLOSEOUT",
      unitId: "UNIT-011",
      runId: manifest.run_id,
      durableFiles: [{ path: outputPath, bytes: Buffer.from(`${canonicalJson(payload)}\n`, "utf8") }],
    });
    return { transition: "FINAL_CLOSEOUT", output_path: outputPath, transition_sequence: next.runtime_evidence.transition_sequence };
  });
}

function validatePrimaryEvidence(path: string, manifest: RunManifestV1, role: string): {
  report?: PerformanceReportV1;
  proofEnvelope?: ValidatedEstimateSheetProofEnvelopeArtifact;
} {
  if (role === "decision") {
    const decision = readJsonFile<BottleneckDecisionV1>(path);
    assertBottleneckDecision(decision);
    if (manifest.unit_id !== "UNIT-004" || decision.run_id !== manifest.run_id
      || !fingerprintContentEqual(decision.application_fingerprint, manifest.applicationFingerprint)
      || !fingerprintContentEqual(decision.producer_fingerprint, manifest.producerFingerprint)) {
      throw new Error("decision evidence run identity or fingerprint mismatch");
    }
    return {};
  }
  if (["integration", "unit-proof"].includes(role)) {
    return {
      proofEnvelope: assertEstimateSheetProofEnvelopeArtifact({
        runManifest: ensureContainedRunPath(manifest.run_root, "run-manifest.json"),
        envelopePath: path,
      }),
    };
  }
  if (!["jsdom", "browser", "d1-local", "hosted-d1"].includes(role)) {
    JSON.parse(readFileSync(path, "utf8"));
    return {};
  }
  const report = readJsonFile<PerformanceReportV1>(path);
  assertPerformanceReport(report, { strict: true });
  if (report.trace.unitId !== manifest.unit_id || report.runId !== manifest.run_id) {
    throw new Error("primary evidence run identity mismatch");
  }
  if (!fingerprintContentEqual(report.applicationFingerprint, manifest.applicationFingerprint)
    || !fingerprintContentEqual(report.producerFingerprint, manifest.producerFingerprint)) {
    throw new Error("primary evidence fingerprint mismatch");
  }
  return { report };
}

function validateFixtureEvidence(path: string, manifest: RunManifestV1, report?: PerformanceReportV1): void {
  const fixture = readJsonFile<EstimateSheetPerformanceFixture>(path);
  if (fixture.schemaVersion !== "estimate-sheet-performance-fixture.v1"
    || fixture.runId !== manifest.run_id
    || fixture.fingerprints.application !== manifest.applicationFingerprint.content_sha256
    || fixture.fingerprints.producer !== manifest.producerFingerprint.content_sha256) {
    throw new Error("fixture evidence identity mismatch");
  }
  if (!report) return;
  const fixturePayloadSha256 = sha256Hex(stableStringify(fixturePayloadWithoutLinkage(fixture)));
  const reportPayloadSha256 = sha256Hex(canonicalJson(report));
  const bundleSha256 = sha256Hex(canonicalJson({ fixturePayloadSha256, reportPayloadSha256 }));
  if (report.fixtureHash !== fixturePayloadSha256
    || fixture.linkage.counterpartPayloadSha256 !== reportPayloadSha256
    || fixture.linkage.bundleSha256 !== bundleSha256) {
    throw new Error("fixture/report reciprocal linkage mismatch");
  }
}

function parseReleaseEvaluation(path: string, manifest: RunManifestV1): "READY" | "NOT_READY" {
  const markdown = readFileSync(path, "utf8");
  const evaluation = parseReleaseEvaluationMarkdown(markdown);
  if (evaluation.run_id !== manifest.run_id
    || !fingerprintContentEqual(evaluation.application_fingerprint, manifest.applicationFingerprint)
    || !fingerprintContentEqual(evaluation.producer_fingerprint, manifest.producerFingerprint)) {
    throw new Error("release evaluation run identity mismatch");
  }
  return evaluation.status === "READY" ? "READY" : "NOT_READY";
}

function assertPassingGateReceipt(path: string, manifest: RunManifestV1, expectedRole: string): void {
  const receipt = readJsonFile<Record<string, unknown>>(path);
  if (receipt.schema_version !== "estimate-sheet-command-receipt.v1"
    || receipt.role !== expectedRole
    || receipt.unit_id !== manifest.unit_id
    || receipt.run_id !== manifest.run_id
    || receipt.overall !== "PASS"
    || receipt.exit_code !== 0
    || receipt.signal !== null
    || !Array.isArray(receipt.argv)
    || !isSha256(receipt.redacted_output_sha256)
    || !fingerprintContentEqual(receipt.application_fingerprint, manifest.applicationFingerprint)
    || !fingerprintContentEqual(receipt.producer_fingerprint, manifest.producerFingerprint)
    || !fingerprintContentEqual(receipt.pre_application_fingerprint, manifest.applicationFingerprint)
    || !fingerprintContentEqual(receipt.pre_producer_fingerprint, manifest.producerFingerprint)
    || !fingerprintContentEqual(receipt.post_application_fingerprint, manifest.applicationFingerprint)
    || !fingerprintContentEqual(receipt.post_producer_fingerprint, manifest.producerFingerprint)) {
    throw new Error(`gate receipt ${expectedRole} is not a current passing receipt`);
  }
}

function assertZeroCounts(value: unknown, label: string): void {
  if (!isPlainObject(value) || Object.values(value).some((role) => !isPlainObject(role)
    || Object.values(role).some((count) => !Number.isInteger(count) || Number(count) !== 0))) {
    throw new Error(`${label} must contain only zero integer counts`);
  }
}

function resolveLocalCleanupReceipt(manifest: RunManifestV1, value: string): string {
  const candidate = value === "auto:cleanup"
    ? resolveManifestLogicalOutput(manifest, "cleanup")
    : ensureContainedRunPath(manifest.run_root, value);
  const path = asInsideRun(manifest, candidate, "local cleanup receipt");
  const receipt = readJsonFile<Record<string, unknown>>(path);
  if (receipt.schema_version !== "estimate-sheet-cleanup-receipt.v1"
    || receipt.unit_id !== manifest.unit_id
    || receipt.run_id !== manifest.run_id
    || receipt.environment !== "local"
    || !["local-preview", "local-d1"].includes(String(receipt.cleanupClass))
    || receipt.result !== "CLEANUP_VERIFIED"
    || receipt.invalidatedProducer !== false
    || !fingerprintContentEqual(receipt.application_fingerprint, manifest.applicationFingerprint)
    || !fingerprintContentEqual(receipt.producer_fingerprint, manifest.producerFingerprint)) {
    throw new Error("cleanup receipt is not a current uninterrupted local cleanup");
  }
  assertZeroCounts(receipt.remaining, "cleanup remaining counts");
  if (!isPlainObject(receipt.seeded) || !isPlainObject(receipt.deleted)
    || canonicalJson(receipt.seeded) !== canonicalJson(receipt.deleted)) {
    throw new Error("cleanup seeded/deleted counts do not match");
  }
  if (receipt.cleanupClass === "local-preview") {
    if (!Number.isInteger(receipt.port) || receipt.closedPort !== true
      || !Array.isArray(receipt.previewProcesses) || receipt.previewProcesses.length === 0
      || receipt.previewProcesses.some((entry) => !isPlainObject(entry)
        || entry.closed_port !== true
        || ((entry.exit_code === null) === (entry.signal === null)))) {
      throw new Error("local-preview cleanup process outcomes are incomplete");
    }
  } else if (receipt.port !== undefined || receipt.closedPort !== undefined || receipt.previewProcesses !== undefined) {
    throw new Error("local-d1 cleanup receipt contains preview fields");
  }
  return path;
}

function resolveEmbeddedHostedCleanup(manifest: RunManifestV1, report: PerformanceReportV1 | undefined): string {
  if (!report || report.evidenceClass !== "hosted-d1" || !isPlainObject(report.cleanup)) {
    throw new Error("embedded cleanup requires the current hosted D1 report");
  }
  const wrapper = report.cleanup;
  if (!isPlainObject(wrapper.embedded_receipt) || typeof wrapper.immutable_path !== "string" || !isSha256(wrapper.sha256)) {
    throw new Error("hosted cleanup wrapper is invalid");
  }
  const path = asInsideRun(
    manifest,
    ensureContainedRunPath(manifest.run_root, wrapper.immutable_path),
    "hosted cleanup receipt",
  );
  const receipt = readJsonFile<Record<string, unknown>>(path);
  if (sha256File(path) !== wrapper.sha256 || canonicalJson(receipt) !== canonicalJson(wrapper.embedded_receipt)) {
    throw new Error("hosted cleanup embedded/external receipt mismatch");
  }
  const payload = { ...receipt };
  const payloadSha256 = payload.payload_sha256;
  delete payload.payload_sha256;
  if (receipt.schema_version !== "estimate-sheet-cleanup-receipt.v1"
    || receipt.cleanupClass !== "hosted-d1"
    || receipt.unit_id !== "UNIT-011"
    || receipt.run_id !== manifest.run_id
    || receipt.state !== "CLEANUP_VERIFIED"
    || receipt.invalidatedProducer !== false
    || !isSha256(payloadSha256)
    || sha256Json(payload) !== payloadSha256
    || !isPlainObject(receipt.seeded)
    || !isPlainObject(receipt.deleted)
    || canonicalJson(receipt.seeded) !== canonicalJson(receipt.deleted)
    || !isPlainObject(receipt.remaining)
    || Object.values(receipt.remaining).some((count) => !Number.isInteger(count) || Number(count) !== 0)) {
    throw new Error("hosted cleanup receipt is not a current uninterrupted cleanup");
  }
  return path;
}

function validateCurrentSupersessionDecision(input: {
  planRoot: string;
  plan: EstimateSheetPlanManifest;
  manifest: RunManifestV1;
  decisionPath: string | undefined;
  receipt: SupersessionReceiptV1;
}): void {
  const expectedProjection = "evidence/runtime/bottleneck-decision.json";
  if (!input.decisionPath || resolve(input.decisionPath) !== resolve(input.planRoot, expectedProjection)) {
    throw new Error(`SUPERSEDED indexing requires --decision=${expectedProjection}`);
  }
  const rows = input.plan.runtime_evidence.projections.filter((row) => row.artifact_id === "ART-043");
  if (rows.length !== 1 || rows[0]!.projection_path !== expectedProjection
    || !rows[0]!.immutable_path || !isSha256(rows[0]!.sha256)) {
    throw new Error("current ART-043 decision binding is unavailable");
  }
  const row = rows[0]!;
  const projection = resolve(input.planRoot, expectedProjection);
  const immutable = resolve(input.planRoot, row.immutable_path!);
  if (!isContained(input.planRoot, immutable)) throw new Error("current decision immutable path escapes the plan root");
  assertRegularFile(projection, "current decision projection");
  assertRegularFile(immutable, "current decision immutable source");
  if (sha256File(projection) !== row.sha256 || sha256File(immutable) !== row.sha256) {
    throw new Error("current decision projection/immutable hash mismatch");
  }
  const decision = readJsonFile<BottleneckDecisionV1>(immutable);
  assertBottleneckDecision(decision);
  const unit = input.manifest.unit_id as BottleneckUnit;
  if (decision.branches[unit]?.action !== "supersede"
    || input.receipt.unit_id !== unit
    || input.receipt.run_id !== input.manifest.run_id
    || input.receipt.decision_path !== expectedProjection
    || input.receipt.decision_immutable_path !== row.immutable_path
    || input.receipt.decision_sha256 !== row.sha256
    || !fingerprintContentEqual(input.receipt.application_fingerprint, input.manifest.applicationFingerprint)
    || !fingerprintContentEqual(input.receipt.producer_fingerprint, input.manifest.producerFingerprint)) {
    throw new Error("supersession receipt is not bound to the current decision and run");
  }
}

export function updateEstimateSheetPerformanceEvidenceIndex(input: {
  repoRoot?: string;
  planRoot?: string;
  immutableRunRoot?: string;
  runManifest: string;
  evidenceId?: string;
  evidencePath: string;
  projectPath: string;
  status?: EvidenceIndexV1["status"];
  dependencies?: string[];
  gates?: string[];
  decision?: string;
  cleanupReceipt?: string;
  cleanupNotApplicable?: boolean;
  secondary?: Array<{ role: string; evidencePath: string; projectPath: string }>;
  sourceFingerprint?: SourceFingerprint;
  faultInjector?: (phase: "JOURNAL_PREPARED" | "IMMUTABLE_WRITTEN" | "PROJECTION_WRITTEN" | "MANIFEST_COMMITTED") => void;
}): { index: EvidenceIndexV1; indexPath: string; projectionPath: string } {
  const repoRoot = resolve(input.repoRoot ?? process.cwd());
  const planRoot = resolve(input.planRoot ?? defaultPlanRoot(repoRoot));
  const immutableRunRoot = resolve(input.immutableRunRoot ?? defaultImmutableRunRoot(repoRoot));
  const runManifestPath = resolve(input.runManifest);
  const lockedManifest = readAuthoritativeRunManifest(repoRoot, runManifestPath);

  return withTransitionLock(repoRoot, lockedManifest, () => {
    const manifest = readAuthoritativeRunManifest(repoRoot, runManifestPath, lockedManifest.unit_id);
    const planPath = resolve(planRoot, "plan-pack.json");
    const planFileSha256 = sha256File(planPath);
    const plan = readJsonFile<EstimateSheetPlanManifest>(planPath);
    if (plan.runtime_evidence.latest_unit_id !== manifest.unit_id
      || plan.runtime_evidence.latest_run_id !== manifest.run_id) {
      throw new Error("run is not the committed latest plan run");
    }
    const currentFingerprint = input.sourceFingerprint ?? computeEstimateSheetSourceFingerprint({ repoRoot }).fingerprint as SourceFingerprint;
    if (!fingerprintContentEqual(currentFingerprint.application, manifest.applicationFingerprint)
      || !fingerprintContentEqual(currentFingerprint.producer, manifest.producerFingerprint)) {
      throw new Error("run manifest fingerprint is stale for indexing");
    }

    const unitSpecs = ESTIMATE_SHEET_RUNTIME_PROJECTIONS.filter((spec) => spec.unit_id === manifest.unit_id);
    const primarySpec = unitSpecs.find((spec) => spec.relationship === "PRIMARY");
    if (!primarySpec) throw new Error(`no registered primary evidence for ${manifest.unit_id}`);
    const evidenceId = input.evidenceId ?? primarySpec.evidence_id;
    if (evidenceId !== primarySpec.evidence_id) throw new Error(`evidence id for ${manifest.unit_id} must be ${primarySpec.evidence_id}`);
    const unitStatus = input.status ?? "VERIFIED";
    if (!["VERIFIED", "SUPERSEDED"].includes(unitStatus)) {
      throw new Error("ordinary indexing accepts only VERIFIED or SUPERSEDED terminal transitions");
    }
    if (unitStatus === "SUPERSEDED" && !["UNIT-005", "UNIT-006", "UNIT-007", "UNIT-008", "UNIT-009"].includes(manifest.unit_id)) {
      throw new Error(`${manifest.unit_id} cannot be indexed as SUPERSEDED`);
    }

    const primaryProjection = resolve(input.projectPath);
    if (relativeToPlan(planRoot, primaryProjection) !== primarySpec.projection_path) {
      throw new Error(`primary projection for ${manifest.unit_id} must be ${primarySpec.projection_path}`);
    }
    const secondaryInputs = input.secondary ?? [];
    const secondarySpecs = unitSpecs.filter((spec) => spec.relationship === "SECONDARY");
    if (secondaryInputs.length !== secondarySpecs.length) throw new Error(`${manifest.unit_id} requires ${secondarySpecs.length} secondary projections`);
    for (const spec of secondarySpecs) {
      const selected = secondaryInputs.find((entry) => entry.role === spec.role);
      if (!selected || relativeToPlan(planRoot, resolve(selected.projectPath)) !== spec.projection_path) {
        throw new Error(`secondary projection ${spec.role} must be ${spec.projection_path}`);
      }
    }

    const evidencePath = asInsideRun(manifest, resolveRunArtifact(manifest, input.evidencePath), "evidence source");
    const primaryValidation = validatePrimaryEvidence(evidencePath, manifest, primarySpec.role);
    const report = primaryValidation.report;
    const proofChildren = primaryValidation.proofEnvelope?.children ?? [];
    const secondary = secondaryInputs.map((entry) => {
      const source = asInsideRun(manifest, resolveRunArtifact(manifest, entry.evidencePath), "secondary evidence source");
      if (entry.role === "fixture") validateFixtureEvidence(source, manifest, report);
      return { ...entry, evidencePath: source, projectPath: resolve(entry.projectPath) };
    });
    if (unitStatus === "SUPERSEDED") {
      const supersession = readJsonFile<SupersessionReceiptV1>(evidencePath);
      assertSupersessionReceipt(supersession);
      validateCurrentSupersessionDecision({
        planRoot,
        plan,
        manifest,
        decisionPath: input.decision,
        receipt: supersession,
      });
    } else if (input.decision !== undefined) {
      throw new Error("--decision is accepted only for SUPERSEDED indexing");
    }
    const releaseStatus = manifest.unit_id === "UNIT-011"
      ? parseReleaseEvaluation(secondary.find((entry) => entry.role === "release")!.evidencePath, manifest)
      : undefined;
    const gateReferences = input.gates ?? [];
    const requiredGateRoles = manifest.unit_id === "UNIT-002"
      ? ["browser-check"]
      : manifest.unit_id === "UNIT-003"
        ? ["d1-check"]
        : [];
    const gateRoles = gateReferences.map((reference) => reference.replace(/^auto:/u, ""));
    if (canonicalJson(gateRoles) !== canonicalJson(requiredGateRoles)) {
      throw new Error(`${manifest.unit_id} index requires gates ${requiredGateRoles.join(",") || "none"}`);
    }
    const gatePaths = gateReferences.map((reference, index) => {
      const path = asInsideRun(manifest, resolveGateArtifact(manifest, reference), "gate dependency");
      assertPassingGateReceipt(path, manifest, requiredGateRoles[index]!);
      return path;
    });
    const dependencyPaths = [
      ...(input.dependencies ?? []).map((path) => asInsideRun(manifest, resolveRunArtifact(manifest, path), "dependency source")),
      ...gatePaths,
    ];
    const admissionPath = manifest.admissionPath
      ? asInsideRun(manifest, resolve(manifest.immutable_run_root, manifest.admissionPath), "admission dependency")
      : undefined;
    const admissionRequiredUnits = new Set(["UNIT-001", "UNIT-005", "UNIT-006", "UNIT-007", "UNIT-008", "UNIT-009", "UNIT-010", "UNIT-011"]);
    if (admissionRequiredUnits.has(manifest.unit_id) && !admissionPath) throw new Error(`${manifest.unit_id} index requires its immutable admission dependency`);
    if (admissionPath && sha256File(admissionPath) !== manifest.admissionSha256) throw new Error("admission dependency hash mismatch");
    const cleanupPath = input.cleanupReceipt === "embedded"
      ? resolveEmbeddedHostedCleanup(manifest, report)
      : input.cleanupReceipt
        ? resolveLocalCleanupReceipt(manifest, input.cleanupReceipt)
        : undefined;
    if (manifest.cleanupRequirement === "NOT_APPLICABLE") {
      if (!input.cleanupNotApplicable || cleanupPath) throw new Error("NOT_APPLICABLE indexing requires --cleanup-not-applicable and no cleanup receipt");
      if (manifest.previewProcesses.length || manifest.mutationJournal.length || Object.keys(manifest.namespaces).length) {
        throw new Error("NOT_APPLICABLE run declares side-effect resources");
      }
    } else if (input.cleanupNotApplicable || !cleanupPath) {
      throw new Error("REQUIRED cleanup indexing requires a cleanup receipt");
    }

    const sourcePaths = [
      evidencePath,
      ...proofChildren.map((child) => child.absolutePath),
      ...secondary.map((entry) => entry.evidencePath),
      ...dependencyPaths,
      ...(admissionPath ? [admissionPath] : []),
      ...(cleanupPath ? [cleanupPath] : []),
    ];
    assertProjectionIsNotSource(primaryProjection, sourcePaths);
    for (const entry of secondary) assertProjectionIsNotSource(entry.projectPath, sourcePaths);

    const durableRoot = resolve(manifest.immutable_run_root);
    if (!isContained(immutableRunRoot, durableRoot)) throw new Error("manifest immutable run root escapes the configured immutable evidence root");
    if (!isContained(durableRoot, evidencePath)) throw new Error("primary evidence is not a canonical immutable run output");
    for (const entry of secondary) {
      if (!isContained(durableRoot, entry.evidencePath)) throw new Error(`secondary evidence ${entry.role} is not a canonical immutable run output`);
    }
    const durablePrimary = bindExistingDurableSource(planRoot, manifest, evidencePath);
    const durableSecondary = secondary.map((entry) => bindExistingDurableSource(planRoot, manifest, entry.evidencePath));
    const durableProofChildren = proofChildren.map((child, index) => {
      if (!/^[a-z0-9][a-z0-9-]*$/u.test(child.role)) throw new Error(`proof child role is not path-safe: ${child.role}`);
      const destination = resolve(
        durableRoot,
        "dependencies/proof-children",
        `${String(index + 1).padStart(2, "0")}-${child.role}${extname(child.absolutePath) || ".json"}`,
      );
      const durable = planDurableCopy(planRoot, manifest, child.absolutePath, destination);
      if (durable.sha256 !== child.sha256) throw new Error(`proof child ${child.role} changed before durable copy`);
      return durable;
    });
    const ordinaryDependencyPaths = [...dependencyPaths, ...(admissionPath ? [admissionPath] : [])];
    const durableOrdinaryDependencies = ordinaryDependencyPaths.map((path, index) => planDurableCopy(
      planRoot,
      manifest,
      path,
      resolve(durableRoot, "dependencies", `${String(index + 1).padStart(2, "0")}-${basename(path)}`),
    ));
    const durableDependencies = [...durableProofChildren, ...durableOrdinaryDependencies];
    const cleanupAlreadyDurable = cleanupPath ? isContained(durableRoot, cleanupPath) : false;
    const durableCleanup = cleanupPath
      ? cleanupAlreadyDurable
        ? bindExistingDurableSource(planRoot, manifest, cleanupPath)
        : planDurableCopy(planRoot, manifest, cleanupPath, resolve(durableRoot, "cleanup", basename(cleanupPath)))
      : undefined;

    const createdAt = nowIso();
    const payload = {
      schema_version: EVIDENCE_INDEX_SCHEMA,
      unit_id: manifest.unit_id,
      run_id: manifest.run_id,
      status: unitStatus,
      evidence: [{ id: evidenceId, immutable_path: durablePrimary.relativePath, sha256: durablePrimary.sha256 }],
      dependencySources: durableDependencies.map((entry) => ({ immutable_path: entry.relativePath, sha256: entry.sha256 })),
      ...(durableCleanup ? { cleanup: { immutable_path: durableCleanup.relativePath, sha256: durableCleanup.sha256 } } : {}),
      projection: { path: primarySpec.projection_path, source: "immutable-run" as const },
      ...(durableSecondary.length ? {
        secondaryEvidence: durableSecondary.map((entry, index) => ({
          role: secondary[index]!.role,
          immutable_path: entry.relativePath,
          sha256: entry.sha256,
          projection_path: secondarySpecs.find((spec) => spec.role === secondary[index]!.role)!.projection_path,
        })),
      } : {}),
      created_at: createdAt,
    };
    const index: EvidenceIndexV1 = { ...payload, payload_sha256: sha256Json(payload) };
    const indexPath = resolve(durableRoot, "evidence-index.json");
    if (existsSync(indexPath)) throw new Error(`immutable evidence destination already exists: ${indexPath}`);
    const indexBytes = Buffer.from(`${canonicalJson(index)}\n`, "utf8");
    const durableIndex: PlannedDurableSource = {
      absolutePath: indexPath,
      relativePath: relativeToPlan(planRoot, indexPath),
      bytes: indexBytes,
      sha256: sha256Hex(indexBytes),
    };

    const materializations: RuntimeMaterialization[] = [
      {
        artifactId: primarySpec.artifact_id,
        immutablePath: durablePrimary.relativePath,
        bytes: durablePrimary.bytes,
      },
      ...secondarySpecs.map((spec) => {
        const selectedIndex = secondary.findIndex((entry) => entry.role === spec.role);
        return {
          artifactId: spec.artifact_id,
          immutablePath: durableSecondary[selectedIndex]!.relativePath,
          bytes: durableSecondary[selectedIndex]!.bytes,
        } satisfies RuntimeMaterialization;
      }),
      {
        artifactId: ESTIMATE_SHEET_RUNTIME_REGISTRY.artifact_id,
        immutablePath: durableIndex.relativePath,
        bytes: indexBytes,
      },
    ];
    const transition = deriveEstimateSheetVerifiedTransition(plan, {
      unitId: manifest.unit_id,
      runId: manifest.run_id,
      updatedAt: createdAt,
      sourceRevision: `run:${manifest.run_id}:${manifest.applicationFingerprint.content_sha256}:${manifest.producerFingerprint.content_sha256}`,
      materializations,
      unitStatus: unitStatus as "VERIFIED" | "SUPERSEDED",
      ...(releaseStatus ? { releaseStatus } : {}),
    });
    const oldPlanBytes = readFileSync(planPath);
    const newPlanBytes = Buffer.from(`${JSON.stringify(transition.manifest, null, 2)}\n`, "utf8");
    const immutableByArtifact = new Map<string, PlannedDurableSource>([
      [primarySpec.artifact_id, durablePrimary],
      ...secondarySpecs.map((spec, index) => [spec.artifact_id, durableSecondary[index]!] as const),
      [ESTIMATE_SHEET_RUNTIME_REGISTRY.artifact_id, durableIndex],
    ]);
    const replacements = transition.projectionWrites.map((write) => {
      const target = resolve(planRoot, write.path);
      const row = write.artifactId === ESTIMATE_SHEET_RUNTIME_REGISTRY.artifact_id
        ? plan.runtime_evidence.registry
        : plan.runtime_evidence.projections.find((entry) => entry.artifact_id === write.artifactId);
      if (!row) throw new Error(`missing runtime row for ${write.artifactId}`);
      const oldExists = existsSync(target);
      if (oldExists) {
        assertRegularFile(target, `registered projection ${write.path}`);
        if (sha256File(target) !== row.sha256) throw new Error(`registered projection hash mismatch before transition: ${write.path}`);
      }
      const immutable = immutableByArtifact.get(write.artifactId);
      if (!immutable || immutable.sha256 !== write.sha256 || !immutable.bytes.equals(Buffer.from(write.bytes))) {
        throw new Error(`projection ${write.artifactId} is not byte-bound to its immutable source`);
      }
      return {
        target,
        expectedExists: oldExists,
        expectedSha256: oldExists ? row.sha256 : null,
        newBytes: Buffer.from(write.bytes),
        newSha256: write.sha256,
        oldBytes: oldExists ? readFileSync(target) : null,
        immutable,
      };
    });
    const boundExistingSources = [
      durablePrimary,
      ...durableSecondary,
      ...(cleanupAlreadyDurable && durableCleanup ? [durableCleanup] : []),
    ];
    const plannedDurableSources = [
      ...durableDependencies,
      ...(!cleanupAlreadyDurable && durableCleanup ? [durableCleanup] : []),
      durableIndex,
    ];
    const journalPath = transitionJournalPath(repoRoot);
    const createdDirectories = plannedMissingDirectories(repoRoot, [
      ...plannedDurableSources.map((source) => source.absolutePath),
      ...replacements.map((entry) => entry.target),
    ]);
    const journal: IndexTransitionJournal = {
      schema_version: INDEX_TRANSITION_JOURNAL_SCHEMA,
      state: "PREPARED",
      unit_id: manifest.unit_id,
      run_id: manifest.run_id,
      plan_path: relativeToRepo(repoRoot, planPath),
      old_plan_sha256: sha256Hex(oldPlanBytes),
      old_plan_bytes_base64: oldPlanBytes.toString("base64"),
      new_plan_sha256: sha256Hex(newPlanBytes),
      new_plan_bytes_base64: newPlanBytes.toString("base64"),
      immutable_files: plannedDurableSources.map((source) => ({
        path: relativeToRepo(repoRoot, source.absolutePath),
        sha256: source.sha256,
      })),
      projections: replacements.map((entry) => ({
        path: relativeToRepo(repoRoot, entry.target),
        immutable_path: relativeToRepo(repoRoot, entry.immutable.absolutePath),
        new_sha256: entry.newSha256,
        old_projection: {
          exists: entry.expectedExists,
          sha256: entry.expectedSha256,
          bytes_base64: entry.oldBytes?.toString("base64") ?? null,
        },
      })),
      created_directories: createdDirectories,
      created_at: createdAt,
    };
    writeJsonNoOverwrite(journalPath, journal, 0o600, repoRoot);
    input.faultInjector?.("JOURNAL_PREPARED");

    createDurableDirectories(repoRoot, createdDirectories);
    for (const source of plannedDurableSources) materializeDurableSource(source);
    for (const source of boundExistingSources) {
      if (sha256File(source.absolutePath) !== source.sha256) throw new Error(`canonical immutable evidence changed before projection: ${source.relativePath}`);
    }
    input.faultInjector?.("IMMUTABLE_WRITTEN");

    for (const replacement of replacements) {
      replaceProjection({
        path: replacement.target,
        bytes: replacement.newBytes,
        expectedExists: replacement.expectedExists,
        expectedSha256: replacement.expectedSha256,
        trustedRoot: repoRoot,
      });
    }
    let currentJournal = updateTransitionJournal(journalPath, journal, "PROJECTION_WRITTEN", repoRoot);
    input.faultInjector?.("PROJECTION_WRITTEN");

    replaceFileAtomically(planPath, newPlanBytes, planFileSha256, 0o644, repoRoot);
    currentJournal = updateTransitionJournal(journalPath, currentJournal, "COMMITTED", repoRoot);
    input.faultInjector?.("MANIFEST_COMMITTED");

    if (sha256File(planPath) !== currentJournal.new_plan_sha256) throw new Error("committed plan manifest readback mismatch");
    for (const source of plannedDurableSources) {
      if (sha256File(source.absolutePath) !== source.sha256) throw new Error(`immutable evidence changed before commit readback: ${source.relativePath}`);
    }
    for (const source of boundExistingSources) {
      if (sha256File(source.absolutePath) !== source.sha256) throw new Error(`canonical immutable evidence changed before commit readback: ${source.relativePath}`);
    }
    for (const replacement of replacements) {
      if (sha256File(replacement.target) !== replacement.newSha256) throw new Error(`projection readback mismatch: ${relativeToPlan(planRoot, replacement.target)}`);
    }
    removeFileDurably(journalPath, repoRoot);
    return { index, indexPath, projectionPath: primaryProjection };
  });
}

export function main(argv = process.argv.slice(2)): number {
  const values = parseStrictCli(argv);
  if (cliBoolean(values, "help")) {
    console.log([
      "Usage: bun run scripts/update-estimate-sheet-performance-evidence-index.ts --unit=UNIT-001 --evidence=auto:jsdom --project=evidence/runtime/jsdom-baseline.json [--evidence-id=EVID-002] [--also=auto:fixture --also-project=evidence/runtime/fixture-manifest.json] [--cleanup-not-applicable]",
      "       bun run scripts/update-estimate-sheet-performance-evidence-index.ts --recover",
      "       bun run scripts/update-estimate-sheet-performance-evidence-index.ts --reopen-unit=UNIT-001 --refreeze-admission=PATH",
      "       bun run scripts/update-estimate-sheet-performance-evidence-index.ts --unit=UNIT-011 --write-technical-block=technical-block.json --reason-code=RECOVERY_EXHAUSTED",
      "       bun run scripts/update-estimate-sheet-performance-evidence-index.ts --write-release-reopen=release-reopen.json --reason-code=REASON --superseding-release-evidence=auto:release",
      "       bun run scripts/update-estimate-sheet-performance-evidence-index.ts --write-final-closeout=final-closeout.json --release-evidence=auto:release",
    ].join("\n"));
    return 0;
  }
  if (values.has("recover")) {
    if (!cliBoolean(values, "recover") || values.size !== 1) throw new Error("index recovery accepts exactly --recover");
    process.stdout.write(`${canonicalJson(recoverEstimateSheetIndexTransition())}\n`);
    return 0;
  }
  const reopenUnit = cliString(values, "reopen-unit");
  const refreezeAdmission = cliString(values, "refreeze-admission");
  if (reopenUnit || refreezeAdmission) {
    if (reopenUnit !== "UNIT-001" || !refreezeAdmission || values.size !== 2) {
      throw new Error("refreeze reopen requires exactly --reopen-unit=UNIT-001 and --refreeze-admission=PATH");
    }
    process.stdout.write(`${canonicalJson(reopenEstimateSheetUnitOne({ refreezeAdmission }))}\n`);
    return 0;
  }
  const technicalBlockOutput = cliString(values, "write-technical-block");
  const releaseReopenOutput = cliString(values, "write-release-reopen");
  const finalCloseoutOutput = cliString(values, "write-final-closeout");
  const specialCount = [technicalBlockOutput, releaseReopenOutput, finalCloseoutOutput].filter(Boolean).length;
  if (specialCount > 1) throw new Error("index special transitions are mutually exclusive");
  if (technicalBlockOutput) {
    if (values.size !== 3) throw new Error("technical block accepts exactly --unit, --write-technical-block, and --reason-code");
    const result = writeEstimateSheetTechnicalBlock({
      unit: cliString(values, "unit", true) as string,
      output: technicalBlockOutput,
      reasonCode: cliString(values, "reason-code", true) as string,
    });
    process.stdout.write(`${canonicalJson(result)}\n`);
    return 0;
  }
  if (releaseReopenOutput) {
    if (values.size !== 3) throw new Error("release reopen accepts exactly --write-release-reopen, --reason-code, and --superseding-release-evidence");
    const result = writeEstimateSheetReleaseReopen({
      output: releaseReopenOutput,
      reasonCode: cliString(values, "reason-code", true) as string,
      supersedingReleaseEvidence: cliString(values, "superseding-release-evidence", true) as string,
    });
    process.stdout.write(`${canonicalJson(result)}\n`);
    return 0;
  }
  if (finalCloseoutOutput) {
    if (values.size !== 2) throw new Error("final closeout accepts exactly --write-final-closeout and --release-evidence");
    const result = writeEstimateSheetFinalCloseout({
      output: finalCloseoutOutput,
      releaseEvidence: cliString(values, "release-evidence", true) as string,
    });
    process.stdout.write(`${canonicalJson(result)}\n`);
    return 0;
  }
  const allowedOrdinaryOptions = new Set([
    "unit", "run-manifest", "evidence", "evidence-id", "project", "status",
    "dependency", "gate", "decision", "also", "also-project", "cleanup-receipt",
    "cleanup", "cleanup-not-applicable",
  ]);
  for (const key of values.keys()) if (!allowedOrdinaryOptions.has(key)) throw new Error(`unknown index option: --${key}`);
  if (values.has("cleanup-receipt") && values.has("cleanup")) throw new Error("use only --cleanup-receipt");
  const unit = cliString(values, "unit", true) as string;
  const runManifest = resolveRunManifestPath(process.cwd(), unit, cliString(values, "run-manifest") ?? process.env.ESTIMATE_PERF_RUN_MANIFEST);
  const evidencePath = cliString(values, "evidence", true) as string;
  const projectValue = cliString(values, "project", true) as string;
  const projectPath = resolve(projectValue.startsWith("evidence/") ? defaultPlanRoot() : process.cwd(), projectValue);
  const status = cliString(values, "status") as EvidenceIndexV1["status"] | undefined;
  if (status !== undefined && !["VERIFIED", "BLOCKED", "INCOMPLETE", "SUPERSEDED"].includes(status)) throw new Error(`invalid index status: ${status}`);
  const dependencies = (cliString(values, "dependency") ?? "").split(",").filter(Boolean);
  const also = (cliString(values, "also") ?? "").split(",").filter(Boolean);
  const alsoProjects = (cliString(values, "also-project") ?? "").split(",").filter(Boolean);
  if (also.length !== alsoProjects.length) throw new Error("--also and --also-project counts must match");
  const result = updateEstimateSheetPerformanceEvidenceIndex({
    runManifest,
    evidenceId: cliString(values, "evidence-id"),
    evidencePath,
    projectPath,
    status,
    dependencies,
    gates: (cliString(values, "gate") ?? "").split(",").filter(Boolean),
    decision: cliString(values, "decision"),
    cleanupReceipt: cliString(values, "cleanup-receipt") ?? cliString(values, "cleanup"),
    cleanupNotApplicable: cliBoolean(values, "cleanup-not-applicable"),
    secondary: also.map((evidence, index) => {
      const project = alsoProjects[index]!;
      return {
        role: evidence.replace(/^auto:/u, ""),
        evidencePath: evidence,
        projectPath: resolve(project.startsWith("evidence/") ? defaultPlanRoot() : process.cwd(), project),
      };
    }),
  });
  process.stdout.write(`${canonicalJson({ ...result.index, index_path: result.indexPath, projection_path: result.projectionPath })}\n`);
  return 0;
}

if (import.meta.main) {
  try { process.exitCode = main(); }
  catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
}
