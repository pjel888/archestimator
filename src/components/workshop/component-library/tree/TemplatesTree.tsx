"use client";

import { useCallback, useMemo, useState, type DragEvent } from "react";
import {
  Buildings,
  CaretDown,
  CaretRight,
  Circle,
  FolderSimple,
  Package,
  PencilSimple,
  Plus,
  StackPlus,
  StackSimple,
  Table,
  Trash,
} from "@phosphor-icons/react/dist/ssr";

import { ContextActionMenuContent, type ActionMenuGroup } from "@/components/ui/action-menu";
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from "@/components/ui/context-menu";
import { TREE_ROW_ICON_SIZE, Tree, type TreeNode as UiTreeNode } from "@/components/ui/tree";
import { WORKSHOP_TREE_VIRTUALIZATION } from "@/lib/workshop/virtualization-flags";
import type { TreeSelectionNode } from "@/lib/bulk-selection/tree-selection";
import { getProjectReusableSourceDisplayName, getProjectTabReusableSourceDisplayName } from "@/lib/reusable-sources/display";
import type {
  ProjectEstimateReusableSource,
  ProjectNodeReusableSource,
  ProjectReusableSource,
  ProjectReusableEstimateSource,
  ProjectSourceInsertTarget,
  ProjectTabReusableSource,
  ReusableEstimateSource,
} from "@/lib/reusable-sources/types";
import type { EstimateRowItem, EstimateTreeNode } from "../../estimate-tree-data";
import { getComponentName, getComponentPrice, pesoFormatter } from "../helpers";
import {
  computeTemplateNodeTotal,
  filterTemplatesByQuery,
  getTemplateRootKinds,
  summarizeEstimateTemplate,
  templateMatchesQuery,
  toTemplateTreeItemId,
  type EstimateTemplate,
} from "../templates";

/** Per-row domain payload carried on `UiTreeNode.data.templatesNode`. */
export type TemplatesTreeDatum =
  | { type: "section"; section: "custom-templates" | "projects" }
  | { type: "category"; category: string }
  | { type: "template"; template: EstimateTemplate }
  | { type: "template-node"; template: EstimateTemplate; node: EstimateTreeNode }
  | { type: "template-row"; template: EstimateTemplate; item: EstimateRowItem }
  | { type: "project"; source: ProjectReusableSource }
  | { type: "project-estimate"; source: ProjectEstimateReusableSource }
  | { type: "project-tab"; source: ProjectTabReusableSource }
  | { type: "project-node"; source: ProjectNodeReusableSource }
  | { type: "project-row"; source: ProjectNodeReusableSource; item: EstimateRowItem }
  // U23: a placeholder child rendered in-place under a project/estimate folder
  // whose next level is still loading — a skeleton row, never a spinner.
  | { type: "skeleton" };

/** Stable empty default so optional id-list props don't re-trigger memoization. */
const EMPTY_ID_LIST: readonly string[] = [];
const EMPTY_PROJECT_SOURCES: ReusableEstimateSource[] = [];
const EMPTY_TEMPLATE_CATEGORIES: string[] = [];

/** Skeleton rows shown under a cold-expanded project/estimate while it loads. */
const SKELETON_CHILD_COUNT = 3;
const TEMPLATES_TREE_INDENT_STEP = 20;

function buildSkeletonChildNodes(parentId: string): UiTreeNode[] {
  return Array.from({ length: SKELETON_CHILD_COUNT }, (_unused, index) => ({
    id: `${parentId}__loading-${index}`,
    label: "Loading…",
    ariaLabel: "Loading reusable source",
    isLeaf: true,
    selectable: false,
    draggable: false,
    data: { templatesNode: { type: "skeleton" } satisfies TemplatesTreeDatum },
  } satisfies UiTreeNode));
}

/**
 * Injects in-place skeleton child rows under any project/estimate folder that
 * is currently loading its next level and has no resident children yet. Once
 * real children arrive (or loading stops), the condition no longer holds and
 * the skeletons fall away — so the rows swap to content with zero layout shift.
 */
function injectProjectSourceSkeletons(
  nodes: UiTreeNode[],
  loadingProjectIds: ReadonlySet<string>,
  loadingEstimateIds: ReadonlySet<string>,
): UiTreeNode[] {
  if (loadingProjectIds.size === 0 && loadingEstimateIds.size === 0) return nodes;
  function visit(node: UiTreeNode): UiTreeNode {
    const mappedChildren = node.children?.map(visit);
    const datum = getTemplatesTreeDatum(node);
    const hasChildren = (mappedChildren?.length ?? 0) > 0;
    if (!hasChildren && datum?.type === "project" && loadingProjectIds.has(datum.source.projectId)) {
      return { ...node, children: buildSkeletonChildNodes(node.id) };
    }
    if (!hasChildren && datum?.type === "project-estimate" && loadingEstimateIds.has(datum.source.estimateId)) {
      return { ...node, children: buildSkeletonChildNodes(node.id) };
    }
    return mappedChildren ? { ...node, children: mappedChildren } : node;
  }
  return nodes.map(visit);
}

export function templatesTreeSectionId(section: "custom-templates" | "projects") {
  return `templates-tree-section-${section}`;
}

