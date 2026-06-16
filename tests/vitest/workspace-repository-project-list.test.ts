import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workspaceRepository = readFileSync("src/lib/repositories/workspace-repository.ts", "utf8");

describe("workspace project list repository contract", () => {
  it("orders shared projects before applying the project limit", () => {
    const sharedProjectIdBlock = workspaceRepository.match(
      /const sharedProjectIds = Array\.from\([\s\S]*?\n  \)\.filter\([\s\S]*?\);/,
    )?.[0];

    expect(sharedProjectIdBlock).toBeDefined();
    expect(sharedProjectIdBlock).not.toContain(".slice(");
    expect(workspaceRepository).toContain(".in(\"id\", sharedProjectIds)");
    expect(workspaceRepository).toContain(".order(\"updated_at\", { ascending: false })");
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
