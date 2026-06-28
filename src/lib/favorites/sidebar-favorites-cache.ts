import type { MainSidebarFavoriteEstimateSheet, MainSidebarFavoriteProject } from "@/components/sidebar/sidebar-types";
import { sortByFavoriteCreatedAtDesc, trimSidebarFavorites } from "@/lib/favorites/sidebar-favorites";

const VISIBLE_SHEET_CAP = 5;

export type SidebarFavoriteCacheOp =
  | { kind: "project-insert"; project: { id: string; name: string; projectCode: string | null; href: string; favoriteCreatedAt: string } }
  | { kind: "project-remove"; projectId: string }
  | {
      kind: "estimate-insert";
      parent: {
        id: string;
        name: string;
        projectCode: string | null;
        href: string;
        projectFavoriteCreatedAt?: string | null;
      };
      sheet: Omit<MainSidebarFavoriteEstimateSheet, "favoriteCreatedAt">;
      createdAt: string;
    }
  | { kind: "estimate-remove"; parentId: string; sheetId: string };

function isProjectFavoriteContainer(project: MainSidebarFavoriteProject): boolean {
  return project.projectFavoriteCreatedAt !== null;
}

function newestFavoriteCreatedAt(...timestamps: Array<string | null | undefined>): string {
  const sorted = timestamps.filter((timestamp): timestamp is string => Boolean(timestamp)).sort();
  return sorted[sorted.length - 1] ?? "1970-01-01T00:00:00.000Z";
}

function withContainerFavoriteCreatedAt(project: MainSidebarFavoriteProject): MainSidebarFavoriteProject {
  return {
    ...project,
    favoriteCreatedAt: newestFavoriteCreatedAt(
      project.projectFavoriteCreatedAt === null ? null : project.projectFavoriteCreatedAt ?? project.favoriteCreatedAt,
      project.favoriteEstimateSheets[0]?.favoriteCreatedAt,
    ),
  };
}

export function patchSidebarFavoritesCache(
  prev: MainSidebarFavoriteProject[] | undefined,
  op: SidebarFavoriteCacheOp,
): MainSidebarFavoriteProject[] {
  const list = prev ?? [];
  switch (op.kind) {
    case "project-insert": {
      const deduped = list.filter((p) => p.id !== op.project.id);
      const existing = list.find((p) => p.id === op.project.id);
      const inserted: MainSidebarFavoriteProject = withContainerFavoriteCreatedAt({
        ...op.project,
        projectFavoriteCreatedAt: op.project.favoriteCreatedAt,
        favoriteEstimateSheets: existing?.favoriteEstimateSheets ?? [],
      });
      return trimSidebarFavorites([inserted, ...deduped]); // trim to 8 BEFORE returning (08)
    }
    case "project-remove": {
      return trimSidebarFavorites(
        list.flatMap((project) => {
          if (project.id !== op.projectId) return [project];
          if (project.favoriteEstimateSheets.length === 0) return [];
          return [withContainerFavoriteCreatedAt({ ...project, projectFavoriteCreatedAt: null })];
        }),
      );
    }
    case "estimate-insert": {
      const inserted: MainSidebarFavoriteEstimateSheet = { ...op.sheet, favoriteCreatedAt: op.createdAt };
      const parentIndex = list.findIndex((project) => project.id === op.parent.id);
      if (parentIndex === -1) {
        return trimSidebarFavorites([
          ...list,
          {
            favoriteCreatedAt: op.createdAt,
            favoriteEstimateSheets: [inserted],
            href: op.parent.href,
            id: op.parent.id,
            name: op.parent.name,
            projectCode: op.parent.projectCode,
            projectFavoriteCreatedAt: op.parent.projectFavoriteCreatedAt ?? null,
          },
        ]);
      }

      return trimSidebarFavorites(
        list.map((project) => {
          if (project.id !== op.parent.id) return project;
          const deduped = project.favoriteEstimateSheets.filter((s) => s.id !== inserted.id);
          return withContainerFavoriteCreatedAt({
            ...project,
            favoriteEstimateSheets: sortByFavoriteCreatedAtDesc([inserted, ...deduped]).slice(0, VISIBLE_SHEET_CAP),
          });
        }),
      );
    }
    case "estimate-remove": {
      return trimSidebarFavorites(
        list.flatMap((project) => {
          if (project.id !== op.parentId) return [project];
          const favoriteEstimateSheets = project.favoriteEstimateSheets.filter((s) => s.id !== op.sheetId);
          if (favoriteEstimateSheets.length === 0 && !isProjectFavoriteContainer(project)) return [];
          return [withContainerFavoriteCreatedAt({ ...project, favoriteEstimateSheets })];
        }),
      );
    }
  }
}
