"use client";

import { useState, type Dispatch, type DragEvent, type SetStateAction } from "react";
import { CaretDown } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/ui/cn";
import { pesoFormatter, type RowDetailTab } from "../activity-history";
import {
  ESTIMATE_TEMPLATE_DRAG_MIME_TYPE,
  readEstimateTemplateDragPayload,
  type EstimateTemplateDragPayload,
} from "../../component-library/templates";
import { useEstimateWorkshopDrag } from "../../estimate-workshop-drag";
import type { EstimateRowItem, EstimateTreeNode } from "../../estimate-tree-data";
import { EMPTY_ESTIMATE_ROW_ITEMS } from "./constants";
import { computeNodeTotal, type EditableRowValue } from "./editable-row-model";
import { useEstimateSheetExpansion } from "./expansion";
import { NodeIcon, STICKY_HEADER_H, STICKY_THEAD_H, getNodeCode, groupGap, nodeHeaderClasses, nodeNameClasses, nodeTotalClasses } from "./node-visuals";
import { ComponentDropTarget, TemplateDropZone } from "./drop-zones";
import { EstimateRowItemsTable } from "./row-table";

export type BreadcrumbNode = { id: string; name: string };

export type EstimateSheetBranchProps = {
  node: EstimateTreeNode;
  nodeCode: string;
  ancestorPath: BreadcrumbNode[];
  editableRows: Record<string, EditableRowValue>;
  setEditableRows: Dispatch<SetStateAction<Record<string, EditableRowValue>>>;
  onInsertLibraryItem: (targetNodeId: string, libraryItem: EstimateRowItem) => void;
  onInsertTemplates: (targetParentNodeId: string, templateIds: string[]) => void;
  onInsertTemplateNode: (targetParentNodeId: string, templateId: string, templateNodeId: string) => void;
  onAddBlankRow: (targetNodeId: string) => void;
  onReplaceRowItem: (rowItemId: string, libraryItem: EstimateRowItem) => void;
  onDeleteRowItem: (rowItemId: string) => void;
  onUpdateRowItem: (rowItemId: string, values: Partial<EditableRowValue>) => void;
  onMarkRowDirty: (rowItemId: string) => void;
  onOpenRowDetails: (rowItemId: string, opener: HTMLElement, tab?: RowDetailTab) => void;
  onClearRowComponent: (rowItemId: string) => void;
  onRequestProjectSpecific: (rowItemId: string) => void;
  onMoveRowComponent: (sourceRowItemId: string, targetRowItemId: string, movedItem: EstimateRowItem) => void;
  selectedRowIds: ReadonlySet<string>;
  onToggleRowSelection: (rowItemId: string, checked: boolean) => void;
  onToggleRowsSelection: (rowItemIds: string[], checked: boolean) => void;
  depth?: number;
  usesSiblingGroupRhythm?: boolean;
  /**
   * Accumulated sticky offset (px) for this node's header. The root passes 0;
   * each level adds its parent header height plus the parent's own-rows
   * <thead> height (when the parent has own rows) so nested sticky layers
   * stack instead of colliding at top-0. See node-visuals STICKY_* consts.
   */
  stickyTop?: number;
};

/**
 * The mutation seam shared by every sheet host: the estimate page wires
 * these to estimate actions; the template editor wires them to template
 * actions. Presentational rows never know which.
 */
export type SheetMutationHandlers = Pick<
  EstimateSheetBranchProps,
  | "onInsertLibraryItem"
  | "onInsertTemplates"
  | "onInsertTemplateNode"
  | "onAddBlankRow"
  | "onReplaceRowItem"
  | "onDeleteRowItem"
  | "onUpdateRowItem"
  | "onMarkRowDirty"
  | "onOpenRowDetails"
  | "onClearRowComponent"
  | "onRequestProjectSpecific"
  | "onMoveRowComponent"
>;

