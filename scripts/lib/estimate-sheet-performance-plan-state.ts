import { createHash } from "node:crypto";

import { ESTIMATE_UNITS, type EstimateUnit } from "./estimate-sheet-performance-contract";

export const ESTIMATE_SHEET_RUNTIME_STATE_CONTRACT =
  "estimate-sheet-runtime-manifest-state.v1" as const;

export type RuntimeRelationship = "PRIMARY" | "SECONDARY";
export type RuntimeArtifactId =
  | "ART-039"
  | "ART-040"
  | "ART-041"
  | "ART-042"
  | "ART-043"
  | "ART-044"
  | "ART-045"
  | "ART-046"
  | "ART-047"
  | "ART-048"
  | "ART-049"
  | "ART-050"
  | "ART-051";
export type RuntimeEvidenceId =
  | "EVID-002"
  | "EVID-003"
  | "EVID-004"
  | "EVID-005"
  | "EVID-006"
  | "EVID-007"
  | "EVID-008"
  | "EVID-009"
  | "EVID-010"
  | "EVID-011"
  | "EVID-013";

export type RuntimeProjectionSpec = Readonly<{
  artifact_id: RuntimeArtifactId;
  evidence_id: RuntimeEvidenceId;
  relationship: RuntimeRelationship;
  role: string;
  projection_path: string;
  unit_id: EstimateUnit;
}>;

export const ESTIMATE_SHEET_RUNTIME_PROJECTIONS = [
  {
    artifact_id: "ART-039",
    evidence_id: "EVID-002",
    relationship: "SECONDARY",
    role: "fixture",
    projection_path: "evidence/runtime/fixture-manifest.json",
    unit_id: "UNIT-001",
  },
  {
    artifact_id: "ART-040",
    evidence_id: "EVID-002",
    relationship: "PRIMARY",
    role: "jsdom",
    projection_path: "evidence/runtime/jsdom-baseline.json",
    unit_id: "UNIT-001",
  },
  {
    artifact_id: "ART-041",
    evidence_id: "EVID-003",
    relationship: "PRIMARY",
    role: "browser",
    projection_path: "evidence/runtime/browser-baseline.json",
    unit_id: "UNIT-002",
  },
  {
    artifact_id: "ART-042",
    evidence_id: "EVID-004",
    relationship: "PRIMARY",
    role: "d1-local",
    projection_path: "evidence/runtime/d1-local-baseline.json",
    unit_id: "UNIT-003",
  },
  {
    artifact_id: "ART-043",
    evidence_id: "EVID-013",
    relationship: "PRIMARY",
    role: "decision",
    projection_path: "evidence/runtime/bottleneck-decision.json",
    unit_id: "UNIT-004",
  },
  {
    artifact_id: "ART-044",
    evidence_id: "EVID-005",
    relationship: "PRIMARY",
    role: "unit-005",
    projection_path: "evidence/runtime/unit-005-route-d1.json",
    unit_id: "UNIT-005",
  },
  {
    artifact_id: "ART-045",
    evidence_id: "EVID-006",
    relationship: "PRIMARY",
    role: "unit-006",
    projection_path: "evidence/runtime/unit-006-graph.json",
    unit_id: "UNIT-006",
  },
  {
    artifact_id: "ART-046",
    evidence_id: "EVID-007",
    relationship: "PRIMARY",
    role: "unit-007",
    projection_path: "evidence/runtime/unit-007-derived-state.json",
    unit_id: "UNIT-007",
  },
  {
    artifact_id: "ART-047",
    evidence_id: "EVID-008",
    relationship: "PRIMARY",
    role: "unit-008",
    projection_path: "evidence/runtime/unit-008-render-a11y.json",
    unit_id: "UNIT-008",
  },
  {
    artifact_id: "ART-048",
    evidence_id: "EVID-009",
    relationship: "PRIMARY",
    role: "unit-009",
    projection_path: "evidence/runtime/unit-009-mutations.json",
    unit_id: "UNIT-009",
  },
  {
    artifact_id: "ART-049",
    evidence_id: "EVID-010",
    relationship: "PRIMARY",
    role: "integrated-local",
    projection_path: "evidence/runtime/integrated-local-proof.json",
    unit_id: "UNIT-010",
  },
  {
    artifact_id: "ART-050",
    evidence_id: "EVID-011",
    relationship: "PRIMARY",
    role: "hosted-d1",
    projection_path: "evidence/runtime/hosted-d1-proof.json",
    unit_id: "UNIT-011",
  },
  {
    artifact_id: "ART-051",
    evidence_id: "EVID-011",
    relationship: "SECONDARY",
    role: "release",
    projection_path: "evidence/runtime/release-evaluation.md",
    unit_id: "UNIT-011",
  },
] as const satisfies readonly RuntimeProjectionSpec[];

export const ESTIMATE_SHEET_RUNTIME_REGISTRY = {
  artifact_id: "ART-052",
  projection_path: "evidence/runtime/evidence-index.json",
} as const;

type RuntimeProjectionRow = Omit<RuntimeProjectionSpec, "unit_id"> & {
  immutable_path: string | null;
  sha256: string;
};

type RuntimeRegistryRow = {
  artifact_id: typeof ESTIMATE_SHEET_RUNTIME_REGISTRY.artifact_id;
  projection_path: typeof ESTIMATE_SHEET_RUNTIME_REGISTRY.projection_path;
  immutable_path: string | null;
  sha256: string;
};

export type EstimateSheetRuntimeEvidenceState = {
  contract_version: typeof ESTIMATE_SHEET_RUNTIME_STATE_CONTRACT;
  transition_sequence: number;
  latest_unit_id: EstimateUnit | null;
  latest_run_id: string | null;
  latest_run_manifest_sha256?: string;
  registry: RuntimeRegistryRow;
  projections: RuntimeProjectionRow[];
};

