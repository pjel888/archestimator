import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import {
  classifyFiles,
  type RiskMap,
} from "../../../scripts/quality/classifier-core";
import {
  compareThresholds,
  scanAntiBypass,
  validateWaiver,
} from "../../../scripts/quality/anti-bypass-core";
import {
  aggregateJobs,
  findJobArtifact,
  type ProfilesFile,
} from "../../../scripts/quality/aggregate-core";
import {
  artifactBelongsToJob,
  artifactNameForCommand,
  jobNameForCommand,
} from "../../../scripts/quality/job-command-core";
import {
  compareGlobalCoverageRatchet,
  evaluateDiffCoverage,
  extractCoveragePercentages,
  parseAddedLines,
  parseLcov,
} from "../../../scripts/quality/diff-coverage-core";
import { scanWorkflow } from "../../../scripts/quality/workflow-security-core";
import {
  expectedArtifactReportError,
  validateManifest,
} from "../../../scripts/quality/report-core";
import { parseCommandCounts } from "../../../scripts/quality/evidence-counts";
import {
  buildCapabilityEvidence,
  validateTraceability,
} from "../../../scripts/quality/traceability-core";

const root = resolve(import.meta.dirname, "../../..");
const riskMap = JSON.parse(
  readFileSync(resolve(root, "quality/risk-map.json"), "utf8"),
) as RiskMap;
const profilesPolicy = JSON.parse(
  readFileSync(resolve(root, "quality/profiles.json"), "utf8"),
) as ProfilesFile;

describe("Q0-Q3 classification", () => {
  it("classifies prose, executable, critical policy, and explicit release", () => {
    expect(classifyFiles(["docs/quality/readme.md"], riskMap).classification.profile).toBe(
      "Q0_CONTRACT_ONLY",
    );
    expect(classifyFiles(["src/lib/math.ts"], riskMap).classification.profile).toBe(
      "Q1_CHANGE_GATE",
    );
    expect(classifyFiles(["AGENTS.md"], riskMap).classification.profile).toBe(
      "Q2_CRITICAL_CHANGE_GATE",
    );
    expect(
      classifyFiles(["src/lib/math.ts"], riskMap, { release: true }).classification.profile,
    ).toBe("Q3_RELEASE_GATE");
    expect(
      classifyFiles([".github/workflows/release-evidence.yml"], riskMap).classification.profile,
    ).toBe("Q2_CRITICAL_CHANGE_GATE");
  });

  it("fails closed on unknown paths and rejects downgrades", () => {
    const unknown = classifyFiles(["mystery/no-extension"], riskMap);
    expect(unknown.classification.profile).toBe("Q2_CRITICAL_CHANGE_GATE");
    expect(unknown.classification.fail_closed).toBe(true);
    const downgrade = classifyFiles(["quality/thresholds.json"], riskMap, {
      requestedProfile: "Q1_CHANGE_GATE",
    });
    expect(downgrade.findings.map((finding) => finding.code)).toContain(
      "PROFILE_DOWNGRADE_REJECTED",
    );
  });

  it("escalates HIGH GitNexus impact and user-requested stronger profiles", () => {
    expect(
      classifyFiles(["docs/note.md"], riskMap, { gitNexusRisk: "HIGH" }).classification.profile,
    ).toBe("Q2_CRITICAL_CHANGE_GATE");
    expect(
      classifyFiles(["docs/note.md"], riskMap, { requestedProfile: "Q3_RELEASE_GATE" })
        .classification.profile,
    ).toBe("Q3_RELEASE_GATE");
  });
});

