/**
 * Deep-link builders for the dashboard's other-estimates list (Zone C). The
 * Data route reads `?left=&right=&mode=` search params
 * (`src/app/workshop/projects/[projectId]/data/page.tsx`); `buildCompareHref`
 * targets that exact contract with the headline as baseline (`left`) and the
 * row as comparand (`right`).
 */

import type { ProjectChartGroupingMode } from "@/lib/project-charts/types";

export function buildCompareHref(
  projectId: string,
  estimateIds: string[],
  groupingMode?: ProjectChartGroupingMode | null,
): string {
  const params = new URLSearchParams();
  const [left, right] = estimateIds;
  if (left) params.set("left", left);
  if (right) params.set("right", right);
  if (groupingMode) params.set("mode", groupingMode);
  const query = params.toString();
  return `/workshop/projects/${projectId}/data${query ? `?${query}` : ""}`;
}

/**
 * Open-link target for an estimate sheet: its first node when known, else the
 * estimate id (mirrors `ProjectEstimatesTable`'s `firstNodeId` oracle).
 */
export function buildEstimateSheetHref(projectId: string, estimateId: string, firstNodeId: string | null): string {
  return `/workshop/projects/${projectId}/estimates/${firstNodeId ?? estimateId}`;
}
