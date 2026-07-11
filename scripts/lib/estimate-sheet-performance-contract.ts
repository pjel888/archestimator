import { createHash, randomUUID } from "node:crypto";
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
  openSync,
  fsyncSync,
  closeSync,
} from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

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

export const BROWSER_SCOPE_BY_UNIT = {
  "UNIT-002": "baseline",
  "UNIT-005": "route",
  "UNIT-007": "derived-state",
  "UNIT-008": "render-a11y",
  "UNIT-009": "mutations",
  "UNIT-010": "full-local",
} as const satisfies Partial<Record<EstimateUnit, BrowserScope>>;

export const ESTIMATE_OUTPUT_ROLES = [
  "fixture",
  "jsdom",
  "browser",
  "browser-child",
  "d1",
  "d1-child",
  "integration",
  "unit-proof",
  "hosted",
  "mode-proof",
  "decision",
  "supersession",
  "release",
  "cleanup",
  "decision-tests",
  "dom-tests",
  "e2e-tests",
  "dom-graph",
  "dom-performance",
  "refreeze-tests",
  "release-gates-json",
  "release-gates-md",
  "fingerprint-reference",
  "typecheck",
  "error-handling",
  "next-build",
  "opennext-build",
  "browser-check",
  "d1-check",
  "react-doctor",
  "wrangler-auth",
  "provider-resources",
  "release-gates",
] as const;
export type EstimateOutputRole = (typeof ESTIMATE_OUTPUT_ROLES)[number];

export const ESTIMATE_LOGICAL_OUTPUTS = {
  fixture: "fixtures/fixture.json",
  jsdom: "reports/jsdom.json",
  browser: "reports/browser.json",
  "browser-child": "reports/browser-child.json",
  d1: "reports/d1.json",
  "d1-child": "reports/d1-child.json",
  integration: "reports/integration.json",
  "unit-proof": "reports/unit-proof.json",
  hosted: "reports/hosted-d1.json",
  "mode-proof": "mode-proof.json",
  decision: "receipts/decision.json",
  supersession: "receipts/supersession.json",
  release: "release-evaluation.md",
  cleanup: "cleanup-receipt.json",
  "decision-tests": "receipts/decision-tests.json",
  "dom-tests": "receipts/dom-tests.json",
  "e2e-tests": "receipts/e2e-tests.json",
  "dom-graph": "receipts/dom-graph.json",
  "dom-performance": "receipts/dom-performance.json",
  "refreeze-tests": "receipts/refreeze-tests.json",
  "release-gates-json": "receipts/release-gates-json.json",
  "release-gates-md": "receipts/release-gates-md.md",
  "fingerprint-reference": "receipts/command-fingerprint-reference.json",
  typecheck: "receipts/command-typecheck.json",
  "error-handling": "receipts/command-error-handling.json",
  "next-build": "receipts/command-next-build.json",
  "opennext-build": "receipts/command-opennext-build.json",
  "browser-check": "receipts/command-browser-check.json",
  "d1-check": "receipts/command-d1-check.json",
  "react-doctor": "receipts/command-react-doctor.json",
  "wrangler-auth": "receipts/command-wrangler-auth.json",
  "provider-resources": "receipts/command-provider-resources.json",
  "release-gates": "receipts/command-release-gates.json",
} as const satisfies Record<EstimateOutputRole, string>;

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
  inputApplicationFingerprint?: FingerprintContent;
  inputProducerFingerprint?: FingerprintContent;
  admissionKind?: "planning" | "refreeze" | "predecessor";
  admissionPath?: string;
  admissionSha256?: string;
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
  browserScope?: BrowserScope;
  browser?: Record<string, unknown>;
  device?: Record<string, unknown>;
  environment?: Record<string, unknown>;
  d1?: Record<string, unknown>;
  cleanup?: Record<string, unknown>;
  modeSnapshot?: Record<string, unknown>;
  route?: Record<string, unknown>;
  interactions?: Record<string, unknown>;
  bundle?: Record<string, unknown>;
  rsc?: Record<string, unknown>;
  heap?: Record<string, unknown>;
  query?: Record<string, unknown>;
  fixtureDistribution?: Record<string, unknown>;
  ownershipCensus?: Record<string, unknown>;
  rawSamples?: unknown[];
  finalSnapshot?: Record<string, unknown>;
  provider?: Record<string, unknown>;
  deployment?: Record<string, unknown>;
  buildMode: "not-applicable" | "opennext-preview";
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
  immutable_run_root?: string;
  pointer_path: string;
  logical_outputs?: Record<EstimateOutputRole, string>;
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
  runtimeEnvSha256?: string;
  storageState?: string;
  storageStateSha256?: string;
  storageStateExpiresAt?: string;
  activePreview?: unknown;
  leasedPort?: number;
  port?: number;
  processJournal?: string;
  routePath?: string;
  route?: Record<string, unknown>;
  fixture_hash?: string;
  auth_fixture_hash?: string;
  activatedModes?: string[];
  wranglerState?: string;
  resources?: Record<string, unknown>;
  buildReceipt?: string;
  build_hash?: string;
  cleanupReceipt?: string;
  cleanupReceiptSha256?: string;
  admissionKind?: "planning" | "refreeze" | "predecessor";
  admissionPath?: string;
  admissionSha256?: string;
  inputApplicationFingerprint?: FingerprintContent;
  inputProducerFingerprint?: FingerprintContent;
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