describe("anti-bypass", () => {
  it("rejects skips, retries, hidden shell failures, and lowered thresholds", () => {
    const findings = scanAntiBypass([
      {
        path: "fixture.ts",
        text: "test.skip('x', () => {}); retries: 2; run: command || true",
      },
    ]);
    expect(findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining(["TEST_SKIP_OR_FOCUS", "HIDDEN_RETRY", "SHELL_FAILURE_HIDDEN"]),
    );
    expect(compareThresholds({ branches: 100 }, { branches: 95 })[0]?.code).toBe(
      "THRESHOLD_LOWERED",
    );
  });

  it("does not confuse documented product retry behavior with test retry configuration", () => {
    expect(
      scanAntiBypass([
        {
          path: "src/components/share/SharePageComments.tsx",
          text: "// Client retry (3 attempts: immediate, +2s, +5s)",
        },
      ]),
    ).toEqual([]);
    expect(
      scanAntiBypass([
        {
          path: "playwright.config.ts",
          text: "export default { retries: 2 };",
        },
        {
          path: "fixture.ts",
          text: "retry(3);",
        },
      ]).map((finding) => finding.code),
    ).toEqual(["HIDDEN_RETRY", "HIDDEN_RETRY"]);
  });

  it("distinguishes configured source exclusions from git CLI flags", () => {
    expect(
      scanAntiBypass([
        {
          path: "scripts/quality/run-mutation.ts",
          text: 'spawnSync("git", ["ls-files", "--others", "--exclude-standard", "src"])',
        },
      ]),
    ).toEqual([]);
    expect(
      scanAntiBypass([
        {
          path: "vitest.config.ts",
          text: 'export default { coverage: { exclude: ["src/**"] } }',
        },
      ]).map((finding) => finding.code),
    ).toContain("BUSINESS_LOGIC_EXCLUSION");
  });

  it("rejects expired and agent-authored waivers", () => {
    const findings = validateWaiver({
      author_type: "agent",
      approvals: ["one"],
      expires_at: "2020-01-01T00:00:00Z",
    });
    expect(findings).toHaveLength(3);
  });
});

