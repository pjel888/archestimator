"use client";

import Link from "next/link";
import type { Icon as PhosphorIcon } from "@phosphor-icons/react";

import type { SidebarNavItem } from "./sidebar-types";

type SidebarNavItemProps = {
  item: SidebarNavItem & { icon: PhosphorIcon };
  active: boolean;
  expanded: boolean;
};

export function SidebarNavItemRow({ item, active, expanded }: SidebarNavItemProps) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      aria-label={expanded ? undefined : item.label}
      className={[
        "group relative grid h-8 grid-cols-[48px_auto] items-center gap-1 overflow-visible rounded-md px-0 outline-none transition-colors duration-[120ms] ease-out",
        expanded ? "w-full pr-3" : "w-full grid-cols-[48px_minmax(0,1fr)] pr-0",
        "before:absolute before:left-1.5 before:top-[-2px] before:z-0 before:h-9 before:w-9 before:rounded-md before:bg-accent-soft before:opacity-0 before:shadow-[inset_0_0_0_1px_rgba(255,122,26,0.12)] before:transition-opacity before:duration-[120ms] before:ease-out before:content-['']",
        "text-tertiary hover:text-primary hover:before:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary",
        active ? "text-primary before:opacity-100" : "",
      ].join(" ")}
    >
      <span className="relative z-10 flex h-8 w-12 shrink-0 items-center justify-center rounded-md transition-[background-color,box-shadow] duration-[120ms] ease-out">
        <Icon size={16} weight="regular" className="relative z-10 shrink-0" />
      </span>

      <span
        aria-hidden={!expanded}
        className={[
          "relative z-10 min-w-0 truncate whitespace-nowrap text-[12.5px] leading-none transition-[opacity,transform] duration-[180ms] ease-out motion-reduce:transform-none motion-reduce:transition-none",
          active ? "font-medium" : "font-normal",
          expanded ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-1 opacity-0",
        ].join(" ")}
      >
        {item.label}
      </span>
    </Link>
  );
}
