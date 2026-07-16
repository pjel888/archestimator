import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import type { EstimateRowItem, EstimateTreeNode } from "@/components/workshop/estimate-tree-data";
import { patchComponentInstanceRowsInTree } from "@/lib/estimates/estimate-row-tree-patch";
import { createEstimateTreeIndex } from "@/lib/estimates/estimate-tree-index";

function read(path: string) {
  return readFileSync(path, "utf8");
}

function makePerformanceRow(id: string, sourceLibraryItemId?: string): EstimateRowItem {
  return {
    id,
    material: "Original material",
    description: "Large estimate fixture row",
    supplier: "Fixture supplier",
    source: "library",
    sourceLibraryItemId,
    linkState: sourceLibraryItemId ? "linked-clean" : undefined,
    unit: "unit",
    itemCost: 1,
    quantity: 1,
    subTotal: 1,
    miscCost: 0,
    totalItemCosts: 1,
    category: "Performance",
    pricingSource: "Deterministic fixture",
    pricingDate: "2026-07-16",
  };
}

function makeLargeFanOutFixture() {
  const linkedRowIds: string[] = [];
  const areaNodes = Array.from({ length: 1_400 }, (_, areaIndex): EstimateTreeNode => {
    const isLinked = areaIndex < 1_000;
    const rowCount = isLinked ? 1 : 10;
    const estimateRowItems = Array.from({ length: rowCount }, (_, rowIndex) => {
      const rowId = `perf-row-${areaIndex}-${rowIndex}`;
      if (isLinked) linkedRowIds.push(rowId);
      return makePerformanceRow(rowId, isLinked ? "shared-component" : undefined);
    });
    return {
      id: `perf-area-${areaIndex}`,
      name: `Performance Area ${areaIndex}`,
      kind: "area",
      total: "₱0.00",
      estimateRowItems,
      children: [],
    };
  });

  const groups: EstimateTreeNode[] = [];
  let areaCursor = 0;
  for (let groupIndex = 0; groupIndex < 99; groupIndex += 1) {
    const areaCount = 14 + (groupIndex < 14 ? 1 : 0);
    const groupAreas = areaNodes.slice(areaCursor, areaCursor + areaCount);
    areaCursor += areaCount;
    let children = groupAreas;
    if (groupIndex === 0) {
      children = [];
      for (let index = groupAreas.length - 1; index >= 0; index -= 1) {
        const nestedArea = { ...groupAreas[index], children };
        children = [nestedArea];
      }
    }
    groups.push({
      id: `perf-group-${groupIndex}`,
      name: `Performance Group ${groupIndex}`,
      kind: "group",
      total: "₱0.00",
      estimateRowItems: [],
      children,
    });
  }

  return {
    tree: [{
      id: "perf-root",
      name: "Performance Root",
      kind: "group" as const,
      total: "₱0.00",
      estimateRowItems: [],
      children: groups,
    }],
    linkedRowIds,
    unrelatedNodes: areaNodes.slice(1_000),
  };
}

