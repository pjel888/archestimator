"use client";

import { memo, useCallback, useEffect, useMemo, useReducer, useRef, useState, type CSSProperties, type Dispatch, type DragEvent, type KeyboardEvent, type MouseEvent, type RefObject, type SetStateAction } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowsOutSimple, DotsThreeVertical, Trash } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { ControlInput } from "@/components/ui/control-input";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { SelectionCheckbox } from "@/components/ui/selection-checkbox";
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
import { formatPeso, isBlankEstimateRowItem, pesoFormatter, type CostAdjustmentMode, type RowDetailTab } from "../activity-history-model";
import { reportEstimateRowItemRender, reportEstimateRowItemsTableRender } from "../../estimate-sheet-render-probe";
import type { EstimateRowItem } from "../../estimate-tree-data";
import { useEstimateColumnResizeController } from "../columns/use-estimate-column-resize-controller";
import { LIBRARY_ITEM_DRAG_MIME_TYPE } from "./constants";
import { EstimateRowColumnResizeHandle } from "./column-resize-handle";
import { EstimateMaterialCell, MoneyInput, type ExpressInsertDraftState } from "./cells";
import { focusEstimateCellByRowId, handleEstimateCellKeyDown } from "./cells-model";
import { isExpressComponentRow } from "@/lib/estimates/express-components";
import {
  COST_ADJUSTMENT_MODE_OPTIONS,
  calculateContingencyValue,
  getInitialEditableRow,
  parseCostAdjustmentPercentage,
  parseEditableContingencyPercentage,
  parseNonNegativeEditableNumber,
  toEditableContingencyPercentage,
  updateEditableRowValue,
  type EditableRowValue,
} from "./editable-row-model";

export type EstimateRowItemsTableProps = {
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
  onPromoteRowToLibrary: (rowItemId: string) => void;
  promotingRowId?: string | null;
  onMoveRowComponent: (sourceRowItemId: string, targetRowItemId: string, movedItem: EstimateRowItem) => void;
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
    prev.onMoveRowComponent !== next.onMoveRowComponent ||
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
  }
  return true;
}

const noopExpressDraftHandler = () => undefined;
const noopCommitWidths = () => undefined;

type FocusedEstimateCell = { rowId: string; cellIndex: number };
type ScrollMarginAction = { type: "reset" } | { type: "measure"; value: number };

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

type EstimateRowItemTableRowProps = {
  item: EstimateRowItem;
  editableRow: EditableRowValue | undefined;
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
  onMoveRowComponent: (sourceRowItemId: string, targetRowItemId: string, movedItem: EstimateRowItem) => void;
  expressDraftState?: ExpressInsertDraftState;
  onRetryExpressDraft: (rowItemId: string) => void;
  onDeleteExpressDraft: (rowItemId: string) => void;
  onToggleRowSelection: (rowItemId: string, checked: boolean) => void;
  rowIds: readonly string[];
  onRequestFocusByRowId: (rowId: string, cellIndex: number) => void;
  onExpressEditorActiveChange: (rowId: string, active: boolean) => void;
  style?: CSSProperties;
};

