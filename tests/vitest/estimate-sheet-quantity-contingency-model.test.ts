import { describe, expect, it } from "vitest";

import {
  buildEditableQuantityContingencyPercentagePatch,
  computeEditableRowTotal,
  getInitialEditableRow,
  materializeEditableEstimateTree,
  parseEditableQuantityExpression,
} from "@/components/workshop/estimate-sheet/rows/editable-row-model";
import type { EstimateRowItem, EstimateTreeNode } from "@/components/workshop/estimate-tree-data";
import { parseQuantityExpression } from "@/lib/estimates/parse-quantity-expression";

function row(overrides: Partial<EstimateRowItem> = {}): EstimateRowItem {
  return {
    id: "row-1",
    material: "Concrete slab",
    description: "Cast-in-place slab",
    supplier: "Batching plant",
    source: "library",
    unit: "sqm",
    itemCost: 100,
    quantity: 2,
    quantityBase: null,
    quantityContingencyAmount: null,
    subTotal: 200,
    contingencyPercentage: 10,
    contingencyValue: 20,
    miscCost: 5,
    totalItemCosts: 225,
    category: "Civil",
    pricingSource: "Quote",
    pricingDate: "2026-06-26",
    confidence: "quoted",
    designation: "C-01",
    sourceLibraryItemId: null,
    linkState: "unlinked",
    metadata: {},
    ...overrides,
  };
}

function node(item: EstimateRowItem): EstimateTreeNode {
  return {
    id: "node-1",
    name: "Ground Floor",
    kind: "area",
    total: "PHP 0.00",
    children: [],
    estimateRowItems: [item],
  };
}

describe("quantity contingency row model", () => {
  it("parses base-plus-contingency quantities strictly", () => {
    expect(parseQuantityExpression("100 + 20")).toMatchObject({
      isValid: true,
      baseQuantity: 100,
      contingencyAmount: 20,
      totalQuantity: 120,
      contingencyPercentage: 20,
      hasContingency: true,
      hasContingencyExpression: true,
      expression: "100 + 20",
    });
    expect(parseQuantityExpression("0+20")).toMatchObject({
      isValid: true,
      baseQuantity: 0,
      contingencyAmount: 20,
      totalQuantity: 20,
      contingencyPercentage: 0,
      hasContingency: true,
    });

    for (const invalid of ["100++20", "+20", "100+", "1e2+20", "100,000+20", "100-20"]) {
      expect(parseQuantityExpression(invalid).isValid, invalid).toBe(false);
    }
  });

  it("does not coerce a base-plus-contingency edit into a concatenated number", () => {
    const item = row();
    const parsed = parseEditableQuantityExpression(item, "100+20");

    expect(parsed).toEqual({
      ok: true,
      patch: {
        quantity: "120",
        quantityExpression: "100 + 20",
        quantityBase: "100",
        quantityContingencyAmount: "20",
        contingencyMode: "contingency",
        contingencyPercentage: "20",
      },
    });
  });

  it("converts an edited contingency percentage into a quantity add-on patch", () => {
    expect(buildEditableQuantityContingencyPercentagePatch("100", "20")).toEqual({
      quantity: "120",
      quantityExpression: "100 + 20",
      quantityBase: "100",
      quantityContingencyAmount: "20",
      contingencyMode: "contingency",
      contingencyPercentage: "20",
    });

    expect(buildEditableQuantityContingencyPercentagePatch("0", "20")).toEqual({
      quantity: "0",
      quantityExpression: "",
      quantityBase: "0",
      quantityContingencyAmount: "0",
      contingencyMode: "contingency",
      contingencyPercentage: "0",
    });
  });

  it("keeps legacy rows on percentage-as-money math when no quantity base is stored", () => {
    const item = row();
    const editable = getInitialEditableRow(item);

    expect(editable.quantityBase).toBe("");
    expect(editable.quantityContingencyAmount).toBe("");
    expect(computeEditableRowTotal(item, { [item.id]: editable })).toBe(225);
  });

  it("uses quantity-mode math without applying row-level money contingency", () => {
    const item = row({
      quantity: 120,
      quantityBase: 100,
      quantityContingencyAmount: 20,
      subTotal: 12_000,
      contingencyPercentage: 20,
      contingencyValue: 0,
      miscCost: 50,
      totalItemCosts: 12_050,
    });
    const editable = getInitialEditableRow(item);

    expect(editable.quantityExpression).toBe("100 + 20");
    expect(editable.contingencyPercentage).toBe("20");
    expect(computeEditableRowTotal(item, { [item.id]: editable })).toBe(12_050);

    const [materializedNode] = materializeEditableEstimateTree([node(item)], { [item.id]: editable });
    const materializedRow = materializedNode.estimateRowItems?.[0];

    expect(materializedRow).toMatchObject({
      quantity: 120,
      quantityBase: 100,
      quantityContingencyAmount: 20,
      subTotal: 12_000,
      contingencyPercentage: 20,
      contingencyValue: 0,
      miscCost: 50,
      totalItemCosts: 12_050,
    });
  });
});
