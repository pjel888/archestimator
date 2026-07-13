#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import {
  closeSync,
  constants,
  cpSync,
  existsSync,
  fchmodSync,
  fstatSync,
  fsyncSync,
  linkSync,
  lstatSync,
  mkdtempSync,
  mkdirSync,
  openSync,
  readFileSync,
  realpathSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const SCHEMA_VERSION = "estimate-sheet-planning-admission.v1";
const REVIEW_CANDIDATE_SCHEMA_VERSION =
  "estimate-sheet-planning-review-candidate.v1";
const REVIEW_SCHEMA_VERSION = "estimate-sheet-independent-review.v1";
const PACKAGE_ID = "PLAN-2026-07-08-project-estimate-sheet-performance";
const SYSTEM_GIT_PATH = "/usr/bin/git";
const SYSTEM_PATH = "/usr/bin:/bin";
const STARTUP_INJECTION_ENV = [
  "NODE_OPTIONS",
  "NODE_PATH",
  "BUN_OPTIONS",
  "LD_PRELOAD",
  "LD_LIBRARY_PATH",
  "DYLD_INSERT_LIBRARIES",
  "DYLD_LIBRARY_PATH",
];
const OUTPUT_PATH =
  ".ai/99_scratch/estimate-sheet-performance/admissions/UNIT-001-planning.json";
const REVIEW_ROOT = ".ai/99_scratch/estimate-sheet-performance/reviews";
const REVIEW_ROLES = ["architect", "critic", "fingerprint-verifier"];
const CANONICAL_ARTIFACT_ID = "ART-031";
const CANONICAL_PATH = "IMPLEMENTATION_PLAN.md";
const READINESS_ARTIFACT_ID = "ART-034";
const READINESS_PATH =
  "evidence/2026-07-10-frontier-plan-readiness.md";
const REFERENCE_ARTIFACT_ID = "ART-036";
const RECORDER_ARTIFACT_ID = "ART-037";
const REFERENCE_PATH = "evidence/source-fingerprint-v1.mjs";
const RECORDER_PATH = "evidence/record-unit001-planning-admission.mjs";
const VALIDATOR_PATHS = [
  "scripts/validate-plan-pack.mjs",
  "scripts/lib/plan-pack-validator.mjs",
];
const SNAPSHOT_ROOT =
  ".ai/99_scratch/estimate-sheet-performance/admission-snapshots";

const sequenceIds = (prefix, count, start = 1) =>
  Array.from(
    { length: count },
    (_, index) =>
      `${prefix}-${String(index + start).padStart(3, "0")}`,
  );
const SOURCE_IDS = sequenceIds("SRC", 4);
const REQUIREMENT_IDS = [
  ...sequenceIds("REQ", 36),
  ...sequenceIds("PERF", 10),
  ...sequenceIds("OPS", 8),
  ...sequenceIds("DATA", 11),
  "SEC-001",
];
const ASSUMPTION_IDS = sequenceIds("ASSUMP", 5);
const DECISION_IDS = sequenceIds("DEC-AUTO", 15);
const CRITERION_IDS = sequenceIds("AC", 12);
const GATE_IDS = [
  "GATE-UX-001",
  "GATE-NEXT-001",
  "GATE-CONTRACT-001",
  "GATE-DATA-001",
  "GATE-SEC-001",
  "GATE-VERIFY-001",
  "GATE-PERF-001",
  "GATE-OPS-001",
  "GATE-CLEAN-001",
];
const RISK_IDS = sequenceIds("RISK", 12);
const UNIT_IDS = sequenceIds("UNIT", 11);
const ARTIFACT_IDS = sequenceIds("ART", 52);
const RUNTIME_TEST_IDS = sequenceIds("TEST", 5, 2);
const RUNTIME_EVIDENCE_IDS = [
  ...Array.from(
    { length: 10 },
    (_, index) => `EVID-${String(index + 2).padStart(3, "0")}`,
  ),
  "EVID-013",
];
const RUNTIME_EVIDENCE_CONTRACT_VERSION =
  "estimate-sheet-runtime-manifest-state.v1";
const REVIEW_BINDING_PREFIX = "review-binding:v1:";
const RUNTIME_PLACEHOLDER_SCHEMA =
  "estimate-sheet-evidence-projection-placeholder.v1";
const RUNTIME_REGISTRY_PLACEHOLDER_SCHEMA =
  "estimate-sheet-evidence-registry-placeholder.v1";
const RUNTIME_CONTRACT_ARTIFACT = {
  artifact_id: "ART-038",
  role: "runtime-manifest-contract",
  path: "30_RUNTIME_EVIDENCE_AND_MANIFEST_TRANSITIONS.md",
};
const RUNTIME_REGISTRY_CONTRACT = {
  artifact_id: "ART-052",
  role: "runtime-evidence-registry",
  projection_path: "evidence/runtime/evidence-index.json",
};
const RUNTIME_PROJECTION_CONTRACT = [
  ["ART-039", "EVID-002", "SECONDARY", "fixture", "fixture-manifest.json"],
  ["ART-040", "EVID-002", "PRIMARY", "jsdom", "jsdom-baseline.json"],
  ["ART-041", "EVID-003", "PRIMARY", "browser", "browser-baseline.json"],
  ["ART-042", "EVID-004", "PRIMARY", "d1-local", "d1-local-baseline.json"],
  ["ART-043", "EVID-013", "PRIMARY", "decision", "bottleneck-decision.json"],
  ["ART-044", "EVID-005", "PRIMARY", "unit-005", "unit-005-route-d1.json"],
  ["ART-045", "EVID-006", "PRIMARY", "unit-006", "unit-006-graph.json"],
  ["ART-046", "EVID-007", "PRIMARY", "unit-007", "unit-007-derived-state.json"],
  ["ART-047", "EVID-008", "PRIMARY", "unit-008", "unit-008-render-a11y.json"],
  ["ART-048", "EVID-009", "PRIMARY", "unit-009", "unit-009-mutations.json"],
  ["ART-049", "EVID-010", "PRIMARY", "integrated-local", "integrated-local-proof.json"],
  ["ART-050", "EVID-011", "PRIMARY", "hosted-d1", "hosted-d1-proof.json"],
  ["ART-051", "EVID-011", "SECONDARY", "release", "release-evaluation.md"],
].map(([artifact_id, evidence_id, relationship, role, basename]) => ({
  artifact_id,
  evidence_id,
  relationship,
  role,
  projection_path: `evidence/runtime/${basename}`,
}));

function assertTrustedRuntime() {
  const injectedEnvironment = STARTUP_INJECTION_ENV.filter(
    (key) => typeof process.env[key] === "string" && process.env[key].length > 0,
  );
  if (process.execArgv.length > 0 || injectedEnvironment.length > 0) {
    const controls = [
      ...(process.execArgv.length > 0 ? ["execArgv"] : []),
      ...injectedEnvironment,
    ];
    throw new Error(
      `runtime startup controls are not permitted: ${controls.join(", ")}`,
    );
  }

  const gitStat = lstatSync(SYSTEM_GIT_PATH);
  if (
    !gitStat.isFile() ||
    gitStat.uid !== 0 ||
    (gitStat.mode & 0o022) !== 0
  ) {
    throw new Error("trusted system Git is unavailable");
  }
}

