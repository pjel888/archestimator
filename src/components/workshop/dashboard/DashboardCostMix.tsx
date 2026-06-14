"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useId, useMemo, useState } from "react";

import { CostDonutChart } from "@/components/charts/CostDonutChart";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { SectionHeading } from "@/components/ui/section-heading";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { collapseProjectChartBuckets } from "@/lib/project-charts/aggregate-project-charts";
import { formatChartMoney, formatChartShare } from "@/lib/project-charts/format";
import type { ProjectChartEstimateSeries, ProjectChartGroupingMode } from "@/lib/project-charts/types";
import { buildCompareHref, buildEstimateSheetHref } from "@/lib/workshop/compare-href";
import type { DashboardEstimateSheet } from "@/lib/workshop/dashboard-types";

import { DashboardBreakdownTable } from "./DashboardBreakdownTable";

/**
 * Zone B: the selected estimate's cost composition. A donut (up to 5 named segments plus
 * a neutral "Other", centre total) always paired with the accessible breakdown
 * table (R5/R6), driven by the shared `SegmentedControl` (default Category, the
 * cheapest read, R7). The donut, palette, and formatters are the exact ones the
 * Compare tab uses, so colors and figures cannot diverge across surfaces (R14).
 *
 * The donut is imported statically (not lazily like the demoted Compare donut):
 * on the project entry route the cost mix is primary, above-the-fold content, so
 * deferring it would only delay the page's reason for existing.
 */
const TOP_SEGMENT_LIMIT = 5;

const GROUPING_OPTIONS = [
  { value: "space", label: "Space" },
  { value: "category", label: "Category" },
  { value: "supplier", label: "Supplier" },
] as const satisfies ReadonlyArray<{ value: ProjectChartGroupingMode; label: string }>;

type DashboardCostMixProps = {
  projectId: string;
  selectedEstimate: DashboardEstimateSheet;
  estimateSheets: DashboardEstimateSheet[];
  selectedGroupingMode: ProjectChartGroupingMode;
  series: ProjectChartEstimateSeries;
  currencyCode: string;
  /** True when the selected estimate's facts were capped; figures may be partial. */
  truncated?: boolean;
};

export function DashboardCostMix({
  projectId,
  selectedEstimate,
  estimateSheets,
  selectedGroupingMode,
  series,
  currencyCode,
  truncated = false,
}: DashboardCostMixProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [groupingMode, setGroupingMode] = useState<ProjectChartGroupingMode>(selectedGroupingMode);
  const [lastServerGroupingMode, setLastServerGroupingMode] = useState<ProjectChartGroupingMode>(selectedGroupingMode);
  const [selectedBucketId, setSelectedBucketId] = useState<string | null>(null);
  const tableId = useId();

  if (lastServerGroupingMode !== selectedGroupingMode) {
    setLastServerGroupingMode(selectedGroupingMode);
    setGroupingMode(selectedGroupingMode);
    setSelectedBucketId(null);
  }

  const estimateOptions = useMemo(
    () =>
      estimateSheets.map((estimate) => ({
        value: estimate.id,
        label: estimate.sheetCode ? `${estimate.sheetCode} - ${estimate.name}` : estimate.name,
      })),
    [estimateSheets],
  );
  const modeSeries = series[groupingMode];
  const buckets = collapseProjectChartBuckets(modeSeries.allBuckets, TOP_SEGMENT_LIMIT);
  const total = modeSeries.total;
  const selectedBucket = buckets.find((bucket) => bucket.id === selectedBucketId) ?? buckets[0] ?? null;
  const selectedBucketModeLabel = GROUPING_OPTIONS.find((option) => option.value === groupingMode)?.label ?? "Category";

  const replaceDashboardParams = (updates: Partial<Record<"estimate" | "mode", string>>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value);
    }
    const query = params.toString();
    router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
  };

  const handleEstimateChange = (nextEstimateId: string) => {
    setSelectedBucketId(null);
    replaceDashboardParams({ estimate: nextEstimateId, mode: groupingMode });
  };

  const handleGroupingChange = (nextMode: ProjectChartGroupingMode) => {
    setGroupingMode(nextMode);
    setSelectedBucketId(null);
    replaceDashboardParams({ mode: nextMode });
  };

  const selectedBucketHref =
    selectedBucket && groupingMode === "space" && selectedBucket.sourceNodeId
      ? buildEstimateSheetHref(projectId, selectedEstimate.id, selectedBucket.sourceNodeId)
      : buildEstimateSheetHref(projectId, selectedEstimate.id, selectedEstimate.firstNodeId);

  return (
    <section aria-label="Cost composition" className="flex flex-col gap-2 rounded-xs border border-hairline bg-white p-3">
      <SectionHeading
        aside={
          <SegmentedControl
            ariaLabel="Break down by"
            options={GROUPING_OPTIONS}
            value={groupingMode}
            onValueChange={handleGroupingChange}
          />
        }
      >
        Cost composition
      </SectionHeading>

      <DropdownSelect
        aria-label="Selected estimate sheet"
        options={estimateOptions}
        value={selectedEstimate.id}
        onValueChange={handleEstimateChange}
        variant="boxed"
        className="h-8 w-full text-[10px]"
        panelClassName="text-[10px]"
      />

      <div className="grid grid-cols-1 items-center gap-3 md:grid-cols-[220px_minmax(0,1fr)]">
        <div className="min-w-0">
          <CostDonutChart
            buckets={buckets}
            total={total}
            currencyCode={currencyCode}
            label={`Cost by ${groupingMode}`}
            compact
            hideCallouts
            describedById={tableId}
            containerClassName="h-[220px] w-[220px]"
          />
        </div>
        <div className="min-w-0">
          <DashboardBreakdownTable
            id={tableId}
            buckets={buckets}
            total={total}
            currencyCode={currencyCode}
            selectedBucketId={selectedBucket?.id ?? null}
            onBucketSelect={(bucket) => setSelectedBucketId(bucket.id)}
          />
          {truncated ? (
            <p className="mt-1 text-[8px] leading-3 text-tertiary">
              Showing a partial breakdown because this estimate is large.
            </p>
          ) : null}
        </div>
      </div>

      {selectedBucket ? (
        <div className="border-t border-hairline pt-2 text-[10px] leading-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[8px] font-medium uppercase tracking-normal text-tertiary">
                Selected {selectedBucketModeLabel.toLowerCase()}
              </p>
              <p className="truncate font-medium text-ink">{selectedBucket.label}</p>
            </div>
            <p className="shrink-0 text-right font-medium tabular-nums text-ink">
              {formatChartMoney(selectedBucket.total, currencyCode)}
            </p>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px] text-secondary">
            <span>{formatChartShare(selectedBucket.share)} of selected estimate</span>
            <span>{selectedBucket.rowCount} {selectedBucket.rowCount === 1 ? "row" : "rows"}</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Link
              href={selectedBucketHref}
              className="rounded-xs text-[9px] font-medium text-secondary transition hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              {groupingMode === "space" && selectedBucket.sourceNodeId ? "Open space" : "Open estimate"}
            </Link>
            <Link
              href={buildCompareHref(projectId, [selectedEstimate.id], groupingMode)}
              className="rounded-xs text-[9px] font-medium text-secondary transition hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              Compare breakdown
            </Link>
          </div>
        </div>
      ) : null}
    </section>
  );
}
