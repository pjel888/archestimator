"use client";

import { useCallback, useMemo, useReducer, useRef, useState } from "react";
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
import { ConfirmDialog } from "@/components/ui/overlays/confirm-dialog";
import { ControlInput } from "@/components/ui/control-input";
import { CreatableCombobox, type CreatableComboboxOption } from "@/components/ui/creatable-combobox";
import { TreePanelHeader } from "@/components/ui/tree-panel-header";
import {
  TREE_ROW_ICON_SIZE,
  Tree,
  type TreeDropPosition,
  type TreeNode as UiTreeNode,
} from "@/components/ui/tree";
import { WORKSHOP_TREE_VIRTUALIZATION } from "@/lib/workshop/virtualization-flags";
import { useNavigationRouter } from "@/hooks/use-navigation-router";
import { ResizableSidePanel } from "@/components/workshop/ResizableSidePanel";
import { EstimateRightSidebar } from "@/components/workshop/component-library";
import { pesoFormatter } from "@/components/workshop/component-library/helpers";
import {
  useLibrarySurfaceVariant,
} from "@/components/workshop/library/library-surface-variant";
import { librarySurfaceClass } from "@/components/workshop/library/library-surface-class";
import {
  filterTemplatesByQuery,
  summarizeEstimateTemplate,
  type EstimateTemplate,
} from "@/components/workshop/component-library/templates";
import {
  deleteEstimateTemplate,
  duplicateEstimateTemplate,
  renameTemplateCategory,
} from "@/lib/component-library/actions";
import {
  moveLinkedEstimateTemplateToCategory,
  previewEstimateTemplateMutation,
  renameLinkedEstimateTemplate,
} from "@/lib/component-library/template-editor-actions";
import type { EstimateTemplateMutationImpact } from "@/lib/component-library/template-link-impact-d1";
import { loadCurrentWorkspaceEstimateTemplateGraph } from "@/lib/component-library/template-browse-actions";
import type { ComponentRowsLibraryDataset } from "@/lib/repositories/component-library-repository";
import { TemplateGallery, type TemplatesBrowseStatus } from "./TemplateGallery";
import { cn } from "@/lib/ui/cn";

const NewTemplateModal = dynamic(
  () => import("@/components/workshop/component-library/NewTemplateModal").then((module) => module.NewTemplateModal),
  { loading: () => null },
);

const InsertIntoEstimatePicker = dynamic(
  () => import("./InsertIntoEstimatePicker").then((module) => module.InsertIntoEstimatePicker),
  { loading: () => null },
);

const ArchivedTemplatesDialog = dynamic(
  () => import("./ArchivedTemplatesDialog").then((module) => module.ArchivedTemplatesDialog),
  { loading: () => null },
);

const TEMPLATE_LIBRARY_TREE_WIDTH_OFFSET = 104;
const ALL_TEMPLATES_NODE_ID = "all-templates";
const noopTemplatesMutated = () => {};
const noopTemplatesInvalidated = () => {};

function TemplateProjectSourcesUnavailable() {
  const surfaceVariant = useLibrarySurfaceVariant();
  return (
    <section
      className={cn("rounded-xs border border-dashed border-hairline bg-surfaceMuted/30 p-2", librarySurfaceClass(surfaceVariant, "contentTile"))}
      aria-label="Project source unavailable"
    >
      <label className="block text-[9px] font-medium uppercase tracking-normal text-tertiary" htmlFor="template-project-source-selector">
        Project
      </label>
      <select
        id="template-project-source-selector"
        className="mt-1 h-7 w-full rounded-xs border border-hairline bg-surface px-2 text-[10px] text-tertiary"
        disabled
        aria-label="Project source project"
      >
        <option>No project selected</option>
      </select>
      <p className="mt-2 text-[9px] leading-4 text-tertiary">
        Project sources are unavailable until this template workbench has a selected project scope.
      </p>
    </section>
  );
}

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

type TemplateBrowseTreeModel = {
  treeNodes: UiTreeNode[];
  folderIds: string[];
  totalsByCategory: Map<string, number>;
  totalsByTemplateId: Map<string, number>;
};

