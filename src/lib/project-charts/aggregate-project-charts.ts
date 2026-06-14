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
  sourceNodeId?: string | null;
};

type ResolvedBucket = {
  id: string;
  label: string;
  sourceNodeId?: string | null;
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
      sourceNodeId: bucket.sourceNodeId,
    };

    if (existing.sourceNodeId !== bucket.sourceNodeId) {
      existing.sourceNodeId = null;
    }
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

function resolveBucket(input: ProjectChartsAggregationBase, lookups: BucketLookups, row: ProjectChartRowFact): ResolvedBucket {
  if (input.groupingMode === "space") {
    return resolveSpaceBucket(lookups.nodeById, row);
  }

  if (input.groupingMode === "category") {
    return resolveCategoryBucket(lookups.categoryById, row);
  }

  return resolveSupplierBucket(lookups.supplierById, row);
}

function resolveSpaceBucket(nodeById: Map<string, ProjectChartNodeFact>, row: ProjectChartRowFact): ResolvedBucket {
  // Kind-agnostic OWN-node bucketing: attribute the row to the node that
  // directly owns it, not to the highest "Area" ancestor. On real all-area
  // data (rows live only on area leaves) the owning node IS the highest-area
  // ancestor, so this is a byte-for-byte no-op; it only differs for a row on a
  // non-area (Group) node, which cannot exist in production until a later phase.
  const own = row.nodeId ? nodeById.get(row.nodeId) : undefined;
  return {
    id: own ? normalizeBucketId("space", own.name) : "unassigned-space",
    label: own?.name ?? "Unassigned space",
    sourceNodeId: own?.id ?? null,
  };
}

function buildSpaceTableRows(
  input: ProjectChartsAggregationBase,
  estimateId: string,
  buckets: ProjectChartBucket[],
  seriesTotal: number,
): ProjectChartTableRow[] {
  const estimateNodes = input.nodes.filter((node) => node.estimateId === estimateId);
  const childrenByParentId = new Map<string, ProjectChartNodeFact[]>();
  // OWN totals: only the rows a node directly owns (row.nodeId === node.id).
  const ownTotals = new Map<string, SpaceNodeAccumulator>();
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

  // Kind-agnostic OWN-row attribution: bucket each row onto the node that
  // directly owns it (never the highest-Area ancestor, never skipped when the
  // node exists). A row whose node is missing / null is dropped here exactly as
  // before — it surfaces in the "Unassigned space" donut bucket, not the tree.
  const ownNodeById = new Map(estimateNodes.map((node) => [node.id, node]));
  for (const row of input.rows) {
    if (row.estimateId !== estimateId) continue;

    const ownNode = row.nodeId ? ownNodeById.get(row.nodeId) : undefined;
    if (!ownNode) continue;

    const total = calculateProjectChartRowTotal(row);
    const accumulator = ownTotals.get(ownNode.id) ?? { node: ownNode, total: 0, rowCount: 0 };
    accumulator.total += total;
    accumulator.rowCount += 1;
    ownTotals.set(ownNode.id, accumulator);
  }

  function colorForSpaceNode(name: string): string {
    const spaceBucketId = normalizeBucketId("space", name);
    return bucketById.get(spaceBucketId)?.color ?? colorForBucket(spaceBucketId);
  }

  // Render every node by whether it HAS CHILDREN, not by kind. A node may have
  // BOTH directly-owned rows AND children. Each rendered LEAF line (a childless
  // node, or an explicit "Own items" line) carries real money exactly once; a
  // container ("group") line is a rollup whose total is the sum of its rendered
  // leaf lines — so summing the leaves alone (never the container) reconstructs
  // the container total with no double-count and no drop.
  function walk(parentId: string | null, depth: number): ProjectChartTableRow[] {
    const rows: ProjectChartTableRow[] = [];
    const children = childrenByParentId.get(parentId ?? "__root__") ?? [];

    for (const child of children) {
      const own = ownTotals.get(child.id);
      const hasChildren = (childrenByParentId.get(child.id)?.length ?? 0) > 0;

      if (!hasChildren) {
        // Leaf node: a single line for its directly-owned rows. Skip nodes with
        // no money so empty structural nodes don't litter the table.
        if (!own) continue;
        rows.push({
          id: `area:${child.id}`,
          label: child.name,
          total: own.total,
          share: getShare(own.total, seriesTotal),
          rowCount: own.rowCount,
          color: colorForSpaceNode(child.name),
          depth,
          kind: "area",
        });
        continue;
      }

      // Container node: recurse first so we can roll its descendants up.
      const nestedRows = walk(child.id, depth + 1);

      // Leaf lines rendered directly beneath this container (its own "Own items"
      // line is added below; its child subtrees' leaves are inside nestedRows).
      // We sum ONLY "area" leaf lines — never nested "group" rollup lines — so
      // the container total equals the sum of money-bearing leaves exactly once.
      const ownLeafTotal = own?.total ?? 0;
      const descendantLeafTotal = nestedRows.reduce(
        (sum, row) => sum + (row.kind === "area" ? row.total : 0),
        0,
      );
      const rollupTotal = ownLeafTotal + descendantLeafTotal;
      const rollupRowCount =
        (own?.rowCount ?? 0) + nestedRows.reduce((sum, row) => sum + (row.kind === "area" ? row.rowCount : 0), 0);

      // Drop a structural container that ends up entirely empty (no own rows and
      // no money-bearing descendants) so it doesn't litter the table.
      if (!own && nestedRows.length === 0) continue;

      rows.push({
        id: `group:${child.id}`,
        label: child.name,
        total: rollupTotal,
        share: getShare(rollupTotal, seriesTotal),
        rowCount: rollupRowCount,
        color: null,
        depth,
        kind: "group",
      });

      // A container that ALSO directly owns rows gets an explicit "Own items"
      // leaf so its own money is visible and counted, not merged into a child.
      if (own) {
        rows.push({
          id: `area:${child.id}:own`,
          label: "Own items",
          total: own.total,
          share: getShare(own.total, seriesTotal),
          rowCount: own.rowCount,
          color: colorForSpaceNode(child.name),
          depth: depth + 1,
          kind: "area",
        });
      }

      rows.push(...nestedRows);
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

function resolveCategoryBucket(nodeById: Map<string, ProjectChartCategoryNodeFact>, row: ProjectChartRowFact): ResolvedBucket {
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

function resolveSupplierBucket(supplierById: Map<string, ProjectChartSupplierFact>, row: ProjectChartRowFact): ResolvedBucket {
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
