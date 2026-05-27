import type { AiRequestUserContext } from "@/lib/ai/auth";
import { buildAiPackageDataAccessEvent, buildAiPackageToolCall } from "@/lib/ai/audit";
import type { EstimateRowItem, EstimateTreeNode } from "@/lib/estimates/types";
import { isUuid } from "@/lib/ids";
import {
  getCurrentWorkspaceProject,
  getProjectEstimateTreeByEstimate,
  listCurrentWorkspaceProjects,
  listProjectEstimates,
  ensureDefaultWorkspace,
} from "@/lib/repositories/workspace-repository";
import {
  getCurrentWorkspaceComponentRowsLibrary,
  getCurrentWorkspaceEstimateTemplates,
} from "@/lib/repositories/component-library-repository";
import type { TablesInsert } from "@/lib/supabase/types";

export const PACKAGE_BUILDER_READ_TOOL_NAMES = [
  "read_current_workspace_context",
  "list_accessible_projects",
  "read_project_summary",
  "list_project_estimates",
  "read_estimate_summary",
  "read_estimate_tree",
  "read_area_rows",
  "search_component_library",
  "search_estimate_templates",
] as const;

export type PackageBuilderReadToolName = (typeof PACKAGE_BUILDER_READ_TOOL_NAMES)[number];

export type PackageBuilderCompactProject = {
  id: string;
  name: string;
  clientName: string | null;
  location: string | null;
  projectCode: string | null;
  updatedAt: string;
};

export type PackageBuilderCompactEstimate = {
  id: string;
  projectId: string;
  name: string;
  sheetCode: string | null;
  total: number;
  nodeCount: number;
  rowCount: number;
  firstNodeId: string | null;
};

export type PackageBuilderCompactTreeNode = {
  id: string;
  name: string;
  kind: "group" | "area";
  path: string[];
  rowCount: number;
};

export type PackageBuilderCompactAreaRow = {
  id: string;
  nodeId: string;
  material: string;
  quantity: number;
  unit: string;
  unitCost: number;
  total: number;
  sourceType: "library" | "project" | "supplier";
  sourceLibraryItemId?: string | null;
};

export type PackageBuilderComponentSummary = {
  id: string;
  material: string;
  description: string;
  category: string;
  categoryPath: string[];
  supplier: string | null;
  supplierId?: string | null;
  brand?: string | null;
  unit: string;
  unitCost: number;
  miscCost: number;
  currency: string;
  lifecycleState?: string | null;
  priceOptionId?: string | null;
  priceOptionUpdatedAt?: string | null;
  sourceLibraryItemId?: string | null;
  confidence?: string | null;
};

export type PackageBuilderTemplateSummary = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  nodeCount: number;
  rowCount: number;
  areaNames: string[];
};

export type PackageBuilderReadAuditEvent = {
  toolCall: TablesInsert<"ai_tool_calls"> | null;
  dataAccessEvent: TablesInsert<"ai_data_access_events"> | null;
};

export type PackageBuilderReadToolsData = {
  workspace: { name: string | null };
  projects: PackageBuilderCompactProject[];
  projectSummary: PackageBuilderCompactProject | null;
  projectEstimates: PackageBuilderCompactEstimate[];
  estimateSummary: PackageBuilderCompactEstimate | null;
  estimateTree: PackageBuilderCompactTreeNode[];
  areaRows: PackageBuilderCompactAreaRow[];
  componentMatches: PackageBuilderComponentSummary[];
  templateMatches: PackageBuilderTemplateSummary[];
  auditEvents: PackageBuilderReadAuditEvent[];
};

export type PackageBuilderReadToolsInput = {
  runId: string;
  userContext: AiRequestUserContext;
  message: string;
  routeContext?: Record<string, unknown>;
};

export type PackageBuilderReadToolsDependencies = {
  ensureWorkspace: typeof ensureDefaultWorkspace;
  listProjects: typeof listCurrentWorkspaceProjects;
  getProject: typeof getCurrentWorkspaceProject;
  listEstimates: typeof listProjectEstimates;
  getEstimateTree: typeof getProjectEstimateTreeByEstimate;
  getComponentRowsLibrary: typeof getCurrentWorkspaceComponentRowsLibrary;
  getEstimateTemplates: typeof getCurrentWorkspaceEstimateTemplates;
};

