export type ProjectChartGroupingMode = "space" | "category" | "supplier";

export type ProjectChartEstimateOption = {
  id: string;
  name: string;
  sheetCode: string | null;
  currencyCode: string | null;
  updatedAt: string | null;
  rowCount: number;
  totalCost: number;
};

export type ProjectChartRowFact = {
  id: string;
  estimateId: string;
  nodeId: string | null;
  categoryNodeId: string | null;
  supplierId: string | null;
  supplierName: string | null;
  sourceSupplierId: string | null;
  sourceSupplierName: string | null;
  quantity: number;
  unitCost: number;
  contingencyPercentage?: number;
  miscCost: number;
};

export type ProjectChartNodeFact = {
  id: string;
  estimateId: string;
  parentId: string | null;
  kind: "Area" | "Group";
  name: string;
  sortOrder: number;
};

export type ProjectChartCategoryNodeFact = {
  id: string;
  parentId: string | null;
  nodeType: string | null;
  label: string;
  sortOrder: number;
};

export type ProjectChartSupplierFact = {
  id: string;
  name: string;
  normalizedName: string | null;
  sortOrder: number;
};

export type ProjectChartsDataLoadMode = "all-estimates" | "selected-pair";

/** Pre-aggregated buckets for one estimate in one grouping mode. */
export type ProjectChartModeSeries = {
  total: number;
  allBuckets: ProjectChartBucket[];
};

/** Pre-aggregated buckets for one estimate across all grouping modes. */
export type ProjectChartEstimateSeries = Record<ProjectChartGroupingMode, ProjectChartModeSeries>;

/**
 * The charts data contract. Aggregation now runs server-side (`02` DB-4 /
 * `01` PERF-2): the repository ships pre-bucketed series per loaded estimate, NOT
 * the raw `estimate_row_items` / `estimate_nodes` / `component_category_nodes` /
 * `component_suppliers` facts. This closes the data-minimization finding
 * (`05` SEC-1 / M5) — qty / unit cost / supplier ids never cross the wire — and
 * collapses the payload from ~MB of rows to ~KB of buckets.
 */
export type ProjectChartsData = {
  projectId: string;
  projectName: string;
  estimateOptions: ProjectChartEstimateOption[];
  /** Pre-aggregated buckets, keyed by the estimates that were loaded. */
  seriesByEstimateId: Record<string, ProjectChartEstimateSeries>;
  loadMode: ProjectChartsDataLoadMode;
  requiresSelectedPair: boolean;
  /** True when row/node loads were truncated → totals may be incomplete. */
  didTruncate: boolean;
  rowLimit: number;
  estimateLimit: number;
};

export type ProjectChartBucket = {
  id: string;
  label: string;
  total: number;
  share: number;
  rowCount: number;
  color: string;
  isOther?: boolean;
  sourceNodeId?: string | null;
};

export type ProjectChartTableRow = {
  id: string;
  label: string;
  total: number;
  share: number;
  rowCount: number;
  color: string | null;
  depth: number;
  kind: "bucket" | "group" | "area";
};

export type ProjectChartComparisonRow = {
  id: string;
  label: string;
  leftTotal: number;
  rightTotal: number;
  leftShare: number;
  rightShare: number;
  delta: number;
  deltaPercent: number | null;
};

export type ProjectChartSeries = {
  estimateId: string;
  estimateName: string;
  total: number;
  buckets: ProjectChartBucket[];
  allBuckets: ProjectChartBucket[];
  tableRows: ProjectChartTableRow[];
};

export type ProjectChartComparison = {
  groupingMode: ProjectChartGroupingMode;
  left: ProjectChartSeries;
  right: ProjectChartSeries;
  rows: ProjectChartComparisonRow[];
  currencyCode: string;
};