export function sha256DirectoryTree(root: string): string {
  const rootStats = lstatSync(root);
  if (!rootStats.isDirectory() || rootStats.isSymbolicLink()) throw new Error(`tree root is not a real directory: ${root}`);
  const entries: Array<{ path: string; type: "directory" | "file"; sha256?: string; size?: number }> = [];
  const visit = (directory: string, prefix: string): void => {
    for (const name of readdirSync(directory).sort()) {
      const absolute = join(directory, name);
      const relativePath = prefix ? `${prefix}/${name}` : name;
      const stats = lstatSync(absolute);
      if (stats.isSymbolicLink()) throw new Error(`tree contains a symbolic link: ${relativePath}`);
      if (stats.isDirectory()) {
        entries.push({ path: relativePath, type: "directory" });
        visit(absolute, relativePath);
      } else if (stats.isFile()) {
        entries.push({ path: relativePath, type: "file", sha256: sha256File(absolute), size: stats.size });
      } else {
        throw new Error(`tree contains an unsupported entry: ${relativePath}`);
      }
    }
  };
  visit(root, "");
  return sha256Json(entries);
}

export function sha256OpenNextBuild(repoRoot = process.cwd()): string {
  const worker = resolve(repoRoot, ".open-next/worker.js");
  const assets = resolve(repoRoot, ".open-next/assets");
  assertRegularFile(worker, "OpenNext worker");
  return sha256Json({ worker: sha256File(worker), assets: sha256DirectoryTree(assets) });
}

export function sha256NextBuild(repoRoot = process.cwd()): string {
  const buildId = resolve(repoRoot, ".next/BUILD_ID");
  const server = resolve(repoRoot, ".next/server");
  const staticAssets = resolve(repoRoot, ".next/static");
  assertRegularFile(buildId, "Next.js build ID");
  return sha256Json({
    buildId: sha256File(buildId),
    server: sha256DirectoryTree(server),
    static: sha256DirectoryTree(staticAssets),
  });
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

/** Atomically replace a registered file only while its expected bytes remain current. */
export function replaceFileAtomically(
  path: string,
  bytes: string | Uint8Array,
  expectedCurrentSha256: string,
  mode = 0o644,
): string {
  if (!isSha256(expectedCurrentSha256)) throw new Error("expected current hash must be a SHA-256 digest");
  assertRegularFile(path, "atomic replacement target");
  if (sha256File(path) !== expectedCurrentSha256) throw new Error(`current hash mismatch for ${path}`);

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

    // Recheck after the new bytes are durable so a concurrent writer cannot be hidden.
    assertRegularFile(path, "atomic replacement target");
    if (sha256File(path) !== expectedCurrentSha256) throw new Error(`current hash mismatch for ${path}`);
    renameSync(temporary, path);
    const parentFd = openSync(dirname(path), "r");
    try { fsyncSync(parentFd); } finally { closeSync(parentFd); }
    return sha256File(path);
  } catch (error) {
    try { unlinkSync(temporary); } catch { /* preserve the primary error */ }
    throw error;
  }
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
  if (Object.keys(value).length === 0) errors.push("metrics must not be empty");
  for (const [key, metric] of Object.entries(value)) {
    if (!key) errors.push("metrics contains an empty metric id");
    if (!isPlainObject(metric)) { errors.push(`metrics.${key} must be an object`); continue; }
    if (!["PASS", "FAIL", "SKIPPED"].includes(String(metric.status))) errors.push(`metrics.${key}.status invalid`);
    if (metric.value !== undefined && typeof metric.value !== "number" && metric.value !== null) errors.push(`metrics.${key}.value invalid`);
    if (typeof metric.value === "number" && !Number.isFinite(metric.value)) errors.push(`metrics.${key}.value non-finite`);
    if (metric.status === "SKIPPED" && (typeof metric.reason !== "string" || typeof metric.residualRisk !== "string")) errors.push(`metrics.${key} skipped metric requires reason and residualRisk`);
  }
}

function requireNonEmptyObject(value: unknown, label: string, errors: string[]): void {
  if (!isPlainObject(value) || Object.keys(value).length === 0) errors.push(`${label} must be a non-empty object`);
}

