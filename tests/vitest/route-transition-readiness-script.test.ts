import { afterEach, describe, expect, it } from "vitest";

import {
  checkRouteTransitionReadiness,
  checkScenarioReadiness,
  parseInputsFromEnv,
  parseNonNegativeInteger,
  parseNonNegativeNumber,
  parsePositiveInteger,
} from "@/../scripts/check-route-transition-readiness";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

function makeScenario(overrides: Partial<Parameters<typeof checkScenarioReadiness>[0]> = {}) {
  return {
    scenario: "Public: Landing to Login",
    from: "/",
    expectedPathname: "/login",
    networkProfile: "No throttle",
    runs: [
      { run: 1, durationMs: 410, overlayVisible: true, rscRequestCount: 1, finalPathname: "/login" },
      { run: 2, durationMs: 395, overlayVisible: true, rscRequestCount: 1, finalPathname: "/login" },
      { run: 3, durationMs: 430, overlayVisible: false, rscRequestCount: 1, finalPathname: "/login" },
    ],
    failures: [],
    medianMs: 410,
    overlayVisibilityRate: 2 / 3,
    rscRequestCount: 3,
    ...overrides,
  };
}

const thresholds = {
  minRuns: 3,
  publicMedianBudgetMs: 15_000,
  slow3gPublicMedianBudgetMs: 30_000,
  authenticatedMedianBudgetMs: 10_000,
  warmMedianBudgetMs: 500,
  generalMedianBudgetMs: 1_000,
  directMedianBudgetMs: 3_500,
  parentFallbackMax: 0,
  sheetSkeletonEpisodesMax: 1,
  overlayDurationMaxMs: 200,
  sheetContentVisibleBudgetMs: 1_000,
  generalImprovementMin: 0.3,
  overlayVisibilityRateMax: 1,
  requireHeroScenarios: false,
};

function makeTargetScenario(overrides: Partial<Parameters<typeof checkScenarioReadiness>[0]> = {}) {
  return makeScenario({
    scenario: "Authenticated Target: Estimates to Target Estimate No Hover",
    from: "/workshop/projects/{targetProjectId}/estimates",
    expectedPathname: "/workshop/projects/{targetProjectId}/estimates/{targetEstimateNodeId}",
    runs: [
      {
        run: 1,
        durationMs: 900,
        overlayVisible: true,
        parentFallbackSeen: false,
        sheetSkeletonEpisodes: 1,
        overlayDurationMs: 120,
        sheetContentVisibleAtMs: 780,
        rscRequestCount: 1,
        finalPathname: "/workshop/projects/{targetProjectId}/estimates/{targetEstimateNodeId}",
      },
      {
        run: 2,
        durationMs: 930,
        overlayVisible: true,
        parentFallbackSeen: false,
        sheetSkeletonEpisodes: 1,
        overlayDurationMs: 140,
        sheetContentVisibleAtMs: 790,
        rscRequestCount: 1,
        finalPathname: "/workshop/projects/{targetProjectId}/estimates/{targetEstimateNodeId}",
      },
      {
        run: 3,
        durationMs: 870,
        overlayVisible: false,
        parentFallbackSeen: false,
        sheetSkeletonEpisodes: 1,
        overlayDurationMs: 0,
        sheetContentVisibleAtMs: 760,
        rscRequestCount: 1,
        finalPathname: "/workshop/projects/{targetProjectId}/estimates/{targetEstimateNodeId}",
      },
    ],
    medianMs: 900,
    overlayVisibilityRate: 2 / 3,
    rscRequestCount: 3,
    ...overrides,
  });
}

