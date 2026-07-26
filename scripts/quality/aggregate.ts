import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
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
  jobArtifacts,
  type JobResult,
  type ProfilesFile,
} from "./aggregate-core";
import type { QualityProfile } from "./classifier-core";

const { flags } = parseArgs();
const root = qualityRoot();
const findings: QualityFinding[] = [];
const output = resolve(root, flagString(flags, "output", "artifacts/quality/aggregate.json")!);
const profiles = await readJson<ProfilesFile>(
  resolve(root, flagString(flags, "profiles", "quality/profiles.json")!),
);
const fixtureSuite = flagString(flags, "fixture-suite");
if (fixtureSuite) {
  const directory = resolve(root, fixtureSuite);
  const cases = [];
  try {
    for (const file of (await readdir(directory)).filter((path) => path.endsWith(".json")).sort()) {
      const fixture = await readJson<{
        name: string;
        profile: QualityProfile;
        jobs: JobResult[];
        expected_status: "PASS" | "FAIL";
      }>(resolve(directory, file));
      const fixtureFindings = aggregateJobs(
        profiles.profiles[fixture.profile]?.required_jobs ?? [],
        fixture.jobs,
      );
      const actual = fixtureFindings.length === 0 ? "PASS" : "FAIL";
      if (actual !== fixture.expected_status) {
        findings.push({
          code: "FIXTURE_EXPECTATION",
          message: `${fixture.name} expected ${fixture.expected_status}, got ${actual}`,
        });
      }
      cases.push({ ...fixture, actual_status: actual, findings: fixtureFindings });
    }
  } catch (error) {
    findings.push({
      code: "FIXTURE_SUITE_MALFORMED",
      message: `Aggregate fixture suite is malformed: ${String(error)}`,
    });
  }
  const result = makeResult(
    "quality-aggregate-fixtures",
    findings,
    { cases },
    findings.length === 0
      ? `Aggregate fixtures PASS for ${cases.length} case(s)`
      : `Aggregate fixtures FAIL with ${findings.length} finding(s)`,
  );
  await finishCli(result, output);
}
let profile: QualityProfile | undefined = flagString(flags, "profile") as
  | QualityProfile
  | undefined;
const classificationPath = flagString(flags, "classification");
if (!profile && classificationPath) {
  try {
    const classification = await readJson<{ data: { profile: QualityProfile } }>(
      resolve(root, classificationPath),
    );
    profile = classification.data.profile;
  } catch (error) {
    findings.push({
      code: "CLASSIFICATION_MALFORMED",
      message: `Classification is missing or malformed: ${String(error)}`,
    });
  }
}
if (!profile || !profiles.profiles[profile]) {
  findings.push({ code: "PROFILE_MISSING", message: "A valid selected profile is required" });
}

let jobs: JobResult[] = [];
let reviews: {
  candidate_sha256: string;
  requirements: Record<string, boolean>;
  decisions: Record<string, unknown>[];
  artifact: { path: string; sha256: string };
} | null = null;
const jobsPath = flagString(flags, "jobs");
if (!jobsPath) {
  findings.push({ code: "JOBS_REQUIRED", message: "A jobs JSON path is required" });
} else {
  try {
    const payload = await readJson<{ jobs: JobResult[] }>(resolve(root, jobsPath));
    if (!Array.isArray(payload.jobs)) throw new Error("jobs must be an array");
    jobs = payload.jobs;
  } catch (error) {
    findings.push({
      code: "JOBS_MALFORMED",
      message: `Jobs report is missing or malformed: ${String(error)}`,
    });
  }
}

if (profile && profiles.profiles[profile]) {
  findings.push(...aggregateJobs(profiles.profiles[profile].required_jobs, jobs));
  for (const job of jobs.filter((candidate) =>
    profiles.profiles[profile!].required_jobs.includes(candidate.name)
  )) {
    for (const [index, artifact] of jobArtifacts(job).entries()) {
      try {
        const bytes = await readFile(resolve(root, artifact.path));
        if (sha256(bytes) !== artifact.sha256) {
          findings.push({
            code: "ARTIFACT_HASH_MISMATCH",
            message: `${job.name} artifact hash does not match`,
            path: artifact.path,
          });
          continue;
        }
        const report = JSON.parse(bytes.toString("utf8")) as {
          schema_version?: number;
          kind?: string;
          status?: string;
          findings?: unknown[];
          data?: Record<string, unknown>;
        };
        if (
          report.schema_version !== 1 ||
          !report.kind ||
          report.status !== "PASS" ||
          !Array.isArray(report.findings) ||
          report.findings.length !== 0 ||
          !report.data ||
          typeof report.data !== "object"
        ) {
          throw new Error("artifact report contract is malformed or not PASS");
        }
        const expectedKind = expectedArtifactKind(artifact.path);
        const expectedEvidenceId = expectedArtifactEvidenceId(artifact.path);
        if (!expectedKind || report.kind !== expectedKind) {
          throw new Error(`artifact kind does not match ${String(expectedKind)}`);
        }
        if (
          expectedKind === "command-evidence" &&
          report.data.evidence_id !== expectedEvidenceId
        ) {
          throw new Error("command evidence findings or evidence_id do not match");
        }
        if (job.name === "quality / review" && index === 0) {
          try {
            const reviewData = report.data as {
              candidate?: { sha256?: string };
              requirements?: Record<string, boolean>;
              reviews?: Record<string, unknown>[];
            };
            if (
              report.kind !== "independent-review-gate" ||
              !/^[a-f0-9]{64}$/u.test(reviewData.candidate?.sha256 ?? "") ||
              typeof reviewData.requirements !== "object" ||
              !Array.isArray(reviewData.reviews)
            ) {
              throw new Error("review report contract is malformed or not PASS");
            }
            reviews = {
              candidate_sha256: reviewData.candidate.sha256!,
              requirements: reviewData.requirements!,
              decisions: reviewData.reviews,
              artifact,
            };
          } catch (error) {
            findings.push({
              code: "REVIEW_ARTIFACT_MALFORMED",
              message: `Independent review artifact is malformed: ${String(error)}`,
              path: artifact.path,
            });
          }
        }
      } catch (error) {
        findings.push({
          code: "ARTIFACT_UNREADABLE",
          message: `${job.name} artifact is missing or malformed: ${String(error)}`,
          path: artifact.path,
        });
      }
    }
  }
}

const result = makeResult(
  "quality-aggregate",
  findings,
  {
    profile: profile ?? null,
    required_jobs: profile ? profiles.profiles[profile]?.required_jobs ?? [] : [],
    jobs,
    reviews,
  },
  findings.length === 0
    ? `Aggregate PASS for ${profile} with ${jobs.length} job result(s)`
    : `Aggregate FAIL with ${findings.length} finding(s)`,
);
await finishCli(result, output);
