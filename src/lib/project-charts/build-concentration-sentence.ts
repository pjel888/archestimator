/**
 * Single-sheet cost-concentration insight generator.
 *
 * Sibling to `build-insight-sentence.ts` (which narrates cross-sheet VARIANCE). This
 * one narrates how concentrated ONE sheet's cost is — the plain-language headline that
 * leads the Data page ("{top} drives this sheet — {amount} ({share}) of {total}; with
 * {second} ({share2}) the top two {nounPlural} carry {cum}.").
 *
 * Pure and deterministic. It also returns the concentration METRICS the Panel A figure
 * row shows (top share, top-2 cumulative share, number of groups carrying 80% of cost,
 * total line count), computed over the full, uncollapsed bucket list so the figures are
 * accurate rather than reflecting the top-6 + "Other" display collapse.
 */
import { formatChartMoney, formatChartShare } from "./format";
import type { ProjectChartBucket, ProjectChartGroupingMode } from "./types";

export type CostConcentration = {
  /** Full sentence for the inline headline and screen readers. */
  sentence: string;
  /** Share (0..1) of the single largest real (non-"Other") group. */
  topShare: number;
  /** Cumulative share (0..1) of the two largest real groups. */
  topTwoShare: number;
  /** How many groups (largest-first) it takes to reach 80% of the sheet total. */
  groupsCarrying80: number;
  /** Total line-item count across all groups. */
  lineCount: number;
  /** Label of the largest real group, or null when the sheet has no cost. */
  topLabel: string | null;
};

const NOUNS: Record<ProjectChartGroupingMode, { singular: string; plural: string }> = {
  category: { singular: "category", plural: "categories" },
  supplier: { singular: "supplier", plural: "suppliers" },
  space: { singular: "area", plural: "areas" },
};

const DOMINANT_THRESHOLD = 0.5;

export function buildCostConcentration(
  buckets: ProjectChartBucket[],
  total: number,
  currencyCode: string,
  groupingMode: ProjectChartGroupingMode,
): CostConcentration {
  const safeTotal = Number.isFinite(total) && total > 0 ? total : 0;
  const lineCount = buckets.reduce((sum, bucket) => sum + (Number.isFinite(bucket.rowCount) ? bucket.rowCount : 0), 0);

  // Concentration is measured over REAL groups (exclude the "Other" rollup) sorted
  // largest-first, so "top two" and "groups carrying 80%" are meaningful.
  const real = buckets
    .filter((bucket) => !bucket.isOther && Number.isFinite(bucket.total) && bucket.total > 0)
    .sort((left, right) => right.total - left.total || left.label.localeCompare(right.label));

  const empty: CostConcentration = {
    sentence: "No cost recorded for this sheet yet.",
    topShare: 0,
    topTwoShare: 0,
    groupsCarrying80: 0,
    lineCount,
    topLabel: null,
  };

  if (safeTotal <= 0 || real.length === 0) {
    return empty;
  }

  const nouns = NOUNS[groupingMode];
  const top = real[0]!;
  const topShare = shareOf(top.total, safeTotal);
  const second = real[1] ?? null;
  const topTwoShare = topShare + (second ? shareOf(second.total, safeTotal) : 0);
  const groupsCarrying80 = countGroupsToReach(real, safeTotal, 0.8);

  // One real group → it is effectively the whole sheet.
  if (real.length === 1) {
    return {
      ...empty,
      sentence: `${top.label} is the whole sheet — ${formatChartMoney(top.total, currencyCode)} (${formatChartShare(topShare)}).`,
      topShare,
      topTwoShare: topShare,
      groupsCarrying80: 1,
      topLabel: top.label,
    };
  }

  // Dominant single group (>=50%): lead with it; mention the runner-up briefly.
  if (topShare >= DOMINANT_THRESHOLD && second) {
    return {
      ...empty,
      sentence:
        `${top.label} dominates this sheet — ${formatChartMoney(top.total, currencyCode)} ` +
        `(${formatChartShare(topShare)}) of ${formatChartMoney(safeTotal, currencyCode)}, ` +
        `well ahead of ${second.label} (${formatChartShare(shareOf(second.total, safeTotal))}).`,
      topShare,
      topTwoShare,
      groupsCarrying80,
      topLabel: top.label,
    };
  }

  // General case (2+ groups, no single dominator): lead group + cumulative top-two.
  return {
    ...empty,
    sentence:
      `${top.label} leads this sheet at ${formatChartMoney(top.total, currencyCode)} ` +
      `(${formatChartShare(topShare)} of ${formatChartMoney(safeTotal, currencyCode)}); with ` +
      `${second!.label} (${formatChartShare(shareOf(second!.total, safeTotal))}), the top two ` +
      `${nouns.plural} carry ${formatChartShare(topTwoShare)}.`,
    topShare,
    topTwoShare,
    groupsCarrying80,
    topLabel: top.label,
  };
}

function shareOf(value: number, total: number): number {
  return total > 0 ? value / total : 0;
}

/** Number of largest-first groups whose cumulative total first reaches `fraction` of total. */
function countGroupsToReach(sortedDesc: ProjectChartBucket[], total: number, fraction: number): number {
  if (total <= 0) return 0;
  const target = total * fraction;
  let cumulative = 0;
  let count = 0;
  for (const bucket of sortedDesc) {
    cumulative += bucket.total;
    count += 1;
    if (cumulative >= target) break;
  }
  return count;
}
