import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import baselineAdmissionSchema from "../../quality/schemas/baseline-admission.schema.json";
import {
  finishCli, flagString, makeResult, parseArgs, qualityRoot, sha256,
  type QualityFinding,
} from "./common";
import {
  buildBaselineInventory,
  validateComponentMeasurementArtifactResult,
  validateComponentMeasurementEnvelope,
  validateInventorySemantics,
  type BaselineInventory,
  type BaselineInventoryRecord,
  type ComponentMeasurementArtifactResult,
  type ComponentMeasurementEnvelope,
  type RatchetProposal,
} from "./component-baseline-core";
import {
  candidateDigest,
  candidateFileInventory,
  type CandidateFile,
  type CandidateRecord,
} from "./candidate-core";
import { resolveComparisonBase, type ComparisonBase } from "./comparison-base-core";
import {
  compareComponentRatchet,
  normalizeComponentCoveragePaths,
  parseBaselineReviewDecision,
  type ComponentBaseline,
  type ComponentEvidenceMap,
  type CoverageSummary,
  type ReviewDecision,
  type VitestJsonReport,
} from "./component-core";

export interface AdmissionValidationOptions {
  root: string;
  inventoryPath: string;
  phase: "draft" | "admission";
  qualityReviewPath?: string;
  securityReviewPath?: string;
  disallowedReviewers: string[];
  allowBootstrap?: boolean;
  now: number;
}

export interface AdmissionValidationData extends Record<string, unknown> {
  phase: "draft" | "admission";
  inventory: string;
  inventory_sha256: string | null;
  candidate_digest: string | null;
  record_count: number;
  author_ids: string[];
  review_source: "local-agent";
  reviewer_identity_assurance: "asserted-local";
  author_identity_assurance: "asserted-local";
  quality_review_sha256: string | null;
  security_review_sha256: string | null;
  bootstrap: boolean;
  predecessor_baseline_sha256: string | null;
}

interface PredecessorBaselineBinding {
  bootstrap: boolean;
  sha256: string | null;
}

interface ResolvedReviewPaths {
  quality: string;
  security: string;
}

const shaPattern = /^[a-f0-9]{64}$/u;
const commitPattern = /^[a-f0-9]{40}$/u;
const candidateSources = new Set(["committed", "staged", "unstaged", "untracked"]);
const validateInventorySchema = new Ajv2020({
  allErrors: true,
  strict: false,
  validateFormats: false,
}).compile(baselineAdmissionSchema);
export const canonicalBaselineEvidencePaths = new Set([
  "quality/baselines/component/source.vitest.json",
  "quality/baselines/component/coverage-summary.json",
  "quality/baselines/component/inventory.json",
  "quality/baselines/component/admission.json",
  "quality/reviews/component-baseline-quality.md",
  "quality/reviews/component-baseline-security.md",
]);
const canonicalSourcePaths = new Set([
  "quality/baselines/component/source.vitest.json",
  "quality/baselines/component/coverage-summary.json",
]);

function normalizedRelative(root: string, path: string): string {
  return relative(root, resolve(root, path)).split(sep).join("/");
}

function requiredString(value: unknown, path: string, findings: QualityFinding[]): value is string {
  if (typeof value === "string" && value.trim()) return true;
  findings.push({ code: "SCHEMA_STRING", message: `${path} must be a non-empty string` });
  return false;
}

function validateRecordStrings(record: BaselineInventoryRecord, path: string, findings: QualityFinding[]): void {
  requiredString(record?.id, `${path}.id`, findings);
  requiredString(record?.runner, `${path}.runner`, findings);
  requiredString(record?.file, `${path}.file`, findings);
  requiredString(record?.test_or_scenario, `${path}.test_or_scenario`, findings);
  requiredString(record?.normalized_signature, `${path}.normalized_signature`, findings);
  requiredString(record?.root_cause_cluster, `${path}.root_cause_cluster`, findings);
}

function validateRecordEnums(record: BaselineInventoryRecord, path: string, findings: QualityFinding[]): void {
  const kinds = ["failed_file", "failed_test", "skipped_file", "skipped_test", "collection_failure", "unhandled_error", "infrastructure_failure", "malformed_evidence"];
  const classifications = ["must_fix_critical", "must_fix_infrastructure", "must_fix_noncritical", "ratchet_noncritical"];
  if (!kinds.includes(record?.failure_kind)) findings.push({ code: "FAILURE_KIND", message: `${path}.failure_kind is invalid` });
  if (!classifications.includes(record?.classification)) findings.push({ code: "CLASSIFICATION", message: `${path}.classification is invalid` });
  if (!["open", "proposed", "closed"].includes(record?.status)) findings.push({ code: "STATUS", message: `${path}.status is invalid` });
}

function validateRecordCollections(record: BaselineInventoryRecord, path: string, findings: QualityFinding[]): void {
  if (!Array.isArray(record?.critical_capability_ids)) {
    findings.push({ code: "CAPABILITY_LIST", message: `${path}.critical_capability_ids must be an array` });
  }
  if (!record?.acceptance || typeof record.acceptance !== "object") {
    findings.push({ code: "ACCEPTANCE", message: `${path}.acceptance is malformed` });
  }
}

export function validateRecordShape(record: BaselineInventoryRecord, index: number, findings: QualityFinding[]): void {
  const path = `records[${index}]`;
  validateRecordStrings(record, path, findings);
  validateRecordEnums(record, path, findings);
  validateRecordCollections(record, path, findings);
}

