import { Skeleton } from "@/components/ui/skeleton";

// Mirrors ProjectEstimatesClient: a full-width search bar, a toolbar strip, and a
// single-column wide table. Replaces the node-route shaped ProjectRouteContentFallback
// (sidebar + 2-column grid + right rail) so first paint no longer flashes the wrong
// layout and then snaps (finding F4 / P0-6).
const SKELETON_ROW_COUNT = 12;
const SKELETON_COLUMN_COUNT = 8;

export function ProjectEstimatesListSkeleton() {
  return (
    <section
      role="status"
      aria-label="Loading estimates"
      aria-busy="true"
      data-testid="project-estimates-list-skeleton"
      className="flex h-full min-h-0 flex-col bg-white"
    >
      <span className="sr-only">Loading estimates…</span>

      <div data-skeleton="search" className="flex shrink-0 items-center gap-2 bg-white" aria-hidden="true">
        <Skeleton className="h-8 w-full rounded-xs" />
      </div>

      <div data-skeleton="toolbar" className="flex h-9 shrink-0 items-center gap-1 px-2" aria-hidden="true">
        <Skeleton className="size-6" />
        <Skeleton className="size-6" />
      </div>

      <div data-skeleton="table" className="min-h-0 flex-1 overflow-hidden border-t border-hairline" aria-hidden="true">
        <div className="flex h-9 items-center gap-2 border-b border-hairline bg-surface-muted px-2">
          {Array.from({ length: SKELETON_COLUMN_COUNT }, (_, index) => (
            <Skeleton key={`estimate-skeleton-header-${index}`} className="h-3 flex-1" />
          ))}
        </div>
        {Array.from({ length: SKELETON_ROW_COUNT }, (_, rowIndex) => (
          <div key={`estimate-skeleton-row-${rowIndex}`} data-skeleton-row className="flex h-8 items-center gap-2 border-b border-hairline px-2">
            {Array.from({ length: SKELETON_COLUMN_COUNT }, (_, columnIndex) => (
              <Skeleton key={`estimate-skeleton-cell-${rowIndex}-${columnIndex}`} className="h-3 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
