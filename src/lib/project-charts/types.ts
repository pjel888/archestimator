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

export type ProjectChartsData = {
  projectId: string;
  projectName: string;
  estimateOptions: ProjectChartEstimateOption[];
  rowFacts: ProjectChartRowFact[];
  nodeFacts: ProjectChartNodeFact[];
  categoryNodeFacts: ProjectChartCategoryNodeFact[];
  supplierFacts: ProjectChartSupplierFact[];
  loadMode: ProjectChartsDataLoadMode;
  requiresSelectedPair: boolean;
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
