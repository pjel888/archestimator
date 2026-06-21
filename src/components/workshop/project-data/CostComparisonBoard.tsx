"use client";

import { Plus, X } from "@phosphor-icons/react/dist/ssr";

import { Banner } from "@/components/ui/banner";
import { DropdownSelect, type DropdownSelectOption } from "@/components/ui/dropdown-select";
import { EmptyState } from "@/components/ui/empty-state";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { buildInsightSentence } from "@/lib/project-charts/build-insight-sentence";
import { colorForBucket } from "@/lib/project-charts/bucket-color";
import {
  formatChartMoney,
  formatChartShare,
  formatSignedChartMoney,
} from "@/lib/project-charts/format";
import {
  buildProjectChartComparisonView,
  type ProjectChartComparisonView,
  type ProjectChartComparisonViewBucket,
} from "@/lib/project-charts/project-comparison-view";
import type { ProjectChartCostComposition, ProjectChartGroupingMode } from "@/lib/project-charts/types";
import type { ProjectDataEstimateSheet, ProjectDataRouteSummary } from "@/lib/repositories/project-data-repository";
import { cn } from "@/lib/ui/cn";

const GROUPING_OPTIONS: Array<{ value: ProjectChartGroupingMode; label: string }> = [
  { value: "category", label: "Category" },
  { value: "supplier", label: "Supplier" },
  { value: "space", label: "Space" },
];

const MAX_COMPARE_COLUMNS = 3;
const VISIBLE_BUCKET_LIMIT = 9;
const OTHER_BUCKET_ID = "__other__";

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