describe("aggregate and report", () => {
  it("fails closed for component baseline measurement status combinations", () => {
    const schema = JSON.parse(readFileSync(
      resolve(root, "quality/schemas/component-baseline-measurement.schema.json"),
      "utf8",
    ));
    const ajv = new Ajv2020({ strict: false });
    addFormats(ajv);
    const validate = ajv.compile(schema);
    const base = {
      schema_version: 1,
      kind: "component-baseline-measurement",
      generated_at: "2026-07-26T00:00:00.000Z",
      summary: "measurement",
      findings: [],
      data: { measurement: null },
    };
    expect(validate({ ...base, status: "FAIL" })).toBe(true);
    expect(validate({ ...base, status: "PASS" })).toBe(false);
    const measurement = {
      schema_version: 1,
      integrity_status: "PASS",
      command: "bun x vitest run --maxWorkers=1 --coverage --coverage.reportOnFailure=true --reporter=json",
      duration_ms: 1,
      exit_status: 0,
      candidate: {
        artifact: "candidate.json",
        artifact_sha256: "a".repeat(64),
        inner_sha256: "b".repeat(64),
        commit_sha: "c".repeat(40),
        comparison_base: { input_ref: "main", resolved_sha: "d".repeat(40) },
        profile: "Q2_CRITICAL_CHANGE_GATE",
      },
      report: { artifact: "report.json", sha256: "e".repeat(64) },
      coverage: { artifact: "coverage.json", sha256: "f".repeat(64) },
    };
    expect(validate({ ...base, status: "PASS", data: { measurement } })).toBe(true);
    expect(validate({
      ...base,
      status: "PASS",
      findings: [{ code: "RED" }],
      data: { measurement },
    })).toBe(false);
    expect(validate({
      ...base,
      status: "PASS",
      data: { measurement: { ...measurement, exit_status: null } },
    })).toBe(false);
  });

  it("requires the canonical artifact kind, empty findings, and exact command evidence id", () => {
    const report = {
      schema_version: 1,
      kind: "quality-static",
      status: "PASS",
      findings: [],
      data: {},
    };
    expect(expectedArtifactReportError(report, "artifacts/quality/static.json")).toBeUndefined();
    expect(expectedArtifactReportError({ ...report, kind: undefined }, "artifacts/quality/static.json"))
      .toMatch(/kind/u);
    expect(expectedArtifactReportError({ ...report, kind: "focused-fixture" }, "artifacts/quality/static.json"))
      .toMatch(/kind/u);
    expect(expectedArtifactReportError({ ...report, findings: [{ code: "RED" }] }, "artifacts/quality/static.json"))
      .toMatch(/empty/u);
    const commandEvidence = { ...report, kind: "command-evidence", data: { evidence_id: "forged" } };
    expect(expectedArtifactReportError(commandEvidence, "artifacts/quality/unit.json"))
      .toMatch(/test:unit:coverage/u);
    expect(expectedArtifactReportError(
      { ...commandEvidence, data: { evidence_id: "test:unit:coverage" } },
      "artifacts/quality/unit.json",
    )).toBeUndefined();
  });

  it("extracts counts from Bun, Vitest, Playwright, and Cucumber summaries", () => {
    expect(parseCommandCounts("34 pass\n1 fail\n2 skip")).toMatchObject({
      tests_passed: 34,
      tests_failed: 1,
      tests_skipped: 2,
    });
    expect(
      parseCommandCounts("Test Files 1 passed (1)\nTests 1 failed | 17 passed | 3 skipped (21)"),
    ).toMatchObject({
      tests_passed: 17,
      tests_failed: 1,
      tests_skipped: 3,
    });
    expect(parseCommandCounts("  2 passed (14.5s)\n  1 failed")).toMatchObject({
      tests_passed: 2,
      tests_failed: 1,
    });
    expect(
      parseCommandCounts("5 scenarios (5 passed)\n20 steps (20 passed)"),
    ).toMatchObject({
      tests_passed: 0,
      scenarios_passed: 5,
      steps_passed: 20,
    });
    expect(
      parseCommandCounts("5 scenarios (4 passed, 1 failed)\n20 steps (19 passed, 1 failed)"),
    ).toMatchObject({
      scenarios_passed: 4,
      scenarios_failed: 1,
      steps_passed: 19,
      steps_failed: 1,
    });
  });

  it("rejects missing, skipped, and flaky required jobs", () => {
    const findings = aggregateJobs(
      ["quality / classify", "quality / contracts"],
      [
        {
          name: "quality / classify",
          status: "skipped",
          conclusion: "PASS",
          flaky: true,
          artifact: { path: "x", sha256: "a".repeat(64) },
        },
      ],
    );
    expect(findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining(["JOB_NOT_PASSING", "FLAKY_JOB", "MISSING_JOB"]),
    );
  });

  it("rejects malformed, empty, and duplicate additional job artifacts", () => {
    const base = {
      name: "quality / build",
      status: "success" as const,
      conclusion: "PASS" as const,
      flaky: false,
      artifact: { path: "build.json", sha256: "a".repeat(64) },
    };
    for (const artifacts of [
      [],
      [{ path: "bundle-budget.json", sha256: "not-a-hash" }],
      [{ path: "build.json", sha256: "b".repeat(64) }],
      [{ path: "nested/build.json", sha256: "b".repeat(64) }],
      [{ path: "bundle-budget.json", sha256: "a".repeat(64) }],
    ]) {
      expect(
        aggregateJobs([base.name], [{ ...base, artifacts }]).map((finding) => finding.code),
      ).toContain("MISSING_JOB_ARTIFACT");
    }
  });

  it("rejects valid evidence assigned to the wrong aggregate job", () => {
    const base = {
      status: "success" as const,
      conclusion: "PASS" as const,
      flaky: false,
    };
    const buildArtifacts = {
      artifact: { path: "downloads/build.json", sha256: "a".repeat(64) },
      artifacts: [{ path: "downloads/bundle-budget.json", sha256: "b".repeat(64) }],
    };
    const e2eArtifacts = {
      artifact: { path: "downloads/e2e-smoke.json", sha256: "c".repeat(64) },
      artifacts: [{ path: "downloads/e2e-matrix.json", sha256: "d".repeat(64) }],
    };

    for (const job of [
      { ...base, name: "quality / build", ...e2eArtifacts },
      { ...base, name: "quality / e2e-smoke", ...buildArtifacts },
      {
        ...base,
        name: "quality / build",
        artifact: buildArtifacts.artifact,
        artifacts: e2eArtifacts.artifacts,
      },
      {
        ...base,
        name: "quality / e2e-smoke",
        artifact: e2eArtifacts.artifact,
        artifacts: buildArtifacts.artifacts,
      },
    ]) {
      expect(aggregateJobs([job.name], [job]).map((finding) => finding.code)).toContain(
        "MISSING_JOB_ARTIFACT",
      );
    }
  });

  it("maps exact commands to primary and additional artifacts without duplicating jobs", () => {
    const build = {
      name: "quality / build",
      status: "success" as const,
      conclusion: "PASS" as const,
      flaky: false,
      artifact: { path: "downloads/build.json", sha256: "a".repeat(64) },
      artifacts: [{ path: "downloads/bundle-budget.json", sha256: "b".repeat(64) }],
    };
    const e2e = {
      ...build,
      name: "quality / e2e-smoke",
      artifact: { path: "downloads/e2e-smoke.json", sha256: "c".repeat(64) },
      artifacts: [{ path: "downloads/e2e-matrix.json", sha256: "d".repeat(64) }],
    };
    const impostor = {
      ...e2e,
      artifacts: [{ path: "downloads/bundle-budget.json", sha256: "e".repeat(64) }],
    };

    expect(findJobArtifact([build, e2e], "quality / build", "artifacts/quality/build.json")).toEqual({
      job: build,
      artifact: build.artifact,
    });
    expect(findJobArtifact([build, e2e], "quality / build", "artifacts/quality/bundle-budget.json")).toEqual({
      job: build,
      artifact: build.artifacts[0],
    });
    expect(findJobArtifact([build, e2e], "quality / e2e-smoke", "artifacts/quality/e2e-matrix.json")).toEqual({
      job: e2e,
      artifact: e2e.artifacts[0],
    });
    expect(
      findJobArtifact([impostor], "quality / build", "bundle-budget.json"),
    ).toBeUndefined();
    expect(jobNameForCommand("bun run quality:bundle-budget")).toBe("quality / build");
    expect(jobNameForCommand("bun run test:e2e:smoke")).toBe("quality / e2e-smoke");
    expect(jobNameForCommand("bun run test:e2e:matrix")).toBe("quality / e2e-smoke");
    expect(jobNameForCommand("bun run test:e2e:matrix --forged")).toBeUndefined();
    expect(artifactNameForCommand("bun run quality:bundle-budget")).toBe(
      "bundle-budget.json",
    );
    expect(artifactBelongsToJob("quality / build", "downloads/build.json")).toBe(true);
    expect(artifactBelongsToJob("quality / build", "downloads/e2e-smoke.json")).toBe(false);
    const profiles = JSON.parse(
      readFileSync(resolve(root, "quality/profiles.json"), "utf8"),
    ) as { profiles: Record<string, { commands: string[] }> };
    for (const command of Object.values(profiles.profiles).flatMap((entry) => entry.commands)) {
      expect(jobNameForCommand(command), command).toBeDefined();
    }
  });

  it("rejects unknown, duplicate, and impersonated local command results", () => {
    const artifact = { path: "command.json", sha256: "a".repeat(64) };
    const findings = validateManifest({
      schema_version: 1,
      profile: "Q2_CRITICAL_CHANGE_GATE",
      merge_base: "a".repeat(40),
      candidate: { commit_sha: "b".repeat(40), sha256: "c".repeat(64) },
      scope: {
        changed_files: [],
        inherited_dirty_files: [],
        migration_changed_files: [],
        overlapping_files: [],
      },
      required_jobs: [],
      commands: ["bun run quality:contracts"],
      command_results: [
        {
          command: "bun run quality:contracts",
          executed_command: "bun run quality:workflows",
          status: "PASS",
          source: "local",
          artifact,
        },
        {
          command: "bun run quality:contracts",
          executed_command: "bun run quality:contracts -- --comparison-base main",
          status: "PASS",
          source: "local",
          artifact,
        },
        {
          command: "bun run unknown",
          status: "PASS",
          source: "ci",
          artifact,
        },
      ],
      job_results: [],
      evidence: [],
      status: "FAIL",
    }, profilesPolicy);
    expect(findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "COMMAND_RESULT_MALFORMED",
        "COMMAND_RESULT_DUPLICATE",
        "COMMAND_RESULT_UNKNOWN",
      ]),
    );
  });

  it("rejects false PASS and unproven hosted evidence", () => {
    const findings = validateManifest({
      schema_version: 1,
      profile: "Q2_CRITICAL_CHANGE_GATE",
      merge_base: "abcdef0",
      scope: {
        changed_files: [],
        inherited_dirty_files: [],
        migration_changed_files: [],
        overlapping_files: [],
      },
      command_results: [],
      evidence: [
        { kind: "hosted", status: "PASS", source: "hosted", artifact: "x.json" },
      ],
      status: "PASS",
    }, profilesPolicy);
    expect(findings.map((finding) => finding.code)).toContain("UNPROVEN_EXTERNAL_CLAIM");
    expect(findings.map((finding) => finding.code)).toContain("FALSE_PASS");
  });
});