const DEFAULT_RESULT_LIMIT = 12;
const DEFAULT_TREE_LIMIT = 80;
const DEFAULT_ROW_LIMIT = 80;

const defaultDependencies: PackageBuilderReadToolsDependencies = {
  ensureWorkspace: ensureDefaultWorkspace,
  listProjects: listCurrentWorkspaceProjects,
  getProject: getCurrentWorkspaceProject,
  listEstimates: listProjectEstimates,
  getEstimateTree: getProjectEstimateTreeByEstimate,
  getComponentRowsLibrary: getCurrentWorkspaceComponentRowsLibrary,
  getEstimateTemplates: getCurrentWorkspaceEstimateTemplates,
};

function readRouteId(routeContext: Record<string, unknown> | undefined, key: string) {
  const value = routeContext?.[key];
  return typeof value === "string" && isUuid(value) ? value : null;
}

function compactProject(project: {
  id: string;
  name: string;
  client_name: string | null;
  location: string | null;
  project_code: string | null;
  updated_at: string;
}): PackageBuilderCompactProject {
  return {
    id: project.id,
    name: project.name,
    clientName: project.client_name,
    location: project.location,
    projectCode: project.project_code,
    updatedAt: project.updated_at,
  };
}

function compactEstimate(input: {
  estimate: {
    id: string;
    project_id: string;
    name: string;
    sheet_code?: string | null;
  };
  total: number;
  nodeCount: number;
  rowCount: number;
  firstNodeId: string | null;
}): PackageBuilderCompactEstimate {
  return {
    id: input.estimate.id,
    projectId: input.estimate.project_id,
    name: input.estimate.name,
    sheetCode: input.estimate.sheet_code ?? null,
    total: input.total,
    nodeCount: input.nodeCount,
    rowCount: input.rowCount,
    firstNodeId: input.firstNodeId,
  };
}

function flattenTree(nodes: EstimateTreeNode[], path: string[] = []): PackageBuilderCompactTreeNode[] {
  return nodes.flatMap((node) => {
    const nextPath = [...path, node.name];
    return [
      {
        id: node.id,
        name: node.name,
        kind: node.kind,
        path: nextPath,
        rowCount: node.estimateRowItems?.length ?? 0,
      },
      ...flattenTree(node.children ?? [], nextPath),
    ];
  });
}

function flattenAreaRows(nodes: EstimateTreeNode[]): PackageBuilderCompactAreaRow[] {
  return nodes.flatMap((node) => [
    ...(node.kind === "area"
      ? (node.estimateRowItems ?? []).map((row) => ({
          id: row.id,
          nodeId: node.id,
          material: row.material,
          quantity: row.quantity,
          unit: row.unit,
          unitCost: row.itemCost,
          total: row.totalItemCosts,
          sourceType: row.source,
          sourceLibraryItemId: row.sourceLibraryItemId,
        }))
      : []),
    ...flattenAreaRows(node.children ?? []),
  ]);
}

function normalizeSearchText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function getPackageSearchTerms(message: string) {
  const normalized = normalizeSearchText(message);
  const terms = new Set(["bedroom", "bed", "cabinet", "wardrobe", "living", "dining", "kitchen", "bathroom", "finish", "general"]);
  for (const token of normalized.split(" ")) {
    if (token.length >= 4) terms.add(token);
  }
  return [...terms];
}

function scoreLibraryItem(item: EstimateRowItem, terms: string[]) {
  const haystack = normalizeSearchText([
    item.material,
    item.description,
    item.category,
    item.categoryPath?.join(" "),
    item.supplier,
    item.brand,
    item.tags?.join(" "),
  ].filter(Boolean).join(" "));
  return terms.reduce((score, term) => score + (haystack.includes(term) ? 1 : 0), 0);
}

