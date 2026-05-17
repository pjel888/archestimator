"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import type { EditableGridCell, Item } from "@glideapps/glide-data-grid";
import { DndContext, DragOverlay, type DragEndEvent, type DragMoveEvent, type DragStartEvent, PointerSensor, useDraggable, useSensor, useSensors } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Plus, RotateCcw, Trash2 } from "lucide-react";
import type { CostLibraryItem, Estimate, EstimateLineItem, EstimateSpace, LocalDatabase, ProposalTerms, RevisionChangeRecord } from "@/lib/local-data/schemas";
import { compareEstimateRevisions } from "@/lib/estimates/revision-diff";
import { calculateEstimateTotals } from "@/lib/estimates/totals";
import { createLineItemFromLibraryItem, detectLinkStateAfterEdit } from "@/lib/estimates/library-insert";
import { copyEstimateLineToSpace, moveEstimateLineToSpace, upsertCostLibraryItem } from "@/lib/local-data/mutations";
import { StatusPill } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Textarea, TextInput } from "@/components/ui/field";
import { StatCard } from "@/components/ui/stat-card";
import { TabButton, TabList } from "@/components/ui/tabs";
import { formatMoney } from "@/lib/money/format";
import { createDefaultProposalTerms } from "@/lib/proposals/terms";
import {
  applyEstimateGridEdit,
  buildEstimateGridRows,
  insertLibraryItemAtGridRow,
  resolveDefaultProposalSectionId,
  resolveDefaultSpaceId,
  resolveGridInsertionTarget,
} from "@/lib/estimate-grid/adapter";

const GRID_HEADER_HEIGHT = 36;
const GRID_ROW_HEIGHT = 36;

const ProductionEstimateGlideGrid = dynamic(
  () => import("@/components/production-estimate-glide-grid").then((module) => module.ProductionEstimateGlideGrid),
  {
    ssr: false,
    loading: () => <div className="h-[430px] rounded-2xl border border-dashed border-hairline bg-surface-muted p-4 text-sm text-muted">Loading production estimate grid…</div>,
  },
);

type EstimateWorkspaceProps = {
  database: LocalDatabase;
  projectId?: string;
  onSaveEstimate?: (estimate: Estimate) => Promise<void>;
  onDuplicateRevision?: (estimateId: string) => Promise<void>;
  onIssueProposalSnapshot?: (estimate: Estimate, terms: ProposalTerms) => Promise<void>;
  onSaveCostLibraryItem?: (item: CostLibraryItem) => Promise<void>;
};

type WorkspaceTab = "library" | "versions" | "proposal";
type Project = LocalDatabase["projects"][number];

const scopeOptions: EstimateLineItem["scopeStatus"][] = [
  "included",
  "excluded",
  "owner-supplied",
  "osci",
  "by-others",
  "allowance",
  "provisional",
  "verify-architect",
  "verify-site-condition",
];

