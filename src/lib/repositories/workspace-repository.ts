import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { EstimateRowItem, EstimateTreeNode } from "@/components/workshop/estimate-tree-data";
import type { Tables } from "@/lib/supabase/types";
import { requireCurrentUserContext } from "@/lib/auth/session";
import { isUuid } from "@/lib/ids";
import { normalizeEstimateTreeNodeKind } from "@/lib/estimates/tree-hierarchy";

export type WorkspaceBootstrap = {
  workspace: Tables<"workspaces">;
  profile: Tables<"profiles">;
};

type ProjectEstimateSummaryMaps = {
  firstNodeByEstimateId: Map<string, string>;
  nodeCountByEstimateId: Map<string, number>;
  rowCountByEstimateId: Map<string, number>;
  totalCostByEstimateId: Map<string, number>;
};

type ProjectEstimatesListResult = {
  workspace: Tables<"workspaces">;
  project: Tables<"projects"> | null;
  estimates: Tables<"estimates">[];
} & ProjectEstimateSummaryMaps;

function createEmptyProjectEstimateSummaryMaps(): ProjectEstimateSummaryMaps {
  return {
    firstNodeByEstimateId: new Map<string, string>(),
    nodeCountByEstimateId: new Map<string, number>(),
    rowCountByEstimateId: new Map<string, number>(),
    totalCostByEstimateId: new Map<string, number>(),
  };
}

export async function ensureDefaultWorkspace(): Promise<WorkspaceBootstrap> {
  const context = await requireCurrentUserContext();
  const supabase = await createSupabaseServerClient();

  if (context.profile.default_workspace_id) {
    const { data: existingWorkspace, error } = await supabase
      .from("workspaces")
      .select("*")
      .eq("id", context.profile.default_workspace_id)
      .maybeSingle();

    if (error) throw error;
    if (existingWorkspace) return { workspace: existingWorkspace, profile: context.profile };
  }

  const defaultName = context.email === "philipjonlewis@gmail.com" ? "Philip's Archestimator Workspace" : "My Archestimator Workspace";

  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .insert({ name: defaultName, slug: null, created_by: context.userId })
    .select("*")
    .single();

  if (workspaceError) throw workspaceError;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .update({ default_workspace_id: workspace.id })
    .eq("id", context.userId)
    .select("*")
    .single();

  if (profileError) throw profileError;

  return { workspace, profile };
}

export async function listCurrentWorkspaceProjects() {
  const { workspace } = await ensureDefaultWorkspace();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("workspace_id", workspace.id)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return { workspace, projects: data ?? [] };
}

export async function getCurrentWorkspaceProject(projectId: string) {
  const { workspace } = await ensureDefaultWorkspace();

  if (!isUuid(projectId)) return { workspace, project: null };

  const supabase = await createSupabaseServerClient();

  const { data: project, error } = await supabase
    .from("projects")
    .select("*")
    .eq("workspace_id", workspace.id)
    .eq("id", projectId)
    .maybeSingle();

  if (error) throw error;
  return { workspace, project };
}

