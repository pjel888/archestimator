"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { CostAcrossSheetsSection } from "@/components/workshop/project-data/CostAcrossSheetsSection";
import { CostBreakdownSection } from "@/components/workshop/project-data/CostBreakdownSection";
import { ProjectDataKpiHeader } from "@/components/workshop/project-data/ProjectDataKpiHeader";
import { collapseProjectChartBuckets } from "@/lib/project-charts/aggregate-project-charts";
import type { ProjectChartBucket, ProjectChartGroupingMode } from "@/lib/project-charts/types";
import type { ProjectDataRouteSummary } from "@/lib/repositories/project-data-repository";

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
  const buckets = useMemo(
    () => sortBuckets(collapseProjectChartBuckets(selectedSeries?.[groupingMode]?.allBuckets ?? [], 6)),
    [groupingMode, selectedSeries],
  );
  const topBucket = buckets.find((bucket) => !bucket.isOther) ?? buckets[0] ?? null;

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
    <section data-project-data-page className="flex h-full min-h-0 flex-col overflow-hidden bg-white" aria-label="Project cost data">
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-3">
        <ProjectDataKpiHeader
          selectedEstimate={selectedEstimate}
          sheetCount={summary.estimateSheets.length}
          topBucket={topBucket}
        />
        <CostBreakdownSection
          projectId={summary.projectId}
          estimateSheets={summary.estimateSheets}
          selectedEstimate={selectedEstimate}
          groupingMode={groupingMode}
          buckets={buckets}
          activeBucketId={activeBucketId}
          didTruncate={summary.didTruncate}
          onActiveBucketChange={setActiveBucketId}
          onEstimateChange={handleEstimateChange}
          onGroupingModeChange={handleGroupingModeChange}
        />
        <CostAcrossSheetsSection summary={summary} groupingMode={groupingMode} />
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
