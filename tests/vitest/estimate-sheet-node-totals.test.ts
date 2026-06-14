import { describe, expect, it } from "vitest";

import {
  computeNodeTotal,
  computeNodeTotals,
  type EditableRowValue,
} from "@/components/workshop/estimate-sheet/rows/editable-row-model";
import type { EstimateRowItem, EstimateTreeNode } from "@/components/workshop/estimate-tree-data";

function makeRow(id: string, itemCost: number, quantity: number): EstimateRowItem {
  const subTotal = itemCost * quantity;
  return {
    id,
    material: id,
    description: "",
    supplier: "Fixture",
    source: "library",
    unit: "pc",
    itemCost,
    quantity,
    subTotal,
    contingencyPercentage: 0,
    contingencyValue: 0,
    miscCost: 0,
    totalItemCosts: subTotal,
    category: "Fixture",
    pricingSource: "Fixture",
    pricingDate: "2026-06-14",
  };
}

describe("estimate sheet node totals", () => {
  it("builds parent and child totals in one reusable lookup", () => {
    const tree: EstimateTreeNode[] = [
      {
        id: "root",
        name: "Root Area",
        kind: "area",
        total: "₱0.00",
        estimateRowItems: [makeRow("root-row", 10, 1)],
        children: [
          {
            id: "child",
            name: "Child Area",
            kind: "area",
            total: "₱0.00",
            estimateRowItems: [makeRow("child-row", 5, 2)],
            children: [],
          },
        ],
      },
    ];
    const editableRows: Record<string, EditableRowValue> = {
      "root-row": {
        quantity: "3",
        contingencyMode: "contingency",
        contingencyPercentage: "10",
        miscCost: "1",
      },
      "child-row": {
        quantity: "4",
        contingencyMode: "discount",
        contingencyPercentage: "25",
        miscCost: "2",
      },
    };

    const totals = computeNodeTotals(tree, editableRows);

    expect(totals.get("child")).toBe(17);
    expect(totals.get("root")).toBe(51);
    expect(totals.get("root")).toBe(computeNodeTotal(tree[0], editableRows));
  });
});
