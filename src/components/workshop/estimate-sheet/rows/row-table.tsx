"use client";

import { memo, useCallback, useEffect, useMemo, useReducer, useRef, useState, type CSSProperties, type Dispatch, type DragEvent, type KeyboardEvent, type MouseEvent, type RefObject, type SetStateAction } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowsOutSimple, DotsSixVertical, DotsThreeVertical, Trash } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { ControlInput } from "@/components/ui/control-input";
import { Tooltip } from "@/components/ui/overlays/tooltip";
import { SelectionCheckbox } from "@/components/ui/selection-checkbox";
import type { EstimateRowMutationStatus, EstimateRowMutationStatusMap } from "@/hooks/use-estimate-row-mutations";
import { recordExpressComponentEvent } from "@/lib/estimates/express-components-telemetry";
import {
  EMPTY_ESTIMATE_COLUMN_WIDTHS,
  ESTIMATE_COLUMN_TEMPLATE,
  isResizableEstimateColumnId,
  type EstimateColumnId,
  type EstimateColumnWidths,
} from "@/lib/estimate-sheet/column-model";
import { cn } from "@/lib/ui/cn";
import { estimateSurfaceClass } from "../../estimate-surface-class";
import { useEstimateSurfaceVariant } from "../../estimate-surface-variant";
import { WORKSHOP_ESTIMATE_ROW_VIRTUALIZATION } from "@/lib/workshop/virtualization-flags";
import { beginEstimateWorkshopDrag, endEstimateWorkshopDrag } from "../../estimate-workshop-drag";
import { formatPeso, isBlankEstimateRowItem, pesoFormatter, type RowDetailTab } from "../activity-history-model";
import { reportEstimateRowItemRender, reportEstimateRowItemsTableRender } from "../../estimate-sheet-render-probe";
import type { EstimateRowItem } from "../../estimate-tree-data";
import { useEstimateColumnResizeController } from "../columns/use-estimate-column-resize-controller";
import {
  ESTIMATE_ROW_ITEM_DRAG_MIME_TYPE,
  LIBRARY_ITEM_DRAG_MIME_TYPE,
  readEstimateLibraryItemDragPayload,
  readEstimateRowItemDragPayload,
  type EstimateRowItemDragPayload,
} from "./constants";
import { EstimateRowColumnResizeHandle } from "./column-resize-handle";
import { EstimateMaterialCell, MoneyInput, type ExpressInsertDraftState } from "./cells";
import { focusEstimateCellByRowId, handleEstimateCellKeyDown } from "./cells-model";
import { isExpressComponentRow } from "@/lib/estimates/express-components";
import {
  buildEditableQuantityContingencyPatch,
  buildEditableQuantityContingencyPercentagePatch,
  formatSignedEditablePercentage,
  getEditableQuantityInputValue,
  getEditableRowAmounts,
  getInitialEditableRow,
  parseEditableAdjustmentPercentage,
  parseEditableQuantityExpression,
  parseNonNegativeEditableNumber,
  toEditableAdjustmentPercentage,
  toEditableContingencyPercentage,
  updateEditableRowValue,
  type EditableRowValue,
} from "./editable-row-model";

const ESTIMATE_PRIMARY_NUMERIC_CLASS = "!text-[10px] font-medium leading-3 tabular-nums text-ink";
const ESTIMATE_PRIMARY_NUMERIC_INPUT_CLASS =
  "h-5 border-0 bg-transparent p-0 !text-[10px] font-medium leading-3 tabular-nums text-ink shadow-none [appearance:textfield] focus-visible:ring-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";
const ESTIMATE_SECONDARY_NUMERIC_CLASS = "absolute top-1/2 mt-3 max-w-full truncate text-center text-[8px] font-medium leading-[10px] tabular-nums";
const ESTIMATE_CORNER_NUMERIC_CLASS = "absolute top-2 max-w-[calc(100%-8px)] truncate text-[8px] font-medium leading-[10px] tabular-nums text-tertiary";

export type EstimateRowItemsTableProps = {
  canEditEstimate?: boolean;
  items: EstimateRowItem[];
  editableRows: Record<string, EditableRowValue>;
  setEditableRows: Dispatch<SetStateAction<Record<string, EditableRowValue>>>;
  projectId?: string;
  estimateId?: string;
  targetNodeId: string;
  onInsertLibraryItem: (targetNodeId: string, libraryItem: EstimateRowItem) => void;
  onReplaceRowItem: (rowItemId: string, libraryItem: EstimateRowItem) => void;
  onDeleteRowItem: (rowItemId: string) => void;
  onUpdateRowItem: (rowItemId: string, values: Partial<EditableRowValue>) => void;
  onMarkRowDirty: (rowItemId: string) => void;
  onOpenRowDetails: (rowItemId: string, opener: HTMLElement, tab?: RowDetailTab) => void;
  onClearRowComponent: (rowItemId: string) => void;
  onRequestProjectSpecific: (rowItemId: string) => void;
  onPromoteRowToLibrary: (rowItemId: string) => void;
  promotingRowId?: string | null;
  rowMutationStatuses?: EstimateRowMutationStatusMap;
  onMoveRowComponent: (sourceRowItemId: string, targetRowItemId: string, movedItem: EstimateRowItem) => void;
  onMoveRowItem: (rowItemId: string, targetNodeId: string, targetIndex: number) => void;
  onOpenMoveRowItemDialog?: (rowItemId: string, opener: HTMLElement) => void;
  onOpenReplaceComponentPicker?: (rowItemId: string, opener: HTMLElement) => void;
  onOpenMoveComponentPicker?: (rowItemId: string, opener: HTMLElement) => void;
  expressInsertDraftStates?: Record<string, ExpressInsertDraftState>;
  onRetryExpressDraft?: (rowItemId: string) => void;
  onDeleteExpressDraft?: (rowItemId: string) => void;
  selectedRowIds: ReadonlySet<string>;
  onToggleRowSelection: (rowItemId: string, checked: boolean) => void;
  onToggleRowsSelection: (rowItemIds: string[], checked: boolean) => void;
  columnResize?: EstimateTableColumnResizeConfig;
  virtualization?: {
    enabled?: boolean;
    minRows?: number;
    estimateRowHeight?: number;
    overscan?: number;
    useFlushSync?: boolean;
    initialViewportHeight?: number;
  };
};

export type EstimateTableColumnResizeConfig = {
  surfaceRef: RefObject<HTMLElement | null>;
  widths: EstimateColumnWidths;
  onCommitWidths: (widths: EstimateColumnWidths) => void;
  onResetWidths: () => void;
};