function parseNumberInput(value: string) {
  if (value.trim() === "") return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function nextRevisionLabel(versionNumber: number) {
  return `Rev ${String(versionNumber).padStart(2, "0")}`;
}

function formatSpacePath(estimate: Estimate, spaceId?: string) {
  if (!spaceId) return "Unassigned location";
  const space = estimate.spaces.find((entry) => entry.id === spaceId);
  if (!space) return "Unassigned location";
  const floor = estimate.floors.find((entry) => entry.id === space.floorId);
  return [floor?.name, space.name].filter(Boolean).join(" / ") || space.name;
}

export function EstimateWorkspace({ database, projectId, onSaveEstimate, onDuplicateRevision, onIssueProposalSnapshot, onSaveCostLibraryItem }: EstimateWorkspaceProps) {
  const project = projectId ? database.projects.find((item) => item.id === projectId) : database.projects[0];
  const initialEstimate = database.estimates.find((item) => item.id === project?.currentEstimateId) ?? database.estimates[0];

  if (!project || !initialEstimate) return <EmptyLocalEstimateState />;

  return <EstimateWorkspaceInner database={database} project={project} initialEstimate={initialEstimate} onSaveEstimate={onSaveEstimate} onDuplicateRevision={onDuplicateRevision} onIssueProposalSnapshot={onIssueProposalSnapshot} onSaveCostLibraryItem={onSaveCostLibraryItem} />;
}

function EmptyLocalEstimateState() {
  return (
    <main className="min-h-screen bg-background p-8 text-foreground">
      <Card className="mx-auto max-w-3xl p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-accent">Archestimator</p>
        <h1 className="mt-3 text-3xl font-bold tracking-[-0.04em]">No local estimate is available.</h1>
        <p className="mt-3 text-muted">Check `data/local/seed.json` and make sure it contains at least one project and estimate.</p>
      </Card>
    </main>
  );
}

type EstimateWorkspaceInnerProps = {
  database: LocalDatabase;
  project: Project;
  initialEstimate: Estimate;
  onSaveEstimate?: (estimate: Estimate) => Promise<void>;
  onDuplicateRevision?: (estimateId: string) => Promise<void>;
  onIssueProposalSnapshot?: (estimate: Estimate, terms: ProposalTerms) => Promise<void>;
  onSaveCostLibraryItem?: (item: CostLibraryItem) => Promise<void>;
};

function EstimateWorkspaceInner({ database, project, initialEstimate, onSaveEstimate, onDuplicateRevision, onIssueProposalSnapshot, onSaveCostLibraryItem }: EstimateWorkspaceInnerProps) {
  const [estimate, setEstimate] = useState<Estimate>(initialEstimate);
  const [proposalTerms, setProposalTerms] = useState<ProposalTerms>(() => createDefaultProposalTerms(database, initialEstimate));
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("library");
  const [savedVersions, setSavedVersions] = useState<Estimate[]>(() => {
    const projectVersions = database.estimates.filter((item) => item.projectId === project.id);
    return projectVersions.length ? projectVersions : [initialEstimate];
  });
  const [selectedSectionId, setSelectedSectionIdState] = useState(initialEstimate.sections[0]?.id ?? "section_default");
  const [activeLibraryId, setActiveLibraryId] = useState<string | null>(null);
  const [libraryItems, setLibraryItems] = useState<CostLibraryItem[]>(database.costLibraryItems);
  const [selectedLibraryId, setSelectedLibraryId] = useState(database.costLibraryItems[0]?.id ?? "");
  const [dropRow, setDropRow] = useState(0);
  const [dropIntent, setDropIntent] = useState<"idle" | "valid" | "outside">("idle");
  const [visibleRowOffset, setVisibleRowOffset] = useState(0);
  const [selectedGridLineId, setSelectedGridLineId] = useState(initialEstimate.lineItems[0]?.id ?? "");
  const selectedSectionIdRef = useRef(selectedSectionId);
  const gridFrameRef = useRef<HTMLDivElement | null>(null);
  const visibleRowOffsetRef = useRef(0);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function setSelectedSectionId(value: string) {
    selectedSectionIdRef.current = value;
    setSelectedSectionIdState(value);
  }

  const totals = useMemo(() => calculateEstimateTotals(estimate), [estimate]);
  const gridRows = useMemo(() => buildEstimateGridRows(estimate), [estimate]);
  const currencyCode = database.workspace.defaultCurrency;
  const savedProposals = database.proposalSnapshots.filter((snapshot) => snapshot.projectId === project.id);
  const savedRevisionRecords = (database.revisionChangeRecords ?? []).filter((record) => record.projectId === project.id);
  const activeLibraryItem = libraryItems.find((item) => item.id === activeLibraryId);
  const insertionTarget = resolveGridInsertionTarget(estimate, gridRows, dropRow);
  const insertionTargetSection = estimate.sections.find((section) => section.id === insertionTarget.sectionId);
  const visibleDropRow = Math.max(0, Math.min(gridRows.length, dropRow - visibleRowOffset));
  const selectedGridLine = estimate.lineItems.find((line) => line.id === selectedGridLineId) ?? estimate.lineItems[0];

  function updateTerms(patch: Partial<ProposalTerms>) {
    setProposalTerms((current) => ({ ...current, ...patch }));
  }

  function updateLine(lineId: string, patch: Partial<EstimateLineItem>, changedField?: keyof EstimateLineItem) {
    setEstimate((current) => ({
      ...current,
      lineItems: current.lineItems.map((line) => {
        if (line.id !== lineId) return line;
        const nextLine = { ...line, ...patch };
        if (changedField) nextLine.linkState = detectLinkStateAfterEdit(line, changedField);
        return nextLine;
      }),
    }));
  }

  function updateGridCell(cell: Item, nextCell: EditableGridCell) {
    const row = gridRows[cell[1]];
    if (row?.kind === "line") setSelectedGridLineId(row.lineItemId);
    setEstimate((current) => applyEstimateGridEdit(current, cell, nextCell));
  }

  function selectGridCell(cell: Item) {
    const row = gridRows[cell[1]];
    if (row?.kind === "line") setSelectedGridLineId(row.lineItemId);
  }

  function resolveSelectedProposalSectionId(current: Estimate, workingSectionId = selectedSectionIdRef.current) {
    return resolveDefaultProposalSectionId(current, workingSectionId);
  }

  function addBlankRow(targetSectionId = selectedSectionIdRef.current) {
    const newLine: EstimateLineItem = {
      id: `line_manual_${Date.now()}`,
      sectionId: targetSectionId,
      proposalSectionId: resolveDefaultProposalSectionId(estimate, targetSectionId),
      spaceId: resolveDefaultSpaceId(estimate, targetSectionId),
      itemName: "Untitled estimate item",
      description: "Manual row — edit description, quantity, unit, and cost.",
      quantity: 1,
      unit: "lot",
      unitCost: 0,
      scopeStatus: "included",
      linkState: "manual",
    };
    setEstimate((current) => ({ ...current, lineItems: [...current.lineItems, newLine] }));
    setSelectedGridLineId(newLine.id);
  }

  function addLibraryItem(item: CostLibraryItem, targetSectionId = selectedSectionIdRef.current) {
    const newLine = { ...createLineItemFromLibraryItem(item, targetSectionId, resolveSelectedProposalSectionId(estimate, targetSectionId)), spaceId: resolveDefaultSpaceId(estimate, targetSectionId) };
    setEstimate((current) => ({ ...current, lineItems: [...current.lineItems, newLine] }));
    setSelectedGridLineId(newLine.id);
  }

  function handleVisibleRowOffsetChange(rowOffset: number) {
    visibleRowOffsetRef.current = rowOffset;
    setVisibleRowOffset(rowOffset);
  }

  function handleLibraryDragStart(event: DragStartEvent) {
    setActiveLibraryId(extractLibraryId(event.active.id));
  }

  function handleLibraryDragMove(event: DragMoveEvent) {
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
    setDropRow(Math.max(0, Math.min(gridRows.length, visibleRowOffsetRef.current + visibleRow)));
    setDropIntent("valid");
  }

  function handleLibraryDragEnd(event: DragEndEvent) {
    const libraryId = extractLibraryId(event.active.id);
    const libraryItem = libraryItems.find((item) => item.id === libraryId);
    if (libraryItem && dropIntent === "valid") {
      setEstimate((current) => {
        const next = insertLibraryItemAtGridRow(current, libraryItem, dropRow);
        const inserted = next.lineItems.find((line) => !current.lineItems.some((existing) => existing.id === line.id));
        if (inserted) setSelectedGridLineId(inserted.id);
        return next;
      });
      setActiveTab("library");
    }
    setActiveLibraryId(null);
    setDropIntent("idle");
  }

  function clearLibraryDragState() {
    setActiveLibraryId(null);
    setDropIntent("idle");
  }

  function insertLibraryItemAtCurrentDropRow() {
    const item = libraryItems.find((entry) => entry.id === selectedLibraryId) ?? libraryItems[0];
    if (!item) return;
    setEstimate((current) => {
      const next = insertLibraryItemAtGridRow(current, item, dropRow);
      const inserted = next.lineItems.find((line) => !current.lineItems.some((existing) => existing.id === line.id));
      if (inserted) setSelectedGridLineId(inserted.id);
      return next;
    });
  }

  function deleteGridLine(lineId: string) {
    setEstimate((current) => {
      const remaining = current.lineItems.filter((line) => line.id !== lineId);
      if (selectedGridLineId === lineId) setSelectedGridLineId(remaining[0]?.id ?? "");
      return { ...current, lineItems: remaining };
    });
  }

  function resetFromLibrary(line: EstimateLineItem) {
    const source = libraryItems.find((item) => item.id === line.sourceLibraryItemId);
    if (!source) return;
    const resetLine = createLineItemFromLibraryItem(source, line.sectionId, line.proposalSectionId ?? resolveSelectedProposalSectionId(estimate));
    updateLine(line.id, {
      itemName: resetLine.itemName,
      description: resetLine.description,
      unit: resetLine.unit,
      materialUnitCost: resetLine.materialUnitCost,
      laborUnitCost: resetLine.laborUnitCost,
      unitCost: resetLine.unitCost,
      pricingDate: resetLine.pricingDate,
      wastePercent: resetLine.wastePercent,
      linkState: "linked-clean",
    });
  }

  function saveLibraryItem(item: CostLibraryItem) {
    const nextDatabase = upsertCostLibraryItem({ ...database, costLibraryItems: libraryItems }, item);
    setLibraryItems(nextDatabase.costLibraryItems);
    const savedItem = nextDatabase.costLibraryItems.find((entry) => entry.id === (item.id || nextDatabase.costLibraryItems[0]?.id));
    if (savedItem) setSelectedLibraryId(savedItem.id);
    void onSaveCostLibraryItem?.(savedItem ?? nextDatabase.costLibraryItems[0]);
  }

  function moveSelectedLineToSpace(targetSpaceId: string) {
    if (!selectedGridLineId || !targetSpaceId) return;
    setEstimate((current) => moveEstimateLineToSpace(current, selectedGridLineId, targetSpaceId));
  }

  function copySelectedLineToSpace(targetSpaceId: string) {
    if (!selectedGridLineId || !targetSpaceId) return;
    const nextLineId = `line_${Date.now()}`;
    setEstimate((current) => copyEstimateLineToSpace(current, selectedGridLineId, targetSpaceId, nextLineId));
    setSelectedGridLineId(nextLineId);
  }

  function duplicateAsRevision() {
    const versionNumber = estimate.versionNumber + 1;
    const revision: Estimate = {
      ...estimate,
      id: `estimate_rev_${versionNumber}_${Date.now()}`,
      name: `${estimate.name} Revision ${versionNumber}`,
      versionNumber,
      versionLabel: nextRevisionLabel(versionNumber),
      status: "draft",
      lineItems: estimate.lineItems.map((line) => ({ ...line, id: `${line.id}_rev_${versionNumber}`, revisionSourceLineItemId: line.revisionSourceLineItemId ?? line.id })),
    };
    setEstimate(revision);
    setSavedVersions((current) => [...current, revision]);
  }

  return (
    <DndContext id="archestimator-production-library-grid" sensors={sensors} onDragStart={handleLibraryDragStart} onDragMove={handleLibraryDragMove} onDragEnd={handleLibraryDragEnd} onDragCancel={clearLibraryDragState}>
      <main className="min-h-screen bg-background px-4 py-6 text-foreground lg:px-8">
      <section className="mx-auto flex max-w-[1500px] flex-col gap-6">
        <header className="flex flex-col gap-5 rounded-3xl border border-hairline bg-surface p-5 shadow-sm xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-accent">Archestimator MVP</p>
            <h1 className="mt-2 text-3xl font-bold tracking-[-0.04em] lg:text-5xl">Interactive estimate workspace</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted lg:text-base">
              Build a local-first estimate, insert cost-library items, revise rates, and issue a client-ready proposal package.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[620px]">
            <StatCard label="Draft total" value={formatMoney(totals.grandTotal, currencyCode)} dark />
            <StatCard label="Material" value={formatMoney(totals.materialSubtotal, currencyCode)} />
            <StatCard label="Labor" value={formatMoney(totals.laborSubtotal, currencyCode)} />
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[1fr_430px]">
          <EstimateSheetCard estimate={estimate} project={project} currencyCode={currencyCode} selectedSectionId={selectedSectionId} setSelectedSectionId={setSelectedSectionId} addBlankRow={addBlankRow} updateLine={updateLine} updateGridCell={updateGridCell} onGridCellSelected={selectGridCell} resetFromLibrary={resetFromLibrary} deleteLine={deleteGridLine} gridFrameRef={gridFrameRef} dropIntent={dropIntent} visibleDropRow={visibleDropRow} onVisibleRowOffsetChange={handleVisibleRowOffsetChange} insertionTargetLabel={insertionTargetSection ? `${insertionTargetSection.outlineCode} · ${insertionTargetSection.name}` : "none"} dropRow={dropRow} setDropRow={setDropRow} maxDropRow={gridRows.length} selectedLibraryName={libraryItems.find((entry) => entry.id === selectedLibraryId)?.name ?? "first library item"} onFallbackLibraryInsert={insertLibraryItemAtCurrentDropRow} selectedGridLine={selectedGridLine} selectedGridLineId={selectedGridLine?.id ?? ""} onSelectedGridLineChange={setSelectedGridLineId} proposalSections={estimate.proposalSections} spaces={estimate.spaces} getSpacePath={(spaceId) => formatSpacePath(estimate, spaceId)} onMoveSelectedLineToSpace={moveSelectedLineToSpace} onCopySelectedLineToSpace={copySelectedLineToSpace} />

          <aside className="flex flex-col gap-4">
            <TabList className="grid-cols-3">
              {(["library", "versions", "proposal"] as WorkspaceTab[]).map((tab) => <TabButton key={tab} active={activeTab === tab} onClick={() => setActiveTab(tab)}>{tab}</TabButton>)}
            </TabList>
            {activeTab === "library" ? <LibraryPanel items={libraryItems} currencyCode={currencyCode} getSelectedSectionId={() => selectedSectionIdRef.current} onAdd={addLibraryItem} selectedLibraryId={selectedLibraryId} onSelectForGridInsert={setSelectedLibraryId} onSaveItem={saveLibraryItem} /> : null}
            {activeTab === "versions" ? <VersionsPanel estimate={estimate} versions={savedVersions} revisionRecords={savedRevisionRecords} onDuplicate={duplicateAsRevision} onServerDuplicate={onDuplicateRevision} /> : null}
            {activeTab === "proposal" ? <ProposalPanel project={project} estimate={estimate} totals={totals} currencyCode={currencyCode} terms={proposalTerms} onTermsChange={updateTerms} savedProposals={savedProposals} onSaveEstimate={onSaveEstimate} onIssueProposalSnapshot={onIssueProposalSnapshot} /> : null}
          </aside>
        </div>
      </section>
      </main>
      <DragOverlay dropAnimation={{ duration: 140, easing: "cubic-bezier(0.2, 0, 0, 1)" }}>
        {activeLibraryItem ? <LibraryDragPreview item={activeLibraryItem} currency={currencyCode} /> : null}
      </DragOverlay>
    </DndContext>
  );
}

type EstimateSheetCardProps = {
  estimate: Estimate;
  project: Project;
  currencyCode: string;
  selectedSectionId: string;
  setSelectedSectionId: (value: string) => void;
  addBlankRow: (targetSectionId?: string) => void;
  updateLine: (lineId: string, patch: Partial<EstimateLineItem>, changedField?: keyof EstimateLineItem) => void;
  updateGridCell: (cell: Item, nextCell: EditableGridCell) => void;
  onGridCellSelected: (cell: Item) => void;
  resetFromLibrary: (line: EstimateLineItem) => void;
  deleteLine: (lineId: string) => void;
  gridFrameRef: RefObject<HTMLDivElement | null>;
  dropIntent: "idle" | "valid" | "outside";
  visibleDropRow: number;
  onVisibleRowOffsetChange: (rowOffset: number) => void;
  insertionTargetLabel: string;
  dropRow: number;
  setDropRow: (row: number) => void;
  maxDropRow: number;
  selectedLibraryName: string;
  onFallbackLibraryInsert: () => void;
  selectedGridLine?: EstimateLineItem;
  selectedGridLineId: string;
  onSelectedGridLineChange: (lineId: string) => void;
  proposalSections: Estimate["proposalSections"];
  spaces: EstimateSpace[];
  getSpacePath: (spaceId?: string) => string;
  onMoveSelectedLineToSpace: (spaceId: string) => void;
  onCopySelectedLineToSpace: (spaceId: string) => void;
};

function EstimateSheetCard({ estimate, project, currencyCode, selectedSectionId, setSelectedSectionId, addBlankRow, updateLine, updateGridCell, onGridCellSelected, resetFromLibrary, deleteLine, gridFrameRef, dropIntent, visibleDropRow, onVisibleRowOffsetChange, insertionTargetLabel, dropRow, setDropRow, maxDropRow, selectedLibraryName, onFallbackLibraryInsert, selectedGridLine, selectedGridLineId, onSelectedGridLineChange, proposalSections, spaces, getSpacePath, onMoveSelectedLineToSpace, onCopySelectedLineToSpace }: EstimateSheetCardProps) {
  const sectionSelectRef = useRef<HTMLSelectElement | null>(null);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-muted">{project.name} · {project.clientName}</p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <CardTitle className="text-2xl">{estimate.name}</CardTitle>
            <StatusPill tone="review">{estimate.versionLabel} · {estimate.status}</StatusPill>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <select ref={sectionSelectRef} aria-label="Selected estimate section for new rows" className="rounded-xl border border-hairline bg-surface px-3 py-2 text-sm" value={selectedSectionId} onInput={(event) => setSelectedSectionId(event.currentTarget.value)} onChange={(event) => setSelectedSectionId(event.target.value)}>
            {estimate.sections.map((section) => <option key={section.id} value={section.id}>{section.outlineCode} · {section.name}</option>)}
          </select>
          <Button variant="primary" onClick={() => addBlankRow(sectionSelectRef.current?.value ?? selectedSectionId)}><Plus className="size-4" /> Add blank row</Button>
        </div>
      </CardHeader>
      <div className="border-y border-hairline bg-white p-3">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold">Glide estimate grid</p>
            <p className="text-xs text-muted">Primary spreadsheet surface. Use the selected-row controls beside the grid for proposal mapping and row actions.</p>
          </div>
          <span className="rounded-full bg-accentSoft px-3 py-1 text-xs font-semibold text-accentDark">Production grid migration</span>
        </div>
        <div ref={gridFrameRef} className="relative">
          {dropIntent === "valid" ? <div className="pointer-events-none absolute left-0 right-0 z-10 h-1 rounded-full bg-accent shadow-[0_0_0_4px_rgba(254,243,199,0.85)]" style={{ top: GRID_HEADER_HEIGHT + visibleDropRow * GRID_ROW_HEIGHT - 2 }} data-testid="production-grid-drop-indicator" /> : null}
          <ProductionEstimateGlideGrid estimate={estimate} currencyCode={currencyCode} onCellEdited={updateGridCell} onCellSelected={onGridCellSelected} onVisibleRowOffsetChange={onVisibleRowOffsetChange} />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-hairline bg-surface-muted/60 px-3 py-2 text-xs text-muted">
          <span>Drag library cards into: <strong className="text-foreground">{insertionTargetLabel}</strong>. Selected fallback item: <strong className="text-foreground">{selectedLibraryName}</strong></span>
          <label className="flex items-center gap-2">
            <span>Fallback row</span>
            <input aria-label="Production grid fallback insert row" className="w-20 rounded-lg border border-hairline bg-white px-2 py-1 font-mono" min={0} max={maxDropRow} type="number" value={dropRow} onChange={(event) => setDropRow(Math.max(0, Math.min(maxDropRow, Number(event.target.value))))} />
          </label>
          <Button variant="secondary" onClick={onFallbackLibraryInsert}>Insert selected library item at row</Button>
        </div>
      </div>
      <ProductionRowInspector
        lineItems={estimate.lineItems}
        selectedLine={selectedGridLine}
        selectedLineId={selectedGridLineId}
        proposalSections={proposalSections}
        spaces={spaces}
        getSpacePath={getSpacePath}
        currencyCode={currencyCode}
        updateLine={updateLine}
        resetFromLibrary={resetFromLibrary}
        deleteLine={deleteLine}
        onSelectedLineChange={onSelectedGridLineChange}
        onMoveToSpace={onMoveSelectedLineToSpace}
        onCopyToSpace={onCopySelectedLineToSpace}
      />
    </Card>
  );
}

