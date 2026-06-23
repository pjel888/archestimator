"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { librarySurfaceClass } from "@/components/workshop/library/library-surface-variant";
import { cn } from "@/lib/ui/cn";

export default function Loading() {
  return (
    <div
      className={cn(
        "flex h-full min-h-0 overflow-hidden rounded-xs border border-[color:var(--glass-border)] p-2",
        librarySurfaceClass("glass", "root"),
      )}
      role="status"
      aria-label="Loading templates"
    >
      <div className={cn("hidden w-[312px] shrink-0 p-2 lg:block", librarySurfaceClass("glass", "treeRail"))} aria-hidden="true">
        <Skeleton className={cn("h-7 w-full", librarySurfaceClass("glass", "skeleton"))} />
        <div className="mt-2 space-y-1">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className={cn("h-6 w-full", librarySurfaceClass("glass", "skeleton"))} />
          ))}
        </div>
      </div>
      <div className={cn("flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden", librarySurfaceClass("glass", "centerColumn"))} aria-hidden="true">
        <div className={cn("flex h-[38px] items-center px-2", librarySurfaceClass("glass", "sheetHeader"))}>
          <Skeleton className={cn("h-7 w-32", librarySurfaceClass("glass", "skeleton"))} />
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-2">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className={cn("mb-1.5 flex items-center gap-2 px-2 py-2.5", librarySurfaceClass("glass", "skeleton"))}>
              <Skeleton className="size-4 shrink-0" />
              <div className="min-w-0 flex-1">
                <Skeleton className="mb-1 h-3 w-2/5" />
                <Skeleton className="h-[9px] w-3/5" />
              </div>
              <Skeleton className="h-3 w-16 shrink-0" />
              <Skeleton className="h-3 w-20 shrink-0" />
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only">Loading templates</span>
    </div>
  );
}
