import { describe, expect, it } from "vitest";

import {
  COMPONENT_UNIT_OPTIONS,
  CONTENT_UNIT_OPTIONS,
  getUnitDisplayLabel,
  unitUsesContentConversion,
} from "@/lib/component-library/unit-options";

function unitValues(options: Array<{ value: string }>) {
  return new Set(options.map((option) => option.value));
}

describe("component unit options", () => {
  it("includes the common estimating units used by material, labor, and package pricing", () => {
    const values = unitValues(COMPONENT_UNIT_OPTIONS);

    for (const value of [
      "ea",
      "ls",
      "sqm",
      "m3",
      "sq ft",
      "cu yd",
      "bag",
      "case",
      "roll",
      "pallet",
      "crew hr",
      "equipment hr",
      "sqm/box",
      "pcs/pack",
      "L/drum",
    ]) {
      expect(values.has(value)).toBe(true);
    }
  });

  it("keeps equivalent-content options focused on count and measurable contents", () => {
    const values = unitValues(CONTENT_UNIT_OPTIONS);

    expect(values.has("sqm")).toBe(true);
    expect(values.has("sq yd")).toBe(true);
    expect(values.has("cu yd")).toBe(true);
    expect(values.has("fixture")).toBe(true);
    expect(values.has("box")).toBe(false);
  });

  it("recognizes package-like units that need content conversion details", () => {
    expect(unitUsesContentConversion("case")).toBe(true);
    expect(unitUsesContentConversion("wire spool")).toBe(true);
    expect(unitUsesContentConversion("gal/drum")).toBe(false);
    expect(unitUsesContentConversion("sqm")).toBe(false);
  });

  it("normalizes known unit display labels", () => {
    expect(getUnitDisplayLabel("ls")).toBe("LS");
    expect(getUnitDisplayLabel(" SQM ")).toBe("sqm");
    expect(getUnitDisplayLabel("custom_unit")).toBe("custom unit");
  });
});
