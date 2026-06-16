"use server";

import { createHash } from "node:crypto";

import { requireCurrentUserContext } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import { isMissingRelationError } from "@/lib/repositories/estimate-schema-compat";
import { isUuid } from "@/lib/ids";
import type { Json } from "@/lib/supabase/types";
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

function normalizeReusableSourceSearchQuery(query: string) {
  return query.trim().replace(/[,()"]/g, " ").replace(/\s+/g, " ").trim().toLocaleLowerCase();
}

function reusableProjectSourceResultKey(source: ProjectReusableEstimateSource) {
  if (source.kind === "project") return `project:${source.projectId}`;
  if (source.kind === "project-estimate") return `project-estimate:${source.estimateId}`;
  if (source.kind === "project-tab") return `project-tab:${source.tabId}`;
  return `project-node:${source.nodeId}`;
}

const REUSABLE_PROJECT_SOURCE_SEARCH_MIN_QUERY_LENGTH = 2;
const REUSABLE_PROJECT_SOURCE_SEARCH_MAX_QUERY_LENGTH = 120;
const REUSABLE_PROJECT_SOURCE_SEARCH_RESULT_LIMIT = 50;
const REUSABLE_PROJECT_SOURCE_SEARCH_PROJECT_LIMIT = 50;
const REUSABLE_PROJECT_SOURCE_SEARCH_ESTIMATES_PER_PROJECT_LIMIT = 25;
const REUSABLE_PROJECT_SOURCE_SEARCH_DB_MATCH_LIMIT = 50;
const REUSABLE_PROJECT_SOURCE_SEARCH_DB_MATCH_PAGE_LIMIT = 25;
const REUSABLE_PROJECT_SOURCE_SEARCH_RATE_LIMIT = 20;
const REUSABLE_PROJECT_SOURCE_SEARCH_RATE_WINDOW_MS = 60_000;
const REUSABLE_PROJECT_SOURCE_SEARCH_RATE_LIMIT_SCOPE = "reusable_project_source_search";

function addReusableSearchSourceUnit(
  sourcesByKey: Map<string, ProjectReusableEstimateSource>,
  sources: readonly ProjectReusableEstimateSource[],
) {
  const missingKeys = new Set<string>();
  for (const source of sources) {
    const key = reusableProjectSourceResultKey(source);
    if (!sourcesByKey.has(key)) missingKeys.add(key);
  }
  if (sourcesByKey.size + missingKeys.size > REUSABLE_PROJECT_SOURCE_SEARCH_RESULT_LIMIT) return;
  for (const source of sources) {
    sourcesByKey.set(reusableProjectSourceResultKey(source), source);
  }
}

function addReusableSearchEstimateMaterializationCandidate({
  estimateContextById,
  estimatesToMaterialize,
  materializedProjectIds,
  materializedEstimateCountsByProject,
  estimateId,
}: {
  estimateContextById: Map<string, { project: { id: string }; estimate: unknown }>;
  estimatesToMaterialize: Set<string>;
  materializedProjectIds: Set<string>;
  materializedEstimateCountsByProject: Map<string, number>;
  estimateId: string;
}) {
  if (estimatesToMaterialize.has(estimateId)) return true;
  const ctx = estimateContextById.get(estimateId);
  if (!ctx) return false;
  if (!materializedProjectIds.has(ctx.project.id) && materializedProjectIds.size >= REUSABLE_PROJECT_SOURCE_SEARCH_PROJECT_LIMIT) return false;
  const materializedEstimateCount = materializedEstimateCountsByProject.get(ctx.project.id) ?? 0;
  if (materializedEstimateCount >= REUSABLE_PROJECT_SOURCE_SEARCH_ESTIMATES_PER_PROJECT_LIMIT) return false;

  materializedProjectIds.add(ctx.project.id);
  materializedEstimateCountsByProject.set(ctx.project.id, materializedEstimateCount + 1);
  estimatesToMaterialize.add(estimateId);
  return true;
}

function normalizeReusableProjectSourceSearchInput(query: string) {
  return normalizeReusableSourceSearchQuery(query).slice(0, REUSABLE_PROJECT_SOURCE_SEARCH_MAX_QUERY_LENGTH);
}

function hashReusableProjectSourceSearchRateLimitKey(userId: string) {
  return createHash("sha256")
    .update([REUSABLE_PROJECT_SOURCE_SEARCH_RATE_LIMIT_SCOPE, userId.trim() || "-"].join("\u001f"))
    .digest("base64url");
}

async function assertReusableProjectSourceSearchRateLimit(userId: string, now = Date.now()) {
  const supabase = createSupabaseServiceRoleClient("archestimator-reusable-source-search-rate-limit");
  const keyHash = hashReusableProjectSourceSearchRateLimitKey(userId);
  const expiresAt = new Date(now + REUSABLE_PROJECT_SOURCE_SEARCH_RATE_WINDOW_MS).toISOString();
  const windowStart = new Date(now - REUSABLE_PROJECT_SOURCE_SEARCH_RATE_WINDOW_MS).toISOString();

  const { error: cleanupError } = await supabase
    .from("security_rate_limit_events")
    .delete()
    .lt("expires_at", new Date(now).toISOString());
  if (cleanupError) throw cleanupError;

  const { error: insertError } = await supabase.from("security_rate_limit_events").insert({
    scope: REUSABLE_PROJECT_SOURCE_SEARCH_RATE_LIMIT_SCOPE,
    key_hash: keyHash,
    metadata_json: { route: "reusable_project_source_search" } satisfies Json,
    expires_at: expiresAt,
  });
  if (insertError) throw insertError;

  const { count, error: countError } = await supabase
    .from("security_rate_limit_events")
    .select("id", { count: "exact", head: true })
    .eq("scope", REUSABLE_PROJECT_SOURCE_SEARCH_RATE_LIMIT_SCOPE)
    .eq("key_hash", keyHash)
    .gte("occurred_at", windowStart);
  if (countError) throw countError;

  if ((count ?? 0) > REUSABLE_PROJECT_SOURCE_SEARCH_RATE_LIMIT) {
    throw new Error("Please wait a moment before searching project sources again.");
  }
}

type ReusableSearchPrefilterTable = "estimate_nodes" | "estimate_tabs";

type ReusableSearchPrefilterClient = {
  from: (table: ReusableSearchPrefilterTable) => {
    select: (columns: string) => ReusableSearchPrefilterQuery;
  };
};

type ReusableSearchPrefilterQuery = PromiseLike<{ data: Array<{ estimate_id: string | null }> | null; error: unknown }> & {
  in: (column: string, values: string[]) => ReusableSearchPrefilterQuery;
  ilike: (column: string, pattern: string) => ReusableSearchPrefilterQuery;
  is: (column: string, value: null) => ReusableSearchPrefilterQuery;
  order: (column: string, options?: { ascending?: boolean }) => ReusableSearchPrefilterQuery;
  range: (from: number, to: number) => ReusableSearchPrefilterQuery;
};

async function fetchDistinctReusableSearchEstimateMatches({
  supabase,
  table,
  accessibleEstimateIds,
  likePattern,
  applyActiveTabFilter = false,
}: {
  supabase: ReusableSearchPrefilterClient;
  table: ReusableSearchPrefilterTable;
  accessibleEstimateIds: string[];
  likePattern: string;
  applyActiveTabFilter?: boolean;
}) {
  const matchingEstimateIds = new Set<string>();
  let offset = 0;
  let pageCount = 0;

  while (
    matchingEstimateIds.size < REUSABLE_PROJECT_SOURCE_SEARCH_DB_MATCH_LIMIT
    && pageCount < REUSABLE_PROJECT_SOURCE_SEARCH_DB_MATCH_PAGE_LIMIT
  ) {
    const selectColumns = table === "estimate_nodes" && applyActiveTabFilter
      ? "estimate_id, estimate_tabs!inner(id)"
      : "estimate_id";
    let query = supabase
      .from(table)
      .select(selectColumns)
      .in("estimate_id", accessibleEstimateIds);
    if (table === "estimate_nodes") query = query.in("kind", ["group", "area"]);
    let limitedQuery = query
      .ilike("name", likePattern);
    if (applyActiveTabFilter) {
      limitedQuery = limitedQuery.is(table === "estimate_nodes" ? "estimate_tabs.archived_at" : "archived_at", null);
    }
    const { data, error } = await limitedQuery
      .order("estimate_id", { ascending: true })
      .range(offset, offset + REUSABLE_PROJECT_SOURCE_SEARCH_DB_MATCH_LIMIT - 1);
    if (error) return { data: Array.from(matchingEstimateIds), error };

    const rows = data ?? [];
    for (const row of rows) {
      if (row.estimate_id) matchingEstimateIds.add(row.estimate_id);
      if (matchingEstimateIds.size >= REUSABLE_PROJECT_SOURCE_SEARCH_DB_MATCH_LIMIT) break;
    }
    if (rows.length < REUSABLE_PROJECT_SOURCE_SEARCH_DB_MATCH_LIMIT) break;
    offset += REUSABLE_PROJECT_SOURCE_SEARCH_DB_MATCH_LIMIT;
    pageCount += 1;
  }

  return { data: Array.from(matchingEstimateIds), error: null };
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
  const context = await requireCurrentUserContext();
  const query = normalizeReusableProjectSourceSearchInput(input.query);
  if (query.length < REUSABLE_PROJECT_SOURCE_SEARCH_MIN_QUERY_LENGTH) return { sources: [] };
  await assertReusableProjectSourceSearchRateLimit(context.userId);

  const { projects } = await listCurrentWorkspaceProjects();
  const accessibleProjects = projects
    .filter((item) => item.accessKind !== "pending-invite");
  if (accessibleProjects.length === 0) return { sources: [] };

  const estimatesByProject = await Promise.all(
    accessibleProjects.map(async (item) => {
      const estimates = await listProjectEstimateSheets(item.project.id);
      return estimates;
    }),
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
    if (textMatchesReusableSourceQuery(query, [item.project.name])) addReusableSearchSourceUnit(sourcesByKey, [projectSourceFor(item.project)]);
  }
  for (const estimateId of accessibleEstimateIds) {
    const ctx = estimateContextById.get(estimateId);
    if (ctx && textMatchesReusableSourceQuery(query, [ctx.estimate.name, ctx.estimate.sheetCode])) {
      addReusableSearchSourceUnit(sourcesByKey, [projectSourceFor(ctx.project), estimateSourceFor(ctx.project, ctx.estimate)]);
    }
  }

  if (accessibleEstimateIds.length === 0) return { sources: Array.from(sourcesByKey.values()) };

  // (2) U5: instead of materializing EVERY estimate's whole tree on every keystroke
  // (PERF-1, O(projects×estimates×tabs×nodes)), pre-filter to the estimates that
  // actually contain a name match via two bounded indexed ILIKE queries, then
  // materialize ONLY those for the rich tab/node sources. RLS-scoped (user client
  // + the accessible-estimate id allow-list).
  const supabase = await createSupabaseServerClient();
  const likePattern = toReusableSearchLikePattern(query);
  const estimatesToMaterialize = new Set<string>();
  const materializedProjectIds = new Set<string>();
  const materializedEstimateCountsByProject = new Map<string, number>();
  const tabsByEstimateId = new Map<string, EstimateTabSummary[]>();
  const addEstimateToMaterialize = (estimateId: string) => addReusableSearchEstimateMaterializationCandidate({
    estimateContextById,
    estimatesToMaterialize,
    materializedProjectIds,
    materializedEstimateCountsByProject,
    estimateId,
  });

  async function getSortedTabsForEstimate(projectId: string, estimateId: string) {
    const existing = tabsByEstimateId.get(estimateId);
    if (existing) return existing;
    const tabs = sortEstimateTabsForDisplay(await getEstimateTabs(projectId, estimateId, { allowLegacyFallback: true }));
    tabsByEstimateId.set(estimateId, tabs);
    return tabs;
  }

  const { data: matchingNodeEstimateIds, error: matchingNodeError } = await fetchDistinctReusableSearchEstimateMatches({
    supabase: supabase as unknown as ReusableSearchPrefilterClient,
    table: "estimate_nodes",
    accessibleEstimateIds,
    likePattern,
    applyActiveTabFilter: true,
  });
  if (matchingNodeError) throw matchingNodeError;
  for (const estimateId of matchingNodeEstimateIds ?? []) {
    addEstimateToMaterialize(estimateId);
  }

  // Tab-name matches use estimate_tabs (added by the foundation; tolerate its absence
  // on the legacy schema, where the synthetic "Main" tab carries no searchable name).
  try {
    const { data: matchingTabEstimateIds, error: matchingTabError } = await fetchDistinctReusableSearchEstimateMatches({
      supabase: supabase as unknown as ReusableSearchPrefilterClient,
      table: "estimate_tabs",
      accessibleEstimateIds,
      likePattern,
      applyActiveTabFilter: true,
    });
    if (matchingTabError && !isMissingRelationError(matchingTabError as never, "estimate_tabs")) throw matchingTabError;
    for (const estimateId of matchingTabEstimateIds ?? []) {
      addEstimateToMaterialize(estimateId);
    }
  } catch (error) {
    if (!isMissingRelationError(error as never, "estimate_tabs")) throw error;
  }

  // The first rendered tab displays as "Page 001" even when the stored tab name
  // is "Main" or another raw name, so the DB tab-name ILIKE above cannot find a
  // display-label-only search. Only treat the synthetic display label as a
  // materialization pre-filter on an exact normalized label match: substring
  // matching against a constant first-tab label would select every accessible
  // estimate for short/common queries such as "p" or "page".
  const firstPageDisplayQuery = normalizeReusableSourceSearchQuery(formatEstimatePageTabName(1));
  if (query === firstPageDisplayQuery) {
    for (const estimateId of accessibleEstimateIds) {
      const ctx = estimateContextById.get(estimateId);
      if (!ctx) continue;
      const tabs = await getSortedTabsForEstimate(ctx.project.id, estimateId);
      if (tabs.some((tab, index) => textMatchesReusableSourceQuery(query, [getEstimateTabDisplayName(tab, index)]))) {
        addEstimateToMaterialize(estimateId);
      }
    }
  }

  // (3) Materialize ONLY the matching estimates; collect the rich tab/node sources.
  for (const estimateId of estimatesToMaterialize) {
    const ctx = estimateContextById.get(estimateId);
    if (!ctx) continue;
    const { project, estimate } = ctx;
    const tabs = await getSortedTabsForEstimate(project.id, estimate.id);
    const tabTrees = await Promise.all(
      tabs.map((tab) => getEstimateTabTree(project.id, estimate.id, tab.id, { allowLegacyFallback: true })),
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
        addReusableSearchSourceUnit(sourcesByKey, [
          projectSourceFor(project),
          estimateSourceFor(project, estimate),
          tabSource,
        ]);
      }
      for (const source of collectProjectNodeSearchSources({ context, nodes: tabTrees[tabIndex]?.tree ?? [], query })) {
        addReusableSearchSourceUnit(sourcesByKey, [
          projectSourceFor(project),
          estimateSourceFor(project, estimate),
          tabSource,
          source,
        ]);
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

  const supabase = await createSupabaseServerClient();

  // Re-read-at-insert (DATA-4 / denial 7): re-resolve the source by id under the
  // RLS-scoped user client — never trust the cached preview. A source removed
  // between browse and insert surfaces a clear error rather than a silent miss.
  const { data: sourceEstimate, error: sourceEstimateError } = await supabase
    .from("estimates")
    .select("id")
    .eq("id", input.source.estimateId)
    .maybeSingle();
  if (sourceEstimateError) throw sourceEstimateError;
  if (!sourceEstimate) throw new Error("This project source is no longer available.");

  if (input.source.nodeId) {
    const { data: sourceNode, error: sourceNodeError } = await supabase
      .from("estimate_nodes")
      .select("id")
      .eq("id", input.source.nodeId)
      .eq("estimate_id", input.source.estimateId)
      .maybeSingle();
    if (sourceNodeError) throw sourceNodeError;
    if (!sourceNode) throw new Error("This project source is no longer available.");
  }

  // RLS-scoped user client only (never an admin/service-role client) — matches the
  // reusable-source discipline; the RPC re-checks can_edit (target) + can_access (source).
  const { data: copyResult, error: copyError } = await supabase.rpc(
    "insert_estimate_subtree_into_estimate_with_history",
    {
      target_project_id: input.targetProjectId,
      target_estimate_id: input.targetEstimateId,
      target_parent_node_id: input.targetParentNodeId,
      source_estimate_id: input.source.estimateId,
      // Whole-tab insert passes null; the SQL param is nullable, but generated types
      // widen a no-default uuid param to a required `string`, so cast just this arg.
      source_root_node_id: (input.source.nodeId ?? null) as unknown as string,
      source_tab_id: input.source.tabId,
      acting_user_id: currentUser.userId,
      correlation_id: projectSourceInsertCorrelationId(input),
    },
  );
  if (copyError) throw new Error(`Could not insert project source: ${copyError.message}`);

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
