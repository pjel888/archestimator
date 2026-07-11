#!/usr/bin/env bun

import { Database, type SQLQueryBindings } from "bun:sqlite";
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
  rmSync,
  unlinkSync,
} from "node:fs";
import { createServer } from "node:net";
import { basename, dirname, relative, resolve } from "node:path";

import { makeSignature } from "better-auth/crypto";
import {
  buildEstimatePerformanceFixture,
  fixturePayloadWithoutLinkage,
  flattenEstimatePerformanceNodes,
  stableStringify,
  type EstimateSheetPerformanceFixture,
} from "../tests/fixtures/estimate-sheet-performance";
import { CURRENT_TERMS } from "../src/lib/legal/terms-content";
import {
  ESTIMATE_LOGICAL_OUTPUTS,
  assertRegularFile,
  assertRunManifest,
  canonicalJson,
  cliBoolean,
  cliString,
  createRunId,
  defaultImmutableRunRoot,
  defaultPlanRoot,
  defaultRunRoot,
  fingerprintContentEqual,
  isContained,
  isPlainObject,
  isSafeRelativePath,
  nowIso,
  parseStrictCli,
  readJsonFile,
  replaceFileAtomically,
  requireUnit,
  sha256File,
  sha256Hex,
  sha256Json,
  validateFingerprintContent,
  writeNoOverwrite,
  writeJsonNoOverwrite,
  type EstimateUnit,
  type FingerprintContent,
  type FixtureProfile,
  type RunManifestV1,
  type SourceFingerprint,
} from "./lib/estimate-sheet-performance-contract";
import {
  deriveEstimateSheetPrepareTransition,
  type EstimateSheetPlanManifest,
} from "./lib/estimate-sheet-performance-plan-state";
import {
  computeEstimateSheetScopeFileRecords,
  computeEstimateSheetSourceFingerprint,
  finalizedRefreezeReceiptPath,
} from "./compute-estimate-sheet-source-fingerprint";
import {
  recoverEstimateSheetIndexTransition,
} from "./update-estimate-sheet-performance-evidence-index";
import { generateLocalBetterAuthD1SchemaSqlProof } from "./generate-cloudflare-better-auth-proof";
import {
  buildLocalD1PrepareCommands,
  executeLocalD1PrepareCommands,
} from "./lib/estimate-sheet-local-d1-prepare";
import {
  assertBottleneckDecision,
  type BottleneckDecisionV1,
} from "./write-estimate-sheet-bottleneck-decision";

const MODE_ENVIRONMENT_KEYS = [
  "ESTIMATE_ROUTE_FAST_PATH_MODE",
  "ESTIMATE_GRAPH_MODE",
  "ESTIMATE_INCREMENTAL_DERIVATION_MODE",
  "ESTIMATE_RENDER_BOUNDARY_MODE",
  "ESTIMATE_ENTITY_PATCH_MODE",
] as const;

const MODE_ENVIRONMENT_KEY_BY_UNIT = {
  "UNIT-005": MODE_ENVIRONMENT_KEYS[0],
  "UNIT-006": MODE_ENVIRONMENT_KEYS[1],
  "UNIT-007": MODE_ENVIRONMENT_KEYS[2],
  "UNIT-008": MODE_ENVIRONMENT_KEYS[3],
  "UNIT-009": MODE_ENVIRONMENT_KEYS[4],
} as const;

const NAMESPACE_ROLES_BY_UNIT = {
  "UNIT-001": [],
  "UNIT-002": ["browser"],
  "UNIT-003": ["d1"],
  "UNIT-004": [],
  "UNIT-005": ["mode", "browser", "d1"],
  "UNIT-006": ["mode"],
  "UNIT-007": ["mode", "browser"],
  "UNIT-008": ["mode", "browser"],
  "UNIT-009": ["mode", "browser"],
  "UNIT-010": ["mode", "browser", "d1"],
  "UNIT-011": [],
} as const satisfies Record<EstimateUnit, readonly FixtureRole[]>;

const APPLICATION_CLEANUP_TABLES = [
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
] as const;

const AUTH_CLEANUP_TABLES = [
  "session",
  "user",
  "legal_terms_acceptances",
  "closed_beta_allowed_emails",
] as const;

const EXPECTED_BETTER_AUTH_TABLES = ["account", "rateLimit", "session", "user", "verification"] as const;
const PREPARE_CLI_OPTIONS = new Set([
  "help",
  "unit",
  "profile",
  "artifact-only",
  "cleanup-not-applicable",
  "cleanup-requirement",
  "planning-admission",
  "port",
  "recover",
]);

type FixtureRole = "mode" | "browser" | "d1";
type PortPolicy = "auto" | "none";
type DecisionAction = "activate" | "supersede";

export type PrepareContract = {
  unit: EstimateUnit;
  profile: "limit" | "artifact-only";
  artifactOnly: boolean;
  cleanupRequirement: "REQUIRED" | "NOT_APPLICABLE";
  evidenceClass: "jsdom" | "local-browser" | "local-d1" | "hosted-d1";
  portPolicy: PortPolicy | null;
  namespaceRoles: FixtureRole[];
};

export type PrepareCliInput = {
  unit: EstimateUnit;
  profile: "limit";
  artifactOnly: boolean;
  cleanupNotApplicable: boolean;
  cleanupRequirement?: "REQUIRED";
  admissionPath?: string;
  port?: PortPolicy;
};

export type PrepareCliOperation = PrepareCliInput | { recover: true };

type FixtureIds = {
  user: string;
  session: string;
  allowlist: string;
  legal: string;
  profile: string;
  workspace: string;
  project: string;
  estimate: string;
  tab: string;
  nodes: string[];
  rows: string[];
};

type MigrationDescriptor = {
  name: string;
  sha256: string;
  statements: string[];
};

type PreparedResources = {
  leasedPort?: number;
  unitLeasePath: string;
  portLeasePath?: string;
  runtimeEnv?: string;
  runtimeEnvSha256?: string;
  storageState?: string;
  storageStateSha256?: string;
  storageStateExpiresAt?: string;
  processJournal?: string;
  routePath?: string;
  route?: { path: string; projectId: string; nodeId: string; fixtureRole: FixtureRole };
  fixtureHash?: string;
  authFixtureHash?: string;
  activatedModes?: string[];
  wranglerState?: string;
  resources?: Record<string, unknown>;
};

type ExtendedRunManifest = RunManifestV1 & {
  immutable_run_root: string;
  logical_outputs: { [Role in keyof typeof ESTIMATE_LOGICAL_OUTPUTS]: (typeof ESTIMATE_LOGICAL_OUTPUTS)[Role] };
  leasedPort?: number;
  port?: number;
  runtimeEnvSha256?: string;
  storageStateSha256?: string;
  storageStateExpiresAt?: string;
  processJournal?: string;
  routePath?: string;
  route?: Record<string, unknown>;
  fixture_hash?: string;
  auth_fixture_hash?: string;
  activatedModes?: string[];
  wranglerState?: string;
  resources?: Record<string, unknown>;
};

type ScopeFileRecord = {
  path: string;
  mode: "100644" | "100755" | "120000";
  sha256: string;
};

type ScopeFileRecords = {
  application: ScopeFileRecord[];
  producer: ScopeFileRecord[];
};

type PrepareTransitionFaultPhase = "ALLOCATION_JOURNALED" | "JOURNAL_PREPARED" | "IMMUTABLE_WRITTEN" | "PROJECTION_WRITTEN" | "MANIFEST_COMMITTED";

export type PreparedRun = {
  run: ExtendedRunManifest;
  runManifestPath: string;
  pointerPath: string;
};

export function parsePrepareCli(argv: string[]): PrepareCliOperation | null {
  const values = parseStrictCli(argv);
  for (const key of values.keys()) {
    if (!PREPARE_CLI_OPTIONS.has(key)) throw new Error(`unknown prepare option: --${key}`);
  }
  if (cliBoolean(values, "help")) {
    if (values.size !== 1) throw new Error("--help cannot be combined with prepare options");
    return null;
  }
  if (cliBoolean(values, "recover")) {
    if (values.size !== 1) throw new Error("--recover cannot be combined with prepare options");
    return { recover: true };
  }
  const unit = requireUnit(cliString(values, "unit", true));
  const profile = cliString(values, "profile", true);
  if (profile !== "limit") throw new Error("--profile must be exactly limit");
  const portValue = cliString(values, "port");
  if (portValue !== undefined && portValue !== "auto" && portValue !== "none") {
    throw new Error("--port must be exactly auto or none");
  }
  const cleanupRequirement = cliString(values, "cleanup-requirement");
  if (cleanupRequirement !== undefined && cleanupRequirement !== "REQUIRED") {
    throw new Error("--cleanup-requirement must be exactly REQUIRED");
  }
  return {
    unit,
    profile,
    artifactOnly: cliBoolean(values, "artifact-only"),
    cleanupNotApplicable: cliBoolean(values, "cleanup-not-applicable"),
    ...(cleanupRequirement ? { cleanupRequirement } : {}),
    ...(cliString(values, "planning-admission") ? { admissionPath: cliString(values, "planning-admission") } : {}),
    ...(portValue ? { port: portValue } : {}),
  };
}

export function resolvePrepareContract(input: {
  unit: EstimateUnit;
  profile: FixtureProfile | "artifact-only";
  artifactOnly?: boolean;
  cleanupNotApplicable?: boolean;
  cleanupRequirement?: "REQUIRED";
  port?: PortPolicy;
  decisionAction?: DecisionAction;
}): PrepareContract {
  const artifactOnly = input.artifactOnly === true || input.profile === "artifact-only";
  if (!artifactOnly && input.profile !== "limit") throw new Error("performance prepare requires the limit fixture profile");

  if (input.unit === "UNIT-001" || input.unit === "UNIT-004") {
    if (!artifactOnly || input.cleanupNotApplicable !== true) {
      throw new Error(`${input.unit} requires --artifact-only and --cleanup-not-applicable`);
    }
    if (input.cleanupRequirement !== undefined || input.port !== undefined) {
      throw new Error(`${input.unit} artifact-only prepare cannot declare cleanup or port resources`);
    }
    return {
      unit: input.unit,
      profile: "artifact-only",
      artifactOnly: true,
      cleanupRequirement: "NOT_APPLICABLE",
      evidenceClass: "jsdom",
      portPolicy: null,
      namespaceRoles: [],
    };
  }

  if (input.unit === "UNIT-011") {
    if (!artifactOnly || input.cleanupNotApplicable === true || input.cleanupRequirement !== "REQUIRED" || input.port !== undefined) {
      throw new Error("UNIT-011 requires artifact-only, --cleanup-requirement=REQUIRED, and no local port");
    }
    return {
      unit: input.unit,
      profile: "artifact-only",
      artifactOnly: true,
      cleanupRequirement: "REQUIRED",
      evidenceClass: "hosted-d1",
      portPolicy: null,
      namespaceRoles: [],
    };
  }

  if (["UNIT-005", "UNIT-006", "UNIT-007", "UNIT-008", "UNIT-009"].includes(input.unit)
    && input.decisionAction === "supersede") {
    if (!artifactOnly || input.cleanupNotApplicable !== true || input.cleanupRequirement !== undefined || input.port !== undefined) {
      throw new Error(`${input.unit} supersession requires artifact-only cleanup-not-applicable prepare`);
    }
    return {
      unit: input.unit,
      profile: "artifact-only",
      artifactOnly: true,
      cleanupRequirement: "NOT_APPLICABLE",
      evidenceClass: "jsdom",
      portPolicy: null,
      namespaceRoles: [],
    };
  }

  if (artifactOnly) throw new Error("artifact-only mode is not declared for this active unit");
  if (input.cleanupNotApplicable === true || input.cleanupRequirement !== undefined) {
    throw new Error("local performance prepares infer REQUIRED cleanup and reject cleanup overrides");
  }
  if (input.unit === "UNIT-003") {
    if (input.port !== "none") throw new Error("UNIT-003 requires --port=none");
    return {
      unit: input.unit,
      profile: "limit",
      artifactOnly: false,
      cleanupRequirement: "REQUIRED",
      evidenceClass: "local-d1",
      portPolicy: "none",
      namespaceRoles: [...NAMESPACE_ROLES_BY_UNIT[input.unit]],
    };
  }
  if (input.unit === "UNIT-002" || ["UNIT-005", "UNIT-006", "UNIT-007", "UNIT-008", "UNIT-009", "UNIT-010"].includes(input.unit)) {
    if (["UNIT-005", "UNIT-006", "UNIT-007", "UNIT-008", "UNIT-009"].includes(input.unit)
      && input.decisionAction !== "activate") {
      throw new Error(`${input.unit} requires a decision-backed activate or supersede action`);
    }
    if (input.port !== "auto") throw new Error(`${input.unit} requires --port=auto`);
    return {
      unit: input.unit,
      profile: "limit",
      artifactOnly: false,
      cleanupRequirement: "REQUIRED",
      evidenceClass: "local-browser",
      portPolicy: "auto",
      namespaceRoles: [...NAMESPACE_ROLES_BY_UNIT[input.unit]],
    };
  }
  throw new Error(`no prepare contract is declared for ${input.unit}`);
}

