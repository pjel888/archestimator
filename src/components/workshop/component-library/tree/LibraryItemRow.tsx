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
  showAddAction = true,
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
          if (showAddAction && !addDisabled) onAdd();
        }}
      >
        <Package size={12} weight="regular" className="shrink-0 text-tertiary" aria-hidden="true" />

        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="flex min-w-0 flex-1 flex-col">
            <span
              data-component-library-tree-label
              className="truncate text-[10px] font-medium leading-4 text-ink"
            >
              {name}
            </span>
            <span className="truncate text-[9px] leading-3 text-tertiary">
              {item.supplier}
            </span>
          </div>

          <div className="flex shrink-0 flex-col items-end">
            <span className="text-[9px] font-medium tabular-nums text-ink">
              {pesoFormatter.format(price)}
            </span>
            <span className="text-[9px] text-tertiary">/{item.unit}</span>
          </div>
        </div>

        {showAddAction ? (
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
              <Plus size={11} weight="regular" />
            </Button>
          </div>
        ) : null}
      </WorkshopTreeRow>
    </li>
  );
}
