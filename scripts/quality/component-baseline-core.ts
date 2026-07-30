import { posix, relative, resolve, sep } from "node:path";
import { COMPONENT_BASELINE_MEASUREMENT_COMMAND, globMatches, normalizeComponentCoveragePaths, validateVitestReportConsistency, type ComponentBaseline, type ComponentEvidenceMap, type CoverageSummary, type VitestAssertion, type VitestFileResult, type VitestJsonReport } from "./component-core";
import { sha256, type QualityFinding } from "./common";
import { candidateDigest, type CandidateRecord } from "./candidate-core";

export type BaselineFailureKind =
  | "failed_file"
  | "failed_test"
  | "skipped_file"
  | "skipped_test"
  | "collection_failure"
  | "unhandled_error"
  | "infrastructure_failure"
  | "malformed_evidence";

export type BaselineClassification =
  | "must_fix_critical"
  | "must_fix_infrastructure"
  | "must_fix_noncritical"
  | "ratchet_noncritical";

export interface RatchetProposal {
  owner: string;
  rationale: string;
  acceptance: { command: string; expected_artifact: string };
  expires_at: string;
}

export interface BaselineInventoryRecord {
  id: string;
  runner: string;
  file: string;
  test_or_scenario: string;
  failure_kind: BaselineFailureKind;
  normalized_signature: string;
  critical_capability_ids: string[];
  root_cause_cluster: string;
  classification: BaselineClassification;
  owner: string;
  rationale: string;
  acceptance: { command: string; expected_artifact: string };
  status: "open" | "proposed" | "closed";
  evidence_artifact: string | null;
  expires_at: string | null;
}

export interface BaselineInventory {
  schema_version: 1;
  generated_at: string;
  source: {
    runner: string;
    command: string;
    commit: string;
    measurement: ComponentMeasurementEnvelope;
    measurement_artifact: string;
    measurement_sha256: string;
    artifact: string;
    artifact_sha256: string;
    coverage_artifact: string;
    coverage_sha256: string;
    candidate_artifact: string;
    candidate_sha256: string;
    candidate_digest: string;
  };
  counts: Record<BaselineFailureKind | BaselineClassification | "total_records", number>;
  critical_capabilities: Array<{ id: string; name: string; critical: true }>;
  admission: {
    phase: "draft" | "admission";
    status: "draft" | "review_pending";
    bootstrap: boolean;
    author_ids: string[];
    open_must_fix_records: number;
    proposed_ratchet_records: number;
    quality_review: { status: "pending"; artifact: string };
    security_review: { status: "pending"; artifact: string };
  };
  identity_derivation: {
    fields: "runner,file,test_or_scenario,failure_kind,normalized_signature";
    algorithm: "sha256-prefix-20";
  };
  uncertainties: string[];
  records: BaselineInventoryRecord[];
}

export interface InventoryBuildInput {
  report: VitestJsonReport;
  reportPath: string;
  reportSha256: string;
  coveragePath: string;
  coverageSha256: string;
  candidatePath: string;
  candidateSha256: string;
  measurementPath: string;
  measurementSha256: string;
  measurement: ComponentMeasurementEnvelope;
  command: string;
  commit: string;
  generatedAt: string;
  root: string;
  evidenceMap: ComponentEvidenceMap;
  capabilities: Array<{ id: string; name: string; critical: true }>;
  proposals?: Record<string, RatchetProposal>;
  infrastructureFailure?: string;
  phase?: "draft" | "admission";
  bootstrap?: boolean;
  authorIds?: string[];
  qualityReviewPath?: string;
  securityReviewPath?: string;
}

export interface ComponentMeasurementEnvelope {
  schema_version: 1;
  integrity_status: "PASS" | "FAIL";
  command: string;
  duration_ms: number;
  exit_status: number | null;
  candidate: {
    artifact: string;
    artifact_sha256: string;
    inner_sha256: string;
    commit_sha: string;
    comparison_base: { input_ref: string; resolved_sha: string };
    profile: "Q2_CRITICAL_CHANGE_GATE" | "Q3_RELEASE_GATE";
  };
  report: { artifact: string; sha256: string };
  coverage: { artifact: string; sha256: string };
}

