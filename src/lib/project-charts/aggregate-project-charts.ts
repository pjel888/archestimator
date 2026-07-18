import { OTHER_BUCKET_ID, colorForBucket } from "./bucket-color";
import { computeEstimateRowCostParts } from "@/lib/estimates/estimate-row-total";
import type {
  ProjectChartBucket,
  ProjectChartCostComposition,
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
  supplierById: Map<string, ProjectChartSupplierFact>;
};

function createBucketLookups(input: ProjectChartsAggregationBase): BucketLookups {
  return {
    nodeById: new Map(input.nodes.map((node) => [node.id, node])),
    supplierById: new Map(input.suppliers.map((supplier) => [supplier.id, supplier])),
  };
}

type ProjectChartsAggregationBase = {
  estimates: ProjectChartEstimateOption[];
  rows: ProjectChartRowFact[];
  nodes: ProjectChartNodeFact[];
  /** @deprecated Retained for raw-facts API compatibility; category aggregation ignores it. */
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
  return calculateProjectChartRowCostParts(row).grandTotal;
}

export function buildProjectChartCostComposition(
  rows: ProjectChartRowFact[],
  estimateId: string,
): ProjectChartCostComposition {
  return rows
    .filter((row) => row.estimateId === estimateId)
    .reduce<ProjectChartCostComposition>(
      (totals, row) => {
        const parts = calculateProjectChartRowCostParts(row);
        totals.baseTotal += parts.baseTotal;
        totals.miscTotal += parts.miscTotal;
        totals.adjustmentTotal += parts.adjustmentTotal;
        totals.grandTotal += parts.grandTotal;
        return totals;
      },
      { baseTotal: 0, miscTotal: 0, adjustmentTotal: 0, grandTotal: 0 },
    );
}

