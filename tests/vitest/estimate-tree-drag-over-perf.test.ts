import { readFileSync } from "node:fs";
import { performance } from "node:perf_hooks";

import { describe, expect, it } from "vitest";

import type { EstimateTreeNode } from "@/lib/estimates/types";
import { evaluateEstimateTreeDrop, validateEstimateTreeDrop } from "@/lib/estimates/estimate-tree-reorder";

function makeFlatTree(count: number): EstimateTreeNode[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `node-${index}`,
    name: `Node ${index}`,
    kind: "area" as const,
    total: "PHP 0.00",
    children: [],
  }));
}

function measureAverageHoverMs(nodes: EstimateTreeNode[], samples: number) {
  const start = performance.now();
  for (let index = 0; index < samples; index += 1) {
    const result = validateEstimateTreeDrop({
      nodes,
      draggedNodeIds: ["node-0"],
      target: { targetNodeId: `node-${nodes.length - 1}`, position: "after" },
    });
    expect(result.ok).toBe(true);
  }
  return (performance.now() - start) / samples;
}

describe("estimate tree drag-over performance", () => {
  it("uses cheap validation for hover and keeps the full reorder plan on drop", () => {
    const source = readFileSync("src/components/workshop/EstimateSheetTree.tsx", "utf8");
    const canDropBody = source.match(/const handleTreeCanDrop = useCallback\([\s\S]*?\n  }, \[/)?.[0] ?? "";

    expect(canDropBody).toContain("validateEstimateTreeDrop");
    expect(canDropBody).not.toContain("evaluateEstimateTreeDrop");

    const nodes = makeFlatTree(1_000);
    const hoverResult = validateEstimateTreeDrop({
      nodes,
      draggedNodeIds: ["node-0"],
      target: { targetNodeId: "node-999", position: "after" },
    });
    expect(hoverResult).toEqual({
      ok: true,
      draggedNodeId: "node-0",
      targetParentId: null,
      targetIndex: 1_000,
    });
    expect(hoverResult).not.toHaveProperty("plan");

    const dropResult = evaluateEstimateTreeDrop({
      nodes,
      draggedNodeIds: ["node-0"],
      target: { targetNodeId: "node-999", position: "after" },
    });
    expect(dropResult.ok).toBe(true);
    if (dropResult.ok) {
      expect(dropResult.plan.nextNodes).not.toBe(nodes);
      expect(dropResult.plan.nextNodes.at(-1)?.id).toBe("node-0");
    }
  });

  it("keeps hover validation inside the large-tree budget", () => {
    expect(measureAverageHoverMs(makeFlatTree(1_000), 25)).toBeLessThan(16);
    expect(measureAverageHoverMs(makeFlatTree(5_000), 15)).toBeLessThan(50);
    expect(measureAverageHoverMs(makeFlatTree(10_000), 10)).toBeLessThan(50);
  });
});
