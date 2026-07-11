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
  rmSync,
  unlinkSync,
} from "node:fs";
import { createServer } from "node:net";
import { basename, dirname, relative, resolve, sep } from "node:path";

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
  PREPARE_INPUT_SCHEMA,
  assertRegularFile,
  assertRunManifest,
  assertTestReceipt,
  canonicalJson,
  cliBoolean,
  cliString,
  createRunId,
  defaultImmutableRunRoot,
  defaultPlanRoot,
  defaultRunRoot,
  ensureDirectoryDurably,
  fingerprintContentEqual,
  isContained,
  isPlainObject,
  isSafeRelativePath,
  nowIso,
  parseStrictCli,
  readAuthoritativeRunManifest,
  readPrecommitRunManifestPair,
  readJsonFile,
  replaceFileAtomically,
  requireUnit,
  runtimeEnvironmentStableSha256,
  sha256File,
  sha256Hex,
  sha256Json,
  validateFingerprintContent,
  writeNoOverwrite,
  writeJsonNoOverwrite,
  type EstimateUnit,
  type FingerprintContent,
  type FixtureProfile,
  type PrepareDecisionBindingV1,
  type PrepareInputV1,
  type PreparePredecessorBindingV1,
  type RunManifestV1,
  type SourceFingerprint,
} from "./lib/estimate-sheet-performance-contract";
import {
  deriveEstimateSheetPrepareTransition,
  deriveEstimateSheetPrepareRetryTransition,
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
  openLocalD1ReadOnlyReader,
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
  "retry-in-progress",
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
  retryInProgress?: boolean;
};

export type PrepareCliOperation = PrepareCliInput | { recover: true };

type FixtureIds = {
  user: string;
  session: string;
  revokedUser: string;
  revokedSession: string;
  revokedProfile: string;
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

export type MigrationInventoryRecord = {
  name: string;
  sha256: string;
  statement_count: number;
};

type PreparedResources = {
  leasedPort?: number;
  unitLeasePath: string;
  portLeasePath?: string;
  runtimeEnv?: string;
  runtimeEnvSha256?: string;
  runtimeEnvStableSha256?: string;
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
  runtimeEnvStableSha256?: string;
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
    ...(cliBoolean(values, "retry-in-progress") ? { retryInProgress: true } : {}),
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
  const indexBytes = readFileSync(indexPath);
  if (typeof predecessor.index_sha256 !== "string" || sha256Hex(indexBytes) !== predecessor.index_sha256) {
    throw new Error("predecessor evidence index hash mismatch");
  }
  const evidencePath = resolveImmutableAdmissionBinding(
    input.planRoot,
    predecessor.evidence_immutable_path,
    "predecessor primary evidence",
  );
  const evidenceBytes = readFileSync(evidencePath);
  if (typeof predecessor.evidence_sha256 !== "string" || sha256Hex(evidenceBytes) !== predecessor.evidence_sha256) {
    throw new Error("predecessor primary evidence hash mismatch");
  }
  let index: Record<string, unknown>;
  let output: Record<string, unknown>;
  try {
    const parsedIndex: unknown = JSON.parse(indexBytes.toString("utf8"));
    const parsedOutput: unknown = JSON.parse(evidenceBytes.toString("utf8"));
    if (!isPlainObject(parsedIndex) || !isPlainObject(parsedOutput)) throw new Error("not an object");
    index = parsedIndex;
    output = parsedOutput;
  } catch {
    throw new Error("predecessor immutable lineage contains invalid JSON");
  }
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

type AdmissionDependency = {
  sha256: string;
  bytes: Buffer;
  kind: "planning" | "refreeze" | "predecessor";
  inputApplicationFingerprint: FingerprintContent;
  inputProducerFingerprint: FingerprintContent;
  decision: PrepareDecisionBindingV1 | null;
  predecessor: PreparePredecessorBindingV1 | null;
};

function normalizePrepareDecisionBinding(value: unknown): PrepareDecisionBindingV1 {
  if (!isPlainObject(value)
    || canonicalJson(Object.keys(value).sort()) !== canonicalJson(["immutable_path", "sha256"])
    || !isSafeRelativePath(value.immutable_path)
    || !value.immutable_path.startsWith("evidence/runtime/runs/")
    || typeof value.sha256 !== "string"
    || !/^[0-9a-f]{64}$/u.test(value.sha256)) {
    throw new Error("prepare decision binding is invalid");
  }
  return { immutable_path: value.immutable_path, sha256: value.sha256 };
}

function normalizePreparePredecessorBinding(value: unknown): PreparePredecessorBindingV1 {
  const expectedFields = [
    "application_fingerprint", "evidence_immutable_path", "evidence_sha256", "index_immutable_path",
    "index_sha256", "producer_fingerprint", "run_id", "unit_id",
  ].sort();
  if (!isPlainObject(value)
    || canonicalJson(Object.keys(value).sort()) !== canonicalJson(expectedFields)
    || !/^UNIT-\d{3}$/u.test(String(value.unit_id))
    || typeof value.run_id !== "string"
    || !value.run_id) {
    throw new Error("prepare predecessor binding is invalid");
  }
  for (const pathKey of ["index_immutable_path", "evidence_immutable_path"] as const) {
    if (!isSafeRelativePath(value[pathKey]) || !value[pathKey].startsWith("evidence/runtime/runs/")) {
      throw new Error(`prepare predecessor ${pathKey} is invalid`);
    }
  }
  for (const hashKey of ["index_sha256", "evidence_sha256"] as const) {
    if (typeof value[hashKey] !== "string" || !/^[0-9a-f]{64}$/u.test(value[hashKey])) {
      throw new Error(`prepare predecessor ${hashKey} is invalid`);
    }
  }
  return {
    unit_id: value.unit_id as EstimateUnit,
    run_id: value.run_id,
    index_immutable_path: value.index_immutable_path,
    index_sha256: value.index_sha256,
    evidence_immutable_path: value.evidence_immutable_path,
    evidence_sha256: value.evidence_sha256,
    application_fingerprint: requireFingerprintContent(value.application_fingerprint, "prepare predecessor application fingerprint"),
    producer_fingerprint: requireFingerprintContent(value.producer_fingerprint, "prepare predecessor producer fingerprint"),
  };
}

export function readKnownPlanPredecessor(
  planRoot: string,
  plan: EstimateSheetPlanManifest,
  unit: EstimateUnit,
): PreparePredecessorBindingV1 | null {
  if (!["UNIT-002", "UNIT-003", "UNIT-004"].includes(unit)) return null;
  const expectedUnit = `UNIT-${String(Number(unit.slice(-3)) - 1).padStart(3, "0")}` as EstimateUnit;
  const registry = plan.runtime_evidence.registry;
  if (plan.runtime_evidence.latest_unit_id !== expectedUnit
    || typeof plan.runtime_evidence.latest_run_id !== "string"
    || !plan.runtime_evidence.latest_run_id
    || typeof registry.immutable_path !== "string"
    || !registry.immutable_path
    || typeof registry.sha256 !== "string") {
    throw new Error(`${unit} allocation requires the current ${expectedUnit} immutable predecessor`);
  }
  const indexPath = resolveImmutableAdmissionBinding(planRoot, registry.immutable_path, "allocation predecessor index");
  const indexBytes = readFileSync(indexPath);
  if (sha256Hex(indexBytes) !== registry.sha256) throw new Error("allocation predecessor index hash mismatch");
  let index: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(indexBytes.toString("utf8"));
    if (!isPlainObject(parsed)) throw new Error("not an object");
    index = parsed;
  } catch {
    throw new Error("allocation predecessor index is not valid JSON");
  }
  const evidence = Array.isArray(index.evidence) ? index.evidence : [];
  const primary = evidence.length === 1 && isPlainObject(evidence[0]) ? evidence[0] : null;
  if (index.schema_version !== "estimate-sheet-evidence-index.v1"
    || index.unit_id !== expectedUnit
    || index.run_id !== plan.runtime_evidence.latest_run_id
    || !primary
    || typeof primary.immutable_path !== "string"
    || typeof primary.sha256 !== "string") {
    throw new Error("allocation predecessor index does not expose one immutable primary output");
  }
  const evidencePath = resolveImmutableAdmissionBinding(planRoot, primary.immutable_path, "allocation predecessor evidence");
  const evidenceBytes = readFileSync(evidencePath);
  if (sha256Hex(evidenceBytes) !== primary.sha256) throw new Error("allocation predecessor evidence hash mismatch");
  let output: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(evidenceBytes.toString("utf8"));
    if (!isPlainObject(parsed)) throw new Error("not an object");
    output = parsed;
  } catch {
    throw new Error("allocation predecessor evidence is not valid JSON");
  }
  const predecessor = normalizePreparePredecessorBinding({
    unit_id: expectedUnit,
    run_id: plan.runtime_evidence.latest_run_id,
    index_immutable_path: registry.immutable_path,
    index_sha256: registry.sha256,
    evidence_immutable_path: primary.immutable_path,
    evidence_sha256: primary.sha256,
    application_fingerprint: output.applicationFingerprint ?? output.application_fingerprint,
    producer_fingerprint: output.producerFingerprint ?? output.producer_fingerprint,
  });
  assertPredecessorImmutableLineage({ admission: { predecessor }, planRoot });
  return predecessor;
}