export interface ComponentMeasurementArtifactResult {
  kind?: string;
  status?: string;
  findings?: Array<{ code?: string }>;
  data?: { measurement?: ComponentMeasurementEnvelope | null };
}

function measurementResultIsGreen(
  artifact: ComponentMeasurementArtifactResult,
  measurement: ComponentMeasurementEnvelope | null | undefined,
  findings: Array<{ code?: string }>,
): boolean {
  return artifact.status === "PASS" && findings.length === 0 &&
    measurement?.integrity_status === "PASS" && measurement.exit_status === 0;
}

function measurementResultIsExactRed(
  artifact: ComponentMeasurementArtifactResult,
  measurement: ComponentMeasurementEnvelope | null | undefined,
  findings: Array<{ code?: string }>,
): boolean {
  return artifact.status === "FAIL" && findings.length === 1 &&
    findings[0]?.code === "COMPONENT_MEASUREMENT_RED" &&
    measurement?.integrity_status === "PASS" && Number.isInteger(measurement.exit_status) &&
    Number(measurement.exit_status) !== 0;
}

function measurementOriginIsTransient(value: unknown): boolean {
  if (typeof value !== "string" || !value.trim()) return false;
  const normalized = posix.normalize(value.replaceAll("\\", "/"));
  return normalized !== "quality" && !normalized.startsWith("quality/");
}

export function validateComponentMeasurementEnvelope(
  measurement: ComponentMeasurementEnvelope | undefined,
): QualityFinding[] {
  const shaPattern = /^[a-f0-9]{64}$/u;
  const commitPattern = /^[a-f0-9]{40}$/u;
  if (!measurement) return [{ code: "MEASUREMENT_ENVELOPE_INVALID", message: "Component measurement envelope is malformed or lacks integrity PASS" }];
  const candidate = measurement.candidate;
  const comparisonBase = candidate?.comparison_base;
  const report = measurement.report;
  const coverage = measurement.coverage;
  const durationValid = Number.isInteger(measurement.duration_ms) ? measurement.duration_ms >= 0 : false;
  const exitValid = Number.isInteger(measurement.exit_status);
  const valid = [
    measurement.schema_version === 1,
    measurement.integrity_status === "PASS",
    measurement.command === COMPONENT_BASELINE_MEASUREMENT_COMMAND,
    durationValid, exitValid, Boolean(candidate?.artifact),
    shaPattern.test(String(candidate?.artifact_sha256)),
    shaPattern.test(String(candidate?.inner_sha256)),
    commitPattern.test(String(candidate?.commit_sha)),
    Boolean(comparisonBase?.input_ref),
    commitPattern.test(String(comparisonBase?.resolved_sha)),
    ["Q2_CRITICAL_CHANGE_GATE", "Q3_RELEASE_GATE"].includes(String(candidate?.profile)),
    measurementOriginIsTransient(report?.artifact), shaPattern.test(String(report?.sha256)),
    measurementOriginIsTransient(coverage?.artifact), shaPattern.test(String(coverage?.sha256)),
  ].every(Boolean);
  if (valid) return [];
  return [{ code: "MEASUREMENT_ENVELOPE_INVALID", message: "Component measurement envelope is malformed or lacks integrity PASS" }];
}

export function validateComponentMeasurementArtifactResult(
  artifact: ComponentMeasurementArtifactResult,
): QualityFinding[] {
  const measurement = artifact.data?.measurement;
  const findings = Array.isArray(artifact.findings) ? artifact.findings : [];
  const green = measurementResultIsGreen(artifact, measurement, findings);
  const red = measurementResultIsExactRed(artifact, measurement, findings);
  if (artifact.kind === "component-baseline-measurement" && (green || red)) return [];
  return [{
    code: "MEASUREMENT_RESULT_INVALID",
    message: "Measurement result must be green with exit 0 or contain only COMPONENT_MEASUREMENT_RED with a nonzero integer exit",
  }];
}