describe("route transition readiness checker", () => {
  it("requires a benchmark file input from env", () => {
    process.env = {};

    expect(() => parseInputsFromEnv()).toThrow(/ROUTE_TRANSITION_BENCHMARK_FILE/);
  });

  it("parses positive numeric threshold inputs with fallback", () => {
    expect(parsePositiveInteger("25", 3)).toBe(25);
    expect(parsePositiveInteger("0", 3)).toBe(3);
    expect(parsePositiveInteger("bad", 3)).toBe(3);
    expect(parseNonNegativeInteger("0", 3)).toBe(0);
    expect(parseNonNegativeInteger("-1", 3)).toBe(3);
    expect(parseNonNegativeNumber("0.25", 1)).toBe(0.25);
    expect(parseNonNegativeNumber("-1", 1)).toBe(1);
  });

  it("parses Phase 0 target threshold inputs from env", () => {
    process.env = {
      ROUTE_TRANSITION_BENCHMARK_FILE: "/tmp/after.json",
      ROUTE_TRANSITION_BASELINE_FILE: "/tmp/before.json",
      ROUTE_TRANSITION_MIN_RUNS: "5",
      ROUTE_TRANSITION_WARM_MEDIAN_BUDGET_MS: "500",
      ROUTE_TRANSITION_GENERAL_MEDIAN_BUDGET_MS: "1000",
      ROUTE_TRANSITION_DIRECT_MEDIAN_BUDGET_MS: "3500",
      ROUTE_TRANSITION_PARENT_FALLBACK_MAX: "0",
      ROUTE_TRANSITION_SHEET_SKELETON_EPISODES_MAX: "1",
      ROUTE_TRANSITION_OVERLAY_DURATION_MAX_MS: "200",
      ROUTE_TRANSITION_SHEET_CONTENT_VISIBLE_BUDGET_MS: "1000",
      ROUTE_TRANSITION_GENERAL_IMPROVEMENT_MIN: "0.3",
      ROUTE_TRANSITION_OVERLAY_RATE_MAX: "0",
      ROUTE_TRANSITION_REQUIRE_HERO: "1",
    };

    expect(parseInputsFromEnv()).toMatchObject({
      benchmarkFile: "/tmp/after.json",
      baselineFile: "/tmp/before.json",
      minRuns: 5,
      warmMedianBudgetMs: 500,
      generalMedianBudgetMs: 1_000,
      directMedianBudgetMs: 3_500,
      parentFallbackMax: 0,
      sheetSkeletonEpisodesMax: 1,
      overlayDurationMaxMs: 200,
      sheetContentVisibleBudgetMs: 1_000,
      generalImprovementMin: 0.3,
      overlayVisibilityRateMax: 0,
      requireHeroScenarios: true,
    });
  });

  it("passes public benchmark scenarios inside thresholds", () => {
    const result = checkScenarioReadiness(makeScenario(), thresholds);

    expect(result.passed).toBe(true);
    expect(result.budgetMs).toBe(15_000);
    expect(result.maxDurationMs).toBe(430);
    expect(result.reasons).toEqual([]);
  });

  it("uses authenticated and Slow 3G budgets by scenario context", () => {
    expect(checkScenarioReadiness(makeScenario({
      scenario: "Authenticated: Workshop to Projects",
      medianMs: 9_500,
    }), thresholds).budgetMs).toBe(10_000);

    expect(checkScenarioReadiness(makeScenario({
      networkProfile: "Slow 3G",
      medianMs: 25_000,
    }), thresholds).budgetMs).toBe(30_000);
  });

  it("fails closed when runs are missing, failures exist, medians exceed budget, or overlays exceed threshold", () => {
    const result = checkScenarioReadiness(makeScenario({
      runs: [],
      failures: [{ run: 1, message: "timeout" }],
      medianMs: 16_000,
      overlayVisibilityRate: 1,
    }), { ...thresholds, overlayVisibilityRateMax: 0.5 });

    expect(result.passed).toBe(false);
    expect(result.reasons).toEqual([
      "expected at least 3 successful runs",
      "1 benchmark run failure(s)",
      "median 16000ms exceeds 15000ms budget",
      "overlay visibility rate 1 exceeds 0.5",
    ]);
  });

  it("fails closed when any measured run exceeds the scenario budget", () => {
    const result = checkScenarioReadiness(makeScenario({
      runs: [
        { run: 1, durationMs: 410, overlayVisible: true, rscRequestCount: 1, finalPathname: "/login" },
        { run: 2, durationMs: 395, overlayVisible: true, rscRequestCount: 1, finalPathname: "/login" },
        { run: 3, durationMs: 16_100, overlayVisible: false, rscRequestCount: 1, finalPathname: "/login" },
      ],
      medianMs: 410,
    }), thresholds);

    expect(result.passed).toBe(false);
    expect(result.maxDurationMs).toBe(16_100);
    expect(result.reasons).toContain("max duration 16100ms exceeds 15000ms budget");
  });

  it("passes Phase 0 target scenarios with clean timeline telemetry", () => {
    const result = checkScenarioReadiness(makeTargetScenario(), thresholds);

    expect(result.passed).toBe(true);
    expect(result.budgetMs).toBe(1_000);
    expect(result.parentFallbackCount).toBe(0);
    expect(result.maxSheetSkeletonEpisodes).toBe(1);
    expect(result.maxOverlayDurationMs).toBe(140);
    expect(result.maxSheetContentVisibleAtMs).toBe(790);
    expect(result.reasons).toEqual([]);
  });

  it("fails Phase 0 target scenarios on parent fallback, repeated sheet skeleton, overlay duration, and content timing", () => {
    const result = checkScenarioReadiness(makeTargetScenario({
      runs: [
        {
          run: 1,
          durationMs: 1_050,
          overlayVisible: true,
          parentFallbackSeen: true,
          sheetSkeletonEpisodes: 2,
          overlayDurationMs: 275,
          sheetContentVisibleAtMs: 1_250,
          rscRequestCount: 1,
          finalPathname: "/workshop/projects/{targetProjectId}/estimates/{targetEstimateNodeId}",
        },
        {
          run: 2,
          durationMs: 950,
          overlayVisible: false,
          parentFallbackSeen: false,
          sheetSkeletonEpisodes: 1,
          overlayDurationMs: 0,
          sheetContentVisibleAtMs: 900,
          rscRequestCount: 1,
          finalPathname: "/workshop/projects/{targetProjectId}/estimates/{targetEstimateNodeId}",
        },
        {
          run: 3,
          durationMs: 980,
          overlayVisible: false,
          parentFallbackSeen: false,
          sheetSkeletonEpisodes: 1,
          overlayDurationMs: 0,
          sheetContentVisibleAtMs: 940,
          rscRequestCount: 1,
          finalPathname: "/workshop/projects/{targetProjectId}/estimates/{targetEstimateNodeId}",
        },
      ],
      medianMs: 980,
    }), thresholds);

    expect(result.passed).toBe(false);
    expect(result.reasons).toContain("parent fallback seen in 1 run(s), exceeds 0");
    expect(result.reasons).toContain("sheet skeleton episodes 2 exceeds 1");
    expect(result.reasons).toContain("overlay duration 275ms exceeds 200ms budget");
    expect(result.reasons).toContain("sheet content visible at 1250ms exceeds 1000ms budget");
  });

  it("uses Phase 0 route-specific target budgets", () => {
    expect(checkScenarioReadiness(makeTargetScenario({
      scenario: "Authenticated Target: Estimates to Target Estimate Hover Prefetch",
      medianMs: 480,
      runs: makeTargetScenario().runs.map((run) => ({ ...run, durationMs: 480, sheetContentVisibleAtMs: 450 })),
    }), thresholds).budgetMs).toBe(500);

    expect(checkScenarioReadiness(makeTargetScenario({
      scenario: "Authenticated Target: Estimates to Target Estimate Warm Revisit",
      medianMs: 490,
      runs: makeTargetScenario().runs.map((run) => ({ ...run, durationMs: 490, sheetContentVisibleAtMs: 460 })),
    }), thresholds).passed).toBe(true);

    expect(checkScenarioReadiness(makeTargetScenario({
      scenario: "Authenticated Target: Cold Direct Target Estimate",
      medianMs: 3_400,
      runs: makeTargetScenario().runs.map((run) => ({ ...run, durationMs: 3_400, sheetContentVisibleAtMs: 3_200 })),
    }), thresholds).budgetMs).toBe(3_500);
  });

  it("uses median duration budgets for target scenarios while retaining hard timeline gates", () => {
    const result = checkScenarioReadiness(makeTargetScenario({
      scenario: "Authenticated Target: Estimates to Target Estimate Warm Revisit",
      medianMs: 490,
      runs: [
        {
          run: 1,
          durationMs: 1_250,
          overlayVisible: false,
          parentFallbackSeen: false,
          sheetSkeletonEpisodes: 1,
          overlayDurationMs: 0,
          sheetContentVisibleAtMs: 900,
          rscRequestCount: 0,
          finalPathname: "/workshop/projects/{targetProjectId}/estimates/{targetEstimateNodeId}",
        },
        {
          run: 2,
          durationMs: 490,
          overlayVisible: false,
          parentFallbackSeen: false,
          sheetSkeletonEpisodes: 0,
          overlayDurationMs: 0,
          sheetContentVisibleAtMs: 360,
          rscRequestCount: 0,
          finalPathname: "/workshop/projects/{targetProjectId}/estimates/{targetEstimateNodeId}",
        },
        {
          run: 3,
          durationMs: 470,
          overlayVisible: false,
          parentFallbackSeen: false,
          sheetSkeletonEpisodes: 0,
          overlayDurationMs: 0,
          sheetContentVisibleAtMs: 330,
          rscRequestCount: 0,
          finalPathname: "/workshop/projects/{targetProjectId}/estimates/{targetEstimateNodeId}",
        },
      ],
    }), thresholds);

    expect(result.passed).toBe(true);
    expect(result.reasons).toEqual([]);
    expect(result.maxDurationMs).toBe(1_250);
    expect(result.sheetContentVisibleBudgetMs).toBe(1_000);
  });

  it("uses the direct-cold budget for direct target sheet-content timing", () => {
    const result = checkScenarioReadiness(makeTargetScenario({
      scenario: "Authenticated Target: Cold Direct Target Estimate",
      medianMs: 2_400,
      runs: makeTargetScenario().runs.map((run) => ({ ...run, durationMs: 2_400, sheetContentVisibleAtMs: 2_300 })),
    }), thresholds);

    expect(result.passed).toBe(true);
    expect(result.budgetMs).toBe(3_500);
    expect(result.sheetContentVisibleBudgetMs).toBe(3_500);
    expect(result.maxSheetContentVisibleAtMs).toBe(2_300);
  });

  it("allows target no-hover scenarios over the absolute budget only with required baseline-relative improvement", () => {
    const after = makeTargetScenario({
      medianMs: 1_100,
      runs: makeTargetScenario().runs.map((run) => ({ ...run, durationMs: 1_100, sheetContentVisibleAtMs: 950 })),
    });
    const baselineScenarios = new Map([
      [after.scenario, makeTargetScenario({ scenario: after.scenario, medianMs: 1_700 })],
    ]);

    const result = checkScenarioReadiness(after, thresholds, baselineScenarios);

    expect(result.passed).toBe(true);
    expect(result.budgetMs).toBe(1_000);
    expect(result.baselineMedianMs).toBe(1_700);
    expect(result.improvementPassed).toBe(true);
    expect(result.improvementRate).toBeGreaterThan(0.3);
  });

  it("fails target no-hover scenarios over budget when the baseline is missing or improvement is too small", () => {
    const after = makeTargetScenario({
      medianMs: 1_100,
      runs: makeTargetScenario().runs.map((run) => ({ ...run, durationMs: 1_100, sheetContentVisibleAtMs: 950 })),
    });

    expect(checkScenarioReadiness(after, thresholds).reasons).toContain(
      "median 1100ms exceeds 1000ms budget and ROUTE_TRANSITION_BASELINE_FILE has no matching scenario",
    );

    const insufficientBaseline = new Map([
      [after.scenario, makeTargetScenario({ scenario: after.scenario, medianMs: 1_300 })],
    ]);

    expect(checkScenarioReadiness(after, thresholds, insufficientBaseline).reasons).toContain(
      "median 1100ms exceeds 1000ms budget and improvement 15.4% is below 30.0%",
    );
  });

  it("summarizes a benchmark artifact without writing auth material or claiming hosted proof", () => {
    const result = checkRouteTransitionReadiness({
      benchmarkFile: "/tmp/route-transition-benchmark.json",
      ...thresholds,
    }, {
      generatedAt: "2026-06-02T00:00:00.000Z",
      baseUrl: "http://127.0.0.1:3039",
      authMode: "none",
      networkProfile: "No throttle",
      runsPerScenario: 3,
      waitForNetworkIdle: false,
      warmRoutesBeforeMeasure: true,
      skipAuthenticated: true,
      skippedScenarios: ["Authenticated: Workshop to Projects"],
      results: [makeScenario()],
    });

    expect(result.routeTransitionReady).toBe(true);
    expect(result.scenarioChecks).toHaveLength(1);
    expect(result.authMode).toBe("none");
    expect(result.waitForNetworkIdle).toBe(false);
    expect(result.warmRoutesBeforeMeasure).toBe(true);
    expect(result.skippedScenarios).toEqual(["Authenticated: Workshop to Projects"]);
    expect(result.note).toContain("does not create hosted/manual browser proof");
    expect(JSON.stringify(result)).not.toContain("cookie");
  });

  it("fails when required hero scenarios are missing or skipped", () => {
    const result = checkRouteTransitionReadiness({
      benchmarkFile: "/tmp/hero-route-transition-benchmark.json",
      ...thresholds,
      requireHeroScenarios: true,
    }, {
      generatedAt: "2026-06-20T00:00:00.000Z",
      baseUrl: "http://localhost:3000",
      authMode: "dev-auth-bypass",
      networkProfile: "No throttle",
      runsPerScenario: 3,
      skipAuthenticated: false,
      skippedScenarios: ["Authenticated Hero: Estimates to Target Estimate"],
      results: [
        makeScenario({ scenario: "Authenticated Hero: Workshop to Projects", from: "/workshop", expectedPathname: "/workshop/projects" }),
      ],
    });

    expect(result.routeTransitionReady).toBe(false);
    expect(result.requiredHeroScenarios).toEqual([
      "Authenticated Hero: Workshop to Projects",
      "Authenticated Hero: Projects to Target Project",
      "Authenticated Hero: Target Project to Estimates",
      "Authenticated Hero: Estimates to Target Estimate",
    ]);
    expect(result.missing).toContain("required hero scenario missing: Authenticated Hero: Projects to Target Project");
    expect(result.missing).toContain("required hero scenario skipped: Authenticated Hero: Estimates to Target Estimate");
  });

  it("requires Phase 0 target scenarios when target benchmark evidence is present", () => {
    const result = checkRouteTransitionReadiness({
      benchmarkFile: "/tmp/target-route-transition-benchmark.json",
      ...thresholds,
      requireHeroScenarios: true,
    }, {
      generatedAt: "2026-06-26T00:00:00.000Z",
      baseUrl: "http://localhost:3000",
      authMode: "dev-auth-bypass",
      networkProfile: "No throttle",
      runsPerScenario: 3,
      skipAuthenticated: false,
      skippedScenarios: ["Authenticated Target: Estimates to Target Estimate Warm Revisit"],
      results: [
        makeTargetScenario({ scenario: "Authenticated Target: Cold Direct Target Estimate" }),
        makeTargetScenario({ scenario: "Authenticated Target: Estimates to Target Estimate No Hover" }),
      ],
    });

    expect(result.routeTransitionReady).toBe(false);
    expect(result.requiredHeroScenarios).toEqual([
      "Authenticated Target: Cold Direct Target Estimate",
      "Authenticated Target: Estimates to Target Estimate No Hover",
      "Authenticated Target: Estimates to Target Estimate Hover Prefetch",
      "Authenticated Target: Estimates to Target Estimate Warm Revisit",
    ]);
    expect(result.missing).toContain("required target scenario missing: Authenticated Target: Estimates to Target Estimate Hover Prefetch");
    expect(result.missing).toContain("required target scenario skipped: Authenticated Target: Estimates to Target Estimate Warm Revisit");
  });

  it("fails empty benchmark artifacts", () => {
    const result = checkRouteTransitionReadiness({
      benchmarkFile: "/tmp/empty-route-transition-benchmark.json",
      ...thresholds,
    }, {
      results: [],
    });

    expect(result.routeTransitionReady).toBe(false);
    expect(result.missing).toContain("benchmark scenario results");
  });
});
