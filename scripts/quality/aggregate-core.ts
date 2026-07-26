import { basename } from "node:path";

import type { QualityFinding } from "./common";
import type { QualityProfile } from "./classifier-core";
import { artifactBelongsToJob } from "./job-command-core";

export interface JobResult {
  name: string;
  status: "success" | "failure" | "skipped" | "cancelled";
  conclusion: "PASS" | "FAIL";
  flaky: boolean;
  artifact?: { path: string; sha256: string };
  artifacts?: { path: string; sha256: string }[];
}

const VALID_JOB_STATUSES = new Set<JobResult["status"]>([
  "success",
  "failure",
  "skipped",
  "cancelled",
]);

const EXPECTED_KINDS_BY_ARTIFACT = new Map<string, string>([
  ["classification.json", "quality-classification"],
  ["contracts.json", "quality-contracts"],
  ["adapter-validation.json", "ai-workflow-adapter-validation"],
  ["anti-bypass.json", "anti-bypass"],
  ["workflows.json", "workflow-security"],
  ["reviews.json", "independent-review-gate"],
  ["enforcement.json", "enforcement-contract"],
  ["static.json", "quality-static"],
  ["unit.json", "command-evidence"],
  ["component.json", "component-gate"],
  ["property.json", "command-evidence"],
  ["workers.json", "command-evidence"],
  ["bdd-smoke.json", "command-evidence"],
  ["bdd.json", "command-evidence"],
  ["a11y.json", "command-evidence"],
  ["build.json", "command-evidence"],
  ["bundle-budget.json", "command-evidence"],
  ["e2e-smoke.json", "command-evidence"],
  ["e2e-matrix.json", "command-evidence"],
  ["mutation.json", "mutation-gate"],
  ["security.json", "quality-security"],
  ["ai-eval.json", "command-evidence"],
  ["operations.json", "quality-operations"],
  ["diff-coverage.json", "diff-coverage"],
]);

const EXPECTED_EVIDENCE_IDS_BY_ARTIFACT = new Map<string, string>([
  ["unit.json", "test:unit:coverage"],
  ["property.json", "test:property"],
  ["workers.json", "test:workers:coverage"],
  ["bdd-smoke.json", "test:bdd:smoke"],
  ["bdd.json", "test:bdd"],
  ["a11y.json", "test:a11y"],
  ["build.json", "build"],
  ["bundle-budget.json", "bundle-budget"],
  ["e2e-smoke.json", "test:e2e:smoke"],
  ["e2e-matrix.json", "test:e2e:matrix"],
  ["ai-eval.json", "test:ai-evals"],
]);

export function expectedArtifactKind(path: string): string | undefined {
  return EXPECTED_KINDS_BY_ARTIFACT.get(basename(path));
}

export function expectedArtifactEvidenceId(path: string): string | undefined {
  return EXPECTED_EVIDENCE_IDS_BY_ARTIFACT.get(basename(path));
}

function indexJobs(jobs: JobResult[]): {
  byName: Map<string, JobResult>;
  findings: QualityFinding[];
} {
  const byName = new Map<string, JobResult>();
  const findings: QualityFinding[] = [];
  for (const job of jobs) {
    if (!job || typeof job.name !== "string") {
      findings.push({ code: "MALFORMED_JOB", message: "Job result is malformed" });
      continue;
    }
    if (byName.has(job.name)) {
      findings.push({ code: "DUPLICATE_JOB", message: `Duplicate job result ${job.name}` });
    }
    byName.set(job.name, job);
  }
  return { byName, findings };
}

function statusFinding(name: string, job: JobResult): QualityFinding | undefined {
  if (!VALID_JOB_STATUSES.has(job.status)) {
    return { code: "MALFORMED_STATUS", message: `${name} has malformed status` };
  }
  if (job.status === "success" && job.conclusion === "PASS") return undefined;
  return {
    code: "JOB_NOT_PASSING",
    message: `${name} is ${job.status}/${job.conclusion}`,
  };
}

function validArtifact(artifact: { path: string; sha256: string } | undefined): boolean {
  return Boolean(
    artifact &&
      typeof artifact.path === "string" &&
      artifact.path.length > 0 &&
      /^[a-f0-9]{64}$/u.test(artifact.sha256),
  );
}

export function jobArtifacts(job: JobResult): { path: string; sha256: string }[] {
  return job.artifact
    ? [job.artifact, ...(Array.isArray(job.artifacts) ? job.artifacts : [])]
    : [];
}

export function findJobArtifact(
  jobs: JobResult[],
  jobName: string | undefined,
  expectedPath: string | undefined,
): { job: JobResult; artifact: { path: string; sha256: string } } | undefined {
  if (!jobName || !expectedPath) return undefined;
  const job = jobs.find((candidate) => candidate.name === jobName);
  const artifact = job
    ? jobArtifacts(job).find(
        (candidate) =>
          artifactBelongsToJob(job.name, candidate.path) &&
          basename(candidate.path) === basename(expectedPath),
      )
    : undefined;
  return job && artifact ? { job, artifact } : undefined;
}

function hasValidArtifacts(job: JobResult): boolean {
  if (!validArtifact(job.artifact)) return false;
  if (job.artifacts !== undefined && (!Array.isArray(job.artifacts) || job.artifacts.length === 0)) {
    return false;
  }
  const artifacts = jobArtifacts(job);
  const artifactNames = artifacts.map((artifact) => basename(artifact.path));
  return (
    artifacts.every(validArtifact) &&
    artifacts.every((artifact) => artifactBelongsToJob(job.name, artifact.path)) &&
    new Set(artifacts.map((artifact) => artifact.path)).size === artifacts.length &&
    new Set(artifacts.map((artifact) => artifact.sha256)).size === artifacts.length &&
    new Set(artifactNames).size === artifactNames.length
  );
}

function validateRequiredJob(name: string, job: JobResult | undefined): QualityFinding[] {
  if (!job) {
    return [{ code: "MISSING_JOB", message: `Required job is missing: ${name}` }];
  }
  const findings: QualityFinding[] = [];
  const invalidStatus = statusFinding(name, job);
  if (invalidStatus) findings.push(invalidStatus);
  if (job.flaky) {
    findings.push({ code: "FLAKY_JOB", message: `${name} required a retry or is flaky` });
  }
  if (!hasValidArtifacts(job)) {
    findings.push({
      code: "MISSING_JOB_ARTIFACT",
      message: `${name} lacks valid, distinct, job-bound machine-readable artifact references`,
    });
  }
  return findings;
}

export function aggregateJobs(
  requiredJobs: string[],
  jobs: JobResult[],
): QualityFinding[] {
  const { byName, findings } = indexJobs(jobs);
  for (const name of requiredJobs) {
    findings.push(...validateRequiredJob(name, byName.get(name)));
  }
  return findings;
}

export interface ProfilesFile {
  command_artifacts: Record<string, string>;
  profiles: Record<
    QualityProfile,
    {
      required_review_types: ("quality" | "security" | "release")[];
      conditional_review_types: ("quality" | "security" | "release")[];
      required_jobs: string[];
      commands: string[];
    }
  >;
}
