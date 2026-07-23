"use client";

import { useState } from "react";
import { Plus } from "@phosphor-icons/react/dist/ssr";

import { cn } from "@/lib/ui/cn";
import {
  ESTIMATE_TEMPLATE_DRAG_MIME_TYPE,
  readEstimateTemplateDragPayload,
  type EstimateTemplateDragPayload,
} from "../../component-library/templates";
import { endEstimateWorkshopDrag, useEstimateWorkshopDrag } from "../../estimate-workshop-drag";
import type { EstimateRowItem } from "../../estimate-tree-data";
import {
  ESTIMATE_ROW_ITEM_DRAG_MIME_TYPE,
  LIBRARY_ITEM_DRAG_MIME_TYPE,
  readEstimateLibraryItemDragPayload,
  readEstimateRowItemDragPayload,
} from "./constants";

const DROP_SLOT_SURFACE_CLASS =
  "flex h-16 w-full items-center justify-center gap-1.5 border border-dashed border-hairline bg-surfaceMuted/30 text-tertiary transition-opacity";
const DROP_SLOT_CONTENT_CLASS = "flex items-center gap-1.5 text-[10px] font-normal";

/**
 * Dashed drop surface, rendered only while a compatible drag is in flight
 * (drag suppresses CSS hover, so the highlight is driven by `isDragOver`).
 */
export function EstimateDropZone({ label, isDragOver = false }: { label: string; isDragOver?: boolean }) {
  return (
    <div
      className={cn(
        DROP_SLOT_SURFACE_CLASS,
        isDragOver ? "border-brand-orange bg-brand-orange/10 opacity-100 shadow-inner" : "opacity-60",
      )}
    >
      <div className={DROP_SLOT_CONTENT_CLASS}>
        <Plus size={16} weight="regular" aria-hidden="true" />
        <span>{label}</span>
      </div>
    </div>
  );
}

function QuietAddRowButton({ nodeId, nodeName, onAddBlankRow }: {
  nodeId: string;
  nodeName: string;
  onAddBlankRow: (targetNodeId: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onAddBlankRow(nodeId)}
      aria-label={`Add blank estimate row to ${nodeName}`}
      title={`Add row to ${nodeName}`}
      className={cn(
        DROP_SLOT_SURFACE_CLASS,
        "cursor-pointer opacity-60 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
      )}
    >
      <span className={DROP_SLOT_CONTENT_CLASS}>
        <Plus className="shrink-0" size={16} weight="regular" aria-hidden="true" />
        <span className="min-w-0 truncate">Add row to {nodeName}</span>
      </span>
    </button>
  );
}

function ActiveComponentDropZone({
  nodeId,
  nodeName,
  onInsertLibraryItem,
  onMoveRowItem,
  rowDropIndex,
  rowItemDragActive,
}: {
  nodeId: string;
  nodeName: string;
  onInsertLibraryItem: (targetNodeId: string, libraryItem: EstimateRowItem) => void;
  onMoveRowItem?: (rowItemId: string, targetNodeId: string, targetIndex: number) => void;
  rowDropIndex: number;
  rowItemDragActive: boolean;
}) {
  const [dragCount, setDragCount] = useState(0);
  const isDragOver = dragCount > 0;

  return (
    <div
      className="py-1"
      data-estimate-component-drop-zone={nodeId}
      onDragEnter={() => setDragCount((c) => c + 1)}
      onDragLeave={() => setDragCount((c) => Math.max(0, c - 1))}
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes(ESTIMATE_ROW_ITEM_DRAG_MIME_TYPE)) {
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
          return;
        }
        if (event.dataTransfer.types.includes(LIBRARY_ITEM_DRAG_MIME_TYPE)) {
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
        }
      }}
      onDrop={(event) => {
        setDragCount(0);
        const rowItemPayload = readEstimateRowItemDragPayload(event.dataTransfer.getData(ESTIMATE_ROW_ITEM_DRAG_MIME_TYPE));
        if (rowItemPayload && onMoveRowItem) {
          event.preventDefault();
          event.stopPropagation();
          endEstimateWorkshopDrag();
          onMoveRowItem(rowItemPayload.rowItemId, nodeId, rowDropIndex);
          return;
        }

        const result = readEstimateLibraryItemDragPayload(event.dataTransfer.getData(LIBRARY_ITEM_DRAG_MIME_TYPE));
        if (!result.ok) return;
        event.preventDefault();
        onInsertLibraryItem(nodeId, result.item);
      }}
    >
      <EstimateDropZone
        label={rowItemDragActive ? `Move row to ${nodeName}` : `Drag and drop estimate component into ${nodeName}`}
        isDragOver={isDragOver}
      />
    </div>
  );
}

