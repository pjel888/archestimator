"use client";

import { useCallback, useMemo, useState, type DragEvent } from "react";
import {
  CaretDown,
  CaretRight,
  FolderSimple,
  MapPin,
  Package,
  PencilSimple,
  Plus,
  StackPlus,
  StackSimple,
  Trash,
} from "@phosphor-icons/react/dist/ssr";

import { ContextActionMenuContent, type ActionMenuGroup } from "@/components/ui/action-menu";
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from "@/components/ui/context-menu";
import { TREE_ROW_ICON_SIZE, Tree, type TreeNode as UiTreeNode } from "@/components/ui/tree";
import type { TreeSelectionNode } from "@/lib/bulk-selection/tree-selection";
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
  | { type: "project-node"; source: ProjectNodeReusableSource };

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

function getTemplatesTreeDatum(node: UiTreeNode): TemplatesTreeDatum | undefined {
  return node.data?.templatesNode as TemplatesTreeDatum | undefined;
}

function NodeKindIcon({ kind }: { kind: EstimateTreeNode["kind"] }) {
  if (kind === "group") {
    return <FolderSimple size={TREE_ROW_ICON_SIZE} weight="regular" className="shrink-0 text-tertiary" aria-hidden="true" />;
  }
  return <MapPin size={TREE_ROW_ICON_SIZE} weight="regular" className="shrink-0 text-tertiary" aria-hidden="true" />;
}

function TemplateRootIcon({ template }: { template: EstimateTemplate }) {
  // A template reads as the node it inserts: group icon for a group-rooted
  // template, cube for an area-rooted one, a stack when roots are mixed.
  const rootKinds = getTemplateRootKinds(template);
  if (rootKinds.length === 1) return <NodeKindIcon kind={rootKinds[0]} />;
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
    ariaLabel: `${node.name} template ${node.kind}`,
    isLeaf: childNodes.length === 0 && rowNodes.length === 0,
    icon: <NodeKindIcon kind={node.kind} />,
    children: [...childNodes, ...rowNodes],
    data: { templatesNode: { type: "template-node", template, node } satisfies TemplatesTreeDatum },
  };
}

