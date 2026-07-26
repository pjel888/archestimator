"use client";

import { usePathname } from "next/navigation";
import { ButtonLink } from "@/components/ui/button";
import { ProjectMobileNavigation } from "./navigation/ProjectMobileNavigation";
import {
  getProjectNavigationItems,
  isProjectNavigationItemActive,
} from "./navigation/project-navigation";

type ProjectMiniSidebarProps = {
  projectId: string;
};

export function ProjectMiniSidebar({ projectId }: ProjectMiniSidebarProps) {
  const pathname = usePathname();
  const estimateSheetPathPrefix = `/workshop/projects/${projectId}/estimates/`;
  const isEstimateSheetRoute = Boolean(pathname?.startsWith(estimateSheetPathPrefix));
  const links = getProjectNavigationItems(projectId);

  if (isEstimateSheetRoute) return null;

  return (
    <>
      <ProjectMobileNavigation items={links} />
      <aside className="relative z-10 hidden w-[104px] shrink-0 lg:block" aria-label="Project navigation">
        <nav className="flex flex-col gap-1 p-2" aria-label="Project sections">
          {links.map((link) => {
            const Icon = link.icon;
            const active = isProjectNavigationItemActive(pathname, link);

            return (
              <ButtonLink
                key={link.href}
                href={link.href}
                variant="plain"
                size="sm"
                aria-current={active ? "page" : undefined}
                className={[
                  "h-8 min-w-0 gap-1 border border-transparent p-1 !text-[10px]",
                  active
                    ? "workshop-project-card-control text-ink"
                    : "text-tertiary hover:border-[color:var(--glass-border)] hover:bg-white/45 hover:text-ink",
                ].join(" ")}
              >
                <Icon size={14} aria-hidden="true" />
                <span className="truncate">{link.label}</span>
              </ButtonLink>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