export function validateInventoryStructure(value: unknown): QualityFinding[] {
  if (!isObject(value)) {
    return [{ code: "INVENTORY_STRUCTURE", message: "Inventory must be a JSON object" }];
  }
  const schemaValid = validateInventorySchema(value);
  const findings: QualityFinding[] = schemaValid
    ? []
    : (validateInventorySchema.errors ?? []).map((error) => ({
        code: "INVENTORY_SCHEMA_INVALID",
        message: `${error.instancePath || "/"} ${error.message ?? "does not match the canonical inventory schema"}`,
      }));
  if (!isObject(value.source)) findings.push({ code: "SOURCE_STRUCTURE", message: "Inventory source must be an object" });
  else findings.push(...sourceStructureFindings(value.source));
  if (!isObject(value.admission)) findings.push({ code: "ADMISSION_STRUCTURE", message: "Inventory admission must be an object" });
  else findings.push(...admissionStructureFindings(value.admission));
  if (!isObject(value.counts)) findings.push({ code: "COUNTS_STRUCTURE", message: "Inventory counts must be an object" });
  else findings.push(...countStructureFindings(value.counts));
  if (!Array.isArray(value.records)) {
    findings.push({ code: "RECORDS_STRUCTURE", message: "Inventory records must be an array" });
  } else {
    value.records.forEach((record, index) => {
      if (!isObject(record) || !isObject(record.acceptance) || !Array.isArray(record.critical_capability_ids)) findings.push({ code: "RECORD_STRUCTURE", message: `records[${index}] must be an object with acceptance and critical_capability_ids` });
    });
  }
  return findings;
}

function sourceStructureFindings(source: Record<string, unknown>): QualityFinding[] {
  const requiredStrings = ["runner", "command", "commit", "measurement_artifact", "measurement_sha256", "artifact", "artifact_sha256", "coverage_artifact", "coverage_sha256", "candidate_artifact", "candidate_sha256", "candidate_digest"];
  const valid = requiredStrings.every((field) => typeof source[field] === "string") && isObject(source.measurement);
  return valid ? [] : [{ code: "SOURCE_STRUCTURE", message: "Inventory source lacks required string bindings or embedded measurement" }];
}

function admissionStructureFindings(admission: Record<string, unknown>): QualityFinding[] {
  const qualityReview = admission.quality_review;
  const securityReview = admission.security_review;
  const valid = typeof admission.phase === "string" && typeof admission.status === "string" &&
    typeof admission.bootstrap === "boolean" &&
    Number.isInteger(admission.open_must_fix_records) && Number.isInteger(admission.proposed_ratchet_records) &&
    isObject(qualityReview) && typeof qualityReview.artifact === "string" &&
    isObject(securityReview) && typeof securityReview.artifact === "string";
  return valid ? [] : [{ code: "ADMISSION_STRUCTURE", message: "Inventory admission lacks required counts, status, or review pointers" }];
}

function countStructureFindings(counts: Record<string, unknown>): QualityFinding[] {
  const keys = [...failureKindsForStructure, ...classificationsForStructure, "total_records"];
  return keys.every((key) => Number.isInteger(counts[key]))
    ? []
    : [{ code: "COUNTS_STRUCTURE", message: "Inventory counts must contain every integer counter" }];
}

const failureKindsForStructure = ["failed_file", "failed_test", "skipped_file", "skipped_test", "collection_failure", "unhandled_error", "infrastructure_failure", "malformed_evidence"];
const classificationsForStructure = ["must_fix_critical", "must_fix_infrastructure", "must_fix_noncritical", "ratchet_noncritical"];

function validatePhase(inventory: BaselineInventory, phase: "draft" | "admission", findings: QualityFinding[]): void {
  const expectedStatus = phase === "draft" ? "draft" : "review_pending";
  if (inventory.admission?.phase !== phase || inventory.admission?.status !== expectedStatus) {
    findings.push({ code: "PHASE_STATUS_MISMATCH", message: `${phase} requires admission.phase=${phase} and status=${expectedStatus}` });
  }
  if (phase === "admission" && inventory.admission.open_must_fix_records !== 0) {
    findings.push({ code: "OPEN_MUST_FIX", message: "Admission cannot contain open must-fix records" });
  }
}

function validateAdmissionRecord(record: BaselineInventoryRecord, findings: QualityFinding[]): void {
  if (record.classification === "ratchet_noncritical") {
    if (record.status !== "proposed") findings.push({ code: "RATCHET_STATUS", message: `${record.id} must remain proposed until external reviews approve the inventory` });
    return;
  }
  findings.push({ code: "ADMISSION_NON_RATCHET_RECORD", message: `${record.id} must be removed by fresh measurement before admission` });
}

function validateAdmissionRecords(inventory: BaselineInventory, findings: QualityFinding[]): void {
  inventory.records.forEach((record) => validateAdmissionRecord(record, findings));
}

export function validateReviewBuffers(input: {
  qualityRaw: Buffer | string;
  securityRaw: Buffer | string;
  inventorySha256: string;
  candidateDigest: string;
  disallowedReviewers: string[];
}): { findings: QualityFinding[]; qualityReviewer?: string; securityReviewer?: string } {
  const findings: QualityFinding[] = [];
  const quality = parseBaselineReviewDecision(input.qualityRaw.toString());
  const security = parseBaselineReviewDecision(input.securityRaw.toString());
  validateReviewDecision(quality, "Quality", input.inventorySha256, input.candidateDigest, findings);
  validateReviewDecision(security, "Security", input.inventorySha256, input.candidateDigest, findings);
  validateReviewerSeparation(quality, security, input.disallowedReviewers, findings);
  return {
    findings,
    qualityReviewer: quality.reviewer,
    securityReviewer: security.reviewer,
  };
}

