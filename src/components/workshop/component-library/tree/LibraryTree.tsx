"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import Image from "next/image";
import {
  CaretDown,
  CaretRight,
  CopySimple,
  Eye,
  FolderSimple,
  ImageSquare,
  Package,
  PencilSimple,
  Plus,
  PlusSquare,
  Star,
  Trash,
} from "@phosphor-icons/react/dist/ssr";

import { ContextActionMenuContent, type ActionMenuGroup } from "@/components/ui/action-menu";
import { Button } from "@/components/ui/button";
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from "@/components/ui/context-menu";
import { TREE_ROW_ICON_SIZE, Tree, type TreeDropPosition, type TreeNode as UiTreeNode } from "@/components/ui/tree";
import { normalizeEstimateRowImageUrl } from "@/lib/estimates/image-url";
import { useStableCallback } from "@/hooks/use-stable-callback";
import { cn } from "@/lib/ui/cn";
import { WORKSHOP_TREE_VIRTUALIZATION } from "@/lib/workshop/virtualization-flags";
import type { EstimateRowItem } from "../../estimate-tree-data";
import { getComponentName, getComponentPrice, pesoFormatter } from "../helpers";
import { isProjectComponentProjectionItem } from "./buildLibraryTree";
import { getAllNodeIds } from "./helpers";
import type { LibraryTreeProps, LibraryTreeNode } from "./types";

function getComponentIconColorClass(item: EstimateRowItem) {
  return isProjectComponentProjectionItem(item) ? "text-[#AAB6E8]" : "text-[#E8B99D]";
}

function menuIcon(Icon: typeof Plus) {
  return <Icon size={12} weight="regular" aria-hidden="true" />;
}

function createFolderActionGroups({
  hasChildren,
  expanded,
  onSelect,
  onToggle,
  onCreateComponent,
  onRename,
}: {
  hasChildren: boolean;
  expanded: boolean;
  onSelect: () => void;
  onToggle: () => void;
  onCreateComponent?: () => void;
  onRename?: () => void;
}): ActionMenuGroup[] {
  return [
    ...(onCreateComponent
      ? [
          {
            id: "folder-create",
            items: [
              {
                id: "new-component",
                label: "New Component",
                icon: menuIcon(PlusSquare),
                onSelect: onCreateComponent,
              },
            ],
          },
        ]
      : []),
    {
      id: "folder-actions",
      items: [
        { id: "select", label: "Select", icon: menuIcon(Eye), onSelect },
        ...(onRename
          ? [
              {
                id: "rename",
                label: "Rename",
                icon: menuIcon(PencilSimple),
                onSelect: onRename,
              },
            ]
          : []),
        ...(hasChildren
          ? [
              {
                id: expanded ? "collapse" : "expand",
                label: expanded ? "Collapse" : "Expand",
                icon: expanded ? menuIcon(CaretDown) : menuIcon(CaretRight),
                onSelect: onToggle,
              },
            ]
          : []),
      ],
    },
  ];
}