export type EstimateSheetArtifactRecord = {
  id: string;
  role: string;
  path: string;
  sha256: string;
  [key: string]: unknown;
};

export type EstimateSheetUnitRecord = {
  id: string;
  status: string;
  depends_on: string[];
  [key: string]: unknown;
};

export type EstimateSheetEvidenceRecord = {
  id: string;
  status: string;
  artifact_path: string;
  sha256: string;
  source_revision: string;
  valid_until: string | null;
  [key: string]: unknown;
};

export type EstimateSheetPlanManifest = {
  package_status: string;
  implementation_status: string;
  release_status: string;
  plan_lifecycle: string;
  terminal_status: string;
  last_observed_run_scope: string;
  artifacts: EstimateSheetArtifactRecord[];
  runtime_evidence: EstimateSheetRuntimeEvidenceState;
  units: EstimateSheetUnitRecord[];
  tests: Array<{ id: string; status: string; [key: string]: unknown }>;
  ready_slices: Array<{ id: string; unit_ids: string[]; [key: string]: unknown }>;
  evidence_index: EstimateSheetEvidenceRecord[];
  requirements?: Array<{ id: string; status: string; [key: string]: unknown }>;
  risks?: Array<{ id: string; status: string; [key: string]: unknown }>;
  next_unit: string | null;
  updated_at: string;
  manifest_sha256: string;
  [key: string]: unknown;
};

export type RuntimeFileSnapshot = Readonly<{
  bytes: string | Uint8Array;
  kind: "file" | "directory" | "symlink";
  noOverwrite?: boolean;
}>;

export type RuntimeFileSet = Readonly<Record<string, RuntimeFileSnapshot>>;

export type PrepareTransitionInput = Readonly<{
  unitId: EstimateUnit;
  runId: string;
  runManifestSha256: string;
  updatedAt: string;
}>;

export type RuntimeMaterialization = Readonly<{
  artifactId: RuntimeArtifactId | typeof ESTIMATE_SHEET_RUNTIME_REGISTRY.artifact_id;
  immutablePath: string;
  bytes: string | Uint8Array;
}>;

export type VerifiedTransitionInput = Omit<PrepareTransitionInput, "runManifestSha256"> & Readonly<{
  sourceRevision: string;
  materializations: readonly RuntimeMaterialization[];
  unitStatus?: "VERIFIED" | "SUPERSEDED";
  releaseStatus?: "READY" | "NOT_READY";
}>;

export type RefreezeReopenTransitionInput = Readonly<{
  runManifestSha256: string;
  updatedAt: string;
}>;

export type TechnicalBlockTransitionInput = Readonly<{
  runId: string;
  updatedAt: string;
  releaseStatus: "NOT_EVALUATED" | "NOT_READY";
}>;

export type ReleaseReopenTransitionInput = Readonly<{
  updatedAt: string;
}>;

export type RiskDisposition = Readonly<{
  riskId: string;
  disposition: "MITIGATED" | "ACCEPTED" | "CLOSED";
  evidenceIds: readonly string[];
  rationale: string;
}>;

export type FinalCloseoutTransitionInput = Readonly<{
  updatedAt: string;
  riskDispositions: readonly RiskDisposition[];
}>;

export type ProjectionWrite = Readonly<{
  artifactId: RuntimeMaterialization["artifactId"];
  path: string;
  immutablePath: string;
  bytes: Uint8Array;
  sha256: string;
}>;

export type VerifiedTransitionResult = Readonly<{
  manifest: EstimateSheetPlanManifest;
  projectionWrites: readonly ProjectionWrite[];
}>;

const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const RUN_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/u;
const STRICT_ISO_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;
const RUNTIME_STATE_KEYS = [
  "contract_version",
  "latest_run_id",
  "latest_unit_id",
  "projections",
  "registry",
  "transition_sequence",
] as const;
const ANCHORED_RUNTIME_STATE_KEYS = [
  ...RUNTIME_STATE_KEYS,
  "latest_run_manifest_sha256",
].sort();
const PROJECTION_ROW_KEYS = [
  "artifact_id",
  "evidence_id",
  "immutable_path",
  "projection_path",
  "relationship",
  "role",
  "sha256",
] as const;
const REGISTRY_ROW_KEYS = ["artifact_id", "immutable_path", "projection_path", "sha256"] as const;

const UNIT_TEST_UPDATES: Readonly<Partial<Record<EstimateUnit, readonly string[]>>> = {
  "UNIT-004": ["TEST-002"],
  "UNIT-005": ["TEST-004"],
  "UNIT-010": ["TEST-003", "TEST-005"],
  "UNIT-011": ["TEST-006"],
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function deepSort(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(deepSort);
  if (!isPlainObject(value)) return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, deepSort(value[key])]),
  );
}

function bytes(value: string | Uint8Array): Uint8Array {
  return typeof value === "string" ? Buffer.from(value, "utf8") : Uint8Array.from(value);
}

function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

function sortedKeys(value: object): string[] {
  return Object.keys(value).sort();
}

