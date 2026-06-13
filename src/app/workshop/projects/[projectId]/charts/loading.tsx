import { Skeleton } from "@/components/ui/skeleton";

/**
 * Route-level skeleton for the cost-comparison page (`01` PERF-1 / `09` P0.7).
 *
 * Mirrors the redesigned shape — header band + insight panel, a control row, the
 * variance spine rows, and the detail table — so the slow server fetch no longer
 * flashes the layout's wrong-shape sidebar/table skeleton (avoids the CLS snap on
 * the app's heaviest route).
 */
export default function Loading() {
  return (
    <section
      data-project-charts-loading
      aria-busy="true"
      className="flex h-full min-h-0 flex-col overflow-hidden bg-white"
      role="status"
      aria-label="Loading cost comparison"
    >
      <div className="flex shrink-0 flex-col gap-2 border-b border-hairline px-3 py-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <Skeleton className="h-3 w-48" />
            <Skeleton className="h-2.5 w-64" />
          </div>
          <Skeleton className="h-4 w-10" />
        </div>
        <Skeleton className="h-8 w-full max-w-md" />
        <div className="flex flex-wrap items-center gap-3">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-6 w-36" />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-3">
        <div className="rounded-xs border border-hairline bg-white">
          <Skeleton className="m-3 h-3 w-40" />
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="grid grid-cols-[10rem_1fr_5.5rem] items-center gap-3 px-3 py-2">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-2 w-full" />
              <Skeleton className="h-3 w-16 justify-self-end" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    </section>
  );
}
