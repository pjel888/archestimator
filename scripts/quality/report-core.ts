import type { QualityFinding } from "./common";

interface Artifact {
  path: string;
  sha256: string;
}

interface CommandResult {
  command: string;
  status: "PASS" | "FAIL" | "QUALITY_BLOCKED";
  source: "local" | "ci";
  artifact: Artifact;
}

interface JobResult {
  name: string;
  status: "success" | "failure" | "skipped" | "cancelled";
  conclusion: "PASS" | "FAIL";
  flaky: boolean;
  artifact: Artifact;
}

interface Evidence {
  kind: string;
  status: "PASS" | "FAIL" | "QUALITY_BLOCKED";
  source: "local" | "ci" | "remote" | "hosted" | "external-manifest";
  artifact: Artifact;
  authoritative_readback?: boolean;
}

interface ReviewDecision {
  review_type: "quality" | "security" | "release";
  reviewer_id: string;
  decision: "APPROVE" | "REQUEST_CHANGES" | "BLOCKED";
  candidate_sha256: string;
  commit_sha: string;
  reviewed_at: string;
  read_only: boolean;
  source: "local-agent" | "github";
}

function validArtifact(value: unknown): value is Artifact {
  const artifact = value as Artifact | undefined;
  return Boolean(
    artifact?.path &&
      /^[a-f0-9]{64}$/u.test(artifact.sha256),
  );
}

function validArrayProperty(
  findings: QualityFinding[],
  target: Record<string, unknown> | undefined,
  key: string,
  prefix: string,
): void {
  if (!Array.isArray(target?.[key])) {
    findings.push({
      code: "MANIFEST_SHAPE",
      message: `${prefix}.${key} must be an array`,
    });
  }
}

function validateManifestHeader(
  manifest: Record<string, unknown>,
  findings: QualityFinding[],
): Record<string, unknown> | undefined {
  if (manifest.schema_version !== 1) {
    findings.push({ code: "MANIFEST_VERSION", message: "Manifest schema_version must be 1" });
  }
  if (
    ![
      "Q0_CONTRACT_ONLY",
      "Q1_CHANGE_GATE",
      "Q2_CRITICAL_CHANGE_GATE",
      "Q3_RELEASE_GATE",
    ].includes(String(manifest.profile))
  ) {
    findings.push({ code: "MANIFEST_PROFILE", message: "Manifest profile is invalid" });
  }
  if (!/^[a-f0-9]{40}$/u.test(String(manifest.merge_base ?? ""))) {
    findings.push({
      code: "MANIFEST_MERGE_BASE",
      message: "Manifest merge base must be an exact 40-character SHA",
    });
  }
  const candidate = manifest.candidate as Record<string, unknown> | undefined;
  if (!validCandidateHeader(candidate)) {
    findings.push({
      code: "MANIFEST_CANDIDATE",
      message: "Manifest candidate must include exact commit and worktree hashes",
    });
  }
  return candidate;
}

function validCandidateHeader(candidate: Record<string, unknown> | undefined): boolean {
  return (
    /^[a-f0-9]{40}$/u.test(String(candidate?.commit_sha ?? "")) &&
    /^[a-f0-9]{64}$/u.test(String(candidate?.sha256 ?? ""))
  );
}

function validateManifestArrays(
  manifest: Record<string, unknown>,
  findings: QualityFinding[],
): void {
  const scope = manifest.scope as Record<string, unknown> | undefined;
  for (const key of [
    "changed_files",
    "inherited_dirty_files",
    "migration_changed_files",
    "overlapping_files",
  ]) {
    validArrayProperty(findings, scope, key, "scope");
  }
  for (const key of ["required_jobs", "commands", "command_results", "job_results", "evidence"]) {
    validArrayProperty(findings, manifest, key, "manifest");
  }
}

function validateCommandResults(
  manifest: Record<string, unknown>,
  findings: QualityFinding[],
): void {
  const commandResults = Array.isArray(manifest.command_results)
    ? (manifest.command_results as CommandResult[])
    : [];
  for (const result of commandResults) {
    if (malformedCommandResult(result)) {
      findings.push({ code: "COMMAND_RESULT_MALFORMED", message: "Command result is malformed" });
    } else if (result.status !== "PASS") {
      findings.push({
        code: "COMMAND_FAILED",
        message: `${result.command} recorded ${String(result.status)}`,
      });
    }
  }
  const commands = Array.isArray(manifest.commands) ? (manifest.commands as string[]) : [];
  for (const command of commands) {
    if (!commandResults.some((result) => result.command === command)) {
      findings.push({
        code: "COMMAND_RESULT_MISSING",
        message: `No command result records ${command}`,
      });
    }
  }
}