assertTrustedRuntime();

const deterministicEnv = {
  PATH: SYSTEM_PATH,
  LC_ALL: "C",
  LANG: "C",
  TZ: "UTC",
  GIT_CONFIG_NOSYSTEM: "1",
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_SYSTEM: "/dev/null",
  GIT_CONFIG_COUNT: "0",
  GIT_ATTR_NOSYSTEM: "1",
  GIT_LITERAL_PATHSPECS: "1",
  GIT_PAGER: "cat",
  GIT_OPTIONAL_LOCKS: "0",
  GIT_TERMINAL_PROMPT: "0",
};

const packRoot = realpathSync(
  resolve(dirname(fileURLToPath(import.meta.url)), ".."),
);
const repoRoot = execFileSync(
  SYSTEM_GIT_PATH,
  [
    "--no-pager",
    "-c",
    "color.ui=false",
    "-c",
    "core.attributesFile=/dev/null",
    "-c",
    "core.excludesFile=/dev/null",
    "rev-parse",
    "--show-toplevel",
  ],
  {
    cwd: packRoot,
    env: deterministicEnv,
    encoding: "utf8",
  },
).trim();
const realRepoRoot = realpathSync(repoRoot);
if (!isInside(realRepoRoot, packRoot) || packRoot === realRepoRoot) {
  throw new Error(
    "planning pack is not contained by the repository root",
  );
}

const manifestPath = resolve(packRoot, "plan-pack.json");
const manifestBytes = readPhysicalFile(
  manifestPath,
  "plan-pack.json",
).bytes;
const manifest = JSON.parse(manifestBytes.toString("utf8"));

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function deepSort(value) {
  if (Array.isArray(value)) return value.map(deepSort);
  if (!isPlainObject(value)) return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, deepSort(value[key])]),
  );
}

function canonicalBytes(value) {
  return Buffer.from(JSON.stringify(deepSort(value)), "utf8");
}

function serializeJson(value) {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function reviewBindingSourceRevision(value) {
  const reviewEvidence = value.evidence_index?.find(
    ({ id }) => id === "EVID-012",
  );
  if (!reviewEvidence) {
    throw new Error("EVID-012 is required for review binding");
  }
  const payload = {
    schema_version: "estimate-sheet-review-binding.v1",
    package_id: value.package_id,
    canonical_execution_artifact: value.canonical_execution_artifact,
    baseline: value.baseline,
    artifacts: value.artifacts.map(
      ({ id, role, path, sha256: artifactHash }) => ({
        id,
        role,
        path,
        sha256: artifactHash,
      }),
    ),
    readiness_evidence: {
      artifact_path: reviewEvidence.artifact_path,
      sha256: reviewEvidence.sha256,
    },
    runtime_evidence: value.runtime_evidence,
  };
  return `${REVIEW_BINDING_PREFIX}${sha256(canonicalBytes(payload))}`;
}

function requireReviewEvidenceBinding(value) {
  const reviewEvidence = value.evidence_index?.find(
    ({ id }) => id === "EVID-012",
  );
  if (
    !reviewEvidence ||
    reviewEvidence.source_revision !== reviewBindingSourceRevision(value)
  ) {
    throw new Error("EVID-012 source_revision is not bound to this candidate");
  }
}

function requireInitialRuntimePlaceholderPayloads(value) {
  for (const projection of RUNTIME_PROJECTION_CONTRACT) {
    const artifact = value.artifacts.find(
      ({ id }) => id === projection.artifact_id,
    );
    const { bytes } = readPhysicalFile(
      resolve(packRoot, artifact.path),
      projection.artifact_id,
    );
    const basename = projection.projection_path.split("/").at(-1);
    if (projection.artifact_id === "ART-051") {
      const expected = [
        "<!-- estimate-sheet-evidence-projection-placeholder.v1 -->",
        "",
        "# Release Evaluation",
        "",
        "Status: `STALE`",
        "",
        "Artifact: `ART-051`; evidence: `EVID-011`.",
        "",
      ].join("\n");
      if (bytes.toString("utf8") !== expected) {
        throw new Error("ART-051 placeholder bytes are invalid");
      }
      continue;
    }
    const payload = JSON.parse(bytes.toString("utf8"));
    const isRegistry = projection.artifact_id === "ART-052";
    requireExactKeys(
      payload,
      `${projection.artifact_id} placeholder`,
      isRegistry
        ? ["artifactId", "projection", "schema", "status"]
        : ["artifactId", "evidenceId", "projection", "schema", "status"],
    );
    if (
      payload.artifactId !== projection.artifact_id ||
      payload.projection !== basename ||
      payload.schema !==
        (isRegistry
          ? RUNTIME_REGISTRY_PLACEHOLDER_SCHEMA
          : RUNTIME_PLACEHOLDER_SCHEMA) ||
      payload.status !== "STALE" ||
      (!isRegistry && payload.evidenceId !== projection.evidence_id)
    ) {
      throw new Error(
        `${projection.artifact_id} placeholder payload is invalid`,
      );
    }
  }
  const registry = value.artifacts.find(({ id }) => id === "ART-052");
  const { bytes: registryBytes } = readPhysicalFile(
    resolve(packRoot, registry.path),
    "ART-052",
  );
  const registryPayload = JSON.parse(registryBytes.toString("utf8"));
  requireExactKeys(registryPayload, "ART-052 placeholder", [
    "artifactId",
    "projection",
    "schema",
    "status",
  ]);
  if (
    registryPayload.artifactId !== "ART-052" ||
    registryPayload.projection !== "evidence-index.json" ||
    registryPayload.schema !== RUNTIME_REGISTRY_PLACEHOLDER_SCHEMA ||
    registryPayload.status !== "STALE"
  ) {
    throw new Error("ART-052 placeholder payload is invalid");
  }
}

function canonicalManifestHash(value) {
  const withoutSelfHash = structuredClone(value);
  delete withoutSelfHash.manifest_sha256;
  return sha256(canonicalBytes(withoutSelfHash));
}

function refreshManifestHash(value) {
  value.manifest_sha256 = canonicalManifestHash(value);
  return value;
}

function isInside(root, target) {
  const back = relative(root, target);
  return (
    back === "" ||
    (!back.startsWith(`..${sep}`) &&
      back !== ".." &&
      !isAbsolute(back))
  );
}

function sameIdentity(left, right) {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.isDirectory() === right.isDirectory() &&
    left.isFile() === right.isFile()
  );
}

function readPhysicalFile(path, label) {
  const before = lstatSync(path);
  if (
    !before.isFile() ||
    before.isSymbolicLink() ||
    realpathSync(path) !== path
  ) {
    throw new Error(`${label} must be a physical regular file`);
  }
  const fd = openSync(
    path,
    constants.O_RDONLY | constants.O_NOFOLLOW,
  );
  try {
    const opened = fstatSync(fd);
    if (!opened.isFile() || !sameIdentity(before, opened)) {
      throw new Error(`${label} changed while opening`);
    }
    const bytes = readFileSync(fd);
    const after = lstatSync(path);
    if (!sameIdentity(opened, after)) {
      throw new Error(`${label} changed while reading`);
    }
    return { bytes, stat: after };
  } finally {
    closeSync(fd);
  }
}

