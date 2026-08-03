import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  COMPONENT_BASELINE_MEASUREMENT_COMMAND,
  admittedInventoryIdentities,
  baselineInventoryAuthorIds,
  baselineMatchesOnlyTrackedBootstrapAdmission,
  candidateFileIsNormalized,
  candidateRecordIsNormalized,
  canonicalVitestFileIdentity,
  canonicalBaselineArtifacts,
  componentCoverageFileRegressions,
  componentSourceChangedSinceBaseline,
  cleanFilteredSourceChangedSinceCommit,
  compareComponentRatchet,
  coverageAggregateMatchesFiles,
  coverageCountersAreComplete,
  coverageSummaryIsComplete,
  coverageValueIsComplete,
  evaluateRawGreenComponentRun,
  findComponentCoverageRegressions,
  findComponentTestCountRegression,
  findNewComponentFailures,
  findRemovedComponentTestFiles,
  generationBindingsAreStructured,
  globMatches,
  identitySetsMatch,
  inventoryIsAdmitted,
  isNonnegativeInteger,
  normalizeComponentCoveragePaths,
  normalizeVitestFailures,
  normalizedSignature,
  normalizedIdentityList,
  optionalCandidateIsStructured,
  optionalMeasurementIsStructured,
  parseBaselineReviewDecision,
  parseGenerationBindings,
  parseOptionalGenerationJson,
  readGitBlob,
  readGitOutput,
  readImmutableGitFile,
  readRegularGitBlobObjectId,
  regularGitBlobObjectId,
  regularGitBlobObjectIdFromCommand,
  runtimeInventoryIsStructured,
  structuredRuntimeInventory,
  selectStrictComponentTests,
  singleNullTerminatedRecord,
  validateCanonicalBaselineSchema,
  validateCanonicalBaselineArtifacts,
  validateCanonicalGenerationBindings,
  validateGenerationByteBindings,
  validateGenerationCandidateBinding,
  validateGenerationMeasurementBinding,
  validateBaselineArtifactHashes,
  validateBaselineInventory,
  validateBaselineInventorySourceBinding,
  validateBaselineReviews,
  validateBaselineValidationArtifact,
  validateBootstrapPredecessor,
  validateComponentBaseline,
  validateComponentProfileSelection,
  validateEstablishedPredecessor,
  validateEmbeddedBaselineCoverage,
  validateEmbeddedBaselineLineage,
  validateImmutablePredecessorAdmission,
  validateOneBaselineReview,
  validateSuccessorCoverageDenominators,
  validateRetainedMeasurement,
  validateVitestFailureState,
  validateVitestReportConsistency,
  validationApprovesInventory,
  vitestFileNameIsNormalized,
  readBaselineReviews,
  transientMeasurementOrigin,
  newCoverageFileMetricRegression,
  existingCoverageFileMetricRegression,
  type BaselineInventory,
  type BaselineValidation,
  type ComponentBaseline,
  type ComponentEvidenceMap,
  type CoverageSummary,
  type ParsedGenerationBindings,
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
const malformedVitestFinding = (message: string) => ({
  code: "COMPONENT_REPORT_MALFORMED",
  message,
});

function runTestGit(repositoryRoot: string, args: string[]): string {
  return execFileSync("git", args, {
    cwd: repositoryRoot,
    encoding: "utf8",
  }).trim();
}

function initializeTestGit(repositoryRoot: string): void {
  runTestGit(repositoryRoot, ["init", "-q"]);
  runTestGit(repositoryRoot, ["config", "user.email", "component@example.test"]);
  runTestGit(repositoryRoot, ["config", "user.name", "Component Test"]);
  runTestGit(repositoryRoot, ["config", "core.autocrlf", "false"]);
}

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
        comparison_base: structuredClone(candidateRecord.comparison_base),
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

function retainedInventory(baseline = admittedBaseline()): BaselineInventory {
  const candidate = baseline.source.candidate;
  return {
    schema_version: 1,
    admission: {
      phase: "admission",
      status: "review_pending",
      bootstrap: true,
      author_ids: ["author"],
    },
    source: {
      command: COMPONENT_BASELINE_MEASUREMENT_COMMAND,
      commit: candidate.record.commit_sha,
      measurement_artifact: ".tmp/component-measurement.json",
      measurement_sha256: "e".repeat(64),
      artifact: baseline.source.report,
      artifact_sha256: baseline.source.report_sha256,
      coverage_artifact: baseline.source.coverage,
      coverage_sha256: baseline.source.coverage_sha256,
      candidate_artifact: ".tmp/candidate.json",
      candidate_sha256: "d".repeat(64),
      candidate_digest: candidate.digest,
      measurement: {
        schema_version: 1,
        integrity_status: "PASS",
        command: COMPONENT_BASELINE_MEASUREMENT_COMMAND,
        duration_ms: 0,
        exit_status: 0,
        candidate: {
          artifact: ".tmp/candidate.json",
          artifact_sha256: "d".repeat(64),
          inner_sha256: candidate.digest,
          commit_sha: candidate.record.commit_sha,
          comparison_base: structuredClone(candidate.record.comparison_base),
          profile: candidate.record.profile,
        },
        report: {
          artifact: ".tmp/source.vitest.json",
          sha256: baseline.source.report_sha256,
        },
        coverage: {
          artifact: ".tmp/coverage-summary.json",
          sha256: baseline.source.coverage_sha256,
        },
      },
    },
    records: [],
  };
}

function admittedValidation(
  inventory: BaselineInventory,
  inventorySha: string,
): BaselineValidation {
  return {
    status: "PASS",
    data: {
      phase: "admission",
      inventory_sha256: inventorySha,
      candidate_digest: inventory.source!.candidate_digest,
      author_ids: structuredClone(inventory.admission!.author_ids),
      review_source: "local-agent",
      reviewer_identity_assurance: "asserted-local",
      author_identity_assurance: "asserted-local",
      bootstrap: inventory.admission!.bootstrap,
      predecessor_baseline_sha256: inventory.admission!.bootstrap
        ? null
        : "f".repeat(64),
    },
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
    const matches = [
      ["src/components/Button.tsx", "src/components/**/*.tsx"],
      ["src/components/forms/Button.tsx", "src/components/**/*.tsx"],
      ["src/a.ts", "src/**"],
      ["src/a/b.ts", "src/**"],
      ["src/a.ts", "src/*.ts"],
      ["src\\components\\Button.tsx", "src/components/**/*.tsx"],
      ["src/a+b.ts", "src/a+b.ts"],
      ["src/[a].ts", "src/[a].ts"],
      ["", ""],
    ] as const;
    const misses = [
      ["src/components/forms/Button.tsx", "src/components/*.tsx"],
      ["src/a.js", "src/*.ts"],
      ["src/axb.ts", "src/a+b.ts"],
      ["src/a.ts", "src/[a].ts"],
      ["a", ""],
    ] as const;
    for (const [path, pattern] of matches) expect(globMatches(path, pattern)).toBe(true);
    for (const [path, pattern] of misses) expect(globMatches(path, pattern)).toBe(false);
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
    expect(selected).toEqual({
      tests: [],
      componentFiles: ["src/components/Button.tsx"],
      findings: [
        {
          code: "COMPONENT_MAPPING_MISSING",
          message: "Component-relevant path src/components/Button.tsx has no affected-test mapping",
          path: "src/components/Button.tsx",
        },
        {
          code: "CRITICAL_COMPONENT_MAPPING_MISSING",
          message: "Affected critical capability CAP-UNKNOWN has no component-test mapping",
        },
      ],
    });

    expect(
      selectStrictComponentTests(
        ["src/components/Button.tsx"],
        [],
        [],
        evidenceMap,
      ),
    ).toEqual({
      tests: [],
      componentFiles: ["src/components/Button.tsx"],
      findings: [
        {
          code: "COMPONENT_MAPPING_EMPTY",
          message: "Component-relevant path src/components/Button.tsx maps to no collected test file",
          path: "src/components/Button.tsx",
        },
      ],
    });
    expect(selectStrictComponentTests([], ["CAP-AUTH"], [], evidenceMap)).toEqual({
      tests: [],
      componentFiles: [],
      findings: [
        {
          code: "CRITICAL_COMPONENT_MAPPING_EMPTY",
          message: "Affected critical capability CAP-AUTH maps to no collected test file",
        },
      ],
    });
    expect(
      selectStrictComponentTests([], ["CAP-Z", "CAP-A", "CAP-Z"], [], evidenceMap),
    ).toEqual({
      tests: [],
      componentFiles: [],
      findings: [
        {
          code: "CRITICAL_COMPONENT_MAPPING_MISSING",
          message: "Affected critical capability CAP-A has no component-test mapping",
        },
        {
          code: "CRITICAL_COMPONENT_MAPPING_MISSING",
          message: "Affected critical capability CAP-Z has no component-test mapping",
        },
      ],
    });
  });

  it("deduplicates and sorts selection while honoring any matching pattern", () => {
    const richEvidenceMap: ComponentEvidenceMap = {
      schema_version: 1,
      component_scope_patterns: ["src/widgets/**/*.tsx", "src/components/**/*.tsx"],
      affected_rules: [
        {
          id: "MATCHING",
          source_patterns: ["src/never/**/*.tsx", "src/components/**/*.tsx"],
          test_patterns: ["tests/vitest/missing/**/*.test.tsx", "tests/vitest/ui/**/*.test.tsx"],
        },
        {
          id: "NONMATCHING",
          source_patterns: ["src/other/**/*.tsx"],
          test_patterns: ["tests/vitest/other/**/*.test.tsx"],
        },
      ],
      critical_capabilities: {
        "CAP-AUTH": [
          "tests/vitest/missing/**/*.test.tsx",
          "tests/vitest/auth/**/*.test.tsx",
        ],
      },
    };
    expect(
      selectStrictComponentTests(
        [
          "src/components/Zed.tsx",
          "src/server/ignored.ts",
          "src/components/Alpha.tsx",
          "src/components/Zed.tsx",
        ],
        ["CAP-AUTH", "CAP-AUTH"],
        [
          "tests/vitest/ui/zed.test.tsx",
          "tests/vitest/other/forbidden.test.tsx",
          "tests/vitest/auth/session.test.tsx",
          "tests/vitest/ui/alpha.test.tsx",
        ],
        richEvidenceMap,
      ),
    ).toEqual({
      componentFiles: ["src/components/Alpha.tsx", "src/components/Zed.tsx"],
      findings: [],
      tests: [
        "tests/vitest/auth/session.test.tsx",
        "tests/vitest/ui/alpha.test.tsx",
        "tests/vitest/ui/zed.test.tsx",
      ],
    });
  });

  it("rejects a component-profile downgrade", () => {
    expect(validateComponentProfileSelection("Q1_CHANGE_GATE", "Q2_CRITICAL_CHANGE_GATE")).toEqual([
      {
        code: "COMPONENT_PROFILE_DOWNGRADE",
        message: "Requested Q1_CHANGE_GATE is weaker than classified Q2_CRITICAL_CHANGE_GATE",
      },
    ]);
    expect(
      validateComponentProfileSelection("Q3_RELEASE_GATE", "Q2_CRITICAL_CHANGE_GATE"),
    ).toEqual([]);
    expect(
      validateComponentProfileSelection("Q2_CRITICAL_CHANGE_GATE", "Q2_CRITICAL_CHANGE_GATE"),
    ).toEqual([]);
    expect(validateComponentProfileSelection(undefined, "Q2_CRITICAL_CHANGE_GATE")).toEqual([]);
    expect(validateComponentProfileSelection("Q2_CRITICAL_CHANGE_GATE", undefined)).toEqual([]);
    expect(validateComponentProfileSelection(undefined, undefined)).toEqual([]);
  });

  it("reports every canonical baseline schema error with stable root paths", () => {
    expect(COMPONENT_BASELINE_MEASUREMENT_COMMAND).toBe(
      "bun x vitest run --maxWorkers=1 --coverage --coverage.reportOnFailure=true --reporter=json",
    );
    expect(validateCanonicalBaselineSchema(admittedBaseline())).toEqual([]);
    expect(validateCanonicalBaselineSchema(null)).toEqual([
      {
        code: "COMPONENT_BASELINE_SCHEMA_INVALID",
        message: "/ must be object",
      },
    ]);
    expect(validateCanonicalBaselineSchema({})).toEqual([
      "schema_version",
      "status",
      "source",
      "admission",
      "suite",
      "allowed_failures",
      "coverage",
    ].map((property) => ({
      code: "COMPONENT_BASELINE_SCHEMA_INVALID",
      message: `/ must have required property '${property}'`,
    })));
  });
});

