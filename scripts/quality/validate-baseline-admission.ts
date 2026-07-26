import { readFile } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";
import {
  finishCli, flagString, makeResult, parseArgs, qualityRoot, sha256,
  type QualityFinding,
} from "./common";
import {
  buildBaselineInventory,
  validateInventorySemantics,
  type BaselineInventory,
  type BaselineInventoryRecord,
  type RatchetProposal,
} from "./component-baseline-core";
import type { ComponentEvidenceMap, CoverageSummary, VitestJsonReport } from "./component-core";

interface ReviewDecision {
  decision?: string;
  inventorySha?: string;
  candidateSha?: string;
  reviewer?: string;
  role?: string;
}

export interface AdmissionValidationOptions {
  root: string;
  inventoryPath: string;
  phase: "draft" | "admission";
  qualityReviewPath?: string;
  securityReviewPath?: string;
  disallowedReviewers: string[];
  now: number;
}

export interface AdmissionValidationData extends Record<string, unknown> {
  phase: "draft" | "admission";
  inventory: string;
  inventory_sha256: string | null;
  candidate_sha256: string | null;
  record_count: number;
  author_ids: string[];
}

const shaPattern = /^[a-f0-9]{64}$/u;
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

function parseReview(text: string): ReviewDecision {
  return {
    decision: text.match(/(?:Decision|Status)\s*:\s*`?(APPROVE|REJECT)`?/iu)?.[1],
    inventorySha: text.match(/Inventory SHA-?256\s*:\s*`?([a-f0-9]{64})`?/iu)?.[1],
    candidateSha: text.match(/Candidate SHA-?256\s*:\s*`?([a-f0-9]{64})`?/iu)?.[1],
    reviewer: text.match(/Reviewer\s*:\s*`?([^`\r\n]+)`?/iu)?.[1]?.trim(),
    role: text.match(/Reviewer Role\s*:\s*`?([^`\r\n]+)`?/iu)?.[1]?.trim(),
  };
}

async function readReview(path: string, findings: QualityFinding[]): Promise<ReviewDecision> {
  try {
    return parseReview(await readFile(path, "utf8"));
  } catch {
    findings.push({ code: "MISSING_REVIEW", message: `Missing independent review ${path}` });
    return {};
  }
}

function validateReviewDecision(review: ReviewDecision, label: string, inventorySha: string, candidateSha: string, findings: QualityFinding[]): void {
  if (review.decision !== "APPROVE") findings.push({ code: "REVIEW_DECISION", message: `${label} review must record APPROVE` });
  if (review.inventorySha !== inventorySha) findings.push({ code: "REVIEW_SHA", message: `${label} review does not bind the exact inventory SHA` });
  if (review.candidateSha !== candidateSha) findings.push({ code: "REVIEW_CANDIDATE_SHA", message: `${label} review does not bind the measurement candidate SHA` });
  if (!review.reviewer) findings.push({ code: "REVIEWER_MISSING", message: `${label} review does not identify a reviewer` });
  if (review.role?.toLowerCase() !== "read-only") findings.push({ code: "REVIEWER_NOT_READ_ONLY", message: `${label} reviewer role must be read-only` });
}

function validateReviewerSeparation(quality: ReviewDecision, security: ReviewDecision, disallowed: string[], findings: QualityFinding[]): void {
  const reviewers = [quality.reviewer, security.reviewer].filter((value): value is string => Boolean(value));
  if (new Set(reviewers).size !== reviewers.length) findings.push({ code: "REVIEWER_NOT_INDEPENDENT", message: "Quality and security reviewers must be different" });
  for (const reviewer of reviewers) {
    if (disallowed.includes(reviewer)) findings.push({ code: "REVIEWER_IS_AUTHOR", message: `${reviewer} is an author and cannot approve admission` });
  }
}

async function validateReviews(options: AdmissionValidationOptions, inventory: BaselineInventory, inventorySha: string, findings: QualityFinding[]): Promise<void> {
  const qualityPath = resolve(options.root, options.qualityReviewPath ?? inventory.admission.quality_review.artifact);
  const securityPath = resolve(options.root, options.securityReviewPath ?? inventory.admission.security_review.artifact);
  const [quality, security] = await Promise.all([readReview(qualityPath, findings), readReview(securityPath, findings)]);
  validateReviewDecision(quality, "Quality", inventorySha, inventory.source.candidate_sha256, findings);
  validateReviewDecision(security, "Security", inventorySha, inventory.source.candidate_sha256, findings);
  validateReviewerSeparation(quality, security, options.disallowedReviewers, findings);
}

function validateImmutablePaths(options: AdmissionValidationOptions, inventory: BaselineInventory, findings: QualityFinding[]): void {
  if (options.phase !== "admission") return;
  for (const path of [inventory.source.artifact, inventory.source.coverage_artifact]) {
    if (!canonicalSourcePaths.has(normalizedRelative(options.root, path))) findings.push({ code: "SOURCE_PATH_MUTABLE", message: `Admission source evidence must use its tracked immutable path`, path });
  }
  if (normalizedRelative(options.root, options.inventoryPath) !== "quality/baselines/component/inventory.json") findings.push({ code: "INVENTORY_PATH_MUTABLE", message: "Admission inventory must use quality/baselines/component/inventory.json", path: options.inventoryPath });
  for (const path of [inventory.admission.quality_review.artifact, inventory.admission.security_review.artifact]) {
    if (!normalizedRelative(options.root, path).startsWith("quality/reviews/")) findings.push({ code: "REVIEW_PATH_MUTABLE", message: "Admission reviews must use tracked quality/reviews paths", path });
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
  ]);
}

