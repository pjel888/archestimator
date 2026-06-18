/**
 * Workshop Dashboard — shared types, route helpers, and small formatters.
 *
 * All data shapes reuse the existing repository contracts (no parallel layer).
 * Route helpers centralise the deep-links so modules never hardcode paths.
 */
import type {
  WorkshopEstimateSummary,
  WorkshopHomebaseData,
  WorkshopProjectSummary,
} from "@/lib/repositories/workspace-repository";
import type { MainSidebarFavoriteProject } from "@/components/sidebar/sidebar-types";
import type { LibraryOverviewTemplate } from "@/lib/repositories/component-library-repository";

/** Trimmed library data surfaced on the dashboard (counts are real; templates spotlighted). */
export type DashboardLibrarySpotlight = {
  componentCount: number;
  templateCount: number;
  recentTemplates: Array<Pick<LibraryOverviewTemplate, "id" | "name" | "category" | "rowCount">>;
};

/** Everything the dashboard renders, assembled server-side from existing repositories. */
export type WorkshopDashboardData = {
  homebase: WorkshopHomebaseData;
  favoriteProjects: MainSidebarFavoriteProject[];
  librarySpotlight: DashboardLibrarySpotlight | null;
};

// ── Routes ──────────────────────────────────────────────────────────────────
export const WORKSHOP_ROUTES = {
  projects: "/workshop/projects",
  library: "/workshop/library",
  libraryComponents: "/workshop/library/components",
  libraryTemplates: "/workshop/library/templates",
} as const;

export function projectHref(projectId: string): string {
  return `/workshop/projects/${projectId}`;
}

export function projectEstimatesHref(projectId: string): string {
  return `/workshop/projects/${projectId}/estimates`;
}

/**
 * Deep-link straight into an estimate sheet's editor when we know its first node
 * (the "continue where you left off" jump). Falls back to the project's estimate
 * list when the sheet has no nodes yet.
 */
export function estimateHref(estimate: Pick<WorkshopEstimateSummary, "project_id" | "firstNodeId">): string {
  return estimate.firstNodeId
    ? `/workshop/projects/${estimate.project_id}/estimates/${estimate.firstNodeId}`
    : projectEstimatesHref(estimate.project_id);
}

// ── Formatters (match existing repo convention in WorkshopHomebaseClient) ──────
const SHORT_DATE = new Intl.DateTimeFormat("en", { month: "short", day: "numeric" });

/** Short absolute date ("May 24"); hydration-stable enough for list metadata. */
export function formatShortDate(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return SHORT_DATE.format(date);
}

/** The single most-recently-touched estimate sheet, if any (homebase is updated_at desc). */
export function pickContinueEstimate(homebase: WorkshopHomebaseData): WorkshopEstimateSummary | null {
  return homebase.estimates[0] ?? null;
}

/** True when the workspace has no projects and no sheets — drives the first-run state. */
export function isFirstRun(homebase: WorkshopHomebaseData): boolean {
  return homebase.projects.length === 0 && homebase.estimates.length === 0;
}

export type { WorkshopProjectSummary, WorkshopEstimateSummary, MainSidebarFavoriteProject };