export function createPreparedNamespaces(
  runId: string,
  roles: readonly FixtureRole[],
  canonicalPreStateSha256: string,
): Record<FixtureRole, { idSha256: string; preStateSha256: string }> | Record<string, never> {
  const entries = roles.map((role) => [role, {
    idSha256: sha256Hex(`estimate-sheet-namespace\0${runId}\0${role}`),
    preStateSha256: canonicalPreStateSha256,
  }] as const);
  const identifiers = entries.map(([, value]) => value.idSha256);
  if (new Set(identifiers).size !== identifiers.length) throw new Error("prepared namespace identifiers are not distinct");
  return Object.fromEntries(entries) as Record<FixtureRole, { idSha256: string; preStateSha256: string }>;
}

function readPlanPack(planRoot: string): EstimateSheetPlanManifest {
  const path = resolve(planRoot, "plan-pack.json");
  if (!existsSync(path)) throw new Error(`plan-pack.json is missing: ${path}`);
  return JSON.parse(readFileSync(path, "utf8")) as EstimateSheetPlanManifest;
}

function requireFingerprintContent(value: unknown, label: string): FingerprintContent {
  const errors = validateFingerprintContent(value, label);
  if (errors.length) throw new Error(`${label} is invalid: ${errors.join("; ")}`);
  return value as FingerprintContent;
}

function requireScopeFileRecords(value: unknown, label: string): ScopeFileRecord[] {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
  const records = value.map((entry, index) => {
    if (!isPlainObject(entry)
      || canonicalJson(Object.keys(entry).sort()) !== canonicalJson(["mode", "path", "sha256"])
      || !isSafeRelativePath(entry.path)
      || !["100644", "100755", "120000"].includes(String(entry.mode))
      || typeof entry.sha256 !== "string"
      || !/^[0-9a-f]{64}$/u.test(entry.sha256)) {
      throw new Error(`${label}[${index}] is invalid`);
    }
    return entry as ScopeFileRecord;
  });
  if (new Set(records.map((entry) => entry.path)).size !== records.length) {
    throw new Error(`${label} contains duplicate paths`);
  }
  return records;
}

export function assertClosedPredecessorAdmissionLineage(input: {
  admission: Record<string, unknown>;
  currentFingerprint: SourceFingerprint;
  currentScopeRecords: ScopeFileRecords;
}): { inputApplicationFingerprint: FingerprintContent; inputProducerFingerprint: FingerprintContent } {
  const predecessor = input.admission.predecessor;
  if (!isPlainObject(predecessor)) throw new Error("predecessor admission binding is missing");
  const inputApplicationFingerprint = requireFingerprintContent(
    input.admission.input_application_fingerprint,
    "predecessor admission input application fingerprint",
  );
  const inputProducerFingerprint = requireFingerprintContent(
    input.admission.input_producer_fingerprint,
    "predecessor admission input producer fingerprint",
  );
  const predecessorApplicationFingerprint = requireFingerprintContent(
    predecessor.application_fingerprint,
    "predecessor output application fingerprint",
  );
  const predecessorProducerFingerprint = requireFingerprintContent(
    predecessor.producer_fingerprint,
    "predecessor output producer fingerprint",
  );
  if (input.admission.require_producer_equality !== true) {
    throw new Error("predecessor admission must require producer equality");
  }
  if (!fingerprintContentEqual(inputApplicationFingerprint, predecessorApplicationFingerprint)
    || !fingerprintContentEqual(inputProducerFingerprint, predecessorProducerFingerprint)
    || !fingerprintContentEqual(inputApplicationFingerprint, input.currentFingerprint.application)
    || !fingerprintContentEqual(inputProducerFingerprint, input.currentFingerprint.producer)) {
    throw new Error("predecessor admission, immutable outputs, and current fingerprints do not form one cohort");
  }
  const admittedScopes = input.admission.input_scope_records;
  if (!isPlainObject(admittedScopes)) throw new Error("predecessor admission input scope records are missing");
  const normalizedAdmissionScopes: ScopeFileRecords = {
    application: requireScopeFileRecords(admittedScopes.application, "predecessor application scope"),
    producer: requireScopeFileRecords(admittedScopes.producer, "predecessor producer scope"),
  };
  if (canonicalJson(normalizedAdmissionScopes) !== canonicalJson(input.currentScopeRecords)) {
    throw new Error("closed predecessor admission has an application or producer scope delta");
  }
  return { inputApplicationFingerprint, inputProducerFingerprint };
}

function resolveImmutableAdmissionBinding(planRoot: string, value: unknown, label: string): string {
  if (typeof value !== "string" || !isSafeRelativePath(value) || !value.startsWith("evidence/runtime/runs/")) {
    throw new Error(`${label} is not a registered immutable run path`);
  }
  const path = resolve(planRoot, value);
  if (!isContained(planRoot, path)) throw new Error(`${label} escapes the plan root`);
  assertRegularFile(path, label);
  return path;
}

function assertPredecessorImmutableLineage(input: {
  admission: Record<string, unknown>;
  planRoot: string;
}): void {
  const predecessor = input.admission.predecessor;
  if (!isPlainObject(predecessor)) throw new Error("predecessor admission binding is missing");
  const indexPath = resolveImmutableAdmissionBinding(
    input.planRoot,
    predecessor.index_immutable_path,
    "predecessor evidence index",
  );
  if (typeof predecessor.index_sha256 !== "string" || sha256File(indexPath) !== predecessor.index_sha256) {
    throw new Error("predecessor evidence index hash mismatch");
  }
  const evidencePath = resolveImmutableAdmissionBinding(
    input.planRoot,
    predecessor.evidence_immutable_path,
    "predecessor primary evidence",
  );
  if (typeof predecessor.evidence_sha256 !== "string" || sha256File(evidencePath) !== predecessor.evidence_sha256) {
    throw new Error("predecessor primary evidence hash mismatch");
  }
  const index = readJsonFile<Record<string, unknown>>(indexPath);
  const indexPayload = structuredClone(index);
  const indexPayloadSha256 = indexPayload.payload_sha256;
  delete indexPayload.payload_sha256;
  const evidence = Array.isArray(index.evidence) ? index.evidence : [];
  if (index.schema_version !== "estimate-sheet-evidence-index.v1"
    || index.unit_id !== predecessor.unit_id
    || index.run_id !== predecessor.run_id
    || !["VERIFIED", "SUPERSEDED"].includes(String(index.status))
    || indexPayloadSha256 !== sha256Json(indexPayload)
    || evidence.length !== 1
    || !isPlainObject(evidence[0])
    || evidence[0].immutable_path !== predecessor.evidence_immutable_path
    || evidence[0].sha256 !== predecessor.evidence_sha256) {
    throw new Error("predecessor immutable index does not bind its primary evidence");
  }
  const output = readJsonFile<Record<string, unknown>>(evidencePath);
  const outputApplication = output.applicationFingerprint ?? output.application_fingerprint;
  const outputProducer = output.producerFingerprint ?? output.producer_fingerprint;
  if (!fingerprintContentEqual(outputApplication, predecessor.application_fingerprint)
    || !fingerprintContentEqual(outputProducer, predecessor.producer_fingerprint)) {
    throw new Error("predecessor immutable evidence fingerprint pair mismatch");
  }
}

function assertClosedRefreezeDelta(admission: Record<string, unknown>): void {
  const declaredApplication = admission.declared_application_paths;
  const declaredProducer = admission.declared_producer_paths;
  const changedApplication = admission.changed_application_paths;
  const changedProducer = admission.changed_producer_paths;
  for (const [label, value] of [
    ["declared application", declaredApplication],
    ["declared producer", declaredProducer],
    ["changed application", changedApplication],
    ["changed producer", changedProducer],
  ] as const) {
    if (!Array.isArray(value)
      || value.some((path) => !isSafeRelativePath(path))
      || new Set(value).size !== value.length) {
      throw new Error(`refreeze ${label} path set is invalid`);
    }
  }
  if ((changedApplication as string[]).some((path) => !(declaredApplication as string[]).includes(path))
    || (changedProducer as string[]).some((path) => !(declaredProducer as string[]).includes(path))) {
    throw new Error("refreeze receipt contains an undeclared source delta");
  }
  const changedCount = (changedApplication as string[]).length + (changedProducer as string[]).length;
  if (admission.reconciliation === "CURRENT_IMPLEMENTATION_CHARACTERIZED") {
    if (changedCount !== 0) throw new Error("characterization refreeze receipt cannot contain a source delta");
  } else if (admission.reconciliation === "DECLARED_REPAIR_APPLIED") {
    if (changedCount === 0) throw new Error("repair refreeze receipt must contain a declared source delta");
  } else {
    throw new Error("refreeze receipt reconciliation is invalid");
  }
}

