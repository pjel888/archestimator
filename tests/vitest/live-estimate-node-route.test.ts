import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const estimateNodePage = readFileSync("src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx", "utf8");
const estimateTree = readFileSync("src/components/workshop/EstimateSheetTree.tsx", "utf8");
const estimateContent = readFileSync("src/components/workshop/EstimateSheetContent.tsx", "utf8");
const workspaceRepository = readFileSync("src/lib/repositories/workspace-repository.ts", "utf8");

describe("live estimate node route", () => {
  it("loads project-scoped Supabase estimate tree data instead of sample project/tree data", () => {
    expect(estimateNodePage).toContain("getProjectEstimateTreeByNode");
    expect(estimateNodePage).not.toContain("sampleProjects");
    expect(estimateNodePage).not.toContain("sampleEstimateTree");
    expect(estimateNodePage).toContain("notFound()");
  });

  it("passes live tree nodes into the tree and sheet components", () => {
    expect(estimateNodePage).toContain("nodes={tree}");
    expect(estimateTree).toContain("nodes: EstimateAreaNode[]");
    expect(estimateTree).not.toContain("sampleEstimateTree");
    expect(estimateContent).toContain("nodes = sampleEstimateTree");
  });

  it("repository validates node ownership through project-scoped estimate join", () => {
    expect(workspaceRepository).toContain('select("*, estimates!inner(*)")');
    expect(workspaceRepository).toContain('.eq("estimates.project_id", project.id)');
    expect(workspaceRepository).toContain("buildEstimateTree");
  });
});