function createItemActionGroups({
  item,
  addDisabled,
  addLabel,
  onAdd,
  onPreview,
  onEdit,
  onDuplicate,
  onToggleFavorite,
  onDelete,
  destructiveActionLabel = "Delete",
}: {
  item: EstimateRowItem;
  addDisabled?: boolean;
  addLabel?: string;
  onAdd?: () => void;
  onPreview: () => void;
  onEdit?: () => void;
  onDuplicate?: () => void;
  onToggleFavorite?: () => void;
  onDelete?: () => void;
  destructiveActionLabel?: string;
}): ActionMenuGroup[] {
  return [
    {
      id: "component-actions",
      items: [
        { id: "preview", label: "Preview", icon: menuIcon(Eye), onSelect: onPreview },
        ...(onAdd
          ? [
              {
                id: "add",
                label: addDisabled ? "Add" : (addLabel ?? "Add"),
                icon: menuIcon(Plus),
                disabled: addDisabled,
                disabledReason: addDisabled ? "Select an area before adding this component." : undefined,
                onSelect: onAdd,
              },
            ]
          : []),
      ],
    },
    {
      id: "component-edit",
      items: [
        ...(onEdit ? [{ id: "edit", label: "Edit", icon: menuIcon(PencilSimple), onSelect: onEdit }] : []),
        ...(onDuplicate ? [{ id: "duplicate", label: "Duplicate", icon: menuIcon(CopySimple), onSelect: onDuplicate }] : []),
        ...(onToggleFavorite
          ? [
              {
                id: "favorite",
                label: item.isFavorite ? "Remove from favorites" : "Add to favorites",
                icon: menuIcon(Star),
                onSelect: onToggleFavorite,
              },
            ]
          : []),
      ],
    },
    {
      id: "component-danger",
      items: onDelete
        ? [{ id: "delete", label: destructiveActionLabel, icon: menuIcon(Trash), tone: "destructive" as const, onSelect: onDelete }]
        : [],
    },
  ];
}

function LibraryItemRowContent({
  item,
  addDisabled = false,
  addLabel,
  showAddAction,
  showThumbnail,
  sourceScopeLabel = "Library",
  onAdd,
}: {
  item: EstimateRowItem;
  addDisabled?: boolean;
  addLabel?: string;
  showAddAction: boolean;
  showThumbnail: boolean;
  sourceScopeLabel?: string;
  onAdd: () => void;
}) {
  const name = getComponentName(item);
  const price = getComponentPrice(item);
  const sourceScope = sourceScopeLabel.trim();
  const brand = item.brand?.trim();
  const supplierLabel = item.supplier || "No supplier";
  const sourceLabel = sourceScope ? `${sourceScope} · ${supplierLabel}` : supplierLabel;
  const brandLabel = brand || "No brand";
  const resolvedAddLabel = addDisabled
    ? `Select an area before adding ${name}`
    : addLabel
      ? `${addLabel}: ${name}`
      : `Add ${name} to selected estimate area`;

  return (
    <span className={cn("flex min-w-0 flex-1 items-center gap-2", showThumbnail ? "py-1.5" : "py-0.5")}>
      {showThumbnail ? <LibraryItemThumbnail item={item} /> : null}
      <span className="flex min-w-0 flex-1 flex-col">
        <span data-component-library-tree-label className="truncate text-[10px] font-medium leading-3 text-ink">
          {name}
        </span>
        {showThumbnail ? (
          <>
            <span className="truncate text-[9px] leading-3 text-tertiary" title={brandLabel}>{brandLabel}</span>
            <span className="truncate text-[9px] leading-3 text-tertiary" title={supplierLabel}>{supplierLabel}</span>
          </>
        ) : <span className="truncate text-[9px] leading-3 text-tertiary" title={sourceLabel}>{sourceLabel}</span>}
      </span>
      <span className="flex shrink-0 flex-col items-end justify-center">
        <span className="text-[9px] font-medium leading-3 tabular-nums text-ink">{pesoFormatter.format(price)}</span>
        <span className="text-[9px] leading-3 text-tertiary">/{item.unit}</span>
      </span>
      {showAddAction ? (
        <span className="flex shrink-0 items-center opacity-0 transition-opacity group-hover/tree-row:opacity-100 group-focus-within/tree-row:opacity-100">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-5 p-0 text-tertiary hover:text-ink"
            aria-label={resolvedAddLabel}
            title={resolvedAddLabel}
            disabled={addDisabled}
            onClick={(event) => {
              event.stopPropagation();
              if (addDisabled) return;
              onAdd();
            }}
            onDoubleClick={(event) => event.stopPropagation()}
          >
            <Plus size={11} weight="regular" />
          </Button>
        </span>
      ) : null}
    </span>
  );
}