function malformedCommandResult(result: CommandResult): boolean {
  return !result.command || !["local", "ci"].includes(result.source) || !validArtifact(result.artifact);
}

function validateJobResults(
  manifest: Record<string, unknown>,
  findings: QualityFinding[],
): void {
  const requiredJobs = Array.isArray(manifest.required_jobs)
    ? (manifest.required_jobs as string[])
    : [];
  const jobResults = Array.isArray(manifest.job_results)
    ? (manifest.job_results as JobResult[])
    : [];
  const jobsByName = new Map(jobResults.map((job) => [job.name, job]));
  for (const name of requiredJobs) {
    const job = jobsByName.get(name);
    if (!job) {
      findings.push({ code: "MISSING_JOB", message: `Required job is missing: ${name}` });
      continue;
    }
    if (
      job.status !== "success" ||
      job.conclusion !== "PASS" ||
      job.flaky !== false ||
      !validArtifact(job.artifact)
    ) {
      findings.push({
        code: "JOB_NOT_PASSING",
        message: `${name} is missing, skipped, flaky, malformed, or not passing`,
      });
    }
  }
}

function validateEvidenceItems(
  manifest: Record<string, unknown>,
  findings: QualityFinding[],
): void {
  const evidenceItems = Array.isArray(manifest.evidence)
    ? (manifest.evidence as Evidence[])
    : [];
  for (const evidence of evidenceItems) {
    if (malformedEvidence(evidence)) {
      findings.push({
        code: "EVIDENCE_FAILED",
        message: `${evidence.kind ?? "unknown"} evidence is malformed or not PASS`,
      });
    }
    if (unprovenExternalEvidence(evidence)) {
      findings.push({
        code: "UNPROVEN_EXTERNAL_CLAIM",
        message: `${evidence.kind} claims ${evidence.source} proof without authoritative readback`,
      });
    }
  }
}

function malformedEvidence(evidence: Evidence): boolean {
  return (
    !evidence.kind ||
    !["local", "ci", "remote", "hosted", "external-manifest"].includes(evidence.source) ||
    !validArtifact(evidence.artifact) ||
    evidence.status !== "PASS"
  );
}

function unprovenExternalEvidence(evidence: Evidence): boolean {
  const external = evidence.source === "hosted" || evidence.source === "remote";
  return external && evidence.authoritative_readback !== true;
}

function validReviewBinding(
  reviews: Record<string, unknown> | undefined,
  candidate: Record<string, unknown> | undefined,
): boolean {
  return (
    /^[a-f0-9]{64}$/u.test(String(reviews?.candidate_sha256 ?? "")) &&
    reviews?.candidate_sha256 === candidate?.sha256
  );
}

function validReviewRequirements(
  requirements: Record<string, unknown> | undefined,
): requirements is Record<string, unknown> {
  return Boolean(
    requirements &&
      "quality" in requirements &&
      "security" in requirements &&
      "release" in requirements,
  );
}

function validReviewSummary(
  manifest: Record<string, unknown>,
  candidate: Record<string, unknown> | undefined,
  findings: QualityFinding[],
): {
  reviews: Record<string, unknown>;
  requirements: Record<string, unknown>;
  decisions: ReviewDecision[];
} | undefined {
  const reviews = manifest.reviews as Record<string, unknown> | undefined;
  const requirements = reviews?.requirements as Record<string, unknown> | undefined;
  const decisions = Array.isArray(reviews?.decisions)
    ? (reviews.decisions as ReviewDecision[])
    : [];
  if (!validReviewBinding(reviews, candidate) || !validReviewRequirements(requirements)) {
    findings.push({
      code: "REVIEW_SUMMARY_MALFORMED",
      message: "Manifest review summary is missing or does not bind the candidate",
    });
    return undefined;
  }
  return { reviews: reviews!, requirements, decisions };
}

function validateReviewArtifact(
  reviews: Record<string, unknown>,
  requirements: Record<string, unknown>,
  findings: QualityFinding[],
): void {
  const required =
    requirements.quality === true ||
    requirements.security === true ||
    requirements.release === true;
  if (required && !validArtifact(reviews.artifact)) {
    findings.push({
      code: "REVIEW_ARTIFACT_MALFORMED",
      message: "Required review decisions lack a hashed review artifact",
    });
  }
}