function ProductionRowInspector({
  lineItems,
  selectedLine,
  selectedLineId,
  proposalSections,
  spaces,
  getSpacePath,
  currencyCode,
  updateLine,
  resetFromLibrary,
  deleteLine,
  onSelectedLineChange,
  onMoveToSpace,
  onCopyToSpace,
}: {
  lineItems: EstimateLineItem[];
  selectedLine?: EstimateLineItem;
  selectedLineId: string;
  proposalSections: Estimate["proposalSections"];
  spaces: EstimateSpace[];
  getSpacePath: (spaceId?: string) => string;
  currencyCode: string;
  updateLine: (lineId: string, patch: Partial<EstimateLineItem>, changedField?: keyof EstimateLineItem) => void;
  resetFromLibrary: (line: EstimateLineItem) => void;
  deleteLine: (lineId: string) => void;
  onSelectedLineChange: (lineId: string) => void;
  onMoveToSpace: (spaceId: string) => void;
  onCopyToSpace: (spaceId: string) => void;
}) {
  const calculated = selectedLine ? calculateEstimateTotals({ sections: [], floors: [], spaces: [], lineItems: [selectedLine], proposalSections: [], id: "inspector", projectId: "inspector", name: "Inspector", versionLabel: "Inspector", versionNumber: 1, status: "draft", pricingBasisDate: "2026-01-01" }).rows[0]?.calculated.total ?? 0 : 0;
  const [operationSpaceId, setOperationSpaceId] = useState(selectedLine?.spaceId ?? spaces[0]?.id ?? "");
  const fallbackOperationSpaceId = selectedLine?.spaceId ?? spaces[0]?.id ?? "";
  const effectiveOperationSpaceId = operationSpaceId && spaces.some((space) => space.id === operationSpaceId) ? operationSpaceId : fallbackOperationSpaceId;

  if (!selectedLine) {
    return <div className="border-t border-hairline p-4 text-sm text-muted">Select a line row in the production grid to edit proposal mapping, scope, and row actions.</div>;
  }

  return (
    <div className="border-t border-hairline bg-surface-muted/30 p-4" data-testid="production-row-inspector">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Selected grid row controls</p>
          <h3 className="mt-1 text-lg font-semibold tracking-[-0.02em]">{selectedLine.itemName}</h3>
          <div className="mt-2"><LinkStateBadge state={selectedLine.linkState} /></div>
        </div>
        <label className="grid gap-1 text-xs font-medium text-muted">
          Select estimate row
          <select aria-label="Selected production grid row" className="min-w-72 rounded-xl border border-hairline bg-white px-3 py-2 text-sm text-foreground" value={selectedLineId} onChange={(event) => onSelectedLineChange(event.target.value)}>
            {lineItems.map((line) => <option key={line.id} value={line.id}>{line.itemName}</option>)}
          </select>
        </label>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="grid gap-1 text-xs font-medium text-muted">
          Proposal section
          <select aria-label={`Proposal section for ${selectedLine.itemName}`} className={`rounded-xl border px-3 py-2 text-sm text-foreground ${selectedLine.proposalSectionId ? "border-hairline bg-white" : "border-amber-300 bg-amber-50"}`} value={selectedLine.proposalSectionId ?? ""} onChange={(event) => updateLine(selectedLine.id, { proposalSectionId: event.target.value || undefined }, "proposalSectionId")}>
            <option value="">Unassigned</option>
            {proposalSections.map((section) => <option key={section.id} value={section.id}>{section.outlineCode} · {section.name}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-xs font-medium text-muted">
          Scope status
          <select aria-label={`Scope status for ${selectedLine.itemName}`} className="rounded-xl border border-hairline bg-white px-3 py-2 text-sm text-foreground" value={selectedLine.scopeStatus} onChange={(event) => updateLine(selectedLine.id, { scopeStatus: event.target.value as EstimateLineItem["scopeStatus"] }, "scopeStatus")}>
            {scopeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
        <NumberInput label={`Quantity for ${selectedLine.itemName}`} value={selectedLine.quantity} onChange={(value) => updateLine(selectedLine.id, { quantity: value }, "quantity")} />
        <label className="grid gap-1 text-xs font-medium text-muted">
          Location
          <select aria-label={`Location for ${selectedLine.itemName}`} className={`rounded-xl border px-3 py-2 text-sm text-foreground ${selectedLine.spaceId ? "border-hairline bg-white" : "border-amber-300 bg-amber-50"}`} value={selectedLine.spaceId ?? ""} onChange={(event) => updateLine(selectedLine.id, { spaceId: event.target.value || undefined }, "spaceId")}>
            <option value="">Unassigned location</option>
            {spaces.map((space) => <option key={space.id} value={space.id}>{getSpacePath(space.id)}</option>)}
          </select>
        </label>
        <div className="rounded-xl border border-hairline bg-white px-3 py-2">
          <p className="text-xs font-medium text-muted">Location path</p>
          <p className="mt-1 text-sm font-semibold">{getSpacePath(selectedLine.spaceId)}</p>
        </div>
        <label className="grid gap-1 text-xs font-medium text-muted">
          Unit
          <TextInput className="bg-white" value={selectedLine.unit} onChange={(event) => updateLine(selectedLine.id, { unit: event.target.value }, "unit")} aria-label={`Unit for ${selectedLine.itemName}`} />
        </label>
        <NumberInput label={`Material unit cost for ${selectedLine.itemName}`} value={selectedLine.materialUnitCost ?? selectedLine.unitCost ?? 0} onChange={(value) => updateLine(selectedLine.id, { materialUnitCost: value, unitCost: undefined }, "materialUnitCost")} />
        <NumberInput label={`Labor unit cost for ${selectedLine.itemName}`} value={selectedLine.laborUnitCost ?? 0} onChange={(value) => updateLine(selectedLine.id, { laborUnitCost: value }, "laborUnitCost")} />
        <div className="rounded-xl border border-hairline bg-white px-3 py-2">
          <p className="text-xs font-medium text-muted">Selected row total</p>
          <p className="mt-1 font-mono font-semibold">{formatMoney(calculated, currencyCode)}</p>
        </div>
        <div className="flex items-end gap-2">
          {selectedLine.sourceLibraryItemId ? <Button aria-label={`Reset ${selectedLine.itemName} from library`} variant="ghost" onClick={() => resetFromLibrary(selectedLine)}><RotateCcw className="size-4" /> Reset</Button> : null}
          <Button aria-label={`Delete ${selectedLine.itemName}`} variant="danger" onClick={() => deleteLine(selectedLine.id)}><Trash2 className="size-4" /> Delete</Button>
        </div>
      </div>
      <div className="mt-4 rounded-2xl border border-hairline bg-white p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Move/copy between spaces</p>
        <div className="mt-2 grid gap-2 md:grid-cols-[1fr_auto_auto]">
          <select aria-label="Row operation target location" className="rounded-xl border border-hairline bg-white px-3 py-2 text-sm text-foreground" value={effectiveOperationSpaceId} onChange={(event) => setOperationSpaceId(event.target.value)}>
            {spaces.map((space) => <option key={space.id} value={space.id}>{getSpacePath(space.id)}</option>)}
          </select>
          <Button variant="secondary" aria-label={`Move ${selectedLine.itemName} to selected location`} onClick={() => onMoveToSpace(effectiveOperationSpaceId)}>Move row</Button>
          <Button variant="secondary" aria-label={`Copy ${selectedLine.itemName} to selected location`} onClick={() => onCopyToSpace(effectiveOperationSpaceId)}>Copy row</Button>
        </div>
        <p className="mt-2 text-xs text-muted">Move or copy keeps proposal-section mapping stable unless you change it explicitly.</p>
      </div>
      {!selectedLine.proposalSectionId ? <p className="mt-3 text-xs font-medium text-amber-700">Needs proposal mapping before proposal issuance.</p> : null}
    </div>
  );
}

function NumberInput({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <TextInput aria-label={label} className="w-28 text-right font-mono" min={0} type="number" value={value} onChange={(event) => onChange(parseNumberInput(event.target.value))} />;
}

function LinkStateBadge({ state }: { state: EstimateLineItem["linkState"] }) {
  const tone = state === "linked-clean" ? "approved" : state === "linked-overridden" || state === "source-changed" ? "review" : "neutral";
  return <StatusPill tone={tone}>{state}</StatusPill>;
}

function LibraryPanel({ items, currencyCode, getSelectedSectionId, onAdd, selectedLibraryId, onSelectForGridInsert, onSaveItem }: { items: CostLibraryItem[]; currencyCode: string; getSelectedSectionId: () => string; onAdd: (item: CostLibraryItem, targetSectionId?: string) => void; selectedLibraryId: string; onSelectForGridInsert: (itemId: string) => void; onSaveItem: (item: CostLibraryItem) => void }) {
  const [query, setQuery] = useState("");
  const [editingItem, setEditingItem] = useState<CostLibraryItem | null>(null);
  const [draft, setDraft] = useState<CostLibraryItem>(() => createLibraryDraft());
  const filtered = items.filter((item) => `${item.name} ${item.category} ${item.itemType} ${item.source ?? ""}`.toLowerCase().includes(query.toLowerCase()));

  function startCreate() {
    setEditingItem(null);
    setDraft(createLibraryDraft());
  }

  function startEdit(item: CostLibraryItem) {
    setEditingItem(item);
    setDraft(item);
  }

  function saveDraft() {
    onSaveItem(draft);
    if (!draft.id) setDraft(createLibraryDraft());
    setEditingItem(null);
  }

  return (
    <Card>
      <CardContent>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Cost library</CardTitle>
            <CardDescription>Manage reusable cost items, source notes, pricing dates, and confidence before inserting rows into the estimate.</CardDescription>
          </div>
          <Button variant="secondary" onClick={startCreate}>Create library item</Button>
        </div>
        <div className="mt-4 grid gap-3 rounded-2xl border border-hairline bg-surface-muted p-3">
          <Field label="Library item name"><TextInput aria-label="Library item name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Category"><TextInput aria-label="Library category" value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} /></Field>
            <Field label="Type"><select aria-label="Library item type" className="rounded-xl border border-hairline bg-surface px-3 py-2 text-sm" value={draft.itemType} onChange={(event) => setDraft({ ...draft, itemType: event.target.value as CostLibraryItem["itemType"] })}>{["material", "labor", "equipment", "subcontract", "assembly"].map((type) => <option key={type} value={type}>{type}</option>)}</select></Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Unit"><TextInput aria-label="Library unit" value={draft.unit} onChange={(event) => setDraft({ ...draft, unit: event.target.value })} /></Field>
            <Field label="Material unit cost"><TextInput aria-label="Library material unit cost" min={0} type="number" value={draft.defaultUnitCost} onChange={(event) => setDraft({ ...draft, defaultUnitCost: parseNumberInput(event.target.value) })} /></Field>
            <Field label="Labor unit cost"><TextInput aria-label="Library labor unit cost" min={0} type="number" value={draft.defaultLaborUnitCost ?? 0} onChange={(event) => setDraft({ ...draft, defaultLaborUnitCost: parseNumberInput(event.target.value) })} /></Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Pricing date"><TextInput aria-label="Library pricing date" type="date" value={draft.pricingDate} onChange={(event) => setDraft({ ...draft, pricingDate: event.target.value })} /></Field>
            <Field label="Confidence"><select aria-label="Library confidence" className="rounded-xl border border-hairline bg-surface px-3 py-2 text-sm" value={draft.confidence ?? "medium"} onChange={(event) => setDraft({ ...draft, confidence: event.target.value as CostLibraryItem["confidence"] })}>{["low", "medium", "high"].map((confidence) => <option key={confidence} value={confidence}>{confidence}</option>)}</select></Field>
            <Field label="Waste %"><TextInput aria-label="Library waste percent" min={0} type="number" value={draft.defaultWastePercent ?? 0} onChange={(event) => setDraft({ ...draft, defaultWastePercent: parseNumberInput(event.target.value) })} /></Field>
          </div>
          <Field label="Source note"><TextInput aria-label="Library source note" value={draft.source ?? ""} onChange={(event) => setDraft({ ...draft, source: event.target.value })} /></Field>
          <div className="flex flex-wrap gap-2"><Button variant="primary" onClick={saveDraft}>Save library item</Button>{editingItem ? <Button variant="secondary" onClick={startCreate}>Cancel edit</Button> : null}</div>
        </div>
        <TextInput aria-label="Search cost library" className="mt-4 w-full" placeholder="Search library…" value={query} onChange={(event) => setQuery(event.target.value)} />
        <div className="mt-4 space-y-3" data-testid="production-library-drag-tray">{filtered.map((item) => <DraggableLibraryCard key={item.id} item={item} currencyCode={currencyCode} selectedForGridInsert={item.id === selectedLibraryId} onSelectForGridInsert={() => onSelectForGridInsert(item.id)} onAdd={() => onAdd(item, getSelectedSectionId())} onEdit={() => startEdit(item)} />)}</div>
      </CardContent>
    </Card>
  );
}

function createLibraryDraft(): CostLibraryItem {
  return { id: "", name: "Untitled library item", category: "General", itemType: "material", unit: "lot", defaultUnitCost: 0, defaultLaborUnitCost: 0, pricingDate: new Date().toISOString().slice(0, 10), source: "", confidence: "medium", defaultWastePercent: 0 };
}

function DraggableLibraryCard({ item, currencyCode, selectedForGridInsert, onSelectForGridInsert, onAdd, onEdit }: { item: CostLibraryItem; currencyCode: string; selectedForGridInsert: boolean; onSelectForGridInsert: () => void; onAdd: () => void; onEdit: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: `library-item:${item.id}` });
  const style = { transform: CSS.Translate.toString(transform) };

  return (
    <div ref={setNodeRef} style={style} className={`rounded-2xl border border-hairline p-4 transition-[border-color,box-shadow,opacity] ${isDragging ? "opacity-35" : "bg-white hover:border-accent hover:shadow-md"}`}>
      <div className="flex items-start justify-between gap-3">
        <LibraryCardContent item={item} currencyCode={currencyCode} />
        <button type="button" className="shrink-0 cursor-grab rounded-lg border border-hairline px-2 py-1 text-xs font-semibold text-muted active:cursor-grabbing" aria-label={`Drag ${item.name} into estimate grid`} {...listeners} {...attributes}>Drag</button>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <Button className="w-full" variant="primary" onClick={onAdd}>Add to estimate</Button>
        <Button className="w-full" variant="secondary" onClick={onEdit}>Edit</Button>
        <Button className="w-full" variant={selectedForGridInsert ? "primary" : "secondary"} onClick={onSelectForGridInsert}>{selectedForGridInsert ? "Selected for row insert" : "Select for row insert"}</Button>
      </div>
    </div>
  );
}

function LibraryDragPreview({ item, currency }: { item: CostLibraryItem; currency: string }) {
  return (
    <div className="w-[300px] rotate-1 rounded-2xl border border-accent bg-white p-4 text-left shadow-2xl ring-4 ring-accentSoft">
      <LibraryCardContent item={item} currencyCode={currency} />
      <p className="mt-3 rounded-lg bg-accentSoft px-2 py-1 text-xs font-semibold text-accentDark">Drop into the Glide estimate grid</p>
    </div>
  );
}

function LibraryCardContent({ item, currencyCode }: { item: CostLibraryItem; currencyCode: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="font-medium">{item.name}</p>
        <p className="mt-1 text-xs text-muted">{item.category} · {item.itemType} · {item.unit}</p>
        <p className="mt-1 text-xs text-muted">Price date: {item.pricingDate}</p>
        <p className="mt-1 text-xs text-muted">Confidence: {item.confidence ?? "medium"}{item.source ? ` · Source: ${item.source}` : ""}</p>
      </div>
      <p className="font-mono text-sm font-semibold">{formatMoney(item.defaultUnitCost, currencyCode)}</p>
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

function VersionsPanel({ estimate, versions, revisionRecords, onDuplicate, onServerDuplicate }: { estimate: Estimate; versions: Estimate[]; revisionRecords: RevisionChangeRecord[]; onDuplicate: () => void; onServerDuplicate?: (estimateId: string) => Promise<void> }) {
  const orderedVersions = [...versions].sort((a, b) => a.versionNumber - b.versionNumber);
  const orderedRevisionRecords = [...revisionRecords].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
  const persistedActiveRecord = orderedRevisionRecords.find((record) => record.toEstimateId === estimate.id);
  const priorVersion = orderedVersions.filter((version) => version.id !== estimate.id && version.versionNumber < estimate.versionNumber).at(-1);
  const activeDiff = persistedActiveRecord ?? (priorVersion ? compareEstimateRevisions(priorVersion, estimate) : null);
  const comparedWithLabel = persistedActiveRecord?.fromVersionLabel ?? priorVersion?.versionLabel;

  return (
    <Card>
      <CardContent>
        <CardTitle>Versions</CardTitle>
        <CardDescription>Create a revision copy before design changes so issued proposals are not silently mutated.</CardDescription>
        <div className="mt-4 grid gap-2">
          <Button variant="primary" onClick={onDuplicate}>Duplicate draft locally</Button>
          {onServerDuplicate ? <Button onClick={() => void onServerDuplicate(estimate.id)}>Save as persisted revision</Button> : null}
        </div>
        {activeDiff ? (
          <div className="mt-4 rounded-2xl border border-hairline bg-surface-muted p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Revision diff semantics</p>
            <p className="mt-2 text-sm font-medium">Compared with {comparedWithLabel}</p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs md:grid-cols-3">
              <span className="rounded-xl bg-white px-3 py-2">Moved spaces: {activeDiff.summary.spaceMoves}</span>
              <span className="rounded-xl bg-white px-3 py-2">BOQ remaps: {activeDiff.summary.proposalRemaps}</span>
              <span className="rounded-xl bg-white px-3 py-2">Commercial edits: {activeDiff.summary.commercialChanges}</span>
              <span className="rounded-xl bg-white px-3 py-2">Scope edits: {activeDiff.summary.scopeChanges}</span>
              <span className="rounded-xl bg-white px-3 py-2">Added rows: {activeDiff.summary.addedLines}</span>
              <span className="rounded-xl bg-white px-3 py-2">Removed rows: {activeDiff.summary.removedLines}</span>
            </div>
            <div className="mt-3 space-y-2">
              {activeDiff.changes.slice(0, 4).map((change) => <p key={`${change.kind}-${change.lineItemId}`} className="rounded-xl bg-white p-3 text-xs text-muted"><span className="font-semibold text-foreground">{change.itemName}</span> · {describeRevisionChange(change)}</p>)}
              {!activeDiff.changes.length ? <p className="rounded-xl bg-white p-3 text-xs text-muted">No revision deltas detected yet.</p> : null}
            </div>
          </div>
        ) : null}
        <div className="mt-4 space-y-3">{orderedVersions.map((version) => <div key={version.id} className={`rounded-2xl border p-4 ${version.id === estimate.id ? "border-accent bg-amber-50" : "border-hairline"}`}><p className="font-medium">{version.versionLabel}</p><p className="mt-1 text-xs text-muted">{version.name} · {version.status}</p></div>)}</div>
        {orderedRevisionRecords.length ? (
          <div className="mt-4 rounded-2xl border border-hairline bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Saved revision records</p>
            <div className="mt-3 space-y-2">
              {orderedRevisionRecords.slice(-3).reverse().map((record) => (
                <div key={record.id} className="rounded-xl bg-surface-muted p-3 text-xs text-muted">
                  <p className="font-semibold text-foreground">{record.fromVersionLabel} → {record.toVersionLabel}</p>
                  <p className="mt-1">{record.summary.totalChanges} changes · {record.summary.spaceMoves} moves · {record.summary.proposalRemaps} BOQ remaps · {record.summary.commercialChanges} commercial edits · {record.summary.scopeChanges} scope edits</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function describeRevisionChange(change: ReturnType<typeof compareEstimateRevisions>["changes"][number]) {
  if (change.kind === "space-moved") return `moved from ${change.fromSpacePath} to ${change.toSpacePath}`;
  if (change.kind === "proposal-remapped") return `remapped from ${change.fromProposalSectionName} to ${change.toProposalSectionName}`;
  if (change.kind === "commercial-changed") return `commercial fields changed: ${change.changedFields?.join(", ")}`;
  if (change.kind === "scope-changed") return "scope status changed";
  if (change.kind === "line-added") return "added to this revision";
  if (change.kind === "line-removed") return "removed from this revision";
  return "changed";
}

function ProposalPanel({ project, estimate, totals, currencyCode, terms, onTermsChange, savedProposals, onSaveEstimate, onIssueProposalSnapshot }: { project: Project; estimate: Estimate; totals: ReturnType<typeof calculateEstimateTotals>; currencyCode: string; terms: ProposalTerms; onTermsChange: (patch: Partial<ProposalTerms>) => void; savedProposals: LocalDatabase["proposalSnapshots"]; onSaveEstimate?: (estimate: Estimate) => Promise<void>; onIssueProposalSnapshot?: (estimate: Estimate, terms: ProposalTerms) => Promise<void> }) {
  const proposalSections = estimate.proposalSections.length ? estimate.proposalSections : estimate.sections.map((section) => ({ id: section.id, name: section.name, outlineCode: section.outlineCode, displayInProposal: true }));
  const unassignedRows = totals.rows.filter((row) => row.includedInTotal && !row.proposalSectionId);
  const sectionSummaries = proposalSections
    .filter((section) => section.displayInProposal)
    .map((section) => ({
      ...section,
      total: totals.rows
        .filter((row) => row.includedInTotal && (row.proposalSectionId ?? row.sectionId) === section.id)
        .reduce((sum, row) => sum + row.calculated.total, 0),
    }));
  const proposalDetailRows = totals.rows.filter((row) => row.includedInTotal);

  return (
    <Card className="bg-proposal-paper">
      <CardContent className="grid gap-4">
        <div className="grid gap-2"><Button variant="secondary" onClick={() => void onSaveEstimate?.(estimate)}>Save estimate to local JSON</Button><Button variant="primary" onClick={() => void onIssueProposalSnapshot?.(estimate, terms)}>Issue immutable proposal snapshot</Button><p className="text-xs text-muted">Issued snapshots for this project: {savedProposals.length}</p>{unassignedRows.length ? <p role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs font-medium text-amber-800">{unassignedRows.length} billable row{unassignedRows.length === 1 ? "" : "s"} need proposal-section mapping before issuance. They will be grouped as Unassigned Proposal Section if issued now.</p> : null}</div>
        <Card className="bg-white/75 shadow-none"><CardContent><CardTitle>Proposal history</CardTitle>{savedProposals.length ? <div className="mt-3 space-y-2">{savedProposals.map((snapshot) => <Link key={snapshot.id} className="block rounded-xl border border-hairline bg-white p-3 text-sm transition hover:border-accent" href={`/proposals/${snapshot.id}`}><span className="font-semibold">{snapshot.proposalVersionLabel}</span><span className="mt-1 block text-xs text-muted">{new Date(snapshot.issuedAt).toLocaleDateString()} · {formatMoney(snapshot.totalAmount, snapshot.currency)}</span></Link>)}</div> : <p className="mt-3 rounded-xl border border-dashed border-hairline bg-white/70 p-4 text-sm text-muted">No issued proposals yet. Save the estimate, review terms, then issue an immutable snapshot.</p>}</CardContent></Card>
        <Card className="bg-white/75 shadow-none"><CardContent className="grid gap-3"><CardTitle>Proposal terms builder</CardTitle><Field label="Subject"><TextInput value={terms.subject} onChange={(event) => onTermsChange({ subject: event.target.value })} /></Field><Field label="Through / attention"><TextInput value={terms.throughName ?? ""} onChange={(event) => onTermsChange({ throughName: event.target.value })} /></Field><Field label="Contractor/company"><TextInput value={terms.contractorName} onChange={(event) => onTermsChange({ contractorName: event.target.value })} /></Field><Field label="Tax/VAT statement"><Textarea value={terms.taxStatement} onChange={(event) => onTermsChange({ taxStatement: event.target.value })} /></Field><Field label="Validity days"><TextInput type="number" min={1} value={terms.validityDays} onChange={(event) => onTermsChange({ validityDays: Math.max(1, parseNumberInput(event.target.value)) })} /></Field><Field label="Payment terms"><Textarea value={terms.paymentTerms} onChange={(event) => onTermsChange({ paymentTerms: event.target.value })} /></Field><Field label="Warranty terms"><Textarea value={terms.warrantyTerms} onChange={(event) => onTermsChange({ warrantyTerms: event.target.value })} /></Field><Field label="Duration note"><Textarea value={terms.durationNote} onChange={(event) => onTermsChange({ durationNote: event.target.value })} /></Field><Field label="Inclusions"><Textarea value={terms.inclusions} onChange={(event) => onTermsChange({ inclusions: event.target.value })} /></Field><Field label="Exclusions"><Textarea value={terms.exclusions} onChange={(event) => onTermsChange({ exclusions: event.target.value })} /></Field></CardContent></Card>
        <div className="rounded-xl border border-hairline bg-white/70 p-5 font-serif"><p className="text-xs uppercase tracking-[0.16em] text-muted">Proposal Preview</p><h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">{terms.subject}</h2><p className="mt-3 text-sm leading-6">We are pleased to submit this proposal for <strong>{project.name}</strong> located in {project.location}. This preview uses editable commercial terms and becomes immutable only after issuance.</p><div className="mt-5 rounded-xl bg-foreground p-4 text-white"><p className="text-xs text-white/70">Total proposed amount</p><p className="mt-1 font-mono text-2xl font-semibold">{formatMoney(totals.grandTotal, currencyCode)}</p></div><h3 className="mt-5 font-sans text-sm font-semibold uppercase tracking-[0.12em]">Section Summary</h3><div className="mt-2 space-y-2">{sectionSummaries.map((section) => <div key={section.id} className="flex justify-between border-b border-hairline py-2 text-sm"><span>{section.outlineCode}. {section.name}</span><span className="font-mono">{formatMoney(section.total, currencyCode)}</span></div>)}</div><h3 className="mt-5 font-sans text-sm font-semibold uppercase tracking-[0.12em]">Proposal Detail</h3><div className="mt-2 space-y-2">{proposalDetailRows.map((row) => <div key={row.id} className="rounded-xl border border-hairline bg-white/70 p-3 text-sm"><div className="flex justify-between gap-3"><span className="font-semibold">{row.itemName}</span><span className="font-mono">{formatMoney(row.calculated.total, currencyCode)}</span></div><p className="mt-1 text-xs text-muted">{formatSpacePath(estimate, row.spaceId)} · {row.quantity} {row.unit}</p></div>)}</div><h3 className="mt-5 font-sans text-sm font-semibold uppercase tracking-[0.12em]">Commercial terms</h3><dl className="mt-2 grid gap-2 text-sm"><div><dt className="font-sans font-semibold">Validity</dt><dd className="text-muted">{terms.validityDays} days</dd></div><div><dt className="font-sans font-semibold">Payment</dt><dd className="text-muted">{terms.paymentTerms}</dd></div><div><dt className="font-sans font-semibold">Exclusions</dt><dd className="text-muted">{terms.exclusions}</dd></div></dl></div>
      </CardContent>
    </Card>
  );
}
