import { describe, expect, it } from "vitest";

import {
  ESTIMATE_ROW_UPDATE_BROADCAST_MAX_AGE_MS,
  isEstimateRowUpdateBroadcastPayload,
  shouldApplyEstimateRowUpdateBroadcast,
  type EstimateRowUpdateBroadcastPayload,
} from "@/hooks/use-estimate-row-update-broadcast";

const nowMs = Date.parse("2026-06-26T12:00:00.000Z");

function payload(overrides: Partial<EstimateRowUpdateBroadcastPayload> = {}): EstimateRowUpdateBroadcastPayload {
  return {
    estimateId: "estimate-1",
    tabId: "tab-1",
    rowId: "row-1",
    rowRevision: 3,
    quantity: 120,
    quantityBase: 100,
    quantityContingencyAmount: 20,
    contingencyPercentage: 20,
    sentAt: new Date(nowMs).toISOString(),
    ...overrides,
  };
}

describe("estimate row update broadcast contract", () => {
  it("accepts current row update payloads scoped to the active estimate and tab", () => {
    expect(isEstimateRowUpdateBroadcastPayload(payload(), { estimateId: "estimate-1", tabId: "tab-1", nowMs })).toBe(true);
  });

  it("rejects stale, future, and wrong-scope payloads", () => {
    expect(isEstimateRowUpdateBroadcastPayload(payload({ estimateId: "other-estimate" }), { estimateId: "estimate-1", nowMs })).toBe(false);
    expect(isEstimateRowUpdateBroadcastPayload(payload({ tabId: "other-tab" }), { estimateId: "estimate-1", tabId: "tab-1", nowMs })).toBe(false);
    expect(isEstimateRowUpdateBroadcastPayload(payload({ sentAt: new Date(nowMs - ESTIMATE_ROW_UPDATE_BROADCAST_MAX_AGE_MS - 1).toISOString() }), { estimateId: "estimate-1", nowMs })).toBe(false);
    expect(isEstimateRowUpdateBroadcastPayload(payload({ sentAt: new Date(nowMs + 1_001).toISOString() }), { estimateId: "estimate-1", nowMs })).toBe(false);
  });

  it("rejects invalid quantity-mode invariants", () => {
    expect(isEstimateRowUpdateBroadcastPayload(payload({ quantityBase: null, quantityContingencyAmount: 20 }), { estimateId: "estimate-1", nowMs })).toBe(false);
    expect(isEstimateRowUpdateBroadcastPayload(payload({ quantityBase: 100, quantityContingencyAmount: null }), { estimateId: "estimate-1", nowMs })).toBe(false);
    expect(isEstimateRowUpdateBroadcastPayload(payload({ rowRevision: -1 }), { estimateId: "estimate-1", nowMs })).toBe(false);
    expect(isEstimateRowUpdateBroadcastPayload(payload({ quantity: Number.NaN }), { estimateId: "estimate-1", nowMs })).toBe(false);
  });

  it("applies only newer payload revisions for the same estimate row", () => {
    const update = payload({ rowRevision: 4 });

    expect(shouldApplyEstimateRowUpdateBroadcast(update, { estimateId: "estimate-1", rowId: "row-1", rowRevision: 3 })).toBe(true);
    expect(shouldApplyEstimateRowUpdateBroadcast(update, { estimateId: "estimate-1", rowId: "row-1", rowRevision: 4 })).toBe(false);
    expect(shouldApplyEstimateRowUpdateBroadcast(update, { estimateId: "estimate-1", rowId: "row-2", rowRevision: 3 })).toBe(false);
  });
});
