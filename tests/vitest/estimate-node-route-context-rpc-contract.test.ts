import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const repositorySource = readFileSync("src/lib/repositories/workspace-repository.ts", "utf8");
const estimateTreeReadSource = readFileSync("src/lib/estimates/estimate-tree-read-repository.ts", "utf8");
const estimateActionsSource = readFileSync("src/lib/estimates/actions.ts", "utf8");
const expressPromotionActionsSource = readFileSync("src/lib/estimates/express-promotion-actions.ts", "utf8");

function expectBefore(source: string, before: string, after: string) {
  const beforeIndex = source.indexOf(before);
  const afterIndex = source.indexOf(after);
  expect(beforeIndex, `${before} should exist`).toBeGreaterThanOrEqual(0);
  expect(afterIndex, `${after} should exist`).toBeGreaterThanOrEqual(0);
  expect(beforeIndex, `${before} should appear before ${after}`).toBeLessThan(afterIndex);
}

describe("estimate_node_route_context repository fast path", () => {
  it("uses the D1 fast-path hook before the selected-node fallback and has no provider RPC", () => {
    expect(repositorySource).toContain("async function readEstimateNodeRouteContextD1FastPath");
    expect(repositorySource).toContain("INNER JOIN workspaces workspace ON workspace.id = project.workspace_id");
    expect(repositorySource).toContain("const [tabs, treePayload] = await Promise.all");
    expect(repositorySource).toContain("const fastRouteContext = await readEstimateNodeRouteContextD1FastPath");
    expect(repositorySource).toContain("if (!await canAccessEstimateInD1(database, estimate.id, userContext)) return null;");
    expect(repositorySource).toContain("if (fastRouteContext?.estimate) return fastRouteContext;");
    expect(repositorySource).not.toContain(".rpc(");
    expect(repositorySource).not.toContain("readSupabaseAuthStorageKey");
    expect(repositorySource).not.toContain("parseEstimateNodeRouteContextRpcPayload");
    expectBefore(
      repositorySource,
      "const fastRouteContext = await readEstimateNodeRouteContextD1FastPath",
      'traced("estimate-route-context.selected-node"',
    );
  });

  it("keeps the existing route-context fallback path available", () => {
    expect(repositorySource).toContain("estimate-route-context.d1-client");
    expect(repositorySource).toContain("estimate-route-context.selected-node");
    expect(repositorySource).toContain("estimate-route-context.tab-tree");
    expect(repositorySource).toContain("estimate-route-context.tabs-list");
    expect(repositorySource).toContain("estimate-route-context.estimate-lookup");
    expect(repositorySource).toContain("estimate-route-context.default-fallback");
  });

  it("keeps mutation invalidation hooks while removing old provider-auth cache material", () => {
    expect(repositorySource).toContain("getDevAuthBypassCredentialFromRequestParts");
    expect(repositorySource).toContain("clearEstimateRouteContextProcessCache");
    expect(repositorySource).not.toContain("estimateRouteContextProcessCache = new Map");
    expect(repositorySource).not.toContain("ESTIMATE_NODE_ROUTE_CONTEXT_PROCESS_CACHE_TTL_MS");
    expect(repositorySource).not.toContain('createHash("sha256")');
    expect(repositorySource).not.toContain("readEstimateRouteContextProcessCacheKey");
  });

  it("invalidates the route-context process cache on estimate mutations that revalidate project estimate paths", () => {
    expect(estimateActionsSource).toContain("clearEstimateRouteContextProcessCache(projectId)");
    expectBefore(
      estimateActionsSource,
      "clearEstimateRouteContextProcessCache(projectId)",
      "revalidatePath(`/workshop/projects/${projectId}`)",
    );
    expect(expressPromotionActionsSource).toContain("clearEstimateRouteContextProcessCache(projectId)");
    expectBefore(
      expressPromotionActionsSource,
      "clearEstimateRouteContextProcessCache(projectId)",
      'revalidatePath("/workshop/library")',
    );
  });
  it("scopes selected-node resolution through D1 project joins", () => {
    expect(repositorySource).toContain("FROM estimate_nodes node");
    expect(repositorySource).toContain("INNER JOIN estimates estimate ON estimate.id = node.estimate_id");
    expect(repositorySource).toContain("WHERE node.id = ?");
    expect(repositorySource).toContain("AND estimate.project_id = ?");
    expect(repositorySource).toContain("readEstimateForProject(database, selectedNode.estimate_id, project.id)");
  });

  it("preserves load-limit overfetch semantics for nodes and rows", () => {
    expect(estimateTreeReadSource).toContain("limit: maxNodeCount ? maxNodeCount + 1 : null");
    expect(estimateTreeReadSource).toContain("limit: maxRowItemCount ? maxRowItemCount + 1 : null");
    expect(estimateTreeReadSource).toContain("const limitedNodes = limitTreeRows(rawNodes, maxNodeCount)");
    expect(estimateTreeReadSource).toContain("const limitedRows = limitTreeRows(rawRows, maxRowItemCount)");
    expect(estimateTreeReadSource).toContain("didExceedNodeLimit: limitedNodes.didExceedLimit");
    expect(estimateTreeReadSource).toContain("didExceedRowItemLimit: limitedRows.didExceedLimit");
  });
});
