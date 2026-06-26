import { describe, expect, it } from "vitest";

import {
  beginEstimateTreeSubtreeLoad,
  buildEstimateTreeSubtreePayload,
  completeEstimateTreeSubtreeLoad,
  failEstimateTreeSubtreeLoad,
  mergeEstimateTreeSubtreePayload,
  shouldAcceptEstimateTreeSubtreeResponse,
  shouldHydrateEstimateTreeSubtree,
} from "@/lib/estimates/estimate-tree-lazy";
import type { EstimateTreeNode } from "@/lib/estimates/types";

function treeNode(input: Partial<EstimateTreeNode> & Pick<EstimateTreeNode, "id" | "name">): EstimateTreeNode {
  return {
    kind: "area",
    total: "₱0.00",
    children: [],
    estimateRowItems: [],
    ...input,
  };
}

describe("estimate tree lazy subtree contract", () => {
  it("merges a loaded subtree without replacing unrelated sibling branches", () => {
    const untouchedSibling = treeNode({ id: "sibling", name: "Sibling" });
    const currentTree = [
      treeNode({
        id: "root",
        name: "Root",
        children: [
          treeNode({ id: "target", name: "Target", childrenLoaded: false }),
          untouchedSibling,
        ],
      }),
    ];
    const loadedTarget = treeNode({
      id: "target",
      name: "Target loaded",
      childrenLoaded: true,
      children: [treeNode({ id: "child", name: "Child" })],
    });
    const payload = buildEstimateTreeSubtreePayload({
      estimateId: "estimate-1",
      rootNodeId: "target",
      parentNodeId: "root",
      requestId: "request-1",
      fetchedAt: "2026-06-26T00:00:00.000Z",
      tree: [loadedTarget],
      completeness: {
        childrenLoaded: true,
        rowItemsLoaded: true,
        didExceedNodeLimit: false,
        didExceedRowItemLimit: false,
      },
    });

    const result = mergeEstimateTreeSubtreePayload(currentTree, payload);

    expect(result.merged).toBe(true);
    expect(result.nodes[0]?.children?.[0]).toMatchObject({
      id: "target",
      name: "Target loaded",
      children: [expect.objectContaining({ id: "child" })],
    });
    expect(result.nodes[0]?.children?.[1]).toBe(untouchedSibling);
  });

  it("keeps the current tree when a subtree response no longer matches a branch", () => {
    const currentTree = [treeNode({ id: "root", name: "Root" })];
    const payload = buildEstimateTreeSubtreePayload({
      estimateId: "estimate-1",
      rootNodeId: "missing",
      parentNodeId: "root",
      requestId: "request-1",
      tree: [treeNode({ id: "missing", name: "Missing" })],
      completeness: {
        childrenLoaded: true,
        rowItemsLoaded: true,
        didExceedNodeLimit: false,
        didExceedRowItemLimit: false,
      },
    });

    expect(mergeEstimateTreeSubtreePayload(currentTree, payload)).toEqual({ nodes: currentTree, merged: false });
  });

  it("guards stale responses with request ids", () => {
    const loading = beginEstimateTreeSubtreeLoad({}, "node-1", "request-new");

    expect(shouldAcceptEstimateTreeSubtreeResponse(loading, "node-1", "request-old")).toBe(false);
    expect(shouldAcceptEstimateTreeSubtreeResponse(loading, "node-1", "request-new")).toBe(true);
    expect(completeEstimateTreeSubtreeLoad(loading, "node-1", "request-old", "2026-06-26T00:00:00.000Z")).toBe(loading);
    expect(failEstimateTreeSubtreeLoad(loading, "node-1", "request-old", "failed")).toBe(loading);

    const loaded = completeEstimateTreeSubtreeLoad(loading, "node-1", "request-new", "2026-06-26T00:00:00.000Z");
    expect(loaded["node-1"]).toMatchObject({ status: "loaded", requestId: "request-new" });
  });

  it("loads only nodes marked as partial and not already loading or loaded", () => {
    const partial = treeNode({ id: "node-1", name: "Partial", childrenLoaded: false });
    const complete = treeNode({ id: "node-2", name: "Complete", childrenLoaded: true });

    expect(shouldHydrateEstimateTreeSubtree(partial, {})).toBe(true);
    expect(shouldHydrateEstimateTreeSubtree(complete, {})).toBe(false);
    expect(shouldHydrateEstimateTreeSubtree(partial, beginEstimateTreeSubtreeLoad({}, "node-1", "request-1"))).toBe(false);
    expect(
      shouldHydrateEstimateTreeSubtree(
        partial,
        completeEstimateTreeSubtreeLoad(
          beginEstimateTreeSubtreeLoad({}, "node-1", "request-1"),
          "node-1",
          "request-1",
          "2026-06-26T00:00:00.000Z",
        ),
      ),
    ).toBe(false);
  });
});
