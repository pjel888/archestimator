#!/usr/bin/env bun

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  cliBoolean,
  cliString,
  ensureContainedRunPath,
  parseStrictCli,
  writeJsonNoOverwrite,
  type PerformanceReportV1,
} from "./lib/estimate-sheet-performance-contract";
import { measureEstimateSheetPerformance } from "./measure-estimate-sheet-performance";

export type D1MeasurementResult = {
  report: PerformanceReportV1;
  reportPath: string;
  providerBacked: boolean;
  blockers: string[];
};

export function measureEstimateSheetD1(input: {
  runManifest: string;
  output?: string;
  execute?: boolean;
}): D1MeasurementResult {
  const blockers: string[] = [];
  if (!input.execute) blockers.push("local D1 execution is disabled by default; pass --execute only with a prepared run-scoped database");
  const result = measureEstimateSheetPerformance({ runManifest: input.runManifest, evidenceClass: "local-d1", output: input.output ?? "reports/d1-local.json", outputRole: "d1-local", budgetPolicy: "record-only" });
  result.report.d1 = {
    provider: "cloudflare-d1-compatible",
    providerBacked: false,
    schemaHash: null,
    migrationHead: null,
    statements: [],
    queryCount: 0,
    bindCounts: [],
    rowsRead: null,
    rowsWritten: null,
    queryPlans: [],
    cleanup: { seeded: {}, deleted: {}, remaining: {} },
  };
  result.report.overall = "FAIL";
  result.report.failures = [...new Set([...(result.report.failures ?? []), "local-d1-provider-unavailable"])]
  writeJsonNoOverwrite(result.reportPath.replace(/\.json$/u, ".d1.json"), result.report, 0o600);
  return { report: result.report, reportPath: result.reportPath.replace(/\.json$/u, ".d1.json"), providerBacked: false, blockers };
}

export function main(argv = process.argv.slice(2)): number {
  const values = parseStrictCli(argv);
  if (cliBoolean(values, "help")) { console.log("Usage: bun run scripts/measure-estimate-sheet-d1.ts --run-manifest=PATH [--output=PATH] [--execute]"); return 0; }
  const runManifest = cliString(values, "run-manifest") ?? process.env.ESTIMATE_PERF_RUN_MANIFEST;
  if (!runManifest) throw new Error("D1 measurement requires --run-manifest");
  const result = measureEstimateSheetD1({ runManifest, output: cliString(values, "output") ?? "reports/d1-local.json", execute: cliBoolean(values, "execute") });
  process.stdout.write(`${JSON.stringify({ ...result.report, report_path: result.reportPath, provider_backed: result.providerBacked, blockers: result.blockers }, null, 2)}\n`);
  return result.providerBacked && result.report.overall === "PASS" ? 0 : 1;
}

if (import.meta.main) {
  try { process.exitCode = main(); }
  catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
}

