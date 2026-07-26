import { readFile } from "node:fs/promises";
import { posix, relative, resolve, sep } from "node:path";
import { readJson, sha256, type QualityFinding } from "./common";
import { candidateDigest, type CandidateRecord } from "./candidate-core";

export const COMPONENT_PROFILES = [
  "Q1_CHANGE_GATE",
  "Q2_CRITICAL_CHANGE_GATE",
  "Q3_RELEASE_GATE",
] as const;

export const COMPONENT_BASELINE_MEASUREMENT_COMMAND =
  "bun x vitest run --maxWorkers=1 --coverage --coverage.reportOnFailure=true --reporter=json";

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

export interface ComponentTestPartition {
  functional: string[];
  performance: string[];
}

export function partitionComponentPerformanceTests(tests: string[]): ComponentTestPartition {
  const performance = tests.filter((path) => path.startsWith("tests/vitest/perf/"));
  const performanceSet = new Set(performance);
  return {
    functional: tests.filter((path) => !performanceSet.has(path)),
    performance,
  };
}

export function combineVitestReports(reports: VitestJsonReport[]): VitestJsonReport {
  return {
    success: reports.every((report) => report.success === true),
    numTotalTests: reports.reduce((total, report) => total + (report.numTotalTests ?? 0), 0),
    numFailedTests: reports.reduce((total, report) => total + (report.numFailedTests ?? 0), 0),
    numPendingTests: reports.reduce((total, report) => total + (report.numPendingTests ?? 0), 0),
    testResults: reports.flatMap((report) => report.testResults ?? []),
    unhandledErrors: reports.flatMap((report) => report.unhandledErrors ?? []),
  };
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
    candidate: { record: CandidateRecord; digest: string };
    measurement: {
      integrity_status: "PASS";
      command: string;
      duration_ms: number;
      exit_status: number;
      candidate_digest: string;
      candidate_commit: string;
      comparison_base: { input_ref: string; resolved_sha: string };
      profile: "Q2_CRITICAL_CHANGE_GATE" | "Q3_RELEASE_GATE";
      report_sha256: string;
      coverage_sha256: string;
    };
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
    candidate_digest: string;
    author_ids: string[];
    quality_reviewer: string;
    security_reviewer: string;
    review_source: "local-agent";
    reviewer_identity_assurance: "asserted-local";
    author_identity_assurance: "asserted-local";
  };
  suite: {
    test_files: string[];
    total_tests: number;
  };
  allowed_failures: Array<LeafFailure & {
    classification: "ratchet_noncritical";
    owner: string;
    rationale: string;
    acceptance: { command: string; expected_artifact: string };
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function baselineObject(value: unknown): value is ComponentBaseline {
  return isRecord(value) && isRecord(value.source) && isRecord(value.admission);
}

function sortedUniqueStrings(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string" && item.length > 0) &&
    new Set(value).size === value.length && JSON.stringify(value) === JSON.stringify([...value].sort());
}

function candidateFileIsNormalized(value: unknown): boolean {
  if (!isRecord(value) || typeof value.path !== "string" || !value.path || !isSha256(value.sha256) || typeof value.deleted !== "boolean") return false;
  const sources = value.sources;
  return sortedUniqueStrings(sources) && sources.every((source) => ["committed", "staged", "unstaged", "untracked"].includes(source));
}

function candidateRecordIsNormalized(value: unknown): value is CandidateRecord {
  if (!isRecord(value)) return false;
  return [
    candidateRecordHeaderIsNormalized(value),
    candidateRecordFilesAreNormalized(value.changed_files),
    sortedUniqueStrings(value.affected_capabilities),
  ].every(Boolean);
}

function candidateRecordHeaderIsNormalized(value: Record<string, unknown>): boolean {
  const base = value.comparison_base;
  if (!isRecord(base)) return false;
  return [
    value.schema_version === 1,
    /^[a-f0-9]{40}$/u.test(String(value.commit_sha)),
    typeof base.input_ref === "string",
    Boolean(base.input_ref),
    /^[a-f0-9]{40}$/u.test(String(base.resolved_sha)),
    ["Q2_CRITICAL_CHANGE_GATE", "Q3_RELEASE_GATE"].includes(String(value.profile)),
  ].every(Boolean);
}

function candidateRecordFilesAreNormalized(value: unknown): boolean {
  if (!Array.isArray(value) || !value.every(candidateFileIsNormalized)) return false;
  const paths = value.map((file) => (file as Record<string, unknown>).path);
  return [
    JSON.stringify(paths) === JSON.stringify([...paths].sort()),
  ].every(Boolean);
}

function validateBaselineAdmissionDecision(baseline: ComponentBaseline): QualityFinding[] {
  if (baseline.schema_version === 1 && baseline.status === "admitted") return [];
  return [{
    code: "COMPONENT_BASELINE_NOT_ADMITTED",
    message: "Component baseline is missing an admitted schema-version-1 decision",
  }];
}

function validateBaselineSource(baseline: ComponentBaseline): QualityFinding[] {
  const valid = [
    baselineSourcePointersAreValid(baseline.source),
    embeddedCandidateIsValid(baseline.source.candidate),
    embeddedMeasurementIsValid(baseline.source.measurement),
  ].every(Boolean);
  if (valid) return [];
  return [{
    code: "COMPONENT_BASELINE_SOURCE_MALFORMED",
    message: "Component baseline source evidence is missing or malformed",
  }];
}

function validateBaselineAdmissionFields(baseline: ComponentBaseline): QualityFinding[] {
  const admission = baseline.admission;
  const findings = Object.entries(admission).flatMap(([field, value]) => admissionFieldFindings(field, value));
  if (!admissionBindingIsComplete(admission)) findings.push({
      code: "COMPONENT_BASELINE_ADMISSION_MALFORMED",
      message: "Component baseline lacks the complete independently reviewed admission binding",
  });
  return findings;
}

const baselineAdmissionFieldCount = 15;

function admissionFieldFindings(field: string, value: unknown): QualityFinding[] {
  const findings: QualityFinding[] = [];
  if (!value) findings.push({
    code: "COMPONENT_BASELINE_ADMISSION_MALFORMED",
    message: `Component baseline admission.${field} is missing`,
  });
  if (field.endsWith("_sha256") && !isSha256(value)) findings.push({
    code: "COMPONENT_BASELINE_ADMISSION_MALFORMED",
    message: `Component baseline admission.${field} is not a SHA-256 digest`,
  });
  return findings;
}

function admissionBindingIsComplete(admission: ComponentBaseline["admission"]): boolean {
  return [
    Object.keys(admission).length === baselineAdmissionFieldCount,
    admission.review_source === "local-agent",
    admission.reviewer_identity_assurance === "asserted-local",
    admission.author_identity_assurance === "asserted-local",
    admissionAuthorsAreValid(admission),
    admissionReviewersAreValid(admission),
    isSha256(admission.candidate_digest),
  ].every(Boolean);
}

function admissionAuthorsAreValid(admission: ComponentBaseline["admission"]): boolean {
  return sortedUniqueStrings(admission.author_ids) && admission.author_ids.length > 0;
}

function admissionReviewersAreValid(admission: ComponentBaseline["admission"]): boolean {
  const reviewers = [admission.quality_reviewer, admission.security_reviewer];
  if (!Array.isArray(admission.author_ids)) return false;
  return [
    reviewers.every(Boolean),
    admission.quality_reviewer !== admission.security_reviewer,
    reviewers.every((reviewer) => !admission.author_ids.includes(reviewer)),
  ].every(Boolean);
}

function validateCanonicalAdmissionPaths(baseline: ComponentBaseline): QualityFinding[] {
  if (
    baseline.admission?.inventory === "quality/baselines/component/inventory.json" &&
    baseline.admission?.validation_artifact === "quality/baselines/component/admission.json"
  ) return [];
  return [{
    code: "COMPONENT_BASELINE_ADMISSION_MALFORMED",
    message: "Canonical admission must use tracked immutable component baseline paths",
  }];
}

function baselineSourcePointersAreValid(source: ComponentBaseline["source"]): boolean {
  return [
    Boolean(source.command),
    source.report === "quality/baselines/component/source.vitest.json",
    isSha256(source.report_sha256),
    source.coverage === "quality/baselines/component/coverage-summary.json",
    isSha256(source.coverage_sha256),
  ].every(Boolean);
}

function embeddedCandidateIsValid(value: unknown): boolean {
  if (!isRecord(value) || !candidateRecordIsNormalized(value.record) || !isSha256(value.digest)) return false;
  return candidateDigest(value.record) === value.digest;
}

function embeddedMeasurementIsValid(value: unknown): boolean {
  if (!isRecord(value) || !isRecord(value.comparison_base)) return false;
  return [
    value.integrity_status === "PASS",
    Boolean(value.command),
    Number.isInteger(value.duration_ms),
    Number(value.duration_ms) >= 0,
    Number.isInteger(value.exit_status),
    isSha256(value.candidate_digest),
    /^[a-f0-9]{40}$/u.test(String(value.candidate_commit)),
    Boolean(value.comparison_base.input_ref),
    /^[a-f0-9]{40}$/u.test(String(value.comparison_base.resolved_sha)),
    ["Q2_CRITICAL_CHANGE_GATE", "Q3_RELEASE_GATE"].includes(String(value.profile)),
    isSha256(value.report_sha256),
    isSha256(value.coverage_sha256),
  ].every(Boolean);
}

function validateCanonicalReviewPaths(baseline: ComponentBaseline): QualityFinding[] {
  const findings: QualityFinding[] = [];
  const expected = [
    "quality/reviews/component-baseline-quality.md",
    "quality/reviews/component-baseline-security.md",
  ];
  const actual = [baseline.admission?.quality_review_artifact, baseline.admission?.security_review_artifact];
  actual.forEach((path, index) => {
    if (path !== expected[index]) findings.push({ code: "COMPONENT_BASELINE_ADMISSION_MALFORMED", message: "Canonical baseline reviews must use their tracked immutable paths", path });
  });
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
    baseline.allowed_failures.every(isRecord) &&
    coverageSummaryIsComplete(baseline.coverage)
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
  const required = [failure.owner, failure.rationale, failure.acceptance?.command, failure.acceptance?.expected_artifact, failure.quality_reviewer, failure.security_reviewer];
  const expiry = Date.parse(failure.expires_at);
  return failure.classification !== "ratchet_noncritical" || failure.kind !== "test_failure" || required.some((value) => !value) || failure.quality_reviewer === failure.security_reviewer || Number.isNaN(expiry) || expiry <= now;
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
  baseline: ComponentBaseline | unknown,
  now = Date.now(),
): QualityFinding[] {
  if (!baselineObject(baseline)) {
    return [{ code: "COMPONENT_BASELINE_STRUCTURE_MALFORMED", message: "Component baseline must be an object with source and admission objects" }];
  }
  const decision = validateBaselineAdmissionDecision(baseline);
  const structural = [
    ...validateBaselineSource(baseline),
    ...validateBaselineAdmissionFields(baseline),
    ...validateCanonicalAdmissionPaths(baseline),
    ...validateCanonicalReviewPaths(baseline),
    ...validateBaselineShape(baseline),
  ];
  if (structural.length > 0) return [...decision, ...structural];
  return [...decision, ...validateAllowedBaselineFailures(baseline, now)];
}

const coverageMetrics: CoverageMetric[] = ["statements", "branches", "functions", "lines"];

function isNonnegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function coverageValueIsComplete(value: unknown): value is CoverageValue {
  if (!isRecord(value)) return false;
  const fields = ["total", "covered", "skipped", "pct"] as const;
  if (Object.keys(value).length !== fields.length || !fields.every((field) => field in value)) return false;
  const { total, covered, skipped, pct } = value;
  return isNonnegativeInteger(total) && isNonnegativeInteger(covered) && isNonnegativeInteger(skipped) &&
    typeof pct === "number" && Number.isFinite(pct) && pct >= 0 && pct <= 100 &&
    covered <= total && skipped <= total && covered + skipped <= total;
}

function coverageSummaryIsComplete(value: unknown): value is CoverageSummary {
  if (!isRecord(value) || !isRecord(value.total)) return false;
  return Object.values(value).every((metrics) =>
    isRecord(metrics) && Object.keys(metrics).length === coverageMetrics.length &&
    coverageMetrics.every((metric) => coverageValueIsComplete(metrics[metric])));
}

function validateCurrentCoverageShape(coverage: unknown): QualityFinding[] {
  return coverageSummaryIsComplete(coverage) ? [] : [{
    code: "COMPONENT_COVERAGE_MALFORMED",
    message: "Current component coverage must contain complete finite statements, branches, functions, and lines metrics",
  }];
}

interface BaselineInventory {
  schema_version?: number;
  admission?: {
    phase?: string;
    status?: string;
  };
  source?: {
    command?: string;
    commit?: string;
    measurement?: RetainedComponentMeasurement;
    measurement_artifact?: string;
    measurement_sha256?: string;
    artifact?: string;
    artifact_sha256?: string;
    coverage_artifact?: string;
    coverage_sha256?: string;
    candidate_artifact?: string;
    candidate_sha256?: string;
    candidate_digest?: string;
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
  data?: {
    phase?: string;
    inventory_sha256?: string;
    candidate_digest?: string;
    author_ids?: string[];
    review_source?: string;
    reviewer_identity_assurance?: string;
    author_identity_assurance?: string;
    quality_review_sha256?: string;
    security_review_sha256?: string;
  };
}

interface RetainedComponentMeasurement {
  schema_version?: number;
  integrity_status?: string;
  command?: string;
  duration_ms?: number;
  exit_status?: number | null;
  candidate?: {
    artifact?: string;
    artifact_sha256?: string;
    inner_sha256?: string;
    commit_sha?: string;
    comparison_base?: { input_ref?: string; resolved_sha?: string };
    profile?: string;
  };
  report?: { artifact?: string; sha256?: string };
  coverage?: { artifact?: string; sha256?: string };
}

interface ReviewDecision {
  decision?: string;
  inventorySha?: string;
  candidateSha?: string;
  reviewer?: string;
  role?: string;
  source?: string;
  reviewerAssurance?: string;
  authorAssurance?: string;
}

type BaselineArtifact = readonly [label: string, path: string, expectedSha: string];

function reviewDecision(text: string): ReviewDecision {
  return {
    decision: text.match(/(?:Decision|Status)\s*:\s*`?(APPROVE|REJECT)`?/iu)?.[1],
    inventorySha: text.match(/Inventory SHA-?256\s*:\s*`?([a-f0-9]{64})`?/iu)?.[1],
    candidateSha: text.match(/Candidate Digest\s*:\s*`?([a-f0-9]{64})`?/iu)?.[1],
    reviewer: text.match(/Reviewer\s*:\s*`?([^`\r\n]+)`?/iu)?.[1]?.trim(),
    role: text.match(/Reviewer Role\s*:\s*`?([^`\r\n]+)`?/iu)?.[1]?.trim(),
    source: text.match(/Source\s*:\s*`?([^`\r\n]+)`?/iu)?.[1]?.trim(),
    reviewerAssurance: text.match(/Reviewer Identity Assurance\s*:\s*`?([^`\r\n]+)`?/iu)?.[1]?.trim(),
    authorAssurance: text.match(/Author Identity Assurance\s*:\s*`?([^`\r\n]+)`?/iu)?.[1]?.trim(),
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
): boolean {
  return (
    inventory.schema_version === 1 &&
    inventory.admission?.phase === "admission" &&
    inventory.admission?.status === "review_pending"
  );
}

function admittedInventoryIdentities(inventory: BaselineInventory): Set<string> {
  return new Set(
    (inventory.records ?? [])
      .filter(
        (record) =>
          record.classification === "ratchet_noncritical" &&
          record.status === "proposed" &&
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

function runtimeInventoryIsStructured(inventory: unknown): inventory is BaselineInventory {
  return isRecord(inventory) && isRecord(inventory.source) && isRecord(inventory.admission) &&
    Array.isArray(inventory.records) && inventory.records.every(isRecord);
}

function validateBaselineInventorySourceBinding(
  baseline: ComponentBaseline,
  inventory: BaselineInventory,
): QualityFinding[] {
  const measurementFindings = validateRetainedMeasurement(inventory);
  if (
    Boolean(inventory.source?.measurement_artifact) &&
    isSha256(inventory.source?.measurement_sha256 ?? "") &&
    inventory.source?.artifact === baseline.source.report &&
    inventory.source.artifact_sha256 === baseline.source.report_sha256 &&
    inventory.source.coverage_artifact === baseline.source.coverage &&
    inventory.source.coverage_sha256 === baseline.source.coverage_sha256
  ) return measurementFindings;
  return [...measurementFindings, {
    code: "COMPONENT_BASELINE_SOURCE_INVENTORY_MISMATCH",
    message: "Canonical baseline source paths and hashes do not match the admitted inventory",
  }];
}

function validateRetainedMeasurement(inventory: BaselineInventory): QualityFinding[] {
  const measurement = inventory.source?.measurement;
  const candidate = measurement?.candidate;
  const validShape = [
    measurement?.schema_version === 1,
    measurement?.integrity_status === "PASS",
    measurement?.command === COMPONENT_BASELINE_MEASUREMENT_COMMAND,
    Number.isInteger(measurement?.duration_ms),
    Number(measurement?.duration_ms) >= 0,
    Number.isInteger(measurement?.exit_status),
    Boolean(candidate?.artifact),
    isSha256(String(candidate?.artifact_sha256)),
    isSha256(String(candidate?.inner_sha256)),
    /^[a-f0-9]{40}$/u.test(String(candidate?.commit_sha)),
    Boolean(candidate?.comparison_base?.input_ref),
    /^[a-f0-9]{40}$/u.test(String(candidate?.comparison_base?.resolved_sha)),
    ["Q2_CRITICAL_CHANGE_GATE", "Q3_RELEASE_GATE"].includes(String(candidate?.profile)),
    transientMeasurementOrigin(measurement?.report?.artifact),
    isSha256(String(measurement?.report?.sha256)),
    transientMeasurementOrigin(measurement?.coverage?.artifact),
    isSha256(String(measurement?.coverage?.sha256)),
  ].every(Boolean);
  if (!validShape) {
    return [{ code: "COMPONENT_BASELINE_MEASUREMENT_PROOF_INVALID", message: "Admitted inventory lacks a complete integrity-PASS measurement proof" }];
  }
  const bindingsMatch = [
    measurement.command === inventory.source?.command,
    candidate?.artifact === inventory.source?.candidate_artifact,
    candidate?.artifact_sha256 === inventory.source?.candidate_sha256,
    candidate?.inner_sha256 === inventory.source?.candidate_digest,
    candidate?.commit_sha === inventory.source?.commit,
    measurement.report?.sha256 === inventory.source?.artifact_sha256,
    measurement.coverage?.sha256 === inventory.source?.coverage_sha256,
  ].every(Boolean);
  return bindingsMatch ? [] : [{
    code: "COMPONENT_BASELINE_MEASUREMENT_PROOF_MISMATCH",
    message: "Retained measurement proof does not match inventory candidate, report, and coverage bindings",
  }];
}

function transientMeasurementOrigin(value: unknown): boolean {
  if (typeof value !== "string" || !value.trim()) return false;
  const normalized = posix.normalize(value.replaceAll("\\", "/"));
  return normalized !== "quality" && !normalized.startsWith("quality/");
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
    if (!runtimeInventoryIsStructured(inventory)) {
      return [{ code: "COMPONENT_BASELINE_INVENTORY_MALFORMED", message: "Canonical baseline inventory has invalid source, admission, or records structure", path: baseline.admission.inventory }];
    }
    if (!inventoryIsAdmitted(inventory)) {
      findings.push({
        code: "COMPONENT_BASELINE_INVENTORY_NOT_ADMITTED",
        message: "Canonical baseline inventory lacks two approved reviews bound to its hash",
      });
    }
    findings.push(...validateBaselineInventorySourceBinding(baseline, inventory));
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
  candidateDigestValue: string | undefined,
): boolean {
  return (
    validation.status === "PASS" &&
    validation.data?.phase === "admission" &&
    validation.data?.inventory_sha256 === expectedSha &&
    validation.data?.candidate_digest === candidateDigestValue &&
    Array.isArray(validation.data?.author_ids) &&
    validation.data.author_ids.length > 0 &&
    validation.data.review_source === "local-agent" &&
    validation.data.reviewer_identity_assurance === "asserted-local" &&
    validation.data.author_identity_assurance === "asserted-local"
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
    const inventory = await readJson<BaselineInventory>(resolve(root, baseline.admission.inventory));
    if (!runtimeInventoryIsStructured(inventory)) {
      return [{ code: "COMPONENT_BASELINE_VALIDATION_MALFORMED", message: "Admission validation cannot bind a malformed inventory", path: baseline.admission.validation_artifact }];
    }
    if (!validationApprovesInventory(validation, baseline.admission.inventory_sha256, inventory.source?.candidate_digest)) {
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
  candidateSha: string | undefined,
  authors: string[],
  reviews: ReviewDecision[],
): QualityFinding[] {
  const findings = reviews.flatMap((review, index) => validateOneBaselineReview(review, index, baseline.admission.inventory_sha256));
  if (reviews[0]?.reviewer && reviews[0].reviewer === reviews[1]?.reviewer) {
    findings.push({
      code: "COMPONENT_BASELINE_REVIEW_NOT_INDEPENDENT",
      message: "Quality and security baseline reviews must name different reviewers",
    });
  }
  if (!candidateSha || reviews.some((review) => review.candidateSha !== candidateSha)) {
    findings.push({ code: "COMPONENT_BASELINE_REVIEW_CANDIDATE_MISMATCH", message: "Baseline reviews do not bind the measurement candidate" });
  }
  if (reviews.some((review) => review.role?.toLowerCase() !== "read-only")) {
    findings.push({ code: "COMPONENT_BASELINE_REVIEW_NOT_READ_ONLY", message: "Baseline reviewers must record a read-only role" });
  }
  if (reviews.some((review) => review.source !== "local-agent" || review.reviewerAssurance !== "asserted-local" || review.authorAssurance !== "asserted-local")) {
    findings.push({ code: "COMPONENT_BASELINE_REVIEW_ASSURANCE_INVALID", message: "Baseline reviews must honestly assert local-agent reviewer and author identity assurance" });
  }
  if (reviews.some((review) => review.reviewer && authors.includes(review.reviewer))) {
    findings.push({ code: "COMPONENT_BASELINE_REVIEW_IS_AUTHOR", message: "Baseline authors cannot approve their own inventory" });
  }
  return findings;
}

export function validateCanonicalGenerationBindings(input: {
  inventoryRaw: Buffer;
  validationRaw: Buffer;
  reportRaw: Buffer;
  coverageRaw: Buffer;
  candidateRaw?: Buffer;
  measurementRaw?: Buffer;
  expectedInventorySha256: string;
  expectedValidationSha256: string;
}): QualityFinding[] {
  const parsed = parseGenerationBindings(input);
  if ("finding" in parsed) return [parsed.finding];
  const { inventory, validation, candidateArtifact, measurementArtifact } = parsed;
  const inventorySha = sha256(input.inventoryRaw);
  return [
    ...validateGenerationByteBindings(input, inventory, validation, inventorySha),
    ...validateGenerationCandidateBinding(input.candidateRaw, candidateArtifact, inventory),
    ...validateGenerationMeasurementBinding(input.measurementRaw, measurementArtifact, inventory),
    ...validateRetainedMeasurement(inventory),
  ];
}

interface ParsedGenerationBindings {
  inventory: BaselineInventory;
  validation: BaselineValidation;
  candidateArtifact: { data?: { record?: CandidateRecord; sha256?: string } };
  measurementArtifact: { data?: { measurement?: RetainedComponentMeasurement } };
}

function parseOptionalGenerationJson(raw: Buffer | undefined): unknown {
  if (!raw) return {};
  return JSON.parse(raw.toString()) as unknown;
}

function optionalCandidateIsStructured(raw: Buffer | undefined, value: unknown): boolean {
  if (!raw) return true;
  return isRecord(value) && isRecord(value.data) && isRecord(value.data.record);
}

function optionalMeasurementIsStructured(raw: Buffer | undefined, value: unknown): boolean {
  if (!raw) return true;
  return isRecord(value) && isRecord(value.data) && isRecord(value.data.measurement);
}

function generationBindingsAreStructured(input: { candidateRaw?: Buffer; measurementRaw?: Buffer }, parsed: ParsedGenerationBindings): boolean {
  return [
    isRecord(parsed.inventory),
    isRecord(parsed.inventory.source),
    isRecord(parsed.validation),
    optionalCandidateIsStructured(input.candidateRaw, parsed.candidateArtifact),
    optionalMeasurementIsStructured(input.measurementRaw, parsed.measurementArtifact),
  ].every(Boolean);
}

function parseGenerationBindings(input: { inventoryRaw: Buffer; validationRaw: Buffer; candidateRaw?: Buffer; measurementRaw?: Buffer }): ParsedGenerationBindings | { finding: QualityFinding } {
  try {
    const parsed = {
      inventory: JSON.parse(input.inventoryRaw.toString()) as BaselineInventory,
      validation: JSON.parse(input.validationRaw.toString()) as BaselineValidation,
      candidateArtifact: parseOptionalGenerationJson(input.candidateRaw) as ParsedGenerationBindings["candidateArtifact"],
      measurementArtifact: parseOptionalGenerationJson(input.measurementRaw) as ParsedGenerationBindings["measurementArtifact"],
    };
    if (!generationBindingsAreStructured(input, parsed)) throw new Error("generation inputs lack required object structure");
    return parsed;
  } catch (error) {
    return { finding: { code: "GENERATION_BINDING_MALFORMED", message: `Canonical generation binding is malformed: ${String(error)}` } };
  }
}

function validateGenerationByteBindings(
  input: { inventoryRaw: Buffer; validationRaw: Buffer; reportRaw: Buffer; coverageRaw: Buffer; expectedInventorySha256: string; expectedValidationSha256: string },
  inventory: BaselineInventory,
  validation: BaselineValidation,
  inventorySha: string,
): QualityFinding[] {
  const findings: QualityFinding[] = [];
  if (inventorySha !== input.expectedInventorySha256) {
    findings.push({ code: "GENERATION_INVENTORY_DRIFT", message: "Admission inventory changed after validation" });
  }
  if (sha256(input.validationRaw) !== input.expectedValidationSha256) {
    findings.push({ code: "GENERATION_ADMISSION_DRIFT", message: "Admission validation artifact changed before canonical generation" });
  }
  if (!validationApprovesInventory(validation, inventorySha, inventory.source?.candidate_digest)) {
    findings.push({ code: "GENERATION_ADMISSION_BINDING_MISMATCH", message: "Admission validation no longer binds the exact inventory and candidate" });
  }
  if (sha256(input.reportRaw) !== inventory.source?.artifact_sha256) {
    findings.push({ code: "GENERATION_REPORT_DRIFT", message: "Source report bytes no longer match the admitted inventory" });
  }
  if (sha256(input.coverageRaw) !== inventory.source?.coverage_sha256) {
    findings.push({ code: "GENERATION_COVERAGE_DRIFT", message: "Source coverage bytes no longer match the admitted inventory" });
  }
  return findings;
}

function validateGenerationCandidateBinding(
  raw: Buffer | undefined,
  artifact: ParsedGenerationBindings["candidateArtifact"],
  inventory: BaselineInventory,
): QualityFinding[] {
  if (!raw) return [];
  const record = artifact.data?.record;
  const digest = record ? candidateDigest(record) : "";
  const valid = [
    sha256(raw) === inventory.source?.candidate_sha256,
    digest === artifact.data?.sha256,
    digest === inventory.source?.candidate_digest,
  ].every(Boolean);
  return valid ? [] : [{ code: "GENERATION_CANDIDATE_DRIFT", message: "Candidate checkpoint bytes or inner digest no longer match the admitted inventory" }];
}

function validateGenerationMeasurementBinding(
  raw: Buffer | undefined,
  artifact: ParsedGenerationBindings["measurementArtifact"],
  inventory: BaselineInventory,
): QualityFinding[] {
  if (!raw) return [];
  const valid = [
    sha256(raw) === inventory.source?.measurement_sha256,
    JSON.stringify(artifact.data?.measurement) === JSON.stringify(inventory.source?.measurement),
  ].every(Boolean);
  return valid ? [] : [{ code: "GENERATION_MEASUREMENT_DRIFT", message: "Measurement artifact no longer matches the admitted inventory" }];
}

function validateOneBaselineReview(review: ReviewDecision, index: number, inventorySha: string): QualityFinding[] {
  if (review.decision === "APPROVE" && review.inventorySha === inventorySha && review.reviewer) return [];
  return [{ code: "COMPONENT_BASELINE_REVIEW_INVALID", message: `${index === 0 ? "Quality" : "Security"} review does not independently approve the bound inventory` }];
}

function validateEmbeddedBaselineLineage(
  baseline: ComponentBaseline,
  inventory: BaselineInventory,
  validation: BaselineValidation,
  reviews: ReviewDecision[],
): QualityFinding[] {
  const candidate = baseline.source.candidate;
  const measurement = baseline.source.measurement;
  const retained = inventory.source?.measurement;
  const digest = candidateDigest(candidate.record);
  const validationAuthors = Array.isArray(validation.data?.author_ids)
    ? [...validation.data.author_ids].sort()
    : [];
  const valid = [
    digest === candidate.digest,
    digest === inventory.source?.candidate_digest,
    digest === retained?.candidate?.inner_sha256,
    digest === measurement.candidate_digest,
    digest === baseline.admission.candidate_digest,
    digest === validation.data?.candidate_digest,
    reviews.every((review) => review.candidateSha === digest),
    candidate.record.commit_sha === measurement.candidate_commit,
    candidate.record.commit_sha === retained?.candidate?.commit_sha,
    candidate.record.commit_sha === inventory.source?.commit,
    JSON.stringify(candidate.record.comparison_base) === JSON.stringify(measurement.comparison_base),
    JSON.stringify(candidate.record.comparison_base) === JSON.stringify(retained?.candidate?.comparison_base),
    candidate.record.profile === measurement.profile,
    candidate.record.profile === retained?.candidate?.profile,
    measurement.command === retained?.command,
    measurement.duration_ms === retained?.duration_ms,
    measurement.exit_status === retained?.exit_status,
    measurement.report_sha256 === baseline.source.report_sha256,
    measurement.report_sha256 === retained?.report?.sha256,
    measurement.coverage_sha256 === baseline.source.coverage_sha256,
    measurement.coverage_sha256 === retained?.coverage?.sha256,
    JSON.stringify(baseline.admission.author_ids) === JSON.stringify(validationAuthors),
    baseline.admission.quality_reviewer === reviews[0]?.reviewer,
    baseline.admission.security_reviewer === reviews[1]?.reviewer,
  ].every(Boolean);
  return valid ? [] : [{
    code: "COMPONENT_BASELINE_EMBEDDED_LINEAGE_MISMATCH",
    message: "Embedded candidate, measurement, admission, inventory, validation, or review lineage does not form one exact chain",
  }];
}

export async function validateCanonicalBaselineArtifacts(
  root: string,
  baseline: ComponentBaseline | unknown,
): Promise<QualityFinding[]> {
  const findings = validateComponentBaseline(baseline);
  if (findings.some((finding) => finding.code.startsWith("COMPONENT_BASELINE_"))) {
    return findings;
  }

  const canonical = baseline as ComponentBaseline;
  findings.push(...await validateBaselineArtifactHashes(root, canonical));
  findings.push(...await validateBaselineInventory(root, canonical));
  findings.push(...await validateBaselineValidationArtifact(root, canonical));
  let inventory: BaselineInventory = {};
  let validation: BaselineValidation = {};
  try {
    const loaded = await readJson<BaselineInventory>(resolve(root, canonical.admission.inventory));
    if (runtimeInventoryIsStructured(loaded)) inventory = loaded;
  } catch {
    // The inventory validator above already records the malformed artifact.
  }
  try {
    validation = await readJson<BaselineValidation>(resolve(root, canonical.admission.validation_artifact));
  } catch {
    // The validation-artifact validator above already records the malformed artifact.
  }
  const reviews = await readBaselineReviews(root, canonical);
  const validationAuthors = Array.isArray(validation.data?.author_ids) ? validation.data.author_ids : [];
  findings.push(...validateBaselineReviews(canonical, inventory.source?.candidate_digest, validationAuthors, reviews));
  findings.push(...validateEmbeddedBaselineLineage(canonical, inventory, validation, reviews));
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
  const malformed = validateCurrentCoverageShape(coverage);
  if (malformed.length > 0 || !coverageSummaryIsComplete(baselineCoverage)) return malformed.length > 0 ? malformed : [{
    code: "COMPONENT_BASELINE_SHAPE_MALFORMED",
    message: "Component baseline coverage is malformed",
  }];
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
    for (const metric of coverageMetrics) {
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
  const coverageFindings = validateCurrentCoverageShape(coverage);
  if (coverageFindings.length > 0) return [...findings, ...coverageFindings];

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