function sameStringArray(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function isStrictIso(value: string): boolean {
  if (!STRICT_ISO_PATTERN.test(value)) return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}

function isSafeImmutablePath(path: string, unitId: EstimateUnit, runId?: string): boolean {
  if (path.includes("\\") || path.startsWith("/") || path.split("/").some((part) => !part || part === "." || part === "..")) {
    return false;
  }
  const prefix = `evidence/runtime/runs/${unitId}/`;
  if (!path.startsWith(prefix)) return false;
  const [runKey, ...tail] = path.slice(prefix.length).split("/");
  const match = runKey?.match(/^(.+)-([0-9a-f]{12})-([0-9a-f]{12})$/u);
  return Boolean(match
    && RUN_ID_PATTERN.test(match[1] ?? "")
    && (!runId || match[1] === runId)
    && tail.length > 0);
}

function cloneManifest(manifest: EstimateSheetPlanManifest): EstimateSheetPlanManifest {
  return structuredClone(manifest);
}

function finalizeManifest(manifest: EstimateSheetPlanManifest): EstimateSheetPlanManifest {
  manifest.manifest_sha256 = calculateEstimateSheetManifestSha256(manifest);
  return manifest;
}

function recordById<T extends { id: string }>(records: readonly T[], id: string, label: string): T {
  const matches = records.filter((record) => record.id === id);
  if (matches.length !== 1) {
    throw new Error(`${label}: expected exactly one ${id}, found ${matches.length}`);
  }
  return matches[0]!;
}

function assertTransitionPreconditions(
  manifest: EstimateSheetPlanManifest,
  input: PrepareTransitionInput,
): EstimateSheetUnitRecord {
  const errors = validateEstimateSheetRuntimeState(manifest);
  if (errors.length > 0) throw new Error(`runtime manifest invalid: ${errors.join("; ")}`);
  if (manifest.package_status !== "IMPLEMENTATION_READY") {
    throw new Error(`prepare requires package_status IMPLEMENTATION_READY, got ${manifest.package_status}`);
  }
  if (manifest.plan_lifecycle !== "ACTIVE" || manifest.terminal_status !== "ACTIVE") {
    throw new Error("prepare requires an ACTIVE plan and terminal status");
  }
  if (manifest.next_unit !== input.unitId) {
    throw new Error(`prepare requires next_unit ${input.unitId}, got ${String(manifest.next_unit)}`);
  }
  if (!RUN_ID_PATTERN.test(input.runId)) throw new Error(`invalid run id: ${input.runId}`);
  if (!SHA256_PATTERN.test(input.runManifestSha256)) {
    throw new Error("prepare run manifest SHA-256 must be a lowercase digest");
  }
  if (!isStrictIso(input.updatedAt)) throw new Error(`updatedAt must be strict ISO: ${input.updatedAt}`);

  const unit = recordById(manifest.units, input.unitId, "units");
  if (unit.status !== "READY") throw new Error(`${input.unitId} must be READY, got ${unit.status}`);
  for (const dependencyId of unit.depends_on) {
    const dependency = recordById(manifest.units, dependencyId, "units");
    if (!["VERIFIED", "SUPERSEDED"].includes(dependency.status)) {
      throw new Error(`${input.unitId} dependency ${dependencyId} is ${dependency.status}`);
    }
  }
  const otherInProgress = manifest.units.find(
    (candidate) => candidate.id !== input.unitId && candidate.status === "IN_PROGRESS",
  );
  if (otherInProgress) throw new Error(`another unit is already IN_PROGRESS: ${otherInProgress.id}`);
  return unit;
}

function assertNoRegistrySelfEntry(value: string | Uint8Array): void {
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(bytes(value)).toString("utf8"));
  } catch {
    throw new Error("ART-052 registry bytes must be valid JSON");
  }
  const stack: unknown[] = [parsed];
  while (stack.length > 0) {
    const current = stack.pop();
    if (Array.isArray(current)) {
      stack.push(...current);
      continue;
    }
    if (!isPlainObject(current)) continue;
    if (
      current.artifact_id === ESTIMATE_SHEET_RUNTIME_REGISTRY.artifact_id
      || current.artifactId === ESTIMATE_SHEET_RUNTIME_REGISTRY.artifact_id
      || current.projection_path === ESTIMATE_SHEET_RUNTIME_REGISTRY.projection_path
    ) {
      throw new Error("ART-052 registry payload contains a cyclic self-entry");
    }
    stack.push(...Object.values(current));
  }
}

export function canonicalEstimateSheetManifestBytes(manifest: EstimateSheetPlanManifest): Buffer {
  const withoutSelfHash = structuredClone(manifest) as Record<string, unknown>;
  delete withoutSelfHash.manifest_sha256;
  return Buffer.from(JSON.stringify(deepSort(withoutSelfHash)), "utf8");
}

export function calculateEstimateSheetManifestSha256(manifest: EstimateSheetPlanManifest): string {
  return sha256(canonicalEstimateSheetManifestBytes(manifest));
}

