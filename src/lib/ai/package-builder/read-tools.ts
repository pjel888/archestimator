import { isProviderBackedAiUserContext, type AiRequestUserContext } from "@/lib/ai/auth";
import { buildAiPackageDataAccessEvent, buildAiPackageToolCall } from "@/lib/ai/audit";
import type { AiDataAccessAuditRow, AiToolCallAuditRow } from "@/lib/ai/audit-d1-store";
import {
  EMPTY_PACKAGE_BUILDER_MEMORY_PREFERENCES,
  readPackageBuilderMemoryPreferences,
  type PackageBuilderMemoryPreferences,
} from "@/lib/ai/package-builder/memory";
import { resolveComponentCategory } from "@/lib/component-library/category-folders";
import { getCloudflareD1Database, type D1DatabaseLike, type D1Value } from "@/lib/cloudflare/d1";
import { isUuid } from "@/lib/ids";
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
  adjustmentPercentage?: number;
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
  adjustmentPercentage?: number;
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
  categoryId?: string | null;
  categoryNodeId?: string | null;
  categoryPath: string[];
  categoryPathIds?: string[];
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
  adjustmentPercentage?: number;
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
  toolCall: AiToolCallAuditRow | null;
  dataAccessEvent: AiDataAccessAuditRow | null;
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

function escapeD1LikeTerm(term: string) {
  return term.replace(/[\\%_]/g, (match) => `\\${match}`);
}

function buildSearchWhere(columns: string[], terms: string[]) {
  const clauses: string[] = [];
  const values: D1Value[] = [];
  for (const term of terms.slice(0, DEFAULT_SEARCH_FILTER_TERM_LIMIT)) {
    const safeTerm = `%${escapeD1LikeTerm(term)}%`;
    for (const column of columns) {
      clauses.push(`lower(coalesce(${column}, '')) LIKE ? ESCAPE '\\'`);
      values.push(safeTerm);
    }
  }
  return {
    sql: clauses.length > 0 ? `(${clauses.join(" OR ")})` : "1 = 1",
    values,
  };
}

function readRowAdjustmentPercentage(row: {
  quantity_base?: number | null;
  contingency_percentage?: number | null;
  adjustment_percentage?: number | null;
}) {
  if (row.adjustment_percentage !== undefined) return Number(row.adjustment_percentage ?? 0);
  return row.quantity_base === null || row.quantity_base === undefined ? Number(row.contingency_percentage ?? 0) : 0;
}

function calculateRowTotal(row: {
  quantity: number;
  quantity_base?: number | null;
  unit_cost: number;
  misc_cost: number;
  contingency_percentage?: number | null;
  adjustment_percentage?: number | null;
}) {
  const base = Number(row.quantity) * Number(row.unit_cost);
  return base + Number(row.misc_cost) + (base * readRowAdjustmentPercentage(row)) / 100;
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
        adjustmentPercentage: readRowAdjustmentPercentage(row),
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
  adjustment_percentage?: number | null;
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
  adjustment_percentage?: number | null;
  misc_cost: number;
  row_revision?: number;
  source_library_item_id: string | null;
  updated_at?: string;
};

function placeholders(values: readonly unknown[]) {
  if (values.length === 0) throw new Error("At least one SQL placeholder is required.");
  return values.map(() => "?").join(", ");
}

async function requirePackageBuilderReadD1Database() {
  const database = await getCloudflareD1Database();
  if (!database) {
    throw new Error("Cloudflare D1 ARCH_DB binding is required for package-builder read tools.");
  }
  return database;
}

async function first<T>(database: D1DatabaseLike, sql: string, values: D1Value[] = []) {
  return database.prepare<T>(sql).bind(...values).first<T>();
}

async function all<T>(database: D1DatabaseLike, sql: string, values: D1Value[] = []) {
  const result = await database.prepare<T>(sql).bind(...values).all<T>();
  if (result.success === false) throw new Error("Cloudflare D1 package-builder read failed.");
  return result.results ?? [];
}

