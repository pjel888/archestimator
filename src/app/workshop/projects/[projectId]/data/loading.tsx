import { Skeleton } from "@/components/ui/skeleton";

/**
 * Route-level skeleton for the project cost-data page.
 */
export default function Loading() {
  return (
    <section
      data-project-data-loading
      aria-busy="true"
      className="flex h-full min-h-0 flex-col overflow-hidden bg-white"
      role="status"
      aria-label="Loading project data"
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-3">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
        <div className="rounded-xs border border-hairline bg-white">
          <div className="flex flex-wrap items-start justify-between gap-2 border-b border-hairline p-3">
            <div className="space-y-1">
              <Skeleton className="h-3 w-36" />
              <Skeleton className="h-2.5 w-64" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-7 w-52" />
              <Skeleton className="h-7 w-56" />
            </div>
          </div>
          <div className="grid gap-3 p-3 xl:grid-cols-[minmax(320px,0.95fr)_minmax(320px,1.05fr)]">
            <Skeleton className="h-[360px] w-full" />
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-7 w-full" />
              ))}
            </div>
          </div>
        </div>
        <div className="rounded-xs border border-hairline bg-white p-3">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="mt-3 h-5 w-full" />
          <Skeleton className="mt-2 h-5 w-10/12" />
          <Skeleton className="mt-2 h-5 w-8/12" />
        </div>
      </div>
    </section>
  );
}
