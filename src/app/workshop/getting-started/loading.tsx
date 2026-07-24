import { Skeleton } from "@/components/ui/skeleton";
import { WorkshopRouteHeader } from "@/components/workshop/WorkshopRouteHeader";

export default function Loading() {
  return (
    <WorkshopRouteHeader
      title="Getting Started"
      eyebrow="Guidance"
      breadcrumbs={["Getting Started"]}
      contentClassName="min-h-0 flex-1 overflow-y-auto p-2"
    >
      <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-2" aria-label="Getting started loading">
        <div className="rounded-xs border border-hairline bg-white p-4">
          <Skeleton className="h-3 w-32 rounded-xs" />
          <Skeleton className="mt-3 h-5 w-2/3 rounded-xs" />
          <Skeleton className="mt-2 h-3 w-full max-w-xl rounded-xs" />
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="min-h-48 rounded-xs border border-hairline bg-white p-3">
              <Skeleton className="h-3 w-24 rounded-xs" />
              <Skeleton className="mt-3 h-2.5 w-full rounded-xs" />
              <Skeleton className="mt-2 h-2.5 w-4/5 rounded-xs" />
              <Skeleton className="mt-20 h-8 w-full rounded-xs" />
            </div>
          ))}
        </div>
      </div>
    </WorkshopRouteHeader>
  );
}