function readAdmission(
  repoRoot: string,
  planRoot: string,
  path: string | undefined,
  unit: EstimateUnit,
  plan: EstimateSheetPlanManifest,
  planFileSha256: string,
  currentFingerprint: SourceFingerprint,
  kind: "planning" | "refreeze" | "predecessor" | undefined,
): { sha256: string; bytes: Buffer; kind: "planning" | "refreeze" | "predecessor"; inputApplicationFingerprint: FingerprintContent; inputProducerFingerprint: FingerprintContent } | undefined {
  if (!path) return undefined;
  const admissionPath = resolve(repoRoot, path);
  if (!isContained(repoRoot, admissionPath)) throw new Error("admission path escapes the repository");
  assertRegularFile(admissionPath, "admission");
  const admission = readJsonFile<Record<string, unknown>>(admissionPath);
  const withoutAdmissionHash = structuredClone(admission);
  const admissionPayloadSha256 = withoutAdmissionHash.payload_sha256;
  delete withoutAdmissionHash.payload_sha256;
  if (admissionPayloadSha256 !== sha256Json(withoutAdmissionHash)) throw new Error("admission payload hash mismatch");

  let inputApplicationFingerprint: FingerprintContent;
  let inputProducerFingerprint: FingerprintContent;
  if (kind === "planning") {
    if (admission.schema_version !== "estimate-sheet-planning-admission.v1") throw new Error("planning admission schema is invalid");
    if (admission.unit_id !== unit || unit !== "UNIT-001" || admission.package_status !== "IMPLEMENTATION_READY" || admission.next_unit !== unit) throw new Error("planning admission does not admit UNIT-001");
    if (admission.package_id !== plan.package_id || admission.implementation_status !== plan.implementation_status) throw new Error("planning admission package tuple mismatch");
    const planBinding = admission.plan_pack;
    if (!isPlainObject(planBinding) || planBinding.file_sha256 !== planFileSha256 || planBinding.manifest_sha256 !== plan.manifest_sha256) {
      throw new Error("planning admission plan binding mismatch");
    }
    const candidate = admission.review_candidate;
    if (!isPlainObject(candidate) || typeof candidate.candidate_sha256 !== "string") throw new Error("planning admission review candidate is invalid");
    const withoutCandidateHash = structuredClone(candidate);
    delete withoutCandidateHash.candidate_sha256;
    if (candidate.candidate_sha256 !== sha256Json(withoutCandidateHash)) throw new Error("planning admission candidate hash mismatch");
    if (!isPlainObject(candidate.promotion_plan_pack)
      || candidate.promotion_plan_pack.file_sha256 !== planFileSha256
      || candidate.promotion_plan_pack.manifest_sha256 !== plan.manifest_sha256
      || candidate.artifact_registry_sha256 !== sha256Json(plan.artifacts)) {
      throw new Error("planning admission candidate does not bind the promoted manifest");
    }
    const keyArtifacts = candidate.key_artifacts;
    if (!Array.isArray(keyArtifacts)) throw new Error("planning admission key artifacts are missing");
    for (const [artifactId, artifactPath] of [
      ["ART-031", "IMPLEMENTATION_PLAN.md"],
      ["ART-034", "evidence/2026-07-10-frontier-plan-readiness.md"],
      ["ART-036", "evidence/source-fingerprint-v1.mjs"],
      ["ART-037", "evidence/record-unit001-planning-admission.mjs"],
    ] as const) {
      const matches = keyArtifacts.filter((entry) => isPlainObject(entry) && entry.artifact_id === artifactId);
      const planMatches = plan.artifacts.filter((entry) => entry.id === artifactId);
      if (matches.length !== 1 || planMatches.length !== 1) throw new Error(`planning admission must bind exactly one ${artifactId}`);
      const binding = matches[0] as Record<string, unknown>;
      const planArtifact = planMatches[0]!;
      const absoluteArtifactPath = resolve(planRoot, artifactPath);
      assertRegularFile(absoluteArtifactPath, artifactId);
      if (binding.path !== artifactPath || binding.sha256 !== planArtifact.sha256 || sha256File(absoluteArtifactPath) !== binding.sha256) {
        throw new Error(`planning admission ${artifactId} hash/path mismatch`);
      }
    }
    const reviews = admission.independent_reviews;
    if (!Array.isArray(reviews)) throw new Error("planning admission independent reviews are missing");
    const expectedRoles = ["architect", "critic", "fingerprint-verifier"];
    const actualRoles = reviews.map((review) => isPlainObject(review) ? review.role : null).sort();
    const reviewerIds = reviews.map((review) => isPlainObject(review) ? review.reviewer_id : null);
    if (JSON.stringify(actualRoles) !== JSON.stringify([...expectedRoles].sort())
      || new Set(reviewerIds).size !== reviewerIds.length
      || reviewerIds.some((id) => typeof id !== "string" || !id)
      || reviews.some((review) => !isPlainObject(review) || review.verdict !== "CLEAN" || review.candidate_sha256 !== candidate.candidate_sha256)) {
      throw new Error("planning admission independent reviews are invalid");
    }
    for (const review of reviews) {
      const receipt = review as Record<string, unknown>;
      const payload = Object.fromEntries([
        "schema_version", "role", "reviewer_id", "verdict", "candidate_sha256", "reviewed_at",
      ].map((key) => [key, receipt[key]]));
      if (receipt.payload_sha256 !== sha256Json(payload)) throw new Error(`planning admission ${String(receipt.role)} review payload hash mismatch`);
      if (typeof receipt.path !== "string" || typeof receipt.file_sha256 !== "string") throw new Error("planning review file binding is invalid");
      const reviewPath = resolve(repoRoot, receipt.path);
      if (!isContained(repoRoot, reviewPath)) throw new Error("planning review path escapes the repository");
      assertRegularFile(reviewPath, `${String(receipt.role)} review`);
      if (sha256File(reviewPath) !== receipt.file_sha256) throw new Error(`${String(receipt.role)} review file hash mismatch`);
      const reviewFile = readJsonFile<Record<string, unknown>>(reviewPath);
      if (canonicalJson(reviewFile) !== canonicalJson(Object.fromEntries([
        "schema_version", "role", "reviewer_id", "verdict", "candidate_sha256", "reviewed_at", "payload_sha256",
      ].map((key) => [key, receipt[key]])))) throw new Error(`${String(receipt.role)} review file payload mismatch`);
    }
    const validation = admission.admission_validation;
    if (!isPlainObject(validation)
      || !fingerprintContentEqual(validation.source_fingerprint, candidate.source_fingerprint)
      || !isPlainObject(candidate.validation)
      || validation.reference_stdout_sha256 !== candidate.validation.reference_stdout_sha256
      || validation.reference_payload_sha256 !== candidate.validation.reference_payload_sha256) {
      throw new Error("planning admission validation binding mismatch");
    }
    const source = validation.source_fingerprint as SourceFingerprint;
    inputApplicationFingerprint = source.application;
    inputProducerFingerprint = source.producer;
  } else if (kind === "refreeze") {
    if (admission.schema_version !== "estimate-sheet-refreeze-receipt.v1"
      || admission.replacement_unit_id !== "UNIT-001"
      || unit !== "UNIT-001"
      || admission.reconciliation === undefined) {
      throw new Error("refreeze receipt does not admit replacement UNIT-001");
    }
    if (!fingerprintContentEqual(admission.output_application_fingerprint, currentFingerprint.application)
      || !fingerprintContentEqual(admission.output_producer_fingerprint, currentFingerprint.producer)) {
      throw new Error("refreeze receipt output fingerprints are stale");
    }
    assertClosedRefreezeDelta(admission);
    const predecessor = admission.predecessor;
    if (!isPlainObject(predecessor)
      || predecessor.unit_id !== "UNIT-001"
      || predecessor.index_immutable_path !== plan.runtime_evidence.registry.immutable_path
      || predecessor.index_sha256 !== plan.runtime_evidence.registry.sha256) {
      throw new Error("refreeze receipt predecessor binding mismatch");
    }
    inputApplicationFingerprint = admission.input_application_fingerprint as FingerprintContent;
    inputProducerFingerprint = admission.input_producer_fingerprint as FingerprintContent;
  } else if (kind === "predecessor") {
    if (admission.schema_version !== "estimate-sheet-predecessor-admission.v1" || admission.unit_id !== unit) {
      throw new Error("predecessor admission does not admit the selected unit");
    }
    const predecessor = admission.predecessor;
    const decision = admission.decision;
    const decisionRow = plan.runtime_evidence.projections.find((row) => row.artifact_id === "ART-043");
    if (!isPlainObject(predecessor)
      || predecessor.unit_id !== plan.runtime_evidence.latest_unit_id
      || predecessor.run_id !== plan.runtime_evidence.latest_run_id
      || predecessor.index_immutable_path !== plan.runtime_evidence.registry.immutable_path
      || predecessor.index_sha256 !== plan.runtime_evidence.registry.sha256
      || !isPlainObject(decision)
      || decision.immutable_path !== decisionRow?.immutable_path
      || decision.sha256 !== decisionRow?.sha256) {
      throw new Error("predecessor admission immutable bindings are stale");
    }
    assertPredecessorImmutableLineage({ admission, planRoot });
    if (typeof decision.immutable_path !== "string" || typeof decision.sha256 !== "string") {
      throw new Error("predecessor admission decision binding is invalid");
    }
    const decisionPath = resolveImmutableAdmissionBinding(planRoot, decision.immutable_path, "bottleneck decision");
    if (sha256File(decisionPath) !== decision.sha256) throw new Error("bottleneck decision hash mismatch");
    const closed = assertClosedPredecessorAdmissionLineage({
      admission,
      currentFingerprint,
      currentScopeRecords: computeEstimateSheetScopeFileRecords(repoRoot),
    });
    inputApplicationFingerprint = closed.inputApplicationFingerprint;
    inputProducerFingerprint = closed.inputProducerFingerprint;
  } else {
    throw new Error("admission kind is required when an admission path is provided");
  }
  const bytes = readFileSync(admissionPath);
  return { sha256: sha256File(admissionPath), bytes, kind, inputApplicationFingerprint, inputProducerFingerprint };
}

function canonicalTransitionJournalPath(repoRoot: string): string {
  return resolve(defaultRunRoot(repoRoot), "..", "plan-transition-journal.json");
}

function assertNoGlobalTransitionJournal(repoRoot: string): void {
  const journalPath = canonicalTransitionJournalPath(repoRoot);
  if (existsSync(journalPath)) {
    throw new Error(`unresolved canonical plan transition journal blocks prepare: ${journalPath}`);
  }
}

async function withTransitionLock<T>(repoRoot: string, operation: () => Promise<T>): Promise<T> {
  assertNoGlobalTransitionJournal(repoRoot);
  const lockPath = resolve(defaultRunRoot(repoRoot), "..", ".plan-transition.lock");
  mkdirSync(dirname(lockPath), { recursive: true, mode: 0o700 });
  mkdirSync(lockPath, { mode: 0o700 });
  try {
    writeJsonNoOverwrite(lockPath + "/owner.json", {
      schema_version: "estimate-sheet-plan-transition-lock.v1",
      pid: process.pid,
      acquired_at: nowIso(),
    }, 0o600);
    assertNoGlobalTransitionJournal(repoRoot);
    return await operation();
  } finally {
    rmSync(lockPath, { recursive: true, force: true });
  }
}

type PrepareJournalState = "ALLOCATED" | "FILES_DECLARED" | "FILES_WRITTEN" | "COMMITTED";

type PrepareTransitionJournal = {
  schema_version: "estimate-sheet-prepare-transition-journal.v1";
  state: PrepareJournalState;
  unit_id: EstimateUnit;
  run_id: string;
  plan_path: string;
  run_root: string;
  immutable_run_root: string;
  unit_lease_path: string;
  unit_lease_staging_path: string;
  old_plan_sha256: string;
  old_plan_bytes_base64: string;
  new_plan_sha256: string;
  new_plan_bytes_base64: string;
  durable_files: Array<{ path: string; sha256: string }>;
  created_at: string;
};

type PrepareRecoveryCandidate = {
  unit: EstimateUnit;
  runId: string;
  runPath: string;
  immutableRunRoot: string;
  runRootBase: string;
  unitLeasePath: string;
  unitLeaseStagingPath: string;
};

function pathRelativeToRepo(repoRoot: string, path: string, label: string): string {
  if (!isContained(repoRoot, path)) throw new Error(`${label} escapes the repository`);
  const value = relative(repoRoot, path).split("\\").join("/");
  if (!isSafeRelativePath(value)) throw new Error(`${label} is not repository-relative`);
  return value;
}

function resolvePrepareJournalPath(repoRoot: string, path: string, label: string): string {
  if (!isSafeRelativePath(path)) throw new Error(`${label} is not a safe repository-relative path`);
  const absolute = resolve(repoRoot, path);
  if (!isContained(repoRoot, absolute)) throw new Error(`${label} escapes the repository`);
  return absolute;
}

function decodeJournalPlanBytes(value: string, expectedSha256: string, label: string): Buffer {
  const bytes = Buffer.from(value, "base64");
  if (sha256Hex(bytes) !== expectedSha256) throw new Error(`${label} bytes do not match their journal hash`);
  return bytes;
}

function readPrepareTransitionJournal(repoRoot: string): PrepareTransitionJournal {
  const path = canonicalTransitionJournalPath(repoRoot);
  assertRegularFile(path, "prepare transition journal");
  const journal = readJsonFile<Record<string, unknown>>(path);
  const expectedKeys = [
    "created_at", "durable_files", "immutable_run_root", "new_plan_bytes_base64", "new_plan_sha256",
    "old_plan_bytes_base64", "old_plan_sha256", "plan_path", "run_id", "run_root", "schema_version",
    "state", "unit_id", "unit_lease_path", "unit_lease_staging_path",
  ].sort();
  if (journal.schema_version !== "estimate-sheet-prepare-transition-journal.v1"
    || canonicalJson(Object.keys(journal).sort()) !== canonicalJson(expectedKeys)
    || !["ALLOCATED", "FILES_DECLARED", "FILES_WRITTEN", "COMMITTED"].includes(String(journal.state))
    || typeof journal.unit_id !== "string"
    || !/^UNIT-\d{3}$/u.test(journal.unit_id)
    || typeof journal.run_id !== "string"
    || !journal.run_id
    || typeof journal.old_plan_sha256 !== "string"
    || !/^[0-9a-f]{64}$/u.test(journal.old_plan_sha256)
    || typeof journal.new_plan_sha256 !== "string"
    || !/^[0-9a-f]{64}$/u.test(journal.new_plan_sha256)
    || typeof journal.old_plan_bytes_base64 !== "string"
    || typeof journal.new_plan_bytes_base64 !== "string"
    || typeof journal.created_at !== "string"
    || Number.isNaN(Date.parse(journal.created_at))
    || !Array.isArray(journal.durable_files)) {
    throw new Error("prepare transition journal is invalid");
  }
  for (const key of ["plan_path", "run_root", "immutable_run_root", "unit_lease_path", "unit_lease_staging_path"] as const) {
    if (typeof journal[key] !== "string") throw new Error(`prepare transition journal ${key} is invalid`);
    resolvePrepareJournalPath(repoRoot, journal[key], `prepare transition journal ${key}`);
  }
  const durablePaths = new Set<string>();
  for (const entry of journal.durable_files) {
    if (!isPlainObject(entry)
      || canonicalJson(Object.keys(entry).sort()) !== canonicalJson(["path", "sha256"])
      || typeof entry.path !== "string"
      || typeof entry.sha256 !== "string"
      || !/^[0-9a-f]{64}$/u.test(entry.sha256)) {
      throw new Error("prepare transition journal durable file is invalid");
    }
    resolvePrepareJournalPath(repoRoot, entry.path, "prepare durable file");
    if (durablePaths.has(entry.path)) throw new Error("prepare transition journal contains duplicate durable files");
    durablePaths.add(entry.path);
  }
  decodeJournalPlanBytes(journal.old_plan_bytes_base64, journal.old_plan_sha256, "old plan");
  decodeJournalPlanBytes(journal.new_plan_bytes_base64, journal.new_plan_sha256, "new plan");
  return journal as PrepareTransitionJournal;
}

