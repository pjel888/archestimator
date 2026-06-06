#!/usr/bin/env bun

import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

export const SPEED_INSIGHTS_METRICS = ["fcp", "lcp", "inp", "cls", "ttfb_ms"] as const;
export const RES_CORE_METRICS = ["fcp", "lcp", "inp", "cls"] as const;

export type SpeedInsightsMetric = (typeof SPEED_INSIGHTS_METRICS)[number];
export type ResCoreMetric = (typeof RES_CORE_METRICS)[number];

export const SPEED_INSIGHTS_GOOD_THRESHOLDS: Record<SpeedInsightsMetric, number> = {
  fcp: 1800,
  lcp: 2500,
  inp: 200,
  cls: 0.1,
  ttfb_ms: 800,
};

const METRIC_LABELS: Record<SpeedInsightsMetric, string> = {
  fcp: "FCP",
  lcp: "LCP",
  inp: "INP",
  cls: "CLS",
  ttfb_ms: "TTFB",
};

export type MetricSummary = {
  metric: SpeedInsightsMetric;
  threshold: number;
  hasCurrentDeploymentData: boolean;
  overallValue: number | null;
  worstRouteDeviceValue: number | null;
  valueForThreshold: number | null;
  goodThresholdMet: boolean;
  dataPointCount: number;
};

export type MetricPayload = {
  query?: unknown;
  summary: Record<string, unknown>[];
  data?: unknown[];
  statistics?: unknown;
  dataPointCount?: number;
};

export type SpeedInsightsReadinessResult = {
  generatedAt: string;
  mode: "vercel-speed-insights-readiness";
  project: string;
  scope: string;
  productionUrl: string;
  currentDeploymentId: string;
  since: string;
  targetResScore: number;
  dashboardResScore: number | null;
  currentDeploymentDataReady: boolean;
  coreVitalsGood: boolean;
  dashboardResTargetMet: boolean;
  resCompletionReady: boolean;
  missing: string[];
  metricSummaries: Record<SpeedInsightsMetric, MetricSummary>;
  note: string;
};

function readEnv(name: string) {
  const value = process.env[name];
  return value?.trim() || undefined;
}

export function extractJsonObject(input: string) {
  const start = input.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < input.length; index += 1) {
    const char = input[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
      continue;
    }

    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return input.slice(start, index + 1);
    }
  }

  return null;
}

export function parseMetricPayload(input: string): MetricPayload {
  const jsonText = extractJsonObject(input);
  if (!jsonText) {
    return { summary: [], data: [], dataPointCount: 0 };
  }

  try {
    const parsed = JSON.parse(jsonText) as Partial<MetricPayload>;
    const data = Array.isArray(parsed.data) ? parsed.data : [];
    return {
      query: parsed.query,
      summary: Array.isArray(parsed.summary)
        ? parsed.summary.filter((row): row is Record<string, unknown> => row !== null && typeof row === "object" && !Array.isArray(row))
        : [],
      data,
      statistics: parsed.statistics,
      dataPointCount: typeof parsed.dataPointCount === "number" ? parsed.dataPointCount : data.length,
    };
  } catch {
    return { summary: [], data: [], dataPointCount: 0 };
  }
}

function metricField(metric: SpeedInsightsMetric, aggregation: string) {
  return `vercel_speed_insights_metric_${metric}_${aggregation}`;
}

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function getMetricValueFromSummary(
  summary: Record<string, unknown>[],
  metric: SpeedInsightsMetric,
  aggregation = "p75",
) {
  const key = metricField(metric, aggregation);
  for (const row of summary) {
    const value = asNumber(row[key]);
    if (value !== null) return value;
  }
  return null;
}

function getAllMetricValuesFromSummary(
  summary: Record<string, unknown>[],
  metric: SpeedInsightsMetric,
  aggregation = "p75",
) {
  const key = metricField(metric, aggregation);
  return summary.map((row) => asNumber(row[key])).filter((value): value is number => value !== null);
}

export function summarizeMetric(
  metric: SpeedInsightsMetric,
  overallPayload: MetricPayload,
  routeDevicePayload: MetricPayload,
): MetricSummary {
  const overallValue = getMetricValueFromSummary(overallPayload.summary, metric);
  const routeDeviceValues = getAllMetricValuesFromSummary(routeDevicePayload.summary, metric);
  const worstRouteDeviceValue = routeDeviceValues.length > 0 ? Math.max(...routeDeviceValues) : null;
  const thresholdValues = [overallValue, worstRouteDeviceValue].filter((value): value is number => value !== null);
  const valueForThreshold = thresholdValues.length > 0 ? Math.max(...thresholdValues) : null;
  const dataPointCount = Math.max(overallPayload.dataPointCount ?? 0, routeDevicePayload.dataPointCount ?? 0);

  return {
    metric,
    threshold: SPEED_INSIGHTS_GOOD_THRESHOLDS[metric],
    hasCurrentDeploymentData: valueForThreshold !== null,
    overallValue,
    worstRouteDeviceValue,
    valueForThreshold,
    goodThresholdMet: valueForThreshold !== null && valueForThreshold <= SPEED_INSIGHTS_GOOD_THRESHOLDS[metric],
    dataPointCount,
  };
}

