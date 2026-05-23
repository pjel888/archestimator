"use client";

import {
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  useCallback,
  useMemo,
  useState,
  useTransition,
} from "react";
import {
  ControlledTreeEnvironment,
  InteractionMode,
  Tree,
  type DraggingPosition,
  type TreeItem,
  type TreeItemIndex,
  type TreeViewState,
} from "react-complex-tree";
import { CaretDown, CaretRight, FolderSimple, SquaresFour } from "@phosphor-icons/react/dist/ssr";

import { HeaderIconToolbar } from "@/components/ui/header-icon-toolbar";
import { SearchInput } from "@/components/ui/search-input";
import type { ActionMenuGroup } from "@/components/ui/action-menu";
import { ResizableSidePanel } from "@/components/workshop/ResizableSidePanel";
import { WorkshopTreeRow, WorkshopTreeTabs } from "@/components/workshop/workshop-tree";
import { WORKSHOP_TREE_ICON_SLOT_CLASS, WORKSHOP_TREE_ROW_MIN_HEIGHT_CLASS } from "@/components/workshop/tree-visual-style";
import {
  createLibraryFolder,
  deleteLibraryFolder,
  renameLibraryFolder,
  reorderLibraryFolders,
} from "@/lib/component-library/actions";
import {
  buildLibraryFolderTree,
  evaluateLibraryFolderDrop,
  getLibraryItemsForFolderNode,
  LIBRARY_FOLDER_TREE_ID,
  LIBRARY_FOLDER_TREE_ROOT_ITEM_ID,
  planLibraryFolderDelete,
  toLibraryFolderTreeItemId,
  type LibraryFolderRecord,
  type LibraryFolderTreeNode,
} from "@/lib/component-library/library-folder-reorder";
import {
  componentCategoryTree,
  type ComponentLibraryTaxonomyNode,
} from "@/lib/component-library/taxonomy";
import { cn } from "@/lib/ui/cn";
import { estimateLibraryItems, type EstimateRowItem } from "../estimate-tree-data";
import {
  buildComponentLibraryNavigationTree,
  filterTree,
  getAllNodeIds,
  getLibraryItemsForTreeNode,
  LibraryTree,
} from "../component-library/tree";
import {
  getComponentName,
  getComponentPrice,
  pesoFormatter,
} from "../component-library/helpers";
import type { LibraryTreeNode } from "../component-library/tree/types";
import type { ComponentLibrarySupplierOption } from "../component-library/tree/buildLibraryTree";

const COMPONENT_LIBRARY_TREE_WIDTH_OFFSET = 104;
const LIBRARY_TABS = [{ id: "components", label: "Components" }] as const;
const COMPONENT_VIEW_MODES = [
  { id: "default", label: "View By: Default" },
  { id: "suppliers", label: "Suppliers" },
] as const;

type ComponentViewMode = (typeof COMPONENT_VIEW_MODES)[number]["id"];

type LibraryFolderTreeItemData = {
  folderId: string | null;
  label: string;
};

type LibraryFolderTreeModel = {
  items: Record<TreeItemIndex, TreeItem<LibraryFolderTreeItemData>>;
  folderItemIds: TreeItemIndex[];
};

type ReorderStatus =
  | { state: "idle" }
  | { state: "saving"; message: string }
  | { state: "saved"; message: string }
  | { state: "error"; message: string };

function findNode(nodes: LibraryTreeNode[], nodeId: string): LibraryTreeNode | null {
  for (const node of nodes) {
    if (node.id === nodeId) return node;
    const child = findNode(node.children ?? [], nodeId);
    if (child) return child;
  }
  return null;
}

function findFolderNode(nodes: LibraryFolderTreeNode[], folderId: string | null): LibraryFolderTreeNode | null {
  if (!folderId) return null;
  for (const node of nodes) {
    if (node.folderId === folderId) return node;
    const child = findFolderNode(node.children ?? [], folderId);
    if (child) return child;
  }
  return null;
}

function getFirstFolderId(nodes: LibraryFolderTreeNode[]): string | null {
  return nodes[0]?.folderId ?? null;
}

