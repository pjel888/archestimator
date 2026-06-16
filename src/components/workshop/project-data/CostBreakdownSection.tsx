"use client";

import { Plus } from "@phosphor-icons/react/dist/ssr";

import { CostDonutChart } from "@/components/charts/CostDonutChart";
import { Banner } from "@/components/ui/banner";
import { DropdownSelect, type DropdownSelectOption } from "@/components/ui/dropdown-select";
import { EmptyState } from "@/components/ui/empty-state";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { formatChartMoney, formatChartShare } from "@/lib/project-charts/format";
import type { ProjectChartBucket, ProjectChartGroupingMode } from "@/lib/project-charts/types";
import type { ProjectDataEstimateSheet } from "@/lib/repositories/project-data-repository";
import { cn } from "@/lib/ui/cn";

const GROUPING_OPTIONS: Array<{ value: ProjectChartGroupingMode; label: string }> = [
  { value: "category", label: "Category" },
  { value: "supplier", label: "Supplier" },
  { value: "space", label: "Space" },
];

type CostBreakdownSectionProps = {
  projectId: string;
  estimateSheets: ProjectDataEstimateSheet[];
  selectedEstimate: ProjectDataEstimateSheet | null;
  groupingMode: ProjectChartGroupingMode;
  buckets: ProjectChartBucket[];
  activeBucketId: string | null;
  didTruncate: boolean;
  onActiveBucketChange: (bucketId: string | null) => void;
  onEstimateChange: (estimateId: string) => void;
  onGroupingModeChange: (mode: ProjectChartGroupingMode) => void;
};

export function CostBreakdownSection({
  projectId,
  estimateSheets,
  selectedEstimate,
  groupingMode,
  buckets,
  activeBucketId,
  didTruncate,
  onActiveBucketChange,
  onEstimateChange,
  onGroupingModeChange,
}: CostBreakdownSectionProps) {
  const tableId = "project-data-cost-breakdown-table";
  const sheetOptions: DropdownSelectOption[] = estimateSheets.map((estimate) => ({
    value: estimate.id,
    label: estimate.sheetCode ? `${estimate.name} (${estimate.sheetCode})` : estimate.name,
  }));
  const hasBuckets = buckets.length > 0 && (selectedEstimate?.totalCost ?? 0) > 0;

  return (
    <section className="rounded-xs border border-hairline bg-white" aria-labelledby="project-data-breakdown-heading">
      <div className="flex flex-col gap-2 border-b border-hairline p-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h1 id="project-data-breakdown-heading" className="text-[12px] font-medium leading-4 text-ink">
              Cost breakdown
            </h1>
            <p className="mt-0.5 text-[10px] leading-4 text-secondary">
              See where the selected estimate sheet&apos;s cost is concentrated.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <DropdownSelect
              aria-label="Estimate sheet"
              options={sheetOptions}
              value={selectedEstimate?.id ?? ""}
              onValueChange={onEstimateChange}
              placeholder="No estimate sheets"
              disabled={sheetOptions.length === 0}
              variant="boxed"
              className="h-7 w-[220px] text-[10px]"
            />
            <SegmentedControl
              ariaLabel="Group cost by"
              options={GROUPING_OPTIONS}
              value={groupingMode}
              onValueChange={onGroupingModeChange}
              className="min-w-[216px]"
            />
          </div>
        </div>
        {didTruncate ? (
          <Banner
            tone="warning"
            title="Partial totals"
            description="Showing the largest cost groups from a capped data read. Open the table for the full breakdown when the full read is available."
          />
        ) : null}
      </div>

      {!selectedEstimate ? (
        <EmptyState
          title="No estimate sheets yet."
          description="Add an estimate sheet to see how cost breaks down by category, supplier, or space."
          action={
            <a
              href={`/workshop/projects/${projectId}/estimates`}
              className="inline-flex min-h-7 items-center justify-center gap-1 rounded-xs border border-divider bg-surface px-2 text-[10px] font-medium leading-none text-ink hover:bg-surfaceMuted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              <Plus size={12} weight="regular" />
              Create estimate sheet
            </a>
          }
          className="m-3"
        />
      ) : (
        <div className="grid gap-3 p-3 xl:grid-cols-[minmax(320px,0.95fr)_minmax(320px,1.05fr)]">
          <div className="min-w-0">
            <CostDonutChart
              buckets={buckets}
              total={selectedEstimate.totalCost}
              currencyCode={selectedEstimate.currencyCode}
              label="Total estimate"
              describedById={tableId}
              activeBucketId={activeBucketId}
              onActiveBucketChange={onActiveBucketChange}
              calloutTextSize="large"
              containerClassName="min-h-[360px]"
            />
          </div>
          <BreakdownTable
            id={tableId}
            sheetName={selectedEstimate.name}
            groupingMode={groupingMode}
            buckets={buckets}
            currencyCode={selectedEstimate.currencyCode}
            activeBucketId={activeBucketId}
            onActiveBucketChange={onActiveBucketChange}
            empty={!hasBuckets}
          />
        </div>
      )}
    </section>
  );
}

function BreakdownTable({
  id,
  sheetName,
  groupingMode,
  buckets,
  currencyCode,
  activeBucketId,
  onActiveBucketChange,
  empty,
}: {
  id: string;
  sheetName: string;
  groupingMode: ProjectChartGroupingMode;
  buckets: ProjectChartBucket[];
  currencyCode: string;
  activeBucketId: string | null;
  onActiveBucketChange: (bucketId: string | null) => void;
  empty: boolean;
}) {
  return (
    <div className="min-w-0 rounded-xs border border-hairline">
      <table id={id} className="w-full border-collapse text-left text-[10px] leading-4" aria-label={`${sheetName} cost groups by ${groupingMode}`}>
        <caption className="sr-only">{sheetName} cost groups by {groupingMode}</caption>
        <thead className="border-b border-hairline bg-surfaceMuted/60 text-[9px] font-medium uppercase text-secondary">
          <tr>
            <th className="px-2 py-1.5 font-medium">Label</th>
            <th className="px-2 py-1.5 text-right font-medium">Amount</th>
            <th className="px-2 py-1.5 text-right font-medium">Share</th>
          </tr>
        </thead>
        <tbody>
          {empty ? (
            <tr>
              <td colSpan={3} className="px-2 py-6 text-center text-secondary">
                No cost rows
              </td>
            </tr>
          ) : (
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
                  className={cn("border-b border-hairline last:border-b-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus", isActive ? "bg-surfaceMuted" : "bg-white")}
                >
                  <td className="px-2 py-1.5">
                    <span className="inline-flex min-w-0 items-center gap-2">
                      <span className="size-2 shrink-0 rounded-[2px]" aria-hidden style={{ backgroundColor: bucket.color }} />
                      <span className="truncate text-ink">{bucket.label}</span>
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums text-secondary">{formatChartMoney(bucket.total, currencyCode)}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums text-secondary">{formatChartShare(bucket.share)}</td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
