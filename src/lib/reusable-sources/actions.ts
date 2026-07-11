"use server";

import { createHash, randomUUID } from "node:crypto";

import { requireCurrentUserContext } from "@/lib/auth/session";
import { canAccessEstimateInD1, canEditEstimateInD1 } from "@/lib/authz/d1-access";
import { getCloudflareD1Database, type D1DatabaseLike, type D1Value } from "@/lib/cloudflare/d1";
import { isUuid } from "@/lib/ids";
import {
  getEstimateTabs,
  getEstimateTabTree,
  getProjectEstimateTreeByEstimate,
  listCurrentWorkspaceProjects,
  listProjectEstimateSheets,
} from "@/lib/repositories/workspace-repository";
import { formatEstimatePageTabName, getEstimateTabDisplayName, sortEstimateTabsForDisplay } from "@/lib/estimates/tab-display";
import type { EstimateTabSummary } from "@/lib/estimates/types";
import type {
  InsertProjectSourceIntoEstimateInput,
  InsertProjectSourceIntoEstimateResult,
  ProjectEstimateReusableSource,
  ProjectNodeReusableSource,
  ProjectReusableEstimateSource,
  ProjectReusableSource,
  ProjectTabReusableSource,
} from "./types";
import {
  collectProjectNodeSearchSources,
  collectProjectNodeSources,
  summarizeEstimateTreeNodes,
  textMatchesReusableSourceQuery,
  type ProjectSourceSearchContext,
} from "./source-collectors";

export type ReusableProjectSourceListResult = {
  sources: ProjectReusableSource[];
};

export type ReusableProjectEstimateListResult = {
  sources: ProjectEstimateReusableSource[];
};

export type ReusableEstimateOutlineResult = {
  sources: Array<ProjectTabReusableSource | ProjectNodeReusableSource>;
};

export type ReusableProjectSourceSearchResult = {
  sources: ProjectReusableEstimateSource[];
};

const REUSABLE_SOURCE_SEARCH_PROJECT_SCAN_LIMIT = 50;
const REUSABLE_SOURCE_SEARCH_ESTIMATE_SCAN_LIMIT = 200;
const REUSABLE_SOURCE_SEARCH_NODE_MATCH_LIMIT = 300;
const REUSABLE_SOURCE_SEARCH_TAB_MATCH_LIMIT = 120;
const REUSABLE_SOURCE_SEARCH_MATERIALIZED_ESTIMATE_LIMIT = 25;
const REUSABLE_SOURCE_SEARCH_TAB_SCAN_LIMIT = 75;
const REUSABLE_SOURCE_SEARCH_TREE_NODE_LIMIT = 600;
const REUSABLE_SOURCE_SEARCH_TREE_ROW_ITEM_LIMIT = 1200;

type ReusableSourceEstimateContextRow = {
  id: string;
  project_id: string;
  workspace_id: string;
};

type ReusableSourceNodeD1Row = {
  id: string;
  estimate_id: string;
  estimate_tab_id: string | null;
  parent_id: string | null;
  kind: "group" | "area";
  name: string;
  sort_order: number | string | null;
  metadata_json?: string | null;
};

type ReusableSourceRowItemD1Row = {
  id: string;
  estimate_id: string;
  node_id: string | null;
  description: string | null;
  designation: string | null;
  discipline: string | null;
  material: string | null;
  supplier?: string | null;
  supplier_id?: string | null;
  quantity: number | string | null;
  quantity_base?: number | string | null;
  quantity_contingency_amount?: number | string | null;
  unit: string | null;
  unit_cost: number | string | null;
  misc_cost: number | string | null;
  contingency_percentage: number | string | null;
  adjustment_percentage?: number | string | null;
  source_snapshot_json: string | null;
  sort_order: number | string | null;
  row_revision?: number | string | null;
  category_node_id?: string | null;
  source_library_item_id?: string | null;
  link_state?: string | null;
  metadata_json?: string | null;
};

type ReusableSourceEventPayload = {
  inserted_root_node_ids: string[];
  inserted_node_count: number;
  inserted_row_item_count: number;
  estimate_tab_id: string | null;
  sourceProjectId: string;
  sourceEstimateId: string;
  sourceTabId: string;
  sourceRootNodeId: string | null;
  targetParentNodeId: string;
  idempotent: boolean;
  eventId?: string;
};

