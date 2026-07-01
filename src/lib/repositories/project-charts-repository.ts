import { getCloudflareD1Database, type D1DatabaseLike, type D1Value } from "@/lib/cloudflare/d1";
import { computeEstimateRowLineTotal } from "@/lib/estimates/estimate-row-total";

import { buildSeriesByEstimate } from "../project-charts/project-comparison-view";
import { getCurrentWorkspaceProject } from "./workspace-repository";
import type {
  ProjectChartCategoryNodeFact,
  ProjectChartEstimateOption,
  ProjectChartNodeFact,
  ProjectChartRowFact,
  ProjectChartSupplierFact,
  ProjectChartsData,
} from "../project-charts/types";

const ESTIMATE_CHART_LIMIT = 20;
const ESTIMATE_OPTION_LIMIT = 100;
const ESTIMATE_ROW_LIMIT = 5000;
const ESTIMATE_NODE_LIMIT = 1500;
const CATEGORY_FACT_LIMIT = 1000;
const SUPPLIER_FACT_LIMIT = 1000;
const SELECTED_ESTIMATE_LOAD_LIMIT = 3;

type GetProjectChartsDataOptions = {
  selectedEstimateIds?: string[];
};

type JsonRecord = Record<string, unknown>;
type EstimateChartD1Row = {
  id: string;
  name: string;
  sheet_code: string | null;
  updated_at: string | null;
};
type EstimateRowItemChartRow = {
  adjustment_percentage: number | null;
  contingency_percentage: number | null;
  estimate_id: string;
  id: string;
  misc_cost: number | null;
  node_id: string | null;
  quantity: number | null;
  quantity_base: number | null;
  quantity_contingency_amount: number | null;
  source_snapshot_json: string | null;
  unit_cost: number | null;
};
type EstimateNodeChartRow = {
  estimate_id: string;
  id: string;
  kind: string | null;
  name: string | null;
  parent_id: string | null;
  sort_order: number | null;
};
type ComponentCategoryNodeD1Row = {
  id: string;
  label: string | null;
  node_type: string | null;
  parent_id: string | null;
  sort_order: number | null;
};
type ComponentSupplierD1Row = {
  id: string;
  name: string | null;
  normalized_name: string | null;
  sort_order: number | null;
};
type LimitedLoadResult<T> = {
  rows: T[];
  didHitLimit: boolean;
};

export async function getProjectChartsData(
  projectId: string,
  options: GetProjectChartsDataOptions = {},
): Promise<ProjectChartsData | null> {
  const { workspace, project } = await getCurrentWorkspaceProject(projectId);

  if (!project) {
    return null;
  }

  const database = await requireProjectChartsD1Database();
  const estimateRows = await all<EstimateChartD1Row>(
    database,
    `SELECT id, name, sheet_code, updated_at
     FROM estimates
     WHERE project_id = ?
     ORDER BY updated_at DESC, id DESC
     LIMIT ?`,
    [project.id, ESTIMATE_OPTION_LIMIT + 1],
  );
  const projectCurrencyCode = readString((project as { currency_code?: unknown }).currency_code) ?? "USD";

  const didHitEstimateOptionLimit = estimateRows.length > ESTIMATE_OPTION_LIMIT;
  const estimates = estimateRows.slice(0, ESTIMATE_OPTION_LIMIT).map((estimate) => ({
    id: estimate.id,
    name: estimate.name,
    sheetCode: estimate.sheet_code,
    currencyCode: projectCurrencyCode,
    updatedAt: estimate.updated_at,
    rowCount: 0,
    totalCost: 0,
  })) satisfies ProjectChartEstimateOption[];

  if (estimates.length === 0) {
    return emptyProjectChartsData(project.id, project.name, estimates);
  }

  const selectedIds = normalizeSelectedEstimateIds(
    options.selectedEstimateIds ?? [],
    estimates.map((estimate) => estimate.id),
  );
  const loadMode = estimates.length > ESTIMATE_CHART_LIMIT || didHitEstimateOptionLimit ? "selected-pair" : "all-estimates";
  const defaultEstimateIds = estimates.slice(0, 2).map((estimate) => estimate.id);
  const estimateIdsToLoad =
    loadMode === "selected-pair"
      ? selectedIds.length > 0
        ? selectedIds.slice(0, SELECTED_ESTIMATE_LOAD_LIMIT)
        : defaultEstimateIds
      : estimates.map((estimate) => estimate.id);

  const [rowFactsResult, nodeFactsResult, categoryNodeFactsResult, supplierFactsResult] = await Promise.all([
    loadRowFacts(database, estimateIdsToLoad),
    loadNodeFacts(database, estimateIdsToLoad),
    loadCategoryFacts(database),
    loadSupplierFacts(database, workspace.id),
  ]);
  const rowFacts = rowFactsResult.rows;
  const nodeFacts = nodeFactsResult.rows;
  const categoryNodeFacts = categoryNodeFactsResult.rows;
  const supplierFacts = supplierFactsResult.rows;
  const didHitRowLimit = rowFactsResult.didHitLimit;
  const didHitNodeLimit = nodeFactsResult.didHitLimit;

  const estimateOptions = estimates.map((estimate) => {
    const estimateRowsForOption = rowFacts.filter((row) => row.estimateId === estimate.id);
    return {
      ...estimate,
      rowCount: estimateRowsForOption.length,
      totalCost: estimateRowsForOption.reduce((sum, row) => {
        return sum + computeEstimateRowLineTotal({
          quantity: row.quantity,
          quantity_base: row.quantityBase,
          quantity_contingency_amount: row.quantityContingencyAmount,
          unit_cost: row.unitCost,
          contingency_percentage: row.contingencyPercentage,
          adjustment_percentage: row.adjustmentPercentage,
          misc_cost: row.miscCost,
        });
      }, 0),
    };
  });

  // Aggregate server-side and ship only pre-bucketed series (`02` DB-4 / `01`
  // PERF-2). The raw rowFacts / nodeFacts / categoryNodeFacts / supplierFacts stay
  // on the server — qty, unit cost, contingency, and supplier ids never cross the
  // wire (`05` SEC-1). This is the repository-reduce form of PERF-2; an equivalent
  // `get_project_chart_buckets` RPC is provided as a ready migration for a future
  // push-down, proven against this same JS reduce by the golden-master oracle.
  const seriesByEstimateId = buildSeriesByEstimate(
    {
      estimates: estimateOptions,
      rows: rowFacts,
      nodes: nodeFacts,
      categoryNodes: categoryNodeFacts,
      suppliers: supplierFacts,
    },
    estimateIdsToLoad,
  );

  const didTruncate =
    didHitRowLimit
    || didHitNodeLimit
    || categoryNodeFactsResult.didHitLimit
    || supplierFactsResult.didHitLimit;

  return {
    projectId: project.id,
    projectName: project.name,
    estimateOptions,
    seriesByEstimateId,
    loadMode,
    requiresSelectedPair:
      loadMode === "selected-pair"
      || didHitEstimateOptionLimit
      || didTruncate,
    didTruncate,
    rowLimit: ESTIMATE_ROW_LIMIT,
    estimateLimit: ESTIMATE_CHART_LIMIT,
  };
}