function forbidFields(value: Record<string, unknown>, fields: readonly string[], evidenceClass: string, errors: string[]): void {
  for (const field of fields) {
    if (value[field] !== undefined) errors.push(`${evidenceClass} forbids ${field}`);
  }
}

export function validatePerformanceReport(value: unknown, options: { strict?: boolean } = {}): string[] {
  const errors: string[] = [];
  if (!isPlainObject(value)) return ["report must be an object"];
  if (value.schema_version !== PERFORMANCE_REPORT_SCHEMA) errors.push("schema_version must be estimate-sheet-performance-report.v1");
  if (!(typeof value.evidenceClass === "string" && ["jsdom", "local-browser", "local-d1", "hosted-d1"].includes(value.evidenceClass))) errors.push("evidenceClass invalid");
  validateTrace(value.trace, errors);
  const traceUnit = isPlainObject(value.trace) ? String(value.trace.unitId ?? "") : "";
  if (typeof value.head !== "string" || !/^[0-9a-f]{7,64}$/u.test(value.head)) errors.push("head invalid");
  errors.push(...validateFingerprintContent(value.applicationFingerprint, "applicationFingerprint"));
  errors.push(...validateFingerprintContent(value.producerFingerprint, "producerFingerprint"));
  if (value.inputApplicationFingerprint !== undefined) errors.push(...validateFingerprintContent(value.inputApplicationFingerprint, "inputApplicationFingerprint"));
  if (value.inputProducerFingerprint !== undefined) errors.push(...validateFingerprintContent(value.inputProducerFingerprint, "inputProducerFingerprint"));
  if (value.admissionKind !== undefined && !["planning", "refreeze", "predecessor"].includes(String(value.admissionKind))) errors.push("admissionKind invalid");
  if ((value.admissionPath === undefined) !== (value.admissionSha256 === undefined)) errors.push("admission path/hash must be present together");
  if ((value.inputApplicationFingerprint === undefined) !== (value.inputProducerFingerprint === undefined)) errors.push("input application/producer fingerprints must be present together");
  if ((value.admissionKind === undefined) !== (value.admissionPath === undefined)) errors.push("admission kind/path must be present together");
  if ((value.admissionKind === undefined) !== (value.inputApplicationFingerprint === undefined)) errors.push("admission/input fingerprints must be present together");
  if (value.admissionPath !== undefined && (typeof value.admissionPath !== "string" || !value.admissionPath)) errors.push("admissionPath invalid");
  if (value.admissionSha256 !== undefined && !isSha256(value.admissionSha256)) errors.push("admissionSha256 invalid");
  if (!isSha256(value.fixtureHash)) errors.push("fixtureHash invalid");
  if (value.buildHash !== null && !isSha256(value.buildHash)) errors.push("buildHash must be null or sha256");
  if (!isSha256(value.authFixtureHash)) errors.push("authFixtureHash invalid");
  if (!isPlainObject(value.toolHashes) || Object.keys(value.toolHashes).length === 0) errors.push("toolHashes must be a non-empty object");
  else for (const [role, digest] of Object.entries(value.toolHashes)) if (!role || !isSha256(digest)) errors.push(`toolHashes.${role} invalid`);
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
  if (value.failures !== undefined && (!Array.isArray(value.failures) || value.failures.some((item) => typeof item !== "string" || !item))) errors.push("failures invalid");
  if (value.skips !== undefined && (!Array.isArray(value.skips) || value.skips.some((item) => !isPlainObject(item) || typeof item.metric !== "string" || typeof item.reason !== "string" || typeof item.residualRisk !== "string"))) errors.push("skips invalid");
  if (isPlainObject(value.metrics)) {
    const failedMetrics = Object.entries(value.metrics).filter(([, metric]) => isPlainObject(metric) && metric.status === "FAIL");
    if (failedMetrics.length > 0 && value.overall !== "FAIL") errors.push("overall must be FAIL when a metric fails");
    if (value.overall === "FAIL" && (!Array.isArray(value.failures) || value.failures.length === 0)) errors.push("FAIL report requires failures");
  }

  const evidenceClass = value.evidenceClass;
  const browserOnlyFields = ["browserScope", "browser", "device", "environment", "modeSnapshot", "route", "interactions", "bundle", "rsc", "heap", "finalSnapshot"] as const;
  const d1OnlyFields = ["d1", "query", "provider", "deployment", "cleanup"] as const;
  if (evidenceClass === "jsdom" || evidenceClass === "local-d1" || evidenceClass === "hosted-d1") {
    if (value.buildHash !== null) errors.push(`${evidenceClass} buildHash must be null`);
    if (value.buildMode !== "not-applicable") errors.push(`${evidenceClass} buildMode must be not-applicable`);
  }
  if (evidenceClass === "jsdom") {
    if (traceUnit !== "UNIT-001") errors.push("jsdom report is valid only for UNIT-001");
    forbidFields(value, [...browserOnlyFields, ...d1OnlyFields], "jsdom", errors);
  }
  if (evidenceClass === "local-browser") {
    if (value.buildHash === null) errors.push("local-browser requires buildHash");
    if (value.buildMode !== "opennext-preview") errors.push("local-browser buildMode must be opennext-preview");
    if (!BROWSER_SCOPES.includes(value.browserScope as BrowserScope)) errors.push("local-browser browserScope invalid");
    const expectedScope = BROWSER_SCOPE_BY_UNIT[traceUnit as keyof typeof BROWSER_SCOPE_BY_UNIT];
    if (!expectedScope) errors.push("local-browser unit does not own a browser scope");
    else if (value.browserScope !== expectedScope) errors.push(`local-browser browserScope for ${traceUnit} must be ${expectedScope}`);
    for (const field of ["browser", "device", "environment", "modeSnapshot", "finalSnapshot"] as const) requireNonEmptyObject(value[field], `local-browser ${field}`, errors);
    forbidFields(value, d1OnlyFields, "local-browser", errors);
  }
  if (evidenceClass === "local-d1") {
    if (!["UNIT-003", "UNIT-005", "UNIT-010"].includes(traceUnit)) errors.push("local-d1 report unit invalid");
    requireNonEmptyObject(value.d1, "local-d1 d1", errors);
    forbidFields(value, browserOnlyFields, "local-d1", errors);
    forbidFields(value, ["provider", "deployment", "cleanup"], "local-d1", errors);
  }
  if (evidenceClass === "hosted-d1") {
    if (traceUnit !== "UNIT-011") errors.push("hosted-d1 report is valid only for UNIT-011");
    for (const field of ["d1", "provider", "deployment", "cleanup"] as const) requireNonEmptyObject(value[field], `hosted-d1 ${field}`, errors);
    forbidFields(value, browserOnlyFields, "hosted-d1", errors);
  }
  if (options.strict) {
    const allowed = new Set([
      "schema_version", "evidenceClass", "trace", "head", "applicationFingerprint", "producerFingerprint", "inputApplicationFingerprint", "inputProducerFingerprint", "admissionKind", "admissionPath", "admissionSha256", "fixtureHash", "buildHash", "authFixtureHash", "toolHashes", "runId", "generatedAt", "method", "metrics", "scenarios", "overall", "failures", "skips", "browserScope", "browser", "device", "environment", "d1", "cleanup", "modeSnapshot", "route", "interactions", "bundle", "rsc", "heap", "query", "fixtureDistribution", "ownershipCensus", "rawSamples", "finalSnapshot", "provider", "deployment", "buildMode",
    ]);
    for (const key of Object.keys(value)) if (!allowed.has(key)) errors.push(`unknown report field: ${key}`);
  }
  return errors;
}