function assertRefreezeFocusedTestReceipt(repoRoot: string, admission: Record<string, unknown>): void {
  const binding = admission.focused_test_receipt;
  if (!isPlainObject(binding)
    || canonicalJson(Object.keys(binding).sort()) !== canonicalJson(["path", "run_id", "sha256"])
    || !isSafeRelativePath(binding.path)
    || typeof binding.sha256 !== "string"
    || !/^[0-9a-f]{64}$/u.test(binding.sha256)
    || typeof binding.run_id !== "string"
    || !binding.run_id
    || !binding.path.endsWith("/receipts/refreeze-tests.json")) {
    throw new Error("refreeze focused test receipt binding is invalid");
  }
  const receiptPath = resolve(repoRoot, binding.path);
  if (!isContained(repoRoot, receiptPath)) throw new Error("refreeze focused test receipt escapes the repository");
  assertRegularFile(receiptPath, "refreeze focused test receipt");
  const receiptBytes = readFileSync(receiptPath);
  if (sha256Hex(receiptBytes) !== binding.sha256) throw new Error("refreeze focused test receipt hash mismatch");
  let receipt: unknown;
  try {
    receipt = JSON.parse(receiptBytes.toString("utf8"));
  } catch {
    throw new Error("refreeze focused test receipt is not valid JSON");
  }
  assertTestReceipt(receipt);
  if (receipt.test_class !== "vitest"
    || receipt.unit_id !== "UNIT-002"
    || receipt.run_id !== binding.run_id
    || receipt.overall !== "PASS"
    || receipt.failed !== 0
    || receipt.passed < 1
    || receipt.workers !== 1
    || receipt.retries !== 0) {
    throw new Error("refreeze focused test receipt is not the admitted passing UNIT-002 run");
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
  allowPlanningRetry = false,
): AdmissionDependency | undefined {
  if (!path) return undefined;
  const admissionPath = resolve(repoRoot, path);
  if (!isContained(repoRoot, admissionPath)) throw new Error("admission path escapes the repository");
  assertRegularFile(admissionPath, "admission");
  const bytes = readFileSync(admissionPath);
  let admission: Record<string, unknown>;
  try {
    const value = JSON.parse(bytes.toString("utf8"));
    if (!isPlainObject(value)) throw new Error("not an object");
    admission = value;
  } catch {
    throw new Error("admission is not valid JSON");
  }
  const withoutAdmissionHash = structuredClone(admission);
  const admissionPayloadSha256 = withoutAdmissionHash.payload_sha256;
  delete withoutAdmissionHash.payload_sha256;
  if (admissionPayloadSha256 !== sha256Json(withoutAdmissionHash)) throw new Error("admission payload hash mismatch");

  let inputApplicationFingerprint: FingerprintContent;
  let inputProducerFingerprint: FingerprintContent;
  let decision: PrepareDecisionBindingV1 | null = null;
  let predecessor: PreparePredecessorBindingV1 | null = null;
  if (kind === "planning") {
    if (admission.schema_version !== "estimate-sheet-planning-admission.v1") throw new Error("planning admission schema is invalid");
    if (admission.unit_id !== unit || unit !== "UNIT-001" || admission.package_status !== "IMPLEMENTATION_READY" || admission.next_unit !== unit) throw new Error("planning admission does not admit UNIT-001");
    if (!allowPlanningRetry && (admission.package_id !== plan.package_id || admission.implementation_status !== plan.implementation_status)) throw new Error("planning admission package tuple mismatch");
    const planBinding = admission.plan_pack;
    if (!isPlainObject(planBinding) || (!allowPlanningRetry && (planBinding.file_sha256 !== planFileSha256 || planBinding.manifest_sha256 !== plan.manifest_sha256))) {
      throw new Error("planning admission plan binding mismatch");
    }
    const candidate = admission.review_candidate;
    if (!isPlainObject(candidate) || typeof candidate.candidate_sha256 !== "string") throw new Error("planning admission review candidate is invalid");
    const withoutCandidateHash = structuredClone(candidate);
    delete withoutCandidateHash.candidate_sha256;
    if (candidate.candidate_sha256 !== sha256Json(withoutCandidateHash)) throw new Error("planning admission candidate hash mismatch");
    if (!isPlainObject(candidate.promotion_plan_pack)
      || (!allowPlanningRetry && (candidate.promotion_plan_pack.file_sha256 !== planFileSha256
        || candidate.promotion_plan_pack.manifest_sha256 !== plan.manifest_sha256
        || candidate.artifact_registry_sha256 !== sha256Json(plan.artifacts)))) {
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
    const predecessorValue = admission.predecessor;
    if (!isPlainObject(predecessorValue)
      || predecessorValue.unit_id !== "UNIT-001"
      || predecessorValue.index_immutable_path !== plan.runtime_evidence.registry.immutable_path
      || predecessorValue.index_sha256 !== plan.runtime_evidence.registry.sha256) {
      throw new Error("refreeze receipt predecessor binding mismatch");
    }
    predecessor = normalizePreparePredecessorBinding(predecessorValue);
    assertPredecessorImmutableLineage({ admission, planRoot });
    inputApplicationFingerprint = requireFingerprintContent(
      admission.input_application_fingerprint,
      "refreeze input application fingerprint",
    );
    inputProducerFingerprint = requireFingerprintContent(
      admission.input_producer_fingerprint,
      "refreeze input producer fingerprint",
    );
    if (!fingerprintContentEqual(inputApplicationFingerprint, predecessor.application_fingerprint)
      || !fingerprintContentEqual(inputProducerFingerprint, predecessor.producer_fingerprint)) {
      throw new Error("refreeze input fingerprints do not match immutable predecessor output");
    }
    assertRefreezeFocusedTestReceipt(repoRoot, admission);
  } else if (kind === "predecessor") {
    if (admission.schema_version !== "estimate-sheet-predecessor-admission.v1" || admission.unit_id !== unit) {
      throw new Error("predecessor admission does not admit the selected unit");
    }
    const predecessorValue = admission.predecessor;
    const decisionValue = admission.decision;
    const decisionRow = plan.runtime_evidence.projections.find((row) => row.artifact_id === "ART-043");
    if (!isPlainObject(predecessorValue)
      || predecessorValue.unit_id !== plan.runtime_evidence.latest_unit_id
      || predecessorValue.run_id !== plan.runtime_evidence.latest_run_id
      || predecessorValue.index_immutable_path !== plan.runtime_evidence.registry.immutable_path
      || predecessorValue.index_sha256 !== plan.runtime_evidence.registry.sha256
      || !isPlainObject(decisionValue)
      || decisionValue.immutable_path !== decisionRow?.immutable_path
      || decisionValue.sha256 !== decisionRow?.sha256) {
      throw new Error("predecessor admission immutable bindings are stale");
    }
    assertPredecessorImmutableLineage({ admission, planRoot });
    if (typeof decisionValue.immutable_path !== "string" || typeof decisionValue.sha256 !== "string") {
      throw new Error("predecessor admission decision binding is invalid");
    }
    const decisionPath = resolveImmutableAdmissionBinding(planRoot, decisionValue.immutable_path, "bottleneck decision");
    if (sha256File(decisionPath) !== decisionValue.sha256) throw new Error("bottleneck decision hash mismatch");
    const closed = assertClosedPredecessorAdmissionLineage({
      admission,
      currentFingerprint,
      currentScopeRecords: computeEstimateSheetScopeFileRecords(repoRoot),
    });
    inputApplicationFingerprint = closed.inputApplicationFingerprint;
    inputProducerFingerprint = closed.inputProducerFingerprint;
    predecessor = normalizePreparePredecessorBinding(admission.predecessor);
    decision = normalizePrepareDecisionBinding(admission.decision);
  } else {
    throw new Error("admission kind is required when an admission path is provided");
  }
  return {
    sha256: sha256Hex(bytes),
    bytes,
    kind,
    inputApplicationFingerprint,
    inputProducerFingerprint,
    decision,
    predecessor,
  };
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

type TransitionLockHandle = {
  path: string;
  ownerId: string;
};

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return isPlainObject(error) && error.code === "EPERM";
  }
}

function transitionLockPath(repoRoot: string): string {
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
  const parentFd = openSync(dirname(handle.path), "r");
  try { fsyncSync(parentFd); } finally { closeSync(parentFd); }
}

function acquireTransitionLock(
  repoRoot: string,
  operation: "PREPARE" | "PREPARE_RECOVERY",
  allowDeadOwnerTakeover: boolean,
): TransitionLockHandle {
  const lockPath = transitionLockPath(repoRoot);
  const lockParent = dirname(lockPath);
  ensureDirectoryDurably(lockParent, 0o700, repoRoot);
  let stalePath: string | undefined;
  try {
    mkdirSync(lockPath, { mode: 0o700 });
    const lockParentFd = openSync(lockParent, "r");
    try { fsyncSync(lockParentFd); } finally { closeSync(lockParentFd); }
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
    const parentFd = openSync(lockParent, "r");
    try { fsyncSync(parentFd); } finally { closeSync(parentFd); }
    mkdirSync(lockPath, { mode: 0o700 });
    const replacementParentFd = openSync(lockParent, "r");
    try { fsyncSync(replacementParentFd); } finally { closeSync(replacementParentFd); }
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
      const parentFd = openSync(lockParent, "r");
      try { fsyncSync(parentFd); } finally { closeSync(parentFd); }
    }
    return { path: lockPath, ownerId };
  } catch (error) {
    if (existsSync(lockPath)) {
      const ownerPath = resolve(lockPath, "owner.json");
      if (!existsSync(ownerPath)) rmSync(lockPath, { recursive: true, force: false });
    }
    throw error;
  }
}

