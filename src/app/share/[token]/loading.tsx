import { ShareContainer } from "@/components/share/ShareContainer";

function SkeletonBlock({ className }: { className: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-xs bg-[#E7E0D3] ${className}`} />;
}

export default function Loading() {
  return (
    <main aria-label="Loading proposal review" className="min-h-screen bg-proposalPaper py-8 text-ink">
      <ShareContainer className="space-y-4">
        <section
          role="status"
          aria-live="polite"
          aria-label="Loading proposal review"
          className="rounded-xs border border-hairline bg-white p-4"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1 space-y-2">
              <SkeletonBlock className="h-3 w-24" />
              <SkeletonBlock className="h-8 w-full max-w-md" />
              <SkeletonBlock className="h-3 w-40" />
            </div>
            <SkeletonBlock className="h-8 w-28 shrink-0" />
          </div>
        </section>

        <section aria-hidden="true" className="rounded-xs border border-hairline bg-white p-4">
          <SkeletonBlock className="h-3 w-28" />
          <SkeletonBlock className="mt-2 h-8 w-56" />
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="space-y-2">
                <SkeletonBlock className="h-3 w-20" />
                <SkeletonBlock className="h-4 w-24" />
              </div>
            ))}
          </div>
        </section>

        <section aria-hidden="true" className="rounded-xs border border-hairline bg-white p-4">
          <div className="flex flex-wrap gap-2">
            <SkeletonBlock className="h-8 w-28" />
            <SkeletonBlock className="h-8 w-32" />
            <SkeletonBlock className="h-8 w-24" />
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-[280px_minmax(0,1fr)]">
            <div className="hidden space-y-2 rounded-xs border border-hairline bg-proposalPaper p-3 lg:block">
              {Array.from({ length: 8 }).map((_, index) => (
                <SkeletonBlock key={index} className={`h-4 ${index % 3 === 0 ? "w-5/6" : "w-2/3"}`} />
              ))}
            </div>
            <div className="space-y-2">
              {Array.from({ length: 7 }).map((_, index) => (
                <SkeletonBlock key={index} className={`h-10 ${index % 2 === 0 ? "w-full" : "w-11/12"}`} />
              ))}
            </div>
          </div>
        </section>
      </ShareContainer>
    </main>
  );
}
