import { describe, expect, it } from "vitest";

import {
  inventoryRows,
  p0InventoryRows,
  p0StoryRows,
  p1InventoryRows,
  p1StoryRows,
  storyCoverageRows,
} from "@/stories/lib/storybook-plan-matrix";

describe("Storybook plan matrix", () => {
  it("parses the archived current-status inventory into P0/P1 story summaries", () => {
    expect(inventoryRows.length).toBeGreaterThanOrEqual(60);
    expect(storyCoverageRows.length).toBe(inventoryRows.length);
    expect(p0InventoryRows.length).toBeGreaterThan(0);
    expect(p1InventoryRows.length).toBeGreaterThan(0);
    expect(p0StoryRows.length).toBeGreaterThan(0);
    expect(p1StoryRows.length).toBeGreaterThan(0);
  });

  it("keeps Storybook rows tied to the no-migration review labels", () => {
    expect(p0StoryRows.every((row) => row.ownerReviewLabel === "P0_FIRST_REVIEW")).toBe(true);
    expect(p1StoryRows.every((row) => row.ownerReviewLabel === "P1_PRE_MIGRATION")).toBe(true);
    expect(storyCoverageRows.every((row) => row.titlePath.length > 0)).toBe(true);
  });
});