async function withTransitionLock<T>(repoRoot: string, operation: () => Promise<T>): Promise<T> {
  assertNoGlobalTransitionJournal(repoRoot);
  const lock = acquireTransitionLock(repoRoot, "PREPARE", false);
  try {
    assertNoGlobalTransitionJournal(repoRoot);
    return await operation();
  } finally {
    removeOwnedTransitionLock(lock);
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
  const hasFinalPlan = journal.new_plan_sha256 !== journal.old_plan_sha256;
  if (journal.state === "ALLOCATED") {
    if (hasFinalPlan
      || journal.new_plan_bytes_base64 !== journal.old_plan_bytes_base64
      || journal.durable_files.length !== 0) {
      throw new Error("allocated prepare journal cannot declare final plan bytes or durable files");
    }
  } else if (!hasFinalPlan || journal.durable_files.length === 0) {
    throw new Error("prepared transition journal must bind distinct final plan bytes and durable files");
  }
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
  const runKey = basename(runPath);
  const runSuffix = runKey.slice(journal.run_id.length + 1);
  const immutableRunRoot = resolvePrepareJournalPath(repoRoot, journal.immutable_run_root, "prepare immutable run root");
  const expectedRunPath = resolve(defaultRunRoot(repoRoot), journal.unit_id, runKey);
  const expectedImmutableRunRoot = resolve(defaultImmutableRunRoot(repoRoot), journal.unit_id, runKey);
  const expectedUnitLeasePath = resolve(defaultRunRoot(repoRoot), "..", "leases", "units", journal.unit_id);
  const expectedUnitLeaseStagingPath = resolve(
    dirname(expectedUnitLeasePath),
    `.${journal.unit_id}-${journal.run_id}.staging`,
  );
  if (basename(unitRoot) !== journal.unit_id
    || runPath !== expectedRunPath
    || immutableRunRoot !== expectedImmutableRunRoot
    || !runKey.startsWith(`${journal.run_id}-`)
    || !/^[0-9a-f]{12}-[0-9a-f]{12}$/u.test(runSuffix)) {
    throw new Error("prepare journal run roots are not canonical for their unit/run key");
  }
  const unitLeasePath = resolvePrepareJournalPath(repoRoot, journal.unit_lease_path, "prepare unit lease");
  const unitLeaseStagingPath = resolvePrepareJournalPath(repoRoot, journal.unit_lease_staging_path, "prepare staged unit lease");
  if (unitLeasePath !== expectedUnitLeasePath || unitLeaseStagingPath !== expectedUnitLeaseStagingPath) {
    throw new Error("prepare journal lease paths are not canonical for their unit/run key");
  }
  return {
    unit: journal.unit_id,
    runId: journal.run_id,
    runPath,
    immutableRunRoot,
    runRootBase,
    unitLeasePath,
    unitLeaseStagingPath,
  };
}

function assertPrepareJournalOwnership(
  repoRoot: string,
  journal: PrepareTransitionJournal,
  candidate: PrepareRecoveryCandidate,
): void {
  for (const entry of journal.durable_files) {
    const path = resolvePrepareJournalPath(repoRoot, entry.path, "prepare durable file");
    if (path === candidate.runPath || path === candidate.immutableRunRoot
      || (!isContained(candidate.runPath, path) && !isContained(candidate.immutableRunRoot, path))) {
      throw new Error(`prepare durable file is outside its owned run roots: ${entry.path}`);
    }
    if (path.endsWith(`${sep}dependencies${sep}admission.json`)
      && path !== resolve(candidate.immutableRunRoot, "dependencies/admission.json")) {
      throw new Error("prepare admission dependency is not owned by the immutable run root");
    }
  }
}

function releaseOwnedUnitLease(candidate: PrepareRecoveryCandidate): void {
  if (existsSync(candidate.unitLeaseStagingPath)) {
    const stagingOwnerPath = resolve(candidate.unitLeaseStagingPath, "owner.json");
    assertRegularFile(stagingOwnerPath, "staged prepare unit lease owner");
    const stagingOwner = readJsonFile<Record<string, unknown>>(stagingOwnerPath);
    if (stagingOwner.schema_version !== "estimate-sheet-unit-lease.v1"
      || stagingOwner.unit_id !== candidate.unit
      || stagingOwner.run_id !== candidate.runId
      || stagingOwner.run_root !== candidate.runPath) {
      throw new Error("staged prepare unit lease is not owned by the journaled run");
    }
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
    throw new Error("prepare unit lease is not owned by the journaled run");
  }
  removeOwnedDirectoryDurably(candidate.unitLeasePath, "prepare unit lease");
}

function recoverPrepareJournal(repoRoot: string): { result: "ROLLED_BACK" | "COMMITTED"; unit_id: string; run_id: string } {
  const lock = acquireTransitionLock(repoRoot, "PREPARE_RECOVERY", true);
  try {
    const journal = readPrepareTransitionJournal(repoRoot);
    const candidate = prepareRecoveryCandidate(repoRoot, journal);
    assertPrepareJournalOwnership(repoRoot, journal, candidate);
    const planPath = resolvePrepareJournalPath(repoRoot, journal.plan_path, "prepare plan path");
    assertRegularFile(planPath, "prepare plan manifest");
    const planSha256 = sha256File(planPath);
    const hasFinalPlan = journal.new_plan_sha256 !== journal.old_plan_sha256;
    const committed = hasFinalPlan && planSha256 === journal.new_plan_sha256;
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
      readAuthoritativeRunManifest(
        repoRoot,
        resolve(candidate.runPath, "run-manifest.json"),
        candidate.unit,
      );
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
    releaseRunPortLeases(repoRoot, candidate.runRootBase, candidate.unit, candidate.runId, candidate.runPath);
    removeFileDurably(canonicalTransitionJournalPath(repoRoot));
    return { result: "ROLLED_BACK", unit_id: journal.unit_id, run_id: journal.run_id };
  } finally {
    removeOwnedTransitionLock(lock);
  }
}

export function recoverEstimateSheetPrepareTransition(input: {
  repoRoot?: string;
} = {}): { result: "NO_JOURNAL" | "ROLLED_BACK" | "COMMITTED"; unit_id?: string; run_id?: string } {
  const repoRoot = resolve(input.repoRoot ?? process.cwd());
  const journalPath = canonicalTransitionJournalPath(repoRoot);
  if (!existsSync(journalPath)) {
    const lock = acquireTransitionLock(repoRoot, "PREPARE_RECOVERY", true);
    removeOwnedTransitionLock(lock);
    return { result: "NO_JOURNAL" };
  }
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
  const revokedIdentity = deterministicUuid(seed, "revoked-auth-user-profile");
  return {
    user,
    session: deterministicUuid(seed, "auth-session"),
    revokedUser: revokedIdentity,
    revokedSession: deterministicUuid(seed, "revoked-auth-session"),
    revokedProfile: revokedIdentity,
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
    profiles: [ids.profile, ids.revokedProfile],
    session: [ids.session, ids.revokedSession],
    user: [ids.user, ids.revokedUser],
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
      `DELETE FROM profiles WHERE id = ${sqlValue(ids.revokedProfile)};`,
      `DELETE FROM \"session\" WHERE id = ${sqlValue(ids.session)};`,
      `DELETE FROM \"session\" WHERE id = ${sqlValue(ids.revokedSession)};`,
      `DELETE FROM \"user\" WHERE id = ${sqlValue(ids.user)};`,
      `DELETE FROM \"user\" WHERE id = ${sqlValue(ids.revokedUser)};`,
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
  const runRootBase = dirname(dirname(runPath));
  if (leasePath !== resolve(runRootBase, "..", "leases", "units", unit)
    || stagingPath !== resolve(dirname(leasePath), `.${unit}-${runId}.staging`)) {
    throw new Error("unit lease paths are not canonical for the prepared run");
  }
  ensureDirectoryDurably(dirname(leasePath), 0o700, dirname(runRootBase));
  if (existsSync(stagingPath)) throw new Error(`unresolved staged unit lease blocks prepare: ${stagingPath}`);
  if (existsSync(leasePath)) {
    let resolved = false;
    try {
      const owner = readJsonFile<Record<string, unknown>>(resolve(leasePath, "owner.json"));
      resolved = typeof resolvedPreviousRunId === "string"
        && owner.schema_version === "estimate-sheet-unit-lease.v1"
        && owner.unit_id === unit
        && owner.run_id === resolvedPreviousRunId;
    } catch {
      // A malformed lease cannot be proven resolved.
    }
    if (!resolved) throw new Error(`unresolved unit lease blocks prepare: ${leasePath}`);
    removeOwnedDirectoryDurably(leasePath, "resolved predecessor unit lease");
  }
  mkdirSync(stagingPath, { mode: 0o700 });
  const stagingParentFd = openSync(dirname(stagingPath), "r");
  try { fsyncSync(stagingParentFd); } finally { closeSync(stagingParentFd); }
  writeJsonNoOverwrite(resolve(stagingPath, "owner.json"), {
    schema_version: "estimate-sheet-unit-lease.v1",
    unit_id: unit,
    run_id: runId,
    run_root: runPath,
    owner_pid: process.pid,
    acquired_at: nowIso(),
  }, 0o600, stagingPath);
  if (existsSync(leasePath)) throw new Error(`unresolved unit lease blocks prepare: ${leasePath}`);
  renameSync(stagingPath, leasePath);
  const leaseParentFd = openSync(dirname(leasePath), "r");
  try { fsyncSync(leaseParentFd); } finally { closeSync(leaseParentFd); }
}

async function claimPortLease(runRootBase: string, unit: EstimateUnit, runId: string, runPath: string): Promise<{ port: number; path: string }> {
  const leaseRoot = resolve(runRootBase, "..", "leases", "ports");
  ensureDirectoryDurably(leaseRoot, 0o700, dirname(runRootBase));
  for (let port = 3101; port <= 3199; port += 1) {
    const path = resolve(leaseRoot, String(port));
    try {
      mkdirSync(path, { mode: 0o700 });
    } catch (error) {
      if (isPlainObject(error) && error.code === "EEXIST") continue;
      throw error;
    }
    const leaseRootFd = openSync(leaseRoot, "r");
    try { fsyncSync(leaseRootFd); } finally { closeSync(leaseRootFd); }
    if (!await isFreeLoopbackPort(port)) {
      const entries = readdirSync(path);
      if (entries.length) throw new Error("unowned port lease directory is not empty");
      rmSync(path, { recursive: false, force: false });
      const cleanupLeaseRootFd = openSync(leaseRoot, "r");
      try { fsyncSync(cleanupLeaseRootFd); } finally { closeSync(cleanupLeaseRootFd); }
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
    }, 0o600, path);
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

function migrationInventory(migrations: readonly MigrationDescriptor[]): MigrationInventoryRecord[] {
  return migrations.map((migration) => ({
    name: migration.name,
    sha256: migration.sha256,
    statement_count: migration.statements.length,
  }));
}

export function assertMigrationInventoryStable(
  before: readonly MigrationInventoryRecord[],
  after: readonly MigrationInventoryRecord[],
): void {
  if (canonicalJson(before) !== canonicalJson(after)) {
    throw new Error("active migration inventory changed during local D1 preparation");
  }
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
  revokedSessionToken: string;
  email: string;
  timestamp: string;
  expiresAt: string;
  role: FixtureRole;
}): string[] {
  const { fixture, ids, sessionToken, revokedSessionToken, email, timestamp, expiresAt, role } = input;
  const nodes = flattenEstimatePerformanceNodes(fixture);
  const nodeIdByFixtureId = new Map(nodes.map((node, index) => [node.id, ids.nodes[index]!]));
  const fixtureNodeIndexes = new Map(nodes.map((node, index) => [node.id, index]));
  const lines = [
    `-- fixture role: ${role}`,
    `INSERT INTO \"user\" (id, name, email, emailVerified, createdAt, updatedAt) VALUES (${sqlValue(ids.user)}, 'Estimate performance user', ${sqlValue(email)}, 1, ${sqlValue(timestamp)}, ${sqlValue(timestamp)});`,
    `INSERT INTO \"user\" (id, name, email, emailVerified, createdAt, updatedAt) VALUES (${sqlValue(ids.revokedUser)}, 'Estimate performance revoked user', ${sqlValue(`revoked-${email}`)}, 1, ${sqlValue(timestamp)}, ${sqlValue(timestamp)});`,
    `INSERT INTO \"session\" (id, expiresAt, token, createdAt, updatedAt, userId) VALUES (${sqlValue(ids.session)}, ${sqlValue(expiresAt)}, ${sqlValue(sessionToken)}, ${sqlValue(timestamp)}, ${sqlValue(timestamp)}, ${sqlValue(ids.user)});`,
    `INSERT INTO \"session\" (id, expiresAt, token, createdAt, updatedAt, userId) VALUES (${sqlValue(ids.revokedSession)}, ${sqlValue(expiresAt)}, ${sqlValue(revokedSessionToken)}, ${sqlValue(timestamp)}, ${sqlValue(timestamp)}, ${sqlValue(ids.revokedUser)});`,
    `INSERT INTO closed_beta_allowed_emails (id, normalized_email, status, invited_at, accepted_at, created_at, updated_at) VALUES (${sqlValue(ids.allowlist)}, ${sqlValue(email)}, 'active', ${sqlValue(timestamp)}, ${sqlValue(timestamp)}, ${sqlValue(timestamp)}, ${sqlValue(timestamp)});`,
    `INSERT INTO legal_terms_acceptances (id, user_id, terms_key, terms_version, terms_effective_date, terms_content_hash, privacy_policy_version, acceptance_method, acceptance_context, accepted_at, created_at) VALUES (${sqlValue(ids.legal)}, ${sqlValue(ids.profile)}, ${sqlValue(CURRENT_TERMS.key)}, ${sqlValue(CURRENT_TERMS.version)}, ${sqlValue(CURRENT_TERMS.effectiveDate)}, ${sqlValue(CURRENT_TERMS.contentHash)}, ${sqlValue(CURRENT_TERMS.privacyPolicyVersion)}, 'authenticated_clickwrap', 'workshop_terms_gate', ${sqlValue(timestamp)}, ${sqlValue(timestamp)});`,
    `INSERT INTO profiles (id, email, display_name, role, default_workspace_id, created_at, updated_at) VALUES (${sqlValue(ids.profile)}, ${sqlValue(email)}, 'Estimate performance profile', 'member', ${sqlValue(ids.workspace)}, ${sqlValue(timestamp)}, ${sqlValue(timestamp)});`,
    `INSERT INTO profiles (id, email, display_name, role, default_workspace_id, created_at, updated_at) VALUES (${sqlValue(ids.revokedProfile)}, ${sqlValue(`revoked-${email}`)}, 'Estimate performance revoked profile', 'member', NULL, ${sqlValue(timestamp)}, ${sqlValue(timestamp)});`,
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

function findPreparedD1DatabasePath(persistRoot: string): string {
  const candidates: string[] = [];
  const visit = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name))) {
      const path = resolve(directory, entry.name);
      const stat = lstatSync(path);
      if (stat.isSymbolicLink()) throw new Error(`Wrangler persistence tree contains a symbolic link: ${path}`);
      if (stat.isDirectory()) {
        visit(path);
      } else if (stat.isFile() && entry.name.endsWith(".sqlite")) {
        candidates.push(path);
      }
    }
  };
  visit(persistRoot);
  if (candidates.length !== 1) {
    throw new Error(`Wrangler persistence root must contain exactly one D1 SQLite database, found ${candidates.length}`);
  }
  return candidates[0]!;
}

