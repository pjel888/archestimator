import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/types";

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
const ESTIMATE_ROW_LIMIT = 5000;

type GetProjectChartsDataOptions = {
  selectedEstimateIds?: string[];
};

type JsonRecord = Record<string, unknown>;
type EstimateRowItemChartRow = Pick<
  Tables<"estimate_row_items">,
  "id" | "estimate_id" | "node_id" | "source_snapshot" | "supplier" | "quantity" | "unit_cost" | "misc_cost"
>;
type EstimateNodeChartRow = Pick<Tables<"estimate_nodes">, "id" | "estimate_id" | "parent_id" | "kind" | "name" | "sort_order">;

export async function getProjectChartsData(
  projectId: string,
  options: GetProjectChartsDataOptions = {},
): Promise<ProjectChartsData | null> {
  const { workspace, project } = await getCurrentWorkspaceProject(projectId);

  if (!project) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const { data: estimateRows, error: estimateError } = await supabase
    .from("estimates")
    .select("id, name, sheet_code, currency_code, updated_at")
    .eq("project_id", project.id)
    .order("updated_at", { ascending: false });

  if (estimateError) {
    throw new Error(`Failed to load chart estimates: ${estimateError.message}`);
  }

  const estimates = (estimateRows ?? []).map((estimate) => ({
    id: estimate.id,
    name: estimate.name,
    sheetCode: estimate.sheet_code,
    currencyCode: estimate.currency_code,
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
  const loadMode = estimates.length > ESTIMATE_CHART_LIMIT ? "selected-pair" : "all-estimates";
  const estimateIdsToLoad =
    loadMode === "selected-pair" && selectedIds.length > 0 ? selectedIds : estimates.map((estimate) => estimate.id);

  const [rowFacts, nodeFacts, categoryNodeFacts, supplierFacts] = await Promise.all([
    loadRowFacts(supabase, estimateIdsToLoad),
    loadNodeFacts(supabase, estimateIdsToLoad),
    loadCategoryFacts(supabase),
    loadSupplierFacts(supabase, workspace.id),
  ]);

  const estimateOptions = estimates.map((estimate) => {
    const estimateRowsForOption = rowFacts.filter((row) => row.estimateId === estimate.id);
    return {
      ...estimate,
      rowCount: estimateRowsForOption.length,
      totalCost: estimateRowsForOption.reduce(
        (sum, row) => sum + finite(row.quantity) * finite(row.unitCost) + finite(row.miscCost),
        0,
      ),
    };
  });

  return {
    projectId: project.id,
    projectName: project.name,
    estimateOptions,
    rowFacts,
    nodeFacts,
    categoryNodeFacts,
    supplierFacts,
    loadMode,
    requiresSelectedPair: estimates.length > ESTIMATE_CHART_LIMIT || rowFacts.length > ESTIMATE_ROW_LIMIT,
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
    rowFacts: [],
    nodeFacts: [],
    categoryNodeFacts: [],
    supplierFacts: [],
    loadMode: "all-estimates",
    requiresSelectedPair: false,
    rowLimit: ESTIMATE_ROW_LIMIT,
    estimateLimit: ESTIMATE_CHART_LIMIT,
  };
}

async function loadRowFacts(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  estimateIds: string[],
): Promise<ProjectChartRowFact[]> {
  const { data, error } = await supabase
    .from("estimate_row_items")
    .select("id, estimate_id, node_id, supplier, source_snapshot, quantity, unit_cost, misc_cost")
    .in("estimate_id", estimateIds);

  if (error) {
    throw new Error(`Failed to load chart rows: ${error.message}`);
  }

  return ((data ?? []) as EstimateRowItemChartRow[]).map((row) => {
    const sourceSnapshot = readJsonRecord(row.source_snapshot);
    const supplierId = readString(sourceSnapshot.supplierId);
    return {
      id: row.id,
      estimateId: row.estimate_id,
      nodeId: row.node_id,
      categoryNodeId: readString(sourceSnapshot.categoryNodeId),
      supplierId,
      supplierName: row.supplier,
      sourceSupplierId: supplierId,
      sourceSupplierName: readString(sourceSnapshot.supplier),
      quantity: finite(Number(row.quantity)),
      unitCost: finite(Number(row.unit_cost)),
      miscCost: finite(Number(row.misc_cost)),
    };
  });
}

async function loadNodeFacts(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  estimateIds: string[],
): Promise<ProjectChartNodeFact[]> {
  const { data, error } = await supabase
    .from("estimate_nodes")
    .select("id, estimate_id, parent_id, kind, name, sort_order")
    .in("estimate_id", estimateIds)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(`Failed to load chart estimate nodes: ${error.message}`);
  }

  return ((data ?? []) as EstimateNodeChartRow[]).map((node) => ({
    id: node.id,
    estimateId: node.estimate_id,
    parentId: node.parent_id,
    kind: node.kind === "area" ? "Area" : "Group",
    name: node.name,
    sortOrder: node.sort_order ?? 0,
  }));
}

async function loadCategoryFacts(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
): Promise<ProjectChartCategoryNodeFact[]> {
  const { data, error } = await supabase
    .from("component_category_nodes")
    .select("id, parent_id, node_type, label, sort_order")
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(`Failed to load chart categories: ${error.message}`);
  }

  return (data ?? []).map((node) => ({
    id: node.id,
    parentId: node.parent_id,
    nodeType: node.node_type,
    label: node.label,
    sortOrder: node.sort_order ?? 0,
  }));
}

async function loadSupplierFacts(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  workspaceId: string,
): Promise<ProjectChartSupplierFact[]> {
  const { data, error } = await supabase
    .from("component_suppliers")
    .select("id, name, normalized_name, sort_order")
    .eq("workspace_id", workspaceId)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(`Failed to load chart suppliers: ${error.message}`);
  }

  return (data ?? []).map((supplier) => ({
    id: supplier.id,
    name: supplier.name,
    normalizedName: supplier.normalized_name,
    sortOrder: supplier.sort_order ?? 0,
  }));
}

function normalizeSelectedEstimateIds(selectedEstimateIds: string[], allowedEstimateIds: string[]): string[] {
  const allowed = new Set(allowedEstimateIds);
  return [...new Set(selectedEstimateIds)].filter((id) => allowed.has(id));
}

function readJsonRecord(value: unknown): JsonRecord {
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
