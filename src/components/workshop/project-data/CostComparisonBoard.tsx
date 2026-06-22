"use client";

import { Plus } from "@phosphor-icons/react/dist/ssr";

import { Banner } from "@/components/ui/banner";
import type { DropdownSelectOption } from "@/components/ui/dropdown-select";
import { EmptyState } from "@/components/ui/empty-state";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { AddEstimateColumn } from "@/components/workshop/project-data/AddEstimateColumn";
import { EstimateColumn } from "@/components/workshop/project-data/EstimateColumn";
import { collapseProjectChartBuckets } from "@/lib/project-charts/aggregate-project-charts";
import { buildInsightSentence } from "@/lib/project-charts/build-insight-sentence";
import {
  buildProjectChartComparisonView,
  type ProjectChartComparisonViewBucket,
} from "@/lib/project-charts/project-comparison-view";
import type { ProjectChartBucket, ProjectChartGroupingMode } from "@/lib/project-charts/types";
import type { ProjectDataEstimateSheet, ProjectDataRouteSummary } from "@/lib/repositories/project-data-repository";
import { cn } from "@/lib/ui/cn";

const GROUPING_OPTIONS: Array<{ value: ProjectChartGroupingMode; label: string }> = [
  { value: "category", label: "Category" },
  { value: "supplier", label: "Supplier" },
  { value: "space", label: "Space" },
];

const MAX_COMPARE_COLUMNS = 3;
const VISIBLE_BUCKET_LIMIT = 8;

// Donut-first composition contract: the board owns CostDonutChart data derivation
// and EstimateColumn renders the chart/list pair for each selected estimate.
type CostComparisonBoardProps = {
  className?: string;
  summary: ProjectDataRouteSummary;
  baselineEstimateId: string | null;
  compareEstimateIds: string[];
  groupingMode: ProjectChartGroupingMode;
  activeBucketId: string | null;
  onBaselineChange: (estimateId: string) => void;
  onCompareEstimateIdsChange: (estimateIds: string[]) => void;
  onGroupingModeChange: (mode: ProjectChartGroupingMode) => void;
  onActiveBucketChange: (bucketId: string | null) => void;
};

