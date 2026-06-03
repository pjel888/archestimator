import { describe, expect, it } from "vitest";

import {
  getBulkActionConfirmationPhrase,
  normalizeBulkActionIds,
  validateTypedConfirmationPhrase,
} from "@/lib/mass-deletion/bulk-action";

const UUID_A = "11111111-1111-4111-8111-111111111111";
const UUID_B = "22222222-2222-4222-8222-222222222222";

describe("mass deletion bulk action validation", () => {
  it("deduplicates UUID ids and preserves first-seen order", () => {
    expect(normalizeBulkActionIds([UUID_A, UUID_A, UUID_B], { label: "estimate sheets", max: 10 })).toEqual({
      ids: [UUID_A, UUID_B],
      issues: [],
    });
  });

  it("rejects empty, malformed, and oversized destructive batches before RPC calls", () => {
    expect(normalizeBulkActionIds([], { label: "projects", max: 2 }).issues).toContainEqual({
      code: "empty_selection",
      message: "Select at least one project.",
    });
    expect(normalizeBulkActionIds([UUID_A, "not-a-uuid"], { label: "projects", max: 2 }).issues).toContainEqual({
      code: "invalid_id",
      id: "not-a-uuid",
      message: "projects contains an invalid id.",
    });
    expect(normalizeBulkActionIds([UUID_A, UUID_B, "33333333-3333-4333-8333-333333333333"], { label: "projects", max: 2 }).issues).toContainEqual({
      code: "batch_limit_exceeded",
      message: "projects is limited to 2 items per action.",
    });
  });

  it("uses exact typed confirmation phrases for single and bulk destructive operations", () => {
    expect(getBulkActionConfirmationPhrase("project", 1)).toBe("DELETE PROJECT");
    expect(getBulkActionConfirmationPhrase("project", 3)).toBe("DELETE 3 PROJECTS");
    expect(getBulkActionConfirmationPhrase("sheet", 1)).toBe("DELETE SHEET");
    expect(getBulkActionConfirmationPhrase("component", 2, "archive")).toBe("ARCHIVE 2 COMPONENTS");
    expect(validateTypedConfirmationPhrase(" DELETE PROJECT ", "DELETE PROJECT")).toBe(true);
    expect(validateTypedConfirmationPhrase("delete project", "DELETE PROJECT")).toBe(false);
  });
});
