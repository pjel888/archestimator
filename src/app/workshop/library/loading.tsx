import { WorkshopPageShell } from "@/components/workshop/WorkshopPageShell";
import { Skeleton } from "@/components/ui/skeleton";

export default async function Loading() {
  return (
    <WorkshopPageShell
      title="Library"
      eyebrow="Library"
      showEyebrow={false}
      breadcrumbs={["Library"]}
    >
      <div className="flex h-full flex-col bg-white">
        <div className="flex h-[38px] items-center">
          <Skeleton className="h-7 w-full rounded-none" />
        </div>
        <Skeleton className="h-[34px] w-full shrink-0 rounded-none" />
        <div className="min-h-0 flex-1 overflow-auto p-2">
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
      </div>
    </WorkshopPageShell>
  );
}
