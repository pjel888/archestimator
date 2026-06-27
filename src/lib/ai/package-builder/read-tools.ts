import type { AiRequestUserContext } from "@/lib/ai/auth";
import { buildAiPackageDataAccessEvent, buildAiPackageToolCall } from "@/lib/ai/audit";
import {
  EMPTY_PACKAGE_BUILDER_MEMORY_PREFERENCES,
  readPackageBuilderMemoryPreferences,
  type PackageBuilderMemoryPreferences,
} from "@/lib/ai/package-builder/memory";
import {
  buildComponentCategoryTreeFromRows,
  findComponentCategoryPath,
  type ComponentLibraryCategoryRow,
} from "@/lib/component-library/taxonomy";
import { isUuid } from "@/lib/ids";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { TablesInsert } from "@/lib/supabase/types";
import { filterMap, filterMapBy } from "@/lib/util/array";

const PACKAGE_BUILDER_READ_TOOL_NAMES = [
  "read_current_workspace_context",
  "list_accessible_projects",
  "read_project_summary",
  "list_project_estimates",
  "read_estimate_summary",
  "read_estimate_tree",
  "read_area_rows",
  "search_historical_estimate_rows",
  "search_comparable_estimate_packages",
  "search_component_library",
  "search_estimate_templates",
  "read_package_builder_memory_preferences",
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
  activeTabId?: string | null;
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
  quantityBase?: number | null;
  quantityContingencyAmount?: number | null;
  unit: string;
  unitCost: number;
  miscCost?: number;
  contingencyPercentage?: number;
  rowRevision?: number;
  total: number;
  sourceType: "library" | "project" | "supplier";
  sourceLibraryItemId?: string | null;
};

export type PackageBuilderHistoricalRowMatch = {
  id: string;
  projectId: string;
  projectName: string;
  estimateId: string;
  estimateName: string;
  areaName: string | null;
  material: string;
  description: string;
  supplier: string | null;
  quantity: number;
  unit: string;
  unitCost: number;
  miscCost: number;
  total: number;
  sourceLibraryItemId: string | null;
  updatedAt: string;
};

export type PackageBuilderComparablePackageRowPreview = {
  areaName: string | null;
  material: string;
  description: string;
  supplier: string | null;
  quantity: number;
  unit: string;
  unitCost: number;
  miscCost: number;
  contingencyPercentage: number;
  total: number;
  sourceType: "library" | "project";
};

export type PackageBuilderComparablePackageArea = {
  areaName: string;
  rowCount: number;
  total: number;
  sourceLibraryCoverageRatio: number;
  topMaterials: string[];
  rowPreviews: PackageBuilderComparablePackageRowPreview[];
};

export type PackageBuilderComparableEstimatePackage = {
  projectId: string;
  projectName: string;
  estimateId: string;
  estimateName: string;
  sheetCode: string | null;
  updatedAt: string;
  matchedTerms: string[];
  areaCount: number;
  rowCount: number;
  total: number;
  sourceLibraryCoverageRatio: number;
  areas: PackageBuilderComparablePackageArea[];
};

export type PackageBuilderComponentSummary = {
  id: string;
  material: string;
  description: string;
  category: string;
  categoryNodeId?: string | null;
  categoryPath: string[];
  libraryFolderId?: string | null;
  libraryFolderName?: string | null;
  libraryFolderPath?: string[];
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
  currentVersionNumber?: number | null;
  confidence?: string | null;
};

export type PackageBuilderTemplateRowPreview = {
  id?: string;
  templateId?: string;
  templateNodeId?: string;
  areaName: string | null;
  material: string;
  description: string;
  supplier: string | null;
  quantity: number;
  unit: string;
  unitCost: number;
  miscCost: number;
  contingencyPercentage: number;
  total: number;
};

export type PackageBuilderTemplateSummary = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  nodeCount: number;
  rowCount: number;
  areaNames: string[];
  rowPreviews?: PackageBuilderTemplateRowPreview[];
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
  historicalRowMatches: PackageBuilderHistoricalRowMatch[];
  comparableEstimatePackages: PackageBuilderComparableEstimatePackage[];
  componentMatches: PackageBuilderComponentSummary[];
  templateMatches: PackageBuilderTemplateSummary[];
  memoryPreferences?: PackageBuilderMemoryPreferences;
  auditEvents: PackageBuilderReadAuditEvent[];
};

export type PackageBuilderReadToolsInput = {
  runId: string;
  userContext: AiRequestUserContext;
  message: string;
  routeContext?: Record<string, unknown>;
  memoryEnabled?: boolean;
};

const DEFAULT_RESULT_LIMIT = 12;
const DEFAULT_TREE_LIMIT = 80;
const DEFAULT_ROW_LIMIT = 80;
const DEFAULT_HISTORICAL_ESTIMATE_LIMIT = 24;
const DEFAULT_HISTORICAL_ROW_LIMIT = 48;
const DEFAULT_COMPARABLE_TREE_LIMIT = 120;
const DEFAULT_COMPARABLE_ROW_LIMIT = 120;
const DEFAULT_COMPARABLE_PACKAGE_LIMIT = 4;
const DEFAULT_COMPARABLE_AREA_LIMIT = 12;
const DEFAULT_COMPARABLE_ROW_PREVIEW_LIMIT = 6;
const DEFAULT_SEARCH_TERM_LIMIT = 40;
const DEFAULT_SEARCH_FILTER_TERM_LIMIT = DEFAULT_SEARCH_TERM_LIMIT;
const PACKAGE_SEARCH_SEED_TERMS = [
  "bed",
  "furniture",
  "wardrobe",
  "closet",
  "kitchen",
  "cabinet",
  "millwork",
  "water closet",
  "toilet",
  "lavatory",
  "basin",
  "sink",
  "faucet",
  "living",
  "dining",
  "table",
  "console",
  "sofa",
  "chair",
  "pendant",
  "lounge",
  "light",
  "fixture",
  "paint",
  "tile",
  "bedroom",
  "bathroom",
  "sanitary",
  "finish",
  "general",
] as const;

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
  activeTabId?: string | null;
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
    activeTabId: input.activeTabId ?? null,
  };
}

function normalizeSearchText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function getPackageSearchTerms(message: string) {
  const normalized = normalizeSearchText(message);
  const terms = new Set<string>(PACKAGE_SEARCH_SEED_TERMS);
  for (const token of normalized.split(" ")) {
    if (token.length >= 4) terms.add(token);
    if (terms.size >= DEFAULT_SEARCH_TERM_LIMIT) break;
  }
  return [...terms].slice(0, DEFAULT_SEARCH_TERM_LIMIT);
}

