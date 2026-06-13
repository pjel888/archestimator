"use server";

import { createHash } from "node:crypto";

import { requireCurrentUserContext } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/ids";
import {
  getEstimateTabs,
  getEstimateTabTree,
  getProjectEstimateTreeByEstimate,
  listCurrentWorkspaceProjects,
  listProjectEstimateSheets,
} from "@/lib/repositories/workspace-repository";
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

export async function searchReusableProjectSources(input: { query: string }): Promise<ReusableProjectSourceSearchResult> {
  await requireCurrentUserContext();
  const query = normalizeReusableSourceSearchQuery(input.query);
  if (!query) return { sources: [] };

  const { projects } = await listCurrentWorkspaceProjects();
  const accessibleProjects = projects.filter((item) => item.accessKind !== "pending-invite");
  const estimatesByProject = await Promise.all(
    accessibleProjects.map((item) => listProjectEstimateSheets(item.project.id)),
  );
  const sourcesByKey = new Map<string, ProjectReusableEstimateSource>();

  for (const [projectIndex, item] of accessibleProjects.entries()) {
    const project = item.project;
    const projectSource: ProjectReusableSource = {
      kind: "project",
      projectId: project.id,
      name: project.name,
      metadata: { projectName: project.name },
    };
    if (textMatchesReusableSourceQuery(query, [project.name])) {
      addReusableSearchSource(sourcesByKey, projectSource);
    }

    for (const estimate of estimatesByProject[projectIndex] ?? []) {
      const estimateSource: ProjectEstimateReusableSource = {
        kind: "project-estimate",
        projectId: project.id,
        estimateId: estimate.id,
        name: estimate.name,
        sheetCode: estimate.sheetCode,
        metadata: {
          projectName: project.name,
          estimateName: estimate.name,
          sheetCode: estimate.sheetCode,
          updatedAt: estimate.updatedAt,
        },
      };
      if (textMatchesReusableSourceQuery(query, [estimate.name, estimate.sheetCode])) {
        addReusableSearchSource(sourcesByKey, projectSource);
        addReusableSearchSource(sourcesByKey, estimateSource);
      }

      const tabs = await getEstimateTabs(project.id, estimate.id, { allowLegacyFallback: true });
      const tabTrees = await Promise.all(
        tabs.map((tab) => getEstimateTabTree(project.id, estimate.id, tab.id, { allowLegacyFallback: true })),
      );
      tabs.forEach((tab, tabIndex) => {
        const updatedAt = tabTrees[tabIndex]?.estimate?.updated_at ?? estimate.updatedAt;
        const tabSource: ProjectTabReusableSource = {
          kind: "project-tab",
          projectId: project.id,
          estimateId: estimate.id,
          tabId: tab.id,
          name: tab.name,
          metadata: {
            projectName: project.name,
            estimateName: estimate.name,
            sheetCode: estimate.sheetCode,
            tabName: tab.name,
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
          updatedAt,
        };
        if (textMatchesReusableSourceQuery(query, [tab.name])) {
          addReusableSearchSource(sourcesByKey, projectSource);
          addReusableSearchSource(sourcesByKey, estimateSource);
          addReusableSearchSource(sourcesByKey, tabSource);
        }
        for (const source of collectProjectNodeSearchSources({
          context,
          nodes: tabTrees[tabIndex]?.tree ?? [],
          query,
        })) {
          addReusableSearchSource(sourcesByKey, projectSource);
          addReusableSearchSource(sourcesByKey, estimateSource);
          addReusableSearchSource(sourcesByKey, tabSource);
          addReusableSearchSource(sourcesByKey, source);
        }
      });
    }
  }

  return { sources: Array.from(sourcesByKey.values()) };
}

export async function getReusableEstimateOutline(input: { projectId: string; estimateId: string }): Promise<ReusableEstimateOutlineResult> {
  await requireCurrentUserContext();
  const tabs = await getEstimateTabs(input.projectId, input.estimateId, { allowLegacyFallback: true });
  const tabTrees = await Promise.all(
    tabs.map((tab) => getEstimateTabTree(input.projectId, input.estimateId, tab.id, { allowLegacyFallback: true })),
  );

  const sources: ReusableEstimateOutlineResult["sources"] = [];
  tabs.forEach((tab, index) => {
    const updatedAt = tabTrees[index]?.estimate?.updated_at ?? null;
    sources.push({
      kind: "project-tab",
      projectId: input.projectId,
      estimateId: input.estimateId,
      tabId: tab.id,
      name: tab.name,
      metadata: {
        tabName: tab.name,
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
        updatedAt,
      },
      nodes: tabTrees[index]?.tree ?? [],
    }));
  });

  return { sources };
}

// U2: the project-source -> estimate insert path. The RPC is not yet in the
// generated types (its apply is owner-gated + sequenced after D-A), so the call
// is narrowly typed here; remove this cast after `gen types` includes it.
type SubtreeInsertRpcClient = {
  rpc: (
    name: "insert_estimate_subtree_into_estimate_with_history",
    args: {
      target_project_id: string;
      target_estimate_id: string;
      target_parent_node_id: string;
      source_estimate_id: string;
      source_root_node_id: string | null;
      source_tab_id: string;
      acting_user_id: string;
      correlation_id: string;
    },
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};

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
  const insertClient = supabase as unknown as SubtreeInsertRpcClient;
  const { data: copyResult, error: copyError } = await insertClient.rpc(
    "insert_estimate_subtree_into_estimate_with_history",
    {
      target_project_id: input.targetProjectId,
      target_estimate_id: input.targetEstimateId,
      target_parent_node_id: input.targetParentNodeId,
      source_estimate_id: input.source.estimateId,
      source_root_node_id: input.source.nodeId ?? null,
      source_tab_id: input.source.tabId,
      acting_user_id: currentUser.userId,
      correlation_id: projectSourceInsertCorrelationId(input),
    },
  );
  if (copyError) throw new Error(`Could not insert project source: ${copyError.message}`);

  const insertedRootNodeIds = readInsertedRootNodeIds(copyResult);
  const { project, estimate, tree } = await getProjectEstimateTreeByEstimate(input.targetProjectId, input.targetEstimateId);
  if (!project || !estimate) throw new Error("Estimate not found after inserting the project source.");
  return { tree, insertedRootNodeIds };
}
