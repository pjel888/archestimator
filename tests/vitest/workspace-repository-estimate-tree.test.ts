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

function row(input: Pick<Tables<"estimate_row_items">, "id" | "node_id" | "material" | "quantity" | "unit_cost" | "misc_cost" | "sort_order">): Tables<"estimate_row_items"> {
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
        row({ id: "row-1", node_id: "kitchen", material: "Tile", quantity: 2, unit_cost: 100, misc_cost: 100, sort_order: 0 }),
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
                estimateRowItems: [expect.objectContaining({ id: "row-1", miscCost: 100, totalItemCosts: 300 })],
              }),
            ],
          }),
        ],
      }),
    ]);
  });

  it("normalizes legacy organizing node kinds to visible group nodes while preserving nesting", () => {
    const tree = buildEstimateTree(
      [
        node({ id: "legacy-lot", parent_id: null, kind: "lot", name: "Lot", sort_order: 0 }),
        node({ id: "legacy-house", parent_id: "legacy-lot", kind: "structure", name: "House", sort_order: 10 }),
        node({ id: "legacy-floor", parent_id: "legacy-house", kind: "level", name: "Second Floor", sort_order: 20 }),
        node({ id: "master-bedroom", parent_id: "legacy-floor", kind: "area", name: "Master Bedroom", sort_order: 30 }),
        node({ id: "active-group", parent_id: null, kind: "group", name: "Active Group", sort_order: 10 }),
      ],
      [],
    );

    expect(tree).toEqual([
      expect.objectContaining({
        id: "legacy-lot",
        kind: "group",
        name: "Lot",
        children: [
          expect.objectContaining({
            id: "legacy-house",
            kind: "group",
            name: "House",
            children: [
              expect.objectContaining({
                id: "legacy-floor",
                kind: "group",
                name: "Second Floor",
                children: [
                  expect.objectContaining({
                    id: "master-bedroom",
                    kind: "area",
                    name: "Master Bedroom",
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      expect.objectContaining({ id: "active-group", kind: "group" }),
    ]);
  });

  it("projects Group Node siblings before Area Node siblings even when persisted sort orders are mixed", () => {
    const tree = buildEstimateTree(
      [
        node({ id: "scope", parent_id: null, kind: "group", name: "Project Scope", sort_order: 0 }),
        node({ id: "kitchen", parent_id: "scope", kind: "area", name: "Kitchen", sort_order: 10 }),
        node({ id: "site-work", parent_id: "scope", kind: "group", name: "Site Work", sort_order: 20 }),
        node({ id: "living", parent_id: "scope", kind: "area", name: "Living", sort_order: 30 }),
      ],
      [],
    );

    expect(tree[0]?.children?.map((child) => child.id)).toEqual(["site-work", "kitchen", "living"]);
  });
});
