import { Skeleton } from "@/components/ui/skeleton";

/**
 * Per-zone skeletons for the dashboard `<main>` (R13) — never spinners. Shapes
 * mirror the real zones so the layout doesn't jump when data resolves.
 */

function HeadlineSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-[84px] max-w-md" />
      <Skeleton className="h-3 w-36" />
    </div>
  );
}

function CostMixSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-3.5 w-24" />
      <div className="grid grid-cols-1 items-center gap-3 lg:grid-cols-2">
        <Skeleton className="h-[220px]" />
        <div className="flex flex-col gap-1.5">
          {Array.from({ length: 5 }).map((_unused, index) => (
            <Skeleton key={index} className="h-5 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

function EstimateListSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-3.5 w-28" />
      <div className="flex flex-col gap-1.5">
        {Array.from({ length: 3 }).map((_unused, index) => (
          <Skeleton key={index} className="h-5 w-full" />
        ))}
      </div>
    </div>
  );
}

export function DashboardMainSkeleton() {
  return (
    <div className="flex flex-col gap-lg" aria-hidden="true">
      <HeadlineSkeleton />
      <CostMixSkeleton />
      <EstimateListSkeleton />
    </div>
  );
}
