import { describe, expect, it } from "vitest";

import { formatQuantityUnitLabel } from "@/lib/estimates/format-quantity-unit-label";

describe("formatQuantityUnitLabel", () => {
  it("pluralizes countable quantity units", () => {
    expect(formatQuantityUnitLabel(12, "box")).toBe("boxes");
    expect(formatQuantityUnitLabel(2, "Box")).toBe("Boxes");
    expect(formatQuantityUnitLabel(0, "allowance")).toBe("allowances");
    expect(formatQuantityUnitLabel(2, "linear foot")).toBe("linear feet");
    expect(formatQuantityUnitLabel(-2, "inch")).toBe("inches");
  });

  it("keeps singular quantity units for one or negative one", () => {
    expect(formatQuantityUnitLabel(1, "box")).toBe("box");
    expect(formatQuantityUnitLabel(-1, "Box")).toBe("Box");
  });

  it("does not pluralize construction abbreviations and measurement units", () => {
    expect(formatQuantityUnitLabel(12, "sqm")).toBe("sqm");
    expect(formatQuantityUnitLabel(12, "sq.m.")).toBe("sq.m.");
    expect(formatQuantityUnitLabel(12, "pc")).toBe("pc");
    expect(formatQuantityUnitLabel(12, "lf")).toBe("lf");
    expect(formatQuantityUnitLabel(12, "cu.m.")).toBe("cu.m.");
  });
});
