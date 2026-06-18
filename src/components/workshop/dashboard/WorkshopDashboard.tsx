"use client";

import { ContinueCard } from "./ContinueCard";
import { CreateActions } from "./CreateActions";
import { DashboardEmptyState } from "./DashboardEmptyState";
import { DashboardHero } from "./DashboardHero";
import { FavoritesTree } from "./FavoritesTree";
import { ImageDestinationCard } from "./ImageDestinationCard";
import { LibraryHubCard } from "./LibraryHubCard";
import { RecentProjectsList } from "./RecentProjectsList";
import { RecentSheetsList } from "./RecentSheetsList";
import { isFirstRun, pickContinueEstimate, WORKSHOP_ROUTES, type WorkshopDashboardData } from "./lib";

type WorkshopDashboardProps = WorkshopDashboardData & {
  userDisplayName?: string | null;
};

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
              <ImageDestinationCard
                kind="projects"
                href={WORKSHOP_ROUTES.projects}
                label="Projects"
                count={homebase.projects.length || undefined}
                countNoun="recent"
                plateIndex="01"
                emphasis
                className="iband-projects"
              />
              <ImageDestinationCard
                kind="components"
                href={WORKSHOP_ROUTES.libraryComponents}
                label="Components"
                count={componentCount}
                countNoun="components"
                plateIndex="02"
                className="iband-components"
              />
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
                className="iband-library"
              />
              <div aria-hidden="true" className="dashboard-bignum iband-bignum">
                <span className="dashboard-bignum-value">{projectCount}</span>
                <span className="font-numeric text-[9px] tracking-normal text-secondary">
                  {projectCount === 1 ? "project" : "projects"}
                </span>
              </div>
            </div>

            {/* Working desk — Favorites and recent work are one divided ledger;
                Continue/Create stays as the compact action rail. */}
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
              <div className="desk-continue relative min-h-0 overflow-hidden rounded-xs">
                <ContinueCard estimate={continueEstimate} bare />
              </div>
              <div className="desk-action relative flex min-h-0 flex-col overflow-hidden rounded-xs">
                <CreateActions recentProjects={homebase.projects} bare />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