function buildBrowseTreeModel(templates: EstimateTemplate[]): TemplateBrowseTreeModel {
  const groupedTemplates = new Map<string, EstimateTemplate[]>();
  const totalsByCategory = new Map<string, number>();
  const totalsByTemplateId = new Map<string, number>();

  for (const template of templates) {
    const group = groupedTemplates.get(template.category);
    if (group) group.push(template);
    else groupedTemplates.set(template.category, [template]);

    const total = summarizeEstimateTemplate(template).total;
    totalsByTemplateId.set(template.id, total);
    totalsByCategory.set(template.category, (totalsByCategory.get(template.category) ?? 0) + total);
  }

  const categories = Array.from(groupedTemplates.keys()).sort();

  const treeNodes = [
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
        children: (groupedTemplates.get(category) ?? [])
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

  return {
    treeNodes,
    folderIds: getBrowseTreeFolderIds(treeNodes),
    totalsByCategory,
    totalsByTemplateId,
  };
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

// react-doctor-disable-next-line react-doctor/no-giant-component -- Structural split tracked in .ai/03_plans/2026-06-23-react-doctor-warning-cleanup.md; broad refactor needs behavior tests.
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
  const surfaceVariant = useLibrarySurfaceVariant();
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => new Set());
  const [contextMenuNodeId, setContextMenuNodeId] = useState<string | null>(null);
  const [contextMenuOpen, setContextMenuOpen] = useState(false);

  const filteredTemplates = useMemo(
    () => filterTemplatesByQuery(templates, searchQuery),
    [searchQuery, templates],
  );
  const browseTreeModel = useMemo(() => buildBrowseTreeModel(filteredTemplates), [filteredTemplates]);
  const { treeNodes, folderIds, totalsByCategory, totalsByTemplateId } = browseTreeModel;
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
              icon: <StackPlus size={16} weight="regular" aria-hidden="true" />,
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
              icon: <StackPlus size={16} weight="regular" aria-hidden="true" />,
              onSelect: () => onNewTemplate(datum.category),
            },
            {
              id: "rename-category",
              label: "Rename group",
              icon: <PencilSimple size={16} weight="regular" aria-hidden="true" />,
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
            icon: <ArrowSquareOut size={16} weight="regular" aria-hidden="true" />,
            onSelect: () => onOpenTemplate(datum.template.id),
          },
          {
            id: "insert-template",
            label: "Insert into estimate…",
            icon: <Plus size={16} weight="regular" aria-hidden="true" />,
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
            icon: <ArrowsLeftRight size={16} weight="regular" aria-hidden="true" />,
            onSelect: () => onMoveTemplatePrompt(datum.template),
          },
          {
            id: "rename-template",
            label: "Rename",
            icon: <PencilSimple size={16} weight="regular" aria-hidden="true" />,
            onSelect: () => onRenameTemplate(datum.template),
          },
          {
            id: "duplicate-template",
            label: "Duplicate",
            icon: <Copy size={16} weight="regular" aria-hidden="true" />,
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
            icon: <Trash size={16} weight="regular" aria-hidden="true" />,
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
          <BrowseTreeRowContent label={datum.template.name} total={totalsByTemplateId.get(datum.template.id) ?? 0} />
        );
      }
      return <BrowseTreeRowContent label={treeNode.label} total={null} />;
    },
    [totalsByCategory, totalsByTemplateId],
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
      <div
        className={cn("flex h-full flex-col overflow-hidden", librarySurfaceClass(surfaceVariant, "treeRail"))}
        data-template-library-tree-panel="true"
      >
        <TreePanelHeader
          className={cn("bg-transparent", librarySurfaceClass(surfaceVariant, "railPanelHeader"))}
          toolbarClassName={librarySurfaceClass(surfaceVariant, "toolbar")}
          showToolbarBottomBorder={surfaceVariant !== "glass"}
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
              icon: <Plus size={16} weight="regular" aria-hidden="true" />,
              onClick: () => onNewTemplate(newTemplatePrefillCategory),
            },
          ]}
        />

        <div className="min-h-0 flex-1 overflow-auto p-2">
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
                  virtualization={WORKSHOP_TREE_VIRTUALIZATION}
                />
              </div>
            </ContextMenuTrigger>
            <ContextMenuContent data-templates-browse-tree-context-menu="true" alignOffset={4}>
              <ContextActionMenuContent groups={contextMenuGroups} />
            </ContextMenuContent>
          </ContextMenu>
        </div>
      </div>
    </ResizableSidePanel>
  );
}

export type TemplatesBrowseManagerProps = {
  templates?: EstimateTemplate[];
  libraryData?: ComponentRowsLibraryDataset;
  // Library Optimization Plan P0 T4: TemplatesBrowsePageClient owns the warm
  // TanStack Query cache and passes this so mutations patch that cache instead of
  // router.refresh() (which re-ran the whole server segment). No-op default keeps
  // the manager mountable bare in unit tests.
  onTemplatesMutated?: (updater: (templates: EstimateTemplate[]) => EstimateTemplate[]) => void;
  onTemplatesInvalidated?: () => void;
};

