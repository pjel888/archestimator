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
import { PROFILES, profileRank, type QualityProfile } from "./classifier-core";
import { buildCandidate, type CanonicalCandidate } from "./candidate-core";
import {
  comparisonBaseFromFlags,
  forwardedQualityArgs,
  validateReviewForwarding,
  type ComparisonBase,
} from "./comparison-base-core";
import { parseCommandCounts } from "./evidence-counts";
import { jobNameForCommand } from "./job-command-core";
import {
  canonicalProfilesOverrideFinding,
  expectedArtifactReportError,
  validateManifest,
} from "./report-core";
import { reviewRequirements } from "./review-core";
import {
  buildCapabilityEvidence,
  validateTraceability,
  type Capability,
  type EvidenceCommandMap,
} from "./traceability-core";

const { flags } = parseArgs();
const root = qualityRoot();
const findings: QualityFinding[] = [];
const defaultCommandTimeoutMs = 30 * 60_000;
const componentCommandTimeoutMs = 60 * 60_000;
const mutationCommandTimeoutMs = 2 * 60 * 60_000;
const requestedProfile = flagString(flags, "profile") as QualityProfile | undefined;
const reviewsInput = flagString(flags, "reviews");
const authorIdsInput = flagString(flags, "author-ids");
const policyOverride = canonicalProfilesOverrideFinding(root, flagString(flags, "profiles"));
if (policyOverride) findings.push(policyOverride);
if (requestedProfile && !PROFILES.includes(requestedProfile)) {
  findings.push({ code: "PROFILE_INVALID", message: `Unknown profile ${requestedProfile}` });
}
if (
  requestedProfile === "Q2_CRITICAL_CHANGE_GATE" ||
  requestedProfile === "Q3_RELEASE_GATE"
) {
  try {
    validateReviewForwarding(reviewsInput, authorIdsInput);
  } catch (error) {
    findings.push({ code: "REVIEW_FORWARDING_INVALID", message: String(error) });
  }
}
let comparisonBase: ComparisonBase | undefined;
try {
  comparisonBase = await comparisonBaseFromFlags({ root, flags });
} catch (error) {
  findings.push({ code: "COMPARISON_BASE", message: String(error) });
}
const classificationPath = resolve(
  root,
  flagString(flags, "classification", "artifacts/quality/classification.json")!,
);
const output = resolve(root, flagString(flags, "output", "artifacts/quality/manifest.json")!);
const profiles = await readJson<
  ProfilesFile & { evidence_commands: EvidenceCommandMap }
>(resolve(root, "quality/profiles.json"));
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

interface ClassificationData {
  profile: QualityProfile;
  reasons?: string[];
  files?: string[];
  affected_capabilities?: string[];
  comparison_base?: ComparisonBase;
  attribution?: Record<string, unknown>;
}

interface CommandExecution {
  command: string;
  executed_command: string;
  exit_code: number | null;
  duration_ms: number;
  stdout: string;
  stderr: string;
  started_at: number;
  artifact?: { path: string; sha256: string };
}

const commandResults: CommandExecution[] = [];
let classificationData: ClassificationData | undefined;
if (comparisonBase && !policyOverride) {
  try {
    await unlink(classificationPath);
  } catch {
    // Absence is the required precondition; stale classification is never reused.
  }
  const command = "bun run quality:classify";
  const forwardedArgs = forwardedQualityArgs(command, { comparison_base: comparisonBase });
  if (requestedProfile) forwardedArgs.push("--profile", requestedProfile);
  forwardedArgs.push("--output", classificationPath);
  const startedAt = Date.now();
  const started = performance.now();
  const run = spawnSync("bun", forwardedArgs, {
    cwd: root,
    encoding: "utf8",
    timeout: 30 * 60_000,
    maxBuffer: 20 * 1024 * 1024,
  });
  const result: CommandExecution = {
    command,
    executed_command: ["bun", ...forwardedArgs].join(" "),
    exit_code: run.status,
    duration_ms: Math.round(performance.now() - started),
    stdout: run.stdout?.slice(-20_000) ?? "",
    stderr: run.stderr?.slice(-20_000) ?? "",
    started_at: startedAt,
  };
  try {
    const bytes = await readFile(classificationPath);
    const artifactStat = await stat(classificationPath);
    const classification = JSON.parse(bytes.toString("utf8")) as Record<string, unknown>;
    if (artifactStat.mtimeMs < startedAt) throw new Error("artifact predates command");
    const classificationError = expectedArtifactReportError(classification, classificationPath);
    if (classificationError) throw new Error(classificationError);
    classificationData = classification.data as ClassificationData;
    result.artifact = { path: classificationPath, sha256: sha256(bytes) };
  } catch (error) {
    findings.push({
      code: "CLASSIFICATION_MISSING",
      message: `Fresh classification is unavailable: ${String(error)}`,
      path: classificationPath,
    });
  }
  commandResults.push(result);
  if (run.status !== 0) {
    findings.push({
      code: "CLASSIFICATION_FAILED",
      message: run.stderr.trim() || run.stdout.trim() || `Classification exited ${run.status}`,
    });
  }
}

