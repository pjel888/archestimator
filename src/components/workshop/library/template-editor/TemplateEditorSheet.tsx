"use client";

import { useMemo, useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import { CaretDown, FolderSimple, MapPin, Plus, Trash } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { ControlInput } from "@/components/ui/control-input";
import { TreePanelHeader } from "@/components/ui/tree-panel-header";
import { cn } from "@/lib/ui/cn";
import type { TemplateEditorRowPatch } from "@/lib/component-library/template-editor-actions";
import {
  ESTIMATE_TEMPLATE_DRAG_MIME_TYPE,
  readEstimateTemplateDragPayload,
  type EstimateTemplateDragPayload,
} from "../../component-library/templates";
import { useEstimateWorkshopDrag } from "../../estimate-workshop-drag";
import { LIBRARY_ITEM_DRAG_MIME_TYPE } from "../../estimate-sheet/rows/constants";
import { EstimateDropZone } from "../../estimate-sheet/rows/drop-zones";
import { NodeIcon } from "../../estimate-sheet/rows/node-visuals";
import { nodeHeaderClasses, nodeNameClasses, nodeTotalClasses } from "../../estimate-sheet/rows/node-visuals-utils";
import { pesoFormatter } from "../../component-library/helpers";
import {
  computeTemplateNodeTotal,
  summarizeEstimateTemplate,
  type EstimateTemplate,
} from "../../component-library/templates";
import {
  type LibrarySurfaceVariant,
  useLibrarySurfaceVariant,
} from "../library-surface-variant";
import { librarySurfaceClass } from "../library-surface-class";
import type { EstimateRowItem, EstimateTreeNode } from "../../estimate-tree-data";
import { findFirstTemplateArea, findTemplateNode } from "./template-editor-model";

const TEMPLATE_SHEET_ROW_COLUMNS = "grid-cols-[minmax(140px,44fr)_10fr_10fr_18fr_18fr_28px]";

export type TemplateSheetHandlers = {
  onAddNode: (parentId: string | null, kind: "group" | "area") => void;
  onRenameNode: (node: EstimateTreeNode) => void;
  onDeleteNode: (node: EstimateTreeNode) => void;
  onUpdateRow: (rowId: string, patch: TemplateEditorRowPatch) => void;
  onRemoveRow: (rowId: string) => void;
  onAddAllowanceRow: (nodeId: string, material: string) => void;
  /** A dock component dropped on an area (or routed from a group header). */
  onDropLibraryItem: (nodeId: string, item: EstimateRowItem) => void;
  /** A dock template (or template subtree) dropped on a group or the root. */
  onDropTemplate: (targetGroupId: string | null, payload: EstimateTemplateDragPayload) => void;
};

function readLibraryItemDropPayload(event: DragEvent<HTMLElement>): EstimateRowItem | null {
  const payload = event.dataTransfer.getData(LIBRARY_ITEM_DRAG_MIME_TYPE);
  if (!payload) return null;
  try {
    return JSON.parse(payload) as EstimateRowItem;
  } catch {
    return null;
  }
}

function templateRowMatchesQuery(item: EstimateRowItem, normalizedQuery: string) {
  return [item.material, item.name, item.supplier, item.description]
    .some((value) => typeof value === "string" && value.toLowerCase().includes(normalizedQuery));
}

/** A matching node keeps its subtree; otherwise it needs matching content. */
function filterTemplateSheetNode(node: EstimateTreeNode, query: string): EstimateTreeNode | null {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return node;

  function visit(current: EstimateTreeNode): EstimateTreeNode | null {
    if (current.name.toLowerCase().includes(normalizedQuery)) return current;
    const children = (current.children ?? [])
      .map(visit)
      .filter((child): child is EstimateTreeNode => child !== null);
    const estimateRowItems = (current.estimateRowItems ?? []).filter((item) =>
      templateRowMatchesQuery(item, normalizedQuery),
    );
    if (children.length > 0 || estimateRowItems.length > 0) {
      return { ...current, children, estimateRowItems };
    }
    return null;
  }

  return visit(node);
}

function blurOnEnter(event: KeyboardEvent<HTMLInputElement>) {
  if (event.key === "Enter") {
    event.preventDefault();
    event.currentTarget.blur();
  }
}

const QUIET_CELL_INPUT_CLASS =
  "h-6 w-full border-0 bg-transparent px-1 text-[10px] shadow-none focus-visible:bg-accentSoft [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

function TemplateEditableRow({
  item,
  isTemporary,
  readOnly,
  onUpdateRow,
  onRemoveRow,
}: {
  item: EstimateRowItem;
  isTemporary: boolean;
  readOnly: boolean;
  onUpdateRow: TemplateSheetHandlers["onUpdateRow"];
  onRemoveRow: TemplateSheetHandlers["onRemoveRow"];
}) {
  const [draftItemId, setDraftItemId] = useState(item.id);
  const [draft, setDraft] = useState(() => ({
    material: item.material,
    quantity: String(item.quantity),
    unit: item.unit,
    unitCost: String(item.itemCost),
  }));
  if (draftItemId !== item.id) {
    setDraftItemId(item.id);
    setDraft({
      material: item.material,
      quantity: String(item.quantity),
      unit: item.unit,
      unitCost: String(item.itemCost),
    });
  }

  function commitText(field: "material" | "unit") {
    const nextValue = draft[field].trim();
    if (!nextValue || nextValue === item[field]) {
      setDraft((current) => ({ ...current, [field]: item[field] }));
      return;
    }
    onUpdateRow(item.id, { [field]: nextValue });
  }

  function commitNumber(field: "quantity" | "unitCost") {
    const parsed = Number(draft[field]);
    const storedValue = field === "quantity" ? item.quantity : item.itemCost;
    if (!Number.isFinite(parsed) || parsed < 0 || parsed === storedValue) {
      setDraft((current) => ({ ...current, [field]: String(storedValue) }));
      return;
    }
    onUpdateRow(item.id, { [field]: parsed });
  }

  return (
    <div
      className={cn(
        "group grid min-h-[30px] items-center border-b border-hairline/70 text-[10px] leading-4 last:border-b-0 hover:bg-surfaceMuted/30",
        TEMPLATE_SHEET_ROW_COLUMNS,
        isTemporary && "opacity-60",
      )}
      data-template-editor-row={item.id}
    >
      <ControlInput
        value={draft.material}
        aria-label={`${item.material} row name`}
        className={cn(QUIET_CELL_INPUT_CLASS, "text-ink")}
        disabled={readOnly || isTemporary}
        onChange={(event) => setDraft((current) => ({ ...current, material: event.target.value }))}
        onBlur={() => commitText("material")}
        onKeyDown={blurOnEnter}
      />
      <ControlInput
        type="number"
        min="0"
        step="0.01"
        value={draft.quantity}
        aria-label={`${item.material} quantity`}
        align="right"
        className={cn(QUIET_CELL_INPUT_CLASS, "tabular-nums")}
        disabled={readOnly || isTemporary}
        onChange={(event) => setDraft((current) => ({ ...current, quantity: event.target.value }))}
        onBlur={() => commitNumber("quantity")}
        onKeyDown={blurOnEnter}
      />
      <ControlInput
        value={draft.unit}
        aria-label={`${item.material} unit`}
        className={cn(QUIET_CELL_INPUT_CLASS, "text-secondary")}
        disabled={readOnly || isTemporary}
        onChange={(event) => setDraft((current) => ({ ...current, unit: event.target.value }))}
        onBlur={() => commitText("unit")}
        onKeyDown={blurOnEnter}
      />
      <ControlInput
        type="number"
        min="0"
        step="0.01"
        value={draft.unitCost}
        aria-label={`${item.material} unit cost`}
        align="right"
        className={cn(QUIET_CELL_INPUT_CLASS, "tabular-nums")}
        disabled={readOnly || isTemporary}
        onChange={(event) => setDraft((current) => ({ ...current, unitCost: event.target.value }))}
        onBlur={() => commitNumber("unitCost")}
        onKeyDown={blurOnEnter}
      />
      <span className="px-2 text-right font-medium tabular-nums text-ink">
        {pesoFormatter.format(item.totalItemCosts)}
      </span>
      <span className="flex items-center justify-center">
        {!readOnly ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="size-6 rounded-xs p-0 text-tertiary opacity-0 transition focus-visible:opacity-100 group-hover:opacity-100 hover:bg-dangerSoft hover:text-danger"
          aria-label={`Remove row ${item.material}`}
          disabled={isTemporary}
          onClick={() => onRemoveRow(item.id)}
        >
          <Trash size={12} weight="regular" aria-hidden="true" />
        </Button>
        ) : null}
      </span>
    </div>
  );
}

