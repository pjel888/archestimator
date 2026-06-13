/**
 * The frozen comparison view-model (`09` P-1.1 / `12` BLOCK-1).
 *
 * The redesigned charts page is a *cost comparison* surface. Its spine (insight +
 * variance) must be driven by ONE stable view-model derived from the existing
 * aggregation engine — never re-assembled ad hoc in the component, which would
 * drift from the engine and re-introduce client-side comparison logic.
 *
 * For the canonical two-estimate (baseline vs comparand) case this view is exactly
 * equivalent to `buildProjectChartComparison(...).rows` — the contract test proves
 * it. It generalizes to up to three estimates by carrying per-estimate totals per
 * bucket while keeping the baseline-relative delta the headline number.
 */
import { buildProjectChartSeries } from "./aggregate-project-charts";
import { colorForBucket } from "./bucket-color";
import type {
  ProjectChartBucket,
  ProjectChartEstimateOption,
  ProjectChartGroupingMode,
  ProjectChartCategoryNodeFact,
  ProjectChartNodeFact,
  ProjectChartRowFact,
  ProjectChartSupplierFact,
} from "./types";

export type ProjectChartComparisonViewInput = {
  estimates: ProjectChartEstimateOption[];
  rows: ProjectChartRowFact[];
  nodes: ProjectChartNodeFact[];
  categoryNodes: ProjectChartCategoryNodeFact[];
  suppliers: ProjectChartSupplierFact[];
  groupingMode: ProjectChartGroupingMode;
  /** Estimate ids to compare, in display order. The first is the default baseline. */
  estimateIds: string[];
  /** Override baseline; defaults to estimateIds[0]. */
  baselineEstimateId?: string | null;
  topBucketLimit?: number;
};

export type ProjectChartComparisonViewEstimate = {
  id: string;
  name: string;
  total: number;
  isBaseline: boolean;
};

export type ProjectChartComparisonViewBucket = {
  id: string;
  label: string;
  color: string;
  /** total per estimate id (0 when the bucket is absent in that estimate). */
  perEstimateTotals: Record<string, number>;
  /** share-of-estimate per estimate id (0..1). */
  perEstimateShares: Record<string, number>;
  baselineTotal: number;
  /** primary comparand total (the first non-baseline estimate); 0 when single. */
  comparandTotal: number;
  /** comparandTotal - baselineTotal. */
  delta: number;
  /** delta / baselineTotal; null when baseline is 0 ("new"). */
  deltaPercent: number | null;
};

export type ProjectChartComparisonInsightInput = {
  baselineName: string;
  comparandName: string;
  baselineTotal: number;
  comparandTotal: number;
  delta: number;
  deltaPercent: number | null;
  direction: "lower" | "higher" | "equal";
  currencyCode: string;
  /** top 1–2 buckets by abs(delta), excluding ~zero movers. */
  topDrivers: Array<{ id: string; label: string; delta: number; deltaPercent: number | null }>;
};

export type ProjectChartComparisonView = {
  groupingMode: ProjectChartGroupingMode;
  currencyCode: string;
  estimates: ProjectChartComparisonViewEstimate[];
  baselineEstimateId: string | null;
  comparandEstimateId: string | null;
  totalsByEstimateId: Record<string, number>;
  buckets: ProjectChartComparisonViewBucket[];
  insight: ProjectChartComparisonInsightInput | null;
};

/** Totals within this fraction of the baseline are treated as "no material difference". */
const EQUAL_THRESHOLD = 0.005;

