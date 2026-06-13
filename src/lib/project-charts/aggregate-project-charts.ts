import { OTHER_BUCKET_ID, colorForBucket } from "./bucket-color";
import type {
  ProjectChartBucket,
  ProjectChartCategoryNodeFact,
  ProjectChartComparison,
  ProjectChartComparisonRow,
  ProjectChartEstimateOption,
  ProjectChartGroupingMode,
  ProjectChartNodeFact,
  ProjectChartRowFact,
  ProjectChartSeries,
  ProjectChartTableRow,
  ProjectChartSupplierFact,
} from "./types";

/**
 * Lookup maps for bucket resolution, built ONCE per series instead of once per
 * row. The old code rebuilt `new Map(nodes.map(...))` inside `resolveSpaceBucket`
 * on every row — O(rows × nodes) (`01` PERF-3). These are identical every
 * iteration (they depend only on the fact arrays, never on the row), so they are
 * hoisted out of the hot loop here.
 */
type BucketLookups = {
  nodeById: Map<string, ProjectChartNodeFact>;
  categoryById: Map<string, ProjectChartCategoryNodeFact>;
  supplierById: Map<string, ProjectChartSupplierFact>;
};

function createBucketLookups(input: ProjectChartsAggregationBase): BucketLookups {
  return {
    nodeById: new Map(input.nodes.map((node) => [node.id, node])),
    categoryById: new Map(input.categoryNodes.map((node) => [node.id, node])),
    supplierById: new Map(input.suppliers.map((supplier) => [supplier.id, supplier])),
  };
}

type ProjectChartsAggregationBase = {
  estimates: ProjectChartEstimateOption[];
  rows: ProjectChartRowFact[];
  nodes: ProjectChartNodeFact[];
  categoryNodes: ProjectChartCategoryNodeFact[];
  suppliers: ProjectChartSupplierFact[];
  groupingMode: ProjectChartGroupingMode;
  topBucketLimit?: number;
};

type ProjectChartsAggregationInput = ProjectChartsAggregationBase & {
  leftEstimateId: string;
  rightEstimateId: string;
};

type BucketAccumulator = {
  id: string;
  label: string;
  total: number;
  rowCount: number;
};

type SpaceNodeAccumulator = {
  node: ProjectChartNodeFact;
  total: number;
  rowCount: number;
};

export function getProjectChartDefaultPair(
  estimates: ProjectChartEstimateOption[],
): { leftEstimateId: string | null; rightEstimateId: string | null } {
  return {
    leftEstimateId: estimates[0]?.id ?? null,
    rightEstimateId: estimates[1]?.id ?? estimates[0]?.id ?? null,
  };
}

export function buildProjectChartComparison(
  input: ProjectChartsAggregationInput,
): ProjectChartComparison {
  const topBucketLimit = input.topBucketLimit ?? 8;
  const currencyCode =
    input.estimates.find((estimate) => estimate.id === input.leftEstimateId)?.currencyCode ??
    input.estimates.find((estimate) => estimate.id === input.rightEstimateId)?.currencyCode ??
    "PHP";

  const left = buildSeries(input, input.leftEstimateId, topBucketLimit);
  const right = buildSeries(input, input.rightEstimateId, topBucketLimit);

  return {
    groupingMode: input.groupingMode,
    left,
    right,
    rows: buildComparisonRows(left.allBuckets, right.allBuckets),
    currencyCode,
  };
}

export function buildProjectChartSeries(
  input: ProjectChartsAggregationBase & {
    estimateId: string;
  },
): ProjectChartSeries {
  return buildSeries(input, input.estimateId, input.topBucketLimit ?? 8);
}

export function calculateProjectChartRowTotal(row: ProjectChartRowFact): number {
  const subTotal = toFiniteNumber(row.quantity) * toFiniteNumber(row.unitCost);
  return subTotal + toFiniteNumber(row.miscCost) + (subTotal * toFiniteNumber(row.contingencyPercentage ?? 0)) / 100;
}