async function readScopedWorkspaceContext({ workspaceId }: { workspaceId: string }) {
  const database = await requirePackageBuilderReadD1Database();
  const data = await first<{ name: string | null }>(
    database,
    `
      SELECT name
      FROM workspaces
      WHERE id = ?
      LIMIT 1
    `,
    [workspaceId],
  );

  return {
    workspace: { name: typeof data?.name === "string" ? data.name : null },
    rowCount: data ? 1 : 0,
  };
}

async function listScopedProjectSummaries({ workspaceId }: { workspaceId: string }) {
  const database = await requirePackageBuilderReadD1Database();
  const data = await all<AiProjectSearchRow>(
    database,
    `
      SELECT id, name, client_name, location, project_code, updated_at
      FROM projects
      WHERE workspace_id = ?
      ORDER BY updated_at DESC
      LIMIT ?
    `,
    [workspaceId, DEFAULT_RESULT_LIMIT],
  );

  const rows = data;
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
  const database = await requirePackageBuilderReadD1Database();
  const data = await first<AiProjectSearchRow>(
    database,
    `
      SELECT id, name, client_name, location, project_code, updated_at
      FROM projects
      WHERE workspace_id = ?
        AND id = ?
      LIMIT 1
    `,
    [workspaceId, projectId],
  );

  const row = data;
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
  const database = await requirePackageBuilderReadD1Database();
  const estimates = await all<AiEstimateSearchRow>(
    database,
    `
      SELECT id, project_id, name, sheet_code, updated_at
      FROM estimates
      WHERE project_id = ?
      ORDER BY updated_at DESC
      LIMIT ?
    `,
    [projectId, DEFAULT_RESULT_LIMIT],
  );

  const estimateRows = estimates;
  const estimateIds = estimateRows.map((estimate) => estimate.id);
  if (estimateIds.length === 0) {
    return { estimates: [] as PackageBuilderCompactEstimate[], rowCount: 0 };
  }

  const estimateIdSql = placeholders(estimateIds);
  const [nodesResult, rowsResult] = await Promise.all([
    all<Pick<AiEstimateNodeSearchRow, "id" | "estimate_id" | "kind" | "sort_order">>(
      database,
      `
        SELECT id, estimate_id, kind, sort_order
        FROM estimate_nodes
        WHERE estimate_id IN (${estimateIdSql})
        ORDER BY sort_order ASC
        LIMIT ?
      `,
      [...estimateIds, DEFAULT_TREE_LIMIT],
    ),
    all<Pick<AiEstimateRowSearchRow, "estimate_id" | "quantity" | "quantity_base" | "quantity_contingency_amount" | "unit_cost" | "contingency_percentage" | "adjustment_percentage" | "misc_cost">>(
      database,
      `
        SELECT estimate_id, quantity, quantity_base, quantity_contingency_amount, unit_cost, contingency_percentage, adjustment_percentage, misc_cost
        FROM estimate_row_items
        WHERE estimate_id IN (${estimateIdSql})
        LIMIT ?
      `,
      [...estimateIds, DEFAULT_ROW_LIMIT],
    ),
  ]);

  const nodes = nodesResult;
  const rows = rowsResult;
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
  const database = await requirePackageBuilderReadD1Database();
  let resolvedEstimateId = estimateId;
  let resolvedActiveTabId = activeTabId;
  if (!resolvedEstimateId && selectedNodeId) {
    const selectedNode = await first<Pick<AiEstimateNodeSearchRow, "id" | "estimate_id" | "estimate_tab_id">>(
      database,
      `
        SELECT id, estimate_id, estimate_tab_id
        FROM estimate_nodes
        WHERE id = ?
        LIMIT 1
      `,
      [selectedNodeId],
    );
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

  const estimate = await first<AiEstimateSearchRow>(
    database,
    `
      SELECT id, project_id, name, sheet_code
      FROM estimates
      WHERE id = ?
        AND project_id = ?
      LIMIT 1
    `,
    [resolvedEstimateId, projectId],
  );
  if (!estimate) {
    return {
      estimate: null as PackageBuilderCompactEstimate | null,
      tree: [] as PackageBuilderCompactTreeNode[],
      areaRows: [] as PackageBuilderCompactAreaRow[],
      nodeRowsRead: 0,
      areaRowsRead: 0,
    };
  }

  const nodeValues: D1Value[] = [estimate.id];
  const activeTabSql = resolvedActiveTabId ? "AND estimate_tab_id = ?" : "";
  if (resolvedActiveTabId) nodeValues.push(resolvedActiveTabId);
  nodeValues.push(DEFAULT_TREE_LIMIT);
  const nodes = await all<AiEstimateNodeSearchRow>(
    database,
    `
      SELECT id, estimate_id, estimate_tab_id, parent_id, kind, name, sort_order
      FROM estimate_nodes
      WHERE estimate_id = ?
        ${activeTabSql}
      ORDER BY sort_order ASC
      LIMIT ?
    `,
    nodeValues,
  );
  const scopedNodeIds = new Set(nodes.map((node) => node.id));
  const nodeIds = Array.from(scopedNodeIds);
  const rows = scopedNodeIds.size === 0 && resolvedActiveTabId
    ? []
    : await all<AiEstimateRowSearchRow>(
      database,
      `
        SELECT id, estimate_id, node_id, material, quantity, quantity_base, quantity_contingency_amount, unit, unit_cost, contingency_percentage, adjustment_percentage, misc_cost, row_revision, source_library_item_id
        FROM estimate_row_items
        WHERE estimate_id = ?
          ${resolvedActiveTabId ? `AND node_id IN (${placeholders(nodeIds)})` : ""}
        ORDER BY sort_order ASC
        LIMIT ?
      `,
      resolvedActiveTabId ? [estimate.id, ...nodeIds, DEFAULT_ROW_LIMIT] : [estimate.id, DEFAULT_ROW_LIMIT],
    );
  const compacted = compactEstimateTree({ nodes, rows });
  const compactEstimateSummary = compactEstimate({
    estimate,
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
  const database = await requirePackageBuilderReadD1Database();
  const search = buildSearchWhere(["name", "description", "category", "supplier", "brand"], terms);
  const itemRows = await all<AiComponentSearchItem>(
    database,
    `
      SELECT id, name, description, category, category_node_id, library_folder_id, supplier, supplier_id, brand, brand_id, unit, unit_cost, misc_cost, lifecycle_state, current_version_number, active_price_option_id, workspace_id
      FROM cost_library_items
      WHERE workspace_id = ?
        AND lifecycle_state NOT IN ('archived', 'discontinued')
        AND ${search.sql}
      LIMIT ?
    `,
    [workspaceId, ...search.values, DEFAULT_RESULT_LIMIT * 4],
  );
  const priceOptionByItemId = new Map<string, AiComponentSearchPriceOption>();
  const folderById = new Map<string, AiLibraryFolderSearchRow>();
  let priceOptionRowsRead = 0;
  let folderRowsRead = 0;
  const activePriceOptionIds = itemRows.map((item) => item.active_price_option_id).filter((id): id is string => Boolean(id));
  if (activePriceOptionIds.length > 0) {
    const priceOptionRows = await all<AiComponentSearchPriceOption>(
      database,
      `
        SELECT id, item_id, unit, unit_cost, misc_cost, currency, is_active, is_default, updated_at, supplier_id
        FROM cost_library_item_price_options
        WHERE workspace_id = ?
          AND is_active = 1
          AND id IN (${placeholders(activePriceOptionIds)})
      `,
      [workspaceId, ...activePriceOptionIds],
    );
    priceOptionRowsRead = priceOptionRows.length;
    for (const option of priceOptionRows) {
      priceOptionByItemId.set(option.item_id, option);
    }
  }
  const hasLibraryFolders = itemRows.some((item) => Boolean(item.library_folder_id));
  if (hasLibraryFolders) {
    const rows = await all<AiLibraryFolderSearchRow>(
      database,
      `
        SELECT id, workspace_id, parent_id, name, sort_order, source_category_node_id, folder_kind
        FROM library_folders
        WHERE workspace_id = ?
        ORDER BY sort_order ASC, name ASC
      `,
      [workspaceId],
    );
    folderRowsRead = rows.length;
    for (const folder of rows) folderById.set(folder.id, folder);
  }
  const libraryFolders = [...folderById.values()];

  const matches = filterMap(itemRows, (item) => {
      const priceOption = priceOptionByItemId.get(item.id);
      const folder = item.library_folder_id ? folderById.get(item.library_folder_id) : undefined;
      const category = resolveComponentCategory(libraryFolders, item.library_folder_id, item.category);
      const summary: PackageBuilderComponentSummary = {
        id: item.id,
        material: item.name,
        description: item.description,
        category: category.category,
        categoryId: category.categoryId ?? null,
        categoryNodeId: item.category_node_id,
        categoryPath: category.categoryPath,
        categoryPathIds: category.categoryPathIds,
        libraryFolderId: item.library_folder_id,
        libraryFolderName: folder?.name ?? null,
        libraryFolderPath: category.categoryPath,
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
      };
      const score = scoreComponentSummary(summary, terms);
      return score > 0 ? { item: summary, score } : null;
    })
    .sort((left, right) => right.score - left.score || left.item.material.localeCompare(right.item.material))
    .slice(0, DEFAULT_RESULT_LIMIT)
    .map(({ item }) => item);

  return {
    matches,
    rowCount: itemRows.length + priceOptionRowsRead + folderRowsRead,
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

  const database = await requirePackageBuilderReadD1Database();
  const estimates = await all<AiEstimateSearchRow>(
    database,
    `
      SELECT id, project_id, name, sheet_code, updated_at
      FROM estimates
      WHERE project_id IN (${placeholders(projectIds)})
      ORDER BY updated_at DESC
      LIMIT ?
    `,
    [...projectIds, DEFAULT_HISTORICAL_ESTIMATE_LIMIT],
  );

  const estimateRows = estimates;
  const historicalEstimateIds = filterMapBy(
    estimateRows,
    (estimate) => estimate.id !== currentEstimateId,
    (estimate) => estimate.id,
  );
  if (historicalEstimateIds.length === 0) {
    return { matches: [] as PackageBuilderHistoricalRowMatch[], rowCount: projects.length + estimateRows.length };
  }

  const estimateSql = placeholders(historicalEstimateIds);
  const rowSearch = buildSearchWhere(["material", "description", "supplier"], terms);
  const [nodesResult, rowsResult] = await Promise.all([
    all<AiEstimateNodeSearchRow>(
      database,
      `
        SELECT id, estimate_id, parent_id, kind, name, sort_order
        FROM estimate_nodes
        WHERE estimate_id IN (${estimateSql})
        ORDER BY sort_order ASC
        LIMIT ?
      `,
      [...historicalEstimateIds, DEFAULT_TREE_LIMIT],
    ),
    all<AiEstimateRowSearchRow>(
      database,
      `
        SELECT id, estimate_id, node_id, material, description, supplier, quantity, quantity_base, quantity_contingency_amount, unit, unit_cost, contingency_percentage, adjustment_percentage, misc_cost, source_library_item_id, updated_at
        FROM estimate_row_items
        WHERE estimate_id IN (${estimateSql})
          AND ${rowSearch.sql}
        ORDER BY updated_at DESC, sort_order ASC
        LIMIT ?
      `,
      [...historicalEstimateIds, ...rowSearch.values, DEFAULT_HISTORICAL_ROW_LIMIT],
    ),
  ]);

  const nodes = nodesResult;
  const rows = rowsResult;
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
    adjustmentPercentage: readRowAdjustmentPercentage(row),
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

  const database = await requirePackageBuilderReadD1Database();
  const estimates = await all<AiEstimateSearchRow>(
    database,
    `
      SELECT id, project_id, name, sheet_code, updated_at
      FROM estimates
      WHERE project_id IN (${placeholders(projectIds)})
      ORDER BY updated_at DESC
      LIMIT ?
    `,
    [...projectIds, DEFAULT_HISTORICAL_ESTIMATE_LIMIT],
  );

  const estimateRows = estimates;
  const comparableEstimates = estimateRows.filter((estimate) => estimate.id !== currentEstimateId);
  const comparableEstimateIds = comparableEstimates.map((estimate) => estimate.id);
  if (comparableEstimateIds.length === 0) {
    return { matches: [] as PackageBuilderComparableEstimatePackage[], rowCount: projects.length + comparableEstimates.length };
  }

  const estimateSql = placeholders(comparableEstimateIds);
  const [nodesResult, rowsResult] = await Promise.all([
    all<AiEstimateNodeSearchRow>(
      database,
      `
        SELECT id, estimate_id, parent_id, kind, name, sort_order
        FROM estimate_nodes
        WHERE estimate_id IN (${estimateSql})
        ORDER BY sort_order ASC
        LIMIT ?
      `,
      [...comparableEstimateIds, DEFAULT_COMPARABLE_TREE_LIMIT],
    ),
    all<AiEstimateRowSearchRow>(
      database,
      `
        SELECT id, estimate_id, node_id, material, description, supplier, quantity, quantity_base, quantity_contingency_amount, unit, unit_cost, contingency_percentage, adjustment_percentage, misc_cost, source_library_item_id, updated_at
        FROM estimate_row_items
        WHERE estimate_id IN (${estimateSql})
        ORDER BY updated_at DESC, sort_order ASC
        LIMIT ?
      `,
      [...comparableEstimateIds, DEFAULT_COMPARABLE_ROW_LIMIT],
    ),
  ]);

  const nodes = nodesResult;
  const rows = rowsResult;
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
  const database = await requirePackageBuilderReadD1Database();
  const search = buildSearchWhere(["name", "description", "category"], terms);
  const templateRows = await all<AiTemplateSearchRow>(
    database,
    `
      SELECT id, name, description, category
      FROM estimate_templates
      WHERE workspace_id = ?
        AND ${search.sql}
      ORDER BY sort_order ASC
      LIMIT ?
    `,
    [workspaceId, ...search.values, DEFAULT_RESULT_LIMIT],
  );
  const templateIds = templateRows.map((template) => template.id);
  if (templateIds.length === 0) return { matches: [] as PackageBuilderTemplateSummary[], rowCount: 0 };

  const templateSql = placeholders(templateIds);
  const [nodesResult, rowsResult] = await Promise.all([
    all<AiTemplateNodeSearchRow>(
      database,
      `
        SELECT id, template_id, kind, name
        FROM estimate_template_nodes
        WHERE template_id IN (${templateSql})
        LIMIT ?
      `,
      [...templateIds, DEFAULT_TREE_LIMIT],
    ),
    all<AiTemplateRowSearchRow>(
      database,
      `
        SELECT id, template_id, template_node_id, material, description, supplier, quantity, unit, unit_cost, contingency_percentage, adjustment_percentage, misc_cost, sort_order
        FROM estimate_template_row_items
        WHERE template_id IN (${templateSql})
        ORDER BY sort_order ASC
        LIMIT ?
      `,
      [...templateIds, DEFAULT_ROW_LIMIT],
    ),
  ]);

  const nodes = nodesResult;
  const rows = rowsResult;
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
            adjustmentPercentage: readRowAdjustmentPercentage(row),
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
  const workspaceId = isProviderBackedAiUserContext(input.userContext) ? input.userContext.workspaceId : null;
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
    sourceTables: ["cost_library_items", "cost_library_item_price_options", "library_folders"],
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