function requireManifestSelfHash(value) {
  const actual = canonicalManifestHash(value);
  if (actual !== value.manifest_sha256) {
    throw new Error(
      `manifest hash mismatch: expected ${value.manifest_sha256}, received ${actual}`,
    );
  }
  return actual;
}

function requireArtifact(value, id, expectedPath, root = packRoot) {
  const matches =
    value.artifacts?.filter((candidate) => candidate.id === id) ?? [];
  if (
    matches.length !== 1 ||
    matches[0].path !== expectedPath
  ) {
    throw new Error(`${id} must uniquely register ${expectedPath}`);
  }
  const artifact = matches[0];
  const absolutePath = resolve(root, artifact.path);
  if (
    !isInside(root, absolutePath) ||
    absolutePath === root
  ) {
    throw new Error(`${id} escapes the plan pack`);
  }
  const { bytes } = readPhysicalFile(absolutePath, id);
  const actualHash = sha256(bytes);
  if (actualHash !== artifact.sha256) {
    throw new Error(
      `${id} hash mismatch: expected ${artifact.sha256}, received ${actualHash}`,
    );
  }
  return {
    artifact_id: id,
    role: artifact.role,
    path: artifact.path,
    sha256: actualHash,
  };
}

function requireEveryArtifact(value, root = packRoot) {
  if (!Array.isArray(value.artifacts) || value.artifacts.length === 0) {
    throw new Error("manifest artifacts must be a non-empty array");
  }
  for (const artifact of value.artifacts) {
    requireArtifact(value, artifact.id, artifact.path, root);
  }
}

function assertLivePackMatches(value, expectedManifestBytes) {
  const live = readPhysicalFile(
    manifestPath,
    "plan-pack.json",
  ).bytes;
  if (!live.equals(expectedManifestBytes)) {
    throw new Error("plan-pack.json changed during admission work");
  }
  requireEveryArtifact(value);
}

function requireStatus(collection, id, expectedStatus) {
  const matches =
    collection?.filter((candidate) => candidate.id === id) ?? [];
  if (
    matches.length !== 1 ||
    matches[0].status !== expectedStatus
  ) {
    throw new Error(`${id} must be ${expectedStatus}`);
  }
}

function requireAllStatus(collection, label, expectedStatus) {
  if (!Array.isArray(collection) || collection.length === 0) {
    throw new Error(`${label} must be a non-empty array`);
  }
  const invalid = collection.find(
    (entry) => entry.status !== expectedStatus,
  );
  if (invalid) {
    throw new Error(`${invalid.id} must be ${expectedStatus}`);
  }
}

function requireExactIds(collection, label, expectedIds) {
  if (!Array.isArray(collection)) {
    throw new Error(`${label} must be an array`);
  }
  const actualIds = collection.map(({ id }) => id).sort();
  const sortedExpected = [...expectedIds].sort();
  if (
    actualIds.length !== sortedExpected.length ||
    actualIds.some((id, index) => id !== sortedExpected[index])
  ) {
    throw new Error(`${label} IDs do not match the planning contract`);
  }
}

function requireExactPlanningIdsAndInvariants(value) {
  requireExactIds(value.sources, "sources", SOURCE_IDS);
  requireExactIds(
    value.requirements,
    "requirements",
    REQUIREMENT_IDS,
  );
  requireExactIds(
    value.assumptions,
    "assumptions",
    ASSUMPTION_IDS,
  );
  requireExactIds(value.decisions, "decisions", DECISION_IDS);
  requireExactIds(value.criteria, "criteria", CRITERION_IDS);
  requireExactIds(value.gates, "gates", GATE_IDS);
  requireExactIds(value.risks, "risks", RISK_IDS);
  requireAllStatus(value.risks, "risks", "OPEN");
  requireExactIds(
    value.authorization_boundaries,
    "authorization boundaries",
    [],
  );
  requireExactIds(value.units, "units", UNIT_IDS);
  requireExactIds(value.artifacts, "artifacts", ARTIFACT_IDS);
  requireExactIds(value.tests, "tests", [
    "TEST-001",
    ...RUNTIME_TEST_IDS,
    "TEST-007",
  ]);
  requireExactIds(value.evidence_index, "evidence", [
    "EVID-001",
    ...RUNTIME_EVIDENCE_IDS,
    "EVID-012",
  ]);
  requireInitialRuntimeEvidence(value);
  requireInitialRuntimePlaceholderPayloads(value);
  requireReviewEvidenceBinding(value);
}

function requireInitialRuntimeEvidence(value) {
  const runtime = value.runtime_evidence;
  requireExactKeys(runtime, "runtime_evidence", [
    "contract_version",
    "transition_sequence",
    "latest_unit_id",
    "latest_run_id",
    "registry",
    "projections",
  ]);
  if (
    runtime.contract_version !== RUNTIME_EVIDENCE_CONTRACT_VERSION ||
    runtime.transition_sequence !== 0 ||
    runtime.latest_unit_id !== null ||
    runtime.latest_run_id !== null
  ) {
    throw new Error("runtime_evidence is not in its exact initial state");
  }

  const contractArtifact = value.artifacts.find(
    ({ id }) => id === RUNTIME_CONTRACT_ARTIFACT.artifact_id,
  );
  if (
    contractArtifact.role !== RUNTIME_CONTRACT_ARTIFACT.role ||
    contractArtifact.path !== RUNTIME_CONTRACT_ARTIFACT.path
  ) {
    throw new Error("ART-038 does not register the runtime transition contract");
  }

  requireExactKeys(runtime.registry, "runtime_evidence.registry", [
    "artifact_id",
    "projection_path",
    "immutable_path",
    "sha256",
  ]);
  const registryArtifact = value.artifacts.find(
    ({ id }) => id === RUNTIME_REGISTRY_CONTRACT.artifact_id,
  );
  if (
    registryArtifact.role !== RUNTIME_REGISTRY_CONTRACT.role ||
    registryArtifact.path !== RUNTIME_REGISTRY_CONTRACT.projection_path ||
    runtime.registry.artifact_id !== RUNTIME_REGISTRY_CONTRACT.artifact_id ||
    runtime.registry.projection_path !==
      RUNTIME_REGISTRY_CONTRACT.projection_path ||
    runtime.registry.immutable_path !== null ||
    runtime.registry.sha256 !== registryArtifact.sha256
  ) {
    throw new Error("runtime evidence registry declaration is invalid");
  }

  if (
    !Array.isArray(runtime.projections) ||
    runtime.projections.length !== RUNTIME_PROJECTION_CONTRACT.length
  ) {
    throw new Error("runtime evidence projection registry is incomplete");
  }
  for (const [index, expected] of RUNTIME_PROJECTION_CONTRACT.entries()) {
    const actual = runtime.projections[index];
    requireExactKeys(actual, `runtime_evidence.projections[${index}]`, [
      "artifact_id",
      "evidence_id",
      "relationship",
      "role",
      "projection_path",
      "immutable_path",
      "sha256",
    ]);
    const artifact = value.artifacts.find(
      ({ id }) => id === expected.artifact_id,
    );
    if (
      actual.artifact_id !== expected.artifact_id ||
      actual.evidence_id !== expected.evidence_id ||
      actual.relationship !== expected.relationship ||
      actual.role !== expected.role ||
      actual.projection_path !== expected.projection_path ||
      actual.immutable_path !== null ||
      actual.sha256 !== artifact.sha256 ||
      artifact.role !== "runtime-evidence-projection" ||
      artifact.path !== expected.projection_path
    ) {
      throw new Error(`runtime evidence projection ${expected.artifact_id} is invalid`);
    }
    if (expected.relationship === "PRIMARY") {
      const evidence = value.evidence_index.find(
        ({ id }) => id === expected.evidence_id,
      );
      if (
        evidence.artifact_path !== expected.projection_path ||
        evidence.sha256 !== artifact.sha256
      ) {
        throw new Error(
          `${expected.evidence_id} does not reciprocate its primary projection`,
        );
      }
    }
  }

  const req014 = value.requirements.find(({ id }) => id === "REQ-014");
  const data004 = value.requirements.find(({ id }) => id === "DATA-004");
  const unit010 = value.units.find(({ id }) => id === "UNIT-010");
  if (
    !req014.unit_ids.includes("UNIT-010") ||
    !data004.unit_ids.includes("UNIT-010") ||
    !unit010.requirement_ids.includes("REQ-014") ||
    !unit010.requirement_ids.includes("DATA-004")
  ) {
    throw new Error("UNIT-010 must reciprocally own REQ-014 and DATA-004");
  }
}

