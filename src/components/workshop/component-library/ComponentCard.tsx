"use client";

import { type DragEvent } from "react";
import { DotsSixVertical, DotsThreeVertical, Heart, Plus, PencilSimple, Trash } from "@phosphor-icons/react/dist/ssr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/ui/cn";
import type { EstimateRowItem } from "../estimate-tree-data";
import type { LibraryViewMode } from "./types";
import {
  getComponentDesignation,
  getComponentDiscipline,
  getComponentImageUrl,
  getComponentName,
  getComponentPrice,
  getStalenessLabel,
  getStalenessTone,
  pesoFormatter,
} from "./helpers";

function HighlightMatch({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const index = text.toLowerCase().indexOf(q.toLowerCase());
  if (index < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, index)}
      <mark className="bg-accentSoft px-0.5 text-ink">{text.slice(index, index + q.length)}</mark>
      {text.slice(index + q.length)}
    </>
  );
}

function ComponentThumb({ item, size = "sm" }: { item: EstimateRowItem; size?: "sm" | "md" | "lg" }) {
  const imageUrl = getComponentImageUrl(item);
  return (
    <span
      className={cn(
        "block shrink-0 overflow-hidden border border-hairline bg-surfaceMuted bg-cover bg-center",
        size === "sm" ? "size-7" : size === "md" ? "size-11" : "aspect-square w-full",
      )}
      style={{ backgroundImage: `url(${imageUrl})` }}
      aria-hidden="true"
    />
  );
}

type LibraryItemCardProps = {
  item: EstimateRowItem;
  viewMode: LibraryViewMode;
  query: string;
  selected: boolean;
  onPreview: () => void;
  onEdit: () => void;
  onAdd: () => void;
  onFavorite: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  addDisabled?: boolean;
  addLabel?: string;
  bulkSelected?: boolean;
  onToggleBulkSelected?: () => void;
  previewTabIndex?: number;
  onPreviewFocus?: () => void;
};

function stalenessClass(tone: ReturnType<typeof getStalenessTone>) {
  if (tone === "danger") return "text-danger";
  if (tone === "warning") return "text-warning";
  if (tone === "success") return "text-success";
  return "text-tertiary";
}