function readLibraryItemThumbnailUrl(item: EstimateRowItem) {
  const url = typeof item.imageUrl === "string" ? item.imageUrl.trim() : "";
  if (!url) return "";
  const normalizedUrl = normalizeEstimateRowImageUrl(url);
  if (normalizedUrl) return normalizedUrl;

  const search = new URLSearchParams({ path: url });
  return normalizeEstimateRowImageUrl(`/api/component-library/images?${search.toString()}`) ?? "";
}

function LibraryItemThumbnail({ item }: { item: EstimateRowItem }) {
  const [failed, setFailed] = useState(false);
  const thumbnailUrl = failed ? "" : readLibraryItemThumbnailUrl(item);
  return (
    <span
      data-component-library-row-thumbnail
      className="relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-xs border border-hairline bg-surface-muted"
      aria-hidden="true"
    >
      {thumbnailUrl ? (
        <Image
          src={thumbnailUrl}
          alt=""
          fill
          sizes="36px"
          unoptimized
          loading="lazy"
          className="object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <ImageSquare size={12} weight="regular" aria-hidden="true" className={getComponentIconColorClass(item)} />
      )}
    </span>
  );
}

function FolderRenameInput({
  value,
  onChange,
  onCommit,
  onCancel,
}: {
  value: string;
  onChange: (value: string) => void;
  onCommit: (value: string) => void;
  onCancel: () => void;
}) {
  // Focus moves here intentionally when a folder rename begins (inline edit
  // focus management). autoFocus is avoided so it doesn't steal focus on load;
  // instead the input is focused once on mount via a ref + effect.
  const inputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);
  return (
    <input
      ref={inputRef}
      aria-label="Folder name"
      value={value}
      onFocus={(event) => event.currentTarget.select()}
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      onChange={(event) => onChange(event.currentTarget.value)}
      onBlur={(event) => onCommit(event.currentTarget.value)}
      placeholder="Folder name"
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === "Enter") {
          event.preventDefault();
          onCommit(event.currentTarget.value);
          return;
        }
        if (event.key === "Escape") {
          event.preventDefault();
          onCancel();
        }
      }}
      className="h-5 min-w-0 flex-1 rounded-xs border border-divider bg-surface px-1.5 text-[10px] leading-3 text-ink outline-none placeholder:text-tertiary hover:border-tertiary focus:border-tertiary focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-focus/40"
    />
  );
}

function toUiNodes(nodes: LibraryTreeNode[], draggableFolders: boolean): UiTreeNode[] {
  return nodes.map((node) => {
    const item = node.item;
    const isItem = Boolean(item);
    return {
      id: node.id,
      label: node.label,
      ariaLabel: node.item ? getComponentName(node.item) : node.label,
      isLeaf: isItem,
      draggable: isItem || draggableFolders,
      icon: item ? (
        <Package
          size={TREE_ROW_ICON_SIZE}
          weight="regular"
          className={cn("shrink-0", getComponentIconColorClass(item))}
          aria-hidden="true"
        />
      ) : (
        <FolderSimple size={TREE_ROW_ICON_SIZE} weight="regular" className="shrink-0 text-tertiary" aria-hidden="true" />
      ),
      children: node.children?.length ? toUiNodes(node.children, draggableFolders) : undefined,
      data: { libraryNode: node },
    };
  });
}

function buildParentMap(
  nodes: LibraryTreeNode[],
  parentId: string | null = null,
  into = new Map<string, string | null>(),
): Map<string, string | null> {
  for (const node of nodes) {
    into.set(node.id, parentId);
    if (node.children?.length) buildParentMap(node.children, node.id, into);
  }
  return into;
}

function buildNodeMap(nodes: LibraryTreeNode[], into = new Map<string, LibraryTreeNode>()): Map<string, LibraryTreeNode> {
  for (const node of nodes) {
    into.set(node.id, node);
    if (node.children?.length) buildNodeMap(node.children, into);
  }
  return into;
}

function getLibraryNode(node: UiTreeNode): LibraryTreeNode | undefined {
  return node.data?.libraryNode as LibraryTreeNode | undefined;
}