function buildTemplateCategoryTreeNodes(templates: EstimateTemplate[]): UiTreeNode[] {
  const categories = Array.from(new Set(templates.map((template) => template.category))).sort();

  return categories.map((category) => ({
    id: templatesTreeCategoryId(category),
    label: category,
    ariaLabel: `${category} templates`,
    isLeaf: false,
    icon: <FolderSimple size={TREE_ROW_ICON_SIZE} weight="regular" className="shrink-0 text-tertiary" aria-hidden="true" />,
    data: { templatesNode: { type: "category", category } satisfies TemplatesTreeDatum },
    children: templates
      .filter((template) => template.category === category)
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

type TabTreeGroup = {
  source: ProjectTabReusableSource;
  nodes: ProjectNodeReusableSource[];
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
      nodes: [],
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
    const tab = ensureTab(source.projectId, source.estimateId, source.tabId);
    tab.nodes = [...tab.nodes.filter((node) => node.nodeId !== source.nodeId), source];
  }

  return Array.from(projects.values())
    .sort((left, right) => left.source.name.localeCompare(right.source.name))
    .map((project) => ({
      id: projectSourceTreeItemId(project.source),
      label: project.source.name,
      ariaLabel: `${project.source.name} project source`,
      isLeaf: false,
      selectable: false,
      icon: <FolderSimple size={TREE_ROW_ICON_SIZE} weight="regular" className="shrink-0 text-tertiary" aria-hidden="true" />,
      data: { templatesNode: { type: "project", source: project.source } satisfies TemplatesTreeDatum },
      children: Array.from(project.estimates.values())
        .sort((left, right) => left.source.name.localeCompare(right.source.name))
        .map((estimate) => ({
          id: projectSourceTreeItemId(estimate.source),
          label: estimate.source.name,
          ariaLabel: estimate.source.sheetCode ? `${estimate.source.name} estimate ${estimate.source.sheetCode}` : `${estimate.source.name} estimate`,
          isLeaf: false,
          selectable: false,
          icon: <StackSimple size={TREE_ROW_ICON_SIZE} weight="regular" className="shrink-0 text-tertiary" aria-hidden="true" />,
          data: { templatesNode: { type: "project-estimate", source: estimate.source } satisfies TemplatesTreeDatum },
          children: Array.from(estimate.tabs.values())
            .sort((left, right) => left.source.name.localeCompare(right.source.name))
            .map((tab) => ({
              id: projectSourceTreeItemId(tab.source),
              label: tab.source.name,
              ariaLabel: `${tab.source.name} project tab source`,
              isLeaf: tab.nodes.length === 0,
              selectable: true,
              icon: <StackSimple size={TREE_ROW_ICON_SIZE} weight="regular" className="shrink-0 text-tertiary" aria-hidden="true" />,
              data: { templatesNode: { type: "project-tab", source: tab.source } satisfies TemplatesTreeDatum },
              children: tab.nodes
                .sort((left, right) => left.name.localeCompare(right.name))
                .map((node) => ({
                  id: projectSourceTreeItemId(node),
                  label: node.name,
                  ariaLabel: `${node.name} project ${node.nodeKind}`,
                  isLeaf: true,
                  selectable: true,
                  icon: <NodeKindIcon kind={node.nodeKind} />,
                  data: { templatesNode: { type: "project-node", source: node } satisfies TemplatesTreeDatum },
                })),
            })),
        })),
    }));
}

export function buildTemplatesTreeNodes(templates: EstimateTemplate[], projectSources: ReusableEstimateSource[] = []): UiTreeNode[] {
  const nodes: UiTreeNode[] = [];
  if (templates.length > 0) {
    nodes.push({
      id: templatesTreeSectionId("custom-templates"),
      label: "Custom Templates",
      ariaLabel: "Custom Templates reusable sources",
      isLeaf: false,
      selectable: false,
      icon: <FolderSimple size={TREE_ROW_ICON_SIZE} weight="regular" className="shrink-0 text-tertiary" aria-hidden="true" />,
      data: { templatesNode: { type: "section", section: "custom-templates" } satisfies TemplatesTreeDatum },
      children: buildTemplateCategoryTreeNodes(templates),
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

function toTemplateInnerSelectionNodes(template: EstimateTemplate, node: EstimateTreeNode): TreeSelectionNode {
  return {
    id: templateInnerNodeId(template.id, node.id),
    selectable: true,
    children: [
      ...(node.children ?? []).map((child) => toTemplateInnerSelectionNodes(template, child)),
      ...(node.estimateRowItems ?? []).map((item, index) => ({
        id: templateInnerRowId(template.id, node.id, item.id, index),
        selectable: true,
      })),
    ],
  };
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
): TreeSelectionNode[] {
  const categories = Array.from(new Set(templates.map((template) => template.category))).sort();
  const nodes: TreeSelectionNode[] = [];
  if (categories.length > 0) {
    nodes.push({
      id: templatesTreeSectionId("custom-templates"),
      selectable: false,
      children: categories.map((category) => ({
        id: templatesTreeCategoryId(category),
        selectable: true,
        children: templates
          .filter((template) => template.category === category)
          .map((template) => ({
            id: toTemplateTreeItemId(template.id),
            selectable: true,
            children: template.nodes.map((node) => toTemplateInnerSelectionNodes(template, node)),
          })),
      })),
    });
  }
  const projectTree = buildProjectSourceTreeNodes(projectSources);
  if (projectTree.length > 0) {
    nodes.push({
      id: templatesTreeSectionId("projects"),
      selectable: false,
      children: toSelectionNodes(projectTree),
    });
  }
  return nodes;
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
  const seenTargetIds = new Set<string>();

  for (const source of projectSources) {
    if (source.kind !== "project-tab") continue;
    if (!checkedIds.has(projectSourceTreeItemId(source))) continue;
    checkedTabIds.add(source.tabId);
    seenTargetIds.add(projectSourceTreeItemId(source));
    targets.push(source);
  }

  for (const source of projectSources) {
    if (source.kind !== "project-node") continue;
    if (checkedTabIds.has(source.tabId)) continue;
    const key = projectSourceTreeItemId(source);
    if (!checkedIds.has(key) || seenTargetIds.has(key)) continue;
    seenTargetIds.add(key);
    targets.push(source);
  }

  return targets;
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
  const values = [source.name];
  if (source.kind === "project-estimate" && source.sheetCode) values.push(source.sheetCode);
  if (source.kind === "project-node") values.push(source.nodeKind);
  return values.some((value) => value.toLowerCase().includes(normalizedQuery));
}

function filterProjectSourcesByQuery(projectSources: ReusableEstimateSource[], query: string) {
  if (!query.trim()) return projectSources;
  const included = new Set<ReusableEstimateSource>();
  const projectById = new Map<string, ReusableEstimateSource>();
  const estimateById = new Map<string, ReusableEstimateSource>();
  const tabById = new Map<string, ReusableEstimateSource>();

  for (const source of projectSources) {
    if (source.kind === "project") projectById.set(source.projectId, source);
    if (source.kind === "project-estimate") estimateById.set(source.estimateId, source);
    if (source.kind === "project-tab") tabById.set(source.tabId, source);
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
      projectSources.forEach((candidate) => {
        if (candidate.kind !== "custom-template" && candidate.projectId === source.projectId) included.add(candidate);
      });
    }
    if (source.kind === "project-estimate") {
      projectSources.forEach((candidate) => {
        if (
          candidate.kind !== "custom-template" &&
          candidate.kind !== "project" &&
          candidate.estimateId === source.estimateId
        ) included.add(candidate);
      });
    }
    if (source.kind === "project-tab") {
      projectSources.forEach((candidate) => {
        if (
          candidate.kind !== "custom-template" &&
          candidate.kind !== "project" &&
          candidate.kind !== "project-estimate" &&
          candidate.tabId === source.tabId
        ) included.add(candidate);
      });
    }
  }

  return projectSources.filter((source) => included.has(source));
}

export type TemplatesTreeProps = {
  templates: EstimateTemplate[];
  projectSources?: ReusableEstimateSource[];
  searchQuery: string;
  expandedNodeIds: string[];
  onToggle: (nodeId: string) => void;
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
  onSaveProjectSourceAsTemplate?: (source: ProjectSourceInsertTarget) => void;
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
  projectSources = [],
  searchQuery,
  expandedNodeIds,
  onToggle,
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
  onSaveProjectSourceAsTemplate,
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
  const uiNodes = useMemo(
    () => buildTemplatesTreeNodes(filteredTemplates, filteredProjectSources),
    [filteredProjectSources, filteredTemplates],
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

  const templatesByCategory = useCallback(
    (category: string) => filteredTemplates.filter((template) => template.category === category),
    [filteredTemplates],
  );

  const handleCanDrag = useCallback((node: UiTreeNode) => {
    const datum = getTemplatesTreeDatum(node);
    return datum?.type !== "section" && datum?.type !== "project" && datum?.type !== "project-estimate";
  }, []);

  const handleNodeDragStart = useCallback(
    (nodeId: string, event: DragEvent<HTMLElement>) => {
      const datum = nodeById.get(nodeId) ? getTemplatesTreeDatum(nodeById.get(nodeId)!) : undefined;
      if (datum?.type === "template") onTemplateDragStart(event, datum.template);
      if (datum?.type === "template-row") onItemDragStart(event, datum.item);
      if (datum?.type === "category") onCategoryDragStart(event, datum.category, templatesByCategory(datum.category));
      if (datum?.type === "template-node") onTemplateNodeDragStart(event, datum.template, datum.node);
      if (datum?.type === "project-tab" || datum?.type === "project-node") onProjectSourceDragStart?.(event, datum.source);
    },
    [nodeById, onCategoryDragStart, onItemDragStart, onProjectSourceDragStart, onTemplateDragStart, onTemplateNodeDragStart, templatesByCategory],
  );

  const handleRowClick = useCallback(
    (nodeId: string, node: UiTreeNode) => {
      const datum = getTemplatesTreeDatum(node);
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
      if (datum?.type === "template-row") return;
      if (datum?.type === "project-node") return;
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
              disabledReason: "Select a Group Node before adding this template.",
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
              disabledReason: "Select a Group Node before adding this node.",
              onSelect: () => onAddTemplateNode(datum.template, datum.node),
            },
            ...toggleItem,
          ],
        },
      ];
    }
    if (datum.type === "template-row") {
      return [
        {
          id: "template-component-actions",
          items: [
            {
              id: "add-component",
              label: componentAddDisabled ? "Add component" : componentAddLabel,
              icon: <Plus size={12} weight="regular" aria-hidden="true" />,
              disabled: componentAddDisabled,
              disabledReason: "Select an Area Node before adding this component.",
              onSelect: () => onAddComponent(datum.item),
            },
          ],
        },
      ];
    }
    if (datum.type === "project-tab" || datum.type === "project-node") {
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
                ? "Select a Group Node before adding this source."
                : "Project source insertion is not wired in this surface yet.",
              onSelect: () => onAddProjectSource?.(datum.source),
            },
            ...((datum.type === "project-tab" || datum.type === "project-node") && onSaveProjectSourceAsTemplate
              ? [
                  {
                    id: "save-project-source-template",
                    label: "Save as template",
                    icon: <StackPlus size={12} weight="regular" aria-hidden="true" />,
                    onSelect: () => onSaveProjectSourceAsTemplate(datum.source),
                  },
                ]
              : []),
            ...toggleItem,
          ],
        },
      ];
    }
    if (datum.type === "category") {
      const categoryTemplates = templatesByCategory(datum.category);
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
              disabledReason: "Select a Group Node before adding these templates.",
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
    onSaveProjectSourceAsTemplate,
    onToggle,
    templatesByCategory,
    templateTargetName,
  ]);

  const renderTemplatesRowLabel = useCallback(
    (treeNode: UiTreeNode) => {
      const datum = getTemplatesTreeDatum(treeNode);
      if (datum?.type === "category") {
        return (
          <TemplateNodeRowContent
            label={datum.category}
            total={templatesByCategory(datum.category).reduce(
              (sum, template) => sum + summarizeEstimateTemplate(template).total,
              0,
            )}
          />
        );
      }
      if (datum?.type === "template") {
        return <TemplateNodeRowContent label={datum.template.name} total={summarizeEstimateTemplate(datum.template).total} />;
      }
      if (datum?.type === "template-node") {
        return <TemplateNodeRowContent label={datum.node.name} total={computeTemplateNodeTotal(datum.node)} />;
      }
      if (datum?.type === "template-row") {
        return <TemplateComponentRowContent item={datum.item} />;
      }
      if (datum?.type === "section") {
        return <SourceFolderRowContent label={treeNode.label} />;
      }
      if (datum?.type === "project") {
        return <SourceFolderRowContent label={datum.source.name} />;
      }
      if (datum?.type === "project-estimate") {
        return <SourceFolderRowContent label={datum.source.name} meta={datum.source.sheetCode} />;
      }
      if (datum?.type === "project-tab") {
        return <SourceFolderRowContent label={datum.source.name} meta="Whole tab" />;
      }
      if (datum?.type === "project-node") {
        return <SourceFolderRowContent label={datum.source.name} meta={datum.source.nodeKind === "group" ? "Group" : "Area"} />;
      }
      return <span className="min-w-0 flex-1 truncate">{treeNode.label}</span>;
    },
    [templatesByCategory],
  );

  if (templates.length === 0 && projectSources.length === 0) {
    return (
      <>
        {emptyState ?? (
          <div className="rounded-xs border border-dashed border-hairline bg-surfaceMuted/30 p-2 text-[10px] leading-4 text-tertiary">
            No templates yet. Select a Group or Area Node in the estimate tree, then use Add Template to save its structure for reuse.
          </div>
        )}
      </>
    );
  }

  if (uiNodes.length === 0) {
    return (
      <div className="rounded-xs border border-dashed border-hairline bg-surfaceMuted p-2 text-[10px] leading-4 text-tertiary">
        No reusable sources match &quot;{searchQuery}&quot;.
      </div>
    );
  }

  return (
    <ContextMenu onOpenChange={setContextMenuOpen}>
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
            draggable
            canDrag={handleCanDrag}
            onNodeDragStart={handleNodeDragStart}
            onRowClick={handleRowClick}
            onContextMenu={handleTreeContextMenu}
            renderRow={renderTemplatesRowLabel}
          />
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent data-templates-tree-context-menu="true" alignOffset={4}>
        <ContextActionMenuContent groups={contextMenuGroups} />
      </ContextMenuContent>
    </ContextMenu>
  );
}