function requireInvariantTopLevel(value) {
  if (
    value.package_id !== PACKAGE_ID ||
    value.profile !== "high-blast-radius" ||
    value.package_action_ceiling !== "EXTERNAL_ACTIONS" ||
    value.implementation_status !== "NOT_STARTED" ||
    value.release_status !== "NOT_EVALUATED" ||
    value.plan_lifecycle !== "ACTIVE" ||
    value.terminal_status !== "ACTIVE" ||
    value.last_observed_run_scope !== "PLAN_ONLY"
  ) {
    throw new Error("plan pack invariant top-level state changed");
  }
}

function requireAdmissionState(value) {
  requireInvariantTopLevel(value);
  if (
    value.package_status !== "IMPLEMENTATION_READY" ||
    value.next_unit !== "UNIT-001"
  ) {
    throw new Error(
      "plan pack is not promoted for UNIT-001 admission",
    );
  }
  requireExactPlanningIdsAndInvariants(value);
  requireAllStatus(value.sources, "sources", "CURRENT");
  requireAllStatus(value.requirements, "requirements", "ACCEPTED");
  requireAllStatus(value.assumptions, "assumptions", "VALIDATED");
  requireAllStatus(value.decisions, "decisions", "ACTIVE");
  requireAllStatus(value.criteria, "criteria", "PASS");
  requireAllStatus(value.gates, "gates", "PASS");
  requireAllStatus(value.units, "units", "READY");
  requireStatus(value.tests, "TEST-001", "PASS");
  requireStatus(value.tests, "TEST-007", "PASS");
  for (const id of RUNTIME_TEST_IDS) {
    requireStatus(value.tests, id, "PLANNED");
  }
  requireStatus(value.evidence_index, "EVID-001", "PASS");
  requireStatus(value.evidence_index, "EVID-012", "PASS");
  for (const id of RUNTIME_EVIDENCE_IDS) {
    requireStatus(value.evidence_index, id, "STALE");
  }
  if (
    value.ready_slices?.length !== 1 ||
    value.ready_slices[0]?.id !== "SLICE-001" ||
    JSON.stringify(value.ready_slices[0].unit_ids) !==
      JSON.stringify(UNIT_IDS) ||
    Object.keys(value.ready_slices[0]).length !== 2
  ) {
    throw new Error(
      "SLICE-001 must have the exact ordered dependency-closed shape",
    );
  }
}

function requireReviewCandidateState(value) {
  requireInvariantTopLevel(value);
  if (
    value.package_status !== "NOT_READY" ||
    value.next_unit !== null
  ) {
    throw new Error(
      "plan pack is not in the exact pre-promotion review state",
    );
  }
  requireExactPlanningIdsAndInvariants(value);
  requireAllStatus(value.sources, "sources", "STALE");
  requireAllStatus(
    value.requirements,
    "requirements",
    "PROPOSED",
  );
  requireAllStatus(value.assumptions, "assumptions", "ACTIVE");
  requireAllStatus(
    value.decisions,
    "decisions",
    "SUPERSEDED",
  );
  requireAllStatus(value.criteria, "criteria", "FAIL");
  requireAllStatus(value.gates, "gates", "FAIL");
  requireAllStatus(value.units, "units", "PLANNED");
  requireStatus(value.tests, "TEST-001", "STALE");
  requireStatus(value.tests, "TEST-007", "STALE");
  for (const id of RUNTIME_TEST_IDS) {
    requireStatus(value.tests, id, "PLANNED");
  }
  for (const id of [
    "EVID-001",
    ...RUNTIME_EVIDENCE_IDS,
    "EVID-012",
  ]) {
    requireStatus(value.evidence_index, id, "STALE");
  }
  requireExactIds(value.ready_slices, "ready slices", []);
}

function setAllStatuses(collection, status) {
  for (const entry of collection) entry.status = status;
}

function promoteReviewManifest(value) {
  requireReviewCandidateState(value);
  const promoted = structuredClone(value);
  promoted.package_status = "IMPLEMENTATION_READY";
  setAllStatuses(promoted.sources, "CURRENT");
  setAllStatuses(promoted.requirements, "ACCEPTED");
  setAllStatuses(promoted.assumptions, "VALIDATED");
  setAllStatuses(promoted.decisions, "ACTIVE");
  setAllStatuses(promoted.criteria, "PASS");
  setAllStatuses(promoted.gates, "PASS");
  setAllStatuses(promoted.units, "READY");
  requireStatus(promoted.tests, "TEST-001", "STALE");
  requireStatus(promoted.tests, "TEST-007", "STALE");
  promoted.tests.find(({ id }) => id === "TEST-001").status = "PASS";
  promoted.tests.find(({ id }) => id === "TEST-007").status = "PASS";
  requireStatus(promoted.evidence_index, "EVID-001", "STALE");
  requireStatus(promoted.evidence_index, "EVID-012", "STALE");
  promoted.evidence_index.find(
    ({ id }) => id === "EVID-001",
  ).status = "PASS";
  promoted.evidence_index.find(
    ({ id }) => id === "EVID-012",
  ).status = "PASS";
  promoted.ready_slices = [
    { id: "SLICE-001", unit_ids: [...UNIT_IDS] },
  ];
  promoted.next_unit = "UNIT-001";
  refreshManifestHash(promoted);
  requireAdmissionState(promoted);
  return promoted;
}