const LIBRARY_TREE_SKELETON_ROWS = [
  { indent: 0, width: "62%" },
  { indent: 16, width: "74%" },
  { indent: 16, width: "48%" },
  { indent: 0, width: "54%" },
  { indent: 16, width: "68%" },
  { indent: 32, width: "42%" },
  { indent: 0, width: "58%" },
  { indent: 16, width: "52%" },
];

function LibraryTreeSkeleton({ ariaLabel }: { ariaLabel: string }) {
  return (
    <output aria-label={ariaLabel} className="block space-y-px py-0.5">
      {LIBRARY_TREE_SKELETON_ROWS.map((row, index) => (
        <div key={index} className="flex min-h-7 items-center px-1" aria-hidden="true">
          <span className="mr-0.5 size-3.5 shrink-0 rounded-xs bg-surfaceMuted" />
          <span className="mr-1.5 size-3 shrink-0 rounded-xs bg-surfaceMuted" style={{ marginLeft: row.indent }} />
          <span className="h-2.5 animate-pulse rounded-xs bg-surfaceMuted" style={{ width: row.width }} />
        </div>
      ))}
    </output>
  );
}

export function LibraryTree({
  nodes,
  selectedNodeId,
  expandedNodeIds,
  searchQuery,
  onSelect,
  onToggle,
  onItemAdd,
  onItemPreview,
  onItemEdit,
  onItemDuplicate,
  onItemToggleFavorite,
  onItemDelete,
  itemDestructiveActionLabel = "Delete",
  onCreateComponent,
  onFolderRename,
  addDisabled,
  addLabel,
  showItemAddAction,
  onItemDragStart,
  showThumbnails = false,
  editingNodeId,
  editingNodeValue = "",
  onEditingNodeValueChange,
  onEditingNodeCommit,
  onEditingNodeCancel,
  treeAriaLabel = "Library components",
  loading = false,
  loadingAriaLabel,
  sourceScopeLabel = "Library",
  selectable = false,
  checkedIds,
  onCheckToggle,
  onReorder,
  folderNestingEnabled = false,
  reorderDisabled = false,
}: LibraryTreeProps) {
  const [contextMenuNodeId, setContextMenuNodeId] = useState<string | null>(null);
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  // This flag is only ever read inside the context menu's close handler to
  // decide whether to suppress autofocus — it never appears in the visible
  // tree, so it is a ref (no re-render) rather than state. It is mutated only
  // inside event handlers (the rename click + the menu close handler), never
  // during render, and assigning ref.current is synchronous so the close
  // handler observes it before focus moves to the rename input.
  const suppressNextContextMenuCloseAutoFocusRef = useRef(false);
  const pendingContextMenuRenameNodeIdRef = useRef<string | null>(null);

  const reorderEnabled = Boolean(onReorder) && !reorderDisabled;
  const uiNodes = useMemo(() => toUiNodes(nodes, reorderEnabled), [nodes, reorderEnabled]);
  const parentByNodeId = useMemo(() => buildParentMap(nodes), [nodes]);
  const nodeById = useMemo(() => buildNodeMap(nodes), [nodes]);
  const searchActive = searchQuery.trim().length > 0;
  // Active searches reveal every match: the filtered tree renders fully
  // expanded instead of hiding hits under collapsed folders.
  const effectiveExpandedIds = useMemo(
    () => (searchActive ? getAllNodeIds(nodes) : expandedNodeIds),
    [searchActive, nodes, expandedNodeIds],
  );
  const canShowAddAction = showItemAddAction ?? Boolean(onItemAdd);

  const handleRowClick = useCallback(
    (nodeId: string, node: UiTreeNode) => {
      if (getLibraryNode(node)?.item) {
        onItemPreview?.(nodeId);
        return;
      }
      (onSelect ?? onToggle)(nodeId);
    },
    [onItemPreview, onSelect, onToggle],
  );

  const handleRowDoubleClick = useCallback(
    (nodeId: string, node: UiTreeNode) => {
      const item = getLibraryNode(node)?.item;
      if (!item || !canShowAddAction || addDisabled) return;
      onItemAdd?.(item);
    },
    [addDisabled, canShowAddAction, onItemAdd],
  );

  const handleNodeDragStart = useCallback(
    (nodeId: string, event: DragEvent<HTMLElement>) => {
      if (!onItemDragStart) return;
      const item = nodeById.get(nodeId)?.item;
      if (item) onItemDragStart(event, item);
    },
    [nodeById, onItemDragStart],
  );

  const handleCanDrag = useCallback(
    (node: UiTreeNode) => {
      if (getLibraryNode(node)?.item) return Boolean(onItemDragStart) || reorderEnabled;
      return reorderEnabled;
    },
    [onItemDragStart, reorderEnabled],
  );

  const handleCanReorderDrop = useCallback(
    (draggedId: string, targetId: string, position: TreeDropPosition) => {
      if (!reorderEnabled) return false;
      const dragged = nodeById.get(draggedId);
      const target = nodeById.get(targetId);
      if (!dragged || !target || dragged.item || target.item) return false;
      if (position === "inside") return folderNestingEnabled;
      return parentByNodeId.get(draggedId) === parentByNodeId.get(targetId);
    },
    [folderNestingEnabled, nodeById, parentByNodeId, reorderEnabled],
  );

  const handleReorderDrop = useCallback(
    (draggedId: string, targetId: string, position: TreeDropPosition) => {
      if (!reorderEnabled || (position === "inside" && !folderNestingEnabled)) return;
      onReorder?.(draggedId, targetId, position);
    },
    [folderNestingEnabled, onReorder, reorderEnabled],
  );

  const handleTreeContextMenu = useCallback((nodeId: string) => {
    setContextMenuNodeId(nodeId);
  }, []);

  // Wrapped in useStableCallback so the ref mutations live behind a stable
  // indirection (callbackRef.current(...)): the memo below references the
  // returned stable function, whose own body never writes refs during render.
  // The pending rename is consumed by onCloseAutoFocus, so the menu cannot
  // restore focus over the inline rename input.
  const startFolderRenameFromContextMenu = useStableCallback((nodeId: string) => {
    if (!onFolderRename) return;
    suppressNextContextMenuCloseAutoFocusRef.current = true;
    pendingContextMenuRenameNodeIdRef.current = nodeId;
  });

  const contextMenuGroups = useMemo<ActionMenuGroup[]>(() => {
    const contextNode = contextMenuNodeId ? nodeById.get(contextMenuNodeId) : null;
    if (!contextNode) return [];
    if (contextNode.item) {
      const item = contextNode.item;
      return createItemActionGroups({
        item,
        addDisabled,
        addLabel,
        onAdd: canShowAddAction ? () => onItemAdd?.(item) : undefined,
        onPreview: () => onItemPreview?.(contextNode.id),
        onEdit: onItemEdit ? () => onItemEdit(item) : undefined,
        onDuplicate: onItemDuplicate ? () => onItemDuplicate(item) : undefined,
        onToggleFavorite: onItemToggleFavorite ? () => onItemToggleFavorite(item) : undefined,
        onDelete: onItemDelete ? () => onItemDelete(item) : undefined,
        destructiveActionLabel: itemDestructiveActionLabel,
      });
    }
    return createFolderActionGroups({
      hasChildren: Boolean(contextNode.children?.length),
      expanded: effectiveExpandedIds.includes(contextNode.id),
      onSelect: () => (onSelect ?? onToggle)(contextNode.id),
      onToggle: () => onToggle(contextNode.id),
      onCreateComponent,
      // onRename fires only when the menu item is clicked (an event handler);
      // startFolderRenameFromContextMenu is a useStableCallback whose ref
      // mutation runs at click time, not during render.
      onRename: onFolderRename ? () => startFolderRenameFromContextMenu(contextNode.id) : undefined,
    });
  }, [
    addDisabled,
    addLabel,
    canShowAddAction,
    contextMenuNodeId,
    effectiveExpandedIds,
    nodeById,
    onCreateComponent,
    onItemAdd,
    onItemDelete,
    onItemDuplicate,
    onItemEdit,
    onItemPreview,
    onItemToggleFavorite,
    itemDestructiveActionLabel,
    onSelect,
    onFolderRename,
    startFolderRenameFromContextMenu,
    onToggle,
  ]);

  const renderLibraryRowLabel = useCallback(
    (treeNode: UiTreeNode) => {
      const item = getLibraryNode(treeNode)?.item;
      if (!item && treeNode.id === editingNodeId) {
        return (
          <FolderRenameInput
            value={editingNodeValue}
            onChange={(value) => onEditingNodeValueChange?.(value)}
            onCommit={(value) => onEditingNodeCommit?.(value)}
            onCancel={() => onEditingNodeCancel?.()}
          />
        );
      }
      if (!item) {
        return <span className="min-w-0 flex-1 truncate">{treeNode.label}</span>;
      }
      return (
        <LibraryItemRowContent
          item={item}
          addDisabled={addDisabled}
          addLabel={addLabel}
          showAddAction={canShowAddAction}
          showThumbnail={showThumbnails}
          sourceScopeLabel={sourceScopeLabel}
          onAdd={() => onItemAdd?.(item)}
        />
      );
    },
    [
      addDisabled,
      addLabel,
      canShowAddAction,
      editingNodeId,
      editingNodeValue,
      onEditingNodeCancel,
      onEditingNodeCommit,
      onEditingNodeValueChange,
      onItemAdd,
      showThumbnails,
      sourceScopeLabel,
    ],
  );

  if (loading) {
    return <LibraryTreeSkeleton ariaLabel={loadingAriaLabel ?? `Loading ${treeAriaLabel}`} />;
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
            ariaLabel={treeAriaLabel}
            className="relative min-h-7 overflow-visible"
            expandedIds={effectiveExpandedIds}
            onToggle={(nodeId) => onToggle(nodeId)}
            selectable={selectable}
            selectedIds={selectable ? (checkedIds ?? []) : selectedNodeId ? [selectedNodeId] : []}
            showSelectedBackground={false}
            onCheckboxToggle={
              selectable && onCheckToggle ? (nodeId, checked) => onCheckToggle(nodeId, checked) : undefined
            }
            currentId={selectable ? selectedNodeId : undefined}
            railsPinned={contextMenuOpen}
            draggable={Boolean(onItemDragStart) || reorderEnabled}
            canDrag={handleCanDrag}
            canDrop={handleCanReorderDrop}
            onDrop={reorderEnabled ? handleReorderDrop : undefined}
            onNodeDragStart={handleNodeDragStart}
            onRowClick={handleRowClick}
            onRowDoubleClick={handleRowDoubleClick}
            onContextMenu={handleTreeContextMenu}
            renderRow={renderLibraryRowLabel}
            virtualization={WORKSHOP_TREE_VIRTUALIZATION}
            emptyState={<span aria-hidden="true" />}
          />
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent
        data-library-tree-context-menu="true"
        alignOffset={4}
        onCloseAutoFocus={(event) => {
          if (!suppressNextContextMenuCloseAutoFocusRef.current) return;
          event.preventDefault();
          suppressNextContextMenuCloseAutoFocusRef.current = false;
          const pendingRenameNodeId = pendingContextMenuRenameNodeIdRef.current;
          pendingContextMenuRenameNodeIdRef.current = null;
          if (pendingRenameNodeId) onFolderRename?.(pendingRenameNodeId);
        }}
      >
        <ContextActionMenuContent groups={contextMenuGroups} />
      </ContextMenuContent>
    </ContextMenu>
  );
}
