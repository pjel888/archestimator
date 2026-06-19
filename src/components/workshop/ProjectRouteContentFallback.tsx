import { Skeleton } from "@/components/ui/skeleton";

export function ProjectRouteContentFallback() {
  return (
    <section
      className="flex h-full min-h-0 flex-col justify-start overflow-hidden md:flex-row"
      role="status"
      aria-label="Loading project workspace"
    >
      <aside className="flex h-auto w-full shrink-0 flex-col p-2 md:h-full md:w-[274px]" aria-hidden="true">
        <div className="dashboard-glass flex min-h-0 flex-1 flex-col gap-3 rounded-xs p-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-12 w-full" />
          <div className="mt-auto grid grid-cols-2 gap-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </div>
      </aside>
      <main className="flex min-h-0 flex-1 overflow-auto p-2" aria-label="Project dashboard">
        <div className="dashboard-glass flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-xs p-2" aria-hidden="true" />
      </main>
      <span className="sr-only">Loading project workspace</span>
    </section>
  );
}
