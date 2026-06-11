"use client";

import { type Dispatch, type DragEvent, type InputHTMLAttributes, type KeyboardEvent, type MouseEvent, type SetStateAction, createContext, memo, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ArrowsOutSimple, CaretDown, ClockCounterClockwise, Cube, DotsSixVertical, DotsThreeVertical, FileXls, FolderSimple, MapPin, Plus, Trash, X } from "@phosphor-icons/react/dist/ssr";

import { BulkActionToolbar } from "@/components/ui/bulk-action-toolbar";
import { Button } from "@/components/ui/button";
import { ControlInput } from "@/components/ui/control-input";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { Skeleton } from "@/components/ui/skeleton";
import { TreePanelHeader } from "@/components/ui/tree-panel-header";
import { dispatchProjectTotalChange } from "@/components/workshop/ProjectTotalHeader";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useEstimateRowMutations } from "@/hooks/use-estimate-row-mutations";
import { useStableCallback } from "@/hooks/use-stable-callback";
import { loadCurrentWorkspaceComponentLibrary } from "@/lib/component-library/actions";
import { useEstimateCursorCollaboration, type RemoteEstimateCursor } from "@/hooks/use-estimate-cursor-broadcast";
import { useEstimateAreaTreeQuery } from "@/hooks/use-estimate-query";
import { resolveEstimateWorkspaceSelection, useEstimateWorkspaceSelection, useEstimateWorkspaceState } from "@/hooks/use-estimate-workspace-state";
import { fetchEstimateSheetVersionControl, insertEstimateTemplateIntoEstimate, insertEstimateTemplateNodeIntoEstimate, wrapEstimateAreaAndInsertTemplate, type EstimateSheetVersionControlData } from "@/lib/estimates/actions";
import { getCollaborationColorForUser } from "@/lib/collaboration/colors";
import { getEstimateNodeDisplayKind, getEstimateWrapGroupName } from "@/lib/estimates/tree-hierarchy";
import { buildProposalExportModel } from "@/lib/proposal-export/build-proposal-export-model";
import type { ProposalExportMetadata, ProposalExportModel } from "@/lib/proposal-export/types";
import type { ComponentLibraryTaxonomyNode } from "@/lib/component-library/taxonomy";
import { cn } from "@/lib/ui/cn";
import { EstimateRightSidebar } from "./component-library";
import type { LibraryFolderRecord } from "@/lib/component-library/library-folder-reorder";
import type { ComponentLibraryBrand } from "@/lib/repositories/component-library-repository";
import { CommandPalette } from "./component-library/CommandPalette";
import {
  ESTIMATE_TEMPLATE_DRAG_MIME_TYPE,
  INSERT_ESTIMATE_TEMPLATE_EVENT,
  readEstimateTemplateDragPayload,
  type EstimateTemplate,
  type EstimateTemplateDragPayload,
  type InsertEstimateTemplateEventDetail,
} from "./component-library/templates";
import { useEstimateWorkshopDrag } from "./estimate-workshop-drag";
import { reportEstimateRowItemsTableRender, reportEstimateSheetContentRender } from "./estimate-sheet-render-probe";
import type { ComponentLibrarySupplierOption } from "./component-library/tree/buildLibraryTree";
import { findEstimateNode, sampleEstimateTree, type EstimateTreeNode, type EstimateRowItem } from "./estimate-tree-data";
import { ProposalExportPreviewDialog } from "./ProposalExportPreviewDialog";
import {
  ActivityHistoryModal,
  BLANK_ESTIMATE_ROW_AUDIT_LABEL,
  BLANK_ESTIMATE_ROW_COMPONENT_LABEL,
  BLANK_ESTIMATE_ROW_TAG,
  DEFAULT_ACTIVITY_FILTERS,
  RowDetailsModal,
  clampContingencyPercentage,
  createActivityFilterKey,
  formatPeso,
  getActivityFilterInput,
  getActivityScopeKey,
  // Aliased: the helpers barrel re-exported below also has a
  // getComponentImageUrl with a different parameter type.
  getComponentImageUrl as getMaterialCardImageUrl,
  isBlankEstimateRowItem,
  pesoFormatter,
  toEditableContingencyMode,
  type ActivityFilterState,
  type ActivityScopeTreeItem,
  type CostAdjustmentMode,
  type EstimateActivityScope,
  type EstimateMaterialCardItem,
  type FlattenedEstimateRow,
  type RowDetailTab,
  type RowDetailsState,
} from "./estimate-sheet/activity-history";

/* Re-export component library helpers and sidebar so existing imports don't break */
export {
  createComponent,
  createDefaultLibraryBundles,
  exportLibraryItemsToCsv,
  expandLibraryBundle,
  exportLibraryItemsToJson,
  filterComponents,
  getComponentDesignation,
  getComponentDiscipline,
  getComponentImageUrl,
  getLibraryBundleTotal,
  getComponentName,
  getComponentPrice,
  getStalenessLabel,
  getStalenessTone,
  groupComponents,
  parseLibraryCsv,
  parseLibraryImportText,
  parseLibraryJson,
  readLibraryPreferences,
  safeSetJsonStorage,
  searchComponents,
  sortComponents,
} from "./component-library/helpers";
export { EstimateRightSidebar } from "./component-library";
export { pesoFormatter };

type EstimateSheetContentProps = {
  selectedNodeId: string | null;
  nodes?: EstimateTreeNode[];
  projectId?: string;
  estimateId?: string;
  collaborationUserId?: string | null;
  collaborationDisplayName?: string | null;
  proposalExportMetadata?: ProposalExportMetadata;
  renderSidebar?: boolean;
  libraryItems?: EstimateRowItem[];
  libraryTemplates?: EstimateTemplate[];
  libraryCategoryTree?: ComponentLibraryTaxonomyNode[];
  librarySuppliers?: ComponentLibrarySupplierOption[];
  libraryBrands?: ComponentLibraryBrand[];
  libraryFolders?: LibraryFolderRecord[];
};

const EMPTY_ESTIMATE_TEMPLATES: EstimateTemplate[] = [];
// Shared empty-rows identity: branches render a row table per node, and a
// fresh [] per render would defeat the table's memo comparator.
const EMPTY_ESTIMATE_ROW_ITEMS: EstimateRowItem[] = [];
const LIBRARY_ITEM_DRAG_MIME_TYPE = "application/x-archestimator-library-item";
const ESTIMATE_COMPONENT_DRAG_MIME_TYPE = "application/x-archestimator-estimate-component";

type BreadcrumbNode = { id: string; name: string };

type EstimateSheetExpansionContextValue = {
  collapsedNodeIds: Set<string>;
  setCollapsedNodeIds: Dispatch<SetStateAction<Set<string>>>;
};

const EstimateSheetExpansionContext = createContext<EstimateSheetExpansionContextValue | null>(null);

function useEstimateSheetExpansion() {
  const context = useContext(EstimateSheetExpansionContext);
  if (!context) throw new Error("useEstimateSheetExpansion must be used inside EstimateSheetExpansionContext.Provider");
  return context;
}

function collectAllNodeIds(nodes: EstimateTreeNode[]): string[] {
  const ids: string[] = [];
  function visit(node: EstimateTreeNode) {
    ids.push(node.id);
    node.children?.forEach(visit);
  }
  nodes.forEach(visit);
  return ids;
}

type EstimateSheetBranchProps = {
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

type EstimateComponentDragPayload = {
  rowItemId: string;
  item: EstimateRowItem;
};

function groupGap(depth: number, kind?: EstimateTreeNode["kind"], usesSiblingGroupRhythm = false) {
  if (kind === "area" && depth > 0 && !usesSiblingGroupRhythm) return "mt-0";
  if (depth === 0) return "mt-0";
  if (depth === 1) return "mt-5";
  return "mt-4";
}

function findNodePath(nodes: EstimateTreeNode[], targetId: string): EstimateTreeNode[] {
  for (const node of nodes) {
    if (node.id === targetId) return [node];
    if (node.children) {
      const childPath = findNodePath(node.children, targetId);
      if (childPath.length > 0) return [node, ...childPath];
    }
  }
  return [];
}

function computeNodeCode(nodes: EstimateTreeNode[], targetId: string): string {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (node.id === targetId) return String(i + 1).padStart(2, "0");
    if (node.children) {
      const childCode = computeNodeCode(node.children, targetId);
      if (childCode) return `${String(i + 1).padStart(2, "0")}.${childCode}`;
    }
  }
  return "";
}

function getNodeCode(parentCode: string, siblingIndex: number): string {
  const segment = String(siblingIndex + 1).padStart(2, "0");
  return parentCode ? `${parentCode}.${segment}` : segment;
}

function nodeHeaderClasses(kind: EstimateTreeNode["kind"]) {
  if (kind === "group") {
    return "border border-hairline bg-surfaceMuted border-l-2 border-l-divider hover:bg-[#EAEEF3]";
  }
  return "hover:bg-surfaceMuted/40";
}

function nodeNameClasses(kind: EstimateTreeNode["kind"]) {
  if (kind === "group") return "truncate text-[10px] font-medium text-ink";
  return "truncate text-[10px] font-medium text-secondary";
}

function nodeTotalClasses(kind: EstimateTreeNode["kind"]) {
  if (kind === "group") return "shrink-0 text-right text-[10px] font-medium tabular-nums text-ink";
  return "shrink-0 text-right text-[10px] font-normal tabular-nums text-ink";
}

function NodeIcon({ kind }: { kind: EstimateTreeNode["kind"] }) {
  if (getEstimateNodeDisplayKind(kind) === "group") return <FolderSimple size={13} weight="regular" aria-hidden="true" />;
  return <MapPin size={13} weight="regular" aria-hidden="true" />;
}

function focusEstimateCell(rowIndex: number, cellIndex: number) {
  const nextCell = document.querySelector<HTMLInputElement | HTMLSelectElement>(
    `[data-estimate-row-index="${rowIndex}"][data-estimate-cell-index="${cellIndex}"]`,
  );
  nextCell?.focus();
  if (nextCell instanceof HTMLInputElement) nextCell.select();
}

function handleEstimateCellKeyDown(event: KeyboardEvent<HTMLInputElement | HTMLSelectElement>, rowIndex: number, cellIndex: number) {
  if (event.key === "Enter") {
    event.preventDefault();
    event.currentTarget.blur();
    return;
  }

  const keyMap: Record<string, [number, number]> = {
    ArrowRight: [rowIndex, cellIndex + 1],
    ArrowLeft: [rowIndex, cellIndex - 1],
    ArrowDown: [rowIndex + 1, cellIndex],
    ArrowUp: [rowIndex - 1, cellIndex],
  };
  const target = keyMap[event.key];
  if (!target) return;
  event.preventDefault();
  focusEstimateCell(target[0], target[1]);
}

function toEditableNumber(value: number) {
  return Number.isInteger(value) ? String(value) : String(value);
}

function calculateContingencyValue(subTotal: number, contingencyPercentage: number) {
  return (subTotal * contingencyPercentage) / 100;
}

function calculateRowTotal(subTotal: number, miscCost: number, contingencyPercentage: number) {
  return subTotal + miscCost + calculateContingencyValue(subTotal, contingencyPercentage);
}

function updateEditableRowValue(
  current: Record<string, EditableRowValue>,
  item: EstimateRowItem,
  patchValue: Partial<EditableRowValue>,
) {
  const currentRow = current[item.id];
  return {
    ...current,
    [item.id]: {
      quantity: currentRow?.quantity ?? toEditableNumber(item.quantity),
      contingencyMode: currentRow?.contingencyMode ?? toEditableContingencyMode(item.contingencyPercentage ?? 0),
      contingencyPercentage: currentRow?.contingencyPercentage ?? toEditableContingencyPercentage(item.contingencyPercentage ?? 0),
      miscCost: currentRow?.miscCost ?? toEditableNumber(item.miscCost),
      ...patchValue,
    },
  };
}

type EditableRowValue = {
  quantity: string;
  contingencyMode: CostAdjustmentMode;
  contingencyPercentage: string;
  miscCost: string;
};

const COST_ADJUSTMENT_MODE_OPTIONS: readonly { value: CostAdjustmentMode; label: string }[] = [
  { value: "contingency", label: "Contingency" },
  { value: "discount", label: "Discount" },
];

function parseEditableNumber(value: string) {
  const parsed = Number(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseNonNegativeEditableNumber(value: string) {
  return Math.max(0, parseEditableNumber(value));
}

function clampCostAdjustmentMagnitude(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.abs(value)));
}

function parseCostAdjustmentPercentage(value: string, mode: CostAdjustmentMode) {
  const magnitude = clampCostAdjustmentMagnitude(parseEditableNumber(value));
  return mode === "discount" ? -magnitude : magnitude;
}

function parseEditableContingencyPercentage(editableRow: Pick<EditableRowValue, "contingencyMode" | "contingencyPercentage">) {
  return parseCostAdjustmentPercentage(editableRow.contingencyPercentage, editableRow.contingencyMode);
}

function toEditableContingencyPercentage(value: number) {
  return toEditableNumber(Math.abs(clampContingencyPercentage(value)));
}

function formatEditableMoney(value: string) {
  return pesoFormatter.format(parseNonNegativeEditableNumber(value)).replace("₱", "₱ ");
}

function getInitialEditableRow(item: EstimateRowItem): EditableRowValue {
  return {
    quantity: toEditableNumber(item.quantity),
    contingencyMode: toEditableContingencyMode(item.contingencyPercentage ?? 0),
    contingencyPercentage: toEditableContingencyPercentage(item.contingencyPercentage ?? 0),
    miscCost: toEditableNumber(item.miscCost),
  };
}

function readEstimateComponentDragPayload(event: DragEvent<HTMLElement>): EstimateComponentDragPayload | null {
  const payload = event.dataTransfer.getData(ESTIMATE_COMPONENT_DRAG_MIME_TYPE);
  if (!payload) return null;

  try {
    const parsed = JSON.parse(payload) as Partial<EstimateComponentDragPayload>;
    if (typeof parsed.rowItemId !== "string" || !parsed.item) return null;
    return parsed as EstimateComponentDragPayload;
  } catch {
    return null;
  }
}

