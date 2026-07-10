import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main
      role="status"
      aria-live="polite"
      aria-label="Loading invite"
      aria-busy="true"
      className="mx-auto flex min-h-[50vh] w-full max-w-md flex-col justify-center gap-3 p-4"
    >
      <span className="sr-only">Loading invite</span>
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <div className="mt-2 flex gap-2">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-8 w-28" />
      </div>
    </main>
  );
}
