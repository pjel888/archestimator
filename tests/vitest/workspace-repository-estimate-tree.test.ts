import { describe, expect, it } from "vitest";

import { selectFirstEstimateNodeIds } from "@/lib/estimates/tree-hierarchy";
import { buildEstimateTree, type EstimateTreeNodeQueryRow, type EstimateTreeRowItemQueryRow } from "@/lib/repositories/workspace-repository";
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

function row(
  input: Pick<Tables<"estimate_row_items">, "id" | "node_id" | "material" | "quantity" | "unit_cost" | "misc_cost" | "sort_order"> &
    Partial<Pick<Tables<"estimate_row_items">, "link_state" | "source_library_item_id" | "source_snapshot">>,
): Tables<"estimate_row_items"> {
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

  it("preserves detached link state for project-specific row badges", () => {
    const tree = buildEstimateTree(
      [
        node({ id: "scope", parent_id: null, kind: "group", name: "Project Scope", sort_order: 0 }),
        node({ id: "kitchen", parent_id: "scope", kind: "area", name: "Kitchen", sort_order: 10 }),
      ],
      [
        row({
          id: "row-1",
          node_id: "kitchen",
          material: "Custom Cabinet",
          quantity: 1,
          unit_cost: 1000,
          misc_cost: 0,
          sort_order: 0,
          link_state: "detached",
          source_library_item_id: null,
        }),
      ],
    );

    expect(tree[0]?.children?.[0]?.estimateRowItems?.[0]).toMatchObject({
      id: "row-1",
      source: "project",
      linkState: "detached",
      sourceLibraryItemId: null,
    });
  });

  it("strips unsafe legacy source snapshot image URLs while preserving safe internal thumbnails", () => {
    const originalSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";

    try {
      const safeSupabaseImage = "https://example.supabase.co/storage/v1/object/public/component-images/ws/user/components/fixture.webp";
      const tree = buildEstimateTree(
        [
          node({ id: "scope", parent_id: null, kind: "group", name: "Project Scope", sort_order: 0 }),
          node({ id: "kitchen", parent_id: "scope", kind: "area", name: "Kitchen", sort_order: 10 }),
        ],
        [
          row({
            id: "safe-local",
            node_id: "kitchen",
            material: "Sofa",
            quantity: 1,
            unit_cost: 100,
            misc_cost: 0,
            sort_order: 0,
            source_snapshot: { category: "Furniture", imageUrl: "/component-thumbnails/lib-sofa.jpg" },
          }),
          row({
            id: "safe-supabase",
            node_id: "kitchen",
            material: "Cabinet",
            quantity: 1,
            unit_cost: 100,
            misc_cost: 0,
            sort_order: 1,
            source_snapshot: { category: "Cabinetry", imageUrl: safeSupabaseImage },
          }),
          row({
            id: "unsafe-external",
            node_id: "kitchen",
            material: "Tracker",
            quantity: 1,
            unit_cost: 100,
            misc_cost: 0,
            sort_order: 2,
            source_snapshot: { category: "General", imageUrl: "https://tracker.example/pixel.svg?viewer=1" },
          }),
          row({
            id: "unsafe-data",
            node_id: "kitchen",
            material: "Data URL",
            quantity: 1,
            unit_cost: 100,
            misc_cost: 0,
            sort_order: 3,
            source_snapshot: { category: "General", imageUrl: "data:image/svg+xml,<svg></svg>" },
          }),
          row({
            id: "unsafe-javascript",
            node_id: "kitchen",
            material: "Script URL",
            quantity: 1,
            unit_cost: 100,
            misc_cost: 0,
            sort_order: 4,
            source_snapshot: { category: "General", imageUrl: "javascript:alert(1)" },
          }),
        ],
      );

      const rows = tree[0]?.children?.[0]?.estimateRowItems ?? [];
      expect(rows.find((item) => item.id === "safe-local")?.imageUrl).toBe("/component-thumbnails/lib-sofa.jpg");
      expect(rows.find((item) => item.id === "safe-supabase")?.imageUrl).toBe(safeSupabaseImage);
      expect(rows.find((item) => item.id === "unsafe-external")?.imageUrl).toBeUndefined();
      expect(rows.find((item) => item.id === "unsafe-data")?.imageUrl).toBeUndefined();
      expect(rows.find((item) => item.id === "unsafe-javascript")?.imageUrl).toBeUndefined();
    } finally {
      if (originalSupabaseUrl === undefined) {
        delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      } else {
        process.env.NEXT_PUBLIC_SUPABASE_URL = originalSupabaseUrl;
      }
    }
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

  it("preserves persisted sort order when group and area siblings interleave", () => {
    // One order everywhere: the tree, the sheet, and node codes all read the
    // stored sort_order, so the projection must not re-rank kinds.
    const tree = buildEstimateTree(
      [
        node({ id: "scope", parent_id: null, kind: "group", name: "Project Scope", sort_order: 0 }),
        node({ id: "kitchen", parent_id: "scope", kind: "area", name: "Kitchen", sort_order: 10 }),
        node({ id: "site-work", parent_id: "scope", kind: "group", name: "Site Work", sort_order: 20 }),
        node({ id: "living", parent_id: "scope", kind: "area", name: "Living", sort_order: 30 }),
      ],
      [],
    );

    expect(tree[0]?.children?.map((child) => child.id)).toEqual(["kitchen", "site-work", "living"]);
  });

  it("builds complete display rows from the narrowed estimate-sheet query columns only", () => {
    // Exactly the columns ESTIMATE_TREE_ROW_ITEM_COLUMNS / _NODE_COLUMNS
    // fetch — no estimate_id, sort_order, or updated_at. Guards that the
    // explicit column selection stays sufficient for linked-row display.
    const narrowedNode: EstimateTreeNodeQueryRow = { id: "kitchen", parent_id: null, kind: "area", name: "Kitchen" };
    const narrowedRow: EstimateTreeRowItemQueryRow = {
      id: "row-1",
      node_id: "kitchen",
      material: "Tile",
      description: "Glazed ceramic",
      supplier: "Tile Depot",
      supplier_id: null,
      unit: "sqm",
      unit_cost: 100,
      quantity: 2,
      contingency_percentage: 10,
      misc_cost: 50,
      row_revision: 3,
      category_node_id: null,
      discipline: null,
      designation: null,
      source_library_item_id: "lib-1",
      link_state: "linked",
      source_snapshot: {
        category: "Finishes",
        priceOptionId: "price-1",
        priceOptionLabel: "Standard",
        lifecycleState: "active",
        pricingSource: "Library snapshot",
        pricingDate: "2026-05-01",
        componentVersionId: "ver-1",
        componentVersionNumber: 4,
      },
      metadata: { tags: ["wet-area"] },
      created_at: createdAt,
    };

    const tree = buildEstimateTree([narrowedNode], [narrowedRow]);
    expect(tree[0]?.estimateRowItems?.[0]).toMatchObject({
      id: "row-1",
      material: "Tile",
      supplier: "Tile Depot",
      source: "library",
      linkState: "linked",
      category: "Finishes",
      priceOptionId: "price-1",
      priceOptionLabel: "Standard",
      lifecycleState: "active",
      pricingSource: "Library snapshot",
      pricingDate: "2026-05-01",
      componentVersionId: "ver-1",
      componentVersionNumber: 4,
      rowRevision: 3,
      tags: ["wet-area"],
      subTotal: 200,
      contingencyValue: 20,
      miscCost: 50,
      totalItemCosts: 270,
    });
    expect(tree[0]?.total).toBe("₱270.00");
  });
});