export async function listProjectEstimates(projectId: string): Promise<ProjectEstimatesListResult> {
  const { workspace, project } = await getCurrentWorkspaceProject(projectId);
  if (!project) {
    return {
      workspace,
      project,
      estimates: [],
      ...createEmptyProjectEstimateSummaryMaps(),
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: estimates, error } = await supabase
    .from("estimates")
    .select("*")
    .eq("project_id", project.id)
    .order("updated_at", { ascending: false });

  if (error) throw error;

  const estimateIds = (estimates ?? []).map((estimate) => estimate.id);
  if (estimateIds.length === 0) {
    return {
      workspace,
      project,
      estimates: [],
      ...createEmptyProjectEstimateSummaryMaps(),
    };
  }

  const [nodesResult, rowsResult] = await Promise.all([
    supabase
      .from("estimate_nodes")
      .select("id, estimate_id, kind, sort_order")
      .in("estimate_id", estimateIds)
      .order("sort_order", { ascending: true }),
    supabase
      .from("estimate_row_items")
      .select("estimate_id, quantity, unit_cost, supplementary_cost, labor_cost")
      .in("estimate_id", estimateIds),
  ]);

  if (nodesResult.error) throw nodesResult.error;
  if (rowsResult.error) throw rowsResult.error;

  const firstNodeByEstimateId = new Map<string, string>();
  const nodeCountByEstimateId = new Map<string, number>();
  for (const node of nodesResult.data ?? []) {
    nodeCountByEstimateId.set(node.estimate_id, (nodeCountByEstimateId.get(node.estimate_id) ?? 0) + 1);
    if (node.kind === "area" && !firstNodeByEstimateId.has(node.estimate_id)) firstNodeByEstimateId.set(node.estimate_id, node.id);
  }
  for (const node of nodesResult.data ?? []) {
    if (!firstNodeByEstimateId.has(node.estimate_id)) firstNodeByEstimateId.set(node.estimate_id, node.id);
  }

  const totalCostByEstimateId = new Map<string, number>();
  const rowCountByEstimateId = new Map<string, number>();
  for (const row of rowsResult.data ?? []) {
    const quantity = Number(row.quantity);
    const unitCost = Number(row.unit_cost);
    const supplementaryCost = Number(row.supplementary_cost);
    const laborCost = Number(row.labor_cost);
    const rowTotal = quantity * unitCost + supplementaryCost + laborCost;
    rowCountByEstimateId.set(row.estimate_id, (rowCountByEstimateId.get(row.estimate_id) ?? 0) + 1);
    totalCostByEstimateId.set(row.estimate_id, (totalCostByEstimateId.get(row.estimate_id) ?? 0) + rowTotal);
  }

  return { workspace, project, estimates: estimates ?? [], firstNodeByEstimateId, nodeCountByEstimateId, rowCountByEstimateId, totalCostByEstimateId };
}

type EstimateNodeKind = Tables<"estimate_nodes">["kind"];
type EstimateNodeRow = Tables<"estimate_nodes">;
type EstimateRowItemRow = Tables<"estimate_row_items">;

type LiveEstimateTreeResult = {
  workspace: Tables<"workspaces">;
  project: Tables<"projects"> | null;
  estimate: Tables<"estimates"> | null;
  selectedNodeId: string | null;
  tree: EstimateTreeNode[];
};

function getDisplayNodeKind(kind: EstimateNodeKind): EstimateTreeNode["kind"] | null {
  return normalizeEstimateTreeNodeKind(kind);
}

function formatPeso(value: number) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 2 }).format(value);
}

function toUiRow(row: EstimateRowItemRow): EstimateRowItem {
  const quantity = Number(row.quantity);
  const itemCost = Number(row.unit_cost);
  const supplementaryCosts = Number(row.supplementary_cost);
  const laborCost = Number(row.labor_cost);
  const category = typeof row.source_snapshot === "object" && row.source_snapshot && !Array.isArray(row.source_snapshot) && "category" in row.source_snapshot
    ? String(row.source_snapshot.category)
    : "General";

  return {
    id: row.id,
    material: row.material,
    description: row.description,
    supplier: row.supplier ?? "No supplier",
    source: row.source_library_item_id ? "library" : "project",
    unit: row.unit,
    itemCost,
    quantity,
    subTotal: itemCost * quantity,
    supplementaryCosts,
    laborCost,
    totalItemCosts: itemCost * quantity + supplementaryCosts + laborCost,
    category,
    discipline: row.discipline ?? undefined,
    designation: row.designation ?? undefined,
    pricingSource: "Estimate row snapshot",
    pricingDate: row.created_at.slice(0, 10),
  };
}