export function buildComponentMeasurementEnvelope(input: {
  command: string;
  candidateArtifact: string;
  before?: ComponentMeasurementEnvelope["candidate"];
  after?: ComponentMeasurementEnvelope["candidate"];
  beforeFindings: QualityFinding[];
  afterFindings: QualityFinding[];
  reportPath: string;
  reportRaw?: Buffer;
  coveragePath: string;
  coverageRaw?: Buffer;
  durationMs: number;
  exitStatus: number | null;
}): { measurement?: ComponentMeasurementEnvelope; findings: QualityFinding[] } {
  const findings = [...input.beforeFindings, ...input.afterFindings];
  const snapshotsAvailable = [input.before, input.after].every(Boolean);
  if (!snapshotsAvailable) {
    findings.push({ code: "MEASUREMENT_CANDIDATE_INVALID", message: "Measurement requires valid candidate snapshots before and after execution" });
  } else if (JSON.stringify(input.before) !== JSON.stringify(input.after)) {
    findings.push({ code: "MEASUREMENT_CANDIDATE_DRIFT", message: "Candidate artifact or worktree binding changed during measurement" });
  }
  if (!input.reportRaw) findings.push({ code: "COMPONENT_REPORT_MALFORMED", message: "Measurement report is missing" });
  if (!input.coverageRaw) findings.push({ code: "COMPONENT_COVERAGE_MALFORMED", message: "Measurement coverage is missing" });
  if (!Number.isInteger(input.exitStatus) && !findings.some((finding) => finding.code === "COMPONENT_INFRASTRUCTURE_FAILURE")) {
    findings.push({ code: "COMPONENT_INFRASTRUCTURE_FAILURE", message: "Component measurement has no integer exit status" });
  }
  const sourcesAvailable = [input.before, input.reportRaw, input.coverageRaw].every(Boolean);
  if (!sourcesAvailable) return { findings };
  return {
    findings,
    measurement: {
      schema_version: 1,
      integrity_status: findings.length === 0 ? "PASS" : "FAIL",
      command: input.command,
      duration_ms: input.durationMs,
      exit_status: input.exitStatus,
      candidate: { ...input.before!, artifact: input.candidateArtifact },
      report: { artifact: input.reportPath, sha256: sha256(input.reportRaw) },
      coverage: { artifact: input.coveragePath, sha256: sha256(input.coverageRaw) },
    },
  };
}

export interface CanonicalBaselineInput {
  root: string;
  inventory: BaselineInventory;
  inventoryPath: string;
  inventorySha256: string;
  report: VitestJsonReport;
  reportPath: string;
  reportSha256: string;
  coverage: CoverageSummary;
  coveragePath: string;
  coverageSha256: string;
  validationPath: string;
  validationSha256: string;
  qualityReviewPath: string;
  qualityReviewSha256: string;
  qualityReviewer: string;
  securityReviewPath: string;
  securityReviewSha256: string;
  securityReviewer: string;
  candidateRecord: CandidateRecord;
  authorIds: string[];
  bootstrap: boolean;
  predecessorBaselineSha256: string | null;
}

const failureKinds: BaselineFailureKind[] = [
  "failed_file", "failed_test", "skipped_file", "skipped_test", "collection_failure",
  "unhandled_error", "infrastructure_failure", "malformed_evidence",
];
const classifications: BaselineClassification[] = [
  "must_fix_critical", "must_fix_infrastructure", "must_fix_noncritical", "ratchet_noncritical",
];
const skipStatuses = new Set(["pending", "skipped", "todo"]);

function normalizePath(value: string): string {
  return value.split(sep).join("/");
}

function relativePath(root: string, value: string): string {
  return normalizePath(relative(root, resolve(value)));
}