const EstimateRowItemTableRow = memo(function EstimateRowItemTableRow({
  item,
  editableRow,
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
  onMoveRowComponent,
  expressDraftState,
  onRetryExpressDraft,
  onDeleteExpressDraft,
  onToggleRowSelection,
  rowIds,
  onRequestFocusByRowId,
  onExpressEditorActiveChange,
  style,
}: EstimateRowItemTableRowProps) {
  reportEstimateRowItemRender(item.id);
  const isInlineEditableComponentRow = isExpressComponentRow(item) || isBlankEstimateRowItem(item);
  const computedItem = useMemo(() => {
    const resolvedEditableRow = editableRow ?? getInitialEditableRow(item);
    const itemCost = isInlineEditableComponentRow ? parseNonNegativeEditableNumber(resolvedEditableRow.unitCost) : item.itemCost;
    const quantity = parseNonNegativeEditableNumber(resolvedEditableRow.quantity);
    const contingencyPercentage = parseEditableContingencyPercentage(resolvedEditableRow);
    const miscCost = parseNonNegativeEditableNumber(resolvedEditableRow.miscCost);
    const subTotal = itemCost * quantity;
    const contingencyValue = calculateContingencyValue(subTotal, contingencyPercentage);
    return {
      ...item,
      itemCost,
      storedQuantity: item.quantity,
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
      storedContingencyPercentage: item.contingencyPercentage ?? 0,
      storedMiscCost: item.miscCost,
      editableQuantity: resolvedEditableRow.quantity,
      editableContingencyMode: resolvedEditableRow.contingencyMode,
      editableContingencyPercentage: resolvedEditableRow.contingencyPercentage,
      editableMiscCost: resolvedEditableRow.miscCost,
      quantity,
      contingencyPercentage,
      contingencyValue,
      miscCost,
      subTotal,
      totalItemCosts: subTotal + miscCost + contingencyValue,
    };
  }, [editableRow, isInlineEditableComponentRow, item]);
  const resolvedEditableRow = editableRow ?? getInitialEditableRow(item);
  const computedItemLabel = isInlineEditableComponentRow
    ? computedItem.editableName || "Project Component"
    : computedItem.material || "component";

  function updateExpressEditableRow(values: Partial<EditableRowValue>) {
    setEditableRows((current) => updateEditableRowValue(current, item, values));
    onMarkRowDirty(item.id);
  }

  function commitExpressFields(values: Partial<EditableRowValue>) {
    const nextValues = { ...resolvedEditableRow, ...values };
    const patch: Partial<EditableRowValue> = {};
    if (values.name !== undefined && nextValues.name !== item.material) patch.name = nextValues.name;
    if (values.description !== undefined && nextValues.description !== item.description) patch.description = nextValues.description;
    if (values.supplier !== undefined && nextValues.supplier !== item.supplier) patch.supplier = nextValues.supplier;
    if (values.unit !== undefined && nextValues.unit !== item.unit) patch.unit = nextValues.unit;
    if (values.unitCost !== undefined && parseNonNegativeEditableNumber(nextValues.unitCost) !== item.itemCost) patch.unitCost = nextValues.unitCost;
    if (values.imageUrl !== undefined && nextValues.imageUrl !== (item.imageUrl ?? "")) patch.imageUrl = nextValues.imageUrl;
    if (values.sourceUrl !== undefined && nextValues.sourceUrl !== (item.sourceUrl ?? "")) patch.sourceUrl = nextValues.sourceUrl;
    if (Object.keys(patch).length > 0) onUpdateRowItem(item.id, patch);
  }


  return (
    <tr
      className={cn(
        "group/estimate-row grid min-h-24 border-b border-hairline/70 last:border-b-0 hover:bg-neutral-50",
        !isInlineEditableComponentRow && "[contain-intrinsic-size:96px] [content-visibility:auto]",
        activeCellIndex !== null && "bg-[#F6FAFF] shadow-[inset_2px_0_0_rgba(37,99,235,0.70)]",
      )}
      style={{ ...style, gridTemplateColumns: ESTIMATE_COLUMN_TEMPLATE }}
      data-estimate-row-active={activeCellIndex !== null ? "true" : undefined}
      data-estimate-row-id={computedItem.id}
    >
      <td className="flex items-center justify-center border-r border-hairline text-[9px] font-sans tabular-nums text-tertiary">
        {String(rowIndex + 1).padStart(2, "0")}
      </td>
      <td className="flex items-center justify-center border-r border-hairline text-tertiary">
        {/* No row-reorder grip: row reorder isn't implemented (no drag
            handler, no reorder RPC), so a draggable-looking handle was
            a false affordance + false a11y announcement (OD-13/D5). */}
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
      </td>
      <td className="min-w-0 border-r border-hairline">
        <EstimateMaterialCell
          item={computedItem}
          editableRow={resolvedEditableRow}
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
              contingencyPercentage: computedItem.contingencyPercentage,
              contingencyValue: computedItem.contingencyValue,
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
          onOpenComponentDetails={(opener) => onOpenRowDetails(computedItem.id, opener, "component")}
          expressDraftState={expressDraftState}
          onRetryExpressDraft={() => onRetryExpressDraft(computedItem.id)}
          onDeleteExpressDraft={() => onDeleteExpressDraft(computedItem.id)}
        />
      </td>
      <td
        className={cn(
          "relative flex flex-col items-center justify-center border-r border-hairline px-1 text-center",
          activeCellIndex === 0 && "bg-accent/10 ring-1 ring-inset ring-accent/30",
        )}
        data-estimate-cell-active={activeCellIndex === 0 ? "true" : undefined}
      >
        <ControlInput
          type="number"
          min="0"
          step="0.01"
          value={computedItem.editableQuantity}
          onChange={(event) => {
            setEditableRows((current) => updateEditableRowValue(current, computedItem, { quantity: event.target.value }));
            onMarkRowDirty(computedItem.id);
          }}
          onFocus={() => setFocusedCell({ rowId: computedItem.id, cellIndex: 0 })}
          onBlur={() => {
            setFocusedCell((current) => (current?.rowId === computedItem.id && current.cellIndex === 0 ? null : current));
            if (computedItem.quantity !== computedItem.storedQuantity) onUpdateRowItem(computedItem.id, { quantity: computedItem.editableQuantity });
          }}
          onKeyDown={(event) => handleEstimateCellKeyDown(event, rowIndex, 0, rowIds, onRequestFocusByRowId)}
          data-estimate-row-index={rowIndex}
          data-estimate-row-id={computedItem.id}
          data-estimate-cell-index={0}
          aria-label={`${computedItemLabel} quantity`}
          align="center"
          className="text-[10px] tabular-nums"
        />
        <p className="absolute top-18 right-1 text-[10px] font-medium leading-3 text-tertiary">/ {computedItem.unit}</p>
      </td>
      <td className="flex items-center justify-center border-r border-hairline px-1 text-center text-[9px] font-medium tabular-nums text-ink">{pesoFormatter.format(computedItem.subTotal).replace("₱", "₱ ")}</td>
      <td
        className={cn(
          "relative flex items-center justify-center border-r border-hairline px-1 py-1 text-center",
          activeCellIndex === 1 && "bg-accent/10 ring-1 ring-inset ring-accent/30",
        )}
        data-estimate-cell-active={activeCellIndex === 1 ? "true" : undefined}
      >
        <div className="absolute left-1.5 top-1.5 w-[74px]">
          <DropdownSelect
            value={computedItem.editableContingencyMode}
            aria-label={`${computedItemLabel} adjustment type`}
            options={COST_ADJUSTMENT_MODE_OPTIONS}
            className="h-3.5 border-0 bg-transparent pl-0 pr-0 text-left !text-[8px] leading-[10px] text-secondary"
            onValueChange={(nextValue) => {
              const nextMode = nextValue as CostAdjustmentMode;
              setEditableRows((current) => updateEditableRowValue(current, computedItem, { contingencyMode: nextMode }));
              onMarkRowDirty(computedItem.id);
              const nextContingencyPercentage = parseCostAdjustmentPercentage(computedItem.editableContingencyPercentage, nextMode);
              if (nextContingencyPercentage !== computedItem.storedContingencyPercentage) {
                onUpdateRowItem(computedItem.id, { contingencyMode: nextMode, contingencyPercentage: computedItem.editableContingencyPercentage });
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
              value={computedItem.editableContingencyPercentage}
              onChange={(event) => {
                setEditableRows((current) => updateEditableRowValue(current, computedItem, { contingencyPercentage: event.target.value }));
                onMarkRowDirty(computedItem.id);
              }}
              onFocus={() => setFocusedCell({ rowId: computedItem.id, cellIndex: 1 })}
              onBlur={() => {
                setFocusedCell((current) => (current?.rowId === computedItem.id && current.cellIndex === 1 ? null : current));
                const nextContingencyPercentage = toEditableContingencyPercentage(computedItem.contingencyPercentage);
                setEditableRows((current) => updateEditableRowValue(current, computedItem, { contingencyPercentage: nextContingencyPercentage }));
                if (computedItem.contingencyPercentage !== computedItem.storedContingencyPercentage) {
                  onUpdateRowItem(computedItem.id, { contingencyMode: computedItem.editableContingencyMode, contingencyPercentage: nextContingencyPercentage });
                }
              }}
              onKeyDown={(event) => handleEstimateCellKeyDown(event, rowIndex, 1, rowIds, onRequestFocusByRowId)}
              data-estimate-row-index={rowIndex}
              data-estimate-row-id={computedItem.id}
              data-estimate-cell-index={1}
              aria-label={`${computedItemLabel} adjustment percentage`}
              align="center"
              className="h-5 w-9 border-0 bg-transparent p-0 text-right text-[10px] font-medium tabular-nums shadow-none [appearance:textfield] focus-visible:ring-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <span className="text-[10px] font-medium leading-none tabular-nums text-ink" aria-hidden="true">%</span>
          </div>
          <p className="max-w-full truncate text-center text-[8px] font-medium leading-[10px] tabular-nums text-tertiary">
            {formatPeso(computedItem.contingencyValue)}
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
          value={computedItem.editableMiscCost}
          align="center"
          onChange={(value) => {
            setEditableRows((current) => updateEditableRowValue(current, computedItem, { miscCost: value }));
            onMarkRowDirty(computedItem.id);
          }}
          ariaLabel={`${computedItemLabel} misc cost`}
          onFocus={() => setFocusedCell({ rowId: computedItem.id, cellIndex: 2 })}
          onBlur={() => {
            setFocusedCell((current) => (current?.rowId === computedItem.id && current.cellIndex === 2 ? null : current));
            if (computedItem.miscCost !== computedItem.storedMiscCost) onUpdateRowItem(computedItem.id, { miscCost: computedItem.editableMiscCost });
          }}
          onKeyDown={(event) => handleEstimateCellKeyDown(event, rowIndex, 2, rowIds, onRequestFocusByRowId)}
          data-estimate-row-index={rowIndex}
          data-estimate-row-id={computedItem.id}
          data-estimate-cell-index={2}
        />
      </td>
      <td className="flex items-center justify-end border-r border-hairline px-1 text-right">
        <p className="text-[10px] font-medium tabular-nums text-ink">{pesoFormatter.format(computedItem.totalItemCosts).replace("₱", "₱ ")}</p>
      </td>
      <td className="flex flex-col items-center justify-between py-2 text-tertiary">
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
      </td>
    </tr>
  );
});

function handleLibraryItemDragOver(event: DragEvent) {
  if (event.dataTransfer.types.includes(LIBRARY_ITEM_DRAG_MIME_TYPE)) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }
}

export const EstimateRowItemsTable = memo(function EstimateRowItemsTable({
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
  onPromoteRowToLibrary,
  promotingRowId,
  onMoveRowComponent,
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
  const selectableRowIds = useMemo(() => items.map((item) => item.id), [items]);
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
      const rowIndex = selectableRowIds.indexOf(rowId);
      if (rowIndex >= 0 && virtualEnabled) rowVirtualizer.scrollToIndex(rowIndex, { align: "auto" });
      setFocusedCell({ rowId, cellIndex });
    },
    [rowVirtualizer, selectableRowIds, virtualEnabled]
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
    const rowIndex = selectableRowIds.indexOf(focusedCell.rowId);
    if (rowIndex >= 0 && virtualEnabled) rowVirtualizer.scrollToIndex(rowIndex, { align: "auto" });
    const frame = requestAnimationFrame(() => {
      focusEstimateCellByRowId(focusedCell.rowId, focusedCell.cellIndex);
    });
    return () => cancelAnimationFrame(frame);
  }, [focusedCell, rowVirtualizer, selectableRowIds, virtualEnabled]);

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
    const payload = event.dataTransfer.getData(LIBRARY_ITEM_DRAG_MIME_TYPE);
    if (!payload) return;
    event.preventDefault();
    const libraryItem = JSON.parse(payload) as EstimateRowItem;
    onInsertLibraryItem(targetNodeId, libraryItem);
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
      onDragOver={handleLibraryItemDragOver}
      onDrop={handleDrop}
    >
      <table className="w-full border-collapse text-[10px] text-ink">
        <thead className={cn("text-left text-[10px] font-medium text-ink", estimateSurfaceClass(surfaceVariant, "gridTableHead"))}>
          <tr className="grid min-h-10 border-b border-hairline" style={{ gridTemplateColumns: ESTIMATE_COLUMN_TEMPLATE }}>
            <th className="flex items-center justify-center border-r border-hairline text-tertiary">#</th>
            <th className="flex items-center justify-center border-r border-hairline">
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
            </th>
            <th className={headerCellClassName("material")}>
              <span
                className="pointer-events-none absolute inset-y-0 left-0 w-[3px] bg-divider"
                data-estimate-material-header-rail="true"
                aria-hidden="true"
              />
              Materials
              {columnResize ? <EstimateRowColumnResizeHandle columnId="material" resizeController={columnResizeController} /> : null}
            </th>
            <th className={headerCellClassName("quantity")}>
              Qty
              {columnResize ? <EstimateRowColumnResizeHandle columnId="quantity" resizeController={columnResizeController} /> : null}
            </th>
            <th className={headerCellClassName("subTotal")}>
              Subtotal
              {columnResize ? <EstimateRowColumnResizeHandle columnId="subTotal" resizeController={columnResizeController} /> : null}
            </th>
            <th className={headerCellClassName("adjustment", "text-center")}>
              Adjustment
              {columnResize ? <EstimateRowColumnResizeHandle columnId="adjustment" resizeController={columnResizeController} /> : null}
            </th>
            <th className={headerCellClassName("miscCost", "text-center")}>
              Misc Cost
              {columnResize ? <EstimateRowColumnResizeHandle columnId="miscCost" resizeController={columnResizeController} /> : null}
            </th>
            <th className={headerCellClassName("totalItemCosts", "text-center")}>
              Total Item Cost
              {columnResize ? <EstimateRowColumnResizeHandle columnId="totalItemCosts" resizeController={columnResizeController} /> : null}
            </th>
            <th aria-label="Row actions" />
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
                item={item}
                editableRow={editableRows[item.id]}
                rowIndex={virtualRow.index}
                selected={selectedRowIds.has(item.id)}
                activeCellIndex={focusedCell?.rowId === item.id ? focusedCell.cellIndex : null}
                isReplaceTarget={replaceTargetRowId === item.id}
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
                onMoveRowComponent={onMoveRowComponent}
                expressDraftState={expressInsertDraftStates[item.id]}
                onRetryExpressDraft={onRetryExpressDraft}
                onDeleteExpressDraft={onDeleteExpressDraft}
                onToggleRowSelection={onToggleRowSelection}
                rowIds={selectableRowIds}
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
