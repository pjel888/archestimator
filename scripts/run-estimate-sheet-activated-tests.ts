#!/usr/bin/env bun

import { spawnSync } from "node:child_process";
import { existsSync, lstatSync } from "node:fs";
import { resolve, relative } from "node:path";
import {
  ESTIMATE_UNITS,
  cliBoolean,
  cliString,
  defaultEvidenceRoot,
  isContained,
  parseStrictCli,
  readJsonFile,
  sha256File,
  type EstimateUnit,
} from "./lib/estimate-sheet-performance-contract";
import { createTestReceipt, writeTestReceipt } from "./lib/estimate-sheet-performance-test-receipt";

export const ACTIVATED_ESTIMATE_TEST_REGISTRY = {
  base: [
    "tests/vitest/estimate-node-route-context-rpc-contract.test.ts",
    "tests/vitest/estimate-route-server-concurrency.test.ts",
    "tests/vitest/estimate-sheet-large-data-budgets.test.ts",
    "tests/vitest/estimate-row-table-virtualization.test.tsx",
    "tests/vitest/estimate-branch-virtualization.test.tsx",
    "tests/vitest/perf/estimate-sheet-render-baseline.test.tsx",
    "tests/vitest/perf/estimate-sheet-render-relief.test.tsx",
    "tests/vitest/perf/estimate-sheet-memoization.test.tsx",
    "tests/vitest/perf/estimate-sheet-cursor-isolation.test.tsx",
    "tests/vitest/estimate-sheet-performance-contract.test.ts",
    "tests/vitest/estimate-sheet-d1-performance.test.ts",
    "tests/vitest/estimate-mutations.test.ts",
    "tests/vitest/estimate-row-mutation-coordinator.test.tsx",
    "tests/vitest/estimate-sheet-bulk-row-delete-partial-failure.test.tsx",
    "tests/vitest/estimate-row-update-broadcast.test.ts",
    "tests/vitest/estimate-component-fan-out.test.ts",
    "tests/vitest/perf/estimate-sheet-fan-out-budget.test.tsx",
    "tests/vitest/estimate-link-state-transitions.test.ts",
    "tests/vitest/estimate-component-identity.test.ts",
    "tests/vitest/estimate-three-edit-surfaces.test.ts",
    "tests/vitest/estimate-sheet-derived-work-characterization.test.tsx",
    "tests/vitest/estimate-sheet-sidebar-render-isolation.test.tsx",
    "tests/vitest/estimate-mutation-revision-concurrency.test.ts",
    "tests/vitest/estimate-sheet-d1-bind-budget.test.ts",
  ],
  "UNIT-005": ["tests/vitest/estimate-sheet-route-large-data-contract.test.ts"],
  "UNIT-006": ["tests/vitest/estimate-graph-parity.test.ts", "tests/vitest/estimate-graph-property.test.ts", "tests/vitest/estimate-graph-selectors.test.ts"],
  "UNIT-007": ["tests/vitest/estimate-graph-totals.test.ts", "tests/vitest/estimate-sheet-derived-state-property.test.ts", "tests/vitest/perf/estimate-sheet-large-edit-budget.test.tsx"],
  "UNIT-008": ["tests/vitest/perf/estimate-sheet-large-virtualization.test.tsx"],
  "UNIT-009": ["tests/vitest/estimate-row-tree-patch.test.ts"],
} as const;

type Decision = Record<string, unknown>;

function resultFor(decision: Decision, unit: string): string | undefined {
  const branches = decision.branches ?? decision.results ?? decision.units;
  if (!branches || typeof branches !== "object") return undefined;
  const branch = (branches as Record<string, unknown>)[unit];
  if (typeof branch === "string") return branch;
  if (branch && typeof branch === "object") {
    const record = branch as Record<string, unknown>;
    return typeof record.result === "string" ? record.result : typeof record.action === "string" ? record.action : undefined;
  }
  return undefined;
}

