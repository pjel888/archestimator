import { Skeleton } from "@/components/ui/skeleton";

/** Content-only Suspense fallback for the layout-owned workshop shell. */
export function WorkshopContentSkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-col gap-2" role="status" aria-label="Loading workspace">
      <div className="grid shrink-0 grid-cols-3 gap-2" aria-hidden="true">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="min-h-0 flex-1 rounded-xs border border-hairline bg-white p-2" aria-hidden="true">
        <Skeleton className="h-full w-full" />
      </div>
      <span className="sr-only">Loading workspace</span>
    </div>
  );
}
