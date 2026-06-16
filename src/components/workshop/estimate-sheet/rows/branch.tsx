"use client";

import { memo, useRef, useState, type Dispatch, type DragEvent, type SetStateAction } from "react";
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
import { getNodeCode, groupGap, nodeHeaderClasses, nodeNameClasses, nodeShellClasses, nodeTotalClasses } from "./node-visuals";
import { ComponentDropTarget, TemplateDropZone } from "./drop-zones";
import { EstimateRowItemsTable, type EstimateTableColumnResizeConfig } from "./row-table";
import type { ExpressInsertDraftState } from "./cells";
import { useDragEdgeAutoScroll } from "./use-drag-edge-autoscroll";
import { reportEstimateSheetBranchRender } from "../../estimate-sheet-render-probe";

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
  expressInsertDraftStates?: Record<string, ExpressInsertDraftState>;
  onRetryExpressDraft?: (rowItemId: string) => void;
  onDeleteExpressDraft?: (rowItemId: string) => void;
  selectedRowIds: ReadonlySet<string>;
  onToggleRowSelection: (rowItemId: string, checked: boolean) => void;
  onToggleRowsSelection: (rowItemIds: string[], checked: boolean) => void;
  columnResize?: EstimateTableColumnResizeConfig;
  nodeTotals?: ReadonlyMap<string, number>;
  depth?: number;
  siblingIndex?: number;
  renderChildBranches?: boolean;
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
  | "onRetryExpressDraft"
  | "onDeleteExpressDraft"
>;

function areAncestorPathsEqual(prev: readonly BreadcrumbNode[], next: readonly BreadcrumbNode[]) {
  if (prev === next) return true;
  if (prev.length !== next.length) return false;
  for (let index = 0; index < prev.length; index += 1) {
    if (prev[index]?.id !== next[index]?.id || prev[index]?.name !== next[index]?.name) return false;
  }
  return true;
}

function branchRowStateChanged(
  node: EstimateTreeNode,
  prev: Pick<EstimateSheetBranchProps, "editableRows" | "selectedRowIds">,
  next: Pick<EstimateSheetBranchProps, "editableRows" | "selectedRowIds">,
  includeDescendants: boolean,
): boolean {
  for (const item of node.estimateRowItems ?? EMPTY_ESTIMATE_ROW_ITEMS) {
    if (prev.editableRows[item.id] !== next.editableRows[item.id]) return true;
    if (prev.selectedRowIds.has(item.id) !== next.selectedRowIds.has(item.id)) return true;
  }
  if (!includeDescendants) return false;
  for (const child of node.children ?? []) {
    if (branchRowStateChanged(child, prev, next, true)) return true;
  }
  return false;
}

export function areEstimateSheetBranchPropsEqual(prev: EstimateSheetBranchProps, next: EstimateSheetBranchProps) {
  if (
    prev.node !== next.node ||
    prev.nodeCode !== next.nodeCode ||
    prev.depth !== next.depth ||
    prev.siblingIndex !== next.siblingIndex ||
    prev.renderChildBranches !== next.renderChildBranches ||
    prev.setEditableRows !== next.setEditableRows ||
    prev.onInsertLibraryItem !== next.onInsertLibraryItem ||
    prev.onInsertTemplates !== next.onInsertTemplates ||
    prev.onInsertTemplateNode !== next.onInsertTemplateNode ||
    prev.onAddBlankRow !== next.onAddBlankRow ||
    prev.onReplaceRowItem !== next.onReplaceRowItem ||
    prev.onDeleteRowItem !== next.onDeleteRowItem ||
    prev.onUpdateRowItem !== next.onUpdateRowItem ||
    prev.onMarkRowDirty !== next.onMarkRowDirty ||
    prev.onOpenRowDetails !== next.onOpenRowDetails ||
    prev.onClearRowComponent !== next.onClearRowComponent ||
    prev.onRequestProjectSpecific !== next.onRequestProjectSpecific ||
    prev.onMoveRowComponent !== next.onMoveRowComponent ||
    prev.expressInsertDraftStates !== next.expressInsertDraftStates ||
    prev.onRetryExpressDraft !== next.onRetryExpressDraft ||
    prev.onDeleteExpressDraft !== next.onDeleteExpressDraft ||
    prev.onToggleRowSelection !== next.onToggleRowSelection ||
    prev.onToggleRowsSelection !== next.onToggleRowsSelection ||
    prev.columnResize !== next.columnResize ||
    !areAncestorPathsEqual(prev.ancestorPath, next.ancestorPath)
  ) {
    return false;
  }

  const prevTotal = prev.nodeTotals?.get(prev.node.id);
  const nextTotal = next.nodeTotals?.get(next.node.id);
  if (!Object.is(prevTotal, nextTotal)) return false;

  const needsRowStateCheck =
    prev.editableRows !== next.editableRows ||
    prev.selectedRowIds !== next.selectedRowIds ||
    !prev.nodeTotals ||
    !next.nodeTotals;
  if (!needsRowStateCheck) return true;

  return !branchRowStateChanged(next.node, prev, next, next.renderChildBranches ?? true);
}

