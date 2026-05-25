"use client";

import { type ChangeEvent, type Dispatch, type DragEvent, type InputHTMLAttributes, type KeyboardEvent, type MouseEvent, type SetStateAction, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ArrowsOutSimple, CaretDown, ClockCounterClockwise, Cube, DotsSixVertical, DotsThreeVertical, FileXls, FolderSimple, Plus, Trash, WarningCircle, X } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { ControlField, ControlInput } from "@/components/ui/control-input";
import { HeaderIconToolbar } from "@/components/ui/header-icon-toolbar";
import { SearchInput } from "@/components/ui/search-input";
import { dispatchProjectTotalChange } from "@/components/workshop/ProjectTotalHeader";
import { useEstimateRowMutations } from "@/hooks/use-estimate-row-mutations";
import { useEstimateAreaTreeQuery } from "@/hooks/use-estimate-query";
import { resolveEstimateWorkspaceSelection, useEstimateWorkspaceSelection } from "@/hooks/use-estimate-workspace-state";
import { fetchEstimateSheetVersionControl, insertEstimateTemplateIntoEstimate, type EstimateSheetHistoryEvent, type EstimateSheetVersionControlData } from "@/lib/estimates/actions";
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
  onOpenRowDetails: (rowItemId: string, opener: HTMLElement, tab?: RowInspectorTab) => void;
  onClearRowComponent: (rowItemId: string) => void;
  onMoveRowComponent: (sourceRowItemId: string, targetRowItemId: string, movedItem: EstimateRowItem) => void;
  depth?: number;
  usesSiblingGroupRhythm?: boolean;
};

type RowInspectorTab = "summary" | "source" | "history";

type EstimateInspectorState =
  | { mode: "row"; rowId: string; tab: RowInspectorTab }
  | { mode: "sheet" }
  | { mode: "node"; nodeId: string; includeDescendants: boolean };

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
  { value: "row_inserted", label: "Inserted rows" },
  { value: "row_deleted", label: "Deleted rows" },
  { value: "template_inserted", label: "Templates" },
  { value: "node_created", label: "Node created" },
  { value: "node_renamed", label: "Node renamed" },
  { value: "tree_reordered", label: "Tree reordered" },
  { value: "node_deleted_with_children", label: "Node deleted" },
  { value: "sheet_code_updated", label: "Sheet code" },
  { value: "sheet_metadata_updated", label: "Sheet metadata" },
] as const;

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
  if (kind === "group") return "truncate text-[10px] font-semibold text-ink";
  return "truncate text-[10px] font-semibold text-secondary";
}

function nodeTotalClasses(kind: EstimateTreeNode["kind"]) {
  if (kind === "group") return "shrink-0 text-right text-[10px] font-semibold tabular-nums text-ink";
  return "shrink-0 text-right text-[10px] font-normal tabular-nums text-ink";
}

function NodeIcon({ kind }: { kind: EstimateTreeNode["kind"] }) {
  if (getEstimateNodeDisplayKind(kind) === "group") return <FolderSimple size={13} weight="bold" aria-hidden="true" />;
  return <Cube size={13} weight="bold" aria-hidden="true" />;
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
      contingencyPercentage: currentRow?.contingencyPercentage ?? toEditableNumber(item.contingencyPercentage ?? 0),
      miscCost: currentRow?.miscCost ?? toEditableNumber(item.miscCost),
      ...patchValue,
    },
  };
}

type EditableRowValue = {
  quantity: string;
  contingencyPercentage: string;
  miscCost: string;
};

const BLANK_ESTIMATE_ROW_COMPONENT_LABEL = "Drag or add a component here";
const BLANK_ESTIMATE_ROW_TAG = "manual-row-placeholder";