export function validateEstimateSheetRuntimeState(
  manifest: EstimateSheetPlanManifest,
  files?: RuntimeFileSet,
): string[] {
  const errors: string[] = [];
  const runtime = manifest.runtime_evidence;
  if (!runtime || !isPlainObject(runtime)) return ["runtime_evidence must be an object"];
  if (runtime.contract_version !== ESTIMATE_SHEET_RUNTIME_STATE_CONTRACT) {
    errors.push(`runtime_evidence.contract_version must be ${ESTIMATE_SHEET_RUNTIME_STATE_CONTRACT}`);
  }
  if (!Number.isSafeInteger(runtime.transition_sequence) || runtime.transition_sequence < 0) {
    errors.push("runtime_evidence.transition_sequence must be a non-negative safe integer");
  }
  const latestNull = runtime.latest_unit_id === null && runtime.latest_run_id === null;
  const latestPresent = runtime.latest_unit_id !== null && runtime.latest_run_id !== null;
  const hasManifestAnchor = Object.hasOwn(runtime, "latest_run_manifest_sha256");
  const expectedRuntimeKeys = latestNull ? [...RUNTIME_STATE_KEYS] : ANCHORED_RUNTIME_STATE_KEYS;
  if (!sameStringArray(sortedKeys(runtime), expectedRuntimeKeys)) {
    errors.push("runtime_evidence has unknown, missing, or reordered shape fields");
  }
  if (!latestNull && !latestPresent) errors.push("runtime_evidence latest unit and run must be jointly null or present");
  if (latestPresent && (!hasManifestAnchor || !SHA256_PATTERN.test(runtime.latest_run_manifest_sha256 ?? ""))) {
    errors.push("runtime_evidence latest run manifest SHA-256 is required with a latest run");
  }
  if (latestNull && hasManifestAnchor) {
    errors.push("runtime_evidence latest run manifest SHA-256 must be absent without a latest run");
  }
  if (runtime.transition_sequence === 0 && !latestNull) {
    errors.push("runtime_evidence sequence zero requires null latest unit and run");
  }
  if (runtime.transition_sequence > 0 && latestNull && manifest.terminal_status !== "ACHIEVED") {
    errors.push("runtime_evidence nonzero sequence requires latest unit and run before final closeout");
  }
  if (runtime.latest_unit_id !== null && !ESTIMATE_UNITS.includes(runtime.latest_unit_id)) {
    errors.push(`runtime_evidence.latest_unit_id is invalid: ${runtime.latest_unit_id}`);
  }
  if (runtime.latest_run_id !== null && !RUN_ID_PATTERN.test(runtime.latest_run_id)) {
    errors.push(`runtime_evidence.latest_run_id is invalid: ${runtime.latest_run_id}`);
  }

  if (!runtime.registry || !sameStringArray(sortedKeys(runtime.registry), [...REGISTRY_ROW_KEYS])) {
    errors.push("runtime_evidence.registry has an invalid closed shape");
  }
  if (runtime.registry?.artifact_id !== ESTIMATE_SHEET_RUNTIME_REGISTRY.artifact_id) {
    errors.push("runtime_evidence.registry artifact mismatch");
  }
  if (runtime.registry?.projection_path !== ESTIMATE_SHEET_RUNTIME_REGISTRY.projection_path) {
    errors.push("runtime_evidence.registry projection mismatch");
  }
  if (!Array.isArray(runtime.projections) || runtime.projections.length !== ESTIMATE_SHEET_RUNTIME_PROJECTIONS.length) {
    errors.push(`runtime_evidence.projections must contain exactly ${ESTIMATE_SHEET_RUNTIME_PROJECTIONS.length} rows`);
  }

  for (const [index, spec] of ESTIMATE_SHEET_RUNTIME_PROJECTIONS.entries()) {
    const row = runtime.projections?.[index];
    if (!row) continue;
    if (!sameStringArray(sortedKeys(row), [...PROJECTION_ROW_KEYS])) {
      errors.push(`runtime_evidence.projections[${index}] has an invalid closed shape`);
    }
    for (const key of ["artifact_id", "evidence_id", "relationship", "role", "projection_path"] as const) {
      if (row[key] !== spec[key]) errors.push(`runtime_evidence.projections[${index}].${key} mismatch`);
    }
  }

  const allRows: Array<{
    artifactId: string;
    projectionPath: string;
    immutablePath: string | null;
    digest: string;
    unitId?: EstimateUnit;
    isRegistry?: boolean;
  }> = [
    ...ESTIMATE_SHEET_RUNTIME_PROJECTIONS.map((spec, index) => {
      const row = runtime.projections[index];
      return {
        artifactId: spec.artifact_id,
        projectionPath: spec.projection_path,
        immutablePath: row?.immutable_path ?? null,
        digest: row?.sha256 ?? "",
        unitId: spec.unit_id,
      };
    }),
    {
      artifactId: ESTIMATE_SHEET_RUNTIME_REGISTRY.artifact_id,
      projectionPath: ESTIMATE_SHEET_RUNTIME_REGISTRY.projection_path,
      immutablePath: runtime.registry?.immutable_path ?? null,
      digest: runtime.registry?.sha256 ?? "",
      isRegistry: true,
    },
  ];

  for (const row of allRows) {
    if (!SHA256_PATTERN.test(row.digest)) errors.push(`${row.artifactId} runtime hash is invalid`);
    const artifactMatches = manifest.artifacts.filter((artifact) => artifact.id === row.artifactId);
    if (artifactMatches.length !== 1) {
      errors.push(`artifacts must contain exactly one ${row.artifactId}`);
    } else {
      const artifact = artifactMatches[0]!;
      if (artifact.path !== row.projectionPath) errors.push(`${row.artifactId} artifact path mismatch`);
      if (artifact.sha256 !== row.digest) errors.push(`${row.artifactId} artifact hash mismatch`);
      const expectedRole = row.isRegistry ? "runtime-evidence-registry" : "runtime-evidence-projection";
      if (artifact.role !== expectedRole) errors.push(`${row.artifactId} artifact role mismatch`);
    }

    if (row.immutablePath !== null) {
      if (row.isRegistry) {
        const match = ESTIMATE_UNITS.some((unitId) => isSafeImmutablePath(row.immutablePath!, unitId));
        if (!match) errors.push(`${row.artifactId} immutable path escapes the registered run roots`);
      } else if (!isSafeImmutablePath(row.immutablePath, row.unitId!)) {
        errors.push(`${row.artifactId} immutable path is outside ${row.unitId} run history`);
      }
      if (row.immutablePath === row.projectionPath) errors.push(`${row.artifactId} immutable path is cyclic`);
    }

    if (!files) continue;
    const projection = files[row.projectionPath];
    if (!projection || projection.kind !== "file") {
      errors.push(`${row.artifactId} projection is not a regular file`);
      continue;
    }
    const projectionBytes = bytes(projection.bytes);
    if (sha256(projectionBytes) !== row.digest) errors.push(`${row.artifactId} projection hash mismatch`);
    if (row.immutablePath === null) continue;
    const immutable = files[row.immutablePath];
    if (!immutable || immutable.kind !== "file") {
      errors.push(`${row.artifactId} immutable source is not a regular file`);
      continue;
    }
    if (immutable.noOverwrite !== true) errors.push(`${row.artifactId} immutable source is not marked no-overwrite`);
    const immutableBytes = bytes(immutable.bytes);
    if (!Buffer.from(immutableBytes).equals(Buffer.from(projectionBytes))) {
      errors.push(`${row.artifactId} immutable and projection bytes differ`);
    }
    if (sha256(immutableBytes) !== row.digest) errors.push(`${row.artifactId} immutable hash mismatch`);
    if (row.isRegistry) {
      try {
        assertNoRegistrySelfEntry(immutableBytes);
      } catch (error) {
        errors.push((error as Error).message);
      }
    }
  }

  for (const spec of ESTIMATE_SHEET_RUNTIME_PROJECTIONS.filter((row) => row.relationship === "PRIMARY")) {
    const row = runtime.projections.find((candidate) => candidate.artifact_id === spec.artifact_id);
    const evidenceMatches = manifest.evidence_index.filter((evidence) => evidence.id === spec.evidence_id);
    if (evidenceMatches.length !== 1) {
      errors.push(`evidence_index must contain exactly one ${spec.evidence_id}`);
      continue;
    }
    const evidence = evidenceMatches[0]!;
    if (evidence.artifact_path !== spec.projection_path) errors.push(`${spec.evidence_id} primary path mismatch`);
    if (row && evidence.sha256 !== row.sha256) errors.push(`${spec.evidence_id} hash mismatch`);
    if (row?.immutable_path === null && evidence.status !== "STALE") {
      errors.push(`${spec.evidence_id} must remain STALE while its projection is a placeholder`);
    }
    if (row?.immutable_path !== null && evidence.status !== "PASS") {
      const owner = manifest.units.find((unit) => unit.id === spec.unit_id);
      const isUnitOneRefreeze = spec.unit_id === "UNIT-001"
        && evidence.status === "STALE"
        && manifest.next_unit === "UNIT-001"
        && ["READY", "IN_PROGRESS"].includes(owner?.status ?? "");
      if (!isUnitOneRefreeze) errors.push(`${spec.evidence_id} must be PASS after materialization`);
    }
  }

  if (!SHA256_PATTERN.test(manifest.manifest_sha256)) {
    errors.push("manifest_sha256 is invalid");
  } else if (manifest.manifest_sha256 !== calculateEstimateSheetManifestSha256(manifest)) {
    errors.push("manifest_sha256 does not match canonical manifest bytes");
  }
  return errors;
}

