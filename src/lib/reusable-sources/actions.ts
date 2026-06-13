"use server";

import { requireCurrentUserContext } from "@/lib/auth/session";
import {
  getEstimateTabs,
  getEstimateTabTree,
  listCurrentWorkspaceProjects,
  listProjectEstimateSheets,
} from "@/lib/repositories/workspace-repository";
import type {
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