export function evaluateSpeedInsightsReadiness({
  currentDeploymentId,
  metricSummaries,
  targetResScore,
  dashboardResScore,
  project = "archestimator",
  scope = "philipjonlewis-projects",
  productionUrl = "https://www.archestimator.com",
  since = "7d",
}: {
  currentDeploymentId: string;
  metricSummaries: Record<SpeedInsightsMetric, MetricSummary>;
  targetResScore: number;
  dashboardResScore?: number | null;
  project?: string;
  scope?: string;
  productionUrl?: string;
  since?: string;
}): SpeedInsightsReadinessResult {
  const coreMetrics = RES_CORE_METRICS.map((metric) => metricSummaries[metric]);
  const currentDeploymentDataReady = coreMetrics.every((summary) => summary.hasCurrentDeploymentData);
  const coreVitalsGood = coreMetrics.every((summary) => summary.goodThresholdMet);
  const dashboardResTargetMet = typeof dashboardResScore === "number" && Number.isFinite(dashboardResScore) && dashboardResScore >= targetResScore;
  const missing = [
    !currentDeploymentDataReady ? "current-deployment Speed Insights rows for FCP/LCP/INP/CLS" : null,
    !coreVitalsGood ? "current-deployment FCP/LCP/INP/CLS all within Vercel good thresholds" : null,
    !dashboardResTargetMet ? `dashboard/RES score >= ${targetResScore}` : null,
  ].filter((value): value is string => Boolean(value));

  return {
    generatedAt: new Date().toISOString(),
    mode: "vercel-speed-insights-readiness",
    project,
    scope,
    productionUrl,
    currentDeploymentId,
    since,
    targetResScore,
    dashboardResScore: typeof dashboardResScore === "number" && Number.isFinite(dashboardResScore) ? dashboardResScore : null,
    currentDeploymentDataReady,
    coreVitalsGood,
    dashboardResTargetMet,
    resCompletionReady: missing.length === 0,
    missing,
    metricSummaries,
    note:
      "Read-only Vercel Speed Insights readiness check. It queries current-deployment p75 Speed Insights metrics via Vercel CLI, compares FCP/LCP/INP/CLS to Vercel good thresholds, and fails closed for exact RES completion unless a dashboard RES score is supplied. It does not submit vitals, create traffic, deploy, promote, mutate provider settings, or infer RES from lab data.",
  };
}