function buildSeries(
  input: ProjectChartsAggregationBase,
  estimateId: string,
  topBucketLimit: number,
): ProjectChartSeries {
  const estimate = input.estimates.find((candidate) => candidate.id === estimateId);
  const rawBuckets = new Map<string, BucketAccumulator>();
  const lookups = createBucketLookups(input);

  for (const row of input.rows) {
    if (row.estimateId !== estimateId) {
      continue;
    }

    const bucket = resolveBucket(input, lookups, row);
    const total = calculateProjectChartRowTotal(row);
    const existing = rawBuckets.get(bucket.id) ?? {
      id: bucket.id,
      label: bucket.label,
      total: 0,
      rowCount: 0,
    };

    existing.total += total;
    existing.rowCount += 1;
    rawBuckets.set(bucket.id, existing);
  }

  const allBuckets = [...rawBuckets.values()]
    .sort((left, right) => right.total - left.total || left.label.localeCompare(right.label))
    .map((bucket) => toBucket(bucket, getBucketShare(bucket.total, rawBuckets)));
  const total = allBuckets.reduce((sum, bucket) => sum + bucket.total, 0);

  return {
    estimateId,
    estimateName: estimate?.name ?? "Estimate",
    total,
    buckets: collapseTopBuckets(allBuckets, topBucketLimit),
    allBuckets,
    tableRows:
      input.groupingMode === "space"
        ? buildSpaceTableRows(input, estimateId, allBuckets, total)
        : allBuckets.map((bucket) => ({
            id: bucket.id,
            label: bucket.label,
            total: bucket.total,
            share: bucket.share,
            rowCount: bucket.rowCount,
            color: bucket.color,
            depth: 0,
            kind: "bucket",
          })),
  };
}

function resolveBucket(input: ProjectChartsAggregationBase, lookups: BucketLookups, row: ProjectChartRowFact) {
  if (input.groupingMode === "space") {
    return resolveSpaceBucket(lookups.nodeById, row);
  }

  if (input.groupingMode === "category") {
    return resolveCategoryBucket(lookups.categoryById, row);
  }

  return resolveSupplierBucket(lookups.supplierById, row);
}

function resolveSpaceBucket(nodeById: Map<string, ProjectChartNodeFact>, row: ProjectChartRowFact) {
  let current = row.nodeId ? nodeById.get(row.nodeId) : undefined;
  let highestArea: ProjectChartNodeFact | undefined;

  while (current) {
    if (current.kind === "Area") {
      highestArea = current;
    }

    if (!current.parentId) {
      break;
    }

    current = nodeById.get(current.parentId);
  }

  const label = highestArea?.name ?? "Unassigned space";

  return {
    id: highestArea ? normalizeBucketId("space", label) : "unassigned-space",
    label,
  };
}

