import { beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

import { resetEstimateWorkspaceState, useEstimateWorkspaceState } from "@/hooks/use-estimate-workspace-state";

describe("estimate tab domain client state", () => {
  beforeEach(() => {
    resetEstimateWorkspaceState();
  });

  it("adds tab-aware query keys while preserving the legacy area-tree key", () => {
    const source = readFileSync("src/hooks/use-estimate-query.ts", "utf8");

    expect(source).toContain('tabs: (estimateId: string) => ["estimate", estimateId, "tabs"] as const');
    expect(source).toContain('tabTree: (estimateId: string, tabId: string) => ["estimate", estimateId, "tab", tabId, "area-tree"] as const');
    expect(source).toContain('areaTree: (estimateId: string) => ["estimate", estimateId, "area-tree"] as const');
  });

  it("does not refetch server-seeded estimate trees on mount", () => {
    const source = readFileSync("src/hooks/use-estimate-query.ts", "utf8");

    const refetchOnMountGuards = source.match(/refetchOnMount: false/g) ?? [];
    expect(refetchOnMountGuards.length).toBeGreaterThanOrEqual(2);
    expect(source).toContain("fetchEstimateTree({ projectId, estimateId })");
    expect(source).toContain("fetchEstimateTabTree({ projectId, estimateId, tabId })");
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

    expect(routeSource).toContain("resolveEstimateTabRouteContext(projectId, nodeId, ESTIMATE_SHEET_TREE_LOAD_LIMITS)");
    // U21: the resolver returns the tab list in parallel with the tree, so the
    // page prefers it (`tabs ??`) and only falls back to a direct getEstimateTabs
    // fetch when it wasn't provided.
    expect(routeSource).toContain("tabs ?? (tab ? await getEstimateTabs(project.id, estimate.id) : [])");
    // Add New Tabs U1: the edit-capability RPC resolves in parallel with that tabs
    // read (one Promise.all, no new sequential first-paint hop) — it cannot live in
    // the route's first Promise.all because `estimate.id` is only known after
    // `resolveEstimateTabRouteContext` resolves.
    expect(routeSource).toContain("Promise.all([");
    expect(routeSource).toContain("tab ? await getEstimateTabs(project.id, estimate.id) : []");
    expect(routeSource).toContain("resolveEstimateEditCapability(estimate.id)");
    expect(routeSource).toContain("canEditEstimate={canEditEstimate}");
    expect(routeSource).toContain("activeTabId={tab?.id ?? null}");
    expect(repositorySource).toContain('.eq("id", routeSegment)');
    expect(repositorySource).toContain('.eq("project_id", project.id)');
    expect(repositorySource).toContain("readEstimateTabsForEstimate(supabase, resolvedEstimate.id)");
    expect(repositorySource).toContain("getEstimateTabTreeForResolvedEstimateTab(");
    // U21: the tab-present branches resolve the tab list in parallel with the tree
    // without re-running project/estimate validation after the project-scoped join.
    expect(repositorySource).toContain("getEstimateTabTreeForResolvedEstimate(supabase, resolved, routeNode.estimate_tab_id, options)");
    expect(repositorySource).toContain("readEstimateTabsForEstimate(supabase, routeNode.estimate_id)");
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
