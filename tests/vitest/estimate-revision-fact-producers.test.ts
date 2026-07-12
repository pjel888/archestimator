import { describe, expect, it } from "vitest";

import { ESTIMATE_REVISION_FACT_PRODUCERS } from "./fixtures/estimate-health-golden-fixture";

describe("estimate revision-fact producer registry (UNIT-001 red baseline)", () => {
  it("freezes the forward event producer inventory", () => {
    expect(ESTIMATE_REVISION_FACT_PRODUCERS).toEqual([
      "row-insert", "row-update", "row-replace", "row-move", "row-delete", "row-restore",
      "sheet-adjustment", "template-copy", "subtree-copy", "ai-package-mutation",
    ]);
  });

  it.fails("RED-EST-009: rejects incomplete facts instead of inventing revision history", async () => {
    const health = await import(/* @vite-ignore */ ["@", "/lib/estimate-health"].join(""));
    expect(health.validateEstimateRevisionFactProducerRegistry(ESTIMATE_REVISION_FACT_PRODUCERS)).toEqual({ ok: true });
  });
});
