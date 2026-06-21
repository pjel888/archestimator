"use client";

import type { RefObject } from "react";
import { ArrowCounterClockwise } from "@phosphor-icons/react/dist/ssr";

import {
  DEFAULT_ESTIMATE_COLUMN_WIDTHS,
  ESTIMATE_COLUMN_DEFINITIONS,
  ESTIMATE_COLUMN_TEMPLATE,
  estimateColumnCssVar,
  getResizableEstimateColumnDefinition,
  isResizableEstimateColumnId,
  type EstimateColumnWidths,
  type ResizableEstimateColumnId,
} from "@/lib/estimate-sheet/column-model";
import { cn } from "@/lib/ui/cn";
import { useEstimateColumnResizeController } from "./use-estimate-column-resize-controller";

type EstimateColumnRulerProps = {
  surfaceRef: RefObject<HTMLElement | null>;
  widths: EstimateColumnWidths;
  onCommitWidths: (widths: EstimateColumnWidths) => void;
  onResetWidths: () => void;
};

export function EstimateColumnRuler({ surfaceRef, widths, onCommitWidths, onResetWidths }: EstimateColumnRulerProps) {
  const resizeController = useEstimateColumnResizeController({
    surfaceRef,
    widths,
    onCommitWidths,
  });

  function resetAllWidths() {
    const surface = surfaceRef.current;
    if (surface) {
      for (const columnId of Object.keys(DEFAULT_ESTIMATE_COLUMN_WIDTHS) as ResizableEstimateColumnId[]) {
        surface.style.setProperty(estimateColumnCssVar(columnId), `${DEFAULT_ESTIMATE_COLUMN_WIDTHS[columnId]}px`);
      }
    }
    onResetWidths();
  }

  function renderHandle(columnId: ResizableEstimateColumnId) {
    const definition = getResizableEstimateColumnDefinition(columnId);
    const width = resizeController.getWidth(columnId);
    return (
      <span
        role="separator"
        tabIndex={0}
        aria-label={`Resize ${definition.label} column`}
        aria-orientation="vertical"
        aria-valuemin={definition.minWidth}
        aria-valuemax={definition.maxWidth}
        aria-valuenow={width}
        title={`Resize ${definition.label}`}
        draggable={false}
        data-estimate-column-resize-handle={columnId}
        className={cn(
          "absolute inset-y-0 -right-2 z-10 flex w-6 cursor-col-resize touch-none items-center justify-center rounded-xs outline-none",
          "after:h-5 after:w-px after:bg-hairline after:content-['']",
          "hover:after:bg-secondary focus-visible:bg-accent/10 focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-accent/40 focus-visible:after:bg-accent active:after:bg-accent",
        )}
        onPointerDown={(event) => resizeController.onPointerDown(columnId, event)}
        onKeyDown={(event) => resizeController.onKeyDown(columnId, event)}
        onDoubleClick={() => resizeController.onDoubleClick(columnId)}
      />
    );
  }

  return (
    <div
      role="row"
      aria-label="Estimate column ruler"
      className="sticky top-0 z-20 grid min-h-8 border-x border-t border-hairline bg-white text-[10px] font-medium text-ink"
      style={{ gridTemplateColumns: ESTIMATE_COLUMN_TEMPLATE }}
      data-estimate-column-ruler
    >
      {ESTIMATE_COLUMN_DEFINITIONS.map((column) => (
        <div
          key={column.id}
          role="columnheader"
          className={cn(
            "relative flex min-w-0 items-center justify-center border-b border-r border-hairline px-1",
            column.id === "actions" && "border-r-0",
            !column.resizable && "text-tertiary",
          )}
        >
          {column.id === "actions" ? (
            <button
              type="button"
              className="flex size-6 items-center justify-center rounded-xs text-[9px] font-medium text-tertiary outline-none hover:bg-surface-muted hover:text-secondary focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-accent/40"
              aria-label="Reset column widths"
              title="Reset column widths"
              onClick={resetAllWidths}
            >
              <ArrowCounterClockwise size={12} weight="regular" aria-hidden="true" />
            </button>
          ) : (
            <span className="truncate">{column.label}</span>
          )}
          {isResizableEstimateColumnId(column.id) ? renderHandle(column.id) : null}
        </div>
      ))}
    </div>
  );
}
