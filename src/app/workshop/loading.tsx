import { StaticWorkshopLoadingShell } from "@/components/workshop/StaticWorkshopLoadingShell";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <StaticWorkshopLoadingShell
      title="Workshop"
      showEyebrow={false}
      contentClassName="overflow-hidden"
    >
      <div className="relative h-full min-h-0 overflow-hidden bg-white p-3" aria-label="Workshop dashboard skeleton">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-3">
          {/* Greeting hero */}
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-28 rounded-xs" />
            <Skeleton className="h-9 w-56 rounded-xs" />
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
            <div className="flex min-w-0 flex-col gap-3">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-12 w-full rounded-xs" />
                ))}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Skeleton className="h-40 w-full rounded-xs" />
                <Skeleton className="h-40 w-full rounded-xs" />
              </div>
              <Skeleton className="h-32 w-full rounded-xs" />
            </div>
            <div className="flex min-w-0 flex-col gap-3">
              <Skeleton className="h-28 w-full rounded-xs" />
              <Skeleton className="h-28 w-full rounded-xs" />
              <Skeleton className="h-40 w-full rounded-xs" />
            </div>
          </div>
        </div>
      </div>
    </StaticWorkshopLoadingShell>
  );
}
