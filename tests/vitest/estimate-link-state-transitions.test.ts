import { describe, expect, it } from "vitest";

import { classifyEstimateRowSource } from "@/lib/estimates/express-components";

const baseRow = {
  material: "Custom vanity",
  description: "Manual estimate row",
  supplier: "Local fabricator",
  unit: "lot",
  quantity: 1,
  unitCost: 100,
  miscCost: 0,
  sourceLibraryItemId: null,
  sourceSnapshot: null,
  metadata: {},
};

describe("estimate row link-state transitions", () => {
  it.each(["linked-clean", "linked-overridden", "source-changed"] as const)(
    "keeps %s rows in the linked-library source bucket",
    (linkState) => {
      expect(classifyEstimateRowSource({ ...baseRow, linkState })).toBe("linked-library");
    },
  );

  it("keeps an explicit detach distinct from a linked source snapshot", () => {
    expect(classifyEstimateRowSource({
      ...baseRow,
      sourceLibraryItemId: "library-item-1",
      sourceSnapshot: { sourceLibraryItemId: "library-item-1" },
      linkState: "detached",
    })).toBe("detached-library");
  });

  it("treats a linked library identity as linked even when the legacy state is absent", () => {
    expect(classifyEstimateRowSource({
      ...baseRow,
      sourceLibraryItemId: "library-item-1",
      linkState: undefined,
    })).toBe("linked-library");
  });
});