function isProjectSpecificRowItem(item: EstimateRowItem) {
  return item.linkState === "detached";
}

function canMakeProjectSpecific(item: EstimateRowItem) {
  if (isBlankEstimateRowItem(item) || isProjectSpecificRowItem(item)) return false;
  return Boolean(item.sourceLibraryItemId || item.linkState?.startsWith("linked") || item.linkState === "source-changed");
}

function createBlankEstimateRowTemplate(): EstimateRowItem {
  return {
    id: "manual-estimate-row-template",
    material: BLANK_ESTIMATE_ROW_COMPONENT_LABEL,
    description: "",
    supplier: "",
    source: "project",
    unit: "unit",
    itemCost: 0,
    quantity: 1,
    subTotal: 0,
    contingencyPercentage: 0,
    contingencyValue: 0,
    miscCost: 0,
    totalItemCosts: 0,
    category: "Unassigned",
    tags: [BLANK_ESTIMATE_ROW_TAG],
    pricingSource: "Manual estimate row",
    pricingDate: new Date().toISOString().slice(0, 10),
    confidence: "unpriced",
  };
}

function collectEditableRows(nodes: EstimateTreeNode[]) {
  const rows: Record<string, EditableRowValue> = {};

  function visit(node: EstimateTreeNode) {
    node.estimateRowItems?.forEach((item) => {
      rows[item.id] = getInitialEditableRow(item);
    });
    node.children?.forEach(visit);
  }

  nodes.forEach(visit);
  return rows;
}

function computeRowTotal(item: EstimateRowItem, editableRows: Record<string, EditableRowValue>) {
  const editableRow = editableRows[item.id] ?? getInitialEditableRow(item);
  const quantity = parseNonNegativeEditableNumber(editableRow.quantity);
  const contingencyPercentage = parseEditableContingencyPercentage(editableRow);
  const miscCost = parseNonNegativeEditableNumber(editableRow.miscCost);
  const subTotal = item.itemCost * quantity;
  return calculateRowTotal(subTotal, miscCost, contingencyPercentage);
}

function computeNodeTotal(node: EstimateTreeNode, editableRows: Record<string, EditableRowValue>): number {
  const rowTotal = (node.estimateRowItems ?? []).reduce((total, item) => total + computeRowTotal(item, editableRows), 0);
  const childTotal = (node.children ?? []).reduce((total, child) => total + computeNodeTotal(child, editableRows), 0);
  return rowTotal + childTotal;
}

function materializeEditableEstimateTree(nodes: EstimateTreeNode[], editableRows: Record<string, EditableRowValue>): EstimateTreeNode[] {
  return nodes.map((node) => ({
    ...node,
    estimateRowItems: node.estimateRowItems?.map((item) => {
      const editableRow = editableRows[item.id];
      if (!editableRow) return item;

      const quantity = parseNonNegativeEditableNumber(editableRow.quantity);
      const contingencyPercentage = parseEditableContingencyPercentage(editableRow);
      const miscCost = parseNonNegativeEditableNumber(editableRow.miscCost);
      const subTotal = item.itemCost * quantity;
      const contingencyValue = calculateContingencyValue(subTotal, contingencyPercentage);

      return {
        ...item,
        quantity,
        contingencyPercentage,
        contingencyValue,
        miscCost,
        subTotal,
        totalItemCosts: subTotal + miscCost + contingencyValue,
      };
    }),
    children: node.children ? materializeEditableEstimateTree(node.children, editableRows) : node.children,
  }));
}

function flattenEstimateRows(nodes: EstimateTreeNode[], editableRows: Record<string, EditableRowValue>): FlattenedEstimateRow[] {
  const rows: FlattenedEstimateRow[] = [];

  function visit(node: EstimateTreeNode, path: string[]) {
    const nodePath = [...path, node.name];
    node.estimateRowItems?.forEach((item) => {
      const editableRow = editableRows[item.id] ?? getInitialEditableRow(item);
      const quantity = parseNonNegativeEditableNumber(editableRow.quantity);
      const contingencyPercentage = parseEditableContingencyPercentage(editableRow);
      const miscCost = parseNonNegativeEditableNumber(editableRow.miscCost);
      const subTotal = item.itemCost * quantity;
      const contingencyValue = calculateContingencyValue(subTotal, contingencyPercentage);
      rows.push({
        item,
        nodeId: node.id,
        nodePath,
        quantity,
        contingencyPercentage,
        contingencyValue,
        miscCost,
        lineTotal: subTotal + miscCost + contingencyValue,
      });
    });
    node.children?.forEach((child) => visit(child, nodePath));
  }

  nodes.forEach((node) => visit(node, []));
  return rows;
}

function createProposalPreviewSignature(nodes: EstimateTreeNode[], editableRows: Record<string, EditableRowValue>, metadata: ProposalExportMetadata | null) {
  const parts: string[] = [metadata ? `${metadata.projectId}|${metadata.estimateId}|${metadata.projectName}|${metadata.estimateName}|${metadata.versionLabel}|${metadata.currency}` : "no-metadata"];

  function visit(node: EstimateTreeNode) {
    parts.push(`node:${node.id}|${node.kind}|${node.name}`);
    node.estimateRowItems?.forEach((item) => {
      const editableRow = editableRows[item.id] ?? getInitialEditableRow(item);
      parts.push([
        "row",
        item.id,
        item.material,
        item.description,
        item.category,
        item.designation,
        item.unit,
        item.itemCost,
        editableRow.quantity,
        editableRow.contingencyMode,
        editableRow.contingencyPercentage,
        editableRow.miscCost,
        item.supplier,
        item.pricingSource,
        item.pricingDate,
      ].join("|"));
    });
    node.children?.forEach(visit);
  }

  nodes.forEach(visit);
  return parts.join("\n");
}

/**
 * Dashed drop surface, rendered only while a compatible drag is in flight
 * (drag suppresses CSS hover, so the highlight is driven by `isDragOver`).
 */
function EstimateDropZone({ label, isDragOver = false }: { label: string; isDragOver?: boolean }) {
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

function EstimateMaterialCardContent({ item }: { item: EstimateMaterialCardItem }) {
  return (
    <>
      <div className="flex gap-2">
        <div
          className="size-14 shrink-0 rounded-xs bg-neutral-100 bg-cover bg-center"
          style={{ backgroundImage: `url(${getMaterialCardImageUrl(item)})` }}
          aria-label={`${item.material} reference image`}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="min-w-0 pr-[92px]">
            <p className="truncate text-[11px] font-medium leading-4 text-ink">{item.material}</p>
            <p className="truncate text-[10px] font-medium leading-4 text-tertiary">{item.supplier}</p>
          </div>
          <div className="flex flex-1 items-start justify-end">
            <p className="whitespace-nowrap text-[9px] font-medium leading-4 tabular-nums text-ink">{pesoFormatter.format(item.itemCost).replace("₱", "₱ ")}</p>
          </div>
        </div>
      </div>
      <div className="flex items-start justify-between gap-2">
        <p className="truncate text-[10px] leading-4 text-secondary/60 transition-opacity group-hover:text-secondary" title={item.description}>
          {item.description}
        </p>
        <p className="shrink-0 whitespace-nowrap text-[10px] font-medium leading-3 text-tertiary">/ {item.unit}</p>
      </div>
    </>
  );
}

function EstimateMaterialCell({
  item,
  isReplaceTarget,
  onReplaceDragOver,
  onReplaceDragLeave,
  onReplace,
  onClearComponent,
  onRequestProjectSpecific,
  onMoveComponent,
  onOpenComponentDetails,
}: {
  item: EstimateRowItem;
  isReplaceTarget: boolean;
  onReplaceDragOver: () => void;
  onReplaceDragLeave: () => void;
  onReplace: (libraryItem: EstimateRowItem) => void;
  onClearComponent: () => void;
  onRequestProjectSpecific: () => void;
  onMoveComponent: (sourceRowItemId: string, targetRowItemId: string, movedItem: EstimateRowItem) => void;
  onOpenComponentDetails: (opener: HTMLElement) => void;
}) {
  function handleReplacementDragOver(event: DragEvent<HTMLDivElement>) {
    if (event.dataTransfer.types.includes(LIBRARY_ITEM_DRAG_MIME_TYPE)) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
      onReplaceDragOver();
      return;
    }

    if (event.dataTransfer.types.includes(ESTIMATE_COMPONENT_DRAG_MIME_TYPE)) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      onReplaceDragOver();
    }
  }

  function handleReplacementDrop(event: DragEvent<HTMLDivElement>) {
    const movedComponent = readEstimateComponentDragPayload(event);
    if (movedComponent) {
      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = "move";
      onReplaceDragLeave();
      onMoveComponent(movedComponent.rowItemId, item.id, movedComponent.item);
      return;
    }

    const payload = event.dataTransfer.getData(LIBRARY_ITEM_DRAG_MIME_TYPE);
    if (!payload) return;
    event.preventDefault();
    event.stopPropagation();
    onReplaceDragLeave();
    onReplace(JSON.parse(payload) as EstimateRowItem);
  }

  function handleComponentDragStart(event: DragEvent<HTMLButtonElement>) {
    event.stopPropagation();
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(ESTIMATE_COMPONENT_DRAG_MIME_TYPE, JSON.stringify({ rowItemId: item.id, item } satisfies EstimateComponentDragPayload));
  }

  function handleComponentDragEnd(event: DragEvent<HTMLButtonElement>) {
    if (event.dataTransfer.dropEffect === "move") return;
    onClearComponent();
  }

  if (isBlankEstimateRowItem(item)) {
    return (
      <div
        className={cn(
          "flex h-full min-h-24 flex-col items-center justify-center gap-1.5 overflow-hidden border border-dashed border-hairline bg-surfaceMuted/30 p-2 text-center text-tertiary opacity-50 transition hover:opacity-100",
          isReplaceTarget && "bg-blue-100 ring-2 ring-inset ring-accent opacity-100",
        )}
        onDragOver={handleReplacementDragOver}
        onDragLeave={onReplaceDragLeave}
        onDrop={handleReplacementDrop}
        data-replace-target-active={isReplaceTarget ? "true" : undefined}
        aria-label={`${BLANK_ESTIMATE_ROW_COMPONENT_LABEL} empty estimate component slot`}
        title="Drop a component here after entering row values"
      >
        <div className="flex items-center gap-1.5 text-[10px] font-normal">
          <Plus size={12} weight="regular" aria-hidden="true" />
          <span>{BLANK_ESTIMATE_ROW_COMPONENT_LABEL}</span>
        </div>
      </div>
    );
  }

  const showProjectSpecificBadge = isProjectSpecificRowItem(item);
  const showProjectSpecificAction = canMakeProjectSpecific(item);

  return (
    <div
      className={cn(
        "group relative flex h-full flex-col gap-2 overflow-hidden bg-white p-2 transition hover:bg-neutral-50",
        isReplaceTarget && "bg-blue-100 ring-2 ring-inset ring-accent",
      )}
      onDragOver={handleReplacementDragOver}
      onDragLeave={onReplaceDragLeave}
      onDrop={handleReplacementDrop}
      data-replace-target-active={isReplaceTarget ? "true" : undefined}
      aria-label={`${item.material} replaceable estimate component`}
      title="Drop another component here to replace this component"
    >
      <div className="absolute top-1 right-1 z-10 flex items-center gap-1.5" aria-label={`Component actions for ${item.material}`}>
        {showProjectSpecificAction ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-5 rounded-xs p-0 text-tertiary hover:bg-surfaceMuted hover:text-ink active:bg-surfaceMuted"
            aria-label={`Make ${item.material} project-specific`}
            title="Make project-specific"
            onClick={(event: MouseEvent<HTMLButtonElement>) => {
              event.stopPropagation();
              onRequestProjectSpecific();
            }}
          >
            <Cube size={11} weight="regular" aria-hidden="true" />
          </Button>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="size-5 rounded-xs p-0 text-tertiary hover:bg-red-50 hover:text-red-700 active:bg-red-50 focus-visible:text-red-700"
          aria-label={`Delete component ${item.material}`}
          title="Delete component"
          onClick={(event: MouseEvent<HTMLButtonElement>) => {
            event.stopPropagation();
            onClearComponent();
          }}
        >
          <Trash size={11} weight="regular" aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="size-5 rounded-xs p-0 text-tertiary hover:bg-surfaceMuted hover:text-ink active:bg-surfaceMuted"
          aria-label={`Open component details for ${item.material}`}
          title="Component details"
          onClick={(event: MouseEvent<HTMLButtonElement>) => {
            event.stopPropagation();
            onOpenComponentDetails(event.currentTarget);
          }}
        >
          <DotsThreeVertical size={11} weight="regular" aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="size-5 cursor-grab rounded-xs p-0 text-tertiary hover:bg-surfaceMuted hover:text-ink active:cursor-grabbing active:bg-surfaceMuted"
          aria-label={`Drag component ${item.material}`}
          title="Drag component"
          draggable
          onClick={(event: MouseEvent<HTMLButtonElement>) => event.stopPropagation()}
          onDragStart={handleComponentDragStart}
          onDragEnd={handleComponentDragEnd}
        >
          <DotsSixVertical size={11} weight="regular" aria-hidden="true" />
        </Button>
      </div>
      {showProjectSpecificBadge ? (
        <div className="pointer-events-none absolute top-1 left-1 z-10 rounded-xs border border-hairline bg-white px-1.5 py-0.5 text-[8px] font-medium uppercase leading-3 text-tertiary">
          Project-specific
        </div>
      ) : null}
      <EstimateMaterialCardContent item={item} />
    </div>
  );
}

