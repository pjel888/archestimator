"use client";

import type { DragEvent, ReactNode } from "react";

import type { ActionMenuGroup } from "@/components/ui/action-menu";
import { WorkshopTree } from "@/components/workshop/workshop-tree";
import type { LibraryTreeProps, LibraryTreeNode } from "./types";
import { LibraryFolderRow } from "./LibraryFolderRow";
import { LibraryItemRow } from "./LibraryItemRow";

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
  onAdd: () => void;
  onPreview: () => void;
}): ActionMenuGroup[] {
  return [
    {
      id: "component-actions",
      items: [
        { id: "preview", label: "Preview", onSelect: onPreview },
        {
          id: "add",
          label: addDisabled ? "Add" : (addLabel ?? "Add"),
          disabled: addDisabled,
          disabledReason: addDisabled ? "Select an area before adding this component." : undefined,
          onSelect: onAdd,
        },
      ],
    },
  ];
}

function TreeNode({
  node,
  depth,
  selected,
  expanded,
  hasChildren,
  children,
  onSelect,
  onToggle,
  onItemAdd,
  onItemPreview,
  addDisabled,
  addLabel,
  onItemDragStart,
}: {
  node: LibraryTreeNode;
  depth: number;
  selected: boolean;
  expanded: boolean;
  hasChildren: boolean;
  children: ReactNode;
  onSelect: (nodeId: string) => void;
  onToggle: (nodeId: string) => void;
  onItemAdd?: (item: LibraryTreeNode["item"]) => void;
  onItemPreview?: (itemId: string) => void;
  addDisabled?: boolean;
  addLabel?: string;
  onItemDragStart?: (event: DragEvent<HTMLElement>, item: LibraryTreeNode["item"]) => void;
}) {
  if (node.item) {
    const item = node.item;
    const handlePreview = () => onItemPreview?.(node.id);
    const handleAdd = () => {
      onItemAdd?.(item);
    };

    return (
      <LibraryItemRow
        node={node}
        depth={depth}
        selected={selected}
        onPreview={handlePreview}
        onAdd={handleAdd}
        addDisabled={addDisabled}
        addLabel={addLabel}
        onDragStart={
          onItemDragStart
            ? (event) => onItemDragStart(event, item)
            : undefined
        }
        contextMenuGroups={createItemActionGroups({
          addDisabled,
          addLabel,
          onAdd: handleAdd,
          onPreview: handlePreview,
        })}
      />
    );
  }

  return (
    <>
      <LibraryFolderRow
        node={node}
        depth={depth}
        expanded={expanded}
        selected={selected}
        onToggle={() => onToggle(node.id)}
        onSelect={() => onSelect(node.id)}
        contextMenuGroups={createFolderActionGroups({
          hasChildren,
          expanded,
          onSelect: () => onSelect(node.id),
          onToggle: () => onToggle(node.id),
        })}
      />
      {children}
    </>
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
  addDisabled,
  addLabel,
  onItemDragStart,
}: LibraryTreeProps) {
  if (nodes.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-hairline bg-surfaceMuted p-2 text-[10px] leading-4 text-tertiary">
        No matches for &quot;{searchQuery}&quot;.
      </div>
    );
  }

  return (
    <WorkshopTree
      nodes={nodes}
      selectedNodeId={selectedNodeId}
      expandedNodeIds={expandedNodeIds}
      getNodeId={(node) => node.id}
      getChildren={(node) => node.children}
      renderNode={({ node, depth, selected, expanded, hasChildren, children }) => (
        <TreeNode
          node={node}
          depth={depth}
          selected={selected}
          expanded={expanded}
          hasChildren={hasChildren}
          onSelect={onSelect}
          onToggle={onToggle}
          onItemAdd={onItemAdd}
          onItemPreview={onItemPreview}
          addDisabled={addDisabled}
          addLabel={addLabel}
          onItemDragStart={onItemDragStart}
        >
          {children}
        </TreeNode>
      )}
    />
  );
}
