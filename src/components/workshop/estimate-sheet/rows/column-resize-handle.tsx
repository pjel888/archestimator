import {
  getResizableEstimateColumnDefinition,
  type ResizableEstimateColumnId,
} from "@/lib/estimate-sheet/column-model";
import { cn } from "@/lib/ui/cn";
import type { useEstimateColumnResizeController } from "../columns/use-estimate-column-resize-controller";

type EstimateColumnResizeController = ReturnType<typeof useEstimateColumnResizeController>;

type EstimateRowColumnResizeHandleProps = {
  columnId: ResizableEstimateColumnId;
  resizeController: EstimateColumnResizeController;
};

export function EstimateRowColumnResizeHandle({
  columnId,
  resizeController,
}: EstimateRowColumnResizeHandleProps) {
  const definition = getResizableEstimateColumnDefinition(columnId);
  const width = resizeController.getWidth(columnId);

  return (
    // react-doctor-disable-next-line react-doctor/prefer-tag-over-role -- This is a keyboard-resizable splitter, not a static horizontal rule.
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
        "absolute inset-y-0 -left-3 z-10 flex w-6 cursor-col-resize touch-none items-center justify-center rounded-xs bg-transparent outline-none",
        "hover:bg-accent/5 focus-visible:bg-accent/10 focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-accent/40 active:bg-accent/10",
      )}
      onPointerDown={(event) => resizeController.onPointerDown(columnId, event)}
      onKeyDown={(event) => resizeController.onKeyDown(columnId, event)}
      onDoubleClick={() => resizeController.onDoubleClick(columnId)}
    />
  );
}
