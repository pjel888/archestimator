import { describe, expect, it } from "vitest";

import { ACTIVITY_FILTER_EVENT_TYPES } from "@/components/workshop/estimate-sheet/activity-history";
import { storedEventTypesForCanonicalEventType } from "@/lib/activity/event-type-normalization";

describe("activity filter vocabulary", () => {
  it("expands every implemented filter value to at least one persisted spelling", () => {
    expect(ACTIVITY_FILTER_EVENT_TYPES.map((filter) => filter.value)).toContain("row_blank_added");

    for (const filter of ACTIVITY_FILTER_EVENT_TYPES) {
      if (!filter.value) continue;
      expect(storedEventTypesForCanonicalEventType(filter.value), filter.label).not.toHaveLength(0);
    }
  });
});
