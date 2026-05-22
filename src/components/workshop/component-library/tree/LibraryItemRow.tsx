"use client";

import { Plus, Package } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { WorkshopTreeRow } from "@/components/workshop/workshop-tree";
import type { LibraryItemRowProps } from "./types";
import {
  getComponentName,
  getComponentPrice,
  pesoFormatter,
} from "../helpers";

export function LibraryItemRow({
  node,
  depth,
  selected,
  onPreview,
  onAdd,
  addDisabled = false,
  addLabel,
  onDragStart,
  contextMenuGroups,
}: LibraryItemRowProps) {
  const item = node.item!;
  const name = getComponentName(item);
  const price = getComponentPrice(item);
  const resolvedAddLabel = addDisabled
    ? `Select an area before adding ${name}`
    : addLabel
      ? `${addLabel}: ${name}`
      : `Add ${name} to selected estimate area`;

  return (
    <li role="none">
      <WorkshopTreeRow
        as="div"
        role="treeitem"
        aria-label={name}
        aria-selected={selected}
        draggable={Boolean(onDragStart)}
        onDragStart={onDragStart}
        depth={depth}
        selected={selected}
        contextMenuGroups={contextMenuGroups}
        className="cursor-pointer gap-1.5"
        onClick={onPreview}
        onDoubleClick={() => {
          if (!addDisabled) onAdd();
        }}
      >
        <Package size={12} weight="bold" className="shrink-0 text-tertiary" aria-hidden="true" />
        <span data-component-library-tree-label className="min-w-0 flex-1 truncate text-[10px] font-semibold leading-4 text-ink">
          {name}
        </span>
        <span className="hidden shrink-0 truncate text-[9px] text-tertiary lg:block">
          {item.supplier}
        </span>
        <span className="shrink-0 text-[9px] font-bold tabular-nums text-ink">
          {pesoFormatter.format(price)}
        </span>
        <span className="shrink-0 text-[9px] text-tertiary">/{item.unit}</span>
        <div className="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100">
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
          >
            <Plus size={11} weight="bold" />
          </Button>
        </div>
      </WorkshopTreeRow>
    </li>
  );
}
