#!/usr/bin/env bun

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  DECISION_SCHEMA,
  PERFORMANCE_BUDGETS,
  assertRunManifest,
  canonicalJson,
  cliBoolean,
  cliString,
  ensureContainedRunPath,
  nowIso,
  parseStrictCli,
  readJsonFile,
  sha256File,
  sha256Json,
  writeJsonNoOverwrite,
  type RunManifestV1,
} from "./lib/estimate-sheet-performance-contract";

type Metric = { value?: number; threshold?: number; status?: string };
type Report = { metrics?: Record<string, Metric>; overall?: string; applicationFingerprint?: unknown; producerFingerprint?: unknown; application_fingerprint?: unknown; producer_fingerprint?: unknown };

export type BottleneckBranch = {
  action: "activate" | "supersede";
  failedMetricIds: string[];
  affectedScenarioCount: number;
  normalizedOverage: number;
  predicate: string;
};

export type BottleneckDecisionV1 = {
  schema_version: typeof DECISION_SCHEMA;
  unit_id: "UNIT-004";
  run_id: string;
  application_fingerprint: unknown;
  producer_fingerprint: unknown;
  branches: Record<"UNIT-005" | "UNIT-006" | "UNIT-007" | "UNIT-008" | "UNIT-009", BottleneckBranch>;
  ranking: string[];
  predecessor: { application_fingerprint: unknown; producer_fingerprint: unknown };
  evidence: Record<string, { path: string; sha256: string }>;
  overall: "PASS" | "FAIL";
  failures: string[];
  created_at: string;
  payload_sha256: string;
};

function metricFails(metric: Metric | undefined): boolean {
  if (!metric || metric.status === "FAIL") return true;
  if (metric.status === "SKIPPED" || metric.status === undefined) return true;
  if (typeof metric.value !== "number" || !Number.isFinite(metric.value)) return true;
  if (typeof metric.threshold === "number") return metric.value > metric.threshold;
  return false;
}

function readReport(path: string): Report {
  if (!existsSync(path)) throw new Error(`decision evidence is missing: ${path}`);
  return readJsonFile<Report>(path);
}

function branchFor(name: BottleneckBranch["predicate"], report: Report, metricIds: string[]): BottleneckBranch {
  const failedMetricIds = metricIds.filter((id) => metricFails(report.metrics?.[id]));
  const normalizedOverage = failedMetricIds.reduce((sum, id) => {
    const metric = report.metrics?.[id];
    if (!metric || typeof metric.value !== "number" || typeof metric.threshold !== "number" || metric.threshold <= 0) return sum + 1;
    return sum + Math.max(1, (metric.value - metric.threshold) / metric.threshold);
  }, 0);
  return { action: failedMetricIds.length ? "activate" : "supersede", failedMetricIds, affectedScenarioCount: failedMetricIds.length, normalizedOverage, predicate: name };
}

