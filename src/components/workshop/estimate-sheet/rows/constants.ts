import type { DragEvent } from "react";

import type { EstimateRowItem } from "../../estimate-tree-data";

// Shared empty-rows identity: branches render a row table per node, and a
// fresh [] per render would defeat the table's memo comparator.
export const EMPTY_ESTIMATE_ROW_ITEMS: EstimateRowItem[] = [];
export const LIBRARY_ITEM_DRAG_MIME_TYPE = "application/x-archestimator-library-item";
export const ESTIMATE_COMPONENT_DRAG_MIME_TYPE = "application/x-archestimator-estimate-component";

export type EstimateComponentDragPayload = {
  rowItemId: string;
  item: EstimateRowItem;
};

export function readEstimateComponentDragPayload(event: DragEvent<HTMLElement>): EstimateComponentDragPayload | null {
  const payload = event.dataTransfer.getData(ESTIMATE_COMPONENT_DRAG_MIME_TYPE);
  if (!payload) return null;

  try {
    const parsed = JSON.parse(payload) as Partial<EstimateComponentDragPayload>;
    if (typeof parsed.rowItemId !== "string" || !parsed.item) return null;
    return parsed as EstimateComponentDragPayload;
  } catch {
    return null;
  }
}
