"use client";

import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { MagnifyingGlass, WarningCircle, X } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/ui/cn";
import { estimateLibraryItems, type EstimateRowItem } from "../estimate-tree-data";
import {
  getComponentName,
  getComponentPrice,
  getStalenessLabel,
  getStalenessTone,
  pesoFormatter,
  searchComponents,
} from "./helpers";

type CommandPaletteProps = {
  open: boolean;
  items?: EstimateRowItem[];
  canInsert: boolean;
  targetLabel: string;
  onClose: () => void;
  onInsert: (item: EstimateRowItem) => boolean | void;
};

function stalenessClass(tone: ReturnType<typeof getStalenessTone>) {
  if (tone === "danger") return "text-danger";
  if (tone === "warning") return "text-warning";
  if (tone === "success") return "text-success";
  return "text-tertiary";
}

export function CommandPalette({
  open,
  items = estimateLibraryItems,
  canInsert,
  targetLabel,
  onClose,
  onInsert,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => searchComponents(items, query).slice(0, 10), [items, query]);
  const clampedSelectedIndex = Math.min(selectedIndex, Math.max(0, results.length - 1));

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => {
      setQuery("");
      setSelectedIndex(0);
      searchRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  if (!open) return null;

  const insertItem = (item: EstimateRowItem, keepOpen = false) => {
    if (!canInsert) return;
    const inserted = onInsert(item) !== false;
    if (!inserted) return;
    if (keepOpen) {
      setQuery("");
      setSelectedIndex(0);
      window.requestAnimationFrame(() => searchRef.current?.focus());
      return;
    }
    onClose();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedIndex((index) => Math.min(index + 1, Math.max(0, results.length - 1)));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedIndex((index) => Math.max(index - 1, 0));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const selectedItem = results[clampedSelectedIndex]?.item;
      if (selectedItem) insertItem(selectedItem, event.shiftKey);
    }
  };

  return (
    <div className="fixed inset-0 z-[1200] flex items-start justify-center bg-black/35 px-4 pt-[12vh]" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="w-full max-w-xl border border-hairline bg-white shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="flex h-11 items-center gap-2 border-b border-hairline px-3">
          <MagnifyingGlass size={15} weight="bold" className="shrink-0 text-tertiary" aria-hidden="true" />
          <input
            ref={searchRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSelectedIndex(0);
            }}
            aria-label="Command palette search"
            placeholder="Search components"
            className="min-w-0 flex-1 bg-transparent text-[12px] font-semibold text-ink outline-none placeholder:text-tertiary"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-6 p-0 text-tertiary hover:bg-surfaceMuted hover:text-ink"
            aria-label="Close command palette"
            onClick={onClose}
          >
            <X size={13} weight="bold" />
          </Button>
        </div>

        <div className={cn("border-b border-hairline px-3 py-2 text-[10px] font-bold", canInsert ? "text-success" : "text-warning")}>
          {canInsert ? `Ready to insert into ${targetLabel}` : "Select an Area Node before inserting components"}
        </div>

        <div className="max-h-[50vh] overflow-auto p-1">
          {!results.length ? (
            <div className="flex items-center gap-2 px-3 py-6 text-[11px] font-semibold text-tertiary">
              <WarningCircle size={14} weight="bold" aria-hidden="true" />
              No components matched.
            </div>
          ) : (
            results.map(({ item }, index) => {
              const name = getComponentName(item);
              const stalenessTone = getStalenessTone(item.pricingDate);
              const stalenessLabel = getStalenessLabel(item.pricingDate);
              return (
                <button
                  key={item.id}
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-2 border border-transparent px-2 py-2 text-left transition",
                    index === clampedSelectedIndex ? "border-accent bg-accentSoft/50" : "hover:bg-surfaceMuted",
                    !canInsert && "cursor-not-allowed opacity-55",
                  )}
                  disabled={!canInsert}
                  data-selected={index === clampedSelectedIndex ? "true" : undefined}
                  onMouseEnter={() => setSelectedIndex(index)}
                  onClick={() => insertItem(item)}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11px] font-bold text-ink">{name}</span>
                    <span className="block truncate text-[9px] font-semibold text-tertiary">
                      {item.supplier || "No supplier"} · {item.category}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block font-mono text-[10px] font-bold tabular-nums text-ink">
                      {pesoFormatter.format(getComponentPrice(item))} / {item.unit}
                    </span>
                    <span className={cn("block text-[8px] font-bold", stalenessClass(stalenessTone))}>
                      {stalenessLabel ?? item.pricingSource ?? "Library"}
                    </span>
                  </span>
                </button>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between border-t border-hairline px-3 py-2 text-[9px] font-bold text-tertiary">
          <span>Enter inserts · Shift+Enter keeps open</span>
          <span>Esc closes</span>
        </div>
      </div>
    </div>
  );
}