function replacePrepareTransitionJournal(repoRoot: string, current: PrepareTransitionJournal, next: PrepareTransitionJournal): void {
  const path = canonicalTransitionJournalPath(repoRoot);
  const expectedSha256 = sha256File(path);
  if (canonicalJson(readJsonFile<PrepareTransitionJournal>(path)) !== canonicalJson(current)) {
    throw new Error("prepare transition journal changed concurrently");
  }
  replaceFileAtomically(path, `${canonicalJson(next)}\n`, expectedSha256, 0o600);
}

function removeFileDurably(path: string): void {
  if (!existsSync(path)) return;
  assertRegularFile(path, "durable removal target");
  unlinkSync(path);
  const descriptor = openSync(dirname(path), "r");
  try { fsyncSync(descriptor); } finally { closeSync(descriptor); }
}

function removeOwnedDirectoryDurably(path: string, label: string): void {
  if (!existsSync(path)) return;
  const stat = lstatSync(path);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error(`${label} is not a regular directory`);
  rmSync(path, { recursive: true, force: true });
  const descriptor = openSync(dirname(path), "r");
  try { fsyncSync(descriptor); } finally { closeSync(descriptor); }
}

function prepareRecoveryCandidate(repoRoot: string, journal: PrepareTransitionJournal): PrepareRecoveryCandidate {
  const runPath = resolvePrepareJournalPath(repoRoot, journal.run_root, "prepare run root");
  const unitRoot = dirname(runPath);
  const runRootBase = dirname(unitRoot);
  if (basename(unitRoot) !== journal.unit_id) throw new Error("prepare journal run root does not match its unit");
  return {
    unit: journal.unit_id,
    runId: journal.run_id,
    runPath,
    immutableRunRoot: resolvePrepareJournalPath(repoRoot, journal.immutable_run_root, "prepare immutable run root"),
    runRootBase,
    unitLeasePath: resolvePrepareJournalPath(repoRoot, journal.unit_lease_path, "prepare unit lease"),
    unitLeaseStagingPath: resolvePrepareJournalPath(repoRoot, journal.unit_lease_staging_path, "prepare staged unit lease"),
  };
}

function releaseOwnedUnitLease(candidate: PrepareRecoveryCandidate): void {
  if (existsSync(candidate.unitLeaseStagingPath)) {
    removeOwnedDirectoryDurably(candidate.unitLeaseStagingPath, "staged prepare unit lease");
  }
  if (!existsSync(candidate.unitLeasePath)) return;
  const ownerPath = resolve(candidate.unitLeasePath, "owner.json");
  if (!existsSync(ownerPath)) throw new Error("prepare unit lease ownership is unresolved");
  const owner = readJsonFile<Record<string, unknown>>(ownerPath);
  if (owner.unit_id !== candidate.unit
    || owner.run_id !== candidate.runId
    || typeof owner.run_root !== "string"
    || resolve(owner.run_root) !== candidate.runPath) {
    return;
  }
  removeOwnedDirectoryDurably(candidate.unitLeasePath, "prepare unit lease");
}

function recoverPrepareJournal(repoRoot: string): { result: "ROLLED_BACK" | "COMMITTED"; unit_id: string; run_id: string } {
  const lockPath = resolve(defaultRunRoot(repoRoot), "..", ".plan-transition.lock");
  mkdirSync(dirname(lockPath), { recursive: true, mode: 0o700 });
  mkdirSync(lockPath, { mode: 0o700 });
  try {
    writeJsonNoOverwrite(resolve(lockPath, "owner.json"), {
      schema_version: "estimate-sheet-plan-transition-lock.v1",
      pid: process.pid,
      operation: "PREPARE_RECOVERY",
      acquired_at: nowIso(),
    }, 0o600);
    const journal = readPrepareTransitionJournal(repoRoot);
    const candidate = prepareRecoveryCandidate(repoRoot, journal);
    const planPath = resolvePrepareJournalPath(repoRoot, journal.plan_path, "prepare plan path");
    assertRegularFile(planPath, "prepare plan manifest");
    const planSha256 = sha256File(planPath);
    const committed = planSha256 === journal.new_plan_sha256;
    const preCommit = planSha256 === journal.old_plan_sha256;
    if (!committed && !preCommit) throw new Error("plan manifest matches neither side of the unfinished prepare transition");

    if (committed) {
      if (!["FILES_WRITTEN", "COMMITTED"].includes(journal.state)) {
        throw new Error("prepare plan committed before durable outputs were recorded");
      }
      for (const entry of journal.durable_files) {
        const path = resolvePrepareJournalPath(repoRoot, entry.path, "prepare durable file");
        assertRegularFile(path, "prepare durable file");
        if (sha256File(path) !== entry.sha256) throw new Error(`prepare durable file hash mismatch: ${entry.path}`);
      }
      if (journal.state !== "COMMITTED") {
        replacePrepareTransitionJournal(repoRoot, journal, { ...journal, state: "COMMITTED" });
      }
      removeFileDurably(canonicalTransitionJournalPath(repoRoot));
      return { result: "COMMITTED", unit_id: journal.unit_id, run_id: journal.run_id };
    }

    if (journal.state === "COMMITTED") throw new Error("committed prepare journal cannot be rolled back against the old manifest");
    for (const entry of [...journal.durable_files].reverse()) {
      const path = resolvePrepareJournalPath(repoRoot, entry.path, "prepare durable file");
      if (!existsSync(path)) continue;
      assertRegularFile(path, "prepare durable file");
      if (sha256File(path) !== entry.sha256) throw new Error(`prepare durable file changed before rollback: ${entry.path}`);
      removeFileDurably(path);
    }
    removeOwnedDirectoryDurably(candidate.runPath, "prepare run root");
    removeOwnedDirectoryDurably(candidate.immutableRunRoot, "prepare immutable run root");
    releaseOwnedUnitLease(candidate);
    releaseRunPortLeases(candidate.runRootBase, candidate.runId);
    removeFileDurably(canonicalTransitionJournalPath(repoRoot));
    return { result: "ROLLED_BACK", unit_id: journal.unit_id, run_id: journal.run_id };
  } finally {
    rmSync(lockPath, { recursive: true, force: true });
  }
}

export function recoverEstimateSheetPrepareTransition(input: {
  repoRoot?: string;
} = {}): { result: "NO_JOURNAL" | "ROLLED_BACK" | "COMMITTED"; unit_id?: string; run_id?: string } {
  const repoRoot = resolve(input.repoRoot ?? process.cwd());
  const journalPath = canonicalTransitionJournalPath(repoRoot);
  if (!existsSync(journalPath)) return { result: "NO_JOURNAL" };
  const journal = readJsonFile<Record<string, unknown>>(journalPath);
  if (journal.schema_version === "estimate-sheet-prepare-transition-journal.v1") {
    return recoverPrepareJournal(repoRoot);
  }
  return recoverEstimateSheetIndexTransition({ repoRoot });
}

function readBottleneckDecision(
  repoRoot: string,
  planRoot: string,
  plan: EstimateSheetPlanManifest,
): BottleneckDecisionV1 {
  const projection = plan.runtime_evidence.projections.find((row) => row.artifact_id === "ART-043");
  if (!projection || typeof projection.immutable_path !== "string" || !projection.immutable_path || typeof projection.sha256 !== "string") {
    throw new Error("bottleneck decision immutable projection is unavailable");
  }
  const path = resolve(planRoot, projection.immutable_path);
  if (!isContained(repoRoot, path)) throw new Error("bottleneck decision path escapes the repository");
  assertRegularFile(path, "bottleneck decision");
  if (sha256File(path) !== projection.sha256) throw new Error("bottleneck decision immutable hash mismatch");
  const decision = readJsonFile<unknown>(path);
  assertBottleneckDecision(decision);
  return decision;
}

function activatedModesForUnit(unit: EstimateUnit, decision: BottleneckDecisionV1 | undefined): string[] {
  if (!decision || !["UNIT-005", "UNIT-006", "UNIT-007", "UNIT-008", "UNIT-009", "UNIT-010"].includes(unit)) return [];
  const activated = new Set(decision.activatedUnits);
  if (unit === "UNIT-010") return Object.entries(MODE_ENVIRONMENT_KEY_BY_UNIT)
    .filter(([candidate]) => activated.has(candidate as keyof typeof MODE_ENVIRONMENT_KEY_BY_UNIT))
    .map(([, key]) => key);
  const maximum = Number(unit.slice(-3));
  return Object.entries(MODE_ENVIRONMENT_KEY_BY_UNIT)
    .filter(([candidate]) => Number(candidate.slice(-3)) <= maximum && activated.has(candidate as keyof typeof MODE_ENVIRONMENT_KEY_BY_UNIT))
    .map(([, key]) => key);
}

function deterministicUuid(seed: string, label: string): string {
  const hex = sha256Hex(`${seed}\0${label}`).slice(0, 32).split("");
  hex[12] = "4";
  hex[16] = "8";
  const value = hex.join("");
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
}

function makeFixtureIds(runId: string, role: FixtureRole, fixture: EstimateSheetPerformanceFixture): FixtureIds {
  const seed = `${runId}\0${role}`;
  const user = deterministicUuid(seed, "auth-user-profile");
  return {
    user,
    session: deterministicUuid(seed, "auth-session"),
    allowlist: deterministicUuid(seed, "allowlist"),
    legal: deterministicUuid(seed, "legal"),
    profile: user,
    workspace: deterministicUuid(seed, "workspace"),
    project: deterministicUuid(seed, "project"),
    estimate: deterministicUuid(seed, "estimate"),
    tab: deterministicUuid(seed, "tab"),
    nodes: flattenEstimatePerformanceNodes(fixture).map((node) => deterministicUuid(seed, node.id)),
    rows: fixture.rows.map((row) => deterministicUuid(seed, row.id)),
  };
}

function sqlValue(value: string | number | null): string {
  if (value === null) return "NULL";
  if (typeof value === "number") return String(value);
  return `'${value.replaceAll("'", "''")}'`;
}

function exactIdsForRole(ids: FixtureIds): Record<string, string[]> {
  return {
    estimate_row_items: ids.rows,
    estimate_nodes: ids.nodes,
    estimate_tabs: [ids.tab],
    estimate_sheet_access_settings: [ids.estimate],
    estimate_sheet_members: [`${ids.estimate}:${ids.profile}`],
    estimates: [ids.estimate],
    project_members: [`${ids.project}:${ids.profile}`],
    projects: [ids.project],
    workspace_members: [`${ids.workspace}:${ids.profile}`],
    workspaces: [ids.workspace],
    profiles: [ids.profile],
    session: [ids.session],
    user: [ids.user],
    legal_terms_acceptances: [ids.legal],
    closed_beta_allowed_emails: [ids.allowlist],
  };
}

function cleanupState(runId: string, role: FixtureRole, namespaceIdSha256: string, ids: FixtureIds): Record<string, unknown> {
  return {
    schema_version: role === "d1"
      ? "estimate-sheet-local-d1-cleanup-state.v1"
      : "estimate-sheet-local-preview-cleanup-state.v1",
    state: "CLEANUP_PREPARED",
    run_id: runId,
    fixture_role: role,
    namespace_id_sha256: namespaceIdSha256,
    exact_table_order: APPLICATION_CLEANUP_TABLES,
    auxiliary_auth_table_order: AUTH_CLEANUP_TABLES,
    exact_ids: exactIdsForRole(ids),
  };
}

function renderCleanupSql(records: Array<{ role: FixtureRole; ids: FixtureIds }>): string {
  const lines = ["BEGIN IMMEDIATE;"];
  for (const { role, ids } of records) {
    lines.push(`-- fixture role: ${role}`);
    for (const id of ids.rows) lines.push(`DELETE FROM estimate_row_items WHERE id = ${sqlValue(id)};`);
    for (const id of ids.nodes) lines.push(`DELETE FROM estimate_nodes WHERE id = ${sqlValue(id)};`);
    lines.push(
      `DELETE FROM estimate_tabs WHERE id = ${sqlValue(ids.tab)};`,
      `DELETE FROM estimate_sheet_access_settings WHERE estimate_id = ${sqlValue(ids.estimate)};`,
      `DELETE FROM estimate_sheet_members WHERE estimate_id = ${sqlValue(ids.estimate)} AND user_id = ${sqlValue(ids.profile)};`,
      `DELETE FROM estimates WHERE id = ${sqlValue(ids.estimate)};`,
      `DELETE FROM project_members WHERE project_id = ${sqlValue(ids.project)} AND user_id = ${sqlValue(ids.profile)};`,
      `DELETE FROM projects WHERE id = ${sqlValue(ids.project)};`,
      `DELETE FROM workspace_members WHERE workspace_id = ${sqlValue(ids.workspace)} AND user_id = ${sqlValue(ids.profile)};`,
      `DELETE FROM workspaces WHERE id = ${sqlValue(ids.workspace)};`,
      `DELETE FROM profiles WHERE id = ${sqlValue(ids.profile)};`,
      `DELETE FROM \"session\" WHERE id = ${sqlValue(ids.session)};`,
      `DELETE FROM \"user\" WHERE id = ${sqlValue(ids.user)};`,
      `DELETE FROM legal_terms_acceptances WHERE id = ${sqlValue(ids.legal)};`,
      `DELETE FROM closed_beta_allowed_emails WHERE id = ${sqlValue(ids.allowlist)};`,
    );
  }
  lines.push("COMMIT;");
  return `${lines.join("\n")}\n`;
}

