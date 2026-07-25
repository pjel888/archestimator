import { readFile } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";
import { readJson, sha256, type QualityFinding } from "./common";

export const COMPONENT_PROFILES = [
  "Q1_CHANGE_GATE",
  "Q2_CRITICAL_CHANGE_GATE",
  "Q3_RELEASE_GATE",
] as const;

export type ComponentProfile = (typeof COMPONENT_PROFILES)[number];
export type CoverageMetric = "statements" | "branches" | "functions" | "lines";

export interface ComponentEvidenceRule {
  id: string;
  source_patterns: string[];
  test_patterns: string[];
}

export interface ComponentEvidenceMap {
  schema_version: 1;
  component_scope_patterns: string[];
  affected_rules: ComponentEvidenceRule[];
  critical_capabilities: Record<string, string[]>;
}

export interface VitestAssertion {
  ancestorTitles?: string[];
  fullName?: string;
  title?: string;
  status?: string;
  failureMessages?: string[];
}

export interface VitestFileResult {
  name?: string;
  status?: string;
  message?: string;
  assertionResults?: VitestAssertion[];
}

export interface VitestJsonReport {
  success?: boolean;
  numTotalTests?: number;
  numFailedTests?: number;
  numPendingTests?: number;
  testResults?: VitestFileResult[];
  unhandledErrors?: unknown[];
}

export interface LeafFailure {
  identity: string;
  file: string;
  test: string;
  kind: "test_failure" | "collection_failure" | "unhandled_error";
  signature: string;
}

export interface CoverageValue {
  total: number;
  covered: number;
  skipped: number;
  pct: number;
}

export type CoverageMetrics = Record<CoverageMetric, CoverageValue>;
export type CoverageSummary = Record<string, CoverageMetrics>;

export interface ComponentBaseline {
  schema_version: 1;
  status: "admitted";
  source: {
    command: string;
    report: string;
    report_sha256: string;
    coverage: string;
    coverage_sha256: string;
  };
  admission: {
    inventory: string;
    inventory_sha256: string;
    validation_artifact: string;
    validation_sha256: string;
    quality_review_artifact: string;
    quality_review_sha256: string;
    security_review_artifact: string;
    security_review_sha256: string;
  };
  suite: {
    test_files: string[];
    total_tests: number;
  };
  allowed_failures: Array<LeafFailure & {
    classification: "ratchet_noncritical";
    owner: string;
    rationale: string;
    expires_at: string;
    quality_reviewer: string;
    security_reviewer: string;
  }>;
  coverage: CoverageSummary;
}

export function validateComponentProfileSelection(
  requested: ComponentProfile | undefined,
  classified: ComponentProfile | undefined,
): QualityFinding[] {
  if (!requested || !classified) return [];
  if (COMPONENT_PROFILES.indexOf(requested) < COMPONENT_PROFILES.indexOf(classified)) {
    return [{
      code: "COMPONENT_PROFILE_DOWNGRADE",
      message: `Requested ${requested} is weaker than classified ${classified}`,
    }];
  }
  return [];
}

function normalizePath(path: string): string {
  return path.split(sep).join("/");
}

function escapeRegex(value: string): string {
  return value.replace(/[|\\{}()[\]^$+?.]/gu, "\\$&");
}

export function globMatches(path: string, pattern: string): boolean {
  const normalizedPath = normalizePath(path);
  const normalizedPattern = normalizePath(pattern);
  let expression = "";
  for (let index = 0; index < normalizedPattern.length; index += 1) {
    const character = normalizedPattern[index];
    if (character !== "*") {
      expression += escapeRegex(character);
      continue;
    }
    if (normalizedPattern[index + 1] === "*") {
      index += 1;
      if (normalizedPattern[index + 1] === "/") {
        index += 1;
        expression += "(?:.*/)?";
      } else {
        expression += ".*";
      }
    } else {
      expression += "[^/]*";
    }
  }
  return new RegExp(`^${expression}$`, "u").test(normalizedPath);
}

function matchingPaths(paths: string[], patterns: string[]): string[] {
  return paths.filter((path) => patterns.some((pattern) => globMatches(path, pattern)));
}

