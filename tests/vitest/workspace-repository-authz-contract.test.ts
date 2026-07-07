import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workspaceRepository = readFileSync("src/lib/repositories/workspace-repository.ts", "utf8");

describe("workspace repository D1 authorization contract", () => {
  it("verifies profile.default_workspace_id before using it as the active workspace", () => {
    expect(workspaceRepository).toContain("async function canUseWorkspaceAsDefault");
    expect(workspaceRepository).toContain("isPlatformAdminContext(context)");
    expect(workspaceRepository).toContain("workspace.created_by === context.userId");
    expect(workspaceRepository).toContain("FROM workspace_members");
    expect(workspaceRepository).toContain("existingWorkspace && await canUseWorkspaceAsDefault(database, existingWorkspace, context)");
  });

  it("gates project lookup by D1 project access before returning a project row", () => {
    expect(workspaceRepository).toContain("canAccessProjectInD1(database, projectRow.id, context)");
    expect(workspaceRepository).toContain("if (!canAccessProject)");
    expect(workspaceRepository).toContain("return { workspace: defaultWorkspace, project: null }");
  });

  it("does not synthesize project owner roles for non-creator users", () => {
    expect(workspaceRepository).toContain("project.created_by === profile.id");
    expect(workspaceRepository).not.toContain(": \"owned\";\n");
  });

  it("filters project sheet lists and estimate summaries through estimate-level D1 access", () => {
    expect(workspaceRepository).toContain("async function filterAccessibleEstimates");
    expect(workspaceRepository).toContain("async function readAccessibleEstimateIdSet");
    expect(workspaceRepository).toContain("SELECT estimate.id");
    expect(workspaceRepository).toContain("WHERE estimate.id IN (${placeholders(uniqueEstimateIds)})");
    expect(workspaceRepository).toContain("const estimates = await filterAccessibleEstimates(database, rawEstimates ?? [], context)");
    expect(workspaceRepository).toContain("const normalizedEstimates = await filterAccessibleEstimates");
    expect(workspaceRepository).toContain("const accessibleFavoriteEstimates = favoriteEstimates.filter");
    expect(workspaceRepository).toContain("return filterAccessibleEstimates(database, sheets, context)");
  });

  it("filters sidebar favorite projects through the current D1 access gate via a single batched SQL query", () => {
    const sidebarFavoritesRepository = workspaceRepository.slice(
      workspaceRepository.indexOf("export const listMainSidebarFavoriteProjects"),
      workspaceRepository.indexOf("export const getCurrentWorkspaceProject"),
    );

    expect(sidebarFavoritesRepository).toContain("async function filterAccessibleSidebarProjectIds");
    // ponytail: batched authz fix (WP-P1-03, 2026-07-05). Replaced per-project
    // Promise.all(canAccessProjectInD1) loop with a single batched SQL query
    // that lifts the 4 access branches (created_by + 3 EXISTS) into one
    // prepared statement. The platform-admin JS short-circuit is preserved
    // before any SQL.
    expect(sidebarFavoritesRepository).toContain("isPlatformAdminRole(profile.role)");
    expect(sidebarFavoritesRepository).toContain("if (isPlatformAdminRole(profile.role))");
    expect(sidebarFavoritesRepository).toContain("return projectIds;");
    expect(sidebarFavoritesRepository).toContain("FROM projects");
    expect(sidebarFavoritesRepository).toContain("WHERE project.id IN (");
    expect(sidebarFavoritesRepository).toContain("project.created_by = ?");
    expect(sidebarFavoritesRepository).toContain("FROM workspace_members");
    expect(sidebarFavoritesRepository).toContain("FROM project_members");
    expect(sidebarFavoritesRepository).toContain("FROM estimate_sheet_members");
    expect(sidebarFavoritesRepository).toContain("const accessibleSidebarProjectIds = await filterAccessibleSidebarProjectIds");
    expect(sidebarFavoritesRepository).toContain("WHERE id IN (${placeholders(accessibleSidebarProjectIds)})");
    expect(sidebarFavoritesRepository).toContain("AND project_id IN (${placeholders(accessibleSidebarProjectIds)})");
    expect(sidebarFavoritesRepository).toContain("return accessibleSidebarProjectIds");
  });
});