export function buildEstimateTree(nodes: EstimateNodeRow[], rows: EstimateRowItemRow[]): EstimateTreeNode[] {
  const rowItemsByNode = new Map<string, EstimateRowItem[]>();
  for (const row of rows) {
    const current = rowItemsByNode.get(row.node_id) ?? [];
    current.push(toUiRow(row));
    rowItemsByNode.set(row.node_id, current);
  }

  const nodeMap = new Map<string, EstimateTreeNode>();
  for (const node of nodes) {
    const kind = getDisplayNodeKind(node.kind);
    if (!kind) continue;
    nodeMap.set(node.id, {
      id: node.id,
      name: node.name,
      kind,
      total: formatPeso(0),
      children: [],
      estimateRowItems: rowItemsByNode.get(node.id) ?? [],
    });
  }

  const roots: EstimateTreeNode[] = [];
  for (const node of nodes) {
    const uiNode = nodeMap.get(node.id);
    if (!uiNode) continue;
    const parent = node.parent_id ? nodeMap.get(node.parent_id) : undefined;
    if (parent) parent.children = [...(parent.children ?? []), uiNode];
    else roots.push(uiNode);
  }

  function computeTotals(node: EstimateTreeNode): number {
    const rowTotal = (node.estimateRowItems ?? []).reduce((total, row) => total + row.totalItemCosts, 0);
    const childTotal = (node.children ?? []).reduce((total, child) => total + computeTotals(child), 0);
    const total = rowTotal + childTotal;
    node.total = formatPeso(total);
    return total;
  }

  roots.forEach(computeTotals);
  return roots;
}

export async function getProjectEstimateTreeByEstimate(projectId: string, estimateId: string): Promise<LiveEstimateTreeResult> {
  const { workspace, project } = await getCurrentWorkspaceProject(projectId);
  if (!project) return { workspace, project, estimate: null, selectedNodeId: null, tree: [] };

  const supabase = await createSupabaseServerClient();
  const { data: estimate, error: estimateError } = await supabase
    .from("estimates")
    .select("*")
    .eq("id", estimateId)
    .eq("project_id", project.id)
    .maybeSingle();

  if (estimateError) throw estimateError;
  if (!estimate) return { workspace, project, estimate: null, selectedNodeId: null, tree: [] };

  const [nodesResult, rowsResult] = await Promise.all([
    supabase.from("estimate_nodes").select("*").eq("estimate_id", estimate.id).order("sort_order", { ascending: true }),
    supabase.from("estimate_row_items").select("*").eq("estimate_id", estimate.id).order("sort_order", { ascending: true }),
  ]);

  if (nodesResult.error) throw nodesResult.error;
  if (rowsResult.error) throw rowsResult.error;

  const nodes = nodesResult.data ?? [];
  const tree = buildEstimateTree(nodes, rowsResult.data ?? []);
  return { workspace, project, estimate, selectedNodeId: tree[0]?.id ?? null, tree };
}

export async function getProjectEstimateTreeByNode(projectId: string, nodeId: string): Promise<LiveEstimateTreeResult> {
  const { workspace, project } = await getCurrentWorkspaceProject(projectId);
  if (!project) return { workspace, project, estimate: null, selectedNodeId: null, tree: [] };

  const supabase = await createSupabaseServerClient();
  const { data: selectedNode, error: selectedNodeError } = await supabase
    .from("estimate_nodes")
    .select("*, estimates!inner(*)")
    .eq("id", nodeId)
    .eq("estimates.project_id", project.id)
    .maybeSingle();

  if (selectedNodeError) throw selectedNodeError;
  if (!selectedNode) return getProjectEstimateTreeByEstimate(projectId, nodeId);

  const estimate = selectedNode.estimates as Tables<"estimates">;
  const [nodesResult, rowsResult] = await Promise.all([
    supabase.from("estimate_nodes").select("*").eq("estimate_id", selectedNode.estimate_id).order("sort_order", { ascending: true }),
    supabase.from("estimate_row_items").select("*").eq("estimate_id", selectedNode.estimate_id).order("sort_order", { ascending: true }),
  ]);

  if (nodesResult.error) throw nodesResult.error;
  if (rowsResult.error) throw rowsResult.error;

  const nodes = nodesResult.data ?? [];
  const tree = buildEstimateTree(nodes, rowsResult.data ?? []);
  const selectedNodeId = nodes.some((node) => node.id === nodeId) ? nodeId : tree[0]?.id ?? null;

  return { workspace, project, estimate, selectedNodeId, tree };
}