export function resolveActivatedEstimateTests(input: {
  decision: Decision;
  repoRoot?: string;
  registry?: typeof ACTIVATED_ESTIMATE_TEST_REGISTRY;
}): string[] {
  const repoRoot = resolve(input.repoRoot ?? process.cwd());
  const registry = input.registry ?? ACTIVATED_ESTIMATE_TEST_REGISTRY;
  const selected: string[] = [...registry.base];
  for (const unit of ["UNIT-005", "UNIT-006", "UNIT-007", "UNIT-008", "UNIT-009"] as const) {
    const branch = resultFor(input.decision, unit);
    if (branch === "activate" || branch === "ACTIVATE" || branch === "VERIFIED") selected.push(...(registry[unit] as readonly string[]));
    else if (branch === "supersede" || branch === "SUPERSEDED") continue;
    else throw new Error(`decision does not contain exactly one activation/supersession result for ${unit}`);
  }
  if (resultFor(input.decision, "UNIT-007") === "activate" && resultFor(input.decision, "UNIT-006") !== "activate") throw new Error("UNIT-007 activation requires UNIT-006 activation");
  const seen = new Set<string>();
  for (const path of selected) {
    if (seen.has(path)) throw new Error(`activated test registry contains duplicate path: ${path}`);
    seen.add(path);
    const absolute = resolve(repoRoot, path);
    if (!isContained(repoRoot, absolute) || !lstatSync(absolute, { throwIfNoEntry: false })?.isFile()) throw new Error(`activated test path is missing or not a regular file: ${path}`);
  }
  return selected;
}

export function runEstimateSheetActivatedTests(input: {
  repoRoot?: string;
  decisionPath: string;
  runManifest?: string;
  execute?: boolean;
}): { files: string[]; command: string[]; exitCode: number; receiptPath?: string } {
  const repoRoot = resolve(input.repoRoot ?? process.cwd());
  const decision = readJsonFile<Decision>(resolve(repoRoot, input.decisionPath));
  const files = resolveActivatedEstimateTests({ decision, repoRoot });
  const command = ["bun", "run", "test:dom", "--", ...files, "--maxWorkers=1"];
  if (!input.execute) return { files, command, exitCode: 0 };
  if (!input.runManifest) throw new Error("executed activated tests require --run-manifest");
  const manifest = readJsonFile<Record<string, unknown>>(resolve(repoRoot, input.runManifest));
  const child = spawnSync(command[0], command.slice(1), { cwd: repoRoot, env: { ...process.env, ESTIMATE_PERF_UNIT: "UNIT-010", ESTIMATE_PERF_TEST_OUTPUT_ROLE: "dom-tests" }, shell: false, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  const manifestRoot = String(manifest.run_root);
  const application = manifest.applicationFingerprint as NonNullable<Parameters<typeof createTestReceipt>[0]["applicationFingerprint"]>;
  const producer = manifest.producerFingerprint as NonNullable<Parameters<typeof createTestReceipt>[0]["producerFingerprint"]>;
  const receipt = createTestReceipt({ testClass: "vitest", argv: command, files, unitId: "UNIT-010", runId: String(manifest.run_id), applicationFingerprint: application, producerFingerprint: producer, preApplicationFingerprint: application, preProducerFingerprint: producer, passed: child.status === 0 ? files.length : 0, failed: child.status === 0 ? 0 : 1, durationMs: 0, failureIds: child.status === 0 ? [] : ["activated-tests-failed"] });
  const receiptPath = resolve(manifestRoot, "receipts/dom-tests.json");
  writeTestReceipt(receiptPath, receipt);
  return { files, command, exitCode: child.status === 0 ? 0 : 1, receiptPath };
}

export function main(argv = process.argv.slice(2)): number {
  const values = parseStrictCli(argv);
  if (cliBoolean(values, "help")) { console.log("Usage: bun run scripts/run-estimate-sheet-activated-tests.ts --unit=UNIT-010 --decision=evidence/runtime/bottleneck-decision.json --output-role=dom-tests [--run-manifest=PATH] [--execute]"); return 0; }
  const unit = cliString(values, "unit", true);
  if (unit !== "UNIT-010") throw new Error("activated-test runner only accepts UNIT-010");
  const decision = cliString(values, "decision", true);
  if (decision !== "evidence/runtime/bottleneck-decision.json") throw new Error("decision path must be evidence/runtime/bottleneck-decision.json");
  const role = cliString(values, "output-role", true);
  if (role !== "dom-tests") throw new Error("output role must be dom-tests");
  const result = runEstimateSheetActivatedTests({ repoRoot: process.cwd(), decisionPath: `${resolve(".ai/03_plans/2026-07-08/Project-Estimate-Sheet-Performance-Optimization", decision)}`, runManifest: cliString(values, "run-manifest"), execute: cliBoolean(values, "execute") });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  return result.exitCode;
}

if (import.meta.main) {
  try { process.exitCode = main(); }
  catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
}