export function deriveEstimateSheetPrepareTransition(
  manifest: EstimateSheetPlanManifest,
  input: PrepareTransitionInput,
): EstimateSheetPlanManifest {
  assertTransitionPreconditions(manifest, input);
  const next = cloneManifest(manifest);
  recordById(next.units, input.unitId, "units").status = "IN_PROGRESS";
  next.implementation_status = next.implementation_status === "NOT_STARTED"
    ? "IN_PROGRESS"
    : next.implementation_status;
  next.last_observed_run_scope = input.unitId === "UNIT-011" ? "EXTERNAL_ACTIONS" : "IMPLEMENT_LOCAL";
  next.updated_at = input.updatedAt;
  next.runtime_evidence.transition_sequence += 1;
  next.runtime_evidence.latest_unit_id = input.unitId;
  next.runtime_evidence.latest_run_id = input.runId;
  next.runtime_evidence.latest_run_manifest_sha256 = input.runManifestSha256;
  return finalizeManifest(next);
}

/** Repoint an unindexed in-progress unit to a fresh run without changing prior immutable history. */
export function deriveEstimateSheetPrepareRetryTransition(
  manifest: EstimateSheetPlanManifest,
  input: PrepareTransitionInput,
): EstimateSheetPlanManifest {
  const errors = validateEstimateSheetRuntimeState(manifest);
  if (errors.length > 0) throw new Error(`runtime manifest invalid: ${errors.join("; ")}`);
  if (manifest.next_unit !== input.unitId) throw new Error(`prepare retry requires next_unit ${input.unitId}`);
  if (recordById(manifest.units, input.unitId, "units").status !== "IN_PROGRESS") throw new Error("prepare retry requires an in-progress unit");
  if (manifest.runtime_evidence.latest_unit_id !== input.unitId || !manifest.runtime_evidence.latest_run_id) throw new Error("prepare retry must replace the current unit run");
  if (manifest.runtime_evidence.registry.immutable_path?.includes(`/${manifest.runtime_evidence.latest_run_id}-`)) {
    throw new Error("prepare retry is forbidden after evidence indexing");
  }
  if (!RUN_ID_PATTERN.test(input.runId) || !SHA256_PATTERN.test(input.runManifestSha256) || !isStrictIso(input.updatedAt)) throw new Error("prepare retry input is invalid");
  const next = cloneManifest(manifest);
  next.updated_at = input.updatedAt;
  next.runtime_evidence.transition_sequence += 1;
  next.runtime_evidence.latest_run_id = input.runId;
  next.runtime_evidence.latest_run_manifest_sha256 = input.runManifestSha256;
  // A replacement run invalidates the current unit's terminal projection until it is re-indexed.
  const evidenceId = ESTIMATE_SHEET_RUNTIME_PROJECTIONS.find((spec) => spec.unit_id === input.unitId)?.evidence_id;
  if (evidenceId) {
    recordById(next.evidence_index, evidenceId, "evidence_index").status = "STALE";
  }
  return finalizeManifest(next);
}