type TemplateTextPromptState = {
  title: string;
  label: string;
  confirmLabel: string;
  initialValue: string;
  onSubmit: (value: string) => void;
};

type TemplateMovePromptState = {
  template: EstimateTemplate;
  value: string;
  selectedId: string | null;
};

type TemplatesBrowseManagerState = {
  templateState: { source: EstimateTemplate[]; items: EstimateTemplate[] };
  selectedCategory: string | null;
  selectedTemplateId: string | null;
  status: TemplatesBrowseStatus;
  newTemplate: { open: boolean; category?: string };
  textPrompt: TemplateTextPromptState | null;
  textPromptValue: string;
  movePrompt: TemplateMovePromptState | null;
  insertTarget: EstimateTemplate | null;
  deleteTarget: EstimateTemplate | null;
  deletePending: boolean;
};

type PendingLinkedTemplateAction =
  | { kind: "rename"; template: EstimateTemplate; value: string; impact: EstimateTemplateMutationImpact }
  | { kind: "move"; template: EstimateTemplate; value: string; impact: EstimateTemplateMutationImpact };

type TemplatesBrowseManagerAction =
  | { type: "templateItemsUpdated"; source: EstimateTemplate[]; baseItems: EstimateTemplate[]; updater: (items: EstimateTemplate[]) => EstimateTemplate[] }
  | { type: "allSelected" }
  | { type: "categorySelected"; category: string }
  | { type: "selectedCategoryChanged"; category: string | null }
  | { type: "templateSelected"; templateId: string | null }
  | { type: "statusChanged"; status: TemplatesBrowseStatus }
  | { type: "newTemplateOpened"; category?: string }
  | { type: "newTemplateClosed" }
  | { type: "templateCreated"; source: EstimateTemplate[]; baseItems: EstimateTemplate[]; template: EstimateTemplate }
  | { type: "textPromptOpened"; prompt: TemplateTextPromptState }
  | { type: "textPromptValueChanged"; value: string }
  | { type: "textPromptClosed" }
  | { type: "movePromptOpened"; template: EstimateTemplate }
  | { type: "movePromptChanged"; value: string; selectedId: string | null }
  | { type: "movePromptClosed" }
  | { type: "insertTargetChanged"; template: EstimateTemplate | null }
  | { type: "deleteTargetChanged"; template: EstimateTemplate | null }
  | { type: "deletePendingChanged"; pending: boolean };

function createInitialTemplatesBrowseManagerState(templates: EstimateTemplate[]): TemplatesBrowseManagerState {
  return {
    templateState: { source: templates, items: templates },
    selectedCategory: null,
    selectedTemplateId: null,
    status: { state: "idle" },
    newTemplate: { open: false },
    textPrompt: null,
    textPromptValue: "",
    movePrompt: null,
    insertTarget: null,
    deleteTarget: null,
    deletePending: false,
  };
}

function templatesBrowseManagerReducer(
  state: TemplatesBrowseManagerState,
  action: TemplatesBrowseManagerAction,
): TemplatesBrowseManagerState {
  switch (action.type) {
    case "templateItemsUpdated":
      return {
        ...state,
        templateState: {
          source: action.source,
          items: action.updater(action.baseItems),
        },
      };
    case "allSelected":
      return {
        ...state,
        selectedCategory: null,
        selectedTemplateId: null,
      };
    case "categorySelected":
      return {
        ...state,
        selectedCategory: action.category,
        selectedTemplateId: null,
      };
    case "selectedCategoryChanged":
      return {
        ...state,
        selectedCategory: action.category,
      };
    case "templateSelected":
      return {
        ...state,
        selectedTemplateId: action.templateId,
      };
    case "statusChanged":
      return {
        ...state,
        status: action.status,
      };
    case "newTemplateOpened":
      return {
        ...state,
        newTemplate: { open: true, category: action.category },
      };
    case "newTemplateClosed":
      return {
        ...state,
        newTemplate: { open: false },
      };
    case "templateCreated":
      return {
        ...state,
        templateState: {
          source: action.source,
          items: [...action.baseItems.filter((entry) => entry.id !== action.template.id), action.template],
        },
        selectedTemplateId: action.template.id,
        status: { state: "saved", message: "Template created." },
      };
    case "textPromptOpened":
      return {
        ...state,
        textPrompt: action.prompt,
        textPromptValue: action.prompt.initialValue,
      };
    case "textPromptValueChanged":
      return {
        ...state,
        textPromptValue: action.value,
      };
    case "textPromptClosed":
      return {
        ...state,
        textPrompt: null,
      };
    case "movePromptOpened":
      return {
        ...state,
        movePrompt: {
          template: action.template,
          value: "",
          selectedId: action.template.category,
        },
      };
    case "movePromptChanged":
      return {
        ...state,
        movePrompt: state.movePrompt
          ? {
              ...state.movePrompt,
              value: action.value,
              selectedId: action.selectedId,
            }
          : state.movePrompt,
      };
    case "movePromptClosed":
      return {
        ...state,
        movePrompt: null,
      };
    case "insertTargetChanged":
      return {
        ...state,
        insertTarget: action.template,
      };
    case "deleteTargetChanged":
      return {
        ...state,
        deleteTarget: action.template,
      };
    case "deletePendingChanged":
      return {
        ...state,
        deletePending: action.pending,
      };
    default:
      return state;
  }
}

