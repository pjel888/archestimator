"use client";

import type { ReactNode } from "react";
import Link from "next/link";

import { cn } from "@/lib/ui/cn";

export type TabStripItem<TTab extends string = string> = {
  id: TTab;
  label: string;
  /** When set, the tab renders as a prefetching link instead of a button. */
  href?: string;
  /** Optional 12px leading icon (regular-weight outline). */
  icon?: ReactNode;
  /** Optional count badge rendered after the label (8px tabular numerals). */
  count?: number;
};

export type TabStripProps<TTab extends string = string> = {
  tabs: readonly TabStripItem<TTab>[];
  activeTab: TTab;
  ariaLabel: string;
  onTabChange?: (tab: TTab) => void;
  className?: string;
};

const tabClassName = (isActive: boolean) =>
  cn(
    "relative inline-flex h-full items-center gap-1 rounded-xs border border-b-0 px-3 text-[10px] font-medium leading-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
    isActive
      ? "z-10 bg-white text-ink border-hairline -mb-px"
      : "bg-surfaceMuted text-tertiary border-transparent hover:text-ink hover:border-hairline",
  );

function TabContent({ tab }: { tab: TabStripItem<string> }) {
  return (
    <>
      {tab.icon ? (
        <span className="inline-flex size-3 items-center justify-center [&>svg]:size-3" aria-hidden="true">
          {tab.icon}
        </span>
      ) : null}
      {tab.label}
      {typeof tab.count === "number" ? (
        <span className="rounded-xs bg-surfaceMuted px-1 text-[8px] font-normal leading-3 tabular-nums text-tertiary">
          {tab.count}
        </span>
      ) : null}
    </>
  );
}

/**
 * Compact file-folder tab strip for tree/panel headers: 32px tall, the
 * active tab lifts onto the white panel surface below it. Tabs render as
 * buttons by default; pass `href` per tab to render prefetching links
 * (route-backed tabs, e.g. the Library page strip).
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
      {tabs.map((tab) =>
        tab.href ? (
          <Link
            key={tab.id}
            href={tab.href}
            role="tab"
            aria-selected={activeTab === tab.id}
            className={tabClassName(activeTab === tab.id)}
            onClick={() => onTabChange?.(tab.id)}
          >
            <TabContent tab={tab} />
          </Link>
        ) : (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={tabClassName(activeTab === tab.id)}
            onClick={() => onTabChange?.(tab.id)}
          >
            <TabContent tab={tab} />
          </button>
        ),
      )}
    </div>
  );
}
