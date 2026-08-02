import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  compareComponentRatchet,
  evaluateRawGreenComponentRun,
  globMatches,
  normalizeComponentCoveragePaths,
  normalizeVitestFailures,
  selectStrictComponentTests,
  validateComponentBaseline,
  validateComponentProfileSelection,
  validateSuccessorCoverageDenominators,
  type ComponentBaseline,
  type ComponentEvidenceMap,
  type CoverageSummary,
  type VitestJsonReport,
} from "../../../scripts/quality/component-core";
import { candidateDigest, type CandidateRecord } from "../../../scripts/quality/candidate-core";
import { sha256 } from "../../../scripts/quality/common";

const root = "/repo";
const candidateRecord: CandidateRecord = {
  schema_version: 1,
  commit_sha: "1".repeat(40),
  comparison_base: { input_ref: "main", resolved_sha: "2".repeat(40) },
  profile: "Q2_CRITICAL_CHANGE_GATE",
  changed_files: [],
  affected_capabilities: [],
};
const candidateDigestValue = candidateDigest(candidateRecord);
const coverageValue = (pct: number) => ({
  total: 100,
  covered: pct,
  skipped: 0,
  pct,
});
const coverage = (pct: number): CoverageSummary => ({
  total: {
    statements: coverageValue(pct),
    branches: coverageValue(pct),
    functions: coverageValue(pct),
    lines: coverageValue(pct),
  },
  "src/example.ts": {
    statements: coverageValue(pct),
    branches: coverageValue(pct),
    functions: coverageValue(pct),
    lines: coverageValue(pct),
  },
});

function report(
  status: "passed" | "failed" | "pending" = "passed",
  message = "expected true to be false",
): VitestJsonReport {
  return {
    success: status !== "failed",
    numTotalTestSuites: 1,
    numPassedTestSuites: status === "failed" ? 0 : 1,
    numFailedTestSuites: status === "failed" ? 1 : 0,
    numPendingTestSuites: 0,
    numTotalTests: 1,
    numPassedTests: status === "passed" ? 1 : 0,
    numFailedTests: status === "failed" ? 1 : 0,
    numPendingTests: status === "pending" ? 1 : 0,
    numTodoTests: 0,
    testResults: [
      {
        name: "/repo/tests/vitest/example.test.tsx",
        status: status === "failed" ? "failed" : "passed",
        assertionResults: [
          {
            fullName: "Example renders safely",
            title: "renders safely",
            status,
            failureMessages: status === "failed" ? [message] : [],
          },
        ],
      },
    ],
  };
}

function admittedBaseline(failureReport = report("failed")): ComponentBaseline {
  const failure = normalizeVitestFailures(failureReport, root).failures[0]!;
  return {
    schema_version: 1,
    status: "admitted",
    source: {
      command: "bun run test:component:baseline",
      report: "quality/baselines/component/source.vitest.json",
      report_sha256: "a".repeat(64),
      coverage: "quality/baselines/component/coverage-summary.json",
      coverage_sha256: "b".repeat(64),
      candidate: { record: structuredClone(candidateRecord), digest: candidateDigestValue },
      measurement: {
        integrity_status: "PASS",
        command: "bun x vitest run --maxWorkers=1 --coverage --coverage.reportOnFailure=true --reporter=json",
        duration_ms: 1,
        exit_status: 0,
        candidate_digest: candidateDigestValue,
        candidate_commit: candidateRecord.commit_sha,
        comparison_base: candidateRecord.comparison_base,
        profile: "Q2_CRITICAL_CHANGE_GATE",
        report_sha256: "a".repeat(64),
        coverage_sha256: "b".repeat(64),
      },
    },
    admission: {
      inventory: "quality/baselines/component/inventory.json",
      inventory_sha256: "c".repeat(64),
      validation_artifact: "quality/baselines/component/admission.json",
      validation_sha256: "d".repeat(64),
      quality_review_artifact: "quality/reviews/component-baseline-quality.md",
      quality_review_sha256: "e".repeat(64),
      security_review_artifact: "quality/reviews/component-baseline-security.md",
      security_review_sha256: "f".repeat(64),
      candidate_digest: candidateDigestValue,
      author_ids: ["author"],
      quality_reviewer: "quality-reviewer",
      security_reviewer: "security-reviewer",
      review_source: "local-agent",
      reviewer_identity_assurance: "asserted-local",
      author_identity_assurance: "asserted-local",
      bootstrap: true,
      predecessor_baseline_sha256: null,
    },
    suite: {
      test_files: ["tests/vitest/example.test.tsx"],
      total_tests: 1,
    },
    allowed_failures: [
      {
        ...failure,
        classification: "ratchet_noncritical",
        owner: "quality-owner",
        rationale: "Measured legacy presentation-only assertion debt",
        acceptance: {
          command: "bun run test:component:critical",
          expected_artifact: "artifacts/quality/component.json",
        },
        expires_at: "2099-01-01T00:00:00.000Z",
        quality_reviewer: "quality-reviewer",
        security_reviewer: "security-reviewer",
      },
    ],
    coverage: coverage(80),
  };
}

function bindBaselineCandidate(baseline: ComponentBaseline): void {
  const digest = candidateDigest(baseline.source.candidate.record);
  baseline.source.candidate.digest = digest;
  baseline.source.measurement.candidate_digest = digest;
  baseline.admission.candidate_digest = digest;
}

function passedReportForRoot(repositoryRoot: string): VitestJsonReport {
  const current = report("passed");
  current.testResults![0]!.name = resolve(repositoryRoot, "tests/vitest/example.test.tsx");
  return current;
}

function hiddenUncoveredReduction(): CoverageSummary {
  const current = coverage(80);
  const statements = {
    total: 99,
    covered: 79,
    skipped: 0,
    pct: 79.79,
  };
  current.total.statements = statements;
  current["src/example.ts"]!.statements = statements;
  return current;
}

