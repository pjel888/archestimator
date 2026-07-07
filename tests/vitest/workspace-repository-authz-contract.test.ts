import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const workspaceRepository = readFileSync("src/lib/repositories/workspace-repository.ts", "utf8");

describe("workspace repository D1 authorization contract", () => {
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
      workspaceRepository.indexOf("// Request-scoped dedupe of project_members"),
    );

    expect(projectLookupBody).toContain("canAccessWholeProjectInD1(database, projectRow.id, userContext)");
    expect(projectLookupBody).not.toContain("canAccessProjectInD1(database, projectRow.id, userContext)");
    expect(projectLookupBody).toContain("if (!canAccessProject)");
    expect(projectLookupBody).toContain("return { workspace: defaultWorkspace, project: null }");
  });
});
