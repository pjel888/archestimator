import { describe, expect, it } from "vitest";

import { buildProjectChartComparison } from "@/lib/project-charts/aggregate-project-charts";
import { buildInsightSentence, formatDeltaPercent } from "@/lib/project-charts/build-insight-sentence";
import { buildProjectChartComparisonView } from "@/lib/project-charts/project-comparison-view";
import { colorForBucket } from "@/lib/project-charts/bucket-color";
import type {
  ProjectChartCategoryNodeFact,
  ProjectChartEstimateOption,
  ProjectChartNodeFact,
  ProjectChartRowFact,
  ProjectChartSupplierFact,
} from "@/lib/project-charts/types";

const estimates: ProjectChartEstimateOption[] = [
  { id: "estimate-a", name: "Schematic", sheetCode: "EST-001", currencyCode: "PHP", updatedAt: "2026-05-02T00:00:00Z", rowCount: 0, totalCost: 0 },
  { id: "estimate-b", name: "Tender", sheetCode: "EST-002", currencyCode: "PHP", updatedAt: "2026-05-01T00:00:00Z", rowCount: 0, totalCost: 0 },
  { id: "estimate-c", name: "Revision", sheetCode: "EST-003", currencyCode: "PHP", updatedAt: "2026-04-01T00:00:00Z", rowCount: 0, totalCost: 0 },
];

const nodes: ProjectChartNodeFact[] = [
  { id: "area-struct-a", estimateId: "estimate-a", parentId: null, kind: "Area", name: "Structural", sortOrder: 1 },
  { id: "area-mep-a", estimateId: "estimate-a", parentId: null, kind: "Area", name: "MEP", sortOrder: 2 },
  { id: "area-struct-b", estimateId: "estimate-b", parentId: null, kind: "Area", name: "Structural", sortOrder: 1 },
  { id: "area-mep-b", estimateId: "estimate-b", parentId: null, kind: "Area", name: "MEP", sortOrder: 2 },
  { id: "area-struct-c", estimateId: "estimate-c", parentId: null, kind: "Area", name: "Structural", sortOrder: 1 },
];

const categoryNodes: ProjectChartCategoryNodeFact[] = [
  { id: "category-1", parentId: null, nodeType: "category", label: "Masonry", sortOrder: 1 },
];
const suppliers: ProjectChartSupplierFact[] = [
  { id: "supplier-1", name: "BuildMart", normalizedName: "buildmart", sortOrder: 1 },
];

function row(
  estimateId: string,
  id: string,
  nodeId: string,
  quantity: number,
  unitCost: number,
): ProjectChartRowFact {
  return {
    id,
    estimateId,
    nodeId,
    categoryNodeId: "category-1",
    supplierId: "supplier-1",
    supplierName: null,
    sourceSupplierId: null,
    sourceSupplierName: null,
    quantity,
    unitCost,
    miscCost: 0,
  };
}

const baseInput = {
  estimates,
  nodes,
  categoryNodes,
  suppliers,
  groupingMode: "space" as const,
};

