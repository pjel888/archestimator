import { describe, expect, it } from "vitest";

import { buildProjectChartSeries } from "@/lib/project-charts/aggregate-project-charts";
import { buildProjectChartComparisonViewFromFacts } from "@/lib/project-charts/project-comparison-view";
import {
  GOLDEN_AGGREGATION_INPUT,
  GOLDEN_EXPECTED,
  type GoldenBucket,
} from "./fixtures/project-charts-golden-master-fixture";

const MODES = ["space", "category", "supplier"] as const;
const ESTIMATE_IDS = ["estimate-a", "estimate-b"] as const;

function toGoldenBuckets(buckets: { id: string; label: string; total: number; rowCount: number }[]): GoldenBucket[] {
  return buckets.map((bucket) => ({ id: bucket.id, label: bucket.label, total: bucket.total, rowCount: bucket.rowCount }));
}

describe("project-charts golden master (P-1.4 — RPC equivalence baseline)", () => {
  for (const mode of MODES) {
    for (const estimateId of ESTIMATE_IDS) {
      it(`locks ${mode} buckets for ${estimateId} (totals/labels/ids/order)`, () => {
        const series = buildProjectChartSeries({
          ...GOLDEN_AGGREGATION_INPUT,
          groupingMode: mode,
          estimateId,
        });
        expect(toGoldenBuckets(series.allBuckets)).toEqual(GOLDEN_EXPECTED[mode][estimateId]);
      });
    }
  }

  it("locks the comparison deltas and the null-deltaPercent 'new' bucket", () => {
    const view = buildProjectChartComparisonViewFromFacts({
      ...GOLDEN_AGGREGATION_INPUT,
      groupingMode: "space",
      estimateIds: ["estimate-a", "estimate-b"],
    });

    expect(view.totalsByEstimateId).toEqual({ "estimate-a": 405, "estimate-b": 300 });

    const byLabel = new Map(view.buckets.map((bucket) => [bucket.label, bucket]));
    expect(byLabel.get("MEP")).toMatchObject({ baselineTotal: 0, comparandTotal: 200, delta: 200, deltaPercent: null });
    expect(byLabel.get("Ground Floor")).toMatchObject({ baselineTotal: 225, comparandTotal: 100, delta: -125 });
    expect(byLabel.get("Roof")).toMatchObject({ baselineTotal: 100, comparandTotal: 0, delta: -100 });
    // OWN-node bucketing: r4 (on the "House" Group node) no longer falls into
    // "Unassigned space" (now just r3, 50) — it buckets to its own "House" node.
    expect(byLabel.get("Unassigned space")).toMatchObject({ baselineTotal: 50, comparandTotal: 0, delta: -50 });
    expect(byLabel.get("House")).toMatchObject({ baselineTotal: 30, comparandTotal: 0, delta: -30, deltaPercent: -1 });

    // Sorted by |delta| desc: MEP (200) first.
    expect(view.buckets[0].label).toBe("MEP");
  });
});
