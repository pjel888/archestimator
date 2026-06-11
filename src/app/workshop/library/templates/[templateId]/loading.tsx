import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex h-full min-h-0 overflow-hidden bg-white" role="status" aria-label="Loading template editor">
      <div className="hidden w-[264px] shrink-0 border-r border-hairline p-2 lg:block" aria-hidden="true">
        <Skeleton className="h-7 w-full" />
        <div className="mt-2 space-y-1">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-6 w-full" />
          ))}
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col p-2" aria-hidden="true">
        <Skeleton className="h-10 w-full" />
        <div className="mt-2 flex-1 space-y-1">
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} className="h-8 w-full" />
          ))}
        </div>
        <Skeleton className="h-9 w-full" />
      </div>
      <span className="sr-only">Loading template editor</span>
    </div>
  );
}
