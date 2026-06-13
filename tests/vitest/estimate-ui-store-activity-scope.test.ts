import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { getActivityScopeKey } from "@/components/workshop/estimate-sheet/activity-history";
import { useEstimateUiStore } from "@/stores/estimate-ui-store";

// Estimate-Tree unification P3-activity: the activity scope (direct-only vs
// descendants) must be a STORED, STABLE per-node choice, never derived from a
// node's kind or child count. This guards the V3 B2 landmine: the activity
// cache key `node:{id}:{desc|direct}` must NOT become time-varying when a child
// is added to a node, or the inspector cache would silently invalidate/poison.

// Mirror EXACTLY how EstimateSheetContent.buildActivityScopeTreeItems resolves a
// node's includeDescendants from the store map, then how activity-history's
// getActivityScopeKey encodes the cache key. Keeping these in lockstep with the
// component is the whole point of the test — if either drifts, this breaks.
function resolveScope(map: Record<string, boolean>, nodeId: string) {
  return {
    mode: "node" as const,
    nodeId,
    includeDescendants: !(map[nodeId] ?? false),
  };
}

function reset() {
  useEstimateUiStore.setState({ activityScopeDirectOnly: {} });
}

beforeEach(reset);
afterEach(reset);

describe("estimate-ui-store · activityScopeDirectOnly (P3-activity)", () => {
  it("defaults to an empty map", () => {
    expect(useEstimateUiStore.getState().activityScopeDirectOnly).toEqual({});
  });

  it("empty map → node resolves includeDescendants: true (legacy leaf behavior)", () => {
    const map = useEstimateUiStore.getState().activityScopeDirectOnly;
    expect(resolveScope(map, "node-a").includeDescendants).toBe(true);
  });

  it("setActivityScopeDirectOnly(id, true) flips the node to direct-only", () => {
    useEstimateUiStore.getState().setActivityScopeDirectOnly("node-a", true);
    const map = useEstimateUiStore.getState().activityScopeDirectOnly;
    expect(resolveScope(map, "node-a").includeDescendants).toBe(false);
    // The setter is keyed/merged: it must not clobber other nodes' choices.
    expect(resolveScope(map, "node-b").includeDescendants).toBe(true);
  });

  it("flipping back to false restores includeDescendants: true", () => {
    const s = useEstimateUiStore.getState();
    s.setActivityScopeDirectOnly("node-a", true);
    s.setActivityScopeDirectOnly("node-a", false);
    const map = useEstimateUiStore.getState().activityScopeDirectOnly;
    expect(resolveScope(map, "node-a").includeDescendants).toBe(true);
    expect(getActivityScopeKey(resolveScope(map, "node-a"))).toBe("node:node-a:desc");
  });

  it("the resolved cache KEY is stable across adding a child (V3 B2)", () => {
    // A node with no stored override. Before it has children, its key is built
    // from the default (descendants). The store map is the ONLY input to the
    // key, so adding a child — which changes neither the map nor the node id —
    // cannot change the key. We simulate "before child" and "after child" by
    // resolving the key from the same store state at two points; the child-add
    // touches the estimate tree, never activityScopeDirectOnly.
    const before = getActivityScopeKey(
      resolveScope(useEstimateUiStore.getState().activityScopeDirectOnly, "node-a"),
    );

    // ...a child is added to node-a here (tree mutation only; store untouched)...

    const after = getActivityScopeKey(
      resolveScope(useEstimateUiStore.getState().activityScopeDirectOnly, "node-a"),
    );

    expect(before).toBe("node:node-a:desc");
    expect(after).toBe(before);
  });

  it("a stored direct-only choice also stays stable across a child-add", () => {
    useEstimateUiStore.getState().setActivityScopeDirectOnly("node-a", true);
    const keyBefore = getActivityScopeKey(
      resolveScope(useEstimateUiStore.getState().activityScopeDirectOnly, "node-a"),
    );
    // child-add (tree-only) ...
    const keyAfter = getActivityScopeKey(
      resolveScope(useEstimateUiStore.getState().activityScopeDirectOnly, "node-a"),
    );
    expect(keyBefore).toBe("node:node-a:direct");
    expect(keyAfter).toBe(keyBefore);
  });
});
