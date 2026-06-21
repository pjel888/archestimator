import { Skeleton } from "@/components/ui/skeleton";

/**
 * Route-level skeleton for the project cost-data page.
 */
export default function Loading() {
  return (
    <section
      data-project-data-loading
      aria-busy="true"
      className="dashboard-canvas-wash flex h-full min-h-0 flex-col overflow-hidden bg-transparent"
      role="status"
      aria-label="Loading project data"
    >
      <div className="project-data-grid min-h-0 flex-1 overflow-hidden p-2 md:p-3" data-project-data-grid="comparison-board">
        <div className="project-data-grid__board project-data-panel project-data-panel--paper flex min-h-0 flex-col rounded-xs">
          <div className="shrink-0 border-b border-hairline p-3">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
              <div className="space-y-1">
                <Skeleton className="h-2.5 w-20" />
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-80 max-w-full" />
              </div>
              <div className="flex flex-col gap-2 lg:flex-row">
                <Skeleton className="h-7 w-full sm:w-[216px]" />
                <Skeleton className="h-7 w-full sm:w-[240px]" />
                <Skeleton className="h-7 w-full sm:w-[180px]" />
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-6 w-44" />
            </div>

            <Skeleton className="mt-3 h-4 w-8/12" />
          </div>

          <div className="min-h-0 flex-1 overflow-auto p-3">
            <div className="overflow-x-auto rounded-xs border border-hairline bg-white">
              <div className="grid grid-cols-[15rem_repeat(2,minmax(17rem,1fr))] border-b border-hairline bg-surfaceMuted/60">
                <div className="p-2">
                  <Skeleton className="h-3 w-20" />
                </div>
                <div className="border-l border-hairline p-2">
                  <Skeleton className="h-3 w-44" />
                  <Skeleton className="mt-2 h-4 w-28" />
                </div>
                <div className="border-l border-hairline p-2">
                  <Skeleton className="h-3 w-40" />
                  <Skeleton className="mt-2 h-4 w-32" />
                </div>
              </div>
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="grid grid-cols-[15rem_repeat(2,minmax(17rem,1fr))] border-b border-hairline last:border-b-0">
                  <div className="flex items-center gap-2 p-2">
                    <Skeleton className="size-2 rounded-xs" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                  <div className="space-y-2 border-l border-hairline p-2">
                    <div className="flex justify-between gap-2">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-3 w-10" />
                    </div>
                    <Skeleton className="h-2 w-full" />
                  </div>
                  <div className="space-y-2 border-l border-hairline p-2">
                    <div className="flex justify-between gap-2">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-3 w-10" />
                    </div>
                    <Skeleton className="h-2 w-10/12" />
                  </div>
                </div>
              ))}
            </div>
            <Skeleton className="mt-2 h-3 w-80 max-w-full" />
          </div>
        </div>
      </div>
    </section>
  );
}