export function deriveEstimateSheetVerifiedTransition(
  manifest: EstimateSheetPlanManifest,
  input: VerifiedTransitionInput,
): VerifiedTransitionResult {
  const errors = validateEstimateSheetRuntimeState(manifest);
  if (errors.length > 0) throw new Error(`runtime manifest invalid: ${errors.join("; ")}`);
  if (!isStrictIso(input.updatedAt)) throw new Error(`updatedAt must be strict ISO: ${input.updatedAt}`);
  if (!RUN_ID_PATTERN.test(input.runId)) throw new Error(`invalid run id: ${input.runId}`);
  if (!input.sourceRevision.trim()) throw new Error("sourceRevision must be non-empty");
  if (manifest.next_unit !== input.unitId) throw new Error(`${input.unitId} is not the current next unit`);
  if (
    manifest.runtime_evidence.latest_unit_id !== input.unitId
    || manifest.runtime_evidence.latest_run_id !== input.runId
  ) {
    throw new Error("terminal transition does not match the latest prepared unit/run");
  }
  const currentUnit = recordById(manifest.units, input.unitId, "units");
  if (currentUnit.status !== "IN_PROGRESS") {
    throw new Error(`${input.unitId} must be IN_PROGRESS, got ${currentUnit.status}`);
  }
  if (input.unitId === "UNIT-011" && !input.releaseStatus) {
    throw new Error("UNIT-011 terminal transition requires releaseStatus");
  }
  if (input.unitId !== "UNIT-011" && input.releaseStatus !== undefined) {
    throw new Error("releaseStatus is valid only for UNIT-011");
  }
  const unitStatus = input.unitStatus ?? "VERIFIED";
  if (unitStatus === "SUPERSEDED" && !["UNIT-005", "UNIT-006", "UNIT-007", "UNIT-008", "UNIT-009"].includes(input.unitId)) {
    throw new Error(`${input.unitId} cannot be SUPERSEDED`);
  }

  const unitSpecs = ESTIMATE_SHEET_RUNTIME_PROJECTIONS.filter((spec) => spec.unit_id === input.unitId);
  const expectedIds = [...unitSpecs.map((spec) => spec.artifact_id), ESTIMATE_SHEET_RUNTIME_REGISTRY.artifact_id];
  const actualIds = input.materializations.map((entry) => entry.artifactId);
  if (new Set(actualIds).size !== actualIds.length || !sameStringArray([...actualIds].sort(), [...expectedIds].sort())) {
    throw new Error(`${input.unitId} materializations must be exactly ${expectedIds.join(", ")}`);
  }

  const next = cloneManifest(manifest);
  const writes: ProjectionWrite[] = [];
  const materializationById = new Map(input.materializations.map((entry) => [entry.artifactId, entry]));
  for (const spec of unitSpecs) {
    const materialization = materializationById.get(spec.artifact_id)!;
    if (!isSafeImmutablePath(materialization.immutablePath, input.unitId, input.runId)) {
      throw new Error(`${spec.artifact_id} immutable path is outside the current run`);
    }
    const materializedBytes = bytes(materialization.bytes);
    const digest = sha256(materializedBytes);
    const row = next.runtime_evidence.projections.find((candidate) => candidate.artifact_id === spec.artifact_id)!;
    row.immutable_path = materialization.immutablePath;
    row.sha256 = digest;
    const artifact = recordById(next.artifacts, spec.artifact_id, "artifacts");
    artifact.path = spec.projection_path;
    artifact.sha256 = digest;
    writes.push({
      artifactId: spec.artifact_id,
      path: spec.projection_path,
      immutablePath: materialization.immutablePath,
      bytes: materializedBytes,
      sha256: digest,
    });
  }

  const primary = unitSpecs.find((spec) => spec.relationship === "PRIMARY")!;
  const primaryRow = next.runtime_evidence.projections.find((row) => row.artifact_id === primary.artifact_id)!;
  const evidence = recordById(next.evidence_index, primary.evidence_id, "evidence_index");
  if (evidence.status !== "STALE") throw new Error(`${primary.evidence_id} must be STALE before terminal indexing`);
  evidence.status = "PASS";
  evidence.artifact_path = primary.projection_path;
  evidence.sha256 = primaryRow.sha256;
  evidence.source_revision = input.sourceRevision;
  evidence.valid_until = null;

  const registryMaterialization = materializationById.get(ESTIMATE_SHEET_RUNTIME_REGISTRY.artifact_id)!;
  if (!isSafeImmutablePath(registryMaterialization.immutablePath, input.unitId, input.runId)) {
    throw new Error("ART-052 immutable path is outside the current run");
  }
  assertNoRegistrySelfEntry(registryMaterialization.bytes);
  const registryBytes = bytes(registryMaterialization.bytes);
  const registryDigest = sha256(registryBytes);
  next.runtime_evidence.registry.immutable_path = registryMaterialization.immutablePath;
  next.runtime_evidence.registry.sha256 = registryDigest;
  const registryArtifact = recordById(next.artifacts, ESTIMATE_SHEET_RUNTIME_REGISTRY.artifact_id, "artifacts");
  registryArtifact.path = ESTIMATE_SHEET_RUNTIME_REGISTRY.projection_path;
  registryArtifact.sha256 = registryDigest;
  writes.push({
    artifactId: ESTIMATE_SHEET_RUNTIME_REGISTRY.artifact_id,
    path: ESTIMATE_SHEET_RUNTIME_REGISTRY.projection_path,
    immutablePath: registryMaterialization.immutablePath,
    bytes: registryBytes,
    sha256: registryDigest,
  });

  recordById(next.units, input.unitId, "units").status = unitStatus;
  if (input.unitId === "UNIT-006" && unitStatus === "SUPERSEDED") {
    for (const requirementId of ["REQ-014", "DATA-004"]) {
      recordById(next.requirements ?? [], requirementId, "requirements").status = "DEFERRED";
    }
  }
  for (const testId of UNIT_TEST_UPDATES[input.unitId] ?? []) {
    recordById(next.tests, testId, "tests").status = "PASS";
  }
  const unitIndex = ESTIMATE_UNITS.indexOf(input.unitId);
  next.next_unit = ESTIMATE_UNITS[unitIndex + 1] ?? null;
  next.last_observed_run_scope = input.unitId === "UNIT-011" ? "EXTERNAL_ACTIONS" : "IMPLEMENT_LOCAL";
  next.updated_at = input.updatedAt;
  next.runtime_evidence.transition_sequence += 1;
  next.runtime_evidence.latest_unit_id = input.unitId;
  next.runtime_evidence.latest_run_id = input.runId;

  if (input.unitId === "UNIT-011") {
    next.implementation_status = "COMPLETE";
    next.release_status = input.releaseStatus!;
    next.ready_slices = next.ready_slices.filter((slice) => slice.id !== "SLICE-001");
  }

  return { manifest: finalizeManifest(next), projectionWrites: writes };
}

