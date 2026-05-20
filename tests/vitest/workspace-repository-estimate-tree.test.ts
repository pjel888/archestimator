import { describe, expect, it } from "vitest";

import { buildEstimateTree } from "@/lib/repositories/workspace-repository";
import type { Tables } from "@/lib/supabase/types";

const createdAt = "2026-05-20T00:00:00.000Z";

function node(input: Pick<Tables<"estimate_nodes">, "id" | "parent_id" | "kind" | "name" | "sort_order">): Tables<"estimate_nodes"> {
  return {
    estimate_id: "estimate-1",
    metadata: {},
    created_at: createdAt,
    updated_at: createdAt,
    ...input,
  };
}

function row(input: Pick<Tables<"estimate_row_items">, "id" | "node_id" | "material" | "quantity" | "unit_cost" | "supplementary_cost" | "labor_cost" | "sort_order">): Tables<"estimate_row_items"> {
  return {
    estimate_id: "estimate-1",
    source_library_item_id: null,
    source_snapshot: { category: "General" },
    description: "",
    supplier: "",
    unit: "unit",
    discipline: "",
    designation: "",
    link_state: "unlinked",
    metadata: {},
    created_at: createdAt,
    updated_at: createdAt,
    ...input,
  };
}

describe("workspace repository estimate tree projection", () => {
  it("keeps group nodes visible when building the estimate tree", () => {
    const tree = buildEstimateTree(
      [
        node({ id: "scope", parent_id: null, kind: "group", name: "Project Scope", sort_order: 0 }),
        node({ id: "floor", parent_id: "scope", kind: "group", name: "Ground Floor", sort_order: 10 }),
        node({ id: "kitchen", parent_id: "floor", kind: "area", name: "Kitchen", sort_order: 20 }),
      ],
      [
        row({ id: "row-1", node_id: "kitchen", material: "Tile", quantity: 2, unit_cost: 100, supplementary_cost: 25, labor_cost: 75, sort_order: 0 }),
      ],
    );

    expect(tree).toEqual([
      expect.objectContaining({
        id: "scope",
        kind: "group",
        name: "Project Scope",
        total: "₱300.00",
        children: [
          expect.objectContaining({
            id: "floor",
            kind: "group",
            name: "Ground Floor",
            total: "₱300.00",
            children: [
              expect.objectContaining({
                id: "kitchen",
                kind: "area",
                name: "Kitchen",
                total: "₱300.00",
                estimateRowItems: [expect.objectContaining({ id: "row-1", totalItemCosts: 300 })],
              }),
            ],
          }),
        ],
      }),
    ]);
  });

  it("does not project unsupported legacy technical node kinds into the active tree", () => {
    const tree = buildEstimateTree(
      [
        node({ id: "legacy-lot", parent_id: null, kind: "lot" as Tables<"estimate_nodes">["kind"], name: "Legacy Lot", sort_order: 0 }),
        node({ id: "active-group", parent_id: null, kind: "group", name: "Active Group", sort_order: 10 }),
      ],
      [],
    );

    expect(tree.map((item) => item.id)).toEqual(["active-group"]);
  });
});