function compactComponent(item: EstimateRowItem): PackageBuilderComponentSummary {
  const activePriceOption = item.priceOptions?.find((option) => option.id === item.priceOptionId) ?? item.priceOptions?.find((option) => option.isDefault);
  return {
    id: item.id,
    material: item.material,
    description: item.description,
    category: item.category,
    categoryPath: item.categoryPath ?? [],
    supplier: item.supplier || null,
    supplierId: item.supplierId ?? null,
    brand: item.brand ?? null,
    unit: item.unit,
    unitCost: item.itemCost,
    miscCost: item.miscCost,
    currency: item.currency ?? "PHP",
    lifecycleState: item.lifecycleState ?? null,
    priceOptionId: item.priceOptionId ?? null,
    priceOptionUpdatedAt: activePriceOption?.updatedAt ?? null,
    sourceLibraryItemId: item.sourceLibraryItemId ?? item.id,
    confidence: item.confidence ?? null,
  };
}

function countTemplateNodes(nodes: EstimateTreeNode[]): number {
  return nodes.reduce((sum, node) => sum + 1 + countTemplateNodes(node.children ?? []), 0);
}

function countTemplateRows(nodes: EstimateTreeNode[]): number {
  return nodes.reduce((sum, node) => sum + (node.estimateRowItems?.length ?? 0) + countTemplateRows(node.children ?? []), 0);
}

function collectAreaNames(nodes: EstimateTreeNode[]): string[] {
  return nodes.flatMap((node) => [
    ...(node.kind === "area" ? [node.name] : []),
    ...collectAreaNames(node.children ?? []),
  ]);
}

function createAuditEvent({
  input,
  toolName,
  sourceTables,
  rowCount,
  safeSummary,
  filter,
}: {
  input: PackageBuilderReadToolsInput;
  toolName: PackageBuilderReadToolName;
  sourceTables: string[];
  rowCount: number;
  safeSummary: string;
  filter?: unknown;
}): PackageBuilderReadAuditEvent {
  return {
    toolCall: buildAiPackageToolCall({
      runId: input.runId,
      userContext: input.userContext,
      mode: "draft",
      toolName,
      status: "completed",
      args: filter,
      result: { rowCount },
      safeSummary,
    }),
    dataAccessEvent: buildAiPackageDataAccessEvent({
      runId: input.runId,
      userContext: input.userContext,
      eventName: toolName,
      sourceTables,
      filter,
      rowCount,
      safeSummary,
    }),
  };
}

