import { createHash, randomUUID } from "node:crypto";
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
  openSync,
  fsyncSync,
  closeSync,
} from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";

/**
 * Shared, dependency-free contracts for the estimate-sheet performance
 * producer family.  The scripts deliberately keep this module free of Bun,
 * Vitest, Playwright, Wrangler, and application imports so contract tests can
 * run in a plain Node/Vitest process.
 */

export const PERFORMANCE_REPORT_SCHEMA = "estimate-sheet-performance-report.v1" as const;
export const TEST_RECEIPT_SCHEMA = "estimate-sheet-test-receipt.v1" as const;
export const PERFORMANCE_ATTEMPT_SCHEMA = "estimate-sheet-performance-attempt.v1" as const;
export const RUN_MANIFEST_SCHEMA = "estimate-sheet-performance-run.v1" as const;
export const COMMAND_RECEIPT_SCHEMA = "estimate-sheet-command-receipt.v1" as const;
export const MODE_PROOF_SCHEMA = "estimate-sheet-mode-proof.v1" as const;
export const CLEANUP_RECEIPT_SCHEMA = "estimate-sheet-cleanup-receipt.v1" as const;
export const HOSTED_RECOVERY_SCHEMA = "estimate-sheet-hosted-cleanup-recovery.v1" as const;
export const FIXTURE_SCHEMA = "estimate-sheet-performance-fixture.v1" as const;
export const DECISION_SCHEMA = "estimate-sheet-bottleneck-decision.v1" as const;
export const SUPERSESSION_SCHEMA = "estimate-sheet-supersession-receipt.v1" as const;
export const INDEX_SCHEMA = "estimate-sheet-evidence-index.v1" as const;
export const INTEGRATION_SCHEMA = "estimate-sheet-performance-integration.v1" as const;
export const UNIT_PROOF_SCHEMA = "estimate-sheet-performance-unit-proof.v1" as const;
export const RELEASE_EVALUATION_SCHEMA = "estimate-sheet-release-evaluation.v1" as const;
export const TECHNICAL_BLOCK_SCHEMA = "estimate-sheet-technical-block.v1" as const;
export const RELEASE_REOPEN_SCHEMA = "estimate-sheet-release-reopen.v1" as const;
export const FINAL_CLOSEOUT_SCHEMA = "estimate-sheet-final-closeout.v1" as const;

export const FIXTURE_PROFILES = {
  small: 50,
  medium: 500,
  large: 1_000,
  stress: 2_500,
  limit: 5_000,
  "over-limit": 5_001,
  "realistic-skew": 5_000,
} as const;
export type FixtureProfile = keyof typeof FIXTURE_PROFILES;

export const ESTIMATE_UNITS = [
  "UNIT-001",
  "UNIT-002",
  "UNIT-003",
  "UNIT-004",
  "UNIT-005",
  "UNIT-006",
  "UNIT-007",
  "UNIT-008",
  "UNIT-009",
  "UNIT-010",
  "UNIT-011",
] as const;
export type EstimateUnit = (typeof ESTIMATE_UNITS)[number];

export const BROWSER_SCOPES = [
  "baseline",
  "route",
  "derived-state",
  "render-a11y",
  "mutations",
  "full-local",
] as const;
export type BrowserScope = (typeof BROWSER_SCOPES)[number];

export const ESTIMATE_OUTPUT_ROLES = [
  "fixture",
  "dom-tests",
  "e2e-tests",
  "jsdom",
  "browser",
  "browser-child",
  "d1-local",
  "hosted-d1",
  "mode-proof",
  "decision",
  "supersession",
  "release",
  "release-gates",
] as const;
export type EstimateOutputRole = (typeof ESTIMATE_OUTPUT_ROLES)[number];