export function LibraryItemCard({
  item,
  viewMode,
  query,
  selected,
  onPreview,
  onEdit,
  onAdd,
  onFavorite,
  onDuplicate,
  onDelete,
  addDisabled = false,
  addLabel,
  bulkSelected = false,
  onToggleBulkSelected,
  previewTabIndex = 0,
  onPreviewFocus,
}: LibraryItemCardProps) {
  function handleDragStart(event: DragEvent<HTMLElement>) {
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData("application/x-archestimator-library-item", JSON.stringify(item));
    event.dataTransfer.setData("text/plain", getComponentName(item));

    const dragGhost = document.createElement("div");
    dragGhost.className = "fixed -top-96 left-0 flex items-center gap-2 border border-hairline bg-white px-2 py-1 text-[10px] font-medium text-ink shadow-lg";
    dragGhost.textContent = `${getComponentName(item)} · ${pesoFormatter.format(getComponentPrice(item))}`;
    document.body.appendChild(dragGhost);
    event.dataTransfer.setDragImage(dragGhost, 12, 12);
    window.setTimeout(() => dragGhost.remove(), 0);
  }

  const name = getComponentName(item);
  const price = getComponentPrice(item);
  const favorite = Boolean(item.isFavorite);
  const stalenessTone = getStalenessTone(item.pricingDate);
  const stalenessLabel = getStalenessLabel(item.pricingDate);
  const sourceLabel = item.pricingSource || item.supplier || "Library";
  const resolvedAddLabel = addLabel ?? `Add ${name} to selected estimate area`;
  const sourceMeta = stalenessLabel ? `${sourceLabel} · ${stalenessLabel}` : sourceLabel;

  const SelectionControl = onToggleBulkSelected ? (
    <label
      className="inline-flex size-5 shrink-0 cursor-pointer items-center justify-center border border-hairline bg-white text-tertiary hover:border-accent"
      aria-label={`Select ${name}`}
      onClick={(event) => event.stopPropagation()}
    >
      <input
        type="checkbox"
        checked={bulkSelected}
        onChange={onToggleBulkSelected}
        className="size-3 accent-primary"
      />
    </label>
  ) : null;

  const ActionButtons = (
    <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
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
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className={cn("size-5 p-0", favorite ? "text-accent" : "text-tertiary hover:text-ink")}
        aria-label={`${favorite ? "Unfavorite" : "Favorite"} ${name}`}
        onClick={(event) => {
          event.stopPropagation();
          onFavorite();
        }}
      >
        <Heart size={11} weight="regular" />
      </Button>
      <details className="relative" onClick={(event) => event.stopPropagation()}>
        <summary
          className="grid size-5 cursor-pointer list-none place-items-center rounded-xs text-tertiary hover:bg-surfaceMuted hover:text-ink"
          aria-label={`More actions for ${name}`}
        >
          <DotsThreeVertical size={11} weight="regular" />
        </summary>
        <div className="absolute right-0 z-20 mt-1 w-28 border border-hairline bg-white p-1 shadow-lg">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="flex h-auto min-h-0 w-full justify-start gap-1.5 rounded-xs px-1.5 py-1 text-left hover:bg-surfaceMuted"
            onClick={onEdit}
          >
            <PencilSimple size={10} />
            Edit
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="flex h-auto min-h-0 w-full justify-start gap-1.5 rounded-xs px-1.5 py-1 text-left hover:bg-surfaceMuted"
            onClick={onDuplicate}
          >
            <Plus size={10} />
            Duplicate
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="flex h-auto min-h-0 w-full justify-start gap-1.5 rounded-xs px-1.5 py-1 text-left text-danger hover:bg-dangerSoft"
            onClick={onDelete}
          >
            <Trash size={10} />
            Delete
          </Button>
        </div>
      </details>
    </div>
  );

  if (viewMode === "grid") {
    return (
      <div
        className={cn(
          "group relative overflow-hidden border border-hairline bg-white text-left transition hover:border-tertiary hover:shadow-[0_6px_14px_rgba(15,23,42,0.07)] focus-within:ring-2 focus-within:ring-focus focus-within:ring-offset-1",
          selected && "border-accent ring-1 ring-accent",
          bulkSelected && "border-ink ring-1 ring-ink",
        )}
      >
        {SelectionControl ? <div className="absolute top-1 left-1 z-10">{SelectionControl}</div> : null}
        <button
          type="button"
          draggable
          onDragStart={handleDragStart}
          onClick={onPreview}
          onFocus={onPreviewFocus}
          tabIndex={previewTabIndex}
          data-library-card-button="true"
          data-library-item-id={item.id}
          className="block w-full cursor-grab text-left focus-visible:outline-none active:cursor-grabbing"
          aria-label={`Preview ${name}`}
        >
          <span className="relative block aspect-[4/3] w-full overflow-hidden bg-surfaceMuted">
            <ComponentThumb item={item} size="lg" />
            <span className="absolute inset-x-0 bottom-0 bg-white/90 px-1.5 py-1 backdrop-blur-sm">
              <span className="block truncate text-[9px] font-medium leading-3 text-ink">
                <HighlightMatch text={name} query={query} />
              </span>
              <span className="block truncate font-sans text-[9px] font-medium tabular-nums text-ink">
                {pesoFormatter.format(price)} / {item.unit}
              </span>
              <span className={cn("block truncate text-[8px] font-medium leading-3", stalenessClass(stalenessTone))}>
                {sourceMeta}
              </span>
            </span>
          </span>
        </button>
        <div className="flex items-center justify-between gap-1 px-1.5 py-1">
          <span className="block truncate text-[9px] font-medium text-tertiary">{item.supplier || "No supplier"}</span>
          {ActionButtons}
        </div>
      </div>
    );
  }

  const isDetailed = viewMode === "detailed";

  return (
    <div
      className={cn(
        "group flex items-stretch gap-1.5 border border-hairline bg-white p-1 text-left transition hover:border-tertiary hover:shadow-[0_6px_14px_rgba(15,23,42,0.07)] focus-within:ring-2 focus-within:ring-focus focus-within:ring-offset-1",
        isDetailed ? "min-h-[68px]" : "min-h-[40px]",
        selected && "border-accent ring-1 ring-accent",
        bulkSelected && "border-ink ring-1 ring-ink",
      )}
    >
      {SelectionControl ? <div className="flex items-start pt-0.5">{SelectionControl}</div> : null}
      <button
        type="button"
        draggable
        onDragStart={handleDragStart}
        onClick={onPreview}
        onFocus={onPreviewFocus}
        tabIndex={previewTabIndex}
        data-library-card-button="true"
        data-library-item-id={item.id}
        className="flex min-w-0 flex-1 cursor-grab items-stretch gap-1.5 text-left focus-visible:outline-none active:cursor-grabbing"
        aria-label={`Preview ${name}`}
      >
        <ComponentThumb item={item} size={isDetailed ? "md" : "sm"} />
        <span className="flex min-w-0 flex-1 flex-col justify-center">
          <span className="flex items-start justify-between gap-1">
          <span className={cn("block truncate font-medium leading-3 text-ink", isDetailed ? "text-[10px]" : "text-[10px]")}>
            <HighlightMatch text={name} query={query} />
          </span>
        </span>
        <span className="mt-0.5 block truncate text-[9px] font-medium leading-3 text-tertiary">
          {item.supplier || "No supplier"} · {item.category}
        </span>
        <span className="mt-0.5 block font-sans text-[9px] font-medium tabular-nums text-ink">
          {pesoFormatter.format(price)} / {item.unit}
        </span>
        <span className={cn("mt-0.5 block truncate text-[8px] font-medium leading-3", stalenessClass(stalenessTone))}>
          {sourceMeta}
        </span>
        {isDetailed ? (
          <>
            <span className="mt-1 block line-clamp-2 text-[9px] leading-3 text-secondary/60">{item.description}</span>
            <div className="mt-1 flex flex-wrap gap-1">
              <Badge size="xs">
                {getComponentDiscipline(item)}
              </Badge>
              <Badge size="xs">
                {getComponentDesignation(item)}
              </Badge>
              {item.isCustom ? (
                <Badge size="xs" tone="accent">
                  Custom
                </Badge>
              ) : null}
            </div>
          </>
        ) : null}
        </span>
      </button>
      <div className="flex shrink-0 flex-col items-end justify-between gap-0.5">
        <DotsSixVertical size={12} className="text-tertiary" aria-hidden="true" />
        {ActionButtons}
      </div>
    </div>
  );
}