function normalizeLabel(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function itemMatchesSheetQuery(item: EstimateRowItem, query: string): boolean {
  const normalizedQuery = normalizeLabel(query);
  if (!normalizedQuery) return true;

  return [
    getComponentName(item),
    item.supplier,
    item.category,
    item.unit,
    item.description,
    ...(item.categoryPath ?? []),
  ]
    .filter(Boolean)
    .some((value) => normalizeLabel(value).includes(normalizedQuery));
}

function buildFallbackLibraryFolders(
  nodes: ComponentLibraryTaxonomyNode[],
  parentId: string | null = null,
  workspaceId = "fallback-workspace",
): LibraryFolderRecord[] {
  return nodes.flatMap((node, index) => {
    const folderId = `taxonomy-${node.id}`;
    return [
      {
        id: folderId,
        workspace_id: workspaceId,
        parent_id: parentId,
        name: node.label,
        sort_order: (index + 1) * 10,
        source_category_node_id: node.id,
        folder_kind: "taxonomy",
      } satisfies LibraryFolderRecord,
      ...buildFallbackLibraryFolders(node.children ?? [], folderId, workspaceId),
    ];
  });
}

function normalizeLibraryFolderRecords(folders: LibraryFolderRecord[]): LibraryFolderRecord[] {
  return folders.map((folder) => ({
    id: folder.id,
    workspace_id: folder.workspace_id,
    parent_id: folder.parent_id,
    name: folder.name,
    sort_order: folder.sort_order,
    source_category_node_id: folder.source_category_node_id,
    folder_kind: folder.folder_kind === "taxonomy" ? "taxonomy" : "custom",
  }));
}

function folderMatchesQuery(node: LibraryFolderTreeNode, query: string): boolean {
  const normalizedQuery = normalizeLabel(query);
  if (!normalizedQuery) return true;
  return normalizeLabel(node.label).includes(normalizedQuery);
}

function filterFolderTree(nodes: LibraryFolderTreeNode[], query: string): LibraryFolderTreeNode[] {
  if (!query.trim()) return nodes;
  return nodes.flatMap((node) => {
    const children = filterFolderTree(node.children ?? [], query);
    if (folderMatchesQuery(node, query) || children.length > 0) {
      return [{ ...node, children }];
    }
    return [];
  });
}

function getAllFolderTreeItemIds(nodes: LibraryFolderTreeNode[]): TreeItemIndex[] {
  return nodes.flatMap((node) => [node.id, ...getAllFolderTreeItemIds(node.children ?? [])]);
}

function buildFolderTreeModel(nodes: LibraryFolderTreeNode[]): LibraryFolderTreeModel {
  const items: Record<TreeItemIndex, TreeItem<LibraryFolderTreeItemData>> = {
    [LIBRARY_FOLDER_TREE_ROOT_ITEM_ID]: {
      index: LIBRARY_FOLDER_TREE_ROOT_ITEM_ID,
      isFolder: true,
      canMove: false,
      children: nodes.map((node) => node.id),
      data: { folderId: null, label: "Library folders" },
    },
  };
  const folderItemIds: TreeItemIndex[] = [];

  function visit(node: LibraryFolderTreeNode) {
    folderItemIds.push(node.id);
    items[node.id] = {
      index: node.id,
      isFolder: true,
      canMove: true,
      children: node.children?.map((child) => child.id) ?? [],
      data: { folderId: node.folderId, label: node.label },
    };
    node.children?.forEach(visit);
  }

  nodes.forEach(visit);
  return { items, folderItemIds };
}

function getSupplierBackedItems(items: EstimateRowItem[]) {
  return items.filter((item) => Boolean(item.supplierId || item.supplier?.trim()));
}

function FolderActionIcon() {
  return <FolderSimple size={12} weight="bold" aria-hidden="true" />;
}

function LibraryFolderTree({
  folders,
  nodes,
  selectedFolderId,
  searchQuery,
  disabled,
  onSelectFolder,
  onFoldersChange,
  onReorderStatus,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
}: {
  folders: LibraryFolderRecord[];
  nodes: LibraryFolderTreeNode[];
  selectedFolderId: string | null;
  searchQuery: string;
  disabled: boolean;
  onSelectFolder: (folderId: string) => void;
  onFoldersChange: (folders: LibraryFolderRecord[]) => void;
  onReorderStatus: (status: ReorderStatus) => void;
  onCreateFolder: (parentId: string | null) => void;
  onRenameFolder: (folderId: string, currentName: string) => void;
  onDeleteFolder: (folderId: string, currentName: string) => void;
}) {
  const filteredNodes = useMemo(() => filterFolderTree(nodes, searchQuery), [nodes, searchQuery]);
  const treeModel = useMemo(() => buildFolderTreeModel(filteredNodes), [filteredNodes]);
  const [expandedItemIds, setExpandedItemIds] = useState<TreeItemIndex[]>(() => getAllFolderTreeItemIds(nodes));
  const selectedItems = useMemo<TreeItemIndex[]>(
    () => (selectedFolderId ? [toLibraryFolderTreeItemId(selectedFolderId)] : []),
    [selectedFolderId],
  );
  const viewState = useMemo<TreeViewState>(() => ({
    [LIBRARY_FOLDER_TREE_ID]: {
      expandedItems: expandedItemIds,
      selectedItems,
      focusedItem: selectedItems[0],
    },
  }), [expandedItemIds, selectedItems]);

  const canDrag = useCallback((items: TreeItem<LibraryFolderTreeItemData>[]) => (
    !disabled && items.length === 1 && Boolean(items[0]?.data.folderId)
  ), [disabled]);

  const canDropAt = useCallback((items: TreeItem<LibraryFolderTreeItemData>[], target: DraggingPosition) => {
    if (!canDrag(items)) return false;
    return evaluateLibraryFolderDrop({
      folders,
      draggedItemIds: items.map((item) => item.index),
      target,
    }).ok;
  }, [canDrag, folders]);

  const handleDrop = useCallback(async (items: TreeItem<LibraryFolderTreeItemData>[], target: DraggingPosition) => {
    const result = evaluateLibraryFolderDrop({
      folders,
      draggedItemIds: items.map((item) => item.index),
      target,
    });

    if (!result.ok) {
      onReorderStatus({ state: "error", message: result.message });
      return;
    }

    const previousFolders = folders;
    onFoldersChange(result.plan.nextFolders);
    onReorderStatus({ state: "saving", message: "Saving folder order..." });
    try {
      await reorderLibraryFolders({ updates: result.plan.updates });
      onSelectFolder(result.plan.draggedFolderId);
      onReorderStatus({ state: "saved", message: "Folder order saved." });
    } catch (error) {
      onFoldersChange(previousFolders);
      onReorderStatus({ state: "error", message: error instanceof Error ? error.message : "Could not save folder order." });
    }
  }, [folders, onFoldersChange, onReorderStatus, onSelectFolder]);

  const createActionGroups = useCallback((item: TreeItem<LibraryFolderTreeItemData>, hasChildren: boolean, isExpanded: boolean): ActionMenuGroup[] => {
    const folderId = item.data.folderId;
    return [
      {
        id: "folder-actions",
        items: [
          {
            id: "select",
            label: "Select",
            onSelect: () => {
              if (folderId) onSelectFolder(folderId);
            },
          },
          ...(hasChildren
            ? [
                {
                  id: isExpanded ? "collapse" : "expand",
                  label: isExpanded ? "Collapse" : "Expand",
                  onSelect: () => {
                    setExpandedItemIds((current) =>
                      current.includes(item.index) ? current.filter((id) => id !== item.index) : [...current, item.index],
                    );
                  },
                },
              ]
            : []),
          {
            id: "add-folder",
            label: "Add folder",
            disabled,
            disabledReason: disabled ? "Finish the current folder save before creating another folder." : undefined,
            onSelect: () => onCreateFolder(folderId),
          },
          {
            id: "rename-folder",
            label: "Rename",
            disabled,
            disabledReason: disabled ? "Finish the current folder save before renaming another folder." : undefined,
            onSelect: () => {
              if (folderId) onRenameFolder(folderId, item.data.label);
            },
          },
          {
            id: "delete-folder",
            label: "Delete",
            tone: "destructive",
            disabled: disabled || !folderId,
            disabledReason: disabled ? "Finish the current folder save before deleting another folder." : undefined,
            onSelect: () => {
              if (folderId) onDeleteFolder(folderId, item.data.label);
            },
          },
        ],
      },
    ];
  }, [disabled, onCreateFolder, onDeleteFolder, onRenameFolder, onSelectFolder]);

  if (filteredNodes.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-hairline bg-surfaceMuted p-2 text-[10px] leading-4 text-tertiary">
        No folders match &quot;{searchQuery}&quot;.
      </div>
    );
  }

  return (
    <ControlledTreeEnvironment<LibraryFolderTreeItemData>
      items={treeModel.items}
      getItemTitle={(item) => item.data.label}
      viewState={viewState}
      defaultInteractionMode={InteractionMode.ClickArrowToExpand}
      canInvokePrimaryActionOnItemContainer
      canSearch={false}
      canDragAndDrop
      canReorderItems
      canDropOnFolder
      canDropOnNonFolder={false}
      canDropBelowOpenFolders
      canDrag={canDrag}
      canDropAt={canDropAt}
      onDrop={handleDrop}
      onPrimaryAction={(item) => {
        if (item.data.folderId) onSelectFolder(item.data.folderId);
      }}
      onExpandItem={(item) => {
        setExpandedItemIds((current) => current.includes(item.index) ? current : [...current, item.index]);
      }}
      onCollapseItem={(item) => {
        setExpandedItemIds((current) => current.filter((id) => id !== item.index));
      }}
      renderTreeContainer={({ children, containerProps }) => {
        const { className, ...treeContainerProps } = containerProps as HTMLAttributes<HTMLDivElement>;
        return (
          <nav aria-label="Library folder tree">
            <div {...treeContainerProps} className={cn("relative min-h-7 outline-none", className)}>
              {children}
            </div>
          </nav>
        );
      }}
      renderItemsContainer={({ children, containerProps }) => {
        const { className, ...itemsContainerProps } = containerProps as HTMLAttributes<HTMLOListElement>;
        return (
          <ol {...itemsContainerProps} className={cn("space-y-0", className)}>
            {children}
          </ol>
        );
      }}
      renderItemTitle={({ title }) => (
        <>
          <span className={cn("mr-1", WORKSHOP_TREE_ICON_SLOT_CLASS)} aria-hidden="true">
            <FolderActionIcon />
          </span>
          <span className="min-w-0 flex-1 truncate">{title}</span>
        </>
      )}
      renderItemArrow={({ context }) => (
        <span className={cn(WORKSHOP_TREE_ICON_SLOT_CLASS, "cursor-pointer transition hover:bg-surfaceMuted")}>
          {context.isExpanded ? (
            <CaretDown size={11} weight="bold" aria-hidden="true" />
          ) : (
            <CaretRight size={11} weight="bold" aria-hidden="true" />
          )}
        </span>
      )}
      renderItem={({ item, depth, children, title, arrow, context }) => {
        const folderId = item.data.folderId;
        if (!folderId) return null;

        const { className: liClassName, ...liProps } = context.itemContainerWithChildrenProps as HTMLAttributes<HTMLLIElement>;
        const { className: rowClassName, style: rowStyle, ...rowProps } = context.itemContainerWithoutChildrenProps as HTMLAttributes<HTMLDivElement>;
        const {
          className: buttonClassName,
          ...interactiveProps
        } = context.interactiveElementProps as ButtonHTMLAttributes<HTMLButtonElement>;
        const selected = selectedFolderId === folderId;
        const hasChildren = Boolean(item.children?.length);

        return (
          <li {...liProps} className={cn("list-none", liClassName)}>
            <div
              {...rowProps}
              data-library-folder-tree-row="true"
              className={cn("relative flex items-center gap-0.5 py-0", WORKSHOP_TREE_ROW_MIN_HEIGHT_CLASS, rowClassName)}
              style={rowStyle}
            >
              <div className="min-w-0 flex-1">
                <WorkshopTreeRow
                  {...interactiveProps}
                  type="button"
                  role="treeitem"
                  aria-label={item.data.label}
                  aria-selected={selected}
                  aria-expanded={hasChildren ? context.isExpanded : undefined}
                  data-library-folder-node-id={item.index}
                  depth={depth}
                  selected={selected}
                  contextMenuGroups={createActionGroups(item, hasChildren, Boolean(context.isExpanded))}
                  className={cn("relative justify-start gap-0 focus-visible:ring-[#c8d2df] focus-visible:ring-offset-2", buttonClassName)}
                >
                  {arrow}
                  {title}
                </WorkshopTreeRow>
              </div>
            </div>
            {children}
          </li>
        );
      }}
    >
      <Tree treeId={LIBRARY_FOLDER_TREE_ID} rootItem={LIBRARY_FOLDER_TREE_ROOT_ITEM_ID} treeLabel="Library folders" />
    </ControlledTreeEnvironment>
  );
}

