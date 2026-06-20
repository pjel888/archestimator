import { describe, expect, it } from "vitest";

import { buildCostConcentration } from "@/lib/project-charts/build-concentration-sentence";
import type { ProjectChartBucket } from "@/lib/project-charts/types";

describe("buildCostConcentration", () => {
  it("returns a zero-state sentence and empty metrics when no cost is recorded", () => {
    const concentration = buildCostConcentration([], 0, "PHP", "category");

    expect(concentration).toMatchObject({
      sentence: "No cost recorded for this sheet yet.",
      topShare: 0,
      topTwoShare: 0,
      groupsCarrying80: 0,
      lineCount: 0,
      topLabel: null,
    });
  });

  it("treats a single real bucket as the whole sheet", () => {
    const concentration = buildCostConcentration([bucket("materials", "Materials", 1800, 1800, 3)], 1800, "PHP", "category");

    expect(concentration.sentence).toBe("Materials is the whole sheet — ₱1,800 (100%).");
    expect(concentration.topShare).toBe(1);
    expect(concentration.topTwoShare).toBe(1);
    expect(concentration.groupsCarrying80).toBe(1);
    expect(concentration.lineCount).toBe(3);
    expect(concentration.topLabel).toBe("Materials");
  });

  it("leads with a dominant bucket when one group carries at least half the sheet", () => {
    const concentration = buildCostConcentration(
      [
        bucket("materials", "Materials", 1200, 1800, 2),
        bucket("labor", "Labor", 400, 1800, 1),
        bucket("permits", "Permits", 200, 1800, 1),
      ],
      1800,
      "PHP",
      "category",
    );

    expect(concentration.sentence).toBe(
      "Materials dominates this sheet — ₱1,200 (66.7%) of ₱1,800, well ahead of Labor (22.2%).",
    );
    expect(concentration.topShare).toBeCloseTo(2 / 3);
    expect(concentration.topTwoShare).toBeCloseTo(8 / 9);
    expect(concentration.groupsCarrying80).toBe(2);
    expect(concentration.lineCount).toBe(4);
  });

  it("summarizes the top two drivers for balanced sheets", () => {
    const concentration = buildCostConcentration(
      [
        bucket("level-1", "Level 1", 700, 1800, 2),
        bucket("level-2", "Level 2", 650, 1800, 2),
        bucket("roof", "Roof", 450, 1800, 1),
      ],
      1800,
      "PHP",
      "space",
    );

    expect(concentration.sentence).toBe(
      "Level 1 leads this sheet at ₱700 (38.9% of ₱1,800); with Level 2 (36.1%), the top two areas carry 75%.",
    );
    expect(concentration.topShare).toBeCloseTo(700 / 1800);
    expect(concentration.topTwoShare).toBeCloseTo(1350 / 1800);
    expect(concentration.groupsCarrying80).toBe(3);
    expect(concentration.lineCount).toBe(5);
  });
});

function bucket(
  id: string,
  label: string,
  total: number,
  baseTotal: number,
  rowCount: number,
): ProjectChartBucket {
  return {
    id,
    label,
    total,
    share: baseTotal > 0 ? total / baseTotal : 0,
    rowCount,
    color: "#38586F",
    sourceNodeId: null,
  };
}
