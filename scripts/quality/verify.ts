import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile, stat, unlink } from "node:fs/promises";
import { resolve } from "node:path";
import {
  finishCli,
  flagString,
  makeResult,
  parseArgs,
  qualityRoot,
  readJson,
  sha256,
  writeJson,
  type QualityFinding,
} from "./common";
import {
  aggregateJobs,
  type JobResult,
  type ProfilesFile,
} from "./aggregate-core";
import type { QualityProfile } from "./classifier-core";
import { parseCommandCounts } from "./evidence-counts";
import { validateManifest } from "./report-core";
import { candidateSha256, reviewRequirements } from "./review-core";
import {
  buildCapabilityEvidence,
  validateTraceability,
  type Capability,
  type EvidenceCommandMap,
} from "./traceability-core";

const { flags } = parseArgs();
const root = qualityRoot();
const findings: QualityFinding[] = [];
const classificationPath = resolve(
  root,
  flagString(flags, "classification", "artifacts/quality/classification.json")!,
);
const output = resolve(root, flagString(flags, "output", "artifacts/quality/manifest.json")!);
const profiles = await readJson<
  ProfilesFile & { evidence_commands: EvidenceCommandMap }
>(
  resolve(root, flagString(flags, "profiles", "quality/profiles.json")!),
);
const capabilityRegistry = await readJson<{ capabilities: Capability[] }>(
  resolve(root, flagString(flags, "registry", "quality/critical-capabilities.json")!),
);
const thresholds = await readJson<{
  global_ratchet: {
    baseline_required: boolean;
    baseline_path: string;
    baseline_status: "PENDING" | "ADMITTED";
  };
}>(resolve(root, flagString(flags, "thresholds", "quality/thresholds.json")!));

if (!existsSync(classificationPath) && !flags.has("plan")) {
  const classify = spawnSync("bun", ["scripts/quality/classify.ts"], {
    cwd: root,
    encoding: "utf8",
  });
  if (classify.status !== 0) {
    findings.push({
      code: "CLASSIFICATION_FAILED",
      message: classify.stderr.trim() || classify.stdout.trim() || "Classification failed",
    });
  }
}

let profile: QualityProfile | undefined;
let classificationData: {
  profile: QualityProfile;
  reasons?: string[];
  files?: string[];
  affected_capabilities?: string[];
  attribution?: Record<string, unknown>;
} | undefined;
try {
  const classification = await readJson<{ data: typeof classificationData }>(
    classificationPath,
  );
  classificationData = classification.data;
  profile = classificationData?.profile;
} catch (error) {
  findings.push({
    code: "CLASSIFICATION_MISSING",
    message: `Selected profile is unavailable: ${String(error)}`,
  });
}
if (
  profile &&
  profile !== "Q0_CONTRACT_ONLY" &&
  thresholds.global_ratchet.baseline_required &&
  (
    thresholds.global_ratchet.baseline_status !== "ADMITTED" ||
    !existsSync(resolve(root, thresholds.global_ratchet.baseline_path))
  )
) {
  findings.push({
    code: "BASELINE_PENDING_ADMISSION",
    message:
      `${thresholds.global_ratchet.baseline_path} is not independently ADMITTED; the gate cannot PASS`,
  });
}

