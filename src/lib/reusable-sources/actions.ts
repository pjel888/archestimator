"use server";

import { requireCurrentUserContext } from "@/lib/auth/session";
import type { EstimateTreeNode } from "@/lib/estimates/types";
import {
  getEstimateTabs,
  getEstimateTabTree,
  listCurrentWorkspaceProjects,
  listProjectEstimateSheets,
} from "@/lib/repositories/workspace-repository";
import type {
  ProjectEstimateReusableSource,
  ProjectNodeReusableSource,
  ProjectReusableSource,
  ProjectTabReusableSource,
  ReusableEstimateSource,
} from "./types";

export type ReusableProjectSourceListResult = {
  sources: Array<ProjectReusableSource | ProjectEstimateReusableSource>;
};

export type ReusableEstimateOutlineResult = {
  sources: Array<ProjectTabReusableSource | ProjectNodeReusableSource>;
};

function collectProjectNodeSources({
  projectId,
  estimateId,
  tabId,
  nodes,
}: {
  projectId: string;
  estimateId: string;
  tabId: string;
  nodes: EstimateTreeNode[];
}): ProjectNodeReusableSource[] {
  const sources: ProjectNodeReusableSource[] = [];

  function visit(node: EstimateTreeNode) {
    if (node.kind === "group" || node.kind === "area") {
      sources.push({
        kind: "project-node",
        projectId,
        estimateId,
        tabId,
        nodeId: node.id,
        nodeKind: node.kind,
        name: node.name,
      });
    }
    node.children?.forEach(visit);
  }

  nodes.forEach(visit);
  return sources;
}

export async function listReusableProjectSources(): Promise<ReusableProjectSourceListResult> {
  await requireCurrentUserContext();
  const { projects } = await listCurrentWorkspaceProjects();
  const accessibleProjects = projects.filter((item) => item.accessKind !== "pending-invite");
  const estimatesByProject = await Promise.all(
    accessibleProjects.map((item) => listProjectEstimateSheets(item.project.id)),
  );

  const sources: ReusableProjectSourceListResult["sources"] = [];
  accessibleProjects.forEach((item, index) => {
    sources.push({
      kind: "project",
      projectId: item.project.id,
      name: item.project.name,
    });
    for (const estimate of estimatesByProject[index] ?? []) {
      sources.push({
        kind: "project-estimate",
        projectId: item.project.id,
        estimateId: estimate.id,
        name: estimate.name,
        sheetCode: estimate.sheetCode,
      });
    }
  });

  return { sources };
}

export async function getReusableEstimateOutline(input: { projectId: string; estimateId: string }): Promise<ReusableEstimateOutlineResult> {
  await requireCurrentUserContext();
  const tabs = await getEstimateTabs(input.projectId, input.estimateId);
  const tabTrees = await Promise.all(
    tabs.map((tab) => getEstimateTabTree(input.projectId, input.estimateId, tab.id)),
  );

  const sources: ReusableEstimateOutlineResult["sources"] = [];
  tabs.forEach((tab, index) => {
    sources.push({
      kind: "project-tab",
      projectId: input.projectId,
      estimateId: input.estimateId,
      tabId: tab.id,
      name: tab.name,
    });
    sources.push(...collectProjectNodeSources({
      projectId: input.projectId,
      estimateId: input.estimateId,
      tabId: tab.id,
      nodes: tabTrees[index]?.tree ?? [],
    }));
  });

  return { sources };
}

export type { ReusableEstimateSource };