function placeholders(values: readonly unknown[]) {
  if (values.length === 0) throw new Error("At least one SQL placeholder is required.");
  return values.map(() => "?").join(", ");
}

function isD1MissingTableError(error: unknown, tableName: string) {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes(`no such table: ${tableName}`);
}

function normalizeD1Value(value: unknown): D1Value {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value instanceof ArrayBuffer) {
    return value;
  }
  if (value === undefined) return null;
  return JSON.stringify(value);
}

function readJsonRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "string") {
    try {
      return readJsonRecord(JSON.parse(value) as unknown);
    } catch {
      return {};
    }
  }
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function mergeJsonRecord(value: unknown, patch: Record<string, unknown>) {
  return JSON.stringify({ ...readJsonRecord(value), ...patch });
}

function readNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function requireReusableSourcesD1Database() {
  const database = await getCloudflareD1Database();
  if (!database) {
    throw new Error("Cloudflare D1 ARCH_DB binding is required for reusable source actions.");
  }
  return database;
}

async function first<T>(database: D1DatabaseLike, sql: string, values: D1Value[] = []) {
  return database.prepare<T>(sql).bind(...values).first<T>();
}

async function all<T>(database: D1DatabaseLike, sql: string, values: D1Value[] = []) {
  const result = await database.prepare<T>(sql).bind(...values).all<T>();
  if (result.success === false) throw new Error("Cloudflare D1 reusable source read failed.");
  return result.results ?? [];
}

async function run(database: D1DatabaseLike, sql: string, values: D1Value[] = []) {
  const result = await database.prepare(sql).bind(...values).run();
  if (result.success === false) throw new Error("Cloudflare D1 reusable source write failed.");
  return result;
}

async function runBatch(database: D1DatabaseLike, statements: Array<{ sql: string; values?: D1Value[] }>) {
  if (statements.length === 0) return;
  if (database.batch) {
    const results = await database.batch(
      statements.map((statement) => database.prepare(statement.sql).bind(...(statement.values ?? []))),
    );
    if (results.some((result) => result.success === false)) {
      throw new Error("Cloudflare D1 reusable source batch failed.");
    }
    return;
  }
  for (const statement of statements) await run(database, statement.sql, statement.values ?? []);
}