export function selectStrictComponentTests(
  changedFiles: string[],
  affectedCapabilities: string[],
  availableTests: string[],
  evidenceMap: ComponentEvidenceMap,
): { tests: string[]; findings: QualityFinding[]; componentFiles: string[] } {
  const findings: QualityFinding[] = [];
  const componentFiles = matchingPaths(
    [...new Set(changedFiles)].sort(),
    evidenceMap.component_scope_patterns,
  );
  const selected = new Set<string>();

  for (const file of componentFiles) {
    const rules = evidenceMap.affected_rules.filter((rule) =>
      rule.source_patterns.some((pattern) => globMatches(file, pattern))
    );
    if (rules.length === 0) {
      findings.push({
        code: "COMPONENT_MAPPING_MISSING",
        message: `Component-relevant path ${file} has no affected-test mapping`,
        path: file,
      });
      continue;
    }
    const mapped = matchingPaths(
      availableTests,
      rules.flatMap((rule) => rule.test_patterns),
    );
    if (mapped.length === 0) {
      findings.push({
        code: "COMPONENT_MAPPING_EMPTY",
        message: `Component-relevant path ${file} maps to no collected test file`,
        path: file,
      });
    }
    mapped.forEach((test) => selected.add(test));
  }

  for (const capability of [...new Set(affectedCapabilities)].sort()) {
    const patterns = evidenceMap.critical_capabilities[capability];
    if (!patterns) {
      findings.push({
        code: "CRITICAL_COMPONENT_MAPPING_MISSING",
        message: `Affected critical capability ${capability} has no component-test mapping`,
      });
      continue;
    }
    const mapped = matchingPaths(availableTests, patterns);
    if (mapped.length === 0) {
      findings.push({
        code: "CRITICAL_COMPONENT_MAPPING_EMPTY",
        message: `Affected critical capability ${capability} maps to no collected test file`,
      });
    }
    mapped.forEach((test) => selected.add(test));
  }

  return {
    tests: [...selected].sort(),
    findings,
    componentFiles,
  };
}

function normalizedSignature(message: string): string {
  return message
    .replace(/\u001b\[[0-9;]*m/gu, "")
    .replaceAll("\\", "/")
    .replace(/(?:file:\/\/)?(?:[A-Za-z]:)?\/[^\s:)]+/gu, "<path>")
    .replace(/:\d+:\d+/gu, ":<line>:<column>")
    .replace(/\s+/gu, " ")
    .trim()
    .slice(0, 500);
}

function relativeTestPath(root: string, path: string): string {
  const resolved = resolve(path);
  return normalizePath(relative(root, resolved));
}

function failureIdentity(
  kind: LeafFailure["kind"],
  file: string,
  test: string,
  signature: string,
): string {
  return [kind, file, test, signature].join("\u0000");
}

function collectTestFiles(report: VitestJsonReport, root: string): string[] {
  return (report.testResults ?? [])
    .map((result) => result.name)
    .filter((name): name is string => Boolean(name))
    .map((name) => relativeTestPath(root, name))
    .sort();
}

function isSkippedAssertionStatus(status: string | undefined): boolean {
  return status === "pending" || status === "skipped" || status === "todo";
}

function assertionDisplayName(assertion: VitestAssertion): string {
  return assertion.fullName ?? assertion.title ?? "<unnamed test>";
}

function assertionFailureName(assertion: VitestAssertion): string {
  return (
    assertion.fullName ??
    [...(assertion.ancestorTitles ?? []), assertion.title ?? "<unnamed test>"].join(" > ")
  );
}

function assertionFailureSignature(assertion: VitestAssertion): string {
  return normalizedSignature(
    (assertion.failureMessages ?? []).join("\n") || "<missing failure message>",
  );
}

function appendAssertionOutcome(
  assertion: VitestAssertion,
  file: string,
  failures: LeafFailure[],
  findings: QualityFinding[],
): void {
  if (isSkippedAssertionStatus(assertion.status)) {
    findings.push({
      code: "COMPONENT_TEST_SKIPPED",
      message: `${file}: ${assertionDisplayName(assertion)}`,
      path: file,
    });
  }
  if (assertion.status !== "failed") return;

  const test = assertionFailureName(assertion);
  const signature = assertionFailureSignature(assertion);
  failures.push({
    identity: failureIdentity("test_failure", file, test, signature),
    file,
    test,
    kind: "test_failure",
    signature,
  });
}

