import type { MainSidebarFavoriteEstimateSheet, MainSidebarFavoriteProject } from "@/components/sidebar/sidebar-types";
import { sortByFavoriteCreatedAtDesc, trimSidebarFavorites } from "@/lib/favorites/sidebar-favorites";

const VISIBLE_PROJECT_CAP = 8;
const VISIBLE_SHEET_CAP = 5;

export type SidebarFavoriteCacheOp =
  | { kind: "project-insert"; project: { id: string; name: string; projectCode: string | null; href: string; favoriteCreatedAt: string } }
  | { kind: "project-remove"; projectId: string }
  | { kind: "estimate-insert"; parentId: string; sheet: Omit<MainSidebarFavoriteEstimateSheet, "favoriteCreatedAt">; createdAt: string }
  | { kind: "estimate-remove"; parentId: string; sheetId: string };

/** Index of `parentId` within the visible top-8 window, or -1 if hidden/absent. */
function visibleParentIndex(prev: MainSidebarFavoriteProject[], parentId: string): number {
  return sortByFavoriteCreatedAtDesc(prev).slice(0, VISIBLE_PROJECT_CAP).findIndex((p) => p.id === parentId);
}

export function patchSidebarFavoritesCache(
  prev: MainSidebarFavoriteProject[] | undefined,
  op: SidebarFavoriteCacheOp,
): MainSidebarFavoriteProject[] {
  const list = prev ?? [];
  switch (op.kind) {
    case "project-insert": {
      const deduped = list.filter((p) => p.id !== op.project.id);
      const inserted: MainSidebarFavoriteProject = { ...op.project, favoriteEstimateSheets: [] };
      return trimSidebarFavorites([inserted, ...deduped]); // trim to 8 BEFORE returning (08)
    }
    case "project-remove":
      return list.filter((p) => p.id !== op.projectId);
    case "estimate-insert":
    case "estimate-remove": {
      if (visibleParentIndex(list, op.parentId) === -1) return list; // hidden/non-favorited -> no-op (D5)
      return list.map((project) => {
        if (project.id !== op.parentId) return project;
        if (op.kind === "estimate-remove") {
          return { ...project, favoriteEstimateSheets: project.favoriteEstimateSheets.filter((s) => s.id !== op.sheetId) };
        }
        const inserted: MainSidebarFavoriteEstimateSheet = { ...op.sheet, favoriteCreatedAt: op.createdAt };
        const deduped = project.favoriteEstimateSheets.filter((s) => s.id !== inserted.id);
        return { ...project, favoriteEstimateSheets: sortByFavoriteCreatedAtDesc([inserted, ...deduped]).slice(0, VISIBLE_SHEET_CAP) };
      });
    }
  }
}
