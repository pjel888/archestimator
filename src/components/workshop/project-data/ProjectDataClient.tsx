"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { CostAcrossSheetsSection } from "@/components/workshop/project-data/CostAcrossSheetsSection";
import { CostBreakdownSection } from "@/components/workshop/project-data/CostBreakdownSection";
import { CostCompositionSection } from "@/components/workshop/project-data/CostCompositionSection";
import { ProjectDataInsightHeader } from "@/components/workshop/project-data/ProjectDataInsightHeader";
import { buildCostConcentration } from "@/lib/project-charts/build-concentration-sentence";
import { collapseProjectChartBuckets } from "@/lib/project-charts/aggregate-project-charts";
import type { ProjectChartBucket, ProjectChartGroupingMode } from "@/lib/project-charts/types";
import type { ProjectDataRouteSummary } from "@/lib/repositories/project-data-repository";
import { cn } from "@/lib/ui/cn";

type ProjectDataClientProps = {
  summary: ProjectDataRouteSummary;
};

export function ProjectDataClient({ summary }: ProjectDataClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [selectedOverride, setSelectedOverride] = useState<{ source: string | null; value: string | null } | null>(null);
  const [groupingOverride, setGroupingOverride] = useState<{ source: ProjectChartGroupingMode; value: ProjectChartGroupingMode } | null>(null);
  const selectedEstimateId =
    selectedOverride?.source === summary.selectedEstimateId ? selectedOverride.value : summary.selectedEstimateId;
  const groupingMode =
    groupingOverride?.source === summary.selectedGroupingMode ? groupingOverride.value : summary.selectedGroupingMode;
  const interactionKey = `${summary.projectId}:${selectedEstimateId ?? ""}:${groupingMode}`;
  const [activeBucketState, setActiveBucketState] = useState<{ key: string; bucketId: string | null }>({
    key: interactionKey,
    bucketId: null,
  });
  const activeBucketId = activeBucketState.key === interactionKey ? activeBucketState.bucketId : null;
  const setActiveBucketId = (bucketId: string | null) => {
    setActiveBucketState({ key: interactionKey, bucketId });
  };

  const selectedEstimate = useMemo(
    () => summary.estimateSheets.find((estimate) => estimate.id === selectedEstimateId) ?? null,
    [selectedEstimateId, summary.estimateSheets],
  );
  const selectedSeries = selectedEstimateId ? summary.seriesByEstimateId[selectedEstimateId] : undefined;
  const allBuckets = useMemo(
    () => selectedSeries?.[groupingMode]?.allBuckets ?? [],
    [groupingMode, selectedSeries],
  );
  const buckets = useMemo(() => sortBuckets(collapseProjectChartBuckets(allBuckets, 6)), [allBuckets]);
  const otherGroupCount = Math.max(0, allBuckets.length - 6);
  const currencyCode = selectedEstimate?.currencyCode ?? "PHP";
  const concentration = useMemo(
    () => buildCostConcentration(allBuckets, selectedEstimate?.totalCost ?? 0, currencyCode, groupingMode),
    [allBuckets, selectedEstimate?.totalCost, currencyCode, groupingMode],
  );
  const composition = selectedSeries?.composition ?? null;
  const hasComposition = Boolean(composition && Number.isFinite(composition.grandTotal) && composition.grandTotal > 0);
  const hasAcrossSheets = summary.rollup.kind === "mixed" || summary.estimateSheets.length >= 2;
  const hasRightRail = hasComposition || hasAcrossSheets;

  const replaceQuery = (next: { sheet?: string; mode?: ProjectChartGroupingMode }) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("left");
    params.delete("right");
    if (next.sheet) {
      params.set("sheet", next.sheet);
    } else if (selectedEstimateId) {
      params.set("sheet", selectedEstimateId);
    }
    if (next.mode) params.set("mode", next.mode);
    const query = params.toString();
    router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
  };

  const handleEstimateChange = (estimateId: string) => {
    setSelectedOverride({ source: summary.selectedEstimateId, value: estimateId });
    setActiveBucketId(null);
    replaceQuery({ sheet: estimateId });
  };

  const handleGroupingModeChange = (mode: ProjectChartGroupingMode) => {
    setGroupingOverride({ source: summary.selectedGroupingMode, value: mode });
    setActiveBucketId(null);
    replaceQuery({ mode });
  };

  return (
    <section
      data-project-data-page
      className="dashboard-canvas-wash flex h-full min-h-0 flex-col overflow-hidden bg-transparent"
      aria-label="Project cost data"
    >
      <div className="project-data-grid min-h-0 flex-1 overflow-auto p-2 md:p-3" data-project-data-grid="16x12">
        <ProjectDataInsightHeader
          className="project-data-grid__hero project-data-panel project-data-panel--warm"
          estimateSheets={summary.estimateSheets}
          selectedEstimate={selectedEstimate}
          groupingMode={groupingMode}
          concentration={concentration}
          sheetCount={summary.estimateSheets.length}
          didTruncate={summary.didTruncate}
          rowLimit={summary.rowLimit}
          onEstimateChange={handleEstimateChange}
          onGroupingModeChange={handleGroupingModeChange}
        />
        <CostBreakdownSection
          className={cn(
            "project-data-panel project-data-panel--paper",
            hasRightRail ? "project-data-grid__primary" : "project-data-grid__full",
          )}
          projectId={summary.projectId}
          selectedEstimate={selectedEstimate}
          groupingMode={groupingMode}
          buckets={buckets}
          activeBucketId={activeBucketId}
          otherGroupCount={otherGroupCount}
          onActiveBucketChange={setActiveBucketId}
        />
        {hasComposition ? (
          <CostCompositionSection
            className={cn(
              "project-data-panel",
              hasAcrossSheets ? "project-data-grid__side-top" : "project-data-grid__side-full",
            )}
            composition={composition}
            currencyCode={currencyCode}
            sheetName={selectedEstimate?.name ?? "Selected sheet"}
          />
        ) : null}
        {hasAcrossSheets ? (
          <CostAcrossSheetsSection
            className={cn(
              "project-data-panel",
              hasComposition ? "project-data-grid__side-bottom" : "project-data-grid__side-full",
            )}
            summary={summary}
            groupingMode={groupingMode}
          />
        ) : null}
      </div>
    </section>
  );
}

function sortBuckets(buckets: ProjectChartBucket[]): ProjectChartBucket[] {
  return [...buckets].sort((left, right) => {
    if (left.isOther && !right.isOther) return 1;
    if (!left.isOther && right.isOther) return -1;
    return right.total - left.total || left.label.localeCompare(right.label);
  });
}