function MoneyInput({
  value,
  onChange,
  ariaLabel,
  align = "right",
  onFocus,
  onBlur,
  ...cellProps
}: {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  align?: "left" | "center" | "right";
} & {
  "data-estimate-row-index"?: number;
  "data-estimate-cell-index"?: number;
  onFocus?: InputHTMLAttributes<HTMLInputElement>["onFocus"];
  onBlur?: InputHTMLAttributes<HTMLInputElement>["onBlur"];
  onKeyDown?: InputHTMLAttributes<HTMLInputElement>["onKeyDown"];
}) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <ControlInput
      type="text"
      inputMode="decimal"
      value={isFocused ? value : formatEditableMoney(value)}
      onFocus={(event) => {
        setIsFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setIsFocused(false);
        onBlur?.(event);
      }}
      onChange={(event) => onChange(event.target.value)}
      aria-label={ariaLabel}
      align={align}
      className="text-[9px] tabular-nums"
      {...cellProps}
    />
  );
}

type EstimateRowItemsTableProps = {
  items: EstimateRowItem[];
  editableRows: Record<string, EditableRowValue>;
  setEditableRows: Dispatch<SetStateAction<Record<string, EditableRowValue>>>;
  targetNodeId: string;
  onInsertLibraryItem: (targetNodeId: string, libraryItem: EstimateRowItem) => void;
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
};

// The comparator slices shared sheet state per table: a keystroke in one
// area's table must not re-render every other table. Callback props must be
// identity-stable (useStableCallback in EstimateSheetContent) — a changed
// callback identity forces a re-render to avoid stale closures.
function areEstimateRowItemsTablePropsEqual(prev: EstimateRowItemsTableProps, next: EstimateRowItemsTableProps) {
  if (
    prev.items !== next.items ||
    prev.targetNodeId !== next.targetNodeId ||
    prev.setEditableRows !== next.setEditableRows ||
    prev.onInsertLibraryItem !== next.onInsertLibraryItem ||
    prev.onReplaceRowItem !== next.onReplaceRowItem ||
    prev.onDeleteRowItem !== next.onDeleteRowItem ||
    prev.onUpdateRowItem !== next.onUpdateRowItem ||
    prev.onMarkRowDirty !== next.onMarkRowDirty ||
    prev.onOpenRowDetails !== next.onOpenRowDetails ||
    prev.onClearRowComponent !== next.onClearRowComponent ||
    prev.onRequestProjectSpecific !== next.onRequestProjectSpecific ||
    prev.onMoveRowComponent !== next.onMoveRowComponent ||
    prev.onToggleRowSelection !== next.onToggleRowSelection ||
    prev.onToggleRowsSelection !== next.onToggleRowsSelection
  ) {
    return false;
  }
  for (const item of next.items) {
    if (prev.editableRows[item.id] !== next.editableRows[item.id]) return false;
    if (prev.selectedRowIds.has(item.id) !== next.selectedRowIds.has(item.id)) return false;
  }
  return true;
}

