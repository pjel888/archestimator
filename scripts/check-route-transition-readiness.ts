#!/usr/bin/env bun

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

type BenchmarkRun = {
  run: number;
  durationMs: number;
  overlayVisible: boolean;
  parentFallbackSeen?: boolean;
  sheetSkeletonEpisodes?: number;
  overlayDurationMs?: number;
  sheetContentVisibleAtMs?: number | null;
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
  authMode?: string;
  networkProfile?: string;
  runsPerScenario?: number;
  waitForNetworkIdle?: boolean;
  warmRoutesBeforeMeasure?: boolean;
  skipAuthenticated?: boolean;
  skippedScenarios?: string[];
  results?: BenchmarkScenarioResult[];
};

type RouteTransitionReadinessInputs = {
  benchmarkFile: string;
  baselineFile?: string;
  outputFile?: string;
  minRuns: number;
  publicMedianBudgetMs: number;
  slow3gPublicMedianBudgetMs: number;
  authenticatedMedianBudgetMs: number;
  warmMedianBudgetMs: number;
  generalMedianBudgetMs: number;
  directMedianBudgetMs: number;
  parentFallbackMax: number;
  sheetSkeletonEpisodesMax: number;
  overlayDurationMaxMs: number;
  sheetContentVisibleBudgetMs: number;
  generalImprovementMin: number;
  overlayVisibilityRateMax: number;
  requireHeroScenarios: boolean;
};

type ScenarioCheck = {
  scenario: string;
  networkProfile: string;
  runs: number;
  failures: number;
  medianMs: number | null;
  maxDurationMs: number | null;
  budgetMs: number;
  medianBudgetPassed: boolean;
  baselineMedianMs: number | null;
  improvementRate: number | null;
  improvementPassed: boolean | null;
  parentFallbackCount: number;
  maxSheetSkeletonEpisodes: number | null;
  maxOverlayDurationMs: number | null;
  maxSheetContentVisibleAtMs: number | null;
  overlayVisibilityRate: number;
  rscRequestCount: number;
  sheetContentVisibleBudgetMs: number;
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
  waitForNetworkIdle: boolean | null;
  warmRoutesBeforeMeasure: boolean | null;
  skipAuthenticated: boolean | null;
  skippedScenarios: string[];
  authMode: string | null;
  thresholds: {
    minRuns: number;
    publicMedianBudgetMs: number;
    slow3gPublicMedianBudgetMs: number;
    authenticatedMedianBudgetMs: number;
    warmMedianBudgetMs: number;
    generalMedianBudgetMs: number;
    directMedianBudgetMs: number;
    parentFallbackMax: number;
    sheetSkeletonEpisodesMax: number;
    overlayDurationMaxMs: number;
    sheetContentVisibleBudgetMs: number;
    generalImprovementMin: number;
    overlayVisibilityRateMax: number;
  };
  baselineFile: string | null;
  requiredHeroScenarios: string[];
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

export function parseNonNegativeInteger(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
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
    baselineFile: readEnv("ROUTE_TRANSITION_BASELINE_FILE"),
    outputFile: readEnv("OUTPUT_FILE"),
    minRuns: parsePositiveInteger(readEnv("ROUTE_TRANSITION_MIN_RUNS"), 3),
    publicMedianBudgetMs: parsePositiveInteger(readEnv("ROUTE_TRANSITION_PUBLIC_MEDIAN_BUDGET_MS"), 15_000),
    slow3gPublicMedianBudgetMs: parsePositiveInteger(readEnv("ROUTE_TRANSITION_SLOW3G_MEDIAN_BUDGET_MS"), 30_000),
    authenticatedMedianBudgetMs: parsePositiveInteger(readEnv("ROUTE_TRANSITION_AUTH_MEDIAN_BUDGET_MS"), 10_000),
    warmMedianBudgetMs: parsePositiveInteger(readEnv("ROUTE_TRANSITION_WARM_MEDIAN_BUDGET_MS"), 500),
    generalMedianBudgetMs: parsePositiveInteger(readEnv("ROUTE_TRANSITION_GENERAL_MEDIAN_BUDGET_MS"), 1_000),
    directMedianBudgetMs: parsePositiveInteger(readEnv("ROUTE_TRANSITION_DIRECT_MEDIAN_BUDGET_MS"), 3_500),
    parentFallbackMax: parseNonNegativeInteger(readEnv("ROUTE_TRANSITION_PARENT_FALLBACK_MAX"), 0),
    sheetSkeletonEpisodesMax: parseNonNegativeInteger(readEnv("ROUTE_TRANSITION_SHEET_SKELETON_EPISODES_MAX"), 1),
    overlayDurationMaxMs: parsePositiveInteger(readEnv("ROUTE_TRANSITION_OVERLAY_DURATION_MAX_MS"), 200),
    sheetContentVisibleBudgetMs: parsePositiveInteger(readEnv("ROUTE_TRANSITION_SHEET_CONTENT_VISIBLE_BUDGET_MS"), 1_000),
    generalImprovementMin: parseNonNegativeNumber(readEnv("ROUTE_TRANSITION_GENERAL_IMPROVEMENT_MIN"), 0.3),
    overlayVisibilityRateMax: parseNonNegativeNumber(readEnv("ROUTE_TRANSITION_OVERLAY_RATE_MAX"), 1),
    requireHeroScenarios: readEnv("ROUTE_TRANSITION_REQUIRE_HERO") === "1",
  };
}