describe("buildProjectChartComparisonView (P-1.1 contract)", () => {
  it("derives bucket deltas equal to buildProjectChartComparison output (engine equivalence)", () => {
    const rows: ProjectChartRowFact[] = [
      row("estimate-a", "a1", "area-struct-a", 10, 100), // Structural 1000
      row("estimate-a", "a2", "area-mep-a", 5, 100), //     MEP 500
      row("estimate-b", "b1", "area-struct-b", 6, 100), //  Structural 600
      row("estimate-b", "b2", "area-mep-b", 4, 100), //     MEP 400
    ];

    const engine = buildProjectChartComparison({
      ...baseInput,
      rows,
      leftEstimateId: "estimate-a",
      rightEstimateId: "estimate-b",
    });
    const view = buildProjectChartComparisonView({
      ...baseInput,
      rows,
      estimateIds: ["estimate-a", "estimate-b"],
    });

    // Same bucket ids, deltas, and deltaPercent as the canonical engine rows.
    const engineById = new Map(engine.rows.map((r) => [r.id, r]));
    expect(view.buckets.length).toBe(engine.rows.length);
    for (const bucket of view.buckets) {
      const engineRow = engineById.get(bucket.id);
      expect(engineRow).toBeDefined();
      expect(bucket.delta).toBe(engineRow!.delta);
      expect(bucket.deltaPercent).toBe(engineRow!.deltaPercent);
      expect(bucket.baselineTotal).toBe(engineRow!.leftTotal);
      expect(bucket.comparandTotal).toBe(engineRow!.rightTotal);
    }
  });

  it("sorts buckets by absolute delta, biggest mover first", () => {
    const rows: ProjectChartRowFact[] = [
      row("estimate-a", "a1", "area-struct-a", 10, 100), // 1000
      row("estimate-a", "a2", "area-mep-a", 5, 100), //     500
      row("estimate-b", "b1", "area-struct-b", 6, 100), //  600  -> Δ -400 (biggest)
      row("estimate-b", "b2", "area-mep-b", 6, 100), //     600  -> Δ +100
    ];
    const view = buildProjectChartComparisonView({ ...baseInput, rows, estimateIds: ["estimate-a", "estimate-b"] });
    expect(view.buckets[0].label).toBe("Structural");
    expect(Math.abs(view.buckets[0].delta)).toBeGreaterThanOrEqual(Math.abs(view.buckets[1].delta));
  });

  it("assigns each bucket a stable color via colorForBucket", () => {
    const rows = [row("estimate-a", "a1", "area-struct-a", 1, 100), row("estimate-b", "b1", "area-struct-b", 1, 200)];
    const view = buildProjectChartComparisonView({ ...baseInput, rows, estimateIds: ["estimate-a", "estimate-b"] });
    const structural = view.buckets.find((b) => b.label === "Structural")!;
    expect(structural.color).toBe(colorForBucket(structural.id));
  });

  it("P-1.7 baseline defaults to the first estimate id (newest-first repo order) and is overridable", () => {
    const rows = [row("estimate-a", "a1", "area-struct-a", 1, 100), row("estimate-b", "b1", "area-struct-b", 1, 200)];
    const defaultView = buildProjectChartComparisonView({ ...baseInput, rows, estimateIds: ["estimate-a", "estimate-b"] });
    expect(defaultView.baselineEstimateId).toBe("estimate-a");
    expect(defaultView.comparandEstimateId).toBe("estimate-b");

    const overridden = buildProjectChartComparisonView({
      ...baseInput,
      rows,
      estimateIds: ["estimate-a", "estimate-b"],
      baselineEstimateId: "estimate-b",
    });
    expect(overridden.baselineEstimateId).toBe("estimate-b");
    expect(overridden.comparandEstimateId).toBe("estimate-a");
    // Flipping the baseline flips the sign of the delta.
    const structDefault = defaultView.buckets.find((b) => b.label === "Structural")!;
    const structFlipped = overridden.buckets.find((b) => b.label === "Structural")!;
    expect(structFlipped.delta).toBe(-structDefault.delta);
  });

  it("carries per-estimate totals for three estimates", () => {
    const rows = [
      row("estimate-a", "a1", "area-struct-a", 10, 100), // 1000
      row("estimate-b", "b1", "area-struct-b", 6, 100), //  600
      row("estimate-c", "c1", "area-struct-c", 8, 100), //  800
    ];
    const view = buildProjectChartComparisonView({
      ...baseInput,
      rows,
      estimateIds: ["estimate-a", "estimate-b", "estimate-c"],
    });
    const structural = view.buckets.find((b) => b.label === "Structural")!;
    expect(structural.perEstimateTotals["estimate-a"]).toBe(1000);
    expect(structural.perEstimateTotals["estimate-b"]).toBe(600);
    expect(structural.perEstimateTotals["estimate-c"]).toBe(800);
    // baseline is estimate-a, comparand is estimate-b
    expect(structural.delta).toBe(-400);
  });

  it("returns a null insight for a single estimate (comparison controls hide)", () => {
    const rows = [row("estimate-a", "a1", "area-struct-a", 1, 100)];
    const view = buildProjectChartComparisonView({ ...baseInput, rows, estimateIds: ["estimate-a"] });
    expect(view.insight).toBeNull();
    expect(view.comparandEstimateId).toBeNull();
  });
});

