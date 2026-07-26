import {
  cpSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import {
  buildCandidate,
  candidateDigest,
  type CandidateRecord,
  type CanonicalCandidate,
} from "../../../scripts/quality/candidate-core";
import { validateManifest } from "../../../scripts/quality/report-core";
import type { ProfilesFile } from "../../../scripts/quality/aggregate-core";
import { jobNameForCommand } from "../../../scripts/quality/job-command-core";
import {
  githubReviewTypes,
  reviewRequirements,
  validateReviews,
  type ReviewEvidence,
} from "../../../scripts/quality/review-core";

const commit = "b".repeat(40);
const candidateRecord: CandidateRecord = {
  schema_version: 1,
  commit_sha: commit,
  comparison_base: { input_ref: "base", resolved_sha: "c".repeat(40) },
  profile: "Q2_CRITICAL_CHANGE_GATE",
  changed_files: [
    {
      path: "quality/profiles.json",
      sha256: "a".repeat(64),
      deleted: false,
      sources: ["unstaged"],
    },
  ],
  affected_capabilities: [],
};
const candidate: CanonicalCandidate = {
  record: candidateRecord,
  sha256: candidateDigest(candidateRecord),
};
const hash = candidate.sha256;
const artifact = { path: "artifacts/quality/example.json", sha256: hash };
const profilesPolicy = JSON.parse(
  readFileSync(resolve(import.meta.dirname, "../../../quality/profiles.json"), "utf8"),
) as ProfilesFile;

function wholeCandidateFiles(root: string, base: string): string[] {
  const paths = new Set<string>();
  const collect = (args: string[]) => {
    const run = spawnSync("git", args, { cwd: root, encoding: "utf8" });
    if (run.status !== 0) throw new Error(run.stderr);
    for (const path of run.stdout.split("\0").filter(Boolean)) paths.add(path);
  };
  collect(["diff", "-z", "--no-renames", "--name-only", "--diff-filter=ACDMRTUXB", base, "HEAD"]);
  collect(["diff", "-z", "--cached", "--no-renames", "--name-only", "--diff-filter=ACDMRTUXB"]);
  collect(["diff", "-z", "--no-renames", "--name-only", "--diff-filter=ACDMRTUXB"]);
  collect(["ls-files", "-z", "--others", "--exclude-standard"]);
  return [...paths].sort((left, right) => left.localeCompare(right));
}

function approval(
  review_type: "quality" | "security" | "release",
  reviewer_id: string,
): ReviewEvidence {
  return {
    review_type,
    reviewer_id,
    decision: "APPROVE",
    candidate_sha256: hash,
    commit_sha: commit,
    reviewed_at: "2026-07-25T00:00:00.000Z",
    read_only: true,
    source: "local-agent",
  };
}

function domain(applicable = true) {
  return {
    applicable,
    status: applicable ? "PASS" : "NOT_APPLICABLE",
    artifacts: applicable ? [artifact] : [],
    metrics: {},
  };
}

function policyEvidence(profile: "Q2_CRITICAL_CHANGE_GATE" | "Q3_RELEASE_GATE") {
  const selected = profilesPolicy.profiles[profile];
  const artifacts = new Map(
    selected.commands.map((command, index) => [
      command,
      {
        path: profilesPolicy.command_artifacts[command],
        sha256: (index + 1).toString(16).padStart(64, "0"),
      },
    ]),
  );
  const job_results = selected.required_jobs.map((name) => {
    const jobArtifacts = selected.commands
      .filter((command) => jobNameForCommand(command) === name)
      .map((command) => artifacts.get(command)!);
    const primary = jobArtifacts[0] ?? {
      path: `artifacts/quality/${name.replaceAll(/[^a-z]+/gu, "-")}.json`,
      sha256: createHash("sha256").update(name).digest("hex"),
    };
    return {
      name,
      status: "success",
      conclusion: "PASS",
      flaky: false,
      artifact: primary,
      ...(jobArtifacts.length > 1 ? { artifacts: jobArtifacts.slice(1) } : {}),
    };
  });
  return {
    required_jobs: [...selected.required_jobs],
    commands: [...selected.commands],
    command_results: selected.commands.map((command) => ({
      command,
      status: "PASS",
      source: "ci",
      job: jobNameForCommand(command),
      artifact: artifacts.get(command),
    })),
    job_results,
    evidence: job_results.map((job) => ({
      kind: job.name,
      status: "PASS",
      source: "ci",
      artifact: job.artifact,
    })),
  };
}

function passingManifest(
  profile: "Q2_CRITICAL_CHANGE_GATE" | "Q3_RELEASE_GATE" = "Q2_CRITICAL_CHANGE_GATE",
): Record<string, unknown> {
  const policy = policyEvidence(profile);
  const requirements = profile === "Q3_RELEASE_GATE"
    ? { quality: true, security: true, release: true }
    : { quality: true, security: true, release: false };
  return {
    schema_version: 1,
    profile,
    candidate: { commit_sha: commit, sha256: hash },
    classification: {
      profile,
      files: ["quality/profiles.json"],
      affected_capabilities: [],
    },
    merge_base: "c".repeat(40),
    scope: {
      changed_files: ["quality/profiles.json"],
      inherited_dirty_files: [],
      migration_changed_files: [],
      overlapping_files: [],
    },
    ...policy,
    reviews: {
      candidate_sha256: hash,
      requirements,
      decisions: [
        approval("quality", "reviewer-quality"),
        approval("security", "reviewer-security"),
        ...(profile === "Q3_RELEASE_GATE" ? [approval("release", "reviewer-release")] : []),
      ],
      artifact,
    },
    quality_domains: {
      coverage: domain(),
      mutation: domain(),
      bdd: domain(),
      test_health: {
        applicable: true,
        status: "PASS",
        artifacts: [artifact],
        metrics: { failed: 0, skipped: 0, flaky: 0 },
      },
      accessibility: domain(),
      security: domain(),
      performance_operations: domain(),
      waivers: domain(),
    },
    traceability: {
      status: "PASS",
      affected_capabilities: [],
      evidence: [],
      findings: [],
    },
    waivers: [],
    external_evidence: [
      {
        kind: "independent-reviews",
        status: "PASS",
        source: "external-manifest",
        artifact,
      },
    ],
    aggregate: { status: "PASS", artifact },
    remaining_risk: [],
    stop_condition: "All exact-candidate evidence passed",
    status: "PASS",
  };
}

describe("independent review gate", () => {
  it("requires quality-system security review and exact distinct approvals", () => {
    const requirements = reviewRequirements(
      "Q2_CRITICAL_CHANGE_GATE",
      ["quality/profiles.json"],
      [],
    );
    expect(requirements).toEqual({ quality: true, security: true, release: false });
    expect(
      validateReviews({
        requirements,
        candidate,
        author_ids: ["author"],
        reviews: [approval("quality", "reviewer"), approval("security", "reviewer")],
      }).map((finding) => finding.code),
    ).toContain("SECURITY_REVIEW_NOT_DISTINCT");
  });

  it("rejects stale and self-authored evidence", () => {
    const stale = { ...approval("quality", "reviewer"), candidate_sha256: "d".repeat(64) };
    expect(
      validateReviews({
        requirements: { quality: true, security: false, release: false },
        candidate,
        author_ids: ["author"],
        reviews: [stale, approval("quality", "author")],
      }).map((finding) => finding.code),
    ).toEqual([
      "REVIEW_TARGET_MISMATCH",
      "REVIEW_NOT_INDEPENDENT",
      "REVIEW_REQUIRED",
    ]);
  });

  it("requires every review field and enum plus the exact candidate commit", () => {
    const malformed = [
      { ...approval("quality", "reviewer-type"), review_type: "other" },
      { ...approval("quality", ""), reviewer_id: "" },
      { ...approval("quality", "reviewer-decision"), decision: "COMMENT" },
      { ...approval("quality", "reviewer-digest"), candidate_sha256: "invalid" },
      { ...approval("quality", "reviewer-commit"), commit_sha: undefined },
      { ...approval("quality", "reviewer-date"), reviewed_at: "invalid" },
      { ...approval("quality", "reviewer-mode"), read_only: false },
      { ...approval("quality", "reviewer-source"), source: "local" },
    ] as ReviewEvidence[];
    const wrongHead = { ...approval("quality", "reviewer-head"), commit_sha: "d".repeat(40) };
    const findings = validateReviews({
      requirements: { quality: true, security: false, release: false },
      candidate,
      author_ids: [],
      reviews: [...malformed, wrongHead],
    });
    expect(findings.map((finding) => finding.code)).toEqual([
      ...Array.from({ length: malformed.length }, () => "REVIEW_MALFORMED"),
      "REVIEW_TARGET_MISMATCH",
      "REVIEW_REQUIRED",
    ]);
  });

  it("binds deterministic candidate content and recognizes explicit GitHub review roles", () => {
    const first = candidateDigest(candidateRecord);
    const second = candidateDigest({
      ...candidateRecord,
      changed_files: [{ ...candidateRecord.changed_files[0], sha256: "e".repeat(64) }],
    });
    expect(first).not.toBe(second);
    expect(
      validateReviews({
        requirements: { quality: false, security: false, release: false },
        candidate: { ...candidate, sha256: "0".repeat(64) },
        author_ids: [],
        reviews: [],
      }).map((finding) => finding.code),
    ).toEqual(["REVIEW_TARGET_MISMATCH"]);
    expect(githubReviewTypes("[quality-review]\nReview-Type: security")).toEqual([
      "quality",
      "security",
    ]);
  });

  it("accepts hash-bound local independent artifacts without GitHub or network", async () => {
    const root = resolve(import.meta.dirname, "../../..");
    const directory = mkdtempSync(resolve(tmpdir(), "archestimator-review-"));
    try {
      const base = spawnSync("git", ["rev-parse", "HEAD"], {
        cwd: root,
        encoding: "utf8",
      }).stdout.trim();
      const classification = {
        profile: "Q2_CRITICAL_CHANGE_GATE" as const,
        files: wholeCandidateFiles(root, base),
        affected_capabilities: [],
        comparison_base: { input_ref: base, resolved_sha: base },
      };
      const canonical = await buildCandidate({
        root,
        comparison_base: classification.comparison_base,
        classification,
      });
      const classificationPath = resolve(directory, "classification.json");
      writeFileSync(
        classificationPath,
        JSON.stringify({ data: classification }),
      );
      const paths = [
        ["quality", "quality-reviewer"],
        ["security", "security-reviewer"],
      ].map(([review_type, reviewer_id]) => {
        const path = resolve(directory, `${review_type}.json`);
        writeFileSync(
          path,
          JSON.stringify({
            review_type,
            reviewer_id,
            decision: "APPROVE",
            candidate_sha256: canonical.sha256,
            commit_sha: canonical.record.commit_sha,
            reviewed_at: "2026-07-25T00:00:00.000Z",
            read_only: true,
            source: "local-agent",
          }),
        );
        return path;
      });
      const output = resolve(directory, "reviews.json");
      const run = spawnSync(
        "bun",
        [
          resolve(root, "scripts/quality/review.ts"),
          "--classification",
          classificationPath,
          "--base",
          base,
          "--base-sha",
          base,
          "--reviews",
          paths.join(","),
          "--author-ids",
          "author",
          "--output",
          output,
        ],
        { cwd: root, encoding: "utf8" },
      );
      expect(run.status, run.stderr).toBe(0);
      expect(JSON.parse(readFileSync(output, "utf8"))).toMatchObject({
        kind: "independent-review-gate",
        status: "PASS",
        data: {
          candidate: { sha256: canonical.sha256 },
          source: "local-agent",
        },
      });
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});

describe("final manifest and workflow contract", () => {
  it("accepts a complete final evidence contract and rejects skips, flakes, and remote claims", () => {
    expect(validateManifest(passingManifest(), profilesPolicy)).toEqual([]);
    const invalid = passingManifest();
    (invalid.job_results as Record<string, unknown>[])[0] = {
      ...(invalid.job_results as Record<string, unknown>[])[0],
      status: "skipped",
      flaky: true,
    };
    (invalid.external_evidence as Record<string, unknown>[])[0] = {
      ...(invalid.external_evidence as Record<string, unknown>[])[0],
      source: "remote",
    };
    expect(validateManifest(invalid, profilesPolicy).map((finding) => finding.code)).toEqual(
      expect.arrayContaining(["JOB_NOT_PASSING", "EXTERNAL_EVIDENCE_MALFORMED", "FALSE_PASS"]),
    );
    expect(validateManifest(invalid, profilesPolicy).at(-1)?.code).toBe("FALSE_PASS");
  });

  it("rejects wrong-job command impersonation and accepts supplemental command evidence", () => {
    const impersonated = passingManifest();
    (impersonated.command_results as Record<string, unknown>[])[0].job = "quality / build";
    expect(validateManifest(impersonated, profilesPolicy).map((finding) => finding.code)).toEqual(
      expect.arrayContaining(["COMMAND_JOB_MISMATCH"]),
    );

    const displaced = passingManifest();
    const displacedArtifact = {
      path: "artifacts/quality/displaced-review.json",
      sha256: "f".repeat(64),
    };
    (displaced.job_results as Record<string, unknown>[])[0].artifact = displacedArtifact;
    (displaced.job_results as Record<string, unknown>[]).push({
      name: "quality / build",
      status: "success",
      conclusion: "PASS",
      flaky: false,
      artifact,
    });
    expect(validateManifest(displaced, profilesPolicy).map((finding) => finding.code)).toEqual(
      expect.arrayContaining(["COMMAND_ARTIFACT_JOB_MISMATCH"]),
    );

    const valid = passingManifest();
    const buildArtifact = { path: "artifacts/quality/build.json", sha256: "d".repeat(64) };
    const budgetArtifact = {
      path: "artifacts/quality/bundle-budget.json",
      sha256: "e".repeat(64),
    };
    valid.required_jobs = ["quality / build"];
    valid.commands = ["bun run build", "bun run quality:bundle-budget"];
    valid.command_results = [
      {
        command: "bun run build",
        status: "PASS",
        source: "ci",
        job: "quality / build",
        artifact: buildArtifact,
      },
      {
        command: "bun run quality:bundle-budget",
        status: "PASS",
        source: "ci",
        job: "quality / build",
        artifact: budgetArtifact,
      },
    ];
    valid.job_results = [
      {
        name: "quality / build",
        status: "success",
        conclusion: "PASS",
        flaky: false,
        artifact: buildArtifact,
        artifacts: [budgetArtifact],
      },
    ];
    expect(validateManifest(valid, profilesPolicy).map((finding) => finding.code)).toEqual(
      expect.arrayContaining(["MANIFEST_REQUIRED_JOBS_POLICY", "MANIFEST_COMMANDS_POLICY"]),
    );
  });

  it("binds build and bundle commands to their exact primary and supplemental artifacts", () => {
    const valid = passingManifest();
    expect(validateManifest(valid, profilesPolicy)).toEqual([]);

    const swapped = passingManifest();
    const results = swapped.command_results as Array<{
      command: string;
      artifact: { path: string; sha256: string };
    }>;
    const build = results.find((result) => result.command === "bun run build")!;
    const bundle = results.find(
      (result) => result.command === "bun run quality:bundle-budget",
    )!;
    [build.artifact, bundle.artifact] = [bundle.artifact, build.artifact];
    const codes = validateManifest(swapped, profilesPolicy).map((finding) => finding.code);
    expect(codes.filter((code) => code === "COMMAND_ARTIFACT_MISMATCH")).toHaveLength(2);
    expect(codes).toContain("FALSE_PASS");
  });

  it("binds e2e smoke and matrix commands to their exact job artifacts", () => {
    const swapped = passingManifest();
    const results = swapped.command_results as Array<{
      command: string;
      artifact: { path: string; sha256: string };
    }>;
    const smoke = results.find((result) => result.command === "bun run test:e2e:smoke")!;
    const matrix = results.find((result) => result.command === "bun run test:e2e:matrix")!;
    [smoke.artifact, matrix.artifact] = [matrix.artifact, smoke.artifact];
    const codes = validateManifest(swapped, profilesPolicy).map((finding) => finding.code);
    expect(codes.filter((code) => code === "COMMAND_ARTIFACT_MISMATCH")).toHaveLength(2);
    expect(codes).toContain("FALSE_PASS");
  });

  it("rejects an artifact identity reused by different commands", () => {
    const reused = passingManifest();
    const results = reused.command_results as Array<{
      command: string;
      artifact: { path: string; sha256: string };
    }>;
    const build = results.find((result) => result.command === "bun run build")!;
    const bundle = results.find(
      (result) => result.command === "bun run quality:bundle-budget",
    )!;
    bundle.artifact.path = build.artifact.path;
    const codes = validateManifest(reused, profilesPolicy).map((finding) => finding.code);
    expect(codes).toEqual(
      expect.arrayContaining([
        "COMMAND_ARTIFACT_MISMATCH",
        "COMMAND_ARTIFACT_REUSED",
        "FALSE_PASS",
      ]),
    );
  });

  it("rejects alternate directories and traversal or absolute artifact aliases", () => {
    const aliases = [
      "artifacts/alternate/build.json",
      "artifacts/quality/../quality/build.json",
      "C:/repo/artifacts/quality/build.json",
    ];
    for (const alias of aliases) {
      const manifest = passingManifest();
      const result = (manifest.command_results as Array<{
        command: string;
        artifact: { path: string; sha256: string };
      }>).find((candidate) => candidate.command === "bun run build")!;
      const job = (manifest.job_results as Array<{
        name: string;
        artifact: { path: string; sha256: string };
      }>).find((candidate) => candidate.name === "quality / build")!;
      result.artifact.path = alias;
      job.artifact.path = alias;
      expect(validateManifest(manifest, profilesPolicy).map((finding) => finding.code)).toEqual(
        expect.arrayContaining(["COMMAND_ARTIFACT_MISMATCH", "FALSE_PASS"]),
      );
    }
  });

  it("rejects the same artifact bytes claimed from different canonical paths", () => {
    const reused = passingManifest();
    const results = reused.command_results as Array<{
      command: string;
      artifact: { path: string; sha256: string };
    }>;
    const build = results.find((result) => result.command === "bun run build")!;
    const bundle = results.find(
      (result) => result.command === "bun run quality:bundle-budget",
    )!;
    bundle.artifact.sha256 = build.artifact.sha256;
    const codes = validateManifest(reused, profilesPolicy).map((finding) => finding.code);
    expect(codes).toEqual(expect.arrayContaining(["COMMAND_ARTIFACT_REUSED", "FALSE_PASS"]));
  });

  it("rejects local command suffixes and shell control tokens", () => {
    for (const executed_command of [
      "bun run build --output artifacts/quality/build.json",
      "bun run build && whoami",
      "bun run build; whoami",
    ]) {
      const manifest = passingManifest();
      const result = (manifest.command_results as Array<Record<string, unknown>>).find(
        (candidate) => candidate.command === "bun run build",
      )!;
      result.source = "local";
      result.executed_command = executed_command;
      expect(validateManifest(manifest, profilesPolicy).map((finding) => finding.code)).toEqual(
        expect.arrayContaining(["COMMAND_RESULT_MALFORMED", "FALSE_PASS"]),
      );
    }
  });

  it("accepts exact local argv emitted by the verifier producer", () => {
    const manifest = passingManifest();
    const results = manifest.command_results as Array<Record<string, unknown>>;
    const localCommands = new Map([
      ["bun run build", "bun run build"],
      [
        "bun run quality:classify",
        `bun run quality:classify --base main --base-sha ${"c".repeat(40)} --profile Q2_CRITICAL_CHANGE_GATE --output artifacts/quality/classification.json`,
      ],
      [
        "bun run quality:reviews",
        `bun run quality:reviews --base main --base-sha ${"c".repeat(40)} --expected ${hash} --reviews artifacts/quality/review-quality.json,artifacts/quality/review-security.json --author-ids reviewer-quality,reviewer-security`,
      ],
    ]);
    for (const [command, executed_command] of localCommands) {
      const result = results.find((candidate) => candidate.command === command)!;
      result.source = "local";
      result.executed_command = executed_command;
    }
    expect(validateManifest(manifest, profilesPolicy)).toEqual([]);
  });

  it.each(["Q2_CRITICAL_CHANGE_GATE", "Q3_RELEASE_GATE"] as const)(
    "rejects subset, extra, duplicate, and downgraded %s policy declarations",
    (profile) => {
      const subset = passingManifest(profile);
      (subset.required_jobs as string[]).pop();
      (subset.commands as string[]).pop();
      expect(validateManifest(subset, profilesPolicy).map((finding) => finding.code)).toEqual(
        expect.arrayContaining(["MANIFEST_REQUIRED_JOBS_POLICY", "MANIFEST_COMMANDS_POLICY"]),
      );

      const extra = passingManifest(profile);
      (extra.required_jobs as string[]).push("quality / forged");
      (extra.commands as string[]).push("bun run forged");
      expect(validateManifest(extra, profilesPolicy).map((finding) => finding.code)).toEqual(
        expect.arrayContaining(["MANIFEST_REQUIRED_JOBS_POLICY", "MANIFEST_COMMANDS_POLICY"]),
      );

      const duplicate = passingManifest(profile);
      (duplicate.required_jobs as string[]).push((duplicate.required_jobs as string[])[0]);
      (duplicate.commands as string[]).push((duplicate.commands as string[])[0]);
      expect(validateManifest(duplicate, profilesPolicy).map((finding) => finding.code)).toEqual(
        expect.arrayContaining(["MANIFEST_REQUIRED_JOBS_POLICY", "MANIFEST_COMMANDS_POLICY"]),
      );

      const downgraded = passingManifest(profile);
      (downgraded.reviews as { requirements: Record<string, unknown> }).requirements.security = false;
      expect(validateManifest(downgraded, profilesPolicy).map((finding) => finding.code)).toContain(
        "REVIEW_REQUIREMENTS_POLICY",
      );
      const malformed = passingManifest(profile);
      (malformed.reviews as { requirements: Record<string, unknown> }).requirements.quality = "true";
      expect(validateManifest(malformed, profilesPolicy).map((finding) => finding.code)).toContain(
        "REVIEW_REQUIREMENTS_POLICY",
      );
    },
  );

  it("makes anti-bypass, adapters, reviews, and full release mutation executable dependencies", () => {
    const root = resolve(import.meta.dirname, "../../..");
    const profiles = JSON.parse(
      readFileSync(resolve(root, "quality/profiles.json"), "utf8"),
    );
    const workflow = readFileSync(resolve(root, ".github/workflows/quality.yml"), "utf8");
    const packageJson = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));

    for (const profile of Object.values(profiles.profiles) as {
      required_jobs: string[];
      commands: string[];
    }[]) {
      expect(profile.required_jobs).toContain("quality / classify");
      expect(profile.commands.filter((command) => command === "bun run quality:classify"))
        .toEqual(["bun run quality:classify"]);
      expect(profile.required_jobs).toEqual(
        expect.arrayContaining([
          "quality / adapters",
          "quality / anti-bypass",
          "quality / workflows",
        ]),
      );
      expect(profile.commands).toEqual(
        expect.arrayContaining([
          "bun run quality:adapters",
          "bun run quality:anti-bypass",
          "bun run quality:workflows",
        ]),
      );
    }
    expect(profiles.profiles.Q2_CRITICAL_CHANGE_GATE.required_jobs).toContain(
      "quality / review",
    );
    expect(profiles.profiles.Q3_RELEASE_GATE.commands).toContain(
      "bun run test:mutation:full",
    );
    expect(workflow).toContain("name: quality / review");
    expect(workflow).toContain("name: quality / gate");
    expect(workflow).toContain("Build final exact-candidate manifest");
    expect(packageJson.scripts["quality:reviews"]).toBe("bun scripts/quality/review.ts");
  });

  it("builds and validates the final CI manifest from immutable job artifacts", async () => {
    const sourceRoot = resolve(import.meta.dirname, "../../..");
    mkdirSync(resolve(sourceRoot, "artifacts"), { recursive: true });
    const directory = mkdtempSync(resolve(sourceRoot, "artifacts/archestimator-manifest-"));
    try {
      cpSync(resolve(sourceRoot, "scripts/quality"), resolve(directory, "scripts/quality"), {
        recursive: true,
      });
      mkdirSync(resolve(directory, "quality"), { recursive: true });
      writeFileSync(resolve(directory, ".gitignore"), "artifacts/\n");
      for (const filename of ["profiles.json", "critical-capabilities.json"]) {
        writeFileSync(
          resolve(directory, "quality", filename),
          readFileSync(resolve(sourceRoot, "quality", filename)),
        );
      }
      for (const args of [
        ["init"],
        ["config", "user.email", "quality-fixture@example.invalid"],
        ["config", "user.name", "Quality Fixture"],
        ["add", "."],
        ["commit", "-m", "fixture"],
      ]) {
        const git = spawnSync("git", args, { cwd: directory, encoding: "utf8" });
        expect(git.status, `${git.stdout}\n${git.stderr}`).toBe(0);
      }
      const commitSha = spawnSync("git", ["rev-parse", "HEAD"], {
        cwd: directory,
        encoding: "utf8",
      }).stdout.trim();
      const baseSha = commitSha;
      const classification = {
        schema_version: 1,
        kind: "quality-classification",
        status: "PASS",
        generated_at: "2026-07-25T00:00:00.000Z",
        summary: "Q0",
        findings: [],
        data: {
          profile: "Q0_CONTRACT_ONLY",
          reasons: ["prose"],
          files: wholeCandidateFiles(directory, baseSha),
          affected_capabilities: [],
          comparison_base: { input_ref: baseSha, resolved_sha: baseSha },
          fail_closed: false,
          attribution: {
            merge_base: baseSha,
            inherited_dirty_files: [],
            migration_changed_files: [],
            overlapping_files: [],
          },
        },
      };
      const expectedCandidate = await buildCandidate({
        root: directory,
        comparison_base: classification.data.comparison_base,
        classification: classification.data,
      });
      const definitions = [
        ["quality / classify", "classification.json", "quality-classification", classification],
        ["quality / contracts", "contracts.json", "quality-contracts"],
        ["quality / adapters", "adapter-validation.json", "ai-workflow-adapter-validation"],
        ["quality / anti-bypass", "anti-bypass.json", "anti-bypass"],
        ["quality / workflows", "workflows.json", "workflow-security"],
      ] as const;
      const jobs = definitions.map(([name, filename, kind, existing]) => {
        const path = resolve(directory, "artifacts/quality", filename);
        mkdirSync(resolve(path, ".."), { recursive: true });
        const report =
          existing ??
          ({
            schema_version: 1,
            kind,
            status: "PASS",
            generated_at: "2026-07-25T00:00:00.000Z",
            summary: "PASS",
            findings: [],
            data: {},
          } as const);
        const text = `${JSON.stringify(report)}\n`;
        writeFileSync(path, text);
        return {
          name,
          status: "success",
          conclusion: "PASS",
          flaky: false,
          artifact: {
            path: `artifacts/quality/${filename}`,
            sha256: createHash("sha256").update(text).digest("hex"),
          },
        };
      });
      const jobsPath = resolve(directory, "artifacts/quality/jobs.json");
      writeFileSync(jobsPath, JSON.stringify({ jobs }));
      const aggregatePath = resolve(directory, "artifacts/quality/aggregate.json");
      writeFileSync(
        aggregatePath,
        JSON.stringify({
          schema_version: 1,
          kind: "quality-aggregate",
          status: "PASS",
          generated_at: "2026-07-25T00:00:00.000Z",
          summary: "PASS",
          findings: [],
          data: {
            profile: "Q0_CONTRACT_ONLY",
            required_jobs: jobs.map((job) => job.name),
            jobs,
            reviews: null,
          },
        }),
      );
      const manifestPath = resolve(directory, "artifacts/quality/manifest.json");
      const build = spawnSync(
        "bun",
        [
          resolve(directory, "scripts/quality/build-manifest.ts"),
          "--classification",
          "artifacts/quality/classification.json",
          "--jobs",
          "artifacts/quality/jobs.json",
          "--aggregate",
          "artifacts/quality/aggregate.json",
          "--commit-sha",
          commitSha,
          "--output",
          "artifacts/quality/manifest.json",
        ],
        { cwd: directory, encoding: "utf8" },
      );
      expect(build.status, `${build.stdout}\n${build.stderr}`).toBe(0);
      const forgedProfiles = resolve(directory, "forged-profiles.json");
      writeFileSync(forgedProfiles, readFileSync(resolve(directory, "quality/profiles.json")));
      const rejectedBuild = spawnSync(
        "bun",
        [
          resolve(directory, "scripts/quality/build-manifest.ts"),
          "--classification", "artifacts/quality/classification.json",
          "--jobs", "artifacts/quality/jobs.json",
          "--aggregate", "artifacts/quality/aggregate.json",
          "--commit-sha", commitSha,
          "--profiles", forgedProfiles,
          "--output", "artifacts/quality/rejected-build.json",
        ],
        { cwd: directory, encoding: "utf8" },
      );
      expect(rejectedBuild.status).toBe(1);
      const rejectedReport = spawnSync(
        "bun",
        [
          resolve(directory, "scripts/quality/report.ts"),
          "--manifest", manifestPath,
          "--profiles", forgedProfiles,
          "--output", resolve(directory, "artifacts/quality/rejected-report.json"),
        ],
        { cwd: directory, encoding: "utf8" },
      );
      expect(rejectedReport.status).toBe(1);
      expect(JSON.parse(readFileSync(resolve(directory, "artifacts/quality/rejected-report.json"), "utf8"))
        .findings.map((finding: { code: string }) => finding.code)).toContain(
        "PROFILE_POLICY_OVERRIDE",
      );
      const manifestDocument = JSON.parse(readFileSync(manifestPath, "utf8"));
      const ajv = new Ajv2020({ strict: false });
      addFormats(ajv);
      const validateSchema = ajv.compile(JSON.parse(readFileSync(
        resolve(sourceRoot, "quality/schemas/manifest.schema.json"),
        "utf8",
      )));
      expect(validateSchema(manifestDocument), JSON.stringify(validateSchema.errors)).toBe(true);
      expect(manifestDocument).toMatchObject({
        kind: "quality-manifest",
        status: "PASS",
        data: {
          profile: "Q0_CONTRACT_ONLY",
          candidate: {
            commit_sha: expectedCandidate.record.commit_sha,
            sha256: expectedCandidate.sha256,
          },
          aggregate: { status: "PASS" },
          quality_domains: {
            test_health: { status: "PASS" },
          },
        },
      });
      const mismatchManifest = JSON.parse(readFileSync(manifestPath, "utf8"));
      mismatchManifest.data.candidate.sha256 = "0".repeat(64);
      const mismatchManifestPath = resolve(directory, "artifacts/quality/mismatch-manifest.json");
      writeFileSync(mismatchManifestPath, JSON.stringify(mismatchManifest));
      const mismatchPath = resolve(directory, "artifacts/quality/mismatch-report.json");
      const mismatch = spawnSync(
        "bun",
        [
          resolve(directory, "scripts/quality/report.ts"),
          "--manifest",
          mismatchManifestPath,
          "--output",
          mismatchPath,
        ],
        { cwd: directory, encoding: "utf8" },
      );
      expect(mismatch.status).toBe(1);
      const mismatchReport = JSON.parse(readFileSync(mismatchPath, "utf8"));
      expect(mismatchReport).toMatchObject({ kind: "quality-report", status: "FAIL" });
      expect(mismatchReport.findings.map((finding: { code: string }) => finding.code)).toContain(
        "MANIFEST_MALFORMED",
      );
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
