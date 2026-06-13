"use client";

import { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  ArrowSquareOut,
  ArrowsLeftRight,
  Copy,
  FolderSimple,
  PencilSimple,
  Plus,
  SquaresFour,
  StackPlus,
  Trash,
} from "@phosphor-icons/react/dist/ssr";

import { ContextActionMenuContent, type ActionMenuGroup } from "@/components/ui/action-menu";
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from "@/components/ui/context-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/overlays/confirm-dialog";
import { ControlInput } from "@/components/ui/control-input";
import { TreePanelHeader } from "@/components/ui/tree-panel-header";
import {
  TREE_ROW_ICON_SIZE,
  Tree,
  type TreeDropPosition,
  type TreeNode as UiTreeNode,
} from "@/components/ui/tree";
import { useNavigationRouter } from "@/hooks/use-navigation-router";
import { ResizableSidePanel } from "@/components/workshop/ResizableSidePanel";
import { pesoFormatter } from "@/components/workshop/component-library/helpers";
import {
  filterTemplatesByQuery,
  summarizeEstimateTemplate,
  type EstimateTemplate,
} from "@/components/workshop/component-library/templates";
import {
  deleteEstimateTemplate,
  duplicateEstimateTemplate,
  moveEstimateTemplateToCategory,
  renameEstimateTemplate,
  renameTemplateCategory,
} from "@/lib/component-library/actions";
import { TemplateGallery, type TemplatesBrowseStatus } from "./TemplateGallery";
import { TemplatePreviewDock } from "./TemplatePreviewDock";

const NewTemplateModal = dynamic(
  () => import("@/components/workshop/component-library/NewTemplateModal").then((module) => module.NewTemplateModal),
  { loading: () => null },
);

const InsertIntoEstimatePicker = dynamic(
  () => import("./InsertIntoEstimatePicker").then((module) => module.InsertIntoEstimatePicker),
  { loading: () => null },
);

const TEMPLATE_LIBRARY_TREE_WIDTH_OFFSET = 104;
const ALL_TEMPLATES_NODE_ID = "all-templates";

type BrowseTreeDatum =
  | { type: "all" }
  | { type: "category"; category: string }
  | { type: "template"; template: EstimateTemplate };

function browseCategoryNodeId(category: string) {
  return `browse-category:${category}`;
}

function browseTemplateNodeId(templateId: string) {
  return `browse-template:${templateId}`;
}

function getBrowseTreeDatum(node: UiTreeNode | undefined): BrowseTreeDatum | undefined {
  return node?.data?.browseNode as BrowseTreeDatum | undefined;
}

function getTemplateCategories(templates: EstimateTemplate[]) {
  return Array.from(new Set(templates.map((template) => template.category))).sort();
}

function buildBrowseTreeNodes(templates: EstimateTemplate[]): UiTreeNode[] {
  const categories = getTemplateCategories(templates);

  return [
    {
      id: ALL_TEMPLATES_NODE_ID,
      label: "All Templates",
      ariaLabel: "All Templates",
      isLeaf: false,
      draggable: false,
      icon: <FolderSimple size={TREE_ROW_ICON_SIZE} weight="regular" className="shrink-0 text-tertiary" aria-hidden="true" />,
      data: { browseNode: { type: "all" } satisfies BrowseTreeDatum },
      children: categories.map((category) => ({
        id: browseCategoryNodeId(category),
        label: category,
        ariaLabel: `${category} group`,
        isLeaf: false,
        draggable: false,
        icon: <FolderSimple size={TREE_ROW_ICON_SIZE} weight="regular" className="shrink-0 text-tertiary" aria-hidden="true" />,
        data: { browseNode: { type: "category", category } satisfies BrowseTreeDatum },
        children: templates
          .filter((template) => template.category === category)
          .sort((left, right) => left.name.localeCompare(right.name))
          .map((template) => ({
            id: browseTemplateNodeId(template.id),
            label: template.name,
            ariaLabel: `${template.name} template`,
            isLeaf: true,
            icon: (
              <SquaresFour size={TREE_ROW_ICON_SIZE} weight="regular" className="shrink-0 text-tertiary" aria-hidden="true" />
            ),
            data: { browseNode: { type: "template", template } satisfies BrowseTreeDatum },
          })),
      })),
    },
  ];
}