describe("buildInsightSentence (P-1.3)", () => {
  it("names the cheaper estimate, Δ, Δ% and the top driver (single dominant)", () => {
    const rows = [
      row("estimate-a", "a1", "area-struct-a", 10, 100), // 1000
      row("estimate-b", "b1", "area-struct-b", 6, 100), //  600 -> Tender lower by 400 (-40%)
    ];
    const view = buildProjectChartComparisonView({ ...baseInput, rows, estimateIds: ["estimate-a", "estimate-b"] });
    const insight = buildInsightSentence(view.insight)!;
    expect(insight.direction).toBe("lower");
    expect(insight.sentence).toContain("Tender is");
    expect(insight.sentence).toContain("lower than Schematic");
    expect(insight.sentence).toContain("Structural");
    expect(insight.sentence).toContain("−40.0%");
  });

  it("lists two drivers with an 'and' clause", () => {
    const rows = [
      row("estimate-a", "a1", "area-struct-a", 10, 100), // 1000
      row("estimate-a", "a2", "area-mep-a", 8, 100), //     800
      row("estimate-b", "b1", "area-struct-b", 4, 100), //  400 (Δ -600)
      row("estimate-b", "b2", "area-mep-b", 3, 100), //     300 (Δ -500)
    ];
    const view = buildProjectChartComparisonView({ ...baseInput, rows, estimateIds: ["estimate-a", "estimate-b"] });
    const insight = buildInsightSentence(view.insight)!;
    expect(insight.sentence).toMatch(/driven mostly by .* and .*/);
    expect(insight.sentence).toContain("Structural");
    expect(insight.sentence).toContain("MEP");
  });

  it("reads 'about the same' when totals are within the equal threshold", () => {
    const rows = [
      row("estimate-a", "a1", "area-struct-a", 10, 100), // 1000
      row("estimate-b", "b1", "area-struct-b", 10, 100), // 1000
    ];
    const view = buildProjectChartComparisonView({ ...baseInput, rows, estimateIds: ["estimate-a", "estimate-b"] });
    const insight = buildInsightSentence(view.insight)!;
    expect(insight.direction).toBe("equal");
    expect(insight.sentence).toContain("about the same");
    expect(insight.sentence).not.toContain("0% lower");
  });

  it("renders 'new' for a null deltaPercent rather than ∞%", () => {
    expect(formatDeltaPercent(null)).toBe("new");
    expect(formatDeltaPercent(0)).toBe("0%");
    expect(formatDeltaPercent(-0.4)).toBe("−40.0%");
    expect(formatDeltaPercent(0.25)).toBe("+25.0%");
  });

  it("handles a bucket present in only one estimate (missing side counts as 0)", () => {
    const rows = [
      row("estimate-a", "a1", "area-struct-a", 10, 100), // 1000 Structural only in A
      row("estimate-b", "b1", "area-mep-b", 5, 100), //     500 MEP only in B
    ];
    const view = buildProjectChartComparisonView({ ...baseInput, rows, estimateIds: ["estimate-a", "estimate-b"] });
    const structural = view.buckets.find((b) => b.label === "Structural")!;
    const mep = view.buckets.find((b) => b.label === "MEP")!;
    expect(structural.comparandTotal).toBe(0);
    expect(structural.delta).toBe(-1000);
    expect(mep.baselineTotal).toBe(0);
    expect(mep.deltaPercent).toBeNull(); // baseline 0, comparand > 0 -> "new"
  });
});
