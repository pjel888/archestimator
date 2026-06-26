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
    // U21/P26: the resolver returns the tab list on the dominant tab path; a
    // missing tab list fails closed on first paint and hydrates from the client
    // query instead of adding a blocking server tail.
    expect(routeSource).toContain("const estimateTabs = tabs ?? []");
    expect(routeSource).not.toContain("tab ? await getEstimateTabs(project.id, estimate.id) : []");
    expect(routeSource).not.toContain("Promise.all([");
    // Routing Page Optimization P26: selected-node route context and the page
    // both leave edit capability to client-side hydration so first paint is not
    // gated on the UI affordance RPC; server writes still use authoritative
    // RLS/RPC checks.
    expect(routeSource).not.toContain("resolveEstimateEditCapability");
    expect(routeSource).toContain("canEditEstimate={prefetchedCanEditEstimate === true}");
    expect(routeSource).toContain("activeTabId={tab?.id ?? null}");
    expect(repositorySource).toContain('.eq("id", routeSegment)');
    expect(repositorySource).toContain('.eq("project_id", project.id)');
    expect(repositorySource).toContain("readEstimateTabsForEstimate(supabase, resolvedEstimate.id)");
    expect(repositorySource).toContain("getEstimateTabTreeForResolvedEstimateTab(");
    // U21 / Routing Page Optimization P3-T3/P25: the tab-present branch resolves
    // the tab tree and tab list in parallel, and the selected-node query carries
    // the active tab list through its existing project-scoped join. Edit
    // capability stays in the named page tail instead of route context.
    expect(repositorySource).toContain('.eq("estimates.project_id", projectId)');
    expect(repositorySource).toContain(".is(\"estimates.estimate_tabs.archived_at\", null)");
    expect(repositorySource).toContain('.order("sort_order", { referencedTable: "estimates.estimate_tabs", ascending: true })');
    expect(repositorySource).toContain("const selectedTabId = routeNode?.estimate_tab_id");
    expect(repositorySource).toContain("const selectedTabContextPromise = selectedNodeResultPromise.then");
    // Routing Page Optimization P14: the selected-node URL path carries
    // project/workspace through the same PostgREST embed, so the dominant route
    // shape no longer starts a separate project lookup in parallel with the node.
    expect(repositorySource).toContain('projects!inner(*, workspaces(*)), estimate_tabs(');
    expect(repositorySource).toContain("splitProjectWorkspaceJoin(routeNode.estimates.projects)");
    expect(repositorySource).toContain("stripEstimateProjectJoin(routeNode.estimates)");
    expect(repositorySource).toContain("readEmbeddedEstimateTabs(routeNode.estimates)");
    expect(repositorySource).toContain("readEstimateTabTreePayloadForResolvedTabId(supabase, estimate, selectedTabId, options)");
    expect(repositorySource).toContain("const selectedTabContext = await selectedTabContextPromise");
    expect(repositorySource).toContain('projectContext ?? await traced("estimate-route-context.project"');
    expect(repositorySource).not.toContain("Promise.all([projectContextPromise, selectedTabContextPromise])");
    expect(repositorySource).not.toContain('const projectContextPromise = traced("estimate-route-context.project"');
    expect(repositorySource).toContain("readEstimateTabsForEstimate(supabase, routeNode.estimate_id)");
    expect(repositorySource).not.toContain('traced("estimate-route-context.edit-capability"');
    expect(repositorySource).not.toContain("resolveEstimateEditCapability(routeNode.estimate_id)");
  });

  it("keeps route-context and tab-tree latency phases traceable for benchmark diagnosis", () => {
    const repositorySource = readFileSync("src/lib/repositories/workspace-repository.ts", "utf8");

    [
      "estimate-route-context.project",
      "estimate-route-context.supabase-client",
      "estimate-route-context.selected-node",
      "estimate-route-context.tab-tree",
      "estimate-route-context.tabs-list",
      "estimate-route-context.estimate-lookup",
      "estimate-route-context.estimate-fallback",
      "estimate-route-context.estimate-tabs-list",
      "estimate-route-context.default-tab-tree",
      "estimate-route-context.default-fallback",
      "estimate-tab-tree.nodes-with-rows",
      "estimate-tab-tree.build",
      "workspace-project.ensure-default-workspace",
      "workspace-project.project-lookup",
    ].forEach((label) => {
      expect(repositorySource).toContain(label);
    });
    expect(repositorySource).toContain('.select("*, workspaces(*)")');
    expect(repositorySource).toContain("ESTIMATE_TREE_NODE_WITH_ROW_ITEMS_COLUMNS");
    expect(repositorySource).toContain('estimate_row_items!estimate_row_items_node_id_fkey');
    expect(repositorySource).toContain('.eq("estimate_row_items.estimate_id", estimate.id)');
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
