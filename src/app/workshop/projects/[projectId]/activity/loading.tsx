import { Skeleton } from "@/components/ui/skeleton";

export default function ProjectActivityLoading() {
  return (
    <section
      className="flex h-full min-h-0 flex-col bg-[color:var(--glass-bg)]"
      aria-label="Loading project activity"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">Loading project activity</span>
      <div className="shrink-0 border-b border-[color:var(--glass-border)] bg-white/85 px-3 py-2 shadow-[0_1px_0_rgba(15,23,42,0.03)]">
        <div className="flex min-h-9 items-start justify-between gap-2">
          <div className="min-w-0">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="mt-2 h-3 w-48" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="size-7" />
          </div>
        </div>
        <div className="mt-2 grid min-h-8 grid-cols-[minmax(0,1fr)_auto] gap-2 md:grid-cols-[minmax(12rem,17rem)_minmax(0,1fr)_auto]">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="hidden h-8 w-full md:block" />
          <div className="flex gap-1">
            <Skeleton className="h-7 w-[84px]" />
            <Skeleton className="h-7 w-[56px]" />
          </div>
        </div>
        <div className="mt-2 flex h-7 items-center">
          <Skeleton className="h-3 w-64 max-w-full" />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden p-3">
        <div className="overflow-hidden rounded-xs border border-hairline bg-white/55">
          <div className="hidden h-8 grid-cols-[5.25rem_minmax(9rem,13rem)_minmax(0,1.45fr)_minmax(10rem,1fr)_5.75rem] items-center border-b border-hairline bg-white/65 px-2 md:grid md:gap-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-14" />
            <Skeleton className="ml-auto h-3 w-12" />
          </div>
          {Array.from({ length: 7 }).map((_, index) => (
            <div
              key={`activity-skeleton-row-${index}`}
              className="flex h-10 items-center gap-3 border-b border-hairline px-2 last:border-b-0"
            >
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-3 flex-1" />
              <Skeleton className="hidden h-3 w-24 md:block" />
              <Skeleton className="ml-auto h-3 w-12" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
