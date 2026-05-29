import { WorkshopPageShell } from "@/components/workshop/WorkshopPageShell";
import { Skeleton } from "@/components/ui/skeleton";

export default async function Loading() {
  return (
    <WorkshopPageShell
      title="Projects"
      eyebrow="Workspace"
      showEyebrow={false}
      breadcrumbs={["Projects"]}
    >
      <div className="flex h-full flex-col bg-white">
        <Skeleton className="h-[38px] w-full rounded-none" />
        <Skeleton className="h-[34px] w-full shrink-0 rounded-none" />
        <div className="min-h-0 flex-1 overflow-auto p-2">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="flex flex-col overflow-hidden rounded-xs border border-hairline bg-white">
                <Skeleton className="aspect-square w-full rounded-none" />
                <div className="flex flex-1 flex-col p-3">
                  <Skeleton className="mb-2 h-3 w-1/3" />
                  <Skeleton className="mb-1 h-4 w-2/3" />
                  <Skeleton className="mb-1 h-3 w-full" />
                  <Skeleton className="mb-3 h-3 w-3/4" />
                  <div className="mb-2 grid grid-cols-3 gap-1 border-y border-hairline py-2">
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                  <div className="mt-auto flex items-center justify-between border-t border-hairline pt-3">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-7 w-14 rounded-xs" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </WorkshopPageShell>
  );
}
