"use client";

import {
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
  useCallback,
  useMemo,
  useState,
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
import { CaretDown, CaretRight, FolderSimple, Package } from "@phosphor-icons/react/dist/ssr";

import type { ActionMenuGroup } from "@/components/ui/action-menu";
import { HeaderIconToolbar, type HeaderIconToolbarAddAction } from "@/components/ui/header-icon-toolbar";
import { SearchInput } from "@/components/ui/search-input";
import { WorkshopTreeRow, WorkshopTreeTabs } from "@/components/workshop/workshop-tree";
import {
  WORKSHOP_TREE_ICON_SLOT_CLASS,
  WORKSHOP_TREE_ROW_GAP_CLASS,
  WORKSHOP_TREE_ROW_MIN_HEIGHT_CLASS,
} from "@/components/workshop/tree-visual-style";
import { reorderLibraryFolders } from "@/lib/component-library/actions";
import {
  evaluateLibraryFolderDrop,
  LIBRARY_FOLDER_TREE_ID,
  LIBRARY_FOLDER_TREE_ROOT_ITEM_ID,
  toLibraryFolderTreeItemId,
  type LibraryFolderRecord,
  type LibraryFolderTreeNode,
} from "@/lib/component-library/library-folder-reorder";
import type { EstimateRowItem } from "@/lib/estimates/types";
import { cn } from "@/lib/ui/cn";
import { buildLibraryTreeWithComponentRows, filterTree, getAllNodeIds, LibraryTree } from "../component-library/tree";
import { getComponentName, getComponentPrice, pesoFormatter } from "../component-library/helpers";
import type { LibraryTreeNode } from "../component-library/tree/types";

const LIBRARY_TABS = [{ id: "components", label: "Components" }] as const;
const COMPONENT_VIEW_MODES = [
  { id: "default", label: "Default" },
  { id: "suppliers", label: "Suppliers" },
  { id: "brand", label: "Brand" },
] as const;

export const ALL_COMPONENTS_FOLDER_ID = "all-components";

export type ComponentViewMode = (typeof COMPONENT_VIEW_MODES)[number]["id"];

export type CreateLibraryFolderHandler = (
  parentId: string | null,
  options?: { onCreated?: (folder: LibraryFolderRecord) => void; placement?: "top" | "bottom" },
) => void;

export type ReorderStatus =
  | { state: "idle" }
  | { state: "saving"; message: string }
  | { state: "saved"; message: string }
  | { state: "error"; message: string };

type LibraryFolderTreeItemData = {
  kind: "folder" | "component";
  folderId: string | null;
  label: string;
  item?: EstimateRowItem;
  parentFolderId?: string;
};

type LibraryFolderTreeModel = {
  items: Record<TreeItemIndex, TreeItem<LibraryFolderTreeItemData>>;
  folderItemIds: TreeItemIndex[];
};

function normalizeLabel(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function folderMatchesQuery(node: LibraryFolderTreeNode, query: string): boolean {
  const normalizedQuery = normalizeLabel(query);
  if (!normalizedQuery) return true;
  return normalizeLabel(node.label).includes(normalizedQuery);
}

function itemMatchesQuery(item: EstimateRowItem, query: string): boolean {
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

function normalizeOptionTreeKey(value: string): string {
  return normalizeLabel(value).replace(/\s+/g, "-");
}

function toSupplierTreeNodeId(supplierId: string) {
  return supplierId.startsWith("supplier-") ? supplierId : `supplier-${supplierId}`;
}

function toBrandTreeNodeId(brandId: string) {
  return brandId.startsWith("brand-") ? brandId : `brand-${brandId}`;
}

function stripTreeNodePrefix(nodeId: string, prefix: string) {
  return nodeId.startsWith(prefix) ? nodeId.slice(prefix.length) : nodeId;
}

function ensureSelectedOption(
  options: Array<{ id: string; name: string }>,
  selectedId: string | null | undefined,
  selectedName: string | null | undefined,
  syntheticPrefix: "supplier" | "brand",
) {
  const trimmedName = selectedName?.trim();
  if (!trimmedName) return options;
  if (selectedId && options.some((option) => option.id === selectedId)) return options;
  const normalizedName = normalizeOptionTreeKey(trimmedName);
  if (options.some((option) => normalizeOptionTreeKey(option.name) === normalizedName)) return options;
  return [
    ...options,
    {
      id: `${syntheticPrefix}-${normalizedName}`,
      name: trimmedName,
    },
  ];
}

function filterFolderTree(
  nodes: LibraryFolderTreeNode[],
  query: string,
  itemsByFolderId: Map<string, EstimateRowItem[]>,
): LibraryFolderTreeNode[] {
  if (!query.trim()) return nodes;
  return nodes.flatMap((node) => {
    const children = filterFolderTree(node.children ?? [], query, itemsByFolderId);
    const hasMatchingItems = (itemsByFolderId.get(node.folderId) ?? []).some((item) => itemMatchesQuery(item, query));
    if (folderMatchesQuery(node, query) || children.length > 0 || hasMatchingItems) {
      return [{ ...node, children }];
    }
    return [];
  });
}

export function getAllFolderTreeItemIds(nodes: LibraryFolderTreeNode[]): TreeItemIndex[] {
  return nodes.flatMap((node) => [node.id, ...getAllFolderTreeItemIds(node.children ?? [])]);
}

function toLibraryComponentTreeItemId(folderId: string, itemId: string) {
  return `component:${folderId}:${itemId}`;
}

function buildComponentItemsByFolderId(nodes: LibraryFolderTreeNode[], libraryItems: EstimateRowItem[]) {
  const folderIds = new Set<string>();
  const folderIdBySourceCategoryNodeId = new Map<string, string>();

  function visit(node: LibraryFolderTreeNode) {
    folderIds.add(node.folderId);
    if (node.sourceCategoryNodeId && !folderIdBySourceCategoryNodeId.has(node.sourceCategoryNodeId)) {
      folderIdBySourceCategoryNodeId.set(node.sourceCategoryNodeId, node.folderId);
    }
    node.children?.forEach(visit);
  }

  nodes.forEach(visit);

  const itemsByFolderId = new Map<string, EstimateRowItem[]>();
  for (const item of libraryItems) {
    const folderId = item.libraryFolderId && folderIds.has(item.libraryFolderId)
      ? item.libraryFolderId
      : item.categoryNodeId
        ? folderIdBySourceCategoryNodeId.get(item.categoryNodeId)
        : undefined;

    if (!folderId) continue;
    const folderItems = itemsByFolderId.get(folderId) ?? [];
    folderItems.push(item);
    itemsByFolderId.set(folderId, folderItems);
  }

  for (const folderItems of itemsByFolderId.values()) {
    folderItems.sort((left, right) => getComponentName(left).localeCompare(getComponentName(right)));
  }

  return itemsByFolderId;
}

export function isAllComponentsFolderId(folderId: string | null | undefined) {
  return folderId === ALL_COMPONENTS_FOLDER_ID;
}

function withAllComponentsRoot(nodes: LibraryFolderTreeNode[]): LibraryFolderTreeNode[] {
  return [
    {
      id: toLibraryFolderTreeItemId(ALL_COMPONENTS_FOLDER_ID),
      folderId: ALL_COMPONENTS_FOLDER_ID,
      label: "All Components",
      parentId: null,
      sortOrder: 0,
      sourceCategoryNodeId: null,
      folderKind: "custom",
      children: nodes,
    },
  ];
}

function filterComponentItemsByFolderId(itemsByFolderId: Map<string, EstimateRowItem[]>, query: string) {
  if (!query.trim()) return itemsByFolderId;

  const filtered = new Map<string, EstimateRowItem[]>();
  for (const [folderId, items] of itemsByFolderId.entries()) {
    const matchingItems = items.filter((item) => itemMatchesQuery(item, query));
    if (matchingItems.length > 0) filtered.set(folderId, matchingItems);
  }
  return filtered;
}

function buildFolderTreeModel(nodes: LibraryFolderTreeNode[], itemsByFolderId: Map<string, EstimateRowItem[]>): LibraryFolderTreeModel {
  const items: Record<TreeItemIndex, TreeItem<LibraryFolderTreeItemData>> = {
    [LIBRARY_FOLDER_TREE_ROOT_ITEM_ID]: {
      index: LIBRARY_FOLDER_TREE_ROOT_ITEM_ID,
      isFolder: true,
      canMove: false,
      children: nodes.map((node) => node.id),
      data: { kind: "folder", folderId: null, label: "Library folders" },
    },
  };
  const folderItemIds: TreeItemIndex[] = [];

  function visit(node: LibraryFolderTreeNode) {
    folderItemIds.push(node.id);
    const isSyntheticRoot = isAllComponentsFolderId(node.folderId);
    const componentItems = isSyntheticRoot ? [] : (itemsByFolderId.get(node.folderId) ?? []);
    const componentItemIds = componentItems.map((item) => toLibraryComponentTreeItemId(node.folderId, item.id));
    items[node.id] = {
      index: node.id,
      isFolder: true,
      canMove: !isSyntheticRoot,
      children: [...(node.children?.map((child) => child.id) ?? []), ...componentItemIds],
      data: { kind: "folder", folderId: node.folderId, label: node.label },
    };
    for (const item of componentItems) {
      const itemId = toLibraryComponentTreeItemId(node.folderId, item.id);
      items[itemId] = {
        index: itemId,
        isFolder: false,
        canMove: false,
        children: [],
        data: {
          kind: "component",
          folderId: null,
          parentFolderId: node.folderId,
          label: getComponentName(item),
          item,
        },
      };
    }
    node.children?.forEach(visit);
  }

  nodes.forEach(visit);
  return { items, folderItemIds };
}

export function FolderActionIcon() {
  return <FolderSimple size={12} weight="bold" aria-hidden="true" />;
}

export function ComponentViewControls({
  mode,
  ariaLabel,
  onModeChange,
}: {
  mode: ComponentViewMode;
  ariaLabel: string;
  onModeChange: (mode: ComponentViewMode) => void;
}) {
  return (
    <div className="border-b border-hairline bg-white px-2 py-1.5">
      <div className="mb-1 text-[8px] font-bold uppercase leading-3 tracking-[0.06em] text-tertiary">View By</div>
      <div role="group" aria-label={ariaLabel} className="grid grid-cols-3 gap-1 rounded-md bg-surfaceMuted p-0.5">
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

type LibraryFolderTreeProps = {
  folders: LibraryFolderRecord[];
  nodes: LibraryFolderTreeNode[];
  libraryItems?: EstimateRowItem[];
  selectedFolderId: string | null;
  searchQuery: string;
  disabled: boolean;
  onSelectFolder: (folderId: string) => void;
  onFoldersChange: (folders: LibraryFolderRecord[]) => void;
  onReorderStatus: (status: ReorderStatus) => void;
  onCreateFolder: (parentId: string | null) => void;
  onRenameFolder: (folderId: string, currentName: string) => void;
  onDeleteFolder: (folderId: string, currentName: string) => void;
  expandedItemIds?: TreeItemIndex[];
  onExpandedItemIdsChange?: (itemIds: TreeItemIndex[]) => void;
  enableFolderActions?: boolean;
  enableDragAndDrop?: boolean;
  selectedTitleOnly?: boolean;
};

export function LibraryFolderTree({
  folders,
  nodes,
  libraryItems = [],
  selectedFolderId,
  searchQuery,
  disabled,
  onSelectFolder,
  onFoldersChange,
  onReorderStatus,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  expandedItemIds: controlledExpandedItemIds,
  onExpandedItemIdsChange,
  enableFolderActions = true,
  enableDragAndDrop = true,
  selectedTitleOnly = false,
}: LibraryFolderTreeProps) {
  const componentItemsByFolderId = useMemo(() => buildComponentItemsByFolderId(nodes, libraryItems), [libraryItems, nodes]);
  const filteredComponentItemsByFolderId = useMemo(
    () => filterComponentItemsByFolderId(componentItemsByFolderId, searchQuery),
    [componentItemsByFolderId, searchQuery],
  );
  const filteredNodes = useMemo(
    () => filterFolderTree(nodes, searchQuery, filteredComponentItemsByFolderId),
    [filteredComponentItemsByFolderId, nodes, searchQuery],
  );
  const treeModel = useMemo(() => buildFolderTreeModel(filteredNodes, filteredComponentItemsByFolderId), [filteredComponentItemsByFolderId, filteredNodes]);
  const [internalExpandedItemIds, setInternalExpandedItemIds] = useState<TreeItemIndex[]>(() => getAllFolderTreeItemIds(nodes));
  const expandedItemIds = controlledExpandedItemIds ?? internalExpandedItemIds;
  const setExpandedItemIds = useCallback((update: TreeItemIndex[] | ((current: TreeItemIndex[]) => TreeItemIndex[])) => {
    const next = typeof update === "function" ? update(expandedItemIds) : update;
    if (onExpandedItemIdsChange) {
      onExpandedItemIdsChange(next);
    } else {
      setInternalExpandedItemIds(next);
    }
  }, [expandedItemIds, onExpandedItemIdsChange]);
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
    enableDragAndDrop &&
    !disabled &&
    items.length === 1 &&
    items[0]?.data.kind === "folder" &&
    Boolean(items[0]?.data.folderId) &&
    !isAllComponentsFolderId(items[0]?.data.folderId)
  ), [disabled, enableDragAndDrop]);

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
    const isSyntheticRoot = isAllComponentsFolderId(folderId);
    const createParentId = isSyntheticRoot ? null : folderId;
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
          ...(enableFolderActions
            ? [
                {
                  id: "add-folder",
                  label: "Add folder",
                  disabled,
                  disabledReason: disabled ? "Finish the current folder save before creating another folder." : undefined,
                  onSelect: () => onCreateFolder(createParentId),
                },
                ...(!isSyntheticRoot
                  ? [
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
                        tone: "destructive" as const,
                        disabled: disabled || !folderId,
                        disabledReason: disabled ? "Finish the current folder save before deleting another folder." : undefined,
                        onSelect: () => {
                          if (folderId) onDeleteFolder(folderId, item.data.label);
                        },
                      },
                    ]
                  : []),
              ]
            : []),
        ],
      },
    ];
  }, [disabled, enableFolderActions, onCreateFolder, onDeleteFolder, onRenameFolder, onSelectFolder, setExpandedItemIds]);

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
      canDragAndDrop={enableDragAndDrop}
      canReorderItems={enableDragAndDrop}
      canDropOnFolder={enableDragAndDrop}
      canDropOnNonFolder={false}
      canDropBelowOpenFolders={enableDragAndDrop}
      canDrag={canDrag}
      canDropAt={canDropAt}
      onDrop={handleDrop}
      onPrimaryAction={(item) => {
        if (item.data.folderId) onSelectFolder(item.data.folderId);
        else if (item.data.parentFolderId) onSelectFolder(item.data.parentFolderId);
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
          <ol {...itemsContainerProps} className={cn(WORKSHOP_TREE_ROW_GAP_CLASS, className)}>
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
      renderItemArrow={({ item, context }) => {
        const { className, ...arrowProps } = context.arrowProps as HTMLAttributes<HTMLSpanElement>;
        if (!item.children?.length) {
          return (
            <span
              data-library-folder-arrow-spacer-id={String(item.index)}
              className={cn(WORKSHOP_TREE_ICON_SLOT_CLASS, className)}
              aria-hidden="true"
            />
          );
        }
        return (
          <span
            {...arrowProps}
            data-library-folder-arrow-id={String(item.index)}
            className={cn(WORKSHOP_TREE_ICON_SLOT_CLASS, "cursor-pointer transition hover:bg-surfaceMuted", className)}
          >
            {context.isExpanded ? (
              <CaretDown size={11} weight="bold" aria-hidden="true" />
            ) : (
              <CaretRight size={11} weight="bold" aria-hidden="true" />
            )}
          </span>
        );
      }}
      renderItem={({ item, depth, children, title, arrow, context }) => {
        if (item.data.kind === "component" && item.data.item) {
          const parentFolderId = item.data.parentFolderId;
          const componentItem = item.data.item;
          const componentName = getComponentName(componentItem);
          const componentPrice = getComponentPrice(componentItem);
          const { className: liClassName, ...liProps } = context.itemContainerWithChildrenProps as HTMLAttributes<HTMLLIElement>;
          delete (liProps as Record<string, unknown>).role;
          delete (liProps as Record<string, unknown>)["aria-selected"];
          const { className: rowClassName, style: rowStyle, ...rowProps } = context.itemContainerWithoutChildrenProps as HTMLAttributes<HTMLDivElement>;

          return (
            <li {...liProps} className={cn("list-none", liClassName)}>
              <div
                {...rowProps}
                data-library-component-tree-row="true"
                className={cn("relative flex items-center gap-0.5 py-0", WORKSHOP_TREE_ROW_MIN_HEIGHT_CLASS, rowClassName)}
                style={rowStyle}
              >
                <WorkshopTreeRow
                  as="div"
                  role="treeitem"
                  aria-label={componentName}
                  aria-selected={false}
                  data-library-component-item-id={componentItem.id}
                  depth={depth}
                  selected={false}
                  className="cursor-pointer gap-1.5"
                  onClick={() => {
                    if (parentFolderId) onSelectFolder(parentFolderId);
                  }}
                >
                  <Package size={12} weight="bold" className="shrink-0 text-tertiary" aria-hidden="true" />
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-[10px] font-semibold leading-4 text-ink">{componentName}</span>
                      <span className="truncate text-[9px] leading-3 text-tertiary">{componentItem.supplier || "No supplier"}</span>
                    </div>
                    <div className="flex shrink-0 flex-col items-end">
                      <span className="text-[9px] font-bold tabular-nums text-ink">{pesoFormatter.format(componentPrice)}</span>
                      <span className="text-[9px] text-tertiary">/{componentItem.unit}</span>
                    </div>
                  </div>
                </WorkshopTreeRow>
              </div>
            </li>
          );
        }

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
                  {selectedTitleOnly ? (
                    <>
                      <span className={cn("mr-1", WORKSHOP_TREE_ICON_SLOT_CLASS)} aria-hidden="true">
                        <FolderActionIcon />
                      </span>
                      <span className={cn("min-w-0 flex-1 truncate", selected ? "font-bold text-ink" : "font-normal text-ink")}>
                        {item.data.label}
                      </span>
                    </>
                  ) : (
                    title
                  )}
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

type LibraryFolderTreePickerProps = {
  folders: LibraryFolderRecord[];
  nodes: LibraryFolderTreeNode[];
  libraryItems?: EstimateRowItem[];
  selectedFolderId: string | null;
  viewMode?: ComponentViewMode;
  defaultViewMode?: ComponentViewMode;
  onViewModeChange?: (mode: ComponentViewMode) => void;
  suppliers?: Array<{ id: string; name: string }>;
  selectedSupplierId?: string | null;
  selectedSupplierName?: string | null;
  brands?: Array<{ id: string; name: string }>;
  selectedBrandId?: string | null;
  selectedBrandName?: string | null;
  onSelectFolder: (folderId: string) => void;
  onSelectSupplier?: (supplierId: string | null, supplierName?: string) => void;
  onSelectBrand?: (brandId: string | null, brandName?: string) => void;
  onCreateFolder?: CreateLibraryFolderHandler;
  onRenameFolder?: (folderId: string, currentName: string) => void;
  onDeleteFolder?: (folderId: string, currentName: string) => void;
  reorderStatus?: ReorderStatus;
  treeMutationPending?: boolean;
  className?: string;
};

type LibraryFolderTreeSurfaceProps = {
  className?: string;
  folders: LibraryFolderRecord[];
  folderNodes: LibraryFolderTreeNode[];
  libraryItems?: EstimateRowItem[];
  selectedFolderId: string | null;
  viewMode?: ComponentViewMode;
  defaultViewMode?: ComponentViewMode;
  onViewModeChange?: (mode: ComponentViewMode) => void;
  onSelectFolder: (folderId: string) => void;
  onFoldersChange?: (folders: LibraryFolderRecord[]) => void;
  onReorderStatus?: (status: ReorderStatus) => void;
  onCreateFolder?: CreateLibraryFolderHandler;
  onRenameFolder?: (folderId: string, currentName: string) => void;
  onDeleteFolder?: (folderId: string, currentName: string) => void;
  supplierNodes?: LibraryTreeNode[];
  selectedSupplierNodeId?: string;
  onSelectSupplierNode?: (nodeId: string) => void;
  suppliers?: Array<{ id: string; name: string }>;
  selectedSupplierId?: string | null;
  selectedSupplierName?: string | null;
  onSelectSupplier?: (supplierId: string | null, supplierName?: string) => void;
  brandNodes?: LibraryTreeNode[];
  selectedBrandNodeId?: string;
  onSelectBrandNode?: (nodeId: string) => void;
  brands?: Array<{ id: string; name: string }>;
  selectedBrandId?: string | null;
  selectedBrandName?: string | null;
  onSelectBrand?: (brandId: string | null, brandName?: string) => void;
  reorderStatus?: ReorderStatus;
  treeMutationPending?: boolean;
  enableFolderActions?: boolean;
  enableFolderDragAndDrop?: boolean;
  selectedTitleOnly?: boolean;
  showAllComponentsRoot?: boolean;
  bodyTopSpacer?: ReactNode;
  searchAriaLabel: string | ((mode: ComponentViewMode) => string);
  folderSearchPlaceholder: string;
  supplierSearchPlaceholder: string;
  brandSearchPlaceholder?: string;
  toolbarAriaLabel: string;
  toolbarLabelPrefix: string | ((mode: ComponentViewMode) => string);
  tabsAriaLabel: string;
  viewModeAriaLabel: string;
  noSupplierMatchesLabel?: string;
  noBrandMatchesLabel?: string;
};

function resolveModeValue(value: string | ((mode: ComponentViewMode) => string), mode: ComponentViewMode) {
  return typeof value === "function" ? value(mode) : value;
}

export function LibraryFolderTreeSurface({
  className,
  folders,
  folderNodes,
  libraryItems = [],
  selectedFolderId,
  viewMode: controlledViewMode,
  defaultViewMode = "default",
  onViewModeChange,
  onSelectFolder,
  onFoldersChange = () => undefined,
  onReorderStatus = () => undefined,
  onCreateFolder,
  onRenameFolder = () => undefined,
  onDeleteFolder = () => undefined,
  supplierNodes = [],
  selectedSupplierNodeId,
  onSelectSupplierNode,
  suppliers = [],
  selectedSupplierId,
  selectedSupplierName,
  onSelectSupplier,
  brandNodes = [],
  selectedBrandNodeId,
  onSelectBrandNode,
  brands = [],
  selectedBrandId,
  selectedBrandName,
  onSelectBrand,
  reorderStatus = { state: "idle" },
  treeMutationPending = false,
  enableFolderActions = true,
  enableFolderDragAndDrop = true,
  selectedTitleOnly = false,
  showAllComponentsRoot = true,
  bodyTopSpacer,
  searchAriaLabel,
  folderSearchPlaceholder,
  supplierSearchPlaceholder,
  brandSearchPlaceholder = "Search Brands",
  toolbarAriaLabel,
  toolbarLabelPrefix,
  tabsAriaLabel,
  viewModeAriaLabel,
  noSupplierMatchesLabel,
  noBrandMatchesLabel,
}: LibraryFolderTreeSurfaceProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [internalViewMode, setInternalViewMode] = useState<ComponentViewMode>(defaultViewMode);
  const viewMode = controlledViewMode ?? internalViewMode;
  const displayedFolderNodes = useMemo(
    () => (showAllComponentsRoot ? withAllComponentsRoot(folderNodes) : folderNodes),
    [folderNodes, showAllComponentsRoot],
  );
  const effectiveSelectedFolderId = showAllComponentsRoot ? (selectedFolderId ?? ALL_COMPONENTS_FOLDER_ID) : selectedFolderId;
  const [expandedFolderItemIds, setExpandedFolderItemIds] = useState<TreeItemIndex[]>(() => getAllFolderTreeItemIds(displayedFolderNodes));
  const [expandedSupplierNodeIds, setExpandedSupplierNodeIds] = useState(() => getAllNodeIds(supplierNodes));
  const [expandedBrandNodeIds, setExpandedBrandNodeIds] = useState(() => getAllNodeIds(brandNodes));
  const filteredSupplierNodes = filterTree(supplierNodes, searchQuery);
  const filteredBrandNodes = filterTree(brandNodes, searchQuery);
  const normalizedSearchQuery = normalizeLabel(searchQuery);
  const filteredSuppliers = suppliers.filter((supplier) => {
    if (!normalizedSearchQuery) return true;
    return normalizeLabel(supplier.name).includes(normalizedSearchQuery);
  });
  const filteredBrands = brands.filter((brand) => {
    if (!normalizedSearchQuery) return true;
    return normalizeLabel(brand.name).includes(normalizedSearchQuery);
  });
  const isFolderMode = viewMode === "default";
  const isBrandMode = viewMode === "brand";

  const changeViewMode = useCallback((nextMode: ComponentViewMode) => {
    if (controlledViewMode === undefined) setInternalViewMode(nextMode);
    onViewModeChange?.(nextMode);
  }, [controlledViewMode, onViewModeChange]);

  function toggleSupplierNode(nodeId: string) {
    setExpandedSupplierNodeIds((current) =>
      current.includes(nodeId) ? current.filter((id) => id !== nodeId) : [...current, nodeId],
    );
  }

  function toggleBrandNode(nodeId: string) {
    setExpandedBrandNodeIds((current) =>
      current.includes(nodeId) ? current.filter((id) => id !== nodeId) : [...current, nodeId],
    );
  }

  const handleCreateFolder = useCallback(() => {
    if (!onCreateFolder) return;
    const parentId = !effectiveSelectedFolderId || isAllComponentsFolderId(effectiveSelectedFolderId) ? null : effectiveSelectedFolderId;
    onCreateFolder(parentId, {
      placement: parentId ? "bottom" : "top",
      onCreated: (folder) => {
        changeViewMode("default");
        onSelectFolder(folder.id);
        setExpandedFolderItemIds((current) => {
          const expanded = new Set(current.map(String));
          if (parentId) expanded.add(toLibraryFolderTreeItemId(parentId));
          expanded.add(toLibraryFolderTreeItemId(folder.id));
          return Array.from(expanded);
        });
      },
    });
  }, [changeViewMode, effectiveSelectedFolderId, onCreateFolder, onSelectFolder, setExpandedFolderItemIds]);

  const addActions = useMemo<HeaderIconToolbarAddAction[]>(() => {
    if (!onCreateFolder) return [];
    return [
      {
        label: "Add library folder",
        icon: <FolderActionIcon />,
        onClick: handleCreateFolder,
        disabled: treeMutationPending,
      },
    ];
  }, [handleCreateFolder, onCreateFolder, treeMutationPending]);

  const supplierListTree = filteredSuppliers.length > 0 ? (
    <div role="tree" aria-label="Add component supplier tree" className={WORKSHOP_TREE_ROW_GAP_CLASS}>
      {filteredSuppliers.map((supplier) => {
        const selected = selectedSupplierId === supplier.id || (!selectedSupplierId && normalizeOptionTreeKey(selectedSupplierName ?? "") === normalizeOptionTreeKey(supplier.name));
        return (
          <button
            key={supplier.id}
            type="button"
            role="treeitem"
            aria-selected={selected}
            aria-label={supplier.name}
            onClick={() => onSelectSupplier?.(supplier.id, supplier.name)}
            className={cn(
              "flex min-h-7 w-full items-center gap-1 rounded-sm px-2 text-left text-[10px] leading-4 transition hover:bg-surfaceMuted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
              selected ? "bg-accentSoft font-bold text-ink" : "font-normal text-ink",
            )}
          >
            <span className={cn("mr-1", WORKSHOP_TREE_ICON_SLOT_CLASS)} aria-hidden="true">
              <FolderActionIcon />
            </span>
            <span className="min-w-0 flex-1 truncate">{supplier.name}</span>
          </button>
        );
      })}
    </div>
  ) : (
    <div className="rounded-md border border-dashed border-hairline bg-surfaceMuted p-2 text-[10px] leading-4 text-tertiary">
      {noSupplierMatchesLabel ?? "No suppliers match"} &quot;{searchQuery}&quot;.
    </div>
  );

  const supplierTree = supplierNodes.length > 0 ? (
    filteredSupplierNodes.length > 0 ? (
      <LibraryTree
        nodes={filteredSupplierNodes}
        selectedNodeId={selectedSupplierNodeId ?? ""}
        expandedNodeIds={expandedSupplierNodeIds}
        searchQuery={searchQuery}
        onSelect={(nodeId) => onSelectSupplierNode?.(nodeId)}
        onToggle={toggleSupplierNode}
        showItemAddAction={false}
      />
    ) : (
      <div className="rounded-md border border-dashed border-hairline bg-surfaceMuted p-2 text-[10px] leading-4 text-tertiary">
        No tree matches for &quot;{searchQuery}&quot;.
      </div>
    )
  ) : supplierListTree;

  const brandListTree = filteredBrands.length > 0 ? (
    <div role="tree" aria-label="Add component brand tree" className={WORKSHOP_TREE_ROW_GAP_CLASS}>
      {filteredBrands.map((brand) => {
        const selected = selectedBrandId === brand.id || (!selectedBrandId && normalizeOptionTreeKey(selectedBrandName ?? "") === normalizeOptionTreeKey(brand.name));
        return (
          <button
            key={brand.id}
            type="button"
            role="treeitem"
            aria-selected={selected}
            aria-label={brand.name}
            onClick={() => onSelectBrand?.(brand.id, brand.name)}
            className={cn(
              "flex min-h-7 w-full items-center gap-1 rounded-sm px-2 text-left text-[10px] leading-4 transition hover:bg-surfaceMuted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
              selected ? "bg-accentSoft font-bold text-ink" : "font-normal text-ink",
            )}
          >
            <span className={cn("mr-1", WORKSHOP_TREE_ICON_SLOT_CLASS)} aria-hidden="true">
              <FolderActionIcon />
            </span>
            <span className="min-w-0 flex-1 truncate">{brand.name}</span>
          </button>
        );
      })}
    </div>
  ) : (
    <div className="rounded-md border border-dashed border-hairline bg-surfaceMuted p-2 text-[10px] leading-4 text-tertiary">
      {noBrandMatchesLabel ?? "No brands match"} &quot;{searchQuery}&quot;.
    </div>
  );

  const brandTree = brandNodes.length > 0 ? (
    filteredBrandNodes.length > 0 ? (
      <LibraryTree
        nodes={filteredBrandNodes}
        selectedNodeId={selectedBrandNodeId ?? ""}
        expandedNodeIds={expandedBrandNodeIds}
        searchQuery={searchQuery}
        onSelect={(nodeId) => onSelectBrandNode?.(nodeId)}
        onToggle={toggleBrandNode}
        showItemAddAction={false}
      />
    ) : (
      <div className="rounded-md border border-dashed border-hairline bg-surfaceMuted p-2 text-[10px] leading-4 text-tertiary">
        No tree matches for &quot;{searchQuery}&quot;.
      </div>
    )
  ) : brandListTree;

  const treeSearchPlaceholder = isFolderMode ? folderSearchPlaceholder : isBrandMode ? brandSearchPlaceholder : supplierSearchPlaceholder;

  return (
    <div className={cn("flex h-full min-h-0 flex-col overflow-hidden bg-white", className)}>
      <div className="sticky top-0 z-20 shrink-0 bg-white">
        <SearchInput
          placeholder={treeSearchPlaceholder}
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          onClear={() => setSearchQuery("")}
          aria-label={resolveModeValue(searchAriaLabel, viewMode)}
          wrapperClassName="w-full"
        />
        <HeaderIconToolbar
          ariaLabel={toolbarAriaLabel}
          labelPrefix={resolveModeValue(toolbarLabelPrefix, viewMode)}
          onExpandAll={() => {
            if (isFolderMode) setExpandedFolderItemIds(getAllFolderTreeItemIds(displayedFolderNodes));
            else if (isBrandMode && brandNodes.length > 0) setExpandedBrandNodeIds(getAllNodeIds(brandNodes));
            else if (supplierNodes.length > 0) setExpandedSupplierNodeIds(getAllNodeIds(supplierNodes));
          }}
          onCollapseAll={() => {
            if (isFolderMode) setExpandedFolderItemIds([]);
            else if (isBrandMode && brandNodes.length > 0) setExpandedBrandNodeIds([]);
            else if (supplierNodes.length > 0) setExpandedSupplierNodeIds([]);
          }}
          addActions={addActions}
        />
        <WorkshopTreeTabs
          tabs={LIBRARY_TABS}
          activeTab="components"
          ariaLabel={tabsAriaLabel}
        />
        <ComponentViewControls mode={viewMode} ariaLabel={viewModeAriaLabel} onModeChange={changeViewMode} />
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
        {bodyTopSpacer}
        {isFolderMode ? (
          <LibraryFolderTree
            folders={folders}
            nodes={displayedFolderNodes}
            libraryItems={libraryItems}
            selectedFolderId={effectiveSelectedFolderId}
            searchQuery={searchQuery}
            disabled={treeMutationPending}
            expandedItemIds={expandedFolderItemIds}
            onExpandedItemIdsChange={setExpandedFolderItemIds}
            enableFolderActions={enableFolderActions}
            enableDragAndDrop={enableFolderDragAndDrop}
            selectedTitleOnly={selectedTitleOnly}
            onSelectFolder={onSelectFolder}
            onFoldersChange={onFoldersChange}
            onReorderStatus={onReorderStatus}
            onCreateFolder={onCreateFolder ?? (() => undefined)}
            onRenameFolder={onRenameFolder}
            onDeleteFolder={onDeleteFolder}
          />
        ) : isBrandMode ? (
          brandTree
        ) : (
          supplierTree
        )}
      </div>
    </div>
  );
}

export function LibraryFolderTreePicker({
  folders,
  nodes,
  libraryItems = [],
  selectedFolderId,
  viewMode,
  defaultViewMode,
  onViewModeChange,
  suppliers = [],
  selectedSupplierId,
  selectedSupplierName,
  brands = [],
  selectedBrandId,
  selectedBrandName,
  onSelectFolder,
  onSelectSupplier,
  onSelectBrand,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  reorderStatus,
  treeMutationPending,
  className,
}: LibraryFolderTreePickerProps) {
  const effectiveSuppliers = useMemo(
    () => ensureSelectedOption(suppliers, selectedSupplierId, selectedSupplierName, "supplier"),
    [selectedSupplierId, selectedSupplierName, suppliers],
  );
  const effectiveBrands = useMemo(
    () => ensureSelectedOption(brands, selectedBrandId, selectedBrandName, "brand"),
    [brands, selectedBrandId, selectedBrandName],
  );
  const supplierTreeNodes = useMemo(
    () => buildLibraryTreeWithComponentRows("suppliers", libraryItems, [], [], { suppliers: effectiveSuppliers }),
    [effectiveSuppliers, libraryItems],
  );
  const brandTreeNodes = useMemo(
    () => buildLibraryTreeWithComponentRows("brands", libraryItems, [], [], { brands: effectiveBrands }),
    [effectiveBrands, libraryItems],
  );
  const selectedSupplierForTree = selectedSupplierId
    ? effectiveSuppliers.find((supplier) => supplier.id === selectedSupplierId)
    : selectedSupplierName
      ? effectiveSuppliers.find((supplier) => normalizeOptionTreeKey(supplier.name) === normalizeOptionTreeKey(selectedSupplierName))
      : undefined;
  const selectedBrandForTree = selectedBrandId
    ? effectiveBrands.find((brand) => brand.id === selectedBrandId)
    : selectedBrandName
      ? effectiveBrands.find((brand) => normalizeOptionTreeKey(brand.name) === normalizeOptionTreeKey(selectedBrandName))
      : undefined;
  const selectedSupplierNodeId = selectedSupplierForTree ? toSupplierTreeNodeId(selectedSupplierForTree.id) : "all-suppliers";
  const selectedBrandNodeId = selectedBrandForTree ? toBrandTreeNodeId(selectedBrandForTree.id) : "all-brands";

  return (
    <LibraryFolderTreeSurface
      className={className}
      folders={folders}
      folderNodes={nodes}
      libraryItems={libraryItems}
      selectedFolderId={selectedFolderId}
      viewMode={viewMode}
      defaultViewMode={defaultViewMode}
      onViewModeChange={onViewModeChange}
      suppliers={effectiveSuppliers}
      selectedSupplierId={selectedSupplierId}
      selectedSupplierName={selectedSupplierName}
      supplierNodes={supplierTreeNodes}
      selectedSupplierNodeId={selectedSupplierNodeId}
      brands={effectiveBrands}
      selectedBrandId={selectedBrandId}
      selectedBrandName={selectedBrandName}
      brandNodes={brandTreeNodes}
      selectedBrandNodeId={selectedBrandNodeId}
      onSelectFolder={onSelectFolder}
      onSelectSupplier={onSelectSupplier}
      onSelectBrand={onSelectBrand}
      reorderStatus={reorderStatus}
      treeMutationPending={treeMutationPending}
      onSelectSupplierNode={(nodeId) => {
        const supplierId = stripTreeNodePrefix(nodeId, "supplier-");
        const supplier = effectiveSuppliers.find((entry) => entry.id === supplierId || toSupplierTreeNodeId(entry.id) === nodeId);
        if (!supplier || nodeId === "all-suppliers") return;
        const isSynthetic = supplier.id.startsWith("supplier-") && !suppliers.some((entry) => entry.id === supplier.id);
        onSelectSupplier?.(isSynthetic ? null : supplier.id, supplier.name);
      }}
      onSelectBrandNode={(nodeId) => {
        const brandId = stripTreeNodePrefix(nodeId, "brand-");
        const brand = effectiveBrands.find((entry) => entry.id === brandId || toBrandTreeNodeId(entry.id) === nodeId);
        if (!brand || nodeId === "all-brands") return;
        const isSynthetic = brand.id.startsWith("brand-") && !brands.some((entry) => entry.id === brand.id);
        onSelectBrand?.(isSynthetic ? null : brand.id, brand.name);
      }}
      onCreateFolder={onCreateFolder}
      onRenameFolder={onRenameFolder}
      onDeleteFolder={onDeleteFolder}
      enableFolderActions
      enableFolderDragAndDrop={false}
      showAllComponentsRoot={false}
      selectedTitleOnly
      searchAriaLabel={(mode) => (mode === "default" ? "Search add component library folders" : mode === "brand" ? "Search add component brands" : "Search add component suppliers")}
      folderSearchPlaceholder="Search Library Folders"
      supplierSearchPlaceholder="Search Suppliers"
      brandSearchPlaceholder="Search Brands"
      toolbarAriaLabel="Add component folder tools"
      toolbarLabelPrefix="add component folder"
      tabsAriaLabel="Add component folder views"
      viewModeAriaLabel="Add component view mode"
    />
  );
}
