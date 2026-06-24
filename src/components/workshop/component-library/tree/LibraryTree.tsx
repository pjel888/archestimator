"use client";

import { useCallback, useMemo, useState, type DragEvent } from "react";
import Image from "next/image";
import { flushSync } from "react-dom";
import {
  CaretDown,
  CaretRight,
  CopySimple,
  Eye,
  FolderSimple,
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
import { WORKSHOP_TREE_VIRTUALIZATION } from "@/lib/workshop/virtualization-flags";
import type { EstimateRowItem } from "../../estimate-tree-data";
import { SourceTrustChips } from "../../library/source-trust-chips";
import { getComponentSourceTrustChips } from "../../library/source-trust-model";
import { getComponentName, getComponentPrice, pesoFormatter } from "../helpers";
import { getAllNodeIds } from "./helpers";
import type { LibraryTreeProps, LibraryTreeNode } from "./types";

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
        ? [{ id: "delete", label: "Delete", icon: menuIcon(Trash), tone: "destructive" as const, onSelect: onDelete }]
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
  showSourceTrustChips,
  sourceScopeLabel = "Library",
  onAdd,
}: {
  item: EstimateRowItem;
  addDisabled?: boolean;
  addLabel?: string;
  showAddAction: boolean;
  showThumbnail: boolean;
  showSourceTrustChips: boolean;
  sourceScopeLabel?: string;
  onAdd: () => void;
}) {
  const name = getComponentName(item);
  const price = getComponentPrice(item);
  const trustChips = showSourceTrustChips ? getComponentSourceTrustChips(item) : [];
  const sourceScope = sourceScopeLabel.trim();
  const supplierLabel = item.supplier || "No supplier";
  const sourceLabel = sourceScope ? `${sourceScope} · ${supplierLabel}` : supplierLabel;
  const resolvedAddLabel = addDisabled
    ? `Select an area before adding ${name}`
    : addLabel
      ? `${addLabel}: ${name}`
      : `Add ${name} to selected estimate area`;

  return (
    <span className="flex min-w-0 flex-1 items-center gap-1.5 py-0.5">
      {showThumbnail ? <LibraryItemThumbnail item={item} /> : null}
      <span className="flex min-w-0 flex-1 flex-col">
        <span data-component-library-tree-label className="truncate text-[10px] font-medium leading-4 text-ink">
          {name}
        </span>
        <span className="truncate text-[9px] leading-3 text-tertiary">{sourceLabel}</span>
        {showSourceTrustChips ? (
          <SourceTrustChips
            chips={trustChips}
            ariaLabel={`${name} source trust`}
            className="mt-0.5"
            maxChips={3}
          />
        ) : null}
      </span>
      <span className="flex shrink-0 flex-col items-end">
        <span className="text-[9px] font-medium tabular-nums text-ink">{pesoFormatter.format(price)}</span>
        <span className="text-[9px] text-tertiary">/{item.unit}</span>
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

const COMPONENT_IMAGE_ROUTE_PREFIX = "/api/component-library/images";
const COMPONENT_IMAGE_ROUTE_ORIGIN = "https://component-library-images.local";
const COMPONENT_IMAGE_ROUTE_PATH_PATTERN = /^[A-Za-z0-9._-]+\.(?:avif|jpe?g|png|webp)$/i;

function normalizeComponentImageRouteUrl(url: string) {
  if (url.includes("..") || url.includes("\\") || url.includes("#") || /%(?:2e|2f|5c)/i.test(url)) return "";

  try {
    const parsed = new URL(url, COMPONENT_IMAGE_ROUTE_ORIGIN);
    const pathParams = parsed.searchParams.getAll("path");
    const paramNames = Array.from(parsed.searchParams.keys());
    if (parsed.origin !== COMPONENT_IMAGE_ROUTE_ORIGIN) return "";
    if (parsed.pathname !== COMPONENT_IMAGE_ROUTE_PREFIX) return "";
    if (parsed.hash || paramNames.length !== 1 || paramNames[0] !== "path" || pathParams.length !== 1) return "";
    if (!COMPONENT_IMAGE_ROUTE_PATH_PATTERN.test(pathParams[0] ?? "")) return "";
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return "";
  }
}

function readLibraryItemThumbnailUrl(item: EstimateRowItem) {
  const url = typeof item.imageUrl === "string" ? item.imageUrl.trim() : "";
  if (!url) return "";
  if (url.startsWith("/") && !url.startsWith("//")) {
    const routeUrl = normalizeComponentImageRouteUrl(url);
    if (routeUrl) return routeUrl;
  }
  return normalizeEstimateRowImageUrl(url) ?? "";
}

function LibraryItemThumbnail({ item }: { item: EstimateRowItem }) {
  const [failed, setFailed] = useState(false);
  const thumbnailUrl = failed ? "" : readLibraryItemThumbnailUrl(item);
  return (
    <span
      data-component-library-row-thumbnail
      className="relative grid size-6 shrink-0 place-items-center overflow-hidden rounded-xs border border-hairline bg-surface-muted"
      aria-hidden="true"
    >
      {thumbnailUrl ? (
        <Image
          src={thumbnailUrl}
          alt=""
          fill
          sizes="24px"
          unoptimized
          loading="lazy"
          className="object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <Package size={12} weight="regular" aria-hidden="true" className="text-tertiary" />
      )}
    </span>
  );
}

function toUiNodes(nodes: LibraryTreeNode[], draggableFolders: boolean): UiTreeNode[] {
  return nodes.map((node) => {
    const isItem = Boolean(node.item);
    return {
      id: node.id,
      label: node.label,
      ariaLabel: node.item ? getComponentName(node.item) : node.label,
      isLeaf: isItem,
      draggable: isItem || draggableFolders,
      icon: isItem ? (
        <Package size={TREE_ROW_ICON_SIZE} weight="regular" className="shrink-0 text-tertiary" aria-hidden="true" />
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

function LibraryTreeSkeleton({ ariaLabel }: { ariaLabel: string }) {
  const rows = [
    { indent: 0, width: "62%" },
    { indent: 16, width: "74%" },
    { indent: 16, width: "48%" },
    { indent: 0, width: "54%" },
    { indent: 16, width: "68%" },
    { indent: 32, width: "42%" },
    { indent: 0, width: "58%" },
    { indent: 16, width: "52%" },
  ];

  return (
    <output aria-label={ariaLabel} className="block space-y-px py-0.5">
      {rows.map((row, index) => (
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
  onCreateComponent,
  onFolderRename,
  addDisabled,
  addLabel,
  showItemAddAction,
  onItemDragStart,
  showThumbnails = false,
  showSourceTrustChips = true,
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
  reorderDisabled = false,
}: LibraryTreeProps) {
  const [contextMenuNodeId, setContextMenuNodeId] = useState<string | null>(null);
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [suppressNextContextMenuCloseAutoFocus, setSuppressNextContextMenuCloseAutoFocus] = useState(false);

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

  // The taxonomy is fixed: drops only rearrange siblings under one parent.
  const handleCanReorderDrop = useCallback(
    (draggedId: string, targetId: string, position: TreeDropPosition) => {
      if (!reorderEnabled || position === "inside") return false;
      return parentByNodeId.get(draggedId) === parentByNodeId.get(targetId);
    },
    [parentByNodeId, reorderEnabled],
  );

  const handleReorderDrop = useCallback(
    (draggedId: string, targetId: string, position: TreeDropPosition) => {
      if (!reorderEnabled || position === "inside") return;
      onReorder?.(draggedId, targetId, position);
    },
    [onReorder, reorderEnabled],
  );

  const handleTreeContextMenu = useCallback((nodeId: string) => {
    setContextMenuNodeId(nodeId);
  }, []);

  const startFolderRenameFromContextMenu = useCallback((nodeId: string) => {
    if (!onFolderRename) return;
    flushSync(() => setSuppressNextContextMenuCloseAutoFocus(true));
    window.setTimeout(() => {
      onFolderRename(nodeId);
    }, 0);
  }, [onFolderRename]);

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
      });
    }
    return createFolderActionGroups({
      hasChildren: Boolean(contextNode.children?.length),
      expanded: effectiveExpandedIds.includes(contextNode.id),
      onSelect: () => (onSelect ?? onToggle)(contextNode.id),
      onToggle: () => onToggle(contextNode.id),
      onCreateComponent,
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
          <input
            aria-label="Folder name"
            value={editingNodeValue}
            autoFocus
            onFocus={(event) => event.currentTarget.select()}
            onClick={(event) => event.stopPropagation()}
            onMouseDown={(event) => event.stopPropagation()}
            onChange={(event) => onEditingNodeValueChange?.(event.currentTarget.value)}
            onBlur={(event) => onEditingNodeCommit?.(event.currentTarget.value)}
            onKeyDown={(event) => {
              event.stopPropagation();
              if (event.key === "Enter") {
                event.preventDefault();
                onEditingNodeCommit?.(event.currentTarget.value);
                return;
              }
              if (event.key === "Escape") {
                event.preventDefault();
                onEditingNodeCancel?.();
              }
            }}
            className="h-5 min-w-0 flex-1 rounded-xs border border-divider bg-surface px-1.5 text-[10px] leading-3 text-ink outline-none focus:border-ink focus:ring-1 focus:ring-ink/20"
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
          showSourceTrustChips={showSourceTrustChips}
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
      showSourceTrustChips,
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
          if (!suppressNextContextMenuCloseAutoFocus) return;
          event.preventDefault();
          setSuppressNextContextMenuCloseAutoFocus(false);
        }}
      >
        <ContextActionMenuContent groups={contextMenuGroups} />
      </ContextMenuContent>
    </ContextMenu>
  );
}
