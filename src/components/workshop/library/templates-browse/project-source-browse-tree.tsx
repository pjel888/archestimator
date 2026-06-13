import { FolderSimple, StackSimple } from "@phosphor-icons/react/dist/ssr";

import { TREE_ROW_ICON_SIZE, type TreeNode as UiTreeNode } from "@/components/ui/tree";
import type {
  ProjectEstimateReusableSource,
  ProjectNodeReusableSource,
  ProjectReusableEstimateSource,
  ProjectTabReusableSource,
  ReusableEstimateSource,
} from "@/lib/reusable-sources/types";

export type ProjectBrowseTreeDatum =
  | { type: "project-section" }
  | { type: "project-source"; source: ProjectReusableEstimateSource };

type BrowseProjectGroup = {
  source: Extract<ProjectReusableEstimateSource, { kind: "project" }>;
  estimates: Map<string, BrowseEstimateGroup>;
};

type BrowseEstimateGroup = {
  source: ProjectEstimateReusableSource;
  tabs: Map<string, BrowseTabGroup>;
};

type BrowseTabGroup = {
  source: ProjectTabReusableSource;
  nodes: ProjectNodeReusableSource[];
};

function projectFallbackName(prefix: string, id: string) {
  return `${prefix} ${id.slice(0, 8)}`;
}

export function browseProjectSourceNodeId(source: ProjectReusableEstimateSource) {
  if (source.kind === "project") return `browse-project:${source.projectId}`;
  if (source.kind === "project-estimate") return `browse-project-estimate:${source.estimateId}`;
  if (source.kind === "project-tab") return `browse-project-tab:${source.tabId}`;
  return `browse-project-node:${source.nodeId}`;
}

export function reusableProjectBrowseSourceKey(source: ReusableEstimateSource) {
  if (source.kind === "custom-template") return `custom-template:${source.template.id}`;
  if (source.kind === "project") return `project:${source.projectId}`;
  if (source.kind === "project-estimate") return `project-estimate:${source.estimateId}`;
  if (source.kind === "project-tab") return `project-tab:${source.tabId}`;
  return `project-node:${source.nodeId}`;
}

export function hasReusableEstimateOutline(sources: ReusableEstimateSource[], estimateId: string) {
  return sources.some((source) => {
    if (source.kind !== "project-tab" && source.kind !== "project-node") return false;
    return source.estimateId === estimateId;
  });
}

export function mergeReusableProjectBrowseSources(
  currentSources: ReusableEstimateSource[],
  incomingSources: ReusableEstimateSource[],
  outlineEstimateId: string,
) {
  const sourcesByKey = new Map<string, ReusableEstimateSource>();
  for (const source of currentSources) {
    if ((source.kind === "project-tab" || source.kind === "project-node") && source.estimateId === outlineEstimateId) {
      continue;
    }
    sourcesByKey.set(reusableProjectBrowseSourceKey(source), source);
  }
  for (const source of incomingSources) sourcesByKey.set(reusableProjectBrowseSourceKey(source), source);
  return Array.from(sourcesByKey.values());
}

export function findProjectEstimateSourceByBrowseNodeId(sources: ReusableEstimateSource[], nodeId: string) {
  for (const source of sources) {
    if (source.kind === "project-estimate" && browseProjectSourceNodeId(source) === nodeId) return source;
  }
  return null;
}

export function findProjectSourceByBrowseNodeId(sources: ReusableEstimateSource[], nodeId: string) {
  for (const source of sources) {
    if (source.kind === "project" && browseProjectSourceNodeId(source) === nodeId) return source;
  }
  return null;
}

export function hasReusableProjectEstimates(sources: ReusableEstimateSource[], projectId: string) {
  return sources.some((source) => source.kind === "project-estimate" && source.projectId === projectId);
}