function readBenchmarkPayload(benchmarkFile: string): BenchmarkPayload {
  const text = readFileSync(benchmarkFile, "utf8");
  return JSON.parse(text) as BenchmarkPayload;
}

function readOptionalBenchmarkPayload(benchmarkFile: string | undefined): BenchmarkPayload | undefined {
  if (!benchmarkFile) return undefined;
  return readBenchmarkPayload(benchmarkFile);
}

function getBaselineScenarioMap(payload: BenchmarkPayload | undefined) {
  return new Map((payload?.results ?? []).map((result) => [result.scenario, result]));
}

function isTargetScenario(scenarioName: string) {
  return scenarioName.startsWith("Authenticated Target:");
}

function isTargetDirectScenario(scenarioName: string) {
  return scenarioName.includes("Cold Direct Target Estimate");
}

function isTargetWarmScenario(scenarioName: string) {
  return scenarioName.includes("Hover Prefetch") || scenarioName.includes("Warm Revisit");
}

function isTargetGeneralScenario(scenarioName: string) {
  return isTargetScenario(scenarioName) && !isTargetDirectScenario(scenarioName) && !isTargetWarmScenario(scenarioName);
}

function getMaxNumber(values: Array<number | null | undefined>) {
  const numericValues = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  return numericValues.length > 0 ? Math.max(...numericValues) : null;
}

function getImprovementRate(baselineMedianMs: number | null, medianMs: number | null) {
  if (baselineMedianMs === null || medianMs === null || baselineMedianMs <= 0) return null;
  return (baselineMedianMs - medianMs) / baselineMedianMs;
}

function getScenarioBudgetMs(
  scenario: BenchmarkScenarioResult,
  thresholds: Pick<
    RouteTransitionReadinessInputs,
    | "authenticatedMedianBudgetMs"
    | "directMedianBudgetMs"
    | "generalMedianBudgetMs"
    | "publicMedianBudgetMs"
    | "slow3gPublicMedianBudgetMs"
    | "warmMedianBudgetMs"
  >,
) {
  if (isTargetDirectScenario(scenario.scenario)) return thresholds.directMedianBudgetMs;
  if (isTargetWarmScenario(scenario.scenario)) return thresholds.warmMedianBudgetMs;
  if (isTargetGeneralScenario(scenario.scenario)) return thresholds.generalMedianBudgetMs;
  if (scenario.scenario.toLowerCase().includes("authenticated")) return thresholds.authenticatedMedianBudgetMs;
  if (scenario.networkProfile === "Slow 3G") return thresholds.slow3gPublicMedianBudgetMs;
  return thresholds.publicMedianBudgetMs;
}

function getSheetContentVisibleBudgetMs(
  scenario: BenchmarkScenarioResult,
  thresholds: Pick<RouteTransitionReadinessInputs, "directMedianBudgetMs" | "sheetContentVisibleBudgetMs">,
) {
  return isTargetDirectScenario(scenario.scenario)
    ? thresholds.directMedianBudgetMs
    : thresholds.sheetContentVisibleBudgetMs;
}

