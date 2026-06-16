"use server";
import type { MainSidebarFavoriteProject } from "@/components/sidebar/sidebar-types";
import { listMainSidebarFavoriteProjects } from "@/lib/repositories/workspace-repository";

/**
 * Client-callable read of the sidebar favorite projects (Route A / D3 / D4).
 * Used directly as the queryFn of useSidebarFavoritesQuery; initialData seeds
 * first paint and this reconciles on every staleTime:0 remount + onSettled
 * invalidate. listMainSidebarFavoriteProjects() authenticates server-side via
 * ensureDefaultWorkspace() -> requireCurrentUserContext() (13 C1).
 */
export async function fetchSidebarFavoriteProjects(): Promise<MainSidebarFavoriteProject[]> {
  return listMainSidebarFavoriteProjects();
}
