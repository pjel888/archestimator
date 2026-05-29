import { WorkshopPageShell } from "@/components/workshop/WorkshopPageShell";
import { Skeleton } from "@/components/ui/skeleton";

export default async function Loading() {
  return (
    <WorkshopPageShell
      title="Onboarding"
      eyebrow="Workshop"
      showEyebrow={false}
      breadcrumbs={["Onboarding"]}
      contentClassName="overflow-y-auto p-2"
    >
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="w-full max-w-lg space-y-4 rounded-xs border border-hairline bg-white p-6">
          <Skeleton className="mx-auto h-8 w-3/4" />
          <Skeleton className="mx-auto h-4 w-1/2" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-full" />
            <Skeleton className="h-7 w-full" />
            <Skeleton className="h-7 w-full" />
          </div>
          <Skeleton className="mx-auto h-10 w-32" />
        </div>
      </div>
    </WorkshopPageShell>
  );
}