const profile = classificationData?.profile;
if (classificationData) {
  if (
    !comparisonBase ||
    classificationData?.comparison_base?.input_ref !== comparisonBase.input_ref ||
    classificationData?.comparison_base?.resolved_sha !== comparisonBase.resolved_sha
  ) {
    findings.push({
      code: "CLASSIFICATION_BASE_MISMATCH",
      message: "Classification does not bind the selected comparison base ref and SHA",
    });
  }
  if (
    requestedProfile &&
    (!profile || profileRank(profile) < profileRank(requestedProfile))
  ) {
    findings.push({
      code: "CLASSIFICATION_PROFILE_DOWNGRADE",
      message: `Classification ${String(profile)} is below forced profile ${requestedProfile}`,
    });
  }
}
if (
  (profile === "Q2_CRITICAL_CHANGE_GATE" || profile === "Q3_RELEASE_GATE") &&
  requestedProfile !== "Q2_CRITICAL_CHANGE_GATE" &&
  requestedProfile !== "Q3_RELEASE_GATE"
) {
  try {
    validateReviewForwarding(reviewsInput, authorIdsInput);
  } catch (error) {
    findings.push({ code: "REVIEW_FORWARDING_INVALID", message: String(error) });
  }
}

let canonicalCandidate: CanonicalCandidate | undefined;
if (comparisonBase && classificationData && profile) {
  try {
    canonicalCandidate = await buildCandidate({
      root,
      comparison_base: comparisonBase,
      classification: {
        profile,
        files: classificationData.files ?? [],
        affected_capabilities: classificationData.affected_capabilities ?? [],
        comparison_base: classificationData.comparison_base,
      },
      expected: flagString(flags, "expected"),
    });
  } catch (error) {
    findings.push({ code: "CANDIDATE_INVALID", message: String(error) });
  }
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

if (
  profile &&
  profiles.profiles[profile] &&
  !flags.has("plan") &&
  findings.length === 0 &&
  comparisonBase &&
  canonicalCandidate
) {
  for (const command of profiles.profiles[profile].commands.filter(
    (candidate) => candidate !== "bun run quality:classify",
  )) {
    const artifactPath = profiles.command_artifacts[command];
    if (artifactPath) {
      try {
        await unlink(resolve(root, artifactPath));
      } catch {
        // Absence is the required precondition; stale artifacts are never reused.
      }
    }
    const [executable] = command.split(/\s+/u);
    const forwardedArgs = forwardedQualityArgs(command, {
      comparison_base: comparisonBase,
      reviews: reviewsInput,
      author_ids: authorIdsInput,
      expected: canonicalCandidate.sha256,
    });
    const startedAt = Date.now();
    const started = performance.now();
    const timeout = command.startsWith("bun run test:component:")
      ? componentCommandTimeoutMs
      : command.startsWith("bun run test:mutation:")
        ? mutationCommandTimeoutMs
        : defaultCommandTimeoutMs;
    const run = spawnSync(executable, forwardedArgs, {
      cwd: root,
      encoding: "utf8",
      timeout,
      maxBuffer: 20 * 1024 * 1024,
    });
    const result = {
      command,
      executed_command: [executable, ...forwardedArgs].join(" "),
      exit_code: run.status,
      duration_ms: Math.round(performance.now() - started),
      stdout: run.stdout?.slice(-20_000) ?? "",
      stderr: run.stderr?.slice(-20_000) ?? "",
      started_at: startedAt,
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
        const report = JSON.parse(bytes.toString("utf8")) as Record<string, unknown>;
        if (artifactStat.mtimeMs < startedAt) throw new Error("artifact predates command");
        const reportError = expectedArtifactReportError(report, artifactPath);
        if (reportError) throw new Error(reportError);
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
if (canonicalCandidate && comparisonBase && classificationData && profile) {
  try {
    canonicalCandidate = await buildCandidate({
      root,
      comparison_base: comparisonBase,
      classification: {
        profile,
        files: classificationData.files ?? [],
        affected_capabilities: classificationData.affected_capabilities ?? [],
        comparison_base: classificationData.comparison_base,
      },
      expected: canonicalCandidate.sha256,
    });
  } catch (error) {
    findings.push({ code: "CANDIDATE_CHANGED_DURING_VERIFY", message: String(error) });
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

const commitSha = canonicalCandidate?.record.commit_sha ?? "0".repeat(40);
const candidateHash = canonicalCandidate?.sha256 ?? "0".repeat(64);

function jobResult(name: string): JobResult {
  const commands = commandResults.filter(
    (candidate) => jobNameForCommand(candidate.command) === name,
  );
  const artifacts = commands.flatMap((command) => (command.artifact ? [command.artifact] : []));
  const passed =
    commands.length > 0 &&
    commands.every((command) => command.exit_code === 0 && Boolean(command.artifact));
  return {
    name,
    status: passed ? "success" : "failure",
    conclusion: passed ? "PASS" : "FAIL",
    flaky: false,
    artifact: artifacts[0] ?? { path: "UNAVAILABLE", sha256: "0".repeat(64) },
    ...(artifacts.length > 1 ? { artifacts: artifacts.slice(1) } : {}),
  };
}
const jobResults: JobResult[] = (selected?.required_jobs ?? []).map(jobResult);
const localAggregateFindings = aggregateJobs(selected?.required_jobs ?? [], jobResults);
findings.push(...localAggregateFindings);
const aggregateOutput = flagString(
  flags,
  "aggregate-output",
  "artifacts/quality/aggregate.local.json",
)!;
const aggregatePath = resolve(root, aggregateOutput);
const aggregateResult = makeResult(
  "quality-aggregate",
  localAggregateFindings,
  {
    profile: profile ?? null,
    comparison_base: comparisonBase ?? null,
    candidate_sha256: canonicalCandidate?.sha256 ?? null,
    required_jobs: selected?.required_jobs ?? [],
    jobs: jobResults,
  },
  localAggregateFindings.length === 0
    ? `Local aggregate PASS for ${String(profile)}`
    : `Local aggregate FAIL with ${localAggregateFindings.length} finding(s)`,
);
await writeJson(aggregatePath, aggregateResult);
const aggregateArtifact = {
  path: aggregateOutput,
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
  quality: computedReviewRequirements.quality,
  security: computedReviewRequirements.security,
  release: computedReviewRequirements.release,
};

const normalizedCommandResults = commandResults.map((command) => ({
  command: command.command,
  executed_command: command.executed_command,
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
  candidate: canonicalCandidate
    ? {
        commit_sha: canonicalCandidate.record.commit_sha,
        sha256: canonicalCandidate.sha256,
      }
    : { commit_sha: commitSha, sha256: candidateHash },
  classification: classificationData ?? {},
  merge_base:
    comparisonBase?.resolved_sha ?? "UNKNOWN",
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
    input_paths: reviewsInput?.split(",") ?? [],
    author_ids: authorIdsInput?.split(",") ?? [],
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
findings.push(...validateManifest(flattenedManifest, profiles));
for (const command of commandResults) {
  if (!command.artifact) continue;
  try {
    const absolute = resolve(root, command.artifact.path);
    const bytes = await readFile(absolute);
    const artifactStat = await stat(absolute);
    if (sha256(bytes) !== command.artifact.sha256) throw new Error("artifact hash changed");
    if (artifactStat.mtimeMs < command.started_at) throw new Error("artifact freshness changed");
    const reportError = expectedArtifactReportError(
      JSON.parse(bytes.toString("utf8")),
      command.artifact.path,
    );
    if (reportError) throw new Error(reportError);
  } catch (error) {
    findings.push({
      code: "COMMAND_ARTIFACT_CHANGED_DURING_VERIFY",
      message: `${command.command} artifact changed before final output: ${String(error)}`,
      path: command.artifact.path,
    });
  }
}
if (canonicalCandidate && comparisonBase && classificationData && profile) {
  try {
    canonicalCandidate = await buildCandidate({
      root,
      comparison_base: comparisonBase,
      classification: {
        profile,
        files: classificationData.files ?? [],
        affected_capabilities: classificationData.affected_capabilities ?? [],
        comparison_base: classificationData.comparison_base,
      },
      expected: candidateHash,
    });
  } catch (error) {
    findings.push({ code: "CANDIDATE_CHANGED_BEFORE_OUTPUT", message: String(error) });
  }
}
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