/**
 * Templates browse tab (Library unification Phase 2): left templates inventory,
 * center `TemplateGallery` with selected-template preview, and right source
 * dock. Selection state lives here so the tree, gallery, and preview stay in sync.
 */
// react-doctor-disable-next-line react-doctor/no-giant-component -- Structural split tracked in .ai/03_plans/2026-06-23-react-doctor-warning-cleanup.md; broad refactor needs behavior tests.
export function TemplatesBrowseManager({
  templates = [],
  libraryData,
  onTemplatesMutated = noopTemplatesMutated,
  onTemplatesInvalidated = noopTemplatesInvalidated,
}: TemplatesBrowseManagerProps = {}) {
  const router = useNavigationRouter();
  const surfaceVariant = useLibrarySurfaceVariant();
  // Mutations patch the route shell's warm query cache (T4). No-op when bare.
  const syncTemplatesCache = onTemplatesMutated;
  const [state, dispatch] = useReducer(templatesBrowseManagerReducer, templates, createInitialTemplatesBrowseManagerState);
  const [selectedTemplateGraph, setSelectedTemplateGraph] = useState<EstimateTemplate | null>(null);
  const [archivedTemplatesOpen, setArchivedTemplatesOpen] = useState(false);
  const [pendingLinkedTemplateAction, setPendingLinkedTemplateAction] = useState<PendingLinkedTemplateAction | null>(null);
  const selectedTemplateGraphRequestIdRef = useRef(0);
  const {
    templateState,
    selectedCategory,
    selectedTemplateId,
    status,
    newTemplate,
    textPrompt,
    textPromptValue,
    movePrompt,
    insertTarget,
    deleteTarget,
    deletePending,
  } = state;

  const openTextPrompt = useCallback((prompt: TemplateTextPromptState) => {
    dispatch({ type: "textPromptOpened", prompt });
  }, []);
  const submitTextPrompt = useCallback(() => {
    if (!textPrompt) return;
    const value = textPromptValue.trim();
    const handler = textPrompt.onSubmit;
    dispatch({ type: "textPromptClosed" });
    if (value) handler(value);
  }, [textPrompt, textPromptValue]);

  // Server refreshes re-seed the local list; optimistic edits hold otherwise.
  const localTemplates = templateState.source === templates ? templateState.items : templates;

  const categories = useMemo(() => getTemplateCategories(localTemplates), [localTemplates]);
  const scopedTemplates = useMemo(
    () => (selectedCategory ? localTemplates.filter((template) => template.category === selectedCategory) : localTemplates),
    [localTemplates, selectedCategory],
  );
  const selectedTemplateSummary = localTemplates.find((template) => template.id === selectedTemplateId) ?? null;
  const selectedTemplate = selectedTemplateGraph?.id === selectedTemplateId
    ? selectedTemplateGraph
    : selectedTemplateSummary;
  const scopeLabel = selectedCategory ?? "All Templates";

  const setItems = useCallback((updater: (items: EstimateTemplate[]) => EstimateTemplate[]) => {
    dispatch({ type: "templateItemsUpdated", source: templates, baseItems: localTemplates, updater });
  }, [localTemplates, templates]);

  const selectAll = useCallback(() => {
    selectedTemplateGraphRequestIdRef.current += 1;
    setSelectedTemplateGraph(null);
    dispatch({ type: "allSelected" });
  }, []);

  const selectCategory = useCallback((category: string) => {
    selectedTemplateGraphRequestIdRef.current += 1;
    setSelectedTemplateGraph(null);
    dispatch({ type: "categorySelected", category });
  }, []);

  const selectTemplate = useCallback((templateId: string) => {
    dispatch({ type: "templateSelected", templateId });
    const template = localTemplates.find((entry) => entry.id === templateId);
    const requestId = selectedTemplateGraphRequestIdRef.current + 1;
    selectedTemplateGraphRequestIdRef.current = requestId;
    if (!template) {
      setSelectedTemplateGraph(null);
      return;
    }
    if (template.nodes.length > 0 || (
      (template.summary?.groupCount ?? 0) === 0
      && (template.summary?.areaCount ?? 0) === 0
      && (template.summary?.rowCount ?? 0) === 0
    )) {
      setSelectedTemplateGraph(template);
      return;
    }
    setSelectedTemplateGraph(null);
    loadCurrentWorkspaceEstimateTemplateGraph(templateId)
      .then((graph) => {
        if (selectedTemplateGraphRequestIdRef.current !== requestId) return;
        setSelectedTemplateGraph({ ...graph, summary: template.summary ?? graph.summary });
      })
      .catch((error: unknown) => {
        if (selectedTemplateGraphRequestIdRef.current !== requestId) return;
        console.error("[templates] selected template graph load failed", error);
        dispatch({ type: "statusChanged", status: { state: "error", message: "Could not load the estimate template." } });
      });
  }, [localTemplates]);

  const closePreview = useCallback(() => {
    const templateId = selectedTemplateId;
    selectedTemplateGraphRequestIdRef.current += 1;
    setSelectedTemplateGraph(null);
    dispatch({ type: "templateSelected", templateId: null });
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
    dispatch({ type: "newTemplateOpened", category });
  }, []);
  const openNewTemplateForSelection = useCallback(() => {
    openNewTemplate(selectedCategory ?? undefined);
  }, [openNewTemplate, selectedCategory]);
  const openInsertTarget = useCallback((template: EstimateTemplate) => {
    dispatch({ type: "insertTargetChanged", template });
  }, []);
  const requestDeleteTemplate = useCallback((template: EstimateTemplate) => {
    dispatch({ type: "deleteTargetChanged", template });
  }, []);

  const handleTemplateCreated = useCallback(
    (template: EstimateTemplate) => {
      dispatch({ type: "templateCreated", source: templates, baseItems: localTemplates, template });
      syncTemplatesCache((items) => [...items.filter((entry) => entry.id !== template.id), template]);
    },
    [localTemplates, syncTemplatesCache, templates],
  );

  const commitRenameTemplate = useCallback(
    (template: EstimateTemplate, name: string, impact: EstimateTemplateMutationImpact) => {
      const previous = template;
      setItems((items) => items.map((entry) => (entry.id === template.id ? { ...entry, name } : entry)));
      dispatch({ type: "statusChanged", status: { state: "saving", message: "Renaming template…" } });
      void renameLinkedEstimateTemplate({
        intentId: globalThis.crypto.randomUUID(),
        templateId: template.id,
        name,
        ...(impact.activeInstanceCount > 0 ? {
          confirmation: {
            expectedVersionNumber: impact.currentVersionNumber,
            impactFingerprint: impact.fingerprint,
          },
        } : {}),
      })
        .then((confirmed) => {
          dispatch({ type: "statusChanged", status: { state: "saved", message: "Template renamed." } });
          syncTemplatesCache((items) => items.map((entry) => (entry.id === confirmed.templateId ? { ...entry, name: confirmed.name } : entry)));
        })
        .catch((error: unknown) => {
          setItems((items) => items.map((entry) => (entry.id === previous.id ? previous : entry)));
          dispatch({
            type: "statusChanged",
            status: {
              state: "error",
              message: error instanceof Error ? error.message : "Could not rename template.",
            },
          });
        });
    },
    [syncTemplatesCache, setItems],
  );

  const applyRenameTemplate = useCallback(
    (template: EstimateTemplate, name: string) => {
      if (name === template.name) return;
      dispatch({ type: "statusChanged", status: { state: "saving", message: "Reviewing linked instances…" } });
      void previewEstimateTemplateMutation({ templateId: template.id })
        .then((impact) => {
          if (impact.activeInstanceCount > 0) {
            setPendingLinkedTemplateAction({ kind: "rename", template, value: name, impact });
            dispatch({ type: "statusChanged", status: { state: "saved", message: "Rename needs confirmation." } });
            return;
          }
          commitRenameTemplate(template, name, impact);
        })
        .catch((error: unknown) => {
          dispatch({
            type: "statusChanged",
            status: { state: "error", message: error instanceof Error ? error.message : "Could not review linked instances." },
          });
        });
    },
    [commitRenameTemplate],
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
      dispatch({ type: "statusChanged", status: { state: "saving", message: "Duplicating template…" } });
      duplicateEstimateTemplate({ intentId: globalThis.crypto.randomUUID(), templateId: template.id })
        .then(({ template: duplicated }) => {
          setItems((items) => [...items.filter((entry) => entry.id !== duplicated.id), duplicated]);
          dispatch({ type: "templateSelected", templateId: duplicated.id });
          dispatch({ type: "statusChanged", status: { state: "saved", message: "Template duplicated." } });
          syncTemplatesCache((items) => [...items.filter((entry) => entry.id !== duplicated.id), duplicated]);
        })
        .catch((error: unknown) => {
          dispatch({
            type: "statusChanged",
            status: {
              state: "error",
              message: error instanceof Error ? error.message : "Could not duplicate template.",
            },
          });
        });
    },
    [syncTemplatesCache, setItems],
  );

  const commitMoveTemplateToCategory = useCallback(
    (template: EstimateTemplate, nextCategory: string, impact: EstimateTemplateMutationImpact) => {
      const previous = template;
      setItems((items) => items.map((entry) => (entry.id === template.id ? { ...entry, category: nextCategory } : entry)));
      dispatch({ type: "statusChanged", status: { state: "saving", message: "Moving template…" } });
      void moveLinkedEstimateTemplateToCategory({
        intentId: globalThis.crypto.randomUUID(),
        templateId: template.id,
        category: nextCategory,
        ...(impact.activeInstanceCount > 0 ? {
          confirmation: {
            expectedVersionNumber: impact.currentVersionNumber,
            impactFingerprint: impact.fingerprint,
          },
        } : {}),
      })
        .then(() => {
          dispatch({ type: "statusChanged", status: { state: "saved", message: `Moved to ${nextCategory}.` } });
          syncTemplatesCache((items) =>
            items.map((entry) => (entry.id === template.id ? { ...entry, category: nextCategory } : entry)),
          );
          onTemplatesInvalidated();
        })
        .catch((error: unknown) => {
          setItems((items) => items.map((entry) => (entry.id === previous.id ? previous : entry)));
          dispatch({
            type: "statusChanged",
            status: {
              state: "error",
              message: error instanceof Error ? error.message : "Could not move template.",
            },
          });
        });
    },
    [onTemplatesInvalidated, syncTemplatesCache, setItems],
  );

  const moveTemplateToCategory = useCallback(
    (template: EstimateTemplate, category: string) => {
      const nextCategory = category.trim();
      if (!nextCategory || nextCategory === template.category) return;
      dispatch({ type: "statusChanged", status: { state: "saving", message: "Reviewing linked instances…" } });
      void previewEstimateTemplateMutation({ templateId: template.id })
        .then((impact) => {
          if (impact.activeInstanceCount > 0) {
            setPendingLinkedTemplateAction({ kind: "move", template, value: nextCategory, impact });
            dispatch({ type: "statusChanged", status: { state: "saved", message: "Move needs confirmation." } });
            return;
          }
          commitMoveTemplateToCategory(template, nextCategory, impact);
        })
        .catch((error: unknown) => {
          dispatch({
            type: "statusChanged",
            status: { state: "error", message: error instanceof Error ? error.message : "Could not review linked instances." },
          });
        });
    },
    [commitMoveTemplateToCategory],
  );

  const moveTemplatePrompt = useCallback(
    (template: EstimateTemplate) => {
      dispatch({ type: "movePromptOpened", template });
    },
    [],
  );

  const movePromptCategory = movePrompt?.template.category;
  const movePromptOptions = useMemo<CreatableComboboxOption[]>(
    () =>
      categories.map((category) => ({
        id: category,
        label: category,
        description: movePromptCategory === category ? "Current group" : "Existing group",
      })),
    [categories, movePromptCategory],
  );

  const submitMovePrompt = useCallback(() => {
    if (!movePrompt) return;
    const category = movePrompt.value.trim();
    const template = movePrompt.template;
    dispatch({ type: "movePromptClosed" });
    if (category) moveTemplateToCategory(template, category);
  }, [movePrompt, moveTemplateToCategory]);

  const applyRenameCategory = useCallback(
    (category: string, name: string) => {
      if (name === category) return;
      const previousItems = localTemplates;
      setItems((items) => items.map((entry) => (entry.category === category ? { ...entry, category: name } : entry)));
      if (selectedCategory === category) dispatch({ type: "selectedCategoryChanged", category: name });
      dispatch({ type: "statusChanged", status: { state: "saving", message: "Renaming group…" } });
      renameTemplateCategory({ intentId: globalThis.crypto.randomUUID(), from: category, to: name })
        .then(() => {
          dispatch({ type: "statusChanged", status: { state: "saved", message: "Group renamed." } });
          syncTemplatesCache((items) =>
            items.map((entry) => (entry.category === category ? { ...entry, category: name } : entry)),
          );
        })
        .catch((error: unknown) => {
          setItems(() => previousItems);
          if (selectedCategory === category) dispatch({ type: "selectedCategoryChanged", category });
          dispatch({
            type: "statusChanged",
            status: {
              state: "error",
              message: error instanceof Error ? error.message : "Could not rename group.",
            },
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
    dispatch({ type: "deletePendingChanged", pending: true });
    dispatch({ type: "statusChanged", status: { state: "saving", message: "Archiving template…" } });
    deleteEstimateTemplate({ intentId: globalThis.crypto.randomUUID(), templateId: template.id })
      .then(() => {
        setItems((items) => items.filter((entry) => entry.id !== template.id));
        if (selectedTemplateId === template.id) dispatch({ type: "templateSelected", templateId: null });
        dispatch({ type: "statusChanged", status: { state: "saved", message: "Template archived." } });
        syncTemplatesCache((items) => items.filter((entry) => entry.id !== template.id));
      })
      .catch((error: unknown) => {
        dispatch({
          type: "statusChanged",
          status: {
            state: "error",
            message: error instanceof Error ? error.message : "Could not archive template.",
          },
        });
      })
      .finally(() => {
        dispatch({ type: "deletePendingChanged", pending: false });
        dispatch({ type: "deleteTargetChanged", template: null });
      });
  }, [deletePending, deleteTarget, selectedTemplateId, syncTemplatesCache, setItems]);

  const handleInserted = useCallback((estimateName: string) => {
    dispatch({ type: "statusChanged", status: { state: "saved", message: `Inserted into ${estimateName}.` } });
  }, []);

  return (
    <div
      className={cn(
        "flex h-full min-h-0 overflow-hidden rounded-xs",
        surfaceVariant === "glass" ? "gap-2 border border-[color:var(--glass-border)] p-2" : "border-r border-hairline",
        librarySurfaceClass(surfaceVariant, "root"),
      )}
      data-template-library-workspace="true"
      data-library-surface={surfaceVariant}
      data-onboarding-target="library.templates"
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-transparent">
        <section className="flex h-full min-h-0 overflow-hidden bg-transparent" aria-label="Template library workspace">
        <TemplatesBrowseTreePanel
          templates={localTemplates}
          selectedCategory={selectedCategory}
          selectedTemplateId={selectedTemplateId}
            onSelectAll={selectAll}
            onSelectCategory={selectCategory}
            onSelectTemplate={selectTemplate}
            onOpenTemplate={openTemplate}
            onInsertIntoEstimate={openInsertTarget}
            onRenameTemplate={renameTemplate}
            onDuplicateTemplate={duplicateTemplate}
            onRequestDeleteTemplate={requestDeleteTemplate}
            onMoveTemplateToCategory={moveTemplateToCategory}
            onMoveTemplatePrompt={moveTemplatePrompt}
            onRenameCategory={renameCategory}
            onNewTemplate={openNewTemplate}
          />
          <div className="flex min-h-0 min-w-0 flex-1" data-template-gallery-panel="true">
            <TemplateGallery
              scopeLabel={scopeLabel}
              templates={scopedTemplates}
              selectedTemplateId={selectedTemplateId}
              selectedTemplate={selectedTemplate}
              status={status}
              onSelectTemplate={selectTemplate}
              onClosePreview={closePreview}
              onOpenTemplate={openTemplate}
              onInsertIntoEstimate={openInsertTarget}
              onRenameTemplate={renameTemplate}
              onDuplicateTemplate={duplicateTemplate}
              onRequestDeleteTemplate={requestDeleteTemplate}
              onNewTemplate={openNewTemplateForSelection}
              onOpenArchived={() => setArchivedTemplatesOpen(true)}
            />
          </div>
          <div className="hidden min-h-0 lg:flex" data-template-source-dock="true">
            <EstimateRightSidebar
              visibleTabs={["components", "project"]}
              initialActiveTab="components"
              initialLibraryItems={libraryData?.libraryItems}
              categoryTree={libraryData?.categoryTree}
              suppliers={libraryData?.suppliers}
              brands={libraryData?.brands}
              libraryFolders={libraryData?.libraryFolders}
              templates={[]}
              enableReusableProjectSources={false}
              useStoredPreferences={false}
              usePersistentPanelWidth={false}
              templateCreateMode="scratch"
              projectTabUnavailable={<TemplateProjectSourcesUnavailable />}
            />
          </div>
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
            if (!open) dispatch({ type: "newTemplateClosed" });
          }}
          onCreated={handleTemplateCreated}
        />
      ) : null}

      {insertTarget ? (
        <InsertIntoEstimatePicker
          open={Boolean(insertTarget)}
          template={insertTarget}
          onOpenChange={(open) => {
            if (!open) dispatch({ type: "insertTargetChanged", template: null });
          }}
          onInserted={handleInserted}
        />
      ) : null}

      {deleteTarget ? (
        <ConfirmDialog
          open={Boolean(deleteTarget)}
          onOpenChange={(open) => {
            if (!open && !deletePending) dispatch({ type: "deleteTargetChanged", template: null });
          }}
          title="Archive template?"
          description={`"${deleteTarget.name}" will move out of Active Templates. Existing linked instances remain intact.`}
          confirmLabel="Archive template"
          busy={deletePending}
          onConfirm={confirmDeleteTemplate}
        />
      ) : null}

      {archivedTemplatesOpen ? (
        <ArchivedTemplatesDialog
          open
          onOpenChange={setArchivedTemplatesOpen}
          onRestored={(template) => {
            setItems((items) => [...items, template]);
            syncTemplatesCache((items) => [...items.filter((item) => item.id !== template.id), template]);
            dispatch({ type: "statusChanged", status: { state: "saved", message: `${template.name} restored to Active Templates.` } });
          }}
        />
      ) : null}

      {textPrompt ? (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open) dispatch({ type: "textPromptClosed" });
          }}
          title={textPrompt.title}
          description="Enter a new name and confirm to apply."
          confirmLabel={textPrompt.confirmLabel}
          onConfirm={submitTextPrompt}
        >
          <div className="grid gap-1">
            <span className="text-[9px] font-medium text-tertiary">{textPrompt.label}</span>
            <ControlInput
              aria-label={textPrompt.label}
              autoFocus
              value={textPromptValue}
              onChange={(event) => dispatch({ type: "textPromptValueChanged", value: event.target.value })}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  submitTextPrompt();
                }
              }}
            />
          </div>
        </ConfirmDialog>
      ) : null}

      {pendingLinkedTemplateAction ? (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open) {
              setPendingLinkedTemplateAction(null);
              dispatch({ type: "statusChanged", status: { state: "saved", message: `${pendingLinkedTemplateAction.kind === "rename" ? "Rename" : "Move"} cancelled.` } });
            }
          }}
          title={pendingLinkedTemplateAction.kind === "rename"
            ? `Rename ${pendingLinkedTemplateAction.template.name}?`
            : `Move ${pendingLinkedTemplateAction.template.name} to ${pendingLinkedTemplateAction.value}?`}
          description={`This updates ${pendingLinkedTemplateAction.impact.activeInstanceCount} linked ${pendingLinkedTemplateAction.impact.activeInstanceCount === 1 ? "instance" : "instances"} across ${pendingLinkedTemplateAction.impact.affectedEstimateCount} ${pendingLinkedTemplateAction.impact.affectedEstimateCount === 1 ? "Estimate" : "Estimates"}.`}
          confirmLabel={pendingLinkedTemplateAction.kind === "rename" ? "Rename and update linked instances" : "Move and update linked instances"}
          onConfirm={() => {
            const pending = pendingLinkedTemplateAction;
            setPendingLinkedTemplateAction(null);
            if (pending.kind === "rename") commitRenameTemplate(pending.template, pending.value, pending.impact);
            else commitMoveTemplateToCategory(pending.template, pending.value, pending.impact);
          }}
        />
      ) : null}

      {movePrompt ? (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open) dispatch({ type: "movePromptClosed" });
          }}
          title={`Move "${movePrompt.template.name}" to group`}
          description={`Current group: ${movePrompt.template.category}. Choose an existing group or create a new one.`}
          confirmLabel="Move"
          onConfirm={submitMovePrompt}
        >
          <div className="grid gap-1">
            <span className="text-[9px] font-medium text-tertiary">Group</span>
            <CreatableCombobox
              ariaLabel="Template group"
              value={movePrompt.value}
              selectedId={movePrompt.selectedId}
              options={movePromptOptions}
              placeholder="Search or create a group"
              createLabel={(value) => `Create "${value}"`}
              onChange={(change) => {
                dispatch({ type: "movePromptChanged", value: change.label, selectedId: change.id });
              }}
            />
          </div>
        </ConfirmDialog>
      ) : null}
    </div>
  );
}
