"use client";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { CaretDown, CaretRight, Check, FolderSimple, Package, SquaresFour } from "@phosphor-icons/react/dist/ssr";

import { ContextActionMenuContent, type ActionMenuGroup } from "@/components/ui/action-menu";
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from "@/components/ui/context-menu";
import type { HeaderIconToolbarAddAction } from "@/components/ui/header-icon-toolbar";
import { TreePanelHeader } from "@/components/ui/tree-panel-header";
import { TREE_ROW_ICON_SIZE, Tree, type TreeDropPosition, type TreeNode as UiTreeNode } from "@/components/ui/tree";
import { TreeBulkActionBar } from "@/components/workshop/tree-row-affordances";
import { WORKSHOP_TREE_ICON_SLOT_CLASS, WORKSHOP_TREE_ROW_GAP_CLASS } from "@/components/workshop/tree-visual-style";
import { reorderLibraryFolders } from "@/lib/component-library/actions";
import {
  buildLibraryFolderReorderPlan,
  toLibraryFolderTreeItemId,
  type LibraryFolderRecord,
  type LibraryFolderReorderResult,
  type LibraryFolderTreeNode,
} from "@/lib/component-library/library-folder-reorder";
import { readProjectComponentProjectionMetadata } from "@/lib/estimates/express-components";
import type { EstimateRowItem } from "@/lib/estimates/types";
import { cn } from "@/lib/ui/cn";
import { WORKSHOP_TREE_VIRTUALIZATION } from "@/lib/workshop/virtualization-flags";
import {
  pruneSelection,
  toggleCascadeSelection,
  type TreeSelectionNode,
} from "@/lib/bulk-selection/tree-selection";
import { buildLibraryTreeWithComponentRows, filterTree, getAllNodeIds, LibraryTree } from "../component-library/tree";
import { getComponentName, getComponentPrice, pesoFormatter } from "../component-library/helpers";
import type { LibraryTreeNode } from "../component-library/tree/types";
import {
  ALL_COMPONENTS_FOLDER_ID,
  COMPONENT_VIEW_MODES,
  isAllComponentsFolderId,
  type ComponentViewMode,
  type CreateLibraryFolderHandler,
  type ReorderStatus,
} from "./library-folder-tree-shared";

export {
  ALL_COMPONENTS_FOLDER_ID,
  isAllComponentsFolderId,
  type ComponentViewMode,
  type CreateLibraryFolderHandler,
  type ReorderStatus,
} from "./library-folder-tree-shared";

/** Per-row domain payload carried on `UiTreeNode.data.folderTree`. */
type LibraryFolderTreeDatum =
  | { kind: "folder"; folderId: string; label: string; isSyntheticRoot: boolean }
  | { kind: "component"; item: EstimateRowItem; parentFolderId: string };

function getLibraryFolderTreeDatum(node: UiTreeNode | undefined): LibraryFolderTreeDatum | undefined {
  return node?.data?.folderTree as LibraryFolderTreeDatum | undefined;
}

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
    item.brand,
    item.category,
    item.unit,
    item.description,
    item.pricingSource,
    item.pricingDate,
    item.confidence,
    ...(item.categoryPath ?? []),
  ]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
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

export function getAllFolderTreeItemIds(nodes: LibraryFolderTreeNode[]): string[] {
  return nodes.flatMap((node) => [node.id, ...getAllFolderTreeItemIds(node.children ?? [])]);
}

function toLibraryComponentTreeItemId(folderId: string, itemId: string) {
  return `component:${folderId}:${itemId}`;
}

const PROJECT_COMPONENTS_FOLDER_ID_PREFIX = "project-components";

function isProjectComponentFolderId(folderId: string | null | undefined) {
  return typeof folderId === "string" && folderId.startsWith(`${PROJECT_COMPONENTS_FOLDER_ID_PREFIX}-`);
}

function isProjectComponentProjectionItem(item: EstimateRowItem) {
  return readProjectComponentProjectionMetadata(item.metadata) !== null;
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
    if (isProjectComponentFolderId(folderId) && !isProjectComponentProjectionItem(item)) continue;
    const folderItems = itemsByFolderId.get(folderId) ?? [];
    folderItems.push(item);
    itemsByFolderId.set(folderId, folderItems);
  }

  for (const folderItems of itemsByFolderId.values()) {
    folderItems.sort((left, right) => getComponentName(left).localeCompare(getComponentName(right)));
  }

  return itemsByFolderId;
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

