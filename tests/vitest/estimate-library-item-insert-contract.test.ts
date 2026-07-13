import { describe, expect, it, vi } from "vitest";

import {
  ADD_LIBRARY_ITEM_EVENT,
  dispatchAddLibraryItemEvent,
  readAddLibraryItemEventDetail,
  readEstimateLibraryItemDragPayload,
  readEstimateLibraryItemPayload,
} from "@/components/workshop/estimate-sheet/rows/constants";
import {
  readInsertEstimateTemplateEventDetail,
  readInsertProjectSourceEventDetail,
} from "@/components/workshop/component-library/templates";
import { estimateLibraryItems } from "@/components/workshop/estimate-tree-data";

describe("estimate library item insert contract", () => {
  it("accepts canonical row-item payloads and rejects malformed library drag JSON", () => {
    expect(readEstimateLibraryItemPayload(estimateLibraryItems[0])).toEqual({
      ok: true,
      item: estimateLibraryItems[0],
    });
    expect(readEstimateLibraryItemDragPayload("{")).toEqual({ ok: false, reason: "malformed_json" });
    expect(readEstimateLibraryItemDragPayload(JSON.stringify({ id: "missing-fields" }))).toMatchObject({
      ok: false,
      reason: "missing_required_field",
    });
    expect(readEstimateLibraryItemDragPayload(JSON.stringify({ ...estimateLibraryItems[0], itemCost: Number.NaN }))).toEqual({
      ok: false,
      reason: "invalid_number_field",
      field: "itemCost",
    });
  });

  it("accepts Project-tab component payloads with empty descriptions", () => {
    const projectComponentItem = {
      ...estimateLibraryItems[0],
      source: "project" as const,
      description: "",
      metadata: {
        projectComponentProjection: {
          projectId: "project-1",
          projectName: "Modern Bungalow",
          estimateId: "estimate-1",
          estimateName: "Main Estimate",
          nodeId: "kitchen",
          nodeName: "Kitchen",
          classification: "express",
        },
      },
    };

    expect(readEstimateLibraryItemDragPayload(JSON.stringify(projectComponentItem))).toEqual({
      ok: true,
      item: projectComponentItem,
    });
  });

  it("accepts reviewable library payloads with missing source metadata", () => {
    const reviewableItem = {
      ...estimateLibraryItems[0],
      supplier: "",
      pricingSource: "",
      pricingDate: "",
    };

    expect(readEstimateLibraryItemDragPayload(JSON.stringify(reviewableItem))).toEqual({
      ok: true,
      item: reviewableItem,
    });
  });

  it("supports acknowledged custom events while preserving the legacy raw-item detail", () => {
    const accepted = vi.fn();
    expect(readAddLibraryItemEventDetail({ libraryItem: estimateLibraryItems[0], onAccepted: accepted })).toMatchObject({
      ok: true,
      item: estimateLibraryItems[0],
      onAccepted: accepted,
    });
    expect(readAddLibraryItemEventDetail(estimateLibraryItems[0])).toEqual({
      ok: true,
      item: estimateLibraryItems[0],
    });
    expect(readAddLibraryItemEventDetail({ libraryItem: { id: "bad" } })).toMatchObject({
      ok: false,
      reason: "missing_required_field",
    });
  });

  it("returns false when no center consumer acknowledges a sidebar insert event", () => {
    expect(dispatchAddLibraryItemEvent(estimateLibraryItems[0])).toBe(false);
  });

  it("shares guarded validators for template and project-source insert events", () => {
    expect(readInsertEstimateTemplateEventDetail({
      targetParentNodeId: "area-1",
      templateIds: ["template-1", "", 3],
    })).toEqual({
      targetParentNodeId: "area-1",
      templateIds: ["template-1"],
    });
    expect(readInsertEstimateTemplateEventDetail({ targetParentNodeId: "area-1", templateIds: [] })).toBeNull();
    expect(readInsertProjectSourceEventDetail({
      targetParentNodeId: "area-1",
      source: {
        projectId: "project-1",
        estimateId: "estimate-1",
        tabId: "tab-1",
        nodeId: "node-1",
      },
    })).toEqual({
      targetParentNodeId: "area-1",
      source: {
        projectId: "project-1",
        estimateId: "estimate-1",
        tabId: "tab-1",
        nodeId: "node-1",
      },
    });
    expect(readInsertProjectSourceEventDetail({
      targetParentNodeId: "area-1",
      source: { projectId: "project-1", estimateId: "estimate-1", tabId: "tab-1", nodeId: 42 },
    })).toBeNull();
  });

  it("exports the shared add-library-item event name", () => {
    expect(ADD_LIBRARY_ITEM_EVENT).toBe("archestimator:add-library-item");
  });
});
