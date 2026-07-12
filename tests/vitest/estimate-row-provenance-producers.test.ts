import { describe, expect, it } from "vitest";

import { ESTIMATE_ROW_PROVENANCE_PRODUCERS } from "./fixtures/estimate-health-golden-fixture";

describe("estimate-row provenance producer registry (UNIT-001 red baseline)", () => {
  it("freezes every product, proof, and unsupported writer classification", () => {
    expect(ESTIMATE_ROW_PROVENANCE_PRODUCERS).toContain("ai-package-replacement");
    expect(ESTIMATE_ROW_PROVENANCE_PRODUCERS).toContain("synthetic-proof-writer");
    expect(ESTIMATE_ROW_PROVENANCE_PRODUCERS).toContain("unsupported-row-restore");
  });

  it.fails("RED-EST-008: classifies every registry producer before it can write a row", async () => {
    const health = await import(/* @vite-ignore */ ["@", "/lib/estimate-health"].join(""));
    expect(health.validateEstimateRowProvenanceProducerRegistry(ESTIMATE_ROW_PROVENANCE_PRODUCERS)).toEqual({ ok: true });
  });
});
