import { Skeleton } from "@/components/ui/skeleton";

export function PublisherRosterSkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xs border border-hairline bg-white" aria-label="Loading client links">
      <output aria-live="polite" aria-atomic="true" className="sr-only">
        Loading client links.
      </output>
      <div className="grid gap-1.5 border-b border-hairline p-2 md:grid-cols-2 xl:grid-cols-[minmax(14rem,1fr)_9rem_12rem_auto]">
        <Skeleton className="h-8 md:col-span-2 xl:col-span-1" />
        <Skeleton className="h-8" />
        <Skeleton className="h-8" />
        <Skeleton className="h-8 w-full xl:w-32" />
      </div>
      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(18rem,23rem)_minmax(0,1fr)]">
        <div className="border-r border-hairline">
          <div className="flex min-h-10 items-center border-b border-hairline px-2.5"><Skeleton className="h-4 w-24" /></div>
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="min-h-16 border-b border-hairline px-2.5 py-2">
              <div className="flex items-center justify-between gap-2">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-4 w-14" />
              </div>
              <Skeleton className="mt-1.5 h-2.5 w-44" />
            </div>
          ))}
        </div>
        <div className="hidden min-h-0 p-4 lg:block">
          <div className="flex items-center justify-between gap-2 border-b border-hairline pb-3">
            <div><Skeleton className="h-4 w-40" /><Skeleton className="mt-1.5 h-2.5 w-28" /></div>
            <Skeleton className="h-8 w-36" />
          </div>
          <div className="mt-3 grid gap-3 xl:grid-cols-2">
            <Skeleton className="h-44 w-full" />
            <Skeleton className="h-44 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
