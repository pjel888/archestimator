import { describe, expect, it } from "vitest";

import {
  OKABE_ITO_SERIES_COLORS,
  OTHER_BUCKET_COLOR,
  OTHER_BUCKET_ID,
  PROJECT_CHART_CVD_PALETTE,
  colorForBucket,
  isCvdSafeBucketColor,
} from "@/lib/project-charts/bucket-color";

describe("colorForBucket (P-1.2 stable CVD-safe color)", () => {
  it("is deterministic for the same bucket id", () => {
    expect(colorForBucket("space:structural")).toBe(colorForBucket("space:structural"));
    expect(colorForBucket("category-1")).toBe(colorForBucket("category-1"));
  });

  it("gives a bucket the SAME color across two series (fixes the cross-column color lie)", () => {
    // The same category id appears in the left and right estimate; the redesign
    // requires it to map to one stable color, not a per-series rank index.
    const leftColor = colorForBucket("space:structural");
    const rightColor = colorForBucket("space:structural");
    expect(leftColor).toBe(rightColor);
  });

  it("returns the neutral grey for the Other collapse bucket", () => {
    expect(colorForBucket(OTHER_BUCKET_ID)).toBe(OTHER_BUCKET_COLOR);
  });

  it("only ever returns colors from the approved CVD-safe palette", () => {
    const ids = ["a", "b", "space:ground-floor", "category-9", "supplier-xyz", "unassigned-space", "uncategorized"];
    for (const id of ids) {
      expect(isCvdSafeBucketColor(colorForBucket(id))).toBe(true);
    }
  });

  it("exposes the Okabe–Ito 8-max palette (7 series hues + Other) with no duplicates", () => {
    expect(OKABE_ITO_SERIES_COLORS).toHaveLength(7);
    expect(new Set(PROJECT_CHART_CVD_PALETTE).size).toBe(8);
    // Okabe–Ito anchors present (CVD-safe set).
    expect(OKABE_ITO_SERIES_COLORS).toContain("#0072B2");
    expect(OKABE_ITO_SERIES_COLORS).toContain("#E69F00");
    expect(OKABE_ITO_SERIES_COLORS).toContain("#009E73");
    expect(OTHER_BUCKET_COLOR).not.toContain("#0072B2");
  });

  it("spreads a small distinct bucket set across the palette (no single-color collapse)", () => {
    const ids = ["space:structural", "space:mep", "space:finishes", "space:sitework"];
    const colors = new Set(ids.map(colorForBucket));
    // We do not guarantee zero hash collisions, but four common space ids must not
    // all collapse to one hue.
    expect(colors.size).toBeGreaterThan(1);
  });
});
