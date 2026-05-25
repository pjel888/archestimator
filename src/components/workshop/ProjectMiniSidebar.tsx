"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartBar, ChartPieSlice, ClipboardText } from "@phosphor-icons/react/dist/ssr";
import type { Icon as PhosphorIcon } from "@phosphor-icons/react";

type ProjectMiniSidebarProps = {
  projectId: string;
};

type ProjectSectionLink = {
  href: string;
  label: string;
  icon: PhosphorIcon;
  exact: boolean;
};

export function ProjectMiniSidebar({ projectId }: ProjectMiniSidebarProps) {
  const pathname = usePathname();
  const estimateSheetPathPrefix = `/workshop/projects/${projectId}/estimates/`;
  const isEstimateSheetRoute = Boolean(pathname?.startsWith(estimateSheetPathPrefix));
  const links: ProjectSectionLink[] = [
    {
      href: `/workshop/projects/${projectId}`,
      label: "Dashboard",
      icon: ChartBar,
      exact: true,
    },
    {
      href: `/workshop/projects/${projectId}/estimates`,
      label: "Estimates",
      icon: ClipboardText,
      exact: false,
    },
    {
      href: `/workshop/projects/${projectId}/charts`,
      label: "Charts",
      icon: ChartPieSlice,
      exact: false,
    },
  ];

  if (isEstimateSheetRoute) return null;

  return (
    <aside className="relative z-10 hidden w-[104px] shrink-0 border-r border-hairline bg-white lg:block" aria-label="Project navigation">
      <div className="flex h-10 items-center border-b border-hairline pl-4 pr-2">
        <h2 className="truncate text-[9px] font-medium uppercase tracking-normal text-tertiary">Project</h2>
      </div>
      <nav className="flex flex-col gap-1 p-2" aria-label="Project sections">
        {links.map((link) => {
          const Icon = link.icon;
          const active = link.exact ? pathname === link.href : pathname === link.href || Boolean(pathname?.startsWith(`${link.href}/`));

          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={[
                "flex h-7 items-center gap-1 rounded-xs p-1 text-[10px] font-medium leading-none transition-colors",
                active ? "bg-surface-muted text-ink" : "text-tertiary hover:bg-surface-muted hover:text-ink",
              ].join(" ")}
            >
              <Icon size={14} aria-hidden="true" />
              <span className="truncate">{link.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