function validateReviewDecision(review: ReviewDecision, label: string, inventorySha: string, candidateDigestValue: string, findings: QualityFinding[]): void {
  if (review.decision !== "APPROVE") findings.push({ code: "REVIEW_DECISION", message: `${label} review must record APPROVE` });
  if (review.inventorySha !== inventorySha) findings.push({ code: "REVIEW_SHA", message: `${label} review does not bind the exact inventory SHA` });
  if (review.candidateSha !== candidateDigestValue) findings.push({ code: "REVIEW_CANDIDATE_DIGEST", message: `${label} review does not bind the measurement candidate digest` });
  if (!review.reviewer) findings.push({ code: "REVIEWER_MISSING", message: `${label} review does not identify a reviewer` });
  if (review.role?.toLowerCase() !== "read-only") findings.push({ code: "REVIEWER_NOT_READ_ONLY", message: `${label} reviewer role must be read-only` });
  if (review.source !== "local-agent") findings.push({ code: "REVIEW_SOURCE", message: `${label} review source must honestly state local-agent` });
  if (review.reviewerAssurance !== "asserted-local") findings.push({ code: "REVIEWER_IDENTITY_ASSURANCE", message: `${label} reviewer identity assurance must be asserted-local` });
  if (review.authorAssurance !== "asserted-local") findings.push({ code: "AUTHOR_IDENTITY_ASSURANCE", message: `${label} author identity assurance must be asserted-local` });
}

function validateReviewerSeparation(quality: ReviewDecision, security: ReviewDecision, disallowed: string[], findings: QualityFinding[]): void {
  const reviewers = [quality.reviewer, security.reviewer].filter((value): value is string => Boolean(value));
  if (new Set(reviewers).size !== reviewers.length) findings.push({ code: "REVIEWER_NOT_INDEPENDENT", message: "Quality and security reviewers must be different" });
  for (const reviewer of reviewers) {
    if (disallowed.includes(reviewer)) findings.push({ code: "REVIEWER_IS_AUTHOR", message: `${reviewer} is an author and cannot approve admission` });
  }
}

async function validateReviews(options: AdmissionValidationOptions, inventory: BaselineInventory, inventorySha: string, paths: ResolvedReviewPaths, findings: QualityFinding[]): Promise<void> {
  try {
    const [qualityRaw, securityRaw] = await Promise.all([readFile(paths.quality), readFile(paths.security)]);
    findings.push(...validateReviewBuffers({
      qualityRaw, securityRaw, inventorySha256: inventorySha,
      candidateDigest: inventory.source.candidate_digest,
      disallowedReviewers: inventory.admission.author_ids,
    }).findings);
  } catch {
    findings.push({ code: "MISSING_REVIEW", message: "Missing independent baseline review" });
  }
}

function resolvedReviewPaths(options: AdmissionValidationOptions, inventory: BaselineInventory): ResolvedReviewPaths {
  return {
    quality: resolve(options.root, options.qualityReviewPath ?? inventory.admission.quality_review.artifact),
    security: resolve(options.root, options.securityReviewPath ?? inventory.admission.security_review.artifact),
  };
}

function validateImmutablePaths(options: AdmissionValidationOptions, inventory: BaselineInventory, findings: QualityFinding[]): void {
  if (options.phase !== "admission") return;
  const expectedSources = [
    [inventory.source.artifact, "quality/baselines/component/source.vitest.json", "report"],
    [inventory.source.coverage_artifact, "quality/baselines/component/coverage-summary.json", "coverage"],
  ] as const;
  for (const [path, expected, role] of expectedSources) {
    if (normalizedRelative(options.root, path) !== expected || !canonicalSourcePaths.has(expected)) {
      findings.push({ code: "SOURCE_PATH_MUTABLE", message: `Admission ${role} evidence must use ${expected}`, path });
    }
  }
  if (normalizedRelative(options.root, options.inventoryPath) !== "quality/baselines/component/inventory.json") findings.push({ code: "INVENTORY_PATH_MUTABLE", message: "Admission inventory must use quality/baselines/component/inventory.json", path: options.inventoryPath });
  const expectedReviews = [
    [inventory.admission.quality_review.artifact, options.qualityReviewPath, "quality/reviews/component-baseline-quality.md", "quality"],
    [inventory.admission.security_review.artifact, options.securityReviewPath, "quality/reviews/component-baseline-security.md", "security"],
  ] as const;
  for (const [inventoryPath, overridePath, expected, role] of expectedReviews) {
    const inventoryRelative = normalizedRelative(options.root, inventoryPath);
    if (inventoryRelative !== expected) findings.push({ code: "REVIEW_PATH_MUTABLE", message: `Admission ${role} review must use ${expected}`, path: inventoryPath });
    if (overridePath && (normalizedRelative(options.root, overridePath) !== expected || normalizedRelative(options.root, overridePath) !== inventoryRelative)) {
      findings.push({ code: "REVIEW_PATH_OVERRIDE_MISMATCH", message: `Admission ${role} review override must equal its inventory pointer and canonical path`, path: overridePath });
    }
  }
}

async function validateBoundFile(root: string, path: string, expectedSha: string, label: string, findings: QualityFinding[]): Promise<void> {
  if (!requiredString(path, `${label}.path`, findings) || !shaPattern.test(expectedSha)) {
    findings.push({ code: "SOURCE_BINDING", message: `${label} path or SHA is malformed` });
    return;
  }
  try {
    if (sha256(await readFile(resolve(root, path))) !== expectedSha) findings.push({ code: "SOURCE_HASH", message: `${label} SHA does not match ${path}`, path });
  } catch {
    findings.push({ code: "SOURCE_MISSING", message: `${label} is missing`, path });
  }
}

async function validateSources(root: string, inventory: BaselineInventory, findings: QualityFinding[]): Promise<void> {
  await Promise.all([
    validateBoundFile(root, inventory.source.artifact, inventory.source.artifact_sha256, "source report", findings),
    validateBoundFile(root, inventory.source.coverage_artifact, inventory.source.coverage_sha256, "source coverage", findings),
    validateBoundFile(root, inventory.source.candidate_artifact, inventory.source.candidate_sha256, "measurement candidate", findings),
    validateBoundFile(root, inventory.source.measurement_artifact, inventory.source.measurement_sha256, "measurement envelope", findings),
  ]);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function validStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string" && item.length > 0);
}

function validCandidateSources(value: unknown): boolean {
  return validStringList(value) && value.length > 0 &&
    new Set(value).size === value.length && value.every((source) => candidateSources.has(source));
}

