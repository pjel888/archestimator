import { describe, expect, it } from "vitest";
import { patchSidebarFavoritesCache } from "@/lib/favorites/sidebar-favorites-cache";
import type { MainSidebarFavoriteProject } from "@/components/sidebar/sidebar-types";

const NOW = "2026-06-16T12:00:00.000Z";
const project = (id: string, createdAt: string, sheets: MainSidebarFavoriteProject["favoriteEstimateSheets"] = []): MainSidebarFavoriteProject => ({
  id, name: `Project ${id}`, projectCode: null, href: `/workshop/projects/${id}`,
  favoriteCreatedAt: createdAt, favoriteEstimateSheets: sheets,
});

describe("patchSidebarFavoritesCache — estimate ops", () => {
  it("keeps a sheet-bearing project visible when the project favorite is removed", () => {
    const prev = [project("p1", NOW, [
      { id: "s1", projectId: "p1", name: "S1", sheetCode: null, href: "/workshop/projects/p1/estimates/s1", favoriteCreatedAt: "2026-06-15T00:00:00.000Z" },
    ])];

    const next = patchSidebarFavoritesCache(prev, { kind: "project-remove", projectId: "p1" });

    expect(next).toHaveLength(1);
    expect(next[0].projectFavoriteCreatedAt).toBeNull();
    expect(next[0].favoriteCreatedAt).toBe("2026-06-15T00:00:00.000Z");
    expect(next[0].favoriteEstimateSheets.map((sheet) => sheet.id)).toEqual(["s1"]);
  });

  it("inserts the sheet at top of a visible parent with the synthesized timestamp", () => {
    const prev = [project("p1", "2026-06-10T00:00:00.000Z", [
      { id: "s-old", projectId: "p1", name: "Old", sheetCode: "ES-1", href: "/workshop/projects/p1/estimates/s-old", favoriteCreatedAt: "2026-06-09T00:00:00.000Z" }])];
    const next = patchSidebarFavoritesCache(prev, { kind: "estimate-insert", parent: { id: "p1", name: "Project p1", projectCode: null, href: "/workshop/projects/p1", projectFavoriteCreatedAt: "2026-06-10T00:00:00.000Z" },
      sheet: { id: "s-new", projectId: "p1", name: "New", sheetCode: "ES-2", href: "/workshop/projects/p1/estimates/s-new" }, createdAt: NOW });
    expect(next[0].favoriteEstimateSheets.map((s) => s.id)).toEqual(["s-new", "s-old"]);
    expect(next[0].favoriteEstimateSheets[0].favoriteCreatedAt).toBe(NOW);
    expect(next[0].favoriteCreatedAt).toBe(NOW);
    expect(prev[0].favoriteEstimateSheets).toHaveLength(1); // prev not mutated
  });
  it("trims the parent's sheets to 5 (DESC) before inserting", () => {
    const sheets = Array.from({ length: 5 }, (_, i) => ({ id: `s${i}`, projectId: "p1", name: `S${i}`, sheetCode: null,
      href: `/workshop/projects/p1/estimates/s${i}`, favoriteCreatedAt: `2026-06-1${i}T00:00:00.000Z` }));
    const next = patchSidebarFavoritesCache([project("p1", "2026-06-10T00:00:00.000Z", sheets)], { kind: "estimate-insert", parent: { id: "p1", name: "Project p1", projectCode: null, href: "/workshop/projects/p1", projectFavoriteCreatedAt: "2026-06-10T00:00:00.000Z" },
      sheet: { id: "s-new", projectId: "p1", name: "New", sheetCode: null, href: "/workshop/projects/p1/estimates/s-new" }, createdAt: NOW });
    expect(next[0].favoriteEstimateSheets).toHaveLength(5);
    expect(next[0].favoriteEstimateSheets[0].id).toBe("s-new");
    expect(next[0].favoriteEstimateSheets.map((s) => s.id)).not.toContain("s0");
  });
  it("removes the sheet from a favorited parent while keeping the project row", () => {
    const prev = [project("p1", "2026-06-10T00:00:00.000Z", [{ id: "s1", projectId: "p1", name: "S1", sheetCode: null, href: "/workshop/projects/p1/estimates/s1", favoriteCreatedAt: NOW }])];
    expect(patchSidebarFavoritesCache(prev, { kind: "estimate-remove", parentId: "p1", sheetId: "s1" })[0].favoriteEstimateSheets).toHaveLength(0);
  });
  it("creates a sheet-only project container when the parent is not a project favorite", () => {
    const prev = [project("p1", "2026-06-10T00:00:00.000Z")];
    const next = patchSidebarFavoritesCache(prev, { kind: "estimate-insert", parent: { id: "absent", name: "Sheet Parent", projectCode: "P-2", href: "/workshop/projects/absent", projectFavoriteCreatedAt: null },
      sheet: { id: "s", projectId: "absent", name: "N", sheetCode: null, href: "/x" }, createdAt: NOW });

    expect(next[0].id).toBe("absent");
    expect(next[0].projectFavoriteCreatedAt).toBeNull();
    expect(next[0].favoriteCreatedAt).toBe(NOW);
    expect(next[0].favoriteEstimateSheets.map((sheet) => sheet.id)).toEqual(["s"]);
    expect(prev).toHaveLength(1);
  });
  it("removes an empty sheet-only parent when its last sheet is removed", () => {
    const sheetOnlyParent = project("p1", NOW, [
      { id: "s1", projectId: "p1", name: "S1", sheetCode: null, href: "/workshop/projects/p1/estimates/s1", favoriteCreatedAt: NOW },
    ]);
    sheetOnlyParent.projectFavoriteCreatedAt = null;

    expect(patchSidebarFavoritesCache([sheetOnlyParent], { kind: "estimate-remove", parentId: "p1", sheetId: "s1" })).toEqual([]);
  });
  it("can lift a hidden parent into the visible top-8 when the sheet favorite is recent", () => {
    const prev = Array.from({ length: 9 }, (_, i) => project(`p${i}`, `2026-06-${String(i + 1).padStart(2, "0")}T00:00:00.000Z`)); // p0 oldest -> hidden at index 8 when DESC
    const next = patchSidebarFavoritesCache(prev, { kind: "estimate-insert", parent: { id: "p0", name: "Project p0", projectCode: null, href: "/workshop/projects/p0", projectFavoriteCreatedAt: "2026-06-01T00:00:00.000Z" },
      sheet: { id: "s", projectId: "p0", name: "N", sheetCode: null, href: "/x" }, createdAt: NOW });

    expect(next).toHaveLength(8);
    expect(next[0].id).toBe("p0");
    expect(next[0].favoriteEstimateSheets.map((sheet) => sheet.id)).toEqual(["s"]);
  });
});
