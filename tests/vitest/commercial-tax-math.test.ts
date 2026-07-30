import { describe, expect, it } from "vitest";

import { calculateVat } from "@/lib/commercial-terms/calculate-vat";

function calculate(
  enteredMinorUnits: number,
  treatment: "inclusive" | "exclusive" | "exempt",
  rateBps: number,
  currencyScale = 2,
) {
  return calculateVat({
    enteredMinorUnits,
    currencyCode: "PHP",
    currencyScale,
    terms: { treatment, rateBps },
  });
}

describe("commercial VAT arithmetic", () => {
  it("adds exclusive VAT in basis points", () => {
    expect(calculate(10_000, "exclusive", 1_200)).toMatchObject({
      ok: true,
      value: {
        preVatMinorUnits: 10_000,
        vatMinorUnits: 1_200,
        vatExemptMinorUnits: 0,
        grandTotalMinorUnits: 11_200,
      },
    });
  });

  it("extracts inclusive VAT and conserves the entered gross amount", () => {
    expect(calculate(11_200, "inclusive", 1_200)).toMatchObject({
      ok: true,
      value: {
        preVatMinorUnits: 10_000,
        vatMinorUnits: 1_200,
        vatExemptMinorUnits: 0,
        grandTotalMinorUnits: 11_200,
      },
    });
    expect(calculate(1, "inclusive", 1_200)).toMatchObject({
      ok: true,
      value: { preVatMinorUnits: 1, vatMinorUnits: 0, grandTotalMinorUnits: 1 },
    });
  });

  it("rounds exact-half ties away from zero", () => {
    expect(calculate(1, "exclusive", 5_000)).toMatchObject({
      ok: true,
      value: { vatMinorUnits: 1, grandTotalMinorUnits: 2 },
    });
    expect(calculate(1, "inclusive", 10_000)).toMatchObject({
      ok: true,
      value: { preVatMinorUnits: 1, vatMinorUnits: 0, grandTotalMinorUnits: 1 },
    });
  });

  it("keeps exempt distinct from zero-rate exclusive VAT", () => {
    expect(calculate(500, "exempt", 0)).toMatchObject({
      ok: true,
      value: {
        treatment: "exempt",
        preVatMinorUnits: 500,
        vatMinorUnits: 0,
        vatExemptMinorUnits: 500,
        grandTotalMinorUnits: 500,
      },
    });
    expect(calculate(500, "exclusive", 0)).toMatchObject({
      ok: true,
      value: { treatment: "exclusive", vatMinorUnits: 0, vatExemptMinorUnits: 0 },
    });
  });

  it("freezes normalized currency metadata for scales zero, two, and three", () => {
    for (const currencyScale of [0, 2, 3]) {
      expect(calculateVat({
        enteredMinorUnits: 100,
        currencyCode: " php ",
        currencyScale,
        terms: { treatment: "exclusive", rateBps: 1_200 },
      })).toMatchObject({
        ok: true,
        value: { calculationVersion: 1, currencyCode: "PHP", currencyScale },
      });
    }
  });

  it("returns typed failures for invalid amount, currency, scale, rate, and overflow", () => {
    expect(calculate(-1, "exclusive", 1_200)).toMatchObject({ ok: false, code: "invalid_amount" });
    expect(calculateVat({
      enteredMinorUnits: 100,
      currencyCode: "ZZZ",
      currencyScale: 2,
      terms: { treatment: "exclusive", rateBps: 1_200 },
    })).toMatchObject({ ok: false, code: "unsupported_currency" });
    expect(calculate(100, "exclusive", 1_200, 1)).toMatchObject({ ok: false, code: "invalid_currency_scale" });
    expect(calculate(100, "exempt", 1)).toMatchObject({ ok: false, code: "invalid_vat_rate" });
    expect(calculate(Number.MAX_SAFE_INTEGER, "exclusive", 1_200)).toMatchObject({
      ok: false,
      code: "amount_out_of_range",
    });
  });
});