function parseEditableNumber(value: string) {
  const parsed = Number(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function clampContingencyPercentage(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

function parseContingencyPercentage(value: string) {
  return clampContingencyPercentage(parseEditableNumber(value));
}

function toEditableContingencyPercentage(value: number) {
  return toEditableNumber(clampContingencyPercentage(value));
}

function formatEditableMoney(value: string) {
  return pesoFormatter.format(parseEditableNumber(value)).replace("₱", "₱ ");
}

function getInitialEditableRow(item: EstimateRowItem): EditableRowValue {
  return {
    quantity: toEditableNumber(item.quantity),
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
  const contingencyPercentage = parseContingencyPercentage(editableRow.contingencyPercentage);
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
      const contingencyPercentage = parseContingencyPercentage(editableRow.contingencyPercentage);
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

function readRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function readStringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function readNumberValue(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function flattenEstimateRows(nodes: EstimateTreeNode[], editableRows: Record<string, EditableRowValue>): FlattenedEstimateRow[] {
  const rows: FlattenedEstimateRow[] = [];

  function visit(node: EstimateTreeNode, path: string[]) {
    const nodePath = [...path, node.name];
    node.estimateRowItems?.forEach((item) => {
      const editableRow = editableRows[item.id] ?? getInitialEditableRow(item);
      const quantity = parseEditableNumber(editableRow.quantity);
      const contingencyPercentage = parseContingencyPercentage(editableRow.contingencyPercentage);
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

function getEventSummary(event: EstimateSheetHistoryEvent) {
  const rowContext = event.rowContext;
  const payload = event.payload;
  const material = readStringValue(rowContext.material);
  if (event.eventType === "row_replaced") {
    const oldSnapshot = getEventSnapshotRecord(event.oldSnapshot);
    const newSnapshot = getEventSnapshotRecord(event.newSnapshot);
    return `${readStringValue(oldSnapshot.material, material)} -> ${readStringValue(newSnapshot.material, material)}`;
  }
  if (event.eventType === "row_updated" && event.changedFields.length) return event.changedFields.map((field) => field.replace(/([A-Z])/g, " $1").toLowerCase()).join(", ");
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
        <div className="flex flex-col items-center justify-center gap-1 text-center text-[10px] font-bold uppercase tracking-[0.12em]">
          <span className="flex size-5 items-center justify-center rounded-full border border-dashed border-divider bg-white text-ink">
            <Plus size={12} weight="bold" aria-hidden="true" />
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
          className="size-14 shrink-0 rounded-sm bg-neutral-100 bg-cover bg-center"
          style={{ backgroundImage: `url(${getComponentImageUrl(item)})` }}
          aria-label={`${item.material} reference image`}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="min-w-0 pr-[66px]">
            <p className="truncate text-[11px] font-bold leading-4 text-ink">{item.material}</p>
            <p className="truncate text-[10px] font-semibold leading-4 text-tertiary">{item.supplier}</p>
          </div>
          <div className="flex flex-1 items-start justify-end">
            <p className="whitespace-nowrap text-[9px] font-bold leading-4 tabular-nums text-ink">{pesoFormatter.format(item.itemCost).replace("₱", "₱ ")}</p>
          </div>
        </div>
      </div>
      <div className="flex items-start justify-between gap-2">
        <p className="truncate text-[10px] leading-4 text-secondary/60 transition-opacity group-hover:text-secondary" title={item.description}>
          {item.description}
        </p>
        <p className="shrink-0 whitespace-nowrap text-[10px] font-semibold leading-3 text-tertiary">/ {item.unit}</p>
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
  onMoveComponent,
  onOpenComponentDetails,
}: {
  item: EstimateRowItem;
  isReplaceTarget: boolean;
  onReplaceDragOver: () => void;
  onReplaceDragLeave: () => void;
  onReplace: (libraryItem: EstimateRowItem) => void;
  onClearComponent: () => void;
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
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="size-5 rounded-sm p-0 text-tertiary hover:bg-red-50 hover:text-red-700 active:bg-red-50 focus-visible:text-red-700"
          aria-label={`Delete component ${item.material}`}
          title="Delete component"
          onClick={(event: MouseEvent<HTMLButtonElement>) => {
            event.stopPropagation();
            onClearComponent();
          }}
        >
          <Trash size={11} weight="bold" aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="size-5 rounded-sm p-0 text-tertiary hover:bg-surfaceMuted hover:text-ink active:bg-surfaceMuted"
          aria-label={`Open component menu for ${item.material}`}
          title="Component information"
          onClick={(event: MouseEvent<HTMLButtonElement>) => {
            event.stopPropagation();
            onOpenComponentDetails(event.currentTarget);
          }}
        >
          <DotsThreeVertical size={11} weight="bold" aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="size-5 cursor-grab rounded-sm p-0 text-tertiary hover:bg-surfaceMuted hover:text-ink active:cursor-grabbing active:bg-surfaceMuted"
          aria-label={`Drag component ${item.material}`}
          title="Drag component"
          draggable
          onClick={(event: MouseEvent<HTMLButtonElement>) => event.stopPropagation()}
          onDragStart={handleComponentDragStart}
          onDragEnd={handleComponentDragEnd}
        >
          <DotsSixVertical size={11} weight="bold" aria-hidden="true" />
        </Button>
      </div>
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
  onOpenRowDetails: (rowItemId: string, opener: HTMLElement, tab?: RowInspectorTab) => void;
  onClearRowComponent: (rowItemId: string) => void;
  onMoveRowComponent: (sourceRowItemId: string, targetRowItemId: string, movedItem: EstimateRowItem) => void;
}) {
  const [focusedCell, setFocusedCell] = useState<{ rowId: string; cellIndex: number } | null>(null);
  const [replaceTargetRowId, setReplaceTargetRowId] = useState("");
  const computedRows = useMemo(
    () =>
      items.map((item) => {
        const editableRow = editableRows[item.id] ?? getInitialEditableRow(item);
        const quantity = parseEditableNumber(editableRow.quantity);
        const contingencyPercentage = parseContingencyPercentage(editableRow.contingencyPercentage);
        const miscCost = parseEditableNumber(editableRow.miscCost);
        const subTotal = item.itemCost * quantity;
        const contingencyValue = calculateContingencyValue(subTotal, contingencyPercentage);
        return {
          ...item,
          storedQuantity: item.quantity,
          storedContingencyPercentage: item.contingencyPercentage ?? 0,
          storedMiscCost: item.miscCost,
          editableQuantity: editableRow.quantity,
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

  const rowColumns = "grid-cols-[36px_32px_minmax(160px,1fr)_58px_92px_88px_92px_108px_30px]";

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
        <thead className="sticky top-0 z-10 bg-white text-left text-[10px] font-bold text-ink">
          <tr className={cn("grid min-h-10 border-b border-hairline", rowColumns)}>
            <th className="flex items-center justify-center border-r border-hairline text-[9px] font-mono text-tertiary">#</th>
            <th className="flex items-center justify-center border-r border-hairline">
              <input type="checkbox" aria-label="Select all estimate row items" />
            </th>
            <th className="flex items-center justify-center border-r border-hairline">Materials</th>
            <th className="flex items-center justify-center border-r border-hairline">Qty</th>
            <th className="flex items-center justify-center border-r border-hairline">Subtotal</th>
            <th className="flex items-center justify-center border-r border-hairline text-center text-[9px] leading-3">Contingency</th>
            <th className="flex items-center justify-center border-r border-hairline text-center text-[9px] leading-3">Misc Cost</th>
            <th className="flex items-center justify-center border-r border-hairline text-center text-[9px] leading-3">Total Item Cost</th>
            <th className="flex items-center justify-center">
              <DotsThreeVertical size={14} weight="bold" aria-hidden="true" />
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
                <td className="flex items-center justify-center border-r border-hairline text-[9px] font-mono tabular-nums text-tertiary">
                  {String(rowIndex + 1).padStart(2, "0")}
                </td>
                <td className="flex flex-col items-center justify-between border-r border-hairline py-2 text-tertiary">
                  <span className="flex h-6 items-center justify-center">
                    <DotsSixVertical size={14} weight="bold" aria-label={`Drag material ${item.material}`} />
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
                    onMoveComponent={onMoveRowComponent}
                    onOpenComponentDetails={(opener) => onOpenRowDetails(item.id, opener, "source")}
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
                  <p className="absolute top-18 right-1 text-[10px] font-semibold leading-3 text-tertiary">/ {item.unit}</p>
                </td>
                <td className="flex items-center justify-center border-r border-hairline px-1 text-center text-[9px] font-bold tabular-nums text-ink">{pesoFormatter.format(item.subTotal).replace("₱", "₱ ")}</td>
                <td
                  className={cn(
                    "relative flex items-center justify-center border-r border-hairline px-1 text-center",
                    activeCellIndex === 1 && "bg-accent/10 ring-1 ring-inset ring-accent/30",
                  )}
                  data-estimate-cell-active={activeCellIndex === 1 ? "true" : undefined}
                >
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
                      if (item.contingencyPercentage !== item.storedContingencyPercentage) onUpdateRowItem(item.id, { contingencyPercentage: nextContingencyPercentage });
                    }}
                    onKeyDown={(event) => handleEstimateCellKeyDown(event, rowIndex, 1)}
                    data-estimate-row-index={rowIndex}
                    data-estimate-cell-index={1}
                    aria-label={`${item.material} contingency percentage`}
                    align="center"
                    className="h-full w-full border-0 bg-transparent p-0 text-center text-[10px] font-bold tabular-nums shadow-none [appearance:textfield] focus-visible:ring-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  <p className="absolute top-18 right-1 max-w-[calc(100%-0.5rem)] truncate text-right text-[9px] font-semibold leading-3 tabular-nums text-tertiary">
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
                  <p className="text-[10px] font-bold tabular-nums text-ink">{pesoFormatter.format(item.totalItemCosts).replace("₱", "₱ ")}</p>
                </td>
                <td className="flex flex-col items-center justify-between py-2 text-tertiary">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="size-6 rounded-sm p-0 text-tertiary hover:bg-surfaceMuted hover:text-ink"
                    aria-label={`Open row menu for ${item.material}`}
                    onClick={(event: MouseEvent<HTMLButtonElement>) => onOpenRowDetails(item.id, event.currentTarget)}
                  >
                    <DotsThreeVertical size={14} weight="bold" aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="size-6 rounded-sm p-0 text-tertiary hover:bg-surfaceMuted hover:text-ink"
                    aria-label={`Open row details for ${item.material}`}
                    onClick={(event: MouseEvent<HTMLButtonElement>) => onOpenRowDetails(item.id, event.currentTarget)}
                  >
                    <ArrowsOutSimple size={14} weight="bold" aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="size-6 rounded-sm p-0 text-tertiary hover:bg-red-50 hover:text-red-700 focus-visible:text-red-700"
                    aria-label={`Delete row ${item.material}`}
                    onClick={() => onDeleteRowItem(item.id)}
                  >
                    <Trash size={14} weight="bold" aria-hidden="true" />
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

function EstimateSheetBranch({ node, nodeCode, ancestorPath = [], editableRows, setEditableRows, onInsertLibraryItem, onInsertTemplate, onAddBlankRow, onReplaceRowItem, onDeleteRowItem, onUpdateRowItem, onMarkRowDirty, onOpenRowDetails, onClearRowComponent, onMoveRowComponent, depth = 0, usesSiblingGroupRhythm = false }: EstimateSheetBranchProps) {
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
      className={cn(groupGap(depth, node.kind, usesSiblingGroupRhythm), !isGroup && (depth > 0 ? "border border-hairline bg-surfaceMuted/20" : "rounded-sm border border-hairline bg-surfaceMuted/20"))}
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
            className="size-6 rounded-sm p-0 text-tertiary"
            onClick={() =>
              setCollapsedNodeIds((prev) => {
                const next = new Set(prev);
                if (next.has(node.id)) next.delete(node.id);
                else next.add(node.id);
                return next;
              })
            }
          >
            <CaretDown size={13} weight="bold" aria-hidden="true" className={collapsed ? "-rotate-90" : ""} />
          </Button>
          <span className="flex size-6 shrink-0 items-center justify-center text-tertiary">
            <NodeIcon kind={node.kind} />
          </span>
          <div className="min-w-0 flex-1">
            {nodeCode && (
              <p className="text-[8px] font-mono leading-none tabular-nums text-tertiary">{nodeCode}</p>
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
  const contingencyPercentage = parseContingencyPercentage(editableRow.contingencyPercentage);
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

function InspectorTabButton({
  selected,
  children,
  onClick,
}: {
  selected: boolean;
  children: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      className={cn(
        "h-7 border-b px-2 text-[10px] font-semibold text-tertiary",
        selected ? "border-accent text-ink" : "border-transparent hover:border-hairline hover:text-ink",
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function InspectorField({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="min-w-0 border-b border-hairline/60 py-2 last:border-b-0">
      <p className="text-[8px] font-bold uppercase text-tertiary">{label}</p>
      <p className="mt-0.5 truncate text-[10px] font-semibold text-ink">{value === null || value === undefined || value === "" ? "—" : value}</p>
    </div>
  );
}

function getEventSnapshotRecord(snapshot: unknown) {
  const record = readRecord(snapshot);
  const changedRecord = readRecord(record.changed);
  return Object.keys(changedRecord).length > 0 ? changedRecord : record;
}

function getRowHistorySnapshotRecord(event: EstimateSheetHistoryEvent) {
  const newSnapshot = getEventSnapshotRecord(event.newSnapshot);
  if (Object.keys(newSnapshot).length > 0) return newSnapshot;
  return getEventSnapshotRecord(event.oldSnapshot);
}

type AuditChangeDetail =
  | { kind: "diff"; label: string; oldValue: string; newValue: string }
  | { kind: "note"; label: string; value: string };

const ROW_HISTORY_COMPONENT_EVENT_TYPES = new Set(["row_blank_added", "row_replaced"]);
const ROW_HISTORY_COMPONENT_FIELDS = new Set(["linkState", "sourceLibraryItemId", "sourceSnapshot"]);
const ROW_HISTORY_SCALAR_FIELDS = new Set(["quantity", "contingencyPercentage", "miscCost"]);
const AUDIT_DETAIL_LIMIT = 5;
const AUDIT_FIELD_LABELS: Record<string, string> = {
  categoryNodeId: "Category",
  contingencyPercentage: "Contingency",
  description: "Description",
  discipline: "Discipline",
  linkState: "Link state",
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

const ROW_REPLACED_DETAIL_FIELDS = ["material", "supplier", "unitCost", "unit", "quantity", "contingencyPercentage", "miscCost"];
const HIDDEN_AUDIT_FIELDS = new Set(["metadata"]);

function shouldRenderRowHistoryComponent(event: EstimateSheetHistoryEvent) {
  if (ROW_HISTORY_COMPONENT_EVENT_TYPES.has(event.eventType)) return true;
  if (event.changedFields.some((field) => ROW_HISTORY_SCALAR_FIELDS.has(field))) return false;
  return event.changedFields.some((field) => ROW_HISTORY_COMPONENT_FIELDS.has(field));
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

function humanizeAuditValue(value: string) {
  return value.replace(/[_-]/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
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

  if (field === "quantity") {
    const parsed = readOptionalNumber(value);
    return parsed === null ? String(value) : `${formatAuditNumber(parsed)} ${getSnapshotUnit(snapshot)}`;
  }

  if (field === "contingencyPercentage") {
    const parsed = readOptionalNumber(value);
    if (parsed === null) return String(value);
    const contingencyValue = readOptionalNumber(snapshot.contingencyValue);
    return contingencyValue === null ? `${formatAuditNumber(parsed)}%` : `${formatAuditNumber(parsed)}% (${formatPeso(contingencyValue)})`;
  }

  if (field === "miscCost" || field === "unitCost" || field === "lineTotal") {
    const parsed = readOptionalNumber(value);
    return parsed === null ? String(value) : formatPeso(parsed);
  }

  if (field === "linkState") return humanizeAuditValue(String(value));
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

function getRowHistoryMaterialItem(event: EstimateSheetHistoryEvent, row: FlattenedEstimateRow | null): EstimateMaterialCardItem | null {
  const snapshot = getRowHistorySnapshotRecord(event);
  const sourceSnapshot = readRecord(snapshot.sourceSnapshot);
  const categoryPath = Array.isArray(sourceSnapshot.categoryPath)
    ? sourceSnapshot.categoryPath.filter((part): part is string => typeof part === "string")
    : [];
  const lastCategoryPathPart = categoryPath.length > 0 ? categoryPath[categoryPath.length - 1] : undefined;
  const fallback = row?.item;
  const material = readStringValue(snapshot.material, fallback?.material ?? "");

  if (!material) return fallback ?? null;

  return {
    material,
    supplier: readStringValue(snapshot.supplier, fallback?.supplier ?? ""),
    itemCost: readNumberValue(snapshot.unitCost, readNumberValue(snapshot.itemCost, fallback?.itemCost ?? 0)),
    description: readStringValue(snapshot.description, fallback?.description ?? ""),
    unit: readStringValue(snapshot.unit, fallback?.unit ?? "unit"),
    imageUrl: readStringValue(sourceSnapshot.imageUrl, fallback?.imageUrl ?? ""),
    category: readStringValue(sourceSnapshot.category, lastCategoryPathPart ?? fallback?.category ?? "General"),
  };
}

function getHistoryDeltaClass(value: number | null) {
  if (value === null || Math.abs(value) < 0.005) return "text-tertiary";
  return value > 0 ? "text-emerald-700" : "text-red-700";
}

function getHistoryChangeLabel(event: EstimateSheetHistoryEvent) {
  return `${getEventLabel(event.eventType)} · ${getEventSummary(event)}`;
}

function getActorLabel(event: EstimateSheetHistoryEvent) {
  return event.actorLabel || (event.actorUserId ? `User ${event.actorUserId.slice(0, 8)}` : "System/backfill");
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

function ActivityFilterBar({
  filters,
  onChange,
  onReset,
}: {
  filters: ActivityFilterState;
  onChange: (filters: ActivityFilterState) => void;
  onReset: () => void;
}) {
  const updateFilter = (key: keyof ActivityFilterState) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    onChange({ ...filters, [key]: event.target.value });
  };
  const hasFilters = createActivityFilterKey(filters) !== createActivityFilterKey(DEFAULT_ACTIVITY_FILTERS);

  return (
    <div className="mb-2 grid gap-2 border border-hairline bg-white p-2 text-[10px]" aria-label="Activity filters">
      <div className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)] gap-2 max-sm:grid-cols-1">
        <ControlField label="Event" reserveHelperSpace>
          <select
            aria-label="Filter activity by event type"
            className="h-8 min-w-0 rounded-sm border border-hairline bg-white px-2 text-[10px] font-semibold text-ink outline-none focus:border-accent focus:ring-2 focus:ring-focus"
            value={filters.eventType}
            onChange={updateFilter("eventType")}
          >
            {ACTIVITY_FILTER_EVENT_TYPES.map((option) => (
              <option key={option.value || "all"} value={option.value}>{option.label}</option>
            ))}
          </select>
        </ControlField>
        <ControlField label="Search" reserveHelperSpace>
          <ControlInput
            className="h-8 border-hairline px-2"
            aria-label="Search activity"
            value={filters.search}
            onChange={updateFilter("search")}
            placeholder="Material, event, id"
          />
        </ControlField>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-start gap-2 max-sm:grid-cols-1">
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
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="mt-4 h-8 rounded-sm text-[10px]"
          disabled={!hasFilters}
          onClick={onReset}
        >
          Reset
        </Button>
      </div>
    </div>
  );
}

function AuditEventCard({
  event,
  componentItem,
}: {
  event: EstimateSheetHistoryEvent;
  componentItem?: EstimateMaterialCardItem | null;
}) {
  const title = getEventLabel(event.eventType);
  const summary = getEventSummary(event);
  const details = getAuditChangeDetails(event);
  const deltaClass = getHistoryDeltaClass(event.totalDelta);
  const changeLabel = getHistoryChangeLabel(event);

  return (
    <article className="overflow-hidden border border-hairline bg-white text-[10px]" aria-label={`${title} audit event`} data-audit-event-card>
      <div className="border-b border-hairline bg-surfaceMuted/50 px-2 py-1.5">
        <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
          <p className="shrink-0 font-mono text-[9px] tabular-nums text-tertiary">{formatShortDateTime(event.createdAt)}</p>
          <p className="min-w-0 truncate text-center text-[9px] font-semibold text-tertiary">{getActorLabel(event)}</p>
          <p className={cn("shrink-0 text-right font-mono text-[9px] font-bold tabular-nums", deltaClass)}>{formatSignedPeso(event.totalDelta)}</p>
        </div>
        <div className="mt-1 min-w-0">
          <p className="font-semibold text-ink">{title}</p>
          <p className="mt-0.5 break-words leading-4 text-tertiary" title={changeLabel}>{summary}</p>
        </div>
      </div>
      {details.length ? (
        <div className="grid gap-1.5 bg-white p-2" data-audit-event-details>
          {details.map((detail) => (
            <div key={`${detail.label}-${detail.kind}`} className="border border-hairline/70 bg-surfaceMuted/25 p-2">
              <p className="text-[8px] font-bold uppercase leading-3 text-tertiary">{detail.label}</p>
              {detail.kind === "diff" ? (
                <div className="mt-1 grid grid-cols-[minmax(0,1fr)_12px_minmax(0,1fr)] items-start gap-1 text-[9px] leading-4">
                  <p className="min-w-0 break-words text-secondary">{detail.oldValue}</p>
                  <p className="text-center font-mono text-muted">→</p>
                  <p className="min-w-0 break-words font-semibold text-ink">{detail.newValue}</p>
                </div>
              ) : (
                <p className="mt-1 break-words text-[9px] font-semibold leading-4 text-ink">{detail.value}</p>
              )}
            </div>
          ))}
        </div>
      ) : null}
      {componentItem ? (
        <div
          className="group flex min-h-24 flex-col gap-2 overflow-hidden border-t border-hairline bg-white p-2"
          aria-label={`${componentItem.material} history component snapshot`}
          data-row-history-component-card
        >
          <EstimateMaterialCardContent item={componentItem} />
        </div>
      ) : null}
    </article>
  );
}

type GroupedActivityEventItem =
  | { kind: "event"; event: EstimateSheetHistoryEvent }
  | { kind: "group"; correlationId: string; events: EstimateSheetHistoryEvent[] };

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

function AuditEventGroup({
  events,
  row,
}: {
  events: EstimateSheetHistoryEvent[];
  row?: FlattenedEstimateRow | null;
}) {
  const firstEvent = events[0];
  const eventTypes = Array.from(new Set(events.map((event) => getEventLabel(event.eventType)))).join(", ");

  return (
    <details className="border border-hairline bg-white" data-audit-event-group>
      <summary className="grid cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border-b border-hairline bg-surfaceMuted/60 px-2 py-1.5 text-[10px]">
        <span className="font-mono text-[9px] tabular-nums text-tertiary">{firstEvent ? formatShortDateTime(firstEvent.createdAt) : "Activity"}</span>
        <span className="min-w-0 truncate font-semibold text-ink">{events.length} related activity events</span>
        <span className="min-w-0 truncate text-right text-[9px] text-tertiary">{eventTypes}</span>
      </summary>
      <div className="space-y-1 p-1.5">
        {events.map((event) => {
          const componentItem = shouldRenderRowHistoryComponent(event) ? getRowHistoryMaterialItem(event, row ?? null) : null;
          return <AuditEventCard key={event.id} event={event} componentItem={componentItem} />;
        })}
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
  row,
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
  row?: FlattenedEstimateRow | null;
}) {
  if (isLoading) {
    return (
      <div className="space-y-2" aria-label="Loading history">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-14 border border-hairline bg-surfaceMuted/50" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-amber-200 bg-amber-50 p-3 text-[10px] text-amber-900">
        <div className="flex items-center gap-2 font-semibold">
          <WarningCircle size={13} weight="bold" aria-hidden="true" />
          History could not load
        </div>
        <p className="mt-1 leading-4">{error}</p>
        <Button type="button" variant="secondary" size="sm" className="mt-2 h-7 rounded-sm text-[10px]" onClick={onRetry}>
          Retry
        </Button>
      </div>
    );
  }

  if (!events.length) {
    return (
      <div className="border border-dashed border-hairline bg-white p-3 text-[10px] text-tertiary">
        <p className="font-semibold text-ink">{emptyLabel}</p>
        <p className="mt-1 leading-4">{emptyDescription}</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {groupActivityEvents(events).map((item) => {
        if (item.kind === "group") {
          return <AuditEventGroup key={item.correlationId} events={item.events} row={row} />;
        }

        const componentItem = shouldRenderRowHistoryComponent(item.event) ? getRowHistoryMaterialItem(item.event, row ?? null) : null;
        return <AuditEventCard key={item.event.id} event={item.event} componentItem={componentItem} />;
      })}
      {nextCursor && onLoadMore ? (
        <div className="pt-1">
          <Button type="button" variant="secondary" size="sm" className="h-7 w-full rounded-sm text-[10px]" disabled={isLoadingMore} onClick={onLoadMore}>
            {isLoadingMore ? "Loading..." : loadMoreLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function RowInspector({
  row,
  tab,
  events,
  nextCursor,
  isLoading,
  isLoadingMore,
  error,
  onTabChange,
  onRetry,
  onLoadMore,
}: {
  row: FlattenedEstimateRow | null;
  tab: RowInspectorTab;
  events: EstimateSheetHistoryEvent[];
  nextCursor: EstimateSheetVersionControlData["rowNextCursor"];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string;
  onTabChange: (tab: RowInspectorTab) => void;
  onRetry: () => void;
  onLoadMore: () => void;
}) {
  const item = row?.item;
  return (
    <>
      <div className="border-b border-hairline p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[12px] font-bold text-ink">{item?.material ?? "Row not found"}</p>
            <p className="mt-0.5 truncate text-[9px] text-tertiary">{row?.nodePath.join(" / ") ?? "Current sheet"}</p>
          </div>
          <p className="shrink-0 font-mono text-[11px] font-bold tabular-nums text-ink">{formatPeso(row?.lineTotal ?? 0)}</p>
        </div>
        <div className="mt-3 flex gap-2 border-b border-hairline" role="tablist" aria-label="Row details tabs">
          <InspectorTabButton selected={tab === "summary"} onClick={() => onTabChange("summary")}>Summary</InspectorTabButton>
          <InspectorTabButton selected={tab === "source"} onClick={() => onTabChange("source")}>Source</InspectorTabButton>
          <InspectorTabButton selected={tab === "history"} onClick={() => onTabChange("history")}>Version History</InspectorTabButton>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-3">
        {tab === "summary" ? (
          <div className="grid grid-cols-2 gap-x-3 border border-hairline bg-white px-3">
            <InspectorField label="Material" value={item?.material} />
            <InspectorField label="Supplier" value={item?.supplier} />
            <InspectorField label="Quantity" value={row ? `${row.quantity} ${item?.unit ?? ""}` : null} />
            <InspectorField label="Unit cost" value={formatPeso(item?.itemCost ?? 0)} />
            <InspectorField label="Contingency" value={row ? `${row.contingencyPercentage}% (${formatPeso(row.contingencyValue)})` : null} />
            <InspectorField label="Misc cost" value={formatPeso(row?.miscCost ?? 0)} />
            <InspectorField label="Total" value={formatPeso(row?.lineTotal ?? 0)} />
            <InspectorField label="Category" value={item?.category} />
            <InspectorField label="Row revision" value={item?.rowRevision ?? 1} />
          </div>
        ) : null}
        {tab === "source" ? (
          <div className="grid grid-cols-2 gap-x-3 border border-hairline bg-white px-3">
            <InspectorField label="Component version" value={item?.componentVersionNumber ? `V${item.componentVersionNumber}` : item?.componentVersionId} />
            <InspectorField label="Price option" value={item?.priceOptionLabel ?? item?.priceOptionId} />
            <InspectorField label="Lifecycle" value={item?.lifecycleState} />
            <InspectorField label="Discipline" value={item?.discipline} />
            <InspectorField label="Designation" value={item?.designation} />
            <InspectorField label="Pricing source" value={item?.pricingSource} />
            <InspectorField label="Pricing date" value={item?.pricingDate} />
            <InspectorField label="Tags" value={item?.tags?.join(", ")} />
          </div>
        ) : null}
        {tab === "history" ? (
          <EventList
            events={events}
            isLoading={isLoading}
            error={error}
            emptyLabel="No row history yet"
            onRetry={onRetry}
            nextCursor={nextCursor}
            isLoadingMore={isLoadingMore}
            loadMoreLabel="Load more row history"
            onLoadMore={onLoadMore}
            row={row}
          />
        ) : null}
      </div>
    </>
  );
}

function SheetInspector({
  metadata,
  projectTotal,
  events,
  nextCursor,
  filters,
  isLoading,
  isLoadingMore,
  error,
  onFiltersChange,
  onFiltersReset,
  onRetry,
  onLoadMore,
}: {
  metadata: ProposalExportMetadata | null;
  projectTotal: number;
  events: EstimateSheetHistoryEvent[];
  nextCursor: EstimateSheetVersionControlData["nextCursor"];
  filters: ActivityFilterState;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string;
  onFiltersChange: (filters: ActivityFilterState) => void;
  onFiltersReset: () => void;
  onRetry: () => void;
  onLoadMore: () => void;
}) {
  return (
    <>
      <div className="border-b border-hairline p-3">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
          <div className="min-w-0">
            <p className="font-mono text-[9px] font-bold text-tertiary">{metadata?.estimateSheetCode ?? "ES"}</p>
            <p className="truncate text-[12px] font-bold text-ink">{metadata?.estimateName ?? "Estimate sheet"}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-bold uppercase text-tertiary">Activity</p>
            <p className="mt-0.5 font-mono text-[11px] font-bold tabular-nums text-ink">{formatPeso(projectTotal)}</p>
          </div>
        </div>
        <div className="mt-3 flex gap-2 border-b border-hairline" role="tablist" aria-label="Sheet activity tabs">
          <InspectorTabButton selected onClick={() => undefined}>Activity</InspectorTabButton>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-3">
        <ActivityFilterBar filters={filters} onChange={onFiltersChange} onReset={onFiltersReset} />
        <EventList
          events={events}
          isLoading={isLoading}
          error={error}
          emptyLabel="No sheet activity yet"
          emptyDescription="Estimate edits, row changes, and sheet metadata updates will appear here."
          onRetry={onRetry}
          nextCursor={nextCursor}
          isLoadingMore={isLoadingMore}
          loadMoreLabel="Load more activity"
          onLoadMore={onLoadMore}
        />
      </div>
    </>
  );
}

function NodeInspector({
  node,
  nodePath,
  events,
  nextCursor,
  filters,
  includeDescendants,
  isLoading,
  isLoadingMore,
  error,
  onFiltersChange,
  onFiltersReset,
  onRetry,
  onLoadMore,
}: {
  node: EstimateTreeNode | null;
  nodePath: EstimateTreeNode[];
  events: EstimateSheetHistoryEvent[];
  nextCursor: EstimateSheetVersionControlData["nodeNextCursor"];
  filters: ActivityFilterState;
  includeDescendants: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string;
  onFiltersChange: (filters: ActivityFilterState) => void;
  onFiltersReset: () => void;
  onRetry: () => void;
  onLoadMore: () => void;
}) {
  const nodeKindLabel = node ? getEstimateNodeDisplayKind(node.kind) : "Node";
  const pathLabel = nodePath.map((pathNode) => pathNode.name).join(" / ") || "Current sheet";

  return (
    <>
      <div className="border-b border-hairline p-3">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
          <div className="min-w-0">
            <p className="font-mono text-[9px] font-bold uppercase text-tertiary">{nodeKindLabel}</p>
            <p className="truncate text-[12px] font-bold text-ink">{node?.name ?? "Node not found"}</p>
            <p className="mt-0.5 truncate text-[9px] text-tertiary">{pathLabel}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-bold uppercase text-tertiary">Activity</p>
            <p className="mt-0.5 text-[9px] font-semibold text-ink">{includeDescendants ? "Node + descendants" : "Node only"}</p>
          </div>
        </div>
        <div className="mt-3 flex gap-2 border-b border-hairline" role="tablist" aria-label="Node activity tabs">
          <InspectorTabButton selected onClick={() => undefined}>Activity</InspectorTabButton>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-3">
        <ActivityFilterBar filters={filters} onChange={onFiltersChange} onReset={onFiltersReset} />
        <EventList
          events={events}
          isLoading={isLoading}
          error={error}
          emptyLabel="No node activity yet"
          emptyDescription="Node changes and scoped descendant edits will appear here."
          onRetry={onRetry}
          nextCursor={nextCursor}
          isLoadingMore={isLoadingMore}
          loadMoreLabel="Load more node activity"
          onLoadMore={onLoadMore}
        />
      </div>
    </>
  );
}

function EstimateVersionControlInspector({
  inspector,
  selectedRow,
  selectedNode,
  selectedNodePath,
  projectTotal,
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
  onInspectorChange,
}: {
  inspector: EstimateInspectorState;
  selectedRow: FlattenedEstimateRow | null;
  selectedNode: EstimateTreeNode | null;
  selectedNodePath: EstimateTreeNode[];
  projectTotal: number;
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
  onInspectorChange: (state: EstimateInspectorState) => void;
}) {
  const title = inspector.mode === "row" ? "Row details" : inspector.mode === "node" ? "Node activity" : "Sheet activity";

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/5" onClick={onClose} aria-hidden="true" />
      <aside
        role="dialog"
        aria-modal="false"
        aria-label={title}
        className="fixed inset-y-0 right-0 z-50 flex w-[min(480px,42vw)] min-w-[420px] flex-col border-l border-hairline bg-[#FBFCFD] shadow-2xl max-lg:inset-x-2 max-lg:inset-y-auto max-lg:bottom-2 max-lg:max-h-[80dvh] max-lg:w-auto max-lg:min-w-0 max-lg:border"
      >
        <div className="flex h-9 items-center justify-between border-b border-hairline bg-white px-3">
          <p className="text-[11px] font-bold text-ink">{title}</p>
          <Button type="button" variant="ghost" size="icon-sm" className="size-6 rounded-sm p-0" aria-label={`Close ${title}`} onClick={onClose}>
            <X size={13} weight="bold" aria-hidden="true" />
          </Button>
        </div>
        {inspector.mode === "row" ? (
          <RowInspector
            row={selectedRow}
            tab={inspector.tab}
            events={historyData?.rowEvents ?? []}
            nextCursor={historyData?.rowNextCursor ?? null}
            isLoading={isHistoryLoading}
            isLoadingMore={isHistoryLoadingMore}
            error={historyError}
            onTabChange={(tab) => onInspectorChange({ mode: "row", rowId: inspector.rowId, tab })}
            onRetry={onRetry}
            onLoadMore={onLoadMore}
          />
        ) : null}
        {inspector.mode === "sheet" ? (
          <SheetInspector
            metadata={metadata}
            projectTotal={projectTotal}
            events={historyData?.events ?? []}
            nextCursor={historyData?.nextCursor ?? null}
            filters={activityFilters}
            isLoading={isHistoryLoading}
            isLoadingMore={isHistoryLoadingMore}
            error={historyError}
            onFiltersChange={onActivityFiltersChange}
            onFiltersReset={onActivityFiltersReset}
            onRetry={onRetry}
            onLoadMore={onLoadMore}
          />
        ) : null}
        {inspector.mode === "node" ? (
          <NodeInspector
            node={selectedNode}
            nodePath={selectedNodePath}
            events={historyData?.nodeEvents ?? []}
            nextCursor={historyData?.nodeNextCursor ?? null}
            filters={activityFilters}
            includeDescendants={inspector.includeDescendants}
            isLoading={isHistoryLoading}
            isLoadingMore={isHistoryLoadingMore}
            error={historyError}
            onFiltersChange={onActivityFiltersChange}
            onFiltersReset={onActivityFiltersReset}
            onRetry={onRetry}
            onLoadMore={onLoadMore}
          />
        ) : null}
      </aside>
    </>
  );
}

function EstimateSheetHeader({
  onExpandAll,
  onCollapseAll,
  onPreviewProposalExport,
  canPreviewProposalExport = false,
  onOpenSheetActivity,
  onOpenNodeActivity,
}: {
  onExpandAll?: () => void;
  onCollapseAll?: () => void;
  onPreviewProposalExport?: () => void;
  canPreviewProposalExport?: boolean;
  onOpenSheetActivity?: (opener: HTMLElement) => void;
  onOpenNodeActivity?: (opener: HTMLElement) => void;
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
            icon: <ClockCounterClockwise size={12} weight="bold" aria-hidden="true" />,
            onClick: onOpenSheetActivity
              ? function openSheetActivity(event?: unknown) {
                const target = event && typeof event === "object" && "currentTarget" in event ? (event as { currentTarget?: EventTarget | null }).currentTarget : null;
                onOpenSheetActivity(target instanceof HTMLElement ? target : document.body);
              }
              : undefined,
            className: "text-tertiary hover:bg-orange-50 hover:text-orange-700 focus-visible:bg-orange-50 focus-visible:text-orange-700",
          },
          {
            label: "Node Activity",
            icon: <FolderSimple size={12} weight="bold" aria-hidden="true" />,
            onClick: onOpenNodeActivity
              ? function openNodeActivity(event?: unknown) {
                const target = event && typeof event === "object" && "currentTarget" in event ? (event as { currentTarget?: EventTarget | null }).currentTarget : null;
                onOpenNodeActivity(target instanceof HTMLElement ? target : document.body);
              }
              : undefined,
            disabled: !onOpenNodeActivity,
            className: "text-tertiary hover:bg-blue-50 hover:text-blue-700 focus-visible:bg-blue-50 focus-visible:text-blue-700",
          },
          {
            label: "Preview Excel Export",
            icon: <FileXls size={12} weight="bold" aria-hidden="true" />,
            onClick: onPreviewProposalExport,
            disabled: !canPreviewProposalExport,
            className: "text-tertiary hover:bg-emerald-50 hover:text-emerald-700 focus-visible:bg-emerald-50 focus-visible:text-emerald-700",
          },
        ]}
      />
    </header>
  );
}

export function EstimateSheetContent({
  selectedNodeId,
  nodes = sampleEstimateTree,
  projectId,
  estimateId,
  proposalExportMetadata,
  renderSidebar = true,
  libraryItems,
  libraryTemplates,
  libraryCategoryTree,
  librarySuppliers,
  libraryBrands,
}: EstimateSheetContentProps) {
  const { selectedNodeId: activeSelectedNodeId, setSelectedNodeId } = useEstimateWorkspaceSelection(estimateId, selectedNodeId);
  const { saveState, markRowDirty, insertRow, replaceRow, deleteRow, updateRow } = useEstimateRowMutations(estimateId);
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
  const [inspector, setInspector] = useState<EstimateInspectorState | null>(null);
  const [activityFilters, setActivityFilters] = useState<ActivityFilterState>(DEFAULT_ACTIVITY_FILTERS);
  const [historyData, setHistoryData] = useState<EstimateSheetVersionControlData | null>(null);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [isHistoryLoadingMore, setIsHistoryLoadingMore] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [historyReloadToken, setHistoryReloadToken] = useState(0);
  const inspectorOpenerRef = useRef<HTMLElement | null>(null);
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
  const inspectorRowId = inspector?.mode === "row" ? inspector.rowId : "";
  const inspectorNodeId = inspector?.mode === "node" ? inspector.nodeId : "";
  const inspectorScopeKey = inspector?.mode === "row" ? `row:${inspector.rowId}` : inspector?.mode === "node" ? `node:${inspector.nodeId}:${inspector.includeDescendants ? "desc" : "direct"}` : inspector?.mode === "sheet" ? "sheet" : "";
  const activityFilterKey = useMemo(() => createActivityFilterKey(activityFilters), [activityFilters]);
  const selectedInspectorRow = useMemo(
    () => currentRows.find((row) => row.item.id === inspectorRowId) ?? null,
    [currentRows, inspectorRowId],
  );
  const selectedInspectorNode = useMemo(
    () => (inspectorNodeId ? findEstimateNode(estimateTree, inspectorNodeId) ?? null : null),
    [estimateTree, inspectorNodeId],
  );
  const selectedInspectorNodePath = useMemo(
    () => (inspectorNodeId ? findNodePath(estimateTree, inspectorNodeId) : []),
    [estimateTree, inspectorNodeId],
  );
  const allNodeIds = useMemo(() => (selectedNode ? collectAllNodeIds([selectedNode]) : []), [selectedNode]);
  const expandAll = useCallback(() => setCollapsedNodeIds(new Set()), []);
  const collapseAll = useCallback(() => setCollapsedNodeIds(new Set(allNodeIds)), [allNodeIds]);
  const setActiveInspector = useCallback((nextInspector: EstimateInspectorState | null) => {
    const nextScopeKey = nextInspector?.mode === "row" ? `row:${nextInspector.rowId}` : nextInspector?.mode === "node" ? `node:${nextInspector.nodeId}:${nextInspector.includeDescendants ? "desc" : "direct"}` : nextInspector?.mode === "sheet" ? "sheet" : "";
    activateHistoryScope(nextScopeKey);
    setInspector(nextInspector);
  }, [activateHistoryScope]);
  const replaceActivityFilters = useCallback((nextFilters: ActivityFilterState) => {
    setActivityFilters(nextFilters);
    if (projectId && estimateId && inspector && inspector.mode !== "row") {
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
  const openRowDetails = useCallback((rowItemId: string, opener: HTMLElement, tab: RowInspectorTab = "history") => {
    inspectorOpenerRef.current = opener;
    if (projectId && estimateId) {
      setIsHistoryLoading(true);
      setIsHistoryLoadingMore(false);
      setHistoryData(null);
      setHistoryError("");
    }
    setActiveInspector({ mode: "row", rowId: rowItemId, tab });
  }, [estimateId, projectId, setActiveInspector]);
  const openVersionHistory = useCallback((opener: HTMLElement) => {
    inspectorOpenerRef.current = opener;
    if (projectId && estimateId) {
      setIsHistoryLoading(true);
      setIsHistoryLoadingMore(false);
      setHistoryData(null);
      setHistoryError("");
    }
    setActiveInspector({ mode: "sheet" });
  }, [estimateId, projectId, setActiveInspector]);
  const openNodeActivity = useCallback((opener: HTMLElement) => {
    if (!resolvedSelectedNodeId) return;
    inspectorOpenerRef.current = opener;
    if (projectId && estimateId) {
      setIsHistoryLoading(true);
      setIsHistoryLoadingMore(false);
      setHistoryData(null);
      setHistoryError("");
    }
    setActiveInspector({
      mode: "node",
      nodeId: resolvedSelectedNodeId,
      includeDescendants: selectedNode?.kind === "group",
    });
  }, [estimateId, projectId, resolvedSelectedNodeId, selectedNode?.kind, setActiveInspector]);
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
      ...(!isRowHistory ? getActivityFilterInput(activityFilters) : {}),
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
        setHistoryError(error instanceof Error ? error.message : "Version history could not load.");
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
      ...(!isRowHistory ? getActivityFilterInput(activityFilters) : {}),
      scope: isRowHistory ? "row" : isNodeHistory ? "node" : "sheet",
    })
      .then((data) => {
        if (!isCurrentHistoryRequest()) return;
        setHistoryData(data);
      })
      .catch((error: unknown) => {
        if (!isCurrentHistoryRequest()) return;
        setHistoryError(error instanceof Error ? error.message : "Version history could not load.");
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
    updateRow({
      projectId,
      estimateId,
      rowId: rowItemId,
      ...(values.quantity !== undefined ? { quantity: parseEditableNumber(values.quantity) } : {}),
      ...(values.contingencyPercentage !== undefined ? { contingencyPercentage: parseContingencyPercentage(values.contingencyPercentage) } : {}),
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
        <EstimateVersionControlInspector
          inspector={inspector}
          selectedRow={selectedInspectorRow}
          selectedNode={selectedInspectorNode}
          selectedNodePath={selectedInspectorNodePath}
          projectTotal={projectTotal}
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
          onInspectorChange={setInspector}
        />
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
              onOpenSheetActivity={openVersionHistory}
              onOpenNodeActivity={resolvedSelectedNodeId ? openNodeActivity : undefined}
            />
            <div className="min-h-0 flex-1 overflow-auto px-2 pb-2">
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
              onOpenSheetActivity={openVersionHistory}
              onOpenNodeActivity={resolvedSelectedNodeId ? openNodeActivity : undefined}
            />
            <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto px-2 pb-2">
              <div className="max-w-md rounded-lg border border-dashed border-hairline bg-surface-muted p-3 text-center">
                <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-tertiary">Empty estimate</p>
                <h2 className="mt-1 text-[12px] font-bold tracking-[-0.02em] text-ink">No estimate tree yet</h2>
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
