#!/usr/bin/env bun

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

type BenchmarkRun = {
  run: number;
  durationMs: number;
  overlayVisible: boolean;
  rscRequestCount: number;
  finalPathname: string;
};

type BenchmarkScenarioResult = {
  scenario: string;
  from: string;
  expectedPathname: string;
  networkProfile: string;
  runs: BenchmarkRun[];
  failures: Array<{ run: number; message: string }>;
  medianMs: number | null;
  overlayVisibilityRate: number;
  rscRequestCount: number;
};

type BenchmarkPayload = {
  generatedAt?: string;
  baseUrl?: string;
  networkProfile?: string;
  runsPerScenario?: number;
  skipAuthenticated?: boolean;
  skippedScenarios?: string[];
  results?: BenchmarkScenarioResult[];
};

type RouteTransitionReadinessInputs = {
  benchmarkFile: string;
  outputFile?: string;
  minRuns: number;
  publicMedianBudgetMs: number;
  slow3gPublicMedianBudgetMs: number;
  authenticatedMedianBudgetMs: number;
  overlayVisibilityRateMax: number;
};

type ScenarioCheck = {
  scenario: string;
  networkProfile: string;
  runs: number;
  failures: number;
  medianMs: number | null;
  budgetMs: number;
  overlayVisibilityRate: number;
  rscRequestCount: number;
  passed: boolean;
  reasons: string[];
};

export type RouteTransitionReadinessResult = {
  generatedAt: string;
  mode: "route-transition-readiness";
  benchmarkFile: string;
  benchmarkGeneratedAt: string | null;
  baseUrl: string | null;
  networkProfile: string | null;
  runsPerScenario: number | null;
  skipAuthenticated: boolean | null;
  skippedScenarios: string[];
  thresholds: {
    minRuns: number;
    publicMedianBudgetMs: number;
    slow3gPublicMedianBudgetMs: number;
    authenticatedMedianBudgetMs: number;
    overlayVisibilityRateMax: number;
  };
  scenarioChecks: ScenarioCheck[];
  missing: string[];
  routeTransitionReady: boolean;
  note: string;
};

function readEnv(name: string) {
  const value = process.env[name];
  return value?.trim() || undefined;
}

