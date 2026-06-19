import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const workspaceRepository = readFileSync(join(process.cwd(), "src/lib/repositories/workspace-repository.ts"), "utf8");
const componentLibraryRepository = readFileSync(
  join(process.cwd(), "src/lib/repositories/component-library-repository.ts"),
  "utf8",
);
const workshopPage = readFileSync(join(process.cwd(), "src/app/workshop/page.tsx"), "utf8");

describe("workshop dashboard query batching source contract", () => {
  it("keeps recent and favorite estimate reads in one bounded latency wave", () => {
    expect(workspaceRepository).toContain("recentEstimateProjectIds");
    expect(workspaceRepository).toContain("favoriteEstimateIds.slice(0, WORKSHOP_HOMEBASE_FAVORITE_ESTIMATE_LIMIT)");
    expect(workspaceRepository).toContain(
      'const [recentEstimatesResult, favoriteEstimatesResult] = await traced("homebase.H3H4.estimates"',
    );
    expect(workspaceRepository).toContain("Promise.all([recentEstimatesPromise, favoriteEstimatesPromise])");
    expect(workspaceRepository).toContain('.order("updated_at", { ascending: false })');
    expect(workspaceRepository).toContain('.order("id", { ascending: false })');
  });

  it("merges project backfills and keeps the independent homebase tail in one wave", () => {
    expect(workspaceRepository).toContain("backfillProjectIds");
    expect(workspaceRepository).toContain(
      'const [homebasePublicationRows, pendingInviteVisibility, estimateNodesResult] = await traced("homebase.H6H7H8.tail"',
    );
    expect(workspaceRepository).toContain("estimateNodesPromise");
    expect(workspaceRepository).toContain("manageableProjectIds");
    expect(workspaceRepository).toContain("canManageCollaborationRole");
  });

  it("keeps homebase project and sheet ledgers ordered by recency, not favorite time", () => {
    expect(workspaceRepository).toContain("const recentProjects = sortByUpdatedAtDescThenIdDesc(payload.recentProjects)");
    expect(workspaceRepository).toContain("const projects = mergeHomebaseRecords(recentProjects, favoriteProjects)");
    expect(workspaceRepository).toContain(
      "const projects = mergeHomebaseRecords(recentProjects, sortByFavoriteCreatedAt(favoriteProjects, projectFavoriteCreatedAt))",
    );
    expect(workspaceRepository).toMatch(
      /const estimates = mergeHomebaseRecords\(\s*sortByUpdatedAtDescThenIdDesc\(payload\.recentEstimates\),\s*sortByFavoriteCreatedAt\(payload\.favoriteEstimates, estimateFavoriteCreatedAt\),\s*\)/,
    );
    expect(workspaceRepository).toContain("const estimates = mergeHomebaseRecords(recentEstimates, favoriteEstimates)");
    expect(workspaceRepository).not.toContain("const projects = mergeHomebaseRecords(favoriteProjects, recentProjects)");
    expect(workspaceRepository).not.toContain("const estimates = mergeHomebaseRecords(favoriteEstimates, recentEstimates)");
  });

  it("uses a dashboard-lean library repository path without template detail fetches", () => {
    expect(componentLibraryRepository).toContain("export async function getLibraryDashboardSpotlight");
    expect(componentLibraryRepository).toContain("recentTemplates: []");
    expect(workshopPage).toContain("getLibraryDashboardSpotlight");
    expect(workshopPage).not.toContain("getLibraryOverview");
  });
});