export function writeEstimateSheetBottleneckDecision(input: {
  runManifest: string;
  output?: string;
  evidence?: Record<string, string>;
}): { decision: BottleneckDecisionV1; outputPath: string } {
  const manifest = readJsonFile<RunManifestV1>(resolve(input.runManifest));
  assertRunManifest(manifest);
  const evidencePaths = input.evidence ?? {};
  const reports: Record<string, Report> = {};
  for (const [key, path] of Object.entries(evidencePaths)) reports[key] = readReport(resolve(path));
  const baseline = reports.jsdom ?? reports.browser ?? reports.d1 ?? {};
  const route = reports.route ?? reports.browser ?? baseline;
  const derived = reports.derived ?? baseline;
  const render = reports.render ?? reports.browser ?? baseline;
  const mutation = reports.mutation ?? reports.browser ?? baseline;
  const branches: BottleneckDecisionV1["branches"] = {
    "UNIT-005": branchFor("route/D1/bind-ceiling predicate", route, ["M-ROUTE-COLD-MEDIAN", "M-ROUTE-WARM-MEDIAN", "M-D1-ROUTE-CONTEXT-STATEMENTS", "M-D1-TAB-TREE-STATEMENTS"]),
    "UNIT-006": branchFor("graph predicate", baseline, ["M-MUTATE-CLIENT-FANOUT-P95", "M-MUTATE-CLIENT-FANOUT-NONMATCH-INSPECTIONS", "M-GRAPH-ANCESTOR-LOOKUP-P95", "M-GRAPH-COMPONENT-LOOKUP-P95", "M-GRAPH-DUPLICATE-BYTES"]),
    "UNIT-007": branchFor("derivation/search/move predicate", derived, ["M-DERIVE-SCALAR-CPU-P95", "M-DERIVE-FULL-TREE-RECOMPUTES", "M-DERIVE-CLOSED-MOVE-OPTION-WORK", "M-DERIVE-SIDEBAR-UNRELATED-RENDER-COUNT"]),
    "UNIT-008": branchFor("render/DOM/a11y predicate", render, ["M-DOM-MOUNTED-ROWS", "M-DOM-MOUNTED-BRANCHES", "M-SCROLL-FRAME-GAP-P95", "M-LOAF-MAX", "M-LOAF-OVER-50-COUNT"]),
    "UNIT-009": branchFor("mutation/snapshot/concurrency predicate", mutation, ["M-MUTATE-WHOLE-TREE-SNAPSHOTS", "M-MUTATE-DUPLICATE-SAVE-PATCH-COUNT", "M-MUTATE-CLIENT-FANOUT-P95", "M-MUTATE-CLIENT-FANOUT-NONMATCH-INSPECTIONS"]),
  };
  if (branches["UNIT-007"].action === "activate") branches["UNIT-006"].action = "activate";
  const ranking = Object.entries(branches).filter(([, value]) => value.action === "activate").sort(([, left], [, right]) => right.failedMetricIds.length - left.failedMetricIds.length || right.normalizedOverage - left.normalizedOverage).map(([unit]) => unit);
  const evidence: BottleneckDecisionV1["evidence"] = {};
  for (const [key, path] of Object.entries(evidencePaths)) evidence[key] = { path, sha256: sha256File(resolve(path)) };
  const failures = Object.values(branches).some((branch) => branch.predicate.length === 0) ? ["invalid-predicate"] : [];
  const partial = Object.keys(evidencePaths).length === 0;
  if (partial) failures.push("no-baseline-evidence");
  const payload = { schema_version: DECISION_SCHEMA, unit_id: "UNIT-004" as const, run_id: manifest.run_id, application_fingerprint: manifest.applicationFingerprint, producer_fingerprint: manifest.producerFingerprint, branches, ranking, predecessor: { application_fingerprint: manifest.applicationFingerprint, producer_fingerprint: manifest.producerFingerprint }, evidence, overall: failures.length ? "FAIL" as const : "PASS" as const, failures, created_at: nowIso() };
  const decision: BottleneckDecisionV1 = { ...payload, payload_sha256: sha256Json(payload) };
  const outputPath = ensureContainedRunPath(manifest.run_root, input.output ?? "bottleneck-decision.json");
  writeJsonNoOverwrite(outputPath, decision, 0o600);
  return { decision, outputPath };
}

export function main(argv = process.argv.slice(2)): number {
  const values = parseStrictCli(argv);
  if (cliBoolean(values, "help")) { console.log("Usage: bun run scripts/write-estimate-sheet-bottleneck-decision.ts --run-manifest=PATH --output=auto:decision [--evidence=NAME=PATH,...]"); return 0; }
  const runManifest = cliString(values, "run-manifest") ?? process.env.ESTIMATE_PERF_RUN_MANIFEST;
  if (!runManifest) throw new Error("decision requires --run-manifest");
  const evidence: Record<string, string> = {};
  for (const entry of (cliString(values, "evidence") ?? "").split(",").filter(Boolean)) {
    const equals = entry.indexOf("=");
    if (equals < 1) throw new Error(`invalid evidence mapping: ${entry}`);
    evidence[entry.slice(0, equals)] = entry.slice(equals + 1);
  }
  const output = cliString(values, "output")?.replace(/^auto:/u, "") || undefined;
  const result = writeEstimateSheetBottleneckDecision({ runManifest, output, evidence });
  process.stdout.write(`${JSON.stringify({ ...result.decision, output_path: result.outputPath }, null, 2)}\n`);
  return result.decision.overall === "PASS" ? 0 : 1;
}

if (import.meta.main) {
  try { process.exitCode = main(); }
  catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
}