function reversePromotedManifest(value) {
  requireAdmissionState(value);
  const review = structuredClone(value);
  review.package_status = "NOT_READY";
  setAllStatuses(review.sources, "STALE");
  setAllStatuses(review.requirements, "PROPOSED");
  setAllStatuses(review.assumptions, "ACTIVE");
  setAllStatuses(review.decisions, "SUPERSEDED");
  setAllStatuses(review.criteria, "FAIL");
  setAllStatuses(review.gates, "FAIL");
  setAllStatuses(review.units, "PLANNED");
  review.tests.find(({ id }) => id === "TEST-001").status = "STALE";
  review.tests.find(({ id }) => id === "TEST-007").status = "STALE";
  review.evidence_index.find(
    ({ id }) => id === "EVID-001",
  ).status = "STALE";
  review.evidence_index.find(
    ({ id }) => id === "EVID-012",
  ).status = "STALE";
  review.ready_slices = [];
  review.next_unit = null;
  refreshManifestHash(review);
  requireReviewCandidateState(review);
  return review;
}

function deriveManifestPair(mode) {
  requireManifestSelfHash(manifest);
  if (mode === "review") {
    requireReviewCandidateState(manifest);
    const review = structuredClone(manifest);
    const promoted = promoteReviewManifest(review);
    const roundTrip = reversePromotedManifest(promoted);
    const reviewBytes = serializeJson(review);
    if (
      !reviewBytes.equals(manifestBytes) ||
      !serializeJson(roundTrip).equals(manifestBytes)
    ) {
      throw new Error(
        "pre-promotion manifest is not in the deterministic serialization normal form",
      );
    }
    return {
      review,
      reviewBytes,
      promoted,
      promotedBytes: serializeJson(promoted),
    };
  }

  requireAdmissionState(manifest);
  const promoted = structuredClone(manifest);
  const review = reversePromotedManifest(promoted);
  const forward = promoteReviewManifest(review);
  const promotedBytes = serializeJson(promoted);
  if (
    !promotedBytes.equals(manifestBytes) ||
    !serializeJson(forward).equals(manifestBytes)
  ) {
    throw new Error(
      "promoted manifest contains a change outside the reviewed mechanical transition",
    );
  }
  return {
    review,
    reviewBytes: serializeJson(review),
    promoted,
    promotedBytes,
  };
}