describe("coverage, workflow security, and traceability", () => {
  it("fails uncovered changed lines, branches, functions, and statements", () => {
    const lcov = parseLcov(
      [
        "SF:src/example.ts",
        "FN:1,example",
        "FNDA:0,example",
        "DA:1,0",
        "BRDA:1,0,0,0",
        "end_of_record",
      ].join("\n"),
    );
    const diff = parseAddedLines(
      ["+++ b/src/example.ts", "@@ -0,0 +1,1 @@", "+export function example() {}"].join(
        "\n",
      ),
    );
    const result = evaluateDiffCoverage(lcov, diff, {
      statements: 100,
      lines: 100,
      functions: 100,
      branches: 100,
    });
    expect(result.findings.map((finding) => finding.code)).toEqual([
      "CHANGED_LINE_COVERAGE",
      "CHANGED_BRANCH_COVERAGE",
      "CHANGED_STATEMENT_COVERAGE",
      "CHANGED_FUNCTION_COVERAGE",
    ]);
  });

  it("fails closed when changed executable files or lines are absent from LCOV", () => {
    const missingFile = evaluateDiffCoverage(
      new Map(),
      parseAddedLines(
        ["+++ b/src/missing.ts", "@@ -0,0 +1,1 @@", "+export const missing = true"].join(
          "\n",
        ),
      ),
      { statements: 100, lines: 100, functions: 100, branches: 95 },
    );
    expect(missingFile.metrics).toMatchObject({
      changed_lines: 1,
      covered_lines: 0,
      line_percent: 0,
    });
    expect(missingFile.findings.map((finding) => finding.code)).toContain(
      "CHANGED_FILE_COVERAGE_MISSING",
    );

    const missingLine = evaluateDiffCoverage(
      parseLcov(["SF:src/example.ts", "DA:1,1", "end_of_record"].join("\n")),
      parseAddedLines(
        ["+++ b/src/example.ts", "@@ -1,0 +2,1 @@", "+export const absent = true"].join(
          "\n",
        ),
      ),
      { statements: 100, lines: 100, functions: 100, branches: 95 },
    );
    expect(missingLine.findings.map((finding) => finding.code)).toContain(
      "CHANGED_LINE_COVERAGE_MISSING",
    );

    const malformedLcov = evaluateDiffCoverage(
      parseLcov(["SF:src/example.ts", "DA:not-a-line,not-hits", "end_of_record"].join("\n")),
      parseAddedLines(
        ["+++ b/src/example.ts", "@@ -0,0 +1,1 @@", "+export const absent = true"].join(
          "\n",
        ),
      ),
      { statements: 100, lines: 100, functions: 100, branches: 100 },
    );
    expect(malformedLcov.findings.map((finding) => finding.code)).toEqual([
      "CHANGED_LINE_COVERAGE_MISSING",
      "CHANGED_LINE_COVERAGE",
      "CHANGED_BRANCH_COVERAGE",
      "CHANGED_STATEMENT_COVERAGE",
      "CHANGED_FUNCTION_COVERAGE",
    ]);
  });

  it("does not require LCOV entries for added blank or comment-only lines", () => {
    const changed = parseAddedLines(
      [
        "+++ b/src/example.ts",
        "@@ -0,0 +1,3 @@",
        "+// explanatory comment",
        "+",
        "+export const covered = true",
      ].join("\n"),
    );
    const result = evaluateDiffCoverage(
      parseLcov(["SF:src/example.ts", "DA:3,1", "end_of_record"].join("\n")),
      changed,
      { statements: 100, lines: 100, functions: 0, branches: 0 },
    );
    expect([...changed.get("src/example.ts")!]).toEqual([3]);
    expect(result.metrics).toMatchObject({
      changed_lines: 1,
      covered_lines: 1,
      line_percent: 100,
    });
    expect(result.findings).toEqual([]);
  });

  it("filters multiline block comments without hiding executable suffixes", () => {
    const changed = parseAddedLines(
      [
        "+++ b/src/example.ts",
        "@@ -0,0 +1,8 @@",
        "+/*",
        "+ * explanatory block",
        "+ */",
        "+export const covered = true",
        "+/* prefix */ export const afterInline = true",
        "+/* another block",
        "+ */ export const afterBlock = true",
        '+export const url = "https://example.com"',
      ].join("\n"),
    );
    expect([...changed.get("src/example.ts")!]).toEqual([4, 5, 7, 8]);

    const covered = evaluateDiffCoverage(
      parseLcov(
        [
          "SF:src/example.ts",
          "DA:4,1",
          "DA:5,1",
          "DA:7,1",
          "DA:8,1",
          "end_of_record",
        ].join("\n"),
      ),
      changed,
      { statements: 100, lines: 100, functions: 0, branches: 0 },
    );
    expect(covered.metrics).toMatchObject({
      changed_lines: 4,
      covered_lines: 4,
      line_percent: 100,
    });
    expect(covered.findings).toEqual([]);

    const missingFile = evaluateDiffCoverage(
      new Map(),
      changed,
      { statements: 100, lines: 100, functions: 0, branches: 0 },
    );
    expect(missingFile.metrics.changed_lines).toBe(4);
    expect(missingFile.findings.map((finding) => finding.code)).toContain(
      "CHANGED_FILE_COVERAGE_MISSING",
    );
  });

  it("uses the complete supplied migration diff instead of narrowing its file scope", () => {
    const changed = parseAddedLines(
      [
        "diff --git a/scripts/quality/first.ts b/scripts/quality/first.ts",
        "--- a/scripts/quality/first.ts",
        "+++ b/scripts/quality/first.ts",
        "@@ -0,0 +5,1 @@",
        "+export const first = true",
        "diff --git a/scripts/quality/second.ts b/scripts/quality/second.ts",
        "--- a/scripts/quality/second.ts",
        "+++ b/scripts/quality/second.ts",
        "@@ -0,0 +9,2 @@",
        "+// migration comment",
        "+export const second = true",
      ].join("\n"),
    );
    expect([...changed]).toEqual([
      ["scripts/quality/first.ts", new Set([5])],
      ["scripts/quality/second.ts", new Set([10])],
    ]);
  });

  it("merges overlapping runner LCOV with max-hit semantics and Q2 thresholds", () => {
    const lcov = parseLcov(
      [
        "SF:/repo/src/shared.ts",
        "FN:1,shared",
        "FNDA:0,shared",
        "DA:1,0",
        "BRDA:1,0,0,1",
        "BRDA:1,0,1,0",
        "end_of_record",
        "SF:src/shared.ts",
        "FN:1,shared",
        "FNDA:3,shared",
        "DA:1,7",
        "BRDA:1,0,0,1",
        "BRDA:1,0,1,2",
        "end_of_record",
      ].join("\n"),
    );
    const result = evaluateDiffCoverage(
      lcov,
      parseAddedLines(
        ["+++ b/src/shared.ts", "@@ -0,0 +1,1 @@", "+export const shared = true"].join(
          "\n",
        ),
      ),
      { statements: 100, lines: 100, functions: 100, branches: 100 },
    );
    expect(result.metrics).toMatchObject({
      changed_lines: 1,
      covered_lines: 1,
      changed_branches: 2,
      covered_branches: 2,
      changed_functions: 1,
      covered_functions: 1,
      line_percent: 100,
      branch_percent: 100,
      function_percent: 100,
      statement_percent: 100,
    });
    expect(result.findings).toEqual([]);
  });

  it("preserves zero-denominator coverage rules", () => {
    const noChanges = evaluateDiffCoverage(new Map(), new Map(), {
      statements: 100,
      lines: 100,
      functions: 100,
      branches: 100,
    });
    expect(noChanges.metrics).toMatchObject({
      line_percent: 100,
      branch_percent: 100,
      function_percent: 100,
      statement_percent: 100,
    });
    expect(noChanges.findings).toEqual([]);

    const changedWithoutBranchOrFunction = evaluateDiffCoverage(
      parseLcov(["SF:src/example.ts", "DA:1,1", "end_of_record"].join("\n")),
      new Map([["src/example.ts", new Set([1])]]),
      { statements: 100, lines: 100, functions: 0, branches: 0 },
    );
    expect(changedWithoutBranchOrFunction.metrics).toMatchObject({
      line_percent: 100,
      branch_percent: 0,
      function_percent: 0,
      statement_percent: 100,
    });
    expect(changedWithoutBranchOrFunction.findings).toEqual([]);
  });

  it("reads nested Vitest summaries and enforces the canonical global ratchet", () => {
    const nestedSummary = {
      total: {
        statements: { total: 100, covered: 91, skipped: 0, pct: 91 },
        lines: { total: 100, covered: 92, skipped: 0, pct: 92 },
        functions: { total: 100, covered: 93, skipped: 0, pct: 93 },
        branches: { total: 100, covered: 86, skipped: 0, pct: 86 },
      },
    };
    expect(extractCoveragePercentages(nestedSummary)).toEqual({
      statements: 91,
      lines: 92,
      functions: 93,
      branches: 86,
    });
    const baseline = { coverage: nestedSummary };
    const current = {
      total: {
        ...nestedSummary.total,
        branches: { total: 100, covered: 85, skipped: 0, pct: 85 },
      },
    };
    expect(compareGlobalCoverageRatchet(baseline, current).map((finding) => finding.code))
      .toEqual(["GLOBAL_COVERAGE_REGRESSION"]);
    expect(compareGlobalCoverageRatchet(baseline, baseline)).toEqual([]);
    expect(compareGlobalCoverageRatchet({}, current).map((finding) => finding.code))
      .toEqual(["RATCHET_MALFORMED"]);
    expect(compareGlobalCoverageRatchet(baseline, undefined).map((finding) => finding.code))
      .toEqual(["RATCHET_MALFORMED"]);
  });

  it("rejects mutable actions, untrusted writes, and hidden workflow failures", () => {
    const findings = scanWorkflow(
      ".github/workflows/bad.yml",
      [
        "on:",
        "  pull_request:",
        "permissions:",
        "  contents: write",
        "jobs:",
        "  test:",
        "    continue-on-error: true",
        "    steps:",
        "      - uses: actions/checkout@v4",
        "      - run: test || true",
      ].join("\n"),
    );
    expect(findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "MUTABLE_ACTION",
        "UNTRUSTED_WRITE_PERMISSION",
        "CONTINUE_ON_ERROR",
        "SHELL_FAILURE_HIDDEN",
      ]),
    );
  });

  it("requires every evidence kind for affected capabilities", () => {
    const findings = validateTraceability(
      ["CAP-AUTH"],
      [{ id: "CAP-AUTH", evidence_kinds: ["unit", "security"] }],
      [
        {
          capability_id: "CAP-AUTH",
          kind: "unit",
          command: "bun run test:unit:coverage",
          status: "PASS",
          artifact: "unit.json",
          artifact_sha256: "a".repeat(64),
        },
      ],
    );
    expect(findings[0]?.code).toBe("MISSING_CAPABILITY_EVIDENCE");
  });

  it("keeps CAP-UNKNOWN fail-closed even with passing classification evidence", () => {
    const findings = validateTraceability(
      ["CAP-UNKNOWN"],
      [{ id: "CAP-UNKNOWN", evidence_kinds: ["classification"], must_fix: true }],
      [
        {
          capability_id: "CAP-UNKNOWN",
          kind: "classification",
          command: "bun run quality:classify",
          status: "PASS",
          artifact: "classification.json",
          artifact_sha256: "a".repeat(64),
        },
      ],
    );
    expect(findings.map((finding) => finding.code)).toEqual(["UNKNOWN_MUST_FIX"]);
  });

  it("builds capability evidence only from the selected profile's fresh artifacts", () => {
    const evidence = buildCapabilityEvidence(
      ["CAP-AUTH"],
      [{ id: "CAP-AUTH", evidence_kinds: ["unit", "security"] }],
      {
        unit: { Q2_CRITICAL_CHANGE_GATE: "bun run test:unit:coverage" },
        security: { Q2_CRITICAL_CHANGE_GATE: "bun run quality:security" },
      },
      "Q2_CRITICAL_CHANGE_GATE",
      [
        {
          command: "bun run test:unit:coverage",
          exit_code: 0,
          artifact: { path: "unit.json", sha256: "a".repeat(64) },
        },
        {
          command: "bun run quality:security",
          exit_code: 0,
        },
      ],
    );
    expect(evidence).toEqual([
      {
        capability_id: "CAP-AUTH",
        kind: "unit",
        command: "bun run test:unit:coverage",
        status: "PASS",
        artifact: "unit.json",
        artifact_sha256: "a".repeat(64),
      },
      {
        capability_id: "CAP-AUTH",
        kind: "security",
        command: "bun run quality:security",
        status: "FAIL",
        artifact: "",
      },
    ]);
    expect(
      validateTraceability(
        ["CAP-AUTH"],
        [{ id: "CAP-AUTH", evidence_kinds: ["unit", "security"] }],
        evidence,
      ).map((finding) => finding.code),
    ).toEqual(["CAPABILITY_EVIDENCE_FAILED"]);
  });
});
