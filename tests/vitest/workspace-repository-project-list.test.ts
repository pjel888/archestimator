import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workspaceRepository = readFileSync("src/lib/repositories/workspace-repository.ts", "utf8");

describe("workspace project list repository contract", () => {
  it("hydrates shared projects in update order before composing the project list", () => {
    const sharedProjectIdBlock = workspaceRepository.match(
      /const sharedProjectIds = Array\.from\([\s\S]*?\n  \)\.filter\([\s\S]*?\);/,
    )?.[0];

    expect(sharedProjectIdBlock).toBeDefined();
    expect(sharedProjectIdBlock).not.toContain(".slice(");
    expect(workspaceRepository).toContain(".in(\"id\", sharedProjectIds)");
    expect(workspaceRepository).toContain(".order(\"updated_at\", { ascending: false })");
    expect(workspaceRepository).toContain("const projectItems: WorkshopProjectListItem[] = [");
    expect(workspaceRepository).toContain("...ownedProjects.map(createProjectListItem)");
    expect(workspaceRepository).toContain("...sharedProjects.map((project) =>");
  });

  it("keeps the project-list query payload trimmed to client-visible columns", () => {
    expect(workspaceRepository).toContain("const WORKSHOP_PROJECT_LIST_COLUMNS");
    expect(workspaceRepository).toContain("function toClientProjectRow");
    expect(workspaceRepository).toContain("workspace_id: _workspaceId");
    expect(workspaceRepository).toContain("created_by: _createdBy");
    expect(workspaceRepository).toContain("project: toClientProjectRow(project)");
  });
});