export function mergeReusableProjectEstimateBrowseSources(
  currentSources: ReusableEstimateSource[],
  incomingSources: ReusableEstimateSource[],
  projectId: string,
) {
  const sourcesByKey = new Map<string, ReusableEstimateSource>();
  for (const source of currentSources) {
    if (source.kind !== "custom-template" && source.projectId === projectId && source.kind !== "project") continue;
    sourcesByKey.set(reusableProjectBrowseSourceKey(source), source);
  }
  for (const source of incomingSources) sourcesByKey.set(reusableProjectBrowseSourceKey(source), source);
  return Array.from(sourcesByKey.values());
}

export function getUnloadedProjectBrowseNodeIds(
  sources: ReusableEstimateSource[],
  loadingProjectIds: readonly string[],
  loadedProjectIds: readonly string[],
) {
  const loadingIds = new Set(loadingProjectIds);
  const loadedIds = new Set(loadedProjectIds);
  return sources.flatMap((source) => {
    if (source.kind !== "project") return [];
    if (loadingIds.has(source.projectId) || loadedIds.has(source.projectId)) return [];
    if (hasReusableProjectEstimates(sources, source.projectId)) return [];
    return [browseProjectSourceNodeId(source)];
  });
}

export function getUnloadedProjectEstimateBrowseNodeIds(
  sources: ReusableEstimateSource[],
  loadingEstimateIds: readonly string[],
) {
  const loadingIds = new Set(loadingEstimateIds);
  return sources.flatMap((source) => {
    if (source.kind !== "project-estimate") return [];
    if (loadingIds.has(source.estimateId)) return [];
    if (hasReusableEstimateOutline(sources, source.estimateId)) return [];
    return [browseProjectSourceNodeId(source)];
  });
}

function ensureProject(projects: Map<string, BrowseProjectGroup>, projectId: string, name?: string): BrowseProjectGroup {
  const existing = projects.get(projectId);
  if (existing) {
    if (name && existing.source.name === projectFallbackName("Project", projectId)) existing.source = { ...existing.source, name };
    return existing;
  }
  const group = {
    source: { kind: "project", projectId, name: name ?? projectFallbackName("Project", projectId) },
    estimates: new Map(),
  } satisfies BrowseProjectGroup;
  projects.set(projectId, group);
  return group;
}

function ensureEstimate(
  projects: Map<string, BrowseProjectGroup>,
  projectId: string,
  estimateId: string,
  name?: string,
  sheetCode?: string | null,
): BrowseEstimateGroup {
  const project = ensureProject(projects, projectId);
  const existing = project.estimates.get(estimateId);
  if (existing) {
    if (name && existing.source.name === projectFallbackName("Estimate", estimateId)) {
      existing.source = { ...existing.source, name, sheetCode: sheetCode ?? existing.source.sheetCode };
    }
    return existing;
  }
  const group = {
    source: {
      kind: "project-estimate",
      projectId,
      estimateId,
      name: name ?? projectFallbackName("Estimate", estimateId),
      sheetCode: sheetCode ?? null,
    },
    tabs: new Map(),
  } satisfies BrowseEstimateGroup;
  project.estimates.set(estimateId, group);
  return group;
}

function ensureTab(
  projects: Map<string, BrowseProjectGroup>,
  projectId: string,
  estimateId: string,
  tabId: string,
  name?: string,
): BrowseTabGroup {
  const estimate = ensureEstimate(projects, projectId, estimateId);
  const existing = estimate.tabs.get(tabId);
  if (existing) {
    if (name && existing.source.name === projectFallbackName("Tab", tabId)) existing.source = { ...existing.source, name };
    return existing;
  }
  const group = {
    source: { kind: "project-tab", projectId, estimateId, tabId, name: name ?? projectFallbackName("Tab", tabId) },
    nodes: [],
  } satisfies BrowseTabGroup;
  estimate.tabs.set(tabId, group);
  return group;
}

