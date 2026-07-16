import { describe, expect, it } from "vitest";

import {
  assertQuickAddComponentInput,
  validateQuickAddComponentInput,
} from "@/lib/component-library/quick-add-validation";

describe("quick add validation", () => {
  it("normalizes text fields, strips control characters, and rounds money", () => {
    const normalized = assertQuickAddComponentInput({
      name: "  Door\u0000 hinge  ",
      category: " Hardware ",
      unit: " pc ",
      unitCost: "12.345",
      miscCost: "0.004",
      supplier: " Acme ",
      brand: " Hinge Co ",
      pricingDate: "2026-01-10",
      pricingSource: "Supplier quote 123",
    }, { today: "2026-06-22" });

    expect(normalized).toMatchObject({
      name: "Door hinge",
      unit: "pc",
      unitCost: 12.35,
      miscCost: 0,
      supplier: "Acme",
      brand: "Hinge Co",
      pricingDate: "2026-01-10",
      pricingSource: "Supplier quote 123",
    });
  });

  it("rejects invalid quick add inputs with field-specific copy", () => {
    const result = validateQuickAddComponentInput({
      name: "",
      category: "",
      unit: "",
      unitCost: "-1",
      pricingDate: "2999-01-01",
      pricingSource: "ftp://supplier.example/quote",
    }, { today: "2026-06-22" });

    expect(result.errors).toMatchObject({
      name: "Enter a component name.",
      unit: "Enter a unit (e.g. each, m2, hr).",
      unitCost: "Enter a unit cost of zero or more.",
      pricingDate: "Enter a pricing date that is not in the future.",
      pricingSource: "Enter a valid https URL.",
    });
  });

  it("rejects spreadsheet-formula prefixes in free-text fields", () => {
    const result = validateQuickAddComponentInput({
      name: "=HYPERLINK(\"https://example.test\")",
      category: "+Hardware",
      unit: "@unit",
      unitCost: "12",
      supplier: "-Supplier",
      brand: "=Brand",
      pricingSource: "=cmd|' /C calc'!A0",
    }, { today: "2026-06-22" });

    expect(result.errors).toMatchObject({
      name: "Remove spreadsheet formula prefixes from the name.",
      unit: "Remove spreadsheet formula prefixes from the unit.",
      supplier: "Remove spreadsheet formula prefixes.",
      brand: "Remove spreadsheet formula prefixes.",
      pricingSource: "Remove spreadsheet formula prefixes from the pricing source.",
    });
  });
});
