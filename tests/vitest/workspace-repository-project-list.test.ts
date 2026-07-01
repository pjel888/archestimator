import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workspaceRepository = readFileSync("src/lib/repositories/workspace-repository.ts", "utf8");

describe("workspace project list repository contract", () => {
  it("hydrates shared projects in update order before composing the project list", () => {
    const sharedProjectIdBlock = workspaceRepository.match(
      /const sharedProjectIds = \[[\s\S]*?\]\.filter\([\s\S]*?\);/,
    )?.[0];

    expect(sharedProjectIdBlock).toBeDefined();
    expect(sharedProjectIdBlock).not.toContain(".slice(");
    expect(workspaceRepository).toContain("WHERE id IN (${placeholders(sharedProjectIds)})");
    expect(workspaceRepository).toContain("ORDER BY updated_at DESC");
    expect(workspaceRepository).toContain("const projectItems: WorkshopProjectListItem[] = [");
    expect(workspaceRepository).toContain("...ownedProjects.map(createProjectListItem)");
    expect(workspaceRepository).toContain("...sharedProjects.map((project) =>");
  });

  it("keeps the project-list query payload trimmed to client-visible columns", () => {
    expect(workspaceRepository).toContain("const WORKSHOP_PROJECT_LIST_COLUMNS");
    expect(workspaceRepository).toContain("function toClientProjectRow");
    expect(workspaceRepository).toContain("delete rest.workspace_id");
    expect(workspaceRepository).toContain("delete rest.created_by");
    expect(workspaceRepository).toContain("project: toClientProjectRow(project)");
  });
});
