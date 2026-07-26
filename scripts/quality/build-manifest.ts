import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";
import {
  buildCandidate,
  type CandidateRecord,
  type CanonicalCandidate,
} from "./candidate-core";
import {
  finishCli,
  flagString,
  makeResult,
  parseArgs,
  qualityRoot,
  readJson,
  sha256,
  type QualityFinding,
} from "./common";
import {
  aggregateJobs,
  expectedArtifactEvidenceId,
  expectedArtifactKind,
  findJobArtifact,
  jobArtifacts,
  type JobResult,
  type ProfilesFile,
} from "./aggregate-core";
import type { QualityProfile } from "./classifier-core";
import type { ComparisonBase } from "./comparison-base-core";
import { jobNameForCommand } from "./job-command-core";
import {
  canonicalProfilesOverrideFinding,
  expectedArtifactReportError,
  validateManifest,
} from "./report-core";
import {
  reviewRequirements as computeReviewRequirements,
  validateReviews,
  type ReviewEvidence,
} from "./review-core";
import {
  buildCapabilityEvidence,
  validateTraceability,
  type Capability,
  type EvidenceCommandMap,
} from "./traceability-core";

interface QualityReport {
  schema_version: number;
  kind: string;
  status: "PASS" | "FAIL" | "QUALITY_BLOCKED";
  findings: unknown[];
  data: Record<string, unknown>;
}

const { flags } = parseArgs();
const root = qualityRoot();
const findings: QualityFinding[] = [];
const required = (name: string) => {
  const value = flagString(flags, name);
  if (!value) findings.push({ code: "INPUT_REQUIRED", message: `--${name} is required` });
  return value;
};
const classificationPath = required("classification");
const jobsPath = required("jobs");
const aggregatePath = required("aggregate");
const policyOverride = canonicalProfilesOverrideFinding(root, flagString(flags, "profiles"));
if (policyOverride) findings.push(policyOverride);
const profiles = await readJson<ProfilesFile & { evidence_commands: EvidenceCommandMap }>(
  resolve(root, "quality/profiles.json"),
);
const registry = await readJson<{ capabilities: Capability[] }>(
  resolve(root, flagString(flags, "registry", "quality/critical-capabilities.json")!),
);

let classification: {
  profile: QualityProfile;
  files: string[];
  affected_capabilities: string[];
  comparison_base: ComparisonBase;
  reasons?: string[];
  attribution?: Record<string, unknown>;
} | undefined;
let jobs: JobResult[] = [];
let aggregate: QualityReport | undefined;
let aggregateBytes: Buffer | undefined;
try {
  if (classificationPath) {
    classification = (
      await readJson<{ data: typeof classification }>(resolve(root, classificationPath))
    ).data;
  }
  if (jobsPath) {
    jobs = (await readJson<{ jobs: JobResult[] }>(resolve(root, jobsPath))).jobs;
  }
  if (aggregatePath) {
    aggregateBytes = await readFile(resolve(root, aggregatePath));
    aggregate = JSON.parse(aggregateBytes.toString("utf8")) as QualityReport;
  }
  if (
    !classification ||
    !profiles.profiles[classification.profile] ||
    !Array.isArray(classification.files) ||
    !Array.isArray(classification.affected_capabilities) ||
    !classification.comparison_base ||
    !Array.isArray(jobs) ||
    aggregate?.kind !== "quality-aggregate"
  ) {
    throw new Error("classification, jobs, or aggregate contract is incomplete");
  }
} catch (error) {
  findings.push({
    code: "INPUT_MALFORMED",
    message: `Final manifest input is missing or malformed: ${String(error)}`,
  });
}

let candidate: CanonicalCandidate | undefined;
try {
  if (!classification) throw new Error("classification is unavailable");
  candidate = await buildCandidate({
    root,
    comparison_base: classification.comparison_base,
    classification,
    expected: flagString(flags, "expected"),
  });
  const declaredCommit = flagString(flags, "commit-sha") ?? process.env.QUALITY_CANDIDATE_SHA;
  if (declaredCommit && declaredCommit !== candidate.record.commit_sha) {
    throw new Error("declared candidate commit does not equal HEAD");
  }
} catch (error) {
  findings.push({
    code: "CANDIDATE_INVALID",
    message: `Final manifest candidate is missing or malformed: ${String(error)}`,
  });
}

