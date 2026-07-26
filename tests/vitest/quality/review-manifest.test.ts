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
import {
  buildCandidate,
  candidateDigest,
  type CandidateRecord,
  type CanonicalCandidate,
} from "../../../scripts/quality/candidate-core";
import { validateManifest } from "../../../scripts/quality/report-core";
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
    expect(validateManifest(invalid).at(-1)?.code).toBe("FALSE_PASS");
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

  it("builds and validates the final CI manifest from immutable job artifacts", async () => {
    const root = resolve(import.meta.dirname, "../../..");
    const directory = mkdtempSync(resolve(tmpdir(), "archestimator-manifest-"));
    try {
      const commitSha = spawnSync("git", ["rev-parse", "HEAD"], {
        cwd: root,
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
          files: wholeCandidateFiles(root, baseSha),
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
        root,
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
          resolve(root, "scripts/quality/build-manifest.ts"),
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
          resolve(root, "scripts/quality/report.ts"),
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
      const mismatchManifestPath = resolve(directory, "mismatch-manifest.json");
      writeFileSync(mismatchManifestPath, JSON.stringify(mismatchManifest));
      const mismatchPath = resolve(directory, "mismatch-report.json");
      const mismatch = spawnSync(
        "bun",
        [
          resolve(root, "scripts/quality/report.ts"),
          "--manifest",
          mismatchManifestPath,
          "--output",
          mismatchPath,
        ],
        { cwd: root, encoding: "utf8" },
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
