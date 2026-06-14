"use client";

import { useState } from "react";
import { Plus } from "@phosphor-icons/react/dist/ssr";

import { cn } from "@/lib/ui/cn";
import {
  ESTIMATE_TEMPLATE_DRAG_MIME_TYPE,
  readEstimateTemplateDragPayload,
  type EstimateTemplateDragPayload,
} from "../../component-library/templates";
import { useEstimateWorkshopDrag } from "../../estimate-workshop-drag";
import type { EstimateRowItem } from "../../estimate-tree-data";
import { LIBRARY_ITEM_DRAG_MIME_TYPE } from "./constants";

/**
 * Dashed drop surface, rendered only while a compatible drag is in flight
 * (drag suppresses CSS hover, so the highlight is driven by `isDragOver`).
 */
export function EstimateDropZone({ label, isDragOver = false }: { label: string; isDragOver?: boolean }) {
  return (
    <div
      className={cn(
        "flex h-16 w-full items-center justify-center gap-1.5 border border-dashed border-hairline bg-surfaceMuted/30 text-tertiary transition-opacity",
        isDragOver ? "opacity-100" : "opacity-60",
      )}
    >
      <div className="flex items-center gap-1.5 text-[10px] font-normal">
        <Plus size={12} weight="regular" aria-hidden="true" />
        <span>{label}</span>
      </div>
    </div>
  );
}

export function QuietAddRowButton({ nodeId, nodeName, onAddBlankRow }: {
  nodeId: string;
  nodeName: string;
  onAddBlankRow: (targetNodeId: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onAddBlankRow(nodeId)}
      aria-label={`Add blank estimate row to ${nodeName}`}
      className="flex h-6 w-full items-center gap-1.5 rounded-xs border border-transparent px-1.5 text-[9px] font-medium text-tertiary transition-colors hover:bg-surfaceMuted/60 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <Plus size={11} weight="regular" aria-hidden="true" />
      <span>Add row</span>
    </button>
  );
}

/**
 * Library-item drop target for a node. The dashed zone only exists while a
 * component drag is in flight; at rest the node keeps a quiet add-row
 * affordance (and, when empty, a short truthful empty-state line offering both
 * a row and a sub-area) so the sheet is not littered with permanent drop
 * targets.
 */
export function ComponentDropTarget({
  nodeId,
  nodeName,
  empty,
  onInsertLibraryItem,
  onAddBlankRow,
}: {
  nodeId: string;
  nodeName: string;
  empty: boolean;
  onInsertLibraryItem: (targetNodeId: string, libraryItem: EstimateRowItem) => void;
  onAddBlankRow: (targetNodeId: string) => void;
}) {
  const activeDrag = useEstimateWorkshopDrag();
  const [dragCount, setDragCount] = useState(0);
  const componentDragActive = activeDrag?.kind === "library-item";
  const isDragOver = dragCount > 0;

  // A cancelled drag never delivers the balancing dragleave; adjust the
  // stale counter during render once the drag store empties.
  if (!componentDragActive && dragCount !== 0) setDragCount(0);

  if (!componentDragActive) {
    if (!empty) return <QuietAddRowButton nodeId={nodeId} nodeName={nodeName} onAddBlankRow={onAddBlankRow} />;
    return (
      <div className="flex min-h-9 items-center justify-between gap-2 rounded-xs border border-dashed border-hairline bg-surfaceMuted/20 px-1.5 py-0.5">
        <span className="text-[9px] leading-3 text-tertiary">
          Empty area. Add a row, drag components from the library, or add a sub-area from the tree.
        </span>
        <span className="w-24 shrink-0">
          <QuietAddRowButton nodeId={nodeId} nodeName={nodeName} onAddBlankRow={onAddBlankRow} />
        </span>
      </div>
    );
  }

  return (
    <div
      className="py-1"
      onDragEnter={() => setDragCount((c) => c + 1)}
      onDragLeave={() => setDragCount((c) => Math.max(0, c - 1))}
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes(LIBRARY_ITEM_DRAG_MIME_TYPE)) {
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
        }
      }}
      onDrop={(event) => {
        setDragCount(0);
        const payload = event.dataTransfer.getData(LIBRARY_ITEM_DRAG_MIME_TYPE);
        if (!payload) return;
        event.preventDefault();
        onInsertLibraryItem(nodeId, JSON.parse(payload) as EstimateRowItem);
      }}
    >
      <EstimateDropZone
        label={`Drag and drop estimate component into ${nodeName}`}
        isDragOver={isDragOver}
      />
    </div>
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
