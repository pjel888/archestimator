"use client";

import { X } from "@phosphor-icons/react/dist/ssr";

import { CostDonutChart } from "@/components/charts/CostDonutChart";
import { DeltaBadge } from "@/components/ui/delta-badge";
import { DropdownSelect, type DropdownSelectOption } from "@/components/ui/dropdown-select";
import { formatChartMoney, formatChartShare } from "@/lib/project-charts/format";
import type { ProjectChartBucket, ProjectChartGroupingMode } from "@/lib/project-charts/types";
import type { ProjectDataEstimateSheet } from "@/lib/repositories/project-data-repository";
import { cn } from "@/lib/ui/cn";

export type EstimateColumnProps = {
  estimate: ProjectDataEstimateSheet;
  baseline: boolean;
  groupingMode: ProjectChartGroupingMode;
  buckets: ProjectChartBucket[];
  total: number;
  currencyCode: string;
  delta: number | null;
  baselineTotal: number | null;
  activeBucketId: string | null;
  swapOptions: DropdownSelectOption[];
  canSwap: boolean;
  onActiveBucketChange: (id: string | null) => void;
  onSwapEstimate: (nextId: string) => void;
  onRemove?: () => void;
};

function listId(estimateId: string) {
  return `estimate-${estimateId}-breakdown`;
}

export function EstimateColumn({
  estimate,
  baseline,
  groupingMode,
  buckets,
  total,
  currencyCode,
  delta,
  baselineTotal,
  activeBucketId,
  swapOptions,
  canSwap,
  onActiveBucketChange,
  onSwapEstimate,
  onRemove,
}: EstimateColumnProps) {
  const breakdownId = listId(estimate.id);
  const displayBuckets = buckets.filter((bucket) => Number.isFinite(bucket.total) && bucket.total > 0);

  return (
    <section
      aria-label={`${estimate.name} cost breakdown by ${groupingMode}`}
      className="flex min-w-[280px] flex-1 flex-col rounded-xs border border-hairline bg-surface px-4 py-3"
    >
      <header className="flex min-h-6 items-center justify-between gap-2">
        <div className="min-w-0">
          {baseline ? (
            <span className="rounded-xs border border-hairline bg-white px-1.5 py-0.5 text-[9px] font-medium uppercase leading-none text-secondary">
              Baseline
            </span>
          ) : delta != null && baselineTotal != null ? (
            <DeltaBadge delta={delta} baselineTotal={baselineTotal} currencyCode={currencyCode} />
          ) : null}
        </div>
        {!baseline && onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${estimate.name} from comparison`}
            className="grid size-6 shrink-0 cursor-pointer place-items-center rounded-xs text-secondary hover:bg-surfaceMuted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            <X size={16} weight="regular" aria-hidden="true" />
          </button>
        ) : null}
      </header>

      <div className="mt-2 min-w-0">
        <h2 className="truncate text-[12px] font-medium leading-5 text-ink" title={estimate.name}>
          {estimate.name}
        </h2>
        {estimate.sheetCode ? (
          <p className="truncate text-[10px] leading-4 text-secondary" title={estimate.sheetCode}>
            {estimate.sheetCode}
          </p>
        ) : null}
      </div>

      <p className="mt-3 text-[12px] font-medium leading-5 tabular-nums text-ink">
        {formatChartMoney(total, currencyCode)}
      </p>
      <p className="mt-0.5 text-[10px] leading-4 text-secondary">
        {estimate.rowCount.toLocaleString("en-PH")} line items
      </p>

      <div className="mt-3">
        <CostDonutChart
          buckets={displayBuckets}
          total={total}
          currencyCode={currencyCode}
          label={`Cost breakdown for ${estimate.name}`}
          hideCallouts
          compact
          activeBucketId={activeBucketId}
          onActiveBucketChange={onActiveBucketChange}
          describedById={breakdownId}
          containerClassName="h-[180px] w-[180px]"
        />
      </div>

      <ul id={breakdownId} aria-label={`${estimate.name} cost breakdown by ${groupingMode}`} className="mt-3 space-y-1.5">
        {displayBuckets.length ? (
          displayBuckets.map((bucket) => {
            const dim = Boolean(activeBucketId && activeBucketId !== bucket.id);
            return (
              // react-doctor-disable-next-line react-doctor/no-noninteractive-tabindex -- Focus previews the matching chart bucket for keyboard users; the comparable data table follows this visual list.
              <li
                key={bucket.id}
                tabIndex={0}
                aria-label={`${bucket.label} ${formatChartMoney(bucket.total, currencyCode)} ${formatChartShare(bucket.share)} ${bucket.rowCount.toLocaleString("en-PH")} lines`}
                onMouseEnter={() => onActiveBucketChange(bucket.id)}
                onMouseLeave={() => onActiveBucketChange(null)}
                onFocus={() => onActiveBucketChange(bucket.id)}
                onBlur={() => onActiveBucketChange(null)}
                className={cn(
                  "flex min-h-6 items-center gap-2 rounded-xs px-1 text-[10px] leading-4 transition-opacity motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
                  dim ? "opacity-45" : "opacity-100",
                )}
              >
                <span className="size-2 shrink-0 rounded-xs" aria-hidden="true" style={{ backgroundColor: bucket.color }} />
                <span className="min-w-0 flex-1 truncate text-ink" title={bucket.label}>
                  {bucket.label}
                </span>
                <span className="shrink-0 tabular-nums text-ink">{formatChartMoney(bucket.total, currencyCode)}</span>
                <span className="w-12 shrink-0 text-right tabular-nums text-secondary">{formatChartShare(bucket.share)}</span>
                <span className="w-12 shrink-0 text-right tabular-nums text-secondary">
                  {bucket.rowCount.toLocaleString("en-PH")} lines
                </span>
              </li>
            );
          })
        ) : (
          <li className="rounded-xs border border-dashed border-hairline px-2 py-4 text-center text-[10px] leading-4 text-secondary">
            No cost rows for this sheet.
          </li>
        )}
      </ul>

      {canSwap ? (
        <DropdownSelect
          aria-label={`Change ${estimate.name} sheet`}
          options={swapOptions}
          value=""
          onValueChange={onSwapEstimate}
          placeholder="Change sheet"
          variant="boxed"
          className="mt-auto h-8 w-full min-w-0 text-[10px]"
        />
      ) : null}
    </section>
  );
}
