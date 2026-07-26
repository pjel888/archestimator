"use client";

import type { ProjectChartComparisonView } from "@/lib/project-charts/project-comparison-view";
import { Button } from "@/components/ui/button";
import { bucketCueToken, formatChartMoney, formatChartShare, formatSignedChartMoney } from "@/lib/project-charts/format";
import { formatDeltaPercent } from "@/lib/project-charts/build-insight-sentence";
import { cn } from "@/lib/ui/cn";

type ProjectComparisonTableProps = {
  view: ProjectChartComparisonView;
  /** Stable id so each chart can point at this table via aria-describedby. */
  id: string;
  activeBucketId: string | null;
  pinnedBucketId: string | null;
  onActiveBucketChange: (bucketId: string | null) => void;
  onTogglePin: (bucketId: string) => void;
};

/**
 * Comparison detail table (`08` band 4 / `09` P1.2). Columns: Bucket ·
 * per-estimate Cost + Share · Δ · Δ%. This is BOTH the precise read-off and the
 * accessible text alternative for the charts (`06` A11Y-11): each chart points
 * here via `aria-describedby={id}`. Rows are the keyboard/screen-reader operable
 * surface — focusing or activating a row drives the shared cross-highlight and
 * pin, so screen-reader and keyboard users get the same connective interaction
 * mouse users get (`03` UX-8). A non-color cue (letter token) plus the label make
 * the chart↔table mapping survive grayscale (WCAG 1.4.1).
 */
export function ProjectComparisonTable({
  view,
  id,
  activeBucketId,
  pinnedBucketId,
  onActiveBucketChange,
  onTogglePin,
}: ProjectComparisonTableProps) {
  const showDelta = Boolean(view.comparandEstimateId);

  return (
    <div className="overflow-x-auto rounded-xs border border-hairline bg-white">
      <table id={id} aria-label="Cost comparison detail" className="w-full border-collapse text-[10px]">
        <thead className="bg-surfaceMuted text-[9px] uppercase tracking-normal text-secondary">
          <tr>
            <th scope="col" className="px-2 py-2 text-left font-medium">Bucket</th>
            {view.estimates.map((estimate) => (
              <th key={estimate.id} scope="col" className="px-2 py-2 text-right font-medium" colSpan={2}>
                {estimate.name}
              </th>
            ))}
            {showDelta ? (
              <>
                <th scope="col" className="px-2 py-2 text-right font-medium">Δ</th>
                <th scope="col" className="px-2 py-2 text-right font-medium">Δ%</th>
              </>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {view.buckets.map((bucket, index) => {
            const isActive = bucket.id === activeBucketId;
            const lower = bucket.delta < 0;
            const higher = bucket.delta > 0;
            return (
              <tr
                key={bucket.id}
                data-bucket-id={bucket.id}
                data-testid="comparison-table-row"
                className={cn("border-t border-hairline", isActive ? "bg-surfaceMuted" : null)}
                onMouseEnter={() => onActiveBucketChange(bucket.id)}
                onMouseLeave={() => onActiveBucketChange(null)}
              >
                <th scope="row" className="max-w-40 truncate py-1 pl-2 pr-2 text-left font-medium text-foreground">
                  <Button
                    type="button"
                    variant="plain"
                    size="xs"
                    aria-pressed={bucket.id === pinnedBucketId}
                    onClick={() => onTogglePin(bucket.id)}
                    onFocus={() => onActiveBucketChange(bucket.id)}
                    onBlur={() => onActiveBucketChange(null)}
                    className="min-h-7 min-w-0 max-w-full justify-start gap-1.5 px-0 text-left"
                  >
                    <span
                      aria-hidden="true"
                      className="grid size-3.5 shrink-0 place-items-center rounded-xs text-[8px] font-medium text-white"
                      style={{ backgroundColor: bucket.color }}
                    >
                      {bucketCueToken(index)}
                    </span>
                    <span className="truncate">{bucket.label}</span>
                  </Button>
                </th>
                {view.estimates.map((estimate) => (
                  <td key={estimate.id} className="whitespace-nowrap px-2 py-1 text-right tabular-nums">
                    <span className="text-foreground">{formatChartMoney(bucket.perEstimateTotals[estimate.id] ?? 0, view.currencyCode)}</span>
                    <span className="ml-1 text-muted-foreground">{formatChartShare(bucket.perEstimateShares[estimate.id] ?? 0)}</span>
                  </td>
                ))}
                {showDelta ? (
                  <>
                    <td className={cn("whitespace-nowrap px-2 py-1 text-right font-medium tabular-nums", lower ? "text-success" : higher ? "text-danger" : "text-tertiary")}>
                      {formatSignedChartMoney(bucket.delta, view.currencyCode)}
                    </td>
                    <td className={cn("whitespace-nowrap px-2 py-1 text-right tabular-nums", lower ? "text-success" : higher ? "text-danger" : "text-tertiary")}>
                      {formatDeltaPercent(bucket.deltaPercent)}
                    </td>
                  </>
                ) : null}
              </tr>
            );
          })}
          {view.buckets.length === 0 ? (
            <tr>
              <td className="px-2 py-5 text-center text-[10px] text-muted-foreground" colSpan={2 + view.estimates.length * 2}>
                No cost rows yet.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
