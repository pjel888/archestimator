import type { QualityFinding } from "./common";
import type { QualityProfile } from "./classifier-core";

export interface JobResult {
  name: string;
  status: "success" | "failure" | "skipped" | "cancelled";
  conclusion: "PASS" | "FAIL";
  flaky: boolean;
  artifact?: { path: string; sha256: string };
}

export function aggregateJobs(
  requiredJobs: string[],
  jobs: JobResult[],
): QualityFinding[] {
  const findings: QualityFinding[] = [];
  const byName = new Map<string, JobResult>();
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
  for (const name of requiredJobs) {
    const job = byName.get(name);
    if (!job) {
      findings.push({ code: "MISSING_JOB", message: `Required job is missing: ${name}` });
      continue;
    }
    if (!["success", "failure", "skipped", "cancelled"].includes(job.status)) {
      findings.push({ code: "MALFORMED_STATUS", message: `${name} has malformed status` });
    } else if (job.status !== "success" || job.conclusion !== "PASS") {
      findings.push({
        code: "JOB_NOT_PASSING",
        message: `${name} is ${job.status}/${job.conclusion}`,
      });
    }
    if (job.flaky) {
      findings.push({ code: "FLAKY_JOB", message: `${name} required a retry or is flaky` });
    }
    if (
      !job.artifact ||
      typeof job.artifact.path !== "string" ||
      !/^[a-f0-9]{64}$/u.test(job.artifact.sha256)
    ) {
      findings.push({
        code: "MISSING_JOB_ARTIFACT",
        message: `${name} lacks a valid machine-readable artifact reference`,
      });
    }
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
