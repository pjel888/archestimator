import { Skeleton } from "@/components/ui/skeleton";

export function PublisherRosterSkeleton() {
  return (
    <div className="flex h-full flex-col p-2" aria-label="Loading shared link roster">
      <output aria-live="polite" aria-atomic="true" className="sr-only">
        Loading shared link roster.
      </output>
      <div className="mb-2 flex min-h-10 items-center justify-between gap-2 border-b border-hairline pb-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-7 w-7" />
          <Skeleton className="h-7 w-44" />
        </div>
        <Skeleton className="h-7 w-40" />
      </div>
      <div className="min-h-0 flex-1 overflow-hidden rounded-xs border border-hairline bg-surface/70">
        <div className="grid grid-cols-[1.8fr_1fr_0.7fr_1fr_0.9fr_0.8fr] gap-2 border-b border-hairline px-3 py-2">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-3 w-full" />
          ))}
        </div>
        <div className="divide-y divide-hairline">
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index} className="grid grid-cols-[1.8fr_1fr_0.7fr_1fr_0.9fr_0.8fr] gap-2 px-3 py-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
