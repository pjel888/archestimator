"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/ui/cn";
import {
  isProjectNavigationItemActive,
  type ProjectNavigationItem,
} from "./project-navigation";

export function ProjectMobileNavigation({
  items,
}: {
  items: readonly ProjectNavigationItem[];
}) {
  const pathname = usePathname();

  return (
    <nav
      id="project-mobile-navigation"
      aria-label="Project sections"
      className="flex max-w-full shrink-0 gap-1 overflow-x-auto border-b border-hairline p-2 lg:hidden"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const active = isProjectNavigationItemActive(pathname, item);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-10 shrink-0 items-center gap-1.5 rounded-xs border px-2 text-[10px] font-medium outline-none",
              active
                ? "border-primary/20 bg-orange-50 text-brand-orange-dark"
                : "border-hairline text-secondary hover:bg-surfaceMuted hover:text-ink",
            )}
          >
            <Icon size={15} aria-hidden="true" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