// The comparator slices shared sheet state per table: a keystroke in one
// area's table must not re-render every other table. Callback props must be
// identity-stable (useStableCallback in EstimateSheetContent) — a changed
// callback identity forces a re-render to avoid stale closures.
function areEstimateRowItemsTablePropsEqual(prev: EstimateRowItemsTableProps, next: EstimateRowItemsTableProps) {
  if (
    prev.items !== next.items ||
    prev.canEditEstimate !== next.canEditEstimate ||
    prev.projectId !== next.projectId ||
    prev.estimateId !== next.estimateId ||
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
    prev.onPromoteRowToLibrary !== next.onPromoteRowToLibrary ||
    prev.promotingRowId !== next.promotingRowId ||
    prev.rowMutationStatuses !== next.rowMutationStatuses ||
    prev.onMoveRowComponent !== next.onMoveRowComponent ||
    prev.onMoveRowItem !== next.onMoveRowItem ||
    prev.onOpenMoveRowItemDialog !== next.onOpenMoveRowItemDialog ||
    prev.onOpenReplaceComponentPicker !== next.onOpenReplaceComponentPicker ||
    prev.onOpenMoveComponentPicker !== next.onOpenMoveComponentPicker ||
    prev.expressInsertDraftStates !== next.expressInsertDraftStates ||
    prev.onRetryExpressDraft !== next.onRetryExpressDraft ||
    prev.onDeleteExpressDraft !== next.onDeleteExpressDraft ||
    prev.onToggleRowSelection !== next.onToggleRowSelection ||
    prev.onToggleRowsSelection !== next.onToggleRowsSelection ||
    prev.virtualization !== next.virtualization
  ) {
    return false;
  }
  for (const item of next.items) {
    if (prev.editableRows[item.id] !== next.editableRows[item.id]) return false;
    if (prev.selectedRowIds.has(item.id) !== next.selectedRowIds.has(item.id)) return false;
    if (prev.rowMutationStatuses?.[item.id] !== next.rowMutationStatuses?.[item.id]) return false;
  }
  return true;
}

const noopExpressDraftHandler = () => undefined;
const noopCommitWidths = () => undefined;
const ESTIMATE_ROW_DELETE_RECOVERY_TOOLTIP = "Delete row. Undo after saving can restore it.";

type FocusedEstimateCell = { rowId: string; cellIndex: number };
type ScrollMarginAction = { type: "reset" } | { type: "measure"; value: number };

function formatCompactNumber(value: number) {
  if (!Number.isFinite(value)) return "0";
  return String(Number(value.toFixed(6)));
}

function formatSignedCompactNumber(value: number) {
  if (value === 0) return "0";
  const magnitude = formatCompactNumber(Math.abs(value));
  return value > 0 ? `+${magnitude}` : `-${magnitude}`;
}

function formatModePercentageInput(mode: "contingency" | "discount", value: string) {
  const trimmedValue = value.trim();
  if (trimmedValue === "") return mode === "discount" ? "-" : "";
  const unsignedValue = trimmedValue.replace(/^[+-]/, "");
  const parsedValue = parseNonNegativeEditableNumber(unsignedValue);
  if (parsedValue === 0 && !/[1-9]/.test(unsignedValue)) return unsignedValue || "0";
  return `${mode === "discount" ? "-" : "+"}${unsignedValue}`;
}

function formatSignedPercentageInput(value: string) {
  const trimmedValue = value.trim();
  if (trimmedValue === "" || trimmedValue === "-" || trimmedValue === "+") return trimmedValue;
  return formatSignedEditablePercentage(trimmedValue);
}

function normalizeSignedPercentageDraft(value: string) {
  const trimmedValue = value.trim();
  if (trimmedValue === "" || trimmedValue === "-" || trimmedValue === "+") return trimmedValue;
  const unsignedValue = trimmedValue.replace(/[+-]/g, "");
  if (trimmedValue.includes("-")) return unsignedValue ? `-${unsignedValue}` : "-";
  if (trimmedValue.includes("+")) return unsignedValue ? `+${unsignedValue}` : "+";
  return trimmedValue;
}

function readSignedPercentageDraft(value: string) {
  const trimmedValue = normalizeSignedPercentageDraft(value);
  const signedPercentage = parseEditableAdjustmentPercentage(trimmedValue);
  const isNegative = signedPercentage < 0 || trimmedValue.startsWith("-");
  return {
    mode: isNegative ? "discount" as const : "contingency" as const,
    percentage: trimmedValue.replace(/^[+-]/, ""),
  };
}

function scrollMarginReducer(current: number, action: ScrollMarginAction) {
  if (action.type === "reset") return 0;
  return Math.abs(current - action.value) < 0.5 ? current : action.value;
}

function handleSelectionCheckboxKeyDown(event: KeyboardEvent<HTMLInputElement>, onToggle: () => void) {
  if (event.key !== " " && event.key !== "Enter") return;
  event.preventDefault();
  event.stopPropagation();
  onToggle();
}

function findScrollParent(element: HTMLElement | null): HTMLElement | null {
  let parent = element?.parentElement ?? null;
  while (parent) {
    const style = window.getComputedStyle(parent);
    if (/(auto|scroll|overlay)/.test(`${style.overflow}${style.overflowY}${style.overflowX}`)) return parent;
    parent = parent.parentElement;
  }
  return element;
}

function getEstimateRowDropEdge(event: DragEvent<HTMLTableRowElement>) {
  const rect = event.currentTarget.getBoundingClientRect();
  return event.clientY < rect.top + rect.height / 2 ? "before" : "after";
}

type EstimateRowItemTableRowProps = {
  canEditEstimate: boolean;
  item: EstimateRowItem;
  editableRow: EditableRowValue | undefined;
  projectId?: string;
  estimateId?: string;
  rowIndex: number;
  selected: boolean;
  activeCellIndex: number | null;
  isReplaceTarget: boolean;
  setEditableRows: Dispatch<SetStateAction<Record<string, EditableRowValue>>>;
  setFocusedCell: Dispatch<SetStateAction<FocusedEstimateCell | null>>;
  setReplaceTargetRowId: Dispatch<SetStateAction<string>>;
  onReplaceRowItem: (rowItemId: string, libraryItem: EstimateRowItem) => void;
  onDeleteRowItem: (rowItemId: string) => void;
  onUpdateRowItem: (rowItemId: string, values: Partial<EditableRowValue>) => void;
  onMarkRowDirty: (rowItemId: string) => void;
  onOpenRowDetails: (rowItemId: string, opener: HTMLElement, tab?: RowDetailTab) => void;
  onClearRowComponent: (rowItemId: string) => void;
  onRequestProjectSpecific: (rowItemId: string) => void;
  onPromoteRowToLibrary: (rowItemId: string) => void;
  promotingRowId?: string | null;
  rowMutationStatus?: EstimateRowMutationStatus;
  onMoveRowComponent: (sourceRowItemId: string, targetRowItemId: string, movedItem: EstimateRowItem) => void;
  onMoveRowItem: (rowItemId: string, targetNodeId: string, targetIndex: number) => void;
  onOpenMoveRowItemDialog?: (rowItemId: string, opener: HTMLElement) => void;
  onOpenReplaceComponentPicker?: (rowItemId: string, opener: HTMLElement) => void;
  onOpenMoveComponentPicker?: (rowItemId: string, opener: HTMLElement) => void;
  expressDraftState?: ExpressInsertDraftState;
  onRetryExpressDraft: (rowItemId: string) => void;
  onDeleteExpressDraft: (rowItemId: string) => void;
  onToggleRowSelection: (rowItemId: string, checked: boolean) => void;
  targetNodeId: string;
  rowIds: readonly string[];
  onRequestFocusByRowId: (rowId: string, cellIndex: number) => void;
  onExpressEditorActiveChange: (rowId: string, active: boolean) => void;
  style?: CSSProperties;
};

