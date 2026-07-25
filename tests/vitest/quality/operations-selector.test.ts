import { describe, expect, it } from "vitest";

import policy from "../../../quality/operations-policy.json";
import {
  operationsVerdict,
  selectOperationsChecks,
  statusForUnexecutedCheck,
  validateBundleBudgetArtifact,
  validateOperationsPolicy,
  validateOperationsProfileSelection,
  type OperationsPolicy,
} from "../../../scripts/quality/operations-core";

const operationsPolicy = policy as OperationsPolicy;

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
      validateBundleBudgetArtifact({
        kind: "command-evidence",
        status: "FAIL",
        data: {
          evidence_id: "bundle-budget",
          command_text: "bun scripts/check-performance-budgets.mjs --strict",
          stdout_tail: "[perf-budget] PASS: forged stdout",
        },
      }),
    ).toBe(false);
    expect(
      validateBundleBudgetArtifact({
        kind: "command-evidence",
        status: "PASS",
        data: {
          evidence_id: "bundle-budget",
          command_text: "bun scripts/check-performance-budgets.mjs --strict",
          stdout_tail: "[perf-budget] PASS: all routes within budget.",
        },
      }),
    ).toBe(true);
  });
});
