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
      "discount",
      "subTotal",
      "miscCost",
      "totalItemCosts",
      "actions",
    ]);
    expect(DEFAULT_ESTIMATE_COLUMN_TEMPLATE).toBe("36px 32px minmax(160px,1fr) 58px 92px 86px 92px 92px 108px 30px");
    expect(ESTIMATE_COLUMN_TEMPLATE).toBe(
      "36px 32px minmax(var(--est-col-material, 160px), 1fr) var(--est-col-quantity, 58px) var(--est-col-contingency, 92px) var(--est-col-discount, 86px) var(--est-col-subTotal, 92px) var(--est-col-miscCost, 92px) var(--est-col-totalItemCosts, 108px) 30px",
    );
  });

  it("only exposes the seven data columns as resizable", () => {
    expect(RESIZABLE_ESTIMATE_COLUMN_IDS).toEqual([
      "material",
      "quantity",
      "contingency",
      "discount",
      "subTotal",
      "miscCost",
      "totalItemCosts",
    ]);
    expect(DEFAULT_ESTIMATE_COLUMN_WIDTHS.material).toBe(160);
    expect(ESTIMATE_COLUMN_DEFINITIONS.filter((column) => column.resizable).map((column) => column.cssVar)).toEqual([
      "--est-col-material",
      "--est-col-quantity",
      "--est-col-contingency",
      "--est-col-discount",
      "--est-col-subTotal",
      "--est-col-miscCost",
      "--est-col-totalItemCosts",
    ]);
  });

  it("clamps and normalizes persisted widths without storing defaults", () => {
    expect(clampEstimateColumnWidth("material", 40)).toBe(160);
    expect(clampEstimateColumnWidth("quantity", 999)).toBe(140);
    expect(normalizeEstimateColumnWidths({ material: 160, quantity: 74, totalItemCosts: 108 })).toEqual({ quantity: 74 });
    expect(normalizeEstimateColumnWidths({})).toEqual({});
  });

  it("builds all seven CSS variables from defaults plus overrides", () => {
    expect(buildEstimateColumnVars({ material: 240, quantity: 74 })).toEqual({
      "--est-col-material": "240px",
      "--est-col-quantity": "74px",
      "--est-col-contingency": "92px",
      "--est-col-discount": "86px",
      "--est-col-subTotal": "92px",
      "--est-col-miscCost": "92px",
      "--est-col-totalItemCosts": "108px",
    });
  });
});
