export default function ProjectActivityLoading() {
  return (
    <section className="flex h-full min-h-0 flex-col bg-[color:var(--glass-bg)]" aria-label="Loading project activity" role="status">
      <div className="shrink-0 border-b border-[color:var(--glass-border)] bg-white/65 px-3 py-2">
        <div className="h-3 w-40 animate-pulse rounded-xs bg-surfaceMuted" />
        <div className="mt-2 flex gap-2">
          <div className="h-7 w-32 animate-pulse rounded-xs bg-surfaceMuted" />
          <div className="h-7 w-28 animate-pulse rounded-xs bg-surfaceMuted" />
          <div className="h-7 w-28 animate-pulse rounded-xs bg-surfaceMuted" />
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-hidden p-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-16 animate-pulse rounded-xs border border-hairline bg-white/55" />
        ))}
      </div>
    </section>
  );
}
