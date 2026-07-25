import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { validateManifest } from "../../../scripts/quality/report-core";
import {
  candidateSha256,
  githubReviewTypes,
  reviewRequirements,
  validateReviews,
  type ReviewEvidence,
} from "../../../scripts/quality/review-core";

const hash = "a".repeat(64);
const commit = "b".repeat(40);
const artifact = { path: "artifacts/quality/example.json", sha256: hash };

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

function passingManifest(): Record<string, unknown> {
  return {
    schema_version: 1,
    profile: "Q2_CRITICAL_CHANGE_GATE",
    candidate: { commit_sha: commit, sha256: hash },
    merge_base: "c".repeat(40),
    scope: {
      changed_files: ["quality/profiles.json"],
      inherited_dirty_files: [],
      migration_changed_files: [],
      overlapping_files: [],
    },
    required_jobs: ["quality / review"],
    commands: ["bun run quality:reviews"],
    command_results: [
      {
        command: "bun run quality:reviews",
        status: "PASS",
        source: "ci",
        job: "quality / review",
        artifact,
      },
    ],
    job_results: [
      {
        name: "quality / review",
        status: "success",
        conclusion: "PASS",
        flaky: false,
        artifact,
      },
    ],
    evidence: [
      {
        kind: "quality / review",
        status: "PASS",
        source: "ci",
        artifact,
      },
    ],
    reviews: {
      candidate_sha256: hash,
      requirements: { quality: true, security: true, release: false },
      decisions: [approval("quality", "reviewer-quality"), approval("security", "reviewer-security")],
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
        candidate_sha256: hash,
        commit_sha: commit,
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
        candidate_sha256: hash,
        commit_sha: commit,
        author_ids: ["author"],
        reviews: [stale, approval("quality", "author")],
      }).map((finding) => finding.code),
    ).toEqual(
      expect.arrayContaining([
        "REVIEW_TARGET_MISMATCH",
        "REVIEW_NOT_INDEPENDENT",
        "REVIEW_REQUIRED",
      ]),
    );
  });

  it("binds deterministic candidate content and recognizes explicit GitHub review roles", () => {
    const first = candidateSha256({
      commit_sha: commit,
      profile: "Q2_CRITICAL_CHANGE_GATE",
      changed_files: [{ path: "quality/profiles.json", sha256: hash }],
      affected_capabilities: [],
    });
    const second = candidateSha256({
      commit_sha: commit,
      profile: "Q2_CRITICAL_CHANGE_GATE",
      changed_files: [{ path: "quality/profiles.json", sha256: "e".repeat(64) }],
      affected_capabilities: [],
    });
    expect(first).not.toBe(second);
    expect(githubReviewTypes("[quality-review]\nReview-Type: security")).toEqual([
      "quality",
      "security",
    ]);
  });

  it("accepts hash-bound local independent artifacts without GitHub or network", () => {
    const root = resolve(import.meta.dirname, "../../..");
    const directory = mkdtempSync(resolve(tmpdir(), "archestimator-review-"));
    try {
      const candidateCommit = spawnSync("git", ["rev-parse", "HEAD"], {
        cwd: root,
        encoding: "utf8",
      }).stdout.trim();
      const profileBytes = readFileSync(resolve(root, "quality/profiles.json"));
      const candidate = candidateSha256({
        commit_sha: candidateCommit,
        profile: "Q2_CRITICAL_CHANGE_GATE",
        changed_files: [
          {
            path: "quality/profiles.json",
            sha256: createHash("sha256").update(profileBytes).digest("hex"),
          },
        ],
        affected_capabilities: [],
      });
      const classificationPath = resolve(directory, "classification.json");
      writeFileSync(
        classificationPath,
        JSON.stringify({
          data: {
            profile: "Q2_CRITICAL_CHANGE_GATE",
            files: ["quality/profiles.json"],
            affected_capabilities: [],
          },
        }),
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
            candidate_sha256: candidate,
            commit_sha: candidateCommit,
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
          "scripts/quality/review.ts",
          "--classification",
          classificationPath,
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
          candidate: { sha256: candidate },
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
    expect(validateManifest(passingManifest())).toEqual([]);
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
    expect(validateManifest(invalid).map((finding) => finding.code)).toEqual(
      expect.arrayContaining(["JOB_NOT_PASSING", "EXTERNAL_EVIDENCE_MALFORMED", "FALSE_PASS"]),
    );
  });

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

  it("builds and validates the final CI manifest from immutable job artifacts", () => {
    const root = resolve(import.meta.dirname, "../../..");
    const directory = mkdtempSync(resolve(tmpdir(), "archestimator-manifest-"));
    try {
      const commitSha = spawnSync("git", ["rev-parse", "HEAD"], {
        cwd: root,
        encoding: "utf8",
      }).stdout.trim();
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
          files: ["docs/quality/readme.md"],
          affected_capabilities: [],
          fail_closed: false,
          attribution: {
            merge_base: commitSha,
            inherited_dirty_files: [],
            migration_changed_files: [],
            overlapping_files: [],
          },
        },
      };
      const definitions = [
        ["quality / classify", "classification.json", "quality-classification", classification],
        ["quality / contracts", "contracts.json", "quality-contracts"],
        ["quality / adapters", "adapter-validation.json", "ai-workflow-adapter-validation"],
        ["quality / anti-bypass", "anti-bypass.json", "anti-bypass"],
        ["quality / workflows", "workflows.json", "workflow-security"],
      ] as const;
      const jobs = definitions.map(([name, filename, kind, existing]) => {
        const path = resolve(directory, filename);
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
            path,
            sha256: createHash("sha256").update(text).digest("hex"),
          },
        };
      });
      const jobsPath = resolve(directory, "jobs.json");
      writeFileSync(jobsPath, JSON.stringify({ jobs }));
      const aggregatePath = resolve(directory, "aggregate.json");
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
      const manifestPath = resolve(directory, "manifest.json");
      const build = spawnSync(
        "bun",
        [
          "scripts/quality/build-manifest.ts",
          "--classification",
          resolve(directory, "classification.json"),
          "--jobs",
          jobsPath,
          "--aggregate",
          aggregatePath,
          "--commit-sha",
          commitSha,
          "--output",
          manifestPath,
        ],
        { cwd: root, encoding: "utf8" },
      );
      expect(build.status, `${build.stdout}\n${build.stderr}`).toBe(0);
      const report = spawnSync(
        "bun",
        [
          "scripts/quality/report.ts",
          "--manifest",
          manifestPath,
          "--require-command-log",
          "--output",
          resolve(directory, "report.json"),
        ],
        { cwd: root, encoding: "utf8" },
      );
      expect(report.status, `${report.stdout}\n${report.stderr}`).toBe(0);
      expect(JSON.parse(readFileSync(manifestPath, "utf8"))).toMatchObject({
        kind: "quality-manifest",
        status: "PASS",
        data: {
          profile: "Q0_CONTRACT_ONLY",
          aggregate: { status: "PASS" },
          quality_domains: {
            test_health: { status: "PASS" },
          },
        },
      });
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