export function normalizeFailureSignature(value: unknown): string {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return (text || "<missing failure message>")
    .replace(/\u001b\[[0-9;]*m/gu, "")
    .replaceAll("\\", "/")
    .replace(/(?:file:\/\/)?(?:[A-Za-z]:)?\/[^\s:)]+/gu, "<path>")
    .replace(/:\d+:\d+/gu, ":<line>:<column>")
    .replace(/\s+/gu, " ")
    .trim()
    .slice(0, 500);
}

export function baselineRecordIdentity(record: Pick<BaselineInventoryRecord,
  "runner" | "file" | "test_or_scenario" | "failure_kind" | "normalized_signature">): string {
  return [record.runner, record.file, record.test_or_scenario, record.failure_kind, record.normalized_signature].join("\u0000");
}

export function stableBaselineRecordId(record: Pick<BaselineInventoryRecord,
  "runner" | "file" | "test_or_scenario" | "failure_kind" | "normalized_signature">): string {
  return `dom-${sha256(baselineRecordIdentity(record)).slice(0, 20)}`;
}

function assertionName(assertion: VitestAssertion): string {
  return assertion.fullName ?? [...(assertion.ancestorTitles ?? []), assertion.title ?? "<unnamed test>"].join(" > ");
}

function capabilityIds(file: string, evidenceMap: ComponentEvidenceMap): string[] {
  return Object.entries(evidenceMap.critical_capabilities)
    .filter(([, patterns]) => patterns.some((pattern) => globMatches(file, pattern)))
    .map(([id]) => id)
    .sort();
}

function failureCriticality(file: string, evidenceMap: ComponentEvidenceMap): "critical" | "noncritical" | "unknown" {
  if (capabilityIds(file, evidenceMap).length > 0) return "critical";
  const mapped = evidenceMap.affected_rules.some((rule) =>
    rule.test_patterns.some((pattern) => globMatches(file, pattern))
  );
  return mapped ? "noncritical" : "unknown";
}

interface RawRecord {
  file: string;
  test: string;
  kind: BaselineFailureKind;
  signature: string;
}

function assertionRecords(assertions: VitestAssertion[], file: string): RawRecord[] {
  return assertions.flatMap((assertion): RawRecord[] => {
    if (assertion.status === "failed") {
      return [{ file, test: assertionName(assertion), kind: "failed_test", signature: normalizeFailureSignature((assertion.failureMessages ?? []).join("\n")) }];
    }
    if (skipStatuses.has(assertion.status ?? "")) {
      return [{ file, test: assertionName(assertion), kind: "skipped_test", signature: `status:${assertion.status}` }];
    }
    return [];
  });
}

function fileRecords(result: VitestFileResult, root: string): RawRecord[] {
  const file = result.name ? relativePath(root, result.name) : "<unknown-test-file>";
  const assertions = result.assertionResults ?? [];
  const records = assertionRecords(assertions, file);
  if (result.status === "failed" && !assertions.some((assertion) => assertion.status === "failed")) {
    const kind = result.message ? "collection_failure" : "failed_file";
    records.push({ file, test: kind === "collection_failure" ? "<collection>" : "<file>", kind, signature: normalizeFailureSignature(result.message) });
  } else if (skipStatuses.has(result.status ?? "") && records.length === 0) {
    records.push({ file, test: "<file>", kind: "skipped_file", signature: `status:${result.status}` });
  }
  return records;
}

function rawRecords(input: InventoryBuildInput): RawRecord[] {
  const records = (input.report.testResults ?? []).flatMap((result) => fileRecords(result, input.root));
  for (const [index, error] of (input.report.unhandledErrors ?? []).entries()) {
    records.push({ file: "<runtime>", test: String(index), kind: "unhandled_error", signature: normalizeFailureSignature(error) });
  }
  if (input.infrastructureFailure) {
    records.push({ file: "<runner>", test: "<infrastructure>", kind: "infrastructure_failure", signature: normalizeFailureSignature(input.infrastructureFailure) });
  }
  records.push(...reportConsistencyRecords(input.report, input.root));
  return records;
}

