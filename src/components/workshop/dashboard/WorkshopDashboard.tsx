import { ArrowUpRight, Package } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import type { CSSProperties } from "react";

import { FirstEstimateChecklist } from "@/components/workshop/FirstEstimateChecklist";
import { getComponentDetailsHref } from "@/components/workshop/library/component-route-state";
import type { OnboardingEligibilitySnapshot } from "@/lib/onboarding/flow-types";
import { FavoritesTree } from "./FavoritesTree";
import { ImageDestinationCard } from "./ImageDestinationCard";
import { LibraryCardLink, LibraryHubCard } from "./LibraryHubCard";
import { RecentProjectsList } from "./RecentProjectsList";
import { RecentSheetsList } from "./RecentSheetsList";
import {
  estimateHref,
  formatShortDate,
  pickContinueEstimate,
  projectEstimatesHref,
  WORKSHOP_ROUTES,
  type DashboardLibrarySpotlight,
  type WorkshopDashboardData,
} from "./lib";

type WorkshopDashboardProps = WorkshopDashboardData & {
  favoritesScope: { workspaceId: string; userId: string };
  onboardingSnapshot?: OnboardingEligibilitySnapshot | null;
};

const DASHBOARD_COUNT_COLUMN_WIDTH = "203px";
const DASHBOARD_CARD_PANEL_STYLE: CSSProperties = {
  display: "grid",
  gridTemplateColumns: `var(--dashboard-count-col, ${DASHBOARD_COUNT_COLUMN_WIDTH}) minmax(0, 1fr)`,
  alignItems: "stretch",
  minHeight: 0,
  paddingBlock: 8,
  paddingRight: 0,
  borderTop: "1px solid var(--destination-inner-border, var(--glass-border))",
  borderBottom: "1px solid var(--destination-inner-border, var(--glass-border))",
};