function validCandidateFiles(value: unknown): boolean {
  return Array.isArray(value) && value.every((item) =>
    isObject(item) && typeof item.path === "string" && item.path.length > 0 &&
    typeof item.sha256 === "string" && shaPattern.test(item.sha256) &&
    typeof item.deleted === "boolean" && validCandidateSources(item.sources));
}

function currentHead(root: string): string | null {
  const run = spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" });
  const head = run.status === 0 ? run.stdout.trim().toLowerCase() : "";
  return commitPattern.test(head) ? head : null;
}

function candidateParts(candidate: Record<string, unknown>, findings: QualityFinding[]): { data: Record<string, unknown>; record: Record<string, unknown> } | null {
  const data = isObject(candidate.data) ? candidate.data : undefined;
  const record = data && isObject(data.record) ? data.record : undefined;
  if (candidate.schema_version !== 1 || candidate.kind !== "quality-candidate" || candidate.status !== "PASS" ||
      !Array.isArray(candidate.findings) || candidate.findings.length !== 0 || !record) {
    findings.push({ code: "CANDIDATE_PROVENANCE_MALFORMED", message: "Measurement candidate envelope must be a finding-free PASS quality-candidate checkpoint" });
    return null;
  }
  return { data: data!, record };
}

function validateCandidateSource(record: Record<string, unknown>, findings: QualityFinding[]): boolean {
  if (record.schema_version !== 1 || !commitPattern.test(String(record.commit_sha ?? "")) ||
      !validCandidateFiles(record.changed_files) || !validStringList(record.affected_capabilities)) {
    findings.push({ code: "CANDIDATE_SOURCE_MALFORMED", message: "Measurement candidate record source inventory is malformed" });
    return false;
  }
  return true;
}

function candidateComparisonBase(record: Record<string, unknown>, findings: QualityFinding[]): ComparisonBase | null {
  const comparisonBase = isObject(record.comparison_base) ? record.comparison_base : undefined;
  if (!comparisonBase || typeof comparisonBase.input_ref !== "string" || !comparisonBase.input_ref.trim() ||
      typeof comparisonBase.resolved_sha !== "string" || !commitPattern.test(comparisonBase.resolved_sha)) {
    findings.push({ code: "CANDIDATE_COMPARISON_BASE_MALFORMED", message: "Measurement candidate comparison base is malformed" });
    return null;
  }
  return { input_ref: comparisonBase.input_ref, resolved_sha: comparisonBase.resolved_sha };
}

async function validateCandidateComparisonBase(root: string, base: ComparisonBase, findings: QualityFinding[]): Promise<boolean> {
  try {
    const current = await resolveComparisonBase({ root, input_ref: base.input_ref });
    if (current.resolved_sha === base.resolved_sha) return true;
  } catch {
    // The single fail-closed finding below is deterministic for all resolution failures.
  }
  findings.push({ code: "CANDIDATE_COMPARISON_BASE_MISMATCH", message: "Measurement candidate comparison base does not resolve to its recorded commit" });
  return false;
}

function validateCandidateProfile(record: Record<string, unknown>, findings: QualityFinding[]): void {
  if (record.profile !== "Q2_CRITICAL_CHANGE_GATE" && record.profile !== "Q3_RELEASE_GATE") {
    findings.push({ code: "CANDIDATE_PROFILE_MISMATCH", message: "Baseline migration candidate must use Q2_CRITICAL_CHANGE_GATE or Q3_RELEASE_GATE" });
  }
}

function validateCandidateCommits(root: string, inventoryCommit: string, record: Record<string, unknown>, findings: QualityFinding[]): void {
  const embeddedCommit = typeof record.commit_sha === "string" ? record.commit_sha : "";
  if (embeddedCommit !== inventoryCommit) {
    findings.push({ code: "CANDIDATE_COMMIT_MISMATCH", message: "Measurement candidate commit does not match inventory source.commit" });
  }
  const head = currentHead(root);
  if (!head) {
    findings.push({ code: "CURRENT_HEAD_MALFORMED", message: "Current Git HEAD is unavailable or malformed" });
  } else if (embeddedCommit !== head) {
    findings.push({ code: "CANDIDATE_HEAD_MISMATCH", message: "Measurement candidate commit does not match current Git HEAD" });
  }
}

function validateCandidateRecordDigest(data: Record<string, unknown>, record: Record<string, unknown>, findings: QualityFinding[]): void {
  if (typeof data?.sha256 !== "string" || !shaPattern.test(data.sha256) ||
      data.sha256 !== candidateDigest(record as unknown as CandidateRecord)) {
    findings.push({ code: "CANDIDATE_RECORD_DIGEST_MISMATCH", message: "Measurement candidate record digest is missing or incorrect" });
  }
}

function recordedCandidateFiles(record: Record<string, unknown>): CandidateFile[] {
  return (record.changed_files as CandidateFile[])
    .filter((file) => !canonicalBaselineEvidencePaths.has(file.path));
}

function candidatePaths(files: CandidateFile[]): string[] {
  return files.map((file) => file.path);
}

async function validateCurrentCandidateFiles(root: string, base: ComparisonBase, record: Record<string, unknown>, findings: QualityFinding[]): Promise<void> {
  try {
    const expected = recordedCandidateFiles(record);
    const current = await candidateFileInventory(root, base.resolved_sha, canonicalBaselineEvidencePaths);
    if (JSON.stringify(candidatePaths(expected)) !== JSON.stringify(candidatePaths(current))) {
      findings.push({ code: "CANDIDATE_PATH_SET_MISMATCH", message: "Measurement candidate path set does not equal the current Git candidate" });
      return;
    }
    if (JSON.stringify(expected) !== JSON.stringify(current)) {
      findings.push({ code: "CANDIDATE_FILE_PROVENANCE_MISMATCH", message: "Measurement candidate file hashes, deletion state, or source categories are stale" });
    }
  } catch (error) {
    findings.push({ code: "CANDIDATE_CURRENT_STATE_UNAVAILABLE", message: `Current Git candidate could not be reconstructed: ${String(error)}` });
  }
}