export function assertPerformanceReport(value: unknown, options?: { strict?: boolean }): asserts value is PerformanceReportV1 {
  const errors = validatePerformanceReport(value, options);
  if (errors.length) throw new Error(`invalid performance report:\n- ${errors.join("\n- ")}`);
}

const NOT_APPLICABLE_UNITS = ["UNIT-001", "UNIT-004", "UNIT-005", "UNIT-006", "UNIT-007", "UNIT-008", "UNIT-009"] as const;
const LOCAL_BROWSER_NAMESPACE_ROLES = {
  "UNIT-002": ["browser"],
  "UNIT-005": ["mode", "browser", "d1"],
  "UNIT-006": ["mode"],
  "UNIT-007": ["mode", "browser"],
  "UNIT-008": ["mode", "browser"],
  "UNIT-009": ["mode", "browser"],
  "UNIT-010": ["mode", "browser", "d1"],
} as const satisfies Partial<Record<EstimateUnit, readonly string[]>>;
const LOCAL_FIXTURE_MANIFEST_FIELDS = ["fixture", "fixture_hash", "auth_fixture_hash", "wranglerState", "resources"] as const;
const LOCAL_BROWSER_MANIFEST_FIELDS = [
  "leasedPort", "port", "runtimeEnv", "runtimeEnvSha256", "storageState", "storageStateSha256",
  "storageStateExpiresAt", "processJournal", "routePath", "route", "activatedModes", "activePreview",
  "buildReceipt", "build_hash",
] as const;
const CLEANUP_MANIFEST_FIELDS = ["cleanupReceipt", "cleanupReceiptSha256"] as const;
const RUN_MANIFEST_FIELDS = new Set([
  "schema_version", "package_id", "unit_id", "run_id", "profile", "evidence_class", "cleanupRequirement",
  "run_root", "immutable_run_root", "pointer_path", "logical_outputs", "created_at", "status", "sourceFingerprint",
  "applicationFingerprint", "producerFingerprint", "fixture", "namespaces", "mutationJournal", "previewProcesses",
  "runtimeEnv", "runtimeEnvSha256", "storageState", "storageStateSha256", "storageStateExpiresAt", "activePreview",
  "leasedPort", "port", "processJournal", "routePath", "route", "fixture_hash", "auth_fixture_hash",
  "activatedModes", "wranglerState", "resources", "buildReceipt", "build_hash", "cleanupReceipt",
  "cleanupReceiptSha256", "admissionKind", "admissionPath", "admissionSha256", "inputApplicationFingerprint",
  "inputProducerFingerprint",
]);

