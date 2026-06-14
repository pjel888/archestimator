import { formatChartMoney, formatChartShare } from "@/lib/project-charts/format";
import type { ProjectChartBucket } from "@/lib/project-charts/types";

/**
 * The donut's accessible twin (R6): a swatch, label, amount, and share table that
 * is ALWAYS rendered alongside the chart and referenced by it via
 * `aria-describedby`. This is the surface screen-reader and zoom users read, so
 * the donut never carries information the table doesn't (DESIGN.md data-viz rule;
 * WCAG 1.1.1 / 1.4.4 / 1.4.10).
 */
type DashboardBreakdownTableProps = {
  /** Stable id the paired donut points to via `aria-describedby`. */
  id: string;
  buckets: ProjectChartBucket[];
  total: number;
  currencyCode: string;
  selectedBucketId?: string | null;
  onBucketSelect?: (bucket: ProjectChartBucket) => void;
};

export function DashboardBreakdownTable({
  id,
  buckets,
  total,
  currencyCode,
  selectedBucketId,
  onBucketSelect,
}: DashboardBreakdownTableProps) {
  const hasData = total > 0 && buckets.length > 0;

  return (
    <table id={id} className="w-full border-collapse text-[10px] tabular-nums">
      <caption className="sr-only">Cost breakdown by segment</caption>
      <thead>
        <tr className="text-[8px] font-medium uppercase tracking-normal text-secondary">
          <th scope="col" className="py-1 pr-2 text-left font-medium">Segment</th>
          <th scope="col" className="w-24 py-1 pl-2 text-right font-medium">Amount</th>
          <th scope="col" className="w-16 py-1 pl-2 text-right font-medium">Share</th>
        </tr>
      </thead>
      <tbody>
        {hasData ? (
          buckets.map((bucket) => (
            <tr
              key={bucket.id}
              className={[
                "border-t border-hairline transition-colors hover:bg-surfaceMuted",
                selectedBucketId === bucket.id ? "bg-accentSoft" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <th scope="row" className="py-1 pr-2 text-left font-normal text-ink">
                <button
                  type="button"
                  aria-pressed={selectedBucketId === bucket.id}
                  className="flex max-w-full items-center gap-1.5 rounded-xs text-left transition hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                  onClick={() => onBucketSelect?.(bucket)}
                >
                  <span
                    aria-hidden="true"
                    className="size-2 shrink-0 rounded-xs"
                    style={{ backgroundColor: bucket.color }}
                  />
                  <span className="truncate">{bucket.label}</span>
                </button>
              </th>
              <td className="py-1 pl-2 text-right text-ink">{formatChartMoney(bucket.total, currencyCode)}</td>
              <td className="py-1 pl-2 text-right text-secondary">{formatChartShare(bucket.share)}</td>
            </tr>
          ))
        ) : (
          <tr className="border-t border-hairline">
            <td colSpan={3} className="py-1 text-left text-tertiary">
              -
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
