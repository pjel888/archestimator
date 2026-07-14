import { CostDonutChart } from "@/components/charts/CostDonutChart";
import type { PublicationSnapshotEstimate } from "@/lib/publication/types";
import { aggregateRowsByDiscipline } from "@/lib/share/aggregate-share-chart-buckets";
import { getBestShareTree } from "@/lib/share/reconstruct-share-tree";

type ShareFinancialOverviewProps = {
  currencyCode: string;
  estimates: PublicationSnapshotEstimate[];
};

const moneyFormatter = new Intl.NumberFormat("en-PH", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const percentFormatter = new Intl.NumberFormat("en-PH", {
  style: "percent",
  maximumFractionDigits: 0,
});

function formatMoney(value: number, currencyCode: string) {
  return `${currencyCode} ${moneyFormatter.format(value)}`;
}

export default function ShareFinancialOverview({ currencyCode, estimates }: ShareFinancialOverviewProps) {
  const total = estimates.reduce((sum, estimate) => sum + estimate.totalCost, 0);
  const rowCount = estimates.reduce((sum, estimate) => sum + estimate.rowCount, 0);
  const disciplineBuckets = aggregateRowsByDiscipline(estimates.flatMap((estimate) => estimate.rows));
  const disciplineBreakdownId = "share-financial-discipline-breakdown";
  const areasByLabel = new Map<string, { label: string; total: number; rowCount: number }>();

  for (const estimate of estimates) {
    for (const area of getBestShareTree(estimate.rows, estimate.treeNodes)) {
      const key = area.label.trim().toLocaleLowerCase();
      const current = areasByLabel.get(key);
      areasByLabel.set(key, {
        label: current?.label ?? area.label,
        total: (current?.total ?? 0) + area.total,
        rowCount: (current?.rowCount ?? 0) + area.rowCount,
      });
    }
  }

  const areas = [...areasByLabel.values()].sort((left, right) => right.total - left.total);
  const largestArea = areas[0]?.total ?? 0;

  return (
    <section aria-labelledby="share-financial-heading" className="space-y-3">
      <div className="grid gap-px border-y border-hairline bg-hairline sm:grid-cols-3">
        <div className="bg-white py-3 pr-3">
          <p className="text-[9px] font-medium leading-[12px] text-tertiary">Issued total</p>
          <p className="mt-1 text-[18px] font-medium leading-[24px] tabular-nums text-ink">{formatMoney(total, currencyCode)}</p>
        </div>
        <div className="bg-white py-3 pr-3">
          <p className="text-[9px] font-medium leading-[12px] text-tertiary">Estimate sheets</p>
          <p className="mt-1 text-[18px] font-medium leading-[24px] tabular-nums text-ink">{estimates.length}</p>
        </div>
        <div className="bg-white py-3">
          <p className="text-[9px] font-medium leading-[12px] text-tertiary">Line items</p>
          <p className="mt-1 text-[18px] font-medium leading-[24px] tabular-nums text-ink">{rowCount}</p>
        </div>
      </div>

      {disciplineBuckets.length > 0 ? (
        <div className="mx-auto grid w-full max-w-[560px] gap-3 sm:grid-cols-[190px_minmax(0,1fr)] sm:items-center" data-share-cost-breakdown>
          <CostDonutChart
            buckets={disciplineBuckets}
            total={total}
            currencyCode={currencyCode}
            label="Issued estimate cost breakdown"
            compact
            hideCallouts
            describedById={disciplineBreakdownId}
          />
          <ul
            id={disciplineBreakdownId}
            aria-label="Issued estimate cost breakdown"
            className="grid gap-1 rounded-xs border border-hairline bg-white p-2 text-[12px] leading-[16px] tracking-normal"
            data-share-cost-breakdown-list
          >
            {disciplineBuckets.map((bucket) => (
              <li key={bucket.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-2 gap-y-0.5">
                <span className="flex min-w-0 items-center gap-1.5 text-ink">
                  <span aria-hidden="true" className="size-2 flex-none rounded-xs" style={{ backgroundColor: bucket.color }} />
                  <span className="truncate">{bucket.label}</span>
                </span>
                <span className="text-right tabular-nums text-secondary">{percentFormatter.format(Number.isFinite(bucket.share) ? bucket.share : 0)}</span>
                <span className="col-start-2 text-right tabular-nums text-ink">{formatMoney(bucket.total, currencyCode)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
        <div className="border border-hairline bg-white p-3">
          <div className="mb-3">
            <h2 id="share-financial-heading" className="text-[12px] font-medium leading-[16px] text-ink">Cost by area</h2>
            <p className="mt-0.5 text-[10px] leading-[14px] text-secondary">Issued costs grouped by the top-level branches in the estimate hierarchy.</p>
          </div>
          {areas.length > 0 ? (
            <ol className="space-y-3">
              {areas.map((area) => {
                const width = largestArea > 0 ? Math.max((area.total / largestArea) * 100, 2) : 0;
                const share = total > 0 ? area.total / total : 0;
                return (
                  <li key={area.label}>
                    <div className="mb-1 flex items-baseline justify-between gap-4 text-[11px] leading-[16px]">
                      <span className="min-w-0 truncate font-medium text-ink">{area.label}</span>
                      <span className="shrink-0 tabular-nums text-ink">{formatMoney(area.total, currencyCode)}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-xs bg-surfaceMuted" aria-hidden="true">
                      <div className="h-full rounded-xs bg-accent" style={{ width: `${width}%` }} />
                    </div>
                    <div className="mt-1 flex justify-between text-[9px] leading-[12px] text-secondary">
                      <span>{area.rowCount} item{area.rowCount === 1 ? "" : "s"}</span>
                      <span>{new Intl.NumberFormat("en-PH", { style: "percent", maximumFractionDigits: 1 }).format(share)}</span>
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="border border-dashed border-hairline bg-surfaceMuted p-3 text-[10px] leading-[14px] text-secondary">No area breakdown is available in this issued estimate.</p>
          )}
        </div>

        <div className="border border-hairline bg-white p-3">
          <h2 className="text-[12px] font-medium leading-[16px] text-ink">Estimate sheets</h2>
          <p className="mt-0.5 text-[10px] leading-[14px] text-secondary">A reconciliation of every sheet included in this issue.</p>
          <div className="mt-3 divide-y divide-hairline border-y border-hairline">
            {estimates.map((estimate) => (
              <div key={estimate.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 py-2 text-[11px] leading-[16px]">
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">{estimate.name}</p>
                  <p className="text-[9px] leading-[12px] text-secondary">{[estimate.sheetCode, `${estimate.rowCount} items`].filter(Boolean).join(" · ")}</p>
                </div>
                <p className="tabular-nums text-ink">{formatMoney(estimate.totalCost, currencyCode)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