const reportsByJob = new Map<string, QualityReport>();
const allReports: QualityReport[] = [];
const validatedArtifacts = new Set<string>();
const reportsByArtifact = new Map<string, QualityReport>();
for (const job of jobs) {
  const seenPaths = new Set<string>();
  for (const [index, artifact] of jobArtifacts(job).entries()) {
    try {
      if (seenPaths.has(artifact.path)) {
        throw new Error("artifact path is duplicated within the job result");
      }
      seenPaths.add(artifact.path);
      const bytes = await readFile(resolve(root, artifact.path));
      if (sha256(bytes) !== artifact.sha256) {
        throw new Error("artifact hash mismatch");
      }
      const report = JSON.parse(bytes.toString("utf8")) as QualityReport;
      const reportError = expectedArtifactReportError(report, artifact.path);
      if (reportError) throw new Error(reportError);
      const artifactKey = `${artifact.path}\0${artifact.sha256}`;
      validatedArtifacts.add(artifactKey);
      reportsByArtifact.set(artifactKey, report);
      allReports.push(report);
      if (index === 0) reportsByJob.set(job.name, report);
    } catch (error) {
      findings.push({
        code: "JOB_ARTIFACT_MALFORMED",
        message: `${job.name} artifact is missing or malformed: ${String(error)}`,
        path: artifact.path,
      });
    }
  }
}

const computedCandidate = candidate?.sha256 ?? "0".repeat(64);
const commitSha = candidate?.record.commit_sha ?? "";
if (!isDeepStrictEqual(reportsByJob.get("quality / classify")?.data, classification)) {
  findings.push({
    code: "CLASSIFICATION_ARTIFACT_MISMATCH",
    message: "Classification input does not equal the validated classification job artifact",
  });
}

const reviewJob = jobs.find((job) => job.name === "quality / review");
const reviewReport = reportsByJob.get("quality / review");
const reviewData = reviewReport?.data as
  | {
      candidate?: CandidateRecord & { sha256: string };
      requirements?: { quality?: boolean; security?: boolean; release?: boolean };
      reviews?: ReviewEvidence[];
      author_ids?: string[];
      source?: string;
    }
  | undefined;
const profile = classification?.profile;
const reviewRequirements = profile && classification
  ? computeReviewRequirements(
      profile,
      classification.files,
      classification.affected_capabilities,
    )
  : { quality: true, security: true, release: true };
const reviewAuthors = Array.isArray(reviewData?.author_ids) ? reviewData.author_ids : [];
const reviewEvidence = Array.isArray(reviewData?.reviews) ? reviewData.reviews : [];
if (
  reviewReport &&
  (!reviewData?.requirements ||
    !Array.isArray(reviewData.author_ids) ||
    !Array.isArray(reviewData.reviews) ||
    !["local-agent", "github"].includes(String(reviewData.source)))
) {
  findings.push({
    code: "REVIEW_MALFORMED",
    message: "Independent review report data is missing or malformed",
  });
}
let reviewCandidate: CanonicalCandidate | undefined;
if (reviewData?.candidate) {
  const { sha256: digest, ...record } = reviewData.candidate;
  reviewCandidate = { record, sha256: digest };
}
if (reviewReport && !reviewCandidate) {
  findings.push({
    code: "REVIEW_TARGET_MISMATCH",
    message: "Independent review report does not bind the final manifest candidate",
  });
} else if (reviewCandidate) {
  findings.push(
    ...validateReviews({
      requirements: reviewRequirements,
      candidate: reviewCandidate,
      author_ids: reviewAuthors,
      reviews: reviewEvidence,
    }),
  );
  if (reviewCandidate.sha256 !== computedCandidate) {
    findings.push({
      code: "REVIEW_TARGET_MISMATCH",
      message: "Independent review report does not bind the final manifest candidate",
    });
  }
}

const selected = profile ? profiles.profiles[profile] : undefined;
findings.push(...aggregateJobs(selected?.required_jobs ?? [], jobs));

function artifactKey(artifact: { path: string; sha256: string } | undefined): string | undefined {
  return artifact ? `${artifact.path}\0${artifact.sha256}` : undefined;
}

function reportMatchesExpectedArtifact(
  report: QualityReport | undefined,
  expected: string | undefined,
): boolean {
  if (!report || !expected) return false;
  const expectedKind = expectedArtifactKind(expected);
  if (!expectedKind || report.kind !== expectedKind) return false;
  if (expectedKind !== "command-evidence") return true;
  const expectedEvidenceId = expectedArtifactEvidenceId(expected);
  return (
    report.findings.length === 0 &&
    expectedEvidenceId !== undefined &&
    report.data.evidence_id === expectedEvidenceId
  );
}

function jobProvesArtifact(
  job: JobResult | undefined,
  artifact: { path: string; sha256: string } | undefined,
): boolean {
  if (!job || !artifact) return false;
  return (
    job.status === "success" &&
    job.conclusion === "PASS" &&
    job.flaky === false &&
    validatedArtifacts.has(`${artifact.path}\0${artifact.sha256}`)
  );
}