async function isFreeLoopbackPort(port: number): Promise<boolean> {
  return await new Promise((resolveResult) => {
    const server = createServer();
    const finish = (free: boolean) => {
      server.removeAllListeners();
      if (server.listening) server.close(() => resolveResult(free));
      else resolveResult(free);
    };
    server.once("error", () => finish(false));
    server.listen({ host: "127.0.0.1", port, exclusive: true }, () => finish(true));
  });
}

function claimUnitLease(
  leasePath: string,
  stagingPath: string,
  unit: EstimateUnit,
  runId: string,
  runPath: string,
  resolvedPreviousRunId?: string,
): void {
  mkdirSync(dirname(leasePath), { recursive: true, mode: 0o700 });
  if (existsSync(stagingPath)) throw new Error(`unresolved staged unit lease blocks prepare: ${stagingPath}`);
  if (existsSync(leasePath)) {
    let resolved = false;
    try {
      const owner = readJsonFile<Record<string, unknown>>(resolve(leasePath, "owner.json"));
      resolved = typeof resolvedPreviousRunId === "string"
        && owner.unit_id === unit
        && owner.run_id === resolvedPreviousRunId;
    } catch {
      // A malformed lease cannot be proven resolved.
    }
    if (!resolved) throw new Error(`unresolved unit lease blocks prepare: ${leasePath}`);
    rmSync(leasePath, { recursive: true, force: true });
  }
  mkdirSync(stagingPath, { mode: 0o700 });
  writeJsonNoOverwrite(resolve(stagingPath, "owner.json"), {
    schema_version: "estimate-sheet-unit-lease.v1",
    unit_id: unit,
    run_id: runId,
    run_root: runPath,
    owner_pid: process.pid,
    acquired_at: nowIso(),
  }, 0o600);
  if (existsSync(leasePath)) throw new Error(`unresolved unit lease blocks prepare: ${leasePath}`);
  renameSync(stagingPath, leasePath);
}

async function claimPortLease(runRootBase: string, unit: EstimateUnit, runId: string, runPath: string): Promise<{ port: number; path: string }> {
  const leaseRoot = resolve(runRootBase, "..", "leases", "ports");
  mkdirSync(leaseRoot, { recursive: true, mode: 0o700 });
  for (let port = 3101; port <= 3199; port += 1) {
    const path = resolve(leaseRoot, String(port));
    try {
      mkdirSync(path, { mode: 0o700 });
    } catch (error) {
      if (isPlainObject(error) && error.code === "EEXIST") continue;
      throw error;
    }
    if (!await isFreeLoopbackPort(port)) {
      rmSync(path, { recursive: true, force: true });
      continue;
    }
    writeJsonNoOverwrite(resolve(path, "owner.json"), {
      schema_version: "estimate-sheet-port-lease.v1",
      unit_id: unit,
      run_id: runId,
      run_root: runPath,
      port,
      owner_pid: process.pid,
      acquired_at: nowIso(),
    }, 0o600);
    return { port, path };
  }
  throw new Error("no free loopback benchmark port is available in 3101..3199");
}

function assertRegularDirectory(path: string, label: string): void {
  const stat = lstatSync(path);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error(`${label} must be a regular directory`);
}

function loadMigrations(
  repoRoot: string,
  splitSqlQuery: typeof import("wrangler")["unstable_splitSqlQuery"],
): MigrationDescriptor[] {
  const root = resolve(repoRoot, "migrations");
  if (!existsSync(root)) throw new Error("active migrations directory is missing");
  assertRegularDirectory(root, "active migrations directory");
  const names = readdirSync(root).filter((name) => name.endsWith(".sql")).sort();
  if (!names.length || names.some((name) => !/^\d{4}_[a-z0-9_]+\.sql$/u.test(name))) {
    throw new Error("active migration inventory is empty or malformed");
  }
  if (new Set(names.map((name) => name.slice(0, 4))).size !== names.length) {
    throw new Error("active migration ordinals are duplicated");
  }
  return names.map((name) => {
    const path = resolve(root, name);
    assertRegularFile(path, `migration ${name}`);
    const statements = splitSqlQuery(readFileSync(path, "utf8"))
      .filter((statement) => !/^\s*(?:BEGIN|COMMIT)\s*;?\s*$/iu.test(statement));
    if (!statements.length) throw new Error(`migration has no executable statements: ${name}`);
    return { name, sha256: sha256File(path), statements };
  });
}

function localWranglerBinding(
  repoRoot: string,
  readConfig: typeof import("wrangler")["unstable_readConfig"],
): { databaseName: string; databaseId: string; compatibilityDate: string } {
  const configPath = resolve(repoRoot, "wrangler.jsonc");
  assertRegularFile(configPath, "wrangler.jsonc");
  const config = readConfig({ config: configPath }) as unknown as {
    compatibility_date?: unknown;
    d1_databases?: Array<Record<string, unknown>>;
  };
  const matches = (config.d1_databases ?? []).filter((binding) => binding.binding === "ARCH_DB");
  if (matches.length !== 1) throw new Error("wrangler.jsonc must define exactly one ARCH_DB binding");
  const binding = matches[0]!;
  if (typeof binding.database_name !== "string" || !binding.database_name
    || typeof binding.database_id !== "string" || !binding.database_id
    || typeof config.compatibility_date !== "string" || !/^\d{4}-\d{2}-\d{2}$/u.test(config.compatibility_date)) {
    throw new Error("ARCH_DB local binding metadata is incomplete");
  }
  return {
    databaseName: binding.database_name,
    databaseId: binding.database_id,
    compatibilityDate: config.compatibility_date,
  };
}

function fixtureSeedSql(input: {
  fixture: EstimateSheetPerformanceFixture;
  ids: FixtureIds;
  sessionToken: string;
  email: string;
  timestamp: string;
  expiresAt: string;
  role: FixtureRole;
}): string[] {
  const { fixture, ids, sessionToken, email, timestamp, expiresAt, role } = input;
  const nodes = flattenEstimatePerformanceNodes(fixture);
  const nodeIdByFixtureId = new Map(nodes.map((node, index) => [node.id, ids.nodes[index]!]));
  const fixtureNodeIndexes = new Map(nodes.map((node, index) => [node.id, index]));
  const lines = [
    `-- fixture role: ${role}`,
    `INSERT INTO \"user\" (id, name, email, emailVerified, createdAt, updatedAt) VALUES (${sqlValue(ids.user)}, 'Estimate performance user', ${sqlValue(email)}, 1, ${sqlValue(timestamp)}, ${sqlValue(timestamp)});`,
    `INSERT INTO \"session\" (id, expiresAt, token, createdAt, updatedAt, userId) VALUES (${sqlValue(ids.session)}, ${sqlValue(expiresAt)}, ${sqlValue(sessionToken)}, ${sqlValue(timestamp)}, ${sqlValue(timestamp)}, ${sqlValue(ids.user)});`,
    `INSERT INTO closed_beta_allowed_emails (id, normalized_email, status, invited_at, accepted_at, created_at, updated_at) VALUES (${sqlValue(ids.allowlist)}, ${sqlValue(email)}, 'active', ${sqlValue(timestamp)}, ${sqlValue(timestamp)}, ${sqlValue(timestamp)}, ${sqlValue(timestamp)});`,
    `INSERT INTO legal_terms_acceptances (id, user_id, terms_key, terms_version, terms_effective_date, terms_content_hash, privacy_policy_version, acceptance_method, acceptance_context, accepted_at, created_at) VALUES (${sqlValue(ids.legal)}, ${sqlValue(ids.profile)}, ${sqlValue(CURRENT_TERMS.key)}, ${sqlValue(CURRENT_TERMS.version)}, ${sqlValue(CURRENT_TERMS.effectiveDate)}, ${sqlValue(CURRENT_TERMS.contentHash)}, ${sqlValue(CURRENT_TERMS.privacyPolicyVersion)}, 'authenticated_clickwrap', 'workshop_terms_gate', ${sqlValue(timestamp)}, ${sqlValue(timestamp)});`,
    `INSERT INTO profiles (id, email, display_name, role, default_workspace_id, created_at, updated_at) VALUES (${sqlValue(ids.profile)}, ${sqlValue(email)}, 'Estimate performance profile', 'member', ${sqlValue(ids.workspace)}, ${sqlValue(timestamp)}, ${sqlValue(timestamp)});`,
    `INSERT INTO workspaces (id, name, slug, created_by, created_at, updated_at) VALUES (${sqlValue(ids.workspace)}, 'Estimate performance workspace', ${sqlValue(`perf-${role}-${ids.workspace.slice(0, 8)}`)}, ${sqlValue(ids.profile)}, ${sqlValue(timestamp)}, ${sqlValue(timestamp)});`,
    `INSERT INTO workspace_members (workspace_id, user_id, role, created_at, updated_at) VALUES (${sqlValue(ids.workspace)}, ${sqlValue(ids.profile)}, 'admin', ${sqlValue(timestamp)}, ${sqlValue(timestamp)});`,
    `INSERT INTO projects (id, workspace_id, name, project_code, created_by, created_at, updated_at) VALUES (${sqlValue(ids.project)}, ${sqlValue(ids.workspace)}, 'Estimate performance project', ${sqlValue(`PERF-${role.toUpperCase()}`)}, ${sqlValue(ids.profile)}, ${sqlValue(timestamp)}, ${sqlValue(timestamp)});`,
    `INSERT INTO project_members (project_id, workspace_id, user_id, role, added_by, created_at, updated_at) VALUES (${sqlValue(ids.project)}, ${sqlValue(ids.workspace)}, ${sqlValue(ids.profile)}, 'admin', ${sqlValue(ids.profile)}, ${sqlValue(timestamp)}, ${sqlValue(timestamp)});`,
    `INSERT INTO estimates (id, project_id, name, created_by, created_at, updated_at) VALUES (${sqlValue(ids.estimate)}, ${sqlValue(ids.project)}, 'Estimate performance sheet', ${sqlValue(ids.profile)}, ${sqlValue(timestamp)}, ${sqlValue(timestamp)});`,
    `INSERT INTO estimate_sheet_members (estimate_id, project_id, user_id, role, added_by, created_at, updated_at) VALUES (${sqlValue(ids.estimate)}, ${sqlValue(ids.project)}, ${sqlValue(ids.profile)}, 'admin', ${sqlValue(ids.profile)}, ${sqlValue(timestamp)}, ${sqlValue(timestamp)});`,
    `INSERT INTO estimate_sheet_access_settings (estimate_id, project_id, inherit_project_access, updated_by, created_at, updated_at) VALUES (${sqlValue(ids.estimate)}, ${sqlValue(ids.project)}, 1, ${sqlValue(ids.profile)}, ${sqlValue(timestamp)}, ${sqlValue(timestamp)});`,
    `INSERT INTO estimate_tabs (id, estimate_id, name, sort_order, is_default, created_by, created_at, updated_at) VALUES (${sqlValue(ids.tab)}, ${sqlValue(ids.estimate)}, 'Main', 0, 1, ${sqlValue(ids.profile)}, ${sqlValue(timestamp)}, ${sqlValue(timestamp)});`,
  ];
  nodes.forEach((node, index) => lines.push(
    `INSERT INTO estimate_nodes (id, estimate_id, estimate_tab_id, name, kind, parent_id, sort_order, created_at, updated_at) VALUES (${sqlValue(ids.nodes[index]!)}, ${sqlValue(ids.estimate)}, ${sqlValue(ids.tab)}, ${sqlValue(`Fixture node ${index + 1}`)}, 'area', ${sqlValue(node.parentId ? nodeIdByFixtureId.get(node.parentId) ?? null : null)}, ${index}, ${sqlValue(timestamp)}, ${sqlValue(timestamp)});`,
  ));
  fixture.rows.forEach((row, index) => lines.push(
    `INSERT INTO estimate_row_items (id, estimate_id, node_id, description, material, quantity, unit, unit_cost, misc_cost, contingency_percentage, source_snapshot_json, sort_order, row_revision, source_library_item_id, metadata_json, supplier, created_at, updated_at) VALUES (${sqlValue(ids.rows[index]!)}, ${sqlValue(ids.estimate)}, ${sqlValue(ids.nodes[fixtureNodeIndexes.get(row.nodeId) ?? 0]!)}, ${sqlValue(row.description)}, ${sqlValue(row.material)}, ${row.quantity}, 'pc', ${row.unitCost}, ${row.miscCost}, ${row.contingencyPercentage}, ${sqlValue(JSON.stringify(row.sourceSnapshot))}, ${index}, ${row.rowRevision}, ${sqlValue(row.sourceLibraryItemId)}, '{}', 'Fixture supplier', ${sqlValue(timestamp)}, ${sqlValue(timestamp)});`,
  ));
  return lines;
}

