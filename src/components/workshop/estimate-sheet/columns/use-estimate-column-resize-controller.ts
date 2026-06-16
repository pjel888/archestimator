"use client";

import { useCallback, useEffect, useRef, type KeyboardEvent, type PointerEvent, type RefObject } from "react";

import {
  DEFAULT_ESTIMATE_COLUMN_WIDTHS,
  clampEstimateColumnWidth,
  estimateColumnCssVar,
  normalizeEstimateColumnWidths,
  resolveEstimateColumnWidth,
  type EstimateColumnWidths,
  type ResizableEstimateColumnId,
} from "@/lib/estimate-sheet/column-model";

type ResizeControllerArgs = {
  surfaceRef: RefObject<HTMLElement | null>;
  widths: EstimateColumnWidths;
  onCommitWidths: (widths: EstimateColumnWidths) => void;
  pointerResizeEdge?: "left" | "right";
};

type ActiveDrag = {
  columnId: ResizableEstimateColumnId;
  startX: number;
  startWidth: number;
  committedWidths: EstimateColumnWidths;
  latestWidth: number;
  cleanup: () => void;
};

function setSurfaceColumnWidth(surface: HTMLElement | null, columnId: ResizableEstimateColumnId, width: number) {
  surface?.style.setProperty(estimateColumnCssVar(columnId), `${width}px`);
}

export function useEstimateColumnResizeController({ surfaceRef, widths, onCommitWidths, pointerResizeEdge = "right" }: ResizeControllerArgs) {
  const widthsRef = useRef(widths);
  const dragRef = useRef<ActiveDrag | null>(null);

  useEffect(() => {
    widthsRef.current = widths;
  }, [widths]);

  const commitWidth = useCallback(
    (columnId: ResizableEstimateColumnId, width: number, baseWidths = widthsRef.current) => {
      const nextWidths = normalizeEstimateColumnWidths({
        ...baseWidths,
        [columnId]: clampEstimateColumnWidth(columnId, width),
      });
      onCommitWidths(nextWidths);
      return nextWidths;
    },
    [onCommitWidths],
  );

  const cleanupDrag = useCallback(() => {
    const drag = dragRef.current;
    if (!drag) return;
    drag.cleanup();
    dragRef.current = null;
  }, []);

  useEffect(() => cleanupDrag, [cleanupDrag]);

  const handlePointerDown = useCallback(
    (columnId: ResizableEstimateColumnId, event: PointerEvent<HTMLElement>) => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      cleanupDrag();
      const startWidth = resolveEstimateColumnWidth(widthsRef.current, columnId);
      const previousCursor = document.body.style.cursor;
      const previousUserSelect = document.body.style.userSelect;
      const activeDrag: ActiveDrag = {
        columnId,
        startX: event.clientX,
        startWidth,
        committedWidths: widthsRef.current,
        latestWidth: startWidth,
        cleanup: () => undefined,
      };
      const handleWindowPointerMove = (moveEvent: globalThis.PointerEvent) => {
        const dragDistance = moveEvent.clientX - activeDrag.startX;
        activeDrag.latestWidth = clampEstimateColumnWidth(
          activeDrag.columnId,
          activeDrag.startWidth + (pointerResizeEdge === "left" ? -dragDistance : dragDistance),
        );
        setSurfaceColumnWidth(surfaceRef.current, activeDrag.columnId, activeDrag.latestWidth);
      };
      const handleWindowPointerUp = () => {
        commitWidth(activeDrag.columnId, activeDrag.latestWidth, activeDrag.committedWidths);
        cleanupDrag();
      };
      const handleWindowPointerCancel = () => {
        setSurfaceColumnWidth(surfaceRef.current, activeDrag.columnId, activeDrag.startWidth);
        cleanupDrag();
      };
      activeDrag.cleanup = () => {
        document.body.style.cursor = previousCursor;
        document.body.style.userSelect = previousUserSelect;
        window.removeEventListener("pointermove", handleWindowPointerMove);
        window.removeEventListener("pointerup", handleWindowPointerUp);
        window.removeEventListener("pointercancel", handleWindowPointerCancel);
      };
      dragRef.current = activeDrag;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      window.addEventListener("pointermove", handleWindowPointerMove);
      window.addEventListener("pointerup", handleWindowPointerUp);
      window.addEventListener("pointercancel", handleWindowPointerCancel);
    },
    [cleanupDrag, commitWidth, pointerResizeEdge, surfaceRef],
  );

  const handleKeyDown = useCallback(
    (columnId: ResizableEstimateColumnId, event: KeyboardEvent<HTMLElement>) => {
      const currentWidth = resolveEstimateColumnWidth(widthsRef.current, columnId);
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        event.stopPropagation();
        const delta = (event.shiftKey ? 48 : 16) * (event.key === "ArrowLeft" ? -1 : 1);
        const nextWidth = clampEstimateColumnWidth(columnId, currentWidth + delta);
        setSurfaceColumnWidth(surfaceRef.current, columnId, nextWidth);
        widthsRef.current = commitWidth(columnId, nextWidth);
        return;
      }
      if (event.key === "Home") {
        event.preventDefault();
        event.stopPropagation();
        setSurfaceColumnWidth(surfaceRef.current, columnId, DEFAULT_ESTIMATE_COLUMN_WIDTHS[columnId]);
        widthsRef.current = commitWidth(columnId, DEFAULT_ESTIMATE_COLUMN_WIDTHS[columnId]);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        setSurfaceColumnWidth(surfaceRef.current, columnId, currentWidth);
      }
    },
    [commitWidth, surfaceRef],
  );

  const handleDoubleClick = useCallback(
    (columnId: ResizableEstimateColumnId) => {
      setSurfaceColumnWidth(surfaceRef.current, columnId, DEFAULT_ESTIMATE_COLUMN_WIDTHS[columnId]);
      widthsRef.current = commitWidth(columnId, DEFAULT_ESTIMATE_COLUMN_WIDTHS[columnId]);
    },
    [commitWidth, surfaceRef],
  );

  return {
    getWidth: (columnId: ResizableEstimateColumnId) => resolveEstimateColumnWidth(widths, columnId),
    onPointerDown: handlePointerDown,
    onKeyDown: handleKeyDown,
    onDoubleClick: handleDoubleClick,
  };
}
