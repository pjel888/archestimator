import { Skeleton } from "@/components/ui/skeleton";

/**
 * Route-level loading state for the project dashboard shell. It mirrors the
 * empty command surface so streamed transitions match the settled dashboard.
 */
export default function ProjectDashboardLoading() {
  return (
    <section
      className="flex h-full min-h-0 flex-col justify-start md:flex-row"
      aria-label="Loading project dashboard"
      aria-busy="true"
    >
      <aside className="flex h-auto w-full shrink-0 flex-col p-2 md:h-full md:w-[274px]">
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
        <div className="dashboard-glass flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-xs p-2" />
      </main>
    </section>
  );
}