function appendTestResultFailures(
  result: VitestFileResult,
  root: string,
  failures: LeafFailure[],
  findings: QualityFinding[],
): void {
  const file = result.name ? relativeTestPath(root, result.name) : "<unknown-test-file>";
  const assertions = result.assertionResults ?? [];
  for (const assertion of assertions) {
    appendAssertionOutcome(assertion, file, failures, findings);
  }
  if (result.status !== "failed" || assertions.some((assertion) => assertion.status === "failed")) {
    return;
  }

  const signature = normalizedSignature(result.message || "<missing collection failure>");
  failures.push({
    identity: failureIdentity("collection_failure", file, "<collection>", signature),
    file,
    test: "<collection>",
    kind: "collection_failure",
    signature,
  });
  findings.push({
    code: "COMPONENT_COLLECTION_FAILURE",
    message: `${file}: ${signature}`,
    path: file,
  });
}

function appendUnhandledFailures(
  errors: unknown[],
  failures: LeafFailure[],
  findings: QualityFinding[],
): void {
  for (const [index, error] of errors.entries()) {
    const signature = normalizedSignature(
      typeof error === "string" ? error : JSON.stringify(error),
    );
    failures.push({
      identity: failureIdentity("unhandled_error", "<runtime>", String(index), signature),
      file: "<runtime>",
      test: String(index),
      kind: "unhandled_error",
      signature,
    });
    findings.push({
      code: "COMPONENT_UNHANDLED_ERROR",
      message: signature,
    });
  }
}

function deduplicateFailures(failures: LeafFailure[]): LeafFailure[] {
  return [...new Map(failures.map((failure) => [failure.identity, failure])).values()].sort(
    (left, right) => left.identity.localeCompare(right.identity),
  );
}

export function normalizeVitestFailures(
  report: VitestJsonReport,
  root: string,
): { failures: LeafFailure[]; findings: QualityFinding[]; testFiles: string[] } {
  const failures: LeafFailure[] = [];
  const findings: QualityFinding[] = [];
  const testFiles = collectTestFiles(report, root);
  if ((report.numPendingTests ?? 0) > 0) {
    findings.push({
      code: "COMPONENT_TEST_SKIPPED",
      message: `Vitest reported ${report.numPendingTests} skipped or pending test(s)`,
    });
  }

  for (const result of report.testResults ?? []) {
    appendTestResultFailures(result, root, failures, findings);
  }
  appendUnhandledFailures(report.unhandledErrors ?? [], failures, findings);

  return {
    failures: deduplicateFailures(failures),
    findings,
    testFiles,
  };
}

function isSha256(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/u.test(value);
}

function validateBaselineAdmissionDecision(baseline: ComponentBaseline): QualityFinding[] {
  if (baseline.schema_version === 1 && baseline.status === "admitted") return [];
  return [{
    code: "COMPONENT_BASELINE_NOT_ADMITTED",
    message: "Component baseline is missing an admitted schema-version-1 decision",
  }];
}

function validateBaselineSource(baseline: ComponentBaseline): QualityFinding[] {
  if (
    baseline.source?.command &&
    baseline.source?.report &&
    !baseline.source.report.startsWith(".omx/") &&
    isSha256(baseline.source.report_sha256) &&
    baseline.source?.coverage &&
    !baseline.source.coverage.startsWith(".omx/") &&
    isSha256(baseline.source.coverage_sha256)
  ) {
    return [];
  }
  return [{
    code: "COMPONENT_BASELINE_SOURCE_MALFORMED",
    message: "Component baseline source evidence is missing or malformed",
  }];
}

function validateBaselineAdmissionFields(baseline: ComponentBaseline): QualityFinding[] {
  const findings: QualityFinding[] = [];
  for (const [field, value] of Object.entries(baseline.admission ?? {})) {
    if (!value) {
      findings.push({
        code: "COMPONENT_BASELINE_ADMISSION_MALFORMED",
        message: `Component baseline admission.${field} is missing`,
      });
    }
    if (field.endsWith("_sha256") && !isSha256(value)) {
      findings.push({
        code: "COMPONENT_BASELINE_ADMISSION_MALFORMED",
        message: `Component baseline admission.${field} is not a SHA-256 digest`,
      });
    }
  }
  if (!baseline.admission || Object.keys(baseline.admission).length !== 8) {
    findings.push({
      code: "COMPONENT_BASELINE_ADMISSION_MALFORMED",
      message: "Component baseline lacks the complete independently reviewed admission binding",
    });
  }
  return findings;
}

