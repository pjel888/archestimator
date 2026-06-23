"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { CostComparisonBoard } from "@/components/workshop/project-data/CostComparisonBoard";
import type { ProjectChartGroupingMode } from "@/lib/project-charts/types";
import type { ProjectDataRouteSummary } from "@/lib/repositories/project-data-repository";

type ProjectDataClientProps = {
  summary: ProjectDataRouteSummary;
};

type CompareOverride = {
  source: string;
  value: string[];
};

export function ProjectDataClient({ summary }: ProjectDataClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [selectedOverride, setSelectedOverride] = useState<{ source: string | null; value: string | null } | null>(null);
  const [compareOverride, setCompareOverride] = useState<CompareOverride | null>(null);
  const [groupingOverride, setGroupingOverride] = useState<{ source: ProjectChartGroupingMode; value: ProjectChartGroupingMode } | null>(null);
  const selectedEstimateId =
    selectedOverride?.source === summary.selectedEstimateId ? selectedOverride.value : summary.selectedEstimateId;
  const compareSource = compareSourceKey(summary);
  const compareEstimateIds = compareOverride?.source === compareSource ? compareOverride.value : summary.compareEstimateIds;
  const groupingMode =
    groupingOverride?.source === summary.selectedGroupingMode ? groupingOverride.value : summary.selectedGroupingMode;
  const interactionKey = `${summary.projectId}:${selectedEstimateId ?? ""}:${compareEstimateIds.join("|")}:${groupingMode}`;
  const [activeBucketState, setActiveBucketState] = useState<{ key: string; bucketId: string | null }>({
    key: interactionKey,
    bucketId: null,
  });
  const activeBucketId = activeBucketState.key === interactionKey ? activeBucketState.bucketId : null;
  const setActiveBucketId = (bucketId: string | null) => {
    setActiveBucketState({ key: interactionKey, bucketId });
  };

  const replaceQuery = (next: { sheet?: string | null; compareIds?: string[]; mode?: ProjectChartGroupingMode }) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("left");
    params.delete("right");
    const nextSheet = next.sheet !== undefined ? next.sheet : selectedEstimateId;
    const nextCompareIds = next.compareIds ?? compareEstimateIds;
    if (nextSheet) {
      params.set("sheet", nextSheet);
    } else {
      params.delete("sheet");
    }
    if (nextCompareIds.length > 0) {
      params.set("compare", nextCompareIds.join(","));
    } else if (summary.estimateSheets.length > 1) {
      params.set("compare", "none");
    } else {
      params.delete("compare");
    }
    const nextMode = next.mode ?? groupingMode;
    if (nextMode === "category") {
      params.delete("mode");
    } else {
      params.set("mode", nextMode);
    }
    const query = params.toString();
    router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
  };

  const handleEstimateChange = (estimateId: string) => {
    const nextCompareIds = normalizeCompareIds(
      [selectedEstimateId, ...compareEstimateIds].filter((id): id is string => Boolean(id)),
      estimateId,
      summary,
    );
    setSelectedOverride({ source: summary.selectedEstimateId, value: estimateId });
    setCompareOverride({ source: compareSource, value: nextCompareIds });
    setActiveBucketId(null);
    replaceQuery({ sheet: estimateId, compareIds: nextCompareIds });
  };

  const handleCompareEstimateIdsChange = (estimateIds: string[]) => {
    const nextCompareIds = normalizeCompareIds(estimateIds, selectedEstimateId, summary);
    setCompareOverride({ source: compareSource, value: nextCompareIds });
    setActiveBucketId(null);
    replaceQuery({ compareIds: nextCompareIds });
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
      <div className="project-data-grid min-h-0 flex-1 overflow-hidden p-2 md:p-3" data-project-data-grid="comparison-board">
        <CostComparisonBoard
          className="project-data-grid__board project-data-panel project-data-panel--paper"
          summary={summary}
          baselineEstimateId={selectedEstimateId}
          compareEstimateIds={compareEstimateIds}
          groupingMode={groupingMode}
          activeBucketId={activeBucketId}
          onBaselineChange={handleEstimateChange}
          onCompareEstimateIdsChange={handleCompareEstimateIdsChange}
          onGroupingModeChange={handleGroupingModeChange}
          onActiveBucketChange={setActiveBucketId}
        />
      </div>
    </section>
  );
}

function compareSourceKey(summary: ProjectDataRouteSummary): string {
  return `${summary.selectedEstimateId ?? ""}:${summary.compareEstimateIds.join("|")}`;
}

function normalizeCompareIds(
  estimateIds: string[],
  selectedEstimateId: string | null,
  summary: ProjectDataRouteSummary,
): string[] {
  const allowedIds = new Set(summary.estimateSheets.map((estimate) => estimate.id));
  const out: string[] = [];
  const seen = new Set<string>();
  for (const id of estimateIds) {
    if (!allowedIds.has(id) || id === selectedEstimateId || seen.has(id)) continue;
    out.push(id);
    seen.add(id);
    if (out.length === 2) break;
  }
  return out;
}