function reportConsistencyRecords(report: VitestJsonReport, root: string): RawRecord[] {
  return validateVitestReportConsistency(report, root).map((finding, index) => ({
    file: "<report>",
    test: `<consistency-${index}>`,
    kind: "malformed_evidence",
    signature: finding.message,
  }));
}

function recordClassification(kind: BaselineFailureKind, critical: boolean): BaselineClassification {
  if (critical) return "must_fix_critical";
  if (kind !== "failed_test" && kind !== "failed_file") return "must_fix_infrastructure";
  return "must_fix_noncritical";
}

function proposalMetadata(proposal: RatchetProposal | undefined, proposed: boolean): Pick<BaselineInventoryRecord,
  "owner" | "rationale" | "acceptance" | "status" | "expires_at"> {
  if (!proposal) {
    return { owner: "", rationale: "", acceptance: { command: "", expected_artifact: "" }, status: "open", expires_at: null };
  }
  return {
    owner: proposal.owner,
    rationale: proposal.rationale,
    acceptance: proposal.acceptance,
    status: proposed ? "proposed" : "open",
    expires_at: proposal.expires_at,
  };
}

function toInventoryRecord(raw: RawRecord, input: InventoryBuildInput): BaselineInventoryRecord {
  const criticalIds = capabilityIds(raw.file, input.evidenceMap);
  const criticality = failureCriticality(raw.file, input.evidenceMap);
  const identityInput = { runner: "vitest", file: raw.file, test_or_scenario: raw.test, failure_kind: raw.kind, normalized_signature: raw.signature };
  const id = stableBaselineRecordId(identityInput);
  const proposal = input.proposals?.[id];
  const classification = recordClassification(raw.kind, criticality === "critical");
  return {
    id,
    ...identityInput,
    critical_capability_ids: criticalIds,
    root_cause_cluster: `identity:${id}`,
    classification,
    ...proposalMetadata(proposal, false),
    evidence_artifact: null,
  };
}

function countRecords(records: BaselineInventoryRecord[]): BaselineInventory["counts"] {
  const values = Object.fromEntries([...failureKinds, ...classifications].map((key) => [key, 0])) as BaselineInventory["counts"];
  values.total_records = records.length;
  for (const record of records) {
    values[record.failure_kind] += 1;
    values[record.classification] += 1;
  }
  return values;
}

export function buildBaselineInventory(input: InventoryBuildInput): BaselineInventory {
  const records = rawRecords(input)
    .map((record) => toInventoryRecord(record, input))
    .sort((left, right) => baselineRecordIdentity(left).localeCompare(baselineRecordIdentity(right)));
  const openMustFix = records.filter((record) => record.classification !== "ratchet_noncritical" && record.status !== "closed").length;
  const proposedRatchets = records.filter((record) => record.classification === "ratchet_noncritical" && record.status === "proposed").length;
  const phase = input.phase ?? "draft";
  return {
    schema_version: 1,
    generated_at: input.generatedAt,
    source: {
      runner: "vitest", command: input.command, commit: input.commit,
      measurement: input.measurement,
      measurement_artifact: input.measurementPath, measurement_sha256: input.measurementSha256,
      artifact: input.reportPath, artifact_sha256: input.reportSha256,
      coverage_artifact: input.coveragePath, coverage_sha256: input.coverageSha256,
      candidate_artifact: input.candidatePath, candidate_sha256: input.candidateSha256,
      candidate_digest: input.measurement.candidate.inner_sha256,
    },
    counts: countRecords(records),
    critical_capabilities: [...input.capabilities].sort((left, right) => left.id.localeCompare(right.id)),
    admission: {
      phase,
      status: phase === "draft" ? "draft" : "review_pending",
      bootstrap: input.bootstrap === true,
      author_ids: [...new Set(input.authorIds ?? [])].sort(),
      open_must_fix_records: openMustFix,
      proposed_ratchet_records: proposedRatchets,
      quality_review: { status: "pending", artifact: input.qualityReviewPath ?? "quality/reviews/component-baseline-quality.md" },
      security_review: { status: "pending", artifact: input.securityReviewPath ?? "quality/reviews/component-baseline-security.md" },
    },
    identity_derivation: { fields: "runner,file,test_or_scenario,failure_kind,normalized_signature", algorithm: "sha256-prefix-20" },
    uncertainties: [],
    records,
  };
}

