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
      <div className="project-data-grid min-h-0 flex-1 overflow-auto p-2 md:p-3" data-project-data-grid="16x12">
        <div className="project-data-grid__hero project-data-panel project-data-panel--warm rounded-xs p-3">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div className="space-y-1">
              <Skeleton className="h-3 w-36" />
              <Skeleton className="h-2.5 w-64" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-7 w-52" />
              <Skeleton className="h-7 w-56" />
            </div>
          </div>
          <Skeleton className="mt-3 h-4 w-8/12" />
          <div className="mt-3 grid grid-cols-2 gap-px sm:grid-cols-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>

        <div className="project-data-grid__primary project-data-panel project-data-panel--paper rounded-xs p-3">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="mt-1 h-2.5 w-64" />
          <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_200px]">
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, index) => (
                <Skeleton key={index} className="h-7 w-full" />
              ))}
            </div>
            <Skeleton className="hidden h-[220px] w-full lg:block" />
          </div>
        </div>

        <div className="project-data-grid__side-top project-data-panel rounded-xs p-3">
          <Skeleton className="h-3 w-36" />
          <Skeleton className="mt-3 h-4 w-full" />
          <Skeleton className="mt-3 h-10 w-full" />
          <Skeleton className="mt-2 h-10 w-full" />
        </div>

        <div className="project-data-grid__side-bottom project-data-panel rounded-xs p-3">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="mt-3 h-5 w-full" />
          <Skeleton className="mt-2 h-5 w-10/12" />
          <Skeleton className="mt-2 h-5 w-8/12" />
        </div>
      </div>
    </section>
  );
}
