import { Skeleton } from "@/components/ui/skeleton";

/**
 * Route-level loading state for the project dashboard shell. The main project
 * dashboard area is intentionally empty; only the editable details aside keeps
 * a small placeholder while project data resolves.
 */
export default function ProjectDashboardLoading() {
  return (
    <section className="flex h-full min-h-0 justify-start bg-white" aria-label="Loading project dashboard" aria-busy="true">
      <aside className="flex h-full w-[274px] shrink-0 flex-col gap-3 border-r border-hairline bg-white py-2 pl-4 pr-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-12 w-full" />
      </aside>
      <main className="min-h-0 flex-1 overflow-auto bg-white" aria-label="Project dashboard empty page" />
    </section>
  );
}
