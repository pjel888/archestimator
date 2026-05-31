import { Skeleton } from "@/components/ui/skeleton";

export function ProjectRouteContentFallback() {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-canvas p-2" role="status" aria-label="Loading project workspace">
      <div className="flex min-h-0 flex-1 overflow-hidden rounded-xs border border-hairline bg-white">
        <div className="hidden w-[184px] shrink-0 border-r border-hairline bg-white p-2 sm:block" aria-hidden="true">
          <Skeleton className="h-6 w-24" />
          <div className="mt-3 space-y-1">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-7 w-full" />
            ))}
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex h-10 shrink-0 items-center justify-between border-b border-hairline px-2" aria-hidden="true">
            <Skeleton className="h-4 w-32" />
            <div className="flex gap-1">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-16" />
            </div>
          </div>
          <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(160px,240px)] gap-2 overflow-hidden p-2" aria-hidden="true">
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-5/6" />
              <Skeleton className="h-8 w-3/4" />
            </div>
            <div className="hidden space-y-2 border-l border-hairline pl-2 md:block">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          </div>
        </div>
      </div>
      <span className="sr-only">Loading project workspace</span>
    </div>
  );
}
