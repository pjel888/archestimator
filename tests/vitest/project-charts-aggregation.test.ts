import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  buildProjectChartComparison,
  calculateProjectChartRowTotal,
} from "@/lib/project-charts/aggregate-project-charts";
import type {
  ProjectChartCategoryNodeFact,
  ProjectChartEstimateOption,
  ProjectChartNodeFact,
  ProjectChartRowFact,
  ProjectChartSupplierFact,
} from "@/lib/project-charts/types";

const estimates: ProjectChartEstimateOption[] = [
  {
    id: "estimate-a",
    name: "Baseline",
    sheetCode: "EST-001",
    currencyCode: "PHP",
    updatedAt: "2026-05-01T00:00:00.000Z",
    rowCount: 0,
    totalCost: 0,
  },
  {
    id: "estimate-b",
    name: "Revision",
    sheetCode: "EST-002",
    currencyCode: "PHP",
    updatedAt: "2026-05-02T00:00:00.000Z",
    rowCount: 0,
    totalCost: 0,
  },
];

const nodes: ProjectChartNodeFact[] = [
  { id: "area-1", estimateId: "estimate-a", parentId: null, kind: "Area", name: "Ground Floor", sortOrder: 1 },
  { id: "group-1", estimateId: "estimate-a", parentId: "area-1", kind: "Group", name: "Finishes", sortOrder: 2 },
  { id: "area-2", estimateId: "estimate-b", parentId: null, kind: "Area", name: "Second Floor", sortOrder: 1 },
  { id: "group-2", estimateId: "estimate-b", parentId: "area-2", kind: "Group", name: "Finishes", sortOrder: 2 },
];

const categoryNodes: ProjectChartCategoryNodeFact[] = [
  { id: "organizer", parentId: null, nodeType: "organizer", label: "Scopes", sortOrder: 1 },
  { id: "category-1", parentId: "organizer", nodeType: "category", label: "Masonry", sortOrder: 2 },
  { id: "subcategory-1", parentId: "category-1", nodeType: "subcategory", label: "CHB", sortOrder: 3 },
];

const suppliers: ProjectChartSupplierFact[] = [
  { id: "supplier-1", name: "BuildMart", normalizedName: "buildmart", sortOrder: 1 },
];

