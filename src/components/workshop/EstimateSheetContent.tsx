"use client";

import { type ChangeEvent, type Dispatch, type DragEvent, type InputHTMLAttributes, type KeyboardEvent, type MouseEvent, type PointerEvent, type ReactNode, type SetStateAction, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ArrowsOutSimple, CaretDown, ClockCounterClockwise, Cube, DotsSixVertical, DotsThreeVertical, FileXls, FolderSimple, FunnelSimple, Plus, Trash, WarningCircle, X } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { ControlField, ControlInput } from "@/components/ui/control-input";
import { ControlSelect } from "@/components/ui/control-select";
import { HeaderIconToolbar } from "@/components/ui/header-icon-toolbar";
import { SearchInput } from "@/components/ui/search-input";
import { dispatchProjectTotalChange } from "@/components/workshop/ProjectTotalHeader";
import { useEstimateRowMutations } from "@/hooks/use-estimate-row-mutations";
import { useEstimateCursorCollaboration, type RemoteEstimateCursor } from "@/hooks/use-estimate-cursor-broadcast";
import { useEstimateAreaTreeQuery } from "@/hooks/use-estimate-query";
import { resolveEstimateWorkspaceSelection, useEstimateWorkspaceSelection } from "@/hooks/use-estimate-workspace-state";
import { fetchEstimateSheetVersionControl, insertEstimateTemplateIntoEstimate, type EstimateSheetHistoryEvent, type EstimateSheetVersionControlData } from "@/lib/estimates/actions";
import { getCollaborationColorForUser } from "@/lib/collaboration/colors";
import { getEstimateNodeDisplayKind } from "@/lib/estimates/tree-hierarchy";
import { buildProposalExportModel } from "@/lib/proposal-export/build-proposal-export-model";
import type { ProposalExportMetadata, ProposalExportModel } from "@/lib/proposal-export/types";
import type { ComponentLibraryTaxonomyNode } from "@/lib/component-library/taxonomy";
import { cn } from "@/lib/ui/cn";
import { EstimateRightSidebar } from "./component-library";
import { CommandPalette } from "./component-library/CommandPalette";
import { ESTIMATE_TEMPLATE_DRAG_MIME_TYPE, type EstimateTemplate } from "./component-library/templates";
import type { ComponentLibraryBrandOption, ComponentLibrarySupplierOption } from "./component-library/tree/buildLibraryTree";
import { findEstimateNode, sampleEstimateTree, type EstimateTreeNode, type EstimateRowItem } from "./estimate-tree-data";
import { ProposalExportPreviewDialog } from "./ProposalExportPreviewDialog";
import { WORKSHOP_TREE_ICON_SLOT_CLASS, WORKSHOP_TREE_ROW_GAP_CLASS } from "./tree-visual-style";
import { WorkshopTreeRow, WorkshopTreeTabs, type WorkshopTreeTabItem } from "./workshop-tree";


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
  libraryBrands?: ComponentLibraryBrandOption[];
};

const EMPTY_ESTIMATE_TEMPLATES: EstimateTemplate[] = [];
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
  onAddBlankRow: (targetNodeId: string) => void;
  onReplaceRowItem: (rowItemId: string, libraryItem: EstimateRowItem) => void;
  onDeleteRowItem: (rowItemId: string) => void;
  onUpdateRowItem: (rowItemId: string, values: Partial<EditableRowValue>) => void;
  onMarkRowDirty: (rowItemId: string) => void;
  onOpenRowDetails: (rowItemId: string, opener: HTMLElement, tab?: RowDetailTab) => void;
  onClearRowComponent: (rowItemId: string) => void;
  onRequestProjectSpecific: (rowItemId: string) => void;
  onMoveRowComponent: (sourceRowItemId: string, targetRowItemId: string, movedItem: EstimateRowItem) => void;
  depth?: number;
  usesSiblingGroupRhythm?: boolean;
};

type EstimateActivityScope =
  | { mode: "row"; rowId: string }
  | { mode: "sheet" }
  | { mode: "node"; nodeId: string; includeDescendants: boolean };

type RowDetailTab = "details" | "component" | "activity";

type RowDetailsState = {
  rowId: string;
  tab: RowDetailTab;
};

type ActivityFilterState = {
  eventType: string;
  search: string;
  dateFrom: string;
  dateTo: string;
};

const DEFAULT_ACTIVITY_FILTERS: ActivityFilterState = {
  eventType: "",
  search: "",
  dateFrom: "",
  dateTo: "",
};

const ACTIVITY_FILTER_EVENT_TYPES = [
  { value: "", label: "All events" },
  { value: "row_updated", label: "Row updates" },
  { value: "row_replaced", label: "Replacements" },
  { value: "row_added", label: "Added rows" },
  { value: "row_blank_added", label: "Added blank rows" },
  { value: "row_deleted", label: "Deleted rows" },
  { value: "template_inserted", label: "Templates" },
  { value: "node_created", label: "Node created" },
  { value: "node_renamed", label: "Node renamed" },
  { value: "tree_reordered", label: "Tree reordered" },
  { value: "node_deleted_with_children", label: "Node deleted" },
  { value: "sheet_code_updated", label: "Sheet code" },
  { value: "sheet_metadata_updated", label: "Sheet metadata" },
] as const;

const ACTIVITY_SCOPE_TREE_TABS: readonly WorkshopTreeTabItem<"sheets">[] = [{ id: "sheets", label: "Sheets" }];

type FlattenedEstimateRow = {
  item: EstimateRowItem;
  nodeId: string;
  nodePath: string[];
  quantity: number;
  contingencyPercentage: number;
  contingencyValue: number;
  miscCost: number;
  lineTotal: number;
};

type ActivityScopeTreeItem = {
  id: string;
  scope: EstimateActivityScope;
  depth: number;
  kind: "sheet" | "group" | "area" | "row";
  label: string;
  eyebrow: string;
  description?: string;
  total: number | null;
  row: FlattenedEstimateRow | null;
};

type EstimateMaterialCardItem = Pick<EstimateRowItem, "material" | "supplier" | "itemCost" | "description" | "unit" | "imageUrl" | "category">;
type EstimateComponentDragPayload = {
  rowItemId: string;
  item: EstimateRowItem;
};

export const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
});

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
  return <Cube size={13} weight="regular" aria-hidden="true" />;
}

function AddTreeActionIcon({ kind }: { kind: EstimateTreeNode["kind"] }) {
  const Icon = getEstimateNodeDisplayKind(kind) === "group" ? FolderSimple : Cube;
  return (
    <span className="relative flex size-4 items-center justify-center" aria-hidden="true">
      <Icon size={13} weight="regular" className="absolute left-0 top-1/2 -translate-y-1/2" />
      <Plus size={8} weight="regular" className="absolute right-0 top-0" />
    </span>
  );
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

type CostAdjustmentMode = "contingency" | "discount";

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

const BLANK_ESTIMATE_ROW_COMPONENT_LABEL = "Drag or add a component here";
const BLANK_ESTIMATE_ROW_TAG = "manual-row-placeholder";
const BLANK_ESTIMATE_ROW_AUDIT_LABEL = "Empty row slot";

function parseEditableNumber(value: string) {
  const parsed = Number(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function clampContingencyPercentage(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(-100, value));
}

function clampCostAdjustmentMagnitude(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.abs(value)));
}

