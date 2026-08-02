import { describe, expect, it } from "vitest";

import {
  QUOTATION_REQUIREMENTS,
  QUOTATION_STATUSES,
  VAT_TREATMENTS,
} from "@/lib/commercial-terms/contracts";
import { resolveCommercialTerms } from "@/lib/commercial-terms/resolve-commercial-terms";

const projectDefault = { treatment: "exclusive", rateBps: 1_200 } as const;

describe("commercial terms resolution", () => {
  it("keeps runtime enum contracts immutable", () => {
    expect(Object.isFrozen(VAT_TREATMENTS)).toBe(true);
    expect(Object.isFrozen(QUOTATION_REQUIREMENTS)).toBe(true);
    expect(Object.isFrozen(QUOTATION_STATUSES)).toBe(true);
  });

  it("uses complete pairs in row, captured option, estimate, project order", () => {
    const capturedSelectedOption = {
      treatment: "inclusive",
      rateBps: 1_000,
      selectedOptionId: "option_2",
      selectedOptionTermsRevision: 7,
    } as const;

    expect(resolveCommercialTerms({
      rowOverride: { treatment: "exempt", rateBps: 0 },
      capturedSelectedOption,
      estimateDefault: { treatment: "exclusive", rateBps: 900 },
      projectDefault,
    })).toEqual({
      ok: true,
      value: {
        treatment: "exempt",
        rateBps: 0,
        source: "row_override",
        selectedOptionId: null,
        selectedOptionTermsRevision: null,
      },
    });

    expect(resolveCommercialTerms({ capturedSelectedOption, estimateDefault: projectDefault, projectDefault })).toEqual({
      ok: true,
      value: {
        treatment: "inclusive",
        rateBps: 1_000,
        source: "captured_selected_option",
        selectedOptionId: "option_2",
        selectedOptionTermsRevision: 7,
      },
    });

    expect(resolveCommercialTerms({ estimateDefault: { treatment: "inclusive", rateBps: 800 }, projectDefault })).toMatchObject({
      ok: true,
      value: { treatment: "inclusive", rateBps: 800, source: "estimate_default" },
    });
    expect(resolveCommercialTerms({ projectDefault })).toMatchObject({
      ok: true,
      value: { treatment: "exclusive", rateBps: 1_200, source: "project_default" },
    });
  });

  it("skips absent pairs but fails closed on a partial higher-precedence pair", () => {
    expect(resolveCommercialTerms({ rowOverride: {}, projectDefault })).toMatchObject({
      ok: true,
      value: { source: "project_default" },
    });
    expect(resolveCommercialTerms({ rowOverride: { treatment: "inclusive" }, projectDefault })).toEqual({
      ok: false,
      code: "incomplete_vat_pair",
      field: "vat_pair",
      source: "row_override",
    });
    expect(resolveCommercialTerms({ rowOverride: { rateBps: 500 }, projectDefault })).toMatchObject({
      ok: false,
      code: "incomplete_vat_pair",
      source: "row_override",
    });
  });

  it("rejects invalid rates, nonzero exempt rates, and malformed selected-option provenance", () => {
    expect(resolveCommercialTerms({ projectDefault: { treatment: "exclusive", rateBps: 10_001 } })).toMatchObject({
      ok: false,
      code: "invalid_vat_rate",
      source: "project_default",
    });
    expect(resolveCommercialTerms({ projectDefault: { treatment: "exempt", rateBps: 1 } })).toMatchObject({
      ok: false,
      code: "invalid_vat_rate",
    });
    expect(resolveCommercialTerms({
      capturedSelectedOption: {
        treatment: "inclusive",
        rateBps: 1_200,
        selectedOptionId: "",
        selectedOptionTermsRevision: 1,
      },
      projectDefault,
    })).toMatchObject({ ok: false, code: "invalid_selected_option_snapshot" });
  });

  it("does not manufacture or copy remarks and quotation facts", () => {
    const captured = {
      treatment: "inclusive",
      rateBps: 1_200,
      selectedOptionId: "option_private",
      selectedOptionTermsRevision: 2,
      notes: "supplier-only note",
      quotationStatus: "available",
      quotationReference: "private-reference",
    } as const;
    const result = resolveCommercialTerms({ capturedSelectedOption: captured, projectDefault });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).not.toHaveProperty("notes");
    expect(result.value).not.toHaveProperty("quotationStatus");
    expect(result.value).not.toHaveProperty("quotationReference");
  });

  it("returns a typed failure when no level supplies a pair", () => {
    expect(resolveCommercialTerms({})).toEqual({
      ok: false,
      code: "missing_commercial_terms",
      field: "commercialTerms",
    });
  });
});