function validateCanonicalAdmissionPaths(baseline: ComponentBaseline): QualityFinding[] {
  const findings: QualityFinding[] = [];
  for (const path of [
    baseline.admission?.inventory,
    baseline.admission?.validation_artifact,
  ]) {
    if (!path || path.startsWith(".omx/")) {
      findings.push({
        code: "COMPONENT_BASELINE_ADMISSION_MALFORMED",
        message: "Canonical baseline admission artifacts must be available in CI",
        path,
      });
    }
  }
  return findings;
}

function validateCanonicalReviewPaths(baseline: ComponentBaseline): QualityFinding[] {
  const findings: QualityFinding[] = [];
  for (const path of [
    baseline.admission?.quality_review_artifact,
    baseline.admission?.security_review_artifact,
  ]) {
    if (!path || !/^(?:quality\/reviews\/|artifacts\/quality\/).+/u.test(path)) {
      findings.push({
        code: "COMPONENT_BASELINE_ADMISSION_MALFORMED",
        message: "Canonical baseline review artifacts must be tracked or downloaded in CI",
        path,
      });
    }
  }
  return findings;
}

function validateBaselineShape(baseline: ComponentBaseline): QualityFinding[] {
  if (
    baseline.suite &&
    Array.isArray(baseline.suite.test_files) &&
    new Set(baseline.suite.test_files).size === baseline.suite.test_files.length &&
    Number.isInteger(baseline.suite.total_tests) &&
    baseline.suite.total_tests >= 0 &&
    Array.isArray(baseline.allowed_failures) &&
    baseline.coverage &&
    typeof baseline.coverage === "object"
  ) {
    return [];
  }
  return [{
    code: "COMPONENT_BASELINE_SHAPE_MALFORMED",
    message: "Component baseline suite, failures, or coverage shape is malformed",
  }];
}

function isIllegalBaselineFailure(
  failure: ComponentBaseline["allowed_failures"][number],
  now: number,
): boolean {
  return (
    failure.classification !== "ratchet_noncritical" ||
    failure.kind !== "test_failure" ||
    !failure.owner ||
    !failure.rationale ||
    !failure.quality_reviewer ||
    !failure.security_reviewer ||
    failure.quality_reviewer === failure.security_reviewer ||
    Number.isNaN(Date.parse(failure.expires_at)) ||
    Date.parse(failure.expires_at) <= now
  );
}

function validateAllowedBaselineFailures(
  baseline: ComponentBaseline,
  now: number,
): QualityFinding[] {
  const findings: QualityFinding[] = [];
  const identities = new Set<string>();
  for (const failure of baseline.allowed_failures ?? []) {
    if (identities.has(failure.identity)) {
      findings.push({
        code: "COMPONENT_BASELINE_DUPLICATE_IDENTITY",
        message: `Baseline repeats failure identity ${failure.identity}`,
      });
    }
    identities.add(failure.identity);
    if (isIllegalBaselineFailure(failure, now)) {
      findings.push({
        code: "COMPONENT_BASELINE_ILLEGAL_DEBT",
        message: `Baseline failure ${failure.identity} is not current, independent, noncritical test debt`,
      });
    }
  }
  return findings;
}

export function validateComponentBaseline(
  baseline: ComponentBaseline,
  now = Date.now(),
): QualityFinding[] {
  return [
    ...validateBaselineAdmissionDecision(baseline),
    ...validateBaselineSource(baseline),
    ...validateBaselineAdmissionFields(baseline),
    ...validateCanonicalAdmissionPaths(baseline),
    ...validateCanonicalReviewPaths(baseline),
    ...validateBaselineShape(baseline),
    ...validateAllowedBaselineFailures(baseline, now),
  ];
}

interface BaselineInventory {
  schema_version?: number;
  admission?: {
    phase?: string;
    status?: string;
    quality_review?: { status?: string; inventory_sha256?: string | null };
    security_review?: { status?: string; inventory_sha256?: string | null };
  };
  records?: Array<{
    file?: string;
    test_or_scenario?: string;
    failure_kind?: string;
    normalized_signature?: string;
    classification?: string;
    status?: string;
  }>;
}

