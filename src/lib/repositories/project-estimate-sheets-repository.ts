import { createSupabaseServerClient } from "@/lib/supabase/server";
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

function normalizeProjectEstimateSheetLimit(limit: number | undefined): number | null {
  if (typeof limit !== "number" || !Number.isFinite(limit)) return null;
  const normalized = Math.trunc(limit);
  return normalized > 0 ? normalized : null;
}

export async function listProjectEstimateSheetsForProject(
  projectId: string,
  options: ListProjectEstimateSheetsForProjectOptions = {},
): Promise<ProjectEstimateSheetSummary[]> {
  const supabase = await createSupabaseServerClient();
  const safeLimit = normalizeProjectEstimateSheetLimit(options.limit);
  const query = supabase
    .from("estimates")
    .select("id, name, sheet_code, updated_at")
    .eq("project_id", projectId)
    .order("sheet_code", { ascending: true });
  const { data, error } = await (safeLimit ? query.limit(safeLimit) : query);

  if (error) throw error;

  return (data ?? []).map((estimate) => ({
    id: estimate.id,
    name: estimate.name,
    sheetCode: estimate.sheet_code ?? null,
    updatedAt: estimate.updated_at ?? null,
  }));
}

export async function countProjectEstimateSheetsForProject(projectId: string): Promise<number> {
  const supabase = await createSupabaseServerClient();
  const { count, error } = await supabase
    .from("estimates")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);

  if (error) throw error;
  return count ?? 0;
}

export async function listRecentProjectEstimateSheets(
  projectId: string,
  limit = RECENT_ESTIMATE_SHEET_DEFAULT_LIMIT,
): Promise<ProjectRecentEstimateSheetSummary[]> {
  const safeLimit = Math.min(
    RECENT_ESTIMATE_SHEET_MAX_LIMIT,
    Math.max(1, Number.isFinite(limit) ? Math.trunc(limit) : RECENT_ESTIMATE_SHEET_DEFAULT_LIMIT),
  );
  const supabase = await createSupabaseServerClient();
  const { data: estimates, error } = await supabase
    .from("estimates")
    .select("id, project_id, name, sheet_code, project_budget, updated_at")
    .eq("project_id", projectId)
    .order("updated_at", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false })
    .limit(safeLimit);

  if (error) throw error;

  const estimateRows = estimates ?? [];
  const estimateIds = estimateRows.map((estimate) => estimate.id);
  if (estimateIds.length === 0) return [];

  const [nodesResult, summariesResult] = await Promise.all([
    supabase
      .from("estimate_nodes")
      .select("id, estimate_id, kind, parent_id")
      .in("estimate_id", estimateIds)
      .order("sort_order", { ascending: true }),
    supabase.rpc("project_estimate_list_summaries_for_estimates", {
      target_project_id: projectId,
      target_estimate_ids: estimateIds,
    }),
  ]);

  if (nodesResult.error) throw nodesResult.error;
  if (summariesResult.error) throw summariesResult.error;

  const firstNodeIds = selectFirstEstimateNodeIds((nodesResult.data ?? []) as EstimateFirstNodeSourceRow[]);
  const totalCostByEstimateId = new Map(
    (summariesResult.data ?? []).map((summary) => [summary.estimate_id, Number(summary.total_cost ?? 0)]),
  );

  return estimateRows.map((estimate) => ({
    id: estimate.id,
    projectId: estimate.project_id,
    name: estimate.name,
    sheetCode: estimate.sheet_code ?? null,
    updatedAt: estimate.updated_at ?? null,
    firstNodeId: firstNodeIds.get(estimate.id) ?? null,
    totalCost: totalCostByEstimateId.get(estimate.id) ?? 0,
    projectBudget: estimate.project_budget ?? null,
  }));
}