async function seedFixtureRole(
  db: D1Database,
  input: {
    fixture: EstimateSheetPerformanceFixture;
    ids: FixtureIds;
    sessionToken: string;
    email: string;
    timestamp: string;
    expiresAt: string;
  },
): Promise<void> {
  const { fixture, ids, sessionToken, email, timestamp, expiresAt } = input;
  await db.batch([
    db.prepare('INSERT INTO "user" (id, name, email, emailVerified, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)').bind(ids.user, "Estimate performance user", email, 1, timestamp, timestamp),
    db.prepare('INSERT INTO "session" (id, expiresAt, token, createdAt, updatedAt, userId) VALUES (?, ?, ?, ?, ?, ?)').bind(ids.session, expiresAt, sessionToken, timestamp, timestamp, ids.user),
    db.prepare("INSERT INTO closed_beta_allowed_emails (id, normalized_email, status, invited_at, accepted_at, created_at, updated_at) VALUES (?, ?, 'active', ?, ?, ?, ?)").bind(ids.allowlist, email, timestamp, timestamp, timestamp, timestamp),
    db.prepare("INSERT INTO legal_terms_acceptances (id, user_id, terms_key, terms_version, terms_effective_date, terms_content_hash, privacy_policy_version, acceptance_method, acceptance_context, accepted_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'authenticated_clickwrap', 'workshop_terms_gate', ?, ?)").bind(ids.legal, ids.profile, CURRENT_TERMS.key, CURRENT_TERMS.version, CURRENT_TERMS.effectiveDate, CURRENT_TERMS.contentHash, CURRENT_TERMS.privacyPolicyVersion, timestamp, timestamp),
    db.prepare("INSERT INTO profiles (id, email, display_name, role, default_workspace_id, created_at, updated_at) VALUES (?, ?, ?, 'member', ?, ?, ?)").bind(ids.profile, email, "Estimate performance profile", ids.workspace, timestamp, timestamp),
    db.prepare("INSERT INTO workspaces (id, name, slug, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)").bind(ids.workspace, "Estimate performance workspace", `perf-${ids.workspace.slice(0, 8)}`, ids.profile, timestamp, timestamp),
    db.prepare("INSERT INTO workspace_members (workspace_id, user_id, role, created_at, updated_at) VALUES (?, ?, 'admin', ?, ?)").bind(ids.workspace, ids.profile, timestamp, timestamp),
    db.prepare("INSERT INTO projects (id, workspace_id, name, project_code, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(ids.project, ids.workspace, "Estimate performance project", "PERF", ids.profile, timestamp, timestamp),
    db.prepare("INSERT INTO project_members (project_id, workspace_id, user_id, role, added_by, created_at, updated_at) VALUES (?, ?, ?, 'admin', ?, ?, ?)").bind(ids.project, ids.workspace, ids.profile, ids.profile, timestamp, timestamp),
    db.prepare("INSERT INTO estimates (id, project_id, name, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)").bind(ids.estimate, ids.project, "Estimate performance sheet", ids.profile, timestamp, timestamp),
    db.prepare("INSERT INTO estimate_sheet_members (estimate_id, project_id, user_id, role, added_by, created_at, updated_at) VALUES (?, ?, ?, 'admin', ?, ?, ?)").bind(ids.estimate, ids.project, ids.profile, ids.profile, timestamp, timestamp),
    db.prepare("INSERT INTO estimate_sheet_access_settings (estimate_id, project_id, inherit_project_access, updated_by, created_at, updated_at) VALUES (?, ?, 1, ?, ?, ?)").bind(ids.estimate, ids.project, ids.profile, timestamp, timestamp),
    db.prepare("INSERT INTO estimate_tabs (id, estimate_id, name, sort_order, is_default, created_by, created_at, updated_at) VALUES (?, ?, 'Main', 0, 1, ?, ?, ?)").bind(ids.tab, ids.estimate, ids.profile, timestamp, timestamp),
  ]);
  const nodes = flattenEstimatePerformanceNodes(fixture);
  const nodeIdByFixtureId = new Map(nodes.map((node, index) => [node.id, ids.nodes[index]!]));
  await batchInChunks(db, nodes.map((node, index) => db.prepare("INSERT INTO estimate_nodes (id, estimate_id, estimate_tab_id, name, kind, parent_id, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, 'area', ?, ?, ?, ?)").bind(
    ids.nodes[index]!, ids.estimate, ids.tab, `Fixture node ${index + 1}`,
    node.parentId ? nodeIdByFixtureId.get(node.parentId) ?? null : null,
    index, timestamp, timestamp,
  )));
  const fixtureNodeIndexes = new Map(nodes.map((node, index) => [node.id, index]));
  await batchInChunks(db, fixture.rows.map((row, index) => db.prepare("INSERT INTO estimate_row_items (id, estimate_id, node_id, description, material, quantity, unit, unit_cost, misc_cost, contingency_percentage, source_snapshot_json, sort_order, row_revision, source_library_item_id, metadata_json, supplier, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'pc', ?, ?, ?, ?, ?, ?, ?, '{}', 'Fixture supplier', ?, ?)").bind(
    ids.rows[index]!, ids.estimate, ids.nodes[fixtureNodeIndexes.get(row.nodeId) ?? 0]!, row.description,
    row.material, row.quantity, row.unitCost, row.miscCost, row.contingencyPercentage,
    JSON.stringify(row.sourceSnapshot), index, row.rowRevision, row.sourceLibraryItemId, timestamp, timestamp,
  )));
}

async function validateSeededRole(db: D1Database, ids: FixtureIds, sessionToken: string, migrationHead: string): Promise<void> {
  const expectedCounts: Array<[string, number, string, unknown[]]> = [
    ["estimate_row_items", ids.rows.length, "SELECT COUNT(*) AS count FROM estimate_row_items WHERE estimate_id = ?", [ids.estimate]],
    ["estimate_nodes", ids.nodes.length, "SELECT COUNT(*) AS count FROM estimate_nodes WHERE estimate_id = ?", [ids.estimate]],
    ["estimate_tabs", 1, "SELECT COUNT(*) AS count FROM estimate_tabs WHERE id = ?", [ids.tab]],
    ["profiles", 1, "SELECT COUNT(*) AS count FROM profiles WHERE id = ? AND email IS NOT NULL", [ids.profile]],
    ["session", 1, 'SELECT COUNT(*) AS count FROM "session" WHERE id = ? AND token = ? AND userId = ?', [ids.session, sessionToken, ids.user]],
    ["allowlist", 1, "SELECT COUNT(*) AS count FROM closed_beta_allowed_emails WHERE id = ? AND status = 'active'", [ids.allowlist]],
    ["legal", 1, "SELECT COUNT(*) AS count FROM legal_terms_acceptances WHERE id = ? AND user_id = ? AND terms_version = ?", [ids.legal, ids.profile, CURRENT_TERMS.version]],
  ];
  for (const [label, expected, sql, binds] of expectedCounts) {
    const row = await db.prepare(sql).bind(...binds).first<{ count: number }>();
    if (Number(row?.count ?? -1) !== expected) throw new Error(`prepared D1 ${label} seed reconciliation failed`);
  }
  const access = await db.prepare(`
    SELECT estimate.id
    FROM estimates AS estimate
    JOIN projects AS project ON project.id = estimate.project_id
    JOIN workspace_members AS member ON member.workspace_id = project.workspace_id AND member.user_id = ?
    WHERE project.id = ? AND estimate.id = ? AND member.role IN ('owner', 'admin', 'member')
    LIMIT 1
  `).bind(ids.profile, ids.project, ids.estimate).first();
  if (!access) throw new Error("prepared D1 route authorization hierarchy is incomplete");
  const migration = await db.prepare("SELECT name FROM d1_migrations ORDER BY name DESC LIMIT 1").first<{ name: string }>();
  if (migration?.name !== migrationHead) throw new Error("prepared D1 migration head is stale");
}

async function provisionLocalD1(input: {
  repoRoot: string;
  runPath: string;
  runId: string;
  createdAt: string;
  fixture: EstimateSheetPerformanceFixture;
  roles: FixtureRole[];
  namespaces: Record<string, { idSha256: string; preStateSha256: string }>;
  secret: string;
}): Promise<{
  records: Array<{ role: FixtureRole; ids: FixtureIds; sessionToken: string; expiresAt: string }>;
  authFixtureHash: string;
  resources: Record<string, unknown>;
}> {
  const resourceRoot = resolve(input.runPath, "resources", "d1");
  const persistRoot = resolve(input.runPath, "wrangler-state");
  mkdirSync(resourceRoot, { recursive: true, mode: 0o700 });
  mkdirSync(persistRoot, { recursive: true, mode: 0o700 });
  if (readdirSync(persistRoot).length !== 0) throw new Error("Wrangler persistence root is not fresh");

  const schemaProof = await generateLocalBetterAuthD1SchemaSqlProof();
  const sortedTables = [...schemaProof.tableNames].sort();
  if (!schemaProof.generated || !schemaProof.staticReviewReady || typeof schemaProof.sql !== "string" || !schemaProof.sql.trim()
    || typeof schemaProof.sha256 !== "string" || schemaProof.statementCount !== 8
    || canonicalJson(sortedTables) !== canonicalJson([...EXPECTED_BETTER_AUTH_TABLES].sort())) {
    throw new Error(`Better Auth D1 schema generation is incomplete: ${schemaProof.error ?? "invalid generated schema"}`);
  }

  const wrangler = await import("wrangler");
  const migrations = loadMigrations(input.repoRoot, wrangler.unstable_splitSqlQuery);
  const migrationHead = migrations.at(-1)?.name;
  if (!migrationHead) throw new Error("active migration head is unavailable");
  const binding = localWranglerBinding(input.repoRoot, wrangler.unstable_readConfig);
  const schemaPath = resolve(resourceRoot, "better-auth-schema.sql");
  const migrationsPath = resolve(resourceRoot, "migrations.json");
  const localConfigPath = resolve(resourceRoot, "wrangler-local.json");
  const seedPath = resolve(resourceRoot, "seed.sql");
  const cleanupSqlPath = resolve(resourceRoot, "cleanup.sql");
  writeNoOverwrite(schemaPath, `${schemaProof.sql.trim()}\n`, 0o600);
  writeJsonNoOverwrite(migrationsPath, {
    schema_version: "estimate-sheet-local-d1-migrations.v1",
    head: migrationHead,
    count: migrations.length,
    migrations: migrations.map((migration) => ({
      name: migration.name,
      sha256: migration.sha256,
      statement_count: migration.statements.length,
    })),
  }, 0o600);
  writeJsonNoOverwrite(localConfigPath, {
    name: `estimate-performance-${input.runId}`,
    compatibility_date: binding.compatibilityDate,
    d1_databases: [{ binding: "ARCH_DB", database_name: binding.databaseName, database_id: binding.databaseId }],
  }, 0o600);

  const timestamp = input.createdAt;
  const expiresAt = new Date(Date.parse(input.createdAt) + 24 * 60 * 60 * 1_000).toISOString();
  const records = input.roles.map((role) => ({
    role,
    ids: makeFixtureIds(input.runId, role, input.fixture),
    sessionToken: sha256Hex(`${input.secret}\0${input.runId}\0${role}\0session-token`),
    expiresAt,
    email: `estimate-perf-${role}-${input.runId.slice(0, 8)}@example.invalid`,
  }));
  const seedSql = [
    "BEGIN IMMEDIATE;",
    ...records.flatMap((record) => fixtureSeedSql({
      fixture: input.fixture,
      ids: record.ids,
      sessionToken: record.sessionToken,
      email: record.email,
      timestamp,
      expiresAt,
      role: record.role,
    })),
    "COMMIT;",
    "",
  ].join("\n");
  writeNoOverwrite(seedPath, seedSql, 0o600);
  writeNoOverwrite(cleanupSqlPath, renderCleanupSql(records), 0o600);
  for (const record of records) {
    const namespace = input.namespaces[record.role];
    if (!namespace) throw new Error(`missing prepared namespace for ${record.role}`);
    const statePath = resolve(input.runPath, "cleanup", `${record.role}-state.json`);
    const state = cleanupState(input.runId, record.role, namespace.idSha256, record.ids);
    // Cleanup treats exact_ids insertion order as part of the table-order contract.
    writeNoOverwrite(statePath, `${JSON.stringify(state, null, 2)}\n`, 0o600);
  }

  const proxy = await wrangler.getPlatformProxy<{ ARCH_DB: D1Database }>({
    configPath: localConfigPath,
    persist: { path: persistRoot },
    remoteBindings: false,
    envFiles: [],
  });
  try {
    const db = proxy.env.ARCH_DB;
    const generatedStatements = wrangler.unstable_splitSqlQuery(schemaProof.sql);
    await db.batch(generatedStatements.map((statement) => db.prepare(statement)));
    await applyMigrations(db, migrations);
    const schemaTables = await db.prepare("SELECT name FROM sqlite_schema WHERE type = 'table' AND name IN ('account', 'rateLimit', 'session', 'user', 'verification') ORDER BY name ASC").all<{ name: string }>();
    if (canonicalJson(schemaTables.results.map((row) => row.name).sort()) !== canonicalJson([...EXPECTED_BETTER_AUTH_TABLES].sort())) {
      throw new Error("applied Better Auth D1 table set is incomplete");
    }
    const ledger = await db.prepare("SELECT COUNT(*) AS count FROM d1_migrations").first<{ count: number }>();
    if (Number(ledger?.count ?? -1) !== migrations.length) throw new Error("prepared D1 migration ledger is incomplete");
    for (const record of records) {
      await seedFixtureRole(db, {
        fixture: input.fixture,
        ids: record.ids,
        sessionToken: record.sessionToken,
        email: record.email,
        timestamp,
        expiresAt,
      });
      await validateSeededRole(db, record.ids, record.sessionToken, migrationHead);
    }
  } finally {
    await proxy.dispose();
  }

  const authFixtureHash = sha256Json({
    schema: "estimate-sheet-auth-fixture.v1",
    secret_sha256: sha256Hex(input.secret),
    roles: records.map((record) => ({
      role: record.role,
      user_id_sha256: sha256Hex(record.ids.user),
      session_id_sha256: sha256Hex(record.ids.session),
      session_token_sha256: sha256Hex(record.sessionToken),
      expires_at: record.expiresAt,
    })),
  });
  return {
    records: records.map(({ role, ids, sessionToken }) => ({ role, ids, sessionToken, expiresAt })),
    authFixtureHash,
    resources: {
      d1Binding: "ARCH_DB",
      wranglerState: persistRoot,
      localConfig: localConfigPath,
      localConfigSha256: sha256File(localConfigPath),
      generatedSchema: schemaPath,
      generatedSchemaSha256: sha256File(schemaPath),
      migrations: migrationsPath,
      migrationsSha256: sha256File(migrationsPath),
      migrationHead,
      migrationCount: migrations.length,
      seedSql: seedPath,
      seedSqlSha256: sha256File(seedPath),
      cleanupSql: cleanupSqlPath,
      cleanupSqlSha256: sha256File(cleanupSqlPath),
      cleanupStateSha256ByRole: Object.fromEntries(input.roles.map((role) => [
        role,
        sha256File(resolve(input.runPath, "cleanup", `${role}-state.json`)),
      ])),
    },
  };
}

async function prepareResources(input: {
  repoRoot: string;
  runRootBase: string;
  runPath: string;
  runId: string;
  createdAt: string;
  unit: EstimateUnit;
  contract: PrepareContract;
  fixture: EstimateSheetPerformanceFixture | undefined;
  fixtureHash: string | undefined;
  namespaces: Record<string, { idSha256: string; preStateSha256: string }>;
  decision?: BottleneckDecisionV1;
  unitLeasePath: string;
}): Promise<PreparedResources> {
  const resources: PreparedResources = {
    unitLeasePath: input.unitLeasePath,
    ...(input.fixtureHash ? { fixtureHash: input.fixtureHash } : {}),
  };
  if (!input.fixture || !input.fixtureHash || input.contract.namespaceRoles.length === 0) return resources;

  let portLease: { port: number; path: string } | undefined;
  if (input.contract.portPolicy === "auto") {
    portLease = await claimPortLease(input.runRootBase, input.unit, input.runId, input.runPath);
    resources.leasedPort = portLease.port;
    resources.portLeasePath = portLease.path;
  }
  const secret = randomBytes(48).toString("base64url");
  const d1 = await provisionLocalD1({
    repoRoot: input.repoRoot,
    runPath: input.runPath,
    runId: input.runId,
    createdAt: input.createdAt,
    fixture: input.fixture,
    roles: input.contract.namespaceRoles,
    namespaces: input.namespaces,
    secret,
  });
  resources.authFixtureHash = d1.authFixtureHash;
  resources.wranglerState = resolve(input.runPath, "wrangler-state");
  resources.resources = {
    ...d1.resources,
    unitLease: input.unitLeasePath,
    ...(portLease ? { portLease: portLease.path } : {}),
  };

  if (!portLease) return resources;
  const origin = `http://127.0.0.1:${portLease.port}`;
  const runtimeEnv = resolve(input.runPath, "runtime.env");
  const runtimeValues: Record<string, string> = {
    ARCHESTIMATOR_AUTH_PROVIDER: "better-auth",
    BETTER_AUTH_SECRET: secret,
    BETTER_AUTH_URL: origin,
    BETTER_AUTH_TRUSTED_ORIGINS: origin,
    ...Object.fromEntries(MODE_ENVIRONMENT_KEYS.map((key) => [key, "off"])),
  };
  const runtimeOrder = [
    "ARCHESTIMATOR_AUTH_PROVIDER",
    "BETTER_AUTH_SECRET",
    "BETTER_AUTH_URL",
    "BETTER_AUTH_TRUSTED_ORIGINS",
    ...MODE_ENVIRONMENT_KEYS,
  ];
  writeNoOverwrite(runtimeEnv, `${runtimeOrder.map((key) => `${key}=${runtimeValues[key]}`).join("\n")}\n`, 0o600);

  const routeRole: FixtureRole = input.contract.namespaceRoles.includes("browser") ? "browser" : "mode";
  const routeRecord = d1.records.find((record) => record.role === routeRole);
  if (!routeRecord) throw new Error(`prepared route fixture is missing for ${routeRole}`);
  const signature = await makeSignature(routeRecord.sessionToken, secret);
  const storageState = resolve(input.runPath, "storage-state.json");
  writeJsonNoOverwrite(storageState, {
    cookies: [{
      name: "better-auth.session_token",
      value: `${routeRecord.sessionToken}.${signature}`,
      domain: "127.0.0.1",
      path: "/",
      expires: Math.floor(Date.parse(routeRecord.expiresAt) / 1_000),
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    }],
    origins: [],
  }, 0o600);
  const processJournal = resolve(input.runPath, "preview", "process-journal.json");
  writeJsonNoOverwrite(processJournal, {
    schema_version: "estimate-sheet-preview-process-journal.v1",
    unit_id: input.unit,
    run_id: input.runId,
    processes: [],
    updated_at: input.createdAt,
  }, 0o600);
  const routePath = `/workshop/projects/${routeRecord.ids.project}/estimates/${routeRecord.ids.estimate}`;
  return {
    ...resources,
    runtimeEnv,
    runtimeEnvSha256: sha256File(runtimeEnv),
    storageState,
    storageStateSha256: sha256File(storageState),
    storageStateExpiresAt: routeRecord.expiresAt,
    processJournal,
    routePath,
    route: {
      path: routePath,
      projectId: routeRecord.ids.project,
      nodeId: routeRecord.ids.estimate,
      fixtureRole: routeRole,
    },
    activatedModes: activatedModesForUnit(input.unit, input.decision),
  };
}

function releaseRunPortLeases(runRootBase: string, runId: string): void {
  const root = resolve(runRootBase, "..", "leases", "ports");
  if (!existsSync(root)) return;
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const leasePath = resolve(root, entry.name);
    const ownerPath = resolve(leasePath, "owner.json");
    try {
      const owner = readJsonFile<Record<string, unknown>>(ownerPath);
      if (owner.run_id === runId) rmSync(leasePath, { recursive: true, force: true });
    } catch {
      // A malformed foreign lease is not ours to remove.
    }
  }
}