const EstimateRowItemsTable = memo(function EstimateRowItemsTable({
  items,
  editableRows,
  setEditableRows,
  targetNodeId,
  onInsertLibraryItem,
  onReplaceRowItem,
  onDeleteRowItem,
  onUpdateRowItem,
  onMarkRowDirty,
  onOpenRowDetails,
  onClearRowComponent,
  onRequestProjectSpecific,
  onMoveRowComponent,
  selectedRowIds,
  onToggleRowSelection,
  onToggleRowsSelection,
}: EstimateRowItemsTableProps) {
  reportEstimateRowItemsTableRender(targetNodeId);
  const [focusedCell, setFocusedCell] = useState<{ rowId: string; cellIndex: number } | null>(null);
  const [replaceTargetRowId, setReplaceTargetRowId] = useState("");
  const selectableRowIds = useMemo(() => items.map((item) => item.id), [items]);
  const allRowsSelected = selectableRowIds.length > 0 && selectableRowIds.every((rowId) => selectedRowIds.has(rowId));
  const someRowsSelected = !allRowsSelected && selectableRowIds.some((rowId) => selectedRowIds.has(rowId));
  const computedRows = useMemo(
    () =>
      items.map((item) => {
        const editableRow = editableRows[item.id] ?? getInitialEditableRow(item);
        const quantity = parseNonNegativeEditableNumber(editableRow.quantity);
        const contingencyPercentage = parseEditableContingencyPercentage(editableRow);
        const miscCost = parseNonNegativeEditableNumber(editableRow.miscCost);
        const subTotal = item.itemCost * quantity;
        const contingencyValue = calculateContingencyValue(subTotal, contingencyPercentage);
        return {
          ...item,
          storedQuantity: item.quantity,
          storedContingencyPercentage: item.contingencyPercentage ?? 0,
          storedMiscCost: item.miscCost,
          editableQuantity: editableRow.quantity,
          editableContingencyMode: editableRow.contingencyMode,
          editableContingencyPercentage: editableRow.contingencyPercentage,
          editableMiscCost: editableRow.miscCost,
          quantity,
          contingencyPercentage,
          contingencyValue,
          miscCost,
          subTotal,
          totalItemCosts: subTotal + miscCost + contingencyValue,
        };
      }),
    [editableRows, items],
  );

  if (!items.length) return null;

  const rowColumns = "grid-cols-[36px_32px_minmax(160px,1fr)_58px_92px_106px_92px_108px_30px]";

  function handleDragOver(event: DragEvent) {
    if (event.dataTransfer.types.includes(LIBRARY_ITEM_DRAG_MIME_TYPE)) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    }
  }

  function handleDrop(event: DragEvent) {
    const payload = event.dataTransfer.getData(LIBRARY_ITEM_DRAG_MIME_TYPE);
    if (!payload) return;
    event.preventDefault();
    const libraryItem = JSON.parse(payload) as EstimateRowItem;
    onInsertLibraryItem(targetNodeId, libraryItem);
  }

  return (
    <div className="overflow-hidden border border-hairline bg-white" onDragOver={handleDragOver} onDrop={handleDrop}>
      <table className="w-full border-collapse text-[10px] text-ink">
        <thead className="sticky top-0 z-10 bg-white text-left text-[10px] font-medium text-ink">
          <tr className={cn("grid min-h-10 border-b border-hairline", rowColumns)}>
            <th className="flex items-center justify-center border-r border-hairline text-[9px] font-sans text-tertiary">#</th>
            <th className="flex items-center justify-center border-r border-hairline">
              <input
                type="checkbox"
                aria-label="Select all estimate row items"
                checked={allRowsSelected}
                ref={(element) => {
                  if (element) element.indeterminate = someRowsSelected;
                }}
                onChange={(event) => onToggleRowsSelection(selectableRowIds, event.currentTarget.checked)}
              />
            </th>
            <th className="flex items-center justify-center border-r border-hairline">Materials</th>
            <th className="flex items-center justify-center border-r border-hairline">Qty</th>
            <th className="flex items-center justify-center border-r border-hairline">Subtotal</th>
            <th className="flex items-center justify-center border-r border-hairline text-center text-[9px] leading-3">Adjustment</th>
            <th className="flex items-center justify-center border-r border-hairline text-center text-[9px] leading-3">Misc Cost</th>
            <th className="flex items-center justify-center border-r border-hairline text-center text-[9px] leading-3">Total Item Cost</th>
            <th className="flex items-center justify-center">
              <DotsThreeVertical size={14} weight="regular" aria-hidden="true" />
            </th>
          </tr>
        </thead>
        <tbody>
          {computedRows.map((item, rowIndex) => {
            const activeCellIndex = focusedCell?.rowId === item.id ? focusedCell.cellIndex : null;
            return (
              <tr
                key={item.id}
                className={cn(
                  "grid min-h-24 border-b border-hairline/70 last:border-b-0 hover:bg-neutral-50",
                  activeCellIndex !== null && "bg-[#F6FAFF] shadow-[inset_2px_0_0_rgba(37,99,235,0.70)]",
                  rowColumns,
                )}
                data-estimate-row-active={activeCellIndex !== null ? "true" : undefined}
              >
                <td className="flex items-center justify-center border-r border-hairline text-[9px] font-sans tabular-nums text-tertiary">
                  {String(rowIndex + 1).padStart(2, "0")}
                </td>
                <td className="flex flex-col items-center justify-between border-r border-hairline py-2 text-tertiary">
                  <span className="flex h-6 cursor-grab items-center justify-center active:cursor-grabbing">
                    <DotsSixVertical size={14} weight="regular" className="cursor-grab active:cursor-grabbing" aria-label={`Drag material ${item.material}`} />
                  </span>
                  <span className="flex h-6 items-center justify-center">
                    <input
                      type="checkbox"
                      aria-label={`Select ${item.material}`}
                      checked={selectedRowIds.has(item.id)}
                      onChange={(event) => onToggleRowSelection(item.id, event.currentTarget.checked)}
                    />
                  </span>
                  <span className="flex h-6 items-center justify-center">
                    <span className="size-3" aria-hidden="true" />
                  </span>
                </td>
                <td className="min-w-0">
                  <EstimateMaterialCell
                    item={item}
                    isReplaceTarget={replaceTargetRowId === item.id}
                    onReplaceDragOver={() => setReplaceTargetRowId(item.id)}
                    onReplaceDragLeave={() => setReplaceTargetRowId((current) => (current === item.id ? "" : current))}
                    onReplace={(libraryItem) =>
                      onReplaceRowItem(item.id, {
                        ...libraryItem,
                        quantity: item.quantity,
                        contingencyPercentage: item.contingencyPercentage,
                        contingencyValue: item.contingencyValue,
                        miscCost: item.miscCost,
                      })
                    }
                    onClearComponent={() => onClearRowComponent(item.id)}
                    onRequestProjectSpecific={() => onRequestProjectSpecific(item.id)}
                    onMoveComponent={onMoveRowComponent}
                    onOpenComponentDetails={(opener) => onOpenRowDetails(item.id, opener, "component")}
                  />
                </td>
                <td
                  className={cn(
                    "relative flex flex-col items-center justify-center border-x border-hairline px-1 text-center",
                    activeCellIndex === 0 && "bg-accent/10 ring-1 ring-inset ring-accent/30",
                  )}
                  data-estimate-cell-active={activeCellIndex === 0 ? "true" : undefined}
                >
                  <ControlInput
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.editableQuantity}
                    onChange={(event) => {
                      setEditableRows((current) => updateEditableRowValue(current, item, { quantity: event.target.value }));
                      onMarkRowDirty(item.id);
                    }}
                    onFocus={() => setFocusedCell({ rowId: item.id, cellIndex: 0 })}
                    onBlur={() => {
                      setFocusedCell((current) => (current?.rowId === item.id && current.cellIndex === 0 ? null : current));
                      if (item.quantity !== item.storedQuantity) onUpdateRowItem(item.id, { quantity: item.editableQuantity });
                    }}
                    onKeyDown={(event) => handleEstimateCellKeyDown(event, rowIndex, 0)}
                    data-estimate-row-index={rowIndex}
                    data-estimate-row-id={item.id}
                    data-estimate-cell-index={0}
                    aria-label={`${item.material} quantity`}
                    align="center"
                    className="text-[10px] tabular-nums"
                  />
                  <p className="absolute top-18 right-1 text-[10px] font-medium leading-3 text-tertiary">/ {item.unit}</p>
                </td>
                <td className="flex items-center justify-center border-r border-hairline px-1 text-center text-[9px] font-medium tabular-nums text-ink">{pesoFormatter.format(item.subTotal).replace("₱", "₱ ")}</td>
                <td
                  className={cn(
                    "relative flex items-center justify-center border-r border-hairline px-1 py-1 text-center",
                    activeCellIndex === 1 && "bg-accent/10 ring-1 ring-inset ring-accent/30",
                  )}
                  data-estimate-cell-active={activeCellIndex === 1 ? "true" : undefined}
                >
                  <div className="absolute left-1.5 top-1.5 w-[74px]">
                    <DropdownSelect
                      value={item.editableContingencyMode}
                      aria-label={`${item.material} adjustment type`}
                      options={COST_ADJUSTMENT_MODE_OPTIONS}
                      className="h-3.5 border-0 bg-transparent pl-0 pr-0 text-left !text-[8px] leading-[10px] text-secondary"
                      onValueChange={(nextValue) => {
                        const nextMode = nextValue as CostAdjustmentMode;
                        setEditableRows((current) => updateEditableRowValue(current, item, { contingencyMode: nextMode }));
                        onMarkRowDirty(item.id);
                        const nextContingencyPercentage = parseCostAdjustmentPercentage(item.editableContingencyPercentage, nextMode);
                        if (nextContingencyPercentage !== item.storedContingencyPercentage) {
                          onUpdateRowItem(item.id, { contingencyMode: nextMode, contingencyPercentage: item.editableContingencyPercentage });
                        }
                      }}
                    />
                  </div>
                  <div className="flex min-w-0 flex-col items-center justify-center gap-0.5 pt-2">
                    <div className="flex h-5 items-baseline justify-center leading-none">
                      <ControlInput
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={item.editableContingencyPercentage}
                        onChange={(event) => {
                          setEditableRows((current) => updateEditableRowValue(current, item, { contingencyPercentage: event.target.value }));
                          onMarkRowDirty(item.id);
                        }}
                        onFocus={() => setFocusedCell({ rowId: item.id, cellIndex: 1 })}
                        onBlur={() => {
                          setFocusedCell((current) => (current?.rowId === item.id && current.cellIndex === 1 ? null : current));
                          const nextContingencyPercentage = toEditableContingencyPercentage(item.contingencyPercentage);
                          setEditableRows((current) => updateEditableRowValue(current, item, { contingencyPercentage: nextContingencyPercentage }));
                          if (item.contingencyPercentage !== item.storedContingencyPercentage) {
                            onUpdateRowItem(item.id, { contingencyMode: item.editableContingencyMode, contingencyPercentage: nextContingencyPercentage });
                          }
                        }}
                        onKeyDown={(event) => handleEstimateCellKeyDown(event, rowIndex, 1)}
                        data-estimate-row-index={rowIndex}
                        data-estimate-cell-index={1}
                        aria-label={`${item.material} adjustment percentage`}
                        align="center"
                        className="h-5 w-9 border-0 bg-transparent p-0 text-right text-[10px] font-medium tabular-nums shadow-none [appearance:textfield] focus-visible:ring-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />
                      <span className="text-[10px] font-medium leading-none tabular-nums text-ink" aria-hidden="true">%</span>
                    </div>
                    <p className="max-w-full truncate text-center text-[8px] font-medium leading-[10px] tabular-nums text-tertiary">
                      {formatPeso(item.contingencyValue)}
                    </p>
                  </div>
                </td>
                <td
                  className={cn(
                    "flex items-center justify-center border-r border-hairline px-1",
                    activeCellIndex === 2 && "bg-accent/10 ring-1 ring-inset ring-accent/30",
                  )}
                  data-estimate-cell-active={activeCellIndex === 2 ? "true" : undefined}
                >
                  <MoneyInput
                    value={item.editableMiscCost}
                    align="center"
                    onChange={(value) => {
                      setEditableRows((current) => updateEditableRowValue(current, item, { miscCost: value }));
                      onMarkRowDirty(item.id);
                    }}
                    ariaLabel={`${item.material} misc cost`}
                    onFocus={() => setFocusedCell({ rowId: item.id, cellIndex: 2 })}
                    onBlur={() => {
                      setFocusedCell((current) => (current?.rowId === item.id && current.cellIndex === 2 ? null : current));
                      if (item.miscCost !== item.storedMiscCost) onUpdateRowItem(item.id, { miscCost: item.editableMiscCost });
                    }}
                    onKeyDown={(event) => handleEstimateCellKeyDown(event, rowIndex, 2)}
                    data-estimate-row-index={rowIndex}
                    data-estimate-cell-index={2}
                  />
                </td>
                <td className="flex items-center justify-end border-r border-hairline px-1 text-right">
                  <p className="text-[10px] font-medium tabular-nums text-ink">{pesoFormatter.format(item.totalItemCosts).replace("₱", "₱ ")}</p>
                </td>
                <td className="flex flex-col items-center justify-between py-2 text-tertiary">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="size-6 rounded-xs p-0 text-tertiary hover:bg-surfaceMuted hover:text-ink"
                    aria-label={`Open row details for ${item.material}`}
                    onClick={(event: MouseEvent<HTMLButtonElement>) => onOpenRowDetails(item.id, event.currentTarget, "details")}
                  >
                    <DotsThreeVertical size={14} weight="regular" aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="size-6 rounded-xs p-0 text-tertiary hover:bg-surfaceMuted hover:text-ink"
                    aria-label={`Open row activity for ${item.material}`}
                    onClick={(event: MouseEvent<HTMLButtonElement>) => onOpenRowDetails(item.id, event.currentTarget, "activity")}
                  >
                    <ArrowsOutSimple size={14} weight="regular" aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="size-6 rounded-xs p-0 text-tertiary hover:bg-red-50 hover:text-red-700 focus-visible:text-red-700"
                    aria-label={`Delete row ${item.material}`}
                    onClick={() => onDeleteRowItem(item.id)}
                  >
                    <Trash size={14} weight="regular" aria-hidden="true" />
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}, areEstimateRowItemsTablePropsEqual);

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
      className="flex h-6 w-full items-center gap-1.5 rounded-xs border border-transparent px-1.5 text-[9px] font-medium text-tertiary transition-colors hover:bg-surfaceMuted/60 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <Plus size={11} weight="regular" aria-hidden="true" />
      <span>Add row</span>
    </button>
  );
}

/**
 * Library-item drop target for an area. The dashed zone only exists while a
 * component drag is in flight; at rest the area keeps a quiet add-row
 * affordance (and, when empty, a short empty-state line) so the sheet is not
 * littered with permanent drop targets.
 */
function ComponentDropTarget({
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
          No estimate components yet. Add a row, or drag components from the library.
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
function TemplateDropZone({
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

/**
 * Empty-group guidance. Groups never take component rows, so the old
 * component drop zone was a dead affordance here; templates are the one
 * thing droppable into a group, and the TemplateDropZone takes over while a
 * template drag is active.
 */
function EmptyGroupMessage({ templateDragActive }: { templateDragActive: boolean }) {
  if (templateDragActive) return null;
  return (
    <div className="flex min-h-9 items-center rounded-xs border border-dashed border-hairline bg-surfaceMuted/20 px-1.5 py-0.5">
      <span className="text-[9px] leading-3 text-tertiary">
        No nodes in this group yet. Add a group or area from the tree, or drag an estimate template here.
      </span>
    </div>
  );
}

function EstimateSheetBranch({ node, nodeCode, ancestorPath = [], editableRows, setEditableRows, onInsertLibraryItem, onInsertTemplate, onInsertTemplateNode, onWrapAreaWithTemplate, onAddBlankRow, onReplaceRowItem, onDeleteRowItem, onUpdateRowItem, onMarkRowDirty, onOpenRowDetails, onClearRowComponent, onRequestProjectSpecific, onMoveRowComponent, selectedRowIds, onToggleRowSelection, onToggleRowsSelection, depth = 0, usesSiblingGroupRhythm = false }: EstimateSheetBranchProps) {
  const { collapsedNodeIds, setCollapsedNodeIds } = useEstimateSheetExpansion();
  const collapsed = collapsedNodeIds.has(node.id);
  const childAreas = node.children ?? [];
  const estimateRowItems = node.estimateRowItems ?? EMPTY_ESTIMATE_ROW_ITEMS;
  const hasContents = childAreas.length > 0 || estimateRowItems.length > 0;
  const canReceiveRows = node.kind === "area";
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

export function createEstimateRowItemId() {
  if (typeof globalThis.crypto?.randomUUID === "function") return globalThis.crypto.randomUUID();

  const bytes = new Uint8Array(16);
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
}

function cloneLibraryItemForEstimate(libraryItem: EstimateRowItem): EstimateRowItem {
  const id = createEstimateRowItemId();
  const quantity = libraryItem.quantity || 1;
  const contingencyPercentage = libraryItem.contingencyPercentage ?? 0;
  const miscCost = libraryItem.miscCost ?? 0;
  const subTotal = libraryItem.itemCost * quantity;
  const contingencyValue = calculateContingencyValue(subTotal, contingencyPercentage);
  return {
    ...libraryItem,
    id,
    quantity,
    subTotal,
    contingencyPercentage,
    contingencyValue,
    miscCost,
    totalItemCosts: subTotal + miscCost + contingencyValue,
  };
}

function cloneTemplateNodesForEstimate(nodes: EstimateTreeNode[]): EstimateTreeNode[] {
  function cloneNode(node: EstimateTreeNode): EstimateTreeNode {
    return {
      ...node,
      id: createEstimateRowItemId(),
      total: "PHP 0.00",
      children: node.children?.map(cloneNode) ?? [],
      estimateRowItems: node.estimateRowItems?.map(cloneLibraryItemForEstimate) ?? [],
    };
  }

  return nodes.map(cloneNode);
}

/**
 * Replaces an area node in place with a wrapper group holding the area and
 * the dropped template roots — the optimistic mirror of
 * wrapEstimateAreaAndInsertTemplate.
 */
function wrapAreaNodeWithGroup(nodes: EstimateTreeNode[], areaNodeId: string, groupId: string, groupName: string, templateNodes: EstimateTreeNode[]): EstimateTreeNode[] {
  return nodes.map((node) => {
    if (node.id === areaNodeId) {
      return {
        id: groupId,
        name: groupName,
        kind: "group",
        total: "₱0.00",
        children: [node, ...templateNodes],
      } satisfies EstimateTreeNode;
    }
    return {
      ...node,
      children: node.children ? wrapAreaNodeWithGroup(node.children, areaNodeId, groupId, groupName, templateNodes) : node.children,
    };
  });
}

/**
 * Reveals a freshly created group in the left tree. When no explicit
 * expansion is stored, the tree already expands every folder row by default,
 * so only an existing explicit list needs the new id appended.
 */
function expandTreeNodeForEstimate(estimateId: string | undefined, nodeId: string) {
  if (!estimateId) return;
  const state = useEstimateWorkspaceState.getState();
  const expanded = state.expandedNodeIdsByEstimateId[estimateId];
  if (!expanded || expanded.includes(nodeId)) return;
  state.setExpandedNodeIds(estimateId, [...expanded, nodeId]);
}

function appendTemplateNodesToParent(nodes: EstimateTreeNode[], targetParentNodeId: string, templateNodes: EstimateTreeNode[]): EstimateTreeNode[] {
  return nodes.map((node) => {
    if (node.id === targetParentNodeId) {
      return { ...node, children: [...(node.children ?? []), ...templateNodes] };
    }

    return {
      ...node,
      children: node.children ? appendTemplateNodesToParent(node.children, targetParentNodeId, templateNodes) : node.children,
    };
  });
}

function applyEditableValuesToLibraryItem(libraryItem: EstimateRowItem, editableRow?: EditableRowValue): EstimateRowItem {
  if (!editableRow) return libraryItem;

  const quantity = parseNonNegativeEditableNumber(editableRow.quantity);
  const contingencyPercentage = parseEditableContingencyPercentage(editableRow);
  const miscCost = parseNonNegativeEditableNumber(editableRow.miscCost);
  const subTotal = libraryItem.itemCost * quantity;
  const contingencyValue = calculateContingencyValue(subTotal, contingencyPercentage);

  return {
    ...libraryItem,
    quantity,
    subTotal,
    contingencyPercentage,
    contingencyValue,
    miscCost,
    totalItemCosts: subTotal + miscCost + contingencyValue,
  };
}

function replaceRowItemWithLibraryItem(rowItemId: string, libraryItem: EstimateRowItem): EstimateRowItem {
  const quantity = libraryItem.quantity || 1;
  const contingencyPercentage = libraryItem.contingencyPercentage ?? 0;
  const miscCost = libraryItem.miscCost ?? 0;
  const subTotal = libraryItem.itemCost * quantity;
  const contingencyValue = calculateContingencyValue(subTotal, contingencyPercentage);
  return {
    ...libraryItem,
    id: rowItemId,
    quantity,
    subTotal,
    contingencyPercentage,
    contingencyValue,
    miscCost,
    totalItemCosts: subTotal + miscCost + contingencyValue,
  };
}

function buildActivityScopeTreeItems({
  nodes,
  rows,
  editableRows,
  metadata,
  projectTotal,
}: {
  nodes: EstimateTreeNode[];
  rows: FlattenedEstimateRow[];
  editableRows: Record<string, EditableRowValue>;
  metadata: ProposalExportMetadata | null;
  projectTotal: number;
}) {
  const rowById = new Map(rows.map((row) => [row.item.id, row]));
  const items: ActivityScopeTreeItem[] = [
    {
      id: "sheet",
      scope: { mode: "sheet" },
      depth: 0,
      kind: "sheet",
      label: metadata?.estimateName ?? "Estimate sheet",
      eyebrow: metadata?.estimateSheetCode ?? "Sheet",
      total: projectTotal,
      row: null,
    },
  ];

  function visit(node: EstimateTreeNode, depth: number, nodeCode: string, ancestorNames: string[]) {
    const isGroup = node.kind === "group";
    const pathLabel = [...ancestorNames, node.name].join(" / ");
    items.push({
      id: `node:${node.id}`,
      scope: { mode: "node", nodeId: node.id, includeDescendants: isGroup },
      depth,
      kind: isGroup ? "group" : "area",
      label: node.name,
      eyebrow: `${nodeCode} ${isGroup ? "Group Node" : "Area Node"}`,
      description: isGroup ? "Includes descendant node and row activity" : pathLabel,
      total: computeNodeTotal(node, editableRows),
      row: null,
    });

    node.children?.forEach((child, childIndex) => {
      visit(child, depth + 1, getNodeCode(nodeCode, childIndex), [...ancestorNames, node.name]);
    });

    if (node.kind !== "area") return;

    node.estimateRowItems?.forEach((rowItem, rowIndex) => {
      const row = rowById.get(rowItem.id) ?? null;
      const label = isBlankEstimateRowItem(rowItem) ? BLANK_ESTIMATE_ROW_AUDIT_LABEL : rowItem.material;
      items.push({
        id: `row:${node.id}:${rowIndex}:${rowItem.id}`,
        scope: { mode: "row", rowId: rowItem.id },
        depth: depth + 1,
        kind: "row",
        label,
        eyebrow: `Row ${String(rowIndex + 1).padStart(2, "0")}`,
        description: pathLabel,
        total: row?.lineTotal ?? rowItem.totalItemCosts ?? null,
        row,
      });
    });
  }

  nodes.forEach((node, index) => visit(node, 1, getNodeCode("", index), []));
  return items;
}

function EstimateSheetHeader({
  onExpandAll,
  onCollapseAll,
  onPreviewProposalExport,
  canPreviewProposalExport = false,
  onOpenSheetActivity,
  searchQuery,
  onSearchQueryChange,
}: {
  onExpandAll?: () => void;
  onCollapseAll?: () => void;
  onPreviewProposalExport?: () => void;
  canPreviewProposalExport?: boolean;
  onOpenSheetActivity?: (opener: HTMLElement) => void;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
}) {
  return (
    // z-30: the search dropdown must paint above the sheet's sticky branch
    // headers (z-20), which sit later in the DOM.
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur" aria-label="Sheet controls">
      <TreePanelHeader
        className="static z-auto bg-transparent"
        ariaLabel="Sheet tools"
        labelPrefix="sheet"
        onExpandAll={onExpandAll}
        onCollapseAll={onCollapseAll}
        startActionsLabel="Sheet search"
        searchValue={searchQuery}
        onSearchValueChange={onSearchQueryChange}
        searchPlaceholder="Search Sheet"
        searchLabel="Search Sheet"
        addActions={[
          {
            label: "Activity",
            icon: <ClockCounterClockwise size={12} weight="regular" aria-hidden="true" />,
            onClick: onOpenSheetActivity
              ? function openSheetActivity(event?: unknown) {
                const target = event && typeof event === "object" && "currentTarget" in event ? (event as { currentTarget?: EventTarget | null }).currentTarget : null;
                onOpenSheetActivity(target instanceof HTMLElement ? target : document.body);
              }
              : undefined,
            className: "text-tertiary hover:bg-orange-50 hover:text-orange-700 focus-visible:bg-orange-50 focus-visible:text-orange-700",
          },
          {
            label: "Preview Excel Export",
            icon: <FileXls size={12} weight="regular" aria-hidden="true" />,
            onClick: onPreviewProposalExport,
            disabled: !canPreviewProposalExport,
            className: "text-tertiary hover:bg-emerald-50 hover:text-emerald-700 focus-visible:bg-emerald-50 focus-visible:text-emerald-700",
          },
        ]}
      />
    </header>
  );
}

const EMPTY_COLLAPSED_NODE_IDS = new Set<string>();

function estimateSheetRowMatchesQuery(item: EstimateRowItem, normalizedQuery: string) {
  return [item.material, item.name, item.category, item.supplier, item.description]
    .some((value) => typeof value === "string" && value.toLowerCase().includes(normalizedQuery));
}

/**
 * Name/row filter for the sheet: a node whose name matches keeps its whole
 * subtree; otherwise it survives only with matching descendants or rows.
 */
function filterEstimateSheetNode(node: EstimateTreeNode, query: string): EstimateTreeNode | null {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return node;

  function visit(current: EstimateTreeNode): EstimateTreeNode | null {
    if (current.name.toLowerCase().includes(normalizedQuery)) return current;
    const children = (current.children ?? [])
      .map(visit)
      .filter((child): child is EstimateTreeNode => child !== null);
    const estimateRowItems = (current.estimateRowItems ?? []).filter((item) =>
      estimateSheetRowMatchesQuery(item, normalizedQuery),
    );
    if (children.length > 0 || estimateRowItems.length > 0) {
      return { ...current, children, estimateRowItems };
    }
    return null;
  }

  return visit(node);
}

function getRemoteCursorLabel(cursor: RemoteEstimateCursor) {
  return cursor.displayName ?? `User ${cursor.userId.slice(0, 8)}`;
}

// Isolates collaboration cursor traffic: the realtime hook lives here so
// remote cursor frames re-render only this layer, never the sheet branches
// or row tables. Pointer broadcasting and channel-status attributes attach to
// the enclosing [data-estimate-pointer-surface] element imperatively.
function EstimateSheetCursorLayer({
  estimateId,
  userId,
  displayName,
}: {
  estimateId?: string;
  userId: string | null;
  displayName: string | null;
}) {
  const { broadcastCursor, channelStatus, lastSendStatus, remoteCursors } = useEstimateCursorCollaboration({
    estimateId,
    userId,
    displayName,
    enabled: Boolean(estimateId && userId),
  });
  const layerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const surface = layerRef.current?.closest<HTMLElement>("[data-estimate-pointer-surface]");
    if (!surface || !estimateId || !userId) return;

    function handlePointerMove(event: globalThis.PointerEvent) {
      if (!(event.target instanceof Element) || !surface) return;
      const bounds = surface.getBoundingClientRect();
      const rowElement = event.target.closest<HTMLElement>("[data-estimate-row-id]");
      const cellElement = event.target.closest<HTMLElement>("[data-estimate-cell-index]");
      broadcastCursor({
        x: Math.round(event.clientX - bounds.left + surface.scrollLeft),
        y: Math.round(event.clientY - bounds.top + surface.scrollTop),
        rowId: rowElement?.dataset.estimateRowId ?? null,
        columnId: cellElement?.dataset.estimateCellIndex ?? null,
      });
    }

    surface.addEventListener("pointermove", handlePointerMove);
    return () => surface.removeEventListener("pointermove", handlePointerMove);
  }, [broadcastCursor, estimateId, userId]);

  useEffect(() => {
    const surface = layerRef.current?.closest<HTMLElement>("[data-estimate-pointer-surface]");
    if (!surface) return;
    surface.setAttribute("data-estimate-cursor-channel", channelStatus);
    surface.setAttribute("data-estimate-cursor-send", lastSendStatus);
  }, [channelStatus, lastSendStatus]);

  return (
    <div ref={layerRef} className="contents">
      <RemoteEstimateCursorsOverlay cursors={remoteCursors} />
    </div>
  );
}

function RemoteEstimateCursorsOverlay({ cursors }: { cursors: RemoteEstimateCursor[] }) {
  if (cursors.length === 0) return null;

  return (
    <div
      className="pointer-events-none absolute left-0 top-0 z-30 min-h-full min-w-full"
      aria-hidden="true"
      data-estimate-cursor-layer
    >
      {cursors.map((cursor) => (
        <RemoteEstimateCursorMarker key={cursor.userId} cursor={cursor} />
      ))}
    </div>
  );
}

function RemoteEstimateCursorMarker({ cursor }: { cursor: RemoteEstimateCursor }) {
  const color = getCollaborationColorForUser(cursor.userId);

  return (
    <div
      className="absolute left-0 top-0 flex items-start gap-1"
      style={{ transform: `translate3d(${cursor.x}px, ${cursor.y}px, 0)` }}
      data-estimate-remote-cursor={cursor.userId}
      data-estimate-remote-cursor-color={color.name}
    >
      <span
        className="mt-0.5 block size-2 rotate-45 rounded-xs shadow-[0_0_0_1px_rgba(255,255,255,0.9)]"
        style={{ backgroundColor: color.cursor, boxShadow: `0 0 0 1px rgba(255, 255, 255, 0.9), 0 0 0 4px ${color.ring}` }}
      />
      <span
        className="max-w-28 truncate rounded-xs px-1.5 py-0.5 text-[8px] font-medium leading-[10px] shadow-[0_4px_12px_rgba(17,24,39,0.18)]"
        style={{ backgroundColor: color.cursor, color: color.text }}
      >
        {getRemoteCursorLabel(cursor)}
      </span>
    </div>
  );
}

export function EstimateSheetContent({
  selectedNodeId,
  nodes = sampleEstimateTree,
  projectId,
  estimateId,
  collaborationUserId = null,
  collaborationDisplayName = null,
  proposalExportMetadata,
  renderSidebar = true,
  libraryItems,
  libraryTemplates,
  libraryCategoryTree,
  librarySuppliers,
  libraryBrands,
  libraryFolders,
}: EstimateSheetContentProps) {
  reportEstimateSheetContentRender();
  const { selectedNodeId: activeSelectedNodeId, setSelectedNodeId } = useEstimateWorkspaceSelection(estimateId, selectedNodeId);
  const { saveState, markRowDirty: markRowDirtyNow, insertRow, replaceRow, detachRow, deleteRow, updateRow } = useEstimateRowMutations(estimateId);
  // Row tables are memoized on callback identity: every handler that reaches
  // EstimateSheetBranch/EstimateRowItemsTable must stay referentially stable.
  const markRowDirty = useStableCallback(markRowDirtyNow);
  const {
    tree: estimateTree,
    setTree: setEstimateTreeData,
    restore: restoreEstimateTree,
    getTreeRevision: getEstimateTreeRevision,
  } = useEstimateAreaTreeQuery({
    projectId,
    estimateId,
    initialNodes: nodes,
  });
  const skipEditableRowsSyncRef = useRef(0);
  const [editableRows, setEditableRows] = useState<Record<string, EditableRowValue>>(() => collectEditableRows(nodes));
  const [pendingFocusRowId, setPendingFocusRowId] = useState("");
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [collapsedNodeIds, setCollapsedNodeIds] = useState<Set<string>>(() => new Set());
  const [bulkSelectedRowIds, setBulkSelectedRowIds] = useState<Set<string>>(() => new Set());
  const [isProposalPreviewOpen, setIsProposalPreviewOpen] = useState(false);
  const [proposalPreviewModel, setProposalPreviewModel] = useState<ProposalExportModel | null>(null);
  const [proposalPreviewSignature, setProposalPreviewSignature] = useState("");
  const [inspector, setInspector] = useState<EstimateActivityScope | null>(null);
  const [rowDetails, setRowDetails] = useState<RowDetailsState | null>(null);
  const [projectSpecificRowId, setProjectSpecificRowId] = useState("");
  const [activityFilters, setActivityFilters] = useState<ActivityFilterState>(DEFAULT_ACTIVITY_FILTERS);
  const [historyData, setHistoryData] = useState<EstimateSheetVersionControlData | null>(null);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [isHistoryLoadingMore, setIsHistoryLoadingMore] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [historyReloadToken, setHistoryReloadToken] = useState(0);
  const inspectorOpenerRef = useRef<HTMLElement | null>(null);
  const rowDetailsOpenerRef = useRef<HTMLElement | null>(null);
  const inspectorScopeRef = useRef("");
  const historyRequestGenerationRef = useRef(0);
  const activateHistoryScope = useCallback((scopeKey: string) => {
    inspectorScopeRef.current = scopeKey;
    historyRequestGenerationRef.current += 1;
  }, []);
  // Lazy library path: production pages no longer pass library props, so the
  // dataset loads through a server action once the sidebar (or palette) needs
  // it. Server-provided props short-circuit the fetch for tests/embeds.
  const hasServerProvidedLibrary = Boolean(libraryItems);
  const shouldLoadLibraryLazily = !hasServerProvidedLibrary && Boolean(projectId && estimateId);
  const libraryQuery = useQuery({
    queryKey: ["workspace-component-library"],
    queryFn: () => loadCurrentWorkspaceComponentLibrary(),
    enabled: shouldLoadLibraryLazily && (renderSidebar || showCommandPalette),
    staleTime: 5 * 60 * 1000,
  });
  const lazyLibrary = shouldLoadLibraryLazily ? libraryQuery.data : undefined;
  const resolvedLibraryItems = libraryItems ?? lazyLibrary?.libraryItems;
  const queryClient = useQueryClient();
  // Library mutations in the sidebar update its local state; the lazy query
  // cache must also be marked stale or remounts re-seed from pre-mutation data.
  const handleLibraryDataChanged = useStableCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["workspace-component-library"] });
  });
  const availableTemplates = libraryTemplates ?? lazyLibrary?.templates ?? EMPTY_ESTIMATE_TEMPLATES;
  const resolvedProposalExportMetadata = useMemo<ProposalExportMetadata | null>(() => {
    if (proposalExportMetadata) return proposalExportMetadata;
    if (!projectId || !estimateId) return null;

    return {
      projectId,
      estimateId,
      projectName: "Untitled project",
      projectCode: null,
      projectAddress: null,
      estimateName: "Untitled estimate",
      estimateSheetCode: estimateId,
      versionLabel: "V1",
      currency: "PHP",
    };
  }, [estimateId, projectId, proposalExportMetadata]);
  const currentProposalPreviewSignature = useMemo(
    () => createProposalPreviewSignature(estimateTree, editableRows, resolvedProposalExportMetadata),
    [editableRows, estimateTree, resolvedProposalExportMetadata],
  );
  const proposalDownloadHref = useMemo(
    () => (projectId && estimateId ? `/api/projects/${encodeURIComponent(projectId)}/estimates/${encodeURIComponent(estimateId)}/export/proposal.xlsx` : null),
    [estimateId, projectId],
  );
  const templateById = useMemo(() => new Map(availableTemplates.map((template) => [template.id, template])), [availableTemplates]);
  const { selectedNodeId: resolvedSelectedNodeId, selectedNode } = useMemo(
    () =>
      resolveEstimateWorkspaceSelection({
        selectedNodeId: activeSelectedNodeId,
        fallbackNode: estimateTree[0],
        findNode: (nodeId) => findEstimateNode(estimateTree, nodeId),
      }),
    [activeSelectedNodeId, estimateTree],
  );
  const [sheetSearchQuery, setSheetSearchQuery] = useState("");
  const sheetSearchActive = sheetSearchQuery.trim().length > 0;
  // Render-only filtered copy: row edits and inserts keep targeting the real
  // tree state by node/item id.
  const displayedSheetNode = useMemo(
    () => (selectedNode && sheetSearchActive ? filterEstimateSheetNode(selectedNode, sheetSearchQuery) : selectedNode),
    [selectedNode, sheetSearchActive, sheetSearchQuery],
  );
  // Searches reveal every match: collapse state pauses while filtering.
  const sheetExpansionContextValue = useMemo(
    () => ({
      collapsedNodeIds: sheetSearchActive ? EMPTY_COLLAPSED_NODE_IDS : collapsedNodeIds,
      setCollapsedNodeIds,
    }),
    [collapsedNodeIds, sheetSearchActive],
  );
  const visibleSheetRowIds = useMemo(() => {
    const rowIds = new Set<string>();
    if (!displayedSheetNode) return rowIds;
    function visit(currentNode: EstimateTreeNode) {
      currentNode.estimateRowItems?.forEach((item) => rowIds.add(item.id));
      currentNode.children?.forEach(visit);
    }
    visit(displayedSheetNode);
    return rowIds;
  }, [displayedSheetNode]);

  // Selections only make sense for rows that are still on screen: deletes,
  // searches, and node switches silently drop stale ids.
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setBulkSelectedRowIds((current) => {
        if (current.size === 0) return current;
        const next = new Set([...current].filter((rowId) => visibleSheetRowIds.has(rowId)));
        return next.size === current.size ? current : next;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [visibleSheetRowIds]);

  const toggleRowSelection = useCallback((rowItemId: string, checked: boolean) => {
    setBulkSelectedRowIds((current) => {
      const next = new Set(current);
      if (checked) next.add(rowItemId);
      else next.delete(rowItemId);
      return next;
    });
  }, []);
  const toggleRowsSelection = useCallback((rowItemIds: string[], checked: boolean) => {
    setBulkSelectedRowIds((current) => {
      const next = new Set(current);
      rowItemIds.forEach((rowId) => {
        if (checked) next.add(rowId);
        else next.delete(rowId);
      });
      return next;
    });
  }, []);
  const clearRowSelection = useCallback(() => setBulkSelectedRowIds(new Set()), []);
  const bulkSelectedRowCount = bulkSelectedRowIds.size;
  const insertTargetNodeId = selectedNode?.kind === "area" ? selectedNode.id : "";
  const selectedNodePath = useMemo(
    () => (resolvedSelectedNodeId ? findNodePath(estimateTree, resolvedSelectedNodeId) : []),
    [estimateTree, resolvedSelectedNodeId],
  );
  const templateTargetParentNode = useMemo(() => {
    if (selectedNode?.kind === "group") return selectedNode;
    return [...selectedNodePath].reverse().find((node) => node.kind === "group") ?? null;
  }, [selectedNode, selectedNodePath]);
  const canInsertIntoSelectedNode = Boolean(insertTargetNodeId);
  // With an area selected, template adds wrap the area in a new group
  // instead of targeting an ancestor group.
  const canInsertTemplateIntoSelectedNode = selectedNode?.kind === "area" || Boolean(templateTargetParentNode);
  const insertionTargetLabel = selectedNode?.kind === "area" ? selectedNode.name : "selected area";
  const templateInsertionTargetLabel = selectedNode?.kind === "area"
    ? `a new ${getEstimateWrapGroupName(selectedNode.name)}`
    : templateTargetParentNode?.name ?? "selected group";
  const projectTotal = useMemo(
    () => estimateTree.reduce((total, node) => total + computeNodeTotal(node, editableRows), 0),
    [editableRows, estimateTree],
  );
  const currentRows = useMemo(() => flattenEstimateRows(estimateTree, editableRows), [editableRows, estimateTree]);
  const inspectorScopeKey = getActivityScopeKey(inspector);
  const activityFilterKey = useMemo(() => createActivityFilterKey(activityFilters), [activityFilters]);
  const activityScopeItems = useMemo(
    () => buildActivityScopeTreeItems({
      nodes: estimateTree,
      rows: currentRows,
      editableRows,
      metadata: resolvedProposalExportMetadata,
      projectTotal,
    }),
    [currentRows, editableRows, estimateTree, projectTotal, resolvedProposalExportMetadata],
  );
  const selectedActivityScopeItem = useMemo(
    () => activityScopeItems.find((item) => getActivityScopeKey(item.scope) === inspectorScopeKey) ?? activityScopeItems[0] ?? null,
    [activityScopeItems, inspectorScopeKey],
  );
  const selectedRowDetailsItem = useMemo(
    () => (rowDetails ? currentRows.find((row) => row.item.id === rowDetails.rowId) ?? null : null),
    [currentRows, rowDetails],
  );
  const projectSpecificRow = useMemo(
    () => (projectSpecificRowId ? currentRows.find((row) => row.item.id === projectSpecificRowId) ?? null : null),
    [currentRows, projectSpecificRowId],
  );
  const allNodeIds = useMemo(() => (selectedNode ? collectAllNodeIds([selectedNode]) : []), [selectedNode]);
  const expandAll = useCallback(() => setCollapsedNodeIds(new Set()), []);
  const collapseAll = useCallback(() => setCollapsedNodeIds(new Set(allNodeIds)), [allNodeIds]);
  const setActiveInspector = useCallback((nextInspector: EstimateActivityScope | null) => {
    const nextScopeKey = getActivityScopeKey(nextInspector);
    activateHistoryScope(nextScopeKey);
    setInspector(nextInspector);
  }, [activateHistoryScope]);
  const replaceActivityFilters = useCallback((nextFilters: ActivityFilterState) => {
    setActivityFilters(nextFilters);
    if (projectId && estimateId && inspector) {
      historyRequestGenerationRef.current += 1;
      setIsHistoryLoading(true);
      setIsHistoryLoadingMore(false);
      setHistoryData(null);
      setHistoryError("");
    }
  }, [estimateId, inspector, projectId]);
  const resetActivityFilters = useCallback(() => {
    replaceActivityFilters(DEFAULT_ACTIVITY_FILTERS);
  }, [replaceActivityFilters]);
  const reloadVersionControl = useCallback(() => {
    if (projectId && estimateId) {
      historyRequestGenerationRef.current += 1;
      setIsHistoryLoading(true);
      setIsHistoryLoadingMore(false);
      setHistoryData(null);
      setHistoryError("");
    }
    setHistoryReloadToken((current) => current + 1);
  }, [estimateId, projectId]);
  const closeInspector = useCallback(() => {
    setActiveInspector(null);
    window.requestAnimationFrame(() => inspectorOpenerRef.current?.focus());
  }, [setActiveInspector]);
  const prepareHistoryLoad = useCallback(() => {
    if (projectId && estimateId) {
      setIsHistoryLoading(true);
      setIsHistoryLoadingMore(false);
      setHistoryData(null);
      setHistoryError("");
    }
  }, [estimateId, projectId]);
  const openActivityHistory = useCallback((opener: HTMLElement, initialScope: EstimateActivityScope = { mode: "sheet" }) => {
    inspectorOpenerRef.current = opener;
    prepareHistoryLoad();
    setActiveInspector(initialScope);
  }, [prepareHistoryLoad, setActiveInspector]);
  const openRowDetails = useCallback((rowItemId: string, opener: HTMLElement, tab: RowDetailTab = "details") => {
    rowDetailsOpenerRef.current = opener;
    setRowDetails({ rowId: rowItemId, tab });
  }, []);
  const closeRowDetails = useCallback(() => {
    setRowDetails(null);
    window.requestAnimationFrame(() => rowDetailsOpenerRef.current?.focus());
  }, []);
  const setRowDetailsTab = useCallback((tab: RowDetailTab) => {
    setRowDetails((current) => (current ? { ...current, tab } : current));
  }, []);
  const selectActivityScope = useCallback((nextScope: EstimateActivityScope) => {
    if (getActivityScopeKey(nextScope) === inspectorScopeKey) return;
    prepareHistoryLoad();
    setActiveInspector(nextScope);
  }, [inspectorScopeKey, prepareHistoryLoad, setActiveInspector]);
  const loadMoreVersionControl = useCallback(() => {
    if (!inspector || !historyData || !projectId || !estimateId || isHistoryLoadingMore) return;

    const isRowHistory = inspector.mode === "row";
    const isNodeHistory = inspector.mode === "node";
    const requestScopeKey = isRowHistory ? `row:${inspector.rowId}` : isNodeHistory ? `node:${inspector.nodeId}:${inspector.includeDescendants ? "desc" : "direct"}` : "sheet";
    const cursor = isRowHistory ? historyData.rowNextCursor : isNodeHistory ? historyData.nodeNextCursor : historyData.nextCursor;
    if (!cursor) return;

    setIsHistoryLoadingMore(true);
    setHistoryError("");
    const requestGeneration = historyRequestGenerationRef.current;
    const isCurrentHistoryRequest = () => inspectorScopeRef.current === requestScopeKey && historyRequestGenerationRef.current === requestGeneration;

    fetchEstimateSheetVersionControl({
      projectId,
      estimateId,
      rowId: isRowHistory ? inspector.rowId : undefined,
      nodeId: isNodeHistory ? inspector.nodeId : undefined,
      includeDescendants: isNodeHistory ? inspector.includeDescendants : undefined,
      eventLimit: 50,
      ...getActivityFilterInput(activityFilters),
      sheetCursor: !isRowHistory && !isNodeHistory ? cursor : undefined,
      rowCursor: isRowHistory ? cursor : undefined,
      nodeCursor: isNodeHistory ? cursor : undefined,
      scope: isRowHistory ? "row" : isNodeHistory ? "node" : "sheet",
    })
      .then((data) => {
        if (!isCurrentHistoryRequest()) return;
        setHistoryData((current) => {
          if (!current) return data;
          if (isRowHistory) {
            return {
              ...current,
              rowEvents: [...current.rowEvents, ...data.rowEvents],
              rowNextCursor: data.rowNextCursor,
            };
          }

          if (isNodeHistory) {
            return {
              ...current,
              nodeEvents: [...(current.nodeEvents ?? []), ...data.nodeEvents],
              nodeNextCursor: data.nodeNextCursor,
            };
          }

          return {
            ...current,
            events: [...current.events, ...data.events],
            nextCursor: data.nextCursor,
          };
        });
      })
      .catch((error: unknown) => {
        if (!isCurrentHistoryRequest()) return;
        setHistoryError(error instanceof Error ? error.message : "Activity history could not load.");
      })
      .finally(() => {
        if (!isCurrentHistoryRequest()) return;
        setIsHistoryLoadingMore(false);
      });
  }, [activityFilters, estimateId, historyData, inspector, isHistoryLoadingMore, projectId]);
  const buildProposalPreview = useCallback(() => {
    if (!resolvedProposalExportMetadata) return null;

    const model = buildProposalExportModel({
      metadata: resolvedProposalExportMetadata,
      nodes: materializeEditableEstimateTree(estimateTree, editableRows),
    });
    setProposalPreviewModel(model);
    setProposalPreviewSignature(currentProposalPreviewSignature);
    return model;
  }, [currentProposalPreviewSignature, editableRows, estimateTree, resolvedProposalExportMetadata]);
  const openProposalPreview = useCallback(() => {
    const model = buildProposalPreview();
    if (model) setIsProposalPreviewOpen(true);
  }, [buildProposalPreview]);
  const refreshProposalPreview = useCallback(() => {
    buildProposalPreview();
  }, [buildProposalPreview]);
  const isProposalPreviewStale = Boolean(proposalPreviewModel && proposalPreviewSignature !== currentProposalPreviewSignature);
  useEffect(() => {
    if (!inspectorScopeKey) return;

    if (!projectId || !estimateId) return;

    let isActive = true;
    const requestScopeKey = inspectorScopeKey;
    const isRowHistory = requestScopeKey.startsWith("row:");
    const isNodeHistory = requestScopeKey.startsWith("node:");
    const rowId = isRowHistory ? requestScopeKey.slice("row:".length) : undefined;
    const [nodeId, nodeDescendantMode] = isNodeHistory ? requestScopeKey.slice("node:".length).split(":") : [];
    const requestGeneration = historyRequestGenerationRef.current;
    const isCurrentHistoryRequest = () => isActive && inspectorScopeRef.current === requestScopeKey && historyRequestGenerationRef.current === requestGeneration;
    fetchEstimateSheetVersionControl({
      projectId,
      estimateId,
      rowId,
      nodeId,
      includeDescendants: isNodeHistory ? nodeDescendantMode === "desc" : undefined,
      eventLimit: 50,
      ...getActivityFilterInput(activityFilters),
      scope: isRowHistory ? "row" : isNodeHistory ? "node" : "sheet",
    })
      .then((data) => {
        if (!isCurrentHistoryRequest()) return;
        setHistoryData(data);
      })
      .catch((error: unknown) => {
        if (!isCurrentHistoryRequest()) return;
        setHistoryError(error instanceof Error ? error.message : "Activity history could not load.");
      })
      .finally(() => {
        if (isCurrentHistoryRequest()) setIsHistoryLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [activityFilterKey, activityFilters, estimateId, historyReloadToken, inspectorScopeKey, projectId]);

  useEffect(() => {
    inspectorScopeRef.current = inspectorScopeKey;
  }, [inspectorScopeKey]);

  useEffect(() => {
    if (!inspector) return;

    function handleEscape(event: globalThis.KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      closeInspector();
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [closeInspector, inspector]);

  useEffect(() => {
    if (!rowDetails) return;

    function handleEscape(event: globalThis.KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      closeRowDetails();
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [closeRowDetails, rowDetails]);

  useEffect(() => {
    dispatchProjectTotalChange(projectTotal);
  }, [projectTotal]);

  useEffect(() => {
    if (!estimateId || activeSelectedNodeId === resolvedSelectedNodeId) return;
    setSelectedNodeId(resolvedSelectedNodeId);
  }, [activeSelectedNodeId, estimateId, resolvedSelectedNodeId, setSelectedNodeId]);

  const setEstimateTree = useCallback((updater: (current: EstimateTreeNode[]) => EstimateTreeNode[]) => {
    skipEditableRowsSyncRef.current += 1;
    return setEstimateTreeData(updater);
  }, [setEstimateTreeData]);

  const restoreEstimateState = useCallback((previousTree: EstimateTreeNode[], previousRows: Record<string, EditableRowValue>, expectedRevision?: number) => {
    const didRestoreTree = restoreEstimateTree(previousTree, expectedRevision);
    if (!didRestoreTree) return;
    skipEditableRowsSyncRef.current += 1;
    setEditableRows(previousRows);
  }, [restoreEstimateTree]);

  useEffect(() => {
    if (saveState === "dirty" || saveState === "saving") return;
    if (skipEditableRowsSyncRef.current > 0) {
      skipEditableRowsSyncRef.current -= 1;
      return;
    }
    queueMicrotask(() => {
      setEditableRows(collectEditableRows(estimateTree));
    });
  }, [estimateTree, saveState]);

  useEffect(() => {
    if (!pendingFocusRowId) return;
    let attempts = 0;
    let frameId = 0;

    function tryFocus() {
      const quantityInput = document.querySelector<HTMLInputElement>(`[data-estimate-row-id="${pendingFocusRowId}"][data-estimate-cell-index="0"]`);
      if (quantityInput) {
        quantityInput.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
        quantityInput.focus();
        quantityInput.select();
        setPendingFocusRowId("");
        return;
      }

      attempts += 1;
      if (attempts < 5) frameId = window.requestAnimationFrame(tryFocus);
      else setPendingFocusRowId("");
    }

    frameId = window.requestAnimationFrame(tryFocus);
    return () => window.cancelAnimationFrame(frameId);
  }, [pendingFocusRowId]);

  const updateRowItem = useStableCallback((rowItemId: string, values: Partial<EditableRowValue>) => {
    if (!projectId || !estimateId) return;
    const previousTree = estimateTree;
    const previousRows = collectEditableRows(estimateTree);
    const rollbackRevision = getEstimateTreeRevision();
    const currentEditableRow = editableRows[rowItemId] ?? previousRows[rowItemId];
    const nextEditableRow: EditableRowValue = {
      quantity: currentEditableRow?.quantity ?? "0",
      contingencyMode: currentEditableRow?.contingencyMode ?? "contingency",
      contingencyPercentage: currentEditableRow?.contingencyPercentage ?? "0",
      miscCost: currentEditableRow?.miscCost ?? "0",
      ...values,
    };
    updateRow({
      projectId,
      estimateId,
      rowId: rowItemId,
      ...(values.quantity !== undefined ? { quantity: parseNonNegativeEditableNumber(values.quantity) } : {}),
      ...(values.contingencyPercentage !== undefined || values.contingencyMode !== undefined ? { contingencyPercentage: parseEditableContingencyPercentage(nextEditableRow) } : {}),
      ...(values.miscCost !== undefined ? { miscCost: parseNonNegativeEditableNumber(values.miscCost) } : {}),
      rollback: () => restoreEstimateState(previousTree, previousRows, rollbackRevision),
    });
  });

  const insertLibraryItem = useStableCallback((targetNodeId: string, libraryItem: EstimateRowItem) => {
    const targetNode = findEstimateNode(estimateTree, targetNodeId);
    if (targetNode?.kind !== "area") return;

    const previousTree = estimateTree;
    const previousRows = editableRows;
    const newItem = cloneLibraryItemForEstimate(libraryItem);
    setPendingFocusRowId(newItem.id);
    const rollbackRevision = setEstimateTree((current) =>
      current.map((node) => {
        function visit(areaNode: EstimateTreeNode): EstimateTreeNode {
          if (areaNode.id === targetNodeId) {
            return { ...areaNode, estimateRowItems: [...(areaNode.estimateRowItems ?? []), newItem] };
          }
          return { ...areaNode, children: areaNode.children?.map(visit) };
        }
        return visit(node);
      }),
    );
    setEditableRows((current) => ({ ...current, [newItem.id]: getInitialEditableRow(newItem) }));

    if (projectId && estimateId) {
      insertRow({
        projectId,
        estimateId,
        targetNodeId,
        rowId: newItem.id,
        libraryItem,
        rollback: () => restoreEstimateState(previousTree, previousRows, rollbackRevision),
      });
    }
  });

  const insertIntoSelectedNode = useCallback(
    (libraryItem: EstimateRowItem) => {
      if (!insertTargetNodeId) return false;
      insertLibraryItem(insertTargetNodeId, libraryItem);
      return true;
    },
    [insertLibraryItem, insertTargetNodeId],
  );

  const insertTemplateIntoParent = useStableCallback(
    (targetParentNodeId: string, template: EstimateTemplate) => {
      const targetParentNode = findEstimateNode(estimateTree, targetParentNodeId);
      if (targetParentNode?.kind !== "group") return false;

      const previousTree = estimateTree;
      const previousRows = editableRows;
      const rollbackRevision = getEstimateTreeRevision();
      const optimisticTemplateNodes = cloneTemplateNodesForEstimate(template.nodes);
      const nextEditableRows = collectEditableRows(optimisticTemplateNodes);
      const nextRevision = setEstimateTree((current) => appendTemplateNodesToParent(current, targetParentNodeId, optimisticTemplateNodes));
      setEditableRows((current) => ({ ...current, ...nextEditableRows }));
      setSelectedNodeId(targetParentNodeId);

      if (projectId && estimateId) {
        insertEstimateTemplateIntoEstimate({
          projectId,
          estimateId,
          targetParentNodeId,
          templateId: template.id,
        })
          .then((result) => {
            setEstimateTreeData(() => result.tree);
          })
          .catch(() => restoreEstimateState(previousTree, previousRows, nextRevision ?? rollbackRevision));
      }

      return true;
    },
  );

  const insertTemplateIntoParentById = useCallback(
    (targetParentNodeId: string, templateId: string) => {
      const template = templateById.get(templateId);
      if (!template) return false;
      return insertTemplateIntoParent(targetParentNodeId, template);
    },
    [insertTemplateIntoParent, templateById],
  );

  // A template dropped on an area cannot nest inside it (areas take no child
  // nodes), so the drop wraps the area and the template content in a new
  // group occupying the area's slot. Selection follows the new group: the
  // sheet re-scopes and the left tree highlights it through the shared
  // workspace selection.
  const wrapAreaAndInsertTemplates = useStableCallback(
    (areaNodeId: string, payload: EstimateTemplateDragPayload): boolean => {
      const areaNode = findEstimateNode(estimateTree, areaNodeId);
      if (areaNode?.kind !== "area") return false;

      let optimisticTemplateNodes: EstimateTreeNode[];
      if (payload.kind === "template-node") {
        const template = templateById.get(payload.templateId);
        const templateNode = template ? findEstimateNode(template.nodes, payload.templateNodeId) : null;
        if (!templateNode) return false;
        optimisticTemplateNodes = cloneTemplateNodesForEstimate([templateNode]);
      } else {
        const payloadTemplates = payload.templateIds
          .map((templateId) => templateById.get(templateId))
          .filter((template): template is EstimateTemplate => Boolean(template));
        if (payloadTemplates.length === 0) return false;
        optimisticTemplateNodes = cloneTemplateNodesForEstimate(payloadTemplates.flatMap((template) => template.nodes));
      }

      const previousTree = estimateTree;
      const previousRows = editableRows;
      const rollbackRevision = getEstimateTreeRevision();
      const optimisticGroupId = `optimistic-group-${createEstimateRowItemId()}`;
      const groupName = getEstimateWrapGroupName(areaNode.name);
      const nextEditableRows = collectEditableRows(optimisticTemplateNodes);
      const nextRevision = setEstimateTree((current) => wrapAreaNodeWithGroup(current, areaNodeId, optimisticGroupId, groupName, optimisticTemplateNodes));
      setEditableRows((current) => ({ ...current, ...nextEditableRows }));
      setSelectedNodeId(optimisticGroupId);
      expandTreeNodeForEstimate(estimateId, optimisticGroupId);

      if (projectId && estimateId) {
        const reselectWrapGroup = (nodeId: string) => {
          // Only steer selection if the user is still on the wrap group.
          const currentSelection = useEstimateWorkspaceState.getState().selectedNodeIdByEstimateId[estimateId];
          if (currentSelection === optimisticGroupId) setSelectedNodeId(nodeId);
        };
        wrapEstimateAreaAndInsertTemplate({
          projectId,
          estimateId,
          areaNodeId,
          insert: payload.kind === "template-node"
            ? { templateId: payload.templateId, templateNodeId: payload.templateNodeId }
            : { templateIds: payload.templateIds },
        })
          .then((result) => {
            setEstimateTreeData(() => result.tree);
            expandTreeNodeForEstimate(estimateId, result.newGroupNodeId);
            reselectWrapGroup(result.newGroupNodeId);
          })
          .catch(() => {
            restoreEstimateState(previousTree, previousRows, nextRevision ?? rollbackRevision);
            reselectWrapGroup(areaNodeId);
          });
      }

      return true;
    },
  );

  const insertTemplateIntoSelectedGroup = useCallback(
    (template: EstimateTemplate) => {
      if (selectedNode?.kind === "area") {
        return wrapAreaAndInsertTemplates(selectedNode.id, { kind: "templates", templateIds: [template.id] });
      }
      if (!templateTargetParentNode) return false;
      return insertTemplateIntoParent(templateTargetParentNode.id, template);
    },
    [insertTemplateIntoParent, selectedNode, templateTargetParentNode, wrapAreaAndInsertTemplates],
  );

  // Inserts ONE node of a template (a group or area inside it) with its
  // subtree. Same optimistic shape as whole-template insertion; the server
  // recreates the subtree through the history-aware node/row RPCs.
  const insertTemplateNodeIntoParent = useStableCallback(
    (targetParentNodeId: string, template: EstimateTemplate, templateNode: EstimateTreeNode) => {
      const targetParentNode = findEstimateNode(estimateTree, targetParentNodeId);
      if (targetParentNode?.kind !== "group") return false;

      const previousTree = estimateTree;
      const previousRows = editableRows;
      const rollbackRevision = getEstimateTreeRevision();
      const optimisticTemplateNodes = cloneTemplateNodesForEstimate([templateNode]);
      const nextEditableRows = collectEditableRows(optimisticTemplateNodes);
      const nextRevision = setEstimateTree((current) => appendTemplateNodesToParent(current, targetParentNodeId, optimisticTemplateNodes));
      setEditableRows((current) => ({ ...current, ...nextEditableRows }));
      setSelectedNodeId(targetParentNodeId);

      if (projectId && estimateId) {
        insertEstimateTemplateNodeIntoEstimate({
          projectId,
          estimateId,
          targetParentNodeId,
          templateId: template.id,
          templateNodeId: templateNode.id,
        })
          .then((result) => {
            setEstimateTreeData(() => result.tree);
          })
          .catch(() => restoreEstimateState(previousTree, previousRows, nextRevision ?? rollbackRevision));
      }

      return true;
    },
  );

  const insertTemplateNodeIntoParentById = useCallback(
    (targetParentNodeId: string, templateId: string, templateNodeId: string) => {
      const template = templateById.get(templateId);
      if (!template) return false;
      const templateNode = findEstimateNode(template.nodes, templateNodeId);
      if (!templateNode) return false;
      return insertTemplateNodeIntoParent(targetParentNodeId, template, templateNode);
    },
    [insertTemplateNodeIntoParent, templateById],
  );

  const insertTemplateNodeIntoSelectedGroup = useCallback(
    (template: EstimateTemplate, templateNode: EstimateTreeNode) => {
      if (selectedNode?.kind === "area") {
        return wrapAreaAndInsertTemplates(selectedNode.id, { kind: "template-node", templateId: template.id, templateNodeId: templateNode.id });
      }
      if (!templateTargetParentNode) return false;
      return insertTemplateNodeIntoParent(templateTargetParentNode.id, template, templateNode);
    },
    [insertTemplateNodeIntoParent, selectedNode, templateTargetParentNode, wrapAreaAndInsertTemplates],
  );

  const insertBlankRow = useCallback(
    (targetNodeId: string) => {
      insertLibraryItem(targetNodeId, createBlankEstimateRowTemplate());
    },
    [insertLibraryItem],
  );

  useEffect(() => {
    function handleCommandPaletteShortcut(event: globalThis.KeyboardEvent) {
      if (event.defaultPrevented) return;
      const activeElement = document.activeElement as HTMLElement | null;
      const activeTag = activeElement?.tagName;
      const isTypingTarget = activeElement?.isContentEditable || activeTag === "INPUT" || activeTag === "TEXTAREA" || activeTag === "SELECT";
      const hasBlockingDialog = Boolean(document.querySelector("[role='dialog'], [role='alertdialog']"));

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k" && !hasBlockingDialog) {
        event.preventDefault();
        setShowCommandPalette(true);
        return;
      }

      if (event.key === "/" && !isTypingTarget && !hasBlockingDialog) {
        const sheetHasFocus = activeElement?.closest?.("[data-estimate-center-column='sheet']") || activeElement === document.body;
        if (!sheetHasFocus) return;
        event.preventDefault();
        setShowCommandPalette(true);
      }
    }

    window.addEventListener("keydown", handleCommandPaletteShortcut);
    return () => window.removeEventListener("keydown", handleCommandPaletteShortcut);
  }, []);

  useEffect(() => {
    function handleSidebarAdd(event: Event) {
      const customEvent = event as CustomEvent<EstimateRowItem>;
      if (customEvent.detail && insertTargetNodeId) insertLibraryItem(insertTargetNodeId, customEvent.detail);
    }
    window.addEventListener("archestimator:add-library-item", handleSidebarAdd);
    return () => window.removeEventListener("archestimator:add-library-item", handleSidebarAdd);
  }, [insertLibraryItem, insertTargetNodeId]);

  // Template drops on the left estimate tree arrive here: that panel can
  // target a group or area row but the optimistic insert + rollback flow
  // lives in this component. Category drags carry several template ids;
  // dragging a node from inside a template carries that node's id. Area
  // targets wrap the area and the payload in a new group.
  useEffect(() => {
    function handleInsertTemplateEvent(event: Event) {
      const detail = (event as CustomEvent<Partial<InsertEstimateTemplateEventDetail> & { targetParentNodeId?: string; wrapAreaNodeId?: string; templateId?: string; templateNodeId?: string; templateIds?: unknown }>).detail;
      if (typeof detail?.wrapAreaNodeId === "string") {
        if (typeof detail.templateId === "string" && typeof detail.templateNodeId === "string") {
          wrapAreaAndInsertTemplates(detail.wrapAreaNodeId, { kind: "template-node", templateId: detail.templateId, templateNodeId: detail.templateNodeId });
          return;
        }
        if (!Array.isArray(detail.templateIds)) return;
        const wrapTemplateIds = detail.templateIds.filter((templateId): templateId is string => typeof templateId === "string" && templateId.length > 0);
        if (wrapTemplateIds.length > 0) wrapAreaAndInsertTemplates(detail.wrapAreaNodeId, { kind: "templates", templateIds: wrapTemplateIds });
        return;
      }
      if (typeof detail?.targetParentNodeId !== "string") return;
      if (typeof detail.templateId === "string" && typeof detail.templateNodeId === "string") {
        insertTemplateNodeIntoParentById(detail.targetParentNodeId, detail.templateId, detail.templateNodeId);
        return;
      }
      if (!Array.isArray(detail.templateIds)) return;
      for (const templateId of detail.templateIds) {
        if (typeof templateId === "string" && templateId) insertTemplateIntoParentById(detail.targetParentNodeId, templateId);
      }
    }
    window.addEventListener(INSERT_ESTIMATE_TEMPLATE_EVENT, handleInsertTemplateEvent);
    return () => window.removeEventListener(INSERT_ESTIMATE_TEMPLATE_EVENT, handleInsertTemplateEvent);
  }, [insertTemplateIntoParentById, insertTemplateNodeIntoParentById, wrapAreaAndInsertTemplates]);

  const replaceRowItem = useStableCallback((rowItemId: string, libraryItem: EstimateRowItem) => {
    const previousTree = estimateTree;
    const previousRows = editableRows;
    const editableReplacement = previousRows[rowItemId];
    const replacementLibraryItem = applyEditableValuesToLibraryItem(libraryItem, editableReplacement);
    const replacementItem = replaceRowItemWithLibraryItem(rowItemId, replacementLibraryItem);
    const rollbackRevision = setEstimateTree((current) =>
      current.map((node) => {
        function visit(areaNode: EstimateTreeNode): EstimateTreeNode {
          return {
            ...areaNode,
            estimateRowItems: areaNode.estimateRowItems?.map((item) =>
              item.id === rowItemId ? replacementItem : item,
            ),
            children: areaNode.children?.map(visit),
          };
        }
        return visit(node);
      }),
    );
    setEditableRows((current) => ({
      ...current,
      [rowItemId]: current[rowItemId] ?? previousRows[rowItemId] ?? getInitialEditableRow(replacementItem),
    }));
    if (projectId && estimateId) {
      replaceRow({ projectId, estimateId, rowId: rowItemId, libraryItem: replacementLibraryItem, rollback: () => restoreEstimateState(previousTree, previousRows, rollbackRevision) });
    }
  });

  const clearRowComponent = useStableCallback((rowItemId: string) => {
    replaceRowItem(rowItemId, createBlankEstimateRowTemplate());
  });

  const requestProjectSpecific = useStableCallback((rowItemId: string) => {
    const row = currentRows.find((candidate) => candidate.item.id === rowItemId);
    if (!row || !canMakeProjectSpecific(row.item)) return;
    setProjectSpecificRowId(rowItemId);
  });

  function confirmProjectSpecific() {
    if (!projectId || !estimateId || !projectSpecificRow) {
      setProjectSpecificRowId("");
      return;
    }

    const rowItemId = projectSpecificRow.item.id;
    const previousTree = estimateTree;
    const previousRows = editableRows;
    const rollbackRevision = getEstimateTreeRevision();
    detachRow({
      projectId,
      estimateId,
      rowId: rowItemId,
      rollback: () => restoreEstimateState(previousTree, previousRows, rollbackRevision),
    });
    setProjectSpecificRowId("");
  }

  const moveRowComponent = useStableCallback((sourceRowItemId: string, targetRowItemId: string, movedItem: EstimateRowItem) => {
    if (sourceRowItemId === targetRowItemId) return;
    replaceRowItem(targetRowItemId, movedItem);
    clearRowComponent(sourceRowItemId);
  });

  const deleteRowItem = useStableCallback((rowItemId: string) => {
    const previousTree = estimateTree;
    const previousRows = editableRows;
    const rollbackRevision = setEstimateTree((current) =>
      current.map((node) => {
        function visit(areaNode: EstimateTreeNode): EstimateTreeNode {
          return {
            ...areaNode,
            estimateRowItems: areaNode.estimateRowItems?.filter((item) => item.id !== rowItemId),
            children: areaNode.children?.map(visit),
          };
        }
        return visit(node);
      }),
    );
    setEditableRows((current) => {
      const remainingRows = { ...current };
      delete remainingRows[rowItemId];
      return remainingRows;
    });
    if (projectId && estimateId) {
      deleteRow({ projectId, estimateId, rowId: rowItemId, rollback: () => restoreEstimateState(previousTree, previousRows, rollbackRevision) });
    }
  });

  function deleteSelectedRows() {
    bulkSelectedRowIds.forEach((rowItemId) => deleteRowItem(rowItemId));
    setBulkSelectedRowIds(new Set());
  }

  return (
    <>
      <CommandPalette
        open={showCommandPalette}
        items={shouldLoadLibraryLazily ? resolvedLibraryItems ?? EMPTY_ESTIMATE_ROW_ITEMS : libraryItems}
        canInsert={canInsertIntoSelectedNode}
        targetLabel={insertionTargetLabel}
        onClose={() => setShowCommandPalette(false)}
        onInsert={insertIntoSelectedNode}
      />
      <ProposalExportPreviewDialog
        open={isProposalPreviewOpen}
        model={proposalPreviewModel}
        isStale={isProposalPreviewStale}
        downloadHref={proposalDownloadHref}
        onRefresh={refreshProposalPreview}
        onClose={() => setIsProposalPreviewOpen(false)}
      />
      {inspector ? (
        <ActivityHistoryModal
          scope={inspector}
          scopeItems={activityScopeItems}
          selectedScopeItem={selectedActivityScopeItem}
          metadata={resolvedProposalExportMetadata}
          historyData={historyData}
          activityFilters={activityFilters}
          isHistoryLoading={isHistoryLoading}
          isHistoryLoadingMore={isHistoryLoadingMore}
          historyError={historyError}
          onActivityFiltersChange={replaceActivityFilters}
          onActivityFiltersReset={resetActivityFilters}
          onClose={closeInspector}
          onRetry={reloadVersionControl}
          onLoadMore={loadMoreVersionControl}
          onScopeSelect={selectActivityScope}
        />
      ) : null}
      {rowDetails ? (
        <RowDetailsModal
          row={selectedRowDetailsItem}
          tab={rowDetails.tab}
          projectId={projectId}
          estimateId={estimateId}
          onTabChange={setRowDetailsTab}
          onClose={closeRowDetails}
        />
      ) : null}
      {projectSpecificRow ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setProjectSpecificRowId("");
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Make component project-specific"
            className="w-[min(360px,calc(100vw-32px))] border border-hairline bg-white p-3 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-ink">Make component project-specific</p>
                <p className="mt-1 text-[10px] leading-4 text-tertiary">
                  {projectSpecificRow.item.material} will keep its current row values and stop following library updates.
                </p>
              </div>
              <Button type="button" variant="ghost" size="icon-sm" className="size-6 rounded-xs p-0" aria-label="Close project-specific dialog" onClick={() => setProjectSpecificRowId("")}>
                <X size={13} weight="regular" aria-hidden="true" />
              </Button>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => setProjectSpecificRowId("")}>Cancel</Button>
              <Button type="button" variant="primary" size="sm" onClick={confirmProjectSpecific}>Make project-specific</Button>
            </div>
          </section>
        </div>
      ) : null}
      <section
        id="estimate-sheet-center-column"
        className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white"
        data-estimate-center-column="sheet"
        aria-label="Main estimate sheet"
      >
        {selectedNode ? (
          <>
            <EstimateSheetHeader
              onExpandAll={expandAll}
              onCollapseAll={collapseAll}
              onPreviewProposalExport={openProposalPreview}
              canPreviewProposalExport={Boolean(resolvedProposalExportMetadata)}
              onOpenSheetActivity={openActivityHistory}
              searchQuery={sheetSearchQuery}
              onSearchQueryChange={setSheetSearchQuery}
            />
            <div className="relative flex min-h-0 flex-1 flex-col">
              <div
                className={cn("relative min-h-0 flex-1 overflow-auto px-2", bulkSelectedRowCount > 0 ? "pb-16" : "pb-2")}
                data-estimate-pointer-surface
              >
                <EstimateSheetCursorLayer estimateId={estimateId} userId={collaborationUserId} displayName={collaborationDisplayName} />
                {displayedSheetNode ? (
                <EstimateSheetExpansionContext.Provider value={sheetExpansionContextValue}>
                  <EstimateSheetBranch
                    node={displayedSheetNode}
                    nodeCode={resolvedSelectedNodeId ? computeNodeCode(estimateTree, resolvedSelectedNodeId) : ""}
                    ancestorPath={resolvedSelectedNodeId ? findNodePath(estimateTree, resolvedSelectedNodeId).slice(0, -1).map((n) => ({ id: n.id, name: n.name })) : []}
                    editableRows={editableRows}
                    setEditableRows={setEditableRows}
                    onInsertLibraryItem={insertLibraryItem}
                    onInsertTemplate={insertTemplateIntoParentById}
                    onInsertTemplateNode={insertTemplateNodeIntoParentById}
                    onWrapAreaWithTemplate={wrapAreaAndInsertTemplates}
                    onAddBlankRow={insertBlankRow}
                    onReplaceRowItem={replaceRowItem}
                    onDeleteRowItem={deleteRowItem}
                    onUpdateRowItem={updateRowItem}
                    onMarkRowDirty={markRowDirty}
                    onOpenRowDetails={openRowDetails}
                    onClearRowComponent={clearRowComponent}
                    onRequestProjectSpecific={requestProjectSpecific}
                    onMoveRowComponent={moveRowComponent}
                    selectedRowIds={bulkSelectedRowIds}
                    onToggleRowSelection={toggleRowSelection}
                    onToggleRowsSelection={toggleRowsSelection}
                  />
                </EstimateSheetExpansionContext.Provider>
                ) : (
                  <div className="mt-4 rounded-xs border border-dashed border-hairline bg-surfaceMuted p-3 text-center text-[10px] leading-4 text-tertiary">
                    No sheet rows match &quot;{sheetSearchQuery}&quot;.
                  </div>
                )}
              </div>
              <BulkActionToolbar
                placement="bottom-dock"
                dockTo="container"
                selectedCount={bulkSelectedRowCount}
                selectedLabel={bulkSelectedRowCount === 1 ? "row selected" : "rows selected"}
                onClear={clearRowSelection}
                actions={[
                  {
                    label: "Delete selected rows",
                    icon: <Trash size={12} weight="regular" />,
                    variant: "danger",
                    onClick: deleteSelectedRows,
                  },
                ]}
              />
            </div>
          </>
        ) : (
          <>
            <EstimateSheetHeader
              onExpandAll={expandAll}
              onCollapseAll={collapseAll}
              onPreviewProposalExport={openProposalPreview}
              canPreviewProposalExport={Boolean(resolvedProposalExportMetadata)}
              onOpenSheetActivity={openActivityHistory}
              searchQuery={sheetSearchQuery}
              onSearchQueryChange={setSheetSearchQuery}
            />
            <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-auto px-2 pb-2" data-estimate-pointer-surface>
              <EstimateSheetCursorLayer estimateId={estimateId} userId={collaborationUserId} displayName={collaborationDisplayName} />
              <div className="max-w-md rounded-xs border border-dashed border-hairline bg-surface-muted p-3 text-center">
                <p className="text-[8px] font-medium uppercase tracking-normal text-tertiary">Empty estimate</p>
                <h2 className="mt-1 text-[10px] font-medium tracking-normal text-ink">No estimate tree yet</h2>
                <p className="mt-1 text-[10px] leading-4 text-tertiary">
                  This estimate has no Group Nodes, Area Nodes, or cost estimate rows. Rebuild the tree first, then place cost rows only inside Area Nodes.
                </p>
              </div>
            </div>
          </>
        )}
      </section>
      {renderSidebar ? (
        shouldLoadLibraryLazily && !lazyLibrary ? (
          <ComponentLibrarySidebarFallback isError={libraryQuery.isError} onRetry={() => libraryQuery.refetch()} />
        ) : (
          <EstimateRightSidebar
            onInsertComponent={insertIntoSelectedNode}
            projectId={projectId}
            estimateId={estimateId}
            selectedNodeId={resolvedSelectedNodeId}
            selectedNodeKind={selectedNode?.kind ?? null}
            selectedNodeName={selectedNode?.name ?? null}
            templateTargetName={templateInsertionTargetLabel}
            canInsertTemplate={canInsertTemplateIntoSelectedNode}
            nodes={estimateTree}
            initialLibraryItems={resolvedLibraryItems}
            templates={availableTemplates}
            categoryTree={libraryCategoryTree ?? lazyLibrary?.categoryTree}
            suppliers={librarySuppliers ?? lazyLibrary?.suppliers}
            brands={libraryBrands ?? lazyLibrary?.brands}
            libraryFolders={libraryFolders ?? lazyLibrary?.libraryFolders}
            onInsertTemplate={insertTemplateIntoSelectedGroup}
            onInsertTemplateNode={insertTemplateNodeIntoSelectedGroup}
            onLibraryDataChanged={handleLibraryDataChanged}
          />
        )
      ) : null}
    </>
  );
}

// Placeholder column while the lazy component-library dataset loads. Keeps
// the sidebar footprint stable so the sheet does not reflow, and keeps load
// failures visible and retryable without blocking sheet editing.
function ComponentLibrarySidebarFallback({ isError, onRetry }: { isError: boolean; onRetry: () => void }) {
  return (
    <aside className="flex h-full min-h-0 min-w-[320px] flex-col border-l border-hairline bg-white p-2">
      {isError ? (
        <div role="alert" className="mt-2 rounded-xs border border-dashed border-hairline bg-surfaceMuted p-3 text-center">
          <p className="text-[10px] font-medium text-ink">Couldn&apos;t load the component library</p>
          <p className="mt-1 text-[10px] leading-4 text-tertiary">The estimate sheet is still editable. Retry to load components and templates.</p>
          <Button type="button" variant="secondary" size="sm" className="mt-2" onClick={onRetry}>
            Retry
          </Button>
        </div>
      ) : (
        <div role="status" aria-label="Loading component library" className="space-y-1">
          <Skeleton className="h-7 w-full" />
          {Array.from({ length: 12 }, (_, index) => (
            <Skeleton key={index} className="h-6 w-full" />
          ))}
          <span className="sr-only">Loading component library</span>
        </div>
      )}
    </aside>
  );
}