export function buildProjectChartComparisonView(
  input: ProjectChartComparisonViewInput,
): ProjectChartComparisonView {
  const topBucketLimit = input.topBucketLimit ?? 8;
  const orderedIds = input.estimateIds.filter((id, index) => input.estimateIds.indexOf(id) === index);

  const baselineEstimateId =
    (input.baselineEstimateId && orderedIds.includes(input.baselineEstimateId)
      ? input.baselineEstimateId
      : orderedIds[0]) ?? null;
  const comparandEstimateId = orderedIds.find((id) => id !== baselineEstimateId) ?? null;

  const currencyCode =
    input.estimates.find((estimate) => estimate.id === baselineEstimateId)?.currencyCode ??
    input.estimates.find((estimate) => estimate.id === comparandEstimateId)?.currencyCode ??
    "PHP";

  // Build one series per estimate (re-uses the engine's bucket resolution).
  const seriesByEstimateId = new Map(
    orderedIds.map((estimateId) => [
      estimateId,
      buildProjectChartSeries({
        estimates: input.estimates,
        rows: input.rows,
        nodes: input.nodes,
        categoryNodes: input.categoryNodes,
        suppliers: input.suppliers,
        groupingMode: input.groupingMode,
        estimateId,
        topBucketLimit,
      }),
    ]),
  );

  const estimates: ProjectChartComparisonViewEstimate[] = orderedIds.map((id) => {
    const series = seriesByEstimateId.get(id);
    return {
      id,
      name: series?.estimateName ?? input.estimates.find((estimate) => estimate.id === id)?.name ?? "Estimate",
      total: series?.total ?? 0,
      isBaseline: id === baselineEstimateId,
    };
  });

  const totalsByEstimateId: Record<string, number> = {};
  for (const estimate of estimates) {
    totalsByEstimateId[estimate.id] = estimate.total;
  }

  // Union of bucket ids across every estimate, preferring a non-Other label.
  const bucketLabelById = new Map<string, string>();
  const bucketIds: string[] = [];
  for (const estimateId of orderedIds) {
    for (const bucket of seriesByEstimateId.get(estimateId)?.allBuckets ?? []) {
      if (!bucketLabelById.has(bucket.id)) {
        bucketLabelById.set(bucket.id, bucket.label);
        bucketIds.push(bucket.id);
      }
    }
  }

  const bucketAccessor = (estimateId: string | null) => {
    if (!estimateId) return new Map<string, ProjectChartBucket>();
    return new Map((seriesByEstimateId.get(estimateId)?.allBuckets ?? []).map((bucket) => [bucket.id, bucket]));
  };
  const accessorByEstimateId = new Map(orderedIds.map((id) => [id, bucketAccessor(id)]));

  const buckets: ProjectChartComparisonViewBucket[] = bucketIds.map((bucketId) => {
    const perEstimateTotals: Record<string, number> = {};
    const perEstimateShares: Record<string, number> = {};
    for (const estimateId of orderedIds) {
      const bucket = accessorByEstimateId.get(estimateId)?.get(bucketId);
      perEstimateTotals[estimateId] = bucket?.total ?? 0;
      perEstimateShares[estimateId] = bucket?.share ?? 0;
    }
    const baselineTotal = baselineEstimateId ? perEstimateTotals[baselineEstimateId] ?? 0 : 0;
    const comparandTotal = comparandEstimateId ? perEstimateTotals[comparandEstimateId] ?? 0 : 0;
    const delta = comparandTotal - baselineTotal;
    const deltaPercent = baselineTotal === 0 ? (comparandTotal === 0 ? 0 : null) : delta / baselineTotal;

    return {
      id: bucketId,
      label: bucketLabelById.get(bucketId) ?? "Unknown",
      color: colorForBucket(bucketId),
      perEstimateTotals,
      perEstimateShares,
      baselineTotal,
      comparandTotal,
      delta,
      deltaPercent,
    };
  });

  // Sort by magnitude of movement, biggest first (the engine's contract).
  buckets.sort(
    (left, right) => Math.abs(right.delta) - Math.abs(left.delta) || left.label.localeCompare(right.label),
  );

  const insight = buildInsightInput({
    estimates,
    buckets,
    baselineEstimateId,
    comparandEstimateId,
    currencyCode,
  });

  return {
    groupingMode: input.groupingMode,
    currencyCode,
    estimates,
    baselineEstimateId,
    comparandEstimateId,
    totalsByEstimateId,
    buckets,
    insight,
  };
}

function buildInsightInput({
  estimates,
  buckets,
  baselineEstimateId,
  comparandEstimateId,
  currencyCode,
}: {
  estimates: ProjectChartComparisonViewEstimate[];
  buckets: ProjectChartComparisonViewBucket[];
  baselineEstimateId: string | null;
  comparandEstimateId: string | null;
  currencyCode: string;
}): ProjectChartComparisonInsightInput | null {
  if (!baselineEstimateId || !comparandEstimateId) {
    return null;
  }
  const baseline = estimates.find((estimate) => estimate.id === baselineEstimateId);
  const comparand = estimates.find((estimate) => estimate.id === comparandEstimateId);
  if (!baseline || !comparand) {
    return null;
  }

  const delta = comparand.total - baseline.total;
  const deltaPercent = baseline.total === 0 ? (comparand.total === 0 ? 0 : null) : delta / baseline.total;
  const direction = directionFor(delta, baseline.total);

  // Top drivers: buckets that actually moved, biggest first (already sorted).
  const topDrivers = buckets
    .filter((bucket) => Math.abs(bucket.delta) > 0)
    .slice(0, 2)
    .map((bucket) => ({
      id: bucket.id,
      label: bucket.label,
      delta: bucket.delta,
      deltaPercent: bucket.deltaPercent,
    }));

  return {
    baselineName: baseline.name,
    comparandName: comparand.name,
    baselineTotal: baseline.total,
    comparandTotal: comparand.total,
    delta,
    deltaPercent,
    direction,
    currencyCode,
    topDrivers,
  };
}

function directionFor(delta: number, baselineTotal: number): "lower" | "higher" | "equal" {
  if (baselineTotal === 0) {
    return delta === 0 ? "equal" : "higher";
  }
  if (Math.abs(delta) / baselineTotal <= EQUAL_THRESHOLD) {
    return "equal";
  }
  return delta < 0 ? "lower" : "higher";
}