function fsyncDirectory(path) {
  const fd = openSync(
    path,
    constants.O_RDONLY |
      constants.O_DIRECTORY |
      constants.O_NOFOLLOW,
  );
  try {
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
}

function ensureDurableDirectory(path) {
  if (!isInside(realRepoRoot, path)) {
    throw new Error("output parent escapes the repository");
  }

  const missing = [];
  let cursor = path;
  while (!existsSync(cursor)) {
    missing.push(cursor);
    cursor = dirname(cursor);
  }

  if (
    realpathSync(cursor) !== cursor ||
    !isInside(realRepoRoot, cursor)
  ) {
    throw new Error(
      "output directory chain contains a symlink or escapes the repository",
    );
  }
  const existing = lstatSync(cursor);
  if (!existing.isDirectory() || existing.isSymbolicLink()) {
    throw new Error(
      "output directory chain is not a physical directory",
    );
  }

  for (const directoryPath of missing.reverse()) {
    mkdirSync(directoryPath, { mode: 0o700 });
    const created = lstatSync(directoryPath);
    if (
      !created.isDirectory() ||
      created.isSymbolicLink() ||
      realpathSync(directoryPath) !== directoryPath
    ) {
      throw new Error(
        "output directory creation crossed a symlink",
      );
    }
    fsyncDirectory(directoryPath);
    fsyncDirectory(dirname(directoryPath));
  }
}

function captureDirectoryChain(path) {
  if (
    !isInside(realRepoRoot, path) ||
    realpathSync(path) !== path
  ) {
    throw new Error("directory pin escapes the physical repository");
  }
  const back = relative(realRepoRoot, path);
  const segments = back === "" ? [] : back.split(sep);
  const records = [];
  let cursor = realRepoRoot;
  for (const segment of ["", ...segments]) {
    if (segment) cursor = resolve(cursor, segment);
    const stat = lstatSync(cursor);
    if (!stat.isDirectory() || stat.isSymbolicLink()) {
      throw new Error("directory pin encountered a non-directory");
    }
    records.push({ path: cursor, stat });
  }
  return records;
}

function pinDirectory(path) {
  const chain = captureDirectoryChain(path);
  const fd = openSync(
    path,
    constants.O_RDONLY |
      constants.O_DIRECTORY |
      constants.O_NOFOLLOW,
  );
  const stat = fstatSync(fd);
  if (
    !stat.isDirectory() ||
    !sameIdentity(stat, chain[chain.length - 1].stat)
  ) {
    closeSync(fd);
    throw new Error("directory changed while it was pinned");
  }
  return { path, fd, stat, chain };
}

function assertDirectoryPin(pin) {
  const opened = fstatSync(pin.fd);
  if (!sameIdentity(opened, pin.stat)) {
    throw new Error("pinned directory descriptor changed identity");
  }
  for (const record of pin.chain) {
    const current = lstatSync(record.path);
    if (
      !current.isDirectory() ||
      current.isSymbolicLink() ||
      !sameIdentity(current, record.stat)
    ) {
      throw new Error(
        "pinned directory path changed during publication",
      );
    }
  }
  if (realpathSync(pin.path) !== pin.path) {
    throw new Error("pinned directory path became indirect");
  }
}

function collectCleanupError(errors, operation) {
  try {
    operation();
  } catch (error) {
    errors.push(error);
  }
}

function finishWithCleanup(primaryError, cleanupErrors, label) {
  if (primaryError && cleanupErrors.length === 0) {
    throw primaryError;
  }
  if (primaryError) {
    throw new AggregateError(
      [primaryError, ...cleanupErrors],
      `${label} failed and cleanup was incomplete`,
      { cause: primaryError },
    );
  }
  if (cleanupErrors.length > 0) {
    throw new AggregateError(
      cleanupErrors,
      `${label} cleanup failed`,
    );
  }
}

function removeOwnedPath(path, identity) {
  let current;
  try {
    current = lstatSync(path);
  } catch (error) {
    if (error.code === "ENOENT") return;
    throw error;
  }
  if (!identity || !sameIdentity(current, identity)) {
    throw new Error(
      `refusing to remove replacement path: ${path}`,
    );
  }
  unlinkSync(path);
}

function repoFileDescriptor(path) {
  const absolutePath = resolve(realRepoRoot, path);
  if (!isInside(realRepoRoot, absolutePath)) {
    throw new Error(`repository file escapes root: ${path}`);
  }
  const { bytes } = readPhysicalFile(absolutePath, path);
  return { path, sha256: sha256(bytes) };
}

function validatorDescriptors() {
  return VALIDATOR_PATHS.map(repoFileDescriptor);
}

function assertValidatorDescriptors(expected) {
  const current = validatorDescriptors();
  if (
    !canonicalBytes(current).equals(canonicalBytes(expected))
  ) {
    throw new Error("plan validator bytes changed during admission work");
  }
}

function normalizeValidatorStdout(stdout, snapshotPackRoot) {
  const expected = Buffer.from(
    `plan-pack validation passed: ${snapshotPackRoot}\n`,
    "utf8",
  );
  if (!stdout.equals(expected)) {
    throw new Error("plan validator emitted unexpected output");
  }
  return Buffer.from(
    "plan-pack validation passed: <PLAN_PACK>\n",
    "utf8",
  );
}

function cleanupSnapshot(
  snapshotRoot,
  snapshotIdentity,
  parentPin,
  primaryError,
) {
  const errors = [];
  collectCleanupError(errors, () => {
    const current = lstatSync(snapshotRoot);
    if (!sameIdentity(current, snapshotIdentity)) {
      throw new Error(
        "refusing to recursively remove a replacement snapshot",
      );
    }
    rmSync(snapshotRoot, { recursive: true, force: false });
  });
  collectCleanupError(errors, () => {
    assertDirectoryPin(parentPin);
    fsyncSync(parentPin.fd);
  });
  collectCleanupError(errors, () => closeSync(parentPin.fd));
  finishWithCleanup(primaryError, errors, "snapshot validation");
}

function runValidatedSnapshot(
  value,
  bytes,
  validatorFiles,
  label,
) {
  const snapshotParent = resolve(realRepoRoot, SNAPSHOT_ROOT);
  ensureDurableDirectory(snapshotParent);
  const parentPin = pinDirectory(snapshotParent);
  let snapshotRoot;
  let snapshotIdentity;
  let result;
  let primaryError;
  try {
    assertDirectoryPin(parentPin);
    snapshotRoot = mkdtempSync(
      resolve(snapshotParent, `${label}-`),
    );
    snapshotIdentity = lstatSync(snapshotRoot);
    if (
      !snapshotIdentity.isDirectory() ||
      snapshotIdentity.isSymbolicLink()
    ) {
      throw new Error("snapshot root is not a physical directory");
    }
    fsyncSync(parentPin.fd);
    const snapshotPackRoot = resolve(snapshotRoot, "pack");
    cpSync(packRoot, snapshotPackRoot, {
      recursive: true,
      dereference: false,
      errorOnExist: true,
      force: false,
    });

    const snapshotManifestPath = resolve(
      snapshotPackRoot,
      "plan-pack.json",
    );
    unlinkSync(snapshotManifestPath);
    const snapshotManifest = openSync(
      snapshotManifestPath,
      constants.O_WRONLY |
        constants.O_CREAT |
        constants.O_EXCL |
        constants.O_NOFOLLOW,
      0o600,
    );
    try {
      fchmodSync(snapshotManifest, 0o600);
      writeFileSync(snapshotManifest, bytes);
      fsyncSync(snapshotManifest);
    } finally {
      closeSync(snapshotManifest);
    }
    fsyncDirectory(snapshotPackRoot);
    requireManifestSelfHash(value);
    requireEveryArtifact(value, snapshotPackRoot);
    assertValidatorDescriptors(validatorFiles);

    const validatorStdout = execFileSync(
      process.execPath,
      [
        resolve(realRepoRoot, VALIDATOR_PATHS[0]),
        snapshotPackRoot,
      ],
      {
        cwd: realRepoRoot,
        env: deterministicEnv,
        encoding: null,
        maxBuffer: 16 * 1024 * 1024,
        stdio: ["ignore", "pipe", "inherit"],
      },
    );
    assertValidatorDescriptors(validatorFiles);
    const referenceStdout = execFileSync(
      process.execPath,
      [resolve(snapshotPackRoot, REFERENCE_PATH), "--verify"],
      {
        cwd: realRepoRoot,
        env: deterministicEnv,
        encoding: null,
        maxBuffer: 16 * 1024 * 1024,
        stdio: ["ignore", "pipe", "inherit"],
      },
    );
    const sourceFingerprint = JSON.parse(
      referenceStdout.toString("utf8"),
    );

    const liveSnapshotManifest = readPhysicalFile(
      snapshotManifestPath,
      "snapshot plan-pack.json",
    ).bytes;
    if (!liveSnapshotManifest.equals(bytes)) {
      throw new Error("snapshot manifest changed during validation");
    }
    requireEveryArtifact(value, snapshotPackRoot);
    assertValidatorDescriptors(validatorFiles);
    assertDirectoryPin(parentPin);

    result = {
      validator_stdout_sha256: sha256(
        normalizeValidatorStdout(
          validatorStdout,
          snapshotPackRoot,
        ),
      ),
      reference_stdout_sha256: sha256(referenceStdout),
      source_fingerprint: sourceFingerprint,
      reference_payload_sha256: sha256(
        canonicalBytes(sourceFingerprint),
      ),
    };
  } catch (error) {
    primaryError = new Error(
      `${label} planning snapshot failed validation: ${error.message}`,
      { cause: error },
    );
  }

  if (snapshotRoot && snapshotIdentity) {
    cleanupSnapshot(
      snapshotRoot,
      snapshotIdentity,
      parentPin,
      primaryError,
    );
  } else {
    const cleanupErrors = [];
    collectCleanupError(cleanupErrors, () => closeSync(parentPin.fd));
    finishWithCleanup(
      primaryError,
      cleanupErrors,
      "snapshot initialization",
    );
  }
  return result;
}

function keyArtifactBindings(value) {
  return [
    requireArtifact(
      value,
      CANONICAL_ARTIFACT_ID,
      CANONICAL_PATH,
    ),
    requireArtifact(
      value,
      READINESS_ARTIFACT_ID,
      READINESS_PATH,
    ),
    requireArtifact(
      value,
      REFERENCE_ARTIFACT_ID,
      REFERENCE_PATH,
    ),
    requireArtifact(
      value,
      RECORDER_ARTIFACT_ID,
      RECORDER_PATH,
    ),
  ];
}

function buildReviewCandidate(pair, validatorFiles) {
  assertLivePackMatches(manifest, manifestBytes);
  assertValidatorDescriptors(validatorFiles);
  const reviewValidation = runValidatedSnapshot(
    pair.review,
    pair.reviewBytes,
    validatorFiles,
    "review",
  );
  assertLivePackMatches(manifest, manifestBytes);
  const promotionValidation = runValidatedSnapshot(
    pair.promoted,
    pair.promotedBytes,
    validatorFiles,
    "promotion",
  );
  if (
    !canonicalBytes(
      reviewValidation.source_fingerprint,
    ).equals(
      canonicalBytes(
        promotionValidation.source_fingerprint,
      ),
    ) ||
    reviewValidation.reference_stdout_sha256 !==
      promotionValidation.reference_stdout_sha256
  ) {
    throw new Error(
      "source fingerprint changed between review and promotion validation",
    );
  }
  assertLivePackMatches(manifest, manifestBytes);
  assertValidatorDescriptors(validatorFiles);

  const withoutHash = {
    schema_version: REVIEW_CANDIDATE_SCHEMA_VERSION,
    package_id: PACKAGE_ID,
    review_plan_pack: {
      path: relative(realRepoRoot, manifestPath),
      file_sha256: sha256(pair.reviewBytes),
      manifest_sha256: pair.review.manifest_sha256,
    },
    promotion_plan_pack: {
      path: relative(realRepoRoot, manifestPath),
      file_sha256: sha256(pair.promotedBytes),
      manifest_sha256: pair.promoted.manifest_sha256,
    },
    promotion_contract: {
      changed_json_value_count: 130,
      ready_slice: {
        id: "SLICE-001",
        unit_ids: [...UNIT_IDS],
      },
      next_unit: "UNIT-001",
    },
    key_artifacts: keyArtifactBindings(pair.review),
    artifact_registry_sha256: sha256(
      canonicalBytes(pair.review.artifacts),
    ),
    validators: validatorFiles,
    validation: {
      review_validator_stdout_sha256:
        reviewValidation.validator_stdout_sha256,
      promotion_validator_stdout_sha256:
        promotionValidation.validator_stdout_sha256,
      reference_stdout_sha256:
        reviewValidation.reference_stdout_sha256,
      reference_payload_sha256:
        reviewValidation.reference_payload_sha256,
    },
    source_fingerprint:
      reviewValidation.source_fingerprint,
  };
  return {
    ...withoutHash,
    candidate_sha256: sha256(canonicalBytes(withoutHash)),
  };
}

function verifyCurrentSourceFingerprint(expected) {
  requireArtifact(
    manifest,
    REFERENCE_ARTIFACT_ID,
    REFERENCE_PATH,
  );
  const stdout = execFileSync(
    process.execPath,
    [resolve(packRoot, REFERENCE_PATH), "--verify"],
    {
      cwd: realRepoRoot,
      env: deterministicEnv,
      encoding: null,
      maxBuffer: 16 * 1024 * 1024,
      stdio: ["ignore", "pipe", "inherit"],
    },
  );
  const current = JSON.parse(stdout.toString("utf8"));
  if (
    !canonicalBytes(current).equals(canonicalBytes(expected))
  ) {
    throw new Error(
      "source fingerprint changed after candidate validation",
    );
  }
}

function requireExactKeys(value, label, expectedKeys) {
  if (!isPlainObject(value)) {
    throw new Error(`${label} must be an object`);
  }
  const actual = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    throw new Error(`${label} has unexpected keys`);
  }
}