/**
 * Build the in-house `Tree` node list. Folders carry their subfolders followed
 * by their component rows as leaf children, so a folder expands to reveal both —
 * the same shape the estimate sheet and templates tree use. The synthetic "All
 * Components" root is never selectable or draggable; an empty folder renders as
 * a leaf (no caret), matching the prior affordance.
 */
function toLibraryFolderUiNodes(
  nodes: LibraryFolderTreeNode[],
  itemsByFolderId: Map<string, EstimateRowItem[]>,
  options: { enableFolderActions: boolean; componentsSelectable: boolean },
): UiTreeNode[] {
  return nodes.map((node) => {
    const isSyntheticRoot = isAllComponentsFolderId(node.folderId);
    const childFolders = node.children?.length
      ? toLibraryFolderUiNodes(node.children, itemsByFolderId, options)
      : [];
    const componentItems = isSyntheticRoot ? [] : itemsByFolderId.get(node.folderId) ?? [];
    const componentNodes: UiTreeNode[] = componentItems.map((item) => ({
      id: toLibraryComponentTreeItemId(node.folderId, item.id),
      label: getComponentName(item),
      ariaLabel: getComponentName(item),
      isLeaf: true,
      selectable: options.componentsSelectable,
      icon: <Package size={TREE_ROW_ICON_SIZE} weight="regular" className="shrink-0 text-tertiary" aria-hidden="true" />,
      data: { folderTree: { kind: "component", item, parentFolderId: node.folderId } satisfies LibraryFolderTreeDatum },
    }));
    const children = [...childFolders, ...componentNodes];
    return {
      id: node.id,
      label: node.label,
      ariaLabel: node.label,
      selectable: options.enableFolderActions && !isSyntheticRoot,
      icon: <FolderSimple size={TREE_ROW_ICON_SIZE} weight="regular" className="shrink-0 text-tertiary" aria-hidden="true" />,
      children: children.length ? children : undefined,
      data: {
        folderTree: { kind: "folder", folderId: node.folderId, label: node.label, isSyntheticRoot } satisfies LibraryFolderTreeDatum,
      },
    } satisfies UiTreeNode;
  });
}

function indexUiNodes(nodes: UiTreeNode[], into = new Map<string, UiTreeNode>()): Map<string, UiTreeNode> {
  for (const node of nodes) {
    into.set(node.id, node);
    if (node.children?.length) indexUiNodes(node.children, into);
  }
  return into;
}

type FolderPlacement = {
  /** Real data-model parent folder id for a folder row (null = top level). */
  parentFolderIdByTreeId: Map<string, string | null>;
  /** Index of a folder among its real folder siblings (render order). */
  indexByTreeId: Map<string, number>;
  /** Count of subfolders for a given folder id (append index for "inside"). */
  childFolderCountByFolderId: Map<string, number>;
  /** Number of top-level real folders (append index for the synthetic root). */
  topLevelCount: number;
};

/**
 * Maps each rendered folder row to the (parent, index) coordinates that
 * `buildLibraryFolderReorderPlan` consumes. The synthetic "All Components" root
 * is unwrapped: its children are the real top-level folders (data-model parent
 * `null`), so dropping a folder "inside" the root makes it a top-level folder.
 */
function buildFolderPlacement(nodes: LibraryFolderTreeNode[]): FolderPlacement {
  const parentFolderIdByTreeId = new Map<string, string | null>();
  const indexByTreeId = new Map<string, number>();
  const childFolderCountByFolderId = new Map<string, number>();

  function walk(siblings: LibraryFolderTreeNode[], parentRealFolderId: string | null) {
    siblings.forEach((node, index) => {
      parentFolderIdByTreeId.set(node.id, parentRealFolderId);
      indexByTreeId.set(node.id, index);
      const children = node.children ?? [];
      childFolderCountByFolderId.set(node.folderId, children.length);
      walk(children, node.folderId);
    });
  }

  const hasSyntheticRoot = nodes.length > 0 && isAllComponentsFolderId(nodes[0].folderId);
  const topLevelFolders = hasSyntheticRoot ? nodes[0].children ?? [] : nodes;
  if (hasSyntheticRoot) childFolderCountByFolderId.set(nodes[0].folderId, topLevelFolders.length);
  walk(topLevelFolders, null);

  return { parentFolderIdByTreeId, indexByTreeId, childFolderCountByFolderId, topLevelCount: topLevelFolders.length };
}

