import { relative, resolve, sep } from "node:path";
import { globMatches, type ComponentBaseline, type ComponentEvidenceMap, type CoverageSummary, type VitestAssertion, type VitestFileResult, type VitestJsonReport } from "./component-core";
import { sha256, type QualityFinding } from "./common";

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
    artifact: string;
    artifact_sha256: string;
    coverage_artifact: string;
    coverage_sha256: string;
    candidate_artifact: string;
    candidate_sha256: string;
  };
  counts: Record<BaselineFailureKind | BaselineClassification | "total_records", number>;
  critical_capabilities: Array<{ id: string; name: string; critical: true }>;
  admission: {
    phase: "draft" | "admission";
    status: "draft" | "review_pending";
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
  command: string;
  commit: string;
  generatedAt: string;
  root: string;
  evidenceMap: ComponentEvidenceMap;
  capabilities: Array<{ id: string; name: string; critical: true }>;
  proposals?: Record<string, RatchetProposal>;
  infrastructureFailure?: string;
  phase?: "draft" | "admission";
  qualityReviewPath?: string;
  securityReviewPath?: string;
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
  if (!Array.isArray(input.report.testResults) || typeof input.report.success !== "boolean") {
    records.push({ file: "<report>", test: "<shape>", kind: "malformed_evidence", signature: "Vitest report lacks success or testResults" });
  }
  records.push(...reportConsistencyRecords(input.report, records));
  return records;
}

function reportConsistencyRecords(report: VitestJsonReport, records: RawRecord[]): RawRecord[] {
  const findings: RawRecord[] = [];
  const failed = records.filter((record) => record.kind === "failed_test").length;
  const skipped = records.filter((record) => record.kind === "skipped_test" || record.kind === "skipped_file").length;
  if (typeof report.numFailedTests === "number" && report.numFailedTests !== failed) findings.push(malformedCounter("numFailedTests", report.numFailedTests, failed));
  if (typeof report.numPendingTests === "number" && report.numPendingTests !== skipped) findings.push(malformedCounter("numPendingTests", report.numPendingTests, skipped));
  if (report.success === false && records.length === 0) findings.push({ file: "<report>", test: "<success>", kind: "malformed_evidence", signature: "Vitest reported unsuccessful execution without a leaf failure" });
  return findings;
}

function malformedCounter(name: string, reported: number, observed: number): RawRecord {
  return { file: "<report>", test: `<${name}>`, kind: "malformed_evidence", signature: `${name}:${reported};observed:${observed}` };
}

function proposalIsCurrent(proposal: RatchetProposal | undefined, generatedAt: string): proposal is RatchetProposal {
  if (!proposal) return false;
  const strings = [proposal.owner, proposal.rationale, proposal.acceptance?.command, proposal.acceptance?.expected_artifact];
  return strings.every((value) => Boolean(value?.trim())) && validFutureDate(proposal.expires_at, generatedAt);
}

function validFutureDate(value: string, reference: string): boolean {
  const parsed = Date.parse(value);
  return !Number.isNaN(parsed) && parsed > Date.parse(reference);
}

function recordClassification(kind: BaselineFailureKind, critical: boolean, mayRatchet: boolean): BaselineClassification {
  if (critical) return "must_fix_critical";
  if (kind !== "failed_test" && kind !== "failed_file") return "must_fix_infrastructure";
  return mayRatchet ? "ratchet_noncritical" : "must_fix_noncritical";
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
  const identityInput = { runner: "vitest", file: raw.file, test_or_scenario: raw.test, failure_kind: raw.kind, normalized_signature: raw.signature };
  const id = stableBaselineRecordId(identityInput);
  const proposal = input.proposals?.[id];
  const mayRatchet = raw.kind === "failed_test" && criticalIds.length === 0 && proposalIsCurrent(proposal, input.generatedAt);
  const classification = recordClassification(raw.kind, criticalIds.length > 0, mayRatchet);
  return {
    id,
    ...identityInput,
    critical_capability_ids: criticalIds,
    root_cause_cluster: `identity:${id}`,
    classification,
    ...proposalMetadata(proposal, mayRatchet),
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
      artifact: input.reportPath, artifact_sha256: input.reportSha256,
      coverage_artifact: input.coveragePath, coverage_sha256: input.coverageSha256,
      candidate_artifact: input.candidatePath, candidate_sha256: input.candidateSha256,
    },
    counts: countRecords(records),
    critical_capabilities: [...input.capabilities].sort((left, right) => left.id.localeCompare(right.id)),
    admission: {
      phase,
      status: phase === "draft" ? "draft" : "review_pending",
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
  const values = [record.owner, record.rationale, record.acceptance.command, record.acceptance.expected_artifact];
  return values.every(Boolean) && Boolean(record.expires_at) && Date.parse(record.expires_at!) > now;
}

function validateInventoryCounts(inventory: BaselineInventory): QualityFinding[] {
  const findings: QualityFinding[] = [];
  for (const key of [...failureKinds, ...classifications, "total_records"] as const) {
    const expected = key === "total_records" ? inventory.records.length : inventory.records.filter((record) => record.failure_kind === key || record.classification === key).length;
    if (inventory.counts?.[key] !== expected) findings.push({ code: "COUNT_MISMATCH", message: `counts.${key} is ${inventory.counts?.[key]}, expected ${expected}` });
  }
  return findings;
}

function validateInventoryAdmissionCount(inventory: BaselineInventory): QualityFinding[] {
  const open = inventory.records.filter((record) => record.classification !== "ratchet_noncritical" && record.status !== "closed").length;
  return inventory.admission?.open_must_fix_records === open ? [] : [{ code: "ADMISSION_OPEN_COUNT", message: `admission.open_must_fix_records must be ${open}` }];
}

export function validateInventorySemantics(inventory: BaselineInventory, now: number): QualityFinding[] {
  const ids = new Set<string>();
  const identities = new Set<string>();
  return [
    ...(inventory.records ?? []).flatMap((record) => validateRecordSemantics(record, now, ids, identities)),
    ...validateInventoryCounts(inventory),
    ...validateInventoryAdmissionCount(inventory),
  ];
}

export function buildCanonicalBaseline(input: CanonicalBaselineInput): ComponentBaseline {
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
    source: { command: input.inventory.source.command, report: input.reportPath, report_sha256: input.reportSha256, coverage: input.coveragePath, coverage_sha256: input.coverageSha256 },
    admission: {
      inventory: input.inventoryPath, inventory_sha256: input.inventorySha256,
      validation_artifact: input.validationPath, validation_sha256: input.validationSha256,
      quality_review_artifact: input.qualityReviewPath, quality_review_sha256: input.qualityReviewSha256,
      security_review_artifact: input.securityReviewPath, security_review_sha256: input.securityReviewSha256,
    },
    suite: { test_files: testFiles, total_tests: input.report.numTotalTests ?? 0 },
    allowed_failures: failures,
    coverage: input.coverage,
  };
}
