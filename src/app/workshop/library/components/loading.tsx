"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { librarySurfaceClass } from "@/components/workshop/library/library-surface-class";
import { cn } from "@/lib/ui/cn";

export default function Loading() {
  return (
    <output
      className={cn(
        "flex h-full min-h-0 overflow-hidden rounded-xs border border-[color:var(--glass-border)] p-2",
        librarySurfaceClass("glass", "root"),
      )}
      aria-label="Loading components"
    >
      <div className={cn("flex min-w-0 flex-1 flex-col p-2", librarySurfaceClass("glass", "centerColumn"))} aria-hidden="true">
        <Skeleton className={cn("h-7 w-32", librarySurfaceClass("glass", "skeleton"))} />
        <div className="mt-2 grid grid-cols-[repeat(auto-fill,minmax(164px,1fr))] gap-2">
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} className={cn("h-[236px] w-full", librarySurfaceClass("glass", "skeleton"))} />
          ))}
        </div>
      </div>
      <div className={cn("hidden w-[312px] shrink-0 p-2 lg:block", librarySurfaceClass("glass", "rightDock"))} aria-hidden="true">
        <Skeleton className={cn("h-7 w-full", librarySurfaceClass("glass", "skeleton"))} />
        <div className="mt-2 space-y-1">
          {Array.from({ length: 9 }, (_, index) => (
            <Skeleton key={index} className={cn("h-6 w-full", librarySurfaceClass("glass", "skeleton"))} />
          ))}
        </div>
      </div>
      <span className="sr-only">Loading components</span>
    </output>
  );
}
