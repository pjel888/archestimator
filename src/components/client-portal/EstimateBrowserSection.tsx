"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { getClientPortalEstimateBrowserPage, type ClientPortalEstimateBrowserPayload, type ClientPortalEstimateBrowserRow } from "@/lib/client-portal/estimate-browser";

function isEstimateBrowserPayload(value: unknown): value is ClientPortalEstimateBrowserPayload {
  return Boolean(value && typeof value === "object" && (value as { schemaVersion?: unknown }).schemaVersion === 1 && Array.isArray((value as { estimates?: unknown }).estimates));
}

function formatMoney(value: number, currencyCode: string) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: currencyCode, maximumFractionDigits: 2 }).format(value);
}

export function EstimateBrowserSection({ payload }: { payload: unknown }) {
  const [visibleCount, setVisibleCount] = useState(1);
  const browser = isEstimateBrowserPayload(payload) ? payload : null;
  const rows = useMemo<ClientPortalEstimateBrowserRow[]>(() => browser?.estimates.flatMap((estimate) => estimate.tabs.flatMap((tab) => tab.rows)) ?? [], [browser]);
  const pageSize = browser?.pageSize ?? 100;
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const visibleRows = Array.from({ length: Math.min(visibleCount, pageCount) }, (_, index) => getClientPortalEstimateBrowserPage(rows, index + 1, pageSize)).flatMap((page) => page.rows);

  useEffect(() => {
    function includeAllRowsForPrint() {
      setVisibleCount(pageCount);
    }
    window.addEventListener("beforeprint", includeAllRowsForPrint);
    return () => window.removeEventListener("beforeprint", includeAllRowsForPrint);
  }, [pageCount]);

  if (!browser) return <p className="text-[13px] text-secondary">This issued estimate browser payload is unavailable.</p>;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3 text-[12px]">
        <div><p className="font-medium text-ink">{browser.estimates.length} estimate sheets · {browser.totalRowCount} rows</p><p className="mt-1 text-secondary">Every issued row can be loaded and printed.</p></div>
        <p className="font-medium text-ink">{formatMoney(browser.estimates.reduce((total, estimate) => total + estimate.totalCost, 0), browser.currencyCode)}</p>
      </div>
      <div className="overflow-x-auto border border-hairline">
        <table className="min-w-full border-collapse text-left text-[12px] leading-5">
          <thead className="bg-surfaceMuted text-[10px] font-medium uppercase tracking-wide text-tertiary"><tr><th className="px-3 py-2">Description</th><th className="px-3 py-2">Discipline</th><th className="px-3 py-2 text-right">Qty</th><th className="px-3 py-2">Unit</th><th className="px-3 py-2 text-right">Total</th></tr></thead>
          <tbody>{visibleRows.map((row) => <tr key={row.id} id={row.id} className="border-t border-hairline"><td className="px-3 py-2 text-ink">{row.description}</td><td className="px-3 py-2 text-secondary">{row.discipline}</td><td className="px-3 py-2 text-right text-secondary">{row.quantity}</td><td className="px-3 py-2 text-secondary">{row.unit}</td><td className="px-3 py-2 text-right font-medium text-ink">{formatMoney(row.rowTotal, browser.currencyCode)}</td></tr>)}</tbody>
        </table>
      </div>
      {visibleCount < pageCount ? <div className="flex flex-wrap gap-2"><Button size="sm" variant="secondary" onClick={() => setVisibleCount((count) => count + 1)}>Load more</Button><Button size="sm" variant="ghost" onClick={() => setVisibleCount(pageCount)}>Load all {rows.length} rows</Button></div> : null}
    </div>
  );
}