const EstimateRowItemTableRow = memo(function EstimateRowItemTableRow({
  canEditEstimate,
  item,
  editableRow,
  projectId,
  estimateId,
  rowIndex,
  selected,
  activeCellIndex,
  isReplaceTarget,
  setEditableRows,
  setFocusedCell,
  setReplaceTargetRowId,
  onReplaceRowItem,
  onDeleteRowItem,
  onUpdateRowItem,
  onMarkRowDirty,
  onOpenRowDetails,
  onClearRowComponent,
  onRequestProjectSpecific,
  onPromoteRowToLibrary,
  promotingRowId,
  rowMutationStatus,
  onMoveRowComponent,
  onMoveRowItem,
  onOpenMoveRowItemDialog,
  onOpenReplaceComponentPicker,
  onOpenMoveComponentPicker,
  expressDraftState,
  onRetryExpressDraft,
  onDeleteExpressDraft,
  onToggleRowSelection,
  targetNodeId,
  rowIds,
  onRequestFocusByRowId,
  onExpressEditorActiveChange,
  style,
}: EstimateRowItemTableRowProps) {
  reportEstimateRowItemRender(item.id);
  const isInlineEditableComponentRow = isExpressComponentRow(item) || isBlankEstimateRowItem(item);
  const [quantityBreakdownOpen, setQuantityBreakdownOpen] = useState(false);
  const computedItem = useMemo(() => {
    const resolvedEditableRow = editableRow ?? getInitialEditableRow(item);
    const amountEditableRow = isInlineEditableComponentRow ? resolvedEditableRow : { ...resolvedEditableRow, unitCost: String(item.itemCost) };
    const amounts = getEditableRowAmounts(item, amountEditableRow);
    return {
      ...item,
      itemCost: amounts.itemCost,
      storedQuantity: item.quantity,
      storedQuantityBase: item.quantityBase ?? null,
      storedQuantityContingencyAmount: item.quantityContingencyAmount ?? null,
      storedMaterial: item.material,
      storedDescription: item.description,
      storedSupplier: item.supplier,
      storedUnit: item.unit,
      storedUnitCost: item.itemCost,
      editableName: resolvedEditableRow.name,
      editableDescription: resolvedEditableRow.description,
      editableSupplier: resolvedEditableRow.supplier,
      editableUnit: resolvedEditableRow.unit,
      editableUnitCost: resolvedEditableRow.unitCost,
      editableImageUrl: resolvedEditableRow.imageUrl,
      editableSourceUrl: resolvedEditableRow.sourceUrl,
      storedMiscCost: item.miscCost,
      editableQuantity: resolvedEditableRow.quantity,
      editableQuantityExpression: resolvedEditableRow.quantityExpression,
      editableQuantityBase: resolvedEditableRow.quantityBase,
      editableQuantityContingencyAmount: resolvedEditableRow.quantityContingencyAmount,
      editableQuantityInput: getEditableQuantityInputValue(resolvedEditableRow),
      editableContingencyMode: resolvedEditableRow.contingencyMode,
      editableContingencyPercentage: resolvedEditableRow.contingencyPercentage,
      storedAdjustmentPercentage: item.adjustmentPercentage ?? (item.quantityBase === null || item.quantityBase === undefined ? item.contingencyPercentage ?? 0 : 0),
      editableAdjustmentPercentage: resolvedEditableRow.adjustmentPercentage,
      editableMiscCost: resolvedEditableRow.miscCost,
      quantity: amounts.quantity,
      quantityBase: amounts.quantityBase,
      quantityContingencyAmount: amounts.quantityContingencyAmount,
      contingencyPercentage: amounts.contingencyPercentage,
      contingencyValue: amounts.contingencyValue,
      adjustmentPercentage: amounts.adjustmentPercentage,
      adjustmentValue: amounts.adjustmentValue,
      miscCost: amounts.miscCost,
      subTotal: amounts.subTotal,
      totalItemCosts: amounts.totalItemCosts,
      isQuantityContingency: amounts.isQuantityContingency,
    };
  }, [editableRow, isInlineEditableComponentRow, item]);
  const resolvedEditableRow = editableRow ?? getInitialEditableRow(item);
  const computedItemLabel = isInlineEditableComponentRow
    ? computedItem.editableName || "Project Component"
    : computedItem.material || "component";
  const editableContingencyColumnPercentage = formatModePercentageInput(resolvedEditableRow.contingencyMode, resolvedEditableRow.contingencyPercentage);
  const editableAdjustmentColumnPercentage = formatSignedPercentageInput(resolvedEditableRow.adjustmentPercentage);
  const rowContingencyQuantity = computedItem.quantityContingencyAmount ?? 0;
  const rowAdjustmentValue = computedItem.adjustmentValue;
  const quantityCellFocused = activeCellIndex === 0;
  const quantityHasContingency = computedItem.quantityContingencyAmount !== null && computedItem.quantityContingencyAmount !== 0;
  const quantityDisplayValue = quantityCellFocused ? computedItem.editableQuantityInput : formatCompactNumber(computedItem.quantity);
  const [rowDropEdge, setRowDropEdge] = useState<"before" | "after" | null>(null);
  const rowMutationPending = rowMutationStatus?.phase === "pending";

  function handleRowItemDragStart(event: DragEvent<HTMLButtonElement>) {
    if (!canEditEstimate) return;
    const payload: EstimateRowItemDragPayload = {
      rowItemId: computedItem.id,
      sourceNodeId: targetNodeId,
      label: computedItemLabel,
    };
    event.stopPropagation();
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(ESTIMATE_ROW_ITEM_DRAG_MIME_TYPE, JSON.stringify(payload));
    event.dataTransfer.setData("text/plain", computedItemLabel);
    beginEstimateWorkshopDrag({
      kind: "estimate-row-item",
      rowItemId: computedItem.id,
      rowLabel: computedItemLabel,
      sourceNodeId: targetNodeId,
    });
  }

  function handleRowItemDragOver(event: DragEvent<HTMLTableRowElement>) {
    if (!canEditEstimate) return;
    if (!event.dataTransfer.types.includes(ESTIMATE_ROW_ITEM_DRAG_MIME_TYPE)) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "move";
    setRowDropEdge(getEstimateRowDropEdge(event));
  }

  function handleRowItemDrop(event: DragEvent<HTMLTableRowElement>) {
    if (!canEditEstimate) return;
    const payload = readEstimateRowItemDragPayload(event.dataTransfer.getData(ESTIMATE_ROW_ITEM_DRAG_MIME_TYPE));
    const targetEdge = getEstimateRowDropEdge(event);
    setRowDropEdge(null);
    if (!payload) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "move";
    endEstimateWorkshopDrag();
    onMoveRowItem(payload.rowItemId, targetNodeId, targetEdge === "after" ? rowIndex + 1 : rowIndex);
  }

  function updateExpressEditableRow(values: Partial<EditableRowValue>) {
    if (!canEditEstimate) return;
    setEditableRows((current) => updateEditableRowValue(current, item, values));
    onMarkRowDirty(item.id);
  }

  function commitExpressFields(values: Partial<EditableRowValue>) {
    if (!canEditEstimate) return;
    const nextValues = { ...resolvedEditableRow, ...values };
    const patch: Partial<EditableRowValue> = {};
    if (values.name !== undefined && nextValues.name !== item.material) patch.name = nextValues.name;
    if (values.description !== undefined && nextValues.description !== item.description) patch.description = nextValues.description;
    if (values.supplier !== undefined && nextValues.supplier !== item.supplier) patch.supplier = nextValues.supplier;
    if (values.unit !== undefined && nextValues.unit !== item.unit) patch.unit = nextValues.unit;
    if (values.unitCost !== undefined && parseNonNegativeEditableNumber(nextValues.unitCost) !== item.itemCost) patch.unitCost = nextValues.unitCost;
    if (values.imageUrl !== undefined && nextValues.imageUrl !== (item.imageUrl ?? "")) patch.imageUrl = nextValues.imageUrl;
    if (values.imageAsset !== undefined) patch.imageAsset = values.imageAsset;
    if (values.sourceUrl !== undefined && nextValues.sourceUrl !== (item.sourceUrl ?? "")) patch.sourceUrl = nextValues.sourceUrl;
    if (Object.keys(patch).length > 0) onUpdateRowItem(item.id, patch);
  }

  function updateQuantityFields(values: Partial<EditableRowValue>) {
    if (!canEditEstimate) return;
    setEditableRows((current) => updateEditableRowValue(current, computedItem, values));
    onMarkRowDirty(computedItem.id);
  }

  function updateQuantityDraft(value: string) {
    if (!canEditEstimate) return;
    const parsed = parseEditableQuantityExpression(item, value);
    if (parsed.ok) updateQuantityFields(parsed.patch);
    else updateQuantityFields({ quantityExpression: value });
  }

  function commitQuantityFields(values: Partial<EditableRowValue>) {
    if (!canEditEstimate) return;
    const nextRow = { ...resolvedEditableRow, ...values };
    const nextAmounts = getEditableRowAmounts(item, nextRow);
    const didQuantityChange = nextAmounts.quantity !== computedItem.storedQuantity
      || nextAmounts.quantityBase !== computedItem.storedQuantityBase
      || nextAmounts.quantityContingencyAmount !== computedItem.storedQuantityContingencyAmount;
    if (!didQuantityChange) return;
    onUpdateRowItem(computedItem.id, {
      quantity: String(nextAmounts.quantity),
      quantityExpression: nextRow.quantityExpression,
      quantityBase: nextAmounts.quantityBase === null ? "" : String(nextAmounts.quantityBase),
      quantityContingencyAmount: nextAmounts.quantityContingencyAmount === null ? "" : String(nextAmounts.quantityContingencyAmount),
      contingencyMode: nextAmounts.contingencyPercentage < 0 ? "discount" : "contingency",
      contingencyPercentage: toEditableContingencyPercentage(nextAmounts.contingencyPercentage),
    });
  }

  function updateQuantityBreakdown(field: "base" | "contingency", value: string) {
    if (!canEditEstimate) return;
    const patch = buildEditableQuantityContingencyPatch(
      field === "base" ? value : computedItem.editableQuantityBase,
      field === "contingency" ? value : computedItem.editableQuantityContingencyAmount,
    );
    updateQuantityFields(patch);
  }

  function updateContingencyPercentageDraft(value: string) {
    if (!canEditEstimate) return;
    const draft = readSignedPercentageDraft(value);
    setEditableRows((current) => updateEditableRowValue(current, computedItem, {
      contingencyMode: draft.mode,
      contingencyPercentage: draft.percentage,
    }));
    onMarkRowDirty(computedItem.id);
  }

  function updateAdjustmentPercentageDraft(value: string) {
    if (!canEditEstimate) return;
    setEditableRows((current) => updateEditableRowValue(current, computedItem, {
      adjustmentPercentage: normalizeSignedPercentageDraft(value),
    }));
    onMarkRowDirty(computedItem.id);
  }

  function commitRowAdjustmentPercentage(sourceValue: string) {
    if (!canEditEstimate) return;
    const nextAdjustmentPercentage = toEditableAdjustmentPercentage(parseEditableAdjustmentPercentage(normalizeSignedPercentageDraft(sourceValue)));
    setEditableRows((current) => updateEditableRowValue(current, computedItem, {
      adjustmentPercentage: nextAdjustmentPercentage,
    }));
    if (parseEditableAdjustmentPercentage(nextAdjustmentPercentage) === computedItem.storedAdjustmentPercentage) return;
    onUpdateRowItem(computedItem.id, {
      adjustmentPercentage: nextAdjustmentPercentage,
    });
  }

  function commitContingencyPercentage(sourceValue: string) {
    if (!canEditEstimate) return;
    if (!computedItem.isQuantityContingency && parseEditableAdjustmentPercentage(sourceValue) === 0) {
      setEditableRows((current) => updateEditableRowValue(current, computedItem, {
        contingencyMode: "contingency",
        contingencyPercentage: "0",
      }));
      return;
    }
    const baseQuantityValue = computedItem.editableQuantityBase || computedItem.editableQuantity;
    const patch = buildEditableQuantityContingencyPercentagePatch(baseQuantityValue, sourceValue);
    setEditableRows((current) => updateEditableRowValue(current, computedItem, patch));
    commitQuantityFields(patch);
  }


  return (
    <tr
      className={cn(
        "group/estimate-row grid min-h-24 border-b border-hairline/70 last:border-b-0 hover:bg-neutral-50",
        !isInlineEditableComponentRow && "[contain-intrinsic-size:96px] [content-visibility:auto]",
        activeCellIndex !== null && "bg-[#F6FAFF] shadow-[inset_2px_0_0_rgba(37,99,235,0.70)]",
        rowDropEdge === "before" && "shadow-[inset_0_2px_0_rgba(37,99,235,0.85)]",
        rowDropEdge === "after" && "shadow-[inset_0_-2px_0_rgba(37,99,235,0.85)]",
      )}
      style={{ ...style, gridTemplateColumns: ESTIMATE_COLUMN_TEMPLATE }}
      data-estimate-row-active={activeCellIndex !== null ? "true" : undefined}
      data-estimate-row-id={computedItem.id}
      data-estimate-row-drop-edge={rowDropEdge ?? undefined}
      data-estimate-row-mutation-status={rowMutationStatus?.phase}
      aria-busy={rowMutationPending ? true : undefined}
      onDragOver={canEditEstimate ? handleRowItemDragOver : undefined}
      onDragLeave={canEditEstimate ? () => setRowDropEdge(null) : undefined}
      onDrop={canEditEstimate ? handleRowItemDrop : undefined}
    >
      <td className="relative flex items-center justify-center border-r border-hairline text-[9px] font-sans tabular-nums text-tertiary">
        {String(rowIndex + 1).padStart(2, "0")}
        {rowMutationStatus ? (
          <output className="sr-only" aria-label={`${computedItemLabel} mutation status`}>
            {rowMutationStatus.label}
          </output>
        ) : null}
      </td>
      <td className="relative flex flex-col items-center justify-center gap-1 border-r border-hairline py-1 text-tertiary" data-estimate-row-select-cell="">
        {canEditEstimate && onOpenMoveRowItemDialog ? (
          <Tooltip label="Move row" side="right" contentClassName="z-[1200]">
            <button
              type="button"
              draggable
              className="grid size-5 cursor-grab place-items-center rounded-xs text-tertiary opacity-0 transition hover:bg-surfaceMuted hover:text-ink hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-focus/50 active:cursor-grabbing group-hover/estimate-row:opacity-100 group-focus-within/estimate-row:opacity-100"
              aria-label={`Move row ${computedItemLabel}`}
              aria-haspopup="dialog"
              data-estimate-row-drag-handle=""
              onDragStart={handleRowItemDragStart}
              onClick={(event) => onOpenMoveRowItemDialog(computedItem.id, event.currentTarget)}
            >
              <DotsSixVertical size={14} weight="regular" aria-hidden="true" />
            </button>
          </Tooltip>
        ) : (
          <span className="size-5" aria-hidden="true" />
        )}
        {canEditEstimate ? (
          <SelectionCheckbox
            checked={selected}
            ariaLabel={`Select ${computedItemLabel}`}
            tabIndex={0}
            uncheckedRevealClassName="group-hover/estimate-row:opacity-100 group-focus-within/estimate-row:opacity-100"
            onClick={(event) => {
              event.stopPropagation();
              onToggleRowSelection(computedItem.id, !selected);
            }}
            onKeyDown={(event) => handleSelectionCheckboxKeyDown(event, () => onToggleRowSelection(computedItem.id, !selected))}
          />
        ) : (
          <span className="size-5" aria-hidden="true" />
        )}
      </td>
      <td className="min-w-0 border-r border-hairline">
        <EstimateMaterialCell
          canEditEstimate={canEditEstimate}
          item={computedItem}
          editableRow={resolvedEditableRow}
          projectId={projectId}
          estimateId={estimateId}
          isReplaceTarget={isReplaceTarget}
          onExpressEditorActiveChange={(active) => onExpressEditorActiveChange(computedItem.id, active)}
          onExpressFieldChange={updateExpressEditableRow}
          onExpressFieldCommit={commitExpressFields}
          onExpressFieldRevert={(field) => {
            const initialRow = getInitialEditableRow(item);
            setEditableRows((current) => updateEditableRowValue(current, item, { [field]: initialRow[field] }));
            onExpressEditorActiveChange(computedItem.id, false);
          }}
          onReplaceDragOver={() => setReplaceTargetRowId(computedItem.id)}
          onReplaceDragLeave={() => setReplaceTargetRowId((current) => (current === computedItem.id ? "" : current))}
          onReplace={(libraryItem) =>
            onReplaceRowItem(computedItem.id, {
              ...libraryItem,
              quantity: computedItem.quantity,
              quantityBase: computedItem.quantityBase,
              quantityContingencyAmount: computedItem.quantityContingencyAmount,
              contingencyPercentage: computedItem.contingencyPercentage,
              contingencyValue: computedItem.contingencyValue,
              adjustmentPercentage: computedItem.adjustmentPercentage,
              adjustmentValue: computedItem.adjustmentValue,
              miscCost: computedItem.miscCost,
            })
          }
          onClearComponent={() => {
            if (isInlineEditableComponentRow) onDeleteRowItem(computedItem.id);
            else onClearRowComponent(computedItem.id);
          }}
          onRequestProjectSpecific={() => onRequestProjectSpecific(computedItem.id)}
          onPromoteToLibrary={() => onPromoteRowToLibrary(computedItem.id)}
          promoteToLibraryPending={promotingRowId === computedItem.id}
          onMoveComponent={onMoveRowComponent}
          onOpenReplacePicker={onOpenReplaceComponentPicker ? (opener) => onOpenReplaceComponentPicker(computedItem.id, opener) : undefined}
          onOpenMovePicker={onOpenMoveComponentPicker ? (opener) => onOpenMoveComponentPicker(computedItem.id, opener) : undefined}
          onOpenComponentDetails={(opener) => onOpenRowDetails(computedItem.id, opener, "component")}
          expressDraftState={expressDraftState}
          onRetryExpressDraft={() => onRetryExpressDraft(computedItem.id)}
          onDeleteExpressDraft={() => onDeleteExpressDraft(computedItem.id)}
        />
      </td>
      <td
        className={cn(
          "relative flex flex-col items-center justify-center border-r border-hairline px-1 text-center",
          activeCellIndex === 0 && "ring-1 ring-inset ring-accent/30",
        )}
        data-estimate-cell-active={activeCellIndex === 0 ? "true" : undefined}
      >
        <ControlInput
          type="text"
          inputMode="decimal"
          value={quantityDisplayValue}
          disabled={!canEditEstimate}
          onChange={(event) => {
            updateQuantityDraft(event.target.value);
          }}
          onFocus={() => setFocusedCell({ rowId: computedItem.id, cellIndex: 0 })}
          onBlur={(event) => {
            setFocusedCell((current) => (current?.rowId === computedItem.id && current.cellIndex === 0 ? null : current));
            const parsed = parseEditableQuantityExpression(item, event.currentTarget.value);
            if (!parsed.ok) {
              const initialRow = getInitialEditableRow(item);
              updateQuantityFields({
                quantity: initialRow.quantity,
                quantityExpression: initialRow.quantityExpression,
                quantityBase: initialRow.quantityBase,
                quantityContingencyAmount: initialRow.quantityContingencyAmount,
                contingencyMode: initialRow.contingencyMode,
                contingencyPercentage: initialRow.contingencyPercentage,
              });
              return;
            }
            updateQuantityFields(parsed.patch);
            commitQuantityFields(parsed.patch);
          }}
          onKeyDown={(event) => handleEstimateCellKeyDown(event, rowIndex, 0, rowIds, onRequestFocusByRowId)}
          data-estimate-row-index={rowIndex}
          data-estimate-row-id={computedItem.id}
          data-estimate-cell-index={0}
          aria-label={`${computedItemLabel} quantity`}
          align="center"
          className={ESTIMATE_PRIMARY_NUMERIC_CLASS}
        />
        {quantityHasContingency ? (
          <dl
            className="absolute left-1 top-2 grid max-w-[calc(100%-32px)] grid-cols-[auto_auto] gap-x-1 gap-y-0.5 text-[8px] font-medium leading-[10px] text-tertiary"
            aria-label={`${computedItemLabel} quantity breakdown`}
          >
            <dt>Value</dt>
            <dd className="min-w-4 text-right tabular-nums text-ink">{formatCompactNumber(computedItem.quantityBase ?? 0)}</dd>
            <dt>Contingency</dt>
            <dd className="min-w-4 text-right tabular-nums text-ink">{formatCompactNumber(computedItem.quantityContingencyAmount ?? 0)}</dd>
          </dl>
        ) : null}
        {quantityHasContingency ? (
          <button
            type="button"
            disabled={!canEditEstimate}
            className={cn(
              ESTIMATE_CORNER_NUMERIC_CLASS,
              "right-1 rounded-none border-0 bg-transparent p-0 text-right hover:text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/40 disabled:cursor-default disabled:opacity-70",
              quantityBreakdownOpen && "text-ink",
            )}
            aria-label={`${computedItemLabel} quantity adjustment breakdown`}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => setQuantityBreakdownOpen((current) => !current)}
          >
            {formatSignedCompactNumber(computedItem.quantityContingencyAmount ?? 0)} ({formatSignedEditablePercentage(computedItem.contingencyPercentage)}%)
          </button>
        ) : null}
        {quantityBreakdownOpen ? (
          <div className="absolute left-1 top-8 z-20 grid w-40 grid-cols-2 gap-1 rounded-xs border border-hairline bg-white p-1 shadow-lg">
            <ControlInput
              type="number"
              min="0"
              step="0.01"
              value={computedItem.editableQuantityBase}
              disabled={!canEditEstimate}
              aria-label={`${computedItemLabel} base quantity`}
              align="center"
              className="h-6 text-[10px] tabular-nums"
              onChange={(event) => updateQuantityBreakdown("base", event.target.value)}
              onBlur={(event) => commitQuantityFields(buildEditableQuantityContingencyPatch(event.currentTarget.value, computedItem.editableQuantityContingencyAmount))}
            />
            <ControlInput
              type="text"
              inputMode="decimal"
              step="0.01"
              value={computedItem.editableQuantityContingencyAmount}
              disabled={!canEditEstimate}
              aria-label={`${computedItemLabel} quantity adjustment`}
              align="center"
              className="h-6 text-[10px] tabular-nums"
              onChange={(event) => updateQuantityBreakdown("contingency", event.target.value)}
              onBlur={(event) => commitQuantityFields(buildEditableQuantityContingencyPatch(computedItem.editableQuantityBase, event.currentTarget.value))}
            />
          </div>
        ) : null}
        <p className="absolute top-18 right-1 text-[10px] font-medium leading-3 text-tertiary">/ {computedItem.unit}</p>
      </td>
      <td
        className={cn(
          "relative flex items-center justify-center border-r border-hairline px-1 py-1 text-center",
          activeCellIndex === 1 && "ring-1 ring-inset ring-accent/30",
        )}
        data-estimate-cell-active={activeCellIndex === 1 ? "true" : undefined}
      >
        <div className="relative grid h-full w-full min-w-0 place-items-center">
          <div className="flex h-5 items-baseline justify-center leading-none">
            <ControlInput
              type="text"
              inputMode="decimal"
              step="0.01"
              value={editableContingencyColumnPercentage}
              disabled={!canEditEstimate}
              onChange={(event) => updateContingencyPercentageDraft(event.target.value)}
              onFocus={() => setFocusedCell({ rowId: computedItem.id, cellIndex: 1 })}
              onBlur={(event) => {
                setFocusedCell((current) => (current?.rowId === computedItem.id && current.cellIndex === 1 ? null : current));
                commitContingencyPercentage(event.currentTarget.value);
              }}
              onKeyDown={(event) => handleEstimateCellKeyDown(event, rowIndex, 1, rowIds, onRequestFocusByRowId)}
              data-estimate-row-index={rowIndex}
              data-estimate-row-id={computedItem.id}
              data-estimate-cell-index={1}
              aria-label={`${computedItemLabel} contingency percentage`}
              align="center"
              className={cn(ESTIMATE_PRIMARY_NUMERIC_INPUT_CLASS, "w-10 text-right")}
            />
            <span className={ESTIMATE_PRIMARY_NUMERIC_CLASS} aria-hidden="true">%</span>
          </div>
          <p className={cn(ESTIMATE_CORNER_NUMERIC_CLASS, "right-1 text-right", rowContingencyQuantity < 0 ? "text-danger" : "text-tertiary")}>
            {formatSignedCompactNumber(rowContingencyQuantity)} {computedItem.unit}
          </p>
        </div>
      </td>
      <td className="flex items-center justify-center border-r border-hairline px-1 text-center">
        <p className={ESTIMATE_PRIMARY_NUMERIC_CLASS}>{pesoFormatter.format(computedItem.subTotal).replace("₱", "₱ ")}</p>
      </td>
      <td
        className={cn(
          "relative flex items-center justify-center border-r border-hairline px-1 py-1 text-center",
          activeCellIndex === 2 && "ring-1 ring-inset ring-accent/30",
        )}
        data-estimate-cell-active={activeCellIndex === 2 ? "true" : undefined}
      >
        <div className="relative grid h-full w-full min-w-0 place-items-center">
          <div className="flex h-5 items-baseline justify-center leading-none">
            <ControlInput
              type="text"
              inputMode="decimal"
              step="0.01"
              value={editableAdjustmentColumnPercentage}
              disabled={!canEditEstimate}
              onChange={(event) => updateAdjustmentPercentageDraft(event.target.value)}
              onFocus={() => setFocusedCell({ rowId: computedItem.id, cellIndex: 2 })}
              onBlur={(event) => {
                setFocusedCell((current) => (current?.rowId === computedItem.id && current.cellIndex === 2 ? null : current));
                commitRowAdjustmentPercentage(event.currentTarget.value);
              }}
              onKeyDown={(event) => handleEstimateCellKeyDown(event, rowIndex, 2, rowIds, onRequestFocusByRowId)}
              data-estimate-row-index={rowIndex}
              data-estimate-row-id={computedItem.id}
              data-estimate-cell-index={2}
              aria-label={`${computedItemLabel} adjustment percentage`}
              align="center"
              className={cn(ESTIMATE_PRIMARY_NUMERIC_INPUT_CLASS, "w-10 text-right")}
            />
            <span className={ESTIMATE_PRIMARY_NUMERIC_CLASS} aria-hidden="true">%</span>
          </div>
          <p className={cn(ESTIMATE_SECONDARY_NUMERIC_CLASS, rowAdjustmentValue < 0 ? "text-danger" : "text-tertiary")}>
            {formatPeso(rowAdjustmentValue)}
          </p>
        </div>
      </td>
      <td
        className={cn(
          "flex items-center justify-center border-r border-hairline px-1",
          activeCellIndex === 3 && "ring-1 ring-inset ring-accent/30",
        )}
        data-estimate-cell-active={activeCellIndex === 3 ? "true" : undefined}
      >
        <MoneyInput
          value={computedItem.editableMiscCost}
          disabled={!canEditEstimate}
          align="center"
          onChange={(value) => {
            setEditableRows((current) => updateEditableRowValue(current, computedItem, { miscCost: value }));
            onMarkRowDirty(computedItem.id);
          }}
          ariaLabel={`${computedItemLabel} misc cost`}
          onFocus={() => setFocusedCell({ rowId: computedItem.id, cellIndex: 3 })}
          onBlur={() => {
            setFocusedCell((current) => (current?.rowId === computedItem.id && current.cellIndex === 3 ? null : current));
            if (computedItem.miscCost !== computedItem.storedMiscCost) onUpdateRowItem(computedItem.id, { miscCost: computedItem.editableMiscCost });
          }}
          onKeyDown={(event) => handleEstimateCellKeyDown(event, rowIndex, 3, rowIds, onRequestFocusByRowId)}
          data-estimate-row-index={rowIndex}
          data-estimate-row-id={computedItem.id}
          data-estimate-cell-index={3}
        />
      </td>
      <td className="flex items-center justify-end border-r border-hairline px-1 text-right">
        <p className={ESTIMATE_PRIMARY_NUMERIC_CLASS}>{pesoFormatter.format(computedItem.totalItemCosts).replace("₱", "₱ ")}</p>
      </td>
      <td className="grid grid-cols-1 place-content-center gap-1 py-2 text-tertiary">
        <Tooltip label="Row details" side="left" contentClassName="z-[1200]">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-6 rounded-xs p-0 text-tertiary hover:bg-surfaceMuted hover:text-ink"
            aria-label={`Open row details for ${computedItemLabel}`}
            onClick={(event: MouseEvent<HTMLButtonElement>) => onOpenRowDetails(computedItem.id, event.currentTarget, "details")}
          >
            <DotsThreeVertical size={14} weight="regular" aria-hidden="true" />
          </Button>
        </Tooltip>
        <Tooltip label="Row activity" side="left" contentClassName="z-[1200]">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-6 rounded-xs p-0 text-tertiary hover:bg-surfaceMuted hover:text-ink"
            aria-label={`Open row activity for ${computedItemLabel}`}
            onClick={(event: MouseEvent<HTMLButtonElement>) => onOpenRowDetails(computedItem.id, event.currentTarget, "activity")}
          >
            <ArrowsOutSimple size={14} weight="regular" aria-hidden="true" />
          </Button>
        </Tooltip>
        {canEditEstimate ? (
          <Tooltip label={ESTIMATE_ROW_DELETE_RECOVERY_TOOLTIP} side="left" contentClassName="z-[1200]">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="size-6 rounded-xs p-0 text-tertiary hover:bg-red-50 hover:text-red-700 focus-visible:text-red-700"
              aria-label={`Delete row ${computedItemLabel}`}
              onClick={() => onDeleteRowItem(computedItem.id)}
            >
              <Trash size={14} weight="regular" aria-hidden="true" />
            </Button>
          </Tooltip>
        ) : null}
      </td>
    </tr>
  );
});

