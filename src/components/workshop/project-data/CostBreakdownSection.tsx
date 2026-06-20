"use client";

import { Plus } from "@phosphor-icons/react/dist/ssr";

import { CostDonutChart } from "@/components/charts/CostDonutChart";
import { EmptyState } from "@/components/ui/empty-state";
import { CostLedger } from "@/components/workshop/project-data/CostLedger";
import type { ProjectChartBucket, ProjectChartGroupingMode } from "@/lib/project-charts/types";
import type { ProjectDataEstimateSheet } from "@/lib/repositories/project-data-repository";
import { cn } from "@/lib/ui/cn";

type CostBreakdownSectionProps = {
  className?: string;
  projectId: string;
  selectedEstimate: ProjectDataEstimateSheet | null;
  groupingMode: ProjectChartGroupingMode;
  buckets: ProjectChartBucket[];
  activeBucketId: string | null;
  otherGroupCount: number;
  onActiveBucketChange: (bucketId: string | null) => void;
};

export function CostBreakdownSection({
  className,
  projectId,
  selectedEstimate,
  groupingMode,
  buckets,
  activeBucketId,
  otherGroupCount,
  onActiveBucketChange,
}: CostBreakdownSectionProps) {
  const tableId = "project-data-cost-breakdown-table";
  const hasBuckets = buckets.length > 0 && (selectedEstimate?.totalCost ?? 0) > 0;

  return (
    <section className={cn("flex min-h-0 flex-col overflow-hidden rounded-xs", className)} aria-labelledby="project-data-breakdown-heading">
      <div className="shrink-0 border-b border-hairline p-3">
        <h1 id="project-data-breakdown-heading" className="text-[12px] font-medium leading-4 text-ink">
          Cost breakdown
        </h1>
        <p className="mt-0.5 text-[10px] leading-4 text-secondary">
          Where the selected sheet&apos;s cost is concentrated, largest first.
        </p>
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
        <div className="grid min-h-0 flex-1 items-start gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_200px]">
          <CostLedger
            id={tableId}
            sheetName={selectedEstimate.name}
            groupingMode={groupingMode}
            buckets={buckets}
            total={selectedEstimate.totalCost}
            currencyCode={selectedEstimate.currencyCode}
            activeBucketId={activeBucketId}
            onActiveBucketChange={onActiveBucketChange}
            otherGroupCount={otherGroupCount}
            empty={!hasBuckets}
          />
          <aside className="project-data-bucket-card hidden flex-col items-center gap-1 rounded-xs p-2 lg:flex lg:pt-2" aria-label="Selected sheet share chart">
            <CostDonutChart
              buckets={buckets}
              total={selectedEstimate.totalCost}
              currencyCode={selectedEstimate.currencyCode}
              label="Total estimate"
              describedById={tableId}
              hideCallouts
              activeBucketId={activeBucketId}
              onActiveBucketChange={onActiveBucketChange}
            />
            <p className="text-[9px] leading-3 text-secondary">Share of total</p>
          </aside>
        </div>
      )}
    </section>
  );
}
