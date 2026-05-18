"use client";

import { type Dispatch, type DragEvent, type InputHTMLAttributes, type KeyboardEvent, type SetStateAction, useCallback, useEffect, useMemo, useState } from "react";
import { ArrowsOutSimple, CaretDown, Cube, DotsSixVertical, FunnelSimple, HouseLine, Plus, SlidersHorizontal, Stack, Trash } from "@phosphor-icons/react/dist/ssr";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ControlInput } from "@/components/ui/control-input";
import { ControlSelect } from "@/components/ui/control-select";
import { SearchInput } from "@/components/ui/search-input";
import { cn } from "@/lib/ui/cn";
import { findEstimateNode, sampleEstimateTree, type EstimateAreaNode, type EstimateRowItem } from "./estimate-tree-data";


/* Re-export component library helpers and sidebar so existing imports don't break */
export {
  createComponent,
  filterComponents,
  getComponentImageUrl,
  getComponentName,
  getComponentPrice,
  groupComponents,
  searchComponents,
  sortComponents,
} from "./component-library/helpers";
export { EstimateRightSidebar } from "./component-library";

type EstimateSheetContentProps = {
  selectedNodeId: string;
};

type EstimateSheetBranchProps = {
  node: EstimateAreaNode;
  editableRows: Record<string, EditableRowValue>;
  setEditableRows: Dispatch<SetStateAction<Record<string, EditableRowValue>>>;
  onInsertLibraryItem: (targetNodeId: string, libraryItem: EstimateRowItem) => void;
  onReplaceRowItem: (rowItemId: string, libraryItem: EstimateRowItem) => void;
  onDeleteRowItem: (rowItemId: string) => void;
  depth?: number;
};

export const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
});

function groupLabel(kind: EstimateAreaNode["kind"]) {
  if (kind === "lot") return "Lot group";
  if (kind === "structure") return "Structure group";
  if (kind === "level") return "Floor group";
  return "Area group";
}

function groupTint() {
  return "border-hairline bg-surfaceMuted";
}

const disciplineOptions = ["Architectural", "Furniture", "Decorative", "Mechanical", "Electrical", "Plumbing", "Fire Suppression", "Security"];
const designationOptions = ["Floor", "Wall", "Ceiling"];

function groupGap(depth: number) {
  if (depth === 0) return "mt-0";
  if (depth === 1) return "mt-5";
  return "mt-4";
}

function NodeIcon({ kind }: { kind: EstimateAreaNode["kind"] }) {
  if (kind === "lot") return <HouseLine size={13} weight="bold" aria-hidden="true" />;
  if (kind === "structure") return <HouseLine size={13} weight="bold" aria-hidden="true" />;
  if (kind === "level") return <Stack size={13} weight="bold" aria-hidden="true" />;
  return <Cube size={13} weight="bold" aria-hidden="true" />;
}

function collectAreaOptions(nodes: EstimateAreaNode[]) {
  const options: Array<{ id: string; label: string }> = [];

  function visit(node: EstimateAreaNode, path: string[]) {
    const nextPath = [...path, node.name];
    if (node.kind === "area") options.push({ id: node.id, label: nextPath.join(" / ") });
    node.children?.forEach((child) => visit(child, nextPath));
  }

  nodes.forEach((node) => visit(node, []));
  return options;
}

function focusEstimateCell(rowIndex: number, cellIndex: number) {
  const nextCell = document.querySelector<HTMLInputElement | HTMLSelectElement>(
    `[data-estimate-row-index="${rowIndex}"][data-estimate-cell-index="${cellIndex}"]`,
  );
  nextCell?.focus();
  if (nextCell instanceof HTMLInputElement) nextCell.select();
}