function buildFolderSelectionNodes(nodes: LibraryFolderTreeNode[]): TreeSelectionNode[] {
  return nodes.map((node) => ({
    id: node.folderId,
    selectable: !isAllComponentsFolderId(node.folderId),
    children: buildFolderSelectionNodes(node.children ?? []),
  }));
}

export function FolderActionIcon() {
  return <FolderSimple size={12} weight="regular" aria-hidden="true" />;
}

export function ComponentViewControls({
  mode,
  ariaLabel,
  onModeChange,
  className,
}: {
  mode: ComponentViewMode;
  ariaLabel: string;
  onModeChange: (mode: ComponentViewMode) => void;
  className?: string;
}) {
  return (
    <div
      role="menu"
      aria-label={ariaLabel}
      className={cn("absolute left-2 top-[72px] z-40 w-36 rounded-xs border border-hairline bg-white p-1 shadow-lg", className)}
    >
      <div className="px-2 pb-1 pt-0.5 text-[8px] font-medium uppercase leading-3 tracking-normal text-tertiary">View By</div>
      <div className="space-y-0.5">
        {COMPONENT_VIEW_MODES.map((item) => (
          <button
            key={item.id}
            type="button"
            role="menuitemradio"
            aria-checked={mode === item.id}
            onClick={() => onModeChange(item.id)}
            className={cn(
              "flex h-7 w-full items-center gap-2 rounded-xs px-2 text-left text-[10px] font-medium leading-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
              mode === item.id ? "bg-accentSoft text-ink" : "text-tertiary hover:bg-surfaceMuted hover:text-ink",
            )}
          >
            <Check
              size={11}
              weight="regular"
              aria-hidden="true"
              className={cn("shrink-0", mode === item.id ? "opacity-100" : "opacity-0")}
            />
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
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
  selectedComponentIds?: Set<string>;
  selectedFolderId: string | null;
  searchQuery: string;
  disabled: boolean;
  onSelectFolder: (folderId: string) => void;
  onToggleComponentSelected?: (itemId: string) => void;
  onMoveComponentToFolder?: (item: EstimateRowItem, targetFolderId: string) => Promise<void> | void;
  onFoldersChange: (folders: LibraryFolderRecord[]) => void;
  onReorderStatus: (status: ReorderStatus) => void;
  onCreateFolder: (parentId: string | null) => void;
  onRenameFolder: (folderId: string, currentName: string) => void;
  onDeleteFolder: (folderId: string, currentName: string) => void;
  expandedItemIds?: string[];
  onExpandedItemIdsChange?: (itemIds: string[]) => void;
  enableFolderActions?: boolean;
  enableDragAndDrop?: boolean;
  selectedTitleOnly?: boolean;
  onDeleteFolders?: (folderIds: string[]) => boolean | void;
};

export function LibraryFolderTree({
  folders,
  nodes,
  libraryItems = [],
  selectedComponentIds = new Set<string>(),
  selectedFolderId,
  searchQuery,
  disabled,
  onSelectFolder,
  onToggleComponentSelected,
  onMoveComponentToFolder,
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
  onDeleteFolders,
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
  const componentsSelectable = Boolean(onToggleComponentSelected);
  const selectable = enableFolderActions || componentsSelectable;

  const uiNodes = useMemo(
    () => toLibraryFolderUiNodes(filteredNodes, filteredComponentItemsByFolderId, { enableFolderActions, componentsSelectable }),
    [componentsSelectable, enableFolderActions, filteredComponentItemsByFolderId, filteredNodes],
  );
  const nodeById = useMemo(() => indexUiNodes(uiNodes), [uiNodes]);
  const placement = useMemo(() => buildFolderPlacement(filteredNodes), [filteredNodes]);

  const [internalExpandedItemIds, setInternalExpandedItemIds] = useState<string[]>(() => getAllFolderTreeItemIds(nodes));
  const expandedItemIds = controlledExpandedItemIds ?? internalExpandedItemIds;
  const setExpandedItemIds = useCallback((update: string[] | ((current: string[]) => string[])) => {
    const next = typeof update === "function" ? update(expandedItemIds) : update;
    if (onExpandedItemIdsChange) {
      onExpandedItemIdsChange(next);
    } else {
      setInternalExpandedItemIds(next);
    }
  }, [expandedItemIds, onExpandedItemIdsChange]);

  const folderSelectionNodes = useMemo(() => buildFolderSelectionNodes(filteredNodes), [filteredNodes]);
  const [bulkSelectedFolderIds, setBulkSelectedFolderIds] = useState<Set<string>>(() => new Set());
  const bulkSelectionCount = bulkSelectedFolderIds.size;
  const selectedComponentCount = selectedComponentIds.size;

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setBulkSelectedFolderIds((current) => {
        const next = pruneSelection(folderSelectionNodes, current);
        return next.size === current.size && [...next].every((id) => current.has(id)) ? current : next;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [folderSelectionNodes]);

  // The in-house tree drives selection from a single id set: union the bulk
  // folder selection (cascade checkboxes) with the component selection so both
  // render their checkbox state from one source.
  const selectedComponentTreeIds = useMemo(() => {
    const ids: string[] = [];
    for (const [folderId, items] of filteredComponentItemsByFolderId.entries()) {
      for (const item of items) {
        if (selectedComponentIds.has(item.id)) ids.push(toLibraryComponentTreeItemId(folderId, item.id));
      }
    }
    return ids;
  }, [filteredComponentItemsByFolderId, selectedComponentIds]);

  const selectedIds = useMemo(
    () => [...[...bulkSelectedFolderIds].map((folderId) => toLibraryFolderTreeItemId(folderId)), ...selectedComponentTreeIds],
    [bulkSelectedFolderIds, selectedComponentTreeIds],
  );
  const currentId = selectedFolderId ? toLibraryFolderTreeItemId(selectedFolderId) : undefined;

  const clearBulkSelection = useCallback(() => setBulkSelectedFolderIds(new Set()), []);

  const handleToggleBulkFolder = useCallback((folderId: string, checked: boolean) => {
    setBulkSelectedFolderIds((current) => toggleCascadeSelection(folderSelectionNodes, current, folderId, checked));
  }, [folderSelectionNodes]);

  const handleDeleteSelectedFolders = useCallback(() => {
    if (!onDeleteFolders || bulkSelectedFolderIds.size === 0) return;
    const result = onDeleteFolders([...bulkSelectedFolderIds]);
    if (result !== false) clearBulkSelection();
  }, [bulkSelectedFolderIds, clearBulkSelection, onDeleteFolders]);

  const handleToggle = useCallback((nodeId: string) => {
    setExpandedItemIds((current) =>
      current.includes(nodeId) ? current.filter((id) => id !== nodeId) : [...current, nodeId],
    );
  }, [setExpandedItemIds]);

  const handleCheckboxToggle = useCallback((nodeId: string, checked: boolean, node: UiTreeNode) => {
    const datum = getLibraryFolderTreeDatum(node);
    if (datum?.kind === "folder" && !datum.isSyntheticRoot) {
      handleToggleBulkFolder(datum.folderId, checked);
    } else if (datum?.kind === "component") {
      onToggleComponentSelected?.(datum.item.id);
    }
  }, [handleToggleBulkFolder, onToggleComponentSelected]);

  const handleRowClick = useCallback((_nodeId: string, node: UiTreeNode) => {
    const datum = getLibraryFolderTreeDatum(node);
    if (datum?.kind === "component") onSelectFolder(datum.parentFolderId);
    else if (datum?.kind === "folder" && datum.folderId) onSelectFolder(datum.folderId);
  }, [onSelectFolder]);

  const handleCanDrag = useCallback((node: UiTreeNode) => {
    if (!enableDragAndDrop || disabled) return false;
    const datum = getLibraryFolderTreeDatum(node);
    if (datum?.kind === "folder") return !datum.isSyntheticRoot && Boolean(datum.folderId);
    if (datum?.kind === "component") return Boolean(onMoveComponentToFolder);
    return false;
  }, [disabled, enableDragAndDrop, onMoveComponentToFolder]);

  // A component drops into whichever folder the target row resolves to: the
  // folder itself, or the parent folder of a hovered component row. The
  // synthetic "All Components" root is never a valid destination.
  const resolveComponentTargetFolderId = useCallback((targetId: string) => {
    const datum = getLibraryFolderTreeDatum(nodeById.get(targetId));
    if (!datum) return null;
    if (datum.kind === "component") return datum.parentFolderId;
    if (datum.isSyntheticRoot) return null;
    return datum.folderId;
  }, [nodeById]);

  // Translate the tree's (target, position) into the (parent, index)
  // coordinates the reorder planner consumes. "inside" nests under the folder;
  // before/after reorders among the target's siblings.
  const resolveFolderDropPlan = useCallback((
    draggedFolderId: string,
    targetId: string,
    position: TreeDropPosition,
  ): LibraryFolderReorderResult | null => {
    const datum = getLibraryFolderTreeDatum(nodeById.get(targetId));
    if (datum?.kind !== "folder") return null;
    if (position === "inside") {
      const targetParentId = datum.isSyntheticRoot ? null : datum.folderId;
      const targetIndex = datum.isSyntheticRoot
        ? placement.topLevelCount
        : placement.childFolderCountByFolderId.get(datum.folderId) ?? 0;
      return buildLibraryFolderReorderPlan({ folders, draggedFolderId, targetParentId, targetIndex });
    }
    if (datum.isSyntheticRoot) return null;
    const targetParentId = placement.parentFolderIdByTreeId.get(targetId) ?? null;
    const baseIndex = placement.indexByTreeId.get(targetId) ?? 0;
    const targetIndex = position === "after" ? baseIndex + 1 : baseIndex;
    return buildLibraryFolderReorderPlan({ folders, draggedFolderId, targetParentId, targetIndex });
  }, [folders, nodeById, placement]);

  const handleCanDrop = useCallback((draggedId: string, targetId: string, position: TreeDropPosition) => {
    const draggedDatum = getLibraryFolderTreeDatum(nodeById.get(draggedId));
    if (!draggedDatum) return false;
    if (draggedDatum.kind === "component") {
      const targetFolderId = resolveComponentTargetFolderId(targetId);
      return Boolean(targetFolderId && targetFolderId !== draggedDatum.parentFolderId);
    }
    return Boolean(resolveFolderDropPlan(draggedDatum.folderId, targetId, position)?.ok);
  }, [nodeById, resolveComponentTargetFolderId, resolveFolderDropPlan]);

  const handleComponentDrop = useCallback(async (
    item: EstimateRowItem,
    sourceFolderId: string,
    targetFolderId: string | null,
  ) => {
    if (!targetFolderId || !onMoveComponentToFolder) {
      onReorderStatus({ state: "error", message: "Drop components onto a library folder." });
      return;
    }
    if (sourceFolderId === targetFolderId) {
      onReorderStatus({ state: "saved", message: "Component is already in that folder." });
      return;
    }
    onReorderStatus({ state: "saving", message: `Moving ${getComponentName(item)}...` });
    try {
      await onMoveComponentToFolder(item, targetFolderId);
      onSelectFolder(targetFolderId);
      onReorderStatus({ state: "saved", message: "Component moved." });
    } catch (error) {
      onReorderStatus({ state: "error", message: error instanceof Error ? error.message : "Could not move component." });
    }
  }, [onMoveComponentToFolder, onReorderStatus, onSelectFolder]);

  const handleFolderDrop = useCallback(async (
    draggedFolderId: string,
    targetId: string,
    position: TreeDropPosition,
  ) => {
    const result = resolveFolderDropPlan(draggedFolderId, targetId, position);
    if (!result) return;
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
  }, [folders, onFoldersChange, onReorderStatus, onSelectFolder, resolveFolderDropPlan]);

  const handleDrop = useCallback((draggedId: string, targetId: string, position: TreeDropPosition) => {
    const draggedDatum = getLibraryFolderTreeDatum(nodeById.get(draggedId));
    if (!draggedDatum) return;
    if (draggedDatum.kind === "component") {
      void handleComponentDrop(draggedDatum.item, draggedDatum.parentFolderId, resolveComponentTargetFolderId(targetId));
      return;
    }
    void handleFolderDrop(draggedDatum.folderId, targetId, position);
  }, [handleComponentDrop, handleFolderDrop, nodeById, resolveComponentTargetFolderId]);

  const [contextMenuNodeId, setContextMenuNodeId] = useState<string | null>(null);
  const [contextMenuOpen, setContextMenuOpen] = useState(false);

  const contextMenuGroups = useMemo<ActionMenuGroup[]>(() => {
    const node = contextMenuNodeId ? nodeById.get(contextMenuNodeId) : undefined;
    const datum = getLibraryFolderTreeDatum(node);
    if (!node || datum?.kind !== "folder") return [];
    const { folderId, label, isSyntheticRoot } = datum;
    const hasChildren = Boolean(node.children?.length);
    const isExpanded = expandedItemIds.includes(node.id);
    const createParentId = isSyntheticRoot ? null : folderId;
    return [
      {
        id: "folder-actions",
        items: [
          { id: "select", label: "Select", onSelect: () => onSelectFolder(folderId) },
          ...(hasChildren
            ? [
                {
                  id: isExpanded ? "collapse" : "expand",
                  label: isExpanded ? "Collapse" : "Expand",
                  icon: isExpanded
                    ? <CaretDown size={12} weight="regular" aria-hidden="true" />
                    : <CaretRight size={12} weight="regular" aria-hidden="true" />,
                  onSelect: () => handleToggle(node.id),
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
                        onSelect: () => onRenameFolder(folderId, label),
                      },
                      {
                        id: "delete-folder",
                        label: "Delete",
                        tone: "destructive" as const,
                        disabled: disabled || !folderId,
                        disabledReason: disabled ? "Finish the current folder save before deleting another folder." : undefined,
                        onSelect: () => onDeleteFolder(folderId, label),
                      },
                    ]
                  : []),
              ]
            : []),
        ],
      },
    ];
  }, [contextMenuNodeId, disabled, enableFolderActions, expandedItemIds, handleToggle, nodeById, onCreateFolder, onDeleteFolder, onRenameFolder, onSelectFolder]);

  const renderRow = useCallback((node: UiTreeNode) => {
    const datum = getLibraryFolderTreeDatum(node);
    if (datum?.kind === "component") {
      const item = datum.item;
      return (
        <span data-library-component-item-id={item.id} className="flex min-w-0 flex-1 items-center gap-1.5 py-0.5">
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-[10px] font-medium leading-4 text-ink">{getComponentName(item)}</span>
            <span className="truncate text-[9px] leading-3 text-tertiary">{item.supplier || "No supplier"}</span>
          </span>
          <span className="flex shrink-0 flex-col items-end">
            <span className="text-[9px] font-medium tabular-nums text-ink">{pesoFormatter.format(getComponentPrice(item))}</span>
            <span className="text-[9px] text-tertiary">/{item.unit}</span>
          </span>
        </span>
      );
    }
    const isCurrentFolder = datum?.kind === "folder" && selectedFolderId === datum.folderId;
    return (
      <span className={cn("min-w-0 flex-1 truncate", selectedTitleOnly && isCurrentFolder && "font-medium text-ink")}>
        {node.label}
      </span>
    );
  }, [selectedFolderId, selectedTitleOnly]);

  if (filteredNodes.length === 0) {
    return (
      <div className="rounded-xs border border-dashed border-hairline bg-surfaceMuted p-2 text-[10px] leading-4 text-tertiary">
        No folders match &quot;{searchQuery}&quot;.
      </div>
    );
  }

  return (
    <>
      <TreeBulkActionBar
        selectedCount={bulkSelectionCount}
        entityLabel="folder"
        onClearSelection={clearBulkSelection}
        onDelete={handleDeleteSelectedFolders}
        deleteDisabled={disabled || !onDeleteFolders}
        disabledReason={disabled ? "Finish the current folder save before deleting selected folders." : "Bulk folder delete is not available here."}
      />
      <ContextMenu onOpenChange={setContextMenuOpen}>
        <ContextMenuTrigger asChild>
          <nav
            aria-label="Library folder tree"
            className="block w-full"
            onContextMenu={(event) => {
              // Only folder rows open the menu; right-clicks on empty space or
              // component rows keep it closed.
              if (!(event.target instanceof Element)) {
                event.preventDefault();
                return;
              }
              const row = event.target.closest("[data-tree-row]");
              if (!row || (row.getAttribute("data-tree-row") ?? "").startsWith("component:")) {
                event.preventDefault();
              }
            }}
          >
            <Tree
              nodes={uiNodes}
              ariaLabel="Library folders"
              className={cn("relative min-h-7 overflow-visible", WORKSHOP_TREE_ROW_GAP_CLASS)}
              expandedIds={expandedItemIds}
              onToggle={(nodeId) => handleToggle(nodeId)}
              selectable={selectable}
              selectedIds={selectedIds}
              onCheckboxToggle={selectable ? handleCheckboxToggle : undefined}
              currentId={currentId}
              railsPinned={contextMenuOpen || bulkSelectionCount > 0 || selectedComponentCount > 0}
              draggable={enableDragAndDrop}
              canDrag={handleCanDrag}
              canDrop={handleCanDrop}
              onDrop={enableDragAndDrop ? handleDrop : undefined}
              onRowClick={handleRowClick}
              onContextMenu={(nodeId) => setContextMenuNodeId(nodeId)}
              renderRow={renderRow}
              virtualization={WORKSHOP_TREE_VIRTUALIZATION}
            />
          </nav>
        </ContextMenuTrigger>
        <ContextMenuContent data-library-folder-tree-context-menu="true" alignOffset={4}>
          <ContextActionMenuContent groups={contextMenuGroups} />
        </ContextMenuContent>
      </ContextMenu>
    </>
  );
}

type LibraryFolderTreePickerProps = {
  folders: LibraryFolderRecord[];
  nodes: LibraryFolderTreeNode[];
  libraryItems?: EstimateRowItem[];
  selectedComponentIds?: Set<string>;
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
  onToggleComponentSelected?: (itemId: string) => void;
  onMoveComponentToFolder?: (item: EstimateRowItem, targetFolderId: string) => Promise<void> | void;
  onSelectSupplier?: (supplierId: string | null, supplierName?: string) => void;
  onSelectBrand?: (brandId: string | null, brandName?: string) => void;
  onCreateFolder?: CreateLibraryFolderHandler;
  onRenameFolder?: (folderId: string, currentName: string) => void;
  onDeleteFolder?: (folderId: string, currentName: string) => void;
  onDeleteFolders?: (folderIds: string[]) => boolean | void;
  reorderStatus?: ReorderStatus;
  treeMutationPending?: boolean;
  className?: string;
};

type LibraryFolderTreeSurfaceProps = {
  className?: string;
  folders: LibraryFolderRecord[];
  folderNodes: LibraryFolderTreeNode[];
  libraryItems?: EstimateRowItem[];
  selectedComponentIds?: Set<string>;
  selectedFolderId: string | null;
  viewMode?: ComponentViewMode;
  defaultViewMode?: ComponentViewMode;
  onViewModeChange?: (mode: ComponentViewMode) => void;
  onSelectFolder: (folderId: string) => void;
  onToggleComponentSelected?: (itemId: string) => void;
  onMoveComponentToFolder?: (item: EstimateRowItem, targetFolderId: string) => Promise<void> | void;
  onFoldersChange?: (folders: LibraryFolderRecord[]) => void;
  onReorderStatus?: (status: ReorderStatus) => void;
  onCreateFolder?: CreateLibraryFolderHandler;
  onRenameFolder?: (folderId: string, currentName: string) => void;
  onDeleteFolder?: (folderId: string, currentName: string) => void;
  onDeleteFolders?: (folderIds: string[]) => boolean | void;
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
  selectedComponentIds = new Set<string>(),
  selectedFolderId,
  viewMode: controlledViewMode,
  defaultViewMode = "default",
  onViewModeChange,
  onSelectFolder,
  onToggleComponentSelected,
  onMoveComponentToFolder,
  onFoldersChange = () => undefined,
  onReorderStatus = () => undefined,
  onCreateFolder,
  onRenameFolder = () => undefined,
  onDeleteFolder = () => undefined,
  onDeleteFolders,
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
  viewModeAriaLabel,
  noSupplierMatchesLabel,
  noBrandMatchesLabel,
}: LibraryFolderTreeSurfaceProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [internalViewMode, setInternalViewMode] = useState<ComponentViewMode>(defaultViewMode);
  const [viewModeMenuOpen, setViewModeMenuOpen] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);
  const viewMode = controlledViewMode ?? internalViewMode;
  const displayedFolderNodes = useMemo(
    () => (showAllComponentsRoot ? withAllComponentsRoot(folderNodes) : folderNodes),
    [folderNodes, showAllComponentsRoot],
  );
  const effectiveSelectedFolderId = showAllComponentsRoot ? (selectedFolderId ?? ALL_COMPONENTS_FOLDER_ID) : selectedFolderId;
  const [expandedFolderItemIds, setExpandedFolderItemIds] = useState<string[]>(() => getAllFolderTreeItemIds(displayedFolderNodes));
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
    setViewModeMenuOpen(false);
  }, [controlledViewMode, onViewModeChange, setViewModeMenuOpen]);

  useEffect(() => {
    if (!viewModeMenuOpen) return;
    function handlePointerDown(event: PointerEvent) {
      if (!headerRef.current?.contains(event.target as Node)) setViewModeMenuOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setViewModeMenuOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [viewModeMenuOpen]);

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
              "flex min-h-7 w-full items-center gap-1 rounded-xs px-2 text-left text-[10px] leading-4 transition hover:bg-surfaceMuted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
              selected ? "bg-accentSoft font-medium text-ink" : "font-normal text-ink",
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
    <div className="rounded-xs border border-dashed border-hairline bg-surfaceMuted p-2 text-[10px] leading-4 text-tertiary">
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
      <div className="rounded-xs border border-dashed border-hairline bg-surfaceMuted p-2 text-[10px] leading-4 text-tertiary">
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
              "flex min-h-7 w-full items-center gap-1 rounded-xs px-2 text-left text-[10px] leading-4 transition hover:bg-surfaceMuted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
              selected ? "bg-accentSoft font-medium text-ink" : "font-normal text-ink",
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
    <div className="rounded-xs border border-dashed border-hairline bg-surfaceMuted p-2 text-[10px] leading-4 text-tertiary">
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
      <div className="rounded-xs border border-dashed border-hairline bg-surfaceMuted p-2 text-[10px] leading-4 text-tertiary">
        No tree matches for &quot;{searchQuery}&quot;.
      </div>
    )
  ) : brandListTree;

  const treeSearchPlaceholder = isFolderMode ? folderSearchPlaceholder : isBrandMode ? brandSearchPlaceholder : supplierSearchPlaceholder;

  return (
    <div className={cn("flex h-full min-h-0 flex-col overflow-hidden bg-white", className)}>
      <TreePanelHeader
        ref={headerRef}
        ariaLabel={toolbarAriaLabel}
        labelPrefix={resolveModeValue(toolbarLabelPrefix, viewMode)}
        searchValue={searchQuery}
        onSearchValueChange={setSearchQuery}
        searchPlaceholder={treeSearchPlaceholder}
        searchLabel={resolveModeValue(searchAriaLabel, viewMode)}
        showDefaultActions={false}
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
        leadingActions={[
          {
            label: `View by: ${COMPONENT_VIEW_MODES.find((item) => item.id === viewMode)?.label ?? "Default"}`,
            icon: <SquaresFour size={12} weight="regular" aria-hidden="true" />,
            onClick: () => setViewModeMenuOpen((current) => !current),
            pressed: viewModeMenuOpen,
          },
        ]}
        leadingActionsLabel="Component tree view mode"
        addActions={addActions}
      >
        {viewModeMenuOpen ? <ComponentViewControls mode={viewMode} ariaLabel={viewModeAriaLabel} onModeChange={changeViewMode} /> : null}
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
      </TreePanelHeader>
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="p-2">
          {bodyTopSpacer}
          {isFolderMode ? (
            <LibraryFolderTree
              folders={folders}
              nodes={displayedFolderNodes}
              libraryItems={libraryItems}
              selectedComponentIds={selectedComponentIds}
              selectedFolderId={effectiveSelectedFolderId}
              searchQuery={searchQuery}
              disabled={treeMutationPending}
              expandedItemIds={expandedFolderItemIds}
              onExpandedItemIdsChange={setExpandedFolderItemIds}
              enableFolderActions={enableFolderActions}
              enableDragAndDrop={enableFolderDragAndDrop}
              selectedTitleOnly={selectedTitleOnly}
              onSelectFolder={onSelectFolder}
              onToggleComponentSelected={onToggleComponentSelected}
              onMoveComponentToFolder={onMoveComponentToFolder}
              onFoldersChange={onFoldersChange}
              onReorderStatus={onReorderStatus}
              onCreateFolder={onCreateFolder ?? (() => undefined)}
              onRenameFolder={onRenameFolder}
              onDeleteFolder={onDeleteFolder}
              onDeleteFolders={onDeleteFolders}
            />
          ) : isBrandMode ? (
            brandTree
          ) : (
            supplierTree
          )}
        </div>
      </div>
    </div>
  );
}

export function LibraryFolderTreePicker({
  folders,
  nodes,
  libraryItems = [],
  selectedComponentIds,
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
  onToggleComponentSelected,
  onMoveComponentToFolder,
  onSelectSupplier,
  onSelectBrand,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onDeleteFolders,
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
      selectedComponentIds={selectedComponentIds}
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
      onToggleComponentSelected={onToggleComponentSelected}
      onMoveComponentToFolder={onMoveComponentToFolder}
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
      onDeleteFolders={onDeleteFolders}
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
      viewModeAriaLabel="Add component view mode"
    />
  );
}