function scoreComponentSummary(item: PackageBuilderComponentSummary, terms: string[]) {
  const haystack = normalizeSearchText([
    item.material,
    item.description,
    item.category,
    item.categoryPath.join(" "),
    item.libraryFolderName,
    item.libraryFolderPath?.join(" "),
    item.supplier,
    item.brand,
  ].filter(Boolean).join(" "));
  return terms.reduce((score, term) => score + (haystack.includes(term) ? 1 : 0), 0);
}

function escapePostgrestLikeTerm(term: string) {
  return term.replace(/[%_]/g, (match) => `\\${match}`);
}

function buildSearchOrFilter(columns: string[], terms: string[]) {
  return terms
    .slice(0, DEFAULT_SEARCH_FILTER_TERM_LIMIT)
    .flatMap((term) => {
      const safeTerm = escapePostgrestLikeTerm(term);
      return columns.map((column) => `${column}.ilike.%${safeTerm}%`);
    })
    .join(",");
}

function calculateRowTotal(row: { quantity: number; quantity_base?: number | null; unit_cost: number; misc_cost: number; contingency_percentage: number }) {
  const base = Number(row.quantity) * Number(row.unit_cost);
  return base + Number(row.misc_cost) + (row.quantity_base === null || row.quantity_base === undefined ? (base * Number(row.contingency_percentage)) / 100 : 0);
}

function compactEstimateTree({
  nodes,
  rows,
}: {
  nodes: AiEstimateNodeSearchRow[];
  rows: AiEstimateRowSearchRow[];
}) {
  const rowsByNodeId = new Map<string, AiEstimateRowSearchRow[]>();
  for (const row of rows) rowsByNodeId.set(row.node_id, [...(rowsByNodeId.get(row.node_id) ?? []), row]);

  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const childrenByParentId = new Map<string | null, AiEstimateNodeSearchRow[]>();
  for (const node of nodes) {
    const parentId = node.parent_id && nodeById.has(node.parent_id) ? node.parent_id : null;
    childrenByParentId.set(parentId, [...(childrenByParentId.get(parentId) ?? []), node]);
  }
  for (const children of childrenByParentId.values()) {
    children.sort((left, right) => left.sort_order - right.sort_order || left.name.localeCompare(right.name));
  }

  const tree: PackageBuilderCompactTreeNode[] = [];
  const areaRows: PackageBuilderCompactAreaRow[] = [];
  const visit = (node: AiEstimateNodeSearchRow, path: string[]) => {
    const nextPath = [...path, node.name];
    const nodeRows = rowsByNodeId.get(node.id) ?? [];
    tree.push({
      id: node.id,
      name: node.name,
      kind: node.kind,
      path: nextPath,
      rowCount: nodeRows.length,
    });
    if (node.kind === "area") {
      areaRows.push(...nodeRows.map((row) => ({
        id: row.id,
        nodeId: node.id,
        material: row.material,
        quantity: row.quantity,
        quantityBase: row.quantity_base ?? null,
        quantityContingencyAmount: row.quantity_base === null || row.quantity_base === undefined ? null : row.quantity_contingency_amount ?? 0,
        unit: row.unit,
        unitCost: row.unit_cost,
        miscCost: row.misc_cost,
        contingencyPercentage: row.contingency_percentage,
        rowRevision: typeof row.row_revision === "number" ? row.row_revision : undefined,
        total: calculateRowTotal(row),
        sourceType: row.source_library_item_id ? "library" as const : "project" as const,
        sourceLibraryItemId: row.source_library_item_id,
      })));
    }
    for (const child of childrenByParentId.get(node.id) ?? []) visit(child, nextPath);
  };

  for (const root of childrenByParentId.get(null) ?? []) visit(root, []);
  return { tree, areaRows };
}

type AiComponentSearchItem = {
  id: string;
  name: string;
  description: string;
  category: string;
  category_node_id: string | null;
  library_folder_id: string | null;
  supplier: string | null;
  supplier_id: string | null;
  brand: string | null;
  brand_id: string | null;
  unit: string;
  unit_cost: number;
  misc_cost: number;
  lifecycle_state: string | null;
  current_version_number: number;
  active_price_option_id: string | null;
  confidence: string | null;
  workspace_id: string;
};

type AiComponentSearchPriceOption = {
  id: string;
  item_id: string;
  unit: string;
  unit_cost: number;
  misc_cost: number;
  currency: string;
  is_active: boolean;
  is_default: boolean;
  updated_at: string;
  confidence: string | null;
  supplier_id: string | null;
};

type AiLibraryFolderSearchRow = {
  id: string;
  workspace_id: string;
  parent_id: string | null;
  name: string;
  sort_order: number;
  source_category_node_id: string | null;
  folder_kind: "taxonomy" | "custom";
};

type AiTemplateSearchRow = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
};

type AiTemplateNodeSearchRow = {
  id: string;
  template_id: string;
  kind: "group" | "area";
  name: string;
};

type AiTemplateRowSearchRow = {
  id: string;
  template_id: string;
  template_node_id: string;
  material: string;
  description: string;
  supplier: string | null;
  quantity: number;
  unit: string;
  unit_cost: number;
  contingency_percentage: number;
  misc_cost: number;
  sort_order?: number;
};

type AiProjectSearchRow = {
  id: string;
  name: string;
  client_name: string | null;
  location: string | null;
  project_code: string | null;
  updated_at: string;
};

type AiEstimateSearchRow = {
  id: string;
  project_id: string;
  name: string;
  sheet_code: string | null;
  updated_at?: string;
};

type AiEstimateNodeSearchRow = {
  id: string;
  estimate_id: string;
  parent_id: string | null;
  kind: "group" | "area";
  name: string;
  sort_order: number;
  estimate_tab_id?: string | null;
};

type AiEstimateRowSearchRow = {
  id: string;
  estimate_id: string;
  node_id: string;
  material: string;
  description?: string;
  supplier?: string | null;
  quantity: number;
  quantity_base?: number | null;
  quantity_contingency_amount?: number | null;
  unit: string;
  unit_cost: number;
  contingency_percentage: number;
  misc_cost: number;
  row_revision?: number;
  source_library_item_id: string | null;
  updated_at?: string;
};

