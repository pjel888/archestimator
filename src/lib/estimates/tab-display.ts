import type { EstimateTabSummary } from "./types";

type EstimateTabDisplayInput = Pick<EstimateTabSummary, "name" | "sortOrder">;

export function formatEstimatePageTabName(pageNumber: number) {
  const safePageNumber = Number.isFinite(pageNumber) ? Math.max(1, Math.trunc(pageNumber)) : 1;
  return `Page ${String(safePageNumber).padStart(3, "0")}`;
}

export function getEstimateTabDisplayName(tab: Pick<EstimateTabSummary, "name">, renderedIndex: number) {
  if (renderedIndex === 0) return formatEstimatePageTabName(1);
  return tab.name;
}

export function sortEstimateTabsForDisplay<T extends EstimateTabDisplayInput>(tabs: readonly T[]): T[] {
  return [...tabs].sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name));
}
