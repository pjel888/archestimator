import type { SpawnSyncReturns } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  DECISION_SCHEMA,
  PERFORMANCE_BUDGETS,
  SUPERSESSION_SCHEMA,
  sha256Hex,
  sha256Json,
  writeJsonNoOverwrite,
  type FingerprintContent,
  type PerformanceReportV1,
  type RunManifestV1,
} from "../../scripts/lib/estimate-sheet-performance-contract";
import { createTestReceipt, writeTestReceipt } from "../../scripts/lib/estimate-sheet-performance-test-receipt";
import {
  BOTTLENECK_BRANCH_ORDER,
  BOTTLENECK_OPERAND_REGISTRY,
  assertBottleneckDecision,
  evaluateBottleneckBranches,
  type BottleneckDecisionV1,
} from "../../scripts/write-estimate-sheet-bottleneck-decision";
import { assertSupersessionReceipt } from "../../scripts/write-estimate-sheet-supersession";
import {
  ACTIVATED_ESTIMATE_TEST_REGISTRY,
  resolveActivatedEstimateTests,
  validateActivatedTestReporterReceipt,
  type ActivatedEstimateTestRegistry,
} from "../../scripts/run-estimate-sheet-activated-tests";

const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

const hash = (value: string): string => sha256Hex(`estimate-decision-test:${value}`);

const applicationFingerprint: FingerprintContent = {
  contract_version: "estimate-sheet-source-scope.v1",
  path_count: 1,
  path_list_sha256: hash("application-paths"),
  content_sha256: hash("application-content"),
};

const producerFingerprint: FingerprintContent = {
  contract_version: "estimate-sheet-source-scope.v1",
  path_count: 1,
  path_list_sha256: hash("producer-paths"),
  content_sha256: hash("producer-content"),
};

type MutableMetric = Record<string, unknown>;

function passingMetric(spec: { kind: string; threshold?: number }): MutableMetric {
  if (spec.kind === "functional") return { status: "PASS", affectedScenarioCount: 1 };
  const value = spec.kind === "exact-one" ? 1 : spec.kind === "zero" ? 0 : spec.threshold;
  return {
    status: "PASS",
    value,
    threshold: spec.threshold,
    comparison: spec.kind === "exact-one" ? "exact" : "maximum",
    affectedScenarioCount: 1,
  };
}

function report(role: "jsdom" | "browser" | "d1-local", metrics: Record<string, unknown>): PerformanceReportV1 {
  return {
    schema_version: "estimate-sheet-performance-report.v1",
    evidenceClass: role === "browser" ? "local-browser" : role === "d1-local" ? "local-d1" : "jsdom",
    trace: { packageId: "PKG", unitId: role === "jsdom" ? "UNIT-001" : role === "browser" ? "UNIT-002" : "UNIT-003" },
    head: "1234567",
    applicationFingerprint,
    producerFingerprint,
    fixtureHash: hash(`${role}-fixture`),
    buildHash: role === "browser" ? hash("build") : null,
    runId: `run-${role}`,
    generatedAt: "2026-07-11T00:00:00.000Z",
    method: { warmups: 3, samples: 30, workerCount: 1, retries: 0, profile: "limit" },
    metrics,
    overall: "PASS",
    ...(role === "browser" ? { browserScope: "baseline" as const } : {}),
  };
}

function passingReports(): Record<"jsdom" | "browser" | "d1-local", PerformanceReportV1> {
  const metrics = { jsdom: {}, browser: {}, "d1-local": {} } as Record<"jsdom" | "browser" | "d1-local", Record<string, unknown>>;
  const assigned = new Set<string>();
  for (const unit of BOTTLENECK_BRANCH_ORDER) {
    for (const spec of BOTTLENECK_OPERAND_REGISTRY[unit]) {
      if (assigned.has(spec.id)) continue;
      assigned.add(spec.id);
      const role = spec.id.startsWith("M-D1-")
        ? "d1-local"
        : spec.id.startsWith("M-GRAPH-")
          || [
            "M-DERIVE-CLOSED-MOVE-OPTION-WORK",
            "M-DERIVE-SIDEBAR-UNRELATED-RENDER-COUNT",
            "M-MUTATE-CLIENT-FANOUT-NONMATCH-INSPECTIONS",
            "M-MUTATE-DUPLICATE-SAVE-PATCH-COUNT",
          ].includes(spec.id)
            ? "jsdom"
            : "browser";
      metrics[role][spec.id] = passingMetric(spec);
    }
  }
  return {
    jsdom: report("jsdom", metrics.jsdom),
    browser: report("browser", metrics.browser),
    "d1-local": report("d1-local", metrics["d1-local"]),
  };
}