const commandResults: {
  command: string;
  exit_code: number | null;
  duration_ms: number;
  stdout: string;
  stderr: string;
  artifact?: { path: string; sha256: string };
}[] = [];
if (profile && profiles.profiles[profile] && !flags.has("plan")) {
  for (const command of profiles.profiles[profile].commands) {
    const artifactPath = profiles.command_artifacts[command];
    if (artifactPath) {
      try {
        await unlink(resolve(root, artifactPath));
      } catch {
        // Absence is the required precondition; stale artifacts are never reused.
      }
    }
    const [executable, ...args] = command.split(/\s+/u);
    const startedAt = Date.now();
    const started = performance.now();
    const run = spawnSync(executable, args, {
      cwd: root,
      encoding: "utf8",
      timeout: 30 * 60_000,
      maxBuffer: 20 * 1024 * 1024,
    });
    const result = {
      command,
      exit_code: run.status,
      duration_ms: Math.round(performance.now() - started),
      stdout: run.stdout?.slice(-20_000) ?? "",
      stderr: run.stderr?.slice(-20_000) ?? "",
      artifact: undefined as { path: string; sha256: string } | undefined,
    };
    if (!artifactPath) {
      findings.push({
        code: "COMMAND_ARTIFACT_UNMAPPED",
        message: `${command} has no required machine-readable artifact`,
      });
    } else {
      try {
        const absoluteArtifact = resolve(root, artifactPath);
        const bytes = await readFile(absoluteArtifact);
        const artifactStat = await stat(absoluteArtifact);
        const report = JSON.parse(bytes.toString("utf8"));
        if (artifactStat.mtimeMs < startedAt) throw new Error("artifact predates command");
        if (report.status !== "PASS") throw new Error("artifact status is not PASS");
        if (report.kind === "command-evidence") {
          const expectedEvidenceId = command.replace(/^bun run /u, "");
          if (report.data?.evidence_id !== expectedEvidenceId) {
            throw new Error(
              `artifact evidence_id ${String(report.data?.evidence_id)} does not match ${expectedEvidenceId}`,
            );
          }
        }
        result.artifact = { path: artifactPath, sha256: sha256(bytes) };
      } catch (error) {
        findings.push({
          code: "COMMAND_ARTIFACT_MISSING",
          message: `${command} did not produce fresh valid JSON at ${artifactPath}: ${String(error)}`,
          path: artifactPath,
        });
      }
    }
    commandResults.push(result);
    if (run.status !== 0) {
      findings.push({ code: "COMMAND_FAILED", message: `${command} exited ${run.status}` });
      break;
    }
  }
}

const selected = profile ? profiles.profiles[profile] : undefined;
const affectedCapabilities = classificationData?.affected_capabilities ?? [];
const capabilityEvidence = profile
  ? buildCapabilityEvidence(
      affectedCapabilities,
      capabilityRegistry.capabilities,
      profiles.evidence_commands,
      profile,
      commandResults,
    )
  : [];
const traceabilityFindings = validateTraceability(
  affectedCapabilities,
  capabilityRegistry.capabilities,
  capabilityEvidence,
);
findings.push(...traceabilityFindings);

function jobNameForCommand(command: string): string | undefined {
  if (command === "bun run quality:classify") return "quality / classify";
  if (command === "bun run quality:contracts") return "quality / contracts";
  if (command === "bun run quality:adapters") return "quality / adapters";
  if (command === "bun run quality:anti-bypass") return "quality / anti-bypass";
  if (command === "bun run quality:workflows") return "quality / workflows";
  if (command === "bun run quality:reviews") return "quality / review";
  if (command === "bun run quality:enforcement-contract") return "quality / enforcement";
  if (command === "bun run quality:static") return "quality / static";
  if (command === "bun run test:unit:coverage") return "quality / unit";
  if (command.startsWith("bun run test:component:")) return "quality / component";
  if (command === "bun run quality:diff-coverage") return "quality / coverage";
  if (command === "bun run test:property") return "quality / property";
  if (command === "bun run test:workers:coverage") return "quality / workers";
  if (command.startsWith("bun run test:bdd")) return "quality / bdd-smoke";
  if (command === "bun run test:a11y") return "quality / a11y";
  if (command === "bun run build") return "quality / build";
  if (command.startsWith("bun run test:e2e:")) return "quality / e2e-smoke";
  if (command.startsWith("bun run test:mutation:")) return "quality / mutation";
  if (command === "bun run quality:security") return "quality / security";
  if (command === "bun run test:ai-evals") return "quality / ai-eval";
  if (command === "bun run quality:operations") return "quality / operations";
  return undefined;
}

const commitSha = spawnSync("git", ["rev-parse", "HEAD"], {
  cwd: root,
  encoding: "utf8",
}).stdout.trim();
const candidateFiles = [];
for (const path of [...(classificationData?.files ?? [])].sort()) {
  const absolute = resolve(root, path);
  candidateFiles.push({
    path,
    sha256: existsSync(absolute) ? sha256(await readFile(absolute)) : sha256("DELETED"),
  });
}
const candidateHash =
  profile && /^[a-f0-9]{40}$/u.test(commitSha)
    ? candidateSha256({
        commit_sha: commitSha,
        profile,
        changed_files: candidateFiles,
        affected_capabilities: affectedCapabilities,
      })
    : "0".repeat(64);

