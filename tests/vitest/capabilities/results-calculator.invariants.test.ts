import { describe, expect, it } from "vitest";

import { calculateResults } from "@/lib/ab-testing/results-calculator";

describe("calculateResults invariants", () => {
  it("returns neutral rates, significance, uplift, and recommendation when both variants have zero views", () => {
    const result = calculateResults(
      { views: 0, conversions: 0 },
      { views: 0, conversions: 0 },
    );

    expect(result).toEqual({
      variantA: { views: 0, conversions: 0, rate: 0 },
      variantB: { views: 0, conversions: 0, rate: 0 },
      uplift: 0,
      pValue: 1,
      significant: false,
      recommendation: "inconclusive",
    });
  });

  it("keeps positive-view variants with zero conversions non-significant", () => {
    const result = calculateResults(
      { views: 100, conversions: 0 },
      { views: 100, conversions: 0 },
    );

    expect(result).toMatchObject({
      variantA: { rate: 0 },
      variantB: { rate: 0 },
      uplift: 0,
      pValue: 1,
      significant: false,
      recommendation: "inconclusive",
    });
  });

  it("increases rate and uplift monotonically when B gains conversions at fixed views", () => {
    const lower = calculateResults(
      { views: 100, conversions: 10 },
      { views: 100, conversions: 11 },
    );
    const higher = calculateResults(
      { views: 100, conversions: 10 },
      { views: 100, conversions: 20 },
    );

    expect(higher.variantB.rate).toBeGreaterThan(lower.variantB.rate);
    expect(higher.uplift).toBeGreaterThan(lower.uplift);
    expect(lower.uplift).toBe(10);
    expect(higher.uplift).toBe(100);
  });

  it("crosses the significance and recommendation boundary between 19 and 20 B conversions", () => {
    const below = calculateResults(
      { views: 100, conversions: 10 },
      { views: 100, conversions: 19 },
    );
    const above = calculateResults(
      { views: 100, conversions: 10 },
      { views: 100, conversions: 20 },
    );

    expect(below.pValue).toBeGreaterThan(0.05);
    expect(below.significant).toBe(false);
    expect(below.recommendation).toBe("inconclusive");
    expect(above.pValue).toBeLessThan(0.05);
    expect(above.significant).toBe(true);
    expect(above.recommendation).toBe("B");
  });

  it("keeps the p-value symmetric while reversing the winning recommendation", () => {
    const bWins = calculateResults(
      { views: 100, conversions: 10 },
      { views: 100, conversions: 20 },
    );
    const aWins = calculateResults(
      { views: 100, conversions: 20 },
      { views: 100, conversions: 10 },
    );

    expect(aWins.pValue).toBeCloseTo(bWins.pValue, 12);
    expect(bWins.recommendation).toBe("B");
    expect(aWins.recommendation).toBe("A");
    expect(bWins.uplift).toBe(100);
    expect(aWins.uplift).toBe(-50);
  });

  it("preserves the current finite contract for non-positive views and conversions beyond views", () => {
    const nonPositiveViews = calculateResults(
      { views: -1, conversions: -1 },
      { views: 10, conversions: 0 },
    );
    const overConverted = calculateResults(
      { views: 1, conversions: 2 },
      { views: 1, conversions: 0 },
    );

    expect(nonPositiveViews).toMatchObject({
      variantA: { rate: 0 },
      variantB: { rate: 0 },
      uplift: 0,
      pValue: 1,
      significant: false,
      recommendation: "inconclusive",
    });
    expect(overConverted).toMatchObject({
      variantA: { rate: 2 },
      variantB: { rate: 0 },
      uplift: -100,
      pValue: 1,
      significant: false,
      recommendation: "inconclusive",
    });
    expect(Number.isFinite(overConverted.uplift)).toBe(true);
    expect(Number.isFinite(overConverted.pValue)).toBe(true);
  });
});
