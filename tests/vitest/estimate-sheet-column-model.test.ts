import { describe, expect, it } from "vitest";

import {
  DEFAULT_ESTIMATE_COLUMN_TEMPLATE,
  DEFAULT_ESTIMATE_COLUMN_WIDTHS,
  ESTIMATE_COLUMN_DEFINITIONS,
  ESTIMATE_COLUMN_TEMPLATE,
  RESIZABLE_ESTIMATE_COLUMN_IDS,
  buildEstimateColumnVars,
  clampEstimateColumnWidth,
  normalizeEstimateColumnWidths,
} from "@/lib/estimate-sheet/column-model";

describe("estimate sheet column model", () => {
  it("keeps the canonical 10-track default geometry intact", () => {
    expect(ESTIMATE_COLUMN_DEFINITIONS.map((column) => column.id)).toEqual([
      "index",
      "select",
      "material",
      "quantity",
      "contingency",
      "subTotal",
      "adjustment",
      "miscCost",
      "totalItemCosts",
      "actions",
    ]);
    expect(DEFAULT_ESTIMATE_COLUMN_TEMPLATE).toBe("36px 32px minmax(148px,1fr) 70px 104px 108px 104px 108px 124px 30px");
    expect(ESTIMATE_COLUMN_TEMPLATE).toBe(
      "36px 32px minmax(var(--est-col-material, 148px), 1fr) var(--est-col-quantity, 70px) var(--est-col-contingency, 104px) var(--est-col-subTotal, 108px) var(--est-col-adjustment, 104px) var(--est-col-miscCost, 108px) var(--est-col-totalItemCosts, 124px) 30px",
    );
  });

  it("only exposes the seven data columns as resizable", () => {
    expect(RESIZABLE_ESTIMATE_COLUMN_IDS).toEqual([
      "material",
      "quantity",
      "contingency",
      "subTotal",
      "adjustment",
      "miscCost",
      "totalItemCosts",
    ]);
    expect(DEFAULT_ESTIMATE_COLUMN_WIDTHS.material).toBe(148);
    expect(ESTIMATE_COLUMN_DEFINITIONS.filter((column) => column.resizable).map((column) => column.cssVar)).toEqual([
      "--est-col-material",
      "--est-col-quantity",
      "--est-col-contingency",
      "--est-col-subTotal",
      "--est-col-adjustment",
      "--est-col-miscCost",
      "--est-col-totalItemCosts",
    ]);
  });

  it("clamps and normalizes persisted widths without storing defaults", () => {
    expect(clampEstimateColumnWidth("material", 40)).toBe(148);
    expect(clampEstimateColumnWidth("quantity", 999)).toBe(140);
    expect(normalizeEstimateColumnWidths({ material: 148, quantity: 74, totalItemCosts: 124 })).toEqual({ quantity: 74 });
    expect(normalizeEstimateColumnWidths({})).toEqual({});
  });

  it("builds all seven CSS variables from defaults plus overrides", () => {
    expect(buildEstimateColumnVars({ material: 240, quantity: 74 })).toEqual({
      "--est-col-material": "240px",
      "--est-col-quantity": "74px",
      "--est-col-contingency": "104px",
      "--est-col-subTotal": "108px",
      "--est-col-adjustment": "104px",
      "--est-col-miscCost": "108px",
      "--est-col-totalItemCosts": "124px",
    });
  });
});