function calculateProjectChartRowCostParts(row: ProjectChartRowFact): ProjectChartCostComposition {
  const quantity = toFiniteNumber(row.quantity);
  const unitCost = toFiniteNumber(row.unitCost);
  const miscCost = toFiniteNumber(row.miscCost);
  const legacyAdjustmentPercentage = row.quantityBase === null || row.quantityBase === undefined
    ? toFiniteNumber(row.contingencyPercentage ?? 0)
    : 0;
  const costParts = computeEstimateRowCostParts({
    quantity,
    quantity_base: row.quantityBase,
    quantity_contingency_amount: row.quantityContingencyAmount,
    unit_cost: unitCost,
    adjustment_percentage: toFiniteNumber(row.adjustmentPercentage ?? legacyAdjustmentPercentage),
    misc_cost: miscCost,
    currency_code: "PHP",
  });

  if (!costParts.ok) {
    return { baseTotal: 0, miscTotal: 0, adjustmentTotal: 0, grandTotal: 0 };
  }

  return {
    baseTotal: costParts.value.materialMinorUnits / 100,
    miscTotal: costParts.value.miscMinorUnits / 100,
    adjustmentTotal: costParts.value.adjustmentMinorUnits / 100,
    grandTotal: costParts.value.total,
  };
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
        : input.groupingMode === "category"
          ? buildCategoryTableRows(input.rows, estimateId, total)
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
    return resolveCategoryBucket(row);
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
      // NOTE: this charts "Own items" leaf is money-attribution (a mixed node's
      // own rows must surface exactly once). It is a SEPARATE surface from the
      // EMC visual eyebrow removed in the EMC plan (branch.tsx). Do NOT delete
      // it on an "Own items" grep — project-charts-aggregation.test.ts pins it.
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

type CategoryPathSegment = {
  id: string;
  label: string;
};

type CategoryTreeNode = {
  pathKey: string;
  rootBucketId: string;
  label: string;
  ownTotal: number;
  ownRowCount: number;
  children: Map<string, CategoryTreeNode>;
};

function resolveCategoryBucket(row: ProjectChartRowFact): ResolvedBucket {
  const root = resolveCategoryPath(row)[0] ?? {
    id: legacyCategoryId("Uncategorized"),
    label: "Uncategorized",
  };
  return { id: root.id, label: root.label };
}

function resolveCategoryPath(row: ProjectChartRowFact): CategoryPathSegment[] {
  const labels = normalizeCategoryPathValues(row.categoryPath);
  const ids = normalizeCategoryPathValues(row.categoryPathIds);

  if (labels.length > 0 && labels.length === ids.length) {
    return labels.map((label, index) => ({ id: ids[index] ?? legacyCategoryId(label), label }));
  }

  if (labels.length > 0) {
    const leafId = labels.length === 1 ? normalizeCategoryLabel(row.categoryId) : null;
    if (leafId) return [{ id: leafId, label: labels[0] ?? "Uncategorized" }];
    return labels.map((label) => ({ id: legacyCategoryId(label), label }));
  }

  const capturedLeafLabel = normalizeCategoryLabel(row.category);
  const leafLabel = capturedLeafLabel ?? "Uncategorized";
  const leafId = capturedLeafLabel
    ? normalizeCategoryLabel(row.categoryId) ?? legacyCategoryId(leafLabel)
    : legacyCategoryId(leafLabel);
  return [{ id: leafId, label: leafLabel }];
}

function buildCategoryTableRows(
  rows: ProjectChartRowFact[],
  estimateId: string,
  seriesTotal: number,
): ProjectChartTableRow[] {
  const roots = new Map<string, CategoryTreeNode>();

  for (const row of rows) {
    if (row.estimateId !== estimateId) continue;

    const path = resolveCategoryPath(row);
    const pathIds: string[] = [];
    let siblings = roots;
    let leaf: CategoryTreeNode | null = null;

    for (const segment of path) {
      pathIds.push(segment.id);
      const pathKey = pathIds.join("/");
      const existing = siblings.get(pathKey);
      leaf = existing ?? {
        pathKey,
        rootBucketId: path[0]?.id ?? legacyCategoryId("Uncategorized"),
        label: segment.label,
        ownTotal: 0,
        ownRowCount: 0,
        children: new Map(),
      };
      siblings.set(pathKey, leaf);
      siblings = leaf.children;
    }

    if (leaf) {
      leaf.ownTotal += calculateProjectChartRowTotal(row);
      leaf.ownRowCount += 1;
    }
  }

  function renderNode(node: CategoryTreeNode, depth: number): {
    rows: ProjectChartTableRow[];
    total: number;
    rowCount: number;
  } {
    const renderedChildren = [...node.children.values()]
      .sort((left, right) => left.label.localeCompare(right.label) || left.pathKey.localeCompare(right.pathKey))
      .map((child) => renderNode(child, depth + 1));
    const descendantTotal = renderedChildren.reduce((sum, child) => sum + child.total, 0);
    const descendantRowCount = renderedChildren.reduce((sum, child) => sum + child.rowCount, 0);
    const total = node.ownTotal + descendantTotal;
    const rowCount = node.ownRowCount + descendantRowCount;
    const color = colorForBucket(node.rootBucketId);

    if (renderedChildren.length === 0) {
      return {
        total,
        rowCount,
        rows: [{
          id: `category:${node.pathKey}`,
          label: node.label,
          total,
          share: getShare(total, seriesTotal),
          rowCount,
          color,
          depth,
          kind: "bucket",
        }],
      };
    }

    const tableRows: ProjectChartTableRow[] = [{
      id: `category:${node.pathKey}`,
      label: node.label,
      total,
      share: getShare(total, seriesTotal),
      rowCount,
      color: null,
      depth,
      kind: "group",
    }];

    if (node.ownRowCount > 0) {
      tableRows.push({
        id: `category:${node.pathKey}:own`,
        label: "Own items",
        total: node.ownTotal,
        share: getShare(node.ownTotal, seriesTotal),
        rowCount: node.ownRowCount,
        color,
        depth: depth + 1,
        kind: "bucket",
      });
    }

    for (const child of renderedChildren) {
      tableRows.push(...child.rows);
    }

    return { rows: tableRows, total, rowCount };
  }

  return [...roots.values()]
    .sort((left, right) => left.label.localeCompare(right.label) || left.pathKey.localeCompare(right.pathKey))
    .flatMap((root) => renderNode(root, 0).rows);
}

function normalizeCategoryPathValues(values: string[] | undefined): string[] {
  return Array.isArray(values)
    ? values.map((value) => normalizeCategoryLabel(value)).filter((value): value is string => value !== null)
    : [];
}

function normalizeCategoryLabel(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function legacyCategoryId(label: string): string {
  const normalized = label.trim().toLowerCase().replace(/\s+/g, " ");
  return `legacy:${encodeURIComponent(normalized || "uncategorized")}`;
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