function hasOwn(value: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function forbidManifestFields(value: Record<string, unknown>, fields: readonly string[], label: string, errors: string[]): void {
  for (const field of fields) if (hasOwn(value, field)) errors.push(`${label} manifest cannot contain ${field}`);
}

function validateAbsoluteContainedPath(value: unknown, root: unknown, label: string, errors: string[]): void {
  if (typeof value !== "string" || !isAbsolute(value)) {
    errors.push(`${label} must be absolute`);
    return;
  }
  if (typeof root === "string" && isAbsolute(root) && !isContained(root, value)) errors.push(`${label} must stay inside run_root`);
}

function validateRelativePath(value: unknown, root: unknown, label: string, errors: string[]): void {
  if (typeof value !== "string" || !value || isAbsolute(value) || value.includes("\\") || value.includes("\0")) {
    errors.push(`${label} must be a safe relative path`);
    return;
  }
  const segments = value.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
    errors.push(`${label} must be a safe relative path`);
    return;
  }
  if (typeof root !== "string" || !isAbsolute(root)) return;
  const resolved = resolve(root, value);
  const normalized = relative(root, resolved).split(sep).join("/");
  if (!isContained(root, resolved) || normalized !== value) errors.push(`${label} must be a safe relative path`);
}

function validateLogicalOutputs(value: unknown, immutableRunRoot: unknown, errors: string[]): void {
  if (!isPlainObject(value)) {
    errors.push("logical_outputs must be a complete role map");
    return;
  }
  const actualKeys = Object.keys(value).sort();
  const expectedKeys = [...ESTIMATE_OUTPUT_ROLES].sort();
  if (canonicalJson(actualKeys) !== canonicalJson(expectedKeys)) errors.push("logical_outputs role set is not exact");
  const paths = new Set<string>();
  for (const role of ESTIMATE_OUTPUT_ROLES) {
    const path = value[role];
    if (path !== ESTIMATE_LOGICAL_OUTPUTS[role]) errors.push(`logical_outputs.${role} is not canonical`);
    validateRelativePath(path, immutableRunRoot, `logical_outputs.${role}`, errors);
    if (typeof path === "string") {
      if (paths.has(path)) errors.push(`logical_outputs path is duplicated: ${path}`);
      paths.add(path);
    }
  }
}

function validateNamespaceRoles(value: unknown, expectedRoles: readonly string[], errors: string[]): void {
  if (!isPlainObject(value)) {
    errors.push("namespaces must be an object");
    return;
  }
  if (canonicalJson(Object.keys(value).sort()) !== canonicalJson([...expectedRoles].sort())) {
    errors.push(`namespace roles must be exactly ${expectedRoles.length ? expectedRoles.join(",") : "empty"}`);
  }
  const identifiers = new Set<string>();
  for (const role of expectedRoles) {
    const namespace = value[role];
    if (!isPlainObject(namespace)) {
      errors.push(`namespaces.${role} must be an object`);
      continue;
    }
    const allowedKeys = ["idSha256", "preStateSha256", "postStateSha256", "commandId"];
    for (const key of Object.keys(namespace)) if (!allowedKeys.includes(key)) errors.push(`unknown namespaces.${role} field: ${key}`);
    if (!isSha256(namespace.idSha256)) errors.push(`namespaces.${role}.idSha256 invalid`);
    else if (identifiers.has(namespace.idSha256)) errors.push("namespace identifiers must be distinct");
    else identifiers.add(namespace.idSha256);
    if (!isSha256(namespace.preStateSha256)) errors.push(`namespaces.${role}.preStateSha256 invalid`);
    const hasPostState = hasOwn(namespace, "postStateSha256");
    const hasCommand = hasOwn(namespace, "commandId");
    if (hasPostState !== hasCommand) errors.push(`namespaces.${role} mutation outcome must contain postStateSha256 and commandId together`);
    if (hasPostState && !isSha256(namespace.postStateSha256)) errors.push(`namespaces.${role}.postStateSha256 invalid`);
    if (hasCommand && (typeof namespace.commandId !== "string" || !namespace.commandId)) errors.push(`namespaces.${role}.commandId invalid`);
  }
}