function runIdFromImmutablePath(path: string | null, unitId: EstimateUnit): string {
  if (!path) throw new Error(`${unitId} has no immutable evidence to reopen`);
  const prefix = `evidence/runtime/runs/${unitId}/`;
  if (!path.startsWith(prefix)) throw new Error(`${unitId} immutable evidence path is invalid`);
  const runKey = path.slice(prefix.length).split("/")[0] ?? "";
  const runId = runKey.match(/^(.+)-[0-9a-f]{12}-[0-9a-f]{12}$/u)?.[1] ?? "";
  if (!RUN_ID_PATTERN.test(runId)) throw new Error(`${unitId} immutable evidence run id is invalid`);
  return runId;
}

export function deriveEstimateSheetRefreezeReopenTransition(
  manifest: EstimateSheetPlanManifest,
  input: RefreezeReopenTransitionInput,
): EstimateSheetPlanManifest {
  const errors = validateEstimateSheetRuntimeState(manifest);
  if (errors.length > 0) throw new Error(`runtime manifest invalid: ${errors.join("; ")}`);
  if (!isStrictIso(input.updatedAt)) throw new Error(`updatedAt must be strict ISO: ${input.updatedAt}`);
  if (!SHA256_PATTERN.test(input.runManifestSha256)) {
    throw new Error("refreeze run manifest SHA-256 must be a lowercase digest");
  }
  if (manifest.package_status !== "IMPLEMENTATION_READY" || manifest.plan_lifecycle !== "ACTIVE" || manifest.terminal_status !== "ACTIVE") {
    throw new Error("refreeze reopen requires an active implementation-ready pack");
  }
  const unitOne = recordById(manifest.units, "UNIT-001", "units");
  const unitTwo = recordById(manifest.units, "UNIT-002", "units");
  if (unitOne.status !== "VERIFIED") throw new Error("refreeze reopen requires UNIT-001=VERIFIED");
  if (!["READY", "IN_PROGRESS"].includes(unitTwo.status)) throw new Error(`refreeze reopen cannot reset UNIT-002=${unitTwo.status}`);
  const unitTwoEvidence = recordById(manifest.evidence_index, "EVID-003", "evidence_index");
  if (unitTwoEvidence.status === "PASS") throw new Error("refreeze reopen is forbidden after UNIT-002 evidence passes");
  const unitOneRow = manifest.runtime_evidence.projections.find((row) => row.artifact_id === "ART-040");
  const priorRunId = runIdFromImmutablePath(unitOneRow?.immutable_path ?? null, "UNIT-001");

  const next = cloneManifest(manifest);
  recordById(next.units, "UNIT-001", "units").status = "READY";
  if (recordById(next.units, "UNIT-002", "units").status === "IN_PROGRESS") {
    recordById(next.units, "UNIT-002", "units").status = "READY";
  }
  recordById(next.evidence_index, "EVID-002", "evidence_index").status = "STALE";
  recordById(next.tests, "TEST-002", "tests").status = "PLANNED";
  next.next_unit = "UNIT-001";
  next.implementation_status = "IN_PROGRESS";
  next.last_observed_run_scope = "IMPLEMENT_LOCAL";
  next.updated_at = input.updatedAt;
  next.runtime_evidence.transition_sequence += 1;
  next.runtime_evidence.latest_unit_id = "UNIT-001";
  next.runtime_evidence.latest_run_id = priorRunId;
  next.runtime_evidence.latest_run_manifest_sha256 = input.runManifestSha256;
  return finalizeManifest(next);
}

export function deriveEstimateSheetTechnicalBlockTransition(
  manifest: EstimateSheetPlanManifest,
  input: TechnicalBlockTransitionInput,
): EstimateSheetPlanManifest {
  const errors = validateEstimateSheetRuntimeState(manifest);
  if (errors.length > 0) throw new Error(`runtime manifest invalid: ${errors.join("; ")}`);
  if (!isStrictIso(input.updatedAt)) throw new Error(`updatedAt must be strict ISO: ${input.updatedAt}`);
  if (manifest.runtime_evidence.latest_unit_id !== "UNIT-011" || manifest.runtime_evidence.latest_run_id !== input.runId) {
    throw new Error("technical block must bind the current UNIT-011 run");
  }
  if (recordById(manifest.units, "UNIT-011", "units").status !== "IN_PROGRESS") {
    throw new Error("technical block requires UNIT-011=IN_PROGRESS");
  }
  const next = cloneManifest(manifest);
  recordById(next.units, "UNIT-011", "units").status = "BLOCKED";
  next.package_status = "NOT_READY";
  next.implementation_status = "INCOMPLETE";
  next.terminal_status = "TECH_BLOCKED";
  next.release_status = input.releaseStatus;
  next.next_unit = null;
  next.ready_slices = next.ready_slices.filter((slice) => slice.id !== "SLICE-001");
  next.last_observed_run_scope = "EXTERNAL_ACTIONS";
  next.updated_at = input.updatedAt;
  next.runtime_evidence.transition_sequence += 1;
  return finalizeManifest(next);
}