function getBrowseTreeFolderIds(nodes: UiTreeNode[]): string[] {
  const ids: string[] = [];
  function visit(node: UiTreeNode) {
    if (node.isLeaf === false) ids.push(node.id);
    node.children?.forEach(visit);
  }
  nodes.forEach(visit);
  return ids;
}

function BrowseTreeRowContent({ label, total }: { label: string; total: number | null }) {
  return (
    <span className="flex min-w-0 flex-1 items-center gap-1.5">
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {total !== null ? (
        <span className="shrink-0 text-[9px] tabular-nums text-tertiary">{pesoFormatter.format(total)}</span>
      ) : null}
    </span>
  );
}

type TemplatesBrowseTreePanelProps = {
  templates: EstimateTemplate[];
  selectedCategory: string | null;
  selectedTemplateId: string | null;
  onSelectAll: () => void;
  onSelectCategory: (category: string) => void;
  onSelectTemplate: (templateId: string) => void;
  onOpenTemplate: (templateId: string) => void;
  onInsertIntoEstimate: (template: EstimateTemplate) => void;
  onRenameTemplate: (template: EstimateTemplate) => void;
  onDuplicateTemplate: (template: EstimateTemplate) => void;
  onRequestDeleteTemplate: (template: EstimateTemplate) => void;
  onMoveTemplateToCategory: (template: EstimateTemplate, category: string) => void;
  onMoveTemplatePrompt: (template: EstimateTemplate) => void;
  onRenameCategory: (category: string) => void;
  onNewTemplate: (category?: string) => void;
};

