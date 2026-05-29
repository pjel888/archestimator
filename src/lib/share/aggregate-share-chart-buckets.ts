import type { PublicationSnapshotRow } from "@/lib/publication/types";
import type { CostBucket } from "@/lib/charts/types";

/**
 * Aggregate PublicationSnapshotRow[] into CostBucket[] for the receiver donut chart.
 *
 * Groups by `discipline`, sums rowTotal, computes share, assigns colors from the
 * standard 12-color palette, collapses beyond TOP_BUCKET_LIMIT into "Other".
 *
 * Pure function — no side effects, safe for useMemo([activeEstimate.rows]).
 *
 * Part of P1 Donut Chart Extraction in the Share Page Estimate View Enhancement.
 */

const PROJECT_CHART_COLORS = [
  "#2f5d50", "#d98b3a", "#4c6f9f", "#b84a62",
  "#7a5aa6", "#2f8f9d", "#c9a227", "#5f6b3d",
  "#8a8f98", "#8f5c38", "#4d7c63", "#6b7280",
];

const TOP_BUCKET_LIMIT = 8;

function aggregateByDiscipline(rows: PublicationSnapshotRow[]): Map<string, { total: number; rowCount: number }> {
  const map = new Map<string, { total: number; rowCount: number }>();

  for (const row of rows) {
    const discipline = (row.discipline || "Unspecified").trim() || "Unspecified";
    const existing = map.get(discipline) ?? { total: 0, rowCount: 0 };
    existing.total += row.rowTotal ?? 0;
    existing.rowCount += 1;
    map.set(discipline, existing);
  }

  return map;
}

export function aggregateRowsByDiscipline(rows: PublicationSnapshotRow[]): CostBucket[] {
  if (!rows || rows.length === 0) return [];

  const byDiscipline = aggregateByDiscipline(rows);
  const totalCost = rows.reduce((sum, r) => sum + (r.rowTotal ?? 0), 0);

  // Sort by total desc
  const sorted = Array.from(byDiscipline.entries())
    .map(([label, agg]) => ({
      label,
      total: agg.total,
      rowCount: agg.rowCount,
    }))
    .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));

  const buckets: CostBucket[] = [];
  let otherTotal = 0;
  let otherRowCount = 0;
  let otherCount = 0;

  sorted.forEach((item, index) => {
    if (index < TOP_BUCKET_LIMIT - 1 || sorted.length <= TOP_BUCKET_LIMIT) {
      const share = totalCost > 0 ? item.total / totalCost : 0;
      buckets.push({
        id: `disc-${item.label.toLowerCase().replace(/\s+/g, "-")}`,
        label: item.label,
        total: item.total,
        share,
        rowCount: item.rowCount,
        color: PROJECT_CHART_COLORS[index % PROJECT_CHART_COLORS.length],
      });
    } else {
      otherTotal += item.total;
      otherRowCount += item.rowCount;
      otherCount += 1;
    }
  });

  if (otherCount > 0) {
    const share = totalCost > 0 ? otherTotal / totalCost : 0;
    buckets.push({
      id: "other-disciplines",
      label: "Other",
      total: otherTotal,
      share,
      rowCount: otherRowCount,
      color: PROJECT_CHART_COLORS[PROJECT_CHART_COLORS.length - 1],
      isOther: true,
    });
  }

  return buckets;
}

export const CHART_CONSTANTS = {
  TOP_BUCKET_LIMIT,
  PROJECT_CHART_COLORS,
} as const;