function validateLocalFixtureFields(value: Record<string, unknown>, expectedRoles: readonly string[], errors: string[]): void {
  if (!isPlainObject(value.fixture)) errors.push("local manifest fixture must be an object");
  else {
    const fixtureKeys = ["profile", "namespaceIdSha256", "preStateSha256"];
    for (const key of Object.keys(value.fixture)) if (!fixtureKeys.includes(key)) errors.push(`unknown fixture field: ${key}`);
    if (value.fixture.profile !== "limit") errors.push("local manifest fixture profile must be limit");
    if (!isSha256(value.fixture.namespaceIdSha256)) errors.push("fixture.namespaceIdSha256 invalid");
    if (!isSha256(value.fixture.preStateSha256)) errors.push("fixture.preStateSha256 invalid");
    const primaryNamespace = isPlainObject(value.namespaces) ? value.namespaces[expectedRoles[0] ?? ""] : undefined;
    if (!isPlainObject(primaryNamespace)
      || value.fixture.namespaceIdSha256 !== primaryNamespace.idSha256
      || value.fixture.preStateSha256 !== primaryNamespace.preStateSha256) {
      errors.push("fixture does not bind the primary unit namespace");
    }
  }
  if (!isSha256(value.fixture_hash)) errors.push("fixture_hash invalid");
  if (!isSha256(value.auth_fixture_hash)) errors.push("auth_fixture_hash invalid");
  if (isPlainObject(value.fixture) && value.fixture.preStateSha256 !== value.fixture_hash) errors.push("fixture_hash differs from fixture pre-state");
  validateAbsoluteContainedPath(value.wranglerState, value.run_root, "wranglerState", errors);
  if (!isPlainObject(value.resources) || Object.keys(value.resources).length === 0) errors.push("local manifest resources must be a non-empty object");
}

function validateLifecyclePair(
  value: Record<string, unknown>,
  pathKey: "buildReceipt" | "cleanupReceipt",
  hashKey: "build_hash" | "cleanupReceiptSha256",
  errors: string[],
): void {
  const hasPath = hasOwn(value, pathKey);
  const hasHash = hasOwn(value, hashKey);
  if (hasPath !== hasHash) errors.push(`${pathKey}/${hashKey} must be present together`);
  if (hasPath) validateAbsoluteContainedPath(value[pathKey], value.run_root, pathKey, errors);
  if (hasHash && !isSha256(value[hashKey])) errors.push(`${hashKey} invalid`);
}

function validateLocalBrowserFields(value: Record<string, unknown>, expectedRoles: readonly string[], errors: string[]): void {
  if (!Number.isInteger(value.port) || Number(value.port) < 1_024 || Number(value.port) > 65_535) errors.push("local-browser port invalid");
  if (value.leasedPort !== value.port) errors.push("local-browser leasedPort must equal port");
  for (const [pathKey, hashKey] of [["runtimeEnv", "runtimeEnvSha256"], ["storageState", "storageStateSha256"]] as const) {
    validateAbsoluteContainedPath(value[pathKey], value.run_root, pathKey, errors);
    if (!isSha256(value[hashKey])) errors.push(`${hashKey} invalid`);
  }
  validateAbsoluteContainedPath(value.processJournal, value.run_root, "processJournal", errors);
  if (typeof value.storageStateExpiresAt !== "string" || Number.isNaN(Date.parse(value.storageStateExpiresAt))) errors.push("storageStateExpiresAt invalid");
  if (typeof value.routePath !== "string" || !value.routePath.startsWith("/") || value.routePath.startsWith("//")) errors.push("routePath invalid");
  if (!isPlainObject(value.route)) errors.push("local-browser route must be an object");
  else {
    const routeKeys = ["path", "projectId", "nodeId", "fixtureRole"];
    for (const key of Object.keys(value.route)) if (!routeKeys.includes(key)) errors.push(`unknown route field: ${key}`);
    const expectedRole = expectedRoles.includes("browser") ? "browser" : "mode";
    if (value.route.path !== value.routePath || value.route.fixtureRole !== expectedRole
      || typeof value.route.projectId !== "string" || !value.route.projectId
      || typeof value.route.nodeId !== "string" || !value.route.nodeId) {
      errors.push("local-browser route binding is invalid");
    }
  }
  if (value.activatedModes !== undefined && (!Array.isArray(value.activatedModes)
    || value.activatedModes.some((mode) => typeof mode !== "string" || !mode)
    || new Set(value.activatedModes).size !== value.activatedModes.length)) {
    errors.push("activatedModes invalid");
  }
  validateLifecyclePair(value, "buildReceipt", "build_hash", errors);
}