function handleTableDragOver(event: DragEvent) {
  if (event.dataTransfer.types.includes(ESTIMATE_ROW_ITEM_DRAG_MIME_TYPE)) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    return;
  }

  if (event.dataTransfer.types.includes(LIBRARY_ITEM_DRAG_MIME_TYPE)) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }
}

export const EstimateRowItemsTable = memo(function EstimateRowItemsTable({
  canEditEstimate = true,
  items,
  editableRows,
  setEditableRows,
  projectId,
  estimateId,
  targetNodeId,
  onInsertLibraryItem,
  onReplaceRowItem,
  onDeleteRowItem,
  onUpdateRowItem,
  onMarkRowDirty,
  onOpenRowDetails,
  onClearRowComponent,
  onRequestProjectSpecific,
  onPromoteRowToLibrary,
  promotingRowId,
  rowMutationStatuses,
  onMoveRowComponent,
  onMoveRowItem,
  onOpenMoveRowItemDialog,
  onOpenReplaceComponentPicker,
  onOpenMoveComponentPicker,
  expressInsertDraftStates = {},
  onRetryExpressDraft = noopExpressDraftHandler,
  onDeleteExpressDraft = noopExpressDraftHandler,
  selectedRowIds,
  onToggleRowSelection,
  onToggleRowsSelection,
  columnResize,
  virtualization = WORKSHOP_ESTIMATE_ROW_VIRTUALIZATION,
}: EstimateRowItemsTableProps) {
  reportEstimateRowItemsTableRender(targetNodeId);
  const surfaceVariant = useEstimateSurfaceVariant();
  const scrollRootRef = useRef<HTMLDivElement | null>(null);
  const disabledColumnResizeSurfaceRef = useRef<HTMLElement | null>(null);
  const [focusedCell, setFocusedCell] = useState<{ rowId: string; cellIndex: number } | null>(null);
  const [replaceTargetRowId, setReplaceTargetRowId] = useState("");
  const [activeExpressRowId, setActiveExpressRowId] = useState<string | null>(null);
  const [scrollMargin, dispatchScrollMargin] = useReducer(scrollMarginReducer, 0);
  const rowIds = useMemo(() => items.map((item) => item.id), [items]);
  const selectableRowIds = useMemo(() => (canEditEstimate ? rowIds : []), [canEditEstimate, rowIds]);
  const allRowsSelected = selectableRowIds.length > 0 && selectableRowIds.every((rowId) => selectedRowIds.has(rowId));
  const someRowsSelected = !allRowsSelected && selectableRowIds.some((rowId) => selectedRowIds.has(rowId));
  const columnResizeController = useEstimateColumnResizeController({
    surfaceRef: columnResize?.surfaceRef ?? disabledColumnResizeSurfaceRef,
    widths: columnResize?.widths ?? EMPTY_ESTIMATE_COLUMN_WIDTHS,
    onCommitWidths: columnResize?.onCommitWidths ?? noopCommitWidths,
    pointerResizeEdge: "left",
  });
  const hasActiveExpressEditor = activeExpressRowId !== null && items.some((item) => item.id === activeExpressRowId);
  const virtualEnabled = Boolean(!hasActiveExpressEditor && virtualization.enabled && items.length >= (virtualization.minRows ?? 75));
  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => findScrollParent(scrollRootRef.current),
    estimateSize: () => virtualization.estimateRowHeight ?? 96,
    overscan: virtualization.overscan ?? 6,
    getItemKey: (index) => items[index]?.id ?? index,
    enabled: virtualEnabled,
    scrollMargin,
    useFlushSync: virtualization.useFlushSync ?? false,
    initialRect: { height: virtualization.initialViewportHeight ?? 720, width: 0 },
  });

  const requestFocusByRowId = useCallback(
    (rowId: string, cellIndex: number) => {
      const rowIndex = rowIds.indexOf(rowId);
      if (rowIndex >= 0 && virtualEnabled) rowVirtualizer.scrollToIndex(rowIndex, { align: "auto" });
      setFocusedCell({ rowId, cellIndex });
    },
    [rowIds, rowVirtualizer, virtualEnabled]
  );
  const handleExpressEditorActiveChange = useCallback((rowId: string, active: boolean) => {
    setActiveExpressRowId(active ? rowId : null);
  }, []);

  useEffect(() => {
    if (!hasActiveExpressEditor) return;
    recordExpressComponentEvent("virtualization_disabled", {
      rowId: activeExpressRowId ?? undefined,
      nodeId: targetNodeId,
      reason: "express-editor-active",
    });
  }, [activeExpressRowId, hasActiveExpressEditor, targetNodeId]);

  useEffect(() => {
    if (!focusedCell || focusEstimateCellByRowId(focusedCell.rowId, focusedCell.cellIndex)) return;
    const rowIndex = rowIds.indexOf(focusedCell.rowId);
    if (rowIndex >= 0 && virtualEnabled) rowVirtualizer.scrollToIndex(rowIndex, { align: "auto" });
    const frame = requestAnimationFrame(() => {
      focusEstimateCellByRowId(focusedCell.rowId, focusedCell.cellIndex);
    });
    return () => cancelAnimationFrame(frame);
  }, [focusedCell, rowIds, rowVirtualizer, virtualEnabled]);

  useEffect(() => {
    if (!virtualEnabled) {
      dispatchScrollMargin({ type: "reset" });
      return undefined;
    }

    const tableRoot = scrollRootRef.current;
    const scrollElement = findScrollParent(tableRoot);
    if (!tableRoot || !scrollElement || scrollElement === tableRoot) {
      dispatchScrollMargin({ type: "reset" });
      return undefined;
    }

    const measureScrollMargin = () => {
      const tableRect = tableRoot.getBoundingClientRect();
      const scrollRect = scrollElement.getBoundingClientRect();
      const nextScrollMargin = Math.max(0, tableRect.top - scrollRect.top + scrollElement.scrollTop);
      dispatchScrollMargin({ type: "measure", value: nextScrollMargin });
    };

    measureScrollMargin();
    scrollElement.addEventListener("scroll", measureScrollMargin, { passive: true });
    window.addEventListener("resize", measureScrollMargin);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(measureScrollMargin);
      resizeObserver.observe(tableRoot);
      resizeObserver.observe(scrollElement);
    }

    return () => {
      scrollElement.removeEventListener("scroll", measureScrollMargin);
      window.removeEventListener("resize", measureScrollMargin);
      resizeObserver?.disconnect();
    };
  }, [items.length, targetNodeId, virtualEnabled]);

  const virtualEstimateRowHeight = virtualization.estimateRowHeight ?? 96;
  const virtualOverscan = virtualization.overscan ?? 6;
  const virtualInitialViewportHeight = virtualization.initialViewportHeight ?? 720;
  const measuredVirtualRows = rowVirtualizer.getVirtualItems();
  const renderedVirtualRows = virtualEnabled && measuredVirtualRows.length === 0
    ? Array.from(
        {
          length: Math.min(
            items.length,
            Math.ceil(virtualInitialViewportHeight / virtualEstimateRowHeight) + virtualOverscan * 2
          ),
        },
        (_, index) => ({
          index,
          key: items[index]?.id ?? index,
          start: index * virtualEstimateRowHeight,
        })
      )
    : measuredVirtualRows;

  if (!items.length) return null;

  function handleDrop(event: DragEvent) {
    if (!canEditEstimate) return;
    const rowItemPayload = readEstimateRowItemDragPayload(event.dataTransfer.getData(ESTIMATE_ROW_ITEM_DRAG_MIME_TYPE));
    if (rowItemPayload) {
      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = "move";
      endEstimateWorkshopDrag();
      onMoveRowItem(rowItemPayload.rowItemId, targetNodeId, items.length);
      return;
    }

    const result = readEstimateLibraryItemDragPayload(event.dataTransfer.getData(LIBRARY_ITEM_DRAG_MIME_TYPE));
    if (!result.ok) return;
    event.preventDefault();
    onInsertLibraryItem(targetNodeId, result.item);
  }

  function headerCellClassName(columnId: string, className?: string) {
    return cn(
      "relative flex items-center justify-center border-r border-hairline",
      columnResize && isResizableEstimateColumnId(columnId as EstimateColumnId) && "pr-2",
      className,
    );
  }

  return (
    <div
      ref={scrollRootRef}
      className={cn("overflow-hidden border-x border-b border-hairline", estimateSurfaceClass(surfaceVariant, "gridTableRoot"))}
      data-estimate-row-table-root={targetNodeId}
      onDragOver={canEditEstimate ? handleTableDragOver : undefined}
      onDrop={canEditEstimate ? handleDrop : undefined}
    >
      <table className="w-full border-collapse text-[10px] text-ink">
        <thead className={cn("text-left text-[10px] font-medium text-ink", estimateSurfaceClass(surfaceVariant, "gridTableHead"))}>
          <tr className="grid min-h-10 border-b border-hairline" style={{ gridTemplateColumns: ESTIMATE_COLUMN_TEMPLATE }}>
            <th scope="col" className="flex items-center justify-center border-r border-hairline text-tertiary">#</th>
            <th scope="col" className="flex items-center justify-center border-r border-hairline">
              {canEditEstimate ? (
                <SelectionCheckbox
                  checked={allRowsSelected}
                  indeterminate={someRowsSelected}
                  ariaLabel="Select all estimate row items"
                  tabIndex={0}
                  uncheckedRevealClassName="opacity-100"
                  className="opacity-100"
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggleRowsSelection(selectableRowIds, !allRowsSelected);
                  }}
                  onKeyDown={(event) => handleSelectionCheckboxKeyDown(event, () => onToggleRowsSelection(selectableRowIds, !allRowsSelected))}
                />
              ) : (
                <span className="size-5" aria-hidden="true" />
              )}
            </th>
            <th scope="col" className={headerCellClassName("material")}>
              <span
                className="pointer-events-none absolute inset-y-0 left-0 w-[3px] bg-divider"
                data-estimate-material-header-rail="true"
                aria-hidden="true"
              />
              Materials
              {columnResize ? <EstimateRowColumnResizeHandle columnId="material" resizeController={columnResizeController} /> : null}
            </th>
            <th scope="col" className={headerCellClassName("quantity")}>
              Qty
              {columnResize ? <EstimateRowColumnResizeHandle columnId="quantity" resizeController={columnResizeController} /> : null}
            </th>
            <th scope="col" className={headerCellClassName("contingency", "text-center")}>
              Contingency
              {columnResize ? <EstimateRowColumnResizeHandle columnId="contingency" resizeController={columnResizeController} /> : null}
            </th>
            <th scope="col" className={headerCellClassName("subTotal")}>
              Subtotal
              {columnResize ? <EstimateRowColumnResizeHandle columnId="subTotal" resizeController={columnResizeController} /> : null}
            </th>
            <th scope="col" className={headerCellClassName("adjustment", "text-center")}>
              Adjustment
              {columnResize ? <EstimateRowColumnResizeHandle columnId="adjustment" resizeController={columnResizeController} /> : null}
            </th>
            <th scope="col" className={headerCellClassName("miscCost", "text-center")}>
              Misc Cost
              {columnResize ? <EstimateRowColumnResizeHandle columnId="miscCost" resizeController={columnResizeController} /> : null}
            </th>
            <th scope="col" className={headerCellClassName("totalItemCosts", "text-center")}>
              Total Item Cost
              {columnResize ? <EstimateRowColumnResizeHandle columnId="totalItemCosts" resizeController={columnResizeController} /> : null}
            </th>
            <th scope="col" aria-label="Row actions" />
          </tr>
        </thead>
        <tbody
          data-estimate-row-virtualizer={virtualEnabled ? "true" : undefined}
          data-estimate-row-virtual-total-count={virtualEnabled ? items.length : undefined}
          data-estimate-row-virtual-mounted-count={virtualEnabled ? renderedVirtualRows.length : undefined}
          data-estimate-row-virtualizer-disabled-reason={!virtualEnabled && hasActiveExpressEditor ? "express-editor-active" : undefined}
          data-active-express-editor-count={hasActiveExpressEditor ? 1 : undefined}
          data-estimate-row-scroll-margin={virtualEnabled ? Math.round(scrollMargin) : undefined}
          className={virtualEnabled ? "relative block" : undefined}
          style={virtualEnabled ? { height: rowVirtualizer.getTotalSize() } : undefined}
        >
          {(virtualEnabled ? renderedVirtualRows : items.map((_, index) => ({ index, key: items[index]?.id ?? index, start: 0 }))).map((virtualRow) => {
            const item = items[virtualRow.index];
            if (!item) return null;
            return (
              <EstimateRowItemTableRow
                key={item.id}
                canEditEstimate={canEditEstimate}
                item={item}
                editableRow={editableRows[item.id]}
                projectId={projectId}
                estimateId={estimateId}
                rowIndex={virtualRow.index}
                selected={canEditEstimate && selectedRowIds.has(item.id)}
                activeCellIndex={focusedCell?.rowId === item.id ? focusedCell.cellIndex : null}
                isReplaceTarget={canEditEstimate && replaceTargetRowId === item.id}
                setEditableRows={setEditableRows}
                setFocusedCell={setFocusedCell}
                setReplaceTargetRowId={setReplaceTargetRowId}
                onExpressEditorActiveChange={handleExpressEditorActiveChange}
                onReplaceRowItem={onReplaceRowItem}
                onDeleteRowItem={onDeleteRowItem}
                onUpdateRowItem={onUpdateRowItem}
                onMarkRowDirty={onMarkRowDirty}
                onOpenRowDetails={onOpenRowDetails}
                onClearRowComponent={onClearRowComponent}
                onRequestProjectSpecific={onRequestProjectSpecific}
                onPromoteRowToLibrary={onPromoteRowToLibrary}
                promotingRowId={promotingRowId}
                rowMutationStatus={rowMutationStatuses?.[item.id]}
                onMoveRowComponent={onMoveRowComponent}
                onMoveRowItem={onMoveRowItem}
                onOpenMoveRowItemDialog={onOpenMoveRowItemDialog}
                onOpenReplaceComponentPicker={onOpenReplaceComponentPicker}
                onOpenMoveComponentPicker={onOpenMoveComponentPicker}
                expressDraftState={expressInsertDraftStates[item.id]}
                onRetryExpressDraft={onRetryExpressDraft}
                onDeleteExpressDraft={onDeleteExpressDraft}
                onToggleRowSelection={onToggleRowSelection}
                targetNodeId={targetNodeId}
                rowIds={rowIds}
                onRequestFocusByRowId={requestFocusByRowId}
                style={virtualEnabled ? {
                  left: 0,
                  position: "absolute",
                  top: 0,
                  transform: `translateY(${virtualRow.start - scrollMargin}px)`,
                  width: "100%",
                } : undefined}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}, areEstimateRowItemsTablePropsEqual);
