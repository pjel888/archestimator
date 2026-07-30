import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { calculateVat } from "@/lib/commercial-terms/calculate-vat";
import { resolveCommercialTerms } from "@/lib/commercial-terms/resolve-commercial-terms";
import type { VatTreatment } from "@/lib/commercial-terms/contracts";

const treatmentArbitrary = fc.constantFrom<VatTreatment>("inclusive", "exclusive", "exempt");
const scaleArbitrary = fc.constantFrom(0, 2, 3);

describe("commercial tax math properties", () => {
  it("is deterministic and conserves pre-VAT plus VAT as grand total", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1_000_000_000 }),
        treatmentArbitrary,
        scaleArbitrary,
        (enteredMinorUnits, treatment, currencyScale) => {
          const rateBps = treatment === "exempt" ? 0 : (enteredMinorUnits % 10_001);
          const input = {
            enteredMinorUnits,
            currencyCode: "PHP",
            currencyScale,
            terms: { treatment, rateBps },
          } as const;
          const first = calculateVat(input);
          const second = calculateVat(input);

          expect(first).toEqual(second);
          expect(first.ok).toBe(true);
          if (!first.ok) return;
          expect(first.value.preVatMinorUnits + first.value.vatMinorUnits).toBe(first.value.grandTotalMinorUnits);
          expect(first.value.vatMinorUnits).toBeGreaterThanOrEqual(0);
          if (treatment === "inclusive") expect(first.value.grandTotalMinorUnits).toBe(enteredMinorUnits);
          if (treatment === "exempt") {
            expect(first.value.vatMinorUnits).toBe(0);
            expect(first.value.vatExemptMinorUnits).toBe(enteredMinorUnits);
          }
        },
      ),
      { numRuns: 300 },
    );
  });

  it("keeps exclusive VAT monotonic for a fixed amount as the rate increases", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1_000_000_000 }),
        fc.integer({ min: 0, max: 10_000 }),
        fc.integer({ min: 0, max: 10_000 }),
        (enteredMinorUnits, firstRate, secondRate) => {
          const lowerRate = Math.min(firstRate, secondRate);
          const higherRate = Math.max(firstRate, secondRate);
          const lower = calculateVat({
            enteredMinorUnits,
            currencyCode: "USD",
            currencyScale: 2,
            terms: { treatment: "exclusive", rateBps: lowerRate },
          });
          const higher = calculateVat({
            enteredMinorUnits,
            currencyCode: "USD",
            currencyScale: 2,
            terms: { treatment: "exclusive", rateBps: higherRate },
          });

          expect(lower.ok).toBe(true);
          expect(higher.ok).toBe(true);
          if (lower.ok && higher.ok) {
            expect(higher.value.vatMinorUnits).toBeGreaterThanOrEqual(lower.value.vatMinorUnits);
          }
        },
      ),
      { numRuns: 250 },
    );
  });

  it("always preserves row precedence and selected-option provenance", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10_000 }),
        fc.integer({ min: 0, max: 10_000 }),
        fc.nat({ max: 1_000_000 }),
        (rowRateBps, optionRateBps, selectedOptionTermsRevision) => {
          const resolved = resolveCommercialTerms({
            rowOverride: { treatment: "exclusive", rateBps: rowRateBps },
            capturedSelectedOption: {
              treatment: "inclusive",
              rateBps: optionRateBps,
              selectedOptionId: "option_generated",
              selectedOptionTermsRevision,
            },
            estimateDefault: { treatment: "exempt", rateBps: 0 },
            projectDefault: { treatment: "exclusive", rateBps: 1_200 },
          });

          expect(resolved).toMatchObject({
            ok: true,
            value: {
              treatment: "exclusive",
              rateBps: rowRateBps,
              source: "row_override",
              selectedOptionId: null,
              selectedOptionTermsRevision: null,
            },
          });
        },
      ),
      { numRuns: 200 },
    );
  });

  it("rejects every generated out-of-range rate without producing amounts", () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.integer({ min: Number.MIN_SAFE_INTEGER, max: -1 }),
          fc.integer({ min: 10_001, max: Number.MAX_SAFE_INTEGER }),
        ),
        (rateBps) => {
          expect(calculateVat({
            enteredMinorUnits: 10_000,
            currencyCode: "PHP",
            currencyScale: 2,
            terms: { treatment: "exclusive", rateBps },
          })).toEqual({ ok: false, code: "invalid_vat_rate", field: "rateBps" });
        },
      ),
      { numRuns: 200 },
    );
  });
});
