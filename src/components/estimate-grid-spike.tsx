"use client";

import { useMemo, useRef, useState } from "react";
import DataEditor, { type EditableGridCell, type Item } from "@glideapps/glide-data-grid";
import "@glideapps/glide-data-grid/dist/index.css";
import { DndContext, DragOverlay, type DragEndEvent, type DragMoveEvent, type DragStartEvent, PointerSensor, useDraggable, useSensor, useSensors } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { CostLibraryItem, Estimate, LocalDatabase } from "@/lib/local-data/schemas";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { calculateEstimateTotals } from "@/lib/estimates/totals";
import { formatMoney } from "@/lib/money/format";
import {
  applyEstimateGridEdit,
  buildEstimateGridRows,
  estimateGridColumns,
  getEstimateGridCellFromRows,
  insertLibraryItemAtGridRow,
  resolveGridInsertionTarget,
} from "@/lib/estimate-grid/adapter";

const GRID_HEADER_HEIGHT = 36;
const GRID_ROW_HEIGHT = 36;

type EstimateGridSpikeProps = {
  database: LocalDatabase;
  projectId: string;
};

export function EstimateGridSpike({ database, projectId }: EstimateGridSpikeProps) {
  const project = database.projects.find((item) => item.id === projectId) ?? database.projects[0];
  const initialEstimate = database.estimates.find((item) => item.id === project.currentEstimateId) ?? database.estimates[0];
  const [estimate, setEstimate] = useState<Estimate>(initialEstimate);
  const [dropRow, setDropRow] = useState(estimate.lineItems.length);
  const [activeLibraryId, setActiveLibraryId] = useState<string | null>(null);
  const [dropIntent, setDropIntent] = useState<"idle" | "valid" | "outside">("idle");
  const [visibleRowOffset, setVisibleRowOffset] = useState(0);
  const gridFrameRef = useRef<HTMLDivElement | null>(null);
  const visibleRowOffsetRef = useRef(0);
  const rows = useMemo(() => buildEstimateGridRows(estimate), [estimate]);
  const totals = useMemo(() => calculateEstimateTotals(estimate), [estimate]);
  const activeLibraryItem = database.costLibraryItems.find((item) => item.id === activeLibraryId);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const target = resolveGridInsertionTarget(estimate, rows, dropRow);
  const targetSection = estimate.sections.find((section) => section.id === target.sectionId);
  const visibleDropRow = Math.max(0, Math.min(rows.length, dropRow - visibleRowOffset));

  function handleCellEdited(cell: Item, newValue: EditableGridCell) {
    setEstimate((current) => applyEstimateGridEdit(current, cell, newValue));
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveLibraryId(extractLibraryId(event.active.id));
  }

  function handleDragMove(event: DragMoveEvent) {
    const pointer = getPointerCoordinates(event.activatorEvent);
    const gridRect = gridFrameRef.current?.getBoundingClientRect();
    if (!pointer || !gridRect) return;

    const pointerY = pointer.y + event.delta.y;
    const pointerX = pointer.x + event.delta.x;
    const isInsideGrid = pointerX >= gridRect.left && pointerX <= gridRect.right && pointerY >= gridRect.top && pointerY <= gridRect.bottom;
    if (!isInsideGrid) {
      setDropIntent("outside");
      return;
    }

    const visibleRow = Math.round((pointerY - gridRect.top - GRID_HEADER_HEIGHT) / GRID_ROW_HEIGHT);
    const nextRow = Math.max(0, Math.min(rows.length, visibleRowOffsetRef.current + visibleRow));
    setDropRow(nextRow);
    setDropIntent("valid");
  }

  function handleDragEnd(event: DragEndEvent) {
    const libraryId = extractLibraryId(event.active.id);
    const libraryItem = database.costLibraryItems.find((item) => item.id === libraryId);
    if (libraryItem && dropIntent === "valid") {
      setEstimate((current) => insertLibraryItemAtGridRow(current, libraryItem, dropRow));
    }
    setActiveLibraryId(null);
    setDropIntent("idle");
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragMove={handleDragMove} onDragEnd={handleDragEnd} onDragCancel={() => {
      setActiveLibraryId(null);
      setDropIntent("idle");
    }}>
      <div className="grid min-h-[720px] gap-2 xl:grid-cols-[230px_minmax(0,1fr)_340px]">
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="border-b border-hairline p-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Space tree</p>
              <CardTitle className="mt-1 text-base">Estimate by area</CardTitle>
              <CardDescription>Legacy v4-inspired hierarchy: organize work by space, consolidate later for proposal output.</CardDescription>
            </div>
            <div className="space-y-2 p-2" data-testid="space-tree">
              <TreeRow depth={0} label="Main House" meta="structure" active={false} />
              {estimate.sections.map((section, index) => {
                const sectionRows = rows.filter((row) => row.kind === "line" && row.sectionId === section.id).length;
                const isTarget = targetSection?.id === section.id && dropIntent === "valid";
                return <TreeRow key={section.id} depth={1} label={section.name} meta={`${section.outlineCode} · ${sectionRows} items`} active={isTarget || index === 0} />;
              })}
            </div>
            <div className="border-t border-hairline bg-surface-muted/50 p-2 text-xs leading-relaxed text-muted">
              Workspace view can be room/space-first. Proposal/PDF output remains consolidated by BOQ sections and commercial terms.
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline p-2">
              <div>
                <CardTitle>Space-organized estimate sheet</CardTitle>
                <CardDescription>Glide grid with stable dnd-kit overlay targeting. No native DataTransfer dependency.</CardDescription>
              </div>
              <div className="rounded-2xl bg-foreground px-2 py-2 text-right text-white">
                <p className="text-xs text-white/65">Live total</p>
                <p className="font-mono text-lg font-semibold">{formatMoney(totals.grandTotal, database.workspace.defaultCurrency)}</p>
              </div>
            </div>
            <div ref={gridFrameRef} className="relative h-[590px] p-2" data-testid="estimate-grid-spike">
              {dropIntent === "valid" ? <div className="pointer-events-none absolute left-3 right-3 z-10 h-1 rounded-full bg-accent shadow-[0_0_0_4px_rgba(254,243,199,0.85)]" style={{ top: 12 + GRID_HEADER_HEIGHT + visibleDropRow * GRID_ROW_HEIGHT - 2 }} data-testid="grid-drop-indicator" /> : null}
              <DataEditor
                columns={estimateGridColumns}
                getCellContent={(cell) => getEstimateGridCellFromRows(estimate, rows, cell, database.workspace.defaultCurrency)}
                rows={rows.length}
                rowHeight={GRID_ROW_HEIGHT}
                headerHeight={GRID_HEADER_HEIGHT}
                rowMarkers="number"
                smoothScrollX
                smoothScrollY
                onCellEdited={handleCellEdited}
                onVisibleRegionChanged={(range) => {
                  const nextVisibleRowOffset = Math.max(0, range.y);
                  visibleRowOffsetRef.current = nextVisibleRowOffset;
                  setVisibleRowOffset(nextVisibleRowOffset);
                }}
                width="100%"
                height="100%"
              />
            </div>
            <div className="flex items-center justify-between border-t border-hairline bg-surface-muted/50 px-2 py-2 text-xs text-muted">
              <span>Insert into: {targetSection ? `${targetSection.outlineCode} · ${targetSection.name}` : "none"}</span>
              <span className="font-mono">insertion line {dropRow + 1}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="border-b border-hairline p-2">
              <CardTitle>Material library drag tray</CardTitle>
              <CardDescription>Cards lift into a drag overlay; the tray itself stays fixed, so the layout does not jump.</CardDescription>
            </div>
            <div className="space-y-2 p-2" data-testid="library-drag-tray">
              {database.costLibraryItems.slice(0, 8).map((item) => <DraggableLibraryItem key={item.id} item={item} currency={database.workspace.defaultCurrency} />)}
            </div>
            <div className="border-t border-hairline p-2">
              <label className="block text-sm font-medium text-foreground" htmlFor="drop-row">Fallback insert row</label>
              <input id="drop-row" className="mt-2 w-full rounded-xl border border-hairline bg-white px-2 py-2 font-mono text-sm" min={0} max={rows.length} type="number" value={dropRow} onChange={(event) => setDropRow(Number(event.target.value))} />
              <Button className="mt-3 w-full" onClick={() => {
                const first = database.costLibraryItems[0];
                if (first) setEstimate((current) => insertLibraryItemAtGridRow(current, first, dropRow));
              }}>Click insert first item</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <DragOverlay dropAnimation={{ duration: 140, easing: "cubic-bezier(0.2, 0, 0, 1)" }}>
        {activeLibraryItem ? <LibraryDragPreview item={activeLibraryItem} currency={database.workspace.defaultCurrency} /> : null}
      </DragOverlay>
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
      className={`w-full rounded-2xl border border-hairline bg-white p-2 text-left shadow-sm transition-[border-color,box-shadow,opacity] ${isDragging ? "opacity-35" : "cursor-grab hover:border-accent hover:shadow-md active:cursor-grabbing"}`}
      type="button"
      {...listeners}
      {...attributes}
    >
      <LibraryCardContent item={item} currency={currency} />
    </button>
  );
}

