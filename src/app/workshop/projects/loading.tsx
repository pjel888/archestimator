import { StaticWorkshopLoadingShell } from "@/components/workshop/StaticWorkshopLoadingShell";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <StaticWorkshopLoadingShell
      title="Projects"
      eyebrow="Workspace"
      showEyebrow={false}
    >
      <div className="dashboard-canvas-wash flex h-full flex-col">
        <Skeleton className="h-[38px] w-full rounded-xs" />
        <Skeleton className="h-[34px] w-full shrink-0 rounded-xs" />
        <div className="min-h-0 flex-1 overflow-auto p-2">
          {/* Access tabs ("Your projects" / "Shared to you") sit above the grid in the
              glass tab bar, so the skeleton reserves that row to avoid a hydration shift. */}
          <div className="mb-3 inline-flex items-center gap-1 rounded-xs bg-white/45 p-1">
            <Skeleton className="h-7 w-28 rounded-xs" />
            <Skeleton className="h-7 w-32 rounded-xs" />
          </div>
          {/* Mirrors the default "large" project card (the server view-mode snapshot).
              Users with a saved list/small/medium preference hydrate into their mode. */}
          <div className="grid grid-cols-[repeat(auto-fill,minmax(248px,1fr))] gap-3">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="flex flex-col overflow-hidden rounded-xs border border-hairline bg-white">
                <div className="border-b border-hairline">
                  <Skeleton className="aspect-[4/3] w-full" />
                </div>
                <div className="flex flex-1 flex-col p-3">
                  <Skeleton className="mb-2 h-2 w-1/3" />
                  <Skeleton className="mb-1.5 h-3 w-4/5" />
                  <Skeleton className="mb-3 h-3 w-3/5" />
                  <Skeleton className="mb-1.5 h-2.5 w-2/3" />
                  <Skeleton className="mb-3 h-2.5 w-1/2" />
                  <div className="mt-auto flex items-center justify-between border-t border-hairline pt-3">
                    <Skeleton className="h-2.5 w-14" />
                    <Skeleton className="h-6 w-14" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </StaticWorkshopLoadingShell>
  );
}