function validateRecordSemantics(record: BaselineInventoryRecord, now: number, ids: Set<string>, identities: Set<string>): QualityFinding[] {
  const findings: QualityFinding[] = [];
  const identity = baselineRecordIdentity(record);
  if (ids.has(record.id) || record.id !== stableBaselineRecordId(record)) findings.push({ code: "INVALID_ID", message: `${record.id} is duplicate or not derived from its stable identity` });
  if (identities.has(identity)) findings.push({ code: "DUPLICATE_IDENTITY", message: `${record.id} duplicates a failure identity` });
  ids.add(record.id); identities.add(identity);
  if (record.classification === "ratchet_noncritical" && (record.failure_kind !== "failed_test" || record.critical_capability_ids.length > 0)) findings.push({ code: "ILLEGAL_RATCHET", message: `${record.id} is not a noncritical failed assertion` });
  if (record.classification === "ratchet_noncritical" && !ratchetMetadataValid(record, now)) findings.push({ code: "RATCHET_METADATA", message: `${record.id} lacks owned, reasoned, acceptance-bound, future-expiring debt metadata` });
  return findings;
}

function ratchetMetadataValid(record: BaselineInventoryRecord, now: number): boolean {
  const values = [record.owner, record.rationale, record.acceptance?.command, record.acceptance?.expected_artifact];
  return values.every(Boolean) && Boolean(record.expires_at) && Date.parse(record.expires_at!) > now;
}

function validateInventoryCounts(inventory: BaselineInventory): QualityFinding[] {
  const findings: QualityFinding[] = [];
  if (!Array.isArray(inventory.records) || !inventory.counts || typeof inventory.counts !== "object") {
    return [{ code: "INVENTORY_STRUCTURE_INVALID", message: "Inventory records and counts must be structurally valid before count validation" }];
  }
  for (const key of [...failureKinds, ...classifications, "total_records"] as const) {
    const expected = key === "total_records" ? inventory.records.length : inventory.records.filter((record) => record.failure_kind === key || record.classification === key).length;
    if (inventory.counts?.[key] !== expected) findings.push({ code: "COUNT_MISMATCH", message: `counts.${key} is ${inventory.counts?.[key]}, expected ${expected}` });
  }
  return findings;
}

function validateInventoryAdmissionCount(inventory: BaselineInventory): QualityFinding[] {
  if (!Array.isArray(inventory.records) || !inventory.admission || typeof inventory.admission !== "object") {
    return [{ code: "INVENTORY_STRUCTURE_INVALID", message: "Inventory records and admission must be structurally valid before admission count validation" }];
  }
  const open = inventory.records.filter((record) => record.classification !== "ratchet_noncritical" && record.status !== "closed").length;
  return inventory.admission?.open_must_fix_records === open ? [] : [{ code: "ADMISSION_OPEN_COUNT", message: `admission.open_must_fix_records must be ${open}` }];
}

function validateInventoryAuthorIds(inventory: BaselineInventory): QualityFinding[] {
  const authors = inventory.admission?.author_ids;
  if (!Array.isArray(authors) || authors.some((author) => typeof author !== "string" || !/^[A-Za-z0-9_-]+$/u.test(author))) {
    return [{ code: "ADMISSION_AUTHOR_IDS", message: "admission.author_ids must contain normalized author identities" }];
  }
  const normalized = [...new Set(authors)].sort();
  if (JSON.stringify(authors) !== JSON.stringify(normalized)) {
    return [{ code: "ADMISSION_AUTHOR_IDS", message: "admission.author_ids must be sorted and unique" }];
  }
  if (inventory.admission.phase === "admission" && authors.length === 0) {
    return [{ code: "ADMISSION_AUTHOR_IDS", message: "Admission inventory must bind the complete author identity list" }];
  }
  return [];
}