export function deriveEstimateSheetReleaseReopenTransition(
  manifest: EstimateSheetPlanManifest,
  input: ReleaseReopenTransitionInput,
): EstimateSheetPlanManifest {
  const errors = validateEstimateSheetRuntimeState(manifest);
  if (errors.length > 0) throw new Error(`runtime manifest invalid: ${errors.join("; ")}`);
  if (!isStrictIso(input.updatedAt)) throw new Error(`updatedAt must be strict ISO: ${input.updatedAt}`);
  if (recordById(manifest.units, "UNIT-011", "units").status !== "VERIFIED"
    || manifest.release_status !== "NOT_READY"
    || manifest.terminal_status !== "ACTIVE") {
    throw new Error("release reopen requires verified UNIT-011 with NOT_READY active release state");
  }
  const next = cloneManifest(manifest);
  recordById(next.units, "UNIT-011", "units").status = "READY";
  next.next_unit = "UNIT-011";
  next.ready_slices = [{ id: "SLICE-001", unit_ids: [...ESTIMATE_UNITS] }];
  next.implementation_status = "COMPLETE";
  next.updated_at = input.updatedAt;
  next.runtime_evidence.transition_sequence += 1;
  return finalizeManifest(next);
}

export function deriveEstimateSheetFinalCloseoutTransition(
  manifest: EstimateSheetPlanManifest,
  input: FinalCloseoutTransitionInput,
): EstimateSheetPlanManifest {
  const errors = validateEstimateSheetRuntimeState(manifest);
  if (errors.length > 0) throw new Error(`runtime manifest invalid: ${errors.join("; ")}`);
  if (!isStrictIso(input.updatedAt)) throw new Error(`updatedAt must be strict ISO: ${input.updatedAt}`);
  if (recordById(manifest.units, "UNIT-011", "units").status !== "VERIFIED"
    || manifest.release_status !== "READY"
    || manifest.implementation_status !== "COMPLETE"
    || manifest.next_unit !== null
    || manifest.ready_slices.some((slice) => slice.id === "SLICE-001")) {
    throw new Error("final closeout requires completed READY release state");
  }
  const failedTest = manifest.tests.find((test) => !["PASS", "SKIPPED"].includes(test.status));
  if (failedTest) throw new Error(`final closeout requires terminal tests, got ${failedTest.id}=${failedTest.status}`);
  const risks = manifest.risks ?? [];
  const openRiskIds = risks.filter((risk) => ["OPEN", "REALIZED"].includes(risk.status)).map((risk) => risk.id).sort();
  const dispositionIds = input.riskDispositions.map((entry) => entry.riskId).sort();
  if (new Set(dispositionIds).size !== dispositionIds.length || !sameStringArray(openRiskIds, dispositionIds)) {
    throw new Error("final closeout requires exactly one disposition for every open risk");
  }
  for (const entry of input.riskDispositions) {
    if (!entry.rationale.trim() || entry.evidenceIds.length === 0 || entry.evidenceIds.some((id) => !/^EVID-\d+$/u.test(id))) {
      throw new Error(`invalid final risk disposition for ${entry.riskId}`);
    }
  }
  const next = cloneManifest(manifest);
  for (const entry of input.riskDispositions) {
    recordById(next.risks ?? [], entry.riskId, "risks").status = entry.disposition;
  }
  next.plan_lifecycle = "ARCHIVE_READY";
  next.terminal_status = "ACHIEVED";
  next.updated_at = input.updatedAt;
  next.runtime_evidence.transition_sequence += 1;
  return finalizeManifest(next);
}

function canonicalObject(value: unknown): string {
  return JSON.stringify(deepSort(value));
}

export function validateEstimateSheetPrepareTransition(
  before: EstimateSheetPlanManifest,
  after: EstimateSheetPlanManifest,
  input: PrepareTransitionInput,
): string[] {
  try {
    const expected = deriveEstimateSheetPrepareTransition(before, input);
    return canonicalObject(expected) === canonicalObject(after)
      ? []
      : ["prepare transition contains a missing, incorrect, or extra mutation"];
  } catch (error) {
    return [(error as Error).message];
  }
}

export function validateEstimateSheetVerifiedTransition(
  before: EstimateSheetPlanManifest,
  after: EstimateSheetPlanManifest,
  input: VerifiedTransitionInput,
): string[] {
  try {
    const expected = deriveEstimateSheetVerifiedTransition(before, input).manifest;
    return canonicalObject(expected) === canonicalObject(after)
      ? []
      : ["verified transition contains a missing, incorrect, or extra mutation"];
  } catch (error) {
    return [(error as Error).message];
  }
}

function validateExactTransition(
  derive: () => EstimateSheetPlanManifest,
  after: EstimateSheetPlanManifest,
  label: string,
): string[] {
  try {
    return canonicalObject(derive()) === canonicalObject(after)
      ? []
      : [`${label} transition contains a missing, incorrect, or extra mutation`];
  } catch (error) {
    return [(error as Error).message];
  }
}

export function validateEstimateSheetRefreezeReopenTransition(
  before: EstimateSheetPlanManifest,
  after: EstimateSheetPlanManifest,
  input: RefreezeReopenTransitionInput,
): string[] {
  return validateExactTransition(() => deriveEstimateSheetRefreezeReopenTransition(before, input), after, "refreeze reopen");
}

export function validateEstimateSheetTechnicalBlockTransition(
  before: EstimateSheetPlanManifest,
  after: EstimateSheetPlanManifest,
  input: TechnicalBlockTransitionInput,
): string[] {
  return validateExactTransition(() => deriveEstimateSheetTechnicalBlockTransition(before, input), after, "technical block");
}

export function validateEstimateSheetReleaseReopenTransition(
  before: EstimateSheetPlanManifest,
  after: EstimateSheetPlanManifest,
  input: ReleaseReopenTransitionInput,
): string[] {
  return validateExactTransition(() => deriveEstimateSheetReleaseReopenTransition(before, input), after, "release reopen");
}

export function validateEstimateSheetFinalCloseoutTransition(
  before: EstimateSheetPlanManifest,
  after: EstimateSheetPlanManifest,
  input: FinalCloseoutTransitionInput,
): string[] {
  return validateExactTransition(() => deriveEstimateSheetFinalCloseoutTransition(before, input), after, "final closeout");
}
