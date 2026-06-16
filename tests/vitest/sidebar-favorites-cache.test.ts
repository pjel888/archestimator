import { describe, expect, it } from "vitest";
import { patchSidebarFavoritesCache } from "@/lib/favorites/sidebar-favorites-cache";
import type { MainSidebarFavoriteProject } from "@/components/sidebar/sidebar-types";

const NOW = "2026-06-16T12:00:00.000Z";
const project = (id: string, createdAt: string, sheets: MainSidebarFavoriteProject["favoriteEstimateSheets"] = []): MainSidebarFavoriteProject => ({
  id, name: `Project ${id}`, projectCode: null, href: `/workshop/projects/${id}`,
  favoriteCreatedAt: createdAt, favoriteEstimateSheets: sheets,
});

describe("patchSidebarFavoritesCache — estimate ops", () => {
  it("inserts the sheet at top of a visible favorited parent with the synthesized timestamp", () => {
    const prev = [project("p1", "2026-06-10T00:00:00.000Z", [
      { id: "s-old", projectId: "p1", name: "Old", sheetCode: "ES-1", href: "/workshop/projects/p1/estimates/s-old", favoriteCreatedAt: "2026-06-09T00:00:00.000Z" }])];
    const next = patchSidebarFavoritesCache(prev, { kind: "estimate-insert", parentId: "p1",
      sheet: { id: "s-new", projectId: "p1", name: "New", sheetCode: "ES-2", href: "/workshop/projects/p1/estimates/s-new" }, createdAt: NOW });
    expect(next[0].favoriteEstimateSheets.map((s) => s.id)).toEqual(["s-new", "s-old"]);
    expect(next[0].favoriteEstimateSheets[0].favoriteCreatedAt).toBe(NOW);
    expect(prev[0].favoriteEstimateSheets).toHaveLength(1); // prev not mutated
  });
  it("trims the parent's sheets to 5 (DESC) before inserting", () => {
    const sheets = Array.from({ length: 5 }, (_, i) => ({ id: `s${i}`, projectId: "p1", name: `S${i}`, sheetCode: null,
      href: `/workshop/projects/p1/estimates/s${i}`, favoriteCreatedAt: `2026-06-1${i}T00:00:00.000Z` }));
    const next = patchSidebarFavoritesCache([project("p1", "2026-06-10T00:00:00.000Z", sheets)], { kind: "estimate-insert", parentId: "p1",
      sheet: { id: "s-new", projectId: "p1", name: "New", sheetCode: null, href: "/workshop/projects/p1/estimates/s-new" }, createdAt: NOW });
    expect(next[0].favoriteEstimateSheets).toHaveLength(5);
    expect(next[0].favoriteEstimateSheets[0].id).toBe("s-new");
    expect(next[0].favoriteEstimateSheets.map((s) => s.id)).not.toContain("s0");
  });
  it("removes the sheet from its parent", () => {
    const prev = [project("p1", "2026-06-10T00:00:00.000Z", [{ id: "s1", projectId: "p1", name: "S1", sheetCode: null, href: "/workshop/projects/p1/estimates/s1", favoriteCreatedAt: NOW }])];
    expect(patchSidebarFavoritesCache(prev, { kind: "estimate-remove", parentId: "p1", sheetId: "s1" })[0].favoriteEstimateSheets).toHaveLength(0);
  });
  it("no-ops when the parent is not a sidebar favorite", () => {
    const prev = [project("p1", "2026-06-10T00:00:00.000Z")];
    expect(patchSidebarFavoritesCache(prev, { kind: "estimate-insert", parentId: "absent",
      sheet: { id: "s", projectId: "absent", name: "N", sheetCode: null, href: "/x" }, createdAt: NOW })).toEqual(prev);
  });
  it("no-ops when the parent exists but is outside the visible top-8", () => {
    const prev = Array.from({ length: 9 }, (_, i) => project(`p${i}`, `2026-06-0${i}T00:00:00.000Z`)); // p0 oldest -> hidden at index 8 when DESC
    expect(patchSidebarFavoritesCache(prev, { kind: "estimate-insert", parentId: "p0",
      sheet: { id: "s", projectId: "p0", name: "N", sheetCode: null, href: "/x" }, createdAt: NOW })).toEqual(prev);
  });
});