export function EstimateSheetBranch({ node, nodeCode, ancestorPath = [], editableRows, setEditableRows, onInsertLibraryItem, onInsertTemplates, onInsertTemplateNode, onAddBlankRow, onReplaceRowItem, onDeleteRowItem, onUpdateRowItem, onMarkRowDirty, onOpenRowDetails, onClearRowComponent, onRequestProjectSpecific, onMoveRowComponent, selectedRowIds, onToggleRowSelection, onToggleRowsSelection, depth = 0, usesSiblingGroupRhythm = false, stickyTop = 0 }: EstimateSheetBranchProps) {
  const { collapsedNodeIds, setCollapsedNodeIds } = useEstimateSheetExpansion();
  const collapsed = collapsedNodeIds.has(node.id);
  const childAreas = node.children ?? [];
  const estimateRowItems = node.estimateRowItems ?? EMPTY_ESTIMATE_ROW_ITEMS;
  // Containment is derived from CHILDREN, not kind: a node is a leaf iff it has
  // no child sub-areas. The disclosure caret, aria-expanded, and the rows-vs
  // -sub-areas distinction all key off this.
  const hasChildren = childAreas.length > 0;
  const hasOwnRows = estimateRowItems.length > 0;
  const hasContents = hasChildren || hasOwnRows;
  const leftIndent = Math.min(depth * 32, 192);
  const total = computeNodeTotal(node, editableRows);
  const showBreadcrumbs = !collapsed && ancestorPath.length > 0;
  // Own-rows <thead> pins directly below this node's header; children pin below
  // both this header and (when present) this node's own-rows header so no two
  // sticky layers share a top offset.
  const ownRowsStickyTop = stickyTop + STICKY_HEADER_H;
  const childStickyTop = ownRowsStickyTop + (hasOwnRows ? STICKY_THEAD_H : 0);
  // P6 single-node model: every node is a first-class area that can hold rows
  // AND child sub-areas, so a template/subtree drops directly into ANY node —
  // there is no area-wrap path anymore.
  const canReceiveTemplates = true;
  // L7 accessible name: announce the node's dual content. "{name}, area
  // {, N rows}{, M sub-areas}" — clauses omitted when zero.
  const headerAriaLabel = [
    `${node.name}, area`,
    hasOwnRows ? `${estimateRowItems.length} ${estimateRowItems.length === 1 ? "row" : "rows"}` : null,
    hasChildren ? `${childAreas.length} ${childAreas.length === 1 ? "sub-area" : "sub-areas"}` : null,
  ].filter(Boolean).join(", ");
  const activeDrag = useEstimateWorkshopDrag();
  const templateDragActive = activeDrag?.kind === "estimate-template";
  const activeTemplateName = activeDrag?.kind === "estimate-template" ? activeDrag.templateName : "";
  const [templateDragOverCount, setTemplateDragOverCount] = useState(0);

  // A cancelled drag never delivers the balancing dragleave; adjust the
  // stale counter during render once the drag store empties.
  if (!templateDragActive && templateDragOverCount !== 0) setTemplateDragOverCount(0);

  function handleTemplateDragOver(event: DragEvent<HTMLElement>) {
    if (!canReceiveTemplates || !event.dataTransfer.types.includes(ESTIMATE_TEMPLATE_DRAG_MIME_TYPE)) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "copy";
  }

  // Every node is now a direct drop target, so each stops enter/leave
  // propagation: an ancestor's highlight turns off while the pointer is over a
  // nested node (where the drop actually lands).
  function handleTemplateDragEnter(event: DragEvent<HTMLElement>) {
    if (!canReceiveTemplates || !event.dataTransfer.types.includes(ESTIMATE_TEMPLATE_DRAG_MIME_TYPE)) return;
    event.stopPropagation();
    setTemplateDragOverCount((count) => count + 1);
  }

  function handleTemplateDragLeave(event: DragEvent<HTMLElement>) {
    if (!canReceiveTemplates || !event.dataTransfer.types.includes(ESTIMATE_TEMPLATE_DRAG_MIME_TYPE)) return;
    event.stopPropagation();
    setTemplateDragOverCount((count) => Math.max(0, count - 1));
  }

  function applyTemplateDropPayload(payload: EstimateTemplateDragPayload) {
    if (payload.kind === "template-node") {
      onInsertTemplateNode(node.id, payload.templateId, payload.templateNodeId);
      return;
    }
    onInsertTemplates(node.id, payload.templateIds);
  }

  function handleTemplateDrop(event: DragEvent<HTMLElement>) {
    if (!canReceiveTemplates) return;
    setTemplateDragOverCount(0);
    const payload = readEstimateTemplateDragPayload(event.dataTransfer.getData(ESTIMATE_TEMPLATE_DRAG_MIME_TYPE));
    if (!payload) return;
    event.preventDefault();
    event.stopPropagation();
    applyTemplateDropPayload(payload);
  }

  return (
    <section
      className={cn(
        groupGap(depth, usesSiblingGroupRhythm),
        // One node chrome for every node (single-node model): a bordered,
        // muted-surface card; only the root gets the xs corner radius.
        depth > 0 ? "border border-hairline bg-surfaceMuted/20" : "rounded-xs border border-hairline bg-surfaceMuted/20",
        templateDragActive && templateDragOverCount > 0 && "bg-surfaceWarm/30",
      )}
      aria-label={node.name}
      onDragOver={handleTemplateDragOver}
      onDragEnter={handleTemplateDragEnter}
      onDragLeave={handleTemplateDragLeave}
      onDrop={handleTemplateDrop}
    >
      <div className="sticky z-[20] bg-white" style={{ top: stickyTop }}>
        <div
          className={cn("flex h-10 items-center gap-2 px-1", nodeHeaderClasses())}
          style={{ paddingLeft: `${leftIndent + 8}px` }}
        >
          {/* L7 dual-content announcement as a real (visually-hidden) text
              node — kept off the section's aria-label so it doesn't duplicate
              the node-name labelled region. "{name}, area{, N rows}{, M
              sub-areas}". */}
          <span className="sr-only">{headerAriaLabel}</span>
          {hasChildren ? (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`${collapsed ? "Expand" : "Collapse"} ${node.name}`}
              aria-expanded={!collapsed}
              className="size-6 rounded-xs p-0 text-tertiary"
              onClick={() =>
                setCollapsedNodeIds((prev) => {
                  const next = new Set(prev);
                  if (next.has(node.id)) next.delete(node.id);
                  else next.add(node.id);
                  return next;
                })
              }
            >
              <CaretDown size={13} weight="regular" aria-hidden="true" className={collapsed ? "-rotate-90" : ""} />
            </Button>
          ) : (
            // Reserve the caret slot so leaf names stay aligned with parents.
            // Non-focusable, no aria-expanded — a leaf must not advertise
            // expandability (L7).
            <span className="size-6 shrink-0" aria-hidden="true" />
          )}
          <span className="flex size-6 shrink-0 items-center justify-center text-tertiary">
            <NodeIcon />
          </span>
          <div className="min-w-0 flex-1">
            {nodeCode && (
              <p className="text-[8px] font-sans leading-none tabular-nums text-tertiary">{nodeCode}</p>
            )}
            <p className={nodeNameClasses()}>{node.name}</p>
          </div>
          <span className={nodeTotalClasses()}>{pesoFormatter.format(total)}</span>
        </div>

        {showBreadcrumbs && (
          <div
            className="my-1 flex items-center gap-1 truncate pb-2 text-[8px] text-muted"
            aria-label={`${node.name} breadcrumbs`}
            style={{ paddingLeft: `${leftIndent + 72}px` }}
          >
            {ancestorPath.map((ancestor, index) => (
              <span key={ancestor.id}>
                {index > 0 && <span className="mx-0.5 text-hairline">›</span>}
                {ancestor.name}
              </span>
            ))}
            <span className="mx-0.5 text-hairline">›</span>
            <span>{node.name}</span>
          </div>
        )}
      </div>

      {!collapsed ? (
        <div className={cn("space-y-4", !showBreadcrumbs && "mt-1")}>
          {/* Rows-first (L1): a node renders its OWN rows + add-row strip
              directly under its header, ABOVE its child sub-areas, so clicking
              a node shows its own numbers before an arbitrarily deep subtree. */}
          {hasOwnRows && hasChildren ? (
            // "Own items" eyebrow (L4) — shown only when a node has BOTH rows
            // and children, to disambiguate this node's own rows from the
            // first child's rows. Doubles as the L7 screen-reader boundary.
            <p className="text-[9px] font-medium leading-3 text-tertiary" style={{ paddingLeft: `${leftIndent + 8}px` }} data-estimate-own-items-label>
              Own items
            </p>
          ) : null}
          <EstimateRowItemsTable
            items={estimateRowItems}
            editableRows={editableRows}
            setEditableRows={setEditableRows}
            targetNodeId={node.id}
            stickyTop={ownRowsStickyTop}
            onInsertLibraryItem={onInsertLibraryItem}
            onReplaceRowItem={onReplaceRowItem}
            onDeleteRowItem={onDeleteRowItem}
            onUpdateRowItem={onUpdateRowItem}
            onMarkRowDirty={onMarkRowDirty}
            onOpenRowDetails={onOpenRowDetails}
            onClearRowComponent={onClearRowComponent}
            onRequestProjectSpecific={onRequestProjectSpecific}
            onMoveRowComponent={onMoveRowComponent}
            selectedRowIds={selectedRowIds}
            onToggleRowSelection={onToggleRowSelection}
            onToggleRowsSelection={onToggleRowsSelection}
          />
          {/* Add-row / drag-a-component strip. Always present on EVERY node —
              P6 lets any node hold rows even when it already has child
              sub-areas — so a quiet "Add row" affordance is always available,
              and the empty node's "Add a row or a sub-area" state lives here. */}
          <ComponentDropTarget
            nodeId={node.id}
            nodeName={node.name}
            empty={!hasContents}
            onInsertLibraryItem={onInsertLibraryItem}
            onAddBlankRow={onAddBlankRow}
          />
          {/* Child sub-areas LAST (depth+1), pinned below this node's sticky
              header (and own-rows thead when present). */}
          {childAreas.map((child, childIndex) => {
            const childCode = getNodeCode(nodeCode, childIndex);
            const childPath = [...ancestorPath, { id: node.id, name: node.name }];
            return (
              <EstimateSheetBranch
                key={child.id}
                node={child}
                nodeCode={childCode}
                ancestorPath={childPath}
                editableRows={editableRows}
                setEditableRows={setEditableRows}
                onInsertLibraryItem={onInsertLibraryItem}
                onInsertTemplates={onInsertTemplates}
                onInsertTemplateNode={onInsertTemplateNode}
                onAddBlankRow={onAddBlankRow}
                onReplaceRowItem={onReplaceRowItem}
                onDeleteRowItem={onDeleteRowItem}
                onUpdateRowItem={onUpdateRowItem}
                onMarkRowDirty={onMarkRowDirty}
                onOpenRowDetails={onOpenRowDetails}
                onClearRowComponent={onClearRowComponent}
                onRequestProjectSpecific={onRequestProjectSpecific}
                onMoveRowComponent={onMoveRowComponent}
                selectedRowIds={selectedRowIds}
                onToggleRowSelection={onToggleRowSelection}
                onToggleRowsSelection={onToggleRowsSelection}
                depth={depth + 1}
                stickyTop={childStickyTop}
              />
            );
          })}
          {/* Unified empty state (L5/P6). Every empty node now offers BOTH
              creatable paths (a row OR a sub-area) through ComponentDropTarget's
              empty state above — the promise gap held in P4 is closed, so the
              separate group-only "Add a sub-area" message is gone. */}
          {templateDragActive ? (
            <TemplateDropZone
              nodeId={node.id}
              label={`Drop ${activeTemplateName || "template"} into ${node.name}`}
              onDropPayload={applyTemplateDropPayload}
            />
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