function emptyProjectChartsData(
  projectId: string,
  projectName: string,
  estimateOptions: ProjectChartEstimateOption[],
): ProjectChartsData {
  return {
    projectId,
    projectName,
    estimateOptions,
    seriesByEstimateId: {},
    loadMode: "all-estimates",
    requiresSelectedPair: false,
    didTruncate: false,
    rowLimit: ESTIMATE_ROW_LIMIT,
    estimateLimit: ESTIMATE_CHART_LIMIT,
  };
}

async function loadRowFacts(
  database: D1DatabaseLike,
  estimateIds: string[],
): Promise<LimitedLoadResult<ProjectChartRowFact>> {
  if (estimateIds.length === 0) return { didHitLimit: false, rows: [] };
  const where = inList(estimateIds);
  const data = await all<EstimateRowItemChartRow>(
    database,
    `SELECT
       id,
       estimate_id,
       node_id,
       source_snapshot_json,
       quantity,
       quantity_base,
       quantity_contingency_amount,
       unit_cost,
       contingency_percentage,
       adjustment_percentage,
       misc_cost
     FROM estimate_row_items
     WHERE estimate_id IN (${where.sql})
     ORDER BY id ASC
     LIMIT ?`,
    [...where.values, ESTIMATE_ROW_LIMIT + 1],
  );

  const limitedRows = limitLoadedRows(data, ESTIMATE_ROW_LIMIT);
  return {
    didHitLimit: limitedRows.didHitLimit,
    rows: limitedRows.rows.map((row) => {
      const sourceSnapshot = readJsonRecord(row.source_snapshot_json);
      const supplierId = readString(sourceSnapshot.supplierId);
      return {
        id: row.id,
        estimateId: row.estimate_id,
        nodeId: row.node_id,
        categoryNodeId: readString(sourceSnapshot.categoryNodeId),
        supplierId,
        supplierName: readString(sourceSnapshot.supplier),
        sourceSupplierId: supplierId,
        sourceSupplierName: readString(sourceSnapshot.supplier),
        quantity: finite(Number(row.quantity)),
        quantityBase: row.quantity_base === null ? null : finite(Number(row.quantity_base)),
        quantityContingencyAmount: row.quantity_base === null ? null : finite(Number(row.quantity_contingency_amount ?? 0)),
        unitCost: finite(Number(row.unit_cost)),
        contingencyPercentage: finite(Number(row.contingency_percentage ?? 0)),
        adjustmentPercentage: finite(Number(row.adjustment_percentage ?? 0)),
        miscCost: finite(Number(row.misc_cost)),
      };
    }),
  };
}

