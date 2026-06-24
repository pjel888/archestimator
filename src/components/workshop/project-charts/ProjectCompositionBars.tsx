"use client";

import type { ProjectChartComparisonView } from "@/lib/project-charts/project-comparison-view";
import { bucketCueToken, formatChartMoney, formatChartShare } from "@/lib/project-charts/format";
import { cn } from "@/lib/ui/cn";

type ProjectCompositionBarsProps = {
  view: ProjectChartComparisonView;
  activeBucketId: string | null;
  onActiveBucketChange: (bucketId: string | null) => void;
  onTogglePin: (bucketId: string) => void;
};

/**
 * Composition view (`08` band 4): a 100%-stacked horizontal bar per estimate with
 * a single SHARED, stable color legend — one color per category across every
 * estimate (the fix for `03` UX-7 / `06` A11Y-5). Segments are drawn in a fixed
 * bucket order so the same category sits in a comparable slot across estimates.
 * Decorative marks (`role="img"`); the detail table is the data alternative.
 */
export function ProjectCompositionBars({
  view,
  activeBucketId,
  onActiveBucketChange,
  onTogglePin,
}: ProjectCompositionBarsProps) {
  if (view.buckets.length === 0 || view.estimates.length === 0) {
    return null;
  }

  // Stable segment order: largest baseline share first, then label.
  const orderedBuckets = view.buckets.toSorted(
    (left, right) => right.baselineTotal - left.baselineTotal || left.label.localeCompare(right.label),
  );
  const cueByBucketId = new Map(view.buckets.map((bucket, index) => [bucket.id, bucketCueToken(index)]));

  return (
    <section
      aria-label="Cost composition by estimate"
      className="rounded-xs border border-hairline bg-white"
      data-testid="project-composition-bars"
    >
      <div className="border-b border-hairline px-3 py-2">
        <p className="text-[9px] font-medium uppercase tracking-normal text-tertiary">Composition (share of estimate)</p>
      </div>

      <div className="flex flex-col gap-3 p-3">
        {view.estimates.map((estimate) => (
          <div key={estimate.id} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-[10px] font-medium text-foreground">{estimate.name}</span>
              <span className="shrink-0 text-[10px] font-medium tabular-nums text-foreground">
                {formatChartMoney(estimate.total, view.currencyCode)}
              </span>
            </div>
            <div className="flex h-3 w-full overflow-hidden rounded-xs bg-surfaceMuted">
              {orderedBuckets.map((bucket) => {
                const share = bucket.perEstimateShares[estimate.id] ?? 0;
                if (share <= 0) return null;
                const isActive = bucket.id === activeBucketId;
                return (
                  <button
                    key={bucket.id}
                    type="button"
                    data-bucket-id={bucket.id}
                    aria-label={`Toggle ${bucket.label} pin`}
                    title={`${bucket.label}: ${formatChartShare(share)} · ${formatChartMoney(bucket.perEstimateTotals[estimate.id] ?? 0, view.currencyCode)}`}
                    onMouseEnter={() => onActiveBucketChange(bucket.id)}
                    onMouseLeave={() => onActiveBucketChange(null)}
                    onFocus={() => onActiveBucketChange(bucket.id)}
                    onBlur={() => onActiveBucketChange(null)}
                    onClick={() => onTogglePin(bucket.id)}
                    className={cn(
                      "h-full shrink-0 cursor-pointer appearance-none border-0 p-0 transition-opacity motion-reduce:transition-none",
                      activeBucketId && !isActive ? "opacity-45" : "opacity-100",
                    )}
                    style={{ width: `${share * 100}%`, backgroundColor: bucket.color }}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1 border-t border-hairline px-3 py-2" aria-hidden="true">
        {orderedBuckets.map((bucket) => (
          <span key={bucket.id} className="inline-flex items-center gap-1 text-[10px] text-tertiary">
            <span
              className="grid size-3 place-items-center rounded-xs text-[8px] font-medium text-white"
              style={{ backgroundColor: bucket.color }}
            >
              {cueByBucketId.get(bucket.id)}
            </span>
            <span className="truncate">{bucket.label}</span>
          </span>
        ))}
      </div>
    </section>
  );
}
