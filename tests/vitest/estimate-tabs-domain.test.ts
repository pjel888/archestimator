import { beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

import { estimateQueryKeys } from "@/hooks/use-estimate-query";
import { resetEstimateWorkspaceState, useEstimateWorkspaceState } from "@/hooks/use-estimate-workspace-state";

describe("estimate tab domain client state", () => {
  beforeEach(() => {
    resetEstimateWorkspaceState();
  });

  it("adds tab-aware query keys while preserving the legacy area-tree key", () => {
    expect(estimateQueryKeys.tabs("estimate-1")).toEqual(["estimate", "estimate-1", "tabs"]);
    expect(estimateQueryKeys.tabTree("estimate-1", "tab-1")).toEqual(["estimate", "estimate-1", "tab", "tab-1", "area-tree"]);
    expect(estimateQueryKeys.areaTree("estimate-1")).toEqual(["estimate", "estimate-1", "area-tree"]);
  });

  it("tracks selection and expansion independently per tab", () => {
    const store = useEstimateWorkspaceState.getState();

    store.setSelectedNodeId("estimate-1", "legacy-node");
    store.setSelectedNodeIdForTab("tab-a", "kitchen");
    store.setSelectedNodeIdForTab("tab-b", "site-work");
    store.setExpandedNodeIdsForTab("tab-a", ["project-scope", "ground-floor"]);
    store.setExpandedNodeIdsForTab("tab-b", ["site-scope"]);
    store.setActiveTabId("estimate-1", "tab-b");

    const state = useEstimateWorkspaceState.getState();
    expect(state.selectedNodeIdByEstimateId["estimate-1"]).toBe("legacy-node");
    expect(state.selectedNodeIdByTabId["tab-a"]).toBe("kitchen");
    expect(state.selectedNodeIdByTabId["tab-b"]).toBe("site-work");
    expect(state.expandedNodeIdsByTabId["tab-a"]).toEqual(["project-scope", "ground-floor"]);
    expect(state.expandedNodeIdsByTabId["tab-b"]).toEqual(["site-scope"]);
    expect(state.activeTabIdByEstimateId["estimate-1"]).toBe("tab-b");
  });
});

describe("estimate tab repository compatibility wrappers", () => {
  it("keeps the legacy estimate-tree loader as a default-tab wrapper with a pre-apply fallback", () => {
    const source = readFileSync("src/lib/repositories/workspace-repository.ts", "utf8");

    expect(source).toContain("async function getProjectEstimateTreeByEstimateLegacy");
    expect(source).toContain("export async function getProjectEstimateTreeByEstimate");
    expect(source).toContain("const defaultTab = await getDefaultEstimateTab(estimateId)");
    expect(source).toContain("await getEstimateTabTree(projectId, estimateId, defaultTab.id, options)");
    expect(source).toContain("if (isEstimateTabsSchemaMissing(error)) return getProjectEstimateTreeByEstimateLegacy(projectId, estimateId, options)");
  });

  it("routes estimate URLs through the tab-aware resolver and resolves estimate ids to their default tab", () => {
    const routeSource = readFileSync("src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx", "utf8");
    const repositorySource = readFileSync("src/lib/repositories/workspace-repository.ts", "utf8");

    expect(routeSource).toContain("resolveEstimateTabRouteContext(projectId, nodeId)");
    expect(routeSource).toContain("const estimateTabs = tab ? await getEstimateTabs(project.id, estimate.id) : []");
    expect(routeSource).toContain("activeTabId={tab?.id ?? null}");
    expect(repositorySource).toContain("const defaultTab = await getDefaultEstimateTab(routeSegment)");
    expect(repositorySource).toContain("if (defaultTab) return getEstimateTabTree(projectId, routeSegment, defaultTab.id, options)");
  });
});

describe("estimate tabs compatibility cleanup governance", () => {
  it("keeps plan-linked comments on retained legacy sheet seams", () => {
    const actionsSource = readFileSync("src/lib/estimates/actions.ts", "utf8");
    const contentSource = readFileSync("src/components/workshop/EstimateSheetContent.tsx", "utf8");
    const hookSource = readFileSync("src/hooks/use-estimate-query.ts", "utf8");
    const repositorySource = readFileSync("src/lib/repositories/workspace-repository.ts", "utf8");

    expect(actionsSource).toContain('legacy "sheet_code" name kept for compatibility; see plan 2026-06-12 §01-17');
    expect(actionsSource).toContain('legacy "fetchEstimateSheetVersionControl" name kept for compatibility; see plan 2026-06-12 §01-17');
    expect(contentSource).toContain('legacy "EstimateSheetContent" name kept for compatibility; see plan 2026-06-12 §01-17');
    expect(contentSource).toContain("Real persisted tab id. Undefined means pre-tab compatibility mode; see plan 2026-06-12 §01-17.");
    expect(hookSource).toContain("legacy areaTree key kept for compatibility; see plan 2026-06-12 §01-17");
    expect(repositorySource).toContain("Temporary compatibility boundary: estimate_tabs exists after the owner-authorized");
  });

  it("keeps shim deletion criteria explicit before cleanup or rename batches", () => {
    const archivedPlanPath = ".ai/09_archive/store/2026-06-12-Projects-Auto-Added-To-Templates";
    const domainPlan = readFileSync(`${archivedPlanPath}/04_DOMAIN_AND_REPOSITORY_PLAN.md`, "utf8");
    const handoff = readFileSync(`${archivedPlanPath}/14_IMPLEMENTATION_HANDOFF.md`, "utf8");
    const phasePlan = readFileSync(`${archivedPlanPath}/10_IMPLEMENTATION_PHASES.md`, "utf8");

    expect(domainPlan).toContain("Immediate after Phase 7");
    expect(domainPlan).toContain("After one beta release cycle");
    expect(domainPlan).toContain("no caller imports the legacy key or wrapper-only behavior of `getProjectEstimateTreeByEstimate`");
    expect(domainPlan).toContain("one completed beta release carrying Phases 1–7 has provider/manual proof archived");
    expect(handoff).toContain("before/after `rg -i 'sheet'` keep-list diff");
    expect(phasePlan).toContain("shim-deletion grep gates pass");
  });
});