function buildDecision(reports = passingReports()): BottleneckDecisionV1 {
  const evaluated = evaluateBottleneckBranches(reports);
  const activatedUnits = BOTTLENECK_BRANCH_ORDER.filter((unit) => evaluated.branches[unit].action === "activate");
  const supersededUnits = BOTTLENECK_BRANCH_ORDER.filter((unit) => evaluated.branches[unit].action === "supersede");
  const evidenceBinding = {
    unit_id: "UNIT-001",
    run_id: "run-unit-001",
    projection_path: "evidence/runtime/input.json",
    immutable_path: "evidence/runtime/runs/UNIT-001/run-unit-001/reports/input.json",
    sha256: hash("input"),
  };
  const payload = {
    schema_version: DECISION_SCHEMA,
    unit_id: "UNIT-004" as const,
    run_id: "run-unit-004",
    application_fingerprint: applicationFingerprint,
    producer_fingerprint: producerFingerprint,
    predecessor: {
      unit_id: "UNIT-003" as const,
      run_id: "run-unit-003",
      application_fingerprint: applicationFingerprint,
      producer_fingerprint: producerFingerprint,
    },
    input_index: {
      projection_path: "evidence/runtime/evidence-index.json",
      immutable_path: "evidence/runtime/runs/UNIT-003/run-unit-003/evidence-index.json",
      sha256: hash("index"),
    },
    evidence: {
      fixture: { ...evidenceBinding },
      jsdom: { ...evidenceBinding },
      browser: { ...evidenceBinding, unit_id: "UNIT-002" },
      "d1-local": { ...evidenceBinding, unit_id: "UNIT-003" },
      "decision-tests": { ...evidenceBinding, unit_id: "UNIT-004" },
    },
    branches: evaluated.branches,
    ranking: evaluated.ranking,
    activatedUnits,
    supersededUnits,
    deferredRequirements: (supersededUnits.includes("UNIT-006") ? ["REQ-014", "DATA-004"] : []) as [] | ["REQ-014", "DATA-004"],
    overall: "PASS" as const,
    failures: [] as [],
    created_at: "2026-07-11T00:00:00.000Z",
  };
  return { ...payload, payload_sha256: sha256Json(payload) };
}

function writeSelectedTestFiles(repoRoot: string, paths: readonly string[]): void {
  for (const path of paths) {
    const absolute = resolve(repoRoot, path);
    mkdirSync(dirname(absolute), { recursive: true });
    writeJsonNoOverwrite(absolute, { path });
  }
}

function tempRoot(): string {
  const root = mkdtempSync(resolve(tmpdir(), "estimate-decision-"));
  temporaryRoots.push(root);
  return root;
}