function buildCommandResult(command: string) {
  const expected = profiles.command_artifacts[command];
  const match = findJobArtifact(jobs, jobNameForCommand(command), expected);
  const job = match?.job;
  const artifact = match?.artifact;
  const key = artifactKey(artifact);
  const report = key ? reportsByArtifact.get(key) : undefined;
  const passing =
    jobProvesArtifact(job, artifact) && reportMatchesExpectedArtifact(report, expected);
  return {
    command,
    status: passing ? ("PASS" as const) : ("FAIL" as const),
    source: "ci" as const,
    ...(job ? { job: job.name } : {}),
    artifact: artifact ?? { path: expected ?? "UNMAPPED", sha256: "0".repeat(64) },
  };
}

const commandResults = (selected?.commands ?? []).map(buildCommandResult);
const capabilityInputs = commandResults.map((result) => ({
  command: result.command,
  exit_code: result.status === "PASS" ? 0 : 1,
  artifact: result.artifact,
}));
const capabilityEvidence =
  profile && classification
    ? buildCapabilityEvidence(
        classification.affected_capabilities,
        registry.capabilities,
        profiles.evidence_commands,
        profile,
        capabilityInputs,
      )
    : [];
const traceabilityFindings = classification
  ? validateTraceability(
      classification.affected_capabilities,
      registry.capabilities,
      capabilityEvidence,
    )
  : [];
findings.push(...traceabilityFindings);

function numericObjectMetric(value: unknown, names: Set<string>): number {
  if (!value || typeof value !== "object") return 0;
  return Object.entries(value as Record<string, unknown>).reduce(
    (total, [key, child]) => total + numericEntryMetric(key, child, names),
    0,
  );
}

function numericEntryMetric(key: string, child: unknown, names: Set<string>): number {
  if (names.has(key) && typeof child === "number" && Number.isFinite(child)) {
    return child;
  }
  return numericObjectMetric(child, names);
}

function numericMetric(report: QualityReport | undefined, names: string[]): number {
  return report ? numericObjectMetric(report.data, new Set(names)) : 0;
}

function domain(jobNames: string[], applicable: boolean) {
  const matching = jobs.filter((job) => jobNames.includes(job.name));
  const artifacts = matching.flatMap(jobArtifacts);
  const passing =
    applicable &&
    matching.length > 0 &&
    matching.every(
      (job) => job.status === "success" && job.conclusion === "PASS" && job.flaky === false,
    );
  return {
    applicable,
    status: applicable ? (passing ? "PASS" : "FAIL") : "NOT_APPLICABLE",
    artifacts,
    metrics: Object.fromEntries(
      matching.map((job) => [
        job.name,
        {
          kind: reportsByJob.get(job.name)?.kind ?? "missing",
          findings: reportsByJob.get(job.name)?.findings.length ?? 0,
        },
      ]),
    ),
  };
}

let waivers: Record<string, unknown>[] = [];
const waiversPath = flagString(flags, "waivers");
if (waiversPath) {
  try {
    const payload = await readJson<unknown>(resolve(root, waiversPath));
    waivers = Array.isArray(payload)
      ? (payload as Record<string, unknown>[])
      : ((payload as { waivers?: Record<string, unknown>[] }).waivers ?? []);
  } catch (error) {
    findings.push({
      code: "WAIVER_INPUT_MALFORMED",
      message: `Waiver input is malformed: ${String(error)}`,
    });
  }
}
const failed = allReports.reduce(
  (total, report) =>
    total +
    numericMetric(report, [
      "tests_failed",
      "scenarios_failed",
      "steps_failed",
      "numFailedTests",
    ]),
  0,
);
const skipped = allReports.reduce(
  (total, report) =>
    total +
    numericMetric(report, [
      "tests_skipped",
      "scenarios_skipped",
      "steps_skipped",
      "numPendingTests",
    ]),
  0,
);
const flaky = jobs.filter((job) => job.flaky).length;
const testArtifacts = jobs.flatMap(jobArtifacts);
const testHealth = {
  applicable: true,
  status: failed === 0 && skipped === 0 && flaky === 0 ? "PASS" : "FAIL",
  artifacts: testArtifacts,
  metrics: { failed, skipped, flaky },
};
const waiversDomain = {
  applicable: true,
  status: "PASS",
  artifacts: [],
  metrics: {
    active: waivers.filter((waiver) => waiver.status === "ACTIVE").length,
    expired: waivers.filter((waiver) => waiver.status === "EXPIRED").length,
    rejected: waivers.filter((waiver) => waiver.status === "REJECTED").length,
  },
};
const qualityDomains = {
  coverage: domain(["quality / coverage"], selected?.required_jobs.includes("quality / coverage") ?? false),
  mutation: domain(["quality / mutation"], selected?.required_jobs.includes("quality / mutation") ?? false),
  bdd: domain(["quality / bdd-smoke"], selected?.required_jobs.includes("quality / bdd-smoke") ?? false),
  test_health: testHealth,
  accessibility: domain(["quality / a11y"], selected?.required_jobs.includes("quality / a11y") ?? false),
  security: domain(["quality / security"], selected?.required_jobs.includes("quality / security") ?? false),
  performance_operations: domain(
    ["quality / operations"],
    selected?.required_jobs.includes("quality / operations") ?? false,
  ),
  waivers: waiversDomain,
};