describe("component evidence selection", () => {
  it("requests coverage reports on failed Q1/Q2 Vitest runs", () => {
    const source = readFileSync("scripts/quality/component.ts", "utf8");
    expect(source).toContain('...(reportOnFailure ? ["--coverage.reportOnFailure=true"] : [])');
    expect(source).toContain('executeVitest(root, "strict", strictTests, true)');
    expect(source).toContain('executeVitest(root, "full", [], profile !== "Q3_RELEASE_GATE")');
  });

  const evidenceMap: ComponentEvidenceMap = {
    schema_version: 1,
    component_scope_patterns: ["src/components/**/*.tsx"],
    affected_rules: [
      {
        id: "UI",
        source_patterns: ["src/components/**/*.tsx"],
        test_patterns: ["tests/vitest/ui/**/*.test.tsx"],
      },
    ],
    critical_capabilities: {
      "CAP-AUTH": ["tests/vitest/auth/**/*.test.tsx"],
    },
  };
  const available = [
    "tests/vitest/auth/session.test.tsx",
    "tests/vitest/ui/button.test.tsx",
  ];

  it("matches double-star globs and selects affected plus critical tests", () => {
    expect(globMatches("src/components/Button.tsx", "src/components/**/*.tsx")).toBe(true);
    expect(globMatches("src/components/forms/Button.tsx", "src/components/**/*.tsx")).toBe(
      true,
    );
    const selected = selectStrictComponentTests(
      ["src/components/forms/Button.tsx"],
      ["CAP-AUTH"],
      available,
      evidenceMap,
    );
    expect(selected.findings).toEqual([]);
    expect(selected.tests).toEqual(available);
  });

  it("fails closed for missing path, capability, and empty test mappings", () => {
    const selected = selectStrictComponentTests(
      ["src/components/Button.tsx"],
      ["CAP-UNKNOWN"],
      [],
      {
        ...evidenceMap,
        affected_rules: [],
      },
    );
    expect(selected.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "COMPONENT_MAPPING_MISSING",
        "CRITICAL_COMPONENT_MAPPING_MISSING",
      ]),
    );
  });

  it("rejects a component-profile downgrade", () => {
    expect(
      validateComponentProfileSelection("Q1_CHANGE_GATE", "Q2_CRITICAL_CHANGE_GATE").map(
        (finding) => finding.code,
      ),
    ).toEqual(["COMPONENT_PROFILE_DOWNGRADE"]);
    expect(
      validateComponentProfileSelection("Q3_RELEASE_GATE", "Q2_CRITICAL_CHANGE_GATE"),
    ).toEqual([]);
  });
});

