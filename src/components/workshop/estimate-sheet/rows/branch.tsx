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
import { NodeIcon, getNodeCode, groupGap, nodeHeaderClasses, nodeNameClasses, nodeTotalClasses } from "./node-visuals";
import { ComponentDropTarget, EmptyGroupMessage, TemplateDropZone } from "./drop-zones";
import { EstimateRowItemsTable } from "./row-table";

export type BreadcrumbNode = { id: string; name: string };

export type EstimateSheetBranchProps = {
  node: EstimateTreeNode;
  nodeCode: string;
  ancestorPath: BreadcrumbNode[];
  editableRows: Record<string, EditableRowValue>;
  setEditableRows: Dispatch<SetStateAction<Record<string, EditableRowValue>>>;
  onInsertLibraryItem: (targetNodeId: string, libraryItem: EstimateRowItem) => void;
  onInsertTemplate: (targetParentNodeId: string, templateId: string) => void;
  onInsertTemplateNode: (targetParentNodeId: string, templateId: string, templateNodeId: string) => void;
  /** Root-level area sheets only: a template drop wraps the area and the payload in a new group. */
  onWrapAreaWithTemplate?: (areaNodeId: string, payload: EstimateTemplateDragPayload) => void;
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
};

/**
 * The mutation seam shared by every sheet host: the estimate page wires
 * these to estimate actions; the template editor wires them to template
 * actions. Presentational rows never know which.
 */
export type SheetMutationHandlers = Pick<
  EstimateSheetBranchProps,
  | "onInsertLibraryItem"
  | "onInsertTemplate"
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

export function EstimateSheetBranch({ node, nodeCode, ancestorPath = [], editableRows, setEditableRows, onInsertLibraryItem, onInsertTemplate, onInsertTemplateNode, onWrapAreaWithTemplate, onAddBlankRow, onReplaceRowItem, onDeleteRowItem, onUpdateRowItem, onMarkRowDirty, onOpenRowDetails, onClearRowComponent, onRequestProjectSpecific, onMoveRowComponent, selectedRowIds, onToggleRowSelection, onToggleRowsSelection, depth = 0, usesSiblingGroupRhythm = false }: EstimateSheetBranchProps) {
  const { collapsedNodeIds, setCollapsedNodeIds } = useEstimateSheetExpansion();
  const collapsed = collapsedNodeIds.has(node.id);
  const childAreas = node.children ?? [];
  const estimateRowItems = node.estimateRowItems ?? EMPTY_ESTIMATE_ROW_ITEMS;
  const hasContents = childAreas.length > 0 || estimateRowItems.length > 0;
  const canReceiveRows = true;
  const isGroup = node.kind === "group";
  const hasMixedChildKinds = childAreas.some((child) => child.kind === "group") && childAreas.some((child) => child.kind === "area");
  const leftIndent = Math.min(depth * 32, 192);
  const total = computeNodeTotal(node, editableRows);
  const displayKind = isGroup ? "group" : "area";
  const showBreadcrumbs = !collapsed && !isGroup && ancestorPath.length > 0;
  // Areas cannot take child nodes, so a template dropped on an area-scoped
  // sheet root wraps the area and the template in a new group instead.
  const isWrapTarget = !isGroup && depth === 0 && Boolean(onWrapAreaWithTemplate);
  const canReceiveTemplates = isGroup || isWrapTarget;
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

  // Groups stop enter/leave propagation so an ancestor group's highlight
  // turns off while the pointer is over a nested group (where the drop would
  // actually land). Areas let the events bubble: hovering an area highlights
  // the ancestor group that would receive the template.
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
    if (isWrapTarget) {
      onWrapAreaWithTemplate?.(node.id, payload);
      return;
    }
    if (payload.kind === "template-node") {
      onInsertTemplateNode(node.id, payload.templateId, payload.templateNodeId);
      return;
    }
    payload.templateIds.forEach((templateId) => onInsertTemplate(node.id, templateId));
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
        groupGap(depth, node.kind, usesSiblingGroupRhythm),
        !isGroup && (depth > 0 ? "border border-hairline bg-surfaceMuted/20" : "rounded-xs border border-hairline bg-surfaceMuted/20"),
        templateDragActive && canReceiveTemplates && templateDragOverCount > 0 && "bg-surfaceWarm/30",
      )}
      aria-label={node.name}
      onDragOver={handleTemplateDragOver}
      onDragEnter={handleTemplateDragEnter}
      onDragLeave={handleTemplateDragLeave}
      onDrop={handleTemplateDrop}
    >
      <div className={cn("sticky top-0 z-[20]", !isGroup && "bg-white")}>
        <div
          className={cn("flex h-10 items-center gap-2 px-1", nodeHeaderClasses(node.kind))}
          style={{ paddingLeft: `${leftIndent + 8}px` }}
        >
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`${collapsed ? "Expand" : "Collapse"} ${node.name} ${displayKind}`}
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
          <span className="flex size-6 shrink-0 items-center justify-center text-tertiary">
            <NodeIcon kind={node.kind} />
          </span>
          <div className="min-w-0 flex-1">
            {nodeCode && (
              <p className="text-[8px] font-sans leading-none tabular-nums text-tertiary">{nodeCode}</p>
            )}
            <p className={nodeNameClasses(node.kind)}>{node.name}</p>
          </div>
          <span className={nodeTotalClasses(node.kind)}>{pesoFormatter.format(total)}</span>
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
        <div className={cn(isGroup ? "space-y-1" : "space-y-4", !showBreadcrumbs && "mt-1")}>
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
                onInsertTemplate={onInsertTemplate}
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
                usesSiblingGroupRhythm={hasMixedChildKinds}
              />
            );
          })}
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
            selectedRowIds={selectedRowIds}
            onToggleRowSelection={onToggleRowSelection}
            onToggleRowsSelection={onToggleRowsSelection}
          />
          {canReceiveRows ? (
            <ComponentDropTarget
              nodeId={node.id}
              nodeName={node.name}
              empty={!hasContents}
              onInsertLibraryItem={onInsertLibraryItem}
              onAddBlankRow={onAddBlankRow}
            />
          ) : null}
          {isGroup && !hasContents ? <EmptyGroupMessage templateDragActive={templateDragActive} /> : null}
          {canReceiveTemplates && templateDragActive ? (
            <TemplateDropZone
              nodeId={node.id}
              label={
                isWrapTarget
                  ? `Drop ${activeTemplateName || "template"} here to group it with ${node.name}`
                  : `Drop ${activeTemplateName || "template"} into ${node.name}`
              }
              onDropPayload={applyTemplateDropPayload}
            />
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
