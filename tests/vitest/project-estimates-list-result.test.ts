import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workspaceRepository = readFileSync("src/lib/repositories/workspace-repository.ts", "utf8");

describe("project estimates list repository contract", () => {
  it("returns summary maps on every project-estimates list path", () => {
    expect(workspaceRepository).toContain("type ProjectEstimatesListResult");
    expect(workspaceRepository).toContain("listProjectEstimates(projectId: string): Promise<ProjectEstimatesListResult>");
    expect(workspaceRepository).toContain("nodeCountByEstimateId: Map<string, number>");
    expect(workspaceRepository).toContain("rowCountByEstimateId: Map<string, number>");
    expect(workspaceRepository).toContain("createEmptyProjectEstimateSummaryMaps");
    expect(workspaceRepository.match(/\.\.\.createEmptyProjectEstimateSummaryMaps\(\)/g)?.length).toBeGreaterThanOrEqual(2);
  });
});