let classificationArtifact = {
  path: flagString(flags, "classification", "artifacts/quality/classification.json")!,
  sha256: "0".repeat(64),
};
try {
  classificationArtifact = {
    path: flagString(flags, "classification", "artifacts/quality/classification.json")!,
    sha256: sha256(await readFile(classificationPath)),
  };
} catch {
  // The classification finding above already records the missing artifact.
}
const jobResults: JobResult[] = (selected?.required_jobs ?? []).map((name) => {
  if (name === "quality / classify") {
    return {
      name,
      status: classificationData ? "success" : "failure",
      conclusion: classificationData ? "PASS" : "FAIL",
      flaky: false,
      artifact: classificationArtifact,
    };
  }
  const command = commandResults.find(
    (candidate) => jobNameForCommand(candidate.command) === name,
  );
  return {
    name,
    status: command?.exit_code === 0 && command.artifact ? "success" : "failure",
    conclusion: command?.exit_code === 0 && command.artifact ? "PASS" : "FAIL",
    flaky: false,
    artifact: command?.artifact ?? { path: "UNAVAILABLE", sha256: "0".repeat(64) },
  };
});
const localAggregateFindings = aggregateJobs(selected?.required_jobs ?? [], jobResults);
findings.push(...localAggregateFindings);
const aggregatePath = resolve(root, "artifacts/quality/aggregate.local.json");
const aggregateResult = makeResult(
  "quality-aggregate",
  localAggregateFindings,
  {
    profile: profile ?? null,
    required_jobs: selected?.required_jobs ?? [],
    jobs: jobResults,
  },
  localAggregateFindings.length === 0
    ? `Local aggregate PASS for ${String(profile)}`
    : `Local aggregate FAIL with ${localAggregateFindings.length} finding(s)`,
);
await writeJson(aggregatePath, aggregateResult);
const aggregateArtifact = {
  path: "artifacts/quality/aggregate.local.json",
  sha256: sha256(await readFile(aggregatePath)),
};

let reviewData: {
  candidate?: { sha256?: string };
  requirements?: { quality?: boolean; security?: boolean; release?: boolean };
  source?: string;
  reviews?: Record<string, unknown>[];
} = {};
const reviewCommand = commandResults.find(
  (command) => command.command === "bun run quality:reviews",
);
if (reviewCommand?.artifact) {
  try {
    reviewData = (
      await readJson<{ data: typeof reviewData }>(resolve(root, reviewCommand.artifact.path))
    ).data;
  } catch (error) {
    findings.push({
      code: "REVIEW_ARTIFACT_MALFORMED",
      message: `Review artifact is malformed: ${String(error)}`,
    });
  }
}
if (reviewData.candidate?.sha256 && reviewData.candidate.sha256 !== candidateHash) {
  findings.push({
    code: "REVIEW_TARGET_MISMATCH",
    message: "Review artifact does not bind the final local candidate",
  });
}
const computedReviewRequirements = profile
  ? reviewRequirements(profile, classificationData?.files ?? [], affectedCapabilities)
  : { quality: true, security: true, release: false };
const finalReviewRequirements = {
  quality: reviewData.requirements?.quality ?? computedReviewRequirements.quality,
  security: reviewData.requirements?.security ?? computedReviewRequirements.security,
  release: reviewData.requirements?.release ?? computedReviewRequirements.release,
};

const normalizedCommandResults = commandResults.map((command) => ({
  command: command.command,
  status: command.exit_code === 0 && command.artifact ? "PASS" as const : "FAIL" as const,
  source: "local" as const,
  ...(jobNameForCommand(command.command)
    ? { job: jobNameForCommand(command.command)! }
    : {}),
  exit_code: command.exit_code,
  duration_ms: command.duration_ms,
  artifact: command.artifact ?? { path: "UNAVAILABLE", sha256: "0".repeat(64) },
}));
const evidence = [
  {
    kind: "quality / classify",
    status: classificationData ? "PASS" as const : "FAIL" as const,
    source: "local" as const,
    artifact: classificationArtifact,
  },
  ...normalizedCommandResults.map((command) => ({
    kind: command.job ?? command.command,
    status: command.status,
    source: "local" as const,
    artifact: command.artifact,
  })),
];
const commandCounts = commandResults.map((command) =>
  parseCommandCounts(`${command.stdout}\n${command.stderr}`),
);
const failed = commandCounts.reduce(
  (total, counts) =>
    total +
    (counts.tests_failed ?? 0) +
    (counts.scenarios_failed ?? 0) +
    (counts.steps_failed ?? 0),
  0,
);
const skipped = commandCounts.reduce(
  (total, counts) => total + (counts.tests_skipped ?? 0),
  0,
);
const domain = (jobName: string) => {
  const applicable = selected?.required_jobs.includes(jobName) ?? false;
  const job = jobResults.find((candidate) => candidate.name === jobName);
  return {
    applicable,
    status: applicable
      ? job?.conclusion === "PASS"
        ? "PASS"
        : "FAIL"
      : "NOT_APPLICABLE",
    artifacts: job?.artifact && /^[a-f0-9]{64}$/u.test(job.artifact.sha256)
      ? [job.artifact]
      : [],
    metrics: {},
  };
};
const externalEvidence =
  reviewCommand?.artifact && reviewData.source
    ? [
        {
          kind: "independent-reviews",
          status: "PASS" as const,
          source:
            reviewData.source === "github"
              ? "remote" as const
              : "external-manifest" as const,
          artifact: reviewCommand.artifact,
          ...(reviewData.source === "github" ? { authoritative_readback: true } : {}),
        },
      ]
    : [];