function LibraryDragPreview({ item, currency }: { item: CostLibraryItem; currency: string }) {
  return (
    <div className="w-[300px] rotate-1 rounded-2xl border border-accent bg-white p-2 text-left shadow-2xl ring-4 ring-accentSoft">
      <LibraryCardContent item={item} currency={currency} />
      <p className="mt-3 rounded-lg bg-accentSoft px-2 py-1 text-xs font-semibold text-accentDark">Drop into a section row</p>
    </div>
  );
}

function LibraryCardContent({ item, currency }: { item: CostLibraryItem; currency: string }) {
  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium leading-snug">{item.name}</p>
        <span className="shrink-0 rounded-md bg-surface-muted px-2 py-1 text-[11px] font-semibold text-muted">{item.itemType}</span>
      </div>
      <p className="mt-1 text-xs text-muted">{item.category} · {item.unit}</p>
      <p className="mt-2 font-mono text-sm font-semibold">{formatMoney(item.defaultUnitCost, currency)}</p>
      <p className="mt-1 text-[11px] text-muted">Pricing date: {item.pricingDate}</p>
    </>
  );
}

function TreeRow({ depth, label, meta, active }: { depth: number; label: string; meta: string; active: boolean }) {
  return (
    <div className={`rounded-xl border px-2 py-2 text-sm transition ${active ? "border-accent bg-accentSoft/60" : "border-transparent bg-white"}`} style={{ marginLeft: depth * 14 }}>
      <div className="flex items-center gap-2">
        <span className="text-muted">▾</span>
        <span className="font-semibold text-foreground">{label}</span>
      </div>
      <p className="ml-5 mt-0.5 text-xs text-muted">{meta}</p>
    </div>
  );
}

function extractLibraryId(id: string | number): string {
  return String(id).replace("library-item:", "");
}

function getPointerCoordinates(event: Event): { x: number; y: number } | null {
  if (event instanceof MouseEvent) return { x: event.clientX, y: event.clientY };
  if (event instanceof TouchEvent) {
    const touch = event.touches[0] ?? event.changedTouches[0];
    return touch ? { x: touch.clientX, y: touch.clientY } : null;
  }
  return null;
}