export async function prepareEstimateSheetPerformanceRun(input: {
  repoRoot?: string;
  planRoot?: string;
  runRoot?: string;
  unit: EstimateUnit;
  profile: FixtureProfile | "artifact-only";
  artifactOnly?: boolean;
  cleanupNotApplicable?: boolean;
  cleanupRequirement?: "REQUIRED";
  admissionPath?: string;
  port?: PortPolicy;
  sourceFingerprint?: SourceFingerprint;
  faultInjector?: (phase: PrepareTransitionFaultPhase) => void;
}): Promise<PreparedRun> {
  const repoRoot = resolve(input.repoRoot ?? process.cwd());
  const planRoot = resolve(input.planRoot ?? defaultPlanRoot(repoRoot));
  const runRootBase = resolve(input.runRoot ?? defaultRunRoot(repoRoot));
  return await withTransitionLock(repoRoot, async () => {
    const planPath = resolve(planRoot, "plan-pack.json");
    const plan = readPlanPack(planRoot);
    const planFileSha256 = sha256File(planPath);
    if (plan.package_status !== "IMPLEMENTATION_READY") throw new Error(`plan package is not implementation-ready: ${plan.package_status ?? "missing"}`);
    if (plan.next_unit !== input.unit) throw new Error(`plan next unit is ${plan.next_unit ?? "none"}, not ${input.unit}`);
    const selectedUnit = plan.units.find((unit) => unit.id === input.unit);
    if (!selectedUnit || selectedUnit.status !== "READY") throw new Error(`${input.unit} must be READY before prepare, got ${selectedUnit?.status ?? "missing"}`);

    const decision = ["UNIT-005", "UNIT-006", "UNIT-007", "UNIT-008", "UNIT-009", "UNIT-010"].includes(input.unit)
      ? readBottleneckDecision(repoRoot, planRoot, plan)
      : undefined;
    const decisionAction = decision && input.unit in decision.branches
      ? decision.branches[input.unit as keyof BottleneckDecisionV1["branches"]].action
      : undefined;
    const contract = resolvePrepareContract({
      unit: input.unit,
      profile: input.profile,
      artifactOnly: input.artifactOnly,
      cleanupNotApplicable: input.cleanupNotApplicable,
      cleanupRequirement: input.cleanupRequirement,
      port: input.port,
      decisionAction,
    });
    const fingerprint = input.sourceFingerprint ?? computeEstimateSheetSourceFingerprint({ repoRoot }).fingerprint as SourceFingerprint;
    const refreezeDraft = process.env.ESTIMATE_PERF_REFREEZE_ADMISSION?.trim() || undefined;
    let admissionKind: "planning" | "refreeze" | "predecessor" | undefined;
    let admissionSourcePath: string | undefined;
    if (input.unit === "UNIT-001") {
      if (refreezeDraft) {
        admissionKind = "refreeze";
        admissionSourcePath = finalizedRefreezeReceiptPath(refreezeDraft);
      } else {
        admissionKind = "planning";
        admissionSourcePath = input.admissionPath ?? process.env.ESTIMATE_PERF_PLANNING_ADMISSION;
      }
      if (!admissionSourcePath) throw new Error("UNIT-001 requires a planning or finalized refreeze admission");
    } else if (["UNIT-005", "UNIT-006", "UNIT-007", "UNIT-008", "UNIT-009", "UNIT-010", "UNIT-011"].includes(input.unit)) {
      if (refreezeDraft) throw new Error(`${input.unit} cannot consume a refreeze admission`);
      admissionKind = "predecessor";
      admissionSourcePath = resolve(repoRoot, `.ai/99_scratch/estimate-sheet-performance/admissions/${input.unit}.json`);
    } else if (input.admissionPath || refreezeDraft) {
      throw new Error(`${input.unit} does not accept an admission dependency`);
    }
    const admission = readAdmission(
      repoRoot,
      planRoot,
      admissionSourcePath,
      input.unit,
      plan,
      planFileSha256,
      fingerprint,
      admissionKind,
    );
    const runId = createRunId();
    const createdAt = nowIso();
    const fixture = contract.namespaceRoles.length > 0
      ? buildEstimatePerformanceFixture("limit", {
        seed: "estimate-sheet-limit-v1",
        traceId: `trace-${input.unit}-${runId}`,
        runId,
        generatedAt: createdAt,
        applicationFingerprint: fingerprint.application.content_sha256,
        producerFingerprint: fingerprint.producer.content_sha256,
      })
      : undefined;
    const fixtureHash = fixture
      ? sha256Hex(stableStringify(fixturePayloadWithoutLinkage(fixture)))
      : undefined;
    const namespaces = fixtureHash
      ? createPreparedNamespaces(runId, contract.namespaceRoles, fixtureHash)
      : {};
    const applicationShort = fingerprint.application.content_sha256.slice(0, 12);
    const inputShort = sha256Hex(canonicalJson({
      unit: input.unit,
      profile: contract.profile,
      evidenceClass: contract.evidenceClass,
      portPolicy: contract.portPolicy,
      namespaceRoles: contract.namespaceRoles,
    })).slice(0, 12);
    const runKey = `${runId}-${applicationShort}-${inputShort}`;
    const unitRoot = resolve(runRootBase, input.unit);
    const runPath = resolve(unitRoot, runKey);
    const immutableRunRootBase = input.planRoot
      ? resolve(planRoot, "evidence/runtime/runs")
      : defaultImmutableRunRoot(repoRoot);
    const immutableRunRoot = resolve(immutableRunRootBase, input.unit, runKey);
    const pointerPath = resolve(runPath, "run-pointer.json");
    const runManifestPath = resolve(runPath, "run-manifest.json");
    const immutableAdmissionPath = resolve(runPath, "dependencies/admission.json");
    const prepareRecoveryPath = resolve(runPath, "prepare-recovery.json");
    const immutableRunManifestPath = resolve(immutableRunRoot, "run-manifest.json");
    const resolvedPreviousRunId = plan.runtime_evidence.latest_unit_id === input.unit
      && typeof plan.runtime_evidence.latest_run_id === "string"
      ? plan.runtime_evidence.latest_run_id
      : undefined;
    const transitioned = deriveEstimateSheetPrepareTransition(plan, { unitId: input.unit, runId, updatedAt: createdAt });
    const oldPlanBytes = readFileSync(planPath);
    if (sha256Hex(oldPlanBytes) !== planFileSha256) throw new Error("plan manifest changed before prepare journal publication");
    const newPlanBytes = Buffer.from(`${JSON.stringify(transitioned, null, 2)}\n`, "utf8");
    const unitLeasePath = resolve(runRootBase, "..", "leases", "units", input.unit);
    const unitLeaseStagingPath = resolve(dirname(unitLeasePath), `.${input.unit}-${runId}.staging`);
    const initialJournal: PrepareTransitionJournal = {
      schema_version: "estimate-sheet-prepare-transition-journal.v1",
      state: "ALLOCATED",
      unit_id: input.unit,
      run_id: runId,
      plan_path: pathRelativeToRepo(repoRoot, planPath, "prepare plan path"),
      run_root: pathRelativeToRepo(repoRoot, runPath, "prepare run root"),
      immutable_run_root: pathRelativeToRepo(repoRoot, immutableRunRoot, "prepare immutable run root"),
      unit_lease_path: pathRelativeToRepo(repoRoot, unitLeasePath, "prepare unit lease"),
      unit_lease_staging_path: pathRelativeToRepo(repoRoot, unitLeaseStagingPath, "prepare staged unit lease"),
      old_plan_sha256: planFileSha256,
      old_plan_bytes_base64: oldPlanBytes.toString("base64"),
      new_plan_sha256: sha256Hex(newPlanBytes),
      new_plan_bytes_base64: newPlanBytes.toString("base64"),
      durable_files: [],
      created_at: createdAt,
    };
    writeJsonNoOverwrite(canonicalTransitionJournalPath(repoRoot), initialJournal, 0o600);
    input.faultInjector?.("ALLOCATION_JOURNALED");
    try {
      claimUnitLease(unitLeasePath, unitLeaseStagingPath, input.unit, runId, runPath, resolvedPreviousRunId);
      const preparedResources = await prepareResources({
        repoRoot,
        runRootBase,
        runPath,
        runId,
        createdAt,
        unit: input.unit,
        contract,
        fixture,
        fixtureHash,
        namespaces,
        decision,
        unitLeasePath,
      });
      const primaryRole = contract.namespaceRoles[0];
      const primaryNamespace = primaryRole ? namespaces[primaryRole] : undefined;
      const run: ExtendedRunManifest = {
        schema_version: "estimate-sheet-performance-run.v1",
        package_id: plan.package_id ?? "PLAN-2026-07-08-project-estimate-sheet-performance",
        unit_id: input.unit,
        run_id: runId,
        profile: contract.profile,
        evidence_class: contract.evidenceClass,
        cleanupRequirement: contract.cleanupRequirement,
        run_root: runPath,
        immutable_run_root: immutableRunRoot,
        pointer_path: pointerPath,
        logical_outputs: { ...ESTIMATE_LOGICAL_OUTPUTS },
        created_at: createdAt,
        status: "PREPARED",
        sourceFingerprint: fingerprint,
        applicationFingerprint: fingerprint.application,
        producerFingerprint: fingerprint.producer,
        ...(admission ? {
          admissionKind: admission.kind,
          admissionPath: "dependencies/admission.json",
          admissionSha256: admission.sha256,
          inputApplicationFingerprint: admission.inputApplicationFingerprint,
          inputProducerFingerprint: admission.inputProducerFingerprint,
        } : {}),
        ...(primaryNamespace ? {
          fixture: {
            profile: "limit",
            namespaceIdSha256: primaryNamespace.idSha256,
            preStateSha256: primaryNamespace.preStateSha256,
          },
        } : {}),
        namespaces,
        mutationJournal: [],
        previewProcesses: [],
        ...(preparedResources.leasedPort !== undefined ? {
          leasedPort: preparedResources.leasedPort,
          port: preparedResources.leasedPort,
        } : {}),
        ...(preparedResources.runtimeEnv ? {
          runtimeEnv: preparedResources.runtimeEnv,
          runtimeEnvSha256: preparedResources.runtimeEnvSha256,
        } : {}),
        ...(preparedResources.storageState ? {
          storageState: preparedResources.storageState,
          storageStateSha256: preparedResources.storageStateSha256,
          storageStateExpiresAt: preparedResources.storageStateExpiresAt,
        } : {}),
        ...(preparedResources.processJournal ? { processJournal: preparedResources.processJournal } : {}),
        ...(preparedResources.routePath ? {
          routePath: preparedResources.routePath,
          route: preparedResources.route,
        } : {}),
        ...(preparedResources.fixtureHash ? { fixture_hash: preparedResources.fixtureHash } : {}),
        ...(preparedResources.authFixtureHash ? { auth_fixture_hash: preparedResources.authFixtureHash } : {}),
        ...(preparedResources.activatedModes?.length ? { activatedModes: preparedResources.activatedModes } : {}),
        ...(preparedResources.wranglerState ? { wranglerState: preparedResources.wranglerState } : {}),
        ...(preparedResources.resources ? { resources: preparedResources.resources } : {}),
      };
      assertRunManifest(run);
      const pointer = {
        schema_version: "estimate-sheet-performance-run-pointer.v1",
        unit_id: input.unit,
        run_id: runId,
        run_root: runPath,
        immutable_run_root: immutableRunRoot,
        run_manifest: "run-manifest.json",
        logical_outputs: { ...ESTIMATE_LOGICAL_OUTPUTS },
        cleanupRequirement: contract.cleanupRequirement,
        application_fingerprint: fingerprint.application.content_sha256,
        producer_fingerprint: fingerprint.producer.content_sha256,
      };
      const recoveryDescriptor = {
        schema_version: "estimate-sheet-prepare-recovery.v1",
        unit_id: input.unit,
        run_id: runId,
        run_root: runPath,
        immutable_run_root: immutableRunRoot,
        unit_lease_path: unitLeasePath,
        created_at: createdAt,
      };

      const runBytes = Buffer.from(`${JSON.stringify(run, null, 2)}\n`, "utf8");
      const pointerBytes = Buffer.from(`${JSON.stringify(pointer, null, 2)}\n`, "utf8");
      const recoveryBytes = Buffer.from(`${JSON.stringify(recoveryDescriptor, null, 2)}\n`, "utf8");
      const sequence = transitioned.runtime_evidence.transition_sequence;
      const transitionRecord = {
        schema_version: "estimate-sheet-plan-transition-journal.v1",
        transition: "PREPARE",
        unit_id: input.unit,
        run_id: runId,
        sequence,
        old_manifest_sha256: planFileSha256,
        new_manifest_sha256: sha256Hex(newPlanBytes),
        old_manifest_bytes_base64: oldPlanBytes.toString("base64"),
        new_manifest_bytes_base64: newPlanBytes.toString("base64"),
        created_at: createdAt,
      };
      const transitionBytes = Buffer.from(`${canonicalJson(transitionRecord)}\n`, "utf8");
      const transitionPath = resolve(runPath, "transitions", `${String(sequence).padStart(4, "0")}-prepare.json`);
      const durableSources = [
        ...(admission ? [{ path: immutableAdmissionPath, bytes: admission.bytes }] : []),
        { path: runManifestPath, bytes: runBytes },
        { path: pointerPath, bytes: pointerBytes },
        { path: prepareRecoveryPath, bytes: recoveryBytes },
        { path: immutableRunManifestPath, bytes: runBytes },
        { path: transitionPath, bytes: transitionBytes },
      ];
      if (new Set(durableSources.map((source) => source.path)).size !== durableSources.length) {
        throw new Error("prepare durable paths must be unique");
      }
      for (const source of durableSources) {
        pathRelativeToRepo(repoRoot, source.path, "prepare durable file");
        if (existsSync(source.path)) throw new Error(`immutable prepare output already exists: ${source.path}`);
      }

      let currentJournal: PrepareTransitionJournal = {
        ...initialJournal,
        state: "FILES_DECLARED",
        durable_files: durableSources.map((source) => ({
          path: pathRelativeToRepo(repoRoot, source.path, "prepare durable file"),
          sha256: sha256Hex(source.bytes),
        })),
      };
      replacePrepareTransitionJournal(repoRoot, initialJournal, currentJournal);
      input.faultInjector?.("JOURNAL_PREPARED");

      for (const source of durableSources) {
        writeNoOverwrite(source.path, source.bytes, 0o600);
        if (sha256File(source.path) !== sha256Hex(source.bytes)) {
          throw new Error(`prepare durable file readback mismatch: ${source.path}`);
        }
      }
      input.faultInjector?.("IMMUTABLE_WRITTEN");

      const filesWrittenJournal: PrepareTransitionJournal = { ...currentJournal, state: "FILES_WRITTEN" };
      replacePrepareTransitionJournal(repoRoot, currentJournal, filesWrittenJournal);
      currentJournal = filesWrittenJournal;
      input.faultInjector?.("PROJECTION_WRITTEN");

      replaceFileAtomically(planPath, newPlanBytes, planFileSha256, 0o644);
      const committedJournal: PrepareTransitionJournal = { ...currentJournal, state: "COMMITTED" };
      replacePrepareTransitionJournal(repoRoot, currentJournal, committedJournal);
      currentJournal = committedJournal;
      input.faultInjector?.("MANIFEST_COMMITTED");

      if (sha256File(planPath) !== currentJournal.new_plan_sha256) throw new Error("prepare plan readback mismatch");
      for (const source of durableSources) {
        if (sha256File(source.path) !== sha256Hex(source.bytes)) {
          throw new Error(`prepare durable file readback mismatch: ${source.path}`);
        }
      }
      removeFileDurably(canonicalTransitionJournalPath(repoRoot));
      return { run, runManifestPath, pointerPath };
    } catch (error) {
      if (!existsSync(canonicalTransitionJournalPath(repoRoot))) {
        rmSync(runPath, { recursive: true, force: true });
        rmSync(unitLeasePath, { recursive: true, force: true });
        releaseRunPortLeases(runRootBase, runId);
      }
      throw error;
    }
  });
}

export async function main(argv = process.argv.slice(2)): Promise<number> {
  const options = parsePrepareCli(argv);
  if (!options) {
    console.log("Usage: bun run scripts/prepare-estimate-sheet-performance-run.ts --unit=UNIT-002 --profile=limit --port=auto");
    return 0;
  }
  if ("recover" in options) {
    process.stdout.write(`${JSON.stringify(recoverEstimateSheetPrepareTransition(), null, 2)}\n`);
    return 0;
  }
  const prepared = await prepareEstimateSheetPerformanceRun(options);
  process.stdout.write(`${JSON.stringify({ run_id: prepared.run.run_id, run_root: prepared.run.run_root, run_manifest: prepared.runManifestPath, pointer: prepared.pointerPath, application_fingerprint: prepared.run.applicationFingerprint.content_sha256, producer_fingerprint: prepared.run.producerFingerprint.content_sha256 }, null, 2)}\n`);
  return 0;
}

if (import.meta.main) {
  main()
    .then((code) => { process.exitCode = code; })
    .catch((error) => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
}
