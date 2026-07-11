#!/usr/bin/env bun

import {
  closeSync,
  existsSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
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
  INDEX_SCHEMA,
  assertPerformanceReport,
  assertRegularFile,
  assertRunManifest,
  canonicalJson,
  cliBoolean,
  cliString,
  defaultImmutableRunRoot,
  defaultPlanRoot,
  defaultRunRoot,
  ensureContainedRunPath,
  fingerprintContentEqual,
  isContained,
  isPlainObject,
  isSha256,
  nowIso,
  parseStrictCli,
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

function removeFileDurably(path: string): void {
  rmSync(path, { force: true });
  fsyncDirectory(dirname(path));
}

function replaceProjection(input: {
  path: string;
  bytes: Buffer;
  expectedExists: boolean;
  expectedSha256: string | null;
}): void {
  if (input.expectedExists) {
    if (!input.expectedSha256) throw new Error(`existing projection has no expected hash: ${input.path}`);
    replaceFileAtomically(input.path, input.bytes, input.expectedSha256, 0o644);
    return;
  }
  if (existsSync(input.path)) throw new Error(`projection appeared after validation: ${input.path}`);
  writeNoOverwrite(input.path, input.bytes, 0o644);
}

function updateTransitionJournal(path: string, journal: IndexTransitionJournal, state: IndexTransitionJournal["state"]): IndexTransitionJournal {
  const currentSha256 = sha256File(path);
  const next = { ...journal, state };
  replaceFileAtomically(path, `${canonicalJson(next)}\n`, currentSha256, 0o600);
  return next;
}

function readTransitionJournal(repoRoot: string): { path: string; journal: IndexTransitionJournal } {
  const path = transitionJournalPath(repoRoot);
  const journal = readJsonFile<IndexTransitionJournal>(path);
  if (journal.schema_version !== INDEX_TRANSITION_JOURNAL_SCHEMA
    || !["PREPARED", "PROJECTION_WRITTEN", "COMMITTED"].includes(journal.state)
    || typeof journal.run_id !== "string"
    || !journal.run_id
    || !Array.isArray(journal.immutable_files)
    || !Array.isArray(journal.projections)
    || !Array.isArray(journal.created_directories)
    || !isSha256(journal.old_plan_sha256)
    || !isSha256(journal.new_plan_sha256)) {
    throw new Error("index transition journal is invalid");
  }
  return { path, journal };
}

function asInsideRun(manifest: RunManifestV1, path: string, label: string): string {
  const resolved = isAbsolute(path) ? resolve(path) : ensureContainedRunPath(manifest.run_root, path);
  if (!isContained(manifest.run_root, resolved) && !isContained(manifest.immutable_run_root, resolved)) {
    throw new Error(`${label} escapes the prepared mutable and immutable run roots`);
  }
  assertRegularFile(resolved, label);
  return resolved;
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

function planDurableCopy(planRoot: string, source: string, destination: string): PlannedDurableSource {
  assertRegularFile(source, "immutable evidence source");
  const bytes = readFileSync(source);
  if (existsSync(destination)) throw new Error(`immutable evidence destination already exists: ${destination}`);
  return {
    absolutePath: destination,
    relativePath: relativeToPlan(planRoot, destination),
    bytes,
    sha256: sha256Hex(bytes),
  };
}

function bindExistingDurableSource(planRoot: string, source: string): PlannedDurableSource {
  assertRegularFile(source, "existing immutable evidence source");
  if (!isContained(planRoot, source)) throw new Error(`existing immutable evidence escapes plan root: ${source}`);
  const bytes = readFileSync(source);
  return {
    absolutePath: source,
    relativePath: relativeToPlan(planRoot, source),
    bytes,
    sha256: sha256Hex(bytes),
  };
}

function materializeDurableSource(source: PlannedDurableSource): DurableSource {
  writeNoOverwrite(source.absolutePath, source.bytes, 0o600);
  if (sha256File(source.absolutePath) !== source.sha256) throw new Error(`immutable evidence readback mismatch: ${source.absolutePath}`);
  return source;
}

function withPlanTransitionLock<T>(
  repoRoot: string,
  metadata: Record<string, unknown>,
  operation: () => T,
  options: { allowJournal?: boolean } = {},
): T {
  const lockPath = resolve(defaultRunRoot(repoRoot), "..", ".plan-transition.lock");
  mkdirSync(dirname(lockPath), { recursive: true, mode: 0o700 });
  mkdirSync(lockPath, { mode: 0o700 });
  try {
    if (!options.allowJournal && existsSync(transitionJournalPath(repoRoot))) {
      throw new Error("an unfinished index transition journal blocks this transition; run perf:estimate:index -- --recover");
    }
    writeJsonNoOverwrite(resolve(lockPath, "owner.json"), {
      schema_version: "estimate-sheet-plan-transition-lock.v1",
      pid: process.pid,
      acquired_at: nowIso(),
      ...metadata,
    }, 0o600);
    return operation();
  } finally {
    rmSync(lockPath, { recursive: true, force: true });
  }
}

function withTransitionLock<T>(repoRoot: string, manifest: RunManifestV1, operation: () => T): T {
  return withPlanTransitionLock(repoRoot, { unit_id: manifest.unit_id, run_id: manifest.run_id }, operation);
}

function decodeJournalBytes(value: string, expectedSha256: string, label: string): Buffer {
  const bytes = Buffer.from(value, "base64");
  if (sha256Hex(bytes) !== expectedSha256) throw new Error(`${label} bytes do not match their journal hash`);
  return bytes;
}

function restoreProjectionBeforeCommit(repoRoot: string, entry: IndexTransitionJournal["projections"][number]): void {
  const path = resolveJournalPath(repoRoot, entry.path, "projection");
  const old = entry.old_projection;
  if (old.exists) {
    if (!old.sha256 || !old.bytes_base64) throw new Error(`projection ${entry.path} has an incomplete old snapshot`);
    const bytes = decodeJournalBytes(old.bytes_base64, old.sha256, `projection ${entry.path} old`);
    if (!existsSync(path)) {
      writeNoOverwrite(path, bytes, 0o644);
      return;
    }
    assertRegularFile(path, `projection ${entry.path}`);
    const currentSha256 = sha256File(path);
    if (currentSha256 === old.sha256) return;
    if (currentSha256 !== entry.new_sha256) throw new Error(`projection ${entry.path} has unrecognized bytes during rollback`);
    replaceFileAtomically(path, bytes, currentSha256, 0o644);
    return;
  }
  if (old.sha256 !== null || old.bytes_base64 !== null) throw new Error(`absent projection ${entry.path} has old bytes`);
  if (!existsSync(path)) return;
  assertRegularFile(path, `projection ${entry.path}`);
  if (sha256File(path) !== entry.new_sha256) throw new Error(`new projection ${entry.path} has unrecognized bytes during rollback`);
  removeFileDurably(path);
}

function removeCreatedDirectories(repoRoot: string, directories: readonly string[]): void {
  for (const value of [...directories].sort((left, right) => right.split("/").length - left.split("/").length || right.localeCompare(left))) {
    const path = resolveJournalPath(repoRoot, value, "created directory");
    if (!existsSync(path)) continue;
    const stats = lstatSync(path);
    if (!stats.isDirectory() || stats.isSymbolicLink()) throw new Error(`journal-created path is not a real directory: ${value}`);
    if (readdirSync(path).length !== 0) continue;
    const parent = dirname(path);
    rmdirSync(path);
    fsyncDirectory(parent);
  }
}

export function recoverEstimateSheetIndexTransition(input: {
  repoRoot?: string;
} = {}): { result: "NO_JOURNAL" | "ROLLED_BACK" | "COMMITTED"; unit_id?: string; run_id?: string } {
  const repoRoot = resolve(input.repoRoot ?? process.cwd());
  const journalPath = transitionJournalPath(repoRoot);
  if (!existsSync(journalPath)) return { result: "NO_JOURNAL" };
  return withPlanTransitionLock(repoRoot, { transition: "INDEX_RECOVERY" }, () => {
    const { journal } = readTransitionJournal(repoRoot);
    const planPath = resolveJournalPath(repoRoot, journal.plan_path, "plan path");
    assertRegularFile(planPath, "plan manifest");
    const currentPlanSha256 = sha256File(planPath);
    const committed = currentPlanSha256 === journal.new_plan_sha256;
    const preCommit = currentPlanSha256 === journal.old_plan_sha256;
    if (!committed && !preCommit) throw new Error("plan manifest matches neither side of the unfinished index transition");

    if (committed) {
      for (const immutable of journal.immutable_files) {
        const path = resolveJournalPath(repoRoot, immutable.path, "immutable evidence");
        assertRegularFile(path, `immutable evidence ${immutable.path}`);
        if (sha256File(path) !== immutable.sha256) throw new Error(`immutable evidence hash mismatch during recovery: ${immutable.path}`);
      }
      for (const projection of journal.projections) {
        const path = resolveJournalPath(repoRoot, projection.path, "projection");
        const immutablePath = resolveJournalPath(repoRoot, projection.immutable_path, "projection immutable source");
        assertRegularFile(immutablePath, `projection immutable source ${projection.immutable_path}`);
        if (sha256File(immutablePath) !== projection.new_sha256) throw new Error(`projection immutable source hash mismatch: ${projection.immutable_path}`);
        const bytes = readFileSync(immutablePath);
        if (!existsSync(path)) writeNoOverwrite(path, bytes, 0o644);
        else {
          assertRegularFile(path, `projection ${projection.path}`);
          const currentSha256 = sha256File(path);
          if (currentSha256 !== projection.new_sha256) replaceFileAtomically(path, bytes, currentSha256, 0o644);
        }
        if (sha256File(path) !== projection.new_sha256) throw new Error(`projection readback mismatch during recovery: ${projection.path}`);
      }
      removeFileDurably(journalPath);
      return { result: "COMMITTED", unit_id: journal.unit_id, run_id: journal.run_id };
    }

    if (journal.state === "COMMITTED") throw new Error("committed journal cannot be rolled back against the old manifest");
    decodeJournalBytes(journal.old_plan_bytes_base64, journal.old_plan_sha256, "old plan");
    decodeJournalBytes(journal.new_plan_bytes_base64, journal.new_plan_sha256, "new plan");
    for (const projection of [...journal.projections].reverse()) restoreProjectionBeforeCommit(repoRoot, projection);
    for (const immutable of [...journal.immutable_files].reverse()) {
      const path = resolveJournalPath(repoRoot, immutable.path, "immutable evidence");
      if (!existsSync(path)) continue;
      assertRegularFile(path, `immutable evidence ${immutable.path}`);
      if (sha256File(path) !== immutable.sha256) throw new Error(`immutable evidence changed before rollback: ${immutable.path}`);
      removeFileDurably(path);
    }
    removeCreatedDirectories(repoRoot, journal.created_directories);
    removeFileDurably(journalPath);
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
    })),
    {
      absolutePath: transitionPath,
      relativePath: relativeToRepo(input.repoRoot, transitionPath),
      bytes: Buffer.from(`${canonicalJson(transitionRecord)}\n`, "utf8"),
      sha256: sha256Hex(`${canonicalJson(transitionRecord)}\n`),
    },
  ];
  const uniquePaths = new Set(plannedSources.map((source) => source.absolutePath));
  if (uniquePaths.size !== plannedSources.length) throw new Error("plan-only transition durable paths must be unique");
  for (const source of plannedSources) {
    if (!isContained(input.repoRoot, source.absolutePath)) throw new Error("plan-only transition durable path escapes the repository");
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
  writeJsonNoOverwrite(journalPath, journal, 0o600);
  input.faultInjector?.("JOURNAL_PREPARED");

  createDurableDirectories(input.repoRoot, createdDirectories);
  for (const source of plannedSources) materializeDurableSource(source);
  input.faultInjector?.("IMMUTABLE_WRITTEN");

  let currentJournal = updateTransitionJournal(journalPath, journal, "PROJECTION_WRITTEN");
  input.faultInjector?.("PROJECTION_WRITTEN");
  replaceFileAtomically(input.planPath, nextBytes, input.expectedPlanSha256, 0o644);
  currentJournal = updateTransitionJournal(journalPath, currentJournal, "COMMITTED");
  input.faultInjector?.("MANIFEST_COMMITTED");

  if (sha256File(input.planPath) !== currentJournal.new_plan_sha256) throw new Error("plan-only transition plan readback mismatch");
  for (const source of plannedSources) {
    if (sha256File(source.absolutePath) !== source.sha256) throw new Error(`plan-only transition output readback mismatch: ${source.relativePath}`);
  }
  removeFileDurably(journalPath);
}

function currentRunManifest(repoRoot: string, unitId: string, runId: string): RunManifestV1 {
  const unitRoot = resolve(defaultRunRoot(repoRoot), unitId);
  if (!existsSync(unitRoot)) throw new Error(`run root is missing for ${unitId}/${runId}`);
  const matches = readdirSync(unitRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => resolve(unitRoot, entry.name, "run-manifest.json"))
    .filter((path) => existsSync(path))
    .map((path) => readJsonFile<RunManifestV1>(path))
    .filter((manifest) => manifest.unit_id === unitId && manifest.run_id === runId);
  if (matches.length !== 1) throw new Error(`run manifest identity is ambiguous for ${unitId}/${runId}`);
  assertRunManifest(matches[0]);
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
  const journalRoot = resolve(repoRoot, focusedRun.run_root);
  if (!isContained(repoRoot, journalRoot)) throw new Error("refreeze journal root escapes the repository");

  return withPlanTransitionLock(repoRoot, { unit_id: "UNIT-001", refreeze_admission_sha256: sha256File(receiptPath) }, () => {
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
    const next = deriveEstimateSheetRefreezeReopenTransition(plan, { updatedAt });
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
  const expected = resolve(planRoot, "evidence/runtime/runs", manifest.unit_id, manifest.run_id, basenameValue);
  const resolved = isAbsolute(requested)
    ? resolve(requested)
    : requested.startsWith("evidence/")
      ? resolve(planRoot, requested)
      : resolve(repoRoot, requested);
  if (!isContained(planRoot, resolved) || resolved !== expected) {
    throw new Error(`transition output must be the current immutable run path ${relativeToPlan(planRoot, expected)}`);
  }
  return resolved;
}

function commandRecoveryAttempts(manifest: RunManifestV1): Array<Record<string, unknown>> {
  const receiptsRoot = resolve(manifest.run_root, "receipts");
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
  return withPlanTransitionLock(repoRoot, { unit_id: "UNIT-011", transition: "TECHNICAL_BLOCK" }, () => {
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
  return withPlanTransitionLock(repoRoot, { unit_id: "UNIT-011", transition: "RELEASE_REOPEN" }, () => {
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
  return withPlanTransitionLock(repoRoot, { unit_id: "UNIT-011", transition: "FINAL_CLOSEOUT" }, () => {
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
  const path = value === "auto:cleanup"
    ? ensureContainedRunPath(manifest.run_root, "cleanup-receipt.json")
    : ensureContainedRunPath(manifest.run_root, value);
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
  const path = ensureContainedRunPath(manifest.run_root, wrapper.immutable_path);
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
  const manifest = readJsonFile<RunManifestV1>(resolve(input.runManifest));
  assertRunManifest(manifest);

  return withTransitionLock(repoRoot, manifest, () => {
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
    const admissionPath = manifest.admissionPath ? asInsideRun(manifest, manifest.admissionPath, "admission dependency") : undefined;
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
    const durablePrimary = bindExistingDurableSource(planRoot, evidencePath);
    const durableSecondary = secondary.map((entry) => bindExistingDurableSource(planRoot, entry.evidencePath));
    const durableProofChildren = proofChildren.map((child, index) => {
      if (!/^[a-z0-9][a-z0-9-]*$/u.test(child.role)) throw new Error(`proof child role is not path-safe: ${child.role}`);
      const destination = resolve(
        durableRoot,
        "dependencies/proof-children",
        `${String(index + 1).padStart(2, "0")}-${child.role}${extname(child.absolutePath) || ".json"}`,
      );
      const durable = planDurableCopy(planRoot, child.absolutePath, destination);
      if (durable.sha256 !== child.sha256) throw new Error(`proof child ${child.role} changed before durable copy`);
      return durable;
    });
    const ordinaryDependencyPaths = [...dependencyPaths, ...(admissionPath ? [admissionPath] : [])];
    const durableOrdinaryDependencies = ordinaryDependencyPaths.map((path, index) => planDurableCopy(
      planRoot,
      path,
      resolve(durableRoot, "dependencies", `${String(index + 1).padStart(2, "0")}-${basename(path)}`),
    ));
    const durableDependencies = [...durableProofChildren, ...durableOrdinaryDependencies];
    const durableCleanup = cleanupPath ? planDurableCopy(planRoot, cleanupPath, resolve(durableRoot, "cleanup", basename(cleanupPath))) : undefined;

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
    const boundExistingSources = [durablePrimary, ...durableSecondary];
    const plannedDurableSources = [
      ...durableDependencies,
      ...(durableCleanup ? [durableCleanup] : []),
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
    writeJsonNoOverwrite(journalPath, journal, 0o600);
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
      });
    }
    let currentJournal = updateTransitionJournal(journalPath, journal, "PROJECTION_WRITTEN");
    input.faultInjector?.("PROJECTION_WRITTEN");

    replaceFileAtomically(planPath, newPlanBytes, planFileSha256, 0o644);
    currentJournal = updateTransitionJournal(journalPath, currentJournal, "COMMITTED");
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
    removeFileDurably(journalPath);
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