export function CostComparisonBoard({
  className,
  summary,
  baselineEstimateId,
  compareEstimateIds,
  groupingMode,
  activeBucketId,
  onBaselineChange,
  onCompareEstimateIdsChange,
  onGroupingModeChange,
  onActiveBucketChange,
}: CostComparisonBoardProps) {
  const displayEstimateIds = normalizeDisplayEstimateIds(baselineEstimateId, compareEstimateIds, summary);
  const displayEstimates = displayEstimateIds
    .map((id) => summary.estimateSheets.find((estimate) => estimate.id === id))
    .filter((estimate): estimate is ProjectDataEstimateSheet => Boolean(estimate));
  const baselineEstimate = displayEstimates[0] ?? null;
  const estimateOptions: DropdownSelectOption[] = summary.estimateSheets.map((estimate) => ({
    value: estimate.id,
    label: estimateLabel(estimate),
  }));
  const remainingOptions = estimateOptions.filter((option) => !displayEstimateIds.includes(option.value));
  const canAddSheet = displayEstimateIds.length < MAX_COMPARE_COLUMNS && remainingOptions.length > 0;
  const selectedCurrencyCodes = [...new Set(displayEstimates.map((estimate) => estimate.currencyCode || "PHP"))];
  const isMixedCurrency = selectedCurrencyCodes.length > 1;
  const comparisonView = displayEstimateIds.length
    ? buildProjectChartComparisonView({
        estimates: summary.estimateSheets,
        seriesByEstimateId: summary.seriesByEstimateId,
        groupingMode,
        estimateIds: displayEstimateIds,
        baselineEstimateId,
      })
    : null;
  const insight = !isMixedCurrency && comparisonView?.insight ? buildInsightSentence(comparisonView.insight)?.sentence ?? null : null;
  const comparisonBucketOrder = comparisonView
    ? sortComparisonBucketIds(comparisonView.buckets, comparisonView.baselineEstimateId, displayEstimateIds.filter((id) => id !== comparisonView.baselineEstimateId))
    : null;
  const rollupLabel =
    summary.rollup.kind === "single"
      ? new Intl.NumberFormat("en-PH", {
          style: "currency",
          currency: summary.rollup.currencyCode,
          maximumFractionDigits: 0,
        }).format(summary.rollup.totalCost)
      : summary.rollup.currencyCodes.join(", ");

  return (
    <section className={cn("flex min-h-0 flex-col overflow-hidden rounded-xs", className)} aria-labelledby="project-data-comparison-heading">
      <div className="shrink-0 border-b border-hairline p-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <p className="text-[9px] font-medium uppercase tracking-normal text-secondary">
              Cost data
            </p>
            <h1 id="project-data-comparison-heading" className="mt-0.5 text-[12px] font-medium leading-5 text-ink">
              Cost breakdown
            </h1>
            <p className="mt-0.5 max-w-[78ch] text-[10px] leading-4 text-secondary">
              Understand each selected estimate through its own cost donut and breakdown list.
            </p>
            <p className="mt-1 text-[10px] leading-4 text-secondary">
              Project rollup: <span className="font-medium text-ink">{rollupLabel}</span>
            </p>
          </div>

          <div className="relative z-10 flex w-full min-w-0 flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center xl:w-auto xl:justify-end">
            <SegmentedControl
              ariaLabel="Group cost by"
              options={GROUPING_OPTIONS}
              value={groupingMode}
              onValueChange={onGroupingModeChange}
              className="w-full min-w-0 sm:w-[216px]"
            />
          </div>
        </div>

        {insight ? <p className="mt-3 max-w-[86ch] text-balance text-[12px] font-medium leading-5 text-ink">{insight}</p> : null}

        <div className="mt-3 space-y-2">
          {isMixedCurrency ? (
            <Banner
              tone="warning"
              title="Mixed currencies"
              description="Sheet totals remain visible, but deltas are disabled because the selected estimates use different currencies."
              className="rounded-xs"
            />
          ) : null}
          {summary.didTruncate ? (
            <Banner
              tone="warning"
              title="Partial coverage"
              description={`Cost data is capped at ${summary.rowLimit.toLocaleString("en-PH")} rows; totals and mix may be incomplete.`}
              className="rounded-xs"
            />
          ) : null}
        </div>
      </div>

      {!baselineEstimate ? (
        <EmptyState
          title="No estimate sheets yet."
          description="Create an estimate sheet to analyze project cost by category, supplier, or space."
          action={
            <a
              href={`/workshop/projects/${summary.projectId}/estimates`}
              className="inline-flex min-h-7 items-center justify-center gap-1 rounded-xs border border-divider bg-surface px-2 text-[10px] font-medium leading-none text-ink hover:bg-surfaceMuted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              <Plus size={12} weight="regular" />
              Create estimate sheet
            </a>
          }
          className="m-3 flex-1"
        />
      ) : (
        <div className="min-h-0 flex-1 overflow-auto p-3">
          <div className="flex min-w-max gap-3">
            {displayEstimates.map((estimate, index) => {
              const columnData = getColumnData(summary, estimate, groupingMode, comparisonBucketOrder);
              const baseline = index === 0;
              const baselineTotal = baselineEstimate?.totalCost ?? null;
              const delta = !baseline && !isMixedCurrency && baselineEstimate ? estimate.totalCost - baselineEstimate.totalCost : null;
              const swapOptions = getSwapOptions(estimateOptions, displayEstimateIds, estimate.id, baseline);
              const canSwap = swapOptions.length > 1;

              return (
                <EstimateColumn
                  key={estimate.id}
                  estimate={estimate}
                  baseline={baseline}
                  groupingMode={groupingMode}
                  buckets={columnData.buckets}
                  total={columnData.total}
                  currencyCode={columnData.currencyCode}
                  delta={delta}
                  baselineTotal={baselineTotal}
                  activeBucketId={activeBucketId}
                  swapOptions={swapOptions}
                  canSwap={canSwap}
                  onActiveBucketChange={onActiveBucketChange}
                  onSwapEstimate={(nextId) => {
                    if (nextId === estimate.id) return;
                    if (baseline) {
                      onBaselineChange(nextId);
                      return;
                    }
                    const nextCompareIds = displayEstimateIds.slice(1);
                    nextCompareIds[index - 1] = nextId;
                    onCompareEstimateIdsChange(nextCompareIds.slice(0, MAX_COMPARE_COLUMNS - 1));
                  }}
                  onRemove={baseline ? undefined : () => onCompareEstimateIdsChange(compareEstimateIds.filter((id) => id !== estimate.id))}
                />
              );
            })}
            <AddEstimateColumn
              remainingOptions={remainingOptions}
              canAdd={canAddSheet}
              onAdd={(estimateId) => onCompareEstimateIdsChange([...compareEstimateIds, estimateId].slice(0, MAX_COMPARE_COLUMNS - 1))}
            />
          </div>
          <p className="mt-2 text-[9px] leading-4 text-secondary">
            Each donut uses the selected grouping mode and its own breakdown list. Deltas compare each sheet against the baseline column.
          </p>
        </div>
      )}
    </section>
  );
}