export function checkScenarioReadiness(
  scenario: BenchmarkScenarioResult,
  inputs: Pick<
    RouteTransitionReadinessInputs,
    | "authenticatedMedianBudgetMs"
    | "directMedianBudgetMs"
    | "generalImprovementMin"
    | "generalMedianBudgetMs"
    | "minRuns"
    | "overlayDurationMaxMs"
    | "overlayVisibilityRateMax"
    | "parentFallbackMax"
    | "publicMedianBudgetMs"
    | "sheetContentVisibleBudgetMs"
    | "sheetSkeletonEpisodesMax"
    | "slow3gPublicMedianBudgetMs"
    | "warmMedianBudgetMs"
  >,
  baselineScenarios: Map<string, BenchmarkScenarioResult> = new Map(),
): ScenarioCheck {
  const budgetMs = getScenarioBudgetMs(scenario, inputs);
  const sheetContentVisibleBudgetMs = getSheetContentVisibleBudgetMs(scenario, inputs);
  const maxDurationMs = scenario.runs.length > 0 ? Math.max(...scenario.runs.map((run) => run.durationMs)) : null;
  const baselineMedianMs = baselineScenarios.get(scenario.scenario)?.medianMs ?? null;
  const improvementRate = getImprovementRate(baselineMedianMs, scenario.medianMs);
  const improvementPassed =
    isTargetGeneralScenario(scenario.scenario) && scenario.medianMs !== null && scenario.medianMs > budgetMs
      ? improvementRate !== null && improvementRate >= inputs.generalImprovementMin
      : null;
  const medianBudgetPassed =
    scenario.medianMs !== null &&
    (scenario.medianMs <= budgetMs || (isTargetGeneralScenario(scenario.scenario) && improvementPassed === true));
  const maxDurationBudgetPassed =
    isTargetScenario(scenario.scenario) ||
    maxDurationMs === null ||
    maxDurationMs <= budgetMs ||
    (isTargetGeneralScenario(scenario.scenario) && improvementPassed === true);
  const parentFallbackCount = scenario.runs.filter((run) => run.parentFallbackSeen === true).length;
  const maxSheetSkeletonEpisodes = getMaxNumber(scenario.runs.map((run) => run.sheetSkeletonEpisodes));
  const maxOverlayDurationMs = getMaxNumber(scenario.runs.map((run) => run.overlayDurationMs));
  const maxSheetContentVisibleAtMs = getMaxNumber(scenario.runs.map((run) => run.sheetContentVisibleAtMs));
  const needsTargetTimelineChecks = isTargetScenario(scenario.scenario);
  const reasons = [
    scenario.runs.length < inputs.minRuns ? `expected at least ${inputs.minRuns} successful runs` : null,
    scenario.failures.length > 0 ? `${scenario.failures.length} benchmark run failure(s)` : null,
    scenario.medianMs === null ? "missing median transition duration" : null,
    scenario.medianMs !== null && !medianBudgetPassed && isTargetGeneralScenario(scenario.scenario) && baselineMedianMs === null
      ? `median ${scenario.medianMs}ms exceeds ${budgetMs}ms budget and ROUTE_TRANSITION_BASELINE_FILE has no matching scenario`
      : null,
    scenario.medianMs !== null && !medianBudgetPassed && isTargetGeneralScenario(scenario.scenario) && baselineMedianMs !== null
      ? `median ${scenario.medianMs}ms exceeds ${budgetMs}ms budget and improvement ${((improvementRate ?? 0) * 100).toFixed(1)}% is below ${(inputs.generalImprovementMin * 100).toFixed(1)}%`
      : null,
    scenario.medianMs !== null && !medianBudgetPassed && !isTargetGeneralScenario(scenario.scenario)
      ? `median ${scenario.medianMs}ms exceeds ${budgetMs}ms budget`
      : null,
    !maxDurationBudgetPassed ? `max duration ${maxDurationMs}ms exceeds ${budgetMs}ms budget` : null,
    scenario.overlayVisibilityRate > inputs.overlayVisibilityRateMax
      ? `overlay visibility rate ${scenario.overlayVisibilityRate} exceeds ${inputs.overlayVisibilityRateMax}`
      : null,
    needsTargetTimelineChecks && parentFallbackCount > inputs.parentFallbackMax
      ? `parent fallback seen in ${parentFallbackCount} run(s), exceeds ${inputs.parentFallbackMax}`
      : null,
    needsTargetTimelineChecks && maxSheetSkeletonEpisodes === null ? "missing sheet skeleton episode telemetry" : null,
    needsTargetTimelineChecks && maxSheetSkeletonEpisodes !== null && maxSheetSkeletonEpisodes > inputs.sheetSkeletonEpisodesMax
      ? `sheet skeleton episodes ${maxSheetSkeletonEpisodes} exceeds ${inputs.sheetSkeletonEpisodesMax}`
      : null,
    needsTargetTimelineChecks && maxOverlayDurationMs === null ? "missing overlay duration telemetry" : null,
    needsTargetTimelineChecks && maxOverlayDurationMs !== null && maxOverlayDurationMs > inputs.overlayDurationMaxMs
      ? `overlay duration ${maxOverlayDurationMs}ms exceeds ${inputs.overlayDurationMaxMs}ms budget`
      : null,
    needsTargetTimelineChecks && maxSheetContentVisibleAtMs === null ? "missing sheet content visible timing" : null,
    needsTargetTimelineChecks &&
    maxSheetContentVisibleAtMs !== null &&
    maxSheetContentVisibleAtMs > sheetContentVisibleBudgetMs
      ? `sheet content visible at ${maxSheetContentVisibleAtMs}ms exceeds ${sheetContentVisibleBudgetMs}ms budget`
      : null,
  ].filter((value): value is string => Boolean(value));

  return {
    scenario: scenario.scenario,
    networkProfile: scenario.networkProfile,
    runs: scenario.runs.length,
    failures: scenario.failures.length,
    medianMs: scenario.medianMs,
    maxDurationMs,
    budgetMs,
    medianBudgetPassed,
    baselineMedianMs,
    improvementRate,
    improvementPassed,
    parentFallbackCount,
    maxSheetSkeletonEpisodes,
    maxOverlayDurationMs,
    maxSheetContentVisibleAtMs,
    overlayVisibilityRate: scenario.overlayVisibilityRate,
    rscRequestCount: scenario.rscRequestCount,
    sheetContentVisibleBudgetMs,
    passed: reasons.length === 0,
    reasons,
  };
}

