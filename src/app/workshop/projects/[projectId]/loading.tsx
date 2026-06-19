import { Skeleton } from "@/components/ui/skeleton";

/**
 * Route-level loading state for the project dashboard shell. The main project
 * dashboard area is intentionally empty; only the editable details aside keeps
 * a small placeholder while project data resolves.
 */
export default function ProjectDashboardLoading() {
  return (
    <section className="flex h-full min-h-0 justify-start" aria-label="Loading project dashboard" aria-busy="true">
      <aside className="flex h-full w-[274px] shrink-0 flex-col p-2">
        <div className="dashboard-glass flex min-h-0 flex-1 flex-col gap-3 rounded-xs p-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </aside>
      <main className="min-h-0 flex-1 overflow-auto p-2" aria-label="Project dashboard">
        <div className="grid gap-2 xl:grid-cols-[minmax(0,1.35fr)_minmax(260px,0.65fr)]">
          <Skeleton className="h-[248px] w-full rounded-xs" />
          <Skeleton className="h-[248px] w-full rounded-xs" />
          <Skeleton className="h-24 w-full rounded-xs xl:col-span-2" />
        </div>
      </main>
    </section>
  );
}
