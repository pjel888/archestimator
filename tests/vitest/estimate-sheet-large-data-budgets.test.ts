import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(path, "utf8");
}

describe("estimate sheet large-data budgets", () => {
  it("caps the live estimate sheet route and client tree refetches with shared limits", () => {
    const limits = read("src/lib/estimates/load-limits.ts");
    const page = read("src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx");
    const actions = read("src/lib/estimates/actions.ts");
    const workspaceClient = read("src/components/workshop/EstimateWorkspaceClient.tsx");
    const sheetContent = read("src/components/workshop/EstimateSheetContent.tsx");

    expect(limits).toContain("maxNodeCount: 1500");
    expect(limits).toContain("maxRowItemCount: 5000");
    expect(page).toContain("resolveEstimateTabRouteContext(projectId, nodeId, ESTIMATE_SHEET_TREE_LOAD_LIMITS)");
    expect(actions).toContain("getProjectEstimateTreeByEstimate(projectId, estimateId, ESTIMATE_SHEET_TREE_LOAD_LIMITS)");
    expect(actions).toContain("getEstimateTabTree(projectId, estimateId, tabId, ESTIMATE_SHEET_TREE_LOAD_LIMITS)");
    expect(workspaceClient).toContain("loadLimitState={loadLimitState}");
    expect(sheetContent).toContain("didTruncateInitialTree");
    expect(sheetContent).toContain("Proposal exports use separate full-data limits.");
  });

  it("caps reusable project-source search fan-out before materializing estimate trees", () => {
    const actions = read("src/lib/reusable-sources/actions.ts");
    const workspaceRepository = read("src/lib/repositories/workspace-repository.ts");
    const sheetRepository = read("src/lib/repositories/project-estimate-sheets-repository.ts");

    expect(actions).toContain("REUSABLE_SOURCE_SEARCH_PROJECT_SCAN_LIMIT");
    expect(actions).toContain("REUSABLE_SOURCE_SEARCH_ESTIMATE_SCAN_LIMIT");
    expect(actions).toContain("REUSABLE_SOURCE_SEARCH_NODE_MATCH_LIMIT");
    expect(actions).toContain("REUSABLE_SOURCE_SEARCH_TAB_MATCH_LIMIT");
    expect(actions).toContain("REUSABLE_SOURCE_SEARCH_MATERIALIZED_ESTIMATE_LIMIT");
    expect(actions).toContain("REUSABLE_SOURCE_SEARCH_TAB_SCAN_LIMIT");
    expect(actions).toContain("REUSABLE_SOURCE_SEARCH_TREE_NODE_LIMIT");
    expect(actions).toContain("listProjectEstimateSheets(item.project.id, { limit: REUSABLE_SOURCE_SEARCH_ESTIMATE_SCAN_LIMIT })");
    expect(actions).toContain(".limit(REUSABLE_SOURCE_SEARCH_NODE_MATCH_LIMIT + 1)");
    expect(actions).toContain(".limit(REUSABLE_SOURCE_SEARCH_TAB_MATCH_LIMIT + 1)");
    expect(actions).toContain("getEstimateTabTree(project.id, estimate.id, tab.id, {");
    expect(actions).toContain("maxNodeCount: REUSABLE_SOURCE_SEARCH_TREE_NODE_LIMIT");
    expect(actions).toContain("maxRowItemCount: REUSABLE_SOURCE_SEARCH_TREE_ROW_ITEM_LIMIT");
    expect(workspaceRepository).toContain("listProjectEstimateSheets(projectId: string, options: { limit?: number } = {})");
    expect(sheetRepository).toContain("query.limit(safeLimit)");
  });
});