async function readScopedWorkspaceContext({ workspaceId }: { workspaceId: string }) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("workspaces")
    .select("name")
    .eq("id", workspaceId)
    .maybeSingle();
  if (error) throw error;

  return {
    workspace: { name: typeof data?.name === "string" ? data.name : null },
    rowCount: data ? 1 : 0,
  };
}

async function listScopedProjectSummaries({ workspaceId }: { workspaceId: string }) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id, name, client_name, location, project_code, updated_at")
    .eq("workspace_id", workspaceId)
    .order("updated_at", { ascending: false })
    .limit(DEFAULT_RESULT_LIMIT);
  if (error) throw error;

  const rows = (data ?? []) as AiProjectSearchRow[];
  return {
    projects: rows.map(compactProject),
    rowCount: rows.length,
  };
}

async function readScopedProjectSummary({
  workspaceId,
  projectId,
}: {
  workspaceId: string;
  projectId: string;
}) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id, name, client_name, location, project_code, updated_at")
    .eq("workspace_id", workspaceId)
    .eq("id", projectId)
    .maybeSingle();
  if (error) throw error;

  const row = data as AiProjectSearchRow | null;
  return {
    project: row ? compactProject(row) : null,
    rowCount: row ? 1 : 0,
  };
}

async function listScopedEstimateSummaries({
  projectId,
}: {
  projectId: string;
}) {
  const supabase = await createSupabaseServerClient();
  const { data: estimates, error } = await supabase
    .from("estimates")
    .select("id, project_id, name, sheet_code")
    .eq("project_id", projectId)
    .order("updated_at", { ascending: false })
    .limit(DEFAULT_RESULT_LIMIT);
  if (error) throw error;

  const estimateRows = (estimates ?? []) as AiEstimateSearchRow[];
  const estimateIds = estimateRows.map((estimate) => estimate.id);
  if (estimateIds.length === 0) {
    return { estimates: [] as PackageBuilderCompactEstimate[], rowCount: 0 };
  }

  const [nodesResult, rowsResult] = await Promise.all([
    supabase
      .from("estimate_nodes")
      .select("id, estimate_id, kind, sort_order")
      .in("estimate_id", estimateIds)
      .order("sort_order", { ascending: true })
      .limit(DEFAULT_TREE_LIMIT),
    supabase
      .from("estimate_row_items")
      .select("estimate_id, quantity, quantity_base, quantity_contingency_amount, unit_cost, contingency_percentage, misc_cost")
      .in("estimate_id", estimateIds)
      .limit(DEFAULT_ROW_LIMIT),
  ]);
  if (nodesResult.error) throw nodesResult.error;
  if (rowsResult.error) throw rowsResult.error;

  const nodes = (nodesResult.data ?? []) as Pick<AiEstimateNodeSearchRow, "id" | "estimate_id" | "kind" | "sort_order">[];
  const rows = (rowsResult.data ?? []) as Pick<AiEstimateRowSearchRow, "estimate_id" | "quantity" | "quantity_base" | "quantity_contingency_amount" | "unit_cost" | "contingency_percentage" | "misc_cost">[];
  const firstNodeByEstimateId = new Map<string, string>();
  const nodeCountByEstimateId = new Map<string, number>();
  const rowCountByEstimateId = new Map<string, number>();
  const totalCostByEstimateId = new Map<string, number>();

  for (const node of nodes) {
    nodeCountByEstimateId.set(node.estimate_id, (nodeCountByEstimateId.get(node.estimate_id) ?? 0) + 1);
    if (node.kind === "area" && !firstNodeByEstimateId.has(node.estimate_id)) firstNodeByEstimateId.set(node.estimate_id, node.id);
  }
  for (const node of nodes) {
    if (!firstNodeByEstimateId.has(node.estimate_id)) firstNodeByEstimateId.set(node.estimate_id, node.id);
  }
  for (const row of rows) {
    rowCountByEstimateId.set(row.estimate_id, (rowCountByEstimateId.get(row.estimate_id) ?? 0) + 1);
    totalCostByEstimateId.set(row.estimate_id, (totalCostByEstimateId.get(row.estimate_id) ?? 0) + calculateRowTotal(row));
  }

  return {
    estimates: estimateRows.map((estimate) =>
      compactEstimate({
        estimate,
        total: totalCostByEstimateId.get(estimate.id) ?? 0,
        nodeCount: nodeCountByEstimateId.get(estimate.id) ?? 0,
        rowCount: rowCountByEstimateId.get(estimate.id) ?? 0,
        firstNodeId: firstNodeByEstimateId.get(estimate.id) ?? null,
      })
    ),
    rowCount: estimateRows.length + nodes.length + rows.length,
  };
}

