import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const estimateNodePage = readFileSync("src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx", "utf8");
const estimateTree = readFileSync("src/components/workshop/EstimateSheetTree.tsx", "utf8");
const estimateContent = readFileSync("src/components/workshop/EstimateSheetContent.tsx", "utf8");
const workspaceRepository = readFileSync("src/lib/repositories/workspace-repository.ts", "utf8");
const estimateActions = readFileSync("src/lib/estimates/actions.ts", "utf8");

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

  it("persists component-library area inserts through a project-scoped server action", () => {
    expect(estimateContent).toContain("useEstimateRowMutations");
    expect(estimateContent).toContain("projectId?: string");
    expect(estimateContent).toContain("estimateId?: string");
    expect(estimateNodePage).toContain("projectId={project.id} estimateId={estimate.id}");
    expect(estimateActions).toContain("insertEstimateRowItemFromLibrary");
    expect(estimateActions).toContain('.eq("kind", "area")');
    expect(estimateActions).toContain('.eq("estimates.project_id", project.id)');
    expect(estimateActions).toContain('link_state: libraryItem.source === "library" ? "linked-clean" : "unlinked"');
    expect(estimateActions).toContain("updateEstimateRowItem");
    expect(estimateActions).toContain("replaceEstimateRowItemWithLibrary");
    expect(estimateActions).toContain("deleteEstimateRowItem");
    expect(estimateContent).toContain("onUpdateRowItem");
    expect(estimateContent).toContain("replaceRow({ projectId, estimateId");
    expect(estimateContent).toContain("deleteRow({ projectId, estimateId");
    expect(estimateContent).toContain("useQuery({");
    expect(estimateContent).toContain("estimateQueryKeys.areaTree");
    expect(estimateContent).toContain("rollback: () => restoreEstimateState");
  });

  it("tracks row-level dirty/save status and refetches active live trees after persisted mutations", () => {
    expect(estimateContent).toContain("rowSaveStates");
    expect(estimateContent).toContain("onMarkRowDirty");
    expect(estimateContent).toContain("<RowSaveStatus state={rowSaveStates[item.id]} />");
    expect(estimateContent).toContain("refetchOnWindowFocus: true");
    expect(estimateActions).toContain("fetchEstimateTree");
    expect(estimateActions).toContain("getProjectEstimateTreeByEstimate");
    expect(readFileSync("src/hooks/use-estimate-row-mutations.ts", "utf8")).toContain('refetchType: "active"');
  });
});
