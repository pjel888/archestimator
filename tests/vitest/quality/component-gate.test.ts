import { describe, expect, it } from "vitest";
import {
  compareComponentRatchet,
  evaluateRawGreenComponentRun,
  globMatches,
  normalizeVitestFailures,
  selectStrictComponentTests,
  validateComponentBaseline,
  validateComponentProfileSelection,
  type ComponentBaseline,
  type ComponentEvidenceMap,
  type CoverageSummary,
  type VitestJsonReport,
} from "../../../scripts/quality/component-core";

const root = "/repo";
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
});

function report(
  status: "passed" | "failed" | "pending" = "passed",
  message = "expected true to be false",
): VitestJsonReport {
  return {
    success: status === "passed",
    numTotalTests: 1,
    numFailedTests: status === "failed" ? 1 : 0,
    numPendingTests: status === "pending" ? 1 : 0,
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
      numTotalTests: 0,
      numFailedTests: 0,
      numPendingTests: 0,
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
