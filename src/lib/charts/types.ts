/**
 * Shared chart bucket type for both workshop (ProjectCostDonutChart) and
 * share page receiver (CostDonutChart + aggregate-share-chart-buckets).
 *
 * Extracted in P1 of the Share Page Estimate View Enhancement.
 * Zero behavioral change for existing workshop usage.
 */

export type CostBucket = {
  id: string;
  label: string;
  total: number;
  share: number;
  rowCount: number;
  color: string;
  isOther?: boolean;
};
