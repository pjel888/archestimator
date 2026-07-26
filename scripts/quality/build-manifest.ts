import { readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
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
import type { JobResult, ProfilesFile } from "./aggregate-core";
import type { QualityProfile } from "./classifier-core";
import type { ComparisonBase } from "./comparison-base-core";
import { validateManifest } from "./report-core";
import { validateReviews, type ReviewEvidence } from "./review-core";
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
const profiles = await readJson<ProfilesFile & { evidence_commands: EvidenceCommandMap }>(
  resolve(root, flagString(flags, "profiles", "quality/profiles.json")!),
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
for (const job of jobs) {
  if (!job.artifact) continue;
  try {
    const bytes = await readFile(resolve(root, job.artifact.path));
    if (sha256(bytes) !== job.artifact.sha256) {
      throw new Error("artifact hash mismatch");
    }
    const report = JSON.parse(bytes.toString("utf8")) as QualityReport;
    if (
      report.schema_version !== 1 ||
      report.status !== "PASS" ||
      !report.kind ||
      !Array.isArray(report.findings) ||
      typeof report.data !== "object" ||
      report.data === null
    ) {
      throw new Error("artifact is malformed or not PASS");
    }
    reportsByJob.set(job.name, report);
  } catch (error) {
    findings.push({
      code: "JOB_ARTIFACT_MALFORMED",
      message: `${job.name} artifact is missing or malformed: ${String(error)}`,
      path: job.artifact.path,
    });
  }
}

const computedCandidate = candidate?.sha256 ?? "0".repeat(64);
const commitSha = candidate?.record.commit_sha ?? "";

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
const profileReviews = profile ? profiles.profiles[profile] : undefined;
const defaultReviewRequirements = {
  quality: profileReviews?.required_review_types.includes("quality") ?? false,
  security: profileReviews?.required_review_types.includes("security") ?? false,
  release: profileReviews?.required_review_types.includes("release") ?? false,
};
const reviewRequirements = {
  quality:
    typeof reviewData?.requirements?.quality === "boolean"
      ? reviewData.requirements.quality
      : defaultReviewRequirements.quality,
  security:
    typeof reviewData?.requirements?.security === "boolean"
      ? reviewData.requirements.security
      : defaultReviewRequirements.security,
  release:
    typeof reviewData?.requirements?.release === "boolean"
      ? reviewData.requirements.release
      : defaultReviewRequirements.release,
};
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
const commandResults = (selected?.commands ?? []).map((command) => {
  const expected = profiles.command_artifacts[command];
  const job = jobs.find(
    (candidate) =>
      candidate.artifact &&
      expected &&
      basename(candidate.artifact.path) === basename(expected),
  );
  return {
    command,
    status:
      job?.status === "success" && job.conclusion === "PASS" && job.flaky === false
        ? ("PASS" as const)
        : ("FAIL" as const),
    source: "ci" as const,
    ...(job ? { job: job.name } : {}),
    artifact: job?.artifact ?? { path: expected ?? "UNMAPPED", sha256: "0".repeat(64) },
  };
});
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
  const artifacts = matching.flatMap((job) => (job.artifact ? [job.artifact] : []));
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
const failed = [...reportsByJob.values()].reduce(
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
const skipped = [...reportsByJob.values()].reduce(
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
const testArtifacts = jobs.flatMap((job) => (job.artifact ? [job.artifact] : []));
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
  job.artifact
    ? [
        {
          kind: job.name,
          status: job.conclusion,
          source: "ci" as const,
          artifact: job.artifact,
        },
      ]
    : [],
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
findings.push(...validateManifest(flattened));
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