function ComponentViewControls({
  mode,
  onModeChange,
}: {
  mode: ComponentViewMode;
  onModeChange: (mode: ComponentViewMode) => void;
}) {
  return (
    <div className="border-b border-hairline bg-white px-2 py-1">
      <div role="group" aria-label="Component view mode" className="grid grid-cols-2 gap-1 rounded-md bg-surfaceMuted p-0.5">
        {COMPONENT_VIEW_MODES.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={mode === item.id}
            onClick={() => onModeChange(item.id)}
            className={cn(
              "h-6 rounded-sm px-2 text-[9px] font-bold leading-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
              mode === item.id ? "bg-white text-ink shadow-sm" : "text-tertiary hover:bg-white/70 hover:text-ink",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ComponentLibraryTreePanel({
  supplierNodes,
  selectedNodeId,
  folderNodes,
  folders,
  selectedFolderId,
  viewMode,
  reorderStatus,
  treeMutationPending,
  onSelectNode,
  onSelectFolder,
  onViewModeChange,
  onFoldersChange,
  onReorderStatus,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
}: {
  supplierNodes: LibraryTreeNode[];
  selectedNodeId: string;
  folderNodes: LibraryFolderTreeNode[];
  folders: LibraryFolderRecord[];
  selectedFolderId: string | null;
  viewMode: ComponentViewMode;
  reorderStatus: ReorderStatus;
  treeMutationPending: boolean;
  onSelectNode: (nodeId: string) => void;
  onSelectFolder: (folderId: string) => void;
  onViewModeChange: (mode: ComponentViewMode) => void;
  onFoldersChange: (folders: LibraryFolderRecord[]) => void;
  onReorderStatus: (status: ReorderStatus) => void;
  onCreateFolder: (parentId: string | null) => void;
  onRenameFolder: (folderId: string, currentName: string) => void;
  onDeleteFolder: (folderId: string, currentName: string) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const filteredNodes = filterTree(supplierNodes, searchQuery);
  const [expandedNodeIds, setExpandedNodeIds] = useState(() => getAllNodeIds(supplierNodes));
  const isFolderMode = viewMode === "default";

  function toggleNode(nodeId: string) {
    setExpandedNodeIds((current) =>
      current.includes(nodeId) ? current.filter((id) => id !== nodeId) : [...current, nodeId],
    );
  }

  return (
    <ResizableSidePanel
      side="right"
      ariaLabel="Component library tree"
      storageKey="component_library_tree_width"
      defaultWidth={272}
      minWidth={216}
      maxWidth={432}
      widthOffset={COMPONENT_LIBRARY_TREE_WIDTH_OFFSET}
    >
      <div className="flex h-full flex-col overflow-hidden border-l border-hairline bg-white" data-component-library-tree-panel="true">
        <div className="sticky top-0 z-20 shrink-0 bg-white">
          <SearchInput
            placeholder={isFolderMode ? "Search Library Folders" : "Search Library Tree"}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onClear={() => setSearchQuery("")}
            aria-label="Search component library tree"
            wrapperClassName="w-full"
          />
          <HeaderIconToolbar
            ariaLabel="Component tree tools"
            labelPrefix={isFolderMode ? "library folder" : "component tree"}
            onExpandAll={() => {
              if (!isFolderMode) setExpandedNodeIds(getAllNodeIds(supplierNodes));
            }}
            onCollapseAll={() => {
              if (!isFolderMode) setExpandedNodeIds([]);
            }}
            addActions={[
              {
                label: "Add library folder",
                visibleLabel: "Add folder",
                icon: <FolderActionIcon />,
                onClick: () => onCreateFolder(selectedFolderId),
                disabled: !isFolderMode || treeMutationPending,
              },
            ]}
          />
          <WorkshopTreeTabs
            tabs={LIBRARY_TABS}
            activeTab="components"
            ariaLabel="Library views"
          />
          <ComponentViewControls mode={viewMode} onModeChange={onViewModeChange} />
          {reorderStatus.state !== "idle" ? (
            <div
              role="status"
              aria-live="polite"
              className={cn(
                "border-b border-hairline px-2 py-1 text-[10px] leading-4",
                reorderStatus.state === "error" ? "text-red-700" : "text-tertiary",
              )}
            >
              {reorderStatus.message}
            </div>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-2">
          <div className="h-6" />
          {isFolderMode ? (
            <LibraryFolderTree
              folders={folders}
              nodes={folderNodes}
              selectedFolderId={selectedFolderId}
              searchQuery={searchQuery}
              disabled={treeMutationPending}
              onSelectFolder={onSelectFolder}
              onFoldersChange={onFoldersChange}
              onReorderStatus={onReorderStatus}
              onCreateFolder={onCreateFolder}
              onRenameFolder={onRenameFolder}
              onDeleteFolder={onDeleteFolder}
            />
          ) : filteredNodes.length > 0 ? (
            <LibraryTree
              nodes={filteredNodes}
              selectedNodeId={selectedNodeId}
              expandedNodeIds={expandedNodeIds}
              searchQuery={searchQuery}
              onSelect={(nodeId) => onSelectNode(nodeId)}
              onToggle={toggleNode}
            />
          ) : (
            <div className="rounded-md border border-dashed border-hairline bg-surfaceMuted p-2 text-[10px] leading-4 text-tertiary">
              No tree matches for &quot;{searchQuery}&quot;.
            </div>
          )}
        </div>
      </div>
    </ResizableSidePanel>
  );
}

function ComponentLibrarySheet({
  selectedFolderNode,
  selectedSupplierNode,
  viewMode,
  libraryItems,
  categoryTree,
  suppliers,
}: {
  selectedFolderNode: LibraryFolderTreeNode | null;
  selectedSupplierNode: LibraryTreeNode | null;
  viewMode: ComponentViewMode;
  libraryItems: EstimateRowItem[];
  categoryTree: ComponentLibraryTaxonomyNode[];
  suppliers: ComponentLibrarySupplierOption[];
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const sheetItems = useMemo(() => {
    if (viewMode === "suppliers") {
      if (!selectedSupplierNode || selectedSupplierNode.id === "all-suppliers") return getSupplierBackedItems(libraryItems);
      return getLibraryItemsForTreeNode("suppliers", selectedSupplierNode.id, libraryItems, [], [], { categoryTree, suppliers });
    }

    return selectedFolderNode ? getLibraryItemsForFolderNode(selectedFolderNode, libraryItems) : libraryItems;
  }, [categoryTree, libraryItems, selectedFolderNode, selectedSupplierNode, suppliers, viewMode]);
  const visibleItems = useMemo(
    () => sheetItems.filter((item) => itemMatchesSheetQuery(item, searchQuery)),
    [searchQuery, sheetItems],
  );
  const selectedLabel = viewMode === "suppliers"
    ? selectedSupplierNode?.label ?? "All Suppliers"
    : selectedFolderNode?.label ?? "Components";

  return (
    <section
      id="component-library-sheet-center-column"
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white !text-[10px]"
      data-component-library-sheet="true"
      aria-label="Component sheet"
    >
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur" aria-label="Component sheet controls">
        <div className="flex h-[38px] items-center">
          <SearchInput
            wrapperClassName="w-full"
            placeholder="Search Component Sheet"
            aria-label="Search component sheet"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onClear={() => setSearchQuery("")}
          />
        </div>
        <HeaderIconToolbar ariaLabel="Component sheet tools" labelPrefix="component sheet" addActions={[]} />
        <div className="flex h-[32px] items-end gap-0 border-b border-hairline bg-surfaceMuted" role="tablist" aria-label="Component sheet tabs">
          <button
            type="button"
            role="tab"
            aria-selected={true}
            className={cn(
              "relative h-full rounded-t-md border border-b-0 px-3 text-[10px] font-bold leading-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
              "z-10 -mb-px border-hairline bg-white text-ink",
            )}
          >
            {selectedLabel}
          </button>
          <span className="self-center px-2 text-[9px] font-bold text-tertiary">
            {visibleItems.length} / {sheetItems.length}
          </span>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-auto p-2">
        {visibleItems.length > 0 ? (
          <ul className="space-y-1" aria-label={`${selectedLabel} component rows`}>
            {visibleItems.map((item) => (
              <li
                key={item.id}
                className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 border-b border-hairline px-2 py-1.5 last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-[10px] font-bold leading-4 text-ink">{getComponentName(item)}</p>
                  <p className="truncate text-[9px] font-semibold leading-3 text-tertiary">
                    {item.supplier || "No supplier"} / {item.category}
                  </p>
                </div>
                <span className="font-mono text-[10px] font-bold tabular-nums text-ink">
                  {pesoFormatter.format(getComponentPrice(item))}
                </span>
                <span className="text-[9px] font-semibold text-tertiary">/{item.unit}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex h-full items-center justify-center bg-white p-2 text-center">
            <div>
              <SquaresFour size={18} weight="bold" className="mx-auto mb-2 text-tertiary" aria-hidden="true" />
              <p className="text-[11px] font-bold leading-4 text-ink">{selectedLabel}</p>
              <p className="mt-0.5 max-w-56 text-[9px] leading-4 text-tertiary">
                {searchQuery ? `No components match "${searchQuery}".` : "No components in this view yet."}
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function ComponentLibrarySheetPanel({
  selectedFolderNode,
  selectedSupplierNode,
  viewMode,
  libraryItems,
  categoryTree,
  suppliers,
}: {
  selectedFolderNode: LibraryFolderTreeNode | null;
  selectedSupplierNode: LibraryTreeNode | null;
  viewMode: ComponentViewMode;
  libraryItems: EstimateRowItem[];
  categoryTree: ComponentLibraryTaxonomyNode[];
  suppliers: ComponentLibrarySupplierOption[];
}) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1" data-component-library-sheet-panel="true">
      <ComponentLibrarySheet
        selectedFolderNode={selectedFolderNode}
        selectedSupplierNode={selectedSupplierNode}
        viewMode={viewMode}
        libraryItems={libraryItems}
        categoryTree={categoryTree}
        suppliers={suppliers}
      />
    </div>
  );
}

export function ComponentLibraryManager({
  categoryTree = componentCategoryTree,
  suppliers = [],
  libraryFolders,
  libraryItems = estimateLibraryItems,
}: {
  categoryTree?: ComponentLibraryTaxonomyNode[];
  suppliers?: ComponentLibrarySupplierOption[];
  libraryFolders?: LibraryFolderRecord[];
  libraryItems?: EstimateRowItem[];
} = {}) {
  const fallbackFolders = useMemo(() => buildFallbackLibraryFolders(categoryTree), [categoryTree]);
  const normalizedPropFolders = useMemo(
    () => normalizeLibraryFolderRecords(libraryFolders?.length ? libraryFolders : fallbackFolders),
    [fallbackFolders, libraryFolders],
  );
  const initialSelectedFolderId = useMemo(() => getFirstFolderId(buildLibraryFolderTree(normalizedPropFolders)), [normalizedPropFolders]);
  const [localFolders, setLocalFolders] = useState<LibraryFolderRecord[]>(normalizedPropFolders);
  const [viewMode, setViewMode] = useState<ComponentViewMode>("default");
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(initialSelectedFolderId);
  const [selectedSupplierNodeId, setSelectedSupplierNodeId] = useState("all-suppliers");
  const [reorderStatus, setReorderStatus] = useState<ReorderStatus>({ state: "idle" });
  const [isTreeMutationPending, startTreeMutation] = useTransition();

  const folderNodes = useMemo(() => buildLibraryFolderTree(localFolders), [localFolders]);
  const firstFolderId = useMemo(() => getFirstFolderId(folderNodes), [folderNodes]);

  const supplierTree = useMemo(
    () => buildComponentLibraryNavigationTree("suppliers", libraryItems, [], [], { categoryTree, suppliers }),
    [categoryTree, libraryItems, suppliers],
  );
  const selectedSupplierNode = useMemo(() => findNode(supplierTree, selectedSupplierNodeId) ?? supplierTree[0] ?? null, [selectedSupplierNodeId, supplierTree]);
  const selectedFolderNode = useMemo(() => (
    findFolderNode(folderNodes, selectedFolderId) ?? findFolderNode(folderNodes, firstFolderId)
  ), [firstFolderId, folderNodes, selectedFolderId]);
  const effectiveSelectedFolderId = selectedFolderNode?.folderId ?? null;

  function selectFolder(folderId: string) {
    setSelectedFolderId(folderId);
  }

  function selectSupplierNode(nodeId: string) {
    setSelectedSupplierNodeId(nodeId);
  }

  function createFolder(parentId: string | null) {
    const name = window.prompt("Folder name");
    if (!name?.trim()) return;
    startTreeMutation(async () => {
      setReorderStatus({ state: "saving", message: "Creating folder..." });
      try {
        const result = await createLibraryFolder(parentId, name);
        const folder = normalizeLibraryFolderRecords([result.folder as LibraryFolderRecord])[0];
        setLocalFolders((current) => [...current, folder]);
        selectFolder(folder.id);
        setReorderStatus({ state: "saved", message: "Folder created." });
      } catch (error) {
        setReorderStatus({ state: "error", message: error instanceof Error ? error.message : "Could not create folder." });
      }
    });
  }

  function renameFolder(folderId: string, currentName: string) {
    const name = window.prompt("Folder name", currentName);
    if (!name?.trim() || name.trim() === currentName) return;
    startTreeMutation(async () => {
      setReorderStatus({ state: "saving", message: "Renaming folder..." });
      try {
        const result = await renameLibraryFolder(folderId, name);
        const folder = normalizeLibraryFolderRecords([result.folder as LibraryFolderRecord])[0];
        setLocalFolders((current) => current.map((entry) => (entry.id === folder.id ? { ...entry, name: folder.name } : entry)));
        setReorderStatus({ state: "saved", message: "Folder renamed." });
      } catch (error) {
        setReorderStatus({ state: "error", message: error instanceof Error ? error.message : "Could not rename folder." });
      }
    });
  }

  function deleteFolder(folderId: string, currentName: string) {
    if (!window.confirm(`Delete "${currentName}"? Row items assigned to it will stay in the library without a folder.`)) return;
    startTreeMutation(async () => {
      setReorderStatus({ state: "saving", message: "Deleting folder..." });
      try {
        await deleteLibraryFolder(folderId);
        const deletedParentId = localFolders.find((folder) => folder.id === folderId)?.parent_id ?? null;
        setLocalFolders((current) => planLibraryFolderDelete(current, folderId)?.nextFolders ?? current.filter((folder) => folder.id !== folderId));
        if (selectedFolderId === folderId) {
          setSelectedFolderId(deletedParentId);
        }
        setReorderStatus({ state: "saved", message: "Folder deleted." });
      } catch (error) {
        setReorderStatus({ state: "error", message: error instanceof Error ? error.message : "Could not delete folder." });
      }
    });
  }

  return (
    <div className="flex h-full min-h-0 overflow-hidden rounded-xl border border-hairline bg-white" data-component-library-workspace="true">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-canvas">
        <div
          className="relative h-10 shrink-0 border-b border-hairline bg-white"
          data-workshop-layout="component-library-workspace-header-row"
        >
          <div
            className="absolute inset-y-0 left-0 right-0 flex min-w-0 items-center"
            data-component-library-center-header="true"
          />
        </div>

        <section className="flex h-full min-h-0 overflow-hidden bg-white" aria-label="Component library workspace">
          <ComponentLibrarySheetPanel
            selectedFolderNode={selectedFolderNode}
            selectedSupplierNode={selectedSupplierNode}
            viewMode={viewMode}
            libraryItems={libraryItems}
            categoryTree={categoryTree}
            suppliers={suppliers}
          />
          <ComponentLibraryTreePanel
            key={viewMode}
            supplierNodes={supplierTree}
            selectedNodeId={selectedSupplierNodeId}
            folderNodes={folderNodes}
            folders={localFolders}
            selectedFolderId={effectiveSelectedFolderId}
            viewMode={viewMode}
            reorderStatus={reorderStatus}
            treeMutationPending={isTreeMutationPending}
            onSelectNode={selectSupplierNode}
            onSelectFolder={selectFolder}
            onViewModeChange={setViewMode}
            onFoldersChange={setLocalFolders}
            onReorderStatus={setReorderStatus}
            onCreateFolder={createFolder}
            onRenameFolder={renameFolder}
            onDeleteFolder={deleteFolder}
          />
        </section>
      </div>
    </div>
  );
}
