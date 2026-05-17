"use client";

import { type Dispatch, type DragEvent, type SetStateAction, useEffect, useMemo, useState } from "react";
import { ArrowsOutSimple, CaretDown, Cube, DotsSixVertical, HouseLine, Plus, Stack, Trash } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
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
  onDeleteRowItem: (rowItemId: string) => void;
  depth?: number;
};

export const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
});

function groupLabel(depth: number) {
  if (depth === 0) return "Structure group";
  if (depth === 1) return "Floor group";
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

function NodeIcon({ depth }: { depth: number }) {
  if (depth === 0) return <HouseLine size={13} weight="bold" aria-hidden="true" />;
  if (depth === 1) return <Stack size={13} weight="bold" aria-hidden="true" />;
  return <Cube size={13} weight="bold" aria-hidden="true" />;
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
    <div className="relative w-full">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={ariaLabel}
        className="h-5 w-full appearance-none border-0 border-b border-hairline bg-transparent px-0 pr-4 text-[9px] font-semibold text-ink outline-none transition-colors hover:border-tertiary focus:border-accent"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <CaretDown size={10} weight="bold" className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-tertiary" aria-hidden="true" />
    </div>
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

function EstimateMaterialCell({ item }: { item: EstimateRowItem }) {
  return (
    <div
      className="group flex h-full min-h-24 overflow-hidden border-r border-hairline bg-white"
      draggable
      aria-label={`${item.material} material row item`}
    >
      <div className="flex aspect-square h-full min-h-24 shrink-0 items-stretch justify-center p-0">
        <div
          className="h-full w-full bg-neutral-100 bg-cover bg-center"
          style={{ backgroundImage: `url(${getComponentImageUrl(item)})` }}
          aria-label={`${item.material} reference image`}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col px-1 py-1.5">
        <p className="truncate text-[11px] font-bold leading-4 text-ink">{item.material}</p>
        <p className="truncate text-[10px] font-semibold leading-4 text-tertiary">{item.supplier}</p>
        <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-secondary/60 transition-opacity group-hover:text-secondary">{item.description}</p>
      </div>

      <div className="flex w-16 shrink-0 flex-col items-end justify-end gap-3 px-1 py-1.5 text-right">
        <div>
          <p className="whitespace-nowrap text-[9px] font-bold leading-4 tabular-nums text-ink">{pesoFormatter.format(item.itemCost)}</p>
          <p className="whitespace-nowrap text-[10px] font-semibold leading-3 text-tertiary">/ {item.unit}</p>
        </div>
        <ArrowsOutSimple size={14} weight="bold" className="text-tertiary" aria-hidden="true" />
      </div>
    </div>
  );
}

function MoneyInput({
  value,
  onChange,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
}) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <input
      type="text"
      inputMode="decimal"
      value={isFocused ? value : formatEditableMoney(value)}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      onChange={(event) => onChange(event.target.value)}
      aria-label={ariaLabel}
      className="w-full rounded-sm border border-transparent bg-white/70 text-right text-[9px] font-bold tabular-nums text-ink outline-none hover:border-hairline focus:border-accent focus:bg-accentSoft"
    />
  );
}