function normalizeReusableSourceSearchQuery(query: string) {
  return query.trim().replace(/[,()"]/g, " ").replace(/\s+/g, " ").trim().toLocaleLowerCase();
}

function reusableProjectSourceResultKey(source: ProjectReusableEstimateSource) {
  if (source.kind === "project") return `project:${source.projectId}`;
  if (source.kind === "project-estimate") return `project-estimate:${source.estimateId}`;
  if (source.kind === "project-tab") return `project-tab:${source.tabId}`;
  return `project-node:${source.nodeId}`;
}

function addReusableSearchSource(sourcesByKey: Map<string, ProjectReusableEstimateSource>, source: ProjectReusableEstimateSource) {
  sourcesByKey.set(reusableProjectSourceResultKey(source), source);
}

export async function listReusableProjectSources(): Promise<ReusableProjectSourceListResult> {
  await requireCurrentUserContext();
  const { projects } = await listCurrentWorkspaceProjects();
  const accessibleProjects = projects.filter((item) => item.accessKind !== "pending-invite");

  return {
    sources: accessibleProjects.map((item) => ({
      kind: "project",
      projectId: item.project.id,
      name: item.project.name,
    })),
  };
}

export async function listReusableProjectEstimateSources(input: { projectId: string }): Promise<ReusableProjectEstimateListResult> {
  await requireCurrentUserContext();
  const { projects } = await listCurrentWorkspaceProjects();
  const project = projects.find((item) => item.project.id === input.projectId && item.accessKind !== "pending-invite");
  if (!project) return { sources: [] };
  const estimates = await listProjectEstimateSheets(input.projectId);

  return {
    sources: estimates.map((estimate) => ({
      kind: "project-estimate",
      projectId: input.projectId,
      estimateId: estimate.id,
      name: estimate.name,
      sheetCode: estimate.sheetCode,
      metadata: {
        projectName: project.project.name,
        estimateName: estimate.name,
        sheetCode: estimate.sheetCode,
        updatedAt: estimate.updatedAt,
      },
    })),
  };
}

// U5 (PERF-1): a single ILIKE escape so a query containing %/_/\ matches literally.
function toReusableSearchLikePattern(query: string): string {
  return `%${query.replace(/[\\%_]/g, "\\$&")}%`;
}

export async function searchReusableProjectSources(input: { query: string }): Promise<ReusableProjectSourceSearchResult> {
  await requireCurrentUserContext();
  const query = normalizeReusableSourceSearchQuery(input.query);
  if (!query) return { sources: [] };

  const { projects } = await listCurrentWorkspaceProjects();
  const accessibleProjects = projects
    .filter((item) => item.accessKind !== "pending-invite")
    .slice(0, REUSABLE_SOURCE_SEARCH_PROJECT_SCAN_LIMIT);
  if (accessibleProjects.length === 0) return { sources: [] };

  const estimatesByProject = await Promise.all(
    accessibleProjects.map((item) => listProjectEstimateSheets(item.project.id, { limit: REUSABLE_SOURCE_SEARCH_ESTIMATE_SCAN_LIMIT })),
  );

  type ProjectRecord = (typeof accessibleProjects)[number]["project"];
  type EstimateRecord = (typeof estimatesByProject)[number][number];
  const estimateContextById = new Map<string, { project: ProjectRecord; estimate: EstimateRecord }>();
  const accessibleEstimateIds: string[] = [];
  accessibleProjects.forEach((item, projectIndex) => {
    for (const estimate of estimatesByProject[projectIndex] ?? []) {
      estimateContextById.set(estimate.id, { project: item.project, estimate });
      accessibleEstimateIds.push(estimate.id);
    }
  });

  const sourcesByKey = new Map<string, ProjectReusableEstimateSource>();
  const projectSourceFor = (project: ProjectRecord): ProjectReusableSource => ({
    kind: "project",
    projectId: project.id,
    name: project.name,
    metadata: { projectName: project.name },
  });
  const estimateSourceFor = (project: ProjectRecord, estimate: EstimateRecord): ProjectEstimateReusableSource => ({
    kind: "project-estimate",
    projectId: project.id,
    estimateId: estimate.id,
    name: estimate.name,
    sheetCode: estimate.sheetCode,
    metadata: { projectName: project.name, estimateName: estimate.name, sheetCode: estimate.sheetCode, updatedAt: estimate.updatedAt },
  });

  // (1) Project + estimate name/sheet-code matches — purely in-memory (no DB reads).
  for (const item of accessibleProjects) {
    if (textMatchesReusableSourceQuery(query, [item.project.name])) addReusableSearchSource(sourcesByKey, projectSourceFor(item.project));
  }
  for (const estimateId of accessibleEstimateIds) {
    const ctx = estimateContextById.get(estimateId);
    if (ctx && textMatchesReusableSourceQuery(query, [ctx.estimate.name, ctx.estimate.sheetCode])) {
      addReusableSearchSource(sourcesByKey, projectSourceFor(ctx.project));
      addReusableSearchSource(sourcesByKey, estimateSourceFor(ctx.project, ctx.estimate));
    }
  }

  if (accessibleEstimateIds.length === 0) return { sources: Array.from(sourcesByKey.values()) };

  // (2) U5: instead of materializing EVERY estimate's whole tree on every keystroke
  // (PERF-1, O(projects×estimates×tabs×nodes)), pre-filter to the estimates that
  // actually contain a name match via two bounded indexed ILIKE queries, then
  // materialize ONLY those for the rich tab/node sources. RLS-scoped (user client
  // + the accessible-estimate id allow-list).
  const database = await requireReusableSourcesD1Database();
  const likePattern = toReusableSearchLikePattern(query);
  const estimatesToMaterialize = new Set<string>();
  const tabsByEstimateId = new Map<string, EstimateTabSummary[]>();

  async function getSortedTabsForEstimate(projectId: string, estimateId: string) {
    const existing = tabsByEstimateId.get(estimateId);
    if (existing) return existing;
    const tabs = sortEstimateTabsForDisplay(await getEstimateTabs(projectId, estimateId, { allowLegacyFallback: true }));
    tabsByEstimateId.set(estimateId, tabs);
    return tabs;
  }

  const matchingNodeRows = await all<{ estimate_id: string | null }>(
    database,
    `
      SELECT DISTINCT estimate_id
      FROM estimate_nodes
      WHERE estimate_id IN (${placeholders(accessibleEstimateIds)})
        AND kind IN ('group', 'area')
        AND lower(name) LIKE ? ESCAPE '\\'
      LIMIT ?
    `,
    [...accessibleEstimateIds, likePattern, REUSABLE_SOURCE_SEARCH_NODE_MATCH_LIMIT + 1],
  );
  for (const row of matchingNodeRows) {
    if (row.estimate_id) estimatesToMaterialize.add(row.estimate_id);
  }

  // Tab-name matches use estimate_tabs (added by the foundation; tolerate its absence
  // on the legacy schema, where the synthetic "Main" tab carries no searchable name).
  try {
    const matchingTabRows = await all<{ estimate_id: string | null }>(
      database,
      `
        SELECT DISTINCT estimate_id
        FROM estimate_tabs
        WHERE estimate_id IN (${placeholders(accessibleEstimateIds)})
          AND lower(name) LIKE ? ESCAPE '\\'
          AND archived_at IS NULL
        LIMIT ?
      `,
      [...accessibleEstimateIds, likePattern, REUSABLE_SOURCE_SEARCH_TAB_MATCH_LIMIT + 1],
    );
    for (const row of matchingTabRows) {
      if (row.estimate_id) estimatesToMaterialize.add(row.estimate_id);
    }
  } catch (error) {
    if (!isD1MissingTableError(error, "estimate_tabs")) throw error;
  }

  // The first rendered tab displays as "Page 001" even when the stored tab name
  // is "Main" or another raw name, so the DB tab-name ILIKE above cannot find a
  // display-label-only search. Only treat the synthetic display label as a
  // materialization pre-filter on an exact normalized label match: substring
  // matching against a constant first-tab label would select every accessible
  // estimate for short/common queries such as "p" or "page".
  const firstPageDisplayQuery = normalizeReusableSourceSearchQuery(formatEstimatePageTabName(1));
  if (query === firstPageDisplayQuery) {
    for (const estimateId of accessibleEstimateIds.slice(0, REUSABLE_SOURCE_SEARCH_MATERIALIZED_ESTIMATE_LIMIT)) {
      const ctx = estimateContextById.get(estimateId);
      if (!ctx) continue;
      const tabs = (await getSortedTabsForEstimate(ctx.project.id, estimateId)).slice(0, REUSABLE_SOURCE_SEARCH_TAB_SCAN_LIMIT);
      if (tabs.some((tab, index) => textMatchesReusableSourceQuery(query, [getEstimateTabDisplayName(tab, index)]))) {
        estimatesToMaterialize.add(estimateId);
      }
    }
  }

  // (3) Materialize ONLY the matching estimates; collect the rich tab/node sources.
  for (const estimateId of Array.from(estimatesToMaterialize).slice(0, REUSABLE_SOURCE_SEARCH_MATERIALIZED_ESTIMATE_LIMIT)) {
    const ctx = estimateContextById.get(estimateId);
    if (!ctx) continue;
    const { project, estimate } = ctx;
    const tabs = (await getSortedTabsForEstimate(project.id, estimate.id)).slice(0, REUSABLE_SOURCE_SEARCH_TAB_SCAN_LIMIT);
    const tabTrees = await Promise.all(
      tabs.map((tab) =>
        getEstimateTabTree(project.id, estimate.id, tab.id, {
          allowLegacyFallback: true,
          maxNodeCount: REUSABLE_SOURCE_SEARCH_TREE_NODE_LIMIT,
          maxRowItemCount: REUSABLE_SOURCE_SEARCH_TREE_ROW_ITEM_LIMIT,
        })
      ),
    );
    tabs.forEach((tab, tabIndex) => {
      const updatedAt = tabTrees[tabIndex]?.estimate?.updated_at ?? estimate.updatedAt;
      const tabDisplayName = getEstimateTabDisplayName(tab, tabIndex);
      const tabSource: ProjectTabReusableSource = {
        kind: "project-tab",
        projectId: project.id,
        estimateId: estimate.id,
        tabId: tab.id,
        name: tab.name,
        displayName: tabDisplayName,
        sortOrder: tab.sortOrder,
        metadata: {
          projectName: project.name,
          estimateName: estimate.name,
          sheetCode: estimate.sheetCode,
          tabName: tab.name,
          tabDisplayName,
          updatedAt,
          ...summarizeEstimateTreeNodes(tabTrees[tabIndex]?.tree ?? []),
        },
      };
      const context: ProjectSourceSearchContext = {
        projectId: project.id,
        projectName: project.name,
        estimateId: estimate.id,
        estimateName: estimate.name,
        sheetCode: estimate.sheetCode,
        tabId: tab.id,
        tabName: tab.name,
        tabDisplayName,
        updatedAt,
      };
      if (textMatchesReusableSourceQuery(query, [tab.name, tabDisplayName])) {
        addReusableSearchSource(sourcesByKey, projectSourceFor(project));
        addReusableSearchSource(sourcesByKey, estimateSourceFor(project, estimate));
        addReusableSearchSource(sourcesByKey, tabSource);
      }
      for (const source of collectProjectNodeSearchSources({ context, nodes: tabTrees[tabIndex]?.tree ?? [], query })) {
        addReusableSearchSource(sourcesByKey, projectSourceFor(project));
        addReusableSearchSource(sourcesByKey, estimateSourceFor(project, estimate));
        addReusableSearchSource(sourcesByKey, tabSource);
        addReusableSearchSource(sourcesByKey, source);
      }
    });
  }

  return { sources: Array.from(sourcesByKey.values()) };
}

export async function getReusableEstimateOutline(input: { projectId: string; estimateId: string }): Promise<ReusableEstimateOutlineResult> {
  await requireCurrentUserContext();
  const tabs = sortEstimateTabsForDisplay(await getEstimateTabs(input.projectId, input.estimateId, { allowLegacyFallback: true }));
  const tabTrees = await Promise.all(
    tabs.map((tab) => getEstimateTabTree(input.projectId, input.estimateId, tab.id, { allowLegacyFallback: true })),
  );

  const sources: ReusableEstimateOutlineResult["sources"] = [];
  tabs.forEach((tab, index) => {
    const updatedAt = tabTrees[index]?.estimate?.updated_at ?? null;
    const tabDisplayName = getEstimateTabDisplayName(tab, index);
    sources.push({
      kind: "project-tab",
      projectId: input.projectId,
      estimateId: input.estimateId,
      tabId: tab.id,
      name: tab.name,
      displayName: tabDisplayName,
      sortOrder: tab.sortOrder,
      metadata: {
        tabName: tab.name,
        tabDisplayName,
        updatedAt,
        ...summarizeEstimateTreeNodes(tabTrees[index]?.tree ?? []),
      },
    });
    sources.push(...collectProjectNodeSources({
      context: {
        projectId: input.projectId,
        estimateId: input.estimateId,
        tabId: tab.id,
        tabName: tab.name,
        tabDisplayName,
        updatedAt,
      },
      nodes: tabTrees[index]?.tree ?? [],
    }));
  });

  return { sources };
}

function readInsertedRootNodeIds(result: unknown): string[] {
  if (!result || typeof result !== "object") return [];
  const ids = (result as { inserted_root_node_ids?: unknown }).inserted_root_node_ids;
  return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : [];
}

async function readEstimateContext(database: D1DatabaseLike, estimateId: string) {
  return first<ReusableSourceEstimateContextRow>(
    database,
    `
      SELECT estimate.id, estimate.project_id, project.workspace_id
      FROM estimates estimate
      JOIN projects project ON project.id = estimate.project_id
      WHERE estimate.id = ?
      LIMIT 1
    `,
    [estimateId],
  );
}

async function readCommittedReusableSourceEvent(database: D1DatabaseLike, estimateId: string, correlationId: string) {
  try {
    const event = await first<{ payload: string | null }>(
      database,
      `
        SELECT payload
        FROM estimate_sheet_events
        WHERE estimate_id = ?
          AND correlation_id = ?
        LIMIT 1
      `,
      [estimateId, correlationId],
    );
    return event ? readJsonRecord(event.payload) : null;
  } catch (error) {
    if (isD1MissingTableError(error, "estimate_sheet_events")) return null;
    throw error;
  }
}

async function copyProjectSourceSubtreeInD1(
  database: D1DatabaseLike,
  input: InsertProjectSourceIntoEstimateInput,
  currentUserId: string,
  correlationId: string,
): Promise<ReusableSourceEventPayload> {
  const committed = await readCommittedReusableSourceEvent(database, input.targetEstimateId, correlationId);
  if (committed) return { ...(committed as ReusableSourceEventPayload), idempotent: true };

  const [targetEstimate, sourceEstimate] = await Promise.all([
    readEstimateContext(database, input.targetEstimateId),
    readEstimateContext(database, input.source.estimateId),
  ]);
  if (!targetEstimate || targetEstimate.project_id !== input.targetProjectId) {
    throw new Error("Estimate not found after inserting the project source.");
  }
  if (!sourceEstimate) throw new Error("This project source is no longer available.");
  if (sourceEstimate.project_id !== input.source.projectId || sourceEstimate.workspace_id !== targetEstimate.workspace_id) {
    throw new Error("This project source is no longer available.");
  }

  const [canEditTarget, canReadSource] = await Promise.all([
    canEditEstimateInD1(database, input.targetEstimateId, { userId: currentUserId }),
    canAccessEstimateInD1(database, input.source.estimateId, { userId: currentUserId }),
  ]);
  if (!canEditTarget) throw new Error("Could not insert project source: Estimate edit access denied.");
  if (!canReadSource) throw new Error("This project source is no longer available.");

  const targetParent = await first<ReusableSourceNodeD1Row>(
    database,
    `
      SELECT id, estimate_id, estimate_tab_id, parent_id, kind, name, sort_order, metadata_json
      FROM estimate_nodes
      WHERE id = ?
        AND estimate_id = ?
        AND kind = 'group'
      LIMIT 1
    `,
    [input.targetParentNodeId, input.targetEstimateId],
  );
  if (!targetParent || !targetParent.estimate_tab_id) {
    throw new Error("Target Group Node not found in the current project.");
  }

  const sourceTab = await first<{ id: string }>(
    database,
    `
      SELECT id
      FROM estimate_tabs
      WHERE id = ?
        AND estimate_id = ?
        AND archived_at IS NULL
      LIMIT 1
    `,
    [input.source.tabId, input.source.estimateId],
  );
  if (!sourceTab) throw new Error("This project source is no longer available.");

  const sourceNodes = await all<ReusableSourceNodeD1Row>(
    database,
    `
      SELECT id, estimate_id, estimate_tab_id, parent_id, kind, name, sort_order, metadata_json
      FROM estimate_nodes
      WHERE estimate_id = ?
        AND estimate_tab_id = ?
      ORDER BY sort_order ASC, id ASC
    `,
    [input.source.estimateId, input.source.tabId],
  );

  const nodeById = new Map(sourceNodes.map((node) => [node.id, node]));
  if (input.source.nodeId && !nodeById.has(input.source.nodeId)) {
    throw new Error("This project source is no longer available.");
  }
  const childrenByParent = new Map<string | null, ReusableSourceNodeD1Row[]>();
  for (const node of sourceNodes) {
    const children = childrenByParent.get(node.parent_id) ?? [];
    children.push(node);
    childrenByParent.set(node.parent_id, children);
  }

  const roots = input.source.nodeId
    ? [nodeById.get(input.source.nodeId)!]
    : sourceNodes.filter((node) => node.parent_id === null);
  const nodesToCopy: ReusableSourceNodeD1Row[] = [];
  const queue = [...roots];
  while (queue.length > 0) {
    const node = queue.shift()!;
    nodesToCopy.push(node);
    queue.push(...(childrenByParent.get(node.id) ?? []));
  }
  if (nodesToCopy.length === 0) throw new Error("Source has no nodes to insert.");

  const copiedSourceNodeIds = nodesToCopy.map((node) => node.id);
  const sourceRows = await all<ReusableSourceRowItemD1Row>(
    database,
    `
      SELECT *
      FROM estimate_row_items
      WHERE estimate_id = ?
        AND node_id IN (${placeholders(copiedSourceNodeIds)})
      ORDER BY sort_order ASC, id ASC
    `,
    [input.source.estimateId, ...copiedSourceNodeIds],
  );

  const sibling = await first<{ sort_order: number | string | null }>(
    database,
    `
      SELECT COALESCE(MAX(sort_order), 0) AS sort_order
      FROM estimate_nodes
      WHERE estimate_id = ?
        AND estimate_tab_id = ?
        AND parent_id = ?
    `,
    [input.targetEstimateId, targetParent.estimate_tab_id, input.targetParentNodeId],
  );

  const maxSiblingSortOrder = readNumber(sibling?.sort_order, 0);
  const rootIds = new Set(roots.map((node) => node.id));
  const rootRankById = new Map(roots.map((node, index) => [node.id, index + 1]));
  const idMap = new Map(nodesToCopy.map((node) => [node.id, randomUUID()]));
  const now = new Date().toISOString();
  const provenance = {
    sourceProjectId: input.source.projectId,
    sourceEstimateId: input.source.estimateId,
    sourceTabId: input.source.tabId,
    sourceKind: "project",
  };

  const nodeStatements = nodesToCopy.map((node) => {
    const isRoot = rootIds.has(node.id);
    return {
      sql: `
        INSERT INTO estimate_nodes (
          id, estimate_id, estimate_tab_id, parent_id, kind, name, sort_order, metadata_json, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      values: [
        idMap.get(node.id)!,
        input.targetEstimateId,
        targetParent.estimate_tab_id,
        isRoot ? input.targetParentNodeId : idMap.get(node.parent_id ?? "") ?? null,
        node.kind,
        node.name,
        isRoot ? maxSiblingSortOrder + (rootRankById.get(node.id) ?? 1) * 10 : readNumber(node.sort_order, 0),
        mergeJsonRecord(node.metadata_json, { ...provenance, sourceNodeId: node.id }),
        now,
        now,
      ] as D1Value[],
    };
  });

  const rowStatements = sourceRows.map((row) => {
    const sourceNodeId = row.node_id ?? "";
    const copiedNodeId = idMap.get(sourceNodeId);
    if (!copiedNodeId) throw new Error("This project source is no longer available.");
    return {
      sql: `
        INSERT INTO estimate_row_items (
          id, estimate_id, node_id, description, designation, discipline, material,
          supplier, supplier_id, quantity, quantity_base, quantity_contingency_amount,
          unit, unit_cost, misc_cost, contingency_percentage, adjustment_percentage,
          source_snapshot_json, sort_order, row_revision, category_node_id,
          source_library_item_id, link_state, metadata_json, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      values: [
        randomUUID(),
        input.targetEstimateId,
        copiedNodeId,
        row.description ?? "",
        row.designation ?? "",
        row.discipline ?? "",
        row.material ?? "",
        row.supplier ?? "",
        row.supplier_id ?? null,
        readNumber(row.quantity, 0),
        row.quantity_base === null || row.quantity_base === undefined ? null : readNumber(row.quantity_base, 0),
        row.quantity_contingency_amount === null || row.quantity_contingency_amount === undefined ? null : readNumber(row.quantity_contingency_amount, 0),
        row.unit ?? "",
        readNumber(row.unit_cost, 0),
        readNumber(row.misc_cost, 0),
        readNumber(row.contingency_percentage, 0),
        readNumber(row.adjustment_percentage, 0),
        mergeJsonRecord(row.source_snapshot_json, { ...provenance, sourceRowId: row.id }),
        readNumber(row.sort_order, 0),
        0,
        row.category_node_id ?? null,
        row.source_library_item_id ?? null,
        row.link_state ?? "unlinked",
        mergeJsonRecord(row.metadata_json, { ...provenance, sourceRowId: row.id }),
        now,
        now,
      ] as D1Value[],
    };
  });

  const eventId = randomUUID();
  const payload: ReusableSourceEventPayload = {
    inserted_root_node_ids: roots.map((node) => idMap.get(node.id)!),
    inserted_node_count: nodeStatements.length,
    inserted_row_item_count: rowStatements.length,
    estimate_tab_id: targetParent.estimate_tab_id ?? null,
    sourceProjectId: input.source.projectId,
    sourceEstimateId: input.source.estimateId,
    sourceTabId: input.source.tabId,
    sourceRootNodeId: input.source.nodeId ?? null,
    targetParentNodeId: input.targetParentNodeId,
    idempotent: false,
    eventId,
  };

  await runBatch(database, [
    ...nodeStatements,
    ...rowStatements,
    {
      sql: `
        INSERT INTO estimate_sheet_events (
          id, estimate_id, workspace_id, project_id, estimate_node_id, estimate_tab_id,
          target_row_id, event_type, event_source, correlation_id, actor_user_id,
          changed_fields, row_context, old_snapshot, new_snapshot, payload, metadata,
          total_delta, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      values: [
        eventId,
        input.targetEstimateId,
        targetEstimate.workspace_id,
        input.targetProjectId,
        input.targetParentNodeId,
        targetParent.estimate_tab_id,
        null,
        "project_source_inserted",
        "server_action",
        correlationId,
        currentUserId,
        JSON.stringify(["project_source"]),
        "{}",
        null,
        null,
        JSON.stringify(payload),
        "{}",
        0,
        now,
      ],
    },
  ]);

  return payload;
}

// Stable per-source-unit correlation_id (doc 16, U2-2): deterministic from the
// insert unit, so a replay of a bulk insert yields exactly the original rows (the
// estimate_sheet_event dedup returns each unit's prior result) and distinct units
// never collide. Formatted as a v4-shaped UUID for the `correlation_id uuid` param.
function projectSourceInsertCorrelationId(input: InsertProjectSourceIntoEstimateInput): string {
  const key = [
    input.targetEstimateId,
    input.targetParentNodeId,
    input.source.estimateId,
    input.source.tabId,
    input.source.nodeId ?? "whole-tab",
  ].join("|");
  const hex = createHash("sha256").update(`project-source-insert:${key}`).digest("hex").slice(0, 32);
  const variantNibble = ((parseInt(hex[16] ?? "8", 16) & 0x3) | 0x8).toString(16);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-${variantNibble}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export async function insertProjectSourceIntoEstimate(
  input: InsertProjectSourceIntoEstimateInput,
): Promise<InsertProjectSourceIntoEstimateResult> {
  const currentUser = await requireCurrentUserContext();

  const requiredIds = [
    input.targetProjectId,
    input.targetEstimateId,
    input.targetParentNodeId,
    input.source.projectId,
    input.source.estimateId,
    input.source.tabId,
  ];
  if (requiredIds.some((id) => !isUuid(id)) || (input.source.nodeId != null && !isUuid(input.source.nodeId))) {
    throw new Error("Invalid project-source insert request.");
  }

  const database = await requireReusableSourcesD1Database();
  const copyResult = await copyProjectSourceSubtreeInD1(
    database,
    input,
    currentUser.userId,
    projectSourceInsertCorrelationId(input),
  );

  const insertedRootNodeIds = readInsertedRootNodeIds(copyResult);
  // RS-1: refresh the tab the user is editing (not the default tab), so a
  // non-default-tab insert returns that tab's tree. Legacy estimates pass no
  // targetTabId and fall back to the default/whole-estimate loader.
  const { project, estimate, tree } = input.targetTabId
    ? await getEstimateTabTree(input.targetProjectId, input.targetEstimateId, input.targetTabId)
    : await getProjectEstimateTreeByEstimate(input.targetProjectId, input.targetEstimateId);
  if (!project || !estimate) throw new Error("Estimate not found after inserting the project source.");
  return { tree, insertedRootNodeIds };
}