async function validatePreparedLocalD1(input: {
  persistRoot: string;
  records: Array<{ ids: FixtureIds; sessionToken: string; revokedSessionToken: string }>;
  migrationInventory: readonly MigrationInventoryRecord[];
}): Promise<void> {
  const reader = await openLocalD1ReadOnlyReader(findPreparedD1DatabasePath(input.persistRoot));
  try {
    const schemaTables = reader.all<{ name: string }>(
      "SELECT name FROM sqlite_schema WHERE type = 'table' AND name IN ('account', 'rateLimit', 'session', 'user', 'verification') ORDER BY name ASC",
    );
    if (canonicalJson(schemaTables.map((row) => row.name)) !== canonicalJson([...EXPECTED_BETTER_AUTH_TABLES].sort())) {
      throw new Error("applied Better Auth D1 table set is incomplete");
    }
    const ledger = reader.all<{ id: number; name: string }>(
      "SELECT id, name FROM d1_migrations ORDER BY id ASC",
    );
    const expectedMigrationNames = input.migrationInventory.map((migration) => migration.name);
    if (canonicalJson(ledger.map((entry) => entry.name)) !== canonicalJson(expectedMigrationNames)
      || ledger.some((entry, index) => Number(entry.id) !== index + 1)) {
      throw new Error("prepared D1 migration ledger does not exactly match the ordered active inventory");
    }

    for (const record of input.records) {
      const { ids, sessionToken, revokedSessionToken } = record;
      const expectedCounts: Array<[string, number, string, Array<string | number>]> = [
        ["user", 1, 'SELECT COUNT(*) AS count FROM "user" WHERE id = ?', [ids.user]],
        ["revoked user", 1, 'SELECT COUNT(*) AS count FROM "user" WHERE id = ?', [ids.revokedUser]],
        ["session", 1, 'SELECT COUNT(*) AS count FROM "session" WHERE id = ? AND token = ? AND userId = ?', [ids.session, sessionToken, ids.user]],
        ["revoked session", 1, 'SELECT COUNT(*) AS count FROM "session" WHERE id = ? AND token = ? AND userId = ?', [ids.revokedSession, revokedSessionToken, ids.revokedUser]],
        ["allowlist", 1, "SELECT COUNT(*) AS count FROM closed_beta_allowed_emails WHERE id = ? AND status = 'active'", [ids.allowlist]],
        ["legal", 1, "SELECT COUNT(*) AS count FROM legal_terms_acceptances WHERE id = ? AND user_id = ? AND terms_version = ?", [ids.legal, ids.profile, CURRENT_TERMS.version]],
        ["profiles", 1, "SELECT COUNT(*) AS count FROM profiles WHERE id = ? AND default_workspace_id = ?", [ids.profile, ids.workspace]],
        ["revoked profile", 1, "SELECT COUNT(*) AS count FROM profiles WHERE id = ? AND default_workspace_id IS NULL", [ids.revokedProfile]],
        ["workspaces", 1, "SELECT COUNT(*) AS count FROM workspaces WHERE id = ? AND created_by = ?", [ids.workspace, ids.profile]],
        ["workspace_members", 1, "SELECT COUNT(*) AS count FROM workspace_members WHERE workspace_id = ? AND user_id = ? AND role = 'admin'", [ids.workspace, ids.profile]],
        ["projects", 1, "SELECT COUNT(*) AS count FROM projects WHERE id = ? AND workspace_id = ?", [ids.project, ids.workspace]],
        ["project_members", 1, "SELECT COUNT(*) AS count FROM project_members WHERE project_id = ? AND workspace_id = ? AND user_id = ? AND role = 'admin'", [ids.project, ids.workspace, ids.profile]],
        ["estimates", 1, "SELECT COUNT(*) AS count FROM estimates WHERE id = ? AND project_id = ?", [ids.estimate, ids.project]],
        ["estimate_sheet_members", 1, "SELECT COUNT(*) AS count FROM estimate_sheet_members WHERE estimate_id = ? AND project_id = ? AND user_id = ? AND role = 'admin'", [ids.estimate, ids.project, ids.profile]],
        ["estimate_sheet_access_settings", 1, "SELECT COUNT(*) AS count FROM estimate_sheet_access_settings WHERE estimate_id = ? AND project_id = ? AND inherit_project_access = 1", [ids.estimate, ids.project]],
        ["estimate_tabs", 1, "SELECT COUNT(*) AS count FROM estimate_tabs WHERE id = ? AND estimate_id = ?", [ids.tab, ids.estimate]],
        ["estimate_nodes", ids.nodes.length, "SELECT COUNT(*) AS count FROM estimate_nodes WHERE estimate_id = ? AND estimate_tab_id = ?", [ids.estimate, ids.tab]],
        ["estimate_row_items", ids.rows.length, "SELECT COUNT(*) AS count FROM estimate_row_items WHERE estimate_id = ?", [ids.estimate]],
      ];
      for (const [label, expected, sql, binds] of expectedCounts) {
        const row = reader.first<{ count: number }>(sql, binds);
        if (Number(row?.count ?? -1) !== expected) throw new Error(`prepared D1 ${label} seed reconciliation failed`);
      }

      const accessSql = `
        SELECT estimate.id
        FROM estimates AS estimate
        JOIN projects AS project ON project.id = estimate.project_id
        JOIN workspace_members AS workspace_member
          ON workspace_member.workspace_id = project.workspace_id AND workspace_member.user_id = ?
        JOIN project_members AS project_member
          ON project_member.project_id = project.id AND project_member.workspace_id = project.workspace_id AND project_member.user_id = ?
        JOIN estimate_sheet_members AS estimate_member
          ON estimate_member.estimate_id = estimate.id AND estimate_member.project_id = project.id AND estimate_member.user_id = ?
        WHERE project.workspace_id = ? AND project.id = ? AND estimate.id = ?
          AND workspace_member.role IN ('owner', 'admin', 'member')
          AND project_member.role IN ('owner', 'admin', 'editor', 'viewer')
          AND estimate_member.role IN ('owner', 'admin', 'editor', 'viewer')
        LIMIT 1
      `;
      const access = reader.first<{ id: string }>(accessSql, [
        ids.profile, ids.profile, ids.profile, ids.workspace, ids.project, ids.estimate,
      ]);
      if (!access) throw new Error("prepared D1 route authorization hierarchy is incomplete");

      const wrongTenant = reader.first<{ id: string }>(accessSql, [
        ids.profile, ids.profile, ids.profile, `auth-denial-wrong-tenant-${ids.workspace}`, ids.project, ids.estimate,
      ]);
      for (const [label, sql] of [
        ["workspace", "SELECT COUNT(*) AS count FROM workspace_members WHERE workspace_id = ? AND user_id = ?"],
        ["project", "SELECT COUNT(*) AS count FROM project_members WHERE project_id = ? AND user_id = ?"],
        ["estimate", "SELECT COUNT(*) AS count FROM estimate_sheet_members WHERE estimate_id = ? AND user_id = ?"],
      ] as const) {
        const resourceId = label === "workspace" ? ids.workspace : label === "project" ? ids.project : ids.estimate;
        const membership = reader.first<{ count: number }>(sql, [resourceId, ids.revokedProfile]);
        if (Number(membership?.count ?? -1) !== 0) {
          throw new Error(`prepared D1 revoked identity unexpectedly retains ${label} membership`);
        }
      }
      const revokedMembership = reader.first<{ id: string }>(accessSql, [
        ids.revokedProfile, ids.revokedProfile, ids.revokedProfile, ids.workspace, ids.project, ids.estimate,
      ]);
      if (wrongTenant || revokedMembership) throw new Error("prepared D1 authorization denial probes failed closed");
    }
  } finally {
    reader.close();
  }
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
  ensureDirectoryDurably(resourceRoot, 0o700, input.runPath);
  ensureDirectoryDurably(persistRoot, 0o700, input.runPath);
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
  const preparedMigrationInventory = migrationInventory(migrations);
  const migrationHead = migrations.at(-1)?.name;
  if (!migrationHead) throw new Error("active migration head is unavailable");
  const binding = localWranglerBinding(input.repoRoot, wrangler.unstable_readConfig);
  const schemaPath = resolve(input.runPath, "better-auth-schema.sql");
  const migrationsPath = resolve(resourceRoot, "migrations.json");
  const localConfigPath = resolve(resourceRoot, "wrangler-local.json");
  const seedPath = resolve(input.runPath, "seed.sql");
  const cleanupSqlPath = resolve(resourceRoot, "cleanup.sql");
  writeNoOverwrite(schemaPath, `${schemaProof.sql.trim()}\n`, 0o600, input.runPath);
  writeJsonNoOverwrite(migrationsPath, {
    schema_version: "estimate-sheet-local-d1-migrations.v1",
    head: migrationHead,
    count: migrations.length,
    migrations: preparedMigrationInventory,
  }, 0o600, input.runPath);
  writeJsonNoOverwrite(localConfigPath, {
    name: `estimate-performance-${input.runId}`,
    compatibility_date: binding.compatibilityDate,
    d1_databases: [{ binding: "ARCH_DB", database_name: binding.databaseName, database_id: binding.databaseId }],
  }, 0o600, input.runPath);

  const timestamp = input.createdAt;
  const expiresAt = new Date(Date.parse(input.createdAt) + 24 * 60 * 60 * 1_000).toISOString();
  const records = input.roles.map((role) => ({
    role,
    ids: makeFixtureIds(input.runId, role, input.fixture),
    sessionToken: sha256Hex(`${input.secret}\0${input.runId}\0${role}\0session-token`),
    revokedSessionToken: sha256Hex(`${input.secret}\0${input.runId}\0${role}\0revoked-session-token`),
    expiresAt,
    email: `estimate-perf-${role}-${input.runId.slice(0, 8)}@example.invalid`,
  }));
  const seedSql = [
    "BEGIN IMMEDIATE;",
    ...records.flatMap((record) => fixtureSeedSql({
      fixture: input.fixture,
      ids: record.ids,
      sessionToken: record.sessionToken,
      revokedSessionToken: record.revokedSessionToken,
      email: record.email,
      timestamp,
      expiresAt,
      role: record.role,
    })),
    "COMMIT;",
    "",
  ].join("\n");
  writeNoOverwrite(seedPath, seedSql, 0o600, input.runPath);
  writeNoOverwrite(cleanupSqlPath, renderCleanupSql(records), 0o600, input.runPath);
  for (const record of records) {
    const namespace = input.namespaces[record.role];
    if (!namespace) throw new Error(`missing prepared namespace for ${record.role}`);
    const statePath = resolve(input.runPath, "cleanup", `${record.role}-state.json`);
    const state = cleanupState(input.runId, record.role, namespace.idSha256, record.ids);
    // Cleanup treats exact_ids insertion order as part of the table-order contract.
    writeNoOverwrite(statePath, `${JSON.stringify(state, null, 2)}\n`, 0o600, input.runPath);
  }

  const commands = buildLocalD1PrepareCommands({
    runRoot: input.runPath,
    persistRoot,
    schemaPath,
    seedPath,
  });
  executeLocalD1PrepareCommands({ repoRoot: input.repoRoot, runRoot: input.runPath, commands });
  const reconciledMigrations = loadMigrations(input.repoRoot, wrangler.unstable_splitSqlQuery);
  const reconciledMigrationInventory = migrationInventory(reconciledMigrations);
  assertMigrationInventoryStable(preparedMigrationInventory, reconciledMigrationInventory);
  await validatePreparedLocalD1({
    persistRoot,
    records,
    migrationInventory: reconciledMigrationInventory,
  });

  const authFixtureHash = sha256Json({
    schema: "estimate-sheet-auth-fixture.v1",
    secret_sha256: sha256Hex(input.secret),
    roles: records.map((record) => ({
      role: record.role,
      user_id_sha256: sha256Hex(record.ids.user),
      session_id_sha256: sha256Hex(record.ids.session),
      session_token_sha256: sha256Hex(record.sessionToken),
      revoked_user_id_sha256: sha256Hex(record.ids.revokedUser),
      revoked_session_id_sha256: sha256Hex(record.ids.revokedSession),
      revoked_session_token_sha256: sha256Hex(record.revokedSessionToken),
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
  writeNoOverwrite(runtimeEnv, `${runtimeOrder.map((key) => `${key}=${runtimeValues[key]}`).join("\n")}\n`, 0o600, input.runPath);

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
  }, 0o600, input.runPath);
  const processJournal = resolve(input.runPath, "preview", "process-journal.json");
  writeJsonNoOverwrite(processJournal, {
    schema_version: "estimate-sheet-preview-process-journal.v1",
    unit_id: input.unit,
    run_id: input.runId,
    processes: [],
    updated_at: input.createdAt,
  }, 0o600, input.runPath);
  const routePath = `/workshop/projects/${routeRecord.ids.project}/estimates/${routeRecord.ids.estimate}`;
  return {
    ...resources,
    runtimeEnv,
    runtimeEnvSha256: sha256File(runtimeEnv),
    runtimeEnvStableSha256: runtimeEnvironmentStableSha256(runtimeValues),
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

function releaseRunPortLeases(
  repoRoot: string,
  runRootBase: string,
  unit: EstimateUnit,
  runId: string,
  runPath: string,
): void {
  if (runRootBase !== defaultRunRoot(repoRoot)) throw new Error("port lease cleanup run root is not canonical");
  const root = resolve(runRootBase, "..", "leases", "ports");
  if (root !== resolve(defaultRunRoot(repoRoot), "..", "leases", "ports")) {
    throw new Error("port lease cleanup root is not canonical");
  }
  if (!existsSync(root)) return;
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory() || !/^31\d{2}$/u.test(entry.name)) continue;
    const leasePath = resolve(root, entry.name);
    const ownerPath = resolve(leasePath, "owner.json");
    try {
      const owner = readJsonFile<Record<string, unknown>>(ownerPath);
      if (owner.schema_version === "estimate-sheet-port-lease.v1"
        && owner.unit_id === unit
        && owner.run_id === runId
        && owner.run_root === runPath
        && owner.port === Number(entry.name)) {
        removeOwnedDirectoryDurably(leasePath, "prepare port lease");
      }
    } catch {
      // A malformed foreign lease is not ours to remove.
    }
  }
}

function cleanupUnjournaledPrepareAllocation(input: {
  repoRoot: string;
  unit: EstimateUnit;
  runId: string;
  runPath: string;
  immutableRunRoot: string;
  unitLeasePath: string;
  runRootBase: string;
}): void {
  const runKey = basename(input.runPath);
  if (input.runRootBase !== defaultRunRoot(input.repoRoot)
    || input.runPath !== resolve(defaultRunRoot(input.repoRoot), input.unit, runKey)
    || input.immutableRunRoot !== resolve(defaultImmutableRunRoot(input.repoRoot), input.unit, runKey)
    || !runKey.startsWith(`${input.runId}-`)) {
    throw new Error("unjournaled prepare cleanup roots are not canonical");
  }
  removeOwnedDirectoryDurably(input.runPath, "unjournaled prepare run root");
  removeOwnedDirectoryDurably(input.immutableRunRoot, "unjournaled prepare immutable run root");
  if (existsSync(input.unitLeasePath)) {
    const ownerPath = resolve(input.unitLeasePath, "owner.json");
    assertRegularFile(ownerPath, "unjournaled prepare unit lease owner");
    const owner = readJsonFile<Record<string, unknown>>(ownerPath);
    if (owner.unit_id !== input.unit || owner.run_id !== input.runId || owner.run_root !== input.runPath) {
      throw new Error("unjournaled prepare unit lease is not owned by the failed allocation");
    }
    removeOwnedDirectoryDurably(input.unitLeasePath, "unjournaled prepare unit lease");
  }
  releaseRunPortLeases(input.repoRoot, input.runRootBase, input.unit, input.runId, input.runPath);
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
  retryInProgress?: boolean;
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
    const retrying = input.retryInProgress === true;
    if (!selectedUnit || (selectedUnit.status !== "READY" && !(retrying && selectedUnit.status === "IN_PROGRESS"))) {
      throw new Error(`${input.unit} must be READY before prepare, got ${selectedUnit?.status ?? "missing"}`);
    }
    if (retrying && (plan.runtime_evidence.latest_unit_id !== input.unit || !plan.runtime_evidence.latest_run_id
      || plan.runtime_evidence.registry.immutable_path !== null)) {
      throw new Error("prepare retry requires an unindexed current in-progress run");
    }

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
      retrying,
    );
    const allocationPredecessor = admission?.predecessor ?? readKnownPlanPredecessor(planRoot, plan, input.unit);
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
    const prepareInput: PrepareInputV1 = {
      schema_version: PREPARE_INPUT_SCHEMA,
      unit_id: input.unit,
      profile: contract.profile,
      application_fingerprint: fingerprint.application,
      producer_fingerprint: fingerprint.producer,
      fixture: fixtureHash ? {
        profile: "limit",
        payload_sha256: fixtureHash,
        namespace_roles: [...contract.namespaceRoles],
      } : null,
      decision: admission?.decision ?? null,
      predecessor: allocationPredecessor,
      admission: admission ? {
        kind: admission.kind,
        sha256: admission.sha256,
        input_application_fingerprint: admission.inputApplicationFingerprint,
        input_producer_fingerprint: admission.inputProducerFingerprint,
      } : null,
    };
    const prepareInputSha256 = sha256Json(prepareInput);
    const applicationShort = fingerprint.application.content_sha256.slice(0, 12);
    const inputShort = prepareInputSha256.slice(0, 12);
    const runKey = `${runId}-${applicationShort}-${inputShort}`;
    const unitRoot = resolve(runRootBase, input.unit);
    const runPath = resolve(unitRoot, runKey);
    const immutableRunRootBase = input.planRoot
      ? resolve(planRoot, "evidence/runtime/runs")
      : defaultImmutableRunRoot(repoRoot);
    const immutableRunRoot = resolve(immutableRunRootBase, input.unit, runKey);
    const pointerPath = resolve(runPath, "run-pointer.json");
    const runManifestPath = resolve(runPath, "run-manifest.json");
    const immutableAdmissionPath = resolve(immutableRunRoot, "dependencies/admission.json");
    const prepareRecoveryPath = resolve(runPath, "prepare-recovery.json");
    const immutableRunManifestPath = resolve(immutableRunRoot, "run-manifest.json");
    const resolvedPreviousRunId = plan.runtime_evidence.latest_unit_id === input.unit
      && typeof plan.runtime_evidence.latest_run_id === "string"
      ? plan.runtime_evidence.latest_run_id
      : undefined;
    const oldPlanBytes = readFileSync(planPath);
    if (sha256Hex(oldPlanBytes) !== planFileSha256) throw new Error("plan manifest changed before prepare journal publication");
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
      new_plan_sha256: planFileSha256,
      new_plan_bytes_base64: oldPlanBytes.toString("base64"),
      durable_files: [],
      created_at: createdAt,
    };
    writeJsonNoOverwrite(canonicalTransitionJournalPath(repoRoot), initialJournal, 0o600, repoRoot);
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
        prepareInput,
        prepareInputSha256,
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
          runtimeEnvStableSha256: preparedResources.runtimeEnvStableSha256,
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
        prepareInputSha256,
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
      const transitionInput = {
        unitId: input.unit,
        runId,
        runManifestSha256: sha256Hex(runBytes),
        updatedAt: createdAt,
      };
      const transitioned = retrying
        ? deriveEstimateSheetPrepareRetryTransition(plan, transitionInput)
        : deriveEstimateSheetPrepareTransition(plan, transitionInput);
      const newPlanBytes = Buffer.from(`${JSON.stringify(transitioned, null, 2)}\n`, "utf8");
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
        new_plan_sha256: sha256Hex(newPlanBytes),
        new_plan_bytes_base64: newPlanBytes.toString("base64"),
        durable_files: durableSources.map((source) => ({
          path: pathRelativeToRepo(repoRoot, source.path, "prepare durable file"),
          sha256: sha256Hex(source.bytes),
        })),
      };
      replacePrepareTransitionJournal(repoRoot, initialJournal, currentJournal);
      input.faultInjector?.("JOURNAL_PREPARED");

      ensureDirectoryDurably(runRootBase, 0o700, repoRoot);
      ensureDirectoryDurably(immutableRunRootBase, 0o700, repoRoot);
      for (const source of durableSources) {
        const trustedRoot = isContained(runPath, source.path) ? runRootBase : immutableRunRootBase;
        writeNoOverwrite(source.path, source.bytes, 0o600, trustedRoot);
        if (sha256File(source.path) !== sha256Hex(source.bytes)) {
          throw new Error(`prepare durable file readback mismatch: ${source.path}`);
        }
      }
      readPrecommitRunManifestPair(repoRoot, runManifestPath, input.unit);
      input.faultInjector?.("IMMUTABLE_WRITTEN");

      const filesWrittenJournal: PrepareTransitionJournal = { ...currentJournal, state: "FILES_WRITTEN" };
      replacePrepareTransitionJournal(repoRoot, currentJournal, filesWrittenJournal);
      currentJournal = filesWrittenJournal;
      input.faultInjector?.("PROJECTION_WRITTEN");

      replaceFileAtomically(planPath, newPlanBytes, planFileSha256, 0o644, planRoot);
      const committedJournal: PrepareTransitionJournal = { ...currentJournal, state: "COMMITTED" };
      replacePrepareTransitionJournal(repoRoot, currentJournal, committedJournal);
      currentJournal = committedJournal;
      input.faultInjector?.("MANIFEST_COMMITTED");

      if (sha256File(planPath) !== currentJournal.new_plan_sha256) throw new Error("prepare plan readback mismatch");
      readAuthoritativeRunManifest(repoRoot, runManifestPath, input.unit);
      for (const source of durableSources) {
        if (sha256File(source.path) !== sha256Hex(source.bytes)) {
          throw new Error(`prepare durable file readback mismatch: ${source.path}`);
        }
      }
      removeFileDurably(canonicalTransitionJournalPath(repoRoot));
      return { run, runManifestPath, pointerPath };
    } catch (error) {
      if (!existsSync(canonicalTransitionJournalPath(repoRoot))) {
        try {
          cleanupUnjournaledPrepareAllocation({
            repoRoot,
            unit: input.unit,
            runId,
            runPath,
            immutableRunRoot,
            unitLeasePath,
            runRootBase,
          });
        } catch {
          // Preserve the prepare failure; unowned paths are deliberately left intact.
        }
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