function reviewPath(candidateSha256, role) {
  return resolve(
    realRepoRoot,
    REVIEW_ROOT,
    candidateSha256,
    `${role}.json`,
  );
}

function readReviewReceipt(candidateSha256, role) {
  const path = reviewPath(candidateSha256, role);
  const { bytes, stat } = readPhysicalFile(
    path,
    `${role} review receipt`,
  );
  if (
    (stat.mode & 0o777) !== 0o600 ||
    stat.nlink !== 1 ||
    (typeof process.getuid === "function" &&
      stat.uid !== process.getuid())
  ) {
    throw new Error(
      `${role} review receipt must be owner-written mode-0600 with one link`,
    );
  }
  const receipt = JSON.parse(bytes.toString("utf8"));
  requireExactKeys(receipt, `${role} review receipt`, [
    "schema_version",
    "role",
    "reviewer_id",
    "verdict",
    "candidate_sha256",
    "reviewed_at",
    "payload_sha256",
  ]);
  if (
    receipt.schema_version !== REVIEW_SCHEMA_VERSION ||
    receipt.role !== role ||
    receipt.verdict !== "CLEAN" ||
    receipt.candidate_sha256 !== candidateSha256 ||
    !/^[A-Za-z0-9][A-Za-z0-9._:/-]{2,127}$/u.test(
      receipt.reviewer_id,
    ) ||
    new Date(receipt.reviewed_at).toISOString() !==
      receipt.reviewed_at
  ) {
    throw new Error(`${role} review receipt is invalid`);
  }
  const withoutHash = structuredClone(receipt);
  delete withoutHash.payload_sha256;
  if (
    receipt.payload_sha256 !==
    sha256(canonicalBytes(withoutHash))
  ) {
    throw new Error(
      `${role} review receipt payload hash is invalid`,
    );
  }
  if (!serializeJson(receipt).equals(bytes)) {
    throw new Error(
      `${role} review receipt is not canonically serialized`,
    );
  }
  return {
    path: relative(realRepoRoot, path),
    file_sha256: sha256(bytes),
    bytes,
    stat,
    receipt,
  };
}

function loadReviews(candidateSha256) {
  const reviews = REVIEW_ROLES.map((role) =>
    readReviewReceipt(candidateSha256, role),
  );
  const reviewerIds = reviews.map(
    ({ receipt }) => receipt.reviewer_id,
  );
  if (new Set(reviewerIds).size !== reviewerIds.length) {
    throw new Error(
      "independent review receipts require distinct reviewer IDs",
    );
  }
  return reviews;
}

function assertReviewsUnchanged(reviews) {
  for (const review of reviews) {
    const current = readReviewReceipt(
      review.receipt.candidate_sha256,
      review.receipt.role,
    );
    if (
      !current.bytes.equals(review.bytes) ||
      !sameIdentity(current.stat, review.stat)
    ) {
      throw new Error(
        `${review.receipt.role} review receipt changed during admission`,
      );
    }
  }
}

function durablePublish(outputPath, bytes, verifyInputs) {
  if (
    !isInside(realRepoRoot, outputPath) ||
    outputPath === realRepoRoot
  ) {
    throw new Error("publication output escapes the repository");
  }
  const parent = dirname(outputPath);
  ensureDurableDirectory(parent);
  const parentPin = pinDirectory(parent);
  const temporaryPath = `${outputPath}.tmp-${process.pid}-${randomUUID()}`;
  let file = null;
  let ownedIdentity = null;
  let published = false;
  let primaryError;

  try {
    assertDirectoryPin(parentPin);
    if (existsSync(outputPath)) {
      throw new Error("publication output already exists");
    }
    verifyInputs();
    assertDirectoryPin(parentPin);
    file = openSync(
      temporaryPath,
      constants.O_WRONLY |
        constants.O_CREAT |
        constants.O_EXCL |
        constants.O_NOFOLLOW,
      0o600,
    );
    fchmodSync(file, 0o600);
    ownedIdentity = fstatSync(file);
    if (!ownedIdentity.isFile()) {
      throw new Error("publication temporary is not a regular file");
    }
    writeFileSync(file, bytes);
    fsyncSync(file);
    closeSync(file);
    file = null;
    assertDirectoryPin(parentPin);
    linkSync(temporaryPath, outputPath);
    published = true;
    const linked = lstatSync(outputPath);
    if (
      !sameIdentity(linked, ownedIdentity) ||
      linked.nlink !== 2
    ) {
      throw new Error("published file did not bind the owned inode");
    }
    unlinkSync(temporaryPath);
    assertDirectoryPin(parentPin);
    const final = readPhysicalFile(
      outputPath,
      "published receipt",
    );
    if (
      !sameIdentity(final.stat, ownedIdentity) ||
      final.stat.nlink !== 1 ||
      (final.stat.mode & 0o777) !== 0o600 ||
      !final.bytes.equals(bytes)
    ) {
      throw new Error(
        "published receipt failed final inode, mode, or byte verification",
      );
    }
    verifyInputs();
    assertDirectoryPin(parentPin);
    fsyncSync(parentPin.fd);
    closeSync(parentPin.fd);
    return;
  } catch (error) {
    primaryError = error;
  }

  const cleanupErrors = [];
  if (file !== null) {
    collectCleanupError(cleanupErrors, () => closeSync(file));
  }
  collectCleanupError(cleanupErrors, () =>
    removeOwnedPath(temporaryPath, ownedIdentity),
  );
  if (published) {
    collectCleanupError(cleanupErrors, () =>
      removeOwnedPath(outputPath, ownedIdentity),
    );
  }
  collectCleanupError(cleanupErrors, () => {
    assertDirectoryPin(parentPin);
    fsyncSync(parentPin.fd);
  });
  collectCleanupError(cleanupErrors, () =>
    closeSync(parentPin.fd),
  );
  finishWithCleanup(primaryError, cleanupErrors, "publication");
}

