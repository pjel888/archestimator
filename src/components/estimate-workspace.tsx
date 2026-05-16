"use client";

import { useMemo, useState } from "react";
import { Plus, RotateCcw, Trash2 } from "lucide-react";
import type { CostLibraryItem, Estimate, EstimateLineItem, LocalDatabase, ProposalTerms } from "@/lib/local-data/schemas";
import { calculateEstimateTotals } from "@/lib/estimates/totals";
import { createLineItemFromLibraryItem, detectLinkStateAfterEdit } from "@/lib/estimates/library-insert";
import { StatusPill } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Textarea, TextInput } from "@/components/ui/field";
import { StatCard } from "@/components/ui/stat-card";
import { TabButton, TabList } from "@/components/ui/tabs";
import { formatMoney } from "@/lib/money/format";
import { createDefaultProposalTerms } from "@/lib/proposals/terms";

type EstimateWorkspaceProps = {
  database: LocalDatabase;
  projectId?: string;
  onSaveEstimate?: (estimate: Estimate) => Promise<void>;
  onDuplicateRevision?: (estimateId: string) => Promise<void>;
  onIssueProposalSnapshot?: (estimate: Estimate, terms: ProposalTerms) => Promise<void>;
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

export function EstimateWorkspace({ database, projectId, onSaveEstimate, onDuplicateRevision, onIssueProposalSnapshot }: EstimateWorkspaceProps) {
  const project = projectId ? database.projects.find((item) => item.id === projectId) : database.projects[0];
  const initialEstimate = database.estimates.find((item) => item.id === project?.currentEstimateId) ?? database.estimates[0];

  if (!project || !initialEstimate) return <EmptyLocalEstimateState />;

  return <EstimateWorkspaceInner database={database} project={project} initialEstimate={initialEstimate} onSaveEstimate={onSaveEstimate} onDuplicateRevision={onDuplicateRevision} onIssueProposalSnapshot={onIssueProposalSnapshot} />;
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
};

function EstimateWorkspaceInner({ database, project, initialEstimate, onSaveEstimate, onDuplicateRevision, onIssueProposalSnapshot }: EstimateWorkspaceInnerProps) {
  const [estimate, setEstimate] = useState<Estimate>(initialEstimate);
  const [proposalTerms, setProposalTerms] = useState<ProposalTerms>(() => createDefaultProposalTerms(database, initialEstimate));
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("library");
  const [savedVersions, setSavedVersions] = useState<Estimate[]>([initialEstimate]);
  const [selectedSectionId, setSelectedSectionId] = useState(initialEstimate.sections[0]?.id ?? "section_default");

  const totals = useMemo(() => calculateEstimateTotals(estimate), [estimate]);
  const currencyCode = database.workspace.defaultCurrency;
  const savedProposalCount = database.proposalSnapshots.filter((snapshot) => snapshot.estimateId === estimate.id).length;

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

  function addBlankRow() {
    const newLine: EstimateLineItem = {
      id: `line_manual_${Date.now()}`,
      sectionId: selectedSectionId,
      itemName: "Untitled estimate item",
      description: "Manual row — edit description, quantity, unit, and cost.",
      quantity: 1,
      unit: "lot",
      unitCost: 0,
      scopeStatus: "included",
      linkState: "manual",
    };
    setEstimate((current) => ({ ...current, lineItems: [...current.lineItems, newLine] }));
  }

  function addLibraryItem(item: CostLibraryItem) {
    const newLine = createLineItemFromLibraryItem(item, selectedSectionId);
    setEstimate((current) => ({ ...current, lineItems: [...current.lineItems, newLine] }));
  }

  function resetFromLibrary(line: EstimateLineItem) {
    const source = database.costLibraryItems.find((item) => item.id === line.sourceLibraryItemId);
    if (!source) return;
    const resetLine = createLineItemFromLibraryItem(source, line.sectionId);
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

  function duplicateAsRevision() {
    const versionNumber = estimate.versionNumber + 1;
    const revision: Estimate = {
      ...estimate,
      id: `estimate_rev_${versionNumber}_${Date.now()}`,
      name: `${estimate.name} Revision ${versionNumber}`,
      versionNumber,
      versionLabel: nextRevisionLabel(versionNumber),
      status: "draft",
      lineItems: estimate.lineItems.map((line) => ({ ...line, id: `${line.id}_rev_${versionNumber}` })),
    };
    setEstimate(revision);
    setSavedVersions((current) => [...current, revision]);
  }

  return (
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
          <EstimateSheetCard estimate={estimate} project={project} totals={totals} currencyCode={currencyCode} selectedSectionId={selectedSectionId} setSelectedSectionId={setSelectedSectionId} addBlankRow={addBlankRow} updateLine={updateLine} resetFromLibrary={resetFromLibrary} deleteLine={(lineId) => setEstimate((current) => ({ ...current, lineItems: current.lineItems.filter((line) => line.id !== lineId) }))} />

          <aside className="flex flex-col gap-4">
            <TabList className="grid-cols-3">
              {(["library", "versions", "proposal"] as WorkspaceTab[]).map((tab) => <TabButton key={tab} active={activeTab === tab} onClick={() => setActiveTab(tab)}>{tab}</TabButton>)}
            </TabList>
            {activeTab === "library" ? <LibraryPanel items={database.costLibraryItems} currencyCode={currencyCode} onAdd={addLibraryItem} /> : null}
            {activeTab === "versions" ? <VersionsPanel estimate={estimate} versions={savedVersions} onDuplicate={duplicateAsRevision} onServerDuplicate={onDuplicateRevision} /> : null}
            {activeTab === "proposal" ? <ProposalPanel project={project} estimate={estimate} totals={totals} currencyCode={currencyCode} terms={proposalTerms} onTermsChange={updateTerms} savedProposalCount={savedProposalCount} onSaveEstimate={onSaveEstimate} onIssueProposalSnapshot={onIssueProposalSnapshot} /> : null}
          </aside>
        </div>
      </section>
    </main>
  );
}

type EstimateSheetCardProps = {
  estimate: Estimate;
  project: Project;
  totals: ReturnType<typeof calculateEstimateTotals>;
  currencyCode: string;
  selectedSectionId: string;
  setSelectedSectionId: (value: string) => void;
  addBlankRow: () => void;
  updateLine: (lineId: string, patch: Partial<EstimateLineItem>, changedField?: keyof EstimateLineItem) => void;
  resetFromLibrary: (line: EstimateLineItem) => void;
  deleteLine: (lineId: string) => void;
};

function EstimateSheetCard({ estimate, project, totals, currencyCode, selectedSectionId, setSelectedSectionId, addBlankRow, updateLine, resetFromLibrary, deleteLine }: EstimateSheetCardProps) {
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
          <select aria-label="Selected estimate section for new rows" className="rounded-xl border border-hairline bg-surface px-3 py-2 text-sm" value={selectedSectionId} onChange={(event) => setSelectedSectionId(event.target.value)}>
            {estimate.sections.map((section) => <option key={section.id} value={section.id}>{section.outlineCode} · {section.name}</option>)}
          </select>
          <Button variant="primary" onClick={addBlankRow}><Plus className="size-4" /> Add blank row</Button>
        </div>
      </CardHeader>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1180px] border-collapse text-sm">
          <caption className="sr-only">Editable estimate sheet with quantity, material, labor, scope status, and link state.</caption>
          <thead className="bg-surface-muted text-left text-xs uppercase tracking-[0.12em] text-muted">
            <tr>{["Item", "Scope", "Qty", "Unit", "Material/unit", "Labor/unit", "Total", "Link", "Actions"].map((heading) => <th key={heading} scope="col" className="border-b border-hairline px-3 py-3">{heading}</th>)}</tr>
          </thead>
          <tbody>
            {totals.rows.map((row) => (
              <tr key={row.id} className="border-b border-hairline align-top last:border-0">
                <td className="w-[320px] px-3 py-3">
                  <input aria-label={`Item name for ${row.itemName}`} className="w-full rounded-lg border border-transparent bg-transparent px-2 py-1 font-medium focus:border-accent focus:bg-white focus:outline-none" value={row.itemName} onChange={(event) => updateLine(row.id, { itemName: event.target.value }, "itemName")} />
                  <textarea aria-label={`Description for ${row.itemName}`} className="mt-1 min-h-12 w-full resize-y rounded-lg border border-transparent bg-transparent px-2 py-1 text-xs leading-5 text-muted focus:border-accent focus:bg-white focus:outline-none" value={row.description ?? ""} onChange={(event) => updateLine(row.id, { description: event.target.value }, "description")} />
                </td>
                <td className="px-3 py-3">
                  <select aria-label={`Scope status for ${row.itemName}`} className="w-40 rounded-lg border border-hairline bg-surface px-2 py-2 text-xs" value={row.scopeStatus} onChange={(event) => updateLine(row.id, { scopeStatus: event.target.value as EstimateLineItem["scopeStatus"] }, "scopeStatus")}>
                    {scopeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                  {!row.includedInTotal ? <p className="mt-2 text-xs text-muted">Excluded from total</p> : null}
                </td>
                <td className="px-3 py-3"><NumberInput label={`Quantity for ${row.itemName}`} value={row.quantity} onChange={(value) => updateLine(row.id, { quantity: value }, "quantity")} /></td>
                <td className="px-3 py-3"><TextInput className="w-20" value={row.unit} onChange={(event) => updateLine(row.id, { unit: event.target.value }, "unit")} aria-label={`Unit for ${row.itemName}`} /></td>
                <td className="px-3 py-3"><NumberInput label={`Material unit cost for ${row.itemName}`} value={row.materialUnitCost ?? row.unitCost ?? 0} onChange={(value) => updateLine(row.id, { materialUnitCost: value, unitCost: undefined }, "materialUnitCost")} /></td>
                <td className="px-3 py-3"><NumberInput label={`Labor unit cost for ${row.itemName}`} value={row.laborUnitCost ?? 0} onChange={(value) => updateLine(row.id, { laborUnitCost: value }, "laborUnitCost")} /></td>
                <td className="px-3 py-3 text-right font-mono font-semibold">{formatMoney(row.calculated.total, currencyCode)}</td>
                <td className="px-3 py-3"><LinkStateBadge state={row.linkState} /></td>
                <td className="px-3 py-3"><div className="flex gap-1">{row.sourceLibraryItemId ? <Button aria-label={`Reset ${row.itemName} from library`} variant="ghost" size="icon" onClick={() => resetFromLibrary(row)}><RotateCcw className="size-4" /></Button> : null}<Button aria-label={`Delete ${row.itemName}`} variant="danger" size="icon" onClick={() => deleteLine(row.id)}><Trash2 className="size-4" /></Button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function NumberInput({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <TextInput aria-label={label} className="w-28 text-right font-mono" min={0} type="number" value={value} onChange={(event) => onChange(parseNumberInput(event.target.value))} />;
}

function LinkStateBadge({ state }: { state: EstimateLineItem["linkState"] }) {
  const tone = state === "linked-clean" ? "approved" : state === "linked-overridden" || state === "source-changed" ? "review" : "neutral";
  return <StatusPill tone={tone}>{state}</StatusPill>;
}

function LibraryPanel({ items, currencyCode, onAdd }: { items: CostLibraryItem[]; currencyCode: string; onAdd: (item: CostLibraryItem) => void }) {
  const [query, setQuery] = useState("");
  const filtered = items.filter((item) => `${item.name} ${item.category} ${item.itemType}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <Card>
      <CardContent>
        <CardTitle>Cost library</CardTitle>
        <CardDescription>Click to insert a copied, editable row into the current estimate.</CardDescription>
        <TextInput aria-label="Search cost library" className="mt-4 w-full" placeholder="Search library…" value={query} onChange={(event) => setQuery(event.target.value)} />
        <div className="mt-4 space-y-3">{filtered.map((item) => <div key={item.id} className="rounded-2xl border border-hairline p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-medium">{item.name}</p><p className="mt-1 text-xs text-muted">{item.category} · {item.itemType} · {item.unit}</p><p className="mt-1 text-xs text-muted">Price date: {item.pricingDate}</p></div><p className="font-mono text-sm font-semibold">{formatMoney(item.defaultUnitCost, currencyCode)}</p></div><Button className="mt-3 w-full" variant="primary" onClick={() => onAdd(item)}>Add to estimate</Button></div>)}</div>
      </CardContent>
    </Card>
  );
}

function VersionsPanel({ estimate, versions, onDuplicate, onServerDuplicate }: { estimate: Estimate; versions: Estimate[]; onDuplicate: () => void; onServerDuplicate?: (estimateId: string) => Promise<void> }) {
  return <Card><CardContent><CardTitle>Versions</CardTitle><CardDescription>Create a revision copy before design changes so issued proposals are not silently mutated.</CardDescription><div className="mt-4 grid gap-2"><Button variant="primary" onClick={onDuplicate}>Duplicate draft locally</Button>{onServerDuplicate ? <Button onClick={() => void onServerDuplicate(estimate.id)}>Save as persisted revision</Button> : null}</div><div className="mt-4 space-y-3">{versions.map((version) => <div key={version.id} className={`rounded-2xl border p-4 ${version.id === estimate.id ? "border-accent bg-amber-50" : "border-hairline"}`}><p className="font-medium">{version.versionLabel}</p><p className="mt-1 text-xs text-muted">{version.name} · {version.status}</p></div>)}</div></CardContent></Card>;
}

function ProposalPanel({ project, estimate, totals, currencyCode, terms, onTermsChange, savedProposalCount, onSaveEstimate, onIssueProposalSnapshot }: { project: Project; estimate: Estimate; totals: ReturnType<typeof calculateEstimateTotals>; currencyCode: string; terms: ProposalTerms; onTermsChange: (patch: Partial<ProposalTerms>) => void; savedProposalCount: number; onSaveEstimate?: (estimate: Estimate) => Promise<void>; onIssueProposalSnapshot?: (estimate: Estimate, terms: ProposalTerms) => Promise<void> }) {
  const sectionSummaries = estimate.sections.map((section) => ({ ...section, total: totals.rows.filter((row) => row.sectionId === section.id && row.includedInTotal).reduce((sum, row) => sum + row.calculated.total, 0) }));

  return (
    <Card className="bg-proposal-paper">
      <CardContent className="grid gap-4">
        <div className="grid gap-2"><Button variant="secondary" onClick={() => void onSaveEstimate?.(estimate)}>Save estimate to local JSON</Button><Button variant="primary" onClick={() => void onIssueProposalSnapshot?.(estimate, terms)}>Issue immutable proposal snapshot</Button><p className="text-xs text-muted">Issued snapshots for this estimate: {savedProposalCount}</p></div>
        <Card className="bg-white/75 shadow-none"><CardContent className="grid gap-3"><CardTitle>Proposal terms builder</CardTitle><Field label="Subject"><TextInput value={terms.subject} onChange={(event) => onTermsChange({ subject: event.target.value })} /></Field><Field label="Through / attention"><TextInput value={terms.throughName ?? ""} onChange={(event) => onTermsChange({ throughName: event.target.value })} /></Field><Field label="Contractor/company"><TextInput value={terms.contractorName} onChange={(event) => onTermsChange({ contractorName: event.target.value })} /></Field><Field label="Tax/VAT statement"><Textarea value={terms.taxStatement} onChange={(event) => onTermsChange({ taxStatement: event.target.value })} /></Field><Field label="Validity days"><TextInput type="number" min={1} value={terms.validityDays} onChange={(event) => onTermsChange({ validityDays: Math.max(1, parseNumberInput(event.target.value)) })} /></Field><Field label="Payment terms"><Textarea value={terms.paymentTerms} onChange={(event) => onTermsChange({ paymentTerms: event.target.value })} /></Field><Field label="Warranty terms"><Textarea value={terms.warrantyTerms} onChange={(event) => onTermsChange({ warrantyTerms: event.target.value })} /></Field><Field label="Duration note"><Textarea value={terms.durationNote} onChange={(event) => onTermsChange({ durationNote: event.target.value })} /></Field><Field label="Inclusions"><Textarea value={terms.inclusions} onChange={(event) => onTermsChange({ inclusions: event.target.value })} /></Field><Field label="Exclusions"><Textarea value={terms.exclusions} onChange={(event) => onTermsChange({ exclusions: event.target.value })} /></Field></CardContent></Card>
        <div className="rounded-xl border border-hairline bg-white/70 p-5 font-serif"><p className="text-xs uppercase tracking-[0.16em] text-muted">Proposal Preview</p><h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">{terms.subject}</h2><p className="mt-3 text-sm leading-6">We are pleased to submit this proposal for <strong>{project.name}</strong> located in {project.location}. This preview uses editable commercial terms and becomes immutable only after issuance.</p><div className="mt-5 rounded-xl bg-foreground p-4 text-white"><p className="text-xs text-white/70">Total proposed amount</p><p className="mt-1 font-mono text-2xl font-semibold">{formatMoney(totals.grandTotal, currencyCode)}</p></div><h3 className="mt-5 font-sans text-sm font-semibold uppercase tracking-[0.12em]">Section Summary</h3><div className="mt-2 space-y-2">{sectionSummaries.map((section) => <div key={section.id} className="flex justify-between border-b border-hairline py-2 text-sm"><span>{section.outlineCode}. {section.name}</span><span className="font-mono">{formatMoney(section.total, currencyCode)}</span></div>)}</div><h3 className="mt-5 font-sans text-sm font-semibold uppercase tracking-[0.12em]">Commercial terms</h3><dl className="mt-2 grid gap-2 text-sm"><div><dt className="font-sans font-semibold">Validity</dt><dd className="text-muted">{terms.validityDays} days</dd></div><div><dt className="font-sans font-semibold">Payment</dt><dd className="text-muted">{terms.paymentTerms}</dd></div><div><dt className="font-sans font-semibold">Exclusions</dt><dd className="text-muted">{terms.exclusions}</dd></div></dl></div>
      </CardContent>
    </Card>
  );
}