export interface CandidateCheckpointBinding {
  artifact_sha256: string;
  inner_sha256: string;
  commit_sha: string;
  comparison_base: ComparisonBase;
  profile: CandidateRecord["profile"];
}

async function loadCandidateCheckpoint(root: string, candidatePath: string): Promise<{ raw: Buffer; candidate: Record<string, unknown> }> {
  const raw = await readFile(resolve(root, candidatePath));
  const parsed: unknown = JSON.parse(raw.toString());
  if (!isObject(parsed)) throw new Error("candidate checkpoint must be an object");
  return { raw, candidate: parsed };
}

function candidateBinding(raw: Buffer, parts: { data: Record<string, unknown>; record: Record<string, unknown> }, comparisonBase: ComparisonBase | null): CandidateCheckpointBinding | undefined {
  const innerSha = typeof parts.data.sha256 === "string" ? parts.data.sha256 : "";
  const commitSha = typeof parts.record.commit_sha === "string" ? parts.record.commit_sha : "";
  if (!comparisonBase) return undefined;
  if (!shaPattern.test(innerSha)) return undefined;
  if (!commitPattern.test(commitSha)) return undefined;
  return {
    artifact_sha256: sha256(raw), inner_sha256: innerSha, commit_sha: commitSha,
    comparison_base: comparisonBase, profile: parts.record.profile as CandidateRecord["profile"],
  };
}

export async function validateCandidateCheckpointAgainstWorktree(
  root: string,
  candidatePath: string,
): Promise<{ raw?: Buffer; binding?: CandidateCheckpointBinding; findings: QualityFinding[] }> {
  const findings: QualityFinding[] = [];
  let loaded: { raw: Buffer; candidate: Record<string, unknown> };
  try {
    loaded = await loadCandidateCheckpoint(root, candidatePath);
  } catch (error) {
    return { findings: [{ code: "CANDIDATE_PROVENANCE_MALFORMED", message: `Measurement candidate provenance is missing or malformed: ${String(error)}` }] };
  }
  const parts = candidateParts(loaded.candidate, findings);
  if (!parts) return { raw: loaded.raw, findings };
  const sourceValid = validateCandidateSource(parts.record, findings);
  const comparisonBase = candidateComparisonBase(parts.record, findings);
  validateCandidateProfile(parts.record, findings);
  validateCandidateCommits(root, String(parts.record.commit_sha ?? ""), parts.record, findings);
  validateCandidateRecordDigest(parts.data, parts.record, findings);
  if (sourceValid && comparisonBase && await validateCandidateComparisonBase(root, comparisonBase, findings)) {
    await validateCurrentCandidateFiles(root, comparisonBase, parts.record, findings);
  }
  return { raw: loaded.raw, binding: candidateBinding(loaded.raw, parts, comparisonBase), findings };
}

async function validateCandidateProvenance(root: string, inventory: BaselineInventory, findings: QualityFinding[]): Promise<void> {
  const checked = await validateCandidateCheckpointAgainstWorktree(root, inventory.source.candidate_artifact);
  findings.push(...checked.findings);
  if (checked.binding?.commit_sha !== inventory.source.commit) {
    findings.push({ code: "CANDIDATE_COMMIT_MISMATCH", message: "Measurement candidate commit does not match inventory source.commit" });
  }
  if (checked.binding?.inner_sha256 !== inventory.source.candidate_digest) {
    findings.push({ code: "CANDIDATE_DIGEST_MISMATCH", message: "Validated candidate record digest does not match inventory source.candidate_digest" });
  }
  try {
    const artifact = JSON.parse(await readFile(resolve(root, inventory.source.measurement_artifact), "utf8")) as { data?: { measurement?: ComponentMeasurementEnvelope } };
    const candidate = artifact.data?.measurement?.candidate;
    const expected = candidate ? {
      artifact_sha256: candidate.artifact_sha256,
      inner_sha256: candidate.inner_sha256,
      commit_sha: candidate.commit_sha,
      comparison_base: candidate.comparison_base,
      profile: candidate.profile,
    } : undefined;
    if (!expected || JSON.stringify(checked.binding) !== JSON.stringify(expected)) {
      findings.push({ code: "MEASUREMENT_CANDIDATE_BINDING_MISMATCH", message: "Measurement candidate metadata does not match the validated candidate checkpoint" });
    }
  } catch (error) {
    findings.push({ code: "MEASUREMENT_ENVELOPE_INVALID", message: `Measurement candidate binding is unavailable: ${String(error)}` });
  }
}

function inventoryProposals(inventory: BaselineInventory): Record<string, RatchetProposal> {
  return Object.fromEntries(inventory.records.filter((record) => record.classification === "ratchet_noncritical").map((record) => [record.id, {
    owner: record.owner, rationale: record.rationale, acceptance: record.acceptance, expires_at: record.expires_at ?? "",
  }]));
}

function observedIdentitySummary(inventory: BaselineInventory): string[] {
  return inventory.records.map((record) => JSON.stringify([record.id, record.failure_kind, record.critical_capability_ids])).sort();
}

function measurementMatchesInventory(measurement: ComponentMeasurementEnvelope, inventory: BaselineInventory): boolean {
  return [
    JSON.stringify(measurement) === JSON.stringify(inventory.source.measurement),
    measurement.command === inventory.source.command,
    measurement.candidate.artifact === inventory.source.candidate_artifact,
    measurement.candidate.artifact_sha256 === inventory.source.candidate_sha256,
    measurement.candidate.inner_sha256 === inventory.source.candidate_digest,
    measurement.candidate.commit_sha === inventory.source.commit,
    measurement.report.sha256 === inventory.source.artifact_sha256,
    measurement.coverage.sha256 === inventory.source.coverage_sha256,
  ].every(Boolean);
}