function getColumnData(
  summary: ProjectDataRouteSummary,
  estimate: ProjectDataEstimateSheet,
  groupingMode: ProjectChartGroupingMode,
  comparisonBucketOrder: string[] | null,
): { buckets: ProjectChartBucket[]; total: number; currencyCode: string } {
  const modeSeries = summary.seriesByEstimateId[estimate.id]?.[groupingMode];
  const buckets = modeSeries ? collapseProjectChartBuckets(sortBucketsByComparisonOrder(modeSeries.allBuckets, comparisonBucketOrder), VISIBLE_BUCKET_LIMIT) : [];
  return {
    buckets,
    total: modeSeries?.total ?? estimate.totalCost,
    currencyCode: estimate.currencyCode,
  };
}

function sortBucketsByComparisonOrder(
  buckets: ProjectChartBucket[],
  comparisonBucketOrder: string[] | null,
): ProjectChartBucket[] {
  if (!comparisonBucketOrder) return buckets;
  const order = new Map(comparisonBucketOrder.map((id, index) => [id, index]));
  return [...buckets].sort((left, right) => {
    const leftOrder = order.get(left.id) ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = order.get(right.id) ?? Number.MAX_SAFE_INTEGER;
    return leftOrder - rightOrder || right.total - left.total || left.label.localeCompare(right.label);
  });
}

function sortComparisonBucketIds(
  buckets: ProjectChartComparisonViewBucket[],
  baselineEstimateId: string | null,
  comparandEstimateIds: string[],
): string[] {
  return [...buckets]
    .sort((left, right) => {
      const leftMovement = maxMovementFromBaseline(left, baselineEstimateId, comparandEstimateIds);
      const rightMovement = maxMovementFromBaseline(right, baselineEstimateId, comparandEstimateIds);
      return rightMovement - leftMovement || right.baselineTotal - left.baselineTotal || left.label.localeCompare(right.label);
    })
    .map((bucket) => bucket.id);
}

function maxMovementFromBaseline(
  bucket: ProjectChartComparisonViewBucket,
  baselineEstimateId: string | null,
  comparandEstimateIds: string[],
): number {
  const baselineTotal = baselineEstimateId ? bucket.perEstimateTotals[baselineEstimateId] ?? 0 : 0;
  return comparandEstimateIds.reduce((max, estimateId) => {
    const delta = Math.abs((bucket.perEstimateTotals[estimateId] ?? 0) - baselineTotal);
    return Math.max(max, delta);
  }, 0);
}

function getSwapOptions(
  estimateOptions: DropdownSelectOption[],
  displayEstimateIds: string[],
  currentEstimateId: string,
  baseline: boolean,
): DropdownSelectOption[] {
  if (baseline) return estimateOptions;
  return estimateOptions.filter((option) => !displayEstimateIds.includes(option.value) || option.value === currentEstimateId);
}

function normalizeDisplayEstimateIds(
  baselineEstimateId: string | null,
  compareEstimateIds: string[],
  summary: ProjectDataRouteSummary,
): string[] {
  const allowedIds = new Set(summary.estimateSheets.map((estimate) => estimate.id));
  const ids = baselineEstimateId ? [baselineEstimateId, ...compareEstimateIds] : [];
  const out: string[] = [];
  for (const id of ids) {
    if (!allowedIds.has(id) || out.includes(id)) continue;
    out.push(id);
    if (out.length === MAX_COMPARE_COLUMNS) break;
  }
  return out;
}

function estimateLabel(estimate: ProjectDataEstimateSheet): string {
  return estimate.sheetCode ? `${estimate.name} (${estimate.sheetCode})` : estimate.name;
}