const allEvidence = jobs.flatMap((job) =>
  jobArtifacts(job).map((artifact) => ({
    kind: job.name,
    status: job.conclusion,
    source: "ci" as const,
    artifact,
  })),
);
const externalEvidence = [];
if (reviewJob?.artifact && reviewData?.source) {
  externalEvidence.push({
    kind: "independent-reviews",
    status: "PASS" as const,
    source:
      reviewData.source === "github"
        ? ("remote" as const)
        : ("external-manifest" as const),
    artifact: reviewJob.artifact,
    ...(reviewData.source === "github" ? { authoritative_readback: true } : {}),
  });
}
if (aggregate?.status !== "PASS") {
  findings.push({
    code: "AGGREGATE_FAILED",
    message: "Final manifest requires a passing aggregate artifact",
  });
}

const manifestData = {
  profile: profile ?? null,
  mode: "ci" as const,
  candidate: {
    commit_sha: commitSha,
    sha256: computedCandidate,
  },
  classification: classification ?? {},
  merge_base: String(classification?.attribution?.merge_base ?? ""),
  scope: {
    changed_files: classification?.files ?? [],
    inherited_dirty_files: classification?.attribution?.inherited_dirty_files ?? [],
    migration_changed_files: classification?.attribution?.migration_changed_files ?? [],
    overlapping_files: classification?.attribution?.overlapping_files ?? [],
  },
  required_jobs: selected?.required_jobs ?? [],
  commands: selected?.commands ?? [],
  command_results: commandResults,
  job_results: jobs,
  evidence: allEvidence,
  reviews: {
    candidate_sha256: reviewData?.candidate?.sha256 ?? computedCandidate,
    requirements: reviewRequirements,
    decisions: reviewData?.reviews ?? [],
    input_paths: [],
    author_ids: reviewAuthors,
    artifact: reviewJob?.artifact ?? null,
  },
  quality_domains: qualityDomains,
  traceability: {
    status: traceabilityFindings.length === 0 ? "PASS" : "FAIL",
    affected_capabilities: classification?.affected_capabilities ?? [],
    evidence: capabilityEvidence,
    findings: traceabilityFindings,
  },
  waivers,
  external_evidence: externalEvidence,
  aggregate: {
    status: aggregate?.status ?? "FAIL",
    artifact:
      aggregatePath && aggregateBytes
        ? { path: aggregatePath, sha256: sha256(aggregateBytes) }
        : { path: "UNAVAILABLE", sha256: "0".repeat(64) },
  },
  remaining_risk: [] as string[],
  stop_condition: "All profile-required exact-candidate evidence and reviews validated",
};
const flattened = {
  schema_version: 1,
  ...manifestData,
  status: findings.length === 0 ? "PASS" : "FAIL",
};
findings.push(...validateManifest(flattened, profiles));
if (candidate && classification) {
  try {
    candidate = await buildCandidate({
      root,
      comparison_base: classification.comparison_base,
      classification,
      expected: computedCandidate,
    });
  } catch (error) {
    findings.push({
      code: "CANDIDATE_CHANGED_BEFORE_OUTPUT",
      message: `Final manifest candidate changed before output: ${String(error)}`,
    });
  }
}
manifestData.remaining_risk = findings.map((finding) => finding.message);
if (findings.length > 0) {
  manifestData.stop_condition = "Quality gate stopped because required evidence is red or missing";
}
const result = makeResult(
  "quality-manifest",
  findings,
  manifestData,
  findings.length === 0
    ? `Final quality manifest PASS for ${String(profile)}`
    : `Final quality manifest FAIL with ${findings.length} finding(s)`,
);
await finishCli(
  result,
  resolve(root, flagString(flags, "output", "artifacts/quality/manifest.json")!),
);
