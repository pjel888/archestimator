import { describe, expect, it } from "vitest";

import policy from "../../../quality/operations-policy.json";
import {
  operationsVerdict,
  planLocalOperationCheck,
  selectOperationsChecks,
  statusForUnexecutedCheck,
  validateBundleBudgetArtifact,
  validateOperationsPolicy,
  validateOperationsProfileSelection,
  type OperationsPolicy,
} from "../../../scripts/quality/operations-core";

const operationsPolicy = policy as OperationsPolicy;
const bundleGeneratedAt = "2026-07-26T04:00:00.000Z";
const bundleNow = new Date("2026-07-26T04:30:00.000Z");

function validBundleArtifact() {
  return {
    schema_version: 1,
    kind: "command-evidence",
    status: "PASS",
    generated_at: bundleGeneratedAt,
    data: {
      command: ["bun", "scripts/check-performance-budgets.mjs", "--strict"],
      evidence_id: "bundle-budget",
      command_text: "bun scripts/check-performance-budgets.mjs --strict",
      started_at: "2026-07-26T03:59:00.000Z",
      finished_at: "2026-07-26T04:00:01.000Z",
      exit_code: 0,
      stdout_tail: "[perf-budget] PASS: all routes within budget.",
    },
  };
}

function selected(
  profile: Parameters<typeof selectOperationsChecks>[0],
  files: string[],
  capabilities: string[] = [],
) {
  return new Map(
    selectOperationsChecks(profile, files, capabilities, operationsPolicy)
      .map((selection) => [selection.id, selection]),
  );
}

