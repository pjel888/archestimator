"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/ui/cn";

type ProjectCardStatusSlotProps = {
  statusChips: ReactNode[];
};

export function ProjectCardStatusSlot({ statusChips }: ProjectCardStatusSlotProps) {
  return (
    <div
      data-project-card-status-slot=""
      aria-label={statusChips.length > 0 ? "Project status" : "No project status"}
      className={cn(
        "flex h-[18px] min-w-0 flex-nowrap items-center gap-1 overflow-hidden",
        statusChips.length === 0 ? "items-start" : null,
      )}
    >
      {statusChips}
    </div>
  );
}
