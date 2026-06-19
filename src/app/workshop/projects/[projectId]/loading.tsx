import { Skeleton } from "@/components/ui/skeleton";

function DashboardModuleSkeleton({ label }: { readonly label: string }) {
  return (
    <section
      aria-label={label}
      className="flex min-h-[152px] min-w-0 flex-col rounded-xs border border-[color:var(--glass-border)] bg-white/50 p-2"
    >
      <Skeleton className="h-4 w-24" />
      <div className="mt-3 space-y-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-5/6" />
        <Skeleton className="h-8 w-2/3" />
      </div>
    </section>
  );
}

/**
 * Route-level loading state for the project dashboard shell. It mirrors the
 * compact Phase 1 command surface so streamed transitions do not flash the old
 * overview/actions layout.
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
      <main className="min-h-0 flex-1 overflow-auto p-2" aria-label="Project dashboard">
        <div className="dashboard-glass flex min-h-0 flex-1 flex-col overflow-hidden rounded-xs p-2">
          <div className="grid min-h-0 flex-1 gap-2 overflow-auto lg:grid-cols-2">
            <DashboardModuleSkeleton label="Recent sheets" />
            <DashboardModuleSkeleton label="Published link" />
            <DashboardModuleSkeleton label="Estimate activity" />
            <DashboardModuleSkeleton label="Location" />
          </div>
        </div>
      </main>
    </section>
  );
}