function EstimateSheetBranchBase({ node, nodeCode, ancestorPath = [], editableRows, setEditableRows, onInsertLibraryItem, onInsertTemplates, onInsertTemplateNode, onAddBlankRow, onReplaceRowItem, onDeleteRowItem, onUpdateRowItem, onMarkRowDirty, onOpenRowDetails, onClearRowComponent, onRequestProjectSpecific, onMoveRowComponent, expressInsertDraftStates, onRetryExpressDraft, onDeleteExpressDraft, selectedRowIds, onToggleRowSelection, onToggleRowsSelection, columnResize, nodeTotals, depth = 0, siblingIndex = 0, renderChildBranches = true }: EstimateSheetBranchProps) {
  reportEstimateSheetBranchRender(node.id);
  const { collapsedNodeIds, setCollapsedNodeIds, searchActive = false } = useEstimateSheetExpansion();
  // Only the root (depth 0) drives edge auto-scroll for the whole sheet; it
  // resolves the scroll container from its own DOM node.
  const sectionRef = useRef<HTMLElement | null>(null);
  useDragEdgeAutoScroll(sectionRef, depth === 0);
  const collapsed = collapsedNodeIds.has(node.id);
  const childAreas = node.children ?? [];
  const estimateRowItems = node.estimateRowItems ?? EMPTY_ESTIMATE_ROW_ITEMS;
  // P6 single-node model: every node has a collapsible body, because even an
  // empty area owns contextual chrome (breadcrumbs + Add row) and can receive
  // rows. hasContents remains only for occupancy/empty-state presentation.
  const hasChildren = childAreas.length > 0;
  const hasOwnRows = estimateRowItems.length > 0;
  const hasContents = hasChildren || hasOwnRows;
  const hasCollapsibleBody = true;
  const leftIndent = Math.min(depth * 16, 96);
  const headerTextOffset = leftIndent + 51;
  const total = nodeTotals?.get(node.id) ?? computeNodeTotal(node, editableRows);
  const showBreadcrumbs = !collapsed && ancestorPath.length > 0;
  // Sticky model: ONLY the displayed (depth-0) node header is sticky, pinned at
  // the top of the scroll container. Nested node headers and every table <thead>
  // are NON-sticky. Accumulated multi-level sticky offsets (40 -> 80 -> 120 ...)
  // pinned theads at the bottom of small nested tables and clipped first rows;
  // a single non-accumulated sticky layer cannot collide, clip, or overlap.
  const isStickyHeader = depth === 0;
  const headingLevel = Math.min(depth + 1, 6);
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
  const componentDragActive = activeDrag?.kind === "library-item";
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

  function expandNode() {
    setCollapsedNodeIds((prev) => {
      if (!prev.has(node.id)) return prev;
      const next = new Set(prev);
      next.delete(node.id);
      return next;
    });
  }

  function handleInsertLibraryItem(targetNodeId: string, libraryItem: EstimateRowItem) {
    expandNode();
    onInsertLibraryItem(targetNodeId, libraryItem);
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
    <>
    {depth > 0 && siblingIndex > 0 ? (
      <div
        aria-hidden="true"
        data-estimate-sibling-divider=""
        className="bg-white py-5"
        style={{ marginLeft: `${leftIndent + 8}px` }}
      />
    ) : null}
    <section
      ref={sectionRef}
      className={cn(
        groupGap(depth),
        // Node>row>component hierarchy reads via ONE frame, not concentric
        // borders (UX-4 / OD-7): only the root carries the bordered card; nested
        // nodes share the same surface tone and step in with indent + groupGap.
        // The row table keeps its own border, so each node's data grid stays
        // framed at every depth.
        nodeShellClasses(depth),
        templateDragActive && templateDragOverCount > 0 && "bg-surfaceWarm/30",
      )}
      aria-label={node.name}
      onDragOver={handleTemplateDragOver}
      onDragEnter={handleTemplateDragEnter}
      onDragLeave={handleTemplateDragLeave}
      onDrop={handleTemplateDrop}
    >
      <div className={cn("bg-white", isStickyHeader && "sticky top-0 z-[20]")}>
        <div
          className={cn(
            "flex min-h-10 items-center gap-2 border-x border-t border-hairline bg-surfaceMuted/40 px-1 py-2",
            collapsed && "border-b",
            nodeHeaderClasses()
          )}
          style={{ paddingLeft: `${leftIndent + 8}px` }}
        >
          {/* L7 dual-content announcement as a real (visually-hidden) text
              node — kept off the section's aria-label so it doesn't duplicate
              the node-name labelled region. "{name}, area{, N rows}{, M
              sub-areas}". */}
          <span className="sr-only">{headerAriaLabel}</span>
          {hasCollapsibleBody && !searchActive ? (
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
            // Reserve the caret slot so node names stay aligned while search is
            // active (carets suppressed, OD-3). Non-focusable, no aria-expanded.
            <span className="size-6 shrink-0" aria-hidden="true" />
          )}
          {/* Occupancy dot between the caret and the name: orange iff this node
              directly holds components, muted otherwise. */}
          <span
            data-occupancy-dot=""
            aria-hidden="true"
            className={cn("size-[3px] shrink-0 rounded-xs opacity-50", hasOwnRows ? "bg-orange-600" : "bg-tertiary")}
          />
          <div className="min-w-0 flex-1">
            <p className={nodeNameClasses(depth)} role="heading" aria-level={headingLevel}>{node.name}</p>
          </div>
          <span className={nodeTotalClasses()}>{pesoFormatter.format(total)}</span>
        </div>
      </div>

      {collapsed && componentDragActive ? (
        <ComponentDropTarget
          nodeId={node.id}
          nodeName={node.name}
          empty={!hasContents}
          onInsertLibraryItem={handleInsertLibraryItem}
          onAddBlankRow={onAddBlankRow}
        />
      ) : null}

      {!collapsed ? (
        <div className="space-y-2">
          {/* Breadcrumb path band — a normal scrolling band in the node body.
              It is contextual-on-arrival and scrolls away. */}
          {showBreadcrumbs && (
            <div
              className="flex items-center gap-1 truncate border-x border-b border-hairline bg-surfaceMuted/40 pb-2 text-[8px] text-muted"
              aria-label={`${node.name} breadcrumbs`}
              style={{ paddingLeft: `${headerTextOffset}px` }}
            >
              {ancestorPath.map((ancestor, index) => (
                <span key={ancestor.id}>
                  {index > 0 && <span className="mx-0.5 text-current">›</span>}
                  {ancestor.name}
                </span>
              ))}
              <span className="mx-0.5 text-current">›</span>
              <span>{node.name}</span>
            </div>
          )}
          {/* Rows-first (L1): a node renders its OWN rows + add-row strip
              directly under its header, ABOVE its child sub-areas, so clicking
              a node shows its own numbers before an arbitrarily deep subtree.
              The rows-first order plus each child's own caret demarcates a
              node's own rows from its children — no "Own items" eyebrow needed.
              Screen readers get the same disambiguation from headerAriaLabel
              ("{name}, area, N rows, M sub-areas") rendered sr-only above. */}
          <div className={showBreadcrumbs ? "-mt-2" : undefined}>
            <EstimateRowItemsTable
              items={estimateRowItems}
              editableRows={editableRows}
              setEditableRows={setEditableRows}
              targetNodeId={node.id}
              onInsertLibraryItem={onInsertLibraryItem}
              onReplaceRowItem={onReplaceRowItem}
              onDeleteRowItem={onDeleteRowItem}
              onUpdateRowItem={onUpdateRowItem}
              onMarkRowDirty={onMarkRowDirty}
              onOpenRowDetails={onOpenRowDetails}
              onClearRowComponent={onClearRowComponent}
              onRequestProjectSpecific={onRequestProjectSpecific}
              onMoveRowComponent={onMoveRowComponent}
              expressInsertDraftStates={expressInsertDraftStates}
              onRetryExpressDraft={onRetryExpressDraft}
              onDeleteExpressDraft={onDeleteExpressDraft}
              selectedRowIds={selectedRowIds}
              onToggleRowSelection={onToggleRowSelection}
              onToggleRowsSelection={onToggleRowsSelection}
              columnResize={columnResize}
            />
          </div>
          {/* Add-row / drag-a-component strip. Always present on EVERY node —
              P6 lets any node hold rows even when it already has child
              sub-areas — so a quiet "Add row" affordance is always available,
              and the empty node's "Add a row or a sub-area" state lives here. */}
          <ComponentDropTarget
            nodeId={node.id}
            nodeName={node.name}
            empty={!hasContents}
            onInsertLibraryItem={handleInsertLibraryItem}
            onAddBlankRow={onAddBlankRow}
          />
          {/* Child sub-areas LAST (depth+1), pinned below this node's sticky
              header (and own-rows thead when present). */}
          {renderChildBranches ? childAreas.map((child, childIndex) => {
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
                expressInsertDraftStates={expressInsertDraftStates}
                onRetryExpressDraft={onRetryExpressDraft}
                onDeleteExpressDraft={onDeleteExpressDraft}
                selectedRowIds={selectedRowIds}
                onToggleRowSelection={onToggleRowSelection}
                onToggleRowsSelection={onToggleRowsSelection}
                columnResize={columnResize}
                nodeTotals={nodeTotals}
                depth={depth + 1}
                siblingIndex={childIndex}
              />
            );
          }) : null}
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
    {/* Default bottom breathing room (root only): a scroll buffer so the
        bottom-most node can scroll up into reach — and the layout doesn't jump
        when the mid-drag drop zones appear. Pairs with the drag edge-autoscroll. */}
    {depth === 0 && renderChildBranches ? <div aria-hidden="true" className="h-32 shrink-0" /> : null}
    </>
  );
}

export const EstimateSheetBranch = memo(EstimateSheetBranchBase, areEstimateSheetBranchPropsEqual);
EstimateSheetBranch.displayName = "EstimateSheetBranch";