export const PERFORMANCE_BUDGETS = {
  fieldInpP75Ms: 200,
  labEventTimingP75Ms: 200,
  editP95Ms: 75,
  scrollFrameGapP95Ms: 50,
  longTaskMaxMs: 50,
  scalarDerivedCpuP95Ms: 25,
  closedDialogMoveOptionWork: 0,
  unrelatedSidebarRenders: 0,
  scalarWholeTreeSnapshots: 0,
  fanOutP95Ms: 75,
  nonmatchingRowInspections: 0,
  authoritativePatchCount: 1,
  ancestorLookupP95Ms: 5,
  componentLookupP95Ms: 5,
  duplicateTreeBytes: 0,
  mountedRows: 120,
  mountedBranches: 150,
  coldRouteMedianMs: 3_500,
  warmRouteMedianMs: 500,
  warmSheetVisibleMs: 1_000,
  parentFallbackCount: 0,
  sheetSkeletonEpisodes: 1,
  routeContextStatements: 4,
  tabTreeStatements: 3,
  rowUpdateStatements: 3,
  routeClientJsGzipBytes: 350 * 1024,
  stressRscBytes: 500 * 1024,
  graphHeapDeltaBytes: 20 * 1024 * 1024,
} as const;

export type FingerprintContent = {
  contract_version: string;
  generated_metadata_exclusion_rule?: string;
  package_projection_rule?: string;
  path_count: number;
  path_list_sha256: string;
  content_sha256: string;
};

export type SourceFingerprint = {
  contract_version: string;
  generated_metadata_exclusion_rule?: string;
  head: string;
  path_count: number;
  path_list_sha256: string;
  scoped_status_sha256?: string;
  scoped_diff_sha256?: string;
  application: FingerprintContent;
  producer: FingerprintContent;
  status_bytes?: number;
  tracked_diff_bytes?: number;
  untracked_record_count?: number;
  untracked_record_bytes?: number;
};

export type FingerprintPair = {
  application: FingerprintContent;
  producer: FingerprintContent;
};

export type TraceIds = {
  packageId: string;
  unitId: string;
  evidenceId?: string;
  requirementIds?: string[];
  criterionIds?: string[];
  testIds?: string[];
  scenarioIds?: string[];
};

export type PerformanceReportV1 = {
  schema_version: typeof PERFORMANCE_REPORT_SCHEMA;
  evidenceClass: "jsdom" | "local-browser" | "local-d1" | "hosted-d1";
  trace: TraceIds;
  head: string;
  applicationFingerprint: FingerprintContent;
  producerFingerprint: FingerprintContent;
  fixtureHash: string;
  buildHash: string | null;
  authFixtureHash?: string;
  toolHashes?: Record<string, string>;
  runId: string;
  generatedAt: string;
  method: {
    warmups: number;
    samples: number;
    workerCount: number;
    retries: number;
    seed?: string;
    profile?: FixtureProfile;
  };
  metrics: Record<string, unknown>;
  scenarios?: Record<string, unknown>;
  overall: "PASS" | "FAIL";
  failures?: string[];
  skips?: Array<{ metric: string; reason: string; residualRisk: string }>;
  [key: string]: unknown;
};

export type RunManifestV1 = {
  schema_version: typeof RUN_MANIFEST_SCHEMA;
  package_id: string;
  unit_id: EstimateUnit;
  run_id: string;
  profile: FixtureProfile | "artifact-only";
  evidence_class?: PerformanceReportV1["evidenceClass"];
  cleanupRequirement: "REQUIRED" | "NOT_APPLICABLE";
  run_root: string;
  pointer_path: string;
  created_at: string;
  status: "PREPARED" | "MEASURING" | "FINALIZED" | "CLEANUP_VERIFIED" | "INVALIDATED";
  sourceFingerprint: SourceFingerprint;
  applicationFingerprint: FingerprintContent;
  producerFingerprint: FingerprintContent;
  fixture?: {
    profile: FixtureProfile;
    namespaceIdSha256: string;
    preStateSha256: string;
  };
  namespaces: Record<string, {
    idSha256: string;
    preStateSha256: string;
    postStateSha256?: string;
    commandId?: string;
  }>;
  mutationJournal: unknown[];
  previewProcesses: unknown[];
  runtimeEnv?: string;
  storageState?: string;
  activePreview?: unknown;
  admissionPath?: string;
  admissionSha256?: string;
};

