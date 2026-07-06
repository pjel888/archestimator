export default function ProjectActivityLoading() {
  return (
    <section className="flex h-full min-h-0 flex-col bg-[color:var(--glass-bg)]" aria-label="Loading project activity" role="status">
      <div className="shrink-0 border-b border-[color:var(--glass-border)] bg-white/85 px-3 py-2 shadow-[0_1px_0_rgba(15,23,42,0.03)]">
        <div className="flex min-h-9 items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="h-3 w-28 animate-pulse rounded-xs bg-surfaceMuted" />
            <div className="mt-2 h-3 w-48 animate-pulse rounded-xs bg-surfaceMuted" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-24 animate-pulse rounded-xs bg-surfaceMuted" />
            <div className="size-7 animate-pulse rounded-xs bg-surfaceMuted" />
          </div>
        </div>
        <div className="mt-2 grid min-h-8 grid-cols-[minmax(0,1fr)_auto] gap-2 md:grid-cols-[minmax(12rem,17rem)_minmax(0,1fr)_auto]">
          <div className="h-8 animate-pulse rounded-xs border border-hairline bg-white/65" />
          <div className="hidden h-8 animate-pulse rounded-xs border border-hairline bg-white/65 md:block" />
          <div className="flex gap-1">
            <div className="h-7 w-[84px] animate-pulse rounded-xs bg-surfaceMuted" />
            <div className="h-7 w-[56px] animate-pulse rounded-xs bg-surfaceMuted" />
          </div>
        </div>
        <div className="mt-2 flex h-7 items-center">
          <div className="h-3 w-64 max-w-full animate-pulse rounded-xs bg-surfaceMuted" />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden p-3">
        <div className="overflow-hidden rounded-xs border border-hairline bg-white/55">
          <div className="flex h-8 items-center justify-between border-b border-hairline bg-white/65 px-2">
            <div className="h-3 w-28 animate-pulse rounded-xs bg-surfaceMuted" />
            <div className="h-3 w-14 animate-pulse rounded-xs bg-surfaceMuted" />
          </div>
          {Array.from({ length: 7 }).map((_, index) => (
            <div key={index} className="grid min-h-[76px] grid-cols-1 gap-1.5 border-t border-hairline px-2 py-2 first:border-t-0 md:grid-cols-[5.75rem_minmax(9rem,13rem)_minmax(0,1.45fr)_minmax(9rem,1fr)_5.5rem] md:items-center md:gap-3">
              <div className="h-4 w-20 animate-pulse rounded-xs bg-surfaceMuted" />
              <div className="h-4 w-24 animate-pulse rounded-xs bg-surfaceMuted" />
              <div className="h-4 w-full animate-pulse rounded-xs bg-surfaceMuted" />
              <div className="h-4 w-4/5 animate-pulse rounded-xs bg-surfaceMuted" />
              <div className="hidden h-4 w-16 animate-pulse rounded-xs bg-surfaceMuted md:block" />
            </div>
          ))}
          <div className="min-h-12 border-t border-hairline px-3 py-2">
            <div className="mx-auto h-4 w-32 animate-pulse rounded-xs bg-surfaceMuted" />
          </div>
        </div>
      </div>
    </section>
  );
}
