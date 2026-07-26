import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

import { afterEach, describe, expect, it } from "vitest";

const qualityWorkflow = readFileSync(".github/workflows/quality.yml", "utf8");
const jobResultsBuilder = readFileSync(
  "scripts/quality/ci/build-job-results.mjs",
  "utf8",
);
const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

function expectedEvidenceId(filename: string): string {
  return {
    "build.json": "build",
    "bundle-budget.json": "bundle-budget",
    "e2e-smoke.json": "test:e2e:smoke",
    "e2e-matrix.json": "test:e2e:matrix",
  }[filename]!;
}

function writeCommandReport(
  downloads: string,
  slug: string,
  filename: string,
  evidenceId = expectedEvidenceId(filename),
  valid = true,
): void {
  const directory = join(downloads, `quality-${slug}-42-3`);
  mkdirSync(directory, { recursive: true });
  writeFileSync(
    join(directory, filename),
    valid
      ? `${JSON.stringify({
          schema_version: 1,
          kind: "command-evidence",
          status: "PASS",
          findings: [],
          data: { evidence_id: evidenceId },
        })}\n`
      : "{}\n",
  );
}

function buildJobResults(options?: {
  validBundleBudget?: boolean;
  bundleEvidenceId?: string;
  nonCommandFinding?: boolean;
}) {
  const directory = mkdtempSync(join(tmpdir(), "archestimator-job-results-"));
  temporaryDirectories.push(directory);
  const downloads = join(directory, "artifacts", "quality-downloads");
  const output = join(directory, "artifacts", "quality", "jobs.json");
  writeCommandReport(downloads, "build", "build.json");
  writeCommandReport(
    downloads,
    "build",
    "bundle-budget.json",
    options?.bundleEvidenceId,
    options?.validBundleBudget ?? true,
  );
  writeCommandReport(downloads, "e2e", "e2e-smoke.json");
  writeCommandReport(downloads, "e2e", "e2e-matrix.json");
  if (options?.nonCommandFinding) {
    const classificationDirectory = join(downloads, "quality-classification-42-3");
    mkdirSync(classificationDirectory, { recursive: true });
    writeFileSync(
      join(classificationDirectory, "classification.json"),
      JSON.stringify({
        schema_version: 1,
        kind: "quality-classification",
        status: "PASS",
        findings: [{ code: "UNRESOLVED", message: "must fail closed" }],
        data: {},
      }),
    );
  }
  const builder = resolve("scripts/quality/ci/build-job-results.mjs");
  const run = spawnSync("node", [builder], {
    cwd: directory,
    encoding: "utf8",
    env: {
      ...process.env,
      QUALITY_DOWNLOADS: downloads,
      QUALITY_JOBS_OUTPUT: output,
      QUALITY_PROFILE: "Q2_CRITICAL_CHANGE_GATE",
      QUALITY_RUN_ID: "42",
      QUALITY_RUN_ATTEMPT: "3",
      BUILD: "success",
      E2E_SMOKE: "success",
      ...(options?.nonCommandFinding ? { CLASSIFY: "success" } : {}),
    },
  });
  expect(run.status, run.stderr).toBe(0);
  return {
    directory,
    output,
    ...(JSON.parse(readFileSync(output, "utf8")) as {
    jobs: Array<{
      name: string;
      conclusion: "PASS" | "FAIL";
      artifact?: { path: string; sha256: string };
      artifacts?: Array<{ path: string; sha256: string }>;
    }>;
    }),
  };
}

function componentJobSource(): string {
  const start = qualityWorkflow.indexOf("  component:");
  const end = qualityWorkflow.indexOf("\n  property:", start);

  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return qualityWorkflow.slice(start, end);
}