export type TestReceiptV1 = {
  schema_version: "estimate-sheet-test-receipt.v1";
  test_class: "vitest" | "playwright";
  argv: string[];
  files: string[];
  unit_id: EstimateUnit;
  run_id: string;
  application_fingerprint: FingerprintContent;
  producer_fingerprint: FingerprintContent;
  pre_application_fingerprint: FingerprintContent;
  pre_producer_fingerprint: FingerprintContent;
  fixture_hash?: string;
  build_hash?: string | null;
  workers: number;
  retries: number;
  passed: number;
  failed: number;
  skipped: number;
  duration_ms: number;
  overall: "PASS" | "FAIL";
  failure_ids: string[];
  fixtureMutation?: {
    fixtureRole: string;
    namespaceIdSha256: string;
    preStateSha256: string;
    postStateSha256: string;
    declaredMutationSha256: string;
    commandId: string;
  };
};

export type CliValue = string | boolean;

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** Recursively sort object keys while preserving array order. */
export function canonicalize<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => canonicalize(item)) as T;
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]),
    ) as T;
  }
  return value;
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

export function canonicalBytes(value: unknown): Buffer {
  return Buffer.from(canonicalJson(value), "utf8");
}

export function sha256Hex(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

export function sha256Json(value: unknown): string {
  return sha256Hex(canonicalBytes(value));
}

export function sha256File(path: string): string {
  return sha256Hex(readFileSync(path));
}

export function isSha256(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/u.test(value);
}

export function isSafeRelativePath(path: unknown): path is string {
  if (typeof path !== "string" || !path || isAbsolute(path) || path.includes("\\")) return false;
  return path.split("/").every((segment) => segment.length > 0 && segment !== "." && segment !== "..");
}

export function isContained(root: string, target: string): boolean {
  const back = relative(resolve(root), resolve(target));
  return back === "" || (!back.startsWith(`..${sep}`) && back !== ".." && !isAbsolute(back));
}

export function resolveContained(root: string, child: string): string {
  if (!isSafeRelativePath(child)) throw new Error(`path is not safe and relative: ${child}`);
  const target = resolve(root, child);
  if (!isContained(root, target)) throw new Error(`path escapes root: ${child}`);
  return target;
}

export function assertRegularFile(path: string, label = path): void {
  const stat = lstatSync(path);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`${label} must be a regular file`);
}

