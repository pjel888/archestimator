"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { getClientPortalEstimateBrowserPage, type ClientPortalEstimateBrowserPayload, type ClientPortalEstimateBrowserRow } from "@/lib/client-portal/estimate-browser";
import type { PublicationSnapshotTreeNode } from "@/lib/publication/types";

type Branch = { id: string; label: string; path: string[]; depth: number; nodeIds: Set<string>; total: number; rowCount: number };

function isEstimateBrowserPayload(value: unknown): value is ClientPortalEstimateBrowserPayload {
  return Boolean(value && typeof value === "object" && (value as { schemaVersion?: unknown }).schemaVersion === 1 && Array.isArray((value as { estimates?: unknown }).estimates));
}

function formatMoney(value: number, currencyCode: string) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: currencyCode, maximumFractionDigits: 2 }).format(value);
}

function designationPath(row: ClientPortalEstimateBrowserRow) {
  const path = row.designation.split(/\s*(?:>|\/|\s[-–—]\s)\s*/).map((part) => part.trim()).filter(Boolean);
  return path.length > 0 ? path : [row.discipline.trim() || "Unassigned"];
}

function rowLabel(row: ClientPortalEstimateBrowserRow) {
  return row.description.trim() || row.material.trim() || row.designation.trim() || "Untitled item";
}

function branchesForRows(rows: ClientPortalEstimateBrowserRow[], treeNodes: PublicationSnapshotTreeNode[]): Branch[] {
  if (treeNodes.length > 0) {
    const branches: Branch[] = [];
    function visit(node: PublicationSnapshotTreeNode, path: string[], depth: number): Set<string> {
      const nodeIds = new Set([node.id]);
      for (const child of node.children) for (const id of visit(child, [...path, node.name], depth + 1)) nodeIds.add(id);
      const matchingRows = rows.filter((row) => row.nodeId && nodeIds.has(row.nodeId));
      branches.push({ id: node.id, label: node.name, path: [...path, node.name], depth, nodeIds, total: matchingRows.reduce((total, row) => total + row.rowTotal, 0), rowCount: matchingRows.length });
      return nodeIds;
    }
    for (const node of treeNodes) visit(node, [], 0);
    return branches.sort((left, right) => left.path.join("\u001f").localeCompare(right.path.join("\u001f")));
  }
  const branches = new Map<string, Branch>();
  for (const row of rows) {
    const path = designationPath(row);
    path.forEach((label, depth) => {
      const currentPath = path.slice(0, depth + 1);
      const id = currentPath.join("\u001f").toLocaleLowerCase();
      const current = branches.get(id);
      branches.set(id, { id, label, path: currentPath, depth, nodeIds: new Set(), total: (current?.total ?? 0) + row.rowTotal, rowCount: (current?.rowCount ?? 0) + 1 });
    });
  }
  return [...branches.values()].sort((left, right) => left.path.join("\u001f").localeCompare(right.path.join("\u001f")));
}

type DiscussionTarget = { kind: "estimate" | "estimate_tab" | "area_group" | "row"; publicId: string; label: string; secondaryLabel: string | null };

