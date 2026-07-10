import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="max-w-3xl space-y-3 overflow-y-auto p-2" aria-label="Settings loading">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="space-y-2 border border-hairline bg-white p-2">
          <Skeleton className="mb-3 h-4 w-1/4" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-full" />
            <Skeleton className="h-7 w-full" />
            <Skeleton className="h-7 w-2/3" />
          </div>
        </div>
      ))}
      <div className="flex justify-end">
        <Skeleton className="h-8 w-24" />
      </div>
    </div>
  );
}
