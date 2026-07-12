import { describe, expect, it } from "vitest";

import type { EstimateTemplate } from "@/components/workshop/component-library/templates";
import {
  COMPONENT_FACET_STALE_DAYS,
  COMPONENT_FACET_VERY_STALE_DAYS,
  componentMatchesPricingFreshness,
  getLibraryCommitTrustGate,
  getComponentPricingFreshness,
  getComponentSourceTrustChips,
  getTemplateSourceTrustChips,
} from "@/components/workshop/library/source-trust-model";
import { DEFAULT_PRICE_FRESHNESS_POLICY, getPriceFreshness } from "@/lib/estimate-health";
import type { EstimateRowItem } from "@/lib/estimates/types";

const NOW = Date.parse("2026-06-22T00:00:00.000Z");

function makeRow(overrides: Partial<EstimateRowItem> & { id: string; material: string }): EstimateRowItem {
  const itemCost = overrides.itemCost ?? 100;
  const quantity = overrides.quantity ?? 1;
  const miscCost = overrides.miscCost ?? 0;
  const subTotal = itemCost * quantity;
  return {
    name: overrides.material,
    description: "",
    supplier: "Test Supplier",
    source: "library",
    unit: "pc",
    itemCost,
    price: itemCost,
    currency: "PHP",
    quantity,
    subTotal,
    contingencyPercentage: 0,
    contingencyValue: 0,
    miscCost,
    miscCostDefault: miscCost,
    totalItemCosts: subTotal + miscCost,
    category: "General",
    pricingSource: "Supplier quote",
    pricingDate: "2026-06-01",
    ...overrides,
  };
}

