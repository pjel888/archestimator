import { describe, expect, it } from "vitest";
import { favoritesQueryKeys } from "@/lib/favorites/query-keys";
import { sortByFavoriteCreatedAtDesc, trimSidebarFavorites } from "@/lib/favorites/sidebar-favorites";

describe("favoritesQueryKeys", () => {
  it("builds a scoped, stable sidebar key", () => {
    expect(favoritesQueryKeys.all()).toEqual(["favorites"]);
    expect(favoritesQueryKeys.sidebar({ workspaceId: "ws-1", userId: "u-1" })).toEqual([
      "favorites", "sidebar", "ws-1", "u-1",
    ]);
  });
});

describe("sortByFavoriteCreatedAtDesc", () => {
  it("orders newest first without mutating input", () => {
    const input = [
      { id: "a", favoriteCreatedAt: "2026-06-10T00:00:00.000Z" },
      { id: "b", favoriteCreatedAt: "2026-06-16T00:00:00.000Z" },
      { id: "c", favoriteCreatedAt: "2026-06-12T00:00:00.000Z" },
    ];
    expect(sortByFavoriteCreatedAtDesc(input).map((i) => i.id)).toEqual(["b", "c", "a"]);
    expect(input.map((i) => i.id)).toEqual(["a", "b", "c"]);
  });
});

describe("trimSidebarFavorites", () => {
  const project = (id: string, createdAt: string, sheetCount: number) => ({
    id, name: `Project ${id}`, projectCode: null, href: `/workshop/projects/${id}`,
    favoriteCreatedAt: createdAt,
    favoriteEstimateSheets: Array.from({ length: sheetCount }, (_, index) => ({
      id: `${id}-sheet-${index}`, projectId: id, name: `Sheet ${index}`, sheetCode: null,
      href: `/workshop/projects/${id}/estimates/${id}-sheet-${index}`,
      favoriteCreatedAt: `2026-06-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`,
    })),
  });
  it("caps to 8 projects + 5 sheets, newest first", () => {
    const projects = Array.from({ length: 9 }, (_, i) =>
      project(`p${i}`, `2026-06-${String(i + 1).padStart(2, "0")}T00:00:00.000Z`, 6));
    const trimmed = trimSidebarFavorites(projects);
    expect(trimmed).toHaveLength(8);
    expect(trimmed[0]?.id).toBe("p8");
    expect(trimmed.some((p) => p.id === "p0")).toBe(false);
    for (const p of trimmed) {
      expect(p.favoriteEstimateSheets).toHaveLength(5);
      const times = p.favoriteEstimateSheets.map((s) => s.favoriteCreatedAt);
      expect([...times].sort().reverse()).toEqual(times);
    }
  });
});