/**
 * Library-item drop target for a node. The dashed zone only exists while a
 * component drag is in flight; at rest the node keeps a quiet add-row
 * affordance so the sheet is not littered with permanent drop targets or
 * explanatory copy.
 */
export function ComponentDropTarget({
  canEditEstimate = true,
  nodeId,
  nodeName,
  empty,
  onInsertLibraryItem,
  onAddBlankRow,
  onMoveRowItem,
  rowDropIndex = 0,
}: {
  canEditEstimate?: boolean;
  nodeId: string;
  nodeName: string;
  empty: boolean;
  onInsertLibraryItem: (targetNodeId: string, libraryItem: EstimateRowItem) => void;
  onAddBlankRow: (targetNodeId: string) => void;
  onMoveRowItem?: (rowItemId: string, targetNodeId: string, targetIndex: number) => void;
  rowDropIndex?: number;
}) {
  const activeDrag = useEstimateWorkshopDrag();
  const componentDragActive = activeDrag?.kind === "library-item";
  const rowItemDragActive = activeDrag?.kind === "estimate-row-item";
  const compatibleDragActive = componentDragActive || rowItemDragActive;

  if (!canEditEstimate) return null;

  if (!compatibleDragActive) {
    return (
      <div className={cn("py-1", empty ? "py-1.5" : null)}>
        <QuietAddRowButton nodeId={nodeId} nodeName={nodeName} onAddBlankRow={onAddBlankRow} />
      </div>
    );
  }

  return (
    <ActiveComponentDropZone
      nodeId={nodeId}
      nodeName={nodeName}
      onInsertLibraryItem={onInsertLibraryItem}
      onMoveRowItem={onMoveRowItem}
      rowDropIndex={rowDropIndex}
      rowItemDragActive={rowItemDragActive}
    />
  );
}

/**
 * Template drop target inside a section, rendered only while a template
 * drag is in flight. Group sections place it after their children — exactly
 * where the server appends inserted template roots; area-root sheets use it
 * as the wrap-in-group target. The surrounding section also accepts template
 * drops; this zone stops propagation so a drop here is handled once.
 */
export function TemplateDropZone({
  nodeId,
  label,
  onDropPayload,
}: {
  nodeId: string;
  label: string;
  onDropPayload: (payload: EstimateTemplateDragPayload) => void;
}) {
  const [dragCount, setDragCount] = useState(0);
  const isDragOver = dragCount > 0;
  return (
    <div
      className="py-1"
      data-estimate-template-drop-zone={nodeId}
      onDragEnter={(event) => {
        if (!event.dataTransfer.types.includes(ESTIMATE_TEMPLATE_DRAG_MIME_TYPE)) return;
        setDragCount((c) => c + 1);
      }}
      onDragLeave={(event) => {
        if (!event.dataTransfer.types.includes(ESTIMATE_TEMPLATE_DRAG_MIME_TYPE)) return;
        setDragCount((c) => Math.max(0, c - 1));
      }}
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes(ESTIMATE_TEMPLATE_DRAG_MIME_TYPE)) return;
        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = "copy";
      }}
      onDrop={(event) => {
        setDragCount(0);
        const payload = readEstimateTemplateDragPayload(event.dataTransfer.getData(ESTIMATE_TEMPLATE_DRAG_MIME_TYPE));
        if (!payload) return;
        event.preventDefault();
        event.stopPropagation();
        onDropPayload(payload);
      }}
    >
      <EstimateDropZone label={label} isDragOver={isDragOver} />
    </div>
  );
}