export function EstimateBrowserSection({ onDiscussTarget, payload }: { onDiscussTarget?: (target: DiscussionTarget) => void; payload: unknown }) {
  const browser = isEstimateBrowserPayload(payload) ? payload : null;
  const [activeEstimateId, setActiveEstimateId] = useState<string | null>(null);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [activeBranchId, setActiveBranchId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(1);

  const activeEstimate = browser?.estimates.find((estimate) => estimate.id === activeEstimateId) ?? browser?.estimates[0] ?? null;
  const activeTab = activeEstimate?.tabs.find((tab) => tab.id === activeTabId) ?? activeEstimate?.tabs[0] ?? null;
  const rows = useMemo(() => activeTab?.rows ?? [], [activeTab]);
  const branches = useMemo(() => branchesForRows(rows, activeTab?.treeNodes ?? activeEstimate?.treeNodes ?? []), [activeEstimate?.treeNodes, activeTab?.treeNodes, rows]);
  const activeBranch = branches.find((branch) => branch.id === activeBranchId) ?? null;
  const filteredRows = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return rows.filter((row) => {
      const path = designationPath(row);
      const inBranch = !activeBranch || (row.nodeId && activeBranch.nodeIds.size > 0 ? activeBranch.nodeIds.has(row.nodeId) : activeBranch.path.every((part, index) => path[index]?.toLocaleLowerCase() === part.toLocaleLowerCase()));
      const matchesSearch = !query || [row.description, row.material, row.designation, row.discipline, row.unit].some((value) => value.toLocaleLowerCase().includes(query));
      return inBranch && matchesSearch;
    });
  }, [activeBranch, rows, search]);
  const pageSize = browser?.pageSize ?? 100;
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const visibleRows = Array.from({ length: Math.min(visibleCount, pageCount) }, (_, index) => getClientPortalEstimateBrowserPage(filteredRows, index + 1, pageSize)).flatMap((page) => page.rows);

  useEffect(() => {
    function includeAllRowsForPrint() { setVisibleCount(pageCount); }
    window.addEventListener("beforeprint", includeAllRowsForPrint);
    return () => window.removeEventListener("beforeprint", includeAllRowsForPrint);
  }, [pageCount]);

  if (!browser || !activeEstimate || !activeTab) return <p className="text-[13px] text-secondary">This issued estimate browser payload is unavailable.</p>;

  function selectEstimate(estimateId: string) { setActiveEstimateId(estimateId); setActiveTabId(null); setActiveBranchId(null); setSearch(""); setVisibleCount(1); }
  function selectTab(tabId: string) { setActiveTabId(tabId); setActiveBranchId(null); setSearch(""); setVisibleCount(1); }
  function selectBranch(branchId: string | null) { setActiveBranchId(branchId); setVisibleCount(1); }

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-3 border-b border-hairline pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-[14px] font-medium text-ink">{activeEstimate.name}</p><p className="mt-1 text-[12px] text-secondary">{browser.estimates.length} estimate sheet{browser.estimates.length === 1 ? "" : "s"} · {browser.totalRowCount} issued rows</p></div>
        <p className="text-[18px] font-medium tracking-tight text-ink">{formatMoney(activeTab.totalCost, browser.currencyCode)}</p>
      </div>

      {browser.estimates.length > 1 ? <div role="tablist" aria-label="Estimate sheets" className="flex gap-1 overflow-x-auto border-b border-hairline">{browser.estimates.map((estimate) => <button key={estimate.id} type="button" role="tab" aria-selected={estimate.id === activeEstimate.id} className={`shrink-0 border-b-2 px-3 py-2 text-[12px] font-medium ${estimate.id === activeEstimate.id ? "border-accent text-ink" : "border-transparent text-secondary"}`} onClick={() => selectEstimate(estimate.id)}>{estimate.name}</button>)}</div> : null}
      {activeEstimate.tabs.length > 1 ? <div role="tablist" aria-label={`${activeEstimate.name} tabs`} className="flex gap-1 overflow-x-auto">{activeEstimate.tabs.map((tab) => <Button key={tab.id} size="sm" variant={tab.id === activeTab.id ? "soft" : "ghost"} onClick={() => selectTab(tab.id)}>{tab.name}</Button>)}</div> : null}

      <div className="overflow-hidden border border-hairline bg-white lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]">
        <aside className="border-b border-hairline bg-surfaceMuted/25 lg:border-b-0 lg:border-r">
          <div className="border-b border-hairline p-3"><p className="text-[10px] font-medium uppercase tracking-wide text-tertiary">Area branches</p><button type="button" className={`mt-2 flex w-full items-center justify-between gap-3 px-2 py-1.5 text-left text-[12px] ${!activeBranch ? "bg-white font-medium text-ink" : "text-secondary hover:bg-white"}`} onClick={() => selectBranch(null)}><span>All areas</span><span className="tabular-nums">{rows.length}</span></button></div>
          <nav aria-label="Estimate area branches" className="max-h-[480px] overflow-y-auto p-2">{branches.map((branch) => <button key={branch.id} type="button" className={`mb-0.5 grid w-full grid-cols-[minmax(0,1fr)_auto] gap-2 px-2 py-1.5 text-left text-[12px] ${activeBranch?.id === branch.id ? "bg-white font-medium text-ink" : "text-secondary hover:bg-white hover:text-ink"}`} style={{ paddingLeft: `${8 + branch.depth * 14}px` }} onClick={() => selectBranch(branch.id)}><span className="truncate">{branch.label}</span><span className="tabular-nums text-[10px] text-tertiary">{formatMoney(branch.total, browser.currencyCode)}</span></button>)}</nav>
        </aside>

        <div className="min-w-0">
          <div className="flex flex-col gap-3 border-b border-hairline p-3 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="text-[13px] font-medium text-ink">{activeBranch?.label ?? "All issued items"}</h3><p className="text-[11px] text-secondary">{filteredRows.length} matching line item{filteredRows.length === 1 ? "" : "s"}</p></div><div className="flex w-full items-center gap-2 sm:max-w-md">{onDiscussTarget ? <Button size="sm" variant="secondary" onClick={() => onDiscussTarget(activeBranch ? { kind: "area_group", publicId: activeBranch.id, label: activeBranch.label, secondaryLabel: activeEstimate.name } : { kind: "estimate_tab", publicId: activeTab.id, label: activeTab.name, secondaryLabel: activeEstimate.name })}>Discuss {activeBranch ? "area" : "sheet"}</Button> : null}<input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setVisibleCount(1); }} placeholder="Search issued items" aria-label="Search issued estimate items" className="min-h-9 min-w-0 flex-1 border border-hairline bg-white px-3 text-[12px] outline-none focus:ring-2 focus:ring-focus" /></div></div>
          <div className="overflow-x-auto">
            <table className="min-w-[760px] border-collapse text-left text-[12px] leading-5">
              <thead className="sticky top-0 bg-surfaceMuted text-[10px] font-medium uppercase tracking-wide text-tertiary"><tr><th className="px-3 py-2">Area / particulars</th><th className="px-3 py-2">Discipline</th><th className="px-3 py-2 text-right">Qty</th><th className="px-3 py-2">Unit</th><th className="px-3 py-2 text-right">Line total</th>{onDiscussTarget ? <th className="px-3 py-2 text-right">Review</th> : null}</tr></thead>
              <tbody>{visibleRows.length > 0 ? visibleRows.map((row) => <tr key={row.id} id={row.id} className="border-t border-hairline align-top hover:bg-surfaceMuted/40"><td className="px-3 py-2"><p className="text-ink">{rowLabel(row)}</p><p className="mt-0.5 text-[10px] text-tertiary">{designationPath(row).join(" / ")}</p></td><td className="px-3 py-2 text-secondary">{row.discipline}</td><td className="px-3 py-2 text-right tabular-nums text-secondary">{row.quantity}</td><td className="px-3 py-2 text-secondary">{row.unit}</td><td className="px-3 py-2 text-right tabular-nums font-medium text-ink">{formatMoney(row.rowTotal, browser.currencyCode)}</td>{onDiscussTarget ? <td className="px-3 py-2 text-right"><Button size="sm" variant="ghost" onClick={() => onDiscussTarget({ kind: "row", publicId: row.id, label: rowLabel(row), secondaryLabel: activeBranch?.label ?? activeEstimate.name })}>Discuss</Button></td> : null}</tr>) : <tr><td colSpan={onDiscussTarget ? 6 : 5} className="border-t border-hairline p-6 text-center text-[13px] text-secondary">No issued items match this view.</td></tr>}</tbody>
            </table>
          </div>
          {visibleCount < pageCount ? <div className="flex flex-wrap gap-2 border-t border-hairline p-3"><Button size="sm" variant="secondary" onClick={() => setVisibleCount((count) => count + 1)}>Load more</Button><Button size="sm" variant="ghost" onClick={() => setVisibleCount(pageCount)}>Load all {filteredRows.length} rows</Button></div> : null}
        </div>
      </div>
    </div>
  );
}