function validateRequiredApprovals(
  candidate: Record<string, unknown> | undefined,
  requirements: Record<string, unknown>,
  decisions: ReviewDecision[],
  findings: QualityFinding[],
): void {
  for (const type of ["quality", "security", "release"] as const) {
    if (requirements[type] !== true) continue;
    const approval = decisions.find((decision) => exactApproval(decision, type, candidate));
    if (!approval) {
      findings.push({
        code: "REVIEW_REQUIRED",
        message: `Manifest lacks an exact-candidate independent ${type} approval`,
      });
    }
  }
}

function exactApproval(
  decision: ReviewDecision,
  type: ReviewDecision["review_type"],
  candidate: Record<string, unknown> | undefined,
): boolean {
  return (
    decision.review_type === type &&
    decision.decision === "APPROVE" &&
    decision.read_only === true &&
    decision.candidate_sha256 === candidate?.sha256 &&
    decision.commit_sha === candidate?.commit_sha &&
    validApprovalEvidence(decision)
  );
}

function validApprovalEvidence(decision: ReviewDecision): boolean {
  return (
    Number.isFinite(Date.parse(decision.reviewed_at)) &&
    ["local-agent", "github"].includes(decision.source) &&
    Boolean(decision.reviewer_id)
  );
}

function validateDistinctSecurityApproval(
  candidate: Record<string, unknown> | undefined,
  requirements: Record<string, unknown>,
  decisions: ReviewDecision[],
  findings: QualityFinding[],
): void {
  const approvedReviewer = (type: ReviewDecision["review_type"]) =>
    decisions.find((decision) => exactApproval(decision, type, candidate))?.reviewer_id;
  const qualityReviewer = approvedReviewer("quality");
  const securityReviewer = approvedReviewer("security");
  if (
    requirements.security === true &&
    qualityReviewer &&
    qualityReviewer === securityReviewer
  ) {
    findings.push({
      code: "SECURITY_REVIEW_NOT_DISTINCT",
      message: "Security approval must be distinct from quality approval",
    });
  }
}

function validateReviewSummary(
  manifest: Record<string, unknown>,
  candidate: Record<string, unknown> | undefined,
  findings: QualityFinding[],
): void {
  const summary = validReviewSummary(manifest, candidate, findings);
  if (!summary) return;
  validateReviewArtifact(summary.reviews, summary.requirements, findings);
  validateRequiredApprovals(candidate, summary.requirements, summary.decisions, findings);
  validateDistinctSecurityApproval(candidate, summary.requirements, summary.decisions, findings);
}

function validateQualityDomains(
  manifest: Record<string, unknown>,
  findings: QualityFinding[],
): Record<string, unknown> | undefined {
  const domains = manifest.quality_domains as Record<string, unknown> | undefined;
  for (const name of [
    "coverage",
    "mutation",
    "bdd",
    "test_health",
    "accessibility",
    "security",
    "performance_operations",
    "waivers",
  ]) {
    const domain = domains?.[name] as Record<string, unknown> | undefined;
    if (malformedQualityDomain(domain)) {
      findings.push({
        code: "QUALITY_DOMAIN_MALFORMED",
        message: `quality_domains.${name} is malformed`,
      });
    } else if (failedQualityDomain(domain)) {
      findings.push({
        code: "QUALITY_DOMAIN_FAILED",
        message: `quality_domains.${name} is ${String(domain.status)}`,
      });
    }
  }
  return domains;
}

function malformedQualityDomain(domain: Record<string, unknown> | undefined): boolean {
  return (
    typeof domain?.applicable !== "boolean" ||
    !Array.isArray(domain.artifacts) ||
    (domain.artifacts as unknown[]).some((artifact) => !validArtifact(artifact)) ||
    typeof domain.metrics !== "object" ||
    domain.metrics === null
  );
}

function failedQualityDomain(domain: Record<string, unknown>): boolean {
  const applicableFailure = domain.applicable === true && domain.status !== "PASS";
  const inapplicableFailure =
    domain.applicable === false && domain.status !== "NOT_APPLICABLE";
  return applicableFailure || inapplicableFailure;
}

function validateTestHealth(
  domains: Record<string, unknown> | undefined,
  findings: QualityFinding[],
): void {
  const testHealth = domains?.test_health as Record<string, unknown> | undefined;
  const testMetrics = testHealth?.metrics as Record<string, unknown> | undefined;
  for (const metric of ["failed", "skipped", "flaky"]) {
    if (!Number.isInteger(testMetrics?.[metric]) || Number(testMetrics?.[metric]) !== 0) {
      findings.push({
        code: "TEST_HEALTH_FAILED",
        message: `test_health.${metric} must be zero`,
      });
    }
  }
}