describe("estimate-sheet bottleneck decision contract", () => {
  it("freezes the complete five-branch operand registry and exact budgets", () => {
    expect(BOTTLENECK_BRANCH_ORDER).toEqual(["UNIT-005", "UNIT-006", "UNIT-007", "UNIT-008", "UNIT-009"]);
    expect(Object.fromEntries(BOTTLENECK_BRANCH_ORDER.map((unit) => [unit, BOTTLENECK_OPERAND_REGISTRY[unit].length]))).toEqual({
      "UNIT-005": 13,
      "UNIT-006": 5,
      "UNIT-007": 6,
      "UNIT-008": 12,
      "UNIT-009": 10,
    });
    expect(PERFORMANCE_BUDGETS.closedDialogMoveOptionWork).toBe(0);
    expect(PERFORMANCE_BUDGETS.unrelatedSidebarRenders).toBe(0);
    expect(PERFORMANCE_BUDGETS.authoritativePatchCount).toBe(1);
    expect(PERFORMANCE_BUDGETS.nonmatchingRowInspections).toBe(0);
  });

  it("supersedes all passing predicates without using ranking to activate them", () => {
    const evaluated = evaluateBottleneckBranches(passingReports());
    expect(evaluated.ranking).toEqual([]);
    for (const unit of BOTTLENECK_BRANCH_ORDER) expect(evaluated.branches[unit].action).toBe("supersede");
    const decision = buildDecision();
    expect(() => assertBottleneckDecision(decision)).not.toThrow();
    expect(decision.deferredRequirements).toEqual(["REQ-014", "DATA-004"]);
  });

  it("enforces UNIT-007 activation as the only non-metric UNIT-006 trigger", () => {
    const reports = passingReports();
    reports.browser.metrics["M-DERIVE-SCALAR-CPU-P95"] = {
      status: "FAIL",
      value: 50,
      threshold: 25,
      comparison: "maximum",
      scenarioIds: ["SCEN-DERIVE"],
    };
    const evaluated = evaluateBottleneckBranches(reports);
    expect(evaluated.branches["UNIT-007"].action).toBe("activate");
    expect(evaluated.branches["UNIT-006"].action).toBe("activate");
    expect(evaluated.branches["UNIT-006"].failedMetricIds).toEqual([]);
    expect(evaluated.branches["UNIT-006"].triggeredBy).toEqual(["UNIT-007"]);
    expect(evaluated.ranking).toEqual(["UNIT-007", "UNIT-006"]);
  });

  it.each([
    ["missing", (reports: ReturnType<typeof passingReports>) => { delete reports.browser.metrics["M-ROUTE-COLD-MEDIAN"]; }],
    ["non-finite", (reports: ReturnType<typeof passingReports>) => { reports.browser.metrics["M-ROUTE-COLD-MEDIAN"] = { status: "FAIL", value: Number.NaN, threshold: 3500, comparison: "maximum" }; }],
    ["stale threshold", (reports: ReturnType<typeof passingReports>) => { reports.browser.metrics["M-ROUTE-COLD-MEDIAN"] = { status: "PASS", value: 3000, threshold: 4000, comparison: "maximum" }; }],
    ["multiply mapped", (reports: ReturnType<typeof passingReports>) => { reports.jsdom.metrics["M-ROUTE-COLD-MEDIAN"] = { status: "PASS", value: 3000, threshold: 3500, comparison: "maximum" }; }],
    ["contradictory status", (reports: ReturnType<typeof passingReports>) => { reports.browser.metrics["M-ROUTE-COLD-MEDIAN"] = { status: "PASS", value: 4000, threshold: 3500, comparison: "maximum" }; }],
  ])("fails closed on %s decision evidence", (_label, mutate) => {
    const reports = passingReports();
    mutate(reports);
    expect(() => evaluateBottleneckBranches(reports)).toThrow(/missing|non-finite|stale|exactly once|contradicts/i);
  });

  it("rejects decision mutations to branch implication, ranking, and payload", () => {
    const reports = passingReports();
    reports.browser.metrics["M-DERIVE-SCALAR-CPU-P95"] = { status: "FAIL", value: 50, threshold: 25, comparison: "maximum" };
    const decision = buildDecision(reports);
    const implicationMutation = structuredClone(decision);
    implicationMutation.branches["UNIT-006"].action = "supersede";
    expect(() => assertBottleneckDecision(implicationMutation)).toThrow(
      /UNIT-006 action|UNIT-007\.activate/i,
    );

    const rankingMutation = structuredClone(decision);
    rankingMutation.ranking.reverse();
    expect(() => assertBottleneckDecision(rankingMutation)).toThrow(/ranking/i);

    const payloadMutation = structuredClone(decision);
    payloadMutation.created_at = "2026-07-12T00:00:00.000Z";
    expect(() => assertBottleneckDecision(payloadMutation)).toThrow(/payload hash/i);
  });
});

