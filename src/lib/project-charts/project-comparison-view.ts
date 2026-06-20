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
import { buildProjectChartCostComposition, buildProjectChartSeries } from "./aggregate-project-charts";
import { colorForBucket } from "./bucket-color";
import type {
  ProjectChartBucket,
  ProjectChartEstimateOption,
  ProjectChartEstimateSeries,
  ProjectChartGroupingMode,
  ProjectChartCategoryNodeFact,
  ProjectChartNodeFact,
  ProjectChartRowFact,
  ProjectChartSupplierFact,
} from "./types";

const GROUPING_MODES: ProjectChartGroupingMode[] = ["space", "category", "supplier"];

export type ProjectChartComparisonViewInput = {
  estimates: ProjectChartEstimateOption[];
  /** Pre-aggregated buckets per loaded estimate (the server payload). */
  seriesByEstimateId: Record<string, ProjectChartEstimateSeries>;
  groupingMode: ProjectChartGroupingMode;
  /** Estimate ids to compare, in display order. The first is the default baseline. */
  estimateIds: string[];
  /** Override baseline; defaults to estimateIds[0]. */
  baselineEstimateId?: string | null;
};

type RawFactsInput = {
  estimates: ProjectChartEstimateOption[];
  rows: ProjectChartRowFact[];
  nodes: ProjectChartNodeFact[];
  categoryNodes: ProjectChartCategoryNodeFact[];
  suppliers: ProjectChartSupplierFact[];
  topBucketLimit?: number;
};

/**
 * Aggregate one estimate into pre-bucketed series for every grouping mode. Runs
 * server-side in the repository so raw facts never reach the client (`02` DB-4).
 */
export function buildEstimateSeries(input: RawFactsInput, estimateId: string): ProjectChartEstimateSeries {
  const partial = {
    composition: buildProjectChartCostComposition(input.rows, estimateId),
  } as ProjectChartEstimateSeries;
  for (const groupingMode of GROUPING_MODES) {
    const series = buildProjectChartSeries({
      estimates: input.estimates,
      rows: input.rows,
      nodes: input.nodes,
      categoryNodes: input.categoryNodes,
      suppliers: input.suppliers,
      groupingMode,
      estimateId,
      topBucketLimit: input.topBucketLimit,
    });
    partial[groupingMode] = { total: series.total, allBuckets: series.allBuckets };
  }
  return partial;
}

/** Aggregate every requested estimate into the server payload's series map. */
export function buildSeriesByEstimate(
  input: RawFactsInput,
  estimateIds: string[],
): Record<string, ProjectChartEstimateSeries> {
  const out: Record<string, ProjectChartEstimateSeries> = {};
  for (const estimateId of [...new Set(estimateIds)]) {
    out[estimateId] = buildEstimateSeries(input, estimateId);
  }
  return out;
}

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
  const orderedIds = input.estimateIds.filter(
    (id, index) => input.estimateIds.indexOf(id) === index && Boolean(input.seriesByEstimateId[id]),
  );

  const baselineEstimateId =
    (input.baselineEstimateId && orderedIds.includes(input.baselineEstimateId)
      ? input.baselineEstimateId
      : orderedIds[0]) ?? null;
  const comparandEstimateId = orderedIds.find((id) => id !== baselineEstimateId) ?? null;

  const currencyCode =
    input.estimates.find((estimate) => estimate.id === baselineEstimateId)?.currencyCode ??
    input.estimates.find((estimate) => estimate.id === comparandEstimateId)?.currencyCode ??
    "PHP";

  const modeSeriesById = new Map(
    orderedIds.map((estimateId) => [estimateId, input.seriesByEstimateId[estimateId]?.[input.groupingMode] ?? null]),
  );

  const estimates: ProjectChartComparisonViewEstimate[] = orderedIds.map((id) => ({
    id,
    name: input.estimates.find((estimate) => estimate.id === id)?.name ?? "Estimate",
    total: modeSeriesById.get(id)?.total ?? 0,
    isBaseline: id === baselineEstimateId,
  }));

  const totalsByEstimateId: Record<string, number> = {};
  for (const estimate of estimates) {
    totalsByEstimateId[estimate.id] = estimate.total;
  }

  // Union of bucket ids across every estimate, preferring a non-Other label.
  const bucketLabelById = new Map<string, string>();
  const bucketIds: string[] = [];
  for (const estimateId of orderedIds) {
    for (const bucket of modeSeriesById.get(estimateId)?.allBuckets ?? []) {
      if (!bucketLabelById.has(bucket.id)) {
        bucketLabelById.set(bucket.id, bucket.label);
        bucketIds.push(bucket.id);
      }
    }
  }

  const accessorByEstimateId = new Map(
    orderedIds.map((id) => [
      id,
      new Map<string, ProjectChartBucket>((modeSeriesById.get(id)?.allBuckets ?? []).map((bucket) => [bucket.id, bucket])),
    ]),
  );

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

/**
 * Convenience adapter: build the comparison view directly from raw facts by first
 * aggregating server-side. Used by tests and any caller that still holds raw facts
 * (the client always uses the pre-bucketed `buildProjectChartComparisonView`).
 */
export function buildProjectChartComparisonViewFromFacts(
  input: RawFactsInput & {
    groupingMode: ProjectChartGroupingMode;
    estimateIds: string[];
    baselineEstimateId?: string | null;
  },
): ProjectChartComparisonView {
  const seriesByEstimateId = buildSeriesByEstimate(input, input.estimateIds);
  return buildProjectChartComparisonView({
    estimates: input.estimates,
    seriesByEstimateId,
    groupingMode: input.groupingMode,
    estimateIds: input.estimateIds,
    baselineEstimateId: input.baselineEstimateId,
  });
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