interface BaselineValidation {
  status?: string;
  data?: { phase?: string; inventory_sha256?: string };
}

interface ReviewDecision {
  decision?: string;
  inventorySha?: string;
  reviewer?: string;
}

type BaselineArtifact = readonly [label: string, path: string, expectedSha: string];

function reviewDecision(text: string): ReviewDecision {
  return {
    decision: text.match(/(?:Decision|Status)\s*:\s*`?(APPROVE|REJECT)`?/iu)?.[1],
    inventorySha: text.match(/Inventory SHA-?256\s*:\s*`?([a-f0-9]{64})`?/iu)?.[1],
    reviewer: text.match(/Reviewer\s*:\s*`?([^`\r\n]+)`?/iu)?.[1]?.trim(),
  };
}

function canonicalBaselineArtifacts(baseline: ComponentBaseline): BaselineArtifact[] {
  return [
    ["source report", baseline.source.report, baseline.source.report_sha256],
    ["source coverage", baseline.source.coverage, baseline.source.coverage_sha256],
    ["inventory", baseline.admission.inventory, baseline.admission.inventory_sha256],
    [
      "validation",
      baseline.admission.validation_artifact,
      baseline.admission.validation_sha256,
    ],
    [
      "quality review",
      baseline.admission.quality_review_artifact,
      baseline.admission.quality_review_sha256,
    ],
    [
      "security review",
      baseline.admission.security_review_artifact,
      baseline.admission.security_review_sha256,
    ],
  ];
}

async function validateBaselineArtifactHashes(
  root: string,
  baseline: ComponentBaseline,
): Promise<QualityFinding[]> {
  const findings: QualityFinding[] = [];
  for (const [label, path, expectedSha] of canonicalBaselineArtifacts(baseline)) {
    if (path.startsWith(".omx/")) {
      findings.push({
        code: "COMPONENT_BASELINE_ARTIFACT_NOT_CI_AVAILABLE",
        message: `Canonical baseline ${label} cannot rely on ignored OMX state`,
        path,
      });
      continue;
    }
    try {
      const actualSha = sha256(await readFile(resolve(root, path)));
      if (actualSha !== expectedSha) {
        findings.push({
          code: "COMPONENT_BASELINE_ARTIFACT_HASH",
          message: `Canonical baseline ${label} hash does not match ${path}`,
          path,
        });
      }
    } catch {
      findings.push({
        code: "COMPONENT_BASELINE_ARTIFACT_MISSING",
        message: `Canonical baseline ${label} artifact is missing`,
        path,
      });
    }
  }
  return findings;
}

function inventoryIsAdmitted(
  inventory: BaselineInventory,
  expectedSha: string,
): boolean {
  return (
    inventory.schema_version === 1 &&
    inventory.admission?.phase === "admission" &&
    inventory.admission?.quality_review?.status === "approved" &&
    inventory.admission?.security_review?.status === "approved" &&
    inventory.admission.quality_review.inventory_sha256 === expectedSha &&
    inventory.admission.security_review.inventory_sha256 === expectedSha
  );
}

function admittedInventoryIdentities(inventory: BaselineInventory): Set<string> {
  return new Set(
    (inventory.records ?? [])
      .filter(
        (record) =>
          record.classification === "ratchet_noncritical" &&
          record.status === "admitted" &&
          record.failure_kind === "failed_test",
      )
      .map((record) =>
        [
          "test_failure",
          record.file,
          record.test_or_scenario,
          record.normalized_signature,
        ].join("\u0000")
      ),
  );
}

function identitySetsMatch(left: Set<string>, right: Set<string>): boolean {
  return left.size === right.size && [...left].every((identity) => right.has(identity));
}

async function validateBaselineInventory(
  root: string,
  baseline: ComponentBaseline,
): Promise<QualityFinding[]> {
  const findings: QualityFinding[] = [];
  try {
    const inventory = await readJson<BaselineInventory>(
      resolve(root, baseline.admission.inventory),
    );
    if (!inventoryIsAdmitted(inventory, baseline.admission.inventory_sha256)) {
      findings.push({
        code: "COMPONENT_BASELINE_INVENTORY_NOT_ADMITTED",
        message: "Canonical baseline inventory lacks two approved reviews bound to its hash",
      });
    }
    const admittedIdentities = admittedInventoryIdentities(inventory);
    const baselineIdentities = new Set(
      baseline.allowed_failures.map((failure) => failure.identity),
    );
    if (!identitySetsMatch(admittedIdentities, baselineIdentities)) {
      findings.push({
        code: "COMPONENT_BASELINE_INVENTORY_MISMATCH",
        message: "Allowed failures do not exactly match admitted noncritical inventory identities",
      });
    }
  } catch (error) {
    findings.push({
      code: "COMPONENT_BASELINE_INVENTORY_MALFORMED",
      message: `Canonical baseline inventory is malformed: ${String(error)}`,
      path: baseline.admission.inventory,
    });
  }
  return findings;
}

function validationApprovesInventory(
  validation: BaselineValidation,
  expectedSha: string,
): boolean {
  return (
    validation.status === "PASS" &&
    validation.data?.phase === "admission" &&
    validation.data?.inventory_sha256 === expectedSha
  );
}

async function validateBaselineValidationArtifact(
  root: string,
  baseline: ComponentBaseline,
): Promise<QualityFinding[]> {
  const findings: QualityFinding[] = [];
  try {
    const validation = await readJson<BaselineValidation>(
      resolve(root, baseline.admission.validation_artifact),
    );
    if (!validationApprovesInventory(validation, baseline.admission.inventory_sha256)) {
      findings.push({
        code: "COMPONENT_BASELINE_ADMISSION_NOT_APPROVED",
        message: "Baseline validation artifact does not approve the bound inventory",
      });
    }
  } catch (error) {
    findings.push({
      code: "COMPONENT_BASELINE_VALIDATION_MALFORMED",
      message: `Canonical baseline validation artifact is malformed: ${String(error)}`,
      path: baseline.admission.validation_artifact,
    });
  }
  return findings;
}

async function readBaselineReviews(
  root: string,
  baseline: ComponentBaseline,
): Promise<ReviewDecision[]> {
  return Promise.all(
    [
      baseline.admission.quality_review_artifact,
      baseline.admission.security_review_artifact,
    ].map(async (path): Promise<ReviewDecision> => {
      try {
        return reviewDecision(await readFile(resolve(root, path), "utf8"));
      } catch {
        return {};
      }
    }),
  );
}

function validateBaselineReviews(
  baseline: ComponentBaseline,
  reviews: ReviewDecision[],
): QualityFinding[] {
  const findings: QualityFinding[] = [];
  for (const [index, review] of reviews.entries()) {
    if (
      review.decision !== "APPROVE" ||
      review.inventorySha !== baseline.admission.inventory_sha256 ||
      !review.reviewer
    ) {
      findings.push({
        code: "COMPONENT_BASELINE_REVIEW_INVALID",
        message: `${index === 0 ? "Quality" : "Security"} review does not independently approve the bound inventory`,
      });
    }
  }
  if (reviews[0]?.reviewer && reviews[0].reviewer === reviews[1]?.reviewer) {
    findings.push({
      code: "COMPONENT_BASELINE_REVIEW_NOT_INDEPENDENT",
      message: "Quality and security baseline reviews must name different reviewers",
    });
  }
  return findings;
}

export async function validateCanonicalBaselineArtifacts(
  root: string,
  baseline: ComponentBaseline,
): Promise<QualityFinding[]> {
  const findings = validateComponentBaseline(baseline);
  if (findings.some((finding) => finding.code.startsWith("COMPONENT_BASELINE_"))) {
    return findings;
  }

  findings.push(...await validateBaselineArtifactHashes(root, baseline));
  findings.push(...await validateBaselineInventory(root, baseline));
  findings.push(...await validateBaselineValidationArtifact(root, baseline));
  const reviews = await readBaselineReviews(root, baseline);
  findings.push(...validateBaselineReviews(baseline, reviews));
  return findings;
}

function findNewComponentFailures(
  failures: LeafFailure[],
  admittedFailures: ComponentBaseline["allowed_failures"],
): QualityFinding[] {
  const findings: QualityFinding[] = [];
  const admitted = new Set(admittedFailures.map((failure) => failure.identity));
  for (const failure of failures) {
    if (failure.kind !== "test_failure") continue;
    if (!admitted.has(failure.identity)) {
      findings.push({
        code: "COMPONENT_FAILURE_NEW_OR_SWAPPED",
        message: `${failure.file}: ${failure.test}`,
        path: failure.file,
        detail: { identity: failure.identity },
      });
    }
  }
  return findings;
}

function findRemovedComponentTestFiles(
  currentTestFiles: string[],
  baselineTestFiles: string[],
): QualityFinding[] {
  const findings: QualityFinding[] = [];
  const currentFiles = new Set(currentTestFiles);
  for (const file of baselineTestFiles) {
    if (!currentFiles.has(file)) {
      findings.push({
        code: "COMPONENT_TEST_FILE_REMOVED",
        message: `Baseline test file ${file} was not collected`,
        path: file,
      });
    }
  }
  return findings;
}

function findComponentTestCountRegression(
  report: VitestJsonReport,
  minimumTests: number,
): QualityFinding[] {
  if ((report.numTotalTests ?? -1) >= minimumTests) return [];
  return [{
    code: "COMPONENT_TEST_COUNT_REGRESSION",
    message: `Collected ${report.numTotalTests ?? 0} tests; baseline requires at least ${minimumTests}`,
  }];
}

function findComponentCoverageRegressions(
  coverage: CoverageSummary,
  baselineCoverage: CoverageSummary,
): QualityFinding[] {
  const findings: QualityFinding[] = [];
  for (const [file, baselineMetrics] of Object.entries(baselineCoverage)) {
    const currentMetrics = coverage[file];
    if (!currentMetrics) {
      findings.push({
        code: "COMPONENT_COVERAGE_FILE_MISSING",
        message: `Coverage no longer reports ${file}`,
        path: file,
      });
      continue;
    }
    for (const metric of ["statements", "branches", "functions", "lines"] as const) {
      if (currentMetrics[metric].pct < baselineMetrics[metric].pct) {
        findings.push({
          code: "COMPONENT_COVERAGE_REGRESSION",
          message: `${file} ${metric} coverage ${currentMetrics[metric].pct} is below baseline ${baselineMetrics[metric].pct}`,
          path: file,
        });
      }
    }
  }
  return findings;
}

export function compareComponentRatchet(
  report: VitestJsonReport,
  coverage: CoverageSummary,
  baseline: ComponentBaseline,
  root: string,
  now = Date.now(),
): QualityFinding[] {
  const normalized = normalizeVitestFailures(report, root);
  const findings = [...normalized.findings, ...validateComponentBaseline(baseline, now)];
  if (findings.some((finding) => finding.code.startsWith("COMPONENT_BASELINE_"))) {
    return findings;
  }

  findings.push(...findNewComponentFailures(normalized.failures, baseline.allowed_failures));
  findings.push(
    ...findRemovedComponentTestFiles(normalized.testFiles, baseline.suite.test_files),
  );
  findings.push(...findComponentTestCountRegression(report, baseline.suite.total_tests));
  findings.push(...findComponentCoverageRegressions(coverage, baseline.coverage));
  return findings;
}

export function evaluateRawGreenComponentRun(
  report: VitestJsonReport,
  root: string,
): QualityFinding[] {
  const normalized = normalizeVitestFailures(report, root);
  const findings = [...normalized.findings];
  for (const failure of normalized.failures) {
    findings.push({
      code:
        failure.kind === "test_failure"
          ? "COMPONENT_TEST_FAILED"
          : failure.kind === "collection_failure"
            ? "COMPONENT_COLLECTION_FAILURE"
            : "COMPONENT_UNHANDLED_ERROR",
      message: `${failure.file}: ${failure.test}`,
      path: failure.file === "<runtime>" ? undefined : failure.file,
      detail: { identity: failure.identity },
    });
  }
  if (report.success !== true || (report.numFailedTests ?? 0) > 0) {
    findings.push({
      code: "COMPONENT_RUN_NOT_GREEN",
      message: "Vitest component report did not record an unqualified green run",
    });
  }
  return [...new Map(findings.map((finding) => [
    `${finding.code}\u0000${finding.message}`,
    finding,
  ])).values()];
}