export function checkRouteTransitionReadiness(
  inputs: RouteTransitionReadinessInputs,
  payload: BenchmarkPayload = readBenchmarkPayload(inputs.benchmarkFile),
  baselinePayload: BenchmarkPayload | undefined = readOptionalBenchmarkPayload(inputs.baselineFile),
): RouteTransitionReadinessResult {
  const results = payload.results ?? [];
  const baselineScenarios = getBaselineScenarioMap(baselinePayload);
  const scenarioChecks = results.map((scenario) => checkScenarioReadiness(scenario, inputs, baselineScenarios));
  const requiredLegacyHeroScenarios = [
    "Authenticated Hero: Workshop to Projects",
    "Authenticated Hero: Projects to Target Project",
    "Authenticated Hero: Target Project to Estimates",
    "Authenticated Hero: Estimates to Target Estimate",
  ];
  const requiredTargetScenarios = [
    "Authenticated Target: Cold Direct Target Estimate",
    "Authenticated Target: Estimates to Target Estimate No Hover",
    "Authenticated Target: Estimates to Target Estimate Hover Prefetch",
    "Authenticated Target: Estimates to Target Estimate Warm Revisit",
  ];
  const resultNames = new Set(results.map((result) => result.scenario));
  const hasTargetScenarioEvidence =
    results.some((result) => isTargetScenario(result.scenario)) ||
    (payload.skippedScenarios ?? []).some((scenario) => isTargetScenario(scenario));
  const requiredHeroScenarios = hasTargetScenarioEvidence ? requiredTargetScenarios : requiredLegacyHeroScenarios;
  const requiredScenarioLabel = hasTargetScenarioEvidence ? "target" : "hero";
  const missingHeroScenarios = inputs.requireHeroScenarios
    ? requiredHeroScenarios.filter((scenario) => !resultNames.has(scenario))
    : [];
  const skippedHeroScenarios = inputs.requireHeroScenarios
    ? (payload.skippedScenarios ?? []).filter((scenario) => requiredHeroScenarios.includes(scenario))
    : [];
  const missing = [
    results.length === 0 ? "benchmark scenario results" : null,
    ...missingHeroScenarios.map((scenario) => `required ${requiredScenarioLabel} scenario missing: ${scenario}`),
    ...skippedHeroScenarios.map((scenario) => `required ${requiredScenarioLabel} scenario skipped: ${scenario}`),
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
    waitForNetworkIdle: typeof payload.waitForNetworkIdle === "boolean" ? payload.waitForNetworkIdle : null,
    warmRoutesBeforeMeasure: typeof payload.warmRoutesBeforeMeasure === "boolean" ? payload.warmRoutesBeforeMeasure : null,
    skipAuthenticated: typeof payload.skipAuthenticated === "boolean" ? payload.skipAuthenticated : null,
    skippedScenarios: payload.skippedScenarios ?? [],
    authMode: typeof payload.authMode === "string" ? payload.authMode : null,
    thresholds: {
      minRuns: inputs.minRuns,
      publicMedianBudgetMs: inputs.publicMedianBudgetMs,
      slow3gPublicMedianBudgetMs: inputs.slow3gPublicMedianBudgetMs,
      authenticatedMedianBudgetMs: inputs.authenticatedMedianBudgetMs,
      warmMedianBudgetMs: inputs.warmMedianBudgetMs,
      generalMedianBudgetMs: inputs.generalMedianBudgetMs,
      directMedianBudgetMs: inputs.directMedianBudgetMs,
      parentFallbackMax: inputs.parentFallbackMax,
      sheetSkeletonEpisodesMax: inputs.sheetSkeletonEpisodesMax,
      overlayDurationMaxMs: inputs.overlayDurationMaxMs,
      sheetContentVisibleBudgetMs: inputs.sheetContentVisibleBudgetMs,
      generalImprovementMin: inputs.generalImprovementMin,
      overlayVisibilityRateMax: inputs.overlayVisibilityRateMax,
    },
    baselineFile: inputs.baselineFile ?? null,
    requiredHeroScenarios: inputs.requireHeroScenarios ? requiredHeroScenarios : [],
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
