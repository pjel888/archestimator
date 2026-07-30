import { Skeleton } from "@/components/ui/skeleton";

export default function ProjectTimelineLoading() {
  return (
    <section className="h-full min-h-0 overflow-y-auto bg-canvas p-3 sm:p-4" aria-busy="true" aria-label="Loading project timeline">
      <div className="space-y-3" aria-hidden="true">
        <div className="border border-hairline bg-white p-3">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-2 h-4 w-36" />
          <Skeleton className="mt-2 h-3 w-72 max-w-full" />
        </div>
        <div className="border border-hairline bg-white">
          <div className="border-b border-hairline p-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-2 h-4 w-32" />
          </div>
          <div className="grid gap-px bg-hairline sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <div className="bg-white p-4" key={index}>
                <Skeleton className="h-3 w-20" />
                <Skeleton className="mt-3 h-5 w-28" />
                <Skeleton className="mt-2 h-3 w-full" />
              </div>
            ))}
          </div>
        </div>
        <div className="border border-hairline bg-white p-4">
          <div className="flex min-w-max gap-3 overflow-hidden pt-6">
            {Array.from({ length: 3 }, (_, index) => (
              <div className="w-[min(20rem,calc(100vw-4rem))] shrink-0 border border-hairline p-4 sm:w-80" key={index}>
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-5 h-4 w-40" />
                <Skeleton className="mt-3 h-3 w-full" />
                <Skeleton className="mt-2 h-3 w-2/3" />
              </div>
            ))}
          </div>
        </div>
      </div>
      <span className="sr-only">Loading project timeline</span>
    </section>
  );
}
