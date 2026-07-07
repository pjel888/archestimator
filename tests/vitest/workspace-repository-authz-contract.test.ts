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

  it("creates an owner membership row for auto-provisioned default workspaces", () => {
    const ensureDefaultWorkspaceBody = workspaceRepository.slice(
      workspaceRepository.indexOf("export const ensureDefaultWorkspace"),
      workspaceRepository.indexOf("export const listCurrentWorkspaceProjects"),
    );

    expect(ensureDefaultWorkspaceBody).toContain("INSERT INTO workspace_members (workspace_id, user_id, role, created_at, updated_at)");
    expect(ensureDefaultWorkspaceBody).toContain("[workspace.id, context.userId, \"owner\", now, now]");
  });

  it("gates project lookup by D1 whole-project access before returning a project row", () => {
    const projectLookupBody = workspaceRepository.slice(
      workspaceRepository.indexOf("export const getCurrentWorkspaceProject"),
      workspaceRepository.indexOf("export const getCurrentWorkspaceProjectForEstimate"),
    );

    expect(projectLookupBody).toContain("canAccessWholeProjectInD1(database, projectRow.id, context)");
    expect(projectLookupBody).not.toContain("canAccessProjectInD1(database, projectRow.id, context)");
    expect(projectLookupBody).toContain("if (!canAccessProject) return readDefaultWorkspaceProjectContext()");
  });

  it("requires estimate-scoped project context to prove target estimate access", () => {
    const estimateProjectLookupBody = workspaceRepository.slice(
      workspaceRepository.indexOf("export const getCurrentWorkspaceProjectForEstimate"),
      workspaceRepository.indexOf("async function readDefaultWorkspaceProjectContext"),
    );

    expect(estimateProjectLookupBody).toContain("readEstimateForProject(database, estimateId, projectRow.id)");
    expect(estimateProjectLookupBody).toContain("canAccessEstimateInD1(database, estimate.id, context)");
    expect(estimateProjectLookupBody).not.toContain("canAccessWholeProjectInD1(database, projectRow.id, context)");
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

  it("filters sidebar favorite projects through the current D1 access gate via a single batched SQL query", () => {
    const sidebarFavoritesRepository = workspaceRepository.slice(
      workspaceRepository.indexOf("export const listMainSidebarFavoriteProjects"),
      workspaceRepository.indexOf("export const getCurrentWorkspaceProject"),
    );

    expect(sidebarFavoritesRepository).toContain("async function filterAccessibleSidebarProjectIds");
    expect(sidebarFavoritesRepository).toContain("isPlatformAdminRole(profile.role)");
    expect(sidebarFavoritesRepository).toContain("if (isPlatformAdminRole(profile.role))");
    expect(sidebarFavoritesRepository).toContain("return projectIds;");
    expect(sidebarFavoritesRepository).toContain("FROM projects");
    expect(sidebarFavoritesRepository).toContain("WHERE project.id IN (");
    expect(sidebarFavoritesRepository).not.toContain("project.created_by = ?");
    expect(sidebarFavoritesRepository).toContain("FROM workspace_members");
    expect(sidebarFavoritesRepository).toContain("FROM project_members");
    expect(sidebarFavoritesRepository).toContain("FROM estimate_sheet_members");
    expect(sidebarFavoritesRepository).toContain("const accessibleSidebarProjectIds = await filterAccessibleSidebarProjectIds");
    expect(sidebarFavoritesRepository).toContain("WHERE id IN (${placeholders(accessibleSidebarProjectIds)})");
    expect(sidebarFavoritesRepository).toContain("AND project_id IN (${placeholders(accessibleSidebarProjectIds)})");
    expect(sidebarFavoritesRepository).toContain("return accessibleSidebarProjectIds");
  });
});
