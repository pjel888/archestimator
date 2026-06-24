"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MagnifyingGlass, X } from "@phosphor-icons/react/dist/ssr";

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

type OpenCommandPaletteProps = Omit<CommandPaletteProps, "open"> & {
  items: EstimateRowItem[];
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
  if (!open) return null;

  return (
    <OpenCommandPalette
      items={items}
      canInsert={canInsert}
      targetLabel={targetLabel}
      onClose={onClose}
      onInsert={onInsert}
    />
  );
}

function OpenCommandPalette({
  items,
  canInsert,
  targetLabel,
  onClose,
  onInsert,
}: OpenCommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => searchComponents(items, query).slice(0, 10), [items, query]);
  const clampedSelectedIndex = Math.min(selectedIndex, Math.max(0, results.length - 1));

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      searchRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const insertItem = useCallback((item: EstimateRowItem, keepOpen = false) => {
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
  }, [canInsert, onClose, onInsert]);

  const handleNativeDialogKeyDown = useCallback(
    (event: globalThis.KeyboardEvent) => {
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
    },
    [clampedSelectedIndex, insertItem, onClose, results],
  );

  const handleNativeDialogPointerDown = useCallback(
    (event: PointerEvent) => {
      if (event.target === dialogRef.current) onClose();
    },
    [onClose],
  );

  const openDialogElement = useCallback(
    (node: HTMLDialogElement | null) => {
      dialogRef.current?.removeEventListener("keydown", handleNativeDialogKeyDown);
      dialogRef.current?.removeEventListener("pointerdown", handleNativeDialogPointerDown);
      dialogRef.current = node;
      if (!node) return;
      node.addEventListener("keydown", handleNativeDialogKeyDown);
      node.addEventListener("pointerdown", handleNativeDialogPointerDown);
      if (node.open) return;
      if (typeof node.showModal === "function") {
        try {
          node.showModal();
        } catch {
          node.setAttribute("open", "");
        }
      } else {
        node.setAttribute("open", "");
      }
    },
    [handleNativeDialogKeyDown, handleNativeDialogPointerDown],
  );

  return (
    <dialog
      ref={openDialogElement}
      aria-modal="true"
      aria-label="Command palette"
      className="z-[1200] mt-[12vh] w-[calc(100%-2rem)] max-w-xl border-0 bg-transparent p-0 text-ink backdrop:bg-black/35"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="w-full border border-hairline bg-white shadow-2xl">
        <div className="flex h-11 items-center gap-2 border-b border-hairline px-3">
          <MagnifyingGlass size={15} weight="regular" className="shrink-0 text-tertiary" aria-hidden="true" />
          <input
            ref={searchRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSelectedIndex(0);
            }}
            aria-label="Command palette search"
            placeholder="Search components"
            className="min-w-0 flex-1 bg-transparent text-[10px] font-medium text-ink outline-none placeholder:text-tertiary"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-6 p-0 text-tertiary hover:bg-surfaceMuted hover:text-ink"
            aria-label="Close command palette"
            onClick={onClose}
          >
            <X size={13} weight="regular" />
          </Button>
        </div>

        <div className={cn("border-b border-hairline px-3 py-2 text-[10px] font-medium", canInsert ? "text-success" : "text-warning")}>
          {canInsert ? `Ready to insert into ${targetLabel}` : "Select an Area before inserting components"}
        </div>

        <div className="max-h-[50vh] overflow-auto p-1">
          {results.map(({ item }, index) => {
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
                  <span className="block truncate text-[11px] font-medium text-ink">{name}</span>
                  <span className="block truncate text-[9px] font-medium text-tertiary">
                    {item.supplier || "No supplier"} · {item.category}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-sans text-[10px] font-medium tabular-nums text-ink">
                    {pesoFormatter.format(getComponentPrice(item))} / {item.unit}
                  </span>
                  <span className={cn("block text-[8px] font-medium", stalenessClass(stalenessTone))}>
                    {stalenessLabel ?? item.pricingSource ?? "Library"}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between border-t border-hairline px-3 py-2 text-[9px] font-medium text-tertiary">
          <span>Enter inserts · Shift+Enter keeps open</span>
          <span>Esc closes</span>
        </div>
      </div>
    </dialog>
  );
}