export function validateRunManifest(value: unknown): string[] {
  const errors: string[] = [];
  if (!isPlainObject(value)) return ["run manifest must be an object"];
  if (value.schema_version !== RUN_MANIFEST_SCHEMA) errors.push("schema_version invalid");
  if (typeof value.package_id !== "string" || !value.package_id) errors.push("package_id missing");
  if (!(ESTIMATE_UNITS as readonly string[]).includes(String(value.unit_id))) errors.push("unit_id invalid");
  if (typeof value.run_id !== "string" || !value.run_id) errors.push("run_id missing");
  if (typeof value.run_root !== "string" || !isAbsolute(value.run_root)) errors.push("run_root must be absolute");
  if (typeof value.immutable_run_root !== "string" || !isAbsolute(value.immutable_run_root)) errors.push("immutable_run_root must be absolute");
  if (typeof value.pointer_path !== "string" || !isAbsolute(value.pointer_path)) errors.push("pointer_path must be absolute");
  if (typeof value.run_root === "string" && isAbsolute(value.run_root)
    && typeof value.pointer_path === "string" && value.pointer_path !== resolve(value.run_root, "run-pointer.json")) {
    errors.push("pointer_path must be run_root/run-pointer.json");
  }
  validateLogicalOutputs(value.logical_outputs, value.immutable_run_root, errors);
  if (!["REQUIRED", "NOT_APPLICABLE"].includes(String(value.cleanupRequirement))) errors.push("cleanupRequirement invalid");
  if (!["PREPARED", "MEASURING", "FINALIZED", "CLEANUP_VERIFIED", "INVALIDATED"].includes(String(value.status))) errors.push("status invalid");
  if (typeof value.created_at !== "string" || Number.isNaN(Date.parse(value.created_at))) errors.push("created_at invalid");
  if (!isPlainObject(value.sourceFingerprint)) errors.push("sourceFingerprint must be an object");
  else {
    if (typeof value.sourceFingerprint.contract_version !== "string" || !value.sourceFingerprint.contract_version) errors.push("sourceFingerprint.contract_version missing");
    if (typeof value.sourceFingerprint.head !== "string" || !/^[0-9a-f]{7,64}$/u.test(value.sourceFingerprint.head)) errors.push("sourceFingerprint.head invalid");
    if (!Number.isInteger(value.sourceFingerprint.path_count) || Number(value.sourceFingerprint.path_count) < 0) errors.push("sourceFingerprint.path_count invalid");
    if (!isSha256(value.sourceFingerprint.path_list_sha256)) errors.push("sourceFingerprint.path_list_sha256 invalid");
    errors.push(...validateFingerprintContent(value.sourceFingerprint.application, "sourceFingerprint.application"));
    errors.push(...validateFingerprintContent(value.sourceFingerprint.producer, "sourceFingerprint.producer"));
  }
  errors.push(...validateFingerprintContent(value.applicationFingerprint, "applicationFingerprint"));
  errors.push(...validateFingerprintContent(value.producerFingerprint, "producerFingerprint"));
  if (isPlainObject(value.sourceFingerprint)
    && (!fingerprintContentEqual(value.sourceFingerprint.application, value.applicationFingerprint)
      || !fingerprintContentEqual(value.sourceFingerprint.producer, value.producerFingerprint))) {
    errors.push("sourceFingerprint application/producer must match manifest fingerprints");
  }
  if (value.inputApplicationFingerprint !== undefined) errors.push(...validateFingerprintContent(value.inputApplicationFingerprint, "inputApplicationFingerprint"));
  if (value.inputProducerFingerprint !== undefined) errors.push(...validateFingerprintContent(value.inputProducerFingerprint, "inputProducerFingerprint"));
  if (value.admissionKind !== undefined && !["planning", "refreeze", "predecessor"].includes(String(value.admissionKind))) errors.push("admissionKind invalid");
  if ((value.admissionPath === undefined) !== (value.admissionSha256 === undefined)) errors.push("admission path/hash must be present together");
  if ((value.inputApplicationFingerprint === undefined) !== (value.inputProducerFingerprint === undefined)) errors.push("input application/producer fingerprints must be present together");
  if ((value.admissionKind === undefined) !== (value.admissionPath === undefined)) errors.push("admission kind/path must be present together");
  if ((value.admissionKind === undefined) !== (value.inputApplicationFingerprint === undefined)) errors.push("admission/input fingerprints must be present together");
  if (value.admissionPath !== undefined) validateRelativePath(value.admissionPath, value.run_root, "admissionPath", errors);
  if (value.admissionSha256 !== undefined && !isSha256(value.admissionSha256)) errors.push("admissionSha256 invalid");
  if (!Array.isArray(value.mutationJournal)) errors.push("mutationJournal must be an array");
  if (!Array.isArray(value.previewProcesses)) errors.push("previewProcesses must be an array");

  if (value.cleanupRequirement === "NOT_APPLICABLE") {
    if (value.profile !== "artifact-only") errors.push("NOT_APPLICABLE manifest profile must be artifact-only");
    if (!(NOT_APPLICABLE_UNITS as readonly unknown[]).includes(value.unit_id)) errors.push("NOT_APPLICABLE manifest unit is not allowed");
    if (value.evidence_class !== "jsdom") errors.push("NOT_APPLICABLE manifest evidence_class must be jsdom");
    validateNamespaceRoles(value.namespaces, [], errors);
    if (Array.isArray(value.previewProcesses) && value.previewProcesses.length) errors.push("NOT_APPLICABLE manifest cannot launch preview processes");
    if (Array.isArray(value.mutationJournal) && value.mutationJournal.length) errors.push("NOT_APPLICABLE manifest cannot contain mutations");
    forbidManifestFields(value, [...LOCAL_FIXTURE_MANIFEST_FIELDS, ...LOCAL_BROWSER_MANIFEST_FIELDS, ...CLEANUP_MANIFEST_FIELDS], "NOT_APPLICABLE", errors);
  } else if (value.cleanupRequirement === "REQUIRED") {
    if (value.evidence_class === "local-browser") {
      const expectedRoles = LOCAL_BROWSER_NAMESPACE_ROLES[value.unit_id as keyof typeof LOCAL_BROWSER_NAMESPACE_ROLES];
      if (!expectedRoles) errors.push("local-browser manifest unit is not allowed");
      if (value.profile !== "limit") errors.push("local-browser manifest profile must be limit");
      validateNamespaceRoles(value.namespaces, expectedRoles ?? [], errors);
      validateLocalFixtureFields(value, expectedRoles ?? [], errors);
      validateLocalBrowserFields(value, expectedRoles ?? [], errors);
    } else if (value.evidence_class === "local-d1") {
      if (value.unit_id !== "UNIT-003") errors.push("local-d1 manifest unit must be UNIT-003");
      if (value.profile !== "limit") errors.push("local-d1 manifest profile must be limit");
      validateNamespaceRoles(value.namespaces, ["d1"], errors);
      validateLocalFixtureFields(value, ["d1"], errors);
      if (Array.isArray(value.previewProcesses) && value.previewProcesses.length) errors.push("local-d1 manifest cannot launch preview processes");
      forbidManifestFields(value, LOCAL_BROWSER_MANIFEST_FIELDS, "local-d1", errors);
    } else if (value.evidence_class === "hosted-d1") {
      if (value.unit_id !== "UNIT-011") errors.push("hosted-d1 manifest unit must be UNIT-011");
      if (value.profile !== "artifact-only") errors.push("hosted-d1 manifest profile must be artifact-only");
      validateNamespaceRoles(value.namespaces, [], errors);
      if (Array.isArray(value.previewProcesses) && value.previewProcesses.length) errors.push("hosted-d1 manifest cannot launch preview processes");
      if (Array.isArray(value.mutationJournal) && value.mutationJournal.length) errors.push("hosted-d1 manifest cannot contain local mutations");
      forbidManifestFields(value, [...LOCAL_FIXTURE_MANIFEST_FIELDS, ...LOCAL_BROWSER_MANIFEST_FIELDS], "hosted-d1", errors);
    } else {
      errors.push("REQUIRED manifest evidence_class invalid");
      validateNamespaceRoles(value.namespaces, [], errors);
    }
    validateLifecyclePair(value, "cleanupReceipt", "cleanupReceiptSha256", errors);
  }
  for (const key of Object.keys(value)) if (!RUN_MANIFEST_FIELDS.has(key)) errors.push(`unknown run manifest field: ${key}`);
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

export function defaultImmutableRunRoot(repoRoot = process.cwd()): string {
  return resolve(defaultEvidenceRoot(repoRoot), "runs");
}

export function resolveRunManifestPath(repoRoot: string, unit: string, explicitPath?: string): string {
  if (explicitPath) return resolve(repoRoot, explicitPath);
  const plan = readJsonFile<{
    runtime_evidence?: { latest_unit_id?: unknown; latest_run_id?: unknown };
  }>(resolve(defaultPlanRoot(repoRoot), "plan-pack.json"));
  const latestUnitId = plan.runtime_evidence?.latest_unit_id;
  const latestRunId = plan.runtime_evidence?.latest_run_id;
  if (latestUnitId !== unit || typeof latestRunId !== "string" || !latestRunId) {
    throw new Error(`plan state does not identify a committed prepared run for ${unit}`);
  }
  const unitRoot = resolve(defaultRunRoot(repoRoot), unit);
  if (!existsSync(unitRoot)) throw new Error(`no prepared run exists for ${unit}`);
  const candidates = readdirSync(unitRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => resolve(unitRoot, entry.name, "run-manifest.json"))
    .filter((path) => existsSync(path))
    .map((path) => ({ path, manifest: readJsonFile<RunManifestV1>(path) }))
    .filter(({ manifest }) => manifest.unit_id === unit && manifest.run_id === latestRunId && manifest.status === "PREPARED");
  if (!candidates.length) throw new Error(`no committed prepared run exists for ${unit}/${latestRunId}`);
  if (candidates.length !== 1) throw new Error(`committed prepared run is ambiguous for ${unit}/${latestRunId}`);
  return candidates[0]!.path;
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
