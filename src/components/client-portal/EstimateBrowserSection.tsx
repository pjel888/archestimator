"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { buildClientPortalEstimateBrowserBranches, getClientPortalEstimateBrowserPage, type ClientPortalEstimateBrowserBranch, type ClientPortalEstimateBrowserPayload, type ClientPortalEstimateBrowserRow } from "@/lib/client-portal/estimate-browser";

type Branch = Omit<ClientPortalEstimateBrowserBranch, "nodeIds"> & { nodeIds: Set<string> };

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
  return row.description.trim() || row.designation.trim() || row.discipline.trim() || "Untitled item";
}

type DiscussionTarget = { kind: "estimate" | "estimate_tab" | "area_group" | "row" | "component"; publicId: string; label: string; secondaryLabel: string | null };

type ServerPage = { hasMore: boolean; nextCursor: string | null; rows: ClientPortalEstimateBrowserRow[]; totalRows: number };

export function EstimateBrowserSection({ onDiscussTarget, payload, sectionId, token }: { onDiscussTarget?: (target: DiscussionTarget) => void; payload: unknown; sectionId: string; token: string }) {
  const browser = isEstimateBrowserPayload(payload) ? payload : null;
  const [activeEstimateId, setActiveEstimateId] = useState<string | null>(null);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [activeBranchId, setActiveBranchId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(1);
  const [serverRows, setServerRows] = useState<ClientPortalEstimateBrowserRow[]>([]);
  const [serverCursor, setServerCursor] = useState<string | null>(null);
  const [serverHasMore, setServerHasMore] = useState(false);
  const [serverTotalRows, setServerTotalRows] = useState(0);
  const [serverState, setServerState] = useState<"idle" | "loading" | "ready" | "error">("idle");

  const activeEstimate = browser?.estimates.find((estimate) => estimate.id === activeEstimateId) ?? browser?.estimates[0] ?? null;
  const activeTab = activeEstimate?.tabs.find((tab) => tab.id === activeTabId) ?? activeEstimate?.tabs[0] ?? null;
  const rows = useMemo(() => activeTab?.rows ?? [], [activeTab]);
  const branches = useMemo<Branch[]>(() => {
    if (!activeTab) return [];
    const summaries = activeTab.branches?.length ? activeTab.branches : buildClientPortalEstimateBrowserBranches(rows, activeTab.treeNodes ?? activeEstimate?.treeNodes ?? []);
    return summaries.map((branch) => ({ ...branch, nodeIds: new Set(branch.nodeIds) }));
  }, [activeEstimate?.treeNodes, activeTab, rows]);
  const activeBranch = branches.find((branch) => branch.id === activeBranchId) ?? null;
  const serverPaging = browser?.paging?.mode === "server";
  const activeEstimateKey = activeEstimate?.id ?? null;
  const activeTabKey = activeTab?.id ?? null;
  const activeBranchKey = activeBranch?.id ?? null;
  const filteredRows = useMemo(() => {
    if (serverPaging) return serverRows;
    const query = search.trim().toLocaleLowerCase();
    return rows.filter((row) => {
      const path = designationPath(row);
      const inBranch = !activeBranch || (row.nodeId && activeBranch.nodeIds.size > 0 ? activeBranch.nodeIds.has(row.nodeId) : activeBranch.path.every((part, index) => path[index]?.toLocaleLowerCase() === part.toLocaleLowerCase()));
      const matchesSearch = !query || [row.description, row.designation, row.discipline, row.unit].some((value) => value.toLocaleLowerCase().includes(query));
      return inBranch && matchesSearch;
    });
  }, [activeBranch, rows, search, serverPaging, serverRows]);
  const pageSize = browser?.pageSize ?? 100;
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const visibleRows = serverPaging ? serverRows : Array.from({ length: Math.min(visibleCount, pageCount) }, (_, index) => getClientPortalEstimateBrowserPage(filteredRows, index + 1, pageSize)).flatMap((page) => page.rows);

  const fetchServerPage = useCallback(async (cursor: string | null, append: boolean, signal?: AbortSignal) => {
    if (!activeEstimateKey || !activeTabKey) return;
    setServerState("loading");
    const query = new URLSearchParams({ estimateId: activeEstimateKey, limit: String(pageSize), tabId: activeTabKey });
    if (activeBranchKey) query.set("branchId", activeBranchKey);
    if (cursor) query.set("cursor", cursor);
    if (search.trim()) query.set("search", search.trim());
    const response = await fetch(`/api/share/${encodeURIComponent(token)}/sections/${encodeURIComponent(sectionId)}/rows?${query}`, { cache: "no-store", signal }).catch(() => null);
    if (signal?.aborted) return;
    const page = response?.ok ? await response.json().catch(() => null) as ServerPage | null : null;
    if (!page || !Array.isArray(page.rows)) { setServerState("error"); return; }
    setServerRows((current) => append ? [...current, ...page.rows] : page.rows);
    setServerCursor(page.nextCursor);
    setServerHasMore(page.hasMore);
    setServerTotalRows(page.totalRows);
    setServerState("ready");
  }, [activeBranchKey, activeEstimateKey, activeTabKey, pageSize, search, sectionId, token]);

  useEffect(() => {
    if (!serverPaging || !activeEstimateKey || !activeTabKey) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      setServerRows([]);
      setServerCursor(null);
      setServerHasMore(false);
      void fetchServerPage(null, false, controller.signal);
    }, 150);
    return () => { window.clearTimeout(timeout); controller.abort(); };
  }, [activeEstimateKey, activeTabKey, fetchServerPage, serverPaging]);

  useEffect(() => {
    if (serverPaging) return;
    function includeAllRowsForPrint() { setVisibleCount(pageCount); }
    window.addEventListener("beforeprint", includeAllRowsForPrint);
    return () => window.removeEventListener("beforeprint", includeAllRowsForPrint);
  }, [pageCount, serverPaging]);

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

      {browser.estimates.length > 1 ? <div role="tablist" aria-label="Estimate sheets" className="flex gap-1 overflow-x-auto border-b border-hairline">{browser.estimates.map((estimate) => <button key={estimate.id} type="button" role="tab" aria-selected={estimate.id === activeEstimate.id} className={`cursor-pointer shrink-0 border-b-2 px-3 py-2 text-[12px] font-medium ${estimate.id === activeEstimate.id ? "border-accent text-ink" : "border-transparent text-secondary"}`} onClick={() => selectEstimate(estimate.id)}>{estimate.name}</button>)}</div> : null}
      {activeEstimate.tabs.length > 1 ? <div role="tablist" aria-label={`${activeEstimate.name} tabs`} className="flex gap-1 overflow-x-auto">{activeEstimate.tabs.map((tab) => <Button key={tab.id} size="sm" variant={tab.id === activeTab.id ? "soft" : "ghost"} onClick={() => selectTab(tab.id)}>{tab.name}</Button>)}</div> : null}

      <div className="overflow-hidden border border-hairline bg-white lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]">
        <aside className="border-b border-hairline bg-surfaceMuted/25 lg:border-b-0 lg:border-r">
          <div className="border-b border-hairline p-3"><p className="text-[10px] font-medium uppercase tracking-wide text-tertiary">Area branches</p><button type="button" className={`mt-2 flex w-full cursor-pointer items-center justify-between gap-3 px-2 py-1.5 text-left text-[12px] ${!activeBranch ? "bg-white font-medium text-ink" : "text-secondary hover:bg-white"}`} onClick={() => selectBranch(null)}><span>All areas</span><span className="tabular-nums">{activeTab.rowCount}</span></button></div>
          <nav aria-label="Estimate area branches" className="max-h-[480px] overflow-y-auto p-2">{branches.map((branch) => <button key={branch.id} type="button" className={`mb-0.5 grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto] gap-2 px-2 py-1.5 text-left text-[12px] ${activeBranch?.id === branch.id ? "bg-white font-medium text-ink" : "text-secondary hover:bg-white hover:text-ink"}`} style={{ paddingLeft: `${8 + branch.depth * 14}px` }} onClick={() => selectBranch(branch.id)}><span className="truncate">{branch.label}</span><span className="tabular-nums text-[10px] text-tertiary">{formatMoney(branch.total, browser.currencyCode)}</span></button>)}</nav>
        </aside>

        <div className="min-w-0">
          <div className="flex flex-col gap-3 border-b border-hairline p-3 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="text-[13px] font-medium text-ink">{activeBranch?.label ?? "All issued items"}</h3><p className="text-[11px] text-secondary">{serverPaging ? serverTotalRows : filteredRows.length} matching line item{(serverPaging ? serverTotalRows : filteredRows.length) === 1 ? "" : "s"}</p></div><div className="flex w-full items-center gap-2 sm:max-w-md">{onDiscussTarget ? <Button size="sm" variant="secondary" onClick={() => onDiscussTarget(activeBranch ? { kind: "area_group", publicId: activeBranch.id, label: activeBranch.label, secondaryLabel: activeEstimate.name } : { kind: "estimate_tab", publicId: activeTab.id, label: activeTab.name, secondaryLabel: activeEstimate.name })}>Discuss {activeBranch ? "area" : "sheet"}</Button> : null}<input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setVisibleCount(1); }} placeholder="Search issued items" aria-label="Search issued estimate items" className="min-h-9 min-w-0 flex-1 border border-hairline bg-white px-3 text-[12px] outline-none focus:ring-2 focus:ring-focus" /></div></div>
          <div className="overflow-x-auto">
            <table className="min-w-[760px] border-collapse text-left text-[12px] leading-5">
              <thead className="sticky top-0 bg-surfaceMuted text-[10px] font-medium uppercase tracking-wide text-tertiary"><tr><th className="px-3 py-2">Area / particulars</th><th className="px-3 py-2">Discipline</th><th className="px-3 py-2 text-right">Qty</th><th className="px-3 py-2">Unit</th><th className="px-3 py-2 text-right">Line total</th>{onDiscussTarget ? <th className="px-3 py-2 text-right">Review</th> : null}</tr></thead>
              <tbody>{visibleRows.length > 0 ? visibleRows.map((row) => <tr key={row.id} id={row.id} className="border-t border-hairline align-top hover:bg-surfaceMuted/40"><td className="px-3 py-2"><p className="text-ink">{rowLabel(row)}</p><p className="mt-0.5 text-[10px] text-tertiary">{designationPath(row).join(" / ")}</p></td><td className="px-3 py-2 text-secondary">{row.discipline}</td><td className="px-3 py-2 text-right tabular-nums text-secondary">{row.quantity}</td><td className="px-3 py-2 text-secondary">{row.unit}</td><td className="px-3 py-2 text-right tabular-nums font-medium text-ink">{formatMoney(row.rowTotal, browser.currencyCode)}</td>{onDiscussTarget ? <td className="px-3 py-2 text-right"><div className="flex justify-end gap-1">{row.componentAnchor ? <Button aria-label={`Discuss component ${rowLabel(row)}`} size="sm" variant="ghost" onClick={() => onDiscussTarget({ kind: "component", publicId: row.componentAnchor!, label: rowLabel(row), secondaryLabel: row.variantLabel?.trim() || activeBranch?.label || activeEstimate.name })}>Component</Button> : null}<Button aria-label={`Discuss row ${rowLabel(row)}`} size="sm" variant="ghost" onClick={() => onDiscussTarget({ kind: "row", publicId: row.id, label: rowLabel(row), secondaryLabel: activeBranch?.label ?? activeEstimate.name })}>Row</Button></div></td> : null}</tr>) : <tr><td colSpan={onDiscussTarget ? 6 : 5} className="border-t border-hairline p-6 text-center text-[13px] text-secondary">{serverState === "loading" ? "Loading issued items…" : serverState === "error" ? "Issued items are temporarily unavailable." : "No issued items match this view."}</td></tr>}</tbody>
            </table>
          </div>
          {serverPaging && serverHasMore ? <div className="flex flex-wrap gap-2 border-t border-hairline p-3"><Button size="sm" variant="secondary" disabled={serverState === "loading"} onClick={() => void fetchServerPage(serverCursor, true)}>{serverState === "loading" ? "Loading…" : "Load more"}</Button></div> : null}
          {!serverPaging && visibleCount < pageCount ? <div className="flex flex-wrap gap-2 border-t border-hairline p-3"><Button size="sm" variant="secondary" onClick={() => setVisibleCount((count) => count + 1)}>Load more</Button><Button size="sm" variant="ghost" onClick={() => setVisibleCount(pageCount)}>Load all {filteredRows.length} rows</Button></div> : null}
        </div>
      </div>
    </div>
  );
}
