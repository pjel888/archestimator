import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex h-full min-h-0 overflow-hidden bg-white" role="status" aria-label="Loading library">
      <div className="flex min-w-0 flex-1 flex-col p-2" aria-hidden="true">
        <Skeleton className="h-7 w-32" />
        <div className="mt-2 grid grid-cols-[repeat(auto-fill,minmax(164px,1fr))] gap-2">
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} className="h-[236px] w-full" />
          ))}
        </div>
      </div>
      <div className="hidden w-[312px] shrink-0 border-l border-hairline p-2 lg:block" aria-hidden="true">
        <Skeleton className="h-7 w-full" />
        <div className="mt-2 space-y-1">
          {Array.from({ length: 9 }, (_, index) => (
            <Skeleton key={index} className="h-6 w-full" />
          ))}
        </div>
      </div>
      <span className="sr-only">Loading library</span>
    </div>
  );
}
