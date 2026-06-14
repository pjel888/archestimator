"use client";

import { memo, useMemo, useState, type Dispatch, type DragEvent, type MouseEvent, type SetStateAction } from "react";
import { ArrowsOutSimple, DotsThreeVertical, Trash } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { ControlInput } from "@/components/ui/control-input";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { cn } from "@/lib/ui/cn";
import { formatPeso, pesoFormatter, type CostAdjustmentMode, type RowDetailTab } from "../activity-history";
import { reportEstimateRowItemRender, reportEstimateRowItemsTableRender } from "../../estimate-sheet-render-probe";
import type { EstimateRowItem } from "../../estimate-tree-data";
import { LIBRARY_ITEM_DRAG_MIME_TYPE } from "./constants";
import { EstimateMaterialCell, MoneyInput, handleEstimateCellKeyDown } from "./cells";
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
  onMoveRowComponent: (sourceRowItemId: string, targetRowItemId: string, movedItem: EstimateRowItem) => void;
  selectedRowIds: ReadonlySet<string>;
  onToggleRowSelection: (rowItemId: string, checked: boolean) => void;
  onToggleRowsSelection: (rowItemIds: string[], checked: boolean) => void;
};

// The comparator slices shared sheet state per table: a keystroke in one
// area's table must not re-render every other table. Callback props must be
// identity-stable (useStableCallback in EstimateSheetContent) — a changed
// callback identity forces a re-render to avoid stale closures.
export function areEstimateRowItemsTablePropsEqual(prev: EstimateRowItemsTableProps, next: EstimateRowItemsTableProps) {
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

const ROW_COLUMNS = "grid-cols-[36px_32px_minmax(160px,1fr)_58px_92px_106px_92px_108px_30px]";

type FocusedEstimateCell = { rowId: string; cellIndex: number };

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
  onMoveRowComponent: (sourceRowItemId: string, targetRowItemId: string, movedItem: EstimateRowItem) => void;
  onToggleRowSelection: (rowItemId: string, checked: boolean) => void;
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
  onMoveRowComponent,
  onToggleRowSelection,
}: EstimateRowItemTableRowProps) {
  reportEstimateRowItemRender(item.id);
  const computedItem = useMemo(() => {
    const resolvedEditableRow = editableRow ?? getInitialEditableRow(item);
    const quantity = parseNonNegativeEditableNumber(resolvedEditableRow.quantity);
    const contingencyPercentage = parseEditableContingencyPercentage(resolvedEditableRow);
    const miscCost = parseNonNegativeEditableNumber(resolvedEditableRow.miscCost);
    const subTotal = item.itemCost * quantity;
    const contingencyValue = calculateContingencyValue(subTotal, contingencyPercentage);
    return {
      ...item,
      storedQuantity: item.quantity,
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
  }, [editableRow, item]);

  return (
    <tr
      className={cn(
        "grid min-h-24 border-b border-hairline/70 last:border-b-0 hover:bg-neutral-50 [contain-intrinsic-size:96px] [content-visibility:auto]",
        activeCellIndex !== null && "bg-[#F6FAFF] shadow-[inset_2px_0_0_rgba(37,99,235,0.70)]",
        ROW_COLUMNS,
      )}
      data-estimate-row-active={activeCellIndex !== null ? "true" : undefined}
    >
      <td className="flex items-center justify-center border-r border-hairline text-[9px] font-sans tabular-nums text-tertiary">
        {String(rowIndex + 1).padStart(2, "0")}
      </td>
      <td className="flex items-center justify-center border-r border-hairline text-tertiary">
        {/* No row-reorder grip: row reorder isn't implemented (no drag
            handler, no reorder RPC), so a draggable-looking handle was
            a false affordance + false a11y announcement (OD-13/D5). */}
        <input
          type="checkbox"
          aria-label={`Select ${computedItem.material}`}
          checked={selected}
          onChange={(event) => onToggleRowSelection(computedItem.id, event.currentTarget.checked)}
        />
      </td>
      <td className="min-w-0">
        <EstimateMaterialCell
          item={computedItem}
          isReplaceTarget={isReplaceTarget}
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
          onClearComponent={() => onClearRowComponent(computedItem.id)}
          onRequestProjectSpecific={() => onRequestProjectSpecific(computedItem.id)}
          onMoveComponent={onMoveRowComponent}
          onOpenComponentDetails={(opener) => onOpenRowDetails(computedItem.id, opener, "component")}
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
          onKeyDown={(event) => handleEstimateCellKeyDown(event, rowIndex, 0)}
          data-estimate-row-index={rowIndex}
          data-estimate-row-id={computedItem.id}
          data-estimate-cell-index={0}
          aria-label={`${computedItem.material} quantity`}
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
            aria-label={`${computedItem.material} adjustment type`}
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
              onKeyDown={(event) => handleEstimateCellKeyDown(event, rowIndex, 1)}
              data-estimate-row-index={rowIndex}
              data-estimate-cell-index={1}
              aria-label={`${computedItem.material} adjustment percentage`}
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
          ariaLabel={`${computedItem.material} misc cost`}
          onFocus={() => setFocusedCell({ rowId: computedItem.id, cellIndex: 2 })}
          onBlur={() => {
            setFocusedCell((current) => (current?.rowId === computedItem.id && current.cellIndex === 2 ? null : current));
            if (computedItem.miscCost !== computedItem.storedMiscCost) onUpdateRowItem(computedItem.id, { miscCost: computedItem.editableMiscCost });
          }}
          onKeyDown={(event) => handleEstimateCellKeyDown(event, rowIndex, 2)}
          data-estimate-row-index={rowIndex}
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
          aria-label={`Open row details for ${computedItem.material}`}
          onClick={(event: MouseEvent<HTMLButtonElement>) => onOpenRowDetails(computedItem.id, event.currentTarget, "details")}
        >
          <DotsThreeVertical size={14} weight="regular" aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="size-6 rounded-xs p-0 text-tertiary hover:bg-surfaceMuted hover:text-ink"
          aria-label={`Open row activity for ${computedItem.material}`}
          onClick={(event: MouseEvent<HTMLButtonElement>) => onOpenRowDetails(computedItem.id, event.currentTarget, "activity")}
        >
          <ArrowsOutSimple size={14} weight="regular" aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="size-6 rounded-xs p-0 text-tertiary hover:bg-red-50 hover:text-red-700 focus-visible:text-red-700"
          aria-label={`Delete row ${computedItem.material}`}
          onClick={() => onDeleteRowItem(computedItem.id)}
        >
          <Trash size={14} weight="regular" aria-hidden="true" />
        </Button>
      </td>
    </tr>
  );
});

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

  if (!items.length) return null;

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
        <thead className="bg-white text-left text-[10px] font-medium text-ink">
          <tr className={cn("grid min-h-10 border-b border-hairline", ROW_COLUMNS)}>
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
            <th aria-hidden="true" />
          </tr>
        </thead>
        <tbody>
          {items.map((item, rowIndex) => (
            <EstimateRowItemTableRow
              key={item.id}
              item={item}
              editableRow={editableRows[item.id]}
              rowIndex={rowIndex}
              selected={selectedRowIds.has(item.id)}
              activeCellIndex={focusedCell?.rowId === item.id ? focusedCell.cellIndex : null}
              isReplaceTarget={replaceTargetRowId === item.id}
              setEditableRows={setEditableRows}
              setFocusedCell={setFocusedCell}
              setReplaceTargetRowId={setReplaceTargetRowId}
              onReplaceRowItem={onReplaceRowItem}
              onDeleteRowItem={onDeleteRowItem}
              onUpdateRowItem={onUpdateRowItem}
              onMarkRowDirty={onMarkRowDirty}
              onOpenRowDetails={onOpenRowDetails}
              onClearRowComponent={onClearRowComponent}
              onRequestProjectSpecific={onRequestProjectSpecific}
              onMoveRowComponent={onMoveRowComponent}
              onToggleRowSelection={onToggleRowSelection}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}, areEstimateRowItemsTablePropsEqual);
