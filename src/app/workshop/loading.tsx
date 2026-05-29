import { WorkshopPageShell } from "@/components/workshop/WorkshopPageShell";
import { Skeleton } from "@/components/ui/skeleton";

export default async function Loading() {
  return (
    <WorkshopPageShell
      title="Workshop"
      showEyebrow={false}
      breadcrumbs={["Workshop"]}
      contentClassName="overflow-hidden"
    >
      <div className="h-full min-h-0 bg-white p-2">
        <section
          className="grid h-full min-h-0 grid-cols-12 auto-rows-min content-start gap-2 xl:grid-rows-[auto_minmax(0,1fr)] xl:content-stretch"
          aria-label="Workshop bento skeleton"
        >
          <div className="col-span-12 xl:col-span-8">
            <div className="grid content-start items-start gap-2 md:grid-cols-3">
              {Array.from({ length: 3 }, (_, i) => (
                <Skeleton key={i} className="aspect-square w-full rounded-xs" />
              ))}
            </div>
          </div>

          <div className="col-span-12 flex flex-col border border-hairline bg-white p-2 xl:col-span-4 xl:col-start-9 xl:row-span-2 xl:row-start-1">
            <Skeleton className="mb-2 h-4 w-16" />
            <Skeleton className="mb-2 h-6 w-full" />
            <div className="space-y-1.5">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-xs" />
              ))}
            </div>
          </div>
        </section>
      </div>
    </WorkshopPageShell>
  );
}
