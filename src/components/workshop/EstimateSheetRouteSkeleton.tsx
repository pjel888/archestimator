"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/ui/cn";

import {
  EstimateSurfaceVariantProvider,
  useEstimateSurfaceVariant,
} from "./estimate-surface-variant";
import { estimateSurfaceClass } from "./estimate-surface-class";

const TREE_ROW_COUNT = 10;
const SHEET_ROW_COUNT = 12;
const LIBRARY_ROW_COUNT = 8;

// Mirrors EstimateWorkspaceClient's glass shell so route-level loading does not
// flash the project list or dashboard fallback before the estimate sheet mounts.
export function EstimateSheetRouteSkeleton() {
  return (
    <EstimateSurfaceVariantProvider variant="glass">
      <section
        role="status"
        aria-label="Loading estimate"
        aria-busy="true"
        data-testid="estimate-sheet-route-skeleton"
        className={cn(
          "flex h-full min-h-0 overflow-hidden",
          "gap-2 p-2",
          estimateSurfaceClass("glass", "root"),
        )}
      >
        <span className="sr-only">Loading estimate</span>
        <EstimateTreeRouteFallback />
        <EstimateContentRouteFallback />
        <EstimateLibraryRouteFallback />
      </section>
    </EstimateSurfaceVariantProvider>
  );
}

function EstimateTreeRouteFallback() {
  const variant = useEstimateSurfaceVariant();

  return (
    <aside
      className={cn("hidden w-[376px] shrink-0 p-2 lg:block", estimateSurfaceClass(variant, "treeRail"))}
      aria-hidden="true"
      data-skeleton="estimate-tree"
    >
      <Skeleton className="h-7 w-full" />
      <div className="mt-2 space-y-1">
        {Array.from({ length: TREE_ROW_COUNT }, (_, index) => (
          <Skeleton key={`estimate-tree-route-row-${index}`} className="h-6 w-full" />
        ))}
      </div>
    </aside>
  );
}

function EstimateContentRouteFallback() {
  const variant = useEstimateSurfaceVariant();

  return (
    <div
      className={cn("flex min-h-0 min-w-0 flex-1 flex-col p-2", estimateSurfaceClass(variant, "centerColumnFallback"))}
      aria-hidden="true"
      data-skeleton="estimate-content"
    >
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-hairline">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-6 w-20" />
        <Skeleton className="ml-auto h-6 w-24" />
      </div>
      <div className="min-h-0 flex-1 space-y-1 pt-2">
        {Array.from({ length: SHEET_ROW_COUNT }, (_, index) => (
          <Skeleton key={`estimate-content-route-row-${index}`} className="h-7 w-full" />
        ))}
      </div>
    </div>
  );
}

function EstimateLibraryRouteFallback() {
  const variant = useEstimateSurfaceVariant();

  return (
    <aside
      className={cn(
        "hidden h-full min-h-0 min-w-[320px] flex-col p-2 xl:flex",
        estimateSurfaceClass(variant, "libraryRail"),
      )}
      aria-hidden="true"
      data-skeleton="estimate-library"
    >
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-hairline">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="ml-auto size-6" />
      </div>
      <div className="space-y-2 pt-2">
        {Array.from({ length: LIBRARY_ROW_COUNT }, (_, index) => (
          <div key={`estimate-library-route-row-${index}`} className="flex items-center gap-2">
            <Skeleton className="size-8 shrink-0" />
            <Skeleton className="h-5 flex-1" />
          </div>
        ))}
      </div>
    </aside>
  );
}
