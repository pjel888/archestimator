"use client";

import type { ReactNode } from "react";
import { MapPin } from "@phosphor-icons/react/dist/ssr";

import { cn } from "@/lib/ui/cn";
import { ProjectCardDetailsControl } from "./ProjectCardDetailsControl";

type ProjectCardTitleViewMode = "list" | "small" | "medium" | "large";

type ProjectCardTitleBlockProps = {
  clientName: string | null;
  detailsControlClassName: string;
  groupAssignMenu: ReactNode;
  isPendingInvite: boolean;
  location: string | null;
  projectName: string;
  setupNavigationDisabled: boolean;
  viewMode: ProjectCardTitleViewMode;
  onExpandDetails: () => void;
};

export function ProjectCardTitleBlock({
  clientName,
  detailsControlClassName,
  groupAssignMenu,
  isPendingInvite,
  location,
  projectName,
  setupNavigationDisabled,
  viewMode,
  onExpandDetails,
}: ProjectCardTitleBlockProps) {
  return (
    <>
      <div className="flex min-w-0 items-start justify-between gap-2">
        <p className="min-w-0 truncate text-[8px] font-medium uppercase tracking-normal text-secondary">
          {clientName ?? "No client yet"}
        </p>
        <div className="flex shrink-0 items-center gap-1">
          {groupAssignMenu}
          {isPendingInvite ? null : (
            <ProjectCardDetailsControl
              className={detailsControlClassName}
              disabled={setupNavigationDisabled}
              projectName={projectName}
              onExpand={onExpandDetails}
            />
          )}
        </div>
      </div>
      <div className="min-w-0">
        <h2
          className={cn(
            "min-w-0 font-medium tracking-normal text-ink [overflow-wrap:anywhere]",
            viewMode === "large" ? "line-clamp-2 min-h-[28px] text-[12px] leading-[1.18]" : null,
            viewMode === "medium" ? "line-clamp-2 min-h-[26px] text-[11px] leading-[1.18]" : null,
            viewMode === "small" ? "line-clamp-2 min-h-6 text-[10px] leading-[1.2]" : null,
          )}
        >
          {projectName}
        </h2>
      </div>
      <p className="flex min-w-0 items-center gap-1.5 text-[9px] leading-3 text-secondary">
        <MapPin size={12} aria-hidden="true" className="shrink-0" />
        <span className="truncate">{location ?? "No location"}</span>
      </p>
    </>
  );
}
