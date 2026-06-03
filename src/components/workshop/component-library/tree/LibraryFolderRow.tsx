"use client";

import { CaretDown, CaretRight, FolderSimple } from "@phosphor-icons/react/dist/ssr";
import { WORKSHOP_TREE_ICON_SLOT_CLASS } from "@/components/workshop/tree-visual-style";
import { TreeDragHandle } from "@/components/workshop/tree-row-affordances";
import { WorkshopTreeRow } from "@/components/workshop/workshop-tree";
import { cn } from "@/lib/ui/cn";
import type { LibraryFolderRowProps } from "./types";

export function LibraryFolderRow({
  node,
  depth,
  expanded,
  selected,
  onToggle,
  onSelect,
  contextMenuGroups,
}: LibraryFolderRowProps) {
  const hasChildren = Boolean(node.children?.length);

  return (
    <li role="none">
      <WorkshopTreeRow
        role="treeitem"
        aria-label={node.label}
        aria-selected={selected}
        aria-expanded={hasChildren ? expanded : undefined}
        data-component-library-tree-node-id={node.id}
        depth={depth}
        selected={selected}
        dragHandleSlot={<TreeDragHandle />}
        contextMenuGroups={contextMenuGroups}
        className="gap-1"
        onClick={() => onSelect()}
      >
        <span
          className={cn(WORKSHOP_TREE_ICON_SLOT_CLASS, "hover:bg-white")}
          onClick={(event) => {
            if (!hasChildren) return;
            event.stopPropagation();
            onToggle();
          }}
        >
          {hasChildren ? (
            expanded ? (
              <CaretDown size={11} weight="regular" aria-hidden="true" />
            ) : (
              <CaretRight size={11} weight="regular" aria-hidden="true" />
            )
          ) : null}
        </span>
        <FolderSimple size={12} weight="regular" className="shrink-0 text-tertiary" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate">{node.label}</span>
      </WorkshopTreeRow>
    </li>
  );
}
