"use client";

import { type Dispatch, type DragEvent, type InputHTMLAttributes, type KeyboardEvent, type SetStateAction, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ArrowsOutSimple, CaretDown, Cube, DotsSixVertical, FileXls, FolderSimple, Plus, Trash } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { ControlInput } from "@/components/ui/control-input";
import { HeaderIconToolbar } from "@/components/ui/header-icon-toolbar";
import { SearchInput } from "@/components/ui/search-input";
import { dispatchProjectTotalChange } from "@/components/workshop/ProjectTotalHeader";
import { useEstimateRowMutations } from "@/hooks/use-estimate-row-mutations";
import { useEstimateAreaTreeQuery } from "@/hooks/use-estimate-query";
import { resolveEstimateWorkspaceSelection, useEstimateWorkspaceSelection } from "@/hooks/use-estimate-workspace-state";
import { insertEstimateTemplateIntoEstimate } from "@/lib/estimates/actions";
import { getEstimateNodeDisplayKind } from "@/lib/estimates/tree-hierarchy";
import { buildProposalExportModel } from "@/lib/proposal-export/build-proposal-export-model";
import type { ProposalExportMetadata, ProposalExportModel } from "@/lib/proposal-export/types";
import type { ComponentLibraryTaxonomyNode } from "@/lib/component-library/taxonomy";
import { cn } from "@/lib/ui/cn";
import { EstimateRightSidebar } from "./component-library";
import { CommandPalette } from "./component-library/CommandPalette";
import { ESTIMATE_TEMPLATE_DRAG_MIME_TYPE, type EstimateTemplate } from "./component-library/templates";
import type { ComponentLibrarySupplierOption } from "./component-library/tree/buildLibraryTree";
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
};

const EMPTY_ESTIMATE_TEMPLATES: EstimateTemplate[] = [];

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
  depth?: number;
  usesSiblingGroupRhythm?: boolean;
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
      miscCost: currentRow?.miscCost ?? toEditableNumber(item.miscCost),
      ...patchValue,
    },
  };
}

type EditableRowValue = {
  quantity: string;
  miscCost: string;
};

const BLANK_ESTIMATE_ROW_COMPONENT_LABEL = "Drag or add a component here";
const BLANK_ESTIMATE_ROW_TAG = "manual-row-placeholder";

function parseEditableNumber(value: string) {
  const parsed = Number(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatEditableMoney(value: string) {
  return pesoFormatter.format(parseEditableNumber(value)).replace("₱", "₱ ");
}

function getInitialEditableRow(item: EstimateRowItem): EditableRowValue {
  return {
    quantity: toEditableNumber(item.quantity),
    miscCost: toEditableNumber(item.miscCost),
  };
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
  const miscCost = parseEditableNumber(editableRow.miscCost);
  return item.itemCost * quantity + miscCost;
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
      const miscCost = parseEditableNumber(editableRow.miscCost);
      const subTotal = item.itemCost * quantity;

      return {
        ...item,
        quantity,
        miscCost,
        subTotal,
        totalItemCosts: subTotal + miscCost,
      };
    }),
    children: node.children ? materializeEditableEstimateTree(node.children, editableRows) : node.children,
  }));
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

