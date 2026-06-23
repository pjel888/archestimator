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
      aria-label="Loading template editor"
    >
      <div className={cn("hidden w-[264px] shrink-0 p-2 lg:block", librarySurfaceClass("glass", "treeRail"))} aria-hidden="true">
        <Skeleton className={cn("h-7 w-full", librarySurfaceClass("glass", "skeleton"))} />
        <div className="mt-2 space-y-1">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className={cn("h-6 w-full", librarySurfaceClass("glass", "skeleton"))} />
          ))}
        </div>
      </div>
      <div className={cn("flex min-w-0 flex-1 flex-col p-2", librarySurfaceClass("glass", "centerColumn"))} aria-hidden="true">
        <Skeleton className={cn("h-10 w-full", librarySurfaceClass("glass", "skeleton"))} />
        <div className="mt-2 flex-1 space-y-1">
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} className={cn("h-8 w-full", librarySurfaceClass("glass", "skeleton"))} />
          ))}
        </div>
        <Skeleton className={cn("h-9 w-full", librarySurfaceClass("glass", "skeleton"))} />
      </div>
      <span className="sr-only">Loading template editor</span>
    </div>
  );
}