async function loadNodeFacts(
  database: D1DatabaseLike,
  estimateIds: string[],
): Promise<LimitedLoadResult<ProjectChartNodeFact>> {
  if (estimateIds.length === 0) return { didHitLimit: false, rows: [] };
  const where = inList(estimateIds);
  const data = await all<EstimateNodeChartRow>(
    database,
    `SELECT id, estimate_id, parent_id, kind, name, sort_order
     FROM estimate_nodes
     WHERE estimate_id IN (${where.sql})
     ORDER BY sort_order ASC, id ASC
     LIMIT ?`,
    [...where.values, ESTIMATE_NODE_LIMIT + 1],
  );

  const limitedRows = limitLoadedRows(data, ESTIMATE_NODE_LIMIT);
  return {
    didHitLimit: limitedRows.didHitLimit,
    rows: limitedRows.rows.map((node) => ({
      id: node.id,
      estimateId: node.estimate_id,
      parentId: node.parent_id,
      kind: node.kind === "area" ? "Area" : "Group",
      name: node.name ?? "",
      sortOrder: node.sort_order ?? 0,
    })),
  };
}

async function loadCategoryFacts(
  database: D1DatabaseLike,
): Promise<LimitedLoadResult<ProjectChartCategoryNodeFact>> {
  // `component_category_nodes` is a GLOBAL taxonomy by design — it has no
  // workspace_id column and a `using(true)` read policy (`02` DB-1). The absence
  // of a workspace filter here is intentional, NOT a leak: buckets key on the
  // global category id, so two workspaces using the same category share a bucket.
  // Do not "fix" this into a workspace filter unless the taxonomy becomes scoped.
  const data = await allOptional<ComponentCategoryNodeD1Row>(
    database,
    `SELECT id, parent_id, node_type, label, sort_order
     FROM component_category_nodes
     ORDER BY sort_order ASC, id ASC
     LIMIT ?`,
    [CATEGORY_FACT_LIMIT + 1],
  );

  const limitedRows = limitLoadedRows(data, CATEGORY_FACT_LIMIT);
  return {
    didHitLimit: limitedRows.didHitLimit,
    rows: limitedRows.rows.map((node) => ({
      id: node.id,
      parentId: node.parent_id,
      nodeType: node.node_type,
      label: node.label ?? "Uncategorized",
      sortOrder: node.sort_order ?? 0,
    })),
  };
}

async function loadSupplierFacts(
  database: D1DatabaseLike,
  workspaceId: string,
): Promise<LimitedLoadResult<ProjectChartSupplierFact>> {
  const data = await allOptional<ComponentSupplierD1Row>(
    database,
    `SELECT id, name, normalized_name, sort_order
     FROM component_suppliers
     WHERE workspace_id = ?
     ORDER BY sort_order ASC, id ASC
     LIMIT ?`,
    [workspaceId, SUPPLIER_FACT_LIMIT + 1],
  );

  const limitedRows = limitLoadedRows(data, SUPPLIER_FACT_LIMIT);
  return {
    didHitLimit: limitedRows.didHitLimit,
    rows: limitedRows.rows.map((supplier) => ({
      id: supplier.id,
      name: supplier.name ?? "Unknown supplier",
      normalizedName: supplier.normalized_name,
      sortOrder: supplier.sort_order ?? 0,
    })),
  };
}

function normalizeSelectedEstimateIds(selectedEstimateIds: string[], allowedEstimateIds: string[]): string[] {
  const allowed = new Set(allowedEstimateIds);
  return [...new Set(selectedEstimateIds)].filter((id) => allowed.has(id));
}

function limitLoadedRows<T>(rows: T[], limit: number): LimitedLoadResult<T> {
  return {
    didHitLimit: rows.length > limit,
    rows: rows.slice(0, limit),
  };
}

function readJsonRecord(value: unknown): JsonRecord {
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return readJsonRecord(parsed);
    } catch {
      return {};
    }
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as JsonRecord;
  }

  return {};
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function finite(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

async function requireProjectChartsD1Database() {
  const database = await getCloudflareD1Database();
  if (!database) {
    throw new Error("Cloudflare D1 ARCH_DB binding is required for project charts.");
  }
  return database;
}

async function all<T>(database: D1DatabaseLike, sql: string, values: D1Value[] = []) {
  const result = await database.prepare<T>(sql).bind(...values).all<T>();
  if (result.success === false) throw new Error("Cloudflare D1 project chart read failed.");
  return result.results ?? [];
}

async function allOptional<T>(database: D1DatabaseLike, sql: string, values: D1Value[] = []) {
  try {
    return await all<T>(database, sql, values);
  } catch (error) {
    if (isMissingOptionalD1Table(error)) return [];
    throw error;
  }
}

function inList(values: string[]) {
  return {
    sql: values.map(() => "?").join(", "),
    values: values as D1Value[],
  };
}

function isMissingOptionalD1Table(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error && typeof error.code === "string" ? error.code : "";
  const message = "message" in error && typeof error.message === "string" ? error.message.toLowerCase() : "";
  return code === "42P01" || message.includes("no such table") || message.includes("does not exist");
}
