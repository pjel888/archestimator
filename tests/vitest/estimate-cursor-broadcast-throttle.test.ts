import { describe, expect, it } from "vitest";

import { CURSOR_BROADCAST_MIN_DISTANCE_PX, shouldQueueCursorBroadcast } from "@/hooks/use-estimate-cursor-broadcast";

describe("estimate cursor broadcast pressure guard", () => {
  it("queues the first cursor and target changes", () => {
    const previous = { x: 10, y: 10, rowId: "row-1", columnId: "col-1" };

    expect(shouldQueueCursorBroadcast(null, previous)).toBe(true);
    expect(shouldQueueCursorBroadcast(previous, { ...previous, rowId: "row-2" })).toBe(true);
    expect(shouldQueueCursorBroadcast(previous, { ...previous, columnId: "col-2" })).toBe(true);
    expect(shouldQueueCursorBroadcast({ ...previous, tabId: "tab-a" }, { ...previous, tabId: "tab-b" })).toBe(true);
  });

  it("suppresses tiny same-cell cursor movements", () => {
    const previous = { x: 100, y: 100, rowId: "row-1", columnId: "col-1" };

    expect(shouldQueueCursorBroadcast(previous, { ...previous, x: 103, y: 103 })).toBe(false);
    expect(shouldQueueCursorBroadcast(previous, { ...previous, x: 100 + CURSOR_BROADCAST_MIN_DISTANCE_PX, y: 100 })).toBe(true);
  });
});
