"use client";

import { cn } from "@/lib/ui/cn";

export type TabStripItem<TTab extends string = string> = {
  id: TTab;
  label: string;
};

export type TabStripProps<TTab extends string = string> = {
  tabs: readonly TabStripItem<TTab>[];
  activeTab: TTab;
  ariaLabel: string;
  onTabChange?: (tab: TTab) => void;
  className?: string;
};

/**
 * Compact file-folder tab strip for tree/panel headers: 32px tall, the
 * active tab lifts onto the white panel surface below it.
 */
export function TabStrip<TTab extends string>({
  tabs,
  activeTab,
  ariaLabel,
  onTabChange,
  className,
}: TabStripProps<TTab>) {
  return (
    <div
      className={cn("flex h-[32px] items-end gap-0 border-b border-hairline bg-surfaceMuted", className)}
      role="tablist"
      aria-label={ariaLabel}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.id}
          className={cn(
            "relative h-full rounded-xs border border-b-0 px-3 text-[10px] font-medium leading-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
            activeTab === tab.id
              ? "z-10 bg-white text-ink border-hairline -mb-px"
              : "bg-surfaceMuted text-tertiary border-transparent hover:text-ink hover:border-hairline",
          )}
          onClick={() => onTabChange?.(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
