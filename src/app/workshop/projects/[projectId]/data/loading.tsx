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
                <Skeleton className="h-3 w-44" />
              </div>
              <div className="flex flex-col gap-2 lg:flex-row">
                <Skeleton className="h-7 w-full sm:w-[216px]" />
              </div>
            </div>

            <Skeleton className="mt-3 h-4 w-8/12" />
          </div>

          <div className="min-h-0 flex-1 overflow-auto p-3">
            <div className="flex min-w-max gap-3">
              {Array.from({ length: 2 }).map((_, columnIndex) => (
                <div key={columnIndex} className="flex min-w-[280px] flex-1 flex-col rounded-xs border border-hairline bg-surface px-4 py-3">
                  <div className="flex min-h-6 items-center justify-between gap-2">
                    <Skeleton className="h-4 w-20" />
                    {columnIndex > 0 ? <Skeleton className="size-6" /> : null}
                  </div>
                  <Skeleton className="mt-3 h-4 w-44" />
                  <Skeleton className="mt-2 h-6 w-32" />
                  <Skeleton className="mt-1 h-3 w-24" />
                  <Skeleton className="mx-auto mt-3 h-[180px] w-[180px] rounded-xs" />
                  <div className="mt-3 space-y-2">
                    {Array.from({ length: 6 }).map((_, rowIndex) => (
                      <div key={rowIndex} className="flex items-center gap-2">
                        <Skeleton className="size-2 rounded-xs" />
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="ml-auto h-3 w-16" />
                        <Skeleton className="h-3 w-10" />
                      </div>
                    ))}
                  </div>
                  <Skeleton className="mt-auto h-8 w-full" />
                </div>
              ))}
              <Skeleton className="min-h-full w-[132px] rounded-xs border border-dashed border-hairline" />
            </div>
            <Skeleton className="mt-2 h-3 w-80 max-w-full" />
          </div>
        </div>
      </div>
    </section>
  );
}
