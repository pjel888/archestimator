"use client";

import { ArrowDown, ArrowUp, Minus } from "@phosphor-icons/react/dist/ssr";

import type { ProjectChartComparisonView } from "@/lib/project-charts/project-comparison-view";
import { bucketCueToken, formatChartMoney, formatSignedChartMoney } from "@/lib/project-charts/format";
import { formatDeltaPercent } from "@/lib/project-charts/build-insight-sentence";
import { cn } from "@/lib/ui/cn";

type ProjectVarianceSpineProps = {
  view: ProjectChartComparisonView;
  /** id used by the chart's `aria-describedby` → the detail table. */
  tableId: string;
  activeBucketId: string | null;
  onActiveBucketChange: (bucketId: string | null) => void;
  onTogglePin: (bucketId: string) => void;
};

/**
 * Variance spine — the headline view (`08` band 3). One row per bucket, sorted by
 * |Δ| (the engine's contract). Each estimate's value is a marker on a SHARED
 * horizontal scale (position on a common scale = Cleveland rank #1); the gap is
 * the variance. Direction is reinforced three ways so it never relies on color
 * alone (WCAG 1.4.1): success/danger hue + an up/down arrow + the signed Δ label.
 *
 * The SVG/marks are decorative (`role="img"`); the detail table this points at via
 * `aria-describedby` is the keyboard/screen-reader surface (`06` A11Y-8/11).
 */
export function ProjectVarianceSpine({
  view,
  tableId,
  activeBucketId,
  onActiveBucketChange,
  onTogglePin,
}: ProjectVarianceSpineProps) {
  const baselineId = view.baselineEstimateId;
  const baselineName = view.estimates.find((estimate) => estimate.isBaseline)?.name ?? "Baseline";
  const comparandName = view.estimates.find((estimate) => estimate.id === view.comparandEstimateId)?.name ?? "Comparand";

  const domainMax = view.buckets.reduce((max, bucket) => {
    const bucketMax = Math.max(0, ...Object.values(bucket.perEstimateTotals));
    return Math.max(max, bucketMax);
  }, 0);
  const toPercent = (value: number) => (domainMax > 0 ? Math.min(100, Math.max(0, (value / domainMax) * 100)) : 0);

  if (view.buckets.length === 0) {
    return null;
  }

  return (
    <section
      aria-label={`Cost variance by ${view.groupingMode}. A data table with the same figures follows.`}
      aria-describedby={tableId}
      className="rounded-xs border border-hairline bg-white"
      data-testid="project-variance-spine"
    >
      <div className="flex items-center justify-between gap-2 border-b border-hairline px-3 py-2">
        <p className="text-[9px] font-medium uppercase tracking-normal text-tertiary">Cost variance by {view.groupingMode}</p>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <span className="inline-block size-2 rounded-xs border border-tertiary bg-white" aria-hidden="true" />
            {baselineName}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block size-2 rounded-xs bg-tertiary" aria-hidden="true" />
            {comparandName}
          </span>
        </div>
      </div>

      <ul className="divide-y divide-hairline" role="presentation">
        {view.buckets.map((bucket, index) => {
          const isActive = bucket.id === activeBucketId;
          const lower = bucket.delta < 0;
          const higher = bucket.delta > 0;
          const directionTextClass = lower ? "text-success" : higher ? "text-danger" : "text-tertiary";
          const connectorClass = lower ? "bg-success" : higher ? "bg-danger" : "bg-tertiary";
          const DirectionIcon = lower ? ArrowDown : higher ? ArrowUp : Minus;

          // Marker x positions across the shared domain.
          const markers = view.estimates.map((estimate) => ({
            estimateId: estimate.id,
            isBaseline: estimate.isBaseline,
            name: estimate.name,
            value: bucket.perEstimateTotals[estimate.id] ?? 0,
            xPercent: toPercent(bucket.perEstimateTotals[estimate.id] ?? 0),
          }));
          const xs = markers.map((marker) => marker.xPercent);
          const minX = Math.min(...xs);
          const maxX = Math.max(...xs);

          return (
            <li key={bucket.id} data-bucket-id={bucket.id} data-testid="variance-row">
              <button
                type="button"
                aria-pressed={isActive}
                onMouseEnter={() => onActiveBucketChange(bucket.id)}
                onMouseLeave={() => onActiveBucketChange(null)}
                onFocus={() => onActiveBucketChange(bucket.id)}
                onBlur={() => onActiveBucketChange(null)}
                onClick={() => onTogglePin(bucket.id)}
                className={cn(
                  "grid w-full cursor-pointer grid-cols-1 gap-x-3 gap-y-1 px-3 py-2 text-left transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus sm:grid-cols-[minmax(7rem,10rem)_minmax(0,1fr)_minmax(5.5rem,auto)] sm:items-center",
                  isActive ? "bg-surfaceMuted" : "hover:bg-surfaceMuted/60",
                )}
              >
                <span className="flex min-w-0 items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="grid size-3.5 shrink-0 place-items-center rounded-xs text-[8px] font-medium text-white"
                  style={{ backgroundColor: bucket.color }}
                >
                  {bucketCueToken(index)}
                </span>
                <span className="truncate text-[10px] font-medium text-foreground" title={bucket.label}>
                  {bucket.label}
                </span>
                </span>

                <span className="relative h-5" aria-hidden="true">
                {/* baseline gridline */}
                <span className="absolute inset-x-1 top-1/2 h-px -translate-y-1/2 bg-hairline" />
                {/* variance connector between min and max marker */}
                <span
                  className={cn("absolute top-1/2 h-0.5 -translate-y-1/2 rounded-xs transition-all motion-reduce:transition-none", connectorClass)}
                  style={{ left: `calc(${minX}% )`, width: `${Math.max(0, maxX - minX)}%` }}
                />
                {markers.map((marker) => (
                  <span
                    key={marker.estimateId}
                    title={`${marker.name}: ${formatChartMoney(marker.value, view.currencyCode)}`}
                    className={cn(
                      "absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-xs transition-all motion-reduce:transition-none",
                      marker.isBaseline ? "border border-current bg-white" : "",
                    )}
                    style={{
                      left: `${marker.xPercent}%`,
                      backgroundColor: marker.isBaseline ? "#ffffff" : bucket.color,
                      borderColor: marker.isBaseline ? bucket.color : undefined,
                    }}
                  />
                ))}
                </span>

                <span className={cn("flex items-center justify-start gap-1 text-[10px] font-medium tabular-nums sm:justify-end", directionTextClass)}>
                  <DirectionIcon size={10} weight="regular" aria-hidden="true" />
                  <span>{formatSignedChartMoney(bucket.delta, view.currencyCode)}</span>
                  <span className="text-tertiary">{formatDeltaPercent(bucket.deltaPercent)}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
