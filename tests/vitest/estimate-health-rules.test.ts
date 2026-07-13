import { describe, expect, it } from "vitest";

import { evaluateEstimateHealth } from "@/lib/estimate-health";
import { ESTIMATE_HEALTH_GOLDEN_FIXTURE, ESTIMATE_HEALTH_RULE_IDS } from "./fixtures/estimate-health-golden-fixture";

describe("estimate-health rules contract (UNIT-001 red baseline)", () => {
  it("freezes the full stable issue taxonomy", () => {
    expect(ESTIMATE_HEALTH_RULE_IDS).toEqual([
      "unpriced", "quantity-missing", "provenance-missing", "price-stale", "price-very-stale",
      "source-changed", "source-discontinued", "budget-missing", "budget-near", "budget-over",
    ]);
  });

  it("evaluates deterministic health from normalized facts", () => {
    const first = evaluateEstimateHealth(ESTIMATE_HEALTH_GOLDEN_FIXTURE);
    const second = evaluateEstimateHealth(ESTIMATE_HEALTH_GOLDEN_FIXTURE);
    expect(first).toEqual(second);
    expect(first.summary).toMatchObject({ grade: "needs_attention", policyRevision: 7 });
    expect(first.issues.map((issue) => issue.ruleId)).toEqual([
      "price-very-stale", "source-discontinued", "unpriced", "price-stale", "provenance-missing", "quantity-missing", "source-changed",
    ]);
    expect(first.issues.find((issue) => issue.ruleId === "provenance-missing")?.rowIds).toEqual(["missing-provenance", "synthesized"]);
  });

  it("uses estimate budget before project fallback and never grades invalid-clock facts healthy", () => {
    const onlyHealthyRows = ESTIMATE_HEALTH_GOLDEN_FIXTURE.rows.filter((row) => row.id === "healthy");
    const estimateBudget = evaluateEstimateHealth({ ...ESTIMATE_HEALTH_GOLDEN_FIXTURE, rows: onlyHealthyRows, estimateBudget: 200, projectTargetBudget: 100 });
    const projectBudget = evaluateEstimateHealth({ ...ESTIMATE_HEALTH_GOLDEN_FIXTURE, rows: onlyHealthyRows, estimateBudget: null, projectTargetBudget: 100 });
    const invalidClock = evaluateEstimateHealth({ ...ESTIMATE_HEALTH_GOLDEN_FIXTURE, rows: onlyHealthyRows, clock: "not-a-date", estimateBudget: 1_000 });

    expect(estimateBudget.summary.budget).toEqual({ state: "near", amount: 200, source: "estimate" });
    expect(projectBudget.summary.budget).toEqual({ state: "over", amount: 100, source: "project" });
    expect(invalidClock.summary).toMatchObject({ incomplete: true, grade: "review" });
  });
});