/** Write a file atomically and refuse replacement. */
export function writeNoOverwrite(path: string, bytes: string | Uint8Array, mode = 0o600): void {
  if (existsSync(path)) throw new Error(`refusing to overwrite existing file: ${path}`);
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const temporary = `${path}.tmp-${process.pid}-${randomUUID()}`;
  try {
    const fd = openSync(temporary, "wx", mode);
    try {
      writeFileSync(fd, bytes);
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
    chmodSync(temporary, mode);
    renameSync(temporary, path);
    const parentFd = openSync(dirname(path), "r");
    try { fsyncSync(parentFd); } finally { closeSync(parentFd); }
  } catch (error) {
    try { unlinkSync(temporary); } catch { /* preserve the primary error */ }
    throw error;
  }
}

export function writeJsonNoOverwrite(path: string, value: unknown, mode = 0o600): void {
  writeNoOverwrite(path, `${canonicalJson(value)}\n`, mode);
}

export function readJsonFile<T>(path: string): T {
  assertRegularFile(path);
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function createRunId(): string {
  return randomUUID();
}

export function normalizeArgv(argv: string[], cwd = process.cwd()): string[] {
  return argv.map((value) => {
    if (value.includes("\0")) throw new Error("argv contains NUL");
    if (/^[a-z]+:\/\//iu.test(value) && /:\S+@/u.test(value)) throw new Error("argv contains credential-bearing URL");
    if (isAbsolute(value)) {
      const relativePath = relative(cwd, value);
      if (relativePath.startsWith(`..${sep}`) || relativePath === "..") throw new Error("argv path escapes repository");
      return relativePath.split(sep).join("/");
    }
    return value;
  });
}

export function parseStrictCli(argv: string[]): Map<string, CliValue> {
  const values = new Map<string, CliValue>();
  for (const token of argv) {
    if (token === "--") break;
    if (!token.startsWith("--")) throw new Error(`unexpected positional argument: ${token}`);
    const body = token.slice(2);
    if (!body) throw new Error("empty CLI option");
    const equals = body.indexOf("=");
    const key = equals === -1 ? body : body.slice(0, equals);
    const raw = equals === -1 ? true : body.slice(equals + 1);
    if (!/^[a-z][a-z0-9-]*$/u.test(key)) throw new Error(`invalid CLI option: --${key}`);
    if (values.has(key)) throw new Error(`duplicate CLI option: --${key}`);
    values.set(key, raw);
  }
  return values;
}

export function cliString(values: Map<string, CliValue>, key: string, required = false): string | undefined {
  const value = values.get(key);
  if (value === undefined) {
    if (required) throw new Error(`missing --${key}`);
    return undefined;
  }
  if (typeof value !== "string" || value.trim() === "") throw new Error(`--${key} requires a non-empty value`);
  return value;
}

export function cliBoolean(values: Map<string, CliValue>, key: string): boolean {
  const value = values.get(key);
  if (value === undefined) return false;
  if (value !== true) throw new Error(`--${key} is a flag and cannot have a value`);
  return true;
}

export function requireUnit(value: string | undefined): EstimateUnit {
  if (!value || !(ESTIMATE_UNITS as readonly string[]).includes(value)) throw new Error(`invalid unit: ${value ?? ""}`);
  return value as EstimateUnit;
}

export function requireProfile(value: string | undefined): FixtureProfile {
  if (!value || !(Object.keys(FIXTURE_PROFILES) as string[]).includes(value)) throw new Error(`invalid fixture profile: ${value ?? ""}`);
  return value as FixtureProfile;
}

export function requireBrowserScope(value: string | undefined): BrowserScope {
  if (!value || !(BROWSER_SCOPES as readonly string[]).includes(value)) throw new Error(`invalid browser scope: ${value ?? ""}`);
  return value as BrowserScope;
}

export function validateFingerprintContent(value: unknown, label = "fingerprint"): string[] {
  const errors: string[] = [];
  if (!isPlainObject(value)) return [`${label} must be an object`];
  if (typeof value.contract_version !== "string" || !value.contract_version) errors.push(`${label}.contract_version missing`);
  if (!Number.isInteger(value.path_count) || Number(value.path_count) < 0) errors.push(`${label}.path_count invalid`);
  for (const key of ["path_list_sha256", "content_sha256"]) if (!isSha256(value[key])) errors.push(`${label}.${key} invalid`);
  for (const key of ["generated_metadata_exclusion_rule", "package_projection_rule"]) {
    if (value[key] !== undefined && (typeof value[key] !== "string" || !value[key])) errors.push(`${label}.${key} invalid`);
  }
  return errors;
}

export function validateFingerprintPair(value: unknown, label = "fingerprints"): string[] {
  if (!isPlainObject(value)) return [`${label} must be an object`];
  return [
    ...validateFingerprintContent(value.application, `${label}.application`),
    ...validateFingerprintContent(value.producer, `${label}.producer`),
  ];
}

export function fingerprintContentEqual(left: unknown, right: unknown): boolean {
  return canonicalJson(left) === canonicalJson(right);
}

function validateTrace(value: unknown, errors: string[]): void {
  if (!isPlainObject(value)) { errors.push("trace must be an object"); return; }
  if (typeof value.packageId !== "string" || !value.packageId) errors.push("trace.packageId missing");
  if (typeof value.unitId !== "string" || !/^UNIT-\d{3}$/u.test(value.unitId)) errors.push("trace.unitId invalid");
  for (const key of ["evidenceId", "requirementIds", "criterionIds", "testIds", "scenarioIds"]) {
    const current = value[key];
    if (key === "evidenceId") {
      if (current !== undefined && (typeof current !== "string" || !current)) errors.push("trace.evidenceId invalid");
    } else if (current !== undefined && (!Array.isArray(current) || current.some((item) => typeof item !== "string" || !item))) {
      errors.push(`trace.${key} invalid`);
    }
  }
}

function validateMetricMap(value: unknown, errors: string[]): void {
  if (!isPlainObject(value)) { errors.push("metrics must be an object"); return; }
  for (const [key, metric] of Object.entries(value)) {
    if (!isPlainObject(metric)) continue;
    if (metric.status !== undefined && !["PASS", "FAIL", "SKIPPED"].includes(String(metric.status))) errors.push(`metrics.${key}.status invalid`);
    if (metric.value !== undefined && typeof metric.value !== "number" && metric.value !== null) errors.push(`metrics.${key}.value invalid`);
    if (typeof metric.value === "number" && !Number.isFinite(metric.value)) errors.push(`metrics.${key}.value non-finite`);
    if (metric.status === "SKIPPED" && (typeof metric.reason !== "string" || typeof metric.residualRisk !== "string")) errors.push(`metrics.${key} skipped metric requires reason and residualRisk`);
  }
}

export function validatePerformanceReport(value: unknown, options: { strict?: boolean } = {}): string[] {
  const errors: string[] = [];
  if (!isPlainObject(value)) return ["report must be an object"];
  if (value.schema_version !== PERFORMANCE_REPORT_SCHEMA) errors.push("schema_version must be estimate-sheet-performance-report.v1");
  if (!(typeof value.evidenceClass === "string" && ["jsdom", "local-browser", "local-d1", "hosted-d1"].includes(value.evidenceClass))) errors.push("evidenceClass invalid");
  validateTrace(value.trace, errors);
  if (typeof value.head !== "string" || !/^[0-9a-f]{7,64}$/u.test(value.head)) errors.push("head invalid");
  errors.push(...validateFingerprintContent(value.applicationFingerprint, "applicationFingerprint"));
  errors.push(...validateFingerprintContent(value.producerFingerprint, "producerFingerprint"));
  if (!isSha256(value.fixtureHash)) errors.push("fixtureHash invalid");
  if (value.buildHash !== null && !isSha256(value.buildHash)) errors.push("buildHash must be null or sha256");
  if (typeof value.runId !== "string" || !value.runId) errors.push("runId missing");
  if (typeof value.generatedAt !== "string" || Number.isNaN(Date.parse(value.generatedAt))) errors.push("generatedAt invalid");
  if (!isPlainObject(value.method)) errors.push("method must be an object");
  else {
    for (const key of ["warmups", "samples", "workerCount", "retries"]) if (!Number.isInteger(value.method[key]) || Number(value.method[key]) < 0) errors.push(`method.${key} invalid`);
    if (value.method.workerCount !== undefined && value.method.workerCount !== 1) errors.push("method.workerCount must be 1");
    if (value.method.retries !== undefined && value.method.retries !== 0) errors.push("method.retries must be 0");
    if (value.method.profile !== undefined && !(Object.keys(FIXTURE_PROFILES) as string[]).includes(String(value.method.profile))) errors.push("method.profile invalid");
  }
  validateMetricMap(value.metrics, errors);
  if (!(["PASS", "FAIL"] as unknown[]).includes(value.overall)) errors.push("overall must be PASS or FAIL");
  if (value.failures !== undefined && (!Array.isArray(value.failures) || value.failures.some((item) => typeof item !== "string"))) errors.push("failures invalid");
  if (value.skips !== undefined && (!Array.isArray(value.skips) || value.skips.some((item) => !isPlainObject(item) || typeof item.metric !== "string" || typeof item.reason !== "string" || typeof item.residualRisk !== "string"))) errors.push("skips invalid");

  const evidenceClass = value.evidenceClass;
  if (evidenceClass === "jsdom" || evidenceClass === "local-d1" || evidenceClass === "hosted-d1") {
    if (value.buildHash !== null) errors.push(`${evidenceClass} buildHash must be null`);
  }
  if (evidenceClass === "local-browser") {
    if (value.buildHash === null) errors.push("local-browser requires buildHash");
    if (!BROWSER_SCOPES.includes(value.browserScope as BrowserScope)) errors.push("local-browser browserScope invalid");
  }
  if (options.strict) {
    const allowed = new Set([
      "schema_version", "evidenceClass", "trace", "head", "applicationFingerprint", "producerFingerprint", "fixtureHash", "buildHash", "authFixtureHash", "toolHashes", "runId", "generatedAt", "method", "metrics", "scenarios", "overall", "failures", "skips", "browserScope", "browser", "device", "environment", "d1", "cleanup", "modeSnapshot", "route", "interactions", "bundle", "rsc", "heap", "query", "fixtureDistribution", "ownershipCensus", "rawSamples", "finalSnapshot", "provider", "deployment", "buildMode",
    ]);
    for (const key of Object.keys(value)) if (!allowed.has(key)) errors.push(`unknown report field: ${key}`);
  }
  return errors;
}

export function assertPerformanceReport(value: unknown, options?: { strict?: boolean }): asserts value is PerformanceReportV1 {
  const errors = validatePerformanceReport(value, options);
  if (errors.length) throw new Error(`invalid performance report:\n- ${errors.join("\n- ")}`);
}

export function validateRunManifest(value: unknown): string[] {
  const errors: string[] = [];
  if (!isPlainObject(value)) return ["run manifest must be an object"];
  if (value.schema_version !== RUN_MANIFEST_SCHEMA) errors.push("schema_version invalid");
  if (typeof value.package_id !== "string" || !value.package_id) errors.push("package_id missing");
  if (!(ESTIMATE_UNITS as readonly string[]).includes(String(value.unit_id))) errors.push("unit_id invalid");
  if (typeof value.run_id !== "string" || !value.run_id) errors.push("run_id missing");
  if (typeof value.run_root !== "string" || !isAbsolute(value.run_root)) errors.push("run_root must be absolute");
  if (typeof value.pointer_path !== "string" || !isAbsolute(value.pointer_path)) errors.push("pointer_path must be absolute");
  if (!["REQUIRED", "NOT_APPLICABLE"].includes(String(value.cleanupRequirement))) errors.push("cleanupRequirement invalid");
  if (!["PREPARED", "MEASURING", "FINALIZED", "CLEANUP_VERIFIED", "INVALIDATED"].includes(String(value.status))) errors.push("status invalid");
  errors.push(...validateFingerprintContent(value.applicationFingerprint, "applicationFingerprint"));
  errors.push(...validateFingerprintContent(value.producerFingerprint, "producerFingerprint"));
  if (!Array.isArray(value.mutationJournal)) errors.push("mutationJournal must be an array");
  if (!Array.isArray(value.previewProcesses)) errors.push("previewProcesses must be an array");
  if (!isPlainObject(value.namespaces)) errors.push("namespaces must be an object");
  if (value.cleanupRequirement === "NOT_APPLICABLE") {
    for (const key of ["runtimeEnv", "storageState", "activePreview"]) if (value[key] !== undefined) errors.push(`NOT_APPLICABLE manifest cannot contain ${key}`);
    if (Array.isArray(value.previewProcesses) && value.previewProcesses.length) errors.push("NOT_APPLICABLE manifest cannot launch preview processes");
    if (Array.isArray(value.mutationJournal) && value.mutationJournal.length) errors.push("NOT_APPLICABLE manifest cannot contain mutations");
  }
  return errors;
}

export function assertRunManifest(value: unknown): asserts value is RunManifestV1 {
  const errors = validateRunManifest(value);
  if (errors.length) throw new Error(`invalid run manifest:\n- ${errors.join("\n- ")}`);
}

export function validateTestReceipt(value: unknown): string[] {
  const errors: string[] = [];
  if (!isPlainObject(value)) return ["test receipt must be an object"];
  if (value.schema_version !== "estimate-sheet-test-receipt.v1") errors.push("schema_version invalid");
  if (!["vitest", "playwright"].includes(String(value.test_class))) errors.push("test_class invalid");
  for (const key of ["argv", "files", "failure_ids"]) if (!Array.isArray(value[key]) || value[key].some((item) => typeof item !== "string")) errors.push(`${key} invalid`);
  if (!(ESTIMATE_UNITS as readonly string[]).includes(String(value.unit_id))) errors.push("unit_id invalid");
  for (const key of ["run_id"]) if (typeof value[key] !== "string" || !value[key]) errors.push(`${key} missing`);
  errors.push(...validateFingerprintContent(value.application_fingerprint, "application_fingerprint"));
  errors.push(...validateFingerprintContent(value.producer_fingerprint, "producer_fingerprint"));
  errors.push(...validateFingerprintContent(value.pre_application_fingerprint, "pre_application_fingerprint"));
  errors.push(...validateFingerprintContent(value.pre_producer_fingerprint, "pre_producer_fingerprint"));
  if (!fingerprintContentEqual(value.application_fingerprint, value.pre_application_fingerprint)) errors.push("application fingerprints differ");
  if (!fingerprintContentEqual(value.producer_fingerprint, value.pre_producer_fingerprint)) errors.push("producer fingerprints differ");
  for (const key of ["workers", "retries", "passed", "failed", "skipped"]) if (!Number.isInteger(value[key]) || Number(value[key]) < 0) errors.push(`${key} invalid`);
  if (value.workers !== 1) errors.push("workers must be 1");
  if (value.retries !== 0) errors.push("retries must be 0");
  if (typeof value.duration_ms !== "number" || !Number.isFinite(value.duration_ms) || value.duration_ms < 0) errors.push("duration_ms invalid");
  if (!["PASS", "FAIL"].includes(String(value.overall))) errors.push("overall invalid");
  if (value.fixture_hash !== undefined && !isSha256(value.fixture_hash)) errors.push("fixture_hash invalid");
  if (value.build_hash !== undefined && value.build_hash !== null && !isSha256(value.build_hash)) errors.push("build_hash invalid");
  if (value.fixtureMutation !== undefined) {
    if (!isPlainObject(value.fixtureMutation)) errors.push("fixtureMutation invalid");
    else for (const key of ["fixtureRole", "namespaceIdSha256", "preStateSha256", "postStateSha256", "declaredMutationSha256", "commandId"]) {
      if (typeof value.fixtureMutation[key] !== "string" || !value.fixtureMutation[key]) errors.push(`fixtureMutation.${key} missing`);
    }
  }
  return errors;
}

export function assertTestReceipt(value: unknown): asserts value is TestReceiptV1 {
  const errors = validateTestReceipt(value);
  if (errors.length) throw new Error(`invalid test receipt:\n- ${errors.join("\n- ")}`);
}

export function redactedFailureIds(values: unknown[]): string[] {
  return [...new Set(values.map((value) => String(value).replace(/[\r\n\t]/g, " ").replace(/https?:\/\/[^\s]+/giu, "<url>").replace(/(token|secret|cookie|authorization|password)[=:][^\s,;]+/giu, "$1=<redacted>").slice(0, 160)).filter(Boolean))].slice(0, 50);
}

export function defaultRunRoot(repoRoot = process.cwd()): string {
  return resolve(repoRoot, ".ai/99_scratch/estimate-sheet-performance/runs");
}

export function defaultPlanRoot(repoRoot = process.cwd()): string {
  return resolve(repoRoot, ".ai/03_plans/2026-07-08/Project-Estimate-Sheet-Performance-Optimization");
}

export function defaultEvidenceRoot(repoRoot = process.cwd()): string {
  return resolve(defaultPlanRoot(repoRoot), "evidence/runtime");
}

export function ensureContainedRunPath(runRoot: string, path: string): string {
  const resolved = isAbsolute(path) ? resolve(path) : resolveContained(runRoot, path);
  if (!isContained(runRoot, resolved)) throw new Error(`run path escapes run root: ${path}`);
  return resolved;
}

export function assertNoSensitiveValue(value: unknown, label = "value"): void {
  if (typeof value !== "string") return;
  if (/https?:\/\/[^\s/]+:[^\s/@]+@/iu.test(value) || /(?:authorization|cookie|secret|token|password)\s*[=:]/iu.test(value)) throw new Error(`${label} contains sensitive material`);
}
