import type { MainSidebarFavoriteProject } from "@/components/sidebar/sidebar-types";

const MAIN_SIDEBAR_FAVORITE_PROJECT_LIMIT = 8;
const MAIN_SIDEBAR_FAVORITE_SHEET_LIMIT = 5;

/** Newest favorite first. Pure: returns a new array, does not mutate `items`. */
export function sortByFavoriteCreatedAtDesc<T extends { favoriteCreatedAt: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => (a.favoriteCreatedAt < b.favoriteCreatedAt ? 1 : -1));
}

/** Cap to the visible window: 8 projects, 5 sheets each, both newest-first. Trim BEFORE optimistic insert (08). */
export function trimSidebarFavorites(projects: MainSidebarFavoriteProject[]): MainSidebarFavoriteProject[] {
  return sortByFavoriteCreatedAtDesc(projects)
    .slice(0, MAIN_SIDEBAR_FAVORITE_PROJECT_LIMIT)
    .map((project) => ({
      ...project,
      favoriteEstimateSheets: sortByFavoriteCreatedAtDesc(project.favoriteEstimateSheets).slice(
        0, MAIN_SIDEBAR_FAVORITE_SHEET_LIMIT,
      ),
    }));
}
