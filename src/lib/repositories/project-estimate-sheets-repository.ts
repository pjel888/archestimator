import { getCloudflareD1Database, type D1DatabaseLike, type D1Value } from "@/lib/cloudflare/d1";
import { computeEstimateRowLineTotal } from "@/lib/estimates/estimate-row-total";
import { selectFirstEstimateNodeIds, type EstimateFirstNodeSourceRow } from "@/lib/estimates/tree-hierarchy";

export type ProjectEstimateSheetSummary = {
  id: string;
  name: string;
  sheetCode: string | null;
  updatedAt: string | null;
};

export type ProjectRecentEstimateSheetSummary = {
  id: string;
  projectId: string;
  name: string;
  sheetCode: string | null;
  updatedAt: string | null;
  firstNodeId: string | null;
  totalCost: number;
  projectBudget: number | null;
};

const RECENT_ESTIMATE_SHEET_DEFAULT_LIMIT = 5;
const RECENT_ESTIMATE_SHEET_MAX_LIMIT = 10;

type ListProjectEstimateSheetsForProjectOptions = {
  limit?: number;
};

type ProjectEstimateSheetD1Row = {
  id: string;
  name: string;
  sheet_code: string | null;
  updated_at: string | null;
};

type RecentProjectEstimateSheetD1Row = ProjectEstimateSheetD1Row & {
  project_id: string;
  project_budget: number | string | null;
};

type EstimateRowCostD1Row = {
  estimate_id: string;
  quantity: number | string | null;
  quantity_base: number | string | null;
  quantity_contingency_amount: number | string | null;
  unit_cost: number | string | null;
  contingency_percentage: number | string | null;
  adjustment_percentage: number | string | null;
  misc_cost: number | string | null;
};

function normalizeProjectEstimateSheetLimit(limit: number | undefined): number | null {
  if (typeof limit !== "number" || !Number.isFinite(limit)) return null;
  const normalized = Math.trunc(limit);
  return normalized > 0 ? normalized : null;
}

async function requireProjectEstimateSheetsD1Database(): Promise<D1DatabaseLike> {
  const db = await getCloudflareD1Database();
  if (!db) throw new Error("Cloudflare D1 binding ARCH_DB is unavailable for project estimate sheets.");
  return db;
}

function estimateIdPlaceholders(estimateIds: readonly string[]) {
  if (estimateIds.length === 0) throw new Error("Cannot create estimate-id placeholder list for an empty selection.");
  return estimateIds.map(() => "?").join(", ");
}

function normalizeNullableNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

export async function listProjectEstimateSheetsForProject(
  projectId: string,
  options: ListProjectEstimateSheetsForProjectOptions = {},
): Promise<ProjectEstimateSheetSummary[]> {
  const db = await requireProjectEstimateSheetsD1Database();
  const safeLimit = normalizeProjectEstimateSheetLimit(options.limit);
  const values: D1Value[] = [projectId];
  let sql = `
    SELECT id, name, sheet_code, updated_at
    FROM estimates
    WHERE project_id = ?
    ORDER BY sheet_code ASC, id ASC
  `;
  if (safeLimit) {
    sql += " LIMIT ?";
    values.push(safeLimit);
  }

  const { results = [] } = await db.prepare<ProjectEstimateSheetD1Row>(sql).bind(...values).all<ProjectEstimateSheetD1Row>();

  return results.map((estimate) => ({
    id: estimate.id,
    name: estimate.name,
    sheetCode: estimate.sheet_code ?? null,
    updatedAt: estimate.updated_at ?? null,
  }));
}

export async function countProjectEstimateSheetsForProject(projectId: string): Promise<number> {
  const db = await requireProjectEstimateSheetsD1Database();
  const row = await db
    .prepare<{ count: number | string | null }>("SELECT COUNT(*) AS count FROM estimates WHERE project_id = ?")
    .bind(projectId)
    .first<{ count: number | string | null }>();

  return Number(row?.count ?? 0);
}

export async function listRecentProjectEstimateSheets(
  projectId: string,
  limit = RECENT_ESTIMATE_SHEET_DEFAULT_LIMIT,
): Promise<ProjectRecentEstimateSheetSummary[]> {
  const safeLimit = Math.min(
    RECENT_ESTIMATE_SHEET_MAX_LIMIT,
    Math.max(1, Number.isFinite(limit) ? Math.trunc(limit) : RECENT_ESTIMATE_SHEET_DEFAULT_LIMIT),
  );
  const db = await requireProjectEstimateSheetsD1Database();
  const { results: estimateRows = [] } = await db
    .prepare<RecentProjectEstimateSheetD1Row>(`
      SELECT id, project_id, name, sheet_code, project_budget, updated_at
      FROM estimates
      WHERE project_id = ?
      ORDER BY updated_at DESC, id DESC
      LIMIT ?
    `)
    .bind(projectId, safeLimit)
    .all<RecentProjectEstimateSheetD1Row>();

  const estimateIds = estimateRows.map((estimate) => estimate.id);
  if (estimateIds.length === 0) return [];

  const placeholders = estimateIdPlaceholders(estimateIds);
  const estimateIdBinds: D1Value[] = estimateIds;
  const [nodesResult, rowCostsResult] = await Promise.all([
    db
      .prepare<EstimateFirstNodeSourceRow>(`
        SELECT node.id, node.estimate_id, node.kind, node.parent_id
        FROM estimate_nodes node
        INNER JOIN estimates estimate ON estimate.id = node.estimate_id
        WHERE estimate.project_id = ?
          AND node.estimate_id IN (${placeholders})
        ORDER BY node.estimate_id ASC, node.sort_order ASC, node.id ASC
      `)
      .bind(projectId, ...estimateIdBinds)
      .all<EstimateFirstNodeSourceRow>(),
    db
      .prepare<EstimateRowCostD1Row>(`
        SELECT
          row_item.estimate_id,
          row_item.quantity,
          row_item.quantity_base,
          row_item.quantity_contingency_amount,
          row_item.unit_cost,
          row_item.contingency_percentage,
          row_item.adjustment_percentage,
          row_item.misc_cost
        FROM estimate_row_items row_item
        INNER JOIN estimates estimate ON estimate.id = row_item.estimate_id
        WHERE estimate.project_id = ?
          AND row_item.estimate_id IN (${placeholders})
      `)
      .bind(projectId, ...estimateIdBinds)
      .all<EstimateRowCostD1Row>(),
  ]);

  const firstNodeIds = selectFirstEstimateNodeIds(nodesResult.results ?? []);
  const totalCostByEstimateId = new Map<string, number>();
  for (const row of rowCostsResult.results ?? []) {
    totalCostByEstimateId.set(row.estimate_id, (totalCostByEstimateId.get(row.estimate_id) ?? 0) + computeEstimateRowLineTotal(row));
  }

  return estimateRows.map((estimate) => ({
    id: estimate.id,
    projectId: estimate.project_id,
    name: estimate.name,
    sheetCode: estimate.sheet_code ?? null,
    updatedAt: estimate.updated_at ?? null,
    firstNodeId: firstNodeIds.get(estimate.id) ?? null,
    totalCost: totalCostByEstimateId.get(estimate.id) ?? 0,
    projectBudget: normalizeNullableNumber(estimate.project_budget),
  }));
}
