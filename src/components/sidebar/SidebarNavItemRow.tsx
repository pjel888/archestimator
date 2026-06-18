"use client";

import Link from "next/link";
import { useState } from "react";
import type { Icon as PhosphorIcon } from "@phosphor-icons/react";

import type { SidebarNavItem } from "./sidebar-types";

type SidebarNavItemProps = {
  item: SidebarNavItem & { icon: PhosphorIcon };
  active: boolean;
  expanded: boolean;
  onPrefetchStart?: (href: string) => void;
  onPrefetchCancel?: (href: string) => void;
};

function formatBadgeCount(count: number) {
  if (count > 99) return "99+";
  return String(count);
}

// Active pill — faked glass: expanded keeps the brand-orange translucent fill,
// while the collapsed rail uses a monochrome active state so the rail stays
// quiet until the user opens it. No per-child backdrop-filter; the one blur lives
// on the panel.
const ACTIVE_NAV_ITEM_EXPANDED_TONE_CLASSNAME =
  "text-orange-700 hover:text-orange-700 before:[background:var(--glass-nav-active-bg)] before:[box-shadow:var(--glass-nav-active-shadow)] before:opacity-100";

const ACTIVE_NAV_ITEM_COLLAPSED_TONE_CLASSNAME =
  "text-primary hover:text-primary before:[background:var(--glass-nav-active-collapsed-bg)] before:[box-shadow:var(--glass-nav-active-collapsed-shadow)] before:opacity-100";

const ACTIVE_NAV_ITEM_EXPANDED_CLASSNAME = "before:left-1.5 before:right-1.5";

const ACTIVE_NAV_ITEM_COLLAPSED_CLASSNAME = "before:left-1.5 before:w-9";

const INACTIVE_NAV_ITEM_CLASSNAME =
  "text-tertiary before:left-1.5 before:w-9 before:[background:var(--glass-nav-hover-bg)] hover:text-primary hover:before:opacity-100";

export function SidebarNavItemRow({ item, active, expanded, onPrefetchStart, onPrefetchCancel }: SidebarNavItemProps) {
  const Icon = item.icon;
  const [prefetchIntent, setPrefetchIntent] = useState(false);
  const badgeCount = item.badgeCount && item.badgeCount > 0 ? item.badgeCount : 0;
  const badgeText = badgeCount > 0 ? formatBadgeCount(badgeCount) : null;
  const collapsedLabel = item.badgeLabel ? `${item.label}, ${item.badgeLabel}` : item.label;

  const startPrefetch = () => {
    setPrefetchIntent(true);
    onPrefetchStart?.(item.href);
  };

  const cancelPrefetch = () => {
    onPrefetchCancel?.(item.href);
  };

  return (
    <Link
      href={item.href}
      prefetch={prefetchIntent ? null : false}
      aria-current={active ? "page" : undefined}
      aria-label={expanded ? undefined : collapsedLabel}
      onBlur={cancelPrefetch}
      onFocus={startPrefetch}
      onMouseEnter={startPrefetch}
      onMouseLeave={cancelPrefetch}
      className={[
        "group relative grid h-8 w-full grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-1 overflow-visible rounded-xs px-0 pr-2 outline-none transition-[color,transform] duration-[120ms] ease-out active:scale-[0.985] motion-reduce:transition-none motion-reduce:active:scale-100",
        "before:absolute before:top-[-2px] before:z-0 before:h-9 before:[border-radius:var(--glass-nav-radius)] before:opacity-0 before:transition-[background-color,box-shadow,opacity] before:duration-[120ms] before:ease-out before:content-['']",
        "focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary",
        active
          ? [
              expanded ? ACTIVE_NAV_ITEM_EXPANDED_TONE_CLASSNAME : ACTIVE_NAV_ITEM_COLLAPSED_TONE_CLASSNAME,
              expanded ? ACTIVE_NAV_ITEM_EXPANDED_CLASSNAME : ACTIVE_NAV_ITEM_COLLAPSED_CLASSNAME,
            ].join(" ")
          : INACTIVE_NAV_ITEM_CLASSNAME,
      ].join(" ")}
    >
      <span className="relative z-10 flex h-8 w-12 shrink-0 items-center justify-center rounded-xs transition-[background-color,box-shadow] duration-[120ms] ease-out">
        <Icon
          size={16}
          weight="regular"
          className={[
            "relative z-10 shrink-0 transition-transform duration-[160ms] ease-out group-hover:scale-110 group-active:scale-95 motion-reduce:transform-none motion-reduce:transition-none",
            active ? (expanded ? "text-orange-700" : "text-primary") : "",
          ].join(" ")}
        />
        {badgeText ? (
          <span
            aria-hidden="true"
            className={[
              "absolute right-1 top-0 grid min-w-3.5 place-items-center rounded-xs bg-primary px-1 text-[7px] font-medium leading-3 text-white ring-1 ring-white transition-opacity duration-[140ms]",
              expanded ? "opacity-0" : "opacity-100",
            ].join(" ")}
          >
            {badgeText}
          </span>
        ) : null}
      </span>

      <span
        aria-hidden={!expanded}
        className={[
          "relative z-10 min-w-0 truncate whitespace-nowrap text-[10px] leading-none transition-[opacity,transform] duration-[180ms] ease-out motion-reduce:transform-none motion-reduce:transition-none",
          active ? "font-medium" : "font-normal",
          expanded ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-1 opacity-0",
        ].join(" ")}
      >
        {item.label}
      </span>
      {badgeText ? (
        <span
          aria-label={item.badgeLabel}
          className={[
            "relative z-10 grid min-w-5 shrink-0 place-items-center rounded-xs bg-primary px-1.5 text-[8px] font-medium leading-4 text-white transition-[opacity,transform] duration-[180ms] ease-out motion-reduce:transform-none motion-reduce:transition-none",
            expanded ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-1 opacity-0",
          ].join(" ")}
        >
          <span aria-hidden="true">{badgeText}</span>
        </span>
      ) : null}
    </Link>
  );
}
