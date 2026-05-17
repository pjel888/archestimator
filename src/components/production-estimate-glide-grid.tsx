"use client";

import DataEditor, { type EditableGridCell, type GridSelection, type Item } from "@glideapps/glide-data-grid";
import "@glideapps/glide-data-grid/dist/index.css";
import type { Estimate } from "@/lib/local-data/schemas";
import {
  buildEstimateGridRows,
  estimateGridColumns,
  getEstimateGridCellFromRows,
} from "@/lib/estimate-grid/adapter";

type ProductionEstimateGlideGridProps = {
  estimate: Estimate;
  currencyCode: string;
  onCellEdited: (cell: Item, nextCell: EditableGridCell) => void;
  onCellSelected?: (cell: Item) => void;
  onVisibleRowOffsetChange?: (rowOffset: number) => void;
};

export function ProductionEstimateGlideGrid({ estimate, currencyCode, onCellEdited, onCellSelected, onVisibleRowOffsetChange }: ProductionEstimateGlideGridProps) {
  const rows = buildEstimateGridRows(estimate);

  function handleGridSelectionChange(selection: GridSelection) {
    const cell = selection.current?.cell;
    if (cell) onCellSelected?.(cell);
  }

  return (
    <div className="h-[430px] rounded-2xl border border-hairline" data-testid="production-estimate-glide-grid">
      <DataEditor
        columns={estimateGridColumns}
        getCellContent={(cell) => getEstimateGridCellFromRows(estimate, rows, cell, currencyCode)}
        rows={rows.length}
        rowHeight={36}
        headerHeight={36}
        rowMarkers="number"
        smoothScrollX
        smoothScrollY
        onCellEdited={onCellEdited}
        onCellClicked={(cell) => onCellSelected?.(cell)}
        onGridSelectionChange={handleGridSelectionChange}
        onVisibleRegionChanged={(range) => onVisibleRowOffsetChange?.(Math.max(0, range.y))}
        width="100%"
        height="100%"
      />
    </div>
  );
}