function EstimateRowItemsTable({
  items,
  editableRows,
  setEditableRows,
  targetNodeId,
  onInsertLibraryItem,
  onDeleteRowItem,
}: {
  items: EstimateRowItem[];
  editableRows: Record<string, EditableRowValue>;
  setEditableRows: Dispatch<SetStateAction<Record<string, EditableRowValue>>>;
  targetNodeId: string;
  onInsertLibraryItem: (targetNodeId: string, libraryItem: EstimateRowItem) => void;
  onDeleteRowItem: (rowItemId: string) => void;
}) {
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
          {computedRows.map((item) => (
            <tr key={item.id} className={cn("grid min-h-24 border-b border-hairline/70 last:border-b-0 hover:bg-neutral-50", rowColumns)}>
              <td className="flex flex-col items-center justify-between border-r border-hairline py-2 text-tertiary">
                <DotsSixVertical size={14} weight="bold" aria-label={`Drag material ${item.material}`} />
                <input type="checkbox" aria-label={`Select ${item.material}`} />
                <span className="size-3" aria-hidden="true" />
              </td>
              <td className="min-w-0">
                <EstimateMaterialCell item={item} />
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
              <td className="flex flex-col items-center justify-center border-r border-hairline px-1 text-center">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.editableQuantity}
                  onChange={(event) =>
                    setEditableRows((current) => updateEditableRowValue(current, item, { quantity: event.target.value }))
                  }
                  aria-label={`${item.material} quantity`}
                  className="w-full rounded-sm border border-transparent bg-white/70 text-center text-[11px] font-bold tabular-nums text-ink outline-none hover:border-hairline focus:border-accent focus:bg-accentSoft"
                />
                <p className="text-[10px] font-semibold text-tertiary">{item.unit}</p>
              </td>
              <td className="flex items-center justify-end border-r border-hairline px-1 text-[9px] font-bold tabular-nums text-ink">{pesoFormatter.format(item.subTotal)}</td>
              <td className="flex items-center justify-end border-r border-hairline px-1">
                <MoneyInput
                  value={item.editableSupplementaryCosts}
                  onChange={(value) => setEditableRows((current) => updateEditableRowValue(current, item, { supplementaryCosts: value }))}
                  ariaLabel={`${item.material} other costs`}
                />
              </td>
              <td className="flex items-center justify-end border-r border-hairline px-1">
                <MoneyInput
                  value={item.editableLaborCost}
                  onChange={(value) => setEditableRows((current) => updateEditableRowValue(current, item, { laborCost: value }))}
                  ariaLabel={`${item.material} labor cost`}
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
          ))}
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

function EstimateSheetBranch({ node, editableRows, setEditableRows, onInsertLibraryItem, onDeleteRowItem, depth = 0 }: EstimateSheetBranchProps) {
  const [collapsed, setCollapsed] = useState(false);
  const childAreas = node.children ?? [];
  const estimateRowItems = node.estimateRowItems ?? [];
  const hasContents = childAreas.length > 0 || estimateRowItems.length > 0;
  const canReceiveRows = node.kind === "area" || node.kind === "zone";
  const leftIndent = Math.min(depth * 18, 108);
  const total = computeNodeTotal(node, editableRows);

  return (
    <section className={cn("space-y-1", groupGap(depth))} aria-label={`${node.name} ${groupLabel(depth).toLowerCase()}`}>
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
          <NodeIcon depth={depth} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[10px] font-bold text-ink">{node.name}</p>
          <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-tertiary">{groupLabel(depth)}</p>
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

export function EstimateSheetContent({ selectedNodeId }: EstimateSheetContentProps) {
  const [estimateTree, setEstimateTree] = useState(sampleEstimateTree);
  const [editableRows, setEditableRows] = useState<Record<string, EditableRowValue>>(() => collectEditableRows(sampleEstimateTree));
  const selectedNode = findEstimateNode(estimateTree, selectedNodeId) ?? estimateTree[0];

  function insertLibraryItem(targetNodeId: string, libraryItem: EstimateRowItem) {
    const newItem = cloneLibraryItemForEstimate(libraryItem, targetNodeId);
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
  }

  useEffect(() => {
    function handleSidebarAdd(event: Event) {
      const customEvent = event as CustomEvent<EstimateRowItem>;
      if (customEvent.detail) insertLibraryItem(selectedNodeId, customEvent.detail);
    }
    window.addEventListener("archestimator:add-library-item", handleSidebarAdd);
    return () => window.removeEventListener("archestimator:add-library-item", handleSidebarAdd);
  }, [selectedNodeId]);

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
    <section className="min-h-0 min-w-0 flex-1 overflow-auto bg-white p-2" aria-label="Main estimate sheet">
      {selectedNode ? (
        <EstimateSheetBranch
          node={selectedNode}
          editableRows={editableRows}
          setEditableRows={setEditableRows}
          onInsertLibraryItem={insertLibraryItem}
          onDeleteRowItem={deleteRowItem}
        />
      ) : null}
    </section>
  );
}