function parseReviewArguments(args) {
  if (args.length !== 4) return null;
  const values = new Map();
  for (const arg of args) {
    const match =
      /^--(record-review|reviewer-id|candidate-sha256|verdict)=(.+)$/u.exec(
        arg,
      );
    if (!match || values.has(match[1])) return null;
    values.set(match[1], match[2]);
  }
  if (values.size !== 4) return null;
  return {
    role: values.get("record-review"),
    reviewerId: values.get("reviewer-id"),
    candidateSha256: values.get("candidate-sha256"),
    verdict: values.get("verdict"),
  };
}

function computeReviewCandidate(mode) {
  const pair = deriveManifestPair(mode);
  const validatorFiles = validatorDescriptors();
  const candidate = buildReviewCandidate(pair, validatorFiles);
  return { pair, validatorFiles, candidate };
}

function candidateInputVerifier(context, reviews = null) {
  return () => {
    assertLivePackMatches(manifest, manifestBytes);
    assertValidatorDescriptors(context.validatorFiles);
    if (reviews) assertReviewsUnchanged(reviews);
    verifyCurrentSourceFingerprint(
      context.candidate.source_fingerprint,
    );
    assertLivePackMatches(manifest, manifestBytes);
    assertValidatorDescriptors(context.validatorFiles);
    if (reviews) assertReviewsUnchanged(reviews);
  };
}

function runReviewCandidateMode() {
  const context = computeReviewCandidate("review");
  candidateInputVerifier(context)();
  process.stdout.write(serializeJson(context.candidate));
}

function runRecordReviewMode(options) {
  if (
    !REVIEW_ROLES.includes(options.role) ||
    options.verdict !== "CLEAN" ||
    !/^[a-f0-9]{64}$/u.test(options.candidateSha256) ||
    !/^[A-Za-z0-9][A-Za-z0-9._:/-]{2,127}$/u.test(
      options.reviewerId,
    )
  ) {
    throw new Error("review receipt arguments are invalid");
  }
  const context = computeReviewCandidate("review");
  if (
    context.candidate.candidate_sha256 !==
    options.candidateSha256
  ) {
    throw new Error(
      "review candidate changed before receipt publication",
    );
  }
  const withoutHash = {
    schema_version: REVIEW_SCHEMA_VERSION,
    role: options.role,
    reviewer_id: options.reviewerId,
    verdict: "CLEAN",
    candidate_sha256: options.candidateSha256,
    reviewed_at: new Date().toISOString(),
  };
  const receipt = {
    ...withoutHash,
    payload_sha256: sha256(canonicalBytes(withoutHash)),
  };
  const bytes = serializeJson(receipt);
  const path = reviewPath(
    options.candidateSha256,
    options.role,
  );
  durablePublish(
    path,
    bytes,
    candidateInputVerifier(context),
  );
  process.stdout.write(
    serializeJson({
      schema_version: REVIEW_SCHEMA_VERSION,
      output: relative(realRepoRoot, path),
      sha256: sha256(bytes),
    }),
  );
}

function runAdmissionMode(requestedOutput) {
  if (requestedOutput !== OUTPUT_PATH) {
    throw new Error(`output must be ${OUTPUT_PATH}`);
  }
  const context = computeReviewCandidate("admission");
  const reviews = loadReviews(
    context.candidate.candidate_sha256,
  );
  const promotedValidation = runValidatedSnapshot(
    context.pair.promoted,
    context.pair.promotedBytes,
    context.validatorFiles,
    "admission",
  );
  if (
    !canonicalBytes(
      promotedValidation.source_fingerprint,
    ).equals(
      canonicalBytes(context.candidate.source_fingerprint),
    )
  ) {
    throw new Error(
      "source fingerprint changed before admission publication",
    );
  }

  const withoutHash = {
    schema_version: SCHEMA_VERSION,
    unit_id: "UNIT-001",
    package_id: PACKAGE_ID,
    recorded_at: new Date().toISOString(),
    package_status: context.pair.promoted.package_status,
    implementation_status:
      context.pair.promoted.implementation_status,
    next_unit: context.pair.promoted.next_unit,
    plan_pack: context.candidate.promotion_plan_pack,
    review_candidate: context.candidate,
    independent_reviews: reviews.map(
      ({ path, file_sha256, receipt }) => ({
        path,
        file_sha256,
        ...receipt,
      }),
    ),
    admission_validation: promotedValidation,
  };
  const receipt = {
    ...withoutHash,
    payload_sha256: sha256(canonicalBytes(withoutHash)),
  };
  const receiptBytes = serializeJson(receipt);
  const outputPath = resolve(realRepoRoot, requestedOutput);
  durablePublish(
    outputPath,
    receiptBytes,
    candidateInputVerifier(context, reviews),
  );
  process.stdout.write(
    serializeJson({
      schema_version: SCHEMA_VERSION,
      output: requestedOutput,
      sha256: sha256(receiptBytes),
      candidate_sha256:
        context.candidate.candidate_sha256,
    }),
  );
}

const args = process.argv.slice(2);
if (args.length === 1 && args[0] === "--review-candidate") {
  runReviewCandidateMode();
} else {
  const reviewOptions = parseReviewArguments(args);
  if (reviewOptions) {
    runRecordReviewMode(reviewOptions);
  } else if (
    args.length === 1 &&
    args[0].startsWith("--output=")
  ) {
    runAdmissionMode(args[0].slice("--output=".length));
  } else {
    throw new Error(
      [
        `usage: ${RECORDER_PATH} --review-candidate`,
        `       ${RECORDER_PATH} --record-review=<role> --reviewer-id=<id> --candidate-sha256=<sha256> --verdict=CLEAN`,
        `       ${RECORDER_PATH} --output=${OUTPUT_PATH}`,
      ].join("\n"),
    );
  }
}
