#!/usr/bin/env bun

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  PERFORMANCE_REPORT_SCHEMA,
  assertPerformanceReport,
  assertRunManifest,
  canonicalJson,
  cliBoolean,
  cliString,
  ensureContainedRunPath,
  nowIso,
  parseStrictCli,
  readJsonFile,
  sha256File,
  sha256Hex,
  writeJsonNoOverwrite,
  type PerformanceReportV1,
  type RunManifestV1,
} from "./lib/estimate-sheet-performance-contract";
import { computeEstimateSheetSourceFingerprint } from "./compute-estimate-sheet-source-fingerprint";

const EVIDENCE_CLASSES = new Set(["jsdom", "local-browser", "local-d1", "hosted-d1"]);
const BUDGET_POLICIES = new Set(["record-only", "enforce"]);

function resolveManifest(path: string): RunManifestV1 {
  const manifest = readJsonFile<RunManifestV1>(resolve(path));
  assertRunManifest(manifest);
  return manifest;
}

function fixtureHashFromInput(path: string | undefined): string {
  if (path && existsSync(resolve(path))) return sha256File(resolve(path));
  return sha256Hex("estimate-sheet-fixture-unavailable\0");
}

function emptyMetrics(): Record<string, unknown> {
  return {
    "M-GRAPH-ANCESTOR-LOOKUP-P95": { value: 0, unit: "ms", threshold: 5, status: "PASS" },
    "M-GRAPH-COMPONENT-LOOKUP-P95": { value: 0, unit: "ms", threshold: 5, status: "PASS" },
    "M-GRAPH-DUPLICATE-BYTES": { value: 0, unit: "bytes", threshold: 0, status: "PASS" },
    "M-DERIVE-CLOSED-MOVE-OPTION-WORK": { value: 0, unit: "count", threshold: 0, status: "PASS" },
    "M-DERIVE-SIDEBAR-UNRELATED-RENDER-COUNT": { value: 0, unit: "count", threshold: 0, status: "PASS" },
    "M-MUTATE-CLIENT-FANOUT-NONMATCH-INSPECTIONS": { value: 0, unit: "count", threshold: 0, status: "PASS" },
    "M-MUTATE-DUPLICATE-SAVE-PATCH-COUNT": { value: 1, unit: "count", threshold: 1, status: "PASS" },
  };
}

export function createEstimateSheetPerformanceReport(input: {
  manifest: RunManifestV1;
  evidenceClass: PerformanceReportV1["evidenceClass"];
  fixtureHash?: string;
  buildHash?: string | null;
  profile?: PerformanceReportV1["method"]["profile"];
  outputRole?: string;
  budgetPolicy?: "record-only" | "enforce";
  overall?: "PASS" | "FAIL";
  failures?: string[];
}): PerformanceReportV1 {
  const fingerprint = computeEstimateSheetSourceFingerprint({ repoRoot: process.cwd() }).fingerprint;
  const report: PerformanceReportV1 = {
    schema_version: PERFORMANCE_REPORT_SCHEMA,
    evidenceClass: input.evidenceClass,
    trace: {
      packageId: input.manifest.package_id,
      unitId: input.manifest.unit_id,
      evidenceId: input.outputRole,
      requirementIds: ["REQ-013", "OPS-001", "OPS-002"],
    },
    head: fingerprint.head,
    applicationFingerprint: fingerprint.application,
    producerFingerprint: fingerprint.producer,
    fixtureHash: input.fixtureHash ?? sha256Hex("estimate-sheet-fixture-unavailable\0"),
    buildHash: input.buildHash ?? null,
    authFixtureHash: sha256Hex("estimate-sheet-auth-fixture-unavailable\0"),
    toolHashes: { evaluator: sha256Hex(canonicalJson({ schema: PERFORMANCE_REPORT_SCHEMA, role: input.outputRole ?? "report" })) },
    runId: input.manifest.run_id,
    generatedAt: nowIso(),
    method: { warmups: input.evidenceClass === "jsdom" ? 3 : 0, samples: input.evidenceClass === "jsdom" ? 30 : 0, workerCount: 1, retries: 0, profile: input.profile },
    metrics: emptyMetrics(),
    overall: input.overall ?? "FAIL",
    failures: input.failures ?? ["measurement-not-executed"],
  };
  if (input.evidenceClass === "local-browser") {
    report.browserScope = input.manifest.unit_id === "UNIT-002" ? "baseline" : "full-local";
    report.buildMode = "opennext-preview";
  } else {
    report.buildMode = "not-applicable";
  }
  assertPerformanceReport(report, { strict: true });
  return report;
}

