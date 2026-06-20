"use client";

import { Banner } from "@/components/ui/banner";
import { formatChartMoney } from "@/lib/project-charts/format";
import { colorForBucket } from "@/lib/project-charts/bucket-color";
import { buildInsightSentence } from "@/lib/project-charts/build-insight-sentence";
import { buildProjectChartComparisonView } from "@/lib/project-charts/project-comparison-view";
import type { ProjectChartEstimateOption, ProjectChartGroupingMode } from "@/lib/project-charts/types";
import type {
  ProjectDataEstimateSheet,
  ProjectDataRollup,
  ProjectDataRouteSummary,
} from "@/lib/repositories/project-data-repository";
import { cn } from "@/lib/ui/cn";

type CostAcrossSheetsSectionProps = {
  className?: string;
  summary: ProjectDataRouteSummary;
  groupingMode: ProjectChartGroupingMode;
};

type Segment = {
  id: string;
  label: string;
  total: number;
  color: string;
};

type BarRow = {
  estimate: ProjectDataEstimateSheet;
  total: number;
  segments: Segment[];
};

const TOP_SEGMENT_LIMIT = 4;

export function CostAcrossSheetsSection({ className, summary, groupingMode }: CostAcrossSheetsSectionProps) {
  if (summary.rollup.kind === "mixed") {
    return (
      <section className={cn("flex min-h-0 flex-col overflow-hidden rounded-xs p-3", className)} aria-labelledby="project-data-across-heading">
        <SectionHeading />
        <Banner
          title="Mixed currencies"
          description="Sheets use different currencies, so cross-sheet cost comparison is unavailable."
        />
      </section>
    );
  }

  if (summary.estimateSheets.length < 2) return null;

  const totalsOnly = summary.costAcrossSheetsMode === "totals-only";
  const rows = totalsOnly
    ? buildTotalsOnlyRows(summary.estimateSheets)
    : buildStackedRows(summary, groupingMode);
  const maxTotal = Math.max(...rows.map((row) => row.total), 0);
  const legendSegments = collectLegendSegments(rows);
  const tableId = "project-data-across-sheets-table";
  const variance = totalsOnly ? null : buildVarianceSentence(summary, groupingMode, rows);

  return (
    <section className={cn("flex min-h-0 flex-col overflow-hidden rounded-xs", className)} aria-labelledby="project-data-across-heading">
      <div className="shrink-0 border-b border-hairline p-3">
        <SectionHeading />
        {variance ? (
          <p className="mt-1.5 max-w-[80ch] text-balance text-[12px] font-medium leading-5 text-ink">{variance}</p>
        ) : null}
        {totalsOnly ? (
          <p className="mt-1 text-[10px] leading-4 text-secondary">
            This project has more than 20 estimate sheets, so the page shows totals-only bars.
          </p>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-auto p-3">
        <div
          role="img"
          aria-label="Cost across estimate sheets"
          aria-describedby={tableId}
          className="space-y-2"
        >
          {rows.map((row) => {
            const barWidth = maxTotal > 0 ? Math.max(3, (row.total / maxTotal) * 100) : 0;
            return (
              <div key={row.estimate.id} className="grid grid-cols-[minmax(8rem,12rem)_minmax(0,1fr)_7rem] items-center gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[10px] font-medium leading-4 text-ink">{row.estimate.name}</p>
                  {row.estimate.sheetCode ? <p className="truncate text-[8px] leading-3 text-secondary">{row.estimate.sheetCode}</p> : null}
                </div>
                <div className="h-5 rounded-xs bg-surfaceMuted" aria-hidden>
                  <div className="flex h-full overflow-hidden rounded-xs" style={{ width: `${barWidth}%` }}>
                    {row.segments.map((segment) => (
                      <span
                        key={`${row.estimate.id}-${segment.id}`}
                        className="h-full min-w-[2px]"
                        style={{
                          width: row.total > 0 ? `${Math.max(0, (segment.total / row.total) * 100)}%` : "0%",
                          backgroundColor: segment.color,
                        }}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-right text-[10px] tabular-nums leading-4 text-ink">
                  {formatChartMoney(row.total, row.estimate.currencyCode)}
                </p>
              </div>
            );
          })}
        </div>

        <p className="text-[9px] leading-4 text-secondary">Sheets are ordered by total cost, highest first.</p>

        {legendSegments.length ? (
          <div className="flex flex-wrap gap-x-3 gap-y-1" aria-label="Cost group legend">
            {legendSegments.map((segment) => (
              <span key={segment.id} className="inline-flex items-center gap-1 text-[9px] leading-3 text-secondary">
                <span className="size-2 rounded-xs" aria-hidden style={{ backgroundColor: segment.color }} />
                {segment.label}
              </span>
            ))}
          </div>
        ) : null}

        <div className="rounded-xs border border-hairline">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline px-2 py-1.5">
            <p className="text-[10px] font-medium leading-4 text-ink">Data table</p>
            <p className="text-[9px] leading-3 text-secondary">Zoom-safe values for the bars above</p>
          </div>
          <AcrossSheetsTable id={tableId} rows={rows} legendSegments={legendSegments} rollup={summary.rollup} />
        </div>
      </div>
    </section>
  );
}

function SectionHeading() {
  return (
    <div>
      <h2 id="project-data-across-heading" className="text-[12px] font-medium leading-4 text-ink">
        Cost across sheets
      </h2>
      <p className="mt-0.5 text-[10px] leading-4 text-secondary">
        Compare estimate-sheet totals and cost mix without treating sheets as a timeline.
      </p>
    </div>
  );
}

/**
 * Revive the production variance + insight engine: narrate how the two largest sheets
 * differ. Zero payload change for ≤20-sheet projects, where every sheet's series is
 * already loaded into `seriesByEstimateId`. Returns null when there is no comparand
 * (e.g. equal totals, missing series) so the page silently degrades.
 */
function buildVarianceSentence(
  summary: ProjectDataRouteSummary,
  groupingMode: ProjectChartGroupingMode,
  rows: BarRow[],
): string | null {
  const topTwoIds = rows.slice(0, 2).map((row) => row.estimate.id);
  if (topTwoIds.length < 2) return null;
  if (!topTwoIds.every((id) => summary.seriesByEstimateId[id])) return null;

  const estimates: ProjectChartEstimateOption[] = summary.estimateSheets.map((estimate) => ({
    id: estimate.id,
    name: estimate.name,
    sheetCode: estimate.sheetCode,
    currencyCode: estimate.currencyCode,
    updatedAt: estimate.updatedAt,
    rowCount: estimate.rowCount,
    totalCost: estimate.totalCost,
  }));

  const view = buildProjectChartComparisonView({
    estimates,
    seriesByEstimateId: summary.seriesByEstimateId,
    groupingMode,
    estimateIds: topTwoIds,
  });
  return buildInsightSentence(view.insight)?.sentence ?? null;
}

function buildTotalsOnlyRows(estimateSheets: ProjectDataEstimateSheet[]): BarRow[] {
  return [...estimateSheets]
    .sort((left, right) => right.totalCost - left.totalCost || left.name.localeCompare(right.name))
    .map((estimate) => ({
      estimate,
      total: estimate.totalCost,
      segments: [
        {
          id: "total",
          label: "Total",
          total: estimate.totalCost,
          color: "#5D5D5D",
        },
      ],
    }));
}

function buildStackedRows(summary: ProjectDataRouteSummary, groupingMode: ProjectChartGroupingMode): BarRow[] {
  const topIds = selectTopSegmentIds(summary, groupingMode);
  return summary.estimateSheets
    .map((estimate) => {
      const buckets = summary.seriesByEstimateId[estimate.id]?.[groupingMode]?.allBuckets ?? [];
      const bucketById = new Map(buckets.map((bucket) => [bucket.id, bucket]));
      const knownTotal = topIds.reduce((sum, id) => sum + (bucketById.get(id)?.total ?? 0), 0);
      const otherTotal = Math.max(0, estimate.totalCost - knownTotal);
      const segments: Segment[] = topIds
        .map((id) => {
          const bucket = bucketById.get(id);
          return {
            id,
            label: bucket?.label ?? id,
            total: bucket?.total ?? 0,
            color: colorForBucket(id),
          };
        })
        .filter((segment) => segment.total > 0);
      if (otherTotal > 0) {
        segments.push({ id: "__other__", label: "Other", total: otherTotal, color: colorForBucket("__other__") });
      }
      return { estimate, total: estimate.totalCost, segments };
    })
    .sort((left, right) => right.total - left.total || left.estimate.name.localeCompare(right.estimate.name));
}

function selectTopSegmentIds(summary: ProjectDataRouteSummary, groupingMode: ProjectChartGroupingMode): string[] {
  const totals = new Map<string, { label: string; total: number }>();
  for (const series of Object.values(summary.seriesByEstimateId)) {
    for (const bucket of series[groupingMode]?.allBuckets ?? []) {
      const current = totals.get(bucket.id) ?? { label: bucket.label, total: 0 };
      current.total += bucket.total;
      totals.set(bucket.id, current);
    }
  }
  return [...totals.entries()]
    .sort((left, right) => right[1].total - left[1].total || left[1].label.localeCompare(right[1].label))
    .slice(0, TOP_SEGMENT_LIMIT)
    .map(([id]) => id);
}

function collectLegendSegments(rows: BarRow[]): Segment[] {
  const byId = new Map<string, Segment>();
  for (const row of rows) {
    for (const segment of row.segments) {
      if (!byId.has(segment.id)) byId.set(segment.id, segment);
    }
  }
  return [...byId.values()];
}

function AcrossSheetsTable({
  id,
  rows,
  legendSegments,
  rollup,
}: {
  id: string;
  rows: BarRow[];
  legendSegments: Segment[];
  rollup: Extract<ProjectDataRollup, { kind: "single" }>;
}) {
  return (
    <div className="overflow-x-auto">
      <table id={id} className="min-w-full border-collapse text-left text-[10px] leading-4" aria-label="Cost across sheets data">
        <thead className="border-b border-hairline bg-surfaceMuted/60 text-[9px] font-medium uppercase text-secondary">
          <tr>
            <th className="px-2 py-1.5 font-medium">Sheet</th>
            <th className="px-2 py-1.5 text-right font-medium">Total</th>
            {legendSegments.map((segment) => (
              <th key={segment.id} className="px-2 py-1.5 text-right font-medium">{segment.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const byId = new Map(row.segments.map((segment) => [segment.id, segment.total]));
            return (
              <tr key={row.estimate.id} className="border-b border-hairline last:border-b-0">
                <td className="px-2 py-1.5 text-ink">{row.estimate.name}</td>
                <td className="px-2 py-1.5 text-right tabular-nums text-secondary">{formatChartMoney(row.total, row.estimate.currencyCode)}</td>
                {legendSegments.map((segment) => (
                  <td key={segment.id} className="px-2 py-1.5 text-right tabular-nums text-secondary">
                    {formatChartMoney(byId.get(segment.id) ?? 0, rollup.currencyCode)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
