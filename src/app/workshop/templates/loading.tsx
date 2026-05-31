import { StaticWorkshopLoadingShell } from "@/components/workshop/StaticWorkshopLoadingShell";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <StaticWorkshopLoadingShell
      title="Templates"
      eyebrow="Templates"
      showEyebrow={false}
    >
      <div className="flex h-full flex-col bg-white">
        <div className="flex h-[38px] items-center">
          <Skeleton className="h-7 w-full rounded-xs" />
        </div>
        <Skeleton className="h-[34px] w-full shrink-0 rounded-xs" />
        <div className="min-h-0 flex-1 overflow-auto p-2">
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="flex flex-col overflow-hidden rounded-xs border border-hairline bg-white p-3">
                <Skeleton className="mb-2 h-4 w-3/4" />
                <Skeleton className="mb-1 h-3 w-full" />
                <Skeleton className="mb-3 h-3 w-1/2" />
                <div className="space-y-1">
                  <Skeleton className="h-2 w-full" />
                  <Skeleton className="h-2 w-5/6" />
                  <Skeleton className="h-2 w-4/6" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </StaticWorkshopLoadingShell>
  );
}