export function measureEstimateSheetPerformance(input: {
  runManifest: string;
  evidenceClass: PerformanceReportV1["evidenceClass"];
  output?: string;
  fixtureOutput?: string;
  outputRole?: string;
  budgetPolicy?: "record-only" | "enforce";
  check?: boolean;
}): { report: PerformanceReportV1; reportPath: string } {
  const manifest = resolveManifest(input.runManifest);
  const outputPath = ensureContainedRunPath(manifest.run_root, input.output ?? `reports/${input.outputRole ?? input.evidenceClass}.json`);
  if (input.check) {
    const existing = readJsonFile<PerformanceReportV1>(outputPath);
    assertPerformanceReport(existing, { strict: true });
    if (existing.runId !== manifest.run_id || existing.trace.unitId !== manifest.unit_id) throw new Error("report run identity does not match manifest");
    return { report: existing, reportPath: outputPath };
  }
  const report = createEstimateSheetPerformanceReport({
    manifest,
    evidenceClass: input.evidenceClass,
    fixtureHash: fixtureHashFromInput(input.fixtureOutput),
    buildHash: input.evidenceClass === "local-browser" ? sha256Hex(`build-unavailable\0${manifest.run_id}`) : null,
    profile: manifest.profile === "artifact-only" ? undefined : manifest.profile,
    outputRole: input.outputRole,
    budgetPolicy: input.budgetPolicy,
    overall: "FAIL",
    failures: ["measurement-not-executed"],
  });
  writeJsonNoOverwrite(outputPath, report, 0o600);
  return { report, reportPath: outputPath };
}

export function main(argv = process.argv.slice(2)): number {
  const values = parseStrictCli(argv);
  if (cliBoolean(values, "help")) { console.log("Usage: bun run scripts/measure-estimate-sheet-performance.ts --unit=UNIT-001 --evidence-class=jsdom --run-manifest=PATH --output=auto:jsdom [--check]"); return 0; }
  const evidenceClass = cliString(values, "evidence-class", true) as string;
  if (!EVIDENCE_CLASSES.has(evidenceClass)) throw new Error(`invalid evidence class: ${evidenceClass}`);
  const policy = (cliString(values, "budget-policy") ?? "enforce") as "record-only" | "enforce";
  if (!BUDGET_POLICIES.has(policy)) throw new Error(`invalid budget policy: ${policy}`);
  const runManifest = cliString(values, "run-manifest") ?? process.env.ESTIMATE_PERF_RUN_MANIFEST;
  if (!runManifest) throw new Error("measurement requires --run-manifest or ESTIMATE_PERF_RUN_MANIFEST");
  const output = cliString(values, "output");
  const outputRole: string = output?.replace(/^auto:/u, "") ?? evidenceClass;
  const result = measureEstimateSheetPerformance({ runManifest, evidenceClass: evidenceClass as PerformanceReportV1["evidenceClass"], output: outputRole.includes("/") || outputRole.endsWith(".json") ? outputRole : `reports/${outputRole}.json`, fixtureOutput: cliString(values, "fixture-output"), outputRole, budgetPolicy: policy, check: cliBoolean(values, "check") });
  process.stdout.write(`${JSON.stringify({ ...result.report, report_path: result.reportPath }, null, 2)}\n`);
  return result.report.overall === "PASS" || policy === "record-only" ? 0 : 1;
}

if (import.meta.main) {
  try { process.exitCode = main(); }
  catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
}
