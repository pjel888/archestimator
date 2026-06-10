"use client";

import { useCallback, useMemo, useState, type DragEvent } from "react";
import { FolderSimple, Package, Plus } from "@phosphor-icons/react/dist/ssr";

import { ContextActionMenuContent, type ActionMenuGroup } from "@/components/ui/action-menu";
import { Button } from "@/components/ui/button";
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from "@/components/ui/context-menu";
import { Tree, type TreeDropPosition, type TreeNode as UiTreeNode } from "@/components/ui/tree";
import type { EstimateRowItem } from "../../estimate-tree-data";
import { getComponentName, getComponentPrice, pesoFormatter } from "../helpers";
import { findNode, getAllNodeIds } from "./helpers";
import type { LibraryTreeProps, LibraryTreeNode } from "./types";

function createFolderActionGroups({
  hasChildren,
  expanded,
  onSelect,
  onToggle,
}: {
  hasChildren: boolean;
  expanded: boolean;
  onSelect: () => void;
  onToggle: () => void;
}): ActionMenuGroup[] {
  return [
    {
      id: "folder-actions",
      items: [
        { id: "select", label: "Select", onSelect },
        ...(hasChildren
          ? [
              {
                id: expanded ? "collapse" : "expand",
                label: expanded ? "Collapse" : "Expand",
                onSelect: onToggle,
              },
            ]
          : []),
      ],
    },
  ];
}

function createItemActionGroups({
  addDisabled,
  addLabel,
  onAdd,
  onPreview,
}: {
  addDisabled?: boolean;
  addLabel?: string;
  onAdd?: () => void;
  onPreview: () => void;
}): ActionMenuGroup[] {
  return [
    {
      id: "component-actions",
      items: [
        { id: "preview", label: "Preview", onSelect: onPreview },
        ...(onAdd
          ? [
              {
                id: "add",
                label: addDisabled ? "Add" : (addLabel ?? "Add"),
                disabled: addDisabled,
                disabledReason: addDisabled ? "Select an area before adding this component." : undefined,
                onSelect: onAdd,
              },
            ]
          : []),
      ],
    },
  ];
}

function LibraryItemRowContent({
  item,
  addDisabled = false,
  addLabel,
  showAddAction,
  onAdd,
}: {
  item: EstimateRowItem;
  addDisabled?: boolean;
  addLabel?: string;
  showAddAction: boolean;
  onAdd: () => void;
}) {
  const name = getComponentName(item);
  const price = getComponentPrice(item);
  const resolvedAddLabel = addDisabled
    ? `Select an area before adding ${name}`
    : addLabel
      ? `${addLabel}: ${name}`
      : `Add ${name} to selected estimate area`;

  return (
    <span className="flex min-w-0 flex-1 items-center gap-1.5 py-0.5">
      <span className="flex min-w-0 flex-1 flex-col">
        <span data-component-library-tree-label className="truncate text-[10px] font-medium leading-4 text-ink">
          {name}
        </span>
        <span className="truncate text-[9px] leading-3 text-tertiary">{item.supplier}</span>
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
        <Package size={12} weight="regular" className="shrink-0 text-tertiary" aria-hidden="true" />
      ) : (
        <FolderSimple size={12} weight="regular" className="shrink-0 text-tertiary" aria-hidden="true" />
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

function getLibraryNode(node: UiTreeNode): LibraryTreeNode | undefined {
  return node.data?.libraryNode as LibraryTreeNode | undefined;
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
  addDisabled,
  addLabel,
  showItemAddAction,
  onItemDragStart,
  selectable = false,
  checkedIds,
  onCheckToggle,
  onReorder,
  reorderDisabled = false,
}: LibraryTreeProps) {
  const [contextMenuNodeId, setContextMenuNodeId] = useState<string | null>(null);

  const reorderEnabled = Boolean(onReorder) && !reorderDisabled;
  const uiNodes = useMemo(() => toUiNodes(nodes, reorderEnabled), [nodes, reorderEnabled]);
  const parentByNodeId = useMemo(() => buildParentMap(nodes), [nodes]);
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
      const item = findNode(nodes, nodeId)?.item;
      if (item) onItemDragStart(event, item);
    },
    [nodes, onItemDragStart],
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

  const contextMenuGroups = useMemo<ActionMenuGroup[]>(() => {
    const contextNode = contextMenuNodeId ? findNode(nodes, contextMenuNodeId) : null;
    if (!contextNode) return [];
    if (contextNode.item) {
      const item = contextNode.item;
      return createItemActionGroups({
        addDisabled,
        addLabel,
        onAdd: canShowAddAction ? () => onItemAdd?.(item) : undefined,
        onPreview: () => onItemPreview?.(contextNode.id),
      });
    }
    return createFolderActionGroups({
      hasChildren: Boolean(contextNode.children?.length),
      expanded: effectiveExpandedIds.includes(contextNode.id),
      onSelect: () => (onSelect ?? onToggle)(contextNode.id),
      onToggle: () => onToggle(contextNode.id),
    });
  }, [
    addDisabled,
    addLabel,
    canShowAddAction,
    contextMenuNodeId,
    effectiveExpandedIds,
    nodes,
    onItemAdd,
    onItemPreview,
    onSelect,
    onToggle,
  ]);

  const renderLibraryRowLabel = useCallback(
    (treeNode: UiTreeNode) => {
      const item = getLibraryNode(treeNode)?.item;
      if (!item) {
        return <span className="min-w-0 flex-1 truncate">{treeNode.label}</span>;
      }
      return (
        <LibraryItemRowContent
          item={item}
          addDisabled={addDisabled}
          addLabel={addLabel}
          showAddAction={canShowAddAction}
          onAdd={() => onItemAdd?.(item)}
        />
      );
    },
    [addDisabled, addLabel, canShowAddAction, onItemAdd],
  );

  if (nodes.length === 0) {
    return (
      <div className="rounded-xs border border-dashed border-hairline bg-surfaceMuted p-2 text-[10px] leading-4 text-tertiary">
        No matches for &quot;{searchQuery}&quot;.
      </div>
    );
  }

  return (
    <ContextMenu>
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
            ariaLabel="Library components"
            className="relative min-h-7 overflow-visible"
            expandedIds={effectiveExpandedIds}
            onToggle={(nodeId) => onToggle(nodeId)}
            selectable={selectable}
            selectedIds={selectable ? (checkedIds ?? []) : selectedNodeId ? [selectedNodeId] : []}
            onCheckboxToggle={
              selectable && onCheckToggle ? (nodeId, checked) => onCheckToggle(nodeId, checked) : undefined
            }
            currentId={selectable ? selectedNodeId : undefined}
            draggable={Boolean(onItemDragStart) || reorderEnabled}
            canDrag={handleCanDrag}
            canDrop={handleCanReorderDrop}
            onDrop={reorderEnabled ? handleReorderDrop : undefined}
            onNodeDragStart={handleNodeDragStart}
            onRowClick={handleRowClick}
            onRowDoubleClick={handleRowDoubleClick}
            onContextMenu={handleTreeContextMenu}
            renderRow={renderLibraryRowLabel}
          />
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent data-library-tree-context-menu="true" alignOffset={4}>
        <ContextActionMenuContent groups={contextMenuGroups} />
      </ContextMenuContent>
    </ContextMenu>
  );
}
