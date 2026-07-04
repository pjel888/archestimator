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
    expect(workspaceRepository).toContain("canAccessEstimateInD1(database, estimate.id, context)");
    expect(workspaceRepository).toContain("const estimates = await filterAccessibleEstimates(database, rawEstimates ?? [], context)");
    expect(workspaceRepository).toContain("const normalizedEstimates = await filterAccessibleEstimates");
    expect(workspaceRepository).toContain("WHERE estimate.id IN (${placeholders(estimateIds)})");
    expect(workspaceRepository).toContain("return filterAccessibleEstimates(database, sheets, context)");
  });

  it("filters sidebar favorite projects through the current D1 access gate", () => {
    const sidebarFavoritesRepository = workspaceRepository.slice(
      workspaceRepository.indexOf("export const listMainSidebarFavoriteProjects"),
      workspaceRepository.indexOf("export const getCurrentWorkspaceProject"),
    );

    expect(sidebarFavoritesRepository).toContain("async function filterAccessibleSidebarProjectIds");
    expect(sidebarFavoritesRepository).toContain("canAccessProjectInD1(database, projectId");
    expect(sidebarFavoritesRepository).toContain("role: isPlatformAdminRole(profile.role) ? profile.role : undefined");
    expect(sidebarFavoritesRepository).toContain("userId: profile.id");
    expect(sidebarFavoritesRepository).toContain("const accessibleSidebarProjectIds = await filterAccessibleSidebarProjectIds");
    expect(sidebarFavoritesRepository).toContain("WHERE id IN (${placeholders(accessibleSidebarProjectIds)})");
    expect(sidebarFavoritesRepository).toContain("AND project_id IN (${placeholders(accessibleSidebarProjectIds)})");
    expect(sidebarFavoritesRepository).toContain("return accessibleSidebarProjectIds");
  });
});
