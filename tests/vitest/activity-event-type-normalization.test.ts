import { describe, expect, it } from "vitest";

import { composeEstimateActivity } from "@/lib/activity";
import { normalizeEventType, storedEventTypesForCanonicalEventType } from "@/lib/activity/event-type-normalization";
import { makeEstimateEvent } from "./fixtures/activity-events";

const WRITABLE_EVENT_TYPES = [
  "estimate_details_updated",
  "estimate_node_created",
  "estimate_node_deleted",
  "estimate_node_renamed",
  "estimate_nodes_deleted",
  "estimate_nodes_reordered",
  "estimate_nodes_restored",
  "estimate_row_deleted",
  "estimate_row_inserted",
  "estimate_row_updated",
  "estimate_tab_archived",
  "estimate_tab_created",
  "estimate_tab_deleted",
  "estimate_tab_duplicated",
  "estimate_tab_renamed",
  "estimate_tabs_reordered",
  "estimate_template_inserted",
  "project_estimate_package_applied",
  "row_component_moved",
  "row_deleted",
  "row_inserted",
  "row_replaced",
  "row_unlinked",
  "row_updated",
  "rows_deleted",
  "rows_moved",
  "sheet_adjustment_updated",
  "template_inserted",
  "template_node_subtree_inserted",
] as const;

describe("activity event-type normalization", () => {
  it.each([
    ["estimate_node_created", "node_created"],
    ["estimate_nodes_deleted", "node_deleted_with_children"],
    ["estimate_nodes_restored", "nodes_restored"],
    ["estimate_row_inserted", "row_added"],
    ["estimate_row_updated", "row_updated"],
    ["estimate_row_deleted", "row_deleted"],
    ["estimate_tab_created", "tab_created"],
    ["estimate_tabs_reordered", "tabs_reordered"],
    ["estimate_template_inserted", "template_inserted"],
    ["row_inserted", "row_added"],
    ["rows_deleted", "rows_bulk_deleted"],
    ["template_node_subtree_inserted", "template_inserted"],
    ["future_event", "future_event"],
  ])("normalizes %s to %s", (rawType, canonicalType) => {
    expect(normalizeEventType(rawType)).toBe(canonicalType);
  });

  it("uses changed fields to distinguish sheet-code changes from general estimate details", () => {
    expect(normalizeEventType("estimate_details_updated", { changedFields: ["sheetCode"] })).toBe("sheet_code_updated");
    expect(normalizeEventType("estimate_details_updated", { changedFields: ["name"] })).toBe("sheet_metadata_updated");
  });

  it.each(WRITABLE_EVENT_TYPES)("composes writable event %s without the generic fallback", (rawType) => {
    const eventType = normalizeEventType(rawType, { changedFields: rawType === "estimate_details_updated" ? ["name"] : undefined });
    const activity = composeEstimateActivity(makeEstimateEvent(eventType));

    expect(activity.action).not.toBe("recorded");
    expect(activity.title).not.toBe("Philip Lewis recorded estimate activity.");
  });

  it("expands a canonical filter to every persisted spelling", () => {
    expect(storedEventTypesForCanonicalEventType("row_added")).toEqual(
      expect.arrayContaining(["row_added", "row_inserted", "estimate_row_inserted"]),
    );
    expect(storedEventTypesForCanonicalEventType("node_deleted_with_children")).toEqual(
      expect.arrayContaining(["node_deleted_with_children", "estimate_node_deleted", "estimate_nodes_deleted"]),
    );
    expect(storedEventTypesForCanonicalEventType("row_deleted")).toEqual(
      expect.arrayContaining(["row_deleted", "rows_deleted"]),
    );
  });
});
