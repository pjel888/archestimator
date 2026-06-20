import { afterEach, describe, expect, it } from "vitest";

import {
  checkRouteTransitionReadiness,
  checkScenarioReadiness,
  parseInputsFromEnv,
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
  overlayVisibilityRateMax: 1,
  requireHeroScenarios: false,
};

describe("route transition readiness checker", () => {
  it("requires a benchmark file input from env", () => {
    process.env = {};

    expect(() => parseInputsFromEnv()).toThrow(/ROUTE_TRANSITION_BENCHMARK_FILE/);
  });

  it("parses positive numeric threshold inputs with fallback", () => {
    expect(parsePositiveInteger("25", 3)).toBe(25);
    expect(parsePositiveInteger("0", 3)).toBe(3);
    expect(parsePositiveInteger("bad", 3)).toBe(3);
    expect(parseNonNegativeNumber("0.25", 1)).toBe(0.25);
    expect(parseNonNegativeNumber("-1", 1)).toBe(1);
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
