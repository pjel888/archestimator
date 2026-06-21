/**
 * Deep-link builders for estimate cost data. The Data route's canonical board
 * params are `?sheet=` for the baseline and `?compare=` for up to two other
 * estimate sheets; it still accepts legacy `?left=`/`?right=` only as reader
 * fallbacks for old bookmarks.
 */

import type { ProjectChartGroupingMode } from "@/lib/project-charts/types";

export function buildCompareHref(
  projectId: string,
  estimateIds: string[],
  groupingMode?: ProjectChartGroupingMode | null,
): string {
  const params = new URLSearchParams();
  const [sheet, ...compareIds] = [...new Set(estimateIds)].slice(0, 3);
  if (sheet) params.set("sheet", sheet);
  if (compareIds.length > 0) params.set("compare", compareIds.join(","));
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
