import { describe, expect, it } from "vitest";

import {
  groupEstimateTabTrees,
  type EstimateTreeNodeQueryRow,
  type EstimateTreeRowItemQueryRow,
} from "@/lib/estimates/estimate-tree-read-repository";

function row(id: string, projection: Partial<EstimateTreeRowItemQueryRow> = {}): EstimateTreeRowItemQueryRow {
  return {
    id,
    node_id: "node-1",
    sort_order: 0,
    material: id,
    description: "",
    supplier: "Supplier",
    brand_id: null,
    supplier_id: null,
    unit: "pc",
    unit_cost: 100,
    quantity: 1,
    quantity_base: null,
    quantity_contingency_amount: null,
    contingency_percentage: 0,
    adjustment_percentage: 0,
    misc_cost: 0,
    row_revision: 1,
    category_node_id: null,
    discipline: null,
    designation: null,
    source_library_item_id: null,
    link_state: "unlinked",
    source_snapshot: {},
    metadata: {},
    created_at: "2026-07-30T00:00:00.000Z",
    ...projection,
  };
}

describe("estimate contribution projection", () => {
  it("round-trips alternatives, optional inclusion, and accessory relationships", () => {
    const nodes: Array<EstimateTreeNodeQueryRow & { estimate_tab_id: string }> = [{
      id: "node-1",
      kind: "area",
      name: "Facade",
      parent_id: null,
      sort_order: 0,
      estimate_tab_id: "tab-1",
    }];
    const rows = [
      row("row-main", {
        contribution_scope_id: "scope-1",
        contribution_revision: 7,
        alternative_group: {
          id: "group-1",
          name: "WPC options",
          selectedRowItemId: "row-main",
          memberRowItemIds: ["row-main", "row-alt"],
          revision: 3,
        },
        accessory_children: [{
          edgeId: "edge-1",
          childRowItemId: "row-accessory",
          mode: "required",
          isIncluded: true,
          quantityRule: { schemaVersion: 1, kind: "per-parent", multiplier: 2 },
          revision: 2,
        }],
      }),
      row("row-optional", {
        contribution_scope_id: "scope-1",
        contribution_revision: 7,
        optional_contribution: { isIncluded: false, revision: 4 },
      }),
      row("row-accessory", {
        contribution_scope_id: "scope-1",
        contribution_revision: 7,
        accessory_parent: {
          edgeId: "edge-1",
          parentRowItemId: "row-main",
          mode: "required",
          isIncluded: true,
          quantityRule: { schemaVersion: 1, kind: "per-parent", multiplier: 2 },
          revision: 2,
        },
      }),
    ];

    const [tree] = groupEstimateTabTrees(
      [{ id: "tab-1", name: "Main", sortOrder: 0, isDefault: true }],
      nodes,
      rows,
    );
    const projected = tree?.tree[0]?.estimateRowItems ?? [];

    expect(projected[0]).toMatchObject({
      contributionScopeId: "scope-1",
      contributionRevision: 7,
      alternativeGroup: { id: "group-1", selectedRowItemId: "row-main", revision: 3 },
      accessoryChildren: [{ edgeId: "edge-1", childRowItemId: "row-accessory" }],
    });
    expect(projected[1]?.optionalContribution).toEqual({ isIncluded: false, revision: 4 });
    expect(projected[2]?.accessoryParent).toMatchObject({ edgeId: "edge-1", parentRowItemId: "row-main" });
  });
});
