"use client";

import { type DragEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { DotsSixVertical, DotsThreeVertical, Heart, Plus, PencilSimple, Trash } from "@phosphor-icons/react/dist/ssr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/ui/cn";
import type { EstimateRowItem } from "../estimate-tree-data";
import type { LibraryViewMode } from "./types";
import { getComponentImageUrl, getComponentName, getComponentPrice, pesoFormatter } from "./helpers";

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
  onAdd: () => void;
  onFavorite: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
};

export function LibraryItemCard({ item, viewMode, query, selected, onPreview, onAdd, onFavorite, onDuplicate, onDelete }: LibraryItemCardProps) {
  function handleDragStart(event: DragEvent) {
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData("application/x-archestimator-library-item", JSON.stringify(item));
    event.dataTransfer.setData("text/plain", getComponentName(item));
  }

  function handlePreviewKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.defaultPrevented) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onPreview();
  }

  const name = getComponentName(item);
  const price = getComponentPrice(item);
  const favorite = Boolean(item.isFavorite);

  const ActionButtons = (
    <span className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="size-5 p-0 text-tertiary hover:text-ink"
        aria-label={`Add ${name} to selected estimate area`}
        onClick={(event) => {
          event.stopPropagation();
          onAdd();
        }}
      >
        <Plus size={11} weight="bold" />
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
        <Heart size={11} weight={favorite ? "fill" : "bold"} />
      </Button>
      <details className="relative" onClick={(event) => event.stopPropagation()}>
        <summary
          className="grid size-5 cursor-pointer list-none place-items-center rounded-sm text-tertiary hover:bg-surfaceMuted hover:text-ink"
          tabIndex={-1}
          aria-label={`More actions for ${name}`}
        >
          <DotsThreeVertical size={11} weight="bold" />
        </summary>
        <div className="absolute right-0 z-20 mt-1 w-28 border border-hairline bg-white p-1 shadow-lg">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="flex h-auto min-h-0 w-full justify-start gap-1.5 rounded-none px-1.5 py-1 text-left hover:bg-surfaceMuted"
            onClick={onPreview}
          >
            <PencilSimple size={10} />
            Edit
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="flex h-auto min-h-0 w-full justify-start gap-1.5 rounded-none px-1.5 py-1 text-left hover:bg-surfaceMuted"
            onClick={onDuplicate}
          >
            <Plus size={10} />
            Duplicate
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="flex h-auto min-h-0 w-full justify-start gap-1.5 rounded-none px-1.5 py-1 text-left text-danger hover:bg-dangerSoft"
            onClick={onDelete}
          >
            <Trash size={10} />
            Delete
          </Button>
        </div>
      </details>
    </span>
  );

  if (viewMode === "grid") {
    return (
      <div
        role="button"
        tabIndex={0}
        draggable
        onDragStart={handleDragStart}
        onClick={onPreview}
        onKeyDown={handlePreviewKeyDown}
        className={cn(
          "group relative cursor-grab overflow-hidden border border-hairline bg-white text-left transition hover:border-tertiary hover:shadow-[0_6px_14px_rgba(15,23,42,0.07)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2",
          selected && "border-accent ring-1 ring-accent",
        )}
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-surfaceMuted">
          <ComponentThumb item={item} size="lg" />
          <div className="absolute inset-x-0 bottom-0 bg-white/90 px-1.5 py-1 backdrop-blur-sm">
            <span className="block truncate text-[9px] font-bold leading-3 text-ink">
              <HighlightMatch text={name} query={query} />
            </span>
            <span className="block truncate font-mono text-[9px] font-bold tabular-nums text-ink">
              {pesoFormatter.format(price)} / {item.unit}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between px-1.5 py-1">
          <span className="block truncate text-[9px] font-semibold text-tertiary">{item.supplier || "No supplier"}</span>
          {ActionButtons}
        </div>
      </div>
    );
  }

  const isDetailed = viewMode === "detailed";

  return (
    <div
      role="button"
      tabIndex={0}
      draggable
      onDragStart={handleDragStart}
      onClick={onPreview}
      onKeyDown={handlePreviewKeyDown}
      className={cn(
        "group flex cursor-grab items-stretch gap-1.5 border border-hairline bg-white p-1 text-left transition hover:border-tertiary hover:shadow-[0_6px_14px_rgba(15,23,42,0.07)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 active:cursor-grabbing",
        isDetailed ? "min-h-[68px]" : "min-h-[40px]",
        selected && "border-accent ring-1 ring-accent",
      )}
    >
      <ComponentThumb item={item} size={isDetailed ? "md" : "sm"} />
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <div className="flex items-start justify-between gap-1">
          <span className={cn("block truncate font-bold leading-3 text-ink", isDetailed ? "text-[10px]" : "text-[10px]")}>
            <HighlightMatch text={name} query={query} />
          </span>
        </div>
        <span className="mt-0.5 block truncate text-[9px] font-semibold leading-3 text-tertiary">
          {item.supplier || "No supplier"} · {item.category}
        </span>
        <span className="mt-0.5 block font-mono text-[9px] font-bold tabular-nums text-ink">
          {pesoFormatter.format(price)} / {item.unit}
        </span>
        {isDetailed ? (
          <>
            <span className="mt-1 block line-clamp-2 text-[9px] leading-3 text-secondary/60">{item.description}</span>
            <div className="mt-1 flex flex-wrap gap-1">
              <Badge size="xs">
                {item.discipline || "Architectural"}
              </Badge>
              <Badge size="xs">
                {item.designation || "Floor"}
              </Badge>
              {item.isCustom ? (
                <Badge size="xs" tone="accent">
                  Custom
                </Badge>
              ) : null}
            </div>
          </>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-col items-end justify-between gap-0.5">
        <DotsSixVertical size={12} className="text-tertiary" aria-hidden="true" />
        {ActionButtons}
      </div>
    </div>
  );
}