function getComponentImageUrl(item: EstimateRowItem) {
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

function EstimateMaterialCell({
  item,
  isReplaceTarget,
  onReplaceDragOver,
  onReplaceDragLeave,
  onReplace,
}: {
  item: EstimateRowItem;
  isReplaceTarget: boolean;
  onReplaceDragOver: () => void;
  onReplaceDragLeave: () => void;
  onReplace: (libraryItem: EstimateRowItem) => void;
}) {
  function handleReplacementDragOver(event: DragEvent<HTMLDivElement>) {
    if (event.dataTransfer.types.includes("application/x-archestimator-library-item")) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
      onReplaceDragOver();
    }
  }

  function handleReplacementDrop(event: DragEvent<HTMLDivElement>) {
    const payload = event.dataTransfer.getData("application/x-archestimator-library-item");
    if (!payload) return;
    event.preventDefault();
    event.stopPropagation();
    onReplaceDragLeave();
    onReplace(JSON.parse(payload) as EstimateRowItem);
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
        "group flex h-full cursor-grab flex-col gap-2 overflow-hidden bg-white p-2 transition hover:bg-neutral-50 active:cursor-grabbing",
        isReplaceTarget && "bg-blue-100 ring-2 ring-inset ring-accent",
      )}
      draggable
      onDragOver={handleReplacementDragOver}
      onDragLeave={onReplaceDragLeave}
      onDrop={handleReplacementDrop}
      data-replace-target-active={isReplaceTarget ? "true" : undefined}
      aria-label={`${item.material} replaceable estimate component`}
      title="Drag this source-linked estimate component to move or replace it"
    >
      <div className="flex gap-2">
        <div
          className="size-14 shrink-0 rounded-sm bg-neutral-100 bg-cover bg-center"
          style={{ backgroundImage: `url(${getComponentImageUrl(item)})` }}
          aria-label={`${item.material} reference image`}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="min-w-0">
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
}) {
  const [focusedCell, setFocusedCell] = useState<{ rowId: string; cellIndex: number } | null>(null);
  const [replaceTargetRowId, setReplaceTargetRowId] = useState("");
  const computedRows = useMemo(
    () =>
      items.map((item) => {
        const editableRow = editableRows[item.id] ?? getInitialEditableRow(item);
        const quantity = parseEditableNumber(editableRow.quantity);
        const miscCost = parseEditableNumber(editableRow.miscCost);
        const subTotal = item.itemCost * quantity;
        return {
          ...item,
          editableQuantity: editableRow.quantity,
          editableMiscCost: editableRow.miscCost,
          quantity,
          miscCost,
          subTotal,
          totalItemCosts: subTotal + miscCost,
        };
      }),
    [editableRows, items],
  );

  if (!items.length) return null;

  const rowColumns = "grid-cols-[36px_32px_minmax(160px,1fr)_58px_92px_92px_108px_30px]";

  function handleDragOver(event: DragEvent) {
    if (event.dataTransfer.types.includes("application/x-archestimator-library-item")) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    }
  }

  function handleDrop(event: DragEvent) {
    const payload = event.dataTransfer.getData("application/x-archestimator-library-item");
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
            <th className="flex items-center justify-center border-r border-hairline text-center text-[9px] leading-3">Misc Cost</th>
            <th className="flex items-center justify-center border-r border-hairline text-center text-[9px] leading-3">Total Item Cost</th>
            <th className="flex items-center justify-center">
              <DotsSixVertical size={14} weight="bold" aria-hidden="true" />
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
                        miscCost: item.miscCost,
                      })
                    }
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
                      onUpdateRowItem(item.id, { quantity: item.editableQuantity });
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
                    "flex items-center justify-center border-r border-hairline px-1",
                    activeCellIndex === 1 && "bg-accent/10 ring-1 ring-inset ring-accent/30",
                  )}
                  data-estimate-cell-active={activeCellIndex === 1 ? "true" : undefined}
                >
                  <MoneyInput
                    value={item.editableMiscCost}
                    align="center"
                    onChange={(value) => {
                      setEditableRows((current) => updateEditableRowValue(current, item, { miscCost: value }));
                      onMarkRowDirty(item.id);
                    }}
                    ariaLabel={`${item.material} misc cost`}
                    onFocus={() => setFocusedCell({ rowId: item.id, cellIndex: 1 })}
                    onBlur={() => {
                      setFocusedCell((current) => (current?.rowId === item.id && current.cellIndex === 1 ? null : current));
                      onUpdateRowItem(item.id, { miscCost: item.editableMiscCost });
                    }}
                    onKeyDown={(event) => handleEstimateCellKeyDown(event, rowIndex, 1)}
                    data-estimate-row-index={rowIndex}
                    data-estimate-cell-index={1}
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
                    aria-label={`Drag ${item.material}`}
                  >
                    <DotsSixVertical size={14} weight="bold" aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="size-6 rounded-sm p-0 text-tertiary hover:bg-surfaceMuted hover:text-ink"
                    aria-label={`Expand ${item.material}`}
                  >
                    <ArrowsOutSimple size={14} weight="bold" aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="size-6 rounded-sm p-0 text-tertiary hover:bg-red-50 hover:text-red-700 focus-visible:text-red-700"
                    aria-label={`Delete ${item.material}`}
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
        if (event.dataTransfer.types.includes("application/x-archestimator-library-item")) {
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
        }
      }}
      onDrop={(event) => {
        setDragCount(0);
        const payload = event.dataTransfer.getData("application/x-archestimator-library-item");
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
        if (event.dataTransfer.types.includes("application/x-archestimator-library-item")) {
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
        }
      }}
      onDrop={(event) => {
        setDragCount(0);
        const payload = event.dataTransfer.getData("application/x-archestimator-library-item");
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

function EstimateSheetBranch({ node, nodeCode, ancestorPath = [], editableRows, setEditableRows, onInsertLibraryItem, onInsertTemplate, onAddBlankRow, onReplaceRowItem, onDeleteRowItem, onUpdateRowItem, onMarkRowDirty, depth = 0, usesSiblingGroupRhythm = false }: EstimateSheetBranchProps) {
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
  const miscCost = libraryItem.miscCost ?? 0;
  const subTotal = libraryItem.itemCost * quantity;
  return {
    ...libraryItem,
    id,
    quantity,
    subTotal,
    miscCost,
    totalItemCosts: subTotal + miscCost,
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
  const miscCost = parseEditableNumber(editableRow.miscCost);
  const subTotal = libraryItem.itemCost * quantity;

  return {
    ...libraryItem,
    quantity,
    subTotal,
    miscCost,
    totalItemCosts: subTotal + miscCost,
  };
}

function replaceRowItemWithLibraryItem(rowItemId: string, libraryItem: EstimateRowItem): EstimateRowItem {
  const quantity = libraryItem.quantity || 1;
  const miscCost = libraryItem.miscCost ?? 0;
  const subTotal = libraryItem.itemCost * quantity;
  return {
    ...libraryItem,
    id: rowItemId,
    quantity,
    subTotal,
    miscCost,
    totalItemCosts: subTotal + miscCost,
  };
}

function EstimateSheetHeader({
  onExpandAll,
  onCollapseAll,
  onPreviewProposalExport,
  canPreviewProposalExport = false,
}: {
  onExpandAll?: () => void;
  onCollapseAll?: () => void;
  onPreviewProposalExport?: () => void;
  canPreviewProposalExport?: boolean;
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
            label: "Add sheet",
          },
          {
            label: "Preview Excel Export",
            visibleLabel: "Preview Excel Export",
            icon: <FileXls size={12} weight="bold" aria-hidden="true" />,
            onClick: onPreviewProposalExport,
            disabled: !canPreviewProposalExport,
            className: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 focus-visible:bg-emerald-100 focus-visible:text-emerald-800",
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
  const allNodeIds = useMemo(() => (selectedNode ? collectAllNodeIds([selectedNode]) : []), [selectedNode]);
  const expandAll = useCallback(() => setCollapsedNodeIds(new Set()), []);
  const collapseAll = useCallback(() => setCollapsedNodeIds(new Set(allNodeIds)), [allNodeIds]);
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
          onInsertTemplate={insertTemplateIntoSelectedGroup}
        />
      ) : null}
    </>
  );
}
