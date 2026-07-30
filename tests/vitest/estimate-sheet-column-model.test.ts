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
  it("keeps the canonical 11-track default geometry intact", () => {
    expect(ESTIMATE_COLUMN_DEFINITIONS.map((column) => column.id)).toEqual([
      "index",
      "select",
      "material",
      "commercial",
      "quantity",
      "contingency",
      "subTotal",
      "adjustment",
      "miscCost",
      "totalItemCosts",
      "actions",
    ]);
    expect(DEFAULT_ESTIMATE_COLUMN_TEMPLATE).toBe("28px 32px minmax(240px,1fr) 160px 64px 84px 92px 84px 92px 108px 32px");
    expect(ESTIMATE_COLUMN_TEMPLATE).toBe(
      "var(--estimate-column-template, 28px 32px minmax(var(--est-col-material, 280px), 1fr) var(--est-col-commercial, 160px) var(--est-col-quantity, 64px) var(--est-col-contingency, 84px) var(--est-col-subTotal, 92px) var(--est-col-adjustment, 84px) var(--est-col-miscCost, 92px) var(--est-col-totalItemCosts, 108px) 32px)",
    );
  });

  it("only exposes the eight data columns as resizable", () => {
    expect(RESIZABLE_ESTIMATE_COLUMN_IDS).toEqual([
      "material",
      "commercial",
      "quantity",
      "contingency",
      "subTotal",
      "adjustment",
      "miscCost",
      "totalItemCosts",
    ]);
    expect(DEFAULT_ESTIMATE_COLUMN_WIDTHS.material).toBe(280);
    expect(ESTIMATE_COLUMN_DEFINITIONS.filter((column) => column.resizable).map((column) => column.cssVar)).toEqual([
      "--est-col-material",
      "--est-col-commercial",
      "--est-col-quantity",
      "--est-col-contingency",
      "--est-col-subTotal",
      "--est-col-adjustment",
      "--est-col-miscCost",
      "--est-col-totalItemCosts",
    ]);
  });

  it("clamps and normalizes persisted widths without storing defaults", () => {
    expect(clampEstimateColumnWidth("material", 40)).toBe(240);
    expect(clampEstimateColumnWidth("quantity", 999)).toBe(140);
    expect(normalizeEstimateColumnWidths({ material: 280, quantity: 64, totalItemCosts: 108 })).toEqual({});
    expect(normalizeEstimateColumnWidths({ material: 148, quantity: 74, totalItemCosts: 124 })).toEqual({
      material: 240,
      quantity: 74,
      totalItemCosts: 124,
    });
    expect(normalizeEstimateColumnWidths({})).toEqual({});
  });

  it("builds all eight CSS variables from defaults plus overrides", () => {
    expect(buildEstimateColumnVars({ material: 240, quantity: 74 })).toEqual({
      "--est-col-material": "240px",
      "--est-col-commercial": "160px",
      "--est-col-quantity": "74px",
      "--est-col-contingency": "84px",
      "--est-col-subTotal": "92px",
      "--est-col-adjustment": "84px",
      "--est-col-miscCost": "92px",
      "--est-col-totalItemCosts": "108px",
    });
  });
});
