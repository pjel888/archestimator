import type { KeyboardEvent } from "react";

import { classifyEstimateRowSource, isExpressComponentRow, readProjectComponentProjectionMetadata } from "@/lib/estimates/express-components";
import { isBlankEstimateRowItem } from "../activity-history-model";
import type { EstimateRowItem } from "../../estimate-tree-data";

function focusEstimateCell(rowIndex: number, cellIndex: number) {
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

function isProjectSpecificRowItem(item: EstimateRowItem) {
  const projection = readProjectComponentProjectionMetadata(item.metadata);
  return item.linkState === "detached" || projection?.classification === "detached-library";
}

export function canMakeProjectSpecific(item: EstimateRowItem) {
  if (isBlankEstimateRowItem(item) || isProjectSpecificRowItem(item) || isExpressComponentRow(item)) return false;
  return Boolean(item.sourceLibraryItemId || item.linkState?.startsWith("linked") || item.linkState === "source-changed");
}

export function canPromoteEstimateRowToLibrary(item: EstimateRowItem) {
  return isExpressComponentRow(item) || isProjectSpecificRowItem(item);
}