type BoardBucket = ProjectChartComparisonViewBucket & {
  hiddenCount?: number;
  isOther?: boolean;
  lineCountsByEstimateId?: Record<string, number>;
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
  const baselineEstimate = summary.estimateSheets.find((estimate) => estimate.id === baselineEstimateId) ?? null;
  const displayEstimateIds = normalizeDisplayEstimateIds(baselineEstimateId, compareEstimateIds, summary);
  const displayEstimates = displayEstimateIds
    .map((id) => summary.estimateSheets.find((estimate) => estimate.id === id))
    .filter((estimate): estimate is ProjectDataEstimateSheet => Boolean(estimate));
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
  const tableId = "project-data-cost-comparison-table";
  const insight = !isMixedCurrency && comparisonView?.insight ? buildInsightSentence(comparisonView.insight)?.sentence ?? null : null;
  const buckets = comparisonView ? collapseBoardBuckets(sortBoardBuckets(comparisonView), comparisonView, summary, groupingMode) : [];
  const maxBucketTotal = Math.max(
    ...buckets.flatMap((bucket) => displayEstimateIds.map((estimateId) => bucket.perEstimateTotals[estimateId] ?? 0)),
    0,
  );
  const totalColumns = 1 + Math.max(displayEstimates.length, 1);

  return (
    <section className={cn("flex min-h-0 flex-col overflow-hidden rounded-xs", className)} aria-labelledby="project-data-comparison-heading">
      <div className="shrink-0 border-b border-hairline p-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <p className="text-[9px] font-medium uppercase tracking-normal text-secondary">
              Cost data
            </p>
            <h1 id="project-data-comparison-heading" className="mt-0.5 text-[12px] font-medium leading-4 text-ink">
              Cost comparison
            </h1>
            <p className="mt-0.5 max-w-[78ch] text-[10px] leading-4 text-secondary">
              Compare estimate-sheet totals and cost drivers by category, supplier, or space.
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
            <DropdownSelect
              aria-label="Baseline estimate sheet"
              options={estimateOptions}
              value={baselineEstimate?.id ?? ""}
              onValueChange={onBaselineChange}
              placeholder="No estimate sheets"
              disabled={estimateOptions.length === 0}
              variant="boxed"
              className="h-7 w-full min-w-0 text-[10px] sm:w-[240px]"
            />
            <DropdownSelect
              aria-label="Add sheet to compare"
              options={remainingOptions}
              value=""
              onValueChange={(estimateId) => onCompareEstimateIdsChange([...compareEstimateIds, estimateId].slice(0, 2))}
              placeholder={displayEstimateIds.length >= MAX_COMPARE_COLUMNS ? "3 sheets selected" : "Add sheet"}
              disabled={!canAddSheet}
              variant="boxed"
              className="h-7 w-full min-w-0 text-[10px] sm:w-[180px]"
            />
          </div>
        </div>

        {displayEstimates.length ? (
          <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Sheets on comparison board">
            {displayEstimates.map((estimate, index) => (
              <SheetChip
                key={estimate.id}
                estimate={estimate}
                baseline={index === 0}
                removable={index > 0}
                onRemove={() => onCompareEstimateIdsChange(compareEstimateIds.filter((id) => id !== estimate.id))}
              />
            ))}
          </div>
        ) : null}

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
          <div className="overflow-x-auto rounded-xs border border-hairline bg-white">
            <table
              id={tableId}
              className="min-w-full border-collapse text-left text-[10px] leading-4"
              aria-label={`Cost comparison by ${groupingMode}`}
            >
              <caption className="sr-only">
                Cost comparison by {groupingMode}. Each row is a cost group and each sheet column shows amount, share, and baseline-relative delta.
              </caption>
              <thead className="border-b border-hairline bg-surfaceMuted/60 align-top text-[9px] font-medium uppercase tracking-normal text-secondary">
                <tr>
                  <th scope="col" className="sticky left-0 z-10 w-[15rem] min-w-[15rem] bg-surfaceMuted px-2 py-2 font-medium">
                    Cost group
                  </th>
                  {displayEstimates.map((estimate, index) => (
                    <th key={estimate.id} scope="col" className="min-w-[17rem] px-2 py-2 font-medium">
                      <SheetColumnHead
                        estimate={estimate}
                        baselineEstimate={displayEstimates[0] ?? estimate}
                        baseline={index === 0}
                        mixedCurrency={isMixedCurrency}
                        composition={summary.seriesByEstimateId[estimate.id]?.composition}
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {buckets.length ? (
                  buckets.map((bucket) => {
                    const isActive = activeBucketId === bucket.id;
                    return (
                      <tr
                        key={bucket.id}
                        tabIndex={0}
                        onMouseEnter={() => onActiveBucketChange(bucket.id)}
                        onMouseLeave={() => onActiveBucketChange(null)}
                        onFocus={() => onActiveBucketChange(bucket.id)}
                        onBlur={() => onActiveBucketChange(null)}
                        className={cn(
                          "border-b border-hairline last:border-b-0 transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus",
                          isActive ? "bg-surfaceMuted" : "bg-white",
                        )}
                      >
                        <th
                          scope="row"
                          className={cn(
                            "sticky left-0 z-10 max-w-[15rem] bg-inherit px-2 py-2 align-top font-normal text-ink",
                            isActive ? "bg-surfaceMuted" : "bg-white",
                          )}
                        >
                          <span className="inline-flex min-w-0 items-center gap-2">
                            <span className="size-2 shrink-0 rounded-xs" aria-hidden style={{ backgroundColor: bucket.color }} />
                            <span className="truncate" title={bucket.label}>{bucket.label}</span>
                            {bucket.hiddenCount ? (
                              <span className="shrink-0 text-[9px] text-secondary">· {bucket.hiddenCount} groups</span>
                            ) : null}
                          </span>
                        </th>
                        {displayEstimates.map((estimate, index) => (
                          <td key={`${bucket.id}-${estimate.id}`} className="min-w-[17rem] px-2 py-2 align-top">
                            <BucketValueCell
                              bucket={bucket}
                              estimate={estimate}
                              baselineEstimateId={displayEstimateIds[0] ?? estimate.id}
                              maxBucketTotal={maxBucketTotal}
                              baseline={index === 0}
                              mixedCurrency={isMixedCurrency}
                              activeBucketId={activeBucketId}
                              lineCount={readLineCount(summary, estimate.id, groupingMode, bucket)}
                            />
                          </td>
                        ))}
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={totalColumns} className="px-2 py-8 text-center text-secondary">
                      No cost rows for the selected sheet set.
                    </td>
                  </tr>
                )}
              </tbody>
              {buckets.length ? (
                <tfoot className="border-t border-dividerSibling bg-surfaceMuted/40 font-medium">
                  <tr>
                    <th scope="row" className="sticky left-0 z-10 bg-surfaceMuted px-2 py-2 text-ink">Total</th>
                    {displayEstimates.map((estimate, index) => (
                      <td key={estimate.id} className="px-2 py-2 text-right tabular-nums text-ink">
                        <div className="flex items-center justify-end gap-2">
                          <span>{formatChartMoney(estimate.totalCost, estimate.currencyCode)}</span>
                          {index > 0 && !isMixedCurrency ? (
                            <DeltaBadge delta={estimate.totalCost - (displayEstimates[0]?.totalCost ?? 0)} baselineTotal={displayEstimates[0]?.totalCost ?? 0} currencyCode={estimate.currencyCode} />
                          ) : null}
                        </div>
                      </td>
                    ))}
                  </tr>
                </tfoot>
              ) : null}
            </table>
          </div>
          <p className="mt-2 text-[9px] leading-4 text-secondary">
            Bars share one scale across the selected sheets. Deltas compare each sheet against the baseline column.
          </p>
        </div>
      )}
    </section>
  );
}

function SheetChip({
  estimate,
  baseline,
  removable,
  onRemove,
}: {
  estimate: ProjectDataEstimateSheet;
  baseline: boolean;
  removable: boolean;
  onRemove: () => void;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-h-6 max-w-[260px] items-center gap-1.5 rounded-xs border px-2 py-1 text-[9px] font-medium leading-none",
        baseline ? "border-ink bg-ink text-white" : "border-hairline bg-white text-ink",
      )}
    >
      <span className="truncate">{baseline ? "Baseline" : "Compare"} · {estimateLabel(estimate)}</span>
      {removable ? (
        <button
          type="button"
          className="grid size-4 shrink-0 place-items-center rounded-xs hover:bg-surfaceMuted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          onClick={onRemove}
          aria-label={`Remove ${estimate.name} from comparison`}
        >
          <X size={9} weight="regular" aria-hidden="true" />
        </button>
      ) : null}
    </span>
  );
}

function SheetColumnHead({
  estimate,
  baselineEstimate,
  baseline,
  mixedCurrency,
  composition,
}: {
  estimate: ProjectDataEstimateSheet;
  baselineEstimate: ProjectDataEstimateSheet;
  baseline: boolean;
  mixedCurrency: boolean;
  composition?: ProjectChartCostComposition;
}) {
  const delta = estimate.totalCost - baselineEstimate.totalCost;
  return (
    <div className="space-y-1 normal-case">
      <div className="min-w-0">
        <p className="truncate text-[10px] font-medium leading-4 text-ink" title={estimate.name}>{estimate.name}</p>
        {estimate.sheetCode ? <p className="truncate text-[8px] leading-3 text-secondary">{estimate.sheetCode}</p> : null}
      </div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-[12px] font-medium tabular-nums leading-4 text-ink">
          {formatChartMoney(estimate.totalCost, estimate.currencyCode)}
        </span>
        {!baseline && !mixedCurrency ? (
          <DeltaBadge delta={delta} baselineTotal={baselineEstimate.totalCost} currencyCode={estimate.currencyCode} />
        ) : baseline ? (
          <span className="rounded-xs border border-hairline bg-white px-1.5 py-0.5 text-[8px] font-medium uppercase leading-none text-secondary">
            Baseline
          </span>
        ) : null}
      </div>
      <p className="text-[8px] leading-3 text-secondary">{estimate.rowCount.toLocaleString("en-PH")} line items</p>
      {composition ? <CompositionMicroLine composition={composition} currencyCode={estimate.currencyCode} /> : null}
    </div>
  );
}

function BucketValueCell({
  bucket,
  estimate,
  baselineEstimateId,
  maxBucketTotal,
  baseline,
  mixedCurrency,
  activeBucketId,
  lineCount,
}: {
  bucket: BoardBucket;
  estimate: ProjectDataEstimateSheet;
  baselineEstimateId: string;
  maxBucketTotal: number;
  baseline: boolean;
  mixedCurrency: boolean;
  activeBucketId: string | null;
  lineCount: number;
}) {
  const total = bucket.perEstimateTotals[estimate.id] ?? 0;
  const share = bucket.perEstimateShares[estimate.id] ?? 0;
  const baselineTotal = bucket.perEstimateTotals[baselineEstimateId] ?? 0;
  const delta = total - baselineTotal;
  const barWidth = maxBucketTotal > 0 ? Math.max(total > 0 ? 2 : 0, (total / maxBucketTotal) * 100) : 0;
  const dim = Boolean(activeBucketId && activeBucketId !== bucket.id);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="tabular-nums text-ink">{formatChartMoney(total, estimate.currencyCode)}</span>
        <span className="tabular-nums text-secondary">{formatChartShare(share)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-xs bg-surfaceMuted" aria-hidden="true">
        <div
          className="h-full rounded-xs transition-[width,opacity] duration-200 motion-reduce:transition-none"
          style={{ width: `${barWidth}%`, backgroundColor: bucket.color, opacity: dim ? 0.45 : 1 }}
        />
      </div>
      <div className="flex items-center justify-between gap-2 text-[9px] leading-3 text-secondary">
        <span>{lineCount.toLocaleString("en-PH")} lines</span>
        {!baseline && !mixedCurrency ? (
          <DeltaBadge delta={delta} baselineTotal={baselineTotal} currencyCode={estimate.currencyCode} compact />
        ) : null}
      </div>
    </div>
  );
}

function CompositionMicroLine({
  composition,
  currencyCode,
}: {
  composition: ProjectChartCostComposition;
  currencyCode: string;
}) {
  const total = composition.grandTotal > 0 ? composition.grandTotal : 0;
  if (total <= 0) return null;
  return (
    <div className="grid grid-cols-3 gap-px overflow-hidden rounded-xs border border-hairline bg-hairline text-[8px] leading-3">
      <span className="bg-white px-1 py-0.5 text-secondary" title={formatChartMoney(composition.baseTotal, currencyCode)}>
        Direct {formatChartShare(composition.baseTotal / total)}
      </span>
      <span className="bg-white px-1 py-0.5 text-secondary" title={formatChartMoney(composition.miscTotal, currencyCode)}>
        Misc {formatChartShare(composition.miscTotal / total)}
      </span>
      <span className="bg-white px-1 py-0.5 text-secondary" title={formatSignedChartMoney(composition.adjustmentTotal, currencyCode)}>
        Adj {formatSignedShare(composition.adjustmentTotal / total)}
      </span>
    </div>
  );
}

function DeltaBadge({
  delta,
  baselineTotal,
  currencyCode,
  compact = false,
}: {
  delta: number;
  baselineTotal: number;
  currencyCode: string;
  compact?: boolean;
}) {
  const tone = delta > 0 ? "text-danger bg-dangerSoft" : delta < 0 ? "text-success bg-successSoft" : "text-secondary bg-surfaceMuted";
  const percent = baselineTotal === 0 ? (delta === 0 ? "0%" : "new") : formatSignedShare(delta / baselineTotal);
  const signCue = delta > 0 ? "up" : delta < 0 ? "down" : "flat";
  return (
    <span
      className={cn("inline-flex shrink-0 items-center rounded-xs px-1.5 py-0.5 font-medium tabular-nums leading-none", tone, compact ? "text-[8px]" : "text-[9px]")}
      aria-label={`${formatSignedChartMoney(delta, currencyCode)} ${percent} ${signCue} versus baseline`}
      title={`${formatSignedChartMoney(delta, currencyCode)} (${percent}) versus baseline`}
    >
      {formatSignedChartMoney(delta, currencyCode)}{compact ? "" : ` · ${percent}`}
    </span>
  );
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

function sortBoardBuckets(view: ProjectChartComparisonView): ProjectChartComparisonViewBucket[] {
  const baselineId = view.baselineEstimateId;
  if (view.estimates.length <= 1) {
    return [...view.buckets].sort((left, right) => {
      const leftTotal = baselineId ? left.perEstimateTotals[baselineId] ?? 0 : left.baselineTotal;
      const rightTotal = baselineId ? right.perEstimateTotals[baselineId] ?? 0 : right.baselineTotal;
      return rightTotal - leftTotal || left.label.localeCompare(right.label);
    });
  }
  const comparandIds = view.estimates.map((estimate) => estimate.id).filter((id) => id !== baselineId);
  return [...view.buckets].sort((left, right) => {
    const leftMovement = maxMovementFromBaseline(left, baselineId, comparandIds);
    const rightMovement = maxMovementFromBaseline(right, baselineId, comparandIds);
    return rightMovement - leftMovement || left.label.localeCompare(right.label);
  });
}

function collapseBoardBuckets(
  buckets: ProjectChartComparisonViewBucket[],
  view: ProjectChartComparisonView,
  summary: ProjectDataRouteSummary,
  groupingMode: ProjectChartGroupingMode,
): BoardBucket[] {
  if (buckets.length <= VISIBLE_BUCKET_LIMIT) return buckets;
  const visible = buckets.slice(0, VISIBLE_BUCKET_LIMIT);
  const hidden = buckets.slice(VISIBLE_BUCKET_LIMIT);
  const hiddenIds = new Set(hidden.map((bucket) => bucket.id));
  const perEstimateTotals: Record<string, number> = {};
  const perEstimateShares: Record<string, number> = {};
  const lineCountsByEstimateId: Record<string, number> = {};
  for (const estimate of view.estimates) {
    const total = hidden.reduce((sum, bucket) => sum + (bucket.perEstimateTotals[estimate.id] ?? 0), 0);
    perEstimateTotals[estimate.id] = total;
    perEstimateShares[estimate.id] = (view.totalsByEstimateId[estimate.id] ?? 0) > 0 ? total / (view.totalsByEstimateId[estimate.id] ?? 0) : 0;
    lineCountsByEstimateId[estimate.id] = (summary.seriesByEstimateId[estimate.id]?.[groupingMode]?.allBuckets ?? [])
      .filter((bucket) => hiddenIds.has(bucket.id))
      .reduce((sum, bucket) => sum + bucket.rowCount, 0);
  }
  const baselineTotal = view.baselineEstimateId ? perEstimateTotals[view.baselineEstimateId] ?? 0 : 0;
  const comparandTotal = view.comparandEstimateId ? perEstimateTotals[view.comparandEstimateId] ?? 0 : 0;
  const delta = comparandTotal - baselineTotal;
  return [
    ...visible,
    {
      id: OTHER_BUCKET_ID,
      label: "Other",
      color: colorForBucket(OTHER_BUCKET_ID),
      perEstimateTotals,
      perEstimateShares,
      baselineTotal,
      comparandTotal,
      delta,
      deltaPercent: baselineTotal === 0 ? (comparandTotal === 0 ? 0 : null) : delta / baselineTotal,
      isOther: true,
      hiddenCount: hidden.length,
      lineCountsByEstimateId,
    },
  ];
}

function maxMovementFromBaseline(
  bucket: ProjectChartComparisonViewBucket,
  baselineId: string | null,
  comparandIds: string[],
): number {
  const baselineTotal = baselineId ? bucket.perEstimateTotals[baselineId] ?? 0 : 0;
  return comparandIds.reduce((max, estimateId) => {
    const delta = Math.abs((bucket.perEstimateTotals[estimateId] ?? 0) - baselineTotal);
    return Math.max(max, delta);
  }, 0);
}

function readLineCount(
  summary: ProjectDataRouteSummary,
  estimateId: string,
  groupingMode: ProjectChartGroupingMode,
  bucket: BoardBucket,
): number {
  if (bucket.id === OTHER_BUCKET_ID) {
    return bucket.lineCountsByEstimateId?.[estimateId] ?? 0;
  }
  return summary.seriesByEstimateId[estimateId]?.[groupingMode]?.allBuckets.find((candidate) => candidate.id === bucket.id)?.rowCount ?? 0;
}

function estimateLabel(estimate: ProjectDataEstimateSheet): string {
  return estimate.sheetCode ? `${estimate.name} (${estimate.sheetCode})` : estimate.name;
}

function formatSignedShare(value: number): string {
  if (!Number.isFinite(value)) return "0%";
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${formatChartShare(Math.abs(value))}`;
}