describe("operations capability selector", () => {
  it("accepts the canonical operations policy", () => {
    expect(validateOperationsPolicy(operationsPolicy)).toEqual([]);
  });

  it("requires every canonical policy check exactly once", () => {
    const missing = {
      ...operationsPolicy,
      checks: operationsPolicy.checks.filter((check) => check.id !== "bundle_budget"),
    };
    const duplicate = {
      ...operationsPolicy,
      checks: [...operationsPolicy.checks, operationsPolicy.checks[0]],
    };
    const unsupported = {
      ...operationsPolicy,
      checks: [
        ...operationsPolicy.checks.slice(1),
        { ...operationsPolicy.checks[0], id: "unsupported_local_check" },
      ],
    } as OperationsPolicy;
    const malformed = {
      ...operationsPolicy,
      checks: operationsPolicy.checks.map((check) =>
        check.id === "bundle_budget" ? { ...check, provenance: "" } : check
      ),
    };
    expect(validateOperationsPolicy(missing)).toContain("bundle_budget: canonical check is missing");
    expect(validateOperationsPolicy(duplicate)).toContain(
      "duplicate or empty check id: route_readiness_contract",
    );
    expect(validateOperationsPolicy(unsupported)).toEqual(expect.arrayContaining([
      "unsupported_local_check: unknown canonical check",
      "route_readiness_contract: canonical check is missing",
    ]));
    expect(validateOperationsPolicy(malformed)).toContain("bundle_budget: provenance is required");
  });

  it("builds exact pure dispatch plans for every canonical local check", () => {
    const paths = {
      performanceDirectory: "C:/repo/artifacts/performance",
      observabilityDirectory: "C:/repo/artifacts/observability",
      migrationsDirectory: "C:/repo/artifacts/migrations",
      bundleArtifactPath: "C:/repo/artifacts/quality/bundle-budget.json",
    };
    const plans = operationsPolicy.checks
      .filter((check) => check.kind === "local")
      .map((check) => planLocalOperationCheck(check.id, paths));
    expect(plans).toEqual([
      {
        id: "route_readiness_contract",
        command: "bun",
        args: ["run", "scripts/check-route-transition-readiness.ts"],
        env: {
          ROUTE_TRANSITION_BENCHMARK_FILE: "C:/repo/artifacts/performance/route-readiness.synthetic.json",
          OUTPUT_FILE: "C:/repo/artifacts/performance/route-readiness.contract.json",
        },
        artifacts: [
          "C:/repo/artifacts/performance/route-readiness.synthetic.json",
          "C:/repo/artifacts/performance/route-readiness.contract.json",
        ],
        message: "Existing route-readiness evaluator accepted the deterministic local fixture; this is evaluator wiring proof, not measured route performance",
      },
      {
        id: "bundle_budget",
        command: "consume strict bundle-budget command evidence from build job",
        args: [],
        env: {},
        artifacts: ["C:/repo/artifacts/quality/bundle-budget.json"],
        message: "Strict bundle budget passed in the build job",
      },
      {
        id: "query_count_contract",
        command: "bun",
        args: ["run", "scripts/measure-workshop-dashboard-query-count.ts"],
        env: {
          PERF_TRACE_INPUT: "C:/repo/artifacts/performance/dashboard-query-count.synthetic.log",
          OUTPUT_FILE: "C:/repo/artifacts/performance/dashboard-query-count.contract.json",
        },
        artifacts: [
          "C:/repo/artifacts/performance/dashboard-query-count.synthetic.log",
          "C:/repo/artifacts/performance/dashboard-query-count.contract.json",
        ],
        message: "Existing query-count collector accepted the deterministic local fixture; this is collector wiring proof, not a live query budget",
      },
      {
        id: "d1_migration_state",
        command: "bun",
        args: ["run", "scripts/check-cloudflare-d1-migrations.ts", "--local"],
        env: { OUTPUT_FILE: "C:/repo/artifacts/migrations/d1-migration-state.json" },
        artifacts: [],
        message: "Local check passed",
      },
      {
        id: "platform_readiness",
        command: "bun",
        args: ["run", "cf:check-readiness"],
        env: { OUTPUT_FILE: "C:/repo/artifacts/observability/cloudflare-worker-readiness.json" },
        artifacts: ["C:/repo/artifacts/observability/cloudflare-worker-readiness.json"],
        message: "Local source/config readiness passed; hosted resources and secrets remain outside this proof",
      },
      {
        id: "observability_contract",
        command: "bun",
        args: [
          "run",
          "ops:check-alert-scenarios",
          "--",
          "--catalog-only",
          "--output",
          "C:/repo/artifacts/observability/alert-scenario-readiness.json",
        ],
        env: {},
        artifacts: ["C:/repo/artifacts/observability/alert-scenario-readiness.json"],
        message: "Local alert scenario catalog passed; alert delivery remains external",
      },
      {
        id: "redaction_contract",
        command: "bun",
        args: [
          "run",
          "ops:check-error-handling",
          "--",
          "--output",
          "C:/repo/artifacts/observability/error-handling-contract.json",
        ],
        env: {},
        artifacts: ["C:/repo/artifacts/observability/error-handling-contract.json"],
        message: "Local check passed",
      },
    ]);
    expect(planLocalOperationCheck("unsupported_local_check", paths)).toBeNull();
  });

  it("maps UI changes to route and bundle evidence", () => {
    const checks = selected("Q1_CHANGE_GATE", ["src/app/workshop/page.tsx"]);
    expect(checks.get("route_readiness_contract")?.applicable).toBe(true);
    expect(checks.get("bundle_budget")?.applicable).toBe(true);
    expect(checks.get("query_count_contract")?.applicable).toBe(false);
    expect(checks.get("d1_migration_state")?.applicable).toBe(false);
  });

  it("maps data changes to query-count and migration evidence", () => {
    const checks = selected(
      "Q2_CRITICAL_CHANGE_GATE",
      ["src/db/repositories/projects-repository.ts"],
      ["CAP-DATA-INTEGRITY", "CAP-MIGRATION"],
    );
    expect(checks.get("query_count_contract")?.applicable).toBe(true);
    expect(checks.get("d1_migration_state")?.applicable).toBe(true);
    expect(checks.get("bundle_budget")?.applicable).toBe(false);
  });

  it("marks unrelated changes not applicable", () => {
    const checks = selected("Q1_CHANGE_GATE", ["docs/product-notes.md"]);
    expect([...checks.values()].every((check) => !check.applicable)).toBe(true);
  });

  it("requires the complete local set for Q3", () => {
    const checks = selected("Q3_RELEASE_GATE", ["quality/release-request.json"]);
    const localIds = operationsPolicy.checks
      .filter((check) => check.kind === "local")
      .map((check) => check.id);
    expect(localIds.every((id) => checks.get(id)?.required === true)).toBe(true);
  });

  it("keeps hosted evidence external pending with explicit provenance", () => {
    const selections = selectOperationsChecks(
      "Q3_RELEASE_GATE",
      ["quality/release-request.json"],
      [],
      operationsPolicy,
    );
    const external = operationsPolicy.checks.filter((check) => check.kind === "external");
    expect(external).not.toHaveLength(0);
    for (const check of external) {
      const selection = selections.find((candidate) => candidate.id === check.id)!;
      expect(statusForUnexecutedCheck(check, selection)).toBe("EXTERNAL_PENDING");
      expect(check.provenance).toMatch(/^external-/u);
    }
    expect(
      operationsVerdict(
        "Q3_RELEASE_GATE",
        external.map(() => ({ status: "EXTERNAL_PENDING", required: true })),
      ),
    ).toBe("QUALITY_BLOCKED");
  });

  it("rejects profile downgrades and forged bundle success", () => {
    expect(
      validateOperationsProfileSelection(
        "Q1_CHANGE_GATE",
        "Q2_CRITICAL_CHANGE_GATE",
      ),
    ).toMatch(/weaker/u);
    expect(
      validateBundleBudgetArtifact(
        { ...validBundleArtifact(), status: "FAIL" },
        bundleNow,
      ),
    ).toBe(false);
    expect(validateBundleBudgetArtifact(validBundleArtifact(), bundleNow)).toBe(true);
  });

  it("fails closed on missing, stale, and malformed bundle evidence", () => {
    const stale = {
      ...validBundleArtifact(),
      generated_at: "2026-07-25T04:00:00.000Z",
      data: {
        ...validBundleArtifact().data,
        started_at: "2026-07-25T03:59:00.000Z",
        finished_at: "2026-07-25T04:00:01.000Z",
      },
    };
    const malformed = {
      ...validBundleArtifact(),
      data: { ...validBundleArtifact().data, command_text: "bun run build" },
    };
    expect(validateBundleBudgetArtifact({}, bundleNow)).toBe(false);
    expect(validateBundleBudgetArtifact(stale, bundleNow)).toBe(false);
    expect(validateBundleBudgetArtifact(malformed, bundleNow)).toBe(false);
  });
});
