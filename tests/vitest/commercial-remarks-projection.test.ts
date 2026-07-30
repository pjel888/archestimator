import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  groupEstimateTabTrees,
  type EstimateTreeNodeQueryRow,
  type EstimateTreeRowItemQueryRow,
} from "@/lib/estimates/estimate-tree-read-repository";

describe("commercial remarks projection", () => {
  it("reads remarks from the canonical source snapshot rather than a nonexistent row column", () => {
    const source = readFileSync("src/lib/estimates/estimate-tree-read-repository.ts", "utf8");

    expect(source).toContain("json_extract(source_snapshot_json, '$.notes') AS notes");
    expect(source).not.toContain("supplier_id, notes, unit");
  });

  it("captures the selected variant's VAT terms in the same row mutation batch", () => {
    const source = readFileSync("src/lib/estimates/d1-intents/rows.ts", "utf8");
    const selectionBlock = source.slice(
      source.indexOf("const variantSelectionStatement"),
      source.indexOf("const persistedImpactFingerprint"),
    );

    expect(selectionBlock).toContain("INSERT INTO estimate_row_variant_selections");
    expect(selectionBlock).toContain("UPDATE estimate_row_commercial_terms");
    expect(selectionBlock).toContain("cost_library_item_price_option_commercial_terms");
    expect(selectionBlock).toContain("selected_option_terms_revision");
  });

  it("hydrates persisted estimate-row notes into the editable tree", () => {
    const nodes: Array<EstimateTreeNodeQueryRow & { estimate_tab_id: string }> = [{
      id: "node-1",
      kind: "area",
      name: "Main Area",
      parent_id: null,
      sort_order: 0,
      estimate_tab_id: "tab-1",
    }];
    const rows: EstimateTreeRowItemQueryRow[] = [{
      id: "row-1",
      node_id: "node-1",
      sort_order: 0,
      material: "WPC plank",
      description: "Exterior plank",
      notes: "Quotation available; verify lead time.",
      supplier: "Supplier",
      supplier_id: null,
      unit: "pc",
      unit_cost: 100,
      quantity: 2,
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
    }];

    const [tree] = groupEstimateTabTrees([
      { id: "tab-1", name: "Main", sortOrder: 0, isDefault: true },
    ], nodes, rows);

    expect(tree?.tree[0]?.estimateRowItems?.[0]?.notes).toBe(
      "Quotation available; verify lead time.",
    );
  });
});
