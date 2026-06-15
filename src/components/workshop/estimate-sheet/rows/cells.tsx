"use client";

import { useState, type DragEvent, type InputHTMLAttributes, type KeyboardEvent, type MouseEvent } from "react";
import { Cube, DotsSixVertical, DotsThreeVertical, Plus, Trash } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { ControlInput } from "@/components/ui/control-input";
import { cn } from "@/lib/ui/cn";
import {
  BLANK_ESTIMATE_ROW_COMPONENT_LABEL,
  getComponentImageUrl as getMaterialCardImageUrl,
  isBlankEstimateRowItem,
  pesoFormatter,
  type EstimateMaterialCardItem,
} from "../activity-history";
import type { EstimateRowItem } from "../../estimate-tree-data";
import {
  ESTIMATE_COMPONENT_DRAG_MIME_TYPE,
  LIBRARY_ITEM_DRAG_MIME_TYPE,
  readEstimateComponentDragPayload,
  type EstimateComponentDragPayload,
} from "./constants";
import { formatEditableMoney } from "./editable-row-model";

export function focusEstimateCell(rowIndex: number, cellIndex: number) {
  const nextCell = document.querySelector<HTMLInputElement | HTMLSelectElement>(
    `[data-estimate-row-index="${rowIndex}"][data-estimate-cell-index="${cellIndex}"]`,
  );
  nextCell?.focus();
  if (nextCell instanceof HTMLInputElement) nextCell.select();
}

export function focusEstimateCellByRowId(rowId: string, cellIndex: number) {
  const escapedRowId = typeof CSS !== "undefined" && CSS.escape
    ? CSS.escape(rowId)
    : rowId.replace(/"/g, '\\"');
  const nextCell = document.querySelector<HTMLInputElement | HTMLSelectElement>(
    `[data-estimate-row-id="${escapedRowId}"][data-estimate-cell-index="${cellIndex}"]`,
  );
  nextCell?.focus();
  if (nextCell instanceof HTMLInputElement) nextCell.select();
  return Boolean(nextCell);
}

export function handleEstimateCellKeyDown(
  event: KeyboardEvent<HTMLInputElement | HTMLSelectElement>,
  rowIndex: number,
  cellIndex: number,
  rowIds?: readonly string[],
  requestFocusByRowId?: (rowId: string, cellIndex: number) => void,
) {
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
  const targetRowId = rowIds?.[target[0]];
  if (targetRowId && requestFocusByRowId && !focusEstimateCellByRowId(targetRowId, target[1])) {
    requestFocusByRowId(targetRowId, target[1]);
    return;
  }
  focusEstimateCell(target[0], target[1]);
}

export function isProjectSpecificRowItem(item: EstimateRowItem) {
  return item.linkState === "detached";
}

export function canMakeProjectSpecific(item: EstimateRowItem) {
  if (isBlankEstimateRowItem(item) || isProjectSpecificRowItem(item)) return false;
  return Boolean(item.sourceLibraryItemId || item.linkState?.startsWith("linked") || item.linkState === "source-changed");
}

export function EstimateMaterialCardContent({ item }: { item: EstimateMaterialCardItem }) {
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

export function EstimateMaterialCell({
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

  // No onDragEnd clear: a cancelled or failed drag must NOT delete the
  // component (OD-14). A real move is committed by the target cell's drop, which
  // calls moveRowComponent -> it clears the source itself. The ONLY destructive
  // removal is the explicit Delete action below.

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

export function MoneyInput({
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