function TemplatesBrowseTreePanel({
  templates,
  selectedCategory,
  selectedTemplateId,
  onSelectAll,
  onSelectCategory,
  onSelectTemplate,
  onOpenTemplate,
  onInsertIntoEstimate,
  onRenameTemplate,
  onDuplicateTemplate,
  onRequestDeleteTemplate,
  onMoveTemplateToCategory,
  onMoveTemplatePrompt,
  onRenameCategory,
  onNewTemplate,
}: TemplatesBrowseTreePanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => new Set());
  const [contextMenuNodeId, setContextMenuNodeId] = useState<string | null>(null);
  const [contextMenuOpen, setContextMenuOpen] = useState(false);

  const filteredTemplates = useMemo(
    () => filterTemplatesByQuery(templates, searchQuery),
    [searchQuery, templates],
  );
  const treeNodes = useMemo(() => buildBrowseTreeNodes(filteredTemplates), [filteredTemplates]);
  const folderIds = useMemo(() => getBrowseTreeFolderIds(treeNodes), [treeNodes]);
  const searchActive = searchQuery.trim().length > 0;
  // New categories default expanded: collapse state is tracked, not expansion.
  // Active searches reveal every match instead of hiding hits under folds.
  const expandedIds = useMemo(
    () => (searchActive ? folderIds : folderIds.filter((id) => !collapsedIds.has(id))),
    [collapsedIds, folderIds, searchActive],
  );

  const nodeById = useMemo(() => {
    const map = new Map<string, UiTreeNode>();
    function visit(node: UiTreeNode) {
      map.set(node.id, node);
      node.children?.forEach(visit);
    }
    treeNodes.forEach(visit);
    return map;
  }, [treeNodes]);

  const totalsByCategory = useMemo(() => {
    const totals = new Map<string, number>();
    for (const template of filteredTemplates) {
      totals.set(
        template.category,
        (totals.get(template.category) ?? 0) + summarizeEstimateTemplate(template).total,
      );
    }
    return totals;
  }, [filteredTemplates]);

  const currentNodeId = selectedTemplateId
    ? browseTemplateNodeId(selectedTemplateId)
    : selectedCategory
      ? browseCategoryNodeId(selectedCategory)
      : ALL_TEMPLATES_NODE_ID;

  const newTemplatePrefillCategory = selectedTemplateId
    ? templates.find((template) => template.id === selectedTemplateId)?.category
    : selectedCategory ?? undefined;

  const toggleNode = useCallback((nodeId: string, expanded: boolean) => {
    setCollapsedIds((current) => {
      const next = new Set(current);
      if (expanded) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }, []);

  const handleTreeToggle = useCallback((nodeId: string, expanded: boolean) => {
    toggleNode(nodeId, expanded);
  }, [toggleNode]);

  const handleRowClick = useCallback(
    (_nodeId: string, node: UiTreeNode) => {
      const datum = getBrowseTreeDatum(node);
      if (datum?.type === "all") onSelectAll();
      if (datum?.type === "category") onSelectCategory(datum.category);
      if (datum?.type === "template") onSelectTemplate(datum.template.id);
    },
    [onSelectAll, onSelectCategory, onSelectTemplate],
  );

  const handleRowDoubleClick = useCallback(
    (_nodeId: string, node: UiTreeNode) => {
      const datum = getBrowseTreeDatum(node);
      if (datum?.type === "template") onOpenTemplate(datum.template.id);
    },
    [onOpenTemplate],
  );

  /** Category a drop on `targetId` lands in, or null when it is not a move. */
  const resolveDropCategory = useCallback(
    (targetId: string, position: TreeDropPosition): string | null => {
      const datum = getBrowseTreeDatum(nodeById.get(targetId));
      if (datum?.type === "category") return position === "inside" ? datum.category : null;
      if (datum?.type === "template") return datum.template.category;
      return null;
    },
    [nodeById],
  );

  const handleCanDrag = useCallback(
    (node: UiTreeNode) => getBrowseTreeDatum(node)?.type === "template",
    [],
  );

  const handleCanDrop = useCallback(
    (draggedId: string, targetId: string, position: TreeDropPosition) => {
      const draggedDatum = getBrowseTreeDatum(nodeById.get(draggedId));
      if (draggedDatum?.type !== "template") return false;
      const targetCategory = resolveDropCategory(targetId, position);
      return targetCategory !== null && targetCategory !== draggedDatum.template.category;
    },
    [nodeById, resolveDropCategory],
  );

  const handleTreeDrop = useCallback(
    (draggedId: string, targetId: string, position: TreeDropPosition) => {
      const draggedDatum = getBrowseTreeDatum(nodeById.get(draggedId));
      if (draggedDatum?.type !== "template") return;
      const targetCategory = resolveDropCategory(targetId, position);
      if (!targetCategory || targetCategory === draggedDatum.template.category) return;
      onMoveTemplateToCategory(draggedDatum.template, targetCategory);
    },
    [nodeById, onMoveTemplateToCategory, resolveDropCategory],
  );

  const contextMenuGroups = useMemo<ActionMenuGroup[]>(() => {
    const datum = contextMenuNodeId ? getBrowseTreeDatum(nodeById.get(contextMenuNodeId)) : undefined;
    if (!datum) return [];

    if (datum.type === "all") {
      return [
        {
          id: "all-templates-actions",
          items: [
            {
              id: "new-template",
              label: "New template",
              icon: <StackPlus size={12} weight="regular" aria-hidden="true" />,
              onSelect: () => onNewTemplate(),
            },
          ],
        },
      ];
    }

    if (datum.type === "category") {
      return [
        {
          id: "category-actions",
          items: [
            {
              id: "new-template-in-category",
              label: "New template",
              icon: <StackPlus size={12} weight="regular" aria-hidden="true" />,
              onSelect: () => onNewTemplate(datum.category),
            },
            {
              id: "rename-category",
              label: "Rename group",
              icon: <PencilSimple size={12} weight="regular" aria-hidden="true" />,
              onSelect: () => onRenameCategory(datum.category),
            },
          ],
        },
      ];
    }

    return [
      {
        id: "template-primary-actions",
        items: [
          {
            id: "open-template",
            label: "Open",
            icon: <ArrowSquareOut size={12} weight="regular" aria-hidden="true" />,
            onSelect: () => onOpenTemplate(datum.template.id),
          },
          {
            id: "insert-template",
            label: "Insert into estimate…",
            icon: <Plus size={12} weight="regular" aria-hidden="true" />,
            onSelect: () => onInsertIntoEstimate(datum.template),
          },
        ],
      },
      {
        id: "template-edit-actions",
        items: [
          {
            // Keyboard/menu equivalent of dragging the template between
            // category folders (hard rule: every drag has a non-drag path).
            id: "move-template",
            label: "Move to group…",
            icon: <ArrowsLeftRight size={12} weight="regular" aria-hidden="true" />,
            onSelect: () => onMoveTemplatePrompt(datum.template),
          },
          {
            id: "rename-template",
            label: "Rename",
            icon: <PencilSimple size={12} weight="regular" aria-hidden="true" />,
            onSelect: () => onRenameTemplate(datum.template),
          },
          {
            id: "duplicate-template",
            label: "Duplicate",
            icon: <Copy size={12} weight="regular" aria-hidden="true" />,
            onSelect: () => onDuplicateTemplate(datum.template),
          },
        ],
      },
      {
        id: "template-danger-actions",
        items: [
          {
            id: "delete-template",
            label: "Delete",
            icon: <Trash size={12} weight="regular" aria-hidden="true" />,
            tone: "destructive" as const,
            onSelect: () => onRequestDeleteTemplate(datum.template),
          },
        ],
      },
    ];
  }, [
    contextMenuNodeId,
    nodeById,
    onDuplicateTemplate,
    onInsertIntoEstimate,
    onMoveTemplatePrompt,
    onNewTemplate,
    onOpenTemplate,
    onRenameCategory,
    onRenameTemplate,
    onRequestDeleteTemplate,
  ]);

  const renderBrowseRow = useCallback(
    (treeNode: UiTreeNode) => {
      const datum = getBrowseTreeDatum(treeNode);
      if (datum?.type === "category") {
        return <BrowseTreeRowContent label={datum.category} total={totalsByCategory.get(datum.category) ?? 0} />;
      }
      if (datum?.type === "template") {
        return (
          <BrowseTreeRowContent label={datum.template.name} total={summarizeEstimateTemplate(datum.template).total} />
        );
      }
      return <BrowseTreeRowContent label={treeNode.label} total={null} />;
    },
    [totalsByCategory],
  );

  return (
    <ResizableSidePanel
      side="left"
      ariaLabel="Template library tree"
      storageKey="template_library_tree_width"
      defaultWidth={272}
      minWidth={216}
      maxWidth={432}
      widthOffset={TEMPLATE_LIBRARY_TREE_WIDTH_OFFSET}
    >
      <div className="flex h-full flex-col overflow-hidden bg-white" data-template-library-tree-panel="true">
        <TreePanelHeader
          ariaLabel="Template tree tools"
          labelPrefix="template tree"
          searchValue={searchQuery}
          onSearchValueChange={setSearchQuery}
          searchPlaceholder="Search template tree"
          searchLabel="Search template tree"
          showDefaultActions={false}
          onExpandAll={() => setCollapsedIds(new Set())}
          onCollapseAll={() => setCollapsedIds(new Set(folderIds))}
          addActions={[
            {
              label: "New template",
              icon: <Plus size={12} weight="regular" aria-hidden="true" />,
              onClick: () => onNewTemplate(newTemplatePrefillCategory),
            },
          ]}
        />

        <div className="min-h-0 flex-1 overflow-auto p-2">
          {templates.length === 0 ? (
            <EmptyState
              icon={<FolderSimple size={18} weight="regular" aria-hidden="true" />}
              title="No templates yet"
              description="Create a template from scratch, or save any estimate group as a template from the estimate page."
              className="min-h-24 rounded-xs"
            />
          ) : (
            <ContextMenu onOpenChange={setContextMenuOpen}>
              <ContextMenuTrigger asChild>
                <div
                  className="block w-full"
                  onContextMenu={(event) => {
                    // Only rows open the menu; right-clicks on empty tree
                    // space keep the menu closed.
                    if (!(event.target instanceof Element) || !event.target.closest("[data-tree-row]")) {
                      event.preventDefault();
                    }
                  }}
                >
                  <Tree
                    nodes={treeNodes}
                    ariaLabel="Template library tree"
                    className="relative min-h-7 overflow-visible"
                    expandedIds={expandedIds}
                    onToggle={handleTreeToggle}
                    currentId={currentNodeId}
                    railsPinned={contextMenuOpen}
                    draggable
                    canDrag={handleCanDrag}
                    canDrop={handleCanDrop}
                    onDrop={handleTreeDrop}
                    onRowClick={handleRowClick}
                    onRowDoubleClick={handleRowDoubleClick}
                    onContextMenu={(nodeId) => setContextMenuNodeId(nodeId)}
                    renderRow={renderBrowseRow}
                  />
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent data-templates-browse-tree-context-menu="true" alignOffset={4}>
                <ContextActionMenuContent groups={contextMenuGroups} />
              </ContextMenuContent>
            </ContextMenu>
          )}
        </div>
      </div>
    </ResizableSidePanel>
  );
}

export type TemplatesBrowseManagerProps = {
  templates?: EstimateTemplate[];
  // Library Optimization Plan P0 T4: TemplatesBrowsePageClient owns the warm
  // TanStack Query cache and passes this so mutations patch that cache instead of
  // router.refresh() (which re-ran the whole server segment). No-op default keeps
  // the manager mountable bare in unit tests.
  onTemplatesMutated?: (updater: (templates: EstimateTemplate[]) => EstimateTemplate[]) => void;
};

/**
 * Templates browse tab (Library unification Phase 2): left templates tree,
 * center `TemplateGallery`, right `TemplatePreviewDock`. Selection state
 * lives here so the tree, gallery, and preview dock stay in sync.
 */
export function TemplatesBrowseManager({ templates = [], onTemplatesMutated = () => {} }: TemplatesBrowseManagerProps = {}) {
  const router = useNavigationRouter();
  // Mutations patch the route shell's warm query cache (T4). No-op when bare.
  const syncTemplatesCache = onTemplatesMutated;
  const [templateState, setTemplateState] = useState<{ source: EstimateTemplate[]; items: EstimateTemplate[] }>(() => ({
    source: templates,
    items: templates,
  }));
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [status, setStatus] = useState<TemplatesBrowseStatus>({ state: "idle" });
  const [newTemplate, setNewTemplate] = useState<{ open: boolean; category?: string }>({ open: false });
  // U12 (C5): replaces the native window.prompt for rename/move with an in-DS
  // modal (SF Pro, tokens, focus management). One reusable text prompt.
  const [textPrompt, setTextPrompt] = useState<
    | { title: string; label: string; confirmLabel: string; initialValue: string; onSubmit: (value: string) => void }
    | null
  >(null);
  const [textPromptValue, setTextPromptValue] = useState("");
  const openTextPrompt = useCallback((next: NonNullable<typeof textPrompt>) => {
    setTextPrompt(next);
    setTextPromptValue(next.initialValue);
  }, []);
  const submitTextPrompt = useCallback(() => {
    if (!textPrompt) return;
    const value = textPromptValue.trim();
    const handler = textPrompt.onSubmit;
    setTextPrompt(null);
    if (value) handler(value);
  }, [textPrompt, textPromptValue]);
  const [insertTarget, setInsertTarget] = useState<EstimateTemplate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EstimateTemplate | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  // Server refreshes re-seed the local list; optimistic edits hold otherwise.
  let localTemplates = templateState.items;
  if (templateState.source !== templates) {
    localTemplates = templates;
    setTemplateState({ source: templates, items: templates });
  }

  const categories = useMemo(() => getTemplateCategories(localTemplates), [localTemplates]);
  const scopedTemplates = useMemo(
    () => (selectedCategory ? localTemplates.filter((template) => template.category === selectedCategory) : localTemplates),
    [localTemplates, selectedCategory],
  );
  const selectedTemplate = localTemplates.find((template) => template.id === selectedTemplateId) ?? null;
  const scopeLabel = selectedCategory ?? "All Templates";

  const setItems = useCallback((updater: (items: EstimateTemplate[]) => EstimateTemplate[]) => {
    setTemplateState((current) => ({ ...current, items: updater(current.items) }));
  }, []);

  const selectAll = useCallback(() => {
    setSelectedCategory(null);
    setSelectedTemplateId(null);
  }, []);

  const selectCategory = useCallback((category: string) => {
    setSelectedCategory(category);
    setSelectedTemplateId(null);
  }, []);

  const selectTemplate = useCallback((templateId: string) => {
    setSelectedTemplateId(templateId);
  }, []);

  const closePreview = useCallback(() => {
    const templateId = selectedTemplateId;
    setSelectedTemplateId(null);
    if (templateId) {
      requestAnimationFrame(() => {
        document
          .querySelector<HTMLElement>(`[data-template-row-preview="${CSS.escape(templateId)}"]`)
          ?.focus();
      });
    }
  }, [selectedTemplateId]);

  const openTemplate = useCallback(
    (templateId: string) => {
      router.push(`/workshop/library/templates/${templateId}`);
    },
    [router],
  );

  const openNewTemplate = useCallback((category?: string) => {
    setNewTemplate({ open: true, category });
  }, []);

  const handleTemplateCreated = useCallback(
    (template: EstimateTemplate) => {
      setItems((items) => [...items.filter((entry) => entry.id !== template.id), template]);
      setSelectedTemplateId(template.id);
      setStatus({ state: "saved", message: "Template created." });
      syncTemplatesCache((items) => [...items.filter((entry) => entry.id !== template.id), template]);
    },
    [syncTemplatesCache, setItems],
  );

  const applyRenameTemplate = useCallback(
    (template: EstimateTemplate, name: string) => {
      if (name === template.name) return;
      const previous = template;
      setItems((items) => items.map((entry) => (entry.id === template.id ? { ...entry, name } : entry)));
      setStatus({ state: "saving", message: "Renaming template…" });
      renameEstimateTemplate({ templateId: template.id, name })
        .then(() => {
          setStatus({ state: "saved", message: "Template renamed." });
          syncTemplatesCache((items) => items.map((entry) => (entry.id === template.id ? { ...entry, name } : entry)));
        })
        .catch((error: unknown) => {
          setItems((items) => items.map((entry) => (entry.id === previous.id ? previous : entry)));
          setStatus({
            state: "error",
            message: error instanceof Error ? error.message : "Could not rename template.",
          });
        });
    },
    [syncTemplatesCache, setItems],
  );

  const renameTemplate = useCallback(
    (template: EstimateTemplate) => {
      openTextPrompt({
        title: "Rename template",
        label: "Template name",
        confirmLabel: "Rename",
        initialValue: template.name,
        onSubmit: (name) => applyRenameTemplate(template, name),
      });
    },
    [applyRenameTemplate, openTextPrompt],
  );

  const duplicateTemplate = useCallback(
    (template: EstimateTemplate) => {
      setStatus({ state: "saving", message: "Duplicating template…" });
      duplicateEstimateTemplate({ templateId: template.id })
        .then(({ template: duplicated }) => {
          setItems((items) => [...items.filter((entry) => entry.id !== duplicated.id), duplicated]);
          setSelectedTemplateId(duplicated.id);
          setStatus({ state: "saved", message: "Template duplicated." });
          syncTemplatesCache((items) => [...items.filter((entry) => entry.id !== duplicated.id), duplicated]);
        })
        .catch((error: unknown) => {
          setStatus({
            state: "error",
            message: error instanceof Error ? error.message : "Could not duplicate template.",
          });
        });
    },
    [syncTemplatesCache, setItems],
  );

  const moveTemplateToCategory = useCallback(
    (template: EstimateTemplate, category: string) => {
      const nextCategory = category.trim();
      if (!nextCategory || nextCategory === template.category) return;
      const previous = template;
      setItems((items) => items.map((entry) => (entry.id === template.id ? { ...entry, category: nextCategory } : entry)));
      setStatus({ state: "saving", message: "Moving template…" });
      moveEstimateTemplateToCategory({ templateId: template.id, category: nextCategory })
        .then(() => {
          setStatus({ state: "saved", message: `Moved to ${nextCategory}.` });
          syncTemplatesCache((items) =>
            items.map((entry) => (entry.id === template.id ? { ...entry, category: nextCategory } : entry)),
          );
        })
        .catch((error: unknown) => {
          setItems((items) => items.map((entry) => (entry.id === previous.id ? previous : entry)));
          setStatus({
            state: "error",
            message: error instanceof Error ? error.message : "Could not move template.",
          });
        });
    },
    [syncTemplatesCache, setItems],
  );

  const moveTemplatePrompt = useCallback(
    (template: EstimateTemplate) => {
      const otherCategories = categories.filter((category) => category !== template.category);
      openTextPrompt({
        title: `Move "${template.name}" to group`,
        label: otherCategories.length ? `Group (existing: ${otherCategories.join(", ")})` : "Group",
        confirmLabel: "Move",
        initialValue: template.category,
        onSubmit: (category) => moveTemplateToCategory(template, category),
      });
    },
    [categories, moveTemplateToCategory, openTextPrompt],
  );

  const applyRenameCategory = useCallback(
    (category: string, name: string) => {
      if (name === category) return;
      const previousItems = localTemplates;
      setItems((items) => items.map((entry) => (entry.category === category ? { ...entry, category: name } : entry)));
      if (selectedCategory === category) setSelectedCategory(name);
      setStatus({ state: "saving", message: "Renaming group…" });
      renameTemplateCategory({ from: category, to: name })
        .then(() => {
          setStatus({ state: "saved", message: "Group renamed." });
          syncTemplatesCache((items) =>
            items.map((entry) => (entry.category === category ? { ...entry, category: name } : entry)),
          );
        })
        .catch((error: unknown) => {
          setItems(() => previousItems);
          if (selectedCategory === category) setSelectedCategory(category);
          setStatus({
            state: "error",
            message: error instanceof Error ? error.message : "Could not rename group.",
          });
        });
    },
    [localTemplates, syncTemplatesCache, selectedCategory, setItems],
  );

  const renameCategory = useCallback(
    (category: string) => {
      openTextPrompt({
        title: "Rename group",
        label: "Group name",
        confirmLabel: "Rename",
        initialValue: category,
        onSubmit: (name) => applyRenameCategory(category, name),
      });
    },
    [applyRenameCategory, openTextPrompt],
  );

  const confirmDeleteTemplate = useCallback(() => {
    const template = deleteTarget;
    if (!template || deletePending) return;
    setDeletePending(true);
    setStatus({ state: "saving", message: "Deleting template…" });
    deleteEstimateTemplate({ templateId: template.id })
      .then(() => {
        setItems((items) => items.filter((entry) => entry.id !== template.id));
        setSelectedTemplateId((current) => (current === template.id ? null : current));
        setStatus({ state: "saved", message: "Template deleted." });
        syncTemplatesCache((items) => items.filter((entry) => entry.id !== template.id));
      })
      .catch((error: unknown) => {
        setStatus({
          state: "error",
          message: error instanceof Error ? error.message : "Could not delete template.",
        });
      })
      .finally(() => {
        setDeletePending(false);
        setDeleteTarget(null);
      });
  }, [deletePending, deleteTarget, syncTemplatesCache, setItems]);

  const handleInserted = useCallback((estimateName: string) => {
    setStatus({ state: "saved", message: `Inserted into ${estimateName}.` });
  }, []);

  return (
    <div
      className="flex h-full min-h-0 overflow-hidden rounded-xs border-r border-hairline bg-white"
      data-template-library-workspace="true"
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-canvas">
        <section className="flex h-full min-h-0 overflow-hidden bg-white" aria-label="Template library workspace">
        <TemplatesBrowseTreePanel
          templates={localTemplates}
          selectedCategory={selectedCategory}
          selectedTemplateId={selectedTemplateId}
            onSelectAll={selectAll}
            onSelectCategory={selectCategory}
            onSelectTemplate={selectTemplate}
            onOpenTemplate={openTemplate}
            onInsertIntoEstimate={setInsertTarget}
            onRenameTemplate={renameTemplate}
            onDuplicateTemplate={duplicateTemplate}
            onRequestDeleteTemplate={setDeleteTarget}
            onMoveTemplateToCategory={moveTemplateToCategory}
            onMoveTemplatePrompt={moveTemplatePrompt}
            onRenameCategory={renameCategory}
            onNewTemplate={openNewTemplate}
          />
          <div className="flex min-h-0 min-w-0 flex-1" data-template-gallery-panel="true">
            <TemplateGallery
              scopeLabel={scopeLabel}
              templates={scopedTemplates}
              totalTemplateCount={localTemplates.length}
              selectedTemplateId={selectedTemplateId}
              status={status}
              onSelectTemplate={selectTemplate}
              onOpenTemplate={openTemplate}
              onInsertIntoEstimate={setInsertTarget}
              onRenameTemplate={renameTemplate}
              onDuplicateTemplate={duplicateTemplate}
              onRequestDeleteTemplate={setDeleteTarget}
              onNewTemplate={() => openNewTemplate(selectedCategory ?? undefined)}
            />
          </div>
          {selectedTemplate ? (
            <TemplatePreviewDock
              template={selectedTemplate}
              onClose={closePreview}
              onOpenTemplate={openTemplate}
              onInsertIntoEstimate={setInsertTarget}
            />
          ) : null}
        </section>
      </div>

      {newTemplate.open ? (
        <NewTemplateModal
          open={newTemplate.open}
          mode="scratch"
          sourceNode={null}
          existingCategories={categories}
          defaultCategory={newTemplate.category}
          onOpenChange={(open) => {
            if (!open) setNewTemplate({ open: false });
          }}
          onCreated={handleTemplateCreated}
        />
      ) : null}

      {insertTarget ? (
        <InsertIntoEstimatePicker
          open={Boolean(insertTarget)}
          template={insertTarget}
          onOpenChange={(open) => {
            if (!open) setInsertTarget(null);
          }}
          onInserted={handleInserted}
        />
      ) : null}

      {deleteTarget ? (
        <ConfirmDialog
          open={Boolean(deleteTarget)}
          onOpenChange={(open) => {
            if (!open && !deletePending) setDeleteTarget(null);
          }}
          title="Delete template?"
          description={`"${deleteTarget.name}" will be removed from the library. Estimates already built from it keep their rows.`}
          tone="destructive"
          confirmLabel="Delete template"
          busy={deletePending}
          onConfirm={confirmDeleteTemplate}
        />
      ) : null}

      {textPrompt ? (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open) setTextPrompt(null);
          }}
          title={textPrompt.title}
          description="Enter a new name and confirm to apply."
          confirmLabel={textPrompt.confirmLabel}
          onConfirm={submitTextPrompt}
        >
          <label className="grid gap-1">
            <span className="text-[9px] font-medium text-tertiary">{textPrompt.label}</span>
            <ControlInput
              aria-label={textPrompt.label}
              autoFocus
              value={textPromptValue}
              onChange={(event) => setTextPromptValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  submitTextPrompt();
                }
              }}
            />
          </label>
        </ConfirmDialog>
      ) : null}
    </div>
  );
}
