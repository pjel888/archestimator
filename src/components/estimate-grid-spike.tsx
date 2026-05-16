"use client";

import { useMemo, useState } from "react";
import DataEditor, { type EditableGridCell, type Item } from "@glideapps/glide-data-grid";
import "@glideapps/glide-data-grid/dist/index.css";
import { DndContext, type DragEndEvent, useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { CostLibraryItem, Estimate, LocalDatabase } from "@/lib/local-data/schemas";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { calculateEstimateTotals } from "@/lib/estimates/totals";
import { formatMoney } from "@/lib/money/format";
import { applyEstimateGridEdit, estimateGridColumns, getEstimateGridCell, insertLibraryItemAtGridRow } from "@/lib/estimate-grid/adapter";

type EstimateGridSpikeProps = {
  database: LocalDatabase;
  projectId: string;
};

export function EstimateGridSpike({ database, projectId }: EstimateGridSpikeProps) {
  const project = database.projects.find((item) => item.id === projectId) ?? database.projects[0];
  const initialEstimate = database.estimates.find((item) => item.id === project.currentEstimateId) ?? database.estimates[0];
  const [estimate, setEstimate] = useState<Estimate>(initialEstimate);
  const [dropRow, setDropRow] = useState(estimate.lineItems.length);
  const totals = useMemo(() => calculateEstimateTotals(estimate), [estimate]);

  function handleCellEdited(cell: Item, newValue: EditableGridCell) {
    setEstimate((current) => applyEstimateGridEdit(current, cell, newValue));
  }

  function handleDrop(event: DragEndEvent) {
    const libraryId = String(event.active.id).replace("library-item:", "");
    const libraryItem = database.costLibraryItems.find((item) => item.id === libraryId);
    if (!libraryItem) return;
    setEstimate((current) => insertLibraryItemAtGridRow(current, libraryItem, dropRow));
    setDropRow((current) => current + 1);
  }

  return (
    <DndContext onDragEnd={handleDrop}>
      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline p-5">
              <div>
                <CardTitle>Glide estimate sheet spike</CardTitle>
                <CardDescription>Spreadsheet-like canvas backed by canonical Estimate data through an adapter.</CardDescription>
              </div>
              <div className="rounded-2xl bg-foreground px-4 py-3 text-right text-white">
                <p className="text-xs text-white/65">Live total</p>
                <p className="font-mono text-lg font-semibold">{formatMoney(totals.grandTotal, database.workspace.defaultCurrency)}</p>
              </div>
            </div>
            <div className="h-[560px] p-3" data-testid="estimate-grid-spike">
              <DataEditor
                columns={estimateGridColumns}
                getCellContent={(cell) => getEstimateGridCell(estimate, cell)}
                rows={estimate.lineItems.length}
                rowMarkers="number"
                smoothScrollX
                smoothScrollY
                onCellEdited={handleCellEdited}
                onDragOverCell={(cell) => setDropRow(cell[1])}
                onDrop={(cell, dataTransfer) => {
                  const libraryId = dataTransfer?.getData("application/x-archestimator-library-item");
                  const libraryItem = database.costLibraryItems.find((item) => item.id === libraryId);
                  if (libraryItem) setEstimate((current) => insertLibraryItemAtGridRow(current, libraryItem, cell[1]));
                }}
                width="100%"
                height="100%"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <CardTitle>Material library drag tray</CardTitle>
            <CardDescription>Drag a library item, then drop over the estimate grid. The spike inserts a copied editable row.</CardDescription>
            <label className="mt-4 block text-sm font-medium text-foreground" htmlFor="drop-row">Fallback insert row</label>
            <input id="drop-row" className="mt-2 w-full rounded-xl border border-hairline bg-white px-3 py-2 font-mono text-sm" min={0} max={estimate.lineItems.length} type="number" value={dropRow} onChange={(event) => setDropRow(Number(event.target.value))} />
            <div className="mt-4 space-y-3">
              {database.costLibraryItems.slice(0, 8).map((item) => <DraggableLibraryItem key={item.id} item={item} currency={database.workspace.defaultCurrency} />)}
            </div>
            <Button className="mt-4 w-full" onClick={() => {
              const first = database.costLibraryItems[0];
              if (first) setEstimate((current) => insertLibraryItemAtGridRow(current, first, dropRow));
            }}>Click insert first item</Button>
          </CardContent>
        </Card>
      </div>
    </DndContext>
  );
}

function DraggableLibraryItem({ item, currency }: { item: CostLibraryItem; currency: string }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: `library-item:${item.id}` });
  const style = { transform: CSS.Translate.toString(transform) };

  return (
    <button
      ref={setNodeRef}
      style={style}
      className={`w-full cursor-grab rounded-2xl border border-hairline bg-white p-4 text-left shadow-sm transition ${isDragging ? "opacity-60 ring-2 ring-accent" : "hover:border-accent"}`}
      type="button"
      draggable
      onDragStart={(event) => event.dataTransfer.setData("application/x-archestimator-library-item", item.id)}
      {...listeners}
      {...attributes}
    >
      <p className="font-medium">{item.name}</p>
      <p className="mt-1 text-xs text-muted">{item.category} · {item.unit}</p>
      <p className="mt-2 font-mono text-sm font-semibold">{formatMoney(item.defaultUnitCost, currency)}</p>
    </button>
  );
}
