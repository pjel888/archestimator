import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workspaceRepository = readFileSync("src/lib/repositories/workspace-repository.ts", "utf8");

describe("workspace project list repository contract", () => {
  it("caps shared project ids before project reads", () => {
    const sharedProjectIdBlocks = Array.from(
      workspaceRepository.matchAll(
        /const sharedProjectIds = Array\.from\([\s\S]*?\n    \.slice\(0, projectLimit \?\? undefined\);/g,
      ),
    ).map((match) => match[0]);

    expect(sharedProjectIdBlocks).toHaveLength(2);
    for (const sharedProjectIdBlock of sharedProjectIdBlocks) {
      expect(sharedProjectIdBlock).toContain(".filter((projectId) => !ownedProjectIds.has(projectId))");
      expect(sharedProjectIdBlock).toContain(".slice(0, projectLimit ?? undefined)");
    }
    expect(workspaceRepository).toContain(".in(\"id\", sharedProjectIds)");
    expect(workspaceRepository).toContain("].slice(0, projectLimit ?? undefined)");
  });

  it("supports search-aware project reads with normalized project-name patterns", () => {
    expect(workspaceRepository).toContain("function toWorkspaceProjectSearchPatterns");
    expect(workspaceRepository).toContain('.replace(/[,()"]/g, " ")');
    expect(workspaceRepository).toContain('query.ilike("name", pattern)');
    expect(workspaceRepository).toContain("export async function listCurrentWorkspaceProjectSearchCandidates");
    expect(workspaceRepository).toContain("readSharedProjectsQuery(pattern)");
  });
});
