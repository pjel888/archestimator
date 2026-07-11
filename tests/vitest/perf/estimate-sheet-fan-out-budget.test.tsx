import { describe, expect, it } from "vitest";

import type { EstimateRowItem, EstimateTreeNode } from "@/components/workshop/estimate-tree-data";
import { patchProjectComponentInstanceRowsInTree } from "@/lib/estimates/estimate-row-tree-patch";
import { buildEstimatePerformanceFixture, type EstimatePerformanceNodeFixture } from "../../fixtures/estimate-sheet-performance";

function nearestRankPercentile(values: number[], percentile: number) {
  const ordered = [...values].sort((left, right) => left - right);
  return ordered[Math.max(0, Math.ceil((percentile / 100) * ordered.length) - 1)] ?? 0;
}

function buildTree(): EstimateTreeNode[] {
  const fixture = buildEstimatePerformanceFixture("limit", { seed: "fan-out-budget" });
  const rowsByNode = new Map<string, EstimateRowItem[]>();
  for (const row of fixture.rows) {
    const items = rowsByNode.get(row.nodeId) ?? [];
    items.push({
      id: row.id,
      material: row.material,
      description: row.description,
      supplier: "Fixture supplier",
      source: "project",
      unit: "pc",
      itemCost: row.unitCost,
      quantity: row.quantity,
      subTotal: row.unitCost * row.quantity,
      contingencyPercentage: row.contingencyPercentage,
      contingencyValue: 0,
      miscCost: row.miscCost,
      totalItemCosts: row.unitCost * row.quantity + row.miscCost,
      category: "Fixture",
      pricingSource: "Fixture",
      pricingDate: "2026-07-11",
      sourceSnapshot: row.sourceSnapshot,
      metadata: row.componentIdentity ? {
        projectComponentProjection: {
          projectId: "project-fixture",
          classification: "express",
          componentId: row.componentIdentity,
        },
      } : {},
    });
    rowsByNode.set(row.nodeId, items);
  }

  function toTreeNode(node: EstimatePerformanceNodeFixture): EstimateTreeNode {
    return {
      id: node.id,
      name: node.id,
      kind: "area",
      total: "PHP 0",
      estimateRowItems: rowsByNode.get(node.id) ?? [],
      children: node.children.map(toTreeNode),
    };
  }

  return fixture.nodes.map(toTreeNode);
}

function flattenRows(nodes: EstimateTreeNode[]): EstimateRowItem[] {
  return nodes.flatMap((node) => [
    ...(node.estimateRowItems ?? []),
    ...flattenRows(node.children ?? []),
  ]);
}

describe("estimate sheet project-component fan-out budget", () => {
  it("updates 1,000 shared component projections in the deterministic 5,000-row fixture", () => {
    const tree = buildTree();
    const sourceRow = flattenRows(tree).find((row) => row.id === "row-limit-1");
    if (!sourceRow) throw new Error("Expected deterministic source row.");

    const durations: number[] = [];
    let patched = tree;
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const startedAt = performance.now();
      patched = patchProjectComponentInstanceRowsInTree(tree, sourceRow.id, { material: "Updated component" });
      durations.push(performance.now() - startedAt);
    }

    const rows = flattenRows(patched);
    const updated = rows.filter((row) => row.material === "Updated component");
    expect(rows).toHaveLength(5_000);
    expect(updated).toHaveLength(1_000);
    expect(nearestRankPercentile(durations, 95)).toBeLessThanOrEqual(75);
  });
});
