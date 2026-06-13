"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { useRef } from "react";
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
  /**
   * Opt-in tabpanel wiring. When provided, each tab gets a stable `id` and an
   * `aria-controls` pointing at the panel with the matching id. Consumers that
   * render the active panel can label it with the same ids via the helpers
   * below. Omit to keep the strip byte-identical to its prop-only form.
   */
  idBase?: string;
};

/** Stable DOM id for a tab element when `idBase` tabpanel wiring is opted into. */
export function getTabStripTabId(idBase: string, tabId: string) {
  return `${idBase}-tab-${tabId}`;
}

/** Stable DOM id for the tabpanel a tab controls when `idBase` is opted into. */
export function getTabStripPanelId(idBase: string, tabId: string) {
  return `${idBase}-panel-${tabId}`;
}

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
  idBase,
}: TabStripProps<TTab>) {
  // Roving tabIndex: keep a handle on each tab DOM node so Arrow/Home/End can
  // move focus directly. Each tab's ref callback writes its own index and
  // clears it (node === null) on unmount, so stale nodes never linger.
  const tabRefs = useRef<(HTMLElement | null)[]>([]);

  function handleTabKeyDown(event: KeyboardEvent<HTMLElement>, index: number) {
    const { key } = event;
    const lastIndex = tabs.length - 1;
    let targetIndex: number | null = null;

    if (key === "ArrowRight" || key === "ArrowDown") {
      targetIndex = index === lastIndex ? 0 : index + 1;
    } else if (key === "ArrowLeft" || key === "ArrowUp") {
      targetIndex = index === 0 ? lastIndex : index - 1;
    } else if (key === "Home") {
      targetIndex = 0;
    } else if (key === "End") {
      targetIndex = lastIndex;
    }

    if (targetIndex === null) return;

    event.preventDefault();
    const targetTab = tabs[targetIndex];
    if (!targetTab) return;
    tabRefs.current[targetIndex]?.focus();
    // Activation policy: buttons activate automatically on move (expected tab
    // UX); link tabs only move focus (manual activation — Enter follows the
    // link natively) so arrow keys never navigate.
    if (!targetTab.href) {
      onTabChange?.(targetTab.id);
    }
  }

  return (
    <div
      className={cn("flex h-[32px] items-end gap-0 border-b border-hairline bg-surfaceMuted", className)}
      role="tablist"
      aria-label={ariaLabel}
    >
      {tabs.map((tab, index) => {
        const isActive = activeTab === tab.id;
        const tabId = idBase ? getTabStripTabId(idBase, tab.id) : undefined;
        const panelId = idBase ? getTabStripPanelId(idBase, tab.id) : undefined;
        return tab.href ? (
          <Link
            key={tab.id}
            ref={(node) => {
              tabRefs.current[index] = node;
            }}
            href={tab.href}
            role="tab"
            id={tabId}
            aria-controls={panelId}
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            className={tabClassName(isActive)}
            onClick={() => onTabChange?.(tab.id)}
            onKeyDown={(event) => handleTabKeyDown(event, index)}
          >
            <TabContent tab={tab} />
          </Link>
        ) : (
          <button
            key={tab.id}
            ref={(node) => {
              tabRefs.current[index] = node;
            }}
            type="button"
            role="tab"
            id={tabId}
            aria-controls={panelId}
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            className={tabClassName(isActive)}
            onClick={() => onTabChange?.(tab.id)}
            onKeyDown={(event) => handleTabKeyDown(event, index)}
          >
            <TabContent tab={tab} />
          </button>
        );
      })}
    </div>
  );
}
