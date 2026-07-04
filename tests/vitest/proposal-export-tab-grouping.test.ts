import { describe, expect, it } from "vitest";

import { groupEstimateTabTrees, type EstimateTreeNodeQueryRow, type EstimateTreeRowItemQueryRow } from "@/lib/repositories/workspace-repository";
import type { EstimateTabSummary } from "@/lib/estimates/types";

const createdAt = "2026-05-20T00:00:00.000Z";

function node(input: {
  id: string;
  parent_id: string | null;
  kind: EstimateTreeNodeQueryRow["kind"];
  name: string;
  estimate_tab_id: string;
}): EstimateTreeNodeQueryRow & { estimate_tab_id: string } {
  return input;
}

function row(
  input: Pick<EstimateTreeRowItemQueryRow, "id" | "node_id" | "material" | "quantity" | "unit_cost" | "misc_cost" | "sort_order">,
): EstimateTreeRowItemQueryRow {
  return {
    source_library_item_id: null,
    source_snapshot: { category: "General" },
    description: "",
    supplier: "",
    supplier_id: null,
    unit: "unit",
    quantity_base: null,
    quantity_contingency_amount: null,
    contingency_percentage: 0,
    adjustment_percentage: 0,
    discipline: "",
    designation: "",
    link_state: "unlinked",
    row_revision: 0,
    category_node_id: null,
    metadata: {},
    created_at: createdAt,
    ...input,
  };
}

const tabs: EstimateTabSummary[] = [
  { id: "tab-a", name: "Tab A", sortOrder: 0, isDefault: true },
  { id: "tab-b", name: "Tab B", sortOrder: 1, isDefault: false },
];

describe("groupEstimateTabTrees (P2-T7)", () => {
  it("partitions one batched fetch into per-tab trees, isolating rows by their node's tab", () => {
    const grouped = groupEstimateTabTrees(
      tabs,
      [
        node({ id: "area-a", parent_id: null, kind: "area", name: "Area A", estimate_tab_id: "tab-a" }),
        node({ id: "area-b", parent_id: null, kind: "area", name: "Area B", estimate_tab_id: "tab-b" }),
      ],
      [
        row({ id: "r-a", node_id: "area-a", material: "Tile A", quantity: 1, unit_cost: 100, misc_cost: 0, sort_order: 0 }),
        row({ id: "r-b", node_id: "area-b", material: "Tile B", quantity: 1, unit_cost: 200, misc_cost: 0, sort_order: 0 }),
      ],
    );

    expect(grouped.map((entry) => entry.tab.id)).toEqual(["tab-a", "tab-b"]);
    expect(grouped[0].tree).toHaveLength(1);
    expect(grouped[0].tree[0].name).toBe("Area A");
    expect(grouped[0].tree[0].estimateRowItems?.map((item) => item.material)).toEqual(["Tile A"]);
    expect(grouped[1].tree[0].name).toBe("Area B");
    expect(grouped[1].tree[0].estimateRowItems?.map((item) => item.material)).toEqual(["Tile B"]);
  });

  it("returns an empty tree for a tab that has no nodes in the batch", () => {
    const grouped = groupEstimateTabTrees(
      tabs,
      [node({ id: "area-a", parent_id: null, kind: "area", name: "Area A", estimate_tab_id: "tab-a" })],
      [],
    );

    expect(grouped.map((entry) => entry.tab.id)).toEqual(["tab-a", "tab-b"]);
    expect(grouped[1].tree).toEqual([]);
  });
});
