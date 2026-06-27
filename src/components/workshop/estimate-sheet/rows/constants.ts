import type { DragEvent } from "react";

import type { EstimateRowItem } from "../../estimate-tree-data";

// Shared empty-rows identity: branches render a row table per node, and a
// fresh [] per render would defeat the table's memo comparator.
export const EMPTY_ESTIMATE_ROW_ITEMS: EstimateRowItem[] = [];
export const LIBRARY_ITEM_DRAG_MIME_TYPE = "application/x-archestimator-library-item";
export const ESTIMATE_COMPONENT_DRAG_MIME_TYPE = "application/x-archestimator-estimate-component";
export const ESTIMATE_ROW_ITEM_DRAG_MIME_TYPE = "application/x-archestimator-estimate-row-item";
export const ADD_LIBRARY_ITEM_EVENT = "archestimator:add-library-item";

export type EstimateLibraryItemPayloadRejectReason =
  | "empty_payload"
  | "malformed_json"
  | "not_object"
  | "missing_required_field"
  | "invalid_source"
  | "invalid_number_field";

export type EstimateLibraryItemPayloadResult =
  | { ok: true; item: EstimateRowItem }
  | { ok: false; reason: EstimateLibraryItemPayloadRejectReason; field?: string };

export type AddLibraryItemEventDetail = {
  libraryItem: unknown;
  onAccepted?: (accepted: boolean) => void;
};

export type EstimateComponentDragPayload = {
  rowItemId: string;
  item: EstimateRowItem;
};

export type EstimateRowItemDragPayload = {
  rowItemId: string;
  sourceNodeId: string;
  label?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isEstimateRowItemSource(value: unknown): value is EstimateRowItem["source"] {
  return value === "project" || value === "supplier" || value === "library";
}

function hasStringField(record: Record<string, unknown>, field: keyof EstimateRowItem) {
  return typeof record[field] === "string" && String(record[field]).length > 0;
}

function hasFiniteNumberField(record: Record<string, unknown>, field: keyof EstimateRowItem) {
  return typeof record[field] === "number" && Number.isFinite(record[field]);
}

export function readEstimateLibraryItemPayload(value: unknown): EstimateLibraryItemPayloadResult {
  if (!value) return { ok: false, reason: "empty_payload" };
  if (!isRecord(value)) return { ok: false, reason: "not_object" };

  for (const field of ["id", "material", "description", "supplier", "unit", "category", "pricingSource", "pricingDate"] as const) {
    if (!hasStringField(value, field)) return { ok: false, reason: "missing_required_field", field };
  }

  if (!isEstimateRowItemSource(value.source)) return { ok: false, reason: "invalid_source", field: "source" };

  for (const field of ["itemCost", "quantity", "subTotal", "miscCost", "totalItemCosts"] as const) {
    if (!hasFiniteNumberField(value, field)) return { ok: false, reason: "invalid_number_field", field };
  }

  if (value.contingencyPercentage !== undefined && !hasFiniteNumberField(value, "contingencyPercentage")) {
    return { ok: false, reason: "invalid_number_field", field: "contingencyPercentage" };
  }
  if (value.contingencyValue !== undefined && !hasFiniteNumberField(value, "contingencyValue")) {
    return { ok: false, reason: "invalid_number_field", field: "contingencyValue" };
  }

  return { ok: true, item: value as EstimateRowItem };
}

export function readEstimateLibraryItemDragPayload(rawPayload: string): EstimateLibraryItemPayloadResult {
  if (!rawPayload) return { ok: false, reason: "empty_payload" };
  try {
    return readEstimateLibraryItemPayload(JSON.parse(rawPayload));
  } catch {
    return { ok: false, reason: "malformed_json" };
  }
}

export function readAddLibraryItemEventDetail(detail: unknown): EstimateLibraryItemPayloadResult & {
  onAccepted?: (accepted: boolean) => void;
} {
  if (isRecord(detail) && "libraryItem" in detail) {
    const result = readEstimateLibraryItemPayload(detail.libraryItem);
    return {
      ...result,
      onAccepted: typeof detail.onAccepted === "function" ? detail.onAccepted as (accepted: boolean) => void : undefined,
    };
  }
  return readEstimateLibraryItemPayload(detail);
}

export function dispatchAddLibraryItemEvent(libraryItem: EstimateRowItem) {
  let accepted = false;
  const event = new CustomEvent<AddLibraryItemEventDetail>(ADD_LIBRARY_ITEM_EVENT, {
    cancelable: true,
    detail: {
      libraryItem,
      onAccepted: (nextAccepted) => {
        accepted = nextAccepted;
      },
    },
  });
  const notCancelled = window.dispatchEvent(event);
  return accepted && notCancelled;
}

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

export function readEstimateRowItemDragPayload(rawPayload: string): EstimateRowItemDragPayload | null {
  if (!rawPayload) return null;

  try {
    const parsed = JSON.parse(rawPayload);
    if (!isRecord(parsed)) return null;
    if (typeof parsed.rowItemId !== "string" || parsed.rowItemId.length === 0) return null;
    if (typeof parsed.sourceNodeId !== "string" || parsed.sourceNodeId.length === 0) return null;
    return {
      rowItemId: parsed.rowItemId,
      sourceNodeId: parsed.sourceNodeId,
      label: typeof parsed.label === "string" ? parsed.label : undefined,
    };
  } catch {
    return null;
  }
}