function TemplateGhostRow({
  nodeId,
  nodeName,
  onAddAllowanceRow,
}: {
  nodeId: string;
  nodeName: string;
  onAddAllowanceRow: TemplateSheetHandlers["onAddAllowanceRow"];
}) {
  const [value, setValue] = useState("");

  return (
    <div className="flex min-h-[28px] items-center gap-1.5 px-1">
      <Plus size={11} weight="regular" aria-hidden="true" className="shrink-0 text-tertiary" />
      <ControlInput
        value={value}
        placeholder="Add row from library, or type to create an allowance row"
        aria-label={`Add row to ${nodeName}`}
        className="h-6 w-full border-0 bg-transparent px-0 text-[9px] text-tertiary shadow-none placeholder:text-tertiary focus-visible:bg-accentSoft"
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== "Enter") return;
          event.preventDefault();
          if (!value.trim()) return;
          onAddAllowanceRow(nodeId, value);
          setValue("");
        }}
      />
    </div>
  );
}

function TemplateSheetBranch({
  node,
  depth,
  collapsedNodeIds,
  onToggleCollapsed,
  handlers,
  surfaceVariant,
  canEdit,
}: {
  node: EstimateTreeNode;
  depth: number;
  collapsedNodeIds: Set<string>;
  onToggleCollapsed: (nodeId: string) => void;
  handlers: TemplateSheetHandlers;
  surfaceVariant: LibrarySurfaceVariant;
  canEdit: boolean;
}) {
  const collapsed = collapsedNodeIds.has(node.id);
  const isGroup = node.kind === "group";
  const isTemporary = node.id.startsWith("temp-");
  const leftIndent = Math.min(depth * 24, 144);
  const total = computeTemplateNodeTotal(node);
  const displayKind = isGroup ? "group" : "area";
  const activeDrag = useEstimateWorkshopDrag();
  const componentDragActive = canEdit && activeDrag?.kind === "library-item";
  const templateDragActive = canEdit && activeDrag?.kind === "estimate-template";
  const activeTemplateName = activeDrag?.kind === "estimate-template" ? activeDrag.templateName : "";
  const [dragOverCount, setDragOverCount] = useState(0);
  // A cancelled drag never delivers the balancing dragleave; reset once the
  // drag store empties (same idiom as the estimate sheet's drop targets).
  if (!componentDragActive && !templateDragActive && dragOverCount !== 0) setDragOverCount(0);
  // Components route into this node's first area when dropped on a group.
  const componentRouteArea = node.kind === "area" ? node : findFirstTemplateArea(node.children ?? []);
  const acceptsComponentDrop = componentDragActive && !isTemporary && componentRouteArea !== null;
  const acceptsTemplateDrop = templateDragActive && !isTemporary && isGroup;

  function handleNodeDragOver(event: DragEvent<HTMLElement>) {
    if (acceptsComponentDrop && event.dataTransfer.types.includes(LIBRARY_ITEM_DRAG_MIME_TYPE)) {
      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = "copy";
      return;
    }
    if (acceptsTemplateDrop && event.dataTransfer.types.includes(ESTIMATE_TEMPLATE_DRAG_MIME_TYPE)) {
      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = "copy";
    }
  }

  function handleNodeDragEnter(event: DragEvent<HTMLElement>) {
    if (!acceptsComponentDrop && !acceptsTemplateDrop) return;
    event.stopPropagation();
    setDragOverCount((count) => count + 1);
  }

  function handleNodeDragLeave(event: DragEvent<HTMLElement>) {
    if (!acceptsComponentDrop && !acceptsTemplateDrop) return;
    event.stopPropagation();
    setDragOverCount((count) => Math.max(0, count - 1));
  }

  function handleNodeDrop(event: DragEvent<HTMLElement>) {
    if (!canEdit) return;
    setDragOverCount(0);
    if (acceptsComponentDrop) {
      const item = readLibraryItemDropPayload(event);
      if (item && componentRouteArea) {
        event.preventDefault();
        event.stopPropagation();
        handlers.onDropLibraryItem(componentRouteArea.id, item);
        return;
      }
    }
    if (acceptsTemplateDrop) {
      const payload = readEstimateTemplateDragPayload(event.dataTransfer.getData(ESTIMATE_TEMPLATE_DRAG_MIME_TYPE));
      if (payload) {
        event.preventDefault();
        event.stopPropagation();
        handlers.onDropTemplate(node.id, payload);
      }
    }
  }

  return (
    <section
      className={cn(
        depth > 0 && "mt-1",
        !isGroup && "border border-hairline bg-surfaceMuted/20",
        (acceptsComponentDrop || acceptsTemplateDrop) && dragOverCount > 0 && "bg-surfaceMuted/50",
      )}
      aria-label={node.name}
      data-template-editor-node={node.id}
      onDragOver={handleNodeDragOver}
      onDragEnter={handleNodeDragEnter}
      onDragLeave={handleNodeDragLeave}
      onDrop={handleNodeDrop}
    >
      <div
        className={cn("group/node flex h-9 items-center gap-2 px-1", nodeHeaderClasses())}
        style={{ paddingLeft: `${leftIndent + 8}px` }}
      >
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`${collapsed ? "Expand" : "Collapse"} ${node.name} ${displayKind}`}
          aria-expanded={!collapsed}
          className="size-6 rounded-xs p-0 text-tertiary"
          onClick={() => onToggleCollapsed(node.id)}
        >
          <CaretDown size={13} weight="regular" aria-hidden="true" className={collapsed ? "-rotate-90" : ""} />
        </Button>
        <span className="flex size-6 shrink-0 items-center justify-center text-tertiary">
          <NodeIcon />
        </span>
        <p
          className={cn("min-w-0 flex-1", nodeNameClasses())}
          onDoubleClick={() => {
            if (canEdit) handlers.onRenameNode(node);
          }}
          title={canEdit ? "Double-click to rename" : undefined}
        >
          {node.name}
        </p>
        {canEdit ? (
        <span className="flex items-center gap-1 opacity-0 transition focus-within:opacity-100 group-hover/node:opacity-100">
          {isGroup ? (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="size-6 rounded-xs p-0 text-tertiary"
                aria-label={`Add group inside ${node.name}`}
                disabled={isTemporary}
                onClick={() => handlers.onAddNode(node.id, "group")}
              >
                <FolderSimple size={12} weight="regular" aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="size-6 rounded-xs p-0 text-tertiary"
                aria-label={`Add area inside ${node.name}`}
                disabled={isTemporary}
                onClick={() => handlers.onAddNode(node.id, "area")}
              >
                <MapPin size={12} weight="regular" aria-hidden="true" />
              </Button>
            </>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-6 rounded-xs p-0 text-tertiary hover:bg-dangerSoft hover:text-danger"
            aria-label={`Delete ${displayKind} ${node.name}`}
            disabled={isTemporary}
            onClick={() => handlers.onDeleteNode(node)}
          >
            <Trash size={12} weight="regular" aria-hidden="true" />
          </Button>
        </span>
        ) : null}
        <span className={nodeTotalClasses()}>{pesoFormatter.format(total)}</span>
      </div>

      {!collapsed ? (
        <div className="mt-1 space-y-1" style={{ paddingLeft: `${leftIndent + 8}px` }}>
          {(node.children ?? []).map((child) => (
            <TemplateSheetBranch
              key={child.id}
              node={child}
              depth={depth + 1}
              collapsedNodeIds={collapsedNodeIds}
              onToggleCollapsed={onToggleCollapsed}
              handlers={handlers}
              surfaceVariant={surfaceVariant}
              canEdit={canEdit}
            />
          ))}
          {node.kind === "area" ? (
            <div className={cn("overflow-hidden border border-hairline", librarySurfaceClass(surfaceVariant, "denseTable"))}>
              {(node.estimateRowItems ?? []).map((item) => (
                <TemplateEditableRow
                  key={item.id}
                  item={item}
                  isTemporary={item.id.startsWith("temp-")}
                  readOnly={!canEdit}
                  onUpdateRow={handlers.onUpdateRow}
                  onRemoveRow={handlers.onRemoveRow}
                />
              ))}
              {canEdit && !isTemporary ? (
                <TemplateGhostRow nodeId={node.id} nodeName={node.name} onAddAllowanceRow={handlers.onAddAllowanceRow} />
              ) : null}
            </div>
          ) : null}
          {acceptsComponentDrop && node.kind === "area" && componentRouteArea ? (
            <div className="py-1" data-template-component-drop-zone={componentRouteArea.id}>
              <EstimateDropZone
                label={`Drop to add the component to ${componentRouteArea.name}`}
                isDragOver={dragOverCount > 0}
              />
            </div>
          ) : null}
          {acceptsTemplateDrop ? (
            <div className="py-1" data-template-template-drop-zone={node.id}>
              <EstimateDropZone
                label={`Drop ${activeTemplateName || "template"} into ${node.name}`}
                isDragOver={dragOverCount > 0}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function collectTemplateNodeIds(nodes: EstimateTreeNode[]): string[] {
  const ids: string[] = [];
  function visit(node: EstimateTreeNode) {
    ids.push(node.id);
    node.children?.forEach(visit);
  }
  nodes.forEach(visit);
  return ids;
}

/**
 * Center work surface of the template editor: estimate-sheet anatomy
 * (group/area header rows, item rows, sticky column header) over template
 * data, with inline editing and node actions.
 */
export function TemplateEditorSheet({
  template,
  selectedNodeId,
  handlers,
  canEdit = true,
}: {
  template: EstimateTemplate;
  selectedNodeId: string | null;
  handlers: TemplateSheetHandlers;
  canEdit?: boolean;
}) {
  const surfaceVariant = useLibrarySurfaceVariant();
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedNodeIds, setCollapsedNodeIds] = useState<Set<string>>(() => new Set());
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const visibleNodes = useMemo(
    () =>
      template.nodes
        .map((node) => filterTemplateSheetNode(node, searchQuery))
        .filter((node): node is EstimateTreeNode => node !== null),
    [searchQuery, template.nodes],
  );
  const summary = useMemo(() => summarizeEstimateTemplate(template), [template]);
  const isEmpty = template.nodes.length === 0;
  const activeDrag = useEstimateWorkshopDrag();
  const rootTemplateDragActive = canEdit && activeDrag?.kind === "estimate-template";
  const rootActiveTemplateName = activeDrag?.kind === "estimate-template" ? activeDrag.templateName : "";
  const [rootDragOverCount, setRootDragOverCount] = useState(0);
  if (!rootTemplateDragActive && rootDragOverCount !== 0) setRootDragOverCount(0);

  function handleRootTemplateDrop(event: DragEvent<HTMLElement>) {
    if (!canEdit) return;
    setRootDragOverCount(0);
    const payload = readEstimateTemplateDragPayload(event.dataTransfer.getData(ESTIMATE_TEMPLATE_DRAG_MIME_TYPE));
    if (!payload) return;
    event.preventDefault();
    event.stopPropagation();
    handlers.onDropTemplate(null, payload);
  }

  const rootTemplateDropZone = rootTemplateDragActive ? (
    <div
      className="py-1"
      data-template-root-drop-zone="true"
      onDragEnter={(event) => {
        if (!event.dataTransfer.types.includes(ESTIMATE_TEMPLATE_DRAG_MIME_TYPE)) return;
        setRootDragOverCount((count) => count + 1);
      }}
      onDragLeave={(event) => {
        if (!event.dataTransfer.types.includes(ESTIMATE_TEMPLATE_DRAG_MIME_TYPE)) return;
        setRootDragOverCount((count) => Math.max(0, count - 1));
      }}
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes(ESTIMATE_TEMPLATE_DRAG_MIME_TYPE)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
      }}
      onDrop={handleRootTemplateDrop}
    >
      <EstimateDropZone
        label={`Drop ${rootActiveTemplateName || "template"} here to add it at the template root`}
        isDragOver={rootDragOverCount > 0}
      />
    </div>
  ) : null;

  // "Add area" targets the selected group, or the only root group.
  const selectedNode = selectedNodeId ? findTemplateNode(template.nodes, selectedNodeId) : null;
  const areaTargetGroup =
    selectedNode?.kind === "group"
      ? selectedNode
      : template.nodes.length === 1 && template.nodes[0]?.kind === "group"
        ? template.nodes[0]
        : null;

  function toggleCollapsed(nodeId: string) {
    setCollapsedNodeIds((current) => {
      const next = new Set(current);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }

  return (
    <section
      className={cn(
        "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden",
        librarySurfaceClass(surfaceVariant, "centerColumn"),
      )}
      aria-label="Template content"
      data-template-editor-sheet="true"
    >
      <header className={cn("sticky top-0 z-30", librarySurfaceClass(surfaceVariant, "sheetHeader"))} aria-label="Template content controls">
        <TreePanelHeader
          className={cn("static z-auto bg-transparent", librarySurfaceClass(surfaceVariant, "railPanelHeader"))}
          toolbarClassName={librarySurfaceClass(surfaceVariant, "toolbar")}
          showToolbarBottomBorder={surfaceVariant !== "glass"}
          ariaLabel="Template content tools"
          labelPrefix="template content"
          searchValue={searchQuery}
          onSearchValueChange={setSearchQuery}
          searchPlaceholder="Search template"
          searchLabel="Search template"
          searchInputRef={searchInputRef}
          showDefaultActions={false}
          onExpandAll={() => setCollapsedNodeIds(new Set())}
          onCollapseAll={() => setCollapsedNodeIds(new Set(collectTemplateNodeIds(template.nodes)))}
          addActions={canEdit ? [
            {
              label: "Add group",
              visibleLabel: "Add group",
              showVisibleLabel: true,
              icon: <FolderSimple size={12} weight="regular" aria-hidden="true" />,
              className: "text-secondary hover:bg-surfaceMuted hover:text-ink focus-visible:bg-surfaceMuted focus-visible:text-ink",
              onClick: () => handlers.onAddNode(selectedNode?.kind === "group" ? selectedNode.id : null, "group"),
            },
            {
              label: "Add area",
              visibleLabel: "Add area",
              showVisibleLabel: true,
              icon: <MapPin size={12} weight="regular" aria-hidden="true" />,
              className: "text-secondary hover:bg-surfaceMuted hover:text-ink focus-visible:bg-surfaceMuted focus-visible:text-ink",
              disabled: !areaTargetGroup,
              onClick: () => {
                if (areaTargetGroup) handlers.onAddNode(areaTargetGroup.id, "area");
              },
            },
          ] : []}
        />
        <div
          className={cn(
            "grid min-h-7 items-center border-b border-hairline text-[8px] font-medium leading-3 text-tertiary",
            surfaceVariant === "glass" ? "estimate-glass-headchrome" : "bg-white",
            TEMPLATE_SHEET_ROW_COLUMNS,
          )}
          aria-hidden="true"
        >
          <span className="px-1">Item</span>
          <span className="px-1 text-right">Qty</span>
          <span className="px-1">Unit</span>
          <span className="px-1 text-right">Unit cost</span>
          <span className="px-2 text-right">Total</span>
          <span />
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-auto p-2">
        {isEmpty ? (
          <div className="flex h-full min-h-32 flex-col items-center justify-center gap-2 rounded-xs border border-dashed border-hairline bg-surfaceMuted/20 p-4 text-center">
            <p className="max-w-sm text-[10px] leading-4 text-tertiary">
              Drag components here from the right panel, or add a group to start the structure.
            </p>
            {rootTemplateDropZone ? <div className="w-full max-w-sm">{rootTemplateDropZone}</div> : null}
          </div>
        ) : visibleNodes.length === 0 ? (
          <div className="flex h-full min-h-32 items-center justify-center p-4 text-center">
            <p className="text-[10px] leading-4 text-tertiary">No template rows match &quot;{searchQuery}&quot;.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {visibleNodes.map((node) => (
              <TemplateSheetBranch
                key={node.id}
                node={node}
                depth={0}
                collapsedNodeIds={collapsedNodeIds}
                onToggleCollapsed={toggleCollapsed}
                handlers={handlers}
                surfaceVariant={surfaceVariant}
                canEdit={canEdit}
              />
            ))}
            {rootTemplateDropZone}
          </div>
        )}
      </div>

      <footer className="flex h-9 shrink-0 items-center justify-between gap-2 border-t border-hairline px-2">
        <p className="flex items-baseline gap-2">
          <span className="text-[9px] font-medium leading-3 text-tertiary">Template total</span>
          <span className="text-[12px] font-medium leading-4 tabular-nums text-ink">
            {pesoFormatter.format(summary.total)}
          </span>
        </p>
        <p className="truncate text-[9px] leading-3 text-tertiary">
          Totals are reference pricing: estimates re-price on insert
        </p>
      </footer>
    </section>
  );
}
