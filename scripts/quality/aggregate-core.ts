import type { QualityFinding } from "./common";
import type { QualityProfile } from "./classifier-core";

export interface JobResult {
  name: string;
  status: "success" | "failure" | "skipped" | "cancelled";
  conclusion: "PASS" | "FAIL";
  flaky: boolean;
  artifact?: { path: string; sha256: string };
}

const VALID_JOB_STATUSES = new Set<JobResult["status"]>([
  "success",
  "failure",
  "skipped",
  "cancelled",
]);

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

function hasValidArtifact(job: JobResult): boolean {
  if (!job.artifact) return false;
  if (typeof job.artifact.path !== "string") return false;
  return /^[a-f0-9]{64}$/u.test(job.artifact.sha256);
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
  if (!hasValidArtifact(job)) {
    findings.push({
      code: "MISSING_JOB_ARTIFACT",
      message: `${name} lacks a valid machine-readable artifact reference`,
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
