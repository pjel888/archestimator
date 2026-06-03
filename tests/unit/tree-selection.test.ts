import { describe, expect, test } from "bun:test";

import {
  dedupeSelectedRoots,
  getSelectionState,
  pruneSelection,
  selectVisibleIds,
  toggleCascadeSelection,
  type TreeSelectionNode,
} from "../../src/lib/bulk-selection/tree-selection";

const nodes: TreeSelectionNode[] = [
  {
    id: "root",
    selectable: true,
    children: [
      { id: "area-a", selectable: true, children: [{ id: "row-a1", selectable: true }] },
      { id: "area-b", selectable: false, children: [{ id: "row-b1", selectable: true }] },
    ],
  },
  { id: "detached", selectable: true },
];

describe("tree bulk selection utilities", () => {
  test("selectVisibleIds returns only visible selectable ids", () => {
    expect(selectVisibleIds(nodes, ["root", "area-a", "area-b", "row-b1", "missing"])).toEqual([
      "root",
      "area-a",
      "row-b1",
    ]);
  });

  test("getSelectionState reports indeterminate when only some selectable descendants are selected", () => {
    expect(getSelectionState(nodes, new Set(["row-a1"]), "root")).toEqual({ checked: false, indeterminate: true });
    expect(getSelectionState(nodes, new Set(["area-a", "row-a1", "row-b1"]), "root")).toEqual({
      checked: true,
      indeterminate: false,
    });
  });

  test("dedupeSelectedRoots removes descendants when an ancestor is already selected", () => {
    expect(dedupeSelectedRoots(nodes, new Set(["root", "area-a", "row-a1", "detached"]))).toEqual([
      "root",
      "detached",
    ]);
  });

  test("pruneSelection removes stale or nonselectable ids after refresh", () => {
    expect([...pruneSelection(nodes, new Set(["root", "area-b", "missing", "detached"]))]).toEqual(["root", "detached"]);
  });

  test("toggleCascadeSelection adds or removes selectable descendants without mutating input", () => {
    const initial = new Set(["detached"]);
    const selected = toggleCascadeSelection(nodes, initial, "area-a", true);
    expect([...initial]).toEqual(["detached"]);
    expect([...selected]).toEqual(["detached", "area-a", "row-a1"]);
    expect([...toggleCascadeSelection(nodes, selected, "area-a", false)]).toEqual(["detached"]);
  });
});