function buildSpaceTableRows(
  input: ProjectChartsAggregationBase,
  estimateId: string,
  buckets: ProjectChartBucket[],
  seriesTotal: number,
): ProjectChartTableRow[] {
  const estimateNodes = input.nodes.filter((node) => node.estimateId === estimateId);
  const nodeById = new Map(estimateNodes.map((node) => [node.id, node]));
  const childrenByParentId = new Map<string, ProjectChartNodeFact[]>();
  const areaTotals = new Map<string, SpaceNodeAccumulator>();
  const groupTotals = new Map<string, SpaceNodeAccumulator>();
  const bucketById = new Map(buckets.map((bucket) => [bucket.id, bucket]));

  for (const node of estimateNodes) {
    const parentKey = node.parentId ?? "__root__";
    const siblings = childrenByParentId.get(parentKey) ?? [];
    siblings.push(node);
    childrenByParentId.set(parentKey, siblings);
  }

  for (const siblings of childrenByParentId.values()) {
    siblings.sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name));
  }

  for (const row of input.rows) {
    if (row.estimateId !== estimateId) continue;

    const areaNode = resolveSpaceAreaNode(nodeById, row);
    if (!areaNode) continue;

    const total = calculateProjectChartRowTotal(row);
    const areaAccumulator = areaTotals.get(areaNode.id) ?? { node: areaNode, total: 0, rowCount: 0 };
    areaAccumulator.total += total;
    areaAccumulator.rowCount += 1;
    areaTotals.set(areaNode.id, areaAccumulator);

    let current = areaNode.parentId ? nodeById.get(areaNode.parentId) : undefined;
    while (current) {
      if (current.kind === "Group") {
        const groupAccumulator = groupTotals.get(current.id) ?? { node: current, total: 0, rowCount: 0 };
        groupAccumulator.total += total;
        groupAccumulator.rowCount += 1;
        groupTotals.set(current.id, groupAccumulator);
      }

      current = current.parentId ? nodeById.get(current.parentId) : undefined;
    }
  }

  function walk(parentId: string | null, depth: number): ProjectChartTableRow[] {
    const rows: ProjectChartTableRow[] = [];
    const children = childrenByParentId.get(parentId ?? "__root__") ?? [];

    for (const child of children) {
      if (child.kind === "Group") {
        const accumulator = groupTotals.get(child.id);
        const nestedRows = walk(child.id, depth + 1);
        if (!accumulator && nestedRows.length === 0) continue;

        rows.push({
          id: `group:${child.id}`,
          label: child.name,
          total: accumulator?.total ?? nestedRows.reduce((sum, row) => sum + (row.kind === "area" ? row.total : 0), 0),
          share: getShare(accumulator?.total ?? 0, seriesTotal),
          rowCount: accumulator?.rowCount ?? 0,
          color: null,
          depth,
          kind: "group",
        });
        rows.push(...nestedRows);
        continue;
      }

      const accumulator = areaTotals.get(child.id);
      if (!accumulator) continue;

      const spaceBucketId = normalizeBucketId("space", child.name);
      const bucket = bucketById.get(spaceBucketId);
      rows.push({
        id: `area:${child.id}`,
        label: child.name,
        total: accumulator.total,
        share: getShare(accumulator.total, seriesTotal),
        rowCount: accumulator.rowCount,
        color: bucket?.color ?? colorForBucket(spaceBucketId),
        depth,
        kind: "area",
      });
    }

    return rows;
  }

  const rows = walk(null, 0);
  if (rows.length > 0) return rows;

  return buckets.map((bucket) => ({
    id: bucket.id,
    label: bucket.label,
    total: bucket.total,
    share: bucket.share,
    rowCount: bucket.rowCount,
    color: bucket.color,
    depth: 0,
    kind: "area",
  }));
}

function resolveSpaceAreaNode(
  nodeById: Map<string, ProjectChartNodeFact>,
  row: ProjectChartRowFact,
): ProjectChartNodeFact | undefined {
  let current = row.nodeId ? nodeById.get(row.nodeId) : undefined;
  let highestArea: ProjectChartNodeFact | undefined;

  while (current) {
    if (current.kind === "Area") {
      highestArea = current;
    }

    if (!current.parentId) {
      break;
    }

    current = nodeById.get(current.parentId);
  }

  return highestArea;
}

function resolveCategoryBucket(nodeById: Map<string, ProjectChartCategoryNodeFact>, row: ProjectChartRowFact) {
  let current = row.categoryNodeId ? nodeById.get(row.categoryNodeId) : undefined;
  let topCategory: ProjectChartCategoryNodeFact | undefined;

  while (current) {
    if (current.nodeType === "category") {
      topCategory = current;
    }

    if (!current.parentId) {
      break;
    }

    current = nodeById.get(current.parentId);
  }

  return {
    id: topCategory?.id ?? "uncategorized",
    label: topCategory?.label ?? "Uncategorized",
  };
}