async function readScopedEstimateTree({
  projectId,
  estimateId,
  selectedNodeId,
  activeTabId,
}: {
  projectId: string;
  estimateId: string | null;
  selectedNodeId: string | null;
  activeTabId: string | null;
}) {
  const supabase = await createSupabaseServerClient();
  let resolvedEstimateId = estimateId;
  let resolvedActiveTabId = activeTabId;
  if (!resolvedEstimateId && selectedNodeId) {
    const { data: selectedNode, error: selectedNodeError } = await supabase
      .from("estimate_nodes")
      .select("id, estimate_id, estimate_tab_id")
      .eq("id", selectedNodeId)
      .maybeSingle();
    if (selectedNodeError) throw selectedNodeError;
    resolvedEstimateId = typeof selectedNode?.estimate_id === "string" ? selectedNode.estimate_id : null;
    if (!resolvedActiveTabId && typeof selectedNode?.estimate_tab_id === "string") {
      resolvedActiveTabId = selectedNode.estimate_tab_id;
    }
  }
  if (!resolvedEstimateId) {
    return {
      estimate: null as PackageBuilderCompactEstimate | null,
      tree: [] as PackageBuilderCompactTreeNode[],
      areaRows: [] as PackageBuilderCompactAreaRow[],
      nodeRowsRead: 0,
      areaRowsRead: 0,
    };
  }

  const { data: estimate, error: estimateError } = await supabase
    .from("estimates")
    .select("id, project_id, name, sheet_code")
    .eq("id", resolvedEstimateId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (estimateError) throw estimateError;
  if (!estimate) {
    return {
      estimate: null as PackageBuilderCompactEstimate | null,
      tree: [] as PackageBuilderCompactTreeNode[],
      areaRows: [] as PackageBuilderCompactAreaRow[],
      nodeRowsRead: 0,
      areaRowsRead: 0,
    };
  }

  const nodesQuery = supabase
    .from("estimate_nodes")
    .select("id, estimate_id, estimate_tab_id, parent_id, kind, name, sort_order")
    .eq("estimate_id", estimate.id);
  if (resolvedActiveTabId) nodesQuery.eq("estimate_tab_id", resolvedActiveTabId);

  const nodesResult = await nodesQuery
    .order("sort_order", { ascending: true })
    .limit(DEFAULT_TREE_LIMIT);
  if (nodesResult.error) throw nodesResult.error;

  const nodes = (nodesResult.data ?? []) as AiEstimateNodeSearchRow[];
  const scopedNodeIds = new Set(nodes.map((node) => node.id));
  const rowsQuery = supabase
    .from("estimate_row_items")
    .select("id, estimate_id, node_id, material, quantity, quantity_base, quantity_contingency_amount, unit, unit_cost, contingency_percentage, misc_cost, row_revision, source_library_item_id")
    .eq("estimate_id", estimate.id);
  if (resolvedActiveTabId) rowsQuery.in("node_id", Array.from(scopedNodeIds));

  const rowsResult = scopedNodeIds.size === 0 && resolvedActiveTabId
    ? { data: [], error: null }
    : await rowsQuery
      .order("sort_order", { ascending: true })
      .limit(DEFAULT_ROW_LIMIT);
  if (rowsResult.error) throw rowsResult.error;

  const rows = (rowsResult.data ?? []) as AiEstimateRowSearchRow[];
  const compacted = compactEstimateTree({ nodes, rows });
  const compactEstimateSummary = compactEstimate({
    estimate: estimate as AiEstimateSearchRow,
    total: rows.reduce((total, row) => total + calculateRowTotal(row), 0),
    nodeCount: nodes.length,
    rowCount: rows.length,
    firstNodeId: selectedNodeId && nodes.some((node) => node.id === selectedNodeId) ? selectedNodeId : compacted.tree[0]?.id ?? null,
    activeTabId: resolvedActiveTabId,
  });

  return {
    estimate: compactEstimateSummary,
    tree: compacted.tree,
    areaRows: compacted.areaRows,
    nodeRowsRead: nodes.length,
    areaRowsRead: rows.length,
  };
}

async function searchScopedComponentSummaries({
  workspaceId,
  terms,
}: {
  workspaceId: string;
  terms: string[];
}) {
  const supabase = await createSupabaseServerClient();
  const { data: items, error: itemError } = await supabase
    .from("cost_library_items")
    .select("id, name, description, category, category_node_id, library_folder_id, supplier, supplier_id, brand, brand_id, unit, unit_cost, misc_cost, lifecycle_state, current_version_number, active_price_option_id, confidence, workspace_id")
    .eq("workspace_id", workspaceId)
    .neq("lifecycle_state", "archived")
    .neq("lifecycle_state", "discontinued")
    .or(buildSearchOrFilter(["name", "description", "category", "supplier", "brand"], terms))
    .limit(DEFAULT_RESULT_LIMIT * 4);
  if (itemError) throw itemError;

  const itemRows = (items ?? []) as AiComponentSearchItem[];
  const priceOptionByItemId = new Map<string, AiComponentSearchPriceOption>();
  const categoryPathById = new Map<string, string[]>();
  const folderById = new Map<string, AiLibraryFolderSearchRow>();
  let priceOptionRowsRead = 0;
  let categoryRowsRead = 0;
  let folderRowsRead = 0;
  const activePriceOptionIds = itemRows.map((item) => item.active_price_option_id).filter((id): id is string => Boolean(id));
  if (activePriceOptionIds.length > 0) {
    const { data: priceOptions, error: priceOptionError } = await supabase
      .from("cost_library_item_price_options")
      .select("id, item_id, unit, unit_cost, misc_cost, currency, is_active, is_default, updated_at, confidence, supplier_id")
      .eq("workspace_id", workspaceId)
      .eq("is_active", true)
      .in("id", activePriceOptionIds);
    if (priceOptionError) throw priceOptionError;
    const priceOptionRows = (priceOptions ?? []) as AiComponentSearchPriceOption[];
    priceOptionRowsRead = priceOptionRows.length;
    for (const option of priceOptionRows) {
      priceOptionByItemId.set(option.item_id, option);
    }
  }
  const hasCategoryNodes = itemRows.some((item) => Boolean(item.category_node_id));
  if (hasCategoryNodes) {
    const { data: categoryRows, error: categoryError } = await supabase
      .from("component_category_nodes")
      .select("id, parent_id, label, node_type, sort_order, code, metadata")
      .order("sort_order", { ascending: true });
    if (categoryError) throw categoryError;
    const rows = (categoryRows ?? []) as ComponentLibraryCategoryRow[];
    categoryRowsRead = rows.length;
    const categoryTree = buildComponentCategoryTreeFromRows(rows);
    for (const item of itemRows) {
      if (!item.category_node_id || categoryPathById.has(item.category_node_id)) continue;
      const categoryPath = findComponentCategoryPath(categoryTree, item.category_node_id);
      if (categoryPath) categoryPathById.set(item.category_node_id, categoryPath);
    }
  }
  const hasLibraryFolders = itemRows.some((item) => Boolean(item.library_folder_id));
  if (hasLibraryFolders) {
    const { data: folderRows, error: folderError } = await supabase
      .from("library_folders")
      .select("id, workspace_id, parent_id, name, sort_order, source_category_node_id, folder_kind")
      .eq("workspace_id", workspaceId)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (folderError) throw folderError;
    const rows = (folderRows ?? []) as AiLibraryFolderSearchRow[];
    folderRowsRead = rows.length;
    for (const folder of rows) folderById.set(folder.id, folder);
  }

  const readFolderPath = (folderId: string | null) => {
    if (!folderId) return [] as string[];
    const path: string[] = [];
    const seen = new Set<string>();
    let current = folderById.get(folderId);
    while (current && !seen.has(current.id)) {
      seen.add(current.id);
      path.unshift(current.name);
      current = current.parent_id ? folderById.get(current.parent_id) : undefined;
    }
    return path;
  };

  const matches = filterMap(itemRows, (item) => {
      const priceOption = priceOptionByItemId.get(item.id);
      const categoryPath = item.category_node_id ? categoryPathById.get(item.category_node_id) : undefined;
      const folder = item.library_folder_id ? folderById.get(item.library_folder_id) : undefined;
      const libraryFolderPath = readFolderPath(item.library_folder_id);
      const summary: PackageBuilderComponentSummary = {
        id: item.id,
        material: item.name,
        description: item.description,
        category: categoryPath?.at(-1) ?? item.category,
        categoryNodeId: item.category_node_id,
        categoryPath: categoryPath?.length ? categoryPath : [item.category],
        libraryFolderId: item.library_folder_id,
        libraryFolderName: folder?.name ?? null,
        libraryFolderPath,
        supplier: item.supplier,
        supplierId: priceOption?.supplier_id ?? item.supplier_id,
        brand: item.brand,
        unit: priceOption?.unit ?? item.unit,
        unitCost: priceOption?.unit_cost ?? item.unit_cost,
        miscCost: priceOption?.misc_cost ?? item.misc_cost,
        currency: priceOption?.currency ?? "PHP",
        lifecycleState: item.lifecycle_state,
        priceOptionId: priceOption?.id ?? null,
        priceOptionUpdatedAt: priceOption?.updated_at ?? null,
        sourceLibraryItemId: item.id,
        currentVersionNumber: item.current_version_number,
        confidence: priceOption?.confidence ?? item.confidence,
      };
      const score = scoreComponentSummary(summary, terms);
      return score > 0 ? { item: summary, score } : null;
    })
    .sort((left, right) => right.score - left.score || left.item.material.localeCompare(right.item.material))
    .slice(0, DEFAULT_RESULT_LIMIT)
    .map(({ item }) => item);

  return {
    matches,
    rowCount: itemRows.length + priceOptionRowsRead + categoryRowsRead + folderRowsRead,
  };
}

function scoreHistoricalRowMatch(row: PackageBuilderHistoricalRowMatch, terms: string[]) {
  const haystack = normalizeSearchText([
    row.projectName,
    row.estimateName,
    row.areaName,
    row.material,
    row.description,
    row.supplier,
  ].filter(Boolean).join(" "));
  return terms.reduce((score, term) => score + (haystack.includes(term) ? 1 : 0), 0);
}

async function searchScopedHistoricalEstimateRows({
  projects,
  currentEstimateId,
  terms,
}: {
  projects: PackageBuilderCompactProject[];
  currentEstimateId: string | null;
  terms: string[];
}) {
  const projectIds = projects.map((project) => project.id);
  if (projectIds.length === 0) {
    return { matches: [] as PackageBuilderHistoricalRowMatch[], rowCount: 0 };
  }

  const supabase = await createSupabaseServerClient();
  const { data: estimates, error: estimateError } = await supabase
    .from("estimates")
    .select("id, project_id, name, sheet_code, updated_at")
    .in("project_id", projectIds)
    .order("updated_at", { ascending: false })
    .limit(DEFAULT_HISTORICAL_ESTIMATE_LIMIT);
  if (estimateError) throw estimateError;

  const estimateRows = (estimates ?? []) as AiEstimateSearchRow[];
  const historicalEstimateIds = filterMapBy(
    estimateRows,
    (estimate) => estimate.id !== currentEstimateId,
    (estimate) => estimate.id,
  );
  if (historicalEstimateIds.length === 0) {
    return { matches: [] as PackageBuilderHistoricalRowMatch[], rowCount: projects.length + estimateRows.length };
  }

  const [nodesResult, rowsResult] = await Promise.all([
    supabase
      .from("estimate_nodes")
      .select("id, estimate_id, parent_id, kind, name, sort_order")
      .in("estimate_id", historicalEstimateIds)
      .order("sort_order", { ascending: true })
      .limit(DEFAULT_TREE_LIMIT),
    supabase
      .from("estimate_row_items")
      .select("id, estimate_id, node_id, material, description, supplier, quantity, quantity_base, quantity_contingency_amount, unit, unit_cost, contingency_percentage, misc_cost, source_library_item_id, updated_at")
      .in("estimate_id", historicalEstimateIds)
      .or(buildSearchOrFilter(["material", "description", "supplier"], terms))
      .order("updated_at", { ascending: false })
      .order("sort_order", { ascending: true })
      .limit(DEFAULT_HISTORICAL_ROW_LIMIT),
  ]);
  if (nodesResult.error) throw nodesResult.error;
  if (rowsResult.error) throw rowsResult.error;

  const nodes = (nodesResult.data ?? []) as AiEstimateNodeSearchRow[];
  const rows = (rowsResult.data ?? []) as AiEstimateRowSearchRow[];
  const projectById = new Map(projects.map((project) => [project.id, project]));
  const estimateById = new Map(estimateRows.map((estimate) => [estimate.id, estimate]));
  const nodeById = new Map(nodes.map((node) => [node.id, node]));

  const scoredMatches = rows.map((row) => {
    const estimate = estimateById.get(row.estimate_id);
    const project = estimate ? projectById.get(estimate.project_id) : null;
    const node = nodeById.get(row.node_id);
    const match: PackageBuilderHistoricalRowMatch = {
      id: row.id,
      projectId: project?.id ?? "",
      projectName: project?.name ?? "Prior project",
      estimateId: estimate?.id ?? row.estimate_id,
      estimateName: estimate?.name ?? "Prior estimate",
      areaName: node?.kind === "area" ? node.name : null,
      material: row.material,
      description: row.description ?? "",
      supplier: row.supplier ?? null,
      quantity: row.quantity,
      unit: row.unit,
      unitCost: row.unit_cost,
      miscCost: row.misc_cost,
      total: calculateRowTotal(row),
      sourceLibraryItemId: row.source_library_item_id,
      updatedAt: row.updated_at ?? estimate?.updated_at ?? "",
    };
    return { match, score: scoreHistoricalRowMatch(match, terms) };
  });

  return {
    matches: scoredMatches
      .filter(({ score }) => score > 0)
      .sort((left, right) => right.score - left.score || right.match.updatedAt.localeCompare(left.match.updatedAt) || left.match.material.localeCompare(right.match.material))
      .slice(0, DEFAULT_RESULT_LIMIT)
      .map(({ match }) => match),
    rowCount: projects.length + estimateRows.length + nodes.length + rows.length,
  };
}

function roundRatio(value: number) {
  return Math.round(value * 100) / 100;
}

function sourceLibraryCoverageRatio(rows: AiEstimateRowSearchRow[]) {
  if (rows.length === 0) return 0;
  return roundRatio(rows.filter((row) => Boolean(row.source_library_item_id)).length / rows.length);
}

function matchedComparableTerms({
  project,
  estimate,
  nodes,
  rows,
  terms,
}: {
  project: PackageBuilderCompactProject | undefined;
  estimate: AiEstimateSearchRow;
  nodes: AiEstimateNodeSearchRow[];
  rows: AiEstimateRowSearchRow[];
  terms: string[];
}) {
  const haystack = normalizeSearchText([
    project?.name,
    project?.projectCode,
    estimate.name,
    estimate.sheet_code,
    ...nodes.map((node) => node.name),
    ...rows.flatMap((row) => [row.material, row.description, row.supplier]),
  ].filter(Boolean).join(" "));
  return terms.filter((term) => haystack.includes(term)).slice(0, 12);
}

function comparableRowPreview({
  areaName,
  row,
}: {
  areaName: string | null;
  row: AiEstimateRowSearchRow;
}): PackageBuilderComparablePackageRowPreview {
  return {
    areaName,
    material: row.material,
    description: row.description ?? "",
    supplier: row.supplier ?? null,
    quantity: row.quantity,
    unit: row.unit,
    unitCost: row.unit_cost,
    miscCost: row.misc_cost,
    contingencyPercentage: row.contingency_percentage,
    total: calculateRowTotal(row),
    sourceType: row.source_library_item_id ? "library" : "project",
  };
}

function topMaterialsForRows(rows: AiEstimateRowSearchRow[]) {
  const seen = new Set<string>();
  const materials: string[] = [];
  for (const row of rows) {
    const material = row.material.trim();
    const id = normalizeSearchText(material);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    materials.push(material);
    if (materials.length >= DEFAULT_COMPARABLE_ROW_PREVIEW_LIMIT) break;
  }
  return materials;
}

function buildComparableAreaPatterns({
  nodes,
  rows,
}: {
  nodes: AiEstimateNodeSearchRow[];
  rows: AiEstimateRowSearchRow[];
}) {
  const areaNodes = nodes.filter((node) => node.kind === "area");
  const areaNodeById = new Map(areaNodes.map((node) => [node.id, node]));
  const rowsByAreaName = new Map<string, AiEstimateRowSearchRow[]>();
  for (const row of rows) {
    const areaName = areaNodeById.get(row.node_id)?.name ?? "Unscoped";
    rowsByAreaName.set(areaName, [...(rowsByAreaName.get(areaName) ?? []), row]);
  }

  const areaOrder = new Map(areaNodes.map((node, index) => [node.name, node.sort_order * 1000 + index]));
  return [...rowsByAreaName.entries()]
    .map(([areaName, areaRows]) => ({
      areaName,
      rowCount: areaRows.length,
      total: areaRows.reduce((sum, row) => sum + calculateRowTotal(row), 0),
      sourceLibraryCoverageRatio: sourceLibraryCoverageRatio(areaRows),
      topMaterials: topMaterialsForRows(areaRows),
      rowPreviews: areaRows
        .slice(0, DEFAULT_COMPARABLE_ROW_PREVIEW_LIMIT)
        .map((row) => comparableRowPreview({ areaName: areaName === "Unscoped" ? null : areaName, row })),
    }))
    .sort((left, right) => (areaOrder.get(left.areaName) ?? Number.MAX_SAFE_INTEGER) - (areaOrder.get(right.areaName) ?? Number.MAX_SAFE_INTEGER) || left.areaName.localeCompare(right.areaName))
    .slice(0, DEFAULT_COMPARABLE_AREA_LIMIT);
}

async function searchScopedComparableEstimatePackages({
  projects,
  currentEstimateId,
  terms,
}: {
  projects: PackageBuilderCompactProject[];
  currentEstimateId: string | null;
  terms: string[];
}) {
  const projectIds = projects.map((project) => project.id);
  if (projectIds.length === 0) {
    return { matches: [] as PackageBuilderComparableEstimatePackage[], rowCount: 0 };
  }

  const supabase = await createSupabaseServerClient();
  const { data: estimates, error: estimateError } = await supabase
    .from("estimates")
    .select("id, project_id, name, sheet_code, updated_at")
    .in("project_id", projectIds)
    .order("updated_at", { ascending: false })
    .limit(DEFAULT_HISTORICAL_ESTIMATE_LIMIT);
  if (estimateError) throw estimateError;

  const estimateRows = (estimates ?? []) as AiEstimateSearchRow[];
  const comparableEstimates = estimateRows.filter((estimate) => estimate.id !== currentEstimateId);
  const comparableEstimateIds = comparableEstimates.map((estimate) => estimate.id);
  if (comparableEstimateIds.length === 0) {
    return { matches: [] as PackageBuilderComparableEstimatePackage[], rowCount: projects.length + comparableEstimates.length };
  }

  const [nodesResult, rowsResult] = await Promise.all([
    supabase
      .from("estimate_nodes")
      .select("id, estimate_id, parent_id, kind, name, sort_order")
      .in("estimate_id", comparableEstimateIds)
      .order("sort_order", { ascending: true })
      .limit(DEFAULT_COMPARABLE_TREE_LIMIT),
    supabase
      .from("estimate_row_items")
      .select("id, estimate_id, node_id, material, description, supplier, quantity, quantity_base, quantity_contingency_amount, unit, unit_cost, contingency_percentage, misc_cost, source_library_item_id, updated_at")
      .in("estimate_id", comparableEstimateIds)
      .order("updated_at", { ascending: false })
      .order("sort_order", { ascending: true })
      .limit(DEFAULT_COMPARABLE_ROW_LIMIT),
  ]);
  if (nodesResult.error) throw nodesResult.error;
  if (rowsResult.error) throw rowsResult.error;

  const nodes = (nodesResult.data ?? []) as AiEstimateNodeSearchRow[];
  const rows = (rowsResult.data ?? []) as AiEstimateRowSearchRow[];
  const projectById = new Map(projects.map((project) => [project.id, project]));
  const nodesByEstimateId = new Map<string, AiEstimateNodeSearchRow[]>();
  const rowsByEstimateId = new Map<string, AiEstimateRowSearchRow[]>();
  for (const node of nodes) nodesByEstimateId.set(node.estimate_id, [...(nodesByEstimateId.get(node.estimate_id) ?? []), node]);
  for (const row of rows) rowsByEstimateId.set(row.estimate_id, [...(rowsByEstimateId.get(row.estimate_id) ?? []), row]);

  const scoredPackages = comparableEstimates.map((estimate) => {
    const project = projectById.get(estimate.project_id);
    const estimateNodes = nodesByEstimateId.get(estimate.id) ?? [];
    const estimateRowsForPackage = rowsByEstimateId.get(estimate.id) ?? [];
    const matchedTerms = matchedComparableTerms({
      project,
      estimate,
      nodes: estimateNodes,
      rows: estimateRowsForPackage,
      terms,
    });
    const areas = buildComparableAreaPatterns({ nodes: estimateNodes, rows: estimateRowsForPackage });
    const match: PackageBuilderComparableEstimatePackage = {
      projectId: project?.id ?? "",
      projectName: project?.name ?? "Prior project",
      estimateId: estimate.id,
      estimateName: estimate.name,
      sheetCode: estimate.sheet_code ?? null,
      updatedAt: estimate.updated_at ?? "",
      matchedTerms,
      areaCount: areas.length,
      rowCount: estimateRowsForPackage.length,
      total: estimateRowsForPackage.reduce((sum, row) => sum + calculateRowTotal(row), 0),
      sourceLibraryCoverageRatio: sourceLibraryCoverageRatio(estimateRowsForPackage),
      areas,
    };
    return { match, score: matchedTerms.length };
  });

  return {
    matches: scoredPackages
      .filter(({ score, match }) => score > 0 && match.rowCount > 0)
      .sort((left, right) => right.score - left.score || right.match.updatedAt.localeCompare(left.match.updatedAt) || left.match.estimateName.localeCompare(right.match.estimateName))
      .slice(0, DEFAULT_COMPARABLE_PACKAGE_LIMIT)
      .map(({ match }) => match),
    rowCount: projects.length + comparableEstimates.length + nodes.length + rows.length,
  };
}

async function searchScopedTemplateSummaries({
  workspaceId,
  terms,
}: {
  workspaceId: string;
  terms: string[];
}) {
  const supabase = await createSupabaseServerClient();
  const { data: templates, error: templateError } = await supabase
    .from("estimate_templates")
    .select("id, name, description, category")
    .eq("workspace_id", workspaceId)
    .or(buildSearchOrFilter(["name", "description", "category"], terms))
    .order("sort_order", { ascending: true })
    .limit(DEFAULT_RESULT_LIMIT);
  if (templateError) throw templateError;

  const templateRows = (templates ?? []) as AiTemplateSearchRow[];
  const templateIds = templateRows.map((template) => template.id);
  if (templateIds.length === 0) return { matches: [] as PackageBuilderTemplateSummary[], rowCount: 0 };

  const [nodesResult, rowsResult] = await Promise.all([
    supabase
      .from("estimate_template_nodes")
      .select("id, template_id, kind, name")
      .in("template_id", templateIds)
      .limit(DEFAULT_TREE_LIMIT),
    supabase
      .from("estimate_template_row_items")
      .select("id, template_id, template_node_id, material, description, supplier, quantity, unit, unit_cost, contingency_percentage, misc_cost, sort_order")
      .in("template_id", templateIds)
      .order("sort_order", { ascending: true })
      .limit(DEFAULT_ROW_LIMIT),
  ]);
  if (nodesResult.error) throw nodesResult.error;
  if (rowsResult.error) throw rowsResult.error;

  const nodes = (nodesResult.data ?? []) as AiTemplateNodeSearchRow[];
  const rows = (rowsResult.data ?? []) as AiTemplateRowSearchRow[];
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const matches = templateRows.map((template) => {
    const templateNodes = nodes.filter((node) => node.template_id === template.id);
    const templateRowsForTemplate = rows.filter((row) => row.template_id === template.id);
    return {
      id: template.id,
      name: template.name,
      description: template.description,
      category: template.category,
      nodeCount: templateNodes.length,
      rowCount: templateRowsForTemplate.length,
      areaNames: filterMapBy(templateNodes, (node) => node.kind === "area", (node) => node.name).slice(0, 16),
      rowPreviews: templateRowsForTemplate
        .map((row) => {
          const node = nodeById.get(row.template_node_id);
          return {
            id: row.id,
            templateId: row.template_id,
            templateNodeId: row.template_node_id,
            areaName: node?.kind === "area" ? node.name : null,
            material: row.material,
            description: row.description ?? "",
            supplier: row.supplier ?? null,
            quantity: row.quantity,
            unit: row.unit,
            unitCost: row.unit_cost,
            miscCost: row.misc_cost,
            contingencyPercentage: row.contingency_percentage,
            total: calculateRowTotal(row),
          };
        })
        .slice(0, 16),
    };
  });

  return {
    matches,
    rowCount: templateRows.length + nodes.length + rows.length,
  };
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
): Promise<PackageBuilderReadToolsData> {
  const workspaceId = input.userContext.authMode === "supabase" && input.userContext.workspaceId ? input.userContext.workspaceId : null;
  if (!workspaceId) throw new Error("Package-builder read tools require an authenticated workspace.");

  const auditEvents: PackageBuilderReadAuditEvent[] = [];

  const workspaceResult = await readScopedWorkspaceContext({ workspaceId });
  auditEvents.push(createAuditEvent({
    input,
    toolName: "read_current_workspace_context",
    sourceTables: ["workspaces"],
    rowCount: workspaceResult.rowCount,
    safeSummary: "Read current workspace display context for package drafting.",
  }));

  const projectsResult = await listScopedProjectSummaries({ workspaceId });
  const projects = projectsResult.projects;
  auditEvents.push(createAuditEvent({
    input,
    toolName: "list_accessible_projects",
    sourceTables: ["projects"],
    rowCount: projectsResult.rowCount,
    safeSummary: "Listed compact accessible project summaries for package drafting.",
  }));

  const projectId = readRouteId(input.routeContext, "projectId");
  const estimateId = readRouteId(input.routeContext, "estimateId");
  const selectedNodeId = readRouteId(input.routeContext, "selectedNodeId");
  const activeTabId = readRouteId(input.routeContext, "activeTabId");
  let projectSummary: PackageBuilderCompactProject | null = null;
  let projectEstimates: PackageBuilderCompactEstimate[] = [];
  let estimateSummary: PackageBuilderCompactEstimate | null = null;
  let estimateTree: PackageBuilderCompactTreeNode[] = [];
  let areaRows: PackageBuilderCompactAreaRow[] = [];

  if (projectId) {
    const projectResult = await readScopedProjectSummary({ workspaceId, projectId });
    projectSummary = projectResult.project;
    auditEvents.push(createAuditEvent({
      input,
      toolName: "read_project_summary",
      sourceTables: ["projects"],
      rowCount: projectResult.rowCount,
      filter: { projectId },
      safeSummary: "Read compact project summary for the route-selected project.",
    }));

    const estimatesResult = projectSummary ? await listScopedEstimateSummaries({ projectId }) : { estimates: [] as PackageBuilderCompactEstimate[], rowCount: 0 };
    projectEstimates = estimatesResult.estimates;
    estimateSummary = estimateId
      ? projectEstimates.find((estimate) => estimate.id === estimateId) ?? null
      : selectedNodeId
        ? null
        : projectEstimates[0] ?? null;
    auditEvents.push(createAuditEvent({
      input,
      toolName: "list_project_estimates",
      sourceTables: ["estimates", "estimate_nodes", "estimate_row_items"],
      rowCount: estimatesResult.rowCount,
      filter: { projectId },
      safeSummary: "Listed compact estimate summaries for the route-selected project.",
    }));
  }

  if (projectId && projectSummary && (estimateSummary?.id || selectedNodeId)) {
    const treeResult = await readScopedEstimateTree({
      projectId,
      estimateId: estimateSummary?.id ?? estimateId,
      selectedNodeId,
      activeTabId,
    });
    if (treeResult.estimate) estimateSummary = treeResult.estimate;
    estimateTree = treeResult.tree;
    areaRows = treeResult.areaRows;
    auditEvents.push(createAuditEvent({
      input,
      toolName: "read_estimate_summary",
      sourceTables: ["estimates"],
      rowCount: treeResult.estimate ? 1 : 0,
      filter: { projectId, estimateId: treeResult.estimate?.id ?? estimateSummary?.id, selectedNodeId, activeTabId: treeResult.estimate?.activeTabId ?? activeTabId },
      safeSummary: "Read compact estimate summary for package context.",
    }));
    auditEvents.push(createAuditEvent({
      input,
      toolName: "read_estimate_tree",
      sourceTables: ["estimate_nodes"],
      rowCount: treeResult.nodeRowsRead,
      filter: { projectId, estimateId: treeResult.estimate?.id ?? estimateSummary?.id, selectedNodeId, activeTabId: treeResult.estimate?.activeTabId ?? activeTabId },
      safeSummary: "Read compact estimate tree for package context.",
    }));
    auditEvents.push(createAuditEvent({
      input,
      toolName: "read_area_rows",
      sourceTables: ["estimate_row_items"],
      rowCount: treeResult.areaRowsRead,
      filter: { projectId, estimateId: treeResult.estimate?.id ?? estimateSummary?.id, selectedNodeId, activeTabId: treeResult.estimate?.activeTabId ?? activeTabId },
      safeSummary: "Read compact Area Node row summaries for package context.",
    }));
  }

  const terms = getPackageSearchTerms(input.message);
  const currentEstimateId = estimateSummary?.id ?? estimateId;
  const historicalSearch = await searchScopedHistoricalEstimateRows({
    projects,
    currentEstimateId,
    terms,
  });
  const historicalRowMatches = historicalSearch.matches;
  auditEvents.push(createAuditEvent({
    input,
    toolName: "search_historical_estimate_rows",
    sourceTables: ["projects", "estimates", "estimate_nodes", "estimate_row_items"],
    rowCount: historicalSearch.rowCount,
    filter: {
      terms,
      projectLimit: DEFAULT_RESULT_LIMIT,
      estimateLimit: DEFAULT_HISTORICAL_ESTIMATE_LIMIT,
      rowLimit: DEFAULT_HISTORICAL_ROW_LIMIT,
      excludedEstimateId: currentEstimateId,
    },
    safeSummary: "Searched compact prior estimate rows for package precedent hints.",
  }));

  const comparableSearch = await searchScopedComparableEstimatePackages({
    projects,
    currentEstimateId,
    terms,
  });
  const comparableEstimatePackages = comparableSearch.matches;
  auditEvents.push(createAuditEvent({
    input,
    toolName: "search_comparable_estimate_packages",
    sourceTables: ["projects", "estimates", "estimate_nodes", "estimate_row_items"],
    rowCount: comparableSearch.rowCount,
    filter: {
      terms,
      projectLimit: DEFAULT_RESULT_LIMIT,
      estimateLimit: DEFAULT_HISTORICAL_ESTIMATE_LIMIT,
      treeLimit: DEFAULT_COMPARABLE_TREE_LIMIT,
      rowLimit: DEFAULT_COMPARABLE_ROW_LIMIT,
      excludedEstimateId: currentEstimateId,
    },
    safeSummary: "Searched compact comparable estimate packages for room and row pattern hints.",
  }));

  const componentSearch = await searchScopedComponentSummaries({ workspaceId, terms });
  const componentMatches = componentSearch.matches;
  auditEvents.push(createAuditEvent({
    input,
    toolName: "search_component_library",
    sourceTables: ["cost_library_items", "cost_library_item_price_options", "component_category_nodes", "library_folders"],
    rowCount: componentSearch.rowCount,
    filter: { terms },
    safeSummary: "Searched compact workspace component-library summaries for package drafting.",
  }));

  const templateSearch = await searchScopedTemplateSummaries({ workspaceId, terms });
  const templateMatches = templateSearch.matches;
  auditEvents.push(createAuditEvent({
    input,
    toolName: "search_estimate_templates",
    sourceTables: ["estimate_templates", "estimate_template_nodes", "estimate_template_row_items"],
    rowCount: templateSearch.rowCount,
    filter: { terms },
    safeSummary: "Searched compact workspace estimate-template summaries for package drafting.",
  }));

  let memoryPreferences = EMPTY_PACKAGE_BUILDER_MEMORY_PREFERENCES;
  if (input.memoryEnabled) {
    memoryPreferences = await readPackageBuilderMemoryPreferences({ userContext: input.userContext });
    auditEvents.push(createAuditEvent({
      input,
      toolName: "read_package_builder_memory_preferences",
      sourceTables: ["ai_package_builder_memory_preferences"],
      rowCount: memoryPreferences.sourceRowCount,
      safeSummary: "Read compact package-builder memory preference signals for ranking hints.",
    }));
  }

  return {
    workspace: workspaceResult.workspace,
    projects,
    projectSummary,
    projectEstimates,
    estimateSummary,
    estimateTree,
    areaRows,
    historicalRowMatches,
    comparableEstimatePackages,
    componentMatches,
    templateMatches,
    memoryPreferences,
    auditEvents,
  };
}