describe("project chart aggregation", () => {
  it("keeps chart repository reads isolated from estimate history tables", () => {
    const repositorySource = readFileSync(join(process.cwd(), "src/lib/repositories/project-charts-repository.ts"), "utf8");

    expect(repositorySource).toContain('from("estimate_row_items")');
    expect(repositorySource).not.toContain("estimate_sheet_events");
    expect(repositorySource).not.toContain("estimate_sheet_versions");
    expect(repositorySource).not.toContain("create_estimate_sheet_version");
    expect(repositorySource).not.toContain("restore_estimate_sheet_version_as_copy");
  });

  it("bounds every expensive chart repository read before aggregation", () => {
    const repositorySource = readFileSync(join(process.cwd(), "src/lib/repositories/project-charts-repository.ts"), "utf8");

    expect(repositorySource).toContain("ESTIMATE_OPTION_LIMIT + 1");
    expect(repositorySource).toContain("ESTIMATE_ROW_LIMIT + 1");
    expect(repositorySource).toContain("ESTIMATE_NODE_LIMIT + 1");
    expect(repositorySource).toContain("CATEGORY_FACT_LIMIT + 1");
    expect(repositorySource).toContain("SUPPLIER_FACT_LIMIT + 1");
    expect(repositorySource).toContain("defaultEstimateIds");
    expect(repositorySource).toContain("didHitRowLimit");
    expect(repositorySource).toContain("didHitNodeLimit");
  });

  it("treats invalid numeric inputs as zero when calculating row totals", () => {
    expect(
      calculateProjectChartRowTotal({
        ...row("estimate-a", "row-a", "group-1", "subcategory-1", "supplier-1", 2, Number.NaN, 120),
      }),
    ).toBe(120);
  });

  it("groups rows by their OWN owning node, top category, and supplier label precedence", () => {
    const rows: ProjectChartRowFact[] = [
      row("estimate-a", "row-a", "group-1", "subcategory-1", "supplier-1", 2, 100, 25),
      row("estimate-b", "row-b", "group-2", "subcategory-1", null, 3, 100, 0, {
        sourceSupplierName: "Snapshot Supplier",
      }),
    ];

    // OWN-node bucketing: a row on group-1 ("Finishes") buckets to that node,
    // NOT to its area ancestor "Ground Floor". On real all-area data the owning
    // node IS the highest area, so this is a no-op there.
    expect(
      buildProjectChartComparison({
        estimates,
        rows,
        nodes,
        categoryNodes,
        suppliers,
        groupingMode: "space",
        leftEstimateId: "estimate-a",
        rightEstimateId: "estimate-b",
      }).left.allBuckets[0],
    ).toMatchObject({ id: "space:finishes", label: "Finishes", total: 225 });

    expect(
      buildProjectChartComparison({
        estimates,
        rows,
        nodes,
        categoryNodes,
        suppliers,
        groupingMode: "category",
        leftEstimateId: "estimate-a",
        rightEstimateId: "estimate-b",
      }).left.allBuckets[0],
    ).toMatchObject({ id: "category-1", label: "Masonry" });

    expect(
      buildProjectChartComparison({
        estimates,
        rows,
        nodes,
        categoryNodes,
        suppliers,
        groupingMode: "supplier",
        leftEstimateId: "estimate-a",
        rightEstimateId: "estimate-b",
      }).left.allBuckets[0],
    ).toMatchObject({ id: "supplier-1", label: "BuildMart" });
  });

  it("does not report organizers as category buckets", () => {
    const comparison = buildProjectChartComparison({
      estimates,
      rows: [row("estimate-a", "row-a", "group-1", "organizer", null, 1, 100, 0)],
      nodes,
      categoryNodes,
      suppliers,
      groupingMode: "category",
      leftEstimateId: "estimate-a",
      rightEstimateId: "estimate-b",
    });

    expect(comparison.left.allBuckets[0]).toMatchObject({ id: "uncategorized", label: "Uncategorized" });
  });

  it("aligns same-named spaces across duplicated estimate trees", () => {
    const comparison = buildProjectChartComparison({
      estimates,
      rows: [
        row("estimate-a", "row-a", "group-a", "subcategory-1", null, 1, 100, 0),
        row("estimate-b", "row-b", "group-b", "subcategory-1", null, 1, 150, 0),
      ],
      nodes: [
        { id: "area-a", estimateId: "estimate-a", parentId: null, kind: "Area", name: "Living Room", sortOrder: 1 },
        { id: "group-a", estimateId: "estimate-a", parentId: "area-a", kind: "Group", name: "FFE", sortOrder: 2 },
        { id: "area-b", estimateId: "estimate-b", parentId: null, kind: "Area", name: "Living Room", sortOrder: 1 },
        { id: "group-b", estimateId: "estimate-b", parentId: "area-b", kind: "Group", name: "FFE", sortOrder: 2 },
      ],
      categoryNodes,
      suppliers,
      groupingMode: "space",
      leftEstimateId: "estimate-a",
      rightEstimateId: "estimate-b",
    });

    // OWN-node bucketing: both rows live on their "FFE" group, so they align by
    // that node's name across the duplicated trees (not the "Living Room" area).
    expect(comparison.rows).toHaveLength(1);
    expect(comparison.rows[0]).toMatchObject({
      id: "space:ffe",
      label: "FFE",
      leftTotal: 100,
      rightTotal: 150,
      delta: 50,
    });
  });

  it("keeps estimate tree nesting for space table rows", () => {
    const series = buildProjectChartComparison({
      estimates,
      rows: [row("estimate-a", "row-a", "area-a", "subcategory-1", null, 2, 100, 0)],
      nodes: [
        { id: "group-house", estimateId: "estimate-a", parentId: null, kind: "Group", name: "House", sortOrder: 1 },
        { id: "group-floor", estimateId: "estimate-a", parentId: "group-house", kind: "Group", name: "Ground Floor", sortOrder: 1 },
        { id: "area-a", estimateId: "estimate-a", parentId: "group-floor", kind: "Area", name: "Living Room", sortOrder: 1 },
      ],
      categoryNodes,
      suppliers,
      groupingMode: "space",
      leftEstimateId: "estimate-a",
      rightEstimateId: "estimate-b",
    }).left;

    expect(series.tableRows).toEqual([
      expect.objectContaining({ id: "group:group-house", label: "House", depth: 0, kind: "group", total: 200 }),
      expect.objectContaining({ id: "group:group-floor", label: "Ground Floor", depth: 1, kind: "group", total: 200 }),
      expect.objectContaining({ id: "area:area-a", label: "Living Room", depth: 2, kind: "area", total: 200 }),
    ]);
  });

  it("renders a mixed node's own rows as an 'Own items' leaf without dropping or double-counting", () => {
    // group-mix directly owns rows (total 90) AND has two area children that each
    // own rows (60 + 40). Under highest-area semantics the own rows would be
    // dropped; under OWN-node semantics they must surface as an "Own items" leaf,
    // counted exactly once, and the container total must equal the sum of leaves.
    const series = buildProjectChartComparison({
      estimates,
      rows: [
        // 3 rows directly on the mixed group: 30 + 30 + 30 = 90
        row("estimate-a", "row-own-1", "group-mix", "subcategory-1", null, 1, 30, 0),
        row("estimate-a", "row-own-2", "group-mix", "subcategory-1", null, 1, 30, 0),
        row("estimate-a", "row-own-3", "group-mix", "subcategory-1", null, 1, 30, 0),
        // child area "Kitchen": 60
        row("estimate-a", "row-kitchen", "area-kitchen", "subcategory-1", null, 1, 60, 0),
        // child area "Bath": 40
        row("estimate-a", "row-bath", "area-bath", "subcategory-1", null, 1, 40, 0),
      ],
      nodes: [
        { id: "group-mix", estimateId: "estimate-a", parentId: null, kind: "Group", name: "Wet Areas", sortOrder: 1 },
        { id: "area-kitchen", estimateId: "estimate-a", parentId: "group-mix", kind: "Area", name: "Kitchen", sortOrder: 1 },
        { id: "area-bath", estimateId: "estimate-a", parentId: "group-mix", kind: "Area", name: "Bath", sortOrder: 2 },
      ],
      categoryNodes,
      suppliers,
      groupingMode: "space",
      leftEstimateId: "estimate-a",
      rightEstimateId: "estimate-b",
    }).left;

    const seriesTotal = series.total;
    expect(seriesTotal).toBe(190);

    const tableRows = series.tableRows;
    // Container + its rendered leaf lines: Own items (90), Kitchen (60), Bath (40).
    expect(tableRows).toEqual([
      expect.objectContaining({ id: "group:group-mix", label: "Wet Areas", depth: 0, kind: "group", total: 190, rowCount: 5 }),
      expect.objectContaining({ id: "area:group-mix:own", label: "Own items", depth: 1, kind: "area", total: 90, rowCount: 3 }),
      expect.objectContaining({ id: "area:area-kitchen", label: "Kitchen", depth: 1, kind: "area", total: 60, rowCount: 1 }),
      expect.objectContaining({ id: "area:area-bath", label: "Bath", depth: 1, kind: "area", total: 40, rowCount: 1 }),
    ]);

    // INVARIANT: container total == sum of its rendered leaf lines == series total,
    // and every fact row is counted exactly once (no drop, no double-count).
    const container = tableRows.find((r) => r.id === "group:group-mix");
    const leafLines = tableRows.filter((r) => r.kind === "area");
    const sumOfLeaves = leafLines.reduce((sum, r) => sum + r.total, 0);
    const leafRowCount = leafLines.reduce((sum, r) => sum + r.rowCount, 0);
    expect(container?.total).toBe(sumOfLeaves);
    expect(sumOfLeaves).toBe(seriesTotal);
    expect(leafRowCount).toBe(5);
    // The own rows are NOT dropped and NOT merged into a child area.
    expect(tableRows.some((r) => r.id === "area:group-mix:own" && r.total === 90)).toBe(true);
  });

  it("collapses visual chart buckets after the top eight while table rows keep all buckets", () => {
    const rows: ProjectChartRowFact[] = Array.from({ length: 10 }, (_, index) =>
      row("estimate-a", `row-${index}`, "group-1", "subcategory-1", `supplier-${index}`, 1, 100 - index, 0, {
        supplierName: `Supplier ${index}`,
      }),
    );

    const comparison = buildProjectChartComparison({
      estimates,
      rows,
      nodes,
      categoryNodes,
      suppliers,
      groupingMode: "supplier",
      leftEstimateId: "estimate-a",
      rightEstimateId: "estimate-b",
    });

    expect(comparison.left.buckets).toHaveLength(9);
    expect(comparison.left.buckets[8]).toMatchObject({ id: "__other__", label: "Other", isOther: true });
    expect(comparison.rows).toHaveLength(10);
    expect(comparison.left.tableRows).toHaveLength(10);
  });

  it("marks delta percent as new when the baseline bucket is zero", () => {
    const comparison = buildProjectChartComparison({
      estimates,
      rows: [row("estimate-b", "row-b", "group-2", "subcategory-1", null, 1, 100, 0)],
      nodes,
      categoryNodes,
      suppliers,
      groupingMode: "category",
      leftEstimateId: "estimate-a",
      rightEstimateId: "estimate-b",
    });

    expect(comparison.rows[0]).toMatchObject({ delta: 100, deltaPercent: null });
  });
});

function row(
  estimateId: string,
  id: string,
  nodeId: string | null,
  categoryNodeId: string | null,
  supplierId: string | null,
  quantity: number,
  unitCost: number,
  miscCost: number,
  overrides: Partial<ProjectChartRowFact> = {},
): ProjectChartRowFact {
  return {
    id,
    estimateId,
    nodeId,
    categoryNodeId,
    supplierId,
    supplierName: null,
    sourceSupplierId: null,
    sourceSupplierName: null,
    quantity,
    unitCost,
    miscCost,
    ...overrides,
  };
}
