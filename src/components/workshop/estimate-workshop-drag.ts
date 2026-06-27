"use client";

import { create } from "zustand";

/**
 * Cross-panel drag visibility for the estimate workspace.
 *
 * HTML5 drag payloads are unreadable until drop, and dragenter sniffing is
 * unreliable across nested surfaces, so the panels that originate drags
 * (component library, templates tree) publish the drag here on dragstart.
 * The estimate sheet and the left tree read it to reveal their drop zones
 * only while a compatible drag is in flight.
 */
export type EstimateWorkshopDrag =
  | { kind: "library-item" }
  | {
      kind: "estimate-template";
      /** Drop-zone label: a template name, or e.g. "Residential Rooms templates" for a category drag. */
      templateName: string;
      /** Set for single-template drags; category drags carry their ids in the dataTransfer payload. */
      templateId?: string;
    }
  | {
      kind: "project-source";
      sourceName: string;
    }
  | {
      kind: "estimate-row-item";
      rowItemId: string;
      rowLabel: string;
      sourceNodeId: string;
    };

type EstimateWorkshopDragState = {
  activeDrag: EstimateWorkshopDrag | null;
};

export const useEstimateWorkshopDragState = create<EstimateWorkshopDragState>(() => ({
  activeDrag: null,
}));

/** The drag currently in flight, or null. Subscribes the component. */
export function useEstimateWorkshopDrag(): EstimateWorkshopDrag | null {
  return useEstimateWorkshopDragState((state) => state.activeDrag);
}

export function endEstimateWorkshopDrag() {
  if (useEstimateWorkshopDragState.getState().activeDrag === null) return;
  useEstimateWorkshopDragState.setState({ activeDrag: null });
}

/**
 * Publish a drag for its full lifetime. Window-level listeners clear the
 * state on drop/dragend (dragend fires at the source even for cancelled
 * drags), so callers only need the dragstart side.
 */
export function beginEstimateWorkshopDrag(drag: EstimateWorkshopDrag) {
  useEstimateWorkshopDragState.setState({ activeDrag: drag });
  if (typeof window === "undefined") return;
  const handleDragFinished = () => {
    window.removeEventListener("dragend", handleDragFinished);
    window.removeEventListener("drop", handleDragFinished);
    window.removeEventListener("keydown", handleKeyDown);
    endEstimateWorkshopDrag();
  };
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") handleDragFinished();
  };
  window.addEventListener("dragend", handleDragFinished);
  window.addEventListener("drop", handleDragFinished);
  window.addEventListener("keydown", handleKeyDown);
}
