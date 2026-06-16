import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workspaceRepository = readFileSync("src/lib/repositories/workspace-repository.ts", "utf8");

describe("proposal all-tabs export stale-tab security contract", () => {
  it("revalidates active estimate tabs before batched node and row reads", () => {
    const functionBody = workspaceRepository.match(
      /export async function getEstimateTreesForTabs[\s\S]*?\n}\n\nexport async function getProjectEstimateTreeByEstimate/,
    )?.[0];

    expect(functionBody).toBeTruthy();
    expect(functionBody).toContain('.from("estimate_tabs")');
    expect(functionBody).toContain('.in("id", tabIds)');
    expect(functionBody).toContain('.is("archived_at", null)');
    expect(functionBody).toContain("const activeTabs = (activeTabRows ?? []).map(toEstimateTabSummary);");
    expect(functionBody).toContain('.in("estimate_tab_id", activeTabIds)');
    expect(functionBody).toContain("tabs: groupEstimateTabTrees(activeTabs, limitedNodes.rows, limitedRows.rows)");
    expect(functionBody).not.toContain('.in("estimate_tab_id", tabIds)');
    expect(functionBody).not.toContain("tabs: groupEstimateTabTrees(tabs, limitedNodes.rows, limitedRows.rows)");
  });
});