export async function readPackageBuilderTools(
  input: PackageBuilderReadToolsInput,
  dependencies: Partial<PackageBuilderReadToolsDependencies> = {},
): Promise<PackageBuilderReadToolsData> {
  const deps = { ...defaultDependencies, ...dependencies };
  const auditEvents: PackageBuilderReadAuditEvent[] = [];

  const workspaceBootstrap = await deps.ensureWorkspace();
  auditEvents.push(createAuditEvent({
    input,
    toolName: "read_current_workspace_context",
    sourceTables: ["workspaces", "profiles"],
    rowCount: 1,
    safeSummary: "Read current workspace display context for package drafting.",
  }));

  const projectsResult = await deps.listProjects();
  const projects = projectsResult.projects.slice(0, DEFAULT_RESULT_LIMIT).map((item) => compactProject(item.project));
  auditEvents.push(createAuditEvent({
    input,
    toolName: "list_accessible_projects",
    sourceTables: ["projects", "project_members", "estimate_sheet_members"],
    rowCount: projects.length,
    safeSummary: "Listed compact accessible project summaries for package drafting.",
  }));

  const projectId = readRouteId(input.routeContext, "projectId");
  const estimateId = readRouteId(input.routeContext, "estimateId");
  let projectSummary: PackageBuilderCompactProject | null = null;
  let projectEstimates: PackageBuilderCompactEstimate[] = [];
  let estimateSummary: PackageBuilderCompactEstimate | null = null;
  let estimateTree: PackageBuilderCompactTreeNode[] = [];
  let areaRows: PackageBuilderCompactAreaRow[] = [];

  if (projectId) {
    const { project } = await deps.getProject(projectId);
    projectSummary = project ? compactProject(project) : null;
    auditEvents.push(createAuditEvent({
      input,
      toolName: "read_project_summary",
      sourceTables: ["projects"],
      rowCount: projectSummary ? 1 : 0,
      filter: { projectId },
      safeSummary: "Read compact project summary for the route-selected project.",
    }));

    const estimatesResult = await deps.listEstimates(projectId);
    projectEstimates = estimatesResult.estimates.slice(0, DEFAULT_RESULT_LIMIT).map((estimate) =>
      compactEstimate({
        estimate,
        total: estimatesResult.totalCostByEstimateId.get(estimate.id) ?? 0,
        nodeCount: estimatesResult.nodeCountByEstimateId.get(estimate.id) ?? 0,
        rowCount: estimatesResult.rowCountByEstimateId.get(estimate.id) ?? 0,
        firstNodeId: estimatesResult.firstNodeByEstimateId.get(estimate.id) ?? null,
      })
    );
    estimateSummary = estimateId ? projectEstimates.find((estimate) => estimate.id === estimateId) ?? null : projectEstimates[0] ?? null;
    auditEvents.push(createAuditEvent({
      input,
      toolName: "list_project_estimates",
      sourceTables: ["estimates", "estimate_nodes", "estimate_row_items"],
      rowCount: projectEstimates.length,
      filter: { projectId },
      safeSummary: "Listed compact estimate summaries for the route-selected project.",
    }));
  }

  if (projectId && estimateSummary?.id) {
    const treeResult = await deps.getEstimateTree(projectId, estimateSummary.id);
    estimateTree = flattenTree(treeResult.tree).slice(0, DEFAULT_TREE_LIMIT);
    areaRows = flattenAreaRows(treeResult.tree).slice(0, DEFAULT_ROW_LIMIT);
    auditEvents.push(createAuditEvent({
      input,
      toolName: "read_estimate_tree",
      sourceTables: ["estimate_nodes"],
      rowCount: estimateTree.length,
      filter: { projectId, estimateId: estimateSummary.id },
      safeSummary: "Read compact estimate tree for package context.",
    }));
    auditEvents.push(createAuditEvent({
      input,
      toolName: "read_area_rows",
      sourceTables: ["estimate_row_items"],
      rowCount: areaRows.length,
      filter: { projectId, estimateId: estimateSummary.id },
      safeSummary: "Read compact Area Node row summaries for package context.",
    }));
  }

  const terms = getPackageSearchTerms(input.message);
  const componentLibrary = await deps.getComponentRowsLibrary();
  const componentMatches = componentLibrary.libraryItems
    .map((item) => ({ item, score: scoreLibraryItem(item, terms) }))
    .filter(({ item, score }) => score > 0 && !["archived", "discontinued"].includes(item.lifecycleState ?? ""))
    .sort((left, right) => right.score - left.score || left.item.material.localeCompare(right.item.material))
    .slice(0, DEFAULT_RESULT_LIMIT)
    .map(({ item }) => compactComponent(item));
  auditEvents.push(createAuditEvent({
    input,
    toolName: "search_component_library",
    sourceTables: ["cost_library_items", "cost_library_item_price_options", "component_category_nodes", "component_suppliers", "component_brands"],
    rowCount: componentMatches.length,
    filter: { terms },
    safeSummary: "Searched compact workspace component-library summaries for package drafting.",
  }));

  const templates = await deps.getEstimateTemplates();
  const templateMatches = templates
    .filter((template) => {
      const haystack = normalizeSearchText([template.name, template.description, template.category, collectAreaNames(template.nodes).join(" ")].filter(Boolean).join(" "));
      return terms.some((term) => haystack.includes(term));
    })
    .slice(0, DEFAULT_RESULT_LIMIT)
    .map((template) => ({
      id: template.id,
      name: template.name,
      description: template.description,
      category: template.category,
      nodeCount: countTemplateNodes(template.nodes),
      rowCount: countTemplateRows(template.nodes),
      areaNames: collectAreaNames(template.nodes).slice(0, 16),
    }));
  auditEvents.push(createAuditEvent({
    input,
    toolName: "search_estimate_templates",
    sourceTables: ["estimate_templates", "estimate_template_nodes", "estimate_template_row_items"],
    rowCount: templateMatches.length,
    filter: { terms },
    safeSummary: "Searched compact workspace estimate-template summaries for package drafting.",
  }));

  return {
    workspace: { name: workspaceBootstrap.workspace.name },
    projects,
    projectSummary,
    projectEstimates,
    estimateSummary,
    estimateTree,
    areaRows,
    componentMatches,
    templateMatches,
    auditEvents,
  };
}