export function buildProjectSourceBrowseTreeNodes(projectSources: ReusableEstimateSource[]): UiTreeNode[] {
  const projects = new Map<string, BrowseProjectGroup>();

  for (const source of projectSources) {
    if (source.kind === "custom-template") continue;
    if (source.kind === "project") {
      ensureProject(projects, source.projectId, source.name).source = source;
      continue;
    }
    if (source.kind === "project-estimate") {
      ensureEstimate(projects, source.projectId, source.estimateId, source.name, source.sheetCode).source = source;
      continue;
    }
    if (source.kind === "project-tab") {
      ensureTab(projects, source.projectId, source.estimateId, source.tabId, source.name).source = source;
      continue;
    }
    const tab = ensureTab(projects, source.projectId, source.estimateId, source.tabId);
    tab.nodes = [...tab.nodes.filter((node) => node.nodeId !== source.nodeId), source];
  }

  const projectNodes = Array.from(projects.values())
    .sort((left, right) => left.source.name.localeCompare(right.source.name))
    .map((project) => ({
      id: browseProjectSourceNodeId(project.source),
      label: project.source.name,
      ariaLabel: `${project.source.name} project source`,
      isLeaf: false,
      draggable: false,
      icon: <FolderSimple size={TREE_ROW_ICON_SIZE} weight="regular" className="shrink-0 text-tertiary" aria-hidden="true" />,
      data: { browseNode: { type: "project-source", source: project.source } satisfies ProjectBrowseTreeDatum },
      children: Array.from(project.estimates.values())
        .sort((left, right) => left.source.name.localeCompare(right.source.name))
        .map((estimate) => ({
          id: browseProjectSourceNodeId(estimate.source),
          label: estimate.source.name,
          ariaLabel: estimate.source.sheetCode ? `${estimate.source.name} estimate ${estimate.source.sheetCode}` : `${estimate.source.name} estimate`,
          isLeaf: false,
          draggable: false,
          icon: <StackSimple size={TREE_ROW_ICON_SIZE} weight="regular" className="shrink-0 text-tertiary" aria-hidden="true" />,
          data: { browseNode: { type: "project-source", source: estimate.source } satisfies ProjectBrowseTreeDatum },
          children: Array.from(estimate.tabs.values())
            .sort((left, right) => left.source.name.localeCompare(right.source.name))
            .map((tab) => ({
              id: browseProjectSourceNodeId(tab.source),
              label: tab.source.name,
              ariaLabel: `${tab.source.name} project tab source`,
              isLeaf: tab.nodes.length === 0,
              draggable: false,
              icon: <StackSimple size={TREE_ROW_ICON_SIZE} weight="regular" className="shrink-0 text-tertiary" aria-hidden="true" />,
              data: { browseNode: { type: "project-source", source: tab.source } satisfies ProjectBrowseTreeDatum },
              children: tab.nodes
                .sort((left, right) => left.name.localeCompare(right.name))
                .map((node) => ({
                  id: browseProjectSourceNodeId(node),
                  label: node.name,
                  ariaLabel: `${node.name} project ${node.nodeKind}`,
                  isLeaf: true,
                  draggable: false,
                  icon: <StackSimple size={TREE_ROW_ICON_SIZE} weight="regular" className="shrink-0 text-tertiary" aria-hidden="true" />,
                  data: { browseNode: { type: "project-source", source: node } satisfies ProjectBrowseTreeDatum },
                })),
            })),
        })),
    }));

  if (projectNodes.length === 0) return [];
  return [{
    id: "browse-project-sources",
    label: "Projects",
    ariaLabel: "Projects reusable sources",
    isLeaf: false,
    draggable: false,
    icon: <FolderSimple size={TREE_ROW_ICON_SIZE} weight="regular" className="shrink-0 text-tertiary" aria-hidden="true" />,
    data: { browseNode: { type: "project-section" } satisfies ProjectBrowseTreeDatum },
    children: projectNodes,
  }];
}