function RecentComponentsList({
  components,
}: {
  components: DashboardLibrarySpotlight["recentComponents"];
}) {
  return (
    <section className="flex h-full min-h-0 flex-col bg-transparent">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-hairline px-2">
        <Package size={14} weight="fill" className="shrink-0 text-tertiary" />
        <h2 className="text-[12px] font-medium text-ink">Components</h2>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <ul aria-label="Recent components">
          {components.map((component) => (
            <li
              key={component.id}
              className="flex min-h-8 items-center gap-1.5 px-2 hover:bg-surface-muted"
            >
              <Package
                size={16}
                weight="regular"
                className="shrink-0 text-secondary"
                aria-hidden="true"
              />
              <Link
                href={getComponentDetailsHref(component.id)}
                className="flex min-w-0 flex-1 items-center gap-2 self-stretch focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-0"
                title={`${component.name} · ${component.category}`}
              >
                <span className="min-w-0 flex-1 truncate text-[11px] leading-4 text-ink">
                  {component.name}
                </span>
                <span className="max-w-[38%] shrink truncate text-[10px] leading-4 text-secondary">
                  {component.category}
                </span>
                <span className="shrink-0 font-numeric text-[9px] leading-4 text-tertiary">
                  {formatShortDate(component.updatedAt)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/**
 * The Workshop "command center" homebase — a full-bleed bento (no centered
 * column): an editorial masthead headline, a square destination field (Projects
 * mountain image + supporting color blocks + Library hub + a big catalogue
 * numeral), and a working desk led by Favorites with compact Continue/Create
 * actions and a recent component ledger ranked beneath it.
 */
export function WorkshopDashboard({
  homebase,
  favoriteProjects,
  favoritesScope,
  librarySpotlight,
  onboardingSnapshot,
}: WorkshopDashboardProps) {
  const continueEstimate = pickContinueEstimate(homebase);
  const componentCount = librarySpotlight?.componentCount;
  const templateCount = librarySpotlight?.templateCount;
  const libraryItemCount =
    componentCount != null && templateCount != null
      ? componentCount + templateCount
      : undefined;
  const projectCount = homebase.projects.length;
  const estimateSheetCount = homebase.estimates.length;
  const estimateSheetsHref = continueEstimate
    ? estimateHref(continueEstimate)
    : homebase.projects[0]
      ? projectEstimatesHref(homebase.projects[0].id)
      : WORKSHOP_ROUTES.projects;
  const estimateSheetsLinkLabel = continueEstimate
    ? `Open ${continueEstimate.name}`
    : homebase.projects[0]
      ? `Open estimate sheets for ${homebase.projects[0].name}`
      : "Open Projects";

  return (
    <div className="h-full min-h-0 overflow-y-auto">
      <div className="dashboard-root w-full p-2">
        {onboardingSnapshot ? (
          <FirstEstimateChecklist snapshot={onboardingSnapshot} />
        ) : null}
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
                  className="dashboard-destination-card-icon transition-colors duration-[200ms] ease-out motion-reduce:transition-none"
                />
              </Link>
            </div>

            <div
              className="dashboard-project-card-panel"
              style={DASHBOARD_CARD_PANEL_STYLE}
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
                  borderRight:
                    "1px solid var(--destination-inner-border, var(--glass-border))",
                }}
              >
                <span className="font-numeric text-[9px] font-medium uppercase tracking-normal text-secondary">
                  Projects Shown
                </span>
                <span className="dashboard-bignum-value">{projectCount}</span>
              </div>

              <div className="dashboard-published-panel">
                <RecentProjectsList
                  projects={homebase.projects}
                  favoritesScope={favoritesScope}
                  embedded
                />
              </div>
            </div>

            <div className="flex min-h-0 items-end justify-end">
              <span className="dashboard-destination-card-title font-display text-[32px] font-normal leading-none tracking-[0.04em] uppercase">
                Projects
              </span>
            </div>
          </div>
          <div
            aria-label="Estimate Sheets"
            className="dashboard-destination-card dashboard-destination-grid dashboard-card-hover dashboard-destination-card--estimates group iband-estimates relative h-full min-h-[118px] w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
          >
            <div className="flex min-h-0 items-start justify-between gap-2">
              <span className="dashboard-destination-card-index font-numeric text-[22px] font-thin leading-none">
                02
              </span>
              <Link
                href={estimateSheetsHref}
                aria-label={estimateSheetsLinkLabel}
                className="dashboard-project-card-arrow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
              >
                <ArrowUpRight
                  size={32}
                  weight="regular"
                  aria-hidden="true"
                  className="dashboard-destination-card-icon transition-colors duration-[200ms] ease-out motion-reduce:transition-none"
                />
              </Link>
            </div>

            <div
              className="dashboard-estimate-card-panel"
              style={DASHBOARD_CARD_PANEL_STYLE}
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
                  borderRight:
                    "1px solid var(--destination-inner-border, var(--glass-border))",
                }}
              >
                <span className="font-numeric text-[9px] font-medium uppercase tracking-normal text-secondary">
                  Sheets Shown
                </span>
                <span className="dashboard-bignum-value">{estimateSheetCount}</span>
              </div>

              <div className="dashboard-published-panel">
                <RecentSheetsList
                  estimates={homebase.estimates}
                  favoriteProjects={favoriteProjects}
                  favoritesScope={favoritesScope}
                  embedded
                />
              </div>
            </div>

            <div className="flex min-h-0 items-end justify-end">
              <span className="dashboard-destination-card-title font-display text-[32px] font-normal leading-none tracking-[0.04em] uppercase">
                Estimate Sheets
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

        {/* Working desk — Favorites and recent components are one divided ledger;
                Continue stays as the compact action rail. */}
        <div className="dashboard-desk">
          <div className="desk-board">
            <div className="desk-board-favs">
              <FavoritesTree
                key={`${favoritesScope.workspaceId}:${favoritesScope.userId}`}
                favoriteProjects={favoriteProjects}
                favoritesScope={favoritesScope}
                embedded
              />
            </div>
            <div className="desk-board-recents">
              <div className="desk-reccomponents">
                <RecentComponentsList
                  components={librarySpotlight?.recentComponents ?? []}
                />
              </div>
            </div>
          </div>
          <div className="desk-continue relative min-h-0 overflow-visible rounded-xs">
            {continueEstimate ? (
              <LibraryCardLink href={WORKSHOP_ROUTES.library} />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