export function templatesTreeCategoryId(category: string) {
  return `templates-tree-category-${category.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

function projectSourceTreeItemId(source: ReusableEstimateSource) {
  if (source.kind === "custom-template") return toTemplateTreeItemId(source.template.id);
  if (source.kind === "project") return `source-project-${source.projectId}`;
  if (source.kind === "project-estimate") return `source-estimate-${source.estimateId}`;
  if (source.kind === "project-tab") return `source-tab-${source.tabId}`;
  return `source-node-${source.nodeId}`;
}

function templateInnerNodeId(templateId: string, nodeId: string) {
  return `${toTemplateTreeItemId(templateId)}::node-${nodeId}`;
}

function templateInnerRowId(templateId: string, nodeId: string, rowId: string, index: number) {
  return `${toTemplateTreeItemId(templateId)}::node-${nodeId}::row-${rowId}-${index}`;
}

function projectSourceRowItemId(source: ProjectNodeReusableSource, item: EstimateRowItem, index: number) {
  return `${projectSourceTreeItemId(source)}::row-${item.id}-${index}`;
}

function getTemplatesTreeDatum(node: UiTreeNode): TemplatesTreeDatum | undefined {
  return node.data?.templatesNode as TemplatesTreeDatum | undefined;
}

// One neutral node glyph for every estimate node (single-node model).
function NodeKindIcon() {
  return <Circle size={TREE_ROW_ICON_SIZE} weight="regular" className="shrink-0 text-tertiary" aria-hidden="true" />;
}

function TemplateRootIcon({ template }: { template: EstimateTemplate }) {
  // A single-root template reads as the one node it inserts (the neutral node
  // glyph); a template with multiple roots reads as a stack.
  const rootKinds = getTemplateRootKinds(template);
  if (rootKinds.length === 1) return <NodeKindIcon />;
  return <StackSimple size={TREE_ROW_ICON_SIZE} weight="regular" className="shrink-0 text-tertiary" aria-hidden="true" />;
}

function projectFallbackName(prefix: string, id: string) {
  return `${prefix} ${id.slice(0, 8)}`;
}

function toTemplateInnerUiNodes(template: EstimateTemplate, node: EstimateTreeNode): UiTreeNode {
  const childNodes = (node.children ?? []).map((child) => toTemplateInnerUiNodes(template, child));
  const rowNodes = (node.estimateRowItems ?? []).map((item, index) => ({
    id: templateInnerRowId(template.id, node.id, item.id, index),
    label: getComponentName(item),
    ariaLabel: `${getComponentName(item)} template component`,
    isLeaf: true,
    icon: <Package size={TREE_ROW_ICON_SIZE} weight="regular" className="shrink-0 text-tertiary" aria-hidden="true" />,
    data: { templatesNode: { type: "template-row", template, item } satisfies TemplatesTreeDatum },
  } satisfies UiTreeNode));

  // Inner groups/areas drag out as their own subtree and join selection —
  // every row in this tree is a draggable, selectable unit.
  return {
    id: templateInnerNodeId(template.id, node.id),
    label: node.name,
    ariaLabel: `${node.name} template area`,
    isLeaf: childNodes.length === 0 && rowNodes.length === 0,
    icon: <NodeKindIcon />,
    children: [...childNodes, ...rowNodes],
    data: { templatesNode: { type: "template-node", template, node } satisfies TemplatesTreeDatum },
  };
}

function buildTemplateCategoryTreeNodes(templates: EstimateTemplate[], customTemplateCategories: string[] = []): UiTreeNode[] {
  const templatesByCategory = new Map<string, EstimateTemplate[]>();
  for (const template of templates) {
    const categoryTemplates = templatesByCategory.get(template.category);
    if (categoryTemplates) categoryTemplates.push(template);
    else templatesByCategory.set(template.category, [template]);
  }
  for (const category of customTemplateCategories) {
    if (!templatesByCategory.has(category)) templatesByCategory.set(category, []);
  }

  return Array.from(templatesByCategory.entries()).sort(([left], [right]) => left.localeCompare(right)).map(([category, categoryTemplates]) => ({
    id: templatesTreeCategoryId(category),
    label: category,
    ariaLabel: `${category} templates`,
    isLeaf: categoryTemplates.length === 0,
    selectable: categoryTemplates.length > 0,
    icon: <FolderSimple size={TREE_ROW_ICON_SIZE} weight="regular" className="shrink-0 text-tertiary" aria-hidden="true" />,
    data: { templatesNode: { type: "category", category } satisfies TemplatesTreeDatum },
    children: categoryTemplates
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((template) => ({
        id: toTemplateTreeItemId(template.id),
        label: template.name,
        ariaLabel: `${template.name} estimate template`,
        isLeaf: template.nodes.length === 0,
        icon: <TemplateRootIcon template={template} />,
        children: template.nodes.map((node) => toTemplateInnerUiNodes(template, node)),
        data: { templatesNode: { type: "template", template } satisfies TemplatesTreeDatum },
      })),
  }));
}

type ProjectTreeGroup = {
  source: ProjectReusableSource;
  estimates: Map<string, EstimateTreeGroup>;
};

type EstimateTreeGroup = {
  source: ProjectEstimateReusableSource;
  tabs: Map<string, TabTreeGroup>;
};

type ProjectNodeTreeGroup = {
  source: ProjectNodeReusableSource;
  children: Map<string, ProjectNodeTreeGroup>;
};

type TabTreeGroup = {
  source: ProjectTabReusableSource;
  nodeGroups: Map<string, ProjectNodeTreeGroup>;
  rootNodes: Map<string, ProjectNodeTreeGroup>;
};

function buildProjectSourceTreeNodes(projectSources: ReusableEstimateSource[]): UiTreeNode[] {
  const projects = new Map<string, ProjectTreeGroup>();

  function ensureProject(projectId: string, name?: string) {
    const existing = projects.get(projectId);
    if (existing) {
      if (name && existing.source.name === projectFallbackName("Project", projectId)) existing.source = { ...existing.source, name };
      return existing;
    }
    const group = {
      source: { kind: "project", projectId, name: name ?? projectFallbackName("Project", projectId) },
      estimates: new Map<string, EstimateTreeGroup>(),
    } satisfies ProjectTreeGroup;
    projects.set(projectId, group);
    return group;
  }

  function ensureEstimate(projectId: string, estimateId: string, name?: string, sheetCode: string | null = null) {
    const project = ensureProject(projectId);
    const existing = project.estimates.get(estimateId);
    if (existing) {
      if (name && existing.source.name === projectFallbackName("Estimate", estimateId)) existing.source = { ...existing.source, name, sheetCode };
      return existing;
    }
    const group = {
      source: {
        kind: "project-estimate",
        projectId,
        estimateId,
        name: name ?? projectFallbackName("Estimate", estimateId),
        sheetCode,
      },
      tabs: new Map<string, TabTreeGroup>(),
    } satisfies EstimateTreeGroup;
    project.estimates.set(estimateId, group);
    return group;
  }

  function ensureTab(projectId: string, estimateId: string, tabId: string, name?: string) {
    const estimate = ensureEstimate(projectId, estimateId);
    const existing = estimate.tabs.get(tabId);
    if (existing) {
      if (name && existing.source.name === projectFallbackName("Tab", tabId)) existing.source = { ...existing.source, name };
      return existing;
    }
    const group = {
      source: { kind: "project-tab", projectId, estimateId, tabId, name: name ?? projectFallbackName("Tab", tabId) },
      nodeGroups: new Map<string, ProjectNodeTreeGroup>(),
      rootNodes: new Map<string, ProjectNodeTreeGroup>(),
    } satisfies TabTreeGroup;
    estimate.tabs.set(tabId, group);
    return group;
  }

  for (const source of projectSources) {
    if (source.kind === "custom-template") continue;
    if (source.kind === "project") {
      ensureProject(source.projectId, source.name).source = source;
      continue;
    }
    if (source.kind === "project-estimate") {
      ensureProject(source.projectId);
      ensureEstimate(source.projectId, source.estimateId, source.name, source.sheetCode).source = source;
      continue;
    }
    if (source.kind === "project-tab") {
      ensureProject(source.projectId);
      ensureEstimate(source.projectId, source.estimateId);
      ensureTab(source.projectId, source.estimateId, source.tabId, source.name).source = source;
      continue;
    }
    ensureTab(source.projectId, source.estimateId, source.tabId).nodeGroups.set(source.nodeId, {
      source,
      children: new Map<string, ProjectNodeTreeGroup>(),
    });
  }

  for (const project of projects.values()) {
    for (const estimate of project.estimates.values()) {
      for (const tab of estimate.tabs.values()) {
        tab.rootNodes.clear();
        for (const group of tab.nodeGroups.values()) group.children.clear();
        for (const group of tab.nodeGroups.values()) {
          const parent = group.source.parentNodeId ? tab.nodeGroups.get(group.source.parentNodeId) : undefined;
          if (parent && parent !== group) parent.children.set(group.source.nodeId, group);
          else tab.rootNodes.set(group.source.nodeId, group);
        }
      }
    }
  }

  function toProjectNodeUiNode(group: ProjectNodeTreeGroup): UiTreeNode {
    const childNodes = Array.from(group.children.values())
      .sort((left, right) => left.source.name.localeCompare(right.source.name))
      .map(toProjectNodeUiNode);
    const rowNodes = (group.source.rowItems ?? []).map((item, index) => ({
      id: projectSourceRowItemId(group.source, item, index),
      label: getComponentName(item),
      ariaLabel: `${getComponentName(item)} project component`,
      isLeaf: true,
      selectable: true,
      icon: <Package size={TREE_ROW_ICON_SIZE} weight="regular" className="shrink-0 text-tertiary" aria-hidden="true" />,
      data: { templatesNode: { type: "project-row", source: group.source, item } satisfies TemplatesTreeDatum },
    } satisfies UiTreeNode));
    return {
      id: projectSourceTreeItemId(group.source),
      label: group.source.name,
      ariaLabel: `${group.source.name} project area`,
      isLeaf: childNodes.length === 0 && rowNodes.length === 0,
      selectable: true,
      icon: <NodeKindIcon />,
      // Same dot cue as the estimate-tree left sidebar: orange when the
      // source subtree contains components (rowCount), muted otherwise.
      accent: (group.source.metadata?.rowCount ?? group.source.rowItems?.length ?? 0) > 0,
      children: [...childNodes, ...rowNodes],
      data: { templatesNode: { type: "project-node", source: group.source } satisfies TemplatesTreeDatum },
    };
  }

  function sortTabTreeGroups(left: TabTreeGroup, right: TabTreeGroup) {
    const leftSortOrder = left.source.sortOrder ?? Number.MAX_SAFE_INTEGER;
    const rightSortOrder = right.source.sortOrder ?? Number.MAX_SAFE_INTEGER;
    return leftSortOrder - rightSortOrder
      || getProjectTabReusableSourceDisplayName(left.source).localeCompare(getProjectTabReusableSourceDisplayName(right.source));
  }

  return Array.from(projects.values())
    .sort((left, right) => left.source.name.localeCompare(right.source.name))
    .map((project) => ({
      id: projectSourceTreeItemId(project.source),
      label: project.source.name,
      ariaLabel: `${project.source.name} project source`,
      isLeaf: false,
      selectable: false,
      icon: <Buildings size={TREE_ROW_ICON_SIZE} weight="regular" className="shrink-0 text-tertiary" aria-hidden="true" />,
      data: { templatesNode: { type: "project", source: project.source } satisfies TemplatesTreeDatum },
      children: Array.from(project.estimates.values())
        .sort((left, right) => left.source.name.localeCompare(right.source.name))
        .map((estimate) => ({
          id: projectSourceTreeItemId(estimate.source),
          label: estimate.source.name,
          ariaLabel: estimate.source.sheetCode ? `${estimate.source.name} estimate ${estimate.source.sheetCode}` : `${estimate.source.name} estimate`,
          isLeaf: false,
          selectable: false,
          icon: <Table size={TREE_ROW_ICON_SIZE} weight="regular" className="shrink-0 text-tertiary" aria-hidden="true" />,
          data: { templatesNode: { type: "project-estimate", source: estimate.source } satisfies TemplatesTreeDatum },
          children: Array.from(estimate.tabs.values())
            .sort(sortTabTreeGroups)
            .map((tab) => {
              const tabLabel = getProjectTabReusableSourceDisplayName(tab.source);
              return {
                id: projectSourceTreeItemId(tab.source),
                label: tabLabel,
                ariaLabel: `${tabLabel} project tab source`,
                isLeaf: tab.rootNodes.size === 0,
                selectable: true,
                // Follow the estimate-tree node cue: a dot, muted on a tab (a
                // grouping page, not a component-bearing node).
                accent: false,
                data: { templatesNode: { type: "project-tab", source: tab.source } satisfies TemplatesTreeDatum },
                children: Array.from(tab.rootNodes.values())
                  .sort((left, right) => left.source.name.localeCompare(right.source.name))
                  .map(toProjectNodeUiNode),
              } satisfies UiTreeNode;
            }),
        })),
    }));
}

export function buildTemplatesTreeNodes(
  templates: EstimateTemplate[],
  projectSources: ReusableEstimateSource[] = [],
  customTemplateCategories: string[] = [],
): UiTreeNode[] {
  const nodes: UiTreeNode[] = [];
  const hasCustomTemplateSources = templates.length > 0 || customTemplateCategories.length > 0;
  if (hasCustomTemplateSources) {
    nodes.push({
      id: templatesTreeSectionId("custom-templates"),
      label: "Custom Templates",
      ariaLabel: "Custom Templates reusable sources",
      isLeaf: false,
      selectable: false,
      icon: <FolderSimple size={TREE_ROW_ICON_SIZE} weight="regular" className="shrink-0 text-tertiary" aria-hidden="true" />,
      data: { templatesNode: { type: "section", section: "custom-templates" } satisfies TemplatesTreeDatum },
      children: buildTemplateCategoryTreeNodes(templates, customTemplateCategories),
    });
  }
  const projectTree = buildProjectSourceTreeNodes(projectSources);
  if (projectTree.length > 0) {
    nodes.push({
      id: templatesTreeSectionId("projects"),
      label: "Projects",
      ariaLabel: "Projects reusable sources",
      isLeaf: false,
      selectable: false,
      rowClassName: hasCustomTemplateSources ? "mt-1 border-t-source-boundary" : undefined,
      icon: <FolderSimple size={TREE_ROW_ICON_SIZE} weight="regular" className="shrink-0 text-tertiary" aria-hidden="true" />,
      data: { templatesNode: { type: "section", section: "projects" } satisfies TemplatesTreeDatum },
      children: projectTree,
    });
  }
  return nodes;
}

export function getTemplatesTreeAllNodeIds(nodes: UiTreeNode[]): string[] {
  const ids: string[] = [];
  function visit(node: UiTreeNode) {
    ids.push(node.id);
    node.children?.forEach(visit);
  }
  nodes.forEach(visit);
  return ids;
}

function toSelectionNodes(nodes: UiTreeNode[]): TreeSelectionNode[] {
  return nodes.map((node) => ({
    id: node.id,
    selectable: node.selectable,
    children: node.children?.length ? toSelectionNodes(node.children) : undefined,
  }));
}

export function buildTemplatesSelectionNodes(
  templates: EstimateTemplate[],
  projectSources: ReusableEstimateSource[] = [],
  customTemplateCategories: string[] = [],
): TreeSelectionNode[] {
  return toSelectionNodes(buildTemplatesTreeNodes(templates, projectSources, customTemplateCategories));
}

export function getCheckedTemplates(templates: EstimateTemplate[], checkedIds: ReadonlySet<string>): EstimateTemplate[] {
  return templates.filter((template) => checkedIds.has(toTemplateTreeItemId(template.id)));
}

export type CheckedTemplateUnits = {
  /** Whole templates whose row (or an ancestor) is checked. */
  templates: EstimateTemplate[];
  /** Top-most checked groups/areas inside templates not already covered above. */
  templateNodes: Array<{ template: EstimateTemplate; node: EstimateTreeNode }>;
  /** Checked component rows not covered by a checked ancestor. */
  items: EstimateRowItem[];
};

export function getCheckedProjectSourceTargets(
  projectSources: ReusableEstimateSource[],
  checkedIds: ReadonlySet<string>,
): ProjectSourceInsertTarget[] {
  const targets: ProjectSourceInsertTarget[] = [];
  const checkedTabIds = new Set<string>();
  const checkedNodeIds = new Set<string>();
  const sourceByNodeId = new Map<string, ProjectNodeReusableSource>();
  const seenTargetIds = new Set<string>();

  for (const source of projectSources) {
    if (source.kind === "project-node") {
      sourceByNodeId.set(source.nodeId, source);
      if (checkedIds.has(projectSourceTreeItemId(source))) checkedNodeIds.add(source.nodeId);
      continue;
    }
    if (source.kind !== "project-tab") continue;
    if (!checkedIds.has(projectSourceTreeItemId(source))) continue;
    checkedTabIds.add(source.tabId);
    seenTargetIds.add(projectSourceTreeItemId(source));
    targets.push(source);
  }

  function hasCheckedNodeAncestor(source: ProjectNodeReusableSource) {
    let parentNodeId = source.parentNodeId ?? null;
    while (parentNodeId) {
      if (checkedNodeIds.has(parentNodeId)) return true;
      parentNodeId = sourceByNodeId.get(parentNodeId)?.parentNodeId ?? null;
    }
    return false;
  }

  for (const source of projectSources) {
    if (source.kind !== "project-node") continue;
    if (checkedTabIds.has(source.tabId)) continue;
    const key = projectSourceTreeItemId(source);
    if (!checkedIds.has(key) || seenTargetIds.has(key)) continue;
    if (hasCheckedNodeAncestor(source)) continue;
    seenTargetIds.add(key);
    targets.push(source);
  }

  return targets;
}

export function getCheckedProjectSourceRowItems(
  projectSources: ReusableEstimateSource[],
  checkedIds: ReadonlySet<string>,
): EstimateRowItem[] {
  const checkedTabIds = new Set<string>();
  const checkedNodeIds = new Set<string>();
  const sourceByNodeId = new Map<string, ProjectNodeReusableSource>();

  for (const source of projectSources) {
    if (source.kind === "project-tab" && checkedIds.has(projectSourceTreeItemId(source))) checkedTabIds.add(source.tabId);
    if (source.kind === "project-node") {
      sourceByNodeId.set(source.nodeId, source);
      if (checkedIds.has(projectSourceTreeItemId(source))) checkedNodeIds.add(source.nodeId);
    }
  }

  function hasCheckedNodeAncestor(source: ProjectNodeReusableSource) {
    let parentNodeId = source.parentNodeId ?? null;
    while (parentNodeId) {
      if (checkedNodeIds.has(parentNodeId)) return true;
      parentNodeId = sourceByNodeId.get(parentNodeId)?.parentNodeId ?? null;
    }
    return false;
  }

  const items: EstimateRowItem[] = [];
  const seenRowIds = new Set<string>();
  for (const source of projectSources) {
    if (source.kind !== "project-node") continue;
    if (checkedTabIds.has(source.tabId)) continue;
    if (checkedNodeIds.has(source.nodeId) || hasCheckedNodeAncestor(source)) continue;
    source.rowItems?.forEach((item, index) => {
      const key = projectSourceRowItemId(source, item, index);
      if (!checkedIds.has(key) || seenRowIds.has(key)) return;
      seenRowIds.add(key);
      items.push(item);
    });
  }
  return items;
}

/**
 * Resolves a cascade selection to its top-most insertable units: a checked
 * template wins over its nodes, a checked node wins over its descendants,
 * and bare component rows fall out as plain library items.
 */
export function getCheckedTemplateUnits(
  templates: EstimateTemplate[],
  checkedIds: ReadonlySet<string>,
): CheckedTemplateUnits {
  const units: CheckedTemplateUnits = { templates: [], templateNodes: [], items: [] };

  function visitNode(template: EstimateTemplate, node: EstimateTreeNode) {
    if (checkedIds.has(templateInnerNodeId(template.id, node.id))) {
      units.templateNodes.push({ template, node });
      return;
    }
    node.children?.forEach((child) => visitNode(template, child));
    node.estimateRowItems?.forEach((item, index) => {
      if (checkedIds.has(templateInnerRowId(template.id, node.id, item.id, index))) units.items.push(item);
    });
  }

  for (const template of templates) {
    if (checkedIds.has(toTemplateTreeItemId(template.id))) {
      units.templates.push(template);
      continue;
    }
    template.nodes.forEach((node) => visitNode(template, node));
  }

  return units;
}

/**
 * One renderer for every node-like row: categories, templates, and the
 * groups/areas inside them read identically — name + cost. Inserting goes
 * through drag or the context menu only, so rows carry no action buttons.
 */
function TemplateNodeRowContent({ label, total }: { label: string; total: number }) {
  return (
    <span className="flex min-w-0 flex-1 items-center gap-1.5">
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span className="shrink-0 text-[9px] tabular-nums text-tertiary">{pesoFormatter.format(total)}</span>
    </span>
  );
}

function TemplateComponentRowContent({ item }: { item: EstimateRowItem }) {
  return (
    <span className="flex min-w-0 flex-1 items-center gap-1.5 py-0.5">
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[10px] leading-4 text-ink">{getComponentName(item)}</span>
        <span className="truncate text-[9px] leading-3 text-tertiary">{item.supplier}</span>
      </span>
      <span className="flex shrink-0 flex-col items-end">
        <span className="text-[9px] font-medium tabular-nums text-ink">{pesoFormatter.format(getComponentPrice(item))}</span>
        <span className="text-[9px] text-tertiary">/{item.unit}</span>
      </span>
    </span>
  );
}

function SourceFolderRowContent({ label, meta }: { label: string; meta?: string | null }) {
  return (
    <span className="flex min-w-0 flex-1 items-center gap-1.5">
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {meta ? <span className="shrink-0 truncate text-[9px] text-tertiary">{meta}</span> : null}
    </span>
  );
}

function projectSourceMatchesQuery(source: ReusableEstimateSource, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;
  if (source.kind === "custom-template") return templateMatchesQuery(source.template, query);
  const values: Array<string | null | undefined> = [
    source.name,
    getProjectReusableSourceDisplayName(source),
    source.metadata?.projectName,
    source.metadata?.estimateName,
    source.metadata?.sheetCode,
    source.metadata?.tabName,
    source.metadata?.tabDisplayName,
    ...(source.metadata?.nodePath ?? []),
  ];
  if (source.kind === "project-estimate" && source.sheetCode) values.push(source.sheetCode);
  if (source.kind === "project-node") {
    for (const item of source.rowItems ?? []) {
      values.push(item.name, item.material, item.description, item.supplier);
    }
  }
  return values.some((value) => value?.toLowerCase().includes(normalizedQuery));
}

export function filterProjectSourcesByQuery(projectSources: ReusableEstimateSource[], query: string) {
  if (!query.trim()) return projectSources;
  const included = new Set<ReusableEstimateSource>();
  const projectById = new Map<string, ReusableEstimateSource>();
  const estimateById = new Map<string, ReusableEstimateSource>();
  const tabById = new Map<string, ReusableEstimateSource>();
  const sourcesByProjectId = new Map<string, ReusableEstimateSource[]>();
  const sourcesByEstimateId = new Map<string, ReusableEstimateSource[]>();
  const sourcesByTabId = new Map<string, ReusableEstimateSource[]>();

  function append(map: Map<string, ReusableEstimateSource[]>, key: string, source: ReusableEstimateSource) {
    const sources = map.get(key);
    if (sources) sources.push(source);
    else map.set(key, [source]);
  }

  for (const source of projectSources) {
    if (source.kind === "custom-template") continue;
    append(sourcesByProjectId, source.projectId, source);
    if (source.kind === "project") {
      projectById.set(source.projectId, source);
      continue;
    }
    if (source.kind === "project-estimate") {
      estimateById.set(source.estimateId, source);
      append(sourcesByEstimateId, source.estimateId, source);
      continue;
    }
    append(sourcesByEstimateId, source.estimateId, source);
    if (source.kind === "project-tab") {
      tabById.set(source.tabId, source);
      append(sourcesByTabId, source.tabId, source);
      continue;
    }
    append(sourcesByTabId, source.tabId, source);
  }

  function includeMany(sources: ReusableEstimateSource[] | undefined) {
    sources?.forEach((source) => included.add(source));
  }

  function includeAncestors(source: ReusableEstimateSource) {
    if (source.kind === "custom-template") return;
    included.add(source);
    const project = projectById.get(source.projectId);
    if (project) included.add(project);
    if (source.kind === "project-estimate" || source.kind === "project-tab" || source.kind === "project-node") {
      const estimate = estimateById.get(source.estimateId);
      if (estimate) included.add(estimate);
    }
    if (source.kind === "project-tab" || source.kind === "project-node") {
      const tab = tabById.get(source.tabId);
      if (tab) included.add(tab);
    }
  }

  for (const source of projectSources) {
    if (!projectSourceMatchesQuery(source, query)) continue;
    includeAncestors(source);
    if (source.kind === "project") {
      includeMany(sourcesByProjectId.get(source.projectId));
    }
    if (source.kind === "project-estimate") {
      includeMany(sourcesByEstimateId.get(source.estimateId));
    }
    if (source.kind === "project-tab") {
      includeMany(sourcesByTabId.get(source.tabId));
    }
  }

  return projectSources.filter((source) => included.has(source));
}

export type TemplatesTreeProps = {
  templates: EstimateTemplate[];
  projectSources?: ReusableEstimateSource[];
  customTemplateCategories?: string[];
  searchQuery: string;
  expandedNodeIds: string[];
  onToggle: (nodeId: string) => void;
  /**
   * Project ids whose estimate list is loading (past the skeleton-reveal delay);
   * each shows in-place skeleton rows instead of a spinner (U6/U23).
   */
  loadingProjectIds?: string[];
  /** Estimate ids whose outline is loading (past the skeleton-reveal delay). */
  loadingEstimateIds?: string[];
  /**
   * Warms the next level when a project/estimate row is hovered, so the common
   * expand path is already resident and shows no loading state at all (U23).
   */
  onPrefetchNode?: (nodeId: string) => void;
  /** Whether the workspace currently has a valid group target for templates. */
  canInsertTemplate: boolean;
  templateTargetName: string;
  onAddTemplate: (template: EstimateTemplate) => void;
  /** Inserts one group/area from inside a template, with its subtree. */
  onAddTemplateNode: (template: EstimateTemplate, node: EstimateTreeNode) => void;
  onTemplateDragStart: (event: DragEvent<HTMLElement>, template: EstimateTemplate) => void;
  /** Dragging a category header carries every template inside it. */
  onCategoryDragStart: (event: DragEvent<HTMLElement>, category: string, templates: EstimateTemplate[]) => void;
  /** Dragging a group/area from inside a template carries that subtree. */
  onTemplateNodeDragStart: (event: DragEvent<HTMLElement>, template: EstimateTemplate, node: EstimateTreeNode) => void;
  onAddProjectSource?: (source: ProjectSourceInsertTarget) => void;
  onProjectSourceDragStart?: (event: DragEvent<HTMLElement>, source: ProjectSourceInsertTarget) => void;
  onPreviewProjectSource?: (source: ProjectReusableEstimateSource) => void;
  onClearProjectSourcePreview?: () => void;
  /** Context-menu CRUD on template rows; items appear only when provided. */
  onRenameTemplate?: (template: EstimateTemplate) => void;
  onDeleteTemplate?: (template: EstimateTemplate) => void;
  /** Context-menu create on category headers (opens the new-template flow). */
  onCreateTemplate?: (category: string) => void;
  /** Component rows inside templates insert/drag exactly like library items. */
  componentAddDisabled: boolean;
  componentAddLabel: string;
  onAddComponent: (item: EstimateRowItem) => void;
  onItemDragStart: (event: DragEvent<HTMLElement>, item: EstimateRowItem) => void;
  selectable?: boolean;
  checkedIds?: string[];
  onCheckToggle?: (nodeId: string, checked: boolean) => void;
  emptyState?: React.ReactNode;
};

export function TemplatesTree({
  templates,
  projectSources = EMPTY_PROJECT_SOURCES,
  customTemplateCategories = EMPTY_TEMPLATE_CATEGORIES,
  searchQuery,
  expandedNodeIds,
  onToggle,
  loadingProjectIds = EMPTY_ID_LIST as string[],
  loadingEstimateIds = EMPTY_ID_LIST as string[],
  onPrefetchNode,
  canInsertTemplate,
  templateTargetName,
  onAddTemplate,
  onAddTemplateNode,
  onTemplateDragStart,
  onCategoryDragStart,
  onTemplateNodeDragStart,
  onAddProjectSource,
  onProjectSourceDragStart,
  onPreviewProjectSource,
  onClearProjectSourcePreview,
  onRenameTemplate,
  onDeleteTemplate,
  onCreateTemplate,
  componentAddDisabled,
  componentAddLabel,
  onAddComponent,
  onItemDragStart,
  selectable = false,
  checkedIds,
  onCheckToggle,
  emptyState,
}: TemplatesTreeProps) {
  const [contextMenuNodeId, setContextMenuNodeId] = useState<string | null>(null);
  const [contextMenuOpen, setContextMenuOpen] = useState(false);

  const filteredTemplates = useMemo(
    () => filterTemplatesByQuery(templates, searchQuery),
    [templates, searchQuery],
  );
  const filteredProjectSources = useMemo(
    () => filterProjectSourcesByQuery(projectSources, searchQuery),
    [projectSources, searchQuery],
  );
  const filteredCustomTemplateCategories = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) return customTemplateCategories;
    return customTemplateCategories.filter((category) => category.toLowerCase().includes(normalizedQuery));
  }, [customTemplateCategories, searchQuery]);
  const loadingProjectIdSet = useMemo(() => new Set(loadingProjectIds), [loadingProjectIds]);
  const loadingEstimateIdSet = useMemo(() => new Set(loadingEstimateIds), [loadingEstimateIds]);
  const uiNodes = useMemo(
    () => injectProjectSourceSkeletons(
      buildTemplatesTreeNodes(filteredTemplates, filteredProjectSources, filteredCustomTemplateCategories),
      loadingProjectIdSet,
      loadingEstimateIdSet,
    ),
    [filteredProjectSources, filteredTemplates, filteredCustomTemplateCategories, loadingProjectIdSet, loadingEstimateIdSet],
  );
  const nodeById = useMemo(() => {
    const map = new Map<string, UiTreeNode>();
    function visit(node: UiTreeNode) {
      map.set(node.id, node);
      node.children?.forEach(visit);
    }
    uiNodes.forEach(visit);
    return map;
  }, [uiNodes]);
  const searchActive = searchQuery.trim().length > 0;
  // Active searches reveal every match instead of hiding hits under
  // collapsed categories or template roots.
  const effectiveExpandedIds = useMemo(
    () => (searchActive ? getTemplatesTreeAllNodeIds(uiNodes) : expandedNodeIds),
    [searchActive, uiNodes, expandedNodeIds],
  );

  const templatesByCategory = useMemo(() => {
    const categories = new Map<string, EstimateTemplate[]>();
    for (const template of filteredTemplates) {
      const templatesForCategory = categories.get(template.category);
      if (templatesForCategory) templatesForCategory.push(template);
      else categories.set(template.category, [template]);
    }
    return categories;
  }, [filteredTemplates]);
  const getTemplatesByCategory = useCallback(
    (category: string) => templatesByCategory.get(category) ?? [],
    [templatesByCategory],
  );

  // UI-1/UI-2: template, category, and node cost totals used to be recomputed
  // inline for every visible row on every render — each a full recursive walk of
  // the template — and the shared Tree rebuilds row props each render so the row
  // memo never holds. Precompute them once per filtered-template change; rows
  // read the cached values. These totals depend only on template structure, not
  // on selection/expansion/search-reveal, so the maps are safe to memoize here.
  const templateTotals = useMemo(() => {
    const totals = new Map<string, number>();
    for (const template of filteredTemplates) totals.set(template.id, summarizeEstimateTemplate(template).total);
    return totals;
  }, [filteredTemplates]);
  const categoryTotals = useMemo(() => {
    const totals = new Map<string, number>();
    for (const template of filteredTemplates) {
      totals.set(template.category, (totals.get(template.category) ?? 0) + (templateTotals.get(template.id) ?? 0));
    }
    return totals;
  }, [filteredTemplates, templateTotals]);
  const templateNodeTotals = useMemo(() => {
    const totals = new Map<string, number>();
    const visit = (node: EstimateTreeNode) => {
      totals.set(node.id, computeTemplateNodeTotal(node));
      node.children?.forEach(visit);
    };
    for (const template of filteredTemplates) template.nodes.forEach(visit);
    return totals;
  }, [filteredTemplates]);

  const handleCanDrag = useCallback((node: UiTreeNode) => {
    const datum = getTemplatesTreeDatum(node);
    return datum?.type !== "section"
      && datum?.type !== "project"
      && datum?.type !== "project-estimate"
      && datum?.type !== "skeleton";
  }, []);

  const handleNodeDragStart = useCallback(
    (nodeId: string, event: DragEvent<HTMLElement>) => {
      const datum = nodeById.get(nodeId) ? getTemplatesTreeDatum(nodeById.get(nodeId)!) : undefined;
      if (datum?.type === "template") onTemplateDragStart(event, datum.template);
      if (datum?.type === "template-row") onItemDragStart(event, datum.item);
      if (datum?.type === "project-row") onItemDragStart(event, datum.item);
      if (datum?.type === "category") onCategoryDragStart(event, datum.category, getTemplatesByCategory(datum.category));
      if (datum?.type === "template-node") onTemplateNodeDragStart(event, datum.template, datum.node);
      if (datum?.type === "project-tab" || datum?.type === "project-node") onProjectSourceDragStart?.(event, datum.source);
    },
    [nodeById, onCategoryDragStart, onItemDragStart, onProjectSourceDragStart, onTemplateDragStart, onTemplateNodeDragStart, getTemplatesByCategory],
  );

  const handleRowClick = useCallback(
    (nodeId: string, node: UiTreeNode) => {
      const datum = getTemplatesTreeDatum(node);
      // Skeleton placeholders are inert: no preview, no toggle, no selection.
      if (datum?.type === "skeleton") return;
      if (
        datum?.type === "project" ||
        datum?.type === "project-estimate" ||
        datum?.type === "project-tab" ||
        datum?.type === "project-node"
      ) {
        onPreviewProjectSource?.(datum.source);
      } else if (datum?.type !== "section") {
        onClearProjectSourcePreview?.();
      }
      // Leaf component rows have nothing to toggle; everything else folds.
      if (datum?.type === "template-row" || datum?.type === "project-row") return;
      if (node.children?.length || node.isLeaf === false) onToggle(nodeId);
    },
    [onClearProjectSourcePreview, onPreviewProjectSource, onToggle],
  );

  const handleTreeContextMenu = useCallback((nodeId: string) => {
    setContextMenuNodeId(nodeId);
  }, []);

  const contextMenuGroups = useMemo<ActionMenuGroup[]>(() => {
    const contextNode = contextMenuNodeId ? nodeById.get(contextMenuNodeId) : undefined;
    const datum = contextNode ? getTemplatesTreeDatum(contextNode) : undefined;
    if (!contextNode || !datum) return [];

    const expanded = effectiveExpandedIds.includes(contextNode.id);
    const toggleItem = contextNode.children?.length
      ? [{
          id: expanded ? "collapse" : "expand",
          label: expanded ? "Collapse" : "Expand",
          icon: expanded
            ? <CaretDown size={12} weight="regular" aria-hidden="true" />
            : <CaretRight size={12} weight="regular" aria-hidden="true" />,
          onSelect: () => onToggle(contextNode.id),
        }]
      : [];

    if (datum.type === "template") {
      return [
        {
          id: "template-actions",
          items: [
            {
              id: "add-template",
              label: canInsertTemplate ? `Add to ${templateTargetName}` : "Add to estimate",
              icon: <Plus size={12} weight="regular" aria-hidden="true" />,
              disabled: !canInsertTemplate,
              disabledReason: "Select an Area before adding this template.",
              onSelect: () => onAddTemplate(datum.template),
            },
            ...toggleItem,
          ],
        },
        {
          id: "template-edit",
          items: onRenameTemplate
            ? [
                {
                  id: "rename-template",
                  label: "Rename",
                  icon: <PencilSimple size={12} weight="regular" aria-hidden="true" />,
                  onSelect: () => onRenameTemplate(datum.template),
                },
              ]
            : [],
        },
        {
          id: "template-danger",
          items: onDeleteTemplate
            ? [
                {
                  id: "delete-template",
                  label: "Delete",
                  icon: <Trash size={12} weight="regular" aria-hidden="true" />,
                  tone: "destructive" as const,
                  onSelect: () => onDeleteTemplate(datum.template),
                },
              ]
            : [],
        },
      ];
    }
    if (datum.type === "template-node") {
      return [
        {
          id: "template-node-actions",
          items: [
            {
              id: "add-template-node",
              label: canInsertTemplate ? `Add to ${templateTargetName}` : "Add to estimate",
              icon: <Plus size={12} weight="regular" aria-hidden="true" />,
              disabled: !canInsertTemplate,
              disabledReason: "Select an Area before adding this node.",
              onSelect: () => onAddTemplateNode(datum.template, datum.node),
            },
            ...toggleItem,
          ],
        },
      ];
    }
    if (datum.type === "template-row" || datum.type === "project-row") {
      return [
        {
          id: "template-component-actions",
          items: [
            {
              id: "add-component",
              label: componentAddDisabled ? "Add component" : componentAddLabel,
              icon: <Plus size={12} weight="regular" aria-hidden="true" />,
              disabled: componentAddDisabled,
              disabledReason: "Select an Area before adding this component.",
              onSelect: () => onAddComponent(datum.item),
            },
          ],
        },
      ];
    }
    if (datum.type === "project-tab" || datum.type === "project-node") {
      // Project sources (projects-as-templates) are READ-ONLY here: the only
      // action is pulling them into the current estimate (drag-drop, or this
      // "Add to estimate" insert). No creation/tampering — e.g. no
      // "Save as template" — so a browsed project can't be mutated from here.
      return [
        {
          id: "project-source-actions",
          items: [
            {
              id: "add-project-source",
              label: canInsertTemplate ? `Add to ${templateTargetName}` : "Add to estimate",
              icon: <Plus size={12} weight="regular" aria-hidden="true" />,
              disabled: !canInsertTemplate || !onAddProjectSource,
              disabledReason: !canInsertTemplate
                ? "Select an Area before adding this source."
                : "Project source insertion is not wired in this surface yet.",
              onSelect: () => onAddProjectSource?.(datum.source),
            },
            ...toggleItem,
          ],
        },
      ];
    }
    if (datum.type === "category") {
      const categoryTemplates = getTemplatesByCategory(datum.category);
      return [
        {
          id: "template-category-create",
          items: onCreateTemplate
            ? [
                {
                  id: "new-template-in-category",
                  label: "New Template",
                  icon: <StackPlus size={12} weight="regular" aria-hidden="true" />,
                  onSelect: () => onCreateTemplate(datum.category),
                },
              ]
            : [],
        },
        {
          id: "template-category-actions",
          items: [
            {
              id: "add-category-templates",
              label: canInsertTemplate
                ? `Add ${categoryTemplates.length} ${categoryTemplates.length === 1 ? "template" : "templates"} to ${templateTargetName}`
                : "Add all to estimate",
              icon: <Plus size={12} weight="regular" aria-hidden="true" />,
              disabled: !canInsertTemplate || categoryTemplates.length === 0,
              disabledReason: "Select an Area before adding these templates.",
              onSelect: () => categoryTemplates.forEach((template) => onAddTemplate(template)),
            },
            ...toggleItem,
          ],
        },
      ];
    }
    return toggleItem.length ? [{ id: "template-folder-actions", items: toggleItem }] : [];
  }, [
    canInsertTemplate,
    componentAddDisabled,
    componentAddLabel,
    contextMenuNodeId,
    effectiveExpandedIds,
    nodeById,
    onAddComponent,
    onAddProjectSource,
    onAddTemplate,
    onAddTemplateNode,
    onCreateTemplate,
    onDeleteTemplate,
    onRenameTemplate,
    onToggle,
    getTemplatesByCategory,
    templateTargetName,
  ]);

  const renderTemplatesRowLabel = useCallback(
    (treeNode: UiTreeNode) => {
      const datum = getTemplatesTreeDatum(treeNode);
      if (datum?.type === "skeleton") {
        return (
          <span className="flex min-w-0 flex-1 items-center py-0.5" aria-hidden="true">
            <span className="h-2.5 w-full max-w-[120px] animate-pulse rounded-xs bg-surfaceMuted" />
          </span>
        );
      }
      if (datum?.type === "category") {
        return <TemplateNodeRowContent label={datum.category} total={categoryTotals.get(datum.category) ?? 0} />;
      }
      if (datum?.type === "template") {
        return <TemplateNodeRowContent label={datum.template.name} total={templateTotals.get(datum.template.id) ?? summarizeEstimateTemplate(datum.template).total} />;
      }
      if (datum?.type === "template-node") {
        return <TemplateNodeRowContent label={datum.node.name} total={templateNodeTotals.get(datum.node.id) ?? computeTemplateNodeTotal(datum.node)} />;
      }
      if (datum?.type === "template-row") {
        return <TemplateComponentRowContent item={datum.item} />;
      }
      if (datum?.type === "project-row") {
        return <TemplateComponentRowContent item={datum.item} />;
      }
      if (datum?.type === "section") {
        return <SourceFolderRowContent label={treeNode.label} />;
      }
      if (datum?.type === "project") {
        // Hovering warms the project's estimate list so a subsequent expand is
        // resident and shows no loading state at all (U23).
        return (
          <span
            className="flex min-w-0 flex-1"
            onMouseEnter={onPrefetchNode ? () => onPrefetchNode(treeNode.id) : undefined}
          >
            <SourceFolderRowContent label={datum.source.name} />
          </span>
        );
      }
      if (datum?.type === "project-estimate") {
        // Hovering warms this estimate's outline ahead of expand (U23).
        return (
          <span
            className="flex min-w-0 flex-1"
            onMouseEnter={onPrefetchNode ? () => onPrefetchNode(treeNode.id) : undefined}
          >
            <SourceFolderRowContent label={datum.source.name} meta={datum.source.sheetCode} />
          </span>
        );
      }
      if (datum?.type === "project-tab") {
        return <SourceFolderRowContent label={getProjectTabReusableSourceDisplayName(datum.source)} meta="Whole tab" />;
      }
      if (datum?.type === "project-node") {
        return <SourceFolderRowContent label={datum.source.name} />;
      }
      return <span className="min-w-0 flex-1 truncate">{treeNode.label}</span>;
    },
    [onPrefetchNode, categoryTotals, templateTotals, templateNodeTotals],
  );

  return (
    <ContextMenu
      onOpenChange={(open) => {
        setContextMenuOpen(open);
        // UI-7: clear the right-clicked node id on close so contextMenuGroups
        // doesn't keep recomputing against (or briefly re-show) a stale row.
        if (!open) setContextMenuNodeId(null);
      }}
    >
      <ContextMenuTrigger asChild>
        <div
          className="block w-full"
          onContextMenu={(event) => {
            // Only rows open the menu; right-clicks on empty tree space keep
            // the menu closed.
            if (!(event.target instanceof Element) || !event.target.closest("[data-tree-row]")) {
              event.preventDefault();
            }
          }}
        >
          <Tree
            nodes={uiNodes}
            ariaLabel="Reusable estimate sources"
            className="relative min-h-7 overflow-visible"
            expandedIds={effectiveExpandedIds}
            onToggle={(nodeId) => onToggle(nodeId)}
            selectable={selectable}
            selectedIds={selectable ? (checkedIds ?? []) : []}
            onCheckboxToggle={
              selectable && onCheckToggle ? (nodeId, checked) => onCheckToggle(nodeId, checked) : undefined
            }
            railsPinned={contextMenuOpen}
            indentStep={TEMPLATES_TREE_INDENT_STEP}
            draggable
            canDrag={handleCanDrag}
            onNodeDragStart={handleNodeDragStart}
            onRowClick={handleRowClick}
            onContextMenu={handleTreeContextMenu}
            renderRow={renderTemplatesRowLabel}
            virtualization={WORKSHOP_TREE_VIRTUALIZATION}
            emptyState={emptyState ?? <span aria-hidden="true" />}
          />
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent data-templates-tree-context-menu="true" alignOffset={4}>
        <ContextActionMenuContent groups={contextMenuGroups} />
      </ContextMenuContent>
    </ContextMenu>
  );
}