describe("component failure normalization and ratchet", () => {
  it("normalizes coverage paths without allowing collisions, total aliases, or escapes", () => {
    const coverageRoot = resolve("coverage-root");
    const metrics = coverage(100).total;
    const absolute = resolve(coverageRoot, "src/example.ts");
    expect(normalizeComponentCoveragePaths({ total: metrics, [absolute]: metrics }, coverageRoot)).toEqual({
      total: metrics,
      "src/example.ts": metrics,
    });
    expect(() => normalizeComponentCoveragePaths({ total: metrics, [absolute]: metrics, "src/example.ts": metrics }, coverageRoot)).toThrow(/collide/u);
    expect(() => normalizeComponentCoveragePaths({ total: metrics, [resolve(coverageRoot, "src/../src/example.ts")]: metrics, "src/example.ts": metrics }, coverageRoot)).toThrow(/collide/u);
    expect(() => normalizeComponentCoveragePaths({ total: metrics, [resolve(coverageRoot, "total")]: metrics }, coverageRoot)).toThrow(/aliases total/u);
    expect(() => normalizeComponentCoveragePaths({ total: metrics, [resolve(coverageRoot, "../outside.ts")]: metrics }, coverageRoot)).toThrow(/outside/u);
    expect(() => normalizeComponentCoveragePaths({ total: metrics, "D:\\outside.ts": metrics }, coverageRoot)).toThrow(/outside/u);
    expect(() => normalizeComponentCoveragePaths({ total: metrics, "\\\\server\\share\\outside.ts": metrics }, coverageRoot)).toThrow(/namespace|UNC/u);
    expect(() => normalizeComponentCoveragePaths({ total: metrics, "\\\\?\\C:\\repo\\src\\example.ts": metrics }, coverageRoot)).toThrow(/namespace|UNC/u);
    expect(() => normalizeComponentCoveragePaths({ total: metrics, "\\\\.\\C:\\Windows\\win.ini": metrics }, coverageRoot)).toThrow(/namespace|UNC/u);
    expect(() => normalizeComponentCoveragePaths({ total: metrics, "src/example.ts.": metrics }, coverageRoot)).toThrow(/trailing dot or space/u);
    expect(() => normalizeComponentCoveragePaths({ total: metrics, "src/example.ts ": metrics }, coverageRoot)).toThrow(/trailing dot or space/u);
    expect(() => normalizeComponentCoveragePaths({ total: metrics, "src/example.ts::$DATA": metrics }, coverageRoot)).toThrow(/alternate data stream|colon alias/u);
  });

  it("rejects contradictory aggregate coverage and forged Vitest counters", () => {
    const metrics = coverage(100).total;
    expect(() => normalizeComponentCoveragePaths({ total: metrics }, resolve("coverage-root"))).toThrow(/aggregate counters/u);
    const forged: VitestJsonReport = {
      success: true,
      numTotalTestSuites: 2058,
      numPassedTestSuites: 2058,
      numFailedTestSuites: 0,
      numPendingTestSuites: 0,
      numTotalTests: 6481,
      numPassedTests: 6481,
      numFailedTests: 0,
      numPendingTests: 0,
      numTodoTests: 0,
      testResults: [],
    };
    expect(evaluateRawGreenComponentRun(forged, root).map((finding) => finding.code)).toContain("COMPONENT_REPORT_MALFORMED");

    const contradictoryBranches = coverage(100) as CoverageSummary & Record<string, { branchesTrue?: ReturnType<typeof coverageValue> }>;
    contradictoryBranches.total.branchesTrue = coverageValue(100);
    contradictoryBranches.total.branchesTrue.total = 1;
    contradictoryBranches.total.branchesTrue.covered = 1;
    expect(() => normalizeComponentCoveragePaths(contradictoryBranches, resolve("coverage-root"))).toThrow(/aggregate counters/u);
  });

  it("rejects malformed, duplicate, skipped, and suite-contradictory file evidence", () => {
    const aliasedResult = { ...report().testResults![0]!, name: "tests/vitest/example.test.tsx" };
    const cases: VitestJsonReport[] = [
      { ...report(), testResults: [{ status: "passed", assertionResults: [] }], numTotalTests: 0, numPassedTests: 0 },
      { ...report(), testResults: [...report().testResults!, ...report().testResults!], numTotalTestSuites: 2, numPassedTestSuites: 2, numTotalTests: 2, numPassedTests: 2 },
      { ...report(), testResults: [...report().testResults!, aliasedResult], numTotalTestSuites: 2, numPassedTestSuites: 2, numTotalTests: 2, numPassedTests: 2 },
      { ...report(), testResults: [{ ...report().testResults![0]!, status: "skipped" }] },
      { ...report(), testResults: [{ ...report().testResults![0]!, name: "/outside/example.test.tsx" }] },
      { ...report(), testResults: [{ ...report().testResults![0]!, name: "/repo/tests/vitest/example.test.tsx::$DATA" }] },
      { ...report(), testResults: [{ ...report().testResults![0]!, assertionResults: [] }], numTotalTests: 0, numPassedTests: 0 },
      { ...report(), numTotalTestSuites: 2, numPassedTestSuites: 1, numPendingTestSuites: 1 },
    ];
    for (const malformed of cases) {
      expect(evaluateRawGreenComponentRun(malformed, root).map((finding) => finding.code)).toContain("COMPONENT_REPORT_MALFORMED");
    }
  });

  it.each([null, {}, { source: null, admission: {} }, { source: {}, admission: null }])(
    "returns structured baseline findings without throwing for malformed input %#",
    (malformed) => {
      expect(() => validateComponentBaseline(malformed)).not.toThrow();
      expect(validateComponentBaseline(malformed).length).toBeGreaterThan(0);
    },
  );

  it("accepts the locale-sorted candidate order produced by the canonical builder", () => {
    const baseline = admittedBaseline();
    const paths = [".ai/evidence.json", "AGENTS.md"].sort((left, right) => left.localeCompare(right));
    baseline.source.candidate.record.changed_files = paths.map((path) => ({
      path,
      sha256: "f".repeat(64),
      deleted: false,
      sources: ["unstaged"],
    }));
    baseline.source.candidate.digest = candidateDigest(baseline.source.candidate.record);

    expect(validateComponentBaseline(baseline)).toEqual([]);
  });

  it("accepts a non-bootstrap predecessor binding only with its immutable SHA", () => {
    const baseline = admittedBaseline();
    baseline.admission.bootstrap = false;
    baseline.admission.predecessor_baseline_sha256 = "1".repeat(64);

    expect(validateComponentBaseline(baseline)).toEqual([]);
  });

  it.each([
    ["null candidate file", (baseline: ComponentBaseline) => { (baseline.source.candidate.record.changed_files as unknown[]) = [null]; }],
    ["non-array author IDs", (baseline: ComponentBaseline) => { (baseline.admission as unknown as Record<string, unknown>).author_ids = {}; }],
    ["whitespace-padded author IDs", (baseline: ComponentBaseline) => { baseline.admission.author_ids = ["author "]; }],
  ])("returns structured findings without throwing for %s", (_label, mutate) => {
    const malformed = admittedBaseline();
    mutate(malformed);
    expect(() => validateComponentBaseline(malformed)).not.toThrow();
    expect(validateComponentBaseline(malformed).length).toBeGreaterThan(0);
  });

  it("normalizes assertion failures to leaf identities without file-level duplicates", () => {
    const normalized = normalizeVitestFailures(report("failed"), root);
    expect(normalized.failures).toHaveLength(1);
    expect(normalized.failures[0]).toMatchObject({
      file: "tests/vitest/example.test.tsx",
      test: "Example renders safely",
      kind: "test_failure",
    });
    expect(normalized.findings).toEqual([]);
  });

  it("accepts only the exact admitted identity and allows debt reduction", () => {
    const failed = report("failed");
    const baseline = admittedBaseline(failed);
    expect(compareComponentRatchet(failed, coverage(80), baseline, root)).toEqual([]);
    expect(compareComponentRatchet(report("passed"), coverage(81), baseline, root)).toEqual([]);
  });

  it("anchors unchanged-source shrink to the baseline denominator", () => {
    const baseline = admittedBaseline();
    const coveredLoss = hiddenUncoveredReduction();
    expect(compareComponentRatchet(report("passed"), coveredLoss, baseline, root)).toEqual([{
      code: "COMPONENT_COVERAGE_REGRESSION",
      message: "src/example.ts statements effective uncovered count 21 is worse than baseline 20",
      path: "src/example.ts",
    }]);

    for (const covered of [80, 81]) {
      const current = coverage(80);
      const value = { total: 99, covered, skipped: 0, pct: Math.floor((covered / 99) * 10_000) / 100 };
      current.total.statements = value;
      current["src/example.ts"]!.statements = value;
      expect(compareComponentRatchet(report("passed"), current, baseline, root)).toEqual([]);
    }
  });

  it("allows denominator shrink only when candidate-bound source bytes changed", () => {
    const repositoryRoot = mkdtempSync(join(tmpdir(), "component-ratchet-source-"));
    const sourcePath = resolve(repositoryRoot, "src/example.ts");
    mkdirSync(resolve(repositoryRoot, "src"), { recursive: true });
    writeFileSync(sourcePath, "baseline bytes\n");
    try {
      const baseline = admittedBaseline();
      baseline.source.candidate.record.changed_files = [{
        path: "src/example.ts",
        sha256: sha256(readFileSync(sourcePath)),
        line_ending_neutral_sha256: sha256(readFileSync(sourcePath)),
        deleted: false,
        sources: ["unstaged"],
      }];
      bindBaselineCandidate(baseline);
      const currentReport = passedReportForRoot(repositoryRoot);

      expect(
        compareComponentRatchet(currentReport, hiddenUncoveredReduction(), baseline, repositoryRoot)
          .map((finding) => finding.code),
      ).toContain("COMPONENT_COVERAGE_REGRESSION");

      writeFileSync(sourcePath, "changed bytes\n");
      expect(
        compareComponentRatchet(currentReport, hiddenUncoveredReduction(), baseline, repositoryRoot),
      ).toEqual([]);
      expect(
        validateSuccessorCoverageDenominators(hiddenUncoveredReduction(), baseline.coverage),
      ).toEqual([{
        code: "COMPONENT_SUCCESSOR_COVERAGE_DENOMINATOR_REGRESSION",
        message: "src/example.ts statements total 99 is below predecessor 100",
        path: "src/example.ts",
      }]);

      const worsened = hiddenUncoveredReduction();
      const worsenedValue = { total: 99, covered: 78, skipped: 0, pct: 78.78 };
      worsened.total.statements = worsenedValue;
      worsened["src/example.ts"]!.statements = worsenedValue;
      expect(compareComponentRatchet(currentReport, worsened, baseline, repositoryRoot).map((finding) => finding.code))
        .toContain("COMPONENT_COVERAGE_REGRESSION");
    } finally {
      rmSync(repositoryRoot, { recursive: true, force: true });
    }
  });

  it("ignores aggregate-only denominator changes when admitting a successor", () => {
    const predecessor = coverage(80);
    const current = structuredClone(predecessor);
    for (const metric of ["statements", "branches", "functions", "lines"] as const) {
      current.total[metric] = { total: 99, covered: 79, skipped: 0, pct: 79.79 };
    }

    expect(validateSuccessorCoverageDenominators(current, predecessor)).toEqual([]);
  });

  it("fails closed for candidate-bound line-ending-only differences", () => {
    const repositoryRoot = mkdtempSync(join(tmpdir(), "component-ratchet-candidate-line-endings-"));
    const sourcePath = resolve(repositoryRoot, "src/example.ts");
    mkdirSync(resolve(repositoryRoot, "src"), { recursive: true });
    writeFileSync(sourcePath, "baseline bytes\n");
    try {
      const baseline = admittedBaseline();
      baseline.source.candidate.record.changed_files = [{
        path: "src/example.ts",
        sha256: sha256(readFileSync(sourcePath)),
        line_ending_neutral_sha256: sha256(readFileSync(sourcePath)),
        deleted: false,
        sources: ["unstaged"],
      }];
      bindBaselineCandidate(baseline);
      const currentReport = passedReportForRoot(repositoryRoot);

      writeFileSync(sourcePath, "baseline bytes\r\n");
      expect(
        compareComponentRatchet(currentReport, hiddenUncoveredReduction(), baseline, repositoryRoot)
          .map((finding) => finding.code),
      ).toContain("COMPONENT_COVERAGE_REGRESSION");

      writeFileSync(sourcePath, "changed bytes\r\n");
      expect(
        compareComponentRatchet(currentReport, hiddenUncoveredReduction(), baseline, repositoryRoot),
      ).toEqual([]);
    } finally {
      rmSync(repositoryRoot, { recursive: true, force: true });
    }
  });

  it("fails closed when candidate-bound neutral source evidence is absent", () => {
    const repositoryRoot = mkdtempSync(join(tmpdir(), "component-ratchet-candidate-legacy-"));
    const sourcePath = resolve(repositoryRoot, "src/example.ts");
    mkdirSync(resolve(repositoryRoot, "src"), { recursive: true });
    writeFileSync(sourcePath, "baseline bytes\n");
    try {
      const baseline = admittedBaseline();
      baseline.source.candidate.record.changed_files = [{
        path: "src/example.ts",
        sha256: sha256(readFileSync(sourcePath)),
        deleted: false,
        sources: ["unstaged"],
      }];
      bindBaselineCandidate(baseline);
      const currentReport = passedReportForRoot(repositoryRoot);

      expect(
        compareComponentRatchet(currentReport, hiddenUncoveredReduction(), baseline, repositoryRoot)
          .map((finding) => finding.code),
      ).toContain("COMPONENT_COVERAGE_REGRESSION");

      writeFileSync(sourcePath, "changed bytes\n");
      expect(
        compareComponentRatchet(currentReport, hiddenUncoveredReduction(), baseline, repositoryRoot)
          .map((finding) => finding.code),
      ).toContain("COMPONENT_COVERAGE_REGRESSION");
    } finally {
      rmSync(repositoryRoot, { recursive: true, force: true });
    }
  });

  it("fails closed when candidate-bound source traverses a linked directory", () => {
    const repositoryRoot = mkdtempSync(join(tmpdir(), "component-ratchet-candidate-ancestor-link-"));
    const outsideRoot = mkdtempSync(join(tmpdir(), "component-ratchet-candidate-ancestor-outside-"));
    const sourceDirectory = resolve(repositoryRoot, "src");
    const sourcePath = resolve(outsideRoot, "example.ts");
    writeFileSync(sourcePath, "baseline bytes\n");
    symlinkSync(outsideRoot, sourceDirectory, process.platform === "win32" ? "junction" : "dir");
    try {
      const baseline = admittedBaseline();
      baseline.source.candidate.record.changed_files = [{
        path: "src/example.ts",
        sha256: sha256(readFileSync(sourcePath)),
        line_ending_neutral_sha256: sha256(readFileSync(sourcePath)),
        deleted: false,
        sources: ["unstaged"],
      }];
      bindBaselineCandidate(baseline);
      writeFileSync(sourcePath, "changed outside bytes\n");

      expect(
        compareComponentRatchet(
          passedReportForRoot(repositoryRoot),
          hiddenUncoveredReduction(),
          baseline,
          repositoryRoot,
        ).map((finding) => finding.code),
      ).toContain("COMPONENT_COVERAGE_REGRESSION");
    } finally {
      rmSync(sourceDirectory, { recursive: true, force: true });
      rmSync(repositoryRoot, { recursive: true, force: true });
      rmSync(outsideRoot, { recursive: true, force: true });
    }
  });

  it("uses the admitted commit for files absent from the candidate inventory", () => {
    const repositoryRoot = mkdtempSync(join(tmpdir(), "component-ratchet-git-"));
    const sourcePath = resolve(repositoryRoot, "src/example.ts");
    mkdirSync(resolve(repositoryRoot, "src"), { recursive: true });
    writeFileSync(sourcePath, "committed bytes\n");
    try {
      execFileSync("git", ["init"], { cwd: repositoryRoot });
      execFileSync("git", ["config", "user.email", "component@example.com"], { cwd: repositoryRoot });
      execFileSync("git", ["config", "user.name", "Component Gate"], { cwd: repositoryRoot });
      execFileSync("git", ["add", "src/example.ts"], { cwd: repositoryRoot });
      execFileSync("git", ["commit", "-m", "baseline"], { cwd: repositoryRoot });
      const commitSha = execFileSync("git", ["rev-parse", "HEAD"], {
        cwd: repositoryRoot,
        encoding: "utf8",
      }).trim();
      const baseline = admittedBaseline();
      baseline.source.candidate.record.commit_sha = commitSha;
      baseline.source.measurement.candidate_commit = commitSha;
      bindBaselineCandidate(baseline);
      const currentReport = passedReportForRoot(repositoryRoot);

      expect(
        compareComponentRatchet(currentReport, hiddenUncoveredReduction(), baseline, repositoryRoot)
          .map((finding) => finding.code),
      ).toContain("COMPONENT_COVERAGE_REGRESSION");

      execFileSync("git", ["update-index", "--chmod=+x", "src/example.ts"], { cwd: repositoryRoot });
      expect(execFileSync("git", ["diff", "--summary", commitSha, "--", "src/example.ts"], {
        cwd: repositoryRoot,
        encoding: "utf8",
      })).toContain("mode change");
      expect(
        compareComponentRatchet(currentReport, hiddenUncoveredReduction(), baseline, repositoryRoot)
          .map((finding) => finding.code),
      ).toContain("COMPONENT_COVERAGE_REGRESSION");

      writeFileSync(sourcePath, "worktree bytes\n");
      expect(
        compareComponentRatchet(currentReport, hiddenUncoveredReduction(), baseline, repositoryRoot),
      ).toEqual([]);
    } finally {
      rmSync(repositoryRoot, { recursive: true, force: true });
    }
  });

  it("fails closed when immutable Git source evidence is missing or unavailable", () => {
    const repositoryRoot = mkdtempSync(join(tmpdir(), "component-ratchet-git-missing-"));
    const sourcePath = resolve(repositoryRoot, "src/example.ts");
    mkdirSync(resolve(repositoryRoot, "src"), { recursive: true });
    writeFileSync(resolve(repositoryRoot, "README.md"), "baseline\n");
    try {
      execFileSync("git", ["init"], { cwd: repositoryRoot });
      execFileSync("git", ["config", "user.email", "component@example.com"], { cwd: repositoryRoot });
      execFileSync("git", ["config", "user.name", "Component Gate"], { cwd: repositoryRoot });
      execFileSync("git", ["add", "README.md"], { cwd: repositoryRoot });
      execFileSync("git", ["commit", "-m", "baseline"], { cwd: repositoryRoot });
      const baselineCommit = execFileSync("git", ["rev-parse", "HEAD"], {
        cwd: repositoryRoot,
        encoding: "utf8",
      }).trim();
      writeFileSync(sourcePath, "current bytes\n");

      for (const commitSha of [baselineCommit, "f".repeat(40)]) {
        const baseline = admittedBaseline();
        baseline.source.candidate.record.commit_sha = commitSha;
        baseline.source.measurement.candidate_commit = commitSha;
        bindBaselineCandidate(baseline);
        expect(
          compareComponentRatchet(
            passedReportForRoot(repositoryRoot),
            hiddenUncoveredReduction(),
            baseline,
            repositoryRoot,
          ).map((finding) => finding.code),
        ).toContain("COMPONENT_COVERAGE_REGRESSION");
      }
    } finally {
      rmSync(repositoryRoot, { recursive: true, force: true });
    }
  });

  it("fails closed when an immutable Git tree references a missing blob", () => {
    const repositoryRoot = mkdtempSync(join(tmpdir(), "component-ratchet-git-missing-blob-"));
    const sourcePath = resolve(repositoryRoot, "src/example.ts");
    mkdirSync(resolve(repositoryRoot, "src"), { recursive: true });
    writeFileSync(sourcePath, "current bytes\n");
    try {
      execFileSync("git", ["init"], { cwd: repositoryRoot });
      execFileSync("git", ["config", "user.email", "component@example.com"], { cwd: repositoryRoot });
      execFileSync("git", ["config", "user.name", "Component Gate"], { cwd: repositoryRoot });
      const missingObjectId = "1".repeat(40);
      execFileSync(
        "git",
        ["update-index", "--add", "--info-only", "--cacheinfo", "100644", missingObjectId, "src/example.ts"],
        { cwd: repositoryRoot },
      );
      const tree = execFileSync("git", ["write-tree", "--missing-ok"], {
        cwd: repositoryRoot,
        encoding: "utf8",
      }).trim();
      const baselineCommit = execFileSync("git", ["commit-tree", tree], {
        cwd: repositoryRoot,
        encoding: "utf8",
        input: "missing blob baseline\n",
      }).trim();

      const baseline = admittedBaseline();
      baseline.source.candidate.record.commit_sha = baselineCommit;
      baseline.source.measurement.candidate_commit = baselineCommit;
      bindBaselineCandidate(baseline);
      expect(
        compareComponentRatchet(
          passedReportForRoot(repositoryRoot),
          hiddenUncoveredReduction(),
          baseline,
          repositoryRoot,
        ).map((finding) => finding.code),
      ).toContain("COMPONENT_COVERAGE_REGRESSION");
    } finally {
      rmSync(repositoryRoot, { recursive: true, force: true });
    }
  });

  it.each(["commit", "blob"] as const)(
    "fails closed for mutable Git %s replacement refs",
    (replacementKind) => {
      const repositoryRoot = mkdtempSync(join(tmpdir(), `component-ratchet-${replacementKind}-replace-`));
      const sourcePath = resolve(repositoryRoot, "src/example.ts");
      mkdirSync(resolve(repositoryRoot, "src"), { recursive: true });
      writeFileSync(sourcePath, "committed bytes\n");
      try {
        execFileSync("git", ["init"], { cwd: repositoryRoot });
        execFileSync("git", ["config", "user.email", "component@example.com"], { cwd: repositoryRoot });
        execFileSync("git", ["config", "user.name", "Component Gate"], { cwd: repositoryRoot });
        execFileSync("git", ["add", "src/example.ts"], { cwd: repositoryRoot });
        execFileSync("git", ["commit", "-m", "baseline"], { cwd: repositoryRoot });
        const baselineCommit = execFileSync("git", ["rev-parse", "HEAD"], {
          cwd: repositoryRoot,
          encoding: "utf8",
        }).trim();
        const baselineBlob = execFileSync("git", ["rev-parse", `${baselineCommit}:src/example.ts`], {
          cwd: repositoryRoot,
          encoding: "utf8",
        }).trim();

        writeFileSync(sourcePath, "replacement bytes\n");
        execFileSync("git", ["add", "src/example.ts"], { cwd: repositoryRoot });
        execFileSync("git", ["commit", "-m", "replacement"], { cwd: repositoryRoot });
        const replacementCommit = execFileSync("git", ["rev-parse", "HEAD"], {
          cwd: repositoryRoot,
          encoding: "utf8",
        }).trim();
        const replacementBlob = execFileSync("git", ["rev-parse", `${replacementCommit}:src/example.ts`], {
          cwd: repositoryRoot,
          encoding: "utf8",
        }).trim();
        execFileSync(
          "git",
          [
            "replace",
            replacementKind === "commit" ? baselineCommit : baselineBlob,
            replacementKind === "commit" ? replacementCommit : replacementBlob,
          ],
          { cwd: repositoryRoot },
        );
        writeFileSync(sourcePath, "committed bytes\n");

        const baseline = admittedBaseline();
        baseline.source.candidate.record.commit_sha = baselineCommit;
        baseline.source.measurement.candidate_commit = baselineCommit;
        bindBaselineCandidate(baseline);

        expect(
          compareComponentRatchet(
            passedReportForRoot(repositoryRoot),
            hiddenUncoveredReduction(),
            baseline,
            repositoryRoot,
          ).map((finding) => finding.code),
        ).toContain("COMPONENT_COVERAGE_REGRESSION");
      } finally {
        rmSync(repositoryRoot, { recursive: true, force: true });
      }
    },
  );

  it("fails closed when an admitted candidate-absent path is a Git symlink", () => {
    const repositoryRoot = mkdtempSync(join(tmpdir(), "component-ratchet-git-symlink-"));
    const sourcePath = resolve(repositoryRoot, "src/example.ts");
    mkdirSync(resolve(repositoryRoot, "src"), { recursive: true });
    writeFileSync(sourcePath, "outside.ts");
    try {
      execFileSync("git", ["init"], { cwd: repositoryRoot });
      execFileSync("git", ["config", "user.email", "component@example.com"], { cwd: repositoryRoot });
      execFileSync("git", ["config", "user.name", "Component Gate"], { cwd: repositoryRoot });
      const objectId = execFileSync("git", ["hash-object", "-w", "src/example.ts"], {
        cwd: repositoryRoot,
        encoding: "utf8",
      }).trim();
      execFileSync("git", ["update-index", "--add", "--cacheinfo", "120000", objectId, "src/example.ts"], {
        cwd: repositoryRoot,
      });
      execFileSync("git", ["commit", "-m", "baseline symlink"], { cwd: repositoryRoot });
      const commitSha = execFileSync("git", ["rev-parse", "HEAD"], {
        cwd: repositoryRoot,
        encoding: "utf8",
      }).trim();
      writeFileSync(sourcePath, "changed target bytes\n");

      const baseline = admittedBaseline();
      baseline.source.candidate.record.commit_sha = commitSha;
      baseline.source.measurement.candidate_commit = commitSha;
      bindBaselineCandidate(baseline);

      expect(
        compareComponentRatchet(
          passedReportForRoot(repositoryRoot),
          hiddenUncoveredReduction(),
          baseline,
          repositoryRoot,
        ).map((finding) => finding.code),
      ).toContain("COMPONENT_COVERAGE_REGRESSION");
    } finally {
      rmSync(repositoryRoot, { recursive: true, force: true });
    }
  });

  it("fails closed when a candidate-absent path traverses a symlinked directory", () => {
    const repositoryRoot = mkdtempSync(join(tmpdir(), "component-ratchet-ancestor-symlink-"));
    const outsideRoot = mkdtempSync(join(tmpdir(), "component-ratchet-outside-"));
    const sourceDirectory = resolve(repositoryRoot, "src");
    const sourcePath = resolve(sourceDirectory, "example.ts");
    mkdirSync(sourceDirectory, { recursive: true });
    writeFileSync(sourcePath, "committed bytes\n");
    try {
      execFileSync("git", ["init"], { cwd: repositoryRoot });
      execFileSync("git", ["config", "user.email", "component@example.com"], { cwd: repositoryRoot });
      execFileSync("git", ["config", "user.name", "Component Gate"], { cwd: repositoryRoot });
      execFileSync("git", ["add", "src/example.ts"], { cwd: repositoryRoot });
      execFileSync("git", ["commit", "-m", "baseline file"], { cwd: repositoryRoot });
      const commitSha = execFileSync("git", ["rev-parse", "HEAD"], {
        cwd: repositoryRoot,
        encoding: "utf8",
      }).trim();

      rmSync(sourceDirectory, { recursive: true, force: true });
      writeFileSync(resolve(outsideRoot, "example.ts"), "changed outside bytes\n");
      symlinkSync(outsideRoot, sourceDirectory, process.platform === "win32" ? "junction" : "dir");
      expect(readFileSync(sourcePath, "utf8")).toBe("changed outside bytes\n");

      const baseline = admittedBaseline();
      baseline.source.candidate.record.commit_sha = commitSha;
      baseline.source.measurement.candidate_commit = commitSha;
      bindBaselineCandidate(baseline);

      expect(
        compareComponentRatchet(
          passedReportForRoot(repositoryRoot),
          hiddenUncoveredReduction(),
          baseline,
          repositoryRoot,
        ).map((finding) => finding.code),
      ).toContain("COMPONENT_COVERAGE_REGRESSION");
    } finally {
      rmSync(sourceDirectory, { recursive: true, force: true });
      rmSync(repositoryRoot, { recursive: true, force: true });
      rmSync(outsideRoot, { recursive: true, force: true });
    }
  });

  it("fails closed for clean-filter and mutable-config-only line ending differences", () => {
    const repositoryRoot = mkdtempSync(join(tmpdir(), "component-ratchet-autocrlf-"));
    const sourcePath = resolve(repositoryRoot, "src/example.ts");
    mkdirSync(resolve(repositoryRoot, "src"), { recursive: true });
    writeFileSync(sourcePath, "committed bytes\n");
    try {
      execFileSync("git", ["init"], { cwd: repositoryRoot });
      execFileSync("git", ["config", "user.email", "component@example.com"], { cwd: repositoryRoot });
      execFileSync("git", ["config", "user.name", "Component Gate"], { cwd: repositoryRoot });
      execFileSync("git", ["config", "core.autocrlf", "true"], { cwd: repositoryRoot });
      execFileSync("git", ["add", "src/example.ts"], { cwd: repositoryRoot });
      execFileSync("git", ["commit", "-m", "baseline"], { cwd: repositoryRoot });
      const commitSha = execFileSync("git", ["rev-parse", "HEAD"], {
        cwd: repositoryRoot,
        encoding: "utf8",
      }).trim();
      rmSync(sourcePath);
      execFileSync("git", ["checkout", "--", "src/example.ts"], { cwd: repositoryRoot });
      const committedBytes = execFileSync("git", ["show", `${commitSha}:src/example.ts`], { cwd: repositoryRoot });
      expect(readFileSync(sourcePath).equals(committedBytes)).toBe(false);
      const admittedObjectId = execFileSync("git", ["rev-parse", `${commitSha}:src/example.ts`], {
        cwd: repositoryRoot,
        encoding: "utf8",
      }).trim();
      const currentObjectId = execFileSync("git", ["hash-object", "--path=src/example.ts", "--", "src/example.ts"], {
        cwd: repositoryRoot,
        encoding: "utf8",
      }).trim();
      expect(currentObjectId).toBe(admittedObjectId);
      execFileSync("git", ["config", "core.autocrlf", "false"], { cwd: repositoryRoot });
      const configDriftObjectId = execFileSync(
        "git",
        ["hash-object", "--path=src/example.ts", "--", "src/example.ts"],
        { cwd: repositoryRoot, encoding: "utf8" },
      ).trim();
      expect(configDriftObjectId).not.toBe(admittedObjectId);

      const baseline = admittedBaseline();
      baseline.source.candidate.record.commit_sha = commitSha;
      baseline.source.measurement.candidate_commit = commitSha;
      bindBaselineCandidate(baseline);
      expect(
        compareComponentRatchet(
          passedReportForRoot(repositoryRoot),
          hiddenUncoveredReduction(),
          baseline,
          repositoryRoot,
        ).map((finding) => finding.code),
      ).toContain("COMPONENT_COVERAGE_REGRESSION");

      writeFileSync(sourcePath, "changed bytes\r\n");
      expect(
        compareComponentRatchet(
          passedReportForRoot(repositoryRoot),
          hiddenUncoveredReduction(),
          baseline,
          repositoryRoot,
        ),
      ).toEqual([]);
    } finally {
      rmSync(repositoryRoot, { recursive: true, force: true });
    }
  });

  it("fails closed when source-change evidence is invalid or unavailable", () => {
    const repositoryRoot = mkdtempSync(join(tmpdir(), "component-ratchet-closed-"));
    try {
      const currentReport = passedReportForRoot(repositoryRoot);
      for (const changedFile of [
        { path: "src/example.ts", sha256: "f".repeat(64), deleted: true, sources: ["unstaged"] as const },
        { path: "src/example.ts", sha256: "f".repeat(64), deleted: false, sources: ["unstaged"] as const },
      ]) {
        const baseline = admittedBaseline();
        baseline.source.candidate.record.changed_files = [{ ...changedFile, sources: [...changedFile.sources] }];
        bindBaselineCandidate(baseline);
        expect(
          compareComponentRatchet(currentReport, hiddenUncoveredReduction(), baseline, repositoryRoot)
            .map((finding) => finding.code),
        ).toContain("COMPONENT_COVERAGE_REGRESSION");
      }

      const invalidPathBaseline = admittedBaseline();
      invalidPathBaseline.coverage["../outside.ts"] = invalidPathBaseline.coverage["src/example.ts"]!;
      delete invalidPathBaseline.coverage["src/example.ts"];
      const invalidPathCoverage = hiddenUncoveredReduction();
      invalidPathCoverage["../outside.ts"] = invalidPathCoverage["src/example.ts"]!;
      delete invalidPathCoverage["src/example.ts"];
      expect(
        compareComponentRatchet(currentReport, invalidPathCoverage, invalidPathBaseline, repositoryRoot)
          .map((finding) => finding.code),
      ).toContain("COMPONENT_COVERAGE_REGRESSION");
    } finally {
      rmSync(repositoryRoot, { recursive: true, force: true });
    }
  });

  it("does not let existing-file improvements hide uncovered debt in a newly reported file", () => {
    const baseline = admittedBaseline();
    const current = coverage(81);
    const newFileValue = { total: 1, covered: 0, skipped: 0, pct: 0 };
    current["src/new-file.ts"] = {
      statements: newFileValue,
      branches: newFileValue,
      functions: newFileValue,
      lines: newFileValue,
    };
    const aggregateValue = { total: 101, covered: 81, skipped: 0, pct: 80.19 };
    current.total = {
      statements: aggregateValue,
      branches: aggregateValue,
      functions: aggregateValue,
      lines: aggregateValue,
    };

    expect(compareComponentRatchet(report("passed"), current, baseline, root).map((finding) => finding.code))
      .toContain("COMPONENT_COVERAGE_REGRESSION");
  });

  it("allows a newly reported file when every reported metric is fully covered", () => {
    const baseline = admittedBaseline();
    const current = coverage(80);
    const newFileValue = { total: 1, covered: 1, skipped: 0, pct: 100 };
    current["src/new-file.ts"] = {
      statements: newFileValue,
      branches: newFileValue,
      functions: newFileValue,
      lines: newFileValue,
    };
    const aggregateValue = { total: 101, covered: 81, skipped: 0, pct: 80.19 };
    current.total = {
      statements: aggregateValue,
      branches: aggregateValue,
      functions: aggregateValue,
      lines: aggregateValue,
    };

    expect(compareComponentRatchet(report("passed"), current, baseline, root)).toEqual([]);
  });

  it("rejects swapped failures, skips, collection errors, and coverage regressions", () => {
    const baseline = admittedBaseline();
    const swapped = report("failed", "received 2 instead of 1");
    expect(
      compareComponentRatchet(swapped, coverage(79), baseline, root).map(
        (finding) => finding.code,
      ),
    ).toEqual(
      expect.arrayContaining([
        "COMPONENT_FAILURE_NEW_OR_SWAPPED",
        "COMPONENT_COVERAGE_REGRESSION",
      ]),
    );
    expect(
      compareComponentRatchet(report("pending"), coverage(80), baseline, root).map(
        (finding) => finding.code,
      ),
    ).toContain("COMPONENT_TEST_SKIPPED");

    const collection: VitestJsonReport = {
      success: false,
      numTotalTestSuites: 1,
      numPassedTestSuites: 0,
      numFailedTestSuites: 1,
      numPendingTestSuites: 0,
      numTotalTests: 0,
      numPassedTests: 0,
      numFailedTests: 0,
      numPendingTests: 0,
      numTodoTests: 0,
      testResults: [
        {
          name: "/repo/tests/vitest/example.test.tsx",
          status: "failed",
          message: "Failed to import source module",
          assertionResults: [],
        },
      ],
    };
    expect(
      compareComponentRatchet(collection, coverage(80), baseline, root).map(
        (finding) => finding.code,
      ),
    ).toEqual(
      expect.arrayContaining([
        "COMPONENT_COLLECTION_FAILURE",
        "COMPONENT_TEST_COUNT_REGRESSION",
      ]),
    );
  });

  it.each([
    ["null total", { total: null }],
    ["array total", { total: [] }],
    ["missing metric", { total: { statements: coverageValue(100), branches: coverageValue(100), functions: coverageValue(100) } }],
    ["null metric", { total: { statements: null, branches: coverageValue(100), functions: coverageValue(100), lines: coverageValue(100) } }],
    ["nonnumeric pct", { total: { statements: { ...coverageValue(100), pct: "100" }, branches: coverageValue(100), functions: coverageValue(100), lines: coverageValue(100) } }],
    ["nonfinite pct", { total: { statements: { ...coverageValue(100), pct: Number.NaN }, branches: coverageValue(100), functions: coverageValue(100), lines: coverageValue(100) } }],
    ["negative counter", { total: { statements: { ...coverageValue(100), covered: -1 }, branches: coverageValue(100), functions: coverageValue(100), lines: coverageValue(100) } }],
    ["pct over 100", { total: { statements: { ...coverageValue(100), pct: 101 }, branches: coverageValue(100), functions: coverageValue(100), lines: coverageValue(100) } }],
    ["pct contradicts counters", { total: { statements: { ...coverageValue(100), covered: 0 }, branches: coverageValue(100), functions: coverageValue(100), lines: coverageValue(100) } }],
    ["covered exceeds total", { total: { statements: { ...coverageValue(100), total: 50, covered: 51 }, branches: coverageValue(100), functions: coverageValue(100), lines: coverageValue(100) } }],
    ["covered plus skipped exceeds total", { total: { statements: { ...coverageValue(100), covered: 80, skipped: 21 }, branches: coverageValue(100), functions: coverageValue(100), lines: coverageValue(100) } }],
  ])("returns a structured finding for malformed current coverage: %s", (_label, malformed) => {
    const baseline = admittedBaseline();
    expect(() => compareComponentRatchet(report("failed"), malformed as CoverageSummary, baseline, root)).not.toThrow();
    expect(compareComponentRatchet(report("failed"), malformed as CoverageSummary, baseline, root).map((finding) => finding.code)).toContain("COMPONENT_COVERAGE_MALFORMED");
  });

  it("rejects malformed nested baseline coverage before ratchet comparison", () => {
    const baseline = admittedBaseline();
    (baseline as unknown as { coverage: unknown }).coverage = { total: { statements: null } };
    expect(() => validateComponentBaseline(baseline)).not.toThrow();
    expect(validateComponentBaseline(baseline).map((finding) => finding.code)).toContain("COMPONENT_BASELINE_SHAPE_MALFORMED");
  });

  it("accepts Vitest branchesTrue coverage while rejecting malformed extensions", () => {
    const baseline = admittedBaseline();
    const branchesTrue = { total: 0, covered: 0, skipped: 0, pct: 100 };
    (baseline.coverage.total as unknown as Record<string, unknown>).branchesTrue = branchesTrue;

    expect(validateComponentBaseline(baseline)).toEqual([]);
    expect(compareComponentRatchet(report("passed"), baseline.coverage, baseline, root)).toEqual([]);

    (baseline.coverage.total as unknown as Record<string, unknown>).branchesTrue = { ...branchesTrue, covered: 1 };
    expect(validateComponentBaseline(baseline).map((finding) => finding.code)).toContain("COMPONENT_BASELINE_SHAPE_MALFORMED");
  });

  it("never admits critical, infrastructure, expired, or non-independent debt", () => {
    const baseline = admittedBaseline();
    baseline.allowed_failures[0] = {
      ...baseline.allowed_failures[0]!,
      kind: "collection_failure" as "test_failure",
      expires_at: "2020-01-01T00:00:00.000Z",
      security_reviewer: "quality-reviewer",
    };
    expect(validateComponentBaseline(baseline).map((finding) => finding.code)).toContain(
      "COMPONENT_BASELINE_ILLEGAL_DEBT",
    );
  });
});

describe("Q3 raw component lane", () => {
  it("requires a fully green unskipped report", () => {
    expect(evaluateRawGreenComponentRun(report("passed"), root)).toEqual([]);
    expect(
      evaluateRawGreenComponentRun(report("failed"), root).map((finding) => finding.code),
    ).toEqual(expect.arrayContaining(["COMPONENT_TEST_FAILED", "COMPONENT_RUN_NOT_GREEN"]));
    expect(
      evaluateRawGreenComponentRun(report("pending"), root).map((finding) => finding.code),
    ).toContain("COMPONENT_TEST_SKIPPED");
  });
});