describe("estimate sheet large-data budgets", () => {
  it("caps the live estimate sheet route and client tree refetches with shared limits", () => {
    const limits = read("src/lib/estimates/load-limits.ts");
    const page = read("src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx");
    const actions = read("src/lib/estimates/actions.ts");
    const workspaceClient = read("src/components/workshop/EstimateWorkspaceClient.tsx");
    const sheetContent = read("src/components/workshop/EstimateSheetContent.tsx");

    expect(limits).toContain("maxNodeCount: 1500");
    expect(limits).toContain("maxRowItemCount: 5000");
    expect(page).toContain("resolveEstimateTabRouteContext(projectId, nodeId, ESTIMATE_SHEET_TREE_LOAD_LIMITS)");
    expect(actions).toContain("getProjectEstimateTreeByEstimate(projectId, estimateId, ESTIMATE_SHEET_TREE_LOAD_LIMITS)");
    expect(actions).toContain("getEstimateTabTree(projectId, estimateId, tabId, ESTIMATE_SHEET_TREE_LOAD_LIMITS)");
    expect(workspaceClient).toContain("loadLimitState={loadLimitState}");
    expect(sheetContent).toContain("const isActiveTreePartial = Boolean(activeLoadLimitState?.didExceedNodeLimit || activeLoadLimitState?.didExceedRowItemLimit);");
    expect(sheetContent).toContain("This tab is partial:");
    expect(sheetContent).toContain("move actions stay disabled until the complete tab is available.");
  });

  it("caps reusable project-source search fan-out before materializing estimate trees", () => {
    const actions = read("src/lib/reusable-sources/actions.ts");
    const workspaceRepository = read("src/lib/repositories/workspace-repository.ts");
    const sheetRepository = read("src/lib/repositories/project-estimate-sheets-repository.ts");

    expect(actions).toContain("REUSABLE_SOURCE_SEARCH_PROJECT_SCAN_LIMIT");
    expect(actions).toContain("REUSABLE_SOURCE_SEARCH_ESTIMATE_SCAN_LIMIT");
    expect(actions).toContain("REUSABLE_SOURCE_SEARCH_NODE_MATCH_LIMIT");
    expect(actions).toContain("REUSABLE_SOURCE_SEARCH_TAB_MATCH_LIMIT");
    expect(actions).toContain("REUSABLE_SOURCE_SEARCH_MATERIALIZED_ESTIMATE_LIMIT");
    expect(actions).toContain("REUSABLE_SOURCE_SEARCH_TAB_SCAN_LIMIT");
    expect(actions).toContain("REUSABLE_SOURCE_SEARCH_TREE_NODE_LIMIT");
    expect(actions).toContain("listProjectEstimateSheets(item.project.id, { limit: REUSABLE_SOURCE_SEARCH_ESTIMATE_SCAN_LIMIT })");
    expect(actions).toContain("LIMIT ?");
    expect(actions).toContain("REUSABLE_SOURCE_SEARCH_NODE_MATCH_LIMIT + 1");
    expect(actions).toContain("REUSABLE_SOURCE_SEARCH_TAB_MATCH_LIMIT + 1");
    expect(actions).toContain("getEstimateTabTree(project.id, estimate.id, tab.id, {");
    expect(actions).toContain("maxNodeCount: REUSABLE_SOURCE_SEARCH_TREE_NODE_LIMIT");
    expect(actions).toContain("maxRowItemCount: REUSABLE_SOURCE_SEARCH_TREE_ROW_ITEM_LIMIT");
    expect(workspaceRepository).toContain("listProjectEstimateSheets(projectId: string, options: { limit?: number } = {})");
    expect(sheetRepository).toContain("normalizeProjectEstimateSheetLimit");
    expect(sheetRepository).toContain("LIMIT ?");
  });

  it("patches a 1,000-row shared component without scanning 4,000 unrelated rows", () => {
    const { tree, linkedRowIds, unrelatedNodes } = makeLargeFanOutFixture();
    const index = createEstimateTreeIndex(tree);
    let unrelatedRowReads = 0;
    const unrelatedRows = unrelatedNodes.map((node) => node.estimateRowItems ?? []);

    expect(index.nodesById.size).toBe(1_500);
    expect(index.rowsById.size).toBe(5_000);
    expect(index.rowIdsByComponentIdentity.get("library:shared-component")).toHaveLength(1_000);

    unrelatedNodes.forEach((node, nodeIndex) => {
      Object.defineProperty(node, "estimateRowItems", {
        configurable: true,
        enumerable: true,
        get() {
          unrelatedRowReads += 1;
          return unrelatedRows[nodeIndex];
        },
      });
    });

    const startedAt = performance.now();
    const next = patchComponentInstanceRowsInTree(
      tree,
      linkedRowIds[0],
      { material: "Updated shared material" },
      index,
    );
    const elapsedMs = performance.now() - startedAt;

    expect(unrelatedRowReads).toBe(0);
    expect(elapsedMs).toBeLessThan(1_000);

    const nextIndex = createEstimateTreeIndex(next);
    expect(linkedRowIds.every((rowId) => {
      const location = nextIndex.rowsById.get(rowId);
      const node = location ? nextIndex.nodesById.get(location.nodeId)?.node : undefined;
      return location ? node?.estimateRowItems?.[location.rowIndex]?.material === "Updated shared material" : false;
    })).toBe(true);
    expect(unrelatedNodes.every((node) => nextIndex.nodesById.get(node.id)?.node === node)).toBe(true);
    expect(unrelatedRows.flat().every((row) => row.material === "Original material")).toBe(true);
    console.log("estimate-sheet-large-data-perf-s11", JSON.stringify({ elapsedMs, nodeCount: index.nodesById.size, rowCount: index.rowsById.size, linkedRowCount: linkedRowIds.length, unrelatedRowReads: 0 }));
  });
});