function handleEstimateCellKeyDown(event: KeyboardEvent<HTMLInputElement | HTMLSelectElement>, rowIndex: number, cellIndex: number) {
  const keyMap: Record<string, [number, number]> = {
    ArrowRight: [rowIndex, cellIndex + 1],
    ArrowLeft: [rowIndex, cellIndex - 1],
    ArrowDown: [rowIndex + 1, cellIndex],
    ArrowUp: [rowIndex - 1, cellIndex],
    Enter: event.shiftKey ? [rowIndex - 1, cellIndex] : [rowIndex + 1, cellIndex],
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
  item: EstimateRowItem & Pick<EditableRowValue, "discipline" | "designation">,
  patchValue: Partial<EditableRowValue>,
) {
  const currentRow = current[item.id];
  return {
    ...current,
    [item.id]: {
      quantity: currentRow?.quantity ?? toEditableNumber(item.quantity),
      supplementaryCosts: currentRow?.supplementaryCosts ?? toEditableNumber(item.supplementaryCosts),
      laborCost: currentRow?.laborCost ?? toEditableNumber(item.laborCost),
      discipline: currentRow?.discipline ?? item.discipline ?? "Architectural",
      designation: currentRow?.designation ?? item.designation ?? "Floor",
      ...patchValue,
    },
  };
}

type EditableRowValue = {
  quantity: string;
  supplementaryCosts: string;
  laborCost: string;
  discipline: string;
  designation: string;
};

function parseEditableNumber(value: string) {
  const parsed = Number(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatEditableMoney(value: string) {
  return pesoFormatter.format(parseEditableNumber(value));
}

function getInitialEditableRow(item: EstimateRowItem): EditableRowValue {
  return {
    quantity: toEditableNumber(item.quantity),
    supplementaryCosts: toEditableNumber(item.supplementaryCosts),
    laborCost: toEditableNumber(item.laborCost ?? 0),
    discipline: item.source === "library" ? "Furniture" : "Architectural",
    designation: item.material.toLowerCase().includes("wall") ? "Wall" : item.material.toLowerCase().includes("chandelier") ? "Ceiling" : "Floor",
  };
}

function collectEditableRows(nodes: EstimateAreaNode[]) {
  const rows: Record<string, EditableRowValue> = {};

  function visit(node: EstimateAreaNode) {
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
  const supplementaryCosts = parseEditableNumber(editableRow.supplementaryCosts);
  const laborCost = parseEditableNumber(editableRow.laborCost);
  return item.itemCost * quantity + supplementaryCosts + laborCost;
}

function computeNodeTotal(node: EstimateAreaNode, editableRows: Record<string, EditableRowValue>): number {
  const rowTotal = (node.estimateRowItems ?? []).reduce((total, item) => total + computeRowTotal(item, editableRows), 0);
  const childTotal = (node.children ?? []).reduce((total, child) => total + computeNodeTotal(child, editableRows), 0);
  return rowTotal + childTotal;
}

function countNodeRows(node: EstimateAreaNode): number {
  const rowCount = node.estimateRowItems?.length ?? 0;
  const childRowCount = (node.children ?? []).reduce((total, child) => total + countNodeRows(child), 0);
  return rowCount + childRowCount;
}

function countNodeAreas(node: EstimateAreaNode): number {
  return 1 + (node.children ?? []).reduce((total, child) => total + countNodeAreas(child), 0);
}

function EstimateSelect({
  value,
  options,
  ariaLabel,
  onChange,
}: {
  value: string;
  options: string[];
  ariaLabel: string;
  onChange: (value: string) => void;
}) {
  return (
    <ControlSelect
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label={ariaLabel}
      wrapperClassName="w-full"
      className="w-full pr-4 font-semibold"
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </ControlSelect>
  );
}

function EstimateDropZone({ label, compact = false }: { label: string; compact?: boolean }) {
  return (
    <div className={cn("border border-dashed border-divider bg-surfaceWarm/80 text-tertiary", compact ? "flex min-h-20 items-center justify-center" : "mt-1 p-2")}>
      <div className="flex flex-col items-center justify-center gap-1 text-center text-[10px] font-bold uppercase tracking-[0.12em]">
        <span className="flex size-5 items-center justify-center rounded-full border border-dashed border-divider bg-white text-ink">
          <Plus size={12} weight="bold" aria-hidden="true" />
        </span>
        <span>{label}</span>
      </div>
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

  return (
    <div
      className={cn(
        "group flex h-full min-h-24 cursor-grab overflow-hidden border-r border-hairline border-l-2 border-l-accent/70 bg-[#EFF6FF] shadow-[inset_0_0_0_1px_rgba(37,99,235,0.10)] transition hover:bg-[#E7F0FF] active:cursor-grabbing",
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
      <div className="flex aspect-square h-full min-h-24 shrink-0 items-stretch justify-center p-0">
        <div
          className="h-full w-full bg-neutral-100 bg-cover bg-center"
          style={{ backgroundImage: `url(${getComponentImageUrl(item)})` }}
          aria-label={`${item.material} reference image`}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col px-1 py-1.5">
        <div className="mb-1 flex min-w-0 flex-wrap items-center gap-1">
          <span className="shrink-0 rounded-sm border border-accent/25 bg-white/80 px-1 py-0.5 text-[8px] font-bold uppercase tracking-[0.08em] text-accent">
            Source-linked estimate component
          </span>
          <span className="shrink-0 rounded-sm border border-accent/20 bg-accent/10 px-1 py-0.5 text-[8px] font-bold uppercase tracking-[0.08em] text-accent">
            Drag / replace component
          </span>
        </div>
        <p className="truncate text-[11px] font-bold leading-4 text-ink">{item.material}</p>
        <p className="truncate text-[10px] font-semibold leading-4 text-tertiary">{item.supplier}</p>
        <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-secondary/60 transition-opacity group-hover:text-secondary">{item.description}</p>
      </div>

      <div className="flex w-16 shrink-0 flex-col items-end justify-between gap-2 px-1 py-1.5 text-right">
        <DotsSixVertical size={14} weight="bold" className="text-accent" aria-hidden="true" />
        <div>
          <p className="whitespace-nowrap text-[9px] font-bold leading-4 tabular-nums text-ink">{pesoFormatter.format(item.itemCost)}</p>
          <p className="whitespace-nowrap text-[10px] font-semibold leading-3 text-tertiary">/ {item.unit}</p>
        </div>
        <ArrowsOutSimple size={14} weight="bold" className="text-accent" aria-hidden="true" />
      </div>
    </div>
  );
}

function MoneyInput({
  value,
  onChange,
  ariaLabel,
  onFocus,
  onBlur,
  ...cellProps
}: {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
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
      align="right"
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
}: {
  items: EstimateRowItem[];
  editableRows: Record<string, EditableRowValue>;
  setEditableRows: Dispatch<SetStateAction<Record<string, EditableRowValue>>>;
  targetNodeId: string;
  onInsertLibraryItem: (targetNodeId: string, libraryItem: EstimateRowItem) => void;
  onReplaceRowItem: (rowItemId: string, libraryItem: EstimateRowItem) => void;
  onDeleteRowItem: (rowItemId: string) => void;
}) {
  const [focusedCell, setFocusedCell] = useState<{ rowId: string; cellIndex: number } | null>(null);
  const [replaceTargetRowId, setReplaceTargetRowId] = useState("");
  const computedRows = useMemo(
    () =>
      items.map((item) => {
        const editableRow = editableRows[item.id] ?? getInitialEditableRow(item);
        const quantity = parseEditableNumber(editableRow.quantity);
        const supplementaryCosts = parseEditableNumber(editableRow.supplementaryCosts);
        const laborCost = parseEditableNumber(editableRow.laborCost);
        const subTotal = item.itemCost * quantity;
        return {
          ...item,
          editableQuantity: editableRow.quantity,
          editableSupplementaryCosts: editableRow.supplementaryCosts,
          editableLaborCost: editableRow.laborCost,
          discipline: editableRow.discipline,
          designation: editableRow.designation,
          quantity,
          supplementaryCosts,
          laborCost,
          subTotal,
          totalItemCosts: subTotal + supplementaryCosts + laborCost,
        };
      }),
    [editableRows, items],
  );

  if (!items.length) return null;

  const rowColumns = "grid-cols-[32px_minmax(134px,1fr)_104px_58px_92px_92px_92px_108px_30px]";

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
            <th className="flex items-center justify-center border-r border-hairline">
              <input type="checkbox" aria-label="Select all estimate row items" />
            </th>
            <th className="flex items-center justify-center border-r border-hairline">Materials</th>
            <th className="flex items-center justify-center border-r border-hairline text-center text-[9px] leading-3">Discipline / Designation</th>
            <th className="flex items-center justify-center border-r border-hairline">Qty</th>
            <th className="flex items-center justify-center border-r border-hairline">Subtotal</th>
            <th className="flex items-center justify-center border-r border-hairline text-center text-[9px] leading-3">Other Costs</th>
            <th className="flex items-center justify-center border-r border-hairline text-center text-[9px] leading-3">Labor Cost</th>
            <th className="flex items-center justify-center border-r border-hairline">Costs</th>
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
              <td className="flex flex-col items-center justify-between border-r border-hairline py-2 text-tertiary">
                <DotsSixVertical size={14} weight="bold" aria-label={`Drag material ${item.material}`} />
                <input type="checkbox" aria-label={`Select ${item.material}`} />
                <span className="size-3" aria-hidden="true" />
              </td>
              <td className="min-w-0">
                <EstimateMaterialCell
                  item={item}
                  isReplaceTarget={replaceTargetRowId === item.id}
                  onReplaceDragOver={() => setReplaceTargetRowId(item.id)}
                  onReplaceDragLeave={() => setReplaceTargetRowId((current) => (current === item.id ? "" : current))}
                  onReplace={(libraryItem) => onReplaceRowItem(item.id, libraryItem)}
                />
              </td>
              <td className="flex flex-col justify-center gap-1 border-r border-hairline px-1 py-1.5">
                <EstimateSelect
                  value={item.discipline}
                  options={disciplineOptions}
                  ariaLabel={`${item.material} discipline`}
                  onChange={(value) =>
                    setEditableRows((current) => updateEditableRowValue(current, item, { discipline: value }))
                  }
                />
                <EstimateSelect
                  value={item.designation}
                  options={designationOptions}
                  ariaLabel={`${item.material} designation`}
                  onChange={(value) =>
                    setEditableRows((current) => updateEditableRowValue(current, item, { designation: value }))
                  }
                />
              </td>
              <td
                className={cn(
                  "flex flex-col items-center justify-center border-r border-hairline px-1 text-center",
                  activeCellIndex === 0 && "bg-accent/10 ring-1 ring-inset ring-accent/30",
                )}
                data-estimate-cell-active={activeCellIndex === 0 ? "true" : undefined}
              >
                <ControlInput
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.editableQuantity}
                  onChange={(event) =>
                    setEditableRows((current) => updateEditableRowValue(current, item, { quantity: event.target.value }))
                  }
                  onFocus={() => setFocusedCell({ rowId: item.id, cellIndex: 0 })}
                  onBlur={() => setFocusedCell((current) => (current?.rowId === item.id && current.cellIndex === 0 ? null : current))}
                  onKeyDown={(event) => handleEstimateCellKeyDown(event, rowIndex, 0)}
                  data-estimate-row-index={rowIndex}
                  data-estimate-row-id={item.id}
                  data-estimate-cell-index={0}
                  aria-label={`${item.material} quantity`}
                  align="center"
                  className="text-[10px] tabular-nums"
                />
                <p className="text-[10px] font-semibold text-tertiary">{item.unit}</p>
              </td>
              <td className="flex items-center justify-end border-r border-hairline px-1 text-[9px] font-bold tabular-nums text-ink">{pesoFormatter.format(item.subTotal)}</td>
              <td
                className={cn(
                  "flex items-center justify-end border-r border-hairline px-1",
                  activeCellIndex === 1 && "bg-accent/10 ring-1 ring-inset ring-accent/30",
                )}
                data-estimate-cell-active={activeCellIndex === 1 ? "true" : undefined}
              >
                <MoneyInput
                  value={item.editableSupplementaryCosts}
                  onChange={(value) => setEditableRows((current) => updateEditableRowValue(current, item, { supplementaryCosts: value }))}
                  ariaLabel={`${item.material} other costs`}
                  onFocus={() => setFocusedCell({ rowId: item.id, cellIndex: 1 })}
                  onBlur={() => setFocusedCell((current) => (current?.rowId === item.id && current.cellIndex === 1 ? null : current))}
                  onKeyDown={(event) => handleEstimateCellKeyDown(event, rowIndex, 1)}
                  data-estimate-row-index={rowIndex}
                  data-estimate-cell-index={1}
                />
              </td>
              <td
                className={cn(
                  "flex items-center justify-end border-r border-hairline px-1",
                  activeCellIndex === 2 && "bg-accent/10 ring-1 ring-inset ring-accent/30",
                )}
                data-estimate-cell-active={activeCellIndex === 2 ? "true" : undefined}
              >
                <MoneyInput
                  value={item.editableLaborCost}
                  onChange={(value) => setEditableRows((current) => updateEditableRowValue(current, item, { laborCost: value }))}
                  ariaLabel={`${item.material} labor cost`}
                  onFocus={() => setFocusedCell({ rowId: item.id, cellIndex: 2 })}
                  onBlur={() => setFocusedCell((current) => (current?.rowId === item.id && current.cellIndex === 2 ? null : current))}
                  onKeyDown={(event) => handleEstimateCellKeyDown(event, rowIndex, 2)}
                  data-estimate-row-index={rowIndex}
                  data-estimate-cell-index={2}
                />
              </td>
              <td className="flex flex-col items-end justify-center border-r border-hairline px-1 text-right">
                <p className="text-[10px] font-bold tabular-nums text-ink">{pesoFormatter.format(item.totalItemCosts)}</p>
                <p className="text-[10px] font-semibold text-tertiary">Total Item Cost</p>
              </td>
              <td className="flex flex-col items-center justify-between gap-1 py-1 text-tertiary">
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
          <tr className={cn("grid min-h-20 border-b border-dashed border-divider bg-surfaceWarm/50", rowColumns)}>
            <td className="flex items-center justify-center border-r border-dashed border-divider text-tertiary">
              <Plus size={14} weight="bold" aria-hidden="true" />
            </td>
            <td className="min-w-0 border-r border-dashed border-divider">
              <EstimateDropZone label="Add or drag estimate component" compact />
            </td>
            <td className="border-r border-dashed border-divider" />
            <td className="border-r border-dashed border-divider" />
            <td className="border-r border-dashed border-divider" />
            <td className="border-r border-dashed border-divider" />
            <td className="border-r border-dashed border-divider" />
            <td className="border-r border-dashed border-divider" />
            <td />
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function EmptyAreaMessage({ depth, nodeId, onInsertLibraryItem }: { depth: number; nodeId: string; onInsertLibraryItem: (targetNodeId: string, libraryItem: EstimateRowItem) => void }) {
  return (
    <div
      style={{ marginLeft: `${Math.min(depth * 18, 108)}px` }}
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes("application/x-archestimator-library-item")) {
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
        }
      }}
      onDrop={(event) => {
        const payload = event.dataTransfer.getData("application/x-archestimator-library-item");
        if (!payload) return;
        event.preventDefault();
        onInsertLibraryItem(nodeId, JSON.parse(payload) as EstimateRowItem);
      }}
    >
      <EstimateDropZone label="Drag and drop estimate component here" />
    </div>
  );
}

function EstimateSheetBranch({ node, editableRows, setEditableRows, onInsertLibraryItem, onReplaceRowItem, onDeleteRowItem, depth = 0 }: EstimateSheetBranchProps) {
  const [collapsed, setCollapsed] = useState(false);
  const childAreas = node.children ?? [];
  const estimateRowItems = node.estimateRowItems ?? [];
  const hasContents = childAreas.length > 0 || estimateRowItems.length > 0;
  const canReceiveRows = node.kind === "area";
  const leftIndent = Math.min(depth * 18, 108);
  const total = computeNodeTotal(node, editableRows);

  return (
    <section className={cn("space-y-1", groupGap(depth))} aria-label={`${node.name} ${groupLabel(node.kind).toLowerCase()}`}>
      <div className={cn("flex h-9 items-center gap-2 border px-1", groupTint())} style={{ paddingLeft: `${leftIndent + 8}px` }}>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`${collapsed ? "Expand" : "Collapse"} ${node.name}`}
          aria-expanded={!collapsed}
          className="size-6 rounded-sm p-0 text-tertiary"
          onClick={() => setCollapsed((value) => !value)}
        >
          <CaretDown size={13} weight="bold" aria-hidden="true" className={collapsed ? "-rotate-90" : ""} />
        </Button>
        <span className="flex size-6 shrink-0 items-center justify-center border border-hairline bg-white text-tertiary">
          <NodeIcon kind={node.kind} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[10px] font-bold text-ink">{node.name}</p>
          <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-tertiary">{groupLabel(node.kind)}</p>
        </div>
        <span className="shrink-0 text-right text-[10px] font-bold tabular-nums text-ink">{pesoFormatter.format(total)}</span>
      </div>

      {!collapsed ? (
        <div className="space-y-4">
          {childAreas.map((child) => (
            <EstimateSheetBranch
              key={child.id}
              node={child}
              editableRows={editableRows}
              setEditableRows={setEditableRows}
              onInsertLibraryItem={onInsertLibraryItem}
              onReplaceRowItem={onReplaceRowItem}
              onDeleteRowItem={onDeleteRowItem}
              depth={depth + 1}
            />
          ))}
          <EstimateRowItemsTable
            items={estimateRowItems}
            editableRows={editableRows}
            setEditableRows={setEditableRows}
            targetNodeId={node.id}
            onInsertLibraryItem={onInsertLibraryItem}
            onReplaceRowItem={onReplaceRowItem}
            onDeleteRowItem={onDeleteRowItem}
          />
          {!hasContents ? <EmptyAreaMessage depth={depth + 1} nodeId={node.id} onInsertLibraryItem={onInsertLibraryItem} /> : null}
          {hasContents && canReceiveRows ? (
            <div
              onDragOver={(event) => {
                if (event.dataTransfer.types.includes("application/x-archestimator-library-item")) {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "copy";
                }
              }}
              onDrop={(event) => {
                const payload = event.dataTransfer.getData("application/x-archestimator-library-item");
                if (!payload) return;
                event.preventDefault();
                onInsertLibraryItem(node.id, JSON.parse(payload) as EstimateRowItem);
              }}
            >
              <EstimateDropZone label="Drag and drop here" />
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function cloneLibraryItemForEstimate(libraryItem: EstimateRowItem, targetNodeId: string): EstimateRowItem {
  const id = `${targetNodeId}-${libraryItem.id}-${Date.now()}`;
  const quantity = libraryItem.quantity || 1;
  const subTotal = libraryItem.itemCost * quantity;
  return {
    ...libraryItem,
    id,
    quantity,
    subTotal,
    totalItemCosts: subTotal + libraryItem.supplementaryCosts + libraryItem.laborCost,
  };
}

function replaceRowItemWithLibraryItem(rowItemId: string, libraryItem: EstimateRowItem): EstimateRowItem {
  const quantity = libraryItem.quantity || 1;
  const subTotal = libraryItem.itemCost * quantity;
  return {
    ...libraryItem,
    id: rowItemId,
    quantity,
    subTotal,
    totalItemCosts: subTotal + libraryItem.supplementaryCosts + libraryItem.laborCost,
  };
}

function EstimateSheetHeader({
  projectNode,
  areaOptions,
  insertTargetNodeId,
  onInsertTargetChange,
}: {
  projectNode: EstimateAreaNode;
  areaOptions: Array<{ id: string; label: string }>;
  insertTargetNodeId: string;
  onInsertTargetChange: (targetNodeId: string) => void;
}) {
  const projectRowCount = countNodeRows(projectNode);
  const projectAreaCount = countNodeAreas(projectNode);

  return (
    <header className="sticky top-0 z-20 border-b border-hairline bg-white/95 backdrop-blur" aria-label="Estimate sheet controls">
      <div className="flex items-center gap-1.5 px-2 py-1.5">
        <SearchInput
          wrapperClassName="h-8 w-full max-w-xs rounded-sm"
          placeholder="Search rows, material, supplier"
          aria-label="Search estimate rows"
        />
        <Button variant="secondary" size="sm" className="h-8 min-h-8 gap-1.5 px-2.5" aria-label="Filter estimate rows">
          <FunnelSimple size={12} weight="bold" aria-hidden="true" />
          Filter
        </Button>
        <Button variant="ghost" size="sm" className="h-8 min-h-8 gap-1.5 px-2.5" aria-label="Open estimate view options">
          <SlidersHorizontal size={12} weight="bold" aria-hidden="true" />
          Organize
        </Button>
        <Button variant="ghost" size="sm" className="h-8 min-h-8 gap-1.5 px-2.5 text-red-700 hover:bg-red-50" aria-label="Delete selected row items" disabled>
          <Trash size={12} weight="bold" aria-hidden="true" />
          Delete selected
        </Button>
        <div className="ml-auto flex items-center gap-1.5">
          <Badge>{projectRowCount} rows</Badge>
          <Badge>{projectAreaCount} areas</Badge>
          {insertTargetNodeId ? (
            <Badge>Target: {areaOptions.find((area) => area.id === insertTargetNodeId)?.label.split(" / ").at(-1)}</Badge>
          ) : (
            <Badge tone="warning">Target required: choose an area</Badge>
          )}
          <ControlSelect
            value={insertTargetNodeId}
            onChange={(event) => onInsertTargetChange(event.target.value)}
            aria-label="Insert target area"
            wrapperClassName="h-7 min-w-44"
            className="h-7 pr-5 text-[9px]"
          >
            <option value="">Choose target area</option>
            {areaOptions.map((area) => (
              <option key={area.id} value={area.id}>{area.label}</option>
            ))}
          </ControlSelect>
        </div>
      </div>
    </header>
  );
}

function EstimateActiveGroupContext({ node, editableRows }: { node: EstimateAreaNode; editableRows: Record<string, EditableRowValue> }) {
  return (
    <div className="border-b border-hairline bg-[#F8FAFC] px-2 py-1.5" aria-label="Active estimate group context">
      <div className="mx-auto flex max-w-2xl items-center justify-center gap-2 text-center">
        <span className="flex size-6 shrink-0 items-center justify-center border border-hairline bg-white text-tertiary">
          <NodeIcon kind={node.kind} />
        </span>
        <div className="min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-tertiary">Currently active group node</p>
          <div className="flex min-w-0 items-center justify-center gap-2">
            <h2 className="truncate text-[12px] font-bold leading-4 text-ink">{node.name}</h2>
            <Badge>{groupLabel(node.kind)}</Badge>
            <span className="text-[10px] font-bold tabular-nums text-ink">{pesoFormatter.format(computeNodeTotal(node, editableRows))}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function EstimateSheetFooter({ projectTotal }: { projectTotal: number }) {
  return (
    <footer className="shrink-0 border-t border-hairline bg-white px-2 py-1.5" aria-label="Estimate sheet running totals">
      <div className="ml-auto flex w-fit items-center gap-2 text-right">
        <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-tertiary">Ongoing total project cost</span>
        <span className="font-mono text-[12px] font-bold tabular-nums text-ink">{pesoFormatter.format(projectTotal)}</span>
      </div>
    </footer>
  );
}

export function EstimateSheetContent({ selectedNodeId }: EstimateSheetContentProps) {
  const [estimateTree, setEstimateTree] = useState(sampleEstimateTree);
  const [editableRows, setEditableRows] = useState<Record<string, EditableRowValue>>(() => collectEditableRows(sampleEstimateTree));
  const [insertTargetNodeId, setInsertTargetNodeId] = useState(() => {
    const initialNode = findEstimateNode(sampleEstimateTree, selectedNodeId);
    return initialNode?.kind === "area" ? initialNode.id : "";
  });
  const [pendingFocusRowId, setPendingFocusRowId] = useState("");
  const selectedNode = findEstimateNode(estimateTree, selectedNodeId) ?? estimateTree[0];
  const areaOptions = useMemo(() => collectAreaOptions(estimateTree), [estimateTree]);
  const projectTotal = computeNodeTotal(estimateTree[0], editableRows);

  useEffect(() => {
    if (!pendingFocusRowId) return;
    window.requestAnimationFrame(() => {
      const quantityInput = document.querySelector<HTMLInputElement>(`[data-estimate-row-id="${pendingFocusRowId}"][data-estimate-cell-index="0"]`);
      quantityInput?.focus();
      quantityInput?.select();
      setPendingFocusRowId("");
    });
  }, [pendingFocusRowId]);

  const insertLibraryItem = useCallback((targetNodeId: string, libraryItem: EstimateRowItem) => {
    const targetNode = findEstimateNode(estimateTree, targetNodeId);
    if (targetNode?.kind !== "area") return;

    const newItem = cloneLibraryItemForEstimate(libraryItem, targetNodeId);
    setPendingFocusRowId(newItem.id);
    setEstimateTree((current) =>
      current.map((node) => {
        function visit(areaNode: EstimateAreaNode): EstimateAreaNode {
          if (areaNode.id === targetNodeId) {
            return { ...areaNode, estimateRowItems: [...(areaNode.estimateRowItems ?? []), newItem] };
          }
          return { ...areaNode, children: areaNode.children?.map(visit) };
        }
        return visit(node);
      }),
    );
    setEditableRows((current) => ({ ...current, [newItem.id]: getInitialEditableRow(newItem) }));
  }, [estimateTree]);

  useEffect(() => {
    function handleSidebarAdd(event: Event) {
      const customEvent = event as CustomEvent<EstimateRowItem>;
      if (customEvent.detail && insertTargetNodeId) insertLibraryItem(insertTargetNodeId, customEvent.detail);
    }
    window.addEventListener("archestimator:add-library-item", handleSidebarAdd);
    return () => window.removeEventListener("archestimator:add-library-item", handleSidebarAdd);
  }, [insertLibraryItem, insertTargetNodeId]);

  function replaceRowItem(rowItemId: string, libraryItem: EstimateRowItem) {
    setEstimateTree((current) =>
      current.map((node) => {
        function visit(areaNode: EstimateAreaNode): EstimateAreaNode {
          return {
            ...areaNode,
            estimateRowItems: areaNode.estimateRowItems?.map((item) =>
              item.id === rowItemId ? replaceRowItemWithLibraryItem(rowItemId, libraryItem) : item,
            ),
            children: areaNode.children?.map(visit),
          };
        }
        return visit(node);
      }),
    );
  }

  function deleteRowItem(rowItemId: string) {
    setEstimateTree((current) =>
      current.map((node) => {
        function visit(areaNode: EstimateAreaNode): EstimateAreaNode {
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
  }

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white" aria-label="Main estimate sheet">
      {selectedNode ? (
        <>
          <EstimateSheetHeader
            projectNode={estimateTree[0]}
            areaOptions={areaOptions}
            insertTargetNodeId={insertTargetNodeId}
            onInsertTargetChange={setInsertTargetNodeId}
          />
          <EstimateActiveGroupContext node={selectedNode} editableRows={editableRows} />
          <div className="min-h-0 flex-1 overflow-auto p-2">
            <EstimateSheetBranch
              node={selectedNode}
              editableRows={editableRows}
              setEditableRows={setEditableRows}
              onInsertLibraryItem={insertLibraryItem}
              onReplaceRowItem={replaceRowItem}
              onDeleteRowItem={deleteRowItem}
            />
          </div>
          <EstimateSheetFooter projectTotal={projectTotal} />
        </>
      ) : null}
    </section>
  );
}