function readImmutableFile(root: string, commitSha: string, path: string): string | null {
  const reference = spawnSync("git", ["show", `${commitSha}:${path}`], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 50 * 1024 * 1024,
  });
  if (reference.error) throw reference.error;
  if (reference.status === 0) return reference.stdout;
  const commit = spawnSync("git", ["cat-file", "-e", `${commitSha}^{commit}`], { cwd: root });
  if (commit.status !== 0) throw new Error(`Comparison base ${commitSha} is unavailable`);
  return null;
}

function baselineExistsInHeadHistory(root: string, baselinePath: string): boolean {
  const establishedOnHead = spawnSync("git", ["log", "-1", "--format=%H", "--diff-filter=A", "HEAD", "--", baselinePath], {
    cwd: root,
    encoding: "utf8",
  });
  if (establishedOnHead.error || establishedOnHead.status !== 0) {
    throw establishedOnHead.error ?? new Error("Current HEAD baseline lineage is unavailable");
  }
  return Boolean(establishedOnHead.stdout.trim());
}

async function baselineExistsInWorktree(root: string, baselinePath: string): Promise<boolean> {
  try {
    await readFile(resolve(root, baselinePath), "utf8");
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

async function validateBootstrapBaselineAdmission(
  root: string,
  baselinePath: string,
  bootstrapDeclared: boolean,
  bootstrapConfirmed: boolean,
  binding: PredecessorBaselineBinding,
  findings: QualityFinding[],
): Promise<void> {
  if (baselineExistsInHeadHistory(root, baselinePath)) {
    findings.push({
      code: "BASELINE_ADMISSION_BOOTSTRAP_HISTORY_EXISTS",
      message: "Bootstrap is forbidden because the current HEAD lineage already established a canonical baseline",
    });
    return;
  }
  if (await baselineExistsInWorktree(root, baselinePath)) {
    findings.push({
      code: "BASELINE_ADMISSION_BOOTSTRAP_COLLISION",
      message: "A canonical baseline exists in the worktree but not in the immutable comparison base",
    });
  }
  if (!bootstrapDeclared) {
    findings.push({
      code: "BASELINE_ADMISSION_BOOTSTRAP_REQUIRED",
      message: "Initial baseline admission must be declared in the independently reviewed inventory",
    });
    return;
  }
  if (!bootstrapConfirmed) {
    findings.push({
      code: "BASELINE_ADMISSION_BOOTSTRAP_CONFIRMATION_REQUIRED",
      message: "Initial baseline admission requires an explicit --allow-bootstrap confirmation",
    });
    return;
  }
  binding.bootstrap = true;
}

async function validateEstablishedBaselineRatchet(
  root: string,
  baselinePath: string,
  referenceRaw: string,
  report: VitestJsonReport,
  coverage: CoverageSummary,
  comparisonBaseSha: string,
  bootstrapDeclared: boolean,
  bootstrapConfirmed: boolean,
  binding: PredecessorBaselineBinding,
  findings: QualityFinding[],
): Promise<void> {
  if (bootstrapDeclared || bootstrapConfirmed) {
    findings.push({
      code: "BASELINE_ADMISSION_BOOTSTRAP_DECLARATION_MISMATCH",
      message: "Bootstrap cannot be declared when the immutable comparison base already contains a baseline",
    });
  }
  const currentRaw = await readFile(resolve(root, baselinePath), "utf8");
  if (sha256(currentRaw) !== sha256(referenceRaw)) {
    findings.push({
      code: "BASELINE_ADMISSION_EXISTING_BASELINE_MUTATED",
      message: "The canonical baseline differs from the immutable comparison-base version",
    });
  }
  const baseline = JSON.parse(referenceRaw) as ComponentBaseline;
  if (baseline.source?.coverage !== "quality/baselines/component/coverage-summary.json") {
    throw new Error("Predecessor baseline coverage source is not canonical");
  }
  const sourceCoverageRaw = readImmutableFile(root, comparisonBaseSha, baseline.source.coverage);
  if (sourceCoverageRaw === null) throw new Error("Predecessor source coverage is unavailable");
  if (sha256(sourceCoverageRaw) !== baseline.source.coverage_sha256) {
    throw new Error("Predecessor source coverage hash does not match its canonical baseline");
  }
  const reconstructedCoverage = normalizeComponentCoveragePaths(JSON.parse(sourceCoverageRaw) as CoverageSummary, root);
  if (JSON.stringify(reconstructedCoverage) !== JSON.stringify(baseline.coverage)) {
    throw new Error("Predecessor embedded coverage does not match its hash-bound source coverage");
  }
  binding.sha256 = sha256(referenceRaw);
  findings.push(...compareComponentRatchet(report, normalizeComponentCoveragePaths(coverage, root), baseline, root));
}

async function validateExistingBaselineRatchet(
  root: string,
  report: VitestJsonReport,
  coverage: CoverageSummary,
  comparisonBaseSha: string,
  bootstrapDeclared: boolean,
  bootstrapConfirmed: boolean,
  binding: PredecessorBaselineBinding,
  findings: QualityFinding[],
): Promise<void> {
  const baselinePath = "quality/baseline.json";
  try {
    const referenceRaw = readImmutableFile(root, comparisonBaseSha, baselinePath);
    if (referenceRaw === null) {
      await validateBootstrapBaselineAdmission(root, baselinePath, bootstrapDeclared, bootstrapConfirmed, binding, findings);
      return;
    }
    await validateEstablishedBaselineRatchet(
      root, baselinePath, referenceRaw, report, coverage, comparisonBaseSha,
      bootstrapDeclared, bootstrapConfirmed, binding, findings,
    );
  } catch (error) {
    findings.push({
      code: "BASELINE_ADMISSION_EXISTING_BASELINE_MALFORMED",
      message: `Existing canonical baseline could not be ratcheted: ${String(error)}`,
    });
  }
}

async function validateSourceContents(options: AdmissionValidationOptions, inventory: BaselineInventory, binding: PredecessorBaselineBinding, findings: QualityFinding[]): Promise<void> {
  const { root } = options;
  try {
    const [reportRaw, coverageRaw, candidateRaw, measurementRaw, evidenceMapRaw, registryRaw] = await Promise.all([
      readFile(resolve(root, inventory.source.artifact), "utf8"),
      readFile(resolve(root, inventory.source.coverage_artifact), "utf8"),
      readFile(resolve(root, inventory.source.candidate_artifact), "utf8"),
      readFile(resolve(root, inventory.source.measurement_artifact), "utf8"),
      readFile(resolve(root, "quality/component-evidence-map.json"), "utf8"),
      readFile(resolve(root, "quality/critical-capabilities.json"), "utf8"),
    ]);
    const report = JSON.parse(reportRaw) as VitestJsonReport;
    const coverage = JSON.parse(coverageRaw) as CoverageSummary;
    const candidate = JSON.parse(candidateRaw) as { status?: string };
    const measurementArtifact = JSON.parse(measurementRaw) as ComponentMeasurementArtifactResult;
    const evidenceMap = JSON.parse(evidenceMapRaw) as ComponentEvidenceMap;
    const registry = JSON.parse(registryRaw) as { capabilities: Array<{ id: string; name: string }> };
    const measurement = measurementArtifact.data?.measurement;
    const coverageValid = [Boolean(coverage), typeof coverage === "object", Boolean(coverage.total)].every(Boolean);
    if (!coverageValid) findings.push({ code: "COVERAGE_EVIDENCE_MALFORMED", message: "Source coverage summary is malformed" });
    if (candidate.status !== "PASS") findings.push({ code: "CANDIDATE_NOT_PASS", message: "Measurement candidate checkpoint must record PASS" });
    findings.push(...validateComponentMeasurementArtifactResult(measurementArtifact));
    const measurementFindings = validateComponentMeasurementEnvelope(measurement ?? undefined);
    findings.push(...measurementFindings);
    const retainedMeasurementFindings = validateComponentMeasurementEnvelope(inventory.source.measurement);
    findings.push(...retainedMeasurementFindings.map((finding) => ({ ...finding, code: "RETAINED_MEASUREMENT_ENVELOPE_INVALID" })));
    if (inventory.admission.phase === "admission") {
      await validateExistingBaselineRatchet(
        root,
        report,
        coverage,
        inventory.source.measurement.candidate.comparison_base.resolved_sha,
        inventory.admission.bootstrap,
        options.allowBootstrap === true,
        binding,
        findings,
      );
    }
    const measurementBindingValid = measurement ? measurementMatchesInventory(measurement, inventory) : false;
    if (measurementFindings.length === 0 && !measurementBindingValid) {
      findings.push({ code: "MEASUREMENT_INVENTORY_BINDING_MISMATCH", message: "Inventory source bindings do not exactly match the measurement envelope" });
    }
    const rebuilt = buildBaselineInventory({
      report, reportPath: inventory.source.artifact, reportSha256: inventory.source.artifact_sha256,
      coveragePath: inventory.source.coverage_artifact, coverageSha256: inventory.source.coverage_sha256,
      candidatePath: inventory.source.candidate_artifact, candidateSha256: inventory.source.candidate_sha256,
      measurementPath: inventory.source.measurement_artifact, measurementSha256: inventory.source.measurement_sha256,
      measurement: inventory.source.measurement,
      command: inventory.source.command, commit: inventory.source.commit, generatedAt: inventory.generated_at, root,
      evidenceMap, capabilities: registry.capabilities.map((capability) => ({ ...capability, critical: true as const })),
      proposals: inventoryProposals(inventory), phase: inventory.admission.phase,
      bootstrap: inventory.admission.bootstrap,
      authorIds: inventory.admission.author_ids,
      qualityReviewPath: inventory.admission.quality_review.artifact, securityReviewPath: inventory.admission.security_review.artifact,
    });
    if (JSON.stringify(observedIdentitySummary(rebuilt)) !== JSON.stringify(observedIdentitySummary(inventory))) findings.push({ code: "SOURCE_INVENTORY_MISMATCH", message: "Inventory records do not exactly match normalized source evidence" });
  } catch (error) {
    findings.push({ code: "SOURCE_EVIDENCE_MALFORMED", message: `Source evidence could not be reconstructed: ${String(error)}` });
  }
}

function validateTopLevel(inventory: BaselineInventory, findings: QualityFinding[]): void {
  if (inventory.schema_version !== 1) findings.push({ code: "SCHEMA_VERSION", message: "schema_version must be 1" });
  if (Number.isNaN(Date.parse(inventory.generated_at))) findings.push({ code: "GENERATED_AT", message: "generated_at must be an ISO date-time" });
  if (!Array.isArray(inventory.records)) findings.push({ code: "RECORDS", message: "records must be an array" });
  if (!/^[a-f0-9]{40}$/u.test(inventory.source?.commit ?? "")) findings.push({ code: "SOURCE_COMMIT", message: "source.commit must be a full commit SHA" });
  if (!shaPattern.test(inventory.source?.candidate_digest ?? "")) findings.push({ code: "SOURCE_CANDIDATE_DIGEST", message: "source.candidate_digest must be a SHA-256 digest" });
}

interface LoadedAdmissionInventory {
  inventory?: BaselineInventory;
  parsed?: unknown;
  raw: string;
  reviewPaths?: ResolvedReviewPaths;
}

async function loadAdmissionInventory(
  options: AdmissionValidationOptions,
  predecessorBinding: PredecessorBaselineBinding,
  findings: QualityFinding[],
): Promise<LoadedAdmissionInventory> {
  let raw = "";
  let parsed: unknown;
  try {
    raw = await readFile(options.inventoryPath, "utf8");
    parsed = JSON.parse(raw) as unknown;
  } catch (error) {
    findings.push({ code: "INVENTORY_MALFORMED", message: `Inventory is missing or malformed: ${String(error)}` });
    return { raw };
  }
  const structural = validateInventoryStructure(parsed);
  findings.push(...structural);
  if (structural.length > 0) return { raw, parsed };
  const inventory = parsed as BaselineInventory;
  findings.push(...validateAuthorIds(options, inventory));
  const reviewPaths = resolvedReviewPaths(options, inventory);
  await validateLoadedInventory(options, inventory, raw, reviewPaths, predecessorBinding, findings);
  return { inventory, parsed, raw, reviewPaths };
}

export async function validateBaselineAdmission(options: AdmissionValidationOptions): Promise<{ findings: QualityFinding[]; data: AdmissionValidationData }> {
  const findings: QualityFinding[] = [];
  const predecessorBinding: PredecessorBaselineBinding = { bootstrap: false, sha256: null };
  const { inventory, raw, reviewPaths } = await loadAdmissionInventory(options, predecessorBinding, findings);
  const reviewHashes = inventory && reviewPaths && options.phase === "admission"
    ? await admittedReviewHashes(reviewPaths)
    : { quality: null, security: null };
  return {
    findings,
    data: {
      phase: options.phase,
      inventory: normalizedRelative(options.root, options.inventoryPath),
      inventory_sha256: raw ? sha256(raw) : null,
      candidate_digest: inventory?.source?.candidate_digest ?? null,
      record_count: inventory?.records?.length ?? 0,
      author_ids: inventory?.admission?.author_ids ?? [],
      review_source: "local-agent",
      reviewer_identity_assurance: "asserted-local",
      author_identity_assurance: "asserted-local",
      quality_review_sha256: reviewHashes.quality,
      security_review_sha256: reviewHashes.security,
      bootstrap: predecessorBinding.bootstrap,
      predecessor_baseline_sha256: predecessorBinding.sha256,
    },
  };
}

async function admittedReviewHashes(paths: ResolvedReviewPaths): Promise<{ quality: string | null; security: string | null }> {
  try {
    const [quality, security] = await Promise.all([readFile(paths.quality), readFile(paths.security)]);
    return { quality: sha256(quality), security: sha256(security) };
  } catch {
    return { quality: null, security: null };
  }
}

function validateAuthorIds(options: AdmissionValidationOptions, inventory: BaselineInventory): QualityFinding[] {
  if (options.phase !== "admission") return [];
  const authors = inventory.admission.author_ids;
  if (!Array.isArray(authors) || authors.length === 0) {
    return [{ code: "AUTHOR_IDS_REQUIRED", message: "Admission inventory must bind the complete author ID list" }];
  }
  if (options.disallowedReviewers.length === 0) return [];
  const provided = [...new Set(options.disallowedReviewers)].sort();
  return JSON.stringify(provided) === JSON.stringify(authors) ? [] : [{
    code: "AUTHOR_IDS_OVERRIDE_MISMATCH",
    message: "CLI author IDs must exactly match the independently reviewed inventory author IDs",
  }];
}

async function validateLoadedInventory(options: AdmissionValidationOptions, inventory: BaselineInventory, raw: string, reviewPaths: ResolvedReviewPaths, predecessorBinding: PredecessorBaselineBinding, findings: QualityFinding[]): Promise<void> {
  validateTopLevel(inventory, findings);
  (inventory.records ?? []).forEach((record, index) => validateRecordShape(record, index, findings));
  findings.push(...validateInventorySemantics(inventory, options.now));
  validatePhase(inventory, options.phase, findings);
  validateImmutablePaths(options, inventory, findings);
  await validateSources(options.root, inventory, findings);
  await validateSourceContents(options, inventory, predecessorBinding, findings);
  if (options.phase !== "admission") return;
  await validateCandidateProvenance(options.root, inventory, findings);
  validateAdmissionRecords(inventory, findings);
  await validateReviews(options, inventory, sha256(raw), reviewPaths, findings);
}

async function main(): Promise<never> {
  const { positionals, flags } = parseArgs();
  const root = resolve(flagString(flags, "root", qualityRoot())!);
  const inventoryFlag = positionals[0] ?? flagString(flags, "inventory");
  const output = resolve(root, flagString(flags, "output", "artifacts/quality/baseline-admission.json")!);
  const phaseFlag = flagString(flags, "phase", "draft");
  if (!inventoryFlag || (phaseFlag !== "draft" && phaseFlag !== "admission")) {
    const code = inventoryFlag ? "PHASE_INVALID" : "INVENTORY_REQUIRED";
    const result = makeResult("baseline-admission", [{ code, message: inventoryFlag ? `Unsupported phase ${phaseFlag}` : "Inventory path is required" }], { phase: phaseFlag }, "Baseline admission validation failed");
    return finishCli(result, output);
  }
  const validated = await validateBaselineAdmission({
    root,
    inventoryPath: isAbsolute(inventoryFlag) ? inventoryFlag : resolve(root, inventoryFlag),
    phase: phaseFlag,
    qualityReviewPath: flagString(flags, "quality-review"),
    securityReviewPath: flagString(flags, "security-review"),
    disallowedReviewers: String(flagString(flags, "disallowed-reviewers", "")).split(",").map((value) => value.trim()).filter(Boolean),
    allowBootstrap: flags.get("allow-bootstrap") === true || flags.get("allow-bootstrap") === "true",
    now: Date.now(),
  });
  const result = makeResult(
    "baseline-admission", validated.findings, validated.data,
    validated.findings.length === 0 ? `Baseline ${phaseFlag} validation passed for ${validated.data.record_count} record(s)` : `Baseline ${phaseFlag} validation failed with ${validated.findings.length} finding(s)`,
  );
  return finishCli(result, output);
}

if (import.meta.main) await main();
