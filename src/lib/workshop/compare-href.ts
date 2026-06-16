/**
 * Deep-link builders for estimate cost data. The Data route's canonical
 * selection param is `?sheet=`; it still accepts legacy `?left=` only as a
 * reader fallback for old bookmarks.
 */

import type { ProjectChartGroupingMode } from "@/lib/project-charts/types";

export function buildCompareHref(
  projectId: string,
  estimateIds: string[],
  groupingMode?: ProjectChartGroupingMode | null,
): string {
  const params = new URLSearchParams();
  const [sheet] = estimateIds;
  if (sheet) params.set("sheet", sheet);
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
