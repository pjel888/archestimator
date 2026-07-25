import type {
  ClientPortalCostBreakdownPayload,
  ClientPortalEstimateComparisonPayload,
  ClientPortalFinancialSummaryPayload,
} from "@/lib/client-portal/financial-sections";

type FinancialKind = "financial_summary" | "cost_breakdown" | "estimate_comparison";

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function money(value: number, currencyCode: string) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: currencyCode, maximumFractionDigits: 2 }).format(value);
}

export function ClientPortalFinancialSection({ kind, payload }: { kind: FinancialKind; payload: unknown }) {
  const value = record(payload);
  if (!value || value.schemaVersion !== 1 || typeof value.currencyCode !== "string" || typeof value.totalCost !== "number") {
    return <p className="text-[13px] text-secondary">This issued financial view is unavailable.</p>;
  }
  const totalCost = value.totalCost;

  if (kind === "financial_summary") {
    const summary = value as ClientPortalFinancialSummaryPayload;
    return (
      <div className="grid gap-px overflow-hidden border border-hairline bg-hairline sm:grid-cols-2">
        <div className="bg-white p-5"><p className="text-[10px] font-medium uppercase tracking-wide text-tertiary">Issued total</p><p className="mt-2 text-[28px] font-medium tracking-tight text-ink">{money(summary.totalCost, summary.currencyCode)}</p></div>
        <div className="bg-white p-5"><p className="text-[10px] font-medium uppercase tracking-wide text-tertiary">Estimate sheets</p><p className="mt-2 text-[28px] font-medium tracking-tight text-ink">{summary.estimateCount}</p></div>
      </div>
    );
  }

  const rows = kind === "cost_breakdown"
    ? (value as ClientPortalCostBreakdownPayload).buckets.map((bucket) => ({ id: bucket.id, label: bucket.label, total: bucket.totalCost, meta: null }))
    : (value as ClientPortalEstimateComparisonPayload).estimates.map((estimate) => ({ id: estimate.id, label: estimate.name, total: estimate.totalCost, meta: `${estimate.rowCount} line items` }));
  const largest = rows[0]?.total ?? 0;

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
      <div className="border border-hairline bg-white p-4 sm:p-5">
        <div className="mb-5"><h3 className="text-[16px] font-medium text-ink">{kind === "cost_breakdown" ? "Cost breakdown" : "Estimate comparison"}</h3><p className="mt-1 text-[13px] text-secondary">Every value comes from this immutable issued version.</p></div>
        <ol className="space-y-4">
          {rows.map((row) => {
            const share = totalCost > 0 ? row.total / totalCost : 0;
            return (
              <li key={row.id}>
                <div className="flex items-baseline justify-between gap-4 text-[13px]"><span className="min-w-0 truncate font-medium text-ink">{row.label}</span><span className="shrink-0 tabular-nums text-ink">{money(row.total, value.currencyCode as string)}</span></div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surfaceMuted" aria-hidden="true"><div className="h-full rounded-full bg-accent" style={{ width: `${largest > 0 ? Math.max(row.total / largest * 100, 2) : 0}%` }} /></div>
                <div className="mt-1 flex justify-between text-[11px] text-secondary"><span>{row.meta ?? "Issued cost category"}</span><span>{new Intl.NumberFormat(undefined, { style: "percent", maximumFractionDigits: 1 }).format(share)}</span></div>
              </li>
            );
          })}
        </ol>
      </div>
      <aside className="border border-hairline bg-surfaceMuted/40 p-4 sm:p-5"><p className="text-[10px] font-medium uppercase tracking-wide text-secondary">Reconciled total</p><p className="mt-2 text-[22px] font-medium tracking-tight text-ink">{money(totalCost, value.currencyCode)}</p><p className="mt-3 text-[12px] leading-5 text-secondary">The bars are ranked relative to the largest item. Percentages use the full issued total.</p></aside>
    </div>
  );
}
