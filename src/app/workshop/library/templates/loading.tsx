import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white p-2" role="status" aria-label="Loading templates">
      <div aria-hidden="true">
        <div className="flex h-[38px] items-center">
          <Skeleton className="h-7 w-full rounded-xs" />
        </div>
        <Skeleton className="h-[34px] w-full shrink-0 rounded-xs" />
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-2" aria-hidden="true">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex items-center gap-2 border-b border-hairline px-2 py-2.5">
            <Skeleton className="size-4 shrink-0" />
            <div className="min-w-0 flex-1">
              <Skeleton className="mb-1 h-3 w-2/5" />
              <Skeleton className="h-[9px] w-3/5" />
            </div>
            <Skeleton className="h-3 w-16 shrink-0" />
            <Skeleton className="h-3 w-20 shrink-0" />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading templates</span>
    </div>
  );
}