function toEditableContingencyMode(value: number): CostAdjustmentMode {
  return value < 0 ? "discount" : "contingency";
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

function formatCostAdjustmentPercentage(value: number) {
  const modeLabel = toEditableContingencyMode(value) === "discount" ? "Discount" : "Contingency";
  return `${modeLabel} ${formatAuditNumber(Math.abs(clampContingencyPercentage(value)))}%`;
}

function formatEditableMoney(value: string) {
  return pesoFormatter.format(parseEditableNumber(value)).replace("₱", "₱ ");
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

function isBlankEstimateRowItem(item: EstimateRowItem) {
  const isTaggedPlaceholder = item.tags?.includes(BLANK_ESTIMATE_ROW_TAG);
  const isPersistedPlaceholder =
    item.source === "project" &&
    item.material === BLANK_ESTIMATE_ROW_COMPONENT_LABEL &&
    item.itemCost === 0 &&
    item.category === "Unassigned" &&
    !item.imageUrl;

  return (
    item.source === "project" &&
    item.material === BLANK_ESTIMATE_ROW_COMPONENT_LABEL &&
    (isTaggedPlaceholder || isPersistedPlaceholder)
  );
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
  const quantity = parseEditableNumber(editableRow.quantity);
  const contingencyPercentage = parseEditableContingencyPercentage(editableRow);
  const miscCost = parseEditableNumber(editableRow.miscCost);
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

      const quantity = parseEditableNumber(editableRow.quantity);
      const contingencyPercentage = parseEditableContingencyPercentage(editableRow);
      const miscCost = parseEditableNumber(editableRow.miscCost);
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

function formatPeso(value: number) {
  return pesoFormatter.format(value).replace("₱", "₱ ");
}

function formatSignedPeso(value: number | null | undefined) {
  if (value === null || value === undefined || Math.abs(value) < 0.005) return "no total change";
  const sign = value > 0 ? "+" : "-";
  return `${sign}${formatPeso(Math.abs(value))}`;
}

function formatShortDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Pending";
  return date.toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatActivityDay(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unscheduled";
  return date.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function readRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function readStringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function flattenEstimateRows(nodes: EstimateTreeNode[], editableRows: Record<string, EditableRowValue>): FlattenedEstimateRow[] {
  const rows: FlattenedEstimateRow[] = [];

  function visit(node: EstimateTreeNode, path: string[]) {
    const nodePath = [...path, node.name];
    node.estimateRowItems?.forEach((item) => {
      const editableRow = editableRows[item.id] ?? getInitialEditableRow(item);
      const quantity = parseEditableNumber(editableRow.quantity);
      const contingencyPercentage = parseEditableContingencyPercentage(editableRow);
      const miscCost = parseEditableNumber(editableRow.miscCost);
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

function getEventLabel(eventType: string) {
  const labels: Record<string, string> = {
    row_added: "Row added",
    row_blank_added: "Blank row added",
    row_updated: "Row updated",
    row_replaced: "Row replaced",
    row_deleted: "Row deleted",
    tree_reordered: "Tree reordered",
    template_inserted: "Template inserted",
    sheet_code_updated: "Sheet code updated",
    sheet_metadata_updated: "Sheet metadata updated",
    node_created: "Node created",
    node_renamed: "Node renamed",
    node_deleted_with_children: "Area deleted",
  };
  return labels[eventType] ?? eventType.replace(/_/g, " ");
}

function isBlankEstimateRowAuditMaterial(value: unknown) {
  return readStringValue(value).trim() === BLANK_ESTIMATE_ROW_COMPONENT_LABEL;
}

function isBlankEstimateRowAuditSnapshot(snapshot: Record<string, unknown>) {
  if (!isBlankEstimateRowAuditMaterial(snapshot.material)) return false;
  if (snapshot.sourceLibraryItemId) return false;

  const sourceSnapshot = readRecord(snapshot.sourceSnapshot);
  const hasSourceSnapshot = Object.keys(sourceSnapshot).length > 0;
  const unitCost = readOptionalNumber(snapshot.unitCost ?? snapshot.itemCost);
  const lineTotal = readOptionalNumber(snapshot.lineTotal);
  const hasCost = (unitCost !== null && Math.abs(unitCost) >= 0.005) || (lineTotal !== null && Math.abs(lineTotal) >= 0.005);
  return !hasSourceSnapshot && !hasCost;
}

function isBlankEstimateRowAuditEvent(event: EstimateSheetHistoryEvent) {
  if (event.eventType !== "row_blank_added" && event.eventType !== "row_deleted") return false;
  return (
    isBlankEstimateRowAuditMaterial(event.rowContext.material) ||
    isBlankEstimateRowAuditSnapshot(getEventSnapshotRecord(event.oldSnapshot)) ||
    isBlankEstimateRowAuditSnapshot(getEventSnapshotRecord(event.newSnapshot))
  );
}

function formatAuditMaterialName(value: string) {
  return value.trim() === BLANK_ESTIMATE_ROW_COMPONENT_LABEL ? BLANK_ESTIMATE_ROW_AUDIT_LABEL : value;
}

function getEventSummary(event: EstimateSheetHistoryEvent) {
  const rowContext = event.rowContext;
  const payload = event.payload;
  const material = formatAuditMaterialName(readStringValue(rowContext.material));
  if (isBlankEstimateRowAuditEvent(event)) {
    return event.eventType === "row_deleted" ? `${BLANK_ESTIMATE_ROW_AUDIT_LABEL} removed` : `${BLANK_ESTIMATE_ROW_AUDIT_LABEL} added`;
  }
  if (event.eventType === "row_replaced") {
    const oldSnapshot = getEventSnapshotRecord(event.oldSnapshot);
    const newSnapshot = getEventSnapshotRecord(event.newSnapshot);
    return `${formatAuditComponentIdentity(oldSnapshot, material)} -> ${formatAuditComponentIdentity(newSnapshot, material)}`;
  }
  if (event.eventType === "row_updated" && event.changedFields.length) return event.changedFields.map(summarizeChangedAuditField).join(", ");
  if (event.eventType === "template_inserted") return "Template rows were inserted into the estimate tree";
  if (event.eventType === "sheet_code_updated") return "Sheet code changed";
  if (event.eventType === "sheet_metadata_updated") return "Estimate sheet metadata changed";
  if (event.eventType === "node_created") return `${readStringValue(payload.kind, "Node")} ${readStringValue(payload.name, "created")}`;
  if (event.eventType === "node_renamed") return `${readStringValue(payload.oldName, "Node")} -> ${readStringValue(payload.newName, "renamed")}`;
  if (event.eventType === "tree_reordered") return "Estimate tree order changed";
  if (event.eventType === "node_deleted_with_children") return "Area and nested rows removed";
  if (material) return material;
  return readStringValue(payload.title) || "Estimate sheet activity";
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

function EstimateDropZone({
  label,
  compact = false,
  isDragOver = false,
  onActivate,
  ariaLabel,
}: {
  label: string;
  compact?: boolean;
  isDragOver?: boolean;
  onActivate?: () => void;
  ariaLabel?: string;
}) {
  const className = cn(
    "border border-dashed text-tertiary transition-opacity",
    compact
      ? "flex min-h-20 items-center justify-center border-divider bg-surfaceWarm/80"
      : "flex h-16 w-full items-center justify-center gap-1.5 border-hairline bg-surfaceMuted/30 opacity-50 hover:opacity-100",
    !compact && isDragOver && "opacity-100",
    onActivate &&
      "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1",
  );
  const content = (
    <>
      {compact ? (
        <div className="flex flex-col items-center justify-center gap-1 text-center text-[8px] font-medium uppercase tracking-normal">
          <span className="flex size-5 items-center justify-center rounded-xs border border-dashed border-divider bg-white text-ink">
            <Plus size={12} weight="regular" aria-hidden="true" />
          </span>
          <span>{label}</span>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-[10px] font-normal">
          <Plus size={12} weight="regular" aria-hidden="true" />
          <span>{label}</span>
        </div>
      )}
    </>
  );

  if (onActivate) {
    return (
      <button
        type="button"
        className={className}
        onClick={onActivate}
        aria-label={ariaLabel ?? label}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={className}>
      {content}
    </div>
  );
}

const componentImageFallbacks: Record<string, string> = {
  furniture: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=600&q=80",
  cabinetry: "https://images.unsplash.com/photo-1556909212-d5b604d0c90d?auto=format&fit=crop&w=600&q=80",
  finishes: "https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=600&q=80",
  "wall paints / interior finishes": "https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=600&q=80",
  "electrical fixtures": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=600&q=80",
  "lighting fixtures": "https://images.unsplash.com/photo-1524484485831-a92ffc0de03f?auto=format&fit=crop&w=600&q=80",
  "plumbing fixtures": "https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&w=600&q=80",
  "kitchen fixtures": "https://images.unsplash.com/photo-1556912167-f556f1f39fdf?auto=format&fit=crop&w=600&q=80",
  outdoor: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=600&q=80",
};

function getComponentImageUrl(item: EstimateMaterialCardItem) {
  if (item.imageUrl) return item.imageUrl;
  const category = item.category?.toLowerCase();
  if (category && componentImageFallbacks[category]) return componentImageFallbacks[category];
  const material = item.material.toLowerCase();
  if (material.includes("paint") || material.includes("skimcoat") || material.includes("wallpaper")) return componentImageFallbacks["wall paints / interior finishes"];
  if (material.includes("light") || material.includes("outlet") || material.includes("switch") || material.includes("led")) return componentImageFallbacks["electrical fixtures"];
  if (material.includes("toilet") || material.includes("lavatory") || material.includes("vanity") || material.includes("sink")) return componentImageFallbacks["plumbing fixtures"];
  if (material.includes("tile") || material.includes("floor")) return componentImageFallbacks.finishes;
  if (material.includes("wardrobe") || material.includes("cabinet")) return componentImageFallbacks.cabinetry;
  return componentImageFallbacks.furniture;
}

function EstimateMaterialCardContent({ item }: { item: EstimateMaterialCardItem }) {
  return (
    <>
      <div className="flex gap-2">
        <div
          className="size-14 shrink-0 rounded-xs bg-neutral-100 bg-cover bg-center"
          style={{ backgroundImage: `url(${getComponentImageUrl(item)})` }}
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

function EstimateRowItemsTable({
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
}: {
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
}) {
  const [focusedCell, setFocusedCell] = useState<{ rowId: string; cellIndex: number } | null>(null);
  const [replaceTargetRowId, setReplaceTargetRowId] = useState("");
  const computedRows = useMemo(
    () =>
      items.map((item) => {
        const editableRow = editableRows[item.id] ?? getInitialEditableRow(item);
        const quantity = parseEditableNumber(editableRow.quantity);
        const contingencyPercentage = parseEditableContingencyPercentage(editableRow);
        const miscCost = parseEditableNumber(editableRow.miscCost);
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
              <input type="checkbox" aria-label="Select all estimate row items" />
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
                  <span className="flex h-6 items-center justify-center">
                    <DotsSixVertical size={14} weight="regular" aria-label={`Drag material ${item.material}`} />
                  </span>
                  <span className="flex h-6 items-center justify-center">
                    <input type="checkbox" aria-label={`Select ${item.material}`} />
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
                    "relative flex flex-col items-stretch justify-center gap-1 border-r border-hairline px-1 py-1 text-center",
                    activeCellIndex === 1 && "bg-accent/10 ring-1 ring-inset ring-accent/30",
                  )}
                  data-estimate-cell-active={activeCellIndex === 1 ? "true" : undefined}
                >
                  <ControlSelect
                    value={item.editableContingencyMode}
                    aria-label={`${item.material} adjustment type`}
                    wrapperClassName="mx-auto w-full max-w-[92px] justify-center"
                    className="h-4 w-full border-0 bg-transparent pl-1 pr-4 text-center !text-[9px]"
                    onChange={(event) => {
                      const nextMode = event.target.value as CostAdjustmentMode;
                      setEditableRows((current) => updateEditableRowValue(current, item, { contingencyMode: nextMode }));
                      onMarkRowDirty(item.id);
                      const nextContingencyPercentage = parseCostAdjustmentPercentage(item.editableContingencyPercentage, nextMode);
                      if (nextContingencyPercentage !== item.storedContingencyPercentage) {
                        onUpdateRowItem(item.id, { contingencyMode: nextMode, contingencyPercentage: item.editableContingencyPercentage });
                      }
                    }}
                  >
                    {COST_ADJUSTMENT_MODE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </ControlSelect>
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
                    className="h-5 w-full border-0 bg-transparent p-0 text-center text-[10px] font-medium tabular-nums shadow-none [appearance:textfield] focus-visible:ring-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  <p className="max-w-full truncate text-center text-[9px] font-medium leading-3 tabular-nums text-tertiary">
                    {formatPeso(item.contingencyValue)}
                  </p>
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
}

function EmptyAreaMessage({
  nodeId,
  nodeName,
  onInsertLibraryItem,
  onAddBlankRow,
}: {
  nodeId: string;
  nodeName: string;
  onInsertLibraryItem: (targetNodeId: string, libraryItem: EstimateRowItem) => void;
  onAddBlankRow: (targetNodeId: string) => void;
}) {
  const [dragCount, setDragCount] = useState(0);
  const isDragOver = dragCount > 0;
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
        label="Drag and drop estimate component here"
        isDragOver={isDragOver}
        onActivate={() => onAddBlankRow(nodeId)}
        ariaLabel={`Add blank estimate row to ${nodeName}`}
      />
    </div>
  );
}

function InlineDropZone({
  nodeId,
  nodeName,
  onInsertLibraryItem,
  onAddBlankRow,
}: {
  nodeId: string;
  nodeName: string;
  onInsertLibraryItem: (targetNodeId: string, libraryItem: EstimateRowItem) => void;
  onAddBlankRow: (targetNodeId: string) => void;
}) {
  const [dragCount, setDragCount] = useState(0);
  const isDragOver = dragCount > 0;
  return (
    <div
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
        label="Drag and drop estimate component here"
        isDragOver={isDragOver}
        onActivate={() => onAddBlankRow(nodeId)}
        ariaLabel={`Add blank estimate row to ${nodeName}`}
      />
    </div>
  );
}

function EstimateSheetBranch({ node, nodeCode, ancestorPath = [], editableRows, setEditableRows, onInsertLibraryItem, onInsertTemplate, onAddBlankRow, onReplaceRowItem, onDeleteRowItem, onUpdateRowItem, onMarkRowDirty, onOpenRowDetails, onClearRowComponent, onRequestProjectSpecific, onMoveRowComponent, depth = 0, usesSiblingGroupRhythm = false }: EstimateSheetBranchProps) {
  const { collapsedNodeIds, setCollapsedNodeIds } = useEstimateSheetExpansion();
  const collapsed = collapsedNodeIds.has(node.id);
  const childAreas = node.children ?? [];
  const estimateRowItems = node.estimateRowItems ?? [];
  const hasContents = childAreas.length > 0 || estimateRowItems.length > 0;
  const canReceiveRows = node.kind === "area";
  const isGroup = node.kind === "group";
  const hasMixedChildKinds = childAreas.some((child) => child.kind === "group") && childAreas.some((child) => child.kind === "area");
  const leftIndent = Math.min(depth * 32, 192);
  const total = computeNodeTotal(node, editableRows);
  const displayKind = isGroup ? "group" : "area";
  const showBreadcrumbs = !collapsed && !isGroup && ancestorPath.length > 0;
  const canReceiveTemplates = isGroup;

  function handleTemplateDragOver(event: DragEvent<HTMLElement>) {
    if (!canReceiveTemplates || !event.dataTransfer.types.includes(ESTIMATE_TEMPLATE_DRAG_MIME_TYPE)) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "copy";
  }

  function handleTemplateDrop(event: DragEvent<HTMLElement>) {
    if (!canReceiveTemplates) return;
    const payload = event.dataTransfer.getData(ESTIMATE_TEMPLATE_DRAG_MIME_TYPE);
    if (!payload) return;
    event.preventDefault();
    event.stopPropagation();
    try {
      const parsed = JSON.parse(payload) as { templateId?: unknown };
      if (typeof parsed.templateId === "string") onInsertTemplate(node.id, parsed.templateId);
    } catch {
      // Ignore malformed drag payloads from outside the template sidebar.
    }
  }

  return (
    <section
      className={cn(groupGap(depth, node.kind, usesSiblingGroupRhythm), !isGroup && (depth > 0 ? "border border-hairline bg-surfaceMuted/20" : "rounded-xs border border-hairline bg-surfaceMuted/20"))}
      aria-label={node.name}
      onDragOver={handleTemplateDragOver}
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
                onAddBlankRow={onAddBlankRow}
                onReplaceRowItem={onReplaceRowItem}
                onDeleteRowItem={onDeleteRowItem}
                onUpdateRowItem={onUpdateRowItem}
                onMarkRowDirty={onMarkRowDirty}
                onOpenRowDetails={onOpenRowDetails}
                onClearRowComponent={onClearRowComponent}
                onRequestProjectSpecific={onRequestProjectSpecific}
                onMoveRowComponent={onMoveRowComponent}
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
          />
          {!hasContents ? (
            <EmptyAreaMessage
              nodeId={node.id}
              nodeName={node.name}
              onInsertLibraryItem={onInsertLibraryItem}
              onAddBlankRow={onAddBlankRow}
            />
          ) : null}
          {hasContents && canReceiveRows ? (
            <InlineDropZone
              nodeId={node.id}
              nodeName={node.name}
              onInsertLibraryItem={onInsertLibraryItem}
              onAddBlankRow={onAddBlankRow}
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

  const quantity = parseEditableNumber(editableRow.quantity);
  const contingencyPercentage = parseEditableContingencyPercentage(editableRow);
  const miscCost = parseEditableNumber(editableRow.miscCost);
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

function getEventSnapshotRecord(snapshot: unknown) {
  const record = readRecord(snapshot);
  const changedRecord = readRecord(record.changed);
  return Object.keys(changedRecord).length > 0 ? changedRecord : record;
}

type AuditChangeDetail =
  | { kind: "diff"; label: string; oldValue: string; newValue: string }
  | { kind: "note"; label: string; value: string };

type AuditComponentSnapshot = {
  key: string;
  label: string;
  item: EstimateMaterialCardItem;
  imageUrl: string;
  category: string;
  quantityLabel: string | null;
  unitCostLabel: string;
  lineTotalLabel: string;
  sourceLabel: string;
};

const ROW_HISTORY_COMPONENT_EVENT_TYPES = new Set(["row_added", "row_replaced", "row_deleted"]);
const ROW_HISTORY_COMPONENT_FIELDS = new Set(["linkState", "sourceLibraryItemId", "sourceSnapshot"]);
const ROW_HISTORY_SCALAR_FIELDS = new Set(["quantity", "contingencyPercentage", "miscCost"]);
const AUDIT_DETAIL_LIMIT = 5;
const AUDIT_FIELD_LABELS: Record<string, string> = {
  categoryNodeId: "Category",
  contingencyPercentage: "Adjustment",
  description: "Description",
  discipline: "Discipline",
  linkState: "Library status",
  material: "Material",
  metadata: "Metadata",
  miscCost: "Misc cost",
  quantity: "Quantity",
  sheetCode: "Sheet code",
  sourceLibraryItemId: "Component source",
  sourceSnapshot: "Component source",
  supplier: "Supplier",
  supplierId: "Supplier",
  unit: "Unit",
  unitCost: "Unit cost",
};

const AUDIT_LINK_STATE_LABELS: Record<string, string> = {
  "linked-clean": "Using library values",
  "linked-overridden": "Customized from library",
  unlinked: "Manual row",
  detached: "Detached from library",
  "source-changed": "Library source changed",
};

const ROW_REPLACED_DETAIL_FIELDS = ["material", "supplier", "unitCost", "unit", "quantity", "contingencyPercentage", "miscCost"];
const HIDDEN_AUDIT_FIELDS = new Set(["metadata"]);

function shouldRenderRowHistoryComponent(event: EstimateSheetHistoryEvent) {
  if (isBlankEstimateRowAuditEvent(event)) return false;
  if (ROW_HISTORY_COMPONENT_EVENT_TYPES.has(event.eventType)) return true;
  if (event.changedFields.some((field) => ROW_HISTORY_SCALAR_FIELDS.has(field))) return false;
  return event.changedFields.some((field) => ROW_HISTORY_COMPONENT_FIELDS.has(field));
}

function getAuditSnapshotSourceRecord(snapshot: Record<string, unknown>) {
  return readRecord(snapshot.sourceSnapshot);
}

function getAuditSnapshotCategory(snapshot: Record<string, unknown>) {
  const sourceSnapshot = getAuditSnapshotSourceRecord(snapshot);
  const categoryPath = Array.isArray(sourceSnapshot.categoryPath)
    ? sourceSnapshot.categoryPath.filter((part): part is string => typeof part === "string")
    : [];
  const lastCategoryPathPart = categoryPath.length > 0 ? categoryPath[categoryPath.length - 1] : undefined;
  return readStringValue(sourceSnapshot.category, lastCategoryPathPart ?? "Uncategorized");
}

function getAuditSnapshotUnit(snapshot: Record<string, unknown>) {
  const sourceSnapshot = getAuditSnapshotSourceRecord(snapshot);
  return readStringValue(snapshot.unit, readStringValue(sourceSnapshot.unit, "unit"));
}

function getAuditSnapshotUnitCost(snapshot: Record<string, unknown>) {
  const sourceSnapshot = getAuditSnapshotSourceRecord(snapshot);
  return readOptionalNumber(snapshot.unitCost)
    ?? readOptionalNumber(snapshot.itemCost)
    ?? readOptionalNumber(sourceSnapshot.unit_cost);
}

function getAuditSnapshotLineTotal(snapshot: Record<string, unknown>) {
  return readOptionalNumber(snapshot.lineTotal) ?? readOptionalNumber(snapshot.totalItemCosts);
}

function getAuditSnapshotSourceLabel(snapshot: Record<string, unknown>) {
  const sourceSnapshot = getAuditSnapshotSourceRecord(snapshot);
  const versionNumber = readOptionalNumber(sourceSnapshot.componentVersionNumber);
  const priceOptionLabel = readStringValue(sourceSnapshot.priceOptionLabel);
  const sourceKind = snapshot.sourceLibraryItemId || sourceSnapshot.sourceLibraryItemId ? "Library snapshot" : "Row snapshot";
  return [
    sourceKind,
    versionNumber !== null ? `V${versionNumber}` : "",
    priceOptionLabel,
  ].filter(Boolean).join(" · ");
}

function formatAuditSnapshotMoney(value: number | null) {
  return value === null ? "Not captured" : formatPeso(value);
}

function readOptionalNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatAuditNumber(value: number) {
  return new Intl.NumberFormat("en-PH", { maximumFractionDigits: 2 }).format(value);
}

function humanizeAuditField(field: string) {
  return AUDIT_FIELD_LABELS[field] ?? field.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase());
}

function summarizeChangedAuditField(field: string) {
  if (field === "linkState") return "library status";
  if (field === "contingencyPercentage") return "adjustment percentage";
  return field.replace(/([A-Z])/g, " $1").toLowerCase();
}

function humanizeAuditValue(value: string) {
  return value.replace(/[_-]/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatAuditLinkStateValue(value: unknown) {
  const key = String(value);
  return AUDIT_LINK_STATE_LABELS[key] ?? humanizeAuditValue(key);
}

function readSnapshotTextValue(snapshot: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = snapshot[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function inferAuditBrandFromSupplier(supplier: string) {
  if (!supplier) return "";
  const supplierParts = supplier.split("/").map((part) => part.trim()).filter(Boolean);
  const likelyBrand = supplierParts[supplierParts.length - 1] ?? supplier;
  return likelyBrand
    .replace(/\b(dealers?|suppliers?|quote required|allowance|philippines|ph)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getAuditSnapshotSupplier(snapshot: Record<string, unknown>) {
  const sourceSnapshot = getAuditSnapshotSourceRecord(snapshot);
  return readSnapshotTextValue(snapshot, ["supplier", "supplierName"])
    || readSnapshotTextValue(sourceSnapshot, ["supplier", "supplierName", "supplier_name"]);
}

function getAuditSnapshotBrand(snapshot: Record<string, unknown>) {
  const sourceSnapshot = getAuditSnapshotSourceRecord(snapshot);
  return readSnapshotTextValue(snapshot, ["brand", "brandName"])
    || readSnapshotTextValue(sourceSnapshot, ["brand", "brandName", "brand_name"])
    || inferAuditBrandFromSupplier(getAuditSnapshotSupplier(snapshot));
}

function formatAuditComponentIdentity(snapshot: Record<string, unknown>, fallback: string) {
  const material = formatAuditMaterialName(readStringValue(snapshot.material, fallback));
  const brand = getAuditSnapshotBrand(snapshot);
  const supplier = getAuditSnapshotSupplier(snapshot);
  const identity = [
    brand ? `Brand: ${brand}` : "",
    supplier ? `Supplier: ${supplier}` : "",
  ].filter(Boolean);

  return identity.length ? `${material} (${identity.join("; ")})` : material;
}

function getSnapshotUnit(snapshot: Record<string, unknown>) {
  return readStringValue(snapshot.unit, "unit");
}

function formatSourceSnapshotValue(snapshot: Record<string, unknown>) {
  const sourceSnapshot = readRecord(snapshot.sourceSnapshot);
  const material = readStringValue(snapshot.material);
  const versionNumber = readOptionalNumber(sourceSnapshot.componentVersionNumber);
  const priceOptionLabel = readStringValue(sourceSnapshot.priceOptionLabel);
  const category = readStringValue(sourceSnapshot.category);
  const parts = [
    material,
    versionNumber !== null ? `V${versionNumber}` : "",
    priceOptionLabel,
    category,
  ].filter(Boolean);
  return parts.join(" · ") || "Component source";
}

function formatAuditFieldValue(field: string, value: unknown, snapshot: Record<string, unknown>) {
  if (value === null || value === undefined || value === "") return "—";
  if (field === "material") return formatAuditMaterialName(String(value));

  if (field === "quantity") {
    const parsed = readOptionalNumber(value);
    return parsed === null ? String(value) : `${formatAuditNumber(parsed)} ${getSnapshotUnit(snapshot)}`;
  }

  if (field === "contingencyPercentage") {
    const parsed = readOptionalNumber(value);
    if (parsed === null) return String(value);
    const contingencyValue = readOptionalNumber(snapshot.contingencyValue);
    return contingencyValue === null ? formatCostAdjustmentPercentage(parsed) : `${formatCostAdjustmentPercentage(parsed)} (${formatPeso(contingencyValue)})`;
  }

  if (field === "miscCost" || field === "unitCost" || field === "lineTotal") {
    const parsed = readOptionalNumber(value);
    return parsed === null ? String(value) : formatPeso(parsed);
  }

  if (field === "linkState") return formatAuditLinkStateValue(value);
  if (field === "sourceLibraryItemId") return value ? "Library component" : "Manual component";
  if (field === "sourceSnapshot") return formatSourceSnapshotValue(snapshot);

  if (typeof value === "object") return "Changed";
  return String(value);
}

function getOrderedAuditFields(event: EstimateSheetHistoryEvent) {
  const fields = event.eventType === "row_replaced" ? ROW_REPLACED_DETAIL_FIELDS : event.changedFields;
  const ordered = fields.filter((field, index) => fields.indexOf(field) === index && !HIDDEN_AUDIT_FIELDS.has(field));
  return ordered.slice(0, AUDIT_DETAIL_LIMIT);
}

function getAuditChangeDetails(event: EstimateSheetHistoryEvent): AuditChangeDetail[] {
  const oldSnapshot = getEventSnapshotRecord(event.oldSnapshot);
  const newSnapshot = getEventSnapshotRecord(event.newSnapshot);
  const payload = event.payload;

  if (event.eventType === "tree_reordered") {
    const updatedCount = readOptionalNumber(payload.updatedCount);
    return [{ kind: "note", label: "Tree order", value: updatedCount === null ? "Estimate tree reordered" : `${formatAuditNumber(updatedCount)} nodes reordered` }];
  }

  if (event.eventType === "template_inserted") {
    return [
      { kind: "note", label: "Template", value: readStringValue(payload.sourceTemplateId, "Estimate template") },
      { kind: "note", label: "Target", value: readStringValue(payload.targetParentNodeId, "Selected area") },
    ];
  }

  if (event.eventType === "node_deleted_with_children") {
    const rowCount = readOptionalNumber(payload.deletedRowCount);
    const nodeCount = readOptionalNumber(payload.deletedNodeCount);
    return [
      { kind: "note", label: "Deleted rows", value: rowCount === null ? "Rows removed" : formatAuditNumber(rowCount) },
      { kind: "note", label: "Deleted areas", value: nodeCount === null ? "Areas removed" : formatAuditNumber(nodeCount) },
    ];
  }

  if (event.eventType === "node_created") {
    return [
      { kind: "note", label: "Node", value: readStringValue(payload.name, "New area") },
      { kind: "note", label: "Kind", value: humanizeAuditValue(readStringValue(payload.kind, "node")) },
      { kind: "note", label: "Parent", value: readStringValue(payload.parentId, "Sheet root") },
    ];
  }

  return getOrderedAuditFields(event)
    .map((field) => ({
      kind: "diff" as const,
      label: humanizeAuditField(field),
      oldValue: formatAuditFieldValue(field, oldSnapshot[field], oldSnapshot),
      newValue: formatAuditFieldValue(field, newSnapshot[field], newSnapshot),
    }))
    .filter((detail) => detail.oldValue !== detail.newValue);
}

function getRowHistoryMaterialItem(snapshot: Record<string, unknown>): EstimateMaterialCardItem | null {
  if (isBlankEstimateRowAuditSnapshot(snapshot)) return null;

  const sourceSnapshot = getAuditSnapshotSourceRecord(snapshot);
  const material = readStringValue(snapshot.material);

  if (!material) return null;

  return {
    material,
    supplier: readStringValue(snapshot.supplier, readStringValue(sourceSnapshot.supplier, "No supplier captured")),
    itemCost: getAuditSnapshotUnitCost(snapshot) ?? 0,
    description: readStringValue(snapshot.description, readStringValue(sourceSnapshot.description, "")),
    unit: getAuditSnapshotUnit(snapshot),
    imageUrl: readStringValue(sourceSnapshot.imageUrl),
    category: getAuditSnapshotCategory(snapshot),
  };
}

function createAuditComponentSnapshot(key: string, label: string, snapshot: Record<string, unknown>): AuditComponentSnapshot | null {
  const item = getRowHistoryMaterialItem(snapshot);
  if (!item) return null;

  const quantity = readOptionalNumber(snapshot.quantity);
  const unitCost = getAuditSnapshotUnitCost(snapshot);
  const lineTotal = getAuditSnapshotLineTotal(snapshot);

  return {
    key,
    label,
    item,
    imageUrl: item.imageUrl ?? "",
    category: item.category ?? "Uncategorized",
    quantityLabel: quantity === null ? null : `${formatAuditNumber(quantity)} ${item.unit}`,
    unitCostLabel: formatAuditSnapshotMoney(unitCost),
    lineTotalLabel: formatAuditSnapshotMoney(lineTotal),
    sourceLabel: getAuditSnapshotSourceLabel(snapshot),
  };
}

function getAuditComponentSnapshots(event: EstimateSheetHistoryEvent): AuditComponentSnapshot[] {
  if (!shouldRenderRowHistoryComponent(event)) return [];

  const oldSnapshot = getEventSnapshotRecord(event.oldSnapshot);
  const newSnapshot = getEventSnapshotRecord(event.newSnapshot);

  if (event.eventType === "row_replaced") {
    return [
      createAuditComponentSnapshot("before", "Before component", oldSnapshot),
      createAuditComponentSnapshot("after", "After component", newSnapshot),
    ].filter((snapshot): snapshot is AuditComponentSnapshot => Boolean(snapshot));
  }

  if (event.eventType === "row_added") {
    const addedSnapshot = createAuditComponentSnapshot("added", "Component added", newSnapshot);
    return addedSnapshot ? [addedSnapshot] : [];
  }

  if (event.eventType === "row_deleted") {
    const removedSnapshot = createAuditComponentSnapshot("removed", "Component removed", oldSnapshot);
    return removedSnapshot ? [removedSnapshot] : [];
  }

  return [
    createAuditComponentSnapshot("before", "Before component", oldSnapshot),
    createAuditComponentSnapshot("after", "After component", newSnapshot),
  ].filter((snapshot): snapshot is AuditComponentSnapshot => Boolean(snapshot));
}

function getHistoryChangeLabel(event: EstimateSheetHistoryEvent) {
  return `${getEventLabel(event.eventType)} · ${getEventSummary(event)}`;
}

function getActorLabel(event: EstimateSheetHistoryEvent) {
  return event.actorLabel || (event.actorUserId ? "Unknown user" : "System/backfill");
}

function getAuditDeltaClassName(value: number | null | undefined) {
  if (value === null || value === undefined || Math.abs(value) < 0.005) {
    return "border-hairline bg-surfaceMuted text-tertiary";
  }
  return value > 0
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-red-200 bg-red-50 text-red-700";
}

function formatAuditLabelList(labels: string[]) {
  if (labels.length <= 1) return labels[0] ?? "activity";
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
}

function getAuditTargetLabel(event: EstimateSheetHistoryEvent) {
  const material = formatAuditMaterialName(readStringValue(event.rowContext.material));
  if (material) return material;
  if (event.estimateNodeId) return "selected node";
  return "the estimate sheet";
}

function getAuditDetailSentence(detail: AuditChangeDetail) {
  if (detail.kind === "note") return `${detail.label}: ${detail.value}.`;
  return `Changed ${detail.label.toLowerCase()} value from ${detail.oldValue} to ${detail.newValue}.`;
}

function getAuditEventDescription(event: EstimateSheetHistoryEvent, details: AuditChangeDetail[]) {
  const diffDetails = details.filter((detail): detail is Extract<AuditChangeDetail, { kind: "diff" }> => detail.kind === "diff");

  if (event.eventType === "row_added" || event.eventType === "row_blank_added") {
    return `Added ${getAuditTargetLabel(event)} to the estimate.`;
  }

  if (event.eventType === "row_deleted") {
    return `Removed ${getAuditTargetLabel(event)} from the estimate.`;
  }

  if (event.eventType === "row_replaced") {
    const oldSnapshot = getEventSnapshotRecord(event.oldSnapshot);
    const newSnapshot = getEventSnapshotRecord(event.newSnapshot);
    const fallback = getAuditTargetLabel(event);
    return `Replaced ${formatAuditComponentIdentity(oldSnapshot, fallback)} with ${formatAuditComponentIdentity(newSnapshot, fallback)}.`;
  }

  if (diffDetails.length === 1) return `Changed ${diffDetails[0].label.toLowerCase()} for ${getAuditTargetLabel(event)}.`;

  if (diffDetails.length > 1) {
    return `Changed ${formatAuditLabelList(diffDetails.map((detail) => detail.label.toLowerCase()))} for ${getAuditTargetLabel(event)}.`;
  }

  if (details.length === 1) return getAuditDetailSentence(details[0]);

  return getEventSummary(event);
}

function getAuditSupportingSummary(event: EstimateSheetHistoryEvent, summary: string, description: string) {
  if (!summary || summary === description) return "";
  if (event.eventType === "row_updated") return `Affected fields: ${summary}`;
  return summary;
}

function getLocalDateBoundaryISOString(value: string, boundary: "start" | "end") {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return undefined;

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = boundary === "start"
    ? new Date(year, monthIndex, day, 0, 0, 0, 0)
    : new Date(year, monthIndex, day, 23, 59, 59, 999);

  if (date.getFullYear() !== year || date.getMonth() !== monthIndex || date.getDate() !== day) return undefined;
  return date.toISOString();
}

function getActivityFilterInput(filters: ActivityFilterState) {
  return {
    eventTypes: filters.eventType ? [filters.eventType] : undefined,
    dateFrom: filters.dateFrom ? getLocalDateBoundaryISOString(filters.dateFrom, "start") : undefined,
    dateTo: filters.dateTo ? getLocalDateBoundaryISOString(filters.dateTo, "end") : undefined,
    search: filters.search.trim() || undefined,
  };
}

function createActivityFilterKey(filters: ActivityFilterState) {
  return `${filters.eventType}|${filters.search.trim()}|${filters.dateFrom}|${filters.dateTo}`;
}

function hasActivityFilters(filters: ActivityFilterState) {
  return createActivityFilterKey(filters) !== createActivityFilterKey(DEFAULT_ACTIVITY_FILTERS);
}

function hasAdvancedActivityFilters(filters: ActivityFilterState) {
  return Boolean(filters.eventType || filters.dateFrom || filters.dateTo);
}

function ActivityFilterDropdown({
  filters,
  onChange,
  onReset,
  open,
}: {
  filters: ActivityFilterState;
  onChange: (filters: ActivityFilterState) => void;
  onReset: () => void;
  open: boolean;
}) {
  const updateFilter = (key: keyof ActivityFilterState) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    onChange({ ...filters, [key]: event.target.value });
  };

  if (!open) return null;

  return (
    <div
      role="group"
      aria-label="Activity filter options"
      className="absolute right-2 top-[38px] z-30 grid w-[min(380px,calc(100vw-48px))] gap-2 border border-hairline bg-white p-2 text-[10px] shadow-xl"
    >
      <div className="grid gap-2">
        <ControlField label="Event" reserveHelperSpace>
          <select
            aria-label="Filter activity by event type"
            className="h-8 min-w-0 rounded-xs border border-hairline bg-white px-2 text-[10px] font-medium text-ink outline-none focus:border-accent focus:ring-2 focus:ring-focus"
            value={filters.eventType}
            onChange={updateFilter("eventType")}
          >
            {ACTIVITY_FILTER_EVENT_TYPES.map((option) => (
              <option key={option.value || "all"} value={option.value}>{option.label}</option>
            ))}
          </select>
        </ControlField>
      </div>
      <div className="grid grid-cols-2 items-start gap-2 max-sm:grid-cols-1">
        <ControlField label="From" reserveHelperSpace>
          <ControlInput
            type="date"
            className="h-8 border-hairline px-2"
            aria-label="Filter activity from date"
            value={filters.dateFrom}
            onChange={updateFilter("dateFrom")}
          />
        </ControlField>
        <ControlField label="To" reserveHelperSpace>
          <ControlInput
            type="date"
            className="h-8 border-hairline px-2"
            aria-label="Filter activity to date"
            value={filters.dateTo}
            onChange={updateFilter("dateTo")}
          />
        </ControlField>
      </div>
      <div className="flex items-center justify-end border-t border-hairline pt-2">
        <Button type="button" variant="secondary" size="sm" className="h-7 rounded-xs text-[10px]" disabled={!hasActivityFilters(filters)} onClick={onReset}>
          Reset filters
        </Button>
      </div>
    </div>
  );
}

function AuditComponentSnapshotCard({ snapshot }: { snapshot: AuditComponentSnapshot }) {
  const hasImage = Boolean(snapshot.imageUrl);

  return (
    <figure
      className="grid min-w-0 grid-cols-[72px_minmax(0,1fr)] gap-3 rounded-xs border border-hairline bg-white p-3"
      aria-label={`${snapshot.label} snapshot for ${snapshot.item.material}`}
      data-row-history-component-card
    >
      <div
        className={cn(
          "flex size-[72px] shrink-0 items-center justify-center overflow-hidden rounded-xs border border-hairline bg-surfaceMuted text-tertiary",
          hasImage ? "bg-cover bg-center" : "",
        )}
        style={hasImage ? { backgroundImage: `url(${snapshot.imageUrl})` } : undefined}
        aria-label={hasImage ? `${snapshot.item.material} stored snapshot image` : "No image in snapshot"}
      >
        {hasImage ? null : (
          <span className="grid gap-1 px-1 text-center">
            <Cube size={15} weight="regular" aria-hidden="true" className="mx-auto" />
            <span className="text-[8px] font-medium leading-3">No image in snapshot</span>
          </span>
        )}
      </div>
      <figcaption className="min-w-0">
        <p className="text-[8px] font-medium uppercase leading-4 text-tertiary">{snapshot.label}</p>
        <p className="mt-1 break-words text-[10px] font-medium leading-4 text-ink">{snapshot.item.material}</p>
        <p className="mt-0.5 break-words text-[9px] leading-4 text-secondary">{snapshot.item.supplier}</p>
        {snapshot.item.description ? (
          <p className="mt-2 line-clamp-2 text-[9px] leading-4 text-tertiary">{snapshot.item.description}</p>
        ) : null}
        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-[9px] leading-4">
          <div className="min-w-0">
            <dt className="font-medium uppercase text-tertiary">Source</dt>
            <dd className="truncate text-secondary" title={snapshot.sourceLabel}>{snapshot.sourceLabel}</dd>
          </div>
          <div className="min-w-0">
            <dt className="font-medium uppercase text-tertiary">Category</dt>
            <dd className="truncate text-secondary" title={snapshot.category}>{snapshot.category}</dd>
          </div>
          {snapshot.quantityLabel ? (
            <div className="min-w-0">
              <dt className="font-medium uppercase text-tertiary">Quantity</dt>
              <dd className="truncate text-secondary" title={snapshot.quantityLabel}>{snapshot.quantityLabel}</dd>
            </div>
          ) : null}
          <div className="min-w-0">
            <dt className="font-medium uppercase text-tertiary">Unit cost</dt>
            <dd className="truncate font-sans tabular-nums text-secondary" title={snapshot.unitCostLabel}>{snapshot.unitCostLabel}</dd>
          </div>
          <div className="min-w-0">
            <dt className="font-medium uppercase text-tertiary">Total</dt>
            <dd className="truncate font-sans tabular-nums text-ink" title={snapshot.lineTotalLabel}>{snapshot.lineTotalLabel}</dd>
          </div>
          <div className="min-w-0">
            <dt className="font-medium uppercase text-tertiary">Unit</dt>
            <dd className="truncate text-secondary" title={snapshot.item.unit}>{snapshot.item.unit}</dd>
          </div>
        </dl>
      </figcaption>
    </figure>
  );
}

function AuditEventCard({
  event,
  componentSnapshots,
}: {
  event: EstimateSheetHistoryEvent;
  componentSnapshots?: AuditComponentSnapshot[];
}) {
  const title = getEventLabel(event.eventType);
  const summary = getEventSummary(event);
  const details = getAuditChangeDetails(event);
  const deltaClass = getAuditDeltaClassName(event.totalDelta);
  const changeLabel = getHistoryChangeLabel(event);
  const description = getAuditEventDescription(event, details);
  const supportingSummary = getAuditSupportingSummary(event, summary, description);
  const actorLabel = getActorLabel(event);
  const eventAriaLabel = `${title} audit event for ${getAuditTargetLabel(event)} at ${formatShortDateTime(event.createdAt)} by ${actorLabel}: ${description}`;
  const snapshots = componentSnapshots ?? [];

  return (
    <article
      className="overflow-hidden rounded-xs border border-hairline bg-white text-[10px] shadow-[0_10px_24px_rgba(17,17,17,0.045)]"
      aria-label={eventAriaLabel}
      data-audit-event-card
    >
      <div className="border-b border-hairline bg-white px-4 py-4">
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <div className="min-w-0">
            <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[9px] font-medium uppercase leading-4 text-tertiary">
              <span>{formatShortDateTime(event.createdAt)}</span>
              <span aria-hidden="true">·</span>
              <span>{actorLabel}</span>
            </p>
            <p className="mt-2 text-[10px] font-medium leading-5 text-ink">{title}</p>
          </div>
          <p className={cn("shrink-0 rounded-xs border px-2 py-1 text-right font-sans text-[9px] font-medium tabular-nums", deltaClass)}>
            {formatSignedPeso(event.totalDelta)}
          </p>
        </div>
        <p className="mt-3 break-words text-[10px] font-medium leading-5 text-secondary" title={changeLabel}>{description}</p>
        {supportingSummary ? (
          <p className="mt-1.5 break-words text-[10px] leading-5 text-tertiary">{supportingSummary}</p>
        ) : null}
      </div>
      {details.length ? (
        <section className="border-b border-hairline bg-white px-4 py-4" data-audit-event-details>
          <p className="text-[8px] font-medium uppercase leading-4 text-tertiary">Audit facts</p>
          <dl className="mt-3 grid gap-3">
            {details.map((detail) => (
            <div key={`${detail.label}-${detail.kind}`} className="rounded-xs border border-hairline bg-surfaceMuted/20 p-3">
              <dt className="text-[8px] font-medium uppercase leading-4 text-tertiary">{detail.label}</dt>
              {detail.kind === "diff" ? (
                <dd className="mt-2 min-w-0" aria-label={getAuditDetailSentence(detail)}>
                  <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-3 text-[10px] leading-5 max-sm:grid-cols-1">
                    <div className="min-w-0 rounded-xs bg-white p-2">
                      <p className="mb-0.5 text-[8px] font-medium uppercase text-tertiary">Previous</p>
                      <p className="min-w-0 break-words text-secondary">{detail.oldValue}</p>
                    </div>
                    <span className="pt-5 text-[9px] font-medium text-tertiary max-sm:hidden" aria-hidden="true">-&gt;</span>
                    <div className="min-w-0 rounded-xs border border-accent/30 bg-white p-2">
                      <p className="mb-0.5 text-[8px] font-medium uppercase text-tertiary">Current</p>
                      <p className="min-w-0 break-words font-medium text-ink">{detail.newValue}</p>
                    </div>
                  </div>
                </dd>
              ) : (
                <dd className="mt-1 break-words text-[9px] font-medium leading-5 text-ink">{detail.value}</dd>
              )}
            </div>
            ))}
          </dl>
        </section>
      ) : null}
      {snapshots.length ? (
        <section className="bg-surfaceMuted/25 px-4 py-4" data-audit-component-snapshots>
          <p className="text-[8px] font-medium uppercase leading-4 text-tertiary">Component snapshot evidence</p>
          <div className={cn("mt-3 grid gap-3", snapshots.length > 1 ? "lg:grid-cols-2" : "")}>
            {snapshots.map((snapshot) => (
              <AuditComponentSnapshotCard key={snapshot.key} snapshot={snapshot} />
            ))}
          </div>
        </section>
      ) : null}
    </article>
  );
}

type GroupedActivityEventItem =
  | { kind: "event"; event: EstimateSheetHistoryEvent }
  | { kind: "group"; correlationId: string; events: EstimateSheetHistoryEvent[] };

type ActivityTimelineDayGroup = {
  day: string;
  items: GroupedActivityEventItem[];
};

function groupActivityEvents(events: EstimateSheetHistoryEvent[]): GroupedActivityEventItem[] {
  const countsByCorrelationId = new Map<string, number>();
  for (const event of events) {
    countsByCorrelationId.set(event.correlationId, (countsByCorrelationId.get(event.correlationId) ?? 0) + 1);
  }

  const groupedCorrelationIds = new Set<string>();
  const groupedItems: GroupedActivityEventItem[] = [];
  for (const event of events) {
    const eventCount = countsByCorrelationId.get(event.correlationId) ?? 0;
    if (eventCount <= 1) {
      groupedItems.push({ kind: "event", event });
      continue;
    }

    if (groupedCorrelationIds.has(event.correlationId)) continue;
    groupedCorrelationIds.add(event.correlationId);
    groupedItems.push({
      kind: "group",
      correlationId: event.correlationId,
      events: events.filter((candidate) => candidate.correlationId === event.correlationId),
    });
  }

  return groupedItems;
}

function getActivityItemCreatedAt(item: GroupedActivityEventItem) {
  return item.kind === "group" ? item.events[0]?.createdAt ?? "" : item.event.createdAt;
}

function groupActivityTimelineByDay(events: EstimateSheetHistoryEvent[]): ActivityTimelineDayGroup[] {
  const dayGroups: ActivityTimelineDayGroup[] = [];
  for (const item of groupActivityEvents(events)) {
    const day = formatActivityDay(getActivityItemCreatedAt(item));
    const currentGroup = dayGroups[dayGroups.length - 1];
    if (currentGroup?.day === day) {
      currentGroup.items.push(item);
      continue;
    }
    dayGroups.push({ day, items: [item] });
  }
  return dayGroups;
}

function ActivityTimelineItem({ children }: { children: ReactNode }) {
  return (
    <li className="relative grid grid-cols-[20px_minmax(0,1fr)] gap-3">
      <span className="relative z-10 mt-4 flex size-5 items-center justify-center rounded-xs border border-orange-200 bg-orange-50" aria-hidden="true">
        <span className="size-1.5 rounded-xs bg-orange-600" />
      </span>
      <div className="min-w-0 pb-2">{children}</div>
    </li>
  );
}

function AuditEventGroup({
  events,
}: {
  events: EstimateSheetHistoryEvent[];
}) {
  const firstEvent = events[0];
  const eventTypes = Array.from(new Set(events.map((event) => getEventLabel(event.eventType)))).join(", ");
  const eventTotal = events.reduce((total, event) => total + (event.totalDelta ?? 0), 0);

  return (
    <details className="overflow-hidden rounded-xs border border-hairline bg-white text-[10px] shadow-[0_8px_18px_rgba(17,17,17,0.035)]" data-audit-event-group>
      <summary className="grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-start gap-3 border-b border-hairline bg-white px-4 py-3">
        <span className="min-w-0">
          <span className="block text-[9px] font-medium uppercase leading-4 text-tertiary">
            {firstEvent ? `${formatShortDateTime(firstEvent.createdAt)} · ${getActorLabel(firstEvent)}` : "Activity group"}
          </span>
          <span className="mt-1.5 block text-[9px] font-medium leading-5 text-ink">{events.length} related activity events</span>
          <span className="mt-1 block break-words text-[9px] leading-5 text-tertiary">{eventTypes}</span>
        </span>
        <span className={cn("shrink-0 rounded-xs border px-2 py-1 text-right font-sans text-[10px] font-medium tabular-nums", getAuditDeltaClassName(eventTotal))}>
          {formatSignedPeso(eventTotal)}
        </span>
      </summary>
      <div className="space-y-3 bg-surfaceMuted/25 p-3">
        {events.map((event) => (
          <AuditEventCard key={event.id} event={event} componentSnapshots={getAuditComponentSnapshots(event)} />
        ))}
      </div>
    </details>
  );
}

function EventList({
  events,
  isLoading,
  error,
  emptyLabel,
  emptyDescription = "Current row facts remain visible while the append-only history is empty.",
  onRetry,
  nextCursor,
  isLoadingMore = false,
  loadMoreLabel = "Load more activity",
  onLoadMore,
}: {
  events: EstimateSheetHistoryEvent[];
  isLoading: boolean;
  error: string;
  emptyLabel: string;
  emptyDescription?: string;
  onRetry: () => void;
  nextCursor?: EstimateSheetVersionControlData["nextCursor"];
  isLoadingMore?: boolean;
  loadMoreLabel?: string;
  onLoadMore?: () => void;
}) {
  if (isLoading) {
    return (
      <div className="space-y-3" aria-label="Loading history">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-20 border border-hairline bg-surfaceMuted/50" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-amber-200 bg-amber-50 p-4 text-[10px] text-amber-900">
        <div className="flex items-center gap-2 font-medium">
          <WarningCircle size={13} weight="regular" aria-hidden="true" />
          History could not load
        </div>
        <p className="mt-1 leading-4">{error}</p>
        <Button type="button" variant="secondary" size="sm" className="mt-2 h-7 rounded-xs text-[10px]" onClick={onRetry}>
          Retry
        </Button>
      </div>
    );
  }

  if (!events.length) {
    return (
      <div className="border border-dashed border-hairline bg-white p-4 text-[10px] text-tertiary">
        <p className="font-medium text-ink">{emptyLabel}</p>
        <p className="mt-1 leading-4">{emptyDescription}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5" data-activity-timeline>
      {groupActivityTimelineByDay(events).map((dayGroup) => (
        <section key={dayGroup.day} aria-label={`${dayGroup.day} activity`} className="space-y-3">
          <div className="px-1 pb-1 pt-2">
            <p className="text-[8px] font-medium uppercase leading-4 text-tertiary">{dayGroup.day}</p>
          </div>
          <ol className="relative space-y-4 before:absolute before:bottom-5 before:left-[9.5px] before:top-5 before:w-px before:bg-hairline">
            {dayGroup.items.map((item) => {
              if (item.kind === "group") {
                return (
                  <ActivityTimelineItem key={item.correlationId}>
                    <AuditEventGroup events={item.events} />
                  </ActivityTimelineItem>
                );
              }

              return (
                <ActivityTimelineItem key={item.event.id}>
                  <AuditEventCard event={item.event} componentSnapshots={getAuditComponentSnapshots(item.event)} />
                </ActivityTimelineItem>
              );
            })}
          </ol>
        </section>
      ))}
      {nextCursor && onLoadMore ? (
        <div className="pt-1">
          <Button type="button" variant="secondary" size="sm" className="h-7 w-full rounded-xs text-[10px]" disabled={isLoadingMore} onClick={onLoadMore}>
            {isLoadingMore ? "Loading..." : loadMoreLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

const ROW_DETAIL_TABS: readonly WorkshopTreeTabItem<RowDetailTab>[] = [
  { id: "details", label: "Details" },
  { id: "component", label: "Component" },
  { id: "activity", label: "Activity" },
];

function getRowDetailComponentStatus(item: EstimateRowItem | null | undefined, isBlankRow: boolean) {
  if (isBlankRow) {
    return {
      label: "No linked component",
      description: "This row is a manual placeholder. Add or drag a component into the row to link current component data.",
    };
  }

  if (!item) {
    return {
      label: "Manual component",
      description: "Component source details are not available for this row.",
    };
  }

  switch (item.linkState) {
    case "detached":
      return {
        label: "Project-specific component",
        description: "This component keeps the current row values and no longer follows library updates.",
      };
    case "linked-clean":
      return {
        label: "Synced library component",
        description: "This row is following the current library component values.",
      };
    case "linked-overridden":
      return {
        label: "Customized library component",
        description: "This row is linked to the library, but one or more estimate values have project-specific overrides.",
      };
    case "source-changed":
      return {
        label: "Library source changed",
        description: "The source library component changed after this row was added. Review before replacing or detaching it.",
      };
    case "unlinked":
      return {
        label: "Manual component",
        description: "This row is not linked to a library component.",
      };
    default:
      return item.sourceLibraryItemId
        ? {
            label: "Library component",
            description: "This row has a saved library source but no explicit sync state.",
          }
        : {
            label: "Manual component",
            description: "This row is not linked to a library component.",
          };
  }
}

function RowDetailField({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="min-w-0 border-b border-hairline py-2">
      <p className="text-[8px] font-medium uppercase text-tertiary">{label}</p>
      <p className="mt-0.5 truncate text-[10px] font-medium text-ink" title={value === null || value === undefined ? undefined : String(value)}>
        {value === null || value === undefined || value === "" ? "—" : value}
      </p>
    </div>
  );
}

function RowDetailsModal({
  row,
  tab,
  projectId,
  estimateId,
  onTabChange,
  onClose,
}: {
  row: FlattenedEstimateRow | null;
  tab: RowDetailTab;
  projectId?: string;
  estimateId?: string;
  onTabChange: (tab: RowDetailTab) => void;
  onClose: () => void;
}) {
  const item = row?.item ?? null;
  const isBlankRow = item ? isBlankEstimateRowItem(item) : false;
  const [events, setEvents] = useState<EstimateSheetHistoryEvent[]>([]);
  const [nextCursor, setNextCursor] = useState<EstimateSheetVersionControlData["rowNextCursor"]>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const requestGenerationRef = useRef(0);
  const rowId = item?.id ?? "";

  const loadRowActivity = useCallback((cursor?: EstimateSheetVersionControlData["rowNextCursor"]) => {
    if (!projectId || !estimateId || !rowId) return;
    const requestGeneration = requestGenerationRef.current;
    if (cursor) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
      setEvents([]);
      setNextCursor(null);
    }
    setError("");

    fetchEstimateSheetVersionControl({
      projectId,
      estimateId,
      rowId,
      eventLimit: 50,
      rowCursor: cursor ?? undefined,
      scope: "row",
    })
      .then((data) => {
        if (requestGenerationRef.current !== requestGeneration) return;
        setEvents((current) => (cursor ? [...current, ...data.rowEvents] : data.rowEvents));
        setNextCursor(data.rowNextCursor);
      })
      .catch((caughtError: unknown) => {
        if (requestGenerationRef.current !== requestGeneration) return;
        setError(caughtError instanceof Error ? caughtError.message : "Row activity could not load.");
      })
      .finally(() => {
        if (requestGenerationRef.current !== requestGeneration) return;
        setIsLoading(false);
        setIsLoadingMore(false);
      });
  }, [estimateId, projectId, rowId]);

  useEffect(() => {
    requestGenerationRef.current += 1;
    if (tab === "activity" && projectId && estimateId && rowId) {
      const timeoutId = window.setTimeout(() => loadRowActivity(), 0);
      return () => window.clearTimeout(timeoutId);
    }
    return undefined;
  }, [estimateId, loadRowActivity, projectId, rowId, tab]);

  const lineTotal = row?.lineTotal ?? item?.totalItemCosts ?? 0;
  const quantity = row?.quantity ?? item?.quantity ?? 0;
  const contingencyPercentage = row?.contingencyPercentage ?? item?.contingencyPercentage ?? 0;
  const contingencyValue = row?.contingencyValue ?? item?.contingencyValue ?? 0;
  const miscCost = row?.miscCost ?? item?.miscCost ?? 0;
  const componentStatus = getRowDetailComponentStatus(item, isBlankRow);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4 max-sm:p-2"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Row item details"
        className="flex h-[min(720px,calc(100dvh-32px))] w-[min(940px,calc(100vw-32px))] min-w-0 flex-col overflow-hidden border border-hairline bg-[#FBFCFD] shadow-2xl max-sm:h-[calc(100dvh-16px)] max-sm:w-[calc(100vw-16px)]"
      >
        <div className="flex h-10 shrink-0 items-center justify-between border-b border-hairline bg-white px-3">
          <div className="min-w-0">
            <p className="text-[9px] font-medium text-ink">Row Item</p>
            <p className="truncate text-[8px] font-medium uppercase text-tertiary">{row?.nodePath.join(" / ") ?? "Current estimate row"}</p>
          </div>
          <Button type="button" variant="ghost" size="icon-sm" className="size-6 rounded-xs p-0" aria-label="Close row details" onClick={onClose}>
            <X size={13} weight="regular" aria-hidden="true" />
          </Button>
        </div>
        <div className="shrink-0">
          <WorkshopTreeTabs
            tabs={ROW_DETAIL_TABS}
            activeTab={tab}
            ariaLabel="Row item detail tabs"
            onTabChange={onTabChange}
          />
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-[300px_minmax(0,1fr)] max-md:grid-cols-1">
          <aside className="min-h-0 overflow-auto border-r border-hairline bg-surfaceMuted/35 p-3 max-md:max-h-64 max-md:border-r-0 max-md:border-b">
            <div className="border border-hairline bg-white p-2">
              {item && !isBlankRow ? (
                <div
                  className="aspect-[4/3] bg-neutral-100 bg-cover bg-center"
                  style={{ backgroundImage: `url(${getComponentImageUrl(item)})` }}
                  aria-label={`${item.material} reference image`}
                />
              ) : (
                <div className="grid aspect-[4/3] place-items-center border border-dashed border-hairline bg-surfaceMuted/50 text-center text-[10px] font-medium text-tertiary">
                  No component selected
                </div>
              )}
              <div className="mt-2 min-w-0">
                <p className="truncate text-[10px] font-medium text-ink">{item?.material ?? "Row not found"}</p>
                <p className="truncate text-[9px] font-medium text-tertiary">{item?.supplier ?? "No supplier"}</p>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-x-3 border-t border-hairline">
                <RowDetailField label="Qty" value={`${quantity} ${item?.unit ?? ""}`.trim()} />
                <RowDetailField label="Unit cost" value={formatPeso(item?.itemCost ?? 0)} />
                <RowDetailField label="Adjustment" value={formatCostAdjustmentPercentage(contingencyPercentage)} />
                <RowDetailField label="Total" value={formatPeso(lineTotal)} />
              </div>
            </div>
          </aside>
          <div className="flex min-h-0 flex-col">
            <div className="border-b border-hairline bg-white p-3">
              <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div className="min-w-0">
                  <p className="font-sans text-[8px] font-medium uppercase text-tertiary">{componentStatus.label}</p>
                  <p className="truncate text-[10px] font-medium text-ink">{item?.material ?? "Row item"}</p>
                  <p className="mt-0.5 truncate text-[9px] text-tertiary">{row?.nodePath.join(" › ") ?? "Current estimate row"}</p>
                </div>
                <div className="text-right">
                  <p className="text-[8px] font-medium uppercase text-tertiary">Total</p>
                  <p className="mt-0.5 font-sans text-[12px] font-medium tabular-nums text-ink">{formatPeso(lineTotal)}</p>
                </div>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-auto p-3" role="tabpanel" aria-label={ROW_DETAIL_TABS.find((rowTab) => rowTab.id === tab)?.label}>
              {tab === "details" ? (
                <div className="grid grid-cols-2 gap-x-4 border border-hairline bg-white px-3 max-sm:grid-cols-1">
                  <RowDetailField label="Material" value={item?.material} />
                  <RowDetailField label="Supplier" value={item?.supplier} />
                  <RowDetailField label="Description" value={item?.description} />
                  <RowDetailField label="Category" value={item?.category} />
                  <RowDetailField label="Quantity" value={`${quantity} ${item?.unit ?? ""}`.trim()} />
                  <RowDetailField label="Unit cost" value={formatPeso(item?.itemCost ?? 0)} />
                  <RowDetailField label="Subtotal" value={formatPeso(item?.subTotal ?? 0)} />
                  <RowDetailField label="Adjustment" value={`${formatCostAdjustmentPercentage(contingencyPercentage)} (${formatPeso(contingencyValue)})`} />
                  <RowDetailField label="Misc cost" value={formatPeso(miscCost)} />
                  <RowDetailField label="Total" value={formatPeso(lineTotal)} />
                  <RowDetailField label="Unit" value={item?.unit} />
                  <RowDetailField label="Row revision" value={item?.rowRevision ?? 1} />
                </div>
              ) : null}
              {tab === "component" ? (
                <div className="grid gap-3">
                  <div className="border border-hairline bg-white p-3">
                    <p className="text-[12px] font-medium text-ink">Current component</p>
                    <p className="mt-1 text-[10px] leading-4 text-tertiary">
                      {componentStatus.description}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 border border-hairline bg-white px-3 max-sm:grid-cols-1">
                    <RowDetailField label="Component source" value={componentStatus.label} />
                    <RowDetailField label="Library sync" value={componentStatus.description} />
                    <RowDetailField label="Source library id" value={item?.sourceLibraryItemId} />
                    <RowDetailField label="Component version" value={item?.componentVersionNumber ? `V${item.componentVersionNumber}` : item?.componentVersionId} />
                    <RowDetailField label="Price option" value={item?.priceOptionLabel ?? item?.priceOptionId} />
                    <RowDetailField label="Lifecycle" value={item?.lifecycleState} />
                    <RowDetailField label="Discipline" value={item?.discipline} />
                    <RowDetailField label="Designation" value={item?.designation} />
                    <RowDetailField label="Pricing source" value={item?.pricingSource} />
                    <RowDetailField label="Pricing date" value={item?.pricingDate} />
                    <RowDetailField label="Brand" value={item?.brand} />
                    <RowDetailField label="SKU / reference" value={item?.sku} />
                    <RowDetailField label="Tags" value={item?.tags?.join(", ")} />
                  </div>
                </div>
              ) : null}
              {tab === "activity" ? (
                <EventList
                  events={events}
                  isLoading={isLoading}
                  error={error}
                  emptyLabel="No row activity yet"
                  emptyDescription="Edits, replacements, and value changes for this row will appear here."
                  onRetry={() => {
                    requestGenerationRef.current += 1;
                    loadRowActivity();
                  }}
                  nextCursor={nextCursor}
                  isLoadingMore={isLoadingMore}
                  loadMoreLabel="Load more row activity"
                  onLoadMore={() => loadRowActivity(nextCursor)}
                />
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function getActivityScopeKey(scope: EstimateActivityScope | null) {
  if (!scope) return "";
  if (scope.mode === "row") return `row:${scope.rowId}`;
  if (scope.mode === "node") return `node:${scope.nodeId}:${scope.includeDescendants ? "desc" : "direct"}`;
  return "sheet";
}

function getActivityEventsForScope(scope: EstimateActivityScope, historyData: EstimateSheetVersionControlData | null) {
  if (scope.mode === "row") return historyData?.rowEvents ?? [];
  if (scope.mode === "node") return historyData?.nodeEvents ?? [];
  return historyData?.events ?? [];
}

function getActivityCursorForScope(scope: EstimateActivityScope, historyData: EstimateSheetVersionControlData | null) {
  if (scope.mode === "row") return historyData?.rowNextCursor ?? null;
  if (scope.mode === "node") return historyData?.nodeNextCursor ?? null;
  return historyData?.nextCursor ?? null;
}

function getActivityEmptyCopy(scope: EstimateActivityScope) {
  if (scope.mode === "row") {
    return {
      label: "No row activity yet",
      description: "Edits, replacements, and value changes for this row will appear here.",
    };
  }

  if (scope.mode === "node") {
    return {
      label: "No node activity yet",
      description: scope.includeDescendants ? "Node and descendant row activity will appear here." : "Node changes and row edits in this Area Node will appear here.",
    };
  }

  return {
    label: "No sheet activity yet",
    description: "Estimate edits, row changes, and sheet metadata updates will appear here.",
  };
}

function getActivityLoadMoreLabel(scope: EstimateActivityScope) {
  if (scope.mode === "row") return "Load more row activity";
  if (scope.mode === "node") return "Load more node activity";
  return "Load more activity";
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

function normalizeActivityScopeSearch(value: string) {
  return value.trim().toLowerCase();
}

function activityScopeItemMatchesSearch(item: ActivityScopeTreeItem, search: string) {
  if (!search) return true;
  return [item.label, item.eyebrow, item.description ?? ""].some((value) => value.toLowerCase().includes(search));
}

function getActivityScopeCollapsibleIds(items: ActivityScopeTreeItem[]) {
  const ids = new Set<string>();
  items.forEach((item, index) => {
    const nextItem = items[index + 1];
    if (nextItem && nextItem.depth > item.depth) ids.add(item.id);
  });
  return ids;
}

function getActivityScopeSearchVisibleIds(items: ActivityScopeTreeItem[], search: string) {
  const visibleIds = new Set<string>();
  if (!search) return visibleIds;

  items.forEach((item, index) => {
    if (!activityScopeItemMatchesSearch(item, search)) return;

    visibleIds.add(item.id);

    for (let ancestorIndex = index - 1; ancestorIndex >= 0; ancestorIndex -= 1) {
      const ancestor = items[ancestorIndex];
      if (!ancestor) continue;
      if (ancestor.depth < item.depth && !visibleIds.has(ancestor.id)) visibleIds.add(ancestor.id);
      if (ancestor.depth === 0) break;
    }

    for (let descendantIndex = index + 1; descendantIndex < items.length; descendantIndex += 1) {
      const descendant = items[descendantIndex];
      if (!descendant || descendant.depth <= item.depth) break;
      visibleIds.add(descendant.id);
    }
  });

  return visibleIds;
}

function ActivityScopeTree({
  items,
  activeScopeKey,
  onSelect,
}: {
  items: ActivityScopeTreeItem[];
  activeScopeKey: string;
  onSelect: (scope: EstimateActivityScope) => void;
}) {
  const [scopeSearch, setScopeSearch] = useState("");
  const [collapsedScopeIds, setCollapsedScopeIds] = useState<Set<string>>(() => new Set());
  const normalizedSearch = normalizeActivityScopeSearch(scopeSearch);
  const collapsibleIds = useMemo(() => getActivityScopeCollapsibleIds(items), [items]);
  const searchVisibleIds = useMemo(() => getActivityScopeSearchVisibleIds(items, normalizedSearch), [items, normalizedSearch]);
  const visibleItems = useMemo(() => {
    if (normalizedSearch) return items.filter((item) => searchVisibleIds.has(item.id));

    let collapsedDepth: number | null = null;
    return items.filter((item) => {
      if (collapsedDepth !== null) {
        if (item.depth > collapsedDepth) return false;
        collapsedDepth = null;
      }

      if (collapsedScopeIds.has(item.id)) collapsedDepth = item.depth;
      return true;
    });
  }, [collapsedScopeIds, items, normalizedSearch, searchVisibleIds]);

  const expandAllScopes = () => setCollapsedScopeIds(new Set());
  const collapseAllScopes = () => setCollapsedScopeIds(new Set(collapsibleIds));
  const toggleScopeExpanded = (itemId: string) => {
    setCollapsedScopeIds((current) => {
      const next = new Set(current);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
      <div className="sticky top-0 z-20 shrink-0 bg-white">
        <div className="flex h-[38px] items-center">
          <SearchInput
            wrapperClassName="w-full"
            placeholder="Search Tree"
            aria-label="Search Tree"
            value={scopeSearch}
            onChange={(event) => setScopeSearch(event.currentTarget.value)}
            onClear={() => setScopeSearch("")}
          />
        </div>
        <HeaderIconToolbar
          ariaLabel="Tree tools"
          labelPrefix="tree"
          onExpandAll={expandAllScopes}
          onCollapseAll={collapseAllScopes}
          addActions={[
            {
              label: "Add Group",
              icon: <AddTreeActionIcon kind="group" />,
              disabled: true,
            },
            {
              label: "Add Node",
              icon: <AddTreeActionIcon kind="area" />,
              disabled: true,
            },
          ]}
        />
        <WorkshopTreeTabs tabs={ACTIVITY_SCOPE_TREE_TABS} activeTab="sheets" ariaLabel="Estimate tree views" />
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-2">
        {visibleItems.length > 0 ? (
          <div role="tree" aria-label="Activity scope tree" className={WORKSHOP_TREE_ROW_GAP_CLASS}>
            {visibleItems.map((item) => {
              const selected = getActivityScopeKey(item.scope) === activeScopeKey;
              const hasChildren = collapsibleIds.has(item.id);
              const expanded = normalizedSearch ? true : !collapsedScopeIds.has(item.id);
              return (
                <WorkshopTreeRow
                  key={item.id}
                  role="treeitem"
                  aria-selected={selected}
                  aria-level={item.depth + 1}
                  aria-expanded={hasChildren ? expanded : undefined}
                  aria-label={`${item.label}, ${item.eyebrow}`}
                  data-activity-scope-item={item.id}
                  depth={item.depth}
                  selected={selected}
                  className="justify-start gap-0 focus-visible:ring-[#c8d2df] focus-visible:ring-offset-2"
                  onClick={() => onSelect(item.scope)}
                  onKeyDown={(event) => {
                    if (!hasChildren || normalizedSearch) return;
                    if (event.key === "ArrowRight" && !expanded) {
                      event.preventDefault();
                      toggleScopeExpanded(item.id);
                    }
                    if (event.key === "ArrowLeft" && expanded) {
                      event.preventDefault();
                      toggleScopeExpanded(item.id);
                    }
                  }}
                >
                  {hasChildren ? (
                    <span
                      className={cn(WORKSHOP_TREE_ICON_SLOT_CLASS, "cursor-pointer transition hover:bg-surface-muted")}
                      aria-hidden="true"
                      onClick={(event) => {
                        if (normalizedSearch) return;
                        event.stopPropagation();
                        toggleScopeExpanded(item.id);
                      }}
                    >
                      <CaretDown size={11} aria-hidden="true" className={expanded ? "" : "-rotate-90"} />
                    </span>
                  ) : (
                    <span className="size-4 shrink-0" aria-hidden="true" />
                  )}
                  <span className={cn("mr-1", WORKSHOP_TREE_ICON_SLOT_CLASS)} aria-hidden="true">
                    {item.kind === "sheet" ? <FolderSimple size={12} weight="regular" aria-hidden="true" /> : null}
                    {item.kind === "group" ? <FolderSimple size={12} weight="regular" aria-hidden="true" /> : null}
                    {item.kind === "area" ? <Cube size={12} weight="regular" aria-hidden="true" /> : null}
                    {item.kind === "row" ? <span className="font-sans text-[12px] font-medium" aria-hidden="true">#</span> : null}
                  </span>
                  <span className="min-w-0 truncate text-left">{item.label}</span>
                </WorkshopTreeRow>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xs border border-dashed border-hairline bg-surface-muted p-2 text-[10px] leading-4 text-tertiary">
            No tree matches found.
          </div>
        )}
      </div>
    </div>
  );
}

function ActivityHistoryModal({
  scope,
  scopeItems,
  selectedScopeItem,
  metadata,
  historyData,
  activityFilters,
  isHistoryLoading,
  isHistoryLoadingMore,
  historyError,
  onActivityFiltersChange,
  onActivityFiltersReset,
  onClose,
  onRetry,
  onLoadMore,
  onScopeSelect,
}: {
  scope: EstimateActivityScope;
  scopeItems: ActivityScopeTreeItem[];
  selectedScopeItem: ActivityScopeTreeItem | null;
  metadata: ProposalExportMetadata | null;
  historyData: EstimateSheetVersionControlData | null;
  activityFilters: ActivityFilterState;
  isHistoryLoading: boolean;
  isHistoryLoadingMore: boolean;
  historyError: string;
  onActivityFiltersChange: (filters: ActivityFilterState) => void;
  onActivityFiltersReset: () => void;
  onClose: () => void;
  onRetry: () => void;
  onLoadMore: () => void;
  onScopeSelect: (scope: EstimateActivityScope) => void;
}) {
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const activeScopeKey = getActivityScopeKey(scope);
  const events = getActivityEventsForScope(scope, historyData);
  const nextCursor = getActivityCursorForScope(scope, historyData);
  const emptyCopy = getActivityEmptyCopy(scope);
  const loadMoreLabel = getActivityLoadMoreLabel(scope);
  const selectedLabel = selectedScopeItem?.label ?? metadata?.estimateName ?? "Estimate sheet";
  const selectedEyebrow = selectedScopeItem?.eyebrow ?? metadata?.estimateSheetCode ?? "Sheet";
  const selectedDescription = selectedScopeItem?.description ?? "";
  const filtersActive = hasActivityFilters(activityFilters);
  const advancedFiltersActive = hasAdvancedActivityFilters(activityFilters);
  const updateSearchFilter = (event: ChangeEvent<HTMLInputElement>) => {
    onActivityFiltersChange({ ...activityFilters, search: event.target.value });
  };
  const clearSearchFilter = () => {
    onActivityFiltersChange({ ...activityFilters, search: "" });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4 max-sm:p-2"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Activity History"
        className="flex h-[min(860px,calc(100dvh-32px))] w-[min(1180px,calc(100vw-32px))] min-w-0 flex-col overflow-hidden border border-hairline bg-[#FBFCFD] shadow-2xl max-sm:h-[calc(100dvh-16px)] max-sm:w-[calc(100vw-16px)]"
      >
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-hairline bg-white px-4">
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-ink">Activity History</p>
            <p className="truncate text-[8px] font-medium uppercase text-tertiary">Audit trail · {metadata?.estimateSheetCode ?? "Estimate sheet"}</p>
          </div>
          <Button type="button" variant="ghost" size="icon-sm" className="size-6 rounded-xs p-0" aria-label="Close Activity History" onClick={onClose}>
            <X size={13} weight="regular" aria-hidden="true" />
          </Button>
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-[350px_minmax(0,1fr)] max-lg:grid-cols-1">
          <aside className="min-h-0 overflow-hidden border-r border-hairline bg-white max-lg:max-h-64 max-lg:border-r-0 max-lg:border-b" aria-label="Activity scope">
            <ActivityScopeTree items={scopeItems} activeScopeKey={activeScopeKey} onSelect={onScopeSelect} />
          </aside>
          <div className="flex min-h-0 flex-col">
            <div className="border-b border-hairline bg-white">
              <section aria-label="Selected activity scope" className="min-w-0 p-4">
                <div className="min-w-0">
                  <p className="font-sans text-[8px] font-medium uppercase text-tertiary">{selectedEyebrow}</p>
                  <p className="truncate text-[10px] font-medium text-ink">{selectedLabel}</p>
                  {selectedDescription ? (
                    <p className="mt-0.5 truncate text-[9px] text-tertiary">{selectedDescription}</p>
                  ) : null}
                </div>
              </section>
              <div className="relative grid min-w-0 grid-cols-[minmax(0,1fr)_auto] border-t border-hairline">
                <SearchInput
                  aria-label="Search activity"
                  placeholder="Search activity"
                  value={activityFilters.search}
                  onChange={updateSearchFilter}
                  onClear={clearSearchFilter}
                  wrapperClassName="min-w-0"
                />
                <div className="relative border-l border-hairline">
                  <HeaderIconToolbar
                    ariaLabel="Activity history tools"
                    labelPrefix="activity"
                    showDefaultActions={false}
                    addActions={[
                      {
                        label: "Filter activity",
                        icon: (
                          <span className="relative inline-flex">
                            <FunnelSimple size={12} weight="regular" aria-hidden="true" />
                            {advancedFiltersActive ? <span className="absolute -right-1 -top-1 size-1.5 rounded-xs bg-orange-600" aria-hidden="true" /> : null}
                          </span>
                        ),
                        onClick: () => setFilterPanelOpen((current) => !current),
                        className: cn(
                          "hover:bg-orange-50 hover:text-orange-700 focus-visible:bg-orange-50 focus-visible:text-orange-700",
                          (filterPanelOpen || advancedFiltersActive) && "bg-orange-50 text-orange-700",
                        ),
                      },
                      ...(filtersActive
                        ? [
                            {
                              label: "Reset activity filters",
                              icon: <X size={12} weight="regular" aria-hidden="true" />,
                              onClick: onActivityFiltersReset,
                              className: "hover:bg-surfaceMuted hover:text-ink focus-visible:bg-surfaceMuted focus-visible:text-ink",
                            },
                          ]
                        : []),
                    ]}
                  />
                  <ActivityFilterDropdown
                    filters={activityFilters}
                    onChange={onActivityFiltersChange}
                    onReset={onActivityFiltersReset}
                    open={filterPanelOpen}
                  />
                </div>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-auto p-4">
              <EventList
                events={events}
                isLoading={isHistoryLoading}
                error={historyError}
                emptyLabel={emptyCopy.label}
                emptyDescription={emptyCopy.description}
                onRetry={onRetry}
                nextCursor={nextCursor}
                isLoadingMore={isHistoryLoadingMore}
                loadMoreLabel={loadMoreLabel}
                onLoadMore={onLoadMore}
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function EstimateSheetHeader({
  onExpandAll,
  onCollapseAll,
  onPreviewProposalExport,
  canPreviewProposalExport = false,
  onOpenSheetActivity,
}: {
  onExpandAll?: () => void;
  onCollapseAll?: () => void;
  onPreviewProposalExport?: () => void;
  canPreviewProposalExport?: boolean;
  onOpenSheetActivity?: (opener: HTMLElement) => void;
}) {
  return (
    <header className="sticky top-0 z-20 bg-white/95 backdrop-blur" aria-label="Sheet controls">
      <div className="flex h-[38px] items-center">
        <SearchInput
          wrapperClassName="w-full"
          placeholder="Search Sheet"
          aria-label="Search Sheet"
          disabled
          title="Coming soon"
        />
      </div>
      <HeaderIconToolbar
        ariaLabel="Sheet tools"
        labelPrefix="sheet"
        onExpandAll={onExpandAll}
        onCollapseAll={onCollapseAll}
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

function getRemoteCursorLabel(cursor: RemoteEstimateCursor) {
  return cursor.displayName ?? `User ${cursor.userId.slice(0, 8)}`;
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
}: EstimateSheetContentProps) {
  const { selectedNodeId: activeSelectedNodeId, setSelectedNodeId } = useEstimateWorkspaceSelection(estimateId, selectedNodeId);
  const { saveState, markRowDirty, insertRow, replaceRow, detachRow, deleteRow, updateRow } = useEstimateRowMutations(estimateId);
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
  const { broadcastCursor, channelStatus: cursorChannelStatus, lastSendStatus: cursorLastSendStatus, remoteCursors } = useEstimateCursorCollaboration({
    estimateId,
    userId: collaborationUserId,
    displayName: collaborationDisplayName,
    enabled: Boolean(estimateId && collaborationUserId),
  });
  const inspectorOpenerRef = useRef<HTMLElement | null>(null);
  const rowDetailsOpenerRef = useRef<HTMLElement | null>(null);
  const inspectorScopeRef = useRef("");
  const historyRequestGenerationRef = useRef(0);
  const activateHistoryScope = useCallback((scopeKey: string) => {
    inspectorScopeRef.current = scopeKey;
    historyRequestGenerationRef.current += 1;
  }, []);
  const availableTemplates = libraryTemplates ?? EMPTY_ESTIMATE_TEMPLATES;
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
  const canInsertTemplateIntoSelectedNode = Boolean(templateTargetParentNode);
  const insertionTargetLabel = selectedNode?.kind === "area" ? selectedNode.name : "selected area";
  const templateInsertionTargetLabel = templateTargetParentNode?.name ?? "selected group";
  const projectTotal = estimateTree.reduce((total, node) => total + computeNodeTotal(node, editableRows), 0);
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
  const handleSheetPointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (!estimateId || !collaborationUserId) return;
    if (!(event.target instanceof Element)) return;

    const bounds = event.currentTarget.getBoundingClientRect();
    const rowElement = event.target.closest<HTMLElement>("[data-estimate-row-id]");
    const cellElement = event.target.closest<HTMLElement>("[data-estimate-cell-index]");

    broadcastCursor({
      x: Math.round(event.clientX - bounds.left + event.currentTarget.scrollLeft),
      y: Math.round(event.clientY - bounds.top + event.currentTarget.scrollTop),
      rowId: rowElement?.dataset.estimateRowId ?? null,
      columnId: cellElement?.dataset.estimateCellIndex ?? null,
    });
  }, [broadcastCursor, collaborationUserId, estimateId]);

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

  function updateRowItem(rowItemId: string, values: Partial<EditableRowValue>) {
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
      ...(values.quantity !== undefined ? { quantity: parseEditableNumber(values.quantity) } : {}),
      ...(values.contingencyPercentage !== undefined || values.contingencyMode !== undefined ? { contingencyPercentage: parseEditableContingencyPercentage(nextEditableRow) } : {}),
      ...(values.miscCost !== undefined ? { miscCost: parseEditableNumber(values.miscCost) } : {}),
      rollback: () => restoreEstimateState(previousTree, previousRows, rollbackRevision),
    });
  }

  const insertLibraryItem = useCallback((targetNodeId: string, libraryItem: EstimateRowItem) => {
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
  }, [editableRows, estimateId, estimateTree, insertRow, projectId, restoreEstimateState, setEstimateTree]);

  const insertIntoSelectedNode = useCallback(
    (libraryItem: EstimateRowItem) => {
      if (!insertTargetNodeId) return false;
      insertLibraryItem(insertTargetNodeId, libraryItem);
      return true;
    },
    [insertLibraryItem, insertTargetNodeId],
  );

  const insertTemplateIntoParent = useCallback(
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
    [editableRows, estimateId, estimateTree, getEstimateTreeRevision, projectId, restoreEstimateState, setEstimateTree, setEstimateTreeData, setSelectedNodeId],
  );

  const insertTemplateIntoParentById = useCallback(
    (targetParentNodeId: string, templateId: string) => {
      const template = templateById.get(templateId);
      if (!template) return false;
      return insertTemplateIntoParent(targetParentNodeId, template);
    },
    [insertTemplateIntoParent, templateById],
  );

  const insertTemplateIntoSelectedGroup = useCallback(
    (template: EstimateTemplate) => {
      if (!templateTargetParentNode) return false;
      return insertTemplateIntoParent(templateTargetParentNode.id, template);
    },
    [insertTemplateIntoParent, templateTargetParentNode],
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

  function replaceRowItem(rowItemId: string, libraryItem: EstimateRowItem) {
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
  }

  function clearRowComponent(rowItemId: string) {
    replaceRowItem(rowItemId, createBlankEstimateRowTemplate());
  }

  function requestProjectSpecific(rowItemId: string) {
    const row = currentRows.find((candidate) => candidate.item.id === rowItemId);
    if (!row || !canMakeProjectSpecific(row.item)) return;
    setProjectSpecificRowId(rowItemId);
  }

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

  function moveRowComponent(sourceRowItemId: string, targetRowItemId: string, movedItem: EstimateRowItem) {
    if (sourceRowItemId === targetRowItemId) return;
    replaceRowItem(targetRowItemId, movedItem);
    clearRowComponent(sourceRowItemId);
  }

  function deleteRowItem(rowItemId: string) {
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
  }

  return (
    <>
      <CommandPalette
        open={showCommandPalette}
        items={libraryItems}
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
            />
            <div
              className="relative min-h-0 flex-1 overflow-auto px-2 pb-2"
              data-estimate-pointer-surface
              data-estimate-cursor-channel={cursorChannelStatus}
              data-estimate-cursor-send={cursorLastSendStatus}
              onPointerMove={handleSheetPointerMove}
            >
              <RemoteEstimateCursorsOverlay cursors={remoteCursors} />
              <EstimateSheetExpansionContext.Provider value={{ collapsedNodeIds, setCollapsedNodeIds }}>
                <EstimateSheetBranch
                  node={selectedNode}
                  nodeCode={resolvedSelectedNodeId ? computeNodeCode(estimateTree, resolvedSelectedNodeId) : ""}
                  ancestorPath={resolvedSelectedNodeId ? findNodePath(estimateTree, resolvedSelectedNodeId).slice(0, -1).map((n) => ({ id: n.id, name: n.name })) : []}
                  editableRows={editableRows}
                  setEditableRows={setEditableRows}
                  onInsertLibraryItem={insertLibraryItem}
                  onInsertTemplate={insertTemplateIntoParentById}
                  onAddBlankRow={insertBlankRow}
                  onReplaceRowItem={replaceRowItem}
                  onDeleteRowItem={deleteRowItem}
                  onUpdateRowItem={updateRowItem}
                  onMarkRowDirty={markRowDirty}
                  onOpenRowDetails={openRowDetails}
                  onClearRowComponent={clearRowComponent}
                  onRequestProjectSpecific={requestProjectSpecific}
                  onMoveRowComponent={moveRowComponent}
                />
              </EstimateSheetExpansionContext.Provider>
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
            />
            <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-auto px-2 pb-2" onPointerMove={handleSheetPointerMove}>
              <RemoteEstimateCursorsOverlay cursors={remoteCursors} />
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
        <EstimateRightSidebar
          onInsertComponent={insertIntoSelectedNode}
          estimateId={estimateId}
          selectedNodeId={resolvedSelectedNodeId}
          selectedNodeKind={selectedNode?.kind ?? null}
          selectedNodeName={selectedNode?.name ?? null}
          templateTargetName={templateInsertionTargetLabel}
          canInsertTemplate={canInsertTemplateIntoSelectedNode}
          nodes={estimateTree}
          initialLibraryItems={libraryItems}
          templates={availableTemplates}
          categoryTree={libraryCategoryTree}
          suppliers={librarySuppliers}
          brands={libraryBrands}
          onInsertTemplate={insertTemplateIntoSelectedGroup}
        />
      ) : null}
    </>
  );
}