function inventoryProposals(inventory: BaselineInventory): Record<string, RatchetProposal> {
  return Object.fromEntries(inventory.records.filter((record) => record.classification === "ratchet_noncritical").map((record) => [record.id, {
    owner: record.owner, rationale: record.rationale, acceptance: record.acceptance, expires_at: record.expires_at ?? "",
  }]));
}

function observedIdentitySummary(inventory: BaselineInventory): string[] {
  return inventory.records.map((record) => JSON.stringify([record.id, record.failure_kind, record.critical_capability_ids])).sort();
}

async function validateSourceContents(root: string, inventory: BaselineInventory, findings: QualityFinding[]): Promise<void> {
  try {
    const [report, coverage, candidate, evidenceMap, registry] = await Promise.all([
      readFile(resolve(root, inventory.source.artifact), "utf8").then((text) => JSON.parse(text) as VitestJsonReport),
      readFile(resolve(root, inventory.source.coverage_artifact), "utf8").then((text) => JSON.parse(text) as CoverageSummary),
      readFile(resolve(root, inventory.source.candidate_artifact), "utf8").then((text) => JSON.parse(text) as { status?: string }),
      readFile(resolve(root, "quality/component-evidence-map.json"), "utf8").then((text) => JSON.parse(text) as ComponentEvidenceMap),
      readFile(resolve(root, "quality/critical-capabilities.json"), "utf8").then((text) => JSON.parse(text) as { capabilities: Array<{ id: string; name: string }> }),
    ]);
    if (!coverage || typeof coverage !== "object" || !coverage.total) findings.push({ code: "COVERAGE_EVIDENCE_MALFORMED", message: "Source coverage summary is malformed" });
    if (candidate.status !== "PASS") findings.push({ code: "CANDIDATE_NOT_PASS", message: "Measurement candidate checkpoint must record PASS" });
    const rebuilt = buildBaselineInventory({
      report, reportPath: inventory.source.artifact, reportSha256: inventory.source.artifact_sha256,
      coveragePath: inventory.source.coverage_artifact, coverageSha256: inventory.source.coverage_sha256,
      candidatePath: inventory.source.candidate_artifact, candidateSha256: inventory.source.candidate_sha256,
      command: inventory.source.command, commit: inventory.source.commit, generatedAt: inventory.generated_at, root,
      evidenceMap, capabilities: registry.capabilities.map((capability) => ({ ...capability, critical: true as const })),
      proposals: inventoryProposals(inventory), phase: inventory.admission.phase,
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
}

export async function validateBaselineAdmission(options: AdmissionValidationOptions): Promise<{ findings: QualityFinding[]; data: AdmissionValidationData }> {
  const findings = validateAuthorIds(options);
  let inventory: BaselineInventory | undefined;
  let raw = "";
  try {
    raw = await readFile(options.inventoryPath, "utf8");
    inventory = JSON.parse(raw) as BaselineInventory;
  } catch (error) {
    findings.push({ code: "INVENTORY_MALFORMED", message: `Inventory is missing or malformed: ${String(error)}` });
  }
  if (inventory) await validateLoadedInventory(options, inventory, raw, findings);
  return {
    findings,
    data: {
      phase: options.phase,
      inventory: normalizedRelative(options.root, options.inventoryPath),
      inventory_sha256: raw ? sha256(raw) : null,
      candidate_sha256: inventory?.source?.candidate_sha256 ?? null,
      record_count: inventory?.records?.length ?? 0,
      author_ids: [...options.disallowedReviewers].sort(),
    },
  };
}

function validateAuthorIds(options: AdmissionValidationOptions): QualityFinding[] {
  if (options.phase !== "admission" || options.disallowedReviewers.length > 0) return [];
  return [{ code: "AUTHOR_IDS_REQUIRED", message: "Admission requires the complete author ID list for reviewer independence validation" }];
}

async function validateLoadedInventory(options: AdmissionValidationOptions, inventory: BaselineInventory, raw: string, findings: QualityFinding[]): Promise<void> {
  validateTopLevel(inventory, findings);
  (inventory.records ?? []).forEach((record, index) => validateRecordShape(record, index, findings));
  findings.push(...validateInventorySemantics(inventory, options.now));
  validatePhase(inventory, options.phase, findings);
  validateImmutablePaths(options, inventory, findings);
  await validateSources(options.root, inventory, findings);
  await validateSourceContents(options.root, inventory, findings);
  if (options.phase !== "admission") return;
  validateAdmissionRecords(inventory, findings);
  await validateReviews(options, inventory, sha256(raw), findings);
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
    now: Date.now(),
  });
  const result = makeResult(
    "baseline-admission", validated.findings, validated.data,
    validated.findings.length === 0 ? `Baseline ${phaseFlag} validation passed for ${validated.data.record_count} record(s)` : `Baseline ${phaseFlag} validation failed with ${validated.findings.length} finding(s)`,
  );
  return finishCli(result, output);
}

if (import.meta.main) await main();