function validateWaivers(
  manifest: Record<string, unknown>,
  findings: QualityFinding[],
): void {
  if (!Array.isArray(manifest.waivers)) {
    findings.push({
      code: "WAIVER_LIST_MALFORMED",
      message: "waivers must be an explicit array",
    });
  }
  const waivers = Array.isArray(manifest.waivers)
    ? (manifest.waivers as Record<string, unknown>[])
    : [];
  for (const waiver of waivers) {
    if (invalidWaiver(waiver)) {
      findings.push({
        code: "WAIVER_INVALID",
        message: `Waiver ${String(waiver.id ?? "unknown")} is expired, rejected, or malformed`,
      });
    }
  }
}

function invalidWaiver(waiver: Record<string, unknown>): boolean {
  return (
    waiver.status !== "ACTIVE" ||
    !Array.isArray(waiver.approvals) ||
    waiver.approvals.length < 2 ||
    !Number.isFinite(Date.parse(String(waiver.expires_at))) ||
    Date.parse(String(waiver.expires_at)) <= Date.now()
  );
}

function validateTraceabilityAndAggregate(
  manifest: Record<string, unknown>,
  findings: QualityFinding[],
): void {
  const traceability = manifest.traceability as Record<string, unknown> | undefined;
  if (
    traceability?.status !== "PASS" ||
    !Array.isArray(traceability.affected_capabilities) ||
    !Array.isArray(traceability.evidence) ||
    !Array.isArray(traceability.findings)
  ) {
    findings.push({
      code: "TRACEABILITY_FAILED",
      message: "Traceability is missing, malformed, or not PASS",
    });
  }
  const aggregate = manifest.aggregate as Record<string, unknown> | undefined;
  if (aggregate?.status !== "PASS" || !validArtifact(aggregate.artifact)) {
    findings.push({
      code: "AGGREGATE_FAILED",
      message: "Aggregate evidence is missing, malformed, or not PASS",
    });
  }
}

function validateExternalEvidence(
  manifest: Record<string, unknown>,
  findings: QualityFinding[],
): void {
  if (!Array.isArray(manifest.external_evidence)) {
    findings.push({
      code: "EXTERNAL_EVIDENCE_MALFORMED",
      message: "external_evidence must explicitly distinguish remote and local proof",
    });
  } else {
    for (const evidence of manifest.external_evidence as Evidence[]) {
      if (
        !["remote", "hosted", "external-manifest"].includes(evidence.source) ||
        !validArtifact(evidence.artifact) ||
        ((evidence.source === "remote" || evidence.source === "hosted") &&
          evidence.authoritative_readback !== true)
      ) {
        findings.push({
          code: "EXTERNAL_EVIDENCE_MALFORMED",
          message: `${evidence.kind ?? "unknown"} external evidence is malformed or unproven`,
        });
      }
    }
  }
}

function validateCompletion(
  manifest: Record<string, unknown>,
  findings: QualityFinding[],
): void {
  if (!Array.isArray(manifest.remaining_risk) || !String(manifest.stop_condition ?? "")) {
    findings.push({
      code: "COMPLETION_CONTRACT_MALFORMED",
      message: "remaining_risk and stop_condition are required",
    });
  }
  if (!["PASS", "FAIL", "QUALITY_BLOCKED"].includes(String(manifest.status))) {
    findings.push({ code: "MANIFEST_STATUS", message: "Manifest status is invalid" });
  } else if (manifest.status !== "PASS") {
    findings.push({
      code: "MANIFEST_NOT_PASSING",
      message: `Manifest status is ${String(manifest.status)}`,
    });
  }
}

export function validateManifest(manifest: Record<string, unknown>): QualityFinding[] {
  const findings: QualityFinding[] = [];
  const candidate = validateManifestHeader(manifest, findings);
  validateManifestArrays(manifest, findings);
  validateCommandResults(manifest, findings);
  validateJobResults(manifest, findings);
  validateEvidenceItems(manifest, findings);
  validateReviewSummary(manifest, candidate, findings);
  const domains = validateQualityDomains(manifest, findings);
  validateTestHealth(domains, findings);
  validateWaivers(manifest, findings);
  validateTraceabilityAndAggregate(manifest, findings);
  validateExternalEvidence(manifest, findings);
  validateCompletion(manifest, findings);
  if (manifest.status === "PASS" && findings.length > 0) {
    findings.push({
      code: "FALSE_PASS",
      message: "Manifest claims PASS despite missing or failed evidence",
    });
  }
  return findings;
}