function resolveSupplierBucket(supplierById: Map<string, ProjectChartSupplierFact>, row: ProjectChartRowFact) {
  const supplier =
    (row.supplierId ? supplierById.get(row.supplierId) : undefined) ??
    (row.sourceSupplierId ? supplierById.get(row.sourceSupplierId) : undefined);
  const label = supplier?.name ?? row.supplierName ?? row.sourceSupplierName ?? "No supplier";
  const id = supplier?.id ?? row.supplierId ?? row.sourceSupplierId ?? normalizeBucketId("supplier", label);

  return { id, label };
}

function buildComparisonRows(
  leftBuckets: ProjectChartBucket[],
  rightBuckets: ProjectChartBucket[],
): ProjectChartComparisonRow[] {
  const bucketIds = new Set([...leftBuckets.map((bucket) => bucket.id), ...rightBuckets.map((bucket) => bucket.id)]);
  const leftById = new Map(leftBuckets.map((bucket) => [bucket.id, bucket]));
  const rightById = new Map(rightBuckets.map((bucket) => [bucket.id, bucket]));

  return [...bucketIds]
    .map((id) => {
      const left = leftById.get(id);
      const right = rightById.get(id);
      const leftTotal = left?.total ?? 0;
      const rightTotal = right?.total ?? 0;
      const delta = rightTotal - leftTotal;

      return {
        id,
        label: left?.label ?? right?.label ?? "Unknown",
        leftTotal,
        rightTotal,
        leftShare: left?.share ?? 0,
        rightShare: right?.share ?? 0,
        delta,
        deltaPercent: leftTotal === 0 ? (rightTotal === 0 ? 0 : null) : delta / leftTotal,
      };
    })
    .sort((left, right) => Math.abs(right.delta) - Math.abs(left.delta) || left.label.localeCompare(right.label));
}

/** Public top-N + "Other" collapse, used client-side for the donut share view. */
export function collapseProjectChartBuckets(
  buckets: ProjectChartBucket[],
  topBucketLimit = 8,
): ProjectChartBucket[] {
  return collapseTopBuckets(buckets, topBucketLimit);
}

function collapseTopBuckets(buckets: ProjectChartBucket[], topBucketLimit: number): ProjectChartBucket[] {
  if (buckets.length <= topBucketLimit) {
    return buckets;
  }

  const visible = buckets.slice(0, topBucketLimit);
  const hidden = buckets.slice(topBucketLimit);
  const otherTotal = hidden.reduce((sum, bucket) => sum + bucket.total, 0);
  const otherRows = hidden.reduce((sum, bucket) => sum + bucket.rowCount, 0);
  const seriesTotal = buckets.reduce((sum, bucket) => sum + bucket.total, 0);

  return [
    ...visible,
    {
      id: OTHER_BUCKET_ID,
      label: "Other",
      total: otherTotal,
      share: seriesTotal > 0 ? otherTotal / seriesTotal : 0,
      rowCount: otherRows,
      color: colorForBucket(OTHER_BUCKET_ID),
      isOther: true,
    },
  ];
}

function toBucket(bucket: BucketAccumulator, share: number): ProjectChartBucket {
  return {
    ...bucket,
    share,
    // Stable, CVD-safe color keyed by bucket id — the same category is the same
    // color in every estimate column (`03` UX-7, `06` A11Y-6). Replaces the old
    // per-series rank-index color that lied across columns.
    color: colorForBucket(bucket.id),
  };
}

function getBucketShare(total: number, buckets: Map<string, BucketAccumulator>): number {
  const seriesTotal = [...buckets.values()].reduce((sum, bucket) => sum + bucket.total, 0);
  return getShare(total, seriesTotal);
}

function getShare(total: number, seriesTotal: number): number {
  return seriesTotal > 0 ? total / seriesTotal : 0;
}

function toFiniteNumber(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

function normalizeBucketId(prefix: string, label: string): string {
  return `${prefix}:${label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") || "none"}`;
}
