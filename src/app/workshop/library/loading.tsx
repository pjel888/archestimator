"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { librarySurfaceClass } from "@/components/workshop/library/library-surface-variant";
import { cn } from "@/lib/ui/cn";

// Shape mirrors LibraryOverview (src/components/workshop/library/overview/
// LibraryOverview.tsx:230-298): a single scrolling column — search row, a
// Components section (lg:grid-cols-6 card grid, ~150px cards), a Templates
// section (stacked rows), and a health line. No right rail, so the skeleton
// does not shift layout when real content paints (CLS ~0).
export default function Loading() {
  return (
    <div
      className={cn(
        "flex h-full min-h-0 overflow-hidden rounded-xs border border-[color:var(--glass-border)] p-2",
        librarySurfaceClass("glass", "root"),
      )}
      role="status"
      aria-label="Loading library"
    >
      <div
        className={cn(
          "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden",
          librarySurfaceClass("glass", "centerColumn"),
        )}
        aria-hidden="true"
      >
        {/* search + actions row */}
        <div className={cn("flex flex-wrap items-center justify-between gap-3 px-4 py-3", librarySurfaceClass("glass", "sheetHeader"))}>
          <Skeleton className={cn("h-8 w-full max-w-sm", librarySurfaceClass("glass", "skeleton"))} />
          <div className="flex shrink-0 items-center gap-2">
            <Skeleton className={cn("h-7 w-28", librarySurfaceClass("glass", "skeleton"))} />
            <Skeleton className={cn("h-7 w-32", librarySurfaceClass("glass", "skeleton"))} />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <div className="mx-auto flex w-full flex-col gap-5">
        {/* Components section */}
        <div className="flex flex-col gap-2">
          <Skeleton className={cn("h-5 w-28", librarySurfaceClass("glass", "skeleton"))} />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className={cn("h-[150px] w-full", librarySurfaceClass("glass", "skeleton"))} />
            ))}
          </div>
        </div>

        {/* Templates section */}
        <div className="flex flex-col gap-2">
          <Skeleton className={cn("h-5 w-24", librarySurfaceClass("glass", "skeleton"))} />
          <div className="flex flex-col gap-1.5">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className={cn("h-12 w-full", librarySurfaceClass("glass", "skeleton"))} />
            ))}
          </div>
        </div>

        {/* health line */}
        <Skeleton className={cn("h-4 w-64", librarySurfaceClass("glass", "skeleton"))} />
          </div>
        </div>
      </div>
      <span className="sr-only">Loading library</span>
    </div>
  );
}
