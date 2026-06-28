import { Skeleton } from "@/components/ui/skeleton";

export function ProposalsListSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-hairline px-4 py-3">
        <Skeleton className="h-5 w-40 rounded-xs" />
        <Skeleton className="h-8 w-24 rounded-xs" />
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-3">
        <div className="overflow-hidden rounded-xs border border-hairline bg-white">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="grid gap-3 border-b border-hairline p-4 last:border-b-0 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] md:items-center">
              <div className="min-w-0">
                <Skeleton className="mb-2 h-3 w-20 rounded-xs" />
                <Skeleton className="mb-2 h-4 w-48 max-w-full rounded-xs" />
                <Skeleton className="h-3 w-32 rounded-xs" />
              </div>
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-6 w-24 rounded-xs" />
                <Skeleton className="h-6 w-28 rounded-xs" />
              </div>
              <Skeleton className="h-8 w-28 rounded-xs" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
