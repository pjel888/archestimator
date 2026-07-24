"use client";

import Link from "next/link";
import type { Icon as PhosphorIcon } from "@phosphor-icons/react";

import { cn } from "@/lib/ui/cn";
import {
  onboardingTarget,
  type OnboardingTargetKey,
} from "@/lib/onboarding/target-catalog";
import type { SidebarNavItem } from "./sidebar-types";

type SidebarNavItemProps = {
  item: SidebarNavItem & {
    icon: PhosphorIcon;
    onboardingTargetKey?: OnboardingTargetKey;
  };
  active: boolean;
  expanded: boolean;
};

function formatBadgeCount(count: number) {
  if (count > 99) return "99+";
  return String(count);
}

export function SidebarNavItemRow({ item, active, expanded }: SidebarNavItemProps) {
  const Icon = item.icon;
  const badgeCount = item.badgeCount && item.badgeCount > 0 ? item.badgeCount : 0;
  const badgeText = badgeCount > 0 ? formatBadgeCount(badgeCount) : null;
  const collapsedLabel = item.badgeLabel ? `${item.label}, ${item.badgeLabel}` : item.label;

  // The hover/active tint spans the full row when expanded, or just the icon
  // slot when collapsed so the collapsed rail stays a clean icon-only strip.
  const tintSpansFullRow = expanded;

  return (
    <Link
      href={item.href}
      prefetch
      aria-current={active ? "page" : undefined}
      aria-label={expanded ? undefined : collapsedLabel}
      {...(item.onboardingTargetKey
        ? onboardingTarget(item.onboardingTargetKey)
        : {})}
      className={cn(
        "group relative grid h-8 w-full cursor-pointer grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-1 overflow-visible rounded-xs px-0 pr-2 outline-none transition-[color,transform] duration-[120ms] ease-out active:scale-[0.985] motion-reduce:transition-none motion-reduce:active:scale-100",
        "before:absolute before:top-[-2px] before:z-0 before:h-9 before:[border-radius:var(--glass-nav-radius)] before:opacity-0 before:transition-[background-color,box-shadow,opacity] before:duration-[120ms] before:ease-out before:content-['']",
        "focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary",
        tintSpansFullRow ? "before:left-1.5 before:right-1.5" : "before:left-1.5 before:w-9",
        active
          ? expanded
            ? "text-brand-orange-dark hover:text-brand-orange-dark before:[background:var(--glass-nav-active-bg)] before:[box-shadow:var(--glass-nav-active-shadow)] before:opacity-100"
            : "text-primary hover:text-primary before:[background:var(--glass-nav-active-collapsed-bg)] before:[box-shadow:var(--glass-nav-active-collapsed-shadow)] before:opacity-100"
          : "text-tertiary before:[background:var(--glass-nav-hover-bg)] hover:text-primary hover:before:opacity-100",
      )}
    >
      <span className="relative z-10 flex h-8 w-12 shrink-0 items-center justify-center rounded-xs transition-[background-color,box-shadow] duration-[120ms] ease-out">
        <Icon
          size={16}
          weight="regular"
          className={cn(
            "relative z-10 shrink-0 transition-transform duration-[160ms] ease-out group-hover:scale-110 group-active:scale-95 motion-reduce:transform-none motion-reduce:transition-none",
            active && (expanded ? "text-brand-orange-dark" : "text-primary"),
          )}
        />
        {badgeText ? (
          <span
            aria-hidden="true"
            className={cn(
              "absolute right-1 top-0 grid min-w-3.5 place-items-center rounded-xs bg-primary px-1 text-[7px] font-medium leading-3 text-white ring-1 ring-white transition-opacity duration-[140ms]",
              expanded ? "opacity-0" : "opacity-100",
            )}
          >
            {badgeText}
          </span>
        ) : null}
      </span>

      <span
        aria-hidden={!expanded}
        className={cn(
          "relative z-10 min-w-0 truncate whitespace-nowrap text-[10px] leading-none transition-[opacity,transform] duration-[180ms] ease-out motion-reduce:transform-none motion-reduce:transition-none",
          active ? "font-medium" : "font-normal",
          expanded ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-1 opacity-0",
        )}
      >
        {item.label}
      </span>
      {badgeText ? (
        <span
          aria-label={item.badgeLabel}
          className={cn(
            "relative z-10 grid min-w-5 shrink-0 place-items-center rounded-xs bg-primary px-1.5 text-[8px] font-medium leading-4 text-white transition-[opacity,transform] duration-[180ms] ease-out motion-reduce:transform-none motion-reduce:transition-none",
            expanded ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-1 opacity-0",
          )}
        >
          <span aria-hidden="true">{badgeText}</span>
        </span>
      ) : null}
    </Link>
  );
}
