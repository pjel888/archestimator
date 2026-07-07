"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import {
  CaretDown,
  CaretRight,
  PencilSimple,
  Plus,
  StackPlus,
  Trash,
} from "@phosphor-icons/react/dist/ssr";

import { ContextActionMenuContent, type ActionMenuGroup } from "@/components/ui/action-menu";
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from "@/components/ui/context-menu";
import { Tree, type TreeNode as UiTreeNode } from "@/components/ui/tree";
import { WORKSHOP_TREE_VIRTUALIZATION } from "@/lib/workshop/virtualization-flags";
import { getProjectTabReusableSourceDisplayName } from "@/lib/reusable-sources/display";
import type {
  ProjectReusableEstimateSource,
  ProjectSourceInsertTarget,
  ReusableEstimateSource,
} from "@/lib/reusable-sources/types";
import type { EstimateRowItem, EstimateTreeNode } from "../../estimate-tree-data";
import { getComponentName, getComponentPrice, pesoFormatter } from "../helpers";
import {
  computeTemplateNodeTotal,
  filterTemplatesByQuery,
  summarizeEstimateTemplate,
  type EstimateTemplate,
} from "../templates";
import {
  buildTemplatesTreeNodes,
  filterProjectSourcesByQuery,
  getTemplatesTreeAllNodeIds,
  getTemplatesTreeDatum,
  injectTemplateSourceLoadingSkeletons,
  injectProjectSourceSkeletons,
} from "./TemplatesTreeModel";

/** Stable empty default so optional id-list props don't re-trigger memoization. */
const EMPTY_ID_LIST: readonly string[] = [];
const EMPTY_PROJECT_SOURCES: ReusableEstimateSource[] = [];
const EMPTY_TEMPLATE_CATEGORIES: string[] = [];
const TEMPLATES_TREE_INDENT_STEP = 20;

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
  const brand = item.brand?.trim();
  return (
    <span className="flex min-w-0 flex-1 items-center gap-1.5 py-0.5">
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[10px] leading-4 text-ink">{getComponentName(item)}</span>
        {brand ? (
          <span className="mt-0.5 flex min-w-0 leading-3">
            <span className="inline-flex max-w-full items-center rounded-xs border border-hairline bg-surfaceMuted px-1.5 py-0.5 !text-[9px] font-medium leading-[11px] text-secondary" title={brand}>
              <span className="truncate">{brand}</span>
            </span>
          </span>
        ) : null}
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
  templatesLoading?: boolean;
  projectSourcesLoading?: boolean;
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

// react-doctor-disable-next-line react-doctor/no-giant-component -- Structural split tracked in .ai/03_plans/2026-06-23-react-doctor-warning-cleanup.md; broad refactor needs behavior tests.
export function TemplatesTree({
  templates,
  projectSources = EMPTY_PROJECT_SOURCES,
  customTemplateCategories = EMPTY_TEMPLATE_CATEGORIES,
  searchQuery,
  expandedNodeIds,
  onToggle,
  templatesLoading = false,
  projectSourcesLoading = false,
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
  const prefetchedNodeIdsRef = useRef<Set<string> | null>(null);
  if (prefetchedNodeIdsRef.current === null) prefetchedNodeIdsRef.current = new Set();

  const filteredTemplates = useMemo(
    () => filterTemplatesByQuery(templates, searchQuery),
    [templates, searchQuery],
  );
  const filteredProjectSources = useMemo(
    () => filterProjectSourcesByQuery(projectSources, searchQuery),
    [projectSources, searchQuery],
  );
  useEffect(() => {
    prefetchedNodeIdsRef.current?.clear();
  }, [projectSources]);

  const requestPrefetchNode = useCallback((nodeId: string) => {
    if (!onPrefetchNode) return;
    const prefetchedNodeIds = prefetchedNodeIdsRef.current;
    if (!prefetchedNodeIds) return;
    if (prefetchedNodeIds.has(nodeId)) return;
    prefetchedNodeIds.add(nodeId);
    onPrefetchNode(nodeId);
  }, [onPrefetchNode]);
  const filteredCustomTemplateCategories = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) return customTemplateCategories;
    return customTemplateCategories.filter((category) => category.toLowerCase().includes(normalizedQuery));
  }, [customTemplateCategories, searchQuery]);
  const loadingProjectIdSet = useMemo(() => new Set(loadingProjectIds), [loadingProjectIds]);
  const loadingEstimateIdSet = useMemo(() => new Set(loadingEstimateIds), [loadingEstimateIds]);
  const uiNodes = useMemo(
    () => injectProjectSourceSkeletons(
      injectTemplateSourceLoadingSkeletons(
        buildTemplatesTreeNodes(filteredTemplates, filteredProjectSources, filteredCustomTemplateCategories),
        { customTemplatesLoading: templatesLoading, projectSourcesLoading },
      ),
      loadingProjectIdSet,
      loadingEstimateIdSet,
    ),
    [filteredProjectSources, filteredTemplates, filteredCustomTemplateCategories, loadingProjectIdSet, loadingEstimateIdSet, projectSourcesLoading, templatesLoading],
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
            onMouseEnter={onPrefetchNode ? () => requestPrefetchNode(treeNode.id) : undefined}
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
            onMouseEnter={onPrefetchNode ? () => requestPrefetchNode(treeNode.id) : undefined}
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
    [onPrefetchNode, requestPrefetchNode, categoryTotals, templateTotals, templateNodeTotals],
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
            showSelectedBackground={false}
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