describe("library source trust model", () => {
  it("classifies pricing freshness into current, stale, very stale, and missing tiers", () => {
    expect(getComponentPricingFreshness({ pricingDate: "2026-06-01" }, NOW)).toBe("fresh");
    expect(getComponentPricingFreshness({ pricingDate: "2026-02-01" }, NOW)).toBe("stale");
    expect(getComponentPricingFreshness({ pricingDate: "2025-12-01" }, NOW)).toBe("very-stale");
    expect(getComponentPricingFreshness({ pricingDate: "" }, NOW)).toBe("missing");

    expect(componentMatchesPricingFreshness({ pricingDate: "2025-12-01" }, "stale", NOW)).toBe(true);
    expect(componentMatchesPricingFreshness({ pricingDate: "2025-12-01" }, "very-stale", NOW)).toBe(true);
    expect(componentMatchesPricingFreshness({ pricingDate: "" }, "stale", NOW)).toBe(false);
  });

  it("uses the canonical default price policy without changing the public 90/180 thresholds", () => {
    expect(COMPONENT_FACET_STALE_DAYS).toBe(DEFAULT_PRICE_FRESHNESS_POLICY.staleDays);
    expect(COMPONENT_FACET_VERY_STALE_DAYS).toBe(DEFAULT_PRICE_FRESHNESS_POLICY.veryStaleDays);
    expect(getComponentPricingFreshness({ pricingDate: "2026-02-01" }, NOW)).toBe(
      getPriceFreshness({
        timestamp: Date.parse("2026-02-01"),
        now: NOW,
        policy: DEFAULT_PRICE_FRESHNESS_POLICY,
      }),
    );
  });

  it("renders component confidence as copy-deck labels and flags missing source fields", () => {
    expect(
      getComponentSourceTrustChips(
        { pricingDate: "2026-06-01", pricingSource: "Supplier quote", confidence: "Quoted", lifecycleState: "available" },
        { now: NOW },
      ).map((chip) => chip.label),
    ).toEqual(["Current", "Verified source"]);

    expect(
      getComponentSourceTrustChips(
        { pricingDate: "2026-06-01", pricingSource: "Catalog", confidence: "catalog match", lifecycleState: "available" },
        { now: NOW },
      ).find((chip) => chip.id === "confidence-catalog-match"),
    ).toMatchObject({
      label: "Likely source",
      tone: "neutral",
      title: "Plausible but not fully verified.",
    });

    expect(
      getComponentSourceTrustChips(
        { pricingDate: "2026-06-01", pricingSource: "Manual", confidence: "low", lifecycleState: "available" },
        { now: NOW },
      ).find((chip) => chip.id === "confidence-low"),
    ).toMatchObject({
      label: "Low confidence",
      tone: "warning",
      title: "User-entered or uncertain source. Review before reuse.",
    });

    expect(
      getComponentSourceTrustChips(
        { pricingDate: "2026-06-01", pricingSource: "Manual", confidence: "field note", lifecycleState: "available" },
        { now: NOW },
      ).find((chip) => chip.id === "confidence-field-note"),
    ).toMatchObject({
      label: "field note",
      tone: "neutral",
      title: "Recorded confidence note.",
    });

    const missingChips = getComponentSourceTrustChips(
      { pricingDate: "", pricingSource: "", confidence: "", lifecycleState: "archived" },
      { now: NOW },
    );
    expect(missingChips.map((chip) => chip.label)).toEqual(["Missing price source", "No confidence", "Archived", "Missing price source"]);
    expect(missingChips.find((chip) => chip.id === "pricing-missing")).toMatchObject({
      tone: "neutral",
      title: "No pricing date recorded. Add one to track freshness.",
    });
    expect(missingChips.find((chip) => chip.id === "confidence-missing")).toMatchObject({
      tone: "neutral",
      title: "No source confidence recorded.",
    });
    expect(missingChips.find((chip) => chip.id === "lifecycle-archived")).toMatchObject({
      tone: "neutral",
    });
  });

  it("classifies insert and replace trust gates before estimate commit", () => {
    const archived = makeRow({
      id: "archived-component",
      material: "Archived component",
      lifecycleState: "archived",
    });

    expect(getLibraryCommitTrustGate(archived, { action: "insert", now: NOW })).toMatchObject({
      severity: "block",
      title: "Cannot commit archived source",
    });

    const staleReplacement = makeRow({
      id: "stale-component",
      material: "Stale replacement",
      pricingDate: "2025-12-01",
      pricingSource: "",
      confidence: "low",
      linkState: "source-changed",
      imageUrl: "/component-thumbnails/new.png",
    });
    const currentRow = makeRow({
      id: "row-1",
      material: "Current row",
      imageUrl: "/component-thumbnails/current.png",
    });

    const gate = getLibraryCommitTrustGate(staleReplacement, {
      action: "replace",
      existingRow: currentRow,
      now: NOW,
    });

    expect(gate.severity).toBe("warn");
    expect(gate.confirmLabel).toBe("Continue with replace");
    expect(gate.reasons.map((reason) => reason.id)).toEqual(expect.arrayContaining([
      "very-stale-price",
      "missing-pricing-source",
      "low-confidence",
      "source-changed",
      "thumbnail-mismatch",
    ]));
  });

  it("computes template trust from row links, link state, and row pricing dates", () => {
    const template: EstimateTemplate = {
      id: "template-1",
      name: "Source-aware template",
      description: "",
      category: "Residential",
      nodes: [
        {
          id: "area-1",
          name: "Area",
          kind: "area",
          total: "",
          estimateRowItems: [
            makeRow({
              id: "row-1",
              material: "Fresh linked row",
              sourceLibraryItemId: "component-1",
              linkState: "linked-clean",
            }),
            makeRow({
              id: "row-2",
              material: "Changed stale row",
              pricingDate: "2025-12-01",
              sourceLibraryItemId: "component-2",
              linkState: "source-changed",
            }),
          ],
        },
      ],
    };

    expect(getTemplateSourceTrustChips(template, { now: NOW }).map((chip) => chip.label)).toEqual([
      "2/2 linked rows",
      "Very stale price",
      "Source changed",
    ]);
  });

  it("uses copy-deck labels for overridden and detached template rows", () => {
    const overriddenTemplate: EstimateTemplate = {
      id: "template-overridden",
      name: "Overridden template",
      description: "",
      category: "Residential",
      nodes: [{
        id: "area-1",
        name: "Area",
        kind: "area",
        total: "",
        estimateRowItems: [makeRow({
          id: "row-overridden",
          material: "Overridden row",
          sourceLibraryItemId: "component-1",
          linkState: "linked-overridden",
        })],
      }],
    };
    const detachedTemplate: EstimateTemplate = {
      id: "template-detached",
      name: "Detached template",
      description: "",
      category: "Residential",
      nodes: [{
        id: "area-1",
        name: "Area",
        kind: "area",
        total: "",
        estimateRowItems: [makeRow({
          id: "row-detached",
          material: "Detached row",
          sourceLibraryItemId: "component-1",
          linkState: "detached",
        })],
      }],
    };

    expect(getTemplateSourceTrustChips(overriddenTemplate, { now: NOW }).map((chip) => chip.label)).toContain("Local override");
    expect(getTemplateSourceTrustChips(detachedTemplate, { now: NOW }).map((chip) => chip.label)).toContain("Detached");
  });
});