function runVercel(args: string[]) {
  const result = spawnSync("vercel", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.status !== 0) {
    throw new Error([
      `vercel ${args.join(" ")} failed with exit ${result.status}`,
      result.stdout?.trim(),
      result.stderr?.trim(),
    ].filter(Boolean).join("\n"));
  }

  return `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
}

function parseDeploymentIdFromInspect(input: string) {
  const jsonText = extractJsonObject(input);
  if (jsonText) {
    try {
      const parsed = JSON.parse(jsonText) as { id?: unknown; deployment?: { id?: unknown } };
      const id = typeof parsed.id === "string" ? parsed.id : typeof parsed.deployment?.id === "string" ? parsed.deployment.id : null;
      if (id?.startsWith("dpl_")) return id;
    } catch {
      // Fall through to text parsing.
    }
  }

  const match = input.match(/(?:^|\n)\s*id\s+(dpl_[A-Za-z0-9]+)/);
  return match?.[1] ?? null;
}

function resolveCurrentDeploymentId({ productionUrl, scope }: { productionUrl: string; scope: string }) {
  const explicit = readEnv("SPEED_INSIGHTS_CURRENT_DEPLOYMENT_ID") ?? readEnv("VERCEL_DEPLOYMENT_ID");
  if (explicit) return explicit;

  const inspectText = runVercel(["inspect", productionUrl, "--scope", scope]);
  const deploymentId = parseDeploymentIdFromInspect(inspectText);
  if (!deploymentId) {
    throw new Error(`Unable to parse deployment id from vercel inspect output for ${productionUrl}`);
  }
  return deploymentId;
}

function queryMetric({
  metric,
  project,
  scope,
  since,
  deploymentId,
  groupByRouteDevice,
}: {
  metric: SpeedInsightsMetric;
  project: string;
  scope: string;
  since: string;
  deploymentId: string;
  groupByRouteDevice: boolean;
}) {
  const args = [
    "metrics",
    `vercel.speed_insights_metric.${metric}`,
    "--scope",
    scope,
    "--project",
    project,
    "--since",
    since,
    "--aggregation",
    "p75",
    "--format",
    "json",
    "--filter",
    `deployment_id eq '${deploymentId}'`,
  ];

  if (groupByRouteDevice) {
    args.push("--group-by", "route", "--group-by", "device_type");
  }

  return parseMetricPayload(runVercel(args));
}

function writeJson(path: string | undefined, result: SpeedInsightsReadinessResult) {
  if (!path) return;
  const resolved = resolve(path);
  mkdirSync(dirname(resolved), { recursive: true });
  writeFileSync(resolved, `${JSON.stringify(result, null, 2)}\n`);
}

function formatValue(value: number | null) {
  if (value === null) return "missing";
  return Number.isInteger(value) ? String(value) : value.toFixed(3);
}

export function renderMarkdown(result: SpeedInsightsReadinessResult) {
  const rows = SPEED_INSIGHTS_METRICS.map((metric) => {
    const summary = result.metricSummaries[metric];
    return `| ${METRIC_LABELS[metric]} | ${formatValue(summary.valueForThreshold)} | ${summary.threshold} | ${summary.hasCurrentDeploymentData ? "yes" : "no"} | ${summary.goodThresholdMet ? "yes" : "no"} | ${summary.dataPointCount} |`;
  }).join("\n");

  return `# Vercel Speed Insights readiness check — ${result.generatedAt}\n\nStatus: **${result.resCompletionReady ? "RES COMPLETION READY" : "CURRENT DEPLOYMENT PROVIDER DATA OPEN"}**.\n\n## Target\n\n- Project: \`${result.project}\` under \`${result.scope}\`\n- Production URL: \`${result.productionUrl}\`\n- Current deployment: \`${result.currentDeploymentId}\`\n- Window: \`${result.since}\`\n- Target RES: \`${result.targetResScore}\`\n- Dashboard RES supplied: \`${result.dashboardResScore ?? "not supplied"}\`\n\n## Metric readiness\n\n| Metric | Current-deployment p75/worst value | Vercel good threshold | Has rows | Threshold met | Data points |\n| --- | ---: | ---: | --- | --- | ---: |\n${rows}\n\n## Completion gates\n\n- Current-deployment data ready: **${result.currentDeploymentDataReady ? "yes" : "no"}**\n- Core Vitals good: **${result.coreVitalsGood ? "yes" : "no"}**\n- Dashboard RES target met: **${result.dashboardResTargetMet ? "yes" : "no"}**\n- RES completion ready: **${result.resCompletionReady ? "yes" : "no"}**\n\n${result.missing.length > 0 ? `## Missing\n\n${result.missing.map((item) => `- ${item}`).join("\n")}\n\n` : ""}## Note\n\n${result.note}\n`;
}

function writeMarkdown(path: string | undefined, result: SpeedInsightsReadinessResult) {
  if (!path) return;
  const resolved = resolve(path);
  mkdirSync(dirname(resolved), { recursive: true });
  writeFileSync(resolved, renderMarkdown(result));
}

async function main() {
  const project = readEnv("SPEED_INSIGHTS_PROJECT") ?? readEnv("VERCEL_PROJECT") ?? "archestimator";
  const scope = readEnv("SPEED_INSIGHTS_SCOPE") ?? readEnv("VERCEL_SCOPE") ?? "philipjonlewis-projects";
  const productionUrl = readEnv("SPEED_INSIGHTS_PRODUCTION_URL") ?? "https://www.archestimator.com";
  const since = readEnv("SPEED_INSIGHTS_SINCE") ?? "7d";
  const targetResScore = Number(readEnv("SPEED_INSIGHTS_TARGET_RES") ?? "95");
  const dashboardResScoreEnv = readEnv("SPEED_INSIGHTS_DASHBOARD_RES_SCORE");
  const dashboardResScore = dashboardResScoreEnv ? Number(dashboardResScoreEnv) : null;
  const currentDeploymentId = resolveCurrentDeploymentId({ productionUrl, scope });

  const metricSummaries = Object.fromEntries(SPEED_INSIGHTS_METRICS.map((metric) => {
    const overallPayload = queryMetric({ metric, project, scope, since, deploymentId: currentDeploymentId, groupByRouteDevice: false });
    const routeDevicePayload = queryMetric({ metric, project, scope, since, deploymentId: currentDeploymentId, groupByRouteDevice: true });
    return [metric, summarizeMetric(metric, overallPayload, routeDevicePayload)];
  })) as Record<SpeedInsightsMetric, MetricSummary>;

  const result = evaluateSpeedInsightsReadiness({
    currentDeploymentId,
    metricSummaries,
    targetResScore,
    dashboardResScore,
    project,
    scope,
    productionUrl,
    since,
  });

  writeJson(readEnv("SPEED_INSIGHTS_OUTPUT_FILE") ?? readEnv("OUTPUT_FILE"), result);
  writeMarkdown(readEnv("SPEED_INSIGHTS_MARKDOWN_FILE") ?? readEnv("MARKDOWN_FILE"), result);

  console.log(JSON.stringify(result, null, 2));

  if (!result.resCompletionReady && readEnv("SPEED_INSIGHTS_ALLOW_NOT_READY") !== "1") {
    process.exitCode = 1;
  }
}

if (import.meta.main) {
  await main();
}
