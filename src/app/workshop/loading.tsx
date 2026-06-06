import { StaticWorkshopLoadingShell } from "@/components/workshop/StaticWorkshopLoadingShell";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <StaticWorkshopLoadingShell
      title="Workshop"
      showEyebrow={false}
      contentClassName="overflow-hidden"
    >
      <div className="h-full min-h-0 bg-white p-2">
        <section
          className="flex h-full min-h-0 items-start overflow-hidden bg-white px-2 py-3"
          aria-label="Workshop greeting skeleton"
        >
          <div className="flex w-[280px] max-w-full flex-col items-start">
            <Skeleton className="h-8 w-24 rounded-xs" />
            <Skeleton className="mt-3 h-4 w-32 rounded-xs" />
            <Skeleton className="mt-1 h-4 w-40 rounded-xs" />
          </div>
        </section>
      </div>
    </StaticWorkshopLoadingShell>
  );
}