const manifestData = {
  profile: profile ?? null,
  mode: flags.has("plan") ? "plan" as const : "execute" as const,
  candidate: { commit_sha: commitSha, sha256: candidateHash },
  classification: classificationData ?? {},
  merge_base:
    (classificationData?.attribution?.merge_base as string | undefined) ?? "UNKNOWN",
  scope: {
    changed_files: classificationData?.files ?? [],
    inherited_dirty_files:
      (classificationData?.attribution?.inherited_dirty_files as string[] | undefined) ?? [],
    migration_changed_files:
      (classificationData?.attribution?.migration_changed_files as string[] | undefined) ?? [],
    overlapping_files:
      (classificationData?.attribution?.overlapping_files as string[] | undefined) ?? [],
  },
  required_jobs: selected?.required_jobs ?? [],
  commands: selected?.commands ?? [],
  command_results: normalizedCommandResults,
  job_results: jobResults,
  evidence,
  reviews: {
    candidate_sha256: reviewData.candidate?.sha256 ?? candidateHash,
    requirements: finalReviewRequirements,
    decisions: reviewData.reviews ?? [],
    artifact: reviewCommand?.artifact ?? null,
  },
  quality_domains: {
    coverage: domain("quality / coverage"),
    mutation: domain("quality / mutation"),
    bdd: domain("quality / bdd-smoke"),
    test_health: {
      applicable: true,
      status: failed === 0 && skipped === 0 ? "PASS" : "FAIL",
      artifacts: evidence.map((item) => item.artifact),
      metrics: { failed, skipped, flaky: 0 },
    },
    accessibility: domain("quality / a11y"),
    security: domain("quality / security"),
    performance_operations: domain("quality / operations"),
    waivers: {
      applicable: true,
      status: "PASS",
      artifacts: [],
      metrics: { active: 0, expired: 0, rejected: 0 },
    },
  },
  traceability: {
    status: traceabilityFindings.length === 0 ? "PASS" : "FAIL",
    affected_capabilities: affectedCapabilities,
    evidence: capabilityEvidence,
    findings: traceabilityFindings,
  },
  waivers: [],
  external_evidence: externalEvidence,
  aggregate: {
    status: aggregateResult.status,
    artifact: aggregateArtifact,
  },
  remaining_risk: [] as string[],
  stop_condition: flags.has("plan")
    ? "Plan mode selected commands but did not execute required evidence"
    : "All profile-required exact-candidate evidence and reviews validated",
};
const flattenedManifest = {
  schema_version: 1,
  ...manifestData,
  status: findings.length === 0 ? "PASS" : flags.has("plan") ? "QUALITY_BLOCKED" : "FAIL",
};
findings.push(...validateManifest(flattenedManifest));
manifestData.remaining_risk = findings.map((finding) => finding.message);
if (findings.length > 0 && !flags.has("plan")) {
  manifestData.stop_condition = "Quality gate stopped because required evidence is red or missing";
}
const result = makeResult(
  "quality-manifest",
  findings,
  manifestData,
  findings.length === 0
    ? `${profile} ${flags.has("plan") ? "commands selected; evidence not executed" : "commands passed"}`
    : `Quality verification failed with ${findings.length} finding(s)`,
  flags.has("plan") ? "QUALITY_BLOCKED" : undefined,
);
await finishCli(result, output);
