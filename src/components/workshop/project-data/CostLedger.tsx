"use client";

import { Fragment } from "react";

import { formatChartMoney, formatChartShare } from "@/lib/project-charts/format";
import type { ProjectChartBucket, ProjectChartGroupingMode } from "@/lib/project-charts/types";
import { cn } from "@/lib/ui/cn";

/**
 * The primary cost breakdown: a ranked horizontal-bar "ledger" that IS the data table.
 *
 * Replaces the old donut + separate breakdown table 2-column grid. Sorted-descending,
 * one dense row per group: color swatch · label · proportional inline bar · amount ·
 * share · line count. The proportional bar is positional encoding (Cleveland–McGill
 * rank-1), readable at any column width — unlike the donut's edge callouts, which became
 * illegible when the 720×560 SVG was scaled into a ~380px column. Labels live inline, so
 * there is no legend lookup and no color-only information (WCAG 1.4.1). A subtle rule
 * marks where cumulative cost crosses 80%; a Total footer closes the statement.
 *
 * Bar/​swatch fills are dynamic CVD-safe (Okabe–Ito) hues applied via inline `style` —
 * never Tailwind arbitrary `bg-[var(--x)]`, which emits no color in this TW v4 setup.
 */
type CostLedgerProps = {
  id: string;
  sheetName: string;
  groupingMode: ProjectChartGroupingMode;
  buckets: ProjectChartBucket[];
  total: number;
  currencyCode: string;
  activeBucketId: string | null;
  onActiveBucketChange: (bucketId: string | null) => void;
  /** Number of real groups folded into the "Other" row, for an "n groups" note. */
  otherGroupCount?: number;
  empty: boolean;
};

const NOUN_PLURAL: Record<ProjectChartGroupingMode, string> = {
  category: "categories",
  supplier: "suppliers",
  space: "areas",
};

export function CostLedger({
  id,
  sheetName,
  groupingMode,
  buckets,
  total,
  currencyCode,
  activeBucketId,
  onActiveBucketChange,
  otherGroupCount = 0,
  empty,
}: CostLedgerProps) {
  const maxTotal = buckets.reduce((max, bucket) => Math.max(max, bucket.total), 0);
  const totalLines = buckets.reduce((sum, bucket) => sum + (Number.isFinite(bucket.rowCount) ? bucket.rowCount : 0), 0);

  // Index of the row at which cumulative cost first reaches 80% of the total — the
  // Pareto line. Computed over the displayed (already-sorted) buckets.
  let eightyIndex = -1;
  if (total > 0) {
    let cumulative = 0;
    for (let index = 0; index < buckets.length; index += 1) {
      cumulative += buckets[index]!.total;
      if (cumulative >= total * 0.8) {
        eightyIndex = index;
        break;
      }
    }
  }

  return (
    <div className="min-w-0 overflow-hidden rounded-xs border border-hairline">
      <table
        id={id}
        className="w-full table-auto border-collapse text-left text-[10px] leading-4"
        aria-label={`${sheetName} cost groups by ${groupingMode}`}
      >
        <caption className="sr-only">
          {sheetName} cost groups by {groupingMode}, largest first, with proportional bars.
        </caption>
        <thead className="border-b border-hairline bg-surfaceMuted/60 text-[9px] font-medium uppercase tracking-normal text-secondary">
          <tr>
            <th scope="col" className="px-2 py-1.5 font-medium">Label</th>
            <th scope="col" className="hidden w-full px-2 py-1.5 font-medium sm:table-cell">
              <span className="sr-only">Share of total</span>
            </th>
            <th scope="col" className="px-2 py-1.5 text-right font-medium">Amount</th>
            <th scope="col" className="px-2 py-1.5 text-right font-medium">Share</th>
            <th scope="col" className="px-2 py-1.5 text-right font-medium">Lines</th>
          </tr>
        </thead>
        <tbody>
          {empty ? (
            <tr>
              <td colSpan={5} className="px-2 py-6 text-center text-secondary">No cost rows</td>
            </tr>
          ) : (
            buckets.map((bucket, index) => {
              const isActive = activeBucketId === bucket.id;
              const barWidth = maxTotal > 0 ? Math.max(2, (bucket.total / maxTotal) * 100) : 0;
              const showEightyRule = index === eightyIndex && index < buckets.length - 1;
              return (
                <Fragment key={bucket.id}>
                  <tr
                    tabIndex={0}
                    onMouseEnter={() => onActiveBucketChange(bucket.id)}
                    onMouseLeave={() => onActiveBucketChange(null)}
                    onFocus={() => onActiveBucketChange(bucket.id)}
                    onBlur={() => onActiveBucketChange(null)}
                    className={cn(
                      "border-b border-hairline last:border-b-0 transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus",
                      showEightyRule && "border-b-dividerSibling",
                      isActive ? "bg-surfaceMuted" : "bg-white",
                    )}
                  >
                    <td className="max-w-[12rem] px-2 py-1.5 align-middle">
                      <span className="inline-flex min-w-0 items-center gap-2">
                        <span
                          className="size-2 shrink-0 rounded-xs"
                          aria-hidden
                          style={{ backgroundColor: bucket.color }}
                        />
                        <span className="truncate text-ink" title={bucket.label}>{bucket.label}</span>
                        {bucket.isOther && otherGroupCount > 0 ? (
                          <span className="shrink-0 text-[9px] text-secondary">· {otherGroupCount} {NOUN_PLURAL[groupingMode]}</span>
                        ) : null}
                      </span>
                    </td>
                    <td className="hidden w-full px-2 py-1.5 align-middle sm:table-cell">
                      <span className="relative block h-2 w-full overflow-hidden rounded-xs bg-surfaceMuted" aria-hidden>
                        <span
                          className="absolute inset-y-0 left-0 rounded-xs transition-[width] duration-300 motion-reduce:transition-none"
                          style={{ width: `${barWidth}%`, backgroundColor: bucket.color, opacity: activeBucketId && !isActive ? 0.5 : 1 }}
                        />
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums text-ink">{formatChartMoney(bucket.total, currencyCode)}</td>
                    <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums text-secondary">{formatChartShare(bucket.share)}</td>
                    <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums text-secondary">{bucket.rowCount}</td>
                  </tr>
                  {showEightyRule ? (
                    <tr aria-label="80 percent threshold" className="border-b border-dividerSibling bg-surfaceMuted/35">
                      <td colSpan={5} className="px-2 py-1 text-[9px] font-medium leading-3 text-secondary">
                        80% of cost reached here
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })
          )}
        </tbody>
        {!empty ? (
          <tfoot>
            <tr className="border-t border-dividerSibling bg-surfaceMuted/40 font-medium">
              <td className="px-2 py-1.5 text-ink">Total</td>
              <td aria-hidden className="hidden sm:table-cell" />
              <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums text-ink">{formatChartMoney(total, currencyCode)}</td>
              <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums text-secondary">{formatChartShare(1)}</td>
              <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums text-secondary">{totalLines}</td>
            </tr>
          </tfoot>
        ) : null}
      </table>
    </div>
  );
}
