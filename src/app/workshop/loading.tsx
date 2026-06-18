import { StaticWorkshopLoadingShell } from "@/components/workshop/StaticWorkshopLoadingShell";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Dashboard loading skeleton. It mirrors the real WorkshopDashboard's bento
 * scaffold by reusing the exact same layout classes (dashboard-root /
 * dashboard-imageband / iband-* / dashboard-destination-grid / dashboard-desk /
 * desk-*). Grid placement is carried by those classes ONLY — never inline — so
 * the skeleton inherits every responsive reflow (the @media rules at 1023px and
 * 639px) for free and lands with zero layout shift against the hydrated page.
 */

const COUNT_PANEL_STYLE = {
  display: "grid",
  gridTemplateColumns: "var(--dashboard-count-col, 203px) minmax(0, 1fr)",
  alignItems: "stretch",
  minHeight: 0,
  paddingBlock: 8,
  paddingRight: 0,
  borderTop: "1px solid var(--destination-inner-border, var(--glass-border))",
  borderBottom: "1px solid var(--destination-inner-border, var(--glass-border))",
} as const;

function LedgerRows({ count }: { count: number }) {
  return (
    <div className="min-h-0 flex-1">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-2 px-2 py-[6px]"
          style={{ borderBottom: index < count - 1 ? "1px solid var(--destination-inner-list-border)" : 0 }}
        >
          <Skeleton className="h-2.5 min-w-0 flex-1 rounded-xs" />
          <Skeleton className="h-2.5 w-8 shrink-0 rounded-xs" />
        </div>
      ))}
    </div>
  );
}

function ContentTileSkeleton({ kind }: { kind: "projects" | "components" }) {
  const ibandClass = kind === "projects" ? "iband-projects" : "iband-components";
  const toneClass =
    kind === "projects" ? "dashboard-destination-card--projects" : "dashboard-destination-card--components";

  return (
    <div
      aria-hidden="true"
      className={`dashboard-destination-card dashboard-destination-grid ${toneClass} ${ibandClass} relative h-full min-h-[118px] w-full`}
    >
      {/* Row 1 — index + arrow */}
      <div className="flex min-h-0 items-start justify-between gap-2">
        <Skeleton className="h-5 w-7 rounded-xs" />
        <Skeleton className="h-7 w-7 rounded-xs" />
      </div>

      {/* Row 2 — count column + ledger panel */}
      <div style={COUNT_PANEL_STYLE}>
        <div
          className="grid h-full min-h-0"
          style={{
            gridTemplateColumns: "minmax(0, 1fr) auto",
            alignItems: "start",
            padding: 8,
            borderRight: "1px solid var(--destination-inner-border, var(--glass-border))",
          }}
        >
          <Skeleton className="h-2.5 w-16 rounded-xs" />
          <Skeleton className="h-7 w-10 rounded-xs" />
        </div>
        <div className="flex h-full min-h-0 min-w-0 flex-col">
          <div className="flex h-12 shrink-0 items-center px-2">
            <Skeleton className="h-3 w-32 rounded-xs" />
          </div>
          <LedgerRows count={4} />
        </div>
      </div>

      {/* Row 3 — display title */}
      <div className="flex min-h-0 items-end justify-end">
        <Skeleton className="h-7 w-28 rounded-xs" />
      </div>
    </div>
  );
}

function SimpleTileSkeleton({ iband }: { iband: string }) {
  return (
    <div aria-hidden="true" className={`dashboard-destination-card ${iband} relative h-full min-h-[118px] w-full`}>
      <span className="absolute left-2 top-2 z-10">
        <Skeleton className="h-5 w-7 rounded-xs" />
      </span>
      <span className="absolute right-2 top-2 z-10">
        <Skeleton className="h-7 w-7 rounded-xs" />
      </span>
      <span className="absolute bottom-2 right-2 z-10">
        <Skeleton className="h-7 w-24 rounded-xs" />
      </span>
    </div>
  );
}

function LedgerColumnSkeleton({ rows }: { rows: number }) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-12 shrink-0 items-center border-b border-hairline px-2">
        <Skeleton className="h-3 w-20 rounded-xs" />
      </div>
      <div className="min-h-0 flex-1">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="flex items-center gap-2 px-2 py-2">
            <Skeleton className="h-3 w-3 shrink-0 rounded-xs" />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <Skeleton className="h-2.5 w-3/4 rounded-xs" />
              <Skeleton className="h-2 w-1/2 rounded-xs" />
            </div>
            <Skeleton className="h-2.5 w-7 shrink-0 rounded-xs" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <StaticWorkshopLoadingShell title="Workshop" showEyebrow={false} hideTitle contentClassName="overflow-hidden">
      <div className="dashboard-canvas-wash h-full min-h-0 overflow-y-auto" aria-label="Workshop dashboard loading">
        <div className="dashboard-root w-full p-2">
          {/* Masthead — greeting strip */}
          <div className="dashboard-masthead dashboard-masthead--solo">
            <div className="flex h-full flex-col items-start justify-start gap-2 px-2 py-2">
              <Skeleton className="h-6 w-6 rounded-xs" />
              <Skeleton className="h-3.5 w-28 rounded-xs" />
              <Skeleton className="h-8 w-48 rounded-xs" />
            </div>
          </div>

          {/* Destination field — reuses imageband + iband-* placement classes */}
          <div className="dashboard-imageband">
            <ContentTileSkeleton kind="projects" />
            <ContentTileSkeleton kind="components" />
            <SimpleTileSkeleton iband="iband-templates" />

            {/* Library hub — same internal grid scaffold as LibraryHubCard */}
            <div className="dashboard-destination-card--library iband-library relative h-full min-h-0 w-full" aria-hidden="true">
              <span className="iband-library-continue-slot">
                <span className="dashboard-destination-card relative flex h-full min-h-[118px] w-full items-end justify-end p-2">
                  <Skeleton className="h-7 w-20 rounded-xs" />
                </span>
              </span>
              <span className="iband-library-stack">
                <span className="dashboard-destination-card iband-library-new-project grid place-items-center">
                  <Skeleton className="h-5 w-16 rounded-xs" />
                </span>
                <span className="iband-library-action-grid">
                  <span className="dashboard-destination-card iband-library-new-component grid place-items-center">
                    <Skeleton className="h-4 w-4 rounded-xs" />
                  </span>
                  <span className="dashboard-destination-card iband-library-new-sheet grid place-items-center">
                    <Skeleton className="h-4 w-4 rounded-xs" />
                  </span>
                </span>
              </span>
            </div>
          </div>

          {/* Working desk — favorites + recents ledger, continue rail */}
          <div className="dashboard-desk">
            <div className="desk-board">
              <div className="desk-board-favs">
                <LedgerColumnSkeleton rows={4} />
              </div>
              <div className="desk-board-recents">
                <div className="desk-recproj">
                  <LedgerColumnSkeleton rows={3} />
                </div>
                <div className="desk-recsheet">
                  <LedgerColumnSkeleton rows={3} />
                </div>
              </div>
            </div>
            <div className="desk-continue relative min-h-0 overflow-visible rounded-xs">
              <span className="dashboard-destination-card relative flex h-full min-h-[118px] w-full flex-col items-center justify-center gap-3 p-2">
                <Skeleton className="h-5 w-5 rounded-xs" />
                <Skeleton className="h-3 w-24 rounded-xs" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </StaticWorkshopLoadingShell>
  );
}
