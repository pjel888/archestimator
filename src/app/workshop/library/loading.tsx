import { Skeleton } from "@/components/ui/skeleton";

// Shape mirrors LibraryOverview (src/components/workshop/library/overview/
// LibraryOverview.tsx:230-298): a single scrolling column — search row, a
// Components section (lg:grid-cols-6 card grid, ~150px cards), a Templates
// section (stacked rows), and a health line. No right rail, so the skeleton
// does not shift layout when real content paints (CLS ~0).
export default function Loading() {
  return (
    <div
      className="h-full min-h-0 overflow-y-auto bg-white"
      role="status"
      aria-label="Loading library"
    >
      <div className="mx-auto flex w-full flex-col gap-6 p-5" aria-hidden="true">
        {/* search + actions row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Skeleton className="h-8 w-full max-w-sm" />
          <div className="flex shrink-0 items-center gap-2">
            <Skeleton className="h-7 w-28" />
            <Skeleton className="h-7 w-32" />
          </div>
        </div>

        {/* Components section */}
        <div className="flex flex-col gap-2">
          <Skeleton className="h-5 w-28" />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-[150px] w-full" />
            ))}
          </div>
        </div>

        {/* Templates section */}
        <div className="flex flex-col gap-2">
          <Skeleton className="h-5 w-24" />
          <div className="flex flex-col gap-1.5">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
        </div>

        {/* health line */}
        <Skeleton className="h-4 w-64" />
      </div>
      <span className="sr-only">Loading library</span>
    </div>
  );
}
