import type { KeyboardEvent } from "react";
import type { Header, Table } from "@tanstack/react-table";

import { cn } from "@/lib/ui/cn";

import type { ProjectEstimateTableRow } from "./types";

export function ProjectEstimatesColumnResizeHandle({
  header,
  table,
}: {
  header: Header<ProjectEstimateTableRow, unknown>;
  table: Table<ProjectEstimateTableRow>;
}) {
  if (!header.column.getCanResize()) return null;

  function resizeBy(delta: number) {
    const minSize = header.column.columnDef.minSize ?? 48;
    const maxSize = header.column.columnDef.maxSize ?? 640;
    const nextSize = Math.min(Math.max(header.column.getSize() + delta, minSize), maxSize);
    table.setColumnSizing((current) => ({ ...current, [header.column.id]: nextSize }));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLSpanElement>) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      resizeBy(-16);
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      resizeBy(16);
    }
    if (event.key === "Home") {
      event.preventDefault();
      header.column.resetSize();
    }
  }

  return (
    // react-doctor-disable-next-line react-doctor/prefer-tag-over-role -- This is a keyboard-resizable splitter, not a static horizontal rule.
    <span
      role="separator"
      tabIndex={0}
      aria-label={`Resize ${String(header.column.columnDef.header ?? "column")}`}
      aria-orientation="vertical"
      className={cn(
        "absolute right-0 top-0 h-full w-2 translate-x-1/2 cursor-col-resize touch-none select-none",
        "after:absolute after:right-1 after:top-1 after:h-[calc(100%-8px)] after:w-px after:bg-hairline after:content-['']",
        "hover:after:bg-accent focus:outline-none focus:after:w-0.5 focus:after:bg-accent",
        header.column.getIsResizing() && "after:w-0.5 after:bg-accent",
      )}
      onDoubleClick={() => header.column.resetSize()}
      onKeyDown={handleKeyDown}
      onMouseDown={header.getResizeHandler()}
      onTouchStart={header.getResizeHandler()}
      title="Drag to resize. Double-click or press Home to reset. Use Left/Right arrow keys for keyboard resizing."
    />
  );
}

ProjectEstimatesColumnResizeHandle.displayName = "ProjectEstimatesColumnResizeHandle";