describe("component failure normalization and ratchet", () => {
  it("validates coverage counter primitives and exact metric keys", () => {
    expect([
      [0, true],
      [1, true],
      [-1, false],
      [0.5, false],
      [Number.NaN, false],
      [Number.POSITIVE_INFINITY, false],
      ["1", false],
      [null, false],
    ].map(([value]) => isNonnegativeInteger(value))).toEqual([
      true,
      true,
      false,
      false,
      false,
      false,
      false,
      false,
    ]);

    const complete = { total: 3, covered: 1, skipped: 1, pct: 33.33 };
    expect(coverageCountersAreComplete(complete)).toBe(true);
    for (const malformed of [
      { ...complete, total: -1 },
      { ...complete, total: 3.5 },
      { ...complete, covered: -1 },
      { ...complete, covered: 4 },
      { ...complete, skipped: -1 },
      { ...complete, skipped: 4 },
      { ...complete, covered: 2, skipped: 2 },
      { ...complete, pct: "33.33" },
      { ...complete, pct: Number.NaN },
      { ...complete, pct: Number.POSITIVE_INFINITY },
    ]) {
      expect(coverageCountersAreComplete(malformed)).toBe(false);
    }

    expect(coverageValueIsComplete(complete)).toBe(true);
    expect(coverageValueIsComplete({ total: 0, covered: 0, skipped: 0, pct: 100 })).toBe(true);
    expect(coverageValueIsComplete({ total: 3, covered: 1, skipped: 1, pct: 33.34 })).toBe(false);
    expect(coverageValueIsComplete({ ...complete, total: -1 })).toBe(false);
    expect(coverageValueIsComplete({ ...complete, covered: -1 })).toBe(false);
    expect(coverageValueIsComplete({ ...complete, skipped: -1 })).toBe(false);
    expect(coverageValueIsComplete({ ...complete, covered: 2, skipped: 2 })).toBe(false);
    expect(coverageValueIsComplete({ ...complete, pct: "33.33" })).toBe(false);
    expect(coverageValueIsComplete(null)).toBe(false);
    expect(coverageValueIsComplete([])).toBe(false);
    expect(coverageValueIsComplete({ ...complete, extra: 1 })).toBe(false);
    expect(coverageValueIsComplete({ total: 3, covered: 1, skipped: 1 })).toBe(false);
    const inheritedTotal = Object.assign(Object.create({ total: 3 }), {
      covered: 1,
      skipped: 1,
      pct: 33.33,
      extra: 0,
    });
    expect(coverageValueIsComplete(inheritedTotal)).toBe(false);
  });

  it("requires complete coverage metrics for every aggregate and file entry", () => {
    const complete = coverage(80);
    expect(coverageSummaryIsComplete(complete)).toBe(true);
    expect(coverageSummaryIsComplete(null)).toBe(false);
    expect(coverageSummaryIsComplete([])).toBe(false);
    expect(coverageSummaryIsComplete({ total: null })).toBe(false);
    expect(coverageSummaryIsComplete({ total: complete.total, "src/invalid.ts": null })).toBe(false);

    for (const metric of ["statements", "branches", "functions", "lines"] as const) {
      const missing = structuredClone(complete) as unknown as Record<string, Record<string, unknown>>;
      delete missing["src/example.ts"]![metric];
      expect(coverageSummaryIsComplete(missing)).toBe(false);
    }

    const unknownMetric = structuredClone(complete) as unknown as Record<string, Record<string, unknown>>;
    unknownMetric["src/example.ts"]!.unknown = coverageValue(80);
    expect(coverageSummaryIsComplete(unknownMetric)).toBe(false);

    const validBranchesTrue = structuredClone(complete) as CoverageSummary &
      Record<string, { branchesTrue?: ReturnType<typeof coverageValue> }>;
    validBranchesTrue.total.branchesTrue = { total: 2, covered: 1, skipped: 1, pct: 50 };
    validBranchesTrue["src/example.ts"]!.branchesTrue = { total: 2, covered: 1, skipped: 1, pct: 50 };
    expect(coverageSummaryIsComplete(validBranchesTrue)).toBe(true);
    validBranchesTrue["src/example.ts"]!.branchesTrue = { total: 2, covered: 1, skipped: 1, pct: 51 };
    expect(coverageSummaryIsComplete(validBranchesTrue)).toBe(false);
  });

  it("matches every standard aggregate counter across multiple files", () => {
    const first = {
      statements: { total: 3, covered: 1, skipped: 1, pct: 33.33 },
      branches: { total: 4, covered: 2, skipped: 1, pct: 50 },
      functions: { total: 5, covered: 3, skipped: 1, pct: 60 },
      lines: { total: 6, covered: 4, skipped: 1, pct: 66.66 },
    };
    const second = {
      statements: { total: 7, covered: 5, skipped: 1, pct: 71.42 },
      branches: { total: 8, covered: 6, skipped: 1, pct: 75 },
      functions: { total: 9, covered: 7, skipped: 1, pct: 77.77 },
      lines: { total: 10, covered: 8, skipped: 1, pct: 80 },
    };
    const aggregate = {
      statements: { total: 10, covered: 6, skipped: 2, pct: 60 },
      branches: { total: 12, covered: 8, skipped: 2, pct: 66.66 },
      functions: { total: 14, covered: 10, skipped: 2, pct: 71.42 },
      lines: { total: 16, covered: 12, skipped: 2, pct: 75 },
    };
    const complete: CoverageSummary = { total: aggregate, "src/first.ts": first, "src/second.ts": second };
    expect(coverageAggregateMatchesFiles(complete)).toBe(true);

    for (const metric of ["statements", "branches", "functions", "lines"] as const) {
      for (const counter of ["total", "covered", "skipped"] as const) {
        const mismatch = structuredClone(complete);
        mismatch.total[metric][counter] += 1;
        expect(coverageAggregateMatchesFiles(mismatch)).toBe(false);
      }
    }

    const zero = { total: 0, covered: 0, skipped: 0, pct: 100 };
    const aggregateOnly: CoverageSummary = {
      total: { statements: { ...zero }, branches: { ...zero }, functions: { ...zero }, lines: { ...zero } },
    };
    expect(coverageAggregateMatchesFiles(aggregateOnly)).toBe(true);
    for (const metric of ["statements", "branches", "functions", "lines"] as const) {
      for (const counter of ["total", "covered", "skipped"] as const) {
        const mismatch = structuredClone(aggregateOnly);
        mismatch.total[metric][counter] = 1;
        expect(coverageAggregateMatchesFiles(mismatch)).toBe(false);
      }
    }
  });

  it("matches optional branchesTrue aggregates exactly", () => {
    type ExtendedCoverage = CoverageSummary & Record<string, { branchesTrue?: ReturnType<typeof coverageValue> }>;
    const withoutExtension = coverage(80) as ExtendedCoverage;
    expect(coverageAggregateMatchesFiles(withoutExtension)).toBe(true);

    const fileOnly = structuredClone(withoutExtension);
    fileOnly["src/example.ts"]!.branchesTrue = { total: 2, covered: 1, skipped: 1, pct: 50 };
    expect(coverageAggregateMatchesFiles(fileOnly)).toBe(false);

    const totalOnlyZero = structuredClone(withoutExtension);
    totalOnlyZero.total.branchesTrue = { total: 0, covered: 0, skipped: 0, pct: 100 };
    expect(coverageAggregateMatchesFiles(totalOnlyZero)).toBe(true);
    for (const counter of ["total", "covered", "skipped"] as const) {
      const nonzero = structuredClone(totalOnlyZero);
      nonzero.total.branchesTrue![counter] = 1;
      expect(coverageAggregateMatchesFiles(nonzero)).toBe(false);
    }

    const partial = structuredClone(withoutExtension);
    partial.total.branchesTrue = { total: 1, covered: 1, skipped: 0, pct: 100 };
    partial["src/example.ts"]!.branchesTrue = { total: 1, covered: 1, skipped: 0, pct: 100 };
    partial["src/second.ts"] = {
      statements: { total: 0, covered: 0, skipped: 0, pct: 100 },
      branches: { total: 0, covered: 0, skipped: 0, pct: 100 },
      functions: { total: 0, covered: 0, skipped: 0, pct: 100 },
      lines: { total: 0, covered: 0, skipped: 0, pct: 100 },
    };
    expect(coverageAggregateMatchesFiles(partial)).toBe(false);

    const complete = structuredClone(partial);
    complete.total.branchesTrue = { total: 2, covered: 1, skipped: 1, pct: 50 };
    complete["src/second.ts"]!.branchesTrue = { total: 1, covered: 0, skipped: 1, pct: 0 };
    expect(coverageAggregateMatchesFiles(complete)).toBe(true);
    for (const counter of ["total", "covered", "skipped"] as const) {
      const mismatch = structuredClone(complete);
      mismatch.total.branchesTrue![counter] += 1;
      expect(coverageAggregateMatchesFiles(mismatch)).toBe(false);
    }
  });

  it("rejects malformed Vitest envelopes and headers with exact findings", () => {
    const envelopeFinding = malformedVitestFinding(
      "Vitest report must contain boolean success and a testResults array",
    );
    for (const malformed of [
      null,
      {},
      { success: true },
      { success: "true", testResults: [] },
      { success: true, testResults: {} },
    ]) {
      expect(
        validateVitestReportConsistency(malformed as unknown as VitestJsonReport, root),
      ).toEqual([envelopeFinding]);
    }

    const counterNames = [
      "numTotalTestSuites",
      "numPassedTestSuites",
      "numFailedTestSuites",
      "numPendingTestSuites",
      "numTotalTests",
      "numPassedTests",
      "numFailedTests",
      "numPendingTests",
      "numTodoTests",
    ] as const;
    for (const name of counterNames) {
      const malformed = report();
      malformed[name] = -1;
      expect(validateVitestReportConsistency(malformed, root)).toEqual([
        malformedVitestFinding(`Vitest report ${name} must be a nonnegative integer`),
      ]);
    }

    const fractional = report();
    fractional.numTotalTests = 0.5;
    expect(validateVitestReportConsistency(fractional, root)).toEqual([
      malformedVitestFinding("Vitest report numTotalTests must be a nonnegative integer"),
    ]);

    const invalidUnhandled = report();
    invalidUnhandled.unhandledErrors = {} as unknown[];
    expect(validateVitestReportConsistency(invalidUnhandled, root)).toEqual([
      malformedVitestFinding("Vitest report unhandledErrors must be an array when present"),
    ]);

    const earlyHeaderReturn = report();
    earlyHeaderReturn.numTotalTests = -1;
    earlyHeaderReturn.testResults![0]!.name = "";
    expect(validateVitestReportConsistency(earlyHeaderReturn, root)).toEqual([
      malformedVitestFinding("Vitest report numTotalTests must be a nonnegative integer"),
    ]);
  });

  it("validates canonical Vitest file identities and file evidence exactly", () => {
    expect(vitestFileNameIsNormalized(null as unknown as Parameters<typeof vitestFileNameIsNormalized>[0])).toBe(false);
    expect(vitestFileNameIsNormalized({ name: "/repo/tests/example.test.ts" })).toBe(true);
    expect(vitestFileNameIsNormalized({ name: "" })).toBe(false);
    expect(vitestFileNameIsNormalized({ name: " padded " })).toBe(false);
    expect(vitestFileNameIsNormalized({ name: 1 as unknown as string })).toBe(false);

    expect(
      canonicalVitestFileIdentity({ name: "/repo/Tests/Vitest/Example.test.ts" }, root),
    ).toBe("tests/vitest/example.test.ts");

    const duplicate = report();
    duplicate.testResults!.push(structuredClone(duplicate.testResults![0]!));
    duplicate.numTotalTestSuites = 2;
    duplicate.numPassedTestSuites = 2;
    duplicate.numTotalTests = 2;
    duplicate.numPassedTests = 2;
    expect(validateVitestReportConsistency(duplicate, root)).toEqual([
      malformedVitestFinding(
        "Vitest file result name is duplicated: /repo/tests/vitest/example.test.tsx",
      ),
    ]);

    const escaped = report();
    const outsideFile = resolve(root, "../outside.test.ts");
    escaped.testResults![0]!.name = outsideFile;
    expect(validateVitestReportConsistency(escaped, root)).toEqual([
      malformedVitestFinding(
        `Error: Vitest file ${outsideFile} is outside the repository or aliases total`,
      ),
    ]);

    const invalidNames = [
      {},
      { name: "", status: "passed", assertionResults: [] },
      { name: " padded ", status: "passed", assertionResults: [] },
      { name: 1, status: "passed", assertionResults: [] },
    ];
    for (const result of invalidNames) {
      const malformed = report();
      malformed.testResults = [result as typeof malformed.testResults extends Array<infer Item> ? Item : never];
      malformed.numTotalTests = 0;
      malformed.numPassedTests = 0;
      expect(validateVitestReportConsistency(malformed, root)).toEqual([
        malformedVitestFinding("Vitest file result 0 must have a nonempty normalized name"),
      ]);
    }

    const unsupported = report();
    unsupported.testResults![0]!.status = "pending";
    expect(validateVitestReportConsistency(unsupported, root)).toEqual([
      malformedVitestFinding(
        "Vitest file /repo/tests/vitest/example.test.tsx has unsupported status pending",
      ),
    ]);

    const missingAssertions = report();
    delete missingAssertions.testResults![0]!.assertionResults;
    missingAssertions.numTotalTests = 0;
    missingAssertions.numPassedTests = 0;
    expect(validateVitestReportConsistency(missingAssertions, root)).toEqual([
      malformedVitestFinding(
        "Vitest file /repo/tests/vitest/example.test.tsx must contain assertionResults",
      ),
    ]);

    const emptyPassed = report();
    emptyPassed.testResults![0]!.assertionResults = [];
    emptyPassed.numTotalTests = 0;
    emptyPassed.numPassedTests = 0;
    expect(validateVitestReportConsistency(emptyPassed, root)).toEqual([
      malformedVitestFinding(
        "Vitest file /repo/tests/vitest/example.test.tsx passed without assertion evidence",
      ),
    ]);

    const emptyFailed = report("failed");
    emptyFailed.testResults![0]!.assertionResults = [];
    emptyFailed.numTotalTests = 0;
    emptyFailed.numFailedTests = 0;
    expect(validateVitestReportConsistency(emptyFailed, root)).toEqual([]);

    const mixedAssertions = report();
    mixedAssertions.success = false;
    mixedAssertions.testResults![0]!.assertionResults = [
      { status: "passed" },
      { status: "failed" },
    ];
    mixedAssertions.numTotalTests = 2;
    mixedAssertions.numPassedTests = 1;
    mixedAssertions.numFailedTests = 1;
    expect(validateVitestReportConsistency(mixedAssertions, root)).toEqual([
      malformedVitestFinding(
        "Vitest file /repo/tests/vitest/example.test.tsx passed while containing a failed assertion",
      ),
    ]);
    expect(validateVitestReportConsistency(report(), root)).toEqual([]);
  });

  it("observes every Vitest assertion status and counter exactly", () => {
    const statuses = report("failed");
    statuses.testResults![0]!.assertionResults = [
      { status: "passed" },
      { status: "failed" },
      { status: "todo" },
      { status: "pending" },
      { status: "skipped" },
      { status: "unknown" },
    ];
    statuses.numTotalTests = 6;
    statuses.numPassedTests = 1;
    statuses.numFailedTests = 1;
    statuses.numPendingTests = 2;
    statuses.numTodoTests = 1;
    expect(validateVitestReportConsistency(statuses, root)).toEqual([
      malformedVitestFinding("Vitest assertion has unsupported status unknown"),
    ]);

    const counterCases = [
      ["numTotalTests", 2, 1],
      ["numPassedTests", 2, 1],
      ["numFailedTests", 1, 0],
      ["numPendingTests", 1, 0],
      ["numTodoTests", 1, 0],
    ] as const;
    for (const [name, reported, observed] of counterCases) {
      const mismatch = report();
      mismatch[name] = reported;
      if (name === "numFailedTests") mismatch.success = false;
      expect(validateVitestReportConsistency(mismatch, root)).toEqual([
        malformedVitestFinding(`Vitest report ${name}=${reported}; observed ${observed}`),
      ]);
    }
  });

  it("validates Vitest suite counters and collected files exactly", () => {
    const partsMismatch = report();
    partsMismatch.numTotalTestSuites = 2;
    expect(validateVitestReportConsistency(partsMismatch, root)).toEqual([
      malformedVitestFinding("Vitest suite counters total 2; observed parts 1"),
    ]);

    const pendingSuite = report();
    pendingSuite.numPassedTestSuites = 0;
    pendingSuite.numPendingTestSuites = 1;
    expect(validateVitestReportConsistency(pendingSuite, root)).toEqual([
      malformedVitestFinding("Vitest report contains pending or skipped suites"),
    ]);

    const missingFiles = report();
    missingFiles.testResults = [];
    missingFiles.numTotalTests = 0;
    missingFiles.numPassedTests = 0;
    expect(validateVitestReportConsistency(missingFiles, root)).toEqual([
      malformedVitestFinding(
        "Vitest suite counters do not correspond to collected test files",
      ),
    ]);

    const unexpectedFiles = report();
    unexpectedFiles.numTotalTestSuites = 0;
    unexpectedFiles.numPassedTestSuites = 0;
    expect(validateVitestReportConsistency(unexpectedFiles, root)).toEqual([
      malformedVitestFinding(
        "Vitest suite counters do not correspond to collected test files",
      ),
    ]);

    const tooManyFiles = report();
    tooManyFiles.testResults!.push({
      name: "/repo/tests/vitest/second.test.tsx",
      status: "passed",
      assertionResults: [{ status: "passed" }],
    });
    tooManyFiles.numTotalTests = 2;
    tooManyFiles.numPassedTests = 2;
    expect(validateVitestReportConsistency(tooManyFiles, root)).toEqual([
      malformedVitestFinding("Vitest collected 2 files but only 1 suites"),
    ]);
  });

  it("derives Vitest failure state from every independent source", () => {
    const validateFailureState = (value: VitestJsonReport) =>
      validateVitestFailureState(
        value as Parameters<typeof validateVitestFailureState>[0],
      );

    const failedFileOnly = report();
    failedFileOnly.success = false;
    failedFileOnly.testResults![0]!.status = "failed";
    expect(validateFailureState(failedFileOnly)).toEqual([
      malformedVitestFinding("Vitest failed-suite counters contradict file outcomes"),
    ]);

    const failedSuiteOnly = report();
    failedSuiteOnly.success = false;
    failedSuiteOnly.numFailedTestSuites = 1;
    expect(validateFailureState(failedSuiteOnly)).toEqual([
      malformedVitestFinding("Vitest failed-suite counters contradict file outcomes"),
    ]);

    const mixedFiles = report();
    mixedFiles.success = false;
    mixedFiles.numFailedTestSuites = 1;
    mixedFiles.testResults!.push({
      name: "/repo/tests/vitest/failed.test.tsx",
      status: "failed",
      assertionResults: [],
    });
    expect(validateFailureState(mixedFiles)).toEqual([]);

    const failedTestOnly = report();
    failedTestOnly.success = false;
    failedTestOnly.numFailedTests = 1;
    expect(validateFailureState(failedTestOnly)).toEqual([]);

    const unhandledOnly = report();
    unhandledOnly.success = false;
    unhandledOnly.unhandledErrors = [{}];
    expect(validateFailureState(unhandledOnly)).toEqual([]);

    const falseWithoutFailure = report();
    falseWithoutFailure.success = false;
    expect(validateFailureState(falseWithoutFailure)).toEqual([
      malformedVitestFinding(
        "Vitest success=false contradicts observed failure state false",
      ),
    ]);

    const trueWithFailure = report();
    trueWithFailure.numFailedTests = 1;
    expect(validateFailureState(trueWithFailure)).toEqual([
      malformedVitestFinding(
        "Vitest success=true contradicts observed failure state true",
      ),
    ]);
  });

  it("parses only complete canonical baseline review decisions", () => {
    const fields = [
      "Decision: APPROVE",
      `Inventory SHA-256: ${"a".repeat(64)}`,
      `Candidate Digest: ${"b".repeat(64)}`,
      "Reviewer: quality-reviewer",
      "Reviewer Role: read-only",
      "Source: local-agent",
      "Reviewer Identity Assurance: asserted-local",
      "Author Identity Assurance: asserted-local",
    ];
    expect(parseBaselineReviewDecision(`${fields.join("\r\n")}\r\n`)).toEqual({
      decision: "APPROVE",
      inventorySha: "a".repeat(64),
      candidateSha: "b".repeat(64),
      reviewer: "quality-reviewer",
      role: "read-only",
      source: "local-agent",
      reviewerAssurance: "asserted-local",
      authorAssurance: "asserted-local",
    });
    expect(parseBaselineReviewDecision(`${fields.join("\n")}\n`)).toEqual({
      decision: "APPROVE",
      inventorySha: "a".repeat(64),
      candidateSha: "b".repeat(64),
      reviewer: "quality-reviewer",
      role: "read-only",
      source: "local-agent",
      reviewerAssurance: "asserted-local",
      authorAssurance: "asserted-local",
    });

    const malformedReviews = [
      fields.slice(0, -1).join("\n"),
      [...fields, "Unexpected: value"].join("\n"),
      fields.map((line, index) => index === 0 ? "Decision:APPROVE" : line).join("\n"),
      fields.map((line, index) => index === 0 ? "Decision:  APPROVE" : line).join("\n"),
      fields.map((line, index) => index === 0 ? "Decision: APPROVE " : line).join("\n"),
      fields.map((line, index) => index === 0 ? "Unknown: APPROVE" : line).join("\n"),
      fields.map((line, index) => index === 1 ? "Decision: APPROVE" : line).join("\n"),
      fields.map((line, index) => index === 0 ? ": APPROVE" : line).join("\n"),
      fields.map((line, index) => index === 0 ? ":Decision: APPROVE" : line).join("\n"),
      fields.map((line, index) => index === 0 ? "Decision:\nAPPROVE" : line).join("\n"),
      fields.map((line, index) => index === 0 ? "prefix Decision: APPROVE" : line).join("\n"),
      fields.map((line, index) => index === 0 ? "Decision: APPROVE\rtrailing" : line).join("\n"),
    ];
    for (const malformed of malformedReviews) {
      expect(parseBaselineReviewDecision(malformed)).toEqual({});
    }
  });

  it("lists and verifies every canonical baseline artifact exactly", async () => {
    const repositoryRoot = mkdtempSync(join(tmpdir(), "component-artifacts-"));
    try {
      const baseline = admittedBaseline();
      const artifactContent = "canonical artifact";
      const artifactSha = sha256(artifactContent);
      baseline.source.report = "source-report.json";
      baseline.source.report_sha256 = artifactSha;
      baseline.source.coverage = "source-coverage.json";
      baseline.source.coverage_sha256 = artifactSha;
      baseline.admission.inventory = "inventory.json";
      baseline.admission.inventory_sha256 = artifactSha;
      baseline.admission.validation_artifact = "validation.json";
      baseline.admission.validation_sha256 = artifactSha;
      baseline.admission.quality_review_artifact = "quality-review.md";
      baseline.admission.quality_review_sha256 = artifactSha;
      baseline.admission.security_review_artifact = "security-review.md";
      baseline.admission.security_review_sha256 = artifactSha;

      const artifacts = canonicalBaselineArtifacts(baseline);
      expect(artifacts).toEqual([
        ["source report", "source-report.json", artifactSha],
        ["source coverage", "source-coverage.json", artifactSha],
        ["inventory", "inventory.json", artifactSha],
        ["validation", "validation.json", artifactSha],
        ["quality review", "quality-review.md", artifactSha],
        ["security review", "security-review.md", artifactSha],
      ]);
      for (const [, path] of artifacts) writeFileSync(join(repositoryRoot, path), artifactContent);
      expect(await validateBaselineArtifactHashes(repositoryRoot, baseline)).toEqual([]);

      for (const [label, path] of artifacts) {
        rmSync(join(repositoryRoot, path));
        expect(await validateBaselineArtifactHashes(repositoryRoot, baseline)).toEqual([{
          code: "COMPONENT_BASELINE_ARTIFACT_MISSING",
          message: `Canonical baseline ${label} artifact is missing`,
          path,
        }]);
        writeFileSync(join(repositoryRoot, path), artifactContent);
      }

      baseline.source.report_sha256 = "0".repeat(64);
      expect(await validateBaselineArtifactHashes(repositoryRoot, baseline)).toEqual([{
        code: "COMPONENT_BASELINE_ARTIFACT_HASH",
        message: "Canonical baseline source report hash does not match source-report.json",
        path: "source-report.json",
      }]);
      baseline.source.report_sha256 = artifactSha;
      baseline.source.report = ".omx/source-report.json";
      expect(await validateBaselineArtifactHashes(repositoryRoot, baseline)).toEqual([{
        code: "COMPONENT_BASELINE_ARTIFACT_NOT_CI_AVAILABLE",
        message: "Canonical baseline source report cannot rely on ignored OMX state",
        path: ".omx/source-report.json",
      }]);
    } finally {
      rmSync(repositoryRoot, { recursive: true, force: true });
    }
  });

  it("recognizes admitted inventories and exact ratchet identities", () => {
    const inventory = retainedInventory();
    expect(inventoryIsAdmitted(inventory)).toBe(true);
    for (const mutate of [
      (value: BaselineInventory) => { value.schema_version = 2; },
      (value: BaselineInventory) => { value.admission!.phase = "draft"; },
      (value: BaselineInventory) => { value.admission!.status = "admitted"; },
      (value: BaselineInventory) => { delete value.admission; },
    ]) {
      const malformed = retainedInventory();
      mutate(malformed);
      expect(inventoryIsAdmitted(malformed)).toBe(false);
    }

    inventory.records = [
      {
        classification: "ratchet_noncritical",
        status: "proposed",
        failure_kind: "failed_test",
        file: "tests/a.test.ts",
        test_or_scenario: "renders",
        normalized_signature: "expected true",
      },
      {
        classification: "must_fix_noncritical",
        status: "proposed",
        failure_kind: "failed_test",
        file: "tests/ignored-classification.test.ts",
        test_or_scenario: "ignored",
        normalized_signature: "ignored",
      },
      {
        classification: "ratchet_noncritical",
        status: "open",
        failure_kind: "failed_test",
        file: "tests/ignored-status.test.ts",
        test_or_scenario: "ignored",
        normalized_signature: "ignored",
      },
      {
        classification: "ratchet_noncritical",
        status: "proposed",
        failure_kind: "collection_failure",
        file: "tests/ignored-kind.test.ts",
        test_or_scenario: "ignored",
        normalized_signature: "ignored",
      },
    ];
    const identity = ["test_failure", "tests/a.test.ts", "renders", "expected true"].join("\0");
    expect(admittedInventoryIdentities(inventory)).toEqual(new Set([identity]));
    expect(admittedInventoryIdentities({})).toEqual(new Set());
    expect(identitySetsMatch(new Set([identity, "second"]), new Set(["second", identity]))).toBe(true);
    expect(identitySetsMatch(new Set([identity]), new Set([identity, "second"]))).toBe(false);
    expect(identitySetsMatch(new Set([identity]), new Set(["different"]))).toBe(false);
    expect(identitySetsMatch(new Set([identity, "left-only"]), new Set([identity, "right-only"]))).toBe(false);
  });

  it("accepts only structured runtime inventories", () => {
    expect(runtimeInventoryIsStructured(retainedInventory())).toBe(true);
    const malformedInventories: unknown[] = [
      null,
      {},
      { source: {}, admission: null, records: [] },
      { source: {}, admission: { bootstrap: "true", author_ids: ["author"] }, records: [] },
      { source: {}, admission: { bootstrap: true, author_ids: [] }, records: [] },
      { source: {}, admission: { bootstrap: true, author_ids: [" author"] }, records: [] },
      { source: {}, admission: { bootstrap: true, author_ids: ["b", "a"] }, records: [] },
      { source: {}, admission: { bootstrap: true, author_ids: ["author"] }, records: null },
      { source: {}, admission: { bootstrap: true, author_ids: ["author"] }, records: [{}, null] },
    ];
    for (const malformed of malformedInventories) {
      expect(runtimeInventoryIsStructured(malformed)).toBe(false);
    }
  });

  it("validates retained measurement shape and every source binding", () => {
    const proofInvalid = [{
      code: "COMPONENT_BASELINE_MEASUREMENT_PROOF_INVALID",
      message: "Admitted inventory lacks a complete integrity-PASS measurement proof",
    }];
    const proofMismatch = [{
      code: "COMPONENT_BASELINE_MEASUREMENT_PROOF_MISMATCH",
      message: "Retained measurement proof does not match inventory candidate, report, and coverage bindings",
    }];
    expect(validateRetainedMeasurement(retainedInventory())).toEqual([]);
    expect(validateRetainedMeasurement({})).toEqual(proofInvalid);

    const q3 = retainedInventory();
    q3.source!.measurement!.candidate!.profile = "Q3_RELEASE_GATE";
    expect(validateRetainedMeasurement(q3)).toEqual([]);

    const invalidShapeMutations: Array<(value: BaselineInventory) => void> = [
      (value) => { delete value.source!.measurement; },
      (value) => { delete value.source!.measurement!.candidate; },
      (value) => { delete value.source!.measurement!.candidate!.comparison_base; },
      (value) => { delete value.source!.measurement!.report; },
      (value) => { delete value.source!.measurement!.coverage; },
      (value) => { value.source!.measurement!.schema_version = 2; },
      (value) => { value.source!.measurement!.integrity_status = "FAIL"; },
      (value) => { value.source!.measurement!.command = "bun test"; },
      (value) => { value.source!.measurement!.duration_ms = -1; },
      (value) => { value.source!.measurement!.duration_ms = 0.5; },
      (value) => { value.source!.measurement!.exit_status = null; },
      (value) => { value.source!.measurement!.exit_status = 0.5; },
      (value) => { value.source!.measurement!.candidate!.artifact = ""; },
      (value) => { value.source!.measurement!.candidate!.artifact_sha256 = "d".repeat(63); },
      (value) => { value.source!.measurement!.candidate!.inner_sha256 = "f".repeat(63); },
      (value) => { value.source!.measurement!.candidate!.commit_sha = "A".repeat(40); },
      (value) => { value.source!.measurement!.candidate!.commit_sha = `${"a".repeat(40)}x`; },
      (value) => { value.source!.measurement!.candidate!.commit_sha = `x${"a".repeat(40)}`; },
      (value) => { value.source!.measurement!.candidate!.comparison_base!.input_ref = ""; },
      (value) => { value.source!.measurement!.candidate!.comparison_base!.resolved_sha = "1".repeat(39); },
      (value) => { value.source!.measurement!.candidate!.comparison_base!.resolved_sha = `${"1".repeat(40)}x`; },
      (value) => { value.source!.measurement!.candidate!.comparison_base!.resolved_sha = `x${"1".repeat(40)}`; },
      (value) => { value.source!.measurement!.candidate!.profile = "Q1_CHANGE_GATE"; },
      (value) => { value.source!.measurement!.report!.artifact = "quality/source.json"; },
      (value) => { value.source!.measurement!.report!.sha256 = "a".repeat(63); },
      (value) => { value.source!.measurement!.coverage!.artifact = "quality/coverage.json"; },
      (value) => { value.source!.measurement!.coverage!.sha256 = "b".repeat(63); },
    ];
    for (const mutate of invalidShapeMutations) {
      const malformed = retainedInventory();
      mutate(malformed);
      expect(validateRetainedMeasurement(malformed)).toEqual(proofInvalid);
    }

    const bindingMutations: Array<(value: BaselineInventory) => void> = [
      (value) => { value.source!.command = "different command"; },
      (value) => { value.source!.candidate_artifact = ".tmp/other-candidate.json"; },
      (value) => { value.source!.candidate_sha256 = "c".repeat(64); },
      (value) => { value.source!.candidate_digest = "c".repeat(64); },
      (value) => { value.source!.commit = "2".repeat(40); },
      (value) => { value.source!.artifact_sha256 = "c".repeat(64); },
      (value) => { value.source!.coverage_sha256 = "c".repeat(64); },
    ];
    for (const mutate of bindingMutations) {
      const mismatch = retainedInventory();
      mutate(mismatch);
      expect(validateRetainedMeasurement(mismatch)).toEqual(proofMismatch);
    }
  });

  it("binds baseline source artifacts and measurement proof exactly", () => {
    const baseline = admittedBaseline();
    const mismatchFinding = {
      code: "COMPONENT_BASELINE_SOURCE_INVENTORY_MISMATCH",
      message: "Canonical baseline source paths and hashes do not match the admitted inventory",
    };
    expect(validateBaselineInventorySourceBinding(baseline, retainedInventory(baseline))).toEqual([]);
    expect(validateBaselineInventorySourceBinding(baseline, {})).toEqual([
      {
        code: "COMPONENT_BASELINE_MEASUREMENT_PROOF_INVALID",
        message: "Admitted inventory lacks a complete integrity-PASS measurement proof",
      },
      mismatchFinding,
    ]);
    const mutations: Array<(value: BaselineInventory) => void> = [
      (value) => { value.source!.measurement_artifact = ""; },
      (value) => { value.source!.measurement_sha256 = "e".repeat(63); },
      (value) => { value.source!.artifact = "other-report.json"; },
      (value) => { value.source!.artifact_sha256 = "c".repeat(64); },
      (value) => { value.source!.coverage_artifact = "other-coverage.json"; },
      (value) => { value.source!.coverage_sha256 = "c".repeat(64); },
    ];
    for (const mutate of mutations) {
      const inventory = retainedInventory(baseline);
      mutate(inventory);
      const expected = validateRetainedMeasurement(inventory).length > 0
        ? [...validateRetainedMeasurement(inventory), mismatchFinding]
        : [mismatchFinding];
      expect(validateBaselineInventorySourceBinding(baseline, inventory)).toEqual(expected);
    }
  });

  it("accepts only transient measurement artifact origins", () => {
    const cases: Array<[unknown, boolean]> = [
      [null, false],
      [0, false],
      ["", false],
      ["   ", false],
      ["quality", false],
      ["quality/", false],
      ["quality/source.json", false],
      ["./quality/source.json", false],
      ["artifacts/../quality/source.json", false],
      ["quality\\source.json", false],
      [".tmp/source.json", true],
      ["artifacts/source.json", true],
      ["quality-report/source.json", true],
    ];
    expect(cases.map(([value]) => transientMeasurementOrigin(value))).toEqual(
      cases.map(([, expected]) => expected),
    );
  });

  it("validates canonical baseline inventory files and exact identities", async () => {
    const repositoryRoot = mkdtempSync(join(tmpdir(), "component-inventory-"));
    try {
      const baseline = admittedBaseline();
      baseline.admission.inventory = "inventory.json";
      const inventory = retainedInventory(baseline);
      const failure = baseline.allowed_failures[0]!;
      inventory.records = [{
        classification: "ratchet_noncritical",
        status: "proposed",
        failure_kind: "failed_test",
        file: failure.file,
        test_or_scenario: failure.test,
        normalized_signature: failure.signature,
      }];
      const inventoryPath = join(repositoryRoot, baseline.admission.inventory);
      writeFileSync(inventoryPath, JSON.stringify(inventory));
      expect(await validateBaselineInventory(repositoryRoot, baseline)).toEqual([]);

      writeFileSync(inventoryPath, JSON.stringify({}));
      expect(await validateBaselineInventory(repositoryRoot, baseline)).toEqual([{
        code: "COMPONENT_BASELINE_INVENTORY_MALFORMED",
        message: "Canonical baseline inventory has invalid source, admission, or records structure",
        path: "inventory.json",
      }]);

      const notAdmitted = structuredClone(inventory);
      notAdmitted.admission!.status = "draft";
      writeFileSync(inventoryPath, JSON.stringify(notAdmitted));
      expect(await validateBaselineInventory(repositoryRoot, baseline)).toEqual([{
        code: "COMPONENT_BASELINE_INVENTORY_NOT_ADMITTED",
        message: "Canonical baseline inventory lacks two approved reviews bound to its hash",
      }]);

      const wrongIdentity = structuredClone(inventory);
      wrongIdentity.records = [];
      writeFileSync(inventoryPath, JSON.stringify(wrongIdentity));
      expect(await validateBaselineInventory(repositoryRoot, baseline)).toEqual([{
        code: "COMPONENT_BASELINE_INVENTORY_MISMATCH",
        message: "Allowed failures do not exactly match admitted noncritical inventory identities",
      }]);

      const wrongSource = structuredClone(inventory);
      wrongSource.source!.artifact = "different-report.json";
      writeFileSync(inventoryPath, JSON.stringify(wrongSource));
      expect(await validateBaselineInventory(repositoryRoot, baseline)).toEqual([{
        code: "COMPONENT_BASELINE_SOURCE_INVENTORY_MISMATCH",
        message: "Canonical baseline source paths and hashes do not match the admitted inventory",
      }]);

      writeFileSync(inventoryPath, "{not-json");
      const malformed = await validateBaselineInventory(repositoryRoot, baseline);
      expect(malformed).toHaveLength(1);
      expect(malformed[0]).toMatchObject({
        code: "COMPONENT_BASELINE_INVENTORY_MALFORMED",
        path: "inventory.json",
      });
      expect(malformed[0]!.message).toContain("Canonical baseline inventory is malformed:");
    } finally {
      rmSync(repositoryRoot, { recursive: true, force: true });
    }
  });

  it("approves only validation artifacts bound to the complete inventory", () => {
    const inventory = retainedInventory();
    const inventorySha = "c".repeat(64);
    expect(validationApprovesInventory(admittedValidation(inventory, inventorySha), inventorySha, inventory)).toBe(true);

    const establishedInventory = retainedInventory();
    establishedInventory.admission!.bootstrap = false;
    expect(
      validationApprovesInventory(
        admittedValidation(establishedInventory, inventorySha),
        inventorySha,
        establishedInventory,
      ),
    ).toBe(true);
    expect(validationApprovesInventory({}, inventorySha, inventory)).toBe(false);
    expect(
      validationApprovesInventory(
        { status: "PASS", data: { bootstrap: "true" as unknown as boolean } },
        inventorySha,
        inventory,
      ),
    ).toBe(false);
    const nonBooleanBootstrap = admittedValidation(inventory, inventorySha);
    nonBooleanBootstrap.data!.bootstrap = "true" as unknown as boolean;
    (inventory.admission as unknown as { bootstrap: unknown }).bootstrap = "true";
    expect(validationApprovesInventory(nonBooleanBootstrap, inventorySha, inventory)).toBe(false);
    inventory.admission!.bootstrap = true;
    expect(validationApprovesInventory(admittedValidation(inventory, inventorySha), inventorySha, {})).toBe(false);

    const mutations: Array<(value: BaselineValidation) => void> = [
      (value) => { value.status = "FAIL"; },
      (value) => { value.data!.phase = "draft"; },
      (value) => { value.data!.inventory_sha256 = "d".repeat(64); },
      (value) => { value.data!.candidate_digest = "d".repeat(64); },
      (value) => { value.data!.bootstrap = false; value.data!.predecessor_baseline_sha256 = null; },
      (value) => { value.data!.author_ids = ["different-author"]; },
      (value) => { value.data!.review_source = "remote-agent"; },
      (value) => { value.data!.reviewer_identity_assurance = "unknown"; },
      (value) => { value.data!.author_identity_assurance = "unknown"; },
      (value) => { value.data!.predecessor_baseline_sha256 = "f".repeat(64); },
    ];
    for (const mutate of mutations) {
      const validation = admittedValidation(inventory, inventorySha);
      mutate(validation);
      expect(validationApprovesInventory(validation, inventorySha, inventory)).toBe(false);
    }

    const bootstrapMismatchOnly = admittedValidation(inventory, inventorySha);
    bootstrapMismatchOnly.data!.bootstrap = false;
    bootstrapMismatchOnly.data!.predecessor_baseline_sha256 = "f".repeat(64);
    expect(validationApprovesInventory(bootstrapMismatchOnly, inventorySha, inventory)).toBe(false);

    const invalidEstablished = admittedValidation(establishedInventory, inventorySha);
    invalidEstablished.data!.predecessor_baseline_sha256 = null;
    expect(
      validationApprovesInventory(invalidEstablished, inventorySha, establishedInventory),
    ).toBe(false);
  });

  it("validates the file-backed admission decision exactly", async () => {
    const repositoryRoot = mkdtempSync(join(tmpdir(), "component-validation-"));
    try {
      const baseline = admittedBaseline();
      baseline.admission.inventory = "inventory.json";
      baseline.admission.validation_artifact = "validation.json";
      const inventory = retainedInventory(baseline);
      const inventoryPath = join(repositoryRoot, baseline.admission.inventory);
      const validationPath = join(repositoryRoot, baseline.admission.validation_artifact);
      writeFileSync(inventoryPath, JSON.stringify(inventory));
      writeFileSync(
        validationPath,
        JSON.stringify(admittedValidation(inventory, baseline.admission.inventory_sha256)),
      );
      expect(await validateBaselineValidationArtifact(repositoryRoot, baseline)).toEqual([]);

      writeFileSync(inventoryPath, JSON.stringify({}));
      expect(await validateBaselineValidationArtifact(repositoryRoot, baseline)).toEqual([{
        code: "COMPONENT_BASELINE_VALIDATION_MALFORMED",
        message: "Admission validation cannot bind a malformed inventory",
        path: "validation.json",
      }]);
      writeFileSync(inventoryPath, JSON.stringify(inventory));

      const rejected = admittedValidation(inventory, baseline.admission.inventory_sha256);
      rejected.status = "FAIL";
      writeFileSync(validationPath, JSON.stringify(rejected));
      expect(await validateBaselineValidationArtifact(repositoryRoot, baseline)).toEqual([{
        code: "COMPONENT_BASELINE_ADMISSION_NOT_APPROVED",
        message: "Baseline validation artifact does not approve the bound inventory",
      }]);

      writeFileSync(validationPath, "{not-json");
      const malformed = await validateBaselineValidationArtifact(repositoryRoot, baseline);
      expect(malformed).toHaveLength(1);
      expect(malformed[0]).toMatchObject({
        code: "COMPONENT_BASELINE_VALIDATION_MALFORMED",
        path: "validation.json",
      });
      expect(malformed[0]!.message).toContain(
        "Canonical baseline validation artifact is malformed:",
      );
    } finally {
      rmSync(repositoryRoot, { recursive: true, force: true });
    }
  });

  it("reads canonical reviews and fails closed for missing files", async () => {
    const repositoryRoot = mkdtempSync(join(tmpdir(), "component-reviews-"));
    try {
      const baseline = admittedBaseline();
      baseline.admission.quality_review_artifact = "quality-review.md";
      baseline.admission.security_review_artifact = "security-review.md";
      const reviewText = (reviewer: string) => [
        "Decision: APPROVE",
        `Inventory SHA-256: ${baseline.admission.inventory_sha256}`,
        `Candidate Digest: ${baseline.admission.candidate_digest}`,
        `Reviewer: ${reviewer}`,
        "Reviewer Role: read-only",
        "Source: local-agent",
        "Reviewer Identity Assurance: asserted-local",
        "Author Identity Assurance: asserted-local",
      ].join("\n");
      writeFileSync(join(repositoryRoot, "quality-review.md"), reviewText("quality-reviewer"));
      writeFileSync(join(repositoryRoot, "security-review.md"), reviewText("security-reviewer"));
      expect(await readBaselineReviews(repositoryRoot, baseline)).toEqual([
        {
          decision: "APPROVE",
          inventorySha: baseline.admission.inventory_sha256,
          candidateSha: baseline.admission.candidate_digest,
          reviewer: "quality-reviewer",
          role: "read-only",
          source: "local-agent",
          reviewerAssurance: "asserted-local",
          authorAssurance: "asserted-local",
        },
        {
          decision: "APPROVE",
          inventorySha: baseline.admission.inventory_sha256,
          candidateSha: baseline.admission.candidate_digest,
          reviewer: "security-reviewer",
          role: "read-only",
          source: "local-agent",
          reviewerAssurance: "asserted-local",
          authorAssurance: "asserted-local",
        },
      ]);
      rmSync(join(repositoryRoot, "security-review.md"));
      expect(await readBaselineReviews(repositoryRoot, baseline)).toEqual([
        expect.objectContaining({ reviewer: "quality-reviewer" }),
        {},
      ]);
    } finally {
      rmSync(repositoryRoot, { recursive: true, force: true });
    }
  });

  it("enforces independent read-only assured non-author baseline reviews", () => {
    const baseline = admittedBaseline();
    const candidateSha = baseline.admission.candidate_digest;
    const review = (reviewer: string) => ({
      decision: "APPROVE",
      inventorySha: baseline.admission.inventory_sha256,
      candidateSha,
      reviewer,
      role: "read-only",
      source: "local-agent",
      reviewerAssurance: "asserted-local",
      authorAssurance: "asserted-local",
    });
    const validReviews = [review("quality-reviewer"), review("security-reviewer")];
    expect(validateBaselineReviews(baseline, candidateSha, ["author"], validReviews)).toEqual([]);
    expect(validateBaselineReviews(baseline, candidateSha, ["author"], [])).toEqual([]);
    expect(validateBaselineReviews(baseline, candidateSha, ["author"], [validReviews[0]!])).toEqual([]);

    const cases: Array<[ReturnType<typeof review>[], string | undefined, string[], object]> = [
      [
        [review("same-reviewer"), review("same-reviewer")],
        candidateSha,
        ["author"],
        {
          code: "COMPONENT_BASELINE_REVIEW_NOT_INDEPENDENT",
          message: "Quality and security baseline reviews must name different reviewers",
        },
      ],
      [
        [{ ...validReviews[0]!, candidateSha: "d".repeat(64) }, validReviews[1]!],
        candidateSha,
        ["author"],
        {
          code: "COMPONENT_BASELINE_REVIEW_CANDIDATE_MISMATCH",
          message: "Baseline reviews do not bind the measurement candidate",
        },
      ],
      [
        [{ ...validReviews[0]!, role: "writer" }, validReviews[1]!],
        candidateSha,
        ["author"],
        {
          code: "COMPONENT_BASELINE_REVIEW_NOT_READ_ONLY",
          message: "Baseline reviewers must record a read-only role",
        },
      ],
      [
        [{ ...validReviews[0]!, source: "remote-agent" }, validReviews[1]!],
        candidateSha,
        ["author"],
        {
          code: "COMPONENT_BASELINE_REVIEW_ASSURANCE_INVALID",
          message: "Baseline reviews must honestly assert local-agent reviewer and author identity assurance",
        },
      ],
      [
        [{ ...validReviews[0]!, reviewerAssurance: "unknown" }, validReviews[1]!],
        candidateSha,
        ["author"],
        {
          code: "COMPONENT_BASELINE_REVIEW_ASSURANCE_INVALID",
          message: "Baseline reviews must honestly assert local-agent reviewer and author identity assurance",
        },
      ],
      [
        [{ ...validReviews[0]!, authorAssurance: "unknown" }, validReviews[1]!],
        candidateSha,
        ["author"],
        {
          code: "COMPONENT_BASELINE_REVIEW_ASSURANCE_INVALID",
          message: "Baseline reviews must honestly assert local-agent reviewer and author identity assurance",
        },
      ],
      [
        [review("author"), validReviews[1]!],
        candidateSha,
        ["author"],
        {
          code: "COMPONENT_BASELINE_REVIEW_IS_AUTHOR",
          message: "Baseline authors cannot approve their own inventory",
        },
      ],
    ];
    for (const [reviews, expectedCandidateSha, authors, finding] of cases) {
      expect(
        validateBaselineReviews(baseline, expectedCandidateSha, authors, reviews),
      ).toContainEqual(finding);
    }
    expect(
      validateBaselineReviews(baseline, undefined, ["author"], validReviews),
    ).toContainEqual({
      code: "COMPONENT_BASELINE_REVIEW_CANDIDATE_MISMATCH",
      message: "Baseline reviews do not bind the measurement candidate",
    });
    const upperRole = [review("quality-reviewer"), review("security-reviewer")];
    upperRole[0]!.role = "READ-ONLY";
    expect(validateBaselineReviews(baseline, candidateSha, ["author"], upperRole)).toEqual([]);
    const missingRole = [review("quality-reviewer"), review("security-reviewer")];
    delete missingRole[0]!.role;
    expect(
      validateBaselineReviews(baseline, candidateSha, ["author"], missingRole).map(
        (finding) => finding.code,
      ),
    ).toContain("COMPONENT_BASELINE_REVIEW_NOT_READ_ONLY");
  });

  it("reads immutable Git evidence and verifies single-commit bootstrap provenance", async () => {
    const repositoryRoot = mkdtempSync(join(tmpdir(), "component-bootstrap-git-"));
    try {
      initializeTestGit(repositoryRoot);
      mkdirSync(join(repositoryRoot, "quality"), { recursive: true });
      const baselinePath = join(repositoryRoot, "quality", "baseline.json");
      const baselineContent = "{\"bootstrap\":true}\n";
      writeFileSync(baselinePath, baselineContent);
      runTestGit(repositoryRoot, ["add", "quality/baseline.json"]);
      runTestGit(repositoryRoot, ["commit", "-q", "-m", "add bootstrap baseline"]);
      const commitSha = runTestGit(repositoryRoot, ["rev-parse", "HEAD"]);

      expect(readImmutableGitFile(repositoryRoot, commitSha, "quality/baseline.json")).toBe(
        baselineContent,
      );
      expect(readImmutableGitFile(repositoryRoot, commitSha, "quality/missing.json")).toBeNull();
      expect(() => readImmutableGitFile(repositoryRoot, "0".repeat(40), "quality/baseline.json"))
        .toThrowError(new Error(`Comparison base ${"0".repeat(40)} is unavailable`));
      expect(readGitOutput(repositoryRoot, ["rev-parse", "HEAD"])).toBe(commitSha);
      expect(() => readGitOutput(repositoryRoot, ["rev-parse", "--verify", "missing-ref"]))
        .toThrowError(new Error("Immutable baseline Git evidence is unavailable"));
      expect(() => readImmutableGitFile(join(repositoryRoot, "missing"), commitSha, "quality/baseline.json"))
        .toThrow(/ENOENT/u);

      expect(baselineMatchesOnlyTrackedBootstrapAdmission(repositoryRoot)).toBe(true);
      const bootstrap = admittedBaseline();
      bootstrap.admission.bootstrap = true;
      bootstrap.admission.predecessor_baseline_sha256 = null;
      expect(validateBootstrapPredecessor(repositoryRoot, bootstrap, null)).toEqual([]);

      const lineageFinding = [{
        code: "COMPONENT_BASELINE_BOOTSTRAP_LINEAGE_INVALID",
        message: "Bootstrap baseline conflicts with immutable baseline history or a predecessor binding",
      }];
      const outerBootstrap = admittedBaseline();
      outerBootstrap.source.candidate.record.comparison_base.resolved_sha = commitSha;
      outerBootstrap.admission.bootstrap = true;
      outerBootstrap.admission.predecessor_baseline_sha256 = null;
      expect(
        await validateImmutablePredecessorAdmission(repositoryRoot, outerBootstrap),
      ).toEqual(lineageFinding);
      expect(validateBootstrapPredecessor(repositoryRoot, bootstrap, "predecessor")).toEqual(
        lineageFinding,
      );
      bootstrap.admission.predecessor_baseline_sha256 = "a".repeat(64);
      expect(validateBootstrapPredecessor(repositoryRoot, bootstrap, null)).toEqual(lineageFinding);
      bootstrap.admission.predecessor_baseline_sha256 = null;

      writeFileSync(baselinePath, "{\"bootstrap\":false}\n");
      expect(baselineMatchesOnlyTrackedBootstrapAdmission(repositoryRoot)).toBe(false);
      expect(validateBootstrapPredecessor(repositoryRoot, bootstrap, null)).toEqual(lineageFinding);
      runTestGit(repositoryRoot, ["add", "quality/baseline.json"]);
      runTestGit(repositoryRoot, ["commit", "-q", "-m", "change baseline"]);
      expect(baselineMatchesOnlyTrackedBootstrapAdmission(repositoryRoot)).toBe(false);
    } finally {
      rmSync(repositoryRoot, { recursive: true, force: true });
    }
  });

  it("reconstructs established predecessors from immutable Git coverage", async () => {
    const repositoryRoot = mkdtempSync(join(tmpdir(), "component-predecessor-git-"));
    try {
      initializeTestGit(repositoryRoot);
      runTestGit(repositoryRoot, ["commit", "--allow-empty", "-q", "-m", "empty base"]);
      const emptyCommitSha = runTestGit(repositoryRoot, ["rev-parse", "HEAD"]);
      const predecessorCoverage = coverage(80);
      const predecessorCoverageRaw = JSON.stringify(predecessorCoverage);
      const coveragePath = "quality/baselines/component/coverage-summary.json";
      mkdirSync(join(repositoryRoot, "quality", "baselines", "component"), {
        recursive: true,
      });
      writeFileSync(join(repositoryRoot, coveragePath), predecessorCoverageRaw);
      runTestGit(repositoryRoot, ["add", coveragePath]);
      runTestGit(repositoryRoot, ["commit", "-q", "-m", "add predecessor coverage"]);
      let comparisonBaseSha = runTestGit(repositoryRoot, ["rev-parse", "HEAD"]);

      const predecessor = admittedBaseline();
      predecessor.allowed_failures = [];
      predecessor.coverage = structuredClone(predecessorCoverage);
      predecessor.source.coverage = coveragePath;
      predecessor.source.coverage_sha256 = sha256(predecessorCoverageRaw);
      const currentReport = report("passed");
      currentReport.testResults![0]!.name = join(
        repositoryRoot,
        "tests",
        "vitest",
        "example.test.tsx",
      );
      const successor = admittedBaseline();
      successor.admission.bootstrap = false;
      const predecessorRaw = JSON.stringify(predecessor);
      successor.admission.predecessor_baseline_sha256 = sha256(predecessorRaw);
      mkdirSync(join(repositoryRoot, "quality"), { recursive: true });
      writeFileSync(join(repositoryRoot, "quality", "baseline.json"), predecessorRaw);
      runTestGit(repositoryRoot, ["add", "quality/baseline.json"]);
      runTestGit(repositoryRoot, ["commit", "-q", "-m", "add predecessor baseline"]);
      comparisonBaseSha = runTestGit(repositoryRoot, ["rev-parse", "HEAD"]);

      expect(
        validateEstablishedPredecessor(
          repositoryRoot,
          successor,
          predecessorRaw,
          comparisonBaseSha,
          currentReport,
          structuredClone(predecessorCoverage),
        ),
      ).toEqual([]);
      expect(
        validateEstablishedPredecessor(
          repositoryRoot,
          successor,
          predecessorRaw,
          comparisonBaseSha,
          currentReport,
          coverage(79),
        ).map((finding) => finding.code),
      ).toContain("COMPONENT_COVERAGE_REGRESSION");

      successor.source.candidate.record.comparison_base.resolved_sha = comparisonBaseSha;
      successor.source.report = "current-report.json";
      successor.source.coverage = "current-coverage.json";
      writeFileSync(join(repositoryRoot, successor.source.report), JSON.stringify(currentReport));
      writeFileSync(
        join(repositoryRoot, successor.source.coverage),
        JSON.stringify(predecessorCoverage),
      );
      expect(
        await validateImmutablePredecessorAdmission(repositoryRoot, successor),
      ).toEqual([]);
      expect(
        validateEstablishedPredecessor(
          repositoryRoot,
          successor,
          null,
          comparisonBaseSha,
          currentReport,
          predecessorCoverage,
        ),
      ).toEqual([{
        code: "COMPONENT_BASELINE_PREDECESSOR_MISSING",
        message: "Non-bootstrap baseline has no immutable predecessor",
      }]);

      successor.admission.predecessor_baseline_sha256 = "0".repeat(64);
      expect(
        validateEstablishedPredecessor(
          repositoryRoot,
          successor,
          predecessorRaw,
          comparisonBaseSha,
          currentReport,
          predecessorCoverage,
        ),
      ).toEqual([{
        code: "COMPONENT_BASELINE_PREDECESSOR_HASH_MISMATCH",
        message: "Predecessor binding does not match the immutable comparison-base baseline",
      }]);

      const invalidSource = structuredClone(predecessor);
      invalidSource.source.coverage = "coverage.json";
      const invalidSourceRaw = JSON.stringify(invalidSource);
      successor.admission.predecessor_baseline_sha256 = sha256(invalidSourceRaw);
      expect(
        validateEstablishedPredecessor(
          repositoryRoot,
          successor,
          invalidSourceRaw,
          comparisonBaseSha,
          currentReport,
          predecessorCoverage,
        ),
      ).toEqual([{
        code: "COMPONENT_BASELINE_PREDECESSOR_COVERAGE_INVALID",
        message: "Predecessor coverage source is not canonical",
      }]);

      const missingSource = structuredClone(predecessor);
      const missingSourceRaw = JSON.stringify(missingSource);
      successor.admission.predecessor_baseline_sha256 = sha256(missingSourceRaw);
      expect(
        validateEstablishedPredecessor(
          repositoryRoot,
          successor,
          missingSourceRaw,
          emptyCommitSha,
          currentReport,
          predecessorCoverage,
        ),
      ).toEqual([{
        code: "COMPONENT_BASELINE_PREDECESSOR_COVERAGE_INVALID",
        message: "Predecessor source coverage is missing or hash-mismatched",
      }]);

      const hashMismatch = structuredClone(predecessor);
      hashMismatch.source.coverage_sha256 = "0".repeat(64);
      const hashMismatchRaw = JSON.stringify(hashMismatch);
      successor.admission.predecessor_baseline_sha256 = sha256(hashMismatchRaw);
      expect(
        validateEstablishedPredecessor(
          repositoryRoot,
          successor,
          hashMismatchRaw,
          comparisonBaseSha,
          currentReport,
          predecessorCoverage,
        ),
      ).toEqual([{
        code: "COMPONENT_BASELINE_PREDECESSOR_COVERAGE_INVALID",
        message: "Predecessor source coverage is missing or hash-mismatched",
      }]);

      const embeddedMismatch = structuredClone(predecessor);
      embeddedMismatch.coverage = coverage(81);
      const embeddedMismatchRaw = JSON.stringify(embeddedMismatch);
      successor.admission.predecessor_baseline_sha256 = sha256(embeddedMismatchRaw);
      expect(
        validateEstablishedPredecessor(
          repositoryRoot,
          successor,
          embeddedMismatchRaw,
          comparisonBaseSha,
          currentReport,
          predecessorCoverage,
        ),
      ).toEqual([{
        code: "COMPONENT_BASELINE_PREDECESSOR_COVERAGE_INVALID",
        message: "Predecessor embedded coverage does not match its immutable source",
      }]);

      const missingPredecessorSource = structuredClone(predecessor) as unknown as Record<string, unknown>;
      delete missingPredecessorSource.source;
      const missingPredecessorSourceRaw = JSON.stringify(missingPredecessorSource);
      successor.admission.predecessor_baseline_sha256 = sha256(missingPredecessorSourceRaw);
      expect(
        validateEstablishedPredecessor(
          repositoryRoot,
          successor,
          missingPredecessorSourceRaw,
          comparisonBaseSha,
          currentReport,
          predecessorCoverage,
        ),
      ).toEqual([{
        code: "COMPONENT_BASELINE_PREDECESSOR_COVERAGE_INVALID",
        message: "Predecessor coverage source is not canonical",
      }]);

      const invalidAdmission = admittedBaseline();
      invalidAdmission.source.candidate.record.comparison_base.resolved_sha = "not-a-sha";
      expect(
        await validateImmutablePredecessorAdmission(repositoryRoot, invalidAdmission),
      ).toEqual([{
        code: "COMPONENT_BASELINE_PREDECESSOR_VALIDATION_FAILED",
        message: "Immutable predecessor admission could not be recomputed: Error: Comparison base not-a-sha is unavailable",
      }]);
    } finally {
      rmSync(repositoryRoot, { recursive: true, force: true });
    }
  });

  it("validates embedded baseline coverage only when source bytes are hash-bound", async () => {
    const repositoryRoot = mkdtempSync(join(tmpdir(), "component-embedded-coverage-"));
    try {
      const baseline = admittedBaseline();
      baseline.source.coverage = "coverage.json";
      baseline.coverage = coverage(80);
      const coverageRaw = JSON.stringify(baseline.coverage);
      writeFileSync(join(repositoryRoot, baseline.source.coverage), coverageRaw);
      baseline.source.coverage_sha256 = sha256(coverageRaw);
      expect(await validateEmbeddedBaselineCoverage(repositoryRoot, baseline)).toEqual([]);

      baseline.coverage = coverage(81);
      expect(await validateEmbeddedBaselineCoverage(repositoryRoot, baseline)).toEqual([{
        code: "COMPONENT_BASELINE_EMBEDDED_COVERAGE_MISMATCH",
        message: "Canonical baseline embedded coverage does not match its hash-bound source coverage",
        path: "coverage.json",
      }]);

      baseline.source.coverage_sha256 = "0".repeat(64);
      expect(await validateEmbeddedBaselineCoverage(repositoryRoot, baseline)).toEqual([]);
      writeFileSync(join(repositoryRoot, baseline.source.coverage), "{not-json");
      baseline.source.coverage_sha256 = sha256("{not-json");
      expect(await validateEmbeddedBaselineCoverage(repositoryRoot, baseline)).toEqual([]);
      rmSync(join(repositoryRoot, baseline.source.coverage));
      expect(await validateEmbeddedBaselineCoverage(repositoryRoot, baseline)).toEqual([]);
    } finally {
      rmSync(repositoryRoot, { recursive: true, force: true });
    }
  });

  it("parses optional generation artifacts and validates every nested object", () => {
    expect(parseOptionalGenerationJson(undefined)).toEqual({});
    expect(parseOptionalGenerationJson(Buffer.from('{"data":{"value":1}}'))).toEqual({
      data: { value: 1 },
    });
    expect(() => parseOptionalGenerationJson(Buffer.from("{not-json"))).toThrow();

    const candidateRaw = Buffer.from("{}");
    expect(optionalCandidateIsStructured(undefined, null)).toBe(true);
    expect(optionalCandidateIsStructured(candidateRaw, { data: { record: {} } })).toBe(true);
    for (const malformed of [null, {}, { data: null }, { data: {} }]) {
      expect(optionalCandidateIsStructured(candidateRaw, malformed)).toBe(false);
    }

    const measurementRaw = Buffer.from("{}");
    expect(optionalMeasurementIsStructured(undefined, null)).toBe(true);
    expect(
      optionalMeasurementIsStructured(measurementRaw, { data: { measurement: {} } }),
    ).toBe(true);
    for (const malformed of [null, {}, { data: null }, { data: {} }]) {
      expect(optionalMeasurementIsStructured(measurementRaw, malformed)).toBe(false);
    }

    const inventory = retainedInventory();
    const parsed: ParsedGenerationBindings = {
      inventory,
      validation: admittedValidation(inventory, "c".repeat(64)),
      candidateArtifact: { data: { record: structuredClone(candidateRecord) } },
      measurementArtifact: { data: { measurement: inventory.source!.measurement } },
    };
    expect(
      generationBindingsAreStructured({ candidateRaw, measurementRaw }, parsed),
    ).toBe(true);
    expect(generationBindingsAreStructured({}, {
      ...parsed,
      candidateArtifact: {},
      measurementArtifact: {},
    })).toBe(true);

    const malformedBindings = [
      { ...parsed, inventory: null as unknown as BaselineInventory },
      { ...parsed, inventory: { ...inventory, source: undefined } },
      { ...parsed, validation: null as unknown as BaselineValidation },
      { ...parsed, candidateArtifact: {} },
      { ...parsed, measurementArtifact: {} },
    ];
    for (const malformed of malformedBindings) {
      expect(
        generationBindingsAreStructured({ candidateRaw, measurementRaw }, malformed),
      ).toBe(false);
    }
  });

  it("returns exact generation binding parse and byte-drift findings", () => {
    const malformedInput = {
      inventoryRaw: Buffer.from("{not-json"),
      validationRaw: Buffer.from("{}"),
      reportRaw: Buffer.from("report"),
      coverageRaw: Buffer.from("coverage"),
      expectedInventorySha256: "a".repeat(64),
      expectedValidationSha256: "b".repeat(64),
    };
    const malformed = validateCanonicalGenerationBindings(malformedInput);
    expect(malformed).toHaveLength(1);
    expect(malformed[0]!.code).toBe("GENERATION_BINDING_MALFORMED");
    expect(malformed[0]!.message).toContain("Canonical generation binding is malformed:");

    const reportRaw = Buffer.from("report");
    const coverageRaw = Buffer.from("coverage");
    const inventory = retainedInventory();
    inventory.source!.artifact_sha256 = sha256(reportRaw);
    inventory.source!.coverage_sha256 = sha256(coverageRaw);
    inventory.source!.measurement!.report!.sha256 = sha256(reportRaw);
    inventory.source!.measurement!.coverage!.sha256 = sha256(coverageRaw);
    const inventoryRaw = Buffer.from(JSON.stringify(inventory));
    const inventorySha = sha256(inventoryRaw);
    const validation = admittedValidation(inventory, inventorySha);
    const validationRaw = Buffer.from(JSON.stringify(validation));
    expect(validateCanonicalGenerationBindings({
      inventoryRaw,
      validationRaw,
      reportRaw,
      coverageRaw,
      expectedInventorySha256: inventorySha,
      expectedValidationSha256: sha256(validationRaw),
    })).toEqual([]);
    expect(validateCanonicalGenerationBindings({
      inventoryRaw,
      validationRaw,
      reportRaw,
      coverageRaw,
      expectedInventorySha256: "0".repeat(64),
      expectedValidationSha256: sha256(validationRaw),
    })).toContainEqual({
      code: "GENERATION_INVENTORY_DRIFT",
      message: "Admission inventory changed after validation",
    });
  });

  it("parses generation bindings and fails closed on missing nested structure", () => {
    const inventory = retainedInventory();
    const inventoryRaw = Buffer.from(JSON.stringify(inventory));
    const validation = admittedValidation(inventory, sha256(inventoryRaw));
    const validationRaw = Buffer.from(JSON.stringify(validation));

    expect(parseGenerationBindings({ inventoryRaw, validationRaw })).toEqual({
      inventory,
      validation,
      candidateArtifact: {},
      measurementArtifact: {},
    });
    expect(parseGenerationBindings({
      inventoryRaw: Buffer.from("null"),
      validationRaw,
    })).toEqual({
      finding: {
        code: "GENERATION_BINDING_MALFORMED",
        message: "Canonical generation binding is malformed: Error: generation inputs lack required object structure",
      },
    });
  });

  it("reports each generation byte binding drift independently", () => {
    const reportRaw = Buffer.from("report");
    const coverageRaw = Buffer.from("coverage");
    const inventory = retainedInventory();
    inventory.source!.artifact_sha256 = sha256(reportRaw);
    inventory.source!.coverage_sha256 = sha256(coverageRaw);
    const inventoryRaw = Buffer.from(JSON.stringify(inventory));
    const inventorySha = sha256(inventoryRaw);
    const validation = admittedValidation(inventory, inventorySha);
    const validationRaw = Buffer.from(JSON.stringify(validation));
    const input = {
      inventoryRaw,
      validationRaw,
      reportRaw,
      coverageRaw,
      expectedInventorySha256: inventorySha,
      expectedValidationSha256: sha256(validationRaw),
    };
    expect(validateGenerationByteBindings(input, inventory, validation, inventorySha)).toEqual([]);

    const cases: Array<[typeof input, BaselineValidation, string, object]> = [
      [
        { ...input, expectedInventorySha256: "0".repeat(64) },
        validation,
        inventorySha,
        { code: "GENERATION_INVENTORY_DRIFT", message: "Admission inventory changed after validation" },
      ],
      [
        { ...input, expectedValidationSha256: "0".repeat(64) },
        validation,
        inventorySha,
        { code: "GENERATION_ADMISSION_DRIFT", message: "Admission validation artifact changed before canonical generation" },
      ],
      [
        input,
        { ...validation, data: { ...validation.data, candidate_digest: "0".repeat(64) } },
        inventorySha,
        { code: "GENERATION_ADMISSION_BINDING_MISMATCH", message: "Admission validation no longer binds the exact inventory and candidate" },
      ],
      [
        { ...input, reportRaw: Buffer.from("changed-report") },
        validation,
        inventorySha,
        { code: "GENERATION_REPORT_DRIFT", message: "Source report bytes no longer match the admitted inventory" },
      ],
      [
        { ...input, coverageRaw: Buffer.from("changed-coverage") },
        validation,
        inventorySha,
        { code: "GENERATION_COVERAGE_DRIFT", message: "Source coverage bytes no longer match the admitted inventory" },
      ],
    ];
    for (const [changedInput, changedValidation, changedInventorySha, finding] of cases) {
      expect(
        validateGenerationByteBindings(
          changedInput,
          inventory,
          changedValidation,
          changedInventorySha,
        ),
      ).toEqual([finding]);
    }
  });

  it("binds optional candidate and measurement generation artifacts exactly", () => {
    const candidateFinding = {
      code: "GENERATION_CANDIDATE_DRIFT",
      message: "Candidate checkpoint bytes or inner digest no longer match the admitted inventory",
    };
    const inventory = retainedInventory();
    const candidateArtifact = {
      data: {
        record: structuredClone(candidateRecord),
        sha256: candidateDigestValue,
      },
    };
    const candidateRaw = Buffer.from(JSON.stringify(candidateArtifact));
    inventory.source!.candidate_sha256 = sha256(candidateRaw);
    inventory.source!.candidate_digest = candidateDigestValue;
    expect(validateGenerationCandidateBinding(undefined, {}, inventory)).toEqual([]);
    expect(validateGenerationCandidateBinding(candidateRaw, candidateArtifact, inventory)).toEqual([]);
    expect(validateGenerationCandidateBinding(candidateRaw, {}, inventory)).toEqual([candidateFinding]);
    expect(
      validateGenerationCandidateBinding(Buffer.from(`${candidateRaw.toString()} `), candidateArtifact, inventory),
    ).toEqual([candidateFinding]);
    expect(validateGenerationCandidateBinding(candidateRaw, {
      data: { ...candidateArtifact.data, sha256: "0".repeat(64) },
    }, inventory)).toEqual([candidateFinding]);
    expect(validateGenerationCandidateBinding(candidateRaw, candidateArtifact, {
      ...inventory,
      source: { ...inventory.source!, candidate_digest: "0".repeat(64) },
    })).toEqual([candidateFinding]);
    expect(validateGenerationCandidateBinding(candidateRaw, candidateArtifact, {})).toEqual([
      candidateFinding,
    ]);

    const measurementFinding = {
      code: "GENERATION_MEASUREMENT_DRIFT",
      message: "Measurement artifact no longer matches the admitted inventory",
    };
    const measurementArtifact = {
      data: { measurement: structuredClone(inventory.source!.measurement!) },
    };
    const measurementRaw = Buffer.from(JSON.stringify(measurementArtifact));
    inventory.source!.measurement_sha256 = sha256(measurementRaw);
    expect(validateGenerationMeasurementBinding(undefined, {}, inventory)).toEqual([]);
    expect(validateGenerationMeasurementBinding(measurementRaw, measurementArtifact, inventory)).toEqual([]);
    expect(
      validateGenerationMeasurementBinding(Buffer.from(`${measurementRaw.toString()} `), measurementArtifact, inventory),
    ).toEqual([measurementFinding]);
    expect(validateGenerationMeasurementBinding(measurementRaw, {
      data: {
        measurement: {
          ...measurementArtifact.data.measurement,
          duration_ms: measurementArtifact.data.measurement.duration_ms + 1,
        },
      },
    }, inventory)).toEqual([measurementFinding]);
    expect(validateGenerationMeasurementBinding(measurementRaw, measurementArtifact, {})).toEqual([
      measurementFinding,
    ]);
  });

  it("validates each bound baseline review field and role label", () => {
    const inventorySha = "a".repeat(64);
    const review = { decision: "APPROVE", inventorySha, reviewer: "reviewer" };
    expect(validateOneBaselineReview(review, 0, inventorySha)).toEqual([]);
    expect(validateOneBaselineReview({ ...review, decision: "REJECT" }, 0, inventorySha)).toEqual([{
      code: "COMPONENT_BASELINE_REVIEW_INVALID",
      message: "Quality review does not independently approve the bound inventory",
    }]);
    expect(validateOneBaselineReview({ ...review, inventorySha: "b".repeat(64) }, 1, inventorySha)).toEqual([{
      code: "COMPONENT_BASELINE_REVIEW_INVALID",
      message: "Security review does not independently approve the bound inventory",
    }]);
    expect(validateOneBaselineReview({ ...review, reviewer: "" }, 0, inventorySha)).toEqual([{
      code: "COMPONENT_BASELINE_REVIEW_INVALID",
      message: "Quality review does not independently approve the bound inventory",
    }]);
  });

  it("requires one exact embedded baseline lineage chain", () => {
    const makeLineage = () => {
      const baseline = admittedBaseline();
      const inventory = retainedInventory(baseline);
      inventory.source!.measurement!.duration_ms = baseline.source.measurement.duration_ms;
      const validation = admittedValidation(inventory, "a".repeat(64));
      const digest = candidateDigest(baseline.source.candidate.record);
      const reviews = [
        { candidateSha: digest, reviewer: baseline.admission.quality_reviewer },
        { candidateSha: digest, reviewer: baseline.admission.security_reviewer },
      ];
      return { baseline, inventory, validation, reviews };
    };
    const finding = {
      code: "COMPONENT_BASELINE_EMBEDDED_LINEAGE_MISMATCH",
      message: "Embedded candidate, measurement, admission, inventory, validation, or review lineage does not form one exact chain",
    };
    const valid = makeLineage();
    expect(validateEmbeddedBaselineLineage(
      valid.baseline,
      valid.inventory,
      valid.validation,
      valid.reviews,
    )).toEqual([]);

    const mutations: Array<(value: ReturnType<typeof makeLineage>) => void> = [
      (value) => { value.baseline.source.candidate.digest = "0".repeat(64); },
      (value) => { value.inventory.source!.candidate_digest = "0".repeat(64); },
      (value) => { value.inventory.source!.measurement!.candidate!.inner_sha256 = "0".repeat(64); },
      (value) => { value.baseline.source.measurement.candidate_digest = "0".repeat(64); },
      (value) => { value.baseline.admission.candidate_digest = "0".repeat(64); },
      (value) => { value.validation.data!.candidate_digest = "0".repeat(64); },
      (value) => { value.reviews[1]!.candidateSha = "0".repeat(64); },
      (value) => { value.baseline.source.measurement.candidate_commit = "0".repeat(40); },
      (value) => { value.inventory.source!.measurement!.candidate!.commit_sha = "0".repeat(40); },
      (value) => { value.inventory.source!.commit = "0".repeat(40); },
      (value) => { value.baseline.source.measurement.comparison_base.resolved_sha = "0".repeat(40); },
      (value) => { value.inventory.source!.measurement!.candidate!.comparison_base!.resolved_sha = "0".repeat(40); },
      (value) => { value.baseline.source.measurement.profile = "Q3_RELEASE_GATE"; },
      (value) => { value.inventory.source!.measurement!.candidate!.profile = "Q3_RELEASE_GATE"; },
      (value) => { value.inventory.source!.measurement!.command = "changed command"; },
      (value) => { value.inventory.source!.measurement!.duration_ms = 2; },
      (value) => { value.inventory.source!.measurement!.exit_status = 1; },
      (value) => { value.baseline.source.report_sha256 = "0".repeat(64); },
      (value) => { value.inventory.source!.measurement!.report!.sha256 = "0".repeat(64); },
      (value) => { value.baseline.source.coverage_sha256 = "0".repeat(64); },
      (value) => { value.inventory.source!.measurement!.coverage!.sha256 = "0".repeat(64); },
      (value) => { value.baseline.admission.author_ids = ["changed-author"]; },
      (value) => { value.validation.data!.author_ids = ["changed-author"]; },
      (value) => { value.baseline.admission.quality_reviewer = "changed-reviewer"; },
      (value) => { value.baseline.admission.security_reviewer = "changed-reviewer"; },
      (value) => { value.validation.data!.bootstrap = false; },
      (value) => { value.inventory.admission!.bootstrap = false; },
      (value) => { value.validation.data!.predecessor_baseline_sha256 = "0".repeat(64); },
    ];
    for (const mutate of mutations) {
      const changed = makeLineage();
      mutate(changed);
      expect(validateEmbeddedBaselineLineage(
        changed.baseline,
        changed.inventory,
        changed.validation,
        changed.reviews,
      )).toEqual([finding]);
    }

    const missingAuthors = makeLineage();
    delete missingAuthors.inventory.admission!.author_ids;
    expect(validateEmbeddedBaselineLineage(
      missingAuthors.baseline,
      missingAuthors.inventory,
      missingAuthors.validation,
      missingAuthors.reviews,
    )).toEqual([finding]);

    const missingSource = makeLineage();
    delete missingSource.inventory.source;
    expect(validateEmbeddedBaselineLineage(
      missingSource.baseline,
      missingSource.inventory,
      missingSource.validation,
      missingSource.reviews,
    )).toEqual([finding]);

    const missingValidation = makeLineage();
    delete missingValidation.validation.data;
    expect(validateEmbeddedBaselineLineage(
      missingValidation.baseline,
      missingValidation.inventory,
      missingValidation.validation,
      missingValidation.reviews,
    )).toEqual([finding]);

    const missingReviews = makeLineage();
    expect(validateEmbeddedBaselineLineage(
      missingReviews.baseline,
      missingReviews.inventory,
      missingReviews.validation,
      [],
    )).toEqual([finding]);
  });

  it("normalizes file-backed baseline inputs and stops on structural findings", async () => {
    const inventory = retainedInventory();
    expect(structuredRuntimeInventory(inventory)).toBe(inventory);
    expect(structuredRuntimeInventory(null)).toEqual({});
    expect(baselineInventoryAuthorIds(inventory)).toEqual(["author"]);
    expect(baselineInventoryAuthorIds({})).toEqual([]);

    const findings = await validateCanonicalBaselineArtifacts(root, null);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings.every((finding) => finding.code.startsWith("COMPONENT_BASELINE_"))).toBe(true);
  });

  it("reports exact new failures, removed files, and test-count regressions", () => {
    const baseline = admittedBaseline();
    const leaf = {
      identity: "new-identity",
      file: "tests/vitest/new.test.ts",
      test: "fails exactly",
      kind: "test_failure" as const,
      signature: "expected true",
    };
    expect(findNewComponentFailures([], baseline.allowed_failures)).toEqual([]);
    expect(findNewComponentFailures([{
      ...leaf,
      identity: baseline.allowed_failures[0]!.identity,
    }], baseline.allowed_failures)).toEqual([]);
    expect(findNewComponentFailures([{
      ...leaf,
      kind: "collection_failure",
    }], baseline.allowed_failures)).toEqual([]);
    expect(findNewComponentFailures([leaf], baseline.allowed_failures)).toEqual([{
      code: "COMPONENT_FAILURE_NEW_OR_SWAPPED",
      message: "tests/vitest/new.test.ts: fails exactly",
      path: "tests/vitest/new.test.ts",
      detail: { identity: "new-identity" },
    }]);

    expect(findRemovedComponentTestFiles(["a.test.ts"], ["a.test.ts"])).toEqual([]);
    expect(findRemovedComponentTestFiles(["a.test.ts"], ["a.test.ts", "b.test.ts"])).toEqual([{
      code: "COMPONENT_TEST_FILE_REMOVED",
      message: "Baseline test file b.test.ts was not collected",
      path: "b.test.ts",
    }]);

    expect(findComponentTestCountRegression({ numTotalTests: 2 }, 2)).toEqual([]);
    expect(findComponentTestCountRegression({ numTotalTests: 1 }, 2)).toEqual([{
      code: "COMPONENT_TEST_COUNT_REGRESSION",
      message: "Collected 1 tests; baseline requires at least 2",
    }]);
    expect(findComponentTestCountRegression({}, 1)).toEqual([{
      code: "COMPONENT_TEST_COUNT_REGRESSION",
      message: "Collected 0 tests; baseline requires at least 1",
    }]);
  });

  it("validates successor denominator evidence, missing files, and stable order", () => {
    const malformedFinding = {
      code: "COMPONENT_SUCCESSOR_COVERAGE_EVIDENCE_MALFORMED",
      message: "Successor denominator admission requires structurally complete current and predecessor coverage",
    };
    expect(validateSuccessorCoverageDenominators({} as CoverageSummary, coverage(80))).toEqual([
      malformedFinding,
    ]);
    expect(validateSuccessorCoverageDenominators(coverage(80), {} as CoverageSummary)).toEqual([
      malformedFinding,
    ]);
    expect(validateSuccessorCoverageDenominators(coverage(80), coverage(80))).toEqual([]);
    expect(validateSuccessorCoverageDenominators(hiddenUncoveredReduction(), coverage(80))).toEqual([{
      code: "COMPONENT_SUCCESSOR_COVERAGE_DENOMINATOR_REGRESSION",
      message: "src/example.ts statements total 99 is below predecessor 100",
      path: "src/example.ts",
    }]);

    const metricValue = (total: number, covered: number) => ({
      total,
      covered,
      skipped: 0,
      pct: total === 0 ? 100 : (covered / total) * 100,
    });
    const metrics = (total: number, covered: number): CoverageSummary["total"] => ({
      statements: metricValue(total, covered),
      branches: metricValue(total, covered),
      functions: metricValue(total, covered),
      lines: metricValue(total, covered),
    });
    const emptyCoverage: CoverageSummary = { total: metrics(0, 0) };
    expect(validateSuccessorCoverageDenominators(emptyCoverage, coverage(80))).toEqual([
      "statements",
      "branches",
      "functions",
      "lines",
    ].map((metric) => ({
      code: "COMPONENT_SUCCESSOR_COVERAGE_DENOMINATOR_REGRESSION",
      message: `src/example.ts ${metric} is missing; predecessor total is 100`,
      path: "src/example.ts",
    })));

    const predecessor: CoverageSummary = {
      total: metrics(2, 2),
      "z.ts": metrics(1, 1),
      "a.ts": metrics(1, 1),
    };
    const current: CoverageSummary = {
      total: metrics(0, 0),
      "z.ts": metrics(0, 0),
      "a.ts": metrics(0, 0),
    };
    expect(
      validateSuccessorCoverageDenominators(current, predecessor).map((finding) => finding.path),
    ).toEqual([
      "a.ts", "a.ts", "a.ts", "a.ts",
      "z.ts", "z.ts", "z.ts", "z.ts",
    ]);
  });

  it("dispatches malformed, missing, and newly uncovered coverage exactly", () => {
    const baseline = admittedBaseline();
    const sourceMetrics = coverage(80)["src/example.ts"]!;
    expect(componentCoverageFileRegressions(
      "missing.ts",
      undefined,
      sourceMetrics,
      false,
    )).toEqual([{
      code: "COMPONENT_COVERAGE_FILE_MISSING",
      message: "Coverage no longer reports missing.ts",
      path: "missing.ts",
    }]);
    expect(componentCoverageFileRegressions(
      "new.ts",
      coverage(100)["src/example.ts"],
      undefined,
      false,
    )).toEqual([]);

    const malformed = findComponentCoverageRegressions(
      { total: null } as unknown as CoverageSummary,
      coverage(80),
      baseline,
      root,
    );
    expect(malformed.length).toBeGreaterThan(0);
    expect(malformed.every((finding) => finding.code === "COMPONENT_COVERAGE_MALFORMED")).toBe(true);
    expect(findComponentCoverageRegressions(
      coverage(80),
      { total: null } as unknown as CoverageSummary,
      baseline,
      root,
    )).toEqual([{
      code: "COMPONENT_BASELINE_SHAPE_MALFORMED",
      message: "Component baseline coverage is malformed",
    }]);

    const metricValue = (total: number, covered: number) => ({
      total,
      covered,
      skipped: 0,
      pct: total === 0 ? 100 : (covered / total) * 100,
    });
    const metrics = (total: number, covered: number): CoverageSummary["total"] => ({
      statements: metricValue(total, covered),
      branches: metricValue(total, covered),
      functions: metricValue(total, covered),
      lines: metricValue(total, covered),
    });
    const current: CoverageSummary = {
      total: metrics(2, 0),
      "z.ts": metrics(1, 0),
      "a.ts": metrics(1, 0),
    };
    const predecessor: CoverageSummary = { total: metrics(0, 0) };
    expect(findComponentCoverageRegressions(current, predecessor, baseline, root)
      .map((finding) => finding.path)
      .filter((path) => path === "a.ts" || path === "z.ts"))
      .toEqual([
        "a.ts", "a.ts", "a.ts", "a.ts",
        "z.ts", "z.ts", "z.ts", "z.ts",
      ]);
  });

  it("parses exactly one regular Git blob record", () => {
    const sha1 = "A".repeat(40);
    const sha256Object = "b".repeat(64);
    expect(singleNullTerminatedRecord("record\0")).toBe("record");
    expect(singleNullTerminatedRecord("\0")).toBe("");
    expect(singleNullTerminatedRecord("record")).toBeNull();
    expect(singleNullTerminatedRecord("record\0tail")).toBeNull();
    expect(singleNullTerminatedRecord("first\0\0")).toBeNull();
    expect(singleNullTerminatedRecord("first\0second\0")).toBeNull();

    const validOutput = `100644 blob ${sha1}\tsrc/file.ts\0`;
    expect(regularGitBlobObjectIdFromCommand(0, validOutput, "src/file.ts")).toBe(
      sha1.toLowerCase(),
    );
    expect(regularGitBlobObjectIdFromCommand(1, validOutput, "src/file.ts")).toBeNull();
    expect(regularGitBlobObjectIdFromCommand(null, validOutput, "src/file.ts")).toBeNull();

    expect(regularGitBlobObjectId(
      `100644 blob ${sha1}\tsrc/file.ts`,
      "src/file.ts",
    )).toBe(sha1.toLowerCase());
    expect(regularGitBlobObjectId(
      `100755 blob ${sha256Object}\tscripts/run.sh`,
      "scripts/run.sh",
    )).toBe(sha256Object);
    for (const [record, path] of [
      [`100644 blob ${sha1} src/file.ts`, "src/file.ts"],
      [`100644 blob ${sha1}\tsrc/file.ts\textra`, "src/file.ts"],
      [`100644 blob ${sha1}\tsrc/other.ts`, "src/file.ts"],
      [`x100644 blob ${sha1}\tsrc/file.ts`, "src/file.ts"],
      [`100644 blob ${sha1}x\tsrc/file.ts`, "src/file.ts"],
      [`120000 blob ${sha1}\tsrc/file.ts`, "src/file.ts"],
      [`100644 tree ${sha1}\tsrc/file.ts`, "src/file.ts"],
      [`100644 blob ${"a".repeat(39)}\tsrc/file.ts`, "src/file.ts"],
      [`100644 blob ${"g".repeat(40)}\tsrc/file.ts`, "src/file.ts"],
    ]) {
      expect(regularGitBlobObjectId(record, path)).toBeNull();
    }
  });

  it("reads immutable Git blobs and compares clean-filtered source bytes", () => {
    const repositoryRoot = mkdtempSync(join(tmpdir(), "component-git-blob-"));
    try {
      initializeTestGit(repositoryRoot);
      mkdirSync(join(repositoryRoot, "src"), { recursive: true });
      writeFileSync(join(repositoryRoot, "src/file.ts"), "before\n");
      runTestGit(repositoryRoot, ["add", "src/file.ts"]);
      runTestGit(repositoryRoot, ["commit", "-m", "add source"]);
      const commit = runTestGit(repositoryRoot, ["rev-parse", "HEAD"]);
      const objectId = readRegularGitBlobObjectId(repositoryRoot, commit, "src/file.ts");
      expect(objectId).toMatch(/^[0-9a-f]{40}$/u);
      expect(readGitBlob(repositoryRoot, objectId!)).toEqual(Buffer.from("before\n"));
      expect(readRegularGitBlobObjectId(repositoryRoot, commit, "src/missing.ts")).toBeNull();
      expect(readRegularGitBlobObjectId(repositoryRoot, "0".repeat(40), "src/file.ts")).toBeNull();
      expect(readGitBlob(repositoryRoot, "0".repeat(40))).toBeNull();
      expect(cleanFilteredSourceChangedSinceCommit(
        repositoryRoot,
        commit,
        "src/file.ts",
      )).toBe(false);

      writeFileSync(join(repositoryRoot, "src/file.ts"), "after\n");
      expect(cleanFilteredSourceChangedSinceCommit(
        repositoryRoot,
        commit,
        "src/file.ts",
      )).toBe(true);
      writeFileSync(join(repositoryRoot, "src/file.ts"), Buffer.from([0]));
      expect(cleanFilteredSourceChangedSinceCommit(
        repositoryRoot,
        commit,
        "src/file.ts",
      )).toBe(false);

      writeFileSync(join(repositoryRoot, "src/binary.ts"), Buffer.from([0]));
      runTestGit(repositoryRoot, ["add", "src/binary.ts"]);
      runTestGit(repositoryRoot, ["commit", "-m", "add binary source"]);
      const binaryCommit = runTestGit(repositoryRoot, ["rev-parse", "HEAD"]);
      writeFileSync(join(repositoryRoot, "src/binary.ts"), "text\n");
      expect(cleanFilteredSourceChangedSinceCommit(
        repositoryRoot,
        binaryCommit,
        "src/binary.ts",
      )).toBe(false);
    } finally {
      rmSync(repositoryRoot, { recursive: true, force: true });
    }
  });

  it("detects candidate-bound source changes without unsafe fallbacks", () => {
    const repositoryRoot = mkdtempSync(join(tmpdir(), "component-source-change-"));
    try {
      initializeTestGit(repositoryRoot);
      mkdirSync(join(repositoryRoot, "src"), { recursive: true });
      const sourcePath = join(repositoryRoot, "src/file.ts");
      writeFileSync(sourcePath, "before\n");
      runTestGit(repositoryRoot, ["add", "src/file.ts"]);
      runTestGit(repositoryRoot, ["commit", "-m", "add source"]);
      const commit = runTestGit(repositoryRoot, ["rev-parse", "HEAD"]);
      const baseline = admittedBaseline();
      baseline.source.candidate.record.commit_sha = commit;
      const currentBytes = Buffer.from("after\n");
      writeFileSync(sourcePath, currentBytes);
      const changedFile = {
        path: "src/file.ts",
        sha256: sha256("different bytes"),
        line_ending_neutral_sha256: sha256("different bytes"),
        deleted: false,
        sources: ["unstaged" as const],
      };

      expect(componentSourceChangedSinceBaseline("total", baseline, repositoryRoot)).toBe(false);
      expect(componentSourceChangedSinceBaseline("../outside.ts", baseline, repositoryRoot)).toBe(false);
      expect(componentSourceChangedSinceBaseline("src/missing.ts", baseline, repositoryRoot)).toBe(false);

      writeFileSync(join(repositoryRoot, "total"), currentBytes);
      baseline.source.candidate.record.changed_files = [{ ...changedFile, path: "total" }];
      expect(componentSourceChangedSinceBaseline("total", baseline, repositoryRoot)).toBe(false);

      baseline.source.candidate.record.changed_files = [{ ...changedFile, deleted: true }];
      expect(componentSourceChangedSinceBaseline("src/file.ts", baseline, repositoryRoot)).toBe(false);
      baseline.source.candidate.record.changed_files = [{
        ...changedFile,
        sha256: sha256(currentBytes),
        line_ending_neutral_sha256: "0".repeat(64),
      }];
      expect(componentSourceChangedSinceBaseline("src/file.ts", baseline, repositoryRoot)).toBe(false);
      baseline.source.candidate.record.changed_files = [{
        ...changedFile,
        line_ending_neutral_sha256: undefined,
      }];
      expect(componentSourceChangedSinceBaseline("src/file.ts", baseline, repositoryRoot)).toBe(false);
      writeFileSync(sourcePath, Buffer.from([0]));
      baseline.source.candidate.record.changed_files = [changedFile];
      expect(componentSourceChangedSinceBaseline("src/file.ts", baseline, repositoryRoot)).toBe(false);

      writeFileSync(sourcePath, currentBytes);
      expect(componentSourceChangedSinceBaseline("src/file.ts", baseline, repositoryRoot)).toBe(true);
      baseline.source.candidate.record.changed_files = [
        { ...changedFile, path: "src/other.ts", deleted: true },
        changedFile,
      ];
      expect(componentSourceChangedSinceBaseline("src/file.ts", baseline, repositoryRoot)).toBe(true);

      writeFileSync(sourcePath, "line\n");
      baseline.source.candidate.record.changed_files = [{
        ...changedFile,
        sha256: sha256("line\r\n"),
        line_ending_neutral_sha256: sha256("line\n"),
      }];
      expect(componentSourceChangedSinceBaseline("src/file.ts", baseline, repositoryRoot)).toBe(false);

      writeFileSync(sourcePath, "after\n");
      baseline.source.candidate.record.changed_files = [];
      expect(componentSourceChangedSinceBaseline("src/file.ts", baseline, repositoryRoot)).toBe(true);
    } finally {
      rmSync(repositoryRoot, { recursive: true, force: true });
    }
  });

  it("reports exact new and existing coverage metric regressions", () => {
    expect(newCoverageFileMetricRegression(
      "new.ts",
      "statements",
      { total: 100, covered: 100, skipped: 0, pct: 100 },
    )).toEqual([]);
    expect(newCoverageFileMetricRegression(
      "new.ts",
      "statements",
      { total: 100, covered: 80, skipped: 0, pct: 80 },
    )).toEqual([{
      code: "COMPONENT_COVERAGE_REGRESSION",
      message: "new.ts statements introduces 20 uncovered item(s) beyond the baseline file set",
      path: "new.ts",
    }]);

    const baseline = { total: 100, covered: 80, skipped: 0, pct: 80 };
    expect(existingCoverageFileMetricRegression(
      "src/file.ts",
      "lines",
      baseline,
      baseline,
      false,
    )).toEqual([]);
    expect(existingCoverageFileMetricRegression(
      "src/file.ts",
      "lines",
      { total: 100, covered: 79, skipped: 0, pct: 79 },
      baseline,
      false,
    )).toEqual([{
      code: "COMPONENT_COVERAGE_REGRESSION",
      message: "src/file.ts lines effective uncovered count 21 is worse than baseline 20",
      path: "src/file.ts",
    }]);
    const shrunk = { total: 90, covered: 75, skipped: 0, pct: 83.33 };
    expect(existingCoverageFileMetricRegression(
      "src/file.ts",
      "lines",
      shrunk,
      baseline,
      false,
    )).toEqual([{
      code: "COMPONENT_COVERAGE_REGRESSION",
      message: "src/file.ts lines effective uncovered count 25 is worse than baseline 20",
      path: "src/file.ts",
    }]);
    expect(existingCoverageFileMetricRegression(
      "src/file.ts",
      "lines",
      shrunk,
      baseline,
      true,
    )).toEqual([]);
    expect(existingCoverageFileMetricRegression(
      "total",
      "lines",
      shrunk,
      baseline,
      false,
    )).toEqual([]);
  });

  it("stops ratchet orchestration on baseline or current coverage findings", () => {
    const malformedBaseline = admittedBaseline();
    malformedBaseline.status = "draft" as "admitted";
    const expectedBaselineFindings = validateComponentBaseline(malformedBaseline);
    expect(expectedBaselineFindings.length).toBeGreaterThan(0);
    expect(compareComponentRatchet(
      report("failed", "swapped failure"),
      coverage(0),
      malformedBaseline,
      root,
    )).toEqual(expectedBaselineFindings);

    const baseline = admittedBaseline();
    const malformedCoverage = { total: null } as unknown as CoverageSummary;
    const expectedCoverageFindings = findComponentCoverageRegressions(
      malformedCoverage,
      baseline.coverage,
      baseline,
      root,
    );
    expect(compareComponentRatchet(
      report("failed", "swapped failure"),
      malformedCoverage,
      baseline,
      root,
    )).toEqual(expectedCoverageFindings);
  });

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

  it("normalizes portable coverage identities and reports exact alias diagnostics", () => {
    const coverageRoot = resolve("coverage-root");
    const metrics = coverage(100).total;
    expect(
      normalizeComponentCoveragePaths(
        {
          total: metrics,
          "src//?/example.ts": metrics,
        },
        coverageRoot,
      ),
    ).toEqual({
      total: metrics,
      "src/?/example.ts": metrics,
    });
    expect(
      normalizeComponentCoveragePaths(
        {
          total: metrics,
          "src//server/other.ts": metrics,
        },
        coverageRoot,
      ),
    ).toEqual({
      total: metrics,
      "src/server/other.ts": metrics,
    });
    expect(() =>
      normalizeComponentCoveragePaths(
        { total: metrics, "src/Example.ts": metrics, "src/example.ts": metrics },
        coverageRoot,
      ),
    ).toThrowError(new Error("Coverage paths collide at src/example.ts"));

    const aliasCases = [
      ["", "Coverage path  is outside the repository or aliases total"],
      [".", "Coverage path . contains a Windows trailing dot or space alias"],
      ["..", "Coverage path .. contains a Windows trailing dot or space alias"],
      ["\\\\server\\share\\outside.ts", "Coverage path \\\\server\\share\\outside.ts uses an unsupported Windows namespace or UNC path"],
      ["\\\\?\\C:\\repo\\src\\example.ts", "Coverage path \\\\?\\C:\\repo\\src\\example.ts uses an unsupported Windows namespace or UNC path"],
      ["\\\\.\\C:\\Windows\\win.ini", "Coverage path \\\\.\\C:\\Windows\\win.ini uses an unsupported Windows namespace or UNC path"],
      ["src/example.ts.", "Coverage path src/example.ts. contains a Windows trailing dot or space alias"],
      ["src/example.ts ", "Coverage path src/example.ts  contains a Windows trailing dot or space alias"],
      ["src/C:/file.ts", "Coverage path src/C:/file.ts contains an NTFS alternate data stream or colon alias"],
      ["CC:/file.ts", "Coverage path CC:/file.ts contains an NTFS alternate data stream or colon alias"],
      ["C:x/file.ts", "Coverage path C:x/file.ts contains an NTFS alternate data stream or colon alias"],
    ] as const;
    for (const [path, message] of aliasCases) {
      expect(() =>
        normalizeComponentCoveragePaths({ total: metrics, [path]: metrics }, coverageRoot),
      ).toThrowError(new Error(message));
    }
    const totalAlias = resolve(coverageRoot, "total");
    expect(() =>
      normalizeComponentCoveragePaths({ total: metrics, [totalAlias]: metrics }, coverageRoot),
    ).toThrowError(
      new Error(`Coverage path ${totalAlias} is outside the repository or aliases total`),
    );
  });

  it("rejects malformed and contradictory coverage with exact diagnostics", () => {
    const coverageRoot = resolve("coverage-root");
    const metrics = coverage(100).total;
    expect(() =>
      normalizeComponentCoveragePaths({ total: null } as unknown as CoverageSummary, coverageRoot),
    ).toThrowError(new Error("Coverage summary contains malformed metrics"));
    expect(() => normalizeComponentCoveragePaths({ total: metrics }, coverageRoot)).toThrowError(
      new Error(
        "Component coverage must contain complete finite metrics whose aggregate counters exactly match file counters",
      ),
    );
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

  it("accepts only canonical component candidate records", () => {
    const canonical = (): CandidateRecord => ({
      schema_version: 1,
      commit_sha: "1".repeat(40),
      comparison_base: { input_ref: "main", resolved_sha: "2".repeat(40) },
      profile: "Q2_CRITICAL_CHANGE_GATE",
      changed_files: [
        {
          path: "a.ts",
          sha256: "a".repeat(64),
          line_ending_neutral_sha256: null,
          deleted: false,
          sources: ["committed", "staged"],
        },
        {
          path: "b.ts",
          sha256: "b".repeat(64),
          line_ending_neutral_sha256: "c".repeat(64),
          deleted: false,
          sources: ["unstaged", "untracked"],
        },
        {
          path: "deleted.ts",
          sha256: "d".repeat(64),
          deleted: true,
          sources: ["committed"],
        },
      ],
      affected_capabilities: ["CAP-A", "CAP-Z"],
    });
    expect(candidateRecordIsNormalized(canonical())).toBe(true);
    const q3 = canonical();
    q3.profile = "Q3_RELEASE_GATE";
    expect(candidateRecordIsNormalized(q3)).toBe(true);
    expect(candidateRecordIsNormalized(null)).toBe(false);
    expect(candidateRecordIsNormalized([])).toBe(false);
    const callable = Object.assign(() => undefined, canonical());
    expect(candidateRecordIsNormalized(callable)).toBe(false);
    expect(normalizedIdentityList(["author-a", "reviewer_1"])).toBe(true);
    expect(normalizedIdentityList(["@author", "reviewer"])).toBe(false);
    expect(normalizedIdentityList(["author@", "reviewer"])).toBe(false);
    expect(normalizedIdentityList(["author", "reviewer@"])).toBe(false);

    const canonicalFile = canonical().changed_files[0]!;
    expect(candidateFileIsNormalized(canonicalFile)).toBe(true);
    expect(candidateFileIsNormalized({ ...canonicalFile, path: 1 })).toBe(false);
    expect(candidateFileIsNormalized({ ...canonicalFile, path: "" })).toBe(false);
    expect(candidateFileIsNormalized({
      ...canonicalFile,
      sha256: { toString: () => "a".repeat(64) },
    })).toBe(false);

    const invalidMutations: Array<(value: CandidateRecord) => void> = [
      (value) => { (value as unknown as Record<string, unknown>).schema_version = 2; },
      (value) => { value.commit_sha = "0".repeat(39); },
      (value) => { value.commit_sha = "0".repeat(41); },
      (value) => { value.commit_sha = `g${"0".repeat(39)}`; },
      (value) => { value.commit_sha = `A${"0".repeat(39)}`; },
      (value) => { (value as unknown as Record<string, unknown>).comparison_base = null; },
      (value) => { (value.comparison_base as unknown as Record<string, unknown>).input_ref = 1; },
      (value) => { value.comparison_base.input_ref = ""; },
      (value) => { value.comparison_base.resolved_sha = "0".repeat(39); },
      (value) => { value.comparison_base.resolved_sha = "0".repeat(41); },
      (value) => { value.comparison_base.resolved_sha = `g${"0".repeat(39)}`; },
      (value) => { value.comparison_base.resolved_sha = `A${"0".repeat(39)}`; },
      (value) => { value.profile = "Q1_CHANGE_GATE"; },
      (value) => { (value as unknown as Record<string, unknown>).changed_files = {}; },
      (value) => { (value.changed_files as unknown[]) = [null]; },
      (value) => { (value.changed_files[0] as unknown as Record<string, unknown>).path = 1; },
      (value) => { value.changed_files[0]!.path = ""; },
      (value) => { value.changed_files[0]!.sha256 = "0".repeat(63); },
      (value) => { value.changed_files[0]!.sha256 = "0".repeat(65); },
      (value) => { value.changed_files[0]!.sha256 = `g${"0".repeat(63)}`; },
      (value) => { value.changed_files[0]!.sha256 = `A${"0".repeat(63)}`; },
      (value) => {
        (value.changed_files[0] as unknown as Record<string, unknown>).sha256 = {
          toString: () => "a".repeat(64),
        };
      },
      (value) => { (value.changed_files[0] as unknown as Record<string, unknown>).deleted = "false"; },
      (value) => { value.changed_files[0]!.line_ending_neutral_sha256 = "0".repeat(63); },
      (value) => { value.changed_files[0]!.line_ending_neutral_sha256 = "0".repeat(65); },
      (value) => { value.changed_files[2]!.line_ending_neutral_sha256 = "0".repeat(64); },
      (value) => { (value.changed_files[0] as unknown as Record<string, unknown>).sources = {}; },
      (value) => { (value.changed_files[0]!.sources as unknown[]) = [1]; },
      (value) => { value.changed_files[0]!.sources = ["committed", ""]; },
      (value) => { value.changed_files[0]!.sources = ["committed", "committed"]; },
      (value) => { value.changed_files[0]!.sources = ["staged", "committed"]; },
      (value) => { (value.changed_files[0]!.sources as string[]) = ["committed", "unknown"]; },
      (value) => { (value.changed_files[0]!.sources as string[]) = ["unknown"]; },
      (value) => { value.changed_files.reverse(); },
      (value) => { value.changed_files[1]!.path = value.changed_files[0]!.path; },
      (value) => { (value as unknown as Record<string, unknown>).affected_capabilities = {}; },
      (value) => { (value.affected_capabilities as unknown[]) = [1]; },
      (value) => {
        (value.affected_capabilities as unknown[]) = [{ length: 1, toString: () => "CAP-A" }];
      },
      (value) => { value.affected_capabilities = [""]; },
      (value) => { value.affected_capabilities = ["CAP-A", ""]; },
      (value) => { value.affected_capabilities = ["CAP-A", "CAP-A"]; },
      (value) => { value.affected_capabilities = ["CAP-Z", "CAP-A"]; },
    ];
    for (const mutate of invalidMutations) {
      const value = canonical();
      mutate(value);
      expect(candidateRecordIsNormalized(value)).toBe(false);
    }
  });

  it("rejects every malformed baseline source field with one stable finding", () => {
    const expected = {
      code: "COMPONENT_BASELINE_SOURCE_MALFORMED",
      message: "Component baseline source evidence is missing or malformed",
    };
    const invalidSourceMutations: Array<(baseline: ComponentBaseline) => void> = [
      (baseline) => { baseline.source.command = ""; },
      (baseline) => { (baseline.source as unknown as Record<string, unknown>).command = 1; },
      (baseline) => {
        (baseline.source as unknown as Record<string, unknown>).command = { length: 1 };
      },
      (baseline) => { baseline.source.report = "artifacts/source.vitest.json"; },
      (baseline) => { baseline.source.report_sha256 = "a".repeat(63); },
      (baseline) => { baseline.source.coverage = "artifacts/coverage-summary.json"; },
      (baseline) => { baseline.source.coverage_sha256 = "b".repeat(63); },
      (baseline) => { (baseline.source as unknown as Record<string, unknown>).candidate = null; },
      (baseline) => { baseline.source.candidate.digest = "c".repeat(63); },
      (baseline) => { baseline.source.candidate.digest = "0".repeat(64); },
      (baseline) => { baseline.source.candidate.record.profile = "Q1_CHANGE_GATE"; },
      (baseline) => { (baseline.source as unknown as Record<string, unknown>).measurement = null; },
      (baseline) => {
        (baseline.source.measurement as unknown as Record<string, unknown>).comparison_base = null;
      },
      (baseline) => {
        (baseline.source.measurement as unknown as Record<string, unknown>).integrity_status = "FAIL";
      },
      (baseline) => { baseline.source.measurement.command = ""; },
      (baseline) => {
        (baseline.source.measurement as unknown as Record<string, unknown>).command = 1;
      },
      (baseline) => {
        (baseline.source.measurement as unknown as Record<string, unknown>).command = { length: 1 };
      },
      (baseline) => { baseline.source.measurement.duration_ms = 1.5; },
      (baseline) => { baseline.source.measurement.duration_ms = -1; },
      (baseline) => { baseline.source.measurement.exit_status = 1.5; },
      (baseline) => { baseline.source.measurement.candidate_digest = "d".repeat(63); },
      (baseline) => { baseline.source.measurement.candidate_commit = "0".repeat(39); },
      (baseline) => { baseline.source.measurement.candidate_commit = "0".repeat(41); },
      (baseline) => { baseline.source.measurement.candidate_commit = `g${"0".repeat(39)}`; },
      (baseline) => { baseline.source.measurement.candidate_commit = `A${"0".repeat(39)}`; },
      (baseline) => { baseline.source.measurement.comparison_base.input_ref = ""; },
      (baseline) => {
        (baseline.source.measurement.comparison_base as unknown as Record<string, unknown>).input_ref = 1;
      },
      (baseline) => {
        (baseline.source.measurement.comparison_base as unknown as Record<string, unknown>).input_ref = {
          length: 1,
        };
      },
      (baseline) => {
        baseline.source.measurement.comparison_base.resolved_sha = "0".repeat(39);
      },
      (baseline) => {
        baseline.source.measurement.comparison_base.resolved_sha = "0".repeat(41);
      },
      (baseline) => {
        baseline.source.measurement.comparison_base.resolved_sha = `g${"0".repeat(39)}`;
      },
      (baseline) => {
        baseline.source.measurement.comparison_base.resolved_sha = `A${"0".repeat(39)}`;
      },
      (baseline) => { baseline.source.measurement.profile = "Q1_CHANGE_GATE"; },
      (baseline) => { baseline.source.measurement.report_sha256 = "e".repeat(63); },
      (baseline) => { baseline.source.measurement.coverage_sha256 = "f".repeat(63); },
    ];
    for (const mutate of invalidSourceMutations) {
      const baseline = admittedBaseline();
      mutate(baseline);
      expect(validateComponentBaseline(baseline)).toContainEqual(expected);
    }

    const boundary = admittedBaseline();
    boundary.source.measurement.duration_ms = 0;
    boundary.source.measurement.exit_status = 1;
    boundary.source.measurement.profile = "Q3_RELEASE_GATE";
    expect(validateComponentBaseline(boundary)).not.toContainEqual(expected);
  });

  it("validates every admission binding and canonical evidence path exactly", () => {
    const malformed = {
      code: "COMPONENT_BASELINE_ADMISSION_MALFORMED",
      message: "Component baseline lacks the complete independently reviewed admission binding",
    };
    const invalidBindingMutations: Array<(baseline: ComponentBaseline) => void> = [
      (baseline) => { delete (baseline.admission as unknown as Record<string, unknown>).inventory; },
      (baseline) => { (baseline.admission as unknown as Record<string, unknown>).extra = "extra"; },
      (baseline) => { baseline.admission.review_source = "remote" as "local-agent"; },
      (baseline) => {
        baseline.admission.reviewer_identity_assurance = "verified" as "asserted-local";
      },
      (baseline) => {
        baseline.admission.author_identity_assurance = "verified" as "asserted-local";
      },
      (baseline) => { baseline.admission.author_ids = []; },
      (baseline) => { baseline.admission.author_ids = ["author", "author"]; },
      (baseline) => { baseline.admission.author_ids = ["reviewer", "author"]; },
      (baseline) => { baseline.admission.author_ids = ["author@"]; },
      (baseline) => { baseline.admission.quality_reviewer = ""; },
      (baseline) => {
        (baseline.admission as unknown as Record<string, unknown>).quality_reviewer = {
          toString: () => "quality-reviewer",
        };
      },
      (baseline) => { baseline.admission.security_reviewer = baseline.admission.quality_reviewer; },
      (baseline) => { baseline.admission.quality_reviewer = baseline.admission.author_ids[0]!; },
      (baseline) => { baseline.admission.candidate_digest = "0".repeat(63); },
      (baseline) => { baseline.admission.predecessor_baseline_sha256 = "0".repeat(64); },
      (baseline) => {
        baseline.admission.bootstrap = false;
        baseline.admission.predecessor_baseline_sha256 = null;
      },
    ];
    for (const mutate of invalidBindingMutations) {
      const baseline = admittedBaseline();
      mutate(baseline);
      expect(validateComponentBaseline(baseline)).toContainEqual(malformed);
    }

    const fieldCases: Array<[
      (baseline: ComponentBaseline) => void,
      { code: string; message: string },
    ]> = [
      [
        (baseline) => {
          (baseline.admission as unknown as Record<string, unknown>).bootstrap = "true";
        },
        {
          code: "COMPONENT_BASELINE_ADMISSION_MALFORMED",
          message: "Component baseline admission.bootstrap must be boolean",
        },
      ],
      [
        (baseline) => { baseline.admission.predecessor_baseline_sha256 = "bad"; },
        {
          code: "COMPONENT_BASELINE_ADMISSION_MALFORMED",
          message:
            "Component baseline admission.predecessor_baseline_sha256 must be null or a SHA-256 digest",
        },
      ],
      [
        (baseline) => { baseline.admission.inventory = ""; },
        {
          code: "COMPONENT_BASELINE_ADMISSION_MALFORMED",
          message: "Component baseline admission.inventory is missing",
        },
      ],
      [
        (baseline) => { baseline.admission.inventory_sha256 = "bad"; },
        {
          code: "COMPONENT_BASELINE_ADMISSION_MALFORMED",
          message: "Component baseline admission.inventory_sha256 is not a SHA-256 digest",
        },
      ],
    ];
    for (const [mutate, expected] of fieldCases) {
      const baseline = admittedBaseline();
      mutate(baseline);
      expect(validateComponentBaseline(baseline)).toContainEqual(expected);
    }

    const wrongInventory = admittedBaseline();
    wrongInventory.admission.inventory = "artifacts/inventory.json";
    expect(validateComponentBaseline(wrongInventory)).toContainEqual({
      code: "COMPONENT_BASELINE_ADMISSION_MALFORMED",
      message: "Canonical admission must use tracked immutable component baseline paths",
    });
    const wrongAdmission = admittedBaseline();
    wrongAdmission.admission.validation_artifact = "artifacts/admission.json";
    expect(validateComponentBaseline(wrongAdmission)).toContainEqual({
      code: "COMPONENT_BASELINE_ADMISSION_MALFORMED",
      message: "Canonical admission must use tracked immutable component baseline paths",
    });

    for (const [field, path] of [
      ["quality_review_artifact", "artifacts/quality.md"],
      ["security_review_artifact", "artifacts/security.md"],
    ] as const) {
      const baseline = admittedBaseline();
      baseline.admission[field] = path;
      expect(validateComponentBaseline(baseline)).toContainEqual({
        code: "COMPONENT_BASELINE_ADMISSION_MALFORMED",
        message: "Canonical baseline reviews must use their tracked immutable paths",
        path,
      });
    }
  });

  it("validates admitted decisions and baseline suite shape exactly", () => {
    const notAdmitted = {
      code: "COMPONENT_BASELINE_NOT_ADMITTED",
      message: "Component baseline is missing an admitted schema-version-1 decision",
    };
    const schema = admittedBaseline();
    schema.schema_version = 2 as 1;
    expect(validateComponentBaseline(schema)).toContainEqual(notAdmitted);
    const status = admittedBaseline();
    status.status = "draft" as "admitted";
    expect(validateComponentBaseline(status)).toContainEqual(notAdmitted);

    const malformedShape = {
      code: "COMPONENT_BASELINE_SHAPE_MALFORMED",
      message: "Component baseline suite, failures, or coverage shape is malformed",
    };
    const invalidShapeMutations: Array<(baseline: ComponentBaseline) => void> = [
      (baseline) => { (baseline as unknown as Record<string, unknown>).suite = null; },
      (baseline) => { (baseline.suite as unknown as Record<string, unknown>).test_files = {}; },
      (baseline) => { baseline.suite.test_files = ["a.test.ts", "a.test.ts"]; },
      (baseline) => { baseline.suite.test_files = ["z.test.ts", "a.test.ts"]; },
      (baseline) => { baseline.suite.test_files = [""]; },
      (baseline) => { (baseline.suite.test_files as unknown[]) = [1]; },
      (baseline) => { baseline.suite.total_tests = -1; },
      (baseline) => { baseline.suite.total_tests = 1.5; },
      (baseline) => { (baseline as unknown as Record<string, unknown>).allowed_failures = {}; },
      (baseline) => { (baseline.allowed_failures as unknown[]) = [null]; },
      (baseline) => {
        (baseline.allowed_failures as unknown[]) = [baseline.allowed_failures[0], null];
      },
      (baseline) => { (baseline as unknown as { coverage: unknown }).coverage = { total: null }; },
    ];
    for (const mutate of invalidShapeMutations) {
      const baseline = admittedBaseline();
      mutate(baseline);
      expect(validateComponentBaseline(baseline)).toContainEqual(malformedShape);
    }

    const boundary = admittedBaseline();
    boundary.suite.test_files = ["a.test.ts", "z.test.ts"];
    boundary.suite.total_tests = 0;
    expect(validateComponentBaseline(boundary)).not.toContainEqual(malformedShape);
  });

  it("admits only current independent noncritical test debt", () => {
    const now = Date.parse("2030-01-01T00:00:00.000Z");
    const expected = (identity: string) => ({
      code: "COMPONENT_BASELINE_ILLEGAL_DEBT",
      message: `Baseline failure ${identity} is not current, independent, noncritical test debt`,
    });
    const invalidDebtMutations: Array<
      (failure: ComponentBaseline["allowed_failures"][number]) => void
    > = [
      (failure) => { failure.classification = "critical" as "ratchet_noncritical"; },
      (failure) => { failure.kind = "collection_failure" as "test_failure"; },
      (failure) => { failure.owner = ""; },
      (failure) => { failure.rationale = ""; },
      (failure) => {
        (failure as unknown as Record<string, unknown>).acceptance = undefined;
      },
      (failure) => { failure.acceptance.command = ""; },
      (failure) => { failure.acceptance.expected_artifact = ""; },
      (failure) => { failure.quality_reviewer = ""; },
      (failure) => { failure.security_reviewer = ""; },
      (failure) => { failure.security_reviewer = failure.quality_reviewer; },
      (failure) => { failure.expires_at = "not-a-date"; },
      (failure) => { failure.expires_at = "2029-12-31T23:59:59.999Z"; },
      (failure) => { failure.expires_at = "2030-01-01T00:00:00.000Z"; },
    ];
    for (const mutate of invalidDebtMutations) {
      const baseline = admittedBaseline();
      const failure = baseline.allowed_failures[0]!;
      mutate(failure);
      expect(validateComponentBaseline(baseline, now)).toContainEqual(expected(failure.identity));
    }

    const boundary = admittedBaseline();
    boundary.allowed_failures[0]!.expires_at = "2030-01-01T00:00:00.001Z";
    expect(validateComponentBaseline(boundary, now)).toEqual([]);

    const duplicate = admittedBaseline();
    duplicate.allowed_failures.push(structuredClone(duplicate.allowed_failures[0]!));
    expect(validateComponentBaseline(duplicate, now)).toEqual([
      {
        code: "COMPONENT_BASELINE_DUPLICATE_IDENTITY",
        message: `Baseline repeats failure identity ${duplicate.allowed_failures[0]!.identity}`,
      },
    ]);

    const empty = admittedBaseline();
    empty.allowed_failures = [];
    expect(validateComponentBaseline(empty, now)).toEqual([]);
  });

  it("returns exact structure findings and stops before debt checks on malformed baselines", () => {
    const structureFinding = {
      code: "COMPONENT_BASELINE_STRUCTURE_MALFORMED",
      message: "Component baseline must be an object with source and admission objects",
    };
    expect(validateComponentBaseline(null)).toEqual([structureFinding]);
    expect(validateComponentBaseline({})).toEqual([structureFinding]);

    const malformedShape = admittedBaseline();
    (malformedShape as unknown as { coverage: unknown }).coverage = { total: null };
    malformedShape.allowed_failures[0]!.classification = "critical" as "ratchet_noncritical";
    expect(validateComponentBaseline(malformedShape)).toEqual([
      {
        code: "COMPONENT_BASELINE_SHAPE_MALFORMED",
        message: "Component baseline suite, failures, or coverage shape is malformed",
      },
    ]);

    const decisionAndDebt = admittedBaseline();
    decisionAndDebt.schema_version = 2 as 1;
    decisionAndDebt.allowed_failures[0]!.classification = "critical" as "ratchet_noncritical";
    expect(validateComponentBaseline(decisionAndDebt, Date.parse("2030-01-01T00:00:00.000Z"))).toEqual([
      {
        code: "COMPONENT_BASELINE_NOT_ADMITTED",
        message: "Component baseline is missing an admitted schema-version-1 decision",
      },
      {
        code: "COMPONENT_BASELINE_ILLEGAL_DEBT",
        message: `Baseline failure ${decisionAndDebt.allowed_failures[0]!.identity} is not current, independent, noncritical test debt`,
      },
    ]);
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

  it("normalizes signatures byte-for-byte across ANSI, paths, locations, and whitespace", () => {
    expect(
      normalizedSignature(
        "  \u001b[31mError C:\\repo\\src\\one.ts:12:34\u001b[0m\n" +
          "file:///C:/repo/src/two.ts:56:78   /repo/src/three.ts:9:10  ",
      ),
    ).toBe(
      "Error <path>:<line>:<column> <path>:<line>:<column> <path>:<line>:<column>",
    );
    expect(normalizedSignature("x".repeat(510))).toBe("x".repeat(500));
    expect(normalizedSignature("plain signature")).toBe("plain signature");
  });

  it("normalizes skipped assertion names and pending counters exactly", () => {
    const skippedReport: VitestJsonReport = {
      success: true,
      numTotalTestSuites: 1,
      numPassedTestSuites: 1,
      numFailedTestSuites: 0,
      numPendingTestSuites: 0,
      numTotalTests: 4,
      numPassedTests: 1,
      numFailedTests: 0,
      numPendingTests: 3,
      numTodoTests: 0,
      testResults: [
        {
          name: "/repo/tests/vitest/skipped.test.ts",
          status: "passed",
          assertionResults: [
            { fullName: "passes", status: "passed" },
            { fullName: "full pending name", title: "ignored", status: "pending" },
            { title: "title-only skip", status: "skipped" },
            { status: "todo" },
          ],
        },
      ],
    };
    const normalized = normalizeVitestFailures(skippedReport, root);
    expect(normalized.failures).toEqual([]);
    expect(normalized.testFiles).toEqual(["tests/vitest/skipped.test.ts"]);
    expect(
      normalized.findings.filter((finding) => finding.code === "COMPONENT_TEST_SKIPPED"),
    ).toEqual([
      {
        code: "COMPONENT_TEST_SKIPPED",
        message: "Vitest reported 3 skipped or pending test(s)",
      },
      {
        code: "COMPONENT_TEST_SKIPPED",
        message: "tests/vitest/skipped.test.ts: full pending name",
        path: "tests/vitest/skipped.test.ts",
      },
      {
        code: "COMPONENT_TEST_SKIPPED",
        message: "tests/vitest/skipped.test.ts: title-only skip",
        path: "tests/vitest/skipped.test.ts",
      },
      {
        code: "COMPONENT_TEST_SKIPPED",
        message: "tests/vitest/skipped.test.ts: <unnamed test>",
        path: "tests/vitest/skipped.test.ts",
      },
    ]);
  });

  it("deduplicates and sorts exact leaf failures from unsorted files", () => {
    const fallbackAssertion = {
      ancestorTitles: ["Group", "Nested"],
      title: "fallback failure",
      status: "failed",
      failureMessages: ["first line", "second"],
    } as const;
    const failedReport: VitestJsonReport = {
      success: false,
      numTotalTestSuites: 2,
      numPassedTestSuites: 0,
      numFailedTestSuites: 2,
      numPendingTestSuites: 0,
      numTotalTests: 3,
      numPassedTests: 0,
      numFailedTests: 3,
      numPendingTests: 0,
      numTodoTests: 0,
      testResults: [
        {
          name: "/repo/tests/vitest/z.test.ts",
          status: "failed",
          assertionResults: [
            {
              fullName: "Zulu full failure",
              status: "failed",
              failureMessages: [],
            },
          ],
        },
        {
          name: "/repo/tests/vitest/a.test.ts",
          status: "failed",
          assertionResults: [fallbackAssertion, fallbackAssertion],
        },
      ],
    };
    const normalized = normalizeVitestFailures(failedReport, root);
    expect(normalized.findings).toEqual([]);
    expect(normalized.testFiles).toEqual([
      "tests/vitest/a.test.ts",
      "tests/vitest/z.test.ts",
    ]);
    expect(normalized.failures).toEqual([
      {
        identity:
          "test_failure\u0000tests/vitest/a.test.ts\u0000Group > Nested > fallback failure\u0000first line second",
        file: "tests/vitest/a.test.ts",
        test: "Group > Nested > fallback failure",
        kind: "test_failure",
        signature: "first line second",
      },
      {
        identity:
          "test_failure\u0000tests/vitest/z.test.ts\u0000Zulu full failure\u0000<missing failure message>",
        file: "tests/vitest/z.test.ts",
        test: "Zulu full failure",
        kind: "test_failure",
        signature: "<missing failure message>",
      },
    ]);
  });

  it("records collection and unhandled failures with exact fallback identities", () => {
    const collectionReport: VitestJsonReport = {
      success: false,
      numTotalTestSuites: 1,
      numPassedTestSuites: 0,
      numFailedTestSuites: 1,
      numPendingTestSuites: 0,
      numTotalTests: 1,
      numPassedTests: 1,
      numFailedTests: 0,
      numPendingTests: 0,
      numTodoTests: 0,
      testResults: [
        {
          name: "/repo/tests/vitest/collection.test.ts",
          status: "failed",
          assertionResults: [{ fullName: "collected before failure", status: "passed" }],
        },
      ],
    };
    const collection = normalizeVitestFailures(collectionReport, root);
    expect(collection.failures).toEqual([
      {
        identity:
          "collection_failure\u0000tests/vitest/collection.test.ts\u0000<collection>\u0000<missing collection failure>",
        file: "tests/vitest/collection.test.ts",
        test: "<collection>",
        kind: "collection_failure",
        signature: "<missing collection failure>",
      },
    ]);
    expect(
      collection.findings.filter((finding) => finding.code === "COMPONENT_COLLECTION_FAILURE"),
    ).toEqual([
      {
        code: "COMPONENT_COLLECTION_FAILURE",
        message: "tests/vitest/collection.test.ts: <missing collection failure>",
        path: "tests/vitest/collection.test.ts",
      },
    ]);

    const unhandled = normalizeVitestFailures(
      {
        ...report("passed"),
        unhandledErrors: ["raw error", { reason: "object error" }, undefined],
      },
      root,
    );
    expect(unhandled.failures).toEqual([
      {
        identity: "unhandled_error\u0000<runtime>\u00000\u0000raw error",
        file: "<runtime>",
        test: "0",
        kind: "unhandled_error",
        signature: "raw error",
      },
      {
        identity: 'unhandled_error\u0000<runtime>\u00001\u0000{"reason":"object error"}',
        file: "<runtime>",
        test: "1",
        kind: "unhandled_error",
        signature: '{"reason":"object error"}',
      },
      {
        identity: "unhandled_error\u0000<runtime>\u00002\u0000undefined",
        file: "<runtime>",
        test: "2",
        kind: "unhandled_error",
        signature: "undefined",
      },
    ]);
    expect(
      unhandled.findings.filter((finding) => finding.code === "COMPONENT_UNHANDLED_ERROR"),
    ).toEqual([
      { code: "COMPONENT_UNHANDLED_ERROR", message: "raw error" },
      { code: "COMPONENT_UNHANDLED_ERROR", message: '{"reason":"object error"}' },
      { code: "COMPONENT_UNHANDLED_ERROR", message: "undefined" },
    ]);
  });

  it("uses exact unknown-file and missing assertion fallbacks", () => {
    const unnamedFailure: VitestJsonReport = {
      success: false,
      numTotalTestSuites: 1,
      numPassedTestSuites: 0,
      numFailedTestSuites: 1,
      numPendingTestSuites: 0,
      numTotalTests: 1,
      numPassedTests: 0,
      numFailedTests: 1,
      numPendingTests: 0,
      numTodoTests: 0,
      testResults: [
        {
          status: "failed",
          assertionResults: [{ status: "failed" }],
        },
      ],
    };
    const unnamed = normalizeVitestFailures(unnamedFailure, root);
    expect(unnamed.failures).toEqual([
      {
        identity:
          "test_failure\u0000<unknown-test-file>\u0000<unnamed test>\u0000<missing failure message>",
        file: "<unknown-test-file>",
        test: "<unnamed test>",
        kind: "test_failure",
        signature: "<missing failure message>",
      },
    ]);
    expect(unnamed.testFiles).toEqual([]);

    const absentAssertions: VitestJsonReport = {
      ...unnamedFailure,
      numTotalTests: 0,
      numFailedTests: 0,
      testResults: [
        {
          name: "/repo/tests/vitest/collection-without-assertions.test.ts",
          status: "failed",
          message: "collection stopped",
        },
      ],
    };
    expect(normalizeVitestFailures(absentAssertions, root).failures).toEqual([
      {
        identity:
          "collection_failure\u0000tests/vitest/collection-without-assertions.test.ts\u0000<collection>\u0000collection stopped",
        file: "tests/vitest/collection-without-assertions.test.ts",
        test: "<collection>",
        kind: "collection_failure",
        signature: "collection stopped",
      },
    ]);
  });

  it("fails closed without iterating malformed runtime report collections", () => {
    expect(normalizeVitestFailures(null as unknown as VitestJsonReport, root)).toEqual({
      failures: [],
      testFiles: [],
      findings: [
        {
          code: "COMPONENT_REPORT_MALFORMED",
          message: "Vitest report must contain boolean success and a testResults array",
        },
      ],
    });
    const malformed = normalizeVitestFailures(
      {
        success: true,
        numPendingTests: "2",
        testResults: "not-an-array",
        unhandledErrors: { message: "not-an-array" },
      } as unknown as VitestJsonReport,
      root,
    );
    expect(malformed.failures).toEqual([]);
    expect(malformed.testFiles).toEqual([]);
    expect(malformed.findings.map((finding) => finding.code)).toEqual([
      "COMPONENT_REPORT_MALFORMED",
    ]);
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

  it("reports every raw failure kind with exact identity and path", () => {
    const failed = report("failed");
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
      testResults: [{
        name: "/repo/tests/vitest/collection.test.ts",
        status: "failed",
        message: "Failed to import source module",
        assertionResults: [],
      }],
    };
    const unhandled = report("passed");
    unhandled.success = false;
    unhandled.unhandledErrors = ["runtime exploded"];

    const cases: Array<[VitestJsonReport, "test_failure" | "collection_failure" | "unhandled_error", string]> = [
      [failed, "test_failure", "COMPONENT_TEST_FAILED"],
      [collection, "collection_failure", "COMPONENT_COLLECTION_FAILURE"],
      [unhandled, "unhandled_error", "COMPONENT_UNHANDLED_ERROR"],
    ];
    for (const [current, kind, code] of cases) {
      const failure = normalizeVitestFailures(current, root).failures.find(
        (candidate) => candidate.kind === kind,
      )!;
      expect(evaluateRawGreenComponentRun(current, root)).toContainEqual({
        code,
        message: `${failure.file}: ${failure.test}`,
        path: failure.file === "<runtime>" ? undefined : failure.file,
        detail: { identity: failure.identity },
      });
    }
  });

  it("rejects success and failed-count contradictions independently", () => {
    const runFinding = {
      code: "COMPONENT_RUN_NOT_GREEN",
      message: "Vitest component report did not record an unqualified green run",
    };
    const falseSuccess = report("passed");
    falseSuccess.success = false;
    expect(evaluateRawGreenComponentRun(falseSuccess, root)).toContainEqual(runFinding);

    const failedCount = report("passed");
    failedCount.numFailedTests = 1;
    expect(evaluateRawGreenComponentRun(failedCount, root)).toContainEqual(runFinding);
  });
});