describe("component CI integration", () => {
  it("downloads the immutable classification artifact before profile dispatch", () => {
    const componentJob = componentJobSource();

    expect(componentJob).toContain("needs: classify");
    expect(componentJob).toContain("name: Download classification");
    expect(componentJob).toContain(
      "name: quality-classification-${{ github.run_id }}-${{ github.run_attempt }}",
    );
    expect(componentJob).toContain("path: artifacts/quality");
    expect(componentJob.indexOf("name: Download classification")).toBeLessThan(
      componentJob.indexOf("name: Run selected component tier"),
    );
  });

  it("dispatches every executable profile to its matching component lane and fails closed otherwise", () => {
    const componentJob = componentJobSource();

    expect(componentJob).toContain(
      "Q1_CHANGE_GATE) bun run test:component:change ;;",
    );
    expect(componentJob).toContain(
      "Q2_CRITICAL_CHANGE_GATE) bun run test:component:critical ;;",
    );
    expect(componentJob).toContain(
      "Q3_RELEASE_GATE) bun run test:component:release ;;",
    );
    expect(componentJob).toContain('echo "Unsupported component profile: $QUALITY_PROFILE"');
    expect(componentJob).toContain("exit 1");
    expect(componentJob).not.toContain("bun run test:component:coverage");
  });

  it("uploads both component lanes without changing aggregate job traceability", () => {
    const componentJob = componentJobSource();

    expect(componentJob).toContain("artifacts/quality/component.json");
    expect(componentJob).toContain("artifacts/quality/component-strict.vitest.json");
    expect(componentJob).toContain("artifacts/quality/component-full.vitest.json");
    expect(componentJob).toContain("artifacts/coverage/component-strict/**");
    expect(componentJob).toContain("artifacts/coverage/component/**");
    expect(jobResultsBuilder).toContain(
      '["quality / component", "COMPONENT", "component", "component.json"]',
    );
  });

  it("emits ordered multi-artifact evidence without duplicating stable job results", () => {
    const { jobs } = buildJobResults();
    const build = jobs.find((job) => job.name === "quality / build");
    const e2e = jobs.find((job) => job.name === "quality / e2e-smoke");

    expect(new Set(jobs.map((job) => job.name)).size).toBe(jobs.length);
    expect(build).toMatchObject({
      conclusion: "PASS",
      artifact: { path: "artifacts/quality/build.json" },
      artifacts: [{ path: "artifacts/quality/bundle-budget.json" }],
    });
    expect(e2e).toMatchObject({
      conclusion: "PASS",
      artifact: { path: "artifacts/quality/e2e-smoke.json" },
      artifacts: [{ path: "artifacts/quality/e2e-matrix.json" }],
    });
  });

  it("does not fabricate job success for malformed or impersonated supplemental evidence", () => {
    for (const options of [
      { validBundleBudget: false },
      { bundleEvidenceId: "build" },
    ]) {
      const build = buildJobResults(options).jobs.find(
        (job) => job.name === "quality / build",
      );
      expect(build).toMatchObject({ conclusion: "FAIL" });
      expect(build).not.toHaveProperty("artifact");
      expect(build).not.toHaveProperty("artifacts");
    }
  });

  it("rejects a non-command PASS report that still contains findings", () => {
    const classification = buildJobResults({ nonCommandFinding: true }).jobs.find(
      (job) => job.name === "quality / classify",
    );
    expect(classification).toMatchObject({ conclusion: "FAIL" });
    expect(classification).not.toHaveProperty("artifact");
  });

  it("makes aggregate validation fail on a supplemental artifact hash mismatch", () => {
    const built = buildJobResults();
    const build = built.jobs.find((job) => job.name === "quality / build")!;
    build.artifacts![0].sha256 = "f".repeat(64);
    writeFileSync(built.output, JSON.stringify({ jobs: built.jobs }));
    const directory = built.directory;
    const profiles = join(directory, "profiles.json");
    const aggregate = join(directory, "aggregate.json");
    writeFileSync(
      profiles,
      JSON.stringify({
        command_artifacts: {},
        profiles: {
          Q0_CONTRACT_ONLY: {
            required_review_types: [],
            conditional_review_types: [],
            required_jobs: ["quality / build"],
            commands: [],
          },
        },
      }),
    );

    const run = spawnSync(
      "bun",
      [
        resolve("scripts/quality/aggregate.ts"),
        "--profile",
        "Q0_CONTRACT_ONLY",
        "--profiles",
        profiles,
        "--jobs",
        built.output,
        "--output",
        aggregate,
      ],
      { cwd: directory, encoding: "utf8" },
    );
    expect(run.status).toBe(1);
    expect(JSON.parse(readFileSync(aggregate, "utf8"))).toMatchObject({
      status: "FAIL",
      findings: expect.arrayContaining([
        expect.objectContaining({ code: "ARTIFACT_HASH_MISMATCH" }),
      ]),
    });
  });

  it("makes the real aggregate CLI reject valid reports assigned to the wrong jobs", () => {
    const built = buildJobResults();
    const build = built.jobs.find((job) => job.name === "quality / build")!;
    const e2e = built.jobs.find((job) => job.name === "quality / e2e-smoke")!;
    [build.artifact, e2e.artifact] = [e2e.artifact, build.artifact];
    [build.artifacts, e2e.artifacts] = [e2e.artifacts, build.artifacts];
    writeFileSync(built.output, JSON.stringify({ jobs: built.jobs }));
    const directory = built.directory;
    const profiles = join(directory, "profiles.json");
    const aggregate = join(directory, "aggregate.json");
    writeFileSync(
      profiles,
      JSON.stringify({
        command_artifacts: {},
        profiles: {
          Q0_CONTRACT_ONLY: {
            required_review_types: [],
            conditional_review_types: [],
            required_jobs: ["quality / build", "quality / e2e-smoke"],
            commands: [],
          },
        },
      }),
    );

    const run = spawnSync(
      "bun",
      [
        resolve("scripts/quality/aggregate.ts"),
        "--profile",
        "Q0_CONTRACT_ONLY",
        "--profiles",
        profiles,
        "--jobs",
        built.output,
        "--output",
        aggregate,
      ],
      { cwd: directory, encoding: "utf8" },
    );
    expect(run.status).toBe(1);
    expect(JSON.parse(readFileSync(aggregate, "utf8"))).toMatchObject({
      status: "FAIL",
      findings: expect.arrayContaining([
        expect.objectContaining({ code: "MISSING_JOB_ARTIFACT" }),
      ]),
    });
  });
});