export function parsePositiveInteger(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function parseNonNegativeNumber(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export function parseInputsFromEnv(): RouteTransitionReadinessInputs {
  const benchmarkFile = readEnv("ROUTE_TRANSITION_BENCHMARK_FILE");
  if (!benchmarkFile) {
    throw new Error("Missing required route-transition proof input: ROUTE_TRANSITION_BENCHMARK_FILE.");
  }

  return {
    benchmarkFile,
    outputFile: readEnv("OUTPUT_FILE"),
    minRuns: parsePositiveInteger(readEnv("ROUTE_TRANSITION_MIN_RUNS"), 3),
    publicMedianBudgetMs: parsePositiveInteger(readEnv("ROUTE_TRANSITION_PUBLIC_MEDIAN_BUDGET_MS"), 15_000),
    slow3gPublicMedianBudgetMs: parsePositiveInteger(readEnv("ROUTE_TRANSITION_SLOW3G_MEDIAN_BUDGET_MS"), 30_000),
    authenticatedMedianBudgetMs: parsePositiveInteger(readEnv("ROUTE_TRANSITION_AUTH_MEDIAN_BUDGET_MS"), 10_000),
    overlayVisibilityRateMax: parseNonNegativeNumber(readEnv("ROUTE_TRANSITION_OVERLAY_RATE_MAX"), 1),
  };
}

function readBenchmarkPayload(benchmarkFile: string): BenchmarkPayload {
  const text = readFileSync(benchmarkFile, "utf8");
  return JSON.parse(text) as BenchmarkPayload;
}

function getScenarioBudgetMs(
  scenario: BenchmarkScenarioResult,
  thresholds: Pick<
    RouteTransitionReadinessInputs,
    "authenticatedMedianBudgetMs" | "publicMedianBudgetMs" | "slow3gPublicMedianBudgetMs"
  >,
) {
  if (scenario.scenario.toLowerCase().includes("authenticated")) return thresholds.authenticatedMedianBudgetMs;
  if (scenario.networkProfile === "Slow 3G") return thresholds.slow3gPublicMedianBudgetMs;
  return thresholds.publicMedianBudgetMs;
}

export function checkScenarioReadiness(
  scenario: BenchmarkScenarioResult,
  inputs: Pick<
    RouteTransitionReadinessInputs,
    "authenticatedMedianBudgetMs" | "minRuns" | "overlayVisibilityRateMax" | "publicMedianBudgetMs" | "slow3gPublicMedianBudgetMs"
  >,
): ScenarioCheck {
  const budgetMs = getScenarioBudgetMs(scenario, inputs);
  const reasons = [
    scenario.runs.length < inputs.minRuns ? `expected at least ${inputs.minRuns} successful runs` : null,
    scenario.failures.length > 0 ? `${scenario.failures.length} benchmark run failure(s)` : null,
    scenario.medianMs === null ? "missing median transition duration" : null,
    scenario.medianMs !== null && scenario.medianMs > budgetMs ? `median ${scenario.medianMs}ms exceeds ${budgetMs}ms budget` : null,
    scenario.overlayVisibilityRate > inputs.overlayVisibilityRateMax
      ? `overlay visibility rate ${scenario.overlayVisibilityRate} exceeds ${inputs.overlayVisibilityRateMax}`
      : null,
  ].filter((value): value is string => Boolean(value));

  return {
    scenario: scenario.scenario,
    networkProfile: scenario.networkProfile,
    runs: scenario.runs.length,
    failures: scenario.failures.length,
    medianMs: scenario.medianMs,
    budgetMs,
    overlayVisibilityRate: scenario.overlayVisibilityRate,
    rscRequestCount: scenario.rscRequestCount,
    passed: reasons.length === 0,
    reasons,
  };
}

export function checkRouteTransitionReadiness(
  inputs: RouteTransitionReadinessInputs,
  payload: BenchmarkPayload = readBenchmarkPayload(inputs.benchmarkFile),
): RouteTransitionReadinessResult {
  const results = payload.results ?? [];
  const scenarioChecks = results.map((scenario) => checkScenarioReadiness(scenario, inputs));
  const missing = [
    results.length === 0 ? "benchmark scenario results" : null,
    ...scenarioChecks.flatMap((check) => check.reasons.map((reason) => `${check.scenario}: ${reason}`)),
  ].filter((value): value is string => Boolean(value));

  return {
    generatedAt: new Date().toISOString(),
    mode: "route-transition-readiness",
    benchmarkFile: inputs.benchmarkFile,
    benchmarkGeneratedAt: payload.generatedAt ?? null,
    baseUrl: payload.baseUrl ?? null,
    networkProfile: payload.networkProfile ?? null,
    runsPerScenario: typeof payload.runsPerScenario === "number" ? payload.runsPerScenario : null,
    skipAuthenticated: typeof payload.skipAuthenticated === "boolean" ? payload.skipAuthenticated : null,
    skippedScenarios: payload.skippedScenarios ?? [],
    thresholds: {
      minRuns: inputs.minRuns,
      publicMedianBudgetMs: inputs.publicMedianBudgetMs,
      slow3gPublicMedianBudgetMs: inputs.slow3gPublicMedianBudgetMs,
      authenticatedMedianBudgetMs: inputs.authenticatedMedianBudgetMs,
      overlayVisibilityRateMax: inputs.overlayVisibilityRateMax,
    },
    scenarioChecks,
    missing,
    routeTransitionReady: results.length > 0 && missing.length === 0,
    note: "Sanitized route-transition readiness check. It validates a benchmark JSON artifact from scripts/measure-route-transitions.ts against local thresholds; it does not create hosted/manual browser proof or verify production-user behavior by itself.",
  };
}

function writeOutput(outputFile: string, result: RouteTransitionReadinessResult) {
  const resolved = resolve(outputFile);
  mkdirSync(dirname(resolved), { recursive: true });
  writeFileSync(resolved, `${JSON.stringify(result, null, 2)}\n`);
}

async function main() {
  const inputs = parseInputsFromEnv();
  const result = checkRouteTransitionReadiness(inputs);
  if (inputs.outputFile) writeOutput(inputs.outputFile, result);
  console.log(JSON.stringify(result, null, 2));
  if (!result.routeTransitionReady) process.exitCode = 1;
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
