"use client";

import { cn } from "@/lib/ui/cn";

import { ContinueCard } from "./ContinueCard";
import { CreateActions } from "./CreateActions";
import { DashboardEmptyState } from "./DashboardEmptyState";
import { DashboardHero } from "./DashboardHero";
import { DashboardStatStrip } from "./DashboardStatStrip";
import { FavoritesTree } from "./FavoritesTree";
import { ImageDestinationCard } from "./ImageDestinationCard";
import { LibraryHubCard } from "./LibraryHubCard";
import { LibrarySpotlight } from "./LibrarySpotlight";
import { RecentProjectsList } from "./RecentProjectsList";
import { RecentSheetsList } from "./RecentSheetsList";
import { isFirstRun, pickContinueEstimate, WORKSHOP_ROUTES, type WorkshopDashboardData } from "./lib";

type WorkshopDashboardProps = WorkshopDashboardData & {
  userDisplayName?: string | null;
};

/**
 * The Workshop "command center" homebase — a full-bleed bento (no centered
 * column): a masthead (greeting + Continue hero), an editorial image band (the
 * triptych destination cards + the terracotta Library hub), and a working desk
 * of glass action cells + white-paper data ledgers, over a whisper-quiet warm
 * canvas wash. Loud art, quiet data, two warm glass action heroes.
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
  const libraryItemCount =
    componentCount != null && templateCount != null ? componentCount + templateCount : undefined;
  // Guard desk cells so a null/failed module never leaves a dead grid area.
  const hasStats =
    Boolean(librarySpotlight) || homebase.projects.length > 0 || homebase.estimates.length > 0;

  return (
    <div className="dashboard-canvas-wash h-full min-h-0 overflow-y-auto">
      <div className="dashboard-root w-full px-4 py-4 lg:px-6">
        {/* Masthead — greeting (+ Continue hero when there's a recent sheet). */}
        <div className={cn("dashboard-masthead", !continueEstimate && "dashboard-masthead--solo")}>
          <DashboardHero displayName={userDisplayName} />
          {continueEstimate ? <ContinueCard estimate={continueEstimate} /> : null}
        </div>

        {firstRun ? (
          <DashboardEmptyState displayName={userDisplayName} />
        ) : (
          <>
            {/* Image band — the editorial four-up destination cards. */}
            <div className="dashboard-imageband">
              <ImageDestinationCard
                kind="projects"
                href={WORKSHOP_ROUTES.projects}
                label="Projects"
                plateIndex="01"
              />
              <ImageDestinationCard
                kind="components"
                href={WORKSHOP_ROUTES.libraryComponents}
                label="Components"
                count={componentCount}
                countNoun="components"
                plateIndex="02"
              />
              <ImageDestinationCard
                kind="templates"
                href={WORKSHOP_ROUTES.libraryTemplates}
                label="Templates"
                count={templateCount}
                countNoun="templates"
                plateIndex="03"
              />
              <LibraryHubCard href={WORKSHOP_ROUTES.library} count={libraryItemCount} />
            </div>

            {/* Working desk — glass action heroes + white-paper data ledgers. */}
            <div className="dashboard-desk">
              <div className="desk-create">
                <CreateActions recentProjects={homebase.projects} />
              </div>
              {librarySpotlight ? (
                <div className="desk-libspot">
                  <LibrarySpotlight spotlight={librarySpotlight} />
                </div>
              ) : null}
              {hasStats ? (
                <div className="desk-stats">
                  <DashboardStatStrip
                    spotlight={librarySpotlight}
                    recentProjectCount={homebase.projects.length}
                    recentSheetCount={homebase.estimates.length}
                  />
                </div>
              ) : null}
              <div className="desk-favs">
                <FavoritesTree favoriteProjects={favoriteProjects} />
              </div>
              <div className="desk-recproj">
                <RecentProjectsList projects={homebase.projects} />
              </div>
              <div className="desk-recsheet">
                <RecentSheetsList estimates={homebase.estimates} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
