#!/usr/bin/env bun

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import {
  ALERT_SCENARIOS,
  alertScenarioLaunchBlockers,
  validateAlertScenarioCatalog,
  type AlertScenario,
} from "../src/lib/observability/alert-scenarios";

export type AlertScenarioReadinessReport = {
  generatedAt: string;
  mode: "alert-scenario-readiness";
  proofBoundary: "local-alert-scenario-contract";
  catalogReady: boolean;
  productionAlertProducerReady: boolean;
  expectedScenarioIds: readonly string[];
  totals: {
    scenarios: number;
    implementedProofs: number;
    plannedProofs: number;
    providerBackedLaunchRequired: number;
    launchBlockers: number;
  };
  scenarios: Array<{
    id: string;
    slug: string;
    label: string;
    severity: string;
    ownerRole: string;
    signalSource: string;
    primaryChannels: readonly string[];
    detectionLatencyTarget: string;
    deliveryLatencyTarget: string;
    evaluator: string;
    proofStatus: string;
    proofCommand: string;
    proofArtifact: string;
    providerBackedRequiredForLaunch: boolean;
    paidAddOnRequired: false;
  }>;
  missing: string[];
  launchBlockers: string[];
  note: string;
};

type CheckOptions = {
  generatedAt?: string;
  scenarios?: readonly AlertScenario[];
};

type CliOptions = {
  catalogOnly: boolean;
  outputFile: string | null;
};

export function checkAlertScenarioReadiness(
  options: CheckOptions = {},
): AlertScenarioReadinessReport {
  const scenarios = options.scenarios ?? ALERT_SCENARIOS;
  const catalog = validateAlertScenarioCatalog(scenarios);
  const launchBlockers = alertScenarioLaunchBlockers(scenarios);

  return {
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    mode: "alert-scenario-readiness",
    proofBoundary: "local-alert-scenario-contract",
    catalogReady: catalog.catalogReady,
    productionAlertProducerReady: catalog.catalogReady && launchBlockers.length === 0,
    expectedScenarioIds: catalog.expectedIds,
    totals: {
      scenarios: catalog.scenarioCount,
      implementedProofs: catalog.implementedProofCount,
      plannedProofs: catalog.plannedProofCount,
      providerBackedLaunchRequired: catalog.providerBackedLaunchRequiredCount,
      launchBlockers: launchBlockers.length,
    },
    scenarios: scenarios.map((scenario) => ({
      id: scenario.id,
      slug: scenario.slug,
      label: scenario.label,
      severity: scenario.severity,
      ownerRole: scenario.ownerRole,
      signalSource: scenario.signalSource,
      primaryChannels: scenario.primaryChannels,
      detectionLatencyTarget: scenario.detectionLatencyTarget,
      deliveryLatencyTarget: scenario.deliveryLatencyTarget,
      evaluator: scenario.evaluator,
      proofStatus: scenario.proof.status,
      proofCommand: scenario.proof.command,
      proofArtifact: scenario.proof.artifact,
      providerBackedRequiredForLaunch: scenario.proof.providerBackedRequiredForLaunch,
      paidAddOnRequired: scenario.freeTier.paidAddOnRequired,
    })),
    missing: catalog.missing,
    launchBlockers,
    note: "Local alert-scenario contract check. It proves that the seven alert scenarios have explicit owners, channels, latency targets, proof commands, artifacts, and a no-paid-add-on stance. It does not query Cloudflare, send webhooks, inspect D1, prove poller cadence, or turn local catalog readiness into hosted alert delivery proof.",
  };
}

export function formatAlertScenarioReadinessSummary(
  report: AlertScenarioReadinessReport,
  outputFile?: string,
  options: { catalogOnly?: boolean } = {},
) {
  const targetReady = options.catalogOnly ? report.catalogReady : report.productionAlertProducerReady;
  const label = options.catalogOnly ? "Alert scenario catalog check" : "Alert scenario producer check";
  const outputSuffix = outputFile ? `; output=${outputFile}` : "";
  const lines = [
    `${label} ${targetReady ? "passed" : "failed"}${outputSuffix}`,
    `Catalog ready: ${report.catalogReady}; productionAlertProducerReady=${report.productionAlertProducerReady}`,
    `Scenarios: ${report.totals.scenarios}/${report.expectedScenarioIds.length}; implementedProofs=${report.totals.implementedProofs}; plannedProofs=${report.totals.plannedProofs}`,
  ];

  if (!report.catalogReady) {
    lines.push(`Missing catalog fields: ${report.missing.join(", ") || "none"}`);
  }

  for (const scenario of report.scenarios.filter((item) => item.proofStatus !== "implemented")) {
    lines.push(`- ${scenario.id} ${scenario.slug}: proof=${scenario.proofStatus}; command=${scenario.proofCommand}; artifact=${scenario.proofArtifact}`);
  }

  if (!report.productionAlertProducerReady) {
    lines.push(`Launch blockers: ${report.launchBlockers.join(", ") || "none"}`);
    lines.push("Next: implement any missing provider-backed proof producers, collect hosted artifacts through the production observability drill, then rerun this check with production observability checks.");
  }

  return lines;
}

function parseArgs(argv: string[], env: Record<string, string | undefined> = process.env): CliOptions {
  let catalogOnly = false;
  let outputFile = env.ALERT_SCENARIO_READINESS_OUTPUT_FILE?.trim() || env.OUTPUT_FILE?.trim() || null;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--catalog-only") {
      catalogOnly = true;
      continue;
    }
    if (arg === "--output") {
      const value = argv[index + 1]?.trim();
      if (!value) throw new Error("--output requires a path");
      outputFile = value;
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return { catalogOnly, outputFile };
}

function writeOutput(outputFile: string, report: AlertScenarioReadinessReport) {
  const resolved = resolve(outputFile);
  mkdirSync(dirname(resolved), { recursive: true });
  writeFileSync(resolved, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return resolved;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const report = checkAlertScenarioReadiness();
  const output = options.outputFile ? writeOutput(options.outputFile, report) : undefined;
  console.log(formatAlertScenarioReadinessSummary(report, output, { catalogOnly: options.catalogOnly }).join("\n"));
  if (options.catalogOnly ? !report.catalogReady : !report.productionAlertProducerReady) {
    process.exitCode = 1;
  }
}

if (import.meta.main) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
