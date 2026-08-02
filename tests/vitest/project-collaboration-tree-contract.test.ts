import { describe, expect, it } from "vitest";

import {
  ESTIMATE_TREE_REALTIME_CONTRACT_VERSION,
  isEstimateTreeRealtimeEvent,
  type EstimateTreeRealtimeEvent,
} from "@/lib/collaboration/estimate-tree-realtime-contract";
import { buildEstimateTreeSubtreePayload } from "@/lib/estimates/estimate-tree-lazy";
import type { EstimateTreeNode } from "@/lib/estimates/types";

const sentAt = "2026-06-26T00:00:00.000Z";

function baseEvent(overrides: Partial<EstimateTreeRealtimeEvent> = {}) {
  return {
    schemaVersion: ESTIMATE_TREE_REALTIME_CONTRACT_VERSION,
    scope: { estimateId: "estimate-1", tabId: "tab-1" },
    senderId: "user-1",
    eventId: "event-1",
    sentAt,
    ...overrides,
  };
}

function node(input: Partial<EstimateTreeNode> & Pick<EstimateTreeNode, "id" | "name">): EstimateTreeNode {
  return {
    kind: "area",
    total: "₱0.00",
    children: [],
    estimateRowItems: [],
    ...input,
  };
}

describe("estimate tree realtime v2 contract", () => {
  it("accepts subtree request and loaded events", () => {
    expect(isEstimateTreeRealtimeEvent(baseEvent({
      type: "estimate_tree.subtree_requested",
      nodeId: "area-1",
      requestId: "request-1",
    }))).toBe(true);

    const payload = buildEstimateTreeSubtreePayload({
      estimateId: "estimate-1",
      tabId: "tab-1",
      rootNodeId: "area-1",
      parentNodeId: null,
      requestId: "request-1",
      fetchedAt: sentAt,
      tree: [node({ id: "area-1", name: "Area 1", childrenLoaded: true })],
      completeness: {
        childrenLoaded: true,
        rowItemsLoaded: true,
        didExceedNodeLimit: false,
        didExceedRowItemLimit: false,
      },
    });

    expect(isEstimateTreeRealtimeEvent(baseEvent({
      type: "estimate_tree.subtree_loaded",
      payload,
    }))).toBe(true);
  });

  it("accepts LWW branch-change and full-refetch events", () => {
    expect(isEstimateTreeRealtimeEvent(baseEvent({
      type: "estimate_tree.branch_changed",
      nodeId: "area-1",
      mergeStrategy: "last-write-wins",
      treeRevision: 12,
    }))).toBe(true);

    expect(isEstimateTreeRealtimeEvent(baseEvent({
      type: "estimate_tree.full_refetch_requested",
      reason: "mutation_conflict",
    }))).toBe(true);
  });

  it("rejects stale versions and ambiguous branch-change semantics", () => {
    expect(isEstimateTreeRealtimeEvent(baseEvent({
      schemaVersion: 1,
      type: "estimate_tree.branch_changed",
      nodeId: "area-1",
      mergeStrategy: "last-write-wins",
    } as unknown as Partial<EstimateTreeRealtimeEvent>))).toBe(false);

    expect(isEstimateTreeRealtimeEvent(baseEvent({
      type: "estimate_tree.branch_changed",
      nodeId: "area-1",
      mergeStrategy: "merge-unknown",
    } as unknown as Partial<EstimateTreeRealtimeEvent>))).toBe(false);

    expect(isEstimateTreeRealtimeEvent(baseEvent({
      type: "estimate_tree.unknown",
    } as unknown as Partial<EstimateTreeRealtimeEvent>))).toBe(false);
  });
});