export function validateInventorySemantics(inventory: BaselineInventory, now: number): QualityFinding[] {
  if (!inventory || typeof inventory !== "object" || !Array.isArray(inventory.records) || inventory.records.some((record) => !record || typeof record !== "object" || !Array.isArray(record.critical_capability_ids) || !record.acceptance || typeof record.acceptance !== "object")) {
    return [{ code: "INVENTORY_STRUCTURE_INVALID", message: "Inventory structure is invalid; semantic validation stopped" }];
  }
  const ids = new Set<string>();
  const identities = new Set<string>();
  return [
    ...(inventory.records ?? []).flatMap((record) => validateRecordSemantics(record, now, ids, identities)),
    ...validateInventoryCounts(inventory),
    ...validateInventoryAdmissionCount(inventory),
    ...validateInventoryAuthorIds(inventory),
  ];
}

export function buildCanonicalBaseline(input: CanonicalBaselineInput): ComponentBaseline {
  const reportFindings = validateVitestReportConsistency(input.report, input.root);
  if (reportFindings.length > 0) throw new Error(reportFindings.map((finding) => finding.message).join("; "));
  const coverage = normalizeComponentCoveragePaths(input.coverage, input.root);
  const failures = input.inventory.records
    .filter((record) => record.classification === "ratchet_noncritical" && record.status === "proposed")
    .map((record) => ({
      identity: ["test_failure", record.file, record.test_or_scenario, record.normalized_signature].join("\u0000"),
      file: record.file, test: record.test_or_scenario, kind: "test_failure" as const,
      signature: record.normalized_signature, classification: "ratchet_noncritical" as const,
      owner: record.owner, rationale: record.rationale, expires_at: record.expires_at!,
      acceptance: record.acceptance,
      quality_reviewer: input.qualityReviewer, security_reviewer: input.securityReviewer,
    }));
  const testFiles = (input.report.testResults ?? []).map((result) => result.name).filter((name): name is string => Boolean(name)).map((name) => relativePath(input.root, name)).sort();
  return {
    schema_version: 1, status: "admitted",
    source: {
      command: input.inventory.source.command,
      report: input.reportPath,
      report_sha256: input.reportSha256,
      coverage: input.coveragePath,
      coverage_sha256: input.coverageSha256,
      candidate: { record: input.candidateRecord, digest: candidateDigest(input.candidateRecord) },
      measurement: {
        integrity_status: "PASS",
        command: input.inventory.source.measurement.command,
        duration_ms: input.inventory.source.measurement.duration_ms,
        exit_status: input.inventory.source.measurement.exit_status,
        candidate_digest: input.inventory.source.measurement.candidate.inner_sha256,
        candidate_commit: input.inventory.source.measurement.candidate.commit_sha,
        comparison_base: input.inventory.source.measurement.candidate.comparison_base,
        profile: input.inventory.source.measurement.candidate.profile,
        report_sha256: input.inventory.source.measurement.report.sha256,
        coverage_sha256: input.inventory.source.measurement.coverage.sha256,
      },
    },
    admission: {
      inventory: input.inventoryPath, inventory_sha256: input.inventorySha256,
      validation_artifact: input.validationPath, validation_sha256: input.validationSha256,
      quality_review_artifact: input.qualityReviewPath, quality_review_sha256: input.qualityReviewSha256,
      security_review_artifact: input.securityReviewPath, security_review_sha256: input.securityReviewSha256,
      candidate_digest: input.inventory.source.candidate_digest,
      author_ids: [...input.authorIds].sort(),
      quality_reviewer: input.qualityReviewer,
      security_reviewer: input.securityReviewer,
      review_source: "local-agent",
      reviewer_identity_assurance: "asserted-local",
      author_identity_assurance: "asserted-local",
      bootstrap: input.bootstrap,
      predecessor_baseline_sha256: input.predecessorBaselineSha256,
    },
    suite: { test_files: testFiles, total_tests: input.report.numTotalTests ?? 0 },
    allowed_failures: failures,
    coverage,
  };
}
