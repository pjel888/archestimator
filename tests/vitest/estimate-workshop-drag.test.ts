import { afterEach, describe, expect, it } from "vitest";

import {
  beginEstimateWorkshopDrag,
  endEstimateWorkshopDrag,
  useEstimateWorkshopDragState,
} from "@/components/workshop/estimate-workshop-drag";

describe("estimate workshop drag state", () => {
  afterEach(() => {
    endEstimateWorkshopDrag();
  });

  it("clears an active row drag when Escape cancels the drag", () => {
    beginEstimateWorkshopDrag({
      kind: "estimate-row-item",
      rowItemId: "row-1",
      rowLabel: "Kitchen Sink",
      sourceNodeId: "node-1",
    });

    expect(useEstimateWorkshopDragState.getState().activeDrag).toMatchObject({
      kind: "estimate-row-item",
      rowItemId: "row-1",
    });

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

    expect(useEstimateWorkshopDragState.getState().activeDrag).toBeNull();
  });
});
