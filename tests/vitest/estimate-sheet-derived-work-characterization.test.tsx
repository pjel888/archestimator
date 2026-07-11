import { afterEach, describe, expect, it, vi } from "vitest";

import {
  computeNodeTotals,
  updateEditableRowValue,
  type EditableRowValue,
} from "@/components/workshop/estimate-sheet/rows/editable-row-model";
import { setEstimateNodeTotalsProbe } from "@/components/workshop/estimate-sheet-render-probe";
import type { EstimateRowItem, EstimateTreeNode } from "@/components/workshop/estimate-tree-data";

function makeRow(id: string, itemCost: number, quantity: number): EstimateRowItem {
  const subTotal = itemCost * quantity;
  return {
    id,
    material: id,
    description: `${id} description`,
    supplier: "Fixture supplier",
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
    pricingDate: "2026-07-11",
  };
}

afterEach(() => setEstimateNodeTotalsProbe(null));

describe("estimate sheet derived-work characterization", () => {
  it("patches one editable row without replacing its cached fields or sibling entries", () => {
    const first = makeRow("row-first", 100, 2);
    const second = makeRow("row-second", 50, 1);
    const existing: Record<string, EditableRowValue> = {
      "row-first": {
        quantity: "2",
        quantityExpression: "2",
        quantityBase: "",
        quantityContingencyAmount: "",
        contingencyMode: "contingency",
        contingencyPercentage: "0",
        adjustmentPercentage: "0",
        miscCost: "0",
        name: "Cached name",
        description: "Cached description",
        brand: "Cached brand",
        supplier: "Cached supplier",
        unit: "pc",
        unitCost: "100",
        imageUrl: "",
        sourceUrl: "",
        supplierId: "supplier-1",
      },
      "row-second": {
        quantity: "1",
        quantityExpression: "1",
        quantityBase: "",
        quantityContingencyAmount: "",
        contingencyMode: "contingency",
        contingencyPercentage: "0",
        adjustmentPercentage: "0",
        miscCost: "0",
        name: second.material,
        description: second.description,
        brand: "",
        supplier: second.supplier,
        unit: second.unit,
        unitCost: "50",
        imageUrl: "",
        sourceUrl: "",
      },
    };

    const updated = updateEditableRowValue(existing, first, { quantity: "7", unitCost: "125" });

    expect(updated).not.toBe(existing);
    expect(updated["row-second"]).toBe(existing["row-second"]);
    expect(updated["row-first"]).toMatchObject({
      quantity: "7",
      unitCost: "125",
      name: "Cached name",
    });
    expect(updated["row-first"]).not.toHaveProperty("supplierId");
  });

  it("computes nested totals from editable overrides in one root traversal", () => {
    const root: EstimateTreeNode = {
      id: "root",
      name: "Root",
      kind: "area",
      total: "PHP 0",
      estimateRowItems: [makeRow("root-row", 10, 1)],
      children: [{
        id: "child",
        name: "Child",
        kind: "area",
        total: "PHP 0",
        estimateRowItems: [makeRow("child-row", 5, 2)],
        children: [],
      }],
    };
    const report = vi.fn();
    setEstimateNodeTotalsProbe(report);

    const totals = computeNodeTotals([root], {
      "root-row": { quantity: "3" },
      "child-row": { quantity: "4" },
    });

    expect(totals).toEqual(new Map([["child", 20], ["root", 50]]));
    expect(report).toHaveBeenCalledOnce();
    expect(report).toHaveBeenCalledWith(["root"]);
  });
});
