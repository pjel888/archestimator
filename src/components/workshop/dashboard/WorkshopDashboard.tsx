import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import { DashboardEmptyState } from "./DashboardEmptyState";
import { DashboardHero } from "./DashboardHero";
import { FavoritesTree } from "./FavoritesTree";
import { ImageDestinationCard } from "./ImageDestinationCard";
import { LibraryCardLink, LibraryHubCard } from "./LibraryHubCard";
import { RecentProjectsList } from "./RecentProjectsList";
import { RecentSheetsList } from "./RecentSheetsList";
import {
  formatShortDate,
  isFirstRun,
  pickContinueEstimate,
  WORKSHOP_ROUTES,
  type DashboardLibrarySpotlight,
  type WorkshopDashboardData,
  type WorkshopProjectSummary,
} from "./lib";

type WorkshopDashboardProps = WorkshopDashboardData & {
  userDisplayName?: string | null;
};

const DASHBOARD_COUNT_COLUMN_WIDTH = "203px";

function PublishedProjectLinks({ projects }: { projects: WorkshopProjectSummary[] }) {
  const publishedProjects = projects
    .filter(
      (project) => project.publicationSummary?.status === "published" && project.publicationSummary.clientLinkPath,
    )
    .slice(0, 8);

  if (publishedProjects.length === 0) {
    return (
      <p className="dashboard-published-empty">
        No shared links yet
      </p>
    );
  }

  return (
    <ul className="dashboard-published-list" aria-label="Recent published project shared links">
      {publishedProjects.map((project) => {
        const publication = project.publicationSummary;
        const href = publication?.clientLinkPath ?? "#";
        const meta = publication?.latestOpenedAt
          ? `Opened ${formatShortDate(publication.latestOpenedAt)}`
          : publication?.openCount
            ? `${publication.openCount} opens`
            : "Shared link";

        return (
          <li key={project.id} className="dashboard-published-list-item">
            <Link href={href} className="dashboard-published-link">
              <span className="min-w-0 flex-1 truncate" title={project.name}>
                {project.name}
              </span>
              <span className="shrink-0 font-numeric text-[9px] text-secondary">
                {meta}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function RecentlyAddedComponents({ components }: { components: DashboardLibrarySpotlight["recentComponents"] }) {
  const recentComponents = components.slice(0, 5);

  if (recentComponents.length === 0) {
    return (
      <p className="dashboard-published-empty">
        No recent components yet
      </p>
    );
  }

  return (
    <ul className="dashboard-published-list" aria-label="Recently added components">
      {recentComponents.map((component) => (
        <li key={component.id} className="dashboard-published-list-item">
          <Link href={WORKSHOP_ROUTES.libraryComponents} className="dashboard-published-link">
            <span className="min-w-0 flex-1 truncate" title={component.name}>
              {component.name}
            </span>
            <span className="shrink-0 font-numeric text-[9px] text-secondary">
              {formatShortDate(component.updatedAt) || component.category}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * The Workshop "command center" homebase — a full-bleed bento (no centered
 * column): an editorial masthead headline, a square destination field (Projects
 * mountain image + supporting color blocks + Library hub + a big catalogue
 * numeral), and a working desk led by Favorites with compact Continue/Create
 * actions and the two recent ledgers ranked beneath it.
 */
export function WorkshopDashboard({
  homebase,
  favoriteProjects,
  librarySpotlight,
  userDisplayName,
}: WorkshopDashboardProps) {
  // A collaborator can have favourites but no own-workspace projects — only treat
  // the workspace as first-run when there is truly nothing to show.
  const firstRun = isFirstRun(homebase) && favoriteProjects.length === 0;
  const continueEstimate = pickContinueEstimate(homebase);
  const componentCount = librarySpotlight?.componentCount;
  const templateCount = librarySpotlight?.templateCount;
  const libraryItemCount = componentCount != null && templateCount != null ? componentCount + templateCount : undefined;
  const projectCount = homebase.projects.length;

  return (
    <div className="dashboard-canvas-wash h-full min-h-0 overflow-y-auto">
      <div className="dashboard-root w-full p-2">
        {/* Masthead — editorial headline only (full-bleed, no card). */}
        <div className="dashboard-masthead dashboard-masthead--solo">
          <DashboardHero displayName={userDisplayName} />
        </div>

        {firstRun ? (
          <div className="dashboard-first-run">
            <DashboardEmptyState displayName={userDisplayName} />
          </div>
        ) : (
          <>
            {/* Destination field — a big Projects mountain hero (2×2), three
                supporting color blocks, the Library hub, and a wide display
                numeral. */}
            <div className="dashboard-imageband">
              <div
                aria-label="Projects"
                className="dashboard-destination-card dashboard-destination-grid dashboard-card-hover dashboard-destination-card--projects group iband-projects relative h-full min-h-[118px] w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
              >
                <div className="flex min-h-0 items-start justify-between gap-2">
                  <span className="dashboard-destination-card-index font-numeric text-[22px] font-thin leading-none">
                    01
                  </span>
                  <Link
                    href={WORKSHOP_ROUTES.projects}
                    aria-label="Open Projects"
                    className="dashboard-project-card-arrow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                  >
                    <ArrowUpRight
                      size={32}
                      weight="regular"
                      aria-hidden="true"
                      className="dashboard-destination-card-icon transition-[color,transform] duration-[200ms] ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transform-none motion-reduce:transition-none"
                    />
                  </Link>
                </div>

                <div
                  className="dashboard-project-card-panel"
                  style={{
                    display: "grid",
                    gridTemplateColumns: `var(--dashboard-count-col, ${DASHBOARD_COUNT_COLUMN_WIDTH}) minmax(0, 1fr)`,
                    alignItems: "stretch",
                    minHeight: 0,
                    paddingBlock: 8,
                    paddingRight: 0,
                    borderTop: "1px solid var(--destination-inner-border, var(--glass-border))",
                    borderBottom: "1px solid var(--destination-inner-border, var(--glass-border))",
                  }}
                >
                  <div
                    className="dashboard-project-count-panel"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "minmax(0, 1fr) auto",
                      alignItems: "start",
                      height: "100%",
                      minHeight: 0,
                      padding: 8,
                      borderRight: "1px solid var(--destination-inner-border, var(--glass-border))",
                    }}
                  >
                    <span className="font-numeric text-[9px] font-medium uppercase tracking-normal text-secondary">
                      Project Count
                    </span>
                    <span className="dashboard-bignum-value">{projectCount}</span>
                  </div>

                  <div
                    className="dashboard-published-panel"
                    style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0, minWidth: 0 }}
                  >
                    <div className="dashboard-published-header">
                      <span className="text-[12px] font-medium text-ink">Published Projects</span>
                    </div>
                    <PublishedProjectLinks projects={homebase.projects} />
                  </div>
                </div>

                <div className="flex min-h-0 items-end justify-end">
                  <span className="dashboard-destination-card-title font-display text-[32px] font-normal leading-none tracking-[0.04em] uppercase">
                    Projects
                  </span>
                </div>
              </div>
              <div
                aria-label="Components"
                className="dashboard-destination-card dashboard-destination-grid dashboard-card-hover dashboard-destination-card--components group iband-components relative h-full min-h-[118px] w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
              >
                <div className="flex min-h-0 items-start justify-between gap-2">
                  <span className="dashboard-destination-card-index font-numeric text-[22px] font-thin leading-none">
                    02
                  </span>
                  <Link
                    href={WORKSHOP_ROUTES.libraryComponents}
                    aria-label="Open Components"
                    className="dashboard-project-card-arrow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                  >
                    <ArrowUpRight
                      size={32}
                      weight="regular"
                      aria-hidden="true"
                      className="dashboard-destination-card-icon transition-[color,transform] duration-[200ms] ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transform-none motion-reduce:transition-none"
                    />
                  </Link>
                </div>

                <div
                  className="dashboard-component-card-panel"
                  style={{
                    display: "grid",
                    gridTemplateColumns: `var(--dashboard-count-col, ${DASHBOARD_COUNT_COLUMN_WIDTH}) minmax(0, 1fr)`,
                    alignItems: "stretch",
                    minHeight: 0,
                    paddingBlock: 8,
                    paddingRight: 0,
                    borderTop: "1px solid var(--destination-inner-border, var(--glass-border))",
                    borderBottom: "1px solid var(--destination-inner-border, var(--glass-border))",
                  }}
                >
                  <div
                    className="dashboard-project-count-panel"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "minmax(0, 1fr) auto",
                      alignItems: "start",
                      height: "100%",
                      minHeight: 0,
                      padding: 8,
                      borderRight: "1px solid var(--destination-inner-border, var(--glass-border))",
                    }}
                  >
                    <span className="font-numeric text-[9px] font-medium uppercase tracking-normal text-secondary">
                      Component Count
                    </span>
                    <span className="dashboard-bignum-value">{componentCount ?? "—"}</span>
                  </div>

                  <div
                    className="dashboard-published-panel"
                    style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0, minWidth: 0 }}
                  >
                    <div className="dashboard-published-header">
                      <span className="text-[12px] font-medium text-ink">Recently Added Components</span>
                    </div>
                    <RecentlyAddedComponents components={librarySpotlight?.recentComponents ?? []} />
                  </div>
                </div>

                <div className="flex min-h-0 items-end justify-end">
                  <span className="dashboard-destination-card-title font-display text-[32px] font-normal leading-none tracking-[0.04em] uppercase">
                    Components
                  </span>
                </div>
              </div>
              <ImageDestinationCard
                kind="templates"
                href={WORKSHOP_ROUTES.libraryTemplates}
                label="Templates"
                count={templateCount}
                countNoun="templates"
                plateIndex="03"
                className="iband-templates"
              />
              <LibraryHubCard
                href={WORKSHOP_ROUTES.library}
                count={libraryItemCount}
                continueEstimate={continueEstimate}
                recentProjects={homebase.projects}
                className="iband-library"
              />
            </div>

            {/* Working desk — Favorites and recent work are one divided ledger;
                Continue stays as the compact action rail. */}
            <div className="dashboard-desk">
              <div className="desk-board">
                <div className="desk-board-favs">
                  <FavoritesTree favoriteProjects={favoriteProjects} embedded />
                </div>
                <div className="desk-board-recents">
                  <div className="desk-recproj">
                    <RecentProjectsList projects={homebase.projects} embedded />
                  </div>
                  <div className="desk-recsheet">
                    <RecentSheetsList estimates={homebase.estimates} embedded />
                  </div>
                </div>
              </div>
              <div className="desk-continue relative min-h-0 overflow-visible rounded-xs">
                {continueEstimate ? <LibraryCardLink href={WORKSHOP_ROUTES.library} /> : null}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