describe("estimate-sheet supersession and activated-test contracts", () => {
  it("requires a decision-backed supersession receipt with unchanged scopes and empty effects", () => {
    const payload = {
      schema_version: SUPERSESSION_SCHEMA,
      unit_id: "UNIT-005" as const,
      run_id: "run-unit-005",
      decision_path: "evidence/runtime/bottleneck-decision.json" as const,
      decision_immutable_path: "evidence/runtime/runs/UNIT-004/run-unit-004/reports/decision.json",
      decision_sha256: hash("decision"),
      action: "supersede" as const,
      reason: "predicate-false:all-explicit-operands-pass",
      predecessor: {
        unit_id: "UNIT-004",
        run_id: "run-unit-004",
        projection_path: "evidence/runtime/bottleneck-decision.json",
        immutable_path: "evidence/runtime/runs/UNIT-004/run-unit-004/reports/decision.json",
        sha256: hash("decision"),
        application_fingerprint: applicationFingerprint,
        producer_fingerprint: producerFingerprint,
      },
      input_application_fingerprint: applicationFingerprint,
      input_producer_fingerprint: producerFingerprint,
      application_fingerprint: applicationFingerprint,
      producer_fingerprint: producerFingerprint,
      changed_application_paths: [] as [],
      changed_producer_paths: [] as [],
      resources: [] as [],
      mutations: [] as [],
      output_role: "supersession" as const,
      created_at: "2026-07-11T00:00:00.000Z",
    };
    const receipt = { ...payload, payload_sha256: sha256Json(payload) };
    expect(() => assertSupersessionReceipt(receipt)).not.toThrow();

    const changed = structuredClone(receipt);
    changed.application_fingerprint = { ...applicationFingerprint, content_sha256: hash("changed") };
    expect(() => assertSupersessionReceipt(changed)).toThrow(/changed application or producer scope/i);

    const mutated = structuredClone(receipt) as typeof receipt & { resources: unknown[] };
    mutated.resources = [{ port: 3101 }];
    expect(() => assertSupersessionReceipt(mutated)).toThrow(/empty resources/i);
  });

  it("never stats superseded conditional paths and rejects a missing activated path", () => {
    const repoRoot = tempRoot();
    writeSelectedTestFiles(repoRoot, ACTIVATED_ESTIMATE_TEST_REGISTRY.base);
    const superseded = buildDecision();
    expect(resolveActivatedEstimateTests({ decision: superseded, repoRoot })).toEqual(ACTIVATED_ESTIMATE_TEST_REGISTRY.base);

    const reports = passingReports();
    reports.browser.metrics["M-ROUTE-COLD-MEDIAN"] = { status: "FAIL", value: 4000, threshold: 3500, comparison: "maximum" };
    const activated = buildDecision(reports);
    expect(() => resolveActivatedEstimateTests({ decision: activated, repoRoot })).toThrow(/missing.*route-large-data/i);
  });

  it("rejects unknown or reordered registry paths before execution", () => {
    const repoRoot = tempRoot();
    writeSelectedTestFiles(repoRoot, ACTIVATED_ESTIMATE_TEST_REGISTRY.base);
    const decision = buildDecision();
    const reordered = {
      ...ACTIVATED_ESTIMATE_TEST_REGISTRY,
      base: [...ACTIVATED_ESTIMATE_TEST_REGISTRY.base].reverse(),
    } satisfies ActivatedEstimateTestRegistry;
    expect(() => resolveActivatedEstimateTests({ decision, repoRoot, registry: reordered })).toThrow(/unknown or unordered/i);
  });

  it("accepts only the reporter's exact UNIT-010 receipt and rejects argv or fixture mutations", () => {
    const repoRoot = tempRoot();
    const runRoot = resolve(repoRoot, "run");
    mkdirSync(resolve(runRoot, "receipts"), { recursive: true });
    const files = ["tests/vitest/example.test.ts"];
    const manifest: RunManifestV1 = {
      schema_version: "estimate-sheet-performance-run.v1",
      package_id: "PKG",
      unit_id: "UNIT-010",
      run_id: "run-unit-010",
      profile: "limit",
      cleanupRequirement: "REQUIRED",
      run_root: runRoot,
      pointer_path: resolve(repoRoot, "pointer.json"),
      created_at: "2026-07-11T00:00:00.000Z",
      status: "PREPARED",
      sourceFingerprint: {
        contract_version: "estimate-sheet-source-fingerprint.v2",
        head: "1234567",
        path_count: 2,
        path_list_sha256: hash("all-paths"),
        application: applicationFingerprint,
        producer: producerFingerprint,
      },
      applicationFingerprint,
      producerFingerprint,
      namespaces: {},
      mutationJournal: [],
      previewProcesses: [],
    };
    const receiptPath = resolve(runRoot, "receipts/dom-tests.json");
    const receipt = createTestReceipt({
      testClass: "vitest",
      argv: ["node_modules/vitest/vitest.mjs", "run", ...files, "--maxWorkers=1"],
      files,
      unitId: "UNIT-010",
      runId: manifest.run_id,
      applicationFingerprint,
      producerFingerprint,
      passed: 1,
      failed: 0,
      skipped: 0,
      durationMs: 5,
    });
    writeTestReceipt(receiptPath, receipt);
    const child = { status: 0, signal: null, error: undefined } as SpawnSyncReturns<string>;
    expect(() => validateActivatedTestReporterReceipt(receiptPath, manifest, files, child, repoRoot)).not.toThrow();

    const wrongArgvPath = resolve(runRoot, "receipts/wrong-argv.json");
    writeTestReceipt(wrongArgvPath, { ...receipt, argv: ["node_modules/vitest/vitest.mjs", "run", "tests/vitest/other.test.ts", "--maxWorkers=1"] });
    expect(() => validateActivatedTestReporterReceipt(wrongArgvPath, manifest, files, child, repoRoot)).toThrow(/argv mismatch/i);

    const fixtureMutationPath = resolve(runRoot, "receipts/fixture-mutation.json");
    writeTestReceipt(fixtureMutationPath, {
      ...receipt,
      fixtureMutation: {
        fixtureRole: "browser",
        namespaceIdSha256: hash("namespace"),
        preStateSha256: hash("pre"),
        postStateSha256: hash("post"),
        declaredMutationSha256: hash("mutation"),
        commandId: "command-1",
      },
    });
    expect(() => validateActivatedTestReporterReceipt(fixtureMutationPath, manifest, files, child, repoRoot)).toThrow(/fixture state/i);
  });
});
