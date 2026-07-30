import { readFileSync } from "node:fs";
import { resolve } from "node:path";
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
  type ComponentBaseline,
  type ComponentEvidenceMap,
  type CoverageSummary,
  type VitestJsonReport,
} from "../../../scripts/quality/component-core";
import { candidateDigest, type CandidateRecord } from "../../../scripts/quality/candidate-core";

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

  it("allows covered-statement denominator jitter without masking uncovered debt", () => {
    const baseline = admittedBaseline();
    const jitter = coverage(80);
    const jitterValue = { total: 99, covered: 79, skipped: 0, pct: 79.79 };
    jitter.total.statements = jitterValue;
    jitter["src/example.ts"]!.statements = jitterValue;
    expect(compareComponentRatchet(report("passed"), jitter, baseline, root)).toEqual([]);

    const hiddenUncovered = coverage(80);
    const hiddenValue = { total: 99, covered: 80, skipped: 0, pct: 80.8 };
    hiddenUncovered.total.statements = hiddenValue;
    hiddenUncovered["src/example.ts"]!.statements = hiddenValue;
    expect(compareComponentRatchet(report("passed"), hiddenUncovered, baseline, root).map((finding) => finding.code))
      .toContain("COMPONENT_COVERAGE_REGRESSION");
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
